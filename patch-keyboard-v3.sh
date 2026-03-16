#!/usr/bin/env bash
# patch-keyboard-v3.sh — run from the ROOT of your Hugo repo
# Directly replaces the Wordle keyboard + tile section in battleship.css.

set -euo pipefail

CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 - "$CSS" << 'PYEOF'
import sys, re

path = sys.argv[1]
with open(path, 'r') as f:
    original = f.read()

css = original

# ─────────────────────────────────────────────────────────────────────────────
# 1. Replace the tile block (fixed px → flex + aspect-ratio so board matches
#    keyboard width on every screen size)
# ─────────────────────────────────────────────────────────────────────────────
OLD_TILE = re.compile(
    r'\.tile\s*\{[^}]+\}',
    re.DOTALL
)
NEW_TILE = """.tile {
  flex: 1;
  max-width: 62px;
  aspect-ratio: 1 / 1;
  border: 2px solid var(--steel);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(20px, 5vw, 30px);
  font-weight: 700;
  text-transform: uppercase;
  background: var(--navy-800);
  color: var(--text);
  font-family: 'Oxanium', sans-serif;
  box-sizing: border-box;
}"""

# Only replace the first .tile block (not ones inside @media)
m = OLD_TILE.search(css)
if m:
    css = css[:m.start()] + NEW_TILE + css[m.end():]
    print("✓ .tile block replaced")
else:
    print("⚠ .tile block not found — skipping")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Replace #keyboard + all keyboard-row + .key rules in one shot
#    (matches from #keyboard through .key.absent)
# ─────────────────────────────────────────────────────────────────────────────
OLD_KB = re.compile(
    r'/\* Keyboard \*/.*?\.key\.absent\s*\{[^}]+\}',
    re.DOTALL
)

NEW_KB = """/\* Keyboard — NYT layout: flex:1 keys, spacer trick for middle row \*/
#keyboard {
  width: 100%;
  padding: 0 8px;
  box-sizing: border-box;
  margin-bottom: 8px;
}

.keyboard-row {
  display: flex;
  justify-content: center;
  margin-bottom: 8px;
  touch-action: manipulation;
}

/* Half-flex spacers flank the 9-key middle row so every row has
   10 flex-units of keys → all keys are the same width on all rows. */
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
  font-size: clamp(11px, 2.5vw, 13px);
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  transition: background 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.key:last-child { margin-right: 0; }
.key:hover      { background: var(--navy-500); }
.key.wide       { flex: 1.5; font-size: clamp(10px, 2.2vw, 12px); }
.key.correct    { background: #166534; border-color: #22c55e; }
.key.present    { background: #92400e; border-color: #f59e0b; }
.key.absent     { background: #1f2937; border-color: #374151; color: var(--text-dim); }"""

# Unescape the comment
NEW_KB = NEW_KB.replace('/\\*', '/*').replace('\\*/', '*/')

m = OLD_KB.search(css)
if m:
    css = css[:m.start()] + NEW_KB + css[m.end():]
    print("✓ keyboard block replaced")
else:
    print("⚠ keyboard block not found — skipping")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Also replace #game-board and .row so their padding matches the keyboard's
#    8px side padding — board and keyboard will be exactly the same width.
# ─────────────────────────────────────────────────────────────────────────────
OLD_BOARD = re.compile(r'#game-board\s*\{[^}]+\}', re.DOTALL)
NEW_BOARD = """#game-board {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding: 0 8px;
  box-sizing: border-box;
  margin-bottom: 12px;
}"""

m = OLD_BOARD.search(css)
if m:
    css = css[:m.start()] + NEW_BOARD + css[m.end():]
    print("✓ #game-board block replaced")

OLD_ROW = re.compile(r'\.row\s*\{[^}]+\}', re.DOTALL)
NEW_ROW = """.row {
  display: flex;
  gap: 5px;
  justify-content: center;
}"""

m = OLD_ROW.search(css)
if m:
    css = css[:m.start()] + NEW_ROW + css[m.end():]
    print("✓ .row block replaced")

# ─────────────────────────────────────────────────────────────────────────────
# 4. Strip ALL keyboard overrides from inside @media blocks — they fight flex.
#    Also strip old .tile overrides (aspect-ratio handles mobile now).
# ─────────────────────────────────────────────────────────────────────────────
def strip_wordle_from_media(block):
    # Remove keyboard-row, key, tile overrides
    block = re.sub(r'\s*/\*[^*]*Wordle responsive[^*]*\*/\s*', '\n', block)
    block = re.sub(r'\s*\.keyboard-row(?:\.second-row)?\s*\{[^}]*\}', '', block)
    block = re.sub(r'\s*\.key(?:\.wide)?\s*\{[^}]*\}', '', block)
    block = re.sub(r'\s*\.tile\s*\{[^}]*\}', '', block)
    return block

css = re.sub(r'(@media[^{]+\{)(.*?)(\}(?:\s*@media|\s*$))',
             lambda m: m.group(1) + strip_wordle_from_media(m.group(2)) + m.group(3),
             css, flags=re.DOTALL)
print("✓ Removed keyboard/tile overrides from @media blocks")

# ─────────────────────────────────────────────────────────────────────────────
# 5. Verify nothing broke — count braces
# ─────────────────────────────────────────────────────────────────────────────
opens  = css.count('{')
closes = css.count('}')
if opens != closes:
    print(f"⚠ Brace mismatch: {opens} open, {closes} close — restoring original")
    with open(path, 'w') as f:
        f.write(original)
    sys.exit(1)

with open(path, 'w') as f:
    f.write(css)

print(f"✓ Saved. Braces balanced ({opens}/{closes}).")
PYEOF

echo ""
echo "✓ Done. Deploy with:  hugo --gc --minify"
