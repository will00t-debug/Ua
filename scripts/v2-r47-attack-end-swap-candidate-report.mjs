#!/usr/bin/env node
// R47 evidence-only full five-title rescan; never a parallel card registry.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES}
 from '../dist/universal-v2/title-packs/inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
const attackEnd=/アタック(の)?終了時|攻撃結束|攻擊結束|single.attack.end|アタックが終了/u;
const exchange=/位置を入れ替|交換位置|位置交換|入れ替える|exchange.positions/u;
const mainOther=/【ターン1】|ターンに1回|每回合.?1次|Turn.?1/u;
export function r47FiveTitleAttackSwapAndMainRescan(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const unported=index.cards.filter(c=>!c.registered),expect=new Set(
  inventory.series.flatMap(x=>x.unportedIds));
 if(index.cards.length!==700||inventory.series.length!==5||
  unported.length!==inventory.totals.blocked||expect.size!==unported.length||
  unported.some(c=>!expect.has(c.id)))
  throw Error('R47 scanner must include all canonical currently unported UIDs');
 const candidates=unported.filter(c=>attackEnd.test(c.sourceText||'')||
  exchange.test(c.sourceText||'')||mainOther.test(c.sourceText||'')||
  ['BLC-4-069','BLC-4-042'].includes(c.id)).map(c=>({
  id:c.id,title:c.title,source:c.sourceUrl,
  attackEnd:attackEnd.test(c.sourceText||''),
  exchange:exchange.test(c.sourceText||''),
  mainOnce:mainOther.test(c.sourceText||''),
  status:['BLC-4-069','BLC-4-042'].includes(c.id)?'PARTIAL':'REVIEW PENDING',
  missing:c.id==='BLC-4-069'?
   ['whole printed Q2337 swap + Raid and next matching 花天狂骨 hand AP-1',
    '4 real legal green EVENT/FIELD printed names in current BLEACH 50-card deck',
    'RAID LIFE and complete FAQ matrix']:
   c.id==='BLC-4-042'?
   ['TOP2 reordering and physical outside','two distinct hand UID payment then named recovery',
    'true other character retirement then named blue ACTIVE ENERGY entry','DRAW LIFE']:
   ['complete official print and all applicable FAQ review']
 }));
 const registeredBleach=Object.values(registeredV2TitlePack('bleach').cards);
 const bleachSource=V2_SOURCE_CATALOGUES.bleach;
 const unportedBleachIds=new Set(inventory.series.find(x=>x.title==='bleach').unportedIds);
 const qualifies=c=>c?.color==='green'&&['event','field'].includes(c.type);
 const represented=registeredBleach.filter(qualifies);
 const remaining=bleachSource.filter(c=>unportedBleachIds.has(c.identity||c.id)&&qualifies(c));
 const names=new Set(represented.map(c=>c.name));
 const report={summary:{
  catalogueSize:700,series:5,registered:inventory.totals.pilotImplemented,
  unportedSearched:unported.length,textCandidates:candidates.length,
  reviewedUnported:candidates.filter(c=>c.status==='PARTIAL').length,
  reviewPending:candidates.filter(c=>c.status==='REVIEW PENDING').length,
  readyVerified:0,byTitle:Object.fromEntries(inventory.series.map(x=>[x.title,{
   registered:x.pilotImplemented,unported:x.blocked,
   textCandidates:candidates.filter(c=>c.title===x.title).length}])),
  registeredBleachGreenEventFieldDistinctNames:names.size,
  requiredDistinctOutsideNamesForBLC4069:4,
  unportedBleachGreenEventFieldSourceIds:new Set(remaining.map(c=>c.identity||c.id)).size},
  bleachedRegisteredPrintedNames:[...names].sort(),
  bleachGreenOutsideUnportedIds:[...new Set(remaining.map(c=>c.identity||c.id))].sort(),
  candidates,unflagged:unported.filter(c=>!candidates.some(x=>x.id===c.id))
   .map(c=>c.id)};
 if(report.candidates.length+report.unflagged.length!==unported.length||
  report.summary.registered+report.summary.unportedSearched!==700)
  throw Error('R47 source UID conservation mismatch');
 return report;
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const r=r47FiveTitleAttackSwapAndMainRescan();
 console.log('R47_FIVE_TITLE_RESCAN '+JSON.stringify(r.summary));
 console.log('R47_BLEACH_GREEN_OUTSIDE_GAP '+JSON.stringify({
  registeredNames:r.bleachedRegisteredPrintedNames,
  unportedIds:r.bleachGreenOutsideUnportedIds}));
 console.log('R47_UNPORTED_CANDIDATES '+JSON.stringify(r.candidates));
}
