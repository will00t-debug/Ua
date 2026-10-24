import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const cards=Array.from({length:13},(_,i)=>({
 id:'L'+i,name:'L'+i,type:'character',color:'yellow',energy:0,ap:1,bp:2000,
 gen:1,implementation:i===0?'dsl':'vanilla',
 ...(i===0?{printedAttackDamage:2}:{}),
 ...(i===3?{trigger:'draw'}:{}),...(i===4?{trigger:'get'}:{}),
 ...(i===5?{trigger:'final'}:{})
}));
const pack=createUniversalPack({id:'r22-q73-atomic-battle',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function duel(ids){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:220073});
 const attacker=take(s,0,'L0');attacker.ready=true;s.players[0].front[0]=attacker;
 const pl=s.players[1];pl.deck.push(...pl.life.splice(0));
 const chosen=ids.map(id=>take(s,1,id));pl.life.push(...chosen);
 s.phase='attack';
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'block');
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 return {s,chosen};
}
test('Q73 physical DAMAGE2 both revealed at once, defender can pick reverse trigger order',()=>{
 let {s,chosen}=duel(['L3','L4']);
 assert.equal(s.pending?.kind,'life-batch-order');
 assert.deepEqual(s.publicReveals.map(x=>x.uid),chosen.map(x=>x.uid));
 assert.deepEqual(s.players[1].lifeRevealed.map(x=>x.uid),chosen.map(x=>x.uid));
 assert.equal(s.players[1].life.length,0);
 assert.equal(s.players[1].outside.some(c=>chosen.some(x=>x.uid===c.uid)),false);
 const legal=legalUniversalActions(packs,s);
 assert.deepEqual(legal.map(x=>x.uid),chosen.map(x=>x.uid));
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(x=>x.uid===ai.uid));
 }
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:'1-999'}),/not currently legal/);
 const frozen=structuredClone(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:chosen[1].uid},{actor:1});
 assert.deepEqual(frozen.players[1].lifeRevealed.map(x=>x.uid),chosen.map(x=>x.uid));
 assert.equal(s.pending?.uid,chosen[1].uid);assert.equal(s.pending?.kind,'life-trigger');
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'},{actor:1});
 assert.ok(s.players[1].hand.some(c=>c.uid===chosen[1].uid));
 assert.equal(s.pending?.uid,chosen[0].uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.players[1].outside.some(c=>c.uid===chosen[0].uid),true);
 assert.equal(s.lifeRevealBatch,null);
 const entries=s.zoneMoveEvents.filter(e=>chosen.some(c=>c.uid===e.uid));
 assert.equal(entries.filter(e=>e.to==='lifeRevealed').length,2);
 assert.equal(entries.filter(e=>e.from==='lifeRevealed'&&e.to==='hand').length,1);
 assert.ok(!JSON.stringify(universalPublicView(packs,s,0)).includes('lifeRevealBatch'));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Q36 both FINAL checks: first restores one LIFE, second no longer activates',()=>{
 let {s,chosen}=duel(['L5','L5']);
 assert.equal(s.pending?.kind,'life-batch-order');
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:chosen[1].uid},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.ok(legalUniversalActions(packs,s).some(x=>x.mode==='final'));
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(s.players[1].outside.filter(x=>chosen.some(z=>z.uid===x.uid)).length,2);
 assert.equal(s.pending,null);
 assert.equal(s.lifeRevealBatch,null);
 assert.equal(s.status,'playing');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Q35 controller can release no-trigger first while other revealed trigger stays',()=>{
 let {s,chosen}=duel(['L7','L3']);
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:chosen[0].uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===chosen[0].uid));
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.uid,chosen[1].uid);
 assert.ok(s.players[1].lifeRevealed.some(c=>c.uid===chosen[1].uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.status,'finished');assert.equal(s.winner,0);
 assert.equal(s.players[1].lifeRevealed.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Q72 one remaining LIFE caps DAMAGE2 batch; FINAL restores one',()=>{
 let {s,chosen}=duel(['L5']);
 assert.equal(s.publicReveals.length,1);
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending?.uid,chosen[0].uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'final'},{actor:1});
 assert.equal(s.players[1].life.length,1);
 assert.equal(s.status,'playing');
 assert.equal(s.lifeRevealBatch,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
