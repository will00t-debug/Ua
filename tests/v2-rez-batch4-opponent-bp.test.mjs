import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,take} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-060'],'REZ-2-060');

test('REZ-2-060 prints opponent-turn BP-1500 on top of 2500',()=>{
 const printed=REZERO_VOL2_BY_ID['REZ-2-060'];
 assert.equal(printed.effectJa,'[相手のターン中]このキャラはBP-1500。');
 assert.equal(printed.bp,2500);
 assert.equal(printed.bpMark,'-');
 const card=rez.cards['REZ-2-060'];
 assert.equal(card.name,'フェルト');
 assert.equal(card.opponentTurnBp,-1500);
 assert.equal(card.ownTurnBp,0);
 assert.deepEqual(card.passiveBonuses,[]);
 assert.deepEqual(card.effects,{});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
});

for(const line of ['front','energy']){
 test('REZ-2-060 '+line+' is 2500 on its controller turn and 1000 on the opponent turn',()=>{
  const packs=[rez,rez];
  const s=fresh(deck,1060);
  const felt=take(s,0,'REZ-2-060');
  felt.ready=line==='front';
  s.players[0][line][0]=felt;
  assert.equal(universalBp(packs,s,s.players[0][line][0]),2500);
  if(line==='front')
   assert.equal(universalPublicView(packs,s,1).players[0].front[0].bp,2500);
  const other=structuredClone(s);
  other.active=1;
  assert.equal(universalBp(packs,other,other.players[0][line][0]),1000);
  other.players[0][line][0].ready=false;
  assert.equal(universalBp(packs,other,other.players[0][line][0]),1000);
  other.active=0;
  assert.equal(universalBp(packs,other,other.players[0][line][0]),2500);
  assert.equal(assertUniversalMatch(packs,s),true);
  assert.equal(assertUniversalMatch(packs,other),true);
 });
}
