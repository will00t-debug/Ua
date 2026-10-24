import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {countOwnOutsidePhysicalGroups} from '../dist/universal-v2/field-conditions.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// Not registered as SLG-1-021: remaining battle-win recovery, forced-block,
// conditional IMPACT and RAID LIFE still require source-complete integration.
const base=id=>({id,name:id,color:'purple',type:'character',
 energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,
 implementation:'vanilla',effects:{}});
const actor={...base('actor'),bp:4000,implementation:'dsl',effects:{onAttack:[
 {op:'buffSelfPerOwnOutsideGroups',unit:5,bpPerGroup:500}]}};
const cards=[actor,...Array.from({length:12},(_,i)=>base('f'+i))];
const pack=createUniversalPack({id:'r54-outside-groups-bp',cards});
const both=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const list=s.players[p][zone],i=list.findIndex(x=>x.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function scene(n){
 let s=newUniversalMatch(both,{decks:[deck,deck],seed:54121+n,first:0});
 const attacker=take(s,0,'actor');
 attacker.ready=true;attacker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=attacker;
 const sources=[
  ...Array.from({length:4},()=>take(s,0,'f0')),
  ...Array.from({length:4},()=>take(s,0,'f1')),
  ...Array.from({length:2},()=>take(s,0,'f2'))];
 s.players[0].outside.push(...sources.slice(0,n));
 s.players[0].deck.push(...sources.slice(n));
 s.players[1].outside.push(take(s,1,'f0'));
 assert.equal(assertUniversalMatch(both,s),true);
 return {s,attacker};
}
test('R54 SLG reusable floor(own OUTSIDE/5) applied AT ATTACK, never cached',()=>{
 for(const n of [0,4,5,9,10]){
  let {s,attacker}=scene(n);
  assert.equal(countOwnOutsidePhysicalGroups(s,0,5),Math.floor(n/5));
  assert.equal(universalBp(both,s,attacker),4000);
  for(let i=0;i<3;i++)s=use(s,{type:'next'});
  assert.equal(s.phase,'attack');
  s=use(s,{type:'attack',uid:attacker.uid});
  assert.equal(s.pending?.kind,'block');
  assert.equal(universalBp(both,s,s.players[0].front[0]),4000+500*Math.floor(n/5));
  // The buff is a once-earned attack-time result, not a continuous tally.
  if(s.players[0].outside.length){
   s.players[0].hand.push(s.players[0].outside.pop());
   assert.equal(universalBp(both,s,s.players[0].front[0]),4000+500*Math.floor(n/5));
  }
  assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
  for(const difficulty of ['easy','normal','hard']){
   const ai=chooseUniversalAiAction(both,s,{difficulty});
   assert.ok(legalUniversalActions(both,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  }
 }
});
test('R54 onAttack group BP rejects invalid divisor, modifier and timing',()=>{
 const effect=actor.effects.onAttack[0];
 for(const e of [
  {...effect,unit:0},{...effect,unit:201},{...effect,unit:1.5},
  {...effect,bpPerGroup:501},{...effect,bpPerGroup:0},
  {...effect,bonus:500}
 ]){
  assert.throws(()=>createUniversalPack({id:'r54-bp-invalid',cards:[
   {...actor,effects:{onAttack:[e]}}]}));
 }
 assert.throws(()=>createUniversalPack({id:'r54-bp-onplay',cards:[
  {...actor,effects:{onPlay:[effect]}}]}));
});
test('R54 same physical UID twice or wrong owner in OUTSIDE fails closed',()=>{
 const {s}=scene(5);
 s.players[0].outside.push(s.players[0].outside[0]);
 assert.throws(()=>countOwnOutsidePhysicalGroups(s,0,5));
 const other=scene(5).s;other.players[0].outside[0].uid='1-999999';
 assert.throws(()=>countOwnOutsidePhysicalGroups(other,0,5));
});
