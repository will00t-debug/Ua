// Split a blend margin into hard search, hashes, action types, card ids and
// the remaining named features. Read-only. Caps stay where v4-B left them.
import {POLICY_INDEX,POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {SCALE} from '../../v4b/lib/protocol.mjs';
import {HASH_INDEX,blend,pairwiseSwing,selection} from './feasibility.mjs';

const STATS=new Set(['card_energy','card_bp','card_gen','card_ap','affordable','spends_ap','pass_despite_attack']);

export function groupOf(name){
 if(/^h[0-7]$/.test(name))return 'hash';
 if(name.startsWith('type_'))return 'type';
 if(name.startsWith('aizen_'))return 'aizen';
 if(STATS.has(name))return 'economy';
 if(name.startsWith('card_'))return 'card';
 return 'other';
}
const GROUPS=['hash','type','card','aizen','economy','other'];

export function marginParts(weights,preferred,other,scale=SCALE){
 const parts={hard:other.hard-preferred.hard};
 for(const name of GROUPS)parts[name]=0;
 const coords=[];
 for(let index=0;index<weights.length;index++){
  const diff=(other.features[index]||0)-(preferred.features[index]||0);
  if(!diff)continue;
  const contribution=scale*weights[index]*diff;
  const group=groupOf(POLICY_NAMES[index]);
  parts[group]+=contribution;
  coords.push({name:POLICY_NAMES[index],group,weight:weights[index],diff,contribution});
 }
 coords.sort((left,right)=>Math.abs(right.contribution)-Math.abs(left.contribution));
 const policy=GROUPS.reduce((sum,name)=>sum+parts[name],0);
 const total=parts.hard+policy;
 return {parts,policy,total,coords,preferredScore:blend(preferred,weights,scale),otherScore:blend(other,weights,scale)};
}
export function ceilings(weights,preferred,other){
 const masks={
  all:[],
  named:HASH_INDEX,
  noType:[...HASH_INDEX,...indexes(name=>name.startsWith('type_'))],
  noShared:[...HASH_INDEX,...indexes(name=>name.startsWith('type_')||STATS.has(name))],
  cardOnly:weights.map((_,index)=>index).filter(index=>POLICY_NAMES[index]!=='card_BLC-4-060')
 };
 const out={};
 for(const [name,frozen] of Object.entries(masks)){
  out[name]={
   one:pairwiseSwing(weights,preferred,other,{frozen}),
   box:pairwiseSwing(weights,preferred,other,{frozen,stepCap:12})
  };
 }
 return out;
}
function indexes(match){
 const found=[];
 POLICY_NAMES.forEach((name,index)=>{if(match(name))found.push(index);});
 return found;
}
export function marginCensus(positions,weights){
 const gaps=[];
 for(const position of positions){
  if((position.band||[]).length<2)continue;
  const ranked=position.band.map(row=>({row,score:blend(row,weights)})).sort((left,right)=>right.score-left.score||left.row.key.localeCompare(right.row.key));
  const gap=ranked[0].score-ranked[1].score;
  const chosen=selection(position.band,weights);
  gaps.push({id:position.id,bucket:position.bucket,opponent:position.opponent,gap,chosen});
 }
 gaps.sort((left,right)=>right.gap-left.gap);
 const count=low=>gaps.filter(row=>row.gap>=low).length;
 return {
  n:gaps.length,
  median:gaps.length?gaps[Math.floor((gaps.length-1)/2)].gap:0,
  max:gaps[0]?.gap||0,
  atLeast7:count(7),
  atLeast20:count(20),
  atLeast50:count(50),
  atLeast100:count(100),
  widest:gaps.slice(0,8)
 };
}
function namedDiffCount(left,right){
 let count=0;
 const hash=new Set(HASH_INDEX);
 for(let index=0;index<left.features.length;index++){
  if(hash.has(index))continue;
  if((left.features[index]||0)!==(right.features[index]||0))count++;
 }
 return count;
}
export function hashDependence(positions,weights){
 let pairs=0;
 let identical=0;
 let hashOnly=0;
 let oneStepNeedsHash=0;
 let boxWithoutHash=0;
 for(const position of positions){
  const band=position.band||[];
  for(let left=0;left<band.length;left++){
   for(let right=left+1;right<band.length;right++){
    pairs++;
    const scoreLeft=blend(band[left],weights);
    const scoreRight=blend(band[right],weights);
    const trailer=scoreLeft<=scoreRight?band[left]:band[right];
    const leader=scoreLeft<=scoreRight?band[right]:band[left];
    const namedCount=namedDiffCount(trailer,leader);
    const open=pairwiseSwing(weights,trailer,leader);
    if(!namedCount&&open.coords===0)identical++;
    else if(!namedCount)hashOnly++;
    const named=pairwiseSwing(weights,trailer,leader,{frozen:HASH_INDEX});
    const box=pairwiseSwing(weights,trailer,leader,{frozen:HASH_INDEX,stepCap:12});
    if(named.gap>1e-8&&named.swing+1e-8<named.gap&&open.swing>named.gap+1e-8){
     oneStepNeedsHash++;
     if(box.swing>named.gap+1e-8)boxWithoutHash++;
    }
   }
  }
 }
 return {pairs,identical,hashOnly,oneStepNeedsHash,boxWithoutHash};
}
export {POLICY_INDEX};
