import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {planRound8} from '../training/white-sword-nn/budget.mjs';
import {
 PLAN_SAFETY,ROUND8_BENCH_SEED,ROUND8_CANDIDATE_HASH,ROUND8_CANDIDATE_UPDATES,ROUND8_CANDIDATE_VERSION,
 ROUND8_EVAL_COUNT,ROUND8_EVAL_START,ROUND8_SEED_CAP,V2_FILE_HASH
} from '../training/white-sword-nn/constants.mjs';
import {createNet} from '../training/white-sword-nn/net.mjs';
import {officialHardOptions,playMatch} from '../training/white-sword-nn/play.mjs';
import {INIT_SEED} from '../training/white-sword-nn/constants.mjs';
import {splitForSeed} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {HARD_OPTIONS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {
 ROUND7_CONFIRM_SEEDS,ROUND8_DECKS,ROUND8_EVAL_SEEDS,ROUND8_RULE,allExperimentSeeds,
 assertExperimentSeed,reservedHit,round8Schedule
} from '../training/white-sword-nn/protocol.mjs';
import {
 answerRound8Champion,answerRound8Direct,answerRound8Next,answerRound8Paired,classifyChampion,
 equalDeckDiff,judgeDirect,judgePaired,seedValueInterval
} from '../training/white-sword-nn/report.mjs';

test('round-8 seeds are new and the schedule keeps the two comparisons apart',()=>{
 assert.equal(ROUND8_EVAL_SEEDS.length,ROUND8_EVAL_COUNT);
 assert.equal(ROUND8_EVAL_SEEDS[0],ROUND8_EVAL_START);
 assert.equal(ROUND8_EVAL_SEEDS.at(-1),ROUND8_EVAL_START+ROUND8_EVAL_COUNT-1);
 assert.equal(ROUND8_BENCH_SEED,193400);
 assert.equal(ROUND8_EVAL_SEEDS.includes(ROUND8_BENCH_SEED),false);
 for(const seed of [ROUND8_BENCH_SEED,...ROUND8_EVAL_SEEDS]){
  assert.equal(splitForSeed(seed),'unassigned');
  assert.equal(reservedHit(seed),null);
  assert.equal(ROUND7_CONFIRM_SEEDS.includes(seed),false);
  assertExperimentSeed(seed);
 }
 assertExperimentSeed(ROUND8_BENCH_SEED,'round8-bench');
 assertExperimentSeed(ROUND8_EVAL_SEEDS[0],'round8-eval');
 assert.throws(()=>assertExperimentSeed(ROUND8_BENCH_SEED,'round8-eval'));
 assert.throws(()=>assertExperimentSeed(ROUND8_EVAL_SEEDS[0],'round8-bench'));
 assert.throws(()=>assertExperimentSeed(191400,'round8-eval'));
 assert.throws(()=>assertExperimentSeed(192800,'round8-eval'));
 assert.throws(()=>assertExperimentSeed(193000,'round8-eval'));
 const listed=allExperimentSeeds();
 assert.equal(new Set(listed).size,listed.length);
 const rows=round8Schedule(ROUND8_EVAL_SEEDS.slice(0,2));
 assert.equal(rows.length,56);
 assert.equal(rows.filter(row=>row.comparison==='direct').length,8);
 assert.equal(rows.filter(row=>row.comparison==='shared').length,48);
 assert.equal(rows.filter(row=>row.comparison==='direct'&&row.deck!=='white-sword').length,0);
 assert.equal(rows.filter(row=>row.model==='v2'&&row.opponent!=='hard').length,0);
 assert.deepEqual([...new Set(rows.filter(row=>row.opponent==='hard').map(row=>row.deck))],ROUND8_DECKS.map(deck=>deck.id));
 assert.match(ROUND8_RULE,/A 不是正式 v2/);
 assert.match(ROUND8_RULE,/不事後追加場次/);
 assert.match(ROUND8_RULE,/judgeChampion/);
});

test('the sample locks from measured time and the readings stay separate',()=>{
 const open=planRound8({wallMs:1e15,gameMs:1000,workers:2,gamesPerSeed:28});
 assert.equal(open.fits,true);
 assert.equal(open.seeds,ROUND8_SEED_CAP);
 assert.equal(open.games,896);
 assert.equal(open.safety,PLAN_SAFETY);
 const none=planRound8({wallMs:1000,gameMs:5000,workers:1,gamesPerSeed:28});
 assert.equal(none.fits,false);
 assert.equal(none.seeds,0);
 const mid=planRound8({wallMs:40000,gameMs:1000,workers:2,gamesPerSeed:28});
 assert.equal(mid.seeds,2);
 assert.equal(mid.games,56);
 const source=readFileSync(new URL('../training/white-sword-nn/budget.mjs',import.meta.url),'utf8');
 const body=source.slice(source.indexOf('export function planRound8'));
 assert.equal(body.includes('勝'),false);
 assert.equal(equalDeckDiff([1,0,-1]),0);
 assert.equal(equalDeckDiff([1,0]),null);
 const rates=seedValueInterval([{seed:1,value:0.75},{seed:2,value:0.75}]);
 assert.equal(judgeDirect(rates).kind,'better');
 assert.equal(judgeDirect(seedValueInterval([{seed:1,value:0.25},{seed:2,value:0.25}])).kind,'worse');
 assert.equal(judgeDirect(seedValueInterval([{seed:1,value:0.25},{seed:2,value:0.75}])).kind,'not-confirmed');
 assert.equal(judgePaired(seedValueInterval([{seed:1,value:0.25},{seed:2,value:0.25}])).kind,'better');
 assert.equal(judgePaired(seedValueInterval([{seed:1,value:-0.25},{seed:2,value:-0.25}])).kind,'worse');
 assert.equal(judgePaired(seedValueInterval([{seed:1,value:-0.25},{seed:2,value:0.25}])).kind,'not-confirmed');
 assert.match(answerRound8Direct(judgeDirect(rates)),/有優於正式 v2 的直接對戰證據/);
 assert.match(answerRound8Direct(judgeDirect(seedValueInterval([{seed:1,value:0.5},{seed:2,value:0.75}]))),/不追加場次/);
 assert.match(answerRound8Paired(judgePaired(seedValueInterval([{seed:1,value:-0.1},{seed:2,value:0.2}]))),/證據不足/);
 assert.equal(classifyChampion({promoted:true,reasons:[],complete:true}),'promoted');
 assert.equal(classifyChampion({promoted:false,reasons:['總勝率未達 60%'],overall:{p:0.55,high:0.7},complete:true}),'strength');
 assert.equal(classifyChampion({promoted:false,reasons:['已完成的基準對局少於 200'],overall:{p:0.7,low:0.6,high:0.8},nonMirror:{low:0.55,high:0.8},complete:true}),'evidence');
 assert.equal(classifyChampion({promoted:true,complete:false}),'invalid');
 assert.match(answerRound8Champion('promoted',{reasons:[]}),/不等於直接打贏正式 v2/);
 assert.match(answerRound8Champion('strength',{reasons:['總勝率未達 60%']}),/棋力不足/);
 assert.match(answerRound8Champion('evidence',{reasons:['已完成的基準對局少於 200']}),/證據不足/);
 assert.match(answerRound8Next({complete:false}),/不追加場次/);
 assert.match(answerRound8Next({complete:true,direct:'not-confirmed',paired:'not-confirmed',championClass:'evidence'}),/不把未顯著的結果解釋成應追加場次/);
});

test('hard search can play another designated deck',{timeout:120000},()=>{
 const options=officialHardOptions(188050);
 assert.equal(options.nodes,HARD_OPTIONS.nodes);
 assert.equal(options.nodes,48);
 assert.equal('ms' in options,false);
 const net=createNet(INIT_SEED);
 const game=playMatch({
  seed:188050,first:0,mode:'eval',maxSteps:2,progress:false,learnerSeat:1,
  comparison:'shared',model:'candidate',opponent:'hard',deck:'reject-blue',
  seats:[
   {deckId:'reject-blue',kind:'hard',explore:0},
   {deckId:'white-sword',kind:'nn',explore:0,policy:'greedy'}
  ],
  nets:[null,net],recordSeats:[],teacherSeats:[]
 });
 assert.equal(game.anomalies.engineError,0);
 assert.equal(game.anomalies.illegal,0);
 assert.equal(game.anomalies.leak,0);
 assert.equal(game.steps,2);
 assert.ok(game.policies['hard-search-2']>0);
 assert.equal(game.policies.blend||0,0);
 assert.equal(game.seats[0].deckId,'reject-blue');
 assert.equal(game.deck,'reject-blue');
});

test('the frozen files and the round-8 runner stay on the official calls',()=>{
 const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
 assert.equal(hash('training/white-sword-nn/weights/round6/line-2/actor-after-96.json'),ROUND8_CANDIDATE_HASH);
 assert.equal(hash('training/white-sword-ai/weights/v2-capped.json'),V2_FILE_HASH);
 assert.equal(ROUND8_CANDIDATE_VERSION,'nn-ppo-actor-r6-l2');
 assert.equal(ROUND8_CANDIDATE_UPDATES,27546);
 const source=readFileSync(new URL('../scripts/white-sword-nn-round8.mjs',import.meta.url),'utf8');
 assert.match(source,/v2-capped\.json/);
 assert.match(source,/line-2\/actor-after-96/);
 assert.match(source,/BLEND_TIMEOUT_MS/);
 assert.match(source,/HARD_OPTIONS/);
 assert.equal(source.includes('a-frozen'),false);
 assert.equal(source.includes('saveNet'),false);
 assert.equal(source.includes('selectCheckpoint'),false);
 assert.equal(source.includes('line-0'),false);
 assert.equal(source.includes('line-1'),false);
 assert.equal(source.includes('070'),false);
});
