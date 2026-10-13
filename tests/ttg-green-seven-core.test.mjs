import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,validateTtgCoreDeck,legalTtgCoreActions,dispatchTtgCoreAction,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
const cards=Object.fromEntries([
 ...['004','005','006','009','012','027','028','029','031','032','034'].map(x=>['TTG-1-'+x,4]),
 ['TTG-1-017',3],['TTG-1-033',1],['TTG-1-011',2]
]);
function grab(pl,id){
 for(const zone of ['deck','hand','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw new Error('Missing physical '+id);
}
const match=seed=>newTtgCoreMatch({decks:[cards,cards],seed});
const ids=pl=>[...pl.deck,...pl.hand,...pl.life,...pl.outside,...pl.removed,
 ...pl.front.filter(Boolean),...pl.energy.filter(Boolean)]
 .flatMap(function walk(c){return [c.uid,...(c.stack||[]).flatMap(walk),...(c.under||[]).flatMap(walk)]}).sort();
const after=(s,a)=>dispatchTtgCoreAction(s,a);
test('green high set 004 012 027 031 032 033 034 all register in only restricted 50-card core',()=>{
 assert.deepEqual(validateTtgCoreDeck(cards),[]);
 assert.equal(Object.values(cards).reduce((a,b)=>a+b,0),50);
 assert.ok(Object.keys(cards).every(id=>TTG_BY_ID[id].auto===false));
});
test('core player manually Q2393 chains 029->027, chooses 033 THEN 004 THEN mandatory 027, AP and UID conserved',()=>{
 let s=match(47),p=s.players[0],op=s.players[1];s.phase='main';p.turnCount=2;
 p.front[0]={...grab(p,'TTG-1-029'),ready:true,stack:[grab(p,'TTG-1-009')],under:[],raidedTurn:s.turn-1};
 p.front[1]=grab(p,'TTG-1-004');
 p.energy[0]=grab(p,'TTG-1-017');p.energy[1]=grab(p,'TTG-1-017');p.energy[2]=grab(p,'TTG-1-017');
 p.energy[3]=grab(p,'TTG-1-033');p.hand.push(grab(p,'TTG-1-027'),grab(p,'TTG-1-004'));
 op.front[0]=grab(op,'TTG-1-005');
 s=withTtgDerivedEnergy(s,0);p=s.players[0];
 assert.equal(p.energyProduced.green,7);
 const startIds=ids(p);
 const option=legalTtgCoreActions(s).find(x=>x.type==='greenHighRaid'&&x.cardId==='TTG-1-027'&&x.raidKind==='chain');
 assert.ok(option);
 s=after(s,{...option,payApUids:[p.apCards[0].uid]});
 assert.deepEqual(s.pending.remaining,['viral004','entry027','site033']);
 let opts=legalTtgCoreActions(s);
 s=after(s,opts.find(x=>x.step==='site033'&&x.siteUid));
 assert.equal(s.players[0].front[0].under.filter(x=>x.faceDown).length,2);
 opts=legalTtgCoreActions(s);
 s=after(s,opts.find(x=>x.step==='viral004'&&x.mode==='attach'&&x.zone==='hand'));
 assert.equal(s.players[0].front[0].under.filter(x=>x.faceDown).length,3);
 opts=legalTtgCoreActions(s);
 const target=s.players[1].front[0].uid;
 s=after(s,opts.find(x=>x.step==='entry027'&&x.targetUid===target));
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[0].apCards[0].ready,true,'faceDown>=3 restores AP');
 assert.deepEqual(ids(s.players[0]),startIds);
 assert.ok(assertTtgCoreState(s));
});
test('012 player chooses mandatory hand discard, then doubles energy once per Simon name',()=>{
 let s=match(21),p=s.players[0];s.phase='main';p.turnCount=2;
 p.energy[0]=grab(p,'TTG-1-017');p.energy[1]=grab(p,'TTG-1-017');p.energy[2]=grab(p,'TTG-1-017');
 p.hand.push(grab(p,'TTG-1-012'),grab(p,'TTG-1-005'));
 p.apCards[1].ready=true; // AP2 Simon requires two currently available physical APs
 s=withTtgDerivedEnergy(s,0);p=s.players[0];
 const play=legalTtgCoreActions(s).find(x=>x.type==='green012Play');
 assert.ok(play);
 const pay=p.apCards.filter(x=>x.ready).slice(0,2).map(x=>x.uid);
 s=after(s,{...play,payApUids:pay});
 assert.equal(s.pending.kind,'green012Search');
 const search=legalTtgCoreActions(s)[0];
 s=after(s,{...search,takeUid:null,bottomOrderUids:search.revealed});
 assert.equal(s.pending.kind,'green012Discard');
 const discard=legalTtgCoreActions(s)[0];
 const choose=s.players[0].hand.find(x=>x.cardId==='TTG-1-005');
 s=after(s,{...discard,discardUids:[choose.uid],mode:'readyAP',apUid:pay[0],targetUid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.some(x=>x.uid===pay[0]&&x.ready),true);
 assert.ok(assertTtgCoreState(s));
});
test('032 direct attack DAMAGE7 resolves all seven LIFE cards and their GET/COLOR/RAID triggers in order',()=>{
 let s=match(53),p=s.players[0];s.phase='attack';p.turnCount=3;
 p.front[0]={...grab(p,'TTG-1-032'),ready:true,stack:[grab(p,'TTG-1-009')],under:[
  {...grab(p,'TTG-1-027'),faceDown:true},{...grab(p,'TTG-1-029'),faceDown:true}
 ]};
 s=withTtgDerivedEnergy(s,0);
 const uid=s.players[0].front[0].uid;
 const start=legalTtgCoreActions(s).find(x=>x.type==='attack'&&x.uid===uid);
 assert.ok(start);
 s=after(s,start);
 assert.equal(s.pending.kind,'greenHighAttackWindow');
 s=after(s,legalTtgCoreActions(s).find(x=>x.spendUids.length===0));
 assert.equal(s.pending.kind,'block');
 s=after(s,{type:'block',blockUid:null});
 let count=0;
 while(s.status==='playing'&&count++<100){
  const actions=legalTtgCoreActions(s);
  assert.ok(actions.length,'must have legal response between multiple LIFE triggers');
  const choice=actions.find(x=>x.mode==='raidHand')||actions.find(x=>x.mode==='get')||
    actions.find(x=>x.mode==='decline')||actions[0];
  s=after(s,choice);
 }
 assert.ok(count<100,'damage queue terminated');
 assert.equal(s.status,'finished');
 assert.equal(s.winner,0);
 assert.equal(s.players[1].life.length,0);
 assert.ok(assertTtgCoreState(s));
});
test('032 IMPACT4 deals four LIFE trigger points ONLY when winning character block',()=>{
 let s=match(70),p=s.players[0],op=s.players[1];s.phase='attack';p.turnCount=3;
 p.front[0]={...grab(p,'TTG-1-032'),ready:true,stack:[grab(p,'TTG-1-009')],under:[]};
 op.front[0]={...grab(op,'TTG-1-006'),ready:true}; // 005 has Impact Null and correctly prevents IMPACT4
 s=withTtgDerivedEnergy(s,0);
 const attacker=s.players[0].front[0].uid,blocker=s.players[1].front[0].uid;
 s=after(s,{type:'attack',uid:attacker});
 s=after(s,legalTtgCoreActions(s).find(x=>x.spendUids.length===0));
 s=after(s,{type:'block',blockUid:blocker});
 let n=0;while(s.pendingTtgLife&&n++<30){
  const x=legalTtgCoreActions(s).find(x=>x.mode==='get'||x.mode==='raidHand')||legalTtgCoreActions(s)[0];
  s=after(s,x);
 }
 assert.equal(s.players[1].life.length,3,'four of seven life cards were resolved');
 assert.ok(assertTtgCoreState(s));
});
test('all seven new green cards remain non-website but seeded AI 50-card dual matches complete',()=>{
 for(const seed of [2,17]){
  const start=match(seed);
  const result=runTtgCoreAiMatch(start,{maxSteps:15000});
  assert.equal(result.truncated,false,JSON.stringify({seed,actions:result.actions,turns:result.state.turn}));
  assert.equal(result.state.status,'finished');
  assert.ok([0,1].includes(result.state.winner));
  assert.ok(assertTtgCoreState(result.state));
 }
});
