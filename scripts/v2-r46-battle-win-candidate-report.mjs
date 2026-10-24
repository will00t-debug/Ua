#!/usr/bin/env node
// R46 conservative whole-five-title, live Q763 battle-won candidate discovery.
// Reuses the authoritative R35 index; DOES NOT create another printed-card DB.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
const battleVictory=/バトルに勝利|バトルで勝利|バトルに勝った|戰鬥獲勝|戰鬥中獲勝/u;
export function r46BattleWonCandidateScan(){
 const inv=v2AllTitleInventory(),idx=capabilityIndex(inv);
 const unported=idx.cards.filter(row=>!row.registered);
 const currentIds=new Set(inv.series.flatMap(row=>row.unportedIds));
 if(idx.cards.length!==700||inv.series.length!==5||
  unported.length!==inv.totals.blocked||
  currentIds.size!==unported.length||
  unported.some(row=>!currentIds.has(row.id)))
  throw Error('R46 Q763 battle win scan missed current official unported UIDs');
 const hits=unported.filter(row=>battleVictory.test(row.sourceText||''));
 const unflaggedIds=unported.filter(row=>!battleVictory.test(row.sourceText||''))
  .map(row=>row.id);
 const candidateCards=hits.map(row=>({
  id:row.id,title:row.title,sourceUrl:row.sourceUrl,
  status:row.id==='SAO-1-087'?'PARTIAL':'REVIEW PENDING',
  missing:row.id==='SAO-1-087'?
   ['MAIN Turn1 +1000 other', 'RAID LIFE', 'IMPACT1 vs DAMAGE2 composite',
    'Q978 EVENT selection tax integrated on entire printed card']:
   ['complete Japanese card print and applicable FAQ review required']
 }));
 const summary={catalogueSize:idx.cards.length,series:inv.series.length,
  registered:inv.totals.pilotImplemented,unportedSearched:unported.length,
  battleWinTextCandidates:hits.length,
  completeFullPrintReviewedHere:candidateCards.filter(x=>x.id==='SAO-1-087').length,
  readyVerified:0,partial:candidateCards.filter(x=>x.status==='PARTIAL').length,
  reviewPending:candidateCards.filter(x=>x.status==='REVIEW PENDING').length,
  byTitle:Object.fromEntries(inv.series.map(x=>[x.title,{
   registered:x.pilotImplemented,unported:x.blocked,
   keywordCandidates:candidateCards.filter(c=>c.title===x.title).length
  }]))};
 if(summary.registered+summary.unportedSearched!==700||
  unflaggedIds.length+candidateCards.length!==unported.length)
  throw Error('R46 Q763 scan does not conserve all printed identities');
 return {summary,candidateCards,unflaggedIds};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=r46BattleWonCandidateScan();
 console.log('R46_Q763_ALL_TITLE_SCAN '+JSON.stringify(report.summary));
 console.log('R46_Q763_CANDIDATES '+JSON.stringify(report.candidateCards));
}
