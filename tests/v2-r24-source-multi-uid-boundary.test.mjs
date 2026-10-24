import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const ids=Array.from({length:13},(_,i)=>'C'+i);
const print=ids.map((id,i)=>({
 id,name:i===0?'SourceRole':i===1?'NamedPhysicalTrigger':id,
 color:'purple',type:i===1?'event':'character',energy:0,ap:1,bp:i===1?0:3000,gen:i===1?0:1,
 implementation:[0,1].includes(i)?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[{op:'drawDiscard',count:1,discardCount:2},{op:'draw',count:1}]}}:{}),
 ...(i===1?{moveTriggers:[{when:{from:'hand',to:'outside',
  reasons:['payment','own-effect'],sourceName:'SourceRole',sourceColor:'purple',
  sourceOnField:true},then:[{op:'draw',count:1}]}]}:{})
}));
const a=createUniversalPack({id:'r24-source-title-a',cards:print});
const b=createUniversalPack({id:'r24-source-title-b',cards:print});
const packs=[a,b];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const li=s.players[p][zone],index=li.findIndex(x=>x.cardId===id);
  if(index>=0)return li.splice(index,1)[0];
 }throw Error('missing UID');
}
function start(owner){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:240020,first:owner});
 const source=take(s,owner,'C0'),t1=take(s,owner,'C1'),t2=take(s,owner,'C1');
 s.players[owner].hand.push(source,t1,t2);
 while(s.phase!=='main')s=dispatchUniversalAction(packs,s,{type:'next'},{actor:owner});
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===source.uid&&x.line==='front');
 assert.ok(play);s=dispatchUniversalAction(packs,s,play,{actor:owner});
 return {s,source,t1,t2};
}
for(const owner of [0,1])test('cross-title source boundary: two same-print distinct UIDs drain after full source, owner '+owner,()=>{
 let {s,source,t1,t2}=start(owner);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.ok(s.effectQueue.some(j=>j.op==='sourceResolutionBoundary'&&j.sourceUid===source.uid));
 const hand=legalUniversalActions(packs,s);
 assert.ok(hand.some(a=>a.uid===t1.uid)&&hand.some(a=>a.uid===t2.uid));
 for(const difficulty of ['normal','hard'])
  assert.ok(hand.some(a=>JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
 const original=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:'forged'},{actor:owner}),/not currently legal/);
 assert.deepEqual(s,original);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:t2.uid},{actor:owner});
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.zoneMoveEvents.filter(e=>e.sourceUid===t1.uid||e.sourceUid===t2.uid).filter(e=>e.from==='deck').length,0);
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:t1.uid},{actor:owner});
 const draws=s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand'&&
  [source.uid,t1.uid,t2.uid].includes(e.sourceUid));
 assert.deepEqual(draws.map(x=>x.sourceUid),[source.uid,source.uid,t2.uid,t1.uid]);
 const paid=s.zoneMoveEvents.filter(x=>[t1.uid,t2.uid].includes(x.uid)&&x.to==='outside');
 assert.equal(paid.length,2);assert.deepEqual(paid.map(x=>x.uid),[t2.uid,t1.uid]);
 assert.ok(paid.every(x=>x.sourceUid===source.uid));
 assert.ok(paid[1].order<draws[2].order);
 assert.equal(s.effectQueue.length,0);assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
