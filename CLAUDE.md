# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tooling

Use `fnm` to manage Node environment.

## Commands

```bash
# Type-check without emitting
npm run compile

# Bundle extension (outputs to dist/extension.js)
npm run bundle

# Bundle in watch mode (for iterative development)
npm run bundle:watch

# Bundle minified for publishing
npm run vscode:prepublish

# Package as .vsix
npx vsce package
```

There are no automated tests. Manual testing is done by pressing F5 in VS Code, which launches an Extension Development Host using the `"Run Extension"` launch configuration (`.vscode/launch.json`). That config starts the esbuild watcher via the `"esbuild watch"` task before attaching.

## Architecture

This is a VS Code extension with two source files:

**`src/tablefmt.ts`** — pure Node.js layer. No VS Code API. Wraps the external `tablefmt` CLI binary via `child_process.spawn`. Exports two families of functions:
- `formatSelection` / `formatSelectionWithDelimiter` — pipe selected text to `tablefmt format` via stdin, return stdout as the formatted table.
- `editPrettify` / `addColumnBefore` / `addColumnAfter` / `removeColumn` — invoke `tablefmt edit <subcommand>` with a file path and cursor position; the CLI returns a JSON object `{ start_line, end_line, text, style }` describing the replacement range and new content.

Result types use a discriminated union (`ok: true/false`) rather than exceptions. Two separate result types: `TablefmtResult` for format commands (stdout as string) and `EditCommandResult` for edit commands (parsed JSON).

**`src/extension.ts`** — VS Code integration layer. Reads config (`tablefmt.executablePath`, `tablefmt.defaultStyle`), registers all commands, handles errors by calling `vscode.window.showErrorMessage`, and applies edits to the active editor.

The build toolchain is esbuild (configured in `esbuild.mjs`), which bundles `src/extension.ts` into `dist/extension.js` as CJS targeting Node. TypeScript is used only for type-checking (`tsc --noEmit`); esbuild does the actual transpilation. The `vscode` module is marked external so it isn't bundled.

## Key design constraint

The `edit` subcommand family works on saved files (the CLI reads the file from disk), so those commands check `editor.document.isUntitled` and refuse to run if the file hasn't been saved yet. The `format` subcommand family pipes selected text via stdin and has no such restriction.
