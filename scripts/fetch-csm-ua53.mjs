#!/usr/bin/env node
// Fetch official UA53BT Chainsaw Man card pages (JP + TC) into dist/csm-cards.mjs.
// Generated energy uses the alt-text pip count, never the icon filename number.
// Parallel art and AP cards are recorded only as printings / skipped for decks.
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=join(dirname(fileURLToPath(import.meta.url)),'..');
const CACHE=join('/tmp','csm-fetch','pages');
mkdirSync(CACHE,{recursive:true});

const COLORS={
 紫:'purple',黄:'yellow',緑:'green',青:'blue',赤:'red',
 purple:'purple',yellow:'yellow',green:'green',blue:'blue',red:'red'
};
const COLOR_CHARS='紫黄緑青赤';
const TYPES={
 キャラクター:'character',イベント:'event',フィールド:'field',
 角色:'character',事件:'event',場域:'field',场地:'field'
};
const TRIGGERS={
 ドロー:'draw',ゲット:'get',アクティブ:'active',スペシャル:'special',
 ファイナル:'final',レイド:'raid',カラー:'color',
 抽卡:'draw',獲得:'get',活動:'active',特殊:'special',最終:'final',突襲:'raid',顏色:'color'
};

async function get(url,file){
 const path=join(CACHE,file);
 try{
  const {readFileSync}=await import('node:fs');
  const cached=readFileSync(path,'utf8');
  if(cached.length>500)return cached;
 }catch{}
 const res=await fetch(url,{headers:{'User-Agent':'Ua-CSM-catalog/1.0'}});
 if(!res.ok)throw Error(url+' -> '+res.status);
 const text=await res.text();
 writeFileSync(path,text);
 await new Promise(r=>setTimeout(r,80));
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

function normalizeEffectJa(text){
 // Match the compact Japanese print used by other closed titles.
 return text
  .replace(/\r/g,'')
  .replace(/\n+/g,'')
  .replace(/\s+/g,'')
  .replace(/【レストにする】\s*/g,'【レストにする】')
  .replace(/】\s+【/g,'】【')
  .replace(/】\s+/g,'】')
  ||'-';
}

function parseNeed(chunk){
 const alt=(chunk.match(/alt="([^"]*)"/)||[])[1]||'';
 if(!alt||alt==='-'||/[-－]$/.test(alt)&&!/\d/.test(alt))return {energy:0,color:null};
 const colorChar=[...alt].find(ch=>COLOR_CHARS.includes(ch));
 const num=(alt.match(/(\d+)/)||[])[1];
 return {energy:num==null?0:Number(num),color:COLORS[colorChar]||null};
}

function parseGen(chunk){
 // Official pip count is the number of color characters in the alt text.
 // A trailing + is genMark only. Filename ico_*2.png / *3.png is a sprite id.
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

function parseTraitsStrict(chunk){
 // Keep one printed trait token; slash composites stay one string.
 const text=imgsToText(chunk).replace(/\s+/g,'').replace(/^［特徴：(.+)］$/,'$1');
 if(!text||text==='-')return [];
 return [text];
}

function parseTrigger(chunk){
 const text=imgsToText(chunk);
 if(!text||text==='-')return {trigger:null,triggerText:''};
 const m=text.match(/^【([^】]+)】|^\[([^\]]+)\]/);
 const label=(m&&(m[1]||m[2])||'').replace(/トリガー|觸發器|触発/g,'');
 const key=Object.keys(TRIGGERS).find(k=>label.includes(k)||label===k);
 return {trigger:key?TRIGGERS[key]:null,triggerText:text};
}

function parseCard(html,locale){
 const number=(html.match(/cardNumData">([^<]+)/)||[])[1]?.trim();
 const rarity=(html.match(/rareData">([^<]+)/)||[])[1]?.trim()||'';
 const nameBlock=(html.match(/cardNameCol">([\s\S]*?)<\/h2>/)||[])[1]||'';
 const name=nameBlock.replace(/<span[\s\S]*$/,'').replace(/<[^>]+>/g,'').trim();
 const ruby=(nameBlock.match(/rubyData">([^<]*)/)||[])[1]?.trim()||'';
 const image=((html.match(/cardDataImgCol"><img src="([^"]+)"/)||[])[1]||'')
  .replace(/\?v\d+$/,'');
 const absImage=image.startsWith('http')?image:
  'https://www.unionarena-tcg.com'+image;
 const need=parseNeed(dd(html,'needEnergyData'));
 const apRaw=imgsToText(dd(html,'apData'));
 const ap=Number(apRaw)||0;
 const typeJa=imgsToText(dd(html,'categoryData'));
 const type=TYPES[typeJa]||null;
 const bp=parseBp(dd(html,'bpData'));
 const traits=parseTraitsStrict(dd(html,'attributeData'));
 const gen=parseGen(dd(html,'generatedEnergyData'));
 const effectRaw=dd(html,'effectData');
 const effect=imgsToText(effectRaw);
 const trig=parseTrigger(dd(html,'triggerData'));
 const color=need.color||gen.color||'purple';
 const faqs=[];
 for(const unit of html.matchAll(/faqUnit[\s\S]*?<h4 class="tit">(Q\d+)<span>([^<]*)<\/span>[\s\S]*?<div class="question"><p>([\s\S]*?)<\/p><\/div>[\s\S]*?<div class="answer">\s*<p>([\s\S]*?)<\/p>/g)){
  faqs.push({id:unit[1],date:unit[2].trim(),q:unit[3].trim(),a:unit[4].trim()});
 }
 return {
  number,rarity,name,ruby,image:absImage,color,energy:need.energy,ap,
  type,bp:bp.bp,bpMark:bp.bpMark,gen:gen.gen,genMark:gen.genMark,traits,
  effect,effectCompact:locale==='ja'?normalizeEffectJa(effect):effect,
  trigger:trig.trigger,triggerText:trig.triggerText,faqs
 };
}

function mergeFaq(listHtml){
 const byCard=new Map();
 for(const unit of listHtml.matchAll(/faqUnit">[\s\S]*?<h2 class="tit">(Q\d+)<span>([^<]*)<\/span>[\s\S]*?(?:<p class="cardID">([^<]*)<\/p>\s*<p class="cardName">([^<]*)<\/p>)?[\s\S]*?<div class="question"><p>([\s\S]*?)<\/p><\/div>[\s\S]*?<div class="answer">\s*<p>([\s\S]*?)<\/p>/g)){
  const id=unit[1],date=unit[2].trim(),cardNo=(unit[3]||'').trim();
  const entry={id,date,q:unit[5].trim(),a:unit[6].trim(),cardName:(unit[4]||'').trim()};
  if(!cardNo)continue;
  const key=cardNo.split('/').pop().replace(/_p\d+$/,'');
  if(!byCard.has(key))byCard.set(key,[]);
  byCard.get(key).push(entry);
 }
 return byCard;
}

const SHARED={
 '-':'plain',
 '【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）':'impactNull',
 '【登場時】カードを1枚引き、自分の手札を1枚場外に置く。':'drawDiscard',
 '【登場時】カードを1枚引く。':'draw',
 '【登場時】自分の場の他のキャラを1枚まで選び、このターン中、BP+1000。':'buffOther',
 '【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【紫】と「メインフェイズ終了時、このキャラを退場させる。」を得る。':'restEnergy',
 '【起動メイン】【レストにする】【ターン1】このキャラはこのターン中、発生エナジー+【赤】と「メインフェイズ終了時、このキャラを退場させる。」を得る。':'restEnergy',
 '自分のAPカードを2枚まで選び、アクティブにする。':'recoverAp2',
 '【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）':'step',
 'このキャラがアクティブの場合、このキャラの発生エナジー+【紫】。':'activeEnergy',
 'このキャラがアクティブの場合、このキャラの発生エナジー+【赤】。':'activeEnergy',
 '【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。':'bounce',
 '【退場時】カードを1枚引く。':'retireDraw',
 'BP3000以下の相手のフロントLのキャラを1枚選び、退場させる。':'retire3000'
};

async function main(){
 const list=await get(
  'https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570153',
  'list.html');
 const numbers=[...new Set([...list.matchAll(/UA53BT\/(CSM-1-(?:\d+|AP\d+)(?:_p\d+)?)/g)].map(m=>m[1]))]
  .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 const faqHtml=await get(
  'https://www.unionarena-tcg.com/jp/faq/list.php?series=UA53BT','faq-ua53.html');
 const faqById=mergeFaq(faqHtml);

 const identities=new Map();
 for(const full of numbers){
  const base=full.replace(/_p\d+$/,'');
  const isAp=/AP\d+/.test(base);
  const isParallel=/_p\d+$/.test(full);
  if(isAp)continue;
  const jp=await get(
   `https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA53BT%2F${full}`,
   `${full}-jp.html`);
  const tc=await get(
   `https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=UA53BT%2F${full}`,
   `${full}-tc.html`);
  const j=parseCard(jp,'ja');
  const t=parseCard(tc,'tc');
  if(!identities.has(base)){
   const id=base;
   const effectJa=j.effectCompact;
   const engineKind=SHARED[effectJa]||id;
   identities.set(base,{
    id,
    identity:id,
    number:`UA53BT/${base}`,
    name:t.name||j.name,
    nameJa:j.name,
    ruby:j.ruby,
    title:'csm',
    set:'UA53BT',
    sets:['UA53BT'],
    printings:[],
    color:j.color,
    energy:j.energy,
    ap:j.ap,
    bp:j.bp,
    bpMark:j.bpMark,
    gen:j.gen,
    genMark:j.genMark,
    type:j.type,
    traits:j.traits,
    rarity:j.rarity,
    trigger:j.trigger,
    triggerText:t.triggerText||j.triggerText,
    triggerTextJa:j.triggerText,
    effect:t.effect||j.effect,
    effectJa,
    image:j.image.replace('/jp/','/jp/'),
    source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA53BT%2F${base}`,
    sourceTc:`https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=UA53BT%2F${base}`,
    auto:false,
    engineKind,
    faq:(faqById.get(id)||j.faqs||[]).map(({id,date,q,a})=>({id,date,q,a}))
   });
  }
  const row=identities.get(base);
  row.printings.push({
   number:`UA53BT/${full}`,
   set:'UA53BT',
   rarity:j.rarity,
   source:`https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA53BT%2F${full}`,
   image:j.image
  });
  if(!isParallel){
   row.rarity=j.rarity;
   row.image=j.image;
  }
 }

 const cards=[...identities.values()].sort((a,b)=>a.id.localeCompare(b.id,{numeric:true}));
 if(cards.length!==80)throw Error('Expected 80 playable identities, got '+cards.length);

 const header=`// Official UA53BT チェンソーマン / 鏈鋸人 booster, fetched ${new Date().toISOString().slice(0,10)} from
// unionarena-tcg.com. Traditional Chinese names come from the TC card pages.
// The engine matches Japanese effect text, so the pack uses nameJa.
// One identity per card number. Parallel art and AP cards are not deck cards.
// BP+ is a design mark: the integer is the printed base. Generated energy is
// the pip count in the official 発生エナジー alt text. A trailing + is a
// separate printed sentence and is not folded into gen. The icon filename
// number is a sprite id, not the pip count. A printed slash trait stays one
// trait and also lists audited components when needed. engineKind is the
// classifier of effectJa. Registration is not an official FAQ certification.
export const CSM_FETCHED='${new Date().toISOString().slice(0,10)}';
export const CSM_SETS=Object.freeze(['UA53BT']);
export const CSM_CARDS=
`;
 writeFileSync(join(ROOT,'dist/csm-cards.mjs'),
  header+JSON.stringify(cards,null,1).replace(/^/gm,' ')+';\n');

 const kindCounts={};
 for(const c of cards)kindCounts[c.engineKind]=(kindCounts[c.engineKind]|0)+1;
 console.log(JSON.stringify({
  cards:cards.length,
  shared:Object.keys(SHARED).length,
  uniqueKinds:Object.keys(kindCounts).filter(k=>!SHARED[Object.keys(SHARED).find(s=>SHARED[s]===k)]&&!['plain','impactNull','drawDiscard','draw','buffOther','restEnergy','recoverAp2','step','activeEnergy','bounce','retireDraw'].includes(k)).length,
  faqs:cards.reduce((n,c)=>n+c.faq.length,0),
  genPlus:cards.filter(c=>c.genMark==='+').map(c=>c.id),
  colors:cards.reduce((a,c)=>{a[c.color]=(a[c.color]|0)+1;return a;},{}),
  types:cards.reduce((a,c)=>{a[c.type]=(a[c.type]|0)+1;return a;},{})
 },null,2));
}

main().catch(err=>{console.error(err);process.exit(1);});
