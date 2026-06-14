import { describe, it, expect } from 'vitest';
import { detectDelimiter, parseDelimited } from './dataParser.js';

describe('detectDelimiter', () => {
  it('detects pipe as most common', () => {
    expect(detectDelimiter('a | b | c\n1 | 2 | 3')).toBe('|');
  });

  it('detects comma', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('detects tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('detects semicolon', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('pipe wins on tie with priority', () => {
    expect(detectDelimiter('a|b\n1,2')).toBe('|');
  });
});

describe('parseDelimited', () => {
  it('pipe-separated basic', () => {
    const data = parseDelimited('name | qty\nspam | 42\neggs | 451', '|');
    expect(data.headers).toEqual(['name', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
    expect(data.rows[1]).toEqual(['eggs', '451']);
  });

  it('strips framing delimiters', () => {
    const data = parseDelimited('| name | qty |\n| spam | 42 |', '|');
    expect(data.headers).toEqual(['name', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });

  it('trims cell whitespace', () => {
    const data = parseDelimited('  name  ,  qty  \n  spam  ,  42  ', ',');
    expect(data.headers).toEqual(['name', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });

  it('pads short rows', () => {
    const data = parseDelimited('a,b,c\n1,2', ',');
    expect(data.rows[0]).toEqual(['1', '2', '']);
  });

  it('throws on empty input', () => {
    expect(() => parseDelimited('', ',')).toThrow();
  });

  it('skips blank lines', () => {
    const data = parseDelimited('a,b\n\n1,2', ',');
    expect(data.rows.length).toBe(1);
  });
});
