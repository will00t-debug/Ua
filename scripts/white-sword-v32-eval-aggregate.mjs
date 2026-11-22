#!/usr/bin/env node
// Aggregate only frozen 30-seed, three-shard v3.2 evaluation; never update
// weights or use the legacy final holdout. Seed-cluster bootstrap accounts for
// correlated seat/deck replays within each opening seed.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {wilson} from '../dist/universal-v2/white-sword-ai/stats.mjs';
import {V32_EVAL_SEEDS,V32_DECKS} from '../dist/universal-v2/white-sword-ai/v32-protocol.mjs';

const path='docs/white-sword-ai/v32';
const shards=[0,1,2].map(i=>JSON.parse(readFileSync(path+'/shards/shard-'+i+'.json','utf8')));
const matched=shards.flatMap(s=>s.matched),mirrors=shards.flatMap(s=>s.mirrors);
const allSeeds=V32_EVAL_SEEDS;
if(shards.some((s,i)=>s.shard!==i||s.actualGames!==280||
 s.matched.length!==120||s.mirrors.length!==40)||
 matched.length!==360||mirrors.length!==120)
 throw Error('v3.2 expected exactly 720 paired game slots + 120 mirrors');
const unique=new Set();
for(const row of matched){
 if(!allSeeds.includes(row.seed)||!V32_DECKS.includes(row.deckId))
  throw Error('Unregistered seed/deck in evaluation');
 const key=[row.seed,row.seat,row.first,row.deckId].join('/');
 if(unique.has(key))throw Error('duplicate paired opening '+key);
 unique.add(key);
}
if(unique.size!==360)throw Error('missing matched opening');
const mirrorUnique=new Set();
for(const m of mirrors){
 if(!allSeeds.includes(m.seed))throw Error('unregistered direct seed');
 const key=[m.seed,m.seat,m.first].join('/');
 if(mirrorUnique.has(key))throw Error('duplicate direct mirror '+key);
 mirrorUnique.add(key);
}
if(mirrorUnique.size!==120)throw Error('missing mirror opening');
const n=matched.length,oldWins=matched.filter(r=>r.v2win).length,
 newWins=matched.filter(r=>r.v32win).length;
const rescued=matched.filter(r=>!r.v2win&&r.v32win).length,
 regressed=matched.filter(r=>r.v2win&&!r.v32win).length;
const delta=(newWins-oldWins)/n;
function xorshift(seed){
 let x=seed>>>0;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
function quantile(sorted,q){return sorted[Math.max(0,Math.min(sorted.length-1,Math.floor(q*(sorted.length-1))))];}
function clusterCI(rows,{nBoot=3000}={}){
 const groups=allSeeds.map(seed=>rows.filter(row=>row.seed===seed));
 if(groups.some(g=>!g.length))throw Error('Each seed requires its complete cluster');
 const rand=xorshift(20261122),values=[];
 for(let i=0;i<nBoot;i++){
  let good=0,count=0;
  for(let j=0;j<groups.length;j++){
   const group=groups[Math.floor(rand()*groups.length)];
   for(const row of group){good+=Number(row.v32win)-Number(row.v2win);count++;}
  }
  values.push(good/count);
 }
 values.sort((a,b)=>a-b);
 return {low:quantile(values,.025),high:quantile(values,.975),method:'seed-cluster-bootstrap',resamples:nBoot};
}
const byDeck={};
for(const deck of V32_DECKS){
 const rows=matched.filter(r=>r.deckId===deck);
 byDeck[deck]={games:rows.length,
  v2:{...wilson(rows.filter(r=>r.v2win).length,rows.length)},
  v32:{...wilson(rows.filter(r=>r.v32win).length,rows.length)},
  delta:(rows.filter(r=>r.v32win).length-rows.filter(r=>r.v2win).length)/rows.length,
  ci:clusterCI(rows),
  discordant:{rescued:rows.filter(r=>!r.v2win&&r.v32win).length,
   regressed:rows.filter(r=>r.v2win&&!r.v32win).length}};
}
const byTurn={};
for(const name of ['first','second']){
 const rows=matched.filter(r=>name==='first'?r.first===r.seat:r.first!==r.seat);
 byTurn[name]={games:rows.length,v2:wilson(rows.filter(r=>r.v2win).length,rows.length),
  v32:wilson(rows.filter(r=>r.v32win).length,rows.length)};
}
// LIFE statistics are descriptive only and are recorded *after* legal reveals;
// a policy affects how much damage is dealt, so trigger counts are not an
// exogenous instrument or a causal correction to win rate.
function lifeMetrics(rows,key){
 const exposures=[0,0],triggerBearing=[0,0],types=Object.create(null);
 let gamesWithTrigger=0;
 const groups={'0':{n:0,wins:0},'1':{n:0,wins:0},'2+':{n:0,wins:0}};
 for(const row of rows){
  const life=row[key];
  if(!life||life.lifeReveals?.length!==2||life.triggerBearing?.length!==2)
   throw Error('missing public LIFE trigger log');
  for(let side=0;side<2;side++){
   exposures[side]+=life.lifeReveals[side];
   triggerBearing[side]+=life.triggerBearing[side];
  }
  for(const [name,count] of Object.entries(life.types||{}))
   types[name]=(types[name]||0)+count;
  const own=life.triggerBearing[row.seat];
  if(life.triggerBearing.some(x=>x>0))gamesWithTrigger++;
  const group=groups[own===0?'0':own===1?'1':'2+'];
  group.n++;
  group.wins+=Number(key==='v2Life'?row.v2win:row.v32win);
 }
 return {lifeRevealsBySeat:exposures,triggerBearingBySeat:triggerBearing,
  gamesWithAnyRevealedTrigger:gamesWithTrigger,
  printedTriggerTypes:types,ownTriggerStrata:groups};
}
const directWins=mirrors.filter(m=>m.win).length;
const direct=wilson(directWins,mirrors.length);
const ci=clusterCI(matched);
const reasons=[];
if(delta<.05)reasons.push('Paired uplift below +5 percentage points');
if(ci.low<=0)reasons.push('Seed-cluster bootstrap 95% lower bound not positive');
if(direct.p<.55||direct.low<=.50)
 reasons.push('Direct v3.2 vs v2 mirror rate not convincingly above 50%');
for(const [deck,r] of Object.entries(byDeck))
 if(r.delta<-.03)reasons.push('Material regression versus '+deck);
const report={
 experiment:'white-sword-v3.2-voluntary-Q-counterfactual',
 date:new Date().toISOString(),finalHoldoutUsed:false,
 seeds:allSeeds,shards:3,matchedPairs:n,actualGames:720+120,
 paired:{v2:wilson(oldWins,n),v32:wilson(newWins,n),
  uplift:delta,ci,discordant:{rescued,regressed},
  changedPlaythroughs:matched.filter(r=>r.diverged).length},
 direct:{...direct,matchCount:mirrors.length},
 byDeck,byTurn,
 luckAudit:{interpretation:'Descriptive post-reveal LIFE trigger counts; never used as policy input or causal adjustment',
  v2:lifeMetrics(matched,'v2Life'),v32:lifeMetrics(matched,'v32Life')},
 gate:{eligibleForFurtherReview:reasons.length===0,reasons},
 safeguard:'No automatic promotion; official v2 and earlier 94000..94016 final holdout untouched'
};
mkdirSync(path,{recursive:true});
writeFileSync(path+'/EVALUATION-840.json',JSON.stringify(report,null,2)+'\n');
const pct=v=>(100*v).toFixed(2)+'%';
const md=['# 白劍 v3.2：840 場擴大驗證','',
 '**此為實驗結果，沒有自動部署，也沒有使用歷史最終保留種子。**','',
 '- 30 種子 × 4 先後手／座位 × 3 牌組 × 2 政策 = **720 場**',
 '- 30 種子 × 4 先後手／座位 = **120 場 v3.2 與 v2 直接白劍鏡像**',
 '',
 '## 全新種子完整配對表現','',
 '| 指標 | 原版 v2 | v3.2 |','|---|---:|---:|',
 '| 對 Hard Search 2 勝率 | '+oldWins+'/'+n+' ('+pct(oldWins/n)+') | '+newWins+'/'+n+' ('+pct(newWins/n)+') |',
 '- 同種子配對勝率差：'+pct(delta),
 '- 依初始 seed 分群的 bootstrap 95% 差距區間：'+pct(ci.low)+' 至 '+pct(ci.high),
 '- 原本輸，後來贏：'+rescued+'；原本贏，後來輸：'+regressed,
 '- 至少一步出牌不同的配對：'+report.paired.changedPlaythroughs+'/'+n,
 '- 直接鏡像 v3.2 對 v2：'+directWins+'/'+mirrors.length+
  ' ('+pct(direct.p)+')，Wilson 95% CI '+pct(direct.low)+'–'+pct(direct.high),
 '',
 '## 牌組','',
 '| 對手 | 配對數 | v2 | v3.2 | 差距 |','|---|---:|---:|---:|---:|',
 ...Object.entries(byDeck).map(([deck,r])=>
  '| '+deck+' | '+r.games+' | '+pct(r.v2.p)+' | '+pct(r.v32.p)+' | '+pct(r.delta)+' |'),
 '',
 '## 血區隨機性','',
 '觸發統計為公開翻開之後才記錄的描述性資料，並不讓 AI 偷看隱藏生命；',
 '即使配對使用同種子，出牌不同後可能造成不同的攻擊／血區翻開順序。',
 '- v2：翻開含觸發圖示的生命卡片 '+report.luckAudit.v2.triggerBearingBySeat.join('/')+'（雙方座位統計）',
 '- v3.2：翻開含觸發圖示的生命卡片 '+report.luckAudit.v32.triggerBearingBySeat.join('/')+'（雙方座位統計）',
 '- 上述指標是結果關聯，不應用來「扣除運氣」或宣稱觸發造成勝負差。',
 '',
 '## 評估','',report.gate.eligibleForFurtherReview?
 '通過預先定義的進一步審查門檻；仍需獨立最終測試與人工審查。':
 '未通過事先定義的進一步審查門檻；保留 v2。',
 ...reasons.map(r=>'- '+r),''];
writeFileSync(path+'/EVALUATION-840.md',md.join('\n'));
console.log('V32_FINAL_EVAL',JSON.stringify({
 games:report.actualGames,pairs:n,v2Wins:oldWins,v32Wins:newWins,delta,
 ci,directWins,directRate:direct.p,byDeck:Object.fromEntries(Object.entries(byDeck).map(([k,v])=>[k,v.delta])),
 divergences:report.paired.changedPlaythroughs,gate:report.gate
},null,2));
