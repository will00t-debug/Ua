import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalAttackDamage,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {countRetirementsThisTurn} from '../dist/universal-v2/field-conditions.mjs';

// Real cards only. Q73 simultaneously reveals LIFE, while Q74 guarantees
// SPECIAL retirement triggers finish before another LIFE trigger is resolved.
// MST-1-076 SPECIAL retires one opposing front character. BLC-2-040 prints
// 退場：抽1張. Leaving LIFE is not retirement, so 076's own 退場時 does not fire.
const pack=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei'),packs=[pack,mst];
const mstIds=['MST-1-053','MST-1-050','MST-1-052','MST-1-075','MST-1-001','MST-1-002','MST-1-012','MST-1-016','MST-1-020','MST-1-022','MST-1-027','MST-1-070','MST-1-076'];
const mstDeck=Object.fromEntries(mstIds.map((id,i)=>[id,i===12?2:4]));
const ids=['BLC-1-024','BLC-1-017','BLC-1-021','BLC-1-002','BLC-1-005',
 'BLC-1-012','BLC-1-018','BLC-1-071','BLC-1-083','BLC-1-086',
 'BLC-1-035','BLC-1-010','BLC-2-040'];
const deck=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));

function take(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing real '+id);
}

function reachSpecialLife(){
 let s=newUniversalMatch(packs,{decks:[deck,mstDeck],seed:7251,first:0});
 for(let n=0;n<35&&(s.players[0].ownTurns<3||s.active!==0);n++){
  const actions=legalUniversalActions(packs,s);
  const a=actions.find(x=>x.type==='next')||actions[0];
  assert.ok(a,'a legal continuation must exist until turn three');
  s=dispatchUniversalAction(packs,s,a,{actor:s.pending?.player??s.active});
 }
 assert.equal(s.players[0].ownTurns,3);
 assert.equal(s.active,0);assert.equal(s.phase,'start');
 const firstTop=take(s,0,'BLC-1-024'),secondTop=take(s,0,'BLC-1-024');
 const firstBase=take(s,0,'BLC-1-021'),secondBase=take(s,0,'BLC-1-021');
 s.players[0].hand.push(firstTop,secondTop,secondBase);
 firstBase.ready=false;s.players[0].energy[3]=firstBase;
 for(let i=0;i<3;i++){
  const c=take(s,0,'BLC-1-017');c.ready=false;s.players[0].energy[i]=c;
 }
 const victims=['MST-1-052','MST-1-002'].map((id,i)=>{
  const c=take(s,1,id);c.ready=true;s.players[1].front[i]=c;return c;
 });
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 function paidRaid(top,base,slot){
  const a=legalUniversalActions(packs,s).find(x=>x.type==='raid'&&
   x.uid===top.uid&&x.baseUid===base.uid&&x.slot===slot);
  assert.ok(a,'printed yellow6 + AP1 Raid must be legal');
  s=dispatchUniversalAction(packs,s,a);
  assert.equal(s.pending?.kind,'effect-choice-mode');
  s=dispatchUniversalAction(packs,s,{type:'chooseEffectMode',mode:'retire'});
  assert.equal(s.pending?.kind,'effect-retire-bp');
  s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:victims[slot].uid});
 }
 paidRaid(firstTop,firstBase,0);
 const secondPlay=legalUniversalActions(packs,s).find(a=>a.type==='play'&&
  a.uid===secondBase.uid&&a.line==='energy'&&a.slot===3);
 assert.ok(secondPlay);
 s=dispatchUniversalAction(packs,s,secondPlay);
 paidRaid(secondTop,secondBase,1);
 assert.equal(universalAttackDamage(packs,s,s.players[0].front[0]),2);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),5000);
 const chilch=take(s,0,'BLC-2-040');
 chilch.ready=true;s.players[0].front[2]=chilch;
 const special=take(s,1,'MST-1-076'),secondLife=take(s,1,'MST-1-050');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.unshift(special,secondLife);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:firstTop.uid});
 assert.equal(s.pending?.kind,'block');
 const beforeLife=s.players[1].life.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-batch-order');
 assert.equal(s.publicReveals.length,2);
 assert.deepEqual(s.players[1].lifeRevealed.map(c=>c.uid),[special.uid,secondLife.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseLifeOrder',uid:special.uid},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 assert.equal(s.pending.uid,special.uid);
 assert.equal(s.pending.player,1);
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.ok(s.players[1].lifeRevealed.some(c=>c.uid===secondLife.uid));
 assert.equal(s.effectQueue.some(e=>e.op==='deployOutsideTraitlessRestOrRaid'),false,
  'LIFE leaving the life area is not 退場時');
 assert.equal(s.effectQueue.filter(e=>e.op==='additionalBattleDamage').length,0);
 assert.ok(s.effectQueue.some(e=>e.op==='lifeBatchStep'));
 return {s,chilch,attacker:firstTop,secondLife,beforeLife,special};
}

test('Q73 SPECIAL retirement draws BLC-2-040 before second revealed LIFE trigger resolves',()=>{
 let {s,chilch,secondLife,beforeLife}=reachSpecialLife();
 const drawn=s.players[0].deck[0];
 const ownDeck=s.players[0].deck.length,ownHand=s.players[0].hand.length;
 const choice=legalUniversalActions(packs,s).find(a=>a.mode==='special'&&a.uid===chilch.uid);
 assert.ok(choice);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'get'},{actor:1}),/not currently legal/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 s=dispatchUniversalAction(packs,s,choice,{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,secondLife.uid);
 assert.equal(s.pending.trigger,'get');
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn.uid),'onRetire draw finishes before the next LIFE');
 assert.equal(s.players[0].hand.filter(c=>c.uid===drawn.uid).length,1);
 assert.equal(s.players[0].deck.length,ownDeck-1);
 assert.equal(s.players[0].hand.length,ownHand+1);
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.ok(s.players[1].lifeRevealed.some(c=>c.uid===secondLife.uid));
 assert.ok(!s.players[1].hand.some(c=>c.uid===secondLife.uid));
 assert.equal(s.effectQueue.some(e=>e.op==='draw'),false);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===chilch.uid).length,1);
 assert.ok(s.players[0].outside.some(c=>c.uid===chilch.uid));
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 assert.ok(legalUniversalActions(packs,s).some(a=>a.mode==='skip'));
 assert.ok(legalUniversalActions(packs,s).some(a=>a.mode==='get'));
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===secondLife.uid));
 assert.equal(s.lifeRevealBatch,null);
 assert.equal(s.players[0].hand.filter(c=>c.uid===drawn.uid).length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('SPECIAL without onRetire does not duplicate already revealed Q73 LIFE',()=>{
 let {s,attacker,chilch,secondLife,beforeLife}=reachSpecialLife();
 const ownDeck=s.players[0].deck.length;
 const choice=legalUniversalActions(packs,s).find(a=>a.mode==='special'&&a.uid===attacker.uid);
 assert.ok(choice);
 s=dispatchUniversalAction(packs,s,choice,{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.uid,secondLife.uid);
 assert.equal(s.players[0].deck.length,ownDeck,'no printed onRetire means no draw');
 assert.equal(s.players[0].front[2]?.uid,chilch.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===attacker.uid));
 assert.equal(s.players[1].life.length,beforeLife-2);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===attacker.uid).length,1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===chilch.uid).length,0);
 assert.equal(s.effectQueue.some(e=>e.op==='draw'||e.op==='additionalBattleDamage'),false);
 assert.equal(countRetirementsThisTurn(s,'any','character'),3);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'skip'},{actor:1});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
