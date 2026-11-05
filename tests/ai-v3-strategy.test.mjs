import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';
import {chooseStrengthenedHardAction} from '../dist/universal-v2/hard-ai.mjs';
import {positionKey,scoreLine} from '../dist/universal-v2/ai-v3/beam.mjs';

// Decision checks spend the node budget with a clock that does not expire.
// Deadline exhaustion is a separate controllable clock. A real 40ms check
// stays inside the match budget and does not require one tactical result.
const OPTS={...MATCH_LIMITS,seed:1,mode:'beam',ms:1e9};
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
 return chooseAiV3Action(packs,state,{...OPTS,actor});
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
 const action=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:1e9,hardNodes:0,nodes:48});
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
 assert.ok(played.search>passed.search);
 assert.ok(played.search>10);
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
 const action=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:40,now,nodes:48});
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>item.type===action.type),true);
 assert.equal(trace.nodesUsed,0);
 assert.equal(trace.reason,'budget-fallback');
 assert.equal((trace.compared||[]).length,0);
 assert.ok((trace.unexecuted||[]).length>0);
 assert.ok((trace.unexecuted||[]).every(row=>row.executed===false));
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
 const lethal=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:0,nodes:48});
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
 const recovered=chooseAiV3Action(ready,pending,{...MATCH_LIMITS,actor:0,seed:1,ms:0,nodes:48});
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
 resetAiV3Report();
 const started=performance.now();
 const action=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor:0,seed:1});
 const trace=lastAiV3Trace();
 assert.equal(legalUniversalActions(packs,state).some(item=>item.type===action.type),true);
 assert.ok(trace.nodesUsed<=48);
 assert.ok(performance.now()-started<1000);
 assert.ok((trace.compared||[]).every(row=>row.executed!==false&&row.nodes>0&&Number.isFinite(row.search)));
 console.log('strategy 40ms',action.type,trace.reason,trace.nodesUsed,Math.round(trace.ms));
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
 assert.equal(line.cut,'pending');
 assert.equal(line.pending,'effect-discard');
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
 const loaded=chooseAiV3Action(packs,pending,{...MATCH_LIMITS,actor:pending.pending.player,ms:1,nodes:4});
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
