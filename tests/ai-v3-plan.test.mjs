import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';
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
function position(){
 const pack=officialV2Pack('bleach');
 const counts=deck(pack,{'BLC-1-042':4,'BLC-1-051':2,'BLC-1-053':2});
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0});
 while(state.phase!=='main')state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 for(let slot=0;slot<4;slot++){
  const energy=take(state,0,'BLC-1-042');
  place(state,0,energy,'energy',slot);
  energy.ready=false;
 }
 const base=take(state,0,'BLC-1-051');
 const core=take(state,0,'BLC-1-053');
 for(const card of [...state.players[0].hand])state.players[0].deck.push(card);
 state.players[0].hand.length=0;
 state.players[0].hand.push(base,core);
 state.players[0].apCards.forEach((card,index)=>{card.inPlay=true;card.ready=index<2;});
 assert.equal(assertUniversalMatch(packs,state),true);
 const raidNow=legalUniversalActions(packs,state).some(action=>action.type==='raid');
 assert.equal(raidNow,false);
 return {packs,state,base,core};
}
function ask(plan,nodes){
 const {packs,state,base,core}=position();
 resetAiV3Report();
 // Fixed nodes and no clock. A parallel run must not decide whether the combo is found.
 const action=chooseAiV3Action(packs,state,{
  actor:0,seed:1,nodes,ms:1e9,beam:4,opponentDecisions:1,worlds:1,plan
 });
 const trace=lastAiV3Trace();
 return {action,trace,base,core,packs,state,legal:legalUniversalActions(packs,state)};
}
function kinds(trace){
 return (trace.sequence||[]).map(step=>step.kind+':'+step.type);
}
function bodies(pack){
 return Object.values(pack.cards).filter(card=>card.type==='character'&&card.bp>0&&
  !card.mustBlock&&!card.blockEnergyMin&&!card.raidName&&!card.sniper);
}
function blockPosition(attackerSeat){
 const pack=officialV2Pack('bleach');
 const list=bodies(pack).sort((a,b)=>a.bp-b.bp||a.id.localeCompare(b.id));
 const attackerCard=list.find(card=>card.bp>=1000&&card.bp<=2000);
 const blockerCard=list.find(card=>card.bp>attackerCard.bp);
 const defender=1-attackerSeat;
 const counts=deck(pack,{[attackerCard.id]:2,[blockerCard.id]:2});
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:attackerSeat});
 while(state.phase!=='attack'||state.active!==attackerSeat){
  const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
  if(!next)break;
  state=dispatchUniversalAction(packs,state,next);
 }
 const atk=take(state,attackerSeat,attackerCard.id);
 const blk=take(state,defender,blockerCard.id);
 for(const seat of [0,1])for(let slot=0;slot<4;slot++){
  const card=state.players[seat].front[slot];
  if(card){state.players[seat].deck.push(card);state.players[seat].front[slot]=null;}
 }
 place(state,attackerSeat,atk,'front',0);
 place(state,defender,blk,'front',0);
 while(state.players[defender].life.length>1)state.players[defender].deck.push(state.players[defender].life.pop());
 const quiet=state.players[defender].deck.findIndex(card=>!pack.cards[card.cardId]?.trigger);
 if(quiet>=0&&pack.cards[state.players[defender].life[0]?.cardId]?.trigger){
  const swap=state.players[defender].deck.splice(quiet,1)[0];
  state.players[defender].deck.push(state.players[defender].life[0]);
  state.players[defender].life[0]=swap;
 }
 assert.equal(assertUniversalMatch(packs,state),true);
 const swing=legalUniversalActions(packs,state).find(action=>action.type==='attack');
 const pending=dispatchUniversalAction(packs,state,swing,{actor:attackerSeat});
 const options=legalUniversalActions(packs,pending);
 const pass=options.find(action=>action.type==='chooseBlock'&&action.uid==null);
 const hold=options.find(action=>action.type==='chooseBlock'&&action.uid);
 assert.ok(pass&&hold);
 const walked=action=>{
  let cursor=dispatchUniversalAction(packs,pending,action,{actor:defender});
  for(let guard=0;guard<8&&cursor.status==='playing'&&cursor.pending;guard++){
   const actor=cursor.pending.player??cursor.active;
   const step=legalUniversalActions(packs,cursor).find(item=>item.uid==null)||legalUniversalActions(packs,cursor)[0];
   cursor=dispatchUniversalAction(packs,cursor,step,{actor});
  }
  return cursor;
 };
 const passed=walked(pass);
 const held=walked(hold);
 assert.equal(passed.status,'finished');
 assert.equal(passed.winner,attackerSeat);
 assert.equal(held.status,'playing');
 assert.equal(held.players[defender].life.length,1);
 return {packs,state,attackerSeat};
}
test('practical rollout records a root and does not open a later choice',()=>{
 const {action,trace,legal}=ask('rollout',200);
 assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.ok(trace.roots>=2);
 assert.equal(trace.followBranches,0);
 assert.equal(trace.maxDepth,1);
 assert.equal(kinds(trace).some(step=>step.startsWith('choice:')),false);
 assert.equal(typeof trace.nodesUsed,'number');
 assert.equal(typeof trace.responses,'number');
 console.log('plan rollout',action.type,trace.roots,trace.followBranches,trace.maxDepth,trace.responses,trace.nodesUsed,kinds(trace).join(' '));
});

test('practical tree search records the play, raid, effect choice, and attack at the match depth',()=>{
 const tight=ask('tree',80);
 const wide=ask('tree',960);
 assert.ok(wide.trace.maxDepth>tight.trace.maxDepth);
 assert.ok(wide.trace.followBranches>tight.trace.followBranches);
 const steps=kinds(wide.trace);
 assert.equal(steps[0],'root:play');
 assert.equal(steps.includes('choice:raid'),true);
 assert.equal(steps.includes('choice:chooseDiscard'),true);
 assert.equal(steps.some(step=>step.endsWith(':attack')),true);
 assert.ok(steps.indexOf('choice:raid')>steps.indexOf('root:play'));
 assert.ok(steps.findIndex(step=>step.endsWith(':chooseDiscard'))>steps.indexOf('choice:raid'));
 assert.ok(steps.findIndex(step=>step.endsWith(':attack'))>steps.findIndex(step=>step.endsWith(':chooseDiscard')));
 assert.equal(wide.action.type,'play');
 assert.equal(wide.action.uid,wide.base.uid);
 assert.notEqual(wide.trace.score,100000);
 assert.equal(wide.legal.some(item=>JSON.stringify(item)===JSON.stringify(wide.action)),true);
 const replies=ask('tree-replies',80);
 assert.equal(kinds(replies.trace).includes('choice:raid'),true);
 assert.equal(kinds(replies.trace).some(step=>step.startsWith('reply:')),true);
 console.log('plan tree',tight.trace.followBranches,wide.trace.followBranches,tight.trace.maxDepth,wide.trace.maxDepth,steps.join(' '));
 console.log('plan replies',replies.trace.followBranches,replies.trace.maxDepth,kinds(replies.trace).join(' '));
});

test('a short node budget stays legal and does not invent a win',()=>{
 const thin=ask('tree',24);
 assert.equal(thin.legal.some(item=>JSON.stringify(item)===JSON.stringify(thin.action)),true);
 assert.equal(thin.trace.reason,'budget-fallback');
 assert.equal(thin.trace.incomplete,true);
 assert.notEqual(thin.trace.score,100000);
 console.log('plan thin',thin.action.type,thin.trace.reason);
});

test('node, time, and depth limits stay distinct',()=>{
 const {packs,state}=position();
 const next=legalUniversalActions(packs,state).find(action=>action.type==='next');
 const play=legalUniversalActions(packs,state).find(action=>action.type==='play');
 const nodes=scoreLine(packs,state,0,next,{nodes:1,deadline:Infinity,actorDecisions:2,plan:'tree',beam:4,opponentDecisions:2});
 assert.equal(nodes.limit,'nodes');
 assert.equal(nodes.cut,'nodes');
 assert.equal(nodes.depthHit,false);
 assert.equal(nodes.settled,false);
 const time=scoreLine(packs,state,0,next,{nodes:80,deadline:performance.now()-1,actorDecisions:2,plan:'tree',beam:4,opponentDecisions:2});
 assert.equal(time.limit,'time');
 assert.equal(time.cut,'time');
 assert.equal(time.settled,false);
 const depth=scoreLine(packs,state,0,play,{nodes:80,deadline:Infinity,actorDecisions:0,plan:'tree',beam:4,opponentDecisions:2});
 assert.equal(depth.limit,'depth');
 assert.equal(depth.depthHit,true);
 assert.equal(depth.settled,true);
 assert.equal(depth.cut,null);
 assert.equal(depth.boundary,'returned');
 const thin=scoreLine(packs,state,0,play,{nodes:4,deadline:Infinity,actorDecisions:0,plan:'tree',beam:4,opponentDecisions:2});
 assert.equal(thin.limit,'depth');
 assert.equal(thin.cut,'nodes');
 assert.equal(thin.settled,false);
 assert.notEqual(thin.search,100000);
 console.log('plan limits',nodes.cut,time.cut,depth.limit,thin.cut);
});

test('a block the opponent can survive is not scored as our win',()=>{
 for(const seat of [0,1]){
  const row=blockPosition(seat);
  for(const plan of ['tree','tree-replies']){
   resetAiV3Report();
   const action=chooseAiV3Action(row.packs,row.state,{
    actor:seat,seed:1,nodes:180,ms:1e9,beam:4,opponentDecisions:2,worlds:1,plan
   });
   const legal=legalUniversalActions(row.packs,row.state);
   assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
   const trace=lastAiV3Trace();
   const attack=(trace.compared||[]).find(item=>item.action?.type==='attack');
   assert.ok(attack,plan+' seat '+seat);
   assert.notEqual(attack.search,100000);
   assert.notEqual(attack.boundary,'terminal');
   const blocked=(attack.sequence||[]).find(step=>step.type==='chooseBlock'&&step.uid);
   assert.ok(blocked,plan+' seat '+seat);
   assert.notEqual(trace.score,100000);
   console.log('plan block',plan,seat,attack.search,attack.boundary,blocked.kind);
  }
 }
});
