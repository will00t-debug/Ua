import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {withTestVariant} from './ai-v3-variant.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {positionKey,scoreLine} from '../dist/universal-v2/ai-v3/beam.mjs';
import {keepScore} from '../dist/universal-v2/ai-v3/eval.mjs';

// Decision checks spend the node budget with a clock that does not expire.
// Deadline exhaustion is a separate controllable clock. A real 40ms check
// stays inside the match budget and does not require one tactical result.
const OPTS={...MATCH_LIMITS,seed:1,mode:'beam',ms:1e9};
const chooseRaw=chooseAiV3Action;
function choose(packs,state,options){
 return chooseRaw(packs,state,withTestVariant(options));
}
function deck(pack,extra){
 const counts={...extra};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(pack.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
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
function main(pack,counts,first=0){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first});
 while(state.phase!==(first===0?'main':'attack')&&state.status==='playing'){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 return {packs,state};
}
function ask(packs,state){
 const actor=state.pending?.player??state.active;
 resetAiV3Report();
 const env=process.env.AI_V3_TEST_VARIANT;
 const variant=env==='a'||env==='b'||env==='ab'||env==='ab-front'?env:null;
 return choose(packs,state,{...OPTS,actor,...(variant?{variant}:{})});
}
const bleach=officialV2Pack('bleach');
const counts=deck(bleach,{
 'BLC-1-042':4,'BLC-1-043':2,'BLC-1-045':2,'BLC-1-051':2,'BLC-1-053':2,
 'BLC-2-052':2,'BLC-4-059':1,'BLC-1-038':2
});

test('strategy: keeping the basic energy continuation outscores passing',()=>{
 const {packs,state}=main(bleach,counts);
 const energy=take(state,0,'BLC-1-042');
 place(state,0,energy,'energy',0);
 const body=take(state,0,'BLC-1-042');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(body);
 assert.equal(assertUniversalMatch(packs,state),true);
 const hard=chooseStrengthenedHardAction(packs,state,{nodes:48,ms:1e9,seed:1});
 assert.equal(hard.type,'play');
 assert.equal(hard.line,'energy');
 assert.equal(hard.uid,body.uid);
 resetAiV3Report();
 const action=choose(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:1e9,hardNodes:0,nodes:48});
 const trace=lastAiV3Trace();
 const played=trace.compared.find(row=>row.action.type==='play'&&row.action.line==='energy');
 const passed=trace.compared.find(row=>row.action.type==='next');
 assert.equal(action.type,'play');
 assert.equal(action.line,'energy');
 assert.equal(action.uid,body.uid);
 assert.equal(trace.reason,'search');
 assert.equal(played.boundary,'returned');
 assert.equal(passed.boundary,'returned');
 assert.equal(played.executed,true);
 assert.ok(played.nodes>0);
 assert.ok(played.search>passed.search+10);
 assert.equal((played.sequence||[]).some(step=>step.mode==='selfRestEnergyRetire'),false);
 console.log('strategy develop',action.type,played.search,passed.search);
});

test('strategy: a cut search records the boundary and may still skip',()=>{
 const {packs,state}=main(bleach,counts);
 const energy=take(state,0,'BLC-1-042');
 place(state,0,energy,'energy',0);
 const body=take(state,0,'BLC-1-042');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(body);
 resetAiV3Report();
 let ticks=0;
 const now=()=>ticks++===0?1000:5000;
 const action=choose(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:40,now,nodes:48});
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>item.type===action.type),true);
 assert.equal(trace.nodesUsed,0);
 assert.equal(trace.reason,'budget-fallback');
 assert.equal((trace.compared||[]).length,0);
 assert.ok((trace.unexecuted||[]).length>0);
 assert.ok((trace.unexecuted||[]).every(row=>row.executed===false&&row.reason==='time'));
 console.log('strategy clock ok',action.type,trace.reason);
});

test('strategy: an expired clock does not score an unplayed lethal or recovery',()=>{
 const opened=main(bleach,counts);
 const packs=opened.packs;
 let state=opened.state;
 while(state.phase!=='attack'){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 const attacker=take(state,0,'BLC-1-043');
 place(state,0,attacker,'front',0);
 while(state.players[1].life.length>1)state.players[1].deck.push(state.players[1].life.pop());
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 resetAiV3Report();
 const lethal=choose(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:0,nodes:48});
 const lethalTrace=lastAiV3Trace();
 assert.equal(lethal.type,'attack');
 assert.equal(lethal.uid,attacker.uid);
 assert.equal(lethalTrace.nodesUsed,0);
 assert.equal(lethalTrace.reason,'budget-fallback');
 assert.equal((lethalTrace.compared||[]).some(row=>Number.isFinite(row.search)),false);
 const {packs:ready,state:recover}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(recover,0,take(recover,0,'BLC-1-042'),'energy',slot);
 const base=take(recover,0,'BLC-1-051');
 place(recover,0,base,'front',0);
 const event=take(recover,0,'BLC-4-059');
 const core=take(recover,0,'BLC-1-053');
 for(const card of [...recover.players[0].hand])recover.players[0].deck.push(card);
 recover.players[0].hand.length=0;
 recover.players[0].hand.push(event,core);
 recover.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<1;});
 const play=legalUniversalActions(ready,recover).find(action=>action.type==='event'&&action.uid===event.uid);
 const pending=dispatchUniversalAction(ready,recover,play,{actor:0});
 assert.equal(pending.pending.kind,'effect-recover-ap');
 resetAiV3Report();
 const recovered=choose(ready,pending,{...MATCH_LIMITS,actor:0,seed:1,ms:0,nodes:48});
 const recoveredTrace=lastAiV3Trace();
 assert.equal(recovered.type,'chooseApRecovery');
 assert.ok(recovered.uid);
 assert.equal(recoveredTrace.nodesUsed,0);
 assert.equal(recoveredTrace.reason,'budget-fallback');
 console.log('strategy expired',lethal.type,recovered.uid);
});

test('strategy: a real 40ms clock stays inside the match budget',()=>{
 const {packs,state}=main(bleach,counts);
 const energy=take(state,0,'BLC-1-042');
 place(state,0,energy,'energy',0);
 const body=take(state,0,'BLC-1-042');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(body);
 const walls=[];
 let action=null,trace=null;
 for(let sample=0;sample<7;sample++){
  resetAiV3Report();
  const started=performance.now();
  action=choose(packs,state,{...MATCH_LIMITS,actor:0,seed:1});
  walls.push(performance.now()-started);
  trace=lastAiV3Trace();
  assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
  assert.ok(trace.nodesUsed<=48);
  assert.equal(trace.softMs,40);
  if((trace.coverage?.executed||0)===0){
   assert.equal(trace.reason,'budget-fallback');
   assert.equal(trace.fallbackKind,'budget');
   assert.equal(trace.settled,false);
   assert.equal(trace.executed,false);
   assert.equal(trace.incomplete,true);
   assert.ok(!(trace.compared||[]).some(row=>Number.isFinite(row.search)));
   assert.ok(trace.coverage.roots>=1);
   assert.equal(trace.unexecuted.length,trace.coverage.roots);
   assert.ok(trace.unexecuted.every(row=>row.executed===false&&row.nodes===0&&row.reason==='time'));
  }else{
   assert.ok(trace.coverage.executed>=1);
   assert.ok((trace.compared||[]).every(row=>row.executed!==false&&row.nodes>0&&Number.isFinite(row.search)));
  }
 }
 walls.sort((a,b)=>a-b);
 const at=p=>walls[Math.min(walls.length-1,Math.max(0,Math.ceil(p*walls.length)-1))];
 const p50=at(0.5),p95=at(0.95),max=walls[walls.length-1];
 // 40ms is the soft search deadline. 500ms is only a hang cap, not the think budget.
 assert.ok(max<500,`strict hang cap exceeded: p50 ${p50} p95 ${p95} max ${max}`);
 console.log('strategy 40ms',action.type,trace.reason,'soft',trace.softMs,'over',trace.overSoft,
  'p50',p50.toFixed(1),'p95',p95.toFixed(1),'max',max.toFixed(1),'nodes',trace.nodesUsed);
});

function clockSpot(){
 const {packs,state}=main(bleach,counts);
 const energy=take(state,0,'BLC-1-042');
 place(state,0,energy,'energy',0);
 const body=take(state,0,'BLC-1-042');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(body);
 return {packs,state};
}
test('strategy: a frozen clock still starts every root the node pool can share',()=>{
 const {packs,state}=clockSpot();
 const meter={dispatches:0};
 resetAiV3Report();
 const action=choose(packs,state,{
  ...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:1e9,now:()=>0,meter,diagnose:true
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.ok(trace.coverage.roots>=1);
 assert.equal(trace.coverage.executed,trace.coverage.roots);
 assert.ok(trace.coverage.executed>=1);
 assert.equal(trace.unexecuted.length,0);
 assert.ok(trace.nodesUsed<=48);
 assert.ok(trace.nodesUsed>=1);
 assert.equal(meter.dispatches,trace.nodesUsed);
});

test('strategy: a clock that is already closed records every root as unexecuted',()=>{
 const {packs,state}=clockSpot();
 const meter={dispatches:0};
 resetAiV3Report();
 const action=choose(packs,state,{
  ...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,plan:'tree',nodes:48,ms:0,now:()=>0,meter,diagnose:true
 });
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.equal(trace.coverage.executed,0);
 assert.equal(trace.nodesUsed,0);
 assert.equal(meter.dispatches,0);
 assert.equal(trace.reason,'budget-fallback');
 assert.equal(trace.fallbackKind,'budget');
 assert.equal(trace.settled,false);
 assert.equal(trace.executed,false);
 assert.equal(trace.incomplete,true);
 assert.ok(!(trace.compared||[]).some(row=>Number.isFinite(row.search)));
 assert.ok(trace.coverage.roots>=1);
 assert.equal(trace.unexecuted.length,trace.coverage.roots);
 assert.ok(trace.unexecuted.every(row=>row.executed===false&&row.nodes===0&&row.reason==='time'));
 assert.equal(trace.coverage.reasons.time,trace.coverage.roots);
});

test('strategy: two nodes do not settle the same turn',()=>{
 const {packs,state}=main(bleach,counts);
 place(state,0,take(state,0,'BLC-1-043'),'front',0);
 const actor=0;
 const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
 const line=scoreLine(packs,state,actor,next,{nodes:2,deadline:Infinity,actorDecisions:2,opponentDecisions:2});
 assert.equal(line.settled,false);
 assert.equal(line.opponentTurns,0);
 assert.equal(line.returned,false);
 assert.equal(line.handedOff,false);
 assert.equal(line.phase,'attack');
 assert.equal(line.exhausted,'nodes');
 assert.equal(line.leafOwnTurns[0],state.players[0].ownTurns);
 const held=scoreLine(packs,state,actor,next,{nodes:1,deadline:Infinity,actorDecisions:2,opponentDecisions:2});
 assert.equal(held.settled,false);
 assert.equal(held.phase,'attack');
 assert.equal(held.opponentTurns,0);
 assert.equal(held.pending,null);
 assert.equal(held.cut,'nodes');
 assert.equal(held.boundary,'open');
 const timed=scoreLine(packs,state,actor,next,{nodes:48,deadline:performance.now()-1,actorDecisions:2,opponentDecisions:2});
 assert.equal(timed.settled,false);
 assert.equal(timed.cut,'time');
 assert.equal(timed.boundary,'open');
 console.log('strategy boundary ok',line.phase,timed.cut);
});

test('strategy: an unfinished discard pending is not a settled turn',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0);
 const core=take(state,0,'BLC-1-053');
 state.players[0].hand.push(core);
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<2;});
 const raid=legalUniversalActions(packs,state).find(action=>action.type==='raid'&&action.uid===core.uid);
 const line=scoreLine(packs,state,0,raid,{nodes:2,deadline:Infinity,actorDecisions:2,opponentDecisions:2});
 assert.equal(line.settled,false);
 assert.equal(line.boundary,'pending');
 assert.equal(line.pending,'effect-discard');
 assert.equal(line.stopPending,'effect-discard');
 assert.equal(line.cut,'nodes');
 assert.equal(line.stopReason,'nodes');
 assert.equal(line.returned,false);
 console.log('strategy pending ok',line.exhausted);
});

test('strategy: an open lethal attack is taken',()=>{
 const opened=main(bleach,counts);
 const packs=opened.packs;
 let state=opened.state;
 while(state.phase!=='attack'){
  const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
  state=dispatchUniversalAction(packs,state,next);
 }
 const attacker=take(state,0,'BLC-1-043');
 place(state,0,attacker,'front',0);
 while(state.players[1].life.length>1)state.players[1].deck.push(state.players[1].life.pop());
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 assert.equal(assertUniversalMatch(packs,state),true);
 const action=ask(packs,state);
 assert.equal(action.type,'attack');
 assert.equal(action.uid,attacker.uid);
 console.log('strategy lethal ok');
});

test('strategy: a life-saving block is taken',()=>{
 const {packs,state}=main(bleach,counts,1);
 const blocker=take(state,0,'BLC-1-051');
 const attacker=take(state,1,'BLC-1-042');
 place(state,0,blocker,'front',0);
 place(state,1,attacker,'front',0);
 while(state.players[0].life.length>1)state.players[0].deck.push(state.players[0].life.pop());
 for(let slot=1;slot<4;slot++){
  for(const seat of [0,1])if(state.players[seat].front[slot]){
   state.players[seat].deck.push(state.players[seat].front[slot]);
   state.players[seat].front[slot]=null;
  }
 }
 assert.equal(state.phase,'attack');
 assert.equal(state.active,1);
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack'&&action.uid===attacker.uid);
 const pending=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(pending.pending.kind,'block');
 assert.equal(assertUniversalMatch(packs,pending),true);
 const action=ask(packs,pending);
 assert.equal(action.type,'chooseBlock');
 assert.equal(action.uid,blocker.uid);
 console.log('strategy block ok');
});

test('strategy: rested AP is recovered when it enables the raid',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0);
 const event=take(state,0,'BLC-4-059');
 const core=take(state,0,'BLC-1-053');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(event,core);
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<1;});
 const play=legalUniversalActions(packs,state).find(action=>action.type==='event'&&action.uid===event.uid);
 const pending=dispatchUniversalAction(packs,state,play,{actor:0});
 assert.equal(pending.pending.kind,'effect-recover-ap');
 assert.equal(assertUniversalMatch(packs,pending),true);
 const action=ask(packs,pending);
 assert.equal(action.type,'chooseApRecovery');
 assert.ok(action.uid);
 let cursor=dispatchUniversalAction(packs,pending,action,{actor:pending.pending.player});
 while(cursor.pending?.kind==='effect-recover-ap'){
  const step=ask(packs,cursor);
  cursor=dispatchUniversalAction(packs,cursor,step,{actor:cursor.pending.player});
 }
 const raid=ask(packs,cursor);
 const raidTrace=lastAiV3Trace();
 const best=[...(raidTrace.compared||[])].sort((a,b)=>b.search-a.search)[0];
 assert.equal(raidTrace.reason,'search');
 assert.ok((raidTrace.compared||[]).some(row=>row.action.type==='raid'&&row.boundary==='returned'&&row.executed===true));
 assert.equal(best.boundary,'returned');
 assert.equal(raid.type,best.action.type);
 if(raid.type==='raid'){
  assert.equal(raid.uid,core.uid);
  assert.equal(raid.baseUid,base.uid);
 }
 console.log('strategy ap ok',raid.type,best.search);
});

test('strategy: the recovered raid card is raided onto its base',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0);
 const self=take(state,0,'BLC-1-038');
 const core=take(state,0,'BLC-1-053');
 state.players[0].outside.push(core);
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(self);
 const window=['BLC-1-043','BLC-1-045','BLC-1-043'].map(id=>take(state,0,id));
 state.players[0].deck.unshift(...window);
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<3;});
 const play=legalUniversalActions(packs,state).find(action=>action.type==='play'&&action.uid===self.uid&&action.line==='front');
 let pending=dispatchUniversalAction(packs,state,play,{actor:0});
 assert.equal(pending.pending.kind,'effect-optional-mill');
 pending=dispatchUniversalAction(packs,pending,{type:'chooseOptionalMill',mode:'mill'},{actor:0});
 assert.equal(pending.pending.kind,'effect-recover-outside');
 assert.equal(assertUniversalMatch(packs,pending),true);
 const action=ask(packs,pending);
 assert.equal(action.type,'chooseOutsideRecovery');
 assert.equal(action.uid,core.uid);
 const recovered=dispatchUniversalAction(packs,pending,action,{actor:pending.pending.player});
 const before=positionKey(recovered,0,'us',2);
 const raid=ask(packs,recovered);
 const raidTrace=lastAiV3Trace();
 const best=[...(raidTrace.compared||[])].sort((a,b)=>b.search-a.search)[0];
 assert.equal(raidTrace.reason,'search');
 assert.ok((raidTrace.compared||[]).some(row=>row.action.type==='raid'&&row.boundary==='returned'));
 assert.equal(raid.type,best.action.type);
 if(raid.type==='raid'){
  assert.equal(raid.uid,core.uid);
  assert.equal(raid.baseUid,base.uid);
  const raided=dispatchUniversalAction(packs,recovered,raid,{actor:0});
  assert.notEqual(positionKey(raided,0,'us',2),before);
  assert.ok((raided.players[0].front.concat(raided.players[0].energy)).some(card=>card&&(card.stack||[]).some(layer=>layer?.uid===base.uid)));
 }
 console.log('strategy raid ok',raid.type,best.search);
});

test('strategy: a discard keeps the raid card',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0);
 const playCard=take(state,0,'BLC-2-052');
 const core=take(state,0,'BLC-1-053');
 const filler=take(state,0,'BLC-1-045');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(playCard,core,filler);
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<2;});
 const play=legalUniversalActions(packs,state).find(action=>action.type==='play'&&action.uid===playCard.uid&&action.line==='front');
 const pending=dispatchUniversalAction(packs,state,play,{actor:0});
 assert.equal(pending.pending.kind,'effect-discard');
 assert.equal(pending.players[0].hand.some(card=>card.uid===core.uid),true);
 assert.equal(assertUniversalMatch(packs,pending),true);
 const action=ask(packs,pending);
 assert.equal(action.type,'chooseDiscard');
 assert.notEqual(action.uid,core.uid);
 resetAiV3Report();
 const loaded=choose(packs,pending,{...MATCH_LIMITS,actor:pending.pending.player,ms:1,nodes:4});
 assert.equal(loaded.type,'chooseDiscard');
 assert.notEqual(loaded.uid,core.uid);
 const trace=lastAiV3Trace();
 assert.equal(trace.incomplete,true);
 const kept=dispatchUniversalAction(packs,pending,action,{actor:pending.pending.player});
 const raid=ask(packs,kept);
 const raidTrace=lastAiV3Trace();
 const best=[...(raidTrace.compared||[])].sort((a,b)=>b.search-a.search)[0];
 assert.equal(raidTrace.reason,'search');
 assert.ok((raidTrace.compared||[]).some(row=>row.action.type==='raid'&&row.executed===true));
 assert.equal(raid.type,best.action.type);
 if(raid.type==='raid')assert.equal(raid.uid,core.uid);
 console.log('strategy discard ok',raid.type,best.search);
});

// Life cards stay at seven. A needed copy sitting in life is swapped with
// the deck so the count is the one the position asked for.
function drawCard(state,player,id){
 for(const zone of ['hand','deck']){
  const list=state.players[player][zone];
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 const life=state.players[player].life;
 const index=life.findIndex(card=>card?.cardId===id);
 if(index<0)throw Error('Missing '+id);
 const deck=state.players[player].deck;
 const swap=deck.findIndex(card=>card&&card.cardId!==id);
 if(swap<0)throw Error('No deck swap for '+id);
 const card=life[index];
 life[index]=deck[swap];
 deck.splice(swap,1);
 return card;
}
function lethalDiscard(){
 const opened=main(bleach,counts);
 const packs=opened.packs;
 let state=opened.state;
 let guard=0;
 while(!(state.active===1&&state.phase==='main')&&state.status==='playing'&&guard++<40){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 const actor=1;
 const rukia=drawCard(state,actor,'BLC-1-051');
 for(let slot=0;slot<4;slot++)place(state,actor,drawCard(state,actor,'BLC-1-042'),'energy',slot);
 place(state,actor,rukia,'front',0);
 while(state.players[0].life.length>1)state.players[0].deck.push(state.players[0].life.pop());
 for(let slot=0;slot<4;slot++)if(state.players[0].front[slot]){
  state.players[0].deck.push(state.players[0].front[slot]);
  state.players[0].front[slot]=null;
 }
 for(const card of [...state.players[actor].hand])state.players[actor].deck.push(card);
 state.players[actor].hand.length=0;
 for(const id of ['BLC-2-052','BLC-1-053','BLC-1-045','BLC-1-043','BLC-4-059','BLC-1-038'])
  state.players[actor].hand.push(drawCard(state,actor,id));
 state.players[actor].apCards.forEach((card,index)=>{card.inPlay=index<2;card.ready=index<2;});
 assert.equal(state.players[actor].life.length,7);
 assert.equal(state.players[0].life.length,1);
 assert.equal(state.players[actor].apCards.filter(card=>card.ready).length,2);
 assert.equal(assertUniversalMatch(packs,state),true);
 const play=legalUniversalActions(packs,state).find(action=>action.type==='play'&&action.line==='front'&&action.uid===state.players[actor].hand.find(card=>card.cardId==='BLC-2-052').uid);
 assert.ok(play);
 state=dispatchUniversalAction(packs,state,play,{actor});
 assert.equal(state.pending?.kind,'effect-discard');
 assert.equal(assertUniversalMatch(packs,state),true);
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.filter(action=>action.type==='chooseDiscard').length,6);
 return {packs,state,actor,rukia,legal};
}
function playOutWin(packs,state,action,actor){
 let cursor=dispatchUniversalAction(packs,structuredClone(state),action,{actor});
 for(let guard=0;guard<20&&cursor.status==='playing';guard++){
  const steps=legalUniversalActions(packs,cursor);
  const who=cursor.pending?.player??cursor.active;
  const step=steps.find(item=>item.type==='attack')||steps.find(item=>item.type==='next')||
   steps.find(item=>item.type==='chooseDiscard')||steps[0];
  cursor=dispatchUniversalAction(packs,cursor,step,{actor:who});
 }
 return cursor;
}
function askDiscard(packs,state,extra={}){
 const actor=state.pending.player;
 const meter={dispatches:0};
 resetAiV3Report();
 const action=choose(packs,state,{
  ...MATCH_LIMITS,actor,seed:1,hardNodes:0,plan:'tree',nodes:48,diagnose:true,meter,ms:1e9,now:()=>0,...extra,meter
 });
 const trace=lastAiV3Trace();
 assert.equal(meter.dispatches,trace.nodesUsed);
 assert.ok(trace.nodesUsed<=(extra.nodes||48));
 assert.equal(legalUniversalActions(packs,state).some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 return {action,trace,meter,actor};
}

test('a searched discard win is kept when other discards were not searched',()=>{
 const {packs,state,actor,rukia,legal}=lethalDiscard();
 const hand=state.players[actor].hand;
 const preview=structuredClone(state);
 let walked=dispatchUniversalAction(packs,preview,legal.find(action=>action.type==='chooseDiscard'),{actor});
 for(let guard=0;walked.phase!=='attack'&&walked.status==='playing'&&guard<8;guard++){
  const steps=legalUniversalActions(packs,walked);
  walked=dispatchUniversalAction(packs,walked,steps.find(action=>action.type==='next'),{actor:walked.pending?.player??walked.active});
 }
 assert.equal(legalUniversalActions(packs,walked).some(action=>action.type==='attack'&&action.uid===rukia.uid),true);
 const full=askDiscard(packs,state);
 const rows=(full.trace.compared||[]).filter(row=>row.executed!==false&&row.action?.type==='chooseDiscard');
 assert.equal(rows.length,4);
 assert.ok(rows.every(row=>row.boundary==='terminal'&&row.search>=90000&&row.settled===true));
 const chosen=rows.find(row=>row.action.uid===full.action.uid);
 assert.ok(chosen);
 const floor=Math.min(...rows.map(row=>keepScore(packs,state,actor,hand.find(card=>card.uid===row.action.uid))));
 assert.equal(keepScore(packs,state,actor,hand.find(card=>card.uid===full.action.uid)),floor);
 assert.equal(full.trace.reason,'search');
 assert.equal(full.trace.score,chosen.search);
 assert.equal(full.trace.settled,true);
 assert.equal(full.trace.incomplete,false);
 assert.deepEqual(full.trace.sequence,chosen.sequence);
 assert.equal(full.trace.roots,4);
 assert.equal((full.trace.unexecuted||[]).length,0);
 assert.ok(legal.some(action=>action.type==='chooseDiscard'&&!rows.some(row=>row.action.uid===action.uid)));
 const won=playOutWin(packs,state,full.action,actor);
 assert.equal(won.status,'finished');
 assert.equal(won.winner,actor);

 const high=hand.find(card=>card.cardId==='BLC-1-053');
 const low=legal.filter(action=>action.type==='chooseDiscard').sort((a,b)=>{
  const delta=keepScore(packs,state,actor,hand.find(card=>card.uid===a.uid))-keepScore(packs,state,actor,hand.find(card=>card.uid===b.uid));
  if(delta)return delta;
  return JSON.stringify(a)<JSON.stringify(b)?-1:1;
 })[0];
 assert.ok(keepScore(packs,state,actor,high)>keepScore(packs,state,actor,hand.find(card=>card.uid===low.uid)));
 let roots=0;
 const cut=askDiscard(packs,state,{
  ms:40,now:()=>roots>=1?1e9:0,
  rootFirst:[{type:'chooseDiscard',uid:high.uid}],
  onRootDone(){roots++;}
 });
 assert.equal(roots>=1,true);
 assert.equal(cut.action.type,'chooseDiscard');
 assert.equal(cut.action.uid,high.uid);
 assert.notEqual(cut.action.uid,low.uid);
 const win=(cut.trace.compared||[]).find(row=>row.executed!==false&&row.action?.uid===high.uid);
 assert.equal(win.boundary,'terminal');
 assert.ok(win.search>=90000);
 assert.equal(win.settled,true);
 assert.equal(cut.trace.score,win.search);
 assert.deepEqual(cut.trace.sequence,win.sequence);
 assert.equal(cut.trace.settled,true);
 assert.equal(cut.trace.incomplete,false);
 assert.equal(cut.trace.reason,'budget');
 assert.equal(cut.trace.overSoft,true);
 assert.ok((cut.trace.unexecuted||[]).some(row=>row.executed===false&&row.action?.uid===low.uid));
 assert.ok(cut.trace.nodesUsed<48);
 const cutWin=playOutWin(packs,state,cut.action,actor);
 assert.equal(cutWin.status,'finished');
 assert.equal(cutWin.winner,actor);

 const short=askDiscard(packs,state,{
  nodes:3,rootFirst:[{type:'chooseDiscard',uid:high.uid}]
 });
 const inflated=(short.trace.compared||[]).find(row=>row.executed!==false&&Number.isFinite(row.search)&&row.search>=90000&&row.boundary!=='terminal');
 assert.ok(inflated);
 assert.notEqual(short.action.uid,inflated.action.uid);
 assert.equal(short.action.uid,low.uid);
 assert.equal(short.trace.reason,'budget-fallback');
 assert.equal(short.trace.settled,false);
 assert.equal(short.trace.incomplete,true);
 assert.notEqual(short.trace.score,inflated.search);
});
