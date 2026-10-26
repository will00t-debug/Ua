#!/usr/bin/env node
// R58: dynamic full 700-card unported complement after adding the shared
// opponent-field-color HAND required-energy primitive. This is a source
// review ledger, never an auto-importer or a keyword-to-READY heuristic.
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {C1_OFFICIAL_REVIEWS} from './v2-c1-blc-sao-readiness.mjs';

const cardSource=(set,id)=>'https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no='+set+'%2F'+id;
const SIX=Object.freeze({
 'BLC-1-007':{status:'READY',owner:'Cursor',source:cardSource('UE01BT','BLC-1-007'),
  missing:'C2 registered the whole print: yellow hand -1 iff opponent purple or green, printed gen 2'},
 'BLC-1-044':{status:'READY',owner:'Cursor',source:cardSource('UE01BT','BLC-1-044'),
  missing:'C2 registered the whole print: purple hand -1 iff opponent yellow or green, printed gen 2'},
 'BLC-1-073':{status:'READY',owner:'Cursor',source:cardSource('UE01BT','BLC-1-073'),
  missing:'C2 registered the whole print: green hand -1 iff opponent yellow or purple, printed gen 2'},
 'SAO-1-015':{status:'READY',owner:'Cursor',source:cardSource('UE07BT','SAO-1-015'),
  missing:'C2 registered after normalizing generated energy from imported 3 to official 黄黄 = 2'},
 'SAO-1-050':{status:'READY',owner:'Cursor',source:cardSource('UE07BT','SAO-1-050'),
  missing:'C2 registered after normalizing generated energy from imported 3 to official 青青 = 2'},
 'SAO-1-092':{status:'READY',owner:'Cursor',source:cardSource('UE07BT','SAO-1-092'),
  missing:'C2 registered after normalizing generated energy from imported 3 to official 緑緑 = 2'}
});
const PRIORITY=Object.freeze({
 'TTG-1-069':{status:'READY',owner:'GPT',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-069',
  missing:'V2 registered MAIN REST and true self-retire, then one outside ガンメン card to hand. The action requires that target. Scenario tests exist. Not full official FAQ certification.'},
 'TTG-1-057':{status:'READY',owner:'GPT',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-057',
  missing:'V2 registered printed IMPACT null plus on-play grant until next own start. Scenario tests exist. Not full official FAQ certification.'},
 'TTG-1-081':{status:'READY',owner:'GPT',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-081',
  missing:'V2 registered 2026-08-28 erratum: retire one opponent FRONT at BP3000, or BP5000 when own field or raid base is Simon or Kamina. Scenario tests exist. Not full official FAQ certification.'},
 'SLG-1-022':{status:'READY',owner:'GPT',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-022',
  missing:'Registered on the shared engine: zone energy discount except field and outside, raid, dual-line ACTIVE, sniper, and the Q2029 energy-line swap. Registration is not a full FAQ certification.'},
 'BLC-1-003':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-003',
  missing:'C21 registered the whole print: BP+1000 for each opposing front REST character. Q535 includes a blocker who rests during the attack. COLOR rests one opposing front character and skips its next ACTIVE'},
 'BLC-1-019':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-019',
  missing:'C21 registered the whole print: BP+500 while two or more opposing field characters have current BP 4000 or more. Standard ACTIVE life'},
 'BLC-2-062':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-062',
  missing:'C21 registered the whole print: one extra energy while three other own field cards have trait 護廷十三隊. Fields count. No trigger'},
 'BLC-4-038':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-038',
  missing:'C21 registered the whole print: BP+1500 while an own front character has printed AP 2 or more. Q2319. Japanese has no own-turn limit. Standard DRAW life'},
 'BLC-2-054':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-054',
  missing:'C21 registered the whole print: BP+500 when this turn an own hand card moved to outside by rule, payment, or own effect. Opponent discards do not count. Japanese has no own-turn limit. Standard ACTIVE life'},
 'BLC-1-084':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-084',
  missing:'C21 registered the whole print: BP+500 while six other own field cards have trait 護廷十三隊. COLOR deploys one green hand character of energy 2 or less and AP 1. The fetched page had no FAQ'},
 'BLC-2-068':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-068',
  missing:'C21 registered the whole print: BP+1500 while six other own field cards have trait 護廷十三隊. Standard DRAW life. The fetched page had no FAQ'},
 'BLC-1-098':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-098',
  missing:'C20 registered the whole print: optional remove of one own outside character, then draw 2. Standard DRAW life'},
 'BLC-1-106':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08ST%2FBLC-1-106',
  missing:'C20 registered the whole print: optional remove of 3 own outside cards, then draw 2. Q575 moves a short set of 2 and does not draw. Standard GET life'},
 'BLC-2-043':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-043',
  missing:'C19 registered the whole print: optional activation, optional pay 1 AP, then up to one own-outside printed name REST. Q1043 limits the sentence. Q1044 allows only one activation per name each turn. COLOR returns an opposing front character at current BP 3500 or lower'},
 'BLC-2-039':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-039',
  missing:'C18 registered the whole print: on retire during your turn, optional REST of one opposing front character, shared once per printed name. Q1041 limits the sentence. Q1042 blocks a second copy. Standard ACTIVE life trigger'},
 'BLC-2-004':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-004',
  missing:'C17 registered the whole print: on play, draw 1 when own field has ユーハバッハ and own hand has fewer cards than the opponent'},
 'BLC-1-015':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-015',
  missing:'C16 registered the whole print: on play, draw 1 when the opponent has a REST character'},
 'BLC-1-027':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-027',
  missing:'C16 registered the whole print: on play, draw 1 when an opposing character current BP is at least 4000'},
 'BLC-1-076':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-076',
  missing:'C16 registered the whole print: on play, optional ACTIVE of up to one own 更木 剣八. Standard ACTIVE life trigger'},
 'MST-1-006':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-006',
  missing:'C15 registered the whole print: optional pay 1 AP, draw 1, then up to one blue energy<=3 AP1 hand character named ルーデウス, エリス or ルイジェルド, REST or Raid. COLOR returns an opposing front character at BP 3500 or lower'},
 'MST-1-007':{status:'READY',owner:'Cursor',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-007',
  missing:'C21 registered the whole print: choose draw-and-discard, or, only after own-effect entry, the named blue hand REST/Raid. Q2145 consumes that second choice once per printed name. The draw choice stays repeatable'},
 'MST-1-021':{status:'ENGINE BLOCKED',owner:'GPT',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-021',
  missing:'onPlay named hand REST/Raid is now a shared op, but MAIN once per turn still needs ACTIVE self only while both ルーデウス and エリス are on the own field'},
 'MST-1-033':{status:'ENGINE BLOCKED',owner:'GPT',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-033',
  missing:'onPlay TOP3 named take then conditional hand discard, plus MAIN that RESTS and retires this field as the cost before a blue energy<=3 AP1 hand character REST/Raid'}
});
const OTHER=Object.freeze({
 'BLC-4-044':{status:'REVIEW PENDING',owner:'Cursor',
  missing:'verify full print against existing attack-win shared DSL and official FAQ'},
 'SAO-1-097':{status:'REVIEW PENDING',owner:'Cursor',
  missing:'source-qualified optional mode/timing and physical UID review required'}
});
export const R58_OFFICIAL_REVIEW=Object.freeze({...SIX,...PRIORITY,...OTHER});
const statuses=['READY','PARTIAL','ENGINE BLOCKED','RULE BLOCKED','REVIEW PENDING'];
export function r58FiveTitleReview(){
 const inv=v2AllTitleInventory();
 if(inv.series.length!==5||inv.totals.total!==700)
  throw Error('R58 expects source-identified five-title 700 catalogue, not current registered count');
 const records=inv.series.flatMap(s=>s.unportedIds.map(id=>{
  const status=R58_OFFICIAL_REVIEW[id]||C1_OFFICIAL_REVIEWS[id]||{};
  return {id,title:s.title,status:status.status||'REVIEW PENDING',
   owner:status.owner||(['bleach','sword-art-online'].includes(s.title)?'Cursor':'GPT'),
   ...(status.source?{source:status.source}:{}),
   ...(status.missing?{missing:status.missing}:{})};
 }));
 const unique=new Set(records.map(x=>x.id));
 if(records.length!==unique.size||records.length!==inv.totals.blocked||
  records.some(x=>!statuses.includes(x.status)))
  throw Error('R58 complement identity/classification drift');
 const totals=Object.fromEntries(statuses.map(s=>[s,records.filter(c=>c.status===s).length]));
 const byTitle=Object.fromEntries(inv.series.map(s=>[s.title,{
  registered:s.pilotImplemented,unported:s.unportedIds.length,
  statuses:Object.fromEntries(statuses.map(status=>[status,
   records.filter(c=>c.title===s.title&&c.status===status).length]))}]));
 const cursor=records.filter(r=>r.owner==='Cursor'&&
  (r.status==='READY'||r.status==='PARTIAL'||R58_OFFICIAL_REVIEW[r.id]));
 const report={catalogue:700,registered:inv.totals.pilotImplemented,unported:records.length,
  statuses:totals,byTitle,cursorHandoff:cursor};
 if(Object.values(totals).reduce((a,b)=>a+b,0)!==report.unported)
  throw Error('R58 status totals drift');
 return {report,records};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const x=r58FiveTitleReview();
 mkdirSync('audit',{recursive:true});
 writeFileSync('audit/v2-r58-five-title-rescan.json',JSON.stringify(x,null,2)+'\n');
 console.log('R58_FIVE_TITLE_SUMMARY '+JSON.stringify({...x.report,cursorHandoff:undefined}));
 console.log('R58_CURSOR_HANDOFF '+JSON.stringify(x.report.cursorHandoff));
 console.log('R58_GPT_BLOCKED '+JSON.stringify(x.records.filter(r=>
  r.owner==='GPT'&&r.status!=='REVIEW PENDING')));
}
