// Presentation only: preserve the source catalogue and engine text.
const escapeHtml=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const named={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
export function cleanCardEffectText(value){
 let text=String(value??'');
 // Official imports contain both &nbsp; and semicolon-free &nbsp.
 // Repeat boundedly to handle double-encoded imports without interpreting HTML.
 for(let i=0;i<3;i++){
  const next=text.replace(/&(?:nbsp;?|#(?:x[0-9a-f]+|\d+);|(?:amp|lt|gt|quot|apos);)/gi,entity=>{
   const key=entity.slice(1).replace(/;$/,'').toLowerCase();
   if(key[0]!=='#')return named[key]??entity;
   const code=key[1]==='x'?parseInt(key.slice(2),16):Number(key.slice(1));
   return Number.isInteger(code)&&code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):entity;
  });
  if(next===text)break;
  text=next;
 }
 return text.replace(/<br\s*\/?>/gi,'\n').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
}
// Recognize explicit printed keyword labels without changing ordinary rule prose.
const timing='主[啟起]動|登場時|攻擊時|退場時|自己回合中|對手回合中';
const numeral='[+＋]?[0-9０-９一二三四五六七八九十]+';
const value='(?:[（(]\\s*'+numeral+'\\s*[）)]|\\s*'+numeral+')';
const impact='(?:貫通|衝擊)(?:無效|'+value+')?';
const damage='傷害'+value;
const keyword=timing+'|'+impact+'|'+damage;
const explicit=new RegExp('【('+keyword+')】|\\[('+keyword+')\\]|［('+keyword+')］','g');
const prefix=new RegExp('^('+keyword+')');
const badge=word=>{
 let label=word.replace(/^主起動$/,'主啟動');
 let style='';
 if(/^主[啟起]動$/.test(word))style=' ua-effect-main';
 else if(/^(貫通|衝擊)/.test(word)){style=' ua-effect-impact';label=label.replace(/^衝擊/,'貫通');}
 else if(/^傷害/.test(word)){style=' ua-effect-damage';if(/^傷害\s*(?:[（(]\s*[2２二]\s*[）)]|[2２二])$/.test(word))label='傷害二';}
 return '<span class="ua-effect-keyword'+style+'">'+escapeHtml(label)+'</span>';
};
export function renderCardEffectText(value){
 // Imported HTML used non-breaking spaces as timing-label delimiters.
 const marked=String(value??'').replace(new RegExp('(?:&(?:amp;)*nbsp;?|\\u00a0)\\s*('+keyword+')\\s*(?:&(?:amp;)*nbsp;?|\\u00a0)','g'),'【$1】');
 const text=cleanCardEffectText(marked);
 return text.split('\n').map(line=>{
  let result='',end=0;
  const first=line.match(prefix);
  if(first&&/^(?:\s|[:：]|[(（]|$)/.test(line.slice(first[0].length))){result=badge(first[1]);end=first[0].length;}
  explicit.lastIndex=end;
  for(const m of line.matchAll(explicit)){
   result+=escapeHtml(line.slice(end,m.index))+badge(m[1]||m[2]||m[3]);
   end=m.index+m[0].length;
  }
  return result+escapeHtml(line.slice(end));
 }).join('\n');
}
