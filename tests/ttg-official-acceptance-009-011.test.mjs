import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {legalTtgGreenEntryDecisions,resolveTtgGreenEntry} from '../dist/ttg-green-entry.mjs';
import {legalGreen011,resolveGreen011,resolveGreenOwnStart} from '../dist/ttg-green-main.mjs';
import {greenTtgCurrentBp} from '../dist/ttg-green-passives.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';

// Official Japanese print, not all-interaction/full-card certification:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-009
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-010
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-011
const game=(seed=9011)=>{const s=newTtgCoreMatch({decks:[TTG_GREEN_BETA_PRESET,TTG_GREEN_BETA_PRESET],first:0,seed});s.phase='main';return s;};
const take=(pl,id)=>{
 for(const zone of ['hand','deck','life']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
};
function stage(s,id,line='front',slot=0){
 const pl=s.players[0],card=take(pl,id);
 card.ready=true;pl[line][slot]=card;
 return card;
}
function addTop(s,id){
 const pl=s.players[0],card=take(pl,id);
 pl.deck.unshift(card);
 return card;
}
test('TTG-1-009 printed When Played draw one THEN discard one physical hand card, including the newly drawn card',()=>{
 const s=game(),pl=s.players[0],source=stage(s,'TTG-1-009');
 assert.equal(TTG_BY_ID[source.cardId].energy,0);
 assert.equal(TTG_BY_ID[source.cardId].trigger,'draw');
 const top=pl.deck[0],hand=pl.hand.length,out=pl.outside.length;
 const legal=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:source.uid});
 assert.equal(legal.length,1);assert.equal(legal[0].mode,'drawThenDiscard');
 assert.ok(legal[0].discardUids.includes(top.uid));
 const result=resolveTtgGreenEntry(s,{player:0,sourceUid:source.uid,mode:'drawThenDiscard',discardUid:top.uid});
 assert.equal(result.players[0].hand.length,hand);
 assert.equal(result.players[0].outside.length,out+1);
 assert.equal(result.players[0].outside.at(-1).uid,top.uid);
 assert.equal(result.players[0].deck.some(c=>c.uid===top.uid),false);
 assert.ok(assertTtgCoreState(result));
 assert.throws(()=>resolveTtgGreenEntry(s,{player:0,sourceUid:source.uid,mode:'drawThenDiscard',discardUid:'not-in-hand'}),/discard/i);
 assert.ok(assertTtgCoreState(s),'invalid choice must not mutate original');
});
test('TTG-1-010 official search: only Dai-Gurren; take <=1 then discard one and order remaining physical cards to bottom',()=>{
 const s=game(9010),pl=s.players[0],source=stage(s,'TTG-1-010');
 const invalid=addTop(s,'TTG-1-035'),eligible=addTop(s,'TTG-1-011'),alsoEligible=addTop(s,'TTG-1-005');
 const pick=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:source.uid})[0];
 assert.equal(pick.mode,'search');assert.equal(pick.revealed.length,3);
 assert.ok(pick.candidateUids.includes(eligible.uid));
 assert.ok(pick.candidateUids.includes(alsoEligible.uid));
 assert.ok(!pick.candidateUids.includes(invalid.uid));
 const before=pl.hand.length,beforeOutside=pl.outside.length;
 const oldDiscard=pl.hand[0].uid;
 const bottomOrder=pick.revealed.filter(uid=>uid!==eligible.uid).reverse();
 const result=resolveTtgGreenEntry(s,{player:0,sourceUid:source.uid,mode:'search',
  takeUid:eligible.uid,discardUid:oldDiscard,bottomOrderUids:bottomOrder});
 assert.ok(result.players[0].hand.some(c=>c.uid===eligible.uid));
 assert.ok(!result.players[0].hand.some(c=>c.uid===oldDiscard));
 assert.equal(result.players[0].hand.length,before);
 assert.equal(result.players[0].outside.length,beforeOutside+1);
 assert.deepEqual(result.players[0].deck.slice(-2).map(c=>c.uid),bottomOrder);
 assert.ok(assertTtgCoreState(result));
 const skip=resolveTtgGreenEntry(s,{player:0,sourceUid:source.uid,mode:'search',
  takeUid:null,discardUid:null,bottomOrderUids:[...pick.revealed].reverse()});
 assert.equal(skip.players[0].hand.length,before);
 assert.equal(skip.players[0].outside.length,beforeOutside);
 assert.ok(assertTtgCoreState(skip));
 assert.throws(()=>resolveTtgGreenEntry(s,{player:0,sourceUid:source.uid,mode:'search',
  takeUid:invalid.uid,discardUid:oldDiscard,bottomOrderUids:bottomOrder}),/reveal target/i);
});
test('TTG-1-011: MAIN once per physical copy grants exactly one of +green or FRONT energy until next own start',()=>{
 const s=game(9012),p=s.players[0],c=stage(s,'TTG-1-011','energy',0);
 const options=legalGreen011(s,{player:0,uid:c.uid});
 assert.deepEqual(new Set(options.map(x=>x.mode)),new Set(['boost','frontEnergy']));
 const boosted=resolveGreen011(s,{player:0,uid:c.uid,mode:'boost'});
 assert.equal(boosted.players[0].energy[0].energyBonus,1);
 assert.equal(legalGreen011(boosted,{player:0,uid:c.uid}).length,0,'same copy cannot activate twice this turn');
 const front=s.players[0].energy[0];s.players[0].energy[0]=null;s.players[0].front[0]=front;
 const active=resolveGreen011(s,{player:0,uid:c.uid,mode:'frontEnergy'});
 assert.equal(active.players[0].front[0].frontGenerates,true);
 assert.equal(legalGreen011(active,{player:0,uid:c.uid}).length,0);
 assert.ok(calculateTtgEnergyByColor(active,0).green>=1,'front Simon 011 produces energy when chosen');
 const expiry=structuredClone(active);expiry.players[0].turnCount++;
 const afterOwnStart=withTtgDerivedEnergy(resolveGreenOwnStart(expiry,0),0);
 assert.equal(!!afterOwnStart.players[0].front[0].frontGenerates,false,'expires at next own turn start');
 const expiryBoost=structuredClone(boosted);expiryBoost.players[0].turnCount++;
 const afterBoost=withTtgDerivedEnergy(resolveGreenOwnStart(expiryBoost,0),0);
 assert.equal(afterBoost.players[0].energy[0].energyBonus,0);
 assert.ok(assertTtgCoreState(afterBoost));assert.ok(assertTtgCoreState(afterOwnStart));
});
test('TTG-1-011: printed 2500BP +1500 only on own turn and at 8 derived energy',()=>{
 let s=game(9013),p=s.players[0],c=stage(s,'TTG-1-011','front',0);
 stage(s,'TTG-1-005','energy',0);
 s=withTtgDerivedEnergy(s,0);
 // Derive the actual temporary bonus from the physical source, not a stale clone.
 const current=calculateTtgEnergyByColor(s,0).green;
 s.players[0].energy[0].energyBonus=8-current;
 assert.equal(calculateTtgEnergyByColor(s,0).green,8);
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),4000);
 s.players[0].energy[0].energyBonus--;
 assert.equal(calculateTtgEnergyByColor(s,0).green,7);
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),2500);
 s.players[0].energy[0].energyBonus++;
 s.active=1;
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),2500);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(assertTtgCoreState(s));
});
