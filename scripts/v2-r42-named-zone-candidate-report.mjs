#!/usr/bin/env node
// R42: no second card catalogue. Every scan reuses the live R35/R41
// capability index, actual registry, immutable official source records.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r41SpecialHandCandidateReport,R41_OFFICIAL_REVIEWS}
 from './v2-r41-special-hand-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
export function r42TwoZoneCandidateReport(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const baseline=r41SpecialHandCandidateReport();
 const unported=index.cards.filter(c=>!c.registered);
 const truth=new Set(inventory.series.flatMap(c=>c.unportedIds));
 if(index.cards.length!==700||unported.length!==inventory.totals.blocked||
  truth.size!==unported.length||baseline.stats.unportedSearched!==unported.length||
  unported.some(c=>!truth.has(c.id)))
  throw Error('R42 all five-title source roster must be scanned before candidate promotion');
 const registered=Object.fromEntries(index.cards.filter(c=>c.registered).map(c=>[c.id,c]));
 for(const id of ['SLG-1-028','SLG-1-030'])
  if(!registered[id])throw Error('R42 official full-print card missing '+id);
 const hand=registered['SLG-1-028'].operations;
 const top=registered['SLG-1-030'].operations;
 if(!hand.includes('deployNamedFromZones')||!top.includes('inspectTopTraitOutside'))
  throw Error('R42 printed source does not have expected common operations');
 const categories=baseline.candidates.map(c=>({
  id:c.id,title:c.title,status:c.status,
  flags:{...c.flags},sourceUrl:c.sourceUrl,
  missing:c.missing&&[...c.missing]
 }));
 const reviewed=categories.filter(c=>R41_OFFICIAL_REVIEWS[c.id]);
 if(categories.some(c=>c.status==='READY'&&!R41_OFFICIAL_REVIEWS[c.id])||
  categories.length+baseline.remainingWithoutKeywords.length!==unported.length)
  throw Error('R42 keyword-only READY or missing unported identity');
 const historicalReviewedNowRegistered=Object.keys(R41_OFFICIAL_REVIEWS)
  .filter(id=>registered[id]);
 const unportedReviews=reviewed.map(c=>({
  id:c.id,status:c.status,missing:c.missing,
  source: R41_OFFICIAL_REVIEWS[c.id].source
 }));
 return {stats:{
  catalogueSize:index.cards.length,registered:inventory.totals.pilotImplemented,
  unportedSearched:unported.length,sourceTextScanned:unported.length,
  uniqueCandidateUids:categories.length,handDeployTextHits:baseline.stats.handDeployMentions,
  outsideRecoverTextHits:baseline.stats.outsideRecoveryMentions,
  activeHandTextHits:baseline.stats.activeHandMentions,
  restHandTextHits:baseline.stats.restHandMentions,
  officiallyReviewedRemaining:unportedReviews.length,
  readyVerifiedUnported:reviewed.filter(c=>c.status==='READY').length,
  reviewPending:categories.filter(c=>c.status==='REVIEW PENDING').length,
  partial:categories.filter(c=>c.status==='PARTIAL').length,
  ruleBlocked:categories.filter(c=>c.status==='RULE BLOCKED').length,
  perTitle:Object.fromEntries(inventory.series.map(s=>[s.title,{
    registered:s.pilotImplemented,unported:s.blocked}]))
 },newlyFullyRegistered:['SLG-1-030','SLG-1-028'],
 commonOps:{namedTwoZone:'deployNamedFromZones',conditionalTopOrName:'inspectTopTraitOutside'},
 historicalReviewedNowRegistered,unportedReviews,candidates:categories,
 remainingNoKeywords:[...baseline.remainingWithoutKeywords],
 priorities:[
  {id:'SLG-1-028',status:'REGISTERED',note:'Both hand/outside typed physical 030 FREE REST, source onPlay and GET'},
  {id:'SAO-2-068',status:'PARTIAL',missing:['tripleMainCost','namedGreenEnergyApActive','enteredTargetBp1000']},
  {id:'SAO-2-069',status:'PARTIAL',missing:['twoPlayersAttackEndTrueRetire','raidAndOnPlayRetire','namedGreenEnergyApRest']},
  {id:'BLC-4-042',status:'PARTIAL',missing:['strictThreeMode','conditionalTrueRetire','namedBlueEnergyLineActive']},
  {id:'SAO-1-087',status:'PARTIAL',missing:['eventOnlyDiscardOneChoiceTax','otherBattleEffects']},
  {id:'SAO-2-064',status:'PARTIAL',missing:['nonStackingCharacterOrEventDiscardOneChoiceTax']},
  {id:'BLC-4-069',status:'NEAR READY',missing:['Q2337Q2338AttackEndOutsideSwap']},
  {id:'MST-1-067',status:'RULE BLOCKED',missing:['Q2162OfficialScopeConflict','RaidUnderRestOrHand']}
 ]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=r42TwoZoneCandidateReport();
 console.log(JSON.stringify({stats:report.stats,registered:report.newlyFullyRegistered,
  officiallyReviewedRemaining:report.unportedReviews,priorities:report.priorities},null,2));
}
