# Changelog

## [0.2.1]

- Improve VS Code Marketplace visibility: better display name, description, and keywords
- Add extension icon (Fluent UI `table_simple`, white on blue)
- Add dark gallery banner

## [0.2.0]

Complete rewrite — no external binary required.

- Drop dependency on the `tablefmt` CLI binary; all table logic is now implemented in TypeScript
- New command set (replaces the previous 9 commands):
  - `tablefmt: Data to table` — auto-detect delimiter, format with default style
  - `tablefmt: Data to table with style` — prompt for style first, then format
  - `tablefmt: Format table` — detect existing table style, re-align columns in place
  - `tablefmt: Format table to style` — re-render table in a chosen style
  - `tablefmt: Add column before cursor`
  - `tablefmt: Add column after cursor`
  - `tablefmt: Remove column at cursor`
- All format/prettify commands work both on a selection and without one (auto-finds table bounds around cursor)
- Numeric columns are right-aligned automatically
- Tables inside code comments (`//`, `#`, `*`, `///`) are supported — prefixes are stripped before formatting and restored after
- Remove `tablefmt.executablePath` setting (no longer needed)
- Add Vitest unit test suite (131 tests, golden output verified against the Rust binary)

## [0.1.1]

- Fix publisher info in marketplace URLs

## [0.1.0]

- Initial release
- `tablefmt: Format selection as table` command
- `tablefmt: Prettify selected table (re-align columns)` command
- `tablefmt.executablePath` and `tablefmt.defaultStyle` settings
- Context menu entries when text is selected
