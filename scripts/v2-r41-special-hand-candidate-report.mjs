#!/usr/bin/env node
// R41: FIVE-TITLE CURRENT UNPORTED semantic triage, strictly not keyword READY.
// Operates on the SAME source catalogues and registry as R35/R37/R40.
import {pathToFileURL} from 'node:url';
import {capabilityIndex,ATOM_REVIEW_STATUSES} from './v2-r35-unported-atom-audit.mjs';
import {r40ProtectionCandidateReport} from './v2-r40-protection-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';

// Full official print, reviewed in R41; do not flatten multiple effects into
// the one recently implemented hand-entry primitive.
export const R41_OFFICIAL_REVIEWS=Object.freeze({
 'SAO-1-028':Object.freeze({status:'PARTIAL',series:'UA15BT',faq:["Q752"],missing:["conditionalLifeToHandAndZeroLifeLoss","grantBp2000AndOpponentAnyEffectChoiceImmunity","impactNullAndActiveLife"],
  note:"Yellow4/AP1 Leafa, optional LIFE to hand then +BP2000/opponent all-source immunity to next own START; Q752 losing after resolving with 0 LIFE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-028'}),
 'SAO-1-087':Object.freeze({status:'PARTIAL',series:'UA15BT',faq:["Q763","Q978"],missing:["opponentEventChoiceDiscardOneHandTax","otherCharacterWinDamageTwo","onceMainBuffOtherAndRaid"],
  note:"Green7/AP1 Kirito: opponent EVENT selection must discard own hand card, not AP tax; separate IMPACT1/other-win DAMAGE2, turn1 MAIN, RAID LIFE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA15BT%2FSAO-1-087'}),
 'SAO-2-064':Object.freeze({status:'PARTIAL',series:'EX08BT',faq:["Q1208"],missing:["frontGrantNamedAsunaCharacterEventHandDiscardTax","nonstackingSameNamedSources","opponentTurnScope"],
  note:"Green4/AP1 Kirito FRONT grants Asuna opponent CHARACTER/EVENT choice hand-discard-one surcharge, never stacks Q1208; DRAW LIFE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-064'}),
 'SAO-2-068':Object.freeze({status:'PARTIAL',series:'EX08BT',faq:[],missing:["mainRestDiscardOneThenRetireSelf","namedAsunaEnergy3Ap1FreeActiveFromHand","grantEnteredBp1000AndActiveLife"],
  note:"Green2/AP1 Yuuki MAIN costs REST plus discard and true self-retire, then optional hand Asuna green <=3 energy/AP1 ACTIVE with +BP1000; ACTIVE LIFE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-068'}),
 'BLC-4-042':Object.freeze({status:'PARTIAL',series:'EX15BT',faq:["Q2323"],missing:["threeWayChooseTopTwoArrangeOrMill","optionalDiscardTwoThenRecoverNamedOutside","trueRetireOtherThenFreeActiveNamedToEnergy"],
  note:"Blue3/AP1 Mayuri onPlay 3 modes; Q2323 printed NAME 涅骸部隊 is mandatory, not trait; third mode retire another character to deploy to ENERGY ACTIVE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-042'}),
 'BLC-4-036':Object.freeze({status:'PARTIAL',series:'EX15BT',faq:["Q2317","Q2318"],missing:["namedSourceDiscardToOutsideTrigger","energyAndOnlyArrancarTraitsGate","additionalRealApOneAndNameWideTurnOne"],
  note:"Blue6/AP1 Grimmjow after specific own source DISCARD to outside: blue energy>=4 and trait gate, actual AP1 payment, ACTIVE, once per turn across names Q2317/Q2318, GET LIFE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-036'}),
 'SLG-1-028':Object.freeze({status:'PARTIAL',series:'UA51BT',faq:[],missing:["unconditionalActiveOnPlay","namedShadowSoldierFromHandOrOutsideRest","twoZoneUidSafeCandidate"],
  note:"Purple4/AP2 Igris enters ACTIVE, onPlay optional named Shadow Soldier from EITHER hand or outside REST enters; GET LIFE",source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-028'}),
 'SAO-2-069':Object.freeze({status:'PARTIAL',series:'EX08BT',faq:[],
  missing:['opponentAttackAndOwnAttackPhaseEndTrueRetire',
   'onPlayOptionalOpponentFrontBp4000Retirement',
   'onRetireFreeRestNamedAsunaPrintedEnergy3Ap1',
   'raidBaseTimingAndRaidLife',
   'nestedRetireAndEntrySourceOrdering'],
  note:'Official green ENERGY4/AP1/BP4000 ALO Yuuki, Raid 〈ユウキ〉. On both players attack-phase end true-retire; onPlay optional opponent FRONT BP<=4000 retire; onRetire optionally HAND green printed ENERGY<=3/AP1 〈アスナ〉 REST enter; RAID LIFE. Existing free-entry alone cannot fully port.',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX08BT%2FSAO-2-069'}),
 'MST-1-067':Object.freeze({status:'RULE BLOCKED',series:'UA54BT',faq:['Q2162'],
  missing:['officialPrintVsQ2162SourceScopeConflict','raidBaseTrueRetireChoiceOrder'],
  note:'R40 official scope conflict unresolved. Never infer opponent-any vs opponent-CHARACTER or force acceptance.',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-067'})
});
const includes=(s,words)=>words.some(w=>s.includes(w));
function candidateFlags(c){
 const t=c.sourceText||'';
 const outsideRecover=/(?:場外|廢棄區|弃牌区|outside).{0,100}(?:手札に加え|加入手牌|回收)/iu.test(t);
 const handDeploy=!!c.handRestTextFlags;
 const activeHand=handDeploy&&/(?:アクティブで登場|ACTIVE.{0,8}(?:登場|进场)|激活登場)/iu.test(t);
 const restHand=handDeploy&&/(?:レストで登場|REST.{0,8}(?:登場|入場)|橫置登場)/iu.test(t);
 const namedHand=handDeploy&&/(?:〈[^〉]+〉|〈[^>]+〉)/u.test(t);
 const printedAp=handDeploy&&/(?:消費AP|印刷AP|consume AP)/iu.test(t);
 const printedEnergy=handDeploy&&/(?:必要エナジー|必要能源)/iu.test(t);
 const protection=!!c.protectionTextFlags;
 const retireThenHand=handDeploy&&/(?:退場時|退場させた場合|退场时|after.{0,15}retire)/iu.test(t);
 const moveThenFollowup=/(?:場外|手札|デッキ|退場).{0,125}(?:そうした場合|そのキャラ|移動した場合|そうしたら)/iu.test(t);
 return {outsideRecover,handDeploy,activeHand,restHand,namedHand,
  printedAp,printedEnergy,protection,retireThenHand,moveThenFollowup};
}
export function r41SpecialHandCandidateReport(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const unported=index.cards.filter(c=>!c.registered);
 const truth=new Set(inventory.series.flatMap(x=>x.unportedIds));
 if(index.cards.length!==700||truth.size!==unported.length||index.unportedSearched!==unported.length||
    new Set(unported.map(x=>x.id)).size!==unported.length||
    unported.some(x=>!truth.has(x.id)))
  throw Error('R41 full five-title independent unported partition mismatch');
 const music=index.cards.find(x=>x.id==='SAO-2-060');
 if(!music?.registered||!music.operations.includes('deployOwnHandSpecial'))
  throw Error('R41 official SAO-2-060 full entry registry prerequisite missing');
 const official=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-069');
 if(!official||!official.effectJa.includes('アタックフェイズ終了時')||
   !official.effectJa.includes('必要エナジーが3以下')||
   !official.effectJa.includes('〈アスナ〉')||
   !official.effectJa.includes('退場時')||
   official.trigger!=='raid')
  throw Error('Official SAO-2-069 multi-effect source changed');
 const p40=r40ProtectionCandidateReport();
 const cands=unported.map(c=>{
  const flags=candidateFlags(c),sourceReview=R41_OFFICIAL_REVIEWS[c.id];
  const oldReview=p40.sourcePinnedReviews.find(x=>x.id===c.id);
  const state=sourceReview?.status||oldReview?.status||
    (c.status==='SOURCE PENDING'?'SOURCE PENDING':'REVIEW PENDING');
  if(!ATOM_REVIEW_STATUSES.includes(state))throw Error('Unsupported review status '+c.id);
  return {...c,flags,status:state,review:sourceReview||null};
 });
 const selected=cands.filter(c=>Object.values(c.flags).some(Boolean)||c.review);
 const candidates=selected.map(c=>({
  id:c.id,title:c.title,status:c.status,sourceUrl:c.review?.source||c.sourceUrl,
  fingerprint:c.sourceFingerprint,flags:c.flags,
  missing:c.review?[...c.review.missing]:null,
  // Textual candidates remain explicitly non-ready.
  evidence:c.review?{note:c.review.note,faq:[...c.review.faq]}:null
 }));
 const getCount=name=>cands.filter(c=>c.flags[name]).length;
 const breakdown=Object.fromEntries(ATOM_REVIEW_STATUSES.map(x=>[x,candidates.filter(c=>c.status===x).length]));
 const stats={catalogueSize:index.cards.length,registered:inventory.totals.pilotImplemented,
  unportedSearched:unported.length,sourceTextScanned:unported.length,
  candidateUniqueUids:candidates.length,handDeployMentions:getCount('handDeploy'),
  outsideRecoveryMentions:getCount('outsideRecover'),activeHandMentions:getCount('activeHand'),
  restHandMentions:getCount('restHand'),protectionMentions:getCount('protection'),
  retireThenHandMentions:getCount('retireThenHand'),
  printedApMentions:getCount('printedAp'),printedEnergyMentions:getCount('printedEnergy'),
  manuallyVerifiedUnportedR41:Object.keys(R41_OFFICIAL_REVIEWS).filter(id=>truth.has(id)).length,
  readyFromKeywordOnly:0,byStatus:breakdown,
  byTitle:Object.fromEntries(inventory.series.map(row=>[row.title,candidates.filter(c=>c.title===row.title).length]))};
 if(candidates.some(c=>c.status==='READY'&&!c.review))
  throw Error('R41 unreviewed keyword candidate promoted to READY');
 return {stats,registeredRepresentative:'SAO-2-060',
  registeredSharedPrimitive:'deployOwnHandSpecial',reviews:R41_OFFICIAL_REVIEWS,
  candidates,remainingWithoutKeywords:unported.map(c=>c.id).filter(id=>!candidates.some(z=>z.id===id)),
  caution:'Every one of the 700 source IDs was indexed; textual matches are NOT full-print READY. Official FAQ full independence remains separately uncertified.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=r41SpecialHandCandidateReport();
 console.log(JSON.stringify({stats:r.stats,
  reviewedUnported:r.candidates.filter(c=>c.evidence).map(x=>({id:x.id,status:x.status,missing:x.missing})),
  flagged:r.candidates.map(c=>({id:c.id,title:c.title,status:c.status,flags:c.flags}))},null,2));
}
