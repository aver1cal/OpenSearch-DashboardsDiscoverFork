/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import './download_csv_popover_content.scss';
import React, { useMemo, useState } from 'react';
import { EuiCompressedRadioGroup, EuiSmallButton, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@osd/i18n/react';
import { DownloadCsvFormId, MAX_DOWNLOAD_CSV_COUNT } from './constants';
import { DiscoverDownloadCsvCallout } from './download_csv_callout';

export interface DiscoverDownloadCsvPopoverContentProps {
  downloadForOption: (option: DownloadCsvFormId) => Promise<void>;
  hitsCount: number;
  rowsCount: number;
  showMaxOption?: boolean;
}

export const DiscoverDownloadCsvPopoverContent = ({
  downloadForOption,
  hitsCount,
  rowsCount,
  showMaxOption,
}: DiscoverDownloadCsvPopoverContentProps) => {
  const [selectedOption, setSelectedOption] = useState<DownloadCsvFormId>(
    DownloadCsvFormId.Visible
  );

  const { effectiveShowMaxOption, maxCountString, rowsCountString } = useMemo<{
    effectiveShowMaxOption: boolean;
    maxCountString: string;
    rowsCountString: string;
  }>(() => {
    const maxCount = Math.min(hitsCount, MAX_DOWNLOAD_CSV_COUNT);
    // If showMaxOption is explicitly set, use it, otherwise use default logic
    const defaultShowMax = maxCount > rowsCount;
    return {
      effectiveShowMaxOption: typeof showMaxOption === 'boolean' ? showMaxOption : defaultShowMax,
      maxCountString: maxCount.toLocaleString(),
      rowsCountString: rowsCount.toLocaleString(),
    };
  }, [hitsCount, rowsCount, showMaxOption]);

  const downloadOptions = useMemo(() => {
    const options = [
      {
        id: DownloadCsvFormId.Visible,
        label: (
          <FormattedMessage
            id="discover.downloadCsvOptionVisible"
            defaultMessage="Visible ({rowCount})"
            values={{ rowCount: rowsCountString }}
          />
        ),
        ['data-test-subj']: 'dscDownloadCsvOptionVisible',
      },
    ];

    if (effectiveShowMaxOption) {
      options.push({
        id: DownloadCsvFormId.Max,
        label: (
          <FormattedMessage
            id="discover.downloadCsvOptionMax"
            defaultMessage="Max available ({max})"
            values={{ max: maxCountString }}
          />
        ),
        ['data-test-subj']: 'dscDownloadCsvOptionMax',
      });
    }

    return options;
  }, [maxCountString, rowsCountString, effectiveShowMaxOption]);

  return (
    <div className="dscDownloadCsvPopoverContent" data-test-subj="dscDownloadCsvPopoverContent">
      <div className="dscDownloadCsvPopoverContent__titleWrapper">
        <EuiText data-test-subj="dscDownloadCsvTitle" size="m">
          <strong>
            <FormattedMessage id="discover.downloadCsvTitle" defaultMessage="Download as CSV" />
          </strong>
        </EuiText>
      </div>
      <div className="dscDownloadCsvPopoverContent__form">
        <EuiCompressedRadioGroup
          options={downloadOptions}
          onChange={setSelectedOption as (option: string) => void}
          idSelected={selectedOption}
        />
        {effectiveShowMaxOption && <DiscoverDownloadCsvCallout />}
        <EuiSmallButton
          data-test-subj="dscDownloadCsvSubmit"
          className="dscDownloadCsvPopoverContent__submit"
          onClick={() => downloadForOption(selectedOption)}
          fullWidth={true}
        >
          <FormattedMessage id="discover.downloadCsvSubmit" defaultMessage="Download CSV" />
        </EuiSmallButton>
      </div>
    </div>
  );
};
