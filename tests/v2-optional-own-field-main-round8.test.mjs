import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Component-only until all printed MST053 abilities including COLOR are complete.
const qa={id:'QA-OPTIONAL-FIELD-DRAW',name:'QA main source',color:'green',
 type:'character',energy:0,ap:1,bp:2500,gen:1,implementation:'dsl',
 mainAbility:{op:'retireOwnFieldThen',frontOnly:true,oncePerTurn:true,
  optional:true,after:[{op:'draw',count:1}]}};
const pack=createUniversalPack({id:'optional-field-component',
 cards:[...verifiedMstV2Cards(),qa]});
const packs=[pack,pack],deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS};
deck['MST-1-050']-=1;deck[qa.id]=1;
function take(s,p,id){for(const z of ['hand','deck','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i!==-1)return a.splice(i,1)[0];
 }throw Error('Missing '+id);}
function setup(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:8024});
 const source=take(s,0,qa.id);source.ready=false;s.players[0].front[0]=source;
 const field=take(s,0,'MST-1-075');field.ready=false;s.players[0].energy[0]=field;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return {s,source,field};
}
test('MST053 component: optional FIELD payment fires actual MST075 onRetire and THEN printed draw',()=>{
 let {s,source,field}=setup(),hand=s.players[0].hand.length,decks=s.players[0].deck.length;
 let a=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='retireFieldThen');
 assert.ok(a);s=dispatchUniversalAction(packs,s,a);
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOwnFieldRetire',uid:null},{type:'chooseOwnFieldRetire',uid:field.uid}]);
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'hard'}),
  {type:'chooseOwnFieldRetire',uid:field.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===field.uid));
 assert.equal(s.players[0].hand.length,hand+2);
 assert.equal(s.players[0].deck.length,decks-2);
 assert.equal(s.turnRetireEvents[0].cardType,'field');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('optional FIELD payment skip: no retirement, no draw, and activation once-per-turn',()=>{
 let {s,source}=setup(),hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'retireFieldThen'});
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'easy'}),
  {type:'chooseOwnFieldRetire',uid:null});
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:null});
 assert.equal(s.players[0].hand.length,hand);
 assert.deepEqual(s.turnRetireEvents,[]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'retireFieldThen'}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict MAIN schema forbids non-draw/non-buff followup, zero count, extra key',()=>{
 for(const after of [[{op:'millTop',count:1}],[{op:'draw',count:0}]]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...qa,
   mainAbility:{...qa.mainAbility,after}}]}),/unsupported main action ability|invalid/);
 }
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...qa,
  mainAbility:{...qa.mainAbility,optional:false}}]}),/unsupported main action ability/);
});
