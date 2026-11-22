import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectTempoMargins} from '../dist/universal-v2/white-sword-ai/v33-margin-audit.mjs';
const item=(type,score,bonus,hard=5)=>({
 action:{type},score:score+bonus,tempo:{bonus,reasons:bonus?[{reason:'test',value:bonus}]:[]},
 measured:true,hardScore:hard
});
test('audit computes exact baseline margin and hypothetical thresholds without altering rows',()=>{
 const pool=[item('next',100,0),item('play',99,0.5)];
 const before=structuredClone(pool);
 const audit=inspectTempoMargins(pool);
 assert.equal(audit.eligible,2);
 assert.equal(audit.baseTop.action.type,'next');
 assert.equal(audit.currentTop.action.type,'next');
 assert.ok(Math.abs(audit.topScoreGap-1)<1e-8);
 assert.ok(Math.abs(audit.mostReachable.requiredMultiplier-2)<1e-6);
 assert.equal(audit.probe['1'].switched,false);
 assert.equal(audit.probe['4'].switched,true);
 assert.deepEqual(pool,before,'forensic instrumentation must not mutate gameplay scores');
});
test('ineligible and zero differential scores are reported without fictitious thresholds',()=>{
 assert.equal(inspectTempoMargins([]),null);
 const row=[item('next',2,0),item('raid',1,0)];
 const audit=inspectTempoMargins(row);
 assert.equal(audit.mostReachable,null);
 assert.equal(audit.hasBonusDifference,false);
 assert.equal(audit.probe['8'].switched,false);
});
test('single-choice and negative bonus require no fabricated candidate',()=>{
 const single=inspectTempoMargins([item('next',100,-0.3)]);
 assert.equal(single.eligible,1);
 assert.equal(single.mostReachable,null);
 assert.equal(single.topScoreGap,null);
});

test('decomposition names the model feature responsible for overturning a better Hard option',()=>{
 const rows=[
  {action:{type:'play',uid:'0-2',line:'front'},features:[1],
   hardScore:10,score:16.11,tempo:{bonus:.11,reasons:[]}},
  {action:{type:'play',uid:'0-2',line:'energy'},features:[0],
   hardScore:12,score:12.59,tempo:{bonus:.59,reasons:[]}}
 ];
 const result=inspectTempoMargins(rows,{weights:[1],featureNames:['line_front'],scale:6});
 assert.equal(result.hardDisagrees,true);
 assert.equal(result.mostReachable.attribution.hardGap,-2);
 assert.equal(result.mostReachable.attribution.policyGap,6);
 assert.equal(result.mostReachable.attribution.totalGap,4);
 assert.deepEqual(result.mostReachable.attribution.featureDrivers,
  [{name:'line_front',delta:6}]);
 assert.equal(result.mostReachable.requiredMultiplier,(4+1e-9)/.48);
});
