const fs = require('fs');
const p = 'src/commands/command-handler.js';
let s = fs.readFileSync(p, 'utf8');
// normalize CRLF -> LF
s = s.replace(/\r\n/g, '\n');
// remove stray CR
s = s.replace(/\r/g, '\n');
// collapse accidental multiple newlines? keep as is
fs.writeFileSync(p, s, 'utf8');
console.log('normalized', p);
