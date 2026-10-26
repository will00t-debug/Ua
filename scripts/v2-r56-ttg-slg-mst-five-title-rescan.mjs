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
 sniper:/狙い撃ち|狙擊/u,
 ownEffectEntry:/自分の効果で登場|己方效果登場|透過自己的效果登場|經自己的效果登場/u,
 emptyOwnFieldHand:/場にカードが1枚もない|己方場上沒有卡片|自己場上沒有任何卡|場上沒有卡片時/u,
 nextOwnStart:/次の自分のターン開始|下次己方回合開始|下次自己的回合開始/u
});
const PRIORITY=Object.freeze([
 {id:'TTG-1-020',owner:'GPT',status:'REGISTERED',faq:null,
  reason:'Official JP printed own empty field hand-only green-2, STEP, ACTIVE life; real 50-card positive/negative scenario, all-FAQ certification separate'},
 {id:'SLG-1-021',owner:'GPT',status:'REGISTERED',faq:'Q2028',
  reason:'JP five-clause whole print, physical printed BP and forced legal BLOCK; independent FAQ exhaustiveness pending'},
 {id:'MST-1-009',owner:'GPT',status:'REGISTERED',faq:'Q2147',
  reason:'Full Japanese print; own-effect-only chooseOne, physical next-own-start BP and Q2147 attack-end swap, independent FAQ certification still pending'},
 {id:'TTG-1-057',owner:'GPT',status:'REGISTERED',faq:null,
  reason:'shared grantImpactNullUntilNextOwnStart plus printed IMPACT null; scenario tests exist; full FAQ certification still pending'},
 {id:'TTG-1-069',owner:'GPT',status:'REGISTERED',faq:null,
  reason:'MAIN rests and retires this card, then adds one outside ガンメン card to hand. Scenario tests exist. Full FAQ certification still pending'},
 {id:'TTG-1-081',owner:'GPT',status:'REGISTERED',faq:null,
  reason:'shared retireOppFrontUnderBp with Simon or Kamina field or raid-base bonus; Q1119; scenario tests exist; full FAQ certification still pending'},
 {id:'BLC-4-044',owner:'Cursor',status:'REVIEW PENDING',faq:null,
  reason:'evaluate whether reusable shared combat atoms cover all printed clauses'},
 {id:'SAO-1-097',owner:'Cursor',status:'REVIEW PENDING',faq:null,
  reason:'re-audit optional source effect and physical UID; GPT does not migrate'},
 {id:'SLG-1-022',owner:'GPT',status:'REGISTERED',faq:'Q2029',
  reason:'shared energy discount, life raid, dual-line ACTIVE, sniper and Q2029 energy-line swap; not a full FAQ certification'}
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
 const cursorReuse=Object.fromEntries(Object.entries(hits).map(([kind,rows])=>
  [kind,rows.filter(x=>['bleach','sword-art-online'].includes(x.title))]));
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
  },reviewed,cursor,cursorReuse,hits
 };
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const r=r56TtgSlgMstRescan();
 console.log('R56_ALL_TITLE_COMPLEMENT '+JSON.stringify(r.report));
 console.log('R56_MANUAL_FULL_PRINT_STATES '+JSON.stringify(r.reviewed));
 console.log('R56_CURSOR_CANDIDATES_NO_MIGRATION '+JSON.stringify(r.cursor));
 console.log('R57_CURSOR_SOURCE_REUSE_ONLY '+JSON.stringify(r.cursorReuse));
 for(const [k,arr] of Object.entries(r.hits))
  console.log('R56_UNPORTED_TEXT_ONLY_'+k.toUpperCase()+' '+JSON.stringify(arr));
}
