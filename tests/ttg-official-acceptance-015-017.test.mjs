import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalGreen015,resolveGreen015,legalGreen016,resolveGreen016,legalGreen017,resolveGreen017,resolveGreenTurnEnd} from '../dist/ttg-green-main.mjs';
import {legalTtgGreenEntryDecisions,resolveTtgGreenEntry} from '../dist/ttg-green-entry.mjs';

// Independently checked Japanese print (not full card certification):
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-015
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-016  Q2268
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-017
function game(seed=1517){
 const s=newTtgCoreMatch({decks:[TTG_GREEN_BETA_PRESET,TTG_GREEN_BETA_PRESET],seed,first:0});
 s.phase='main';
 return s;
}
function take(pl,id){
 for(const area of ['hand','deck','life','outside']){
  const i=pl[area].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[area].splice(i,1)[0];
 }
 throw new Error('Missing physical card '+id);
}
function stage(s,id,line,slot){
 const c=take(s.players[0],id);
 c.ready=true;s.players[0][line][slot]=c;return c;
}
test('015 Nia: each physical card pays its own chosen ACTIVE AP, draws and adds +green until turn end',()=>{
 let s=game(1501),p=s.players[0];
 const a=stage(s,'TTG-1-015','energy',0),b=stage(s,'TTG-1-015','energy',1);
 p.apCards[1].ready=true;
 s=withTtgDerivedEnergy(s,0);
 const before=calculateTtgEnergyByColor(s,0).green,hand=s.players[0].hand.length,top=s.players[0].deck[0].uid;
 const first=legalGreen015(s,{player:0,uid:a.uid}).find(x=>x.apUid===s.players[0].apCards[1].uid);
 assert.ok(first,'player may pay AP2 instead of always AP1');
 let after=withTtgDerivedEnergy(resolveGreen015(s,first),0);
 assert.equal(after.players[0].apCards[1].ready,false);
 assert.equal(after.players[0].apCards[0].ready,true);
 assert.equal(after.players[0].hand.at(-1).uid,top);
 assert.equal(after.players[0].hand.length,hand+1);
 assert.equal(calculateTtgEnergyByColor(after,0).green,before+1);
 assert.equal(legalGreen015(after,{player:0,uid:a.uid}).length,0,'same card may not activate again this turn');
 const second=legalGreen015(after,{player:0,uid:b.uid}).find(x=>x.apUid===after.players[0].apCards[0].uid);
 assert.ok(second,'a SECOND copy has its own Turn 1 allowance');
 after=withTtgDerivedEnergy(resolveGreen015(after,second),0);
 assert.equal(after.players[0].hand.length,hand+2);
 assert.equal(calculateTtgEnergyByColor(after,0).green,before+2);
 const end=withTtgDerivedEnergy(resolveGreenTurnEnd(after),0);
 assert.equal(calculateTtgEnergyByColor(end,0).green,before);
 assert.ok(assertTtgCoreState(end));
});
test('016 Nia Q2268: 19 vs 20 energy boundary, ACTIVE cost, only one activation across copies',()=>{
 let s=game(1601),p=s.players[0];
 const a=stage(s,'TTG-1-016','energy',0),b=stage(s,'TTG-1-016','energy',1);
 const gen=stage(s,'TTG-1-005','energy',2);
 const printed=calculateTtgEnergyByColor(s,0).green;
 gen.energyBonus=19-printed;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,19);
 assert.equal(legalGreen016(s,{player:0,uid:a.uid}).length,0);
 s.players[0].energy[2].energyBonus++;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,20);
 assert.equal(legalGreen016(s,{player:0,uid:a.uid}).length,1);
 const hand=s.players[0].hand.length,top=s.players[0].deck[0].uid;
 const after=withTtgDerivedEnergy(resolveGreen016(s,{player:0,uid:a.uid}),0);
 assert.equal(after.players[0].energy[0].ready,false);
 assert.equal(after.players[0].energy[1].ready,true);
 assert.equal(after.players[0].hand.length,hand+1);
 assert.equal(after.players[0].hand.at(-1).uid,top);
 assert.equal(legalGreen016(after,{player:0,uid:b.uid}).length,0,'Q2268: same NAME shares usage');
 assert.throws(()=>resolveGreen016(after,{player:0,uid:b.uid}),/Illegal|once|energy/i);
 assert.ok(assertTtgCoreState(after));
});
test('017 Nia: printed top-four selection allows Simon, rejects unrelated, exact remaining bottom order',()=>{
 let s=game(1701),p=s.players[0];
 const nia=stage(s,'TTG-1-017','energy',0);
 const simon=take(p,'TTG-1-011'),other=take(p,'TTG-1-005');
 p.deck.unshift(other,simon);
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:nia.uid};
 s=withTtgDerivedEnergy(s,0);
 const options=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:nia.uid});
 assert.deepEqual(options.map(x=>x.mode),['niaSearch','niaOutsideToTop']);
 const search=options[0];
 assert.equal(search.revealed.length,4);
 assert.ok(search.candidateUids.includes(simon.uid));
 assert.ok(!search.candidateUids.includes(other.uid));
 const order=search.revealed.filter(uid=>uid!==simon.uid).reverse();
 const discarded=s.players[0].hand[0].uid;
 assert.throws(()=>resolveTtgGreenEntry(s,{player:0,sourceUid:nia.uid,mode:'niaSearch',
  takeUid:other.uid,discardUid:discarded,bottomOrderUids:order}),/Simon|energy|searched/i);
 const after=withTtgDerivedEnergy(resolveTtgGreenEntry(s,{player:0,sourceUid:nia.uid,mode:'niaSearch',
  takeUid:simon.uid,discardUid:discarded,bottomOrderUids:order}),0);
 assert.ok(after.players[0].hand.some(c=>c.uid===simon.uid));
 assert.ok(after.players[0].outside.some(c=>c.uid===discarded));
 assert.deepEqual(after.players[0].deck.slice(-3).map(c=>c.uid),order);
 assert.ok(assertTtgCoreState(after));
});
test('017 Nia: alternative recovers physical Simon from sideline to deck TOP; later Main +2 expires',()=>{
 let s=game(1702),p=s.players[0];
 const nia=stage(s,'TTG-1-017','energy',0);
 const generator=stage(s,'TTG-1-005','energy',1);
 generator.energyBonus=8;
 const simon=take(p,'TTG-1-011');
 p.outside.push(simon);
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:nia.uid};
 s=withTtgDerivedEnergy(s,0);
 const choice=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:nia.uid}).find(x=>x.mode==='niaOutsideToTop');
 assert.ok(choice.candidateUids.includes(simon.uid));
 const oldTop=s.players[0].deck[0].uid;
 s=withTtgDerivedEnergy(resolveTtgGreenEntry(s,{player:0,sourceUid:nia.uid,
  mode:'niaOutsideToTop',takeUid:simon.uid}),0);
 assert.equal(s.players[0].deck[0].uid,simon.uid);
 assert.equal(s.players[0].deck[1].uid,oldTop);
 assert.equal(s.players[0].outside.some(c=>c.uid===simon.uid),false);
 const before=calculateTtgEnergyByColor(s,0).green;
 assert.ok(before>=8);
 assert.equal(legalGreen017(s,{player:0,uid:nia.uid}).length,1);
 let boosted=withTtgDerivedEnergy(resolveGreen017(s,{player:0,uid:nia.uid}),0);
 assert.equal(calculateTtgEnergyByColor(boosted,0).green,before+2);
 assert.equal(legalGreen017(boosted,{player:0,uid:nia.uid}).length,0);
 boosted=withTtgDerivedEnergy(resolveGreenTurnEnd(boosted),0);
 assert.equal(calculateTtgEnergyByColor(boosted,0).green,before);
 assert.ok(assertTtgCoreState(boosted));
});
