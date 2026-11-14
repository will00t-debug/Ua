#!/usr/bin/env node
// Official UA10BT cards MHA-1-051 through MHA-1-100.
// D group owns this fetch. It does not write 001–050 or starter files.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','mha-fetch','pages');
mkdirSync(CACHE,{recursive:true});
const FETCHED='2026-11-13';
const SET='UA10BT';
const SERIES='570110';

const COLORS={
 紫:'purple',黄:'yellow',緑:'green',青:'blue',赤:'red',
 紅:'red',藍:'blue',黃:'yellow',綠:'green'
};
const COLOR_CHARS='紫黄緑青赤紅藍黃綠';
const TYPES={
 キャラクター:'character',イベント:'event',フィールド:'field',
 角色:'character',事件:'event',場域:'field',场地:'field'
};
const TRIGGERS={
 ドロー:'draw',ゲット:'get',アクティブ:'active',スペシャル:'special',
 ファイナル:'final',レイド:'raid',カラー:'color',
 抽卡:'draw',抽牌:'draw',獲得:'get',活動:'active',特殊:'special',特別:'special',
 最終:'final',突襲:'raid',顏色:'color',色彩:'color'
};

async function get(url,file,ok){
 const path=join(CACHE,file);
 try{
  const cached=readFileSync(path,'utf8');
  if(ok(cached))return cached;
 }catch{}
 let last=null;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const res=await fetch(url,{
    headers:{'User-Agent':'Ua-MHA-catalog/1.0'},
    signal:AbortSignal.timeout(25000)
   });
   if(!res.ok)throw Error(url+' -> '+res.status);
   const text=await res.text();
   if(!ok(text))throw Error(url+' unexpected body');
   writeFileSync(path,text);
   return text;
  }catch(error){
   last=error;
   await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
 }
 throw Error(url+' failed: '+(last&&last.message));
}

function dd(html,cls){
 const m=html.match(new RegExp(`cardDataCol ${cls}[\\s\\S]*?<dd class="cardDataContents">([\\s\\S]*?)</dd>`));
 return m?m[1].trim():'';
}
function imgsToText(chunk){
 return chunk
  .replace(/<br\s*\/?>/gi,'\n')
  .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi,'【$1】')
  .replace(/<[^>]+>/g,'')
  .replace(/\u00a0/g,' ')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .replace(/[ \t]{2,}/g,' ')
  .trim();
}
function compactJa(text){
 return text.replace(/\r/g,'').replace(/\n+/g,'').replace(/[ \t]{2,}/g,' ').trim()||'-';
}
function parseNeed(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 if(!alt||alt==='-')return {energy:0,color:null};
 const colorChar=[...alt].find(ch=>COLOR_CHARS.includes(ch));
 const num=(alt.match(/(\d+)/)||[])[1];
 return {energy:num==null?0:Number(num),color:COLORS[colorChar]||null};
}
function parseGen(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 if(!alt||alt==='-')return {gen:0,genMark:'',color:null};
 let gen=0,genMark='',color=null;
 for(const ch of alt){
  if(COLOR_CHARS.includes(ch)){gen+=1;color=COLORS[ch];}
  else if(ch==='+')genMark='+';
 }
 return {gen,genMark,color};
}
function parseBp(chunk){
 const raw=imgsToText(chunk).replace(/\s+/g,'');
 if(!raw||raw==='-')return {bp:0,bpMark:''};
 const m=raw.match(/(\d+)(\+)?/);
 return {bp:m?Number(m[1]):0,bpMark:m&&m[2]?'+':''};
}
function parseTraits(chunk){
 const text=imgsToText(chunk).replace(/\s+/g,' ').trim().replace(/^［特徴：(.+)］$/,'$1');
 if(!text||text==='-')return {traits:[],traitComponents:undefined};
 const traits=[text];
 const parts=text.split('／').map(part=>part.trim()).filter(Boolean);
 const traitComponents=parts.length>=2?parts:undefined;
 return {traits,traitComponents};
}
function parseTrigger(chunk){
 const text=imgsToText(chunk);
 if(!text||text==='-')return {trigger:null,triggerText:''};
 const m=text.match(/^【([^】]+)】|^\[([^\]]+)\]/);
 const label=(m&&(m[1]||m[2])||'').replace(/トリガー|觸發器|触発/g,'');
 const key=Object.keys(TRIGGERS).find(k=>label.includes(k)||label===k);
 return {trigger:key?TRIGGERS[key]:null,triggerText:text};
}
function parseCard(html){
 const number=(html.match(/cardNumData[^>]*>([^<]+)/)||[])[1]?.trim();
 const rarity=(html.match(/rareData">([^<]+)/)||[])[1]?.trim()||'';
 const nameBlock=(html.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
 const name=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
 const ruby=(nameBlock.match(/rubyData">([^<]*)/)||[])[1]?.trim()||'';
 const image=((html.match(/cardDataImgCol"><img src="([^"]+)"/)||[])[1]||'').replace(/\?v\d+$/,'');
 const absImage=image.startsWith('http')?image:'https://www.unionarena-tcg.com'+image;
 const need=parseNeed(dd(html,'needEnergyData'));
 const ap=Number(imgsToText(dd(html,'apData')))||0;
 const typeJa=imgsToText(dd(html,'categoryData'));
 const type=TYPES[typeJa]||null;
 const bp=parseBp(dd(html,'bpData'));
 const traits=parseTraits(dd(html,'attributeData'));
 const gen=parseGen(dd(html,'generatedEnergyData'));
 const effect=imgsToText(dd(html,'effectData'));
 const trig=parseTrigger(dd(html,'triggerData'));
 return {
  number,rarity,name,ruby,image:absImage,
  color:need.color||gen.color||null,energy:need.energy,ap,type,
  bp:bp.bp,bpMark:bp.bpMark,gen:gen.gen,genMark:gen.genMark,
  traits:traits.traits,traitComponents:traits.traitComponents,
  effect,trigger:trig.trigger,triggerText:trig.triggerText
 };
}
function source(full){
 return 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+
  SET+'%2F'+full;
}
function sourceTc(full){
 return 'https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no='+
  SET+'%2F'+full;
}
function imageOf(full){
 return 'https://www.unionarena-tcg.com/jp/images/cardlist/card/'+SET+'_'+full+'.png';
}
function mergeFaq(listHtml){
 const byCard=new Map();
 const units=listHtml.split('faqUnit">').slice(1);
 for(const unit of units){
  const id=(unit.match(/<h2 class="tit">(Q\d+)/)||[])[1];
  const date=(unit.match(/<h2 class="tit">Q\d+<span>([^<]*)<\/span>/)||[])[1]||'';
  const cardNo=(unit.match(/<p class="cardID">([^<]*)<\/p>/)||[])[1]||'';
  const q=(unit.match(/<div class="question[\s\S]*?<p>([\s\S]*?)<\/p>/)||[])[1]||'';
  const a=(unit.match(/<div class="answer[\s\S]*?<p>([\s\S]*?)<\/p>/)||[])[1]||'';
  if(!id||!cardNo.trim()||!q.trim())continue;
  const key=cardNo.trim().split('/').pop().replace(/_p\d+$/,'');
  const entry={id,date:date.trim(),q:q.trim(),a:a.trim()};
  if(!byCard.has(key))byCard.set(key,[]);
  byCard.get(key).push(entry);
 }
 return byCard;
}
async function pool(items,limit,worker){
 const out=new Array(items.length);
 let cursor=0;
 async function run(){
  while(cursor<items.length){
   const index=cursor++;
   out[index]=await worker(items[index],index);
  }
 }
 await Promise.all(Array.from({length:limit},run));
 return out;
}

const cardPage=html=>html.includes('cardNumData');
const listHtml=await get(
 'https://www.unionarena-tcg.com/jp/cardlist/?search=true&series='+SERIES,
 'bt-list.html',html=>html.includes('UA10BT/MHA-1-100'));
const listed=[...listHtml.matchAll(/UA10BT\/(MHA-1-\d{3}(?:_p\d+)?)/g)].map(m=>m[1]);
const unique=[...new Set(listed)];
const bases=[...new Set(unique.map(id=>id.replace(/_p\d+$/,'')))]
 .filter(id=>{
  const n=Number(id.slice(6));
  return n>=51&&n<=100;
 }).sort((a,b)=>Number(a.slice(6))-Number(b.slice(6)));
if(bases.length!==50)throw Error('Expected 50 cards in 051–100, got '+bases.length+' '+bases.join(','));

const faq=mergeFaq(await get(
 'https://www.unionarena-tcg.com/jp/faq/list.php?series=UA10BT','faq.html',
 html=>html.includes('faqUnit')||html.includes('Q449')));

const details=await pool(bases,4,async full=>{
 const jp=parseCard(await get(source(full),full+'-jp.html',cardPage));
 let tc=null;
 try{tc=parseCard(await get(sourceTc(full),full+'-tc.html',cardPage));}catch{tc=null;}
 if(jp.number!==SET+'/'+full||!jp.name||!jp.type||!jp.color)
  throw Error('Incomplete JP page '+full+' '+JSON.stringify({
   number:jp.number,name:jp.name,type:jp.type,color:jp.color
  }));
 if(tc&&tc.name&&tc.effect==null)tc=null;
 return {full,jp,tc};
});

const cards=details.map(({full,jp,tc})=>{
 const prints=unique.filter(id=>id.replace(/_p\d+$/,'')===full);
 const card={
  id:full,identity:full,number:SET+'/'+full,
  name:tc?.name||jp.name,nameJa:jp.name,ruby:jp.ruby,
  title:'mha',set:SET,sets:[SET],
  printings:prints.map(id=>({
   number:SET+'/'+id,set:SET,rarity:jp.rarity,
   source:source(id),image:imageOf(id)
  })),
  color:jp.color,energy:jp.energy,ap:jp.ap,bp:jp.bp,bpMark:jp.bpMark,
  gen:jp.gen,genMark:jp.genMark,type:jp.type,traits:jp.traits,
  rarity:jp.rarity,trigger:jp.trigger,
  triggerText:tc?.triggerText||jp.triggerText,
  triggerTextJa:jp.triggerText,
  effect:tc?.effect||jp.effect,
  effectJa:compactJa(jp.effect),
  image:jp.image||imageOf(full),
  source:source(full),
  sourceTc:tc?sourceTc(full):'',
  auto:false,battleReady:false,deckLegal:true,
  faq:faq.get(full)||[]
 };
 if(jp.traitComponents)card.traitComponents=jp.traitComponents;
 return card;
});

const dir=join(ROOT,'dist','mha');
mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'cards-051-100.mjs'),
 `// Official printed My Hero Academia cards. Fetched ${FETCHED} from unionarena-tcg.com.
// D group owns this file: MHA-1-051 through MHA-1-100.
// battleReady stays false until that group's program and test accept the card.
// Do not invent a number, a name, or an effect.
export const MHA_CARDS_051_100=\n`+JSON.stringify(cards,null,1)+';\n');

const summary=cards.map(card=>({
 id:card.id,name:card.name,nameJa:card.nameJa,rarity:card.rarity,
 color:card.color,type:card.type,energy:card.energy,ap:card.ap,bp:card.bp,
 gen:card.gen,traits:card.traits,trigger:card.trigger,
 effectJa:card.effectJa,triggerJa:card.triggerTextJa,faq:card.faq.length,
 tc:card.sourceTc?true:false
}));
writeFileSync('/tmp/mha-051-100-summary.json',JSON.stringify(summary,null,1));
console.log(JSON.stringify({
 count:cards.length,
 types:cards.reduce((m,c)=>(m[c.type]=(m[c.type]||0)+1,m),{}),
 colors:cards.reduce((m,c)=>(m[c.color]=(m[c.color]||0)+1,m),{}),
 tc:cards.filter(c=>c.sourceTc).length,
 faq:cards.reduce((n,c)=>n+c.faq.length,0),
 missingTrigger:cards.filter(c=>c.triggerTextJa&&c.triggerTextJa!=='-'&&!c.trigger).map(c=>c.id)
},null,2));
