#!/usr/bin/env node
// R48: derive every unported identity from existing official SOURCE + R35 index.
// This scanner does not create a card database. Text matches are never READY.
import {pathToFileURL} from 'node:url';
import {capabilityIndex} from './v2-r35-unported-atom-audit.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {r46BattleWonCandidateScan} from './v2-r46-battle-win-candidate-report.mjs';
import {r47FiveTitleAttackSwapAndMainRescan} from './v2-r47-attack-end-swap-candidate-report.mjs';
export const R48_QUERY_ATOMS=Object.freeze({
 attackEndSwap:/アタック終了時|アタックの終了時|攻擊結束|攻撃結束|位置を入れ替|交換位置/u,
 distinctPrintedNames:/カード名.{0,18}種類|不同.{0,8}卡名|種以上不同印刷/u,
 topNChoice:/上から[２2334４]枚|牌[堆庫]頂[２2334４]|牌庫上方[２2334４]/u,
 discardThenRecover:/手札.{0,35}場外.{0,70}場外.{0,40}手札|棄手牌.{0,30}回收/u,
 retireThenDeploy:/退場.{0,55}登場|退場.{0,55}能源|退場.{0,55}エナジー/u,
 battleWon:/バトルに勝利|バトルで勝利|バトルに勝った|戰鬥獲勝/u,
 damage2:/ダメージ[（(]?２|ダメージ[（(]?2|DAMAGE.?2|Damage.?2/u,
 handApDiscount:/消費AP.{0,8}−.?1|消費AP.{0,8}-.?1|AP減費|AP.?−.?1/u,
 chooseOneThree:/以下から[123３]つ選|以下.{0,8}[１12３3]つ選|以下一項|以下選1項/u,
 outsideNameCondition:/自分の場外.{0,70}〈|場外.{0,70}卡名/u
});
const R48_OFFICIAL_REVIEWS=Object.freeze({
 'BLC-4-069':{status:'PARTIAL',faq:['Q2337','Q2338'],missing:['verify Q2337 four legal EVENT outside sequence with newly registered BLC-1-095','real 花天狂骨 printed-trait hand use with once AP discount','paid RAID, RAID LIFE and attack-end timing on whole real card']},
 'BLC-4-042':{status:'PARTIAL',faq:['Q2323'],missing:['TOP2 + two distinct hand UID payment integrated with chooseOne','named blue FIELD BLC-2-044 ACTIVE ENERGY effect entry','correct imported base energy 2 versus legacy 3 and DRAW LIFE']},
 'BLC-2-044':{status:'PARTIAL',faq:[],missing:['two different printed MAIN abilities with separate turn1/rest costs','true trait retirement and conditional global BP boost','GET LIFE']},
 'TTG-1-067':{status:'PARTIAL',faq:['Q2295'],missing:['onPlay temporary battle-win draw and sniper','active entry and BP>=4000 block prohibition','AP2, ACTIVE LIFE complete test']},
 'SLG-1-021':{status:'PARTIAL',faq:['Q2028'],missing:['variable outside-count BP and eligible dynamic name-exclusion BP recovery','forced block and raid/Impact/conditional Impact','whole printed battle-win recovery UI']},
 'SAO-1-018':{status:'PARTIAL',faq:[],missing:['also treated as Eugeo; retire grant two independently optional named targets','Impact null and Impact1 composite; RAID LIFE']},
 'SAO-1-070':{status:'PARTIAL',faq:[],missing:['aggregate exact two printed outside-name counts with 4/6 thresholds','BP and conditional Impact end-to-end']},
 'MST-1-009':{status:'PARTIAL',faq:['Q2147'],missing:['own-effect entry-gated mandatory chooseOne','temporary attack-end swap grant with field UID/stamp','next own-turn-start BP expiry plus RAID LIFE']}
});
export function r48FullTitleReadinessScan(){
 const inventory=v2AllTitleInventory(),index=capabilityIndex(inventory);
 const expected=new Set(inventory.series.flatMap(s=>s.unportedIds));
 const cards=index.cards.filter(c=>!c.registered);
 if(index.cards.length!==700||inventory.series.length!==5||
  inventory.totals.blocked!==cards.length||expected.size!==cards.length||
  cards.some(c=>!expected.has(c.id)))throw Error('R48 canonical UID inventory lost a printed card');
 const annotated=cards.map(c=>{
  const text=c.sourceText||'',atoms=Object.entries(R48_QUERY_ATOMS)
   .filter(([,pattern])=>pattern.test(text)).map(([key])=>key);
  const official=R48_OFFICIAL_REVIEWS[c.id];
  return {id:c.id,title:c.title,sourceUrl:c.sourceUrl,
   textHits:atoms,status:official?.status||'REVIEW PENDING',
   ...(official?{faq:official.faq,missing:official.missing}:{}),
   // A text hit is NOT a semantic equivalent or full-print certification.
   };
 });
 const r46=r46BattleWonCandidateScan(),r47=r47FiveTitleAttackSwapAndMainRescan();
 if(r46.summary.unportedSearched!==cards.length||
  r47.summary.unportedSearched!==cards.length)throw Error('R48 historical scan scope drift');
 const allHits=annotated.filter(x=>x.textHits.length);
 const summary={catalogue:700,titles:5,registered:inventory.totals.pilotImplemented,
  unportedSearched:cards.length,nonEmptyTextHits:allHits.length,
  officialFullPrintReviewedUnported:annotated.filter(c=>c.faq!==undefined).length,
  ready:annotated.filter(c=>c.status==='READY').length,
  partial:annotated.filter(c=>c.status==='PARTIAL').length,
  reviewPending:annotated.filter(c=>c.status==='REVIEW PENDING').length,
  r46BattleWinCandidates:r46.summary.battleWinTextCandidates,
  r47AttackSwapRelated:r47.summary.textCandidates,
  byTitle:Object.fromEntries(inventory.series.map(row=>[row.title,{
   registered:row.pilotImplemented,unported:row.blocked,
   textFlagged:allHits.filter(c=>c.title===row.title).length}]))};
 if(summary.registered+summary.unportedSearched!==700||
  summary.partial+summary.reviewPending+summary.ready!==cards.length)
  throw Error('R48 source conservation, audit statuses or registry cardinality drift');
 return {summary,reviewed:annotated.filter(c=>c.faq!==undefined),
  textCandidates:allHits,unflagged:annotated.filter(c=>!c.textHits.length).map(c=>c.id)};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
 const result=r48FullTitleReadinessScan();
 console.log('R48_CURRENT_FIVE_TITLE_SCAN '+JSON.stringify(result.summary));
 console.log('R48_OFFICIAL_REVIEWED '+JSON.stringify(result.reviewed));
 console.log('R48_CAPABILITY_TEXT_CANDIDATES '+JSON.stringify(result.textCandidates));
}
