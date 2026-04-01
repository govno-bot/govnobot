const fs = require('fs');
const p = 'src/commands/command-handler.js';
let s = fs.readFileSync(p, 'utf8');
const backup = p + '.bak';
fs.writeFileSync(backup, s, 'utf8');
let lines = s.split(/\r?\n/);
let changed = false;
for (let i = 0; i < lines.length - 1; i++) {
  const a = lines[i];
  const b = lines[i+1];
  if (!a) continue;
  const lastChar = a[a.length-1];
  const firstChar = b[0];
  const isLastIdChar = /[A-Za-z0-9_]$/.test(lastChar);
  const isFirstIdChar = /^[A-Za-z0-9_]/.test(firstChar);
  // also handle cases where a ends with './' or '../' from require('./\npublic...')
  const endsWithSlash = /[\/]$/.test(a);
  if ((isLastIdChar || endsWithSlash) && isFirstIdChar) {
    // Merge lines (no space)
    lines[i] = a + b;
    lines.splice(i+1, 1);
    changed = true;
    i = Math.max(-1, i-2); // re-evaluate earlier lines
  }
}
if (changed) {
  const out = lines.join('\n');
  fs.writeFileSync(p, out, 'utf8');
  console.log('fixed splits, backup at', backup);
} else {
  console.log('no splits detected');
}
