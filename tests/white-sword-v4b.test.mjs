import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {legalUniversalActions,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {cloneMatch,matchRules,newComparedMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {HARD_OPTIONS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {searchOnce,scoreBlend} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {POLICY_DIM} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {positionKey} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {choiceKey} from '../training/white-sword-ai/v4a/lib/diverge.mjs';
import {v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {jobsFor} from '../training/white-sword-ai/v4b/lib/evaluate.mjs';
import {publicBoard,sampleHidden} from '../training/white-sword-ai/v4b/lib/hidden.mjs';
import {agrees,controlBeats,matchedGaussian,updateFromPreferences} from '../training/white-sword-ai/v4b/lib/learn.mjs';
import {finishFromAction,minePool,replayState} from '../training/white-sword-ai/v4b/lib/play.mjs';
import {
 DEV_SEEDS,MINE_SEEDS,PILOT_SEEDS,assertFreshPlan,assertFreshSeed,deckWarning,devEntry,judgeSamples,pilotDecision,shouldExtend
} from '../training/white-sword-ai/v4b/lib/protocol.mjs';
import {renderReport} from '../training/white-sword-ai/v4b/lib/report.mjs';
import {selectPositions} from '../training/white-sword-ai/v4b/lib/select.mjs';
import {loadOpponents,pilotSpecs} from '../training/white-sword-ai/v4b/lib/specs.mjs';

const V2_HASH='a06d2f9fc209769741e7cb266b26e052e9326d975b392e324ab8bdcaca8c4ffa';
const RULES=matchRules('official');

test('blocked seeds and the three new ranges stay apart',()=>{
 for(const seed of [94000,94016,130000,130016,100000,104999,160000,162229]){
  assert.throws(()=>assertFreshSeed(seed,'check'),error=>error.code==='V4B_SEED');
 }
 assertFreshSeed(170000,'pilot');
 assert.throws(()=>assertFreshPlan([170000,170000],'dup'));
 const mine=Object.values(MINE_SEEDS).flat();
 const all=[...PILOT_SEEDS,...mine,...DEV_SEEDS];
 assert.equal(new Set(all).size,all.length);
 assertFreshPlan(all,'plan');
});

test('eight clear samples can update and a 5 to 3 split cannot',()=>{
 const clear=judgeSamples([1,1,1,1,1,1,1,1]);
 assert.equal(clear.usable,true);
 assert.equal(shouldExtend(clear,8),false);
 const split=judgeSamples([1,1,1,1,1,-1,-1,-1]);
 assert.equal(split.usable,false);
 assert.equal(split.reason,'證據不足');
 assert.equal(shouldExtend(split,8),true);
 assert.equal(shouldExtend(split,24),false);
 const tie=judgeSamples([1,-1,1,-1,1,-1,1,-1]);
 assert.equal(tie.mean,0);
 assert.equal(shouldExtend(tie,8),false);
});

test('a deck warning records uncertainty and blocks the expensive challenge',()=>{
 assert.equal(deckWarning({id:'renruki',delta:-0.02,ci:{high:0.01}}),null);
 const warning=deckWarning({id:'renruki',delta:-0.04,n:16,ci:{low:-0.2,high:0.01}});
 assert.equal(warning.confirmed,false);
 assert.match(warning.text,/點估計/);
 const confirmed=deckWarning({id:'renruki',delta:-0.08,n:120,ci:{low:-0.12,high:-0.04}});
 assert.equal(confirmed.confirmed,true);
 const entry=devEntry({
  paired:{n:48,delta:0.06,ci:{low:0.01,high:0.1}},
  decks:[{id:'renruki',delta:-0.04,ci:{low:-0.2,high:0.01}},{id:'white-sword',delta:0.1,ci:{low:0,high:0.2}}],
  anomalies:{illegal:0,leak:0,engineError:0,unfinished:0}
 });
 assert.equal(entry.enter,false);
 assert.equal(entry.warnings.length,1);
});

test('pilot refuses leaks and the wrong game count',()=>{
 const games=Array.from({length:200},()=>({status:'finished',winner:0,anomalies:{}}));
 assert.equal(pilotDecision(games).ok,true);
 games[0]={status:'error',winner:null,anomalies:{engineError:1}};
 assert.equal(pilotDecision(games).ok,false);
});

test('the update follows a usable preference and ignores insufficient evidence',()=>{
 const parent=Array(POLICY_DIM).fill(0);
 const featuresA=Array(POLICY_DIM).fill(0);
 const featuresB=Array(POLICY_DIM).fill(0);
 featuresA[1]=1;
 const actionA={hard:0,features:featuresA,key:'a'};
 const actionB={hard:0,features:featuresB,key:'b'};
 const weak={usable:false,mean:1,actionA,actionB};
 assert.throws(()=>agrees(parent,weak),error=>error.code==='V4B_EVIDENCE');
 const ignored=updateFromPreferences(parent,[weak]);
 assert.equal(ignored.changed,0);
 const rows=Array.from({length:4},()=>({usable:true,mean:1,low:1,high:1,actionA,actionB}));
 const stepped=updateFromPreferences(parent,rows);
 assert.ok(stepped.policy[1]>parent[1]);
 assert.ok(stepped.policy[1]-parent[1]<=1.5+1e-8);
 assert.equal(agrees(stepped.policy,rows[0]),true);
 const rates=[];
 for(let salt=0;salt<32;salt++)rates.push(agrees(matchedGaussian(parent,stepped.l2,salt),rows[0])?1:0);
 const mean=rates.reduce((sum,value)=>sum+value,0)/rates.length;
 assert.ok(mean<0.9);
 assert.ok(rates.filter(value=>value===0).length>=4);
 assert.equal(controlBeats(1,[0,0,0,1,1]).ok,true);
 assert.equal(controlBeats(0.5,[0.2,0.5,0.7]).ok,false);
});

test('position selection keeps several situation types',()=>{
 const pool=[];
 for(let index=0;index<20;index++)pool.push({id:'raid'+index,bucket:'raid',opponent:'renruki',step:index,band:[{key:'a'},{key:'b'}]});
 for(const bucket of ['early-energy','ap','line-move','mid-entry','attack-defense','late-pressure']){
  pool.push({id:bucket,bucket,opponent:indexOpponent(bucket),step:1,band:[{key:'a'},{key:'b'}]});
 }
 const selected=selectPositions(pool,40);
 assert.ok(selected.chosen.length<=40);
 assert.equal(selected.counts.raid,8);
 assert.ok(selected.buckets>=7);
 assert.ok(selected.chosen.filter(row=>row.bucket==='raid').length<selected.chosen.length);
});

test('pilot list is 200 games on fresh seeds',()=>{
 const specs=pilotSpecs(loadOpponents());
 assert.equal(specs.length,200);
 const seeds=new Set(specs.map(spec=>spec.seed));
 assert.deepEqual([...seeds],[...PILOT_SEEDS]);
 const kinds=new Set(specs.map(spec=>spec.opponentKind));
 assert.deepEqual([...kinds].sort(),['elite','hard-reject','hard-renruki','hard-white','v2','v4a2']);
 for(const spec of specs){
  assert.equal(spec.seats[spec.specialistSeat].explore,0);
  assert.equal(spec.seats[spec.specialistSeat].hardCap,7);
  assert.equal(spec.seats.filter(Boolean).length,2);
 }
 const even=specs.find(spec=>spec.seed%2===0&&spec.opponentKind==='v4a2');
 const odd=specs.find(spec=>spec.seed%2===1&&spec.opponentKind==='elite');
 assert.ok(even&&odd);
});

test('hard search 2 and the official v2 file stay unchanged',()=>{
 assert.equal(HARD_OPTIONS.nodes,48);
 assert.equal(Object.hasOwn(HARD_OPTIONS,'ms'),false);
 assert.equal(v2Hash(),V2_HASH);
 const text=readFileSync('.github/workflows/white-sword-v4b.yml','utf8');
 assert.match(text,/workflow_dispatch/);
 assert.equal(text.includes('schedule:'),false);
 const report=renderReport({
  stopped:'evidence',stopReasons:['可用的動作偏好只有 1 個'],
  pilot:{games:200,unfinishedRate:0,meanMs:10,mix:{'v2/white-sword':40}},
  selected:{n:2,buckets:2,counts:{ap:1,raid:1},opponents:{'white-sword':1,renruki:1}},
  budgetSpent:200,budgetCap:5000,
  preferences:[{
   bucket:'ap',opponent:'renruki',mean:-0.2,low:-0.4,high:-0.1,n:8,
   preferred:'{"type":"next","mode":null,"line":null,"uid":null,"slot":null}',
   other:'{"type":"activate","mode":"restTwoMove","line":null,"uid":"0-6","slot":null}',
   otherCard:'BLC-1-083'
  }]
 });
 assert.match(report,/沒有足夠證據/);
 assert.match(report,/沒有合併 main/);
 assert.match(report,/白劍 1/);
 assert.match(report,/BLC-1-083/);
});

test('a hidden sample keeps the public decision and the paired branches share it',{timeout:120000},()=>{
 const white=getDeck('white-sword');
 const other=getDeck('renruki');
 const packs=[white.pack,other.pack];
 let state=newComparedMatch(packs,[white.counts,other.counts],170120,0,RULES);
 for(let step=0;step<16&&state.status==='playing';step++){
  const actor=state.pending?.player??state.active;
  const legal=legalUniversalActions(packs,state);
  const picked=searchOnce(packs,state,170120).hard;
  const action=legal.find(item=>JSON.stringify(item)===JSON.stringify(picked))||legal[0];
  state=dispatchUniversalAction(packs,state,action,{actor});
 }
 assert.equal(state.status,'playing');
 const actor=state.pending?.player??state.active;
 const model=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const legal=legalUniversalActions(packs,state);
 const beforeSearch=searchOnce(packs,state,170120);
 const beforeBlend=scoreBlend(packs,state,legal,model,170120,actor,beforeSearch);
 const sampled=sampleHidden(state,actor,99);
 assert.deepEqual(publicBoard(sampled),publicBoard(state));
 assert.deepEqual(sampled.players[actor].hand.map(card=>card.uid),state.players[actor].hand.map(card=>card.uid));
 assert.equal(JSON.stringify(observeActor(packs,sampled,actor)),JSON.stringify(observeActor(packs,state,actor)));
 const afterSearch=searchOnce(packs,sampled,170120);
 assert.equal(JSON.stringify(afterSearch.hard),JSON.stringify(beforeSearch.hard));
 assert.equal(JSON.stringify(afterSearch.trace?.candidates||[]),JSON.stringify(beforeSearch.trace?.candidates||[]));
 const afterLegal=legalUniversalActions(packs,sampled);
 const afterBlend=scoreBlend(packs,sampled,afterLegal,model,170120,actor,afterSearch);
 assert.equal(JSON.stringify(afterBlend.action),JSON.stringify(beforeBlend.action));
 const again=sampleHidden(state,actor,99);
 const otherSample=sampleHidden(state,actor,100);
 assert.deepEqual(again.players[1-actor].deck.map(card=>card?.uid),sampled.players[1-actor].deck.map(card=>card?.uid));
 const changed=JSON.stringify(otherSample.players[1-actor].hand.map(card=>card?.uid))!==JSON.stringify(sampled.players[1-actor].hand.map(card=>card?.uid))
  ||JSON.stringify(otherSample.players[1-actor].deck.map(card=>card?.uid))!==JSON.stringify(sampled.players[1-actor].deck.map(card=>card?.uid));
 assert.equal(changed,true);
 const position={
  id:'hidden-check',actor,decks:['white-sword','renruki'],seed:170120,
  actionA:{action:legal[0]},actionB:{action:legal[Math.min(1,legal.length-1)]}
 };
 const jobs=jobsFor(position,state,0,12345);
 assert.deepEqual(jobs[0].state.players[1-actor].deck.map(card=>card?.uid),jobs[1].state.players[1-actor].deck.map(card=>card?.uid));
 assert.deepEqual(publicBoard(jobs[0].state),publicBoard(jobs[1].state));
 const left=finishFromAction({decks:position.decks,state:jobs[0].state,actor,action:legal[0],seed:170120,maxSteps:3});
 const right=finishFromAction({decks:position.decks,state:jobs[0].state,actor,action:legal[0],seed:170120,maxSteps:3});
 assert.deepEqual(left,right);
 if(legal.length>1&&choiceKey(legal[0])!==choiceKey(legal[1])){
  const base=cloneMatch(state);
  const first=dispatchUniversalAction(packs,cloneMatch(base),legal[0],{actor});
  const second=dispatchUniversalAction(packs,cloneMatch(base),legal[1],{actor});
  assert.notEqual(positionKey(first),positionKey(second));
 }
});

test('mined coordinates replay to the stored actions',{timeout:180000},()=>{
 const parent=loadModel('training/white-sword-ai/weights/v2-capped.json');
 const mined=minePool({
  parent,maxSteps:50,perBucket:2,seeds:{renruki:[170120]},log(){}
 });
 assert.equal(mined.games,1);
 assert.ok(mined.decisions>0);
 assert.ok(mined.positions.length>=1);
 for(const position of mined.positions.slice(0,2)){
  const replay=replayState(position);
  const legal=legalUniversalActions(replay.packs,replay.state);
  const keys=new Set(legal.map(action=>choiceKey(action)));
  assert.equal(keys.has(position.actionA.key),true);
  assert.equal(keys.has(position.actionB.key),true);
  assert.equal(JSON.stringify(position).includes('opponentHand'),false);
 }
});

function indexOpponent(bucket){
 return bucket==='ap'?'reject-blue':bucket==='line-move'?'white-sword':'renruki';
}
