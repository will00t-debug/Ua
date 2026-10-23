import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {SAO_Q1208_ASUNA_AURA,SAO_Q978_SELF_EVENT_TAX}
 from '../dist/universal-v2/selection-hand-tax.mjs';

const f=Array.from({length:9},(_,i)=>({id:'f'+i,name:'filler'+i,type:'character',
 color:'green',energy:0,ap:1,bp:1000,gen:1,traits:[],
 implementation:'vanilla',effects:{}}));
const c=(id,name,bp,tax)=>({id,name,type:'character',color:'green',
 energy:0,ap:1,bp,gen:1,traits:[],implementation:tax?'dsl':'vanilla',effects:{},
 ...(tax?{selectionHandDiscardTax:tax}:{})});
const cards=[c('k','キリト',4000,SAO_Q1208_ASUNA_AURA),
 c('a','アスナ',1500),c('other','ユウキ',1000),
 {id:'e',name:'Event',type:'event',color:'green',energy:1,ap:1,bp:0,gen:0,
 traits:[],implementation:'dsl',
 effects:{onPlay:[{op:'restOppFrontUnderBp',bp:1500,optional:false}]}},...f];
const pack=createUniversalPack({id:'r46-atomic-tax',cards});
const deck=Object.fromEntries(cards.map((x,i)=>[x.id,i===0?2:4]));
assert.deepEqual(validateUniversalDeck(pack,deck),[]);
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
}throw Error('not found '+id);}
const use=(s,a)=>dispatchUniversalAction(pack,s,a);
function setup(pay=true,alt=false,duplicate=false){
 const s=newUniversalMatch(pack,{decks:[deck,deck],first:0,seed:46001});
 const k=take(s,0,'k'),asuna=take(s,0,'a');
 for(const [x,pos] of [[k,0],[asuna,1]]){
  x.ready=true;x.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[pos]=x;
 }
 if(alt||duplicate){const x=take(s,0,alt?'other':'k');
  x.ready=true;x.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[0].front[alt?2:3]=x;
 }
 const event=take(s,1,'e');
 s.players[1].outside.push(...s.players[1].hand.splice(0));
 s.players[1].hand.push(event);
 if(pay)s.players[1].hand.push(take(s,1,'f0'));
 const producer=take(s,1,'f1');producer.ready=true;
 producer.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].energy[0]=producer;
 s.active=1;s.phase='main';s.players[1].ownTurns++;
 for(const x of s.players[1].apCards){x.inPlay=true;x.ready=true;}
 assert.equal(assertUniversalMatch(pack,s),true);
 return {s,asuna,event};
}
test('Q1119 no non-EVENT payable card in hand: cannot play mandatory target EVENT',()=>{
 const {s,event}=setup(false);
 assert.ok(!legalUniversalActions(pack,s).some(a=>a.type==='event'&&a.uid===event.uid));
 assert.throws(()=>use(s,{type:'event',uid:event.uid}),/not currently legal/);
});
test('Q1208 real UID hand cost must complete before target REST, survived JSON resume',()=>{
 let {s,asuna,event}=setup();
 assert.ok(legalUniversalActions(pack,s).some(a=>a.type==='event'&&a.uid===event.uid));
 s=use(s,{type:'event',uid:event.uid});
 assert.equal(s.pending.kind,'effect-rest-bp');
 s=use(s,{type:'chooseRestBp',uid:asuna.uid});
 assert.equal(s.pending.kind,'effect-selection-hand-payment');
 assert.ok(s.players[0].front.find(x=>x?.uid===asuna.uid).ready);
 const actions=legalUniversalActions(pack,s);
 assert.equal(actions.length,1);
 const a=actions[0];assert.equal(a.type,'chooseSelectionTaxDiscard');
 assert.equal(universalPrivateChoices(pack,s,1).options[0].action.uid,a.uid);
 assert.equal(universalPrivateChoices(pack,s,0),null);
 s=use(JSON.parse(JSON.stringify(s)),a);
 assert.equal(s.pending,null);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===a.uid&&e.from==='hand'&&
  e.to==='outside'&&e.reason==='payment'));
 assert.equal(s.players[0].front.find(x=>x?.uid===asuna.uid).ready,false);
 assert.equal(assertUniversalMatch(pack,s),true);
});
test('Q1208 duplicate grants cost one; another nonprotected target remains selectable',()=>{
 let {s,asuna,event}=setup(true,true,false);
 s=use(s,{type:'event',uid:event.uid});
 const other=s.players[0].front.find(x=>x?.cardId==='other');
 assert.ok(legalUniversalActions(pack,s).some(a=>a.uid===other.uid));
 s=use(s,{type:'chooseRestBp',uid:other.uid});
 assert.equal(s.pending,null);
 ({s,asuna,event}=setup(true,false,true));
 s=use(s,{type:'event',uid:event.uid});
 s=use(s,{type:'chooseRestBp',uid:asuna.uid});
 assert.equal(legalUniversalActions(pack,s).length,1);
});
test('Forged target, source type or stamp in saved payment never spends a UID',()=>{
 let {s,asuna,event}=setup();
 s=use(s,{type:'event',uid:event.uid});
 s=use(s,{type:'chooseRestBp',uid:asuna.uid});
 for(const fn of [
  q=>q.targetStamp++,q=>q.targetUid='0-999',q=>q.sourceType='trigger',
  q=>q.targetAction.uid='0-999',q=>q.extra=true]){
  const x=structuredClone(s);fn(x.pending);
  assert.throws(()=>assertUniversalMatch(pack,x),/Invalid resumed selection hand-payment/);
 }
 assert.throws(()=>use(s,{type:'chooseSelectionTaxDiscard',uid:'0-999'}),
  /not currently legal/);
});
test('Q978 exact-only EVENT source profile kept distinct',()=>{
 const q=createUniversalPack({id:'q978',cards:[c('kirito','キリト',5000,SAO_Q978_SELF_EVENT_TAX),...f]});
 assert.deepEqual(q.cards.kirito.selectionHandDiscardTax.sourceTypes,['event']);
 assert.throws(()=>createUniversalPack({id:'invalid-tax',cards:[
  c('kirito','キリト',5000,{...SAO_Q978_SELF_EVENT_TAX,sourceTypes:['trigger']}),...f]}));
});
