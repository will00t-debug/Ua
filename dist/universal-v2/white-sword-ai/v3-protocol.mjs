// White Sword v3 preregistered learning, validation, and untouched final split.
// Never use holdout 94000+ or earlier v1/v2 final/paired seeds to select weights.
import {CELLS,assertTrainableSeed,splitForSeed} from './constants.mjs';

export const V3_TRAIN_SEEDS=Object.freeze(Array.from({length:8},(_,i)=>21050+i));
export const V3_VALIDATION_SEEDS=Object.freeze([45000,45001,45002,45003,45004]);
// Reserved AFTER gain screening; never used by training or gain selection.
export const V3_SECONDARY_VALIDATION_SEEDS=Object.freeze([45005,45006,45007,45008]);
// Stage-guard validation: reserved prior to running the guarded contender.
export const V3_GUARD_VALIDATION_SEEDS=Object.freeze([45009,45010,45011,45012]);
export const V3_FINAL_SEEDS=Object.freeze(Array.from({length:17},(_,i)=>94000+i));
export const V3_DECKS=Object.freeze(['white-sword','reject-blue','renruki']);
export const V3_OPPONENT_POOL=Object.freeze([
 Object.freeze({name:'incumbent-v2',deckId:'white-sword',policy:'white-sword',snapshot:'v2'}),
 Object.freeze({name:'previous-v3',deckId:'white-sword',policy:'white-sword',snapshot:'previous'}),
 Object.freeze({name:'hard-white',deckId:'white-sword',policy:'hard-search-2'}),
 Object.freeze({name:'hard-blue',deckId:'reject-blue',policy:'hard-search-2'}),
 Object.freeze({name:'hard-renruki',deckId:'renruki',policy:'hard-search-2'})
]);
export const V3_CONFIG=Object.freeze({
 epochs:2,explore:0.10,lr:0.003,valueLr:0.004,trustDelta:0.45,
 blendScale:6,hardCap:7
});

const TRAIN_START=21050,TRAIN_END=21058;
const VAL_START=45000,VAL_END=45013;
const HOLDOUT_START=94000,HOLDOUT_END=94017;
export function v3SeedRole(seed){
 if(!Number.isSafeInteger(seed))throw Error('V3 seed must be an integer');
 if(seed>=TRAIN_START&&seed<TRAIN_END)return 'train';
 if(seed>=VAL_START&&seed<VAL_END)return 'validation';
 if(seed>=HOLDOUT_START&&seed<HOLDOUT_END)return 'final';
 return 'forbidden';
}
export function assertV3Seed(seed,role){
 if(!['train','validation','final'].includes(role))throw Error('Unknown V3 seed role');
 const actual=v3SeedRole(seed);
 if(actual!==role)throw Error('V3 '+role+' cannot use seed '+seed+' ('+actual+')');
 if(role==='train'){
  assertTrainableSeed(seed);
  if(splitForSeed(seed)!=='train')throw Error('V3 train seed is not in legacy train split');
 }
}
export function assertV3Disjoint(){
 const sets=[V3_TRAIN_SEEDS,V3_VALIDATION_SEEDS,V3_SECONDARY_VALIDATION_SEEDS,V3_GUARD_VALIDATION_SEEDS,V3_FINAL_SEEDS];
 const all=new Set();
 for(let i=0;i<sets.length;i++)for(const seed of sets[i]){
  assertV3Seed(seed,['train','validation','validation','validation','final'][i]);
  if(all.has(seed))throw Error('V3 seeds overlap');
  all.add(seed);
 }
 return true;
}
export function trainingFixtures(epoch,{smoke=false}={}){
 if(!Number.isInteger(epoch)||epoch<0)throw Error('Invalid epoch');
 const rows=[],seeds=smoke?V3_TRAIN_SEEDS.slice(0,1):V3_TRAIN_SEEDS;
 let index=0;
 for(const seed of seeds)for(const cell of CELLS){
  const opponent=V3_OPPONENT_POOL[(index+epoch)%V3_OPPONENT_POOL.length];
  rows.push({seed,...cell,opponent,opponentDeck:opponent.deckId,label:'v3-train',index});
  index++;
 }
 return rows;
}
export function evaluationFixtures({smoke=false,final=false}={}){
 const seeds=final?V3_FINAL_SEEDS:(smoke?V3_VALIDATION_SEEDS.slice(0,1):V3_VALIDATION_SEEDS);
 const role=final?'final':'validation';
 const rows=[];
 for(const seed of seeds){
  assertV3Seed(seed,role);
  for(const cell of CELLS){
   for(const opponentDeck of V3_DECKS)
    rows.push({seed,...cell,opponentDeck,label:'v3-'+role});
  }
 }
 return rows;
}
assertV3Disjoint();
