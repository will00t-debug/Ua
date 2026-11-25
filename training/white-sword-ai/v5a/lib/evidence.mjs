// Evidence tiers for comparisons that already exist. Inconclusive is not a label.
import {EVIDENCE_PRIOR} from './protocol.mjs';

const RANK={screen:1,short:2,confirm:3,validation:4};

export function shrinkage(mean,decisive,prior=EVIDENCE_PRIOR){
 const count=Number(decisive)||0;
 if(count<=0)return 0;
 return (Number(mean)||0)*count/(count+prior);
}
export function trainingUse(record){
 if(record.harm&&record.confirmed)return {tier:'confirmed-harm',role:'constraint',weight:null};
 if(record.confirmed)return {tier:'confirmed-preference',role:'constraint',weight:null};
 if(record.kind==='confirm'||record.kind==='validation'){
  return {tier:'paired-inconclusive',role:'soft',weight:shrinkage(record.mean,record.decisive)};
 }
 if(record.kind==='short')return {tier:'short-check',role:'hold-out',weight:0};
 return {tier:'screen-only',role:'hold-out',weight:0};
}
export function keepRecord(existing,next){
 if(!existing)return next;
 if(RANK[next.kind]>RANK[existing.kind])return next;
 if(RANK[next.kind]===RANK[existing.kind]&&next.decisive!=null&&existing.decisive==null)return next;
 return existing;
}
export function summarizeUses(records){
 const tiers={};
 for(const record of records){
  const use=trainingUse(record);
  if(!tiers[use.tier])tiers[use.tier]={count:0,role:use.role,weight:0};
  tiers[use.tier].count++;
  tiers[use.tier].weight+=Math.abs(use.weight||0);
 }
 return tiers;
}
