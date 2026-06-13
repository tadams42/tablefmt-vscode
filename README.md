# tablefmt for VS Code

Format and prettify tables in your editor using the [tablefmt](https://github.com/tadamic/tablefmt) CLI.

## Requirements

`tablefmt` must be available on PATH. Install it from [GitHub releases](https://github.com/tadamic/tablefmt/releases) or via `cargo install tablefmt`.

## Commands

| Command | Description |
|---|---|
| `tablefmt: Format selection as table` | Convert selected CSV/TSV/PSV/JSON/YAML/TOML data into a formatted table |
| `tablefmt: Prettify selected table (re-align columns)` | Re-render a selected ASCII table |

Both commands appear in the Command Palette and in the right-click context menu when text is selected.

## Settings

| Setting | Default | Description |
|---|---|---|
| `tablefmt.executablePath` | `"tablefmt"` | Path to the `tablefmt` binary |
| `tablefmt.defaultStyle` | `"github"` | Output table style |

Available styles: `github`, `psql`, `asciidoc`, `jira`, `rst`, `rst-grid`, `reddit`, `table-el`, `orgtbl`, `dots`, `ascii`, `modern`, `sharp`, `extended`, `heavy-outline`.

> **Note for Prettify:** the existing table must already be in `defaultStyle` format, since the style controls both input parsing and output rendering.
