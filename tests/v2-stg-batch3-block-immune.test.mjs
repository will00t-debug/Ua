import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalBp,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,put,stg,stgPacks,toPhase} from './helpers/stg-v2-match.mjs';

test('batch 3 pins double block and the own-turn BP text',()=>{
 assert.equal(STEINS_GATE_BY_ID['STG-1-005'].effectJa,
  '【2回ブロック】（このキャラがこのターン初めてブロックした時、アクティブにする）');
 assert.equal(stg.cards['STG-1-005'].readyOnBlockCount,1);
 assert.equal(STEINS_GATE_BY_ID['STG-1-022'].effectJa,
  'このキャラはBPをマイナスする効果を受けない。【自分のターン中】このキャラはBP+500。');
 assert.equal(stg.cards['STG-1-022'].bp,3500);
 assert.equal(stg.cards['STG-1-022'].bpDownImmune,true);
 assert.equal(stg.cards['STG-1-022'].ownTurnBp,500);
});

test('STG-1-005 readies after the first block and stays rested after the second',()=>{
 const deck=deckWith(['STG-1-005']);
 let s=fresh(deck,3005);
 const small=put(s,0,'STG-1-001','front',0);
 const other=put(s,0,'STG-1-007','front',1);
 const blocker=put(s,1,'STG-1-005','front',0);
 s=toPhase(stgPacks,s,'attack');
 s=dispatchUniversalAction(stgPacks,s,{type:'attack',uid:small.uid});
 assert.equal(s.pending.kind,'block');
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(s.blocksByUid[blocker.uid],1);
 s=dispatchUniversalAction(stgPacks,s,{type:'attack',uid:other.uid});
 s=dispatchUniversalAction(stgPacks,s,{type:'chooseBlock',uid:blocker.uid},{actor:1});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.blocksByUid[blocker.uid],2);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===blocker.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-022 keeps 4000 on its own turn and ignores a negative BP delta',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-022']),3022),'main');
 const faris=put(s,0,'STG-1-022','front',0);
 assert.equal(universalBp(stg,s,faris),4000);
 assert.equal(universalPublicView(stgPacks,s,1).players[0].front[0].bp,4000);
 faris.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(universalBp(stg,s,faris),4000);
 faris.buffs.push({bp:500,untilTurn:s.turn});
 assert.equal(universalBp(stg,s,faris),4500);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
