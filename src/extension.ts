import * as vscode from 'vscode';
import {
  formatSelection,
  prettifySelection,
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

function normalizeOutput(output: string, selectionEndsWithNewline: boolean): string {
  return selectionEndsWithNewline ? output : output.replace(/\n$/, '');
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('tablefmt.format', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selectionText = getSelectionText(editor);
      if (!selectionText) {
        void vscode.window.showErrorMessage(
          'tablefmt: No text selected. Select the data to format.'
        );
        return;
      }

      const sourceItems: Array<{ label: string; description: string; value: SourceFormat }> = [
        { label: 'CSV', description: 'Comma-separated values', value: 'csv' },
        { label: 'TSV', description: 'Tab-separated values', value: 'tsv' },
        { label: 'PSV', description: 'Pipe-separated values', value: 'psv' },
        { label: 'JSON', description: 'JSON array of objects', value: 'json' },
        { label: 'YAML', description: 'YAML sequence of mappings', value: 'yaml' },
        { label: 'TOML', description: 'TOML array of tables', value: 'toml' },
      ];

      const picked = await vscode.window.showQuickPick(sourceItems, {
        placeHolder: 'Select input format',
        title: 'tablefmt: Format Selection',
      });
      if (!picked) return;

      const cfg = getConfig();
      const result = await formatSelection(selectionText, {
        executablePath: cfg.executablePath,
        source: picked.value,
        style: cfg.defaultStyle,
      });

      const output = handleResult(result);
      if (!output) return;

      const finalOutput = normalizeOutput(output, selectionText.endsWith('\n'));
      await editor.edit((b) => b.replace(editor.selection, finalOutput));
    }),

    vscode.commands.registerCommand('tablefmt.prettify', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selectionText = getSelectionText(editor);
      if (!selectionText) {
        void vscode.window.showErrorMessage(
          'tablefmt: No text selected. Select the table to prettify.'
        );
        return;
      }

      const cfg = getConfig();
      const result = await prettifySelection(selectionText, {
        executablePath: cfg.executablePath,
        style: cfg.defaultStyle,
      });

      const output = handleResult(result);
      if (!output) return;

      const finalOutput = normalizeOutput(output, selectionText.endsWith('\n'));
      await editor.edit((b) => b.replace(editor.selection, finalOutput));
    })
  );
}

export function deactivate(): void {}
