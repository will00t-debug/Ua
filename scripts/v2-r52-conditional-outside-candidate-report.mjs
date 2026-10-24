#!/usr/bin/env node
// R52: live five-title registry complement after generic conditional
// own-OUTSIDE named-card bounce/retire; no parallel catalogue or auto READY.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
const reg=/(?:場外|OUTSIDE|outside).{0,150}(?:〈|カード名|枚|合計|count)|(?:手札に戻す|返回手牌|回手).{0,150}(?:退場|退场|retire)/iu;
export function r52ConditionalFiveTitleRescan(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const pending=index.cards.filter(c=>!c.registered);
 const officialUnported=new Set(inventory.series.flatMap(s=>s.unportedIds));
 if(inventory.series.length!==5||index.cards.length!==700||
  pending.length!==officialUnported.size||
  inventory.totals.blocked!==pending.length||
  pending.some(c=>!officialUnported.has(c.id)))
  throw Error('R52 stale or incomplete five-title source complement');
 const candidates=pending.filter(c=>reg.test(c.sourceText||'')).map(c=>({
  id:c.id,title:c.title,status:'REVIEW PENDING',fingerprint:c.sourceFingerprint
 }));
 const reviewed=[
  ['SAO-1-100','UA15BT/SAO-1-100','Q767','conditional EVENT vs SPECIAL LIFE'],
  ['SAO-1-070','UA15BT/SAO-1-070',null,'own-turn BP 4 / independent IMPACT 6']
 ].filter(([id])=>officialUnported.has(id)).map(([id,source,faq,note])=>({
  id,source,faq,status:'PARTIAL',note
 }));
 const report={catalogue:700,registered:inventory.totals.pilotImplemented,
  unportedSearched:pending.length,textCandidates:candidates.length,
  readyVerified:0,manuallyReviewed:reviewed.length,
  byTitle:Object.fromEntries(inventory.series.map(s=>[s.title,{
   registered:s.pilotImplemented,unported:s.blocked,
   textCandidates:candidates.filter(c=>c.title===s.title).length
  }]))};
 if(report.registered+report.unportedSearched!==700||
  Object.values(report.byTitle).reduce((n,v)=>n+v.unported,0)!==pending.length)
  throw Error('R52 incomplete census');
 return {report,candidates,reviewed};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const result=r52ConditionalFiveTitleRescan();
 console.log('R52_ALL_FIVE_SOURCE_COMPLEMENT '+JSON.stringify(result.report));
 console.log('R52_OFFICIAL_REVIEWED_PARTIAL '+JSON.stringify(result.reviewed));
 console.log('R52_TEXT_MATCHES_NOT_READY '+JSON.stringify(result.candidates));
}
