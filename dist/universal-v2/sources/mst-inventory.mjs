// [V2-D] Complete audited Japanese-print MST inventory, isolated from legacy
// dist/mushoku-tensei.mjs placeholders. This is DATA, not a 80-card V2 pack.
// A-core inventory may explicitly opt into these records; no source overwrite.
import {UA54BT_VERIFIED} from './mst-catalog.mjs';
import {UA54BT_OFFICIAL_PRINT} from './mst-official-print.mjs';

const JP_CARDLIST='https://www.unionarena-tcg.com/jp/cardlist/';
export const MST_V2_OFFICIAL_LIMITS=Object.freeze({
 'MST-1-051':Object.freeze({
  maxCopies:1,effectiveFrom:'2026-10-01',
  officialSource:'https://www.unionarena-tcg.com/jp/rules/limited.php'
 })
});
export const MST_V2_OFFICIAL_CATALOGUE=Object.freeze(UA54BT_VERIFIED.map((record,index)=>{
 const id='MST-1-'+String(index+1).padStart(3,'0');
 const print=UA54BT_OFFICIAL_PRINT[id];
 if(record.id!==id||record.verified!==true||!print||
  !String(print.source||'').startsWith(JP_CARDLIST)||
  String(record.number)!=='UA54BT/'+id||
  String(record.source)!==String(print.source)||
  String(record.effectJa)!==String(print.effectJa))
  throw Error('MST official inventory source mismatch: '+id);
 for(const key of ['energy','ap','bp','gen','type','trigger']){
  if((record[key]??null)!==(print[key]??null))
   throw Error(id+' invalid official '+key);
 }
 if(!record.nameJa||!record.color||
  !['character','event','field'].includes(record.type))
  throw Error(id+' incomplete official print identity');
 return Object.freeze({
  ...record,
  // A-core "prepared" requires effect, while the old legacy main record has
  // translated/placeholder prose. Pin effect to the FULL Japanese print text.
  effect:record.effectJa,
  ...(MST_V2_OFFICIAL_LIMITS[id]?{
   deckLimit:MST_V2_OFFICIAL_LIMITS[id].maxCopies,
   deckLimitSource:MST_V2_OFFICIAL_LIMITS[id].officialSource
  }:{}),
  dataEvidence:'bandai-jp-official-print (does not certify V2 rules)'
 });
}));
if(MST_V2_OFFICIAL_CATALOGUE.length!==80||
 new Set(MST_V2_OFFICIAL_CATALOGUE.map(c=>c.id)).size!==80)
 throw Error('MST 80-card official inventory incomplete');
export const MST_V2_OFFICIAL_BY_ID=Object.freeze(
 Object.fromEntries(MST_V2_OFFICIAL_CATALOGUE.map(c=>[c.id,c]))
);
