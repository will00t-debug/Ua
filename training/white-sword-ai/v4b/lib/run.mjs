// Round-1 loop: pilot, paired branches, one bounded update, then a small
// development check. A full champion challenge runs only after that gate.
// The 5,000-game cap is not spent here.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {legalUniversalActions} from '../../../../dist/universal-v2/engine.mjs';
import {choiceKey} from '../../v4a/lib/diverge.mjs';
import {buildStageCSpecs} from '../../v4a/lib/matches.mjs';
import {anomalyReport,clusterBootstrap,judgeExperimental,pairGames,rateOf} from '../../v4a/lib/stats.mjs';
import {appendJsonl,readJson,readJsonl,v2Hash,writeExperimentalChampion,writeJson} from '../../v4a/lib/store.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {jobsFor,summarizePosition} from './evaluate.mjs';
import {agreementRate,controlBeats,matchedGaussian,modelFromPolicy,updateFromPreferences} from './learn.mjs';
import {finishFromAction,minePool,replayState} from './play.mjs';
import {
 CHALLENGE_MIRROR,CHALLENGE_PAIRED,CODE_VERSION,DEV_DECKS,DEV_SEEDS,MAX_ROLLOUT_GAMES,
 MINE_SEEDS,MIN_BUCKETS,MIN_FINISHED_RATE,MIN_POSITIONS,MIN_USABLE,PILOT_SEEDS,
 SAMPLES_FIRST,SAMPLES_MAX,SAMPLE_EXTEND,assertFreshPlan,devEntry,pilotDecision
} from './protocol.mjs';
import {renderReport} from './report.mjs';
import {selectPositions} from './select.mjs';
import {loadOpponents,pilotSpecs} from './specs.mjs';

function playMissing(file,specs,playMany){
 const done=readJsonl(file);
 const have=new Set(done.map(game=>game.specKey));
 const missing=specs.filter(spec=>!have.has(spec.key));
 if(!missing.length)return Promise.resolve(done);
 return playMany(missing,{onGame(game){appendJsonl(file,game);}}).then(()=>readJsonl(file));
}
function diffChoices(positions,before,after){
 let n=0;
 let changed=0;
 const rows=[];
 for(const position of positions){
  if((position.band||[]).length<2)continue;
  n++;
  const left=chooseKey(position.band,before);
  const right=chooseKey(position.band,after);
  if(left!==right){
   changed++;
   if(rows.length<12)rows.push({id:position.id,bucket:position.bucket,opponent:position.opponent,before:left,after:right});
  }
 }
 return {n,changed,rate:n?changed/n:0,rows};
}
function recordSeeds(root,seeds,stage){
 const file=join(root,'seed-ledger.json');
 const ledger=readJson(file,{seeds:[]});
 const known=new Map(ledger.seeds.map(row=>[row.seed,row.stage]));
 for(const seed of seeds){
  if(known.has(seed)&&known.get(seed)!==stage){
   const error=Error('seed '+seed+' 已用於 '+known.get(seed));
   error.code='V4B_SEED';
   throw error;
  }
  if(!known.has(seed))ledger.seeds.push({seed,stage,codeVersion:CODE_VERSION});
 }
 writeJson(file,ledger);
}
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
function preferenceRows(usable){
 return usable.map(row=>{
  const preferA=row.mean>0;
  return {
   id:row.id,bucket:row.bucket,opponent:row.opponent,n:row.n,mean:row.mean,low:row.low,high:row.high,
   preferred:preferA?row.actionA.key:row.actionB.key,
   other:preferA?row.actionB.key:row.actionA.key
  };
 });
}
function deckRows(pairs){
 return DEV_DECKS.map(id=>{
  const rows=pairs.filter(pair=>pair.deck===id);
  const part=clusterBootstrap(rows);
  return {id,n:part.n,delta:part.delta,ci:part.ci};
 });
}
export async function runV4B({root,playMany,rolloutMany,log=()=>{}}={}){
 mkdirSync(root,{recursive:true});
 const official=v2Hash();
 assertFreshPlan([
  ...PILOT_SEEDS,...Object.values(MINE_SEEDS).flat(),...DEV_SEEDS,...CHALLENGE_PAIRED,...CHALLENGE_MIRROR
 ],'v4b');
 const opponents=loadOpponents();
 const pilotFile=join(root,'pilot.jsonl');
 const pilotGames=await playMissing(pilotFile,pilotSpecs(opponents),playMany);
 recordSeeds(root,[...new Set(pilotGames.map(game=>game.seed))],'pilot');
 const pilot=pilotDecision(pilotGames);
 const meanMs=pilotGames.reduce((sum,game)=>sum+(game.ms||0),0)/Math.max(1,pilotGames.length);
 const mix={};
 for(const game of pilotGames){
  const key=(game.opponentKind||'unknown')+'/'+(game.opponentDeck||'');
  mix[key]=(mix[key]||0)+1;
 }
 log('pilot '+pilot.games+' 場，平均 '+Math.round(meanMs)+' 毫秒');
 const report={
  codeVersion:CODE_VERSION,official,preliminaryStrength:false,promoted:false,
  pilot:{...pilot,meanMs,mix},stopped:null
 };
 if(!pilot.ok){
  report.stopped='pilot';
  report.stopReasons=pilot.reasons;
  return finish(root,report,official);
 }
 log('挖掘局面');
 const poolFile=join(root,'pool.json');
 const cached=readJson(poolFile);
 const mined=cached?.positions?.length?{
  positions:cached.positions,counts:cached.counts,games:cached.games,decisions:cached.decisions,
  seeds:Object.values(MINE_SEEDS).flat()
 }:minePool({parent:opponents.parent,log});
 if(!cached?.positions?.length)writeJson(poolFile,{counts:mined.counts,games:mined.games,decisions:mined.decisions,positions:mined.positions});
 recordSeeds(root,mined.seeds,'mine');
 const selected=selectPositions(mined.positions);
 writeJson(join(root,'selected.json'),{counts:selected.counts,opponents:selected.opponents,positions:selected.chosen});
 report.mined={games:mined.games,decisions:mined.decisions,stored:mined.positions.length,counts:mined.counts};
 report.selected={n:selected.chosen.length,counts:selected.counts,opponents:selected.opponents,buckets:selected.buckets};
 if(selected.chosen.length<MIN_POSITIONS||selected.buckets<MIN_BUCKETS){
  report.stopped='positions';
  report.stopReasons=['代表性局面不足：'+selected.chosen.length+' 個、'+selected.buckets+' 類'];
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
 if(ready.length<MIN_POSITIONS){
  report.stopped='replay';
  report.stopReasons=['可重現的分支局面只有 '+ready.length+' 個'];
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
  report.spentGames=records.length;
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
  insufficient:judged.length-usable.length,finishedRate:finishedRate(records).rate,
  byBucket:countBy(judged,'bucket'),usableByBucket:countBy(usable,'bucket')
 };
 report.preferences=preferenceRows(usable);
 if(usable.length<MIN_USABLE){
  report.stopped='evidence';
  report.stopReasons=['可用的動作偏好只有 '+usable.length+' 個，少於 '+MIN_USABLE];
  return finish(root,report,official);
 }
 const before=opponents.parent.policy;
 const stepped=updateFromPreferences(before,usable);
 const after=stepped.policy;
 const learned=diffChoices(selected.chosen,before,after);
 const untouched=mined.positions.filter(position=>!selected.chosen.some(row=>row.id===position.id));
 const controls=[];
 for(let salt=0;salt<8;salt++)controls.push(agreementRate(matchedGaussian(before,stepped.l2,20261123+salt),usable).rate);
 const labeled={
  before:agreementRate(before,usable),after:agreementRate(after,usable),
  gaussian:controlBeats(agreementRate(after,usable).rate,controls)
 };
 report.learning={
  usable:usable.length,changedWeights:stepped.changed,l2:stepped.l2,
  deltas:stepped.deltas,labeled,selectedChoices:learned,untouchedChoices:diffChoices(untouched,before,after)
 };
 writeJson(join(root,'weights-diff.json'),stepped.deltas);
 writeJson(join(root,'model-before.json'),modelFromPolicy(opponents.parent,before,'v4b-before'));
 const model=modelFromPolicy(opponents.parent,after,'v4b-update-1');
 writeJson(join(root,'model-after.json'),model);
 if(!learned.changed){
  report.stopped='no-decision-change';
  report.stopReasons=['更新沒有改變選中局面的合法選擇'];
  return finish(root,report,official);
 }
 if(!(labeled.after.rate>=labeled.before.rate)){
  report.stopped='not-from-labels';
  report.stopReasons=['更新後對學習標籤的符合率沒有高於更新前'];
  return finish(root,report,official);
 }
 if(!labeled.gaussian.ok){
  report.stopped='gaussian-control';
  report.stopReasons=['同樣大小的隨機權重變動，對學習標籤的符合率沒有低於這次更新'];
  return finish(root,report,official);
 }
 log('開發驗證');
 const challenger={id:'v4b-update-1',model,round:1,method:'action-value'};
 const champion={id:'v2',model:opponents.parent};
 const devGames=await playMissing(join(root,'dev.jsonl'),buildStageCSpecs({
  round:1,challenger,champion,pairedSeeds:[...DEV_SEEDS],mirrorSeeds:[],decks:[...DEV_DECKS],cells:4
 }),playMany);
 recordSeeds(root,[...DEV_SEEDS],'dev');
 const devPaired=pairGames(devGames.filter(game=>game.role==='challenger'),devGames.filter(game=>game.role==='baseline'));
 const boot=clusterBootstrap(devPaired.pairs);
 const decks=deckRows(devPaired.pairs);
 const dirt=anomalyReport(devGames);
 const paired={n:boot.n,delta:boot.delta,ci:boot.ci,incomplete:devPaired.incomplete.length,missing:devPaired.missing.length};
 const entry=devEntry({paired,decks,anomalies:{...dirt.totals,unfinished:dirt.unfinished}});
 report.dev={games:devGames.length,paired,decks,anomalies:{...dirt.totals,unfinished:dirt.unfinished},entry};
 report.preliminaryStrength=entry.enter;
 if(!entry.enter){
  report.stopped='dev';
  report.stopReasons=entry.reasons;
  return finish(root,report,official);
 }
 log('正式冠軍挑戰');
 const challengeGames=await playMissing(join(root,'challenge.jsonl'),buildStageCSpecs({
  round:2,challenger,champion,pairedSeeds:[...CHALLENGE_PAIRED],mirrorSeeds:[...CHALLENGE_MIRROR],
  decks:[...DEV_DECKS],cells:4
 }),playMany);
 recordSeeds(root,[...CHALLENGE_PAIRED],'challenge-paired');
 recordSeeds(root,[...CHALLENGE_MIRROR],'challenge-mirror');
 const challengePairs=pairGames(
  challengeGames.filter(game=>game.role==='challenger'),
  challengeGames.filter(game=>game.role==='baseline')
 );
 const challengeBoot=clusterBootstrap(challengePairs.pairs);
 const challengeDecks=deckRows(challengePairs.pairs);
 const mirror=rateOf(challengeGames.filter(game=>game.role==='mirror'));
 const challengeDirt=anomalyReport(challengeGames);
 const challengePaired={
  n:challengeBoot.n,delta:challengeBoot.delta,ci:challengeBoot.ci,
  incomplete:challengePairs.incomplete.length,missing:challengePairs.missing.length
 };
 const judgment=judgeExperimental({
  profile:'round',paired:challengePaired,mirror,decks:challengeDecks,
  anomalies:{...challengeDirt.totals,unfinished:challengeDirt.unfinished}
 });
 report.challenge={
  games:challengeGames.length,paired:challengePaired,mirror,decks:challengeDecks,
  anomalies:{...challengeDirt.totals,unfinished:challengeDirt.unfinished},judgment
 };
 report.promoted=judgment.promoted===true;
 report.stopped=judgment.promoted?'promoted':'challenge';
 if(!judgment.promoted)report.stopReasons=judgment.reasons;
 if(judgment.promoted){
  writeExperimentalChampion(root,challenger,judgment);
  report.experimentalChampion='v4b-update-1';
 }
 return finish(root,report,official);
}
function countBy(rows,key){
 const counts={};
 for(const row of rows)counts[row[key]]=(counts[row[key]]||0)+1;
 return counts;
}
function finish(root,report,official){
 if(v2Hash()!==official)throw Error('正式 v2 權重被改動');
 report.experimentalChampion=report.experimentalChampion||null;
 report.budgetCap=5000;
 report.budgetSpent=(report.pilot?.games||0)+(report.rollouts?.games||0)+(report.dev?.games||0)+(report.challenge?.games||0);
 writeJson(join(root,'report.json'),report);
 const markdown=renderReport(report);
 writeFileSync(join(root,'report.md'),markdown);
 mkdirSync('docs/white-sword-ai/v4b',{recursive:true});
 writeFileSync('docs/white-sword-ai/v4b/report.md',markdown);
 writeJson('docs/white-sword-ai/v4b/report.json',report);
 return report;
}
export async function rolloutLocal(jobs){
 const results=[];
 for(const job of jobs)results.push({...finishFromAction(job),id:job.id,positionId:job.positionId,attempt:job.attempt,side:job.side});
 return results;
}
