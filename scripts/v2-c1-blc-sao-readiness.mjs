#!/usr/bin/env node
// Cursor C1: live BLEACH + SAO unported complement.
// A Japanese or Chinese text hit is never READY. Only cards whose whole
// official print was read on 2026-10-24 are classified below.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';

const FOCUS=['bleach','sword-art-online'];
const PORTED=['BLC-1-058','BLC-1-088','BLC-1-101','BLC-4-073'];
// Official iframe pages fetched 2026-10-24. None of these pages contained an FAQ.
// SAO-2-039 left this list when the shared trait-used-this-turn ledger landed.
export const C1_OFFICIAL_REVIEWS=Object.freeze({});
export function c1BlcSaoReadiness(){
 const inv=v2AllTitleInventory(),index=capabilityIndex(inv);
 const focus=inv.series.filter(s=>FOCUS.includes(s.title));
 if(focus.length!==2)throw Error('C1 title focus drifted');
 const unported=new Set(focus.flatMap(s=>s.unportedIds));
 const cards=index.cards.filter(c=>FOCUS.includes(c.title)&&!c.registered);
 if(cards.length!==unported.size||cards.some(c=>!unported.has(c.id)))
  throw Error('C1 did not list every current BLEACH and SAO unported id');
 const reviewed=cards.filter(c=>C1_OFFICIAL_REVIEWS[c.id]).map(c=>{
  const row=C1_OFFICIAL_REVIEWS[c.id];
  return {id:c.id,title:c.title,status:row.status,missing:row.missing,
   source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+
    row.set+'%2F'+c.id};
 });
 const known=new Set(reviewed.map(c=>c.id));
 const pending=cards.filter(c=>!known.has(c.id)).map(c=>({
  id:c.id,title:c.title,status:'REVIEW PENDING'}));
 const ported=PORTED.map(id=>{
  const card=index.cards.find(c=>c.id===id);
  if(!card||!card.registered)throw Error('C1 port missing from registry '+id);
  return {id,title:card.title,status:'REGISTERED'};
 });
 const report={
  catalogue:700,registered:inv.totals.pilotImplemented,
  bleachSaoUnported:cards.length,
  officialReviewedStillUnported:reviewed.length,
  reviewPending:pending.length,
  readyFromKeywords:0,
  registeredThisRound:ported.length,
  byTitle:Object.fromEntries(focus.map(s=>[s.title,{
   registered:s.pilotImplemented,unported:s.blocked}])),
  byStatus:{
   'ENGINE BLOCKED':reviewed.filter(c=>c.status==='ENGINE BLOCKED').length,
   PARTIAL:reviewed.filter(c=>c.status==='PARTIAL').length,
   'REVIEW PENDING':pending.length
  }
 };
 if(report.officialReviewedStillUnported+report.reviewPending!==cards.length||
  reviewed.some(c=>c.status==='READY')||
  Object.values(report.byTitle).reduce((n,s)=>n+s.unported,0)!==cards.length)
  throw Error('C1 classification did not cover the live complement');
 return {report,reviewed,pending,ported};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c1BlcSaoReadiness();
 console.log('C1_BLC_SAO_READINESS '+JSON.stringify(x.report));
 console.log('C1_REGISTERED_THIS_ROUND '+JSON.stringify(x.ported));
 console.log('C1_OFFICIAL_STILL_UNPORTED '+JSON.stringify(x.reviewed));
}
