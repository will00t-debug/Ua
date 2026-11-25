#!/usr/bin/env node
// Mine fresh BLC-4-060 activate-versus-end games, confirm all eight at 66 pairs,
// and install a pairwise rule only when each rule has its own held-out support.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {assertFreshPlan} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {actionLabel,nextJobs,preparePositions,seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {loadPositions} from '../training/white-sword-ai/v5a/lib/analyze.mjs';
import {choiceColumns} from '../training/white-sword-ai/v5c/lib/fit.mjs';
import {seedInterval} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {summarizeFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {assertSchedule,fairSpecs,kindTotals} from '../training/white-sword-ai/v5d/lib/schedule.mjs';
import {
 cappedChoice,choiceRules,learnRules,residualLead,signatureKey,signatureOf,switchesToAlternative
} from '../training/white-sword-ai/v5d/lib/compare.mjs';
import {contextContrast,publicContext} from '../training/white-sword-ai/v5d1/lib/context.mjs';
import {judgeTwoSided} from '../training/white-sword-ai/v5d1/lib/judge.mjs';
import {
 CODE_VERSION,CONFIRM_PAIRS,CONFIRM_SALT,EE6C_ID,FAMILY_GAMES,FROZEN_WEIGHT,HARM_ID,MATCH_SEEDS,
 MINE_BATCHES,PREFERENCE_IDS,RAID_ID,SCALE,batchPlan,earlierSeeds
} from '../training/white-sword-ai/v5d1/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5d1/lib/report.mjs';
import {gameCoverage,selectBalancedGames,splitByOpponent} from '../training/white-sword-ai/v5d1/lib/select.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v5d1';
const CONTROL='training/white-sword-ai/v5b/candidate.json';
const STUDIED=[
 'training/white-sword-ai/v4b/pool.json','training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b2/selected.json',
 'training/white-sword-ai/v4b5/mine.json','training/white-sword-ai/v4b7/mine.json',
 'training/white-sword-ai/v4b8/mine.json','training/white-sword-ai/v4b9/mine.json',
 'training/white-sword-ai/v5b/mine.json','training/white-sword-ai/v5c/mine.json',
 'training/white-sword-ai/v5d/mine.json'
];

function runPool(file,items){
 return new Promise((resolve,reject)=>{
  if(!items.length){resolve([]);return;}
  const results=new Array(items.length);
  let cursor=0;
  let finished=0;
  const pool=[];
  let failed=false;
  const fail=error=>{
   if(failed)return;
   failed=true;
   for(const worker of pool)worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  const assign=(worker,index)=>{
   const onMessage=message=>{
    worker.off('message',onMessage);
    if(!message?.ok)return fail(message?.error||'worker failed');
    results[index]=message.row;
    finished++;
    if(cursor<items.length)assign(worker,cursor++);
    else if(finished===items.length){
     for(const item of pool)item.terminate();
     resolve(results);
    }
   };
   worker.on('message',onMessage);
   worker.postMessage(items[index]);
  };
  for(let index=0;index<Math.min(WORKERS,items.length);index++){
   const worker=new Worker(new URL(file,import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function studiedIds(){
 const ids=new Set();
 for(const file of STUDIED){
  const data=readJson(file,{});
  for(const position of data.positions||[])if(position?.id)ids.add(position.id);
  if(Array.isArray(data.games)){
   for(const game of data.games)for(const position of game?.positions||[])if(position?.id)ids.add(position.id);
  }
 }
 return ids;
}
function freshFamily(positions,known){
 const rows=[];
 const seen=new Set();
 for(const position of positions||[]){
  if(!position?.id||seen.has(position.id)||known.has(position.id)||position.band?.length<2)continue;
  seen.add(position.id);
  rows.push(position);
 }
 return rows;
}
async function mineAll(known){
 let saved=readJson(ROOT+'/mine.json',null)||{seeds:[],positions:[],games:0,decisions:0,stopped:null};
 if(readJson(ROOT+'/sample-plan.json',null))return saved;
 if(saved.stopped)return saved;
 const have=new Set(saved.seeds||[]);
 for(let batch=0;batch<MINE_BATCHES;batch++){
  const jobs=interleaveSpecs(batchPlan(batch)).filter(job=>!have.has(job.seed)).map(job=>({...job,maxSteps:200}));
  if(!jobs.length)continue;
  console.log('挖掘第 '+(batch+1)+' 批，'+jobs.length+' 場');
  const games=await runPool('./white-sword-v4b2-mine-worker.mjs',jobs);
  saved.positions.push(...games.flatMap(game=>game.positions||[]));
  saved.seeds.push(...jobs.map(job=>job.seed));
  saved.games+=games.length;
  saved.decisions+=games.reduce((sum,game)=>sum+(game.decisions||0),0);
  for(const job of jobs)have.add(job.seed);
  const coverage=gameCoverage(freshFamily(saved.positions,known));
  console.log('不同對局 '+coverage.games+' 個，可拆對手 '+coverage.splittable+' 個');
  if(coverage.ready){
   saved.stopped='enough';
   writeJson(ROOT+'/mine.json',saved);
   return saved;
  }
  writeJson(ROOT+'/mine.json',saved);
 }
 saved.stopped='cap';
 writeJson(ROOT+'/mine.json',saved);
 return saved;
}
async function drain(ready,salt,pairs,file){
 let records=readJsonl(file);
 for(;;){
  const jobs=nextJobs(ready,salt,pairs,new Set(records.map(row=>row.id)),64);
  if(!jobs.length)return records;
  console.log('開抽 '+jobs.length+' 場，已有 '+records.length);
  const rows=await runPool('./white-sword-v4b-rollout-worker.mjs',jobs);
  for(const row of rows)appendJsonl(file,row);
  records=records.concat(rows);
 }
}
function describe(position){
 const cardA=cardsOf(position.actionA?.features).join(',')||null;
 const cardB=cardsOf(position.actionB?.features).join(',')||null;
 return {labelA:actionLabel(position.actionA?.key,cardA),labelB:actionLabel(position.actionB?.key,cardB)};
}
function orient(row){
 if(!row?.confirmed||!row.mean)return null;
 if(row.mean<0)return row;
 return {...row,actionA:row.actionB,actionB:row.actionA};
}
function favors(row,kind){
 const preferred=row.mean<0?row.actionB:row.mean>0?row.actionA:null;
 const signature=signatureOf(preferred);
 if(kind==='end')return signature?.type==='next';
 return signature?.type==='activate'&&signature.card==='BLC-4-060';
}
function publish(study,control){
 const report=renderReport(study);
 writeJson(ROOT+'/study.json',study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v5d1/report.md',report);
 if(v2Hash()!==study.official)throw Error('這一輪改到了 v2');
 if(JSON.stringify(readJson(CONTROL))!==JSON.stringify(control))throw Error('這一輪改到了凍結的 070');
}
function slim(row){
 return {
  id:row.id,role:row.role,seed:row.seed,opponent:row.opponent,bucket:row.bucket,
  labelA:row.labelA,labelB:row.labelB,mean:row.mean,low:row.low,high:row.high,pTwo:row.pTwo,
  plus:row.plus,minus:row.minus,tie:row.tie,favor:row.favor,holm:row.holm,confirmed:row.confirmed,
  context:row.context||null
 };
}

async function main(){
 const official=v2Hash();
 const control=readJson(CONTROL);
 if(control.weight!==FROZEN_WEIGHT||control.adopted!==false)throw Error('070 對照不是凍結狀態');
 const parent=loadModel(V2_FILE).policy;
 const saved=loadPositions();
 const savedById=new Map(saved.map(position=>[position.id,position]));
 for(const id of [...PREFERENCE_IDS,HARM_ID,RAID_ID,EE6C_ID]){
  if(!savedById.get(id)?.band?.length)throw Error('缺少保護局面 '+id);
 }
 const known=studiedIds();
 const mined=await mineAll(known);
 const fresh=freshFamily(mined.positions,known);
 const coverage=gameCoverage(fresh);
 let plan=readJson(ROOT+'/sample-plan.json',null);
 if(!plan){
  const picked=selectBalancedGames(fresh,FAMILY_GAMES);
  const split=picked.length>=FAMILY_GAMES?splitByOpponent(picked):{rows:[],singletonOpponents:[]};
  plan={
   codeVersion:CODE_VERSION,
   stopped:split.rows.length===FAMILY_GAMES?'ready':'too-few',
   ids:split.rows.map(row=>row.id),
   roles:Object.fromEntries(split.rows.map(row=>[row.id,row.role])),
   games:split.rows.map(row=>row.opponent+'|'+row.seed),
   singletonOpponents:split.singletonOpponents
  };
  writeJson(ROOT+'/sample-plan.json',plan);
 }
 const byId=new Map(fresh.map(position=>[position.id,position]));
 const picked=plan.ids.map(id=>{
  const position=byId.get(id);
  if(!position)throw Error('名單裡的局面不在這次挖掘：'+id);
  return {...position,role:plan.roles[id]};
 });
 const check=splitByOpponent(picked);
 for(const row of check.rows)if(plan.roles[row.id]!==row.role)throw Error('訓練和驗證的分組被改過');
 const base={
  codeVersion:CODE_VERSION,official,frozenWeight:FROZEN_WEIGHT,adopted:false,promoted:false,
  singletonOpponents:plan.singletonOpponents||[],
  mined:{games:mined.games,decisions:mined.decisions,positions:fresh.length,gamesDistinct:coverage.games,selected:picked.length,stopped:mined.stopped},
  rows:[],leads:[],games:0,installed:false,
  reason:plan.stopped==='too-few'?'不同原始對局不到 8 個，不做 1056 場分支':null,
  matches:null,kinds:{}
 };
 if(plan.stopped!=='ready'){
  publish(base,control);
  console.log(JSON.stringify({selected:picked.length,installed:false,games:0}));
  return;
 }
 const {ready,dropped}=preparePositions(picked);
 if(dropped.length)throw Error('有新局面不能重現：'+dropped.join(','));
 const described=new Map(picked.map(position=>{
  const replay=replayState(position);
  return [position.id,{...describe(position),context:publicContext(replay.packs,replay.state,position.actor)}];
 }));
 const blocked=new Set([...earlierSeeds(),...mined.seeds,...MATCH_SEEDS]);
 const confirmPlan={
  codeVersion:CODE_VERSION,each:CONFIRM_PAIRS,
  candidates:picked.map(position=>({id:position.id,role:position.role,seed:position.seed,opponent:position.opponent}))
 };
 const confirmFrozen=readJson(ROOT+'/confirm-plan.json',null);
 if(confirmFrozen&&JSON.stringify(confirmFrozen.candidates)!==JSON.stringify(confirmPlan.candidates))throw Error('確認名單和事先登記不一致');
 const locked=confirmFrozen||confirmPlan;
 if(locked.candidates.length!==FAMILY_GAMES)throw Error('確認名單不是 8 個局面');
 assertFreshPlan(seedsFor(picked,CONFIRM_SALT,CONFIRM_PAIRS),'v5d1-confirm');
 for(const seed of seedsFor(picked,CONFIRM_SALT,CONFIRM_PAIRS))if(blocked.has(seed))throw Error('確認種子 '+seed+' 撞上已用範圍');
 if(!confirmFrozen)writeJson(ROOT+'/confirm-plan.json',confirmPlan);
 console.log('確認 '+picked.length+' 個局面，各 66 組');
 const records=await drain(ready,CONFIRM_SALT,CONFIRM_PAIRS,ROOT+'/confirm-rollouts.jsonl');
 const judged=[
  ...judgeTwoSided(picked.filter(position=>position.role==='train'),records,id=>byId.get(id)?.actor),
  ...judgeTwoSided(picked.filter(position=>position.role==='validation'),records,id=>byId.get(id)?.actor)
 ];
 if(judged.some(row=>row.attempts!==CONFIRM_PAIRS||row.unfinished))throw Error('確認沒有到固定的 66 組');
 const rows=judged.map(row=>{
  const position=byId.get(row.id);
  const extra=described.get(row.id);
  return {...row,...extra,actionA:position.actionA,actionB:position.actionB,band:position.band,bucket:position.bucket};
 });
 const train=rows.filter(row=>row.role==='train');
 const validation=rows.filter(row=>row.role==='validation');
 const learned=learnRules(train.map(orient).filter(Boolean),validation.map(orient).filter(Boolean));
 const proposal=learned.ok?learned.rules:[];
 const supportIds=[...new Set(proposal.flatMap(rule=>[...rule.trainIds,...rule.validationIds]))];
 const missedSwitch=supportIds.filter(id=>{
  const row=rows.find(item=>item.id===id);
  const oriented=orient(row);
  return !oriented||!switchesToAlternative(oriented,parent,proposal);
 });
 const changedValidation=proposal.flatMap(rule=>rule.validationIds).filter(id=>{
  const position=byId.get(id);
  return cappedChoice(position.band,parent)!==choiceRules(position.band,parent,proposal);
 });
 let reason=learned.reason;
 if(proposal.length&&missedSwitch.length)reason='已確認的局面沒有改到較好的動作：'+missedSwitch.join(',');
 else if(proposal.length&&!changedValidation.length)reason='規則沒有在驗證局面改動 v2 的選擇';
 const heldMoves=[];
 let ee6cMoved=false;
 let ee6cToNext=false;
 if(proposal.length&&!missedSwitch.length&&changedValidation.length){
  for(const id of [...PREFERENCE_IDS,HARM_ID,RAID_ID]){
   const position=savedById.get(id);
   if(cappedChoice(position.band,parent)!==choiceRules(position.band,parent,proposal))heldMoves.push(id);
  }
  const historic=savedById.get(EE6C_ID);
  const before=cappedChoice(historic.band,parent);
  const after=choiceRules(historic.band,parent,proposal);
  ee6cMoved=before!==after;
  ee6cToNext=ee6cMoved&&JSON.parse(after).type==='next';
  if(heldMoves.length||(ee6cMoved&&!ee6cToNext))reason='規則會改動要保護的局面'+(heldMoves.length?'：'+heldMoves.join('、'):'');
 }
 const installed=!!proposal.length&&!missedSwitch.length&&!!changedValidation.length&&!heldMoves.length&&!(ee6cMoved&&!ee6cToNext)&&!reason;
 const rules=installed?proposal.map(rule=>({loser:rule.loser,winner:rule.winner})):[];
 const leads=picked.map(position=>{
  const gap=residualLead(position,parent);
  return {id:position.id,lead:gap?.lead,canFlip:!!gap?.canFlip,controlSame:choiceColumns(position.band,parent,[{sign:1,type:'play',card:'BLC-4-070',line:'energy',weight:FROZEN_WEIGHT}])===chooseKey(position.band,parent,SCALE)};
 });
 const model=installed?{
  codeVersion:CODE_VERSION,id:rules.map(rule=>signatureKey(rule.loser)+'=>'+signatureKey(rule.winner)).join(';'),
  adopted:false,promoted:false,rules
 }:null;
 const existingModel=readJson(ROOT+'/model.json',null);
 const sameModel=(left,right)=>JSON.stringify(left?.rules||[])===JSON.stringify(right?.rules||[]);
 if(model&&existingModel&&!sameModel(existingModel,model))throw Error('診斷模型和事先凍結的不一致');
 if(model&&!existingModel)writeJson(ROOT+'/model.json',model);
 if(!model&&existingModel)throw Error('這次沒有安裝規則，但模型檔還在');
 let matches=null;
 let done=[];
 if(model){
  const specs=fairSpecs({seeds:MATCH_SEEDS});
  assertSchedule(specs);
  done=readJsonl(ROOT+'/matches.jsonl');
  const have=new Set(done.map(row=>[row.seed,row.opponent,row.specialistSeat,row.first,row.arm].join(':')));
  const pending=specs.filter(spec=>!have.has([spec.seed,spec.opponent,spec.specialistSeat,spec.first,spec.arm].join(':')));
  console.log('公平診斷還有 '+pending.length+' 場');
  for(let index=0;index<pending.length;index+=16){
   const played=await runPool('./white-sword-v5d1-worker.mjs',pending.slice(index,index+16));
   for(const row of played)appendJsonl(ROOT+'/matches.jsonl',row);
   done=done.concat(played);
  }
  if(done.length!==specs.length)throw Error('診斷場數不是 192');
  matches=summarizeFair(done);
 }
 if(records.length!==branchGames())throw Error('分支紀錄 '+records.length+' 和 1056 不一致');
 const study={
  ...base,reason,installed,rules,leads,rows:rows.map(slim),games:records.length,
  trainConfirmed:train.filter(row=>row.confirmed).length,
  validationConfirmed:validation.filter(row=>row.confirmed).length,
  trainEnd:train.filter(row=>row.confirmed&&favors(row,'end')).length,
  trainActivate:train.filter(row=>row.confirmed&&favors(row,'activate')).length,
  validationEnd:validation.filter(row=>row.confirmed&&favors(row,'end')).length,
  validationActivate:validation.filter(row=>row.confirmed&&favors(row,'activate')).length,
  validationNegative:validation.filter(row=>row.mean<0).length,
  validationPositive:validation.filter(row=>row.mean>0).length,
  validationTie:validation.filter(row=>row.mean===0).length,
  gameInterval:seedInterval(validation.map(row=>[row.mean])),
  contrast:contextContrast(rows),
  matches,kinds:matches?kindTotals(done):{},
  finished:matches?.finished||0,illegal:matches?.illegal||0
 };
 publish(study,control);
 console.log(JSON.stringify({selected:picked.length,confirmed:rows.filter(row=>row.confirmed).length,installed,games:records.length}));
}
function branchGames(){
 return FAMILY_GAMES*CONFIRM_PAIRS*2;
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
