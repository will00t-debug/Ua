import assert from 'node:assert/strict';
import test from 'node:test';
import {POLICY_INDEX} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {readJson} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {collectRecords} from '../training/white-sword-ai/v5a/lib/analyze.mjs';
import {shrinkage,trainingUse} from '../training/white-sword-ai/v5a/lib/evidence.mjs';
import {isPlay,linePlayOccupancy,oneStepRoom,stepsToClear,stepsUntil,zeroHash} from '../training/white-sword-ai/v5a/lib/pressure.mjs';
import {CONSTRAINTS,OFFICIAL_V2,assertOfficialLimits,uniqueNamedFeatures} from '../training/white-sword-ai/v5a/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v5a/lib/report.mjs';
import {chooseKey} from '../training/white-sword-ai/v4a2/lib/sensitivity.mjs';

const WIDTH=115;

function band(){
 const front=Array(WIDTH).fill(0);
 const energy=Array(WIDTH).fill(0);
 front[POLICY_INDEX.h2]=1;
 energy[POLICY_INDEX.h7]=1;
 return [
  {key:'front',hard:0,features:front},
  {key:'energy',hard:0,features:energy}
 ];
}

test('eight buckets cannot separate every card line, and a zero start preserves the choice',()=>{
 assertOfficialLimits();
 const eight=linePlayOccupancy(8);
 const wide=linePlayOccupancy(32);
 assert.equal(eight.plays,26);
 assert.ok(eight.max>=2);
 assert.ok(wide.max<=eight.max);
 const weights=Array(WIDTH).fill(0);
 weights[POLICY_INDEX.h2]=2;
 weights[POLICY_INDEX.h7]=-1;
 const rows=band();
 assert.equal(chooseKey(rows,weights), 'front');
 assert.notEqual(chooseKey(rows,zeroHash(weights)), 'front');
 assert.equal(chooseKey(rows,weights), 'front');
});

test('evidence quality decides the role, and a screen is not a label',()=>{
 assert.equal(trainingUse({kind:'screen',confirmed:false,mean:0.25,decisive:4}).weight,0);
 assert.equal(trainingUse({kind:'short',confirmed:false,mean:-0.125,decisive:2}).weight,0);
 assert.equal(trainingUse({kind:'confirm',confirmed:true,mean:-0.2,decisive:27}).role,'constraint');
 assert.equal(trainingUse({kind:'confirm',confirmed:true,mean:-0.2,decisive:27}).weight,null);
 assert.equal(trainingUse({kind:'validation',confirmed:true,harm:true,mean:0.27,decisive:22}).tier,'confirmed-harm');
 const soft=trainingUse({kind:'confirm',confirmed:false,mean:-0.2,decisive:27});
 assert.equal(soft.role,'soft');
 assert.ok(Math.abs(soft.weight-shrinkage(-0.2,27))<1e-12);
 assert.ok(Math.abs(soft.weight)<0.2);
});

test('one new action bit stays inside the clip only after several capped steps',()=>{
 assert.equal(oneStepRoom(),9);
 assert.equal(stepsToClear(9),1);
 assert.equal(stepsToClear(19.56),3);
 assert.equal(stepsToClear(0),0);
 const weights=Array(WIDTH).fill(0);
 weights[POLICY_INDEX.h2]=3;
 const rows=band();
 const predicate=row=>row.key==='energy';
 assert.equal(stepsUntil(rows,weights,predicate,'energy',4),2);
 assert.equal(isPlay({key:'{"type":"play","line":"energy"}',features:[]},'BLC-4-070','energy'),false);
});

test('the registered rule names one action and leaves the harmful change alone',()=>{
 const features=uniqueNamedFeatures(CONSTRAINTS);
 assert.equal(features.length,1);
 assert.equal(features[0].card,'BLC-4-070');
 assert.equal(features[0].line,'energy');
 const harm=CONSTRAINTS.find(item=>item.id==='0d035ea8a0b2be16');
 assert.equal(harm.role,'preserve');
 const report=renderReport({
  official:OFFICIAL_V2,
  candidateNames:['line_front','hand_short'],
  candidateMovesHash:false,
  unresolved:0,
  checked:1,
  positions:1,
  pressure:{linePairs:1,lineHashShare:0.8,lineHashMean:20,lineOtherMean:4,lineDominantShare:1,comparable:1,hashLargerShare:0.2,medianHashShare:0.2,hashFlips:1,flipShare:0.1},
  occupancy:{eight:{plays:26,max:5,shared:6},thirtyTwo:{max:2,shared:5}},
  collisions:{eight:{max:9},thirtyTwo:{max:2,signatures:10,shared:4}},
  softPairs:[66,66,null],
  lineBins:{
   front070:{text:'play|BLC-4-070||front',bin:2},
   energy070:{text:'play|BLC-4-070||energy',bin:7},
   front085:{text:'play|BLC-1-085||front',bin:7},
   energy009:{text:'play|BLC-3-009||energy',bin:0},
   samePair:false
  },
  evidence:{tiers:{'confirmed-preference':{count:4},'confirmed-harm':{count:1},'paired-inconclusive':{count:3},'short-check':{count:6},'screen-only':{count:20}},records:34},
  uses:[{id:'0d035ea8a0b2be16',harm:true}],
  feature:'play|BLC-4-070||energy',
  leads:[{id:'d12a2d6f5ced1d88',lead:17,steps:2},{id:'b122fb89d72eec7e',lead:19,steps:3},{id:'01c85e5ddb31e7fa',lead:10,steps:2}],
  accumulation:{
   need:3,maxSteps:4,points:27,fits:true,exposed:12,flips:4,outside:1,
   preserve:[{id:'0d035ea8a0b2be16',text:'留在 v2',flipped:false},{id:'1fbdc61d55fa7f09',text:'突襲留在 v2',flipped:false},{id:'ee6cdd154ceeb4ce',text:'結束行動留在 v2',flipped:false}],
   preference:[{cleared:true},{cleared:true},{cleared:true}]
  }
 });
 assert.match(report,/權重從 0 開始/);
 assert.match(report,/沒有寫入權重/);
 assert.match(report,/不採用/);
 assert.match(report,new RegExp(OFFICIAL_V2));
 assert.match(report,/小型非線性模型/);
});

test('saved comparisons keep the confirmed harm apart from the two 060 results',()=>{
 const rows=collectRecords();
 const harm=rows.find(row=>row.id==='0d035ea8a0b2be16');
 assert.equal(trainingUse(harm).tier,'confirmed-harm');
 for(const id of ['a8ea32166942bc90','5f868c674f2e1fee']){
  const row=rows.find(item=>item.id===id);
  assert.equal(row.pairs,66);
  assert.equal(trainingUse(row).tier,'paired-inconclusive');
  assert.equal(row.confirmed,false);
 }
 const analysis=readJson('training/white-sword-ai/v5a/analysis.json');
 assert.equal(analysis.fitted,false);
 assert.equal(analysis.adopted,false);
 assert.equal(analysis.official,OFFICIAL_V2);
 assert.equal(analysis.accumulation.need,3);
 assert.equal(analysis.accumulation.outside,37);
 assert.equal(analysis.pressure.lineDominantShare,1);
 assert.equal(analysis.candidateMovesHash,false);
 assert.ok(analysis.softPairs.every(pairs=>pairs===66));
 const report=renderReport(analysis);
 assert.match(report,/37 筆/);
 assert.match(report,/沒有寫入權重/);
});
