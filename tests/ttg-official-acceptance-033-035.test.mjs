import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {legalGreen033AfterRaid,beginGreen034Sidelined} from '../dist/ttg-green-fields.mjs';
import {inspectFacedownUnder} from '../dist/ttg-rules.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Japan official:
// TTG-1-033 Q2280 once per NAME, Q2281 facedown visibility
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-033
// TTG-1-034 Q2282 privacy, once/turn capture and under-card energy
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-034
// TTG-1-035 normal event REMOVED; printed SPECIAL life trigger OUTSIDE
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-035
const counts=Object.fromEntries([
 ...['004','005','006','009','012','027','029','030','031','032','034'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-017',2],['TTG-1-033',2],['TTG-1-011',3],['TTG-1-032',3],['TTG-1-034',3],['TTG-1-035',1]
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
const action=(s,predicate)=>{const a=legalTtgCoreActions(s).find(predicate);assert.ok(a,'Expected legal printed choice');return a;};
test('033 Q2280: two Arch-Gurren sites share single activation; attachment draws two exact cards and keeps other site',()=>{
 let s=game(3301),p=s.players[0];
 const simon=stage(s,'TTG-1-009','front',0),one=stage(s,'TTG-1-033','energy',0),two=stage(s,'TTG-1-033','energy',1);
 stage(s,'TTG-1-017','energy',2);stage(s,'TTG-1-017','energy',3);
 const raider=take(p,'TTG-1-027');p.hand.push(raider);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(calculateTtgEnergyByColor(s,0).green>=7);
 const next=action(s,a=>a.type==='greenHighRaid'&&a.cardId==='TTG-1-027'&&a.sourceUid===simon.uid&&a.raidKind==='base');
 s=dispatchTtgCoreAction(s,{...next,payApUids:[s.players[0].apCards[0].uid]});
 const top2=s.players[0].deck.slice(0,2).map(c=>c.uid);
 assert.equal(s.pending?.kind,'greenHighRaidQueue');
 const site=action(s,a=>a.type==='greenHighEffect'&&a.step==='site033'&&a.siteUid===one.uid);
 s=dispatchTtgCoreAction(s,site);
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.players[0].energy[1].uid,two.uid);
 assert.deepEqual(s.players[0].hand.slice(-2).map(c=>c.uid),top2);
 assert.ok(s.players[0].front[0].under.some(c=>c.uid===one.uid&&c.faceDown));
 assert.equal(s.players[0].green033UsedTurn,s.turn);
 assert.deepEqual(legalGreen033AfterRaid({...s,pending:{kind:'green033RaidOrder'}},{player:0,raidUid:raider.uid}),[],
  'cannot use remaining second site this turn Q2280');
 const raid=s.players[0].front[0];
 assert.equal(inspectFacedownUnder(raid,{viewer:0,owner:0})[0].uid,one.uid);
 assert.deepEqual(inspectFacedownUnder(raid,{viewer:1,owner:0}),[{faceDown:true}]);
 s=dispatchTtgCoreAction(s,action(s,a=>a.type==='greenHighEffect'&&a.step==='entry027'&&a.targetUid==null));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('034: once-per-turn capture one retired character FACE DOWN under site, adds one green then bars repeat',()=>{
 let s=game(3401),p=s.players[0],site=stage(s,'TTG-1-034','energy',0);
 const retired=take(p,'TTG-1-006');p.outside.push(retired);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,2);
 s=beginGreen034Sidelined(s,{player:0,retiredUid:retired.uid});
 assert.equal(s.pending?.kind,'green034Sidelined');
 const captured=action(s,a=>a.type==='green034Capture'&&a.siteUid===site.uid);
 s=dispatchTtgCoreAction(s,captured);
 assert.equal(s.players[0].energy[0].under[0].uid,retired.uid);
 assert.equal(s.players[0].energy[0].under[0].faceDown,true);
 assert.equal(s.players[0].outside.some(c=>c.uid===retired.uid),false);
 assert.equal(calculateTtgEnergyByColor(s,0).green,3);
 const next=take(s.players[0],'TTG-1-005');s.players[0].outside.push(next);
 const skipped=beginGreen034Sidelined(s,{player:0,retiredUid:next.uid});
 assert.equal(skipped.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('035: without Simon enemy BP4000 is ineligible; with a Raid base Simon BP<=5000 is removable with its physical stack',()=>{
 let s=game(3501),p=s.players[0],op=s.players[1];
 const raid=take(op,'TTG-1-029'),base=take(op,'TTG-1-009');
 op.front[0]={...raid,ready:true,stack:[base],under:[]};
 const low=stage(s,'TTG-1-006','front',1,1);
 stage(s,'TTG-1-017','energy',0);stage(s,'TTG-1-017','energy',1);
 stage(s,'TTG-1-005','energy',2);
 const event=take(p,'TTG-1-035');p.hand.push(event);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='playGreenEvent'&&a.targetUid===raid.uid));
 assert.ok(legalTtgCoreActions(s).some(a=>a.type==='playGreenEvent'&&a.targetUid===low.uid));
 const simon=stage(s,'TTG-1-009','front',0);
 s=withTtgDerivedEnergy(s,0);
 const usable=action(s,a=>a.type==='playGreenEvent'&&a.cardId==='TTG-1-035'&&a.targetUid===raid.uid);
 const already=s.players[1].outside.length;
 s=dispatchTtgCoreAction(s,{...usable,payApUids:[s.players[0].apCards[0].uid]});
 assert.equal(s.players[1].front[0],null);
 assert.ok(s.players[1].removed.some(c=>c.uid===raid.uid));
 assert.ok(s.players[1].removed.some(c=>c.uid===base.uid));
 assert.equal(s.players[1].outside.length,already,'REMOVED is NOT the sideboard');
 assert.equal(s.players[1].front[1].uid,low.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 assert.ok(assertTtgCoreState(s));
});
test('035 SPECIAL life trigger sends target Raid to OUTSIDE, not REMOVED, and may be declined Q99',()=>{
 let s=game(3502),p=s.players[0],op=s.players[1];
 const event=take(p,'TTG-1-035'),oldLife=p.life.shift();p.deck.push(oldLife);p.life.unshift(event);
 const target=take(op,'TTG-1-029'),base=take(op,'TTG-1-009');
 op.front[0]={...target,ready:true,stack:[base],under:[]};
 s=withTtgDerivedEnergy(s,0);
 s=beginTtgLifeTrigger(s,{player:0,lifeUid:event.uid});
 assert.ok(legalTtgCoreActions(s).some(a=>a.mode==='decline'));
 const skipped=dispatchTtgCoreAction(s,action(s,a=>a.mode==='decline'));
 assert.equal(skipped.players[1].front[0].uid,target.uid);
 const triggered=dispatchTtgCoreAction(s,action(s,a=>a.mode==='special'&&a.targetUid===target.uid));
 assert.equal(triggered.players[1].front[0],null);
 assert.ok(triggered.players[1].outside.some(c=>c.uid===target.uid));
 assert.ok(triggered.players[1].outside.some(c=>c.uid===base.uid));
 assert.ok(!triggered.players[1].removed.some(c=>c.uid===target.uid));
 assert.ok(assertTtgCoreState(skipped));assert.ok(assertTtgCoreState(triggered));
});
