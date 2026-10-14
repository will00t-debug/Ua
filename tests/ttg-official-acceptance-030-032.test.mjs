import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {sidelineGreen030} from '../dist/ttg-green-030.mjs';
import {greenHighRaidCombatValue,expireGreen031AtOwnStart} from '../dist/ttg-green-high-raid.mjs';
// Japanese official UA56BT/TTG-1-030, 031 (Q2274-2277, Q2394), 032 (Q2278-2279, Q2395).
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-030
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-031
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-032
const counts=Object.fromEntries([
 ...['004','005','006','009','012','027','029','030','031','032','034'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-017',3],['TTG-1-033',1],['TTG-1-011',2]
]);
function game(seed){
 const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});s.phase='main';
 s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(pl,id){
 for(const zone of ['hand','deck','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function stage(s,id,line='energy',slot=0,p=0){
 const c=take(s.players[p],id);c.ready=true;
 s.players[p][line][slot]=c;return c;
}
const legal=(s,fn)=>{const a=legalTtgCoreActions(s).find(fn);assert.ok(a,'Expected legal official action');return a;};
const energy=s=>calculateTtgEnergyByColor(s,0).green;
test('030: actual Kittan Raid and on-retirement base recovers in REST at 4 energy, keeping both cards',()=>{
 let s=game(3001),p=s.players[0];
 const base=stage(s,'TTG-1-006','front',0);
 stage(s,'TTG-1-017','energy',0);stage(s,'TTG-1-017','energy',1);
 const raid=take(p,'TTG-1-030');p.hand.push(raid);
 s=withTtgDerivedEnergy(s,0);
 const act=legal(s,a=>a.type==='green030Raid'&&a.handUid===raid.uid&&a.baseUid===base.uid&&a.line==='front');
 s=dispatchTtgCoreAction(s,{...act,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 const retired=sidelineGreen030(s,{player:0,uid:raid.uid});
 assert.equal(retired.pending?.kind,'green030Sidelined');
 assert.ok(retired.players[0].outside.some(c=>c.uid===raid.uid));
 const a=legal(retired,x=>x.type==='green030Recover'&&x.mode==='recover'&&x.baseUid===base.uid&&x.line==='front'&&x.slot===1);
 const done=dispatchTtgCoreAction(retired,a);
 assert.equal(done.players[0].front[1].uid,base.uid);
 assert.equal(done.players[0].front[1].ready,false);
 assert.ok(done.players[0].outside.some(c=>c.uid===raid.uid));
 assert.ok(assertTtgCoreState(done));
});
test('030: at 6 energy a selected Kittan base returns ACTIVE; declining preserves both outside',()=>{
 let s=game(3002),p=s.players[0],base=stage(s,'TTG-1-006','front',0);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 const raid=take(p,'TTG-1-030');p.hand.push(raid);
 s=withTtgDerivedEnergy(s,0);
 const a=legal(s,x=>x.type==='green030Raid'&&x.baseUid===base.uid);
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 const pending=sidelineGreen030(s,{player:0,uid:raid.uid});
 const skipped=dispatchTtgCoreAction(pending,legal(pending,x=>x.type==='green030Recover'&&x.mode==='decline'));
 assert.ok(skipped.players[0].outside.some(c=>c.uid===base.uid));
 const recovered=dispatchTtgCoreAction(pending,legal(pending,x=>x.type==='green030Recover'&&x.mode==='recover'&&x.baseUid===base.uid&&x.line==='front'&&x.slot===1));
 assert.equal(recovered.players[0].front[1].ready,true);
 assert.ok(assertTtgCoreState(skipped));assert.ok(assertTtgCoreState(recovered));
});
test('031 Q2274-2276: real Raid at 20+ grants +5000, target immunity and physical AP ready; expires own next turn',()=>{
 let s=game(3101),p=s.players[0],base=stage(s,'TTG-1-009','front',0);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 p.energyDoublings=2; // 6 x4 = 24, legitimate threshold interaction with existing 012/040.
 const raid=take(p,'TTG-1-031');p.hand.push(raid);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(energy(s)>=20);
 const a=legal(s,x=>x.type==='greenHighRaid'&&x.cardId==='TTG-1-031'&&x.sourceUid===base.uid&&x.raidKind==='base');
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.pending?.kind,'greenHighRaidQueue');
 const entry=legal(s,x=>x.type==='greenHighEffect'&&x.step==='entry031'&&x.apUid===s.players[0].apCards[0].uid);
 s=dispatchTtgCoreAction(s,entry);
 assert.equal(s.pending,null);
 const top=s.players[0].front[0];
 assert.equal(top.uid,raid.uid);
 assert.equal(top.protectedFromEffects,true);
 assert.equal(top.currentBp,TTG_BY_ID['TTG-1-031'].bp+5000);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.ok(s.players[0].green031UsedTurn===s.turn);
 const ownNext=structuredClone(s);ownNext.players[0].turnCount++;
 const expired=expireGreen031AtOwnStart(ownNext,0);
 assert.equal(expired.players[0].front[0].protectedFromEffects,undefined);
 assert.ok(assertTtgCoreState(s));
});
test('031 energy >=50: public AP refresh + exactly two physical deck draws (not multiplied by energy)',()=>{
 let s=game(3102),p=s.players[0],base=stage(s,'TTG-1-009','front',0);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 stage(s,'TTG-1-005','energy',3);
 p.energyDoublings=3; // 7 x8 = 56.
 const raid=take(p,'TTG-1-031');p.hand.push(raid);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(energy(s)>=50);
 const original=s.players[0].deck.slice(0,2).map(c=>c.uid),handBefore=s.players[0].hand.length;
 const a=legal(s,x=>x.type==='greenHighRaid'&&x.cardId==='TTG-1-031'&&x.sourceUid===base.uid);
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 const entry=legal(s,x=>x.type==='greenHighEffect'&&x.step==='entry031'&&x.apUid===s.players[0].apCards[0].uid);
 s=dispatchTtgCoreAction(s,entry);
 assert.equal(s.players[0].hand.length,handBefore-1+2);
 assert.deepEqual(s.players[0].hand.slice(-2).map(c=>c.uid),original);
 assert.ok(assertTtgCoreState(s));
});
test('032 Q2395: refuses same-turn Super-Galaxy base; previous-turn upgrade at 100 energy may absorb other front cards',()=>{
 let s=game(3201),p=s.players[0];
 const superCard=take(p,'TTG-1-031'),simon=take(p,'TTG-1-009'),under=take(p,'TTG-1-027');
 p.front[0]={...superCard,ready:true,stack:[simon],under:[{...under,faceDown:true}],raidedTurn:s.turn};
 const ally=stage(s,'TTG-1-006','front',1);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 stage(s,'TTG-1-005','energy',3);
 p.energyDoublings=4; // printed base 7 *16 =112.
 const ultimate=take(p,'TTG-1-032');p.hand.push(ultimate);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(energy(s)>=100);
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='greenHighRaid'&&a.cardId==='TTG-1-032'),false);
 s.players[0].front[0].raidedTurn=s.turn-1;
 const possible=legalTtgCoreActions(s).filter(a=>a.type==='greenHighRaid'&&a.cardId==='TTG-1-032');
 assert.ok(possible.some(a=>a.raidKind==='chain'&&a.sourceUid===superCard.uid));
 assert.ok(!possible.some(a=>a.raidKind==='base'));
 const a=possible.find(x=>x.raidKind==='chain'&&x.line==='front'&&x.slot===0);
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.pending?.kind,'greenHighRaidQueue');
 const absorb=legal(s,x=>x.step==='entry032'&&x.takeUids?.length===1&&x.takeUids[0]===ally.uid);
 s=dispatchTtgCoreAction(s,absorb);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[1],null);
 assert.equal(s.players[0].front[0].uid,ultimate.uid);
 assert.equal(s.players[0].front[0].protectedFromEffects,true);
 assert.ok(s.players[0].front[0].under.some(c=>c.uid===ally.uid&&c.faceDown));
 assert.equal(greenHighRaidCombatValue(s,0,s.players[0].front[0]).impact,4);
 assert.equal(greenHighRaidCombatValue(s,0,s.players[0].front[0]).damage,7);
 assert.ok(assertTtgCoreState(s));
});
