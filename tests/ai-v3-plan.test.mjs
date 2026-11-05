import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace} from '../dist/universal-v2/ai-v3/search.mjs';

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
function ask(plan,nodes,ms){
 const {packs,state,base,core}=position();
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{
  actor:0,seed:1,nodes,ms,beam:4,actorDecisions:6,opponentDecisions:1,worlds:1,plan
 });
 const trace=lastAiV3Trace();
 return {action,trace,base,core,legal:legalUniversalActions(packs,state)};
}
function kinds(trace){
 return (trace.sequence||[]).map(step=>step.kind+':'+step.type);
}

test('practical rollout records a root and does not open a later choice',()=>{
 const {action,trace,legal}=ask('rollout',200,300);
 assert.equal(legal.some(item=>JSON.stringify(item)===JSON.stringify(action)),true);
 assert.ok(trace.roots>=2);
 assert.equal(trace.followBranches,0);
 assert.equal(trace.maxDepth,1);
 assert.equal(kinds(trace).some(step=>step.startsWith('choice:')),false);
 assert.equal(typeof trace.nodesUsed,'number');
 assert.equal(typeof trace.responses,'number');
 console.log('plan rollout',action.type,trace.roots,trace.followBranches,trace.maxDepth,trace.responses,trace.nodesUsed,kinds(trace).join(' '));
});

test('practical tree search records the play then the raid, and a larger budget opens more choices',()=>{
 const tight=ask('tree',24,40);
 const wide=ask('tree',80,300);
 assert.equal(tight.trace.followBranches<wide.trace.followBranches,true);
 assert.ok(wide.trace.maxDepth>=2);
 assert.ok(wide.trace.followBranches>tight.trace.followBranches);
 const steps=kinds(wide.trace);
 assert.equal(steps[0],'root:play');
 assert.equal(steps.includes('choice:raid'),true);
 assert.equal(steps.includes('choice:chooseDiscard'),true);
 assert.equal(wide.action.type,'play');
 assert.equal(wide.action.uid,wide.base.uid);
 assert.notEqual(steps.filter(step=>step==='choice:raid').length,0);
 assert.ok(steps.indexOf('choice:raid')>0);
 assert.equal(wide.legal.some(item=>JSON.stringify(item)===JSON.stringify(wide.action)),true);
 const replies=ask('tree-replies',80,300);
 assert.equal(kinds(replies.trace).includes('choice:raid'),true);
 assert.equal(kinds(replies.trace).some(step=>step.startsWith('reply:')),true);
 console.log('plan tree',tight.trace.followBranches,wide.trace.followBranches,wide.trace.maxDepth,wide.trace.responses,wide.trace.nodesUsed,steps.join(' '));
 console.log('plan replies',replies.trace.followBranches,replies.trace.maxDepth,replies.trace.responses,kinds(replies.trace).join(' '));
});
