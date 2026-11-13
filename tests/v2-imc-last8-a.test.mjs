// The last eight IMC cards, played through the real battle pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createImcV2Pack,imcProgramFor} from '../dist/universal-v2/imc-pack.mjs';
import {IMC_REQUESTS_001_050} from '../dist/universal-v2/imc/requests-001-050.mjs';
import {IMC_REQUESTS_051_100} from '../dist/universal-v2/imc/requests-051-100.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalImpact} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const WISH='お願い！シンデレラ';
const DONE=['IMC-1-016','IMC-1-029','IMC-1-043','IMC-1-064','IMC-1-068','IMC-1-072','IMC-1-094','IMC-1-097'];
const pack=createImcV2Pack();
const COUNTS={
 'IMC-1-016':2,'IMC-1-029':1,'IMC-1-043':1,'IMC-1-064':1,'IMC-1-068':1,'IMC-1-072':1,
 'IMC-1-094':1,'IMC-1-097':1,'IMC-1-001':4,'IMC-1-007':4,'IMC-1-013':2,'IMC-1-010':1,
 'IMC-1-015':1,'IMC-1-002':2,'IMC-1-047':2,'IMC-1-040':2,'IMC-1-038':1,'IMC-1-044':1,
 'IMC-1-035':2,'IMC-1-053':1,'IMC-1-059':1,'IMC-1-055':2,'IMC-1-058':2,'IMC-1-052':2,
 'IMC-1-071':4,'IMC-1-091':2,'IMC-1-095':2,'IMC-1-088':1,'IMC-1-070':1,'IMC-1-069':1
};

function legal(s){return legalUniversalActions(pack,s);}
function dispatch(s,action){return dispatchUniversalAction(pack,s,action);}
function take(s,pred,label){
 const action=legal(s).find(pred);
 assert.ok(action,label||s.pending?.kind||s.phase);
 return dispatch(s,action);
}
function fresh(seed){
 return newUniversalMatch(pack,{decks:[COUNTS,COUNTS],seed,first:0});
}
function pull(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=pl[zone];
  if(!Array.isArray(list))continue;
  const index=list.findIndex(c=>c?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(c=>c?.cardId===id);
  if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
 }
 throw Error('Missing '+id);
}
function hold(s,owner,id){
 const card=pull(s,owner,id);
 s.players[owner].hand.push(card);
 return card;
}
function clearHand(s,owner=0){
 const pl=s.players[owner];
 while(pl.hand.length)pl.deck.push(pl.hand.pop());
}
function seat(s,owner,id,line,slot,ready=false){
 const card=pull(s,owner,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=card;
 return card;
}
function reach(s,phase){
 for(let i=0;i<8&&s.phase!==phase;i++){
  if(s.pending)throw Error((s.pending.kind||s.pending)+' before '+phase);
  s=take(s,a=>a.type==='next');
 }
 assert.equal(s.phase,phase);
 return s;
}
function main(seed){return reach(fresh(seed),'main');}
function attackPhase(s){
 for(let i=0;i<6&&s.phase!=='attack'&&!s.pending;i++)s=take(s,a=>a.type==='next');
 return s;
}
function setTop(s,owner,ids){
 const cards=ids.map(id=>pull(s,owner,id));
 s.players[owner].deck.unshift(...cards);
 return cards;
}
function armLife(s,owner,id){
 const trigger=pull(s,owner,id);
 while(s.players[owner].life.length>=7)s.players[owner].deck.push(s.players[owner].life.shift());
 s.players[owner].life.unshift(trigger);
 return trigger;
}
function readyAp(s,n,owner=0){
 s.players[owner].apCards.forEach((c,i)=>{c.inPlay=i<n;c.ready=i<n;});
}
function buff(card,bp,turn){card.buffs=[{bp,untilTurn:turn}];}
function live(s,uid){
 return [...s.players[0].front,...s.players[0].energy,...s.players[1].front,...s.players[1].energy]
  .find(c=>c?.uid===uid);
}

test('the eight cards are ready and the other gaps stay requests',()=>{
 assert.equal(Object.keys(pack.cards).length,97);
 assert.equal(getTitle('imc').playable,false);
 assert.deepEqual(validateUniversalDeck(pack,COUNTS),[]);
 for(const id of DONE){
  assert.equal(pack.cards[id].id,id);
  assert.equal(imcProgramFor(id).ready,true);
 }
 for(const id of ['IMC-1-003','IMC-1-011','IMC-1-051','IMC-1-073','IMC-1-107'])
  assert.equal(pack.cards[id],undefined);
 const requests=[...IMC_REQUESTS_001_050,...IMC_REQUESTS_051_100].map(row=>row.cardId);
 for(const id of DONE)assert.equal(requests.includes(id),false);
 assert.equal(assertUniversalMatch(pack,fresh(8)),true);
});

test('IMC-1-016 draws, discards, and can recover that card',()=>{
 let s=main(1601);
 for(let i=0;i<4;i++)seat(s,0,'IMC-1-001','energy',i);
 clearHand(s);
 const high=pull(s,0,'IMC-1-016');
 s.players[0].outside.push(high);
 const plain=pull(s,0,'IMC-1-035');
 s.players[0].outside.push(plain);
 const drawn=setTop(s,0,['IMC-1-015'])[0];
 hold(s,0,'IMC-1-016');
 const deck=s.players[0].deck.length;
 s=take(s,a=>a.type==='play'&&a.line==='front');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn.uid));
 s=take(s,a=>a.type==='chooseDiscard'&&a.uid===drawn.uid);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.ok(s.pending.choices.includes(drawn.uid));
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 const skipped=dispatch(structuredClone(s),{type:'chooseOutsideRecovery',uid:null});
 assert.ok(skipped.players[0].outside.some(c=>c.uid===drawn.uid));
 assert.equal(skipped.pending,null);
 s=take(s,a=>a.type==='chooseOutsideRecovery'&&a.uid===drawn.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===drawn.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-016 peeks only from the front and switches one or all',()=>{
 let s=main(1602);
 const self=seat(s,0,'IMC-1-016','front',0,true);
 const other=seat(s,0,'IMC-1-007','front',1,true);
 const back=seat(s,0,'IMC-1-010','energy',0,true);
 const top=setTop(s,0,['IMC-1-013'])[0];
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===self.uid),false);
 buff(self,1000,s.turn);
 assert.equal(universalBp(pack,s,self),5000);
 const energy=seat(s,0,'IMC-1-016','energy',1,true);
 buff(energy,1000,s.turn);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===energy.uid&&a.mode==='peekBuffOthers'),false);
 s=take(s,a=>a.type==='activate'&&a.uid===self.uid&&a.mode==='peekBuffOthers');
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(s.pending.follow,'buffOthers');
 assert.equal('cardId' in s.pending,false);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=take(s,a=>a.type==='chooseTopCard'&&a.mode==='outside');
 assert.ok(s.players[0].outside.some(c=>c.uid===top.uid));
 assert.equal(s.pending.kind,'effect-peek-buff');
 assert.ok(s.pending.choices.includes(other.uid));
 assert.ok(s.pending.choices.includes(back.uid));
 assert.ok(s.pending.choices.includes(energy.uid));
 assert.equal(s.pending.choices.includes(self.uid),false);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 assert.throws(()=>dispatch(s,{type:'choosePeekBuff',uid:null}),/Action not currently legal|Peek buff/);
 s=take(s,a=>a.type==='choosePeekBuff'&&a.uid===other.uid);
 assert.equal(universalBp(pack,s,live(s,other.uid)),3000);
 assert.equal(universalBp(pack,s,live(s,back.uid)),1500);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===self.uid),false);

 const high=main(1603);
 const tall=seat(high,0,'IMC-1-016','front',0,true);
 const one=seat(high,0,'IMC-1-007','front',1,true);
 const two=seat(high,0,'IMC-1-010','energy',0,true);
 buff(tall,3000,high.turn);
 assert.equal(universalBp(pack,high,tall),7000);
 let wide=take(high,a=>a.type==='activate'&&a.uid===tall.uid);
 wide=take(wide,a=>a.type==='chooseTopCard'&&a.mode==='top');
 assert.equal(wide.pending,null);
 assert.equal(universalBp(pack,wide,live(wide,one.uid)),3000);
 assert.equal(universalBp(pack,wide,live(wide,two.uid)),2500);
 assert.equal(universalBp(pack,wide,live(wide,tall.uid)),7000);

 const empty=main(1604);
 const lone=seat(empty,0,'IMC-1-016','front',0,true);
 const mate=seat(empty,0,'IMC-1-007','energy',0,true);
 buff(lone,3000,empty.turn);
 while(empty.players[0].deck.length)empty.players[0].outside.push(empty.players[0].deck.pop());
 let spent=take(empty,a=>a.type==='activate'&&a.uid===lone.uid);
 assert.equal(spent.pending,null);
 assert.equal(universalBp(pack,spent,live(spent,mate.uid)),3000);

 const quiet=main(1605);
 const banned=seat(quiet,0,'IMC-1-016','front',0,true);
 seat(quiet,0,'IMC-1-007','front',1,true);
 buff(banned,3000,quiet.turn);
 grantContinuousState(quiet,{kind:'originalEffectsDisabled',controller:0,sourceUid:banned.uid,
  targetUid:banned.uid,sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 assert.equal(legal(quiet).some(a=>a.type==='activate'&&a.uid===banned.uid),false);
 assert.equal(assertUniversalMatch(pack,quiet),true);
});

test('IMC-1-029 enters active and scales the buff by the discarded trigger',()=>{
 let s=main(2901);
 for(let i=0;i<3;i++)seat(s,0,'IMC-1-001','energy',i);
 clearHand(s);
 const played=hold(s,0,'IMC-1-029');
 const specialCard=hold(s,0,'IMC-1-064');
 const plainCard=hold(s,0,'IMC-1-002');
 const character=seat(s,0,'IMC-1-007','front',0,true);
 s=take(s,a=>a.type==='play'&&a.uid===played.uid&&a.line==='energy');
 const field=s.players[0].energy.find(c=>c?.cardId==='IMC-1-029');
 assert.equal(field.ready,true);
 assert.equal(s.pending,null);
 s=take(s,a=>a.type==='activate'&&a.uid===field.uid&&a.mode==='discardScale');
 const special=s.players[0].hand.find(c=>c.uid===specialCard.uid);
 const plain=s.players[0].hand.find(c=>c.uid===plainCard.uid);
 assert.ok(s.pending.choices.includes(special.uid));
 assert.ok(s.pending.choices.includes(plain.uid));
 const ordinary=dispatch(structuredClone(s),{type:'chooseDiscardScale',uid:plain.uid});
 assert.equal(ordinary.pending.kind,'effect-scale-buff');
 assert.equal(ordinary.pending.bp,1000);
 assert.ok(ordinary.pending.choices.includes(character.uid));
 const skipped=take(ordinary,a=>a.type==='chooseScaleBuff'&&a.uid===null);
 assert.equal(universalBp(pack,skipped,live(skipped,character.uid)),2000);
 s=take(s,a=>a.type==='chooseDiscardScale'&&a.uid===special.uid);
 assert.equal(s.pending.bp,3000);
 s=take(s,a=>a.type==='chooseScaleBuff'&&a.uid===character.uid);
 assert.equal(universalBp(pack,s,live(s,character.uid)),5000);
 assert.equal(legal(s).some(a=>a.mode==='restImpact'&&a.uid===field.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-029 rests for impact only when every character matches',()=>{
 let s=main(2902);
 const field=seat(s,0,'IMC-1-029','energy',0,true);
 const beyond=seat(s,0,'IMC-1-007','front',0,true);
 const stranger=seat(s,0,'IMC-1-001','front',1,true);
 hold(s,0,'IMC-1-001');
 buff(beyond,5000,s.turn);
 assert.equal(legal(s).some(a=>a.mode==='restImpact'),false);
 s.players[0].front[1]=null;
 s.players[0].hand.push(stranger);
 const low=seat(s,0,'IMC-1-010','front',1,true);
 assert.equal(universalBp(pack,s,low),1500);
 assert.equal(legal(s).some(a=>a.uid===field.uid&&a.mode==='restImpact'),true);
 s=take(s,a=>a.uid===field.uid&&a.mode==='restImpact');
 assert.equal(live(s,field.uid).ready,false);
 assert.equal(s.pending.kind,'effect-rest-impact');
 assert.deepEqual(s.pending.choices,[beyond.uid]);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 s=take(s,a=>a.type==='chooseRestImpact'&&a.uid===beyond.uid);
 assert.equal(universalImpact(pack,s,live(s,beyond.uid)),1);
 assert.equal(legal(s).some(a=>a.mode==='restImpact'),false);
 assert.equal(legal(s).some(a=>a.mode==='discardScale'&&a.uid===field.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-029 special trigger retires one opposing front character',()=>{
 let s=reach(fresh(2903),'attack');
 const attacker=seat(s,0,'IMC-1-007','front',0,true);
 const rear=seat(s,0,'IMC-1-001','energy',0,true);
 armLife(s,1,'IMC-1-029');
 s=take(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 if(s.pending?.kind==='block')s=take(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'special');
 assert.equal(legal(s).some(a=>a.mode==='special'&&a.uid===attacker.uid),true);
 assert.equal(legal(s).some(a=>a.uid===rear.uid),false);
 const skipped=dispatch(structuredClone(s),{type:'chooseTrigger',mode:'skip'});
 assert.ok(skipped.players[0].front.some(c=>c?.uid===attacker.uid));
 s=take(s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===attacker.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===attacker.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-043 can skip, rest from the look, and activate the entered card',()=>{
 let s=reach(fresh(4301),'attack');
 const self=seat(s,0,'IMC-1-043','front',0,true);
 const away=seat(s,0,'IMC-1-001','front',1,true);
 const marker=setTop(s,0,['IMC-1-035'])[0];
 s=take(s,a=>a.type==='attack'&&a.uid===self.uid);
 assert.equal(s.pending.kind,'effect-bottom-own');
 assert.ok(s.pending.choices.includes(self.uid));
 assert.ok(s.pending.choices.includes(away.uid));
 s=take(s,a=>a.type==='chooseBottomOwn'&&a.uid===null);
 assert.notEqual(s.pending?.kind,'effect-top-script');
 if(s.pending?.kind==='block')s=take(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.players[0].deck[0].uid,marker.uid);

 s=reach(fresh(4302),'attack');
 const attacker=seat(s,0,'IMC-1-043','front',0,true);
 const bottomed=seat(s,0,'IMC-1-001','energy',0,true);
 const [blue,stranger,other]=setTop(s,0,['IMC-1-040','IMC-1-001','IMC-1-035']);
 hold(s,0,'IMC-1-007');
 s=take(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 s=take(s,a=>a.type==='chooseBottomOwn'&&a.uid===bottomed.uid);
 assert.equal(s.players[0].deck.at(-1).uid,bottomed.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.deepEqual(s.pending.uids,[blue.uid,stranger.uid,other.uid]);
 assert.equal(legal(s).some(a=>a.mode==='raid'),false);
 assert.equal(legal(s).some(a=>a.mode==='enter'&&a.uid===stranger.uid),false);
 assert.equal(legal(s).some(a=>a.mode==='enter'&&a.uid===blue.uid),true);
 const looked=dispatch(structuredClone(s),legal(structuredClone(s)).find(a=>a.mode==='skip'));
 assert.equal(looked.pending.kind,'effect-top-order');
 assert.notEqual(looked.pending.kind,'effect-entered-discard');
 s=take(s,a=>a.type==='chooseTopScript'&&a.mode==='enter'&&a.uid===blue.uid&&a.line==='energy');
 assert.equal(s.pending.kind,'effect-top-order');
 assert.ok(s.players[0].energy.some(c=>c?.uid===blue.uid&&c.ready===false));
 while(s.pending?.kind==='effect-top-order')s=take(s,a=>a.type==='chooseTopOrder');
 assert.equal(s.pending.kind,'effect-entered-discard');
 const rested=dispatch(structuredClone(s),{type:'chooseEnteredDiscard',uid:null});
 assert.equal(live(rested,blue.uid).ready,false);
 const payment=s.players[0].hand.find(c=>c.cardId==='IMC-1-007');
 s=take(s,a=>a.type==='chooseEnteredDiscard'&&a.uid===payment.uid);
 assert.equal(live(s,blue.uid).ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===payment.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===payment.uid&&e.reason==='own-effect'&&e.to==='outside'));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-043 returns its direct raid base and ignores a lost block',()=>{
 let s=main(4303);
 seat(s,0,'IMC-1-053','energy',0);
 seat(s,0,'IMC-1-059','energy',1);
 seat(s,0,'IMC-1-047','energy',2);
 seat(s,0,'IMC-1-055','energy',3);
 const base=seat(s,0,'IMC-1-040','front',0,true);
 clearHand(s);
 const raider=hold(s,0,'IMC-1-043');
 s=take(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'IMC-1-043');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 s=attackPhase(s);
 if(s.pending)s=take(s,a=>a.type==='next'||a.uid===null||a.mode==='skip');
 s=reach(s.phase==='attack'?s:attackPhase(s),'attack');
 armLife(s,1,'IMC-1-064');
 s=take(s,a=>a.type==='attack'&&a.uid===top.uid);
 if(s.pending?.kind==='effect-bottom-own')s=take(s,a=>a.type==='chooseBottomOwn'&&a.uid===null);
 if(s.pending?.kind==='block')s=take(s,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(s.pending.kind,'life-trigger');
 s=take(s,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===top.uid);
 assert.equal(s.pending.kind,'effect-return-raid-base');
 assert.equal(s.pending.baseUid,base.uid);
 assert.equal(s.pending.name,undefined);
 const kept=dispatch(structuredClone(s),{type:'chooseReturnRaidBase',uid:null});
 assert.ok(kept.players[0].outside.some(c=>c.uid===base.uid));
 s=take(s,a=>a.type==='chooseReturnRaidBase'&&a.uid===base.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===base.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===base.uid&&e.from==='outside'&&e.to==='hand'));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-064 must bounce, and may retire only with three LiPPS',()=>{
 let s=main(6401);
 ['IMC-1-035','IMC-1-040','IMC-1-038','IMC-1-044'].forEach((id,i)=>seat(s,0,id,'energy',i));
 clearHand(s);
 const poor=hold(s,0,'IMC-1-064');
 const removed=s.players[0].energy.slice();
 s.players[0].energy=[null,null,null,null];
 s.players[0].outside.push(...removed);
 assert.equal(legal(s).some(a=>a.type==='event'&&a.uid===poor.uid),false);
 removed.forEach((c,i)=>{
  s.players[0].outside.splice(s.players[0].outside.indexOf(c),1);
  s.players[0].energy[i]=c;
 });
 const tall=seat(s,1,'IMC-1-007','front',0,true);
 const rear=seat(s,1,'IMC-1-001','energy',0,true);
 buff(tall,5000,s.turn);
 assert.equal(universalBp(pack,s,tall),7000);
 s=take(s,a=>a.type==='event'&&a.uid===poor.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===poor.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===tall.uid));
 assert.ok(s.players[1].energy.some(c=>c?.uid===rear.uid));

 s=main(6402);
 ['IMC-1-035','IMC-1-040','IMC-1-038','IMC-1-044'].forEach((id,i)=>seat(s,0,id,'energy',i));
 const lips=seat(s,0,'IMC-1-047','front',0,true);
 seat(s,0,'IMC-1-052','front',1,true);
 const victim=seat(s,1,'IMC-1-001','front',0,true);
 const hidden=seat(s,1,'IMC-1-007','energy',0,true);
 clearHand(s);
 const event=hold(s,0,'IMC-1-064');
 s=take(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-field-trait-bounce');
 assert.deepEqual(s.pending.choices,[victim.uid]);
 assert.equal(s.pending.choices.includes(hidden.uid),false);
 assert.equal(legal(s).some(a=>a.mode==='retire'),false);
 assert.equal(legal(s).some(a=>a.uid===null),false);
 const bounced=dispatch(structuredClone(s),{type:'chooseFieldTraitBounce',uid:victim.uid,mode:'bounce'});
 assert.ok(bounced.players[1].hand.some(c=>c.uid===victim.uid));
 assert.ok(bounced.zoneMoveEvents.some(e=>e.uid===victim.uid&&e.to==='hand'&&e.reason==='opponent-effect'));
 seat(s,0,'IMC-1-055','front',2,true);
 s=take(s,a=>a.type==='chooseFieldTraitBounce'&&a.uid===victim.uid&&a.mode==='retire');
 assert.ok(s.players[1].outside.some(c=>c.uid===victim.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===lips.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-068 offers one sentence, and the nine-name sentence only at nine',()=>{
 let s=main(6801);
 readyAp(s,3);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 seat(s,0,'IMC-1-091','energy',3);
 clearHand(s);
 const other=seat(s,0,'IMC-1-070','front',1,true);
 hold(s,0,'IMC-1-068');
 hold(s,0,'IMC-1-071');
 hold(s,0,'IMC-1-094');
 hold(s,0,'IMC-1-001');
 const before=s.players[0].deck.length;
 s=take(s,a=>a.type==='play'&&a.line==='front'&&a.uid===s.players[0].hand.find(c=>c.cardId==='IMC-1-068').uid);
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.equal(s.pending.max,1);
 assert.deepEqual(s.pending.options.map(o=>o.id),['retire']);
 s=take(s,a=>a.type==='chooseOrderedSubset'&&a.mode==='confirm');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,before);
 assert.equal(s.players[0].front.find(c=>c?.cardId==='IMC-1-068').ready,false);

 s=main(6802);
 readyAp(s,3);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 const victim=seat(s,0,'IMC-1-070','front',1,true);
 clearHand(s);
 const actor=hold(s,0,'IMC-1-068');
 const girl=hold(s,0,'IMC-1-071');
 const expensive=hold(s,0,'IMC-1-094');
 const yellow=hold(s,0,'IMC-1-001');
 const deck=s.players[0].deck.length;
 s=take(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 s=take(s,a=>a.mode==='pick'&&a.id==='retire');
 assert.equal(legal(s).some(a=>a.mode==='pick'&&a.id==='front'),false);
 s=take(s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-option-retire-own');
 assert.equal(s.pending.choices.includes(actor.uid),false);
 assert.ok(s.pending.choices.includes(victim.uid));
 const skipped=dispatch(structuredClone(s),{type:'chooseRetireOwnOther',uid:null});
 assert.equal(skipped.players[0].deck.length,deck);
 assert.ok(skipped.players[0].front.some(c=>c?.uid===victim.uid));
 s=take(s,a=>a.type==='chooseRetireOwnOther'&&a.uid===victim.uid);
 assert.ok(s.players[0].outside.some(c=>c.uid===victim.uid));
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.ok(s.pending.choices.includes(girl.uid));
 assert.equal(s.pending.choices.includes(expensive.uid),false);
 assert.equal(s.pending.choices.includes(yellow.uid),false);
 s=take(s,a=>a.type==='chooseHandRest'&&a.uid===girl.uid&&a.line==='energy');
 assert.equal(live(s,girl.uid).ready,false);
 if(s.pending?.kind==='effect-hand-rest')s=take(s,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-068 retires an opposing front character once nine wish names exist',()=>{
 const program=imcProgramFor('IMC-1-068');
 const face=(partial)=>({color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[WISH],trigger:null,implementation:'vanilla',...partial});
 const names=['小日向 美穂','城ヶ崎 美嘉','城ヶ崎 莉嘉','多田 李衣菜','渋谷 凛','島村 卯月','本田 未央','第九名'];
 const cards=[
  face({id:'IMC-1-068',name:'神崎 蘭子',energy:4,ap:2,bp:4000,implementation:'dsl',
   effects:program.effects}),
  ...names.map((name,i)=>face({id:'IMC-PROBE-'+i,name,gen:i===0?2:1})),
  face({id:'IMC-PROBE-FOE',name:'路人',traits:[],bp:2000}),
  ...Array.from({length:10},(_,i)=>face({id:'IMC-PROBE-PAD-'+i,name:'填充'+i,traits:[]}))
 ];
 const counts={'IMC-1-068':1,...Object.fromEntries(names.map((_,i)=>['IMC-PROBE-'+i,1])),
  'IMC-PROBE-FOE':1,...Object.fromEntries(Array.from({length:10},(_,i)=>['IMC-PROBE-PAD-'+i,4]))};
 const probe=createUniversalPack({id:'imc-nine',version:'nine-names',cards});
 assert.deepEqual(validateUniversalDeck(probe,counts),[]);
 const act=(s,pred)=>{
  const action=legalUniversalActions(probe,s).find(pred);
  assert.ok(action,s.pending?.kind||s.phase);
  return dispatchUniversalAction(probe,s,action);
 };
 let s=newUniversalMatch(probe,{decks:[counts,counts],seed:6803,first:0});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error(s.pending.kind);
  s=act(s,a=>a.type==='next');
 }
 s.players[0].apCards.forEach((c,i)=>{c.inPlay=i<3;c.ready=i<3;});
 const pullNine=(owner,id)=>{
  const pl=s.players[owner];
  for(const zone of ['hand','deck','life','outside']){
   const index=pl[zone].findIndex(c=>c.cardId===id);
   if(index>=0)return pl[zone].splice(index,1)[0];
  }
  throw Error('Missing '+id);
 };
 const put=(owner,id,line,slot)=>{
  const card=pullNine(owner,id);
  card.ready=false;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner][line][slot]=card;
  return card;
 };
 put(0,'IMC-PROBE-0','energy',0);
 put(0,'IMC-PROBE-1','energy',1);
 put(0,'IMC-PROBE-2','energy',2);
 put(0,'IMC-PROBE-3','energy',3);
 put(0,'IMC-PROBE-4','front',1);
 put(0,'IMC-PROBE-5','front',2);
 put(0,'IMC-PROBE-6','front',3);
 const ninth=pullNine(0,'IMC-PROBE-7');
 s.players[0].outside.push(ninth);
 while(s.players[0].hand.length)s.players[0].deck.push(s.players[0].hand.pop());
 const actor=pullNine(0,'IMC-1-068');
 s.players[0].hand.push(actor);
 const foe=put(1,'IMC-PROBE-FOE','front',0);
 s=act(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-ordered-subset');
 assert.deepEqual(s.pending.options.map(o=>o.id),['retire','front']);
 s=act(s,a=>a.mode==='pick'&&a.id==='front');
 s=act(s,a=>a.mode==='confirm');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.ok(s.pending.choices.includes(foe.uid));
 s=act(s,a=>a.uid===foe.uid);
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('IMC-1-072 activates from a wish payment and draws only after a real win at nine names',()=>{
 let s=main(7201);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 seat(s,0,'IMC-1-091','energy',3);
 clearHand(s);
 const self=hold(s,0,'IMC-1-072');
 s=take(s,a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c.uid===self.uid).ready,false);

 s=main(7202);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 seat(s,0,'IMC-1-091','energy',3);
 clearHand(s);
 const actor=hold(s,0,'IMC-1-072');
 const wish=hold(s,0,'IMC-1-071');
 const other=hold(s,0,'IMC-1-001');
 s=take(s,a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front');
 assert.equal(s.pending.kind,'effect-hand-trait-active');
 assert.ok(s.pending.choices.includes(wish.uid));
 assert.equal(s.pending.choices.includes(other.uid),false);
 const skipped=dispatch(structuredClone(s),{type:'chooseHandTraitActive',uid:null});
 assert.equal(live(skipped,actor.uid).ready,false);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===wish.uid));
 s=take(s,a=>a.type==='chooseHandTraitActive'&&a.uid===wish.uid);
 assert.equal(live(s,actor.uid).ready,true);
 assert.ok(s.players[0].outside.some(c=>c.uid===wish.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===wish.uid&&e.reason==='payment'));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=reach(fresh(7203),'attack');
 const winner=seat(s,0,'IMC-1-072','front',0,true);
 const blocker=seat(s,1,'IMC-1-001','front',0,true);
 const deck=s.players[0].deck.length;
 const open=dispatch(structuredClone(s),legal(s).find(a=>a.type==='attack'&&a.uid===winner.uid));
 const unblocked=take(open,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.notEqual(unblocked.pending?.kind,'effect-attack-win-draw');
 s=take(s,a=>a.type==='attack'&&a.uid===winner.uid);
 s=take(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.notEqual(s.pending?.kind,'effect-attack-win-draw');
 assert.equal(s.players[0].deck.length,deck);
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
});

test('IMC-1-072 may draw one after a blocked win when nine wish names exist',()=>{
 const program=imcProgramFor('IMC-1-072');
 const face=(partial)=>({color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[WISH],trigger:null,implementation:'vanilla',...partial});
 const names=['小日向 美穂','城ヶ崎 美嘉','城ヶ崎 莉嘉','神崎 蘭子','渋谷 凛','島村 卯月','本田 未央','第九名'];
 const cards=[
  face({id:'IMC-1-072',name:'多田 李衣菜',energy:4,bp:4000,implementation:'dsl',
   attackWinDraw:program.attackWinDraw,effects:program.effects}),
  ...names.map((name,i)=>face({id:'IMC-PROBE-'+i,name,gen:i===0?2:1})),
  face({id:'IMC-PROBE-FOE',name:'路人',traits:[],bp:1000}),
  ...Array.from({length:10},(_,i)=>face({id:'IMC-PROBE-PAD-'+i,name:'填充'+i,traits:[]}))
 ];
 const counts={'IMC-1-072':1,...Object.fromEntries(names.map((_,i)=>['IMC-PROBE-'+i,1])),
  'IMC-PROBE-FOE':1,...Object.fromEntries(Array.from({length:10},(_,i)=>['IMC-PROBE-PAD-'+i,4]))};
 const probe=createUniversalPack({id:'imc-nine-draw',version:'nine-names',cards});
 assert.deepEqual(validateUniversalDeck(probe,counts),[]);
 const act=(s,pred)=>{
  const action=legalUniversalActions(probe,s).find(pred);
  assert.ok(action,s.pending?.kind||s.phase);
  return dispatchUniversalAction(probe,s,action);
 };
 let s=newUniversalMatch(probe,{decks:[counts,counts],seed:7204,first:0});
 for(let i=0;i<12&&s.phase!=='attack';i++){
  if(s.pending?.kind==='life-trigger')s=act(s,a=>a.mode==='skip');
  else if(s.pending)throw Error(s.pending.kind);
  else s=act(s,a=>a.type==='next');
 }
 const pullNine=(owner,id)=>{
  const pl=s.players[owner];
  for(const zone of ['hand','deck','life','outside']){
   const index=pl[zone].findIndex(c=>c.cardId===id);
   if(index>=0)return pl[zone].splice(index,1)[0];
  }
  throw Error('Missing '+id);
 };
 const put=(owner,id,line,slot,ready=false)=>{
  const card=pullNine(owner,id);
  card.ready=ready;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner][line][slot]=card;
  return card;
 };
 const winner=put(0,'IMC-1-072','front',0,true);
 put(0,'IMC-PROBE-0','energy',0);
 put(0,'IMC-PROBE-1','energy',1);
 put(0,'IMC-PROBE-2','energy',2);
 put(0,'IMC-PROBE-3','energy',3);
 put(0,'IMC-PROBE-4','front',1);
 put(0,'IMC-PROBE-5','front',2);
 put(0,'IMC-PROBE-6','front',3);
 s.players[0].outside.push(pullNine(0,'IMC-PROBE-7'));
 const blocker=put(1,'IMC-PROBE-FOE','front',0,true);
 const deck=s.players[0].deck.length;
 s=act(s,a=>a.type==='attack'&&a.uid===winner.uid);
 s=act(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
 assert.equal(s.pending.kind,'effect-attack-win-draw');
 const skipped=dispatchUniversalAction(probe,structuredClone(s),{type:'chooseAttackWinDraw',mode:'skip'});
 assert.equal(skipped.players[0].deck.length,deck);
 assert.equal(skipped.pending,null);
 s=act(s,a=>a.type==='chooseAttackWinDraw'&&a.mode==='draw');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('IMC-1-094 takes one of two and can rest its raid base after a hand payment',()=>{
 let s=main(9401);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 seat(s,0,'IMC-1-091','energy',3);
 clearHand(s);
 const [kept,dropped]=setTop(s,0,['IMC-1-095','IMC-1-070']);
 hold(s,0,'IMC-1-094');
 s=take(s,a=>a.type==='play'&&a.line==='front');
 assert.equal(s.pending.kind,'effect-top-take-one');
 assert.deepEqual(s.pending.uids,[kept.uid,dropped.uid]);
 s=take(s,a=>a.type==='chooseTopTakeOne'&&a.uid===kept.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===kept.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===dropped.uid));
 assert.equal(s.pending,null);

 s=main(9402);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 seat(s,0,'IMC-1-095','energy',3);
 const base=seat(s,0,'IMC-1-091','front',0,true);
 clearHand(s);
 setTop(s,0,['IMC-1-070','IMC-1-001']);
 const raider=hold(s,0,'IMC-1-094');
 s=take(s,a=>a.type==='raid'&&a.uid===raider.uid&&a.baseUid===base.uid);
 assert.equal(s.pending.kind,'effect-top-take-one');
 s=take(s,a=>a.type==='chooseTopTakeOne');
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'IMC-1-094');
 assert.equal(top.stack[0].uid,base.uid);
 clearHand(s);
 s=attackPhase(s);
 s=reach(s,'attack');
 top.ready=true;
 s=take(s,a=>a.type==='attack'&&a.uid===top.uid);
 assert.equal(s.pending?.kind,'block');
 assert.equal(top.stack[0].uid,base.uid);

 s=main(9403);
 seat(s,0,'IMC-1-069','energy',0);
 seat(s,0,'IMC-1-071','energy',1);
 seat(s,0,'IMC-1-088','energy',2);
 seat(s,0,'IMC-1-095','energy',3);
 const under=seat(s,0,'IMC-1-091','front',0,true);
 clearHand(s);
 setTop(s,0,['IMC-1-070','IMC-1-001']);
 const card=hold(s,0,'IMC-1-094');
 const payment=hold(s,0,'IMC-1-070');
 s=take(s,a=>a.type==='raid'&&a.uid===card.uid&&a.baseUid===under.uid);
 s=take(s,a=>a.type==='chooseTopTakeOne');
 const source=s.players[0].front[0];
 s=attackPhase(s);
 s=reach(s,'attack');
 source.ready=true;
 if(!s.players[0].hand.some(c=>c.uid===payment.uid))hold(s,0,'IMC-1-070');
 s=take(s,a=>a.type==='attack'&&a.uid===source.uid);
 assert.equal(s.pending.kind,'effect-pay-raid-base');
 const skipped=dispatch(structuredClone(s),{type:'choosePayRaidBase',uid:null});
 assert.equal(live(skipped,source.uid).stack[0].uid,under.uid);
 s=take(s,a=>a.type==='choosePayRaidBase'&&a.uid===payment.uid);
 assert.equal(s.pending.kind,'effect-raid-under-rest');
 assert.ok(s.players[0].outside.some(c=>c.uid===payment.uid));
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===payment.uid&&e.reason==='payment'));
 s=take(s,a=>a.type==='chooseRaidUnderRest'&&a.uid===under.uid&&a.line==='energy');
 assert.equal(live(s,under.uid).ready,false);
 assert.equal(live(s,source.uid).stack.length,0);
 assert.equal(live(s,source.uid).raidBaseUid,undefined);
 assert.ok(s.zoneMoveEvents.some(e=>e.uid===under.uid&&e.from==='raid-under'&&e.to==='energy'&&
  e.reason==='own-effect'&&e.attachedToUid===source.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-097 cannot attack until it pays, and the printed penalty returns next turn',()=>{
 let s=main(9701);
 clearHand(s);
 const self=hold(s,0,'IMC-1-097');
 s=take(s,a=>a.type==='play'&&a.uid===self.uid&&a.line==='front');
 assert.equal(s.pending,null);
 live(s,self.uid).ready=true;
 readyAp(s,0);
 s=attackPhase(s);
 assert.equal(s.phase,'attack');
 assert.equal(s.pending,null);
 assert.equal(legal(s).some(a=>a.type==='attack'&&a.uid===self.uid),false);

 s=main(9702);
 clearHand(s);
 const payer=hold(s,0,'IMC-1-097');
 s=take(s,a=>a.type==='play'&&a.uid===payer.uid&&a.line==='front');
 readyAp(s,1);
 const body=live(s,payer.uid);
 body.ready=true;
 buff(body,1000,s.turn);
 const foe=seat(s,1,'IMC-1-001','front',0,true);
 grantContinuousState(s,{kind:'cannotAttack',controller:1,sourceUid:foe.uid,targetUid:payer.uid,
  sourceLinked:false,until:{player:1,phase:'start',edge:'start'}});
 s=attackPhase(s);
 assert.equal(s.pending.kind,'effect-optional-pay-ap');
 const skipped=dispatch(structuredClone(s),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(originalEffectsDisabled(skipped,live(skipped,payer.uid)),false);
 assert.equal(legalUniversalActions(pack,skipped).some(a=>a.type==='attack'&&a.uid===payer.uid),false);
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,1);
 s=take(s,a=>a.type==='chooseOptionalPayAp'&&a.mode==='pay');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(originalEffectsDisabled(s,live(s,payer.uid)),true);
 assert.equal(universalBp(pack,s,live(s,payer.uid)),5000);
 assert.equal(legal(s).some(a=>a.type==='attack'&&a.uid===payer.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=main(9703);
 clearHand(s);
 const next=hold(s,0,'IMC-1-097');
 s=take(s,a=>a.type==='play'&&a.uid===next.uid&&a.line==='front');
 readyAp(s,1);
 live(s,next.uid).ready=true;
 s=attackPhase(s);
 s=take(s,a=>a.mode==='pay');
 assert.equal(legal(s).some(a=>a.type==='attack'&&a.uid===next.uid),true);
 for(let i=0;i<16&&s.active===0;i++){
  if(s.pending?.kind==='block')s=take(s,a=>a.type==='chooseBlock'&&a.uid===null);
  else if(s.pending?.kind==='life-trigger')s=take(s,a=>a.type==='chooseTrigger'&&a.mode==='skip');
  else if(s.pending?.kind==='end-hand-limit')s=take(s,a=>a.uid!==undefined);
  else if(s.pending)throw Error(s.pending.kind);
  else s=take(s,a=>a.type==='next');
 }
 assert.equal(s.active,1);
 assert.equal(originalEffectsDisabled(s,live(s,next.uid)),false);
 assert.equal(universalBp(pack,s,live(s,next.uid)),3000);
 for(let i=0;i<16&&s.phase!=='attack';i++){
  if(s.pending?.kind==='life-trigger')s=take(s,a=>a.mode==='skip');
  else if(s.pending?.kind==='end-hand-limit')s=take(s,a=>a.uid!==undefined);
  else if(s.pending)throw Error('return '+s.pending.kind);
  else s=take(s,a=>a.type==='next');
 }
 if(s.pending?.kind==='effect-optional-pay-ap')s=take(s,a=>a.mode==='skip');
 live(s,next.uid).ready=true;
 assert.equal(legal(s).some(a=>a.type==='attack'&&a.uid===next.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});
