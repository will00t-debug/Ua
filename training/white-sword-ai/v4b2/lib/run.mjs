// Balanced mining, paired values, then at most one trusted step.
// Full-game checks stay unused until a later round asks for them.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {legalUniversalActions} from '../../../../dist/universal-v2/engine.mjs';
import {cloneModel,loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {appendJsonl,readJson,readJsonl,v2Hash,writeJson} from '../../v4a/lib/store.mjs';
import {jobsFor,summarizePosition} from '../../v4b/lib/evaluate.mjs';
import {modelFromPolicy} from '../../v4b/lib/learn.mjs';
import {replayState} from '../../v4b/lib/play.mjs';
import {
 MAX_ROLLOUT_GAMES,MIN_FINISHED_RATE,SAMPLES_FIRST,SAMPLES_MAX,SAMPLE_EXTEND
} from '../../v4b/lib/protocol.mjs';
import {acceptBalanced,cellTable,interleaveSpecs,selectBalanced} from './balance.mjs';
import {chooseUpdate} from './decide.mjs';
import {
 BUDGET_CAP,CODE_VERSION,HARD_CAP,MAX_STEPS,MINE_SEEDS,OFFICIAL_NODES,OPPONENTS,
 PER_CELL_MINE,PER_CELL_SELECT,SCALE,SEEDS_PER_OPPONENT,STEP_CAP,WEIGHT_CLIP,assertRoundPlan
} from './protocol.mjs';
import {cardsOf} from './trust.mjs';
import {renderReport} from './report.mjs';

const PRIOR_SELECTED='training/white-sword-ai/v4b/selected.json';
const PRIOR_JUDGMENTS='training/white-sword-ai/v4b/judgments.json';

function pairRows(position,records){
 const byAttempt=new Map();
 for(const row of records){
  if(row.positionId!==position.id)continue;
  const pair=byAttempt.get(row.attempt)||{};
  pair[row.side]=row;
  byAttempt.set(row.attempt,pair);
 }
 return [...byAttempt.values()].map(pair=>{
  if(!pair.A?.finished||!pair.B?.finished)return {diff:null};
  const aWin=pair.A.winner===position.actor;
  const bWin=pair.B.winner===position.actor;
  return {diff:aWin===bWin?0:(aWin?1:-1)};
 });
}
function finishedRate(rows){
 const groups=new Map();
 for(const row of rows){
  const key=row.positionId+':'+row.attempt;
  const group=groups.get(key)||{A:null,B:null};
  group[row.side]=row;
  groups.set(key,group);
 }
 let done=0;
 for(const group of groups.values())if(group.A?.finished&&group.B?.finished)done++;
 return {pairs:groups.size,finished:done,rate:groups.size?done/groups.size:0};
}
function haveId(records,id){
 return records.some(row=>row.id===id);
}
async function schedule(ready,records,want,rolloutMany,file){
 const jobs=[];
 let spent=records.length;
 for(const row of ready){
  const target=want(row,records);
  for(let attempt=0;attempt<target;attempt++){
   const built=jobsFor(row.position,row.state,attempt,row.position.seed+88000);
   for(const job of built){
    if(haveId(records,job.id)||jobs.some(item=>item.id===job.id))continue;
    if(spent+1>MAX_ROLLOUT_GAMES){
     if(!jobs.length)return records;
     await rolloutMany(jobs,{onGame(row){appendJsonl(file,row);}});
     return readJsonl(file);
    }
    jobs.push(job);
    spent++;
   }
  }
 }
 if(!jobs.length)return records;
 await rolloutMany(jobs,{onGame(row){appendJsonl(file,row);}});
 return readJsonl(file);
}

function preferenceView(row){
 const preferA=row.mean>0;
 const preferred=preferA?row.actionA:row.actionB;
 const other=preferA?row.actionB:row.actionA;
 return {
  id:row.id,bucket:row.bucket,opponent:row.opponent,n:row.n,mean:row.mean,low:row.low,high:row.high,
  preferred:preferred.key,other:other.key,
  preferredCard:cardsOf(preferred.features).join(',')||null,
  otherCard:cardsOf(other.features).join(',')||null
 };
}
function publicUpdate(row){
 if(!row)return null;
 const copy={...row};
 delete copy.policy;
 return copy;
}
function recordSeeds(root,seeds){
 const file=join(root,'seed-ledger.json');
 const ledger=readJson(file,{seeds:[]});
 const known=new Set(ledger.seeds.map(row=>row.seed));
 for(const seed of seeds){
  if(!known.has(seed))ledger.seeds.push({seed,stage:'mine',codeVersion:CODE_VERSION});
 }
 writeJson(file,ledger);
}
function tagged(positions,source){
 return (positions||[]).map(position=>({...position,source}));
}
export async function runV4B2({root,mineMany,rolloutMany,log=()=>{}}={}){
 mkdirSync(root,{recursive:true});
 const official=v2Hash();
 const seeds=Object.values(MINE_SEEDS).flat();
 assertRoundPlan(seeds,'v4b2');
 recordSeeds(root,seeds);
 const parentModel=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const limits={nodes:OFFICIAL_NODES,hardCap:HARD_CAP,clip:WEIGHT_CLIP,stepCap:STEP_CAP,scale:SCALE};
 const report={
  codeVersion:CODE_VERSION,official,limits,preliminaryStrength:false,promoted:false,
  budgetCap:BUDGET_CAP,stopped:null
 };
 const poolFile=join(root,'pool.json');
 const cached=readJson(poolFile);
 let mined;
 const sameSeeds=JSON.stringify(cached?.seeds)===JSON.stringify(seeds);
 if(cached?.positions&&sameSeeds){
  mined=cached;
  log('沿用已挖掘的 '+cached.positions.length+' 個局面');
 }else{
  log('平衡挖掘');
  const specs=interleaveSpecs(MINE_SEEDS);
  const games=(await mineMany(specs.map(spec=>({...spec,maxSteps:MAX_STEPS})))).slice().sort((left,right)=>(left.index??0)-(right.index??0));
  const accepted=acceptBalanced(games,PER_CELL_MINE);
  const decisions=games.reduce((sum,game)=>sum+(game.decisions||0),0);
  mined={
   games:games.length,decisions,stored:accepted.positions.length,counts:accepted.counts,
   table:cellTable(accepted.positions),seeds,positions:accepted.positions,
   played:games.map(game=>({opponent:game.opponent,seed:game.seed,decisions:game.decisions,found:(game.positions||[]).length}))
  };
  writeJson(poolFile,mined);
 }
 report.mined={
  games:mined.games,decisions:mined.decisions,stored:mined.positions.length,
  seedsPerOpponent:SEEDS_PER_OPPONENT,firstSeed:MINE_SEEDS['white-sword'][0],table:cellTable(mined.positions)
 };
 const selected=selectBalanced(mined.positions,{perCell:PER_CELL_SELECT});
 const holdout=mined.positions.filter(position=>!selected.chosen.some(row=>row.id===position.id));
 writeJson(join(root,'selected.json'),{
  counts:selected.counts,opponents:selected.opponents,cells:selected.cells,
  table:cellTable(selected.chosen),positions:selected.chosen
 });
 report.selected={
  n:selected.chosen.length,buckets:selected.buckets,counts:selected.counts,
  opponents:selected.opponents,table:cellTable(selected.chosen)
 };
 if(!selected.chosen.length){
  report.stopped='positions';
  report.stopReasons=['平衡挖掘沒有收錄到帶內局面'];
  return finish(root,report,official);
 }
 const ready=[];
 let dropped=0;
 for(const position of selected.chosen){
  const replay=replayState(position);
  const legal=legalUniversalActions(replay.packs,replay.state);
  const keys=new Set(legal.map(action=>choiceKey(action)));
  if(!keys.has(position.actionA.key)||!keys.has(position.actionB.key)){dropped++;continue;}
  ready.push({position,state:replay.state});
 }
 report.replayable={n:ready.length,dropped};
 if(!ready.length){
  report.stopped='replay';
  report.stopReasons=['可重現的分支局面是 0'];
  return finish(root,report,official);
 }
 log('分支評估 '+ready.length+' 個局面');
 const rolloutFile=join(root,'rollouts.jsonl');
 let records=readJsonl(rolloutFile);
 records=await schedule(ready,records,()=>SAMPLES_FIRST,rolloutMany,rolloutFile);
 const first=finishedRate(records.filter(row=>row.attempt<SAMPLES_FIRST));
 report.rolloutFirst=first;
 if(first.rate<MIN_FINISHED_RATE){
  report.stopped='rollouts';
  report.stopReasons=['第一波分支完成率 '+(first.rate*100).toFixed(1)+'%，低於 '+(MIN_FINISHED_RATE*100)+'%'];
  return finish(root,report,official);
 }
 for(let guard=0;guard<3;guard++){
  const extending=ready.filter(row=>summarizePosition(row.position,pairRows(row.position,records)).extend);
  if(!extending.length||records.length>=MAX_ROLLOUT_GAMES)break;
  log('補抽樣 '+extending.length+' 個局面');
  const before=records.length;
  records=await schedule(extending,records,(row,done)=>{
   const summary=summarizePosition(row.position,pairRows(row.position,done));
   if(!summary.extend)return summary.attempts;
   return Math.min(SAMPLES_MAX,summary.attempts+SAMPLE_EXTEND);
  },rolloutMany,rolloutFile);
  if(records.length===before)break;
 }
 const judged=ready.map(row=>summarizePosition(row.position,pairRows(row.position,records)));
 writeJson(join(root,'judgments.json'),judged);
 const usable=judged.filter(row=>row.usable);
 report.rollouts={
  games:records.length,positions:judged.length,usable:usable.length,
  insufficient:judged.length-usable.length,finishedRate:finishedRate(records).rate
 };
 report.preferences=usable.map(preferenceView);
 const priorPositions=tagged(readJson(PRIOR_SELECTED,{positions:[]}).positions,'prior').filter(position=>position.band);
 const priorJudgments=readJson(PRIOR_JUDGMENTS,[]).map(row=>({...row,source:'prior'}));
 const roundPositions=tagged([...selected.chosen,...holdout],'round');
 const decision=chooseUpdate(parentModel.policy,usable,{
  positions:[...roundPositions,...priorPositions],
  judgments:[...judged,...priorJudgments],
  selectedIds:selected.chosen.map(position=>position.id),
  holdoutIds:holdout.map(position=>position.id)
 });
 report.updates=decision.evaluated.map(publicUpdate);
 writeJson(join(root,'update.json'),{evaluated:report.updates,adopted:decision.adopted?.id||null});
 if(!decision.adopted){
  report.stopped=usable.length?'kept':'evidence';
  report.stopReasons=usable.length?['沒有偏好同時改選目標並通過信任域']:[ '沒有區間排除 0 的偏好'];
  report.adopted=null;
  return finish(root,report,official);
 }
 const model=modelFromPolicy(parentModel,decision.adopted.policy,'v4b2-update-1');
 model.v4b={kind:'trusted-step',production:false,deployed:false,learned:true};
 model.v4b2={preference:decision.adopted.id,promoted:false};
 const saved=cloneModel(model);
 saved.promoted=false;
 writeJson(join(root,'model-before.json'),modelFromPolicy(parentModel,parentModel.policy,'v4b2-before'));
 writeJson(join(root,'model-after.json'),saved);
 writeJson(join(root,'weights-diff.json'),decision.adopted.deltas);
 report.adopted={
  id:decision.adopted.id,deltas:decision.adopted.deltas,
  maxAbs:decision.adopted.maxAbs,hashMoved:decision.adopted.hashMoved
 };
 report.stopped='adopted';
 report.stopReasons=['只採用通過信任域的一步，完整對戰留到之後'];
 report.promoted=false;
 return finish(root,report,official);
}
function finish(root,report,official){
 if(v2Hash()!==official)throw Error('正式 v2 權重被改動');
 const opponents=new Set((report.selected?.opponents&&Object.keys(report.selected.opponents))||[]);
 report.balance={opponents:[...opponents],expected:[...OPPONENTS]};
 report.budgetSpent=(report.mined?.games||0)+(report.rollouts?.games||0);
 report.experimentalChampion=null;
 const markdown=renderReport(report);
 writeJson(join(root,'report.json'),report);
 writeFileSync(join(root,'report.md'),markdown);
 mkdirSync('docs/white-sword-ai/v4b2',{recursive:true});
 writeFileSync('docs/white-sword-ai/v4b2/report.md',markdown);
 return report;
}
