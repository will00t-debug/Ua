import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,assertUniversalMatch,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Official printed MST074 退場時; COMPONENT fixtures, not registry cards.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-074
const modes={op:'chooseOne',optional:false,options:[
 {id:'deploy',label:'Discard then deploy Roxy',turn:'any',then:[
  {op:'discardGate',optional:true,then:[{op:'deployOutsideRest',
   name:'ロキシー',color:'green',energy:1,ap:1,optional:true}]}]},
 {id:'recover',label:'Return Hydra to hand',turn:'any',then:[
  {op:'recoverOutsideOne',filter:{field:'name',value:'ヒュドラ'},optional:true}]}
]};
const cards=Array.from({length:13},(_,i)=>({
 id:'FIELD-'+i,name:i===0?'迷宮':i===1?'ロキシー':i===2?'ヒュドラ':'Unit'+i,
 color:'green',type:i===0||i===2?'field':i===3?'event':'character',
 energy:0,ap:1,bp:i===0||i===2||i===3?0:2000,gen:1,
 implementation:i===0||i===3?'dsl':'vanilla',
 ...(i===0?{effects:{onRetire:[modes]}}:{}),
 ...(i===3?{effects:{onPlay:[{op:'retireOwnFieldOne',optional:true}]}}:{})
}));
const pack=createUniversalPack({id:'retire-choice-fixture',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,id){for(const zone of ['deck','hand','life','outside']){
 const a=s.players[0][zone],at=a.findIndex(c=>c.cardId===id);
 if(at>=0)return a.splice(at,1)[0];}throw Error('missing '+id);}
function setup(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:9011});
 const src=take(s,'FIELD-0');src.ready=true;s.players[0].energy[0]=src;
 const roxy=take(s,'FIELD-1'),hydra=take(s,'FIELD-2');
 s.players[0].outside.push(roxy,hydra);
 const event=take(s,'FIELD-3');s.players[0].hand.push(event);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===event.uid);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.pending.kind,'effect-retire-own-field');
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:src.uid});
 assert.equal(s.pending.kind,'effect-choice-mode');
 return {s,src,roxy,hydra};
}
test('true field retirement offers two modes and recovers exactly chosen Hydra to own hand',()=>{
 let {s,hydra}=setup();
 assert.equal(countRetirementsThisTurn(s,0,'field'),1);
 assert.deepEqual(legalUniversalActions(packs,s).map(x=>x.mode),['deploy','recover']);
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'recover'});
 assert.equal(s.pending.kind,'effect-recover-outside');
 const choices=legalUniversalActions(packs,s);
 assert.deepEqual(choices,[{type:'chooseOutsideRecovery',uid:null},
  {type:'chooseOutsideRecovery',uid:hydra.uid}]);
 s=dispatchUniversalAction(packs,s,choices[1]);
 assert.ok(s.players[0].hand.some(c=>c.uid===hydra.uid));
 assert.ok(!s.players[0].outside.some(c=>c.uid===hydra.uid));
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('discard gate may be declined; payment precedes optional source-filtered REST entry',()=>{
 let {s,roxy}=setup();
 s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'deploy'});
 assert.equal(s.pending.kind,'effect-discard-gate');
 const reject=dispatchUniversalAction(packs,s,{type:'chooseDiscardGate',uid:null});
 assert.ok(reject.players[0].outside.some(c=>c.uid===roxy.uid));
 assert.equal(assertUniversalMatch(packs,reject),true);
 const paid=legalUniversalActions(packs,s).find(a=>a.uid!==null);
 assert.ok(paid);s=dispatchUniversalAction(packs,s,paid);
 assert.equal(s.pending.kind,'effect-outside-rest');
 const x=legalUniversalActions(packs,s);
 assert.ok(x.some(a=>a.uid===roxy.uid&&a.line==='front'));
 assert.ok(!x.some(a=>a.uid===roxy.uid&&a.line==='outside'));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOutsideRest',uid:'0-fake',line:'front',slot:0}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,x.find(a=>a.uid===roxy.uid&&a.line==='front'));
 assert.equal(s.players[0].front.some(c=>c?.uid===roxy.uid&&c.ready===false),true);
 assert.equal(countRetirementsThisTurn(s,0,'field'),1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict nested schema rejects unsourced deployment and wrong onRetire shape',()=>{
 for(const child of [{op:'deployOutsideRest',name:'ロキシー',color:'green',energy:1,ap:1,optional:false},
  {op:'deployOutsideRest',name:'ロキシー',color:'green',energy:1,ap:1,optional:true,from:'hand'}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],
   effects:{onRetire:[{...modes,options:[{...modes.options[0],
    then:[{op:'discardGate',optional:true,then:[child]}]},modes.options[1]]}]}}]}),
   /invalid outside-to-REST character/);
 }
});
