import { bareLine } from './prettify.js';
import { detectSeparator } from './tableParser.js';
import { makeTableData } from './model.js';
import type { Align, TableData } from './model.js';

export function findColumnAtCursor(originalLine: string, rawCursor: number): number {
  const bare = bareLine(originalLine);
  // prefix is ASCII (spaces, tabs, comment chars) so byte offset = char offset
  const prefixLen = [...originalLine].length - [...bare].length;
  const cursorInBare = Math.max(0, rawCursor - prefixLen);
  const sep = detectSeparator(bare);

  let count = 0;
  const bareChars = [...bare];
  for (let i = 0; i < Math.min(cursorInBare, bareChars.length); i++) {
    if (bareChars[i] === sep) count++;
  }
  return Math.max(0, count - 1);
}

export function addColumn(data: TableData, colIdx: number): TableData {
  const idx = Math.min(colIdx, data.headers.length);
  const headers = [...data.headers];
  headers.splice(idx, 0, '');
  const aligns: Align[] = data.columnMeta.map(m => m.align);
  aligns.splice(idx, 0, 'default');
  const rows = data.rows.map(row => {
    const r = [...row];
    r.splice(Math.min(idx, r.length), 0, '');
    return r;
  });
  return makeTableData(headers, rows, aligns);
}

export function removeColumn(data: TableData, colIdx: number): TableData {
  if (colIdx >= data.headers.length) {
    throw new Error(`column index ${colIdx} is out of range (table has ${data.headers.length} columns)`);
  }
  const headers = [...data.headers];
  headers.splice(colIdx, 1);
  const aligns: Align[] = data.columnMeta.map(m => m.align);
  aligns.splice(colIdx, 1);
  const rows = data.rows.map(row => {
    const r = [...row];
    if (colIdx < r.length) r.splice(colIdx, 1);
    return r;
  });
  return makeTableData(headers, rows, aligns);
}
