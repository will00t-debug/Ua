#!/usr/bin/env node
// R35 reproducible semantic candidate inventory. Manually source-matched IDs
// are NOT automatically called fully port-able; remaining IDs stay explicitly
// unaudited rather than receiving a keyword-based, misleading DSL classification.
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const R35_SHARED_ATOM_CANDIDATES=Object.freeze([
 {rank:1,atom:'nextEligibleHandPlayApDiscount',
  ids:['SAO-2-074','MST-1-062'],series:['EX08BT','UA54BT'],
  missing:'Per-controller one-shot next matching hand-card play AP modifier, printed-stat predicate, consume on eligible paid play only',
  reuse:'SAO originally BP3500+ALO; MST original gen>=2 character only after optional bounce',
  existing:'chooseOne, paid-play validator, optional own-character bounce; no next-eligible-use AP cost status',
  faq:'Q1210 / Q2161: ineligible hand plays do not consume; original BP Q1209',
  reducer:'shared AP play cost and atomic consume only',risk:'medium-high',
  fullPortBlockedBy:'MST-1-062 also needs optional legal bounce and COLOR hand entry; SAO-2-074 has ACTIVE LIFE',
  sourceVerified:true},
 {rank:2,atom:'topNChooseUpToTwoThenOrderBottom',
  ids:['SAO-1-031','SAO-1-066'],series:['UA15BT','UA15BT'],
  missing:'0..2 distinct inspected physical UIDs, public reveal of chosen only, ordered remainder bottom, no discard',
  reuse:'SAO named Kirito/Alice/Eugeo OR versus SAO ALO trait; same inspected-card movement also used in TTG/SLG top-one',
  existing:'searchTopOneBottomDiscard, inspectTopArrange, effect-top-order, UID-safe reveal',
  faq:'specific FAQ not verified; both exact printed card texts reviewed',
  reducer:'extend existing TOP-N pending choice not another queue',risk:'medium',
  fullPortBlockedBy:'must preserve print AP/energy, DRAW LIFE and legal optional double pick',
  sourceVerified:true},
 {rank:3,atom:'cannotBeChosenByOppEffect',
  ids:['SAO-2-058','MST-1-067'],series:['EX08BT','UA54BT'],
  missing:'temporary target physical UID+stamp selection exclusion with source scopes, next own-start expiry',
  reuse:'SAO any opponent effects; MST any opponent effects with original generated-energy target precondition',
  existing:'continuousStates/selectionApTax legal target filters; cannot model outright unselectability as surcharge',
  faq:'SAO Q1206; MST Q2162; distinct source-scope variants cannot be flattened',
  reducer:'shared effect target validator and lifecycle state',risk:'high',
  fullPortBlockedBy:'SAO conditional Asuna AP refresh/ACTIVE LIFE; MST Raid+true onRetire base redeploy/RAID LIFE',
  sourceVerified:true},
 {rank:4,atom:'reuseFrontEnergyGrantOutsideOnPlay',
  ids:['MST-1-080','MST-1-060'],series:['UA54BT','UA54BT'],
  missing:'Use existing stamped FRONT permission from EVENT sequential draw2 or once-per-turn MAIN',
  reuse:'Both share R34 MST059 FRONT generation semantics; conditional entry timing differs',
  existing:'frontEnergyPermission, grantFrontEnergyOwnOtherFrontTrait, drawDiscard, mainOnce',
  faq:'printed meaning confirmed, direct specific timing FAQ not found',
  reducer:'prefer reuse existing effectQueue MAIN/event timing',risk:'medium',
  fullPortBlockedBy:'MST-060 STEP and MAIN action once/placement; MST-080 paid EVENT and DRAW LIFE',
  sourceVerified:true},
 {rank:5,atom:'conditionalSelfRetireThenTopSearch',
  ids:['SAO-2-056','MST-1-049'],series:['EX08BT','UA54BT'],
  missing:'true character/field retirement optional prerequisite gates top search with different count/filter/extra ACTIVE branch',
  reuse:'Retire own character in SAO; retire own field in MST — must keep type distinct',
  existing:'retireOwnCharacterOne, retireOwnFieldOne, searchTopOneBottomDiscard',
  faq:'print inspected; retirement interruption/choice ordering still needs independent evidence',
  reducer:'existing effectQueue if official cost ordering verified',risk:'high',
  fullPortBlockedBy:'SAO up to two returns on TOP5 vs MST up to one on TOP4, conditional ACTIVE, GET LIFE',
  sourceVerified:true}
]);
export function r35UnportedAtomAudit(){
 const audit=v2AllTitleInventory(),unported=new Set(audit.series.flatMap(x=>x.unportedIds));
 const seen=new Set(),groups=R35_SHARED_ATOM_CANDIDATES.map(g=>{
  if(g.ids.length!==g.series.length||new Set(g.ids).size!==g.ids.length)throw Error('Invalid R35 group IDs');
  for(const id of g.ids) {
   if(!Object.values(V2_SOURCE_CATALOGUES).some(cs=>cs.some(c=>(c.identity||c.id)===id)))throw Error('Unknown source catalogue: '+id);
   if(seen.has(id))throw Error('Duplicate audited source '+id);
   if(unported.has(id))seen.add(id);
  }
  return {...g,sourceUrls:g.ids.map((id,i)=>
   'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+
   g.series[i]+'%2F'+id)};
 });
 const pending=[...unported].filter(id=>!seen.has(id)).sort();
 if(seen.size+pending.length!==audit.totals.blocked)throw Error('Missing unported UID partition');
 return {totalUnported:audit.totals.blocked,
  manuallySourceMatched:seen.size,needsIndividualSemanticAudit:pending.length,
  groups,pendingIds:pending, capabilityIndex:capabilityIndex(audit)};
}
// Candidate detection is deliberately broad and is NEVER semantic acceptance.
export const ATOM_REVIEW_STATUSES=Object.freeze(['READY','NEAR READY','PARTIAL',
 'RULE BLOCKED','SOURCE PENDING','REVIEW PENDING']);
function operations(value,out=new Set()){
 if(!value||typeof value!=='object')return out;
 if(typeof value.op==='string')out.add(value.op);
 for(const v of Object.values(value))if(v&&typeof v==='object')operations(v,out);
 return out;
}
export function capabilityIndex(inventory=v2AllTitleInventory()){
 const cards=[];const usage=new Map();
 for(const title of inventory.series){
  const pack=registeredV2TitlePack(title.title),seen=new Set();
  for(const c of V2_SOURCE_CATALOGUES[title.title]){
   const id=c.identity||c.id;if(seen.has(id)||!title.pilotIds.includes(id)&&!title.unportedIds.includes(id))continue;
   seen.add(id);
   const text=c.effectJa||c.effect||'',registered=!!pack.cards[id];
   const ops=registered?[...operations(pack.cards[id])].sort():[];
   for(const op of ops){if(!usage.has(op))usage.set(op,[]);usage.get(op).push(id);}
   const groups=R35_SHARED_ATOM_CANDIDATES.filter(g=>g.ids.includes(id));
   const discountCandidate=/(?:次に|下一|下次)/u.test(text)&&/(?:AP|ＡＰ)/u.test(text)&&/(?:-1|−1|－1|減少|減費)/u.test(text);
   cards.push({id,title:title.title,registered,sourceText:text,
    sourceTextLanguage:c.effectJa||/[のを]/u.test(text)?'ja':'catalogue-translation',
    sourceFingerprint:createHash('sha256').update(text).digest('hex'),
    sourceUrl:c.source||c.sourceUrl||null,operations:ops,
    status:!text?'SOURCE PENDING':'REVIEW PENDING',
    priorSourceMatched:groups.length>0,
    requiredAtomCandidates:groups.map(g=>g.atom),
    searchHits:discountCandidate?['nextEligibleHandPlayApDiscount']:[],
    remaining:groups.map(g=>g.fullPortBlockedBy),
    // Old R35 groups are evidence pointers, not a full-card readiness certificate.
    semanticReviewRequired:true});
  }
 }
 const atoms=[...new Set([...usage.keys(),...R35_SHARED_ATOM_CANDIDATES.map(g=>g.atom)])].sort().map(atom=>({
  atom,registeredIds:usage.get(atom)||[],
  unportedCandidates:cards.filter(c=>!c.registered&&(c.requiredAtomCandidates.includes(atom)||c.searchHits.includes(atom))).map(c=>c.id),
  titles:[...new Set(cards.filter(c=>c.operations.includes(atom)||c.requiredAtomCandidates.includes(atom)||c.searchHits.includes(atom)).map(c=>c.title))],
  readyIds:cards.filter(c=>c.status==='READY'&&c.requiredAtomCandidates.includes(atom)).map(c=>c.id)
 }));
 return {cards,atoms,unportedSearched:cards.filter(c=>!c.registered).length,
  apDiscountCandidates:cards.filter(c=>!c.registered&&c.searchHits.length).map(c=>c.id)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const audit=r35UnportedAtomAudit();
 process.stdout.write(JSON.stringify(audit,null,2)+'\n');
}
