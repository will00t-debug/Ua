import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalImpact,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {controllerDeckWindowCards} from '../dist/universal-v2/preview-actions.mjs';

const pack=createKmrBattlePack();
const packs=[pack,pack];

function fill(required,extra={}){
 const fillers=Object.values(pack.cards).filter(card=>!required.includes(card.id)&&
  !['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const caps={special:0,color:0,final:0},counts={...extra};
 for(const id of [...new Set(required)]){
  if(counts[id])continue;
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(Object.prototype.hasOwnProperty.call(caps,trigger)){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(pack.cards[id].maxCopies||4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 return counts;
}
function fresh(counts,first=0){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:12,first});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(card=>card.cardId===id);
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
function park(s,p){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
}
function ready(s){
 s.pending=null;s.phase='main';
 for(const ap of s.players[s.active].apCards){ap.inPlay=true;ap.ready=true;}
}
function legal(s){return legalUniversalActions(packs,s);}
function act(s,pred){
 const action=legal(s).find(pred);
 assert.ok(action,'missing action');
 return dispatchUniversalAction(packs,s,action);
}
function click(s,pred){
 const pool=s.pending?.actions?.length?s.pending.actions:legal(s);
 const action=pool.find(pred);
 assert.ok(action,'missing choice');
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,pred){
 return act(s,action=>(action.type==='play'||action.type==='event')&&action.uid===uid&&(!pred||pred(action)));
}
function raidOnto(s,uid,baseUid){
 return act(s,action=>action.type==='raid'&&action.uid===uid&&action.baseUid===baseUid);
}
function top(s,p,ids){
 for(const id of [...ids].reverse())s.players[p].deck.unshift(take(s,p,id));
}
function payGreen(s,need,skip=[]){
 const gens=[['KMR-2-045',2],['KMR-2-059',2],['KMR-2-048',1],['KMR-2-050',1]];
 let slot=0,have=0;
 for(const [id,gen] of gens){
  if(have>=need||skip.includes(id))continue;
  put(s,0,id,'energy',slot,true);
  have+=gen;slot++;
 }
 assert.ok(have>=need,'green energy');
}
function payBlue(s,need,skip=[]){
 const gens=[['KMR-2-025',2],['KMR-2-040',2],['KMR-2-036',1]];
 let slot=0,have=0;
 for(const [id,gen] of gens){
  if(have>=need||skip.includes(id))continue;
  put(s,0,id,'energy',slot,true);
  have+=gen;slot++;
 }
 assert.ok(have>=need,'blue energy');
}
function handOf(s,p,id){return take(s,p,id);}
function at(s,uid){
 for(const p of [0,1]){
  for(const zone of ['front','energy','hand','deck','life','outside','removed']){
   const card=(s.players[p][zone]||[]).find(item=>item?.uid===uid);
   if(card)return card;
  }
  const ap=(s.players[p].apCards||[]).find(item=>item?.uid===uid);
  if(ap)return ap;
 }
 throw Error('Lost '+uid);
}
function order(state,uids){
 for(const uid of uids){
  assert.equal(state.pending?.step,'lookOrder');
  state=click(state,action=>action.uid===uid);
 }
 return state;
}
function revealLife(id,attackerId='KMR-1-010',extra=[]){
 const s=fresh(fill([id,attackerId,...extra]));
 const attacker=put(s,0,attackerId,'front',0,true);
 const trigger=take(s,1,id);
 const buried=s.players[1].life[0];
 s.players[1].life[0]=trigger;
 s.players[1].deck.push(buried);
 ready(s);
 let state=act(s,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 return {state,trigger,attacker};
}

test('KMR-2-041 shows the whole top three, orders them, then discards only a non-Fourze',()=>{
 const counts=fill(['KMR-2-041','KMR-2-032','KMR-2-028','KMR-2-050','KMR-2-040','KMR-2-025']);
 function look(takeId){
  const s=fresh(counts);
  payBlue(s,1,['KMR-2-028','KMR-2-036']);
  top(s,0,['KMR-2-032','KMR-2-028','KMR-2-050']);
  const school=handOf(s,0,'KMR-2-041');
  park(s,0);
  s.players[0].hand.push(school);
  ready(s);
  const state=play(s,school.uid,action=>action.line==='energy');
  assert.equal(state.pending?.id,'KMR-2-041');
  assert.equal(state.pending.step,'lookPick');
  assert.deepEqual(state.pending.data.uids,state.players[0].deck.slice(0,3).map(card=>card.uid));
  const shown=controllerDeckWindowCards(state,packs,state.pending.actions);
  assert.deepEqual(shown.map(card=>card.cardId),['KMR-2-032','KMR-2-028','KMR-2-050']);
  assert.equal(shown.find(card=>card.cardId==='KMR-2-050').caption,'目前不能選');
  assert.equal(shown.filter(card=>card.caption==='點選此牌').length,2);
  assert.equal(universalPrivateChoices(packs,state,1),null);
  assert.equal(state.publicReveals.some(entry=>shown.some(card=>card.uid===entry.uid)),false);
  return {state,shown};
 }
 const fourze=look('KMR-2-032');
 const kept=fourze.shown.filter(card=>card.cardId!=='KMR-2-032').map(card=>card.uid);
 let state=click(fourze.state,action=>action.uid===fourze.shown[0].uid);
 assert.equal(state.pending.step,'lookOrder');
 assert.equal(state.publicReveals.some(entry=>entry.uid===fourze.shown[0].uid),true);
 state=order(state,kept);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===fourze.shown[0].uid),true);
 assert.deepEqual(state.players[0].deck.slice(-2).map(card=>card.uid),kept);
 assertUniversalMatch(packs,state);

 const other=look('KMR-2-028');
 const rest=other.shown.filter(card=>card.cardId!=='KMR-2-028').map(card=>card.uid);
 state=click(other.state,action=>action.uid===other.shown[1].uid);
 state=order(state,rest);
 assert.equal(state.pending?.step,'discard');
 assert.deepEqual(state.players[0].deck.slice(-2).map(card=>card.uid),rest);
 const added=other.shown[1].uid;
 state=click(state,action=>action.uid===added);
 assert.equal(state.players[0].outside.some(card=>card.uid===added),true);
 assert.deepEqual(state.players[0].deck.slice(-2).map(card=>card.uid),rest);
 assertUniversalMatch(packs,state);
});

test('KMR-2-042 draws two, and the third draw waits for a Fourze to be removed',()=>{
 const counts=fill(['KMR-2-042','KMR-2-029','KMR-2-025']);
 const skipped=fresh(counts);
 payBlue(skipped,2);
 const fourze=put(skipped,0,'KMR-2-029','front',0,true);
 const event=handOf(skipped,0,'KMR-2-042');
 park(skipped,0);
 skipped.players[0].hand.push(event);
 ready(skipped);
 const deck=skipped.players[0].deck.length;
 let state=play(skipped,event.uid);
 assert.equal(state.pending?.id,'KMR-2-042');
 assert.equal(state.pending.actions.some(action=>action.uid===fourze.uid),true);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),true);
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,2);
 assert.equal(state.players[0].deck.length,deck-2);
 assert.equal(state.players[0].front.some(card=>card?.uid===fourze.uid),true);
 assertUniversalMatch(packs,state);

 const accepted=fresh(counts);
 payBlue(accepted,2);
 const removed=put(accepted,0,'KMR-2-029','front',0,true);
 const played=handOf(accepted,0,'KMR-2-042');
 park(accepted,0);
 accepted.players[0].hand.push(played);
 ready(accepted);
 const before=accepted.players[0].deck.length;
 state=play(accepted,played.uid);
 state=click(state,action=>action.uid===removed.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].removed.some(card=>card.uid===removed.uid),true);
 assert.equal(state.players[0].hand.length,3);
 assert.equal(state.players[0].deck.length,before-3);
 assertUniversalMatch(packs,state);
});

test('KMR-2-043 readies up to two action cards and can stop after one',()=>{
 const s=fresh(fill(['KMR-2-043','KMR-2-025','KMR-2-040']));
 payBlue(s,3);
 const event=handOf(s,0,'KMR-2-043');
 park(s,0);
 s.players[0].hand.push(event);
 ready(s);
 const asleep=s.players[0].apCards.slice(0,2).map(ap=>ap.uid);
 for(const ap of s.players[0].apCards)if(asleep.includes(ap.uid))ap.ready=false;
 let state=play(s,event.uid);
 assert.equal(state.pending?.kind,'effect-recover-ap');
 const first=legal(state).find(action=>action.type==='chooseApRecovery'&&asleep.includes(action.uid));
 assert.ok(first);
 const other=asleep.find(uid=>uid!==first.uid);
 state=dispatchUniversalAction(packs,state,first);
 assert.equal(at(state,first.uid).ready,true);
 assert.equal(at(state,other).ready,false);
 assert.equal(state.pending?.kind,'effect-recover-ap');
 state=dispatchUniversalAction(packs,state,legal(state).find(action=>action.type==='chooseApRecovery'&&action.uid===null));
 assert.equal(at(state,first.uid).ready,true);
 assert.equal(at(state,other).ready,false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-043 final trigger opens only as the last life and can be used or skipped',()=>{
 const s=fresh(fill(['KMR-2-043','KMR-1-010']));
 const attacker=put(s,0,'KMR-1-010','front',0,true);
 const trigger=take(s,1,'KMR-2-043');
 const spare=s.players[1].life.splice(0);
 s.players[1].deck.push(...spare);
 s.players[1].life.push(trigger);
 const topCard=s.players[1].deck[0];
 ready(s);
 let state=act(s,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(state.pending?.trigger,'final');
 const skipped=dispatchUniversalAction(packs,state,{type:'chooseTrigger',mode:'skip'});
 assert.equal(skipped.players[1].outside.some(card=>card.uid===trigger.uid),true);
 assert.equal(skipped.players[1].life.some(card=>card.uid===topCard.uid),false);
 assertUniversalMatch(packs,skipped);
 const used=dispatchUniversalAction(packs,state,{type:'chooseTrigger',mode:'final'});
 assert.equal(used.players[1].life[0]?.uid,topCard.uid);
 assert.equal(used.players[1].outside.some(card=>card.uid===trigger.uid),true);
 assertUniversalMatch(packs,used);
});

test('KMR-2-044 retires 3000, or 5000 while a Fourze is on the field',()=>{
 const counts=fill(['KMR-2-044','KMR-2-046','KMR-2-049','KMR-2-019','KMR-2-029','KMR-2-025','KMR-2-040']);
 function cast(fourze){
  const s=fresh(counts);
  payBlue(s,4);
  if(fourze)put(s,0,'KMR-2-029','front',0,true);
  const low=put(s,1,'KMR-2-046','front',0,true);
  const mid=put(s,1,'KMR-2-049','front',1,true);
  const high=put(s,1,'KMR-2-019','front',2,true);
  const event=handOf(s,0,'KMR-2-044');
  park(s,0);
  s.players[0].hand.push(event);
  ready(s);
  const state=play(s,event.uid);
  return {state,low,mid,high};
 }
 const plain=cast(false);
 assert.equal(plain.state.pending?.id,'KMR-2-044');
 assert.deepEqual(plain.state.pending.actions.map(action=>action.uid),[plain.low.uid]);
 let state=click(plain.state,action=>action.uid===plain.low.uid);
 assert.equal(state.players[1].outside.some(card=>card.uid===plain.low.uid),true);
 assert.equal(state.players[1].front.some(card=>card?.uid===plain.mid.uid),true);
 assertUniversalMatch(packs,state);
 const boosted=cast(true);
 assert.equal(boosted.state.pending.actions.some(action=>action.mode==='skip'),false);
 assert.deepEqual(boosted.state.pending.actions.map(action=>action.uid).sort(),
  [boosted.low.uid,boosted.mid.uid,boosted.high.uid].sort());
 state=click(boosted.state,action=>action.uid===boosted.high.uid);
 assert.equal(state.players[1].outside.some(card=>card.uid===boosted.high.uid),true);
 assertUniversalMatch(packs,state);
 const none=fresh(counts);
 payBlue(none,4);
 const wall=put(none,1,'KMR-2-019','front',0,true);
 const event=handOf(none,0,'KMR-2-044');
 park(none,0);
 none.players[0].hand.push(event);
 ready(none);
 state=play(none,event.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[1].front.some(card=>card?.uid===wall.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===event.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-045 returns another energy-1-or-less character, or itself when none exists',()=>{
 const counts=fill(['KMR-2-045','KMR-2-050','KMR-2-048','KMR-2-056','KMR-2-059']);
 const many=fresh(counts);
 payGreen(many,1,['KMR-2-045','KMR-2-048','KMR-2-050']);
 const low=put(many,0,'KMR-2-050','front',0,true);
 const other=put(many,0,'KMR-2-048','front',1,true);
 const accel=handOf(many,0,'KMR-2-045');
 park(many,0);
 many.players[0].hand.push(accel);
 ready(many);
 let state=play(many,accel.uid,action=>action.line==='front');
 assert.equal(state.pending?.kind,'effect-bounce-own');
 assert.equal(legal(state).some(action=>action.type==='chooseOwnBounce'&&action.uid===null),false);
 assert.equal(legal(state).some(action=>action.uid===low.uid),true);
 assert.equal(legal(state).some(action=>action.uid===other.uid),true);
 state=dispatchUniversalAction(packs,state,legal(state).find(action=>action.uid===low.uid));
 assert.equal(state.players[0].hand.some(card=>card.uid===low.uid),true);
 assert.equal(state.players[0].front.some(card=>card?.uid===accel.uid),true);
 assertUniversalMatch(packs,state);

 const alone=fresh(counts);
 payGreen(alone,1,['KMR-2-045','KMR-2-048','KMR-2-050']);
 put(alone,0,'KMR-2-056','front',0,true);
 const self=handOf(alone,0,'KMR-2-045');
 park(alone,0);
 alone.players[0].hand.push(self);
 ready(alone);
 state=play(alone,self.uid,action=>action.line==='front');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===self.uid),true);
 assert.equal(state.players[0].front.some(card=>card?.cardId==='KMR-2-045'),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-046 gains 1000 on its own turn and readies only when no other energy-4 card exists',()=>{
 const counts=fill(['KMR-2-046','KMR-2-049','KMR-2-045','KMR-2-059']);
 const quiet=fresh(counts);
 payGreen(quiet,4,['KMR-2-048','KMR-2-050']);
 const rider=handOf(quiet,0,'KMR-2-046');
 park(quiet,0);
 quiet.players[0].hand.push(rider);
 ready(quiet);
 let state=play(quiet,rider.uid,action=>action.line==='front');
 const entered=state.players[0].front.find(card=>card?.uid===rider.uid);
 assert.equal(entered.ready,true);
 assert.equal(universalBp(pack,state,entered),4000);
 state.active=1;
 assert.equal(universalBp(pack,state,entered),3000);
 state.active=0;
 assertUniversalMatch(packs,state);

 const busy=fresh(counts);
 payGreen(busy,4,['KMR-2-048','KMR-2-050']);
 put(busy,0,'KMR-2-049','front',0,true);
 const rested=handOf(busy,0,'KMR-2-046');
 park(busy,0);
 busy.players[0].hand.push(rested);
 ready(busy);
 state=play(busy,rested.uid,action=>action.line==='front');
 assert.equal(state.players[0].front.find(card=>card?.uid===rested.uid).ready,false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-047 rests for one green energy and leaves at the end of the main phase, once',()=>{
 const s=fresh(fill(['KMR-2-047']));
 const skull=handOf(s,0,'KMR-2-047');
 park(s,0);
 s.players[0].hand.push(skull);
 ready(s);
 let state=play(s,skull.uid,action=>action.line==='energy');
 assert.equal(at(state,skull.uid).ready,false);
 assert.equal(legal(state).some(action=>action.type==='activate'&&action.uid===skull.uid),false);
 assertUniversalMatch(packs,state);
 state=fresh(fill(['KMR-2-047']));
 const readySkull=put(state,0,'KMR-2-047','energy',0,true);
 ready(state);
 assert.equal(universalCardEnergy(pack,state,0,readySkull),1);
 state=act(state,action=>action.type==='activate'&&action.uid===readySkull.uid);
 let live=at(state,readySkull.uid);
 assert.equal(live.ready,false);
 assert.equal(universalCardEnergy(pack,state,0,live),2);
 live.ready=true;
 assert.equal(legal(state).some(action=>action.type==='activate'&&action.uid===readySkull.uid),false);
 state=act(state,action=>action.type==='next');
 assert.equal(state.phase,'attack');
 assert.equal(state.players[0].outside.some(card=>card.uid===readySkull.uid),true);
 assert.equal(state.players[0].energy.some(card=>card?.uid===readySkull.uid),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-048 looks at five cards, orders the rest, then discards the added Memory Change',()=>{
 const counts=fill(['KMR-2-048','KMR-2-059','KMR-2-050','KMR-2-052','KMR-2-053','KMR-2-045'],
  {'KMR-2-059':2});
 const s=fresh(counts);
 const rider=handOf(s,0,'KMR-2-048');
 top(s,0,['KMR-2-059','KMR-2-050','KMR-2-052','KMR-2-053','KMR-2-045']);
 park(s,0);
 s.players[0].hand.push(rider);
 ready(s);
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.pending.actions.some(action=>action.key==='pay'),false);
 assert.equal(state.pending.actions.some(action=>action.key==='look'),true);
 state=click(state,action=>action.key==='look');
 const shown=controllerDeckWindowCards(state,packs,state.pending.actions);
 assert.equal(shown.length,5);
 assert.equal(shown.filter(card=>card.caption==='點選此牌').map(card=>card.cardId).join(),'KMR-2-059');
 assert.equal(shown.filter(card=>card.caption==='目前不能選').length,4);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 const memory=shown[0].uid;
 const rest=shown.slice(1).map(card=>card.uid);
 state=click(state,action=>action.uid===memory);
 assert.equal(state.pending.step,'lookOrder');
 assert.equal(state.publicReveals.some(entry=>entry.uid===memory),true);
 assert.equal(rest.every(uid=>state.publicReveals.some(entry=>entry.uid===uid)),false);
 state=order(state,rest);
 assert.equal(state.pending.step,'discard');
 assert.deepEqual(state.players[0].deck.slice(-4).map(card=>card.uid),rest);
 state=click(state,action=>action.uid===memory);
 assert.equal(state.players[0].outside.some(card=>card.uid===memory),true);
 assert.deepEqual(state.players[0].deck.slice(-4).map(card=>card.uid),rest);
 assertUniversalMatch(packs,state);
});

test('KMR-2-048 pays after Memory Change, and only its own blocked attack readies it once',()=>{
 const counts=fill(['KMR-2-048','KMR-2-059','KMR-2-050','KMR-2-053','KMR-2-004','KMR-1-010','KMR-2-045'],
  {'KMR-1-010':2});
 function entered(ap){
  const s=fresh(counts);
  const quiet=take(s,1,'KMR-2-045');
  const buried=s.players[1].life[0];
  s.players[1].life[0]=quiet;
  s.players[1].deck.push(buried);
  const memory=put(s,0,'KMR-2-059','energy',0,true);
  const retired=put(s,0,'KMR-2-050','front',0,true);
  const walls=[put(s,1,'KMR-1-010','front',0,true),put(s,1,'KMR-1-010','front',1,true)];
  top(s,0,['KMR-2-004']);
  const rider=handOf(s,0,'KMR-2-048');
  park(s,0);
  s.players[0].hand.push(rider);
  ready(s);
  if(!ap)for(const card of s.players[0].apCards)card.ready=false;
  let state=act(s,action=>action.type==='activate'&&action.uid===memory.uid);
  state=click(state,action=>action.uid===retired.uid);
  assert.equal(state.pending.step,'deployPick');
  assert.equal(state.pending.actions.some(action=>action.uid===rider.uid),true);
  assert.equal(state.pending.actions.some(action=>action.mode==='done'),true);
  const readyAp=state.players[0].apCards.filter(card=>card.ready).length;
  state=click(state,action=>action.uid===rider.uid);
  assert.equal(state.pending.actions.some(action=>action.mode==='skip'),false);
  state=click(state,action=>action.mode==='enter'&&action.line==='front');
  const live=state.players[0].front.find(card=>card?.uid===rider.uid);
  assert.equal(live.ready,true);
  assert.equal(live.kmr2EnteredBy?.id,'KMR-2-059');
  assert.equal(state.pending?.id,'KMR-2-048');
  assert.equal(state.pending.actions.some(action=>action.key==='pay'),ap);
  return {state,live,walls,readyAp};
 }
 const unpaid=entered(false);
 assert.equal(unpaid.state.pending.actions.some(action=>action.key==='look'),true);
 let state=click(unpaid.state,action=>action.mode==='done');
 assert.equal(unpaid.live.kmr2BlockActive,undefined);
 assertUniversalMatch(packs,state);

 const paid=entered(true);
 state=click(paid.state,action=>action.key==='pay');
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,paid.readyAp-1);
 assert.equal(at(state,paid.live.uid).kmr2BlockActive?.turn,state.turn);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:paid.live.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:paid.walls[0].uid});
 assert.equal(state.pending,null);
 assert.equal(at(state,paid.live.uid).ready,true);
 assert.equal(state.players[1].outside.filter(card=>card.uid===paid.walls[0].uid).length,1);
 assert.equal(state.players[0].front.filter(card=>card?.uid===paid.live.uid).length,1);
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:paid.live.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:paid.walls[1].uid});
 assert.equal(at(state,paid.live.uid).ready,false);
 assert.equal(state.players[1].outside.filter(card=>card.uid===paid.walls[1].uid).length,1);
 assert.equal(state.pending?.kind==='block',false);
 assertUniversalMatch(packs,state);

 const other=entered(true);
 state=click(other.state,action=>action.key==='pay');
 const bystander=put(state,0,'KMR-2-053','front',1,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:other.live.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(at(state,other.live.uid).ready,false);
 assert.equal(state.pending?.id==='KMR-2-048',false);
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:bystander.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:other.walls[0].uid});
 assert.equal(at(state,other.live.uid).ready,false);
 assert.equal(state.players[1].outside.filter(card=>card.uid===other.walls[0].uid).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-048 color trigger plays a legal green character and still starts its on-play',()=>{
 const s=fresh(fill(['KMR-2-048','KMR-2-052','KMR-2-055','KMR-1-010']));
 const attacker=put(s,0,'KMR-1-010','front',0,true);
 const legalTarget=handOf(s,1,'KMR-2-052');
 const illegal=handOf(s,1,'KMR-2-055');
 park(s,1);
 s.players[1].hand.push(legalTarget,illegal);
 const trigger=take(s,1,'KMR-2-048');
 const buried=s.players[1].life[0];
 s.players[1].life[0]=trigger;
 s.players[1].deck.push(buried);
 ready(s);
 let state=act(s,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(state.pending?.trigger,'color');
 const choices=legal(state).filter(action=>action.mode==='color');
 assert.equal(choices.some(action=>action.uid===legalTarget.uid),true);
 assert.equal(choices.some(action=>action.uid===illegal.uid),false);
 state=dispatchUniversalAction(packs,state,choices.find(action=>action.uid===legalTarget.uid&&action.line==='front'));
 const entered=state.players[1].front.find(card=>card?.uid===legalTarget.uid);
 assert.equal(entered.ready,true);
 assert.equal(state.pending?.id,'KMR-2-052');
 state=click(state,action=>action.mode==='skip');
 assert.equal(universalBp(pack,state,entered),1500);
 assertUniversalMatch(packs,state);
});

test('KMR-2-049 moves and silences only while raided and four different W energies are present',()=>{
 const counts=fill(['KMR-2-049','KMR-2-048','KMR-2-050','KMR-2-051','KMR-2-052','KMR-2-056','KMR-2-045','KMR-2-059',
  'KMR-2-046','KMR-2-047','KMR-2-053'],{'KMR-2-049':2});
 function board(third){
  const s=fresh(counts);
  payGreen(s,4,['KMR-2-048','KMR-2-050']);
  const base=put(s,0,'KMR-2-048','front',0,true);
  put(s,0,'KMR-2-050','front',1,true);
  put(s,0,third,'front',2,true);
  put(s,0,'KMR-2-052','energy',2,true);
  const rider=handOf(s,0,'KMR-2-049');
  park(s,0);
  s.players[0].hand.push(rider);
  const victim=put(s,1,'KMR-2-051','front',0,true);
  ready(s);
  return {s,base,rider,victim};
 }
 const short=board('KMR-2-051');
 let state=raidOnto(short.s,short.rider.uid,short.base.uid);
 assert.equal(state.pending,null);
 assert.equal(universalImpact(pack,state,state.players[0].front.find(card=>card?.cardId==='KMR-2-049')),1);
 assert.equal(state.players[1].front.some(card=>card?.uid===short.victim.uid),true);
 assertUniversalMatch(packs,state);

 const played=fresh(counts);
 payGreen(played,4,['KMR-2-048','KMR-2-050']);
 put(played,0,'KMR-2-050','front',0,true);
 put(played,0,'KMR-2-056','front',1,true);
 put(played,0,'KMR-2-052','energy',2,true);
 const ordinary=handOf(played,0,'KMR-2-049');
 park(played,0);
 played.players[0].hand.push(ordinary);
 put(played,1,'KMR-2-051','front',0,true);
 ready(played);
 state=play(played,ordinary.uid,action=>action.line==='front');
 const plain=state.players[0].front.find(card=>card?.uid===ordinary.uid);
 assert.equal(state.pending,null);
 assert.equal(universalImpact(pack,state,plain),0);
 assertUniversalMatch(packs,state);

 const full=board('KMR-2-056');
 const occupied=[
  put(full.s,1,'KMR-2-045','energy',0,true),put(full.s,1,'KMR-2-046','energy',1,true),
  put(full.s,1,'KMR-2-047','energy',2,true),put(full.s,1,'KMR-2-053','energy',3,true)
 ];
 state=raidOnto(full.s,full.rider.uid,full.base.uid);
 const extreme=state.players[0].front.find(card=>card?.cardId==='KMR-2-049');
 assert.equal(universalImpact(pack,state,extreme),1);
 assert.equal(universalBp(pack,state,full.victim),1000);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),true);
 const declined=click(state,action=>action.mode==='skip');
 assert.equal(declined.players[1].front.some(card=>card?.uid===full.victim.uid),true);
 assert.equal(universalBp(pack,declined,at(declined,full.victim.uid)),1000);
 at(state,full.victim.uid).buffs=[{bp:1000,untilTurn:state.turn}];
 assert.equal(universalBp(pack,state,at(state,full.victim.uid)),2000);
 state=click(state,action=>action.uid===full.victim.uid);
 assert.equal(state.pending?.step,'toEnergyReplace');
 assert.equal(state.pending.player,1);
 assert.equal(state.pending.actions.length,4);
 const removed=occupied[1];
 state=click(state,action=>action.uid===removed.uid);
 assert.equal(state.players[1].removed.some(card=>card.uid===removed.uid),true);
 assert.equal(state.players[1].energy.some(card=>card?.uid===full.victim.uid),true);
 assert.equal(universalBp(pack,state,at(state,full.victim.uid)),3500);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const open=board('KMR-2-056');
 open.s.players[1].deck.push(open.s.players[1].front[0]);
 open.s.players[1].front[0]=null;
 const under=take(open.s,1,'KMR-2-048');
 const raided=take(open.s,1,'KMR-2-049');
 raided.stack=[under];
 raided.ready=true;
 raided.fieldEntryStamp=open.s.nextFieldEntryStamp++;
 open.s.players[1].front[0]=raided;
 state=raidOnto(open.s,open.rider.uid,open.base.uid);
 assert.equal(universalImpact(pack,state,at(state,raided.uid)),1);
 state=click(state,action=>action.uid===raided.uid);
 const moved=at(state,raided.uid);
 assert.equal(state.players[1].energy.some(card=>card?.uid===raided.uid),true);
 assert.equal(moved.stack?.[0]?.uid,under.uid);
 assert.equal(universalImpact(pack,state,moved),0);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-052 grants 2000, and can grant nothing',()=>{
 const counts=fill(['KMR-2-052','KMR-2-050','KMR-2-055','KMR-2-045']);
 const s=fresh(counts);
 payGreen(s,1,['KMR-2-048','KMR-2-050','KMR-2-059']);
 const target=put(s,0,'KMR-2-050','front',0,true);
 const excluded=put(s,0,'KMR-2-055','energy',1,true);
 const rider=handOf(s,0,'KMR-2-052');
 park(s,0);
 s.players[0].hand.push(rider);
 ready(s);
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.pending?.id,'KMR-2-052');
 assert.equal(state.pending.actions.some(action=>action.uid===target.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===rider.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===excluded.uid),false);
 const skipped=click(state,action=>action.mode==='skip');
 assert.equal(universalBp(pack,skipped,at(skipped,target.uid)),2000);
 assertUniversalMatch(packs,skipped);
 state=click(state,action=>action.uid===target.uid);
 assert.equal(universalBp(pack,state,at(state,target.uid)),4000);
 assert.equal(universalBp(pack,state,state.players[0].front.find(card=>card?.uid===rider.uid)),1500);
 assertUniversalMatch(packs,state);
});

test('KMR-2-053 gains 1000 only on its own turn',()=>{
 const s=fresh(fill(['KMR-2-053']));
 const rider=put(s,0,'KMR-2-053','front',0,true);
 ready(s);
 assert.equal(universalBp(pack,s,rider),3000);
 s.active=1;
 assert.equal(universalBp(pack,s,rider),2000);
 s.active=0;
 assertUniversalMatch(packs,s);
});

test('KMR-2-051 loses 1500 only on the opponent turn',()=>{
 const s=fresh(fill(['KMR-2-051']));
 const rider=put(s,0,'KMR-2-051','front',0,true);
 ready(s);
 assert.equal(universalBp(pack,s,rider),2500);
 s.active=1;
 assert.equal(universalBp(pack,s,rider),1000);
 s.active=0;
 assertUniversalMatch(packs,s);
});

test('KMR-2-054 active life trigger readies a character and adds 3000',()=>{
 const opened=revealLife('KMR-2-054','KMR-1-010',['KMR-2-050']);
 const mine=put(opened.state,1,'KMR-2-050','front',0,false);
 assert.equal(opened.state.pending?.trigger,'active');
 const skipped=dispatchUniversalAction(packs,opened.state,{type:'chooseTrigger',mode:'skip'});
 assert.equal(skipped.players[1].outside.some(card=>card.uid===opened.trigger.uid),true);
 assert.equal(at(skipped,mine.uid).ready,false);
 assertUniversalMatch(packs,skipped);
 const used=dispatchUniversalAction(packs,opened.state,{type:'chooseTrigger',mode:'active',uid:mine.uid});
 assert.equal(at(used,mine.uid).ready,true);
 assert.equal(universalBp(pack,used,at(used,mine.uid)),5000);
 assert.equal(used.players[1].outside.some(card=>card.uid===opened.trigger.uid),true);
 assertUniversalMatch(packs,used);
});

test('KMR-2-055 returns its raid source, discards, then readies once from an attack',()=>{
 const counts=fill(['KMR-2-055','KMR-2-048','KMR-2-050','KMR-2-045','KMR-2-059','KMR-2-004','KMR-1-010']);
 const s=fresh(counts);
 payGreen(s,4,['KMR-2-048','KMR-2-050']);
 const base=put(s,0,'KMR-2-048','front',0,true);
 const ally=put(s,0,'KMR-2-050','front',1,true);
 put(s,1,'KMR-1-010','front',0,true);
 const quiet=take(s,1,'KMR-2-045');
 s.players[1].deck.push(s.players[1].life[0]);
 s.players[1].life[0]=quiet;
 const fang=handOf(s,0,'KMR-2-055');
 const spare=handOf(s,0,'KMR-2-004');
 park(s,0);
 s.players[0].hand.push(fang,spare);
 ready(s);
 assert.equal(legal(s).some(action=>action.type==='play'&&action.uid===fang.uid),false);
 assert.equal(legal(s).some(action=>action.type==='raid'&&action.uid===fang.uid&&action.baseUid===ally.uid),false);
 let state=raidOnto(s,fang.uid,base.uid);
 assert.equal(state.pending?.step,'discard');
 assert.equal(state.players[0].hand.some(card=>card.uid===base.uid),true);
 state=click(state,action=>action.uid===spare.uid);
 assert.equal(state.players[0].hand.some(card=>card.uid===base.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===spare.uid),true);
 const rider=state.players[0].front.find(card=>card?.uid===fang.uid);
 assert.equal(rider.ready,true);
 assert.equal(rider.stack?.length||0,0);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:rider.uid});
 assert.equal(state.pending?.id,'KMR-2-055');
 assert.equal(state.pending.actions.some(action=>action.uid===ally.uid),true);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),true);
 const skipped=click(state,action=>action.mode==='skip');
 assert.equal(at(skipped,rider.uid).ready,false);
 assert.equal(universalBp(pack,skipped,at(skipped,rider.uid)),3500);
 assert.equal(at(skipped,ally.uid).ready,true);
 state=click(state,action=>action.uid===ally.uid);
 assert.equal(at(state,ally.uid).ready,false);
 assert.equal(at(state,rider.uid).ready,true);
 assert.equal(universalBp(pack,state,at(state,rider.uid)),4000);
 assert.equal(state.pending?.kind,'block');
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(at(state,rider.uid).ready,true);
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:rider.uid});
 assert.equal(state.pending?.id==='KMR-2-055',false);
 assert.equal(state.pending?.kind,'block');
 assertUniversalMatch(packs,state);
});

test('KMR-2-056 brings a rested W and lets that character on-play start',()=>{
 const counts=fill(['KMR-2-056','KMR-2-048','KMR-2-045','KMR-2-057','KMR-2-059','KMR-2-004'],{'KMR-2-056':2});
 const brought=fresh(counts);
 payGreen(brought,4,['KMR-2-048','KMR-2-050']);
 const first=handOf(brought,0,'KMR-2-056');
 const second=handOf(brought,0,'KMR-2-056');
 const luna=handOf(brought,0,'KMR-2-048');
 const weak=handOf(brought,0,'KMR-2-004');
 const big=handOf(brought,0,'KMR-2-057');
 park(brought,0);
 brought.players[0].hand.push(first,second,luna,weak,big);
 ready(brought);
 let state=play(brought,first.uid,action=>action.line==='front');
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.pending.actions.some(action=>action.uid===luna.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===weak.uid),false);
 assert.equal(state.pending.actions.some(action=>action.uid===big.uid),false);
 state=click(state,action=>action.uid===luna.uid);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),false);
 assert.equal(state.pending.actions.every(action=>action.skip!==true),true);
 state=click(state,action=>action.mode==='enter'&&action.line==='front');
 const entered=state.players[0].front.find(card=>card?.uid===luna.uid);
 assert.equal(entered.ready,false);
 assert.equal(state.pending?.id,'KMR-2-048');
 state=click(state,action=>action.mode==='done');
 state=play(state,second.uid,action=>action.line==='energy');
 assert.equal(state.pending?.id==='KMR-2-056',false);
 assertUniversalMatch(packs,state);

 const energy=fresh(counts);
 payGreen(energy,4,['KMR-2-048','KMR-2-050']);
 const stored=handOf(energy,0,'KMR-2-056');
 const later=handOf(energy,0,'KMR-2-056');
 const waiting=handOf(energy,0,'KMR-2-048');
 park(energy,0);
 energy.players[0].hand.push(stored,later,waiting);
 ready(energy);
 state=play(energy,stored.uid,action=>action.line==='energy');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].energy.find(card=>card?.uid===stored.uid).ready,false);
 state=play(state,later.uid,action=>action.line==='front');
 assert.equal(state.pending?.id,'KMR-2-056');
 assert.equal(state.pending.step,'deployPick');
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-057 draws one, or may look at three after Memory Change',()=>{
 const counts=fill(['KMR-2-057','KMR-2-059','KMR-2-050','KMR-2-045','KMR-2-004','KMR-2-028','KMR-2-032']);
 const plain=fresh(counts);
 payGreen(plain,2,['KMR-2-048','KMR-2-050','KMR-2-059']);
 const rider=handOf(plain,0,'KMR-2-057');
 park(plain,0);
 plain.players[0].hand.push(rider);
 ready(plain);
 const deck=plain.players[0].deck.length;
 let state=play(plain,rider.uid,action=>action.line==='front');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,1);
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.players[0].front.find(card=>card?.uid===rider.uid).ready,false);
 assertUniversalMatch(packs,state);

 const changed=fresh(counts);
 const memory=put(changed,0,'KMR-2-059','energy',0,true);
 const retired=put(changed,0,'KMR-2-050','front',0,true);
 top(changed,0,['KMR-2-004','KMR-2-028','KMR-2-032','KMR-2-045']);
 const next=handOf(changed,0,'KMR-2-057');
 park(changed,0);
 changed.players[0].hand.push(next);
 ready(changed);
 state=act(changed,action=>action.type==='activate'&&action.uid===memory.uid);
 state=click(state,action=>action.uid===retired.uid);
 state=click(state,action=>action.uid===next.uid);
 state=click(state,action=>action.mode==='enter'&&action.line==='front');
 const live=state.players[0].front.find(card=>card?.uid===next.uid);
 assert.equal(live.ready,true);
 assert.equal(live.kmr2EnteredBy?.id,'KMR-2-059');
 assert.equal(state.pending?.id,'KMR-2-057');
 assert.deepEqual(state.pending.actions.map(action=>action.key).sort(),['draw','look']);
 const drawn=click(state,action=>action.key==='draw');
 assert.equal(drawn.pending,null);
 assert.equal(drawn.players[0].deck[0]?.cardId==='KMR-2-028',false);
 assertUniversalMatch(packs,drawn);
 state=click(state,action=>action.key==='look');
 const shown=controllerDeckWindowCards(state,packs,state.pending.actions);
 assert.deepEqual(shown.map(card=>card.cardId),['KMR-2-028','KMR-2-032','KMR-2-045']);
 assert.equal(shown.every(card=>card.caption==='點選此牌'),true);
 const taken=shown[1];
 state=click(state,action=>action.uid===taken.uid);
 state=order(state,[shown[2].uid,shown[0].uid]);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===taken.uid),true);
 assert.equal(state.players[0].deck[0]?.uid,shown[2].uid);
 assert.equal(state.players[0].deck[1]?.uid,shown[0].uid);
 assert.equal(state.publicReveals.some(entry=>entry.uid===taken.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-058 stops a 4000-BP character from blocking the chosen W',()=>{
 const counts=fill(['KMR-2-058','KMR-2-050','KMR-2-049','KMR-1-010','KMR-2-045']);
 const s=fresh(counts);
 payGreen(s,2,['KMR-2-048','KMR-2-050','KMR-2-059']);
 const target=put(s,0,'KMR-2-050','front',0,true);
 const big=put(s,1,'KMR-2-049','front',0,true);
 const small=put(s,1,'KMR-1-010','front',1,true);
 const rider=handOf(s,0,'KMR-2-058');
 park(s,0);
 s.players[0].hand.push(rider);
 ready(s);
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.pending.actions.some(action=>action.uid===target.uid),true);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),true);
 state=click(state,action=>action.uid===target.uid);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:target.uid});
 assert.equal(state.pending?.kind,'block');
 const blocks=legal(state).filter(action=>action.type==='chooseBlock'&&action.uid);
 assert.equal(blocks.some(action=>action.uid===big.uid),false);
 assert.equal(blocks.some(action=>action.uid===small.uid),true);
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:small.uid});
 assert.equal(state.players[1].outside.filter(card=>card.uid===small.uid).length,1);
 assert.equal(state.players[0].front.some(card=>card?.uid===target.uid),true);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-059 enters active, retires one W, then plays a different active W whose on-play starts',()=>{
 const counts=fill(['KMR-2-059','KMR-2-050','KMR-2-054','KMR-2-004','KMR-1-010','KMR-2-052','KMR-2-045',
  'KMR-2-046','KMR-2-048','KMR-2-053','KMR-2-047']);
 const s=fresh(counts);
 put(s,0,'KMR-2-045','energy',0,true);
 put(s,0,'KMR-2-048','energy',1,true);
 const memory=handOf(s,0,'KMR-2-059');
 park(s,0);
 s.players[0].hand.push(memory);
 ready(s);
 let state=play(s,memory.uid,action=>action.line==='energy');
 assert.equal(state.players[0].energy.find(card=>card?.uid===memory.uid).ready,true);
 const retired=put(state,0,'KMR-2-050','front',0,true);
 put(state,0,'KMR-2-052','front',1,true);
 put(state,0,'KMR-2-053','front',2,true);
 put(state,0,'KMR-2-047','front',3,true);
 put(state,0,'KMR-2-046','energy',3,true);
 const heat=handOf(state,0,'KMR-2-054');
 top(state,0,['KMR-2-004']);
 park(state,0);
 state.players[0].hand.push(heat);
 const wall=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='activate'&&action.uid===memory.uid);
 assert.equal(state.players[0].energy.find(card=>card?.uid===memory.uid).ready,false);
 assert.equal(state.pending.actions.some(action=>action.uid===retired.uid),true);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),false);
 state=click(state,action=>action.uid===retired.uid);
 assert.equal(state.players[0].outside.some(card=>card.uid===retired.uid),true);
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.pending.actions.filter(action=>action.mode==='deploy').map(action=>action.uid).join(),heat.uid);
 state=click(state,action=>action.uid===heat.uid);
 const enters=state.pending.actions.filter(action=>action.mode==='enter');
 assert.equal(enters.some(action=>action.line==='front'&&!action.replaceUid),true);
 assert.equal(enters.some(action=>action.line==='energy'&&action.replaceUid),true);
 assert.equal(enters.some(action=>action.line==='energy'&&!action.replaceUid),false);
 state=click(state,action=>action.mode==='enter'&&action.line==='front'&&!action.replaceUid);
 const entered=state.players[0].front.find(card=>card?.uid===heat.uid);
 assert.equal(entered.ready,true);
 assert.equal(entered.kmr2EnteredBy?.id,'KMR-2-059');
 assert.equal(state.pending,null);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:entered.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:wall.uid});
 assert.equal(state.pending?.id,'KMR-2-054');
 assert.equal(state.pending.step,'mode');
 state=click(state,action=>action.key==='draw');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending?.id==='KMR-2-054',false);
 assert.equal(state.players[1].outside.filter(card=>card.uid===wall.uid).length,1);
 assert.equal(state.players[0].front.filter(card=>card?.uid===entered.uid).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-060 draws and rests a legal character without starting its on-play',()=>{
 const counts=fill(['KMR-2-060','KMR-2-048','KMR-2-052','KMR-2-057','KMR-2-004']);
 const s=fresh(counts);
 const event=handOf(s,0,'KMR-2-060');
 const luna=handOf(s,0,'KMR-2-048');
 const heat=handOf(s,0,'KMR-2-052');
 const big=handOf(s,0,'KMR-2-057');
 top(s,0,['KMR-2-004']);
 park(s,0);
 s.players[0].hand.push(event,luna,heat,big);
 ready(s);
 let state=play(s,event.uid);
 assert.equal(state.players[0].hand.some(card=>card.cardId==='KMR-2-004'),true);
 assert.equal(state.pending?.step,'deployPick');
 const offered=state.pending.actions.filter(action=>action.mode==='deploy').map(action=>action.uid).sort();
 assert.deepEqual(offered,[luna.uid,heat.uid].sort());
 assert.equal(state.pending.actions.some(action=>action.uid===big.uid),false);
 state=click(state,action=>action.uid===heat.uid);
 assert.equal(state.pending.actions.some(action=>action.mode==='enter'&&action.skipOnPlay===true),true);
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),true);
 state=click(state,action=>action.mode==='enter'&&action.line==='front');
 const entered=state.players[0].front.find(card=>card?.uid===heat.uid);
 assert.equal(entered.ready,false);
 assert.equal(state.pending,null);
 assert.equal(universalBp(pack,state,entered),1500);
 assertUniversalMatch(packs,state);
});

test('life triggers from KMR-2-041 through KMR-2-060 open the printed type and can be declined',()=>{
 for(const card of KMR2_CARDS){
  const n=Number(card.id.slice(6));
  if(n<41||n>60||card.trigger==='final')continue;
  const opened=revealLife(card.id);
  if(!card.trigger){
   assert.equal(opened.state.pending?.kind==='life-trigger',false,card.id);
   assert.equal(opened.state.players[1].outside.some(item=>item.uid===opened.trigger.uid),true,card.id);
   assertUniversalMatch(packs,opened.state);
   continue;
  }
  assert.equal(opened.state.pending?.trigger,card.trigger,card.id);
  const skipped=dispatchUniversalAction(packs,opened.state,{type:'chooseTrigger',mode:'skip'});
  assert.equal(skipped.players[1].outside.some(item=>item.uid===opened.trigger.uid),true,card.id);
  assertUniversalMatch(packs,skipped);
 }
 const draw=revealLife('KMR-2-051');
 const before=draw.state.players[1].hand.length;
 const drawn=dispatchUniversalAction(packs,draw.state,{type:'chooseTrigger',mode:'draw'});
 assert.equal(drawn.players[1].hand.length,before+1);
 assertUniversalMatch(packs,drawn);
 const got=revealLife('KMR-2-041');
 const added=dispatchUniversalAction(packs,got.state,{type:'chooseTrigger',mode:'get'});
 assert.equal(added.players[1].hand.some(card=>card.uid===got.trigger.uid),true);
 assertUniversalMatch(packs,added);
 const raid=revealLife('KMR-2-049');
 assert.equal(legal(raid.state).some(action=>action.mode==='get'),true);
 assert.equal(legal(raid.state).some(action=>action.mode==='raid'),false);
 const taken=dispatchUniversalAction(packs,raid.state,{type:'chooseTrigger',mode:'get'});
 assert.equal(taken.players[1].hand.some(card=>card.uid===raid.trigger.uid),true);
 assertUniversalMatch(packs,taken);
 const special=revealLife('KMR-2-044');
 const removed=dispatchUniversalAction(packs,special.state,{type:'chooseTrigger',mode:'special',uid:special.attacker.uid});
 assert.equal(removed.players[0].outside.some(card=>card.uid===special.attacker.uid),true);
 assert.equal(removed.players[1].outside.some(card=>card.uid===special.trigger.uid),true);
 assertUniversalMatch(packs,removed);
});
