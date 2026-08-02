import { describe, it, expect } from 'vitest';
import { formatTable, formatDelimited, editTable } from './format.js';
import { addColumn, removeColumn } from './edit.js';
import { ALL_STYLES } from './types.js';

const GITHUB_SRC = '| item | qty |\n| ---- | --: |\n| spam |  42 |\n| eggs | 451 |';

// psql and rst draw no left border, so their leading cell padding reads back as
// indentation, which the comment/indent layer then faithfully preserves. Ignore
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

describe('editTable', () => {
  const ALIGNED = '| a | b | c |\n| - | :-: | --: |\n| x | y | z |';

  it('round-trips unchanged', () => {
    expect(editTable(ALIGNED, d => d)).toBe(
      '| a |  b  |  c |\n' +
      '| - | :-: | -: |\n' +
      '| x |  y  |  z |'
    );
  });

  it('keeps each marker on its own column when inserting before', () => {
    expect(editTable(ALIGNED, d => addColumn(d, 0))).toBe(
      '|   | a |  b  |  c |\n' +
      '| - | - | :-: | -: |\n' +
      '|   | x |  y  |  z |'
    );
  });

  it('keeps each marker on its own column when removing', () => {
    expect(editTable(ALIGNED, d => removeColumn(d, 1))).toBe(
      '| a |  c |\n' +
      '| - | -: |\n' +
      '| x |  z |'
    );
  });

  it('preserves the comment prefix', () => {
    expect(editTable('// | a | b |\n// | x | y |', d => removeColumn(d, 1))).toBe(
      '// | a |\n// | - |\n// | x |'
    );
  });

  it('propagates an out-of-range column error', () => {
    expect(() => editTable(ALIGNED, d => removeColumn(d, 9))).toThrow();
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
