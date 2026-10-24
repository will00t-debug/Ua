#!/usr/bin/env node
// Cursor C10: one BLEACH card whose whole print is an existing name alias
// plus the existing field-line REST energy and end-of-MAIN retirement.
// No new engine operation.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';

export const C10_REGISTERED=Object.freeze(['BLC-4-074']);
const WHOLE=/^此卡也視為《山本元柳齋重國》。啟動・主要〔改為Rest／每回合1次〕：此角色本回合額外產生1個綠色能量，並獲得「主要階段結束時，使此角色退場」。$/;
export function c10BlcAliasFieldEnergy(){
 const inv=v2AllTitleInventory();
 const bleach=inv.series.find(s=>s.title==='bleach');
 if(!bleach.pilotIds.includes('BLC-4-074'))throw Error('C10 registration missing BLC-4-074');
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
 if(left.length)throw Error('C10 left a whole-print reuse unregistered: '+left.join(','));
 return {
  registered:[...C10_REGISTERED],
  report:{
   catalogue:700,registered:inv.totals.pilotImplemented,
   bleach:bleach.pilotImplemented,mst:inv.series.find(s=>s.title==='mushoku-tensei').pilotImplemented,
   bleachUnported:bleach.blocked,registeredThisRound:1,readyFromKeywords:0
  }
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c10BlcAliasFieldEnergy();
 console.log('C10_BLC_ALIAS_FIELD_ENERGY '+JSON.stringify(x.report));
 console.log('C10_REGISTERED '+JSON.stringify(x.registered));
}
