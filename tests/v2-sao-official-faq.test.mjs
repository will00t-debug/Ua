import test from 'node:test';
import assert from 'node:assert/strict';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';

// Official lists checked 2026-10-29 (Taipei):
// UA15BT https://www.unionarena-tcg.com/jp/faq/list.php?series=UA15BT
// UA15ST https://www.unionarena-tcg.com/jp/faq/list.php?series=UA15ST
// EX08BT https://www.unionarena-tcg.com/jp/faq/list.php?series=EX08BT
// UAPR has no Sword Art Online entries.
// PASS means this file, or an older V2 file cited in
// docs/v2-handoff/SAO-official-faq.md, reproduced that ruling.
// fullyAccepted stays 0. Registration is not FAQ certification.

const sao=registeredV2TitlePack('sword-art-online');
function deck(required){
 const rest=Object.values(sao.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(sao,counts),[]);
 return counts;
}
function take(s,p,id,zones=['hand','deck','life','outside','removed']){
 for(const zone of zones){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,card,line,slot,ready=false){
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function reach(packs,s,pred){
 for(let n=0;n<80&&!pred(s);n++){
  if(s.pending?.kind==='end-hand-limit'){
   const uid=s.players[s.pending.player].hand[0].uid;
   s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid});
   continue;
  }
  if(s.pending)throw Error('pending '+s.pending.kind);
  const step=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(step,s.phase+' '+s.active);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(pred(s),true,s.phase+' '+s.active);
 return s;
}
function fresh(ids,seed,first=0){
 const counts=deck(ids);
 const packs=[sao,sao];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed,first});
 s=reach(packs,s,x=>x.active===0&&x.phase==='main');
 return {packs,s};
}
function find(packs,s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 assert.ok(action,s.pending?.kind||s.phase);
 return action;
}
function use(packs,s,pred){
 return dispatchUniversalAction(packs,s,find(packs,s,pred));
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function bury(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const deck=s.players[p].deck;
 if(!deck.length)throw Error('No deck card to place under '+card.cardId);
 const under=deck.pop(); under.faceDown=false; card.stack=[under]; return card;
}
function yellow(s,p){
 return [0,1].map(i=>place(s,p,take(s,p,'SAO-1-003'),'energy',i,true));
}
function setLife(s,p,n){
 while(s.players[p].life.length>n)s.players[p].outside.push(s.players[p].life.pop());
 assert.equal(s.players[p].life.length,n);
}
function body(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function lifeTop(s,p,id){
 const card=take(s,p,id);
 s.players[p].deck.push(s.players[p].life.shift());
 s.players[p].life.unshift(card);
 return card;
}

test('Q752: taking the last life with Leafa loses after the buff is applied',()=>{
 const {packs,s}=fresh(['SAO-1-028','SAO-1-003'],752);
 yellow(s,0);
 setLife(s,0,1);
 const last=s.players[0].life[0];
 const leafa=hold(s,0,'SAO-1-028');
 let played=use(packs,s,a=>a.type==='play'&&a.uid===leafa.uid&&a.line==='front');
 assert.equal(played.pending.kind,'effect-life-until');
 aiOk(packs,played);
 const kept=use(packs,structuredClone(played),a=>a.type==='chooseLifeUntil'&&a.uid===null);
 assert.equal(kept.status,'playing');
 assert.equal(kept.players[0].life.length,1);
 assert.equal(universalBp(packs,kept,body(kept,0,leafa.uid)),4000);
 played=use(packs,played,a=>a.type==='chooseLifeUntil'&&a.uid===last.uid);
 assert.equal(played.players[0].life.length,0);
 assert.ok(played.players[0].hand.some(c=>c.uid===last.uid));
 assert.equal(universalBp(packs,played,body(played,0,leafa.uid)),6000);
 assert.equal(played.continuousStates.some(e=>e.kind==='cannotBeChosenByOppEffect'&&
  e.targetUid===leafa.uid),true);
 assert.equal(played.status,'finished');
 assert.equal(played.endReason,'life-zero');
 assert.equal(played.winner,1);
 assert.equal(assertUniversalMatch(packs,played),true);
});

test('Q754: Radiant Light rests once, the next start stays rested, then the end refresh actives',()=>{
 const {packs,s}=fresh(['SAO-1-034','SAO-1-003','SAO-1-001'],754);
 yellow(s,0);
 const victim=place(s,1,take(s,1,'SAO-1-001'),'front',0,true);
 const event=hold(s,0,'SAO-1-034');
 let played=use(packs,s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(played.pending.kind,'effect-rest-bp');
 assert.equal(played.pending.skipNextActive,true);
 aiOk(packs,played);
 played=use(packs,played,a=>a.type==='chooseRestBp'&&a.uid===victim.uid);
 assert.equal(body(played,1,victim.uid).ready,false);
 assert.equal(played.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&
  e.targetUid===victim.uid),true);
 let started=reach(packs,played,x=>x.active===1&&x.phase==='start');
 assert.equal(body(started,1,victim.uid).ready,false);
 assert.equal(started.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&
  e.targetUid===victim.uid),false);
 let later=reach(packs,started,x=>x.active===0&&x.phase==='start'&&x.players[0].ownTurns>=2);
 assert.equal(body(later,1,victim.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,later),true);
});

test('Q755 and Q768: an opponent swap moves Asuna outside her move phase',()=>{
 function swapped(id,seed){
  const {packs,s}=fresh(['SAO-1-022','SAO-1-003',id,'SAO-2-028'],seed);
  yellow(s,0);
  const asuna=place(s,1,take(s,1,id),'front',0,true);
  const yuna=place(s,1,take(s,1,'SAO-2-028'),'energy',0,true);
  const caster=bury(s,0,hold(s,0,'SAO-1-022'));
  let played=use(packs,s,a=>a.type==='play'&&a.uid===caster.uid&&a.line==='front');
  played=use(packs,played,a=>a.type==='chooseRestGen'&&a.uid===asuna.uid);
  played=use(packs,played,a=>a.type==='chooseRestGen'&&a.uid===yuna.uid);
  assert.equal(played.pending.step,'swap');
  aiOk(packs,played);
  played=use(packs,played,a=>a.type==='chooseRestGen'&&a.uid===yuna.uid);
  return {packs,played,asuna};
 }
 const blue=swapped('SAO-1-036',755);
 const moved=body(blue.played,1,blue.asuna.uid);
 assert.equal(blue.played.players[1].energy.some(c=>c?.uid===blue.asuna.uid),true);
 assert.equal(universalBp(blue.packs,blue.played,moved),4000);
 assert.equal(moved.lineShiftUsedTurn,blue.played.turn);
 const tall=swapped('SAO-1-101',768);
 const goddess=body(tall.played,1,tall.asuna.uid);
 assert.equal(universalBp(tall.packs,tall.played,goddess),5000);
 assert.equal(universalImpact(tall.packs,tall.played,goddess),1);
 assert.equal(assertUniversalMatch(tall.packs,tall.played),true);
});

test('Q757: raiding Leafa-named Asuna from energy to the front grants attack draw',()=>{
 const ids=['SAO-1-037','SAO-1-036','SAO-2-014'];
 const moving=fresh(ids,757);
 const base=place(moving.s,0,take(moving.s,0,'SAO-1-036'),'energy',0,false);
 place(moving.s,0,take(moving.s,0,'SAO-2-014'),'energy',1,false);
 const asuna=hold(moving.s,0,'SAO-1-037');
 let raided=use(moving.packs,moving.s,a=>a.type==='raid'&&a.uid===asuna.uid&&
  a.baseUid===base.uid&&a.line!=='energy');
 const top=raided.players[0].front.find(c=>c?.uid===asuna.uid);
 assert.equal(top.attackDrawGranted.turn,raided.turn);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(assertUniversalMatch(moving.packs,raided),true);
 const stay=fresh(['SAO-1-037','SAO-1-036','SAO-2-014','SAO-1-052'],758);
 place(stay.s,0,take(stay.s,0,'SAO-2-014'),'energy',0,false);
 place(stay.s,0,take(stay.s,0,'SAO-1-052'),'energy',1,false);
 const home=place(stay.s,0,take(stay.s,0,'SAO-1-036'),'front',0,false);
 const quiet=hold(stay.s,0,'SAO-1-037');
 let parked=use(stay.packs,stay.s,a=>a.type==='raid'&&a.uid===quiet.uid&&
  a.baseUid===home.uid&&a.line!=='energy');
 assert.equal(parked.players[0].front.find(c=>c?.uid===quiet.uid).attackDrawGranted,undefined);
 assert.equal(assertUniversalMatch(stay.packs,parked),true);
});

test('Q758 and Q759: attack-end swap waits for the life trigger, and leaves with a Special retire',()=>{
 const ids=['SAO-1-041','SAO-1-035','SAO-2-003','SAO-1-034'];
 function swing(seed,lifeId){
  const {packs,s}=fresh(ids,seed);
  const kirito=place(s,0,take(s,0,'SAO-1-041'),'front',0,true);
  const asuna=place(s,0,take(s,0,'SAO-1-035'),'energy',0,true);
  lifeTop(s,1,lifeId);
  bury(s,0,kirito);
  let going=reach(packs,s,x=>x.phase==='attack');
  going=use(packs,going,a=>a.type==='attack'&&a.uid===kirito.uid);
  going=dispatchUniversalAction(packs,going,{type:'chooseBlock',uid:null});
  return {packs,going,kirito,asuna};
 }
 const draw=swing(758,'SAO-2-003');
 assert.equal(draw.going.pending.kind,'life-trigger');
 assert.equal(draw.going.pending.trigger,'draw');
 assert.notEqual(draw.going.pending.kind,'effect-attack-end-named');
 let after=use(draw.packs,draw.going,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(after.pending.kind,'effect-attack-end-named');
 aiOk(draw.packs,after);
 after=use(draw.packs,after,a=>a.type==='chooseAttackEndNamed'&&a.uid===draw.asuna.uid);
 assert.equal(after.players[0].front.some(c=>c?.uid===draw.asuna.uid),true);
 assert.equal(after.players[0].energy.some(c=>c?.uid===draw.kirito.uid),true);
 const special=swing(759,'SAO-1-034');
 assert.equal(special.going.pending.trigger,'special');
 let retired=use(special.packs,special.going,a=>a.type==='chooseTrigger'&&
  a.mode==='special'&&a.uid===special.kirito.uid);
 assert.equal(retired.players[0].outside.some(c=>c.uid===special.kirito.uid),true);
 assert.notEqual(retired.pending?.kind,'effect-attack-end-named');
 assert.equal(retired.status,'playing');
 assert.equal(assertUniversalMatch(special.packs,retired),true);
});

test('Q761: switch and an opponent swap cannot bring the front-banned Asuna to the front',()=>{
 const move=fresh(['SAO-1-103','SAO-2-014','SAO-1-049','SAO-1-001'],761);
 place(move.s,0,take(move.s,0,'SAO-2-014'),'energy',0,false);
 const banned=place(move.s,0,take(move.s,0,'SAO-1-049'),'energy',1,false);
 const other=place(move.s,0,take(move.s,0,'SAO-1-001'),'front',0,true);
 const kirito=hold(move.s,0,'SAO-1-103');
 let asked=use(move.packs,move.s,a=>a.type==='play'&&a.uid===kirito.uid&&a.line==='front');
 assert.equal(asked.pending.kind,'effect-line-move');
 assert.equal(assertUniversalMatch(move.packs,asked),true);
 assert.equal(asked.pending.choices.includes(banned.uid),false);
 assert.equal(asked.pending.choices.includes(other.uid),true);
 assert.throws(()=>dispatchUniversalAction(move.packs,asked,
  {type:'chooseLineMove',uid:banned.uid}),/not currently legal/);
 const swap=fresh(['SAO-1-022','SAO-1-003','SAO-1-049','SAO-1-001'],762);
 yellow(swap.s,0);
 const front=place(swap.s,1,take(swap.s,1,'SAO-1-001'),'front',0,true);
 const energy=place(swap.s,1,take(swap.s,1,'SAO-1-049'),'energy',0,true);
 const caster=bury(swap.s,0,hold(swap.s,0,'SAO-1-022'));
 let rested=use(swap.packs,swap.s,a=>a.type==='play'&&a.uid===caster.uid&&a.line==='front');
 rested=use(swap.packs,rested,a=>a.type==='chooseRestGen'&&a.uid===front.uid);
 rested=use(swap.packs,rested,a=>a.type==='chooseRestGen'&&a.uid===energy.uid);
 assert.equal(rested.pending,null);
 assert.equal(rested.players[1].energy.some(c=>c?.uid===energy.uid),true);
 assert.equal(rested.players[1].front.some(c=>c?.uid===front.uid),true);
 assert.equal(assertUniversalMatch(swap.packs,rested),true);
});

test('Q764 and Q765: equal BP is an attacking win, and a snipe still battles',()=>{
 const {packs,s}=fresh(['SAO-1-091','SAO-1-073','SAO-1-041'],764);
 for(let i=0;i<3;i++)place(s,0,take(s,0,'SAO-1-073'),'energy',i,true);
 const sinon=bury(s,0,hold(s,0,'SAO-1-091'));
 let played=use(packs,s,a=>a.type==='play'&&a.uid===sinon.uid&&a.line==='front');
 const shooter=played.players[0].front.find(c=>c?.uid===sinon.uid);
 shooter.ready=true;
 const wall=place(played,1,take(played,1,'SAO-1-041'),'front',0,true);
 assert.equal(universalBp(packs,played,shooter),4000);
 assert.equal(universalBp(packs,played,wall),4000);
 played=reach(packs,played,x=>x.phase==='attack');
 played=use(packs,played,a=>a.type==='attack'&&a.uid===sinon.uid&&a.targetUid===wall.uid);
 assert.equal(played.pending.kind,'effect-top-order');
 assert.equal(played.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(played.players[0].front.some(c=>c?.uid===sinon.uid),true);
 aiOk(packs,played);
 assert.equal(assertUniversalMatch(packs,played),true);
});

test('Q1195: one front Kirito and Eugeo satisfies both the field and the front sentences',()=>{
 const {packs,s}=fresh(['SAO-2-003','SAO-1-001'],1195);
 const pair=place(s,0,take(s,0,'SAO-2-003'),'front',0,true);
 const printed=c=>sao.cards[c.cardId];
 const names=['キリト','ユージオ'];
 const front={kind:'ownFieldHasAllNames',turn:'any',zone:'front',excludeSelf:false,names};
 const field={...front,zone:'field'};
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,front,printed,()=>0),true);
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,field,printed,()=>0),true);
 s.players[0].front[0]=null;
 place(s,0,pair,'energy',0,true);
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,field,printed,()=>0),true);
 assert.equal(matchesV2LiveCondition(s,0,pair.uid,front,printed,()=>0),false);
 const kirito=place(s,0,take(s,0,'SAO-1-001'),'front',0,true);
 assert.equal(matchesV2LiveCondition(s,0,kirito.uid,front,printed,()=>0),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
