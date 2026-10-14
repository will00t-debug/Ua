import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Printed 063 Buta MAIN REST and once per turn: +red1 for current turn,
// itself retires only at END OF MAIN, not immediately.
// 064 Yoko has no printed character effect and optional DRAW LIFE.
// 065 Yoko STEP is front -> EMPTY energy slot in own MOVE phase only.
const counts=Object.fromEntries([
 ...['042','043','045','065','047','051','053','054','059','062','063','064'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
const game=seed=>{const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;return s;};
function take(p,id){
 for(const z of ['hand','deck','life','outside']){
  const i=p[z].findIndex(c=>c.cardId===id);
  if(i>=0)return p[z].splice(i,1)[0];
 }throw Error('No physical '+id);
}
function put(s,id,line='energy',slot=0){
 const card=take(s.players[0],id);card.ready=true;s.players[0][line][slot]=card;return card;
}
function offer(s,fn){
 const a=legalTtgCoreActions(s).find(fn);
 assert.ok(a,'No legal choice '+s.phase);return a;
}
test('063 real MAIN REST increases RED from 1 to 2 and retires exactly on Main->Attack transition',()=>{
 let s=game(6301),buta=put(s,'TTG-1-063','energy',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(TTG_BY_ID[buta.cardId].energy,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,1);
 const before=s.players[0].outside.length;
 s=dispatchTtgCoreAction(s,offer(s,a=>a.type==='activateButa063'&&a.uid===buta.uid));
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(calculateTtgEnergyByColor(s,0).red,2);
 assert.equal(s.players[0].outside.length,before,'REST does not retire early');
 s.players[0].energy[0].ready=true;s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='activateButa063'&&a.uid===buta.uid),'TURN1 cannot repeat if re-ACTIVE');
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.equal(s.players[0].energy[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===buta.uid));
 assert.equal(calculateTtgEnergyByColor(s,0).red,0);
 assert.ok(assertTtgCoreState(s));
});
test('063 in FRONT does not generate RED without a separate front generator effect, but still retires',()=>{
 let s=game(6302),buta=put(s,'TTG-1-063','front',0);
 s=withTtgDerivedEnergy(s,0);
 assert.equal(calculateTtgEnergyByColor(s,0).red,0);
 s=dispatchTtgCoreAction(s,offer(s,a=>a.type==='activateButa063'&&a.uid===buta.uid));
 assert.equal(calculateTtgEnergyByColor(s,0).red,0);
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.players[0].front[0],null);
 assert.ok(s.players[0].outside.some(c=>c.uid===buta.uid));
 assert.ok(assertTtgCoreState(s));
});
test('064 real 0 RED energy hand play still pays AP1 and creates exactly one RED',()=>{
 let s=game(6401),p=s.players[0],card=take(p,'TTG-1-064');
 p.hand.push(card);s=withTtgDerivedEnergy(s,0);
 const count=p.apCards.filter(a=>a.ready).length;
 assert.equal(TTG_BY_ID[card.cardId].energy,0);
 s=dispatchTtgCoreAction(s,offer(s,a=>a.type==='play'&&a.handUid===card.uid&&a.line==='energy'&&a.slot===0));
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,count-1);
 assert.equal(calculateTtgEnergyByColor(s,0).red,1);
 assert.equal(s.players[0].energy[0].uid,card.uid);
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('064 DRAW LIFE: player may draw physical deck top or decline; chosen card must be public',()=>{
 let s=game(6402),p=s.players[0],card=take(p,'TTG-1-064'),old=p.life.shift();
 p.deck.push(old);p.life.unshift(card);s=withTtgDerivedEnergy(s,0);
 const q=beginTtgLifeTrigger(s,{player:0,lifeUid:card.uid}),top=q.players[0].deck[0].uid;
 const actions=legalTtgCoreActions(q);
 assert.ok(actions.some(a=>a.mode==='draw')&&actions.some(a=>a.mode==='decline'));
 const yes=dispatchTtgCoreAction(q,actions.find(a=>a.mode==='draw'));
 assert.ok(yes.players[0].hand.some(c=>c.uid===top));
 assert.equal(yes.publicLifeReveals.at(-1).cardId,'TTG-1-064');
 const no=dispatchTtgCoreAction(q,actions.find(a=>a.mode==='decline'));
 assert.equal(no.players[0].deck[0].uid,top);
 assert.ok(assertTtgCoreState(yes));assert.ok(assertTtgCoreState(no));
});
test('065 STEP only own MOVE phase from front to player-selected EMPTY energy; REST stays REST',()=>{
 let s=game(6501),yoko=put(s,'TTG-1-065','front',0),occupant=put(s,'TTG-1-064','energy',0);
 yoko.ready=false;s.phase='move';
 s=withTtgDerivedEnergy(s,0);
 const options=legalTtgCoreActions(s).filter(a=>a.type==='stepYoko065'&&a.uid===yoko.uid);
 assert.deepEqual(options.map(a=>a.toSlot),[1,2,3]);
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'stepYoko065',player:0,uid:yoko.uid,toSlot:0}),/Illegal|STEP/);
 const a=offer(s,a=>a.type==='stepYoko065'&&a.uid===yoko.uid&&a.toSlot===2);
 s=dispatchTtgCoreAction(s,a);
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].energy[2].uid,yoko.uid);
 assert.equal(s.players[0].energy[2].ready,false);
 assert.equal(s.players[0].energy[0].uid,occupant.uid);
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='stepYoko065'&&a.uid===yoko.uid),false);
 assert.ok(assertTtgCoreState(s));
});
test('065 STEP can not be used outside MOVE phase or by opponent and never bypasses occupancy',()=>{
 let s=game(6502),source=put(s,'TTG-1-065','front',0);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='stepYoko065'));
 assert.throws(()=>dispatchTtgCoreAction(s,{type:'stepYoko065',player:0,uid:source.uid,toSlot:0}),/Illegal/);
 s.phase='move';s.active=1;
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='stepYoko065'&&a.uid===source.uid));
 s=withTtgDerivedEnergy(s,1);
 assert.ok(assertTtgCoreState(s));
});
