import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalPublicView,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const payment={zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']};
const cards=Array.from({length:13},(_,i)=>({
 id:'N'+i,name:['Payment source','その名は斬月','月牙十字衝','Generic discard'][i]||'Other '+i,
 color:'blue',type:'character',energy:0,ap:1,bp:2000,gen:1,
 implementation:i===0?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[{op:'discardGate',optional:true,payment,then:[{op:'draw',count:1}]}]}}:{})
}));
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function build(other=false){
 const a=createUniversalPack({id:other?'bleach-style':'title-a',cards});
 const b=createUniversalPack({id:other?'ttg-style':'title-b',cards});
 return [a,b];
}
function take(s,p,id){
 for(const z of ['deck','life','hand','outside']){
  const a=s.players[p][z],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing '+id);
}
function setup(owner=0,withMatch=true){
 const packs=build();let s=newUniversalMatch(packs,{decks:[deck,deck],first:owner,seed:240019});
 const source=take(s,owner,'N0'),good=take(s,owner,'N1'),alt=take(s,owner,'N2'),
  bad=take(s,owner,'N3');
 s.players[owner].hand.push(source,bad);
 if(withMatch)s.players[owner].hand.push(good,alt);
 else s.players[owner].outside.push(good,alt);
 while(s.phase!=='main')s=dispatchUniversalAction(packs,s,{type:'next'},{actor:owner});
 const a=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(a);s=dispatchUniversalAction(packs,s,a,{actor:owner});
 return {packs,s,source,good,alt,bad,owner};
}
for(const owner of [0,1])test('typed substring payment across titles: only matching own hand physical UID; player + both AI modes '+owner,()=>{
 let {packs,s,source,good,alt,bad}=setup(owner);
 const legal=legalUniversalActions(packs,s);
 assert.equal(s.pending?.kind,'effect-discard-gate');
 assert.deepEqual(new Set(legal.filter(a=>a.uid!==null).map(a=>a.uid)),new Set([good.uid,alt.uid]));
 assert.ok(!legal.some(a=>a.uid===bad.uid));
 const privateOwn=universalPrivateChoices(packs,s,owner),privateEnemy=universalPrivateChoices(packs,s,1-owner);
 assert.ok(privateOwn.options.some(x=>x.card?.name==='その名は斬月'));
 assert.equal(privateEnemy,null);
 assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
 for(const difficulty of ['normal','hard']){
  const action=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(action)));
 }
 const prev=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:bad.uid},{actor:owner}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:good.uid},{actor:1-owner}),/Wrong player turn/);
 assert.deepEqual(s,prev);
 const handCount=s.players[owner].hand.length;
 const eventCount=s.zoneMoveEvents.length;
 s=JSON.parse(JSON.stringify(s));assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:good.uid},{actor:owner});
 assert.equal(s.pending,null);assert.equal(s.players[owner].hand.length,handCount);
 const paid=s.zoneMoveEvents.slice(eventCount).find(e=>e.uid===good.uid&&e.from==='hand'&&e.to==='outside');
 assert.ok(paid);assert.equal(paid.reason,'payment');assert.equal(paid.sourceUid,source.uid);
 assert.equal(s.zoneMoveEvents.filter(e=>e.from==='deck'&&e.to==='hand'&&e.sourceUid===source.uid).length,1);
 assert.equal(s.players[owner].hand.some(c=>c.uid===bad.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('typed name payment with no eligible matching hand cannot draw; optional skip never charges',()=>{
 let {packs,s}=setup(0,false);
 assert.equal(s.pending,null);
 assert.equal(s.zoneMoveEvents.some(e=>e.reason==='payment'),false);
 ({packs,s}=setup(1,true));
 const hand=s.players[1].hand.map(c=>c.uid),outside=s.players[1].outside.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null},{actor:1});
 assert.deepEqual(s.players[1].hand.map(c=>c.uid),hand);
 assert.equal(s.players[1].outside.length,outside);
 assert.equal(s.pending,null);
});
test('strict named-payment DSL schema and legacy unfiltered discard are distinct',()=>{
 for(const wrong of [
  {zone:'outside',field:'name',match:'containsAny',values:['斬月']},
  {zone:'hand',field:'color',match:'containsAny',values:['斬月']},
  {zone:'hand',field:'name',match:'regex',values:['斬月']},
  {zone:'hand',field:'name',match:'containsAny',values:['斬月','斬月']},
  {zone:'hand',field:'name',match:'containsAny',values:[]},
  {zone:'hand',field:'name',match:'containsAny',values:['斬月'],reveal:true}
 ]){
  const cs=cards.map(c=>({...c,...(c.id==='N0'?{effects:{onPlay:[
   {op:'discardGate',optional:true,payment:wrong,then:[{op:'draw',count:1}]}
  ]}}:{})}));
  assert.throws(()=>createUniversalPack({id:'invalid-typed-pay',cards:cs}),/invalid typed name payment/);
 }
 const legacy=cards.map(c=>({...c,...(c.id==='N0'?{effects:{onPlay:[{op:'discardGate',optional:true,then:[{op:'draw',count:1}]}]}}:{})}));
 assert.ok(createUniversalPack({id:'unfiltered-remains',cards:legacy}).cards.N0);
});
