#!/usr/bin/env node
// Offline forensic replay of the four v2->v3 regressions. No training or
// automatic production promotion; secondary seeds are now diagnostic evidence.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V3_SECONDARY_VALIDATION_SEEDS,V3_DECKS,assertV3Seed} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';
import {CELLS} from '../dist/universal-v2/white-sword-ai/constants.mjs';

const incumbent=loadModel('training/white-sword-ai/weights/v2-capped.json');
const candidate=loadModel('training/white-sword-ai/weights/v3-safe-residual-provisional.json');
const reportPath='docs/white-sword-ai/v3/REGRESSION-AUDIT';
const expected=JSON.parse(readFileSync('docs/white-sword-ai/v3/GAIN-EVALUATION.json','utf8'));
if(expected.selectedGain!==16||expected.pairs!==48||expected.rescue!==2||expected.regression!==4)
 throw Error('Frozen baseline results changed; refusing to diagnose unrelated experiment');
function spec(row,model,{detail=false}={}){
 const seats=[];
 seats[row.cell.specialistSeat]={deckId:'white-sword',policy:'white-sword',model,
  mode:'blend',scale:6,hardCap:7,explore:0};
 seats[1-row.cell.specialistSeat]={deckId:row.deckId,policy:'hard-search-2',model:null};
 return {seed:row.seed,first:row.cell.first,specialistSeat:row.cell.specialistSeat,
  opponentDeck:row.deckId,label:'v3-regression-audit',seats,
  keepActions:true,keepSamples:false,diagnose:detail,captureDecisions:detail};
}
async function run(specs){
 if(!specs.length)return [];
 return new Promise((resolve,reject)=>{
  const out=Array(specs.length),workers=[],n=Math.min(3,specs.length);
  let next=0,completed=0,closed=false;
  const fail=err=>{
   if(closed)return;closed=true;
   for(const worker of workers)void worker.terminate();
   reject(err instanceof Error?err:Error(String(err)));
  };
  const assign=(worker,i)=>{
   const handle=message=>{
    worker.off('message',handle);
    if(!message?.ok)return fail(message?.error||'Unknown worker error');
    out[i]=message.game;completed++;
    if(completed%12===0||completed===specs.length)
     console.log('forensic games',completed+'/'+specs.length);
    if(next<specs.length)assign(worker,next++);
    else if(completed===specs.length&&!closed){
     closed=true;for(const w of workers)void w.terminate();resolve(out);
    }
   };
   worker.on('message',handle);
   worker.postMessage(specs[i]);
  };
  for(let i=0;i<n;i++){
   const w=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   workers.push(w);w.on('error',fail);assign(w,next++);
  }
 });
}
function healthy(game){
 return game.status==='finished'&&(game.winner===0||game.winner===1)
  &&Object.values(game.anomalies||{}).every(n=>n===0);
}
function requireHealthy(games,label){
 const bad=games.filter(g=>!healthy(g));
 if(bad.length)throw Error(label+' unhealthy '+JSON.stringify(bad.slice(0,3).map(g=>({
  seed:g.seed,opp:g.opponentDeck,status:g.status,anomalies:g.anomalies,error:g.error
 }))));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function plainAction(step){
 if(!step)return null;
 const {context,choiceDiagnostic,...rest}=step;
 return rest;
}
function diff(a,b){
 for(let i=0;i<Math.max(a.length,b.length);i++)
  if(!same(plainAction(a[i]),plainAction(b[i])))return i;
 return null;
}
function slim(row){
 if(!row)return null;
 const c=row.context,diag=row.choiceDiagnostic;
 return {
  actor:row.actor,type:row.type,mode:row.mode,
  cardId:c?.cardId||null,uid:row.uid,line:row.line,slot:row.slot,
  targetUid:row.targetUid,baseUid:row.baseUid,fullAction:row.fullAction,
  context:c||null,
  choice:diag?{
   referenceAction:diag.referenceAction,
   selectedAction:diag.selectedAction,
   eligible:diag.eligible,topGap:diag.topGap,
   ranked:diag.ranked
  }:null
 };
}
const rows=[];
for(const seed of V3_SECONDARY_VALIDATION_SEEDS){
 assertV3Seed(seed,'validation');
 for(const cell of CELLS)for(const deckId of V3_DECKS)
  rows.push({seed,cell,deckId});
}
const old=await run(rows.map(row=>spec(row,incumbent)));
const newer=await run(rows.map(row=>spec(row,candidate)));
requireHealthy(old,'v2');requireHealthy(newer,'v3');
const incidents=[];
let rescue=0,regression=0,diverged=0,oldWins=0,newWins=0;
for(let i=0;i<rows.length;i++){
 const row=rows[i],a=old[i],b=newer[i];
 const oldWin=a.winner===row.cell.specialistSeat;
 const newWin=b.winner===row.cell.specialistSeat;
 const first=diff(a.actions||[],b.actions||[]);
 oldWins+=Number(oldWin);newWins+=Number(newWin);
 diverged+=Number(first!==null);
 if(oldWin===newWin)continue;
 const label=oldWin?'regression':'rescue';
 if(oldWin)regression++;else rescue++;
 incidents.push({index:i,label,seed:row.seed,first:row.cell.first,
  specialistSeat:row.cell.specialistSeat,opponentDeck:row.deckId,
  v2Winner:a.winner,v3Winner:b.winner,firstDifference:first,
  originalSteps:[a.steps,b.steps],
  row});
}
if(oldWins!==expected.v2.wins||newWins!==expected.candidate.wins||
 rescue!==expected.rescue||regression!==expected.regression||diverged!==expected.diverged)
 throw Error('Forensic rerun differs from frozen secondary validation: '+JSON.stringify({
  oldWins,newWins,rescue,regression,diverged
 }));
console.log('REPRODUCED',{oldWins,newWins,rescue,regression,diverged,
 incidents:incidents.map(({row,...x})=>x)});
const chosen=incidents.map(i=>i.row);
const oldDetailed=await run(chosen.map(row=>spec(row,incumbent,{detail:true})));
const newDetailed=await run(chosen.map(row=>spec(row,candidate,{detail:true})));
requireHealthy(oldDetailed,'v2 detail');requireHealthy(newDetailed,'v3 detail');
for(let i=0;i<incidents.length;i++){
 const entry=incidents[i],a=oldDetailed[i],b=newDetailed[i];
 const first=diff(a.actions||[],b.actions||[]);
 if(first!==entry.firstDifference)throw Error('Detailed mode changed first decision '+JSON.stringify(entry));
 entry.v2={steps:a.steps,count:a.counts};
 entry.v3={steps:b.steps,count:b.counts};
 entry.firstDecision={
  index:first,
  v2:slim(a.actions?.[first]),
  v3:slim(b.actions?.[first]),
  preceding:a.actions.slice(Math.max(0,first-3),first).map(slim),
  followingV2:a.actions.slice(first+1,first+4).map(slim),
  followingV3:b.actions.slice(first+1,first+4).map(slim)
 };
 delete entry.row;
}
const report={
 date:new Date().toISOString(),scope:'secondary validation forensic only',
 usesFinalHoldout:false,incumbent:'white-sword-specialist-v2-capped',
 candidate:candidate.version,baselinePairs:48,
 reproduced:{oldWins,newWins,rescue,regression,diverged},
 warnings:[
  'First divergent decision is diagnostic, not proof of causal blame for the final loss',
  'Never train or select model thresholds using these secondary-validation losses',
  'Check generalized safety patterns on newly reserved seeds before calling this an improvement'
 ],
 regressions:incidents.filter(i=>i.label==='regression'),
 rescues:incidents.filter(i=>i.label==='rescue')
};
mkdirSync('docs/white-sword-ai/v3',{recursive:true});
writeFileSync(reportPath+'.json',JSON.stringify(report,null,2)+'\n');
const lines=['# 白劍 v3：四場由贏變輸的決策鑑識','',
 '實驗分支，沒有更改已部署 v2，沒有使用 94000–94016 最終種子。','',
 '- 重播確認：v2 '+oldWins+'/48；v3 '+newWins+'/48',
 '- v3 將原本贏的場次變輸：'+regression+'；將原本輸的變贏：'+rescue,
 '- 有不同出牌：'+diverged+'/48；此比較不是因果關係證明。','',
 '| 類別 | 種子 | 對手 | 先手 | 白劍座位 | 首次分歧步 | v2 出牌 | v3 出牌 |',
 '|---|---:|---|---:|---:|---:|---|---|'];
for(const i of incidents){
 const d=i.firstDecision;
 const label=x=>[x?.type||'未知',x?.cardId||'',x?.mode||''].filter(Boolean).join(' ');
 lines.push('| '+i.label+' | '+i.seed+' | '+i.opponentDeck+' | '+i.first+' | '+
  i.specialistSeat+' | '+(d.index??'無')+' | '+label(d.v2)+' | '+label(d.v3)+' |');
}
lines.push('','## 第一個分歧點的場面與評分','');
for(const i of incidents){
 const d=i.firstDecision;
 lines.push('### '+i.label+' · '+i.opponentDeck+' · '+i.seed+' · seat '+i.specialistSeat,'',
  '- 分歧前 AP（白劍）／生命／場上：'+
   JSON.stringify(d.v2?.context?.self||{}),
  '- v2 候選評分：'+JSON.stringify(d.v2?.choice?.ranked||[]),
  '- v3 候選評分：'+JSON.stringify(d.v3?.choice?.ranked||[]),
  '- v2 選擇：'+JSON.stringify(d.v2?.fullAction||null),
  '- v3 選擇：'+JSON.stringify(d.v3?.fullAction||null),'');
}
lines.push('**注意：** 此報告只定位第一個不同的合法動作與對局結果，不能直接推論該動作是輸棋唯一原因。','');
writeFileSync(reportPath+'.md',lines.join('\n'));
console.log('REGRESSION_AUDIT_RESULT',JSON.stringify(incidents.map(i=>({
 label:i.label,seed:i.seed,opponentDeck:i.opponentDeck,
 first:i.first,specialistSeat:i.specialistSeat,
 at:i.firstDecision.index,old:i.firstDecision.v2?.type+' '+(i.firstDecision.v2?.cardId||''),
 newer:i.firstDecision.v3?.type+' '+(i.firstDecision.v3?.cardId||''),
 ap:i.firstDecision.v2?.context?.self?.ap
})),null,2));
