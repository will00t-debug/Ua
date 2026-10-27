import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {steinsGatePracticeDeck} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,readyAp,stg,stgBaseDeck,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const PLAIN=['STG-1-001','STG-1-002','STG-1-007','STG-1-057','STG-1-064'];

test('batch 1 keeps Steins;Gate outside the census and pins five vanilla prints',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.length,80);
 assert.equal(Object.keys(stg.cards).length,34);
 assert.deepEqual(validateUniversalDeck(stg,stgBaseDeck),[]);
 const practice=steinsGatePracticeDeck();
 assert.equal(Object.values(practice.counts).reduce((n,x)=>n+x,0),50);
 assert.ok(Object.keys(practice.counts).every(id=>practice.pack.cards[id].color==='blue'));
 for(const id of PLAIN){
  const printed=STEINS_GATE_BY_ID[id],card=stg.cards[id];
  assert.equal(printed.effectJa,'-');
  assert.equal(printed.engineKind,'plain');
  assert.equal(card.name,printed.nameJa);
  assert.equal(card.implementation,'vanilla');
  assert.deepEqual(card.effects,{});
  assert.equal(card.bp,printed.bp);
  assert.equal(card.gen,printed.gen);
 }
 assert.equal(stg.cards['STG-1-003'],undefined);
});

test('vanilla Steins;Gate characters spend AP and leave no pending effect',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-002']),1001),'main');
 readyAp(s);
 const fuel=take(s,0,'STG-1-001');
 s.players[0].hand.push(fuel);
 const fuelPlay=legalUniversalActions(stgPacks,s).find(a=>a.type==='play'&&a.uid===fuel.uid&&a.line==='energy');
 s=dispatchUniversalAction(stgPacks,s,fuelPlay,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].energy[0].uid,fuel.uid);
 for(const id of ['STG-1-007','STG-1-057','STG-1-020','STG-1-002']){
  const card=take(s,0,id);
  s.players[0].hand.push(card);
  readyAp(s);
  const ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
  s=playMain(stgPacks,s,card.uid);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[0].front.some(c=>c?.uid===card.uid),true);
  assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,ap-1);
 }
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
