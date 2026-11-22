import test from 'node:test';
import assert from 'node:assert/strict';
import {loadModel,cloneModel,updateModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {playGame,trainingLabel} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {collectSamples} from '../dist/universal-v2/white-sword-ai/train.mjs';
import {POLICY_DIM,VALUE_DIM} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {
 assertV3Disjoint,assertV3Seed,v3SeedRole,trainingFixtures,evaluationFixtures
} from '../dist/universal-v2/white-sword-ai/v3-protocol.mjs';
import {withinHardCap} from '../dist/universal-v2/white-sword-ai/choose.mjs';

test('v3 train/validation/final seeds are disjoint and old final seeds are banned',()=>{
 assert.equal(assertV3Disjoint(),true);
 assert.equal(v3SeedRole(21050),'train');
 assert.equal(v3SeedRole(45000),'validation');
 assert.equal(v3SeedRole(94000),'final');
 assert.equal(v3SeedRole(50000),'forbidden');
 assert.equal(v3SeedRole(80000),'forbidden');
 assert.equal(v3SeedRole(92002),'forbidden');
 assert.throws(()=>assertV3Seed(94000,'train'));
 assert.throws(()=>assertV3Seed(45001,'train'));
 assert.throws(()=>assertV3Seed(92002,'validation'));
 assert.equal(trainingFixtures(0).length,32);
 assert.equal(evaluationFixtures().length,60);
 assert.equal(evaluationFixtures({final:true}).length,204);
});

test('Hard cap rejects worse scored actions even during safe exploration',()=>{
 const rows=[
  {action:{type:'play',uid:'a'},hardScore:100,score:100},
  {action:{type:'raid',uid:'b'},hardScore:96,score:130},
  {action:{type:'next'},hardScore:89,score:300}
 ];
 const pool=withinHardCap(rows,rows[0].action,7);
 assert.deepEqual(pool.map(x=>x.action.uid||x.action.type),['a','b']);
});

test('completed capped-blend self-play produces real outcome gradients',()=>{
 const incumbent=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const candidate=cloneModel(incumbent);
 candidate.version='white-sword-v3-trial';
 const spec={
  seed:21050,first:0,specialistSeat:0,opponentDeck:'white-sword',label:'v3-train',
  keepSamples:true,recordBlendOutcome:true,recordSeat:0,
  seats:[
   {deckId:'white-sword',policy:'white-sword',model:candidate,mode:'blend',hardCap:7,scale:6,explore:0.10},
   {deckId:'white-sword',policy:'white-sword',model:incumbent,mode:'blend',hardCap:7,scale:6,explore:0}
  ]
 };
 const match=playGame(spec);
 assert.equal(match.status,'finished',JSON.stringify({error:match.error,anomalies:match.anomalies}));
 assert.deepEqual(trainingLabel(match),{usable:true,reason:null});
 const result=collectSamples([match]);
 const samples=result.samples.filter(s=>s.kind==='outcome');
 assert.ok(samples.length>0,'v3 must actually learn from capped-blend match outcomes');
 assert.ok(samples.every(s=>['win','loss'].includes(s.reward)));
 assert.ok(samples.every(s=>s.chosen.length===POLICY_DIM&&s.value.length===VALUE_DIM&&s.negatives.length>0));
 const first=cloneModel(candidate);
 const updated=updateModel(first,samples,{lr:0.003,valueLr:0.004,epochs:1,decayRate:0});
 assert.equal(updated.samples,samples.length);
 assert.notDeepEqual(first.policy,candidate.policy,'completed game must change policy weights');
});

test('invalid and uncompleted games never become v3 training losses',()=>{
 const rejected=collectSamples([{seed:21051,status:'error',winner:null,
  anomalies:{illegal:0,timeout:0,fallback:0,deadLoop:1,engineError:0,leak:0,opponentFallback:0},
  samples:[{kind:'outcome',reward:'loss',chosen:[],negatives:[],value:[]}]}]);
 assert.equal(rejected.samples.length,0);
 assert.equal(rejected.rejected.length,1);
});
