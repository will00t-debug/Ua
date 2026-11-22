// White Sword v4-A evolution protocol.
// Thresholds, seed blocks and game counts are fixed before any match.
// Nothing here is imported by the live battle menu or the production index.
import {BLEND_HARD_CAP,BLEND_SCALE} from '../../../../dist/universal-v2/white-sword-ai/constants.mjs';

export const CODE_VERSION='v4a-1';
export const CANDIDATE_COUNT=8;
export const STEP_CAP=1.5;
export const WEIGHT_CLIP=6;
export const SIGMA_SCALE_MAX=2;
export const SIGMA_BUMP=1.25;
export const HARD_CAP=BLEND_HARD_CAP;
export const SCALE=BLEND_SCALE;
export const EXPLORE=0;
export const BOOTSTRAP_SAMPLES=3000;
export const BOOTSTRAP_SEED=20261122;

// Promotion is an experimental-champion gate only. It never deploys.
export const PROMOTION=Object.freeze({
 pairedDelta:0.05,
 ciLow:0,
 mirrorP:0.55,
 mirrorWilsonLow:0.5,
 mirrorGames:120,
 pairedGames:360,
 deckFloor:-0.03,
 screenWinFloor:2,
 screenGames:24
});

export const DECK_LABEL=Object.freeze({
 'white-sword':'白劍',
 'reject-blue':'我拒絕',
 renruki:'戀露'
});

export const METHOD_LABEL=Object.freeze({
 'gaussian-small':'小幅高斯變異',
 'gaussian-mid':'中幅高斯變異',
 'gaussian-wide':'較寬高斯變異',
 sparse:'稀疏變異',
 'top-magnitude':'較大權重變異',
 'mix-v1':'與 v1 策略混合',
 'mix-v0':'與 v0 策略混合',
 group:'攻防與能量特徵變異'
});

export const OPPONENTS=Object.freeze([
 'champion','historical','hard-white','hard-reject','hard-renruki','peer'
]);

export const HARD_DECK=Object.freeze({
 'hard-white':'white-sword',
 'hard-reject':'reject-blue',
 'hard-renruki':'renruki'
});

// Inclusive ranges already spent by earlier experiments, plus the permanent
// v4 holdout. splitForSeed on the production module is intentionally unchanged.
export const RESERVED=Object.freeze([
 [11000,11019],[12000,12099],[19000,21999],[30000,30999],[41000,41999],
 [45000,45004],[47000,47029],[48100,48103],[48200,48229],
 [48500,48503],[48600,48663],[48700,48729],
 [50000,50999],[80000,80999],[92000,92016],[94000,94016],
 [130000,130016]
]);

export const PROFILES=Object.freeze({
 smoke:Object.freeze({
  name:'smoke',
  candidates:CANDIDATE_COUNT,
  cells:1,
  stageA:Object.freeze({seedCount:1,opponents:Object.freeze(['champion','hard-white']),floor:false}),
  stageB:Object.freeze({keep:2,seedCount:1,opponents:Object.freeze(['hard-white'])}),
  stageC:null,
  probe:Object.freeze({games:1,maxSteps:60,maxPositions:6})
 }),
 round:Object.freeze({
  name:'round',
  candidates:CANDIDATE_COUNT,
  cells:4,
  stageA:Object.freeze({seedCount:1,opponents:OPPONENTS,floor:true}),
  stageB:Object.freeze({keep:3,seedCount:4,opponents:OPPONENTS}),
  stageC:Object.freeze({
   pairedSeeds:30,mirrorSeeds:30,
   decks:Object.freeze(['white-sword','reject-blue','renruki'])
  }),
  probe:Object.freeze({games:3,maxSteps:180,maxPositions:12})
 })
});

export function isReserved(seed){
 return RESERVED.some(([start,end])=>seed>=start&&seed<=end);
}
export function expectedCounts(profileName){
 const profile=PROFILES[profileName];
 if(!profile)throw Error('Unknown v4-A profile '+profileName);
 const stageA=profile.candidates*profile.stageA.seedCount*profile.cells*profile.stageA.opponents.length;
 const stageB=profile.stageB.keep*profile.stageB.seedCount*profile.cells*profile.stageB.opponents.length;
 const stageC=profile.stageC
  ?profile.stageC.pairedSeeds*profile.cells*profile.stageC.decks.length*2+profile.stageC.mirrorSeeds*profile.cells
  :0;
 return {stageA,stageB,stageC,total:stageA+stageB+stageC};
}
function range(start,count){
 return Array.from({length:count},(_,index)=>start+index);
}
export function planSeeds(round,profileName){
 const profile=PROFILES[profileName];
 if(!profile)throw Error('Unknown v4-A profile '+profileName);
 if(profileName==='smoke'){
  return {
   round:0,profile:'smoke',codeVersion:CODE_VERSION,
   probe:range(101900,profile.probe.games),
   stageA:[101910],
   stageB:[101920],
   stageCPaired:[],
   stageCMirror:[]
  };
 }
 if(!Number.isInteger(round)||round<1)throw Error('Evolution round must be a positive integer');
 const base=100000+(round-1)*1000;
 const plan={
  round,profile:'round',codeVersion:CODE_VERSION,
  probe:range(base,profile.probe.games),
  stageA:[base+100],
  stageB:range(base+200,profile.stageB.seedCount),
  stageCPaired:range(base+400,profile.stageC.pairedSeeds),
  stageCMirror:range(base+500,profile.stageC.mirrorSeeds)
 };
 const flat=seedEntries(plan);
 const seen=new Set();
 for(const entry of flat){
  if(seen.has(entry.seed))throw Error('Seed plan repeats '+entry.seed);
  seen.add(entry.seed);
  if(isReserved(entry.seed))throw Error('Seed plan touched a reserved seed '+entry.seed);
  if(entry.seed>=130000)throw Error('Seed plan entered the v4 holdout');
 }
 if(base+999>=130000)throw Error('Round '+round+' would enter the v4 holdout');
 return plan;
}
export function seedEntries(plan){
 const rows=[];
 const push=(seeds,purpose)=>{
  for(const seed of seeds)rows.push({
   seed,purpose,round:plan.round,profile:plan.profile
  });
 };
 push(plan.probe,'probe');
 push(plan.stageA,'stage-a');
 push(plan.stageB,'stage-b');
 push(plan.stageCPaired,'stage-c-paired');
 push(plan.stageCMirror,'stage-c-mirror');
 return rows;
}
