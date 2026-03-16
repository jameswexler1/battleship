#!/usr/bin/env bash
# patch-wordle-sizing.sh — run from the ROOT of your Hugo repo

set -euo pipefail
CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 << 'PYEOF'
import re, sys

path = "static/css/battleship.css"
with open(path) as f:
    src = f.read()

changes = 0

# 1. Tile width
src, n = re.subn(
    r'(\.tile\s*\{[^}]*?)width\s*:[^;]+;',
    r'\1width: min(52px, calc((100vw - 56px) / 5));',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Tile width → min(52px, ...)")
else: print("✗ Tile width not found")

# 2. Tile font-size
src, n = re.subn(
    r'(\.tile\s*\{[^}]*?)font-size\s*:[^;]+;',
    r'\1font-size: clamp(14px, 4.5vw, 24px);',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Tile font-size scaled")

# 3. Board margin-bottom
src, n = re.subn(
    r'(#game-board\s*\{[^}]*?)margin-bottom\s*:[^;]+;',
    r'\1margin-bottom: 8px;',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Board margin-bottom reduced")

# 4. Keyboard padding
src, n = re.subn(
    r'(#keyboard\s*\{[^}]*?)padding\s*:[^;]+;',
    r'\1padding: 0 4px;',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Keyboard padding → 0 4px")
else: print("✗ Keyboard padding not found")

# 5. Key margin
src, n = re.subn(
    r'(\.key\s*\{[^}]*?)margin\s*:[^;]+;',
    r'\1margin: 0 6px 0 0;',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Key gap → 6px")

# 6. Key height
src, n = re.subn(
    r'(\.key\s*\{[^}]*?)height\s*:[^;]+;',
    r'\1height: clamp(46px, 14vw, 58px);',
    src, count=1, flags=re.DOTALL
)
if n: changes += 1; print("✓ Key height → clamp(46px, 14vw, 58px)")

opens, closes = src.count('{'), src.count('}')
if opens != closes:
    print(f"✗ Brace mismatch ({opens}/{closes}) — file NOT written")
    sys.exit(1)

if changes == 0:
    print("✗ No changes applied")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(src)

print(f"\n✓ {changes} change(s) applied, braces balanced ({opens}/{closes})")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
