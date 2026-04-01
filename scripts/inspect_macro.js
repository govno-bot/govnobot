const fs = require('fs');
const p = 'src/commands/command-handler.js';
const s = fs.readFileSync(p, 'utf8');
const needle = "if (text.startsWith('/macro'))";
const idx = s.indexOf(needle);
console.log('file', p);
console.log('needle', needle);
console.log('idx', idx);
if (idx === -1) process.exit(0);
const start = Math.max(0, idx - 80);
const end = Math.min(s.length, idx + 80);
const chunk = s.slice(start, end);
console.log('chunk>>>');
console.log(chunk);
console.log('<<<chunk');
for (let i = start; i < end; i++) {
  const ch = s.charCodeAt(i);
  process.stdout.write(i + '\t' + ch + '\t' + (ch < 128 ? String.fromCharCode(ch) : '\\u' + ch.toString(16)) + '\n');
}
