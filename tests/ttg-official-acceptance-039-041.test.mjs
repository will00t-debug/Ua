import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {greenTtgCurrentBp} from '../dist/ttg-green-passives.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Japanese official 039 IMPACT event, 040 Q2283 energy doubling stacks multiplicatively,
// 041 Q2284 each selected distinct-NAME Dai-Gurren member receives selectedCount x1000 BP.
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-039
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-040
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-041
const counts=Object.fromEntries([
 ...['004','005','006','009','012','027','029','030','031','032','034'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-039',2],['TTG-1-040',2],['TTG-1-041',2]
]);
function game(seed){
 const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(p,id){
 for(const zone of ['hand','deck','life','outside']){
  const i=p[zone].findIndex(x=>x.cardId===id);
  if(i>=0)return p[zone].splice(i,1)[0];
 }
 throw Error('No physical '+id);
}
function stage(s,id,line='energy',slot=0,p=0){
 const c=take(s.players[p],id);c.ready=true;s.players[p][line][slot]=c;return c;
}
function withEnergy(s,n=9){
 const a=stage(s,'TTG-1-005','energy',0);
 a.energyBonus=n-1;
 return withTtgDerivedEnergy(s,0);
}
const offered=(s,fn)=>{const x=legalTtgCoreActions(s).find(fn);assert.ok(x,'Expected legal exact action');return x;};
const useEvent=(s,id,fn=()=>true)=>{
 const a=offered(s,x=>x.type==='playGreenEvent'&&x.cardId===id&&fn(x));
 return dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards.find(x=>x.ready).uid]});
};
test('039: player selects own Simon, receives highest own CHARACTER BP and IMPACT 1 until end of turn',()=>{
 let s=game(3901),p=s.players[0];
 const simon=stage(s,'TTG-1-009','front',0),strong=stage(s,'TTG-1-027','front',1);
 const event=take(p,'TTG-1-039');p.hand.push(event);
 s=withEnergy(s,6);
 const granted=greenTtgCurrentBp(s,0,strong);
 const before=greenTtgCurrentBp(s,0,s.players[0].front[0]);
 s=useEvent(s,'TTG-1-039',a=>a.targetUid===simon.uid);
 assert.equal(s.players[0].front[0].currentBp,before+granted);
 assert.equal(s.players[0].front[0].greenEventImpact,1);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));
 assert.ok(assertTtgCoreState(s));
 const next=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(next.phase,'attack');
 const ended=dispatchTtgCoreAction(next,{type:'next'});
 assert.equal(ended.players[0].front[0].greenEventImpact,0);
 assert.ok(assertTtgCoreState(ended));
});
test('039 cannot grant normal-event Impact or BP to enemy, energy line event, or unqualified own card',()=>{
 let s=game(3902),p=s.players[0];
 const qualified=stage(s,'TTG-1-009','front',0),unqualified=stage(s,'TTG-1-005','front',1);
 const enemy=stage(s,'TTG-1-006','front',0,1);
 const event=take(p,'TTG-1-039');p.hand.push(event);
 s=withEnergy(s,6);
 assert.ok(legalTtgCoreActions(s).some(x=>x.type==='playGreenEvent'&&x.targetUid===qualified.uid));
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='playGreenEvent'&&x.targetUid===unqualified.uid));
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='playGreenEvent'&&x.targetUid===enemy.uid));
 const original=JSON.stringify(s);
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'playGreenEvent',handUid:event.uid,cardId:'TTG-1-039',targetUid:enemy.uid,payApUids:[p.apCards[0].uid]}));
 assert.equal(JSON.stringify(s),original);
});
test('040 official Q2283: a preexisting x2 multiplied by removed-area x2 is x4, later +1 production is also x4',()=>{
 let s=game(4001),p=s.players[0];
 const event=take(p,'TTG-1-040');p.hand.push(event);
 s=withEnergy(s,8);
 p=s.players[0];p.energyDoublings=1;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,16);
 const oldTop=s.players[0].deck.slice(0,2).map(c=>c.uid);
 s=useEvent(s,'TTG-1-040');
 assert.ok(s.players[0].removed.some(c=>c.uid===event.uid));
 assert.deepEqual(s.players[0].hand.slice(-2).map(c=>c.uid),oldTop);
 assert.equal(s.players[0].frontGeneratesAll,true);
 assert.equal(calculateTtgEnergyByColor(s,0).green,16);
 const double=offered(s,x=>x.type==='green040Double'&&x.uid===event.uid);
 s=dispatchTtgCoreAction(s,double);
 assert.equal(calculateTtgEnergyByColor(s,0).green,32);
 assert.equal(legalTtgCoreActions(s).filter(x=>x.type==='green040Double').length,0);
 s.players[0].energy[0].energyBonus++;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).green,36,'Q2283 and Q2265 multiply later production');
 assert.ok(assertTtgCoreState(s));
});
test('040 hand event is usable only once per turn, second physical copy cannot be played again',()=>{
 let s=game(4002),p=s.players[0];
 const a=take(p,'TTG-1-040'),b=take(p,'TTG-1-040');p.hand.push(a,b);
 s=withEnergy(s,9);
 s=useEvent(s,'TTG-1-040',x=>x.handUid===a.uid);
 s.players[0].apCards[1].ready=true;
 s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='playGreenEvent'&&x.cardId==='TTG-1-040'&&x.handUid===b.uid));
 assert.ok(s.players[0].hand.some(x=>x.uid===b.uid));
 assert.ok(assertTtgCoreState(s));
});
test('041 official Q2284: choose three distinct CHARACTER names and every one gains 3000 BP',()=>{
 let s=game(4101),p=s.players[0];
 const simon=stage(s,'TTG-1-009','front',0),kittan=stage(s,'TTG-1-005','front',1);
 const arc=stage(s,'TTG-1-027','front',2),sameName=stage(s,'TTG-1-006','front',3);
 const event=take(p,'TTG-1-041');p.hand.push(event);
 s=withEnergy(s,5);
 const chosen=[simon.uid,kittan.uid,arc.uid];
 const opts=legalTtgCoreActions(s).filter(x=>x.type==='playGreenEvent'&&x.cardId==='TTG-1-041');
 assert.ok(!opts.some(x=>x.targetUids?.includes(kittan.uid)&&x.targetUids?.includes(sameName.uid)),'Kittan duplicates in printed NAME');
 const a=offered(s,x=>x.type==='playGreenEvent'&&x.cardId==='TTG-1-041'&&
    chosen.every(uid=>x.targetUids?.includes(uid))&&x.targetUids.length===3);
 s=dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[0].uid]});
 for(const id of chosen){
  const c=s.players[0].front.find(x=>x.uid===id);
  assert.equal(c.currentBp,TTG_BY_ID[c.cardId].bp+3000);
 }
 assert.equal(s.players[0].front[3].currentBp,undefined);
 assert.ok(assertTtgCoreState(s));
});
test('039 and 041 ACTIVE life triggers can be DECLINED or choose own character for +3000',()=>{
 for(const [id,seed] of [['TTG-1-039',3903],['TTG-1-041',4103]]){
  let s=game(seed),p=s.players[0];
  const character=stage(s,'TTG-1-005','front',0);
  character.ready=false;
  const life=take(p,id),prior=p.life.shift();p.deck.push(prior);p.life.unshift(life);
  s=withTtgDerivedEnergy(s,0);
  const pending=beginTtgLifeTrigger(s,{player:0,lifeUid:life.uid});
  const options=legalTtgCoreActions(pending);
  assert.ok(options.some(x=>x.mode==='decline'));
  const accepted=dispatchTtgCoreAction(pending,options.find(x=>x.mode==='active'&&x.targetUid===character.uid));
  assert.equal(accepted.players[0].front[0].ready,true);
  assert.equal(accepted.players[0].front[0].currentBp,TTG_BY_ID[character.cardId].bp+3000);
  const denied=dispatchTtgCoreAction(pending,options.find(x=>x.mode==='decline'));
  assert.equal(denied.players[0].front[0].ready,false);
  assert.ok(assertTtgCoreState(accepted));assert.ok(assertTtgCoreState(denied));
 }
});
