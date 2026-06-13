# tablefmt for VS Code

Format and prettify tables in your editor using the [tablefmt](https://github.com/tadams42/tablefmt) CLI.

## Requirements

`tablefmt` must be available on PATH. Install it from [GitHub releases](https://github.com/tadams42/tablefmt/releases) or via `cargo install tablefmt`.

If VS Code is launched from a desktop shortcut and cannot see your shell PATH, set an absolute path via the `tablefmt.executablePath` setting.

## Commands

All commands are available in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and in the right-click context menu.

| Command | Description |
|---|---|
| `tablefmt: Format selection as table` | Convert selected CSV/TSV/PSV/JSON/YAML/TOML data into a formatted table using `defaultStyle`. Prompts for input format. |
| `tablefmt: Format selection as table with style` | Same as above, but also prompts for output style interactively. |
| `tablefmt: Prettify table at cursor (re-align columns)` | Re-align columns of the table at the cursor (or at the start of the selection). |
| `tablefmt: Add column before cursor` | Insert a blank column before the column at the cursor position. |
| `tablefmt: Add column after cursor` | Insert a blank column after the column at the cursor position. |
| `tablefmt: Remove column at cursor` | Remove the column at the cursor position. |

**Tip:** For the cursor-based commands, if you have text selected the first line of the selection is used to locate the table — useful when your cursor lands outside the table after selecting.

## Settings

| Setting | Default | Description |
|---|---|---|
| `tablefmt.executablePath` | `"tablefmt"` | Path to the `tablefmt` binary |
| `tablefmt.defaultStyle` | `"github"` | Output table style used by the Format command |

Available styles: `github`, `psql`, `asciidoc`, `jira`, `rst`, `rst-grid`, `orgtbl`, `dots`, `ascii`, `modern`, `sharp`, `extended`, `heavy-outline`.
