import { detectDelimiter, parseDelimited } from './dataParser.js';
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
