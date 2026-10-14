import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {red054BpBonus,red054ImpactNull,red056CanAttack} from '../dist/ttg-red-fifth-three.mjs';
import {legalRed056End,resolveRed056End} from '../dist/ttg-red-056-after-attack.mjs';
// Official 054: 1 optional top deck mill, Nia + deck <=20 for +1500 own-turn / IMPACT null.
// 055: optional 0-2 mill; optional hand discard gates recovery only from THIS mill.
// 056 Q2291: never raid a same-name Raid as earlier THIS TURN by ANY means.
// Q2292: after battle + after life trigger checks, and no fabricated AP payment.
// After-attack 073 must NOT accidentally execute 074 entry effects.
const cards=Object.fromEntries([
 ...['042','045','046','051','052','054','055','056','059','073','074','076'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const game=seed=>{const s=newTtgCoreMatch({decks:[cards,cards],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;};
function take(p,id){
 for(const area of ['hand','deck','life','outside']){
  const i=p[area].findIndex(c=>c.cardId===id);
  if(i>=0)return p[area].splice(i,1)[0];
 }throw Error('Missing physical '+id);
}
function place(s,id,line='energy',slot=0,p=0){
 const c=take(s.players[p],id);c.ready=true;s.players[p][line][slot]=c;return c;
}
function legal(s,fn){
 const a=legalTtgCoreActions(s).find(fn);
 assert.ok(a,'Missing legal action pending '+s.pending?.kind);return a;
}
function reduceDeck(s,target=20,p=0){
 const pl=s.players[p];
 assert.ok(pl.deck.length>=target);
 pl.outside.push(...pl.deck.splice(target));
}
test('054 real 50-card entry may SKIP optional mill; at 21 vs 20 deck with Nia dynamic BP/IMPACT',()=>{
 let s=game(5401),p=s.players[0],nia=place(s,'TTG-1-059','energy',0);
 const g=place(s,'TTG-1-042','energy',1);g.energyBonus=1;
 const simon=take(p,'TTG-1-054');p.hand.push(simon);
 reduceDeck(s,21);s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='play'&&a.handUid===simon.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'ttgRed054Mill');
 assert.equal(red054BpBonus(s,0,s.players[0].front[0]),0);
 assert.equal(red054ImpactNull(s,0,s.players[0].front[0]),false);
 const offers=legalTtgCoreActions(s);
 assert.deepEqual(offers.map(x=>x.mill),[false,true]);
 const skipped=dispatchTtgCoreAction(s,offers.find(x=>x.mill===false));
 assert.equal(skipped.players[0].deck.length,21);
 assert.equal(skipped.pending,null);
 const top=s.players[0].deck[0].uid;
 const milled=dispatchTtgCoreAction(s,offers.find(x=>x.mill===true));
 assert.equal(milled.players[0].deck.length,20);
 assert.ok(milled.players[0].outside.some(c=>c.uid===top));
 assert.equal(red054BpBonus(milled,0,milled.players[0].front[0]),1500);
 assert.equal(red054ImpactNull(milled,0,milled.players[0].front[0]),true);
 const enemyTurn=structuredClone(milled);enemyTurn.active=1;
 assert.equal(red054BpBonus(enemyTurn,0,enemyTurn.players[0].front[0]),0);
 assert.equal(red054ImpactNull(enemyTurn,0,enemyTurn.players[0].front[0]),true);
 assert.ok(assertTtgCoreState(milled));
});
test('055 real 50-card entry: only THIS ability milled cards may be recovered after discarding',()=>{
 let s=game(5501),p=s.players[0];
 const generator=place(s,'TTG-1-042','energy',0),source=take(p,'TTG-1-055');
 p.hand.push(source);
 const earlier=take(p,'TTG-1-051');p.outside.push(earlier);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='play'&&a.handUid===source.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'ttgRed055Mill');
 assert.deepEqual(legalTtgCoreActions(s).map(x=>x.count),[0,1,2]);
 const milled=s.players[0].deck.slice(0,2).map(c=>c.uid);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='ttgRed055Mill'&&a.count===2));
 assert.equal(s.pending?.kind,'ttgRed055Discard');
 assert.deepEqual(s.pending.milledUids,milled);
 assert.ok(milled.every(uid=>s.players[0].outside.some(c=>c.uid===uid)));
 const decline=dispatchTtgCoreAction(s,legal(s,a=>a.type==='ttgRed055Discard'&&a.discardUid===null));
 assert.equal(decline.pending,null);
 const payUid=s.players[0].hand[0].uid;
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='ttgRed055Discard'&&a.discardUid===payUid));
 const options=legalTtgCoreActions(s);
 assert.ok(!options.some(a=>a.recoverUid===earlier.uid));
 assert.ok(!options.some(a=>a.recoverUid===payUid));
 assert.ok(options.some(a=>a.recoverUid===milled[0])&&options.some(a=>a.recoverUid===milled[1]));
 s=dispatchTtgCoreAction(s,options.find(a=>a.recoverUid===milled[1]));
 assert.ok(s.players[0].hand.some(c=>c.uid===milled[1]));
 assert.ok(s.players[0].outside.some(c=>c.uid===milled[0]));
 assert.ok(assertTtgCoreState(s));assert.ok(assertTtgCoreState(decline));
});
test('055 chooses mill ZERO and discard ZERO without requiring a recovery target',()=>{
 let s=game(5502),p=s.players[0],sim=take(p,'TTG-1-055');
 p.hand.push(sim);
 place(s,'TTG-1-042','energy',0);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='play'&&a.handUid===sim.uid&&a.line==='front'&&a.slot===0));
 const deck=s.players[0].deck.map(x=>x.uid);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='ttgRed055Mill'&&a.count===0));
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='ttgRed055Discard'&&a.discardUid===null));
 assert.deepEqual(s.players[0].deck.map(x=>x.uid),deck);
 assert.equal(s.pending,null);assert.ok(assertTtgCoreState(s));
});
test('056 Q2292: unblocked attack triggers opponent LIFE first, THEN own optional raid with zero AP payment',()=>{
 let s=game(5601),p=s.players[0],opp=s.players[1];
 const sim=place(s,'TTG-1-056','front',0),nia=place(s,'TTG-1-059','energy',0);
 const gurren=take(p,'TTG-1-074');p.hand.push(gurren);
 const trigger=take(opp,'TTG-1-042'),prior=opp.life.shift();opp.deck.push(prior);opp.life.unshift(trigger);
 reduceDeck(s,20,0);
 s.phase='attack';s=withTtgDerivedEnergy(s,0);
 assert.equal(red056CanAttack(s,0,s.players[0].front[0]),true);
 const apBefore=s.players[0].apCards.map(c=>c.ready);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='attack'&&a.uid===sim.uid));
 assert.equal(s.pending?.kind,'block');
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:null});
 assert.equal(s.pendingTtgLife?.trigger,'active','life trigger precedes 056 attack-end effect');
 assert.notEqual(s.pending?.kind,'ttgRed056AfterAttack');
 s=dispatchTtgCoreAction(s,legal(s,a=>a.mode==='decline'));
 assert.equal(s.pending?.kind,'ttgRed056AfterAttack');
 const choice=legal(s,a=>a.type==='ttgRed056End'&&a.mode==='raid'&&a.handUid===gurren.uid);
 s=dispatchTtgCoreAction(s,choice);
 assert.deepEqual(s.players[0].apCards.map(c=>c.ready),apBefore);
 assert.equal(s.players[0].front[0].uid,gurren.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,sim.uid);
 assert.equal(s.players[0].front[0].currentBp,TTG_BY_ID[gurren.cardId].bp+1000);
 assert.equal(s.pending?.kind,'ttgRedRaidQueue');
 assert.deepEqual(s.pending.steps,['entry074']);
 s=dispatchTtgCoreAction(s,legal(s,a=>a.type==='ttgRedRaidEffect'&&a.step==='entry074'));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('056 Q2291 refuses same GurrenLagann name raided earlier this turn even by other effect',()=>{
 let s=game(5602),p=s.players[0];
 const sim=place(s,'TTG-1-056','front',0);
 place(s,'TTG-1-059','energy',0);
 reduceDeck(s,20);
 const one=take(p,'TTG-1-074'),two=take(p,'TTG-1-073'),lagan=take(p,'TTG-1-076');
 p.hand.push(one,two,lagan);
 s.phase='attack';s.raidNamesThisTurn=['グレンラガン'];
 s.pending={kind:'ttgRed056AfterAttack',player:0,uid:sim.uid};
 const allowed=legalRed056End(s);
 assert.ok(!allowed.some(a=>a.handUid===one.uid||a.handUid===two.uid));
 assert.ok(allowed.some(a=>a.handUid===lagan.uid));
 assert.ok(allowed.some(a=>a.mode==='decline'));
 s=withTtgDerivedEnergy(s,0);
 assert.ok(assertTtgCoreState(s));
});
test('056 Q2292 targeted regression: 073 entry must NEVER incorrectly invoke 074 DRAW/BP',()=>{
 // Controlled attack-end state checks a normally rare branch (Nia + Kamina);
 // this verifies printed effect dispatch without claiming this field was legally deployed.
 let s=game(5603),p=s.players[0];
 const sim=place(s,'TTG-1-056','front',0),nia=place(s,'TTG-1-059','energy',0),
  kamina=place(s,'TTG-1-045','energy',1);
 const raid=take(p,'TTG-1-073');p.hand.push(raid);
 const top=p.deck[0].uid,ap=p.apCards.map(c=>c.ready),before=p.hand.length;
 s.phase='attack';s.pending={kind:'ttgRed056AfterAttack',player:0,uid:sim.uid};
 assert.ok(legalRed056End(s).some(a=>a.handUid===raid.uid));
 const next=resolveRed056End(s,legalRed056End(s).find(a=>a.handUid===raid.uid));
 assert.equal(next.players[0].front[0].uid,raid.uid);
 assert.equal(next.players[0].front[0].currentBp,TTG_BY_ID[raid.cardId].bp+1000);
 assert.equal(next.pending,null,'no 074 entry and no 073 face-down entry');
 assert.equal(next.players[0].hand.length,before-1,'no incorrect 074 mandatory draw');
 assert.equal(next.players[0].deck[0].uid,top);
 assert.deepEqual(next.players[0].apCards.map(c=>c.ready),ap);
 assert.ok(assertTtgCoreState(withTtgDerivedEnergy(next,0)));
});
