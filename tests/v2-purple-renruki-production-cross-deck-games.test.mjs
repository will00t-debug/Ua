import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview} from '../dist/universal-v2/preview-replay.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';

const pack=createBleachV2Pack(),packs=[pack,pack];
const rows=summarizeDesignatedDecks(id=>!!pack.cards[id]);
const deck=Object.fromEntries(rows.map(r=>[r.key,designatedPlayableCounts(r)]));
function allUids(s){
 const out=[],walk=x=>{out.push(x.uid);for(const c of x.stack||[])walk(c);for(const c of x.under||[])walk(c);};
 for(const p of s.players){
  for(const z of ['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'])
   for(const c of p[z]||[])walk(c);
  for(const c of [...p.front,...p.energy])if(c)walk(c);
 }
 return out.sort();
}
test('all three designated BLEACH lists stay source-pinned and legal 50-card V2 packs',()=>{
 assert.deepEqual(rows.map(r=>[r.key,r.kinds,r.copies,r.playable]),[
  ['reject-blue',13,50,true],['white-sword',13,50,true],['renruki',13,50,true]]);
 for(const row of rows){
  assert.deepEqual(validateUniversalDeck(pack,deck[row.key]),[]);
  assert.equal(row.entries.every(c=>c.sourcePinned===true),true);
 }
 assert.deepEqual(Object.keys(deck.renruki).sort(),[
 'BLC-1-039','BLC-1-041','BLC-1-047','BLC-1-053','BLC-2-052','BLC-4-048',
 'BLC-4-049','BLC-4-050','BLC-4-054','BLC-4-058','BLC-4-059','BLC-4-082','BLC-4-083'].sort());
});
test('original purple deck vs blue/green and mirror finishes legally with UID/replay fidelity',()=>{
 const cases=[
  ['renruki','reject-blue',0,2801],
  ['renruki','reject-blue',1,2802],
  ['renruki','white-sword',0,2803],
  ['renruki','white-sword',1,2804],
  ['renruki','renruki',0,2805],
  ['renruki','renruki',1,2806]
 ];
 for(const [one,two,first,seed] of cases){
  let state=newUniversalMatch(packs,{decks:[deck[one],deck[two]],first,seed});
  let tape=makeUniversalPreviewReplay(packs,{decks:[deck[one],deck[two]],first,seed});
  let steps=0,aiFallbacks=0;
  for(;steps<2500&&state.status==='playing';steps++){
   const actions=legalUniversalActions(packs,state);
   assert.ok(actions.length>0,'no legal action '+one+'/'+two+' step '+steps+' pending '+state.pending?.kind);
   const ai=chooseUniversalAiAction(packs,state,{difficulty:'normal'});
   const action=ai||actions.find(a=>a.type==='next')||
    actions.find(a=>a.type==='chooseBlock'&&a.uid===null)||
    actions.find(a=>a.type==='chooseTrigger'&&a.mode==='skip')||actions[0];
   if(!ai)aiFallbacks++;
   assert.ok(actions.some(a=>JSON.stringify(a)===JSON.stringify(action)),'AI illegal at '+steps);
   const before=allUids(state),actor=state.pending?.player??state.active;
   state=dispatchUniversalAction(packs,state,action,{actor});
   tape=appendUniversalReplay(tape,action,actor);
   assert.deepEqual(allUids(state),before,'UID conservation at '+steps);
   if(steps%30===0)assert.equal(assertUniversalMatch(packs,state),true);
  }
  assert.equal(state.status,'finished',one+'/'+two+' seed '+seed+' stopped after '+steps);
  assert.ok(state.winner===0||state.winner===1);
  assert.equal(assertUniversalMatch(packs,state),true);
  assert.deepEqual(replayUniversalPreview(packs,tape,{maxActions:2501}),state,
   'exact replay mismatch '+one+'/'+two+' '+seed);
  console.log('PURPLE_GAME_RESULT',JSON.stringify({one,two,first,seed,steps,winner:state.winner,
   endReason:state.endReason,aiFallbacks,replay:'PASS'}));
 }
});
