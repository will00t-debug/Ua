#!/usr/bin/env node
// Diagnostic only: v2/v3 policy divergence and root-candidate diversity.
// Neither this script nor its output authorizes model promotion.
import {mkdirSync,writeFileSync} from 'node:fs';
import {cloneModel,loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {evaluationFixtures} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';

const INCUMBENT='training/white-sword-ai/weights/v2-capped.json';
const CANDIDATE=process.argv[2]||'training/white-sword-ai/weights/v3-experiment.json';
const OUT='docs/white-sword-ai/v3';
const a=loadModel(INCUMBENT),b=loadModel(CANDIDATE);
const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
function delta(x,y){
 let changed=0,l2=0,max=0;
 for(let i=0;i<x.length;i++){
  const d=(y[i]-x[i]);
  if(Math.abs(d)>1e-10)changed++;
  l2+=d*d;max=Math.max(max,Math.abs(d));
 }
 return {changed,total:x.length,l2:Math.sqrt(l2),maxAbs:max};
}
function spec(row,model){
 const seats=[null,null];
 seats[row.specialistSeat]={
  deckId:'white-sword',policy:'white-sword',
  model,mode:'blend',scale:6,hardCap:7,explore:0
 };
 seats[1-row.specialistSeat]={
  deckId:row.opponentDeck,policy:'hard-search-2',model:null
 };
 return {
  seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:row.opponentDeck,label:'v3-diagnose',seats,
  keepSamples:false,keepActions:true,diagnose:true
 };
}
const rows=evaluationFixtures({smoke:true});
const games=[];
for(const [index,row] of rows.entries()){
 const v2=playGame(spec(row,a));
 const v3=playGame(spec(row,b));
 const fail=[v2,v3].filter(g=>g.status!=='finished'||
  Object.values(g.anomalies||{}).some(value=>value!==0));
 if(fail.length)throw Error('Diagnosis cannot use unhealthy matches: '+
  JSON.stringify({row,fail:fail.map(g=>({status:g.status,anomalies:g.anomalies,error:g.error}))}));
 const x=v2.actions||[],y=v3.actions||[];
 const at=Array.from({length:Math.max(x.length,y.length)},(_,i)=>i)
  .find(i=>!same(x[i]||null,y[i]||null));
 const diag={seed:row.seed,deck:row.opponentDeck,first:row.first,seat:row.specialistSeat,
  v2Winner:v2.winner,v3Winner:v3.winner,
  v2Steps:v2.steps,v3Steps:v3.steps,identicalActions:at===undefined,
  firstDifference:at===undefined?null:{index:at,v2:x[at]||null,v3:y[at]||null},
  v2:v2.diagnostics,v3:v3.diagnostics};
 games.push(diag);
 console.log('diagnosis',index+1,'/',rows.length,
  'v2/v3 moves',x.length+'/'+y.length,'firstDiff',at??'-',
  'eligible',v2.diagnostics?.multiEligible+'/'+v3.diagnostics?.multiEligible);
}
const sum=name=>games.reduce((out,g)=>{
 const d=g[name];
 for(const key of ['blendDecisions','singleEligible','multiEligible','hardOverrides',
  'eligibleSum','candidatesSum','positiveScoreGaps','scoreGapSum','hardGapSum'])
  out[key]=(out[key]||0)+(d?.[key]||0);
 out.maxScoreGap=Math.max(out.maxScoreGap||0,d?.maxScoreGap||0);
 return out;
},{});
const differences=games.filter(g=>!g.identicalActions);
const wins={v2:games.filter(g=>g.v2Winner===g.seat).length,
 v3:games.filter(g=>g.v3Winner===g.seat).length};
const report={
 date:new Date().toISOString(),candidate:CANDIDATE,
 weights:{policy:delta(a.policy,b.policy),value:delta(a.value,b.value)},
 games:games.length,identicalActionGames:games.length-differences.length,
 divergentActionGames:differences.length,
 wins,
 summary:{v2:sum('v2'),v3:sum('v3')},
 firstDifferences:differences.slice(0,10).map(g=>({
  seed:g.seed,deck:g.deck,first:g.first,seat:g.seat,
  ...g.firstDifference
 })),
 rows:games
};
mkdirSync(OUT,{recursive:true});
writeFileSync(OUT+'/DIAGNOSIS.json',JSON.stringify(report,null,2)+'\n');
const lines=[
 '# 白劍 v3 學習效果診斷',
 '', '**僅為診斷，不使用最終 94000–94016 種子、不晉升模型、不部署。**','',
 '## 權重差異',
 '',
 '- policy：'+report.weights.policy.changed+'/'+report.weights.policy.total+
  ' 欄改變，L2 差='+report.weights.policy.l2.toFixed(5),
 '- value：'+report.weights.value.changed+'/'+report.weights.value.total+
  ' 欄改變，L2 差='+report.weights.value.l2.toFixed(5),
 '',
 '## 行動與搜尋候選',
 '',
 '- 配對：'+report.games+' 組；出牌完全相同：'+report.identicalActionGames+
  ' 組；至少一手不同：'+report.divergentActionGames+' 組',
 '- 勝場：v2='+wins.v2+'、v3='+wins.v3,
 '- v2 搜尋決策：'+report.summary.v2.blendDecisions+
  '；僅一個允許動作：'+report.summary.v2.singleEligible+
  '；至少兩個允許動作：'+report.summary.v2.multiEligible+
  '；偏離 Hard：'+report.summary.v2.hardOverrides,
 '- v3 搜尋決策：'+report.summary.v3.blendDecisions+
  '；僅一個允許動作：'+report.summary.v3.singleEligible+
  '；至少兩個允許動作：'+report.summary.v3.multiEligible+
  '；偏離 Hard：'+report.summary.v3.hardOverrides,
 '',
 '## 首次不同決策',
 '',
 ...report.firstDifferences.map(g=>'- '+g.deck+
  ' seed '+g.seed+' first '+g.first+' seat '+g.seat+' step '+g.index+
  '：'+JSON.stringify(g.v2)+' → '+JSON.stringify(g.v3)),
 '',
 '診斷只比較相同的起始條件。遊戲一旦改變決策，之後的卡片抽取與局面可能不同，不能把後續步驟逐一視為同局比較。',''
];
writeFileSync(OUT+'/DIAGNOSIS.md',lines.join('\n'));
console.log(JSON.stringify({
 weights:report.weights,games:report.games,identical:report.identicalActionGames,
 divergent:report.divergentActionGames,wins,summary:report.summary,
 firstDifferences:report.firstDifferences
},null,2));
