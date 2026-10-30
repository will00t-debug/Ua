import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {editorV2Status} from '../dist/v2-editor-compat.mjs';
import {steinsGatePracticeDeck,v2DeckReport} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp,universalImpact,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,readyAp,stg,stgDeck,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const FULL=['STG-1-011','STG-1-017','STG-1-027','STG-1-033','STG-1-038','STG-1-046'];
const KINDS={
 'STG-1-011':'okabeOverflow','STG-1-017':'mayuriRaidFork','STG-1-027':'kurisuRemoveRaid',
 'STG-1-033':'skuldPeek','STG-1-038':'okabeZoneRaid','STG-1-046':'suzuhaAttackEnd'
};

function who(s){return s.pending?.player??s.active;}
function go(s,action){
 return dispatchUniversalAction(stgPacks,s,action,{actor:who(s)});
}
function act(s,pred){
 const action=legalUniversalActions(stgPacks,s).find(pred);
 if(!action)throw Error('Missing action '+(s.pending?.kind||s.phase));
 return go(s,action);
}
function place(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function outside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function lifeTop(s,p,id){
 const card=take(s,p,id);
 const life=s.players[p].life,displaced=life[0];
 life[0]=card;
 if(displaced&&displaced.uid!==card.uid)s.players[p].deck.push(displaced);
 return card;
}
function board(ids,seed){
 if(ids.length!==13)throw Error('Steins;Gate test deck needs 13 ids');
 const s=toPhase(stgPacks,fresh(stgDeck(ids),seed),'main');
 readyAp(s);
 return s;
}
function passUntil(s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+s.phase);
  s=go(s,{type:'next'});
  if(++guard>12)throw Error('stuck '+s.phase+' active '+s.active);
 }
 return s;
}
function blueMayuri(s,n=7){
 const ids=['STG-1-014','STG-1-014','STG-1-014','STG-1-014','STG-1-015','STG-1-015','STG-1-015'];
 return ids.slice(0,n).map(id=>outside(s,0,id));
}

const OVERFLOW=['STG-1-011','STG-1-014','STG-1-015','STG-1-001','STG-1-007','STG-1-013',
 'STG-1-057','STG-1-012','STG-1-020','STG-1-024','STG-1-032','STG-1-042','STG-1-064'];
const LINKED=['STG-1-011','STG-1-017','STG-1-027','STG-1-028','STG-1-007','STG-1-008',
 'STG-1-001','STG-1-015','STG-1-014','STG-1-012','STG-1-020','STG-1-032','STG-1-064'];
const SKULD=['STG-1-033','STG-1-032','STG-1-034','STG-1-035','STG-1-039','STG-1-011',
 'STG-1-015','STG-1-001','STG-1-007','STG-1-014','STG-1-012','STG-1-020','STG-1-064'];
const KAICHU=['STG-1-038','STG-1-007','STG-1-011','STG-1-001','STG-1-015','STG-1-014',
 'STG-1-046','STG-1-032','STG-1-012','STG-1-020','STG-1-042','STG-1-047','STG-1-064'];
const SUZUHA=['STG-1-046','STG-1-042','STG-1-047','STG-1-053','STG-1-001','STG-1-007',
 'STG-1-032','STG-1-015','STG-1-014','STG-1-012','STG-1-020','STG-1-024','STG-1-064'];

test('batches 51-56 register the last six Steins;Gate prints',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.length,80);
 assert.equal(STEINS_GATE_CARDS.filter(c=>c.engineKind).length,80);
 assert.equal(Object.keys(stg.cards).length,80);
 assert.equal(stg.version,'stg-ua57-full-20261028');
 for(const id of FULL){
  assert.equal(STEINS_GATE_BY_ID[id].engineKind,KINDS[id]);
  assert.equal(STEINS_GATE_BY_ID[id].auto,false);
  assert.equal(stg.cards[id].name,STEINS_GATE_BY_ID[id].nameJa);
 }
 assert.equal(stg.cards['STG-1-011'].raidName,'岡部 倫太郎');
 assert.equal(stg.cards['STG-1-011'].overflowToOutside,true);
 assert.deepEqual(stg.cards['STG-1-011'].fieldLeaveMayRemove,{name:'椎名 まゆり',color:'blue',min:7});
 assert.equal(stg.cards['STG-1-017'].raidName,'椎名 まゆり');
 assert.equal(stg.cards['STG-1-027'].mainAbility.op,'restDiscardRaidRemovedOkabe');
 assert.equal(stg.cards['STG-1-033'].trigger,'special');
 assert.equal(stg.cards['STG-1-033'].triggerEffect.op,'retireOppFront');
 assert.equal(stg.cards['STG-1-038'].trigger,'color');
 assert.equal(stg.cards['STG-1-038'].triggerEffect.op,'bounceOppFrontUnderBp');
 assert.equal(stg.cards['STG-1-038'].triggerEffect.bp,3500);
 assert.equal(stg.cards['STG-1-046'].energyAttackEndMove,true);
 assert.equal(stg.cards['STG-1-046'].ownAttackEndOpen.bp,1000);
 const practice=steinsGatePracticeDeck();
 assert.equal(v2DeckReport('steins-gate',practice.counts).ok,true);
 assert.equal(editorV2Status('steins-gate',practice.counts).registered,80);
 assert.equal(assertUniversalMatch(stgPacks,fresh(deckWith(['STG-1-011']),51000)),true);
});

test('Q2378 STG-1-011 hand overflow and a full line go outside',()=>{
 let s=board(OVERFLOW,51011);
 const hand=[];
 for(const id of ['STG-1-001','STG-1-001','STG-1-001','STG-1-001','STG-1-012','STG-1-012','STG-1-012','STG-1-012'])
  hand.push(take(s,0,id));
 const overflow=take(s,0,'STG-1-011');
 hold(s,0,[...hand,overflow]);
 blueMayuri(s,7);
 s=passUntil(s,x=>x.phase==='attack'&&x.active===0);
 s=go(s,{type:'next'});
 assert.equal(s.pending.kind,'end-hand-limit');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='chooseFieldLeaveRemove'),false);
 s=go(s,{type:'chooseHandLimit',uid:overflow.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===overflow.uid));
 assert.equal(s.players[0].removed.some(c=>c.uid===overflow.uid),false);

 s=board(OVERFLOW,51012);
 for(let slot=0;slot<4;slot++)place(s,0,slot===0?'STG-1-011':'STG-1-001','front',slot);
 const displaced=s.players[0].front[0];
 const incoming=take(s,0,'STG-1-007');
 hold(s,0,[incoming]);
 s=act(s,a=>a.type==='play'&&a.uid===incoming.uid&&a.replaceUid===displaced.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front[0].uid,incoming.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===displaced.uid));
 assert.equal(s.players[0].removed.some(c=>c.uid===displaced.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('Q2379 seven blue Mayuri let a leaving STG-1-011 move to removed',()=>{
 let s=board(OVERFLOW,51013);
 blueMayuri(s,6);
 for(let i=0;i<4;i++)outside(s,0,'STG-1-057');
 for(let slot=0;slot<4;slot++)place(s,0,slot===0?'STG-1-011':'STG-1-001','front',slot);
 const shy=s.players[0].front[0];
 const incoming=take(s,0,'STG-1-007');
 hold(s,0,[incoming]);
 s=act(s,a=>a.type==='play'&&a.uid===incoming.uid&&a.replaceUid===shy.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===shy.uid));

 s=board(OVERFLOW,51014);
 blueMayuri(s,7);
 for(let slot=0;slot<4;slot++)place(s,0,slot===0?'STG-1-011':'STG-1-001','front',slot);
 const displaced=s.players[0].front[0];
 const played=take(s,0,'STG-1-007');
 hold(s,0,[played]);
 s=act(s,a=>a.type==='play'&&a.uid===played.uid&&a.replaceUid===displaced.uid);
 assert.equal(s.pending.kind,'effect-field-leave-remove');
 assert.equal(s.pending.mode,'overflow');
 assert.equal(s.players[0].front.some(c=>c?.uid===played.uid),true);
 assert.ok(s.players[0].outside.some(c=>c.uid===displaced.uid));
 const declined=go(s,{type:'chooseFieldLeaveRemove',mode:'decline'});
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].outside.some(c=>c.uid===displaced.uid));
 assert.equal(declined.players[0].removed.some(c=>c.uid===displaced.uid),false);

 s=board(OVERFLOW,51015);
 blueMayuri(s,7);
 for(let slot=0;slot<4;slot++)place(s,0,slot===0?'STG-1-011':'STG-1-001','front',slot);
 const leaving=s.players[0].front[0];
 const next=take(s,0,'STG-1-007');
 hold(s,0,[next]);
 s=act(s,a=>a.type==='play'&&a.uid===next.uid&&a.replaceUid===leaving.uid);
 s=go(s,{type:'chooseFieldLeaveRemove',mode:'remove'});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].removed.some(c=>c.uid===leaving.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===leaving.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('retiring STG-1-011 can move it to removed and still draws for STG-1-013',()=>{
 function open(seed,mayuri){
  let s=board(OVERFLOW,seed);
  if(mayuri)blueMayuri(s,7);
  place(s,0,'STG-1-007','energy',0);
  place(s,0,'STG-1-007','energy',1);
  place(s,0,'STG-1-007','energy',2);
  const okabe=place(s,0,'STG-1-011','front',0);
  const actor=take(s,0,'STG-1-013');
  hold(s,0,[actor]);
  const deck=s.players[0].deck.length;
  s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
  assert.equal(s.pending.kind,'effect-retire-own-character');
  s=act(s,a=>a.type==='chooseOwnCharacterRetire'&&a.uid===okabe.uid);
  return {s,okabe,deck};
 }
 const plain=open(51016,false);
 assert.equal(plain.s.pending,null);
 assert.ok(plain.s.players[0].outside.some(c=>c.uid===plain.okabe.uid));
 assert.equal(plain.s.players[0].deck.length,plain.deck-2);

 const offered=open(51017,true);
 assert.equal(offered.s.pending.kind,'effect-field-leave-remove');
 assert.equal(offered.s.pending.mode,'retire');
 assert.equal(offered.s.players[0].deck.length,offered.deck);
 let removed=go(offered.s,{type:'chooseFieldLeaveRemove',mode:'remove'});
 assert.ok(removed.players[0].removed.some(c=>c.uid===offered.okabe.uid));
 assert.equal(removed.players[0].outside.some(c=>c.uid===offered.okabe.uid),false);
 assert.equal(removed.players[0].deck.length,offered.deck-2);
 assert.equal(removed.pending,null);

 const stayed=open(51018,true);
 let outsideCard=go(stayed.s,{type:'chooseFieldLeaveRemove',mode:'decline'});
 assert.ok(outsideCard.players[0].outside.some(c=>c.uid===stayed.okabe.uid));
 assert.equal(outsideCard.players[0].removed.some(c=>c.uid===stayed.okabe.uid),false);
 assert.equal(outsideCard.players[0].deck.length,stayed.deck-2);
 assert.equal(assertUniversalMatch(stgPacks,outsideCard),true);
});

test('STG-1-011 rests a blue Mayuri and widens the window after a removed entry',()=>{
 let s=board(OVERFLOW,51019);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-007','energy',2);
 place(s,0,'STG-1-001','energy',3);
 const narrow=outside(s,0,'STG-1-014');
 const wide=outside(s,0,'STG-1-011');
 const actor=take(s,0,'STG-1-011');
 hold(s,0,[actor]);
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-printed-rest-raid');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 const legal=legalUniversalActions(stgPacks,s);
 assert.ok(legal.some(a=>a.uid===null));
 assert.ok(legal.some(a=>a.mode==='enter'&&a.uid===narrow.uid));
 assert.equal(legal.some(a=>a.uid===wide.uid),false);
 s=act(s,a=>a.mode==='enter'&&a.uid===narrow.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===narrow.uid).ready,false);
 assert.equal(s.pending,null);

 s=board(LINKED,51020);
 for(let slot=0;slot<4;slot++)place(s,0,'STG-1-007','energy',slot);
 const kurisu=place(s,0,'STG-1-027','front',0);
 const base=s.players[0].energy[0];
 const raided=take(s,0,'STG-1-011');
 s.players[0].removed.push(raided);
 const mayuri=outside(s,0,'STG-1-017');
 const foe=place(s,1,'STG-1-001','front',0);
 const spare=take(s,0,'STG-1-012');
 const kurisuRaid=take(s,0,'STG-1-028');
 hold(s,0,[spare,kurisuRaid]);
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.type==='raid'&&a.uid===kurisuRaid.uid&&
  a.baseUid===kurisu.uid));
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='activate'&&a.uid===kurisu.uid&&a.mode==='restDiscardRaid');
 assert.equal(s.players[0].front.find(c=>c?.uid===kurisu.uid).ready,false);
 s=go(s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.pending.kind,'effect-removed-okabe-raid');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 s=act(s,a=>a.type==='chooseRemovedOkabeRaid'&&a.uid===raided.uid&&a.baseUid===base.uid&&
  a.line==='front'&&a.slot===1);
 assert.equal(s.players[0].front[1].uid,raided.uid);
 assert.equal(s.players[0].front[1].ready,true);
 assert.equal(s.pending.kind,'effect-printed-rest-raid');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.mode==='enter'&&a.uid===mayuri.uid));
 s=act(s,a=>a.mode==='enter'&&a.uid===mayuri.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===mayuri.uid).ready,false);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-mayuri-fork');
 assert.equal(s.pending.characterEntry,true);
 s=go(s,{type:'chooseMayuriFork',uid:foe.uid});
 const victim=s.players[1].front.find(c=>c?.uid===foe.uid);
 const arrived=s.players[0].front.find(c=>c?.uid===mayuri.uid);
 const okabe=s.players[0].front.find(c=>c?.uid===raided.uid);
 const locked=s.players[0].front.find(c=>c?.uid===kurisu.uid);
 assert.ok(s.continuousStates.some(e=>e.kind==='cannotAttack'&&e.targetUid===foe.uid));
 assert.equal(victim.blockBannedUntil.granter,0);
 assert.equal(arrived.retireAtOppAttackEnd,undefined);
 assert.equal(universalBp(stg,s,okabe),stg.cards['STG-1-011'].bp+1000);
 assert.equal(universalImpact(stg,s,okabe),1);
 assert.equal(locked.raidLockedTurn,s.turn);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='raid'&&a.baseUid===kurisu.uid),false);
 s=passUntil(s,x=>x.phase==='attack'&&x.active===0);
 assert.ok(s.players[0].outside.some(c=>c.uid===kurisu.uid));
 s=act(s,a=>a.type==='attack'&&a.uid===raided.uid);
 assert.equal(s.pending.kind,'block');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===foe.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-017 replaces the attack quote when a character effect played it',()=>{
 let s=board(LINKED,51021);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-007','energy',2);
 place(s,0,'STG-1-001','energy',3);
 const foe=place(s,1,'STG-1-001','front',0);
 const actor=take(s,0,'STG-1-017');
 const ally=take(s,0,'STG-1-015');
 hold(s,0,[actor,ally]);
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 const played=s.players[0].front.find(c=>c?.uid===actor.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-mayuri-fork');
 assert.equal(s.pending.characterEntry,false);
 let skipped=go(s,{type:'chooseMayuriFork',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.continuousStates.some(e=>e.kind==='cannotAttack'),false);
 assert.equal(played.retireAtOppAttackEnd,undefined);

 s=board(LINKED,51022);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-007','energy',2);
 place(s,0,'STG-1-001','energy',3);
 const target=place(s,1,'STG-1-001','front',0);
 const card=take(s,0,'STG-1-017');
 const buff=take(s,0,'STG-1-015');
 hold(s,0,[card]);
 s.players[0].deck.unshift(buff);
 s=act(s,a=>a.type==='play'&&a.uid===card.uid&&a.line==='front');
 const mayuri=s.players[0].front.find(c=>c?.uid===card.uid);
 s=go(s,{type:'chooseMayuriFork',uid:target.uid});
 const self=s.players[0].front.find(c=>c?.uid===card.uid);
 const victim=s.players[1].front.find(c=>c?.uid===target.uid);
 assert.ok(s.continuousStates.some(e=>e.kind==='cannotAttack'&&e.targetUid===target.uid));
 assert.equal(victim.blockBannedUntil,undefined);
 assert.equal(self.retireAtOppAttackEnd.untilOwnTurnStart,s.players[0].ownTurns+1);
 self.ready=true;
 s=passUntil(s,x=>x.phase==='attack'&&x.active===0);
 s=act(s,a=>a.type==='attack'&&a.uid===mayuri.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===null));
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===card.uid);
 assert.equal(universalBp(stg,s,s.players[0].front.find(c=>c?.uid===card.uid)),stg.cards['STG-1-017'].bp+2000);
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-027 recovers a cheap Okabe and raids one out of removed',()=>{
 let s=board(LINKED,51027);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 const cheap=outside(s,0,'STG-1-008');
 const expensive=outside(s,0,'STG-1-011');
 const actor=take(s,0,'STG-1-027');
 const spare=take(s,0,'STG-1-012');
 hold(s,0,[actor,spare]);
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-discard-gate');
 let skipped=go(s,{type:'chooseDiscardGate',uid:null});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].outside.some(c=>c.uid===cheap.uid));

 s=board(LINKED,51028);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 const okabe=outside(s,0,'STG-1-008');
 outside(s,0,'STG-1-011');
 const kurisu=take(s,0,'STG-1-027');
 const pay=take(s,0,'STG-1-012');
 hold(s,0,[kurisu,pay]);
 s=act(s,a=>a.type==='play'&&a.uid===kurisu.uid&&a.line==='front');
 s=go(s,{type:'chooseDiscardGate',uid:pay.uid});
 assert.equal(s.pending.kind,'effect-recover-outside');
 const recovery=legalUniversalActions(stgPacks,s);
 assert.ok(recovery.some(a=>a.uid===okabe.uid));
 assert.equal(recovery.some(a=>a.uid&&s.players[0].outside.some(c=>c.uid===a.uid&&c.cardId==='STG-1-011')),false);
 s=go(s,{type:'chooseOutsideRecovery',uid:okabe.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===okabe.uid));
 assert.equal(s.pending,null);

 s=board(LINKED,51029);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-007','energy',2);
 place(s,0,'STG-1-001','energy',3);
 const lonely=place(s,0,'STG-1-027','front',0);
 const cost=take(s,0,'STG-1-012');
 hold(s,0,[cost]);
 s=act(s,a=>a.type==='activate'&&a.uid===lonely.uid&&a.mode==='restDiscardRaid');
 s=go(s,{type:'chooseDiscard',uid:cost.uid});
 const src=s.players[0].front.find(c=>c?.uid===lonely.uid);
 assert.equal(s.pending,null);
 assert.equal(src.ready,false);
 assert.equal(src.raidLockedTurn,s.turn);
 assert.ok(s.players[0].outside.some(c=>c.uid===cost.uid));
 s=passUntil(s,x=>x.phase==='attack');
 assert.ok(s.players[0].outside.some(c=>c.uid===lonely.uid));
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-033 peeks, widens at five trigger kinds, then may active a character',()=>{
 let s=board(SKULD,51033);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 const rested=place(s,0,'STG-1-015','front',0,false);
 const cheap=outside(s,0,'STG-1-015');
 const costly=outside(s,0,'STG-1-011');
 const event=take(s,0,'STG-1-033');
 hold(s,0,[event]);
 s.players[0].deck.unshift(take(s,0,'STG-1-012'));
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 s=go(s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.pending.kind,'effect-printed-rest-raid');
 let legal=legalUniversalActions(stgPacks,s);
 assert.ok(legal.some(a=>a.uid===null));
 assert.ok(legal.some(a=>a.mode==='enter'&&a.uid===cheap.uid));
 assert.equal(legal.some(a=>a.uid===costly.uid),false);
 s=go(s,{type:'choosePrintedRestRaid',uid:null});
 assert.equal(s.pending.kind,'effect-active-character');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===null));
 s=act(s,a=>a.type==='chooseActiveCharacter'&&a.uid===rested.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===rested.uid).ready,true);
 assert.equal(s.pending,null);

 s=board(SKULD,51034);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 for(const id of ['STG-1-032','STG-1-034','STG-1-035','STG-1-039'])outside(s,0,id);
 const okabe=outside(s,0,'STG-1-011');
 const skuld=take(s,0,'STG-1-033');
 hold(s,0,[skuld]);
 s=act(s,a=>a.type==='event'&&a.uid===skuld.uid);
 s=go(s,{type:'chooseTopCard',mode:'top'});
 legal=legalUniversalActions(stgPacks,s);
 assert.ok(legal.some(a=>a.uid===null));
 assert.ok(legal.some(a=>a.mode==='enter'&&a.uid===okabe.uid));
 s=act(s,a=>a.mode==='enter'&&a.uid===okabe.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===okabe.uid).ready,false);
 assert.equal(universalImpact(stg,s,okabe),0);
 assert.equal(s.pending.kind,'effect-active-character');
 s=go(s,{type:'chooseActiveCharacter',uid:null});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-038 raids Okabe from outside or removed and keeps its color trigger',()=>{
 let s=board(KAICHU,51038);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 place(s,0,'STG-1-014','energy',3);
 const event=take(s,0,'STG-1-038');
 hold(s,0,[event]);
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===event.uid));

 s=board(KAICHU,51039);
 place(s,0,'STG-1-007','energy',0);
 place(s,0,'STG-1-007','energy',1);
 place(s,0,'STG-1-001','energy',2);
 place(s,0,'STG-1-014','energy',3);
 const okabe=outside(s,0,'STG-1-007');
 const played=take(s,0,'STG-1-038');
 hold(s,0,[played]);
 s=act(s,a=>a.type==='event'&&a.uid===played.uid);
 assert.equal(s.pending.kind,'effect-zone-rest-raid');
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.uid===null),false);
 s=act(s,a=>a.mode==='enter'&&a.uid===okabe.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===okabe.uid).ready,false);
 assert.equal(universalImpact(stg,s,s.players[0].front.find(c=>c?.uid===okabe.uid)),0);
 assert.equal(s.pending,null);

 s=board(KAICHU,51040);
 for(let slot=0;slot<4;slot++)place(s,0,'STG-1-007','energy',slot);
 const base=s.players[0].energy[0];
 const raided=take(s,0,'STG-1-011');
 s.players[0].removed.push(raided);
 const letter=take(s,0,'STG-1-038');
 hold(s,0,[letter]);
 s=act(s,a=>a.type==='event'&&a.uid===letter.uid);
 s=act(s,a=>a.type==='choosePrintedRestRaid'&&a.mode==='raid'&&a.uid===raided.uid&&
  a.baseUid===base.uid&&a.line==='front');
 const top=s.players[0].front.find(c=>c?.uid===raided.uid);
 assert.equal(top.ready,true);
 assert.equal(universalImpact(stg,s,top),1);
 assert.equal(universalBp(stg,s,top),stg.cards['STG-1-011'].bp);

 const color=board(KAICHU,51041);
 const small=place(color,0,'STG-1-001','front',0);
 const tall=place(color,0,'STG-1-046','front',1);
 lifeTop(color,1,'STG-1-038');
 let battle=passUntil(color,x=>x.phase==='attack'&&x.active===0);
 battle=act(battle,a=>a.type==='attack'&&a.uid===small.uid);
 if(battle.pending?.kind==='block')battle=go(battle,{type:'chooseBlock',uid:null});
 assert.equal(battle.pending.kind,'life-trigger');
 assert.equal(battle.pending.trigger,'color');
 const choices=legalUniversalActions(stgPacks,battle);
 assert.ok(choices.some(a=>a.mode==='colorBounce'&&a.uid===small.uid));
 assert.equal(choices.some(a=>a.uid===tall.uid),false);
 battle=act(battle,a=>a.mode==='colorBounce'&&a.uid===small.uid);
 assert.ok(battle.players[0].hand.some(c=>c.uid===small.uid));
 assert.equal(battle.players[0].outside.some(c=>c.uid===small.uid),false);
 assert.equal(battle.players[0].removed.some(c=>c.uid===small.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,battle),true);
});

test('Q2386 STG-1-046 opens after battle or after the life trigger',()=>{
 let s=board(SUZUHA,51046);
 place(s,0,'STG-1-042','energy',0);
 place(s,0,'STG-1-047','energy',1);
 place(s,0,'STG-1-053','energy',2);
 place(s,0,'STG-1-064','energy',3);
 const actor=take(s,0,'STG-1-046');
 hold(s,0,[actor]);
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='energy');
 const suzuha=s.players[0].energy.find(c=>c?.uid===actor.uid);
 assert.equal(suzuha.ready,true);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending,null);

 s=board(SUZUHA,51047);
 const attacker=place(s,0,'STG-1-046','front',0);
 const pay=take(s,0,'STG-1-001');
 hold(s,0,[pay]);
 const blocker=place(s,1,'STG-1-001','front',0);
 lifeTop(s,1,'STG-1-015');
 s=passUntil(s,x=>x.phase==='attack');
 s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 assert.equal(s.pending.kind,'block');
 assert.ok(s.players[1].front.some(c=>c?.uid===blocker.uid));
 s=go(s,{type:'chooseBlock',uid:blocker.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(s.pending.kind,'effect-suzuha-attack-end');
 assert.ok(s.mainAbilityUsedUids.includes(attacker.uid+'|attackEndOpen'));
 s=go(s,{type:'chooseSuzuhaAttackEnd',uid:null});
 s.players[0].front.find(c=>c?.uid===attacker.uid).ready=true;
 s=act(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 assert.notEqual(s.pending?.kind,'effect-suzuha-attack-end');

 s=board(SUZUHA,51048);
 const open=place(s,0,'STG-1-046','front',0);
 hold(s,0,[]);
 lifeTop(s,1,'STG-1-015');
 s=passUntil(s,x=>x.phase==='attack');
 s=act(s,a=>a.type==='attack'&&a.uid===open.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 assert.notEqual(s.pending?.kind,'effect-suzuha-attack-end');
 assert.equal(s.mainAbilityUsedUids.includes(open.uid+'|attackEndOpen'),false);
 const later=take(s,0,'STG-1-001');
 s.players[0].hand.push(later);
 s.players[0].front.find(c=>c?.uid===open.uid).ready=true;
 s=act(s,a=>a.type==='attack'&&a.uid===open.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 if(s.pending?.kind==='life-trigger')s=go(s,{type:'chooseTrigger',mode:'skip'});
 assert.equal(s.pending.kind,'effect-suzuha-attack-end');
 const live=s.players[0].front.find(c=>c?.uid===open.uid);
 const before=universalBp(stg,s,live);
 s=go(s,{type:'chooseSuzuhaAttackEnd',uid:later.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===later.uid));
 assert.equal(s.players[0].front.find(c=>c?.uid===open.uid).ready,true);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.uid===open.uid));
 s=act(s,a=>a.type==='chooseOwnBuff'&&a.uid===open.uid);
 assert.equal(universalBp(stg,s,s.players[0].front.find(c=>c?.uid===open.uid)),before+1000);

 s=board(SUZUHA,51049);
 const mover=place(s,0,'STG-1-046','energy',0);
 const first=place(s,0,'STG-1-001','front',0);
 const second=place(s,0,'STG-1-007','front',1);
 lifeTop(s,1,'STG-1-015');
 s=passUntil(s,x=>x.phase==='attack');
 s=act(s,a=>a.type==='attack'&&a.uid===first.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'effect-self-to-front');
 s=go(s,{type:'chooseSelfFront',slot:null});
 assert.equal(s.players[0].energy.some(c=>c?.uid===mover.uid),true);
 s.players[0].front.find(c=>c?.uid===second.uid).ready=true;
 s=act(s,a=>a.type==='attack'&&a.uid===second.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 if(s.pending?.kind==='life-trigger')s=go(s,{type:'chooseTrigger',mode:'skip'});
 assert.equal(s.pending.kind,'effect-self-to-front');
 s=act(s,a=>a.type==='chooseSelfFront'&&a.slot===2);
 assert.equal(s.players[0].front[2].uid,mover.uid);

 s=board(SUZUHA,51050);
 const striker=place(s,0,'STG-1-046','front',0);
 const payment=take(s,0,'STG-1-001');
 hold(s,0,[payment]);
 lifeTop(s,1,'STG-1-032');
 s=passUntil(s,x=>x.phase==='attack');
 s=act(s,a=>a.type==='attack'&&a.uid===striker.uid);
 if(s.pending?.kind==='block')s=go(s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.notEqual(s.pending.kind,'effect-suzuha-attack-end');
 s=go(s,{type:'chooseTrigger',mode:'skip'});
 assert.equal(s.pending.kind,'effect-suzuha-attack-end');
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});
