import {createStgV2Pack} from '../../dist/universal-v2/stg-pack.mjs';
import {dispatchUniversalAction,legalUniversalActions,newUniversalMatch} from '../../dist/universal-v2/engine.mjs';

export const stg=createStgV2Pack();
export const stgPacks=[stg,stg];

export const STG_BASE_IDS=Object.freeze([
 'STG-1-001','STG-1-007','STG-1-012','STG-1-014','STG-1-020','STG-1-024','STG-1-032',
 'STG-1-042','STG-1-047','STG-1-053','STG-1-057','STG-1-061','STG-1-064'
]);

export function stgDeck(ids,doubleId=ids.at(-1)){
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts[doubleId]=2;
 return counts;
}

export const stgBaseDeck=stgDeck(STG_BASE_IDS);

export function deckWith(required=[]){
 const ids=[];
 for(const id of required)if(!ids.includes(id))ids.push(id);
 for(const id of STG_BASE_IDS){
  if(ids.length>=13)break;
  if(!ids.includes(id))ids.push(id);
 }
 if(ids.length!==13)throw Error('Steins;Gate test deck needs 13 ids');
 return stgDeck(ids);
}

export function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}

export function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 s.players[p][line][slot]=card;
 return card;
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

export function fresh(deck=stgBaseDeck,seed=57001,packs=stgPacks){
 return newUniversalMatch(packs,{decks:[deck,deck],seed,first:0});
}

export function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}

export function playMain(packs,s,uid,kind='play'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===kind&&a.uid===uid&&
  (kind!=='play'||a.line==='front'));
 if(!action)throw Error('No '+kind+' for '+uid);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}
