import assert from 'node:assert/strict';
import test from 'node:test';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {mainDecks,designatedBattleDecks,raidArchetypeDecks,deckProfile} from '../dist/universal-v2/ai-v3/decks.mjs';

function pull(state,player,pred){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  if(!list)continue;
  const index=list.findIndex(pred);
  if(index>=0)return list.splice(index,1)[0];
 }
 return null;
}
function toMain(packs,state){
 let guard=0;
 while(state.phase!=='main'&&guard++<8)
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 return state;
}
export function playableRaid(deck,profile=deckProfile(deck.pack,deck.counts)){
 const packs=[deck.pack,deck.pack];
 for(const pair of profile.pairs){
  let state=toMain(packs,newUniversalMatch(packs,{decks:[deck.counts,deck.counts],seed:3,first:0}));
  const base=pull(state,0,card=>card.cardId===pair.bases[0].id);
  const raid=pull(state,0,card=>card.cardId===pair.id);
  if(!base||!raid)continue;
  base.ready=true;
  base.fieldEntryStamp=state.nextFieldEntryStamp++;
  state.players[0].front[0]=base;
  state.players[0].hand.push(raid);
  const need=pair.energy||0;
  let placed=0;
  for(let slot=0;slot<4&&placed<need;slot++){
   const card=pull(state,0,item=>{
    const printed=deck.pack.cards[item.cardId];
    return printed?.type==='character'&&printed.color===deck.pack.cards[pair.id].color&&(printed.gen||0)>0;
   });
   if(!card)break;
   card.ready=true;
   card.fieldEntryStamp=state.nextFieldEntryStamp++;
   state.players[0].energy[slot]=card;
   placed+=(deck.pack.cards[card.cardId].gen||0);
  }
  if(placed<need)continue;
  state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<Math.max(1,pair.ap||1);});
  const legal=legalUniversalActions(packs,state).some(action=>action.type==='raid'&&action.uid===raid.uid);
  if(legal)return {ok:true,pair:pair.id+' -> '+pair.bases[0].id,energy:pair.energy,baseEnergy:pair.bases[0].energy};
 }
 return {ok:false};
}

test('battle decks keep a raid core and the practice decks stay the baseline',()=>{
 const designated=designatedBattleDecks();
 assert.deepEqual(designated.map(deck=>deck.id),['reject-blue','white-sword','renruki']);
 const raids=raidArchetypeDecks();
 assert.ok(raids.length>=4,'other titles need a main card and a legal base');
 const practice=mainDecks();
 assert.equal(practice.length,5);
 for(const deck of practice){
  const profile=deckProfile(deck.pack,deck.counts);
  assert.equal(profile.raidCopies,0,deck.id);
  assert.equal(profile.energy4Plus,0,deck.id);
 }
 const rows=[];
 for(const deck of [...designated,...raids]){
  const profile=deckProfile(deck.pack,deck.counts);
  const played=playableRaid(deck,profile);
  rows.push({id:deck.id,name:deck.name,color:deck.color||'',curve:profile.curve,
   raids:profile.raidCopies,bases:profile.baseCopies,energy4:profile.energy4Plus,played});
  assert.ok(profile.raidCopies>0,deck.id);
  assert.ok(profile.baseCopies>0,deck.id);
  assert.equal(played.ok,true,deck.id+' '+JSON.stringify(played));
 }
 console.log('battle decks',JSON.stringify(rows));
});
