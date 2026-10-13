import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';

// Official print and Q&A evidence:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-001
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-003
// Q2259: two printed Viral 003 cards share the ready-ability name limit.
// Q2392: at seven energy, Viral 003 can grant itself one, immediately reaching
// eight, and thereby grant ALL front characters energy generation.
const original=TTG_GREEN_BETA_PRESET;
const deck001={...original,'TTG-1-003':0,'TTG-1-001':4};
const deck003=original;
function game(deck=deck001,seed=102){return newTtgCoreMatch({decks:[deck,deck],first:0,seed});}
function take(pl,id){
 for(const zone of ['hand','deck','life','outside']){const i=pl[zone].findIndex(c=>c.cardId===id);if(i>=0)return pl[zone].splice(i,1)[0];}
 throw Error('missing printed card in fixture '+id);
}
const legal=(s,pred)=>{const x=legalTtgCoreActions(s).find(pred);assert.ok(x,'expected legal TTG action');return x;};
const next=(s,pred)=>dispatchTtgCoreAction(s,legal(s,pred));
const main=s=>next(next(s,a=>a.type==='next'),a=>a.type==='next');
function place(s,id,{owner=0,line='energy',slot=0,ready=true,bonus=0}={}){
 const card=take(s.players[owner],id);card.ready=ready;card.energyBonus=bonus;
 s.players[owner][line][slot]=card;return card;
}

test('TTG-1-001: official zero-energy Viral 2000BP and no life trigger; actual AP-paid entry offers private top choice',()=>{
 let s=main(game());const p=s.players[0];
 const handCard=take(p,'TTG-1-001');p.hand.push(handCard);
 assert.equal(TTG_BY_ID['TTG-1-001'].energy,0);
 assert.equal(TTG_BY_ID['TTG-1-001'].bp,2000);
 assert.equal(TTG_BY_ID['TTG-1-001'].trigger,null);
 const beforeTop=p.deck[0].uid,beforeOutside=p.outside.length,beforeAp=p.apCards.filter(c=>c.ready).length;
 s=next(s,a=>a.type==='play'&&a.handUid===handCard.uid&&a.line==='energy'&&a.slot===0);
 assert.equal(s.pending?.kind,'ttgGreenEntry');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,beforeAp-1);
 const modes=new Set(legalTtgCoreActions(s).map(a=>a.mode));
 assert.deepEqual(modes,new Set(['keepTop','outsideTop']));
 const keep=next(s,a=>a.mode==='keepTop');
 assert.equal(keep.players[0].deck[0].uid,beforeTop);
 assert.equal(keep.players[0].outside.length,beforeOutside);
 const discard=next(s,a=>a.mode==='outsideTop');
 assert.equal(discard.players[0].outside.at(-1).uid,beforeTop);
 assert.equal(discard.players[0].deck.some(x=>x.uid===beforeTop),false);
 assert.equal(discard.players[0].outside.length,beforeOutside+1);
 assert.ok(assertTtgCoreState(keep));assert.ok(assertTtgCoreState(discard));
});

test('TTG-1-003 official Q2392: at 7 energy activating front producer immediately enables 8-energy team generation',()=>{
 let s=main(game(deck003,126)),p=s.players[0];
 const v=place(s,'TTG-1-003',{line:'front',slot:0,ready:true});
 place(s,'TTG-1-005',{line:'energy',slot:0,ready:true,bonus:3});
 place(s,'TTG-1-006',{line:'energy',slot:1,ready:true});
 place(s,'TTG-1-009',{line:'energy',slot:2,ready:true});
 place(s,'TTG-1-010',{line:'energy',slot:3,ready:true});
 // Force exactly 7 by adjusting only the temporary generator bonus, not the
 // derived cache; avoid assuming that printed green generators have gen 1.
 const base=calculateTtgEnergyByColor(s,0).green;
 p.energy[0].energyBonus+=7-base;
 assert.equal(calculateTtgEnergyByColor(s,0).green,7);
 s=withTtgDerivedEnergy(s,0);
 const use=legalTtgCoreActions(s).find(a=>a.type==='ttgGreen003Front'&&a.uid===v.uid);
 assert.ok(use,'front Viral option exists at 7 energy');
 const after=dispatchTtgCoreAction(s,use);
 assert.equal(after.players[0].front[0].frontGenerates,true);
 assert.equal(after.players[0].frontGeneratesAll,true,'official Q2392 re-evaluates after self starts producing');
 assert.ok(calculateTtgEnergyByColor(after,0).green>=8);
 assert.ok(assertTtgCoreState(after));
});

test('TTG-1-003 official Q2259: 20-energy READY power can be used only once per Viral name per turn',()=>{
 let s=main(game(deck003,132)),p=s.players[0];
 const first=place(s,'TTG-1-003',{line:'front',slot:0,ready:true});
 const second=place(s,'TTG-1-003',{line:'front',slot:1,ready:true});
 const rest=place(s,'TTG-1-006',{line:'front',slot:2,ready:false});
 place(s,'TTG-1-005',{line:'energy',slot:0,ready:true,bonus:18});
 p.energy[0].energyBonus+=Math.max(0,20-calculateTtgEnergyByColor(s,0).green);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(calculateTtgEnergyByColor(s,0).green>=20);
 const a=legal(s,a=>a.type==='ttgGreen003Ready'&&a.uid===first.uid&&a.targetUid===rest.uid);
 const after=dispatchTtgCoreAction(s,a);
 assert.equal(after.players[0].front[2].ready,true);
 assert.equal(legalTtgCoreActions(after).some(a=>a.type==='ttgGreen003Ready'&&a.uid===second.uid),false);
 assert.ok(assertTtgCoreState(after));
});
