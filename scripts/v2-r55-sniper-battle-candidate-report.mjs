#!/usr/bin/env node
// R55 source-complete UNPORTED rescan after two shared combat atoms.
// This never infers printable card readiness from a Japanese text hit.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r54FiveTitleSourceRescan} from './v2-r54-five-title-candidate-report.mjs';

const FOCUS=['TTG-1-067','BLC-4-044','SLG-1-022','SAO-1-097',
 'SLG-1-021','MST-1-009','SAO-1-071'];
export function r55SniperBattleFiveTitleAudit(){
 const inv=v2AllTitleInventory(),idx=capabilityIndex(inv);
 const remaining=idx.cards.filter(c=>!c.registered);
 const ids=new Set(inv.series.flatMap(x=>x.unportedIds));
 if(idx.cards.length!==700||remaining.length!==ids.size||
  remaining.some(x=>!ids.has(x.id))||idx.cards.length-remaining.length!==inv.totals.pilotImplemented)
  throw Error('R55 unported complement not complete');
 const historical=r54FiveTitleSourceRescan();
 if(historical.report.unportedSearched!==remaining.length)
  throw Error('R55/R54 source complement drift');
 const focus=FOCUS.map(id=>{
  const c=idx.cards.find(x=>x.id===id);
  if(!c||!c.sourceText?.length)throw Error('Missing R55 source '+id);
  const manuallyReviewed=['TTG-1-067','SLG-1-021','MST-1-009','SAO-1-071'].includes(id);
  const status=c.registered?'REGISTERED':
   manuallyReviewed?'PARTIAL':'REVIEW PENDING';
  return {id,title:c.title,status,source:c.sourceUrl,
   ...(id==='TTG-1-067'?{faq:['Q2295','Q65','Q66','Q67','Q68','Q69','Q70']}:{}),
   fingerprint:c.sourceFingerprint};
 });
 const searchGroups={
  sniper:historical.searches.sniper,
  battleWinDraw:historical.searches.battleWinDraw,
  outsideGroups:historical.searches.outsideGroups,
  attackEndSwap:historical.searches.attackEndSwap,
  namedOutsideTiers:historical.searches.namedOutsideTiers
 };
 const report={catalogue:700,registered:inv.totals.pilotImplemented,
  unportedSearched:remaining.length,
  sourceAuditedRegistered:focus.filter(c=>c.status==='REGISTERED').length,
  sourceAuditedPartial:focus.filter(c=>c.status==='PARTIAL').length,
  textualOnlyCandidates:focus.filter(c=>c.status==='REVIEW PENDING').length,
  readyInferredFromKeywords:0,
  independentFaqCertified:inv.totals.fullyAccepted,
  byTitle:Object.fromEntries(inv.series.map(x=>[x.title,{
   registered:x.pilotImplemented,unported:x.blocked}])),
  candidateCounts:Object.fromEntries(Object.entries(searchGroups).map(([k,v])=>[k,v.length]))
 };
 if(report.registered+report.unportedSearched!==700||
  Object.values(report.byTitle).reduce((n,x)=>n+x.unported,0)!==remaining.length||
  focus.some(x=>x.status==='REGISTERED'&&ids.has(x.id))||
  focus.some(x=>x.status!=='REGISTERED'&&!ids.has(x.id)))
  throw Error('R55 incomplete independently source-censored census');
 return {report,focus,searchGroups};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=r55SniperBattleFiveTitleAudit();
 console.log('R55_LIVE_FIVE_TITLE_RESCAN '+JSON.stringify(x.report));
 console.log('R55_AUDITED_FOCUS '+JSON.stringify(x.focus));
 for(const [k,v] of Object.entries(x.searchGroups))
  console.log('R55_UNPORTED_TEXT_ONLY_'+k.toUpperCase()+' '+JSON.stringify(v));
}
