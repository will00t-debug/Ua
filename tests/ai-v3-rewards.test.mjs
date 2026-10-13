import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrainingPairs} from '../scripts/ai-v3-rewards.mjs';

test('losing a teacher-guided match never makes teacher a negative example',()=>{
 const teacher=[1,0],alternative=[0,1];
 for(const winner of [0,1]){
  const rows=buildTrainingPairs([{actor:1-winner,teacher,chosen:teacher,
   counter:alternative,explored:false}],winner);
  assert.deepEqual(rows,[{yes:teacher,no:alternative,weight:1}]);
 }
});
test('only an actually explored alternative receives weak reward feedback',()=>{
 const teacher=[1,0],alternative=[0,1];
 const exploratory={actor:0,teacher,chosen:alternative,counter:alternative,explored:true};
 const win=buildTrainingPairs([exploratory],0);
 const loss=buildTrainingPairs([exploratory],1);
 assert.equal(win.length,2);
 assert.deepEqual(win[0],{yes:teacher,no:alternative,weight:1});
 assert.deepEqual(win[1],{yes:alternative,no:teacher,weight:0.12});
 assert.deepEqual(loss[1],{yes:teacher,no:alternative,weight:0.24});
});
