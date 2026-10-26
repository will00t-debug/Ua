import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,zoneRequiredEnergy,effectiveHandRequiredEnergy,
 universalPublicView,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// The last six Solo Leveling prints. Official pages checked 2026-10-26.
// Q2029, Q2038, Q2057, Q2060, Q2063 and Q2064 are the behaviour pins.
// Passing tests are not full FAQ certification. fullyAccepted stays 0.
const slg=createSlgV2Pack(),packs=[slg,slg];
const batch=['SLG-1-022','SLG-1-034','SLG-1-058','SLG-1-064','SLG-1-073','SLG-1-075'];
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
function handOf(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function lifeTop(s,p,id){
 const c=take(s,p,id);
 s.players[p].deck.push(s.players[p].life.shift());
 s.players[p].life.unshift(c);
 return c;
}
function modes(s,uid){
 return legalUniversalActions(packs,s).filter(a=>a.type==='activate'&&a.uid===uid).map(a=>a.mode);
}
function skipping(s,card){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===card.uid);
}
function fillOutside(s,p,n){
 const pl=s.players[p];
 while(pl.outside.length<n){
  assert.ok(pl.deck.length);
  pl.outside.push(pl.deck.pop());
 }
}

test('the last six Solo Leveling prints are registered on the shared engine',()=>{
 for(const id of batch){
  const cat=SOLO_LEVELING_CARDS.find(c=>c.id===id);
  const card=slg.cards[id];
  assert.equal(card.name,cat.nameJa);
  assert.equal(card.energy,cat.energy);
  assert.equal(card.ap,cat.ap);
  assert.equal(card.bp,cat.bp??0);
  assert.equal(card.gen,cat.gen);
  assert.equal(card.trigger,cat.trigger);
  assert.equal(EXPECTED_V2_IDS['solo-leveling'].includes(id),true);
 }
 assert.equal(slg.cards['SLG-1-022'].fieldTraitEnergyDiscount.trait,'影の軍団');
 assert.equal(slg.cards['SLG-1-022'].energyAttackSwap.trait,'影の軍団');
 assert.equal(slg.cards['SLG-1-022'].printedImpact,1);
 assert.equal(slg.cards['SLG-1-022'].traits.length,0);
 assert.equal(slg.cards['SLG-1-034'].enterAlwaysActive,true);
 assert.equal(slg.cards['SLG-1-034'].mainAbility.eventName,'命の神水');
 assert.deepEqual(slg.cards['SLG-1-058'].traits,['第四次架南島レイド']);
 assert.equal(slg.cards['SLG-1-058'].effects.onAttack[0].scope,'card');
 assert.equal(slg.cards['SLG-1-064'].effects.onAttack[0].options[1].then[1].op,'retireOppFrontOneUnderBp');
 assert.deepEqual(slg.cards['SLG-1-073'].traitComponents,['DFN','第四次架南島レイド']);
 assert.equal(slg.cards['SLG-1-073'].frontRetireHandGrant.retiredLacks,'DFN');
 assert.equal(slg.cards['SLG-1-073'].effects.onPlay[0].scope,'name');
 assert.equal(slg.cards['SLG-1-075'].mainAbility.recoverEnergy,0);
 assert.equal(slg.cards['SLG-1-075'].enterAlwaysActive,false);
 assert.equal(Object.keys(slg.cards).length,80);
 assert.equal(EXPECTED_V2_IDS['solo-leveling'].length,80);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.match(V2_PENDING_LABELS['effect-energy-trait-swap'],/交換/);
 assert.match(V2_PENDING_LABELS['effect-release-facedown'],/裏向/);
 assert.match(uiActionLabel({type:'activate',mode:'fieldMill'}),/牌庫頂/);
 assert.match(uiActionLabel({type:'activate',mode:'fieldOutsideEvent'}),/命の神水|場外/);
 assert.match(uiActionLabel({type:'activate',mode:'fieldTuck'}),/裏向/);
 assert.match(uiActionLabel({type:'chooseReleaseFacedown',uid:null}),/不放出/);
});

test('022 discounts every zone except the field and outside, then actives both lines',()=>{
 const counts=countsFor(['SLG-1-022','SLG-1-030','SLG-1-006','SLG-1-027','SLG-1-015']);
 let s=toPhase(counts,7022,'main');
 const shadows=[0,1,2,3].map(slot=>put(s,0,'SLG-1-030','front',slot,{ready:slot!==3}));
 const iron=put(s,0,'SLG-1-027','energy',0,{ready:false});
 put(s,0,'SLG-1-006','energy',1);
 put(s,0,'SLG-1-006','energy',2);
 put(s,0,'SLG-1-006','energy',3);
 const printed=slg.cards['SLG-1-022'];
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'hand'),7);
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'life'),7);
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'deck'),7);
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'field'),12);
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'outside'),12);
 assert.equal(effectiveHandRequiredEnergy(packs,s,0,printed),7);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:shadows[0].uid,targetUid:shadows[0].uid,sourceLinked:false,
  until:{player:0,phase:'attack',edge:'end'}});
 assert.equal(zoneRequiredEnergy(packs,s,0,printed,'hand'),7,'silence keeps the printed trait');
 const sung=handOf(s,0,'SLG-1-022');
 s=play(s,sung.uid,'front',0);
 assert.equal(s.pending.kind,'effect-active-lines');
 assert.equal(s.pending.line,'front');
 s=use(s,{type:'chooseActiveLines',uid:shadows[3].uid});
 assert.equal(s.pending.line,'energy');
 s=use(s,{type:'chooseActiveLines',uid:iron.uid});
 assert.equal(s.pending,null);
 assert.equal(live(s,shadows[3]).ready,true);
 assert.equal(live(s,iron).ready,true);
 assert.equal(live(s,sung).sniperGranted.turn,s.turn);
 const foeA=put(s,1,'SLG-1-015','front',0);
 const foeB=put(s,1,'SLG-1-006','front',1);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 live(s,sung).ready=true;
 const shots=legalUniversalActions(packs,s).filter(a=>a.type==='attack'&&a.uid===sung.uid&&a.targetUid);
 assert.deepEqual(shots.map(a=>a.targetUid).sort(),[foeA.uid,foeB.uid].sort());
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('022 life raid uses the same discount, and Q2029 offers the swap after the life trigger',()=>{
 const counts=countsFor(['SLG-1-022','SLG-1-030','SLG-1-006','SLG-1-027','SLG-1-035','SLG-1-015','SLG-1-055']);
 let legal=toPhase(counts,70220,'attack');
 const base=put(legal,1,'SLG-1-015','front',0);
 put(legal,1,'SLG-1-030','front',1);
 put(legal,1,'SLG-1-030','front',2);
 put(legal,1,'SLG-1-030','front',3);
 put(legal,1,'SLG-1-027','energy',0);
 put(legal,1,'SLG-1-035','energy',1);
 put(legal,1,'SLG-1-006','energy',2);
 put(legal,1,'SLG-1-006','energy',3);
 const revealed=lifeTop(legal,1,'SLG-1-022');
 assert.equal(zoneRequiredEnergy(packs,legal,1,slg.cards['SLG-1-022'],'life'),7);
 const attacker=put(legal,0,'SLG-1-006','front',0);
 legal=use(legal,{type:'attack',uid:attacker.uid});
 legal=use(legal,{type:'chooseBlock',uid:null});
 assert.equal(legal.pending.kind,'life-trigger');
 assert.equal(legal.pending.trigger,'raid');
 const raid=legalUniversalActions(packs,legal).find(a=>a.type==='chooseTrigger'&&
  a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(raid);
 legal=use(legal,raid);
 assert.equal(legal.players[1].front[0].cardId,'SLG-1-022');
 assert.equal(legal.players[1].front[0].stack[0].uid,base.uid);
 assert.equal(legal.players[1].outside.some(c=>c.uid===revealed.uid),false);
 assert.equal(legal.pending.kind,'effect-active-lines');

 let short=toPhase(counts,70221,'attack');
 put(short,1,'SLG-1-015','front',0);
 put(short,1,'SLG-1-030','front',1);
 put(short,1,'SLG-1-030','front',2);
 put(short,1,'SLG-1-030','front',3);
 put(short,1,'SLG-1-027','energy',0);
 put(short,1,'SLG-1-035','energy',1);
 put(short,1,'SLG-1-006','energy',2,{ready:false});
 put(short,1,'SLG-1-006','energy',3);
 lifeTop(short,1,'SLG-1-022');
 const poke=put(short,0,'SLG-1-006','front',0);
 assert.equal(zoneRequiredEnergy(packs,short,1,slg.cards['SLG-1-022'],'life'),7);
 short=use(short,{type:'attack',uid:poke.uid});
 short=use(short,{type:'chooseBlock',uid:null});
 const raidModes=legalUniversalActions(packs,short).filter(a=>a.type==='chooseTrigger'&&a.mode==='raid');
 assert.equal(raidModes.length,0);
 assert.ok(legalUniversalActions(packs,short).some(a=>a.type==='chooseTrigger'&&a.mode==='skip'));

 let swap=toPhase(counts,70222,'attack');
 const first=put(swap,0,'SLG-1-022','energy',0);
 const second=put(swap,0,'SLG-1-022','energy',1);
 const frontA=put(swap,0,'SLG-1-030','front',1);
 put(swap,0,'SLG-1-030','front',2);
 const striker=put(swap,0,'SLG-1-006','front',0);
 lifeTop(swap,1,'SLG-1-055');
 swap=use(swap,{type:'attack',uid:striker.uid});
 assert.equal(swap.pending.kind,'block');
 swap=use(swap,{type:'chooseBlock',uid:null});
 assert.equal(swap.pending.kind,'life-trigger');
 assert.equal(swap.pending.player,1);
 swap=use(swap,{type:'chooseTrigger',mode:'skip'});
 assert.equal(swap.pending.kind,'effect-energy-trait-swap');
 assert.equal(swap.pending.sourceUid,first.uid);
 swap=use(swap,{type:'chooseEnergyTraitSwap',uid:null});
 assert.equal(swap.pending.kind,'effect-energy-trait-swap');
 assert.equal(swap.pending.sourceUid,second.uid);
 swap=use(swap,{type:'chooseEnergyTraitSwap',uid:frontA.uid});
 assert.equal(swap.players[0].energy[0].uid,first.uid);
 assert.equal(swap.players[0].energy[1].uid,frontA.uid);
 assert.equal(swap.players[0].front[1].uid,second.uid);
 assert.equal(swap.pending,null);

 let none=toPhase(counts,70223,'attack');
 const lonely=put(none,0,'SLG-1-022','energy',0);
 const plain=put(none,0,'SLG-1-006','front',0);
 lifeTop(none,1,'SLG-1-006');
 none=use(none,{type:'attack',uid:plain.uid});
 none=use(none,{type:'chooseBlock',uid:null});
 assert.equal(none.pending,null);
 assert.equal(none.players[0].energy[0].uid,lonely.uid);
});

test('034 checks twenty outside cards before the hand cost and removes the played event',()=>{
 const counts=countsFor(['SLG-1-034','SLG-1-006','SLG-1-030','SLG-1-037']);
 let s=toPhase(counts,7034,'main');
 put(s,0,'SLG-1-006','energy',0);
 put(s,0,'SLG-1-030','energy',1);
 const castle=handOf(s,0,'SLG-1-034');
 s=play(s,castle.uid,'energy',2);
 assert.equal(live(s,castle).ready,true);
 assert.equal(s.pending,null);
 const water=take(s,0,'SLG-1-037');
 s.players[0].outside.push(water);
 fillOutside(s,0,19);
 assert.deepEqual(modes(s,castle.uid),['fieldMill']);
 assert.throws(()=>use(s,{type:'activate',uid:castle.uid,mode:'fieldOutsideEvent'}));
 fillOutside(s,0,20);
 assert.ok(modes(s,castle.uid).includes('fieldOutsideEvent'));
 s=use(s,{type:'activate',uid:castle.uid,mode:'fieldOutsideEvent'});
 assert.equal(live(s,castle).ready,false);
 assert.equal(s.pending.kind,'effect-pay-hand-outside');
 const paid=s.players[0].hand[0];
 s=use(s,{type:'choosePayHandOutside',uid:paid.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===paid.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===water.uid));
 live(s,castle).ready=true;
 const top=s.players[0].deck[0];
 s=use(s,{type:'activate',uid:castle.uid,mode:'fieldMill'});
 assert.equal(s.players[0].outside.at(-1).uid,top.uid);
 assert.ok(s.mainReadyOnceByName[0].includes(castle.uid+'|fieldMill'));
 live(s,castle).ready=true;
 assert.equal(modes(s,castle.uid).includes('fieldMill'),false);
 assert.ok(modes(s,castle.uid).includes('fieldOutsideEvent'));
 secondAp(s);
 if(!s.players[0].hand.length)s.players[0].hand.push(s.players[0].deck.pop());
 s=use(s,{type:'activate',uid:castle.uid,mode:'fieldOutsideEvent'});
 const cost=legalUniversalActions(packs,s).find(a=>a.type==='choosePayHandOutside');
 s=use(s,cost);
 assert.equal(s.pending.kind,'effect-play-outside-event');
 assert.ok(s.pending.choices.includes(water.uid));
 s=use(s,{type:'choosePlayOutsideEvent',uid:water.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 s=use(s,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].removed.some(c=>c.uid===water.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===water.uid),false);
 assert.equal(s.players[0].resolvingEvents.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('058 spends its attack use only after the player accepts, then applies ACTIVE once',()=>{
 const counts=countsFor(['SLG-1-058','SLG-1-041','SLG-1-050']);
 let entered=toPhase(counts,7058,'main');
 put(entered,0,'SLG-1-041','energy',0);
 put(entered,0,'SLG-1-041','energy',1);
 const shizuku=handOf(entered,0,'SLG-1-058');
 entered=play(entered,shizuku.uid,'front',0);
 assert.equal(universalBp(packs,entered,live(entered,shizuku)),5000);
 assert.equal(entered.pending,null);

 let skipped=toPhase(counts,70580,'main');
 put(skipped,0,'SLG-1-041','energy',0);
 put(skipped,0,'SLG-1-041','energy',1);
 const once=handOf(skipped,0,'SLG-1-058');
 skipped=play(skipped,once.uid,'front',0);
 const pl=skipped.players[0];
 pl.deck.push(...pl.hand);
 pl.hand=[];
 live(skipped,once).ready=true;
 skipped=use(skipped,{type:'next'});
 skipped=use(skipped,{type:'attack',uid:once.uid});
 assert.equal(skipped.pending.kind,'block');
 assert.equal(skipped.onceEffectUses[0].includes('uid:'+once.uid),false);

 let pair=toPhase(counts,70581,'main');
 put(pair,0,'SLG-1-041','energy',0);
 put(pair,0,'SLG-1-041','energy',1);
 const ally=put(pair,0,'SLG-1-050','front',1,{ready:false});
 const attacker=handOf(pair,0,'SLG-1-058');
 pair=play(pair,attacker.uid,'front',0);
 assert.ok(pair.players[0].hand.length>=1);
 live(pair,attacker).ready=true;
 pair=use(pair,{type:'next'});
 grantContinuousState(pair,{kind:'skipNextActive',controller:0,
  sourceUid:attacker.uid,targetUid:ally.uid,sourceLinked:false,until:null});
 pair=use(pair,{type:'attack',uid:attacker.uid});
 assert.equal(pair.pending.kind,'effect-once-choice');
 pair=use(pair,{type:'chooseOnceEffect',mode:'skip'});
 assert.equal(pair.onceEffectUses[0].includes('uid:'+attacker.uid),false);
 assert.equal(pair.pending.kind,'block');
 pair=toPhase(counts,70582,'main');
 put(pair,0,'SLG-1-041','energy',0);
 put(pair,0,'SLG-1-041','energy',1);
 const marked=put(pair,0,'SLG-1-050','front',1,{ready:false});
 const body=handOf(pair,0,'SLG-1-058');
 pair=play(pair,body.uid,'front',0);
 live(pair,body).ready=true;
 pair=use(pair,{type:'next'});
 grantContinuousState(pair,{kind:'skipNextActive',controller:0,
  sourceUid:body.uid,targetUid:marked.uid,sourceLinked:false,until:null});
 pair=use(pair,{type:'attack',uid:body.uid});
 pair=use(pair,{type:'chooseOnceEffect',mode:'activate'});
 assert.ok(pair.onceEffectUses[0].includes('uid:'+body.uid));
 assert.equal(pair.pending.kind,'effect-discard-gate');
 const discard=legalUniversalActions(packs,pair).find(a=>a.type==='chooseDiscardGate'&&a.uid);
 pair=use(pair,discard);
 assert.equal(pair.pending.kind,'effect-active-skip-pair');
 pair=use(pair,{type:'chooseActiveSkipPair',uid:marked.uid});
 assert.equal(live(pair,marked).ready,false);
 assert.equal(live(pair,body).ready,true);
 assert.equal(skipping(pair,marked),false);
 assert.equal(pair.pending.kind,'block');

 let self=toPhase(counts,70583,'main');
 put(self,0,'SLG-1-041','energy',0);
 put(self,0,'SLG-1-041','energy',1);
 const own=handOf(self,0,'SLG-1-058');
 self=play(self,own.uid,'front',0);
 live(self,own).ready=true;
 self=use(self,{type:'next'});
 grantContinuousState(self,{kind:'skipNextActive',controller:0,
  sourceUid:own.uid,targetUid:own.uid,sourceLinked:false,until:null});
 self=use(self,{type:'attack',uid:own.uid});
 self=use(self,{type:'chooseOnceEffect',mode:'activate'});
 const gone=legalUniversalActions(packs,self).find(a=>a.type==='chooseDiscardGate'&&a.uid);
 self=use(self,gone);
 self=use(self,{type:'chooseActiveSkipPair',uid:own.uid});
 assert.equal(live(self,own).ready,false);
 assert.equal(skipping(self,own),false);
 assert.equal(self.pending.kind,'block');
});

test('064 debuffs only at five traits, and an attack mode is what grants the skip',()=>{
 const counts=countsFor(['SLG-1-064','SLG-1-041','SLG-1-056','SLG-1-069','SLG-1-060','SLG-1-062','SLG-1-015','SLG-1-050']);
 let full=toPhase(counts,7064,'main');
 put(full,0,'SLG-1-041','energy',0);
 put(full,0,'SLG-1-041','energy',1);
 put(full,0,'SLG-1-060','energy',2);
 put(full,0,'SLG-1-062','energy',3);
 put(full,0,'SLG-1-056','front',0);
 put(full,0,'SLG-1-069','front',1);
 put(full,1,'SLG-1-015','front',0);
 put(full,1,'SLG-1-050','front',1);
 const mako=handOf(full,0,'SLG-1-064');
 full=play(full,mako.uid,'front',2);
 assert.equal(universalBp(packs,full,full.players[1].front[0]),500);
 assert.equal(universalBp(packs,full,full.players[1].front[1]),500);
 live(full,mako).ready=true;
 full=use(full,{type:'next'});
 full=use(full,{type:'attack',uid:mako.uid});
 assert.equal(full.pending.kind,'effect-choice-mode');
 full=use(full,{type:'chooseEffectMode',mode:'skip'});
 assert.equal(skipping(full,mako),false);
 assert.equal(full.pending.kind,'block');

 let retire=toPhase(counts,70640,'main');
 put(retire,0,'SLG-1-041','energy',0);
 put(retire,0,'SLG-1-041','energy',1);
 put(retire,0,'SLG-1-060','energy',2);
 put(retire,0,'SLG-1-062','energy',3);
 put(retire,0,'SLG-1-056','front',0);
 put(retire,0,'SLG-1-069','front',1);
 put(retire,1,'SLG-1-015','front',0);
 const victim=put(retire,1,'SLG-1-050','front',1);
 const retiring=handOf(retire,0,'SLG-1-064');
 retire=play(retire,retiring.uid,'front',2);
 live(retire,retiring).ready=true;
 retire=use(retire,{type:'next'});
 retire=use(retire,{type:'attack',uid:retiring.uid});
 retire=use(retire,{type:'chooseEffectMode',mode:'retire'});
 assert.equal(skipping(retire,retiring),true);
 assert.equal(retire.pending.kind,'effect-retire-bp');
 retire=use(retire,{type:'chooseRetireBp',uid:victim.uid});
 assert.ok(retire.players[1].outside.some(c=>c.uid===victim.uid));
 assert.equal(retire.pending.kind,'block');

 let replay=toPhase(counts,70641,'main');
 put(replay,0,'SLG-1-041','energy',0);
 put(replay,0,'SLG-1-041','energy',1);
 put(replay,0,'SLG-1-060','energy',2);
 put(replay,0,'SLG-1-056','front',0);
 put(replay,0,'SLG-1-069','front',1);
 put(replay,1,'SLG-1-015','front',0);
 put(replay,1,'SLG-1-050','front',1);
 const again=handOf(replay,0,'SLG-1-064');
 replay=play(replay,again.uid,'front',2);
 assert.equal(universalBp(packs,replay,replay.players[1].front[0]),1500);
 put(replay,0,'SLG-1-062','energy',3);
 live(replay,again).ready=true;
 replay=use(replay,{type:'next'});
 replay=use(replay,{type:'attack',uid:again.uid});
 replay=use(replay,{type:'chooseEffectMode',mode:'replay'});
 assert.equal(skipping(replay,again),true);
 assert.equal(universalBp(packs,replay,replay.players[1].front[0]),500);
 assert.equal(universalBp(packs,replay,replay.players[1].front[1]),500);
 assert.equal(replay.pending.kind,'block');
});

test('073 shares its entry once per name, and a front retirement grants a same-turn hand return',()=>{
 const counts=countsFor(['SLG-1-073','SLG-1-041','SLG-1-056','SLG-1-069','SLG-1-072','SLG-1-023','SLG-1-004']);
 let high=toPhase(counts,7073,'main');
 put(high,0,'SLG-1-041','energy',0);
 put(high,0,'SLG-1-041','energy',1);
 secondAp(high);
 const first=handOf(high,0,'SLG-1-073');
 while(high.players[0].hand.length<8)high.players[0].hand.push(high.players[0].deck.pop());
 high=play(high,first.uid,'front',0);
 assert.equal(high.players[0].hand.length>=7,true);
 assert.equal(high.pending.kind,'effect-buff-own');
 assert.ok(high.onceEffectUses[0].includes('name:リュー'));
 high=use(high,{type:'chooseOwnBuff',uid:first.uid});
 assert.equal(universalBp(packs,high,live(high,first)),5000);
 assert.equal(high.pending.kind,'effect-recover-ap');
 const resting=high.players[0].apCards.filter(c=>c.inPlay&&!c.ready).map(c=>c.uid);
 assert.equal(resting.length,2);
 high=use(high,{type:'chooseApRecovery',uid:resting[0]});
 high=use(high,{type:'chooseApRecovery',uid:resting[1]});
 assert.equal(high.pending,null);
 const copy=handOf(high,0,'SLG-1-073');
 high=play(high,copy.uid,'front',1);
 assert.equal(high.pending,null);
 assert.equal(live(high,copy).ready,true);
 assert.equal(universalBp(packs,high,live(high,copy)),4000);
 assert.equal(high.onceEffectUses[0].filter(k=>k==='name:リュー').length,1);

 let low=toPhase(counts,70730,'main');
 put(low,0,'SLG-1-041','energy',0);
 put(low,0,'SLG-1-041','energy',1);
 secondAp(low);
 const lonely=handOf(low,0,'SLG-1-073');
 const owner=low.players[0];
 owner.deck.push(...owner.hand.filter(c=>c.uid!==lonely.uid));
 owner.hand=owner.hand.filter(c=>c.uid===lonely.uid);
 low=play(low,lonely.uid,'front',0);
 assert.equal(low.pending.kind,'effect-buff-own');
 low=use(low,{type:'chooseOwnBuff',uid:null});
 assert.equal(low.pending,null);
 assert.equal(universalBp(packs,low,live(low,lonely)),4000);

 let battle=toPhase(counts,70731,'attack',1);
 const ryu=put(battle,0,'SLG-1-073','front',0);
 const wall=put(battle,0,'SLG-1-056','front',1);
 const ken=put(battle,0,'SLG-1-069','front',2);
 const beater=put(battle,1,'SLG-1-023','front',0);
 const follow=put(battle,1,'SLG-1-004','front',1);
 battle=use(battle,{type:'attack',uid:beater.uid});
 battle=use(battle,{type:'chooseBlock',uid:wall.uid});
 assert.equal(battle.pending,null);
 assert.ok(battle.players[0].outside.some(c=>c.uid===wall.uid));
 assert.equal(battle.players[0].hand.some(c=>c.uid===wall.uid),false);
 assert.equal(live(battle,ken).retireToHandTurn,battle.turn);
 assert.equal(live(battle,ryu).retireToHandTurn,battle.turn);
 const late=put(battle,0,'SLG-1-072','front',1);
 assert.equal(late.retireToHandTurn,undefined);
 battle=use(battle,{type:'attack',uid:follow.uid});
 battle=use(battle,{type:'chooseBlock',uid:ken.uid});
 assert.ok(battle.players[0].hand.some(c=>c.uid===ken.uid));
 assert.equal(battle.players[0].outside.some(c=>c.uid===ken.uid),false);
 assert.ok(battle.players[0].outside.some(c=>c.uid===wall.uid));
 assert.equal(live(battle,late).retireToHandTurn,undefined);
 assert.equal(assertUniversalMatch(packs,battle),true);
});

test('075 tucks facedown under itself and recovers only an energy-0 水篠 旬',()=>{
 const counts=countsFor(['SLG-1-075','SLG-1-055','SLG-1-019','SLG-1-015']);
 let s=toPhase(counts,7075,'main');
 put(s,0,'SLG-1-055','energy',0);
 const quest=handOf(s,0,'SLG-1-075');
 s=play(s,quest.uid,'energy',1);
 assert.equal(live(s,quest).ready,false);
 assert.deepEqual(modes(s,quest.uid),[]);
 live(s,quest).ready=true;
 assert.equal(modes(s,quest.uid).includes('fieldTuck'),false);
 const named=put(s,0,'SLG-1-019','front',0);
 assert.ok(modes(s,quest.uid).includes('fieldTuck'));
 const hidden=take(s,0,'SLG-1-055');
 s.players[0].deck.unshift(hidden);
 s=use(s,{type:'activate',uid:quest.uid,mode:'fieldTuck'});
 assert.equal(live(s,quest).under[0].uid,hidden.uid);
 assert.equal(live(s,quest).under[0].faceDown,true);
 assert.equal(live(s,quest).ready,false);
 const slot=s.players[0].energy.findIndex(c=>c?.uid===quest.uid);
 const ownerView=universalPublicView(packs,s,0).players[0].energy[slot].underLayers[0];
 const foeView=universalPublicView(packs,s,1).players[0].energy[slot].underLayers[0];
 assert.equal(ownerView.cardId,hidden.cardId);
 assert.deepEqual(foeView,{faceDown:true});
 s.players[0].front[0]=null;
 s.players[0].outside.push(named);
 const zero=take(s,0,'SLG-1-015');
 s.players[0].outside.push(zero);
 live(s,quest).ready=true;
 assert.equal(modes(s,quest.uid).includes('fieldTuck'),false);
 assert.ok(modes(s,quest.uid).includes('fieldRelease'));
 s=use(s,{type:'activate',uid:quest.uid,mode:'fieldRelease'});
 assert.equal(s.pending.kind,'effect-pay-hand-outside');
 const cost=legalUniversalActions(packs,s).find(a=>a.type==='choosePayHandOutside');
 s=use(s,cost);
 assert.equal(s.pending.kind,'effect-release-facedown');
 const seen=universalPrivateChoices(packs,s,0);
 assert.equal(seen.options.find(o=>o.action.uid===hidden.uid).card.cardId,'SLG-1-055');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=use(s,{type:'chooseReleaseFacedown',uid:hidden.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 const offered=s.pending.choices.map(uid=>s.players[0].outside.find(c=>c.uid===uid).cardId);
 assert.deepEqual(offered,['SLG-1-015']);
 assert.equal(s.pending.choices.includes(named.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
