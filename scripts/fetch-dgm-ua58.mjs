#!/usr/bin/env node
// Fetch official UA58BT D.Gray-man pages into a catalogue.
// Generated energy is the 発生エナジー alt-text pip count. A trailing + is
// genMark. The icon filename number is a sprite id and is never the pip count.
// Required-energy dash is 0, but the color character in that alt is kept.
// Parallel art is another printing of the same identity. AP cards are skipped.
// Official Traditional Chinese card pages do not list this product yet.
// Display names and effects use the Rugia HK printing and are not an official
// TC page. effectJa stays the Japanese official print. A slash trait stays
// one token. engineKind is set only when dgm-classify accepts the whole print.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DGM_ZH_FALLBACKS} from '../dist/dgm-zh-fallbacks.mjs';
import {dgmProfile} from '../dist/universal-v2/dgm-classify.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','dgm-fetch','pages');
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
  if(cached.length>400&&!cached.includes('Access Denied'))return cached;
 }catch{}
 const res=await fetch(url,{headers:{'User-Agent':'Ua-DGM-catalog/1.0'},signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error(url+' -> '+res.status);
 const text=await res.text();
 writeFileSync(path,text);
 return text;
}

function dd(html,cls){
 const match=html.match(new RegExp(`cardDataCol ${cls}[\\s\\S]*?<dd class="cardDataContents">([\\s\\S]*?)</dd>`));
 return match?match[1].trim():'';
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
 return String(text||'').replace(/\r/g,'').replace(/\s+/g,'')||'-';
}

export function parseNeed(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 const colorChar=[...alt].find(ch=>COLOR_CHARS.includes(ch));
 const color=COLORS[colorChar]||null;
 if(!alt||alt==='-'||alt==='--')return {energy:0,color,alt};
 if(/[-－]$/.test(alt)&&!/\d/.test(alt))return {energy:0,color,alt};
 const num=(alt.match(/(\d+)/)||[])[1];
 return {energy:num==null?0:Number(num),color,alt};
}

export function parseGen(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 const file=(chunk.match(/ico_resource_energy_[a-z]+(\d+)\.png/)||[])[1];
 const filenameNumber=file==null?null:Number(file);
 if(!alt||alt==='-')return {gen:0,genMark:'',color:null,alt,filenameNumber,filenameDisagrees:false};
 let gen=0,genMark='',color=null;
 for(const ch of alt){
  if(COLOR_CHARS.includes(ch)){gen+=1;color=COLORS[ch];}
  else if(ch==='+')genMark='+';
  else if(/\d/.test(ch))throw Error('generated-energy alt contains a digit: '+alt);
 }
 return {gen,genMark,color,alt,filenameNumber,filenameDisagrees:filenameNumber!=null&&filenameNumber!==gen};
}

function parseBp(chunk){
 const raw=imgsToText(chunk).replace(/\s+/g,'');
 if(!raw||raw==='-')return {bp:0,bpMark:''};
 const match=raw.match(/(\d+)(\+)?/);
 return {bp:match?Number(match[1]):0,bpMark:match&&match[2]?'+':''};
}

function parseTraits(chunk){
 const text=imgsToText(chunk).replace(/\s+/g,'').replace(/^［特徴：(.+)］$/,'$1');
 if(!text||text==='-')return [];
 return [text];
}

function parseTrigger(chunk){
 const compactText=compact(imgsToText(chunk));
 if(!compactText||compactText==='-')return {trigger:null,triggerTextJa:'-'};
 const label=((compactText.match(/^【([^】]+)】/)||[])[1]||'').replace(/トリガー/g,'');
 const key=Object.keys(TRIGGERS).find(item=>label===item||label.includes(item));
 return {trigger:key?TRIGGERS[key]:null,triggerTextJa:compactText};
}

function parseCard(html){
 const number=(html.match(/cardNumData">([^<]+)/)||[])[1]?.trim();
 const rarity=(html.match(/rareData">([^<]+)/)||[])[1]?.trim()||'';
 const nameBlock=(html.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
 const name=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
 const ruby=(nameBlock.match(/rubyData">([^<]*)/)||[])[1]?.trim()||'';
 const image=((html.match(/cardDataImgCol"><img src="([^"]+)"/)||[])[1]||'').replace(/\?v\d*$/,'');
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

function placeholder(html){
 return !html.includes('cardNumData')||html.includes('comingsoon.png')&&!html.includes('cardDataCol effectData');
}

function spanByClass(html,className){
 const token=`<span class="${className}`;
 const start=html.indexOf(token);
 if(start<0)return null;
 let cursor=html.indexOf('>',start)+1;
 let depth=1;
 const innerStart=cursor;
 while(cursor<html.length&&depth){
  const open=html.indexOf('<span',cursor);
  const close=html.indexOf('</span>',cursor);
  if(close<0)return null;
  if(open>=0&&open<close){depth+=1;cursor=open+5;continue;}
  depth-=1;
  if(depth===0)return {start,end:close+7,inner:html.slice(innerStart,close)};
  cursor=close+7;
 }
 return null;
}

function visible(html){
 return html
  .replace(/<br\s*\/?>/gi,'')
  .replace(/<img[^>]*>/gi,'')
  .replace(/<[^>]+>/g,'')
  .replace(/\u00a0/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}

function rugiaFace(html,id){
 const parts=html.split("<span class='cardHolder'");
 const holder=parts.find(part=>part.startsWith(` id='UA58BT_${id}'`));
 if(!holder)return null;
 const name=(holder.match(/class='fontsize2'>([^<]+)/)||[])[1]?.trim()||'';
 const effect=(holder.match(/<div class='effect[^']*'>([\s\S]*?)<\/div>/)||[])[1]||'';
 const frame=spanByClass(effect,'raidBorder');
 const inside=frame?visible(frame.inner):'';
 const outside=frame?visible(effect.slice(0,frame.start)+effect.slice(frame.end)):'';
 const promos=parts.filter(part=>part.startsWith(` id='UAPR_${id}'`)||part.startsWith(` id='UAPR_${id}_`)).map(part=>{
  const art=(part.match(/data-src='([^']+)'/)||[])[1]||'';
  const holder=(part.match(/^ id='(UAPR_[^']+)'/)||[])[1]||('UAPR_'+id);
  const rarity=((part.match(/\(UR[^)]*\)/)||[])[0]||'').replace(/[()]/g,'');
  return {
   number:'UAPR/'+holder.slice('UAPR_'.length),set:'UAPR',rarity,
   source:'https://rugiacreation.com/ua/search?Name=HK&Find1='+id,
   image:art?('https://rugiacreation.com/ua/'+art.replace(/^\//,'')):null
  };
 });
 return {
  name,
  effect:visible(effect),
  raidFrame:frame?{source:'rugia-hk',inside,outside,wholeInside:outside===''}:null,
  promos
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

async function mapPool(items,limit,fn){
 const out=new Array(items.length);
 let cursor=0;
 async function worker(){
  for(;;){
   const index=cursor++;
   if(index>=items.length)return;
   out[index]=await fn(items[index],index);
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
 const list=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570158','bt-list.html');
 const numbers=[...new Set([...list.matchAll(/card_no=(UA58BT\/DGM-1-[A-Za-z0-9_]+)/g)].map(item=>item[1]))]
  .sort((a,b)=>Number(/_p\d+$/.test(a))-Number(/_p\d+$/.test(b))||a.localeCompare(b,'en',{numeric:true}));
 const faq=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA58BT','faq.html'));
 const parsed=await mapPool(numbers,6,async number=>{
  const full=number.split('/')[1];
  if(/AP\d/.test(full))return null;
  const html=await get(
   `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(number)}`,
   `UA58BT-${full}.html`);
  if(placeholder(html))return {placeholder:true,number,full};
  const card=parseCard(html);
  const printedBase=card.number.replace(/_p\d+$/,'');
  const askedBase=number.replace(/_p\d+$/,'');
  if(printedBase!==askedBase)throw Error('number mismatch '+number+' vs '+card.number);
  return {...card,set:'UA58BT',full};
 });
 const identities=new Map();
 const disagreements=[];
 for(const card of parsed){
  if(!card)continue;
  const base=card.full.replace(/_p\d+$/,'');
  const isParallel=/_p\d+$/.test(card.full);
  if(card.placeholder){
   const row=identities.get(base);
   if(!row)continue;
   row.printings.push({
    number:`UA58BT/${card.full}`,set:'UA58BT',rarity:'',
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('UA58BT/'+card.full)}`,
    image:'https://www.unionarena-tcg.com/jp/images/cardlist/card/comingsoon.png'
   });
   continue;
  }
  if(card.filenameDisagrees)disagreements.push({id:base,alt:card.genAlt,file:card.genFilename,gen:card.gen});
  if(!identities.has(base)){
   identities.set(base,{
    id:base,identity:base,
    number:`UA58BT/${base}`,
    name:card.name,nameJa:card.name,ruby:card.ruby,
    title:'dgm',set:'UA58BT',sets:['UA58BT'],printings:[],
    color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
    gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,
    rarity:isParallel?'':card.rarity,
    trigger:card.trigger,triggerTextJa:card.triggerTextJa,
    effect:card.effect==='-'?'-':card.effect,effectJa:card.effectJa,
    image:card.image,
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('UA58BT/'+base)}`,
    sourceTc:null,nameHk:null,effectHk:null,raidFrame:null,
    auto:false,engineKind:null,
    faq:faq.get(base)||[]
   });
  }else{
   const drift=samePrint(identities.get(base),card);
   if(drift)throw Error(base+' '+(isParallel?'parallel':'reprint')+' disagrees on '+drift);
  }
  const row=identities.get(base);
  row.printings.push({
   number:`UA58BT/${card.full}`,set:'UA58BT',rarity:card.rarity,
   source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('UA58BT/'+card.full)}`,
   image:card.image
  });
  if(!isParallel)row.rarity=card.rarity;
 }
 const bases=[...identities.keys()];
 await mapPool(bases,4,async id=>{
  const html=await get(`https://rugiacreation.com/ua/search?Name=HK&Find1=${id}`,`rugia-${id}.html`);
  const face=rugiaFace(html,id);
  const row=identities.get(id);
  if(!face||!face.name)return;
  row.nameHk=face.name;
  row.effectHk=face.effect||null;
  row.raidFrame=face.raidFrame;
  row.name=face.name;
  if(face.effect)row.effect=face.effect;
  for(const promo of face.promos){
   if(!row.printings.some(item=>item.number===promo.number&&item.image===promo.image))
    row.printings.push(promo);
   if(!row.sets.includes('UAPR'))row.sets.push('UAPR');
  }
 });
 const cards=[...identities.values()].sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
 if(cards.length!==80)throw Error('booster identities '+cards.length);
 for(const card of cards){
  const expected=Number(card.id.slice(6));
  if(!Number.isInteger(expected)||expected<1||expected>80)throw Error('unexpected id '+card.id);
  const fallback=DGM_ZH_FALLBACKS[card.id];
  if(fallback){
   if(!card.nameHk)card.name=fallback[0];
   if(!card.effectHk)card.effect=fallback[1];
  }
  const profile=dgmProfile(card);
  card.engineKind=profile?.kind||null;
  if(profile?.handDiscount)card.handDiscount=profile.handDiscount;
  const seen=new Set();
  card.faq=card.faq.filter(entry=>{
   if(seen.has(entry.id))return false;
   seen.add(entry.id);
   return true;
  });
 }
 const header=`// Official UA58BT D.Gray-man catalogue, fetched ${new Date().toISOString().slice(0,10)}.
// Japanese card list: series 570158. Official Traditional Chinese card pages
// do not list this product (the TC series menu stops at UA57BT). Display
// name and effect use Rugia HK where available; missing entries are manually
// translated from the Japanese print. nameHk/effectHk retain source provenance.
// effectJa is the Japanese official print and is what the engine matches.
// The deck-builder title is 驅魔少年. One identity per card number. Parallel
// art is another printing. AP cards are not deck cards. BP+ is a design mark.
// Generated energy is the pip count in the 発生エナジー alt text. A trailing
// + is genMark and is not added to gen. The icon filename number is a sprite
// id. A required-energy dash is 0 and still keeps the color character. A
// slash trait stays one printed token. engineKind is set only when
// dgm-classify accepts the whole Japanese print. A raid frame that contains
// a sentence stays out of the shared pack until that split is implemented.
// Registration is not an official FAQ certification.
export const DGM_FETCHED='${new Date().toISOString().slice(0,10)}';
export const DGM_SETS=Object.freeze(['UA58BT']);
export const DGM_CARDS=
`;
 writeFileSync(join(ROOT,'dist/dgm-cards.mjs'),
  header+JSON.stringify(cards,null,1)+'\n;\nexport const DGM_BY_ID=Object.freeze(Object.fromEntries(DGM_CARDS.map(card=>[card.id,card])));\n');
 const kinds={};
 for(const card of cards)kinds[card.engineKind||'catalogue']=(kinds[card.engineKind||'catalogue']||0)+1;
 console.log(JSON.stringify({
  cards:cards.length,
  registered:cards.filter(card=>card.engineKind).map(card=>card.id+' '+card.engineKind),
  kinds,
  filenameDisagreements:disagreements,
  raidFrames:cards.filter(card=>card.raidFrame).map(card=>card.id),
  missingHk:cards.filter(card=>!card.nameHk).map(card=>card.id),
  colors:cards.reduce((bag,card)=>{bag[card.color]=(bag[card.color]||0)+1;return bag;},{}),
  triggers:[...new Set(cards.map(card=>card.triggerTextJa))]
 },null,2));
}

const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(invoked)main().catch(err=>{console.error(err);process.exit(1);});
