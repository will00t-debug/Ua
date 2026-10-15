import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const ids=Array.from({length:13},(_,i)=>'K'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));counts.K12=2;
function make(title){
 const cards=ids.map((id,i)=>({
  id,name:i===1?'Group Ability':i===2?'Own Ability':'Unit '+i,
  type:'character',color:'red',energy:i===0?0:1,ap:1,
  bp:2000,gen:i===0?4:1,implementation:'vanilla'
 }));
 cards[1]={...cards[1],implementation:'dsl',templateEffects:{onPlay:[
  {template:'oncePerTurnThen',scope:'name',optional:true,then:[
   {template:'draw',count:1}
  ]}
 ]}};
 cards[2]={...cards[2],implementation:'dsl',templateEffects:{onPlay:[
  {template:'oncePerTurnThen',scope:'card',optional:false,then:[
   {template:'draw',count:1}
  ]}
 ]}};
 return createUniversalPack({id:title,cards});
}
const packs=[make('title-a'),make('title-b')];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Card missing '+id);
}
function ready(){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1004,first:0});
 const generator=take(s,0,'K00');s.players[0].energy[0]=generator;
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const p=s.players[0];p.apCards.forEach(c=>{c.inPlay=true;c.ready=true});
 // Preload all tested physical sources BEFORE counting remaining deck.
 // Otherwise a copy taken from the deck for a fixture "play" would be
 // incorrectly counted as a triggered draw.
 // Source fixtures must be distinct physical UIDs. Calling take() on
 // the hand merely removes/re-adds its FIRST matching card, and silently
 // leaves later copies in the deck. Preload to an exact per-ID hand count.
 for(const [id,needed] of [['K01',3],['K02',2]]){
  while(p.hand.filter(c=>c.cardId===id).length<needed){
   let source=null;
   for(const zone of ['deck','life','outside']){
    const index=p[zone].findIndex(c=>c.cardId===id);
    if(index>=0){source=p[zone].splice(index,1)[0];break;}
   }
   if(!source)throw Error('Fixture missing distinct copy '+id);
   p.hand.push(source);
  }
 }
 assert.equal(new Set(p.hand.map(c=>c.uid)).size,p.hand.length);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(s.phase,'main');return s;
}
function play(s,id,slot){
 const physical=take(s,0,id);s.players[0].hand.push(physical);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===physical.uid&&a.line==='front'&&a.slot===slot);
 assert.ok(action,'Expected legal paid play '+id);
 return dispatchUniversalAction(packs,s,action,{actor:0});
}
test('declining optional same-name use spends no usage; next identical physical copy can activate once',()=>{
 let s=ready(),n=s.players[0].deck.length;
 s=play(s,'K01',0);
 assert.equal(s.pending.kind,'effect-once-choice');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOnceEffect',mode:'skip'},
  {type:'chooseOnceEffect',mode:'activate'}
 ]);
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'normal'}),
  {type:'chooseOnceEffect',mode:'activate'});
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'easy'}),
  {type:'chooseOnceEffect',mode:'skip'});
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'skip'},{actor:0});
 assert.equal(s.players[0].deck.length,n);
 assert.equal(s.onceEffectUses[0].length,0);
 s=play(s,'K01',1);
 assert.equal(s.pending.kind,'effect-once-choice');
 s=dispatchUniversalAction(packs,s,{type:'chooseOnceEffect',mode:'activate'},{actor:0});
 assert.equal(s.players[0].deck.length,n-1);
 assert.deepEqual(s.onceEffectUses[0],['name:Group Ability']);
 s=play(s,'K01',2);
 assert.equal(s.pending,null,'same name ability not offered again this turn');
 assert.equal(s.players[0].deck.length,n-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('per-card UID limit allows two different physical copies of same printed ID to trigger separately',()=>{
 let s=ready(),n=s.players[0].deck.length;
 s=play(s,'K02',0);
 s=play(s,'K02',1);
 assert.equal(s.players[0].deck.length,n-2);
 assert.equal(s.onceEffectUses[0].length,2);
 assert.ok(s.onceEffectUses[0].every(k=>k.startsWith('uid:0-')));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('once-per-turn accounting resets when the turn passes to the other player',()=>{
 let s=ready();
 s=play(s,'K02',0);
 assert.equal(s.onceEffectUses[0].length,1);
 // Fixture preloads several distinct real hand UIDs, so hand > 8 at
 // end phase. Finish the actual mandatory end-hand-limit choices before
 // asserting next-turn reset. The engine must not silently discard them.
 let steps=0;
 while(s.active===0&&steps++<16){
  const legal=legalUniversalActions(packs,s);
  const a=s.pending?.kind==='end-hand-limit'?
   legal.find(x=>x.type==='chooseHandLimit'):
   legal.find(x=>x.type==='next');
  assert.ok(a,'No legal action to finish source-player turn');
  s=dispatchUniversalAction(packs,s,a,{actor:0});
 }
 assert.equal(s.active,1);
 assert.deepEqual(s.onceEffectUses,[[],[]]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('unknown nested template and recursive gate are rejected (cannot ignore printed cost)',()=>{
 const original={
  id:'BAD',name:'Bad',color:'red',type:'character',energy:1,ap:1,bp:2000,
  gen:1,implementation:'dsl'
 };
 const invalid=[
  {template:'oncePerTurnThen',scope:'all',optional:true,
   then:[{template:'draw',count:1}]},
  {template:'oncePerTurnThen',scope:'name',then:[{template:'draw',count:1}]},
  {template:'oncePerTurnThen',scope:'card',optional:true,then:[]},
  {template:'oncePerTurnThen',scope:'card',optional:false,then:[
   {template:'payDiscardThen',optional:true,then:[{template:'draw',count:1}]}
  ]}
 ];
 for(const e of invalid)assert.throws(()=>createUniversalPack({
  id:'bad',cards:[{...original,templateEffects:{onPlay:[e]}}]
 }),/invalid|incompatible/,JSON.stringify(e));
});
