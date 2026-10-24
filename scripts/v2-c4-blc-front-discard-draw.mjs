#!/usr/bin/env node
// Cursor C4: one BLEACH card whose whole print is the existing front
// once-per-turn hand payment, then a draw. No new engine operation.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const C4_REGISTERED=Object.freeze(['BLC-4-025']);
const WHOLE=/^(啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：抽1張牌。|【起動メイン】【フロントLにある場合】【手札を1枚場外に置く】【ターン1】カードを1枚引く。)$/;
export function c4BlcFrontDiscardDraw(){
 const inv=v2AllTitleInventory();
 const bleach=inv.series.find(s=>s.title==='bleach');
 if(!bleach.pilotIds.includes('BLC-4-025'))throw Error('C4 registration missing BLC-4-025');
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
 if(left.length)throw Error('C4 left a whole-print reuse unregistered: '+left.join(','));
 return {
  registered:[...C4_REGISTERED],
  report:{
   catalogue:700,registered:inv.totals.pilotImplemented,
   bleach:bleach.pilotImplemented,mst:inv.series.find(s=>s.title==='mushoku-tensei').pilotImplemented,
   bleachUnported:bleach.blocked,registeredThisRound:1,readyFromKeywords:0
  }
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c4BlcFrontDiscardDraw();
 console.log('C4_BLC_FRONT_DISCARD_DRAW '+JSON.stringify(x.report));
 console.log('C4_REGISTERED '+JSON.stringify(x.registered));
}
