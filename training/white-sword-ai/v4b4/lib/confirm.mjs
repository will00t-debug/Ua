// Screen on one sample. Confirm on another. The confirmation length is fixed
// before any confirmation pair is drawn.
import {mulberry32} from '../../v4a/lib/evolve.mjs';
import {judgeSamples} from '../../v4b/lib/protocol.mjs';
import {benjaminiHochberg} from '../../v4b3/lib/labels.mjs';
import {conditionalMeanInterval,holm,signTest} from './exact.mjs';
import {SCREEN_PAIRS,sampleDiffs,tilt} from './sampling.mjs';

export const SCREEN_POSITIONS=42;
export const SCREEN_FLOOR=-0.25;
export const CONFIRM_CAP=4;
export const CONFIRM_PAIRS=66;
export const CONFIRM_BUDGET=CONFIRM_CAP*CONFIRM_PAIRS;
export const PLAN_MODE='fixed';
export const PLAN_CORRECTION='holm';
export const PLAN_SIDE='one';

export function nullFromTie(tie){
 const share=(1-tie)/2;
 return {plus:share,tie,minus:share};
}
export function probsFor(mu,tie){
 const base=nullFromTie(tie);
 if(!mu)return base;
 return tilt(base,mu);
}
export function fixedProbs(mu,tie){
 const decisive=1-tie;
 if(tie<0||tie>1||Math.abs(mu)>decisive+1e-9)throw Error('平手比例留不住這個平均差');
 const plus=(decisive+mu)/2;
 const minus=(decisive-mu)/2;
 return {plus,tie,minus,mean:plus-minus};
}
export function pairsForCandidates(count,mode=PLAN_MODE){
 if(count<=0)return 0;
 if(mode==='fixed')return CONFIRM_PAIRS;
 return Math.floor(CONFIRM_BUDGET/Math.min(count,CONFIRM_CAP));
}
export function screenSummary(diffs){
 const row=judgeSamples(diffs);
 return {mean:row.mean,n:row.n,low:row.low,high:row.high};
}
export function selectCandidates(summaries,learnable,{floor=SCREEN_FLOOR,cap=CONFIRM_CAP}={}){
 return summaries.map((row,index)=>({index,mean:row.mean}))
  .filter(row=>row.mean<=floor&&learnable[row.index]!==false)
  .sort((left,right)=>left.mean-right.mean||left.index-right.index)
  .slice(0,cap);
}
function sideP(exact,side){
 return side==='two'?exact.pTwo:exact.pOne;
}
export function judgeConfirmation(diffs){
 const exact=signTest(diffs);
 const normal=judgeSamples(diffs);
 const interval=conditionalMeanInterval(diffs);
 return {exact,normal,interval,mean:exact.mean,n:exact.n};
}
export function correctPValues(pValues){
 return {holm:holm(pValues),bh:benjaminiHochberg(pValues)};
}
export function runPipeline(screenRng,confirmRng,positions,{mode=PLAN_MODE,side=PLAN_SIDE}={}){
 const screens=positions.map(position=>sampleDiffs(screenRng,position.probs,SCREEN_PAIRS));
 const summaries=screens.map(screenSummary);
 const chosen=selectCandidates(summaries,positions.map(position=>position.learnable));
 const each=pairsForCandidates(chosen.length,mode);
 const reps=chosen.map(row=>{
  const diffs=sampleDiffs(confirmRng,positions[row.index].probs,each);
  return {index:row.index,screenMean:row.mean,...judgeConfirmation(diffs)};
 });
 const pValues=reps.map(row=>sideP(row.exact,side));
 const sets=correctPValues(pValues);
 const keep=(name)=>reps.filter((row,index)=>sets[name].has(index)&&row.mean<0);
 return {
  screens:summaries,chosen,each,reps,
  holm:keep('holm'),bh:keep('bh'),
  pairs:positions.length*SCREEN_PAIRS+chosen.length*each
 };
}
function stream(seed,round,lane){
 return mulberry32((Math.imul(seed>>>0,0x9E3779B1)+Math.imul(round+1,0x85EBCA6B)+lane*0xC2B2AE35)>>>0);
}
export function simulateScenario(positions,{seed=1,rounds=400,mode=PLAN_MODE,side=PLAN_SIDE}={}){
 const truth=positions.map(position=>position.mu<0&&position.learnable!==false);
 const truthCount=truth.filter(Boolean).length;
 let pairs=0;
 let falseCount=0;
 let falseRounds=0;
 let trueCount=0;
 let missedScreen=0;
 let missedCap=0;
 let missedTest=0;
 let normalFalse=0;
 let bhFalse=0;
 let bhTrue=0;
 let entered=0;
 for(let round=0;round<rounds;round++){
  const result=runPipeline(stream(seed,round,1),stream(seed,round,2),positions,{mode,side});
  pairs+=result.pairs;
  const chosen=new Set(result.chosen.map(row=>row.index));
  const holmSet=new Set(result.holm.map(row=>row.index));
  let falseHere=0;
  for(const hit of result.holm){
   if(truth[hit.index])trueCount++;
   else{falseCount++;falseHere++;}
  }
  if(falseHere)falseRounds++;
  for(const hit of result.bh){
   if(truth[hit.index])bhTrue++;
   else bhFalse++;
  }
  for(const row of result.reps){
   if(row.normal.high<0&&!(positions[row.index].mu<0))normalFalse++;
  }
  entered+=result.chosen.length;
  positions.forEach((position,index)=>{
   if(!truth[index])return;
   const summary=result.screens[index];
   if(!(summary.mean<=SCREEN_FLOOR)){missedScreen++;return;}
   if(!chosen.has(index)){missedCap++;return;}
   if(!holmSet.has(index))missedTest++;
  });
 }
 const roundsN=rounds||1;
 const opportunities=truthCount*rounds;
 return {
  rounds,mode,side,truthCount,
  pairs:pairs/roundsN,games:pairs/roundsN*2,
  falsePerRound:falseCount/roundsN,
  falseRoundRate:falseRounds/roundsN,
  truePerRound:trueCount/roundsN,
  trueRate:opportunities?trueCount/opportunities:null,
  missedScreen:opportunities?missedScreen/opportunities:null,
  missedCap:opportunities?missedCap/opportunities:null,
  missedTest:opportunities?missedTest/opportunities:null,
  insufficient:opportunities?(missedScreen+missedCap+missedTest)/opportunities:null,
  bhFalsePerRound:bhFalse/roundsN,
  bhTrueRate:opportunities?bhTrue/opportunities:null,
  normalFalsePerRound:normalFalse/roundsN,
  entered:entered/roundsN
 };
}
export function scenarioPositions(tie,specials,{kind='tilt'}={}){
 const probs=mu=>kind==='fixed'?fixedProbs(mu,tie):probsFor(mu,tie);
 const rows=Array.from({length:SCREEN_POSITIONS},()=>({mu:0,learnable:true,tie,probs:probs(0)}));
 specials.forEach((special,index)=>{
  rows[index]={mu:special.mu,learnable:special.learnable!==false,tie,probs:probs(special.mu)};
 });
 return rows;
}
