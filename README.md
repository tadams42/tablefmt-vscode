# tablefmt for VS Code

Format and prettify tables in your editor.

<video src="https://github.com/user-attachments/assets/4c553478-f818-492f-8fc6-5779ac6c5f7b" autoplay loop muted playsinline width="100%">
</video>

## Commands

All commands are available in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and in the right-click context menu.

| Command | Description |
|---|---|
| `tablefmt: Data to table` | Auto-detect delimiter (`\|`, `;`, `,`, tab) in selected text (or lines around cursor), parse as tabular data, format with `defaultStyle`. |
| `tablefmt: Data to table with style` | Prompts for output style, then same as above. |
| `tablefmt: Format table` | Detect existing table style, re-align columns in place. Works on selection or finds the table around the cursor automatically. |
| `tablefmt: Format table to style` | Prompts for output style, then re-renders the table in the new style. |
| `tablefmt: Add column before cursor` | Insert a blank column before the column at the cursor position. |
| `tablefmt: Add column after cursor` | Insert a blank column after the column at the cursor position. |
| `tablefmt: Remove column at cursor` | Remove the column at the cursor position. |

**With selection:** the selected text is used as input.

**Without selection:** the extension searches for table content around the current cursor line automatically. "Data to table" looks for contiguous lines containing `|`; "Format table" detects any supported style.

## Settings

| Setting | Default | Description |
|---|---|---|
| `tablefmt.defaultStyle` | `"github"` | Output style used by "Data to table" |

Available styles: `github`, `psql`, `asciidoc`, `jira`, `rst`, `rst-grid`, `orgtbl`, `ascii`, `modern`, `sharp`, `extended`, `heavy-outline`.

## Output styles

### `github` — GitHub-flavored Markdown (default)

```
| Month |  Revenue | Units |
|-------|----------|-------|
| Jan   | 12500.50 |   342 |
| Feb   | 13200.75 |   389 |
| Mar   | 15800.25 |   421 |
```

### `psql` — PostgreSQL `\pset border 2` style

```
 Month |  Revenue | Units
-------+----------+-------
 Jan   | 12500.50 |   342
 Feb   | 13200.75 |   389
 Mar   | 15800.25 |   421
```

### `asciidoc` — AsciiDoc table

```
[cols="<5,>8,>5",options="header"]
|====
| Month | Revenue  | Units
| Jan   | 12500.50 |   342
| Feb   | 13200.75 |   389
| Mar   | 15800.25 |   421
|====
```

### `jira` — Atlassian Jira wiki table

```
|| Month || Revenue  || Units ||
| Jan   | 12500.50 |   342 |
| Feb   | 13200.75 |   389 |
| Mar   | 15800.25 |   421 |
```

### `rst` — reStructuredText simple table

```
======= ========== =======
 Month    Revenue   Units
======= ========== =======
 Jan     12500.50     342
 Feb     13200.75     389
 Mar     15800.25     421
======= ========== =======
```

### `rst-grid` — reStructuredText grid table

```
+-------+----------+-------+
| Month |  Revenue | Units |
+=======+==========+=======+
| Jan   | 12500.50 |   342 |
+-------+----------+-------+
| Feb   | 13200.75 |   389 |
+-------+----------+-------+
| Mar   | 15800.25 |   421 |
+-------+----------+-------+
```

### `orgtbl` — Emacs Org-mode table

```
| Month |  Revenue | Units |
|-------+----------+-------|
| Jan   | 12500.50 |   342 |
| Feb   | 13200.75 |   389 |
| Mar   | 15800.25 |   421 |
```

### `ascii` — Plain ASCII

```
+-------+----------+-------+
| Month |  Revenue | Units |
+-------+----------+-------+
| Jan   | 12500.50 |   342 |
+-------+----------+-------+
| Feb   | 13200.75 |   389 |
+-------+----------+-------+
| Mar   | 15800.25 |   421 |
+-------+----------+-------+
```

### `modern` — Unicode box-drawing (thin lines, row separators)

```
┌───────┬──────────┬───────┐
│ Month │  Revenue │ Units │
├───────┼──────────┼───────┤
│ Jan   │ 12500.50 │   342 │
├───────┼──────────┼───────┤
│ Feb   │ 13200.75 │   389 │
├───────┼──────────┼───────┤
│ Mar   │ 15800.25 │   421 │
└───────┴──────────┴───────┘
```

### `sharp` — Unicode box-drawing (thin lines, no row separators)

```
┌───────┬──────────┬───────┐
│ Month │  Revenue │ Units │
├───────┼──────────┼───────┤
│ Jan   │ 12500.50 │   342 │
│ Feb   │ 13200.75 │   389 │
│ Mar   │ 15800.25 │   421 │
└───────┴──────────┴───────┘
```

### `extended` — Unicode box-drawing (double lines)

```
╔═══════╦══════════╦═══════╗
║ Month ║  Revenue ║ Units ║
╠═══════╬══════════╬═══════╣
║ Jan   ║ 12500.50 ║   342 ║
╠═══════╬══════════╬═══════╣
║ Feb   ║ 13200.75 ║   389 ║
╠═══════╬══════════╬═══════╣
║ Mar   ║ 15800.25 ║   421 ║
╚═══════╩══════════╩═══════╝
```

### `heavy-outline` — Unicode box-drawing (heavy outer border)

```
┏━━━━━━━┳━━━━━━━━━━┳━━━━━━━┓
┃ Month ┃  Revenue ┃ Units ┃
┣━━━━━━━╋━━━━━━━━━━╋━━━━━━━┫
┃ Jan   ┃ 12500.50 ┃   342 ┃
┃ Feb   ┃ 13200.75 ┃   389 ┃
┃ Mar   ┃ 15800.25 ┃   421 ┃
┗━━━━━━━┻━━━━━━━━━━┻━━━━━━━┛
```
