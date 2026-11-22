import {officialV2Pack} from '../official-entry.mjs';
import {validateUniversalDeck} from '../pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts,DESIGNATED_BLEACH_DECKS} from '../bleach-designated-decks.mjs';
import {designatedBattleDecks,mainDecks} from '../ai-v3/decks.mjs';
import {WHITE_SWORD_DECK,WHITE_SWORD_IDS} from './constants.mjs';

let pool;
function buildPool(){
 const map=new Map();
 for(const deck of [...designatedBattleDecks(),...mainDecks()])map.set(deck.id,deck);
 return map;
}
export function deckPool(){
 if(!pool)pool=buildPool();
 return pool;
}
export function getDeck(id){
 const deck=deckPool().get(id);
 if(!deck)throw Error('Unknown deck '+id);
 const issues=validateUniversalDeck(deck.pack,deck.counts);
 if(issues.length)throw Error(id+': '+issues.join('; '));
 return deck;
}
export function verifyWhiteSword(){
 const pack=officialV2Pack('bleach');
 const source=DESIGNATED_BLEACH_DECKS.find(deck=>deck.key===WHITE_SWORD_DECK);
 const summary=summarizeDesignatedDecks(id=>!!pack.cards[id]).find(row=>row.key===WHITE_SWORD_DECK);
 if(!source||!summary)throw Error('white-sword deck is missing');
 const counts=designatedPlayableCounts(summary);
 const issues=validateUniversalDeck(pack,counts);
 const ids=source.entries.map(entry=>entry.cardId);
 const expected=[...WHITE_SWORD_IDS];
 const sameIds=ids.length===expected.length&&ids.every((id,index)=>id===expected[index]);
 const copies=source.entries.reduce((sum,entry)=>sum+entry.copies,0);
 const deck=getDeck(WHITE_SWORD_DECK);
 const sameCounts=WHITE_SWORD_IDS.every(id=>deck.counts[id]===counts[id]&&counts[id]===source.entries.find(entry=>entry.cardId===id).copies);
 return {
  ok:summary.playable===true&&summary.copies===50&&summary.kinds===13&&summary.missing.length===0&&
   issues.length===0&&sameIds&&copies===50&&sameCounts&&Object.keys(deck.counts).length===13,
  playable:summary.playable,copies:summary.copies,kinds:summary.kinds,
  registeredKinds:summary.registeredKinds,missing:summary.missing,issues,
  entries:summary.entries.map(entry=>({
   copies:entry.copies,source:entry.source,cardId:entry.cardId,name:entry.name,registered:entry.registered
  }))
 };
}
export function catalogsOf(pack){
 if(Array.isArray(pack))return pack.map(item=>item.cards||item);
 return [pack.cards||pack,pack.cards||pack];
}
