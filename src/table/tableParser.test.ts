import { describe, it, expect } from 'vitest';
import { isBorderLine, isAlignmentRow, detectSeparator, detectStyle, parseTable } from './tableParser.js';
import { populateColumnMeta } from './numeric.js';
import { render } from './render.js';

const lines = (s: string) => s.split('\n');

describe('isBorderLine', () => {
  it('github separator', () => expect(isBorderLine('|---|---|')).toBe(true));
  it('ascii separator', () => expect(isBorderLine('+-----+-----+')).toBe(true));
  it('box drawing border', () => expect(isBorderLine('├───┼───┤')).toBe(true));
  it('rst separator', () => expect(isBorderLine('=====  =====')).toBe(true));
  it('psql separator', () => expect(isBorderLine('------+------')).toBe(true));
  it('heavy-outline separator', () => expect(isBorderLine('┣━━━━━━━╋━━━━━━━┫')).toBe(true));
  it('not border: has content', () => expect(isBorderLine('| spam | 42 |')).toBe(false));
  it('not border: box drawing with content', () => expect(isBorderLine('│ spam │ 42 │')).toBe(false));
});

describe('detectSeparator', () => {
  it('detects pipe', () => expect(detectSeparator('| a | b |')).toBe('|'));
  it('detects box drawing │', () => expect(detectSeparator('│ a │ b │')).toBe('│'));
  it('detects double vertical ║', () => expect(detectSeparator('║ a ║ b ║')).toBe('║'));
  it('fallback to pipe when no candidates', () => expect(detectSeparator('a  b')).toBe('|'));
});

describe('detectStyle', () => {
  it('github fallback', () => expect(detectStyle(lines('| a | b |\n|---|---|\n| 1 | 2 |'))).toBe('github'));
  it('psql by plus separator', () => expect(detectStyle(lines(' a | b \n---+---\n 1 | 2 '))).toBe('psql'));
  it('orgtbl by plus inside pipe separator', () => expect(detectStyle(lines('| a | b |\n|---+---|\n| 1 | 2 |'))).toBe('orgtbl'));
  it('jira by double pipe header', () => expect(detectStyle(lines('|| a || b ||\n| 1 | 2 |'))).toBe('jira'));
  it('rst by equals-only separator', () => expect(detectStyle(lines('===  ===\na    b\n===  ===\n1    2\n===  ==='))).toBe('rst'));
  it('asciidoc by pipe-equals delimiter', () => expect(detectStyle(lines('|====\n| a | b\n| 1 | 2\n|===='))).toBe('asciidoc'));
  it('asciidoc by cols attribute', () => expect(detectStyle(lines('[cols="<4,>3"]\n|====\n| a | b\n|===='))).toBe('asciidoc'));
  it('extended by double vertical', () => expect(detectStyle(lines('║ a ║ b ║\n║ 1 ║ 2 ║'))).toBe('extended'));
  it('heavy-outline by heavy horizontal', () => expect(detectStyle(lines('┃ a ┃ b ┃\n━━━━━━━━━\n┃ 1 ┃ 2 ┃'))).toBe('heavy-outline'));
  it('modern by double-single corners', () => expect(detectStyle(lines('╒═══╤═══╕\n│ a │ b │\n╞═══╪═══╡\n│ 1 │ 2 │\n╘═══╧═══╛'))).toBe('modern'));
  it('sharp by box drawing without modern corners', () => expect(detectStyle(lines('┌───┬───┐\n│ a │ b │\n├───┼───┤\n│ 1 │ 2 │\n└───┴───┘'))).toBe('sharp'));
  it('ascii by plus border', () => expect(detectStyle(lines('+---+---+\n| a | b |\n+===+===+\n| 1 | 2 |\n+---+---+'))).toBe('ascii'));
});

describe('parseTable - github', () => {
  it('two cols', () => {
    const data = parseTable(lines('| item | qty |\n|------|-----|\n| spam | 42 |\n| eggs | 451 |'), 'github');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
    expect(data.rows[1]).toEqual(['eggs', '451']);
  });

  it('extra whitespace trimmed', () => {
    const data = parseTable(lines('|  item   |   qty  |\n|---------|--------|\n|spam   |42|'), 'github');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });

  it('keeps a blank leading cell as its own column', () => {
    const data = parseTable(lines('|  | c2 | c3 |\n| v1 | v2 | v3 |'), 'github');
    expect(data.headers).toEqual(['', 'c2', 'c3']);
    expect(data.rows[0]).toEqual(['v1', 'v2', 'v3']);
  });

  it('keeps blank interior and trailing cells', () => {
    const data = parseTable(lines('| a | b | c |\n|---|---|---|\n| 1 |  |  |'), 'github');
    expect(data.rows[0]).toEqual(['1', '', '']);
  });

  it('reads alignment markers from the delimiter row', () => {
    const data = parseTable(lines('| a | b | c | d |\n| - | :- | -: | :-: |\n| 1 | 2 | 3 | 4 |'), 'github');
    expect(data.headers).toEqual(['a', 'b', 'c', 'd']);
    expect(data.columnMeta.map(m => m.align)).toEqual(['default', 'left', 'right', 'center']);
    expect(data.rows).toEqual([['1', '2', '3', '4']]);
  });
});

describe('isAlignmentRow', () => {
  it('accepts colon markers', () => expect(isAlignmentRow('| - | - | -: |', '|')).toBe(true));
  it('accepts all four marker forms', () => expect(isAlignmentRow('| --- | :-- | --: | :-: |', '|')).toBe(true));
  it('rejects data', () => expect(isAlignmentRow('| a | -: |', '|')).toBe(false));
  it('rejects bare colons', () => expect(isAlignmentRow('| : | : |', '|')).toBe(false));
  it('rejects empty line', () => expect(isAlignmentRow('', '|')).toBe(false));
});

describe('github round-trip', () => {
  const format = (text: string) => {
    const src = lines(text);
    const data = parseTable(src, detectStyle(src));
    populateColumnMeta(data);
    return render(data, 'github');
  };

  it('preserves alignment and is idempotent', () => {
    const once = format('| aaaaa | bbbbb | ccccc |\n| - | - | -: |\n| v1 | v2 | 42.24 |');
    expect(once).toBe(
      '| aaaaa | bbbbb | ccccc |\n' +
      '| ----- | ----- | ----: |\n' +
      '| v1    | v2    | 42.24 |'
    );
    expect(format(once)).toBe(once);
  });

  it('is idempotent for a plain table', () => {
    const once = format('| c1 | c2 | c3 |\n| v1 | v2 | v3 |');
    expect(once).toBe('| c1 | c2 | c3 |\n| -- | -- | -- |\n| v1 | v2 | v3 |');
    expect(format(once)).toBe(once);
  });

  it('marks a detected-numeric column right and stays idempotent', () => {
    const once = format('| item | qty |\n| spam | 42 |\n| eggs | 451 |');
    expect(once).toBe(
      '| item | qty |\n' +
      '| ---- | --: |\n' +
      '| spam |  42 |\n' +
      '| eggs | 451 |'
    );
    expect(format(once)).toBe(once);
  });

  it('is idempotent with a blank leading column', () => {
    const once = format('|  | c2 | c3 |\n| v1 | v2 | v3 |');
    expect(once).toBe('|    | c2 | c3 |\n| -- | -- | -- |\n| v1 | v2 | v3 |');
    expect(format(once)).toBe(once);
  });
});

describe('parseTable - psql', () => {
  it('no leading pipe', () => {
    const data = parseTable(lines(' item | qty \n------+-----\n spam |  42 \n eggs | 451 '), 'psql');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });
});

describe('parseTable - jira', () => {
  it('double pipe header collapses to cells', () => {
    const data = parseTable(lines('|| item || qty ||\n| spam |  42 |'), 'jira');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });

  // "Format table to style" parses with the *target* style, so a jira source is
  // routinely handed to the parser under some other style name.
  it('jira source parsed under a different target style', () => {
    const data = parseTable(lines('|| item || qty ||\n| spam | 42 |'), 'github');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });
});

describe('parseTable - orgtbl', () => {
  it('cross in separator is skipped', () => {
    const data = parseTable(lines('| item | qty |\n|------+------|\n| spam | 42 |'), 'orgtbl');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows.length).toBe(1);
  });
});

describe('parseTable - rst', () => {
  it('two cols', () => {
    const data = parseTable(lines('=====  ===\nitem   qty\n=====  ===\nspam    42\neggs   451\n=====  ==='), 'rst');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
    expect(data.rows[1]).toEqual(['eggs', '451']);
  });

  it('right-aligned content trimmed', () => {
    const data = parseTable(lines('======  ===\n  item  qty\n======  ===\n  spam   42\n======  ==='), 'rst');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });

  it('insufficient separators throws', () => {
    expect(() => parseTable(lines('=====\nitem\n'), 'rst')).toThrow();
  });
});

describe('parseTable - asciidoc', () => {
  it('cols line is not phantom header', () => {
    const data = parseTable(lines('[cols="<4,>3",options="header"]\n|====\n| item | qty\n| spam |  42\n|===='), 'asciidoc');
    expect(data.headers).toEqual(['item', 'qty']);
  });

  it('data rows correct', () => {
    const data = parseTable(lines('[cols="<4,>3",options="header"]\n|====\n| item | qty\n| spam |  42\n| eggs | 451\n|===='), 'asciidoc');
    expect(data.rows[0]).toEqual(['spam', '42']);
    expect(data.rows[1]).toEqual(['eggs', '451']);
  });
});

describe('parseTable - box drawing styles', () => {
  it('modern/sharp - box drawing separators', () => {
    const data = parseTable(lines('│ item │ qty │\n├──────┼─────┤\n│ spam │  42 │'), 'sharp');
    expect(data.headers).toEqual(['item', 'qty']);
    expect(data.rows[0]).toEqual(['spam', '42']);
  });
});
