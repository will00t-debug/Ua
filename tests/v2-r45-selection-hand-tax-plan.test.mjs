import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionHandDiscardTaxPlan,validateSelectionHandTaxProfile,
 SAO_Q978_SELF_EVENT_TAX,SAO_Q1208_ASUNA_AURA}
 from '../dist/universal-v2/selection-hand-tax.mjs';

// Pure synthetic physical UID test; this is NOT a registration or proof that
// either whole SAO printed card is implemented in the live pack.
const c=(uid,cardId,stamp=1)=>({uid,cardId,fieldEntryStamp:stamp,ready:true});
function scenario(){
 const pack={cards:{
  k064:{name:'キリト',selectionHandDiscardTax:{...SAO_Q1208_ASUNA_AURA}},
  k087:{name:'キリト',selectionHandDiscardTax:{...SAO_Q978_SELF_EVENT_TAX}},
  asuna:{name:'アスナ'},lookalike:{name:'アスナ（別名）'},
  other:{name:'ユウキ'}
 }};
 const s={active:1,players:[
  {front:[c('0-1','k064'),c('0-2','asuna'),null,null],
   energy:[null,null,null,null],hand:[]},
  {front:[null,null,null,null],energy:[null,null,null,null],
   hand:[c('1-1','other'),c('1-2','other')]}
 ]};
 return {pack,s};
}
const plan=(pack,s,uid,source='event',extra)=>
 selectionHandDiscardTaxPlan(pack,s,1,uid,source,extra);

test('Q1208 FRONT aura costs exactly ONE for CHARACTER or EVENT selection',()=>{
 const {pack,s}=scenario();
 for(const source of ['event','character']){
  assert.deepEqual(plan(pack,s,'0-2',source),{
   cost:1,payable:true,blocked:false,sourceUids:['0-1']});
 }
 assert.equal(plan(pack,s,'0-2','trigger').cost,0);
 assert.equal(plan(pack,s,'0-2','unknown').blocked,false);
});
test('Q1208 two copies of the same source do NOT stack',()=>{
 const {pack,s}=scenario();
 s.players[0].front[2]=c('0-3','k064',2);
 assert.deepEqual(plan(pack,s,'0-2','character'),{
  cost:1,payable:true,blocked:false,sourceUids:['0-1','0-3']});
});
test('Q1208 source must remain in FRONT; target Asuna may be in ENERGY',()=>{
 const {pack,s}=scenario();
 s.players[0].front[0]=null;s.players[0].energy[0]=c('0-1','k064');
 assert.equal(plan(pack,s,'0-2').cost,0);
 s.players[0].front[0]=c('0-1','k064');s.players[0].front[1]=null;
 s.players[0].energy[1]=c('0-2','asuna');
 assert.equal(plan(pack,s,'0-2').cost,1);
});
test('Q978 event only, own field self, no extra on CHARACTER or LIFE',()=>{
 const {pack,s}=scenario();
 s.players[0].energy[0]=c('0-7','k087',7);
 assert.deepEqual(plan(pack,s,'0-7','event'),{
  cost:1,payable:true,blocked:false,sourceUids:['0-7']});
 assert.equal(plan(pack,s,'0-7','character').cost,0);
 assert.equal(plan(pack,s,'0-7','trigger').cost,0);
 assert.equal(plan(pack,s,'0-8','event').cost,0);
});
test('Q978 and Q1208 cannot choose protected UID with empty own hand',()=>{
 const {pack,s}=scenario();
 s.players[1].hand=[];
 const p=plan(pack,s,'0-2','event');
 assert.equal(p.cost,1);assert.equal(p.payable,false);
 assert.equal(plan(pack,s,'0-1','event').cost,0);
});
test('Only exact own printed name is granted, foreign UID is not a target',()=>{
 const {pack,s}=scenario();
 s.players[0].front[2]=c('0-3','lookalike',3);
 s.players[1].front[0]=c('1-3','asuna',3);
 assert.equal(plan(pack,s,'0-3').cost,0);
 assert.equal(plan(pack,s,'1-3').cost,0);
 assert.equal(plan(pack,s,'0-2').cost,1);
});
test('Source with original effect silenced does not contribute to aura',()=>{
 const {pack,s}=scenario();
 assert.equal(plan(pack,s,'0-2','event',{isSuppressed:(_,x)=>x.uid==='0-1'}).cost,0);
});
test('Unresolved combination of independent tax groups fails closed',()=>{
 const {pack,s}=scenario();
 pack.cards.other={name:'ユウキ',selectionHandDiscardTax:{
  ...SAO_Q1208_ASUNA_AURA,stackGroup:'not-SA0-Q1208'
 }};
 s.players[0].front[2]=c('0-3','other',3);
 const p=plan(pack,s,'0-2','event');
 assert.equal(p.blocked,true);assert.equal(p.payable,false);
 assert.deepEqual(p.sourceUids,['0-1','0-3']);
});
test('Reject malformed scopes/counts/source types and forged physical stamps',()=>{
 for(const bad of [
  {...SAO_Q978_SELF_EVENT_TAX,sourceTypes:['trigger']},
  {...SAO_Q978_SELF_EVENT_TAX,count:2},
  {...SAO_Q1208_ASUNA_AURA,sourceLine:'outside'},
  {...SAO_Q1208_ASUNA_AURA,unexpected:'ignored'}
 ])assert.throws(()=>validateSelectionHandTaxProfile(bad));
 const {pack,s}=scenario();s.players[0].front[0].fieldEntryStamp=0;
 assert.throws(()=>plan(pack,s,'0-2'));
});
