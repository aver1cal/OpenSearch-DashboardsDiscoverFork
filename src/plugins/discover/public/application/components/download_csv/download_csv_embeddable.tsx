/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { EuiPopover, EuiSmallButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { unparse } from 'papaparse';
import moment from 'moment';
import { saveAs } from 'file-saver';
import { DiscoverDownloadCsvPopoverContent } from './download_csv_popover_content';
import { DownloadCsvFormId, MAX_DOWNLOAD_CSV_COUNT } from './constants';
import { OpenSearchSearchHit } from '../../doc_views/doc_views_types';
import { IndexPattern, UI_SETTINGS } from '../../../../../data/common';
import { useDiscoverDownloadCsvToasts } from './use_download_csv_toasts';
import { getLegacyDisplayedColumns } from '../default_discover_table/helper';
import { getServices } from '../../../opensearch_dashboards_services';
import { DOC_HIDE_TIME_COLUMN_SETTING } from '../../../../common';
import { formatRowsForCsv } from './use_download_csv';

export interface DiscoverDownloadCsvEmbeddableProps {
  hits?: number;
  rows: OpenSearchSearchHit[];
  indexPattern: IndexPattern;
  columns: string[];
}

/**
 * A version of DiscoverDownloadCsv that works in embeddable context without Redux.
 * This component receives columns as props instead of reading from Redux state.
 */
export const DiscoverDownloadCsvEmbeddable = ({
  indexPattern,
  hits,
  rows,
  columns,
}: DiscoverDownloadCsvEmbeddableProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { onSuccess, onError, onLoading } = useDiscoverDownloadCsvToasts();
  const { uiSettings } = getServices();

  // Compute displayed column names from provided columns
  const displayedColumnNames = useMemo(() => {
    const displayedColumns = getLegacyDisplayedColumns(
      columns,
      indexPattern,
      uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING),
      uiSettings.get(UI_SETTINGS.SHORT_DOTS_ENABLE)
    );
    return displayedColumns.map((column) => column.name);
  }, [columns, indexPattern, uiSettings]);

  const openPopover = () => setIsPopoverOpen(true);
  const closePopover = () => setIsPopoverOpen(false);

  const downloadCsvForOption = async (option: DownloadCsvFormId) => {
    closePopover();

    try {
      let rowsToDownload = rows;
      if (option === DownloadCsvFormId.Max) {
        setIsLoading(true);
        onLoading();

        // In embeddable context, we can only download the rows we have
        // since we don't have access to fetchForMaxCsvOption
        const size = Math.min(hits || rows.length, MAX_DOWNLOAD_CSV_COUNT, rows.length);
        rowsToDownload = rows.slice(0, size);
      }

      const csvRowData = rowsToDownload.map(
        formatRowsForCsv({ displayedColumnNames, indexPattern })
      );

      const csvData = unparse(
        { fields: displayedColumnNames, data: csvRowData },
        {
          quotes: uiSettings.get('csv:quoteValues', true),
          delimiter: uiSettings.get('csv:separator', ','),
          header: true,
        }
      );

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
      const fileName = `opensearch_export_${moment().format('YYYY-MM-DD')}`;
      saveAs(blob, fileName);

      onSuccess();
    } catch (err) {
      // Abort is handled by use_download_csv_toasts
      if (err.name !== 'AbortError') {
        onError();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCsvForOption = async (option: DownloadCsvFormId) => {
    await downloadCsvForOption(option);
  };

  return (
    <EuiPopover
      button={
        <EuiSmallButtonEmpty
          data-test-subj="dscDownloadCsvButton"
          disabled={isLoading}
          iconType="download"
          iconSide="left"
          onClick={openPopover}
        >
          <FormattedMessage id="discover.downloadCsvButtonText" defaultMessage="Download as CSV" />
        </EuiSmallButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      ownFocus
    >
      <DiscoverDownloadCsvPopoverContent
        rowsCount={rows?.length || 0}
        hitsCount={hits || 0}
        downloadForOption={handleDownloadCsvForOption}
        showMaxOption={false}
      />
    </EuiPopover>
  );
};
