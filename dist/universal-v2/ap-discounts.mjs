// Q1210/Q2161: only the next matching hand use consumes the effect.
// Q1209: printed BP; Q670: repeated next-use reductions stack on that use.
import {cardHasTrait} from './field-conditions.mjs';
export const DISCOUNT_KIND='nextEligibleHandPlayApDiscount';
export function validatePrintedPlayFilter(f){
 if(!f||typeof f!=='object'||Array.isArray(f)||!Object.keys(f).length||
  Object.keys(f).some(k=>!['cardType','printedBp','printedGenAtLeast','trait'].includes(k))||
  (f.cardType!==undefined&&!['character','field','event'].includes(f.cardType))||
  (f.printedBp!==undefined&&(!Number.isInteger(f.printedBp)||f.printedBp<0||f.printedBp>50000))||
  (f.printedGenAtLeast!==undefined&&(!Number.isInteger(f.printedGenAtLeast)||f.printedGenAtLeast<0||f.printedGenAtLeast>50))||
  (f.trait!==undefined&&(typeof f.trait!=='string'||!f.trait.trim()||f.trait.length>80)))
  throw Error('Invalid printed hand-play discount filter');
 return true;
}
export function matchesPrintedPlayFilter(d,f){
 return (f.cardType===undefined||d.type===f.cardType)&&
  (f.printedBp===undefined||d.bp===f.printedBp)&&
  (f.printedGenAtLeast===undefined||d.gen>=f.printedGenAtLeast)&&
  (f.trait===undefined||cardHasTrait(d,f.trait));
}
export function validateHandDiscount(s,e){
 validatePrintedPlayFilter(e.filter);
 if(Object.keys(e).length!==10||Object.keys(e).some(k=>!['id','kind','controller','sourceUid','sourceCardId','sourceStamp','turn','until','consumed','filter'].includes(k))||
  e.kind!==DISCOUNT_KIND||![0,1].includes(e.controller)||!Number.isInteger(e.id)||e.id<1||e.id>=s.nextContinuousStateId||
  typeof e.sourceUid!=='string'||!new RegExp('^'+e.controller+'-\\d+$').test(e.sourceUid)||
  typeof e.sourceCardId!=='string'||!e.sourceCardId||!Number.isInteger(e.sourceStamp)||e.sourceStamp<1||e.sourceStamp>=s.nextFieldEntryStamp||
  e.turn!==s.turn||e.consumed!==false||e.until?.player!==s.active||e.until?.phase!=='attack'||e.until?.edge!=='end'||Object.keys(e.until).length!==3)
  throw Error('Invalid hand-play discount accounting');
 return true;
}
export function grantHandDiscount(s,owner,source,filter){
 validatePrintedPlayFilter(filter);
 if(!source||!Number.isInteger(source.fieldEntryStamp))throw Error('Hand discount requires stamped source');
 const e={id:s.nextContinuousStateId,kind:DISCOUNT_KIND,controller:owner,
  sourceUid:source.uid,sourceCardId:source.cardId,sourceStamp:source.fieldEntryStamp,
  turn:s.turn,until:{player:s.active,phase:'attack',edge:'end'},consumed:false,filter:{...filter}};
 s.nextContinuousStateId++;validateHandDiscount(s,e);s.continuousStates.push(e);
}
// A payment plan only; spendAp remains the single AP payment implementation.
export function handPlayApPlan(s,owner,d){
 const ids=s.continuousStates.filter(e=>e.kind===DISCOUNT_KIND&&e.controller===owner&&
  !e.consumed&&e.turn===s.turn&&matchesPrintedPlayFilter(d,e.filter)).map(e=>e.id);
 return {cost:Math.max(0,d.ap-ids.length),ids};
}
export function definitionGrantsDiscount(value,filter){
 if(!value||typeof value!=='object')return false;
 if(value.op===DISCOUNT_KIND&&value.filter&&
  Object.keys(value.filter).length===Object.keys(filter).length&&
  Object.keys(filter).every(k=>value.filter[k]===filter[k]))return true;
 return Object.values(value).some(v=>v&&typeof v==='object'&&definitionGrantsDiscount(v,filter));
}
