// Round 13 scores the committed round-12 shuffle endpoint.
// It does not train, retune, adopt a weight, or start a match.
import {createHash} from 'node:crypto';
import {tCritical} from './cluster.mjs';
import {
 ROUND11_A_FILE,ROUND11_B_FILE,ROUND11_CRITERIA,ROUND11_ENDPOINT_FILE,ROUND11_R10_FILE,
 ROUND11_STATS,ROUND11_V2_FILE,ROUND11_ZERO_FILE,choiceClass,judgeRound11,seedPaired
} from './round11.mjs';
import {checkedRegression,protectClass,publicLethalKept} from './round10.mjs';
import {attackGap,classifyAttack} from './round12.mjs';
import {
 ROUND12_SHUFFLE_FILE,ROUND12_STRATIFIED_FILE,ROUND12_VERSION_SHUFFLE
} from './round12.mjs';

export const ROUND13_SHUFFLE_FILE=ROUND12_SHUFFLE_FILE;
export const ROUND13_SHUFFLE_VERSION=ROUND12_VERSION_SHUFFLE;
export const ROUND13_SHUFFLE_UPDATES=94974;
export const ROUND13_SHUFFLE_HASH='35fb34e17f1b6c2fdca54f9c1fd14f28569f94f69ae4d285c7c3554d384f00c2';
export const ROUND13_PLAN_FILE='docs/white-sword-ai/nn-round13-plan.json';
export const ROUND13_RESULT_FILE='docs/white-sword-ai/nn-round13-results.json';
export const ROUND13_REPORT_FILE='docs/white-sword-ai/NN-ROUND13.md';
export const ROUND13_HOLDOUT_SAMPLES=3395;
export const ROUND13_HOLDOUT_SEEDS=28;
export const ROUND13_TRAIN_SAMPLES=7162;
export const ROUND13_RESERVE_SAMPLES=3010;
export const ROUND13_RECORDED_EXACT=Object.freeze({
 A:0.6150220913107511,shuffle:0.658321060382916
});
export const ROUND13_RECORDED_STOP=11;
export const ROUND13_CRITERIA=ROUND11_CRITERIA;
export const ROUND13_STATS=ROUND11_STATS;
export const KIND_ORDER=Object.freeze(['play','attack','block','trigger','effect','other']);
export const ROUND13_FROZEN_FILES=Object.freeze([
 ROUND11_A_FILE,ROUND11_B_FILE,ROUND11_V2_FILE,ROUND11_R10_FILE,
 'training/white-sword-nn/weights/round10/actor-block-0.json',
 ROUND11_ZERO_FILE,ROUND11_ENDPOINT_FILE,ROUND12_STRATIFIED_FILE,ROUND13_SHUFFLE_FILE
]);

export function assertWritable(file){
 if(ROUND13_FROZEN_FILES.includes(file))throw Error('Refusing to write a frozen weight');
}
export function parameterHash(net){
 const view=net?.theta;
 if(!view)throw Error('Network has no parameters');
 return createHash('sha256').update(Buffer.from(view.buffer,view.byteOffset,view.byteLength)).digest('hex');
}
export function assertRole(samples,role){
 for(const sample of samples||[]){
  if(sample.role!==role)throw Error('Split mixed at '+(sample.id||'unknown'));
 }
}
export function actionText(action){
 if(!action)return '無';
 if(action.type==='chooseBlock'&&action.uid==null)return '不阻擋';
 if(action.type==='chooseBlock')return '阻擋 '+action.uid;
 if(action.type==='next')return '停止攻擊';
 const bits=[action.type||'動作'];
 if(action.mode)bits.push(action.mode);
 if(action.uid)bits.push(action.uid);
 if(action.targetUid)bits.push('目標 '+action.targetUid);
 if(action.baseUid)bits.push('底 '+action.baseUid);
 if(action.line!=null&&action.line!=='')bits.push('列 '+action.line);
 if(Number.isInteger(action.slot))bits.push('格 '+action.slot);
 if(Number.isInteger(action.index))bits.push('序 '+action.index);
 if(action.cardId)bits.push(action.cardId);
 return bits.join(' ');
}
export function publicBrief(sample){
 return {
  turn:sample?.turn??null,phase:sample?.phase||'',pending:sample?.pending||'',active:sample?.active??null,
  life:sample?.life??null,oppLife:sample?.oppLife??null,hand:sample?.hand??null,oppHand:sample?.oppHand??null,
  damage:sample?.damage??null,impact:sample?.impact??null,attackerId:sample?.attackerId||'',
  attackerBp:sample?.attackerBp??null,attackerUid:sample?.attackerUid||null,
  front:(sample?.front||[]).map(card=>({
   uid:card.uid,cardId:card.cardId||'',bp:card.bp,ready:card.ready===true,raidDepth:card.raidDepth||0
  }))
 };
}
export function transitionTable(samples,beforeById,afterById){
 return KIND_ORDER.map(kind=>{
  const rows=(samples||[]).filter(sample=>sample.kind===kind);
  const counts={
   kind,used:rows.length,exactBefore:0,exactAfter:0,provenBefore:0,provenAfter:0,
   sameIdBefore:0,sameIdAfter:0,collisionBefore:0,collisionAfter:0,
   gained:0,lost:0,otherChange:0,same:0
  };
  for(const sample of rows){
   const before=beforeById.get(sample.id);
   const after=afterById.get(sample.id);
   const beforeExact=before===sample.chosen;
   const afterExact=after===sample.chosen;
   if(beforeExact)counts.exactBefore++;
   if(afterExact)counts.exactAfter++;
   const beforeClass=choiceClass(sample,before);
   const afterClass=choiceClass(sample,after);
   if(beforeClass==='proven')counts.provenBefore++;
   if(afterClass==='proven')counts.provenAfter++;
   if(beforeClass==='same-id-unproven')counts.sameIdBefore++;
   if(afterClass==='same-id-unproven')counts.sameIdAfter++;
   if(beforeClass==='unproven-collision')counts.collisionBefore++;
   if(afterClass==='unproven-collision')counts.collisionAfter++;
   if(before===after)counts.same++;
   else if(!beforeExact&&afterExact)counts.gained++;
   else if(beforeExact&&!afterExact)counts.lost++;
   else counts.otherChange++;
  }
  return {
   ...counts,
   before:counts.used?counts.exactBefore/counts.used:null,
   after:counts.used?counts.exactAfter/counts.used:null
  };
 });
}
export function regressionsOf(table){
 return (table||[]).filter(row=>row.used>0&&row.after<row.before-1e-12).map(row=>({
  kind:row.kind,used:row.used,before:row.before,after:row.after,
  beforeExact:row.exactBefore,afterExact:row.exactAfter
 }));
}
export function annotateSeeds(beforeRates,afterRates,paired){
 const left=new Map((beforeRates||[]).map(row=>[row.seed,row]));
 const right=new Map((afterRates||[]).map(row=>[row.seed,row]));
 return (paired?.rows||[]).map(row=>{
  const prior=left.get(row.seed);
  const next=right.get(row.seed);
  return {seed:row.seed,n:prior.n,before:prior.p,after:next.p,delta:row.delta};
 });
}
export function seedDirections(rows){
 let up=0,flat=0,down=0;
 for(const row of rows||[]){
  if(row.delta>1e-12)up++;
  else if(row.delta<-1e-12)down++;
  else flat++;
 }
 return {up,flat,down,seeds:(rows||[]).length};
}
export function pairedError(paired){
 const values=(paired?.rows||[]).map(row=>row.delta);
 const seeds=values.length;
 if(seeds<2)return {se:null,t:tCritical(seeds)};
 const mean=values.reduce((sum,value)=>sum+value,0)/seeds;
 const variance=values.reduce((sum,value)=>sum+(value-mean)**2,0)/(seeds-1);
 return {se:Math.sqrt(variance/seeds),t:tCritical(seeds)};
}
export function exactRate(samples,pickedById){
 const rows=samples||[];
 if(!rows.length)return null;
 let exact=0;
 for(const sample of rows)if(pickedById.get(sample.id)===sample.chosen)exact++;
 return exact/rows.length;
}
export function weightedGap(before,after){
 if(!Number.isFinite(before)||!Number.isFinite(after))return null;
 return after-before;
}
export function judgeRound13(summary){
 return judgeRound11(summary);
}
export function stopCase(sample,picks,scoreSets){
 const endpoint=picks.endpoint;
 const row={
  ...sample,teacherIndex:sample.chosen,aIndex:picks.a,bIndex:picks.b,endpointIndex:endpoint,
  blockers:sample.blockers||blockersFrom(sample)
 };
 row.protect=protectClass(row);
 row.publicLethalKept=publicLethalKept(row);
 const error=checkedRegression(row,endpoint);
 const bucket=classifyAttack(sample,scoreSets.endpoint,endpoint);
 return {
  id:sample.id,seed:sample.seed,step:sample.step,bucket,error,
  choices:{
   teacher:actionText(sample.actions[sample.chosen]),
   a:actionText(sample.actions[picks.a]),
   b:actionText(sample.actions[picks.b]),
   endpoint:actionText(sample.actions[endpoint])
  },
  gaps:{
   a:attackGap(sample,scoreSets.a),
   b:attackGap(sample,scoreSets.b),
   endpoint:attackGap(sample,scoreSets.endpoint)
  },
  margins:{
   a:scoreSets.a[picks.a]-scoreSets.a[sample.chosen],
   b:scoreSets.b[picks.b]-scoreSets.b[sample.chosen],
   endpoint:scoreSets.endpoint[endpoint]-scoreSets.endpoint[sample.chosen]
  },
  public:publicBrief(sample)
 };
}
export function blockersFrom(sample){
 return (sample?.front||[]).filter(card=>
  (sample.actions||[]).some(action=>action?.type==='chooseBlock'&&action.uid===card.uid));
}
function percent(rate){
 return Number.isFinite(rate)?(rate*100).toFixed(1)+'%':'沒有樣本';
}
function points(value){
 return Number.isFinite(value)?(value*100).toFixed(2)+' 個百分點':'無';
}
function intervalText(paired,error){
 if(!paired||paired.low==null)return '沒有配對區間';
 const se=error?.se;
 return '平均 '+points(paired.mean)+'，標準誤 '+(Number.isFinite(se)?points(se):'無')+
  '，95% 區間 '+points(paired.low)+' 到 '+points(paired.high)+'，'+paired.seeds+' 個種子，臨界值 '+(error?.t??'無');
}
export function explainRound13(summary){
 const judged=judgeRound13(summary);
 const paired=summary.paired||{};
 const error=summary.pairedError||pairedError(paired);
 const weighted=summary.weighted||{};
 const weightedText='決策加權是 '+percent(weighted.before)+' 到 '+percent(weighted.after)+
  '。這兩個總比例相減是 '+points(weightedGap(weighted.before,weighted.after))+'，不是種子等權配對差。';
 let q1='保留種子少於 2，無法做種子配對。';
 if(judged.agreement)
  q1='有。'+paired.seeds+' 個未參與更新的保留種子，精確教師一致率相對 A 的種子等權配對差是 '+intervalText(paired,error)+'。下限高於 0。'+weightedText+'這些種子是既有開發資料，不是新的獨立確認。';
 else if(judged.wide)
  q1='證據不足。種子等權配對差是 '+intervalText(paired,error)+'，區間包含 0。'+weightedText+'沒有改學習率、輪數或權重。';
 else if(judged.negative)
  q1='沒有。種子等權配對差是 '+intervalText(paired,error)+'，區間不高於 0。'+weightedText;
 else if(paired.seeds>=2)
  q1='沒有確立。種子等權配對差是 '+intervalText(paired,error)+'。'+weightedText;
 const block=summary.block||{};
 const passBefore=block.teacherPass?block.beforePass/block.teacherPass:null;
 const passAfter=block.teacherPass?block.afterPass/block.teacherPass:null;
 const exactBefore=block.teacherBlock?block.beforeExact/block.teacherBlock:null;
 const exactAfter=block.teacherBlock?block.afterExact/block.teacherBlock:null;
 const anyBefore=block.teacherBlock?block.beforeAny/block.teacherBlock:null;
 const anyAfter=block.teacherBlock?block.afterAny/block.teacherBlock:null;
 let q2='保留組沒有足夠的阻擋決策，不能說學會區分情境或阻擋者。';
 if(block.teacherPass>0&&block.teacherBlock>0){
  const passDropped=passAfter+1e-12<passBefore;
  const anyUp=(block.afterAny||0)>(block.beforeAny||0);
  const exactUp=exactAfter>exactBefore+1e-12;
  const many=(summary.blockImprovedSeeds||[]).length>=2;
  const seeds=(summary.blockImprovedSeeds||[]).join('、')||'無';
  if(passDropped&&anyUp)
   q2='沒有。教師不擋的保持率從 '+percent(passBefore)+' 降到 '+percent(passAfter)+'，同時教師有擋時的任意阻擋從 '+percent(anyBefore)+' 增到 '+percent(anyAfter)+'。這是更常擋，不是把情境和阻擋者分開。教師阻擋者的精確一致是 '+percent(exactBefore)+' 到 '+percent(exactAfter)+'。精確改善的原始種子：'+seeds+'。';
  else if(exactUp&&many&&!passDropped)
   q2='有向教師的阻擋者靠近，而且教師不擋的保持率沒有下降。精確改善出現在 '+((summary.blockImprovedSeeds||[]).length)+' 個不同原始種子：'+seeds+'。教師不擋的保持率 '+percent(passBefore)+' 到 '+percent(passAfter)+'。教師有擋時，任意阻擋 '+percent(anyBefore)+' 到 '+percent(anyAfter)+'，指定阻擋者的精確一致 '+percent(exactBefore)+' 到 '+percent(exactAfter)+'。這是教師行為，不是因為更常阻擋就學會阻擋，也不是效果等價的證明。';
  else
   q2='沒有確立。教師不擋 '+block.teacherPass+' 筆，保持率 '+percent(passBefore)+' 到 '+percent(passAfter)+'。教師有擋 '+block.teacherBlock+' 筆，任意阻擋 '+percent(anyBefore)+' 到 '+percent(anyAfter)+'，指定阻擋者的精確一致 '+percent(exactBefore)+' 到 '+percent(exactAfter)+'。精確改善的原始種子 '+(summary.blockImprovedSeeds||[]).length+' 個：'+seeds+'。不能只因更常阻擋就說學會阻擋。';
 }
 const dropped=summary.regressions||[];
 const dropText=dropped.length?dropped.map(row=>row.kind+' '+row.used+' 筆，'+percent(row.before)+' 到 '+percent(row.after)).join('；'):'保留組沒有類型的精確一致率下降';
 const q3=judged.passed?
  (dropped.length?
   '保留組有退步：'+dropText+'。第十一輪事先要求完整揭露，不要求零退步，也不允許用總一致率上升把退步抵消。這個代價只留在模仿紀錄裡，日後若另行對局，要分開看這些類型。這一輪不採用權重。':
   '保留組沒有其他類型的精確一致率下降。這個代價可以留在模仿紀錄裡，仍然不是對局變強，這一輪也不採用權重。'):
  '不接受這份終點，也不追加同設定訓練。'+dropText+'。總一致率上升、訓練損失和與 B 的教師一致率都不是通過依據。';
 const failed=[];
 if(!judged.agreement)failed.push('種子配對區間下限沒有高於 0');
 if(!judged.blockOk)failed.push('阻擋精確改善沒有出現在至少兩個不同原始種子，或只靠第 118 步');
 if(!judged.errorsOk)failed.push('保護重播不完整，或新增了已核對的明顯戰術錯誤');
 if(!judged.disclosed)failed.push('其他類型的退步沒有完整揭露');
 const q4=judged.passed?
  '符合。四條都沿用第十一輪的既有條件，看完分數後沒有改門檻。它只支持這份開發保留資料上的模仿改善。':
  '不符合。'+failed.join('；')+'。門檻沿用第十一輪，沒有看完結果再改。';
 const q5=judged.recommend?
  '值得另行登記一場固定這份權重的對局驗證。這一輪不開打、不採用、不部署。即使條件成立，也不證明棋力、自主成長或超越 v2。':
  '不值得。不登記對局驗證，不追加訓練，也不採用這份權重。';
 const verdict=judged.passed?
  '既有模仿評估條件成立。這只是開發保留資料上的模仿改善，權重不採用。':
  (judged.insufficient?'證據不足。不追加訓練。':'既有模仿評估條件未成立。不追加訓練，權重不採用。');
 return {q1,q2,q3,q4,q5,verdict,recommend:judged.recommend,passed:judged.passed};
}
function blockSplitNote(result){
 const train=(result.trainKinds||[]).find(row=>row.kind==='block');
 const reserve=(result.reserveKinds||[]).find(row=>row.kind==='block');
 if(!train||!reserve)return '';
 return '訓練集 block 精確一致 '+percent(train.before)+' 到 '+percent(train.after)+'。訓練上升不拿來抵消保留組的下降。A 曾看過的資料 block '+percent(reserve.before)+' 到 '+percent(reserve.after)+'，只作行為保持，不進入四條條件。';
}
function frontText(cards){
 if(!cards?.length)return '場上無角色';
 return cards.map(card=>card.uid+' '+card.cardId+' BP '+card.bp+(card.ready?' 可動':' 橫置')+(card.raidDepth?' 突襲'+card.raidDepth:'')).join('；');
}
function caseText(row){
 const pub=row.public||{};
 const error=row.error?'已核對錯誤 '+row.error:'沒有進入既有已核對錯誤判準。停止攻擊本身不當成錯誤。';
 return [
  row.id+'（種子 '+row.seed+'，步 '+row.step+'，分類 '+row.bucket+'）',
  '教師 '+row.choices.teacher+'。A '+row.choices.a+'。B '+row.choices.b+'。終點 '+row.choices.endpoint+'。',
  '教師攻擊減停止的分數差：A '+formatScore(row.gaps?.a)+'，B '+formatScore(row.gaps?.b)+'，終點 '+formatScore(row.gaps?.endpoint)+'。終點所選減教師的分數差 '+formatScore(row.margins?.endpoint)+'。',
  '公開局面：回合 '+pub.turn+'，階段 '+pub.phase+'，待處理 '+pub.pending+'，行動方 '+pub.active+'，我方生命 '+pub.life+'，對手生命 '+pub.oppLife+'，手牌 '+pub.hand+'／'+pub.oppHand+'，傷害 '+pub.damage+'，impact '+pub.impact+'，攻擊者 '+pub.attackerId+' BP '+pub.attackerBp+'。',
  '我方場上：'+frontText(pub.front)+'。',
  error
 ].join('\n');
}
function formatScore(value){
 return Number.isFinite(value)?value.toFixed(4):'無';
}
function kindMarkdown(rows){
 const header='| 類型 | 樣本 | A 精確 | 終點精確 | A 對終點錯 | A 錯終點對 | 其他動作變化 | 已證明等效 A | 已證明等效終點 | 同卡號未證明 A | 同卡號未證明終點 |';
 const line='| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |';
 const body=(rows||[]).map(row=>'| '+[
  row.kind,row.used,percent(row.before),percent(row.after),row.lost,row.gained,row.otherChange,
  row.provenBefore,row.provenAfter,row.sameIdBefore,row.sameIdAfter
 ].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
function seedMarkdown(rows){
 const header='| 種子 | 決策 | A | 終點 | 配對差 |';
 const line='| --- | --- | --- | --- | --- |';
 const body=(rows||[]).map(row=>'| '+[row.seed,row.n,percent(row.before),percent(row.after),points(row.delta)].join(' | ')+' |');
 return [header,line,...body].join('\n');
}
export function renderRound13(result){
 const answers=result.answers||{};
 const lines=[
  '# 白劍神經網路第十三輪',
  '',
  '產生時間：'+result.createdAtText+'。',
  '',
  '接受第十二輪：抽樣順序對本次訓練結果有影響，不能把原因單獨歸於最後 715 次 other。這一輪只對已提交的全局洗牌終點補齊離線評估。沒有重訓、沒有改參數、沒有新資料、沒有新對局。第十一輪失敗與第十二輪診斷的原始判定維持不變。',
  '',
  '判定：'+String(result.verdict||'').replace(/。$/,'')+'。',
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
  '## 固定終點',
  '',
  '受測檔是 `'+ROUND13_SHUFFLE_FILE+'`。版本 '+result.endpoint.version+'，更新次數 '+result.endpoint.updates+'。檔案雜湊更新前 '+result.hashes.before.shuffle+'，更新後 '+result.hashes.after.shuffle+'。參數雜湊更新前 '+result.hashes.before.shuffleParameters+'，更新後 '+result.hashes.after.shuffleParameters+'。',
  '原 A 檔案雜湊更新前 '+result.hashes.before.a+'，更新後 '+result.hashes.after.a+'。參數雜湊更新前 '+result.hashes.before.aParameters+'，更新後 '+result.hashes.after.aParameters+'。版本 '+result.models.a.version+'，更新次數 '+result.models.a.updates+'。',
  '零更新副本 `'+ROUND11_ZERO_FILE+'`。版本 '+result.models.zero.version+'，更新次數 '+result.models.zero.updates+'。檔案雜湊更新前 '+result.hashes.before.zero+'，更新後 '+result.hashes.after.zero+'。與 A 的參數相同：'+(result.zeroMatchesA?'是':'否')+'。動作相同：'+(result.zeroActionsMatchA?'是':'否')+'。',
  '原 B 版本 '+result.models.b.version+'，更新次數 '+result.models.b.updates+'。檔案雜湊更新前 '+result.hashes.before.b+'，更新後 '+result.hashes.after.b+'。與 B 的教師一致率只作模仿參考，不能據此說棋力高於 B。',
  '正式 v2 檔案雜湊更新前 '+result.hashes.before.v2+'，更新後 '+result.hashes.after.v2+'。',
  '沒有改版本字串，沒有重存權重，沒有挑其他檢查點。',
  result.scoresAgree?
   '推論分數和訓練前向的最高分動作一致。第十二輪公布的 61.5% 與 65.8% 來自訓練前向；這次重算相符，而且和推論選擇相同。':
   '推論分數和訓練前向的最高分動作不一致 '+result.divergence+' 筆。通過判定採用對局會打出的推論分數。第十二輪公布的決策加權比例仍是訓練前向的 61.5% 到 65.8%，這次重算為 '+result.forwardText+'。',
  '',
  '## 固定條件',
  '',
  ROUND13_STATS,
  '',
  ...ROUND13_CRITERIA.map(item=>'- '+item),
  '',
  '條件在計分前寫進計畫檔。看完分數後沒有改門檻、學習率、輪數或權重。',
  '',
  '## 資料',
  '',
  result.dataText||'',
  '',
  '這些資料已多次檢視。這一輪全部稱為開發保留評估，不稱為全新獨立確認。重建或讀取快照都不計為新驗證樣本。',
  '',
  '## 種子等權',
  '',
  '方向：改善 '+result.directions.up+'，持平 '+result.directions.flat+'，退步 '+result.directions.down+'。',
  '',
  seedMarkdown(result.seedRows),
  '',
  '## 分類比較',
  '',
  '精確一致只計教師索引。已證明等效、同卡號未證明、未證明碰撞分開列，不併進精確一致。同卡號或不同 uid 本身不算等效。',
  '',
  kindMarkdown(result.kinds),
  '',
  result.blockText||'',
  '',
  '### 退步',
  '',
  result.regressionText||'',
  '',
  blockSplitNote(result),
  '',
  '## 其他分割',
  '',
  result.otherText||'',
  '',
  '## 停止攻擊',
  '',
  result.stopText||'',
  '',
  '## 保護案例',
  '',
  result.protectionText||'',
  '',
  '原 A、原 B、正式 v2、Hard Search 2、規則、網站和晉級標準都沒有改。沒有開打對局，沒有採用或部署權重，沒有重開 v4–v7，也沒有合併到 main。'
 ];
 return lines.join('\n')+'\n';
}
export {seedPaired,checkedRegression,protectClass,publicLethalKept};
