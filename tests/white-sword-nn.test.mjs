import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import test from 'node:test';
import {planBudget} from '../training/white-sword-nn/budget.mjs';
import {V2_FILE_HASH} from '../training/white-sword-nn/constants.mjs';
import {
 ACTION_DIM,INPUT_DIM,STATE_DIM,encodeAction,encodeState,joinFeatures,publicHistoryStep,sameVector,visibleIndex
} from '../training/white-sword-nn/encode.mjs';
import {imitationPass,monteCarloPass} from '../training/white-sword-nn/learn.mjs';
import {
 backward,createNet,createOptimizer,forwardTrain,greedyIndex,scoreActions
} from '../training/white-sword-nn/net.mjs';
import {
 BENCH_NN_SEED,BENCH_V2_SEED,DEV_SEEDS,IMITATE_SEEDS,SELF_SEEDS,TEST_SEEDS,allExperimentSeeds,assertExperimentSeed
} from '../training/white-sword-nn/protocol.mjs';
import {judgeLearning,judgePrototype,renderReport} from '../training/white-sword-nn/report.mjs';

function player(){
 return {
  lifeCount:7,deckCount:40,handCount:0,hand:[],
  front:[null,null,null,null],energy:[null,null,null,null],
  apReady:0,energyTotal:0,energyByColor:{green:2},outside:[],removed:[],faceUpLife:[],publicLife:[]
 };
}
function observation(){
 const me=player();
 const opp=player();
 opp.hand=null;
 opp.handCount=4;
 me.hand=[{uid:'0-3',cardId:'BLC-2-067'},{uid:'0-4',cardId:'BLC-1-085'}];
 me.handCount=2;
 me.front[0]={uid:'0-8',cardId:'BLC-4-060',ready:true,bp:4000,raidDepth:0};
 return {visible:{phase:'main',turn:2,active:0,pending:null,battle:null,players:[me,opp]},private:null};
}

test('experiment seeds stay out of the old splits',()=>{
 const all=allExperimentSeeds();
 assert.equal(new Set(all).size,all.length);
 for(const seed of all)assertExperimentSeed(seed);
 assertExperimentSeed(BENCH_NN_SEED,'bench');
 assert.throws(()=>assertExperimentSeed(BENCH_V2_SEED,'train'));
 assert.throws(()=>assertExperimentSeed(DEV_SEEDS[0],'train'));
 assert.throws(()=>assertExperimentSeed(TEST_SEEDS[0],'dev'));
 const train=new Set([...IMITATE_SEEDS,...SELF_SEEDS]);
 for(const seed of [...DEV_SEEDS,...TEST_SEEDS,BENCH_NN_SEED,BENCH_V2_SEED])assert.equal(train.has(seed),false);
});

test('the budget never spends a v2 game that the measurement did not finish',()=>{
 const open=planBudget({wallMs:1e15,nnMs:1000,v2Ms:1000,v2Finished:true,workers:2});
 assert.equal(open.imitate,8);
 assert.equal(open.self,24);
 assert.equal(open.dev,16);
 assert.equal(open.test,8);
 const blocked=planBudget({wallMs:1e15,nnMs:1000,v2Ms:1000,v2Finished:false,workers:1});
 assert.equal(blocked.imitate,0);
 assert.equal(blocked.test,0);
 assert.ok(blocked.self>0);
 assert.ok(blocked.dev>0);
 const tight=planBudget({wallMs:1000,nnMs:5000,v2Ms:5000,v2Finished:true,workers:1});
 assert.equal(tight.imitate,0);
 assert.equal(tight.self,0);
});

test('action features use the visible card and ignore uid text',()=>{
 const view=observation();
 const index=visibleIndex(view,0);
 const played=encodeAction(index,{type:'play',uid:'0-3',line:'front',slot:1,secret:'0-99'});
 const missing=encodeAction(index,{type:'play',uid:'0-9',line:'front',slot:1,secret:'1-2'});
 const same=encodeAction(index,{type:'play',uid:'0-3',line:'front',slot:1,note:'1-8'});
 assert.equal(sameVector(played,missing),false);
 assert.equal(sameVector(played,same),true);
 assert.equal(played.length,ACTION_DIM);
 const history=publicHistoryStep(0,{type:'play',uid:'0-3',line:'front',slot:1},'0-3');
 assert.equal(history.cardId,'');
 assert.equal(Object.keys(history).some(key=>/uid/i.test(key)),false);
 const revealed=publicHistoryStep(0,{type:'play',line:'front',slot:1},'BLC-2-067');
 assert.equal(revealed.cardId,'BLC-2-067');
});

test('the state vector changes with the actor hand and not with a hidden label',()=>{
 const view=observation();
 const first=encodeState(view,0,[]);
 assert.equal(first.length,STATE_DIM);
 view.visible.players[0].hand[0].cardId='BLC-4-080';
 const changed=encodeState(view,0,[]);
 assert.equal(sameVector(first,changed),false);
 view.visible.players[1].privateDeck=['0-1','0-2'];
 const again=encodeState(view,0,[]);
 assert.equal(sameVector(changed,again),true);
 view.visible.players[1].hand=[{uid:'1-1',cardId:'BLC-2-067'}];
 assert.throws(()=>encodeState(view,0,[]));
 assert.throws(()=>encodeState({visible:{...view.visible,seed:1,players:view.visible.players},private:null},0,[]));
});

test('scoring a state and action matches a joined forward pass',()=>{
 const net=createNet(5);
 const state=Array.from({length:STATE_DIM},(_,index)=>((index*17)%10)/10);
 const action=Array.from({length:ACTION_DIM},(_,index)=>((index*3)%7)/7);
 const joined=joinFeatures(state,action);
 assert.equal(joined.length,INPUT_DIM);
 const direct=forwardTrain(net,joined).q;
 const scored=scoreActions(net,state,[action]);
 assert.ok(Math.abs(direct-scored[0])<1e-8);
});

test('a backward step matches a numeric derivative',()=>{
 const net=createNet(2,{sizes:[3,2,2,1],stateDim:2,version:'toy'});
 const input=Float64Array.from([0.2,-0.4,0.7]);
 const cache=forwardTrain(net,input);
 const grad=new Float64Array(net.theta.length);
 backward(net,cache,1,grad);
 const last=net.layers[net.layers.length-1];
 const epsilon=1e-5;
 for(let index=last.weight;index<net.theta.length;index++){
  const original=net.theta[index];
  net.theta[index]=original+epsilon;
  const plus=forwardTrain(net,input).q;
  net.theta[index]=original-epsilon;
  const minus=forwardTrain(net,input).q;
  net.theta[index]=original;
  const numeric=(plus-minus)/(2*epsilon);
  assert.ok(Math.abs(numeric-grad[index])<1e-5,index+' '+numeric+' vs '+grad[index]);
 }
 const first=net.layers[0];
 const pre=cache.hidden[0].pre;
 let hiddenIndex=-1;
 for(let out=0;out<first.output;out++){
  if(Math.abs(pre[out])<0.05)continue;
  hiddenIndex=first.weight+out*first.input;
  break;
 }
 assert.ok(hiddenIndex>=0);
 const original=net.theta[hiddenIndex];
 net.theta[hiddenIndex]=original+epsilon;
 const plus=forwardTrain(net,input).q;
 net.theta[hiddenIndex]=original-epsilon;
 const minus=forwardTrain(net,input).q;
 net.theta[hiddenIndex]=original;
 const numeric=(plus-minus)/(2*epsilon);
 assert.ok(Math.abs(numeric-grad[hiddenIndex])<1e-4,numeric+' vs '+grad[hiddenIndex]);
});

test('imitation prefers the demonstrated action and monte carlo reduces error',async()=>{
 const net=createNet(3,{sizes:[4,8,4,1],stateDim:2,version:'toy'});
 const rows=[
  Float64Array.from([1,0,0,0]),
  Float64Array.from([0,1,0,0]),
  Float64Array.from([0,0,1,0])
 ];
 const samples=Array.from({length:8},()=>({rows,chosen:1}));
 const opt=createOptimizer(0.08,0);
 for(let epoch=0;epoch<40;epoch++)imitationPass(net,opt,samples,{smooth:0});
 const scores=rows.map(row=>forwardTrain(net,row).q);
 assert.ok(scores[1]>scores[0]);
 assert.ok(scores[1]>scores[2]);
 const value=createNet(4,{sizes:[3,4,1],stateDim:2,version:'toy'});
 const monteOpt=createOptimizer(0.05,0);
 const monte=Array.from({length:30},(_,index)=>({
  x:Float64Array.from([1,index%2,0.1]),
  target:index%2?0.7:-0.7
 }));
 const start=monteError(value,monte);
 for(let epoch=0;epoch<30;epoch++)monteCarloPass(value,monteOpt,monte);
 assert.ok(monteError(value,monte)<start*0.5);
});

function monteError(net,samples){
 let loss=0;
 for(const sample of samples){
  const error=forwardTrain(net,sample.x).q-sample.target;
  loss+=error*error;
 }
 return loss/samples.length;
}

test('greedy tie break stays on a legal object',()=>{
 const legal=[{type:'next'},{type:'play',uid:'0-1'}];
 const scores=Float64Array.from([1,1]);
 assert.equal(greedyIndex(scores,legal),0);
 scores[1]=2;
 assert.equal(legal[greedyIndex(scores,legal)],legal[1]);
});

test('learning and prototype verdicts stay separate',()=>{
 assert.equal(judgeLearning({finished:16,low:0.51}).established,true);
 assert.equal(judgeLearning({finished:16,low:0.49}).established,false);
 assert.equal(judgeLearning({finished:8,low:0.99}).established,false);
 const text=renderReport({
  gamma:0.995,imitateLr:0.001,monteLr:0.0005,smooth:0.05,explore:0.12,
  parameters:10,bench:{forward:{},train:{},nnGame:{ms:1,steps:1,status:'finished'},v2Finished:false,rssMb:1},
  plan:{wallMs:1,estimatedMs:1,workers:1,imitate:0,self:0,dev:0,test:0},
  elapsedMs:1,actual:{imitate:0,self:0,dev:0,test:0},initialization:'random-because-no-v2-demonstration',
  imitationSamples:0,monteSamples:0,imitationCurve:[],monteCurve:[],
  distance:{initToA:0,aToB:0},resourceGap:'',dev:{overall:{finished:0,unfinished:0}},
  testB:{overall:{}},testA:{overall:{}},
  learning:{established:false,reason:'完成對局少於事先登記的 16 場'},
  promotion:{promoted:false,reasons:['已完成的基準對局少於 200']},
  anomalies:{illegal:0,leak:0},collisions:0,explored:0,decisionTiming:null,
  frozen:true,played:true,prototype:{running:true,reasons:[]}
 });
 assert.match(text,/原型有跑起來/);
 assert.match(text,/自主學習沒有被證明/);
 const stopped=judgePrototype({bench:{},frozen:false,played:false,anomalies:{illegal:1,leak:0}});
 assert.equal(stopped.running,false);
});

test('official v2 weights and the site entrypoints stay untouched by this module',()=>{
 const hash=createHash('sha256').update(readFileSync('training/white-sword-ai/weights/v2-capped.json')).digest('hex');
 assert.equal(hash,V2_FILE_HASH);
 const files=[
  'dist/app.mjs','dist/index.html','dist/universal-v2-battle.html','dist/universal-v2-preview.html',
  'dist/universal-v2/white-sword-ai/index.mjs','dist/universal-v2/white-sword-ai/choose.mjs'
 ];
 for(const file of files){
  assert.equal(existsSync(file),true,file);
  assert.equal(readFileSync(file,'utf8').includes('white-sword-nn'),false,file);
 }
});
