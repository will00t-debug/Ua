#!/usr/bin/env node
// FOR FORENSICS ONLY. Replay already-inspected v3.3-T pilot openings and
// replace exactly one previously legal action, holding opening seed constant.
// This evaluates one deterministic hidden-world continuation and cannot
// establish generally superior moves or be used to tune model weights.
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {readFileSync,writeFileSync} from 'node:fs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V33_PILOT_SEEDS,V33_CONFIG} from '../dist/universal-v2/white-sword-ai/v33-protocol.mjs';

const reportPath='docs/white-sword-ai/v33/MARGIN-AUDIT.json';
const report=JSON.parse(readFileSync(reportPath,'utf8'));
if(report.forensicReplayedGames!==48||report.previousWinCountReproduced!==29||
 report.pilotSeeds.join(',')!==V33_PILOT_SEEDS.join(','))
 throw Error('Forensic source does not reproduce previously frozen pilot');
const base=loadModel('training/white-sword-ai/weights/v2-capped.json');
if(base.version!=='white-sword-specialist-v2-capped'||base.hardCap!==7)
 throw Error('Exact incumbent policy required');
const examples=report.examples;
if(examples.length!==26)throw Error('Expected 26 existing, already inspected candidates');
const byKey=new Map(report.gameResults.map(g=>[[g.seed,g.first,g.seat,g.opponent].join('/'),g]));
const specs=examples.map((row,index)=>{
 if(!V33_PILOT_SEEDS.includes(row.seed)||!row.mostReachable||
  !Number.isInteger(row.step)||row.phase!=='main')throw Error('Unexpected forensic candidate');
 const key=[row.seed,row.first,row.seat,row.opponent].join('/');
 if(!byKey.has(key))throw Error('Missing baseline replay '+key);
 const seats=[];
 seats[row.seat]={deckId:'white-sword',policy:'white-sword',model:base,
  tacticalTempo:true,mode:'blend',scale:V33_CONFIG.scale,hardCap:V33_CONFIG.hardCap,explore:0};
 seats[1-row.seat]={deckId:row.opponent,policy:'hard-search-2'};
 return {seed:row.seed,first:row.first,specialistSeat:row.seat,
  opponentDeck:row.opponent,label:'v33-single-alternative-forensic',
  seats,keepActions:false,keepSamples:false,
  forcedDecision:{
   step:row.step,seat:row.seat,
   originalAction:row.baseTop.action,
   alternativeAction:row.mostReachable.action
  },forensicIndex:index};
});
async function runPool(specs){
 return new Promise((resolve,reject)=>{
  let done=0,next=0,closed=false;const workers=[],out=Array(specs.length);
  const fail=e=>{if(closed)return;closed=true;for(const w of workers)void w.terminate();
   reject(e instanceof Error?e:Error(String(e)));};
  const assign=(worker,index)=>{
   const cb=msg=>{
    worker.off('message',cb);
    if(!msg?.ok)return fail(msg?.error||'worker error');
    out[index]=msg.game;done++;
    if(done%5===0||done===specs.length)
     console.log('FORCED_REPLAY_PROGRESS',done,'/',specs.length);
    if(next<specs.length)assign(worker,next++);
    else if(done===specs.length&&!closed){
     closed=true;for(const w of workers)void w.terminate();resolve(out);
    }
   };
   worker.on('message',cb);
   worker.postMessage(specs[index]);
  };
  const count=Math.min(3,Math.max(1,Number(process.env.WS_WORKERS)||availableParallelism()-1),specs.length);
  for(let i=0;i<count;i++){
   const w=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   workers.push(w);w.on('error',fail);assign(w,next++);
  }
 });
}
const games=await runPool(specs);
const invalid=games.filter((g,i)=>g.status!=='finished'||![0,1].includes(g.winner)||
 Object.values(g.anomalies||{}).some(Boolean)||g.forcedAudit?.step!==specs[i].forcedDecision.step);
if(invalid.length)throw Error('Bad forced replay '+JSON.stringify(invalid.slice(0,3).map(g=>({
 seed:g.seed,error:g.error,status:g.status,forcedAudit:g.forcedAudit,anomalies:g.anomalies
}))));
const comparisons=games.map((g,i)=>{
 const row=examples[i],k=[row.seed,row.first,row.seat,row.opponent].join('/');
 const old=byKey.get(k);
 const hardDelta=row.mostReachable.attribution?.hardGap;
 return {seed:row.seed,first:row.first,seat:row.seat,opponent:row.opponent,
  step:row.step,turn:row.turn,original:row.baseTop,alternative:row.mostReachable,
  sameInitialSeed:true,oldWinner:old.winner,newWinner:g.winner,
  oldSpecialistWon:old.specialistWon,newSpecialistWon:g.winner===row.seat,
  hardPrefersAlternative:hardDelta<-1e-8,
  oldTurn:old.turn,newTurn:g.turn,
  oldActionsBeforeForcedVerified:true,
  note:'One legal choice was changed; all later decisions recomputed, and changed action sequences may alter LIFE reveal timing'
 };
});
const byType={};
for(const x of comparisons){
 const type=x.original.action?.type+'→'+x.alternative.action?.type;
 const bin=byType[type]||(byType[type]={cases:0,rescues:0,regressions:0});
 bin.cases++;
 if(!x.oldSpecialistWon&&x.newSpecialistWon)bin.rescues++;
 if(x.oldSpecialistWon&&!x.newSpecialistWon)bin.regressions++;
}
const summary={
 cases:comparisons.length,
 hardPrefersAlternative:comparisons.filter(r=>r.hardPrefersAlternative).length,
 outcomeChanged:comparisons.filter(r=>r.oldWinner!==r.newWinner).length,
 rescues:comparisons.filter(r=>!r.oldSpecialistWon&&r.newSpecialistWon).length,
 regressions:comparisons.filter(r=>r.oldSpecialistWon&&!r.newSpecialistWon).length,
 unchanged:comparisons.filter(r=>r.oldWinner===r.newWinner).length,
 byType
};
const output={
 experiment:'v3.3-T one-decision counterfactual continuation on previously inspected pilots',
 sourceRun:45049979523,sourceArtifact:'white-sword-v33-margin-audit',
 seeds:V33_PILOT_SEEDS,usedIndependentHoldout:false,weightsChanged:false,
 summary,comparisons,
 caveats:[
  'A counterfactual continuation is one deterministic world conditional on the original seed, NOT an estimated causal effect over different hidden draws.',
  'Many counterfactuals share opening seeds and game state: samples are neither independent nor blind.',
  'Forcing a choice changes later action/trigger ordering, so outcomes cannot be attributed to the isolated tactical heuristic without further verification.',
  'Never tune a policy or promote a model using these forensic outcomes.',
  'All forced alternatives were captured as legal Hard-capped actions in the original actor-visible evaluation.'
 ]
};
const root='docs/white-sword-ai/v33/COUNTERFACTUAL-PILOT';
writeFileSync(root+'.json',JSON.stringify(output,null,2)+'\n');
const lines=['# 白劍 v3.3-T：只換一手的舊種子反事實測試','',
 '此測試 **不能** 計算 AI 真實勝率，也不代表哪個選擇一定比較好。','',
 '- 26 個原本合法的替代候選，固定原始初始牌序，單步切換後讓兩方 AI 正常繼續',
 '- 轉換後有不同勝負：'+summary.outcomeChanged+'；由輸變贏：'+summary.rescues+'；由贏變輸：'+summary.regressions,
 '- 結果相同：'+summary.unchanged,
 '- 其中 Hard 搜尋原本支持替代者：'+summary.hardPrefersAlternative,
 '',
 '| 原動作→替代 | 樣本 | 變贏 | 變輸 |','|---|---:|---:|---:|',
 ...Object.entries(byType).map(([name,v])=>`| ${name} | ${v.cases} | ${v.rescues} | ${v.regressions} |`),
 '',
 '### 解讀',
 '重播的是同一個已被使用過的 pilot seed。這可偵查大模型與 Hard 搜尋偏好的衝突是否值得進一步追蹤，',
 '但不能宣稱某動作造成勝負，尤其血區 trigger 和後續對局會隨動作不同而變化。',
 '建議下一階段對真正有差異的情境做嚴格獨立取樣與多種牌序交叉驗證。',''
];
writeFileSync(root+'.md',lines.join('\n'));
console.log('V33_COUNTERFACTUAL_RESULT',JSON.stringify(summary,null,2));
