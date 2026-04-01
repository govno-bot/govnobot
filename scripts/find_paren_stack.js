const fs = require('fs');
const s = fs.readFileSync('src/commands/command-handler.js', 'utf8');
let inSingle=false, inDouble=false, inTemplate=false, inLineComment=false, inBlockComment=false;
let parenStack = [];
for(let i=0;i<s.length;i++){
  const ch=s[i];
  const prev=s[i-1]||'';
  if(inLineComment){ if(ch==='\n') inLineComment=false; }
  else if(inBlockComment){ if(prev==='*' && ch==='/' ) inBlockComment=false; }
  else if(inSingle){ if(ch==='\\' && s[i+1]) { i++; continue; } if(ch==="'") inSingle=false; }
  else if(inDouble){ if(ch==='\\' && s[i+1]) { i++; continue; } if(ch==='"') inDouble=false; }
  else if(inTemplate){ if(ch==='`') inTemplate=false; if(ch==='\\' && s[i+1]) { i++; continue; } }
  else {
    if(prev==='/' && ch==='/' ) { inLineComment=true; }
    else if(prev==='/' && ch==='*') { inBlockComment=true; }
    else if(ch==="'") { inSingle=true; }
    else if(ch==='"') { inDouble=true; }
    else if(ch==='`') { inTemplate=true; }
    else if(ch==='(') parenStack.push(i);
    else if(ch===')') parenStack.pop();
  }
}
console.log('unmatched paren count:', parenStack.length);
console.log('parenStack (first 20):', parenStack.slice(0,20));
if(parenStack.length>0){
  const fs2 = require('fs');
  const start = Math.max(0, parenStack[parenStack.length-1]-40);
  const end = Math.min(s.length, parenStack[parenStack.length-1]+40);
  console.log('last unmatched context:');
  console.log(s.slice(start,end));
}

// Map indices to line numbers and show context lines
const lines = s.split(/\r?\n/);
function idxToLine(idx){ let acc=0; for(let i=0;i<lines.length;i++){ acc += lines[i].length + 1; if(acc>idx) return i+1; } return lines.length; }
if(parenStack.length>0){
  for(const idx of parenStack){
    console.log('--- unmatched at idx', idx, 'line', idxToLine(idx), '---');
    const lineNum = idxToLine(idx);
    const startLine = Math.max(1, lineNum-3);
    const endLine = Math.min(lines.length, lineNum+3);
    for(let ln=startLine; ln<=endLine; ln++){
      console.log((ln+'    ').slice(0,5), lines[ln-1]);
    }
  }
}
