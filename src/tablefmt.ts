import { spawn } from 'child_process';

export type SourceFormat = 'csv' | 'tsv' | 'psv' | 'json' | 'yaml' | 'toml';

export type OutputStyle =
  | 'github'
  | 'psql'
  | 'asciidoc'
  | 'jira'
  | 'rst'
  | 'rst-grid'
  | 'reddit'
  | 'table-el'
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

export interface FormatOptions {
  executablePath: string;
  source: SourceFormat;
  style: OutputStyle;
}

export interface PrettifyOptions {
  executablePath: string;
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

export function prettifySelection(
  input: string,
  opts: PrettifyOptions
): Promise<TablefmtResult> {
  return runTablefmt(['prettify', '--style', opts.style], input, opts.executablePath);
}
