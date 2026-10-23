import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const ids=Array.from({length:13},(_,i)=>'QA-'+String(i).padStart(3,'0'));
const cards=ids.map((id,i)=>({id,name:['調查','キリト','アリス','ユージオ','無關','無關2'][i]||'無關'+i,
 color:'green',type:i===0?'event':'character',energy:i===0?1:0,ap:1,
 bp:i===0?0:1500,gen:i===0?0:1,traits:i===4?['ALO']:[],trigger:i===0?'draw':null,
 implementation:i===0?'dsl':'vanilla',...(i===0?{templateEffects:{onPlay:[{
 template:'searchTopUpToTwoBottom',count:5,filters:[
 {field:'name',value:'キリト'},{field:'name',value:'アリス'},{field:'name',value:'ユージオ'}],logic:'any'}]}}:{effects:{}})}));
const pack=createUniversalPack({id:'qa-top-two',cards}),packs=[pack,pack];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,id){for(const z of ['deck','life','hand','outside']){const a=s.players[0][z],
 i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error(id);}
function setup(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:37001});
 const src=take(s,'QA-000');s.players[0].hand.push(src);
 const producer=take(s,'QA-007');producer.ready=true;s.players[0].energy[0]=producer;
 const window=['QA-001','QA-001','QA-002','QA-006','QA-003'].map(id=>take(s,id));
 s.players[0].deck.unshift(...window);
 s=dispatchUniversalAction(packs,s,{type:'next'});s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===src.uid);
 assert.ok(action);return {s,window,action};
}
const act=(s,a)=>dispatchUniversalAction(packs,s,a);
test('R37 strict template rejects illegal filters',()=>{
 for(const bad of [{count:6,filters:[{field:'trait',value:'ALO'}],logic:'any'},
 {count:5,filters:[{field:'evil',value:'ALO'}],logic:'any'},
 {count:5,filters:[{field:'name',value:'x'},{field:'name',value:'x'}],logic:'any'},
 {count:5,filters:[{field:'trait',value:'ALO'}],logic:'any',max:3}]){
  assert.throws(()=>createUniversalPack({id:'invalid-top',cards:[
  {...cards[0],templateEffects:{onPlay:[{template:'searchTopUpToTwoBottom',...bad}]}}]}));
 }
});
for(const n of [0,1,2])test('R37 0..2 distinct physical UID selections: '+n,()=>{
 let {s,window,action}=setup(),before=s.players[0].deck.map(c=>c.uid);
 s=act(s,action);
 assert.equal(s.pending.kind,'effect-top-filter-many-choice');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const picked=[];
 for(let i=0;i<n;i++){
  const uid=window[i].uid,snap=structuredClone(s);
  assert.throws(()=>act(s,{type:'chooseTopFilteredMany',uid:window[3].uid}));
  assert.deepEqual(s,snap);
  for(const difficulty of ['normal','hard'])assert.ok(legalUniversalActions(packs,s).some(a=>
   JSON.stringify(a)===JSON.stringify(chooseUniversalAiAction(packs,s,{difficulty}))));
  s=act(s,{type:'chooseTopFilteredMany',uid});picked.push(uid);
  assert.throws(()=>act(s,{type:'chooseTopFilteredMany',uid}));
  assert.equal(assertUniversalMatch(packs,JSON.parse(JSON.stringify(s))),true);
 }
 if(n<2)s=act(s,{type:'chooseTopFilteredMany',uid:null});
 const rest=window.filter(c=>!picked.includes(c.uid)).map(c=>c.uid).reverse();
 assert.equal(s.pending.kind,'effect-top-order');
 for(const uid of rest)s=act(s,{type:'chooseTopOrder',uid});
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...before.slice(5),...rest]);
 assert.ok(picked.every(uid=>s.players[0].hand.some(c=>c.uid===uid)));
 const view=universalPublicView(packs,s,1);
 assert.deepEqual(view.publicReveals.filter(x=>picked.includes(x.uid)).map(x=>x.uid),picked);
 for(const uid of rest)assert.ok(!JSON.stringify(view).includes('"'+uid+'"'));
});
test('R37 JSON restore rejects injected candidates and changed original predicate',()=>{
 let {s,action,window}=setup();s=act(s,action);
 s=act(s,{type:'chooseTopFilteredMany',uid:window[0].uid});
 for(const modify of [q=>q.selected.push(window[0].uid),q=>q.choices.push('0-forged'),
 q=>q.uids.reverse(),q=>q.filters[0].value='wrong',q=>q.max=3]){
  const corrupt=structuredClone(s);modify(corrupt.pending);
  assert.throws(()=>assertUniversalMatch(packs,corrupt));
 }
});
