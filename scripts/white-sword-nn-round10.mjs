#!/usr/bin/env node
// One locked imitation correction. The plan file is written before any update.
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {cloneMatch} from '../dist/universal-v2/ai-v3/opening.mjs';
import {BLEND_HARD_CAP,BLEND_SCALE,BLEND_TIMEOUT_MS} from '../dist/universal-v2/white-sword-ai/constants.mjs';
import {chooseWhiteSwordAction} from '../dist/universal-v2/white-sword-ai/choose.mjs';
import {getDeck} from '../dist/universal-v2/white-sword-ai/deck.mjs';
import {observeActor} from '../dist/universal-v2/white-sword-ai/observe.mjs';
import {ROUND8_CANDIDATE_HASH,ROUND8_CANDIDATE_UPDATES,ROUND8_CANDIDATE_VERSION,V2_DECISION_MS,V2_FILE_HASH} from '../training/white-sword-nn/constants.mjs';
import {encodeDecision,joinFeatures,sameVector} from '../training/white-sword-nn/encode.mjs';
import {imitationAgreement} from '../training/white-sword-nn/agree.mjs';
import {imitationLoss,imitationPass} from '../training/white-sword-nn/learn.mjs';
import {compactAction} from '../training/white-sword-nn/loop.mjs';
import {
 cloneNet,createOptimizer,forwardTrain,greedyIndex,loadNet,netDistance,sameWeights,saveNet,scoreActions
} from '../training/white-sword-nn/net.mjs';
import {loadOfficialV2,playMatch,trainable} from '../training/white-sword-nn/play.mjs';
import {ROUND9_BASELINE_FILE,ROUND9_BASELINE_HASH} from '../training/white-sword-nn/round9.mjs';
import {
 DEV_CASE,ROUND10_CANDIDATE_FILE,ROUND10_CRITERIA,ROUND10_DEMO_DROP_LIMIT,ROUND10_DEMO_SEEDS,
 ROUND10_DRAW_SEED,ROUND10_ENDPOINT_FILE,ROUND10_EPOCHS,ROUND10_LR,ROUND10_PLAN_FILE,
 ROUND10_REPLAY,ROUND10_REPORT_FILE,ROUND10_RESULT_FILE,ROUND10_SMOOTH,ROUND10_SOURCE_DEMO,
 ROUND10_SOURCE_LOSS,ROUND10_VERSION_ENDPOINT,ROUND10_VERSION_ZERO,ROUND10_ZERO_FILE,
 allowedIndices,assertWritable,assignRole,auditDevCase,checkedRegression,decisionImproved,
 devCaseImproved,equivalentBlockIndices,exactDrop,explainRound10,fixedUpdateCount,isBlock,
 isDevCase,isPass,judgeRound10,parentKey,protectClass,publicLethalKept,renderRound10,
 round10Rng,sampleId,scheduleUpdates,scoresIdentical,trainingLabel
} from '../training/white-sword-nn/round10.mjs';

const LOSS_JSON='docs/white-sword-ai/nn-round9-losses.json';

function sha256(file){
 return createHash('sha256').update(readFileSync(file)).digest('hex');
}
function taipei(date){
 const text=new Intl.DateTimeFormat('zh-TW',{
  timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).format(date);
 return text+'（台北時間）';
}
function packs(){
 const deck=getDeck('white-sword');
 return [deck.pack,deck.pack];
}
function collisions(rows){
 let count=0;
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++)if(sameVector(rows[i],rows[j]))count++;
 return count;
}
function actionText(action){
 if(!action)return '無';
 if(isPass(action))return '不阻擋';
 if(isBlock(action))return '阻擋 '+action.uid;
 const bits=[action.type||'動作'];
 if(action.mode)bits.push(action.mode);
 if(action.line)bits.push(action.line);
 if(action.uid)bits.push(action.uid);
 if(Number.isInteger(action.slot))bits.push('格 '+action.slot);
 return bits.join(' ');
}
function frontCard(card){
 return {
  uid:card.uid,cardId:card.cardId||'',bp:card.bp??null,ready:card.ready===true,
  raidDepth:card.raidDepth||0,restrictions:card.restrictions||[],
  raidLayers:card.raidLayers||[],underLayers:card.underLayers||[]
 };
}
function buildRow(spec,event){
 const state=cloneMatch(event.state);
 const observation=observeActor(spec.pack,state,event.actor);
 const history=event.history.slice();
 const actions=event.legal.map(action=>JSON.parse(JSON.stringify(action)));
 const encoded=encodeDecision(observation,event.actor,actions,history);
 const visible=observation.visible;
 const me=visible.players[event.actor];
 const opp=visible.players[event.actor===0?1:0];
 const battle=visible.battle;
 if(me.life||opp.life||opp.hand)throw Error('Hidden zone entered the row');
 const row={
  source:spec.source,synthetic:false,labeledByUniversalRule:false,hiddenLifeUsed:false,
  lifeCards:null,seed:spec.seed,learnerSeat:event.actor,first:spec.first,step:event.step,
  pending:visible.pending?.kind||'',phase:visible.phase,turn:visible.turn,active:visible.active,
  life:me.lifeCount,oppLife:opp.lifeCount,hand:me.handCount,oppHand:opp.handCount,
  damage:battle?.damage??null,impact:battle?.impact??null,attackerId:battle?.cardId||'',
  attackerBp:Number.isFinite(battle?.bp)?battle.bp:null,attackerUid:battle?.uid||null,
  actions,rows:encoded.actions.map(action=>joinFeatures(encoded.state,action)),
  identities:[...encoded.index].map(([uid,card])=>[uid,{cardId:card.cardId||'',faceDown:card.faceDown===true}]),
  state:encoded.state,actionVectors:encoded.actions,
  blockers:[],front:(me.front||[]).filter(Boolean).map(frontCard),
  aIndex:null,bIndex:null,teacherIndex:null,chosen:null
 };
 row.blockers=row.actions.filter(isBlock).map(action=>row.front.find(card=>card.uid===action.uid)).filter(Boolean);
 row.collisions=collisions(row.rows);
 row.id=sampleId(row);
 row.parent=parentKey(row);
 if(row.pending==='block'&&!row.attackerUid)throw Error('Block has no public attacker');
 return row;
}
function greedyOf(net,row){
 const played=scoreActions(net,row.state,row.actionVectors);
 const trained=Float64Array.from(row.rows,item=>forwardTrain(net,item).q);
 return {
  index:greedyIndex(played,row.actions),scores:played,
  trainIndex:greedyIndex(trained,row.actions)
 };
}
function replayLoss(spec,modelB,modelA,modelV2){
 const deckPacks=packs();
 const seats=[null,null];
 seats[spec.learnerSeat]={deckId:'white-sword',kind:'nn',explore:0,policy:'greedy'};
 seats[1-spec.learnerSeat]={deckId:'white-sword',kind:'v2',explore:0};
 const nets=[null,null];
 nets[spec.learnerSeat]=modelB;
 const rows=[];
 let open=null;
 const game=playMatch({
  seed:spec.seed,first:spec.first,mode:'eval',learnerSeat:spec.learnerSeat,
  comparison:'direct',model:'candidate',opponent:'v2',deck:'white-sword',
  keepActions:false,recordSeats:[],teacherSeats:[],progress:false,
  decisionMs:BLEND_TIMEOUT_MS,seats,nets,critics:[null,null],
  observe(event){
   if(event.when==='choice'){
    if(!open)return;
    if(!sameAction(event.action,open.actions[open.bIndex]))
     throw Error('Played action diverged from B at step '+event.step);
    rows.push(open);
    open=null;
    return;
   }
   if(event.actor!==spec.learnerSeat||event.legal.length<2)return;
   const row=buildRow({source:ROUND10_SOURCE_LOSS,seed:spec.seed,first:spec.first,pack:deckPacks},event);
   row.learnerSeat=spec.learnerSeat;
   row.id=sampleId(row);
   row.parent=parentKey(row);
   row.aIndex=greedyOf(modelA,row).index;
   row.bIndex=greedyOf(modelB,row).index;
   const teacher=chooseWhiteSwordAction(deckPacks,cloneMatch(event.state),{
    actor:event.actor,model:modelV2,mode:'blend',hardCap:BLEND_HARD_CAP,scale:BLEND_SCALE,
    explore:0,seed:spec.seed,step:event.step,timeoutMs:BLEND_TIMEOUT_MS
   });
   if(teacher?.reason==='timeout'||teacher?.source==='fallback'||!teacher?.action)
    throw Error('Teacher missed step '+event.step+' of '+spec.seed);
   row.teacherIndex=row.actions.findIndex(action=>sameAction(action,teacher.action));
   if(row.teacherIndex<0)throw Error('Teacher action was not legal');
   row.chosen=row.teacherIndex;
   open=row;
  }
 });
 const matched=trainable(game)&&game.winner===spec.winner&&game.steps===spec.steps;
 if(!matched)throw Error('Loss replay diverged '+spec.seed+' '+game.steps+' '+game.winner+' '+game.endReason);
 return {seed:spec.seed,learnerSeat:spec.learnerSeat,first:spec.first,matched,rows};
}
function sameAction(left,right){
 return JSON.stringify(compactAction(left))===JSON.stringify(compactAction(right));
}
function replayDemo(seed,first,modelV2){
 const deckPacks=packs();
 const seats=[
  {deckId:'white-sword',kind:'v2',explore:0},
  {deckId:'white-sword',kind:'v2',explore:0}
 ];
 const rows=[];
 let open=null;
 const game=playMatch({
  seed,first,mode:'eval',learnerSeat:null,comparison:'demo',model:'v2',opponent:'v2',
  deck:'white-sword',keepActions:false,recordSeats:[],teacherSeats:[0,1],progress:false,
  decisionMs:V2_DECISION_MS,seats,nets:[null,null],critics:[null,null],
  observe(event){
   if(event.when==='choice'){
    if(!open)return;
    if(event.source==='blend'&&open.actions.length>1){
     open.teacherIndex=open.actions.findIndex(action=>sameAction(action,event.action));
     if(open.teacherIndex<0)throw Error('Demo teacher was not legal');
     open.chosen=open.teacherIndex;
     rows.push(open);
    }
    open=null;
    return;
   }
   if(event.legal.length<2)return;
   open=buildRow({source:ROUND10_SOURCE_DEMO,seed,first,pack:deckPacks},event);
  }
 });
 if(!trainable(game))throw Error('Demo '+seed+' did not finish cleanly: '+game.endReason);
 return {seed,first,clean:true,steps:game.steps,rows};
}
function manifest(row){
 return {
  id:row.id,source:row.source,synthetic:false,freshTest:false,
  seed:row.seed,learnerSeat:row.learnerSeat,first:row.first,step:row.step,
  parent:row.parent,role:row.role,pending:row.pending,
  life:row.life,damage:row.damage,impact:row.impact,
  attackerId:row.attackerId,attackerBp:row.attackerBp,attackerUid:row.attackerUid,
  protect:row.protect,publicLethalKept:row.publicLethalKept===true,
  teacher:compactAction(row.actions[row.teacherIndex]),
  b:Number.isInteger(row.bIndex)?compactAction(row.actions[row.bIndex]):null,
  a:Number.isInteger(row.aIndex)?compactAction(row.actions[row.aIndex]):null,
  equivalentIndices:row.equivalentIndices||[],
  legalUids:row.actions.filter(action=>action.type==='chooseBlock').map(action=>action.uid??null),
  collisions:row.collisions||0
 };
}
function splitText(rows){
 const count=role=>rows.filter(row=>row.role===role).length;
 const holdout=rows.filter(row=>row.role==='holdout');
 const parents=new Set(holdout.map(row=>row.parent));
 const seeds=[...new Set(holdout.map(row=>row.seed))];
 const candidates=new Set(holdout.filter(row=>!allowedIndices(row).has(row.bIndex)).map(row=>row.parent));
 return [
  '訓練 '+count('train')+' 筆，是開發案例本身。同母局面、不計入遷移 '+count('sibling')+' 筆。',
  '保留阻擋 '+holdout.length+' 筆，'+parents.size+' 個母局面，種子 '+(seeds.join('、')||'無')+'。',
  '其中原 B 尚未對上教師的母局面 '+candidates.size+' 個。',
  '八場敗局裡的其他決策 '+count('context')+' 筆。原模仿示範 '+count('demo')+' 筆。',
  '三方都不擋 '+rows.filter(row=>row.protect==='agreed-pass').length+' 筆。',
  'B 與教師相同、且公開 BP 高於攻擊者的阻擋 '+rows.filter(row=>row.protect==='kept-block').length+' 筆。',
  '人工擺出的局面 0 筆。每一筆都來自引擎重播的合法動作。'
 ].join('');
}
function agreementOf(net,rows){
 return imitationAgreement(net,rows);
}
function main(){
 if(existsSync(ROUND10_RESULT_FILE)||existsSync(ROUND10_ENDPOINT_FILE))
  throw Error('Round 10 endpoint is already saved');
 assertWritable(ROUND10_ZERO_FILE);
 assertWritable(ROUND10_ENDPOINT_FILE);
 const hashBefore=sha256(ROUND10_CANDIDATE_FILE);
 if(hashBefore!==ROUND8_CANDIDATE_HASH)throw Error('Original B hash mismatch');
 if(sha256('training/white-sword-ai/weights/v2-capped.json')!==V2_FILE_HASH)
  throw Error('Official v2 hash mismatch');
 if(sha256(ROUND9_BASELINE_FILE)!==ROUND9_BASELINE_HASH)throw Error('Frozen A hash mismatch');
 const modelB=loadNet(ROUND10_CANDIDATE_FILE);
 if(modelB.version!==ROUND8_CANDIDATE_VERSION||modelB.updates!==ROUND8_CANDIDATE_UPDATES)
  throw Error('Original B identity mismatch');
 const modelA=loadNet(ROUND9_BASELINE_FILE);
 const modelV2=loadOfficialV2();
 const losses=JSON.parse(readFileSync(LOSS_JSON,'utf8'));
 const games=losses.cells.flatMap(cell=>cell.losses);
 if(games.length!==8)throw Error('The locked loss list is not eight games');
 const captured=[];
 const lossReports=[];
 for(const game of games){
  console.log('loss',game.seed,game.learnerSeat,game.first);
  const replay=replayLoss(game,modelB,modelA,modelV2);
  lossReports.push({seed:replay.seed,learnerSeat:replay.learnerSeat,first:replay.first,matched:replay.matched});
  captured.push(...replay.rows);
 }
 const demoReports=[];
 ROUND10_DEMO_SEEDS.forEach((seed,index)=>{
  console.log('demo',seed);
  const replay=replayDemo(seed,index%2,modelV2);
  demoReports.push({seed,first:index%2,clean:replay.clean,steps:replay.steps,rows:replay.rows.length});
  captured.push(...replay.rows);
 });
 const dev=captured.find(isDevCase);
 if(!dev)throw Error('The development case was not in the replay');
 const audit=auditDevCase(dev);
 if(!audit.ok)throw Error('Development audit failed: '+audit.failures.join('; '));
 dev.notes=audit.notes;
 const resting=(dev.front||[]).filter(card=>card.bp>dev.attackerBp&&card.ready!==true);
 if(resting.length)dev.notes.push('公開 BP 較高但不在合法清單：'+resting.map(card=>card.uid+' '+card.cardId+' BP '+card.bp).join('、')+'。');
 const devParent=dev.parent;
 const seen=new Set();
 for(const row of captured){
  if(seen.has(row.id))throw Error('Duplicate row '+row.id);
  seen.add(row.id);
  row.equivalentIndices=row===dev?audit.equivalentIndices:equivalentBlockIndices(row.actions,row.blockers,row.teacherIndex);
  row.protect=protectClass(row);
  row.publicLethalKept=publicLethalKept(row);
  row.role=assignRole(row,devParent);
  row.auditOk=row===dev;
  if(row.role==='train'&&trainingLabel(row)!==row.teacherIndex)throw Error('Training label drifted');
 }
 const text=splitText(captured);
 const candidates=new Set(captured.filter(row=>row.role==='holdout'&&!allowedIndices(row).has(row.bIndex)).map(row=>row.parent));
 if(!candidates.size)throw Error('No distinct holdout parent can measure transfer. '+text);
 const train=captured.filter(row=>row.role==='train');
 const demos=captured.filter(row=>row.role==='demo');
 const blocked=[...new Set(captured.filter(row=>row.source===ROUND10_SOURCE_LOSS).map(row=>row.seed))];
 const steps=scheduleUpdates(train.map(row=>row.id),demos,ROUND10_EPOCHS,ROUND10_REPLAY,round10Rng(),blocked);
 const plan={
  createdAt:new Date().toISOString(),
  candidateFile:ROUND10_CANDIDATE_FILE,candidateHash:hashBefore,
  candidateVersion:modelB.version,candidateUpdates:modelB.updates,
  zeroFile:ROUND10_ZERO_FILE,endpointFile:ROUND10_ENDPOINT_FILE,
  zeroVersion:ROUND10_VERSION_ZERO,endpointVersion:ROUND10_VERSION_ENDPOINT,
  lr:ROUND10_LR,smooth:ROUND10_SMOOTH,epochs:ROUND10_EPOCHS,replayFraction:ROUND10_REPLAY,
  drawSeed:ROUND10_DRAW_SEED,demoSeeds:[...ROUND10_DEMO_SEEDS],
  demoTimeoutMs:V2_DECISION_MS,lossTimeoutMs:BLEND_TIMEOUT_MS,
  criteria:[...ROUND10_CRITERIA],dropLimit:ROUND10_DEMO_DROP_LIMIT,
  steps,devNotes:dev.notes,
  devAllowed:[dev.actions[dev.teacherIndex].uid,...dev.equivalentIndices.map(index=>dev.actions[index].uid)],
  split:captured.map(manifest),developmentSeeds:[...blocked,...ROUND10_DEMO_SEEDS],
  freshTest:false,evaluation:false,splitText:text
 };
 writeFileSync(ROUND10_PLAN_FILE,JSON.stringify(plan,null,2)+'\n');
 const locked=JSON.parse(readFileSync(ROUND10_PLAN_FILE,'utf8'));
 if(locked.lr!==ROUND10_LR||locked.epochs!==ROUND10_EPOCHS||locked.replayFraction!==ROUND10_REPLAY)
  throw Error('Locked plan drifted');
 if(locked.steps.length!==fixedUpdateCount(1)||JSON.stringify(locked.steps)!==JSON.stringify(steps))
  throw Error('Locked schedule drifted');
 const byId=new Map(captured.map(row=>[row.id,row]));
 const zero=cloneNet(modelB);
 zero.version=ROUND10_VERSION_ZERO;
 for(const row of captured){
  const left=greedyOf(modelB,row);
  const right=greedyOf(zero,row);
  if(left.index!==right.index||!scoresIdentical(left.scores,right.scores))
   throw Error('Zero-update copy diverged at '+row.id);
  if(row.source===ROUND10_SOURCE_LOSS&&left.index!==row.bIndex)
   throw Error('Zero-update copy does not match the played action at '+row.id);
 }
 saveNet(zero,ROUND10_ZERO_FILE);
 const loadedZero=loadNet(ROUND10_ZERO_FILE);
 if(!sameWeights(loadedZero,modelB)||loadedZero.updates!==modelB.updates)
  throw Error('Saved zero copy does not match B');
 const net=cloneNet(modelB);
 net.version=ROUND10_VERSION_ENDPOINT;
 const opt=createOptimizer(locked.lr);
 const trainLossBefore=imitationLoss(net,train,{smooth:locked.smooth}).loss;
 const updateLog=[];
 for(const step of locked.steps){
  const sample=byId.get(step.id);
  if(!sample)throw Error('Schedule named a missing row');
  if(step.kind==='train'&&sample.chosen!==trainingLabel(sample))throw Error('Train step left the audited label');
  if(step.kind==='replay'&&sample.role!=='demo')throw Error('Replay left the original demonstrations');
  const scored=imitationPass(net,opt,[sample],{smooth:locked.smooth});
  updateLog.push({kind:step.kind,id:step.id,epoch:step.epoch,loss:scored.loss});
  console.log('update',updateLog.length,step.kind,scored.loss);
 }
 if(net.updates!==modelB.updates+locked.steps.length)throw Error('Update count drifted');
 const trainLossAfter=imitationLoss(net,train,{smooth:locked.smooth}).loss;
 saveNet(net,ROUND10_ENDPOINT_FILE);
 const hashAfter=sha256(ROUND10_CANDIDATE_FILE);
 if(hashAfter!==hashBefore)throw Error('Original B changed during the update');
 const endpoint=loadNet(ROUND10_ENDPOINT_FILE);
 const freshB=loadNet(ROUND10_CANDIDATE_FILE);
 const freshZero=loadNet(ROUND10_ZERO_FILE);
 if(!sameWeights(freshB,freshZero))throw Error('Reloaded zero copy drifted');
 const scored={zero:new Map(),endpoint:new Map()};
 let scoreDivergences=0;
 for(const row of captured){
  const base=greedyOf(freshB,row);
  const copy=greedyOf(freshZero,row);
  const end=greedyOf(endpoint,row);
  if(base.index!==copy.index||!scoresIdentical(base.scores,copy.scores))
   throw Error('Reloaded scores drifted');
  if(copy.index!==copy.trainIndex)scoreDivergences++;
  if(end.index!==end.trainIndex)scoreDivergences++;
  scored.zero.set(row.id,copy);
  scored.endpoint.set(row.id,end);
 }
 const roles=['train','sibling','holdout','context','demo'];
 const agreement=roles.map(role=>{
  const group=captured.filter(row=>row.role===role);
  const before=agreementOf(freshZero,group);
  const after=agreementOf(endpoint,group);
  return {
   role,used:before.used,before:before.exactRate,after:after.exactRate,
   beforeUid:before.uidRate,afterUid:after.uidRate
  };
 });
 const holdout=[];
 const improvedParents=new Set();
 const holdoutParents=new Set();
 const regressions=[];
 let illegal=0;
 for(const row of captured){
  const before=scored.zero.get(row.id);
  const after=scored.endpoint.get(row.id);
  const regression=row.role==='demo'?null:checkedRegression(row,after.index);
  if(regression==='illegal')illegal++;
  else if(regression)regressions.push({id:row.id,kind:regression,parent:row.parent,step:row.step,
   before:actionText(row.actions[before.index]),after:actionText(row.actions[after.index])});
  if(row.role!=='holdout')continue;
  holdoutParents.add(row.parent);
  const improved=decisionImproved(row,before.index,after.scores);
  if(improved)improvedParents.add(row.parent);
  holdout.push({
   parent:row.parent,step:row.step,life:row.life,damage:row.damage,
   teacher:actionText(row.actions[row.teacherIndex]),
   before:actionText(row.actions[before.index]),
   after:actionText(row.actions[after.index]),
   improved
  });
 }
 const sacrificed=[];
 let agreedPassChanged=0;
 let keptBlockChanged=0;
 for(const row of captured){
  const before=scored.zero.get(row.id);
  const after=scored.endpoint.get(row.id);
  if(before.index===after.index)continue;
  const change={
   id:row.id,step:row.step,before:actionText(row.actions[before.index]),
   after:actionText(row.actions[after.index]),kind:row.protect||row.role
  };
  if(row.protect==='agreed-pass'){
   agreedPassChanged++;
   sacrificed.push(change);
  }else if(row.protect==='kept-block'){
   keptBlockChanged++;
   sacrificed.push(change);
  }
 }
 for(const row of regressions)if(!sacrificed.some(item=>item.id===row.id))sacrificed.push(row);
 const demoChanges=[];
 for(const row of captured.filter(item=>item.role==='demo')){
  const before=scored.zero.get(row.id);
  const after=scored.endpoint.get(row.id);
  if(before.index===after.index)continue;
  const change={
   id:row.id,step:row.step,before:actionText(row.actions[before.index]),
   after:actionText(row.actions[after.index]),
   kind:before.index===row.teacherIndex?'demo-teacher':'demo'
  };
  demoChanges.push(change);
  if(change.kind==='demo-teacher')sacrificed.push(change);
 }
 const demo=agreement.find(row=>row.role==='demo');
 const summary={
  zeroMatchesB:true,devImproved:devCaseImproved(dev,scored.zero.get(dev.id).index,scored.endpoint.get(dev.id).scores),
  distance:netDistance(freshB,endpoint),transferParents:holdoutParents.size,
  transferParentsImproved:improvedParents.size,checkedRegressions:regressions,illegal,
  demoDisclosed:true,demoUsed:demo?.used||0,demoExactDrop:exactDrop(
   {used:demo?.used,exactRate:demo?.before},{used:demo?.used,exactRate:demo?.after}
  ),
  sacrificed,agreedPassChanged,keptBlockChanged
 };
 const judged=judgeRound10(summary);
 const answers=explainRound10(summary);
 const zeroScore=scored.zero.get(dev.id);
 const endScore=scored.endpoint.get(dev.id);
 const result={
  createdAt:new Date().toISOString(),createdAtText:taipei(new Date()),
  verdict:judged.verdict,passed:judged.passed,recommend:judged.recommend,answers,
  hashes:{before:hashBefore,after:hashAfter,zero:sha256(ROUND10_ZERO_FILE),endpoint:sha256(ROUND10_ENDPOINT_FILE)},
  updates:{zero:freshZero.updates,endpoint:endpoint.updates},
  distance:summary.distance,zeroMatchesB:true,scoreDivergences,
  dev:{
   notes:dev.notes,allowedUids:plan.devAllowed,collisions:dev.collisions,
   before:compactAction(dev.actions[zeroScore.index]),
   after:compactAction(dev.actions[endScore.index]),
   teacher:compactAction(dev.actions[dev.teacherIndex]),
   margin:endScore.scores[endScore.index]-endScore.scores[zeroScore.index]
  },
  plan:{
   lr:locked.lr,smooth:locked.smooth,replayFraction:locked.replayFraction,
   drawSeed:locked.drawSeed,steps:locked.steps,criteria:locked.criteria
  },
  splitText:text,games:{losses:lossReports,demos:demoReports},
  agreement,holdout,sacrificed,demoChanges,
  trainLoss:{before:trainLossBefore,after:trainLossAfter},updateLog,
  transferParents:[...improvedParents]
 };
 writeFileSync(ROUND10_RESULT_FILE,JSON.stringify(result,null,2)+'\n');
 writeFileSync(ROUND10_REPORT_FILE,renderRound10(result));
 console.log(JSON.stringify({
  verdict:result.verdict,improved:summary.devImproved,transfer:summary.transferParentsImproved,
  parents:summary.transferParents,regressions:regressions.length,demoDrop:summary.demoExactDrop,
  updates:endpoint.updates
 }));
}

main();
