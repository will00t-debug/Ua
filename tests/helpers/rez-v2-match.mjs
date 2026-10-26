import {createRezV2Pack} from '../../dist/universal-v2/rez-pack.mjs';
import {dispatchUniversalAction,newUniversalMatch} from '../../dist/universal-v2/engine.mjs';

export const rez=createRezV2Pack();
export const rezPacks=[rez,rez];

export function rezDeck(ids,doubleId=ids.at(-1)){
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts[doubleId]=2;
 return counts;
}

export const REZ_BASE_IDS=Object.freeze([
 'REZ-2-014','REZ-2-015','REZ-2-033','REZ-2-035','REZ-2-040','REZ-2-041',
 'REZ-2-042','REZ-2-043','REZ-2-046','REZ-2-049','REZ-2-050','REZ-2-055','REZ-2-056'
]);
export const rezBaseDeck=rezDeck(REZ_BASE_IDS,'REZ-2-055');

export function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

export function toPhase(packs,s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}

export function fresh(decks=rezBaseDeck,seed=17014){
 return newUniversalMatch(rezPacks,{decks:[decks,decks],seed,first:0});
}
