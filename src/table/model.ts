export type Align = 'default' | 'left' | 'center' | 'right';

export interface ColumnMeta {
  isNumeric: boolean;
  /** Alignment declared by the source table (markdown `:---:` markers). */
  align: Align;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  columnMeta: ColumnMeta[];
}

export function makeTableData(headers: string[], rows: string[][], aligns?: Align[]): TableData {
  const columnMeta: ColumnMeta[] = headers.map((_, i) => ({
    isNumeric: false,
    align: aligns?.[i] ?? 'default',
  }));
  return { headers, rows, columnMeta };
}

/** Alignment actually used when padding cells: explicit markers win over numeric detection. */
export function effectiveAlign(meta: ColumnMeta | undefined): Align {
  if (!meta) return 'left';
  if (meta.align !== 'default') return meta.align;
  return meta.isNumeric ? 'right' : 'left';
}
