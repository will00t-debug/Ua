import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const TEXT='【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。';

test('batch 6 pins both energy-1 bounce prints',()=>{
 for(const id of ['STG-1-019','STG-1-063']){
  assert.equal(STEINS_GATE_BY_ID[id].effectJa,TEXT);
  assert.deepEqual(stg.cards[id].effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 }
});

test('a cheap other character returns, and the source returns when none qualifies',()=>{
 let chosen=toPhase(stgPacks,fresh(deckWith(['STG-1-019','STG-1-008']),6019),'main');
 put(chosen,0,'STG-1-008','energy',0);
 const low=put(chosen,0,'STG-1-001','front',0);
 const source=take(chosen,0,'STG-1-019');
 chosen.players[0].hand.push(source);
 readyAp(chosen);
 chosen=playMain(stgPacks,chosen,source.uid);
 assert.equal(chosen.pending.kind,'effect-bounce-own');
 assert.deepEqual(legalUniversalActions(stgPacks,chosen),[{type:'chooseOwnBounce',uid:low.uid}]);
 assert.throws(()=>dispatchUniversalAction(stgPacks,chosen,{type:'chooseOwnBounce',uid:source.uid},{actor:0}),
  /not currently legal/);
 chosen=dispatchUniversalAction(stgPacks,chosen,{type:'chooseOwnBounce',uid:low.uid},{actor:0});
 assert.ok(chosen.players[0].hand.some(c=>c.uid===low.uid));
 assert.equal(chosen.players[0].front.some(c=>c?.uid===source.uid),true);
 assert.equal(assertUniversalMatch(stgPacks,chosen),true);

 let self=toPhase(stgPacks,fresh(deckWith(['STG-1-063','STG-1-067']),6063),'main');
 put(self,0,'STG-1-067','energy',0);
 const green=take(self,0,'STG-1-063');
 self.players[0].hand.push(green);
 readyAp(self);
 const hand=self.players[0].hand.length;
 self=playMain(stgPacks,self,green.uid);
 assert.equal(self.pending,null);
 assert.ok(self.players[0].hand.some(c=>c.uid===green.uid));
 assert.equal(self.players[0].hand.length,hand);
 assert.equal(self.players[0].front.every(c=>c?.uid!==green.uid),true);
 assert.equal(assertUniversalMatch(stgPacks,self),true);
});
