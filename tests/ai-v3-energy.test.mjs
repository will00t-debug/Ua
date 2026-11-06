import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalEnergy,universalEnergyByColor,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {rankLegal} from '../dist/universal-v2/ai-v3/beam.mjs';
import {moveDevelopment,replyOrder} from '../dist/universal-v2/ai-v3/strategy.mjs';
import {battleDecks} from '../dist/universal-v2/ai-v3/decks.mjs';

const OPTS={...MATCH_LIMITS,seed:1,ms:1e9,nodes:48,hardNodes:0};
function cheapDeck(pack,extra){
 const counts={...extra};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 const cards=Object.values(pack.cards).filter(card=>card&&!counts[card.id]&&Number.isInteger(card.energy)&&card.energy>=1&&card.energy<=2)
  .sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id));
 for(const card of cards){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=(counts[card.id]||0)+n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
function take(state,player,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  if(!list)continue;
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function place(state,player,card,line,slot){
 card.ready=true;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
}
function toMove(pack,counts){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:11,first:0,attackerChoosesLife:true});
 while(state.phase!=='move'&&state.status==='playing'){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 return {packs,state};
}
function ask(packs,state,strategy){
 const actor=state.pending?.player??state.active;
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{...OPTS,actor,...(strategy?{strategy}:{})});
 return {action,trace:lastAiV3Trace(),actor};
}
function climb(packs,state){
 let cursor=state;
 const actor=0;
 const started=cursor.players[actor].ownTurns;
 const played=[];
 for(let guard=0;guard<8&&cursor.status==='playing'&&cursor.players[actor].ownTurns===started;guard++){
  if(cursor.pending)break;
  const seat=cursor.active;
  if(seat!==actor)break;
  const legal=legalUniversalActions(packs,cursor);
  if(cursor.phase==='move'){
   const pass=legal.find(action=>action.type==='next');
   if(!pass)break;
   cursor=dispatchUniversalAction(packs,cursor,pass,{actor});
   continue;
  }
  if(cursor.phase!=='main')break;
  const plays=legal.filter(action=>action.type==='play'&&action.line==='energy');
  if(!plays.length)break;
  const cost=action=>{
   const card=cursor.players[actor].hand.find(item=>item?.uid===action.uid);
   return packs[0].cards[card?.cardId]?.energy||0;
  };
  plays.sort((a,b)=>cost(b)-cost(a));
  played.push(cost(plays[0]));
  cursor=dispatchUniversalAction(packs,cursor,plays[0],{actor});
 }
 return {energy:universalEnergy(packs,cursor,actor),colors:universalEnergyByColor(packs,cursor,actor),played,pending:cursor.pending?.kind||null};
}
const bleach=officialV2Pack('bleach');

test('energy: a low curve still moves when the color left covers it',()=>{
 const generator=Object.values(bleach.cards).find(card=>card.type==='character'&&card.energy===0&&card.gen>=1&&!card.frontForbidden);
 const pricey=Object.values(bleach.cards).find(card=>card.type==='character'&&card.color===generator.color&&card.energy>=4);
 const counts=cheapDeck(bleach,{[generator.id]:4,[pricey.id]:2});
 const {packs,state}=toMove(bleach,counts);
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(take(state,0,pricey.id));
 for(let slot=0;slot<3;slot++)place(state,0,take(state,0,generator.id),'energy',slot);
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 assert.equal(assertUniversalMatch(packs,state),true);
 const legal=legalUniversalActions(packs,state);
 const move=legal.find(action=>action.type==='move');
 const view=moveDevelopment(packs,state,0,move);
 assert.equal(view.strip,false);
 assert.equal(view.reason,'enough');
 assert.ok(view.after>=view.curve);
 assert.equal(rankLegal(packs,state,0,legal,null)[0].type,'move');
 assert.equal(rankLegal(packs,state,0,legal,'order')[0].type,'move');
 assert.equal(replyOrder(packs,state,legal)[0].type,'move');
 const {action}=ask(packs,state);
 assert.equal(action.type,'move');
 assert.equal(moveDevelopment(packs,state,0,action).reason,'enough');
});

test('energy: one life with an empty front is still worth the move',()=>{
 const generator=Object.values(bleach.cards).find(card=>card.type==='character'&&card.energy===0&&card.gen>=1&&card.bp>=1000&&!card.frontForbidden);
 const pricey=Object.values(bleach.cards).find(card=>card.type==='character'&&card.color===generator.color&&card.energy>=4);
 const quiet=Object.values(bleach.cards).find(card=>card.type==='character'&&!card.trigger);
 const counts=cheapDeck(bleach,{[generator.id]:4,[pricey.id]:2,[quiet.id]:2});
 const {packs,state}=toMove(bleach,counts);
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(take(state,0,pricey.id));
 place(state,0,take(state,0,generator.id),'energy',0);
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 const developing=structuredClone(state);
 const developMove=legalUniversalActions(packs,developing).find(action=>action.type==='move');
 const held=moveDevelopment(packs,developing,0,developMove);
 assert.equal(held.reason,'curve-hand');
 assert.equal(held.strip,true);
 assert.equal(ask(packs,developing).action.type,'next');
 while(state.players[1].life.length>1)state.players[1].deck.push(state.players[1].life.pop());
 const life=state.players[1].life[0];
 const replacement=take(state,1,quiet.id);
 state.players[1].deck.push(life);
 state.players[1].life[0]=replacement;
 assert.equal(assertUniversalMatch(packs,state),true);
 const legal=legalUniversalActions(packs,state);
 const move=legal.find(action=>action.type==='move');
 const view=moveDevelopment(packs,state,0,move);
 assert.equal(view.reason,'lethal');
 assert.equal(view.strip,false);
 assert.equal(view.after<view.before,true);
 const {action,trace}=ask(packs,state);
 assert.equal(action.type,'move');
 assert.equal(action.uid,move.uid);
 assert.equal(trace.energyKeep,null);
});

test('energy: recorded move-phase losses keep the color when the hand is above it',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../audit/ai-v3-official-8300-life-36.json',import.meta.url),'utf8'));
 const decks=battleDecks();
 const want=[{id:'reject-blue',step:13},{id:'white-sword',step:12},{id:'renruki',step:15}];
 for(const item of want){
  const deck=decks.find(row=>row.id===item.id);
  const game=report.titles[item.id].byMode.tree.games.find(row=>row.seed===8300&&row.first===0&&row.challengerSeat===0);
  const packs=[deck.pack,deck.pack];
  let state=newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first);
  for(const choice of game.opening||[]){
   const action=legalUniversalActions(packs,state).find(entry=>entry.type==='openingMulligan'&&entry.mode===choice.mode);
   state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
  }
  for(const row of game.actions){
   if(row.step===item.step)break;
   state=dispatchUniversalAction(packs,state,row.action,{actor:state.pending?.player??state.active});
  }
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  const move=legal.find(action=>action.type==='move');
  const before=universalEnergy(packs,state,actor);
  const moved=dispatchUniversalAction(packs,state,move,{actor});
  const view=moveDevelopment(packs,state,actor,move);
  assert.equal(state.phase,'move');
  assert.equal(before,1);
  assert.equal(universalEnergy(packs,moved,actor),0);
  assert.equal(view.reason,'curve-hand');
  assert.equal(view.strip,true);
  assert.equal(view.wantsColor,true);
  assert.equal(rankLegal(packs,state,actor,legal,null)[0].type,'next');
  assert.equal(rankLegal(packs,state,actor,legal,'order')[0].type,'next');
  assert.equal(replyOrder(packs,state,legal)[0].type,'next');
  const hard=chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:1});
  assert.equal(hard.type,'next');
  for(const strategy of [null,'score','order','reply']){
   const {action,trace}=ask(packs,state,strategy);
   assert.equal(action.type,'next',item.id+' '+(strategy||'tree'));
   assert.equal(trace.energyKeep.reason,'curve-hand');
   assert.equal(trace.energyKeep.after,0);
   assert.ok(trace.energyKeep.curve>trace.energyKeep.after);
  }
  const kept=dispatchUniversalAction(packs,state,legal.find(action=>action.type==='next'),{actor});
  const keepLine=climb(packs,kept);
  const moveLine=climb(packs,moved);
  assert.ok(keepLine.energy>moveLine.energy,item.id+' keep '+keepLine.energy+' move '+moveLine.energy);
  assert.ok(keepLine.played.some(cost=>cost>=1)||keepLine.energy>=2);
 }
});
