const fs = require('fs');
const p = 'src/commands/command-handler.js';
let s = fs.readFileSync(p, 'utf8');
let out = '';
let i = 0;
while (i < s.length) {
  const idx = s.indexOf('<<<<<<< HEAD', i);
  if (idx === -1) { out += s.slice(i); break; }
  out += s.slice(i, idx);
  const eq = s.indexOf('=======', idx);
  const end = s.indexOf('>>>>>>>', idx);
  if (eq === -1 || end === -1) { console.error('Malformed conflict markers'); process.exit(1); }
  // keep HEAD section
  out += s.slice(idx + '<<<<<<< HEAD'.length, eq);
  i = end + s.slice(end, end+200).indexOf('\n') + 1; // move after end line
}
fs.writeFileSync(p, out, 'utf8');
console.log('resolved conflicts by keeping HEAD in', p);
