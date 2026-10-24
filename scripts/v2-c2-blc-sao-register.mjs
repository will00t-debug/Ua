#!/usr/bin/env node
// Cursor C2: register whole-print BLEACH and SAO cards on existing shared DSL.
// A keyword hit is never READY. Exact one-sentence reprints of a registered
// ability must be empty in the live unported complement, or this census fails.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory,V2_SOURCE_CATALOGUES} from '../dist/universal-v2/title-packs/inventory.mjs';
import {C1_OFFICIAL_REVIEWS} from './v2-c1-blc-sao-readiness.mjs';

const FOCUS=['bleach','sword-art-online'];
export const C2_REGISTERED=Object.freeze([
 'BLC-1-007','BLC-1-044','BLC-1-073',
 'SAO-1-015','SAO-1-050','SAO-1-092','SAO-1-090']);
const HAND=/^(敵方場上有.+卡片時，手牌中此卡的.+需求能源減少 1。|相手の場に.+カードがある場合、手札にあるこのカードの必要エナジーを【.+×1】減らす。)$/;
const SELF_BP=/^このキャラのBPが4000以上の場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。$/;
function unportedRows(unported){
 const rows=[];
 for(const title of FOCUS){
  const seen=new Set();
  for(const card of V2_SOURCE_CATALOGUES[title]){
   const id=card.identity||card.id;
   if(seen.has(id)||!unported.has(id))continue;
   seen.add(id);
   rows.push({id,title,trigger:card.trigger??null,
    effect:(card.effectJa||card.effect||'').replace(/\s+/g,' ').trim()});
  }
 }
 return rows;
}
export function c2BlcSaoRegister(){
 const inv=v2AllTitleInventory();
 const focus=inv.series.filter(s=>FOCUS.includes(s.title));
 if(focus.length!==2)throw Error('C2 title focus drifted');
 const unported=new Set(focus.flatMap(s=>s.unportedIds));
 const registered=new Set(focus.flatMap(s=>s.pilotIds));
 for(const id of C2_REGISTERED){
  if(!registered.has(id)||unported.has(id))throw Error('C2 registration missing '+id);
 }
 const cards=unportedRows(unported);
 if(cards.length!==unported.size)throw Error('C2 did not list every BLEACH and SAO unported id');
 const handLeft=cards.filter(c=>HAND.test(c.effect)&&c.trigger===null);
 const impactLeft=cards.filter(c=>SELF_BP.test(c.effect));
 if(handLeft.length||impactLeft.length)
  throw Error('C2 left a whole-print reuse unregistered: '+
   [...handLeft,...impactLeft].map(c=>c.id).join(','));
 const reviewed=cards.filter(c=>C1_OFFICIAL_REVIEWS[c.id]).map(c=>{
  const row=C1_OFFICIAL_REVIEWS[c.id];
  return {id:c.id,title:c.title,status:row.status,missing:row.missing};
 });
 const known=new Set(reviewed.map(c=>c.id));
 const pending=cards.filter(c=>!known.has(c.id));
 const report={
  catalogue:700,
  registered:inv.totals.pilotImplemented,
  registeredThisRound:C2_REGISTERED.length,
  bleach:focus.find(s=>s.title==='bleach').pilotImplemented,
  sao:focus.find(s=>s.title==='sword-art-online').pilotImplemented,
  bleachSaoUnported:cards.length,
  engineBlocked:reviewed.filter(c=>c.status==='ENGINE BLOCKED').length,
  partial:reviewed.filter(c=>c.status==='PARTIAL').length,
  reviewPending:pending.length,
  readyFromKeywords:0,
  reused:['opponentFieldColorsHandEnergyDiscount','conditionalImpactBpAtLeast',
   'deployHandCharacter']
 };
 if(reviewed.length+pending.length!==cards.length||
  reviewed.some(c=>c.status==='READY')||report.readyFromKeywords!==0)
  throw Error('C2 classification drift');
 return {report,reviewed,registered:[...C2_REGISTERED]};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=c2BlcSaoRegister();
 console.log('C2_BLC_SAO_REGISTER '+JSON.stringify(x.report));
 console.log('C2_REGISTERED '+JSON.stringify(x.registered));
 console.log('C2_STILL_BLOCKED '+JSON.stringify(x.reviewed));
}
