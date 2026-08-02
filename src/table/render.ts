import { effectiveAlign } from './model.js';
import type { Align, ColumnMeta, TableData } from './model.js';
import type { OutputStyle } from './types.js';

function charLen(s: string): number {
  return [...s].length;
}

function alignsOf(data: TableData): Align[] {
  return data.columnMeta.map(effectiveAlign);
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

function padCell(cell: string, width: number, align: Align): string {
  const pad = Math.max(0, width - charLen(cell));
  if (align === 'right') return ' '.repeat(pad) + cell;
  if (align === 'center') {
    const left = Math.floor(pad / 2);
    return ' '.repeat(left) + cell + ' '.repeat(pad - left);
  }
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
  aligns: Align[]
): string {
  const parts = cells.map((c, i) => ' ' + padCell(c, widths[i] ?? 0, aligns[i] ?? 'left') + ' ');
  return L + parts.join(Sep) + R;
}

function renderGrid(data: TableData, spec: GridSpec): string {
  const widths = colWidths(data);
  const aligns = alignsOf(data);
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

// Narrowest cell that can still carry the alignment markers for `align`.
function minMarkerWidth(align: Align): number {
  if (align === 'center') return 3;
  if (align === 'left' || align === 'right') return 2;
  return 1;
}

function alignMarker(align: Align, width: number): string {
  const dashes = (n: number) => '-'.repeat(Math.max(1, n));
  switch (align) {
    case 'left':   return ':' + dashes(width - 1);
    case 'right':  return dashes(width - 1) + ':';
    case 'center': return ':' + dashes(width - 2) + ':';
    default:       return dashes(width);
  }
}

/**
 * Alignment to encode in the delimiter row. Unlike `effectiveAlign` this keeps
 * `default` for plain columns, so an ordinary column stays `-----` rather than
 * acquiring a redundant `:----`.
 */
function markerAlign(meta: ColumnMeta | undefined): Align {
  if (!meta) return 'default';
  if (meta.align !== 'default') return meta.align;
  return meta.isNumeric ? 'right' : 'default';
}

/**
 * GitHub-flavoured markdown. The delimiter row is padded like a content row
 * (`| --- |`, not `|-----|`) and carries `:` alignment markers — both the ones
 * the source declared and the right-alignment inferred for numeric columns, so
 * that a rendered preview agrees with the padding in the raw text.
 */
function renderMarkdown(data: TableData): string {
  const markerAligns = data.columnMeta.map(markerAlign);
  const padAligns = alignsOf(data);
  const widths = colWidths(data).map((w, i) =>
    Math.max(w, minMarkerWidth(markerAligns[i] ?? 'default'))
  );

  const lines = [makeContentRow(data.headers, widths, '|', '|', '|', padAligns)];
  lines.push(
    '|' + widths.map((w, i) => ' ' + alignMarker(markerAligns[i] ?? 'default', w) + ' ').join('|') + '|'
  );
  for (const row of data.rows) {
    lines.push(makeContentRow(row, widths, '|', '|', '|', padAligns));
  }
  return lines.join('\n');
}

function renderJira(data: TableData): string {
  const widths = colWidths(data);
  const aligns = alignsOf(data);
  const lines: string[] = [];

  const headerCells = data.headers.map((h, i) => ' ' + padCell(h, widths[i] ?? 0, 'left') + ' ');
  lines.push('||' + headerCells.join('||') + '||');

  for (const row of data.rows) {
    const cells = row.map((c, i) => ' ' + padCell(c, widths[i] ?? 0, aligns[i] ?? 'left') + ' ');
    lines.push('|' + cells.join('|') + '|');
  }

  return lines.join('\n');
}

const ASCIIDOC_COL_ALIGN: Record<Align, string> = {
  default: '<', left: '<', center: '^', right: '>',
};

function renderAsciidoc(data: TableData): string {
  const widths = colWidths(data);
  const aligns = alignsOf(data);
  const lines: string[] = [];

  const colsSpec = widths.map((w, i) => ASCIIDOC_COL_ALIGN[aligns[i] ?? 'left'] + w).join(',');
  lines.push(`[cols="${colsSpec}",options="header"]`);
  lines.push('|====');

  const renderRow = (cells: string[], rowAligns: Align[]) => {
    const parts = cells.map((c, i) => '| ' + padCell(c, widths[i] ?? 0, rowAligns[i] ?? 'left'));
    lines.push(parts.join(' '));
  };

  renderRow(data.headers, data.headers.map((): Align => 'left'));
  for (const row of data.rows) renderRow(row, aligns);

  lines.push('|====');
  return lines.join('\n');
}

function renderRst(data: TableData): string {
  const widths = colWidths(data);
  const aligns = alignsOf(data);

  const sepLine = widths.map(w => '='.repeat(w + 2)).join(' ');
  const contentRow = (cells: string[], rowAligns: Align[]) =>
    cells.map((c, i) => ' ' + padCell(c, widths[i] ?? 0, rowAligns[i] ?? 'left') + ' ').join(' ');

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
    case 'github':       return renderMarkdown(data);
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
