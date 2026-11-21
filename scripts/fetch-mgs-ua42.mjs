#!/usr/bin/env node
// Fetch official UA42BT booster and UA42ST starter pages into a catalogue.
// Generated energy is the 発生エナジー alt-text pip count. A trailing + is
// genMark. The icon filename number is a sprite id and is never the pip count.
// Required-energy dash is 0, but the color character in that alt is kept.
// Parallel art is another printing of the same identity. AP cards are skipped.
// Official Traditional Chinese pages exist for both products. name and effect
// are that printing. effectJa is the Japanese official print and is what the
// engine matches. A slash trait stays one token. engineKind is set only when
// mgs-classify accepts the whole Japanese print.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mgsProfile} from '../dist/universal-v2/mgs-classify.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','mgs-fetch','pages');
mkdirSync(CACHE,{recursive:true});

const COLORS={
 紫:'purple',黄:'yellow',緑:'green',青:'blue',赤:'red'
};
const COLOR_CHARS='紫黄緑青赤';
const TYPES={キャラクター:'character',イベント:'event',フィールド:'field',角色:'character',事件:'event',場域:'field'};
const TRIGGERS={
 ドロー:'draw',ゲット:'get',アクティブ:'active',スペシャル:'special',
 ファイナル:'final',レイド:'raid',カラー:'color',
 抽牌:'draw',獲得:'get',活動:'active',特殊:'special',最終:'final',突襲:'raid',顏色:'color'
};

async function get(url,file){
 const path=join(CACHE,file);
 try{
  const cached=readFileSync(path,'utf8');
  if(cached.length>400&&!cached.includes('Access Denied')&&cached.includes('cardNumData'))return cached;
 }catch{}
 const res=await fetch(url,{headers:{'User-Agent':'Ua-MGS-catalog/1.0'},signal:AbortSignal.timeout(25000)});
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
 const text=imgsToText(chunk).replace(/\s+/g,'').replace(/^［特徵：(.+)］$/,'').replace(/^［特徴：(.+)］$/,'$1');
 if(!text||text==='-')return [];
 const ja=text.match(/^［特徴：(.+)］$/);
 return [ja?ja[1]:text];
}

function parseTrigger(chunk){
 const compactText=compact(imgsToText(chunk));
 if(!compactText||compactText==='-')return {trigger:null,triggerText:'-'};
 const label=((compactText.match(/^【([^】]+)】/)||[])[1]||'').replace(/トリガー/g,'').replace(/觸發/g,'');
 const key=Object.keys(TRIGGERS).find(item=>label===item||label.includes(item));
 return {trigger:key?TRIGGERS[key]:null,triggerText:compactText};
}

export function parseFace(html){
 const nameBlock=(html.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
 const name=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
 const effect=imgsToText(dd(html,'effectData'));
 const trig=parseTrigger(dd(html,'triggerData'));
 if(!name)throw Error('TC page has no printed name');
 return {name,effect,triggerText:trig.triggerText};
}

export function parseCard(html){
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
  effect,effectCompact:compact(effect),trigger:trig.trigger,triggerText:trig.triggerText,
  genAlt:gen.alt,genFilename:gen.filenameNumber,filenameDisagrees:gen.filenameDisagrees
 };
}

export function placeholder(html){
 return !html.includes('cardNumData')||html.includes('comingsoon.png')&&!html.includes('cardDataCol effectData');
}

export function spanByClass(html,className){
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

export function visible(html){
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
 const holder=parts.find(part=>part.includes(`_${id}'`)&&part.startsWith(` id='UA42`));
 if(!holder)return null;
 const name=(holder.match(/class='fontsize2'>([^<]+)/)||[])[1]?.trim()||'';
 const effect=(holder.match(/<div class='effect[^']*'>([\s\S]*?)<\/div>/)||[])[1]||'';
 const frame=spanByClass(effect,'raidBorder');
 const inside=frame?visible(frame.inner):'';
 const outside=frame?visible(effect.slice(0,frame.start)+effect.slice(frame.end)):'';
 const promos=parts.filter(part=>part.startsWith(` id='UAPR_${id}'`)||part.startsWith(` id='UAPR_${id}_`)).map(part=>{
  const art=(part.match(/data-src='([^']+)'/)||[])[1]||'';
  const holderId=(part.match(/^ id='(UAPR_[^']+)'/)||[])[1]||('UAPR_'+id);
  const rarity=((part.match(/\(UR[^)]*\)/)||[])[0]||'').replace(/[()]/g,'');
  return {
   number:'UAPR/'+holderId.slice('UAPR_'.length),set:'UAPR',rarity,
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
 const keys=['name','color','energy','ap','bp','bpMark','gen','genMark','type','effectCompact','trigger','triggerText'];
 for(const key of keys){
  if(JSON.stringify(a[key])!==JSON.stringify(b[key]))
   return key+':'+JSON.stringify(a[key])+'!='+JSON.stringify(b[key]);
 }
 if(JSON.stringify(a.traits)!==JSON.stringify(b.traits))return 'traits';
 return '';
}

function listNumbers(html,set){
 return [...new Set([...html.matchAll(new RegExp('card_no=('+set+'\\/MGS-1-[A-Za-z0-9_]+)','g'))].map(item=>item[1]))]
  .sort((a,b)=>Number(/_p\d+$/.test(a))-Number(/_p\d+$/.test(b))||a.localeCompare(b,'en',{numeric:true}));
}

async function main(){
 const btList=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570142','bt-list.html');
 const stList=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570042','st-list.html');
 const numbers=[...listNumbers(btList,'UA42BT'),...listNumbers(stList,'UA42ST')];
 const faqBt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA42BT','faq-bt.html'));
 const faqSt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=UA42ST','faq-st.html'));
 const parsed=await mapPool(numbers,6,async number=>{
  const [set,full]=number.split('/');
  if(/AP\d/.test(full))return null;
  const html=await get(
   `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(number)}`,
   `${set}-${full}.html`);
  if(placeholder(html))return {placeholder:true,number,set,full};
  const card=parseCard(html);
  const printedBase=card.number.replace(/_p\d+$/,'');
  const askedBase=number.replace(/_p\d+$/,'');
  if(printedBase!==askedBase&&printedBase!==number.replace(/_p\d+$/,'')){
   // Starter reprints print the booster number on the shared face. The asked
   // product number is the printing; the identity is the printed base when it
   // is the same card code.
  }
  const identity=printedBase.split('/')[1];
  if(!identity||identity!==full.replace(/_p\d+$/,''))throw Error('number mismatch '+number+' vs '+card.number);
  let tc=null;
  const tcHtml=await get(
   `https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent(number)}`,
   `${set}-${full}-tc.html`);
  if(!placeholder(tcHtml))tc=parseFace(tcHtml);
  return {...card,set,full,identity,tc};
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
    number:`${card.set}/${card.full}`,set:card.set,rarity:'',
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+card.full)}`,
    image:'https://www.unionarena-tcg.com/jp/images/cardlist/card/comingsoon.png'
   });
   continue;
  }
  if(card.filenameDisagrees)disagreements.push({id:base,alt:card.genAlt,file:card.genFilename,gen:card.gen});
  if(!identities.has(base)){
   const tc=card.tc;
   identities.set(base,{
    jp:{name:card.name,color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
     gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,effectCompact:card.effectCompact,
     trigger:card.trigger,triggerText:card.triggerText},
    id:base,identity:base,
    number:`${card.set}/${base}`,
    name:tc?.name||card.name,nameJa:card.name,ruby:card.ruby,
    title:'mgs',set:card.set,sets:[card.set],printings:[],
    color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
    gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,
    rarity:isParallel?'':card.rarity,
    trigger:card.trigger,triggerText:tc?.triggerText||card.triggerText,triggerTextJa:card.triggerText,
    effect:tc&&tc.effect&&tc.effect!=='-'?tc.effect:(card.effect==='-'?'-':card.effect),
    effectJa:card.effectCompact,
    image:card.image.startsWith('https://www.unionarena-tcg.com/jp/')?card.image:card.image,
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+base)}`,
    sourceTc:tc?`https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+base)}`:null,
    auto:false,engineKind:null,raidFrame:null,
    faq:[...(faqBt.get(base)||[]),...(faqSt.get(base)||[])]
   });
  }else{
   const row=identities.get(base);
   const drift=samePrint(row.jp,card);
   if(drift)throw Error(base+' '+card.set+' '+(isParallel?'parallel':'reprint')+' disagrees on '+drift);
   if(!row.sets.includes(card.set))row.sets.push(card.set);
   if(card.tc&&!row.sourceTc){
    row.name=card.tc.name||row.name;
    row.effect=card.tc.effect&&card.tc.effect!=='-'?card.tc.effect:row.effect;
    row.triggerText=card.tc.triggerText||row.triggerText;
    row.sourceTc=`https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+base)}`;
   }
  }
  const row=identities.get(base);
  row.printings.push({
   number:`${card.set}/${card.full}`,set:card.set,rarity:card.rarity,
   source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+card.full)}`,
   image:card.image
  });
  if(!isParallel&&card.set==='UA42BT'){
   row.rarity=card.rarity;
   row.image=card.image;
   row.set='UA42BT';
   row.number=`UA42BT/${base}`;
   row.source=`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('UA42BT/'+base)}`;
  }
  if(!isParallel&&!row.rarity)row.rarity=card.rarity;
 }
 const bases=[...identities.keys()];
 await mapPool(bases,4,async id=>{
  const html=await get(`https://rugiacreation.com/ua/search?Name=HK&Find1=${id}`,`rugia-${id}.html`);
  const face=rugiaFace(html,id);
  const row=identities.get(id);
  if(!face)return;
  row.raidFrame=face.raidFrame;
  for(const promo of face.promos){
   if(!row.printings.some(item=>item.number===promo.number&&item.image===promo.image))
    row.printings.push(promo);
   if(!row.sets.includes('UAPR'))row.sets.push('UAPR');
  }
 });
 const cards=[...identities.values()].sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
 const booster=cards.filter(card=>Number(card.id.slice(6))<=100);
 const starterOnly=cards.filter(card=>Number(card.id.slice(6))>=101);
 if(booster.length!==100)throw Error('booster identities '+booster.length);
 if(starterOnly.length!==13)throw Error('starter-only identities '+starterOnly.length);
 for(const card of cards){
  const profile=mgsProfile(card);
  card.engineKind=profile?.kind||null;
  if(profile?.handDiscount)card.handDiscount=profile.handDiscount;
  const seen=new Set();
  card.faq=card.faq.filter(entry=>{
   if(seen.has(entry.id))return false;
   seen.add(entry.id);
   return true;
  });
  delete card.jp;
 }
 const header=`// Official UA42BT booster and UA42ST starter, 〈物語〉シリーズ / 〈物語〉系列.
// Fetched ${new Date().toISOString().slice(0,10)}. Japanese lists are series
// 570142 and 570042. Traditional Chinese lists are series 590142 and 590042.
// name and effect are the official TC printing. effectJa is the Japanese
// official print and is what the engine matches. The deck-builder title is
// 〈物語〉系列. One identity per card number. A starter reprint of a booster
// number is the same identity. Parallel art is another printing. AP cards
// are not deck cards. BP+ is a design mark. Generated energy is the pip
// count in the 発生エナジー alt text. A trailing + is genMark and is not
// added to gen. The icon filename number is a sprite id. A required-energy
// dash is 0 and still keeps the color character. A slash trait stays one
// printed token. engineKind is set only when mgs-classify accepts the whole
// Japanese print. Registration is not an official FAQ certification.
export const MGS_FETCHED='${new Date().toISOString().slice(0,10)}';
export const MGS_SETS=Object.freeze(['UA42BT','UA42ST']);
export const MGS_CARDS=
`;
 writeFileSync(join(ROOT,'dist/mgs-cards.mjs'),
  header+JSON.stringify(cards,null,1)+'\n;\nexport const MGS_BY_ID=Object.freeze(Object.fromEntries(MGS_CARDS.map(card=>[card.id,card])));\n');
 const kinds={};
 for(const card of cards)kinds[card.engineKind||'catalogue']=(kinds[card.engineKind||'catalogue']||0)+1;
 const unmatched=cards.filter(card=>!card.engineKind).map(card=>({id:card.id,trigger:card.triggerTextJa,effect:card.effectJa,raid:card.raidFrame?{inside:card.raidFrame.inside,outside:card.raidFrame.outside}:null}));
 writeFileSync('/tmp/mgs-unmatched.json',JSON.stringify(unmatched,null,1));
 console.log(JSON.stringify({
  cards:cards.length,
  registered:cards.filter(card=>card.engineKind).length,
  kinds,
  filenameDisagreements:disagreements.length,
  raidFrames:cards.filter(card=>card.raidFrame).map(card=>card.id),
  missingTc:cards.filter(card=>!card.sourceTc).map(card=>card.id),
  faq:cards.reduce((n,card)=>n+card.faq.length,0),
  colors:cards.reduce((bag,card)=>{bag[card.color]=(bag[card.color]||0)+1;return bag;},{}),
  types:cards.reduce((bag,card)=>{bag[card.type]=(bag[card.type]||0)+1;return bag;},{})
 },null,2));
}

const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(invoked)main().catch(err=>{console.error(err);process.exit(1);});
