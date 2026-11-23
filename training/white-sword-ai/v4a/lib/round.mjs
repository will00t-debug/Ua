// One unattended evolution round: propose, probe, screen, semifinal, then one fresh test.
import {join} from 'node:path';
import {replayMatches as replayRealMatches} from '../../../../dist/universal-v2/white-sword-ai/runner.mjs';
import {probeDivergence} from './diverge.mjs';
import {policyHash,nextSigma} from './evolve.mjs';
import {buildStageCSpecs,buildStageSpecs} from './matches.mjs';
import {propose} from './rl-hook.mjs';
import {renderHistory,renderRound} from './report.mjs';
import {loadLedger,recordPlan,saveLedger} from './seeds.mjs';
import {
 anomalyReport,byOpponent,bySeat,clusterBootstrap,judgeExperimental,meanTally,pairGames,rankCandidates,rateOf,screenCandidates
} from './stats.mjs';
import {
 acquireLock,appendJsonl,ensureChampion,ledgerFile,loadParents,readHalt,readJson,readJsonl,roundDir,roundNumbers,v2Hash,writeExperimentalChampion,writeHalt,writeJson,writeText
} from './store.mjs';
import {CODE_VERSION,PROFILES,ROUND_GAME_CAP,SEQUENCE_COUNTS,SEQUENCE_WALL_MS,planSeeds,expectedCounts} from './protocol.mjs';

function slim(candidate){
 return {
  id:candidate.id,index:candidate.index,method:candidate.method,label:candidate.label,
  parentId:candidate.parentId,policyHash:candidate.policyHash,maxAbsDelta:candidate.maxAbsDelta,
  changedWeights:candidate.changedWeights,deltaL2:candidate.deltaL2,hardCap:candidate.hardCap,
  scale:candidate.scale,explore:candidate.explore,sigma:candidate.sigma,sigmaScale:candidate.sigmaScale,
  valueUntouched:candidate.valueUntouched
 };
}
function stamp(games,specs){
 const byKey=new Map(specs.map(spec=>[spec.key,spec]));
 return games.map(game=>{
  const spec=byKey.get(game.specKey||game.key);
  if(!spec)throw Error('對戰結果對不上規格 '+(game.specKey||game.key||''));
  return {
   ...game,
   specKey:spec.key,candidateId:spec.candidateId,opponentKind:spec.opponentKind,
   opponentDeck:spec.opponentDeck,stage:spec.stage,role:spec.role,seed:spec.seed,
   first:spec.first,specialistSeat:spec.specialistSeat,
   specialistIsFirst:spec.specialistSeat===spec.first,
   historicalSame:!!spec.historicalSame,round:spec.round
  };
 });
}
async function playMissing(file,specs,playMany){
 const done=readJsonl(file);
 const have=new Set(done.map(row=>row.specKey));
 if(have.size!==done.length)throw Error('對戰紀錄有重複的規格');
 const todo=specs.filter(spec=>!have.has(spec.key));
 if(todo.length){
  const fresh=await playMany(todo,{
   onGame(game){
    appendJsonl(file,stamp([game],todo)[0]);
   }
  });
  const written=new Set(readJsonl(file).map(row=>row.specKey));
  for(const game of fresh||[]){
   const row=stamp([game],todo)[0];
   if(!written.has(row.specKey))appendJsonl(file,row);
  }
 }
 const merged=readJsonl(file);
 const byKey=new Map(merged.map(row=>[row.specKey,row]));
 return specs.map(spec=>{
  const game=byKey.get(spec.key);
  if(!game)throw Error('缺少對戰紀錄 '+spec.key);
  return game;
 });
}
function championView(model){
 const id=model.v4a?.candidateId||'v2';
 return {id,model,label:id==='v2'?'v2':id};
}
function historicalView(root,champion){
 const history=readJson(join(root,'history.json'),{rounds:[]});
 const previous=[...history.rounds].reverse().find(row=>row.promoted&&row.challengerId);
 if(previous){
  const model=readJson(join(root,'champions',previous.challengerId+'.json'));
  if(model?.policy&&policyHash(model.policy)!==policyHash(champion.model.policy)){
   return {id:previous.challengerId,model,same:false,note:'歷代實驗冠軍 '+previous.challengerId};
  }
 }
 return {
  id:'v2-origin',model:champion.model,same:true,
  note:'歷代實驗冠軍尚未出現，或與現任權重相同。這組對戰併入冠軍對戰，不另計成新對手。'
 };
}
function loadCandidates(dir){
 const manifest=readJson(join(dir,'manifest.json'));
 if(!manifest)return null;
 return manifest.candidateIds.map(id=>readJson(join(dir,'candidates',id+'.json')));
}
function saveCandidates(dir,candidates){
 for(const candidate of candidates)writeJson(join(dir,'candidates',candidate.id+'.json'),candidate);
}
function diagnosisOf(history,current){
 const rows=[...history.filter(row=>row.profile==='round'),current].filter(row=>row.profile==='round');
 let streak=0;
 for(let i=rows.length-1;i>=0;i--){
  if(rows[i].promoted)break;
  const rate=rows[i].probe?.bandRate??rows[i].probe?.rate??0;
  if(rate<0.02)streak++;
  else break;
 }
 const band=current.probe?.bandPositions??0;
 const bandRate=current.probe?.bandRate??current.probe?.rate??0;
 if(streak>=2){
  return '連續 '+streak+' 輪沒有晉級，而且硬搜尋容許帶裡的出牌分歧率低於 2%。下一輪會沿用較高的探索強度。單項權重變化仍不超過 1.5，晉級門檻也不會放寬。';
 }
 if(bandRate<0.02){
  return '這一輪在 '+current.probe.positions+' 個有效局面裡，硬搜尋容許帶有 '+band+' 個，帶內分歧率低於 2%。探索強度留給下一輪，這一輪的候選不會事後改寫。晉級門檻維持原訂數值。';
 }
 return '這一輪的部分候選在相同可見局面選擇了不同的合法行動。晉級門檻維持原訂數值。';
}
export function safetyFault(report){
 const dirt=report?.anomalies||{};
 return report?.status==='stopped'||!!(dirt.illegal||dirt.leak||dirt.fallback||dirt.timeout||
  dirt.deadLoop||dirt.engineError||dirt.unfinished||dirt.opponentFallback);
}
export function nextRoundNumber(root){
 const halt=readHalt(root);
 if(halt){
  const error=Error('實驗已安全停止：'+(halt.reason||'上一輪出現安全問題'));
  error.code='V4A_HALT';
  throw error;
 }
 const numbers=roundNumbers(root);
 if(!numbers.length)return {round:1,resume:false};
 const round=numbers[numbers.length-1];
 const manifest=readJson(join(roundDir(root,'round',round),'manifest.json'));
 if(!manifest||manifest.status==='running')return {round,resume:true};
 if(manifest.status==='stopped'){
  const error=Error('第 '+round+' 輪已安全停止，不會自動開始下一輪');
  error.code='V4A_STOPPED';
  throw error;
 }
 if(manifest.status==='complete')return {round:round+1,resume:false};
 throw Error('無法判斷第 '+round+' 輪的狀態');
}
export async function runRound({
 profile:profileName='round',round,playMany,probe=probeDivergence,replayMatches=replayRealMatches,
 root,docsRoot,parents,log=()=>{}
}={}){
 if(typeof playMany!=='function')throw Error('Evolution needs a match runner');
 const profile=PROFILES[profileName];
 if(!profile)throw Error('Unknown v4-A profile '+profileName);
 const roundNumber=profileName==='smoke'?0:round;
 if(profileName==='round'&&(!Number.isInteger(roundNumber)||roundNumber<1))throw Error('Round number is required');
 const counts=expectedCounts(profileName);
 const release=acquireLock(root);
 try{
  const official=v2Hash();
  const championModel=ensureChampion(root);
  if(v2Hash()!==official)throw Error('Official v2 changed while preparing the champion');
  const dir=roundDir(root,profileName,roundNumber);
  const existing=readJson(join(dir,'report.json'));
  const priorManifest=readJson(join(dir,'manifest.json'));
  if(existing&&priorManifest&&(priorManifest.status==='complete'||priorManifest.status==='stopped'))return existing;
  if(priorManifest&&priorManifest.codeVersion!==CODE_VERSION)throw Error('This round was started by '+priorManifest.codeVersion);
  const loadedParents=parents||loadParents();
  const champion=championView(championModel);
  const historical=historicalView(root,champion);
  let manifest=priorManifest;
  if(!manifest){
   const plan=planSeeds(roundNumber,profileName);
   const ledger=loadLedger(ledgerFile(root));
   recordPlan(ledger,plan);
   saveLedger(ledgerFile(root),ledger);
   const explore=profileName==='round'?readJson(join(root,'explore-state.json'),{sigmaScale:1,elites:[]}):{sigmaScale:1,elites:[]};
   const proposed=propose({
    kind:'evolution',round:roundNumber,parent:championModel,historical:loadedParents,
    sigmaScale:explore.sigmaScale||1,elites:explore.elites||[]
   });
   manifest={
    status:'running',codeVersion:CODE_VERSION,profile:profileName,round:roundNumber,
    startedAt:Date.now(),seeds:plan,sigmaScale:proposed.sigmaScale,bumped:false,
    candidateIds:proposed.candidates.map(row=>row.id),championId:champion.id,
    championPolicy:policyHash(championModel.policy),historicalNote:historical.note,
    historicalSame:historical.same,officialV2:official
   };
   saveCandidates(dir,proposed.candidates);
   writeJson(join(dir,'manifest.json'),manifest);
  }
  let candidates=loadCandidates(dir);
  let probeReport=readJson(join(dir,'probe.json'));
  if(!probeReport){
   probeReport=await probe({
    candidates,champion:championModel,seeds:manifest.seeds.probe,
    maxSteps:profile.probe.maxSteps,maxPositions:profile.probe.maxPositions,log
   });
   probeReport.regenerated=false;
   writeJson(join(dir,'probe.json'),probeReport);
  }
  const contextBase=()=>({
   manifest,dir,docsRoot,root,profile,profileName,roundNumber,counts,candidates,probe:probeReport,
   champion,historical,official,playMany,log
  });
  if(probeReport.fallbackIds?.length)return finishStop(contextBase(),'探測階段出現 fallback 或逾時');
  const minimum=profile.probe.minPositions||0;
  if((probeReport.positions||0)<minimum){
   return finishStop(contextBase(),'有效分歧局面 '+(probeReport.positions||0)+' 少於事先登記的 '+minimum);
  }
  const context={
   manifest,dir,docsRoot,root,profile,profileName,roundNumber,counts,candidates,probe:probeReport,
   champion,historical,official,playMany,log
  };
  const stageA=await runStage(context,'stage-a',buildStageSpecs({
   stage:'stage-a',round:roundNumber,candidates,champion,historical,
   seeds:manifest.seeds.stageA,cells:profile.cells,opponents:profile.stageA.opponents
  }),counts.stageA);
  if(stageA.dirt.bad)return finishStop({...context,stageA},'初選出現非法、洩漏、fallback、死循環或未完成對局');
  if(!manifest.replay){
   const replay=replayMatches(stageA.specs[0]);
   manifest.replay={same:replay.same,finished:replay.finished,anomalies:replay.anomalies};
   writeJson(join(dir,'manifest.json'),manifest);
   if(!replay.same||!replay.finished||anomalyReport([replayGame(replay)]).bad){
    return finishStop({...context,stageA},'同一規格無法重現');
   }
  }
  const screened=screenCandidates(stageA.games,candidates,{floor:profile.stageA.floor});
  const rankedA=rankCandidates(stageA.games,screened.kept.map(row=>row.id));
  const advancing=rankedA.slice(0,profile.stageB.keep).map(row=>candidates.find(candidate=>candidate.id===row.id));
  writeJson(join(dir,'stage-a.json'),{games:stageA.games.length,eliminated:screened.eliminated,advancing:advancing.map(row=>row.id)});
  if(!advancing.length){
   return finishRound(context,{stageA,stageB:emptyStage(),stageC:emptyStage(),advancing,challenger:null,screened});
  }
  const stageB=await runStage(context,'stage-b',buildStageSpecs({
   stage:'stage-b',round:roundNumber,candidates:advancing,champion,historical,
   seeds:manifest.seeds.stageB,cells:profile.cells,opponents:profile.stageB.opponents
  }),counts.stageB);
  if(stageB.dirt.bad)return finishStop({...context,stageA,stageB,screened,advancing},'複選出現非法、洩漏、fallback、死循環或未完成對局');
  const rankedB=rankCandidates(stageB.games,advancing.map(row=>row.id));
  const challenger=advancing.find(row=>row.id===rankedB[0].id);
  writeJson(join(dir,'stage-b.json'),{games:stageB.games.length,ranking:rankedB,challenger:challenger.id});
  let stageC=emptyStage();
  if(profile.stageC){
   stageC=await runStage(context,'stage-c',buildStageCSpecs({
    round:roundNumber,challenger,champion,
    pairedSeeds:manifest.seeds.stageCPaired,mirrorSeeds:manifest.seeds.stageCMirror,
    decks:[...profile.stageC.decks],cells:profile.cells
   }),counts.stageC);
  }
  return finishRound(context,{stageA,stageB,stageC,advancing,challenger,screened,rankedB});
 }finally{
  release();
 }
}
function replayGame(replay){
 return {status:replay.finished?'finished':'error',winner:replay.finished?0:null,anomalies:replay.anomalies,specialistSeat:0};
}
function emptyStage(){
 return {games:[],dirt:anomalyReport([]),specs:[]};
}
async function runStage(context,name,specs,maximum){
 if(specs.length>maximum)throw Error(name+' 超過登記的對局上限');
 if(name==='stage-a'&&specs.length!==maximum)throw Error('初選對局數不是登記的 '+maximum);
 if(name==='stage-c'&&specs.length!==maximum)throw Error('冠軍挑戰對局數不是登記的 '+maximum);
 context.log(name+' '+specs.length);
 const games=await playMissing(join(context.dir,name+'.jsonl'),specs,context.playMany);
 return {games,specs,dirt:anomalyReport(games)};
}
function finishStop(context,reason){
 const games=(context.stageA?.games.length||0)+(context.stageB?.games.length||0)+(context.stageC?.games.length||0);
 const report=baseReport(context,context.manifest,games);
 const history=readJson(join(context.root,'history.json'),{rounds:[]});
 report.cumulativeGames=history.rounds.reduce((sum,row)=>sum+(row.games||0),0)+report.games;
 report.stageAGames=context.stageA?.games.length||0;
 report.stageBGames=context.stageB?.games.length||0;
 report.stageCGames=context.stageC?.games.length||0;
 report.status='stopped';
 report.promoted=false;
 report.judgment={promoted:false,experimentalOnly:true,production:false,deployed:false,reasons:[reason]};
 report.nextDirection='先看停止原因。不會自動開下一輪。';
 report.diagnosis=reason;
 writeOutputs(context.root,context.docsRoot,context.dir,context.manifest,report);
 context.manifest.status='stopped';
 writeJson(join(context.dir,'manifest.json'),context.manifest);
 return report;
}
function baseReport(partial,manifest,played){
 const probe=partial.probe||{positions:0,disagreed:0,rate:0,examples:[]};
 return {
  format:'ua-white-sword-v4a-report',codeVersion:CODE_VERSION,profile:manifest.profile,round:manifest.round,
  status:'running',games:played,candidateCount:(partial.candidates||[]).length,
  candidates:(partial.candidates||[]).map(slim),
  screenKept:partial.advancing?.length||0,challengerId:partial.challenger?.id||null,
  championLabel:partial.champion?.label||manifest.championId||'v2',
  paired:null,mirror:null,decks:[],seat:null,tally:null,championTally:null,
  probe:{
   positions:probe.positions||0,disagreed:probe.disagreed||0,rate:probe.rate||0,
   bandPositions:probe.bandPositions??null,bandRate:probe.bandRate??null,
   versusChampion:probe.versusChampion??null,pairwise:probe.pairwise??null,
   byPhase:probe.byPhase||{},byCandidate:probe.byCandidate||{},
   regenerated:false,examples:probe.examples||[],fallbackIds:probe.fallbackIds||[]
  },
  seeds:manifest.seeds,historicalNote:manifest.historicalNote,replay:manifest.replay||null,
  harnessNote:manifest.harnessNote||null,
  stageAGames:0,stageBGames:0,stageCGames:0,
  officialV2:manifest.officialV2,production:false,deployed:false,
  startedAt:new Date(manifest.startedAt).toISOString(),
  wallMs:Date.now()-manifest.startedAt
 };
}
function eliteSnapshot(candidates,ranking,skipId){
 return (ranking||[]).filter(row=>row.id!==skipId).slice(0,2).map(row=>{
  const found=(candidates||[]).find(candidate=>candidate.id===row.id);
  if(!found?.model?.policy)return null;
  return {id:found.id,method:found.method,policy:found.model.policy.slice()};
 }).filter(Boolean);
}
function finishRound(context,outcome){
 const {stageA,stageB,stageC,advancing,challenger,screened}=outcome;
 const played=stageA.games.length+stageB.games.length+stageC.games.length;
 const report=baseReport({...context,...outcome,candidates:context.candidates},context.manifest,played);
 report.screenKept=advancing.length;
 report.eliminated=screened?.eliminated||[];
 report.stageAGames=stageA.games.length;
 report.stageBGames=stageB.games.length;
 report.stageCGames=stageC.games.length;
 report.byOpponent=byOpponent(stageB.games.length?stageB.games:stageA.games);
 if(challenger&&context.profile.stageC){
  const challengerGames=stageC.games.filter(game=>game.role==='challenger');
  const baselineGames=stageC.games.filter(game=>game.role==='baseline');
  const mirrorGames=stageC.games.filter(game=>game.role==='mirror');
  const paired=pairGames(challengerGames,baselineGames);
  const boot=clusterBootstrap(paired.pairs);
  const mirror=rateOf(mirrorGames);
  const decks=[...context.profile.stageC.decks].map(id=>{
   const rows=paired.pairs.filter(pair=>pair.deck===id);
   const delta=rows.length?rows.reduce((sum,pair)=>sum+Number(pair.challengerWin)-Number(pair.championWin),0)/rows.length:null;
   return {id,n:rows.length,delta};
  });
  const dirt=anomalyReport(stageC.games);
  report.paired={
   n:boot.n,attempted:challengerGames.length,incomplete:paired.incomplete.length,
   missing:paired.missing.length,incompleteRows:paired.incomplete.slice(0,20),
   delta:boot.delta,ci:boot.ci,clusters:boot.clusters
  };
  report.mirror=mirror;
  report.decks=decks;
  report.seat=bySeat(challengerGames);
  report.tally=meanTally(challengerGames);
  report.championTally=meanTally(baselineGames);
  report.anomalies={...dirt.totals,unfinished:dirt.unfinished};
  report.faults=dirt.faults;
  report.judgment=judgeExperimental({
   profile:context.profileName,paired:report.paired,mirror,decks,anomalies:report.anomalies
  });
 }else{
  report.judgment=judgeExperimental({profile:context.profileName,paired:null,mirror:null,decks:[],anomalies:{}});
 }
 report.promoted=!!report.judgment.promoted;
 report.stageAGames=stageA.games.length;
 report.stageBGames=stageB.games.length;
 report.stageCGames=stageC.games.length;
 if(stageC.dirt.bad){
  report.promoted=false;
  report.judgment.promoted=false;
 }
 if(report.promoted){
  writeExperimentalChampion(context.root,challenger,report.judgment);
  report.experimentalChampion=challenger.id;
 }
 if(v2Hash()!==context.official)throw Error('Official v2 changed during the round');
 // A finished schedule that fails the gate stays complete, so the next round
 // can start. stopped is only for aborting before the scheduled games exist.
 report.status='complete';
 report.nextDirection=report.promoted?'自動產生。實驗冠軍已更新，正式版不變。':'自動產生';
 const history=readJson(join(context.root,'history.json'),{rounds:[]});
 report.cumulativeGames=history.rounds.reduce((sum,row)=>sum+(row.games||0),0)+report.games;
 report.diagnosis=diagnosisOf(history.rounds,report);
 const scale=context.profileName==='round'
  ?nextSigma(context.manifest.sigmaScale||1,report.probe,report.promoted)
  :context.manifest.sigmaScale||1;
 if(context.profileName==='round'&&!report.promoted&&scale!==(context.manifest.sigmaScale||1)){
  report.nextDirection='自動產生。下一輪探索強度為 '+scale+'，單項權重仍不超過 1.5。這一輪的候選與驗證種子都不會回頭改。';
 }
 writeOutputs(context.root,context.docsRoot,context.dir,context.manifest,report);
 if(context.profileName==='round'&&report.status==='complete'){
  const previous=readJson(join(context.root,'explore-state.json'),{elites:[]});
  const elites=eliteSnapshot(context.candidates,outcome.rankedB,report.promoted?report.experimentalChampion:null);
  writeJson(join(context.root,'explore-state.json'),{
   sigmaScale:scale,updatedRound:context.roundNumber,
   disagreement:report.probe.bandRate??report.probe.rate,
   positions:report.probe.positions,bandPositions:report.probe.bandPositions??null,
   elites:elites.length?elites:(previous.elites||[])
  });
 }
 if(context.profileName==='round'&&safetyFault(report)){
  writeHalt(context.root,report.judgment?.reasons?.join('；')||'這一輪出現安全問題',context.roundNumber);
 }
 context.manifest.status=report.status;
 writeJson(join(context.dir,'manifest.json'),context.manifest);
 context.log('round '+context.roundNumber+' games '+report.games+' promoted '+report.promoted);
 return report;
}
function writeOutputs(root,docsRoot,dir,manifest,report){
 const history=readJson(join(root,'history.json'),{rounds:[]});
 history.rounds=history.rounds.filter(row=>!(row.profile===report.profile&&row.round===report.round));
 history.rounds.push(publicHistory(report));
 history.rounds.sort((a,b)=>a.round-b.round||a.profile.localeCompare(b.profile));
 writeJson(join(dir,'report.json'),report);
 writeJson(join(root,'history.json'),history);
 writeText(join(dir,'report.md'),renderRound(report));
 if(docsRoot){
  const stem=report.profile==='smoke'?'smoke':'round-'+String(report.round).padStart(4,'0');
  writeJson(join(docsRoot,stem+'.json'),report);
  writeText(join(docsRoot,stem+'.md'),renderRound(report));
  writeJson(join(docsRoot,'history.json'),history);
  writeText(join(docsRoot,'HISTORY.md'),renderHistory(history.rounds));
 }
}
function publicHistory(report){
 const probe=report.probe||{};
 return {
  profile:report.profile,round:report.round,games:report.games,cumulativeGames:report.cumulativeGames,
  probe:{
   rate:probe.rate||0,positions:probe.positions??null,
   bandRate:probe.bandRate??null,bandPositions:probe.bandPositions??null
  },
  paired:report.paired?{delta:report.paired.delta,ci:report.paired.ci,n:report.paired.n,incomplete:report.paired.incomplete||0}:null,
  promoted:report.promoted,championLabel:report.championLabel,status:report.status,
  challengerId:report.challengerId
 };
}
export async function runSequence({
 count=1,playMany,root,docsRoot,parents,log=()=>{},maxWallMs,startedAt=Date.now()
}={}){
 if(!SEQUENCE_COUNTS.includes(count))throw Error('連續輪數只接受 1、3 或 5');
 const limit=Number.isFinite(maxWallMs)?maxWallMs:SEQUENCE_WALL_MS[count];
 const reports=[];
 let games=0;
 for(let index=0;index<count;index++){
  if(Date.now()-startedAt>=limit){
   log('已達連續訓練時間上限，不再開始下一輪');
   break;
  }
  if(games+ROUND_GAME_CAP>ROUND_GAME_CAP*count)break;
  let next;
  try{next=nextRoundNumber(root);}
  catch(error){
   if(error?.code==='V4A_HALT'||error?.code==='V4A_STOPPED'){
    log(error.message);
    break;
   }
   throw error;
  }
  const report=await runRound({profile:'round',round:next.round,playMany,root,docsRoot,parents,log});
  reports.push(report);
  games+=report.games||0;
  if(report.status!=='complete'||safetyFault(report))break;
 }
 return {reports,games};
}
