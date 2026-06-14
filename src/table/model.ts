export interface ColumnMeta {
  isNumeric: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  columnMeta: ColumnMeta[];
}

export function makeTableData(headers: string[], rows: string[][]): TableData {
  const columnMeta: ColumnMeta[] = headers.map(() => ({ isNumeric: false }));
  return { headers, rows, columnMeta };
}
