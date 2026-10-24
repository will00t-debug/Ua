import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
// Test-only event to force TRUE own-field retirement; never in title registry,
// not an official printed card, and never counted in a real deck/matrix.
const sentinel={id:'TEST-RETIRE-FIELD-EVENT',name:'Fixture true retirement',
 color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,implementation:'dsl',
 effects:{onPlay:[{op:'retireOwnFieldOne',optional:true}]}};
const pack=createUniversalPack({id:'mst-field-retirement-fixture',
 cards:[...verifiedMstV2Cards(),sentinel]});
const opponent=registeredV2TitlePack('sword-art-online');
const officialIds=['MST-1-050','MST-1-051','MST-1-054','MST-1-075',
 'MST-1-055','MST-1-057','MST-1-061','MST-1-063','MST-1-070',
 'MST-1-069','MST-1-047','MST-1-010','MST-1-077','MST-1-072'];
const deck=Object.fromEntries(officialIds.map(id=>[id,4]));
deck['MST-1-051']=1;deck['MST-1-072']=0;deck[sentinel.id]=1;
const saoDeck={'SAO-1-014':4,'SAO-1-020':4,'SAO-1-001':4,
 'SAO-1-016':4,'SAO-1-019':4,'SAO-1-023':4,'SAO-1-035':4,
 'SAO-1-039':4,'SAO-1-042':4,'SAO-1-046':4,'SAO-1-054':4,
 'SAO-1-055':4,'SAO-1-058':2};
const packs=[pack,opponent];
function take(s,id){
 for(const z of ['deck','hand','life','outside']){
  const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing fixture physical '+id);
}
function ready(disabled){
 let s=newUniversalMatch(packs,{decks:[deck,saoDeck],first:0,seed:217});
 const field=take(s,'MST-1-075');
 field.ready=false;s.players[0].energy[0]=field;
 const ally=take(s,'MST-1-050');
 s.players[0].front[0]=ally;
 if(disabled)grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:ally.uid,targetUid:field.uid,
  until:{player:1,phase:'attack',edge:'end'}});
 const spell=take(s,sentinel.id);s.players[0].hand.push(spell);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===spell.uid);
 assert.ok(play);
 const handBefore=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-retire-own-field');
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOwnFieldRetire',uid:null},{type:'chooseOwnFieldRetire',uid:field.uid}]);
 return {s,field,spell,handBefore};
}
test('retireOwnFieldOne test-only effect is strictly validated and selection cannot forge a UID',()=>{
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.deepEqual(validateUniversalDeck(opponent,saoDeck),[]);
 const {s}=ready(false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:'0-forged'}),
  /not currently legal/);
 for(const bad of [
  {op:'retireOwnFieldOne',optional:false},
  {op:'retireOwnFieldOne',optional:true,opponent:true}
 ])assert.throws(()=>createUniversalPack({id:'negative',cards:[{
  ...sentinel,effects:{onPlay:[bad]}
 }]}),/invalid optional own field retirement/);
 assert.equal(registeredV2TitlePack('mushoku-tensei').cards[sentinel.id],undefined);
});
test('printed MST-075 FIELD onRetire draws once ONLY after true retirement, not optional skip',()=>{
 for(const yes of [false,true]){
  let {s,field,handBefore}=ready(false);
  s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:yes?field.uid:null});
  assert.equal(s.players[0].energy[0]===null,yes);
  assert.equal(s.turnRetireEvents.length,yes?1:0);
  if(yes)assert.deepEqual(s.turnRetireEvents[0],{
   turn:s.turn,controller:0,cardType:'field',uid:field.uid,
   line:'energy',fieldEntryStamp:null});
  assert.equal(s.players[0].outside.some(c=>c.uid===field.uid),yes);
  // The fixture event is spent; exactly one printed draw for real FIELD retirement.
  assert.equal(s.players[0].hand.length,handBefore-1+(yes?1:0));
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('Q2220 original-effect suppression also blocks official FIELD onRetire draw',()=>{
 let {s,field,handBefore}=ready(true);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===field.uid),true);
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('full-energy replacement removes the printed FIELD instead of falsely firing onRetire',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,saoDeck],first:0,seed:220});
 const field=take(s,'MST-1-075');field.ready=false;s.players[0].energy[0]=field;
 for(const [slot,id] of [[1,'MST-1-051'],[2,'MST-1-050'],[3,'MST-1-070']]){
  const c=take(s,id);c.ready=false;s.players[0].energy[slot]=c;
 }
 const entrant=take(s,'MST-1-050');s.players[0].hand.push(entrant);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const act=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===entrant.uid&&
  a.line==='energy'&&a.slot===0&&a.replaceUid===field.uid);
 assert.ok(act);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,act);
 assert.equal(s.players[0].removed.some(c=>c.uid===field.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===field.uid),false);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.turnRetireEvents.length,0,'REMOVED cannot count as retirement');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Batch A: ledger preserves same-turn history, resets at next turn, rejects forged prior-turn records',()=>{
 let {s,field}=ready(false);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.equal(s.turnRetireEvents.length,1);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.turnRetireEvents.length,1);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,1);
 assert.deepEqual(s.turnRetireEvents,[]);
 const forged=structuredClone(s);forged.turnRetireEvents.push({turn:s.turn-1,
  controller:0,cardType:'field',uid:field.uid,line:'energy',fieldEntryStamp:null});
 assert.throws(()=>assertUniversalMatch(packs,forged),/Invalid true-retirement history/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
