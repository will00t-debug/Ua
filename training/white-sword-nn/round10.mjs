// Round 10 is one teacher correction on the published block window.
// The universal higher-BP rule is not a label. Life above damage is not a
// negative label. Holdout scores are not allowed to choose another run.
import {IMITATE_EPOCHS,IMITATE_LR,LABEL_SMOOTH,REPLAY_FRACTION,ROUND8_CANDIDATE_HASH,ROUND8_CANDIDATE_UPDATES,ROUND8_CANDIDATE_VERSION} from './constants.mjs';
import {assertReplayPool,drawReplay,replaySteps,shuffle} from './learn.mjs';
import {greedyIndex} from './net.mjs';
import {sameAction} from './loop.mjs';

export const ROUND10_CANDIDATE_FILE='training/white-sword-nn/weights/round6/line-2/actor-after-96.json';
export const ROUND10_ZERO_FILE='training/white-sword-nn/weights/round10/actor-block-0.json';
export const ROUND10_ENDPOINT_FILE='training/white-sword-nn/weights/round10/actor-block-endpoint.json';
export const ROUND10_PLAN_FILE='docs/white-sword-ai/nn-round10-plan.json';
export const ROUND10_RESULT_FILE='docs/white-sword-ai/nn-round10-results.json';
export const ROUND10_REPORT_FILE='docs/white-sword-ai/NN-ROUND10.md';
export const ROUND10_FROZEN_FILES=Object.freeze([
 'training/white-sword-nn/weights/round6/line-2/actor-after-96.json',
 'training/white-sword-nn/weights/round2/a-frozen.json',
 'training/white-sword-ai/weights/v2-capped.json'
]);
export const ROUND10_VERSION_ZERO='nn-ppo-actor-r10-block-0';
export const ROUND10_VERSION_ENDPOINT='nn-ppo-actor-r10-block';
export const ROUND10_LR=IMITATE_LR;
export const ROUND10_SMOOTH=LABEL_SMOOTH;
export const ROUND10_EPOCHS=IMITATE_EPOCHS;
export const ROUND10_REPLAY=REPLAY_FRACTION;
export const ROUND10_DRAW_SEED=188543;
export const ROUND10_DEMO_SEEDS=Object.freeze([188600,188601,188602,188603]);
export const ROUND10_DEMO_DROP_LIMIT=0.05;
export const ROUND10_SOURCE_LOSS='round8-loss-replay';
export const ROUND10_SOURCE_DEMO='imitate-prefix';
export const DEV_CASE=Object.freeze({
 seed:193502,learnerSeat:1,first:0,step:118,source:ROUND10_SOURCE_LOSS
});
export const DEV_EXPECT=Object.freeze({
 pending:'block',phase:'attack',turn:11,active:0,
 life:1,oppLife:7,hand:2,oppHand:4,
 damage:1,impact:0,
 attackerId:'BLC-2-069',attackerBp:2500,attackerUid:'0-17',
 teacherUid:'1-12',teacherBp:4000,teacherCard:'BLC-2-067',
 legalUids:Object.freeze([null,'1-12','1-40','1-15'])
});
export const ROUND10_CRITERIA=Object.freeze([
 '原案例改善：零更新副本在開發案例上的動作與 B 相同，終點對事前允許的教師動作分數嚴格高於其餘未證明等效的合法動作。',
 '至少一個未進入更新、且與開發案例不同母局面的保留阻擋，終點改為該局面事前記下的教師動作。',
 '保護案例沒有新增已核對的明顯錯誤。非法動作計為錯誤。已保持的較高 BP 阻擋，在公開傷害不少於生命且 impact 為 0 時，終點不得改成不擋，也不得改成公開 BP 不高於攻擊者的阻擋。三方都選擇不擋的局面只揭露。',
 '一般示範的逐筆動作變化完整寫進結果。一致率下降不單獨構成學習失敗。',
 '四條都成立只記為局部有教師修正。教師一致、損失下降和權重變動都不記為棋力提升。',
 '另行登記對局評估，只在四條都成立且一般示範的精確一致率下降不超過 0.05 時建議。否則不送。'
]);

export function assertWritable(file){
 if(ROUND10_FROZEN_FILES.includes(file))throw Error('Refusing to write a frozen weight');
}
export function fixedUpdateCount(trainCount,epochs=ROUND10_EPOCHS,fraction=ROUND10_REPLAY){
 return epochs*(trainCount+replaySteps(trainCount,fraction));
}
export function round10Rng(seed=ROUND10_DRAW_SEED){
 let state=seed>>>0;
 return ()=>{
  state=state+0x6D2B79F5|0;
  let t=Math.imul(state^state>>>15,1|state);
  t=t+Math.imul(t^t>>>7,61|t)^t;
  return ((t^t>>>14)>>>0)/4294967296;
 };
}
export function isDevCase(row){
 return !!row&&row.seed===DEV_CASE.seed&&row.learnerSeat===DEV_CASE.learnerSeat&&
  row.first===DEV_CASE.first&&row.step===DEV_CASE.step&&row.source===DEV_CASE.source;
}
export function parentKey(row){
 return [row.seed,row.learnerSeat,row.first,row.attackerUid||'none'].join(':');
}
export function sampleId(row){
 return [row.source,row.seed,row.learnerSeat,row.first,row.step].join(':');
}
export function isPass(action){
 return action?.type==='chooseBlock'&&action.uid==null;
}
export function isBlock(action){
 return action?.type==='chooseBlock'&&typeof action.uid==='string'&&action.uid.length>0;
}
function stable(value){
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==='object'){
  const out={};
  for(const key of Object.keys(value).sort()){
   if(/uid/i.test(key))continue;
   out[key]=stable(value[key]);
  }
  return out;
 }
 return value??null;
}
export function cardFingerprint(card){
 if(!card)return null;
 return stable({
  cardId:card.cardId||'',
  bp:Number.isFinite(card.bp)?card.bp:null,
  ready:card.ready===true,
  raidDepth:card.raidDepth||0,
  restrictions:card.restrictions||[],
  raidLayers:card.raidLayers||[],
  underLayers:card.underLayers||[]
 });
}
export function samePublicCard(left,right){
 return JSON.stringify(cardFingerprint(left))===JSON.stringify(cardFingerprint(right));
}
export function blockerOf(row,action){
 return (row.blockers||[]).find(card=>card.uid===action?.uid)||null;
}
export function blockerBp(row,action){
 const card=blockerOf(row,action);
 return Number.isFinite(card?.bp)?card.bp:null;
}
export function equivalentBlockIndices(actions,blockers,teacherIndex){
 const teacher=actions?.[teacherIndex];
 if(!isBlock(teacher))return [];
 const snap=blockers?.find(card=>card.uid===teacher.uid);
 if(!snap)return [];
 const out=[];
 for(let index=0;index<actions.length;index++){
  if(index===teacherIndex||!isBlock(actions[index]))continue;
  const other=blockers.find(card=>card.uid===actions[index].uid);
  if(other&&samePublicCard(snap,other))out.push(index);
 }
 return out;
}
export function trainingLabel(row){
 if(!row||row.labeledByUniversalRule===true)return null;
 if(!isDevCase(row)||row.auditOk!==true)return null;
 if(!Number.isInteger(row.teacherIndex))return null;
 return row.teacherIndex;
}
export function assignRole(row,devParent){
 if(row.source===ROUND10_SOURCE_DEMO)return 'demo';
 if(row.source!==ROUND10_SOURCE_LOSS)throw Error('Unknown round-10 source');
 if(isDevCase(row))return 'train';
 if(row.parent===devParent&&row.pending==='block')return 'sibling';
 if(row.pending==='block')return 'holdout';
 return 'context';
}
export function protectClass(row){
 if(row.pending!=='block')return null;
 if(!Number.isInteger(row.aIndex)||!Number.isInteger(row.bIndex)||!Number.isInteger(row.teacherIndex))return null;
 const a=row.actions[row.aIndex];
 const b=row.actions[row.bIndex];
 const teacher=row.actions[row.teacherIndex];
 if(sameAction(a,b)&&sameAction(b,teacher)&&isPass(teacher))return 'agreed-pass';
 if(sameAction(b,teacher)&&isBlock(teacher)&&blockerBp(row,teacher)>row.attackerBp)return 'kept-block';
 return null;
}
export function publicLethalKept(row){
 if(row.protect!=='kept-block')return false;
 if(!(row.damage>=row.life)||row.impact!==0)return false;
 const agreed=row.actions[row.teacherIndex];
 return isBlock(agreed)&&blockerBp(row,agreed)>row.attackerBp;
}
function uidSet(actions){
 return actions.filter(action=>action?.type==='chooseBlock').map(action=>action.uid??null);
}
function sameUidSet(left,right){
 if(left.length!==right.length)return false;
 const bag=left.slice();
 for(const uid of right){
  const at=bag.findIndex(item=>item===uid);
  if(at<0)return false;
  bag.splice(at,1);
 }
 return bag.length===0;
}
export function auditDevCase(row){
 const failures=[];
 const notes=[];
 if(!isDevCase(row))failures.push('not the published development case');
 if(row.synthetic===true)failures.push('synthetic position');
 if(row.labeledByUniversalRule===true)failures.push('universal rule was used as the label');
 if(row.hiddenLifeUsed===true||Array.isArray(row.lifeCards))failures.push('hidden life entered the label');
 const expect=DEV_EXPECT;
 for(const key of ['pending','phase','turn','active','life','oppLife','hand','oppHand','damage','impact','attackerId','attackerBp','attackerUid']){
  if(row[key]!==expect[key])failures.push(key+' is '+row[key]);
 }
 const actions=row.actions||[];
 if(!sameUidSet(uidSet(actions),expect.legalUids))failures.push('legal blockers differ');
 if(!isPass(actions[row.bIndex]))failures.push('B did not pass');
 if(!isPass(actions[row.aIndex]))failures.push('A did not pass');
 const teacher=actions[row.teacherIndex];
 if(teacher?.uid!==expect.teacherUid)failures.push('teacher uid is '+(teacher?.uid??null));
 const teacherCard=blockerOf(row,teacher);
 if(!teacherCard||teacherCard.cardId!==expect.teacherCard||teacherCard.bp!==expect.teacherBp||teacherCard.ready!==true)
  failures.push('teacher card is not the published ready blocker');
 if(!(teacherCard?.bp>row.attackerBp))failures.push('teacher blocker does not beat the attacker on public BP');
 const others=(row.blockers||[]).filter(card=>card.uid!==expect.teacherUid&&card.bp>row.attackerBp);
 if(!others.length)failures.push('no second higher-BP blocker');
 const equivalent=equivalentBlockIndices(actions,row.blockers,row.teacherIndex);
 notes.push('教師是凍結 v2 在這個局面選的動作，只稱為教師行為，不稱為已證明的最優。');
 notes.push('最後一張生命的觸發沒有讀，也沒有用來標註。不阻擋會把未阻擋的生命傷害排進佇列；這不是已被證明的敗局。');
 notes.push('阻擋會先把該角色轉為 REST。finishBlockedBattle 以攻擊者有效 BP 是否大於等於阻擋者有效 BP 決定攻擊者獲勝。這裡的 BP 是公開 bp()。');
 notes.push('這個教師索引只寫給這一個局面。傷害不少於生命、impact 為 0、存在更高 BP 阻擋者，沒有被寫成其他局面的標籤。生命多於傷害也沒有被寫成必須不擋。');
 notes.push('攻擊者 BLC-2-069 的印刷效果是登場時的棄牌與回收，沒有戰鬥修正。公開 impact 為 0。');
 for(const card of row.blockers||[]){
  const raid=card.raidDepth?('突襲深度 '+card.raidDepth):'突襲深度 0，框內效果未啟動';
  notes.push('合法阻擋 '+card.uid+' '+card.cardId+' 公開 BP '+card.bp+'，'+raid+'。');
 }
 if(equivalent.length)notes.push('公開快照相同、只有 uid 不同的阻擋索引：'+equivalent.join(','));
 else notes.push('沒有第二張公開快照相同的阻擋。同卡號本身不算等效。');
 return {ok:failures.length===0,failures,notes,equivalentIndices:equivalent};
}
export function allowedIndices(row){
 return new Set([row.teacherIndex,...(row.equivalentIndices||[])]);
}
export function selectsTeacher(scores,actions,teacherIndex,equivalent){
 const allowed=new Set([teacherIndex,...(equivalent||[])]);
 const picked=greedyIndex(scores,actions);
 if(!allowed.has(picked))return false;
 for(let index=0;index<scores.length;index++){
  if(allowed.has(index))continue;
  if(!(scores[picked]-scores[index]>1e-9))return false;
 }
 return true;
}
export function decisionImproved(row,beforeIndex,scores){
 if(allowedIndices(row).has(beforeIndex))return false;
 return selectsTeacher(scores,row.actions,row.teacherIndex,row.equivalentIndices);
}
export function devCaseImproved(row,zeroIndex,scores){
 if(zeroIndex!==row.bIndex||!isPass(row.actions[zeroIndex]))return false;
 return decisionImproved(row,zeroIndex,scores);
}
export function checkedRegression(row,endpointIndex){
 if(!Number.isInteger(endpointIndex)||endpointIndex<0||endpointIndex>=(row.actions||[]).length)
  return 'illegal';
 if(row.protect!=='kept-block'||!row.publicLethalKept)return null;
 const agreed=row.actions[row.teacherIndex];
 const next=row.actions[endpointIndex];
 if(sameAction(agreed,next))return null;
 if(isPass(next))return 'abandoned-kept-higher-block';
 if(isBlock(next)&&!(blockerBp(row,next)>row.attackerBp))return 'switched-to-losing-block';
 return null;
}
export function scheduleUpdates(trainIds,demoPool,epochs,fraction,rng,blockedSeeds){
 if(!Array.isArray(trainIds)||trainIds.length!==1)throw Error('This round trains on one audited position');
 const perEpoch=replaySteps(trainIds.length,fraction);
 const replay=drawReplay(demoPool,epochs*perEpoch,rng);
 assertReplayPool(replay,blockedSeeds);
 const steps=[];
 let cursor=0;
 for(let epoch=0;epoch<epochs;epoch++){
  for(const id of shuffle(trainIds,rng)){
   steps.push({kind:'train',id,epoch});
   steps.push({kind:'replay',id:replay[cursor].id,epoch});
   cursor++;
  }
 }
 if(cursor!==replay.length||steps.length!==fixedUpdateCount(trainIds.length,epochs,fraction))
  throw Error('Update schedule drifted');
 return steps;
}
export function scoresIdentical(left,right){
 if(!left||!right||left.length!==right.length)return false;
 for(let index=0;index<left.length;index++)if(!Object.is(left[index],right[index]))return false;
 return true;
}
export function exactDrop(before,after){
 if(!before?.used||!after?.used||!Number.isFinite(before.exactRate)||!Number.isFinite(after.exactRate))
  return null;
 return before.exactRate-after.exactRate;
}
export function judgeRound10(summary){
 const original=summary.zeroMatchesB===true&&summary.devImproved===true;
 const transfer=summary.transferParentsImproved>=1;
 const protection=(summary.checkedRegressions||[]).length===0&&summary.illegal===0;
 const disclosed=summary.demoDisclosed===true;
 const passed=original&&transfer&&protection&&disclosed;
 const drop=summary.demoExactDrop;
 const recommend=passed&&summary.demoUsed>0&&Number.isFinite(drop)&&drop<=ROUND10_DEMO_DROP_LIMIT;
 return {
  passed,original,transfer,protection,disclosed,recommend,
  verdict:passed?'局部有教師修正':'本輪局部學習修正未成立'
 };
}
export function explainRound10(summary){
 const judged=judgeRound10(summary);
 let q1='零更新副本和原 B 不一致，這次沒有把不一致的分數拿去更新。';
 if(summary.zeroMatchesB&&summary.devImproved&&summary.distance>0)
  q1='有。開發案例的教師動作出現在終點權重，零更新副本的分數和動作仍與原 B 相同。推論沒有另加阻擋遮罩。';
 else if(summary.zeroMatchesB&&!summary.devImproved)
  q1='沒有確立。零更新副本與原 B 相同，終點沒有把開發案例改成事前指定的教師動作。';
 let q2='保留資料裡沒有另一個阻擋母局面，不足以檢查遷移。';
 if(summary.transferParents>0&&summary.transferParentsImproved>0)
  q2='有。'+summary.transferParentsImproved+' 個未進入更新的不同母局面，終點改成該局面事前記下的教師動作。這是教師行為的遷移，不是最優證明。';
 else if(summary.transferParents>0)
  q2='沒有。保留組有 '+summary.transferParents+' 個不同的阻擋母局面，終點沒有把其中任何一個未對上教師的局面改成教師動作。';
 const sacrificed=summary.sacrificed||[];
 const q3=sacrificed.length?
  '有 '+sacrificed.length+' 筆事先可核對的選擇被終點改掉，清單列在結果裡。其中已核對的明顯錯誤 '+
  (summary.checkedRegressions||[]).length+' 筆。三方都不擋而被改掉的有 '+(summary.agreedPassChanged||0)+
  ' 筆。已保持的較高 BP 阻擋被改掉的有 '+(summary.keptBlockChanged||0)+' 筆。':
  '這次沒有觀察到保護案例，或教師一致的一般示範，被終點改成別的動作。';
 const q4='這一輪檢查的是教師行為。局部通過也只支持有教師的修正。對局勝率、自主學習和超越 v2 都還沒有測量。損失下降、教師一致率或權重距離都不是棋力。';
 const q5=judged.recommend?
  '值得另開一輪事先登記的對局評估。這一輪本身沒有對局結果，不能把這份權重直接拿去晉級。':
  '不值得。這一輪沒有給出可以送進對局評估的局部通過，或一般示範的精確一致率下降超過事先寫下的 0.05。';
 return {q1,q2,q3,q4,q5,verdict:judged.verdict,recommend:judged.recommend,passed:judged.passed};
}
function percent(rate){
 return Number.isFinite(rate)?(rate*100).toFixed(1)+'%':'沒有樣本';
}
function actionText(action){
 if(!action)return '無';
 if(isPass(action))return '不阻擋';
 if(isBlock(action))return '阻擋 '+action.uid;
 return (action.type||'動作')+(action.uid?' '+action.uid:'');
}
export function renderRound10(result){
 const answers=result.answers;
 const lines=[
  '# 白劍神經網路第十輪',
  '',
  '產生時間：'+result.createdAtText+'。',
  '',
  '接受第九輪的循環誤判診斷和 runner 修正。第八輪維持執行無效。這一輪只做一次事先寫死的模仿修正，沒有新對局、沒有新特徵、沒有換架構，也沒有重開 v4–v7。',
  '',
  '判定：'+result.verdict+'。',
  '',
  '## 五個問題',
  '',
  '① '+answers.q1,
  '',
  '② '+answers.q2,
  '',
  '③ '+answers.q3,
  '',
  '④ '+answers.q4,
  '',
  '⑤ '+answers.q5,
  '',
  '## 凍結與零更新',
  '',
  '原 B 是 `'+ROUND10_CANDIDATE_FILE+'`，版本 '+ROUND8_CANDIDATE_VERSION+'，更新次數 '+ROUND8_CANDIDATE_UPDATES+'。',
  'SHA-256 更新前 '+result.hashes.before+'，更新後 '+result.hashes.after+'。第九輪記錄的雜湊是 '+ROUND8_CANDIDATE_HASH+'。',
  '零更新副本是 `'+ROUND10_ZERO_FILE+'`，版本 '+ROUND10_VERSION_ZERO+'，更新次數 '+result.updates.zero+'。',
  '終點是 `'+ROUND10_ENDPOINT_FILE+'`，版本 '+ROUND10_VERSION_ENDPOINT+'，更新次數 '+result.updates.endpoint+'。',
  '終點與原 B 的參數距離 '+result.distance+'。零更新副本在固定資料上的分數與動作和原 B 一致：'+(result.zeroMatchesB?'是':'否')+'。',
 result.scoreDivergences?'推論分數和訓練前向的最高分動作不一致 '+result.scoreDivergences+' 筆。判定採用對局會打出的推論分數。':'推論分數和訓練前向的最高分動作一致。',
  '',
  '## 開發案例的標籤',
  '',
  '種子 193502、學習座位 1、後手、第 118 步。來源是第九輪已鎖定敗局的重播，引擎合法動作，不是人工擺的局面。',
  ...(result.dev.notes||[]).map(note=>'- '+note),
  '',
  '允許併入教師的 uid：'+(result.dev.allowedUids||[]).join('、')+'。',
  '特徵完全相同的合法動作對：'+(result.dev.collisions??0)+'。',
  'B 的動作：'+actionText(result.dev.before)+'。終點：'+actionText(result.dev.after)+'。教師：'+actionText(result.dev.teacher)+'。',
  '',
  '## 固定學習',
  '',
  '學習率 '+result.plan.lr+'，標籤平滑 '+result.plan.smooth+'，更新 '+result.plan.steps.length+' 步，回放比例 '+result.plan.replayFraction+'。',
  '抽樣種子 '+result.plan.drawSeed+'，只用於打亂既有示範，沒有開成對局。損失是既有的模仿交叉熵，Actor 輸出仍是合法動作的分數，沒有回歸終局回報。',
  '終點是這 '+result.plan.steps.length+' 步之後的權重，沒有用保留集挑檢查點。',
  '',
  ...result.plan.criteria.map(item=>'- '+item),
  '',
  '## 資料與切分',
  '',
  result.splitText,
  '',
  '重播的第八輪敗局：'+(result.games.losses||[]).map(game=>game.seed+' 座位 '+game.learnerSeat+' 先後 '+game.first+'，'+(game.matched?'步數與勝者相符':'不相符')).join('；')+'。',
  '原模仿示範重播：'+(result.games.demos||[]).map(game=>game.seed+' '+(game.clean?'完成':'未完成')).join('；')+'。',
  '這些種子本輪登記為開發用途，日後不得再列為全新獨立測試。',
  '',
  '## 比較',
  '',
  agreementTable(result.agreement),
  '',
  '### 保留阻擋',
  '',
  positionTable(result.holdout),
  '',
  '### 被改掉的保護選擇與教師一致示範',
  '',
  changeTable(result.sacrificed),
  '',
  '### 一般示範的動作變化',
  '',
  changeTable(result.demoChanges),
  '',
  '訓練樣本的模仿損失：更新前 '+(result.trainLoss?.before??'無')+'，更新後 '+(result.trainLoss?.after??'無')+'。這只是教師交叉熵。',
  '',
  '原始權重、正式 v2、Hard Search 2、規則、網站和晉級標準都沒有改。沒有部署，也沒有合併到 main。'
 ];
 return lines.join('\n')+'\n';
}
function agreementTable(agreement){
 const rows=agreement||[];
 const header='| 分割 | 樣本 | 原 B 精確 | 終點精確 | 原 B uid 類 | 終點 uid 類 |';
 const line='| --- | --- | --- | --- | --- | --- |';
 const body=rows.map(row=>'| '+[row.role,row.used,percent(row.before),percent(row.after),percent(row.beforeUid),percent(row.afterUid)].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
function positionTable(rows){
 if(!rows?.length)return '沒有保留阻擋。';
 const header='| 母局面 | 步 | 生命 | 傷害 | 教師 | 原 B | 終點 | 遷移 |';
 const line='| --- | --- | --- | --- | --- | --- | --- | --- |';
 const body=rows.map(row=>'| '+[row.parent,row.step,row.life,row.damage,row.teacher,row.before,row.after,row.improved?'是':'否'].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
function changeTable(rows){
 if(!rows?.length)return '沒有這類變化。';
 const header='| 來源 | 步 | 原本 | 終點 | 標記 |';
 const line='| --- | --- | --- | --- | --- |';
 const body=rows.map(row=>'| '+[row.id,row.step??'',row.before,row.after,row.kind].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
