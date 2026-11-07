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
import {moveDevelopment,replyOrder,bindProbeBudget,cachedMoveDevelopment} from '../dist/universal-v2/ai-v3/strategy.mjs';
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
function prove(fn){
 return bindProbeBudget({pool:{n:64},deadline:Infinity,now:()=>0},fn);
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
function cardOf(id){return bleach.cards[id];}
function priceyOf(color){
 return Object.values(bleach.cards).find(card=>card.type==='character'&&card.color===color&&card.energy>=4);
}
function prepare(attackerId,blockerIds,lifeId='BLC-1-042'){
 const attacker=cardOf(attackerId);
 const pricey=priceyOf(attacker.color);
 const extra={[attackerId]:4,[pricey.id]:2,[lifeId]:2};
 for(const id of blockerIds)extra[id]=Math.max(extra[id]||0,2);
 const counts=cheapDeck(bleach,extra);
 const {packs,state}=toMove(bleach,counts);
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(take(state,0,pricey.id));
 place(state,0,take(state,0,attackerId),'energy',0);
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 blockerIds.forEach((id,slot)=>place(state,1,take(state,1,id),'front',slot));
 while(state.players[1].life.length>1)state.players[1].deck.push(state.players[1].life.pop());
 const revealed=state.players[1].life[0];
 if(revealed.cardId!==lifeId){
  const quiet=take(state,1,lifeId);
  state.players[1].deck.push(revealed);
  state.players[1].life[0]=quiet;
 }
 assert.equal(assertUniversalMatch(packs,state),true);
 const move=legalUniversalActions(packs,state).find(action=>action.type==='move'&&action.uid===state.players[0].energy[0].uid);
 return {packs,state,move,pricey};
}
function blockedAttack(packs,state,move){
 const script=[];
 let cursor=dispatchUniversalAction(packs,state,move,{actor:0});
 script.push({type:'move',phase:cursor.phase,pending:cursor.pending?.kind||null,life:cursor.players[1].life.length});
 for(let guard=0;guard<4&&cursor.status==='playing'&&!cursor.pending&&cursor.phase!=='attack';guard++){
  const pass=legalUniversalActions(packs,cursor).find(action=>action.type==='next');
  cursor=dispatchUniversalAction(packs,cursor,pass,{actor:0});
  script.push({type:'next',phase:cursor.phase,pending:cursor.pending?.kind||null,life:cursor.players[1].life.length});
 }
 const attack=legalUniversalActions(packs,cursor).find(action=>action.type==='attack'&&action.uid===move.uid&&!action.targetUid);
 if(!attack)return {script,attack:false,cursor};
 cursor=dispatchUniversalAction(packs,cursor,attack,{actor:0});
 script.push({type:'attack',phase:cursor.phase,pending:cursor.pending?.kind||null,life:cursor.players[1].life.length,status:cursor.status});
 if(cursor.pending?.kind!=='block')return {script,attack:true,cursor};
 const answers=legalUniversalActions(packs,cursor).filter(action=>action.type==='chooseBlock'&&action.uid);
 const results=answers.map(action=>{
  const followed=dispatchUniversalAction(packs,cursor,action,{actor:1});
  script.push({type:'chooseBlock',uid:action.uid,life:followed.players[1].life.length,status:followed.status,winner:followed.winner??null,pending:followed.pending?.kind||null});
  return followed;
 });
 return {script,attack:true,cursor,results};
}

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
 const view=prove(()=>moveDevelopment(packs,state,0,move));
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

test('energy: winning the battle against a smaller blocker is not lethal',()=>{
 const {packs,state,move}=prepare('BLC-1-045',['BLC-1-056']);
 assert.ok(cardOf('BLC-1-045').bp>cardOf('BLC-1-056').bp);
 assert.equal(cardOf('BLC-1-045').printedImpact||0,0);
 const view=prove(()=>moveDevelopment(packs,state,0,move));
 const fought=blockedAttack(packs,state,move);
 console.log('smaller block',view.lethal,view.benefit,view.reason,JSON.stringify(fought.script));
 assert.equal(view.lethal,'no');
 assert.notEqual(view.benefit,'lethal');
 assert.equal(fought.attack,true);
 assert.ok(fought.results.length>=1);
 for(const followed of fought.results){
  assert.equal(followed.players[1].life.length,1);
  assert.equal(followed.status,'playing');
 }
 const {action,trace}=ask(packs,state);
 assert.equal(trace.plan,'tree');
 assert.equal(trace.hardNodes,0);
 assert.ok(trace.nodesUsed<=48);
 console.log('smaller decision',action.type,view.benefit,view.lethal);
 if(action.type==='move'){
  assert.notEqual(view.benefit,'lethal');
  assert.equal(view.lethal,'no');
 }else assert.equal(action.type,'next');
});

test('energy: one weaker blocker among several does not prove lethal',()=>{
 const {packs,state,move}=prepare('BLC-1-045',['BLC-1-056','BLC-1-009']);
 const view=prove(()=>moveDevelopment(packs,state,0,move));
 const fought=blockedAttack(packs,state,move);
 console.log('several blockers',view.lethal,JSON.stringify(fought.script));
 assert.equal(view.lethal,'no');
 assert.notEqual(view.benefit,'lethal');
 assert.equal(fought.results.length,2);
 for(const followed of fought.results){
  assert.equal(followed.players[1].life.length,1);
  assert.equal(followed.status,'playing');
 }
});

test('energy: impact and impact-null follow the engine result',()=>{
 const through=prepare('BLC-1-009',['BLC-1-056']);
 const throughView=prove(()=>moveDevelopment(through.packs,through.state,0,through.move));
 const throughFight=blockedAttack(through.packs,through.state,through.move);
 console.log('impact through',throughView.lethal,JSON.stringify(throughFight.script));
 assert.equal(throughView.lethal,'lethal');
 assert.equal(throughView.benefit,'lethal');
 assert.ok(throughFight.results.every(followed=>followed.status==='finished'&&followed.winner===0&&followed.players[1].life.length===0));
 const {action,trace}=ask(through.packs,through.state);
 assert.equal(action.type,'move');
 assert.equal(trace.plan,'tree');
 assert.ok(trace.nodesUsed<=48);
 const stopped=prepare('BLC-1-009',['BLC-1-008']);
 const stoppedView=prove(()=>moveDevelopment(stopped.packs,stopped.state,0,stopped.move));
 const stoppedFight=blockedAttack(stopped.packs,stopped.state,stopped.move);
 console.log('impact null',stoppedView.lethal,stoppedView.benefit,JSON.stringify(stoppedFight.script));
 assert.equal(stoppedView.lethal,'no');
 assert.notEqual(stoppedView.benefit,'lethal');
 assert.ok(stoppedFight.results.every(followed=>followed.status==='playing'&&followed.players[1].life.length===1));
 const mixed=prepare('BLC-1-009',['BLC-1-056','BLC-1-008']);
 const mixedView=prove(()=>moveDevelopment(mixed.packs,mixed.state,0,mixed.move));
 const mixedFight=blockedAttack(mixed.packs,mixed.state,mixed.move);
 console.log('impact choice',mixedView.lethal,JSON.stringify(mixedFight.script));
 assert.equal(mixedView.lethal,'no');
 const saved=mixedFight.results.filter(followed=>followed.status==='playing'&&followed.players[1].life.length===1);
 assert.ok(saved.length>=1);
});

test('energy: an unproven lethal check does not spend past the shared budget',()=>{
 const {packs,state,move}=prepare('BLC-1-045',[]);
 const pool={n:2};
 const view=bindProbeBudget({pool,deadline:Infinity,now:()=>0},()=>moveDevelopment(packs,state,0,move));
 assert.equal(view.lethal,'unproven');
 assert.notEqual(view.benefit,'lethal');
 assert.equal(view.strip,true);
 assert.ok(pool.n>=0&&pool.n<2);
 const open=prepare('BLC-1-045',[]);
 const confirmed=prove(()=>moveDevelopment(open.packs,open.state,0,open.move));
 assert.equal(confirmed.lethal,'lethal');
 const fresh=prepare('BLC-1-045',[]);
 const {action,trace}=ask(fresh.packs,fresh.state);
 assert.equal(action.type,'move');
 assert.equal(trace.plan,'tree');
 assert.equal(trace.hardNodes,0);
 assert.ok(trace.nodesUsed<=48);
 console.log('open lethal',confirmed.lethal,JSON.stringify(confirmed.lethalLine));
});

function liveChoice(nodes,extra={}){
 const built=prepare('BLC-1-045',[]);
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(built.packs,built.state,{
  ...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,plan:'tree',
  nodes,ms:extra.ms??1e9,now:extra.now||(()=>0),meter,
  diagnose:extra.diagnose,onRootDone:extra.onRootDone
 });
 const trace=lastAiV3Trace();
 const view=cachedMoveDevelopment(built.packs,built.state,0,built.move);
 return {built,action,trace,meter,view,nodes};
}
function sameAccount(row){
 assert.equal(row.meter.dispatches,row.trace.nodesUsed);
 assert.ok(row.trace.nodesUsed<=row.nodes);
 assert.equal(row.trace.plan,'tree');
 assert.equal(row.trace.hardNodes,0);
}

test('budget: the live entry does not simulate a lethal line outside the shared pool',()=>{
 const zero=liveChoice(0);
 sameAccount(zero);
 assert.equal(zero.meter.dispatches,0);
 assert.equal(zero.action.type,'next');
 assert.notEqual(zero.view?.benefit,'lethal');
 assert.notEqual(zero.view?.lethal,'no');
 if(zero.view)assert.equal(zero.view.lethal,'unproven');
 const tiny=liveChoice(2);
 sameAccount(tiny);
 assert.ok(tiny.meter.dispatches>0&&tiny.meter.dispatches<=2);
 assert.equal(tiny.action.type,'next');
 assert.equal(tiny.view.lethal,'unproven');
 assert.notEqual(tiny.view.benefit,'lethal');
 const full=liveChoice(48);
 sameAccount(full);
 assert.ok(full.meter.dispatches>0);
 assert.equal(full.action.type,'move');
 assert.equal(full.view.lethal,'lethal');
 assert.equal(full.view.benefit,'lethal');
 console.log('live lethal',full.trace.nodesUsed,full.meter.dispatches,full.view.lethalLine.map(step=>step.type).join(' '));
 const expired=liveChoice(48,{ms:0});
 sameAccount(expired);
 assert.equal(expired.meter.dispatches,0);
 assert.equal(expired.action.type,'next');
 assert.notEqual(expired.view?.benefit,'lethal');
 const built=prepare('BLC-1-045',[]);
 const meter={dispatches:0};
 let marked=null;
 resetAiV3Report();
 const action=chooseAiV3Action(built.packs,built.state,{
  ...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,nodes:48,ms:40,meter,
  now(){return marked==null?0:1000;},
  onRootDone(){if(marked==null)marked=meter.dispatches;}
 });
 const trace=lastAiV3Trace();
 assert.equal(meter.dispatches,marked);
 assert.equal(trace.nodesUsed,meter.dispatches);
 assert.ok(trace.nodesUsed<=48);
 assert.equal(legalUniversalActions(built.packs,built.state).some(item=>item.type===action.type),true);
 const shown=liveChoice(48,{diagnose:true});
 const hidden=liveChoice(48,{diagnose:false});
 assert.equal(shown.action.type,hidden.action.type);
 assert.equal(shown.action.uid??null,hidden.action.uid??null);
 assert.equal(shown.meter.dispatches,hidden.meter.dispatches);
 assert.equal(shown.trace.nodesUsed,hidden.trace.nodesUsed);
 sameAccount(shown);
});

test('budget: an earlier unproven result is not a proof that the attack cannot kill',()=>{
 const built=prepare('BLC-1-045',[]);
 const pool={n:2};
 const early=bindProbeBudget({pool,deadline:Infinity,now:()=>0},()=>moveDevelopment(built.packs,built.state,0,built.move));
 assert.equal(early.lethal,'unproven');
 assert.notEqual(early.lethal,'no');
 assert.equal(pool.n,0);
 const meter={dispatches:0};
 resetAiV3Report();
 const action=chooseAiV3Action(built.packs,built.state,{
  ...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,nodes:48,ms:1e9,now:()=>0,meter
 });
 const trace=lastAiV3Trace();
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(meter.dispatches>0&&trace.nodesUsed<=48);
 assert.equal(action.type,'move');
 assert.equal(cachedMoveDevelopment(built.packs,built.state,0,built.move).lethal,'lethal');
});

test('budget: a line probe stops at its own quota and a thrown binding restores',()=>{
 const capped=prepare('BLC-1-045',[]);
 const pool={n:20};
 const view=bindProbeBudget({pool,deadline:Infinity,now:()=>0,lineSpent:0,lineCap:2},()=>moveDevelopment(capped.packs,capped.state,0,capped.move));
 assert.equal(view.lethal,'unproven');
 assert.notEqual(view.lethal,'no');
 assert.equal(pool.n,18);
 const leaked=prepare('BLC-1-045',[]);
 const held={n:10};
 assert.throws(()=>bindProbeBudget({pool:held,deadline:Infinity,now:()=>0},()=>{throw new Error('boom');}));
 moveDevelopment(leaked.packs,leaked.state,0,leaked.move);
 assert.equal(held.n,10);
 const outer={n:30},inner={n:5};
 const nested=prepare('BLC-1-045',[]);
 bindProbeBudget({pool:outer,deadline:Infinity,now:()=>0},()=>{
  assert.throws(()=>bindProbeBudget({pool:inner,deadline:Infinity,now:()=>0,lineSpent:0,lineCap:2},()=>{throw new Error('inner');}));
  assert.equal(inner.n,5);
  const proved=moveDevelopment(nested.packs,nested.state,0,nested.move);
  assert.equal(proved.lethal,'lethal');
 });
 assert.equal(inner.n,5);
 assert.ok(outer.n<30&&outer.n>=20);
});

function ownIdentity(state){
 const mine=state.players[0];
 const ids=zone=>(zone||[]).map(card=>card?.uid||'').join(',');
 return [state.phase,state.turn,ids(mine.energy),ids(mine.front),ids(mine.hand)].join('|');
}
function clearFront(state){
 const copy=structuredClone(state);
 for(let slot=0;slot<copy.players[1].front.length;slot++){
  const card=copy.players[1].front[slot];
  if(!card)continue;
  copy.players[1].deck.push(card);
  copy.players[1].front[slot]=null;
 }
 return copy;
}
function onlyFront(state,id){
 const copy=clearFront(state);
 const card=take(copy,1,id);
 place(copy,1,card,'front',0);
 return copy;
}
function moveOf(packs,state){
 const uid=state.players[0].energy.find(card=>card)?.uid;
 return legalUniversalActions(packs,state).find(action=>action.type==='move'&&action.uid===uid);
}
function sharePool(pool,fn){
 return bindProbeBudget({pool,deadline:Infinity,now:()=>0},fn);
}
function pairFront(attackerId,blockerId){
 const built=prepare(attackerId,[blockerId]);
 const open=clearFront(built.state);
 assert.equal(assertUniversalMatch(built.packs,open),true);
 assert.equal(assertUniversalMatch(built.packs,built.state),true);
 assert.equal(ownIdentity(open),ownIdentity(built.state));
 assert.notEqual(built.state.players[1].front.filter(Boolean).length,0);
 assert.equal(open.players[1].front.filter(Boolean).length,0);
 const move=moveOf(built.packs,built.state);
 assert.equal(move.uid,moveOf(built.packs,open).uid);
 return {packs:built.packs,open,walled:built.state,move};
}

test('cache: an empty front lethal is not reused when a 1500 blocker is present',()=>{
 const {packs,open,walled,move}=pairFront('BLC-1-045','BLC-1-056');
 assert.equal(bleach.cards['BLC-1-045'].bp,2000);
 assert.equal(bleach.cards['BLC-1-045'].impact,undefined);
 assert.equal(bleach.cards['BLC-1-056'].bp,1500);
 const pool={n:80};
 const openView=sharePool(pool,()=>moveDevelopment(packs,open,0,move));
 const spent=pool.n;
 const walledView=sharePool(pool,()=>moveDevelopment(packs,walled,0,move));
 assert.equal(openView.lethal,'lethal');
 assert.equal(openView.wantsColor,true);
 assert.equal(walledView.lethal,'no');
 assert.notEqual(walledView.benefit,'lethal');
 assert.ok(pool.n<spent);
 assert.equal(pool.moveMemo,undefined);
 const freshPool={n:64};
 const fresh=sharePool(freshPool,()=>moveDevelopment(packs,walled,0,move));
 assert.equal(fresh.lethal,'no');
 const fought=blockedAttack(packs,walled,move);
 assert.ok(fought.results.length>=1);
 for(const followed of fought.results){
  assert.equal(followed.players[1].life.length,1);
  assert.equal(followed.status,'playing');
 }
});

test('cache: a blocked result is not reused when the front is empty',()=>{
 const {packs,open,walled,move}=pairFront('BLC-1-045','BLC-1-056');
 const pool={n:80};
 const walledView=sharePool(pool,()=>moveDevelopment(packs,walled,0,move));
 const spent=pool.n;
 const openView=sharePool(pool,()=>moveDevelopment(packs,open,0,move));
 assert.equal(walledView.lethal,'no');
 assert.equal(openView.lethal,'lethal');
 assert.equal(openView.benefit,'lethal');
 assert.ok(pool.n<spent);
});

test('cache: opponent life, impact null, and blocker BP stay on their own state',()=>{
 const life=prepare('BLC-1-045',[]);
 const longer=structuredClone(life.state);
 const extra=longer.players[1].deck.pop();
 longer.players[1].life.push(extra);
 assert.equal(longer.players[1].life.length,2);
 assert.equal(ownIdentity(longer),ownIdentity(life.state));
 assert.equal(assertUniversalMatch(life.packs,longer),true);
 const lifePool={n:80};
 const shortView=sharePool(lifePool,()=>moveDevelopment(life.packs,life.state,0,life.move));
 const longView=sharePool(lifePool,()=>moveDevelopment(life.packs,longer,0,life.move));
 assert.equal(shortView.lethal,'lethal');
 assert.equal(longView.lethal,'no');
 const lifeBack={n:80};
 const longFirst=sharePool(lifeBack,()=>moveDevelopment(life.packs,longer,0,life.move));
 const shortAfter=sharePool(lifeBack,()=>moveDevelopment(life.packs,life.state,0,life.move));
 assert.equal(longFirst.lethal,'no');
 assert.equal(shortAfter.lethal,'lethal');
 const impact=prepare('BLC-1-009',['BLC-1-008','BLC-1-056','BLC-1-004']);
 const through=clearFront(impact.state);
 const nulled=onlyFront(impact.state,'BLC-1-008');
 const small=onlyFront(impact.state,'BLC-1-056');
 const tall=onlyFront(impact.state,'BLC-1-004');
 for(const state of [through,nulled,small,tall]){
  assert.equal(ownIdentity(state),ownIdentity(impact.state));
  assert.equal(assertUniversalMatch(impact.packs,state),true);
 }
 assert.equal(bleach.cards['BLC-1-009'].bp,3000);
 assert.equal(bleach.cards['BLC-1-008'].bp,2500);
 assert.equal(bleach.cards['BLC-1-004'].bp,4000);
 const impactPool={n:160};
 const throughView=sharePool(impactPool,()=>moveDevelopment(impact.packs,through,0,impact.move));
 const nullView=sharePool(impactPool,()=>moveDevelopment(impact.packs,nulled,0,impact.move));
 const smallView=sharePool(impactPool,()=>moveDevelopment(impact.packs,small,0,impact.move));
 const tallView=sharePool(impactPool,()=>moveDevelopment(impact.packs,tall,0,impact.move));
 assert.equal(throughView.lethal,'lethal');
 assert.equal(nullView.lethal,'no');
 assert.equal(smallView.lethal,'lethal');
 assert.equal(tallView.lethal,'no');
 const reversePool={n:160};
 const tallFirst=sharePool(reversePool,()=>moveDevelopment(impact.packs,tall,0,impact.move));
 const smallAfter=sharePool(reversePool,()=>moveDevelopment(impact.packs,small,0,impact.move));
 const nullFirst=sharePool(reversePool,()=>moveDevelopment(impact.packs,nulled,0,impact.move));
 const throughAfter=sharePool(reversePool,()=>moveDevelopment(impact.packs,through,0,impact.move));
 assert.equal(tallFirst.lethal,'no');
 assert.equal(smallAfter.lethal,'lethal');
 assert.equal(nullFirst.lethal,'no');
 assert.equal(throughAfter.lethal,'lethal');
 const stopped=blockedAttack(impact.packs,nulled,impact.move);
 assert.ok(stopped.results.every(followed=>followed.status==='playing'&&followed.players[1].life.length===1));
 const beaten=blockedAttack(impact.packs,tall,impact.move);
 assert.ok(beaten.results.every(followed=>followed.status==='playing'&&followed.players[1].life.length===1));
});

test('energy: a partial block does not spend the color a stranded hand still needs',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../audit/ai-v3-official-8300-nodes48-white-reach.json',import.meta.url),'utf8'));
 const deck=battleDecks().find(row=>row.id==='white-sword');
 const game=report.titles['white-sword'].byMode.tree.games.find(row=>row.seed===8300&&row.first===0&&row.challengerSeat===0);
 const packs=[deck.pack,deck.pack];
 let state=newComparedMatch(packs,[deck.counts,deck.counts],game.seed,game.first);
 for(const choice of game.opening||[]){
  const action=legalUniversalActions(packs,state).find(entry=>entry.type==='openingMulligan'&&entry.mode===choice.mode);
  state=dispatchUniversalAction(packs,state,action,{actor:choice.actor});
 }
 for(const row of game.actions){
  if(row.step===55)break;
  state=dispatchUniversalAction(packs,state,row.action,{actor:state.pending?.player??state.active});
 }
 const actor=state.pending?.player??state.active;
 const legal=legalUniversalActions(packs,state);
 const move=legal.find(action=>action.type==='move'&&action.uid==='0-18');
 const view=moveDevelopment(packs,state,actor,move);
 assert.equal(state.phase,'move');
 assert.equal(universalEnergyByColor(packs,state,actor).green,4);
 assert.equal(view.benefit,null);
 assert.equal(view.reason,'curve-hand');
 assert.equal(view.strip,true);
 assert.equal(view.after,3);
 resetAiV3Report();
 const frozen=chooseAiV3Action(packs,state,{...OPTS,actor,seed:game.seed});
 const trace=lastAiV3Trace();
 assert.equal(frozen.type,'next');
 assert.equal(trace.score,trace.candidates.find(row=>row.action?.type==='next').search);
 assert.equal(trace.sequence[0].type,'next');
 assert.equal(trace.replacedMove.type,'move');
 assert.equal(trace.settled,false);
 assert.ok(trace.nodesUsed<=48);
 resetAiV3Report();
 const timed=chooseAiV3Action(packs,structuredClone(state),{...MATCH_LIMITS,actor,seed:game.seed,hardNodes:0,plan:'tree',nodes:48,ms:40});
 const timedTrace=lastAiV3Trace();
 assert.equal(timed.type,'next');
 assert.ok(timedTrace.nodesUsed<=48);
 console.log('clock40 partial-block',JSON.stringify({
  action:timed.type,reason:timedTrace.reason,nodes:timedTrace.nodesUsed,fallback:timedTrace.fallbackKind??null,over:timedTrace.overSoft??null
 }));
 const main=dispatchUniversalAction(packs,state,frozen,{actor});
 assert.equal(assertUniversalMatch(packs,main),true);
 resetAiV3Report();
 const played=chooseAiV3Action(packs,main,{...OPTS,actor,seed:game.seed});
 const body=main.players[actor].hand.find(card=>card.uid===played.uid);
 assert.equal(played.type,'play');
 assert.equal(played.line,'front');
 assert.ok((deck.pack.cards[body.cardId].bp||0)>=4000);
 const stood=dispatchUniversalAction(packs,main,played,{actor});
 assert.equal(assertUniversalMatch(packs,stood),true);
 assert.equal(universalEnergyByColor(packs,stood,actor).green,4);
 assert.equal(stood.players[actor].front.filter(Boolean).length,1);
 let later=state;
 for(const row of game.actions){
  if(row.step>=95)break;
  if(row.step<55)continue;
  later=dispatchUniversalAction(packs,later,row.action,{actor:later.pending?.player??later.active});
 }
 const historical=game.actions.find(row=>row.step===95).action;
 const seat=later.pending?.player??later.active;
 const full=moveDevelopment(packs,later,seat,historical);
 assert.equal(full.benefit,'block');
 assert.equal(full.strip,false);
});

test('browser module: strategy does not import a Node builtin',()=>{
 const source=fs.readFileSync(new URL('../dist/universal-v2/ai-v3/strategy.mjs',import.meta.url),'utf8');
 assert.equal(/\bfrom\s+['"]node:/.test(source),false);
 assert.equal(source.includes('AsyncLocalStorage'),false);
 assert.equal(source.includes('moveMemo'),false);
});

test('cache: an unproven check stays unproven and the same state can be reused',()=>{
 const {packs,open,walled,move}=pairFront('BLC-1-045','BLC-1-056');
 const pool={n:2};
 const early=sharePool(pool,()=>moveDevelopment(packs,open,0,move));
 assert.equal(early.lethal,'unproven');
 assert.notEqual(early.lethal,'no');
 assert.equal(pool.n,0);
 const again=sharePool(pool,()=>moveDevelopment(packs,open,0,move));
 assert.equal(again.lethal,'unproven');
 const proved=sharePool({n:64},()=>moveDevelopment(packs,open,0,move));
 assert.equal(proved.lethal,'lethal');
 const blocked=sharePool({n:64},()=>moveDevelopment(packs,walled,0,move));
 assert.equal(blocked.lethal,'no');
 const reuse={n:64};
 const first=sharePool(reuse,()=>moveDevelopment(packs,walled,0,move));
 const left=reuse.n;
 const second=sharePool(reuse,()=>moveDevelopment(packs,walled,0,move));
 assert.equal(second.lethal,first.lethal);
 assert.equal(reuse.n,left);
});
