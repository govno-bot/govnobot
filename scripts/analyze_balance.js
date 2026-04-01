const fs = require('fs');
const s = fs.readFileSync('src/commands/command-handler.js', 'utf8');
let inSingle=false, inDouble=false, inTemplate=false, inLineComment=false, inBlockComment=false, last='';
let brace=0, paren=0, bracket=0;
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
    else if(ch==='{') brace++;
    else if(ch==='}') brace--;
    else if(ch==='(') { paren++; parenStack.push(i); }
    else if(ch===')') { paren--; parenStack.pop(); }
    else if(ch==='[') bracket++;
    else if(ch===']') bracket--;
  }
  if(i<17200 && (i%1000===0)){
    // progress
  }
  if(i===17128){ // just before our macro 'if'
    console.log('state at pos',i,'char',s[i], 'brace', brace, 'paren', paren, 'bracket', bracket, 'inSingle', inSingle, 'inDouble', inDouble, 'inTemplate', inTemplate, 'inLineComment', inLineComment, 'inBlockComment', inBlockComment);
    console.log('last open paren index (top of stack):', parenStack[parenStack.length-1]);
    break;
  }
}
console.log('done');
