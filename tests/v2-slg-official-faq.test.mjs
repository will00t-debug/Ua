import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalPublicView} from '../dist/universal-v2/engine.mjs';

// Official UA51BT FAQ list checked 2026-10-26:
// https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT
// PASS here means this file reproduced that ruling on the shared V2 engine.
// It is not a certification of all 80 Solo Leveling cards. fullyAccepted stays 0.
const slg=createSlgV2Pack(),packs=[slg,slg];
const use=(s,a)=>dispatchUniversalAction(packs,s,a);

function countsFor(required){
 const fillers=Object.values(slg.cards).filter(c=>c.type==='character'&&
  (c.maxCopies??4)===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(slg,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card '+id);
}
function put(s,p,id,line,slot,{ready=true}={}){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function toPhase(counts,seed,phase,first=0){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first});
 for(let i=0;i<8&&s.phase!==phase;i++)s=use(s,{type:'next'});
 assert.equal(s.phase,phase);
 return s;
}
function live(s,card){
 const p=Number(String(card.uid).split('-')[0]);
 const found=[...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===card.uid);
 assert.ok(found,card.uid);
 return found;
}
function play(s,uid,line,slot){
 const action=legalUniversalActions(packs,s).find(a=>
  (a.type==='play'||a.type==='event')&&a.uid===uid&&
  (a.type==='event'||(a.line===line&&a.slot===slot)));
 assert.ok(action,'missing legal play '+uid);
 return use(s,action);
}
function secondAp(s,p=0){
 s.players[p].apCards[1].inPlay=true;
 s.players[p].apCards[1].ready=true;
}
function lifeTop(s,p,id){
 const c=take(s,p,id);
 s.players[p].deck.push(s.players[p].life.shift());
 s.players[p].life.unshift(c);
 return c;
}
function skipping(s,card){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===card.uid);
}
function clearBattle(s){
 while(s.pending?.kind==='effect-attack-aid')s=use(s,{type:'chooseAttackAid',mode:'skip'});
 if(s.pending?.kind==='block')s=use(s,{type:'chooseBlock',uid:null});
 while(s.pending?.kind==='life-trigger')s=use(s,{type:'chooseTrigger',mode:'skip'});
 return s;
}
function settle(s){
 let guard=0;
 while(s.pending&&guard++<24){
  const kind=s.pending.kind,player=s.pending.player;
  if(kind==='end-hand-limit'){
   s=use(s,{type:'chooseHandLimit',uid:s.players[player].hand[0].uid});
   continue;
  }
  if(kind==='effect-discard'){
   s=use(s,{type:'chooseDiscard',uid:s.players[player].hand[0].uid});
   continue;
  }
  const skip={
   'effect-discard-gate':{type:'chooseDiscardGate',uid:null},
   'effect-buff-own':{type:'chooseOwnBuff',uid:null},
   'effect-optional-mill':{type:'chooseOptionalMill',mode:'skip'},
   'effect-active-own-trait':{type:'chooseActiveOwnTrait',uid:null},
   'effect-attack-aid':{type:'chooseAttackAid',mode:'skip'},
   'effect-attack-aid-grant':{type:'chooseAttackAidGrant',uid:null},
   'life-trigger':{type:'chooseTrigger',mode:'skip'},
   'block':{type:'chooseBlock',uid:null},
   'effect-energy-skip-swap':{type:'chooseEnergySkipSwap',uid:null},
   'effect-choice-mode':{type:'chooseEffectMode',mode:'skip'},
   'effect-once-choice':{type:'chooseOnceEffect',mode:'skip'},
   'effect-recover-outside':{type:'chooseOutsideRecovery',uid:null},
   'effect-retire-bp':{type:'chooseRetireBp',uid:null},
   'effect-top-filter-many-choice':{type:'chooseTopFilteredMany',uid:null},
   'effect-top-order':{type:'chooseTopOrder',uid:s.pending.uids.find(uid=>!s.pending.order.includes(uid))}
  }[kind];
  if(!skip)throw Error('stuck on '+kind);
  s=use(s,skip);
 }
 return s;
}
function passTo(s,player,phase){
 let guard=0;
 while(!(s.active===player&&s.phase===phase)&&guard++<24){
  s=settle(s);
  if(s.active===player&&s.phase===phase)break;
  if(s.pending)throw Error('unsettled '+s.pending.kind);
  s=use(s,{type:'next'});
 }
 assert.equal(s.active,player);
 assert.equal(s.phase,phase);
 return s;
}
function lift(s,p,id){
 const pl=s.players[p];
 for(const zone of ['deck','hand','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i<0)continue;
  pl.deck.unshift(pl[zone].splice(i,1)[0]);
  return pl.deck[0];
 }
 throw Error('cannot lift '+id);
}

test('Q2027: 020 can add the card its own play cost just placed outside',()=>{
 const counts=countsFor(['SLG-1-020','SLG-1-006','SLG-1-032','SLG-1-028','SLG-1-015']);
 let s=toPhase(counts,82027,'main');
 put(s,0,'SLG-1-006','energy',0);
 put(s,0,'SLG-1-006','energy',1);
 const paid=toHand(s,0,'SLG-1-032');
 const high=take(s,0,'SLG-1-028'),named=take(s,0,'SLG-1-015');
 s.players[0].outside.push(high,named);
 const hero=toHand(s,0,'SLG-1-020');
 s=play(s,hero.uid,'front',0);
 assert.equal(s.pending.kind,'effect-discard-gate');
 s=use(s,{type:'chooseDiscardGate',uid:paid.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.ok(s.pending.choices.includes(paid.uid));
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(named.uid),false);
 s=use(s,{type:'chooseOutsideRecovery',uid:paid.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===paid.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===paid.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2031 and Q2034: Kaiser and Kiba aid from printed BP, not the current total',()=>{
 const counts=countsFor(['SLG-1-029','SLG-1-031','SLG-1-027','SLG-1-030']);
 for(const [id,seed] of [['SLG-1-029',82031],['SLG-1-031',82034]]){
  let s=toPhase(counts,seed,'attack');
  const aid=put(s,0,id,'energy',0);
  const high=put(s,0,'SLG-1-027','front',0);
  const low=put(s,0,'SLG-1-030','front',1);
  high.buffs=[{bp:-2500,untilTurn:s.turn}];
  low.buffs=[{bp:3000,untilTurn:s.turn}];
  assert.equal(universalBp(packs,s,high),500);
  assert.equal(universalBp(packs,s,low),4500);
  s=use(s,{type:'attack',uid:high.uid});
  assert.equal(s.pending.kind,'block');
  assert.equal(live(s,aid).ready,true);
  s=clearBattle(s);
  s=use(s,{type:'attack',uid:low.uid});
  assert.equal(s.pending.kind,'effect-attack-aid');
  assert.equal(live(s,aid).ready,true);
 }
});

test('Q2032: a character Kaiser made unchoosable is excluded from an effect that says 選び',()=>{
 const counts=countsFor(['SLG-1-029','SLG-1-030','SLG-1-015','SLG-1-039','SLG-1-055']);
 let s=toPhase(counts,82032,'attack');
 const kaiser=put(s,0,'SLG-1-029','energy',0);
 const soldier=put(s,0,'SLG-1-030','front',0);
 const other=put(s,0,'SLG-1-015','front',1);
 const blocker=put(s,1,'SLG-1-055','front',0);
 lifeTop(s,1,'SLG-1-039');
 s=use(s,{type:'attack',uid:soldier.uid});
 assert.equal(s.pending.kind,'effect-attack-aid');
 s=use(s,{type:'chooseAttackAid',mode:'immune'});
 s=use(s,{type:'chooseAttackAidGrant',uid:soldier.uid});
 assert.equal(s.pending.kind,'block');
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseBlock'&&a.uid===blocker.uid));
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 const legal=legalUniversalActions(packs,s).filter(a=>a.mode==='special').map(a=>a.uid);
 assert.ok(legal.includes(other.uid));
 assert.equal(legal.includes(soldier.uid),false);
 assert.throws(()=>use(s,{type:'chooseTrigger',mode:'special',uid:soldier.uid}),/not currently legal/);
 s=use(s,{type:'chooseTrigger',mode:'special',uid:other.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===other.uid));
 assert.equal(live(s,soldier).uid,soldier.uid);
 assert.equal(live(s,kaiser).ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2036 and Q2071: Bel counts printed BP of characters, and the field has none',()=>{
 const counts=countsFor(['SLG-1-033','SLG-1-030','SLG-1-035','SLG-1-028']);
 let s=toPhase(counts,82036,'attack');
 const bell=put(s,0,'SLG-1-033','front',0);
 put(s,0,'SLG-1-030','front',1,{ready:false});
 put(s,0,'SLG-1-030','front',2,{ready:false});
 put(s,0,'SLG-1-030','front',3,{ready:false});
 put(s,0,'SLG-1-035','energy',0,{ready:false});
 s=use(s,{type:'attack',uid:bell.uid});
 assert.equal(s.pending.kind,'block');
 s=clearBattle(s);
 const buffed=put(s,0,'SLG-1-030','energy',1,{ready:false});
 buffed.buffs=[{bp:5000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,buffed),6500);
 live(s,bell).ready=true;
 s=use(s,{type:'attack',uid:bell.uid});
 assert.equal(s.pending.kind,'effect-discard-gate');

 let miss=toPhase(counts,82037,'attack');
 const lone=put(miss,0,'SLG-1-033','front',0);
 put(miss,0,'SLG-1-030','front',1,{ready:false});
 put(miss,0,'SLG-1-030','front',2,{ready:false});
 put(miss,0,'SLG-1-030','front',3,{ready:false});
 const high=put(miss,0,'SLG-1-028','energy',0,{ready:false});
 high.buffs=[{bp:-3000,untilTurn:miss.turn}];
 assert.equal(universalBp(packs,miss,high),1000);
 miss=use(miss,{type:'attack',uid:lone.uid});
 assert.equal(miss.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,miss),true);
});

test('Q2040: a facedown card 044 places under 水篠 旬 is visible only to its owner',()=>{
 const counts=countsFor(['SLG-1-044','SLG-1-041','SLG-1-045','SLG-1-055']);
 let s=toPhase(counts,82040,'main');
 put(s,0,'SLG-1-041','energy',0);
 put(s,0,'SLG-1-041','energy',1);
 const host=put(s,0,'SLG-1-045','front',1);
 const aoi=toHand(s,0,'SLG-1-044');
 s=play(s,aoi.uid,'front',0);
 assert.equal(s.pending.kind,'effect-discard');
 s=use(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 const hidden=take(s,0,'SLG-1-055');
 s.players[0].deck.unshift(hidden);
 live(s,aoi).ready=true;
 s=use(s,{type:'activate',uid:aoi.uid,mode:'restTuckDamage'});
 s=use(s,{type:'chooseTuckDamage',uid:host.uid});
 const slot=s.players[0].front.findIndex(c=>c?.uid===host.uid);
 const owner=universalPublicView(packs,s,0).players[0].front[slot].underLayers.at(-1);
 const foe=universalPublicView(packs,s,1).players[0].front[slot].underLayers.at(-1);
 assert.equal(owner.cardId,'SLG-1-055');
 assert.equal(owner.uid,hidden.uid);
 assert.deepEqual(foe,{faceDown:true});
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2041: a facedown card tucked by 047 is visible only to its owner',()=>{
 const counts=countsFor(['SLG-1-047','SLG-1-045','SLG-1-053','SLG-1-055']);
 let s=toPhase(counts,82041,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 const hidden=toHand(s,0,'SLG-1-055');
 const sung=toHand(s,0,'SLG-1-047');
 const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===sung.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 s=use(s,raid);
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
 assert.equal(s.pending.kind,'effect-tuck-hand-under');
 s=use(s,{type:'chooseTuckHand',uid:hidden.uid});
 const owner=universalPublicView(packs,s,0).players[0].front[0].underLayers.at(-1);
 const foe=universalPublicView(packs,s,1).players[0].front[0].underLayers.at(-1);
 assert.equal(owner.cardId,'SLG-1-055');
 assert.equal(owner.uid,hidden.uid);
 assert.deepEqual(foe,{faceDown:true});
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2055 and Q2056: 057 gains the skip on play, 058 spends that skip once, and the second copy stays off',()=>{
 const counts=countsFor(['SLG-1-057','SLG-1-058','SLG-1-041','SLG-1-062','SLG-1-054','SLG-1-063','SLG-1-056']);
 let s=toPhase(counts,82055,'main');
 secondAp(s);
 put(s,0,'SLG-1-041','energy',0);
 put(s,0,'SLG-1-041','energy',1);
 put(s,0,'SLG-1-062','energy',2);
 put(s,0,'SLG-1-054','energy',3);
 put(s,0,'SLG-1-063','front',0);
 put(s,0,'SLG-1-056','front',1);
 const shizuku=toHand(s,0,'SLG-1-057');
 s=play(s,shizuku.uid,'front',2);
 assert.equal(live(s,shizuku).ready,true);
 assert.equal(live(s,shizuku).attackSkipGranted,undefined);
 assert.equal(skipping(s,shizuku),true);
 const raider=toHand(s,0,'SLG-1-058');
 s=play(s,raider.uid,'front',3);
 live(s,raider).ready=true;
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:shizuku.uid});
 s=clearBattle(s);
 assert.equal(live(s,shizuku).ready,false);
 assert.equal(skipping(s,shizuku),true);
 s=use(s,{type:'attack',uid:raider.uid});
 assert.equal(s.pending.kind,'effect-once-choice');
 s=use(s,{type:'chooseOnceEffect',mode:'activate'});
 const discarded=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscardGate'&&a.uid);
 s=use(s,discarded);
 assert.equal(s.pending.kind,'effect-active-skip-pair');
 assert.ok(s.pending.choices.includes(shizuku.uid));
 s=use(s,{type:'chooseActiveSkipPair',uid:shizuku.uid});
 assert.equal(live(s,shizuku).ready,false);
 assert.equal(skipping(s,shizuku),false);
 s=clearBattle(s);
 s=use(s,{type:'next'});
 if(s.pending?.kind==='end-hand-limit')s=settle(s);
 assert.equal(live(s,shizuku).ready,true);

 let again=toPhase(counts,82056,'main');
 secondAp(again);
 put(again,0,'SLG-1-062','energy',0);put(again,0,'SLG-1-054','energy',1);
 put(again,0,'SLG-1-063','energy',2);put(again,0,'SLG-1-056','energy',3);
 const first=toHand(again,0,'SLG-1-057');
 again=play(again,first.uid,'front',0);
 const second=toHand(again,0,'SLG-1-057');
 again=play(again,second.uid,'front',1);
 assert.equal(live(again,second).ready,false);
 assert.equal(skipping(again,second),false);
 assert.equal(live(again,first).ready,true);
 assert.equal(skipping(again,first),true);
});

test('Q2058: 059 skips the next ACTIVE once, then a later refresh actives it',()=>{
 const counts=countsFor(['SLG-1-059','SLG-1-053','SLG-1-065','SLG-1-056','SLG-1-057','SLG-1-060']);
 let s=toPhase(counts,82058,'main');
 secondAp(s);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-065','energy',1);
 put(s,0,'SLG-1-056','energy',2);
 const tiger=toHand(s,0,'SLG-1-059');
 s=play(s,tiger.uid,'front',0);
 const paid=legalUniversalActions(packs,s).find(a=>a.type==='chooseDiscardGate'&&a.uid);
 s=use(s,paid);
 assert.equal(live(s,tiger).ready,true);
 s=use(s,{type:'next'});
 lift(s,0,'SLG-1-057');
 lift(s,0,'SLG-1-060');
 s=use(s,{type:'attack',uid:tiger.uid});
 const first=s.pending.choices[0];
 const second=s.pending.choices.find(uid=>uid!==first);
 s=use(s,{type:'chooseTopFilteredMany',uid:first});
 s=use(s,{type:'chooseTopFilteredMany',uid:second});
 while(s.pending?.kind==='effect-top-order')
  s=use(s,{type:'chooseTopOrder',uid:s.pending.uids.find(uid=>!s.pending.order.includes(uid))});
 assert.equal(skipping(s,tiger),true);
 s=clearBattle(s);
 s=use(s,{type:'next'});
 if(s.pending?.kind==='end-hand-limit')s=settle(s);
 assert.equal(s.active,1);
 assert.equal(live(s,tiger).ready,false);
 assert.equal(skipping(s,tiger),false);
 s=passTo(s,0,'start');
 assert.equal(live(s,tiger).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2059: 060 can swap only while the skip remains, and the following refresh actives',()=>{
 const counts=countsFor(['SLG-1-060','SLG-1-057','SLG-1-062','SLG-1-054','SLG-1-063','SLG-1-056']);
 let s=toPhase(counts,82059,'main');
 const energy=put(s,0,'SLG-1-060','energy',0);
 put(s,0,'SLG-1-062','energy',1);
 put(s,0,'SLG-1-054','energy',2);
 put(s,0,'SLG-1-063','energy',3);
 const plain=put(s,0,'SLG-1-056','front',1);
 const actor=toHand(s,0,'SLG-1-057');
 s=play(s,actor.uid,'front',0);
 assert.equal(skipping(s,actor),true);
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:actor.uid});
 s=clearBattle(s);
 s=use(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-energy-skip-swap');
 assert.deepEqual(s.pending.choices.map(c=>c.uid),[actor.uid]);
 assert.equal(s.pending.choices.some(c=>c.uid===plain.uid),false);
 s=use(s,{type:'chooseEnergySkipSwap',uid:null});
 if(s.pending?.kind==='end-hand-limit')s=settle(s);
 assert.equal(s.players[0].energy[0].uid,energy.uid);
 assert.equal(live(s,actor).ready,false);
 assert.equal(skipping(s,actor),false);
 s=passTo(s,0,'attack');
 assert.equal(live(s,actor).ready,true);
 s=use(s,{type:'attack',uid:actor.uid});
 s=clearBattle(s);
 s=use(s,{type:'next'});
 assert.notEqual(s.pending?.kind,'effect-energy-skip-swap');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q2060: 064 grants the skip only for a chosen mode, and the next refresh after that stays REST once',()=>{
 const counts=countsFor(['SLG-1-064','SLG-1-041','SLG-1-050']);
 let s=toPhase(counts,82060,'main');
 put(s,0,'SLG-1-041','energy',0);
 put(s,0,'SLG-1-041','energy',1);
 put(s,1,'SLG-1-050','front',0);
 const mako=toHand(s,0,'SLG-1-064');
 s=play(s,mako.uid,'front',0);
 assert.equal(skipping(s,mako),false);
 live(s,mako).ready=true;
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:mako.uid});
 assert.equal(s.pending.kind,'effect-choice-mode');
 s=use(s,{type:'chooseEffectMode',mode:'skip'});
 assert.equal(skipping(s,mako),false);
 s=clearBattle(s);
 live(s,mako).ready=true;
 s=use(s,{type:'attack',uid:mako.uid});
 s=use(s,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(skipping(s,mako),true);
 if(s.pending?.kind==='effect-retire-bp')s=use(s,{type:'chooseRetireBp',uid:null});
 s=clearBattle(s);
 s=use(s,{type:'next'});
 if(s.pending?.kind==='end-hand-limit')s=settle(s);
 assert.equal(live(s,mako).ready,false);
 assert.equal(skipping(s,mako),false);
 s=passTo(s,0,'start');
 assert.equal(live(s,mako).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
