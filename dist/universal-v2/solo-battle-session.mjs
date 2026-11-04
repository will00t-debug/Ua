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
const ACCOUNT_ID=/^u[a-f0-9]{16}$/;
const isPlain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function soloProgressOwner(accountId){
 return typeof accountId==='string'&&ACCOUNT_ID.test(accountId)?accountId:null;
}
export function soloBattleScope(accountId){
 const owner=soloProgressOwner(accountId);
 return owner?'user:'+owner:'guest';
}
export function soloEntryKey(accountId){
 return SOLO_BATTLE_ENTRY_KEY+':'+soloBattleScope(accountId);
}
export function soloProgressKey(accountId){
 return SOLO_BATTLE_PROGRESS_KEY+':'+soloBattleScope(accountId);
}
export function soloProgressMatches(data,accountId){
 if(!isPlain(data)||!Object.prototype.hasOwnProperty.call(data,'accountId'))return false;
 if(data.accountId!=null&&soloProgressOwner(data.accountId)==null)return false;
 return soloProgressOwner(data.accountId)===soloProgressOwner(accountId);
}
const validFirst=x=>x===0||x===1;
const validDifficulty=x=>['easy','normal','hard','learned'].includes(x);

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

export function saveSoloBattle(storage,config,accountId){
 if(!storage?.setItem)throw Error('此瀏覽器不支援開局暫存。');
 if(arguments.length<3){
  storage.setItem(SOLO_BATTLE_ENTRY_KEY,JSON.stringify(config));
  try{storage.removeItem(SOLO_BATTLE_PROGRESS_KEY);}catch{}
  return;
 }
 storage.setItem(soloEntryKey(accountId),JSON.stringify({...config,accountId:soloProgressOwner(accountId)}));
 try{storage.removeItem(soloProgressKey(accountId));}catch{}
 retireLegacyProgress(storage,accountId);
}
function retireLegacyProgress(storage,accountId){
 if(!soloProgressOwner(accountId))return;
 let legacy=null;
 try{legacy=storage?.getItem(SOLO_BATTLE_PROGRESS_KEY)??null;}catch{return;}
 if(!legacy)return;
 try{
  const data=JSON.parse(legacy);
  if(soloProgressMatches(data,accountId))storage.removeItem(SOLO_BATTLE_PROGRESS_KEY);
 }catch{/* an unreadable legacy snapshot is not assigned to this account */}
}

function readStoredBattle(storage,key,{now}){
 let data=null;
 try{
  const serialized=storage?.getItem(key);
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

function adoptLegacyEntry(storage,accountId,now){
 if(!soloProgressOwner(accountId))return null;
 let progress=null;
 try{progress=storage?.getItem(SOLO_BATTLE_PROGRESS_KEY)??null;}catch{return null;}
 if(!progress)return null;
 let data=null;
 try{data=JSON.parse(progress);}catch{return null;}
 if(!soloProgressMatches(data,accountId))return null;
 const loaded=readStoredBattle(storage,SOLO_BATTLE_ENTRY_KEY,{now});
 if(!loaded)return null;
 if(loaded.config.accountId!=null&&soloProgressOwner(loaded.config.accountId)!==soloProgressOwner(accountId))
  return null;
 try{
  storage.setItem(soloEntryKey(accountId),storage.getItem(SOLO_BATTLE_ENTRY_KEY));
  storage.setItem(soloProgressKey(accountId),progress);
 }catch{/* reading still works when the copy cannot be stored */}
 return loaded;
}

export function loadSoloBattle(storage,options={}){
 const now=options.now??Date.now();
 const scoped=Object.prototype.hasOwnProperty.call(options,'accountId');
 if(!scoped)return readStoredBattle(storage,SOLO_BATTLE_ENTRY_KEY,{now});
 return readStoredBattle(storage,soloEntryKey(options.accountId),{now})
  ||adoptLegacyEntry(storage,options.accountId,now);
}

export function readSoloProgress(storage,accountId){
 let json=null;
 try{json=storage?.getItem(soloProgressKey(accountId))??null;}
 catch{return {status:'unreadable',data:null};}
 if(!json&&soloProgressOwner(accountId)){
  let legacy=null;
  try{legacy=storage?.getItem(SOLO_BATTLE_PROGRESS_KEY)??null;}catch{legacy=null;}
  if(legacy){
   try{
    const data=JSON.parse(legacy);
    if(soloProgressMatches(data,accountId)){
     try{storage.setItem(soloProgressKey(accountId),legacy);}catch{/* keep the legacy copy */}
     json=legacy;
    }
   }catch{/* a damaged legacy snapshot stays where it is */}
  }
 }
 if(!json)return {status:'absent',data:null};
 if(json.length>2200000)return {status:'unreadable',data:null};
 try{
  const data=JSON.parse(json);
  if(!soloProgressMatches(data,accountId))return {status:'other',data};
  return {status:'ok',data};
 }catch{return {status:'unreadable',data:null};}
}

export function writeSoloProgress(storage,accountId,data){
 if(soloProgressOwner(accountId)==null&&accountId!=null)throw Error('帳號識別不正確。');
 storage.setItem(soloProgressKey(accountId),JSON.stringify({...data,accountId:soloProgressOwner(accountId)}));
}

export function clearSoloBattle(storage,accountId){
 if(arguments.length<2){
  try{storage?.removeItem(SOLO_BATTLE_ENTRY_KEY);}catch{}
  try{storage?.removeItem(SOLO_BATTLE_PROGRESS_KEY);}catch{}
  return;
 }
 try{storage?.removeItem(soloEntryKey(accountId));}catch{}
 try{storage?.removeItem(soloProgressKey(accountId));}catch{}
 retireLegacyProgress(storage,accountId);
}
