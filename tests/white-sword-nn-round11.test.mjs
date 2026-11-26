import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {IMITATE_LR,LABEL_SMOOTH} from '../training/white-sword-nn/constants.mjs';
import {publicDecisionContext} from '../training/white-sword-nn/play.mjs';
import {holdoutSplit,IMITATE_SEEDS,SELF_SEEDS} from '../training/white-sword-nn/protocol.mjs';
import {
 A_SEEN_SEEDS,A_UNSEEN_SEEDS,MIN_UNSEEN_TRAIN,ROUND11_CRITERIA,ROUND11_EPOCH_CHOICES,
 ROUND11_FROZEN_FILES,ROUND11_LR,ROUND11_PROTECTION,ROUND11_SMOOTH,TYPE_WEIGHTS,
 assertTrainPool,assertWritable,auditSample,blockBehavior,blockCoverage,choiceClass,
 corpusRoles,decisionKind,distribution,explainRound11,gainCounts,improvedSeeds,
 isolateSamples,judgeRound11,kindTable,lockPlan,newObviousErrors,perSeedRate,
 regressions,round11Rng,scheduleCorpus,seedPaired,stratifiedEpoch,teacherLabel
} from '../training/white-sword-nn/round11.mjs';

function action(type,uid=null,extra={}){
 return {type,uid,...extra};
}
function sample(extra={}){
 const actions=[action('chooseBlock',null),action('chooseBlock','1-12'),action('chooseBlock','1-40')];
 return {
  id:'imitate-clean:188624:1:0:10',source:'imitate-clean',synthetic:false,
  labeledByUniversalRule:false,hiddenLifeUsed:false,lifeCards:null,
  seed:188624,first:0,learnerSeat:1,step:10,pending:'block',
  life:4,damage:1,impact:0,attackerBp:2500,attackerUid:'0-17',
  actions,chosen:1,kind:'block',
  rows:[[1,0],[1,1],[1,2]],
  front:[
   {uid:'1-12',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:0,restrictions:[],raidLayers:[],underLayers:[]},
   {uid:'1-40',cardId:'BLC-3-008',bp:3000,ready:true,raidDepth:0,restrictions:[],raidLayers:[],underLayers:[]}
  ],
  identities:[['1-12',{cardId:'BLC-2-067',faceDown:false}],['1-40',{cardId:'BLC-3-008',faceDown:false}]],
  ...extra
 };
}

test('A training seeds stay out of the unseen holdout',()=>{
 const split=holdoutSplit([...IMITATE_SEEDS]);
 assert.deepEqual([...A_SEEN_SEEDS],split.train);
 assert.deepEqual([...A_UNSEEN_SEEDS],split.holdout);
 assert.equal(A_SEEN_SEEDS[0],188600);
 assert.equal(A_SEEN_SEEDS.at(-1),188623);
 assert.equal(A_UNSEEN_SEEDS[0],188624);
 assert.equal(A_UNSEEN_SEEDS.at(-1),188631);
 const unseen=lockPlan({v2Ms:100,workers:2,decisionMs:0.01,decisionsPerGame:50,extraPool:12});
 assert.equal(unseen.trainSource,'unseen-prefix');
 assert.equal(unseen.epochs,12);
 assert.equal(unseen.extra,12);
 const roles=corpusRoles(unseen);
 assert.deepEqual([...roles.reserve], [...A_SEEN_SEEDS]);
 for(const seed of A_UNSEEN_SEEDS)assert.equal(roles.roleOf(seed),'holdout');
 for(const seed of A_SEEN_SEEDS)assert.equal(roles.roleOf(seed),'round-reserve');
 for(const seed of roles.train)assert.equal(roles.roleOf(seed),'train');
 const games=scheduleCorpus(unseen);
 assert.equal(new Set(games.map(game=>game.seed)).size,games.length);
 assert.equal(games.filter(game=>game.seed===188600).length,1);
 assert.equal(games.find(game=>game.seed===188600).role,'round-reserve');
 assert.equal(games.find(game=>game.seed===188624).role,'holdout');
});

test('a short unseen prefix falls back without calling those seeds unseen',()=>{
 const plan=lockPlan({v2Ms:100,workers:2,decisionMs:0.01,decisionsPerGame:50,extraPool:8});
 assert.equal(plan.trainSource,'a-seen-fallback');
 assert.ok(plan.extraTrain.length<MIN_UNSEEN_TRAIN);
 const roles=corpusRoles(plan);
 assert.equal(roles.reserve.length,0);
 for(const seed of A_SEEN_SEEDS)assert.equal(roles.roleOf(seed),'train');
 for(const seed of plan.extraHoldout)assert.equal(roles.roleOf(seed),'holdout');
 for(const seed of plan.extraTrain)assert.equal(A_SEEN_SEEDS.includes(seed),false);
});

test('the locked budget prefers more existing seeds, then more epochs',()=>{
 const slow=lockPlan({v2Ms:2000,workers:2,decisionMs:40,decisionsPerGame:200,wallMs:1200000});
 assert.equal(slow.epochs,3);
 assert.equal(slow.extra,41);
 assert.equal(slow.extraSeeds.length,41);
 assert.deepEqual(slow.extraSeeds,SELF_SEEDS.slice(0,41));
 assert.ok(slow.estimate.total<=1200000);
 assert.throws(()=>lockPlan({v2Ms:2000,workers:2,decisionMs:40,decisionsPerGame:200,wallMs:1000}));
 const fast=lockPlan({v2Ms:100,workers:2,decisionMs:0.01,decisionsPerGame:50});
 assert.equal(fast.extra,SELF_SEEDS.length);
 assert.equal(fast.epochs,ROUND11_EPOCH_CHOICES.at(-1));
 assert.equal(fast.lr,IMITATE_LR);
 assert.equal(ROUND11_LR,IMITATE_LR);
 assert.equal(ROUND11_SMOOTH,LABEL_SMOOTH);
 assert.deepEqual(fast.weights,TYPE_WEIGHTS);
});

test('stratified updates use every training sample once and skip held seeds',()=>{
 const samples=[
  {id:'p',kind:'play',seed:1,role:'train'},
  {id:'a',kind:'attack',seed:1,role:'train'},
  {id:'b',kind:'block',seed:2,role:'train'},
  {id:'e',kind:'effect',seed:2,role:'train'},
  {id:'b2',kind:'block',seed:2,role:'train'}
 ];
 const epoch=stratifiedEpoch(samples,round11Rng(7));
 assert.deepEqual(epoch.map(sample=>sample.id).sort(),['a','b','b2','e','p']);
 assert.notEqual(epoch[0].kind,epoch[1].kind);
 assertTrainPool(epoch,[188624],[188600]);
 assert.throws(()=>assertTrainPool([{seed:188624,role:'train'}], [188624], []));
 assert.throws(()=>stratifiedEpoch([{kind:'mystery',seed:1}],round11Rng()));
});

test('labels come from the recorded teacher, not a life or BP threshold',()=>{
 const row=sample();
 assert.equal(teacherLabel(row),1);
 assert.equal(teacherLabel({...row,life:1,damage:2,impact:0,attackerBp:1000}),1);
 assert.equal(teacherLabel({...row,labeledByUniversalRule:true}),null);
 assert.equal(teacherLabel({...row,hiddenLifeUsed:true}),null);
 assert.equal(teacherLabel({...row,lifeCards:[{cardId:'secret'}]}),null);
 assert.equal(decisionKind(row.actions[0]),'block');
 assert.equal(decisionKind({type:'play'}),'play');
 assert.equal(decisionKind({type:'attack'}),'attack');
 assert.equal(decisionKind({type:'chooseTrigger'}),'trigger');
 assert.equal(decisionKind({type:'activate'}),'effect');
 assert.equal(decisionKind({type:'chooseDiscard'}),'effect');
 assert.equal(decisionKind({type:'end'}),'other');
});

test('same card id is not proven equivalence',()=>{
 const row=sample();
 assert.equal(choiceClass(row,1),'exact');
 const twin=sample({
  actions:[action('chooseBlock',null),action('chooseBlock','1-12'),action('chooseBlock','1-15')],
  front:[
   {uid:'1-12',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:0,restrictions:[],raidLayers:[],underLayers:[]},
   {uid:'1-15',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:1,restrictions:[],raidLayers:[],underLayers:[]}
  ]
 });
 assert.equal(choiceClass(twin,2),'disagree');
 const copy=sample({
  actions:[action('chooseBlock',null),action('chooseBlock','1-12'),action('chooseBlock','1-15')],
  front:[
   row.front[0],
   {uid:'1-15',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:0,restrictions:[],raidLayers:[],underLayers:[]}
  ]
 });
 assert.equal(choiceClass(copy,2),'proven');
 const play={
  ...sample({pending:'main',kind:'play',chosen:0,attackerUid:null}),
  actions:[action('play','1-1'),action('play','1-2')],
  identities:[['1-1',{cardId:'BLC-1-001',faceDown:false}],['1-2',{cardId:'BLC-1-001',faceDown:false}]]
 };
 assert.equal(choiceClass(play,1),'same-id-unproven');
});

test('hidden information and unknown sources are isolated',()=>{
 const row=sample();
 assert.equal(auditSample(row).ok,true);
 assert.equal(auditSample({...row,source:'guess'}).ok,false);
 assert.equal(auditSample({...row,attackerUid:null}).ok,false);
 const hidden=sample({hiddenLifeUsed:true});
 const isolated=isolateSamples([row,hidden]);
 assert.equal(isolated.kept.length,0);
 assert.ok(isolated.isolated.length>=2);
 const observation={
  visible:{
   phase:'attack',turn:2,active:0,pending:{kind:'block'},
   battle:{uid:'0-17',cardId:'BLC-2-069',bp:2500,damage:1,impact:0},
   players:[
    {lifeCount:4,handCount:2,hand:null,front:[]},
    {lifeCount:1,handCount:3,hand:[{cardId:'own'}],front:[{uid:'1-12',cardId:'BLC-2-067',bp:4000,ready:true,raidDepth:0}]}
   ]
  }
 };
 const leaked=structuredClone(observation);
 leaked.visible.players[0].hand=[{cardId:'secret'}];
 assert.throws(()=>publicDecisionContext(leaked,1));
 const context=publicDecisionContext(observation,1);
 assert.equal(context.attackerUid,'0-17');
 assert.equal(context.life,1);
 assert.equal(Array.isArray(context.life),false);
 assert.equal(context.front[0].bp,4000);
 assert.equal(context.hand,3);
});

test('seed rates do not treat two decisions from one seed as two clusters',()=>{
 const rows=[
  sample({id:'a',seed:188624}),
  sample({id:'b',seed:188624,step:11}),
  sample({id:'c',seed:188625})
 ];
 const before=new Map([['a',0],['b',1],['c',0]]);
 const after=new Map([['a',1],['b',1],['c',1]]);
 const left=perSeedRate(rows,before);
 const right=perSeedRate(rows,after);
 assert.equal(left.length,2);
 assert.equal(left.find(row=>row.seed===188624).p,0.5);
 const paired=seedPaired(left,right);
 assert.equal(paired.seeds,2);
 assert.equal(paired.mean,0.75);
 assert.ok(paired.low<0);
 assert.deepEqual(improvedSeeds(left,right),[188624,188625]);
 const gains=gainCounts(rows,before,after);
 assert.equal(gains.decisions,2);
 assert.equal(gains.step118,0);
});

test('the judge keeps the pre-registered bar',()=>{
 const base={
  paired:{seeds:8,mean:0.04,low:0.01,high:0.07},
  holdoutSeeds:8,blockSeeds:4,blockImprovedSeeds:[188624,188625],
  blockGainDecisions:3,step118Gains:0,newObviousErrors:[],
  protectionComplete:true,regressionsDisclosed:true,
  block:{teacherPass:4,beforePass:4,afterPass:4,teacherBlock:6,beforeExact:2,afterExact:5,beforeAny:3,afterAny:5}
 };
 const passed=judgeRound11(base);
 assert.equal(passed.passed,true);
 assert.equal(passed.verdict,'模仿起點改善成立');
 assert.equal(passed.recommend,true);
 const wide=judgeRound11({...base,paired:{seeds:8,mean:0.02,low:-0.01,high:0.05}});
 assert.equal(wide.verdict,'證據不足');
 assert.equal(wide.recommend,false);
 const worse=judgeRound11({...base,paired:{seeds:8,mean:-0.04,low:-0.08,high:-0.01}});
 assert.equal(worse.verdict,'本輪模仿起點改善未成立');
 assert.match(explainRound11({...base,paired:{seeds:8,mean:-0.04,low:-0.08,high:-0.01},regressions:[{kind:'attack',used:4,before:0.5,after:0}]}).q3,/不是通過依據/);
 assert.doesNotMatch(explainRound11({...base,paired:{seeds:8,mean:-0.04,low:-0.08,high:-0.01}}).q3,/損失下降/);
 const oneSeed=judgeRound11({...base,blockImprovedSeeds:[188624]});
 assert.equal(oneSeed.passed,false);
 const step=judgeRound11({...base,blockGainDecisions:1,step118Gains:1,blockImprovedSeeds:[193502,188624]});
 assert.equal(step.blockOk,false);
 const error=judgeRound11({...base,newObviousErrors:[{error:'abandoned-kept-higher-block'}]});
 assert.equal(error.errorsOk,false);
 assert.equal(error.recommend,false);
 const text=explainRound11(base);
 assert.match(text.q1,/有/);
 assert.match(text.q4,/值得凍結/);
 assert.match(explainRound11(wide).q4,/不值得/);
 assert.match(explainRound11({
  ...base,
  block:{...base.block,beforePass:4,afterPass:1,beforeAny:1,afterAny:6,beforeExact:2,afterExact:2}
 }).q2,/更常擋/);
});

test('obvious errors are only the checked new ones, and type drops are listed',()=>{
 const kept={
  id:'p',seed:193500,step:77,pending:'block',protect:'kept-block',publicLethalKept:true,
  aIndex:1,endpointIndex:0,
  actions:[action('chooseBlock',null),action('chooseBlock','1-12')],
  teacherIndex:1,life:1,damage:1,impact:0,attackerBp:2000,
  blockers:[{uid:'1-12',bp:4000}]
 };
 assert.equal(newObviousErrors([kept]).length,1);
 assert.equal(newObviousErrors([{...kept,aIndex:0,endpointIndex:0}]).length,0);
 assert.equal(newObviousErrors([{...kept,endpointIndex:1}]).length,0);
 const before=kindTable([
  sample({id:'b',kind:'block',chosen:1}),
  sample({id:'p',kind:'play',chosen:0,pending:'main',actions:[action('play','1-1'),action('end')],attackerUid:null})
 ],new Map([['b',1],['p',0]]));
 const after=kindTable([
  sample({id:'b',kind:'block',chosen:1}),
  sample({id:'p',kind:'play',chosen:0,pending:'main',actions:[action('play','1-1'),action('end')],attackerUid:null})
 ],new Map([['b',0],['p',0]]));
 const dropped=regressions(before,after);
 assert.deepEqual(dropped.map(row=>row.kind),['block']);
 const coverage=blockCoverage([sample(),sample({id:'x',seed:188625,chosen:0})]);
 assert.equal(coverage.teacherBlock,1);
 assert.equal(coverage.teacherPass,1);
 assert.equal(coverage.seeds.length,2);
 const behavior=blockBehavior([sample(),sample({id:'x',seed:188625,chosen:0})],new Map([['imitate-clean:188624:1:0:10',0],['x',0]]),new Map([['imitate-clean:188624:1:0:10',1],['x',0]]));
 assert.equal(behavior.beforeExact,0);
 assert.equal(behavior.afterExact,1);
 assert.equal(behavior.afterPass,1);
 assert.deepEqual(distribution([sample()]),{block:1});
});

test('protection games and frozen files stay outside this round',()=>{
 const losses=JSON.parse(readFileSync('docs/white-sword-ai/nn-round9-losses.json','utf8'));
 const locked=losses.cells.flatMap(cell=>cell.losses).map(row=>[row.seed,row.learnerSeat,row.first,row.winner,row.steps].join(':'));
 const ours=ROUND11_PROTECTION.map(row=>[row.seed,row.learnerSeat,row.first,row.winner,row.steps].join(':'));
 assert.deepEqual(ours,locked);
 assert.equal(ROUND11_PROTECTION.length,8);
 assert.ok(ROUND11_FROZEN_FILES.includes('training/white-sword-nn/weights/round2/a-frozen.json'));
 assert.ok(ROUND11_FROZEN_FILES.includes('training/white-sword-nn/weights/round10/actor-block-endpoint.json'));
 assert.throws(()=>assertWritable(ROUND11_FROZEN_FILES[0]));
 assert.equal(ROUND11_CRITERIA.length,5);
 const plan=lockPlan({v2Ms:100,workers:2,decisionMs:0.01,decisionsPerGame:50,extraPool:12});
 for(const spec of ROUND11_PROTECTION)assert.equal(corpusRoles(plan).roleOf(spec.seed),null);
});
