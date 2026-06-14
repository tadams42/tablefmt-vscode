import type { TableData } from './model.js';
import type { OutputStyle } from './types.js';

function charLen(s: string): number {
  return [...s].length;
}

export function colWidths(data: TableData): number[] {
  return data.headers.map((h, i) => {
    let w = charLen(h);
    for (const row of data.rows) {
      w = Math.max(w, charLen(row[i] ?? ''));
    }
    return w;
  });
}

function padCell(cell: string, width: number, rightAlign: boolean): string {
  const pad = width - charLen(cell);
  if (rightAlign) return ' '.repeat(pad) + cell;
  return cell + ' '.repeat(pad);
}

// ─── Generic grid renderer ────────────────────────────────────────────────────

interface GridSpec {
  topL: string; topH: string; topJ: string; topR: string;
  headSepL: string; headSepH: string; headSepJ: string; headSepR: string;
  rowSepL: string | null; rowSepH: string | null; rowSepJ: string | null; rowSepR: string | null;
  botL: string; botH: string; botJ: string; botR: string;
  cellL: string; cellSep: string; cellR: string;
}

function makeBorderRow(widths: number[], L: string, H: string, J: string, R: string): string {
  const cols = widths.map(w => H.repeat(w + 2));
  return L + cols.join(J) + R;
}

function makeContentRow(
  cells: string[], widths: number[],
  L: string, Sep: string, R: string,
  rightAligns: boolean[]
): string {
  const parts = cells.map((c, i) => ' ' + padCell(c, widths[i] ?? 0, rightAligns[i] ?? false) + ' ');
  return L + parts.join(Sep) + R;
}

function renderGrid(data: TableData, spec: GridSpec): string {
  const widths = colWidths(data);
  const aligns = data.columnMeta.map(m => m.isNumeric);
  const lines: string[] = [];

  if (spec.topL) lines.push(makeBorderRow(widths, spec.topL, spec.topH, spec.topJ, spec.topR));

  lines.push(makeContentRow(data.headers, widths, spec.cellL, spec.cellSep, spec.cellR, aligns));

  lines.push(makeBorderRow(widths, spec.headSepL, spec.headSepH, spec.headSepJ, spec.headSepR));

  for (let ri = 0; ri < data.rows.length; ri++) {
    if (ri > 0 && spec.rowSepL !== null) {
      lines.push(makeBorderRow(widths, spec.rowSepL, spec.rowSepH!, spec.rowSepJ!, spec.rowSepR!));
    }
    lines.push(makeContentRow(data.rows[ri] ?? [], widths, spec.cellL, spec.cellSep, spec.cellR, aligns));
  }

  if (spec.botL) lines.push(makeBorderRow(widths, spec.botL, spec.botH, spec.botJ, spec.botR));

  return lines.join('\n');
}

// ─── Style spec constants ─────────────────────────────────────────────────────

const GITHUB: GridSpec = {
  topL: '', topH: '', topJ: '', topR: '',
  headSepL: '|', headSepH: '-', headSepJ: '|', headSepR: '|',
  rowSepL: null, rowSepH: null, rowSepJ: null, rowSepR: null,
  botL: '', botH: '', botJ: '', botR: '',
  cellL: '|', cellSep: '|', cellR: '|',
};

// psql: no outer border chars; content cells already include ' cell ' padding
const PSQL: GridSpec = {
  topL: '', topH: '', topJ: '', topR: '',
  headSepL: '', headSepH: '-', headSepJ: '+', headSepR: '',
  rowSepL: null, rowSepH: null, rowSepJ: null, rowSepR: null,
  botL: '', botH: '', botJ: '', botR: '',
  cellL: '', cellSep: '|', cellR: '',
};

const ORGTBL: GridSpec = {
  ...GITHUB,
  headSepL: '|', headSepH: '-', headSepJ: '+', headSepR: '|',
};

const ASCII: GridSpec = {
  topL: '+', topH: '-', topJ: '+', topR: '+',
  headSepL: '+', headSepH: '-', headSepJ: '+', headSepR: '+',
  rowSepL: '+', rowSepH: '-', rowSepJ: '+', rowSepR: '+',
  botL: '+', botH: '-', botJ: '+', botR: '+',
  cellL: '|', cellSep: '|', cellR: '|',
};

const RST_GRID: GridSpec = {
  topL: '+', topH: '-', topJ: '+', topR: '+',
  headSepL: '+', headSepH: '=', headSepJ: '+', headSepR: '+',
  rowSepL: '+', rowSepH: '-', rowSepJ: '+', rowSepR: '+',
  botL: '+', botH: '-', botJ: '+', botR: '+',
  cellL: '|', cellSep: '|', cellR: '|',
};

const MODERN: GridSpec = {
  topL: '┌', topH: '─', topJ: '┬', topR: '┐',
  headSepL: '├', headSepH: '─', headSepJ: '┼', headSepR: '┤',
  rowSepL: '├', rowSepH: '─', rowSepJ: '┼', rowSepR: '┤',
  botL: '└', botH: '─', botJ: '┴', botR: '┘',
  cellL: '│', cellSep: '│', cellR: '│',
};

const SHARP: GridSpec = {
  ...MODERN,
  rowSepL: null, rowSepH: null, rowSepJ: null, rowSepR: null,
};

const EXTENDED: GridSpec = {
  topL: '╔', topH: '═', topJ: '╦', topR: '╗',
  headSepL: '╠', headSepH: '═', headSepJ: '╬', headSepR: '╣',
  rowSepL: '╠', rowSepH: '═', rowSepJ: '╬', rowSepR: '╣',
  botL: '╚', botH: '═', botJ: '╩', botR: '╝',
  cellL: '║', cellSep: '║', cellR: '║',
};

const HEAVY_OUTLINE: GridSpec = {
  topL: '┏', topH: '━', topJ: '┳', topR: '┓',
  headSepL: '┣', headSepH: '━', headSepJ: '╋', headSepR: '┫',
  rowSepL: null, rowSepH: null, rowSepJ: null, rowSepR: null,
  botL: '┗', botH: '━', botJ: '┻', botR: '┛',
  cellL: '┃', cellSep: '┃', cellR: '┃',
};

// ─── Custom renderers ─────────────────────────────────────────────────────────

function renderJira(data: TableData): string {
  const widths = colWidths(data);
  const aligns = data.columnMeta.map(m => m.isNumeric);
  const lines: string[] = [];

  const headerCells = data.headers.map((h, i) => ' ' + padCell(h, widths[i] ?? 0, false) + ' ');
  lines.push('||' + headerCells.join('||') + '||');

  for (const row of data.rows) {
    const cells = row.map((c, i) => ' ' + padCell(c, widths[i] ?? 0, aligns[i] ?? false) + ' ');
    lines.push('|' + cells.join('|') + '|');
  }

  return lines.join('\n');
}

function renderAsciidoc(data: TableData): string {
  const widths = colWidths(data);
  const aligns = data.columnMeta.map(m => m.isNumeric);
  const lines: string[] = [];

  const colsSpec = widths.map((w, i) => (aligns[i] ? '>' : '<') + w).join(',');
  lines.push(`[cols="${colsSpec}",options="header"]`);
  lines.push('|====');

  const renderRow = (cells: string[], rowAligns: boolean[]) => {
    const parts = cells.map((c, i) => '| ' + padCell(c, widths[i] ?? 0, rowAligns[i] ?? false));
    lines.push(parts.join(' '));
  };

  renderRow(data.headers, data.headers.map(() => false));
  for (const row of data.rows) renderRow(row, aligns);

  lines.push('|====');
  return lines.join('\n');
}

function renderRst(data: TableData): string {
  const widths = colWidths(data);
  const aligns = data.columnMeta.map(m => m.isNumeric);

  const sepLine = widths.map(w => '='.repeat(w + 2)).join(' ');
  const contentRow = (cells: string[], rowAligns: boolean[]) =>
    cells.map((c, i) => ' ' + padCell(c, widths[i] ?? 0, rowAligns[i] ?? false) + ' ').join(' ');

  const lines: string[] = [
    sepLine,
    contentRow(data.headers, aligns),
    sepLine,
    ...data.rows.map(row => contentRow(row, aligns)),
    sepLine,
  ];
  return lines.join('\n');
}

// ─── Main render entry point ──────────────────────────────────────────────────

export function render(data: TableData, style: OutputStyle): string {
  switch (style) {
    case 'github':       return renderGrid(data, GITHUB);
    case 'psql':         return renderGrid(data, PSQL);
    case 'orgtbl':       return renderGrid(data, ORGTBL);
    case 'ascii':        return renderGrid(data, ASCII);
    case 'rst-grid':     return renderGrid(data, RST_GRID);
    case 'modern':       return renderGrid(data, MODERN);
    case 'sharp':        return renderGrid(data, SHARP);
    case 'extended':     return renderGrid(data, EXTENDED);
    case 'heavy-outline': return renderGrid(data, HEAVY_OUTLINE);
    case 'jira':         return renderJira(data);
    case 'asciidoc':     return renderAsciidoc(data);
    case 'rst':          return renderRst(data);
  }
}
