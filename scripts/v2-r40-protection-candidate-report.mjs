#!/usr/bin/env node
// R40 evidence-led five-title scan. Keyword hits are not whole-card readiness.
import {pathToFileURL} from 'node:url';
import {capabilityIndex,r35UnportedAtomAudit,ATOM_REVIEW_STATUSES}
 from './v2-r35-unported-atom-audit.mjs';
import {r37TopNCandidateReport} from './v2-r37-top-n-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';

// Read from complete JP official source, separately from imprecise catalogue text.
export const R40_SOURCE_PINNED_REVIEWS=Object.freeze({
 'SAO-2-058':Object.freeze({
  status:'READY',series:'EX08BT',faq:['Q1206'],
  scope:'opponent-any',
  missing:[],
  note:'Official purple ENERGY2/AP1 EVENT: mandatory own FRONT, opponent-any protection through next own START, conditional Asuna optional AP ACTIVE; complete generic ACTIVE LIFE, authenticated 50-card tests. Independently FAQ-certified count remains 0.'
 }),
 'SAO-2-060':Object.freeze({
  status:'READY',series:'EX08BT',faq:['Q1207'],
  scope:'opponent-character',
  missing:[],
  note:'R41 full purple ENERGY4/AP1 song EVENT: optional outside CHARACTER recover; independent optional purple printed AP1 SAOサバイバー HAND ACTIVE entry; physical character-only choice protection until own START; SPECIAL LIFE. No full independent FAQ certification claim.'
 }),
 'MST-1-067':Object.freeze({
  status:'RULE BLOCKED',series:'UA54BT',faq:['Q2162'],
  scope:'UNRESOLVED',
  missing:['sourceScopeQ2162Conflict','raidBaseRestReturnOrHandFullyVerified','multiLayerRaidUnderAndRetireTiming'],
  note:'Official print says opponent EFFECT, but Q2162 question quotes opponent CHARACTER effect. No effective erratum found: scope unresolved. Green ENERGY4/AP1/BP4000, Silphiette alias, Raid, original-energy>=1 Ranoa grant, true-retire undercard selection 0..1 REST field or hand, RAID LIFE.'
 })
});
function ids(rows){return new Set(rows.map(x=>x.id));}
export function r40ProtectionCandidateReport(){
 const roster=v2AllTitleInventory(),idx=capabilityIndex(roster),r35=r35UnportedAtomAudit(),
  top=r37TopNCandidateReport();
 const unported=idx.cards.filter(c=>!c.registered);
 const authoritative=new Set(roster.series.flatMap(c=>c.unportedIds));
 if(idx.cards.length!==700||unported.length!==authoritative.size||
  idx.unportedSearched!==roster.totals.blocked||
  new Set(unported.map(c=>c.id)).size!==unported.length||
  unported.some(c=>!authoritative.has(c.id)))throw Error('R40 five-title scan missed IDs');
 const candidateIds=ids(idx.protectionPotential);
 if(candidateIds.size!==idx.protectionPotential.length||
  idx.protectionPotential.some(c=>!authoritative.has(c.id)))
  throw Error('R40 textual protection hit outside unported set');
 const reviews=Object.entries(R40_SOURCE_PINNED_REVIEWS).map(([id,v])=>{
  const card=idx.cards.find(c=>c.id===id);
  if(!card)throw Error('Missing official review source '+id);
  if(!ATOM_REVIEW_STATUSES.includes(v.status))throw Error('Bad review status '+id);
  return {id,title:card.title,registered:card.registered,source:
   'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+v.series+'%2F'+id,
   status:card.registered?'REGISTERED':v.status,scope:v.scope,faq:[...v.faq],
   missing:card.registered?[]:[...v.missing],note:v.note,keywordHit:candidateIds.has(id)};
 });
 const byTitle=Object.fromEntries(roster.series.map(x=>[x.title,
  idx.protectionPotential.filter(c=>c.title===x.title).length]));
 const hand=ids(r35.handRestPotential),retire=ids(r35.retireTopPotential),
  topIds=ids(top.candidates);
 const overlap={
  protectionAndHand:[...candidateIds].filter(id=>hand.has(id)).sort(),
  protectionAndRetire:[...candidateIds].filter(id=>retire.has(id)).sort(),
  protectionAndTop:[...candidateIds].filter(id=>topIds.has(id)).sort()
 };
 const stats={catalogueSize:idx.cards.length,registered:roster.totals.pilotImplemented,
  unportedSearched:unported.length,protectionKeywordCandidates:idx.protectionPotential.length,
  handDeployKeywordCandidates:r35.handRestPotentialCount,
  optionalRetireTopKeywordCandidates:r35.retireTopPotentialCount,
  topNKeywordCandidates:top.candidates.length,
  officialCompletePrintReviewedThisRound:reviews.length,
  newlyRegisteredByThisAudit:reviews.filter(x=>x.registered).length,
  readyFromKeywordOnly:0,byTitle};
 return {stats,sourcePinnedReviews:reviews,keywordOnlyProtectionCandidates:
  idx.protectionPotential.filter(c=>!R40_SOURCE_PINNED_REVIEWS[c.id]).map(c=>({
   ...c,status:'REVIEW PENDING'})),overlap,
  caution:'Do not add 32+8+59: a physical card can appear in multiple candidate groups. R40 keyword scan does NOT mean official whole-card certification.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=r40ProtectionCandidateReport();
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
}
