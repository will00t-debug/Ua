import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {countRetirementsThisTurn,retiredThisTurn,matchesV2LiveCondition}
 from '../dist/universal-v2/field-conditions.mjs';
// Component-only: BLC-1-024 needs Raid stripping + chooseOne + DAMAGE2 before
// it can be promoted. This test verifies only its printed TWO-character history.
const specs=Array.from({length:13},(_,i)=>({
 id:'COUNT-'+i,name:'Fixture '+i,color:'yellow',type:'character',energy:0,ap:1,
 bp:i===3||i===4?4000:i===5||i===6?1000:2000,gen:1,
 implementation:i===0?'dsl':'vanilla',
 ...(i===0?{passiveBonuses:[{condition:{kind:'retireCountThisTurn',
 turn:'own',controller:'any',cardType:'character',min:2},bp:1000}]}:{})
}));
const pack=createUniversalPack({id:'count-event-component',cards:specs}),packs=[pack,pack];
const deck=Object.fromEntries(specs.map((c,i)=>[c.id,i===12?2:4]));
function take(s,p,id){for(const zone of ['deck','hand','life','outside']){
 const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
 if(i>=0)return list.splice(i,1)[0];
 }throw Error('Missing physical card '+id);}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
function setup(){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:20261022});
 const source=take(s,0,'COUNT-0');source.ready=false;s.players[0].energy[0]=source;
 const attackers=[3,4].map((n,i)=>{let c=take(s,0,'COUNT-'+n);c.ready=true;s.players[0].front[i]=c;return c;});
 const blockers=[5,6].map((n,i)=>{let c=take(s,1,'COUNT-'+n);c.ready=true;s.players[1].front[i]=c;return c;});
 s=next(next(next(s)));assert.equal(s.phase,'attack');return {s,source,attackers,blockers};
}
test('two actual opposing CHARACTER retirements count individually across both owners, not fields or outside',()=>{
 let {s,source,attackers,blockers}=setup();
 assert.equal(countRetirementsThisTurn(s,'any','character'),0);
 assert.equal(universalBp(packs,s,source),2000);
 for(let i=0;i<2;i++){
  const a=legalUniversalActions(packs,s).find(x=>x.type==='attack'&&x.uid===attackers[i].uid);
  assert.ok(a);s=dispatchUniversalAction(packs,s,a);
  assert.equal(s.pending?.kind,'block');
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:blockers[i].uid});
  assert.equal(countRetirementsThisTurn(s,1,'character'),i+1);
  assert.equal(countRetirementsThisTurn(s,0,'character'),0);
  assert.equal(countRetirementsThisTurn(s,'any','field'),0);
  assert.equal(universalBp(packs,s,s.players[0].energy[0]),i===0?2000:3000);
 }
 assert.equal(s.turnRetireEvents.length,2);
 assert.equal(universalPublicView(packs,s,1).turnRetireEvents,undefined);
 assert.equal(assertUniversalMatch(packs,s),true);
 s=next(s);assert.equal(s.active,1);
 assert.equal(countRetirementsThisTurn(s,'any','character'),0);
 assert.equal(universalBp(packs,s,s.players[0].energy[0]),2000);
});
test('historical retirement count uses controller selector and exact type, rejects corrupt declarative schema',()=>{
 const {s}=setup();
 for(const [controller,cardType] of [['own','character'],['opponent','character'],['any','field']]){
  assert.equal(matchesV2LiveCondition(s,0,'unused',
   {kind:'retireCountThisTurn',turn:'own',controller,cardType,min:1},()=>null,()=>0),false);
 }
 for(const bad of [{controller:'friend'},{cardType:'event'},{min:0},{min:51},{zone:'outside'}]){
  const base={kind:'retireCountThisTurn',turn:'own',controller:'any',cardType:'character',min:2};
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...specs[0],
   passiveBonuses:[{condition:{...base,...bad},bp:1000}]}]}),
   /invalid retirement count predicate|invalid or cyclic passive condition/);
 }
 for(const a of [[2,'character'],['any','event'],['enemy','field']])
  assert.throws(()=>countRetirementsThisTurn(s,...a),/Invalid true-retirement count predicate/);
 assert.throws(()=>retiredThisTurn(s,'any','character'),/Invalid true-retirement predicate/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
