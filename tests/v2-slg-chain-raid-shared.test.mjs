import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {EXPECTED_V2_IDS,EXPECTED_V2_TOTAL} from './fixtures/v2-integrated-id-manifest.mjs';

// SLG-1-047/048/049 share one attack-end chain Raid. SLG-1-051 can discard
// a hand card and Raid that same card from outside onto 水篠 旬.
// Official pages checked 2026-10-26. Q2041–Q2052 and Q2054 are the behaviour
// pins. This is not a full FAQ certification. fullyAccepted stays 0.
const slg=createSlgV2Pack(),packs=[slg,slg];
const batch=['SLG-1-047','SLG-1-048','SLG-1-049','SLG-1-051'];
const use=(s,a)=>dispatchUniversalAction(packs,s,a);
const acts=(s,type)=>legalUniversalActions(packs,s).filter(a=>a.type===type);
const label=(s,action)=>uiActionLabel(action,{pack:slg,state:s});

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
 assert.equal(assertUniversalMatch(packs,s),true);
 return s;
}
function live(s,card){
 const p=Number(String(card.uid).split('-')[0]);
 const found=[...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===card.uid);
 assert.ok(found,card.uid);
 return found;
}
function raid(s,uid,baseUid){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);
 assert.ok(action,'missing legal raid '+uid);
 return use(s,action);
}
function bury(s,p,host){
 const c=s.players[p].deck.shift();
 assert.ok(c,'deck card for facedown');
 c.faceDown=true;c.ready=false;c.fieldEntryStamp=null;c.buffs=[];
 host.under??=[];host.under.push(c);
 return c;
}
function shrink(s,p,keep,max){
 const hand=s.players[p].hand;
 for(let i=hand.length-1;i>=0&&hand.length>max;i--){
  if(keep.includes(hand[i].uid))continue;
  s.players[p].outside.push(hand.splice(i,1)[0]);
 }
 assert.ok(hand.length<=max,'hand '+hand.length);
}
function readyAp(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function clearBattle(s){
 while(s.pending?.kind==='effect-attack-aid')s=use(s,{type:'chooseAttackAid',mode:'skip'});
 if(s.pending?.kind==='block')s=use(s,{type:'chooseBlock',uid:null});
 while(s.pending?.kind==='life-trigger')s=use(s,{type:'chooseTrigger',mode:'skip'});
 return s;
}
function payFacedowns(s,keep=null){
 let guard=0;
 while(s.pending?.kind==='effect-chain-raid-facedown'&&guard++<6){
  const pick=acts(s,'chooseChainFacedown').find(a=>a.uid&&a.uid!==keep);
  assert.ok(pick,'facedown payment');
  s=use(s,pick);
 }
 assert.equal(s.pending.kind,'effect-chain-raid-hand');
 return s;
}

test('047 048 049 and 051 are registered on the shared engine',()=>{
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
 assert.equal(slg.cards['SLG-1-047'].phaseEffects[0].then[0].facedown,2);
 assert.equal(slg.cards['SLG-1-047'].phaseEffects[0].then[0].energy,5);
 assert.equal(slg.cards['SLG-1-047'].effects.onAttack[0].op,'drawTuckHandUnder');
 assert.equal(slg.cards['SLG-1-048'].phaseEffects[0].then[0].facedown,3);
 assert.equal(slg.cards['SLG-1-048'].phaseEffects[0].then[0].energy,6);
 assert.equal(slg.cards['SLG-1-048'].effects.onPlay[1].entry,'ownEffect');
 assert.equal(slg.cards['SLG-1-049'].printedImpact,1);
 assert.equal(slg.cards['SLG-1-049'].bp,4000);
 assert.equal(slg.cards['SLG-1-049'].passiveBonuses[0].condition.kind,'selfOnField');
 assert.equal(slg.cards['SLG-1-049'].passiveBonuses[0].bp,500);
 assert.deepEqual(slg.cards['SLG-1-051'].effects.onPlay[0].options.map(o=>o.id),['recover','raid']);
 assert.equal(EXPECTED_V2_IDS['solo-leveling'].length,80);
 assert.equal(EXPECTED_V2_TOTAL,489);
 assert.match(V2_PENDING_LABELS['effect-tuck-hand-under'],/裏向/);
 assert.match(V2_PENDING_LABELS['effect-chain-raid-hand'],/Raid/);
 assert.match(V2_PENDING_LABELS['effect-outside-named-raid'],/Raid/);
 assert.match(V2_PENDING_LABELS['effect-chain-discard'],/手牌/);
});

test('047 attack tucks a hand card, then paying two facedowns peels the top without retiring it',()=>{
 const counts=countsFor(['SLG-1-047','SLG-1-045','SLG-1-053','SLG-1-056']);
 let s=toPhase(counts,47047,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 const stamp=base.fieldEntryStamp;
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 const hiddenA=bury(s,0,base),hiddenB=bury(s,0,base);
 const sung=toHand(s,0,'SLG-1-047');
 const deckBefore=s.players[0].deck.length;
 s=raid(s,sung.uid,base.uid);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.players[0].front[0].cardId,'SLG-1-047');
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 s=use(s,{type:'next'});
 assert.equal(s.phase,'attack');
 const beforeAttack=s.players[0].deck.length;
 s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
 assert.equal(s.pending.kind,'effect-tuck-hand-under');
 assert.equal(s.players[0].deck.length,beforeAttack-1);
 assert.equal(acts(s,'attack').length,0);
 const tuck=acts(s,'chooseTuckHand')[0];
 assert.match(label(s,tuck),/裏向/);
 assert.equal(universalPrivateChoices(packs,s,0)?.kind,'effect-tuck-hand-under');
 const tuckedUid=tuck.uid;
 s=use(s,tuck);
 s=clearBattle(s);
 const top=s.players[0].front[0];
 assert.equal(top.ready,false);
 top.buffs.push({bp:2000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,top),6000);
 s=use(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-chain-raid-facedown');
 assert.equal(universalPrivateChoices(packs,s,0),null);
 assert.equal(acts(s,'attack').length,0);
 const facedown=acts(s,'chooseChainFacedown').map(a=>a.uid);
 assert.equal(facedown.includes(hiddenA.uid),true);
 assert.equal(facedown.includes(tuckedUid),true);
 assert.match(label(s,{type:'chooseChainFacedown',uid:null}),/不支付/);
 while(s.players[0].hand.length<9)s.players[0].hand.push(s.players[0].deck.shift());
 s=payFacedowns(s,hiddenB.uid);
 assert.equal(s.pending.choices.includes(hiddenB.uid),false);
 const ap=readyAp(s);
 s=use(s,{type:'chooseChainRaid',uid:null});
 assert.equal(s.pending.kind,'end-hand-limit');
 const origin=s.players[0].front[0];
 assert.equal(origin.uid,base.uid);
 assert.equal(origin.fieldEntryStamp,stamp);
 assert.equal(origin.buffs.length,0);
 assert.equal(universalBp(packs,s,origin),1500);
 assert.equal(origin.under.some(c=>c.uid===hiddenB.uid&&c.faceDown===true),true);
 const departed=s.players[0].outside.find(c=>c.uid===top.uid);
 assert.ok(departed);
 assert.equal(departed.faceDown,false);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===top.uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===hiddenA.uid&&c.faceDown!==true),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===tuckedUid&&c.faceDown!==true),true);
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===top.uid&&e.from==='front'&&e.to==='outside'&&e.reason==='own-effect'),true);
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===hiddenA.uid&&e.from==='raid-under'&&e.to==='outside'&&e.reason==='own-effect'),true);
 assert.equal(readyAp(s),ap);
});

test('047 chains into 048: the buried base keeps REST, 048 enters ACTIVE and draws, then the phase has ended',()=>{
 const counts=countsFor(['SLG-1-047','SLG-1-048','SLG-1-045','SLG-1-053','SLG-1-056']);
 let s=toPhase(counts,48048,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 const stamp=base.fieldEntryStamp;
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 const hidden=bury(s,0,base);
 const sung=toHand(s,0,'SLG-1-047');
 const next=toHand(s,0,'SLG-1-048');
 const rest=toHand(s,0,'SLG-1-056');
 s=raid(s,sung.uid,base.uid);
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
 const tuck=acts(s,'chooseTuckHand').find(a=>a.uid!==next.uid&&a.uid!==rest.uid);
 assert.ok(tuck);
 s=use(s,tuck);
 s=clearBattle(s);
 assert.equal(s.players[0].front[0].ready,false);
 shrink(s,0,[next.uid,rest.uid],7);
 s=use(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-chain-raid-facedown');
 assert.equal(acts(s,'chooseChainFacedown').some(a=>a.uid===hidden.uid),true);
 assert.equal(acts(s,'chooseChainFacedown').some(a=>a.uid===tuck.uid),true);
 s=payFacedowns(s);
 assert.equal(s.pending.choices.includes(next.uid),true);
 assert.match(label(s,{type:'chooseChainRaid',uid:next.uid}),/再 Raid/);
 const deck=s.players[0].deck.length;
 s=use(s,{type:'chooseChainRaid',uid:next.uid});
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(rest.uid),true);
 const arrived=s.players[0].front[0];
 assert.equal(arrived.uid,next.uid);
 assert.equal(arrived.ready,true);
 assert.equal(arrived.stack[0].uid,base.uid);
 assert.equal(arrived.stack[0].ready,false);
 assert.equal(arrived.stack[0].fieldEntryStamp,stamp);
 assert.equal(arrived.stack[0].buffs.length,0);
 assert.equal(s.players[0].outside.some(c=>c.uid===sung.uid),true);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===sung.uid),false);
 assert.equal(s.players[0].deck.length,deck);
 s=use(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.active,1);
 assert.equal(s.phase,'start');
 assert.equal(s.players[0].front[0].uid,next.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.players[0].front[0].stack[0].ready,false);
 assert.equal(acts(s,'attack').some(a=>a.uid===next.uid),false);
});

test('a paid raid of 048 offers the hand REST and does not draw',()=>{
 const counts=countsFor(['SLG-1-048','SLG-1-045','SLG-1-053','SLG-1-056']);
 let s=toPhase(counts,48049,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 put(s,0,'SLG-1-056','energy',2);
 const rest=toHand(s,0,'SLG-1-056');
 const sung=toHand(s,0,'SLG-1-048');
 const deck=s.players[0].deck.length;
 s=raid(s,sung.uid,base.uid);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(rest.uid),true);
 assert.equal(s.players[0].deck.length,deck);
 s=use(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].front[0].uid,sung.uid);
 assert.equal(s.players[0].front[0].ready,true);
 assert.equal(s.phase,'main');
});

test('047 does not open the chain when fewer than two facedown cards exist',()=>{
 const counts=countsFor(['SLG-1-047','SLG-1-045','SLG-1-053']);
 let s=toPhase(counts,47048,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 const sung=toHand(s,0,'SLG-1-047');
 s=raid(s,sung.uid,base.uid);
 const pl=s.players[0];
 pl.outside.push(...pl.hand.splice(0),...pl.deck.splice(0));
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:s.players[0].front[0].uid});
 assert.equal(s.pending.kind,'block');
 s=clearBattle(s);
 s=use(s,{type:'next'});
 assert.equal(s.pending,null);
 assert.equal(s.active,1);
 assert.equal(s.phase,'start');
 assert.equal(s.players[0].front[0].cardId,'SLG-1-047');
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
});

test('048 chains into 049, which is ACTIVE with BP+500 and may retire one opposing front character',()=>{
 const counts=countsFor(['SLG-1-048','SLG-1-049','SLG-1-045','SLG-1-053','SLG-1-056','SLG-1-055']);
 let s=toPhase(counts,49049,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 const stamp=base.fieldEntryStamp;
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 put(s,0,'SLG-1-056','energy',2);
 const foe=put(s,1,'SLG-1-055','front',0);
 const sung=toHand(s,0,'SLG-1-048');
 const big=toHand(s,0,'SLG-1-049');
 assert.equal(universalBp(packs,s,big),4000);
 const deck=s.players[0].deck.length;
 s=raid(s,sung.uid,base.uid);
 if(s.pending?.kind==='effect-hand-rest')s=use(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.pending,null);
 const top=s.players[0].front[0];
 const onTop=bury(s,0,top),onBase=bury(s,0,top.stack[0]);
 s=use(s,{type:'next'});
 s=use(s,{type:'attack',uid:top.uid});
 const tuck=acts(s,'chooseTuckHand').find(a=>a.uid!==big.uid);
 assert.ok(tuck);
 s=use(s,tuck);
 s=clearBattle(s);
 s.players[0].front[0].buffs.push({bp:2000,untilTurn:s.turn});
 assert.equal(universalBp(packs,s,s.players[0].front[0]),6000);
 s=use(s,{type:'next'});
 assert.equal(s.pending.kind,'effect-chain-raid-facedown');
 const choices=acts(s,'chooseChainFacedown').map(a=>a.uid);
 assert.equal(choices.includes(onTop.uid),true);
 assert.equal(choices.includes(onBase.uid),true);
 const ap=readyAp(s);
 s=payFacedowns(s);
 assert.equal(s.pending.choices.includes(big.uid),true);
 s=use(s,{type:'chooseChainRaid',uid:big.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.anyFront,true);
 assert.equal(s.pending.choices.includes(foe.uid),true);
 assert.equal(readyAp(s),ap);
 const arrived=s.players[0].front[0];
 assert.equal(arrived.uid,big.uid);
 assert.equal(arrived.ready,true);
 assert.equal(universalBp(packs,s,arrived),4500);
 assert.equal(universalImpact(packs,s,arrived),1);
 assert.equal(arrived.stack[0].uid,base.uid);
 assert.equal(arrived.stack[0].ready,false);
 assert.equal(arrived.stack[0].fieldEntryStamp,stamp);
 assert.equal(arrived.stack[0].buffs.length,0);
 assert.equal(s.players[0].outside.some(c=>c.uid===sung.uid&&c.faceDown!==true),true);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===sung.uid),false);
 while(s.players[0].hand.length<9)s.players[0].hand.push(s.players[0].deck.shift());
 s=use(s,{type:'chooseRetireBp',uid:foe.uid});
 assert.equal(s.pending.kind,'end-hand-limit');
 assert.equal(s.players[1].front[0],null);
 assert.equal(s.players[1].outside.some(c=>c.uid===foe.uid),true);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===foe.uid),true);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===sung.uid),false);
 assert.equal(acts(s,'attack').length,0);
 assert.equal(s.players[0].front[0].uid,big.uid);
});

test('a paid raid of 049 stays at BP 4500 and does not offer the opposing retirement',()=>{
 const counts=countsFor(['SLG-1-049','SLG-1-045','SLG-1-053','SLG-1-056','SLG-1-055']);
 let s=toPhase(counts,49050,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-053','energy',1);
 put(s,0,'SLG-1-056','energy',2);
 put(s,0,'SLG-1-056','energy',3);
 put(s,1,'SLG-1-055','front',0);
 const sung=toHand(s,0,'SLG-1-049');
 assert.equal(universalBp(packs,s,sung),4000);
 s=raid(s,sung.uid,base.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0].cardId,'SLG-1-055');
 const arrived=live(s,sung);
 assert.equal(universalBp(packs,s,arrived),4500);
 assert.equal(universalImpact(packs,s,arrived),1);
 assert.equal(s.phase,'main');
});

test('051 hides the outside Raid when the play already spent the only AP, and can still recover',()=>{
 const counts=countsFor(['SLG-1-051','SLG-1-047','SLG-1-045','SLG-1-053','SLG-1-056','SLG-1-055']);
 let s=toPhase(counts,51051,'main');
 put(s,0,'SLG-1-045','front',0);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-056','energy',1);
 const outside=take(s,0,'SLG-1-055');
 s.players[0].outside.push(outside);
 const eri=toHand(s,0,'SLG-1-051');
 toHand(s,0,'SLG-1-047');
 assert.equal(readyAp(s),1);
 s=use(s,acts(s,'play').find(a=>a.uid===eri.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['recover']);
 assert.match(label(s,{type:'chooseEffectMode',mode:'recover'}),/場外回收/);
 s=use(s,{type:'chooseEffectMode',mode:'recover'});
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.choices.includes(outside.uid),true);
 s=use(s,{type:'chooseOutsideRecovery',uid:outside.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===outside.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===eri.uid),true);
});

test('051 can discard 047 and Raid that same card from outside onto 水篠 旬',()=>{
 const counts=countsFor(['SLG-1-051','SLG-1-047','SLG-1-045','SLG-1-053','SLG-1-056']);
 let s=toPhase(counts,51052,'main');
 const base=put(s,0,'SLG-1-045','front',0);
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-056','energy',1);
 const eri=toHand(s,0,'SLG-1-051');
 const sung=toHand(s,0,'SLG-1-047');
 s.players[0].apCards[1].inPlay=true;
 s.players[0].apCards[1].ready=true;
 assert.equal(readyAp(s),2);
 s=use(s,acts(s,'play').find(a=>a.uid===eri.uid&&a.line==='front'));
 assert.equal(readyAp(s),1);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id).sort(),['raid','recover']);
 s=use(s,{type:'chooseEffectMode',mode:'raid'});
 assert.equal(readyAp(s),0);
 assert.equal(s.pending.kind,'effect-chain-discard');
 assert.match(label(s,{type:'chooseChainDiscard',uid:sung.uid}),/送場外/);
 const deck=s.players[0].deck.length;
 s=use(s,{type:'chooseChainDiscard',uid:sung.uid});
 assert.equal(s.pending.kind,'effect-outside-named-raid');
 assert.equal(s.pending.choices.includes(sung.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===sung.uid),true);
 const raidAction=acts(s,'chooseOutsideRaid').find(a=>a.uid===sung.uid&&a.baseUid===base.uid);
 assert.ok(raidAction);
 assert.match(label(s,raidAction),/場外 Raid/);
 s=use(s,raidAction);
 assert.equal(s.players[0].deck.length,deck-1);
 const arrived=s.players[0].front[0];
 assert.equal(arrived.uid,sung.uid);
 assert.equal(arrived.ready,true);
 assert.equal(arrived.stack[0].uid,base.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===eri.uid)||s.players[0].energy.some(c=>c?.uid===eri.uid),true);
 assert.equal(readyAp(s),0);

 let skipped=toPhase(counts,51053,'main');
 const bare=put(skipped,0,'SLG-1-045','front',0);
 put(skipped,0,'SLG-1-053','energy',0);
 put(skipped,0,'SLG-1-056','energy',1);
 const eri2=toHand(skipped,0,'SLG-1-051');
 const spare=toHand(skipped,0,'SLG-1-047');
 skipped.players[0].apCards[1].inPlay=true;
 skipped.players[0].apCards[1].ready=true;
 skipped=use(skipped,acts(skipped,'play').find(a=>a.uid===eri2.uid&&a.line==='front'));
 skipped=use(skipped,{type:'chooseEffectMode',mode:'raid'});
 skipped=use(skipped,{type:'chooseChainDiscard',uid:spare.uid});
 assert.equal(skipped.pending.kind,'effect-outside-named-raid');
 skipped=use(skipped,{type:'chooseOutsideRaid',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(readyAp(skipped),0);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(skipped.players[0].front[0].uid,bare.uid);

 let empty=toPhase(counts,51054,'main');
 put(empty,0,'SLG-1-053','energy',0);
 put(empty,0,'SLG-1-056','energy',1);
 const eri3=toHand(empty,0,'SLG-1-051');
 const dumped=toHand(empty,0,'SLG-1-047');
 empty.players[0].apCards[1].inPlay=true;
 empty.players[0].apCards[1].ready=true;
 const hand=empty.players[0].hand;
 empty.players[0].outside.push(...hand.filter(c=>c.uid!==eri3.uid));
 empty.players[0].hand=hand.filter(c=>c.uid===eri3.uid);
 empty=use(empty,acts(empty,'play').find(a=>a.uid===eri3.uid&&a.line==='energy'));
 assert.equal(empty.pending.kind,'effect-choice-mode');
 assert.deepEqual(empty.pending.options.map(o=>o.id),['recover']);
 assert.equal(empty.players[0].hand.some(c=>c.uid===dumped.uid),false);
});

test('051 discard does not open a Raid when no 水篠 旬 base is on the field',()=>{
 const counts=countsFor(['SLG-1-051','SLG-1-047','SLG-1-053','SLG-1-056']);
 let s=toPhase(counts,51055,'main');
 put(s,0,'SLG-1-053','energy',0);
 put(s,0,'SLG-1-056','energy',1);
 const eri=toHand(s,0,'SLG-1-051');
 const sung=toHand(s,0,'SLG-1-047');
 s.players[0].apCards[1].inPlay=true;
 s.players[0].apCards[1].ready=true;
 s=use(s,acts(s,'play').find(a=>a.uid===eri.uid&&a.line==='front'));
 s=use(s,{type:'chooseEffectMode',mode:'raid'});
 s=use(s,{type:'chooseChainDiscard',uid:sung.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===sung.uid),true);
 assert.equal(s.players[0].front.every(c=>c?.cardId!=='SLG-1-047'),true);
 assert.equal(readyAp(s),0);
});
