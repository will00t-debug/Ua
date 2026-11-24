#!/usr/bin/env node
// Offline separation of position context and line choice. Does not adopt weights.
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {MAX_WORKERS} from '../training/white-sword-ai/v4a/lib/protocol.mjs';
import {readJson,V2_FILE,v2Hash,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';
import {cardsOf} from '../training/white-sword-ai/v4b2/lib/trust.mjs';
import {SCALE} from '../training/white-sword-ai/v4b2/lib/protocol.mjs';
import {auditPosition,sameCardPlays,summarizeAudit} from '../training/white-sword-ai/v4b6/lib/audit.mjs';
import {searchExpanded} from '../training/white-sword-ai/v4b6/lib/expand.mjs';
import {
 CODE_VERSION,INTERACTION_NAMES,RAID_ID,TARGET_ID
} from '../training/white-sword-ai/v4b6/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b6/lib/report.mjs';
import {judgeAll,passingNames,summarize} from '../training/white-sword-ai/v4b6/lib/separate.mjs';

const WORKERS=Math.max(1,Math.min(Number(process.env.WS_WORKERS||4),MAX_WORKERS));
const ROOT='training/white-sword-ai/v4b6';
const CACHE=ROOT+'/context.json';
const FILES=[
 ['training/white-sword-ai/v4b2/pool.json','v4b2'],
 ['training/white-sword-ai/v4b/selected.json','v4b'],
 ['training/white-sword-ai/v4b5/mine.json','v4b5']
];

function loadPositions(){
 const seen=new Set();
 const rows=[];
 for(const [file,source] of FILES){
  for(const position of readJson(file,{positions:[]}).positions||[]){
   if(!position?.band||position.band.length<2||seen.has(position.id))continue;
   seen.add(position.id);
   rows.push({...position,source});
  }
 }
 return rows;
}
function runPool(items){
 return new Promise((resolve,reject)=>{
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
    results[index]=message.rows;
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
   const worker=new Worker(new URL('./white-sword-v4b6-context-worker.mjs',import.meta.url));
   worker.on('error',fail);
   pool.push(worker);
   assign(worker,cursor++);
  }
 });
}
function gamesOf(positions){
 const games=new Map();
 for(const position of positions){
  const key=position.decks.join('/')+':'+position.seed+':'+position.first;
  const game=games.get(key)||{decks:position.decks,seed:position.seed,first:position.first,marks:[]};
  game.marks.push({id:position.id,step:position.step});
  games.set(key,game);
 }
 return [...games.values()];
}
async function contexts(positions){
 const cached=readJson(CACHE,null);
 const ids=positions.map(position=>position.id).sort().join(',');
 if(cached?.codeVersion===CODE_VERSION&&cached.ids===ids)return cached.rows;
 console.log('重播',gamesOf(positions).length,'場已保存對局');
 const groups=await runPool(gamesOf(positions));
 const rows=groups.flat();
 writeJson(CACHE,{codeVersion:CODE_VERSION,ids,rows});
 return rows;
}
function coverage(position,ctx){
 if(!ctx)return 0;
 const keys=new Set(ctx.actions.map(action=>action.key));
 return position.band.filter(row=>keys.has(row.key)).length/position.band.length;
}
function percentile(values,target){
 if(target==null||!values.length)return null;
 return values.filter(value=>value<=target+1e-12).length/values.length;
}
function diffRows(name,positions,byId,parent){
 const rows=[];
 for(const position of positions){
  const ctx=byId.get(position.id);
  if(!ctx||coverage(position,ctx)<1)continue;
  const values=new Map(ctx.actions.map(action=>[action.key,action.values]));
  const chosen=chooseKey(position.band,parent,SCALE);
  for(const pair of sameCardPlays(position)){
   const targeted=position.id===TARGET_ID&&pair.card==='BLC-4-070';
   const frontKey=targeted&&position.actionA?.key?position.actionA.key:(pair.fronts.some(row=>row.key===chosen)?chosen:pair.front.key);
   const energyKey=targeted&&position.actionB?.key?position.actionB.key:pair.energy.key;
   if(!values.has(frontKey)||!values.has(energyKey))continue;
   const diff=(values.get(energyKey)[name]||0)-(values.get(frontKey)[name]||0);
   const role=position.id===TARGET_ID&&pair.card==='BLC-4-070'?'target':pair.fronts.some(row=>row.key===chosen)?'protect-front':'other';
   rows.push({id:position.id,card:pair.card,source:position.source,role,diff});
  }
 }
 return rows;
}
function scalarValue(facts,name){
 if(name==='unmet')return facts.unmet/8;
 if(name==='board')return (facts.oppBp-facts.myBp)/20000;
 if(name==='frontEmpty')return facts.frontSlots?facts.frontEmpty/facts.frontSlots:0;
 if(name==='energyEmpty')return facts.energySlots?facts.energyEmpty/facts.energySlots:0;
 if(name==='ap')return facts.apReady/3;
 return null;
}
function raidImpact(position,ctx,chosenKey){
 if(!position||!ctx||!chosenKey)return [];
 const values=new Map(ctx.actions.map(action=>[action.key,action.values]));
 const energy=position.band.filter(row=>{
  let body={};
  try{body=JSON.parse(row.key);}catch{body={};}
  return body.type==='play'&&body.line==='energy'&&cardsOf(row.features).includes('BLC-4-060');
 }).sort((left,right)=>(right.hard||0)-(left.hard||0))[0];
 if(!energy||!values.has(energy.key)||!values.has(chosenKey))return [];
 return INTERACTION_NAMES.map(name=>({
  name,diff:(values.get(energy.key)[name]||0)-(values.get(chosenKey)[name]||0)
 }));
}
function verdictOf(passed,box,previous,targetMatched){
 if(!targetMatched)return '重播沒有對上已確認局面，這一次不能判斷特徵是否分得開。';
 if(!passed.length){
  return '不值得為這一筆 070 偏好擴充模型。局面資訊大多已經在向量裡，缺的是它和打出位置的交互；把交互補上之後，已確認局面和現有策略留在前線的局面仍然分不開。資料保留，等更多經獨立確認的偏好。';
 }
 if(!box?.ok||!box.keptTarget){
  return '有交互在數值上把目標和一部分前線選擇分開，但單步方盒沒有把它收成一個保住其他局面的更新。這只證明表示上有差距，不值得因此採用新欄位。';
 }
 const smaller=box.objective<previous-0.05;
 const released=(box.necessary||[]).some(id=>id.startsWith(RAID_ID));
 if(smaller&&!released){
  return '交互分得開，而且方盒能用比共用路線權重更小的一步改選目標，同時不必放開 067 突襲。新欄位可以留在實驗模型，初始權重是 0，這一輪不採用。';
 }
 return '交互分得開，但方盒的更新沒有比 v4-B.5 的共用路線權重更小，或仍必須放開 067 突襲。表示能力還不足以支持擴充模型。';
}
async function main(){
 const official=v2Hash();
 const parent=loadModel(V2_FILE).policy;
 const positions=loadPositions();
 const target=positions.find(position=>position.id===TARGET_ID);
 if(!target)throw Error('找不到已確認局面');
 if(v2Hash()!==official)throw Error('讀取模型時改到了 v2');
 const audited=auditPosition(target);
 const corpus=summarizeAudit(positions);
 const replay=await contexts(positions);
 const byId=new Map(replay.map(row=>[row.id,row]));
 const matched=positions.filter(position=>coverage(position,byId.get(position.id))===1);
 const pairs=Object.fromEntries(INTERACTION_NAMES.map(name=>[name,diffRows(name,positions,byId,parent)]));
 const judgments=judgeAll(pairs);
 const passed=passingNames(judgments);
 const factsOf=id=>byId.get(id)?.facts;
 const targetFacts=factsOf(TARGET_ID);
 const scalarNames=[
  ['unmet','手牌還缺的色能源 / 8'],
  ['board','對方前線 BP 減我方 / 20000'],
  ['frontEmpty','前線空格比例'],
  ['energyEmpty','能量線空格比例'],
  ['ap','剩餘 AP / 3']
 ];
 const scalars=scalarNames.map(([name,label])=>{
  const value=position=>scalarValue(factsOf(position.id),name);
  const all=matched.map(value).filter(item=>item!=null);
  const saved=matched.filter(position=>position.source!=='v4b5').map(value);
  const fresh=matched.filter(position=>position.source==='v4b5').map(value);
  const targetValue=targetFacts?scalarValue(targetFacts,name):null;
  return {name,label,all:summarize(all),saved:summarize(saved),fresh:summarize(fresh),target:targetValue,percentile:percentile(all,targetValue)};
 });
 const slotCounts=matched.map(position=>factsOf(position.id)).filter(Boolean);
 const slots={
  front:[...new Set(slotCounts.map(facts=>facts.frontSlots))].join(','),
  energy:[...new Set(slotCounts.map(facts=>facts.energySlots))].join(',')
 };
 const features=judgments.map(row=>{
  const list=pairs[row.name]||[];
  return {
   ...row,
   saved:summarize(list.filter(item=>item.source!=='v4b5').map(item=>item.diff)),
   fresh:summarize(list.filter(item=>item.source==='v4b5').map(item=>item.diff)),
   protect070:summarize(list.filter(item=>item.role==='protect-front'&&item.card==='BLC-4-070').map(item=>item.diff))
  };
 });
 const raidPosition=positions.find(position=>position.id===RAID_ID);
 const previous=readJson('training/white-sword-ai/v4b5/update.json',{update:{objective:2.86}}).update.objective;
 let box=null;
 if(passed.length&&matched.some(position=>position.id===TARGET_ID)){
  const ready=matched.map(position=>({
   ...position,
   keepKey:position.id===TARGET_ID?position.actionB.key:chooseKey(position.band,parent,SCALE),
   extra:new Map((byId.get(position.id)?.actions||[]).map(action=>[action.key,action.values]))
  }));
  const found=searchExpanded(parent,ready,passed);
  box={
   ok:found.ok,status:found.status,keptTarget:found.keptTarget,objective:found.objective,
   weights:found.weights,necessary:found.necessary,changed:(found.changed||[]).length,
   checked:ready.length,names:passed
  };
  if(found.ok){
   writeJson(ROOT+'/candidate.json',{
    codeVersion:CODE_VERSION,official,adopted:false,recommended:false,promoted:false,
    names:passed,weights:found.weights,delta:found.delta,policy:found.policy
   });
  }
 }
 if(v2Hash()!==official)throw Error('分析改到了 v2');
 const study={
  codeVersion:CODE_VERSION,official,adopted:false,weightsWritten:false,
  total:positions.length,matched:matched.length,unmatched:positions.length-matched.length,
  slots,
  audit:{
   pairs:corpus.pairs,onlyLines:corpus.onlyLines,names:corpus.names,
   targetChanges:audited.pairs.filter(pair=>pair.card==='BLC-4-070').flatMap(pair=>pair.changes.filter(change=>!change.hash).map(change=>change.name+' '+change.delta.toFixed(3))),
   targetConstant:audited.constant
  },
  scalars,features,raid:raidImpact(raidPosition,byId.get(RAID_ID),raidPosition?chooseKey(raidPosition.band,parent,SCALE):null),
  box,previous,
  verdictText:verdictOf(passed,box,previous,matched.some(position=>position.id===TARGET_ID))
 };
 writeJson(ROOT+'/study.json',study);
 const text=renderReport(study);
 writeText(ROOT+'/report.md',text);
 writeText('docs/white-sword-ai/v4b6/report.md',text);
 console.log(passed.join(',')||'no-pass',matched.length,box?.status||'no-box');
}
main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
