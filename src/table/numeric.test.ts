import { describe, it, expect } from 'vitest';
import { populateColumnMeta } from './numeric.js';
import { makeTableData } from './model.js';

describe('populateColumnMeta', () => {
  it('detects numeric column', () => {
    const data = makeTableData(['name', 'qty'], [['spam', '42'], ['eggs', '10']]);
    populateColumnMeta(data);
    expect(data.columnMeta[0]?.isNumeric).toBe(false);
    expect(data.columnMeta[1]?.isNumeric).toBe(true);
  });

  it('empty cells do not disqualify numeric', () => {
    const data = makeTableData(['val'], [['1.5'], [''], ['3']]);
    populateColumnMeta(data);
    expect(data.columnMeta[0]?.isNumeric).toBe(true);
  });

  it('all-empty column is not numeric', () => {
    const data = makeTableData(['val'], [[''], ['']]);
    populateColumnMeta(data);
    expect(data.columnMeta[0]?.isNumeric).toBe(false);
  });

  it('negative numbers are numeric', () => {
    const data = makeTableData(['val'], [['-5'], ['-3.14']]);
    populateColumnMeta(data);
    expect(data.columnMeta[0]?.isNumeric).toBe(true);
  });

  it('non-numeric cell in column', () => {
    const data = makeTableData(['val'], [['1'], ['abc']]);
    populateColumnMeta(data);
    expect(data.columnMeta[0]?.isNumeric).toBe(false);
  });

  it('header row not included in numeric check', () => {
    const data = makeTableData(['Revenue'], [['12500.50'], ['13200.75']]);
    populateColumnMeta(data);
    expect(data.columnMeta[0]?.isNumeric).toBe(true);
  });
});
