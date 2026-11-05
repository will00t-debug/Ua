// Rebuilds docs/audit/effect-audit-ledger.json from the card files.
// Notes in effect-audit-notes.json are the only place a clause can leave
// 「未檢查」. Regenerating never marks an untouched card as passed.
import {writeFileSync} from 'node:fs';
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
import notes from '../docs/audit/effect-audit-notes.json' with {type:'json'};

const STATUSES=['未檢查','待修正','已修正待驗證','已驗證','缺資料待確認'];
const series=[
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
const reviews=new Map((notes.reviews||[]).map(review=>{
 if(!review.cardId||!STATUSES.includes(review.status))
  throw Error('Bad audit review '+JSON.stringify(review));
 return [review.cardId,review];
}));
const seen=new Set();

function clausesOf(card){
 const chunks=[];
 const push=text=>{
  const value=String(text||'').trim();
  if(!value||value==='-'||value==='無'||value==='無 Trigger。')return;
  chunks.push(value);
 };
 push(card.effectJa||card.effect);
 push(card.triggerTextJa||card.triggerText);
 return chunks.flatMap(text=>{
  const parts=text.split(/(?=【)/).map(part=>part.trim()).filter(Boolean);
  return parts.length?parts:[text];
 });
}
function faqOf(card){
 return (card.faq||[]).map(entry=>({
  id:entry.id||'',date:entry.date||'',q:entry.q||'',a:entry.a||''
 }));
}
function row(group,card){
 const id=card.id||card.identity;
 if(!id)throw Error('Card without id in '+group.id);
 if(seen.has(id))throw Error('Duplicate audit id '+id);
 seen.add(id);
 const review=reviews.get(id)||null;
 const clauses=clausesOf(card).map(text=>({text,status:'未檢查',implementation:'',change:'',evidence:''}));
 if(review?.complete===true){
  if(!review.clauseIncludes)throw Error(id+' complete review needs clauseIncludes');
  const hits=clauses.filter(clause=>clause.text.includes(review.clauseIncludes));
  if(hits.length!==1)throw Error(id+' clauseIncludes matched '+hits.length);
  hits[0].status=review.status;
  hits[0].implementation=review.implementation||group.runtime||'';
  hits[0].change=review.change||'';
  hits[0].evidence=review.evidence||'';
  hits[0].remaining=review.remaining||'';
 }
 const open=clauses.filter(clause=>clause.status==='未檢查').length;
 const status=clauses.length&&open===0?'已驗證':'未檢查';
 if(status==='已驗證'&&clauses.some(clause=>clause.status!=='已驗證'))
  throw Error(id+' cannot pass while a clause is open');
 return {
  series:group.id,seriesName:group.name,id,number:card.number||'',
  name:card.name||card.officialName||'',set:card.set||'',
  source:card.source||card.officialSource||'',sourceTc:card.sourceTc||'',
  effectJa:card.effectJa||'',effect:card.effect||'',
  engineKind:card.engineKind||'',runtime:group.runtime,
  faq:faqOf(card),clauses,status,
  review:review?{status:review.status,covers:review.covers,change:review.change||'',
   evidence:review.evidence||'',remaining:review.remaining||''}:null,
  partial:!!review||(open>0&&open<clauses.length)
 };
}

const cards=series.flatMap(group=>group.cards.map(card=>row(group,card)));
for(const review of reviews.values())
 if(!seen.has(review.cardId))throw Error('Review has no card '+review.cardId);

function tally(list){
 const counts={total:list.length,未檢查:0,待修正:0,已修正待驗證:0,已驗證:0,缺資料待確認:0,部分條款已記錄:0};
 for(const card of list){
  counts[card.status]+=1;
  if(card.partial)counts.部分條款已記錄+=1;
 }
 return counts;
}
const bySeries=series.map(group=>{
 const mine=cards.filter(card=>card.series===group.id);
 return {id:group.id,name:group.name,product:group.product,priority:group.priority,...tally(mine)};
});
const ledger={
 generatedFrom:'scripts/build-effect-audit-ledger.mjs',
 updated:notes.updated,
 next:notes.next,
 rule:'登錄效果或既有測試通過，都不等於這張卡已核對。狀態留在未檢查，除非 notes 裡寫了這一段的官方文本、實作位置與驗證。',
 sharedFixes:notes.sharedFixes||[],
 summary:{...tally(cards),series:bySeries},
 cards
};
const out=new URL('../docs/audit/effect-audit-ledger.json',import.meta.url);
writeFileSync(out,JSON.stringify(ledger,null,1)+'\n');

const lines=['# 卡牌效果稽核台帳','',
 '這份清單由 `scripts/build-effect-audit-ledger.mjs` 從卡庫重算。進度只寫在 `docs/audit/effect-audit-notes.json`。沒有寫進去的卡維持未檢查，不能當成通過。',
 '',
 '下一個位置：'+notes.next,
 '',
 '## 各系列',
 '',
 '| 系列 | 商品 | 總數 | 已核對 | 已驗證 | 未檢查 | 有部分條款紀錄 |',
 '| --- | --- | ---: | ---: | ---: | ---: | ---: |'];
for(const group of bySeries){
 const checked=group.total-group.未檢查;
 lines.push('| '+[group.name,group.product,group.total,checked,group.已驗證,group.未檢查,group.部分條款已記錄].join(' | ')+' |');
}
lines.push('','全庫 '+ledger.summary.total+' 張。整張卡已核對 '+(ledger.summary.total-ledger.summary.未檢查)+' 張。整張卡已驗證 '+ledger.summary.已驗證+' 張。未檢查 '+ledger.summary.未檢查+' 張。','',
 '已核對是指這張卡每一段印刷效果都離開了未檢查。只驗證其中一段時，卡片仍是未檢查，並計入「有部分條款紀錄」。','',
 '## 本批共用修正','');
for(const fix of notes.sharedFixes||[]){
 lines.push('### '+fix.name,'',fix.rule,'',fix.where,'',fix.affects,'',fix.evidence,'');
}
lines.push('## 已寫進台帳的條款','');
for(const review of notes.reviews||[]){
 lines.push('- `'+review.cardId+'` '+review.number+'：'+review.status+'。'+review.covers+(review.remaining?' 尚未涵蓋：'+review.remaining:''));
}
lines.push('','BLEACH 本篇與擴充不在這份近期系列清單。刀劍神域、命運石之門、無職轉生也還沒有納入這次台帳。','');
writeFileSync(new URL('../docs/audit/README.md',import.meta.url),lines.join('\n'));
console.log(JSON.stringify(ledger.summary,null,1));
