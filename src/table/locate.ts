import { bareLine } from './prettify.js';
import { isBorderLine } from './tableParser.js';

export function isTableLine(bare: string): boolean {
  if (!bare) return false;
  return isBorderLine(bare) || /[|│║┃·]/.test(bare);
}

function isRstSep(bare: string): boolean {
  return bare.trim() !== '' && [...bare].every(c => c === '=' || c === ' ');
}

function getLine(allLines: string[], i: number): string {
  return allLines[i] ?? '';
}

function findRstTableAround(allLines: string[], target: number): [number, number] | null {
  const sep = (i: number) => isRstSep(bareLine(getLine(allLines, i)));

  const searchUp = Math.max(0, target - 20);
  const searchDown = Math.min(allLines.length - 1, target + 20);

  let sepAbove = -1;
  for (let i = target - 1; i >= searchUp; i--) { if (sep(i)) { sepAbove = i; break; } }
  let sepBelow = -1;
  for (let i = target + 1; i <= searchDown; i++) { if (sep(i)) { sepBelow = i; break; } }

  if (sepAbove === -1 || sepBelow === -1) return null;

  // Walk outward to capture all 3 separators (top, after-header, bottom)
  let start = sepAbove;
  for (let i = sepAbove - 1; i >= Math.max(0, sepAbove - 10); i--) {
    if (sep(i)) { start = i; break; }
  }
  let end = sepBelow;
  for (let i = sepBelow + 1; i <= Math.min(allLines.length - 1, sepBelow + 10); i++) {
    if (sep(i)) { end = i; break; }
  }

  return [start, end];
}

export function findTableBounds(allLines: string[], target: number): [number, number] {
  if (target >= allLines.length) {
    throw new Error(`line ${target} is out of range (file has ${allLines.length} lines)`);
  }

  const bare = (i: number) => bareLine(getLine(allLines, i));

  if (!isTableLine(bare(target))) {
    const rst = findRstTableAround(allLines, target);
    if (rst) return rst;
    throw new Error(`line ${target} is not part of a table`);
  }

  let start = target;
  while (start > 0 && isTableLine(bare(start - 1))) start--;

  let end = target;
  while (end + 1 < allLines.length && isTableLine(bare(end + 1))) end++;

  // Include AsciiDoc [cols=...] attribute line immediately before table
  if (start > 0 && bare(start - 1).startsWith('[cols=')) start--;

  return [start, end];
}

// For "Data to table" without selection: find contiguous lines with | around cursor
export function findDataLineBounds(allLines: string[], target: number): [number, number] | null {
  if (target >= allLines.length) return null;
  if (!(getLine(allLines, target).includes('|'))) return null;

  let start = target;
  while (start > 0 && getLine(allLines, start - 1).trim() !== '' && getLine(allLines, start - 1).includes('|')) start--;

  let end = target;
  while (end + 1 < allLines.length && getLine(allLines, end + 1).trim() !== '' && getLine(allLines, end + 1).includes('|')) end++;

  return [start, end];
}
