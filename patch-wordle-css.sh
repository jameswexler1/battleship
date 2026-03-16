#!/usr/bin/env bash
# patch-wordle-css.sh — run from the ROOT of your Hugo repo
# Replaces the complete Wordle CSS section cleanly.

set -euo pipefail
CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 << 'PYEOF'
import sys

path = "static/css/battleship.css"
with open(path) as f:
    lines = f.readlines()

# ── Find landmarks ────────────────────────────────────────────────────────────
# START: line containing '#wordle-app {'
# END:   line containing '/* ── Animations' (we keep animations, replace before them)
start = None
end   = None

for i, line in enumerate(lines):
    if start is None and '#wordle-app' in line and '{' in line:
        start = i
    if start is not None and '/* ── Animations' in line:
        end = i
        break

if start is None or end is None:
    print(f"✗ Landmarks not found (start={start}, end={end})")
    sys.exit(1)

print(f"  Replacing lines {start}–{end-1}  ({end-start} lines)")

# ── New wordle CSS ─────────────────────────────────────────────────────────────
#
# Design principle: both #game-board and #keyboard share the same container
# width and the same 8px horizontal padding. Tile size is computed with min()
# so it's 62px on desktop and shrinks on narrow phones. Keys use flex:1 inside
# that same container so they always fill the row exactly — no fixed widths.
#
NEW = """\
#wordle-app {
  font-family: 'Oxanium', 'Helvetica Neue', Arial, sans-serif;
  text-align: center;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 10px 0 20px;
  box-sizing: border-box;
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
}

#wordle-app h3 {
  font-size: 1.4rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 0.5rem;
  text-shadow: 0 0 16px rgba(245,158,11,0.3);
}

#language-select {
  margin-bottom: 12px;
  padding: 6px 10px;
  font-size: 0.85rem;
  background: var(--navy-700);
  color: var(--text);
  border: 1px solid var(--steel);
  border-radius: var(--radius);
  font-family: 'Oxanium', sans-serif;
}

/* ── Board ── */
/* --ts: tile size. min() shrinks below 62px on screens narrower than ~360px.
   Formula: (available_width - 4 gaps) / 5 tiles
   available = 100vw - 16px (8px padding each side) - 4*5px gaps          */
#game-board {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 20px;
  padding: 0 8px;
  width: 100%;
  box-sizing: border-box;
}

.row {
  display: flex;
  gap: 5px;
  justify-content: center;
}

.tile {
  --ts: min(62px, calc((100vw - 36px) / 5));
  width: var(--ts);
  height: var(--ts);
  border: 2px solid var(--steel);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(18px, calc(var(--ts) * 0.46), 30px);
  font-weight: 700;
  text-transform: uppercase;
  background: var(--navy-800);
  color: var(--text);
  font-family: 'Oxanium', sans-serif;
  box-sizing: border-box;
  flex-shrink: 0;
}

.tile.filled { animation: pop 0.1s ease-in-out; border-color: var(--steel-lt); }
.tile.flip   { animation: flip 0.5s ease forwards; }
.correct { background: #166534 !important; border-color: #22c55e !important; color: #dcfce7; }
.present { background: #854d0e !important; border-color: #f59e0b !important; color: #fef3c7; }
.absent  { background: #374151 !important; border-color: #4b5563 !important; }

/* ── Keyboard ── */
/* Same 8px side padding as the board so both are the same visual width.
   Keys use flex:1 so they divide the full row width equally.
   The middle row gets ::before/::after spacers of flex:0.5 each so it
   has 9 + 0.5 + 0.5 = 10 flex-units — identical key width on all rows. */
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

.keyboard-row.second-row::before,
.keyboard-row.second-row::after {
  content: '';
  flex: 0.5;
}

.key {
  font-family: 'Oxanium', sans-serif;
  flex: 1;
  /* height scales with screen: 58px on desktop, ~12vw on mobile (≈43px on 360px) */
  height: min(58px, 12vw);
  padding: 0;
  margin: 0 4px 0 0;
  border: 0;
  border-radius: 4px;
  background: var(--steel);
  color: var(--text);
  font-size: clamp(10px, 2.8vw, 14px);
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
.key.wide       { flex: 1.5; font-size: clamp(9px, 2.4vw, 12px); }
.key.correct    { background: #166534; }
.key.present    { background: #92400e; }
.key.absent     { background: #1f2937; color: var(--text-dim); }

#message {
  margin: 10px 0;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  min-height: 1.6rem;
  color: var(--text);
}

#message.win  { color: var(--green); text-shadow: 0 0 16px rgba(34,197,94,0.5); }
#message.lose { color: var(--hit-glow); }

#reset-btn {
  margin-top: 10px;
  padding: 10px 28px;
  font-size: 0.95rem;
  background: var(--amber);
  color: var(--navy-900);
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.08em;
  transition: background 0.2s, transform 0.1s;
}

#reset-btn:hover { background: var(--amber-lt); transform: translateY(-1px); }

"""

# ── Splice ────────────────────────────────────────────────────────────────────
new_lines = lines[:start] + [NEW] + lines[end:]

# ── Strip any leftover keyboard/tile overrides from @media blocks ─────────────
import re
result = ''.join(new_lines)

def clean_media(m):
    b = m.group(0)
    b = re.sub(r'[ \t]*/\* Wordle responsive \*/[ \t]*\n?', '', b)
    b = re.sub(r'\s*\.keyboard-row(?:\.second-row)?\s*\{[^}]*\}', '', b)
    b = re.sub(r'\s*\.key(?:\.wide)?\s*\{[^}]*\}', '', b)
    b = re.sub(r'\s*\.tile\s*\{[^}]*\}', '', b)
    return b

result = re.sub(r'@media\s[^{]+\{.*?\n\}', clean_media, result, flags=re.DOTALL)

# ── Verify braces ─────────────────────────────────────────────────────────────
opens, closes = result.count('{'), result.count('}')
if opens != closes:
    print(f"✗ Brace mismatch ({opens}/{closes}) — file NOT written.")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(result)

print(f"✓ Wordle CSS replaced ({end-start} old lines → clean block)")
print(f"✓ Media query overrides cleaned")
print(f"✓ Braces balanced ({opens}/{closes})")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
