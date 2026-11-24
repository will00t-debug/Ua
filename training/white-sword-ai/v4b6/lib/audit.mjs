// Which stored features actually change between two actions.
// A position fact that is identical on both actions cannot rank them.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {HASH_INDEX} from '../../v4b1/lib/feasibility.mjs';
import {cardsOf} from '../../v4b2/lib/trust.mjs';
import {CARD_NAMES,POSITION_NAMES} from './protocol.mjs';

const HASH=new Set(HASH_INDEX);
function parsed(key){
 try{return JSON.parse(key||'{}');}
 catch{return {};}
}
export function changedNames(left,right){
 const names=[];
 const width=Math.max(left?.features?.length||0,right?.features?.length||0,POLICY_NAMES.length);
 for(let index=0;index<width;index++){
  const delta=(left?.features?.[index]||0)-(right?.features?.[index]||0);
  if(Math.abs(delta)>1e-8)names.push({name:POLICY_NAMES[index]||String(index),index,delta,hash:HASH.has(index)});
 }
 return names;
}
export function sameCardPlays(position){
 const plays=(position.band||[]).map(row=>{
  const body=parsed(row.key);
  return {row,body,card:cardsOf(row.features).join(',')};
 }).filter(item=>item.body.type==='play'&&(item.body.line==='front'||item.body.line==='energy')&&item.card);
 const cards=[...new Set(plays.map(item=>item.card))];
 const pairs=[];
 for(const card of cards){
  const group=plays.filter(item=>item.card===card);
  const fronts=group.filter(item=>item.body.line==='front').map(item=>item.row);
  const energies=group.filter(item=>item.body.line==='energy').map(item=>item.row);
  if(!fronts.length||!energies.length)continue;
  pairs.push({
   card,front:fronts[0],energy:energies[0],fronts,energies,
   changes:changedNames(energies[0],fronts[0])
  });
 }
 return pairs;
}
export function auditPosition(position){
 const pairs=sameCardPlays(position);
 const band=position.band||[];
 const constant=[];
 if(band.length>=2){
  for(const name of [...POSITION_NAMES,...CARD_NAMES]){
   const index=POLICY_NAMES.indexOf(name);
   if(index<0)continue;
   const values=band.map(row=>row.features?.[index]||0);
   const same=values.every(value=>Math.abs(value-values[0])<=1e-8);
   if(same)constant.push({name,value:values[0]});
  }
 }
 return {id:position.id,pairs,constant};
}
export function summarizeAudit(positions){
 const rows=[];
 const nameCounts=new Map();
 for(const position of positions){
  for(const pair of sameCardPlays(position)){
   const named=pair.changes.filter(change=>!change.hash);
   rows.push({id:position.id,card:pair.card,names:named.map(change=>change.name)});
   for(const change of named)nameCounts.set(change.name,(nameCounts.get(change.name)||0)+1);
  }
 }
 return {
  pairs:rows.length,
  names:[...nameCounts.entries()].map(([name,count])=>({name,count})).sort((left,right)=>right.count-left.count||left.name.localeCompare(right.name)),
  onlyLines:rows.filter(row=>row.names.length===2&&row.names.includes('line_front')&&row.names.includes('line_energy')).length
 };
}
