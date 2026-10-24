#!/usr/bin/env node
// Cursor C5: one BLEACH card whose whole print is the existing front
// once-per-turn hand payment, then a field BP reduction. No new engine operation.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const C5_REGISTERED=Object.freeze(['BLC-2-003']);
const WHOLE=/^(主要階段・位於前線・每回合 1 次：將 1 張手牌送至場外，使 1 個敵方場上 BP 1500 以上角色本回合 BP −1000。|【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】BP1500以上の相手の場のキャラを1枚選び、このターン中、BP-1000。)$/;
export function c5BlcFrontDiscardDown(){
 const inv=v2AllTitleInventory();
 const bleach=inv.series.find(s=>s.title==='bleach');
 if(!bleach.pilotIds.includes('BLC-2-003'))throw Error('C5 registration missing BLC-2-003');
 const left=[];
 for(const title of ['bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei']){
  const series=inv.series.find(s=>s.title===title);
  const unported=new Set(series.unportedIds);
  const seen=new Set();
  for(const card of V2_SOURCE_CATALOGUES[title]){
   const id=card.identity||card.id;
   if(seen.has(id)||!unported.has(id))continue;
   seen.add(id);
   const effect=(card.effectJa||card.effect||'').replace(/\s+/g,' ').trim();
   if(WHOLE.test(effect))left.push(id);
  }
 }
 if(left.length)throw Error('C5 left a whole-print reuse unregistered: '+left.join(','));
 return {
  registered:[...C5_REGISTERED],
  report:{
   catalogue:700,registered:inv.totals.pilotImplemented,
   bleach:bleach.pilotImplemented,mst:inv.series.find(s=>s.title==='mushoku-tensei').pilotImplemented,
   bleachUnported:bleach.blocked,registeredThisRound:1,readyFromKeywords:0
  }
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c5BlcFrontDiscardDown();
 console.log('C5_BLC_FRONT_DISCARD_DOWN '+JSON.stringify(x.report));
 console.log('C5_REGISTERED '+JSON.stringify(x.registered));
}
