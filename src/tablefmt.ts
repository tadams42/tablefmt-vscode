import { spawn } from 'child_process';

export type SourceFormat = 'csv' | 'tsv' | 'psv' | 'json' | 'yaml' | 'toml';

export type OutputStyle =
  | 'github'
  | 'psql'
  | 'asciidoc'
  | 'jira'
  | 'rst'
  | 'rst-grid'
  | 'orgtbl'
  | 'dots'
  | 'ascii'
  | 'modern'
  | 'sharp'
  | 'extended'
  | 'heavy-outline';

export type TablefmtResult =
  | { ok: true; output: string }
  | { ok: false; kind: 'not-found'; executablePath: string }
  | { ok: false; kind: 'nonzero'; exitCode: number; stderr: string }
  | { ok: false; kind: 'spawn-error'; message: string };

export interface EditResult {
  startLine: number;
  endLine: number;
  text: string;
  style: string;
}

export type EditCommandResult =
  | { ok: true; result: EditResult }
  | { ok: false; kind: 'not-found'; executablePath: string }
  | { ok: false; kind: 'error'; message: string }
  | { ok: false; kind: 'spawn-error'; message: string };

export interface FormatOptions {
  executablePath: string;
  source: SourceFormat;
  style: OutputStyle;
}

function runTablefmt(
  args: string[],
  input: string,
  executablePath: string
): Promise<TablefmtResult> {
  return new Promise((resolve) => {
    let stdoutBuf = '';
    let stderrBuf = '';
    let spawnErrored = false;

    const child = spawn(executablePath, args, { shell: false });

    child.on('error', (err: NodeJS.ErrnoException) => {
      spawnErrored = true;
      if (err.code === 'ENOENT') {
        resolve({ ok: false, kind: 'not-found', executablePath });
      } else {
        resolve({ ok: false, kind: 'spawn-error', message: err.message });
      }
    });

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString('utf8');
    });

    child.on('close', (code: number | null) => {
      if (spawnErrored) return;
      if (code !== 0) {
        resolve({
          ok: false,
          kind: 'nonzero',
          exitCode: code ?? -1,
          stderr: stderrBuf.trim(),
        });
      } else {
        resolve({ ok: true, output: stdoutBuf });
      }
    });

    child.stdin.write(input, 'utf8');
    child.stdin.end();
  });
}

function runEditCommand(args: string[], executablePath: string): Promise<EditCommandResult> {
  return new Promise((resolve) => {
    let stdoutBuf = '';
    let spawnErrored = false;

    const child = spawn(executablePath, args, { shell: false });

    child.on('error', (err: NodeJS.ErrnoException) => {
      spawnErrored = true;
      if (err.code === 'ENOENT') {
        resolve({ ok: false, kind: 'not-found', executablePath });
      } else {
        resolve({ ok: false, kind: 'spawn-error', message: err.message });
      }
    });

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBuf += chunk.toString('utf8');
    });

    child.on('close', (code: number | null) => {
      if (spawnErrored) return;
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(stdoutBuf) as Record<string, unknown>;
      } catch {
        resolve({
          ok: false,
          kind: 'error',
          message: `tablefmt returned non-JSON output: ${stdoutBuf.trim()}`,
        });
        return;
      }
      if (code !== 0) {
        resolve({
          ok: false,
          kind: 'error',
          message: typeof parsed['error'] === 'string' ? parsed['error'] : 'unknown error',
        });
        return;
      }
      resolve({
        ok: true,
        result: {
          startLine: parsed['start_line'] as number,
          endLine: parsed['end_line'] as number,
          text: parsed['text'] as string,
          style: parsed['style'] as string,
        },
      });
    });

    child.stdin.end();
  });
}

export function formatSelection(
  input: string,
  opts: FormatOptions
): Promise<TablefmtResult> {
  return runTablefmt(
    ['format', '--source', opts.source, '--style', opts.style, '--max-rows', '0'],
    input,
    opts.executablePath
  );
}

export function editPrettify(
  executablePath: string,
  filePath: string,
  line: number,
  decimalPlaces?: number
): Promise<EditCommandResult> {
  const args = ['edit', 'prettify', filePath, '--line', String(line)];
  if (decimalPlaces !== undefined) {
    args.push('--decimal-places', String(decimalPlaces));
  }
  return runEditCommand(args, executablePath);
}

export function addColumnBefore(
  executablePath: string,
  filePath: string,
  line: number,
  col: number
): Promise<EditCommandResult> {
  return runEditCommand(
    ['edit', 'add-column-before', filePath, '--line', String(line), '--col', String(col)],
    executablePath
  );
}

export function addColumnAfter(
  executablePath: string,
  filePath: string,
  line: number,
  col: number
): Promise<EditCommandResult> {
  return runEditCommand(
    ['edit', 'add-column-after', filePath, '--line', String(line), '--col', String(col)],
    executablePath
  );
}

export function removeColumn(
  executablePath: string,
  filePath: string,
  line: number,
  col: number
): Promise<EditCommandResult> {
  return runEditCommand(
    ['edit', 'remove-column', filePath, '--line', String(line), '--col', String(col)],
    executablePath
  );
}
