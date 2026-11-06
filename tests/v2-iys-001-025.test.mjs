import test from 'node:test';
import assert from 'node:assert/strict';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {inspectedPendingChoiceCards} from '../dist/universal-v2/preview-actions.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalEnergyByColor, universalImpact, universalImpactNull,
 universalPrivateChoices, universalPublicView, zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';

const pack=createIysV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(ids,seed){
 return newUniversalMatch(packs,{decks:[countsFor(ids),countsFor(ids)],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function hand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function top(s,p,ids){
 const cards=[];
 for(const id of [...ids].reverse()){
  const card=take(s,p,id);
  s.players[p].deck.unshift(card);
  cards.unshift(card);
 }
 return cards;
}
function crown(s,p,id){
 const card=take(s,p,id);
 const old=s.players[p].life.shift();
 if(old)s.players[p].deck.push(old);
 s.players[p].life.unshift(card);
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+(s.pending.kind||'')+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase+' from '+s.phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function play(s,uid,line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===uid&&
  a.line===line&&a.replaceUid===undefined);
 if(!action)throw Error('No play '+uid+' '+line);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+' '+
  JSON.stringify(s.pending?.actions||[]).slice(0,240));
 return use(s,action);
}
function fuel(s,p,ids){
 return ids.map((id,slot)=>put(s,p,id,'energy',slot,true));
}
function purple(s,p){return universalEnergyByColor(packs,s,p).purple||0;}
function bpOf(s,card){return universalBp(packs,s,card);}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function passBlock(s){
 if(s.pending?.kind==='block')return use(s,{type:'chooseBlock',uid:null});
 return s;
}

test('IYS-1-001 moves only another traitless character and can be skipped',()=>{
 const counts=['IYS-1-001','IYS-1-004','IYS-1-014','IYS-1-010'];
 let s=toPhase(fresh(counts,1001),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-010','IYS-1-001']);
 const mover=put(s,0,'IYS-1-004','front',0);
 const trait=put(s,0,'IYS-1-014','front',1);
 const aunn=hand(s,0,'IYS-1-001');
 s=play(s,aunn.uid);
 assert.equal(s.pending.kind,'effect-line-move');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.ok(choices.includes(mover.uid));
 assert.equal(choices.includes(trait.uid),false);
 assert.equal(choices.includes(aunn.uid),false);
 assert.ok(choices.includes(null));
 s=choose(s,a=>a.uid===null);
 assert.equal(s.players[0].front[0].uid,mover.uid);
 assert.equal(s.pending,null);
 let moved=toPhase(fresh(counts,1002),'main');
 readyAp(moved);
 fuel(moved,0,['IYS-1-010','IYS-1-001']);
 const body=put(moved,0,'IYS-1-004','front',0);
 const actor=hand(moved,0,'IYS-1-001');
 moved=play(moved,actor.uid,'energy');
 moved=choose(moved,a=>a.uid===body.uid);
 assert.equal(moved.pending.kind,'effect-line-slot');
 assert.equal(legalUniversalActions(packs,moved).some(a=>a.replaceUid),false);
 const dest=legalUniversalActions(packs,moved).find(a=>a.replaceUid===undefined);
 moved=use(moved,dest);
 assert.equal(moved.players[0].energy[dest.slot].uid,body.uid);
 assert.equal(moved.players[0].removed.length,0);
 assertUniversalMatch(packs,moved);
});

test('IYS-1-002 and IYS-1-006 nullify Impact, and 006 gains BP only on its own turn',()=>{
 const ids=['IYS-1-002','IYS-1-006','IYS-1-009','IYS-1-004','IYS-1-005','IYS-1-001','IYS-1-010','IYS-1-012'];
 let quiet=toPhase(fresh(ids,1006),'main');
 const plain=put(quiet,0,'IYS-1-006','front',0);
 assert.equal(universalImpactNull(packs,quiet,plain),true);
 assert.equal(bpOf(quiet,plain),3000);
 readyAp(quiet);
 fuel(quiet,0,['IYS-1-001','IYS-1-010','IYS-1-012']);
 const mother=put(quiet,0,'IYS-1-005','front',1);
 const sess=hand(quiet,0,'IYS-1-009');
 // 009's bonus is inside the raid frame, so a normal play does not gain it.
 quiet=play(quiet,sess.uid);
 assert.equal(quiet.pending,null);
 const played=live(quiet,0,sess.uid);
 assert.equal(bpOf(quiet,played),4500);
 assert.equal(universalImpact(packs,quiet,played),0);
 assert.equal(bpOf(quiet,live(quiet,0,plain.uid)),3000,'hand entry is not from outside');
 assert.equal(bpOf(quiet,live(quiet,0,mother.uid)),2000);

 let battle=toPhase(fresh(ids,1007),'main');
 readyAp(battle);
 fuel(battle,0,['IYS-1-001','IYS-1-010','IYS-1-012']);
 const base=put(battle,0,'IYS-1-005','front',0);
 const body=hand(battle,0,'IYS-1-004');
 battle.players[0].outside.push(body);
 battle.players[0].hand=battle.players[0].hand.filter(c=>c.uid!==body.uid);
 const raider=hand(battle,0,'IYS-1-009');
 const raid=legalUniversalActions(packs,battle).find(a=>a.type==='raid'&&a.uid===raider.uid&&
  a.baseUid===base.uid);
 battle=use(battle,raid);
 assert.equal(battle.pending.step,'deploy');
 battle=choose(battle,a=>a.mode==='deploy'&&a.uid===body.uid);
 const attacker=live(battle,0,raider.uid);
 assert.equal(attacker.stack[0].uid,base.uid);
 assert.equal(bpOf(battle,attacker),5000);
 assert.equal(universalImpact(packs,battle,attacker),1);
 const wall=put(battle,1,'IYS-1-006','front',0,true);
 assert.equal(universalImpactNull(packs,battle,wall),true);
 const life=battle.players[1].life.length;
 battle=toPhase(battle,'attack');
 battle=use(battle,{type:'attack',uid:attacker.uid});
 assert.equal(battle.pending.kind,'block');
 assert.ok(legalUniversalActions(packs,battle).some(a=>a.uid===wall.uid));
 battle=use(battle,{type:'chooseBlock',uid:wall.uid});
 assert.equal(battle.players[1].life.length,life,'006 removes the winner Impact');
 assert.equal(battle.players[1].outside.some(c=>c.uid===wall.uid),true);
 assertUniversalMatch(packs,battle);

 let small=toPhase(fresh(ids,1008),'main');
 readyAp(small);
 fuel(small,0,['IYS-1-001','IYS-1-010','IYS-1-012']);
 const host=put(small,0,'IYS-1-005','front',0);
 const piece=hand(small,0,'IYS-1-004');
 small.players[0].outside.push(piece);
 small.players[0].hand=small.players[0].hand.filter(c=>c.uid!==piece.uid);
 const topCard=hand(small,0,'IYS-1-009');
 small=use(small,legalUniversalActions(packs,small).find(a=>a.type==='raid'&&a.uid===topCard.uid&&
  a.baseUid===host.uid));
 small=choose(small,a=>a.mode==='deploy'&&a.uid===piece.uid);
 const striker=live(small,0,topCard.uid);
 const jaken=put(small,1,'IYS-1-002','front',0,true);
 const before=small.players[1].life.length;
 small=toPhase(small,'attack');
 small=use(small,{type:'attack',uid:striker.uid});
 small=use(small,{type:'chooseBlock',uid:jaken.uid});
 assert.equal(small.players[1].life.length,before);
 assertUniversalMatch(packs,small);

 let open=toPhase(fresh(ids,1009),'main');
 readyAp(open);
 fuel(open,0,['IYS-1-001','IYS-1-010','IYS-1-012']);
 const stand=put(open,0,'IYS-1-005','front',0);
 const side=hand(open,0,'IYS-1-004');
 open.players[0].outside.push(side);
 open.players[0].hand=open.players[0].hand.filter(c=>c.uid!==side.uid);
 const finisher=hand(open,0,'IYS-1-009');
 open=use(open,legalUniversalActions(packs,open).find(a=>a.type==='raid'&&a.uid===finisher.uid&&
  a.baseUid===stand.uid));
 open=choose(open,a=>a.mode==='deploy'&&a.uid===side.uid);
 crown(open,1,'IYS-1-011');
 const victim=put(open,1,'IYS-1-004','front',0,true);
 const lives=open.players[1].life.length;
 open=toPhase(open,'attack');
 open=use(open,{type:'attack',uid:finisher.uid});
 open=use(open,{type:'chooseBlock',uid:victim.uid});
 assert.equal(open.players[1].life.length,lives-1,'a blocker without Impact null takes the Impact');
 assert.equal(open.pending,null);
 assertUniversalMatch(packs,open);
});

test('IYS-1-003 shows the whole window and its COLOR plays one purple front character',()=>{
 const ids=['IYS-1-003','IYS-1-004','IYS-1-014','IYS-1-041','IYS-1-010','IYS-1-001'];
 let s=toPhase(fresh(ids,1003),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-010']);
 const window=top(s,0,['IYS-1-014','IYS-1-041','IYS-1-004','IYS-1-001']);
 const actor=hand(s,0,'IYS-1-003');
 const deckBefore=s.players[0].deck.length;
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown.find(c=>c.uid===window[0].uid).action,null);
 assert.ok(shown.find(c=>c.uid===window[1].uid).action);
 assert.ok(shown.find(c=>c.uid===window[2].uid).action);
 const hidden=JSON.stringify(universalPublicView(packs,s,1));
 for(const card of window)assert.equal(hidden.includes(card.uid),false);
 s=choose(s,a=>a.uid===window[1].uid);
 while(s.pending?.kind==='effect-top-order')s=choose(s,a=>a.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid==null),false);
 const discard=s.players[0].hand.find(c=>c.uid!==window[1].uid);
 s=choose(s,a=>a.uid===discard.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===discard.uid),true);
 assert.ok(s.publicReveals.some(r=>r.uid===window[1].uid));
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),false);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assertUniversalMatch(packs,s);

 let life=toPhase(fresh(ids,1013),'attack');
 const attacker=put(life,0,'IYS-1-004','front',0,true);
 const legal=hand(life,1,'IYS-1-014');
 life.players[1].outside.push(legal);
 life.players[1].hand=life.players[1].hand.filter(c=>c.uid!==legal.uid);
 const high=hand(life,1,'IYS-1-001');
 life.players[1].outside.push(high);
 life.players[1].hand=life.players[1].hand.filter(c=>c.uid!==high.uid);
 crown(life,1,'IYS-1-003');
 life=use(life,{type:'attack',uid:attacker.uid});
 life=use(life,{type:'chooseBlock',uid:null});
 assert.equal(life.pending.trigger,'color');
 const actions=legalUniversalActions(packs,life);
 assert.ok(actions.some(a=>a.mode==='colorOutside'&&a.uid===legal.uid&&a.line==='front'));
 assert.equal(actions.some(a=>a.uid===high.uid),false);
 assert.equal(actions.some(a=>a.mode==='colorOutside'&&a.line==='energy'),false);
 life=choose(life,a=>a.mode==='colorOutside'&&a.uid===legal.uid);
 const entered=life.players[1].front.find(c=>c?.uid===legal.uid);
 assert.equal(entered.ready,true);
 assertUniversalMatch(packs,life);
});

test('IYS-1-004 has no effect and IYS-1-005 discounts only an empty field',()=>{
 const ids=['IYS-1-004','IYS-1-005','IYS-1-014','IYS-1-041','IYS-1-010'];
 let plain=toPhase(fresh(ids,1004),'main');
 readyAp(plain);
 const vanilla=hand(plain,0,'IYS-1-004');
 const before=plain.players[0].deck.length;
 plain=play(plain,vanilla.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].deck.length,before);
 assertUniversalMatch(packs,plain);

 let empty=toPhase(fresh(ids,1005),'main');
 readyAp(empty);
 assert.equal(zoneRequiredEnergy(packs,empty,0,pack.cards['IYS-1-005'],'hand'),0);
 const missed=top(empty,0,['IYS-1-041','IYS-1-014']);
 const body=hand(empty,0,'IYS-1-005');
 empty=play(empty,body.uid);
 assert.equal(empty.pending.step,'lookOrder');
 const seen=universalPrivateChoices(packs,empty,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),missed.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,empty,1),null);
 empty=choose(empty,a=>a.uid===missed[1].uid);
 assert.equal(empty.players[0].deck[0].uid,missed[1].uid);
 assert.equal(empty.players[0].deck[1].uid,missed[0].uid);
 assert.equal(zoneRequiredEnergy(packs,empty,0,pack.cards['IYS-1-005'],'hand'),2);
 assert.equal(legalUniversalActions(packs,empty).some(a=>a.type==='play'&&
  a.uid&&empty.players[0].hand.some(c=>c.uid===a.uid&&c.cardId==='IYS-1-005')),false);
 assertUniversalMatch(packs,empty);
});

test('IYS-1-007 may draw on attack only after an outside entry',()=>{
 const ids=['IYS-1-007','IYS-1-008','IYS-1-004','IYS-1-014','IYS-1-001','IYS-1-010','IYS-1-006'];
 let quiet=toPhase(fresh(ids,10071),'attack');
 const attacker=put(quiet,0,'IYS-1-007','front',0,true);
 const before=quiet.players[0].deck.length;
 quiet=use(quiet,{type:'attack',uid:attacker.uid});
 assert.notEqual(quiet.pending?.step,'mayDraw');
 quiet=passBlock(quiet);
 assert.equal(quiet.players[0].deck.length,before);
 assertUniversalMatch(packs,quiet);

 let liveMatch=toPhase(fresh(ids,10072),'main');
 readyAp(liveMatch);
 fuel(liveMatch,0,['IYS-1-001','IYS-1-006','IYS-1-010']);
 const swinger=put(liveMatch,0,'IYS-1-007','front',0,true);
 const sesshomaru=put(liveMatch,0,'IYS-1-006','front',2);
 const recruit=hand(liveMatch,0,'IYS-1-004');
 liveMatch.players[0].outside.push(recruit);
 liveMatch.players[0].hand=liveMatch.players[0].hand.filter(c=>c.uid!==recruit.uid);
 const trait=hand(liveMatch,0,'IYS-1-014');
 liveMatch.players[0].outside.push(trait);
 liveMatch.players[0].hand=liveMatch.players[0].hand.filter(c=>c.uid!==trait.uid);
 const big=hand(liveMatch,0,'IYS-1-008');
 assert.equal(universalAttackDamage(packs,liveMatch,swinger),1);
 liveMatch=play(liveMatch,big.uid);
 assert.equal(liveMatch.pending.actions.some(a=>a.uid===trait.uid),false);
 assert.equal(liveMatch.pending.actions.some(a=>a.type==='raid'),false);
 assert.ok(liveMatch.pending.actions.some(a=>a.mode==='skip'));
 assert.ok(liveMatch.pending.actions.some(a=>a.mode==='deploy'&&a.uid===recruit.uid&&a.line==='front'));
 assert.ok(liveMatch.pending.actions.some(a=>a.mode==='deploy'&&a.uid===recruit.uid&&a.line==='energy'));
 liveMatch=choose(liveMatch,a=>a.mode==='deploy'&&a.uid===recruit.uid&&a.line==='energy');
 assert.equal(liveMatch.players[0].energy.find(c=>c?.uid===recruit.uid).ready,false);
 assert.equal(universalAttackDamage(packs,liveMatch,live(liveMatch,0,big.uid)),2);
 assert.equal(bpOf(liveMatch,live(liveMatch,0,sesshomaru.uid)),4000);
 crown(liveMatch,1,'IYS-1-006');
 liveMatch=toPhase(liveMatch,'attack');
 const deck=liveMatch.players[0].deck.length;
 liveMatch=use(liveMatch,{type:'attack',uid:swinger.uid});
 assert.equal(liveMatch.pending.step,'mayDraw');
 liveMatch=choose(liveMatch,a=>a.mode==='skip');
 liveMatch=passBlock(liveMatch);
 assert.equal(liveMatch.players[0].deck.length,deck);
 while(liveMatch.players[0].hand.length>7)liveMatch.players[0].deck.push(liveMatch.players[0].hand.pop());
 let guard=0;
 while(!(liveMatch.active===1&&liveMatch.phase==='main')){
  if(liveMatch.pending)throw Error('Pending while passing '+liveMatch.pending.kind);
  liveMatch=use(liveMatch,{type:'next'});
  if(++guard>16)throw Error('Did not reach the opponent main');
 }
 assert.equal(bpOf(liveMatch,live(liveMatch,0,sesshomaru.uid)),3000);
 assert.equal(universalAttackDamage(packs,liveMatch,live(liveMatch,0,big.uid)),1);
 assertUniversalMatch(packs,liveMatch);

 let drawn=toPhase(fresh(ids,10073),'main');
 readyAp(drawn);
 fuel(drawn,0,['IYS-1-001','IYS-1-006','IYS-1-010']);
 const again=put(drawn,0,'IYS-1-007','front',0,true);
 const piece=hand(drawn,0,'IYS-1-004');
 drawn.players[0].outside.push(piece);
 drawn.players[0].hand=drawn.players[0].hand.filter(c=>c.uid!==piece.uid);
 const source=hand(drawn,0,'IYS-1-008');
 drawn=play(drawn,source.uid);
 drawn=choose(drawn,a=>a.mode==='skip');
 assert.equal(universalAttackDamage(packs,drawn,live(drawn,0,source.uid)),1);
 drawn=toPhase(drawn,'attack');
 const left=drawn.players[0].deck.length;
 drawn=use(drawn,{type:'attack',uid:again.uid});
 assert.notEqual(drawn.pending?.step,'mayDraw','skip did not enter a character');
 drawn=passBlock(drawn);
 assert.equal(drawn.players[0].deck.length,left);
 assertUniversalMatch(packs,drawn);
});

test('IYS-1-009 raid text stays closed on a normal play and opens after a face-up raid',()=>{
 const ids=['IYS-1-009','IYS-1-004','IYS-1-005','IYS-1-001','IYS-1-010','IYS-1-006','IYS-1-014'];
 let bare=toPhase(fresh(ids,1009),'main');
 readyAp(bare);
 fuel(bare,0,['IYS-1-001','IYS-1-006','IYS-1-010']);
 const base=put(bare,0,'IYS-1-005','energy',3);
 const card=hand(bare,0,'IYS-1-009');
 bare=play(bare,card.uid);
 assert.equal(bare.pending,null);
 assert.equal(bpOf(bare,live(bare,0,card.uid)),4500);
 assert.equal(universalImpact(packs,bare,live(bare,0,card.uid)),0);
 assert.equal(base.uid,bare.players[0].energy[3].uid);
 assertUniversalMatch(packs,bare);

 let raided=toPhase(fresh(ids,1010),'main');
 readyAp(raided);
 fuel(raided,0,['IYS-1-001','IYS-1-006','IYS-1-010']);
 const host=put(raided,0,'IYS-1-005','front',0);
 const trait=hand(raided,0,'IYS-1-014');
 raided.players[0].outside.push(trait);
 raided.players[0].hand=raided.players[0].hand.filter(c=>c.uid!==trait.uid);
 const legal=hand(raided,0,'IYS-1-004');
 raided.players[0].outside.push(legal);
 raided.players[0].hand=raided.players[0].hand.filter(c=>c.uid!==legal.uid);
 const topCard=hand(raided,0,'IYS-1-009');
 raided=use(raided,legalUniversalActions(packs,raided).find(a=>a.type==='raid'&&
  a.uid===topCard.uid&&a.baseUid===host.uid&&a.line!=='energy'));
 assert.equal(raided.pending.actions.some(a=>a.uid===trait.uid),false);
 raided=choose(raided,a=>a.mode==='deploy'&&a.uid===legal.uid&&a.line==='front');
 const body=live(raided,0,topCard.uid);
 assert.notEqual(body.stack[0].faceDown,true);
 assert.equal(bpOf(raided,body),5000);
 assert.equal(universalImpact(packs,raided,body),1);
 assert.equal(raided.players[0].front.find(c=>c?.uid===legal.uid).ready,false);
 while(raided.players[0].hand.length>7)raided.players[0].deck.push(raided.players[0].hand.pop());
 let guard=0;
 while(!(raided.active===1&&raided.phase==='main')){
  if(raided.pending)throw Error('Pending while passing '+raided.pending.kind);
  raided=use(raided,{type:'next'});
  if(++guard>16)throw Error('Did not reach the opponent main');
 }
 const later=live(raided,0,topCard.uid);
 assert.equal(bpOf(raided,later),4500);
 assert.equal(universalImpact(packs,raided,later),0);
 assertUniversalMatch(packs,raided);
});

test('IYS-1-010 recovers one traitless purple of energy 4 or less to hand',()=>{
 const ids=['IYS-1-010','IYS-1-007','IYS-1-008','IYS-1-014','IYS-1-001','IYS-1-006'];
 let s=toPhase(fresh(ids,1010),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-001','IYS-1-006']);
 const yes=hand(s,0,'IYS-1-007');
 const high=hand(s,0,'IYS-1-008');
 const trait=hand(s,0,'IYS-1-014');
 s.players[0].outside.push(yes,high,trait);
 s.players[0].hand=s.players[0].hand.filter(c=>![yes,high,trait].some(x=>x.uid===c.uid));
 const actor=hand(s,0,'IYS-1-010');
 s=play(s,actor.uid);
 assert.equal(s.pending.step,'recover');
 assert.ok(s.pending.actions.some(a=>a.mode==='skip'));
 assert.deepEqual(s.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid),[yes.uid]);
 s=choose(s,a=>a.uid===yes.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===yes.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===high.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===trait.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===yes.uid),false);
 assertUniversalMatch(packs,s);
});

test('IYS-1-011 rests for one purple and retires at the end of main',()=>{
 const ids=['IYS-1-011','IYS-1-023','IYS-1-004','IYS-1-010'];
 let s=toPhase(fresh(ids,1011),'main');
 const rin=put(s,0,'IYS-1-011','energy',0,true);
 const ghost=put(s,0,'IYS-1-023','front',0);
 assert.equal(purple(s,0),1);
 assert.equal(bpOf(s,ghost),3000);
 s=use(s,{type:'activate',uid:rin.uid,mode:'selfRestEnergyRetire'});
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(purple(s,0),2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===rin.uid),false);
 s=toPhase(s,'attack');
 assert.equal(s.players[0].outside.some(c=>c.uid===rin.uid),true);
 assert.equal(s.players[0].energy[0],null);
 assert.equal(bpOf(s,live(s,0,ghost.uid)),4000);
 while(s.players[0].hand.length>7)s.players[0].deck.push(s.players[0].hand.pop());
 let guard=0;
 while(!(s.active===1&&s.phase==='main')){
  if(s.pending)throw Error('Pending while passing '+s.pending.kind);
  s=use(s,{type:'next'});
  if(++guard>16)throw Error('Did not reach the opponent main');
 }
 assert.equal(bpOf(s,live(s,0,ghost.uid)),3000);
 assertUniversalMatch(packs,s);

 let front=toPhase(fresh(ids,1012),'main');
 const standing=put(front,0,'IYS-1-011','front',0,true);
 const before=purple(front,0);
 front=use(front,{type:'activate',uid:standing.uid,mode:'selfRestEnergyRetire'});
 assert.equal(purple(front,0),before,'front occurrence energy does not produce');
 front=toPhase(front,'attack');
 assert.equal(front.players[0].outside.some(c=>c.uid===standing.uid),true);
 assertUniversalMatch(packs,front);
});

test('IYS-1-012 draws only when a Sesshomaru is on the field',()=>{
 const ids=['IYS-1-012','IYS-1-004','IYS-1-010','IYS-1-001'];
 let missing=toPhase(fresh(ids,1012),'main');
 readyAp(missing);
 fuel(missing,0,['IYS-1-010','IYS-1-001']);
 const rin=hand(missing,0,'IYS-1-012');
 const before=missing.players[0].deck.length;
 missing=play(missing,rin.uid);
 assert.equal(missing.pending,null);
 assert.equal(missing.players[0].deck.length,before);
 assertUniversalMatch(packs,missing);

 let present=toPhase(fresh(ids,1013),'main');
 readyAp(present);
 fuel(present,0,['IYS-1-010','IYS-1-001']);
 put(present,0,'IYS-1-004','energy',2);
 const again=hand(present,0,'IYS-1-012');
 const left=present.players[0].deck.length;
 present=play(present,again.uid);
 assert.equal(present.players[0].deck.length,left-1);
 assert.equal(present.pending,null);
 assertUniversalMatch(packs,present);
});

test('IYS-1-013 readies a Sesshomaru only after this card entered from outside',()=>{
 const ids=['IYS-1-013','IYS-1-004','IYS-1-003','IYS-1-010','IYS-1-019','IYS-1-001','IYS-1-014'];
 let paid=toPhase(fresh(ids,1013),'main');
 readyAp(paid);
 fuel(paid,0,['IYS-1-010']);
 const sess=put(paid,0,'IYS-1-004','front',0,false);
 const rin=hand(paid,0,'IYS-1-013');
 paid=play(paid,rin.uid,'energy');
 assert.equal(paid.pending,null);
 assert.equal(paid.players[0].front[0].ready,false);
 assert.equal(universalCardEnergy(packs,paid,0,paid.players[0].energy.find(c=>c?.uid===rin.uid)),2);
 assertUniversalMatch(packs,paid);

 let color=toPhase(fresh(ids,1014),'attack');
 put(color,0,'IYS-1-004','front',0,true);
 const rested=put(color,1,'IYS-1-004','energy',0,false);
 const entered=hand(color,1,'IYS-1-013');
 color.players[1].outside.push(entered);
 color.players[1].hand=color.players[1].hand.filter(c=>c.uid!==entered.uid);
 crown(color,1,'IYS-1-003');
 color=use(color,{type:'attack',uid:color.players[0].front[0].uid});
 color=use(color,{type:'chooseBlock',uid:null});
 color=choose(color,a=>a.mode==='colorOutside'&&a.uid===entered.uid);
 assert.equal(color.pending.id,'IYS-1-013');
 assert.equal(color.pending.step,'activeName');
 assert.ok(color.pending.actions.some(a=>a.mode==='skip'));
 color=choose(color,a=>a.uid===rested.uid);
 assert.equal(color.players[1].energy[0].ready,true);
 assert.equal(color.players[1].front.find(c=>c?.uid===entered.uid).ready,true);
 assertUniversalMatch(packs,color);

 let brought=toPhase(fresh(ids,1015),'main');
 readyAp(brought);
 fuel(brought,0,['IYS-1-001','IYS-1-010']);
 const target=put(brought,0,'IYS-1-004','front',0,false);
 const rinCard=hand(brought,0,'IYS-1-013');
 const expensive=hand(brought,0,'IYS-1-001');
 brought.players[0].outside.push(rinCard,expensive);
 brought.players[0].hand=brought.players[0].hand.filter(c=>c.uid!==rinCard.uid&&c.uid!==expensive.uid);
 const kagura=hand(brought,0,'IYS-1-019');
 brought=play(brought,kagura.uid);
 assert.equal(brought.pending.actions.some(a=>a.uid===expensive.uid),false);
 assert.ok(brought.pending.actions.some(a=>a.uid===rinCard.uid&&a.mode==='deploy'));
 brought=choose(brought,a=>a.mode==='deploy'&&a.uid===rinCard.uid&&a.line==='energy');
 assert.equal(brought.pending.step,'activeName');
 brought=choose(brought,a=>a.uid===target.uid);
 assert.equal(brought.players[0].front[0].ready,true);
 const summoned=brought.players[0].energy.find(c=>c?.uid===rinCard.uid);
 assert.equal(summoned.ready,false);
 brought=toPhase(brought,'attack');
 assert.equal(brought.players[0].outside.some(c=>c.uid===rinCard.uid),true);
 assert.equal(live(brought,0,kagura.uid)?.cardId,'IYS-1-019');
 assert.equal(brought.players[0].front[0].ready,true);
 assertUniversalMatch(packs,brought);
});

test('IYS-1-014 reveals one Naraku card from the top three and bottoms the rest',()=>{
 const ids=['IYS-1-014','IYS-1-018','IYS-1-004','IYS-1-016','IYS-1-021','IYS-1-010'];
 let s=toPhase(fresh(ids,1014),'main');
 const window=top(s,0,['IYS-1-004','IYS-1-016','IYS-1-021']);
 const baby=put(s,0,'IYS-1-014','front',0);
 const actor=put(s,0,'IYS-1-018','front',1);
 s=use(s,{type:'activate',uid:actor.uid,mode:'iys:0'});
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.pending.step,'lookPick');
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown[0].action,null);
 assert.ok(shown[1].action);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=choose(s,a=>a.uid===window[1].uid);
 assert.equal(s.pending.step,'lookOrder');
 s=choose(s,a=>a.uid===window[2].uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(s.players[0].deck.at(-1).uid,window[2].uid);
 assert.equal(s.players[0].deck.at(-2).uid,window[0].uid);
 assert.ok(s.publicReveals.some(r=>r.uid===window[1].uid&&r.cardId==='IYS-1-016'));
 const foe=JSON.stringify(universalPublicView(packs,s,1));
 assert.equal(foe.includes(window[0].uid),false);
 assert.equal(foe.includes(window[2].uid),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===baby.uid),true);
 assertUniversalMatch(packs,s);
});

test('IYS-1-015 draws on retirement and not when removed',()=>{
 const ids=['IYS-1-015','IYS-1-018','IYS-1-001','IYS-1-004','IYS-1-010','IYS-1-006'];
 let retired=toPhase(fresh(ids,1015),'main');
 const spider=put(retired,0,'IYS-1-015','front',0);
 put(retired,0,'IYS-1-018','front',1);
 const before=retired.players[0].deck.length;
 retired=use(retired,{type:'activate',uid:retired.players[0].front[1].uid,mode:'iys:0'});
 retired=choose(retired,a=>a.mode==='skip');
 assert.equal(retired.pending,null);
 assert.equal(retired.players[0].outside.some(c=>c.uid===spider.uid),true);
 assert.equal(retired.players[0].deck.length,before-1);
 assertUniversalMatch(packs,retired);

 let removed=toPhase(fresh(ids,1016),'main');
 readyAp(removed);
 fuel(removed,0,['IYS-1-010','IYS-1-006','IYS-1-004','IYS-1-015']);
 const mover=put(removed,0,'IYS-1-004','front',0);
 const aunn=hand(removed,0,'IYS-1-001');
 const victim=removed.players[0].energy[3];
 const deck=removed.players[0].deck.length;
 removed=play(removed,aunn.uid);
 removed=choose(removed,a=>a.uid===mover.uid);
 removed=choose(removed,a=>a.replaceUid===victim.uid);
 assert.equal(removed.players[0].removed.some(c=>c.uid===victim.uid),true);
 assert.equal(removed.players[0].hand.some(c=>c.uid===victim.uid),false);
 assert.equal(removed.players[0].deck.length,deck);
 assertUniversalMatch(packs,removed);
});

test('IYS-1-016 draws one and must put one hand card outside',()=>{
 const ids=['IYS-1-016','IYS-1-004','IYS-1-010'];
 let s=toPhase(fresh(ids,1016),'main');
 readyAp(s);
 const keep=hand(s,0,'IYS-1-004');
 const actor=hand(s,0,'IYS-1-016');
 const before={deck:s.players[0].deck.length,hand:s.players[0].hand.length};
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid==null),false);
 assert.equal(s.players[0].deck.length,before.deck-1);
 s=choose(s,a=>a.uid===keep.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===keep.uid),true);
 assert.equal(s.players[0].hand.length,before.hand-1);
 assertUniversalMatch(packs,s);
});

test('IYS-1-017 generates the extra purple only while active',()=>{
 const ids=['IYS-1-017','IYS-1-004'];
 let s=toPhase(fresh(ids,1017),'main');
 const card=put(s,0,'IYS-1-017','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,card),2);
 assert.equal(purple(s,0),2);
 card.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),1);
 assertUniversalMatch(packs,s);
});

test('IYS-1-018 peeks privately, then grants the block ceiling and must retire another Naraku',()=>{
 const ids=['IYS-1-018','IYS-1-014','IYS-1-015','IYS-1-007','IYS-1-004','IYS-1-010'];
 let peek=toPhase(fresh(ids,1018),'main');
 readyAp(peek);
 fuel(peek,0,['IYS-1-010','IYS-1-004']);
 const secret=top(peek,0,['IYS-1-004'])[0];
 const actor=hand(peek,0,'IYS-1-018');
 peek=play(peek,actor.uid);
 assert.equal(peek.pending.kind,'private-top-choice');
 const mine=universalPrivateChoices(packs,peek,0);
 assert.equal(mine.options[0].card.cardId,'IYS-1-004');
 assert.equal(universalPrivateChoices(packs,peek,1),null);
 assert.equal(JSON.stringify(universalPublicView(packs,peek,1)).includes(secret.uid),false);
 peek=choose(peek,a=>a.mode==='outside');
 assert.equal(peek.players[0].outside.some(c=>c.uid===secret.uid),true);
 assertUniversalMatch(packs,peek);

 let grant=toPhase(fresh(ids,1019),'main');
 const kagura=put(grant,0,'IYS-1-018','front',0);
 const naraku=put(grant,0,'IYS-1-014','front',1,true);
 const other=put(grant,0,'IYS-1-015','energy',0);
 grant=use(grant,{type:'activate',uid:kagura.uid,mode:'iys:0'});
 assert.equal(grant.pending.step,'grantBlock');
 grant=choose(grant,a=>a.uid===naraku.uid);
 assert.equal(grant.pending.step,'retireNaraku');
 assert.equal(grant.pending.actions.some(a=>a.uid===kagura.uid),false);
 grant=choose(grant,a=>a.uid===other.uid);
 assert.equal(grant.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(legalUniversalActions(packs,grant).some(a=>a.type==='activate'&&a.uid===kagura.uid),false);
 const tall=put(grant,1,'IYS-1-007','front',0,true);
 const short=put(grant,1,'IYS-1-004','front',1,true);
 grant=toPhase(grant,'attack');
 grant=use(grant,{type:'attack',uid:naraku.uid});
 assert.equal(grant.pending.kind,'block');
 assert.equal(legalUniversalActions(packs,grant).some(a=>a.uid===tall.uid),false);
 assert.ok(legalUniversalActions(packs,grant).some(a=>a.uid===short.uid));
 grant=use(grant,{type:'chooseBlock',uid:short.uid});
 assertUniversalMatch(packs,grant);
});

test('IYS-1-020 bounces an energy-1-or-less character, or itself when none exists',()=>{
 const ids=['IYS-1-020','IYS-1-004','IYS-1-005','IYS-1-032','IYS-1-010'];
 let s=toPhase(fresh(ids,1020),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-010']);
 const self=hand(s,0,'IYS-1-020');
 const small=put(s,0,'IYS-1-004','front',1);
 const big=put(s,0,'IYS-1-005','energy',1);
 s=play(s,self.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.deepEqual(choices,[small.uid]);
 s=choose(s,a=>a.uid===small.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===small.uid),true);
 assert.equal(live(s,0,self.uid)?.cardId,'IYS-1-020');
 assert.equal(s.players[0].energy[1].uid,big.uid);
 assertUniversalMatch(packs,s);

 let alone=toPhase(fresh(ids,1021),'main');
 readyAp(alone);
 const mirror=put(alone,0,'IYS-1-032','energy',0);
 const tall=put(alone,0,'IYS-1-005','front',0);
 const pair=hand(alone,0,'IYS-1-020');
 alone=play(alone,pair.uid,'energy');
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].hand.some(c=>c.uid===pair.uid),true);
 assert.equal(alone.players[0].energy[0].uid,mirror.uid);
 assert.equal(alone.players[0].front[0].uid,tall.uid);
 assertUniversalMatch(packs,alone);
});

test('IYS-1-021 shows every looked card and discards only after a take',()=>{
 const ids=['IYS-1-021','IYS-1-014','IYS-1-032','IYS-1-004','IYS-1-010'];
 let s=toPhase(fresh(ids,1021),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-010']);
 const window=top(s,0,['IYS-1-004','IYS-1-032','IYS-1-014']);
 const actor=hand(s,0,'IYS-1-021');
 s=play(s,actor.uid);
 const seen=universalPrivateChoices(packs,s,0);
 assert.deepEqual(seen.inspected.map(c=>c.uid),window.map(c=>c.uid));
 const shown=inspectedPendingChoiceCards(seen,legalUniversalActions(packs,s));
 assert.equal(shown[0].action,null);
 assert.ok(shown[1].action);
 assert.ok(shown[2].action);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=choose(s,a=>a.uid===window[1].uid);
 while(s.pending?.kind==='effect-top-order')s=choose(s,a=>a.uid);
 assert.equal(s.pending.kind,'effect-discard');
 const pay=s.players[0].hand.find(c=>c.cardId!=='IYS-1-032');
 s=choose(s,a=>a.uid===pay.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.ok(s.publicReveals.some(r=>r.uid===window[1].uid));
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(window[0].uid),false);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(ids,1022),'main');
 readyAp(skipped);
 fuel(skipped,0,['IYS-1-010']);
 top(skipped,0,['IYS-1-004','IYS-1-014','IYS-1-032']);
 const second=hand(skipped,0,'IYS-1-021');
 const handBefore=skipped.players[0].hand.length;
 skipped=play(skipped,second.uid);
 skipped=choose(skipped,a=>a.uid==null);
 while(skipped.pending?.kind==='effect-top-order')skipped=choose(skipped,a=>a.uid);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.length,handBefore-1);
 assertUniversalMatch(packs,skipped);
});

test('Q2132 keeps facedown order private after 神無 tucks two cards',()=>{
 const ids=['IYS-1-022','IYS-1-028','IYS-1-029','IYS-1-034','IYS-1-001','IYS-1-010'];
 let s=toPhase(fresh(ids,2132),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-001','IYS-1-010']);
 const host=put(s,0,'IYS-1-028','front',0);
 const first=hand(s,0,'IYS-1-029');
 const second=hand(s,0,'IYS-1-034');
 s.players[0].outside.push(second);
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==second.uid);
 const kanna=hand(s,0,'IYS-1-022');
 s=play(s,kanna.uid);
 assert.equal(s.pending.step,'handPlace');
 assert.ok(s.pending.actions.some(a=>a.mode==='under'&&a.uid===first.uid));
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='under'&&a.uid===first.uid);
 const tucked=()=>s.players[0].front.find(c=>c?.uid===host.uid);
 assert.equal(tucked().under[0].uid,first.uid);
 assert.equal(tucked().under[0].faceDown,true);
 s=use(s,{type:'activate',uid:kanna.uid,mode:'iys:0'});
 s=choose(s,a=>a.uid===second.uid);
 assert.deepEqual(tucked().under.map(c=>c.uid),[first.uid,second.uid]);
 const before=universalPublicView(packs,s,1);
 const mine=universalPublicView(packs,s,0).players[0].front.find(c=>c.uid===host.uid);
 assert.deepEqual(mine.underLayers.map(c=>c.cardId),['IYS-1-029','IYS-1-034']);
 const hidden=before.players[0].front.find(c=>c.uid===host.uid).underLayers;
 assert.deepEqual(hidden,[{faceDown:true},{faceDown:true}]);
 const foeSide=JSON.stringify(before.players[0]);
 assert.equal(foeSide.includes('IYS-1-029'),false);
 assert.equal(foeSide.includes('IYS-1-034'),false);
 assert.equal(foeSide.includes(first.uid),false);
 assert.equal(foeSide.includes(second.uid),false);
 assert.equal(JSON.stringify(before.publicReveals).includes(first.uid),false);
 s=use(s,{type:'reorderUnder',uid:host.uid,index:0});
 const after=universalPublicView(packs,s,1);
 assert.deepEqual(after.players[0].front.find(c=>c.uid===host.uid).underLayers,hidden);
 const flipped=universalPublicView(packs,s,0).players[0].front.find(c=>c.uid===host.uid);
 assert.deepEqual(flipped.underLayers.map(c=>c.cardId),['IYS-1-034','IYS-1-029']);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===kanna.uid),false);
 assertUniversalMatch(packs,s);
});

test('IYS-1-024 returns to hand on retirement and stays removed when removed',()=>{
 const ids=['IYS-1-024','IYS-1-018','IYS-1-001','IYS-1-004','IYS-1-010','IYS-1-006','IYS-1-012','IYS-1-023'];
 let back=toPhase(fresh(ids,1024),'main');
 const kohaku=put(back,0,'IYS-1-024','front',0);
 put(back,0,'IYS-1-018','front',1);
 back=use(back,{type:'activate',uid:back.players[0].front[1].uid,mode:'iys:0'});
 back=choose(back,a=>a.mode==='skip');
 assert.equal(back.players[0].hand.some(c=>c.uid===kohaku.uid),true);
 assert.equal(back.players[0].outside.some(c=>c.uid===kohaku.uid),false);
 assert.equal(back.players[0].hand.filter(c=>c.uid===kohaku.uid).length,1);
 assertUniversalMatch(packs,back);

 let gone=toPhase(fresh(ids,1025),'main');
 readyAp(gone);
 fuel(gone,0,['IYS-1-010','IYS-1-006','IYS-1-012','IYS-1-024']);
 const mover=put(gone,0,'IYS-1-004','front',0);
 const ghost=put(gone,0,'IYS-1-023','front',1);
 const aunn=hand(gone,0,'IYS-1-001');
 const victim=gone.players[0].energy[3];
 gone=play(gone,aunn.uid);
 gone=choose(gone,a=>a.uid===mover.uid);
 gone=choose(gone,a=>a.replaceUid===victim.uid);
 assert.equal(gone.players[0].removed.some(c=>c.uid===victim.uid),true);
 assert.equal(gone.players[0].hand.some(c=>c.uid===victim.uid),false);
 assert.equal(bpOf(gone,live(gone,0,ghost.uid)),3000);
 assertUniversalMatch(packs,gone);
});

test('IYS-1-025 may reduce one opposing front character by 1000',()=>{
 const ids=['IYS-1-025','IYS-1-004','IYS-1-010'];
 let s=toPhase(fresh(ids,1025),'main');
 readyAp(s);
 fuel(s,0,['IYS-1-010']);
 const front=put(s,1,'IYS-1-004','front',0);
 const energy=put(s,1,'IYS-1-004','energy',0);
 const actor=hand(s,0,'IYS-1-025');
 s=play(s,actor.uid);
 assert.equal(s.pending.kind,'effect-target');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.ok(choices.includes(front.uid));
 assert.equal(choices.includes(energy.uid),false);
 assert.ok(choices.includes(null));
 s=choose(s,a=>a.uid===front.uid);
 assert.equal(bpOf(s,s.players[1].front[0]),500);
 assert.equal(bpOf(s,s.players[1].energy[0]),1500);
 assertUniversalMatch(packs,s);

 let skipped=toPhase(fresh(ids,1026),'main');
 readyAp(skipped);
 fuel(skipped,0,['IYS-1-010']);
 const safe=put(skipped,1,'IYS-1-004','front',0);
 const second=hand(skipped,0,'IYS-1-025');
 skipped=play(skipped,second.uid);
 skipped=choose(skipped,a=>a.uid==null);
 assert.equal(bpOf(skipped,skipped.players[1].front[0]),1500);
 assert.equal(skipped.players[1].front[0].uid,safe.uid);
 assertUniversalMatch(packs,skipped);
});

test('life triggers for 001, 002, 004, 006 and 009 follow the printed keyword',()=>{
 const ids=['IYS-1-001','IYS-1-002','IYS-1-004','IYS-1-006','IYS-1-009','IYS-1-005','IYS-1-010','IYS-1-012'];
 function flip(seed,lifeId){
  let s=toPhase(fresh(ids,seed),'attack');
  const attacker=put(s,0,'IYS-1-004','front',0,true);
  const life=crown(s,1,lifeId);
  const before=s.players[1].life.length;
  s=use(s,{type:'attack',uid:attacker.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  return {s,life,before};
 }
 let active=flip(1101,'IYS-1-001');
 assert.equal(active.s.pending.trigger,'active');
 const rested=put(active.s,1,'IYS-1-004','front',0,false);
 active.s=choose(active.s,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(active.s.players[1].front[0].ready,true);
 assert.equal(bpOf(active.s,active.s.players[1].front[0]),4500);
 assert.equal(active.s.players[1].outside.some(c=>c.uid===active.life.uid),true);
 assertUniversalMatch(packs,active.s);

 let draw=flip(1102,'IYS-1-002');
 assert.equal(draw.s.pending.trigger,'draw');
 const deck=draw.s.players[1].deck.length;
 draw.s=choose(draw.s,a=>a.mode==='draw');
 assert.equal(draw.s.players[1].deck.length,deck-1);
 assert.equal(draw.s.players[1].outside.some(c=>c.uid===draw.life.uid),true);
 assertUniversalMatch(packs,draw.s);

 let got=flip(1104,'IYS-1-004');
 assert.equal(got.s.pending.trigger,'get');
 got.s=choose(got.s,a=>a.mode==='get');
 assert.equal(got.s.players[1].hand.some(c=>c.uid===got.life.uid),true);
 assert.equal(got.s.players[1].outside.some(c=>c.uid===got.life.uid),false);
 assertUniversalMatch(packs,got.s);

 let none=flip(1106,'IYS-1-006');
 assert.equal(none.s.pending,null);
 assert.equal(none.s.players[1].outside.some(c=>c.uid===none.life.uid),true);
 assert.equal(none.s.players[1].life.length,none.before-1);
 assertUniversalMatch(packs,none.s);

 let raid=flip(1109,'IYS-1-009');
 assert.equal(raid.s.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,raid.s).some(a=>a.mode==='raid'),false);
 assert.ok(legalUniversalActions(packs,raid.s).some(a=>a.mode==='get'));
 raid.s=choose(raid.s,a=>a.mode==='get');
 assert.equal(raid.s.players[1].hand.some(c=>c.uid===raid.life.uid),true);
 assertUniversalMatch(packs,raid.s);

 let paid=toPhase(fresh(ids,1110),'attack');
 fuel(paid,1,['IYS-1-010','IYS-1-012','IYS-1-001']);
 const base=put(paid,1,'IYS-1-005','front',0);
 const attacker=put(paid,0,'IYS-1-004','front',0,true);
 const life=crown(paid,1,'IYS-1-009');
 paid=use(paid,{type:'attack',uid:attacker.uid});
 paid=use(paid,{type:'chooseBlock',uid:null});
 const raidAction=legalUniversalActions(packs,paid).find(a=>a.mode==='raid'&&a.baseUid===base.uid);
 assert.ok(raidAction);
 paid=use(paid,raidAction);
 const stacked=paid.players[1].front.find(c=>c?.uid===life.uid);
 assert.equal(stacked.stack[0].uid,base.uid);
 assert.equal(paid.pending,null);
 assert.equal(bpOf(paid,stacked),4500);
 assert.equal(universalImpact(packs,paid,stacked),0);
 assertUniversalMatch(packs,paid);
});
