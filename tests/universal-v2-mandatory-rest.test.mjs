import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

function title(id,optional){
 const cards=Array.from({length:13},(_,i)=>({
  id:'V'+String(i).padStart(2,'0'),name:'Unit '+i,
  type:'character',color:'red',energy:0,ap:1,bp:i===3?4000:2000,
  gen:i===0?4:1,implementation:'vanilla'
 }));
 cards[1]={...cards[1],implementation:'dsl',templateEffects:{onPlay:[
  {template:'restEnemyUnderBp',bp:3000,optional},
  {template:'draw',count:1}
 ]}};
 return createUniversalPack({id,cards});
}
const decks=Object.fromEntries(Array.from({length:12},(_,i)=>[
 'V'+String(i).padStart(2,'0'),4]));decks.V12=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const z=s.players[p][zone],i=z.findIndex(c=>c.cardId===id);
  if(i>=0)return z.splice(i,1)[0];
 }
 throw Error('missing fixture '+id);
}
function fixture(optional=true,targetId='V02'){
 const packs=[title('active-title',optional),title('other-title',true)];
 let s=newUniversalMatch(packs,{decks:[decks,decks],seed:4561,first:0});
 const generator=take(s,0,'V00'),source=take(s,0,'V01');
 s.players[0].energy[0]=generator;s.players[0].hand.push(source);
 let target=null;
 if(targetId){target=take(s,1,targetId);target.ready=true;s.players[1].front[0]=target;}
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(x=>x.type==='play'&&
  x.uid===source.uid&&x.line==='front'&&x.slot===0);
 assert.ok(action);
 const before=s.players[0].deck.length;
 return {packs,s:dispatchUniversalAction(packs,s,action),target,before};
}
test('mandatory BP-threshold REST cannot be skipped; owned selection and deferred draw are preserved',()=>{
 const {packs,s,target,before}=fixture(false);
 assert.equal(s.pending.kind,'effect-rest-bp');
 const options=legalUniversalActions(packs,s);
 assert.deepEqual(options,[{type:'chooseRestBp',uid:target.uid}]);
 assert.equal(s.players[0].deck.length,before,'draw waits for printed target choice');
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null}),
  /not currently legal/);
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'normal'});
 assert.deepEqual(ai,{type:'chooseRestBp',uid:target.uid});
 const after=dispatchUniversalAction(packs,s,ai);
 assert.equal(after.players[1].front[0].ready,false);
 assert.equal(after.players[0].deck.length,before-1);
 assert.equal(after.pending,null);
 assert.equal(assertUniversalMatch(packs,after),true);
});
test('optional REST always permits skip and still draws after the declined effect',()=>{
 const {packs,s,target,before}=fixture(true);
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseRestBp',uid:null},{type:'chooseRestBp',uid:target.uid}
 ]);
 const after=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:null});
 assert.equal(after.players[1].front[0].ready,true);
 assert.equal(after.players[0].deck.length,before-1);
 assert.equal(assertUniversalMatch(packs,after),true);
});
test('mandatory REST with no eligible target still executes subsequent printed draw',()=>{
 for(const targetId of [null,'V03']){
  const {packs,s,before}=fixture(false,targetId);
  assert.equal(s.pending,null);
  assert.equal(s.players[0].deck.length,before-1);
  if(targetId)assert.equal(s.players[1].front[0].ready,true);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('REST optionality cannot be implicit and malformed raw/template programs remain rejected',()=>{
 const base={id:'BAD',name:'Bad',color:'red',type:'character',energy:0,ap:1,
  bp:2000,gen:1,implementation:'dsl'};
 const examples=[
  {templateEffects:{onPlay:[{template:'restEnemyUnderBp',bp:2500}]}},
  {templateEffects:{onPlay:[{template:'restEnemyUnderBp',bp:2500,optional:null}]}},
  {effects:{onPlay:[{op:'restOppFrontUnderBp',bp:2500}]}},
  {effects:{onPlay:[{op:'restOppFrontUnderBp',bp:2500,optional:false,skip:true}]}}
 ];
 for(const fragment of examples)assert.throws(()=>createUniversalPack({
  id:'test',cards:[{...base,...fragment}]
 }),/invalid|unsupported/i,JSON.stringify(fragment));
});
