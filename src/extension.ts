import * as vscode from 'vscode';
import {
  formatSelection,
  formatSelectionWithDelimiter,
  editPrettify,
  addColumnBefore,
  addColumnAfter,
  removeColumn,
  EditCommandResult,
  OutputStyle,
  SourceFormat,
  TablefmtResult,
} from './tablefmt.js';

function getConfig(): { executablePath: string; defaultStyle: OutputStyle } {
  const cfg = vscode.workspace.getConfiguration('tablefmt');
  return {
    executablePath: cfg.get<string>('executablePath', 'tablefmt'),
    defaultStyle: cfg.get<OutputStyle>('defaultStyle', 'github'),
  };
}

function getSelectionText(editor: vscode.TextEditor): string | undefined {
  const text = editor.document.getText(editor.selection);
  return text.length > 0 ? text : undefined;
}

function handleResult(result: TablefmtResult): string | undefined {
  if (result.ok) {
    return result.output;
  }
  switch (result.kind) {
    case 'not-found':
      void vscode.window.showErrorMessage(
        `tablefmt: binary not found at "${result.executablePath}". Install tablefmt and add it to PATH, or set tablefmt.executablePath in settings.`
      );
      break;
    case 'nonzero':
      void vscode.window.showErrorMessage(
        `tablefmt: exited with code ${result.exitCode}: ${result.stderr}`
      );
      break;
    case 'spawn-error':
      void vscode.window.showErrorMessage(`tablefmt: failed to run: ${result.message}`);
      break;
  }
  return undefined;
}

function handleEditResult(result: EditCommandResult): import('./tablefmt.js').EditResult | undefined {
  if (result.ok) {
    return result.result;
  }
  switch (result.kind) {
    case 'not-found':
      void vscode.window.showErrorMessage(
        `tablefmt: binary not found at "${result.executablePath}". Install tablefmt and add it to PATH, or set tablefmt.executablePath in settings.`
      );
      break;
    case 'error':
    case 'spawn-error':
      void vscode.window.showErrorMessage(`tablefmt: ${result.message}`);
      break;
  }
  return undefined;
}

async function applyEditResult(
  editor: vscode.TextEditor,
  result: import('./tablefmt.js').EditResult
): Promise<void> {
  const endPos = editor.document.lineAt(result.endLine).range.end;
  const range = new vscode.Range(result.startLine, 0, endPos.line, endPos.character);
  await editor.edit((b) => b.replace(range, result.text));
}

function normalizeOutput(output: string, selectionEndsWithNewline: boolean): string {
  return selectionEndsWithNewline ? output : output.replace(/\n$/, '');
}

const SOURCE_ITEMS: Array<{ label: string; description: string; value: SourceFormat }> = [
  { label: 'CSV', description: 'Comma-separated values', value: 'csv' },
  { label: 'TSV', description: 'Tab-separated values', value: 'tsv' },
  { label: 'PSV', description: 'Pipe-separated values', value: 'psv' },
  { label: 'JSON', description: 'JSON array of objects', value: 'json' },
  { label: 'YAML', description: 'YAML sequence of mappings', value: 'yaml' },
  { label: 'TOML', description: 'TOML array of tables', value: 'toml' },
];

const STYLE_ITEMS: Array<{ label: string; value: OutputStyle }> = [
  { label: 'github', value: 'github' },
  { label: 'psql', value: 'psql' },
  { label: 'asciidoc', value: 'asciidoc' },
  { label: 'jira', value: 'jira' },
  { label: 'rst', value: 'rst' },
  { label: 'rst-grid', value: 'rst-grid' },
  { label: 'orgtbl', value: 'orgtbl' },
  { label: 'dots', value: 'dots' },
  { label: 'ascii', value: 'ascii' },
  { label: 'modern', value: 'modern' },
  { label: 'sharp', value: 'sharp' },
  { label: 'extended', value: 'extended' },
  { label: 'heavy-outline', value: 'heavy-outline' },
];

async function runFormatCommand(
  style: OutputStyle | undefined,
  source?: SourceFormat
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selectionText = getSelectionText(editor);
  if (!selectionText) {
    void vscode.window.showErrorMessage(
      'tablefmt: No text selected. Select the data to format.'
    );
    return;
  }

  if (source === undefined) {
    const picked = await vscode.window.showQuickPick(SOURCE_ITEMS, {
      placeHolder: 'Select input format',
      title: 'tablefmt: Format Selection',
    });
    if (!picked) return;
    source = picked.value;
  }

  if (style === undefined) {
    const pickedStyle = await vscode.window.showQuickPick(STYLE_ITEMS, {
      placeHolder: 'Select output style',
      title: 'tablefmt: Format Selection',
    });
    if (!pickedStyle) return;
    style = pickedStyle.value;
  }

  const cfg = getConfig();
  const result = await formatSelection(selectionText, {
    executablePath: cfg.executablePath,
    source,
    style,
  });

  const output = handleResult(result);
  if (!output) return;

  const finalOutput = normalizeOutput(output, selectionText.endsWith('\n'));
  await editor.edit((b) => b.replace(editor.selection, finalOutput));
}

async function runFormatWithDelimiterCommand(style: OutputStyle): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const selectionText = getSelectionText(editor);
  if (!selectionText) {
    void vscode.window.showErrorMessage(
      'tablefmt: No text selected. Select the data to format.'
    );
    return;
  }

  const delimiter = await vscode.window.showInputBox({
    title: 'tablefmt: Format Selection',
    prompt: 'Enter delimiter character',
    placeHolder: 'e.g. ; or |',
    validateInput: (v) => (v.length === 1 ? undefined : 'Enter a single character'),
  });
  if (delimiter === undefined) return;

  const cfg = getConfig();
  const result = await formatSelectionWithDelimiter(selectionText, {
    executablePath: cfg.executablePath,
    delimiter,
    style,
  });

  const output = handleResult(result);
  if (!output) return;

  const finalOutput = normalizeOutput(output, selectionText.endsWith('\n'));
  await editor.edit((b) => b.replace(editor.selection, finalOutput));
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('tablefmt.formatPsv', () => {
      return runFormatCommand(getConfig().defaultStyle, 'psv');
    }),

    vscode.commands.registerCommand('tablefmt.formatCsv', () => {
      return runFormatCommand(getConfig().defaultStyle, 'csv');
    }),

    vscode.commands.registerCommand('tablefmt.formatTsv', () => {
      return runFormatCommand(getConfig().defaultStyle, 'tsv');
    }),

    vscode.commands.registerCommand('tablefmt.formatCustomDelimiter', () => {
      return runFormatWithDelimiterCommand(getConfig().defaultStyle);
    }),

    vscode.commands.registerCommand('tablefmt.formatWithStyle', () => {
      return runFormatCommand(undefined);
    }),

    vscode.commands.registerCommand('tablefmt.prettify', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      if (editor.document.isUntitled) {
        void vscode.window.showErrorMessage(
          'tablefmt: Save the file before prettifying a table.'
        );
        return;
      }

      const cfg = getConfig();
      const line = editor.selection.start.line;
      const filePath = editor.document.uri.fsPath;

      const result = await editPrettify(cfg.executablePath, filePath, line);
      const editResult = handleEditResult(result);
      if (!editResult) return;

      await applyEditResult(editor, editResult);
    }),

    vscode.commands.registerCommand('tablefmt.addColumnBefore', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      if (editor.document.isUntitled) {
        void vscode.window.showErrorMessage(
          'tablefmt: Save the file before editing a table.'
        );
        return;
      }

      const cfg = getConfig();
      const line = editor.selection.start.line;
      const col = editor.selection.active.character;
      const filePath = editor.document.uri.fsPath;

      const result = await addColumnBefore(cfg.executablePath, filePath, line, col);
      const editResult = handleEditResult(result);
      if (!editResult) return;

      await applyEditResult(editor, editResult);
    }),

    vscode.commands.registerCommand('tablefmt.addColumnAfter', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      if (editor.document.isUntitled) {
        void vscode.window.showErrorMessage(
          'tablefmt: Save the file before editing a table.'
        );
        return;
      }

      const cfg = getConfig();
      const line = editor.selection.start.line;
      const col = editor.selection.active.character;
      const filePath = editor.document.uri.fsPath;

      const result = await addColumnAfter(cfg.executablePath, filePath, line, col);
      const editResult = handleEditResult(result);
      if (!editResult) return;

      await applyEditResult(editor, editResult);
    }),

    vscode.commands.registerCommand('tablefmt.removeColumn', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      if (editor.document.isUntitled) {
        void vscode.window.showErrorMessage(
          'tablefmt: Save the file before editing a table.'
        );
        return;
      }

      const cfg = getConfig();
      const line = editor.selection.start.line;
      const col = editor.selection.active.character;
      const filePath = editor.document.uri.fsPath;

      const result = await removeColumn(cfg.executablePath, filePath, line, col);
      const editResult = handleEditResult(result);
      if (!editResult) return;

      await applyEditResult(editor, editResult);
    })
  );
}

export function deactivate(): void {}
