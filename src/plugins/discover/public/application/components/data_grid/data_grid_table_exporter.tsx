/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { exportAsCsv } from './utils/convert_to_csv_data';
import { OpenSearchSearchHit } from '../../doc_views/doc_views_types';

export interface CsvColumnProp {
  display?: string;
  displayName?: string;
  name?: string;
  id?: string;
}

export const DataGridExportButton = (data: {
  rows: OpenSearchSearchHit[];
  columns: CsvColumnProp[];
  legacy: boolean;
}) => {
  const [isPopoverOpen, setPopover] = useState(false);

  const closePopover = () => {
    setPopover(false);
  };
  const panels = [
    {
      id: 0,
      items: [
        {
          name: 'Export CSV',
          icon: 'download',
          onClick: () => exportAsCsv(data),
        },
      ],
    },
  ];
  const button = (
    <EuiButtonEmpty size="s" iconType="download" onClick={() => setPopover((open) => !open)} />
  );
  return (
    <EuiPopover
      id={'discoverExportCsv'}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
