#!/usr/bin/env node
// R37: No free-form text match is a complete printed/FAQ certification.
// Search every still-unported identity from current five-title source catalogue.
import {pathToFileURL} from 'node:url';
import {capabilityIndex,ATOM_REVIEW_STATUSES}
 from './v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
export const R37_TOP_SOURCE_REVIEWS=Object.freeze({
 'SAO-1-056':Object.freeze({
  status:'NEAR READY',series:'UA15BT',
  missing:['chooseOneFreeRestHandCharacterWithPrintedColorEnergyAp'],
  note:'Official UA15BT Yui blue3/AP1/BP2000/ALO, DRAW LIFE. OnPlay choose exactly one: TOP2 reveal up to one CHARACTER OR FIELD then bottom-order rest; OR select up to one own HAND blue CHARACTER printed required energy<=2, AP1 and REST enter own field WITHOUT spending another AP. Top2 already reusable. Missing atomic child of chooseOne for conditional no-cost REST hand play; never register partial mode.',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-056'}),
 'SLG-1-059':Object.freeze({
  status:'PARTIAL',series:'UA51BT',
  missing:['onPlayOptionalDiscardThenReadySelfBp1000','onAttackTopFourDoubleTraitThenSkipNextActiveIfHandAdded','Q2058NextActiveConsumption'],
  note:'Official green character AP2: optional onPlay hand discard then self ACTIVE/BP+1000; onAttack TOP4 double fourth-Jeju Raid trait, taking any hand card makes source skip its next ACTIVE; GET LIFE. Q2058 applies.',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-059'}),
 'SAO-2-056':Object.freeze({
  status:'PARTIAL',series:'EX08BT',
  missing:['optionalRetireOwnCharacterThenSearch','afterRetireSelectionSourceBoundary'],
  note:'Official optional true retirement of own character gates TOP5 Progressives 0..2; GET LIFE. New TOP2 atom alone does NOT unlock the card.',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-056'}),
 'MST-1-049':Object.freeze({
  status:'PARTIAL',series:'UA54BT',
  missing:['optionalRetireOwnFieldThenSearch','traitlessCharacterOrFieldTopPickWithoutDiscard','activateSelfAfterPaidRetire'],
  note:'Official optional own FIELD retirement gates self ACTIVE plus TOP4 traitless character or FIELD 0..1; GET LIFE, no contingent discard.',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-049'})
});
export function classifyTopNPrint(text){
 const t=String(text||'');
 const top=/(?:山札|牌庫|牌堆|デッキ).{0,26}(?:上から|頂|トップ|top)/iu.test(t);
 if(!top)return null;
 const chooseTwo=/(?:2枚まで|２枚まで|最多.{0,5}[兩二2]張)/u.test(t);
 const chooseOne=/(?:1枚まで|１枚まで|最多.{0,5}[一1]張)/u.test(t);
 const toHand=/(?:手札に加え|加入手牌|加到手牌)/u.test(t);
 const reveal=/(?:公開|展示)/u.test(t);
 const toOutside=/(?:場外に置|放.{0,5}場外)/u.test(t);
 const restOrder=/(?:残り|剩餘|其餘).{0,22}(?:望む順|希望順|山札の下|山札の上|牌庫底|牌庫頂)/u.test(t);
 return {category:chooseTwo&&toHand&&reveal?'TWO_HAND_REVEAL':
  chooseOne&&toHand&&reveal?'ONE_HAND_REVEAL':
  toOutside?'TOP_TO_OUTSIDE':
  restOrder?'TOP_REARRANGE':'TOP_OTHER',
  evidence:{chooseTwo,chooseOne,toHand,reveal,toOutside,restOrder}};
}
export function r37TopNCandidateReport(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const unported=index.cards.filter(c=>!c.registered);
 const actual=new Set(inventory.series.flatMap(r=>r.unportedIds));
 if(unported.length!==actual.size||new Set(unported.map(c=>c.id)).size!==actual.size||
  unported.some(c=>!actual.has(c.id)))throw Error('Full five-title unported roster did not reconcile');
 const candidateRows=unported.flatMap(c=>{
  const print=classifyTopNPrint(c.sourceText);
  if(!print)return [];
  const review=R37_TOP_SOURCE_REVIEWS[c.id];
  const status=review?.status||c.officialReview?.status||
   (c.status==='SOURCE PENDING'?'SOURCE PENDING':'REVIEW PENDING');
  if(!ATOM_REVIEW_STATUSES.includes(status))throw Error(c.id+' invalid candidate status');
  if(status==='READY'&&!review)throw Error('Keyword-only candidate must never become READY: '+c.id);
  return [{id:c.id,title:c.title,category:print.category,status,
   sourceFingerprint:c.sourceFingerprint,
   sourceUrl:review?.source||c.sourceUrl,
   reviewEvidence:review?{missing:[...review.missing],note:review.note}:null,
   probableReuse:print.category==='TWO_HAND_REVEAL'?'TOP2 candidate only':null,
   evidence:print.evidence}];
 });
 const historicalReviewed=Object.keys(R37_TOP_SOURCE_REVIEWS);
 const sourceReviewed=historicalReviewed.filter(id=>actual.has(id));
 const newlyRegistered=historicalReviewed.filter(id=>!actual.has(id));
 for(const id of sourceReviewed)if(!candidateRows.some(c=>c.id===id))
  throw Error('Pinned official R37 reviewed TOP-N candidate missing '+id);
 const stats={totalSource:index.cards.length,registered:inventory.totals.pilotImplemented,
  unported:unported.length,sourceTextScanned:unported.length,
  keywordCandidates:candidateRows.length,
  officialIndividualReviewsThisAudit:sourceReviewed.length,
  keywordOnlyCandidates:candidateRows.filter(x=>x.status==='REVIEW PENDING').length,
  readyUnported:candidateRows.filter(x=>x.status==='READY').length,
  nearReadyUnported:candidateRows.filter(x=>x.status==='NEAR READY').length,
  partialUnported:candidateRows.filter(x=>x.status==='PARTIAL').length,
  ruleBlockedUnported:candidateRows.filter(x=>x.status==='RULE BLOCKED').length,
  sourcePendingUnported:candidateRows.filter(x=>x.status==='SOURCE PENDING').length,
  reviewPendingUnported:candidateRows.filter(x=>x.status==='REVIEW PENDING').length,
  byTitle:Object.fromEntries(inventory.series.map(x=>[x.title,
   candidateRows.filter(c=>c.title===x.title).length]))};
 const covered=new Set(candidateRows.map(c=>c.id));
 const unportedNoTopCandidate=unported.map(c=>c.id).filter(id=>!covered.has(id));
 if(candidateRows.length+unportedNoTopCandidate.length!==unported.length)
  throw Error('Candidate and not-candidate partition lost IDs');
 return {stats,sourceVerifiedNowRegistered:['SAO-1-031','SAO-1-066','MST-1-080','MST-1-060',...newlyRegistered].map(id=>({
  id,registered:index.cards.find(c=>c.id===id)?.registered||false,
  independentFaqCertified:false})),
  categories:['TWO_HAND_REVEAL','ONE_HAND_REVEAL','TOP_TO_OUTSIDE','TOP_REARRANGE','TOP_OTHER'],
  candidates:candidateRows,unportedNoTopCandidate};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const a=r37TopNCandidateReport();
 process.stdout.write(JSON.stringify({
  ...a.stats,sourceVerifiedNowRegistered:a.sourceVerifiedNowRegistered,
  candidateDetails:a.candidates.map(c=>({id:c.id,title:c.title,category:c.category,
   status:c.status,missing:c.reviewEvidence?.missing||null}))
 },null,2)+'\n');
}
