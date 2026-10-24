import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

// C18 normal block, rechecked 2026-10-24. Strictly greater blocker BP retires
// the attacker on the attacker's turn and runs onRetire. Equality and a higher
// attacker retire only the blocker. No life is lost in any of the three.
// Sniper battles stay on resolveSniperBattle and are covered by the R55 tests.

const fillers=Array.from({length:10},(_,i)=>'F'+i);
const deck={LOW:4,MID:4,HIGH:4,...Object.fromEntries(fillers.map((id,i)=>[id,i===9?2:4]))};
function unit(id,bp,extra){
 return {id,name:id,color:'blue',type:'character',energy:0,ap:1,bp,gen:1,
  traits:[],trigger:null,implementation:extra?.effects?'dsl':'vanilla',effects:{},...extra};
}
const pack=createUniversalPack({id:'block-bp',cards:[
 unit('LOW',2000,{effects:{onRetire:[{op:'draw',count:1}]}}),
 unit('MID',3000),unit('HIGH',4000),...fillers.map(id=>unit(id,1000))
]});
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function attack(seed,attackerId,blockerId){
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed,first:0});
 for(let n=0;n<8&&s.phase!=='attack';n++)s=dispatchUniversalAction(pack,s,{type:'next'});
 const attacker=take(s,0,attackerId);attacker.ready=true;attacker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=attacker;
 const blocker=take(s,1,blockerId);blocker.ready=true;blocker.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=blocker;
 const life0=s.players[0].life.length,life1=s.players[1].life.length;
 const deck0=s.players[0].deck.length;
 s=dispatchUniversalAction(pack,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(pack,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 return {s,attacker,blocker,life0,life1,deck0};
}

test('a lower, equal, and higher attacker follow the normal block result',()=>{
 const low=attack(1801,'LOW','MID');
 assert.equal(low.s.players[0].front.some(c=>c?.uid===low.attacker.uid),false);
 assert.equal(low.s.players[0].outside.some(c=>c?.uid===low.attacker.uid),true);
 assert.equal(low.s.players[1].front.some(c=>c?.uid===low.blocker.uid),true);
 assert.equal(low.s.players[1].front[0].ready,false);
 assert.equal(low.s.players[0].deck.length,low.deck0-1);
 assert.equal(low.s.turnRetireEvents.some(e=>e.uid===low.attacker.uid),true);
 assert.equal(low.s.players[0].life.length,low.life0);
 assert.equal(low.s.players[1].life.length,low.life1);
 assert.equal(assertUniversalMatch(pack,low.s),true);

 const even=attack(1802,'MID','MID');
 assert.equal(even.s.players[0].front.some(c=>c?.uid===even.attacker.uid),true);
 assert.equal(even.s.players[1].outside.some(c=>c?.uid===even.blocker.uid),true);
 assert.equal(even.s.players[0].deck.length,even.deck0);
 assert.equal(even.s.players[1].life.length,even.life1);

 const high=attack(1803,'HIGH','MID');
 assert.equal(high.s.players[0].front.some(c=>c?.uid===high.attacker.uid),true);
 assert.equal(high.s.players[1].outside.some(c=>c?.uid===high.blocker.uid),true);
 assert.equal(high.s.players[1].life.length,high.life1);
 assert.equal(assertUniversalMatch(pack,high.s),true);
});
