// Round 12 diagnoses the trainer and the sample order.
// It does not adopt a weight, start a match evaluation, or change official v2.
import {createHash} from 'node:crypto';
import {LABEL_SMOOTH} from './constants.mjs';
import {sameVector} from './encode.mjs';
import {imitationGradient,imitationLoss,inspectLoss,shuffle} from './learn.mjs';
import {provenUidEquivalent} from './agree.mjs';
import {sameAction} from './loop.mjs';
import {
 ROUND11_A_FILE,ROUND11_B_FILE,ROUND11_DRAW_SEED,ROUND11_ENDPOINT_FILE,ROUND11_R10_FILE,
 ROUND11_V2_FILE,ROUND11_ZERO_FILE,TYPE_WEIGHTS,round11Rng,stratifiedEpoch
} from './round11.mjs';

export const ROUND12_A_FILE=ROUND11_A_FILE;
export const ROUND12_B_FILE=ROUND11_B_FILE;
export const ROUND12_V2_FILE=ROUND11_V2_FILE;
export const ROUND12_R10_FILE=ROUND11_R10_FILE;
export const ROUND12_R11_ZERO_FILE=ROUND11_ZERO_FILE;
export const ROUND12_R11_ENDPOINT_FILE=ROUND11_ENDPOINT_FILE;
export const ROUND12_PLAN_FILE='docs/white-sword-ai/nn-round12-plan.json';
export const ROUND12_ORDER_FILE='docs/white-sword-ai/nn-round12-order.json';
export const ROUND12_RESULT_FILE='docs/white-sword-ai/nn-round12-results.json';
export const ROUND12_REPORT_FILE='docs/white-sword-ai/NN-ROUND12.md';
export const ROUND12_STRATIFIED_FILE='training/white-sword-nn/weights/round12/actor-stratified.json';
export const ROUND12_SHUFFLE_FILE='training/white-sword-nn/weights/round12/actor-shuffle.json';
export const ROUND12_VERSION_STRATIFIED='nn-diag-r12-stratified';
export const ROUND12_VERSION_SHUFFLE='nn-diag-r12-shuffle';
export const ROUND12_LR=0.001;
export const ROUND12_SMOOTH=LABEL_SMOOTH;
export const ROUND12_EPOCHS=12;
export const ROUND12_STRATIFIED_SEED=ROUND11_DRAW_SEED;
export const ROUND12_SHUFFLE_SEED=188545;
export const FIT_PASSES=48;
export const FD_EPS=1e-5;
export const FD_COSINE=0.999;
export const FD_MEDIAN_REL=1e-4;
export const FD_FRACTION=0.95;
export const FD_POINT_REL=1e-3;
export const COLLAPSE_RATE=0.05;
export const TIE_EPS=1e-9;
export const TYPE_ORDER=Object.freeze(Object.keys(TYPE_WEIGHTS));
export const ROUND12_FROZEN_FILES=Object.freeze([
 ROUND12_A_FILE,ROUND12_B_FILE,ROUND12_V2_FILE,ROUND12_R10_FILE,
 'training/white-sword-nn/weights/round10/actor-block-0.json',
 ROUND12_R11_ZERO_FILE,ROUND12_R11_ENDPOINT_FILE
]);
export const RECORDED_TRAIN_COUNTS=Object.freeze({
 other:2305,play:1115,effect:1591,attack:978,trigger:424,block:749
});
export const RECORDED_TAIL=Object.freeze({
 samples:7162,lastAttack:5082,afterAttack:2079,tail:715
});

export function assertWritable(file){
 if(ROUND12_FROZEN_FILES.includes(file))throw Error('Refusing to write a frozen weight');
}
export function stratifiedKinds(counts,weights=TYPE_WEIGHTS){
 const bags=new Map(TYPE_ORDER.map(kind=>[kind,counts?.[kind]||0]));
 const sequence=[];
 let pending=TYPE_ORDER.reduce((sum,kind)=>sum+(counts?.[kind]||0),0);
 while(pending){
  let moved=false;
  for(const kind of TYPE_ORDER){
   const take=weights[kind]||0;
   let left=bags.get(kind)||0;
   for(let i=0;i<take&&left;i++){
    sequence.push(kind);
    left--;
    pending--;
    moved=true;
   }
   bags.set(kind,left);
  }
  if(!moved)break;
 }
 if(sequence.length!==TYPE_ORDER.reduce((sum,kind)=>sum+(counts?.[kind]||0),0))
  throw Error('Kind course dropped or repeated a sample');
 return courseStats(sequence);
}
export function courseStats(sequence){
 const lastAttack=sequence.lastIndexOf('attack');
 let tail=0;
 for(let index=sequence.length-1;index>=0&&sequence[index]==='other';index--)tail++;
 const tailCounts={};
 for(const kind of sequence.slice(sequence.length-tail))
  tailCounts[kind]=(tailCounts[kind]||0)+1;
 return {
  length:sequence.length,lastAttack,
  afterAttack:lastAttack<0?sequence.length:sequence.length-1-lastAttack,
  tail,tailCounts,sequence
 };
}
export function featureKey(sample){
 const hash=createHash('sha256');
 for(const row of sample?.rows||[]){
  const buffer=Buffer.allocUnsafe(row.length*8);
  for(let index=0;index<row.length;index++)buffer.writeDoubleLE(row[index],index*8);
  hash.update(buffer);
 }
 return hash.digest('hex');
}
function teacherEquivalent(left,right,identities){
 if(sameAction(left,right))return true;
 return provenUidEquivalent(identities,left,right);
}
export function distinguishable(sample){
 const teacher=sample?.rows?.[sample.chosen];
 if(!teacher)return false;
 const identities=new Map(sample.identities||[]);
 for(let index=0;index<sample.rows.length;index++){
  if(index===sample.chosen||!sameVector(sample.rows[index],teacher))continue;
  if(!teacherEquivalent(sample.actions[index],sample.actions[sample.chosen],identities))return false;
 }
 return true;
}
export function conflictingGroups(samples){
 const groups=new Map();
 for(const sample of samples||[]){
  const key=featureKey(sample);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(sample);
 }
 const conflicts=[];
 for(const [key,list] of groups){
  if(list.length<2)continue;
  const identities=new Map(list[0].identities||[]);
  const first=list[0].actions[list[0].chosen];
  const clash=list.some(sample=>!teacherEquivalent(first,sample.actions[sample.chosen],identities));
  if(clash)conflicts.push({
   key,ids:list.map(sample=>sample.id),chosen:list.map(sample=>sample.chosen),
   kinds:[...new Set(list.map(sample=>sample.kind))]
  });
 }
 return conflicts;
}
export function selectFitSamples(samples,wrongIds){
 const wrong=new Set(wrongIds||[]);
 const counts=new Map();
 for(const sample of samples||[]){
  const key=featureKey(sample);
  counts.set(key,(counts.get(key)||0)+1);
 }
 const picked=[];
 for(const kind of TYPE_ORDER){
  const rows=(samples||[]).filter(sample=>sample.kind===kind)
   .slice().sort((left,right)=>left.id<right.id?-1:left.id>right.id?1:0);
  const found=rows.find(sample=>counts.get(featureKey(sample))===1&&distinguishable(sample)&&wrong.has(sample.id));
  if(found)picked.push(found);
 }
 return picked;
}
export function fitPassed(beforeLoss,afterLoss,beforeExact,afterExact,count){
 return count>=1&&afterLoss<beforeLoss&&afterExact>beforeExact;
}
export function probeIndexes(net){
 const indexes=new Set();
 for(let index=0;index<net.theta.length;index+=200)indexes.add(index);
 const last=net.layers[net.layers.length-1];
 for(let index=0;index<last.input*last.output;index++)indexes.add(last.weight+index);
 for(let index=0;index<last.output;index++)indexes.add(last.bias+index);
 return [...indexes].sort((left,right)=>left-right);
}
export function compareGradient(rows){
 let dot=0,leftNorm=0,rightNorm=0;
 const rels=[];
 for(const row of rows||[]){
  dot+=row.analytical*row.numerical;
  leftNorm+=row.analytical*row.analytical;
  rightNorm+=row.numerical*row.numerical;
  rels.push(Math.abs(row.analytical-row.numerical)/Math.max(1e-8,Math.abs(row.analytical),Math.abs(row.numerical)));
 }
 const cosine=leftNorm>0&&rightNorm>0?dot/Math.sqrt(leftNorm*rightNorm):(leftNorm===0&&rightNorm===0?1:0);
 const active=(rows||[]).filter(row=>Math.max(Math.abs(row.analytical),Math.abs(row.numerical))>1e-6);
 const judged=active.length?active:rows||[];
 const activeRels=judged.map(row=>Math.abs(row.analytical-row.numerical)/Math.max(1e-8,Math.abs(row.analytical),Math.abs(row.numerical))).sort((left,right)=>left-right);
 const medianRel=activeRels.length?activeRels[activeRels.length>>1]:null;
 const close=activeRels.filter(value=>value<=FD_POINT_REL).length;
 const fraction=activeRels.length?close/activeRels.length:0;
 return {
  cosine,medianRel,maxRel:activeRels.length?activeRels[activeRels.length-1]:null,
  fraction,checked:rels.length,active:judged.length,
  pass:cosine>=FD_COSINE&&medianRel<=FD_MEDIAN_REL&&fraction>=FD_FRACTION
 };
}
export function finiteDifference(net,sample,indexes,{eps=FD_EPS,smooth=ROUND12_SMOOTH}={}){
 const base=imitationGradient(net,sample,{smooth});
 if(!base)throw Error('Finite difference sample is not usable');
 const rows=[];
 for(const index of indexes){
  const saved=net.theta[index];
  try{
   net.theta[index]=saved+eps;
   const up=imitationLoss(net,[sample],{smooth}).loss;
   net.theta[index]=saved-eps;
   const down=imitationLoss(net,[sample],{smooth}).loss;
   rows.push({index,analytical:base.grad[index],numerical:(up-down)/(2*eps)});
  }finally{
   net.theta[index]=saved;
  }
 }
 return {...compareGradient(rows),loss:base.loss};
}
export function classifyAttack(sample,scores,picked){
 const teacher=sample?.actions?.[sample.chosen];
 const action=sample?.actions?.[picked];
 if(!teacher||teacher.type!=='attack')return 'teacher-not-attack';
 if(picked===sample.chosen)return 'exact';
 let best=scores[0];
 for(const score of scores)if(score>best)best=score;
 let ties=0;
 for(const score of scores)if(Math.abs(score-best)<=TIE_EPS)ties++;
 if(ties>1&&Math.abs(scores[picked]-best)<=TIE_EPS)return 'tie';
 if(action?.type==='next')return 'stop';
 if(action?.type==='attack'&&action.uid!==teacher.uid)return 'other-character';
 if(action?.type==='attack')return 'other-target';
 if(sample.rows&&sameVector(sample.rows[picked],sample.rows[sample.chosen]))return 'unproven-collision';
 if(provenUidEquivalent(new Map(sample.identities||[]),action,teacher))return 'unproven-same-shape';
 return 'unproven-other';
}
export function attackGap(sample,scores){
 const next=sample.actions.findIndex(action=>action?.type==='next');
 if(next<0)return null;
 return scores[sample.chosen]-scores[next];
}
export function emptyAttackCounts(){
 return {
  n:0,exact:0,tie:0,stop:0,otherCharacter:0,otherTarget:0,
  unprovenCollision:0,unprovenSameShape:0,unprovenOther:0,teacherNotAttack:0,
  gapSum:0,gapN:0
 };
}
const ATTACK_KEY={
 exact:'exact',tie:'tie',stop:'stop','other-character':'otherCharacter','other-target':'otherTarget',
 'unproven-collision':'unprovenCollision','unproven-same-shape':'unprovenSameShape',
 'unproven-other':'unprovenOther','teacher-not-attack':'teacherNotAttack'
};
export function addAttack(counts,bucket,gap){
 counts.n++;
 counts[ATTACK_KEY[bucket]]++;
 if(gap!=null){
  counts.gapSum+=gap;
  counts.gapN++;
 }
}
export function labelAudit(samples){
 let invalid=0,attackMismatch=0;
 for(const sample of samples||[]){
  if(!Number.isInteger(sample.chosen)||sample.chosen<0||sample.chosen>=(sample.actions?.length||0))invalid++;
  else if(sample.kind==='attack'&&sample.actions[sample.chosen]?.type!=='attack')attackMismatch++;
 }
 return {invalid,attackMismatch,ok:invalid===0&&attackMismatch===0};
}
export function truncationOf(scores,chosen,smooth=ROUND12_SMOOTH){
 const parts=inspectLoss(scores,chosen,smooth);
 let max=scores[0],min=scores[0],minProb=parts.probs[0];
 for(const score of scores){
  if(score>max)max=score;
  if(score<min)min=score;
 }
 for(const prob of parts.probs)if(prob<minProb)minProb=prob;
 return {gap:max-min,minProb,clamped:parts.clamped,floored:parts.floored};
}
export function sameCounts(left,right){
 const keys=new Set([...Object.keys(left||{}),...Object.keys(right||{})]);
 for(const key of keys)if((left?.[key]||0)!==(right?.[key]||0))return false;
 return true;
}
export function sameMembers(left,right){
 const a=[...(left||[])].map(value=>String(value)).sort();
 const b=[...(right||[])].map(value=>String(value)).sort();
 return a.length===b.length&&a.every((value,index)=>value===b[index]);
}
export function compareLedger(rebuilt,recorded){
 const mismatches=[];
 const bySeed=new Map((recorded||[]).map(row=>[row.seed,row]));
 if((rebuilt||[]).length!==(recorded||[]).length)mismatches.push('game count '+((rebuilt||[]).length)+'/'+((recorded||[]).length));
 for(const game of rebuilt||[]){
  const row=bySeed.get(game.seed);
  if(!row){
   mismatches.push('unexpected '+game.seed);
   continue;
  }
  for(const key of ['role','source','first','status','winner','steps','samples']){
   if(game[key]!==row[key])mismatches.push(game.seed+' '+key+' '+game[key]+'/'+row[key]);
  }
 }
 for(const row of recorded||[])if(!(rebuilt||[]).some(game=>game.seed===row.seed))mismatches.push('missing '+row.seed);
 return {matched:mismatches.length===0,mismatches};
}
export function hashSamples(samples){
 const hash=createHash('sha256');
 for(const sample of samples||[]){
  hash.update(String(sample.id));
  hash.update('\0');
  hash.update(String(sample.chosen));
  hash.update('\0');
  hash.update(JSON.stringify((sample.actions||[]).map(action=>({
   type:action?.type||null,uid:action?.uid??null,targetUid:action?.targetUid??null,mode:action?.mode??null
  }))));
  hash.update('\0');
  hash.update(featureKey(sample));
  hash.update('\0');
 }
 return hash.digest('hex');
}
export function permutationOnce(samples,ordered){
 if(ordered.length!==samples.length)return false;
 const seen=new Set(ordered.map(sample=>sample.id));
 return seen.size===samples.length&&samples.every(sample=>seen.has(sample.id));
}
export function shuffledEpoch(samples,rng){
 return shuffle(samples,rng);
}
export function stratifiedOrder(samples,rng){
 return stratifiedEpoch(samples,rng,TYPE_WEIGHTS);
}
export function makeRng(seed){
 return round11Rng(seed);
}
function mean(values){
 if(!values.length)return null;
 return values.reduce((sum,value)=>sum+value,0)/values.length;
}
export function tailDeltas(curve){
 const out={};
 for(const kind of TYPE_ORDER)out[kind]=[];
 for(let epoch=0;epoch<ROUND12_EPOCHS;epoch++){
  const before=(curve||[]).find(row=>row.point==='before-tail'&&row.epoch===epoch);
  const after=(curve||[]).find(row=>row.point==='epoch-end'&&row.epoch===epoch);
  if(!before||!after)continue;
  for(const kind of TYPE_ORDER)
   out[kind].push(after.kinds[kind].rate-before.kinds[kind].rate);
 }
 return Object.fromEntries(TYPE_ORDER.map(kind=>({kind,mean:mean(out[kind]||[]),epochs:(out[kind]||[]).length}))
  .map(row=>[row.kind,row]));
}
export function judgeRound12(summary){
 const fd=summary.finiteDifference||{};
 const truncation=summary.truncation||{};
 const fit=summary.fit||{};
 const stratified=summary.stratified||{};
 const shuffled=summary.shuffle||{};
 const learnerOk=fd.pass===true&&summary.labelsOk===true&&(summary.divergence?.greedy||0)===0&&truncation.initInactive===true;
 let q1;
 if(learnerOk&&truncation.endpointInactive===true)
  q1='學習器、標籤和分數計算在這份資料上一致。有限差分通過，教師索引都在合法動作內，推論與訓練前向沒有選出不同動作。對數下限和 exp 截斷在初始化與第十一輪終點都沒有啟動。';
 else if(learnerOk&&truncation.endpointInactive===false)
  q1='初始化附近的學習器、標籤和分數計算一致，有限差分通過。第十一輪終點已有決策進入對數下限或 exp 截斷，那個區間的反向傳播訊號不等於被截斷損失的導數。這次對照沒有改損失，避免把修正和抽樣混在一起。';
 else
  q1='沒有確認學習器完全正確。有限差分 '+(fd.pass?'通過':'未通過')+'，標籤 '+(summary.labelsOk?'合法':'有問題')+'，推論與訓練前向不一致 '+(summary.divergence?.greedy??'未測')+' 筆，初始化截斷 '+(truncation.initInactive?'未啟動':'已啟動')+'。';
 const q2=fit.count?fit.passed?
  '可以。'+fit.count+' 筆特徵可區分、標籤不一致的訓練樣本，在 '+FIT_PASSES+' 輪後同批損失從 '+formatNum(fit.lossBefore)+' 降到 '+formatNum(fit.lossAfter)+'，精確一致從 '+fit.exactBefore+' 增到 '+fit.exactAfter+'。衝突標籤另列，沒有拿來當這個小測的失敗。':
  '沒有。'+fit.count+' 筆小測在 '+FIT_PASSES+' 輪後，損失 '+formatNum(fit.lossBefore)+' 到 '+formatNum(fit.lossAfter)+'，精確一致 '+fit.exactBefore+' 到 '+fit.exactAfter+'。沒有加輪或改學習率。':
  '無法組成小測。每一類都沒有同時滿足特徵唯一、動作可區分、而且初始化判斷錯誤的訓練樣本。';
 const deltas=summary.tailDelta||{};
 const otherKinds=TYPE_ORDER.filter(kind=>kind!=='attack'&&deltas[kind]?.mean<0);
 const attackTail=attackTailNote(summary.stratified?.curve,deltas.attack?.mean);
 const q3=(otherKinds.length?
  '有。原順序在尾段前後，'+otherKinds.map(kind=>kind+' 平均 '+(deltas[kind].mean*100).toFixed(2)+' 個百分點').join('、')+'。':
  '沒有看到其他類型在尾段平均退步。各類尾段平均變化：'+TYPE_ORDER.filter(kind=>kind!=='attack').map(kind=>kind+' '+(deltas[kind]?.mean==null?'無':(deltas[kind].mean*100).toFixed(2)+' 個百分點')).join('、')+'。')+attackTail;
 const lossImproved=shuffled.fullLoss<stratified.fullLoss;
 const attackImproved=shuffled.trainAttackRate>stratified.trainAttackRate;
 let q4;
 if(lossImproved&&attackImproved)
  q4='可以改善這次的訓練損失和訓練集攻擊崩落。分層整批損失 '+formatNum(stratified.fullLoss)+'，洗牌 '+formatNum(shuffled.fullLoss)+'。訓練集攻擊精確一致 '+(stratified.trainAttackRate*100).toFixed(1)+'% 到 '+(shuffled.trainAttackRate*100).toFixed(1)+'%。這只比較兩組終點，沒有用保留組挑權重。';
 else if(lossImproved||attackImproved)
  q4='只改善其中一項。損失 '+(lossImproved?'洗牌較低':'洗牌沒有較低')+'（分層 '+formatNum(stratified.fullLoss)+'，洗牌 '+formatNum(shuffled.fullLoss)+'）。訓練集攻擊精確一致 '+(stratified.trainAttackRate*100).toFixed(1)+'% 與 '+(shuffled.trainAttackRate*100).toFixed(1)+'%。';
 else
  q4='沒有。分層整批損失 '+formatNum(stratified.fullLoss)+'，洗牌 '+formatNum(shuffled.fullLoss)+'。訓練集攻擊精確一致 '+(stratified.trainAttackRate*100).toFixed(1)+'% 與 '+(shuffled.trainAttackRate*100).toFixed(1)+'%。';
 const bothCollapsed=stratified.trainAttackRate<COLLAPSE_RATE&&shuffled.trainAttackRate<COLLAPSE_RATE;
 const bothLossFailed=!(stratified.fullLoss<summary.initLoss)||!(shuffled.fullLoss<summary.initLoss);
 let orderText;
 if(lossImproved&&attackImproved)
  orderText='有對照支持這次順序會影響訓練損失和訓練集攻擊一致率。它只說明這組對照，不說明泛化、棋力或穩定自主成長。保留組數字不參與這個判斷。';
 else if(lossImproved||attackImproved)
  orderText='只是部分解釋。洗牌沒有同時改善整批損失和訓練集攻擊一致率。';
 else if(bothCollapsed&&bothLossFailed)
  orderText='仍無法確認順序是原因。兩組訓練集攻擊精確一致都低於 '+(COLLAPSE_RATE*100)+'%，而且沒有都把整批損失降到初始化以下。停止追加同一設定。';
 else
  orderText='仍無法確認。洗牌沒有同時改善整批損失和訓練集攻擊一致率，現有證據不夠把尾段順序說成退步原因。停止追加同一設定。';
 const limit=attackTailLimit(summary.stratified?.curve);
 const q5=(summary.ledgerMatched?orderText:'重建沒有對上第十一輪的逐場紀錄，不能說已經精確重現。就這份共用快照而言，'+orderText)+limit;
 const verdict=!summary.ledgerMatched?'重建未完全對上紀錄':
  lossImproved&&attackImproved?'順序對照有差異':
  '順序不足以解釋這次訓練結果';
 return {q1,q2,q3,q4,q5,verdict,learnerOk,lossImproved,attackImproved};
}
function attackCounts(curve,point,epoch){
 const row=(curve||[]).find(item=>item.point===point&&item.epoch===epoch);
 return row?row.attacks:null;
}
function attackTailNote(curve,mean){
 if(!curve)return '這是訓練診斷集上的變化，還不是退步原因的證明。';
 const meanText=Number.isFinite(mean)?'攻擊尾段平均 '+(mean*100).toFixed(2)+' 個百分點。':'';
 const init=attackCounts(curve,'init',-1);
 const before=attackCounts(curve,'before-tail',0);
 const after=attackCounts(curve,'epoch-end',0);
 const detail=init&&before&&after?
  '第 0 輪在最後一段 other 之前，精確攻擊已從 '+init.exact+'/'+init.n+' 降到 '+before.exact+'/'+before.n+'，尾段再降到 '+after.exact+'/'+after.n+'。':'';
 return meanText+detail+'多數後續輪次在尾段前已接近 0，所以攻擊的平均變化會被拉小。這仍不是把最後一段單獨當成原因。';
}
function attackTailLimit(curve){
 const before=attackCounts(curve,'before-tail',0);
 const init=attackCounts(curve,'init',-1);
 if(!init||!before||before.exact>=init.exact)return '';
 return '不能把原因縮成最後一段 other：第 0 輪的崩落在進入那段之前已經發生。這次沒有在最後一次 attack 更新當下再記檢查點，所以還分不開是 attack 更新本身，還是其後、尾段之前的更新先把攻擊忘掉。有對照的是整段分層順序。';
}
function formatNum(value){
 if(!Number.isFinite(value))return '無';
 if(value!==0&&Math.abs(value)<1e-4)return value.toExponential(2);
 return value.toFixed(4);
}
function percent(value){
 return Number.isFinite(value)?(value*100).toFixed(1)+'%':'無';
}
function kindLine(row){
 return TYPE_ORDER.map(kind=>{
  const item=row.kinds[kind];
  return kind+' '+percent(item.rate)+'/'+formatNum(item.loss);
 }).join('，');
}
function attackLine(row){
 const item=row.attacks;
 const gap=item.gapN?item.gapSum/item.gapN:null;
 return '攻擊 '+item.exact+'/'+item.n+'，停止 '+item.stop+'，其他角色 '+item.otherCharacter+'，其他目標 '+item.otherTarget+'，未證明 '+(item.unprovenCollision+item.unprovenSameShape+item.unprovenOther)+'，同分 '+item.tie+'，分差 '+formatNum(gap);
}
export function renderRound12(result){
 const answers=result.answers||{};
 const lines=[
  '# 白劍神經網路第十二輪',
  '',
  '產生時間：'+result.createdAtText+'。',
  '',
  '接受第十一輪：該終點不採用，也不送對局評估。這一輪只檢查學習器和抽樣順序。沒有新對局、沒有新資料、沒有跑 PPO，也沒有換特徵或架構。',
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
  '## 資料',
  '',
  '第十一輪沒有保存特徵快照。這次依原排程重播。逐場紀錄相符：'+(result.ledgerMatched?'是':'否')+'。分布相符：'+(result.distMatched?'是':'否')+'。阻擋教師統計相符：'+(result.blockMatched?'是':'否')+'。',
  '訓練雜湊 '+result.hashes.train+'。保留雜湊 '+result.hashes.holdout+'。本輪更新保留雜湊 '+result.hashes.reserve+'。兩組對照共用這三份。',
  result.ledgerMatched?'特徵位元組沒有第十一輪的原始雜湊可比。權重是否重現，看分層終點和第十一輪終點的距離。':'逐場紀錄沒有全部相符，不能把這次重播說成第十一輪的精確重現。',
  '分層終點與第十一輪終點的參數距離 '+result.distanceToRound11+'。參數逐項相同：'+(result.distanceToRound11===0?'是':'否')+'。檔案雜湊相同：'+(result.reproducedRound11?'是':'否')+'。檔案雜湊不同只來自版本字串，不代表參數不同。',
  '',
  '## 固定計畫',
  '',
  '學習率 '+ROUND12_LR+'，標籤平滑 '+ROUND12_SMOOTH+'，12 輪，每筆訓練樣本每輪一次。優化器是既有 AdamW，衰減 1e-5，動量各自從零開始。',
  '甲使用第十一輪 stratifiedEpoch，抽樣種子 '+ROUND12_STRATIFIED_SEED+'。乙每輪全局洗牌，抽樣種子 '+ROUND12_SHUFFLE_SEED+'。',
  '尾段定義是分層輪轉最後連續的 other。這份訓練分布的尾段長度 '+result.tail.tail+'，最後一次 attack 的位置 '+result.tail.lastAttack+'，其後還有 '+result.tail.afterAttack+' 次更新。洗牌組也在同一更新序號記錄，不用它自己的尾段長度挑終點。',
  '小測最多 '+FIT_PASSES+' 輪，資料是每一類第一筆特徵唯一、動作可區分、而且初始化判斷錯誤的訓練樣本。通過條件是同批損失下降且精確一致增加。沒有加輪。',
  '有限差分用中央差分，步長 '+FD_EPS+'，檢查每 200 個參數和整個最後一層。通過條件是餘弦至少 '+FD_COSINE+'、相對誤差中位數不超過 '+FD_MEDIAN_REL+'、至少 '+(FD_FRACTION*100)+'% 的有效檢查點相對誤差不超過 '+FD_POINT_REL+'。絕對值不超過 1e-6 的梯度不計入比例。ReLU 在 0 不可微，所以允許少數點偏離。',
  '診斷集是全部訓練樣本。保留組只在兩組終點各評一次，不用來改學習率、輪數或挑權重。',
  '',
  '## 第十一輪終點的攻擊決策',
  '',
  attackLine({attacks:result.round11Attacks}),
  '教師索引非法 '+result.labels.holdoutAttack.invalid+' 筆，種類和教師動作不符 '+result.labels.holdoutAttack.attackMismatch+' 筆。',
  '推論與訓練前向的最高分不一致 '+result.divergence.endpoint.greedy+' 筆，最大分數差 '+formatNum(result.divergence.endpoint.maxAbs)+'。',
  '精確一致為 0 時，上面的分類才是終點實際選了什麼。停止攻擊只計嚴格較高的 next，同分另計。',
  '',
  '## 小測與截斷',
  '',
  '衝突特徵組 '+result.fit.conflicts+' 組。樣本內不可區分 '+result.fit.internal+' 筆。小測採用 '+result.fit.ids.join('、')+'。',
  '初始化截斷：最大分差 '+formatNum(result.truncation.init.maxGap)+'，最小機率 '+formatNum(result.truncation.init.minProb)+'，啟動 '+(result.truncation.initInactive?'否':'是')+'。',
  '第十一輪終點截斷：最大分差 '+formatNum(result.truncation.endpoint.maxGap)+'，最小機率 '+formatNum(result.truncation.endpoint.minProb)+'，啟動 '+(result.truncation.endpointInactive?'否':'是')+'。',
  '分差超過 20 時，exp 截斷後的反向傳播訊號不等於該損失的導數。這份資料的最大分差低於 20，最小機率高於 1e-8，截斷沒有啟動，所以兩組對照沿用原學習器。',
  '',
  '## 診斷曲線',
  ''
 ];
 for(const [title,group] of [['甲 分層',result.stratified],['乙 洗牌',result.shuffle]]){
  lines.push('### '+title,'','整批終點損失 '+formatNum(group.fullLoss)+'。初始化損失 '+formatNum(result.initLoss)+'。','');
  lines.push('| 輪 | 位置 | 損失 | 攻擊 | 近期 |');
  lines.push('| --- | --- | --- | --- | --- |');
  for(const row of group.curve){
   lines.push('| '+(row.epoch<0?'初始':row.epoch)+' | '+row.point+' | '+formatNum(row.loss)+' | '+attackLine(row)+' | '+JSON.stringify(row.recent)+' |');
  }
  lines.push('','種類一致率與該類交叉熵：','');
  for(const row of group.curve){
   if(row.point==='init'||row.epoch===0||row.epoch===11)
    lines.push('- '+(row.epoch<0?'初始':row.epoch+' '+row.point)+'：'+kindLine(row));
  }
  lines.push('');
 }
 lines.push(
  '## 保留組終點',
  '',
  '這組數字事前指定，只作對照，沒有拿來加輪或選模。',
  '',
  '| 模型 | 整體精確 | 攻擊精確 | 攻擊停止 | 攻擊其他角色 |',
  '| --- | --- | --- | --- | --- |',
  '| A | '+percent(result.holdout.A.exact)+' | '+percent(result.holdout.A.attack)+' | '+result.holdout.A.stop+' | '+result.holdout.A.otherCharacter+' |',
  '| 第十一輪終點 | '+percent(result.holdout.r11.exact)+' | '+percent(result.holdout.r11.attack)+' | '+result.holdout.r11.stop+' | '+result.holdout.r11.otherCharacter+' |',
  '| 甲 | '+percent(result.holdout.stratified.exact)+' | '+percent(result.holdout.stratified.attack)+' | '+result.holdout.stratified.stop+' | '+result.holdout.stratified.otherCharacter+' |',
  '| 乙 | '+percent(result.holdout.shuffle.exact)+' | '+percent(result.holdout.shuffle.attack)+' | '+result.holdout.shuffle.stop+' | '+result.holdout.shuffle.otherCharacter+' |',
  '',
  '診斷權重留在 `'+ROUND12_STRATIFIED_FILE+'` 和 `'+ROUND12_SHUFFLE_FILE+'`。它們不是候選，不送對局評估，也不部署。',
  '原 A、原 B、正式 v2、第十輪和第十一輪終點都只讀。正式 v2、Hard Search 2、規則、網站和晉級標準沒有改。沒有合併 main。'
 );
 return lines.join('\n')+'\n';
}
