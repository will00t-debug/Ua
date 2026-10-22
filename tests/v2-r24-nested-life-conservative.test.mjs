import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';
const cards=Array.from({length:13},(_,i)=>({
 id:'NL'+i,name:'NL '+i,type:'character',color:'green',energy:0,ap:1,bp:2000,gen:1,
 implementation:i===0?'dsl':'vanilla',
 ...(i===0?{printedAttackDamage:2}:{}),
 ...(i===1?{trigger:'final'}:{}),
 ...(i===2?{trigger:'draw'}:{})
}));
const pack=createUniversalPack({id:'r24-nested-life-model',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function move(s,p,id){
 for(const z of ['hand','life','deck','outside']){
  const list=s.players[p][z],idx=list.findIndex(c=>c.cardId===id);
  if(idx>=0)return list.splice(idx,1)[0];
 }
 throw Error('Missing physical '+id);
}
function state(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:240073});
 const attacker=move(s,0,'NL0');attacker.ready=true;s.players[0].front[0]=attacker;
 const p=s.players[1];p.deck.push(...p.life.splice(0));
 const final=move(s,1,'NL1'),draw=move(s,1,'NL2');p.life.push(final,draw);
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 assert.deepEqual(s.players[1].lifeRevealed.map(c=>c.uid),[final.uid,draw.uid]);
 return {s,final,draw};
}
for(const op of ['battleImpactDamage','additionalBattleDamage'])
 test('unresolved defender LIFE rejects attacker-side second damage atomically: '+op,()=>{
  let {s,final,draw}=state();
  s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:draw.uid},{actor:1});
  assert.equal(s.pending?.uid,draw.uid);
  s.effectQueue.unshift({op,owner:0,defender:0,remaining:1});
  const before=structuredClone(s),pub=universalPublicView(packs,s,0);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1}),
   /Nested LIFE reveal unresolved/);
  assert.deepEqual(s,before);assert.deepEqual(universalPublicView(packs,s,0),pub);
  assert.ok(s.players[1].lifeRevealed.some(c=>c.uid===final.uid));
  assert.equal(s.players[0].lifeRevealed.length,0);
  assert.equal(s.status,'playing');
  assert.equal(assertUniversalMatch(packs,s),true);
 });
test('FINAL replenishes LIFE but cannot start a second pending damage check; recovery replays safely',()=>{
 let {s,final,draw}=state();
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:final.uid},{actor:1});
 assert.equal(s.pending?.trigger,'final');
 s.effectQueue.unshift({op:'battleImpactDamage',owner:0,defender:0});
 const before=structuredClone(s);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1}),
  /Nested LIFE reveal unresolved/);
 assert.deepEqual(s,before,'failed chain must not partially restore or disclose next LIFE');
 assert.equal(s.players[1].life.length,0);
 s=JSON.parse(JSON.stringify(s));s.effectQueue.shift();
 assert.equal(assertUniversalMatch(packs,s),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.pending?.uid,draw.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.lifeRevealBatch,null);assert.equal(s.pending,null);
 assert.equal(s.status,'playing');assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
});


// R28 / official Q12: zero LIFE is provisional until every revealed trigger,
// including FINAL, and every continuation has fully resolved.
for(const finalFirst of [false,true])
 test('R28 Q12 zero-LIFE win check waits for entire trigger check; FINAL first '+finalFirst,()=>{
  let {s,final,draw}=state();
  assert.equal(s.players[1].life.length,0);
  assert.equal(s.status,'playing','revealing the last LIFE must not end the match');
  const order=finalFirst?[final,draw]:[draw,final];
  for(const [index,card] of order.entries()){
   const choices=legalUniversalActions(packs,s);
   if(s.pending?.kind==='life-batch-order'){
    const selected=choices.find(a=>a.type==='chooseLifeOrder'&&a.uid===card.uid);
    assert.ok(selected,'simultaneous unresolved triggers need a legal order');
    s=dispatchUniversalAction(packs,s,selected,{actor:1});
   }else{
    // The last remaining trigger is automatically entered by the existing
    // scheduler; requesting another order choice would be an illegal action.
    assert.equal(s.pending?.kind,'life-trigger');
    assert.equal(s.pending?.uid,card.uid);
   }
   assert.equal(s.status,'playing');
   assert.equal(s.pending?.kind,'life-trigger');
   const before=structuredClone(s),publicBefore=universalPublicView(packs,s,0);
   assert.throws(()=>dispatchUniversalAction(packs,s,
    {type:'chooseTrigger',mode:card.uid===final.uid?'draw':'final'},{actor:1}),
    /not currently legal/);
   assert.deepEqual(s,before);
   assert.deepEqual(universalPublicView(packs,s,0),publicBefore);
   s=JSON.parse(JSON.stringify(s));
   assert.equal(assertUniversalMatch(packs,s),true);
   s=dispatchUniversalAction(packs,s,
    {type:'chooseTrigger',mode:card.uid===final.uid?'final':'draw'},{actor:1});
   assert.equal(s.status,'playing');
   assert.equal(s.players[1].life.length,finalFirst||index===1?1:0);
  }
  assert.equal(s.players[1].life.length,1);
  assert.equal(s.lifeRevealBatch,null);
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(packs,s),true);
  assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 });
