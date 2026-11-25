#!/usr/bin/env node
// Round 8 compares one frozen actor with official v2. It does not train or edit weights.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {performance} from 'node:perf_hooks';
import {memoryUsage} from 'node:process';
import {planRound8} from '../training/white-sword-nn/budget.mjs';
import {pairedDelta} from '../training/white-sword-nn/cluster.mjs';
import {
 MEMORY_WORKER_RSS,PLAN_SAFETY,ROUND8_BENCH_SEED,ROUND8_CANDIDATE_HASH,ROUND8_CANDIDATE_UPDATES,
 ROUND8_CANDIDATE_VERSION,ROUND8_SEED_CAP,ROUND8_WALL_MS,V2_FILE_HASH,WORKER_CAP
} from '../training/white-sword-nn/constants.mjs';
import {loadNet,packNet,unpackNet} from '../training/white-sword-nn/net.mjs';
import {playMatch} from '../training/white-sword-nn/play.mjs';
import {runPool} from '../training/white-sword-nn/pool.mjs';
import {splitOutcomes} from '../training/white-sword-nn/ppo.mjs';
import {
 EVAL_CELLS,ROUND8_DECKS,ROUND8_EVAL_SEEDS,ROUND8_RULE,assertExperimentSeed,round8Schedule
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerRound8Champion,answerRound8Direct,answerRound8Next,answerRound8Paired,classifyChampion,
 equalDeckDiff,judgeDirect,judgePaired,renderRound8,seedValueInterval
} from '../training/white-sword-nn/report.mjs';
import {BLEND_HARD_CAP,BLEND_SCALE,BLEND_TIMEOUT_MS,HARD_OPTIONS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {addAnomalies,judgeChampion,rateBy} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const CANDIDATE_FILE='training/white-sword-nn/weights/round6/line-2/actor-after-96.json';
const V2_FILE='training/white-sword-ai/weights/v2-capped.json';
const PLAN_JSON='docs/white-sword-ai/nn-round8-plan.json';
const REPORT_JSON='docs/white-sword-ai/nn-round8.json';
const REPORT_MD='docs/white-sword-ai/NN-ROUND8.md';
const EXPECTED=new Set([PLAN_JSON,REPORT_JSON,REPORT_MD]);
const PROTECTED=[
 CANDIDATE_FILE,V2_FILE,
 'dist/universal-v2/hard-ai.mjs',
 'dist/universal-v2/white-sword-ai/choose.mjs',
 'dist/universal-v2/white-sword-ai/constants.mjs',
 'dist/universal-v2/engine.mjs',
 'dist/universal-v2/ai-v3/opening.mjs',
 'training/white-sword-nn/play.mjs'
];

function git(args){
 return execFileSync('git',args,{encoding:'utf8'}).trim();
}
function fileHash(file){
 return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function identity(file){
 const raw=readFileSync(file);
 const net=JSON.parse(raw.toString('utf8'));
 return {
  file,bytes:raw.length,sha256:createHash('sha256').update(raw).digest('hex'),
  version:net.version||null,updates:net.updates??null,seed:net.seed??null
 };
}
function hashesOf(files){
 return Object.fromEntries(files.map(file=>[file,fileHash(file)]));
}
function statusRows(text){
 return text.split('\n').filter(Boolean).map(line=>({code:line.slice(0,2),path:line.slice(3)}));
}
function addedPaths(before,after){
 const old=new Set(statusRows(before).map(row=>row.path));
 return statusRows(after).filter(row=>!old.has(row.path)).map(row=>row.path);
}
function invalidPath(file){
 return file.startsWith('dist/')||file.startsWith('training/white-sword-ai/weights/')||
  file.startsWith('training/white-sword-nn/weights/')||file==='training/white-sword-nn/play.mjs';
}
function nnSeat(){
 return {deckId:'white-sword',kind:'nn',explore:0,policy:'greedy'};
}
function v2Seat(){
 return {deckId:'white-sword',kind:'v2',explore:0};
}
function hardSeat(deck){
 return {deckId:deck,kind:'hard',explore:0};
}
function job(spec,nets){
 return {
  spec,
  seatNets:(nets||[null,null]).map(net=>net?packNet(net):null),
  seatCritics:[null,null]
 };
}
function playJob(item){
 const nets=(item.seatNets||[]).map(packed=>packed?unpackNet(packed):null);
 return playMatch({...item.spec,nets,critics:[null,null],progress:true});
}
async function playMany(items,workers,retries){
 if(items.length<=1||workers<=1)return items.map(playJob);
 try{
  return await runPool(items,workers);
 }catch(error){
  retries.fallbacks+=1;
  retries.fallbackErrors.push(String(error?.message||error));
  console.log('parallel games failed, continuing in this process:',error?.message||error);
  return items.map(playJob);
 }
}
function workersNow(){
 const rss=memoryUsage().rss;
 return rss>MEMORY_WORKER_RSS?1:Math.max(1,Math.min(WORKER_CAP,availableParallelism()-1||1));
}
function materialize(row,candidate){
 const seats=[null,null];
 const nets=[null,null];
 const other=1-row.learnerSeat;
 if(row.model==='candidate'){
  seats[row.learnerSeat]=nnSeat();
  nets[row.learnerSeat]=candidate;
 }else seats[row.learnerSeat]=v2Seat();
 seats[other]=row.opponent==='v2'?v2Seat():hardSeat(row.deck);
 return job({
  seed:row.seed,first:row.first,mode:'eval',learnerSeat:row.learnerSeat,
  comparison:row.comparison,model:row.model,opponent:row.opponent,deck:row.deck,
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,decisionMs:BLEND_TIMEOUT_MS,
  seats
 },nets);
}
function clean(game){
 const anomalies=game?.anomalies||{};
 return game?.status==='finished'&&(game.winner===0||game.winner===1)&&
  !Object.entries(anomalies).some(([,value])=>value);
}
function wired(games){
 const hard=games.filter(game=>game.opponent==='hard');
 const v2=games.filter(game=>game.model==='v2'||game.opponent==='v2');
 const nn=games.filter(game=>game.model==='candidate');
 return hard.length>0&&v2.length>0&&nn.length>0&&
  hard.every(game=>(game.policies?.['hard-search-2']||0)>0)&&
  v2.every(game=>(game.policies?.blend||0)>0)&&
  nn.every(game=>(game.policies?.nn||0)>0);
}
function publicGame(game){
 return {
  seed:game.seed,comparison:game.comparison,model:game.model,opponent:game.opponent,deck:game.deck,
  learnerSeat:game.learnerSeat,first:game.first,status:game.status,winner:game.winner,
  endReason:game.endReason,error:game.error,steps:game.steps,decisions:game.decisions,ms:game.ms,
  anomalies:{...game.anomalies},policies:game.policies||{},
  seats:(game.seats||[]).map(seat=>({deckId:seat.deckId,kind:seat.kind}))
 };
}
function findGame(games,row,model){
 return games.find(game=>game.seed===row.seed&&game.comparison===row.comparison&&game.model===model&&
  game.deck===row.deck&&game.learnerSeat===row.learnerSeat&&game.first===row.first)||null;
}
function won(game){
 return game.winner===game.learnerSeat?1:0;
}
function subsetInterval(rows,pred){
 const picked=rows.map(row=>{
  const cells=row.cells.filter(pred);
  if(!cells.length||cells.some(cell=>cell.win==null))return {seed:row.seed,value:null};
  return {seed:row.seed,value:cells.reduce((sum,cell)=>sum+cell.win,0)/cells.length};
 }).filter(row=>row.value!=null);
 return seedValueInterval(picked);
}
function championOf(games){
 const mapped=games.map(game=>({
  status:game.status,winner:game.winner,specialistSeat:game.learnerSeat,
  specialistIsFirst:game.learnerSeat===game.first,opponentDeck:game.deck,anomalies:game.anomalies
 }));
 const decks=[...new Set(mapped.map(game=>game.opponentDeck))];
 const section={
  overall:rateBy(mapped,()=>true),
  first:rateBy(mapped,game=>game.specialistIsFirst),
  second:rateBy(mapped,game=>!game.specialistIsFirst),
  byDeck:Object.fromEntries(decks.map(deck=>[deck,rateBy(mapped,game=>game.opponentDeck===deck)])),
  nonMirror:rateBy(mapped,game=>game.opponentDeck!=='white-sword'),
  opponentDecks:decks,
  anomalies:addAnomalies(mapped),
  selectedMode:'nn-greedy'
 };
 return {...section,...judgeChampion(section)};
}
function settings(){
 return {
  hard:{policy:'hard-search-2',options:{...HARD_OPTIONS},clock:false},
  v2:{file:V2_FILE,mode:'blend',scale:BLEND_SCALE,hardCap:BLEND_HARD_CAP,timeoutMs:BLEND_TIMEOUT_MS,explore:0},
  candidate:{policy:'greedy',explore:0,hardCap:null,legal:'all'},
  decks:ROUND8_DECKS.map(deck=>({...deck})),
  cells:EVAL_CELLS.map(cell=>({...cell})),
  safety:PLAN_SAFETY,wallMs:ROUND8_WALL_MS,
  critical:'tCritical：樣本數大於 30 回傳 1.96，否則用既有表。標準誤用 n-1。區間不截斷。'
 };
}

async function main(){
 if((process.argv[2]||'trial')!=='trial')throw Error('Use trial');
 const started=performance.now();
 const statusBefore=git(['status','--porcelain']);
 const protectedBefore=hashesOf(PROTECTED);
 const candidateInfo=identity(CANDIDATE_FILE);
 const v2Info=identity(V2_FILE);
 if(candidateInfo.sha256!==ROUND8_CANDIDATE_HASH||candidateInfo.version!==ROUND8_CANDIDATE_VERSION||candidateInfo.updates!==ROUND8_CANDIDATE_UPDATES){
  throw Error('candidate is not the line-2 endpoint');
 }
 if(v2Info.sha256!==V2_FILE_HASH)throw Error('v2 file is not the frozen official weight');
 if(protectedBefore['dist/universal-v2/white-sword-ai/constants.mjs']==null)throw Error('rules file missing');
 const codeCommit=git(['rev-parse','HEAD']);
 const candidate=loadNet(CANDIDATE_FILE);
 const workers=workersNow();
 const retries={fallbacks:0,fallbackErrors:[],workerChanges:[]};
 const benchRows=round8Schedule([assertExperimentSeed(ROUND8_BENCH_SEED,'round8-bench')]);
 const benchStarted=performance.now();
 let benchGames=[];
 let benchError=null;
 try{
  benchGames=await playMany(benchRows.map(row=>materialize(row,candidate)),workers,retries);
 }catch(error){
  benchError=String(error?.message||error);
 }
 const benchMs=performance.now()-benchStarted;
 const benchClean=!benchError&&benchGames.length===benchRows.length&&benchGames.every(clean)&&wired(benchGames);
 const waves=Math.ceil(benchRows.length/workers);
 const gameMs=benchClean?benchMs/waves:null;
 const remaining=ROUND8_WALL_MS-(performance.now()-started);
 const plan=benchClean
  ?planRound8({wallMs:remaining,gameMs,workers,safety:PLAN_SAFETY,seedCap:ROUND8_SEED_CAP,gamesPerSeed:28})
  :{seeds:0,games:0,gamesPerSeed:28,workers,wallMs:remaining,safety:PLAN_SAFETY,seedCap:ROUND8_SEED_CAP,estimatedMs:null,gameMs,fits:false};
 const seeds=ROUND8_EVAL_SEEDS.slice(0,plan.seeds);
 const schedule=round8Schedule(seeds);
 const resourceGap=benchError?'測速沒有跑完：'+benchError
  :!benchClean?'測速沒有完整走完全部比較條件，正式評估沒有開打。'
  :plan.fits?(plan.seeds===ROUND8_SEED_CAP?'':'牆鐘只容納前 '+plan.seeds+' 個種子，已在開打前鎖定。')
  :'一個正式種子都放不進剩餘牆鐘，正式評估沒有開打。';
 const planRecord={
  createdAt:new Date().toISOString(),codeCommit,statusBefore,
  candidate:candidateInfo,v2:v2Info,protectedHashes:protectedBefore,
  bench:{seed:ROUND8_BENCH_SEED,games:benchRows.length,finished:benchGames.filter(clean).length,elapsedMs:benchMs,wired:benchClean&&!benchError},
  timing:{gameMs,workers,wallMs:remaining,safety:PLAN_SAFETY},
  plan,seeds,registeredSeeds:[...ROUND8_EVAL_SEEDS],schedule,settings:settings(),
  rule:ROUND8_RULE,resourceGap
 };
 writeFileSync(PLAN_JSON,JSON.stringify(planRecord,null,2)+'\n');
 console.log('plan locked',plan.seeds,'seeds',plan.games,'games',resourceGap||'full draft');
 const played=[];
 let runError=null;
 let active=workers;
 if(plan.fits){
  try{
   for(let offset=0;offset<seeds.length;offset++){
    const now=workersNow();
    if(now!==active){
     retries.workerChanges.push({games:played.length,from:active,to:now});
     active=now;
    }
    const seed=assertExperimentSeed(seeds[offset],'round8-eval');
    const rows=schedule.filter(row=>row.seed===seed);
    console.log('seed',offset+1,'/'+seeds.length);
    played.push(...await playMany(rows.map(row=>materialize(row,candidate)),active,retries));
   }
  }catch(error){
   runError=String(error?.message||error);
   console.log('evaluation stopped:',runError);
  }
 }
 const split=splitOutcomes(played);
 const done=new Set(split.done);
 const directRows=seeds.map(seed=>{
  const cells=EVAL_CELLS.map(cell=>{
   const game=played.find(item=>item.seed===seed&&item.comparison==='direct'&&item.learnerSeat===cell.learnerSeat&&item.first===cell.first)||null;
   const ok=game&&done.has(game);
   return {learnerSeat:cell.learnerSeat,first:cell.first,mark:ok?(won(game)?'勝':'敗'):'未完成',win:ok?won(game):null};
  });
  const ready=cells.every(cell=>cell.win!=null);
  return {seed,cells,value:ready?cells.reduce((sum,cell)=>sum+cell.win,0)/cells.length:null};
 });
 const pairedRows=seeds.map(seed=>{
  const byDeck={};
  for(const deck of ROUND8_DECKS){
   const diffs=EVAL_CELLS.map(cell=>{
    const row={seed,comparison:'shared',deck:deck.id,learnerSeat:cell.learnerSeat,first:cell.first};
    const candidateGame=findGame(played,row,'candidate');
    const v2Game=findGame(played,row,'v2');
    if(!candidateGame||!v2Game||!done.has(candidateGame)||!done.has(v2Game))return null;
    return won(candidateGame)-won(v2Game);
   });
   byDeck[deck.id]=diffs.every(value=>value!=null)?diffs.reduce((sum,value)=>sum+value,0)/diffs.length:null;
  }
  return {seed,byDeck,value:equalDeckDiff(ROUND8_DECKS.map(deck=>byDeck[deck.id]))};
 });
 const candidateRows=seeds.map(seed=>{
  const byDeck={};
  for(const deck of ROUND8_DECKS){
   const cells=EVAL_CELLS.map(cell=>{
    const game=played.find(item=>item.seed===seed&&item.comparison==='shared'&&item.model==='candidate'&&item.deck===deck.id&&item.learnerSeat===cell.learnerSeat&&item.first===cell.first)||null;
    return game&&done.has(game)?won(game):null;
   });
   byDeck[deck.id]=cells.every(value=>value!=null)?cells.reduce((sum,value)=>sum+value,0)/cells.length:null;
  }
  return {seed,value:equalDeckDiff(ROUND8_DECKS.map(deck=>byDeck[deck.id]))};
 });
 const directInterval=seedValueInterval(directRows);
 const directDelta=pairedDelta(directRows.filter(row=>row.value!=null).map(row=>({seed:row.seed,p:0.5})),directRows.filter(row=>row.value!=null).map(row=>({seed:row.seed,p:row.value})));
 const pairedInterval=seedValueInterval(pairedRows);
 const pairedByDeck=Object.fromEntries(ROUND8_DECKS.map(deck=>[deck.id,seedValueInterval(pairedRows.map(row=>({seed:row.seed,value:row.byDeck[deck.id]})))]));
 const candidateSeedInterval=seedValueInterval(candidateRows);
 const descriptive=(label,pred)=>subsetInterval(directRows.map(row=>({seed:row.seed,cells:row.cells})),pred);
 const sharedGames=played.filter(game=>game.comparison==='shared'&&game.model==='candidate');
 const champion=championOf(sharedGames);
 const anomalies=played.length?addAnomalies(played.map(game=>({anomalies:game.anomalies}))):{};
 anomalies.unfinished=played.filter(game=>!done.has(game)).length;
 anomalies.timeout=played.reduce((sum,game)=>sum+(game.anomalies?.timeout||0),0);
 const completeSeeds=directRows.filter(row=>row.value!=null).length;
 const pairedSeeds=pairedRows.filter(row=>row.value!=null).length;
 const anomalyCount=Object.entries(anomalies).reduce((sum,[,value])=>sum+(value||0),0);
 const gamesComplete=!runError&&plan.fits&&played.length===schedule.length&&
  anomalies.unfinished===0&&completeSeeds===seeds.length&&pairedSeeds===seeds.length&&anomalyCount===0;
 const provisional='complete';
 let execution=gamesComplete?provisional:'invalid';
 let championClass=classifyChampion({
  promoted:champion.promoted,reasons:champion.reasons,overall:champion.overall,
  nonMirror:champion.nonMirror,complete:execution==='complete'
 });
 let directJudgment=execution==='complete'?judgeDirect(directInterval):{kind:'incomplete',interval:directInterval};
 let pairedJudgment=execution==='complete'?judgePaired(pairedInterval):{kind:'incomplete',interval:pairedInterval};
 const perSeed=seeds.map(seed=>{
  const direct=directRows.find(row=>row.seed===seed);
  const paired=pairedRows.find(row=>row.seed===seed);
  return {
   seed,direct:direct?.value??null,paired:paired?.value??null,directCells:direct?.cells||[],
   pairedByDeck:paired?.byDeck||{}
  };
 });
 const record={
  createdAt:new Date().toISOString(),elapsedMs:performance.now()-started,codeCommit,
  candidate:candidateInfo,v2:v2Info,
  candidateAfter:identity(CANDIDATE_FILE),v2After:identity(V2_FILE),
  protectedHashes:protectedBefore,protectedHashesAfter:null,
  statusBefore,statusAfter:null,statusAdded:[],execution,resourceGap,retries,
  plan,seeds,schedule,settings:settings(),
  bench:{seed:ROUND8_BENCH_SEED,games:benchRows.length,finished:benchGames.filter(clean).length,elapsedMs:benchMs},
  directInterval,directDelta,directJudgment,
  directFirst:descriptive('first',cell=>cell.learnerSeat===cell.first),
  directSecond:descriptive('second',cell=>cell.learnerSeat!==cell.first),
  directSeat0:descriptive('seat0',cell=>cell.learnerSeat===0),
  directSeat1:descriptive('seat1',cell=>cell.learnerSeat===1),
  pairedInterval,pairedByDeck,pairedJudgment,candidateSeedInterval,
  champion,championClass,
  plannedGames:plan.games,finishedGames:split.done.length,
  unfinished:played.filter(game=>!done.has(game)).map(publicGame),
  anomalies,perSeed,games:played.map(publicGame),
  answers:{
   direct:answerRound8Direct(directJudgment),
   paired:answerRound8Paired(pairedJudgment),
   champion:answerRound8Champion(championClass,champion),
   next:answerRound8Next({complete:execution==='complete',direct:directJudgment.kind,paired:pairedJudgment.kind,championClass})
  }
 };
 writeFileSync(REPORT_JSON,JSON.stringify(record,null,2)+'\n');
 writeFileSync(REPORT_MD,renderRound8(record));
 const protectedAfter=hashesOf(PROTECTED);
 const statusAfter=git(['status','--porcelain']);
 const statusAdded=addedPaths(statusBefore,statusAfter);
 const hashesOk=PROTECTED.every(file=>protectedBefore[file]===protectedAfter[file]);
 const statusOk=statusAdded.every(file=>EXPECTED.has(file)||!invalidPath(file));
 record.protectedHashesAfter=protectedAfter;
 record.statusAfter=statusAfter;
 record.statusAdded=statusAdded;
 record.candidateAfter=identity(CANDIDATE_FILE);
 record.v2After=identity(V2_FILE);
 if(!hashesOk||!statusOk){
  execution='invalid';
  championClass='invalid';
  directJudgment={kind:'incomplete',interval:directInterval};
  pairedJudgment={kind:'incomplete',interval:pairedInterval};
  record.execution=execution;
  record.championClass=championClass;
  record.directJudgment=directJudgment;
  record.pairedJudgment=pairedJudgment;
  record.integrityNote=hashesOk
   ?'工作區出現受保護路徑的新變動，評估記為執行無效。狀態字串已保存在這份報告。'
   :'受保護檔案的雜湊在執行期間改變，評估記為執行無效。';
  record.answers={
   direct:answerRound8Direct(directJudgment),
   paired:answerRound8Paired(pairedJudgment),
   champion:answerRound8Champion(championClass,champion),
   next:answerRound8Next({complete:false,direct:directJudgment.kind,paired:pairedJudgment.kind,championClass})
  };
 }
 writeFileSync(REPORT_JSON,JSON.stringify(record,null,2)+'\n');
 writeFileSync(REPORT_MD,renderRound8(record));
 console.log(JSON.stringify({
  execution,seeds:plan.seeds,finished:split.done.length,
  direct:directInterval,paired:pairedInterval,champion:championClass,
  elapsedMs:record.elapsedMs,hashesOk,statusAdded
 }));
 if(!hashesOk||!statusOk)process.exitCode=1;
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
