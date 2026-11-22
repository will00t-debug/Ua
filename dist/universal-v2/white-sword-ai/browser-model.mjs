// Browser-safe subset of the model scoring runtime. No node:fs/node:path.
import {FORMAT,MODEL_VERSION} from './constants.mjs';
import {POLICY_DIM,VALUE_DIM} from './features.mjs';
export function createModel(version=MODEL_VERSION){
 return {format:FORMAT,version,policy:Array(POLICY_DIM).fill(0),value:Array(VALUE_DIM).fill(0)};
}
export function dot(weights,features){
 let score=0;
 for(let i=0;i<weights.length;i++)score+=weights[i]*(features[i]||0);
 return score;
}
