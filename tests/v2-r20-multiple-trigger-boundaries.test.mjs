import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
// Explicitly SYNTHETIC copies of the movement shape, not an official card
// registration or a substitute for the full EX07BT/BLC-2-019 Raid/main print.
const ids=Array.from({length:13},(_,i)=>'K'+String(i).padStart(2,'0'));
const when={from:'hand',to:'outside',sourceName:'黒崎 一護',
 sourceColor:'blue',sourceOnField:true,reasons:['payment','own-effect']};
const cards=ids.map(id=>({
 id,name:id==='K00'?'黒崎 一護':id==='K01'?'その名は斬月':id,
 type:id==='K01'?'event':'character',color:'blue',energy:0,
 ap:1,bp:1000,gen:1,implementation:['K00','K01'].includes(id)?'dsl':'vanilla',
 ...(id==='K00'?{effects:{onPlay:[
  {op:'drawDiscard',count:1,discardCount:2},{op:'draw',count:1}]}}:{}),
 ...(id==='K01'?{moveTriggers:[{when,then:[{op:'draw',count:1}]}]}:{})
}));
const pack=createUniversalPack({id:'r20-two-physical-trigger-copies',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){for(const zone of ['hand','deck','life','outside']){
 const a=s.players[0][zone],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
}throw Error('Missing '+id)}
test('two different physical discard UIDs wait for the same source program end, trigger exactly twice',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:20205,first:0});
 const source=take(s,'K00'),first=take(s,'K01'),second=take(s,'K01');
 s.players[0].hand.push(source,first,second);
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.remaining,2);
 assert.equal(s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand').length,1);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:first.uid});
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.pending.remaining,1);
 assert.equal(s.zoneMoveEvents.filter(e=>e.sourceUid===first.uid&&e.to==='hand').length,0,
  'first delayed trigger must not fire before second legal discard');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:second.uid});
 const moves=s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand');
 assert.deepEqual(moves.map(e=>e.sourceUid),[source.uid,source.uid,first.uid,second.uid]);
 assert.equal(new Set(s.zoneMoveEvents.filter(e=>e.from==='hand'&&e.to==='outside')
  .map(e=>e.uid)).size,2);
 assert.equal(s.pending,null);
 assert.ok(!JSON.stringify(universalPublicView(packs,s,1)).includes('zoneMoveEvents'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('source-boundary state rejects forged checkpoints before resolving any cards',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:20206,first:0});
 const marker={op:'sourceResolutionBoundary',owner:0,sourceUid:'0-0',afterOrder:0};
 for(const value of [NaN,-1,Infinity,s.nextZoneMoveOrder]){
  const forged=structuredClone(s);
  forged.effectQueue.push({...marker,afterOrder:value});
  assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid source-resolution boundary/);
 }
 for(const uid of ['1-2','corrupt']){
  const forged=structuredClone(s);
  forged.effectQueue.push({...marker,sourceUid:uid});
  assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid source-resolution boundary/);
 }
});
