// Agreement separates an exact action from a copy that differs only by a
// resolved uid. A shared feature vector is not proof that two actions match.
import {sameVector} from './encode.mjs';
import {forwardTrain,greedyIndex} from './net.mjs';

const UID=/^[01]-\d+$/;

function visibleIdentity(identities,uid){
 const card=identities.get(uid);
 if(!card||typeof card.cardId!=='string'||!card.cardId)return null;
 return card.cardId+(card.faceDown?'#down':'#up');
}
function sameShape(left,right,identities,diff){
 if(Array.isArray(left)||Array.isArray(right)){
  if(!Array.isArray(left)||!Array.isArray(right)||left.length!==right.length)return false;
  for(let index=0;index<left.length;index++){
   if(!sameShape(left[index],right[index],identities,diff))return false;
  }
  return true;
 }
 if(left&&right&&typeof left==='object'&&typeof right==='object'){
  const keys=new Set([...Object.keys(left),...Object.keys(right)]);
  for(const key of keys){
   if(!(key in left)||!(key in right))return false;
   if(!sameShape(left[key],right[key],identities,diff))return false;
  }
  return true;
 }
 if(typeof left==='string'&&typeof right==='string'&&UID.test(left)&&UID.test(right)){
  if(left===right)return true;
  const from=visibleIdentity(identities,left);
  const to=visibleIdentity(identities,right);
  if(!from||from!==to)return false;
  diff.uid++;
  return true;
 }
 return Object.is(left,right);
}
export function provenUidEquivalent(identities,left,right){
 if(!left||!right||typeof left!=='object'||typeof right!=='object')return false;
 const diff={uid:0};
 if(!sameShape(left,right,identities,diff))return false;
 return diff.uid>0;
}
export function classifyChoice(chosen,picked,identities,actions,rows){
 if(picked===chosen)return 'exact';
 if(provenUidEquivalent(identities,actions[picked],actions[chosen]))return 'uid';
 if(rows&&sameVector(rows[picked],rows[chosen]))return 'unproven-collision';
 return 'disagree';
}
export function imitationAgreement(net,samples){
 const totals={used:0,exact:0,uidEquivalent:0,disagree:0,unprovenCollision:0};
 for(const sample of samples){
  const width=sample.rows?.length||0;
  if(width<2||!sample.actions||sample.actions.length!==width)continue;
  if(!Number.isInteger(sample.chosen)||sample.chosen<0||sample.chosen>=width)continue;
  const scores=Float64Array.from(sample.rows,row=>forwardTrain(net,row).q);
  const identities=new Map(sample.identities||[]);
  const picked=greedyIndex(scores,sample.actions);
  const kind=classifyChoice(sample.chosen,picked,identities,sample.actions,sample.rows);
  totals.used++;
  if(kind==='exact')totals.exact++;
  else if(kind==='uid')totals.uidEquivalent++;
  else{
   totals.disagree++;
   if(kind==='unproven-collision')totals.unprovenCollision++;
  }
 }
 const rate=key=>totals.used?totals[key]/totals.used:null;
 return {
  ...totals,
  exactRate:rate('exact'),
  uidRate:rate('uidEquivalent'),
  disagreeRate:rate('disagree')
 };
}
