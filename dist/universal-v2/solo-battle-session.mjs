// Single-tab handoff between V2 matchup selection and the dedicated battle page.
// A handoff contains only validated printed deck counts and setup preferences,
// never live card order. The existing V2 reducer owns all game state/actions.
import {officialV2Pack} from './official-entry.mjs';
import {validateUniversalDeck} from './pack.mjs';

export const SOLO_BATTLE_ENTRY_KEY='ua-v2-solo-battle-entry-v1';
export const SOLO_BATTLE_PROGRESS_KEY='ua-v2-solo-battle-progress-v1';
export const SOLO_BATTLE_URL='/universal-v2-battle.html';
export const SOLO_SETUP_URL='/universal-v2-preview.html';
const MAX_AGE=24*60*60*1000;
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validFirst=x=>x===0||x===1;
const validDifficulty=x=>['easy','normal','hard'].includes(x);

export function prepareSoloBattle({mine,foe,first,difficulty,recordDeckId=null,now=Date.now(),nonce=0}){
 if(!validFirst(first)||!validDifficulty(difficulty)||!Number.isSafeInteger(now)||now<1)
  throw Error('請重新選擇對戰設定。');
 const items=[mine,foe].map((entry,index)=>{
  if(!isPlain(entry)||!isPlain(entry.pack)||!isPlain(entry.counts))
   throw Error('第 '+(index+1)+' 副牌組未準備好。');
  const pack=officialV2Pack(entry.pack.id);
  if(pack.version!==entry.pack.version)
   throw Error('牌組規則版本已更新，請重新選擇。');
  const issues=validateUniversalDeck(pack,entry.counts);
  if(issues.length)throw Error('牌組尚未符合 V2 規則：'+issues[0]);
  return {title:pack.id,packVersion:pack.version,
   name:String(entry.label||pack.id).slice(0,65),
   counts:Object.fromEntries(Object.entries(entry.counts).filter(([,n])=>n>0))};
 });
 const id=String(now)+'-'+String(nonce);
 return {version:1,id,createdAt:now,first,difficulty,
  recordDeckId:typeof recordDeckId==='string'&&recordDeckId.length<=80?recordDeckId:null,
  decks:items};
}

export function saveSoloBattle(storage,config){
 if(!storage?.setItem)throw Error('此瀏覽器不支援開局暫存。');
 storage.setItem(SOLO_BATTLE_ENTRY_KEY,JSON.stringify(config));
 try{storage.removeItem(SOLO_BATTLE_PROGRESS_KEY);}catch{}
}

export function loadSoloBattle(storage,{now=Date.now()}={}){
 let data=null;
 try{
  const serialized=storage?.getItem(SOLO_BATTLE_ENTRY_KEY);
  if(!serialized||serialized.length>18000)return null;
  data=JSON.parse(serialized);
 }catch{return null;}
 if(!isPlain(data)||data.version!==1||typeof data.id!=='string'||
  !/^\d{10,17}-\d{1,10}$/.test(data.id)||
  !Number.isSafeInteger(data.createdAt)||data.createdAt>now+60000||
  now-data.createdAt>MAX_AGE||!validFirst(data.first)||
  !validDifficulty(data.difficulty)||!Array.isArray(data.decks)||data.decks.length!==2||
  !(data.recordDeckId===null||typeof data.recordDeckId==='string'&&data.recordDeckId.length<=80))
  return null;
 try{
  const decks=data.decks.map(entry=>{
   if(!isPlain(entry)||typeof entry.title!=='string'||
    typeof entry.packVersion!=='string'||typeof entry.name!=='string'||
    entry.name.length>65||!isPlain(entry.counts)||Object.keys(entry.counts).length>50)
    throw Error('Invalid stored battle deck');
   const pack=officialV2Pack(entry.title);
   if(pack.version!==entry.packVersion)throw Error('Rule pack changed');
   const issues=validateUniversalDeck(pack,entry.counts);
   if(issues.length)throw Error('Stored deck no longer playable');
   return {pack,counts:{...entry.counts},label:entry.name};
  });
  return {config:data,decks,packs:decks.map(d=>d.pack)};
 }catch{return null;}
}

export function clearSoloBattle(storage){
 try{storage?.removeItem(SOLO_BATTLE_ENTRY_KEY);}catch{}
 try{storage?.removeItem(SOLO_BATTLE_PROGRESS_KEY);}catch{}
}
