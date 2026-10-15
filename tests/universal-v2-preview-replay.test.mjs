import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview,
 publicPreviewActionLabel,publicPreviewTranscript} from '../dist/universal-v2/preview-replay.mjs';

const packs=[verifiedTtgRedPilotDeck(),verifiedBleachPurplePilotDeck()];
const titles=packs.map(x=>x.pack);
const deckCounts=packs.map(x=>x.counts);
function start(seed=703,first=0){return {
 tape:makeUniversalPreviewReplay(titles,{decks:deckCounts,seed,first}),
 state:newUniversalMatch(titles,{decks:deckCounts,seed,first})
};}

test('preview replay faithfully reconstructs official 50 vs 50 across two titles, all actor handoffs and private choices',()=>{
 for(const {seed,first,difficulty}of [
  {seed:703,first:0,difficulty:'normal'},
  {seed:991,first:1,difficulty:'hard'}]){
  let {tape,state}=start(seed,first),count=0;
  const originalCounts=structuredClone(deckCounts);
  for(;count<200&&state.status==='playing';count++){
   const actor=state.pending?.player??state.active;
   const a=chooseUniversalAiAction(titles,state,{difficulty});
   assert.ok(legalUniversalActions(titles,state).some(x=>JSON.stringify(x)===JSON.stringify(a)));
   const old=state;
   state=dispatchUniversalAction(titles,state,a,{actor});
   tape=appendUniversalReplay(tape,a,actor);
   if(count%28===0)assert.equal(assertUniversalMatch(titles,state),true);
   assert.equal(tape.actions.length,count+1);
   assert.ok(publicPreviewActionLabel(titles,old,state,a,actor).startsWith(actor?'電腦：':'你：'));
  }
  assert.ok(count>40);
  const rebuilt=replayUniversalPreview(titles,tape);
  assert.deepEqual(rebuilt,state);
  assert.deepEqual(deckCounts,originalCounts);
  assert.deepEqual(tape.initialCounts,originalCounts);
 }
});

test('preview replay refuses altered actor, tampered action, wrong card-rules version and excessive steps',()=>{
 const {state,tape}=start();
 const step=legalUniversalActions(titles,state).find(a=>a.type==='next');
 const valid=appendUniversalReplay(tape,step,0);
 assert.equal(replayUniversalPreview(titles,valid).phase,'move');
 assert.throws(()=>replayUniversalPreview(titles,{
  ...valid,actions:[{actor:1,action:step}]
 }),/Wrong player turn/);
 assert.throws(()=>replayUniversalPreview(titles,{
  ...valid,actions:[{actor:0,action:{type:'attack',uid:'1-999'}}]
 }),/not currently legal/);
 assert.throws(()=>replayUniversalPreview(titles,{
  ...valid,packVersions:[titles[0].version,'modified']
 }),/Invalid preview replay/);
 assert.throws(()=>replayUniversalPreview(titles,valid,{maxActions:0}),/Invalid preview replay/);
 const extended=appendUniversalReplay(valid,{type:'next'},0);
 assert.equal(valid.actions.length,1,'replay tape must be append-only and immutable to previous caller');
 assert.equal(extended.actions.length,2);
});

test('AI private deck-search / top-order / discard choices never expose hidden card name or UID in public journal',()=>{
 const {state}=start();
 const hidden=state.players[1].deck[0],hand=state.players[1].hand[0];
 assert.ok(hidden&&hand);
 for(const action of [
  {type:'chooseDeckSearch',uid:hidden.uid},
  {type:'chooseDeckSearchMulti',uid:hidden.uid},
  {type:'chooseTopOrder',uid:hidden.uid},
  {type:'chooseDiscardGate',uid:hand.uid},
  {type:'chooseLeaveReplacement',mode:'protect',uid:hidden.uid}
 ]){
  const output=publicPreviewActionLabel(titles,state,state,action,1);
  assert.ok(output.startsWith('電腦：'));
  assert.ok(!output.includes(hidden.uid)&&!output.includes(hand.uid));
  assert.ok(!output.includes(titles[1].cards[hidden.cardId].name));
  assert.ok(!output.includes(titles[1].cards[hand.cardId].name));
 }
});

test('public journal shows printed names only AFTER opponent cards become public',()=>{
 let {state}=start();
 const hand=state.players[1].hand[0];
 const pretend={type:'play',uid:hand.uid,line:'energy',slot:0};
 const hidden=publicPreviewActionLabel(titles,state,state,pretend,1);
 assert.ok(!hidden.includes(titles[1].cards[hand.cardId].name));
 const visible=structuredClone(state);
 visible.players[1].hand.splice(visible.players[1].hand.findIndex(c=>c.uid===hand.uid),1);
 visible.players[1].energy[0]=hand;
 const disclosed=publicPreviewActionLabel(titles,state,visible,pretend,1);
 assert.ok(disclosed.includes(titles[1].cards[hand.cardId].name));
 assert.ok(!disclosed.includes(hand.uid));
 const transcript=publicPreviewTranscript({header:'match preview',lines:[hidden,disclosed]});
 assert.ok(transcript.startsWith('match preview\n'));
 assert.ok(!transcript.includes(hand.uid));
});

test('player-visible debug log and exact internal tape remain explicitly separate',()=>{
 const {state,tape}=start();
 const uid=state.players[1].deck[0].uid,privateAct={type:'chooseTopOrder',uid};
 const publicLog=publicPreviewActionLabel(titles,state,state,privateAct,1);
 const internal=appendUniversalReplay(tape,privateAct,1);
 assert.ok(!publicLog.includes(uid));
 assert.equal(internal.actions[0].action.uid,uid,
  'user-authorized JSON debug export may include private identities, but visible text must not');
});
