#!/usr/bin/env node
// Confirm three screen-only directions, then test one shared step. Does not edit v2.
import {Worker} from 'node:worker_threads';
import {legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {choiceKey} from '../training/white-sword-ai/v4a/lib/diverge.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {appendJsonl,readJson,readJsonl,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {SCALE} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {interleaveSpecs} from '../training/white-sword-ai/v4b2/lib/balance.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {CONFIRM_PAIRS} from '../training/white-sword-ai/v4b4/lib/confirm.mjs';
import {actionLabel,diffsOf,nextJobs,preparePositions,seedsFor} from '../training/white-sword-ai/v4b4/lib/round.mjs';
import {savedPositions} from '../training/white-sword-ai/v4b5/lib/update.mjs';
import {replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {collectGame} from '../training/white-sword-ai/v4b6/lib/replay.mjs';
import {withZeros} from '../training/white-sword-ai/v4b6/lib/expand.mjs';
import {choiceChanges,policyFrom} from '../training/white-sword-ai/v4b8/lib/effects.mjs';
import {attachMeasured,lineKeys,uncovered} from '../training/white-sword-ai/v4b8/lib/measure.mjs';
import {judgeDirected} from '../training/white-sword-ai/v4b9/lib/directed.mjs';
import {explainHashes} from '../training/white-sword-ai/v4b9/lib/hash.mjs';
import {pickCandidate,runRepresentation,scoreFixed} from '../training/white-sword-ai/v4b9/lib/study.mjs';
import {repeatedIds,selectValidation} from '../training/white-sword-ai/v4b9/lib/validate.mjs';
import {
 ANCHOR_ID,BRANCH_BUDGET,CODE_VERSION,CONFIRM_PLAN,CONFIRM_SALT,ENERGY_IDS,MINE_SEEDS,POSITION_INTERACTIONS,
 RAID_ID,VALIDATE_SALT,assertBranchSeeds,assertBudget,assertJointRule,assertMineSeeds
} from '../training/white-sword-ai/v4b9/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b9/lib/report.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v4b9';
const FILES=[
 'training/white-sword-ai/v4b2/pool.json',
 'training/white-sword-ai/v4b/selected.json',
 'training/white-sword-ai/v4b5/mine.json',
 'training/white-sword-ai/v4b7/mine.json',
 'training/white-sword-ai/v4b8/mine.json'
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
function loadAll(){
 const byId=new Map();
 for(const file of FILES){
  for(const position of readJson(file,{positions:[]}).positions||[]){
   if(position?.id&&position.band?.length>=2&&!byId.has(position.id))byId.set(position.id,position);
  }
 }
 return byId;
}
function catalogMean(file,id){
 const row=(readJson(file,{rows:[]}).rows||[]).find(item=>item.id===id);
 return row?row.screenMean:null;
}
function assertPlan(position,plan){
 const file=plan.source==='v4b8'?'training/white-sword-ai/v4b8/catalog.json':'training/white-sword-ai/v4b7/catalog.json';
 const mean=catalogMean(file,plan.id);
 if(mean==null||Math.abs(mean-plan.screenMean)>1e-9)throw Error(plan.id+' 的篩選平均和事先登記不一致');
 if(plan.id==='d8a4e2b6f8d32818'){
  const keys=lineKeys(position);
  const cards=[cardsOf(position.actionA?.features).join(','),cardsOf(position.actionB?.features).join(',')];
  if(keys.front!==position.actionA?.key||keys.energy!==position.actionB?.key||cards[0]!=='BLC-4-070'||cards[1]!=='BLC-4-070'){
   throw Error('d8a4 不是 070 的前線對能量線');
  }
 }else{
  const left=JSON.parse(position.actionA.key);
  const right=JSON.parse(position.actionB.key);
  if(left.type!=='activate'||cardsOf(position.actionA.features).join(',')!=='BLC-4-060'||right.type!=='next'){
   throw Error(plan.id+' 不是起動 060 對結束行動');
  }
 }
}
function assertEnergy(position){
 const keys=lineKeys(position);
 const cards=[cardsOf(position.actionA?.features).join(','),cardsOf(position.actionB?.features).join(',')];
 if(keys.front!==position.actionA?.key||keys.energy!==position.actionB?.key||cards[0]!=='BLC-4-070'||cards[1]!=='BLC-4-070'){
  throw Error(position.id+' 不是已確認的 070 能量線偏好');
 }
}
function fillContexts(positions,contexts){
 const missing=positions.filter(position=>uncovered(position,contexts.get(position.id)).length);
 const games=new Map();
 for(const position of missing){
  const key=position.decks.join('/')+':'+position.seed+':'+position.first;
  const game=games.get(key)||{decks:position.decks,seed:position.seed,first:position.first,marks:[]};
  game.marks.push({id:position.id,step:position.step});
  games.set(key,game);
 }
 console.log('補量',games.size,'場');
 for(const game of games.values()){
  for(const row of collectGame(game))contexts.set(row.id,row);
 }
 const still=positions.filter(position=>uncovered(position,contexts.get(position.id)).length);
 if(still.length)throw Error('重播後仍缺實測：'+still.slice(0,8).map(position=>position.id).join(','));
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
function bandOf(position,contexts,names){
 if(!names.length)return position.band;
 const attached=attachMeasured(position.band,contexts.get(position.id)?.actions,names);
 if(!attached.ok)throw Error(position.id+' 缺交互實測');
 return attached.band;
}
function shape(position,parent,contexts,names,keepKey){
 const band=bandOf(position,contexts,names);
 const key=keepKey||chooseKey(position.band,parent,SCALE);
 if(names.length&&chooseKey(band,withZeros(parent,names),SCALE)!==chooseKey(position.band,parent,SCALE)){
  throw Error(position.id+' 在新欄位權重為 0 時改了選擇');
 }
 return {id:position.id,keepKey:key,band,hard:String(position.id).startsWith(ANCHOR_ID)};
}
function summarize(run){
 return {
  targetsOk:run.targetsOk,frontOk:run.frontOk,raidOk:run.raidOk,raidRequired:run.raidRequired,keepsRaid:run.keepsRaid,
  ok:run.fit?.ok===true,status:run.fit?.status||null,objective:run.fit?.objective??null,
  weights:run.fit?.weights||[],changed:run.fit?.changed||[]
 };
}
function labelFor(position,key){
 const row=(position.band||[]).find(item=>item.key===key);
 return actionLabel(key,cardsOf(row?.features).join(',')||null);
}
function roleFor(position,beforeKey,afterKey,fresh){
 if(!beforeKey||beforeKey===afterKey)return null;
 if(position.id===RAID_ID)return 'raid';
 if(fresh)return 'fresh';
 const before=JSON.parse(beforeKey);
 const after=JSON.parse(afterKey);
 const beforeCard=cardsOf((position.band||[]).find(row=>row.key===beforeKey)?.features).join(',');
 const afterCard=cardsOf((position.band||[]).find(row=>row.key===afterKey)?.features).join(',');
 if(after.type==='play'&&after.line==='energy'&&afterCard&&afterCard!=='BLC-4-070')return 'other-energy';
 if(before.type==='play'&&before.line==='front'&&beforeCard)return 'keep-front';
 return null;
}
function flipsOf(changes,lookup,fresh){
 const rows=[];
 for(const change of changes){
  const position=lookup.get(change.id);
  if(!position)continue;
  const role=roleFor(position,change.before,change.after,fresh);
  if(!role)continue;
  rows.push({
   id:change.id,changed:true,role,bucket:position.bucket,opponent:position.opponent,
   beforeLabel:labelFor(position,change.before),afterLabel:labelFor(position,change.after),
   beforeKey:change.before,afterKey:change.after
  });
 }
 return rows;
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
function verdictOf(confirm,candidate,validation){
 const passed=confirm.filter(row=>row.confirmed).map(row=>row.text||row.id);
 let text=passed.length?'通過 Holm 的是 '+passed.join('、')+'。':'三筆事先登記的方向都沒有通過 Holm。';
 text+='沒有通過的結果是證據不足，不是兩個動作相同。';
 if(!candidate)text+='沒有能同時保住三筆能量線偏好和必須保護的選擇的實驗步，所以沒有做集中驗證。';
 else if(!validation?.ran)text+='實驗步沒有落到事先登記的驗證角色，所以沒有花驗證場數。沒有抽到的改選也不因此安全。';
 else if(candidate.keepsRaid)text+='有實驗步保住三筆能量線偏好和 067 突襲。驗證不構成採用。';
 else text+='能保住共同偏好的實驗步仍然放開 067 突襲。不顯著的驗證也不表示這個連帶是安全的。';
 if(validation?.rows?.some(row=>row.status==='confirmed'))text+='集中驗證裡有局面顯示原選擇顯著較好。';
 text+='v2 沒有改，棋力沒有因此提升。';
 return text;
}
async function main(){
 assertJointRule();
 const official=v2Hash();
 const parent=loadModel(V2_FILE).policy;
 const library=loadAll();
 const saved=savedPositions();
 const targets=ENERGY_IDS.map(id=>library.get(id)||saved.find(position=>position.id===id));
 if(targets.some(position=>!position))throw Error('找不到三筆已確認的能量線偏好');
 for(const position of targets)assertEnergy(position);
 const confirmPositions=CONFIRM_PLAN.map(plan=>{
  const position=library.get(plan.id);
  if(!position)throw Error('找不到要確認的局面 '+plan.id);
  assertPlan(position,plan);
  return position;
 });
 assertBranchSeeds(seedsFor(confirmPositions,CONFIRM_SALT,CONFIRM_PAIRS),[]);
 const hash=explainHashes(parent,[...library.values()]);
 if(hash.structural)throw Error('可還原的動作和雜湊位元不一致：'+hash.structural+'/'+hash.checked);
 writeJson(ROOT+'/hash.json',{
  checked:hash.checked,mismatched:hash.mismatched,structural:hash.structural,line:hash.line,
  weights:hash.weights,
  bins:hash.bins.map(bin=>({name:bin.name,weight:bin.weight,points:bin.points,observed:bin.observed,unresolved:bin.unresolved,space:bin.space}))
 });
 const prepared=preparePositions(confirmPositions);
 if(prepared.dropped.length)throw Error('確認局面不能重現：'+prepared.dropped.join(','));
 const confirmRecords=await drain(prepared.ready,CONFIRM_SALT,CONFIRM_PAIRS,ROOT+'/confirm-rollouts.jsonl');
 const confirmInput=CONFIRM_PLAN.map(plan=>{
  const position=confirmPositions.find(item=>item.id===plan.id);
  const packed=diffsOf(confirmRecords,plan.id,position.actor);
  if(packed.attempts!==CONFIRM_PAIRS||packed.unfinished)throw Error(plan.id+' 沒有到固定的 66 組');
  return {id:plan.id,direction:plan.direction,diffs:packed.diffs,text:plan.text,screenMean:plan.screenMean};
 });
 const judged=judgeDirected(confirmInput);
 const confirm=CONFIRM_PLAN.map((plan,index)=>({
  ...plan,...judged[index],
  labelA:actionLabel(confirmPositions[index].actionA.key,cardsOf(confirmPositions[index].actionA.features).join(',')||null),
  labelB:actionLabel(confirmPositions[index].actionB.key,cardsOf(confirmPositions[index].actionB.features).join(',')||null)
 }));
 const frontConfirmed=confirm.find(row=>row.id==='d8a4e2b6f8d32818')?.confirmed===true;
 writeJson(ROOT+'/confirm.json',{codeVersion:CODE_VERSION,official,frontConfirmed,rows:confirm,games:confirmRecords.length});
 const anchor=saved.find(position=>String(position.id).startsWith(ANCHOR_ID));
 const raid=library.get(RAID_ID)||saved.find(position=>position.id===RAID_ID);
 const front=frontConfirmed?library.get('d8a4e2b6f8d32818'):null;
 if(!anchor||!raid)throw Error('找不到錨點或 067 突襲');
 const contexts=new Map((readJson('training/white-sword-ai/v4b6/context.json',{rows:[]}).rows||[]).map(row=>[row.id,row]));
 const needed=[...saved,...targets,...(front?[front]:[]),raid];
 fillContexts(needed,contexts);
 const skip=new Set([...ENERGY_IDS,anchor.id,raid.id,...(front?[front.id]:[])]);
 const soft=saved.filter(position=>!skip.has(position.id));
 const runNamed=(names)=>runRepresentation(names.length?withZeros(parent,names):parent,{
  targets:targets.map(position=>shape(position,parent,contexts,names,position.actionB.key)),
  anchor:shape(anchor,parent,contexts,names),
  raid:shape(raid,parent,contexts,names),
  front:front?shape(front,parent,contexts,names,front.actionA.key):null,
  soft:soft.map(position=>shape(position,parent,contexts,names)),
  names
 });
 console.log('比較既有特徵和局面交互');
 const existing=runNamed([]);
 const position=runNamed(POSITION_INTERACTIONS);
 const previousPolicy=policyFrom(parent,readJson('training/white-sword-ai/v4b8/candidate.json',{weights:[]}).weights,POSITION_INTERACTIONS);
 const previousChecks=[
  ...targets.map(item=>({id:item.id,label:'energy',band:bandOf(item,contexts,POSITION_INTERACTIONS),keepKey:item.actionB.key})),
  {id:anchor.id,label:'anchor',band:bandOf(anchor,contexts,POSITION_INTERACTIONS),keepKey:chooseKey(anchor.band,parent,SCALE)},
  {id:raid.id,label:'raid',band:bandOf(raid,contexts,POSITION_INTERACTIONS),keepKey:chooseKey(raid.band,parent,SCALE)},
  ...(front?[{id:front.id,label:'front',band:bandOf(front,contexts,POSITION_INTERACTIONS),keepKey:front.actionA.key}]:[])
 ];
 const previousRows=scoreFixed(previousPolicy,previousChecks);
 const previous={
  ok:true,
  keepsTargets:targets.every(item=>previousRows.find(row=>row.id===item.id)?.kept),
  keepsFront:!front||previousRows.find(row=>row.id===front.id)?.kept===true,
  keepsRaid:previousRows.find(row=>row.id===raid.id)?.kept===true,
  rows:previousRows,
  policy:previousPolicy,
  names:POSITION_INTERACTIONS,
  fit:{ok:true,policy:previousPolicy,weights:readJson('training/white-sword-ai/v4b8/candidate.json').weights,changed:[],status:'frozen'}
 };
 const picked=pickCandidate(existing,position,previous);
 let validation={ran:false,games:0,rows:[],selected:[]};
 let mined=null;
 let effects=null;
 if(picked){
  const names=picked.kind==='existing'?[]:POSITION_INTERACTIONS;
  const policy=picked.kind==='v4b8'?previous.policy:picked.fit.policy;
  if(policy.length!==parent.length+names.length)throw Error('候選權重長度和特徵不一致');
  assertMineSeeds();
  const seeds=Object.values(MINE_SEEDS).flat();
  let mine=readJson(ROOT+'/mine.json',null);
  if(!mine||JSON.stringify(mine.seeds)!==JSON.stringify(seeds)){
   const jobs=interleaveSpecs(MINE_SEEDS).map((spec,index)=>({...spec,maxSteps:200,index}));
   console.log('挖掘相關決策',jobs.length,'場');
   const games=(await runPool('./white-sword-v4b2-mine-worker.mjs',jobs)).sort((left,right)=>(left.index??0)-(right.index??0));
   mine={seeds,games:games.length,positions:games.flatMap(game=>game.positions||[])};
   writeJson(ROOT+'/mine.json',mine);
  }
  mined={games:mine.games,found:(mine.positions||[]).length};
  const fresh=(mine.positions||[]).filter(item=>item?.band?.length>=2&&!library.has(item.id));
  fillContexts(fresh,contexts);
  const covered=[];
  const seen=new Set();
  for(const item of [...saved,...library.values()]){
   if(!item?.id||seen.has(item.id))continue;
   seen.add(item.id);
   if(uncovered(item,contexts.get(item.id)).length)continue;
   covered.push(item);
  }
  const knownChanges=choiceChanges(parent,policy,names,covered,contexts);
  const freshChanges=choiceChanges(parent,policy,names,fresh,contexts);
  const lookup=new Map([...covered,...fresh].map(item=>[item.id,item]));
  const flips=[...flipsOf(knownChanges.changed,lookup,false),...flipsOf(freshChanges.changed,lookup,true)];
  const exclude=[...ENERGY_IDS,...repeatedIds(flips,CONFIRM_PLAN,[...library.values()])];
  const selected=selectValidation(flips,{exclude});
  const roleCount={};
  for(const row of flips)roleCount[row.role]=(roleCount[row.role]||0)+1;
  effects={covered:knownChanges.covered,known:knownChanges.changed.length,fresh:freshChanges.changed.length,roles:roleCount};
  const built=[];
  for(const row of selected){
   const source=lookup.get(row.id);
   const made=validationPosition(source,row.beforeKey,row.afterKey);
   if(!made)throw Error(row.id+' 的候選動作不能重現');
   built.push({...row,position:made});
  }
  const plan={codeVersion:CODE_VERSION,ids:built.map(row=>row.id),roles:built.map(row=>row.role)};
  const frozen=readJson(ROOT+'/validate-plan.json',null);
  if(frozen&&JSON.stringify(frozen.ids)!==JSON.stringify(plan.ids))throw Error('驗證名單和事先登記不一致');
  if(!frozen)writeJson(ROOT+'/validate-plan.json',plan);
  assertBudget(built.length);
  const planned=built.length*CONFIRM_PAIRS*2;
  if(confirmRecords.length+planned>BRANCH_BUDGET)throw Error('確認加上驗證會超過 1188');
  if(built.length){
   assertBranchSeeds(seedsFor(confirmPositions,CONFIRM_SALT,CONFIRM_PAIRS),seedsFor(built.map(row=>row.position),VALIDATE_SALT,CONFIRM_PAIRS));
   const ready=preparePositions(built.map(row=>row.position));
   if(ready.dropped.length)throw Error('驗證局面不能重現：'+ready.dropped.join(','));
   const records=await drain(ready.ready,VALIDATE_SALT,CONFIRM_PAIRS,ROOT+'/validate-rollouts.jsonl');
   const input=built.map(row=>{
    const packed=diffsOf(records,row.id,row.position.actor);
    if(packed.attempts!==CONFIRM_PAIRS||packed.unfinished)throw Error(row.id+' 的驗證沒有到 66 組');
    return {id:row.id,direction:'positive',diffs:packed.diffs};
   });
   const results=judgeDirected(input);
   validation={
    ran:true,games:records.length,
    selected:built.map(({position,...row})=>row),
    rows:results.map((row,index)=>{
     const {position,...rest}=built[index];
     return {...rest,...row};
    })
   };
  }
 }
 if(v2Hash()!==official)throw Error('這一輪改到了 v2');
 const candidate=picked?{
  kind:picked.kind,keepsRaid:picked.keepsRaid,raidRequired:picked.raidRequired,
  status:picked.fit.status,objective:picked.fit.objective??null,
  weights:picked.fit.weights||[],changed:picked.fit.changed||[],adopted:false
 }:null;
 writeJson(ROOT+'/candidate.json',{
  ...(candidate||{kind:null,keepsRaid:false,raidRequired:false,status:null,objective:null,weights:[],changed:[]}),
  adopted:false,recommended:false,promoted:false,official,codeVersion:CODE_VERSION
 });
 const frontBin=hash.line.frontBin;
 const energyBin=hash.line.energyBin;
 const study={
  codeVersion:CODE_VERSION,official,adopted:false,weightsWritten:false,
  hash:{
   checked:hash.checked,mismatched:hash.mismatched,structural:hash.structural,
   line:{
    ...hash.line,
    frontPoints:hash.bins[frontBin].points,
    energyPoints:hash.bins[energyBin].points,
    frontWeight:hash.bins[frontBin].weight,
    energyWeight:hash.bins[energyBin].weight
   },
   bins:hash.bins.map((bin,index)=>({
    name:bin.name,weight:bin.weight,points:bin.points,
    observed:bin.observed.length,space:bin.space.length,
    examples:index===frontBin||index===energyBin?bin.observed:bin.observed.slice(0,6),
    unresolved:bin.unresolved,
    signatures:bin.space
   }))
  },
  confirm,frontConfirmed,
  representations:{existing:summarize(existing),position:summarize(position)},
  previous:{keepsTargets:previous.keepsTargets,keepsFront:previous.keepsFront,keepsRaid:previous.keepsRaid,rows:previous.rows},
  candidate,validation,mined,effects,
  games:confirmRecords.length+validation.games
 };
 study.verdict=verdictOf(confirm,candidate,validation);
 writeJson(ROOT+'/study.json',study);
 const text=renderReport(study);
 writeText(ROOT+'/report.md',text);
 writeText('docs/white-sword-ai/v4b9/report.md',text);
 console.log(study.verdict);
 console.log('確認',confirm.filter(row=>row.confirmed).length,'驗證',validation.rows?.length||0,'分支',study.games);
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
