#!/usr/bin/env node
// Fetch official EX18BT 〈物語〉シリーズ Vol.2 into dist/mgs-vol2.mjs.
// Generated energy is the 発生エナジー alt-text pip count. A trailing + is
// genMark. The icon filename number is a sprite id and is never the pip count.
// Required-energy dash is 0, but the color character in that alt is kept.
// Parallel art is another printing of the same identity. AP cards are skipped.
// Packed Vol.1 parallels stay on the Vol.1 identity and are not new cards.
// Official Traditional Chinese pages are not published for series 590218 yet.
// name and effect therefore repeat the official Japanese print. effectJa is
// the compact Japanese print and is what the engine matches. engineKind is
// set only when the classifier accepts the whole print.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mgs2Profile} from '../dist/universal-v2/mgs2-classify.mjs';
import {parseCard,placeholder,spanByClass,visible} from './fetch-mgs-ua42.mjs';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','mgs-fetch','ex18');
mkdirSync(CACHE,{recursive:true});

async function get(url,file){
 const path=join(CACHE,file);
 try{
  const cached=readFileSync(path,'utf8');
  if(cached.length>400&&!cached.includes('Access Denied'))return cached;
 }catch{}
 const res=await fetch(url,{headers:{'User-Agent':'Ua-MGS-catalog/1.0'},signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error(url+' -> '+res.status);
 const text=await res.text();
 writeFileSync(path,text);
 return text;
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

function listNumbers(html){
 return [...new Set([...html.matchAll(/card_no=(EX18BT\/MGS-[12]-[A-Za-z0-9_]+)/g)].map(item=>item[1]))]
  .sort((a,b)=>Number(/_p\d+$/.test(a))-Number(/_p\d+$/.test(b))||a.localeCompare(b,'en',{numeric:true}));
}

function rugiaFrames(html){
 const frames=new Map();
 const parts=html.split("<span class='cardHolder'");
 for(const part of parts){
  const id=(part.match(/^ id='EX18BT_(MGS-2-\d+)'/)||[])[1];
  if(!id)continue;
  const effect=(part.match(/<div class='effect[^']*'>([\s\S]*?)<\/div>/)||[])[1]||'';
  const frame=spanByClass(effect,'raidBorder');
  frames.set(id,frame?{
   source:'rugia-hk',
   inside:visible(frame.inner),
   outside:visible(effect.slice(0,frame.start)+effect.slice(frame.end)),
   wholeInside:visible(effect.slice(0,frame.start)+effect.slice(frame.end))===''
  }:null);
 }
 return frames;
}

async function main(){
 const list=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570218','list.html');
 const numbers=listNumbers(list);
 const faq=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=EX18BT','faq.html'));
 const parsed=await mapPool(numbers,6,async number=>{
  const full=number.split('/')[1];
  if(/AP\d/.test(full))return null;
  const html=await get(
   `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(number)}`,
   `${full}.html`);
  if(placeholder(html))return {placeholder:true,number,full};
  const card=parseCard(html);
  const identity=card.number.split('/')[1].replace(/_p\d+$/,'');
  if(identity!==full.replace(/_p\d+$/,''))throw Error('number mismatch '+number+' vs '+card.number);
  return {...card,full,identity,tc:null};
 });
 const identities=new Map();
 const vol1Printings=[];
 const disagreements=[];
 for(const card of parsed){
  if(!card)continue;
  const base=card.full.replace(/_p\d+$/,'');
  if(base.startsWith('MGS-1-')){
   vol1Printings.push(card);
   continue;
  }
  const isParallel=/_p\d+$/.test(card.full);
  if(card.placeholder){
   const row=identities.get(base);
   if(!row)continue;
   row.printings.push({
    number:`EX18BT/${card.full}`,set:'EX18BT',rarity:'',
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX18BT/'+card.full)}`,
    image:'https://www.unionarena-tcg.com/jp/images/cardlist/card/comingsoon.png'
   });
   continue;
  }
  if(card.filenameDisagrees)disagreements.push({id:base,alt:card.genAlt,file:card.genFilename,gen:card.gen});
  if(!identities.has(base)){
   identities.set(base,{
    jp:{name:card.name,color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
     gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,effectCompact:card.effectCompact,
     trigger:card.trigger,triggerText:card.triggerText},
    id:base,identity:base,
    number:`EX18BT/${base}`,
    name:card.tc?.name||card.name,nameJa:card.name,ruby:card.ruby,
    title:'mgs',set:'EX18BT',sets:['EX18BT'],printings:[],
    color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
    gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,
    rarity:isParallel?'':card.rarity,
    trigger:card.trigger,
    triggerText:card.tc?.triggerText||card.triggerText,
    triggerTextJa:card.triggerText,
    effect:card.tc?.effect&&card.tc.effect!=='-'?card.tc.effect:card.effect,
    effectJa:card.effectCompact,
    image:card.image,
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX18BT/'+base)}`,
    sourceTc:card.tc?`https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX18BT/'+base)}`:null,
    auto:false,engineKind:null,raidFrame:null,
    faq:faq.get(base)||[]
   });
  }else{
   const drift=samePrint(identities.get(base).jp,card);
   if(drift)throw Error(base+' parallel disagrees on '+drift);
  }
  const row=identities.get(base);
  row.printings.push({
   number:`EX18BT/${card.full}`,set:'EX18BT',rarity:card.rarity,
   source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX18BT/'+card.full)}`,
   image:card.image
  });
  if(!isParallel){
   row.rarity=card.rarity;
   row.image=card.image;
  }
 }
 const rugia=rugiaFrames(await get('https://rugiacreation.com/ua/search?Name=HK&Find1=EX18BT','rugia-ex18.html'));
 for(const [id,frame] of rugia){
  const row=identities.get(id);
  if(row)row.raidFrame=frame;
 }
 const cards=[...identities.values()].sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
 if(cards.length!==73)throw Error('EX18BT identities '+cards.length);
 for(const card of cards){
  const profile=mgs2Profile(card);
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
 const fetched=new Date().toISOString().slice(0,10);
 const header=`// Official EX18BT 〈物語〉シリーズ Vol.2 / 〈物語〉系列 Vol.2.
// Fetched ${fetched}. Japanese list is series 570218. The Traditional Chinese
// card list does not publish series 590218 yet, so name and effect repeat the
// official Japanese print. effectJa is the compact Japanese print and is what
// the engine matches. Parallel art is another printing. AP cards are not deck
// cards. Packed UA42 parallels stay on the Vol.1 identity. BP+ is a design
// mark. Generated energy is the pip count in the 発生エナジー alt text. A
// trailing + is genMark and is not added to gen. The icon filename number is
// a sprite id. A required-energy dash is 0 and still keeps the color
// character. A slash trait stays one printed token. Raid frames are Rugia HK
// span.raidBorder. engineKind is set only when mgs2-classify accepts the
// whole Japanese print. Registration is not an official FAQ certification.
export const MGS2_FETCHED='${fetched}';
export const MGS2_SET='EX18BT';
export const MGS2_VOL1_PARALLELS=${JSON.stringify(vol1Printings.filter(card=>card&&!card.placeholder).map(card=>({
 number:'EX18BT/'+card.full,identity:card.identity,rarity:card.rarity,image:card.image
})),null,1)};
export const MGS2_CARDS=
`;
 writeFileSync(join(ROOT,'dist/mgs-vol2.mjs'),
  header+JSON.stringify(cards,null,1)+'\n;\nexport const MGS2_BY_ID=Object.freeze(Object.fromEntries(MGS2_CARDS.map(card=>[card.id,card])));\n');
 const unmatched=cards.filter(card=>!card.engineKind).map(card=>({
  id:card.id,type:card.type,color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,
  trigger:card.triggerTextJa,traits:card.traits,effect:card.effectJa,
  raid:card.raidFrame?{inside:card.raidFrame.inside,outside:card.raidFrame.outside,whole:card.raidFrame.wholeInside}:null
 }));
 writeFileSync('/tmp/mgs2-unmatched.json',JSON.stringify(unmatched,null,1));
 console.log(JSON.stringify({
  cards:cards.length,
  registered:cards.filter(card=>card.engineKind).length,
  filenameDisagreements:disagreements,
  raidFrames:cards.filter(card=>card.raidFrame).map(card=>card.id),
  missingRugia:cards.filter(card=>!rugia.has(card.id)).map(card=>card.id),
  officialTc:cards.filter(card=>card.sourceTc).map(card=>card.id),
  faq:cards.reduce((n,card)=>n+card.faq.length,0),
  vol1:vol1Printings.map(card=>card.full||card.number),
  colors:cards.reduce((bag,card)=>{bag[card.color]=(bag[card.color]||0)+1;return bag;},{}),
  types:cards.reduce((bag,card)=>{bag[card.type]=(bag[card.type]||0)+1;return bag;},{})
 },null,2));
}

const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1];
if(invoked)main().catch(err=>{console.error(err);process.exit(1);});
