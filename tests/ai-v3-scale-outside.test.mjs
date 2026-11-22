import test from 'node:test';
import assert from 'node:assert/strict';
import {createBleachV2Pack} from '../dist/universal-v2/bleach-pack.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {chooseHybridStartHardAction} from '../dist/universal-v2/ai-v3/hybrid-main.mjs';
import {lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';
import {normalizeFactors} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {buildAiV3Request,handleAiV3Request} from '../dist/universal-v2/ai-v3/worker-entry.mjs';
import {
 newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch,universalBp
} from '../dist/universal-v2/engine.mjs';

const pack=createBleachV2Pack();
const packs=[pack,pack];
const rows=summarizeDesignatedDecks(id=>!!pack.cards[id]);
const purple=designatedPlayableCounts(rows.find(row=>row.key==='renruki'));
const sword=designatedPlayableCounts(rows.find(row=>row.key==='white-sword'));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const on={scaleOutside:true};

function take(state,player,id,skip){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=state.players[player][zone];
  const index=pile.findIndex(card=>card?.cardId===id&&card.uid!==skip);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw new Error('missing '+id);
}
function sit(state,card,ready=true){
 card.ready=ready;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 card.entryTurn=state.turn-1;
 card.buffs=card.buffs||[];
 return card;
}
function place(state,player,id,line,slot,ready=true){
 const card=sit(state,take(state,player,id),ready);
 state.players[player][line][slot]=card;
 return card;
}
function setBp(state,card,bp){
 const delta=bp-universalBp(packs,state,card);
 card.buffs=delta?[{bp:delta,untilTurn:state.turn}]:[];
}
function life(state,player,count){
 const person=state.players[player];
 const quiet=[];
 for(const zone of ['deck','hand','life','outside']){
  const pile=person[zone];
  for(let index=pile.length-1;index>=0&&quiet.length<count;index--){
   if(!pack.cards[pile[index].cardId]?.trigger)quiet.push(pile.splice(index,1)[0]);
  }
 }
 person.deck.push(...person.life);
 person.life=quiet;
}
function outside(state,player,count,avoid){
 const person=state.players[player];
 while(person.outside.length<count){
  const index=person.deck.findIndex(card=>!avoid.has(card.cardId));
  if(index<0)break;
  person.outside.push(person.deck.splice(index,1)[0]);
 }
}
function phase(state){
 for(let i=0;i<8&&state.phase!=='main';i++){
  const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
  state=dispatchUniversalAction(packs,state,next);
 }
 return state;
}
function bpOf(state,uid){
 for(const player of state.players){
  for(const line of ['front','energy']){
   const card=(player[line]||[]).find(item=>item?.uid===uid);
   if(card)return universalBp(packs,state,card);
  }
 }
 return null;
}
// Raid UA08BT/BLC-1-041 onto a front base. The mill runs before the removal
// window, so the available outside count is the pile plus those two cards.
function openScale(spec){
 const foeDeck=spec.sword?sword:purple;
 let state=newUniversalMatch(packs,{decks:[purple,foeDeck],seed:spec.seed??41,first:0});
 state=phase(state);
 for(const line of ['front','energy']){
  state.players[0][line]=[null,null,null,null];
  state.players[1][line]=[null,null,null,null];
 }
 const base=place(state,0,'BLC-1-039','front',0,true);
 place(state,0,'BLC-4-082','energy',0);
 place(state,0,'BLC-4-082','energy',1);
 place(state,0,'BLC-1-039','energy',2);
 place(state,0,'BLC-1-039','energy',3);
 for(let i=0;i<2;i++){
  state.players[0].apCards[i].inPlay=true;
  state.players[0].apCards[i].ready=true;
 }
 const ichigo=take(state,0,'BLC-1-041');
 state.players[0].hand.push(ichigo);
 life(state,0,spec.life??1);
 life(state,1,spec.foeLife??2);
 const bodies=(spec.bodies||[]).map((body,index)=>{
  const card=place(state,1,body.id,'front',index,body.ready!==false);
  if(body.under){
   const under=state.players[1].deck.pop();
   under.faceDown=false;
   card.stack=[under];
  }
  if(body.bp)setBp(state,card,body.bp);
  if(body.impact)card.impactGranted={turn:state.turn,stamp:card.fieldEntryStamp,amount:body.impact};
  return card;
 });
 for(const id of spec.fuel||[])state.players[0].outside.push(take(state,0,id,ichigo.uid));
 if(spec.crown){
  const topped=spec.crown.map(id=>take(state,0,id,ichigo.uid));
  state.players[0].deck.unshift(...topped);
 }
 outside(state,0,spec.outside??0,new Set(['BLC-1-041']));
 const raid=legalUniversalActions(packs,state).find(action=>action.type==='raid'&&
  action.uid===ichigo.uid&&action.baseUid===base.uid);
 if(!raid)throw new Error('cannot raid BLC-1-041');
 state=dispatchUniversalAction(packs,state,raid,{actor:0});
 assert.equal(state.pending?.kind,'effect-remove-outside');
 assert.equal(state.pending.any,true);
 assert.equal(state.pending.scalePer,500);
 assert.equal(state.players[0].front[0].ready,true);
 return {state,bodies,ichigo};
}
function pay(state,mode,uid){
 const action=legalUniversalActions(packs,state).find(item=>item.type==='chooseRemoveOutside'&&
  item.mode===mode&&(uid===undefined||item.uid===uid));
 if(!action)throw new Error('missing '+mode);
 return dispatchUniversalAction(packs,state,action,{actor:state.pending.player});
}
function walk(state,factors){
 const steps=[];
 for(let i=0;i<24&&state.pending;i++){
  const legal=legalUniversalActions(packs,state);
  const started=performance.now();
  const action=chooseHybridStartHardAction(packs,state,{
   actor:state.pending.player,nodes:48,ms:40,seed:1,...(factors?{factors}:{})
  });
  const ms=performance.now()-started;
  assert.equal(legal.some(item=>same(item,action)),true);
  if(factors?.scaleOutside===true)assert.ok(ms<40,'decision took '+ms.toFixed(1)+'ms');
  const trace=lastAiV3Trace();
  steps.push({
   kind:state.pending.kind,mode:action.mode||null,uid:action.uid??null,
   reason:trace?.reason,ms,nodes:trace?.nodesUsed??0,
   scale:trace?.factors?.scaleOutside===true
  });
  state=dispatchUniversalAction(packs,state,action,{actor:state.pending.player});
  assertUniversalMatch(packs,state);
 }
 assert.equal(state.pending,null);
 return {state,steps};
}
function removedCount(steps){
 return steps.filter(step=>step.mode==='pick').length;
}

test('ten removals retire a 5000 by the zero-BP rule, and six cannot',()=>{
 const ten=openScale({outside:8,bodies:[{id:'BLC-4-050',bp:5000,impact:1}]});
 assert.equal(ten.state.pending.choices.length,10);
 let state=ten.state;
 const foe=ten.bodies[0].uid;
 for(let i=0;i<10;i++){
  const uid=state.pending.choices.find(id=>!(state.pending.selected||[]).includes(id));
  state=pay(state,'pick',uid);
 }
 state=pay(state,'done');
 assert.equal(state.pending.kind,'effect-target');
 assert.equal(state.pending.bp,5000);
 state=dispatchUniversalAction(packs,state,
  legalUniversalActions(packs,state).find(action=>action.type==='chooseTarget'&&action.uid===foe),
  {actor:0});
 assertUniversalMatch(packs,state);
 // Q94: 0 BP leaves the field. This engine's 退場 destination is outside.
 assert.equal(bpOf(state,foe),null);
 assert.equal(state.players[1].front.some(card=>card?.uid===foe),false);
 assert.equal(state.players[1].outside.some(card=>card.uid===foe),true);
 assert.equal(state.pending,null);

 const six=openScale({outside:4,bodies:[{id:'BLC-4-050',bp:5000,impact:1}]});
 assert.equal(six.state.pending.choices.length,6);
 state=six.state;
 const staying=six.bodies[0].uid;
 while(state.pending?.kind==='effect-remove-outside'&&(state.pending.choices||[]).some(id=>!(state.pending.selected||[]).includes(id))){
  const uid=state.pending.choices.find(id=>!(state.pending.selected||[]).includes(id));
  state=pay(state,'pick',uid);
 }
 state=pay(state,'done');
 state=dispatchUniversalAction(packs,state,
  legalUniversalActions(packs,state).find(action=>action.type==='chooseTarget'&&action.uid===staying),
  {actor:0});
 assert.equal(bpOf(state,staying),2000);
 assert.equal(state.players[1].front.some(card=>card?.uid===staying),true);
});

test('a face-up raid box ignores the reduction, and a later entry is not replayed',()=>{
 const immune=openScale({
  sword:true,outside:8,seed:43,
  bodies:[{id:'BLC-2-067',bp:5000,impact:1,under:true}]
 });
 const ken=immune.bodies[0];
 assert.equal(universalBp(packs,immune.state,ken),5000);
 ken.buffs.push({bp:-5000,untilTurn:immune.state.turn});
 assert.equal(universalBp(packs,immune.state,ken),5000);
 ken.buffs.pop();
 let state=immune.state;
 for(let i=0;i<10;i++){
  const uid=state.pending.choices.find(id=>!(state.pending.selected||[]).includes(id));
  state=pay(state,'pick',uid);
 }
 state=pay(state,'done');
 state=dispatchUniversalAction(packs,state,
  legalUniversalActions(packs,state).find(action=>action.type==='chooseTarget'&&action.uid===ken.uid),
  {actor:0});
 assert.equal(bpOf(state,ken.uid),5000);
 assert.equal(state.players[1].front.some(card=>card?.uid===ken.uid),true);

 const later=openScale({outside:8,bodies:[{id:'BLC-4-050',bp:4000}]});
 state=later.state;
 state=pay(state,'skip');
 assert.equal(state.pending,null);
 const arrived=place(state,1,'BLC-4-050','front',1,true);
 setBp(state,arrived,5000);
 assert.equal(state.pending,null);
 assert.equal(universalBp(packs,state,arrived),5000);
});

test('scaleOutside stays off unless the caller asks, including a sealed worker',()=>{
 assert.equal(normalizeFactors({scaleOutside:true}).scaleOutside,true);
 assert.equal(normalizeFactors({scaleOutside:true}).publicBlock,undefined);
 assert.equal(normalizeFactors({scaleOutside:true}).settleLife,undefined);
 assert.equal(normalizeFactors({publicBlock:true}).scaleOutside,undefined);
 assert.equal(normalizeFactors({}).scaleOutside,undefined);
 const opened=openScale({outside:8,bodies:[{id:'BLC-4-050',bp:5000,impact:1}]});
 const request=buildAiV3Request(packs,opened.state,0,{
  requestId:7,stateVersion:1,seed:1,nodes:48,ms:40,policy:'hybrid-start-hard-v1'
 });
 const clean=handleAiV3Request({...request,now:()=>0});
 const dirty=handleAiV3Request({
  ...request,requestId:8,now:()=>0,factors:{scaleOutside:true,settleLife:true}
 });
 assert.equal(same(clean.action,dirty.action),true);
 assert.equal(lastAiV3Trace().factors.scaleOutside,undefined);
 const asked=chooseHybridStartHardAction(packs,opened.state,{
  actor:0,nodes:48,ms:40,seed:1,factors:on
 });
 assert.equal(lastAiV3Trace().reason,'scale-outside');
 assert.equal(lastAiV3Trace().factors.scaleOutside,true);
 assert.equal(asked.type,'chooseRemoveOutside');
 assert.equal(asked.mode,'pick');
});

test('the finished payment retires a lone 5000 and does not invent cards it lacks',()=>{
 const lone=openScale({outside:8,bodies:[{id:'BLC-4-050',bp:5000,impact:1}]});
 assert.equal(lone.state.pending.choices.length,10);
 const finished=walk(structuredClone(lone.state),on);
 assert.equal(removedCount(finished.steps),10);
 assert.equal(bpOf(finished.state,lone.bodies[0].uid),null);
 assert.equal(finished.steps.filter(step=>step.reason==='scale-outside').length>0,true);
 assert.equal(finished.steps.every(step=>step.nodes<=48),true);

 const short=openScale({outside:4,bodies:[{id:'BLC-4-050',bp:5000,impact:1}]});
 assert.equal(short.state.pending.choices.length,6);
 const shaved=walk(structuredClone(short.state),on);
 const left=bpOf(shaved.state,short.bodies[0].uid);
 assert.equal(removedCount(shaved.steps)<6||left>0,true);
 assert.ok(left>0&&left<4000,'5000 became '+left);
 assert.equal(shaved.state.players[1].front.some(card=>card?.uid===short.bodies[0].uid),true);

 const plain=walk(structuredClone(lone.state));
 assert.equal(plain.steps.some(step=>step.reason==='scale-outside'),false);
 assert.equal(plain.steps.every(step=>step.nodes<=48),true);
});

test('three ready attackers are not all answered by one payment, and a rested pair is',()=>{
 const crowded=openScale({
  outside:10,
  bodies:[
   {id:'BLC-4-050',bp:5000,impact:1},
   {id:'BLC-4-050',bp:4000},
   {id:'BLC-1-053',bp:2500}
  ]
 });
 assert.equal(crowded.state.pending.choices.length,12);
 const answered=walk(structuredClone(crowded.state),on);
 const big=bpOf(answered.state,crowded.bodies[0].uid);
 const mid=bpOf(answered.state,crowded.bodies[1].uid);
 const small=bpOf(answered.state,crowded.bodies[2].uid);
 assert.equal(removedCount(answered.steps)<12,true);
 assert.equal([big,mid,small].filter(bp=>bp===null).length,1);
 assert.equal(big,5000);

 const rested=openScale({
  outside:10,seed:44,
  bodies:[
   {id:'BLC-4-050',bp:5000,impact:1,ready:true},
   {id:'BLC-4-050',bp:4000,ready:false},
   {id:'BLC-1-053',bp:2500,ready:false}
  ]
 });
 const only=walk(structuredClone(rested.state),on);
 assert.equal(removedCount(only.steps),10);
 assert.equal(bpOf(only.state,rested.bodies[0].uid),null);
 assert.equal(bpOf(only.state,rested.bodies[1].uid),4000);
 assert.equal(bpOf(only.state,rested.bodies[2].uid),2500);
});

test('an immune 5000 is not paid for, and valuable outside cards are not emptied',()=>{
 const immune=openScale({
  sword:true,outside:8,seed:45,
  bodies:[{id:'BLC-2-067',bp:5000,impact:1,under:true}]
 });
 assert.equal(immune.state.pending.choices.length,10);
 const spared=walk(structuredClone(immune.state),on);
 assert.equal(removedCount(spared.steps),0);
 assert.equal(spared.steps[0].mode,'skip');
 assert.equal(bpOf(spared.state,immune.bodies[0].uid),5000);

 const hoard=openScale({
  sword:true,life:6,foeLife:7,seed:46,
  fuel:['BLC-1-041'],crown:['BLC-1-041','BLC-1-041'],
  bodies:[{id:'BLC-2-069',bp:1500}]
 });
 assert.equal(hoard.state.pending.choices.length,3);
 assert.equal(hoard.state.players[0].outside.every(card=>card.cardId==='BLC-1-041'),true);
 const kept=walk(structuredClone(hoard.state),on);
 assert.equal(removedCount(kept.steps),0);
 assert.equal(kept.steps[0].mode,'skip');
 assert.equal(bpOf(kept.state,hoard.bodies[0].uid),1500);
 assert.equal(kept.state.players[0].outside.length,3);

 const ordinary=openScale({
  outside:10,life:6,foeLife:7,seed:47,
  bodies:[{id:'BLC-4-050',bp:4000},{id:'BLC-1-053',bp:2500}]
 });
 assert.equal(ordinary.state.pending.choices.length,12);
 const trimmed=walk(structuredClone(ordinary.state),on);
 assert.equal(removedCount(trimmed.steps),8);
 assert.equal(trimmed.state.players[0].outside.length,4);
 assert.equal(bpOf(trimmed.state,ordinary.bodies[0].uid),null);
 assert.equal(bpOf(trimmed.state,ordinary.bodies[1].uid),2500);
});
