#!/usr/bin/env node
// Unseen paired comparison, not training or production promotion.
// Each seed x opponent x first x seat is played once by v1 and once by v2.
// Fixed source branch; neither v1 nor v2 is allowed to tune on this test.
// Usage: node scripts/white-sword-paired-compare.mjs [--smoke]
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {splitForSeed} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {wilson,addAnomalies} from '../dist/universal-v2/white-sword-ai/stats.mjs';

const SMOKE=process.argv.includes('--smoke');
const START=92000;
const SEEDS=Array.from({length:SMOKE?1:17},(_,i)=>START+i);
const DECKS=['white-sword','reject-blue','renruki'];
const CELLS=[{first:0,specialistSeat:0},{first:1,specialistSeat:0},
 {first:1,specialistSeat:1},{first:0,specialistSeat:1}];
const WORKERS=Math.max(1,Math.min(3,Number(process.env.WS_WORKERS||availableParallelism()-1||1)));
const OUT='docs/white-sword-ai';
const expected=SEEDS.length*DECKS.length*CELLS.length;
const percent=n=>(100*n).toFixed(1)+'%';

for(const seed of SEEDS){
 if(splitForSeed(seed)!=='unassigned')throw Error('Paired seed overlaps a reserved split: '+seed);
}
const specs=[];
for(const seed of SEEDS)for(const opponentDeck of DECKS)for(const cell of CELLS)
 specs.push({seed,opponentDeck,...cell});
if(specs.length!==expected)throw Error('Unexpected comparison grid');

function poolJobs(rows){
 return new Promise((resolve,reject)=>{
  const results=Array(rows.length);
  let next=0,finished=0,failed=false;
  const workers=[];
  const fail=error=>{
   if(failed)return;
   failed=true;
   for(const worker of workers)void worker.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  const assign=(worker,index)=>{
   const handler=msg=>{
    worker.off('message',handler);
    if(!msg?.ok)return fail(Error(msg?.error||'paired worker failed'));
    results[index]=msg.result;
    finished++;
    if(finished%12===0||finished===rows.length)console.log('paired conditions '+finished+'/'+rows.length);
    if(next<rows.length)assign(worker,next++);
    else if(finished===rows.length){
     for(const item of workers)void item.terminate();
     resolve(results);
    }
   };
   worker.on('message',handler);
   worker.postMessage(rows[index]);
  };
  for(let i=0;i<Math.min(WORKERS,rows.length);i++){
   const worker=new Worker(new URL('./white-sword-paired-worker.mjs',import.meta.url));
   worker.on('error',fail);
   worker.on('exit',code=>{if(code!==0&&finished!==rows.length&&!failed)fail(Error('worker exited '+code));});
   workers.push(worker);
   assign(worker,next++);
  }
 });
}

function won(game,row){return game.status==='finished'&&game.winner===row.specialistSeat;}
function isClean(game){
 return game?.status==='finished'&&(game.winner===0||game.winner===1)
  &&Object.values(game.anomalies||{}).every(value=>value===0);
}
function winDelta(row){return Number(won(row.v2,row))-Number(won(row.v1,row));}
function seededRng(seed){
 let a=seed>>>0;
 return ()=>{
  a=(a+0x6D2B79F5)|0;
  let t=Math.imul(a^(a>>>15),1|a);
  t^=t+Math.imul(t^(t>>>7),61|t);
  return ((t^(t>>>14))>>>0)/4294967296;
 };
}
function bootstrapSeedCI(rows,reps=12000){
 const seedGroups=new Map();
 for(const row of rows){
  if(!seedGroups.has(row.seed))seedGroups.set(row.seed,[]);
  seedGroups.get(row.seed).push(row);
 }
 const groups=[...seedGroups.values()];
 if(!groups.length)return {low:null,high:null,method:'seed-cluster-bootstrap'};
 const rng=seededRng(246810);
 const values=[];
 for(let j=0;j<reps;j++){
  let sum=0,n=0;
  for(let k=0;k<groups.length;k++){
   const group=groups[Math.floor(rng()*groups.length)];
   for(const row of group){sum+=winDelta(row);n++;}
  }
  values.push(sum/n);
 }
 values.sort((a,b)=>a-b);
 return {low:values[Math.floor(.025*reps)],high:values[Math.ceil(.975*reps)-1],
  method:'seed-cluster-bootstrap',reps,seeds:groups.length};
}
function mcnemarExact(b,c){
 const n=b+c;
 if(!n)return 1;
 const lim=Math.min(b,c);
 let p=Math.pow(0.5,n),sum=p;
 for(let k=1;k<=lim;k++){p*=((n-k+1)/k);sum+=p;}
 return Math.min(1,2*sum);
}
function summarize(rows){
 const n=rows.length;
 let v1Wins=0,v2Wins=0,up=0,down=0,both=0,neither=0;
 for(const row of rows){
  const a=won(row.v1,row),b=won(row.v2,row);
  v1Wins+=Number(a);
  v2Wins+=Number(b);
  if(!a&&b)up++;
  else if(a&&!b)down++;
  else if(a&&b)both++;
  else neither++;
 }
 return {pairs:n,games:n*2,v1:{...wilson(v1Wins,n)},v2:{...wilson(v2Wins,n)},
  v1Wins,v2Wins,improved:up,regressed:down,bothWin:both,bothLose:neither,
  pairedDifference:(v2Wins-v1Wins)/n,
  pairedCI:bootstrapSeedCI(rows),
  mcnemarExactP:mcnemarExact(up,down)};
}
function markdown(summary){
 const s=summary.overall;
 const lines=[
 '# 白劍專屬 AI v1 vs v2：全新同種子配對測試',
 '',
 '> 這是獨立於訓練與既有最終種子的一次實驗。固定初始 seed／敵方牌組／先後手／座位；策略選擇不同後，後續對局不保證逐手相同。',
 '',
 '- 程式來源：PR #556 的白劍模型，v1 candidate vs v2-capped，兩者權重一致。',
 '- 固定基準：clock-free 48-node hard-search-2；雙方均為 48 node 搜尋，v1 blend 無上限，v2 blend 使用 hard 搜尋分差上限 7。',
 '- 新測試種子：'+SEEDS[0]+'–'+SEEDS[SEEDS.length-1]+'，未參與訓練／診斷／選模。',
 '- 每個種子 x 3 種對手 x 4 種先後手與座位 = 12 組配對。',
 '- 配對數：'+s.pairs+' 組，共 '+s.games+' 場。',
 '- v1：'+percent(s.v1.p)+' ('+s.v1Wins+'/'+s.pairs+')；v2：'+percent(s.v2.p)+' ('+s.v2Wins+'/'+s.pairs+')。',
 '- 配對勝率差：'+(s.pairedDifference*100).toFixed(1)+' 個百分點。',
 '- 同條件 v1 輸→v2 贏：'+s.improved+' 組；v1 贏→v2 輸：'+s.regressed+' 組。',
 '- 同贏 '+s.bothWin+' 組；同輸 '+s.bothLose+' 組。',
 '- 依種子分群 bootstrap 的 95% 差值區間：'+(s.pairedCI.low*100).toFixed(1)+' 至 '+(s.pairedCI.high*100).toFixed(1)+' 個百分點。',
 '- McNemar exact p：'+s.mcnemarExactP.toFixed(5)+'（假設配對獨立；同種子內有群聚，應以分群 bootstrap 為主要參考）。',
 '- 結論：'+summary.verdict,
 '',
 '## 分類比較',
 '',
 '| 分類 | 組數 | v1 勝率 | v2 勝率 | v1 輸→v2 贏 | v1 贏→v2 輸 | 配對差 |',
 '|---|---:|---:|---:|---:|---:|---:|'
 ];
 for(const [name,row] of Object.entries(summary.groups)){
  lines.push('| '+name+' | '+row.pairs+' | '+percent(row.v1.p)+' | '+percent(row.v2.p)
   +' | '+row.improved+' | '+row.regressed+' | '+(100*row.pairedDifference).toFixed(1)+' pp |');
 }
 lines.push('','## 健康檢查','',
  '- 不合格配對：'+summary.invalid.length,
  '- v1 異常統計：'+JSON.stringify(summary.v1Anomalies),
  '- v2 異常統計：'+JSON.stringify(summary.v2Anomalies),
  '',
  '## 方法與限制','',
  '- 只看全新 92000 系列種子，無需重訓，也沒有改權重或調上限。',
  '- 每種牌組 68 組配對，四種座位／先後手完全平衡。',
  '- 對局結果的配對只控制開局亂數與設定，無法鎖定分叉後的抽牌、行動及觸發。',
  '- 單一測試可支持或不支持優勢，但不是跨版本永遠更強的保證。',
  '- 不修改正式對戰 AI、不合併、不部署。',
  '',
  '資料與每組配對結果見 paired-unseen-92000.json。','');
 return lines.join('\n');
}
async function main(){
 const began=performance.now();
 const rows=await poolJobs(specs);
 const invalid=rows.filter(row=>!isClean(row.v1)||!isClean(row.v2)).map(row=>({
  seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,opponentDeck:row.opponentDeck,
  v1:{status:row.v1.status,anomalies:row.v1.anomalies,error:row.v1.error},
  v2:{status:row.v2.status,anomalies:row.v2.anomalies,error:row.v2.error}
 }));
 const clean=rows.filter(row=>isClean(row.v1)&&isClean(row.v2));
 const overall=summarize(clean);
 const groups={
  '白劍鏡像':summarize(clean.filter(row=>row.opponentDeck==='white-sword')),
  '我拒絕':summarize(clean.filter(row=>row.opponentDeck==='reject-blue')),
  '戀露':summarize(clean.filter(row=>row.opponentDeck==='renruki')),
  '專屬 AI 先手':summarize(clean.filter(row=>row.first===row.specialistSeat)),
  '專屬 AI 後手':summarize(clean.filter(row=>row.first!==row.specialistSeat))
 };
 const verdict=invalid.length?'不合格：有異常或未完成對局，不應判定模型強弱'
  :overall.pairedCI.low>0?'新種子的同條件對照支持 v2 比 v1 更強'
  :overall.pairedCI.high<0?'新種子的同條件對照顯示 v2 較弱'
  :'差異未被分群 95% 區間明確區分，仍需更多獨立種子';
 const summary={createdAt:new Date().toISOString(),seedRange:[SEEDS[0],SEEDS.at(-1)],
  smoke:SMOKE,expectedPairs:expected,observedPairs:rows.length,
  totalSeconds:(performance.now()-began)/1000,overall,groups,invalid,
  v1Anomalies:addAnomalies(rows.map(row=>row.v1)),
  v2Anomalies:addAnomalies(rows.map(row=>row.v2)),verdict};
 mkdirSync(OUT,{recursive:true});
 const tag=SMOKE?'smoke':'unseen-92000';
 const json=OUT+'/paired-'+tag+'.json';
 const md=OUT+'/PAIRED-'+(SMOKE?'SMOKE':'COMPARISON')+'.md';
 writeFileSync(json,JSON.stringify({summary,rows},null,2)+'\n');
 writeFileSync(md,markdown(summary));
 console.log(JSON.stringify({report:md,raw:json,overall,verdict,invalid:invalid.length},null,2));
 if(invalid.length||clean.length!==expected)process.exitCode=1;
}
main().catch(error=>{console.error(error?.stack||error);process.exitCode=1;});
