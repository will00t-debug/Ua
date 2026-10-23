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
  return {...g,historicalR35Assessment:true,currentlyRegisteredIds:g.ids.filter(id=>!unported.has(id)),currentlyUnportedIds:g.ids.filter(id=>unported.has(id)),sourceUrls:g.ids.map((id,i)=>
   'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+
   g.series[i]+'%2F'+id)};
 });
 const pending=[...unported].filter(id=>!seen.has(id)).sort();
 if(seen.size+pending.length!==audit.totals.blocked)throw Error('Missing unported UID partition');
 const index=capabilityIndex(audit);
 return {totalUnported:audit.totals.blocked,
  manuallySourceMatched:seen.size,needsIndividualSemanticAudit:pending.length,
  groups,pendingIds:pending, capabilityIndex:index,
  handRestPotential:index.handRestPotential,
  handRestPotentialCount:index.handRestPotential.length,
  retireTopPotential:index.retireTopPotential,
  retireTopPotentialCount:index.retireTopPotential.length,
  protectionPotential:index.protectionPotential,
  protectionPotentialCount:index.protectionPotential.length};
}
// Candidate detection is deliberately broad and is NEVER semantic acceptance.
export const ATOM_REVIEW_STATUSES=Object.freeze(['READY','NEAR READY','PARTIAL',
 'RULE BLOCKED','SOURCE PENDING','REVIEW PENDING']);
// Manually reviewed against official full print on 2026-10-23. This is a
// review overlay on the existing catalogue, never a second card roster.
export const R36_DISCOUNT_REVIEWS=Object.freeze({
 'SAO-2-074':{series:'EX08BT',status:'READY',missing:[],faq:['Q1209','Q1210','Q670']},
 'MST-1-062':{series:'UA54BT',status:'READY',missing:[],faq:['Q2161','Q670']},
 'BLC-1-070':{series:'UA08BT',status:'READY',missing:[],faq:[]},
 'BLC-2-030':{series:'EX07BT',status:'PARTIAL',missing:['nextHandNameFilter','enteredNamedCharacterThisTurn'],faq:[]},
 'BLC-4-055':{series:'EX15BT',status:'PARTIAL',missing:['optionalRemoveOtherThen','nextHandTraitOrNameFilter','upToTwoDistinctBuffTargets'],faq:['Q2328']},
 'BLC-4-069':{series:'EX15BT',status:'NEAR READY',missing:['attackEndDistinctOutsideNamesSwap'],faq:['Q2337','Q2338']},
 'TTG-1-080':{series:'UA56BT',status:'PARTIAL',missing:['fieldOrRaidBaseNamePlayGate','nextHandRaidOnlyNameOrFilter','eventSourceDiscount'],faq:['Q2300']},
 'SAO-2-031':{series:'EX08BT',status:'PARTIAL',missing:['outsideFourOrderedBottomCost','grantDamageTwo'],faq:['Q1202']},
 'MST-1-031':{series:'UA54BT',status:'READY',missing:[],faq:['Q2152']}
});
function operations(value,out=new Set()){
 if(!value||typeof value!=='object')return out;
 if(typeof value.op==='string')out.add(value.op);
 for(const v of Object.values(value))if(v&&typeof v==='object')operations(v,out);
 return out;
}
export function prioritizeMissingAtoms(cards){
 const gaps=new Map();
 for(const c of cards.filter(c=>!c.registered&&c.missingAtoms))for(const atom of c.missingAtoms){
  if(!gaps.has(atom))gaps.set(atom,{atom,ids:[],titles:[],directCompletionIds:[],ruleBlockedIds:[]});
  const row=gaps.get(atom);row.ids.push(c.id);if(!row.titles.includes(c.title))row.titles.push(c.title);
  if(c.missingAtoms.length===1&&c.status==='NEAR READY')row.directCompletionIds.push(c.id);
  if(c.status==='RULE BLOCKED')row.ruleBlockedIds.push(c.id);
 }
 return [...gaps.values()].map(g=>{
  const old=R35_SHARED_ATOM_CANDIDATES.find(x=>x.atom===g.atom);
  const risk=old?.risk||(/attackEnd|Raid|Remove|Damage/.test(g.atom)?'high':'medium');
  const complexity=/Filter/.test(g.atom)?'low':risk==='high'?'high':'medium';
  const ruleClarity=g.ids.every(id=>R36_DISCOUNT_REVIEWS[id]?.faq.length)?'specific-faq-reviewed':'further-scope-review';
  return {...g,risk,complexity,ruleClarity,
  score:5*g.directCompletionIds.length+2*g.titles.length+g.ids.length-10*g.ruleBlockedIds.length-(risk==='high'?3:1)-(complexity==='high'?2:0)+(ruleClarity==='specific-faq-reviewed'?1:0),
  note:'Triage score only: complexity and core regression risk require reviewer judgment before implementation'
 };}).sort((a,b)=>b.score-a.score||a.atom.localeCompare(b.atom));
}
export function capabilityIndex(inventory=v2AllTitleInventory()){
 const cards=[];const usage=new Map();
 for(const title of inventory.series){
  const pack=registeredV2TitlePack(title.title),seen=new Set();
  for(const c of V2_SOURCE_CATALOGUES[title.title]){
   const id=c.identity||c.id;if(seen.has(id)||!title.pilotIds.includes(id)&&!title.unportedIds.includes(id))continue;
   seen.add(id);
   const text=c.effectJa||c.effect||'',registered=!!pack.cards[id],review=R36_DISCOUNT_REVIEWS[id];
   const ops=registered?[...operations(pack.cards[id])].sort():[];
   for(const op of ops){if(!usage.has(op))usage.set(op,[]);usage.get(op).push(id);}
   const groups=R35_SHARED_ATOM_CANDIDATES.filter(g=>g.ids.includes(id));
   const discountCandidate=/(?:次に|下一|下次)/u.test(text)&&/(?:AP|ＡＰ)/u.test(text)&&/(?:-1|−1|－1|減少|減費)/u.test(text);
   // Broad candidates, not a proof of printed semantic equivalence.
   const handRestMention=/(?:手札から|手札にある|手札の|從手牌|从手牌)/u.test(text)&&
    /(?:登場|登场|入場|進場)/u.test(text);
   const handRestTextFlags=handRestMention?{
    explicitRest:/(?:レスト|REST|橫置|横置)/iu.test(text),
    color:/(?:青|藍|蓝|赤|紅|红|黄|緑|綠|紫)/u.test(text),
    printedEnergy:/(?:必要エナジー|必要能源)/u.test(text),
    printedAp:/(?:消費AP|消费AP|印刷AP)/iu.test(text)}:null;
   // R39: capture textual candidates after every new true-retire primitive;
   // keyword hits are not sufficient for semantic READY or official FAQ claims.
   const retireTopFlags=/(?:退場|退场|retire)/iu.test(text)&&
    /(?:山札|牌庫|牌堆|deck)/iu.test(text)&&
    /(?:上から|top|頂|查看|見る)/iu.test(text)?{
     conditional:/(?:そうした場合|成功|場合|之後|after|如果)/iu.test(text),
     field:/(?:フィールド|FIELD|場地)/iu.test(text),
     character:/(?:キャラ|character|角色)/iu.test(text),
     active:/(?:アクティブ|ACTIVE|激活)/iu.test(text)
    }:null;
   // R40: never infer the FULL printed card or source scope from keywords.
   const protectionMention=/(?:選ばれない|選択されない|選べない|不會被選擇|不能被選擇|无法被选择)/iu.test(text)&&
    /(?:効果|能力|トリガー|Trigger|觸發|触发)/iu.test(text);
   const protectionTextFlags=protectionMention?{
    characterScope:/(?:キャラの効果|角色效果|character.{0,8}effect)/iu.test(text),
    eventScope:/(?:イベントの効果|EVENT.{0,8}effect|事件效果)/iu.test(text),
    triggerScope:/(?:トリガーの効果|Trigger.{0,8}effect|觸發效果)/iu.test(text),
    opponent:/(?:相手|對手|对手|opponent)/iu.test(text),
    timeBound:/(?:次の自分のターン|このターン|本回合|下個己方回合|until)/iu.test(text),
    conditional:/(?:場合|のみ|なら|如果|條件|条件|while)/iu.test(text),
    raid:/(?:レイド|Raid)/iu.test(text)
   }:null;
   cards.push({id,title:title.title,registered,sourceText:text,
    sourceTextLanguage:c.effectJa||/[のを]/u.test(text)?'ja':'catalogue-translation',
    sourceFingerprint:createHash('sha256').update(text).digest('hex'),
    sourceUrl:c.source||c.sourceUrl||null,operations:ops,
    status:review?.status||(!text?'SOURCE PENDING':'REVIEW PENDING'),
    officialReview:review?{reviewedOn:'2026-10-23',url:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+review.series+'%2F'+id,faq:review.faq}:null,
    missingAtoms:review?.missing||(groups.length?groups.map(g=>g.atom):null),
    priorSourceMatched:groups.length>0,
    requiredAtomCandidates:groups.map(g=>g.atom),
    searchHits:discountCandidate?['nextEligibleHandPlayApDiscount']:[],
    handRestTextFlags,retireTopFlags,protectionTextFlags,
    remaining:groups.map(g=>g.fullPortBlockedBy),
    // Old R35 groups are evidence pointers, not a full-card readiness certificate.
    semanticReviewRequired:!review});
  }
 }
 const atoms=[...new Set([...usage.keys(),...R35_SHARED_ATOM_CANDIDATES.map(g=>g.atom)])].sort().map(atom=>({
  atom,registeredIds:usage.get(atom)||[],
  unportedCandidates:cards.filter(c=>!c.registered&&(c.requiredAtomCandidates.includes(atom)||c.searchHits.includes(atom))).map(c=>c.id),
  titles:[...new Set(cards.filter(c=>c.operations.includes(atom)||c.requiredAtomCandidates.includes(atom)||c.searchHits.includes(atom)).map(c=>c.title))],
  readyIds:cards.filter(c=>c.status==='READY'&&c.requiredAtomCandidates.includes(atom)).map(c=>c.id)
 }));
 const handRestPotential=cards.filter(c=>!c.registered&&c.handRestTextFlags)
  .map(c=>({id:c.id,title:c.title,sourceUrl:c.sourceUrl,
   sourceFingerprint:c.sourceFingerprint,flags:c.handRestTextFlags,
   status:'REVIEW PENDING',
   note:'Requires full printed text and applicable FAQ check; no automatic READY'}));
 const protectionPotential=cards.filter(c=>!c.registered&&c.protectionTextFlags)
  .map(c=>({id:c.id,title:c.title,sourceUrl:c.sourceUrl,
   sourceFingerprint:c.sourceFingerprint,flags:c.protectionTextFlags,
   status:c.status==='SOURCE PENDING'?'SOURCE PENDING':'REVIEW PENDING',
   note:'Textual scope flags are not a full official card review or READY certification'}));
 const retireTopPotential=cards.filter(c=>!c.registered&&c.retireTopFlags)
  .map(c=>({id:c.id,title:c.title,sourceUrl:c.sourceUrl,
   sourceFingerprint:c.sourceFingerprint,flags:c.retireTopFlags,
   status:c.status==='SOURCE PENDING'?'SOURCE PENDING':'REVIEW PENDING',
   note:'Text candidate only: complete printed effect/FAQ required'}));
 return {cards,atoms,handRestPotential,retireTopPotential,protectionPotential,
  unportedSearched:cards.filter(c=>!c.registered).length,
  reviewedDiscountCards:cards.filter(c=>c.officialReview).map(c=>c.id),
  priorities:prioritizeMissingAtoms(cards),
  apDiscountCandidates:cards.filter(c=>!c.registered&&c.searchHits.length).map(c=>c.id)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const audit=r35UnportedAtomAudit();
 process.stdout.write(JSON.stringify(audit,null,2)+'\n');
}
