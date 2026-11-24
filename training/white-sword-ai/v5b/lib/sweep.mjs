// Compare the fixed bonus grid on saved positions. No new games.
import {POLICY_INDEX} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {chooseKey} from '../../v4a2/lib/sensitivity.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {sideKey} from '../../v5a/lib/pressure.mjs';
import {residualChoice} from './residual.mjs';
import {
 EE6C_ID,HARM_ID,POINT_GRID,PREFERENCE_IDS,PRESERVE_IDS,RAID_ID,SCALE,WEIGHT_CLIP,pointsOf,stepSizes
} from './protocol.mjs';

function energyKey(position){
 return sideKey(position,'energy');
}
function hardGap(position,key){
 const row=position.band.find(item=>item.key===key);
 if(!row)return null;
 const top=Math.max(...position.band.map(item=>item.hard));
 return top-row.hard;
}
export function clearsTargets(positions,weights,weight,feature){
 return PREFERENCE_IDS.every(id=>{
  const position=positions.find(item=>item.id===id);
  const want=position?energyKey(position):null;
  return want&&residualChoice(position.band,weights,weight,feature)===want;
 });
}
export function minimumWeight(positions,weights,feature){
 if(clearsTargets(positions,weights,0,feature))return 0;
 if(!clearsTargets(positions,weights,WEIGHT_CLIP,feature))return null;
 let low=0;
 let high=WEIGHT_CLIP;
 for(let step=0;step<60;step++){
  const mid=(low+high)/2;
  if(clearsTargets(positions,weights,mid,feature))high=mid;
  else low=mid;
 }
 return high;
}
function stageOf(turn){
 if(!Number.isFinite(turn))return 'unknown';
 if(turn<=6)return 'early';
 if(turn<=12)return 'mid';
 return 'late';
}
function bandOf(value,cut){
 if(!Number.isFinite(value))return 'unknown';
 return value<cut?'low':'high';
}
export function describeFlip(position,beforeKey,afterKey,fresh){
 const before=position.band.find(row=>row.key===beforeKey);
 const after=position.band.find(row=>row.key===afterKey);
 const beforeCard=cardsOf(before?.features).join(',')||null;
 const afterCard=cardsOf(after?.features).join(',')||null;
 let body={};
 try{body=JSON.parse(beforeKey||'{}');}catch{body={};}
 const keepFront=body.type==='play'&&body.line==='front'&&beforeCard==='BLC-4-070';
 const role=fresh?'fresh':keepFront?'keep-front':'other';
 const features=before?.features||[];
 return {
  id:position.id,role,fresh:!!fresh,keepFront,
  bucket:position.bucket||null,opponent:position.opponent||null,
  turn:Number.isFinite(position.turn)?position.turn:null,
  stage:stageOf(position.turn),
  energyBand:bandOf(features[POLICY_INDEX.my_energy],0.25),
  frontBand:bandOf(features[POLICY_INDEX.my_front],0.01),
  beforeKey,afterKey,beforeCard,afterCard
 };
}
export function measure(positions,weights,weight,feature,freshIds=new Set()){
 const targets=[];
 for(const id of PREFERENCE_IDS){
  const position=positions.find(item=>item.id===id);
  const want=position?energyKey(position):null;
  const chosen=position?residualChoice(position.band,weights,weight,feature):null;
  targets.push({
   id,want,chosen,ok:!!want&&chosen===want,missing:!position,
   hardGap:position&&want?hardGap(position,want):null
  });
 }
 const flips=[];
 let changes=0;
 for(const position of positions){
  if(!position?.band||position.band.length<2)continue;
  const before=chooseKey(position.band,weights,SCALE);
  const after=residualChoice(position.band,weights,weight,feature);
  if(before===after)continue;
  changes++;
  if(PREFERENCE_IDS.includes(position.id))continue;
  flips.push(describeFlip(position,before,after,freshIds.has(position.id)));
 }
 const preserves=PRESERVE_IDS.map(id=>{
  const position=positions.find(item=>item.id===id);
  if(!position)return {id,same:false,missing:true,learned:false};
  const before=chooseKey(position.band,weights,SCALE);
  const after=residualChoice(position.band,weights,weight,feature);
  return {id,same:before===after,missing:false,learned:false};
 });
 const eligible=targets.every(row=>row.ok&&row.hardGap!=null&&row.hardGap<=7+1e-6)
  &&preserves.every(row=>row.same);
 return {
  weight,points:pointsOf(weight),steps:stepSizes(weight),
  targets,changes,collateral:flips.length,unverified:flips.length,
  flips,preserves,eligible,
  ee6c:preserves.find(row=>row.id===EE6C_ID)||null,
  harm:preserves.find(row=>row.id===HARM_ID)||null,
  raid:preserves.find(row=>row.id===RAID_ID)||null
 };
}
export function gridWeights(minimum){
 const weights=[...POINT_GRID.map(points=>({id:'points-'+points,weight:points/SCALE}))];
 if(minimum!=null)weights.push({id:'minimum',weight:minimum});
 return weights;
}
export function chooseCandidate(rows){
 const eligible=rows.filter(row=>row.eligible);
 eligible.sort((left,right)=>left.collateral-right.collateral||left.weight-right.weight||(left.id<right.id?-1:1));
 return eligible[0]||null;
}
export function sweep(positions,weights,feature){
 const minimum=minimumWeight(positions,weights,feature);
 const seen=new Set();
 const rows=[];
 for(const spec of gridWeights(minimum)){
  const key=spec.weight.toFixed(8);
  if(seen.has(key)&&spec.id!=='minimum')continue;
  seen.add(key);
  rows.push({id:spec.id,...measure(positions,weights,spec.weight,feature)});
 }
 const picked=chooseCandidate(rows);
 return {minimum,rows,picked:picked?picked.id:null};
}
