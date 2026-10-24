#!/usr/bin/env node
// Cursor C3: BLEACH whole-print reuse on the CI-accepted C2 registry.
// Keyword text is never READY. MST-1-006 is registered in C15. MST-1-007 is
// registered in C21. MST-1-021 and MST-1-033 stay blocked.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const C3_REGISTERED=Object.freeze(['BLC-4-029','BLC-4-031']);
const OWN_DRAW=/^(登場時：若此角色是以自己的效果登場，抽1張牌。|【登場時】このキャラが自分の効果で登場していた場合、カードを1枚引く。|〖登場時〗 このキャラが自分の効果で登場していた場合、カードを1枚引く。)$/;
const LOW_BLOCK=/^(此角色不會被BP2000以下的角色阻擋。|このキャラはBP2000以下のキャラにブロックされない。)$/;
export const C3_MST_PORTED=Object.freeze(['MST-1-006','MST-1-007']);
export const C3_MST_BLOCKED=Object.freeze({
 'MST-1-021':{status:'ENGINE BLOCKED',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-021',
  missing:'on play the named blue REST-or-Raid, plus once per turn ready this character only while both ルーデウス and エリス are on the own field'},
 'MST-1-033':{status:'ENGINE BLOCKED',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-033',
  missing:'field on play top-3 named search with discard, then main REST and retire this field to REST-or-Raid one blue energy<=3 AP1 character of any name'}
});
function rows(title,unported){
 const seen=new Set(),out=[];
 for(const card of V2_SOURCE_CATALOGUES[title]){
  const id=card.identity||card.id;
  if(seen.has(id)||!unported.has(id))continue;
  seen.add(id);
  out.push({id,effect:(card.effectJa||card.effect||'').replace(/\s+/g,' ').trim()});
 }
 return out;
}
export function c3BlcMstReuse(){
 const inv=v2AllTitleInventory();
 const bleach=inv.series.find(s=>s.title==='bleach');
 const mst=inv.series.find(s=>s.title==='mushoku-tensei');
 const registered=new Set(bleach.pilotIds);
 for(const id of C3_REGISTERED){
  if(!registered.has(id))throw Error('C3 registration missing '+id);
 }
 const bleachLeft=rows('bleach',new Set(bleach.unportedIds));
 const mstLeft=rows('mushoku-tensei',new Set(mst.unportedIds));
 const reused=[...bleachLeft,...mstLeft].filter(c=>OWN_DRAW.test(c.effect)||LOW_BLOCK.test(c.effect));
 if(reused.length)throw Error('C3 left a whole-print reuse unregistered: '+reused.map(c=>c.id).join(','));
 for(const id of C3_MST_PORTED){
  if(!mst.pilotIds.includes(id)||mst.unportedIds.includes(id))
   throw Error(id+' left the unported ledger without a whole-print port');
 }
 const mstBlocked=Object.entries(C3_MST_BLOCKED).map(([id,row])=>{
  if(!mst.unportedIds.includes(id))throw Error(id+' left the unported ledger without a whole-print port');
  return {id,...row};
 });
 const report={
  catalogue:700,registered:inv.totals.pilotImplemented,
  bleach:bleach.pilotImplemented,mst:mst.pilotImplemented,
  bleachUnported:bleach.blocked,mstUnported:mst.blocked,
  registeredThisRound:C3_REGISTERED.length,readyFromKeywords:0
 };
 return {report,registered:[...C3_REGISTERED],mstBlocked};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c3BlcMstReuse();
 console.log('C3_BLC_MST_REUSE '+JSON.stringify(x.report));
 console.log('C3_REGISTERED '+JSON.stringify(x.registered));
 console.log('C3_MST_BLOCKED '+JSON.stringify(x.mstBlocked));
}
