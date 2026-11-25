// Stage A explores. Stage B screens only if A passes. Stage C challenges only if B passes.
// Disagreement, teacher advice and training scores do not promote a champion.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadModel} from '../../../../dist/universal-v2/white-sword-ai/model.mjs';
import {buildStageCSpecs,buildStageSpecs} from '../../v4a/lib/matches.mjs';
import {
 anomalyReport,bySeat,clusterBootstrap,decisiveGame,judgeExperimental,pairGames,rateOf
} from '../../v4a/lib/stats.mjs';
import {
 appendJsonl,ensureChampion,readJson,readJsonl,v2Hash,writeExperimentalChampion,writeHalt,writeJson
} from '../../v4a/lib/store.mjs';
import {minePositions} from './mine.mjs';
import {
 CODE_VERSION,HOLDOUT_SEEDS,MINE,SCREEN,STAGE_B_GATE,TEACHER_NODES,TRAIN_SEEDS,VALIDATION
} from './protocol.mjs';
import {renderReport} from './report.mjs';
import {measurePolicies,proposeSensitive,stageADecision} from './sensitivity.mjs';
import {teacherSummary} from './teacher.mjs';

const V2='training/white-sword-ai/weights/v2-capped.json';
const ELITES='training/white-sword-ai/v4a/explore-state.json';

function parentModel(){
 const model=loadModel(V2);
 model.promoted=false;
 model.promotion=null;
 return model;
}
function elitesOf(){
 const state=readJson(ELITES,{elites:[]});
 return state.elites||[];
}
function savePool(root,name,mined){
 writeJson(join(root,name),JSON.parse(JSON.stringify(mined)));
}
function summaryMine(mined){
 return {
  seeds:mined.seeds,walked:mined.walked,steps:mined.steps,decisions:mined.decisions,
  multi:mined.multi,bandSeen:mined.bandSeen,stored:mined.positions.length,
  duplicates:mined.duplicates,mismatches:mined.mismatches,meanSearchMs:mined.meanSearchMs,
  countsByBucket:mined.countsByBucket,
  multiRate:mined.decisions?mined.multi/mined.decisions:0,
  bandRate:mined.multi?mined.bandSeen/mined.multi:0
 };
}
function recordSeeds(root,seeds,stage){
 const file=join(root,'seed-ledger.json');
 const ledger=readJson(file,{seeds:[]});
 const known=new Map(ledger.seeds.map(row=>[row.seed,row.stage]));
 for(const seed of seeds){
  if(known.has(seed)){
   if(known.get(seed)!==stage){
    const error=Error('seed '+seed+' 已用於 '+known.get(seed));
    error.code='V4A2_SEED';
    throw error;
   }
   continue;
  }
  ledger.seeds.push({seed,stage,codeVersion:CODE_VERSION});
  known.set(seed,stage);
 }
 writeJson(file,ledger);
}
export function stageBDecision(games,candidates){
 const sensitive=candidates.filter(row=>row.family==='sensitive');
 const gaussian=candidates.filter(row=>row.family==='gaussian');
 const dirt=anomalyReport(games);
 const left=rateOf((games||[]).filter(game=>sensitive.some(row=>row.id===game.candidateId)));
 const right=rateOf((games||[]).filter(game=>gaussian.some(row=>row.id===game.candidateId)));
 const reasons=[];
 if(dirt.bad||dirt.unfinished)reasons.push('篩選對局有異常或未完成');
 if(left.p==null||right.p==null)reasons.push('沒有足夠的完成對局');
 else if(right.p-left.p>STAGE_B_GATE.maxWinDrop)reasons.push('敏感型勝率比高斯對照低超過 8 個百分點');
 const ranked=sensitive.map(candidate=>{
  const rows=(games||[]).filter(game=>game.candidateId===candidate.id);
  const rate=rateOf(rows);
  const seat=bySeat(rows);
  return {id:candidate.id,method:candidate.method,rate,seat,balanced:!!(seat.first.n&&seat.second.n)};
 }).sort((a,b)=> (b.rate.wins||0)-(a.rate.wins||0)||a.id.localeCompare(b.id));
 const challenger=ranked.find(row=>row.balanced) || null;
 if(!challenger)reasons.push('沒有先後手都下過的敏感型候選');
 return {
  passed:reasons.length===0,reasons,sensitive:left,gaussian:right,
  drop:left.p==null||right.p==null?null:right.p-left.p,
  challengerId:reasons.length?null:challenger.id,ranked
 };
}
export function runStageA({root,log=()=>{}}={}){
 mkdirSync(root,{recursive:true});
 const official=v2Hash();
 const existing=readJson(join(root,'stage-a.json'));
 if(existing?.codeVersion===CODE_VERSION&&existing.status==='complete'){
  recordSeeds(root,TRAIN_SEEDS,'train');
  recordSeeds(root,HOLDOUT_SEEDS,'holdout');
  return existing;
 }
 const parent=parentModel();
 ensureChampion(root);
 log('挖掘訓練局面');
 const trainMine=minePositions({
  seeds:TRAIN_SEEDS,parent,holdout:false,maxBand:MINE.maxBand,perBucket:MINE.perBucket,
  teacherLimit:MINE.teacherPositions,teacherNodes:TEACHER_NODES,minSeeds:MINE.minSeedsBeforeStop,log
 });
 log('挖掘保留局面');
 const holdoutMine=minePositions({
  seeds:HOLDOUT_SEEDS,parent,holdout:true,maxBand:MINE.maxHoldoutBand,perBucket:MINE.perBucket,
  teacherLimit:MINE.holdoutTeacherPositions,teacherNodes:TEACHER_NODES,minSeeds:1,log
 });
 const proposed=proposeSensitive({
  parent,positions:trainMine.positions.filter(row=>row.holdout!==true),elites:elitesOf(),round:1,salt:160000
 });
 const started=performance.now();
 const trainMeasure=measurePolicies(trainMine.positions,parent.policy,proposed.candidates);
 const holdoutMeasure=measurePolicies(holdoutMine.positions,parent.policy,proposed.candidates);
 const rankMs=(performance.now()-started)/Math.max(1,(trainMeasure.positions+holdoutMeasure.positions)*proposed.candidates.length);
 const decision=stageADecision({...trainMeasure,rows:trainMine.positions},holdoutMeasure);
 if(trainMine.mismatches||holdoutMine.mismatches){
  decision.passed=false;
  decision.reasons.push('解析分數和實際 blend 不一致');
 }
 const result={
  codeVersion:CODE_VERSION,status:'complete',official,flips:proposed.flips,rankMs,
  decision,candidates:proposed.candidates.map(candidate=>({
   id:candidate.id,method:candidate.method,family:candidate.family,l2:candidate.l2,changed:candidate.changed
  })),
  train:summaryMine(trainMine),holdout:summaryMine(holdoutMine),
  trainMeasure:{
   positions:trainMeasure.positions,illegal:trainMeasure.illegal,byFamily:trainMeasure.byFamily,byMethod:trainMeasure.byMethod
  },
  holdoutMeasure:{
   positions:holdoutMeasure.positions,illegal:holdoutMeasure.illegal,byFamily:holdoutMeasure.byFamily,byMethod:holdoutMeasure.byMethod
  },
  teacher:teacherSummary(trainMine.positions),
  holdoutTeacher:teacherSummary(holdoutMine.positions)
 };
 savePool(root,'pool-train.json',trainMine);
 savePool(root,'pool-holdout.json',holdoutMine);
 for(const candidate of proposed.candidates)writeJson(join(root,'candidates',candidate.id+'.json'),candidate);
 writeJson(join(root,'stage-a.json'),result);
 recordSeeds(root,TRAIN_SEEDS,'train');
 recordSeeds(root,HOLDOUT_SEEDS,'holdout');
 if(v2Hash()!==official)throw Error('正式 v2 權重被改動');
 return result;
}
async function playMissing(root,name,specs,playMany){
 const file=join(root,name+'.jsonl');
 const done=readJsonl(file);
 const have=new Set(done.map(game=>game.specKey));
 const missing=specs.filter(spec=>!have.has(spec.key));
 const streamed=[];
 const returned=missing.length?await playMany(missing,{onGame(game){
  appendJsonl(file,game);
  streamed.push(game);
 }}):[];
 const fresh=streamed.length?streamed:(returned||[]);
 if(!streamed.length)for(const game of fresh)appendJsonl(file,game);
 return [...done,...fresh];
}
export async function runStageB({root,stageA,playMany,log=()=>{}}){
 if(!stageA?.decision?.passed)return {status:'skipped',passed:false,reasons:['Stage A 未通過']};
 const official=v2Hash();
 const parent=parentModel();
 const champion=ensureChampion(root);
 const candidates=stageA.candidates.map(row=>{
  const saved=readJson(join(root,'candidates',row.id+'.json'));
  return saved;
 });
 const specs=buildStageSpecs({
  stage:'v4a2-screen',round:1,candidates,champion:{id:'v2',model:champion},historical:[],
  seeds:[...SCREEN.seeds],cells:SCREEN.cells,opponents:[...SCREEN.opponents]
 });
 log('階段 B 對局 '+specs.length);
 const games=await playMissing(root,'stage-b',specs,playMany);
 const decision=stageBDecision(games,candidates);
 const result={codeVersion:CODE_VERSION,status:'complete',passed:decision.passed,decision,games:games.length,official};
 writeJson(join(root,'stage-b.json'),result);
 recordSeeds(root,[...SCREEN.seeds],'screen');
 if(v2Hash()!==official)throw Error('正式 v2 權重被改動');
 if(!decision.passed)writeHalt(root,decision.reasons.join('；'),1);
 return result;
}
export async function runStageC({root,stageA,stageB,playMany,log=()=>{}}){
 if(!stageB?.passed)return {status:'skipped',promoted:false,reasons:stageB?.decision?.reasons||['Stage B 未通過']};
 const official=v2Hash();
 const champion=ensureChampion(root);
 const challenger=readJson(join(root,'candidates',stageB.decision.challengerId+'.json'));
 const specs=buildStageCSpecs({
  round:1,challenger,champion:{id:'v2',model:champion},
  pairedSeeds:[...VALIDATION.pairedSeeds],mirrorSeeds:[...VALIDATION.mirrorSeeds],
  decks:[...VALIDATION.decks],cells:VALIDATION.cells
 });
 log('階段 C 對局 '+specs.length);
 const games=await playMissing(root,'stage-c',specs,playMany);
 const challengerGames=games.filter(game=>game.role==='challenger');
 const baselineGames=games.filter(game=>game.role==='baseline');
 const mirrorGames=games.filter(game=>game.role==='mirror');
 const pairedRows=pairGames(challengerGames,baselineGames);
 const boot=clusterBootstrap(pairedRows.pairs);
 const mirror=rateOf(mirrorGames);
 const decks=VALIDATION.decks.map(id=>{
  const rows=pairedRows.pairs.filter(pair=>pair.deck===id);
  const delta=rows.length?rows.reduce((sum,pair)=>sum+Number(pair.challengerWin)-Number(pair.championWin),0)/rows.length:null;
  return {id,n:rows.length,delta};
 });
 const dirt=anomalyReport(games);
 const paired={
  n:boot.n,incomplete:pairedRows.incomplete.length,missing:pairedRows.missing.length,
  delta:boot.delta,ci:boot.ci,clusters:boot.clusters
 };
 const judgment=judgeExperimental({
  profile:'round',paired,mirror,decks,anomalies:{...dirt.totals,unfinished:dirt.unfinished}
 });
 if(dirt.bad)judgment.promoted=false;
 const result={
  codeVersion:CODE_VERSION,status:'complete',games:games.length,challengerId:challenger.id,
  paired,mirror,decks,anomalies:{...dirt.totals,unfinished:dirt.unfinished},faults:dirt.faults,
  judgment,promoted:!!judgment.promoted,seat:bySeat(challengerGames.filter(decisiveGame))
 };
 if(result.promoted){
  writeExperimentalChampion(root,challenger,judgment);
  result.experimentalChampion=challenger.id;
 }
 writeJson(join(root,'stage-c.json'),result);
 recordSeeds(root,[...VALIDATION.pairedSeeds],'validation-paired');
 recordSeeds(root,[...VALIDATION.mirrorSeeds],'validation-mirror');
 if(v2Hash()!==official)throw Error('正式 v2 權重被改動');
 return result;
}
export async function runAll({root,docsRoot,playMany,log=()=>{}}){
 const official=v2Hash();
 const stageA=runStageA({root,log});
 let stageB={status:'skipped',passed:false};
 let stageC={status:'skipped',promoted:false};
 if(stageA.decision.passed)stageB=await runStageB({root,stageA,playMany,log});
 if(stageB.passed)stageC=await runStageC({root,stageA,stageB,playMany,log});
 const report={
  codeVersion:CODE_VERSION,official,stageA,stageB,stageC,
  exploration:!!stageA.decision.passed,
  strength:!!stageC.promoted,
  experimentalChampion:stageC.experimentalChampion||null,
  continued:!!(stageA.decision.passed&&stageB.passed&&stageC.promoted)
 };
 writeJson(join(root,'report.json'),report);
 const markdown=renderReport(report);
 writeFileSync(join(root,'report.md'),markdown);
 if(docsRoot){
  mkdirSync(docsRoot,{recursive:true});
  writeFileSync(join(docsRoot,'report.md'),markdown);
  writeJson(join(docsRoot,'report.json'),report);
 }
 if(v2Hash()!==official)throw Error('正式 v2 權重被改動');
 return report;
}
