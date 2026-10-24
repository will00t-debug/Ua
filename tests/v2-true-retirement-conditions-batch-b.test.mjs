import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalCardEnergy,universalBp,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {retiredThisTurn} from '../dist/universal-v2/field-conditions.mjs';
// Test-only pack; these IDs must never become published title cards.
const cards=Array.from({length:13},(_,i)=>({id:'R'+i,name:i<=1?'Same Name':'Fixture '+i,
 color:'green',type:i===2?'field':i===3?'event':'character',
 energy:0,ap:1,bp:i===2||i===3?0:1500,gen:i===2||i===3?0:1,
 implementation:[0,1,3].includes(i)?'dsl':'vanilla',
 ...(i<=1?{mainAbility:{op:'readySelfIfOwnRetiredThisTurn',cardType:'field',readyOncePerName:true}}:{}),
 ...(i===0?{passiveBonuses:[{condition:{kind:'ownRetiredThisTurn',turn:'any',cardType:'field'},
  extraEnergy:1,bp:500}]}:{}),
 ...(i===3?{effects:{onPlay:[{op:'retireOwnFieldOne',optional:true}]}}:{})
}));
const pack=createUniversalPack({id:'generic-retirement-fixture',cards});
const packs=[pack,pack],deck=Object.fromEntries(cards.map((c,i)=>[c.id,i===12?2:4]));
function take(s,id){for(const z of ['deck','hand','life','outside']){
 const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];}
 throw Error('Missing '+id);
}
function ready(){let s=newUniversalMatch(packs,{decks:[deck,deck],seed:771,first:0});
 const first=take(s,'R0'),second=take(s,'R1'),field=take(s,'R2'),spell=take(s,'R3');
 first.ready=false;second.ready=false;field.ready=false;
 s.players[0].energy[0]=first;s.players[0].front[0]=second;s.players[0].energy[1]=field;
 s.players[0].hand.push(spell);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 return {s,first,second,field,spell};
}
const readyActions=s=>legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.mode==='retireReady');
test('Batch B: real own FIELD retirement immediately changes energy/BP and unlocks named MAIN on both lines',()=>{
 let {s,first,second,field,spell}=ready();
 assert.equal(universalCardEnergy(packs,s,0,first),1);
 assert.equal(universalBp(packs,s,first),1500);
 assert.equal(readyActions(s).length,0);
 s=dispatchUniversalAction(packs,s,{type:'event',uid:spell.uid});
 assert.equal(retiredThisTurn(s,0,'field'),false,'pending cost has not completed');
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.equal(retiredThisTurn(s,0,'field'),true);
 assert.equal(retiredThisTurn(s,0,'character'),false);
 assert.equal(retiredThisTurn(s,1,'field'),false);
 assert.equal(universalCardEnergy(packs,s,0,first),2);
 assert.equal(universalBp(packs,s,first),2000);
 assert.equal(readyActions(s).length,2);
 s=dispatchUniversalAction(packs,s,{type:'activate',uid:first.uid,mode:'retireReady'});
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(readyActions(s).length,0,'official Q2156 per-name restriction');
 assert.equal(universalPublicView(packs,s,1).turnRetireEvents,undefined);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch B: skipped cost cannot enable MAIN or bonus and invalid config fails closed',()=>{
 let {s,first,spell}=ready();
 s=dispatchUniversalAction(packs,s,{type:'event',uid:spell.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:null});
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(universalCardEnergy(packs,s,0,first),1);
 assert.equal(readyActions(s).length,0);
 for(const bad of [{op:'readySelfIfOwnRetiredThisTurn',cardType:'event',readyOncePerName:true},
  {op:'readySelfIfOwnRetiredThisTurn',cardType:'field',readyOncePerName:false}]){
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...cards[0],mainAbility:bad}]}),/unsupported main action/);
 }
 for(const bad of [{kind:'ownRetiredThisTurn',turn:'any',cardType:'event'},
  {kind:'ownRetiredThisTurn',turn:'any',cardType:'field',zone:'hand'}]){
  assert.throws(()=>createUniversalPack({id:'bad2',cards:[{...cards[0],
   passiveBonuses:[{condition:bad,bp:1000}]}]}),/invalid retired-card type|invalid or cyclic passive condition/);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
});
