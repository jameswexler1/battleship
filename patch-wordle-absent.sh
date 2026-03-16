#!/usr/bin/env bash
# patch-wordle-absent.sh — run from the ROOT of your Hugo repo

set -euo pipefail
JS="static/js/wordle.js"
[[ -f "$JS" ]] || { echo "✗ $JS not found. Run from repo root."; exit 1; }

python3 << 'PYEOF'
path = "static/js/wordle.js"
with open(path) as f:
    src = f.read()

OLD = """  guessArray.forEach((letter, i) => {
    if (statuses[i] !== 'correct') {
      const index = secretArray.indexOf(letter);
      if (index !== -1) {
        statuses[i] = 'present';
        keyMap[letter] = keyMap[letter] || 'present';
        secretArray[index] = null;
      }
    }
  });"""

NEW = """  guessArray.forEach((letter, i) => {
    if (statuses[i] !== 'correct') {
      const index = secretArray.indexOf(letter);
      if (index !== -1) {
        statuses[i] = 'present';
        keyMap[letter] = keyMap[letter] || 'present';
        secretArray[index] = null;
      }
    }
  });

  // Mark absent letters so keyboard keys go grey
  guessArray.forEach((letter, i) => {
    if (statuses[i] === 'absent') {
      keyMap[letter] = keyMap[letter] || 'absent';
    }
  });"""

if OLD not in src:
    print("✗ Target block not found — has wordle.js been modified?")
    import sys; sys.exit(1)

with open(path, 'w') as f:
    f.write(src.replace(OLD, NEW, 1))

print("✓ Absent key coloring fixed in wordle.js")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
