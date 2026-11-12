#!/usr/bin/env node
// Official UA55BT / UA55ST catalog. Printed fields only.
// A card stays out of the battle pack until a group program marks it ready.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','imc-fetch','pages');
mkdirSync(CACHE,{recursive:true});
const FETCHED='2026-11-12';

const COLORS={
 紫:'purple',黄:'yellow',緑:'green',青:'blue',赤:'red',
 紅:'red',藍:'blue',黃:'yellow',綠:'green'
};
const COLOR_CHARS='紫黄緑青赤紅藍黃綠';
const TYPES={
 キャラクター:'character',イベント:'event',フィールド:'field',
 角色:'character',事件:'event',場域:'field',场地:'field',
 アクションポイント:'action-point',行動點:'action-point',行動值:'action-point'
};
const TRIGGERS={
 ドロー:'draw',ゲット:'get',アクティブ:'active',スペシャル:'special',
 ファイナル:'final',レイド:'raid',カラー:'color',
 抽卡:'draw',抽牌:'draw',獲得:'get',活動:'active',特殊:'special',特別:'special',
 最終:'final',突襲:'raid',顏色:'color',色彩:'color'
};

async function get(url,file){
 const path=join(CACHE,file);
 try{
  const cached=readFileSync(path,'utf8');
  if(cached.length>800&&!cached.includes('OneTrust'))return cached;
  if(cached.includes('cardNumData')&&cached.length>800)return cached;
 }catch{}
 let last=null;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await fetch(url,{
    headers:{'User-Agent':'Ua-IMC-catalog/1.0'},
    signal:AbortSignal.timeout(20000)
   });
   if(!res.ok)throw Error(url+' -> '+res.status);
   const text=await res.text();
   if(text.length<500)throw Error(url+' short body');
   writeFileSync(path,text);
   return text;
  }catch(error){
   last=error;
   await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
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
function listIds(html,set){
 const ids=[...html.matchAll(new RegExp(set+'/(IMC-1-(?:AP)?\\d+(?:_p\\d+)?)','g'))].map(m=>m[1]);
 return [...new Set(ids)];
}
function source(set,full){
 return 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+
  set+'%2F'+full;
}
function sourceTc(set,full){
 return 'https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no='+
  set+'%2F'+full;
}
function imageOf(set,full){
 return 'https://www.unionarena-tcg.com/jp/images/cardlist/card/'+set+'_'+full+'.png';
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
function writeModule(path,name,cards,owner){
 const header=`// Official printed IMC cards. Fetched ${FETCHED} from unionarena-tcg.com.
// ${owner}
// battleReady stays false until that group's program and test accept the card.
// Do not invent a number, a name, or an effect.
export const ${name}=\n`;
 writeFileSync(path,header+JSON.stringify(cards,null,1)+';\n');
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

async function main(){
 const btList=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570155','bt-list.html');
 const stList=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570055','st-list.html');
 const bt=listIds(btList,'UA55BT');
 const st=listIds(stList,'UA55ST');
 const bases=[...new Set(bt.map(id=>id.replace(/_p\d+$/,'')))];
 const stBases=[...new Set(st.map(id=>id.replace(/_p\d+$/,'')))];
 const faqBt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA55BT','faq-bt.html'));
 const faqSt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA55ST','faq-st.html'));

 const details=await pool(bases,4,async full=>{
  const set='UA55BT';
  const jp=parseCard(await get(source(set,full),full+'-jp.html'));
  let tc=null;
  try{tc=parseCard(await get(sourceTc(set,full),full+'-tc.html'));}catch{tc=null;}
  if(!jp.number||!jp.name||!jp.type)
   throw Error('Incomplete JP page '+full+' '+JSON.stringify({number:jp.number,name:jp.name,type:jp.type}));
  return {full,jp,tc};
 });
 const byId=new Map(details.map(row=>[row.full,row]));

 const stDetails=await pool(stBases,4,async full=>{
  const jp=parseCard(await get(source('UA55ST',full),'ST-'+full+'-jp.html'));
  let tc=null;
  try{tc=parseCard(await get(sourceTc('UA55ST',full),'ST-'+full+'-tc.html'));}catch{tc=null;}
  if(!jp.number||!jp.name)throw Error('Incomplete ST page '+full);
  return {full,jp,tc};
 });
 const stById=new Map(stDetails.map(row=>[row.full,row]));

 function printing(set,full,rarity){
  return {number:set+'/'+full,set,rarity,source:source(set,full),image:imageOf(set,full)};
 }
 function record(full,row,set){
  const id=full;
  const jp=row.jp,tc=row.tc;
  const faqs=[...(faqBt.get(id)||[]),...(faqSt.get(id)||[])];
  const seen=new Set();
  const faq=faqs.filter(item=>seen.has(item.id)?false:seen.add(item.id));
  const card={
   id,identity:id,number:set+'/'+id,
   name:tc?.name||jp.name,nameJa:jp.name,ruby:jp.ruby,
   title:'imc',set,sets:[set],printings:[],
   color:jp.color,energy:jp.energy,ap:jp.ap,bp:jp.bp,bpMark:jp.bpMark,
   gen:jp.gen,genMark:jp.genMark,type:jp.type,
   traits:jp.traits,
   rarity:jp.rarity,trigger:jp.trigger,
   triggerText:tc?.triggerText||jp.triggerText,
   triggerTextJa:jp.triggerText,
   effect:tc?.effect||jp.effect,
   effectJa:compactJa(jp.effect),
   image:jp.image||imageOf(set,id),
   source:source(set,id),
   sourceTc:tc?sourceTc(set,id):'',
   auto:false,battleReady:false,
   deckLegal:jp.type!=='action-point',
   faq
  };
  if(jp.traitComponents)card.traitComponents=jp.traitComponents;
  return card;
 }

 const cards=bases.filter(id=>!id.includes('AP')).map(id=>{
  const card=record(id,byId.get(id),'UA55BT');
  const prints=bt.filter(full=>full.replace(/_p\d+$/,'')===id);
  card.printings=prints.map(full=>printing('UA55BT',full,card.rarity));
  return card;
 });
 const ap=bases.filter(id=>id.includes('AP')).map(id=>{
  const card=record(id,byId.get(id),'UA55BT');
  card.deckLegal=false;
  card.type='action-point';
  const prints=bt.filter(full=>full.replace(/_p\d+$/,'')===id);
  card.printings=prints.map(full=>printing('UA55BT',full,card.rarity||'AP'));
  return card;
 });

 const reprintNotes=[];
 for(const id of stBases){
  if(id.includes('AP'))continue;
  const stRow=stById.get(id);
  const btRow=byId.get(id);
  if(!btRow)continue;
  const same=compactJa(stRow.jp.effect)===compactJa(btRow.jp.effect)&&
   stRow.jp.name===btRow.jp.name&&stRow.jp.bp===btRow.jp.bp&&
   stRow.jp.energy===btRow.jp.energy&&stRow.jp.ap===btRow.jp.ap;
  reprintNotes.push({
   id,samePrintedText:same,
   booster:source('UA55BT',id),starter:source('UA55ST',id),
   starterRarity:stRow.jp.rarity,boosterRarity:btRow.jp.rarity
  });
  if(!same)throw Error(id+' starter printing does not match the booster text');
 }
 const starterPrintings=st.filter(full=>!full.includes('AP')).flatMap(full=>{
  const id=full.replace(/_p\d+$/,'');
  if(!byId.has(id))return [];
  const rarity=stById.get(id).jp.rarity;
  return [printing('UA55ST',full,rarity)];
 });

 const starterOnly=stBases.filter(id=>!id.includes('AP')&&!byId.has(id)).map(id=>{
  const card=record(id,stById.get(id),'UA55ST');
  const prints=st.filter(full=>full.replace(/_p\d+$/,'')===id);
  card.printings=prints.map(full=>printing('UA55ST',full,card.rarity));
  return card;
 });
 const stAp=stById.get('IMC-1-AP01');
 const btAp=byId.get('IMC-1-AP01');
 if(stAp&&btAp&&stAp.jp.name!==btAp.jp.name)
  throw Error('Starter AP01 name differs from booster AP01');
 if(stAp){
  const card=ap.find(item=>item.id==='IMC-1-AP01');
  card.sets=['UA55BT','UA55ST'];
  card.printings.push(printing('UA55ST','IMC-1-AP01',stAp.jp.rarity||'AP'));
 }

 const sort=(a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true});
 cards.sort(sort);ap.sort(sort);starterOnly.sort(sort);
 const b=cards.filter(card=>Number(card.id.slice(6))<=50);
 const c=cards.filter(card=>Number(card.id.slice(6))>=51);
 if(b.length!==50||c.length!==50)throw Error('Booster split drifted '+b.length+' '+c.length);
 if(ap.length!==13)throw Error('AP count '+ap.length);
 if(starterOnly.length!==13)throw Error('Starter-only count '+starterOnly.length);

 const dir=join(ROOT,'dist','imc');
 mkdirSync(dir,{recursive:true});
 writeModule(join(dir,'cards-001-050.mjs'),'IMC_CARDS_001_050',b,
  'B group owns this file: IMC-1-001 through IMC-1-050.');
 writeModule(join(dir,'cards-051-100.mjs'),'IMC_CARDS_051_100',c,
  'C group owns this file: IMC-1-051 through IMC-1-100.');
 writeModule(join(dir,'cards-starter.mjs'),'IMC_CARDS_STARTER',starterOnly,
  'D group owns this file: UA55ST cards IMC-1-101 through IMC-1-113.');
 writeModule(join(dir,'cards-ap.mjs'),'IMC_AP_CARDS',ap,
  'D group owns this file: action point cards. They are not deck cards.');
 writeFileSync(join(dir,'starter-printings.mjs'),
  `// D group owns this file. UA55ST illustration reprints of booster identities.
// The product page says some starter cards are alternate art of UA55BT.
// samePrintedText was checked against the official JP pages on ${FETCHED}.
export const IMC_STARTER_PRINTINGS=\n`+JSON.stringify(starterPrintings,null,1)+`;
export const IMC_REPRINT_CHECKS=\n`+JSON.stringify(reprintNotes,null,1)+';\n');

 const rarity={};
 for(const card of cards)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 console.log(JSON.stringify({
  booster:cards.length,ap:ap.length,starterOnly:starterOnly.length,
  reprints:reprintNotes.length,parallels:bt.filter(id=>/_p/.test(id)).length,
  rarity,faqs:cards.reduce((n,card)=>n+card.faq.length,0)+
   starterOnly.reduce((n,card)=>n+card.faq.length,0)
 },null,2));
}

main().catch(error=>{console.error(error);process.exit(1);});
