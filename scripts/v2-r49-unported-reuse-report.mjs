#!/usr/bin/env node
// R49 dynamic complement of canonical five-title printed registry.
// No second source catalogue; no keyword-only READY certifications.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r48FullTitleReadinessScan} from './v2-r48-official-readiness-report.mjs';
const evidence={
 atomicTwoUidDiscard:/手札.{0,35}2枚|手札.{0,35}２枚|2張手牌|兩張手牌|弃2张|棄兩張/u,
 printedNamesOutside:/場外.{0,90}《|場外.{0,90}〈|場外.{0,90}カード名|場外.{0,90}名字/u,
 freeHandField:/手札.{0,80}エナジー|手牌.{0,80}能源|手札.{0,80}アクティブ登場/u,
 trueRetireThen:/退場.{0,90}登場|退場.{0,90}場外|退場.{0,90}エナジー/u,
 multiMode:/以下.{0,12}選|以下から.{0,12}選|選一項|選1項/u
};
export function r49NewAtomFiveTitleRescan(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const r48=r48FullTitleReadinessScan();
 const cards=index.cards.filter(c=>!c.registered);
 const expected=new Set(inventory.series.flatMap(s=>s.unportedIds));
 if(index.cards.length!==700||inventory.series.length!==5||
  cards.length!==inventory.totals.blocked||cards.length!==expected.size||
  r48.summary.unportedSearched!==cards.length||
  cards.some(c=>!expected.has(c.id)))
  throw Error('R49 did not rescan every currently unported official UID');
 const hits=Object.fromEntries(Object.entries(evidence).map(([kind,pattern])=>
  [kind,cards.filter(c=>pattern.test(c.sourceText||'')).map(c=>c.id)]));
 const manual=r48.reviewed.filter(c=>expected.has(c.id));
 const known=new Map(manual.map(c=>[c.id,c.status]));
 const report={
  source:'R35 capabilityIndex + R48 official reviewed status; no parallel card DB',
  catalogue:700,registered:inventory.totals.pilotImplemented,unportedSearched:cards.length,
  searches:Object.fromEntries(Object.entries(hits).map(([k,v])=>[k,v.length])),
  anyHit:new Set(Object.values(hits).flat()).size,
  officialReviewedUnported:manual.length,
  readyVerified:manual.filter(c=>c.status==='READY').length,
  partial:manual.filter(c=>c.status==='PARTIAL').length,
  ruleBlocked:manual.filter(c=>c.status==='RULE BLOCKED').length,
  reviewPending:cards.length-manual.length,
  byTitle:Object.fromEntries(inventory.series.map(s=>[s.title,{
   registered:s.pilotImplemented,unported:s.blocked,
   hitIds:new Set(cards.filter(c=>c.title===s.title&&
    Object.values(evidence).some(rx=>rx.test(c.sourceText||''))).map(c=>c.id)).size}])),
  focus:['BLC-4-042','BLC-2-044','BLC-4-069'].map(id=>({
   id,status:expected.has(id)?known.get(id)||'REVIEW PENDING':'REGISTERED'}))
 };
 if(report.registered+report.unportedSearched!==700||
  report.partial+report.ruleBlocked+report.readyVerified+report.reviewPending!==cards.length||
  Object.values(hits).some(ids=>ids.some(id=>!expected.has(id))))
  throw Error('R49 registered/unported or classification conservation mismatch');
 return {report,hits,manual};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const data=r49NewAtomFiveTitleRescan();
 console.log('R49_FIVE_TITLE_DYNAMIC_RESCAN '+JSON.stringify(data.report));
 console.log('R49_OFFICIAL_PARTIAL '+JSON.stringify(data.manual));
 console.log('R49_TEXT_CANDIDATES_NOT_READY '+JSON.stringify(data.hits));
}
