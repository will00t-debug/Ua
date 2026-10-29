import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 'REZ-2-058','REZ-2-055','REZ-2-056','REZ-2-049','REZ-2-066','REZ-2-043',
 'REZ-2-041','REZ-2-060','REZ-2-021','REZ-2-005','REZ-2-006','REZ-2-014','REZ-2-035'
],'REZ-2-014');

function sit(s,p,id,line,slot){
 const c=take(s,p,id);c.ready=true;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,
  ...s.players[1].front,...s.players[1].energy].find(c=>c?.uid===uid);
}
function shell(extra){
 return {id:'X',name:'エミリア',color:'green',type:'character',energy:6,ap:1,
  bp:4000,gen:1,trigger:'raid',raidName:'エミリア',implementation:'dsl',...extra};
}

test('REZ-2-058 raids Emilia, attacks twice, and rests printed BP 2500',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-058'].effectJa,/\[レイド\]〈エミリア〉/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-058'].effectJa,/元々のBPが2500/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-058'].note,/Q2420/);
 assert.equal(rez.cards['REZ-2-058'].raidName,'エミリア');
 assert.equal(rez.cards['REZ-2-058'].attackEndRestPrintedBp,2500);
 let s=fresh(deck,2058);
 const base=sit(s,0,'REZ-2-055','front',0);
 const low=sit(s,0,'REZ-2-056','front',1);
 const other=sit(s,0,'REZ-2-060','front',2);
 sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-066','energy',1);
 sit(s,0,'REZ-2-043','energy',2);
 const energyLow=sit(s,0,'REZ-2-041','energy',3);
 const rider=take(s,0,'REZ-2-058');s.players[0].hand.push(rider);
 const life=take(s,1,'REZ-2-021');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(life);
 const blocker=sit(s,1,'REZ-2-014','front',0);
 s=toPhase(rezPacks,s,'main');
 const raid=legalUniversalActions(rezPacks,s).find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=dispatchUniversalAction(rezPacks,s,raid,{actor:0});
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'REZ-2-058');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(top.readyOnAttackGranted.turn,s.turn);
 assert.equal(top.readyOnAttackGranted.stamp,top.fieldEntryStamp);
 assert.equal(top.unchosenGranted.turn,s.turn);
 assert.equal(top.unchosenGranted.stamp,top.fieldEntryStamp);
 s=toPhase(rezPacks,s,'attack');
 const attacker=s.players[0].front[0];
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 const swinging=s.players[0].front[0];
 assert.equal(swinging.ready,true);
 assert.equal(s.attacksByUid[swinging.uid],1);
 assert.equal(universalBp(rez,s,swinging),5000);
 assert.equal(s.pending.kind,'block');
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 const lost=structuredClone(s);
 const wall=lost.players[1].front[0];
 wall.buffs=[{bp:4000,untilTurn:lost.turn}];
 const beaten=dispatchUniversalAction(rezPacks,lost,{type:'chooseBlock',uid:wall.uid},{actor:1});
 assert.equal(beaten.players[0].front[0].uid,attacker.uid);
 assert.equal(beaten.players[0].front[0].ready,true);
 assert.equal(beaten.players[1].front[0].uid,wall.uid);
 assert.equal(beaten.players[1].front[0].ready,false);
 assert.equal(beaten.players[1].life.length,lost.players[1].life.length);
 assert.equal(beaten.pending.kind,'effect-attack-end-rest');
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 const special=legalUniversalActions(rezPacks,s).filter(a=>a.mode==='special').map(a=>a.uid);
 assert.deepEqual(special.slice().sort(),[low.uid,other.uid].sort());
 assert.equal(special.includes(s.players[0].front[0].uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,
  {type:'chooseTrigger',mode:'special',uid:s.players[0].front[0].uid},{actor:1}),
  /not currently legal/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.pending.kind,'effect-attack-end-rest');
 assert.equal(s.pending.bp,2500);
 assert.deepEqual(s.pending.choices.slice().sort(),[low.uid,other.uid].sort());
 assert.equal(s.pending.choices.includes(energyLow.uid),false);
 const declined=dispatchUniversalAction(rezPacks,structuredClone(s),
  {type:'chooseAttackEndRest',uid:null},{actor:0});
 assert.equal(live(declined,low.uid).ready,true);
 assert.equal(declined.players[0].front[0].ready,true);
 assert.equal(declined.pending,null);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseAttackEndRest',uid:low.uid},{actor:0});
 assert.equal(live(s,low.uid).ready,false);
 assert.equal(live(s,other.uid).ready,true);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.pending,null);
 const quiet=take(s,1,'REZ-2-006');
 s.players[1].life.unshift(quiet);
 s.players[1].deck.push(s.players[1].life.pop());
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:s.players[0].front[0].uid},{actor:0});
 const second=s.players[0].front[0];
 assert.equal(second.ready,false);
 assert.equal(s.attacksByUid[second.uid],2);
 assert.equal(universalBp(rez,s,second),5000);
 assert.equal(second.buffs.filter(b=>b.bp===1000&&b.untilTurn===s.turn).length,1);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.kind,'effect-attack-end-rest');
 assert.deepEqual(s.pending.choices,[other.uid]);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseAttackEndRest',uid:other.uid},{actor:0});
 assert.equal(live(s,other.uid).ready,false);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,beaten),true);
});

test('Q2423 blocks opponent effect selection this turn and ends at the next turn',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-058'].note,/Q2423/);
 let s=fresh(deck,3058);
 const base=sit(s,0,'REZ-2-055','front',0);
 sit(s,0,'REZ-2-056','front',1);
 sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-066','energy',1);
 sit(s,0,'REZ-2-043','energy',2);
 sit(s,0,'REZ-2-041','energy',3);
 const rider=take(s,0,'REZ-2-058');s.players[0].hand.push(rider);
 const life=take(s,1,'REZ-2-021');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(life);
 sit(s,1,'REZ-2-005','energy',0);
 const ram=take(s,1,'REZ-2-006');s.players[1].hand.push(ram);
 s=toPhase(rezPacks,s,'main');
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='raid'&&a.uid===rider.uid),{actor:0});
 const emilia=s.players[0].front[0].uid;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:emilia},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.trigger,'special');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.uid===emilia),false);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseAttackEndRest',uid:null},{actor:0});
 let guard=0;
 while(!(s.active===1&&s.phase==='main')){
  if(s.pending)throw Error('Pending '+s.pending.kind);
  s=dispatchUniversalAction(rezPacks,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach opponent main');
 }
 assert.equal(live(s,emilia).unchosenGranted,undefined);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===ram.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(rezPacks,s,play,{actor:1});
 assert.equal(s.pending.kind,'effect-target');
 assert.ok(legalUniversalActions(rezPacks,s).some(a=>a.type==='chooseTarget'&&a.uid===emilia));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-058 rejects a partial body and skips the rest when nobody is ready',()=>{
 assert.throws(()=>createUniversalPack({id:'bad-058-timing',cards:[shell({
  effects:{onAttack:[{op:'grantSelfDoubleAttackThisTurn'}]}
 })]}),/onPlay/);
 assert.throws(()=>createUniversalPack({id:'bad-058-key',cards:[shell({
  effects:{onPlay:[{op:'grantSelfUnchosenThisTurn',extra:true}]}
 })]}),/this-turn self attack grant/);
 assert.throws(()=>createUniversalPack({id:'bad-058-bp',cards:[shell({
  attackEndRestPrintedBp:2501,effects:{onPlay:[{op:'grantSelfDoubleAttackThisTurn'}]}
 })]}),/printed-BP/);
 let s=fresh(deck,4058);
 const base=sit(s,0,'REZ-2-055','front',0);
 const low=sit(s,0,'REZ-2-056','front',1);low.ready=false;
 sit(s,0,'REZ-2-049','energy',0);
 sit(s,0,'REZ-2-066','energy',1);
 sit(s,0,'REZ-2-043','energy',2);
 sit(s,0,'REZ-2-041','energy',3);
 const rider=take(s,0,'REZ-2-058');s.players[0].hand.push(rider);
 const quiet=take(s,1,'REZ-2-006');
 s.players[1].deck.push(s.players[1].life.shift());
 s.players[1].life.unshift(quiet);
 s=toPhase(rezPacks,s,'main');
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid),{actor:0});
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:s.players[0].front[0].uid},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(live(s,low.uid).ready,false);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
