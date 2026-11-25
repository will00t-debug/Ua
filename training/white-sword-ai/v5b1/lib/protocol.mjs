// v5-B.1 corrects the match schedule. The residual weight stays frozen.
// These seeds, the pairing, and the interval were fixed before the new games.
import {CELLS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {assertFreshSeed} from '../../v4b/lib/protocol.mjs';
import {rolloutSeed} from '../../v4b4/lib/round.mjs';
import {
 FEATURE,MATCH_OPPONENTS,MATCH_SEEDS,MINE_SEEDS,OFFICIAL_V2,VALIDATE_SALT,installColumn
} from '../../v5b/lib/protocol.mjs';

export const CODE_VERSION='v5b1-1';
export const FROZEN_WEIGHT=3.25954286097052;
export const FAIR_GAMES=192;
export const SEEDS_PER_OPPONENT=16;
export const GAMES_PER_SEED=4;
export const AUDIT_GAMES=12;

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const FAIR_SEEDS=range(177000,SEEDS_PER_OPPONENT);
export const AUDIT_SEEDS=Object.freeze({
 'white-sword':176800,
 'white-sword-second':176803,
 'reject-blue':176801,
 renruki:176802
});
export const VALIDATE_IDS=Object.freeze([
 '191782744f0eb802','904a146535fb37f8','ba70c431561842ab','1ec9b5aa2e669cae',
 '0313a360cfb933b0','16f091f145e70ecf','0396799cc5bf2cb2','38481221f0b7bfad'
]);

// Two-sided 95% Student t critical values, df = index.
const T95=Object.freeze([
 null,
 12.7062047,4.30265273,3.18244631,2.77644511,2.57058184,
 2.44691185,2.36462425,2.30600414,2.26215716,2.22813885,
 2.20098516,2.17881283,2.16036866,2.14478669,2.13144955,
 2.1199053,2.10981558,2.10092204,2.09302405,2.08596345
]);

export const FAIR_RULE=Object.freeze({
 id:'v5b1-fair-1',
 text:'鏡像用四個座位與先後攻的組合。其他對手的每個種子用同一個座位，讓 v2 和殘差各先攻、各後攻一次。配對差先在種子內平均，再對種子平均做雙尾 95% t 區間。區間含 0 只表示這一批看不出穩定差距。這批對局不拿來改權重，也不套用冠軍晉級。'
});

export function reservedSeeds(){
 const seeds=new Set([
  ...MATCH_SEEDS,
  ...Object.values(MINE_SEEDS).flat()
 ]);
 for(const id of VALIDATE_IDS){
  for(let attempt=0;attempt<66;attempt++)seeds.add(rolloutSeed({id},VALIDATE_SALT,attempt));
 }
 return seeds;
}
export function assertDiagnosticSeeds(seeds,reserved=reservedSeeds()){
 const blocked=new Set(reserved);
 const seen=new Set();
 for(const seed of seeds){
  assertFreshSeed(seed,'v5b1');
  if(seen.has(seed)||blocked.has(seed))throw Error('診斷種子 '+seed+' 和既有對局重疊');
  seen.add(seed);
 }
}
export function seedInterval(groups){
 const means=(groups||[]).filter(rows=>rows?.length).map(rows=>rows.reduce((sum,value)=>sum+value,0)/rows.length);
 const n=means.length;
 if(n<2)return {n,df:Math.max(0,n-1),mean:n?means[0]:null,low:null,high:null};
 const mean=means.reduce((sum,value)=>sum+value,0)/n;
 let square=0;
 for(const value of means)square+=(value-mean)**2;
 const se=Math.sqrt(square/(n-1))/Math.sqrt(n);
 const t=T95[n-1];
 if(!t)throw Error('種子數超出事先登記的 t 表');
 return {n,df:n-1,mean,low:mean-t*se,high:mean+t*se};
}
export function assertFrozenCandidate(candidate){
 if(candidate?.id!=='minimum')throw Error('凍結候選不是 minimum');
 if(candidate.weight!==FROZEN_WEIGHT)throw Error('殘差權重被改過');
 if(candidate.feature!==FEATURE)throw Error('凍結欄位被改過');
 if(candidate.official!==OFFICIAL_V2)throw Error('凍結紀錄裡的 v2 雜湊不一致');
 if(candidate.adopted!==false||candidate.promoted!==false||candidate.recommended!==false){
  throw Error('凍結候選已被標成採用');
 }
 return candidate.weight;
}
export {CELLS,FEATURE,MATCH_OPPONENTS,OFFICIAL_V2,installColumn};
