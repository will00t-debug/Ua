#!/usr/bin/env node
// Official EX14BT booster for 「マクロス」シリーズ Vol.2.
// Japanese pages are the rules authority. The published Bandai TC card page
// is the display text. Rugia HK is used only to split span.raidBorder.
// Generated energy is the 発生エナジー alt-text pip count. A trailing + is
// genMark, not an extra pip. A required-energy dash is 0. Parallel art is
// another printing of the same identity. AP cards are not deck cards.
// EX14BT/MCR-2-071's printed page omitted 1枚. The 2026-09-18 correction is
// the rules text.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','mcr-fetch','ex14');
mkdirSync(CACHE,{recursive:true});
const FETCHED='2026-11-25';

const COLORS={紫:'purple',黄:'yellow',緑:'green',青:'blue',赤:'red'};
const COLOR_CHARS='紫黄緑青赤';
const TYPES={
 キャラクター:'character',イベント:'event',フィールド:'field',
 アクションポイント:'action-point'
};
const TRIGGERS={
 ドロー:'draw',ゲット:'get',アクティブ:'active',スペシャル:'special',
 ファイナル:'final',レイド:'raid',カラー:'color'
};
const RUGIA_ICONS={
 'ico_turn1.png':'【每回合1次】',
 'ico_trigger_color.png':'【顏色】',
 'ico_trigger_draw.png':'【抽牌】',
 'ico_trigger_get.png':'【獲得】',
 'ico_trigger_active.png':'【活動】',
 'ico_trigger_special.png':'【特殊】',
 'ico_trigger_final.png':'【最終】',
 'ico_trigger_raid.png':'【突襲】',
 'ico_trigger_life.png':'【生命】',
 'ico_raid.png':'【突襲】',
 'ico_circle_yellow.png':'【黃】',
 'ico_circle_blue.png':'【藍】',
 'ico_circle_red.png':'【紅】',
 'ico_circle_purple.png':'【紫】',
 'ico_hexa_yellow.png':'【黃】',
 'ico_hexa_blue.png':'【藍】',
 'ico_hexa_red.png':'【紅】',
 'ico_hexa_purple.png':'【紫】',
 'ico_hexa_yellow2.png':'【黃×2】',
 'ico_hexa_blue2.png':'【藍×2】',
 'ico_hexa_red2.png':'【紅×2】',
 'ico_hexa_purple2.png':'【紫×2】',
 'keyword_impact_nullify.png':'【衝擊無效】',
 'keyword_impact.png':'【衝擊】',
 'keyword_impact1.png':'【衝擊（1）】',
 'keyword_impact+1.png':'【衝擊+1】',
 'keyword_damage2.png':'【傷害（2）】',
 'keyword_step.png':'【移動】',
 'keyword_2timesattack.png':'【2次攻擊】',
 'keyword_snipe.png':'【狙擊】'
};

async function get(url,file){
 const path=join(CACHE,file);
 try{
  const cached=readFileSync(path,'utf8');
  if(cached.length>400&&!cached.includes('Access Denied')){
   if(url.includes('rugiacreation')&&cached.includes("cardHolder"))return cached;
   if(!url.includes('rugiacreation')&&cached.includes('cardNumData'))return cached;
  }
 }catch{}
 let last=null;
 for(let attempt=0;attempt<4;attempt++){
  try{
   const res=await fetch(url,{
    headers:{'User-Agent':'Ua-MCR-catalog/1.0'},
    signal:AbortSignal.timeout(25000)
   });
   if(!res.ok)throw Error(url+' -> '+res.status);
   const text=await res.text();
   if(text.length<400)throw Error(url+' short body');
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
 return String(text||'').replace(/\s+/g,'');
}
function parseNeed(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 const colorChar=[...alt].find(ch=>COLOR_CHARS.includes(ch));
 const color=COLORS[colorChar]||null;
 if(!alt||alt==='-'||alt==='--')return {energy:0,color,alt};
 if(/[-－]$/.test(alt)&&!/\d/.test(alt))return {energy:0,color,alt};
 const num=(alt.match(/(\d+)/)||[])[1];
 return {energy:num==null?0:Number(num),color,alt};
}
function parseGen(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 if(!alt||alt==='-')return {gen:0,genMark:'',color:null,alt};
 let gen=0,genMark='',color=null;
 for(const ch of alt){
  if(COLOR_CHARS.includes(ch)){gen+=1;color=COLORS[ch];}
  else if(ch==='+')genMark='+';
  else if(/\d/.test(ch))throw Error('generated-energy alt contains a digit: '+alt);
 }
 return {gen,genMark,color,alt};
}
function parseBp(chunk){
 const raw=imgsToText(chunk).replace(/\s+/g,'');
 if(!raw||raw==='-')return {bp:0,bpMark:''};
 const match=raw.match(/(\d+)(\+)?/);
 return {bp:match?Number(match[1]):0,bpMark:match&&match[2]?'+':''};
}
function parseTraits(chunk){
 const text=imgsToText(chunk).replace(/\s+/g,' ').trim()
  .replace(/^［特徴：(.+)］$/,'$1').replace(/^［特徵：(.+)］$/,'$1');
 if(!text||text==='-')return [];
 return [text];
}
function parseTrigger(chunk){
 const text=imgsToText(chunk);
 const compactText=compact(text);
 if(!compactText||compactText==='-')return {trigger:null,triggerText:'',triggerTextJa:''};
 const label=((compactText.match(/^【([^】]+)】/)||[])[1]||'').replace(/トリガー/g,'');
 const key=Object.keys(TRIGGERS).find(item=>label===item||label.includes(item));
 return {trigger:key?TRIGGERS[key]:null,triggerText:text,triggerTextJa:compactText};
}
function parseCard(html){
 const number=(html.match(/cardNumData[^>]*>([^<]+)/)||[])[1]?.trim();
 const rarity=(html.match(/rareData">([^<]+)/)||[])[1]?.trim()||'';
 const nameBlock=(html.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
 const name=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
 const ruby=(nameBlock.match(/rubyData">([^<]*)/)||[])[1]?.trim()||'';
 const image=((html.match(/cardDataImgCol[^"]*"><img src="([^"]+)"/)||[])[1]||'').replace(/\?v\d*$/,'');
 const absImage=image.startsWith('http')?image:'https://www.unionarena-tcg.com'+image;
 const need=parseNeed(dd(html,'needEnergyData'));
 const apText=imgsToText(dd(html,'apData')).replace(/\s+/g,'');
 const ap=apText==='-'||apText===''?0:Number(apText);
 const type=TYPES[imgsToText(dd(html,'categoryData')).replace(/\s+/g,'')]||null;
 const bp=parseBp(dd(html,'bpData'));
 const traits=parseTraits(dd(html,'attributeData'));
 const gen=parseGen(dd(html,'generatedEnergyData'));
 const effect=imgsToText(dd(html,'effectData'));
 const trig=parseTrigger(dd(html,'triggerData'));
 const color=need.color||gen.color;
 if(!number)throw Error('page has no card number');
 if(!color&&type!=='action-point')throw Error(number+' has no printed color');
 if(!type)throw Error(number+' has no printed type '+imgsToText(dd(html,'categoryData')));
 if(!name||name==='-')throw Error(number+' has no printed name');
 if(!Number.isInteger(ap))throw Error(number+' bad AP '+apText);
 return {
  number,rarity,name,ruby,image:absImage,color,energy:need.energy,ap,type,
  bp:bp.bp,bpMark:bp.bpMark,gen:gen.gen,genMark:gen.genMark,traits,
  effect:effect||'-',effectCompact:compact(effect)||'-',
  trigger:trig.trigger,triggerTextJa:trig.triggerTextJa||'-',
  needAlt:need.alt,genAlt:gen.alt
 };
}
function listNumbers(html,set){
 return [...new Set([...html.matchAll(new RegExp('card_no=('+set+'%2F|'+set+'\\/)(MCR-2-[A-Za-z0-9_]+)','g'))].map(item=>set+'/'+item[2]))]
  .sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
}
function spanByClass(html,className){
 const token=`<span class="${className}`;
 const alt=`<span class='${className}`;
 const start=html.indexOf(token)>=0?html.indexOf(token):html.indexOf(alt);
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
function rugiaVisible(html){
 const unknown=[];
 const text=html
  .replace(/<br\s*\/?>/gi,'\n')
  .replace(/<img[^>]*src="([^"]+)"[^>]*>/gi,(_,src)=>{
   const file=src.split('/').pop().split('?')[0];
   if(RUGIA_ICONS[file])return RUGIA_ICONS[file];
   unknown.push(file);
   return '【'+file+'】';
  })
  .replace(/<a [^>]*>([\s\S]*?)<\/a>/gi,'$1')
  .replace(/<span class="timing">([\s\S]*?)<\/span>/gi,(_,body)=>'【'+body.replace(/&nbsp;?/g,'').replace(/\u00a0/g,'').trim()+'】')
  .replace(/<span class="underline">([\s\S]*?)<\/span>/gi,(_,body)=>'【'+body.replace(/&nbsp;?/g,'').replace(/\u00a0/g,'').trim()+'】')
  .replace(/<[^>]+>/g,'')
  .replace(/&nbsp;/g,' ')
  .replace(/\u00a0/g,' ')
  .replace(/[ \t]+\n/g,'\n')
  .replace(/\n{2,}/g,'\n')
  .replace(/[ \t]{2,}/g,' ')
  .replace(/】\s*【/g,'】【')
  .trim();
 return {text,unknown};
}
function rugiaFace(html,id){
 const parts=html.split("<span class='cardHolder'");
 const holders=parts.filter(part=>part.includes(`_${id}'`)||part.includes(`_${id}_`));
 const exact=holders.find(part=>part.includes(`id='EX14BT_${id}'`))
  ||holders.find(part=>part.includes(`_${id}'`));
 if(!exact)return null;
 const name=(exact.match(/class='fontsize(?:2|_cardname)'>([^<]+)/)||[])[1]?.trim()||'';
 const effect=(exact.match(/<div class='effect[^']*'>([\s\S]*?)<\/div>/)||[])[1]||'';
 const trigger=(exact.match(/<div class='trigger'>([\s\S]*?)<\/div>/)||[])[1]||'';
 const frame=spanByClass(effect,'raidBorder');
 const inside=frame?rugiaVisible(frame.inner).text:'';
 const outside=frame?rugiaVisible(effect.slice(0,frame.start)+effect.slice(frame.end)).text:'';
 const shown=rugiaVisible(effect);
 const trig=rugiaVisible(trigger);
 return {
  name,
  effect:shown.text||'-',
  triggerText:trig.text||'-',
  unknown:[...shown.unknown,...trig.unknown],
  raidFrame:frame?{source:'rugia-hk',inside,outside,wholeInside:outside===''}:null
 };
}
function mergeFaq(listHtml){
 const byCard=new Map();
 const units=listHtml.split('faqUnit">').slice(1);
 for(const unit of units){
  const id=(unit.match(/<h2 class="tit">(Q\d+)/)||[])[1];
  const date=(unit.match(/<h2 class="tit">Q\d+<span>([^<]*)<\/span>/)||[])[1]||'';
  const cardNo=((unit.match(/<p class="cardID">([^<]*)<\/p>/)||[])[1]||'').trim();
  const q=((unit.match(/<div class="question[\s\S]*?<p>([\s\S]*?)<\/p>/)||[])[1]||'').replace(/<[^>]+>/g,'').trim();
  const a=((unit.match(/<div class="answer[\s\S]*?<p>([\s\S]*?)<\/p>/)||[])[1]||'').replace(/<[^>]+>/g,'').trim();
  if(!id||!cardNo||!q)continue;
  const key=cardNo.split('/').pop().replace(/_p\d+$/,'').replace(/★$/,'');
  const entry={id,date:date.trim(),q,a};
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
 const keys=['name','color','energy','ap','bp','bpMark','gen','genMark','type','effectCompact','trigger','triggerTextJa'];
 for(const key of keys){
  if(JSON.stringify(a[key])!==JSON.stringify(b[key]))
   return key+':'+JSON.stringify(a[key])+'!='+JSON.stringify(b[key]);
 }
 if(JSON.stringify(a.traits)!==JSON.stringify(b.traits))return 'traits';
 return '';
}
function writeModule(path,name,cards,note){
 const header=`// Official printed Macross Vol.2 cards. Fetched ${FETCHED} from unionarena-tcg.com.
// ${note}
// effectJa is the official Japanese print. name, effect and triggerText are the
// published Bandai TC card page. Rugia HK splits the raid frame only.
// battleReady stays false. The shared program, not this file, admits a card.
export const ${name}=\n`;
 writeFileSync(path,header+JSON.stringify(cards,null,1)+';\n');
}
function tcText(chunk){
 return imgsToText(chunk)||'-';
}

async function main(){
 const btList=await get('https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570214','bt-list.html');
 const numbers=listNumbers(btList,'EX14BT');
 if(numbers.length<80)throw Error('card list did not parse: '+numbers.length);
 const faqBt=mergeFaq(await get('https://www.unionarena-tcg.com/jp/faq/list.php?series=EX14BT','faq-bt.html'));
 const faqSt=new Map();
 const parsed=await mapPool(numbers,6,async number=>{
  const [set,full]=number.split('/');
  const html=await get(
   `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(number)}`,
   `${set}-${full}.html`);
  const card=parseCard(html);
  const identity=card.number.split('/')[1].replace(/_p\d+$/,'');
  const asked=full.replace(/_p\d+$/,'');
  if(identity!==asked)throw Error(number+' printed '+card.number);
  return {...card,set,full,identity};
 });
 const identities=new Map();
 for(const card of parsed){
  const base=card.identity;
  const isParallel=/_p\d+$/.test(card.full);
  if(!identities.has(base)){
   identities.set(base,{
    id:base,identity:base,number:`${card.set}/${base}`,
    nameJa:card.name,ruby:card.ruby,title:'mcr',set:card.set,sets:[card.set],
    printings:[],color:card.color,energy:card.energy,ap:card.ap,bp:card.bp,bpMark:card.bpMark,
    gen:card.gen,genMark:card.genMark,type:card.type,traits:card.traits,
    rarity:isParallel?'':card.rarity,trigger:card.trigger,
    triggerTextJa:card.triggerTextJa,effectJa:card.effect==='-'?'-':card.effect,
    image:card.image,
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+base)}`,
    sourceTc:`https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+base)}`,
    confirmedTc:true,
    officialFaqIds:[],
    auto:false,battleReady:false,deckLegal:card.type!=='action-point',
    playable:false,effectImplemented:false,cardDataVerified:false,
    _jp:card
   });
  }else{
   const row=identities.get(base);
   const drift=samePrint(row._jp,card);
   if(drift)throw Error(base+' '+card.set+'/'+card.full+' disagrees on '+drift);
   if(!row.sets.includes(card.set))row.sets.push(card.set);
  }
  const row=identities.get(base);
  row.printings.push({
   number:`${card.set}/${card.full}`,set:card.set,rarity:card.rarity,
   source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent(card.set+'/'+card.full)}`,
   image:card.image
  });
  if(!isParallel&&card.set==='EX14BT'){
   row.rarity=card.rarity;
   row.image=card.image;
   row.set='EX14BT';
   row.number=`EX14BT/${base}`;
   row.source=`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX14BT/'+base)}`;
  }
  if(!isParallel&&!row.rarity)row.rarity=card.rarity;
 }
 const bases=[...identities.keys()];
 const unknownIcons=new Map();
 await mapPool(bases,4,async id=>{
  const row=identities.get(id);
  const tc=await get(
   `https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX14BT/'+id)}`,
   `tc-${id}.html`);
  const nameBlock=(tc.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
  const tcName=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
  row.name=tcName||row.nameJa;
  row.effect=row.type==='action-point'?'-':tcText(dd(tc,'effectData'));
  row.triggerText=row.type==='action-point'?'-':tcText(dd(tc,'triggerData'));
  row.displaySource=`https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=${encodeURIComponent('EX14BT/'+id)}`;
  if(row.type!=='action-point'){
   const rugia=await get(`https://rugiacreation.com/ua/search?Name=HK&Find1=${id}`,`rugia-${id}.html`);
   const face=rugiaFace(rugia,id);
   if(!face)throw Error(id+' has no Rugia HK page for the raid-frame split');
   row.raidFrame=face.raidFrame;
   for(const file of face.unknown)unknownIcons.set(file,(unknownIcons.get(file)||0)+1);
  }else row.raidFrame=null;
  const faqs=faqBt.get(id)||[];
  const seen=new Set();
  row.officialFaqIds=faqs.filter(item=>seen.has(item.id)?false:(seen.add(item.id),true)).map(item=>item.id);
 });
 if(unknownIcons.size)throw Error('unmapped Rugia icons '+[...unknownIcons.keys()].join(','));
 const cards=[...identities.values()].sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
 for(const card of cards)delete card._jp;
 const bird=cards.find(card=>card.id==='MCR-2-071');
 if(bird){
  const before='自分の場の〈サラ・ノーム〉を自分の山札の下に置いてもよい。';
  const after='自分の場の〈サラ・ノーム〉を1枚自分の山札の下に置いてもよい。';
  if(!bird.effectJa.includes(before)&&!bird.effectJa.includes(after))
   throw Error('MCR-2-071 errata anchor missing');
  bird.effectJa=bird.effectJa.replace(before,after);
  bird.effect=bird.effect.replace('〈莎拉·諾姆〉','1張〈莎拉·諾姆〉');
  bird.errata='https://www.unionarena-tcg.com/en/news/034.php';
 }
 const deck=cards.filter(card=>card.deckLegal);
 const booster=deck.filter(card=>card.set==='EX14BT');
 const ap=cards.filter(card=>!card.deckLegal);
 if(booster.length!==77)throw Error('booster '+booster.length);
 if(ap.length!==7)throw Error('ap '+ap.length);
 const rarity={};
 for(const card of booster)rarity[card.rarity]=(rarity[card.rarity]||0)+1;
 const expected={C:28,U:25,R:12,SR:12};
 for(const [rare,count] of Object.entries(expected)){
  if(rarity[rare]!==count)throw Error(rare+' count '+rarity[rare]);
 }
 const dir=join(ROOT,'dist','mcr');
 mkdirSync(dir,{recursive:true});
 const low=booster.filter(card=>Number(card.id.slice(6))<=40);
 const high=booster.filter(card=>Number(card.id.slice(6))>=41);
 writeModule(join(dir,'cards-ex14-001-040.mjs'),'MCR2_CARDS_001_040',low,'EX14BT/MCR-2-001 through MCR-2-040.');
 writeModule(join(dir,'cards-ex14-041-077.mjs'),'MCR2_CARDS_041_077',high,'EX14BT/MCR-2-041 through MCR-2-077.');
 writeModule(join(dir,'cards-ex14-ap.mjs'),'MCR2_AP_CARDS',ap,'EX14BT action point cards. They are not deck cards.');
 const summary=cards.map(card=>({
  id:card.id,name:card.name,nameJa:card.nameJa,type:card.type,color:card.color,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,genMark:card.genMark,
  rarity:card.rarity,trigger:card.trigger,traits:card.traits,
  effectJa:card.effectJa,effect:card.effect,triggerTextJa:card.triggerTextJa,
  raid:card.raidFrame,faq:card.officialFaqIds
 }));
 writeFileSync('/tmp/mcr-fetch/summary.json',JSON.stringify(summary,null,1));
 console.log(JSON.stringify({
  deck:deck.length,booster:booster.length,ap:ap.length,rarity,
  raidFrames:cards.filter(card=>card.raidFrame).map(card=>card.id),
  unknownIcons:[...unknownIcons.entries()],
  missingDisplay:cards.filter(card=>!card.name||card.effect===undefined).map(card=>card.id),
  colors:deck.reduce((bag,card)=>{bag[card.color]=(bag[card.color]||0)+1;return bag;},{}),
  types:deck.reduce((bag,card)=>{bag[card.type]=(bag[card.type]||0)+1;return bag;},{}),
  faq:cards.reduce((n,card)=>n+card.officialFaqIds.length,0)
 },null,2));
}

main().catch(error=>{console.error(error);process.exit(1);});
