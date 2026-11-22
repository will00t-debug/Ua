#!/usr/bin/env node
// Replay exactly the four previously-seen pilot seeds of the rejected v3.3-T.
// This is *forensic*, not selection, retuning or independent validation.
// Do not touch new seeds 48700–48729 or historical final 94000+.
import {Worker} from 'node:worker_threads';
import {availableParallelism} from 'node:os';
import {mkdirSync,writeFileSync} from 'node:fs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {V33_PILOT_SEEDS,V33_CONFIG,v33Cases} from '../dist/universal-v2/white-sword-ai/v33-protocol.mjs';
const base=loadModel('training/white-sword-ai/weights/v2-capped.json');
if(base.version!=='white-sword-specialist-v2-capped'||base.hardCap!==7)
 throw Error('Incorrect incumbent, diagnostic must match the frozen failed pilot');
const rows=v33Cases(V33_PILOT_SEEDS);
if(rows.length!==48)throw Error('Pilot must contain 48 paired openings');
const specs=rows.map(row=>{
 const seats=[];
 seats[row.specialistSeat]={deckId:'white-sword',policy:'white-sword',model:base,
  tacticalTempo:true,mode:'blend',scale:V33_CONFIG.scale,hardCap:V33_CONFIG.hardCap,explore:0};
 seats[1-row.specialistSeat]={deckId:row.opponentDeck,policy:'hard-search-2'};
 return {...row,seats,label:'v33-margin-audit',keepSamples:false,keepActions:false,
  marginAudit:true,trackLife:false};
});
function workerPool(inputs){
 return new Promise((resolve,reject)=>{
  const n=Math.min(3,Math.max(1,Number(process.env.WS_WORKERS)||availableParallelism()-1),inputs.length);
  let next=0,done=0,closed=false;
  const workers=[],output=Array(inputs.length);
  const fail=error=>{
   if(closed)return;closed=true;for(const w of workers)void w.terminate();
   reject(error instanceof Error?error:Error(String(error)));
  };
  function assign(worker,i){
   const callback=msg=>{
    worker.off('message',callback);
    if(!msg?.ok)return fail(msg?.error||'unknown worker error');
    output[i]=msg.game;done++;
    if(done%12===0||done===inputs.length)console.log('TEMPO_AUDIT_PROGRESS',done,'/',inputs.length);
    if(next<inputs.length)assign(worker,next++);
    else if(done===inputs.length&&!closed){
     closed=true;for(const w of workers)void w.terminate();resolve(output);
    }
   };
   worker.on('message',callback);
   worker.postMessage(inputs[i]);
  }
  for(let i=0;i<n;i++){
   const worker=new Worker(new URL('./white-sword-worker.mjs',import.meta.url));
   workers.push(worker);worker.on('error',fail);assign(worker,next++);
  }
 });
}
const games=await workerPool(specs);
const broken=games.filter(g=>g.status!=='finished'||![0,1].includes(g.winner)||
 Object.values(g.anomalies||{}).some(v=>v!==0));
if(broken.length)throw Error('Bad forensic replay '+JSON.stringify(broken.slice(0,3).map(g=>({
 seed:g.seed,status:g.status,error:g.error,anomalies:g.anomalies
}))));
const wins=games.filter((g,i)=>g.winner===rows[i].specialistSeat).length;
if(wins!==29)throw Error('Forensic instrumentation changed old pilot score: '+wins+' instead of 29');
const entries=games.flatMap((g,i)=>(g.marginAudits||[]).map(d=>({
 ...d,seed:rows[i].seed,opponent:rows[i].opponentDeck,
 seat:rows[i].specialistSeat,first:rows[i].first
})));
const byPhase={},reasonCounts={};
let withNonzero=0,withDifferential=0,opportunities=0,over8=0;
const promising=[];
const buckets={'<=0.5':0,'<=1':0,'<=2':0,'<=4':0,'<=8':0,'>8':0,'none':0};
for(const row of entries){
 const phase=byPhase[row.phase]||(byPhase[row.phase]={total:0,multi:0,withNonzero:0,challengers:0,canSwitchAt2:0,canSwitchAt4:0});
 phase.total++;
 if(row.eligible>1)phase.multi++;
 if(row.anyNonzeroTempo){withNonzero++;phase.withNonzero++;}
 if(row.hasBonusDifference)withDifferential++;
 if(row.eligible>1&&row.mostReachable){
  opportunities++;phase.challengers++;
  const k=row.mostReachable.requiredMultiplier;
  if(k<=.5)buckets['<=0.5']++;
  else if(k<=1)buckets['<=1']++;
  else if(k<=2)buckets['<=2']++;
  else if(k<=4)buckets['<=4']++;
  else if(k<=8)buckets['<=8']++;
  else {buckets['>8']++;over8++;}
  if(row.probe?.['2']?.switched)phase.canSwitchAt2++;
  if(row.probe?.['4']?.switched)phase.canSwitchAt4++;
  promising.push(row);
 }else if(row.eligible>1)buckets.none++;
 for(const r of row.baseTop.reasons||[])reasonCounts[r.reason]=(reasonCounts[r.reason]||0)+1;
 for(const r of row.mostReachable?.reasons||[])
  reasonCounts['alternative:'+r.reason]=(reasonCounts['alternative:'+r.reason]||0)+1;
}
promising.sort((a,b)=>a.mostReachable.requiredMultiplier-b.mostReachable.requiredMultiplier);
const display=r=>({
 seed:r.seed,opponent:r.opponent,first:r.first,seat:r.seat,step:r.step,
 turn:r.turn,phase:r.phase,apReady:r.apReady,myLife:r.myLife,oppLife:r.oppLife,
 eligible:r.eligible,baseTop:r.baseTop,mostReachable:r.mostReachable,
 topScoreGap:r.topScoreGap,probe:r.probe
});
const byOpponent=Object.fromEntries(['white-sword','reject-blue','renruki'].map(o=>{
 const filtered=entries.filter(e=>e.opponent===o);
 return [o,{decisions:filtered.length,multi:filtered.filter(e=>e.eligible>1).length,
  nonzeroTempo:filtered.filter(e=>e.anyNonzeroTempo).length,
  withReachableAlternative:filtered.filter(e=>e.mostReachable).length,
  possibleSwitchX2:filtered.filter(e=>e.probe?.['2']?.switched).length,
  possibleSwitchX4:filtered.filter(e=>e.probe?.['4']?.switched).length
 }];
}));
const report={
 experiment:'v3.3-T 112-game pilot forensic score-gap audit',
 originalPilotRun:45043639629,forensicReplayedGames:games.length,
 pilotSeeds:V33_PILOT_SEEDS,previousWinCountReproduced:wins,
 finalHoldoutUsed:false,untouched840SeedsUsed:false,
 result:{blendDecisionCount:entries.length,withNonzero,withDifferential,
  opportunities,over8,byPhase,byOpponent,buckets,reasonCounts,
  multiplierProbes:Object.fromEntries([1,2,4,8].map(k=>[String(k),entries.filter(e=>e.probe?.[k]?.switched).length]))},
 examples:promising.slice(0,35).map(display),
 allDecisions:entries.map(display),
 caveats:[
  'A score difference is not a measure of gameplay strength or a causal effect.',
  'Hypothetical multipliers are diagnostics, not recommended production weights.',
  'The 48 already-inspected pilot openings are not an independent evaluation set.',
  'All candidates were previously restricted to Hard Search 2 root cap; no forbidden moves tested.',
  'Unrevealed LIFE/hand/deck values are not recorded.'
 ]
};
mkdirSync('docs/white-sword-ai/v33',{recursive:true});
const root='docs/white-sword-ai/v33/MARGIN-AUDIT';
writeFileSync(root+'.json',JSON.stringify(report,null,2)+'\n');
const lines=['# 白劍 v3.3-T：不改出牌的候選分數差鑑識','',
 '- 重播 '+games.length+' 場舊 pilot，v3.3-T '+wins+'/48；新測試與最終 holdout 均未使用',
 '- 含戰術加分的決策：'+withNonzero+'/'+entries.length,
 '- 加分相對原選擇有差別：'+withDifferential,
 '- 至少有一個加分優勢候選：'+opportunities,
 ...[1,2,4,8].map(k=>'- **純離線假設** '+k+' 倍戰術分數可能改變 '+report.result.multiplierProbes[k]+' 個決策'),
 '',
 '## 依照決策階段','',
 '| 階段 | 決策 | 多候選 | 含戰術加分 | 有競爭候選 | 假設 2× 可換手 | 假設 4× 可換手 |',
 '|---|---:|---:|---:|---:|---:|---:|',
 ...Object.entries(byPhase).map(([phase,a])=>`| ${phase} | ${a.total} | ${a.multi} | ${a.withNonzero} | ${a.challengers} | ${a.canSwitchAt2} | ${a.canSwitchAt4} |`),
 '',
 '## 最接近改變選擇的 12 個局面（只列已公開／自己可見的資訊）','',
 '| seed | 對手 | 回合 | 階段 | AP | 對手 LIFE | 原選擇 | 替代 | 原評分差 | 戰術加分優勢 | 理論需放大 |',
 '|---|---|---:|---|---:|---:|---|---|---:|---:|---:|',
 ...promising.slice(0,12).map(r=>{
  const v=r.mostReachable;
  return `| ${r.seed} | ${r.opponent} | ${r.turn} | ${r.phase} | ${r.apReady} | ${r.oppLife} | ${r.baseTop.action?.type} | ${v.action?.type} | ${v.gap.toFixed(3)} | ${v.bonusAdvantage.toFixed(3)} | ${v.requiredMultiplier.toFixed(2)}× |`;
 }),
 '', '## 解讀','',
 '本報告目的只有找出真正可能更動出牌的差距，不以任何倍數製作新 AI，也不推論哪個候選比較好。',
 '只有證實某種局面誤判、有對應戰術證據後，才可獨立建立修正候選與**全新**對局種子。',''
];
writeFileSync(root+'.md',lines.join('\n'));
console.log('V33_MARGIN_AUDIT_RESULT',JSON.stringify({
 games:games.length,wins,decisions:entries.length,
 withNonzero,withDifferential,opportunities,
 byPhase,byOpponent,buckets,probe:report.result.multiplierProbes,
 topExamples:promising.slice(0,8).map(x=>({
 seed:x.seed,opponent:x.opponent,phase:x.phase,
 k:x.mostReachable.requiredMultiplier,
 from:x.baseTop.action.type,to:x.mostReachable.action.type,
 gap:x.mostReachable.gap,bonusAdvantage:x.mostReachable.bonusAdvantage
 }))
},null,2));
