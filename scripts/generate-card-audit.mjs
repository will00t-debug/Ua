#!/usr/bin/env node
// BLEACH card-by-card audit manifest. This is a coverage ledger, NOT proof of official accuracy.
import {writeFileSync,mkdirSync} from 'node:fs';
import {CARDS} from '../dist/cards.mjs';
import {CARD_RULES} from '../dist/card-rules.mjs';
import {EXTRA_RULES} from '../dist/extra-rules.mjs';
import {V9_RULES} from '../dist/v9-rules.mjs';

const statuses=['已實際測試通過','發現問題並已修正','仍有漏洞','官方資料不足或尚未確認'];
const fields=['卡號','需求能源','消耗 AP','BP','產生能源','Trigger','觸發時點','同時觸發順序','玩家選擇','Raid / REST / ACTIVE / 移動','抽牌 / 棄牌 / 除外 / 復活','成本與次數限制','跨回合效果','目標限制','生命 Trigger / IMPACT / 傷害 / 阻擋 / 戰鬥','卡片守恆'];
const marker=/登場|攻擊|退場|啟動|主要|Raid|REST|Rest|ACTIVE|Active|移動|抽|棄|除外|生命|Impact|阻擋|傷害|觸發|選|能力|BP|能源|AP|牌庫|場外|蓋牌/gi;
const split=/(?:\n|。|；|;|(?=【)|(?=〖))/;
function casesFor(c){
 const text=[c.effect,c.triggerEffect].filter(Boolean).join('。');
 const chunks=text.split(split).map(x=>x.trim()).filter(Boolean);
 const meaningful=chunks.filter(x=>{marker.lastIndex=0;return marker.test(x)});
 const clauses=meaningful.length?meaningful:[text||'無固有效果；驗證普通登場與戰鬥'];
 return clauses.map((clause,i)=>({
  id:`${c.identity}-E${String(i+1).padStart(2,'0')}`,
  clause,success:'待建立：合法情境，驗證實際狀態與區域變化',
  failure:/可|若|時|只有|以下|以上|選|最多|條件/.test(clause)?'待建立：條件不成立／拒絕選擇／無合法目標':'不適用，或待人工核對',
  testFile:null,executed:false,officialVerified:false,status:statuses[3]
 }));
}
const rows=CARDS.map(c=>({
 cardNumber:c.number,identity:c.identity,name:c.name,series:c.sets,
 local:{energy:c.energy,ap:c.ap,bp:c.bp,generatedEnergy:c.gen,trigger:c.trigger},
 effect:c.effect,triggerEffect:c.triggerEffect??null,
 officialCardUrl:c.source,officialFaqUrl:'https://www.unionarena-tcg.com/jp/faq/list.php?category=%E3%82%AB%E3%83%BC%E3%83%89%E5%80%8B%E5%88%A5&sub_category=BLEACH+%E5%8D%83%E5%B9%B4%E8%A1%80%E6%88%A6%E7%AF%87',
 ruleProfilePresent:Boolean(CARD_RULES[c.identity]||EXTRA_RULES[c.identity]||V9_RULES[c.identity]||c.rules),
 autoFlag:Boolean(c.auto),auditFields:fields,
 cases:casesFor(c),status:statuses[3],reviewerNotes:'尚未逐條比對官方卡面／FAQ、尚未運行本卡專屬驗證案例；autoFlag 不是通過證據。'
}));
if(new Set(rows.map(r=>r.identity)).size!==rows.length)throw Error('Duplicate card identities');
if(rows.length!==276)throw Error(`Expected 276 identities, got ${rows.length}; investigate before claiming coverage`);
mkdirSync('audit',{recursive:true});
writeFileSync('audit/bleach-card-audit.json',JSON.stringify({schema:1,generatedFrom:'dist/cards.mjs',verifiedPassed:0,fixed:0,knownOpen:0,unconfirmed:rows.length,cardCount:rows.length,disclaimer:'Entries are inventory and proposed scenarios, not executed tests or official verification.',cards:rows},null,2)+'\n');
writeFileSync('audit/bleach-card-audit.csv',[
 ['cardNumber','identity','name','energy','ap','bp','generatedEnergy','trigger','ruleProfilePresent','autoFlag','effectCaseCount','status','officialCardUrl'].join(','),
 ...rows.map(r=>[r.cardNumber,r.identity,r.name,r.local.energy,r.local.ap,r.local.bp,r.local.generatedEnergy,r.local.trigger,r.ruleProfilePresent,r.autoFlag,r.cases.length,r.status,r.officialCardUrl].map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))
].join('\n')+'\n');
console.log(`Generated ${rows.length} unique identities and ${rows.reduce((n,r)=>n+r.cases.length,0)} unexecuted candidate scenarios. NOT audited/verified.`);
