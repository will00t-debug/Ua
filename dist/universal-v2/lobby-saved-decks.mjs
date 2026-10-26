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
     title,name:row.name.trim().slice(0,40),
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

export function validatedLobbyChoice(select,registry,designated){
 const key=select?.value;
 return registry[key]||designated.get(key)||null;
}
