#!/usr/bin/env node
// Independent stage-guard validation on fresh seeds, after gain-screening and 4-loss forensic.
// Does not touch original 94000..94016 final holdout or live V2 weights.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {availableParallelism} from 'node:os';
import {Worker} from 'node:worker_threads';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V3_GUARD_VALIDATION_SEEDS,V3_DECKS,assertV3Seed} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';
import {CELLS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {wilson} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const PATH='docs/white-sword-ai/v3/STAGE-GUARD-EVALUATION';
const base=loadModel('training/white-sword-ai/weights/v2-capped.json');
const candidate=loadModel('training/white-sword-ai/weights/v3-safe-residual-provisional.json');
if(candidate.hardCap!==7||!candidate.version?.includes('gain-16'))throw Error('Expected frozen gain-16 candidate');
for(const seed of V3_GUARD_VALIDATION_SEEDS)assertV3Seed(seed,'validation');
function emit(report){
 mkdirSync('docs/white-sword-ai/v3',{recursive:true});
 writeFileSync(PATH+'.json',JSON.stringify(report,null,2)+'\n');
 const lines=['# v3 主階段防護策略驗證','',
  '45009–45012：沒有參與訓練、倍率挑選或 4 場退步分析。最終保留集仍不使用。',
  '',
  '主階段限定策略倍率：'+(report.selectedGain??'無')+'；原因：'+(report.reason||'待驗證'), ''];
 if(report.pairs!=null)lines.push(
  '對 Hard Search 2，同種子 '+report.pairs+' 組：v2 '+report.v2.wins+'/'+report.pairs+
   '；新候選 '+report.candidate.wins+'/'+report.pairs,
  '勝率差：'+(100*report.delta).toFixed(1)+' 個百分點',
  '出牌出現分歧：'+report.diverged+'/'+report.pairs+' 組',
  '新候選直接對 v2 鏡像：'+report.direct.wins+'/'+report.direct.games,
  '','各牌型：',...Object.entries(report.byDeck).map(([deck,r])=>
   '- '+deck+'：v2 '+r.v2Wins+'/'+r.games+'；候選 '+r.candidateWins+'/'+r.games),
  '','評估：'+(report.worthFurtherTest?'值得進一步驗證，但尚未允許部署。':'維持正式 v2，尚未證明新候選更強。'),
  ...report.reasons.map(r=>'- '+r)
 );
 writeFileSync(PATH+'.md',lines.join('\n')+'\n');
}
const gain=16;
if(!Number.isInteger(gain)||![2,4,8,16].includes(gain)){
 const report={selectedGain:null,reason:'原本驗證局面沒有找到改變 1–10% 決策的合適倍率',
  finalHoldoutUsed:false,worthFurtherTest:false};
 emit(report);console.log('STAGE_GUARD_EVAL_SKIP',JSON.stringify(report));process.exit(0);
}
const clipped=0; // Reuse the frozen candidate, no new weight tuning.
function spec(seed,cell,deckId,model,{direct=false}={}){
 const seats=[];
 seats[cell.specialistSeat]={deckId:'white-sword',policy:'white-sword',
  model,stageGuard:model===candidate,baselineModel:base,
  mode:'blend',scale:6,hardCap:7,explore:0};
 seats[1-cell.specialistSeat]=direct
  ?{deckId:'white-sword',policy:'white-sword',model:base,mode:'blend',scale:6,hardCap:7,explore:0}
  :{deckId,policy:'hard-search-2',model:null};
 return {seed,first:cell.first,specialistSeat:cell.specialistSeat,
  opponentDeck:deckId,label:direct?'v3-secondary-direct':'v3-secondary-paired',
  seats,keepActions:!direct,keepSamples:false};
}
async function pool(specs){
 const n=Math.min(3,Number(process.env.WS_WORKERS||availableParallelism()-1||1),specs.length);
 if(n<1)throw Error('Missing workers');
 return new Promise((resolve,reject)=>{
  let cursor=0,finished=0,closed=false;
  const results=Array(specs.length),workers=[];
  const fail=e=>{if(closed)return;closed=true;for(const w of workers)void w.terminate();reject(e instanceof Error?e:Error(String(e)));};
  function assign(worker,i){
   const handle=message=>{
    worker.off('message',handle);
    if(!message?.ok)return fail(message?.error||'worker failure');
    results[i]=message.game;finished++;
    if(finished%12===0||finished===specs.length)console.log('games '+finished+'/'+specs.length);
    if(cursor<specs.length)assign(worker,cursor++);
    else if(finished===specs.length&&!closed){
     closed=true;for(const w of workers)void w.terminate();resolve(results);
    }
   };
   worker.on('message',handle);worker.postMessage(specs[i]);
  }
  for(let i=0;i<n;i++){
   const w=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   workers.push(w);w.on('error',fail);assign(w,cursor++);
  }
 });
}
function clean(games,label){
 const bad=games.filter(g=>g.status!=='finished'||(g.winner!==0&&g.winner!==1)||
  Object.values(g.anomalies||{}).some(n=>n!==0));
 if(bad.length)throw Error(label+' unhealthy games '+JSON.stringify(bad.slice(0,3)));
}
const rows=[];
for(const seed of V3_GUARD_VALIDATION_SEEDS)for(const cell of CELLS)for(const deckId of V3_DECKS)
 rows.push({seed,cell,deckId});
console.log('stageGuard',rows.length,'pairs, gain',gain,'clippedWeights',clipped);
const v2=await pool(rows.map(r=>spec(r.seed,r.cell,r.deckId,base)));
const v3=await pool(rows.map(r=>spec(r.seed,r.cell,r.deckId,candidate)));
clean(v2,'v2');clean(v3,'candidate');
let rescue=0,regression=0,diverged=0,v2wins=0,candidateWins=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const byDeck=Object.fromEntries(V3_DECKS.map(deck=>[deck,{games:0,v2Wins:0,candidateWins:0,diverged:0}]));
for(const [i,row] of rows.entries()){
 const oldWin=v2[i].winner===row.cell.specialistSeat;
 const newWin=v3[i].winner===row.cell.specialistSeat;
 const changed=!same(v2[i].actions,v3[i].actions);
 v2wins+=Number(oldWin);candidateWins+=Number(newWin);
 rescue+=Number(!oldWin&&newWin);regression+=Number(oldWin&&!newWin);diverged+=Number(changed);
 const d=byDeck[row.deckId];d.games++;d.v2Wins+=Number(oldWin);d.candidateWins+=Number(newWin);d.diverged+=Number(changed);
}
const directSpecs=V3_GUARD_VALIDATION_SEEDS.flatMap(seed=>CELLS.map(cell=>spec(seed,cell,'white-sword',candidate,{direct:true})));
const direct=await pool(directSpecs);
clean(direct,'direct');
const directWins=direct.filter(g=>g.winner===g.specialistSeat).length;
const delta=(candidateWins-v2wins)/rows.length;
const reasons=[];
if(delta<0.05)reasons.push('在獨立次級驗證未取得至少 +5 個百分點改善');
if(directWins/direct.length<0.55)reasons.push('候選對 v2 直接鏡像未達 55%');
if(diverged<3)reasons.push('實際出牌分歧太少');
for(const [deck,r] of Object.entries(byDeck))
 if(r.candidateWins-r.v2Wins< -1)reasons.push(deck+' 明顯退步');
const report={
 selectedGain:gain,clippedWeights:clipped,stageGuard:true,policyScope:'voluntary-main-only',
 secondaryValidationSeeds:V3_GUARD_VALIDATION_SEEDS,
 finalHoldoutUsed:false,hardCap:7,scale:6,
 pairs:rows.length,v2:{...wilson(v2wins,rows.length)},
 candidate:{...wilson(candidateWins,rows.length)},
 delta,rescue,regression,diverged,
 byDeck,direct:{games:direct.length,wins:directWins,winRate:directWins/direct.length},
 worthFurtherTest:reasons.length===0,reasons,
 reason:'fresh guard validation only; provisional, no production change'
};
emit(report);
console.log('STAGE_GUARD_EVAL_RESULT',JSON.stringify({
 gain,pairs:rows.length,v2wins,candidateWins,delta,
 rescue,regression,diverged,direct:report.direct,
 worthFurtherTest:report.worthFurtherTest,reasons
},null,2));
