#!/usr/bin/env bash
# patch-keyboard.sh — run from the ROOT of your Hugo repo
# Replaces only the Wordle keyboard CSS with NYT-style proportional flex layout.

set -euo pipefail

CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

# ── Write the new keyboard block to a temp file ───────────────────────────────
TMPFILE=$(mktemp)
cat > "$TMPFILE" << 'KEYBOARD_CSS'
#keyboard {
  width: 100%;
  max-width: 500px;
  margin: 0 auto 10px;
  padding: 0 8px;
  box-sizing: border-box;
}
.keyboard-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
  width: 100%;
}
.keyboard-row.second-row {
  padding: 0 calc(100% * 0.05);
}
.key {
  flex: 1;
  height: 58px;
  max-width: 43px;
  background: var(--steel);
  color: var(--text);
  border: 1px solid var(--navy-600);
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  transition: background 0.15s, transform 0.1s;
  font-family: 'Oxanium', sans-serif;
  padding: 0;
  min-width: 0;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.key:hover  { background: var(--navy-500); transform: translateY(-1px); }
.key.wide   { flex: 1.5; max-width: 65px; font-size: 12px; }
.key.correct { background: #166534; border-color: #22c55e; }
.key.present { background: #92400e; border-color: #f59e0b; }
.key.absent  { background: #1f2937; border-color: #374151; color: var(--text-dim); }
KEYBOARD_CSS

# ── Use Python for reliable multi-line replacement ────────────────────────────
python3 - "$CSS" "$TMPFILE" << 'PYEOF'
import sys, re

css_path = sys.argv[1]
new_block_path = sys.argv[2]

with open(css_path, 'r') as f:
    css = f.read()

with open(new_block_path, 'r') as f:
    new_block = f.read().strip()

# Match from '#keyboard {' through the last '.key.absent { ... }' block
# We'll replace the entire keyboard section
pattern = re.compile(
    r'#keyboard\s*\{.*?\}.*?'           # #keyboard rule
    r'\.keyboard-row\s*\{.*?\}.*?'      # .keyboard-row rule
    r'(?:\.keyboard-row\.second-row\s*\{.*?\}.*?)?'  # optional second-row
    r'\.key\s*\{.*?\}.*?'               # .key rule
    r'(?:\.key:hover\s*\{.*?\}.*?)?'
    r'(?:\.key\.wide\s*\{.*?\}.*?)?'
    r'\.key\.correct\s*\{.*?\}.*?'
    r'\.key\.present\s*\{.*?\}.*?'
    r'\.key\.absent\s*\{.*?\}',
    re.DOTALL
)

match = pattern.search(css)
if not match:
    print("✗ Could not locate keyboard CSS block. Has the file been modified?")
    sys.exit(1)

new_css = css[:match.start()] + new_block + css[match.end():]

with open(css_path, 'w') as f:
    f.write(new_css)

print("✓ Keyboard CSS replaced successfully.")
PYEOF

rm "$TMPFILE"

echo "✓ Done. Deploy with:  hugo --gc --minify"
