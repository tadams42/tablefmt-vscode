import { detectDelimiter, parseDelimited } from './dataParser.js';
import type { TableData } from './model.js';
import { populateColumnMeta } from './numeric.js';
import { preprocess, postprocess } from './prettify.js';
import { render } from './render.js';
import { detectStyle, parseTable } from './tableParser.js';
import type { OutputStyle } from './types.js';

/**
 * Re-render an existing table, optionally in a different style.
 *
 * The source is always parsed with its *detected* style; `targetStyle` only
 * chooses the output. Parsing with the target style instead made every
 * conversion read the source through the wrong grammar — "Format table to
 * style: rst" on a pipe table threw "RST table requires at least 2 separator
 * lines" before rendering anything.
 *
 * Throws on unparseable input.
 */
export function formatTable(text: string, targetStyle: OutputStyle | null): string {
  const [bareLines, meta] = preprocess(text);
  const sourceStyle = detectStyle(bareLines);
  const data = parseTable(bareLines, sourceStyle);
  populateColumnMeta(data);
  return postprocess(render(data, targetStyle ?? sourceStyle), meta);
}

/** Render raw delimited data (CSV, TSV, `;`- or `|`-separated) as a table. */
export function formatDelimited(text: string, style: OutputStyle): string {
  const data = parseDelimited(text, detectDelimiter(text));
  populateColumnMeta(data);
  return render(data, style);
}

/**
 * Apply a structural edit (add/remove column) and re-render in the table's own
 * style. Same pipeline as `formatTable`, with `op` between parse and render.
 *
 * Throws on unparseable input or an out-of-range column.
 */
export function editTable(text: string, op: (data: TableData) => TableData): string {
  const [bareLines, meta] = preprocess(text);
  const style = detectStyle(bareLines);
  const edited = op(parseTable(bareLines, style));
  populateColumnMeta(edited);
  return postprocess(render(edited, style), meta);
}
