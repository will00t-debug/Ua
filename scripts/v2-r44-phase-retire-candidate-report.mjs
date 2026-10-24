#!/usr/bin/env node
// R44 retains the R35/R41/R42/R43 catalogue: new shared primitives re-scan
// every currently unported official-source card, never a second database.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {r43MainCostFullRoster} from './v2-r43-main-cost-unported-report.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
export function r44AttackEndFreeRestFullRoster(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const historical=r43MainCostFullRoster();
 const notPorted=index.cards.filter(c=>!c.registered);
 const ids=inventory.series.flatMap(c=>c.unportedIds);
 if(index.cards.length!==700||inventory.series.length!==5||
  notPorted.length!==inventory.totals.blocked||
  ids.length!==notPorted.length||new Set(ids).size!==ids.length||
  notPorted.some(c=>!ids.includes(c.id))||
  historical.counts.unportedSearched!==notPorted.length)
  throw Error('R44 official source index did not cover all current unported cards');
 const official=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-069');
 const registered=index.cards.find(c=>c.id==='SAO-2-069'&&c.registered);
 const ops=['retireSourceOnPhaseEnd','retireOppFrontOneUnderBp','deployNamedFromZones'];
 if(!official||official.number!=='EX08BT/SAO-2-069'||official.trigger!=='raid'||
  !registered||ops.some(op=>!registered.operations.includes(op))||
  historical.reviewed.find(c=>c.id==='SAO-2-069')?.status!=='REGISTERED')
  throw Error('R44 official complete Raid Yuuki not verified in shared index');
 const overlap=x=>({
  attackEnd:/アタックフェイズ終了時|攻擊階段結束/u.test(x.sourceText),
  trueRetire:/退場/u.test(x.sourceText),
  fromOwnHand:/手札から|手牌/u.test(x.sourceText),
  restDeploy:/レストで登場|REST登場/u.test(x.sourceText),
  activeDeploy:/アクティブで登場|ACTIVE登場/u.test(x.sourceText),
  printedRequirement:/必要エナジー|必要能源/u.test(x.sourceText),
  raid:/レイド|Raid/iu.test(x.sourceText)
 });
 const rows=notPorted.map(x=>({
  id:x.id,title:x.title,sourceUrl:x.sourceUrl,
  flags:overlap(x),
  status:historical.candidates.find(c=>c.id===x.id)?.status||'REVIEW PENDING'
 }));
 const flagged=rows.filter(x=>Object.values(x.flags).some(Boolean));
 const statusCounts=Object.fromEntries([...new Set(rows.map(r=>r.status))].map(status=>
  [status,rows.filter(r=>r.status===status).length]));
 const categories=Object.fromEntries(['attackEnd','trueRetire','fromOwnHand','restDeploy',
  'activeDeploy','printedRequirement','raid'].map(k=>[k,rows.filter(c=>c.flags[k]).length]));
 return {summary:{
  catalogueSize:index.cards.length,registered:inventory.totals.pilotImplemented,
  unportedSearched:notPorted.length,series:inventory.series.length,
  keywordCandidateCount:flagged.length,reviewedUnported:historical.counts.officialRemainingReviews,
  statuses:statusCounts,keywordGroups:categories,
  byTitle:Object.fromEntries(inventory.series.map(x=>[x.title,{
   registered:x.pilotImplemented,unported:x.blocked}]))
 },officiallyFullRegistered:['SAO-2-069'],source:official.source,
  pendingHumanReviews:historical.candidates.filter(x=>x.status==='REVIEW PENDING').map(x=>x.id),
  flagged,unflaggedIds:rows.filter(x=>!Object.values(x.flags).some(Boolean)).map(x=>x.id),
  blockers:[
   {id:'MST-1-067',status:'RULE BLOCKED',detail:'Q2162 source-protection scope/retired Raid bases unresolved'},
   {id:'BLC-4-069',status:'REVIEW PENDING',detail:'Q2337/Q2338 phase-end distinct-name outside exchange'},
   {id:'SAO-1-087',status:'PARTIAL',detail:'Q978 opponent EVENT chooses must discard own hand'},
   {id:'SAO-2-064',status:'PARTIAL',detail:'Q1208 non-stacking opponent character/Event hand-discard tax'},
   {id:'BLC-4-042',status:'PARTIAL',detail:'Q2323 exact printed named three-way modes'},
   {id:'BLC-4-036',status:'PARTIAL',detail:'Q2317/Q2318 paid AP source-specific discard and name-wide turn1'}
  ]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=r44AttackEndFreeRestFullRoster();
 console.log('R44_FIVE_TITLE_SCAN '+JSON.stringify(r.summary));
 console.log('R44_BLOCKERS '+JSON.stringify(r.blockers));
}
