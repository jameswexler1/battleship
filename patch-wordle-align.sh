#!/usr/bin/env bash
# patch-wordle-align.sh — run from the ROOT of your Hugo repo

set -euo pipefail
CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 << 'PYEOF'
import re, sys

path = "static/css/battleship.css"
with open(path) as f:
    src = f.read()

changes = 0

# 1. Add justify-content: center back to .row
# The last patch added padding but removed centering
src, n = re.subn(
    r'(\.row\s*\{)([^}]*?)(\})',
    lambda m: m.group(1) + m.group(2).rstrip() + '\n  justify-content: center;\n' + m.group(3)
    if 'justify-content' not in m.group(2) else m.group(0),
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ .row: justify-content: center restored")

# 2. Remove padding from .row (padding was causing the left-shift;
#    centering handles alignment, board width handles sizing)
src, n = re.subn(
    r'(\.row\s*\{[^}]*?)padding\s*:[^;]+;\s*',
    r'\1',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ .row: padding removed")

# 3. Widen #wordle-app so keyboard can breathe past the tile grid
src, n = re.subn(
    r'(#wordle-app\s*\{[^}]*?)max-width\s*:[^;]+;',
    r'\1max-width: 100%;',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ #wordle-app max-width → 100%")
else: print("⚠ #wordle-app max-width not found")

# 4. Keyboard padding: make it very tight so keys span the screen
src, n = re.subn(
    r'(#keyboard\s*\{[^}]*?)padding\s*:[^;]+;',
    r'\1padding: 0 2px;',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Keyboard padding → 0 2px (near full width)")

opens, closes = src.count('{'), src.count('}')
if opens != closes:
    print(f"✗ Brace mismatch ({opens}/{closes}) — file NOT written")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(src)

print(f"\n✓ {changes} change(s) applied, braces balanced ({opens}/{closes})")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
