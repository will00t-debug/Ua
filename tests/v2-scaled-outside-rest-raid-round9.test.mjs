import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Japanese source: UA54BT/MST-1-076. Component-only unregistered cards.
const cards=Array.from({length:13},(_,i)=>({
 id:'SCALE-'+i,name:i===4?'Base':'Card'+i,
 color:i===6?'blue':'green',type:i===0||i===1?'field':i===5?'event':'character',
 energy:i===2?2:i===3?3:0,ap:1,bp:i===0||i===1||i===5?0:2000,
 gen:i===5?0:1,traits:i===7?['feature']:[],
 implementation:i===0||i===3||i===5?'dsl':'vanilla',
 ...(i===0?{effects:{onRetire:[{op:'deployOutsideTraitlessRestOrRaid',
  color:'green',energy:1,ap:1,optional:true,perOtherOutsideField:1}]}}:{}),
 ...(i===3?{raidName:'Base',effects:{onRaid:[{op:'draw',count:1}]}}:{}),
 ...(i===5?{effects:{onPlay:[{op:'retireOwnFieldOne',optional:true}]}}:{})
}));
const pack=createUniversalPack({id:'field-outside-scale',cards}),packs=[pack,pack];
const deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,id){for(const zone of ['deck','hand','life','outside']){
 const a=s.players[0][zone],j=a.findIndex(c=>c.cardId===id);
 if(j>=0)return a.splice(j,1)[0];}throw Error('Missing '+id);}
function setup(extra){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:9976});
 const source=take(s,'SCALE-0');s.players[0].energy[0]=source;
 const other=[];for(let k=0;k<extra;k++){let f=take(s,'SCALE-1');other.push(f);s.players[0].outside.push(f);}
 const low=take(s,'SCALE-2'),raid=take(s,'SCALE-3');
 s.players[0].outside.push(low,raid);
 const base=take(s,'SCALE-4');base.ready=true;s.players[0].front[0]=base;
 const ev=take(s,'SCALE-5');s.players[0].hand.push(ev);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===ev.uid);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:source.uid});
 assert.equal(s.pending.kind,'effect-outside-traitless-rest');
 return {s,source,other,low,raid,base};
}
test('extra outside FIELD card scales printed no-feature green/AP1 energy cap; exclude just-retired source',()=>{
 let {s,source,low,raid}=setup(1);
 assert.equal(s.pending.energyLimit,2);
 const moves=legalUniversalActions(packs,s);
 assert.ok(moves.some(a=>a.uid===low.uid&&a.mode==='enter'));
 assert.ok(!moves.some(a=>a.uid===raid.uid));
 assert.equal(countRetirementsThisTurn(s,0,'field'),1);
 const normal=moves.find(a=>a.uid===low.uid&&a.mode==='enter'&&a.line==='front'&&a.slot===1);
 assert.ok(normal);s=dispatchUniversalAction(packs,s,normal);
 assert.equal(s.players[0].front[1].uid,low.uid);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('second OTHER outside field unlocks free REST Raid; AI keeps legal base and original physical UID',()=>{
 let {s,raid,base}=setup(2);
 assert.equal(s.pending.energyLimit,3);
 const options=legalUniversalActions(packs,s);
 assert.ok(options.some(a=>a.uid===raid.uid&&a.mode==='raid'&&a.baseUid===base.uid));
 const ai=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.equal(ai.mode,'raid');assert.equal(ai.uid,raid.uid);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,ai);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.players[0].hand.length,hand+1,'real onRaid queued');
 assert.equal(countRetirementsThisTurn(s,0,'character'),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict schema forbids unverified scale and non-field retirement source',()=>{
 for(const e of [{op:'deployOutsideTraitlessRestOrRaid',color:'green',energy:1,ap:1,optional:true,perOtherOutsideField:2},
  {op:'deployOutsideTraitlessRestOrRaid',color:'green',energy:1,ap:1,optional:false,perOtherOutsideField:1}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],
   effects:{onRetire:[e]}}]}),/invalid outside traitless REST\/Raid scaled profile/);
 }
});
