#!/usr/bin/env node
// Learn one frozen-v2 residual column, then test its collateral changes.
import {Worker} from 'node:worker_threads';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {choiceKey} from '../training/white-sword-ai/v4a/lib/diverge.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {blendScore} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {CONFIRM_PAIRS} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {actionLabel,diffsOf,nextJobs,preparePositions,seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {judgeDirected} from '../training/white-sword-ai/v4b9/lib/directed.mjs';
import {loadPositions} from '../training/white-sword-ai/v5a/lib/analyze.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {matchSpecs,playResidualMatch,summarizeMatches} from '../training/white-sword-ai/v5b/lib/match.mjs';
import {
 BRANCH_BUDGET,CODE_VERSION,EE6C_ID,FEATURE,MATCH_OPPONENTS,MATCH_SEEDS,MINE_SEEDS,OFFICIAL_V2,
 PREFERENCE_IDS,SCALE,VALIDATE_SALT,assertSeparated,budgetFor,fullMatchGate,installColumn
} from '../training/white-sword-ai/v5b/lib/protocol.mjs';
import {residualChoice,residualScore,sameAsV2} from '../training/white-sword-ai/v5b/lib/residual.mjs';
import {renderReport} from '../training/white-sword-ai/v5b/lib/report.mjs';
import {selectCollateral} from '../training/white-sword-ai/v5b/lib/select.mjs';
import {describeFlip,sweep} from '../training/white-sword-ai/v5b/lib/sweep.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v5b';

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
function validationPosition(position,v2Key,candidateKey){
 const replay=replayState(position);
 const legal=legalUniversalActions(replay.packs,replay.state).map(action=>({key:choiceKey(action),action}));
 const left=legal.find(item=>item.key===v2Key);
 const right=legal.find(item=>item.key===candidateKey);
 if(!left||!right)return null;
 const pack=item=>{
  const action={...item.action};
  delete action.key;
  return {key:item.key,action,hard:0,features:[]};
 };
 return {...position,actionA:pack(left),actionB:pack(right)};
}
function flipsOf(list,weights,feature,weight,freshIds){
 const rows=[];
 for(const position of list){
  if(!position?.band||position.band.length<2)continue;
  if(PREFERENCE_IDS.includes(position.id))continue;
  const before=chooseKey(position.band,weights,SCALE);
  const after=residualChoice(position.band,weights,weight,feature);
  if(before===after)continue;
  rows.push(describeFlip(position,before,after,freshIds.has(position.id)));
 }
 return rows;
}
function publish(study){
 const report=renderReport(study);
 writeJson(ROOT+'/study.json',study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v5b/report.md',report);
 if(v2Hash()!==study.official)throw Error('這一輪改到了 v2');
}

async function main(){
 const official=v2Hash();
 if(official!==OFFICIAL_V2)throw Error('正式 v2 雜湊和登記不一致');
 const installed=installColumn();
 if(!installed.ok)throw Error(installed.reason);
 const feature=installed.feature;
 if(installed.text!==FEATURE)throw Error('導出的欄位和凍結簽名不一致');
 const model=loadModel(V2_FILE);
 const weights=model.policy;
 const positions=loadPositions();
 const byId=new Map(positions.map(position=>[position.id,position]));
 for(const id of [...PREFERENCE_IDS,EE6C_ID])if(!byId.has(id))throw Error('找不到已保存局面 '+id);
 let checked=0;
 for(const position of positions){
  if(!position.band||position.band.length<2)continue;
  const row=position.band[0];
  if(Math.abs(residualScore(row,weights,0,feature)-blendScore(row.hard,weights,row.features,SCALE))>1e-9){
   throw Error(position.id+' 在權重 0 時分數和 v2 不同');
  }
  if(!sameAsV2(position.band,weights,feature))throw Error(position.id+' 在權重 0 時選擇和 v2 不同');
  checked++;
 }
 console.log('權重 0 核對',checked,'個局面');
 const searched=sweep(positions,weights,feature);
 const picked=searched.rows.find(row=>row.id===searched.picked)||null;
 const candidate={
  codeVersion:CODE_VERSION,official,feature:installed.text,
  id:picked?.id||null,weight:picked?.weight??null,points:picked?.points??null,
  eligible:!!picked,adopted:false,recommended:false,promoted:false
 };
 const prior=readJson(ROOT+'/candidate.json',null);
 if(prior&&(prior.feature!==candidate.feature||Math.abs((prior.weight??0)-(candidate.weight??0))>1e-6)){
  throw Error('重新計算的權重和已凍結的候選不一致');
 }
 if(!prior)writeJson(ROOT+'/candidate.json',candidate);
 const rows=searched.rows.map(row=>{
  const {flips,...rest}=row;
  return {...rest,flipIds:flips.map(item=>item.id)};
 });
 console.log(JSON.stringify(rows.map(row=>({id:row.id,weight:row.weight,points:row.points,changes:row.changes,collateral:row.collateral,eligible:row.eligible}))));
 let study={
  official,codeVersion:CODE_VERSION,feature:installed.text,checked,
  minimum:searched.minimum,picked:searched.picked,rows,
  mined:null,validation:{ran:false,positions:0,games:0,rows:[]},
  gate:null,matches:null
 };
 if(!picked){
  publish(study);
  console.log('沒有可凍結的候選');
  return;
 }
 const mineSeeds=Object.values(MINE_SEEDS).flat();
 assertSeparated(mineSeeds,[],[]);
 let mine=readJson(ROOT+'/mine.json',null);
 if(!mine||JSON.stringify(mine.seeds)!==JSON.stringify(mineSeeds)){
  const jobs=interleaveSpecs(MINE_SEEDS).map((spec,index)=>({...spec,maxSteps:200,index}));
  console.log('挖掘',jobs.length,'場');
  const games=(await runPool('./white-sword-v4b2-mine-worker.mjs',jobs)).sort((left,right)=>(left.index??0)-(right.index??0));
  mine={seeds:mineSeeds,games:games.length,positions:games.flatMap(game=>game.positions||[])};
  writeJson(ROOT+'/mine.json',mine);
 }
 const freshIds=new Set((mine.positions||[]).filter(position=>position?.id&&!byId.has(position.id)).map(position=>position.id));
 const savedFlips=flipsOf(positions,weights,feature,picked.weight,new Set());
 const freshFlips=flipsOf(mine.positions||[],weights,feature,picked.weight,freshIds);
 const selected=selectCollateral([...savedFlips,...freshFlips]);
 const plan={
  codeVersion:CODE_VERSION,rule:'v5b-validate-1',weight:picked.weight,
  ids:selected.map(row=>row.id),roles:selected.map(row=>row.role)
 };
 const frozen=readJson(ROOT+'/validate-plan.json',null);
 if(frozen&&JSON.stringify(frozen.ids)!==JSON.stringify(plan.ids))throw Error('驗證名單和事先登記不一致');
 if(!frozen)writeJson(ROOT+'/validate-plan.json',plan);
 const lookup=new Map([...positions,...(mine.positions||[])].map(position=>[position.id,position]));
 const built=[];
 for(const row of selected){
  const source=lookup.get(row.id);
  const made=source?validationPosition(source,row.beforeKey,row.afterKey):null;
  if(!made)throw Error(row.id+' 的候選動作不能重現');
  built.push({...row,position:made});
 }
 const games=budgetFor(built.length);
 if(games>BRANCH_BUDGET)throw Error('分支場數超過 1056');
 study.mined={games:mine.games,positions:(mine.positions||[]).length,fresh:freshIds.size,flips:freshFlips.length};
 study.validation.positions=built.length;
 if(!built.length){
  study.gate=fullMatchGate([]);
  publish(study);
  console.log('沒有連帶改選可驗證');
  return;
 }
 const validateSeeds=seedsFor(built.map(row=>row.position),VALIDATE_SALT,CONFIRM_PAIRS);
 assertSeparated(mineSeeds,validateSeeds,MATCH_SEEDS);
 const ready=preparePositions(built.map(row=>row.position));
 if(ready.dropped.length)throw Error('驗證局面不能重現：'+ready.dropped.join(','));
 const records=await drain(ready.ready,VALIDATE_SALT,CONFIRM_PAIRS,ROOT+'/validate-rollouts.jsonl');
 const input=built.map(row=>{
  const packed=diffsOf(records,row.id,row.position.actor);
  if(packed.attempts!==CONFIRM_PAIRS||packed.unfinished)throw Error(row.id+' 的驗證沒有到 66 組');
  return {id:row.id,direction:'positive',diffs:packed.diffs};
 });
 const judged=judgeDirected(input);
 const validationRows=judged.map((row,index)=>{
  const source=built[index];
  return {
   ...row,role:source.role,opponent:source.opponent,bucket:source.bucket,stage:source.stage,
   labelA:actionLabel(source.beforeKey,source.beforeCard),
   labelB:actionLabel(source.afterKey,source.afterCard)
  };
 });
 const gate=fullMatchGate(validationRows);
 study.validation={ran:true,positions:built.length,games:records.length,rows:validationRows};
 study.gate=gate;
 let matches=null;
 if(gate.open){
  const specs=matchSpecs({
   seeds:MATCH_SEEDS,opponents:MATCH_OPPONENTS,model,weight:picked.weight,feature
  });
  if(specs.length!==96)throw Error('診斷不是 96 場');
  let done=readJsonl(ROOT+'/matches.jsonl');
  const have=new Set(done.map(row=>row.seed+':'+row.opponent+':'+row.specialistSeat+':'+row.first));
  const pending=specs.filter(spec=>!have.has(spec.seed+':'+spec.opponent+':'+spec.specialistSeat+':'+spec.first));
  console.log('診斷還有',pending.length,'場');
  if(pending.length){
   const played=await runPool('./white-sword-v5b-match-worker.mjs',pending.map(spec=>({
    seed:spec.seed,opponent:spec.opponent,specialistSeat:spec.specialistSeat,first:spec.first,
    weight:picked.weight,seats:spec.seats.map(seat=>({
     deckId:seat.deckId,policy:seat.policy,residual:seat.residual,weight:seat.weight||0
    }))
   })));
   for(const row of played)appendJsonl(ROOT+'/matches.jsonl',row);
   done=done.concat(played);
  }
  matches=summarizeMatches(done);
  matches.adopted=false;
  matches.promoted=false;
 }
 study.matches=matches;
 publish(study);
 console.log(JSON.stringify({picked:picked.id,weight:picked.weight,games:study.validation.games,gate:gate.open}));
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
