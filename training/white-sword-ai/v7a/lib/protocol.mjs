// v7-A predicts a win-rate advantage over v2 and may refuse the switch.
// The gate is chosen on training games before development is read.
import {HARD_NODES,HARD_OPTIONS} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';
import {HARD_CAP,SCALE,STEP_CAP,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {FROZEN_WEIGHT} from '../../v5b1/lib/protocol.mjs';
import {GENERIC_FEATURES,INTERACTIONS,LAMBDAS} from '../../v6a/lib/protocol.mjs';

export const CODE_VERSION='v7a-1';
export const SHRINK_PAIRS=32;
export const THRESHOLDS=Object.freeze([0.02,0.05,0.08,0.12,0.2,0.35]);
export const ALWAYS=Number.POSITIVE_INFINITY;
export const POSITION_CONTEXT=Object.freeze([
 'bias','phase_main','phase_attack','phase_other','pending',
 'life_diff','my_life','opp_life','my_energy','opp_energy','my_ap','opp_ap',
 'my_hand','opp_hand','my_front','opp_front','block_win','turn','gotei','opp_bp_max','mulligan_redraw_thin'
]);

if(HARD_OPTIONS.nodes!==48||HARD_NODES!==48)throw Error('Hard Search 節點數必須是 48');
if(HARD_CAP!==7||SCALE!==6||STEP_CAP!==1.5||WEIGHT_CLIP!==6)throw Error('v7-A 改到了正式評分限制');
if(FROZEN_WEIGHT!==3.25954286097052)throw Error('070 對照權重被改過');
for(const name of POSITION_CONTEXT){
 if(!GENERIC_FEATURES.includes(name))throw Error('局面特徵不在既有通用清單裡');
}
for(const [left,right] of INTERACTIONS){
 if(!GENERIC_FEATURES.includes(left)||!GENERIC_FEATURES.includes(right))throw Error('交互特徵不在既有通用清單裡');
}

export {GENERIC_FEATURES,INTERACTIONS,LAMBDAS,HARD_CAP,SCALE,FROZEN_WEIGHT};

export function shrink(mean,pairs){
 const n=Number.isFinite(pairs)?pairs:0;
 return n<=0?0:mean*n/(n+SHRINK_PAIRS);
}
export function gameInterval(values){
 const n=values.length;
 if(!n)return {n:0,mean:null,low:null,high:null};
 const mean=values.reduce((sum,value)=>sum+value,0)/n;
 if(n<2)return {n,mean,low:null,high:null};
 let square=0;
 for(const value of values)square+=(value-mean)**2;
 const se=Math.sqrt(square/(n-1))/Math.sqrt(n);
 const t=n-1<=20?T95[n-1]:n-1<=40?2.086:n-1<=60?2.021:1.96;
 return {n,mean,low:mean-t*se,high:mean+t*se};
}
const T95=Object.freeze([
 null,
 12.7062047,4.30265273,3.18244631,2.77644511,2.57058184,
 2.44691185,2.36462425,2.30600414,2.26215716,2.22813885,
 2.20098516,2.17881283,2.16036866,2.14478669,2.13144955,
 2.1199053,2.10981558,2.10092204,2.09302405,2.08596345
]);
export function positiveSignal({threshold,summary,safetyOk}){
 return threshold<ALWAYS
  &&safetyOk
  &&summary.unknown===0
  &&summary.verified>0
  &&summary.effective>summary.reverse
  &&summary.gain.low!=null
  &&summary.gain.low>0;
}
