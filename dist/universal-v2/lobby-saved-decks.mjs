// Reuse saved picture-editor decks in the production V2 match lobby.
// This module reads saved card lists but never modifies the browser's saved decks.
import {LEGACY_DECK_KEYS,normalizeEditorCounts,editorV2Status} from '../v2-editor-compat.mjs';

export const V2_MATCH_SETUP_STORAGE_KEY='ua-v2-match-setup-v1';

export function collectSavedV2LobbyDecks(storage){
 const entries=[];
 for(const [title,[,savedKey]] of Object.entries(LEGACY_DECK_KEYS)){
  let saved;
  try{saved=JSON.parse(storage?.getItem(savedKey)||'null');}catch{continue;}
  if(!Array.isArray(saved))continue;
  for(const [index,row] of saved.slice(0,100).entries()){
   if(!row||typeof row!=='object'||typeof row.name!=='string'||!row.name.trim())continue;
   try{
    const normalized=normalizeEditorCounts(title,row.counts);
    const report=editorV2Status(title,normalized);
    entries.push(Object.freeze({
     key:'v2-saved-'+title+'-'+index,
     source:'local',
     title,name:row.name.trim().slice(0,40),
     localId:localDeckId(row.id),
     ready:report.ready,
     issues:Object.freeze([...report.issues]),
     counts:report.ready?Object.freeze({...report.counts}):null,
     pack:report.ready?report.pack:null
    }));
   }catch{/* A corrupt or obsolete saved deck is left untouched, not added to battle. */}
  }
 }
 return Object.freeze(entries);
}

const ACCOUNT_DECK_ID=/^d[a-f0-9]{16}$/;
function localDeckId(value){
 return typeof value==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(value)?value:null;
}
function lobbyRowFromReport(key,source,title,name,localId,report,recordDeckId=null){
 return Object.freeze({
  key,source,title,name,localId,
  recordDeckId,
  ready:report.ready,
  issues:Object.freeze([...report.issues]),
  counts:report.ready?Object.freeze({...report.counts}):null,
  pack:report.ready?report.pack:null
 });
}
// Account decks come from GET /api/decks. Revalidate here so the match uses
// the current V2 pack counts; the stored record itself is never rewritten.
export function accountLobbyRows(decks){
 const entries=[];
 if(!Array.isArray(decks))return Object.freeze(entries);
 const seen=new Set();
 for(const deck of decks){
  if(entries.length>=30)break;
  if(!deck||typeof deck!=='object')continue;
  if(typeof deck.id!=='string'||!ACCOUNT_DECK_ID.test(deck.id)||seen.has(deck.id))continue;
  if(typeof deck.title!=='string'||typeof deck.name!=='string'||!deck.name.trim())continue;
  seen.add(deck.id);
  const name=deck.name.trim().slice(0,40);
  const localId=localDeckId(deck.localId);
  try{
   const normalized=normalizeEditorCounts(deck.title,deck.counts);
   const report=editorV2Status(deck.title,normalized);
   entries.push(lobbyRowFromReport('v2-account-'+deck.id,'account',deck.title,name,localId,report,deck.id));
  }catch(error){
   const issue=String(error?.message||'這副牌組目前無法讀取。').slice(0,180);
   entries.push(Object.freeze({
    key:'v2-account-'+deck.id,source:'account',title:deck.title,name,localId,
    recordDeckId:deck.id,ready:false,issues:Object.freeze([issue]),counts:null,pack:null
   }));
  }
 }
 return Object.freeze(entries);
}
export function orderedAccountLobbyRows(rows){
 const list=Array.isArray(rows)?rows:[];
 return Object.freeze([...list.filter(row=>row?.ready),...list.filter(row=>row&&!row.ready)]);
}
// The deck library keeps one copy when a cloud deck and a browser deck share
// a local id. The account copy is the one the player can take to another device.
export function shadowedLocalLobbyKeys(localRows,accountRows){
 const ids=new Set();
 for(const row of accountRows||[]) if(typeof row?.localId==='string'&&row.localId) ids.add(row.localId);
 const keys=[];
 for(const row of localRows||[]) if(row?.localId&&ids.has(row.localId)) keys.push(row.key);
 return Object.freeze(keys);
}
export function lobbyChoiceText(row,side){
 const account=row?.source==='account';
 const prefix=account?'帳號牌組｜':(side==='my-title'?'我的收藏｜':'收藏牌組｜');
 const name=String(row?.name||'未命名牌組');
 if(row?.ready)return prefix+name;
 if(!account)return prefix+name+'（V2 尚未完整支援）';
 const issue=String(row.issues?.[0]||'V2 尚未完整支援');
 const short=issue.length>36?issue.slice(0,36)+'…':issue;
 return prefix+name+'（'+short+'）';
}
export function validatedLobbyChoice(select,registry,designated){
 const key=select?.value;
 return registry[key]||designated.get(key)||null;
}
