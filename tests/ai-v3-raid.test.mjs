import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace,MATCH_LIMITS,comparedLines} from '../dist/universal-v2/ai-v3/search.mjs';
import {explainValue} from '../dist/universal-v2/ai-v3/eval.mjs';
import {scoreLine} from '../dist/universal-v2/ai-v3/beam.mjs';

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
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function place(state,player,card,line,slot,ready=true){
 card.ready=ready;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
}
function main(pack,counts,rules={}){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0,...rules});
 while(state.phase!=='main'&&state.status==='playing'){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 return {packs,state};
}
function identity(action){
 return [action?.type||'',action?.uid??'',action?.line??'',action?.baseUid??'',action?.mode??''].join('|');
}
const bleach=officialV2Pack('bleach');
const counts=deck(bleach,{'BLC-1-042':4,'BLC-1-043':4,'BLC-1-051':2,'BLC-1-053':2});

function readyAp(state,n){
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<n;});
}
function ask(packs,state){
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor:0,seed:1,ms:1e9,nodes:48,hardNodes:0});
 return {action,trace:lastAiV3Trace()};
}

test('raid: a full rested front still executes the raid and keeps the higher finished line',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0,false);
 for(let slot=1;slot<4;slot++)place(state,0,take(state,0,'BLC-1-043'),'front',slot,false);
 const core=take(state,0,'BLC-1-053');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(core);
 readyAp(state,1);
 while(state.players[1].life.length>1)state.players[1].deck.push(state.players[1].life.pop());
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 const legal=legalUniversalActions(packs,state);
 const raid=legal.find(action=>action.type==='raid'&&action.uid===core.uid&&action.baseUid===base.uid);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.ok(raid);
 const frontPlays=legal.filter(action=>action.type==='play'&&action.line==='front');
 // A full rested front still accepts this card as a normal play, so the raid
 // is not the only legal way to develop. Execute the raid, then keep the
 // higher finished line instead of forcing the raid.
 assert.equal(legal.some(action=>action.type==='attack'),false);
 const {action,trace}=ask(packs,state);
 const row=(trace.compared||[]).find(item=>item.action?.type==='raid'&&item.action?.uid===core.uid&&item.action?.baseUid===base.uid);
 assert.ok(row,JSON.stringify(trace.rootPlan));
 assert.equal(row.executed,true);
 assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 const matched=(trace.compared||[]).filter(item=>item.boundary==='returned'||item.boundary==='terminal');
 if(matched.length){
  const best=matched.reduce((left,right)=>left.search>=right.search?left:right);
  assert.equal(identity(action),identity(best.action));
 }
 console.log('raid full',identity(action),row.search,row.boundary,'frontPlays',frontPlays.length,explainValue(packs,state,0));
});

test('raid: an open front slot is not forced into the raid',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0,true);
 const core=take(state,0,'BLC-1-053');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(core);
 readyAp(state,2);
 const legal=legalUniversalActions(packs,state);
 const raid=legal.find(action=>action.type==='raid'&&action.uid===core.uid);
 const play=legal.find(action=>action.type==='play'&&action.uid===core.uid&&action.line==='front');
 assert.ok(raid&&play);
 const {action,trace}=ask(packs,state);
 const raidRow=trace.compared.find(item=>item.action?.type==='raid'&&item.action?.uid===core.uid);
 const playRow=trace.compared.find(item=>item.action?.type==='play'&&item.action?.uid===core.uid&&item.action?.line==='front');
 assert.equal(raidRow?.executed,true);
 assert.equal(playRow?.executed,true);
 const chosen=trace.compared.find(item=>item.action&&item.action.type===action.type&&item.action.uid===action.uid&&(item.action.line||null)===(action.line||null));
 assert.ok(chosen);
 if(playRow.boundary==='returned'&&raidRow.boundary==='returned'){
  assert.ok(chosen.search>=raidRow.search);
  assert.ok(chosen.search>=playRow.search);
  if(playRow.search>raidRow.search)assert.equal(identity(action),identity(play));
 }
 const before=explainValue(packs,state,0);
 console.log('raid open',identity(action),'raid',raidRow.search,raidRow.boundary,'play',playRow.search,playRow.boundary,'handRaid',before.handRaid,'board',before.board);
});

test('raid: no ready AP means the raid is not a legal action',()=>{
 const {packs,state}=main(bleach,counts);
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0,true);
 const core=take(state,0,'BLC-1-053');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(core);
 readyAp(state,0);
 const legal=legalUniversalActions(packs,state);
 assert.equal(legal.some(action=>action.type==='raid'),false);
 const {action}=ask(packs,state);
 assert.notEqual(action.type,'raid');
 assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 console.log('raid no ap',identity(action));
});

test('raid: the only saving block is not spent on a raid',()=>{
 const packs=[bleach,bleach];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:1});
 while(state.phase!=='attack')state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 const blocker=take(state,0,'BLC-1-051');
 const attacker=take(state,1,'BLC-1-043');
 const core=take(state,0,'BLC-1-053');
 place(state,0,blocker,'front',0,true);
 place(state,1,attacker,'front',0,true);
 state.players[0].hand.push(core);
 while(state.players[0].life.length>1)state.players[0].deck.push(state.players[0].life.pop());
 for(let slot=1;slot<4;slot++)for(const seat of [0,1])if(state.players[seat].front[slot]){
  state.players[seat].deck.push(state.players[seat].front[slot]);
  state.players[seat].front[slot]=null;
 }
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack'&&action.uid===attacker.uid);
 const pending=dispatchUniversalAction(packs,state,swing,{actor:1});
 assert.equal(pending.pending.kind,'block');
 const legal=legalUniversalActions(packs,pending);
 assert.equal(legal.some(action=>action.type==='raid'),false);
 const block=legal.find(action=>action.type==='chooseBlock'&&action.uid===blocker.uid);
 assert.ok(block);
 const {action}=ask(packs,pending);
 assert.equal(identity(action),identity(block));
 console.log('raid block',identity(action));
});

function restedLethal(chooses,lifeIds){
 const {packs,state}=main(bleach,counts,{attackerChoosesLife:chooses});
 for(let slot=0;slot<4;slot++)place(state,0,take(state,0,'BLC-1-042'),'energy',slot);
 const base=take(state,0,'BLC-1-051');
 place(state,0,base,'front',0,false);
 for(let slot=1;slot<4;slot++)place(state,0,take(state,0,'BLC-1-043'),'front',slot,false);
 const core=take(state,0,'BLC-1-053');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(core);
 readyAp(state,1);
 while(state.players[1].life.length)state.players[1].deck.push(state.players[1].life.pop());
 for(const id of lifeIds)state.players[1].life.push(take(state,1,id));
 for(let slot=0;slot<4;slot++)if(state.players[1].front[slot]){
  state.players[1].deck.push(state.players[1].front[slot]);
  state.players[1].front[slot]=null;
 }
 return {packs,state,core,base};
}
function basicLine(packs,state,action,nodes){
 const pool={n:nodes};
 return scoreLine(packs,state,0,action,{
  nodes,pool,beam:4,deadline:Infinity,now:()=>0,actorDecisions:2,opponentDecisions:2,plan:'tree',pass:'basic'
 });
}
function lifeStep(line){
 return (line?.sequence||[]).find(step=>step.type==='chooseAttackLife');
}
function pct(values,p){
 const sorted=[...values].sort((a,b)=>a-b);
 return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))];
}

test('raid: official life choice still finishes the rested lethal',()=>{
 assert.equal(bleach.cards['BLC-1-042'].trigger,null);
 const raidOf=(packs,state,core,base)=>legalUniversalActions(packs,state).find(action=>action.type==='raid'&&action.uid===core.uid&&action.baseUid===base.uid);
 const off=restedLethal(false,['BLC-1-042']);
 const on=restedLethal(true,['BLC-1-042']);
 assert.equal(assertUniversalMatch(off.packs,off.state),true);
 assert.equal(assertUniversalMatch(on.packs,on.state),true);
 assert.equal(off.state.players[1].life[0].cardId,'BLC-1-042');
 assert.equal(on.state.players[1].life[0].cardId,'BLC-1-042');
 const offRaid=raidOf(off.packs,off.state,off.core,off.base);
 const onRaid=raidOf(on.packs,on.state,on.core,on.base);
 assert.ok(offRaid&&onRaid);
 const offAsk=ask(off.packs,off.state);
 const onAsk=ask(on.packs,on.state);
 assert.equal(identity(offAsk.action),identity(offRaid));
 assert.equal(identity(onAsk.action),identity(onRaid));
 const offRow=offAsk.trace.compared.find(row=>identity(row.action)===identity(offRaid));
 const onRow=onAsk.trace.compared.find(row=>identity(row.action)===identity(onRaid));
 assert.equal(offRow.boundary,'terminal');
 assert.equal(offRow.search,100000);
 assert.equal(onRow.boundary,'terminal');
 assert.equal(onRow.search,100000);
 assert.equal(onRow.damageOpen,false);
 assert.equal(onRow.settled,true);
 const finished=basicLine(on.packs,on.state,onRaid,1000);
 assert.equal(finished.search,100000);
 assert.equal(finished.boundary,'terminal');
 assert.equal(finished.damageOpen,false);
 assert.equal(finished.stopReason,null);
 assert.ok(finished.nodes>6);
 assert.deepEqual(lifeStep(finished).indices,[0]);
 const starved=basicLine(on.packs,on.state,onRaid,6);
 assert.equal(starved.damageOpen,true);
 assert.equal(starved.settled,false);
 assert.equal(starved.stopPending,'attack-life-target');
 assert.equal(starved.stopPlayer,0);
 assert.equal(starved.stopReason,'nodes');
 assert.notEqual(starved.search,100000);
 assert.equal(lifeStep(starved),undefined);
 const samples=[];
 let overSoft=0;
 let lastTrace=null;
 for(let i=0;i<7;i++){
  resetAiV3Report();
  const started=performance.now();
  const action=chooseAiV3Action(on.packs,on.state,{...MATCH_LIMITS,actor:0,seed:1,ms:40,nodes:48,hardNodes:0});
  samples.push(performance.now()-started);
  const trace=lastAiV3Trace();
  lastTrace=trace;
  if(trace.overSoft)overSoft++;
  assert.equal(trace.softMs,40);
  assert.equal(identity(action),identity(onRaid));
  assert.ok(trace.reason==='search'||trace.reason==='budget');
  const row=trace.compared.find(item=>identity(item.action)===identity(onRaid));
  assert.equal(row.boundary,'terminal');
  assert.equal(row.search,100000);
  assert.equal(row.damageOpen,false);
  assert.ok(trace.nodesUsed<=48);
 }
 const p50=pct(samples,0.5),p95=pct(samples,0.95),max=Math.max(...samples);
 // 40ms is the soft deadline. 500ms is only the hang cap.
 assert.ok(max<500,`hang cap exceeded p50 ${p50} p95 ${p95} max ${max}`);
 console.log('raid life',identity(onAsk.action),'basic',finished.nodes,finished.search,'starved',starved.stopReason,starved.nodes,
  '40ms',{soft:40,p50:Number(p50.toFixed(1)),p95:Number(p95.toFixed(1)),max:Number(max.toFixed(1)),overSoft,reason:lastTrace.reason});
});

test('raid: life order does not follow a hidden trigger',()=>{
 const first=restedLethal(true,['BLC-1-051','BLC-1-042']);
 const second=restedLethal(true,['BLC-1-042','BLC-1-051']);
 const lineOf=row=>{
  const raid=legalUniversalActions(row.packs,row.state).find(action=>action.type==='raid'&&action.uid===row.core.uid&&action.baseUid===row.base.uid);
  return lifeStep(basicLine(row.packs,row.state,raid,1000));
 };
 const left=lineOf(first);
 const right=lineOf(second);
 assert.deepEqual(left.indices,[0]);
 assert.deepEqual(right.indices,[0]);
 assert.equal(bleach.cards[first.state.players[1].life[0].cardId].trigger,'draw');
 assert.equal(bleach.cards[second.state.players[1].life[0].cardId].trigger,null);
 console.log('raid life indices',left.indices,right.indices);
});
