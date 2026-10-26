import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,take} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'&&id!=='REZ-2-042'),'REZ-2-004','REZ-2-060'],'REZ-2-004');

test('REZ-2-004 gains 1500 on its turn when an opposing front character is below its printed BP',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-004'].effectJa,
  '[自分のターン中]相手のフロントLに元々のBPよりBPが低いキャラがある場合、このキャラはBP+1500。');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-004'].bp,1500);
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-004'].bpMark,'+');
 const card=rez.cards['REZ-2-004'];
 assert.equal(card.bp,1500);
 assert.equal(card.ownTurnBp||0,0);
 assert.deepEqual(card.passiveBonuses,[{condition:{kind:'oppFrontCurrentBpBelowPrinted',turn:'own'},bp:1500}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'X',name:'X',color:'yellow',type:'character',energy:0,ap:1,bp:1500,gen:1,
  implementation:'dsl',effects:{}};
 const bonus=condition=>createUniversalPack({id:'gap',cards:[{...body,passiveBonuses:[{condition,bp:1500}]}]});
 assert.throws(()=>bonus({kind:'oppFrontCurrentBpBelowPrinted',turn:'any'}),/own-turn|invalid/);
 assert.throws(()=>bonus({kind:'oppFrontCurrentBpBelowPrinted',turn:'own',zone:'front'}),/invalid/);
});

test('the printed-BP gap reads opponent front current BP and only on the controller turn',()=>{
 const packs=[rez,rez];
 const s=fresh(deck,1004);
 const ram=take(s,0,'REZ-2-004');ram.ready=true;s.players[0].front[0]=ram;
 const felt=take(s,1,'REZ-2-060');felt.ready=true;s.players[1].front[0]=felt;
 assert.equal(universalBp(packs,s,felt),1000);
 assert.equal(universalBp(packs,s,ram),3000);
 assert.equal(universalPublicView(packs,s,1).players[0].front[0].bp,3000);
 felt.ready=false;
 assert.equal(universalBp(packs,s,ram),3000);
 s.players[1].front[0]=null;s.players[1].energy[0]=felt;
 assert.equal(universalBp(packs,s,ram),1500);
 const own=take(s,0,'REZ-2-046');own.ready=true;own.buffs=[{bp:-1000,untilTurn:s.turn}];
 s.players[0].front[1]=own;
 assert.equal(universalBp(packs,s,ram),1500);
 s.players[1].energy[0]=null;s.players[1].outside.push(felt);
 const foe=take(s,1,'REZ-2-046');foe.ready=true;foe.buffs=[{bp:-1000,untilTurn:s.turn}];
 s.players[1].front[0]=foe;
 assert.equal(universalBp(packs,s,foe),3000);
 assert.equal(universalBp(packs,s,ram),3000);
 const other=structuredClone(s);other.active=1;
 assert.equal(universalBp(packs,other,other.players[0].front[0]),1500);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,other),true);
});
