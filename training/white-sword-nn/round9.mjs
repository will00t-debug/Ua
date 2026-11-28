// Round 9 only replays games that round 8 already stored. It does not train
// and it does not add a confirmation sample.
import {ROUND8_CANDIDATE_HASH,ROUND8_CANDIDATE_UPDATES,ROUND8_CANDIDATE_VERSION,ROUND7_BASELINE_HASH} from './constants.mjs';
import {classifyStop,compactAction,positionSlice} from './loop.mjs';

export const ROUND9_CANDIDATE_FILE='training/white-sword-nn/weights/round6/line-2/actor-after-96.json';
export const ROUND9_BASELINE_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
export const ROUND9_V2_FILE='training/white-sword-ai/weights/v2-capped.json';
export const ROUND9_CANDIDATE_HASH=ROUND8_CANDIDATE_HASH;
export const ROUND9_CANDIDATE_VERSION=ROUND8_CANDIDATE_VERSION;
export const ROUND9_CANDIDATE_UPDATES=ROUND8_CANDIDATE_UPDATES;
export const ROUND9_BASELINE_HASH=ROUND7_BASELINE_HASH;
export const ROUND9_CELLS=Object.freeze([
 Object.freeze({learnerSeat:0,first:0}),
 Object.freeze({learnerSeat:0,first:1}),
 Object.freeze({learnerSeat:1,first:0}),
 Object.freeze({learnerSeat:1,first:1})
]);
export const ROUND9_LOOPS=Object.freeze([
 Object.freeze({seed:193502,learnerSeat:1,first:0,deck:'renruki',steps:195}),
 Object.freeze({seed:193504,learnerSeat:1,first:1,deck:'renruki',steps:168})
]);

export function selectLosses(schedule,games){
 const direct=(schedule||[]).filter(row=>row.comparison==='direct'&&row.model==='candidate');
 const played=new Map((games||[]).filter(game=>game.comparison==='direct').map(game=>[
  [game.seed,game.learnerSeat,game.first].join(':'),game
 ]));
 return ROUND9_CELLS.map(cell=>{
  const losses=[];
  for(const row of direct){
   if(row.learnerSeat!==cell.learnerSeat||row.first!==cell.first)continue;
   const game=played.get([row.seed,row.learnerSeat,row.first].join(':'));
   const loss=!!game&&game.status==='finished'&&(game.winner===0||game.winner===1)&&game.winner!==game.learnerSeat;
   if(!loss)continue;
   losses.push({
    seed:row.seed,learnerSeat:row.learnerSeat,first:row.first,
    winner:game.winner,steps:game.steps,deck:row.deck
   });
   if(losses.length===2)break;
  }
  return {learnerSeat:cell.learnerSeat,first:cell.first,losses};
 });
}
function shorten(value){
 const text=JSON.stringify(value);
 if(text==null)return null;
 return text.length>240?text.slice(0,240)+'…':JSON.parse(text);
}
export function loopReport(spec,game,steps){
 const verdict=classifyStop(steps);
 const runStart=steps.length-verdict.visits;
 const run=steps.slice(Math.max(0,runStart));
 return {
  seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,deck:spec.deck,
  expectedSteps:spec.steps,
  replay:{
   status:game.status,winner:game.winner,endReason:game.endReason,error:game.error,
   steps:game.steps,anomalies:game.anomalies,policies:game.policies
  },
  matched:game.endReason==='dead-loop'&&game.steps===spec.steps,
  verdict:verdict.kind,
  visits:verdict.visits,
  uniqueActions:verdict.uniqueActions,
  sameAction:verdict.sameAction,
  actions:verdict.actions,
  diffs:verdict.diffs.map(row=>({
   from:row.from,to:row.to,paths:row.paths,counterOnly:row.counterOnly,
   sample:row.sample.map(item=>({path:item.path,before:shorten(item.before),after:shorten(item.after)}))
  })),
  window:run.map(row=>({
   step:row.step,actor:row.actor,repeats:row.repeats,loopKey:row.loopKey,
   positionKey:row.positionKey,action:row.action,source:row.source,
   pending:row.slice?.pending||null,
   queue:row.slice?.queue||null,
   legal:row.legal
  }))
 };
}
export function agreementClass(left,right,official,same){
 const ab=same(left,right);
 const av=same(left,official);
 const bv=same(right,official);
 if(ab&&av)return 'all-same';
 if(ab)return 'ab-same-v2-diff';
 if(av)return 'av2-same-b-diff';
 if(bv)return 'bv2-same-a-diff';
 return 'all-diff';
}
export function observeLoop(positionKey){
 const steps=[];
 return {
  steps,
  observe(event){
   if(event.when==='choice'){
    const row=steps[steps.length-1];
    if(row&&row.step===event.step&&row.action==null){
     row.action=compactAction(event.action);
     row.source=event.source;
     row.reason=event.reason;
    }
    return;
   }
   steps.push({
    step:event.step,actor:event.actor,repeats:event.repeats,loopKey:event.loopKey,
    positionKey:positionKey(event.state),
    action:null,source:null,reason:null,
    legal:(event.legal||[]).map(compactAction),
    history:(event.history||[]).slice(-8),
    slice:positionSlice(event.state)
   });
  }
 };
}
