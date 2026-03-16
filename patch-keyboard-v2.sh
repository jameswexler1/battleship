#!/usr/bin/env bash
# patch-keyboard-v2.sh — run from the ROOT of your Hugo repo
# Replaces the Wordle keyboard CSS to exactly match NYT's layout.

set -euo pipefail

CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 - "$CSS" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r') as f:
    css = f.read()

# ── New keyboard block ────────────────────────────────────────────────────────
NEW = """#keyboard {
  width: 100%;
  max-width: 500px;
  margin: 0 auto 8px;
  padding: 0 8px;
  box-sizing: border-box;
}
.keyboard-row {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  touch-action: manipulation;
}
/* NYT trick: half-flex spacers flank the 9-key middle row so all
   three rows share the same key width (10 flex units each). */
.keyboard-row.second-row::before,
.keyboard-row.second-row::after {
  content: '';
  flex: 0.5;
}
.key {
  font-family: 'Oxanium', sans-serif;
  flex: 1;
  height: 58px;
  padding: 0;
  margin: 0 6px 0 0;
  border: 0;
  border-radius: 4px;
  background: var(--steel);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  transition: background 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.key:last-child { margin: 0; }
.key:hover  { background: var(--navy-500); }
.key.wide   { flex: 1.5; font-size: 12px; }
.key.correct { background: #166534; border-color: #22c55e; }
.key.present { background: #92400e; border-color: #f59e0b; }
.key.absent  { background: #1f2937; border-color: #374151; color: var(--text-dim); }"""

# ── Remove the old responsive keyboard overrides from media queries ───────────
# They fight the flex layout and make things worse on mobile.
MOBILE_KEYBOARD_RE = re.compile(
    r'\s*\.keyboard-row\s*\{[^}]*\}'
    r'(?:\s*\.keyboard-row\.second-row\s*\{[^}]*\})?'
    r'\s*\.key\s*\{[^}]*\}'
    r'(?:\s*\.key\.wide\s*\{[^}]*\})?',
    re.DOTALL
)

# ── Find and replace the main keyboard block ──────────────────────────────────
MAIN_RE = re.compile(
    r'#keyboard\s*\{.*?\}'           # #keyboard
    r'.*?\.keyboard-row\s*\{.*?\}'   # .keyboard-row
    r'(?:.*?\.keyboard-row\.second-row\s*\{.*?\})?'
    r'.*?\.key\s*\{.*?\}'            # .key
    r'(?:.*?\.key:hover\s*\{.*?\})?'
    r'(?:.*?\.key\.wide\s*\{.*?\})?'
    r'.*?\.key\.correct\s*\{.*?\}'
    r'.*?\.key\.present\s*\{.*?\}'
    r'.*?\.key\.absent\s*\{.*?\}',
    re.DOTALL
)

m = MAIN_RE.search(css)
if not m:
    print("✗ Could not find main keyboard block.")
    sys.exit(1)

css = css[:m.start()] + NEW + css[m.end():]

# ── Strip keyboard overrides from inside @media blocks ────────────────────────
# Match each @media block and remove keyboard-related rules inside it.
def strip_keyboard_from_media(block):
    # Remove .keyboard-row, .keyboard-row.second-row, .key, .key.wide rules
    block = re.sub(r'\s*\.keyboard-row(?:\.second-row)?\s*\{[^}]*\}', '', block)
    block = re.sub(r'\s*\.key(?:\.wide)?\s*\{[^}]*\}', '', block)
    return block

def replace_media(m):
    return strip_keyboard_from_media(m.group(0))

css = re.sub(r'@media[^{]+\{[^@]+\}', replace_media, css, flags=re.DOTALL)

with open(path, 'w') as f:
    f.write(css)

print("✓ Keyboard CSS replaced — NYT layout applied.")
print("✓ Responsive keyboard overrides removed.")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
