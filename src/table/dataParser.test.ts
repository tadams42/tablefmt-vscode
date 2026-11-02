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

  it('ignores delimiters inside quoted fields', () => {
    expect(detectDelimiter('a;b\n"1,2,3";"4,5,6"')).toBe(';');
  });

  it('does not treat a mid-field quote as opening a quoted region', () => {
    expect(detectDelimiter('size;name\n5";a,b\n6";c')).toBe(';');
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

  it('keeps delimiters inside quoted fields', () => {
    const data = parseDelimited('a,b,c\n1,"x, y",3', ',');
    expect(data.rows[0]).toEqual(['1', 'x, y', '3']);
  });

  it('unescapes doubled quotes', () => {
    const data = parseDelimited('a,b\n"say ""hi""",2', ',');
    expect(data.rows[0]).toEqual(['say "hi"', '2']);
  });

  it('keeps a quoted newline in one cell', () => {
    const data = parseDelimited('a,b\n"line1\r\nline2",2\n3,4', ',');
    expect(data.rows).toEqual([['line1 line2', '2'], ['3', '4']]);
  });

  it('keeps a quoted empty trailing field', () => {
    const data = parseDelimited('a,b\n1,""', ',');
    expect(data.rows[0]).toEqual(['1', '']);
  });

  it('leaves quotes inside an unquoted field alone', () => {
    const data = parseDelimited('a,b\n5",x', ',');
    expect(data.rows[0]).toEqual(['5"', 'x']);
  });

  it('parses quoted CSV end to end', () => {
    const text = [
      'Category,Max Frequency,Max Data Rate,Notable Physical Characteristics,Common Use Cases',
      'CAT5e,100 MHz,1 Gbps,"24 AWG wire, unshielded",Standard Gigabit home networks',
      'CAT6A,500 MHz,10 Gbps (at 100m),"23 AWG wire, thicker insulation/jacket, shielded (STP/FTP)","10Gb Enterprise infrastructure, long runs"',
      'CAT7,600 MHz,10 Gbps,Individually shielded pairs + overall braid,"Proprietary/industrial (uses GG45/TERA, not standard RJ45)"',
    ].join('\n');
    const data = parseDelimited(text, detectDelimiter(text));
    expect(data.headers.length).toBe(5);
    expect(data.rows).toEqual([
      ['CAT5e', '100 MHz', '1 Gbps', '24 AWG wire, unshielded', 'Standard Gigabit home networks'],
      ['CAT6A', '500 MHz', '10 Gbps (at 100m)', '23 AWG wire, thicker insulation/jacket, shielded (STP/FTP)', '10Gb Enterprise infrastructure, long runs'],
      ['CAT7', '600 MHz', '10 Gbps', 'Individually shielded pairs + overall braid', 'Proprietary/industrial (uses GG45/TERA, not standard RJ45)'],
    ]);
  });
});
