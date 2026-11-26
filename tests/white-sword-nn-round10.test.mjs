import assert from 'node:assert/strict';
import test from 'node:test';
import {IMITATE_EPOCHS,IMITATE_LR,LABEL_SMOOTH,REPLAY_FRACTION,ROUND8_CANDIDATE_HASH} from '../training/white-sword-nn/constants.mjs';
import {createNet} from '../training/white-sword-nn/net.mjs';
import {forwardTrain} from '../training/white-sword-nn/net.mjs';
import {
 DEV_CASE,DEV_EXPECT,ROUND10_CANDIDATE_FILE,ROUND10_CRITERIA,ROUND10_DEMO_DROP_LIMIT,
 ROUND10_DEMO_SEEDS,ROUND10_EPOCHS,ROUND10_FROZEN_FILES,ROUND10_LR,ROUND10_REPLAY,
 assertWritable,assignRole,auditDevCase,cardFingerprint,checkedRegression,decisionImproved,
 devCaseImproved,equivalentBlockIndices,exactDrop,explainRound10,fixedUpdateCount,
 isDevCase,judgeRound10,parentKey,protectClass,publicLethalKept,round10Rng,
 samePublicCard,scheduleUpdates,scoresIdentical,selectsTeacher,trainingLabel
} from '../training/white-sword-nn/round10.mjs';

function blocker(uid,cardId,bp,extra={}){
 return {
  uid,cardId,bp,ready:true,raidDepth:0,restrictions:[],raidLayers:[],underLayers:[],...extra
 };
}
function devRow(extra={}){
 const blockers=[
  blocker('1-12','BLC-2-067',4000),
  blocker('1-40','BLC-3-008',3000),
  blocker('1-15','BLC-2-067',4000)
 ];
 return {
  source:DEV_CASE.source,synthetic:false,labeledByUniversalRule:false,hiddenLifeUsed:false,
  lifeCards:null,seed:193502,learnerSeat:1,first:0,step:118,
  pending:'block',phase:'attack',turn:11,active:0,life:1,oppLife:7,hand:2,oppHand:4,
  damage:1,impact:0,attackerId:'BLC-2-069',attackerBp:2500,attackerUid:'0-17',
  actions:[
   {type:'chooseBlock',uid:null},
   {type:'chooseBlock',uid:'1-12'},
   {type:'chooseBlock',uid:'1-40'},
   {type:'chooseBlock',uid:'1-15'}
  ],
  aIndex:0,bIndex:0,teacherIndex:1,blockers,...extra
 };
}
function passScores(teacher=3,pass=0){
 const scores=new Float64Array([pass,teacher,teacher-1,teacher]);
 return scores;
}

test('the published case is the only training label',()=>{
 const row=devRow();
 const audit=auditDevCase(row);
 assert.equal(audit.ok,true);
 row.auditOk=true;
 row.equivalentIndices=audit.equivalentIndices;
 assert.equal(trainingLabel(row),1);
 assert.deepEqual(audit.equivalentIndices,[3]);
 const lethal=devRow({seed:193500,step:200,life:1,damage:1});
 assert.equal(trainingLabel({...lethal,auditOk:true,labeledByUniversalRule:true}),null);
 const spare=devRow({seed:193500,step:50,life:4,damage:1});
 spare.auditOk=true;
 assert.equal(trainingLabel(spare),null);
 assert.notEqual(trainingLabel(spare),0);
 assert.equal(trainingLabel({...row,labeledByUniversalRule:true}),null);
});

test('same card id is not public equivalence',()=>{
 const left=blocker('1-12','BLC-2-067',4000);
 const right=blocker('1-15','BLC-2-067',4000,{raidDepth:1});
 assert.equal(samePublicCard(left,blocker('1-15','BLC-2-067',4000)),true);
 assert.equal(samePublicCard(left,right),false);
 assert.equal(cardFingerprint(left).uid,undefined);
 const row=devRow({blockers:[left,blocker('1-40','BLC-3-008',3000),right]});
 assert.deepEqual(equivalentBlockIndices(row.actions,row.blockers,1),[]);
});

test('life, BP, and uid variants stay with the parent',()=>{
 const train=devRow();
 train.parent=parentKey(train);
 const sibling=devRow({step:130,life:2,attackerBp:2600});
 sibling.parent=parentKey(sibling);
 sibling.blockers=sibling.blockers.map(card=>({...card,uid:card.uid==='1-12'?'1-99':card.uid}));
 const holdout=devRow({seed:193500,step:145,attackerUid:'0-2',life:4});
 holdout.parent=parentKey(holdout);
 const demo=devRow({source:'imitate-prefix',seed:188600,step:10});
 demo.parent=parentKey(demo);
 assert.equal(assignRole(train,train.parent),'train');
 assert.equal(assignRole(sibling,train.parent),'sibling');
 assert.equal(assignRole(holdout,train.parent),'holdout');
 assert.equal(assignRole(demo,train.parent),'demo');
 assert.equal(isDevCase(sibling),false);
});

test('a tied or colliding copy does not count as the teacher',()=>{
 const row=devRow({equivalentIndices:[3],auditOk:true});
 assert.equal(selectsTeacher(passScores(2,0),row.actions,1,[3]),true);
 assert.equal(selectsTeacher(new Float64Array([0,1,5,1]),row.actions,1,[3]),false);
 assert.equal(selectsTeacher(new Float64Array([0,1,0,1]),row.actions,1,[]),false);
 assert.equal(decisionImproved(row,0,passScores(2,0)),true);
 assert.equal(decisionImproved(row,1,passScores(2,0)),false);
 assert.equal(devCaseImproved(row,0,passScores(2,0)),true);
 assert.equal(devCaseImproved(row,1,passScores(2,0)),false);
});

test('protection flags do not invent a must-block or must-pass label',()=>{
 const agreed=devRow({teacherIndex:0,aIndex:0,bIndex:0});
 agreed.protect=protectClass(agreed);
 assert.equal(agreed.protect,'agreed-pass');
 assert.equal(checkedRegression(agreed,1),null);
 const kept=devRow({aIndex:1,bIndex:1,teacherIndex:1});
 kept.actions.push({type:'chooseBlock',uid:'1-7'});
 kept.blockers.push(blocker('1-7','BLC-1-072',2000));
 kept.protect=protectClass(kept);
 kept.publicLethalKept=publicLethalKept(kept);
 assert.equal(kept.protect,'kept-block');
 assert.equal(checkedRegression(kept,0),'abandoned-kept-higher-block');
 assert.equal(checkedRegression(kept,2),null);
 assert.equal(checkedRegression(kept,4),'switched-to-losing-block');
 assert.equal(checkedRegression(kept,3),null);
 const quiet=devRow({life:4,damage:1,aIndex:1,bIndex:1});
 quiet.protect=protectClass(quiet);
 quiet.publicLethalKept=publicLethalKept(quiet);
 assert.equal(quiet.publicLethalKept,false);
 assert.equal(checkedRegression(quiet,0),null);
});

test('the schedule is one locked imitation pass and does not replay the loss seeds',()=>{
 assert.equal(ROUND10_LR,IMITATE_LR);
 assert.equal(ROUND10_EPOCHS,IMITATE_EPOCHS);
 assert.equal(ROUND10_REPLAY,REPLAY_FRACTION);
 assert.equal(LABEL_SMOOTH,0.05);
 assert.equal(fixedUpdateCount(1),6);
 const demos=[0,1,2,3].map(index=>({id:'demo-'+index,seed:ROUND10_DEMO_SEEDS[index]}));
 const steps=scheduleUpdates(['dev'],demos,3,0.5,round10Rng(),[193500,193501,193502]);
 assert.equal(steps.length,6);
 assert.deepEqual(steps.map(step=>step.kind),['train','replay','train','replay','train','replay']);
 assert.deepEqual(steps.filter(step=>step.kind==='train').map(step=>step.id),['dev','dev','dev']);
 assert.equal(new Set(steps.filter(step=>step.kind==='replay').map(step=>step.id)).size,3);
 assert.throws(()=>scheduleUpdates(['dev'],[{id:'x',seed:193502}],3,0.5,round10Rng(),[193502]));
 assert.ok(ROUND10_CRITERIA.length>=6);
 assert.equal(ROUND10_DEMO_DROP_LIMIT,0.05);
 assert.equal(DEV_EXPECT.teacherUid,'1-12');
 assert.equal(ROUND8_CANDIDATE_HASH.length,64);
});

test('frozen weights are not writable and the judge stops after one missed bar',()=>{
 assert.throws(()=>assertWritable(ROUND10_CANDIDATE_FILE));
 assert.ok(ROUND10_FROZEN_FILES.includes(ROUND10_CANDIDATE_FILE));
 const base={
  zeroMatchesB:true,devImproved:true,distance:0.2,transferParents:3,
  transferParentsImproved:1,checkedRegressions:[],illegal:0,demoDisclosed:true,
  demoUsed:20,demoExactDrop:0.01,sacrificed:[],agreedPassChanged:0,keptBlockChanged:0
 };
 assert.equal(judgeRound10(base).verdict,'局部有教師修正');
 assert.equal(judgeRound10(base).recommend,true);
 assert.equal(judgeRound10({...base,transferParentsImproved:0}).verdict,'本輪局部學習修正未成立');
 assert.equal(judgeRound10({...base,checkedRegressions:[{id:'x',kind:'abandoned-kept-higher-block'}]}).passed,false);
 assert.equal(judgeRound10({...base,demoExactDrop:0.06}).recommend,false);
 assert.equal(judgeRound10({...base,demoDisclosed:false}).passed,false);
 assert.match(explainRound10({...base,transferParents:0,transferParentsImproved:0}).q2,/不足以檢查遷移/);
 assert.match(explainRound10(base).q4,/教師行為/);
 assert.ok(Math.abs(exactDrop({used:4,exactRate:0.5},{used:4,exactRate:0.4})-0.1)<1e-12);
});

test('scoring reads every legal row, including the pass',()=>{
 const net=createNet(7);
 const width=net.sizes[0];
 const rows=[new Float64Array(width),new Float64Array(width)];
 rows[1][0]=1;
 const actions=[{type:'chooseBlock',uid:null},{type:'chooseBlock',uid:'1-12'}];
 const scores=Float64Array.from(rows,row=>forwardTrain(net,row).q);
 assert.equal(scores.length,actions.length);
 assert.equal(scoresIdentical(scores,scores),true);
 const shifted=Float64Array.from(scores);
 shifted[0]=shifted[0]+1;
 assert.equal(scoresIdentical(scores,shifted),false);
});
