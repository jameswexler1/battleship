#!/usr/bin/env bash
# patch-keyboard-v4.sh — run from the ROOT of your Hugo repo

set -euo pipefail
CSS="static/css/battleship.css"
[[ -f "$CSS" ]] || { echo "✗ $CSS not found. Run from repo root."; exit 1; }

python3 << PYEOF
import re, sys

path = "$CSS"
with open(path) as f:
    lines = f.readlines()

# ── Find the keyboard section by landmarks ────────────────────────────────────
# Start: first line containing '#keyboard' (outside a media query)
# End:   the closing brace of the last '.key.' rule before '#message'

start_line = None
end_line   = None
in_media   = False

for i, line in enumerate(lines):
    if line.strip().startswith('@media'):
        in_media = True
    if in_media and line.strip() == '}':
        in_media = False
        continue
    if in_media:
        continue

    # Mark start at the comment above #keyboard, or #keyboard itself
    if start_line is None:
        if '/* Keyboard' in line or ('#keyboard' in line and '{' in line):
            # Step back to grab any comment on the preceding line
            start_line = i - 1 if i > 0 and lines[i-1].strip().startswith('/*') else i

    # Mark end as the line with '.key.absent' closing brace
    if start_line is not None and '.key.absent' in line:
        # Find the closing brace of this rule (may be same line or next)
        j = i
        while j < len(lines) and '}' not in lines[j]:
            j += 1
        end_line = j  # inclusive

if start_line is None or end_line is None:
    print("✗ Could not locate keyboard section (start=%s end=%s)" % (start_line, end_line))
    # Print some context to help debug
    for i, l in enumerate(lines):
        if 'keyboard' in l.lower() or 'key' in l.lower()[:20]:
            print(f"  line {i}: {l.rstrip()}")
    sys.exit(1)

print(f"  Keyboard section: lines {start_line}–{end_line}")
print(f"  First line: {lines[start_line].rstrip()}")
print(f"  Last line:  {lines[end_line].rstrip()}")

# ── New keyboard CSS ──────────────────────────────────────────────────────────
NEW_KB = """\
/* Keyboard — NYT proportional flex layout */
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

/* Half-flex spacers flank the 9-key middle row → all rows = 10 flex units
   → every normal key is the same width on every row, at any screen size. */
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
.key.absent     { background: #1f2937; border-color: #374151; color: var(--text-dim); }
"""

# ── Splice in the new block ───────────────────────────────────────────────────
new_lines = lines[:start_line] + [NEW_KB] + lines[end_line + 1:]

# ── Remove keyboard + tile overrides from @media blocks ──────────────────────
result = ''.join(new_lines)

def clean_media(m):
    block = m.group(0)
    block = re.sub(r'[ \t]*/\* Wordle responsive \*/[ \t]*\n', '', block)
    block = re.sub(r'\s*\.keyboard-row(?:\.second-row)?\s*\{[^}]*\}', '', block)
    block = re.sub(r'\s*\.key(?:\.wide)?\s*\{[^}]*\}', '', block)
    block = re.sub(r'\s*\.tile\s*\{[^}]*\}', '', block)
    return block

result = re.sub(r'@media\s[^{]+\{.*?\n\}', clean_media, result, flags=re.DOTALL)

# ── Sanity check ──────────────────────────────────────────────────────────────
opens  = result.count('{')
closes = result.count('}')
if opens != closes:
    print(f"✗ Brace mismatch ({opens} open, {closes} close) — aborting, file unchanged.")
    sys.exit(1)

with open(path, 'w') as f:
    f.write(result)

print(f"✓ Keyboard section replaced.")
print(f"✓ Media query overrides cleaned.")
print(f"✓ Braces balanced ({opens}/{closes}).")
PYEOF

echo "✓ Done. Deploy with:  hugo --gc --minify"
