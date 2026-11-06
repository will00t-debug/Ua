// Rebuilds docs/audit/effect-audit-ledger.json from the card files.
// Notes in effect-audit-notes.json are the only place a clause can leave
// 「未檢查」. Regenerating never marks an untouched card as passed.
// A card may keep several clause reviews. Rebuilding keeps every one.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {CSM_CARDS} from '../dist/csm-cards.mjs';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {KMR_PR_CARDS} from '../dist/kmr-pr-cards.mjs';
import {KMR_POINT_CARDS} from '../dist/kmr-point-cards.mjs';
import {INUYASHA_CARDS} from '../dist/inuyasha-cards.mjs';
import {KJN_CARDS} from '../dist/kjn-cards.mjs';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {AOT2_CARDS} from '../dist/aot-vol2-cards.mjs';
import {MADOKA_CARDS} from '../dist/madoka-cards.mjs';
import {EXEDRA_CARDS} from '../dist/madoka-exedra-cards.mjs';
import {REZERO_CARDS} from '../dist/rezero-cards.mjs';
import notesFile from '../docs/audit/effect-audit-notes.json' with {type:'json'};

const CLAUSE_STATUSES=['未檢查','待修正','已修正待驗證','已驗證','缺資料待確認'];
const CARD_STATUSES=[...CLAUSE_STATUSES,'部分核對','無效果','行動值卡'];
// A new clause starts at a timing header. A keyword printed inside a
// sentence, such as 【インパクト無効】 or 【紫×2】, stays with that sentence.
const HEADER=/^(登場時|起動メイン|起動アクション|アタック時|アタック終了時|ブロックされた時|ブロック時|退場時|自分のターン中|相手のターン中|自分のターン開始時|相手のターン開始時|自分のターン終了時|相手のターン終了時|ターン終了時|レイド)$/;

export function splitPrintedClauses(text){
 const source=String(text||'').trim();
 if(!source||source==='-'||source==='無'||source==='無 Trigger。')return [];
 const cuts=[0];
 const pattern=/【([^】]+)】/g;
 let found;
 while((found=pattern.exec(source))){
  if(!HEADER.test(found[1]))continue;
  const before=source.slice(0,found.index).trim();
  if(!before||/[。．)）\n]$/.test(before))cuts.push(found.index);
 }
 return cuts.map((start,index)=>{
  const end=cuts[index+1]??source.length;
  return source.slice(start,end).trim();
 }).filter(Boolean);
}

function blankClause(text){
 return {text,status:'未檢查',official:'',implementation:'',
  discrepancy:'',evidence:'',unresolved:''};
}
function requireVerified(cardId,clause){
 if(clause.status!=='已驗證')return;
 if(!clause.evidence.trim()||!clause.official.trim()||!clause.implementation.trim())
  throw Error(cardId+' verified clause is missing evidence, source, or implementation');
 if(clause.unresolved.trim())
  throw Error(cardId+' verified clause still has an unresolved item');
}
function applyClause(card,clauses,item){
 if(!item?.match||!CLAUSE_STATUSES.includes(item.status))
  throw Error(card.id+' clause review is incomplete');
 const hits=clauses.filter(clause=>clause.text.includes(item.match));
 if(hits.length!==1)
  throw Error(card.id+' match '+item.match+' hit '+hits.length+' clauses');
 const clause=hits[0];
 clause.status=item.status;
 clause.official=item.official||card.source||'';
 clause.implementation=item.implementation||'';
 clause.discrepancy=item.discrepancy||item.change||'';
 clause.evidence=item.evidence||'';
 clause.unresolved=item.unresolved||'';
 requireVerified(card.id,clause);
}
function reviewsByCard(notes){
 const grouped=new Map();
 for(const review of notes.reviews||[]){
  if(!review?.cardId)throw Error('Audit review has no cardId');
  const list=grouped.get(review.cardId)||[];
  list.push(review);
  grouped.set(review.cardId,list);
 }
 return grouped;
}
export function aggregateCardStatus(clauses,{ap=false,noEffect=false}={}){
 if(ap)return '行動值卡';
 if(noEffect||!clauses.length)return '無效果';
 if(clauses.some(clause=>clause.status==='待修正'))return '待修正';
 if(clauses.some(clause=>clause.status==='缺資料待確認'))return '缺資料待確認';
 if(clauses.some(clause=>clause.status==='已修正待驗證'))return '已修正待驗證';
 const verified=clauses.filter(clause=>clause.status==='已驗證').length;
 if(verified===clauses.length)return '已驗證';
 if(verified>0)return '部分核對';
 return '未檢查';
}
function clausesOf(card){
 const effect=splitPrintedClauses(card.effectJa||card.effect);
 const trigger=String(card.triggerTextJa||card.triggerText||'').trim();
 const triggerClauses=!trigger||trigger==='-'||trigger==='無'||trigger==='無 Trigger。'?
  []:[trigger];
 return [...effect,...triggerClauses].map(blankClause);
}
function applyReviews(card,clauses,reviews){
 const audits=[];
 for(const review of reviews){
  if(Array.isArray(review.clauses)){
   for(const item of review.clauses)applyClause(card,clauses,item);
   audits.push({cardId:review.cardId,number:review.number||card.number||'',
    clauses:review.clauses.map(item=>({match:item.match,status:item.status}))});
   continue;
  }
  if(review.complete===true){
   if(!review.clauseIncludes)throw Error(card.id+' complete review needs clauseIncludes');
   if(!CLAUSE_STATUSES.includes(review.status))
    throw Error(card.id+' complete review has a bad status');
   applyClause(card,clauses,{
    match:review.clauseIncludes,status:review.status,
    official:review.official||card.source||'',
    implementation:review.implementation||'',
    discrepancy:review.change||'',evidence:review.evidence||'',
    unresolved:''
   });
  }
  audits.push({cardId:review.cardId,number:review.number||'',
   status:review.status||'',covers:review.covers||'',
   evidence:review.evidence||'',remaining:review.remaining||'',
   complete:review.complete===true});
 }
 return audits;
}
function cardKind(group,card,clauses){
 if(group.id==='kmr-point'||card.type==='action-point')return 'ap';
 if(!clauses.length)return 'no-effect';
 return 'playable';
}
export function nextUnchecked(cards){
 return cards.find(card=>card.kind==='playable'&&card.status==='未檢查')||null;
}
function tally(list){
 const counts={total:list.length};
 for(const status of CARD_STATUSES)counts[status]=0;
 counts.部分條款已記錄=0;
 for(const card of list){
  counts[card.status]=(counts[card.status]||0)+1;
  if(card.partial)counts.部分條款已記錄+=1;
 }
 return counts;
}
export function buildLedger({series,notes}){
 const grouped=reviewsByCard(notes);
 const seen=new Set();
 const cards=series.flatMap(group=>group.cards.map(card=>{
  const id=card.id||card.identity;
  if(!id)throw Error('Card without id in '+group.id);
  if(seen.has(id))throw Error('Duplicate audit id '+id);
  seen.add(id);
  const clauses=clausesOf(card);
  const reviews=grouped.get(id)||[];
  const audits=applyReviews({...card,id},clauses,reviews);
  const kind=cardKind(group,card,clauses);
  const status=aggregateCardStatus(clauses,{ap:kind==='ap',noEffect:kind==='no-effect'});
  if(status==='已驗證'&&clauses.some(clause=>clause.status!=='已驗證'))
   throw Error(id+' cannot pass while a clause is open');
  const open=clauses.filter(clause=>clause.status==='未檢查').length;
  return {
   series:group.id,seriesName:group.name,id,number:card.number||'',
   name:card.name||card.officialName||'',set:card.set||'',
   source:card.source||card.officialSource||'',sourceTc:card.sourceTc||'',
   effectJa:card.effectJa||'',effect:card.effect||'',
   engineKind:card.engineKind||'',runtime:group.runtime,
   kind,clauses,status,audits,
   partial:audits.length>0||(open>0&&open<clauses.length)
  };
 }));
 for(const cardId of grouped.keys())
  if(!seen.has(cardId))throw Error('Review has no card '+cardId);
 const playable=cards.filter(card=>card.kind==='playable');
 const cursor=nextUnchecked(cards);
 const bySeries=series.map(group=>{
  const mine=cards.filter(card=>card.series===group.id);
  return {id:group.id,name:group.name,product:group.product,priority:group.priority,
   ...tally(mine)};
 });
 return {
  generatedFrom:'scripts/build-effect-audit-ledger.mjs',
  updated:notes.updated,
  next:cursor?{id:cursor.id,number:cursor.number,series:cursor.seriesName}:null,
  rule:'登錄效果或既有測試通過，都不等於這張卡已核對。整張卡通過只發生在每一段都有官方來源、實作位置與驗證，而且沒有未解決項目。',
  sharedFixes:notes.sharedFixes||[],
  summary:{...tally(cards),playable:tally(playable),
   ap:tally(cards.filter(card=>card.kind==='ap')),
   noEffect:tally(cards.filter(card=>card.kind==='no-effect')),
   series:bySeries},
  cards
 };
}

const SERIES=[
 {id:'csm',name:'鏈鋸人',product:'UA53BT',priority:1,cards:CSM_CARDS,runtime:'dist/universal-v2/csm-runtime.mjs'},
 {id:'kmr1',name:'假面騎士第一彈',product:'UA29BT／UA29ST',priority:1,cards:KMR_CARDS,runtime:'dist/universal-v2/kmr-runtime.mjs'},
 {id:'kmr2',name:'假面騎士第二彈',product:'EX12BT',priority:1,cards:KMR2_CARDS,runtime:'dist/universal-v2/kmr2-runtime.mjs'},
 {id:'kmr-pr',name:'假面騎士 PR',product:'UAPR',priority:1,cards:KMR_PR_CARDS,runtime:'dist/universal-v2/kmr2-runtime.mjs'},
 {id:'kmr-point',name:'假面騎士行動值卡',product:'AP',priority:1,cards:KMR_POINT_CARDS,runtime:null},
 {id:'aot',name:'進擊的巨人第一彈',product:'UA23BT／UA23ST',priority:2,cards:AOT_CARDS,runtime:'dist/universal-v2/aot-runtime.mjs'},
 {id:'aot2',name:'進擊的巨人第二彈',product:'EX10BT',priority:2,cards:AOT2_CARDS,runtime:'dist/universal-v2/aot2-runtime.mjs'},
 {id:'iys',name:'犬夜叉',product:'UA50BT',priority:2,cards:INUYASHA_CARDS,runtime:'dist/universal-v2/iys-runtime.mjs'},
 {id:'kjn',name:'我想成為影之強者！',product:'UA52BT',priority:2,cards:KJN_CARDS,runtime:'dist/universal-v2/kjn-runtime.mjs'},
 {id:'mmm',name:'魔法少女小圓第一彈',product:'UA31BT／UA31ST',priority:2,cards:MADOKA_CARDS,runtime:'dist/universal-v2/engine.mjs'},
 {id:'mmm2',name:'魔法少女小圓第二彈',product:'EX16BT',priority:2,cards:EXEDRA_CARDS,runtime:'dist/universal-v2/mmm-exedra-runtime.mjs'},
 {id:'rez',name:'Re:Zero',product:'UA28BT 等',priority:2,cards:REZERO_CARDS,runtime:'dist/universal-v2/engine.mjs'}
];

function writeLedger(ledger){
 const lines=['# 卡牌效果稽核台帳','',
  '這份清單由 `scripts/build-effect-audit-ledger.mjs` 從卡庫重算。進度只寫在 `docs/audit/effect-audit-notes.json`。沒有寫進去的卡維持未檢查，不能當成通過。',
  '',
  '下一個未檢查的可出牌：'+(ledger.next?ledger.next.id+' '+ledger.next.number:'沒有'),
  '',
  '## 各系列',
  '',
  '| 系列 | 商品 | 總數 | 已驗證 | 部分核對 | 缺資料 | 待修正 | 未檢查 | 行動值／無效果 |',
  '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
 for(const group of ledger.summary.series){
  const aside=(group.行動值卡||0)+(group.無效果||0);
  lines.push('| '+[group.name,group.product,group.total,group.已驗證||0,
   group.部分核對||0,group.缺資料待確認||0,group.待修正||0,group.未檢查||0,aside].join(' | ')+' |');
 }
 const playable=ledger.summary.playable;
 lines.push('','可出牌 '+playable.total+' 張。整張已驗證 '+(playable.已驗證||0)+
  ' 張。部分核對 '+(playable.部分核對||0)+' 張。缺資料待確認 '+(playable.缺資料待確認||0)+
  ' 張。待修正 '+(playable.待修正||0)+
  ' 張。未檢查 '+(playable.未檢查||0)+' 張。行動值卡 '+ledger.summary.ap.total+
  ' 張、無效果卡 '+ledger.summary.noEffect.total+' 張另行統計，不擋住下一張可出牌。','',
  '整張卡已驗證表示每一段都有官方來源、實作位置、驗證案例，而且沒有未解決項目。只完成其中一段時，卡片是部分核對。','',
  '## 本批共用修正','');
 for(const fix of ledger.sharedFixes||[])
  lines.push('### '+fix.name,'',fix.rule,'',fix.where,'',fix.affects,'',fix.evidence,'');
 lines.push('## 已寫進台帳的條款','');
 for(const card of ledger.cards){
  if(!card.audits.length)continue;
  const done=card.clauses.filter(clause=>clause.status!=='未檢查')
   .map(clause=>clause.status+' '+clause.text.slice(0,24));
  lines.push('- `'+card.id+'` '+card.number+'：'+card.status+
   (done.length?'。'+done.join('／'):'') );
 }
 lines.push('','BLEACH 本篇與擴充不在這份近期系列清單。刀劍神域、命運石之門、無職轉生也還沒有納入這次台帳。','');
 writeFileSync(new URL('../docs/audit/effect-audit-ledger.json',import.meta.url),
  JSON.stringify(ledger,null,1)+'\n');
 writeFileSync(new URL('../docs/audit/README.md',import.meta.url),lines.join('\n'));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const ledger=buildLedger({series:SERIES,notes:notesFile});
 writeLedger(ledger);
 console.log(JSON.stringify({next:ledger.next,playable:ledger.summary.playable},null,1));
}
