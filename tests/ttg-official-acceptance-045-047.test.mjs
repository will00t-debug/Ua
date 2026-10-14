import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch, legalTtgCoreActions, dispatchTtgCoreAction, assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy, calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
import {inspectFacedownUnder} from '../dist/ttg-rules.mjs';
// Japan official:
// 045 Q2286: even a prior Gurren Raid top turned face down doesn't stop Kamina base effect;
// Q2287: opponent must NOT see face-down identities.
// 046 Q2288: choose each option no more than once; Q2289: printed top to bottom order;
// Q2290: Kamina name shares once-per-turn ACTIVE choice, but other copies may BP-boost.
// 047: +1500 only on first own character attack of the turn, DRAW LIFE optional (Q99).
const official={
 '045':'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-045',
 '046':'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-046',
 '047':'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-047'
};
const cards=Object.fromEntries([
 ...['042','043','044','045','046','047','048','051','072','073','005','006'].map(n=>['TTG-1-'+n,4]),
 ['TTG-1-036',1],['TTG-1-038',1]
]);
function match(seed=4547){
 const s=newTtgCoreMatch({decks:[cards,cards],seed,first:0});
 s.phase='main';s.players[0].turnCount=2;s.players[0].apCards[1].ready=true;
 return s;
}
function take(p,id){
 for(const area of ['hand','deck','life','outside']){
  const i=p[area].findIndex(c=>c.cardId===id);
  if(i>=0)return p[area].splice(i,1)[0];
 }
 throw Error('Missing actual '+id);
}
function stage(s,id,line='energy',slot=0,player=0){
 const c=take(s.players[player],id);c.ready=true;
 s.players[player][line][slot]=c;return c;
}
function choose(s,predicate){
 const action=legalTtgCoreActions(s).find(predicate);
 assert.ok(action,'Expected offered legal action');
 return action;
}
function pay(s,a,apIndex=0){
 return dispatchTtgCoreAction(s,{...a,payApUids:[s.players[0].apCards[apIndex].uid]});
}
function raid072(seed=4501){
 let s=match(seed),p=s.players[0];
 const kamina=stage(s,'TTG-1-045','front',0);
 const generator=stage(s,'TTG-1-042','energy',0);
 generator.energyBonus=3;
 const gurren=take(p,'TTG-1-072');p.hand.push(gurren);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(calculateTtgEnergyByColor(s,0).red>=3);
 const action=choose(s,x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-072'&&x.sourceUid===kamina.uid&&x.line==='front'&&x.slot===0);
 s=pay(s,action);
 assert.equal(s.pending?.kind,'ttgRedRaidQueue');
 assert.deepEqual(s.pending.steps,['entry072','base045']);
 assert.equal(s.players[0].front[0].stack[0].uid,kamina.uid);
 return {s,kamina,gurren};
}
test('045 real 50-card Raid onto Kamina lets player order entry072 and base045, but 072 mandatory DRAW remains',()=>{
 let {s,kamina,gurren}=raid072(4501);
 const options=legalTtgCoreActions(s);
 assert.ok(options.some(x=>x.step==='entry072'));
 assert.ok(options.some(x=>x.step==='base045'));
 const draw=s.players[0].deck[0].uid,handBefore=s.players[0].hand.length;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='base045'&&x.targetUid===gurren.uid));
 assert.equal(s.players[0].front[0].currentBp,TTG_BY_ID['TTG-1-072'].bp+1000);
 assert.equal(s.players[0].hand.length,handBefore,'045 only draws with a face-down under card');
 assert.deepEqual(s.pending.steps,['entry072']);
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='entry072'&&x.targetUid===null));
 assert.equal(s.players[0].hand.at(-1).uid,draw,'072 mandatory entry DRAW cannot be skipped');
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('045 Q2286 / Q2287: 073 upgrading 072 still triggers underlying Kamina, draws and keeps face-down hidden',()=>{
 let {s,kamina}=raid072(4502);
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='entry072'&&x.targetUid===null));
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='base045'&&x.targetUid===null));
 stage(s,'TTG-1-051','energy',1); // A Simon name in own field is required for 073 Raid.
 s=withTtgDerivedEnergy(s,0);
 const p=s.players[0],newTop=take(p,'TTG-1-073');p.hand.push(newTop);
 const action=choose(s,x=>x.type==='ttgRedHighRaid'&&x.cardId==='TTG-1-073'&&x.line==='front'&&x.slot===0);
 s=pay(s,action,1);
 assert.equal(s.players[0].front[0].stack[0].uid,kamina.uid);
 assert.equal(s.players[0].front[0].under[0].cardId,'TTG-1-072');
 assert.equal(s.players[0].front[0].under[0].faceDown,true);
 assert.deepEqual(s.pending.steps,['entry073','base045']);
 const draw=s.players[0].deck[0].uid;
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='base045'&&x.targetUid===null));
 assert.ok(s.players[0].hand.some(x=>x.uid===draw),'Q2286 mandatory conditional draw');
 assert.equal(s.pending.steps[0],'entry073');
 const top=s.players[0].front[0];
 assert.deepEqual(inspectFacedownUnder(top,{viewer:1,owner:0}),[{faceDown:true}]);
 assert.equal(inspectFacedownUnder(top,{viewer:0,owner:0})[0].cardId,'TTG-1-072');
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='entry073'&&x.targetUid===null));
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('046 Q2288-2290 real core: after a Raid, first copy can READY+BP, second can only BP, and no AP paid',()=>{
 let {s}=raid072(4601);
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='entry072'&&x.targetUid===null));
 s=dispatchTtgCoreAction(s,choose(s,x=>x.step==='base045'&&x.targetUid===null));
 const first=stage(s,'TTG-1-046','front',1),second=stage(s,'TTG-1-046','front',2);
 first.ready=false;second.ready=false;
 const apBefore=s.players[0].apCards.map(c=>c.ready);
 const option=choose(s,x=>x.type==='ttgRed046Main'&&x.uid===first.uid&&x.mode==='both'&&x.targetUid===second.uid);
 s=dispatchTtgCoreAction(s,option);
 assert.equal(s.players[0].front[1].ready,true);
 assert.equal(s.players[0].front[2].currentBp,TTG_BY_ID['TTG-1-046'].bp+1000);
 assert.equal(s.players[0].red046ReadyUsedTurn,s.turn);
 assert.deepEqual(s.players[0].apCards.map(c=>c.ready),apBefore);
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='ttgRed046Main'&&x.uid===first.uid));
 const opts=legalTtgCoreActions(s).filter(x=>x.type==='ttgRed046Main'&&x.uid===second.uid);
 assert.ok(opts.some(x=>x.mode==='buff'));
 assert.ok(!opts.some(x=>x.mode==='ready'||x.mode==='both'));
 assert.throws(()=>dispatchTtgCoreAction(s,{...option,uid:second.uid}),/Illegal/);
 s=dispatchTtgCoreAction(s,opts.find(x=>x.mode==='buff'&&x.targetUid===first.uid));
 assert.equal(s.players[0].front[1].currentBp,TTG_BY_ID['TTG-1-046'].bp+1000);
 assert.ok(assertTtgCoreState(s));
});
test('046 cannot activate before any own Raid, on opponent turn, or when source is in ENERGY line',()=>{
 let s=match(4602),first=stage(s,'TTG-1-046','front',0);
 s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='ttgRed046Main'));
 s.ttgRaidOccurredTurn={0:s.turn};
 s.players[0].front[0]=null;s.players[0].energy[0]=first;
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='ttgRed046Main'));
 s.players[0].energy[0]=null;s.players[0].front[0]=first;
 assert.ok(legalTtgCoreActions(s).some(a=>a.type==='ttgRed046Main'));
 s.active=1;
 assert.ok(!legalTtgCoreActions(s).some(a=>a.type==='ttgRed046Main'));
 assert.ok(assertTtgCoreState(s));
});
test('047 first of two real attacks gets +1500 until turn end; second 047 does NOT gain it',()=>{
 let s=match(4701);
 const first=stage(s,'TTG-1-047','front',0),second=stage(s,'TTG-1-047','front',1);
 const blocker=stage(s,'TTG-1-046','front',0,1);
 s.phase='attack';s=withTtgDerivedEnergy(s,0);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='attack'&&a.uid===first.uid));
 assert.equal(s.players[0].front[0].currentBp,3000);
 assert.equal(s.pending.kind,'block');
 s=dispatchTtgCoreAction(s,{type:'block',blockUid:blocker.uid});
 assert.equal(s.players[0].front[0].uid,first.uid);
 assert.equal(s.pending,null);
 s=dispatchTtgCoreAction(s,choose(s,a=>a.type==='attack'&&a.uid===second.uid));
 assert.equal(s.players[0].front[1].currentBp,undefined,'second attacker has no first-attack buff');
 assert.equal(s.players[0].characterAttacksThisTurn,2);
 assert.ok(assertTtgCoreState(s));
});
test('047 real printed DRAW trigger is optional; decline must not move top deck card',()=>{
 let s=match(4702),p=s.players[0];
 const trigger=take(p,'TTG-1-047');
 const previous=p.life.shift();p.deck.push(previous);p.life.unshift(trigger);
 s=withTtgDerivedEnergy(s,0);
 const seen=beginTtgLifeTrigger(s,{player:0,lifeUid:trigger.uid});
 const options=legalTtgCoreActions(seen);
 assert.ok(options.some(a=>a.mode==='draw')&&options.some(a=>a.mode==='decline'));
 const top=seen.players[0].deck[0].uid;
 const declined=dispatchTtgCoreAction(seen,options.find(a=>a.mode==='decline'));
 assert.equal(declined.players[0].deck[0].uid,top);
 const drawn=dispatchTtgCoreAction(seen,options.find(a=>a.mode==='draw'));
 assert.ok(drawn.players[0].hand.some(c=>c.uid===top));
 assert.ok(assertTtgCoreState(drawn));assert.ok(assertTtgCoreState(declined));
});
