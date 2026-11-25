#!/usr/bin/env node
// Mine new decisions, confirm them, then fit named residuals without touching v2 or 070.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {cellTable,interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {screenSummary} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {actionLabel,decideConfirmation,diffsOf,nextJobs,preparePositions,seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {sideKey} from '../training/white-sword-ai/v5a/lib/pressure.mjs';
import {loadPositions} from '../training/white-sword-ai/v5a/lib/analyze.mjs';
import {accumulateColumns,columnFromRow,roundColumns} from '../training/white-sword-ai/v5c/lib/columns.mjs';
import {choiceColumns,combine,diagnosticModel,fitColumns} from '../training/white-sword-ai/v5c/lib/fit.mjs';
import {
 CODE_VERSION,CONFIRM_PAIRS,CONFIRM_SALT,FROZEN_WEIGHT,MINE_SEEDS,MATCH_SEEDS,PREFERENCE_IDS,PRESERVE_IDS,
 SCALE,SCREEN_FLOOR,SCREEN_PAIRS,SCREEN_SALT,assertBudget,assertFreshList,branchGames
} from '../training/white-sword-ai/v5c/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5c/lib/report.mjs';
import {assertSchedule,fairSpecs,kindTotals} from '../training/white-sword-ai/v5c/lib/schedule.mjs';
import {confirmIdentity,selectConfirm,selectDiverse} from '../training/white-sword-ai/v5c/lib/select.mjs';
import {AUDIT_SEEDS,FAIR_SEEDS} from '../training/white-sword-ai/v5b1/lib/protocol.mjs';
import {MATCH_SEEDS as OLD_MATCH,MINE_SEEDS as OLD_MINE} from '../training/white-sword-ai/v5b/lib/protocol.mjs';
import {MINE_SEEDS as V4B7_MINE} from '../training/white-sword-ai/v4b7/lib/protocol.mjs';
import {summarizeFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v5c';
const CONTROL='training/white-sword-ai/v5b/candidate.json';
const STUDIED=[
 'training/white-sword-ai/v4b/pool.json','training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b2/selected.json',
 'training/white-sword-ai/v4b5/mine.json','training/white-sword-ai/v4b7/mine.json',
 'training/white-sword-ai/v4b8/mine.json','training/white-sword-ai/v4b9/mine.json',
 'training/white-sword-ai/v5b/mine.json'
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
  const data=readJson(file,{positions:[]});
  const positions=Array.isArray(data.positions)?data.positions:[];
  for(const position of positions)if(position?.id)ids.add(position.id);
  if(Array.isArray(data.games)){
   for(const game of data.games){
    for(const position of game?.positions||[])if(position?.id)ids.add(position.id);
   }
  }
 }
 return ids;
}
function blockedSeeds(){
 return new Set([
  ...FAIR_SEEDS,...Object.values(AUDIT_SEEDS),...OLD_MATCH,...Object.values(OLD_MINE).flat(),
  ...Object.values(V4B7_MINE).flat(),...Object.values(MINE_SEEDS).flat(),...MATCH_SEEDS
 ]);
}
function assertSeeds(){
 const mine=Object.values(MINE_SEEDS).flat();
 assertFreshList(mine,'v5c-mine');
 assertFreshList(MATCH_SEEDS,'v5c-match');
 const older=new Set([
  ...FAIR_SEEDS,...Object.values(AUDIT_SEEDS),...OLD_MATCH,...Object.values(OLD_MINE).flat(),
  ...Object.values(V4B7_MINE).flat()
 ]);
 for(const seed of [...mine,...MATCH_SEEDS])if(older.has(seed))throw Error('種子 '+seed+' 已經用過');
 if(mine.some(seed=>MATCH_SEEDS.includes(seed)))throw Error('挖掘種子和診斷種子重疊');
}
function assertRollouts(positions,salt,pairs,label,earlier=[]){
 const seeds=seedsFor(positions,salt,pairs);
 assertFreshList(seeds,label);
 const blocked=blockedSeeds();
 const prior=new Set(earlier);
 for(const seed of seeds){
  if(blocked.has(seed)||prior.has(seed))throw Error(label+' 種子 '+seed+' 撞上已用範圍');
 }
 return seeds;
}
async function mine(){
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
function describe(position){
 const cardA=cardsOf(position.actionA?.features).join(',')||null;
 const cardB=cardsOf(position.actionB?.features).join(',')||null;
 return {cardA,cardB,labelA:actionLabel(position.actionA?.key,cardA),labelB:actionLabel(position.actionB?.key,cardB)};
}
function sameModel(left,right){
 const pack=model=>JSON.stringify((model?.columns||[]).map(column=>[column.signature,column.weight]));
 return left?.id===right?.id&&left?.includes070===right?.includes070&&pack(left)===pack(right)&&pack({columns:left?.baseline})===pack({columns:right?.baseline});
}
function savedPositions(parent){
 const saved=loadPositions();
 const byId=new Map(saved.map(position=>[position.id,position]));
 for(const id of [...PREFERENCE_IDS,...PRESERVE_IDS]){
  const position=byId.get(id);
  if(!position?.band?.length)throw Error('缺少保護局面 '+id);
  if(choiceColumns(position.band,parent,[])!==chooseKey(position.band,parent,SCALE))throw Error('零欄位和 v2 的選擇不同 '+id);
 }
 for(const id of PREFERENCE_IDS){
  if(!sideKey(byId.get(id),'energy'))throw Error('070 局面沒有能量線 '+id);
 }
 return saved;
}
function publish(study,control){
 const report=renderReport(study);
 writeJson(ROOT+'/study.json',study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v5c/report.md',report);
 if(v2Hash()!==study.official)throw Error('這一輪改到了 v2');
 if(JSON.stringify(readJson(CONTROL))!==JSON.stringify(control))throw Error('這一輪改到了凍結的 070');
}

async function main(){
 const official=v2Hash();
 const control=readJson(CONTROL);
 if(control.weight!==FROZEN_WEIGHT||control.adopted!==false)throw Error('070 對照不是凍結狀態');
 assertSeeds();
 const parent=loadModel(V2_FILE).policy;
 const saved=savedPositions(parent);
 const mined=await mine();
 const known=studiedIds();
 const fresh=(mined.positions||[]).filter(position=>position?.band?.length>=2&&position.actionA?.action&&position.actionB?.action&&!known.has(position.id));
 const picked=selectDiverse(fresh);
 if(!picked.length){
  publish({
   codeVersion:CODE_VERSION,official,frozenWeight:FROZEN_WEIGHT,adopted:false,promoted:false,refit:false,
   mined:{games:mined.games,decisions:mined.decisions,found:(mined.positions||[]).length,fresh:fresh.length},
   screened:0,buckets:0,table:{},passedScreen:0,confirmCount:0,games:0,planned:0,confirmed:[],accepted:[],rejected:[],deferred:[],
   combination:{ok:false},diagnostic:null,baselineLabel:'沒有對戰',matches:null,kinds:{}
  },control);
  console.log(JSON.stringify({screened:0,confirmed:0,accepted:0,diagnostic:null,games:0}));
  return;
 }
 const {ready,dropped}=preparePositions(picked);
 if(dropped.length)throw Error('有新局面不能重現：'+dropped.join(','));
 const screenPlan={codeVersion:CODE_VERSION,ids:picked.map(position=>position.id)};
 const screenFrozen=readJson(ROOT+'/screen-plan.json',null);
 if(screenFrozen&&JSON.stringify(screenFrozen.ids)!==JSON.stringify(screenPlan.ids))throw Error('篩選名單和事先登記不一致');
 const screenSeeds=assertRollouts(picked,SCREEN_SALT,SCREEN_PAIRS,'v5c-screen');
 if(!screenFrozen)writeJson(ROOT+'/screen-plan.json',screenPlan);
 console.log('篩選',picked.length,'個局面');
 const screenRecords=await drain(ready,SCREEN_SALT,SCREEN_PAIRS,ROOT+'/screen-rollouts.jsonl');
 const packed=picked.map(position=>diffsOf(screenRecords,position.id,position.actor));
 if(packed.some(row=>row.attempts!==SCREEN_PAIRS||row.unfinished))throw Error('篩選沒有到固定的 8 組');
 const screenRows=picked.map((position,index)=>({
  id:position.id,mean:screenSummary(packed[index].diffs).mean,column:confirmIdentity(position),
  bucket:position.bucket,opponent:position.opponent,...describe(position)
 }));
 const passedScreen=screenRows.filter(row=>row.column&&row.mean<=SCREEN_FLOOR).length;
 const chosen=selectConfirm(screenRows);
 const confirmPlan={
  codeVersion:CODE_VERSION,each:chosen.length?CONFIRM_PAIRS:0,
  candidates:chosen.map(row=>{
   const position=picked.find(item=>item.id===row.id);
   return {id:row.id,screenMean:row.mean,bucket:row.bucket,opponent:row.opponent,index:picked.indexOf(position),...describe(position)};
  })
 };
 const confirmFrozen=readJson(ROOT+'/confirm-plan.json',null);
 if(confirmFrozen&&JSON.stringify(confirmFrozen.candidates)!==JSON.stringify(confirmPlan.candidates))throw Error('確認名單和事先登記不一致');
 const locked=confirmFrozen||confirmPlan;
 assertBudget(picked.length,locked.candidates.length);
 if(locked.each)assertRollouts(locked.candidates.map(row=>picked.find(item=>item.id===row.id)),CONFIRM_SALT,locked.each,'v5c-confirm',screenSeeds);
 if(!confirmFrozen)writeJson(ROOT+'/confirm-plan.json',confirmPlan);
 const confirmReady=ready.filter(row=>locked.candidates.some(candidate=>candidate.id===row.position.id));
 const confirmRecords=locked.each?await drain(confirmReady,CONFIRM_SALT,locked.each,ROOT+'/confirm-rollouts.jsonl'):[];
 const judged=locked.candidates.length?decideConfirmation(locked.candidates,confirmRecords,id=>picked.find(item=>item.id===id)?.actor):[];
 if(judged.some(row=>row.attempts!==CONFIRM_PAIRS||row.unfinished))throw Error('確認沒有到固定的 66 組');
 const confirmedRows=judged.filter(row=>row.confirmed).map(row=>{
  const position=picked.find(item=>item.id===row.id);
  return {...row,source:'v5c',confirmed:true,prefer:'B',actionA:position.actionA,actionB:position.actionB};
 });
 const rounded=roundColumns(confirmedRows);
 const accumulated=accumulateColumns([
  {sign:1,type:'play',card:'BLC-4-070',line:'energy',targets:[]},
  ...rounded
 ]);
 const columns=accumulated.kept.filter(column=>!(column.type==='play'&&column.card==='BLC-4-070'&&column.line==='energy'));
 const unnamed=confirmedRows.filter(row=>!columnFromRow(row)).map(row=>({id:row.id,reason:'確認了，但兩邊都不是可命名的單一動作'}));
 const byId=new Map(saved.map(position=>[position.id,position]));
 for(const position of picked)byId.set(position.id,position);
 const positions=[...byId.values()];
 const deferred=rounded.filter(column=>column.signature==='+|play|BLC-4-070|energy').map(column=>column.signature);
 const fitted=fitColumns(positions,parent,columns,[...PREFERENCE_IDS,...PRESERVE_IDS]);
 const controlWants=PREFERENCE_IDS.map(id=>({id,key:sideKey(byId.get(id),'energy')}));
 const combination=combine(positions,parent,fitted.accepted,{
  column:{sign:1,type:'play',card:'BLC-4-070',line:'energy',signature:'+|play|BLC-4-070|energy'},
  weight:FROZEN_WEIGHT,wants:controlWants,holds:[...PRESERVE_IDS]
 });
 const diagnostic=diagnosticModel(fitted.accepted,combination);
 const baseline=diagnostic?.includes070?[{sign:1,type:'play',card:'BLC-4-070',line:'energy',signature:'+|play|BLC-4-070|energy',weight:FROZEN_WEIGHT}]:[];
 const model=diagnostic?{
  codeVersion:CODE_VERSION,id:diagnostic.id,includes070:diagnostic.includes070,adopted:false,promoted:false,refit:false,
  columns:diagnostic.columns.map(column=>({type:column.type,card:column.card,line:column.line||null,weight:column.weight,signature:column.signature})),
  baseline
 }:null;
 const existingModel=readJson(ROOT+'/model.json',null);
 if(model&&existingModel&&!sameModel(existingModel,model))throw Error('診斷模型和事先凍結的不一致');
 if(model&&!existingModel)writeJson(ROOT+'/model.json',model);
 let matches=null;
 if(model){
  const specs=fairSpecs({seeds:MATCH_SEEDS,baseline:model.includes070});
  assertSchedule(specs);
  let done=readJsonl(ROOT+'/matches.jsonl');
  const have=new Set(done.map(row=>[row.seed,row.opponent,row.specialistSeat,row.first,row.arm].join(':')));
  const pending=specs.filter(spec=>!have.has([spec.seed,spec.opponent,spec.specialistSeat,spec.first,spec.arm].join(':')));
  console.log('公平診斷還有',pending.length,'場');
  for(let index=0;index<pending.length;index+=16){
   const played=await runPool('./white-sword-v5c-worker.mjs',pending.slice(index,index+16));
   for(const row of played)appendJsonl(ROOT+'/matches.jsonl',row);
   done=done.concat(played);
  }
  if(done.length!==specs.length)throw Error('診斷場數不是 192');
  matches=summarizeFair(done);
  matches.kinds=kindTotals(done);
 }
 const table=cellTable(picked);
 const playedGames=screenRecords.length+confirmRecords.length;
 const planned=branchGames(picked.length,locked.candidates.length);
 if(playedGames!==planned)throw Error('分支紀錄 '+playedGames+' 和計劃 '+planned+' 不一致');
 const study={
  codeVersion:CODE_VERSION,official,frozenWeight:FROZEN_WEIGHT,adopted:false,promoted:false,refit:false,
  mined:{games:mined.games,decisions:mined.decisions,found:(mined.positions||[]).length,fresh:fresh.length},
  screened:picked.length,buckets:Object.values(table).filter(row=>Object.values(row).some(count=>count>0)).length,table,passedScreen,
  confirmCount:locked.candidates.length,games:playedGames,planned,
  confirmed:confirmedRows.map(row=>({id:row.id,labelA:row.labelA,labelB:row.labelB,confirmMean:row.mean,pOne:row.pOne})),
  accepted:fitted.accepted.map(row=>({signature:row.signature,weight:row.weight,collateral:row.collateral})),
  rejected:[...unnamed,...accumulated.rejected,...fitted.rejected],deferred,combination:{ok:combination.ok},
  diagnostic:diagnostic?{id:diagnostic.id,includes070:diagnostic.includes070}:null,
  baselineLabel:diagnostic?(diagnostic.includes070?'凍結的 070 殘差':'正式 v2'):'沒有對戰',
  matches,kinds:matches?.kinds||{}
 };
 publish(study,control);
 console.log(JSON.stringify({screened:picked.length,confirmed:confirmedRows.length,accepted:fitted.accepted.length,diagnostic:diagnostic?.id||null,games:study.games}));
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
