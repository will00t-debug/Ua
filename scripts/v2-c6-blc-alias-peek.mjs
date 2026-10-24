#!/usr/bin/env node
// Cursor C6: one BLEACH card whose whole print is an existing name alias
// plus the existing top-card outside-or-top choice. No new engine operation.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const C6_REGISTERED=Object.freeze(['BLC-4-002']);
const WHOLE=/^此卡也視為《雨葛蘭・哈斯沃德》。登場時：查看牌庫頂1張，放回牌庫頂或送至場外。$/;
export function c6BlcAliasPeek(){
 const inv=v2AllTitleInventory();
 const bleach=inv.series.find(s=>s.title==='bleach');
 if(!bleach.pilotIds.includes('BLC-4-002'))throw Error('C6 registration missing BLC-4-002');
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
 if(left.length)throw Error('C6 left a whole-print reuse unregistered: '+left.join(','));
 return {
  registered:[...C6_REGISTERED],
  report:{
   catalogue:700,registered:inv.totals.pilotImplemented,
   bleach:bleach.pilotImplemented,mst:inv.series.find(s=>s.title==='mushoku-tensei').pilotImplemented,
   bleachUnported:bleach.blocked,registeredThisRound:1,readyFromKeywords:0
  }
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c6BlcAliasPeek();
 console.log('C6_BLC_ALIAS_PEEK '+JSON.stringify(x.report));
 console.log('C6_REGISTERED '+JSON.stringify(x.registered));
}
