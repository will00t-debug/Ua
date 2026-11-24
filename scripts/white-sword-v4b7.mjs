#!/usr/bin/env node
// Fresh positions, then the verified two-stage test. Does not edit v2.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {cellTable,interleaveSpecs,selectBalanced} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {CONFIRM_PAIRS,SCREEN_FLOOR,screenSummary} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {
 actionLabel,decideConfirmation,diffsOf,learnable,nextJobs,preparePositions,seedsFor
} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {SCREEN_PAIRS} from '../training/white-sword-ai/v4b4/lib/sampling.mjs';
import {savedPositions} from '../training/white-sword-ai/v4b5/lib/update.mjs';
import {
 CLASS_LABEL,classifyRow,conflictIds,filterRecord,preferenceOf,retainedRecords,searchEligible
} from '../training/white-sword-ai/v4b7/lib/catalog.mjs';
import {
 CODE_VERSION,CONFIRM_SALT,MINE_SEEDS,PER_CELL,SCREEN_CAP,SCREEN_SALT,
 assertBranchSeeds,assertBudget,assertMineSeeds,branchGames
} from '../training/white-sword-ai/v4b7/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b7/lib/report.mjs';
import {selectExplore} from '../training/white-sword-ai/v4b7/lib/select.mjs';
import {pickCandidate,searchPreference} from '../training/white-sword-ai/v4b7/lib/update.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v4b7';
const STUDIED=[
 'training/white-sword-ai/v4b/pool.json',
 'training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b2/pool.json',
 'training/white-sword-ai/v4b2/selected.json',
 'training/white-sword-ai/v4b5/mine.json'
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
async function mine(){
 assertMineSeeds();
 const seeds=Object.values(MINE_SEEDS).flat();
 const saved=readJson(ROOT+'/mine.json',null);
 if(saved&&JSON.stringify(saved.seeds)===JSON.stringify(seeds))return saved;
 const jobs=interleaveSpecs(MINE_SEEDS).map((spec,index)=>({...spec,maxSteps:200,index}));
 console.log('挖掘',jobs.length,'場');
 const games=(await runPool('./white-sword-v4b2-mine-worker.mjs',jobs)).sort((left,right)=>(left.index??0)-(right.index??0));
 const positions=games.flatMap(game=>game.positions||[]);
 const result={
  seeds,games:games.length,
  decisions:games.reduce((sum,game)=>sum+(game.decisions||0),0),
  positions
 };
 writeJson(ROOT+'/mine.json',result);
 return result;
}
function describe(position){
 const cardA=cardsOf(position.actionA?.features).join(',')||null;
 const cardB=cardsOf(position.actionB?.features).join(',')||null;
 return {
  cardA,cardB,
  labelA:actionLabel(position.actionA?.key,cardA),
  labelB:actionLabel(position.actionB?.key,cardB)
 };
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
function priorFeature(){
 const study=readJson('training/white-sword-ai/v4b6/study.json',{features:[]});
 const hand=(study.features||[]).find(row=>row.name==='hand_short');
 return filterRecord(hand?.targetDiff??2.25,hand?.protect070?.max??1.625);
}
async function main(){
 const official=v2Hash();
 const parent=loadModel(V2_FILE).policy;
 const mined=await mine();
 const known=studiedIds();
 const fresh=(mined.positions||[]).filter(position=>position?.band?.length>=2&&position.actionA?.action&&position.actionB?.action&&!known.has(position.id));
 const picked=selectBalanced(fresh,{perCell:PER_CELL}).chosen.slice(0,SCREEN_CAP);
 if(!picked.length)throw Error('新挖掘沒有可用局面');
 assertBranchSeeds(seedsFor(picked,SCREEN_SALT,SCREEN_PAIRS),seedsFor(picked,CONFIRM_SALT,CONFIRM_PAIRS));
 console.log('篩選新局面',picked.length,'舊局面已排除',known.size);
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
  searches.push({id:row.id,...found});
 }
 for(const row of catalog){
  row.class=classifyRow(row);
  row.label=CLASS_LABEL[row.class];
 }
 const candidate=pickCandidate(searches);
 if(candidate){
  writeJson(ROOT+'/candidate.json',{
   codeVersion:CODE_VERSION,official,adopted:false,recommended:false,promoted:false,
   id:candidate.id,status:candidate.status,objective:candidate.objective,
   weights:candidate.weights,necessary:candidate.necessary,changed:candidate.changed,
   delta:candidate.delta,policy:candidate.policy
  });
 }
 if(v2Hash()!==official)throw Error('這一輪改到了 v2');
 const note=priorFeature();
 const games=screenRecords.length+confirmRecords.length;
 const study={
  codeVersion:CODE_VERSION,official,adopted:false,weightsWritten:false,
  mined:{games:mined.games,decisions:mined.decisions,found:(mined.positions||[]).length,fresh:fresh.length},
  screened:picked.length,perCell:PER_CELL,table:cellTable(picked),
  qualified:catalog.filter(row=>row.qualified).length,
  candidates:locked.candidates.length,
  roles:{
   learnable:locked.candidates.filter(row=>row.role==='learnable').length,
   reserved:locked.candidates.filter(row=>row.role==='reserved').length
  },
  confirmed:catalog.filter(row=>row.confirmed).length,
  games,planned:branchGames(picked.length,locked.candidates.length),
  screenSalt:SCREEN_SALT,confirmSalt:CONFIRM_SALT,
  learnableCandidates:catalog.filter(row=>row.role==='learnable'),
  reservedCandidates:catalog.filter(row=>row.role==='reserved'),
  confirmedRows:catalog.filter(row=>row.confirmed),
  catalog,retained:retainedRecords(note),feature:note,
  candidate:candidate?{id:candidate.id,status:candidate.status,objective:candidate.objective,weights:candidate.weights,necessary:candidate.necessary,changed:candidate.changed}:null
 };
 const confirmedRows=catalog.filter(row=>row.confirmed);
 study.verdict=candidate
  ?'找到新的可學習確認偏好，並留下一個未採用的實驗權重。'
  :confirmedRows.length&&confirmedRows.every(row=>row.role==='reserved'||row.learnable===false)
   ?'Holm 確認了一筆現有單步方盒學不會的偏好。它只留下表示能力不足的證據，沒有搜尋權重，也沒有為它新增特徵。'
   :confirmedRows.length
    ?'有經過 Holm 的確認結果。方向相反或方盒無解的不建立權重。'
    :'這一輪沒有新的 Holm 確認偏好。沒有為了用滿名額而降低門檻。';
 writeJson(ROOT+'/catalog.json',{retained:study.retained,rows:catalog});
 writeJson(ROOT+'/study.json',study);
 const text=renderReport(study);
 writeText(ROOT+'/report.md',text);
 writeText('docs/white-sword-ai/v4b7/report.md',text);
 console.log(study.verdict,'局面',picked.length,'確認',study.confirmed,'分支',games);
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
