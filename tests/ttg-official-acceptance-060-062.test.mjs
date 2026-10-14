import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Japanese printed UA56BT/TTG-1-060, 061 Q2293/Q2294, 062.
// 061 deck<=20 resolves first printed option (recover Simon) then second (play Simon),
// NEVER both repeated; newly ACTIVE Simon ENTRY triggers still resolve.
// 062 can retrigger a legitimate printed Simon ENTRY without new card/AP payment.
const counts=Object.fromEntries([
 ...['043','047','051','052','053','054','055','056','059','060','061','062'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const game=seed=>{const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;};
function take(pl,id){
 for(const z of ['hand','deck','life','outside']){
  const i=pl[z].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[z].splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function stage(s,id,line='energy',slot=0){
 const c=take(s.players[0],id);c.ready=true;s.players[0][line][slot]=c;return c;
}
function select(s,fn){
 const action=legalTtgCoreActions(s).find(fn);
 assert.ok(action,'Missing legal choice ('+s.pending?.kind+')');return action;
}
function keepDeck(s,n=20){
 const p=s.players[0];if(p.deck.length<n)throw Error('Need enough deck cards');
 p.outside.push(...p.deck.splice(n));
 return withTtgDerivedEnergy(s,0);
}
test('060 dynamic RED +1 requires own FRONT Simon or Simon RAID base, not Simon only in energy',()=>{
 let s=game(6001),nia=stage(s,'TTG-1-060','energy',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,1);
 const sim=stage(s,'TTG-1-051','energy',1);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2,'energy-line Simon does not trigger bonus');
 s.players[0].energy[1]=null;s.players[0].front[0]=sim;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2,'Nia bonus replaces moved Simon production');
 s.players[0].front[0].stack=[take(s.players[0],'TTG-1-052')];
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2);
 s.players[0].energy[0].ready=false;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2,'no ACTIVE condition on 060');
 assert.ok(assertTtgCoreState(s));
});
test('061 Q2293/Q2294: true AP2 hand entry at deck20 forces recover THEN ACTIVE deploy and follows Simon ENTRY',()=>{
 let s=game(6101),p=s.players[0];
 const generator=stage(s,'TTG-1-051','energy',0);generator.energyBonus=2;
 const nia=take(p,'TTG-1-061'),old=take(p,'TTG-1-052'),deployed=take(p,'TTG-1-052');
 p.hand.push(nia,deployed);p.outside.push(old);
 s=keepDeck(s);
 const apBefore=s.players[0].apCards.filter(a=>a.ready).length;
 s=dispatchTtgCoreAction(s,select(s,a=>a.type==='play'&&a.handUid===nia.uid&&a.line==='energy'&&a.slot===1));
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,apBefore-2);
 assert.equal(s.pending?.kind,'ttgRed061');
 assert.equal(s.pending?.step,'recover');
 assert.ok(legalTtgCoreActions(s).every(a=>a.mode==='recover'));
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'ttgRed061Choice',player:0,uid:nia.uid,mode:'deploy',handUid:deployed.uid,line:'front',slot:0}),/Illegal/);
 s=dispatchTtgCoreAction(s,select(s,a=>a.mode==='recover'&&a.recoverUid===old.uid));
 assert.equal(s.pending?.step,'deploy');
 assert.ok(s.players[0].hand.some(c=>c.uid===old.uid));
 assert.ok(legalTtgCoreActions(s).every(a=>a.mode==='deploy'));
 s=dispatchTtgCoreAction(s,select(s,a=>a.mode==='deploy'&&a.handUid===deployed.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.players[0].front[0].uid,deployed.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.pending?.kind,'ttgRed052Discard','the newly entered Simon ENTRY cannot be silently skipped');
 s=dispatchTtgCoreAction(s,select(s,a=>a.type==='ttgRed052Discard'&&a.discardUid===null));
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].uid,deployed.uid);
 assert.ok(assertTtgCoreState(s));
});
test('061 deck21 allows choose ONLY one of two printed modes (not duplicate option)',()=>{
 let s=game(6102),p=s.players[0],gen=stage(s,'TTG-1-051','energy',0);
 gen.energyBonus=2;
 const nia=take(p,'TTG-1-061');p.hand.push(nia);
 s=keepDeck(s,21);
 s=dispatchTtgCoreAction(s,select(s,a=>a.type==='play'&&a.handUid===nia.uid&&a.line==='energy'&&a.slot===1));
 assert.equal(s.pending?.remaining,1);
 assert.ok(legalTtgCoreActions(s).some(a=>a.mode==='recover'));
 assert.ok(legalTtgCoreActions(s).some(a=>a.mode==='deploy'));
 s=dispatchTtgCoreAction(s,select(s,a=>a.mode==='recover'&&a.recoverUid===null));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('062 actual hand entry retriggers existing Simon 052 ENTRY with no AP2 or second deployment',()=>{
 let s=game(6201),p=s.players[0],sim=stage(s,'TTG-1-052','front',0);
 const generator=stage(s,'TTG-1-051','energy',0);generator.energyBonus=2;
 const nia=take(p,'TTG-1-062');p.hand.push(nia);
 s=withTtgDerivedEnergy(s,0);
 const apBefore=p.apCards.filter(c=>c.ready).length,handBefore=p.hand.length;
 s=dispatchTtgCoreAction(s,select(s,a=>a.type==='play'&&a.handUid===nia.uid&&a.line==='energy'&&a.slot===1));
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,apBefore-1);
 assert.equal(s.pending?.kind,'ttgRed062Retrigger');
 s=dispatchTtgCoreAction(s,select(s,a=>a.type==='ttgRed062Retrigger'&&a.targetUid===sim.uid));
 assert.equal(s.pending?.kind,'ttgRed052Discard');
 assert.equal(s.players[0].front[0].uid,sim.uid,'same physical Simon stays in field');
 assert.equal(s.players[0].front[0].enteredTurn,undefined,'retrigger never replays a hand deployment');
 assert.ok(s.players[0].hand.length===handBefore-1);
 s=dispatchTtgCoreAction(s,select(s,a=>a.type==='ttgRed052Discard'&&a.discardUid===null));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('062 at deck20 MAIN REST grants +1000 Simon and optional physical hand discard to ready target',()=>{
 let s=game(6202),p=s.players[0];
 const sim=stage(s,'TTG-1-052','front',0);
 const nia=stage(s,'TTG-1-062','energy',0);nia.ready=true;
 const handUid=p.hand[0].uid;
 sim.ready=false;
 s=keepDeck(s);
 const pAp=s.players[0].apCards.map(x=>x.ready);
 const choice=select(s,a=>a.type==='ttgRed062Main'&&a.uid===nia.uid&&a.targetUid===sim.uid&&a.discardUid===handUid);
 const applied=dispatchTtgCoreAction(s,choice);
 assert.equal(applied.players[0].energy[0].ready,false);
 assert.equal(applied.players[0].front[0].ready,true);
 assert.equal(applied.players[0].front[0].currentBp,TTG_BY_ID[sim.cardId].bp+1000);
 assert.ok(applied.players[0].outside.some(c=>c.uid===handUid));
 assert.deepEqual(applied.players[0].apCards.map(a=>a.ready),pAp);
 assert.ok(!legalTtgCoreActions(applied).some(a=>a.type==='ttgRed062Main'&&a.uid===nia.uid));
 assert.ok(assertTtgCoreState(applied));
 const optional=dispatchTtgCoreAction(s,select(s,a=>a.type==='ttgRed062Main'&&a.uid===nia.uid&&a.targetUid===sim.uid&&a.discardUid===null));
 assert.equal(optional.players[0].front[0].ready,false);
 assert.equal(optional.players[0].front[0].currentBp,TTG_BY_ID[sim.cardId].bp+1000);
 assert.ok(assertTtgCoreState(optional));
});
test('062 COLOR LIFE is public optional and does not select opponent protected/energy card',()=>{
 let s=game(6203),p=s.players[0];
 const card=take(p,'TTG-1-062'),old=p.life.shift();p.deck.push(old);p.life.unshift(card);
 s=withTtgDerivedEnergy(s,0);
 const pending=beginTtgLifeTrigger(s,{player:0,lifeUid:card.uid});
 assert.equal(pending.pendingTtgLife?.trigger,'color');
 assert.ok(legalTtgCoreActions(pending).some(a=>a.mode==='decline'));
 const declined=dispatchTtgCoreAction(pending,select(pending,a=>a.mode==='decline'));
 assert.equal(declined.publicLifeReveals.at(-1).outcome,'declined');
 assert.ok(assertTtgCoreState(declined));
});
