// Same rollout budget, different claims.
// Screen samples are not a confirmation. A replication is a new sample.
import {mulberry32} from '../../v4a/lib/evolve.mjs';
import {SAMPLES_FIRST,SAMPLES_MAX,SAMPLE_EXTEND,judgeSamples,shouldExtend} from '../../v4b/lib/protocol.mjs';
import {benjaminiHochberg,comparisonP} from '../../v4b3/lib/labels.mjs';

export const SCREEN_PAIRS=SAMPLES_FIRST;
export const ROUND_PAIRS=600;

export function symmetricNull(plus,tie,minus){
 const total=plus+tie+minus;
 const half=(plus+minus)/2;
 return {plus:half/total,tie:tie/total,minus:half/total};
}
function tiltedMean(probs,lambda){
 const up=probs.plus*Math.exp(lambda);
 const down=probs.minus*Math.exp(-lambda);
 const z=up+probs.tie+down;
 return (up-down)/z;
}
export function tilt(probs,mu){
 let low=-12;
 let high=12;
 for(let step=0;step<50;step++){
  const mid=(low+high)/2;
  if(tiltedMean(probs,mid)<mu)low=mid;
  else high=mid;
 }
 const lambda=(low+high)/2;
 const up=probs.plus*Math.exp(lambda);
 const down=probs.minus*Math.exp(-lambda);
 const z=up+probs.tie+down;
 return {plus:up/z,tie:probs.tie/z,minus:down/z,mean:(up-down)/z};
}
export function drawDiff(rng,probs){
 const u=rng();
 if(u<probs.plus)return 1;
 if(u<probs.plus+probs.tie)return 0;
 return -1;
}
export function sampleDiffs(rng,probs,count){
 const diffs=[];
 for(let index=0;index<count;index++)diffs.push(drawDiff(rng,probs));
 return diffs;
}
export function consumeCurrent(diffs){
 let used=0;
 let judgment=judgeSamples([]);
 while(used<SAMPLES_MAX){
  const step=used===0?SAMPLES_FIRST:SAMPLE_EXTEND;
  used=Math.min(SAMPLES_MAX,used+step);
  judgment=judgeSamples(diffs.slice(0,used));
  if(!shouldExtend(judgment,used))break;
 }
 return {...judgment,pairs:used};
}
function updateClaim(row){
 return row.usable===true&&row.high<0;
}
export function runCurrent(rng,probs){
 const rows=probs.map(item=>consumeCurrent(sampleDiffs(rng,item,SAMPLES_MAX)));
 const tiers=rows.map((row,index)=>({index,...row,p:comparisonP(row)}));
 const kept=benjaminiHochberg(tiers.map(row=>row.p));
 const hits=tiers.filter(updateClaim);
 return {
  pairs:rows.reduce((sum,row)=>sum+row.pairs,0),
  nominal:rows.filter(row=>row.usable).length,
  nominalUpdate:hits.length,
  adjustedUpdate:hits.filter(row=>kept.has(row.index)).length,
  hits,
  bhHits:hits.filter(row=>kept.has(row.index)),
  screenUpdate:hits.filter(row=>row.pairs<=SCREEN_PAIRS).length
 };
}
export function runReplication(rng,probs,{screen=SCREEN_PAIRS,budget=ROUND_PAIRS,cap=4,floor=-0.25}={}){
 const screens=probs.map(item=>judgeSamples(sampleDiffs(rng,item,screen)));
 let pairs=probs.length*screen;
 const ranked=screens.map((row,index)=>({index,mean:row.mean}))
  .filter(row=>row.mean<=floor)
  .sort((left,right)=>left.mean-right.mean)
  .slice(0,cap);
 if(!ranked.length||pairs>=budget)return {pairs,slots:0,each:0,confirmed:0,trueConfirmed:0};
 const each=Math.floor((budget-pairs)/ranked.length);
 const reps=[];
 for(const row of ranked){
  const judgment=judgeSamples(sampleDiffs(rng,probs[row.index],each));
  pairs+=each;
  reps.push({index:row.index,...judgment,p:comparisonP(judgment)});
 }
 const kept=benjaminiHochberg(reps.map(row=>row.p));
 const confirmed=reps.filter((row,index)=>kept.has(index)&&row.high<0);
 return {pairs,slots:ranked.length,each,confirmed:confirmed.length,hits:confirmed};
}
export function worldOf(nullProbs,effects){
 const probs=effects.map(mu=>mu===0?nullProbs:tilt(nullProbs,mu));
 return probs;
}
function rate(hits,rounds){
 return rounds?hits/rounds:0;
}
export function simulateClaims({seed=1,rounds=500,nullProbs,effects,policy}){
 const rng=mulberry32(seed>>>0);
 const truth=effects.map(mu=>mu<0);
 let pairs=0;
 let nominalUpdateRounds=0;
 let nominalUpdate=0;
 let adjustedUpdateRounds=0;
 let confirmedRounds=0;
 let confirmed=0;
 let trueConfirmed=0;
 let falseConfirmed=0;
 let bhTrue=0;
 let bhFalse=0;
 for(let round=0;round<rounds;round++){
  const result=policy(rng,worldOf(nullProbs,effects));
  pairs+=result.pairs;
  if(result.nominalUpdate){
   nominalUpdateRounds++;
   nominalUpdate+=result.nominalUpdate;
  }
  if(result.adjustedUpdate)adjustedUpdateRounds++;
  const hits=result.hits||[];
  if(hits.length)confirmedRounds++;
  for(const hit of hits){
   confirmed++;
   if(truth[hit.index])trueConfirmed++;
   else falseConfirmed++;
  }
  for(const hit of result.bhHits||[]){
   if(truth[hit.index])bhTrue++;
   else bhFalse++;
  }
 }
 return {
  rounds,pairs:pairs/rounds,
  nominalUpdateRounds:rate(nominalUpdateRounds,rounds),
  nominalUpdate:nominalUpdate/rounds,
  adjustedUpdateRounds:rate(adjustedUpdateRounds,rounds),
  confirmedRounds:rate(confirmedRounds,rounds),
  confirmed:confirmed/rounds,
  trueConfirmed:trueConfirmed/rounds,
  falseConfirmed:falseConfirmed/rounds,
  bhTrue:bhTrue/rounds,
  bhFalse:bhFalse/rounds
 };
}
export function recount(series){
 let pairs=0;
 let ties=0;
 let plus=0;
 let minus=0;
 let extension=0;
 let flatAtScreen=0;
 let updateAtScreen=0;
 let supportAtScreen=0;
 let updateAfterExtension=0;
 const screenUpdates=[];
 for(const row of series){
  const diffs=row.diffs.filter(value=>value===1||value===0||value===-1);
  pairs+=diffs.length;
  for(const value of diffs){
   if(value>0)plus++;
   else if(value<0)minus++;
   else ties++;
  }
  const screen=judgeSamples(diffs.slice(0,SCREEN_PAIRS));
  const full=consumeCurrent(diffs);
  if(diffs.length>SCREEN_PAIRS)extension+=diffs.length-SCREEN_PAIRS;
  if(screen.n>=SCREEN_PAIRS&&Math.abs(screen.mean)<0.125)flatAtScreen++;
  if(updateClaim(screen)){
   updateAtScreen++;
   screenUpdates.push(row.id);
  }
  if(screen.usable&&screen.mean>0)supportAtScreen++;
  if(!updateClaim(screen)&&updateClaim(full))updateAfterExtension++;
 }
 return {
  positions:series.length,pairs,ties,plus,minus,
  tieRate:pairs?ties/pairs:0,extension,flatAtScreen,updateAtScreen,supportAtScreen,
  updateAfterExtension,screenUpdates
 };
}
export function spread(probs){
 const mean=probs.plus-probs.minus;
 return Math.sqrt(Math.max(0,probs.plus+probs.minus-mean*mean));
}
export function pairsForPower(sigma,mu,z=1.96){
 if(!(mu>0)||!(sigma>0))return Infinity;
 return (z*sigma/mu)**2;
}
