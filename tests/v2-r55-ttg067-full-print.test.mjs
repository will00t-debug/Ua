import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {TTG_RED_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const ttg=registeredV2TitlePack('gurren-lagann'),both=[ttg,ttg];
const deck={...TTG_RED_V2_PILOT_COUNTS,'TTG-1-042':0,'TTG-1-067':4};
assert.deepEqual(validateUniversalDeck(ttg,deck),[]);
const use=(s,a)=>dispatchUniversalAction(both,s,a);
function take(s,owner,id){
 for(const z of ['hand','deck','life']){
  const pool=s.players[owner][z],i=pool.findIndex(c=>c.cardId===id);
  if(i>=0)return pool.splice(i,1)[0];
 }
 throw Error('Missing real '+id);
}
function scene(defenderId='TTG-1-072'){
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:55067});
 const actor=take(s,0,'TTG-1-067');s.players[0].hand.push(actor);
 const energyIds=['TTG-1-049','TTG-1-064','TTG-1-065'];
 for(const [i,id] of energyIds.entries()){
  const c=take(s,0,id);c.ready=true;
  c.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].energy[i]=c;
 }
 const defender=take(s,1,defenderId);defender.ready=true;
 defender.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=defender;
 s=use(s,{type:'next'});s=use(s,{type:'next'});
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 const paid=legalUniversalActions(both,s).find(a=>
  a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.ok(paid,'requires red4 and two real available AP');
 const before=s.players[0].apCards.filter(x=>x.ready).length;
 s=use(s,paid);
 assert.equal(before-s.players[0].apCards.filter(x=>x.ready).length,2);
 const shooter=s.players[0].front.find(c=>c?.uid===actor.uid);
 assert.ok(shooter?.ready,'always-active entry');
 assert.ok(shooter.sniperGranted&&shooter.attackWinDrawGranted);
 s=use(s,{type:'next'});assert.equal(s.phase,'attack');
 return {s,shooter,defender};
}
test('R55 TTG-1-067 entire official print/source: AP2, ACTIVE, original current BP restriction, turn grants, LIFE',()=>{
 const c=TTG_BY_ID['TTG-1-067'],d=ttg.cards['TTG-1-067'];
 assert.equal(c.number,'UA56BT/TTG-1-067');
 assert.deepEqual([c.nameJa,c.color,c.energy,c.ap,c.bp,c.gen,c.trigger],
  ['ヨーコ','red',4,2,3500,1,'active']);
 assert.deepEqual(c.traits,['大グレン団']);
 assert.equal(d.enterAlwaysActive,true);
 assert.deepEqual(d.blockBpRestriction,{relation:'atLeast',bp:4000,condition:null});
 assert.deepEqual(d.effects.onPlay,[
  {op:'grantSelfSniperThisTurn'},{op:'grantSelfAttackWinDrawThisTurn'}]);
 assert.equal(d.implementation,'dsl');
});
test('R55 Q2295 real paid red 50-deck TTG sniper win, ordinary block draw and null block direct LIFE do not mix',()=>{
 const a=scene('TTG-1-072');let s=a.s;
 const ready=legalUniversalActions(both,s);
 assert.ok(ready.some(x=>x.type==='attack'&&x.uid===a.shooter.uid&&x.targetUid===a.defender.uid));
 const h=s.players[0].hand.length;
 s=use(s,ready.find(x=>x.type==='attack'&&x.targetUid===a.defender.uid));
 assert.equal(s.players[0].hand.length,h+1);
 assert.ok(s.players[1].outside.some(c=>c.uid===a.defender.uid));
 assert.equal(s.blocksByUid[a.defender.uid],undefined);
 assert.equal(assertUniversalMatch(both,JSON.parse(JSON.stringify(s))),true);
 const b=scene('TTG-1-072');s=use(b.s,{type:'attack',uid:b.shooter.uid});
 assert.equal(s.pending.kind,'block');
 const hand=s.players[0].hand.length;
 s=use(s,{type:'chooseBlock',uid:b.defender.uid});
 assert.equal(s.players[0].hand.length,hand+1);
 const c=scene('TTG-1-072');s=use(c.s,{type:'attack',uid:c.shooter.uid});
 const hand3=s.players[0].hand.length;
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,hand3);
 assert.equal(s.players[1].life.length,6);
});
test('R55 real TTG current BP>=4000 cannot block normal attack; SNIPER still designates either current state',()=>{
 const {s,shooter,defender}=scene('TTG-1-073');
 let a=use(s,{type:'attack',uid:shooter.uid});
 assert.equal(a.pending.kind,'block');
 assert.ok(!legalUniversalActions(both,a).some(x=>x.type==='chooseBlock'&&x.uid===defender.uid));
 assert.throws(()=>use(a,{type:'chooseBlock',uid:defender.uid}));
 let b=scene('TTG-1-073');
 const sniper=legalUniversalActions(both,b.s).find(x=>x.type==='attack'&&x.targetUid===b.defender.uid);
 assert.ok(sniper);
 const hand=b.s.players[0].hand.length;
 b.s=use(b.s,sniper);
 assert.equal(b.s.players[0].hand.length,hand,'3500 loses to enemy BP4000');
 assert.ok(b.s.players[1].front.some(x=>x?.uid===b.defender.uid&&x.ready));
 assert.ok(legalUniversalActions(both,b.s).every(x=>x.type!=='chooseBlock'));
});
test('R55 real TTG ACTIVE LIFE chooses own character and gives current-turn BP+3000',()=>{
 let s=newUniversalMatch(both,{decks:[deck,deck],first:0,seed:55068});
 const attacker=take(s,0,'TTG-1-064');attacker.ready=true;
 attacker.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=attacker;
 const defending=take(s,1,'TTG-1-064');defending.ready=false;
 defending.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[1].front[0]=defending;
 const trigger=take(s,1,'TTG-1-067'),old=s.players[1].life[0];
 s.players[1].life[0]=trigger;s.players[1].deck.push(old);
 for(let i=0;i<3;i++)s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:attacker.uid});
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 const effect=legalUniversalActions(both,s).find(x=>
  x.type==='chooseTrigger'&&x.mode==='active'&&x.uid===defending.uid);
 assert.ok(effect);
 s=use(s,effect);
 const c=s.players[1].front.find(x=>x?.uid===defending.uid);
 assert.ok(c.ready);assert.equal(universalBp(both,s,c),5000);
 assert.equal(assertUniversalMatch(both,s),true);
});
test('R55 Human + Normal + Hard AI use identical legal actions, hidden-hand state remains private',()=>{
 const {s}=scene('TTG-1-073');
 assert.equal(universalPublicView(both,s,1).players[0].hand,null);
 for(const difficulty of ['easy','normal','hard']){
  const a=chooseUniversalAiAction(both,s,{difficulty});
  assert.ok(legalUniversalActions(both,s).some(x=>JSON.stringify(x)===JSON.stringify(a)));
 }
 const real=legalUniversalActions(both,s).find(x=>x.type==='attack'&&x.targetUid);
 assert.throws(()=>use(s,{...real,targetStamp:123456}));
});
