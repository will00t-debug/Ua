#!/usr/bin/env node
// R54: repeated five-title *physical* unported complement after each common atom.
// A Japanese text hit never certifies complete effect readiness or independent FAQ.
import {pathToFileURL} from 'node:url';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';

const DIRECTIONS=Object.freeze({
 battleWinDraw:/(?:バトルに勝利|バトルで勝利|戰鬥.*勝利|battle.win).{0,100}(?:引く|ドロー|抽|draw)|(?:引く|ドロー|抽|draw).{0,100}(?:バトルに勝利|戰鬥.*勝利|battle.win)/iu,
 sniper:/(?:スナイパー|スナイプ|SNIPER|狙撃|狙擊)/iu,
 mustBlock:/(?:ブロック.*しなければ|ブロック.*必ず|強制.*ブロック|must.block)/iu,
 outsideGroups:/(?:場外|OUTSIDE).{0,100}(?:5枚|５枚|枚につき|每5張|every 5)|(?:5枚|５枚|枚につき|every 5).{0,100}(?:場外|OUTSIDE)/iu,
 attackEndSwap:/(?:アタック終了時|攻擊結束|attack.end).{0,130}(?:入れ替|交換|swap)/iu,
 namedOutsideTiers:/(?:場外|OUTSIDE).{0,120}(?:4枚|４枚|6枚|６枚|8枚|８枚|枚以上)/iu
});
const FOCUSED=Object.freeze({
 'TTG-1-067':{set:'UA56BT',faq:'Q2295',missing:['printed SNIPER target and un-blockability','physical battle win draw','temporary onPlay grants and ACTIVE LIFE']},
 'SLG-1-021':{set:'UA51BT',faq:'Q2028',missing:['printed-BP gated optional battle-win OUTSIDE recovery','mandatory legal block','conditional IMPACT1 full RAID/RAID LIFE testing']},
 'MST-1-009':{set:'UA54BT',faq:'Q2147',missing:['own-effect-entry-only mandatory chooseOne','stamped time-limited R47 attack-end swap','next-own-start temporary BP and full RAID/RAID LIFE']},
 'SAO-1-071':{set:'UA15BT',faq:null,missing:[]}
});
export function r54FiveTitleSourceRescan(){
 const inv=v2AllTitleInventory(),index=capabilityIndex(inv);
 const absent=index.cards.filter(c=>!c.registered);
 const registered=index.cards.filter(c=>c.registered);
 const expected=new Set(inv.series.flatMap(t=>t.unportedIds));
 if(inv.series.length!==5||index.cards.length!==700||
  absent.length!==expected.size||new Set(absent.map(c=>c.id)).size!==absent.length||
  absent.some(c=>!expected.has(c.id))||
  inv.totals.pilotImplemented!==registered.length||
  registered.length+absent.length!==700)throw Error('R54 catalogue/registry complement mismatch');
 const searches=Object.fromEntries(Object.entries(DIRECTIONS).map(([name,regex])=>{
  const hits=absent.filter(c=>regex.test(c.sourceText||'')).map(c=>({
   id:c.id,title:c.title,
   status:c.sourceText?.length?'REVIEW PENDING':'SOURCE PENDING',
   fingerprint:c.sourceFingerprint
  }));
  return [name,hits];
 }));
 const focused=Object.entries(FOCUSED).map(([id,detail])=>{
  const card=index.cards.find(c=>c.id===id);
  if(!card||!card.sourceText?.length)throw Error('R54 official focus missing source '+id);
  const status=card.registered?'REGISTERED':'PARTIAL';
  if(['SAO-1-071','TTG-1-067','SLG-1-021','MST-1-009'].includes(id)!==card.registered)
   throw Error('R54 official full-card status changed, audit source '+id);
  return {id,status,title:card.title,
   source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+detail.set+'%2F'+id,
   faq:detail.faq,missing:status==='REGISTERED'?[]:detail.missing};
 });
 const report={
  catalogue:700,titles:5,registered:registered.length,unportedSearched:absent.length,
  independentFaqCertified:inv.totals.fullyAccepted,
  officialReviewedRegistered:focused.filter(c=>c.status==='REGISTERED').length,
  officialReviewedPartial:focused.filter(c=>c.status==='PARTIAL').length,
  readyAutoPromoted:0,
  countsByTitle:Object.fromEntries(inv.series.map(c=>[c.title,{
   total:c.total,registered:c.pilotImplemented,unported:c.blocked}])),
  textualCandidates:Object.fromEntries(Object.entries(searches).map(([k,v])=>[k,v.length]))
 };
 if(report.registered+report.unportedSearched!==700||
  Object.values(report.countsByTitle).reduce((n,c)=>n+c.unported,0)!==absent.length||
  focused.filter(c=>c.status==='PARTIAL').some(c=>!expected.has(c.id)))
  throw Error('R54 incomplete physical complement or partial registration');
 return {report,focused,searches};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const {report,focused,searches}=r54FiveTitleSourceRescan();
 console.log('R54_FIVE_TITLE_PHYSICAL_RESCAN '+JSON.stringify(report));
 console.log('R54_OFFICIAL_WHOLE_PRINT_STATUS '+JSON.stringify(focused));
 for(const [name,hits] of Object.entries(searches))
  console.log('R54_TEXT_ONLY_'+name.toUpperCase()+' '+JSON.stringify(hits));
}
