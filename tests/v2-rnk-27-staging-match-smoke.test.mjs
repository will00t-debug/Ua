import test from 'node:test';
import assert from 'node:assert/strict';
import {createRnkBcdBatchStagingPack} from '../dist/universal-v2/rnk-bcd-batch-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,assertUniversalMatch,legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';

// Staging-only full-deck smoke test. No claim that every card ability is accepted.
const pack=createRnkBcdBatchStagingPack();
function legal50(){
  const counts={},limits={final:0,color:0,special:0};
  const pool=Object.values(pack.cards).sort((a,b)=>
    a.energy-b.energy||a.id.localeCompare(b.id));
  let count=0;
  for(const goal of [2,4]){
    for(const card of pool){
      if(count>=50)break;
      const old=counts[card.id]||0;
      let can=Math.min(goal-old,card.maxCopies-old,50-count);
      if(Object.hasOwn(limits,card.trigger))can=Math.min(can,4-limits[card.trigger]);
      if(can<=0)continue;
      counts[card.id]=old+can;
      count+=can;
      if(Object.hasOwn(limits,card.trigger))limits[card.trigger]+=can;
    }
  }
  assert.equal(count,50,'common V2 staging could not build legal 50-card test deck');
  return counts;
}
test('27 Japanese-backed shared V2 programs build a legal 50-card staging deck',()=>{
  assert.equal(Object.keys(pack.cards).length,27);
  const counts=legal50();
  assert.deepEqual(validateUniversalDeck(pack,counts),[]);
  assert.equal(Object.values(counts).reduce((s,n)=>s+n,0),50);
  assert.ok(Object.keys(counts).length>=13,'staging smoke deck should be diverse');
});
test('two legal 50-card RNK staging decks can initialize a real common-engine match',()=>{
  const counts=legal50();
  const state=newUniversalMatch(pack,{
    decks:[counts,counts],seed:161116,first:0,openingMulligan:false
  });
  assert.equal(assertUniversalMatch(pack,state),true);
  assert.equal(state.players.length,2);
  assert.equal(state.players[0].deck.length+state.players[0].hand.length+state.players[0].life.length>0,true);
});
test('common-engine phases continue without title-private RNK runtime',()=>{
  const counts=legal50();
  let state=newUniversalMatch(pack,{
    decks:[counts,counts],seed:161117,first:0,openingMulligan:false
  });
  let turns=0;
  for(let i=0;i<20;i++){
    const actions=legalUniversalActions(pack,state);
    assert.ok(Array.isArray(actions));
    const next=actions.find(x=>x.type==='next');
    if(!next)break; // a valid interruption requires a concrete follow-up action
    state=dispatchUniversalAction(pack,state,next);
    assert.equal(assertUniversalMatch(pack,state),true);
    turns++;
  }
  assert.ok(turns>=2,'shared engine could not advance even two phases');
});
