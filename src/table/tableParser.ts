import { makeTableData } from './model.js';
import type { Align, TableData } from './model.js';
import type { OutputStyle } from './types.js';

// Matches structural-only lines: spaces, dashes, equals, plus, pipe, middle-dot, box-drawing U+2500–U+257F
const BORDER_LINE_RE = /^[ \t\-=+|·─-╿]*$/;

export function isBorderLine(line: string): boolean {
  return BORDER_LINE_RE.test(line);
}

const SEP_CANDIDATES = ['│', '┃', '║', '·', '|'] as const;

export function detectSeparator(line: string): string {
  let best = '';
  let bestCount = 0;
  for (const c of SEP_CANDIDATES) {
    let count = 0;
    for (const ch of line) { if (ch === c) count++; }
    if (count > bestCount) { bestCount = count; best = c; }
  }
  return best || '|';
}

// A jira header row uses `||` as its cell separator while its data rows use a
// single `|`. Detected per line rather than per style, because "format to style"
// hands a jira source to the parser under the *target* style's name.
function effectiveSeparator(trimmed: string, sep: string): string {
  if (sep === '|' && trimmed.startsWith('||') && trimmed.endsWith('||')) return '||';
  return sep;
}

// Splits a row into cells, dropping only the framing separators. Interior empty
// cells are preserved — `|  | c2 |` is two columns, the first one blank.
//
// With a `|` separator, `\|` is an escaped pipe inside a cell (GFM, Jira and
// AsciiDoc all use it; `render` emits it): it doesn't split, and it comes back
// as a plain `|` so the model holds the unescaped value.
function splitCells(line: string, sep: string): string[] {
  const s = line.trim();
  const actual = effectiveSeparator(s, sep);
  const pipeEscapes = actual.includes('|');
  const cells: string[] = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    if (pipeEscapes && s[i] === '\\' && s[i + 1] === '|') {
      buf += '|';
      i++;
    } else if (s.startsWith(actual, i)) {
      cells.push(buf);
      buf = '';
      i += actual.length - 1;
    } else {
      buf += s[i];
    }
  }
  cells.push(buf);
  // Drop the framing separators: a leading one leaves an empty first cell, a
  // trailing one an empty last cell.
  if (cells.length > 1 && s.startsWith(actual)) cells.shift();
  if (cells.length > 1 && cells[cells.length - 1] === '' && s.endsWith(actual)) cells.pop();
  return cells.map(c => c.trim());
}

// Markdown delimiter cell: `---`, `:--`, `--:` or `:-:`
const ALIGN_CELL_RE = /^:?-+:?$/;

/**
 * A markdown alignment row (`| :-- | --: |`). Rows made only of dashes are already
 * caught by `isBorderLine`; this exists for the ones carrying `:` markers, which
 * must be recognised as structure rather than data.
 */
export function isAlignmentRow(line: string, sep: string): boolean {
  if (line.trim() === '') return false;
  const cells = splitCells(line, sep);
  return cells.length > 0 && cells.every(c => ALIGN_CELL_RE.test(c));
}

function parseAligns(line: string, sep: string): Align[] {
  return splitCells(line, sep).map(cell => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return 'default';
  });
}

function parsePipeTable(lines: string[]): TableData {
  const dataLines = lines.filter(l => l.trim() !== '' && !isBorderLine(l));
  if (dataLines.length === 0) throw new Error('no data rows found in table');

  const firstLine = dataLines[0] ?? '';
  const sep = detectSeparator(firstLine);
  const headers = splitCells(firstLine, sep);
  if (headers.length === 0) throw new Error('table header row is empty');

  let rest = dataLines.slice(1);
  let aligns: Align[] | undefined;
  const afterHeader = rest[0];
  if (afterHeader !== undefined && isAlignmentRow(afterHeader, sep)) {
    aligns = parseAligns(afterHeader, sep);
    rest = rest.slice(1);
  }

  const nCols = headers.length;
  const rows = rest.map(line => {
    const cells = splitCells(line, sep);
    while (cells.length < nCols) cells.push('');
    return cells.slice(0, nCols) as string[];
  });

  return makeTableData(headers, rows, aligns);
}

function parseRstTable(lines: string[]): TableData {
  const isRstSep = (l: string) => l.trim() !== '' && [...l].every(c => c === '=' || c === ' ');
  const sepIndices: number[] = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => isRstSep(l))
    .map(({ i }) => i);

  if (sepIndices.length < 2) {
    throw new Error(`RST table requires at least 2 separator lines, found ${sepIndices.length}`);
  }

  // Compute column char-ranges from first separator line
  const firstSepChars = [...(lines[sepIndices[0] ?? 0] ?? '')];
  const colRanges: [number, number][] = [];
  let i = 0;
  while (i < firstSepChars.length) {
    if (firstSepChars[i] === '=') {
      const start = i;
      while (i < firstSepChars.length && firstSepChars[i] === '=') i++;
      colRanges.push([start, i]);
    } else {
      i++;
    }
  }
  if (colRanges.length === 0) throw new Error('no columns found in RST separator line');

  const extract = (line: string): string[] => {
    const chars = [...line];
    return colRanges.map(([start, end]) => {
      const s = Math.min(start, chars.length);
      const e = Math.min(end, chars.length);
      return chars.slice(s, e).join('').trim();
    });
  };

  const between = (from: number, to: number) =>
    lines.slice(from, to).find(l => l.trim() !== '');

  const headerLine = between((sepIndices[0] ?? 0) + 1, sepIndices[1] ?? 0);
  if (!headerLine) throw new Error('no header row found in RST table');

  const headers = extract(headerLine);
  const nCols = headers.length;
  const lastSep = sepIndices[sepIndices.length - 1] ?? 0;

  const rows = lines
    .slice((sepIndices[1] ?? 0) + 1, lastSep)
    .filter(l => l.trim() !== '' && !isRstSep(l))
    .map(line => {
      const cells = extract(line);
      while (cells.length < nCols) cells.push('');
      return cells.slice(0, nCols) as string[];
    });

  return makeTableData(headers, rows);
}

export function parseTable(lines: string[], style: OutputStyle): TableData {
  if (style === 'rst') return parseRstTable(lines);
  if (style === 'asciidoc') {
    const filtered = lines.filter(l => !l.trimStart().startsWith('[cols='));
    return parsePipeTable(filtered);
  }
  const data = parsePipeTable(lines);
  if (style === 'orgtbl') {
    // Org-mode writes a literal pipe as `\vert` (`\vert{}` when followed by a letter).
    const unescape = (c: string) => c.replace(/\\vert(\{\})?/g, '|');
    data.headers = data.headers.map(unescape);
    data.rows = data.rows.map(r => r.map(unescape));
  }
  return data;
}

export function detectStyle(bareLines: string[]): OutputStyle {
  for (const line of bareLines) {
    if (!line) continue;
    if (line.startsWith('|===') || line.startsWith('[cols=')) return 'asciidoc';
    if (line.includes('║')) return 'extended';
    if (line.includes('━')) return 'heavy-outline';
  }

  const hasRstSep = bareLines.some(
    l => l.trim() !== '' && !l.includes('|') && !l.includes('+') && [...l].every(c => c === '=' || c === ' ')
  );
  if (hasRstSep) return 'rst';

  const hasPlusBorder = bareLines.some(
    l => l !== '' && l.startsWith('+') && [...l].every(c => '+-=| '.includes(c))
  );
  if (hasPlusBorder) return 'ascii';

  const hasBoxDrawing = bareLines.some(l => l.includes('│') || l.includes('─'));
  if (hasBoxDrawing) {
    const hasModernCorners = bareLines.some(
      l => l.includes('╒') || l.includes('╘') || l.includes('╞') || l.includes('╡')
    );
    return hasModernCorners ? 'modern' : 'sharp';
  }

  const firstNonEmpty = bareLines.find(l => l !== '');
  if (firstNonEmpty?.startsWith('||')) return 'jira';

  const hasOrgtblSep = bareLines.some(
    l => l !== '' && l.startsWith('|') && l.endsWith('|') && l.includes('+') &&
         [...l].every(c => '|-+ '.includes(c))
  );
  if (hasOrgtblSep) return 'orgtbl';

  const hasPsqlSep = bareLines.some(
    l => l !== '' && !l.startsWith('|') && l.includes('+') && l.includes('-') &&
         [...l].every(c => '-+ '.includes(c))
  );
  if (hasPsqlSep) return 'psql';

  return 'github';
}
