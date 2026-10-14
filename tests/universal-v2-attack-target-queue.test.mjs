import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalActor,universalBp,universalPublicView
} from '../dist/universal-v2/engine.mjs';

// TEST-ONLY packs use the same printed local IDs in two independent titles.
// The targeted onAttack effect is deliberately not claimed as an official card.
const ids=Array.from({length:13},(_,i)=>'A'+String(i).padStart(2,'0'));
const cards=ids.map((id,i)=>({
 id,name:'Fighter '+i,type:'character',color:'green',
 energy:i===0?0:2,ap:1,bp:2000,gen:i===0?4:1,
 implementation:'vanilla'
}));
const withAttack=cards.map(c=>c.id==='A10'?{
 ...c,implementation:'dsl',effects:{onAttack:[
  {op:'buffSelf',bp:1000},
  {op:'enemyBpDown',bp:2500,optional:true},
  {op:'draw',count:1}
 ]}
}:c);
const alpha=createUniversalPack({id:'attack-timing-alpha',cards:withAttack});
const beta=createUniversalPack({id:'attack-timing-beta',cards});
const packs=[alpha,beta];
const deck=Object.fromEntries(ids.slice(0,12).map(id=>[id,4]));
deck.A12=2;
const take=(s,player,id)=>{
 const pl=s.players[player];
 for(const zone of ['hand','deck','life','outside']){
  const index=pl[zone].findIndex(x=>x.cardId===id);
  if(index!==-1)return pl[zone].splice(index,1)[0];
 }
 throw Error('Missing test fixture '+player+'/'+id);
};
function setUp({targets=2}={}){
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed:221,first:0});
 const attacker=take(s,0,'A10');
 s.players[0].front[0]=attacker;attacker.ready=true;
 const foes=[];
 for(let i=0;i<targets;i++){
  const c=take(s,1,'A04');
  c.ready=true;s.players[1].front[i]=c;foes.push(c);
 }
 for(let i=0;i<3;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,attacker,foes};
}
const attack=(s,attacker)=>dispatchUniversalAction(packs,s,
 {type:'attack',uid:attacker.uid},{actor:0});

test('onAttack target choice resolves before opponent gets blocking priority',()=>{
 const {s,attacker,foes}=setUp();
 const handBefore=s.players[0].hand.length;
 const deckBefore=s.players[0].deck.length;
 const pending=attack(s,attacker);
 assert.equal(pending.pending.kind,'effect-target');
 assert.equal(pending.pending.player,0,'attacking controller chooses own target');
 assert.equal(universalActor(pending),0);
 assert.ok(pending.effectQueue.some(x=>x.op==='openBlock'));
 assert.equal(universalBp(packs,pending,pending.players[0].front[0]),3000,
  'preceding onAttack self-buff takes effect before target selection');
 assert.equal(pending.players[0].deck.length,deckBefore,
  'later draw waits until the target choice resolves');
 assert.ok(legalUniversalActions(packs,pending).every(a=>a.type==='chooseTarget'));
 assert.throws(()=>dispatchUniversalAction(packs,pending,
  {type:'chooseBlock',uid:null},{actor:1}),/Wrong player turn|not currently legal/);
 const picked=dispatchUniversalAction(packs,pending,
  {type:'chooseTarget',uid:foes[0].uid},{actor:0});
 assert.equal(picked.players[1].front[0],null,
  'BP at zero or below causes immediate retirement before blockers are selected');
 assert.ok(picked.players[1].outside.some(c=>c.uid===foes[0].uid));
 assert.equal(picked.players[0].deck.length,deckBefore-1);
 assert.equal(picked.players[0].hand.length,handBefore+1);
 assert.equal(picked.pending.kind,'block');
 assert.equal(picked.pending.player,1);
 assert.equal(universalActor(picked),1);
 const actions=legalUniversalActions(packs,picked);
 assert.ok(!actions.some(a=>a.uid===foes[0].uid));
 assert.ok(actions.some(a=>a.type==='chooseBlock'&&a.uid===foes[1].uid));
 assert.equal(assertUniversalMatch(packs,picked),true);
 assert.equal(pending.players[1].front[0].uid,foes[0].uid,
  'choosing on cloned state must not mutate original');
 const view=universalPublicView(packs,picked,1);
 assert.equal(view.players[0].hand,null);
 assert.equal(view.pending.kind,'block');
 const defended=dispatchUniversalAction(packs,picked,
  {type:'chooseBlock',uid:foes[1].uid},{actor:1});
 assert.equal(defended.players[1].life.length,s.players[1].life.length,
  'blocking does not deal life damage regardless of fixture life placement');
 assert.equal(assertUniversalMatch(packs,defended),true);
});

test('declining optional attack-time target still draws before defender blocks',()=>{
 const {s,attacker,foes}=setUp();
 const started=attack(s,attacker);
 const deckBefore=started.players[0].deck.length;
 const skipped=dispatchUniversalAction(packs,started,
  {type:'chooseTarget',uid:null},{actor:0});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(skipped.players[0].deck.length,deckBefore-1);
 assert.equal(skipped.players[1].front[0].uid,foes[0].uid,
  'skip cannot accidentally retire a character');
 const unblocked=dispatchUniversalAction(packs,skipped,
  {type:'chooseBlock',uid:null},{actor:1});
 assert.equal(unblocked.players[1].life.length,s.players[1].life.length-1,
  'an unblocked attack deals exactly one life, relative to initial fixture state');
 assert.equal(assertUniversalMatch(packs,unblocked),true);
});

test('attack triggers with no legal target still complete remaining jobs then open block',()=>{
 const {s,attacker}=setUp({targets:0});
 const before=s.players[0].deck.length;
 const after=attack(s,attacker);
 assert.equal(after.pending.kind,'block');
 assert.equal(after.pending.player,1);
 assert.equal(after.players[0].deck.length,before-1);
 assert.equal(after.effectQueue.length,0);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('internal attack continuation is reserved to the engine, not a pack DSL op',()=>{
 assert.throws(()=>createUniversalPack({id:'illegal-internal-effect',cards:cards.map(c=>
  c.id==='A10'?{...c,implementation:'dsl',effects:{onAttack:[{op:'openBlock'}]}}:c
 )}),/unsupported/);
});
