import { makeTableData } from './model.js';
import type { TableData } from './model.js';

type Delimiter = '|' | ';' | ',' | '\t';
const DELIMITERS: Delimiter[] = ['|', ';', ',', '\t'];

/**
 * Pick the delimiter that occurs most often outside double-quoted fields.
 *
 * A `"` only opens a quoted region at the start of a field (start of line,
 * after whitespace, or after a candidate delimiter), so a stray inch mark
 * like `5"` doesn't swallow the rest of the line.
 */
export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { '|': 0, ';': 0, ',': 0, '\t': 0 };
  let inQuotes = false;
  let prev = '\n';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') i++;
        else inQuotes = false;
      }
    } else if (ch === '"' && (/\s/.test(prev) || (DELIMITERS as string[]).includes(prev))) {
      inQuotes = true;
    } else if (ch in counts) {
      counts[ch as Delimiter]++;
    }
    prev = ch;
  }
  let best: Delimiter = '|';
  let bestCount = counts['|'];
  for (const d of DELIMITERS) {
    if (counts[d] > bestCount) { bestCount = counts[d]; best = d; }
  }
  return best;
}

interface Field {
  value: string;
  quoted: boolean;
}

/**
 * Split text into records of fields, honouring CSV-style double quoting:
 * a field starting with `"` (after optional whitespace) runs to the matching
 * closing quote, may contain the delimiter and newlines, and uses `""` for a
 * literal quote. Newlines inside a quoted field become spaces, since a table
 * cell can't span lines.
 */
function splitRecords(text: string, delimiter: string): Field[][] {
  const records: Field[][] = [];
  let record: Field[] = [];
  let buf = '';
  let quoted = false;
  let inQuotes = false;

  const endField = () => {
    record.push({ value: buf.trim(), quoted });
    buf = '';
    quoted = false;
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { buf += '"'; i++; }
        else inQuotes = false;
      } else if (ch === '\r' || ch === '\n') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        buf += ' ';
      } else {
        buf += ch;
      }
    } else if (ch === '"' && !quoted && buf.trim() === '') {
      buf = '';
      quoted = true;
      inQuotes = true;
    } else if (text.startsWith(delimiter, i)) {
      endField();
      i += delimiter.length - 1;
    } else if (ch === '\n') {
      endRecord();
    } else if (ch === '\r') {
      if (text[i + 1] !== '\n') endRecord();
    } else {
      buf += ch;
    }
  }
  endRecord();
  return records;
}

const isEmpty = (f: Field | undefined) => f !== undefined && !f.quoted && f.value === '';

export function parseDelimited(text: string, delimiter: string): TableData {
  const records = splitRecords(text, delimiter)
    // Blank line: a single empty, unquoted field.
    .filter(r => !(r.length === 1 && isEmpty(r[0])))
    .map(r => {
      // Strip framing delimiters (`| a | b |`).
      if (r.length > 1 && isEmpty(r[0])) r = r.slice(1);
      if (r.length > 1 && isEmpty(r[r.length - 1])) r = r.slice(0, -1);
      return r.map(f => f.value);
    });
  if (records.length === 0) throw new Error('no input lines found');

  const [headers, ...dataRows] = records as [string[], ...string[][]];
  const nCols = headers.length;

  const rows = dataRows.map(cells => {
    while (cells.length < nCols) cells.push('');
    return cells.slice(0, nCols);
  });

  return makeTableData(headers, rows);
}
