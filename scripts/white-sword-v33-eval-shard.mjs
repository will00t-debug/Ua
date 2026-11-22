#!/usr/bin/env node
// Frozen 30-seed evaluation, 3 independent 10-seed shards.
// Each shard: 120 paired initial conditions x 2 policies + 40 head-to-head.
// Share the same initial seed, deck and seat. Do NOT assume all later LIFE
// triggers stay identical once the policies choose different moves.
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {mkdirSync,writeFileSync} from 'node:fs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V33_CONFIG,V33_EVAL_SEEDS,V33_PILOT_SEEDS,v33EvaluationCases,v33MirrorCases} from '../dist/universal-v2/white-sword-ai/v33-protocol.mjs';

const pilot=process.argv[2]==='pilot';
const shard=pilot?-1:Number(process.argv[2]);
if(!pilot&&(!Number.isInteger(shard)||shard<0||shard>2))
 throw Error('Usage: node scripts/white-sword-v33-eval-shard.mjs pilot|0|1|2');
const seeds=pilot?V33_PILOT_SEEDS:V33_EVAL_SEEDS.slice(shard*10,shard*10+10);
if(seeds.length!==(pilot?4:10))throw Error('Invalid evaluation seed slice');
const incumbent=loadModel('training/white-sword-ai/weights/v2-capped.json');
const challenger=loadModel('training/white-sword-ai/weights/v33-q-distilled-provisional.json');
if(incumbent.version!=='white-sword-specialist-v2-capped'||!challenger.version?.includes('v3.3-q-voluntary'))
 throw Error('Expected frozen v2 and v3.3 weights');
const workers=Math.max(1,Math.min(3,Number(process.env.WS_WORKERS||availableParallelism()-1||1)));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function spec(row,model,{mirror=false}={}){
 const seats=[];
 seats[row.specialistSeat]={deckId:'white-sword',policy:'white-sword',model,
  stageGuard:model===challenger,stageGuardScope:'voluntary',baselineModel:incumbent,
  mode:'blend',scale:V33_CONFIG.scale,hardCap:V33_CONFIG.hardCap,explore:0};
 seats[1-row.specialistSeat]=mirror?
  {deckId:'white-sword',policy:'white-sword',model:incumbent,
   mode:'blend',scale:V33_CONFIG.scale,hardCap:V33_CONFIG.hardCap,explore:0}
  :{deckId:row.opponentDeck,policy:'hard-search-2'};
 return {seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:row.opponentDeck,label:mirror?'v33-direct-v2':'v33-paired',
  keepSamples:false,keepActions:!mirror,trackLife:true,seats};
}
async function runPool(specs,label){
 const output=Array(specs.length),workersList=[];
 let next=0,finished=0,closed=false;
 return new Promise((resolve,reject)=>{
  const fail=err=>{if(closed)return;closed=true;for(const w of workersList)void w.terminate();
   reject(err instanceof Error?err:Error(String(err)));};
  const assign=(worker,index)=>{
   const onMessage=msg=>{
    worker.off('message',onMessage);
    if(!msg?.ok)return fail(msg?.error||'worker failed');
    output[index]=msg.game;finished++;
    if(finished%30===0||finished===specs.length)
     console.log(label+' '+finished+'/'+specs.length);
    if(next<specs.length)assign(worker,next++);
    else if(finished===specs.length&&!closed){
     closed=true;for(const w of workersList)void w.terminate();
     resolve(output);
    }
   };
   worker.on('message',onMessage);worker.postMessage(specs[index]);
  };
  for(let i=0;i<Math.min(workers,specs.length);i++){
   const w=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   w.on('error',fail);workersList.push(w);assign(w,next++);
  }
 });
}
function assertHealthy(games,label){
 const wrong=games.filter(g=>g.status!=='finished'||(g.winner!==0&&g.winner!==1)||
  Object.values(g.anomalies||{}).some(n=>n!==0));
 if(wrong.length)throw Error(label+' unhealthy game(s): '+JSON.stringify(wrong.slice(0,2).map(g=>({
  seed:g.seed,status:g.status,anomalies:g.anomalies,error:g.error
 }))));
}
const rows=v33EvaluationCases(seeds),directRows=v33MirrorCases(seeds);
if(rows.length!==seeds.length*12||directRows.length!==seeds.length*4)
 throw Error('Shard game count mismatch');
const v2=await runPool(rows.map(r=>spec(r,incumbent)),'v2');
assertHealthy(v2,'v2');
const v33=await runPool(rows.map(r=>spec(r,challenger)),'v3.3');
assertHealthy(v33,'v3.3');
const direct=await runPool(directRows.map(r=>spec(r,challenger,{mirror:true})),'direct');
assertHealthy(direct,'direct');
const matched=rows.map((row,i)=>({
 seed:row.seed,first:row.first,seat:row.specialistSeat,deckId:row.opponentDeck,
 v2win:v2[i].winner===row.specialistSeat,v33win:v33[i].winner===row.specialistSeat,
 diverged:!same(v2[i].actions||[],v33[i].actions||[]),
 v2Life:v2[i].lifeStats,v33Life:v33[i].lifeStats,
 v2Counts:v2[i].counts,v33Counts:v33[i].counts,
 v2Timing:v2[i].timing,v33Timing:v33[i].timing
}));
const mirrors=directRows.map((row,i)=>({
 seed:row.seed,first:row.first,seat:row.specialistSeat,
 win:direct[i].winner===row.specialistSeat,life:direct[i].lifeStats,
 timing:direct[i].timing
}));
const path='docs/white-sword-ai/v33/'+(pilot?'pilot':'shard-'+shard)+'.json';
mkdirSync('docs/white-sword-ai/v33',{recursive:true});
const report={
 shard,seedRange:[seeds[0],seeds.at(-1)],matched,mirrors,
 actualGames:v2.length+v33.length+direct.length,
 notes:'Public LIFE reveal metrics recorded only AFTER actions. All candidates share seeded openings, not necessarily identical downstream triggers.'
};
writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log('V33_SHARD_RESULT',JSON.stringify({
 shard,seeds:seeds.length,matched:matched.length,direct:mirrors.length,
 v2Wins:matched.filter(x=>x.v2win).length,
 v33Wins:matched.filter(x=>x.v33win).length,
 headToHeadWins:mirrors.filter(x=>x.win).length,
 differing:matched.filter(x=>x.diverged).length,
 games:report.actualGames,path
},null,2));
