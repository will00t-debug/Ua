#!/usr/bin/env node
// Diagnose how strongly learned policy residuals must be amplified before
// they change a legal, Hard-capped decision. No training or final-test seeds.
import {mkdirSync,writeFileSync} from 'node:fs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {evaluationFixtures} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';
import {PROBE_GAINS} from '../dist/universal-v2/white-sword-ai/gain-probe.mjs';

const incumbent=loadModel('training/white-sword-ai/weights/v2-capped.json');
const learned=loadModel('training/white-sword-ai/weights/v3-experiment.json');
const path='docs/white-sword-ai/v3/GAIN-PROBES';
const rows=evaluationFixtures({smoke:true});
const stats=Object.fromEntries(PROBE_GAINS.map(gain=>[gain,{evaluated:0,switched:0,maxHardLoss:0,examples:[]}]));
let decisions=0,eligibleMultiple=0,seen=0,healthy=0,firstChanged=null;
for(const row of rows){
 const seats=[];
 seats[row.specialistSeat]={deckId:'white-sword',policy:'white-sword',model:incumbent,
  mode:'blend',scale:6,hardCap:7,explore:0};
 seats[1-row.specialistSeat]={deckId:row.opponentDeck,policy:'hard-search-2',model:null};
 const game=playGame({
  seed:row.seed,first:row.first,specialistSeat:row.specialistSeat,
  opponentDeck:row.opponentDeck,label:'gain-probe',
  seats,diagnose:true,diagnosticCandidatePolicy:learned.policy,
  keepActions:false,keepSamples:false
 });
 if(game.status!=='finished'||Object.values(game.anomalies||{}).some(x=>x!==0))
  throw Error('Unhealthy diagnostic match '+JSON.stringify({
   seed:row.seed,opponent:row.opponentDeck,status:game.status,
   error:game.error,anomalies:game.anomalies}));
 healthy++;seen++;
 const d=game.diagnostics;
 decisions+=d.blendDecisions;eligibleMultiple+=d.multiEligible;
 for(const gain of PROBE_GAINS){
  const item=d.policyGains[String(gain)]||{evaluated:0,switched:0,maxHardAnchorLoss:0};
  const agg=stats[gain];
  agg.evaluated+=item.evaluated;
  agg.switched+=item.switched;
  agg.maxHardLoss=Math.max(agg.maxHardLoss,item.maxHardAnchorLoss||0);
  for(const ex of d.probeExamples.filter(ex=>Number(ex.gain)===gain).slice(0,2)){
   if(agg.examples.length<8)agg.examples.push({
    deck:row.opponentDeck,seed:row.seed,seat:row.specialistSeat,
    first:row.first,...ex
   });
   firstChanged??={gain,deck:row.opponentDeck,seed:row.seed,step:ex.step};
  }
 }
 console.log('gain-probe',seen+'/'+rows.length,
  'decisions',d.blendDecisions,'multi',d.multiEligible,
  'switches',PROBE_GAINS.map(g=>g+':'+(d.policyGains[g]?.switched||0)).join(','));
}
for(const gain of PROBE_GAINS){
 const g=stats[gain];
 g.rate=g.evaluated?g.switched/g.evaluated:0;
 if(g.evaluated!==decisions)throw Error('Missing gain diagnostic rows for '+gain);
 // Any chosen move must remain inside Hard's +7 root margin.
 if(g.maxHardLoss>7.00001)throw Error('Gain broke hard root cap '+gain);
}
const safeGains=PROBE_GAINS.filter(g=>g>=2&&g<=16);
const selectedGain=safeGains.find(g=>stats[g].rate>=0.01&&stats[g].rate<=0.10)||null;
const report={
 design:'counterfactual-on-identical-v2-states; not actual candidate match outcomes',
 baseline:'v2-capped',learned:'v3-experiment',validationSeeds:[45000],
 hardCap:7,scale:6,trainUnchanged:true,
 games:seen,healthy,decisions,eligibleMultiple,
 selectedGain,firstChanged,byGain:stats
};
mkdirSync('docs/white-sword-ai/v3',{recursive:true});
writeFileSync(path+'.json',JSON.stringify(report,null,2)+'\n');
const lines=['# 白劍 v3 學習殘差放大診斷',
 '',
 '只在固定 v2 真實局面內比較候選，並不代表放大後的實際勝率。',
 '僅使用既有驗證種子 45000（12 場），不使用最終種子，也不部署。',
 '',
 '- 完成對局：'+seen+'；模型決策：'+decisions+
  '；至少兩個合法 Hard-capped 候選：'+eligibleMultiple,
 '- 只有在 1–10% 的決策發生改變時才選擇預先指定 2/4/8/16 其中最小增益；選擇：'+(selectedGain??'沒有候選符合'),
 '',
 '| 增益倍率 | 改變動作數 | 改變率 | 偏離 Hard 最大分差 |',
 '|---:|---:|---:|---:|',
 ...PROBE_GAINS.map(g=>[
 '|',g,'|',stats[g].switched,'/',stats[g].evaluated,'|',
 (100*stats[g].rate).toFixed(2)+'%','|',stats[g].maxHardLoss.toFixed(2),'|'
 ].join(' ')),
 '',
 '這是局面內反事實診斷；真正棋力仍必須在不同的完整對局中重新驗證。',''];
writeFileSync(path+'.md',lines.join('\n'));
console.log('GAIN_PROBE_RESULT',JSON.stringify({
 games:seen,decisions,eligibleMultiple,selectedGain,
 rates:Object.fromEntries(PROBE_GAINS.map(g=>[g,{switches:stats[g].switched,rate:stats[g].rate}])),
 firstChanged
},null,2));
