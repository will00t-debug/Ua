import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const ids=Array.from({length:13},(_,i)=>'U'+String(i).padStart(2,'0'));
const counts=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));
counts.U12=2;
function make(name,optional=false){
 const cards=ids.map((id,i)=>({
  id,name:'Unit '+i,color:'yellow',type:'character',energy:0,
  ap:1,bp:i===3?9000:2000,gen:i===0?4:1,implementation:'vanilla'
 }));
 cards[1]={...cards[1],type:'event',gen:0,bp:0,implementation:'dsl',
  templateEffects:{onPlay:[
   {template:'restEnemyFrontOne',optional},
   {template:'draw',count:1}
  ]}};
 return createUniversalPack({id:name,cards});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[p][zone],i=cards.findIndex(c=>c.cardId===id);
  if(i>=0)return cards.splice(i,1)[0];
 }
 throw Error('Fixture lacks physical '+id);
}
function ready(optional=false,target=true){
 const packs=[make('first',optional),make('second',true)];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:3159,first:0});
 const energy=take(s,0,'U00'),source=take(s,0,'U01');
 energy.ready=true;s.players[0].energy[0]=energy;s.players[0].hand.push(source);
 let enemy=null;
 if(target){enemy=take(s,1,'U03');enemy.ready=true;s.players[1].front[1]=enemy;}
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===source.uid);
 assert.equal(Boolean(action),Boolean(optional||target),
  'Q1119 mandatory EVENT cannot be used without an eligible target');
 const beforeDeck=s.players[0].deck.length;
 const beforeAp=s.players[0].apCards.filter(x=>x.inPlay&&x.ready).length;
 return {packs,s,source,enemy,action,beforeDeck,beforeAp};
}
test('uncapped REST chooses genuine enemy 9000 BP target, never skip, then draws once',()=>{
 const {packs,s,source,enemy,action,beforeDeck,beforeAp}=ready(false,true);
 const unchanged=structuredClone(s);
 const q=dispatchUniversalAction(packs,s,action);
 assert.equal(q.pending.kind,'effect-rest-bp');
 assert.equal(q.pending.limit,null,'unbounded MUST NOT invent numeric BP cap');
 assert.deepEqual(legalUniversalActions(packs,q),[{type:'chooseRestBp',uid:enemy.uid}]);
 assert.equal(q.players[0].deck.length,beforeDeck,'queued draw must not run early');
 assert.ok(q.players[0].outside.some(x=>x.uid===source.uid));
 assert.equal(q.players[0].apCards.filter(x=>x.inPlay&&x.ready).length,beforeAp-1);
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseRestBp',uid:null}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,q,{type:'chooseRestBp',uid:source.uid}),
  /not currently legal/);
 const ai=chooseUniversalAiAction(packs,q,{difficulty:'hard'});
 assert.deepEqual(ai,{type:'chooseRestBp',uid:enemy.uid});
 const next=dispatchUniversalAction(packs,q,ai);
 assert.equal(next.pending,null);
 assert.equal(next.players[1].front[1].ready,false);
 assert.equal(next.players[0].deck.length,beforeDeck-1);
 assert.equal(assertUniversalMatch(packs,next),true);
 assert.deepEqual(s,unchanged,'reducer must be immutable');
});
test('optional uncapped REST allows decline but still finishes printed draw',()=>{
 const x=ready(true,true),q=dispatchUniversalAction(x.packs,x.s,x.action);
 assert.deepEqual(legalUniversalActions(x.packs,q),[
  {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:x.enemy.uid}
 ]);
 const after=dispatchUniversalAction(x.packs,q,{type:'chooseRestBp',uid:null});
 assert.equal(after.players[1].front[1].ready,true);
 assert.equal(after.players[0].deck.length,x.beforeDeck-1);
 assert.equal(assertUniversalMatch(x.packs,after),true);
});
test('Q1119: an event with a mandatory choose-one REST cannot be used with empty enemy FRONT',()=>{
 const x=ready(false,false),old=structuredClone(x.s);
 assert.equal(x.action,undefined);
 assert.throws(()=>dispatchUniversalAction(x.packs,x.s,
  {type:'event',uid:x.source.uid},{actor:0}),/Action not currently legal/);
 assert.deepEqual(x.s,old,'illegal event must not spend AP, draw, or leave hand');
 assert.equal(assertUniversalMatch(x.packs,x.s),true);
});
test('Q1119: an optional uncapped REST event can choose zero targets and continue drawing',()=>{
 const x=ready(true,false),after=dispatchUniversalAction(x.packs,x.s,x.action);
 assert.equal(after.pending,null);
 assert.equal(after.players[0].deck.length,x.beforeDeck-1);
 assert.ok(after.players[0].outside.some(c=>c.uid===x.source.uid));
 assert.equal(assertUniversalMatch(x.packs,after),true);
});
test('Q91: mandatory uncapped REST can choose an already-rested opposing character',()=>{
 const x=ready(false,true);
 x.s.players[1].front[1].ready=false;
 const q=dispatchUniversalAction(x.packs,x.s,x.action);
 assert.deepEqual(legalUniversalActions(x.packs,q),[
  {type:'chooseRestBp',uid:x.enemy.uid}
 ]);
 const after=dispatchUniversalAction(x.packs,q,
  {type:'chooseRestBp',uid:x.enemy.uid});
 assert.equal(after.players[1].front[1].ready,false);
 assert.equal(after.players[0].deck.length,x.beforeDeck-1);
 assert.equal(assertUniversalMatch(x.packs,after),true);
});
test('strict compilation forbids hidden BP limits, missing optional choice, unknown target selectors',()=>{
 const base={id:'U1',name:'Test',color:'yellow',type:'event',energy:0,
  ap:1,bp:0,gen:0,implementation:'dsl'};
 for(const effect of [
  {template:'restEnemyFrontOne'},
  {template:'restEnemyFrontOne',optional:false,bp:3000},
  {template:'restEnemyFrontOne',optional:'no'},
  {op:'restOppFrontOne'},
  {op:'restOppFrontOne',optional:false,bp:9999}
 ]){
  const typed=Object.hasOwn(effect,'template')?{templateEffects:{onPlay:[effect]}}:
   {effects:{onPlay:[effect]}};
  assert.throws(()=>createUniversalPack({id:'strict',cards:[{...base,...typed}]}),
   /invalid|unsupported|arguments|unknown/,JSON.stringify(effect));
 }
});
