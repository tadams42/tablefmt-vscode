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

# Run unit tests
npm test
```

Unit tests run via Vitest (`npm test`). Manual testing is done by pressing F5 in VS Code, which launches an Extension Development Host using the `"Run Extension"` launch configuration (`.vscode/launch.json`). That config starts the esbuild watcher via the `"esbuild watch"` task before attaching.

## Architecture

The extension has no external binary dependency. All table logic is implemented in TypeScript under `src/table/`:

**`src/table/types.ts`** — `OutputStyle` union type (12 styles) and `ALL_STYLES` array.

**`src/table/model.ts`** — `TableData` and `ColumnMeta` interfaces; `makeTableData` factory.

**`src/table/numeric.ts`** — `populateColumnMeta`: detects numeric columns (all non-empty cells pass `Number.isFinite`) and sets `isNumeric` on each `ColumnMeta`.

**`src/table/prettify.ts`** — `preprocess` / `postprocess` / `bareLine`: strips comment prefixes (`///`, `//`, `#`, `*`) before formatting and restores them after. Ported from `prettify.rs`.

**`src/table/tableParser.ts`** — `detectStyle` (12-step cascade) and `parseTable`. Handles pipe-style tables (all styles except `rst`), RST simple tables, and AsciiDoc `[cols=...]` attribute lines.

**`src/table/dataParser.ts`** — `detectDelimiter` (counts `|`, `;`, `,`, tab; returns highest) and `parseDelimited` for raw delimited data.

**`src/table/render.ts`** — `render(data, style)`: all 12 style renderers. Nine styles use a generic `GridSpec` parameterized renderer; `jira`, `asciidoc`, and `rst` have custom renderers. Column widths use `[...str].length` for Unicode correctness. Numeric columns are right-aligned in both header and data rows.

**`src/table/locate.ts`** — `findTableBounds` and `findDataLineBounds`: cursor-based table and data region detection when no selection is active.

**`src/table/edit.ts`** — `findColumnAtCursor`, `addColumn`, `removeColumn`: column editing operations.

**`src/extension.ts`** — VS Code integration layer. Reads config (`tablefmt.defaultStyle`), registers the 7 commands, handles errors via `vscode.window.showErrorMessage`, and applies edits to the active editor. No `child_process` usage.

The build toolchain is esbuild (configured in `esbuild.mjs`), which bundles `src/extension.ts` into `dist/extension.js` as CJS targeting Node. TypeScript is used only for type-checking (`tsc --noEmit`); esbuild does the actual transpilation. The `vscode` module is marked external so it isn't bundled.
