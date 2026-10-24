import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

// R54 reusable primitive, NOT a registered real-card claim.
const names=['ユウキ','マザーズ・ロザリオ'];
const base=(id,name=id)=>({id,name,type:'character',color:'green',
 energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,
 implementation:'vanilla',effects:{}});
const actor={...base('attack'),implementation:'dsl',
 effects:{onAttack:[{op:'drawIfOwnOutsideNamedCountAtLeast',
  min:4,count:1,names,optional:true}]}};
const cards=[actor,base('yuuki','ユウキ'),base('rosario','マザーズ・ロザリオ'),
 ...Array.from({length:10},(_,i)=>base('f'+i))];
const pack=createUniversalPack({id:'r54-optional-named-draw',cards});
const both=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const pool=s.players[p][zone],index=pool.findIndex(c=>c.cardId===id);
  if(index>=0)return pool.splice(index,1)[0];
 }
 throw Error('Missing printed physical card '+id);
}
function scene(n){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:54000+n});
 const attacker=take(s,0,'attack');
 attacker.fieldEntryStamp=s.nextFieldEntryStamp++;attacker.ready=true;
 s.players[0].front[0]=attacker;
 const source=[
  ...Array.from({length:4},()=>take(s,0,'yuuki')),
  ...Array.from({length:4},()=>take(s,0,'rosario'))];
 s.players[0].outside.push(...source.slice(0,n));
 s.players[0].deck.push(...source.slice(n));
 for(let i=0;i<3;i++)s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 return {s,attacker};
}
test('R54 conditional own OUTSIDE 3/4/5/8 gate and optional skip/draw',()=>{
 for(const n of [3,4,5,8]){
  let {s,attacker}=scene(n);
  const before=s.players[0].deck.length;
  s=use(s,{type:'attack',uid:attacker.uid});
  assert.equal(s.pending?.kind,n>=4?'effect-optional-draw':'block');
  if(n>=4){
   const options=legalUniversalActions(both,s);
   assert.deepEqual(options.map(x=>x.mode),['skip','draw']);
   assert.throws(()=>use(s,{type:'chooseOptionalDraw',mode:'mill'}));
   const skipped=use(s,{type:'chooseOptionalDraw',mode:'skip'});
   assert.equal(skipped.players[0].deck.length,before);
   assert.equal(skipped.pending?.kind,'block');
   s=use(s,{type:'chooseOptionalDraw',mode:'draw'});
   assert.equal(s.players[0].deck.length,before-1);
   assert.equal(s.pending?.kind,'block');
  }else assert.equal(s.players[0].deck.length,before);
  assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
  assert.equal(universalPublicView(both,s,1).players[0].hand,null);
  for(const difficulty of ['easy','normal','hard']){
   const ai=chooseUniversalAiAction(both,s,{difficulty});
   assert.ok(legalUniversalActions(both,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  }
 }
});
test('R54 stamped pending rejects forged UID/stamp, wrong player, and no attack',()=>{
 let {s,attacker}=scene(4);
 s=use(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending?.kind,'effect-optional-draw');
 for(const patch of [{sourceUid:'0-forged'},{sourceStamp:999999},
  {player:1},{extra:'injected'}]){
  const bad=structuredClone(s);Object.assign(bad.pending,patch);
  assert.throws(()=>assertUniversalMatch(both,bad));
 }
 const noAttack=structuredClone(s);delete noAttack.attacksByUid[attacker.uid];
 assert.throws(()=>assertUniversalMatch(both,noAttack));
});
test('R54 optional draw is attack-only, and rejects forced/unknown shapes',()=>{
 const op=actor.effects.onAttack[0];
 for(const variant of [
  {...op,optional:'yes'}, {...op,count:2,optional:true},
  {...op,min:0},{...op,names:['ユウキ','ユウキ']},
  {...op,optional:true,force:true}
 ]){
  assert.throws(()=>createUniversalPack({id:'r54-reject',cards:[
   {...actor,effects:{onAttack:[variant]}}]}));
 }
 assert.throws(()=>createUniversalPack({id:'r54-reject-play',cards:[
  {...actor,effects:{onPlay:[op]}}]}));
});
