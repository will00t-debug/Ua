#!/usr/bin/env node
// Compare confirmation rules on the saved v4-B.2 pairs. No new games.
import {readFileSync} from 'node:fs';
import {readJson,writeJson,writeText} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {judgeSamples} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b4/lib/report.mjs';
import {
 ROUND_PAIRS,SCREEN_PAIRS,pairsForPower,recount,runCurrent,runReplication,
 simulateClaims,spread,symmetricNull,tilt
} from '../training/white-sword-ai/v4b4/lib/sampling.mjs';

const ROUNDS=1000;
const ROOT='training/white-sword-ai/v4b4';

export function seriesFromSaved(){
 const positions=readJson('training/white-sword-ai/v4b2/pool.json').positions;
 const lines=readFileSync('training/white-sword-ai/v4b2/rollouts.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line));
 const by=new Map();
 for(const row of lines){
  const attempts=by.get(row.positionId)||new Map();
  const pair=attempts.get(row.attempt)||{};
  pair[row.side]=row;
  attempts.set(row.attempt,pair);
  by.set(row.positionId,attempts);
 }
 const pos=new Map(positions.map(row=>[row.id,row]));
 const series=[];
 for(const [id,attempts] of by){
  const position=pos.get(id);
  const diffs=[];
  for(const [,pair] of [...attempts.entries()].sort((left,right)=>left[0]-right[0])){
   if(!pair.A?.finished||!pair.B?.finished||!position)continue;
   const aWin=pair.A.winner===position.actor;
   const bWin=pair.B.winner===position.actor;
   diffs.push(aWin===bWin?0:(aWin?1:-1));
  }
  series.push({id,diffs});
 }
 return series;
}
function effects(mu,count=1,width=42){
 return Array.from({length:width},(_,index)=>index<count?mu:0);
}
function claim(nullProbs,muList,policy,seed){
 return simulateClaims({seed,rounds:ROUNDS,nullProbs,effects:muList,policy});
}
export function buildStudy(series){
 const saved=recount(series);
 const nullProbs=symmetricNull(saved.plus,saved.ties,saved.minus);
 const tilted=tilt(nullProbs,-0.375);
 const sigma=spread(tilted);
 const fragile=judgeSamples([-1,-1,-1,0,0,0,0,0]);
 const rep=(rng,probs)=>runReplication(rng,probs,{screen:SCREEN_PAIRS,budget:ROUND_PAIRS,cap:4,floor:-0.25});
 return {
  rounds:ROUNDS,
  saved,
  fragile:{mean:fragile.mean,low:fragile.low,high:fragile.high},
  sizes:{boundary:pairsForPower(sigma,0.375,1.96),power:pairsForPower(sigma,0.375,2.8)},
  replication:{each:Math.floor((ROUND_PAIRS-42*SCREEN_PAIRS)/4)},
  nullCurrent:claim(nullProbs,effects(0,0),runCurrent,11),
  nullRep:claim(nullProbs,effects(0,0),rep,11),
  moderateCurrent:claim(nullProbs,effects(-0.375),runCurrent,11),
  moderate:claim(nullProbs,effects(-0.375),rep,11),
  strong:claim(nullProbs,effects(-0.5),rep,13),
  three:claim(nullProbs,effects(-0.375,3),rep,17)
 };
}
function main(){
 const study=buildStudy(seriesFromSaved());
 writeJson(ROOT+'/sampling.json',study);
 const text=renderReport(study);
 writeText(ROOT+'/report.md',text);
 writeText('docs/white-sword-ai/v4b4/report.md',text);
 console.log('平手',study.saved.tieRate.toFixed(3),'加抽',study.saved.extension);
 console.log('null 現行',study.nullCurrent.nominalUpdate.toFixed(2),'確認誤',study.nullRep.falseConfirmed.toFixed(3));
 console.log('0.375 現行真',study.moderateCurrent.trueConfirmed.toFixed(2),'校正真',study.moderateCurrent.bhTrue.toFixed(2),'確認真',study.moderate.trueConfirmed.toFixed(2));
}
if(process.argv[1]&&process.argv[1].endsWith('white-sword-v4b4-sampling.mjs'))main();
