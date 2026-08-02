import { describe, it, expect } from 'vitest';
import { formatTable, formatDelimited } from './format.js';
import { ALL_STYLES } from './types.js';

const GITHUB_SRC = '| item | qty |\n| ---- | --: |\n| spam |  42 |\n| eggs | 451 |';

// psql draws no left border, so its leading cell padding reads back as
// indentation and the comment/indent layer faithfully preserves it. Ignore
// leading whitespace when comparing round trips.
const deindent = (s: string) => s.split('\n').map(l => l.replace(/^ +/, '')).join('\n');

describe('formatTable - style conversion', () => {
  // Regression: the source used to be parsed with the *target* style, so a
  // conversion whose target had a different grammar than the source blew up
  // before rendering anything.
  it('renders a pipe table as rst instead of throwing', () => {
    expect(formatTable(GITHUB_SRC, 'rst')).toBe(
      '====== =====\n' +
      ' item   qty \n' +
      '====== =====\n' +
      ' spam    42 \n' +
      ' eggs   451 \n' +
      '====== ====='
    );
  });

  it('every target style renders without throwing', () => {
    for (const style of ALL_STYLES) {
      expect(() => formatTable(GITHUB_SRC, style), `target ${style}`).not.toThrow();
    }
  });

  it('every target style survives a round trip back to github', () => {
    for (const style of ALL_STYLES) {
      const converted = formatTable(GITHUB_SRC, style);
      expect(deindent(formatTable(converted, 'github')), `via ${style}`).toBe(GITHUB_SRC);
    }
  });

  it('null target re-formats in the detected style', () => {
    expect(formatTable('|item|qty|\n|-|-:|\n|spam|42|', null)).toBe(
      '| item | qty |\n| ---- | --: |\n| spam |  42 |'
    );
  });

  it('keeps a comment prefix', () => {
    expect(formatTable('// | a | b |\n// | 1 | 2 |', 'github')).toBe(
      '// |  a |  b |\n// | -: | -: |\n// |  1 |  2 |'
    );
  });

  it('throws on input that is not a table', () => {
    expect(() => formatTable('', 'github')).toThrow();
  });
});

describe('formatDelimited', () => {
  it('csv to github', () => {
    expect(formatDelimited('item,qty\nspam,42\neggs,451', 'github')).toBe(
      '| item | qty |\n| ---- | --: |\n| spam |  42 |\n| eggs | 451 |'
    );
  });

  it('throws on empty input', () => {
    expect(() => formatDelimited('', 'github')).toThrow();
  });
});
