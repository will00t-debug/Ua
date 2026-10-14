import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy,calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// UA56BT official printed 048 Kittan / 049 Gimmy & Darry / 050 Kiyou & Kinon & Kiyal.
// 048: first own attack BP+500/Impact Null/Double Block until own next start;
// 049: must bounce ANOTHER own character printed <= 1 energy, else itself;
// 050: Kittan on field or Raid bottom triggers 1 draw. Three distinct MAIN
// once-per-physical-turn costs are discard to READY, REST to +RED, discard to +1000BP.
const counts=Object.fromEntries([
 ...['042','043','045','046','047','048','049','050','072','073','005','006'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
function game(seed){
 const s=newTtgCoreMatch({decks:[counts,counts],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(p,id){
 for(const area of ['hand','deck','life','outside']){
  const i=p[area].findIndex(x=>x.cardId===id);
  if(i>=0)return p[area].splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function put(s,id,line='energy',slot=0,p=0){
 const card=take(s.players[p],id);card.ready=true;s.players[p][line][slot]=card;return card;
}
function choose(s,fn){
 const a=legalTtgCoreActions(s).find(fn);
 assert.ok(a,'Expected legal option '+s.pending?.kind);return a;
}
function withRed(s,n=4,slot=0){
 const g=put(s,'TTG-1-042','energy',slot);
 g.energyBonus=n-1;return withTtgDerivedEnergy(s,0);
}
test('048 real first attack +500 persists against opponent, two blocks wake first and REST second',()=>{
 let s=game(4801);
 const kittan=put(s,'TTG-1-048','front',0),strong=put(s,'TTG-1-046','front',0,1);
 const attack1=put(s,'TTG-1-047','front',1,1),attack2=put(s,'TTG-1-042','front',2,1);
 s.phase='attack';s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='attack'&&x.uid===kittan.uid));
 assert.equal(s.players[0].front[0].currentBp,3500);
 assert.equal(s.players[0].front[0].doubleBlockUntilOwnStartTurnCount,s.players[0].turnCount+1);
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:strong.uid});
 assert.equal(s.players[0].front[0].uid,kittan.uid);
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.active,1);
 assert.equal(s.players[0].front[0].ready,true);
 for(let i=0;i<3;i++)s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='attack'&&x.uid===attack1.uid));
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:kittan.uid});
 assert.equal(s.players[0].front[0].ready,true,'first block restores ACTIVE under DOUBLE BLOCK');
 assert.equal(s.players[0].front[0].currentBp,3500);
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='attack'&&x.uid===attack2.uid));
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:kittan.uid});
 assert.equal(s.players[0].front[0].ready,false,'second block leaves REST');
 assert.ok(assertTtgCoreState(s));
});
test('048 second Kittan own attack does NOT get first-attack +500 or DOUBLE BLOCK',()=>{
 let s=game(4802);
 const other=put(s,'TTG-1-042','front',0),k=put(s,'TTG-1-048','front',1);
 const guard=put(s,'TTG-1-046','front',0,1);
 s.phase='attack';s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='attack'&&a.uid===other.uid));
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:guard.uid});
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='attack'&&a.uid===k.uid));
 assert.equal(s.players[0].front[1].currentBp,undefined);
 assert.equal(s.players[0].front[1].doubleBlockUntilOwnStartTurnCount,undefined);
 assert.ok(assertTtgCoreState(s));
});
test('049 actual hand play: mandatory other printed 0/1-energy character chosen instead of self',()=>{
 let s=game(4901),p=s.players[0];
 const other=put(s,'TTG-1-047','energy',0);
 const h=take(p,'TTG-1-049');p.hand.push(h);
 s=withRed(s,3,1);
 const action=choose(s,x=>x.type==='play'&&x.handUid===h.uid&&x.line==='front'&&x.slot===0);
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 s=dispatchTtgCoreAction(s,action);
 assert.equal(s.pending?.kind,'ttgRed049Entry');
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap-1);
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='next'));
 const opt=choose(s,x=>x.type==='ttgRed049Return'&&x.targetUid===other.uid);
 s=dispatchTtgCoreAction(s,opt);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(x=>x.uid===other.uid));
 assert.equal(s.players[0].front[0].uid,h.uid);
 assert.equal(s.players[0].energy[0],null);
 assert.ok(assertTtgCoreState(s));
});
test('049 actual hand play MUST self-bounce when no other character with printed energy <=1',()=>{
 let s=game(4902),p=s.players[0];
 put(s,'TTG-1-046','front',1);
 const h=take(p,'TTG-1-049');p.hand.push(h);
 s=withRed(s,3,0);
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='play'&&x.handUid===h.uid&&x.line==='front'&&x.slot===0));
 const opts=legalTtgCoreActions(s);
 assert.equal(opts.length,1);
 assert.equal(opts[0].targetUid,null);
 s=dispatchTtgCoreAction(s,opts[0]);
 assert.equal(s.players[0].front[0],null);
 assert.ok(s.players[0].hand.some(x=>x.uid===h.uid));
 assert.ok(assertTtgCoreState(s));
});
test('050 real hand play with own Kittan draws 1, then THREE separately chosen MAIN options with real costs',()=>{
 let s=game(5001),p=s.players[0];
 const k=put(s,'TTG-1-047','front',0);
 const sisters=take(p,'TTG-1-050');p.hand.push(sisters);
 s=withRed(s,3,0);
 const top=s.players[0].deck[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='play'&&x.handUid===sisters.uid&&x.line==='energy'&&x.slot===1));
 assert.equal(s.players[0].energy[1].uid,sisters.uid);
 assert.equal(s.players[0].hand.at(-1).uid,top,'mandatory entry draw with Kittan present');
 assert.equal(s.players[0].energy[1].ready,false,'normal hand entry does not gain RAID ACTIVE');
 assert.equal(s.pending,null);
 const discard1=s.players[0].hand[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='ttgRed050Main'&&x.mode==='ready'&&x.uid===sisters.uid&&x.discardUid===discard1));
 assert.equal(s.players[0].energy[1].ready,true);
 assert.ok(s.players[0].outside.some(x=>x.uid===discard1));
 const redBefore=calculateTtgEnergyByColor(s,0).red;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='ttgRed050Main'&&x.mode==='energy'&&x.uid===sisters.uid));
 assert.equal(s.players[0].energy[1].ready,false);
 assert.equal(calculateTtgEnergyByColor(s,0).red,redBefore+1);
 const discard2=s.players[0].hand[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='ttgRed050Main'&&x.mode==='bp'&&x.uid===sisters.uid&&x.discardUid===discard2));
 assert.ok(s.players[0].outside.some(x=>x.uid===discard2));
 assert.equal(s.players[0].energy[1].currentBp,TTG_BY_ID['TTG-1-050'].bp+1000);
 assert.equal(legalTtgCoreActions(s).filter(x=>x.type==='ttgRed050Main'&&x.uid===sisters.uid).length,0);
 s=dispatchTtgCoreAction(s,{type:'next'});
 s=dispatchTtgCoreAction(s,{type:'next'});
 assert.equal(s.players[0].energy[1].energyBonus,0,'red energy boost expires at end turn');
 assert.equal(s.players[0].energy[1].currentBp,TTG_BY_ID['TTG-1-050'].bp);
 assert.ok(assertTtgCoreState(s));
});
test('050 Kittan may be underlying own RAID base, but absent Kittan MUST draw zero',()=>{
 let s=game(5002),p=s.players[0];
 const raider=put(s,'TTG-1-072','front',0);
 const k=take(p,'TTG-1-047');
 raider.stack=[k];
 const sisters=take(p,'TTG-1-050');
 p.hand.push(sisters);
 s=withRed(s,3,0);
 const top=s.players[0].deck[0].uid,oldHand=s.players[0].hand.length;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.type==='play'&&x.handUid===sisters.uid&&x.line==='front'&&x.slot===1));
 assert.equal(s.players[0].hand.length,oldHand);
 assert.equal(s.players[0].hand.at(-1).uid,top);
 assert.ok(assertTtgCoreState(s));
});
test('048 ACTIVE life trigger is optional and grants only selected own character +3000BP',()=>{
 let s=game(4803),p=s.players[0],own=put(s,'TTG-1-047','front',0),life=take(p,'TTG-1-048');
 const old=p.life.shift();p.deck.push(old);p.life.unshift(life);own.ready=false;
 s=withTtgDerivedEnergy(s,0);
 const pending=beginTtgLifeTrigger(s,{player:0,lifeUid:life.uid});
 const offered=legalTtgCoreActions(pending);
 assert.ok(offered.some(a=>a.mode==='decline')&&offered.some(a=>a.mode==='active'&&a.targetUid===own.uid));
 const accept=dispatchTtgCoreAction(pending,offered.find(a=>a.mode==='active'&&a.targetUid===own.uid));
 assert.equal(accept.players[0].front[0].ready,true);
 assert.equal(accept.players[0].front[0].currentBp,TTG_BY_ID[own.cardId].bp+3000);
 const decline=dispatchTtgCoreAction(pending,offered.find(a=>a.mode==='decline'));
 assert.equal(decline.players[0].front[0].ready,false);
 assert.ok(assertTtgCoreState(accept));assert.ok(assertTtgCoreState(decline));
});
