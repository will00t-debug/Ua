#!/usr/bin/env node
// Mine fresh BLC-4-060 activate-versus-end positions, confirm both directions,
// and install a hard-cap comparison rule only when a held-out position agrees.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {assertFreshPlan} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {screenSummary} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {actionLabel,decideConfirmation,diffsOf,nextJobs,preparePositions,seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {loadPositions} from '../training/white-sword-ai/v5a/lib/analyze.mjs';
import {choiceColumns} from '../training/white-sword-ai/v5c/lib/fit.mjs';
import {summarizeFair} from '../training/white-sword-ai/v5b1/lib/fair.mjs';
import {
 cappedChoice,choiceRules,learnRules,pairDirection,residualLead,sameSignature,signatureKey,switchesToAlternative
} from '../training/white-sword-ai/v5d/lib/compare.mjs';
import {
 CODE_VERSION,CONFIRM_PAIRS,CONFIRM_SALT,EE6C_ID,FAMILY_CAP,FAMILY_MIN,FROZEN_WEIGHT,HARM_ID,
 MATCH_SEEDS,MINE_BATCHES,PREFERENCE_IDS,RAID_ID,SCALE,SCREEN_FLOOR,SCREEN_PAIRS,SCREEN_SALT,
 assertBudget,batchPlan,branchGames,earlierSeeds
} from '../training/white-sword-ai/v5d/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5d/lib/report.mjs';
import {assertSchedule,fairSpecs,kindTotals} from '../training/white-sword-ai/v5d/lib/schedule.mjs';
import {isActivate060Pair,selectFamily,splitRoles} from '../training/white-sword-ai/v5d/lib/select.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v5d';
const CONTROL='training/white-sword-ai/v5b/candidate.json';
const ACTIVATE={type:'activate',card:'BLC-4-060',line:null};
const END={type:'next',card:null,line:null};
const STUDIED=[
 'training/white-sword-ai/v4b/pool.json','training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b2/pool.json','training/white-sword-ai/v4b2/selected.json',
 'training/white-sword-ai/v4b5/mine.json','training/white-sword-ai/v4b7/mine.json',
 'training/white-sword-ai/v4b8/mine.json','training/white-sword-ai/v4b9/mine.json',
 'training/white-sword-ai/v5b/mine.json','training/white-sword-ai/v5c/mine.json'
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
function familyCount(positions,known){
 const ids=new Set();
 for(const position of positions||[]){
  if(position?.id&&position.band?.length>=2&&!known.has(position.id)&&isActivate060Pair(position))ids.add(position.id);
 }
 return ids;
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
  for(const seed of jobs)have.add(seed.seed);
  const count=familyCount(saved.positions,known).size;
  console.log('新的起動對結束局面 '+count+' 個');
  if(count>=FAMILY_CAP){
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
 return {cardA,cardB,labelA:actionLabel(position.actionA?.key,cardA),labelB:actionLabel(position.actionB?.key,cardB)};
}
function orientation(position){
 const pair=pairDirection(position);
 return {
  preferEnd:!!pair&&sameSignature(pair.loser,ACTIVATE)&&sameSignature(pair.winner,END),
  preferActivate:!!pair&&sameSignature(pair.winner,ACTIVATE)&&sameSignature(pair.loser,END)
 };
}
function assertRollouts(positions,salt,pairs,label,blocked){
 const seeds=seedsFor(positions,salt,pairs);
 assertFreshPlan(seeds,label);
 for(const seed of seeds)if(blocked.has(seed))throw Error(label+' 種子 '+seed+' 撞上已用範圍');
 return seeds;
}
function publish(study,control){
 const report=renderReport(study);
 writeJson(ROOT+'/study.json',study);
 writeText(ROOT+'/report.md',report);
 writeText('docs/white-sword-ai/v5d/report.md',report);
 if(v2Hash()!==study.official)throw Error('這一輪改到了 v2');
 if(JSON.stringify(readJson(CONTROL))!==JSON.stringify(control))throw Error('這一輪改到了凍結的 070');
}
function sameModel(left,right){
 return JSON.stringify(left?.rules||[])===JSON.stringify(right?.rules||[])&&left?.id===right?.id;
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
 const fresh=[...familyCount(mined.positions,known)].map(id=>mined.positions.find(position=>position.id===id));
 let plan=readJson(ROOT+'/sample-plan.json',null);
 if(!plan){
  const split=splitRoles(selectFamily(fresh,FAMILY_CAP));
  plan={
   codeVersion:CODE_VERSION,stopped:split.length<FAMILY_MIN?'too-few':'ready',
   ids:split.map(row=>row.id),roles:Object.fromEntries(split.map(row=>[row.id,row.role]))
  };
  writeJson(ROOT+'/sample-plan.json',plan);
 }
 const grouped=splitRoles(plan.ids.map(id=>({id})));
 for(const row of grouped)if(plan.roles[row.id]!==row.role)throw Error('訓練和驗證的分組被改過');
 const picked=plan.ids.map(id=>{
  const position=fresh.find(row=>row.id===id);
  if(!position)throw Error('名單裡的局面不在這次挖掘：'+id);
  return {...position,role:plan.roles[id]};
 });
 const baseStudy={
  codeVersion:CODE_VERSION,official,frozenWeight:FROZEN_WEIGHT,adopted:false,promoted:false,
  mined:{games:mined.games,decisions:mined.decisions,family:fresh.length,selected:picked.length,stopped:mined.stopped},
  rows:[],leads:[],forActivate:0,againstActivate:0,collateral:0,heldMoves:[],ee6cMoved:false,ee6cToNext:false,
  games:0,installed:false,reason:plan.stopped==='too-few'?'新的起動對結束局面不到 4 個，不做分支抽樣':null,
  matches:null,kinds:{},finished:0,illegal:0,v2Changes:0,fallbacks:0,orders:0,ties:0
 };
 if(plan.stopped!=='ready'){
  publish(baseStudy,control);
  console.log(JSON.stringify({selected:picked.length,installed:false,games:0}));
  return;
 }
 const {ready,dropped}=preparePositions(picked);
 if(dropped.length)throw Error('有新局面不能重現：'+dropped.join(','));
 const blocked=new Set([...earlierSeeds(),...mined.seeds,...MATCH_SEEDS]);
 const screenPlan={codeVersion:CODE_VERSION,ids:picked.map(position=>position.id),roles:plan.roles};
 const screenFrozen=readJson(ROOT+'/screen-plan.json',null);
 if(screenFrozen&&JSON.stringify(screenFrozen.ids)!==JSON.stringify(screenPlan.ids))throw Error('篩選名單和事先登記不一致');
 const screenSeeds=assertRollouts(picked,SCREEN_SALT,SCREEN_PAIRS,'v5d-screen',blocked);
 if(!screenFrozen)writeJson(ROOT+'/screen-plan.json',screenPlan);
 console.log('篩選 '+picked.length+' 個局面');
 const screenRecords=await drain(ready,SCREEN_SALT,SCREEN_PAIRS,ROOT+'/screen-rollouts.jsonl');
 const packed=picked.map(position=>diffsOf(screenRecords,position.id,position.actor));
 if(packed.some(row=>row.attempts!==SCREEN_PAIRS||row.unfinished))throw Error('篩選沒有到固定的 8 組');
 const screenRows=picked.map((position,index)=>({
  id:position.id,role:position.role,screenMean:screenSummary(packed[index].diffs).mean,
  ...orientation(position),...describe(position)
 }));
 const chosen=screenRows.filter(row=>row.screenMean<=SCREEN_FLOOR).sort((left,right)=>left.id<right.id?-1:1);
 const confirmPlan={codeVersion:CODE_VERSION,each:chosen.length?CONFIRM_PAIRS:0,candidates:chosen.map(row=>({id:row.id,role:row.role,screenMean:row.screenMean}))};
 const confirmFrozen=readJson(ROOT+'/confirm-plan.json',null);
 if(confirmFrozen&&JSON.stringify(confirmFrozen.candidates)!==JSON.stringify(confirmPlan.candidates))throw Error('確認名單和事先登記不一致');
 const locked=confirmFrozen||confirmPlan;
 assertBudget(picked.length,locked.candidates.length);
 if(locked.each)assertRollouts(locked.candidates.map(row=>picked.find(position=>position.id===row.id)),CONFIRM_SALT,locked.each,'v5d-confirm',new Set([...blocked,...screenSeeds]));
 if(!confirmFrozen)writeJson(ROOT+'/confirm-plan.json',confirmPlan);
 const confirmReady=ready.filter(row=>locked.candidates.some(candidate=>candidate.id===row.position.id));
 const confirmRecords=locked.each?await drain(confirmReady,CONFIRM_SALT,locked.each,ROOT+'/confirm-rollouts.jsonl'):[];
 const judged=locked.candidates.length?decideConfirmation(locked.candidates,confirmRecords,id=>picked.find(position=>position.id===id)?.actor):[];
 if(judged.some(row=>row.attempts!==CONFIRM_PAIRS||row.unfinished))throw Error('確認沒有到固定的 66 組');
 const byJudged=new Map(judged.map(row=>[row.id,row]));
 const rows=screenRows.map(row=>{
  const judgedRow=byJudged.get(row.id);
  const position=picked.find(item=>item.id===row.id);
  return {...row,...judgedRow,actionA:position.actionA,actionB:position.actionB,confirmed:judgedRow?.confirmed===true};
 });
 const confirmed=rows.filter(row=>row.confirmed);
 const learned=learnRules(confirmed.filter(row=>row.role==='train'),confirmed.filter(row=>row.role==='validation'));
 const proposal=learned.ok?learned.rules:[];
 const missed=proposal.length?proposal.flatMap(rule=>[...rule.trainIds,...learned.support]).filter((id,index,list)=>list.indexOf(id)===index).filter(id=>{
  const position=picked.find(row=>row.id===id);
  return !switchesToAlternative(position,parent,proposal);
 }):[];
 const heldMoves=[];
 let ee6cMoved=false;
 let ee6cToNext=false;
 let collateral=0;
 if(proposal.length){
  for(const position of saved){
   if(!position?.band||position.band.length<2)continue;
   if(cappedChoice(position.band,parent)!==choiceRules(position.band,parent,proposal))collateral++;
  }
  for(const id of [...PREFERENCE_IDS,HARM_ID,RAID_ID]){
   const position=savedById.get(id);
   if(cappedChoice(position.band,parent)!==choiceRules(position.band,parent,proposal))heldMoves.push(id);
  }
  const historic=savedById.get(EE6C_ID);
  const before=cappedChoice(historic.band,parent);
  const after=choiceRules(historic.band,parent,proposal);
  ee6cMoved=before!==after;
  ee6cToNext=ee6cMoved&&JSON.parse(after).type==='next';
 }
 let reason=learned.reason;
 if(proposal.length&&missed.length)reason='已確認的局面在硬分上限內沒有改到對照動作：'+missed.join(',');
 else if(proposal.length&&(heldMoves.length||(ee6cMoved&&!ee6cToNext)))reason='規則會改動要保護的局面'+(heldMoves.length?'：'+heldMoves.join('、'):'');
 const installed=!!proposal.length&&!missed.length&&!heldMoves.length&&!(ee6cMoved&&!ee6cToNext);
 const rules=installed?proposal.map(rule=>({loser:rule.loser,winner:rule.winner})):[];
 const controlColumn=[{sign:1,type:'play',card:'BLC-4-070',line:'energy',weight:FROZEN_WEIGHT}];
 const leads=picked.map(position=>{
  const gap=residualLead(position,parent);
  const same=choiceColumns(position.band,parent,controlColumn)===chooseKey(position.band,parent,SCALE);
  return {id:position.id,lead:gap?.lead,maxMove:gap?.maxMove,canFlip:!!gap?.canFlip,controlSame:same};
 });
 const model=installed?{
  codeVersion:CODE_VERSION,id:rules.map(rule=>signatureKey(rule.loser)+'=>'+signatureKey(rule.winner)).join(';'),
  adopted:false,promoted:false,rules
 }:null;
 const existingModel=readJson(ROOT+'/model.json',null);
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
   const played=await runPool('./white-sword-v5d-worker.mjs',pending.slice(index,index+16));
   for(const row of played)appendJsonl(ROOT+'/matches.jsonl',row);
   done=done.concat(played);
  }
  if(done.length!==specs.length)throw Error('診斷場數不是 192');
  matches=summarizeFair(done);
 }
 const playedGames=screenRecords.length+confirmRecords.length;
 const planned=branchGames(picked.length,locked.candidates.length);
 if(playedGames!==planned)throw Error('分支紀錄 '+playedGames+' 和計劃 '+planned+' 不一致');
 const study={
  ...baseStudy,rows,leads,reason,installed,collateral,heldMoves,ee6cMoved,ee6cToNext,games:playedGames,
  forActivate:confirmed.filter(row=>row.preferActivate).length,
  againstActivate:confirmed.filter(row=>row.preferEnd).length,
  matches,kinds:matches?kindTotals(done):{},
  finished:matches?.finished||0,illegal:matches?.illegal||0,v2Changes:matches?.v2Changes||0,
  fallbacks:done.filter(row=>row.arm!=='v2').reduce((sum,row)=>sum+(row.fallbacks||0),0),
  orders:done.filter(row=>row.arm!=='v2').reduce((sum,row)=>sum+(row.orders||0),0),
  ties:done.filter(row=>row.arm!=='v2').reduce((sum,row)=>sum+(row.ties||0),0)
 };
 publish(study,control);
 console.log(JSON.stringify({selected:picked.length,confirmed:confirmed.length,installed,games:playedGames}));
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
