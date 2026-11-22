import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadModel} from '../dist/universal-v2/white-sword-ai/model.mjs';
import {positionKey} from '../dist/universal-v2/white-sword-ai/runner.mjs';
import {policyHash,proposeEvolution} from '../training/white-sword-ai/v4a/lib/evolve.mjs';
import {buildStageCSpecs,buildStageSpecs} from '../training/white-sword-ai/v4a/lib/matches.mjs';
import {propose,registerProposer} from '../training/white-sword-ai/v4a/lib/rl-hook.mjs';
import {renderHistory,renderRound} from '../training/white-sword-ai/v4a/lib/report.mjs';
import {nextRoundNumber,runRound} from '../training/white-sword-ai/v4a/lib/round.mjs';
import {assertPlanLegal,emptyLedger,recordPlan} from '../training/white-sword-ai/v4a/lib/seeds.mjs';
import {summarizeDisagreement} from '../training/white-sword-ai/v4a/lib/diverge.mjs';
import {
 clusterBootstrap,judgeExperimental,rankCandidates,screenCandidates
} from '../training/white-sword-ai/v4a/lib/stats.mjs';
import {assertWritable,v2Hash,V0_FILE,V1_FILE,V2_FILE} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {
 CANDIDATE_COUNT,CODE_VERSION,expectedCounts,isReserved,planSeeds,PROMOTION,STEP_CAP
} from '../training/white-sword-ai/v4a/lib/protocol.mjs';

const hashes=()=>({
 v2:createHash('sha256').update(readFileSync(V2_FILE)).digest('hex'),
 v1:createHash('sha256').update(readFileSync(V1_FILE)).digest('hex'),
 v0:createHash('sha256').update(readFileSync(V0_FILE)).digest('hex')
});
const parent=loadModel(V2_FILE);
const historical={v1:loadModel(V1_FILE),v0:loadModel(V0_FILE)};
const clean={illegal:0,timeout:0,fallback:0,deadLoop:0,engineError:0,leak:0,opponentFallback:0};

function workspace(){
 const root=mkdtempSync(join(tmpdir(),'v4a-'));
 const docs=join(root,'docs');
 return {root,docs};
}
function proposal(){
 return proposeEvolution({round:1,parent,historical,sigmaScale:1});
}
function fakeProbe(report){
 return async()=>report;
}
function replayOk(){
 return {same:true,finished:true,anomalies:{...clean}};
}
function play(behavior=()=>({})){
 const calls=[];
 const playMany=async(specs,{onGame}={})=>{
  calls.push(specs[0]?.stage);
  const games=specs.map(spec=>({
   specKey:spec.key,status:'finished',winner:spec.specialistSeat,
   anomalies:{...clean},timing:{n:1,mean:2,p50:2,p95:2,max:2},
   tally:{energy:1,front:1,move:0,raid:1,attack:1,apSpent:1},
   ...behavior(spec)
  }));
  for(const game of games)onGame?.(game);
  return games;
 };
 return {playMany,calls};
}
async function evolve(profile,round,behavior,probe){
 const dir=workspace();
 const running=play(behavior);
 const report=await runRound({
  profile,round,root:dir.root,docsRoot:dir.docs,playMany:running.playMany,
  probe:probe||fakeProbe({positions:4,disagreed:2,rate:0.5,examples:[],fallbackIds:[]}),
  replayMatches:replayOk,log(){}
 });
 return {...dir,report,calls:running.calls};
}

test('outside-removal progress is part of the loop key',()=>{
 const player=()=>({
  life:[1],hand:[1],deck:[1],outside:[],removed:[],lifeRevealed:[],apCards:[],
  front:[null,null,null,null],energy:[null,null,null,null]
 });
 const state=selected=>({
  turn:15,phase:'main',active:0,effectQueue:[],
  pending:{kind:'effect-remove-outside',choices:['0-9','0-18'],selected},
  players:[player(),player()]
 });
 assert.notEqual(positionKey(state([])),positionKey(state(['0-9'])));
 assert.equal(positionKey(state(['0-9'])),positionKey(state(['0-9'])));
});

test('eight candidates differ inside the step cap and do not touch v2',()=>{
 const before=hashes();
 const first=proposal();
 const second=proposeEvolution({round:1,parent,historical,sigmaScale:1});
 assert.equal(first.candidates.length,CANDIDATE_COUNT);
 assert.equal(new Set(first.candidates.map(row=>row.policyHash)).size,8);
 assert.deepEqual(first.candidates.map(row=>row.policyHash),second.candidates.map(row=>row.policyHash));
 for(const candidate of first.candidates){
  assert.equal(candidate.hardCap,7);
  assert.equal(candidate.explore,0);
  assert.equal(candidate.scale,6);
  assert.equal(candidate.valueUntouched,true);
  assert.ok(candidate.maxAbsDelta<=STEP_CAP);
  assert.ok(candidate.changedWeights>0);
  candidate.model.policy.forEach((weight,index)=>{
   assert.ok(weight>=-6&&weight<=6);
   assert.ok(Math.abs(weight-parent.policy[index])<=STEP_CAP+1e-9);
  });
 }
 assert.deepEqual(parent.policy,loadModel(V2_FILE).policy);
 assert.deepEqual(hashes(),before);
});

test('reinforcement proposer is reserved and evolution stays fixed',()=>{
 assert.throws(()=>propose({kind:'reinforcement',round:1,parent,historical}),/強化學習/);
 registerProposer('reinforcement',()=>{throw Error('network weights are not part of v4-A');});
 assert.throws(()=>propose({kind:'reinforcement',round:1,parent,historical}),/network weights/);
 assert.throws(()=>registerProposer('evolution',()=>null),/固定不變/);
 const evolved=propose({kind:'evolution',round:2,parent,historical,sigmaScale:1});
 assert.equal(evolved.candidates.length,8);
 assert.throws(()=>proposeEvolution({round:1,parent,historical,sigmaScale:3}),/bound/);
});

test('seed blocks stay disjoint from old evidence and the holdout',()=>{
 for(const seed of [94000,94016,92000,80000,50000,48700,48660,21050])assert.equal(isReserved(seed),true);
 assert.equal(isReserved(100100),false);
 const round1=planSeeds(1,'round');
 const round2=planSeeds(2,'round');
 const smoke=planSeeds(0,'smoke');
 const ledger=emptyLedger();
 recordPlan(ledger,round1);
 assert.doesNotThrow(()=>recordPlan(ledger,round1));
 const used=new Set(ledger.uses.map(row=>row.seed));
 for(const entry of [...seedList(round2),...seedList(smoke)])assert.equal(used.has(entry.seed),false);
 const clash=planSeeds(2,'round');
 clash.stageA=[100100];
 assert.throws(()=>assertPlanLegal(clash,ledger),/100100/);
 assert.throws(()=>planSeeds(31,'round'),/holdout|reserved/);
 assert.equal(expectedCounts('round').stageA,192);
 assert.equal(expectedCounts('round').stageB,288);
 assert.equal(expectedCounts('round').stageC,840);
 assert.equal(expectedCounts('smoke').stageA,16);
 assert.equal(expectedCounts('smoke').stageC,0);
 assert.equal(CODE_VERSION,'v4a-1');
 assert.equal(PROMOTION.pairedDelta,0.05);
});
function seedList(plan){
 return [...plan.probe,...plan.stageA,...plan.stageB,...plan.stageCPaired,...plan.stageCMirror];
}

test('match plans have the registered counts and no hidden deck order',()=>{
 const candidates=proposal().candidates;
 const champion={id:'v2',model:parent,label:'v2'};
 const historicalSeat={id:'v2-origin',model:parent,same:true};
 const specs=buildStageSpecs({
  stage:'stage-a',round:1,candidates,champion,historical:historicalSeat,
  seeds:[100100],cells:4,opponents:['champion','historical','hard-white','hard-reject','hard-renruki','peer']
 });
 assert.equal(specs.length,192);
 assert.equal(buildStageCSpecs({
  round:1,challenger:candidates[0],champion,pairedSeeds:Array.from({length:30},(_,i)=>100400+i),
  mirrorSeeds:Array.from({length:30},(_,i)=>100500+i),
  decks:['white-sword','reject-blue','renruki'],cells:4
 }).length,840);
 assert.equal(specs[0].seats[0].hardCap,7);
 assert.equal(specs[0].seats[0].explore,0);
 assert.equal('counts' in specs[0],false);
 assert.equal(JSON.stringify(specs),JSON.stringify(buildStageSpecs({
  stage:'stage-a',round:1,candidates,champion,historical:historicalSeat,
  seeds:[100100],cells:4,opponents:['champion','historical','hard-white','hard-reject','hard-renruki','peer']
 })));
});

test('screen, rank and the experimental gate use the pre-registered rules',()=>{
 const ids=['a','b','c','d'];
 const games=[];
 for(const [index,id] of ids.entries()){
  for(let n=0;n<24;n++)games.push({
   candidateId:id,status:'finished',winner:index===3?(n<2?0:1):0,specialistSeat:0,
   opponentKind:n<4?'historical':n<16?'hard-white':'champion',historicalSame:n<4,anomalies:{...clean}
  });
 }
 games.push({candidateId:'a',status:'finished',winner:null,specialistSeat:0,opponentKind:'peer',anomalies:{...clean,illegal:1}});
 const screened=screenCandidates(games,ids.map(id=>({id})),{floor:true});
 assert.deepEqual(screened.eliminated.map(row=>row.id),['a','d']);
 const ranked=rankCandidates([
  {candidateId:'c',status:'finished',winner:0,specialistSeat:0,opponentKind:'hard-white',anomalies:{...clean}},
  {candidateId:'b',status:'finished',winner:0,specialistSeat:0,opponentKind:'hard-white',anomalies:{...clean}},
  {candidateId:'b',status:'finished',winner:0,specialistSeat:0,opponentKind:'hard-reject',anomalies:{...clean}}
 ],['c','b']);
 assert.equal(ranked[0].id,'b');
 const passed=judgeExperimental({
  profile:'round',
  paired:{n:360,delta:0.08,ci:{low:0.01,high:0.12}},
  mirror:{n:120,p:0.64,low:0.55,wins:77},
  decks:[{id:'white-sword',delta:0.02},{id:'reject-blue',delta:0},{id:'renruki',delta:-0.02}],
  anomalies:{illegal:0,leak:0,fallback:0,timeout:0,deadLoop:0,engineError:0,opponentFallback:0,unfinished:0}
 });
 assert.equal(passed.promoted,true);
 assert.equal(passed.production,false);
 assert.equal(judgeExperimental({profile:'round',paired:{n:360,delta:0.04,ci:{low:0.01,high:0.08}},mirror:{n:120,p:0.64,low:0.55},decks:[],anomalies:{}}).promoted,false);
 assert.equal(judgeExperimental({profile:'round',paired:{n:360,delta:0.08,ci:{low:-0.01,high:0.1}},mirror:{n:120,p:0.64,low:0.55},decks:[],anomalies:{}}).promoted,false);
 assert.equal(judgeExperimental({profile:'round',paired:{n:360,delta:0.08,ci:{low:0.01,high:0.1}},mirror:{n:120,p:0.64,low:0.49},decks:[],anomalies:{}}).promoted,false);
 assert.equal(judgeExperimental({profile:'round',paired:{n:360,delta:0.08,ci:{low:0.01,high:0.1}},mirror:{n:120,p:0.64,low:0.55},decks:[{id:'renruki',delta:-0.04}],anomalies:{}}).promoted,false);
 assert.equal(judgeExperimental({profile:'round',paired:{n:360,delta:0.2,ci:{low:0.1,high:0.3}},mirror:{n:120,p:0.8,low:0.7},decks:[],anomalies:{illegal:1,unfinished:0}}).promoted,false);
 assert.equal(judgeExperimental({profile:'smoke',paired:{n:360,delta:0.2,ci:{low:0.1,high:0.2}},mirror:{n:120,p:0.8,low:0.7},decks:[],anomalies:{}}).promoted,false);
 const pairs=Array.from({length:20},(_,seed)=>({seed,challengerWin:1,championWin:0}));
 const first=clusterBootstrap(pairs,{samples:200,seed:7});
 const second=clusterBootstrap(pairs,{samples:200,seed:7});
 assert.deepEqual(first,second);
 assert.ok(first.ci.low>0);
 assert.equal(summarizeDisagreement([
  {band:2,choices:{a:'attack',b:'next'}},
  {band:2,choices:{a:'attack',b:'attack'}}
 ]).rate,0.5);
});

test('reports require measured games and production weights stay read-only',()=>{
 assert.throws(()=>renderRound({games:null,round:1}),/對戰場數/);
 const text=renderRound({
  profile:'round',round:5,games:8400,cumulativeGames:8400,candidateCount:8,screenKept:3,
  challengerId:'v4a-r0005-c0',championLabel:'v2',paired:{delta:0.05,ci:{low:0.01,high:0.09}},
  promoted:false,nextDirection:'自動產生',candidates:[],probe:{positions:4,disagreed:2,rate:0.5,examples:[]},
  stageAGames:192,stageBGames:288,stageCGames:840,seeds:{probe:[1],stageA:[2],stageB:[3],stageCPaired:[],stageCMirror:[]},
  judgment:{reasons:['配對勝率差未達 +5 個百分點']},codeVersion:'v4a-1',historicalNote:'歷代實驗冠軍尚未出現'
 });
 assert.match(text,/第 5 輪/);
 assert.match(text,/8,400|8400/);
 assert.match(text,/通過初選：3 個/);
 assert.match(text,/\+5\.0%/);
 assert.match(text,/是否通過晉級：否/);
 assert.match(text,/自動產生/);
 assert.match(renderHistory([{profile:'round',round:1,games:10,cumulativeGames:10,probe:{rate:0.5},paired:null,promoted:false,championLabel:'v2'}]),/第|1/);
 assert.throws(()=>assertWritable(V2_FILE),/production|official|v2/i);
 const source=readdirSync(new URL('../training/white-sword-ai/v4a/lib/',import.meta.url))
  .filter(name=>name.endsWith('.mjs'))
  .map(name=>readFileSync(new URL('../training/white-sword-ai/v4a/lib/'+name,import.meta.url),'utf8'))
  .join('\n');
 assert.equal(source.includes('updateModel'),false);
 assert.equal(source.includes("from '../../../../dist/universal-v2/ai.mjs'"),false);
 assert.equal(readFileSync(new URL('../dist/universal-v2/white-sword-ai/index.mjs',import.meta.url),'utf8').includes('v4a'),false);
 assert.equal(readFileSync(new URL('../.github/workflows/white-sword-v4-evolution.yml',import.meta.url),'utf8').includes('schedule:'),false);
});

test('smoke closes the loop without promoting or replaying finished work',async()=>{
 const before=v2Hash();
 const run=await evolve('smoke',0);
 assert.equal(run.report.status,'complete');
 assert.equal(run.report.promoted,false);
 assert.equal(run.report.games,18);
 assert.equal(run.report.candidateCount,8);
 assert.equal(run.calls.length,2);
 assert.equal(policyHash(loadModel(join(run.root,'champion/current.json')).policy),policyHash(parent.policy));
 assert.equal(loadModel(join(run.root,'champion/current.json')).v4a.production,false);
 const again=await runRound({
  profile:'smoke',round:0,root:run.root,docsRoot:run.docs,playMany(){throw Error('should resume');},
  probe(){throw Error('should reuse probe');},replayMatches(){throw Error('should reuse replay');},log(){}
 });
 assert.equal(again.games,18);
 assert.equal(v2Hash(),before);
 rmSync(run.root,{recursive:true,force:true});
});

test('a legal but unimproved round keeps the v2 champion',async()=>{
 const before=hashes();
 const run=await evolve('round',1);
 assert.equal(run.report.promoted,false);
 assert.equal(run.report.games,192+288+840);
 assert.equal(run.report.paired.n,360);
 assert.equal(run.report.paired.delta,0);
 assert.ok(run.report.paired.ci.low<=0);
 assert.equal(run.report.mirror.n,120);
 assert.equal(policyHash(loadModel(join(run.root,'champion/current.json')).policy),policyHash(parent.policy));
 assert.equal(nextRoundNumber(run.root).round,2);
 assert.match(readFileSync(join(run.docs,'round-0001.md'),'utf8'),/是否通過晉級：否/);
 assert.deepEqual(hashes(),before);
 rmSync(run.root,{recursive:true,force:true});
});

test('an improving fake round becomes an experimental champion only',async()=>{
 const before=v2Hash();
 const run=await evolve('round',1,spec=>spec.role==='baseline'?{winner:1-spec.specialistSeat}:{winner:spec.specialistSeat});
 assert.equal(run.report.promoted,true);
 assert.equal(run.report.production,false);
 assert.equal(run.report.deployed,false);
 assert.ok(run.report.paired.delta>=0.05);
 assert.ok(run.report.paired.ci.low>0);
 const champion=loadModel(join(run.root,'champion/current.json'));
 assert.equal(champion.promoted,false);
 assert.equal(champion.v4a.production,false);
 assert.equal(champion.v4a.deployed,false);
 assert.equal(champion.version,run.report.experimentalChampion);
 assert.notEqual(policyHash(champion.policy),policyHash(parent.policy));
 assert.equal(v2Hash(),before);
 rmSync(run.root,{recursive:true,force:true});
});

test('illegal play stops the round before later stages',async()=>{
 const run=await evolve('round',1,spec=>spec.candidateId.includes('-c0-')?{anomalies:{...clean,illegal:1},winner:null}:{});
 assert.equal(run.report.status,'stopped');
 assert.equal(run.report.promoted,false);
 assert.deepEqual(run.calls,['stage-a']);
 assert.equal(policyHash(loadModel(join(run.root,'champion/current.json')).policy),policyHash(parent.policy));
 assert.throws(()=>nextRoundNumber(run.root),/安全停止/);
 rmSync(run.root,{recursive:true,force:true});
});

test('zero disagreement triggers one bounded regeneration',async()=>{
 let probes=0;
 const dir=workspace();
 const running=play();
 const report=await runRound({
  profile:'smoke',round:0,root:dir.root,docsRoot:dir.docs,playMany:running.playMany,replayMatches:replayOk,log(){},
  probe:async()=>{
   probes++;
   return probes===1
    ?{positions:3,disagreed:0,rate:0,examples:[],fallbackIds:[]}
    :{positions:3,disagreed:1,rate:1/3,examples:[],fallbackIds:[]};
  }
 });
 assert.equal(probes,2);
 assert.equal(report.probe.regenerated,true);
 assert.equal(report.probe.rate,1/3);
 assert.equal(report.promoted,false);
 rmSync(dir.root,{recursive:true,force:true});
});

test('workflow file is manual and does not schedule or deploy',()=>{
 const text=readFileSync(new URL('../.github/workflows/white-sword-v4-evolution.yml',import.meta.url),'utf8');
 assert.match(text,/workflow_dispatch:/);
 assert.equal(text.includes('schedule:'),false);
 assert.equal(text.includes('cloudflare'),false);
 assert.match(text,/white-sword-v4a/);
});
