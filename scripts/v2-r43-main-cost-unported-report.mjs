#!/usr/bin/env node
// R43 - reuse R35/R41/R42 official source index, NEVER a parallel card catalogue.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r42TwoZoneCandidateReport} from './v2-r42-named-zone-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
export const R43_OFFICIAL_MULTI_EFFECT_AUDIT=Object.freeze({
 'SAO-2-069':Object.freeze({
  status:'PARTIAL',source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-069',
  missing:['ownAndOpponentAttackPhaseEndTrueRetirement','raidBaseSelectionAndActiveMove',
   'optionalOnPlayOpponentFrontPrintedBpAtMost4000TrueRetire',
   'onRetireNamedAsunaPrintedGreenAp1EnergyAtMost3FreeREST',
   'raidLifeChoiceAndFullRetirementTiming'],
  note:'Official green4/AP1/BP4000/ALO Raid Yuuki. Both attack-phase ends retire true field UID. OnPlay optional BP<=4000 opponent FRONT retirement. OnRetire optional HAND green energy<=3 AP1 Asuna REST. Raid LIFE. Cannot register from shared named deploy alone.'
 }),
 'MST-1-067':Object.freeze({
  status:'RULE BLOCKED',source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067',
  missing:['Q2162PrintedVersusFAQEffectSourceScope','RaidBaseOnRetireUnderRestOrHandTiming'],
  note:'R40/R42 unresolved official scope mismatch; do NOT infer opposing CHARACTER vs ANY effect immunity.'
 })
});
function source069(){
 const src=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-069');
 const snippets=['自分と相手のアタックフェイズ終了時','BP4000以下','【登場時】','【退場時】',
  '必要エナジーが3以下','消費APが1の緑の〈アスナ〉','レストで登場させる'];
 if(!src||src.number!=='EX08BT/SAO-2-069'||src.trigger!=='raid'||
  src.energy!==4||src.ap!==1||src.bp!==4000||
  snippets.some(t=>!src.effectJa.includes(t)))throw Error('R43 official SAO-069 full text differs; block deployment');
 return src;
}
export function r43MainCostFullRoster(){
 source069();
 const inv=v2AllTitleInventory(),audit=capabilityIndex(inv);
 const original=r42TwoZoneCandidateReport();
 const unported=audit.cards.filter(c=>!c.registered), ids=new Set(unported.map(c=>c.id));
 const unportedIds=new Set(inv.series.flatMap(x=>x.unportedIds));
 if(audit.cards.length!==700||ids.size!==unported.length||
  ids.size!==unportedIds.size||original.stats.unportedSearched!==unported.length||
  [...ids].some(id=>!unportedIds.has(id)))
  throw Error('R43 missed official or duplicated unported identity');
 const registered=new Map(audit.cards.filter(c=>c.registered).map(c=>[c.id,c]));
 if(!registered.get('SAO-2-068')?.operations.includes('deployNamedFromZones')||
  !registered.get('SAO-2-068')?.operations.includes('restDiscardRetireThen')||
  ids.has('SAO-2-068')||ids.has('SAO-2-069')||
  !['retireSourceOnPhaseEnd','retireOppFrontOneUnderBp','deployNamedFromZones'].every(op=>
   registered.get('SAO-2-069')?.operations.includes(op)))
  throw Error('R43 official SAO-068 full registration or SAO-069 strict PARTIAL changed');
 const candidates=original.candidates.map(c=>({
  id:c.id,title:c.title,status:c.status,flags:c.flags,
  reviewed:c.missing!==null,missing:c.missing
 }));
 const checked=Object.entries(R43_OFFICIAL_MULTI_EFFECT_AUDIT).map(([id,review])=>{
  const row=candidates.find(x=>x.id===id);
  if(registered.has(id))return {id,status:'REGISTERED',missing:[],source:review.source};
  if(!row||row.status!==review.status)return {id,status:'SOURCE PENDING',missing:['statusChangedReviewRequired']};
  return {id,status:row.status,missing:[...review.missing],source:review.source};
 });
 if(checked.some(c=>c.status==='SOURCE PENDING')||
  candidates.some(c=>c.status==='READY'&&!c.reviewed)||
  candidates.length+original.remainingNoKeywords.length!==unported.length)
  throw Error('R43 source-pinned REVIEW or keyword-only READY mismatch');
 const counts={
  catalogue:700,registered:inv.totals.pilotImplemented,
  unportedSearched:unported.length,scannedAcrossTitles:inv.series.length,
  textCandidatesUnique:candidates.length,handDeployMentions:original.stats.handDeployTextHits,
  outsideRecoveryMentions:original.stats.outsideRecoverTextHits,
  activeHandMentions:original.stats.activeHandTextHits,
  restHandMentions:original.stats.restHandTextHits,
  officialRemainingReviews:original.stats.officiallyReviewedRemaining,
  verifiedFullReadyUnported:candidates.filter(c=>c.status==='READY'&&c.reviewed).length,
  statusCounts:Object.fromEntries([...new Set(candidates.map(c=>c.status))].map(status=>
   [status,candidates.filter(c=>c.status===status).length])),
  byTitle:Object.fromEntries(inv.series.map(x=>[x.title,{
   registered:x.pilotImplemented,unported:x.blocked}]))
 };
 if(counts.registered+counts.unportedSearched!==700)
  throw Error('R43 registration count mismatch');
 return {counts,reviewed:checked,candidates,otherUnportedIds:original.remainingNoKeywords,
  newlyRegistered:'SAO-2-068',unresolved:null,
  nextAtomicPriorities:[
   {op:'namedPrintedHandDeployUnderTrueRetirement',cards:['SAO-2-069','SAO-2-068'],note:'historical R43 gap; both now REGISTERED, R44 audit supersedes'},
   {op:'phaseAttackEndDistinctOutsideNamesSwap',cards:['BLC-4-069'],note:'Q2337 Q2338 to review before changing phase order'},
   {op:'sourceSpecificHandDiscardSelectionTax',cards:['SAO-1-087','SAO-2-064'],note:'Q978 and Q1208; not AP tax or full protection'},
   {op:'strictThreeWayConditionalRetireMode',cards:['BLC-4-042'],note:'Q2323 printed name, not trait'},
   {op:'officialScopeClarification',cards:['MST-1-067'],note:'Q2162 RULE BLOCKED'}
  ]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=r43MainCostFullRoster();
 console.log('R43_FIVE_TITLE_SCAN '+JSON.stringify(r.counts));
 console.log('R43_OFFICIAL_PENDING '+JSON.stringify(r.reviewed));
 console.log('R43_NEXT_PRIMITIVES '+JSON.stringify(r.nextAtomicPriorities));
}
