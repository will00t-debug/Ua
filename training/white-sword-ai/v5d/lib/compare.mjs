// Pairwise rechoice inside the hard cap. A rule never adds points to the blend,
// and it never removes an action that was not the compared loser.
import {blendScore,chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {HARD_CAP,SCALE,WEIGHT_CLIP} from '../../v4b2/lib/protocol.mjs';
import {specificSide} from '../../v5c/lib/columns.mjs';

function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function signatureOf(side){
 if(!side)return null;
 const body=side.action||parsed(side.key);
 if(!body?.type)return null;
 if(body.type==='next')return {type:'next',card:null,line:null};
 const named=specificSide(side);
 return named?{type:named.type,card:named.card,line:named.line||null}:null;
}
export function sameSignature(left,right){
 return !!left&&!!right&&left.type===right.type&&(left.card||null)===(right.card||null)&&(left.line||null)===(right.line||null);
}
export function signatureKey(signature){
 if(!signature)return '';
 return signature.type+'|'+(signature.card||'')+'|'+(signature.line||'');
}
export function pairDirection(row){
 const loser=signatureOf(row?.actionA);
 const winner=signatureOf(row?.actionB);
 if(!loser||!winner||sameSignature(loser,winner))return null;
 return {loser,winner,key:signatureKey(loser)+'=>'+signatureKey(winner)};
}
export function matchingRule(baseSignature,poolSignatures,rules){
 const hits=(rules||[]).filter(rule=>sameSignature(baseSignature,rule?.loser)&&(poolSignatures||[]).some(signature=>sameSignature(signature,rule?.winner)));
 return hits.length===1?hits[0]:null;
}
export function cappedPool(band){
 if(!band?.length)return [];
 const top=Math.max(...band.map(row=>row.hard));
 return band.filter(row=>top-row.hard<=HARD_CAP+1e-6);
}
export function cappedChoice(band,weights){
 const pool=cappedPool(band);
 return chooseKey(pool.length?pool:(band||[]),weights,SCALE);
}
export function choiceRules(band,weights,rules){
 const pool=cappedPool(band);
 const source=pool.length?pool:(band||[]);
 const base=chooseKey(source,weights,SCALE);
 if(!rules?.length||!pool.length)return base;
 const baseRow=pool.find(row=>row.key===base);
 const rule=matchingRule(signatureOf(baseRow),pool.map(signatureOf),rules);
 if(!rule)return base;
 const winners=pool.filter(row=>sameSignature(signatureOf(row),rule.winner));
 if(!winners.length)return base;
 return chooseKey(winners,weights,SCALE);
}
function grouped(rows){
 const map=new Map();
 for(const row of rows||[]){
  const pair=pairDirection(row);
  if(!pair)continue;
  const info=map.get(pair.key)||{...pair,ids:[]};
  info.ids.push(row.id);
  map.set(pair.key,info);
 }
 return map;
}
export function learnRules(trainRows,validationRows){
 const train=grouped(trainRows);
 const conflicts=[];
 const rules=[];
 for(const info of train.values()){
  const reverse=signatureKey(info.winner)+'=>'+signatureKey(info.loser);
  if(train.has(reverse)){conflicts.push(info.key);continue;}
  rules.push(info);
 }
 const support=[];
 const opposite=[];
 for(const row of validationRows||[]){
  const pair=pairDirection(row);
  if(!pair)continue;
  if(rules.some(rule=>sameSignature(rule.loser,pair.loser)&&sameSignature(rule.winner,pair.winner)))support.push(row.id);
  if(rules.some(rule=>sameSignature(rule.loser,pair.winner)&&sameSignature(rule.winner,pair.loser)))opposite.push(row.id);
 }
 let reason=null;
 if(!train.size)reason='訓練沒有已確認的方向';
 else if(conflicts.length)reason='訓練同時確認了相反方向';
 else if(opposite.length)reason='驗證確認了相反方向';
 else if(!support.length)reason='驗證沒有獨立確認同一方向';
 const learned=reason?[]:rules.map(rule=>({
  loser:{type:rule.loser.type,card:rule.loser.card,line:rule.loser.line},
  winner:{type:rule.winner.type,card:rule.winner.card,line:rule.winner.line},
  trainIds:[...rule.ids]
 }));
 return {ok:!reason,rules:learned,conflicts,support,opposite,reason};
}
export function residualLead(position,weights){
 const left=position?.band?.find(row=>row.key===position.actionA?.key);
 const right=position?.band?.find(row=>row.key===position.actionB?.key);
 if(!left||!right)return null;
 const lead=blendScore(left.hard,weights,left.features||[],SCALE)-blendScore(right.hard,weights,right.features||[],SCALE);
 return {lead,maxMove:SCALE*WEIGHT_CLIP,canFlip:lead<=SCALE*WEIGHT_CLIP+1e-9};
}
export function switchesToAlternative(position,weights,rules){
 return !!position?.actionB&&choiceRules(position.band,weights,rules)===position.actionB.key;
}
