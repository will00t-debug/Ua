import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrainingPairs} from '../scripts/ai-v3-rewards.mjs';
const teacher=[1,0],counter=[0,1];
test('non-explored teacher labels are stable regardless of winner',()=>{
 for(const winner of [0,1])
  assert.deepEqual(buildTrainingPairs([{actor:0,teacher,counter,explored:false}],winner),
   [{yes:teacher,no:counter,weight:1}]);
});
test('explored winner never creates opposing labels',()=>{
 assert.deepEqual(buildTrainingPairs([{actor:0,teacher,counter,explored:true}],0),[]);
});
test('explored loser produces only one teacher preference',()=>{
 assert.deepEqual(buildTrainingPairs([{actor:0,teacher,counter,explored:true}],1),
  [{yes:teacher,no:counter,weight:1}]);
});
