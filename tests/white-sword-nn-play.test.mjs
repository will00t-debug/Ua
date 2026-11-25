import assert from 'node:assert/strict';
import test from 'node:test';
import {applyHiddenIds,hiddenSlots,visibleUidSet} from '../dist/universal-v2/ai-v3/observation.mjs';
import {matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {INIT_SEED} from '../training/white-sword-nn/constants.mjs';
import {encodeState,sameVector} from '../training/white-sword-nn/encode.mjs';
import {cloneNet,createNet} from '../training/white-sword-nn/net.mjs';
import {playMatch} from '../training/white-sword-nn/play.mjs';

function freshMatch(seed){
 const deck=getDeck('white-sword');
 const packs=[deck.pack,deck.pack];
 const state=newComparedMatch(packs,[deck.counts,deck.counts],seed,0,matchRules('official'));
 return {packs,state};
}
function nnSpec(net,maxSteps){
 return {
  seed:188050,first:0,mode:'eval',maxSteps,keepActions:true,progress:false,
  seats:[
   {deckId:'white-sword',kind:'nn',explore:0},
   {deckId:'white-sword',kind:'nn',explore:0}
  ],
  nets:[net,cloneNet(net)],recordSeats:[],teacherSeats:[]
 };
}

test('hidden card identities do not change the actor vector',()=>{
 const {packs,state}=freshMatch(188050);
 const before=encodeState(observeActor(packs,state,0),0,[]);
 const visible=visibleUidSet(packs,state,0);
 const hiddenBefore=state.players.map(player=>hiddenSlots(player,visible).map(card=>card.uid+':'+card.cardId));
 const assignments=state.players.map(player=>{
  const slots=hiddenSlots(player,visible);
  const ids=slots.map(card=>card.cardId);
  return ids.slice(1).concat(ids.slice(0,1));
 });
 assert.equal(applyHiddenIds(state,visible,assignments),true);
 for(const player of state.players){
  player.deck.reverse();
  player.life.reverse();
 }
 const after=encodeState(observeActor(packs,state,0),0,[]);
 assert.equal(sameVector(before,after),true);
 const hiddenAfter=state.players.map(player=>hiddenSlots(player,visible).map(card=>card.uid+':'+card.cardId));
 assert.equal(JSON.stringify(hiddenBefore)===JSON.stringify(hiddenAfter),false);
 const seen=observeActor(packs,state,0);
 assert.equal(seen.visible.players[1].hand,null);
 assert.equal('deck' in seen.visible.players[0],false);
 assert.equal('life' in seen.visible.players[1],false);
});

test('imitation and evaluation keep the same public history',{timeout:180000},()=>{
 const net=createNet(INIT_SEED);
 const spec=mode=>({
  seed:188490,first:0,mode,maxSteps:18,keepActions:true,progress:false,
  seats:[
   {deckId:'white-sword',kind:'nn',explore:0},
   {deckId:'white-sword',kind:'nn',explore:0}
  ],
  nets:[cloneNet(net),cloneNet(net)],recordSeats:[],teacherSeats:[]
 });
 const imitate=playMatch(spec('imitate'));
 const evaluated=playMatch(spec('eval'));
 assert.ok(imitate.publicHistory.length>0);
 assert.deepEqual(imitate.publicHistory,evaluated.publicHistory);
 assert.deepEqual(imitate.actions,evaluated.actions);
 for(const step of imitate.publicHistory){
  assert.equal(/^[01]-\d+$/.test(step.cardId||''),false);
  assert.equal(Object.keys(step).some(key=>/uid/i.test(key)),false);
 }
});

test('greedy network play is legal, capped, and repeatable',{timeout:180000},()=>{
 const net=createNet(INIT_SEED);
 const first=playMatch(nnSpec(net,12));
 const second=playMatch(nnSpec(cloneNet(net),12));
 assert.deepEqual(first.actions,second.actions);
 assert.equal(first.anomalies.illegal,0);
 assert.equal(first.anomalies.leak,0);
 assert.equal(first.anomalies.engineError,0);
 assert.equal(first.steps,12);
 const capped=playMatch(nnSpec(net,4));
 assert.equal(capped.steps,4);
 assert.equal(capped.status,'playing');
 assert.equal(capped.endReason,'step-cap');
 assert.equal(capped.anomalies.unfinished,1);
 assert.equal(capped.anomalies.illegal,0);
 assert.equal(capped.anomalies.leak,0);
});
