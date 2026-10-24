#!/usr/bin/env node
// Cursor C8: two BLEACH cards whose whole print is an optional hand payment,
// then the existing top-or-bottom peek and one draw. No new engine operation.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const C8_REGISTERED=Object.freeze(['BLC-4-030','BLC-4-066']);
const WHOLE=/^登場時：可將1張手牌送至場外；如此則查看牌庫頂1張，(將其)?放回牌庫頂或底，再抽1張牌。$/;
export function c8BlcOptionalPeekDraw(){
 const inv=v2AllTitleInventory();
 const bleach=inv.series.find(s=>s.title==='bleach');
 for(const id of C8_REGISTERED)
  if(!bleach.pilotIds.includes(id))throw Error('C8 registration missing '+id);
 const left=[];
 for(const title of ['bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei']){
  const series=inv.series.find(s=>s.title===title);
  const unported=new Set(series.unportedIds);
  const seen=new Set();
  for(const card of V2_SOURCE_CATALOGUES[title]){
   const id=card.identity||card.id;
   if(seen.has(id)||!unported.has(id))continue;
   seen.add(id);
   const effect=(card.effect||'').replace(/\s+/g,' ').trim();
   if(WHOLE.test(effect))left.push(id);
  }
 }
 if(left.length)throw Error('C8 left a whole-print reuse unregistered: '+left.join(','));
 return {
  registered:[...C8_REGISTERED],
  report:{
   catalogue:700,registered:inv.totals.pilotImplemented,
   bleach:bleach.pilotImplemented,mst:inv.series.find(s=>s.title==='mushoku-tensei').pilotImplemented,
   bleachUnported:bleach.blocked,registeredThisRound:2,readyFromKeywords:0
  }
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c8BlcOptionalPeekDraw();
 console.log('C8_BLC_OPTIONAL_PEEK_DRAW '+JSON.stringify(x.report));
 console.log('C8_REGISTERED '+JSON.stringify(x.registered));
}
