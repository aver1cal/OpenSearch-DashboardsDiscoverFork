/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { toCsv } from './convert_to_csv_data';

const legacyColumns = [
  {
    name: 'col-1-1',
    displayName: 'Names',
  },
  {
    name: 'col-1-2',
    displayName: 'Col2',
  },
  {
    name: 'col-1-3',
    displayName: 'Col3',
  },
];

const columns = [
  {
    id: 'col-1-1',
    display: 'Names',
  },
  {
    id: 'col-1-2',
    display: 'Col2',
  },
  {
    id: 'col-1-3',
    display: 'Col3',
  },
];

const rows = [
  {
    _source: {
      'col-1-3': 0.6,
      'col-1-1': 'Alice',
      'col-1-2': 3,
    },
  },
  {
    _source: {
      'col-1-3': 0.2,
      'col-1-1': 'Anthony',
      'col-1-2': 1,
    },
  },
  {
    _source: {
      'col-1-3': 0.2,
      'col-1-1': 'Timmy',
      'col-1-2': 1,
    },
  },
];

describe('toCsv', () => {
  it('should prepare csv file content for legacy embed', () => {
    const result = toCsv(rows, legacyColumns, true);
    expect(result).toEqual(
      'Names,Col2,Col3\r\nAlice,3,"0.6"\r\nAnthony,1,"0.2"\r\nTimmy,1,"0.2"\r\n'
    );
  });

  it('should prepare csv file content for non legacy embed', () => {
    const result = toCsv(rows, columns, false);
    expect(result).toEqual(
      'Names,Col2,Col3\r\nAlice,3,"0.6"\r\nAnthony,1,"0.2"\r\nTimmy,1,"0.2"\r\n'
    );
  });
});
