// White Sword v4-B, round 1. These limits were fixed before the pilot.
// 5,000 games is a later budget, not this round's spend. A full champion
// challenge runs only after the development gate below.
import {BLEND_HARD_CAP,BLEND_SCALE,HARD_NODES} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';

export const CODE_VERSION='v4b-1';
export const BUDGET_CAP=5000;
export const PILOT_GAMES=200;
export const MAX_POSITIONS=40;
export const PER_BUCKET_CAP=8;
export const MIN_BUCKETS=4;
export const MIN_POSITIONS=8;
export const SAMPLES_FIRST=8;
export const SAMPLES_MAX=24;
export const SAMPLE_EXTEND=8;
export const MAX_ROLLOUT_GAMES=2000;
export const ROLLOUT_STEPS=400;
export const MIN_FINISHED_RATE=0.5;
export const MIN_USABLE=4;
export const STEP_CAP=1.5;
export const WEIGHT_CLIP=6;
export const SCALE=BLEND_SCALE;
export const HARD_CAP=BLEND_HARD_CAP;
export const OFFICIAL_NODES=HARD_NODES;
export const PILOT_ANOMALY_RATE=0.02;
export const DECK_WARNING=-0.03;
export const UPDATE_GAIN=0.35;

export const BUCKETS=Object.freeze([
 'early-energy','ap','line-move','mid-entry','raid','attack-defense','late-pressure'
]);

function range(start,count){
 return Object.freeze(Array.from({length:count},(_,index)=>start+index));
}
export const PILOT_SEEDS=range(170000,10);
export const MINE_SEEDS=Object.freeze({
 'white-sword':range(170100,8),
 'reject-blue':range(170110,8),
 renruki:range(170120,8)
});
export const DEV_SEEDS=range(171000,4);
export const DEV_DECKS=Object.freeze(['white-sword','reject-blue','renruki']);
// Reserved for a later champion challenge. This round does not spend them
// unless the development gate says the frozen model is worth that cost.
export const CHALLENGE_PAIRED=range(172000,30);
export const CHALLENGE_MIRROR=range(172200,30);

const BLOCKED=Object.freeze([
 [94000,94016],[130000,130016],[100000,104999],[160000,162229]
]);
export function assertFreshSeed(seed,label){
 if(!Number.isInteger(seed))throw Error(label+' seed is not an integer');
 for(const [lo,hi] of BLOCKED){
  if(seed>=lo&&seed<=hi){
   const error=Error(label+' seed '+seed+' 屬於已經用過的驗證或保留區');
   error.code='V4B_SEED';
   throw error;
  }
 }
}
export function assertFreshPlan(seeds,label){
 const seen=new Set();
 for(const seed of seeds){
  assertFreshSeed(seed,label);
  if(seen.has(seed))throw Error(label+' seed '+seed+' 重複');
  seen.add(seed);
 }
}

// A sample cap is not a reason to prefer the higher win rate.
// The interval has to exclude 0. A near tie is left as insufficient.
export function judgeSamples(diffs){
 const n=diffs.length;
 if(!n)return {n:0,mean:0,low:0,high:0,usable:false,reason:'沒有完成的配對'};
 const mean=diffs.reduce((sum,value)=>sum+value,0)/n;
 let square=0;
 for(const value of diffs)square+=(value-mean)**2;
 const se=Math.sqrt((n>1?square/(n-1):0)/n);
 const low=mean-1.96*se;
 const high=mean+1.96*se;
 const usable=low>0||high<0;
 return {n,mean,low,high,usable,reason:usable?'區間不含 0':'證據不足'};
}
export function shouldExtend(judgment,attempts){
 if(judgment.usable)return false;
 if(attempts>=SAMPLES_MAX)return false;
 if(judgment.n<4)return true;
 return Math.abs(judgment.mean)>=0.125;
}

export function pilotDecision(games){
 const totals={illegal:0,leak:0,fallback:0,timeout:0,deadLoop:0,engineError:0,opponentFallback:0,unfinished:0};
 for(const game of games){
  for(const key of Object.keys(totals))totals[key]+=game.anomalies?.[key]||0;
  if(game.status!=='finished'||(game.winner!==0&&game.winner!==1))totals.unfinished++;
 }
 const rate=games.length?totals.unfinished/games.length:1;
 const reasons=[];
 if(games.length!==PILOT_GAMES)reasons.push('pilot 不是事先登記的 '+PILOT_GAMES+' 場');
 if(totals.leak)reasons.push('pilot 出現隱藏資訊洩漏');
 if(totals.engineError||totals.illegal)reasons.push('pilot 出現非法動作或引擎異常');
 if(rate>PILOT_ANOMALY_RATE)reasons.push('未完成對局比例高於 '+PILOT_ANOMALY_RATE);
 return {ok:reasons.length===0,reasons,totals,unfinishedRate:rate,games:games.length};
}

// Point estimate below -3pp is a warning. It is confirmed only when the
// whole interval sits below -3pp. Either one blocks the expensive challenge.
export function deckWarning(deck){
 if(!(deck.delta<DECK_WARNING))return null;
 const confirmed=Number.isFinite(deck.ci?.high)&&deck.ci.high<DECK_WARNING;
 return {
  id:deck.id,delta:deck.delta,n:deck.n,ci:deck.ci,confirmed,
  text:confirmed?'區間整段落在 -3 個百分點以下':'點估計低於 -3 個百分點，區間仍含較小的差距'
 };
}
export function devEntry({paired,decks,anomalies}){
 const warnings=(decks||[]).map(deckWarning).filter(Boolean);
 const reasons=[];
 const dirt=(anomalies?.illegal||0)+(anomalies?.leak||0)+(anomalies?.engineError||0)+(anomalies?.unfinished||0)
  +(anomalies?.fallback||0)+(anomalies?.timeout||0)+(anomalies?.deadLoop||0)+(anomalies?.opponentFallback||0);
 if(dirt)reasons.push('開發驗證有異常或未完成對局');
 if(!(paired?.n>=48))reasons.push('開發驗證配對少於 48');
 if(!(paired?.delta>=0.05))reasons.push('開發驗證勝率差未達 +5 個百分點');
 if(!(paired?.ci?.low>0))reasons.push('開發驗證信賴區間下限沒有大於 0');
 if(warnings.length)reasons.push('有牌組出現退步警訊');
 return {enter:reasons.length===0,reasons,warnings};
}
