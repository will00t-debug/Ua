import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseAiV3Action,resetAiV3Report,lastAiV3Trace,aiV3Report,MATCH_LIMITS} from '../dist/universal-v2/ai-v3/search.mjs';

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
function main(pack,counts){
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[counts,counts],seed:7,first:0});
 while(state.phase!=='main'&&state.status==='playing'){
  state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(action=>action.type==='next'));
 }
 return {packs,state};
}
function same(a,b){
 return !!a&&!!b&&a.type===b.type&&(a.uid??null)===(b.uid??null)&&(a.line??null)===(b.line??null)&&(a.mode??null)===(b.mode??null);
}
function identity(action){
 return [action?.type||'',action?.uid??'',action?.line??'',action?.mode??''].join('|');
}
const bleach=officialV2Pack('bleach');
const counts=deck(bleach,{'BLC-1-042':4,'BLC-1-043':2,'BLC-1-045':2,'BLC-1-051':2,'BLC-1-053':2});

function ask(packs,state,extra){
 resetAiV3Report();
 const action=chooseAiV3Action(packs,state,{...MATCH_LIMITS,actor:0,seed:1,hardNodes:0,...extra});
 return {action,trace:lastAiV3Trace(),report:aiV3Report()};
}

test('coverage: every root gets a basic share before any line is deepened',()=>{
 const {packs,state}=main(bleach,counts);
 assert.equal(assertUniversalMatch(packs,state),true);
 const legal=legalUniversalActions(packs,state);
 const {action,trace}=ask(packs,state,{ms:1e9,nodes:48});
 assert.equal(legal.some(item=>same(item,action)),true);
 assert.ok(trace.coverage.roots>=4,JSON.stringify(trace.rootPlan));
 assert.equal(trace.coverage.executed,trace.coverage.roots);
 assert.equal(trace.coverage.unexecuted,0);
 assert.ok(trace.coverage.basicCap<=8);
 assert.ok(trace.timing.worldMs>=0&&trace.timing.rankMs>=0&&trace.timing.searchMs>=0);
 assert.equal(typeof trace.settled,'boolean');
 const last=trace.rootPlan[trace.rootPlan.length-1];
 const lastRow=(trace.compared||[]).find(item=>same(item.action,last));
 assert.ok(lastRow,identity(last));
 assert.equal(lastRow.executed,true);
 for(const planned of trace.rootPlan){
  const row=(trace.compared||[]).find(item=>same(item.action,planned));
  assert.ok(row,identity(planned));
  assert.equal(row.executed,true);
  assert.equal(identity(row.action),identity(planned));
  assert.ok(row.basicNodes>0&&row.basicNodes<=16);
 }
 assert.ok(trace.basicNodes+trace.deepNodes<=48);
 console.log('coverage all',trace.coverage.roots,'cap',trace.coverage.basicCap,'basic',trace.basicNodes,'deep',trace.deepNodes,'settled',trace.settled);
});

test('coverage: a clock can stop before the first root, after the first, and after the second',()=>{
 const {packs,state}=main(bleach,counts);
 const legal=legalUniversalActions(packs,state);
 let clock=1000;
 const expired=ask(packs,state,{ms:40,nodes:48,now(){const value=clock;clock=5000;return value;}});
 assert.equal(legal.some(item=>same(item,expired.action)),true);
 assert.equal(expired.trace.nodesUsed,0);
 assert.equal(expired.trace.reason,'budget-fallback');
 assert.equal(expired.trace.fallbackKind,'budget');
 assert.equal(expired.trace.coverage.executed,0);
 assert.ok(expired.trace.unexecuted.length>=4);
 assert.ok(expired.trace.unexecuted.every(row=>row.reason==='time'&&row.executed===false));
 assert.ok(expired.trace.unexecuted.every(row=>expired.trace.rootPlan.some(item=>identity(item)===identity(row))));
 assert.equal(expired.report.budgetFallback,1);
 assert.equal(expired.report.fallback,0);

 clock=1000;
 let roots=0;
 const first=ask(packs,state,{
  ms:40,nodes:48,
  now(){return clock;},
  onRootDone(){roots++;if(roots>=1)clock=5000;}
 });
 assert.equal(first.trace.coverage.executed,1);
 assert.equal(identity(first.trace.compared[0].action),identity(first.trace.rootPlan[0]));
 assert.ok(first.trace.unexecuted.length>=1);
 assert.ok(first.trace.unexecuted.every(row=>row.reason==='time'));
 assert.equal(first.trace.fallbackKind,'budget');
 const firstPlanned=first.trace.rootPlan[0];
 assert.equal(identity(first.action)===identity(firstPlanned)||legal.some(item=>same(item,first.action)),true);

 clock=1000;
 roots=0;
 const second=ask(packs,state,{
  ms:40,nodes:48,
  now(){return clock;},
  onRootDone(){roots++;if(roots>=2)clock=5000;}
 });
 assert.equal(second.trace.coverage.executed,2);
 assert.equal(identity(second.trace.compared[0].action),identity(second.trace.rootPlan[0]));
 assert.equal(identity(second.trace.compared[1].action),identity(second.trace.rootPlan[1]));
 assert.ok(second.trace.unexecuted.every(row=>row.reason==='time'&&second.trace.rootPlan.some(item=>identity(item)===identity(row))));
 console.log('coverage clock',expired.action.type,identity(first.trace.rootPlan[0]),identity(second.trace.rootPlan[1]));
});

test('coverage: permuting the root order changes which full action runs under the same cutoff',()=>{
 const {packs,state}=main(bleach,counts);
 const legal=legalUniversalActions(packs,state);
 const play=legal.find(action=>action.type==='play'&&action.uid);
 assert.ok(play);
 let clock=1000;
 let roots=0;
 const leadPlay=ask(packs,state,{
  ms:40,nodes:48,
  rootFirst:[{type:'play',uid:play.uid,line:play.line}],
  now(){return clock;},
  onRootDone(){roots++;if(roots>=1)clock=5000;}
 });
 assert.equal(leadPlay.trace.coverage.executed,1);
 assert.equal(leadPlay.trace.compared[0].action.type,'play');
 assert.equal(leadPlay.trace.compared[0].action.uid,play.uid);
 assert.equal(leadPlay.trace.compared[0].action.line,play.line);
 clock=1000;
 roots=0;
 const leadNext=ask(packs,state,{
  ms:40,nodes:48,
  rootFirst:[{type:'next'}],
  now(){return clock;},
  onRootDone(){roots++;if(roots>=1)clock=5000;}
 });
 assert.equal(leadNext.trace.coverage.executed,1);
 assert.equal(leadNext.trace.compared[0].action.type,'next');
 assert.notEqual(identity(leadPlay.trace.compared[0].action),identity(leadNext.trace.compared[0].action));
 assert.equal(leadNext.trace.fallbackKind,'budget');
 assert.ok(leadPlay.trace.unexecuted.some(row=>row.type==='next'&&row.reason==='time'));
 console.log('coverage order',identity(leadPlay.trace.compared[0].action),identity(leadNext.trace.compared[0].action));
});

test('coverage: a node pool that cannot share every root records nodes, not time',()=>{
 const {packs,state}=main(bleach,counts);
 const {trace}=ask(packs,state,{ms:1e9,nodes:8});
 assert.ok(trace.coverage.roots>=4);
 assert.ok(trace.coverage.executed<trace.coverage.roots);
 assert.ok(trace.unexecuted.length>0);
 assert.ok(trace.unexecuted.every(row=>row.reason==='nodes'&&row.executed===false));
 assert.equal(trace.coverage.reasons.time||0,0);
 assert.ok(trace.coverage.reasons.nodes>0);
 console.log('coverage nodes',trace.coverage.executed+'/'+trace.coverage.roots,trace.coverage.reasons);
});
