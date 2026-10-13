import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET,ttgBetaDeckIssues} from '../dist/ttg-browser.mjs';
import {TTG_CORE_SMOKE_IDS,newTtgCoreMatch,legalTtgCoreActions,ttgCoreAiChoice,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
// Every TTG card is physically inserted into a valid 50-card deck, not just accepted by a hard-coded ID array.
// Full AI match is a playability smoke test, NOT per-card printed-effect certification.
function deckFor(id){
 const card=TTG_BY_ID[id];assert.ok(card,'missing official card '+id);
 const deck={...(card.color==='red'?TTG_RED_BETA_PRESET:TTG_GREEN_BETA_PRESET)};
 if(deck[id])return deck;
 const candidates=Object.keys(deck).filter(k=>deck[k]>0).sort((a,b)=>{
  const A=TTG_BY_ID[a].trigger===card.trigger?1:0,B=TTG_BY_ID[b].trigger===card.trigger?1:0;
  return B-A||deck[b]-deck[a];
 });
 for(const donor of candidates){
  const testDeck={...deck,[donor]:deck[donor]-1,[id]:1};
  if(ttgBetaDeckIssues(testDeck).length===0)return testDeck;
 }
 throw new Error('Cannot construct a 50-card valid deck containing '+id);
}
function play(id,deck){
 const seed=5000+Number(id.slice(-3));
 let s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});
 let count=0;
 while(s.status==='playing'&&count<7000){
  const legal=legalTtgCoreActions(s);
  assert.ok(legal.length,id+' has no legal actions at '+count);
  const act=ttgCoreAiChoice(s);
  assert.ok(act,id+' AI stuck at '+count);
  s=dispatchTtgCoreAction(s,act);
  assert.ok(assertTtgCoreState(s),id+' card conservation fails at '+count);
  count++;
 }
 assert.equal(s.status,'finished',id+' cannot finish a full match in '+count+' actions');
 assert.ok([0,1].includes(s.winner),id+' missing winner');
}
test('All 81 printed TTG card identities can coexist with 50-card legal decks and finish AI matches',()=>{
 assert.equal(TTG_CORE_SMOKE_IDS.length,81);
 for(const id of TTG_CORE_SMOKE_IDS){
  const deck=deckFor(id);
  assert.equal(Object.values(deck).reduce((a,b)=>a+b,0),50,id);
  assert.ok(deck[id]>0,id+' must actually be inside the real deck');
  assert.deepEqual(ttgBetaDeckIssues(deck),[],id);
  play(id,deck);
 }
});
