import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {canTtgGreen028Attack,resolveTtgGreen028Start} from '../dist/ttg-green-028.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';

// Japanese official UA56BT:
// 027 7-green SR: Q2273 own facedown identity is private; Q2393 stacked 029->027.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-027
// 028 Raid: obligatory entry DRAW and optional enemy attack ban through own next start.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-028
// 029 Raid: conditional Front-only sideline recovery, at 6+ may REST-play, then trigger that card's entry.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-029
const counts=Object.fromEntries([
 ...['004','005','006','009','012','026','027','028','029','032','034'].map(n=>['TTG-1-'+n,4]),
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
 const c=take(s.players[p],id);c.ready=true;s.players[p][line][slot]=c;return c;
}
const action=(s,match)=>{const a=legalTtgCoreActions(s).find(match);assert.ok(a,'Missing legal option');return a;};
test('027 official Q2393: upgrade an actual already-Raid 029, preserving Simon base and exactly one new facedown physical top',()=>{
 let s=game(2701),p=s.players[0];
 const prev=take(p,'TTG-1-029'),base=take(p,'TTG-1-009'),under=take(p,'TTG-1-005');
 p.front[0]={...prev,ready:true,stack:[base],under:[{...under,faceDown:true}],raidedTurn:s.turn-1};
 const hand=take(p,'TTG-1-027');p.hand.push(hand);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 stage(s,'TTG-1-005','energy',3);
 s=withTtgDerivedEnergy(s,0);
 const before=s.players[0].apCards.map(a=>a.ready);
 const raid=action(s,a=>a.type==='greenHighRaid'&&a.raidKind==='chain'&&a.cardId==='TTG-1-027'&&a.sourceUid===prev.uid);
 s=dispatchTtgCoreAction(s,{...raid,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.pending?.kind,'greenHighRaidQueue');
 assert.deepEqual(s.pending.remaining,['entry027']);
 assert.equal(s.players[0].front[0].uid,hand.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.deepEqual(s.players[0].front[0].under.map(c=>c.uid),[under.uid,prev.uid]);
 assert.ok(s.players[0].front[0].under.every(c=>c.faceDown));
 assert.equal(s.players[0].apCards[0].ready,false,'selected AP was physically paid');
 assert.equal(s.players[0].apCards[1].ready,before[1],'unselected AP stays unchanged');
 const entry=action(s,a=>a.step==='entry027'&&a.targetUid==null&&a.apUid==null);
 s=dispatchTtgCoreAction(s,entry);
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('027 at 3+ facedown: player chooses which AP to ready and legal opponent BP<=5000 to retire',()=>{
 let s=game(2702),p=s.players[0],op=s.players[1];
 const prev=take(p,'TTG-1-029'),base=take(p,'TTG-1-009');
 const u1=take(p,'TTG-1-005'),u2=take(p,'TTG-1-006');
 p.front[0]={...prev,ready:true,stack:[base],under:[{...u1,faceDown:true},{...u2,faceDown:true}],raidedTurn:s.turn-1};
 const hand=take(p,'TTG-1-027');p.hand.push(hand);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 stage(s,'TTG-1-005','energy',3);
 const foe=stage(s,'TTG-1-006','front',0,1);
 s=withTtgDerivedEnergy(s,0);
 const raid=action(s,a=>a.type==='greenHighRaid'&&a.raidKind==='chain'&&a.cardId==='TTG-1-027');
 s=dispatchTtgCoreAction(s,{...raid,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.players[0].front[0].under.filter(c=>c.faceDown).length,3);
 const chosen=action(s,a=>a.step==='entry027'&&a.targetUid===foe.uid&&a.apUid===s.players[0].apCards[0].uid);
 s=dispatchTtgCoreAction(s,chosen);
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.ok(assertTtgCoreState(s));
});
test('028 hand Raid: mandatory physical draw after optional suppression; target never suppresses enemy energy-line cards',()=>{
 let s=game(2801),p=s.players[0];
 const base=stage(s,'TTG-1-009','front',0);
 const enemy=stage(s,'TTG-1-005','front',0,1);
 const enemyEnergy=stage(s,'TTG-1-006','energy',0,1);
 for(let i=0;i<2;i++)stage(s,'TTG-1-017','energy',i);
 const raid=take(p,'TTG-1-028');p.hand.push(raid);
 s=withTtgDerivedEnergy(s,0);
 const originalTop=s.players[0].deck[0].uid;
 const play=action(s,a=>a.type==='ttgGreen028Raid'&&a.baseUid===base.uid&&a.line==='front'&&a.slot===0);
 s=dispatchTtgCoreAction(s,{...play,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.pending?.kind,'ttgGreen028Entry');
 assert.ok(!legalTtgCoreActions(s).some(a=>a.targetUid===enemyEnergy.uid));
 const selected=action(s,a=>a.type==='ttgGreen028Entry'&&a.targetUid===enemy.uid);
 s=dispatchTtgCoreAction(s,selected);
 assert.equal(s.players[0].hand.at(-1).uid,originalTop);
 assert.equal(canTtgGreen028Attack(s,1,s.players[1].front[0]),false);
 const nextOwn=structuredClone(s);nextOwn.players[0].turnCount++;
 const ended=resolveTtgGreen028Start(nextOwn,0);
 assert.equal(canTtgGreen028Attack(ended,1,ended.players[1].front[0]),true);
 assert.ok(assertTtgCoreState(s));
});
test('028 printed optional target may be declined but mandatory DRAW still moves exactly one physical card',()=>{
 let s=game(2802),p=s.players[0];
 const base=stage(s,'TTG-1-009','front',0);
 for(let i=0;i<2;i++)stage(s,'TTG-1-017','energy',i);
 const raid=take(p,'TTG-1-028');p.hand.push(raid);
 s=withTtgDerivedEnergy(s,0);
 const top=s.players[0].deck[0].uid;
 const play=action(s,a=>a.type==='ttgGreen028Raid'&&a.baseUid===base.uid);
 s=dispatchTtgCoreAction(s,{...play,payApUids:[s.players[0].apCards[0].uid]});
 s=dispatchTtgCoreAction(s,action(s,a=>a.type==='ttgGreen028Entry'&&a.targetUid===null));
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===top));
 assert.ok(assertTtgCoreState(s));
});
test('029 -> 026 chained REST-play: 6+ energy from surviving line, then 026 receives its own official entry choice',()=>{
 let s=game(2901),p=s.players[0];
 const base=stage(s,'TTG-1-009','front',0);
 for(let i=0;i<3;i++)stage(s,'TTG-1-017','energy',i);
 const raid=take(p,'TTG-1-029'),rossiu=take(p,'TTG-1-026'),ark=take(p,'TTG-1-033');
 p.hand.push(raid);p.outside.push(rossiu,ark);
 s=withTtgDerivedEnergy(s,0);
 const play=action(s,a=>a.type==='ttgGreen029Raid'&&a.baseUid===base.uid&&a.line==='front');
 s=dispatchTtgCoreAction(s,{...play,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.pending?.kind,'ttgGreen029Entry');
 const recover=action(s,a=>a.type==='ttgGreen029Entry'&&a.mode==='restPlay'&&a.outsideUid===rossiu.uid&&a.line==='energy'&&a.slot===3);
 s=dispatchTtgCoreAction(s,recover);
 assert.equal(s.players[0].energy[3].uid,rossiu.uid);
 assert.equal(s.players[0].energy[3].ready,false);
 assert.equal(s.pending?.kind,'ttgGreenEntry');
 const choose=action(s,a=>a.type==='resolveGreenEntry'&&a.mode==='arkOutside'&&a.takeUid===ark.uid);
 s=dispatchTtgCoreAction(s,choose);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===ark.uid));
 assert.ok(!s.players[0].outside.some(c=>c.uid===ark.uid));
 assert.ok(assertTtgCoreState(s));
});
test('027 RAID LIFE may be declined under Q99 or moved to hand without falsely paying AP',()=>{
 let s=game(2703),p=s.players[0];
 const raid=take(p,'TTG-1-027');
 const old=p.life.shift();p.deck.push(old);p.life.unshift(raid);
 s=withTtgDerivedEnergy(s,0);
 s=beginTtgLifeTrigger(s,{player:0,lifeUid:raid.uid});
 assert.equal(s.pendingTtgLife?.trigger,'raid');
 const choices=legalTtgCoreActions(s);
 assert.ok(choices.some(a=>a.mode==='decline'));
 assert.ok(choices.some(a=>a.mode==='raidHand'));
 const initialAP=s.players[0].apCards.map(a=>a.ready);
 const skip=dispatchTtgCoreAction(s,action(s,a=>a.mode==='decline'));
 assert.ok(skip.players[0].outside.some(c=>c.uid===raid.uid));
 assert.deepEqual(skip.players[0].apCards.map(a=>a.ready),initialAP);
 const hand=dispatchTtgCoreAction(s,action(s,a=>a.mode==='raidHand'));
 assert.ok(hand.players[0].hand.some(c=>c.uid===raid.uid));
 assert.ok(!hand.players[0].outside.some(c=>c.uid===raid.uid));
 assert.deepEqual(hand.players[0].apCards.map(a=>a.ready),initialAP);
 assert.ok(assertTtgCoreState(skip));
 assert.ok(assertTtgCoreState(hand));
});
