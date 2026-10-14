import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {red068BpBonus} from '../dist/ttg-red-ninth-three.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Official TTG-1-066, 067 Q2295, 068 Q2296-2297:
// 066 extra RED only while ACTIVE and generating; 067 AP2 ACTIVE on entry,
// cannot be blocked by current BP>=4000, receives attack-turn Sniper and
// one physical draw when WON; 068 discard once per Yoko NAME and energy-line
// attack, four attacks cap and temporary BP per own Raid count.
const counts=Object.fromEntries([
 ...['042','043','045','046','047','051','053','054','064','066','067','068'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const game=seed=>{const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;};
const take=(p,id)=>{
 for(const z of ['hand','deck','life','outside']){
  const i=p[z].findIndex(c=>c.cardId===id);
  if(i>=0)return p[z].splice(i,1)[0];
 }throw Error('No physical '+id);
};
function stage(s,id,line='energy',slot=0,player=0){
 const c=take(s.players[player],id);c.ready=true;s.players[player][line][slot]=c;return c;
}
const offered=(s,fn)=>{const a=legalTtgCoreActions(s).find(fn);assert.ok(a,'Expected printed legal action');return a;};
test('066 continuous energy: ACTIVE generates RED2, REST RED1; ordinary FRONT generation zero',()=>{
 let s=game(6601),c=stage(s,'TTG-1-066','energy',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2);
 s.players[0].energy[0].ready=false;s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,1);
 s.players[0].energy[0].ready=true;s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2);
 s.players[0].front[0]=s.players[0].energy[0];s.players[0].energy[0]=null;
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,0);
 s.players[0].front[0].frontGenerates=true;s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2);
 assert.ok(assertTtgCoreState(s));
});
test('067 actual 4-RED AP2 hand deployment goes ACTIVE; enemy BP>=4000 cannot block, low-BP can',()=>{
 let s=game(6701),p=s.players[0];
 const gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=3;
 const top=take(p,'TTG-1-067');p.hand.push(top);
 const high=stage(s,'TTG-1-046','front',0,1);
 const low=stage(s,'TTG-1-045','front',1,1);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,4);
 assert.equal(TTG_BY_ID[top.cardId].ap,2);
 s=dispatchTtgCoreAction(s,offered(s,a=>a.type==='play'&&a.handUid===top.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.players[0].front[0].ready,true,'067 prints ACTIVE entry rather than ordinary REST');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 s.phase='attack';
 s=dispatchTtgCoreAction(s,offered(s,a=>a.type==='attack'&&a.uid===top.uid&&!a.targetUid));
 const choices=legalTtgCoreActions(s).filter(a=>a.type==='block');
 assert.ok(choices.some(a=>a.blockUid===low.uid));
 assert.ok(!choices.some(a=>a.blockUid===high.uid),'printed 067 cannot be blocked by BP4000');
 const deckTop=s.players[0].deck[0].uid,life=s.players[1].life.length;
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:low.uid});
 assert.equal(s.players[1].front[1],null);
 assert.ok(s.players[0].hand.some(c=>c.uid===deckTop),'067 WIN draws one exact physical card');
 assert.equal(s.players[1].life.length,life,'no bonus life hit on normal blocked win');
 assert.ok(assertTtgCoreState(s));
});
test('067 snipe grants choice to attack selected enemy FRONT card only on the entry turn',()=>{
 let s=game(6702),source=stage(s,'TTG-1-067','front',0),enemy=stage(s,'TTG-1-045','front',0,1);
 source.ready=true;source.enteredTurn=s.turn;
 s.phase='main';s=withTtgDerivedEnergy(s,0);
 // The real entry reducer marks sniping, exactly as after a 067 hand play.
 const p=s.players[0].front[0];p.red067SniperUntilTurn=s.turn;p.red067WinDrawUntilTurn=s.turn;
 s.phase='attack';
 assert.ok(legalTtgCoreActions(s).some(a=>a.type==='attack'&&a.uid===source.uid&&a.targetUid===enemy.uid));
 s.players[0].front[0].red067SniperUntilTurn=s.turn-1;
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='attack'&&a.targetUid===enemy.uid));
 s=withTtgDerivedEnergy(s,0);
 assert.ok(assertTtgCoreState(s));
});
test('068 Q2296: from ENERGY pay one real hand discard, no AP; two copies share once-per-name',()=>{
 let s=game(6801),p=s.players[0];
 const first=stage(s,'TTG-1-068','energy',0),second=stage(s,'TTG-1-068','energy',1);
 const handUid=s.players[0].hand[0].uid;
 s=withTtgDerivedEnergy(s,0);
 const ap=p.apCards.map(c=>c.ready);
 const a=offered(s,a=>a.type==='ttgRed068Main'&&a.uid===first.uid&&a.discardUid===handUid);
 s=dispatchTtgCoreAction(s,a);
 assert.ok(s.players[0].outside.some(c=>c.uid===handUid));
 assert.deepEqual(s.players[0].apCards.map(x=>x.ready),ap);
 assert.equal(s.players[0].red068AttackCap,4);
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='ttgRed068Main'&&x.uid===second.uid));
 s.phase='attack';
 const attack=offered(s,x=>x.type==='attack'&&x.uid===first.uid);
 s=dispatchTtgCoreAction(s,attack);
 assert.equal(s.players[0].energy[0].uid,first.uid,'energy-line attack does not move the physical card to front');
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.pending?.kind,'block');
 assert.ok(assertTtgCoreState(s));
});
test('068 Q2297: at FOUR own attacks this turn no more front or energy attacks are legal',()=>{
 let s=game(6802),p=s.players[0],yoko=stage(s,'TTG-1-068','energy',0);
 const attacker=stage(s,'TTG-1-045','front',0);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,offered(s,a=>a.type==='ttgRed068Main'&&a.uid===yoko.uid));
 s.phase='attack';
 assert.ok(legalTtgCoreActions(s).some(a=>a.type==='attack'&&a.uid===yoko.uid));
 s.players[0].attackTurn=s.turn;s.players[0].characterAttacksThisTurn=4;
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='attack'&&[yoko.uid,attacker.uid].includes(a.uid)));
 assert.ok(assertTtgCoreState(s));
});
test('068 own-turn +1000BP per CURRENT own Raid, no buff on opponent turn or previous-turn Raid',()=>{
 let s=game(6803),yoko=stage(s,'TTG-1-068','front',0);
 s.raidCountByPlayerTurn={0:{turn:s.turn,count:3}};
 assert.equal(red068BpBonus(s,0,s.players[0].front[0]),3000);
 s.active=1;
 assert.equal(red068BpBonus(s,0,s.players[0].front[0]),0);
 s.active=0;s.raidCountByPlayerTurn[0].turn=s.turn-1;
 assert.equal(red068BpBonus(s,0,s.players[0].front[0]),0);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(assertTtgCoreState(s));
});
test('067 ACTIVE and 068 DRAW life trigger are both optional and public',()=>{
 for(const [id,seed] of [['TTG-1-067',6703],['TTG-1-068',6804]]){
  let s=game(seed),p=s.players[0],own=stage(s,'TTG-1-045','front',0);
  own.ready=false;
  const life=take(p,id),old=p.life.shift();p.deck.push(old);p.life.unshift(life);
  s=withTtgDerivedEnergy(s,0);
  const q=beginTtgLifeTrigger(s,{player:0,lifeUid:life.uid}),options=legalTtgCoreActions(q);
  assert.ok(options.some(a=>a.mode==='decline'));
  assert.ok(options.some(a=>a.mode===(id==='TTG-1-067'?'active':'draw')));
  const no=dispatchTtgCoreAction(q,options.find(a=>a.mode==='decline'));
  assert.equal(no.publicLifeReveals.at(-1).outcome,'declined');
  assert.ok(assertTtgCoreState(no));
 }
});
