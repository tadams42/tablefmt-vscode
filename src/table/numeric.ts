import type { TableData } from './model.js';

export function populateColumnMeta(data: TableData): void {
  const nCols = data.headers.length;
  for (let col = 0; col < nCols; col++) {
    const meta = data.columnMeta[col];
    if (meta) meta.isNumeric = isColumnNumeric(data, col);
  }
}

function isColumnNumeric(data: TableData, col: number): boolean {
  for (const row of data.rows) {
    const cell = row[col] ?? '';
    if (cell === '') continue;
    const n = Number(cell);
    if (!Number.isFinite(n)) return false;
  }
  return data.rows.length > 0 && data.rows.some(r => (r[col] ?? '') !== '');
}
