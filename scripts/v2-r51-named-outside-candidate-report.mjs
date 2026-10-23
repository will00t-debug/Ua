#!/usr/bin/env node
// R51: canonical all-five-title complement audit after adding the shared
// physical-card named OUTSIDE threshold predicate. A text hit is NEVER READY.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
const namedOutsideText=/場外.{0,160}(?:〈|《|カード名|名前|合計|枚数|張|枚)|(?:OUTSIDE|outside).{0,120}(?:name|count|total)/iu;
export function r51NamedOutsideFiveTitleRescan(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const unported=index.cards.filter(c=>!c.registered);
 const expected=new Set(inventory.series.flatMap(s=>s.unportedIds));
 if(inventory.series.length!==5||index.cards.length!==700||
  expected.size!==inventory.totals.blocked||
  unported.length!==expected.size||
  unported.some(c=>!expected.has(c.id)))
  throw Error('R51 named-OUTSIDE scan missed or duplicated official IDs');
 const candidates=unported.filter(c=>namedOutsideText.test(c.sourceText||''))
  .map(c=>({id:c.id,title:c.title,status:'REVIEW PENDING'}));
 const focus=unported.find(c=>c.id==='SAO-1-070');
 // UA15BT/SAO-1-070 was independently checked against the complete Japanese
 // print: four named physical OUTSIDE cards grant own-turn BP+500, six grant
 // IMPACT1. The shared predicate exists, but the official full 50-card
 // scenario and card registration are NOT complete; never promote to READY.
 const reviewed=focus?{id:focus.id,status:'PARTIAL',
  official:'UA15BT/SAO-1-070',missing:[
   'exact official source pin in SAO registry',
   'real legal 50-card deck with both named OUTSIDE source groups',
   'BP and IMPACT attack/defense full print and LIFE regression'
  ]}:null;
 const report={catalogue:700,series:5,
  registered:inventory.totals.pilotImplemented,
  unportedSearched:unported.length,
  textCandidates:candidates.length,
  manuallyReviewed:reviewed?1:0,
  readyVerified:0,
  focus:reviewed,
  byTitle:Object.fromEntries(inventory.series.map(s=>[s.title,{
   registered:s.pilotImplemented,unported:s.blocked,
   textCandidates:candidates.filter(c=>c.title===s.title).length
  }]))};
 if(report.registered+report.unportedSearched!==700||
  candidates.some(c=>!expected.has(c.id))||
  Object.values(report.byTitle).reduce((n,x)=>n+x.unported,0)!==unported.length)
  throw Error('R51 five-title named-OUTSIDE conservation mismatch');
 return {report,candidates};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const {report,candidates}=r51NamedOutsideFiveTitleRescan();
 console.log('R51_NAMED_OUTSIDE_FIVE_TITLE_SCAN '+JSON.stringify(report));
 console.log('R51_NAMED_OUTSIDE_TEXT_NOT_READY '+JSON.stringify(candidates));
}
