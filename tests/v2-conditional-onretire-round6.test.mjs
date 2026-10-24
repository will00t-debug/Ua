import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
// Source is test-only; official MST-1-052 port/manifest remains separate.
const qa={id:'TEST-FIELD-GATED-RETIRE',name:'Test conditional retire',color:'green',
 type:'character',energy:0,ap:1,bp:2000,gen:1,implementation:'dsl',
 effects:{onRetire:[{op:'drawIfOwnFieldExists',count:1}]}};
const pack=createUniversalPack({id:'onretire-field-fixture',cards:[...verifiedMstV2Cards(),qa]});
const packs=[pack,pack],deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,
 'MST-1-050':3,'MST-1-055':0,'MST-1-001':4,[qa.id]:1};
function take(s,p,id){for(const zone of ['hand','deck','life','outside']){
 const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
 if(i!==-1)return a.splice(i,1)[0];
 }throw Error('Missing '+id);}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
function battle(hasField){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:5300+Number(hasField)});
 const attack=take(s,0,'MST-1-054');attack.ready=true;s.players[0].front[0]=attack;
 const defender=take(s,1,qa.id);defender.ready=true;s.players[1].front[0]=defender;
 if(hasField)s.players[1].energy[0]=take(s,1,'MST-1-075');
 s=next(next(next(s)));assert.equal(s.phase,'attack');
 return {s,attack,defender};
}
test('real battle retirement checks controller live FIELD at onRetire resolution',()=>{
 for(const enabled of [true,false]){
  let {s,attack,defender}=battle(enabled);
  const hand=s.players[1].hand.length,deckSize=s.players[1].deck.length;
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:attack.uid});
  assert.equal(s.pending?.kind,'block');
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid});
  assert.ok(s.players[1].outside.some(x=>x.uid===defender.uid));
  assert.equal(s.players[1].hand.length,hand+Number(enabled));
  assert.equal(s.players[1].deck.length,deckSize-Number(enabled));
  assert.deepEqual(s.turnRetireEvents.map(x=>x.controller),[1]);
  assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});
test('full ENERGY replacement is REMOVED not an onRetire FIELD-condition draw',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:5302});
 const source=take(s,0,qa.id);s.players[0].energy[0]=source;
 for(let slot=1;slot<4;slot++)s.players[0].energy[slot]=take(s,0,'MST-1-001');
 const entrant=take(s,0,'MST-1-001');s.players[0].hand.push(entrant);
 s=next(next(s));const hand=s.players[0].hand.length,decks=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===entrant.uid&&
  x.line==='energy'&&x.slot===0&&x.replaceUid===source.uid);
 assert.ok(action);s=dispatchUniversalAction(packs,s,action);
 assert.ok(s.players[0].removed.some(x=>x.uid===source.uid));
 assert.equal(s.players[0].hand.length,hand-1);assert.equal(s.players[0].deck.length,decks);
 assert.deepEqual(s.turnRetireEvents,[]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict conditional-onRetire schema rejects invalid counts, extra keys and non-retirement timings',()=>{
 for(const op of [{op:'drawIfOwnFieldExists',count:0},
  {op:'drawIfOwnFieldExists',count:6},{op:'drawIfOwnFieldExists',count:1,who:'enemy'}]){
  assert.throws(()=>createUniversalPack({id:'bad-effect',cards:[{...qa,effects:{onRetire:[op]}}]}),
   /invalid FIELD-gated draw profile/);
 }
 assert.throws(()=>createUniversalPack({id:'bad-timing',cards:[{...qa,
  effects:{onPlay:[{op:'drawIfOwnFieldExists',count:1}]}}]}),/requires onRetire/);
 assert.throws(()=>createUniversalPack({id:'bad-type',cards:[{...qa,type:'event',
  bp:0,gen:0}]}),/unsupported onRetire/);
});
