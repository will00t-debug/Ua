import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
// Official Japanese UA56BT/TTG-1-051: on hand play mandatory draw 1 -> sideline 1 from hand.
// 052: MAY discard 1 hand, THEN MAY recover exactly 0/1 RED printed energy <=2
// from own outside, including just discarded card; no discard means no recovery.
// 053: MAIN REST itself -> top 1 deck physically to outside, may repeat if re-ACTIVE.
// 051 DRAW, 052 and 053 ACTIVE triggers may decline (general official Q99).
const cards=Object.fromEntries([
 ...['042','043','045','046','047','048','049','050','051','052','053','006'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
function game(seed){
 const s=newTtgCoreMatch({decks:[cards,cards],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(pl,id){
 for(const area of ['hand','deck','life','outside']){
  const at=pl[area].findIndex(x=>x.cardId===id);
  if(at>=0)return pl[area].splice(at,1)[0];
 }throw Error('Missing physical '+id);
}
function stage(s,id,line='energy',slot=0){
 const card=take(s.players[0],id);card.ready=true;s.players[0][line][slot]=card;return card;
}
function choose(s,fn){
 const a=legalTtgCoreActions(s).find(fn);
 assert.ok(a,'expected printed legal choice');return a;
}
test('051 printed zero-energy real hand entry immediately DRAWS before mandatory player-chosen hand discard',()=>{
 let s=game(5101),p=s.players[0],card=take(p,'TTG-1-051');
 p.hand.push(card);s=withTtgDerivedEnergy(s,0);
 const firstTop=s.players[0].deck[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='play'&&a.handUid===card.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'ttgRed051Discard');
 assert.ok(s.players[0].hand.some(c=>c.uid===firstTop));
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='next'));
 const choices=legalTtgCoreActions(s);
 assert.equal(choices.length,s.players[0].hand.length);
 assert.ok(choices.some(a=>a.discardUid===firstTop));
 const discard=choices.find(a=>a.discardUid===firstTop);
 s=dispatchTtgCoreAction(s,discard);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===firstTop));
 assert.ok(!s.players[0].hand.some(c=>c.uid===firstTop));
 assert.equal(s.players[0].front[0].uid,card.uid);
 assert.ok(assertTtgCoreState(s));
});
test('051 required draw when deck EMPTY ends match rather than silently ignoring its printed mandatory cost',()=>{
 let s=game(5102),p=s.players[0],card=take(p,'TTG-1-051');
 p.hand.push(card);
 p.outside.push(...p.deck.splice(0));
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='play'&&a.handUid===card.uid&&a.line==='energy'&&a.slot===0));
 assert.equal(s.status,'finished');
 assert.equal(s.winner,1);
 assert.equal(s.endReason,'requiredDrawEmpty');
 assert.ok(assertTtgCoreState(s));
});
test('052 choose SKIP discard => no recover; if discard, only own red cost<=2 can be recovered',()=>{
 let s=game(5201),p=s.players[0],gen=stage(s,'TTG-1-042','energy',0);
 gen.energyBonus=1;
 const card=take(p,'TTG-1-052'),eligible=take(p,'TTG-1-043'),
    tooCostly=take(p,'TTG-1-050'),green=take(p,'TTG-1-006');
 p.hand.push(card);p.outside.push(eligible,tooCostly,green);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='play'&&a.handUid===card.uid&&a.line==='front'&&a.slot===0));
 assert.equal(s.pending?.kind,'ttgRed052Discard');
 const skip=dispatchTtgCoreAction(s,choose(s,a=>a.type==='ttgRed052Discard'&&a.discardUid===null));
 assert.equal(skip.pending,null);
 assert.ok(skip.players[0].outside.some(c=>c.uid===eligible.uid));
 const handCost=s.players[0].hand[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='ttgRed052Discard'&&a.discardUid===handCost));
 assert.equal(s.pending?.kind,'ttgRed052Recover');
 const options=legalTtgCoreActions(s);
 assert.ok(options.some(a=>a.recoverUid===handCost));
 assert.ok(options.some(a=>a.recoverUid===eligible.uid));
 assert.ok(!options.some(a=>a.recoverUid===tooCostly.uid));
 assert.ok(!options.some(a=>a.recoverUid===green.uid));
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='ttgRed052Recover'&&a.recoverUid===handCost));
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===handCost),'even the cost card can be recovered');
 assert.ok(assertTtgCoreState(s));
});
test('052 may pay discard then choose ZERO red recovery; refuses opponent/special-cost cards',()=>{
 let s=game(5202),p=s.players[0],gen=stage(s,'TTG-1-042','energy',0);gen.energyBonus=1;
 const card=take(p,'TTG-1-052');p.hand.push(card);
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='play'&&a.handUid===card.uid&&a.line==='front'&&a.slot===0));
 const discarded=s.players[0].hand[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='ttgRed052Discard'&&a.discardUid===discarded));
 assert.ok(legalTtgCoreActions(s).some(a=>a.type==='ttgRed052Recover'&&a.recoverUid===null));
 const no=dispatchTtgCoreAction(s,choose(s,a=>a.recoverUid===null));
 assert.ok(no.players[0].outside.some(x=>x.uid===discarded));
 assert.ok(!no.players[0].hand.some(x=>x.uid===discarded));
 assert.ok(assertTtgCoreState(no));
});
test('053 MAIN physically rests and sidelines top deck card; after being made ACTIVE again it can repeat',()=>{
 let s=game(5301),p=s.players[0],source=stage(s,'TTG-1-053','energy',0);
 s=withTtgDerivedEnergy(s,0);
 const top=s.players[0].deck.slice(0,2).map(c=>c.uid);
 const first=choose(s,a=>a.type==='ttgRed053Main'&&a.uid===source.uid);
 s=dispatchTtgCoreAction(s,first);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.ok(s.players[0].outside.some(c=>c.uid===top[0]));
 assert.equal(legalTtgCoreActions(s).some(a=>a.type==='ttgRed053Main'&&a.uid===source.uid),false);
 s.players[0].energy[0].ready=true;
 s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='ttgRed053Main'&&a.uid===source.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===top[1]));
 assert.equal(s.players[0].deck.some(c=>c.uid===top[0]||c.uid===top[1]),false);
 assert.ok(assertTtgCoreState(s));
});
test('052/053 ACTIVE LIFE trigger player choice never READIES AP and declined trigger changes no character',()=>{
 for(const [id,seed] of [['TTG-1-052',5203],['TTG-1-053',5303]]){
  let s=game(seed),p=s.players[0],source=stage(s,'TTG-1-047','front',0);
  source.ready=false;
  const card=take(p,id),old=p.life.shift();
  p.deck.push(old);p.life.unshift(card);s=withTtgDerivedEnergy(s,0);
  const q=beginTtgLifeTrigger(s,{player:0,lifeUid:card.uid}),options=legalTtgCoreActions(q);
  assert.ok(options.some(x=>x.mode==='active'&&x.targetUid===source.uid)&&options.some(x=>x.mode==='decline'));
  const ap=q.players[0].apCards.map(x=>x.ready);
  const activated=dispatchTtgCoreAction(q,options.find(x=>x.mode==='active'&&x.targetUid===source.uid));
  assert.equal(activated.players[0].front[0].ready,true);
  assert.equal(activated.players[0].front[0].currentBp,TTG_BY_ID[source.cardId].bp+3000);
  assert.deepEqual(activated.players[0].apCards.map(x=>x.ready),ap);
  const denied=dispatchTtgCoreAction(q,options.find(x=>x.mode==='decline'));
  assert.equal(denied.players[0].front[0].ready,false);
  assert.ok(assertTtgCoreState(activated));assert.ok(assertTtgCoreState(denied));
 }
});
