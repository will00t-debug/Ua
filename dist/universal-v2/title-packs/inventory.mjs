// Exact source-catalog inventory for the 700 distinct non-AP/non-alt records.
// This module is audit/reporting only: importing a legacy source does NOT
// register a V2 card or re-use a legacy engine.
import {CARDS} from '../../cards.mjs';
import {TTG_CARDS} from '../../ttg-builder.mjs';
import {SOLO_LEVELING_CARDS} from '../../solo-leveling.mjs';
import {SAO_CARDS} from '../../sao-cards.mjs';
// D's full Japanese official-print inventory is separate from the 12
// placeholders in the legacy MST catalogue. Do not overwrite Production.
import {MST_V2_OFFICIAL_CATALOGUE}
 from '../sources/mst-inventory.mjs';
import {V2_TITLE_IDS} from './contract.mjs';
import {registeredV2TitlePack} from './registry.mjs';

export const V2_SOURCE_CATALOGUES=Object.freeze({
 bleach:CARDS,'gurren-lagann':TTG_CARDS,
 'solo-leveling':SOLO_LEVELING_CARDS,
 'sword-art-online':SAO_CARDS,
 'mushoku-tensei':MST_V2_OFFICIAL_CATALOGUE
});
export const V2_EXPECTED_UNIQUE_CARD_COUNTS=Object.freeze({
 bleach:276,'gurren-lagann':81,'solo-leveling':80,
 'sword-art-online':183,'mushoku-tensei':80
});
const isCard=c=>!!c&&c.type!=='ap'&&c.type!=='action_point'&&
 !/\bAP\d+/i.test(c.identity||c.id||'');
const prepared=c=>['energy','ap','bp','gen','color','type'].every(k=>
 c[k]!==null&&c[k]!==undefined)&&
 typeof (c.nameJa||c.name)==='string'&&
 !!(c.nameJa||c.name).trim()&&typeof c.effect==='string'&&
 c.effect.trim().length>0;
export function v2InventoryForTitle(title){
 if(!V2_TITLE_IDS.includes(title))throw Error('Unknown V2 inventory title');
 const records=V2_SOURCE_CATALOGUES[title],unique=new Map();
 for(const record of records){
  if(!isCard(record))continue;
  const id=record.identity||record.id;
  if(!id)throw Error(title+' source catalogue has no printed ID');
  if(!unique.has(id))unique.set(id,record);
 }
 const pack=registeredV2TitlePack(title);
 const pilot=Object.keys(pack?.cards||{}),v2=new Set(pilot);
 for(const id of v2)if(!unique.has(id))
  throw Error(title+' V2 pack contains unrecognised official source number '+id);
 const notPorted=[...unique.keys()].filter(id=>!v2.has(id)).sort();
 const sourceIncomplete=[...unique.entries()].filter(([,c])=>!prepared(c))
  .map(([id])=>id).sort();
 const ready=[...unique.entries()].filter(([,c])=>prepared(c)).map(([id])=>id).sort();
 return Object.freeze({
  title,total:unique.size,metadataReady:ready.length,
  metadataIncomplete:sourceIncomplete.length,
  pilotImplemented:pilot.length,
  // Fully audited FAQ acceptance must be provided by the V2-E authority,
  // after the official per-card matrix and matching tests are integrated.
  fullyAccepted:0,
  blocked:notPorted.length,
  sourceIncompleteIds:Object.freeze(sourceIncomplete),
  unportedIds:Object.freeze(notPorted),
  pilotIds:Object.freeze(pilot.slice().sort())
 });
}
export function v2AllTitleInventory(){
 const series=V2_TITLE_IDS.map(v2InventoryForTitle);
 const totals=Object.freeze({
  total:series.reduce((n,x)=>n+x.total,0),
  metadataReady:series.reduce((n,x)=>n+x.metadataReady,0),
  metadataIncomplete:series.reduce((n,x)=>n+x.metadataIncomplete,0),
  pilotImplemented:series.reduce((n,x)=>n+x.pilotImplemented,0),
  fullyAccepted:series.reduce((n,x)=>n+x.fullyAccepted,0),
  blocked:series.reduce((n,x)=>n+x.blocked,0)
 });
 for(const item of series)if(item.total!==V2_EXPECTED_UNIQUE_CARD_COUNTS[item.title])
  throw Error('Source catalogue count drift for '+item.title+': '+item.total+
   ' expected '+V2_EXPECTED_UNIQUE_CARD_COUNTS[item.title]);
 return Object.freeze({series:Object.freeze(series),totals});
}
export function formatV2UnportedIds(){
 const {series,totals}=v2AllTitleInventory();
 return [
  '# V2 尚未實作卡號（實際來源目錄產生；不含異圖/AP）',
  '',
  '註：V2 Pilot 不等於逐卡完整官方 FAQ 驗收。未移植不能視為可玩。',
  '總卡 '+totals.total+'／Pilot '+totals.pilotImplemented+
  '／尚未移植 '+totals.blocked+'／嚴格全面驗收 0（尚待 V2-E 證據匯入）。',
  '',
  ...series.flatMap(x=>[
   '## '+x.title+' — '+x.total+' 張；V2 '+x.pilotImplemented+
    '；尚未移植 '+x.blocked+'；來源缺欄 '+x.metadataIncomplete,
   '',
   x.unportedIds.join('、')||'（此系列已無未移植卡號）',
   '',
   ...(x.sourceIncompleteIds.length?
    ['來源資料仍缺欄（與未移植可重疊）：'+x.sourceIncompleteIds.join('、'),'']:[])
  ])
 ].join('\n');
}
