import test from 'node:test';
import assert from 'node:assert/strict';
import {maskedSoftmax,advantages,clippedObjective} from '../dist/ai-v4-ppo.mjs';
test('mask excludes illegal moves',()=>{
 const p=maskedSoftmax([10,100,10],[1,0,1]);
 assert.equal(p[1],0);assert.ok(Math.abs(p[0]+p[2]-1)<1e-9);
});
test('advantages reset on terminal transitions',()=>{
 const a=advantages([{reward:1,value:0,done:true},{reward:2,value:0,done:true}]);
 assert.deepEqual(a.map(x=>x.advantage),[1,2]);
});
test('PPO clipped objective bounds positive advantage',()=>{
 assert.equal(clippedObjective(0.2,0.8,1),1.2);
});
