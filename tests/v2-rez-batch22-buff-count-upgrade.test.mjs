import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-056'].includes(id)),
 'REZ-2-037','REZ-2-064'
],'REZ-2-037');

function play(seed,withPriscilla){
 let s=fresh(deck,seed);
 const ally=take(s,0,'REZ-2-050');ally.ready=true;s.players[0].front[0]=ally;
 const other=take(s,0,'REZ-2-033');other.ready=true;s.players[0].energy[0]=other;
 if(withPriscilla){
  const priscilla=take(s,0,'REZ-2-064');priscilla.ready=true;s.players[0].front[1]=priscilla;
 }
 const card=take(s,0,'REZ-2-037');s.players[0].hand.push(card);
 s=toPhase(rezPacks,s,'main');
 const action=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy');
 return {s:dispatchUniversalAction(rezPacks,s,action,{actor:0}),ally,other,card};
}

test('REZ-2-037 buffs up to one other character, or up to two when Priscilla is present',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-037'].effectJa,
  '[登場時]自分の場の他のキャラを『1枚』まで選び、このターン中、BP+500。自分の場に〈プリシラ・バーリエル〉がある場合、『2枚』に代えてもよい。');
 assert.deepEqual(rez.cards['REZ-2-037'].effects.onPlay,[{
  op:'buffOwnOthersUpTo',bp:500,count:1,upgradeName:'プリシラ・バーリエル',upgradeCount:2}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 assert.throws(()=>createUniversalPack({id:'buff',cards:[{
  id:'X',name:'シュルト',color:'green',type:'character',energy:0,ap:1,bp:500,gen:1,implementation:'dsl',
  effects:{onAttack:[{op:'buffOwnOthersUpTo',bp:500,count:1,upgradeName:'プリシラ・バーリエル',upgradeCount:2}]}
 }]}),/onPlay/);
 const plain=play(1037,false);
 assert.equal(plain.s.pending.kind,'effect-buff-own');
 assert.equal(plain.s.pending.remaining,1);
 assert.equal(plain.s.pending.choices.includes(plain.card.uid),false);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(plain.s),{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,skipped,skipped.players[0].front[0]),2000);
 let one=dispatchUniversalAction(rezPacks,plain.s,{type:'chooseOwnBuff',uid:plain.ally.uid},{actor:0});
 assert.equal(one.pending,null);
 assert.equal(universalBp(rezPacks,one,one.players[0].front[0]),2500);
 const upgraded=play(1038,true);
 assert.equal(upgraded.s.pending.remaining,2);
 const foe=['hand','deck','life','outside'].flatMap(zone=>upgraded.s.players[1][zone])
  .find(c=>c.cardId==='REZ-2-064');
 assert.ok(foe);
 assert.equal(upgraded.s.pending.choices.includes(foe.uid),false);
 let both=dispatchUniversalAction(rezPacks,upgraded.s,{type:'chooseOwnBuff',uid:upgraded.ally.uid},{actor:0});
 assert.equal(both.pending.remaining,1);
 assert.equal(both.pending.choices.includes(upgraded.ally.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,both,{type:'chooseOwnBuff',uid:upgraded.card.uid},{actor:0}),
  /not currently legal/);
 const onlyOne=dispatchUniversalAction(rezPacks,structuredClone(both),{type:'chooseOwnBuff',uid:null},{actor:0});
 assert.equal(universalBp(rezPacks,onlyOne,onlyOne.players[0].energy[0]),2500);
 both=dispatchUniversalAction(rezPacks,both,{type:'chooseOwnBuff',uid:upgraded.other.uid},{actor:0});
 assert.equal(both.pending,null);
 assert.equal(universalBp(rezPacks,both,both.players[0].front[0]),2500);
 assert.equal(universalBp(rezPacks,both,both.players[0].energy[0]),3000);
 assert.equal(assertUniversalMatch(rezPacks,one),true);
 assert.equal(assertUniversalMatch(rezPacks,both),true);
 assert.equal(assertUniversalMatch(rezPacks,skipped),true);
});
