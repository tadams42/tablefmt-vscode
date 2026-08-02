import { describe, it, expect } from 'vitest';
import { findColumnAtCursor, addColumn, removeColumn } from './edit.js';
import { makeTableData } from './model.js';

describe('findColumnAtCursor', () => {
  it('cursor in first cell', () => {
    expect(findColumnAtCursor('| col1 | col2 |', 3)).toBe(0);
  });

  it('cursor in second cell', () => {
    expect(findColumnAtCursor('| col1 | col2 |', 10)).toBe(1);
  });

  it('cursor on separator between columns', () => {
    expect(findColumnAtCursor('| col1 | col2 |', 7)).toBe(0);
  });

  it('cursor before table clamps to zero', () => {
    expect(findColumnAtCursor('| a | b |', 0)).toBe(0);
  });

  it('cursor past trailing pipe returns last column index', () => {
    expect(findColumnAtCursor('| a | b |', 999)).toBe(2);
  });

  it('with comment prefix - first col', () => {
    expect(findColumnAtCursor('// | col1 | col2 |', 6)).toBe(0);
  });

  it('with comment prefix - second col', () => {
    expect(findColumnAtCursor('// | col1 | col2 |', 14)).toBe(1);
  });

  it('box drawing separator', () => {
    expect(findColumnAtCursor('│ col1 │ col2 │', 3)).toBe(0);
  });
});

const makeTable = () => makeTableData(
  ['a', 'b', 'c'],
  [['1', '2', '3'], ['4', '5', '6']]
);

const makeAlignedTable = () => makeTableData(
  ['a', 'b', 'c'],
  [['1', '2', '3']],
  ['left', 'center', 'right']
);

describe('addColumn', () => {
  it('at start', () => {
    const t = addColumn(makeTable(), 0);
    expect(t.headers).toEqual(['', 'a', 'b', 'c']);
    expect(t.rows[0]).toEqual(['', '1', '2', '3']);
  });

  it('in middle', () => {
    const t = addColumn(makeTable(), 1);
    expect(t.headers).toEqual(['a', '', 'b', 'c']);
    expect(t.rows[0]).toEqual(['1', '', '2', '3']);
  });

  it('at end', () => {
    const t = addColumn(makeTable(), 3);
    expect(t.headers).toEqual(['a', 'b', 'c', '']);
    expect(t.rows[0]).toEqual(['1', '2', '3', '']);
  });

  it('beyond end clamps', () => {
    const t = addColumn(makeTable(), 999);
    expect(t.headers.length).toBe(4);
    expect(t.headers[t.headers.length - 1]).toBe('');
  });

  it('shifts alignments with the inserted column', () => {
    const t = addColumn(makeAlignedTable(), 1);
    expect(t.columnMeta.map(m => m.align)).toEqual(['left', 'default', 'center', 'right']);
  });
});

describe('removeColumn', () => {
  it('first column', () => {
    const t = removeColumn(makeTable(), 0);
    expect(t.headers).toEqual(['b', 'c']);
    expect(t.rows[0]).toEqual(['2', '3']);
  });

  it('last column', () => {
    const t = removeColumn(makeTable(), 2);
    expect(t.headers).toEqual(['a', 'b']);
    expect(t.rows[0]).toEqual(['1', '2']);
  });

  it('out of range throws', () => {
    expect(() => removeColumn(makeTable(), 3)).toThrow();
    expect(() => removeColumn(makeTable(), 99)).toThrow();
  });

  it('keeps the remaining columns aligned as before', () => {
    const t = removeColumn(makeAlignedTable(), 1);
    expect(t.columnMeta.map(m => m.align)).toEqual(['left', 'right']);
  });
});
