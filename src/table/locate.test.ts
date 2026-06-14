import { describe, it, expect } from 'vitest';
import { isTableLine, findTableBounds, findDataLineBounds } from './locate.js';

describe('isTableLine', () => {
  it('github data row', () => expect(isTableLine('| spam | 42 |')).toBe(true));
  it('github separator', () => expect(isTableLine('|---|---|')).toBe(true));
  it('box drawing data', () => expect(isTableLine('│ spam │ 42 │')).toBe(true));
  it('box drawing border', () => expect(isTableLine('├───┼───┤')).toBe(true));
  it('asciidoc delimiter', () => expect(isTableLine('|====')).toBe(true));
  it('rst separator', () => expect(isTableLine('=====  ===')).toBe(true));
  it('empty string', () => expect(isTableLine('')).toBe(false));
  it('prose text', () => expect(isTableLine('Some ordinary prose text here.')).toBe(false));
  it('heading', () => expect(isTableLine('# My Heading')).toBe(false));
});

const bounds = (file: string, target: number) => {
  const lines = file.split('\n');
  return findTableBounds(lines, target);
};

describe('findTableBounds', () => {
  it('github table in prose file', () => {
    const file = '# Heading\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nSome prose';
    expect(bounds(file, 2)).toEqual([2, 4]);
  });

  it('target on separator row', () => {
    const file = '# Heading\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nSome prose';
    expect(bounds(file, 3)).toEqual([2, 4]);
  });

  it('target on last data row', () => {
    const file = '# Heading\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nSome prose';
    expect(bounds(file, 4)).toEqual([2, 4]);
  });

  it('table at start of file', () => {
    const file = '| a | b |\n|---|---|\n| 1 | 2 |\n\nSome prose';
    expect(bounds(file, 0)).toEqual([0, 2]);
  });

  it('table at end of file', () => {
    const file = 'Prose\n\n| a | b |\n|---|---|\n| 1 | 2 |';
    expect(bounds(file, 4)).toEqual([2, 4]);
  });

  it('error on prose line', () => {
    const file = '# Heading\n\n| a | b |\n\nSome prose';
    const lines = file.split('\n');
    expect(() => findTableBounds(lines, 0)).toThrow();
    expect(() => findTableBounds(lines, 4)).toThrow();
  });

  it('error out of range', () => {
    expect(() => findTableBounds(['| a |'], 99)).toThrow();
  });

  it('rst content line expands to full table', () => {
    const file = 'Prose\n\n=====  ===\nitem   qty\n=====  ===\nspam    42\n=====  ===\n\nMore';
    expect(bounds(file, 3)).toEqual([2, 6]);
  });

  it('rst data line expands to full table', () => {
    const file = '=====  ===\nitem   qty\n=====  ===\nspam    42\n=====  ===';
    expect(bounds(file, 3)).toEqual([0, 4]);
  });

  it('asciidoc cols line included', () => {
    const file = 'Text\n\n[cols="<4,>3",options="header"]\n|====\n| item | qty\n| spam |  42\n|====\n\nMore';
    expect(bounds(file, 4)).toEqual([2, 6]);
  });

  it('commented table', () => {
    const file = '// | a | b |\n// |---|---|\n// | 1 | 2 |';
    expect(bounds(file, 1)).toEqual([0, 2]);
  });
});

describe('findDataLineBounds', () => {
  it('finds contiguous pipe lines', () => {
    const file = '# Heading\na | b | c\n1 | 2 | 3\n4 | 5 | 6\nSome prose';
    const lines = file.split('\n');
    expect(findDataLineBounds(lines, 2)).toEqual([1, 3]);
  });

  it('returns null when cursor line has no pipe', () => {
    const lines = ['# Heading', 'a | b'];
    expect(findDataLineBounds(lines, 0)).toBeNull();
  });

  it('stops at blank line', () => {
    const lines = ['a | b', '', 'c | d'];
    expect(findDataLineBounds(lines, 0)).toEqual([0, 0]);
  });
});
