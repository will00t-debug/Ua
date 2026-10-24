#!/usr/bin/env node
// R45 evidence-led full five-title re-scan. This is the SAME R35 capability
// index and R44 official roster, never a second canonical card database.
// Broad text hits are REVIEW PENDING, not playable or semantically READY.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r44AttackEndFreeRestFullRoster} from './v2-r44-phase-retire-candidate-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';

export const R45_OFFICIAL_FULL_PRINT_REVIEWS=Object.freeze({
 'SAO-1-087':Object.freeze({status:'PARTIAL',faq:['Q763','Q978'],number:'UA15BT/SAO-1-087',
  missing:['effectSourceEventOnlySelectionHandTaxAtomicPayment',
   'otherOwnCharacterBattleWinOnAttackAndBlock','temporaryDamage2',
   'raidImpactAndMainTurn1FullAcceptance','raidLife']}),
 'SAO-2-064':Object.freeze({status:'PARTIAL',faq:['Q1208'],number:'EX08BT/SAO-2-064',
  missing:['frontSourcePrintedNameAura','selectionHandDiscardTaxAtomicPayment',
   'mandatoryEventPreflight','drawLifeAndPhysicalSaveRestore']}),
 'BLC-4-069':Object.freeze({status:'PARTIAL',faq:['Q2337','Q2338'],number:'EX15BT/BLC-4-069',
  missing:['attackEndAfterBattleOrLifeTrigger','distinctGreenEventFieldOutsidePrintedNames',
   'physicalFrontEnergySlotSwap','raidLifeAndPrintedTraitNextHandApDiscount']}),
 'BLC-4-042':Object.freeze({status:'PARTIAL',faq:['Q2323'],number:'EX15BT/BLC-4-042',
  missing:['mandatoryThreeWayChooseOne','top2AnyNumberTopOrderRestOutside',
   'payExactlyTwoHandForNamedOutsideRecovery',
   'optionalTrueRetireThenNamedBlueActiveEnergyEntry','drawLife']})
});
const patternFlags=text=>({
 selectionDiscardTax:/選ぶ際|選ばれる際|選擇時|手札を1枚場外に置かないと選べない/u.test(text),
 opponentEvent:/イベントカードの効果|EVENT效果|EVENT 的效果/u.test(text),
 opponentCharacter:/キャラの効果|角色效果/u.test(text),
 opponentTurn:/相手のターン中|對手回合/u.test(text),
 namedSelectionGrant:/得る|付与|獲得|授予/u.test(text)&&/選ぶ|選択|選擇/u.test(text),
 nonstack:/重複しない|不疊加/u.test(text),
 attackEnd:/アタック終了時|アタックの終了時|攻擊結束時/u.test(text),
 distinctOutside:/カード名.*種類|不同卡名/u.test(text),
 topOrder:/望む順|任意順序/u.test(text),
 conditionalRetire:/退場させてもよい|可以讓.*退場/u.test(text)
});
function pinSao(id,number,phrases){
 const c=SAO_OFFICIAL_CARDS.find(x=>x.id===id);
 if(!c||c.number!==number||phrases.some(p=>!c.effectJa?.includes(p)))
  throw Error('R45 official Japanese SAO full print drift '+id);
}
export function r45FiveTitleSourceTaxRescan(){
 const roster=v2AllTitleInventory(),index=capabilityIndex(roster),
  previous=r44AttackEndFreeRestFullRoster();
 const notPorted=index.cards.filter(c=>!c.registered);
 const ids=new Set(roster.series.flatMap(x=>x.unportedIds));
 if(index.cards.length!==700||roster.series.length!==5||
  notPorted.length!==roster.totals.blocked||
  ids.size!==notPorted.length||notPorted.some(c=>!ids.has(c.id))||
  previous.summary.unportedSearched!==notPorted.length)
  throw Error('R45 did not search every unported card in five title catalogues');
 pinSao('SAO-1-087','UA15BT/SAO-1-087',
  ['バトルに勝利した時','ダメージ','イベントカードの効果',
   '手札を1枚場外','ターン1']);
 pinSao('SAO-2-064','EX08BT/SAO-2-064',
  ['フロントLにある場合','〈アスナ〉','キャラの効果やイベントカード',
   '手札を1枚場外','重複しない']);
 // Earlier full-print candidates can be formally registered by a later
 // independently reviewed round. Verify migration against the live canonical
 // five-title registered IDs, rather than pretending the 2026-10-22 unported
 // snapshot is immutable. Unknown or missing identities still fail closed.
 const registered=new Set(roster.series.flatMap(row=>row.pilotIds));
 for(const id of Object.keys(R45_OFFICIAL_FULL_PRINT_REVIEWS))
  if(!ids.has(id)&&!registered.has(id))
   throw Error('R45 official candidate disappeared from both registries '+id);
 const historical=new Map(previous.flagged.map(x=>[x.id,x.status]));
 const rows=notPorted.map(c=>{
  const review=R45_OFFICIAL_FULL_PRINT_REVIEWS[c.id];
  const flags=patternFlags(c.sourceText||'');
  return {id:c.id,title:c.title,status:review?.status||historical.get(c.id)||'REVIEW PENDING',
   sourceUrl:c.sourceUrl,flags,officialFullPrintReviewed:!!review,
   missing:review?[...review.missing]:null};
 });
 const counts={catalogue:700,registered:roster.totals.pilotImplemented,
  unportedSearched:rows.length,series:roster.series.length,
  officialFullPrintReviewedThisRound:Object.keys(R45_OFFICIAL_FULL_PRINT_REVIEWS).length,
  keywordCandidates:rows.filter(x=>Object.values(x.flags).some(Boolean)).length,
  statuses:Object.fromEntries([...new Set(rows.map(x=>x.status))].map(status=>
   [status,rows.filter(x=>x.status===status).length])),
  keywordCategories:Object.fromEntries(Object.keys(patternFlags('')).map(k=>
   [k,rows.filter(x=>x.flags[k]).length])),
  byTitle:Object.fromEntries(roster.series.map(x=>[x.title,{
   registered:x.pilotImplemented,unported:x.blocked}]))};
 if(counts.registered+counts.unportedSearched!==700||
  rows.some(x=>x.status==='READY'&&!x.officialFullPrintReviewed))
  throw Error('R45 unverified keyword was upgraded to READY');
 return {counts,officialReviews:R45_OFFICIAL_FULL_PRINT_REVIEWS,
  reviewedRows:rows.filter(x=>x.officialFullPrintReviewed),
  keywordOnly:rows.filter(x=>!x.officialFullPrintReviewed&&
   Object.values(x.flags).some(Boolean)).map(x=>({id:x.id,status:x.status,flags:x.flags})),
  remainingPending:rows.filter(x=>x.status==='REVIEW PENDING').map(x=>x.id),
  safetyBlockers:['MST-1-067 Q2162','BLC-4-034 multi-layer Raid',
   'second unsupported nested LIFE']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=r45FiveTitleSourceTaxRescan();
 console.log('R45_FIVE_TITLE_SCAN '+JSON.stringify(r.counts));
 console.log('R45_OFFICIAL_REVIEWS '+JSON.stringify(r.reviewedRows));
 console.log('R45_SAFETY_BLOCKERS '+JSON.stringify(r.safetyBlockers));
}
