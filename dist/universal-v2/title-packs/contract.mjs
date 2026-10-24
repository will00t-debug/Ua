// Per-title V2 workstream boundary. Contributions do not modify the shared
// engine or the legacy card table, and NEVER gain playability from auto:true.
// Explicit source/text/printed-stat matches and real DSL verification are
// mandatory. Acceptance is tracked separately from V2 pilot implementation.
import {createUniversalPack} from '../pack.mjs';

export const V2_TITLE_IDS=Object.freeze([
 'bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei'
]);
const fields=Object.freeze(['energy','ap','bp','gen','color','type','trigger']);
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const validText=x=>typeof x==='string'&&x.trim().length>0;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const printable=c=>String(c?.effect||c?.effectJa||c?.text||'');
function verifiedSourceEntry(title,entry){
 if(!isObject(entry)||!validText(entry.id)||!isObject(entry.sourceRecord)||
  !isObject(entry.definition)||!isObject(entry.evidence)||
  entry.definition.id!==entry.id)
  throw Error(title+' V2 contribution must include id/sourceRecord/definition/evidence');
 const {id,sourceRecord:record,definition:def,evidence}=entry;
 const actual=record.identity||record.id;
 if(actual!==id)throw Error(title+'/'+id+' printed ID mismatch');
 const number=record.number||record.cardNo||record.card_no;
 if(!validText(number)||!number.endsWith('/'+id))
  throw Error(title+'/'+id+' missing official ordinary card number');
 if(record.type==='ap'||record.type==='action_point'||/\bAP[-\d]/i.test(id))
  throw Error(title+'/'+id+' AP card cannot join playable V2 deck');
 // UA01DC/BLC-4-082 and UA01DC/BLC-4-083 have no unionarena-tcg.com URL in
 // the catalogue. Accept only those recorded shop pages. Do not invent one.
 const recordedShop=id==='BLC-4-082'&&record.source==='https://shopping.fullcomp.jp/products/pdsrqs97vlmo'||
  id==='BLC-4-083'&&record.source==='https://dorasuta.jp/union-arena/product?pid=709493';
 if(!validText(record.source)||
  !(recordedShop||/^https:\/\/www\.unionarena-tcg\.com\/jp\/cardlist\//.test(record.source)))
  throw Error(title+'/'+id+' missing Japanese official cardlist provenance');
 if(!Array.isArray(evidence.printedTextFragments)||!evidence.printedTextFragments.length||
  evidence.printedTextFragments.some(x=>!validText(x)||!printable(record).includes(x)))
  throw Error(title+'/'+id+' printed text fragment not verified');
 if(!validText(evidence.reviewNote)||!Array.isArray(evidence.testFiles)||
  !evidence.testFiles.length||evidence.testFiles.some(x=>
   !/^tests\/[a-zA-Z0-9/_-]+\.test\.mjs$/.test(x)))
  throw Error(title+'/'+id+' must document reviewer note and regression test path');
 for(const key of fields)if((record[key]??null)!==(def[key]??null))
  throw Error(title+'/'+id+' printed '+key+' changed; re-audit before integration');
 if((record.deckLimit??4)!==(def.maxCopies??4))
  throw Error(title+'/'+id+' official deck copy cap changed; re-audit before integration');
 if(!validText(def.name)||!['dsl','vanilla'].includes(def.implementation))
  throw Error(title+'/'+id+' has no explicitly authored V2 program/profile');
 // A vanilla classification must be proven separately. Merely setting
 // implementation:'vanilla' is NOT a way to bypass an unported ability.
 if(def.implementation==='vanilla'&&evidence.verifiedNoExtraEffects!==true)
  throw Error(title+'/'+id+' vanilla requires independently verified no-extra-effects proof');
 if(def.implementation==='vanilla'&&
  (!('effects' in def)||Object.keys(def.effects||{}).length>0))
  throw Error(title+'/'+id+' vanilla cannot include an unimplemented program');
 // check the complete declared program via the existing compiler/verifier,
 // without automatically importing all other cards or toggling old flags.
 createUniversalPack({id:title,version:'contract-check',cards:[def]});
 return Object.freeze({...def});
}
export function compileV2TitleContribution(input){
 if(!isObject(input)||!V2_TITLE_IDS.includes(input.title)||
  !validText(input.version)||!Array.isArray(input.entries))
  throw Error('V2 title contribution needs known title/version/entries');
 const ids=new Set(),cards=[];
 for(const entry of input.entries){
  if(ids.has(entry?.id))throw Error(input.title+'/'+entry.id+' duplicate contribution ID');
  ids.add(entry.id);
  cards.push(verifiedSourceEntry(input.title,entry));
 }
 return Object.freeze({title:input.title,version:input.version,
  cards:Object.freeze(cards),cardIds:Object.freeze(cards.map(x=>x.id))});
}
export function mergeV2TitlePack({title,baselineCards=[],baselineVersion='v2-pilot-20261014',
 contribution}={}){
 if(!V2_TITLE_IDS.includes(title)||!Array.isArray(baselineCards))
  throw Error('Unknown title or malformed V2 baseline');
 const added=compileV2TitleContribution(contribution);
 if(added.title!==title)throw Error('V2 cross-title contribution rejected');
 const seen=new Set(baselineCards.map(c=>c.id));
 for(const c of added.cards){
  if(seen.has(c.id))throw Error(title+'/'+c.id+
   ' conflicts with an existing Pilot; submit explicit review/upgrade instead');
  seen.add(c.id);
 }
 const version=added.cards.length?baselineVersion+'+'+added.version:baselineVersion;
 return createUniversalPack({id:title,version,cards:[...baselineCards,...added.cards]});
}
export function enumerateV2UnportedIds(catalogue,pack){
 if(!Array.isArray(catalogue)||pack?.kind!=='ua-v2-pack')
  throw Error('Catalogue and verified V2 pack are required');
 const ids=new Set(),missing=[];
 for(const record of catalogue){
  const id=record?.identity||record?.id;
  if(!validText(id))throw Error('Missing catalogue ID');
  if(ids.has(id))continue;ids.add(id);
  if(record?.type==='ap'||record?.type==='action_point'||/\bAP[-\d]/i.test(id))
   continue;
  if(!own(pack.cards,id))missing.push(id);
 }
 return Object.freeze(missing.sort());
}
