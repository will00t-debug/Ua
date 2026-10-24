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
export const C1_OFFICIAL_REVIEWS=Object.freeze({
 'BLC-1-091':{status:'PARTIAL',set:'UA08BT',
  missing:'name alias 山本 元柳斎 重國 exists; BP while own front has no other character does not'},
 'BLC-2-041':{status:'ENGINE BLOCKED',set:'EX07BT',
  missing:'BP while another own character truly retired this turn; the current count includes this physical card'},
 'SAO-1-076':{status:'ENGINE BLOCKED',set:'UA15BT',
  missing:'on play, REST-play up to one hand character with energy at most 2, AP 1 and trait ALO; no color is printed'},
 'SAO-1-085':{status:'ENGINE BLOCKED',set:'UA15BT',
  missing:'on attack, draw 1 when this character current BP is at least 5000'},
 'SAO-1-103':{status:'ENGINE BLOCKED',set:'UA15ST',
  missing:'on play, move up to one own character to the other line; COLOR life is a printed BP3500 front bounce and is not pinned here'},
 'SAO-2-037':{status:'ENGINE BLOCKED',set:'EX08BT',
  missing:'on retire, optional mill of up to 2; optional mill currently accepts exactly 1'},
 'SAO-2-039':{status:'ENGINE BLOCKED',set:'EX08BT',
  missing:'this turn BP+1000 after this player has used a 歌 card; event-use is a different ledger'},
 'SAO-2-066':{status:'ENGINE BLOCKED',set:'EX08BT',
  missing:'look at top 2, up to one green card with exact trait ALO to outside, order the rest on top'}
});
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
