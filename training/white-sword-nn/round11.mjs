// Round 11 retrains an imitation start from frozen A.
// The teacher is frozen official v2. Round 10's endpoint is not a teacher
// and is not the initial weights. Holdout scores do not choose another run.
import {IMITATE_LR,LABEL_SMOOTH,ROUND7_BASELINE_HASH,ROUND8_CANDIDATE_HASH,ROUND8_CANDIDATE_UPDATES,ROUND8_CANDIDATE_VERSION,WALL_MS} from './constants.mjs';
import {provenUidEquivalent} from './agree.mjs';
import {pairedDelta,tCritical} from './cluster.mjs';
import {sameVector} from './encode.mjs';
import {shuffle} from './learn.mjs';
import {
 checkedRegression,equivalentBlockIndices,isBlock,isPass,publicLethalKept,scoresIdentical
} from './round10.mjs';
import {IMITATE_SEEDS,SELF_SEEDS,holdoutSplit} from './protocol.mjs';

export const ROUND11_A_FILE='training/white-sword-nn/weights/round2/a-frozen.json';
export const ROUND11_B_FILE='training/white-sword-nn/weights/round6/line-2/actor-after-96.json';
export const ROUND11_V2_FILE='training/white-sword-ai/weights/v2-capped.json';
export const ROUND11_R10_FILE='training/white-sword-nn/weights/round10/actor-block-endpoint.json';
export const ROUND11_ZERO_FILE='training/white-sword-nn/weights/round11/actor-imitate-0.json';
export const ROUND11_ENDPOINT_FILE='training/white-sword-nn/weights/round11/actor-imitate-endpoint.json';
export const ROUND11_PLAN_FILE='docs/white-sword-ai/nn-round11-plan.json';
export const ROUND11_SPLIT_FILE='docs/white-sword-ai/nn-round11-split.json';
export const ROUND11_RESULT_FILE='docs/white-sword-ai/nn-round11-results.json';
export const ROUND11_REPORT_FILE='docs/white-sword-ai/NN-ROUND11.md';
export const ROUND11_A_HASH=ROUND7_BASELINE_HASH;
export const ROUND11_B_HASH=ROUND8_CANDIDATE_HASH;
export const ROUND11_B_VERSION=ROUND8_CANDIDATE_VERSION;
export const ROUND11_B_UPDATES=ROUND8_CANDIDATE_UPDATES;
export const ROUND11_VERSION_ZERO='nn-imitate-r11-0';
export const ROUND11_VERSION_ENDPOINT='nn-imitate-r11';
export const ROUND11_LR=IMITATE_LR;
export const ROUND11_SMOOTH=LABEL_SMOOTH;
export const ROUND11_WALL_MS=WALL_MS;
export const ROUND11_SAFETY=1.4;
export const ROUND11_EPOCH_CHOICES=Object.freeze([3,6,9,12]);
export const ROUND11_DRAW_SEED=188544;
export const ROUND11_BENCH_SEED=188501;
export const MIN_UNSEEN_TRAIN=8;
export const TYPE_WEIGHTS=Object.freeze({play:1,attack:1,block:1,trigger:1,effect:1,other:1});
export const ROUND11_FROZEN_FILES=Object.freeze([
 ROUND11_A_FILE,ROUND11_B_FILE,ROUND11_V2_FILE,ROUND11_R10_FILE,
 'training/white-sword-nn/weights/round10/actor-block-0.json'
]);
export const ROUND11_PROTECTION=Object.freeze([
 Object.freeze({seed:193501,learnerSeat:0,first:0,winner:1,steps:101}),
 Object.freeze({seed:193502,learnerSeat:0,first:0,winner:1,steps:105}),
 Object.freeze({seed:193501,learnerSeat:0,first:1,winner:1,steps:156}),
 Object.freeze({seed:193502,learnerSeat:0,first:1,winner:1,steps:172}),
 Object.freeze({seed:193500,learnerSeat:1,first:0,winner:0,steps:210}),
 Object.freeze({seed:193502,learnerSeat:1,first:0,winner:0,steps:120}),
 Object.freeze({seed:193500,learnerSeat:1,first:1,winner:0,steps:203}),
 Object.freeze({seed:193501,learnerSeat:1,first:1,winner:0,steps:107})
]);
export const ROUND11_STATS='保留組的每個原始種子先把該種子全部非強制決策的精確教師一致率算成一個比例，再減去 A 在同種子的比例。95% 區間沿用 pairedDelta：樣本標準差用 n-1，除以種子數的平方根，臨界值用 tCritical。種子數大於 30 時臨界值是 1.96。區間不截斷到 [0,1]。下限高於 0 才算整體改善。精確一致不把只差 uid、只差卡號，或沒有公開快照證明的動作算進去。';
export const ROUND11_CRITERIA=Object.freeze([
 '保留資料的整體精確教師一致率相對 A 改善，配對差的 95% 區間下限高於 0。',
 '阻擋的精確一致改善出現在至少兩個不同的原始種子，而且不能只靠第 118 步。',
 '終點沒有新增已核對的明顯戰術錯誤。非法動作算錯誤。已保持的較高 BP 阻擋，在公開傷害不少於生命且 impact 為 0 時，終點不得改成不擋，也不得改成公開 BP 不高於攻擊者的阻擋。A 原本就有的同樣錯誤不算新增。',
 '其他決策類型的退步逐類列出樣本數與一致率。列出本身是條件。退步不會被損失下降、訓練一致率或權重距離抵消。',
 '四條都成立只支持模仿起點改善。它不證明對局變強，也不放寬晉級標準。'
]);

const CLEAN=holdoutSplit([...IMITATE_SEEDS]);
export const A_SEEN_SEEDS=Object.freeze(CLEAN.train);
export const A_UNSEEN_SEEDS=Object.freeze(CLEAN.holdout);

export function assertWritable(file){
 if(ROUND11_FROZEN_FILES.includes(file))throw Error('Refusing to write a frozen weight');
}
export function round11Rng(seed=ROUND11_DRAW_SEED){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
export function decisionKind(action){
 const type=action?.type||'';
 if(type==='play')return 'play';
 if(type==='attack')return 'attack';
 if(type==='chooseBlock')return 'block';
 if(type==='chooseTrigger')return 'trigger';
 if(type==='activate'||type.startsWith('choose'))return 'effect';
 return 'other';
}
export function teacherLabel(sample){
 if(!sample||sample.labeledByUniversalRule===true||sample.hiddenLifeUsed===true)return null;
 if(Array.isArray(sample.lifeCards))return null;
 if(!Number.isInteger(sample.chosen))return null;
 if(!sample.actions||sample.chosen<0||sample.chosen>=sample.actions.length)return null;
 return sample.chosen;
}
export function blockersOf(sample){
 return (sample?.actions||[]).filter(isBlock).map(action=>
  (sample.front||[]).find(card=>card.uid===action.uid)).filter(Boolean);
}
export function splitFeatures(rows,stateDim){
 if(!rows?.length)throw Error('Decision has no actions');
 const width=rows[0].length;
 if(!(stateDim>0)||width<=stateDim)throw Error('Feature width is shorter than the state');
 const state=rows[0].slice(0,stateDim);
 const actions=[];
 for(const row of rows){
  if(row.length!==width)throw Error('Action features differ in width');
  for(let i=0;i<stateDim;i++)if(row[i]!==state[i])throw Error('Public state prefix drifted');
  actions.push(row.slice(stateDim));
 }
 return {state,actions};
}
export function auditSample(sample){
 const failures=[];
 if(!sample)return {ok:false,failures:['missing sample']};
 if(sample.synthetic===true)failures.push('synthetic position');
 if(sample.labeledByUniversalRule===true)failures.push('universal rule was used as the label');
 if(sample.hiddenLifeUsed===true||Array.isArray(sample.lifeCards))failures.push('hidden life entered the label');
 if(sample.source!=='imitate-clean'&&sample.source!=='replay-existing'&&sample.source!=='protection')
  failures.push('source is not confirmed');
 if(!Number.isInteger(sample.seed))failures.push('seed is missing');
 if(sample.first!==0&&sample.first!==1)failures.push('first player is missing');
 if(!Number.isInteger(sample.learnerSeat))failures.push('seat is missing');
 const label=teacherLabel(sample);
 if(label==null)failures.push('teacher index is outside the legal actions');
 else if(sample.actions.length<2)failures.push('forced decision');
 else if(!sample.rows||sample.rows.length!==sample.actions.length)failures.push('features do not match the legal actions');
 if(sample.pending==='block'&&!sample.attackerUid)failures.push('block has no public attacker');
 if(sample.life!=null&&typeof sample.life!=='number')failures.push('life is not a count');
 return {ok:failures.length===0,failures};
}
export function isolateSamples(samples){
 const kept=[];
 const isolated=[];
 for(const sample of samples||[]){
  const audit=auditSample(sample);
  if(audit.ok)kept.push(sample);
  else isolated.push({id:sample?.id||null,seed:sample?.seed??null,failures:audit.failures});
 }
 const leaked=isolated.some(row=>row.failures.some(item=>item.includes('hidden')));
 if(leaked){
  for(const sample of kept)isolated.push({id:sample.id,seed:sample.seed,failures:['game had a hidden-information sample']});
  return {kept:[],isolated};
 }
 return {kept,isolated};
}
function disjoint(role,list,seen){
 for(const seed of list){
  if(seen.has(seed))throw Error('Seed '+seed+' is in '+seen.get(seed)+' and '+role);
  seen.set(seed,role);
 }
}
export function corpusRoles(plan){
 const extraTrain=[...(plan?.extraTrain||[])];
 const extraHold=[...(plan?.extraHoldout||[])];
 const holdout=[...A_UNSEEN_SEEDS,...extraHold];
 let train;
 let reserve;
 if(plan?.trainSource==='unseen-prefix'){
  train=extraTrain;
  reserve=[...A_SEEN_SEEDS];
 }else if(plan?.trainSource==='a-seen-fallback'){
  train=[...A_SEEN_SEEDS,...extraTrain];
  reserve=[];
 }else throw Error('Unknown training source');
 const seen=new Map();
 disjoint('train',train,seen);
 disjoint('holdout',holdout,seen);
 disjoint('round-reserve',reserve,seen);
 for(const spec of ROUND11_PROTECTION){
  if(seen.has(spec.seed))throw Error('Protection seed '+spec.seed+' crossed into the corpus');
 }
 return {
  train:Object.freeze(train),holdout:Object.freeze(holdout),reserve:Object.freeze(reserve),
  roleOf:seed=>seen.get(seed)||null
 };
}
export function scheduleCorpus(plan){
 const roles=corpusRoles(plan);
 const games=[];
 IMITATE_SEEDS.forEach((seed,index)=>{
  const role=roles.roleOf(seed);
  if(!role)throw Error('Clean seed '+seed+' has no role');
  games.push({seed,first:index%2,source:'imitate-clean',role});
 });
 (plan.extraSeeds||[]).forEach((seed,index)=>{
  const role=roles.roleOf(seed);
  if(!role)throw Error('Extra seed '+seed+' has no role');
  games.push({seed,first:Math.floor(index/2)%2,source:'replay-existing',role});
 });
 const seeds=games.map(game=>game.seed);
 if(new Set(seeds).size!==seeds.length)throw Error('A seed was scheduled twice');
 return games;
}
export function lockPlan({
 v2Ms,workers,decisionMs,decisionsPerGame,wallMs=ROUND11_WALL_MS,extraPool=SELF_SEEDS.length
}={}){
 if(!(v2Ms>0)||!(workers>=1)||!(decisionMs>0)||!(decisionsPerGame>0))throw Error('Bench is incomplete');
 if(!Number.isInteger(extraPool)||extraPool<0||extraPool>SELF_SEEDS.length)throw Error('Extra pool is outside the existing self-play seeds');
 const safety=ROUND11_SAFETY;
 const protectionMs=ROUND11_PROTECTION.length*v2Ms*safety;
 const pool=SELF_SEEDS.slice(0,extraPool);
 let best=null;
 for(const epochs of ROUND11_EPOCH_CHOICES){
  for(let extra=0;extra<=pool.length;extra++){
   const games=IMITATE_SEEDS.length+extra;
   const replayMs=Math.ceil(games/workers)*v2Ms*safety;
   const split=holdoutSplit(pool.slice(0,extra));
   const unseenTrain=split.train.length;
   const trainGames=unseenTrain>=MIN_UNSEEN_TRAIN?unseenTrain:A_SEEN_SEEDS.length+unseenTrain;
   const trainSamples=trainGames*decisionsPerGame;
   const trainMs=epochs*trainSamples*decisionMs*safety;
   const total=protectionMs+replayMs+trainMs;
   if(total>wallMs)continue;
   if(!best||extra>best.extra||(extra===best.extra&&epochs>best.epochs))
    best={epochs,extra,total,replayMs,trainMs,protectionMs,trainSamples};
  }
 }
 if(!best)throw Error('Budget cannot hold the clean demonstrations');
 const extraSeeds=pool.slice(0,best.extra);
 const split=holdoutSplit(extraSeeds);
 const trainSource=split.train.length>=MIN_UNSEEN_TRAIN?'unseen-prefix':'a-seen-fallback';
 return {
  lr:ROUND11_LR,smooth:ROUND11_SMOOTH,epochs:best.epochs,safety,wallMs,
  weights:{...TYPE_WEIGHTS},stats:ROUND11_STATS,criteria:[...ROUND11_CRITERIA],
  drawSeed:ROUND11_DRAW_SEED,benchSeed:ROUND11_BENCH_SEED,
  extra:best.extra,extraSeeds,extraTrain:[...split.train],extraHoldout:[...split.holdout],
  trainSource,estimate:best,v2Ms,workers,decisionMs,decisionsPerGame
 };
}
export function stratifiedEpoch(samples,rng,weights=TYPE_WEIGHTS){
 const buckets=new Map();
 for(const sample of samples||[]){
  const kind=sample?.kind;
  if(!Object.prototype.hasOwnProperty.call(weights,kind))throw Error('Sample kind has no locked weight');
  if(!buckets.has(kind))buckets.set(kind,[]);
  buckets.get(kind).push(sample);
 }
 for(const [kind,list] of buckets)buckets.set(kind,shuffle(list,rng));
 const order=Object.keys(weights);
 const out=[];
 let pending=(samples||[]).length;
 while(pending){
  let moved=false;
  for(const kind of order){
   const bag=buckets.get(kind);
   const take=weights[kind]||0;
   for(let i=0;i<take&&bag?.length;i++){
    out.push(bag.pop());
    pending--;
    moved=true;
   }
  }
  if(!moved)break;
 }
 if(out.length!==(samples||[]).length)throw Error('Stratified epoch dropped or repeated a sample');
 return out;
}
export function assertTrainPool(samples,holdoutSeeds,reserveSeeds){
 const blocked=new Set([...(holdoutSeeds||[]),...(reserveSeeds||[])]);
 for(const sample of samples||[]){
  if(!Number.isInteger(sample?.seed))throw Error('Training sample has no seed');
  if(blocked.has(sample.seed))throw Error('Held seed '+sample.seed+' entered the update');
  if(sample.role&&sample.role!=='train')throw Error('Role '+sample.role+' entered the update');
 }
}
export function distribution(samples){
 const counts={};
 for(const sample of samples||[])counts[sample.kind]=(counts[sample.kind]||0)+1;
 return counts;
}
export function blockCoverage(samples){
 const rows=(samples||[]).filter(sample=>sample.kind==='block');
 const lives=new Set();
 const damages=new Set();
 const impacts=new Set();
 const bps=new Set();
 const teacherUids=new Set();
 let teacherPass=0,teacherBlock=0,multi=0;
 for(const sample of rows){
  const teacher=sample.actions[sample.chosen];
  lives.add(sample.life);
  damages.add(sample.damage);
  impacts.add(sample.impact);
  bps.add(sample.attackerBp);
  if(sample.actions.filter(isBlock).length>=2)multi++;
  if(isPass(teacher))teacherPass++;
  else if(isBlock(teacher)){
   teacherBlock++;
   teacherUids.add(teacher.uid);
  }
 }
 return {
  n:rows.length,seeds:[...new Set(rows.map(sample=>sample.seed))],
  teacherPass,teacherBlock,multi,
  lives:[...lives],damages:[...damages],impacts:[...impacts],bps:[...bps],
  teacherUids:[...teacherUids]
 };
}
export function choiceClass(sample,picked){
 if(!Number.isInteger(picked)||picked<0||picked>=sample.actions.length)return 'illegal';
 if(picked===sample.chosen)return 'exact';
 const teacher=sample.actions[sample.chosen];
 const action=sample.actions[picked];
 if(isBlock(teacher)||isBlock(action)||isPass(teacher)||isPass(action)){
  const equivalent=equivalentBlockIndices(sample.actions,blockersOf(sample),sample.chosen);
  if(equivalent.includes(picked))return 'proven';
  if(sample.rows&&sameVector(sample.rows[picked],sample.rows[sample.chosen]))return 'unproven-collision';
  return 'disagree';
 }
 const identities=new Map(sample.identities||[]);
 if(provenUidEquivalent(identities,action,teacher))return 'same-id-unproven';
 if(sample.rows&&sameVector(sample.rows[picked],sample.rows[sample.chosen]))return 'unproven-collision';
 return 'disagree';
}
export function perSeedRate(samples,pickedById){
 const groups=new Map();
 for(const sample of samples||[]){
  if(!groups.has(sample.seed))groups.set(sample.seed,{exact:0,n:0});
  const bucket=groups.get(sample.seed);
  bucket.n++;
  if(pickedById.get(sample.id)===sample.chosen)bucket.exact++;
 }
 return [...groups].map(([seed,bucket])=>({
  seed,n:bucket.n,p:bucket.n?bucket.exact/bucket.n:null
 }));
}
export function improvedSeeds(beforeRates,afterRates){
 const after=new Map((afterRates||[]).map(row=>[row.seed,row]));
 const seeds=[];
 for(const row of beforeRates||[]){
  const next=after.get(row.seed);
  if(!next||row.n!==next.n||!(row.n>0))continue;
  if(next.p-row.p>1e-12)seeds.push(row.seed);
 }
 return seeds;
}
export function kindTable(samples,pickedById){
 return ['play','attack','block','trigger','effect','other'].map(kind=>{
  const rows=(samples||[]).filter(sample=>sample.kind===kind);
  const exact=rows.filter(sample=>pickedById.get(sample.id)===sample.chosen).length;
  return {kind,used:rows.length,exact,rate:rows.length?exact/rows.length:null};
 });
}
export function regressions(before,after){
 const next=new Map((after||[]).map(row=>[row.kind,row]));
 return (before||[]).filter(row=>{
  const other=next.get(row.kind);
  return row.used>0&&other&&other.rate<row.rate-1e-12;
 }).map(row=>{
  const other=next.get(row.kind);
  return {kind:row.kind,used:row.used,before:row.rate,after:other.rate,beforeExact:row.exact,afterExact:other.exact};
 });
}
export function blockBehavior(samples,beforeById,afterById){
 let teacherPass=0,beforePass=0,afterPass=0;
 let teacherBlock=0,beforeExact=0,afterExact=0,beforeAny=0,afterAny=0,multi=0;
 const teacherUids=new Set();
 for(const sample of samples||[]){
  if(sample.kind!=='block')continue;
  const teacher=sample.actions[sample.chosen];
  const before=sample.actions[beforeById.get(sample.id)];
  const after=sample.actions[afterById.get(sample.id)];
  if(sample.actions.filter(isBlock).length>=2)multi++;
  if(isPass(teacher)){
   teacherPass++;
   if(isPass(before))beforePass++;
   if(isPass(after))afterPass++;
  }else if(isBlock(teacher)){
   teacherBlock++;
   teacherUids.add(teacher.uid);
   if(isBlock(before))beforeAny++;
   if(isBlock(after))afterAny++;
   if(beforeById.get(sample.id)===sample.chosen)beforeExact++;
   if(afterById.get(sample.id)===sample.chosen)afterExact++;
  }
 }
 return {
  teacherPass,beforePass,afterPass,teacherBlock,beforeExact,afterExact,beforeAny,afterAny,multi,
  teacherUids:[...teacherUids]
 };
}
export function gainCounts(samples,beforeById,afterById){
 let decisions=0,step118=0;
 for(const sample of samples||[]){
  if(sample.kind!=='block')continue;
  const before=beforeById.get(sample.id);
  const after=afterById.get(sample.id);
  if(before===sample.chosen||after!==sample.chosen)continue;
  decisions++;
  if(sample.seed===193502&&sample.step===118)step118++;
 }
 return {decisions,step118};
}
export function newObviousErrors(rows){
 const out=[];
 for(const row of rows||[]){
  const endpointError=checkedRegression(row,row.endpointIndex);
  const baseError=checkedRegression(row,row.aIndex);
  if(endpointError&&!baseError)out.push({id:row.id||null,seed:row.seed,step:row.step,error:endpointError});
 }
 return out;
}
export function seedPaired(beforeRates,afterRates){
 return pairedDelta(beforeRates,afterRates);
}
export function judgeRound11(summary){
 const paired=summary?.paired||{};
 const agreement=paired.seeds>=2&&paired.low>0;
 const step118Only=(summary.blockGainDecisions||0)>0&&summary.blockGainDecisions===summary.step118Gains;
 const blockOk=(summary.blockImprovedSeeds||[]).length>=2&&!step118Only;
 const errorsOk=summary.protectionComplete===true&&(summary.newObviousErrors||[]).length===0;
 const disclosed=summary.regressionsDisclosed===true;
 const passed=agreement&&blockOk&&errorsOk&&disclosed;
 const wide=paired.seeds>=2&&paired.low!=null&&paired.high!=null&&paired.low<=0&&paired.high>0;
 const negative=paired.seeds>=2&&paired.high!=null&&paired.high<=0;
 const thin=(summary.holdoutSeeds||0)<2||(summary.blockSeeds||0)<2;
 let verdict='本輪模仿起點改善未成立';
 if(passed)verdict='模仿起點改善成立';
 else if(!negative&&(wide||thin||summary.protectionComplete!==true))verdict='證據不足';
 return {
  passed,agreement,blockOk,errorsOk,disclosed,recommend:passed,verdict,
  insufficient:verdict==='證據不足',negative,wide,t:tCritical(paired.seeds||0)
 };
}
function percent(rate){
 return Number.isFinite(rate)?(rate*100).toFixed(1)+'%':'沒有樣本';
}
function intervalText(row){
 if(!row||row.low==null)return '沒有配對區間';
 return (row.mean*100).toFixed(1)+' 個百分點（'+(row.low*100).toFixed(1)+' 到 '+(row.high*100).toFixed(1)+'，'+row.seeds+' 個種子）';
}
export function explainRound11(summary){
 const judged=judgeRound11(summary);
 const paired=summary.paired||{};
 let q1='保留種子少於 2，無法做種子配對。';
 if(judged.agreement)
  q1='有。未參與本輪更新的保留種子，精確教師一致率相對 A 的配對差是 '+intervalText(paired)+'。下限高於 0。這些種子仍是既有開發資料，不是新的獨立棋力測試。';
 else if(judged.wide)
  q1='證據不足。配對差是 '+intervalText(paired)+'，區間包含 0。沒有再加輪數。';
 else if(judged.negative)
  q1='沒有。配對差是 '+intervalText(paired)+'，區間不高於 0。';
 else if(paired.seeds>=2)
  q1='沒有確立。配對差是 '+intervalText(paired)+'。';
 const block=summary.block||{};
 const passBefore=block.teacherPass?block.beforePass/block.teacherPass:null;
 const passAfter=block.teacherPass?block.afterPass/block.teacherPass:null;
 const exactBefore=block.teacherBlock?block.beforeExact/block.teacherBlock:null;
 const exactAfter=block.teacherBlock?block.afterExact/block.teacherBlock:null;
 let q2='保留組沒有足夠的阻擋決策，不能說學會區分情境或阻擋者。';
 if(block.teacherPass>0&&block.teacherBlock>0){
  const passDropped=passAfter+1e-12<passBefore;
  const anyUp=(block.afterAny||0)>(block.beforeAny||0);
  const exactUp=exactAfter>exactBefore+1e-12;
  const many=(summary.blockImprovedSeeds||[]).length>=2;
  if(passDropped&&anyUp)
   q2='沒有。教師不擋的保持率從 '+percent(passBefore)+' 降到 '+percent(passAfter)+'，同時教師有擋時的任意阻擋從 '+(block.beforeAny||0)+' 增到 '+(block.afterAny||0)+'。這是更常擋，不是把情境分開。教師阻擋者的精確一致是 '+percent(exactBefore)+' 到 '+percent(exactAfter)+'。';
  else if(exactUp&&many&&!passDropped)
   q2='有向教師的選擇靠近。'+((summary.blockImprovedSeeds||[]).length)+' 個不同原始種子的阻擋精確一致上升，教師不擋的保持率沒有下降（'+percent(passBefore)+' 到 '+percent(passAfter)+'）。教師指定阻擋者的精確一致從 '+percent(exactBefore)+' 到 '+percent(exactAfter)+'。這是教師行為，不是從生命或 BP 推出的規則，也不是效果等價的證明。';
  else
   q2='沒有確立。教師不擋 '+block.teacherPass+' 筆，保持率 '+percent(passBefore)+' 到 '+percent(passAfter)+'。教師有擋 '+block.teacherBlock+' 筆，阻擋者精確一致 '+percent(exactBefore)+' 到 '+percent(exactAfter)+'。改善的原始種子 '+((summary.blockImprovedSeeds||[]).length)+' 個。';
 }
 const dropped=summary.regressions||[];
 const dropText=dropped.length?dropped.map(row=>row.kind+' '+row.used+' 筆，'+percent(row.before)+' 到 '+percent(row.after)).join('；'):'沒有類型的精確一致率下降';
 const q3=judged.passed?
  (dropped.length?
   '有退步：'+dropText+'。事先要求完整揭露，不要求零退步。這份代價可以留在模仿候選裡，日後的對局評估要分開看這些類型。它不是棋力證明。':
   '沒有其他類型的精確一致率下降。這個代價可以接受為模仿結果，仍然不是對局變強。'):
  '不接受這份終點。'+dropText+'。整批訓練損失、訓練一致率和權重距離都不是通過依據。';
 const q4=judged.recommend?
  '值得凍結這份終點，並另行登記對局評估。這一輪沒有對局結果，不能說它變強，也不能拿去晉級或部署。':
  '不值得。不把這份終點登記成對局候選，也不啟動對局評估。';
 return {q1,q2,q3,q4,verdict:judged.verdict,recommend:judged.recommend,passed:judged.passed};
}
export function renderRound11(result){
 const answers=result.answers||{};
 const lines=[
  '# 白劍神經網路第十一輪',
  '',
  '產生時間：'+result.createdAtText+'。',
  '',
  '接受第十輪：局部修正未成立，該終點不採用，也不送對局評估。這一輪從凍結 A 另建副本，用既有多局面的教師示範做一次完整模仿。沒有新種子、沒有新特徵、沒有換架構，也沒有重開 v4–v7。',
  '',
  '判定：'+result.verdict+'。',
  '',
  '## 四個問題',
  '',
  '① '+answers.q1,
  '',
  '② '+answers.q2,
  '',
  '③ '+answers.q3,
  '',
  '④ '+answers.q4,
  '',
  '## 凍結與零更新',
  '',
  '起點是 `'+ROUND11_A_FILE+'`，SHA-256 更新前 '+result.hashes.beforeA+'，更新後 '+result.hashes.afterA+'。第九輪記錄的雜湊是 '+ROUND11_A_HASH+'。',
  '原 B 是 `'+ROUND11_B_FILE+'`，版本 '+ROUND11_B_VERSION+'，更新次數 '+ROUND11_B_UPDATES+'。更新前 '+result.hashes.beforeB+'，更新後 '+result.hashes.afterB+'。',
  '第十輪終點只核對雜湊，沒有拿來初始化，也沒有當教師。更新前 '+result.hashes.beforeR10+'，更新後 '+result.hashes.afterR10+'。',
  '零更新副本是 `'+ROUND11_ZERO_FILE+'`，版本 '+ROUND11_VERSION_ZERO+'，更新次數 '+result.updates.zero+'。與 A 的分數和動作一致：'+(result.zeroMatchesA?'是':'否')+'。',
  '終點是 `'+ROUND11_ENDPOINT_FILE+'`，版本 '+ROUND11_VERSION_ENDPOINT+'，更新次數 '+result.updates.endpoint+'。與 A 的參數距離 '+(result.distance??'無')+'。',
  result.scoreDivergences?'推論分數和訓練前向的最高分動作不一致 '+result.scoreDivergences+' 筆。判定採用對局會打出的推論分數。':'推論分數和訓練前向的最高分動作一致。',
  '',
  '## 固定學習',
  '',
  '學習率 '+result.plan.lr+'，標籤平滑 '+result.plan.smooth+'，完整輪數 '+result.plan.epochs+'，抽樣種子 '+result.plan.drawSeed+'。',
  '各類權重：'+Object.entries(result.plan.weights||{}).map(([kind,weight])=>kind+' '+weight).join('、')+'。每一輪每個訓練樣本剛好一次，順序依種類輪流，避免同一種類連著更新。',
  '訓練來源：'+(result.plan.trainSource==='unseen-prefix'?'未進入 A 更新的既有種子前綴':'A 已看過的示範加上不足 8 場的新種子')+'。',
  '測速用種子 '+result.plan.benchSeed+'，只測時間，不進入訓練或保留。',
  '終點是這 '+result.plan.epochs+' 輪之後的權重。沒有用保留集追加輪數、改學習率或重抽。',
  result.plan.stats||ROUND11_STATS,
  '',
  ...(result.plan.criteria||ROUND11_CRITERIA).map(item=>'- '+item),
  '',
  '## 資料與切分',
  '',
  result.splitText||'',
  '',
  '這些種子本輪登記為開發用途，日後不得再列為全新獨立測試。',
  '',
  '## 比較',
  '',
  comparisonTable(result.comparison),
  '',
  '訓練列只作紀錄，不參與通過判定。保留種子配對差：'+intervalText(result.paired)+'。',
  '',
  '### 動作類型',
  '',
  kindMarkdown(result.kinds),
  '',
  '### 阻擋',
  '',
  result.blockText||'',
  '',
  '### 退步',
  '',
  regressionTable(result.regressions),
  '',
  '### 保護案例',
  '',
  result.protectionText||'',
  '',
  '訓練損失只作紀錄：更新前 '+(result.trainLoss?.before??'無')+'，更新後 '+(result.trainLoss?.after??'無')+'。它不是通過依據。',
  '',
  '原始 A、原 B、第十輪終點、正式 v2、Hard Search 2、規則、網站和晉級標準都沒有改。沒有部署，也沒有合併到 main。'
 ];
 return lines.join('\n')+'\n';
}
function comparisonTable(rows){
 const header='| 模型 | 分割 | 樣本 | 精確 | 公開快照等效 | 同卡號未證明 |';
 const line='| --- | --- | --- | --- | --- | --- |';
 const body=(rows||[]).map(row=>'| '+[row.model,row.role,row.used,percent(row.exactRate),percent(row.provenRate),percent(row.sameIdRate)].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
function kindMarkdown(rows){
 const header='| 類型 | 樣本 | A | 終點 |';
 const line='| --- | --- | --- | --- |';
 const body=(rows||[]).map(row=>'| '+[row.kind,row.used,percent(row.before),percent(row.after)].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
function regressionTable(rows){
 if(!rows?.length)return '沒有類型的精確一致率下降。';
 const header='| 類型 | 樣本 | A | 終點 |';
 const line='| --- | --- | --- | --- |';
 const body=rows.map(row=>'| '+[row.kind,row.used,percent(row.before),percent(row.after)].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
export {scoresIdentical,publicLethalKept,tCritical};
