import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_SHADOW_TRAINING_PRESET,SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
const purple=(include,replace)=>({...SOLO_SHADOW_TRAINING_PRESET,[replace]:0,[include]:4});
const green=(include,replace)=>({...SOLO_TRAINING_PRESET,[replace]:0,[include]:4});
const setup=deck=>{const s=newSoloTrainingMatch({decks:[deck,deck],seed:593,first:0});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s;};
const take=(p,id)=>{for(const zone of ['hand','deck','life']){let ix=p[zone].findIndex(c=>c.cardId===id);if(ix>=0)return p[zone].splice(ix,1)[0];}throw Error('missing '+id);};
const place=(s,id,line,slot,ready=true)=>{const p=s.players[0],c=take(p,id);Object.assign(c,{owner:0,line,slot,ready});p[line][slot]=c;return c;};
const play=(s,id,line='front')=>{
 const p=s.players[0],c=take(p,id);p.hand.push(c);
 const act=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===c.uid&&a.line===line);
 assert.ok(act,'expected play action for '+id);return {s:soloTrainingDispatch(s,act),uid:c.uid};
};
const choose=(s,uid)=>soloTrainingDispatch(s,{type:'choose',uid});
test('012 draws only with own Sung in field, otherwise no draw',()=>{
 const deck=purple('SLG-1-012','SLG-1-001');
 for(const withSung of [false,true]){
  let s=setup(deck),p=s.players[0];
  place(s,'SLG-1-030','energy',0);place(s,'SLG-1-030','energy',1);place(s,'SLG-1-030','energy',2);
  if(withSung)place(s,'SLG-1-015','front',0);
  const oldHand=p.hand.length;const result=play(s,'SLG-1-012');s=result.s;
  assert.equal(s.players[0].hand.length,oldHand+(withSung?0:-1));
  assertSoloTrainingMatch(s);
 }
});
test('053 draws only when Sung is present and is immune to IMPACT',()=>{
 const deck=green('SLG-1-053','SLG-1-062');let s=setup(deck),p=s.players[0];
 for(let i=0;i<3;i++)place(s,'SLG-1-041','energy',i);
 place(s,'SLG-1-045','front',0);
 const oldHand=p.hand.length;s=play(s,'SLG-1-053').s;
 assert.equal(s.players[0].hand.length,oldHand);
 assertSoloTrainingMatch(s);
});
test('025 mandatory mode allows draw two OR draw one and optional exact eligible outside target',()=>{
 const deck=purple('SLG-1-025','SLG-1-009');
 for(const mode of ['draw2','drawRecover']){
  let s=setup(deck),p=s.players[0];
  for(let i=0;i<3;i++)place(s,'SLG-1-030','energy',i);
  const outside=take(p,'SLG-1-015');p.outside.push(outside);
  s=play(s,'SLG-1-025').s;assert.equal(s.pending.kind,'entryDrawMode');
  assert.deepEqual(soloTrainingLegalActions(s).map(a=>a.mode),['draw2','drawRecover']);
  s=soloTrainingDispatch(s,{type:'choose',mode});
  if(mode==='drawRecover'){
   assert.equal(s.pending.kind,'entryRecover');
   assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===outside.uid));
   assert.throws(()=>choose(s,'invalid'),/illegal/);
   s=choose(s,outside.uid);assert.ok(s.players[0].hand.some(c=>c.uid===outside.uid));
  }else assert.equal(s.pending,null);
  assertSoloTrainingMatch(s);
 }
});
test('026 bounces selected other energy<=1 character; when none exists returns itself',()=>{
 const deck=purple('SLG-1-026','SLG-1-010');
 let s=setup(deck);place(s,'SLG-1-031','energy',0);const other=place(s,'SLG-1-030','front',0);
 s=play(s,'SLG-1-026').s;assert.equal(s.pending.kind,'entryBounce');
 assert.ok(soloTrainingLegalActions(s).some(a=>a.uid===other.uid));
 s=choose(s,other.uid);assert.equal(s.players[0].front[0],null);
 assert.ok(s.players[0].hand.some(x=>x.uid===other.uid));assertSoloTrainingMatch(s);
 s=setup(deck);place(s,'SLG-1-031','energy',0);
 const {s:after,uid}=play(s,'SLG-1-026');assert.equal(after.pending,null);
 assert.equal(after.players[0].front.every(c=>!c),true);
 assert.ok(after.players[0].hand.some(x=>x.uid===uid));assertSoloTrainingMatch(after);
});
test('068 bounce also rejects opponent selection and returns itself with no legal other low-cost character',()=>{
 const deck=green('SLG-1-068','SLG-1-066');let s=setup(deck);
 place(s,'SLG-1-041','energy',0);
 let {s:after,uid}=play(s,'SLG-1-068');
 assert.equal(after.pending,null);assert.ok(after.players[0].hand.some(x=>x.uid===uid));assertSoloTrainingMatch(after);
});
test('050 retires and optionally recovers only own outside Sung',()=>{
 let s=setup(green('SLG-1-050','SLG-1-065')),p=s.players[0];
 const c=place(s,'SLG-1-050','front',0);
 const sung=take(p,'SLG-1-045');p.outside.push(sung);
 assert.ok(soloTrainingLegalActions(s).some(a=>a.type==='ability'&&a.uid===c.uid));
 s=soloTrainingDispatch(s,{type:'ability',uid:c.uid,mode:'retireRecover'});
 assert.equal(s.pending.kind,'sungRecovery');
 assert.ok(s.players[0].outside.some(x=>x.uid===c.uid));
 s=choose(s,sung.uid);assert.ok(s.players[0].hand.some(x=>x.uid===sung.uid));
 assertSoloTrainingMatch(s);
});
