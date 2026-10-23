import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const mk=(n,props={})=>({id:'QA-'+String(n).padStart(3,'0'),name:'card'+n,
 type:'character',color:'blue',energy:0,ap:1,bp:1000,gen:1,
 implementation:'vanilla',...props});
const effect={op:'deployOwnHandRest',type:'character',color:'blue',energy:2,ap:1,max:1};
const original=mk(1,{implementation:'dsl',effects:{onPlay:[effect]}});
const cards=[original,...Array.from({length:12},(_,i)=>mk(i+2,i===0?{energy:2}:
 i===1?{energy:3}:i===2?{color:'green'}:i===3?{ap:2}:{}))];
const pack=createUniversalPack({id:'qa-r39',version:'v1',cards});
const packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function fixture(id='QA-002'){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:539});
 const take=which=>{
  for(const zone of ['hand','deck','life','outside']){
   const k=s.players[0][zone].findIndex(c=>c.cardId===which);
   if(k!==-1)return s.players[0][zone].splice(k,1)[0];
  }throw Error('fixture missing '+which);
 };
 const src=take('QA-001'),chosen=take(id);
 s.players[0].hand.push(src,chosen);
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front');
 assert.ok(play,'source can be paid-played');
 s=dispatchUniversalAction(packs,s,play);
 return {s,src,chosen};
}
test('effect-only hand entry is REST, no second AP, correct source and UID event',()=>{
 let {s,src,chosen}=fixture();
 assert.equal(s.pending?.kind,'effect-hand-rest');
 const ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 const action=legalUniversalActions(packs,s).find(a=>a.uid===chosen.uid&&a.line==='energy');
 assert.ok(action);
 const prior=s.zoneMoveEvents.length;
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy[action.slot].uid,chosen.uid);
 assert.equal(s.players[0].energy[action.slot].ready,false);
 assert.ok(s.players[0].energy[action.slot].fieldEntryStamp>0);
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,ap);
 assert.equal(s.zoneMoveEvents.length,prior+1);
 const move=s.zoneMoveEvents.at(-1);
 assert.deepEqual([move.uid,move.sourceUid,move.from,move.to,move.reason],
 [chosen.uid,src.uid,'hand','energy','own-effect']);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('skip, forged UID, replayed choice and ownership are all rejected atomically',()=>{
 let {s,chosen}=fixture(),before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseHandRest',uid:'1-forged',line:'energy',slot:0}),/not currently legal/);
 assert.deepEqual(s,before);
 s=dispatchUniversalAction(packs,s,{type:'chooseHandRest',uid:null});
 assert.equal(s.pending,null);
 assert.throws(()=>dispatchUniversalAction(packs,s,
  {type:'chooseHandRest',uid:chosen.uid,line:'energy',slot:0}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('printed energy/AP/color (not generated energy) gate legal choices',()=>{
 for(const id of ['QA-003','QA-004','QA-005']){
  const {s,chosen}=fixture(id);
  assert.equal(s.pending?.kind,'effect-hand-rest');
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===chosen.uid));
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('AI and own private hand choices use the exact shared candidate list',()=>{
 const {s,chosen}=fixture();
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
 }
 assert.ok(universalPrivateChoices(packs,s,0).options.some(x=>x.action.uid===chosen.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const enemy=universalPublicView(packs,s,1);
 assert.equal(enemy.players[0].hand,null);
 assert.ok(!JSON.stringify(enemy).includes(chosen.uid));
});
test('strict printed REST entry profile rejects event, extra payment and negative limit',()=>{
 for(const wrong of [{...effect,type:'event'},{...effect,payAp:1},{...effect,energy:-1}]){
  assert.throws(()=>createUniversalPack({id:'qa-bad',version:'v1',
   cards:[{...original,effects:{onPlay:[wrong]}},...cards.slice(1)]}),/invalid/);
 }
});
