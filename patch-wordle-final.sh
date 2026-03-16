#!/usr/bin/env bash
# patch-wordle-final.sh — run from the ROOT of your Hugo repo

set -euo pipefail
CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 << 'PYEOF'
import sys

path = "static/css/battleship.css"
with open(path) as f:
    lines = f.readlines()

# Find start: first line with '#wordle-app'
# Find end:   first line with '@keyframes pop'  (keep it and everything after)
start = None
end   = None
for i, line in enumerate(lines):
    if start is None and '#wordle-app' in line:
        start = i
    if start is not None and '@keyframes pop' in line:
        end = i
        break

if start is None or end is None:
    print(f"✗ Landmarks not found (start={start}, end={end})")
    sys.exit(1)

print(f"  Replacing lines {start+1}–{end} ({end-start} lines)")

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
#game-board {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 20px;
  width: 100%;
  padding: 0 8px;
  box-sizing: border-box;
}
.row {
  display: flex;
  gap: 5px;
}
.tile {
  width: calc((100% - 20px) / 5);
  aspect-ratio: 1 / 1;
  border: 2px solid var(--steel);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(16px, 5vw, 30px);
  font-weight: 700;
  text-transform: uppercase;
  background: var(--navy-800);
  color: var(--text);
  font-family: 'Oxanium', sans-serif;
  box-sizing: border-box;
}
.tile.filled { animation: pop 0.1s ease-in-out; border-color: var(--steel-lt); }
.tile.flip   { animation: flip 0.5s ease forwards; }
.correct { background: #166534 !important; border-color: #22c55e !important; color: #dcfce7; }
.present { background: #854d0e !important; border-color: #f59e0b !important; color: #fef3c7; }
.absent  { background: #374151 !important; border-color: #4b5563 !important; }
#keyboard {
  width: 100%;
  padding: 0 8px;
  box-sizing: border-box;
  margin-bottom: 8px;
}
.keyboard-row {
  display: flex;
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
  height: calc((100vw - 32px) / 10 * 1.4);
  max-height: 58px;
  padding: 0;
  margin: 0 4px 0 0;
  border: 0;
  border-radius: 4px;
  background: var(--steel);
  color: var(--text);
  font-size: clamp(11px, 3vw, 14px);
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
.key.wide       { flex: 1.5; font-size: clamp(9px, 2.5vw, 12px); }
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

new_lines = lines[:start] + [NEW] + lines[end:]

result = ''.join(new_lines)

opens, closes = result.count('{'), result.count('}')
if opens != closes:
    print(f"✗ Brace mismatch ({opens}/{closes}) — file NOT written.")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(result)

print(f"✓ Wordle CSS replaced cleanly")
print(f"✓ Braces balanced ({opens}/{closes})")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
