import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_GREEN_BETA_PRESET} from '../dist/ttg-browser.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalGreen012Double,resolveGreen012Double,resolveGreen012TurnEnd} from '../dist/ttg-green-012.mjs';
import {legalTtgGreenEntryDecisions,resolveTtgGreenEntry} from '../dist/ttg-green-entry.mjs';
import {greenTtgCurrentBp} from '../dist/ttg-green-passives.mjs';

// 2026-10-14 official individual cards, not full-card certification:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-012  Q2264-Q2267
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-013
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-014
const deck={...TTG_GREEN_BETA_PRESET,
 'TTG-1-005':2,'TTG-1-009':2,'TTG-1-010':2,
 'TTG-1-007':2,'TTG-1-012':2,'TTG-1-013':2};
function game(seed=1214){
 const s=newTtgCoreMatch({decks:[deck,deck],seed,first:0});
 s.phase='main';
 return s;
}
function take(pl,id){
 for(const zone of ['hand','deck','life','outside']){
  const at=pl[zone].findIndex(x=>x.cardId===id);
  if(at>=0)return pl[zone].splice(at,1)[0];
 }
 throw new Error('Missing physical '+id);
}
function stage(s,id,line,slot){
 const c=take(s.players[0],id);
 c.ready=true;s.players[0][line][slot]=c;
 return c;
}
test('TTG-1-012 Q2264/Q2265: another existing double becomes x4; later added energy also scales x4',()=>{
 let s=game(1201),p=s.players[0];
 const first=stage(s,'TTG-1-012','front',0);
 const other=stage(s,'TTG-1-012','front',1);
 first.enteredTurn=s.turn-1;other.enteredTurn=s.turn-1;
 stage(s,'TTG-1-005','energy',0).energyBonus=8;
 p.energyDoublings=1; // A prior doubling such as TTG-1-040.
 s=withTtgDerivedEnergy(s,0);
 const before=calculateTtgEnergyByColor(s,0).green;
 assert.ok(before>=8);
 assert.equal(legalGreen012Double(s,0).length,2,'both copies initially eligible');
 const activated=resolveGreen012Double(s,{player:0,uid:first.uid});
 assert.equal(calculateTtgEnergyByColor(activated,0).green,before*2,'x2 + x2 => x4, not x3');
 assert.equal(legalGreen012Double(activated,0).length,0,'Q2267 once per Simon NAME');
 assert.throws(()=>resolveGreen012Double(activated,{player:0,uid:other.uid}),/once|turn|Q2267/i);
 const later=structuredClone(activated);
 later.players[0].energy[0].energyBonus+=1;
 assert.equal(calculateTtgEnergyByColor(later,0).green, before*2+4,'Q2265 late +1 is also quadrupled');
 const ended=withTtgDerivedEnergy(resolveGreen012TurnEnd(activated),0);
 assert.equal(calculateTtgEnergyByColor(ended,0).green,before,'only 012 turn-duration double expires');
 assert.ok(assertTtgCoreState(ended));
});
test('TTG-1-013: real hand entry may pay another physical AP to REST-play sidelined Gimmy',()=>{
 let s=game(1301),p=s.players[0];
 const source=take(p,'TTG-1-013'),partner=take(p,'TTG-1-007');
 p.hand.push(source);p.outside.push(partner);
 p.apCards[1].ready=true;
 s=withTtgDerivedEnergy(s,0);
 const play=legalTtgCoreActions(s).find(a=>a.type==='play'&&a.handUid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'013 must be a legal 0-energy AP1 hand play');
 s=dispatchTtgCoreAction(s,play);
 assert.equal(s.pending?.kind,'ttgGreenEntry');
 const revival=legalTtgCoreActions(s).find(a=>a.mode==='partnerRecover'&&
  a.takeUid===partner.uid&&a.apUid===s.players[0].apCards[1].uid&&a.line==='front'&&a.slot===1);
 assert.ok(revival,'012/013 engine must expose a player choice rather than auto-return');
 s=dispatchTtgCoreAction(s,revival);
 assert.equal(s.players[0].front[1].uid,partner.uid);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.players[0].apCards[1].ready,false,'chosen extra AP was actually paid');
 assert.equal(greenTtgCurrentBp(s,0,s.players[0].front[0]),2500,'own Gimmy activates 013 +1000BP');
 assert.equal(s.players[0].outside.some(c=>c.uid===partner.uid),false);
 assert.ok(assertTtgCoreState(s));
});
test('TTG-1-013: declining the optional extra AP/revival preserves outside and AP state',()=>{
 let s=game(1302),p=s.players[0];
 const source=stage(s,'TTG-1-013','front',0),partner=take(p,'TTG-1-007');
 p.outside.push(partner);p.apCards[1].ready=true;
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:source.uid};
 s=withTtgDerivedEnergy(s,0);
 const before=s.players[0].apCards.map(c=>c.ready);
 const result=withTtgDerivedEnergy(resolveTtgGreenEntry(s,{player:0,sourceUid:source.uid,mode:'partnerRecover'}),0);
 assert.deepEqual(result.players[0].apCards.map(c=>c.ready),before);
 assert.ok(result.players[0].outside.some(c=>c.uid===partner.uid));
 assert.equal(result.players[0].front[1],null);
 assert.ok(assertTtgCoreState(result));
});
test('TTG-1-014: only ORIGINAL printed requirement <=1 counts; temporary zero must not make 012 bounceable',()=>{
 let s=game(1401),p=s.players[0];
 const nia=stage(s,'TTG-1-014','front',0);
 const simon=stage(s,'TTG-1-012','front',1);
 simon.energy=0; // Simulate a misleading temporary cost; printed 012 cost is six.
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:nia.uid};
 s=withTtgDerivedEnergy(s,0);
 assert.equal(TTG_BY_ID[simon.cardId].energy,6);
 const legal=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:nia.uid})[0];
 assert.deepEqual(legal.candidateUids,[]);
 assert.equal(legal.selfIfEmpty,true,'014 MUST return itself when no legal other character');
 const after=withTtgDerivedEnergy(resolveTtgGreenEntry(s,{player:0,sourceUid:nia.uid,mode:'mandatoryBounce'}),0);
 assert.ok(after.players[0].hand.some(c=>c.uid===nia.uid));
 assert.equal(after.players[0].front[0],null);
 assert.equal(after.players[0].front[1].uid,simon.uid);
 assert.ok(assertTtgCoreState(after));
});
test('TTG-1-014: a printed zero-energy ally is mandatory legal even if a runtime field says 99',()=>{
 let s=game(1402);
 const nia=stage(s,'TTG-1-014','front',0);
 const cheap=stage(s,'TTG-1-005','energy',0);
 cheap.energy=99;
 s.pending={kind:'ttgGreenEntry',player:0,sourceUid:nia.uid};
 s=withTtgDerivedEnergy(s,0);
 const legal=legalTtgGreenEntryDecisions(s,{player:0,sourceUid:nia.uid})[0];
 assert.deepEqual(legal.candidateUids,[cheap.uid]);
 assert.equal(legal.selfIfEmpty,false);
 const after=withTtgDerivedEnergy(resolveTtgGreenEntry(s,{player:0,sourceUid:nia.uid,mode:'mandatoryBounce',returnUid:cheap.uid}),0);
 assert.ok(after.players[0].hand.some(c=>c.uid===cheap.uid));
 assert.equal(after.players[0].energy[0],null);
 assert.equal(after.players[0].front[0].uid,nia.uid);
 assert.ok(assertTtgCoreState(after));
});
