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

**`src/table/model.ts`** — `TableData` and `ColumnMeta` interfaces; `Align` union (`default`/`left`/`center`/`right`); `makeTableData` factory and `effectiveAlign` (explicit alignment wins over numeric detection).

**`src/table/numeric.ts`** — `populateColumnMeta`: detects numeric columns (all non-empty cells pass `Number.isFinite`) and sets `isNumeric` on each `ColumnMeta`.

**`src/table/prettify.ts`** — `preprocess` / `postprocess` / `bareLine`: strips comment prefixes (`///`, `//`, `#`, `*`) and indentation before formatting, restores them after. The prefix is the *common* indent, not the deepest: `psql` and `rst` pad their first column with a space, and treating that as indentation made every reformat drift the table rightwards. Indent beyond the common prefix stays on the bare line so RST's character-offset cell slicing still lines up. Ported from `prettify.rs`.

**`src/table/tableParser.ts`** — `detectStyle` (12-step cascade), `parseTable`, `isAlignmentRow`. Handles pipe-style tables (all styles except `rst`), RST simple tables, and AsciiDoc `[cols=...]` attribute lines. `splitCells` drops only the framing separators, so interior/leading/trailing empty cells survive; markdown delimiter rows carrying `:` markers are recognised as structure and their alignments stored on `ColumnMeta`.

**`src/table/dataParser.ts`** — `detectDelimiter` (counts `|`, `;`, `,`, tab outside double-quoted fields; returns highest) and `parseDelimited` for raw delimited data, with CSV-style quoting (`"a, b"`, `""` escape, quoted newlines become spaces).

**`src/table/render.ts`** — `render(data, style)`: all 12 style renderers. Eight styles use a generic `GridSpec` parameterized renderer; `github`, `jira`, `asciidoc`, and `rst` have custom renderers. Column widths use `[...str].length` for Unicode correctness. Numeric columns are right-aligned in both header and data rows unless the source declared an explicit alignment. The `github` renderer pads its delimiter row like a content row and emits `:` markers for both declared alignments and the right-alignment inferred for numeric columns, so a rendered preview matches the padding in the raw text.

**`src/table/locate.ts`** — `findTableBounds` and `findDataLineBounds`: cursor-based table and data region detection when no selection is active.

**`src/table/edit.ts`** — `findColumnAtCursor`, `addColumn`, `removeColumn`: column editing operations.

**`src/table/format.ts`** — `formatTable(text, targetStyle)`, `formatDelimited(text, style)` and `editTable(text, op)`: the whole pipeline (preprocess → detect → parse → column meta → render → postprocess) as pure functions that throw on bad input. A table is always parsed with its *detected* style; `targetStyle` only picks the output. This is the single copy of the pipeline — keeping it out of `extension.ts` is what makes the conversion matrix and the column-edit path testable.

**`src/extension.ts`** — VS Code integration layer. Reads config (`tablefmt.defaultStyle`), registers the 7 commands, turns thrown errors into `vscode.window.showErrorMessage`, and applies edits to the active editor. No `child_process` usage.

The build toolchain is esbuild (configured in `esbuild.mjs`), which bundles `src/extension.ts` into `dist/extension.js` as CJS targeting Node. TypeScript is used only for type-checking (`tsc --noEmit`); esbuild does the actual transpilation. The `vscode` module is marked external so it isn't bundled.
