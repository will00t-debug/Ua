// Pre-registered splits. Final-test seeds are not a training source.
import {CELLS,splitForSeed} from './constants.mjs';

export const SMOKE={seeds:[11000,11001,11002,11003,11004],opponent:{deckId:'white-sword',policy:'universal-hard'}};
export const FULL_OPPONENTS=Object.freeze([
 Object.freeze({deckId:'white-sword',policy:'universal-hard'}),
 Object.freeze({deckId:'white-sword',policy:'hard-search-2'}),
 Object.freeze({deckId:'reject-blue',policy:'hard-search-2'}),
 Object.freeze({deckId:'renruki',policy:'hybrid-main'}),
 Object.freeze({deckId:'sword-art-online',policy:'universal-hard'})
]);
export const FULL_SEEDS=Object.freeze([12000,12001,12002,12003,12004]);
export const TEACHER_SEEDS=Object.freeze([19000,19001,19002,19003,19004,19005,19006,19007]);
export const SELF_PLAY_SEEDS=Object.freeze(Array.from({length:250},(_,index)=>20000+index));
export const SELECTION_SEEDS=Object.freeze([30000,30001]);
export const SELECTION_DECKS=Object.freeze(['white-sword','reject-blue']);
export const HISTORY_SEEDS=Object.freeze([30100,30101,30102,30103,30104,30105]);
export const EPOCH_SEEDS=Object.freeze([30200,30201]);
export const FINAL_SEEDS=Object.freeze(Array.from({length:17},(_,index)=>50000+index));
// v2 confirmation seeds. They are not a training source and they do not
// overlap the v1 final range.
export const VAL_V2_SEEDS=Object.freeze([41000,41001,41002,41003]);
export const FINAL_V2_SEEDS=Object.freeze(Array.from({length:17},(_,index)=>80000+index));
export const FINAL_DECKS=Object.freeze(['white-sword','reject-blue','renruki']);
export const TRAIN={
 teacherEpochs:8,
 teacherLr:0.2,
 selfEpochs:4,
 selfLr:0.08,
 valueLr:0.08,
 explore:0.08
};
export const LEARNED_MODES=Object.freeze([
 Object.freeze({mode:'policy',scale:0}),
 Object.freeze({mode:'blend',scale:6})
]);

function specsFrom({seeds,cells=CELLS,opponents,label}){
 const out=[];
 for(const seed of seeds){
  if(splitForSeed(seed)!==label)throw Error('Seed '+seed+' is not in '+label);
  for(const cell of cells)for(const opponent of opponents){
   out.push({seed,cell,opponent,opponentDeck:opponent.deckId,label});
  }
 }
 return out;
}
export function smokeSpecs(){
 return specsFrom({seeds:SMOKE.seeds,opponents:[SMOKE.opponent],label:'smoke'});
}
export function fullSpecs(){
 return specsFrom({seeds:FULL_SEEDS,opponents:FULL_OPPONENTS,label:'full'});
}
export function teacherSpecs(){
 return specsFrom({
  seeds:TEACHER_SEEDS,
  opponents:[{deckId:'white-sword',policy:'hard-search-2'}],
  label:'train'
 });
}
export function selfPlayOpponent(index){
 const kind=index%10;
 if(kind<3)return {deckId:'white-sword',policy:'white-sword',historical:false};
 if(kind<5)return {deckId:'white-sword',policy:'white-sword',historical:true};
 if(kind<7)return {deckId:'reject-blue',policy:'universal-hard'};
 if(kind<8)return {deckId:'renruki',policy:'universal-hard'};
 if(kind<9)return {deckId:'sword-art-online',policy:'universal-hard'};
 return {deckId:'white-sword',policy:'hard-search-2'};
}
export function selfPlaySpecs(){
 const rows=[];
 let index=0;
 for(const seed of SELF_PLAY_SEEDS)for(const cell of CELLS){
  rows.push({seed,cell,opponent:selfPlayOpponent(index),opponentDeck:selfPlayOpponent(index).deckId,label:'train',index});
  index++;
 }
 return rows;
}
export function selectionSpecs(){
 return specsFrom({
  seeds:SELECTION_SEEDS,
  opponents:SELECTION_DECKS.map(deckId=>({deckId,policy:'hard-search-2'})),
  label:'validation'
 });
}
export function historySpecs(){
 return specsFrom({
  seeds:HISTORY_SEEDS,
  opponents:[{deckId:'white-sword',policy:'white-sword',historical:true}],
  label:'validation'
 });
}
export function epochSpecs(){
 return specsFrom({
  seeds:EPOCH_SEEDS,
  opponents:[{deckId:'white-sword',policy:'hard-search-2'}],
  label:'validation'
 });
}
export function finalSpecs(){
 return specsFrom({
  seeds:FINAL_SEEDS,
  opponents:FINAL_DECKS.map(deckId=>({deckId,policy:'hard-search-2'})),
  label:'final'
 });
}
export function validationV2Specs(){
 return specsFrom({
  seeds:VAL_V2_SEEDS,
  opponents:FINAL_DECKS.map(deckId=>({deckId,policy:'hard-search-2'})),
  label:'validation'
 });
}
export function finalV2Specs(){
 return specsFrom({
  seeds:FINAL_V2_SEEDS,
  opponents:FINAL_DECKS.map(deckId=>({deckId,policy:'hard-search-2'})),
  label:'final-v2'
 });
}
