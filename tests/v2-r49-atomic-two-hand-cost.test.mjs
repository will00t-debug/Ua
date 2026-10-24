import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPrivateChoices,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Shared DSL integration only: this is NOT a complete BLC-4-042 card certification.
const cost={op:'discardGate',count:2,optional:true,then:[
 {op:'recoverOutsideOne',optional:true,filter:{field:'printedNameAny',values:['涅 マユリ','涅 ネム']}}]};
const cards=Array.from({length:13},(_,i)=>({
 id:'X'+i,name:'Filler '+i,type:'character',color:'blue',energy:0,ap:1,bp:1000,gen:1,
 traits:i===3?['涅 マユリ']:[],implementation:i===0?'dsl':'vanilla',
 ...(i===0?{effects:{onPlay:[cost]}}:{})
}));
cards[0].name='Source';cards[1].name='涅 マユリ';cards[2].name='涅 ネム';
const pack=createUniversalPack({id:'r49-hand2',cards});
const counts=Object.fromEntries(cards.map((x,i)=>[x.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,counts),[]);
const run=(s,a)=>dispatchUniversalAction(pack,s,a);
function take(s,id){
 for(const z of ['hand','deck','life','outside']){
  const arr=s.players[0][z],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }throw Error('missing '+id);
}
function setup(){
 let s=newUniversalMatch(pack,{decks:[counts,counts],first:0,seed:492});
 const src=take(s,'X0'),a=take(s,'X1'),b=take(s,'X2'),c=take(s,'X3');
 s.players[0].hand.push(src,a,b,c);
 while(s.phase!=='main')s=run(s,{type:'next'});
 const action=legalUniversalActions(pack,s).find(x=>x.type==='play'&&
  x.uid===src.uid&&x.line==='front');
 assert.ok(action);s=run(s,action);return {s,src,a,b,c};
}
test('R49 pair cost exposes only unordered distinct OWN UID pairs and private metadata',()=>{
 const {s,a,b}=setup(),options=legalUniversalActions(pack,s);
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.pending.count,2);
 const pairs=options.filter(x=>Array.isArray(x.uids));
 const n=s.players[0].hand.length;
 assert.equal(pairs.length,n*(n-1)/2,'every legal unordered pair of real hand UIDs');
 assert.ok(pairs.some(x=>x.uids.includes(a.uid)&&x.uids.includes(b.uid)));
 assert.ok(pairs.every(x=>x.uids.length===2&&new Set(x.uids).size===2));
 assert.equal(universalPrivateChoices(pack,s,1),null);
 assert.ok(universalPrivateChoices(pack,s,0).options.some(x=>x.cards?.length===2));
 assert.equal(universalPublicView(pack,s,1).players[0].hand,null);
 for(const difficulty of ['normal','hard'])assert.ok(options.some(x=>
  JSON.stringify(x)===JSON.stringify(chooseUniversalAiAction(pack,s,{difficulty}))));
 for(const invalid of [
  {type:'chooseDiscardGate',uid:a.uid},
  {type:'chooseDiscardGate',uids:[a.uid,a.uid]},
  {type:'chooseDiscardGate',uids:[a.uid,'1-5']}
 ]){
  const before=structuredClone(s);
  assert.throws(()=>run(s,invalid),/not currently legal/);
  assert.deepEqual(s,before);
 }
 const forged=structuredClone(s);forged.pending.sourceUid='0-false';
 assert.throws(()=>assertUniversalMatch(pack,forged),/atomic two-hand payment/);
 const bad=structuredClone(s);bad.pending.then=[{op:'draw',count:9}];
 assert.throws(()=>assertUniversalMatch(pack,bad),/atomic two-hand payment/);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
});
test('R49 two physical payment moves occur before dynamic OUTSIDE recovery and only two exact printed names qualify',()=>{
 let {s,src,a,b,c}=setup();
 const before=structuredClone(s),pre=s.zoneMoveEvents.length;
 const pair=legalUniversalActions(pack,s).find(x=>x.uids?.includes(a.uid)&&x.uids.includes(b.uid));
 assert.ok(pair);s=run(s,pair);
 assert.equal(s.pending?.kind,'effect-recover-outside');
 assert.ok(s.players[0].outside.some(x=>x.uid===a.uid));
 assert.ok(s.players[0].outside.some(x=>x.uid===b.uid));
 const paid=s.zoneMoveEvents.slice(pre).filter(x=>x.reason==='payment'&&x.sourceUid===src.uid);
 assert.deepEqual(new Set(paid.map(x=>x.uid)),new Set([a.uid,b.uid]));
 assert.deepEqual(paid.map(x=>x.from+'>'+x.to),['hand>outside','hand>outside']);
 const options=legalUniversalActions(pack,s);
 assert.ok(options.some(x=>x.uid===a.uid));
 assert.ok(options.some(x=>x.uid===b.uid));
 assert.ok(!options.some(x=>x.uid===c.uid));
 s=run(s,options.find(x=>x.uid===a.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===a.uid));
 assert.ok(!s.players[0].hand.some(x=>x.uid===b.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,JSON.parse(JSON.stringify(s))),true);
 assert.equal(assertUniversalMatch(pack,before),true);
});
test('R49 decline skips BOTH fees and invalid count three is rejected',()=>{
 let {s,a,b}=setup(),before=structuredClone(s);
 s=run(s,{type:'chooseDiscardGate',uid:null});
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].outside.map(x=>x.uid),
  before.players[0].outside.map(x=>x.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===a.uid)&&
  s.players[0].hand.some(x=>x.uid===b.uid));
 const invalid=cards.map((x,i)=>i===0?{...x,effects:{onPlay:[{...cost,count:3}]}}:x);
 assert.throws(()=>createUniversalPack({id:'bad-cost-count',cards:invalid}),/invalid gated payment/);
 for(const filter of [{field:'printedNameAny',values:['涅 マユリ','涅 マユリ']},
  {field:'printedNameAny',values:['涅 マユリ']},
  {field:'printedNameAny',values:['涅 マユリ','涅 ネム'],allowTraits:true}]){
  const malformed=cards.map((x,i)=>i===0?{...x,effects:{onPlay:[{...cost,then:[
   {op:'recoverOutsideOne',optional:true,filter}]}]}}:x);
  assert.throws(()=>createUniversalPack({id:'bad-recover',cards:malformed}),/invalid searched-card/);
 }
});
