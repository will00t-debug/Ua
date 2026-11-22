#!/usr/bin/env node
// v3.2 offline Q-distillation restricted to voluntary main/attack choices.
// Training uses a distinct seed split; zero direct outcome-to-action credit.
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {cloneModel,loadModel,saveModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {trainingLabel} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {learnFromQPreferences} from '../dist/universal-v2/white-sword-ai/v31-q-learning.mjs';
import {V32_CONFIG,v32TrainCases,V32_TRAIN_SEEDS,V32_EVAL_SEEDS} from '../dist/universal-v2/white-sword-ai/v32-protocol.mjs';

const mode=process.argv[2]||'smoke';
if(!['smoke','train'].includes(mode))throw Error('Expected smoke or train');
const base=loadModel('training/white-sword-ai/weights/v2-capped.json');
if(base.version!=='white-sword-specialist-v2-capped'||base.hardCap!==7)
 throw Error('v2 capped incumbent is mandatory');
const cases=v32TrainCases({smoke:mode==='smoke'});
const concurrency=Math.max(1,Math.min(3,Number(process.env.WS_WORKERS||availableParallelism()-1||1)));
const origin=performance.now();
const specs=cases.map(row=>{
 const seats=[];
 seats[row.specialistSeat]={
  deckId:'white-sword',policy:'white-sword',model:base,
  mode:'blend',hardCap:V32_CONFIG.hardCap,scale:V32_CONFIG.scale,explore:0
 };
 seats[1-row.specialistSeat]={deckId:row.opponentDeck,policy:'hard-search-2'};
 return {seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:row.opponentDeck,label:'v31-q-train',
  keepSamples:true,recordQPreferences:true,recordQScope:'voluntary',recordSeat:row.specialistSeat,
  recordBlendOutcome:false,keepActions:false,seats};
});
function runAll(specs){
 return new Promise((resolve,reject)=>{
  let next=0,done=0,closed=false;
  const out=Array(specs.length),workers=[];
  const fail=error=>{
   if(closed)return;
   closed=true;for(const worker of workers)void worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  function assign(worker,index){
   const receive=message=>{
    worker.off('message',receive);
    if(!message?.ok)return fail(message?.error||'worker error');
    out[index]=message.game;
    done++;
    if(done%12===0||done===specs.length)console.log('Q training games '+done+'/'+specs.length);
    if(next<specs.length)assign(worker,next++);
    else if(done===specs.length&&!closed){
     closed=true;for(const w of workers)void w.terminate();resolve(out);
    }
   };
   worker.on('message',receive);worker.postMessage(specs[index]);
  }
  for(let i=0;i<Math.min(concurrency,specs.length);i++){
   const w=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   w.on('error',fail);workers.push(w);assign(w,next++);
  }
 });
}
const games=await runAll(specs);
const invalid=games.filter(game=>!trainingLabel(game).usable);
if(invalid.length)throw Error('Rejected Q games: '+JSON.stringify(invalid.slice(0,3).map(g=>({
 seed:g.seed,status:g.status,error:g.error,anomalies:g.anomalies
}))));
const samples=games.flatMap(game=>game.samples.filter(s=>s.kind==='q-preference'));
if(samples.length< (mode==='smoke'?2:80))throw Error('Insufficient measured counterfactual Q pairs '+samples.length);
const actions=Object.create(null);
for(const s of samples)actions[s.actionType]=(actions[s.actionType]||0)+1;
const model=cloneModel(base);
model.version='white-sword-v3.2-q-voluntary-experimental';
model.promoted=false;model.promotion=null;
const learning=learnFromQPreferences(model,samples,base,V32_CONFIG);
if(learning.updates<1||learning.policyL2<=0)throw Error('No effective Q training updates');
model.training={method:'measured-actor-visible-root-Q-pairs-voluntary-only',smoke:mode==='smoke',
  seedStart:cases[0].seed,seedEnd:cases.at(-1).seed,
  pairSamples:samples.length,updates:learning.updates,config:V32_CONFIG};
const path='training/white-sword-ai/weights/v32-'+(mode==='smoke'?'smoke':'q-distilled')+'-provisional.json';
saveModel(model,path);
const report={
 mode,version:model.version,trainingSeeds:mode==='smoke'?[V32_TRAIN_SEEDS[0]]:V32_TRAIN_SEEDS,
 heldoutSeedsReserved:V32_EVAL_SEEDS,trainingGames:games.length,
 noLeakOrFallback:true,measuredQPairs:samples.length,
 actionKinds:actions,learning,elapsedMs:performance.now()-origin,
 warning:'Q scores are visible-state heuristic rollouts, not perfect ground-truth outcomes. No game winner is used as a Q label.'
};
const root='docs/white-sword-ai/v32';
mkdirSync(root,{recursive:true});
writeFileSync(root+'/'+mode.toUpperCase()+'.json',JSON.stringify(report,null,2)+'\n');
console.log('V32_TRAIN_RESULT',JSON.stringify({mode,path,trainingGames:games.length,
 measuredQPairs:samples.length,actionKinds:actions,learning,elapsedMs:report.elapsedMs},null,2));
