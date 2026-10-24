#!/usr/bin/env node
// R35: independent evidence ledger, NOT a registry capability switch.
// Never derive a card's certification from how many tests happened to pass.
import {pathToFileURL} from 'node:url';
import {V2_SOURCE_CATALOGUES,v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {EXPECTED_V2_IDS} from '../tests/fixtures/v2-integrated-id-manifest.mjs';

export const R35_CHECKS=Object.freeze([
 'officialIdentity','printedStats','printedEffects','activationTiming',
 'costsAndTargeting','optionalAndMandatory','normalRaidAndLife',
 'sourceResolution','sealDepartureReentryExpiry','humanNormalHard',
 'uidSerializationAndPrivacy','crossTitleFullMatch','applicableFaqAudit'
]);
export const R35_STATUS=Object.freeze({
 unported:'unported',
 registered:'registered-unreviewed',
 partial:'partial-effects-tested',
 printed:'full-print-verified-faq-pending',
 faqGap:'official-ruling-gap',
 certified:'complete-independent-official-acceptance'
});
const sources=Object.freeze({
 'SAO-1-087':['sword-art-online','UA15BT','tests/v2-r47-sao087-official-candidate.test.mjs',['Q763','Q978']],
 'SAO-2-064':['sword-art-online','EX08BT','tests/v2-r46-sao064-full-print.test.mjs',['Q1208','Q1119']],
  'SAO-2-056':['sword-art-online','EX08BT','tests/v2-r39-retire-search-real.test.mjs',[]],
  'MST-1-049':['mushoku-tensei','UA54BT','tests/v2-r39-retire-search-real.test.mjs',[]],
  'SAO-1-056':['sword-art-online','UA15BT','tests/v2-r39-sao056-official.test.mjs',[]],
 'MST-1-031':['mushoku-tensei','UA54BT','tests/v2-r38-mst031-real.test.mjs',['Q2152']],
 'SLG-1-046':['solo-leveling','UA51BT','tests/v2-r38-slg046-real.test.mjs',[]],
 'BLC-1-070':['bleach','UA08BT','tests/v2-r38-blc070-real.test.mjs',[]],
 'SAO-1-031':['sword-art-online','UA15BT','tests/v2-r37-sao-two-events.test.mjs',['Q1119','Q312','Q313','Q314']],
 'SAO-1-066':['sword-art-online','UA15BT','tests/v2-r37-sao-two-events.test.mjs',['Q1119','Q312','Q313','Q314']],
 'SAO-2-074':['sword-art-online','EX08BT','tests/v2-r36-real-discount-cards.test.mjs',['Q1209','Q1210','Q670']],
 'MST-1-060':['mushoku-tensei','UA54BT','tests/v2-r37-mst060-main-step.test.mjs',[]],
 'MST-1-080':['mushoku-tensei','UA54BT','tests/v2-r37-mst080-event-front.test.mjs',[]],
 'MST-1-062':['mushoku-tensei','UA54BT','tests/v2-r36-real-discount-cards.test.mjs',['Q2161','Q670']],
 'SAO-1-005':['sword-art-online','UA15BT','tests/v2-r31-sao005-official-registry.test.mjs',[]],
 'TTG-1-028':['gurren-lagann','UA56BT','tests/v2-r32-ttg028-official.test.mjs',[]],
 'SLG-1-070':['solo-leveling','UA51BT','tests/v2-r33-slg070-official.test.mjs',['Q2062']],
 'MST-1-059':['mushoku-tensei','UA54BT','tests/v2-r34-mst059-official.test.mjs',[]]
});
// Every status is an independently authored finding; none is inferred from
// passing a generic regression or membership in the V2 implementation.
export const R35_INDEPENDENT_REVIEWS=Object.freeze(Object.fromEntries(
 Object.entries(sources).map(([id,[title,series,testFile,knownFaq]])=>[id,Object.freeze({
  id,title,series,officialUrl:
   'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+
    series+'%2F'+id,
  testFiles:Object.freeze([testFile]),
  knownApplicableFaq:Object.freeze(knownFaq),
  faqSearchOutcome:knownFaq.length?'specific-ruling-tested-but-not-exhaustive':
   'no-card-specific-ruling-confirmed; general-rules-audit-pending',
  status:R35_STATUS.partial,
  checks:Object.freeze(Object.fromEntries(R35_CHECKS.map(x=>[x,
    // The cited regression establishes particular scenarios, not exhaustive
    // negative interactions for every official FAQ and action/UID lifecycle.
    ['officialIdentity','printedStats'].includes(x)?'supported':'pending'
  ]))),
  openQuestions:Object.freeze(['Independent complete FAQ applicability search',
   'All print branches + normal/Raid/LIFE + seal/exit/reentry combinations',
   'Multi-effect real 50-card full-game/AI/restore coverage'])
 })])));
const owns=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function assertR35Review(row){
 if(!row||!owns(R35_INDEPENDENT_REVIEWS,row.id)||
  row.title!==R35_INDEPENDENT_REVIEWS[row.id].title||
  !Object.values(R35_STATUS).includes(row.status)||
  Object.keys(row.checks||{}).sort().join('|')!==[...R35_CHECKS].sort().join('|')||
  Object.values(row.checks).some(v=>!['supported','pending','blocked','not-applicable'].includes(v)))
  throw Error('Invalid R35 independent review descriptor');
 if(row.status===R35_STATUS.certified &&
  (Object.values(row.checks).some(v=>!['supported','not-applicable'].includes(v))||
   row.faqSearchOutcome.includes('pending')||!row.testFiles.length))
  throw Error('Cannot assert exhaustive official certification from partial tests');
 return true;
}
export function r35CardCertificationInventory(){
 const baseline=v2AllTitleInventory();
 const entries=[];
 for(const group of baseline.series){
  const registered=new Set(group.pilotIds);
  const records=new Map();
  for(const source of V2_SOURCE_CATALOGUES[group.title]){
   const id=source.identity||source.id;
   if(!id||records.has(id)||source.type==='ap'||source.type==='action_point')continue;
   if(!/^([A-Z]+)-\d+-\d+$/.test(id))continue;
   records.set(id,source);
  }
  for(const [id] of records){
   const review=R35_INDEPENDENT_REVIEWS[id];
   if(review) {
    if(review.title!==group.title||!registered.has(id)||
     !EXPECTED_V2_IDS[group.title].includes(id))throw Error('Review registry/manifest mismatch '+id);
    assertR35Review(review);
   }
   entries.push({id,title:group.title,
    registered:registered.has(id),
    status:review?.status||(registered.has(id)?R35_STATUS.registered:R35_STATUS.unported),
    reviewed:!!review});
  }
  // Fail closed if the catalogue model changes.
  if(records.size!==group.total)throw Error('Source catalogue mismatch '+group.title);
 }
 const counts={};
 for(const e of entries)counts[e.status]=(counts[e.status]||0)+1;
 if(entries.length!==baseline.totals.total ||
  entries.filter(x=>x.registered).length!==baseline.totals.pilotImplemented ||
  entries.filter(x=>!x.registered).length!==baseline.totals.blocked ||
  (counts[R35_STATUS.certified]||0)>baseline.totals.fullyAccepted)
  throw Error('Independent certification count must not exceed separately audited acceptance');
 return {total:entries.length,registered:baseline.totals.pilotImplemented,
  unported:baseline.totals.blocked,
  independentlyCertified:counts[R35_STATUS.certified]||0,
  counts,entries};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const {total,registered,unported,independentlyCertified,counts}=r35CardCertificationInventory();
 process.stdout.write(JSON.stringify({
  total,registered,unported,independentlyCertified,counts,
  reviewIds:Object.keys(R35_INDEPENDENT_REVIEWS)
 },null,2)+'\n');
}
