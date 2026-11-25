#!/usr/bin/env node
// Compare two confirmed preferences, then mine a fresh round. Does not edit v2.
import {rmSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {cellTable,interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {assertFreshPlan} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {CONFIRM_PAIRS,SCREEN_FLOOR,screenSummary} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {
 actionLabel,decideConfirmation,diffsOf,learnable,nextJobs,preparePositions,seedsFor
} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {SCREEN_PAIRS} from '../training/white-sword-ai/v4b4/lib/sampling.mjs';
import {savedPositions} from '../training/white-sword-ai/v4b5/lib/update.mjs';
import {collectGame} from '../training/white-sword-ai/v4b6/lib/replay.mjs';
import {
 CLASS_LABEL,classifyRow,conflictIds,preferenceOf,searchEligible
} from '../training/white-sword-ai/v4b7/lib/catalog.mjs';
import {selectExplore} from '../training/white-sword-ai/v4b7/lib/select.mjs';
import {pickCandidate,searchPreference} from '../training/white-sword-ai/v4b7/lib/update.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {SCALE} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {choiceChanges,policyFrom} from '../training/white-sword-ai/v4b8/lib/effects.mjs';
import {evaluateJoint} from '../training/white-sword-ai/v4b8/lib/evaluate.mjs';
import {explainPair} from '../training/white-sword-ai/v4b8/lib/gap.mjs';
import {selectScreen} from '../training/white-sword-ai/v4b8/lib/lines.mjs';
import {attachMeasured,interactionDiffs,lineKeys,uncovered,valuesAt} from '../training/white-sword-ai/v4b8/lib/measure.mjs';
import {judgeOpposite} from '../training/white-sword-ai/v4b8/lib/opposite.mjs';
import {
 CODE_VERSION,CONFIRM_SALT,JOINT_IDS,JOINT_RULE,MINE_SEEDS,OPPOSITE_PENDING,OPPOSITE_RULE,OPPOSITE_SALT,
 SCREEN_CAP,SCREEN_SALT,assertBranchSeeds,assertBudget,assertJointRule,assertMineSeeds,branchGames,oppositeBudget
} from '../training/white-sword-ai/v4b8/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b8/lib/report.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v4b8';
const STUDIED=[
 'training/white-sword-ai/v4b/pool.json',
 'training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b2/pool.json',
 'training/white-sword-ai/v4b2/selected.json',
 'training/white-sword-ai/v4b5/mine.json',
 'training/white-sword-ai/v4b7/mine.json'
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
  for(const position of readJson(file,{positions:[]}).positions||[])if(position?.id)ids.add(position.id);
 }
 return ids;
}
function describe(position){
 const cardA=cardsOf(position.actionA?.features).join(',')||null;
 const cardB=cardsOf(position.actionB?.features).join(',')||null;
 return {cardA,cardB,labelA:actionLabel(position.actionA?.key,cardA),labelB:actionLabel(position.actionB?.key,cardB)};
}
function assertTarget(position){
 const keys=lineKeys(position);
 const cards=[cardsOf(position.actionA?.features).join(','),cardsOf(position.actionB?.features).join(',')];
 if(keys.front!==position.actionA?.key||keys.energy!==position.actionB?.key||cards[0]!=='BLC-4-070'||cards[1]!=='BLC-4-070'){
  throw Error(position.id+' 不是已確認的 070 前線對能量線');
 }
}
function fillContexts(positions,byId){
 const missing=positions.filter(position=>uncovered(position,byId.get(position.id)).length);
 const games=new Map();
 for(const position of missing){
  const key=position.decks.join('/')+':'+position.seed+':'+position.first;
  const game=games.get(key)||{decks:position.decks,seed:position.seed,first:position.first,marks:[]};
  game.marks.push({id:position.id,step:position.step});
  games.set(key,game);
 }
 console.log('補量',games.size,'場已保存對局');
 for(const game of games.values()){
  for(const row of collectGame(game))byId.set(row.id,row);
 }
 const still=positions.filter(position=>uncovered(position,byId.get(position.id)).length);
 if(still.length)throw Error('重播後仍缺實測：'+still.map(position=>position.id).join(','));
}
function labelFor(position,key){
 const row=(position?.band||[]).find(item=>item.key===key);
 return actionLabel(key,cardsOf(row?.features).join(',')||null);
}
function sideEffects(parent,joint,targets,saved,contexts){
 if(!joint.candidate?.ok)return null;
 const names=joint.candidate.names||[];
 const policy=policyFrom(parent,joint.candidate.weights,names);
 for(const position of targets){
  const attached=attachMeasured(position.band,contexts.get(position.id)?.actions,names);
  if(!attached.ok||chooseKey(attached.band,policy,SCALE)!==position.actionB.key){
   throw Error('實驗候選沒有改選 '+position.id);
  }
 }
 const savedChanges=choiceChanges(parent,policy,names,saved,contexts);
 const mine=(readJson('training/white-sword-ai/v4b5/mine.json',{positions:[]}).positions||[]).filter(position=>position?.band?.length>=2);
 const mineChanges=choiceChanges(parent,policy,names,mine,contexts);
 const targetsIds=new Set(targets.map(position=>position.id));
 const byId=new Map(saved.map(position=>[position.id,position]));
 const mineById=new Map(mine.map(position=>[position.id,position]));
 const labeled=(rows,lookup)=>rows.filter(row=>!targetsIds.has(row.id)).map(row=>{
  const position=lookup.get(row.id);
  return {...row,beforeLabel:labelFor(position,row.before),afterLabel:labelFor(position,row.after)};
 });
 return {
  names,
  saved:{covered:savedChanges.covered,changed:labeled(savedChanges.changed,byId)},
  mine:{covered:mineChanges.covered,changed:mineChanges.changed.filter(row=>!targetsIds.has(row.id)).length,examples:labeled(mineChanges.changed,mineById)}
 };
}
function comparisonOf(position,context,parent){
 const keys=lineKeys(position);
 return {
  id:position.id,bucket:position.bucket,opponent:position.opponent,...describe(position),
  facts:context?.facts||null,
  energy:valuesAt(context,keys.energy),
  front:valuesAt(context,keys.front),
  diffs:interactionDiffs(context,position),
  gap:explainPair(parent,position,position.actionB.key)
 };
}
function buildJoint(parent,official){
 assertJointRule();
 const saved=savedPositions();
 const previous=readJson('training/white-sword-ai/v4b7/mine.json',{positions:[]});
 const targets=JOINT_IDS.map(id=>saved.find(position=>position.id===id)||(previous.positions||[]).find(position=>position.id===id));
 if(targets.some(position=>!position))throw Error('找不到兩筆已確認偏好');
 for(const position of targets)assertTarget(position);
 const cached=readJson(ROOT+'/joint.json',null);
 if(cached?.complete&&cached.effects&&cached.official===official&&cached.rule===JOINT_RULE.id&&process.env.WS_JOINT_REFRESH!=='1')return cached;
 const contexts=new Map((readJson('training/white-sword-ai/v4b6/context.json',{rows:[]}).rows||[]).map(row=>[row.id,row]));
 fillContexts([...targets,...saved],contexts);
 const comparison=targets.map(position=>comparisonOf(position,contexts.get(position.id),parent));
 const joint=evaluateJoint(parent,targets,saved,contexts);
 const effects=sideEffects(parent,joint,targets,saved,contexts);
 const result={
  complete:true,codeVersion:CODE_VERSION,official,rule:JOINT_RULE.id,adopted:false,
  representation:joint.representation,candidate:joint.candidate,stages:joint.stages,comparison,effects
 };
 writeJson(ROOT+'/joint.json',result);
 if(result.candidate){
  writeJson(ROOT+'/candidate.json',{
   codeVersion:CODE_VERSION,official,adopted:false,recommended:false,promoted:false,
   rule:JOINT_RULE.id,representation:result.representation,
   status:result.candidate.status,objective:result.candidate.objective,
   weights:result.candidate.weights,changed:result.candidate.changed,
   releasedRaid:result.candidate.releasedRaid
  });
 }else rmSync(ROOT+'/candidate.json',{force:true});
 return result;
}
async function mine(){
 assertMineSeeds();
 const seeds=Object.values(MINE_SEEDS).flat();
 const saved=readJson(ROOT+'/mine.json',null);
 if(saved&&JSON.stringify(saved.seeds)===JSON.stringify(seeds))return saved;
 const jobs=interleaveSpecs(MINE_SEEDS).map((spec,index)=>({...spec,maxSteps:200,index}));
 console.log('挖掘',jobs.length,'場');
 const games=(await runPool('./white-sword-v4b2-mine-worker.mjs',jobs)).sort((left,right)=>(left.index??0)-(right.index??0));
 const positions=games.flatMap(game=>game.positions||[]);
 const result={seeds,games:games.length,decisions:games.reduce((sum,game)=>sum+(game.decisions||0),0),positions};
 writeJson(ROOT+'/mine.json',result);
 return result;
}
async function drain(ready,salt,pairs,file){
 let records=readJsonl(file);
 for(;;){
  const jobs=nextJobs(ready,salt,pairs,new Set(records.map(row=>row.id)),64);
  if(!jobs.length)return records;
  console.log('開抽',jobs.length,'場，已有',records.length);
  const rows=await runPool('./white-sword-v4b-rollout-worker.mjs',jobs);
  for(const row of rows)appendJsonl(file,row);
  records=records.concat(rows);
 }
}
function checkOppositeRecord(){
 const catalog=readJson('training/white-sword-ai/v4b7/catalog.json',{rows:[]});
 for(const item of OPPOSITE_PENDING){
  const row=(catalog.rows||[]).find(entry=>entry.id===item.id);
  if(!row||row.confirmed||row.conflict!==true||Math.abs(row.screenMean-item.screenMean)>1e-9){
   throw Error('相反篩選紀錄和事先登記不一致');
  }
 }
}
async function confirmOpposite(picked,candidateCount){
 const budget=oppositeBudget(picked.length,candidateCount);
 const base={ran:false,leftover:budget.leftover,games:0,both:false,rows:OPPOSITE_PENDING.map(item=>({...item}))};
 if(!budget.confirm)return base;
 assertBudget(picked.length,candidateCount+2);
 const previous=readJson('training/white-sword-ai/v4b7/mine.json',{positions:[]});
 const positions=OPPOSITE_PENDING.map(item=>(previous.positions||[]).find(position=>position.id===item.id));
 if(positions.some(position=>!position))throw Error('找不到待確認的相反局面');
 const used=new Set([
  ...seedsFor(picked,SCREEN_SALT,SCREEN_PAIRS),
  ...seedsFor(picked,CONFIRM_SALT,CONFIRM_PAIRS),
  ...Object.values(MINE_SEEDS).flat()
 ]);
 const oppositeSeeds=seedsFor(positions,OPPOSITE_SALT,CONFIRM_PAIRS);
 assertFreshPlan(oppositeSeeds,'v4b8-opposite');
 for(const seed of oppositeSeeds)if(used.has(seed))throw Error('相反確認種子撞上這一輪');
 const prepared=preparePositions(positions);
 if(prepared.dropped.length)throw Error('相反局面不能重現：'+prepared.dropped.join(','));
 const records=await drain(prepared.ready,OPPOSITE_SALT,CONFIRM_PAIRS,ROOT+'/opposite-rollouts.jsonl');
 const pairs=positions.map(position=>{
  const packed=diffsOf(records,position.id,position.actor);
  if(packed.attempts!==CONFIRM_PAIRS||packed.unfinished)throw Error('相反確認沒有到固定的 66 組');
  const pending=OPPOSITE_PENDING.find(item=>item.id===position.id);
  return {id:position.id,screenMean:pending.screenMean,diffs:packed.diffs};
 });
 const judged=judgeOpposite(pairs);
 return {ran:true,leftover:budget.leftover,games:records.length,both:judged.both,rows:judged.rows};
}
function verdictOf(joint,catalog,opposite){
 const confirmed=catalog.filter(row=>row.confirmed).length;
 let head;
 if(joint.representation==='existing')head='既有 115 維有一組合法權重可以同時改選兩筆已確認偏好。實驗候選沒有採用，模型維持現有欄位。';
 else if(joint.representation==='position-action')head='既有 115 維的單步方盒放不進第二筆。事先登記的局面交互有一組合法權重，只留下實驗候選，沒有採用。這不是棋力提升。';
 else if(joint.representation==='registered-interactions')head='局面交互放不進兩筆已確認偏好。加上卡牌路線欄之後才有合法權重。那一欄只看被打出的卡，不是局面相關的共同因素。實驗候選沒有採用。';
 else if(joint.representation==='blocked')head='交互欄缺少完整實測，這次沒有建立共同權重。';
 else head='既有 115 維和已登記的通用交互都沒有一組合法權重能同時改選兩筆並保住錨點。模型維持現狀，沒有建立實驗候選。';
 if(opposite.both)head+=' BLC-4-060 的兩個方向通過了獨立確認。這是局面相關的相反選擇，這一輪仍不因此建立權重。';
 else head+=' BLC-4-060 的兩個相反方向仍只是篩選資料。';
 head+=confirmed?' 新局面有 '+confirmed+' 筆 Holm 確認。兩筆舊偏好加上這些新結果，仍不代表棋力提升。':' 新局面沒有新的 Holm 確認偏好。';
 return head;
}
async function main(){
 const official=v2Hash();
 checkOppositeRecord();
 const parent=loadModel(V2_FILE).policy;
 const joint=buildJoint(parent,official);
 if(v2Hash()!==official)throw Error('共同分析改到了 v2');
 if(process.env.WS_STOP==='joint'){
  console.log(JSON.stringify({
   representation:joint.representation,
   existing:joint.stages?.existing?.status,
   position:joint.stages?.position?.status||null,
   full:joint.stages?.full?.status||null,
   facts:joint.comparison.map(row=>({id:row.id,energy:row.facts?.energyTotal,unmet:row.facts?.unmet,relief:row.energy?.pay_relief,gap:row.gap?.blend,swing:row.gap?.swing}))
  }));
  return;
 }
 const mined=await mine();
 const known=studiedIds();
 const fresh=(mined.positions||[]).filter(position=>position?.band?.length>=2&&position.actionA?.action&&position.actionB?.action&&!known.has(position.id));
 const selection=selectScreen(fresh);
 const picked=selection.chosen;
 if(!picked.length)throw Error('新挖掘沒有可用局面');
 if(picked.length>SCREEN_CAP)throw Error('篩選超過 42');
 for(const row of selection.lines){
  if(!picked.some(position=>position.id===row.position.id))throw Error('路線配額被篩選上限切掉');
 }
 assertBranchSeeds(seedsFor(picked,SCREEN_SALT,SCREEN_PAIRS),seedsFor(picked,CONFIRM_SALT,CONFIRM_PAIRS));
 console.log('篩選新局面',picked.length,'路線',selection.lines.length,'舊局面已排除',known.size);
 const {ready,dropped}=preparePositions(picked);
 if(dropped.length)throw Error('有新局面不能重現：'+dropped.join(','));
 const screenRecords=await drain(ready,SCREEN_SALT,SCREEN_PAIRS,ROOT+'/screen-rollouts.jsonl');
 const packed=picked.map(position=>diffsOf(screenRecords,position.id,position.actor));
 if(packed.some(row=>row.attempts!==SCREEN_PAIRS||row.unfinished))throw Error('篩選沒有到固定的 8 組完成配對');
 const flags=picked.map(position=>learnable(parent,position));
 const summaries=packed.map(row=>screenSummary(row.diffs));
 const chosen=selectExplore(summaries,flags);
 const frozen={
  codeVersion:CODE_VERSION,floor:SCREEN_FLOOR,screenPairs:SCREEN_PAIRS,each:chosen.length?CONFIRM_PAIRS:0,
  screenSalt:SCREEN_SALT,confirmSalt:CONFIRM_SALT,
  candidates:chosen.map(row=>({
   index:row.index,id:picked[row.index].id,role:row.role,screenMean:row.mean,
   bucket:picked[row.index].bucket,opponent:picked[row.index].opponent,
   learnable:row.learnable,...describe(picked[row.index])
  }))
 };
 const existing=readJson(ROOT+'/screen.json',null);
 if(existing&&JSON.stringify(existing.candidates)!==JSON.stringify(frozen.candidates))throw Error('篩選檔和這次計算不一致');
 if(!existing)writeJson(ROOT+'/screen.json',frozen);
 const locked=existing||frozen;
 assertBudget(picked.length,locked.candidates.length);
 const actors=new Map(picked.map(position=>[position.id,position.actor]));
 const confirmReady=ready.filter(row=>locked.candidates.some(candidate=>candidate.id===row.position.id));
 const confirmRecords=locked.each?await drain(confirmReady,CONFIRM_SALT,locked.each,ROOT+'/confirm-rollouts.jsonl'):[];
 const judged=decideConfirmation(locked.candidates,confirmRecords,id=>actors.get(id));
 if(judged.some(row=>row.attempts!==CONFIRM_PAIRS||row.unfinished))throw Error('確認沒有到固定的 66 組完成配對');
 const opposite=await confirmOpposite(picked,locked.candidates.length);
 const byId=new Map(judged.map(row=>[row.id,row]));
 const preferences=picked.map((position,index)=>({
  id:position.id,mean:summaries[index].mean,...preferenceOf(position,summaries[index].mean)
 }));
 const conflicts=conflictIds(preferences);
 const catalog=picked.map((position,index)=>{
  const choice=locked.candidates.find(row=>row.id===position.id);
  const outcome=byId.get(position.id);
  return {
   id:position.id,bucket:position.bucket,opponent:position.opponent,
   screenMean:summaries[index].mean,learnable:flags[index]===true,
   qualified:summaries[index].mean<=SCREEN_FLOOR,role:choice?.role||null,
   confirmed:outcome?.confirmed===true,conflict:conflicts.has(position.id),
   pOne:outcome?.pOne??null,confirmMean:outcome?.mean??null,
   ...describe(position)
  };
 });
 const searches=[];
 for(const row of catalog){
  if(!searchEligible(row))continue;
  const position=picked.find(item=>item.id===row.id);
  const found=searchPreference(parent,position,savedPositions());
  row.searchStatus=found.ok?found.status:'failed';
  searches.push({id:row.id,...found,adopted:false});
 }
 for(const row of catalog){
  row.class=classifyRow(row);
  row.label=CLASS_LABEL[row.class];
 }
 const newCandidate=pickCandidate(searches);
 if(newCandidate){
  writeJson(ROOT+'/new-search.json',{
   codeVersion:CODE_VERSION,official,adopted:false,recommended:false,promoted:false,
   id:newCandidate.id,status:newCandidate.status,objective:newCandidate.objective,
   weights:newCandidate.weights,necessary:newCandidate.necessary,changed:newCandidate.changed
  });
 }else rmSync(ROOT+'/new-search.json',{force:true});
 if(v2Hash()!==official)throw Error('這一輪改到了 v2');
 const games=screenRecords.length+confirmRecords.length;
 const study={
  codeVersion:CODE_VERSION,official,rule:JOINT_RULE.id,oppositeRule:OPPOSITE_RULE.id,
  adopted:false,weightsWritten:false,
  comparison:joint.comparison,joint,candidate:joint.candidate,
  mined:{games:mined.games,decisions:mined.decisions,found:(mined.positions||[]).length,fresh:fresh.length},
  screened:picked.length,
  lines:{
   available:selection.available,
   taken:{
    'front-kept':selection.lines.filter(row=>row.direction==='front-kept').length,
    'energy-kept':selection.lines.filter(row=>row.direction==='energy-kept').length
   }
  },
  table:cellTable(picked),
  qualified:catalog.filter(row=>row.qualified).length,
  candidates:locked.candidates.length,
  roles:{
   learnable:locked.candidates.filter(row=>row.role==='learnable').length,
   reserved:locked.candidates.filter(row=>row.role==='reserved').length
  },
  confirmed:catalog.filter(row=>row.confirmed).length,
  games,planned:branchGames(picked.length,locked.candidates.length)+opposite.games,
  screenSalt:SCREEN_SALT,confirmSalt:CONFIRM_SALT,
  learnableCandidates:catalog.filter(row=>row.role==='learnable'),
  reservedCandidates:catalog.filter(row=>row.role==='reserved'),
  confirmedRows:catalog.filter(row=>row.confirmed),
  catalog,opposite,
  newCandidate:newCandidate?{id:newCandidate.id,status:newCandidate.status,objective:newCandidate.objective,weights:newCandidate.weights}:null
 };
 study.verdict=verdictOf(joint,catalog,opposite);
 writeJson(ROOT+'/catalog.json',{rows:catalog,opposite});
 writeJson(ROOT+'/study.json',study);
 const text=renderReport(study);
 writeText(ROOT+'/report.md',text);
 writeText('docs/white-sword-ai/v4b8/report.md',text);
 console.log(study.verdict);
 console.log('局面',picked.length,'確認',study.confirmed,'分支',games,'相反',opposite.ran?'已跑':'未跑');
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
