import { describe, it, expect } from 'vitest';
import { render, colWidths } from './render.js';
import { makeTableData } from './model.js';
import type { TableData } from './model.js';

function salesData(): TableData {
  const data = makeTableData(
    ['Month', 'Revenue', 'Units'],
    [['Jan', '12500.50', '342'], ['Feb', '13200.75', '389'], ['Mar', '15800.25', '421']]
  );
  const col1 = data.columnMeta[1];
  const col2 = data.columnMeta[2];
  if (col1) col1.isNumeric = true;
  if (col2) col2.isNumeric = true;
  return data;
}

function simpleData(): TableData {
  return makeTableData(['a', 'b'], [['1', '2'], ['3', '4']]);
}

describe('colWidths', () => {
  it('uses max of header and cell', () => {
    const data = makeTableData(['name', 'x'], [['longer', '1']]);
    expect(colWidths(data)).toEqual([6, 1]);
  });
});

describe('render github', () => {
  it('golden output', () => {
    expect(render(salesData(), 'github')).toBe(
      '| Month |  Revenue | Units |\n' +
      '| ----- | -------- | ----- |\n' +
      '| Jan   | 12500.50 |   342 |\n' +
      '| Feb   | 13200.75 |   389 |\n' +
      '| Mar   | 15800.25 |   421 |'
    );
  });

  it('delimiter row is padded like a content row', () => {
    expect(render(makeTableData(['c1', 'c2', 'c3'], [['v1', 'v2', 'v3']]), 'github')).toBe(
      '| c1 | c2 | c3 |\n' +
      '| -- | -- | -- |\n' +
      '| v1 | v2 | v3 |'
    );
  });

  it('emits alignment markers', () => {
    const data = makeTableData(
      ['aaaaa', 'bbbbb', 'ccccc'],
      [['v1', 'v2', '42.24']],
      ['left', 'center', 'right']
    );
    expect(render(data, 'github')).toBe(
      '| aaaaa | bbbbb | ccccc |\n' +
      '| :---- | :---: | ----: |\n' +
      '| v1    |  v2   | 42.24 |'
    );
  });

  it('widens narrow columns to fit their markers', () => {
    const data = makeTableData(['a', 'b'], [['1', '2']], ['right', 'center']);
    expect(render(data, 'github')).toBe(
      '|  a |  b  |\n' +
      '| -: | :-: |\n' +
      '|  1 |  2  |'
    );
  });

  it('explicit left alignment beats numeric detection', () => {
    const data = makeTableData(['value'], [['1'], ['22']], ['left']);
    const col = data.columnMeta[0];
    if (col) col.isNumeric = true;
    expect(render(data, 'github')).toBe(
      '| value |\n' +
      '| :---- |\n' +
      '| 1     |\n' +
      '| 22    |'
    );
  });

  it('numeric detection does not invent markers', () => {
    const data = makeTableData(['n'], [['1'], ['22']]);
    const col = data.columnMeta[0];
    if (col) col.isNumeric = true;
    expect(render(data, 'github')).toBe(
      '|  n |\n' +
      '| -- |\n' +
      '|  1 |\n' +
      '| 22 |'
    );
  });
});

describe('render psql', () => {
  it('golden output', () => {
    expect(render(salesData(), 'psql')).toBe(
      ' Month |  Revenue | Units \n' +
      '-------+----------+-------\n' +
      ' Jan   | 12500.50 |   342 \n' +
      ' Feb   | 13200.75 |   389 \n' +
      ' Mar   | 15800.25 |   421 '
    );
  });

  it('no outer pipes', () => {
    const lines = render(salesData(), 'psql').split('\n');
    expect(lines[0]).not.toMatch(/^\|/);
    expect(lines[1]).toContain('+');
  });
});

describe('render asciidoc', () => {
  it('golden output', () => {
    expect(render(salesData(), 'asciidoc')).toBe(
      '[cols="<5,>8,>5",options="header"]\n' +
      '|====\n' +
      '| Month | Revenue  | Units\n' +
      '| Jan   | 12500.50 |   342\n' +
      '| Feb   | 13200.75 |   389\n' +
      '| Mar   | 15800.25 |   421\n' +
      '|===='
    );
  });

  it('has [cols=] header', () => {
    expect(render(simpleData(), 'asciidoc').split('\n')[0]).toMatch(/^\[cols=/);
  });

  it('has |==== delimiters', () => {
    expect(render(simpleData(), 'asciidoc')).toContain('|====');
  });
});

describe('render jira', () => {
  it('golden output', () => {
    expect(render(salesData(), 'jira')).toBe(
      '|| Month || Revenue  || Units ||\n' +
      '| Jan   | 12500.50 |   342 |\n' +
      '| Feb   | 13200.75 |   389 |\n' +
      '| Mar   | 15800.25 |   421 |'
    );
  });

  it('header uses ||', () => {
    const out = render(simpleData(), 'jira');
    expect(out.split('\n')[0]).toMatch(/^\|\|/);
    expect(out.split('\n')[0]).toMatch(/\|\|$/);
  });

  it('data rows use single |', () => {
    const dataLine = render(simpleData(), 'jira').split('\n')[1];
    expect(dataLine).toMatch(/^\|/);
    expect(dataLine).not.toMatch(/^\|\|/);
  });
});

describe('render rst', () => {
  it('golden output', () => {
    expect(render(salesData(), 'rst')).toBe(
      '======= ========== =======\n' +
      ' Month    Revenue   Units \n' +
      '======= ========== =======\n' +
      ' Jan     12500.50     342 \n' +
      ' Feb     13200.75     389 \n' +
      ' Mar     15800.25     421 \n' +
      '======= ========== ======='
    );
  });

  it('has === separators', () => {
    const lines = render(simpleData(), 'rst').split('\n');
    expect(lines[0]).toMatch(/^=+/);
    expect(lines[2]).toMatch(/^=+/);
    expect(lines[lines.length - 1]).toMatch(/^=+/);
  });
});

describe('render rst-grid', () => {
  it('golden output', () => {
    expect(render(salesData(), 'rst-grid')).toBe(
      '+-------+----------+-------+\n' +
      '| Month |  Revenue | Units |\n' +
      '+=======+==========+=======+\n' +
      '| Jan   | 12500.50 |   342 |\n' +
      '+-------+----------+-------+\n' +
      '| Feb   | 13200.75 |   389 |\n' +
      '+-------+----------+-------+\n' +
      '| Mar   | 15800.25 |   421 |\n' +
      '+-------+----------+-------+'
    );
  });

  it('header sep uses =', () => {
    const lines = render(simpleData(), 'rst-grid').split('\n');
    expect(lines[2]).toContain('=');
  });
});

describe('render orgtbl', () => {
  it('golden output', () => {
    expect(render(salesData(), 'orgtbl')).toBe(
      '| Month |  Revenue | Units |\n' +
      '|-------+----------+-------|\n' +
      '| Jan   | 12500.50 |   342 |\n' +
      '| Feb   | 13200.75 |   389 |\n' +
      '| Mar   | 15800.25 |   421 |'
    );
  });

  it('sep uses + at crossings', () => {
    const sepLine = render(simpleData(), 'orgtbl').split('\n')[1];
    expect(sepLine).toMatch(/\+/);
    expect(sepLine).toMatch(/^\|/);
  });
});

describe('render ascii', () => {
  it('golden output', () => {
    expect(render(salesData(), 'ascii')).toBe(
      '+-------+----------+-------+\n' +
      '| Month |  Revenue | Units |\n' +
      '+-------+----------+-------+\n' +
      '| Jan   | 12500.50 |   342 |\n' +
      '+-------+----------+-------+\n' +
      '| Feb   | 13200.75 |   389 |\n' +
      '+-------+----------+-------+\n' +
      '| Mar   | 15800.25 |   421 |\n' +
      '+-------+----------+-------+'
    );
  });

  it('has + corners', () => {
    const firstLine = render(simpleData(), 'ascii').split('\n')[0];
    expect(firstLine).toMatch(/^\+/);
    expect(firstLine).toMatch(/\+$/);
  });
});

describe('render modern', () => {
  it('golden output', () => {
    expect(render(salesData(), 'modern')).toBe(
      '┌───────┬──────────┬───────┐\n' +
      '│ Month │  Revenue │ Units │\n' +
      '├───────┼──────────┼───────┤\n' +
      '│ Jan   │ 12500.50 │   342 │\n' +
      '├───────┼──────────┼───────┤\n' +
      '│ Feb   │ 13200.75 │   389 │\n' +
      '├───────┼──────────┼───────┤\n' +
      '│ Mar   │ 15800.25 │   421 │\n' +
      '└───────┴──────────┴───────┘'
    );
  });

  it('has row separators between data rows', () => {
    const innerSeps = render(simpleData(), 'modern').split('\n').filter(l => l.startsWith('├'));
    expect(innerSeps.length).toBeGreaterThanOrEqual(2);
  });
});

describe('render sharp', () => {
  it('golden output', () => {
    expect(render(salesData(), 'sharp')).toBe(
      '┌───────┬──────────┬───────┐\n' +
      '│ Month │  Revenue │ Units │\n' +
      '├───────┼──────────┼───────┤\n' +
      '│ Jan   │ 12500.50 │   342 │\n' +
      '│ Feb   │ 13200.75 │   389 │\n' +
      '│ Mar   │ 15800.25 │   421 │\n' +
      '└───────┴──────────┴───────┘'
    );
  });

  it('no row separators between data rows', () => {
    const innerSeps = render(simpleData(), 'sharp').split('\n').filter(l => l.startsWith('├'));
    expect(innerSeps.length).toBe(1);
  });
});

describe('render extended', () => {
  it('golden output', () => {
    expect(render(salesData(), 'extended')).toBe(
      '╔═══════╦══════════╦═══════╗\n' +
      '║ Month ║  Revenue ║ Units ║\n' +
      '╠═══════╬══════════╬═══════╣\n' +
      '║ Jan   ║ 12500.50 ║   342 ║\n' +
      '╠═══════╬══════════╬═══════╣\n' +
      '║ Feb   ║ 13200.75 ║   389 ║\n' +
      '╠═══════╬══════════╬═══════╣\n' +
      '║ Mar   ║ 15800.25 ║   421 ║\n' +
      '╚═══════╩══════════╩═══════╝'
    );
  });
});

describe('render heavy-outline', () => {
  it('golden output', () => {
    expect(render(salesData(), 'heavy-outline')).toBe(
      '┏━━━━━━━┳━━━━━━━━━━┳━━━━━━━┓\n' +
      '┃ Month ┃  Revenue ┃ Units ┃\n' +
      '┣━━━━━━━╋━━━━━━━━━━╋━━━━━━━┫\n' +
      '┃ Jan   ┃ 12500.50 ┃   342 ┃\n' +
      '┃ Feb   ┃ 13200.75 ┃   389 ┃\n' +
      '┃ Mar   ┃ 15800.25 ┃   421 ┃\n' +
      '┗━━━━━━━┻━━━━━━━━━━┻━━━━━━━┛'
    );
  });
});
