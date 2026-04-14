/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { access, link, unlink, chmod } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import { ToolingLog } from '@osd/dev-utils';

import { write, copyAll, mkdirp, exec, Config, Build } from '../../../lib';
import * as dockerTemplates from './templates';
import { TemplateContext } from './template_context';
import { bundleDockerFiles } from './bundle_dockerfiles';

const accessAsync = promisify(access);
const linkAsync = promisify(link);
const unlinkAsync = promisify(unlink);
const chmodAsync = promisify(chmod);

export async function runDockerGenerator(
  config: Config,
  log: ToolingLog,
  build: Build,
  ubi: boolean = false
) {
  // UBI var config
  const baseOSImage = ubi ? 'docker.opensearch.org/ubi8/ubi-minimal:latest' : 'amazonlinux:2023';
  const ubiVersionTag = 'ubi8';
  const ubiImageFlavor = ubi ? `-${ubiVersionTag}` : '';

  // General docker var config
  const license = 'ASL 2.0';
  const imageFlavor = '';
  const imageTag = 'docker.opensearch.org/opensearch-dashboards/opensearch-dashboards';
  const version = config.getBuildVersion();
  const artifactTarball = `opensearch-dashboards${imageFlavor}-${version}-linux-x64.tar.gz`;
  const artifactsDir = config.resolveFromTarget('.');
  const dockerBuildDate = new Date().toISOString();
  // That would produce oss, default and default-ubi7
  const dockerBuildDir = config.resolveFromRepo('build', 'opensearch-dashboards-docker');
  const dockerTargetFilename = config.resolveFromTarget(
    `opensearch-dashboards${imageFlavor}${ubiImageFlavor}-${version}-docker-image.tar.gz`
  );
  const scope: TemplateContext = {
    artifactTarball,
    imageFlavor,
    version,
    license,
    artifactsDir,
    imageTag,
    dockerBuildDir,
    dockerTargetFilename,
    baseOSImage,
    ubiImageFlavor,
    dockerBuildDate,
    ubi,
    revision: config.getBuildSha(),
  };

  // Verify if we have the needed OpenSearch Dashboards target in order
  // to build the OpenSearch Dashboards docker image.
  // Also create the docker build target folder
  // and  delete the current linked target into the
  // OpenSearch Dashboards docker build folder if we have one.
  try {
    await accessAsync(resolve(artifactsDir, artifactTarball));
    await mkdirp(dockerBuildDir);
    await unlinkAsync(resolve(dockerBuildDir, artifactTarball));
  } catch (e) {
    if (e && e.code === 'ENOENT' && e.syscall === 'access') {
      throw new Error(
        `OpenSearch Dashboards linux target (${artifactTarball}) is needed in order to build ${''}the docker image. None was found at ${artifactsDir}`
      );
    }
  }

  // Create the OpenSearch Dashboards linux target inside the
  // OpenSearch Dashboards docker build
  await linkAsync(resolve(artifactsDir, artifactTarball), resolve(dockerBuildDir, artifactTarball));

  // Copy all plugin zip files from plugins/*/build directories
  const pluginsDir = config.resolveFromRepo('plugins');
  const pluginZips: string[] = [];
  try {
    const { readdir, stat, copyFile, access: fsAccess } = await import('fs/promises');
    const pluginDirs = await readdir(pluginsDir);

    for (const pluginDir of pluginDirs) {
      const pluginPath = resolve(pluginsDir, pluginDir);
      const pluginBuildPath = resolve(pluginPath, 'build');

      try {
        // Check if build directory exists
        await fsAccess(pluginBuildPath);
      } catch (e) {
        // Build directory doesn't exist, try to build the plugin
        log.info(`Build directory not found for ${pluginDir}, running yarn build...`);
        try {
          await exec(log, 'yarn', ['build'], {
            cwd: pluginPath,
            level: 'info',
          });
          log.info(`Successfully built plugin: ${pluginDir}`);
        } catch (buildError) {
          log.warning(`Failed to build plugin ${pluginDir}: ${buildError.message}`);
          continue;
        }
      }

      try {
        const pluginStat = await stat(pluginBuildPath);
        if (pluginStat.isDirectory()) {
          const buildFiles = await readdir(pluginBuildPath);
          const zipFiles = buildFiles.filter((f) => f.endsWith('.zip'));

          for (const zipFile of zipFiles) {
            await copyFile(resolve(pluginBuildPath, zipFile), resolve(dockerBuildDir, zipFile));
            pluginZips.push(zipFile);
            log.info(`Copied plugin: ${zipFile} from ${pluginDir}`);
          }
        }
      } catch (e) {
        log.warning(`Error processing build directory for ${pluginDir}: ${e.message}`);
        continue;
      }
    }

    if (pluginZips.length > 0) {
      scope.pluginZips = pluginZips;
      log.info(`Total plugins copied: ${pluginZips.length}`);
    } else {
      log.warning('No plugin zip files found in any plugins/*/build directories');
    }
  } catch (e) {
    log.warning(`Error scanning plugins directory: ${e.message}, Path checked: ${pluginsDir}`);
  }

  // Write all the needed docker config files
  // into opensearch-dashboards-docker folder
  for (const [, dockerTemplate] of Object.entries(dockerTemplates)) {
    await write(resolve(dockerBuildDir, dockerTemplate.name), dockerTemplate.generator(scope));
  }

  // Copy all the needed resources into opensearch-dashboards-docker folder
  // in order to build the docker image accordingly the dockerfile defined
  // under templates/opensearch_dashboards_yml.template/js
  await copyAll(
    config.resolveFromRepo('src/dev/build/tasks/os_packages/docker_generator/resources'),
    dockerBuildDir
  );

  // Build docker image into the target folder
  // In order to do this we just call the file we
  // created from the templates/build_docker_sh.template.js
  // and we just run that bash script
  await chmodAsync(`${resolve(dockerBuildDir, 'build_docker.sh')}`, '755');
  await exec(log, `./build_docker.sh`, [], {
    cwd: dockerBuildDir,
    level: 'info',
  });

  // Pack Dockerfiles and create a target for them
  await bundleDockerFiles(config, log, scope);
}

export async function runDockerGeneratorForUBI(config: Config, log: ToolingLog, build: Build) {
  // Only run ubi docker image build for default distribution
  return;
}
