import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,rez,rezDeck} from './helpers/rez-v2-match.mjs';
import {deckWith,fresh,put,stg,stgPacks,toPhase} from './helpers/stg-v2-match.mjs';

const IMPACT='【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）';
const IDS=['STG-1-030','STG-1-042','STG-1-053'];

test('batch 2 pins the three printed impact-null characters',()=>{
 for(const id of IDS){
  assert.equal(STEINS_GATE_BY_ID[id].effectJa,IMPACT);
  assert.equal(stg.cards[id].impactNull,true);
  assert.deepEqual(stg.cards[id].effects,{});
 }
});

test('impact on a winning attacker is cancelled only by the battling impact-null character',()=>{
 const rezIds=REZ_BASE_IDS.map((id,i)=>i===REZ_BASE_IDS.length-1?'REZ-2-047':id);
 const attackerDeck=rezDeck(rezIds);
 const home=deckWith(['STG-1-042','STG-1-030']);
 const packs=[rez,stg];
 function battle(defenderId,seed){
  let s=newUniversalMatch(packs,{decks:[attackerDeck,home],seed,first:0});
  const attacker=put(s,0,'REZ-2-047','front',0);
  const defender=put(s,1,defenderId,'front',0);
  s=toPhase(packs,s,'attack');
  const attack=legalUniversalActions(packs,s).find(a=>a.type==='attack'&&a.uid===attacker.uid);
  assert.ok(attack);
  s=dispatchUniversalAction(packs,s,attack,{actor:0});
  assert.equal(s.pending.kind,'block');
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:1});
  return s;
 }
 const plain=battle('STG-1-001',2030);
 assert.equal(plain.players[1].life.length,6);
 assert.ok(plain.players[1].outside.some(c=>c.cardId==='STG-1-001'));
 const nulled=battle('STG-1-042',2042);
 assert.equal(nulled.players[1].life.length,7);
 assert.ok(nulled.players[1].outside.some(c=>c.cardId==='STG-1-042'));
 assert.equal(nulled.pending,null);
 const green=battle('STG-1-053',2053);
 assert.equal(green.players[1].life.length,7);
 assert.equal(assertUniversalMatch(packs,green),true);
 assert.equal(assertUniversalMatch(stgPacks,fresh()),true);
});
