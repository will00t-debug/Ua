import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const cards=Array.from({length:13},(_,i)=>({id:'V'+i,name:'Unit '+i,type:'character',
 color:'yellow',energy:0,ap:1,bp:i===12?6000:2000,gen:i===0?4:1,implementation:'vanilla'}));
cards[1]={...cards[1],name:'Life-gated event',type:'event',gen:0,bp:0,energy:3,
 implementation:'dsl',templateEffects:{onPlay:[{template:'restOrRetireEnemyFrontByOwnLife',
 bp:5000,lifeAtMost:4,optional:false}]}};
cards[2]={...cards[2],name:'Rest dependent entrant',energy:2,
 enterActiveIfOpponentRest:true,implementation:'dsl'};
const packs=['different-a','different-b'].map(id=>createUniversalPack({id,cards}));
const deck=Object.fromEntries(cards.slice(0,12).map(c=>[c.id,4]));deck.V12=2;
function match(first=0){return newUniversalMatch(packs,{decks:[deck,deck],first,seed:486});}
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const arr=s.players[p][z],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
const put=(s,p,id,line='front',slot=0,ready=true)=>{
 const card=take(s,p,id);card.ready=ready;s.players[p][line][slot]=card;return card;
};
function eventAtMain(lifeCount=7,targetId='V3'){
 let s=match(),source=take(s,0,'V1');
 s.players[0].hand.push(source);
 put(s,0,'V0','energy',0,false);
 const target=targetId?put(s,1,targetId,'front',0,true):null;
 s.players[0].outside.push(...s.players[0].life.splice(lifeCount));
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const available=legalUniversalActions(packs,s);
 const payable=available.find(a=>a.type==='event'&&a.uid===source.uid);
 return {s,source,target,payable};
}
test('shared LIFE-gate: 5/7 life chooses REST + one skip, normal/hard cannot refuse',()=>{
 for(const life of [5,7]){
  let {s,target,payable}=eventAtMain(life);assert.ok(payable);
  s=dispatchUniversalAction(packs,s,payable);
  assert.equal(s.pending.kind,'effect-rest-bp');
  assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRestBp',uid:target.uid}]);
  for(const difficulty of ['normal','hard'])
   assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty}),
    {type:'chooseRestBp',uid:target.uid});
  s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:target.uid});
  assert.equal(s.players[1].front[0].ready,false);
  assert.equal(s.continuousStates[0].targetUid,target.uid);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('shared LIFE-gate: 4/1 life retires, does not create stale ACTIVE skip',()=>{
 for(const life of [4,1]){
  let {s,target,payable}=eventAtMain(life);assert.ok(payable);
  s=dispatchUniversalAction(packs,s,payable);
  assert.equal(s.pending.kind,'effect-retire-bp');
  assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRetireBp',uid:target.uid}]);
  s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:target.uid});
  assert.equal(s.players[1].front[0],null);
  assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));
  assert.equal(s.continuousStates.length,0);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('shared event cannot pay when mandatory BP-bounded front target absent',()=>{
 for(const targetId of [null,'V12']){
  const {s,source,payable}=eventAtMain(7,targetId);
  assert.equal(payable,undefined);
  assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'event',uid:source.uid}),
   /not currently legal/);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('shared entry condition reads opponent field REST at payment time, not hand/own REST',()=>{
 for(const enemyRest of [false,true]){
  let s=match(),target=take(s,0,'V2');s.players[0].hand.push(target);
  put(s,0,'V0','energy',0,false);
  put(s,1,'V3','energy',0,!enemyRest);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  s=dispatchUniversalAction(packs,s,{type:'next'});
  const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===target.uid&&a.line==='front'&&a.slot===0);
  assert.ok(play);
  s=dispatchUniversalAction(packs,s,play);
  assert.equal(s.players[0].front[0].ready,enemyRest);
  assert.equal(s.players[0].front[0].uid,target.uid);
  assert.equal(universalPublicView(packs,s,1).players[0].front[0].ready,enemyRest);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('LIFE/entry DSL rejects malformed flags and unbounded/corrupt threshold',()=>{
 for(const effect of [
  {op:'restOrRetireOppFrontByLife',bp:5000,lifeAtMost:-1,optional:false},
  {op:'restOrRetireOppFrontByLife',bp:5000,lifeAtMost:4,optional:'yes'},
  {op:'restOrRetireOppFrontByLife',bp:5000,lifeAtMost:4,optional:false,extra:true}
 ])assert.throws(()=>createUniversalPack({id:'bad',cards:[
  {...cards[1],templateEffects:undefined,effects:{onPlay:[effect]}}]}),/invalid LIFE-gated/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],
  enterActiveIfOpponentRest:true}]}),/claims vanilla/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[1],
  enterActiveIfOpponentRest:true}]}),/invalid conditional ACTIVE entry/);
});
