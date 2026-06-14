import { makeTableData } from './model.js';
import type { TableData } from './model.js';

type Delimiter = '|' | ';' | ',' | '\t';
const DELIMITERS: Delimiter[] = ['|', ';', ',', '\t'];

export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { '|': 0, ';': 0, ',': 0, '\t': 0 };
  for (const ch of text) {
    if (ch === '|') counts['|']++;
    else if (ch === ';') counts[';']++;
    else if (ch === ',') counts[',']++;
    else if (ch === '\t') counts['\t']++;
  }
  let best: Delimiter = '|';
  let bestCount = counts['|'];
  for (const d of DELIMITERS) {
    if (counts[d] > bestCount) { bestCount = counts[d]; best = d; }
  }
  return best;
}

export function parseDelimited(text: string, delimiter: string): TableData {
  const rawLines = text.split('\n').filter(l => l.trim() !== '');
  if (rawLines.length === 0) throw new Error('no input lines found');

  const parseRow = (line: string): string[] => {
    let s = line;
    // Strip framing delimiters
    if (s.startsWith(delimiter)) s = s.slice(delimiter.length);
    if (s.endsWith(delimiter) && delimiter.length > 0) s = s.slice(0, s.length - delimiter.length);
    return s.split(delimiter).map(cell => cell.trim());
  };

  const [headerLine, ...dataLines] = rawLines as [string, ...string[]];
  const headers = parseRow(headerLine);
  const nCols = headers.length;

  const rows = dataLines.map(line => {
    const cells = parseRow(line);
    while (cells.length < nCols) cells.push('');
    return cells.slice(0, nCols);
  });

  return makeTableData(headers, rows);
}
