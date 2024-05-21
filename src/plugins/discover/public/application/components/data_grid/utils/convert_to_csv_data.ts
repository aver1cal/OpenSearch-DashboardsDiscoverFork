/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore
import { saveAs } from '@elastic/filesaver';
import { OpenSearchSearchHit } from '../../../doc_views/doc_views_types';
import { CsvColumnProp } from '../data_grid_table_exporter';

const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;

export const toCsv = function (rows: any, columns: any, legacy: boolean) {
  function escape(val: any) {
    val = String(val);
    if (nonAlphaNumRE.test(val)) {
      val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
    }
    return val;
  }

  let csvRows: string[][] = [];
  for (const row of rows) {
    const rowArray: string[] = [];
    for (const col of columns) {
      let value;
      if (
        (legacy && row.fields[col.name] !== undefined) ||
        (!legacy && row.fields[col.id] !== undefined)
      ) {
        value = legacy ? row.fields[col.name] : row.fields[col.id];
      } else {
        value = legacy ? row._source[col.name] : row._source[col.id];
      }
      rowArray.push(escape(value));
    }
    csvRows = [...csvRows, rowArray];
  }

  // add the columns to the rows
  csvRows.unshift(
    columns.map((col: { displayName?: string; display?: string }) =>
      legacy ? escape(col.displayName) : escape(col.display)
    )
  );

  return csvRows.map((row) => row.join() + '\r\n').join('');
};

export const exportAsCsv = function (data: {
  rows: OpenSearchSearchHit[];
  columns: CsvColumnProp[];
  legacy: boolean;
}) {
  const csv = new Blob([toCsv(data.rows, data.columns, data.legacy)], {
    type: 'text/csv;charset=utf-8',
  });
  saveAs(csv, `exported.csv`);
};
