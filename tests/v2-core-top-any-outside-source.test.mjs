import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalPrivateChoices,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const printed=CARDS.find(c=>c.identity==='BLC-4-013');
assert.ok(printed);
assert.match(printed.effect,/任意張/);
const cards=[{id:'BLC-4-013',name:printed.nameJa||printed.name,type:'character',
 color:'yellow',energy:1,ap:1,bp:2000,gen:1,implementation:'dsl',
 templateEffects:{onPlay:[{template:'inspectTopAnyOutside',count:2,rest:'top'}]}},
 ...Array.from({length:12},(_,i)=>({id:'TEST-ONLY-'+i,
  name:'Fixture only '+i,type:'character',color:'yellow',energy:0,ap:1,
  bp:1500,gen:2,implementation:'vanilla'}))];
const pack=createUniversalPack({id:'source-anchored-bleach-013',cards});
const packs=[pack,pack];
const counts=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function setup(){
 let s=newUniversalMatch(packs,{decks:[counts,counts],first:0,seed:972});
 const player=s.players[0];
 const take=id=>{
  for(const zone of ['hand','deck','life','outside']){
   const i=player[zone].findIndex(c=>c.cardId===id);
   if(i!==-1)return player[zone].splice(i,1)[0];
  }
  throw Error('QA fixture card missing '+id);
 };
 const toPlay=take('BLC-4-013'),energy=take('TEST-ONLY-0');
 energy.ready=true;player.energy[0]=energy;player.hand.push(toPlay);
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===toPlay.uid&&a.line==='front'&&a.slot===0);
 assert.ok(action);
 return {s,action};
}
test('BLC-4-013 source-anchored: zero/one/two discarded; arbitrary survivor ordering; no UID loss',()=>{
 const registered=registeredV2TitlePack('bleach').cards['BLC-4-013'];
 assert.ok(registered,'B must independently register source-locked BLC-4-013 before integration');
 assert.deepEqual(registered.effects.onPlay,[{op:'inspectTopAnyOutside',count:2,rest:'top'}]);
 assert.equal(registered.energy,1);
 assert.equal(registered.color,'yellow');
 for(const numberOutside of [0,1,2]){
  const {s,action}=setup(),old=structuredClone(s);
  let q=dispatchUniversalAction(packs,s,action,{actor:0});
  assert.equal(q.pending?.kind,'effect-top-inspect-many');
  const initial=q.players[0].deck.map(c=>c.uid);
  const window=q.pending.uids.slice();
  assert.deepEqual(window,initial.slice(0,2));
  assert.equal(universalPrivateChoices(packs,q,0)?.options.length,3);
  assert.equal(universalPrivateChoices(packs,q,1),null);
  const opponent=JSON.stringify(universalPublicView(packs,q,1));
  for(const uid of window)assert.ok(!opponent.includes(uid));
  const n=q.players[0].outside.length;
  for(let i=0;i<numberOutside;i++){
   const uid=window[i];
   q=dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid},{actor:0});
   if(i===0&&numberOutside===2)assert.throws(()=>
    dispatchUniversalAction(packs,q,{type:'chooseInspectedOutside',uid},{actor:0}),
    /not currently legal/);
  }
  if(numberOutside<2)q=dispatchUniversalAction(packs,q,
   {type:'chooseInspectedOutside',uid:null},{actor:0});
  for(const uid of window.slice(numberOutside).reverse()){
   assert.equal(q.pending?.kind,'effect-top-order');
   q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid},{actor:0});
  }
  assert.equal(q.pending,null);
  assert.deepEqual(q.players[0].deck.map(c=>c.uid),
   [...window.slice(numberOutside).reverse(),...initial.slice(2)]);
  assert.equal(q.players[0].outside.length,n+numberOutside);
  assert.deepEqual(s,old,'reducer is immutable');
  assert.equal(assertUniversalMatch(packs,q),true);
 }
});
test('BLC-4-013 with only one remaining deck card never fabricates another',()=>{
 for(const doDiscard of [true,false]){
  const {s,action}=setup();
  while(s.players[0].deck.length>1)s.players[0].outside.push(s.players[0].deck.pop());
  let q=dispatchUniversalAction(packs,s,action,{actor:0});
  assert.equal(q.pending?.kind,'effect-top-inspect-many');
  assert.equal(q.pending.uids.length,1);
  const uid=q.pending.uids[0];
  q=dispatchUniversalAction(packs,q,
   {type:'chooseInspectedOutside',uid:doDiscard?uid:null},{actor:0});
  if(!doDiscard)q=dispatchUniversalAction(packs,q,{type:'chooseTopOrder',uid},{actor:0});
  assert.equal(q.pending,null);
  assert.equal(q.players[0].deck.length,doDiscard?0:1);
  assert.equal(assertUniversalMatch(packs,q),true);
 }
});
test('strict top any-outside contract refuses extra fields, invalid count and outside rest',()=>{
 const base={...cards[0],templateEffects:undefined};
 for(const t of [
  {template:'inspectTopAnyOutside',count:1,rest:'top'},
  {template:'inspectTopAnyOutside',count:5,rest:'top'},
  {template:'inspectTopAnyOutside',count:2,rest:'outside'},
  {template:'inspectTopAnyOutside',count:2,rest:'top',optional:true}
 ])assert.throws(()=>createUniversalPack({id:'invalid',cards:[{
  ...base,templateEffects:{onPlay:[t]}
 }]}),/invalid/);
});
