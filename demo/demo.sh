#!/usr/bin/env bash
# Demo script for the tablefmt VS Code extension.
#
# Prerequisites:
#   - ydotoold daemon running as your own user (needs /dev/uinput access via
#     the 'input' group — see README for setup)
#   - VS Code (code) on PATH
#   - tablefmt extension installed in VS Code
#
# Usage:
#   1. Start the screen recorder (peek, obs, kazam, …) BEFORE running this script.
#   2. Run:  bash demo/demo.sh
#   3. Do not interact with the desktop while the script runs (~80 s total).
#
# What is demonstrated:
#   1. "Data to table"           — selection-based; PSV → github table.
#   2. "Format table to style"   — cursor-only; re-aligns and applies heavy-outline.
#   3. "Add column after cursor" — inserts an empty column next to the cursor.
#   4. "Remove column at cursor" — removes that empty column.
#   5. "Format table to style"   — converts a github table to 'modern' then 'extended'.
#
# Line-number rationale:
#   demo.md PSV data is at lines 7–11 (5 lines).  Step 1 ("Data to table")
#   inserts one separator row: +1 shift for everything below.
#   Step 2 ("Format table to style" → heavy-outline) replaces the 5-line
#   github table with a 7-line heavy-outline table: +2 additional shift.
#   Cumulative shifts (+1 then +2 = +3) for sections below:
#     - Section 2 table:                lines 16–20 (use line 18, a data row).
#     - Section 3 table (Add/Remove):   header at line 26.
#     - Section 4 table (Style demo):   header at line 34.
#   Step 4a → modern converts 5 lines to 9 (+4).  The top border stays on
#   line 34, so goto_line 34 works for step 4b as well.

set -euo pipefail

# ydotoold may use a non-default socket location (e.g. when started with sudo).
# Auto-detect: prefer the env var, then the two common locations.
if [[ -z "${YDOTOOL_SOCKET:-}" ]]; then
  for _sock in /tmp/.ydotool_socket /run/user/1000/.ydotool_socket; do
    if [[ -S "$_sock" ]]; then
      export YDOTOOL_SOCKET="$_sock"
      break
    fi
  done
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMO_FILE="$SCRIPT_DIR/demo.md"

cp "$SCRIPT_DIR/demo.original.md" "$DEMO_FILE"

# ---------------------------------------------------------------------------
# Key codes from /usr/include/linux/input-event-codes.h
# ydotool 1.x only accepts raw KEYCODE:1 (down) / KEYCODE:0 (up) pairs.
# ---------------------------------------------------------------------------
# KEY_LEFTCTRL=29  KEY_LEFTSHIFT=42
# KEY_P=25  KEY_G=34  KEY_S=31  KEY_ENTER=28
# KEY_HOME=102  KEY_END=107  KEY_DOWN=108  KEY_RIGHT=106

KEY() { ydotool key --key-delay 50 "$@"; }
text() { ydotool type --key-delay 30 -- "$@"; }
pause() { sleep "${1:-2}"; }

ctrl_shift_p() { KEY 29:1 42:1 25:1 25:0 42:0 29:0; } # Ctrl+Shift+P
ctrl_g() { KEY 29:1 34:1 34:0 29:0; }                 # Ctrl+G  (Go to Line)
ctrl_s() { KEY 29:1 31:1 31:0 29:0; }                 # Ctrl+S  (Save)
press_enter() { KEY 28:1 28:0; }                      # Enter
press_home() { KEY 102:1 102:0; }                     # Home
press_right() { KEY 106:1 106:0; }                    # Right arrow
shift_down() { KEY 42:1 108:1 108:0 42:0; }           # Shift+Down
shift_end() { KEY 42:1 107:1 107:0 42:0; }            # Shift+End

# Open the command palette, type a command name, and run it.
run_cmd() {
  ctrl_shift_p
  pause 0.8
  text "$1"
  pause 0.5
  press_enter
}

# Run a command that opens a QuickPick (style picker) after launching.
run_style_cmd() {
  ctrl_shift_p
  pause 0.8
  text "$1"
  pause 0.5
  press_enter
  pause 1.2 # wait for the style QuickPick to appear
  text "$2"
  pause 0.5
  press_enter
}

# Move cursor to a 1-based line number via Ctrl+G.
goto_line() {
  ctrl_g
  pause 0.3
  text "$1"
  press_enter
  pause 0.4
}

# Press Right N times to advance the cursor N columns.
rights() {
  local n="$1"
  for ((i = 0; i < n; i++)); do press_right; done
}

# ---------------------------------------------------------------------------
# Open VS Code and let it settle
# ---------------------------------------------------------------------------
code "$DEMO_FILE" &
pause 8 # wait for VS Code to start, load the extension, and take focus

pause 3 # let the audience see the initial file

# ---------------------------------------------------------------------------
# 1. Selection → Data to table
#    Select lines 7–11 (the five pipe-separated data lines).
#    "Data to table" auto-detects the | delimiter and uses the default style.
# ---------------------------------------------------------------------------
goto_line 7
press_home
shift_down
shift_down
shift_down
shift_down # extend to start of line 11
shift_end  # extend to end of line 11
pause 1

run_cmd 'tablefmt Data to table'
pause 3

# ---------------------------------------------------------------------------
# 2. Cursor → Format table to style (heavy-outline)
#    Step 1 added one separator row, so the unaligned table is now at lines
#    16–20.  Place cursor on line 18 (a data row) — no selection needed.
#    Picking "heavy-outline" shows both cursor-based detection and style choice.
#    heavy-outline adds top/bottom borders (7 lines total vs 5 for github),
#    shifting sections 3 and 4 down by an extra +2.
# ---------------------------------------------------------------------------
goto_line 18
pause 1

run_style_cmd 'tablefmt Format table to style' 'heavy-outline'
pause 3

# ---------------------------------------------------------------------------
# 3a. Add column after cursor
#     Section 3 table header is now at line 26 (+1 from step 1, +2 from step 2):
#       | Name  | Age | City     |
#     "rights 3" from Home lands at char 3, inside the "Name" column (index 0).
#     "Add column after cursor" inserts an empty column at index 1.
# ---------------------------------------------------------------------------
goto_line 26
press_home
rights 3
pause 1

run_cmd 'tablefmt Add column after cursor'
pause 3

# ---------------------------------------------------------------------------
# 3b. Remove column at cursor
#     After the add, the header is now:
#       | Name  |  | Age | City     |
#     "rights 9" from Home lands at char 9, inside the empty column (index 1).
# ---------------------------------------------------------------------------
goto_line 26
press_home
rights 9
pause 1

run_cmd 'tablefmt Remove column at cursor'
pause 3

# ---------------------------------------------------------------------------
# 4a. Style conversion: github → modern
#     Section 4 table header is now at line 34 (+1 from step 1, +2 from step 2).
#     "Format table to style" opens a QuickPick; typing "modern" selects it.
#     The table grows from 5 lines (github) to 9 lines (modern, with row
#     separators and top/bottom borders).  The top border stays at line 34.
# ---------------------------------------------------------------------------
goto_line 34
pause 1

run_style_cmd 'tablefmt Format table to style' 'modern'
pause 3

# ---------------------------------------------------------------------------
# 4b. Style conversion: modern → extended
#     The modern top border (┌...┐) is at line 34 — a recognised table line.
#     Both modern and extended produce 9 lines for this data, so line 34 is
#     still the first line of the table after the conversion.
# ---------------------------------------------------------------------------
goto_line 34
pause 1

run_style_cmd 'tablefmt Format table to style' 'extended'
pause 3

ctrl_s
pause 0.8

echo "Demo complete — you can stop the screen recorder."
