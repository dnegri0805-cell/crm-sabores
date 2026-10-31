// Achica app.js para publicar (saca comentarios y espacios de sobra, sin tocar textos ni plantillas).
// Uso: node tools/minificar.js   →  genera app.min.js
// Usa el lector de código de TypeScript (instalado globalmente) para no romper textos, plantillas ni expresiones regulares.
const fs=require('fs'),path=require('path');
let ts;try{ts=require('typescript')}catch(e){ts=require(require('child_process').execSync('npm root -g').toString().trim()+'/typescript')}
const dir=path.join(__dirname,'..'),src=fs.readFileSync(path.join(dir,'app.js'),'utf8');
const sc=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,src);
const K=ts.SyntaxKind;let out='',prev=null,nl=false,tmplDepth=[];
const pal=t=>t&&/^[\w$\\]/.test(t[0])||false,fin=t=>t&&/[\w$]$/.test(t)||false;
const pegar=t=>{ if(prev!==null){ if(nl){out+='\n'} else if((fin(prev)&&pal(t))||(/[+\-]$/.test(prev)&&/^[+\-]/.test(t))||(prev.endsWith('/')&&t.startsWith('/'))) out+=' ' }
  out+=t;prev=t;nl=false };
let k;const pila=[];
while((k=sc.scan())!==K.EndOfFileToken){
  if(k===K.NewLineTrivia){nl=true;continue}
  if(k===K.WhitespaceTrivia||k===K.ShebangTrivia)continue;
  if(k===K.SingleLineCommentTrivia||k===K.MultiLineCommentTrivia){if(/\n/.test(sc.getTokenText()))nl=true;continue}
  if(k===K.SlashToken||k===K.SlashEqualsToken){
    // ¿división o expresión regular? Depende del token anterior
    const p=prev||'';const div=/[\w$)\]]$/.test(p)&&!/^(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/.test(p);
    if(!div){k=sc.reScanSlashToken()}
  }
  if(k===K.OpenBraceToken){pila.push('{')}
  if(k===K.TemplateHead){pila.push('`')}
  if(k===K.CloseBraceToken){const top=pila.pop();if(top==='`'){k=sc.reScanTemplateToken(false);if(k===K.TemplateMiddle)pila.push('`')}}
  pegar(sc.getTokenText());
}
fs.writeFileSync(path.join(dir,'app.min.js'),out+'\n');
console.log('app.js',src.length,'→ app.min.js',out.length);
