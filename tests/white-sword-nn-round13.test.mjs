import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createNet} from '../training/white-sword-nn/net.mjs';
import {ROUND11_CRITERIA,judgeRound11,perSeedRate} from '../training/white-sword-nn/round11.mjs';
import {checkedRegression} from '../training/white-sword-nn/round10.mjs';
import {
 KIND_ORDER,ROUND13_CRITERIA,ROUND13_FROZEN_FILES,ROUND13_HOLDOUT_SAMPLES,ROUND13_HOLDOUT_SEEDS,
 ROUND13_RECORDED_EXACT,ROUND13_RECORDED_STOP,ROUND13_SHUFFLE_FILE,ROUND13_SHUFFLE_HASH,
 actionText,annotateSeeds,assertRole,assertWritable,exactRate,explainRound13,judgeRound13,pairedError,
 parameterHash,regressionsOf,seedDirections,seedPaired,stopCase,transitionTable,weightedGap
} from '../training/white-sword-nn/round13.mjs';

function action(type,uid,extra){
 return {type,uid:uid??null,...extra};
}
function sample(overrides){
 const actions=[action('attack','1-1',{targetUid:'0-9'}),action('next'),action('attack','1-2',{targetUid:'0-9'})];
 return {
  id:'replay-existing:188624:0:0:10',seed:188624,role:'holdout',kind:'attack',chosen:0,
  actions,rows:[[1],[2],[3]],identities:[],front:[],step:10,...overrides
 };
}
test('the round-11 criteria and the recorded holdout counts stay fixed',()=>{
 assert.deepEqual([...ROUND13_CRITERIA],[...ROUND11_CRITERIA]);
 assert.equal(ROUND13_HOLDOUT_SAMPLES,3395);
 assert.equal(ROUND13_HOLDOUT_SEEDS,28);
 assert.equal(ROUND13_RECORDED_STOP,11);
 assert.equal(ROUND13_RECORDED_EXACT.A,0.6150220913107511);
 assert.equal(ROUND13_RECORDED_EXACT.shuffle,0.658321060382916);
 assert.ok(ROUND13_FROZEN_FILES.includes(ROUND13_SHUFFLE_FILE));
 assert.throws(()=>assertWritable(ROUND13_SHUFFLE_FILE));
 const file=createHashFile();
 assert.equal(file,ROUND13_SHUFFLE_HASH);
});
function createHashFile(){
 return createHash('sha256').update(readFileSync(ROUND13_SHUFFLE_FILE)).digest('hex');
}
test('parameter hashes follow the values and ignore the version string',()=>{
 const net=createNet(1,{sizes:[2,1]});
 net.theta[0]=0.25;
 const before=parameterHash(net);
 net.version='renamed';
 net.updates=9;
 assert.equal(parameterHash(net),before);
 net.theta[0]=0.5;
 assert.notEqual(parameterHash(net),before);
});
test('transitions keep exact gains apart from other changes and proven matches',()=>{
 const rows=[
  sample({id:'gain',chosen:0}),
  sample({id:'loss',chosen:0}),
  sample({id:'other',chosen:0}),
  sample({id:'same',chosen:0}),
  sample({
   id:'proven',kind:'block',chosen:1,role:'holdout',
   actions:[action('chooseBlock',null),action('chooseBlock','1-1'),action('chooseBlock','1-2')],
   front:[
    {uid:'1-1',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:0},
    {uid:'1-2',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:0}
   ]
  })
 ];
 const before=new Map([['gain',1],['loss',0],['other',2],['same',0],['proven',2]]);
 const after=new Map([['gain',0],['loss',1],['other',1],['same',0],['proven',1]]);
 const table=transitionTable(rows,before,after);
 const attack=table.find(row=>row.kind==='attack');
 assert.equal(attack.gained,1);
 assert.equal(attack.lost,1);
 assert.equal(attack.otherChange,1);
 assert.equal(attack.same,1);
 assert.equal(attack.exactBefore+attack.exactAfter,4);
 assert.equal(attack.gained+attack.lost+attack.otherChange+attack.same,4);
 const block=table.find(row=>row.kind==='block');
 assert.equal(block.provenBefore,1);
 assert.equal(block.exactBefore,0);
 assert.equal(block.exactAfter,1);
 assert.equal(block.gained,1);
 assert.equal(regressionsOf(table).some(row=>row.kind==='attack'),false);
 assert.deepEqual(KIND_ORDER,['play','attack','block','trigger','effect','other']);
});
test('a weighted rate gap is not the seed-equal paired result',()=>{
 const rows=[];
 rows.push(sample({id:'s1',seed:1,chosen:1}));
 for(let index=0;index<99;index++)rows.push(sample({id:'s2-'+index,seed:2,chosen:0}));
 const before=new Map(rows.map(row=>[row.id,0]));
 const after=new Map(rows.map(row=>[row.id,row.seed===1?1:0]));
 const paired=seedPaired(perSeedRate(rows,before),perSeedRate(rows,after));
 assert.equal(paired.mean,0.5);
 const weighted=weightedGap(exactRate(rows,before),exactRate(rows,after));
 assert.ok(Math.abs(weighted-0.01)<1e-12);
 assert.notEqual(paired.mean,weighted);
 const error=pairedError(paired);
 assert.ok(Math.abs((paired.high-paired.low)/2-error.t*error.se)<1e-9);
 const directions=seedDirections(annotateSeeds(perSeedRate(rows,before),perSeedRate(rows,after),paired));
 assert.deepEqual(directions,{up:1,flat:1,down:0,seeds:2});
 const text=explainRound13({
  paired,pairedError:error,weighted:{before:exactRate(rows,before),after:exactRate(rows,after)},
  holdoutSeeds:2,blockSeeds:2,blockImprovedSeeds:[1,2],blockGainDecisions:1,step118Gains:0,
  newObviousErrors:[],protectionComplete:true,regressionsDisclosed:true,
  block:{teacherPass:2,beforePass:2,afterPass:2,teacherBlock:2,beforeExact:0,afterExact:2,beforeAny:1,afterAny:2},
  regressions:[]
 });
 assert.match(text.q1,/不是種子等權/);
 assert.doesNotMatch(text.q1,/0\.49/);
 assert.equal(judgeRound13({
  paired:{seeds:2,mean:0.5,low:0,high:1},holdoutSeeds:2,blockSeeds:2,blockImprovedSeeds:[1,2],
  blockGainDecisions:1,step118Gains:0,newObviousErrors:[],protectionComplete:true,regressionsDisclosed:true
 }).passed,false);
 assert.equal(judgeRound13({
  paired:{seeds:28,mean:0.04,low:0.01,high:0.07},holdoutSeeds:28,blockSeeds:4,blockImprovedSeeds:[1,2],
  blockGainDecisions:3,step118Gains:0,newObviousErrors:[],protectionComplete:true,regressionsDisclosed:true
 }).passed,judgeRound11({
  paired:{seeds:28,mean:0.04,low:0.01,high:0.07},holdoutSeeds:28,blockSeeds:4,blockImprovedSeeds:[1,2],
  blockGainDecisions:3,step118Gains:0,newObviousErrors:[],protectionComplete:true,regressionsDisclosed:true
 }).passed);
});
test('stopping an attack is not an obvious error by itself',()=>{
 const row=sample();
 const scores={
  a:[0,1,0],b:[2,0,1],endpoint:[0,3,1]
 };
 const record=stopCase(row,{a:1,b:0,endpoint:1},scores);
 assert.equal(record.bucket,'stop');
 assert.equal(record.error,null);
 assert.equal(record.choices.endpoint,'停止攻擊');
 assert.equal(actionText({type:'play',uid:'0-31',line:'front',index:2,cardId:'BLC-1-072'}),'play 0-31 列 front 序 2 BLC-1-072');
 assert.equal(record.choices.b,'attack 1-1 目標 0-9');
 assert.ok(record.gaps.endpoint<0);
 const checked={...row,teacherIndex:0,aIndex:1,bIndex:0,endpointIndex:1,blockers:[],protect:null,publicLethalKept:false};
 assert.equal(checkedRegression(checked,1),null);
 assert.throws(()=>assertRole([row],'train'));
});
test('more blocking without the teacher blocker is not called learning',()=>{
 const text=explainRound13({
  paired:{seeds:8,mean:0.04,low:0.01,high:0.07,rows:[]},
  weighted:{before:0.6,after:0.7},
  holdoutSeeds:8,blockSeeds:4,blockImprovedSeeds:[11,12],
  blockGainDecisions:1,step118Gains:0,newObviousErrors:[],protectionComplete:true,regressionsDisclosed:true,
  block:{teacherPass:4,beforePass:4,afterPass:1,teacherBlock:6,beforeExact:2,afterExact:2,beforeAny:1,afterAny:6},
  regressions:[{kind:'play',used:10,before:0.8,after:0.5}]
 });
 assert.match(text.q2,/更常擋/);
 assert.match(text.q2,/不是把情境和阻擋者分開/);
 assert.doesNotMatch(text.q2,/學會阻擋/);
});
