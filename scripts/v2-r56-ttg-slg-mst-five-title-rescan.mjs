#!/usr/bin/env node
// R56 live entire 700-card complement after new shared BLOCK, BP, victory ops.
// Text matches are only discovery: no guessed READY, no automatic migration.
// Cursor owns BLEACH/SAO migration; this script does not change either pack.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';

export const R56_SEARCH_TERMS=Object.freeze({
 outsideGroups:/場外.{0,24}(?:5|５|五)|場外にあるカード5枚|外にあるカード5枚/u,
 battleVictory:/戦闘に勝利|バトルに勝利|戰鬥獲勝|戰勝/u,
 mandatoryBlock:/ブロックしなければ|必須阻擋|必須格擋|必須要阻擋|必須BLOCK|必須阻擋/u,
 attackEndSwap:/アタック終了時|攻擊結束|交換位置|位置を入れ替/u,
 twoModes:/以下から1つ|二選一|選一項|2つから1つ/u,
 sniper:/狙い撃ち|狙擊/u
});
const PRIORITY=Object.freeze([
 {id:'SLG-1-021',owner:'GPT',status:'REGISTERED',faq:'Q2028',
  reason:'JP five-clause whole print, physical printed BP and forced legal BLOCK; independent FAQ exhaustiveness pending'},
 {id:'MST-1-009',owner:'GPT',status:'REGISTERED',faq:'Q2147',
  reason:'Full Japanese print; own-effect-only chooseOne, physical next-own-start BP and Q2147 attack-end swap, independent FAQ certification still pending'},
 {id:'TTG-1-057',owner:'GPT',status:'ENGINE BLOCKED',faq:null,
  reason:'IMPACT cancellation + grant to other own target until next own start, hidden source'},
 {id:'TTG-1-069',owner:'GPT',status:'ENGINE BLOCKED',faq:null,
  reason:'MAIN own REST+retire and trait-filtered OUTSIDE recovery with true cost'},
 {id:'TTG-1-081',owner:'GPT',status:'RULE BLOCKED',faq:null,
  reason:'official BP3000/5000 erratum, own field or buried Raid-base name predicate not yet safely certified'},
 {id:'BLC-4-044',owner:'Cursor',status:'REVIEW PENDING',faq:null,
  reason:'evaluate whether reusable shared combat atoms cover all printed clauses'},
 {id:'SAO-1-097',owner:'Cursor',status:'REVIEW PENDING',faq:null,
  reason:'re-audit optional source effect and physical UID; GPT does not migrate'},
 {id:'SLG-1-022',owner:'GPT',status:'ENGINE BLOCKED',faq:'Q2029',
  reason:'energy-line attack-end swap and contingent source-qualified attack-end event'}
]);
export function r56TtgSlgMstRescan(){
 const inv=v2AllTitleInventory(),index=capabilityIndex(inv);
 const absent=index.cards.filter(c=>!c.registered);
 const registered=index.cards.filter(c=>c.registered);
 const expected=new Set(inv.series.flatMap(c=>c.unportedIds));
 if(inv.totals.total!==700||inv.series.length!==5||index.cards.length!==700||
  absent.length!==expected.size||new Set(absent.map(c=>c.id)).size!==absent.length||
  absent.some(c=>!expected.has(c.id))||registered.length!==inv.totals.pilotImplemented||
  registered.length+absent.length!==700)
  throw Error('R56 scanned registry/official 700-card complement mismatch');
 const hits=Object.fromEntries(Object.entries(R56_SEARCH_TERMS).map(([key,re])=>
  [key,absent.filter(c=>re.test(c.sourceText||'')).map(c=>({
   id:c.id,title:c.title,status:'REVIEW PENDING',
   fingerprint:c.sourceFingerprint}))]));
 const reviewed=PRIORITY.map(p=>{
  const card=index.cards.find(c=>c.id===p.id);
  if(!card||!card.sourceText?.length)throw Error('R56 missing printed source '+p.id);
  if(card.registered!==(p.status==='REGISTERED'))
   throw Error('R56 manually reviewed complete-card status mismatch '+p.id);
  return {...p,title:card.title,source:card.sourceUrl,
   fingerprint:card.sourceFingerprint};
 });
 const cursor=reviewed.filter(x=>x.owner==='Cursor');
 if(cursor.some(x=>x.status==='REGISTERED'||!expected.has(x.id)))
  throw Error('Do not preempt Cursor-owned unported title cards');
 return {
  report:{
   catalogue:700,titles:5,registered:registered.length,unported:absent.length,
   independentFaqCertified:inv.totals.fullyAccepted,
   readyAutoPromoted:0,
   scannedCandidateMatches:Object.fromEntries(Object.entries(hits).map(([k,v])=>[k,v.length])),
   byTitle:Object.fromEntries(inv.series.map(c=>[c.title,{
    registered:c.pilotImplemented,unported:c.blocked}]))
  },reviewed,cursor,hits
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const r=r56TtgSlgMstRescan();
 console.log('R56_ALL_TITLE_COMPLEMENT '+JSON.stringify(r.report));
 console.log('R56_MANUAL_FULL_PRINT_STATES '+JSON.stringify(r.reviewed));
 console.log('R56_CURSOR_CANDIDATES_NO_MIGRATION '+JSON.stringify(r.cursor));
 for(const [k,arr] of Object.entries(r.hits))
  console.log('R56_UNPORTED_TEXT_ONLY_'+k.toUpperCase()+' '+JSON.stringify(arr));
}
