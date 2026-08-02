import * as vscode from 'vscode';
import type { OutputStyle, TableData } from './table/index.js';
import {
  ALL_STYLES,
  formatTable, formatDelimited, editTable,
  findTableBounds, findDataLineBounds,
  findColumnAtCursor, addColumn, removeColumn,
} from './table/index.js';

function getDefaultStyle(): OutputStyle {
  return vscode.workspace.getConfiguration('tablefmt').get<OutputStyle>('defaultStyle', 'github');
}

const STYLE_ITEMS = ALL_STYLES.map(s => ({ label: s, value: s }));

async function pickStyle(title: string): Promise<OutputStyle | undefined> {
  const picked = await vscode.window.showQuickPick(STYLE_ITEMS, {
    placeHolder: 'Select output style',
    title,
  });
  return picked?.value;
}

function showError(msg: string): void {
  void vscode.window.showErrorMessage(`tablefmt: ${msg}`);
}

// ─── Range helpers ────────────────────────────────────────────────────────────

function lineRange(doc: vscode.TextDocument, startLine: number, endLine: number): vscode.Range {
  const end = doc.lineAt(endLine).range.end;
  return new vscode.Range(startLine, 0, endLine, end.character);
}

interface TextWithRange {
  text: string;
  range: vscode.Range;
}

function selectionOrNull(editor: vscode.TextEditor): TextWithRange | null {
  if (!editor.selection.isEmpty) {
    return { text: editor.document.getText(editor.selection), range: editor.selection };
  }
  return null;
}

function resolveForFormat(editor: vscode.TextEditor): TextWithRange | null {
  const sel = selectionOrNull(editor);
  if (sel) return sel;

  const allLines = editor.document.getText().split('\n');
  const cursorLine = editor.selection.active.line;
  try {
    const [start, end] = findTableBounds(allLines, cursorLine);
    const range = lineRange(editor.document, start, end);
    return { text: editor.document.getText(range), range };
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    return null;
  }
}

function resolveForData(editor: vscode.TextEditor): TextWithRange | null {
  const sel = selectionOrNull(editor);
  if (sel) return sel;

  const allLines = editor.document.getText().split('\n');
  const cursorLine = editor.selection.active.line;
  const bounds = findDataLineBounds(allLines, cursorLine);
  if (!bounds) {
    showError('No pipe-delimited data found around cursor. Select the data rows first.');
    return null;
  }
  const [start, end] = bounds;
  const range = lineRange(editor.document, start, end);
  return { text: editor.document.getText(range), range };
}

// ─── Core operation helpers ───────────────────────────────────────────────────

// Reports the failure to the user and yields null, so callers can bail out.
function attempt(fn: () => string): string | null {
  try {
    return fn();
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    return null;
  }
}

async function applyOutput(
  editor: vscode.TextEditor,
  range: vscode.Range,
  output: string,
  originalEndsWithNewline: boolean
): Promise<void> {
  const final = originalEndsWithNewline ? output : output.replace(/\n$/, '');
  await editor.edit(b => b.replace(range, final));
}

// ─── Edit command pipeline (for add/remove column) ────────────────────────────

function runEditCommand(
  editor: vscode.TextEditor,
  op: (data: TableData, colIdx: number) => TableData
): void {
  const allLines = editor.document.getText().split('\n');
  const cursor = editor.selection.active;
  let start: number, end: number;
  try {
    [start, end] = findTableBounds(allLines, cursor.line);
  } catch (e) {
    showError(e instanceof Error ? e.message : String(e));
    return;
  }

  const range = lineRange(editor.document, start, end);
  const text = editor.document.getText(range);
  const colIdx = findColumnAtCursor(allLines[cursor.line] ?? '', cursor.character);

  const output = attempt(() => editTable(text, data => op(data, colIdx)));
  if (!output) return;
  void editor.edit(b => b.replace(range, output));
}

// ─── Extension activation ─────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('tablefmt.dataToTable', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const resolved = resolveForData(editor);
      if (!resolved) return;
      const output = attempt(() => formatDelimited(resolved.text, getDefaultStyle()));
      if (!output) return;
      await applyOutput(editor, resolved.range, output, resolved.text.endsWith('\n'));
    }),

    vscode.commands.registerCommand('tablefmt.dataToTableStyle', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const style = await pickStyle('tablefmt: Data to table with style');
      if (!style) return;
      const resolved = resolveForData(editor);
      if (!resolved) return;
      const output = attempt(() => formatDelimited(resolved.text, style));
      if (!output) return;
      await applyOutput(editor, resolved.range, output, resolved.text.endsWith('\n'));
    }),

    vscode.commands.registerCommand('tablefmt.formatTable', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const resolved = resolveForFormat(editor);
      if (!resolved) return;
      const output = attempt(() => formatTable(resolved.text, null));
      if (!output) return;
      await applyOutput(editor, resolved.range, output, resolved.text.endsWith('\n'));
    }),

    vscode.commands.registerCommand('tablefmt.formatTableToStyle', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const style = await pickStyle('tablefmt: Format table to style');
      if (!style) return;
      const resolved = resolveForFormat(editor);
      if (!resolved) return;
      const output = attempt(() => formatTable(resolved.text, style));
      if (!output) return;
      await applyOutput(editor, resolved.range, output, resolved.text.endsWith('\n'));
    }),

    vscode.commands.registerCommand('tablefmt.addColumnBefore', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      runEditCommand(editor, (data, colIdx) => addColumn(data, colIdx));
    }),

    vscode.commands.registerCommand('tablefmt.addColumnAfter', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      runEditCommand(editor, (data, colIdx) => addColumn(data, colIdx + 1));
    }),

    vscode.commands.registerCommand('tablefmt.removeColumn', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      runEditCommand(editor, (data, colIdx) => removeColumn(data, colIdx));
    })
  );
}

export function deactivate(): void {}
