// Offline score split and repeated one-step probes for the saved preferences.
import {POLICY_NAMES} from '../../../../dist/universal-v2/white-sword-ai/features.mjs';
import {loadAuditInputs} from './audit.mjs';
import {ceilings,groupOf,hashDependence,marginCensus,marginParts} from './decompose.mjs';
import {groupShift,repeatToward,safeWalk} from './multistep.mjs';
import {sidesOf} from './updates.mjs';

function bandSide(position,key){
 return position.band.find(row=>row.key===key);
}
function allowed(match){
 const indexes=[];
 POLICY_NAMES.forEach((name,index)=>{if(match(groupOf(name),name))indexes.push(index);});
 return indexes;
}
function compact(walk){
 const last=walk.trace.at(-1)||null;
 return {
  kind:walk.kind,
  freezeHash:walk.freezeHash,
  steps:walk.trace.length,
  flipped:walk.flipped,
  gap:last?round(last.gap):null,
  collateralSelected:last?last.collateralSelected:0,
  collateralPool:last?last.collateralPool:0,
  similar:last?last.similar:0,
  unrelated:last?last.unrelated:0,
  l2:last?round(last.l2):0,
  maxAbs:last?round(last.maxAbs):0,
  clip:last?last.clip:0,
  largestHash:last?round(last.largestHash):0,
  groups:walk.groups||{},
  path:walk.trace.map(frame=>({
   step:frame.step,gap:round(frame.gap),flipped:frame.flipped,
   selected:frame.collateralSelected,pool:frame.collateralPool,
   similar:frame.similar,unrelated:frame.unrelated,maxAbs:round(frame.maxAbs)
  })),
  changes:[...(last?.selectedRows||[]),...(last?.poolRows||[])].map(row=>({
   id:row.id,bucket:row.bucket,opponent:row.opponent,relation:row.relation
  }))
 };
}
function round(value){
 return Math.round(value*1000)/1000;
}
export function studySaved(root='training/white-sword-ai/v4b'){
 const data=loadAuditInputs(root);
 const selectedIds=new Set(data.selected.map(item=>item.id));
 const census=marginCensus(data.selected,data.before);
 const dependence=hashDependence(data.selected,data.before);
 const rows=data.usable.map(row=>{
  const position=data.byId.get(row.id);
  const pair=sidesOf(row);
  const preferred=bandSide(position,pair.preferred.key);
  const other=bandSide(position,pair.other.key);
  const others=data.selected.filter(item=>item.id!==row.id);
  const pool=data.pool.filter(item=>!selectedIds.has(item.id)&&(item.band||[]).length>=2);
  const margin=marginParts(data.before,preferred,other);
  const limit=ceilings(data.before,preferred,other);
  const walks=[
   repeatToward(data.before,position,row,others,pool,{kind:'logistic',freezeHash:false,steps:12}),
   repeatToward(data.before,position,row,others,pool,{kind:'logistic',freezeHash:true,steps:12}),
   repeatToward(data.before,position,row,others,pool,{kind:'vertex',freezeHash:true,steps:8}),
   repeatToward(data.before,position,row,others,pool,{kind:'vertex',freezeHash:true,steps:8,indexes:allowed(group=>group==='card'||group==='aizen')})
  ];
  const safe=safeWalk(data.before,position,row,others,pool,{capSelected:1,capPool:0,freezeHash:true,steps:24});
  return {
   id:row.id,bucket:row.bucket,opponent:row.opponent,n:row.n,mean:row.mean,
   margin:{
    total:round(margin.total),
    hard:round(margin.parts.hard),
    policy:round(margin.policy),
    groups:Object.fromEntries(Object.entries(margin.parts).filter(([name])=>name!=='hard').map(([name,value])=>[name,round(value)])),
    top:margin.coords.slice(0,8).map(item=>({name:item.name,group:item.group,weight:round(item.weight),diff:round(item.diff),contribution:round(item.contribution)}))
   },
   ceilings:Object.fromEntries(Object.entries(limit).map(([name,value])=>[name,{
    one:round(value.one.swing),
    box:round(value.box.swing),
    gap:round(value.one.gap)
   }])),
   walks:walks.map(compact),
   safe:{
    flipped:safe.flipped,
    stalled:safe.stalled,
    steps:safe.trace.length,
    blocked:safe.blocked,
    gap:safe.trace.at(-1)?round(safe.trace.at(-1).gap):round(margin.total),
    selected:safe.trace.at(-1)?.collateralSelected||0,
    pool:safe.trace.at(-1)?.collateralPool||0,
    moved:safe.trace.map(frame=>frame.moved)
   }
  };
 });
 return {census:{...census,median:round(census.median),max:round(census.max),widest:census.widest.map(row=>({id:row.id,bucket:row.bucket,gap:round(row.gap)}))},dependence,rows};
}
