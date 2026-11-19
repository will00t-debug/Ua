#!/usr/bin/env node
// Fetch official UA17BT / UA17ST Toriko pages into a catalogue JSON.
// Generated energy is the 発生エナジー alt-text pip count. A trailing + is
// genMark. The icon filename number is a sprite id and is never the pip count.
// Required-energy dash is 0, but the color character in that alt is kept.
// Parallel art is another printing of the same identity. AP cards are skipped.
// Traditional Chinese card pages for this product are unpublished (coming soon),
// so names and effect text stay the Japanese official print.
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {trkProfile} from '../dist/universal-v2/trk-classify.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','trk-fetch','pages');
mkdirSync(CACHE,{recursive:true});

const COLORS={
 紫:'purple',黄:'yellow',緑:'green',青:'blue',赤:'red'
};
const COLOR_CHARS='紫黄緑青赤';
const TYPES={キャラクター:'character',イベント:'event',フィールド:'field'};
const TRIGGERS={
 ドロー:'draw',ゲット:'get',アクティブ:'active',スペシャル:'special',
 ファイナル:'final',レイド:'raid',カラー:'color'
};

async function get(url,file){
 const path=join(CACHE,file);
 try{
  const cached=readFileSync(path,'utf8');
  if(cached.length>500&&!cached.includes('comingsoon.png'))return cached;
 }catch{}
 const res=await fetch(url,{headers:{'User-Agent':'Ua-TRK-catalog/1.0'},signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error(url+' -> '+res.status);
 const text=await res.text();
 writeFileSync(path,text);
 return text;
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

function compact(text){
 return String(text||'')
  .replace(/\r/g,'')
  .replace(/\s+/g,'')
  .replace(/】【/g,'】【')||'-';
}

export function parseNeed(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 const colorChar=[...alt].find(ch=>COLOR_CHARS.includes(ch));
 const color=COLORS[colorChar]||null;
 if(!alt||alt==='-'||alt==='--')return {energy:0,color,alt};
 // "黄-" is zero required energy of that color, not a missing color.
 if(/[-－]$/.test(alt)&&!/\d/.test(alt))return {energy:0,color,alt};
 const num=(alt.match(/(\d+)/)||[])[1];
 return {energy:num==null?0:Number(num),color,alt};
}

export function parseGen(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 const file=(chunk.match(/ico_resource_energy_[a-z]+(\d+)\.png/)||[])[1];
 const filenameNumber=file==null?null:Number(file);
 if(!alt||alt==='-')return {gen:0,genMark:'',color:null,alt,filenameNumber};
 let gen=0,genMark='',color=null;
 for(const ch of alt){
  if(COLOR_CHARS.includes(ch)){gen+=1;color=COLORS[ch];}
  else if(ch==='+')genMark='+';
  else if(/\d/.test(ch))throw Error('generated-energy alt contains a digit: '+alt);
 }
 // The sprite id is often pip-count plus one when a + mark is present.
 if(filenameNumber!=null&&filenameNumber!==gen)
  return {gen,genMark,color,alt,filenameNumber,filenameDisagrees:true};
 return {gen,genMark,color,alt,filenameNumber,filenameDisagrees:false};
}

function parseBp(chunk){
 const raw=imgsToText(chunk).replace(/\s+/g,'');
 if(!raw||raw==='-')return {bp:0,bpMark:''};
 const m=raw.match(/(\d+)(\+)?/);
 return {bp:m?Number(m[1]):0,bpMark:m&&m[2]?'+':''};
}

function parseTraits(chunk){
 const text=imgsToText(chunk).replace(/\s+/g,'').replace(/^［特徴：(.+)］$/,'$1');
 if(!text||text==='-')return [];
 return [text];
}

function parseTrigger(chunk){
 const text=imgsToText(chunk);
 const compactText=compact(text);
 if(!compactText||compactText==='-')return {trigger:null,triggerTextJa:'-'};
 const m=compactText.match(/^【([^】]+)】/);
 const label=(m&&m[1]||'').replace(/トリガー/g,'');
 const key=Object.keys(TRIGGERS).find(k=>label===k||label.includes(k));
 return {trigger:key?TRIGGERS[key]:null,triggerTextJa:compactText};
}

function parseCard(html){
 const number=(html.match(/cardNumData">([^<]+)/)||[])[1]?.trim();
 const rarity=(html.match(/rareData">([^<]+)/)||[])[1]?.trim()||'';
 const nameBlock=(html.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
 const name=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
 const ruby=(nameBlock.match(/rubyData">([^<]*)/)||[])[1]?.trim()||'';
 const image=((html.match(/cardDataImgCol"><img src="([^"]+)"/)||[])[1]||'').replace(/\?v\d+$/,'');
 const absImage=image.startsWith('http')?image:'https://www.unionarena-tcg.com'+image;
 const need=parseNeed(dd(html,'needEnergyData'));
 const ap=Number(imgsToText(dd(html,'apData')))||0;
 const type=TYPES[imgsToText(dd(html,'categoryData'))]||null;
 const bp=parseBp(dd(html,'bpData'));
 const traits=parseTraits(dd(html,'attributeData'));
 const gen=parseGen(dd(html,'generatedEnergyData'));
 const effect=imgsToText(dd(html,'effectData'));
 const trig=parseTrigger(dd(html,'triggerData'));
 const color=need.color||gen.color;
 if(!color)throw Error((number||'?')+' has no printed color');
 if(!type)throw Error((number||'?')+' has no printed type');
 if(!name||name==='-')throw Error((number||'?')+' has no printed name');
 return {
  number,rarity,name,ruby,image:absImage,color,energy:need.energy,ap,type,
  bp:bp.bp,bpMark:bp.bpMark,gen:gen.gen,genMark:gen.genMark,traits,
  effect,effectJa:compact(effect),trigger:trig.trigger,triggerTextJa:trig.triggerTextJa,
  genAlt:gen.alt,genFilename:gen.filenameNumber,filenameDisagrees:gen.filenameDisagrees
 };
}

function mergeFaq(listHtml){
 const byCard=new Map();
 const units=listHtml.split('<section class="faqUnit">').slice(1);
 for(const unit of units){
  const id=(unit.match(/<h2 class="tit">(Q\d+)<span>([^<]*)<\/span>/)||[]);
  const cardNo=((unit.match(/<p class="cardID">([^<]*)<\/p>/)||[])[1]||'').trim();
  const q=((unit.match(/<div class="question[\s\S]*?<p>([\s\S]*?)<\/p>/)||[])[1]||'').trim();
  const a=((unit.match(/<div class="answer[\s\S]*?<p>([\s\S]*?)<\/p>/)||[])[1]||'').trim();
  if(!id[1]||!cardNo||!q||!a)continue;
  const key=cardNo.split('/').pop().replace(/_p\d+$/,'').replace(/★$/,'');
  const entry={id:id[1],date:id[2].trim(),q,a};
  if(!byCard.has(key))byCard.set(key,[]);
  byCard.get(key).push(entry);
 }
 return byCard;
}

async function listIds(series,file){
 const html=await get(
  `https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=${series}`,file);
 return [...new Set([...html.matchAll(/UA17(?:BT|ST)\/(TRK-1-(?:\d+|AP\d+★?)(?:_p\d+)?)/g)].map(m=>m[0]))];
}

async function mapPool(items,limit,fn){
 const out=new Array(items.length);
 let cursor=0;
 async function worker(){
  for(;;){
   const i=cursor++;
   if(i>=items.length)return;
   out[i]=await fn(items[i],i);
  }
 }
 await Promise.all(Array.from({length:limit},worker));
 return out;
}

function samePrint(a,b){
 const keys=['name','color','energy','ap','bp','bpMark','gen','genMark','type','effectJa','trigger','triggerTextJa'];
 for(const key of keys){
  if(JSON.stringify(a[key])!==JSON.stringify(b[key]))
   return key+':'+JSON.stringify(a[key])+'!='+JSON.stringify(b[key]);
 }
 if(JSON.stringify(a.traits)!==JSON.stringify(b.traits))return 'traits';
 return '';
}

async function main(){
 const bt=await listIds(570117,'bt-list.html');
 const st=await listIds(570017,'st-list.html');
 const refs=[...bt.map(number=>({set:'UA17BT',number})),...st.map(number=>({set:'UA17ST',number}))];
 const faqBt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA17BT','faq-bt.html'));
 const faqSt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA17ST','faq-st.html'));
 const parsed=await mapPool(refs,6,async ref=>{
  const full=ref.number.split('/')[1];
  if(/AP\d/.test(full))return null;
  const html=await get(
   `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(ref.number)}`,
   `${ref.set}-${full}-jp.html`);
  const card=parseCard(html);
  const printedBase=card.number.replace(/_p\d+$/,'');
  const askedBase=ref.number.replace(/_p\d+$/,'');
  if(printedBase!==askedBase)throw Error('number mismatch '+ref.number+' vs '+card.number);
  return {...card,set:ref.set,full};
 });
 const identities=new Map();
 const disagreements=[];
 for(const card of parsed){
  if(!card)continue;
  const base=card.full.replace(/_p\d+$/,'');
  const isParallel=/_p\d+$/.test(card.full);
  if(card.filenameDisagrees)disagreements.push({id:base,alt:card.genAlt,file:card.genFilename,gen:card.gen});
  if(!identities.has(base)){
   identities.set(base,{
    id:base,identity:base,
    number:`${card.set}/${base}`,
    name:card.name,nameJa:card.name,ruby:card.ruby,
    title:'toriko',set:card.set,sets:[card.set],printings:[],
    color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
    gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,
    rarity:isParallel?'':card.rarity,
    trigger:card.trigger,triggerTextJa:card.triggerTextJa,
    effect:card.effect==='-'?'-':card.effect,effectJa:card.effectJa,
    image:card.image,
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+base)}`,
    sourceTc:null,
    auto:false,engineKind:null,
    faq:[...(faqBt.get(base)||[]),...(faqSt.get(base)||[])]
   });
  }else{
   const row=identities.get(base);
   const drift=samePrint(row,{...card,name:card.name});
   if(!isParallel&&drift)throw Error(base+' '+card.set+' disagrees with '+row.set+' on '+drift);
   if(!row.sets.includes(card.set))row.sets.push(card.set);
   if(card.set==='UA17BT'&&!isParallel){
    row.set='UA17BT';
    row.number=`UA17BT/${base}`;
    row.image=card.image;
    row.rarity=card.rarity;
    row.source=`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('UA17BT/'+base)}`;
   }
  }
  const row=identities.get(base);
  row.printings.push({
   number:`${card.set}/${card.full}`,set:card.set,rarity:card.rarity,
   source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+card.full)}`,
   image:card.image
  });
  if(!isParallel&&!row.rarity)row.rarity=card.rarity;
 }
 const cards=[...identities.values()].sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
 const booster=cards.filter(c=>c.sets.includes('UA17BT')&&/^TRK-1-0?\d+$/.test(c.id)&&Number(c.id.slice(6))<=100);
 const starterOnly=cards.filter(c=>c.sets.length===1&&c.sets[0]==='UA17ST');
 if(booster.length!==100)throw Error('booster identities '+booster.length);
 for(const card of cards){
  const profile=trkProfile(card);
  card.engineKind=profile?.kind||null;
  if(profile?.handDiscount)card.handDiscount=profile.handDiscount;
  const seen=new Set();
  card.faq=card.faq.filter(entry=>{
   if(seen.has(entry.id))return false;
   seen.add(entry.id);
   return true;
  });
 }
 writeFileSync('/tmp/trk-cards.json',JSON.stringify(cards,null,1));
 const header=`// Official UA17BT / UA17ST トリコ catalogue, fetched ${new Date().toISOString().slice(0,10)}.
// Japanese card list: series 570117 (booster) and 570017 (starter).
// Traditional Chinese card pages for this product are still the coming-soon
// placeholder, so name and effect stay the Japanese official print.
// The deck-builder title is 美食獵人. The official TC product page says 為食獵人.
// One identity per card number. Parallel art is another printing. AP cards
// are not deck cards. BP+ is a design mark. Generated energy is the pip count
// in the 発生エナジー alt text. A trailing + is genMark and is not added to
// gen. The icon filename number is a sprite id. A required-energy dash is 0
// and still keeps the color character. A slash trait stays one printed token.
// engineKind is set only when trk-classify accepts the whole Japanese print.
// Registration is not an official FAQ certification.
export const TORIKO_FETCHED='${new Date().toISOString().slice(0,10)}';
export const TORIKO_SETS=Object.freeze(['UA17BT','UA17ST']);
export const TORIKO_CARDS=
`;
 writeFileSync(join(ROOT,'dist/toriko-cards.mjs'),
  header+JSON.stringify(cards,null,1).replace(/^/gm,'')+'\n;\nexport const TORIKO_BY_ID=Object.freeze(Object.fromEntries(TORIKO_CARDS.map(card=>[card.id,card])));\n');
 const kinds={};
 for(const c of cards)kinds[c.effectJa]=(kinds[c.effectJa]||0)+1;
 const repeated=Object.entries(kinds).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]);
 writeFileSync('/tmp/trk-effects.json',JSON.stringify({
  cards:cards.length,starterOnly:starterOnly.map(c=>c.id),
  disagreements,repeated,triggers:[...new Set(cards.map(c=>c.triggerTextJa))]
 },null,1));
 const iron=cards.find(c=>c.id==='TRK-1-005');
 console.log(JSON.stringify({
  cards:cards.length,
  registered:cards.filter(c=>c.engineKind).map(c=>c.id+' '+c.engineKind),
  starterOnly:starterOnly.map(c=>c.id),
  filenameDisagreements:disagreements.length,
  sample005:{gen:iron.gen,genMark:iron.genMark,energy:iron.energy,color:iron.color,engineKind:iron.engineKind},
  colors:cards.reduce((a,c)=>{a[c.color]=(a[c.color]||0)+1;return a;},{}),
  types:cards.reduce((a,c)=>{a[c.type]=(a[c.type]||0)+1;return a;},{}),
  repeated:repeated.length
 },null,2));
}

const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(invoked)main().catch(err=>{console.error(err);process.exit(1);});
