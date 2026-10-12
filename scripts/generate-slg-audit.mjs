#!/usr/bin/env node
// Generates a truthful per-card audit: field presence is NOT functional coverage.
import {mkdirSync,writeFileSync} from 'node:fs';
import {SOLO_LEVELING_CARDS,SOLO_LEVELING_MISSING_NUMBERS} from '../dist/solo-leveling.mjs';
const fields=['id','number','name','nameJa','color','energy','ap','bp','gen','type','traits','trigger','effect','rarity','source','artStatus'];
const rows=SOLO_LEVELING_CARDS.map(c=>({
 number:c.number,identity:c.id,name:c.name,nameJa:c.nameJa,rarity:c.rarity,
 type:c.type,color:c.color,energy:c.energy,ap:c.ap,bp:c.bp,gen:c.gen,traits:c.traits,
 trigger:c.trigger,effect:c.effect,source:c.source,cardDataRecorded:fields.every(k=>Object.hasOwn(c,k)),
 screenshotArtLicensed:false,allowedCopies:c.maxCopies,
 automaticResolutionIntegrated:false,perCardFullEffectExecuted:false,officialFaqFullyChecked:false,
 verdict:'尚未完成自動判定',
 notes:'卡面資訊已登錄；主對戰引擎／AI 未接通，不能將部分獨立效果測試認列為完整卡牌驗收。'
}));
if(rows.length!==80||SOLO_LEVELING_MISSING_NUMBERS.length||new Set(rows.map(c=>c.identity)).size!==80)throw Error('UA51BT should have 80 unique base card IDs');
const csvCols=['number','identity','nameJa','rarity','type','color','energy','ap','bp','gen','trigger','traits','allowedCopies','cardDataRecorded','automaticResolutionIntegrated','perCardFullEffectExecuted','officialFaqFullyChecked','verdict','source'];
const q=x=>'"'+String(Array.isArray(x)?x.join(' / '):x??'').replaceAll('"','""')+'"';
const csv=[csvCols.join(','),...rows.map(c=>csvCols.map(key=>q(c[key])).join(','))].join('\n')+'\n';
mkdirSync('audit',{recursive:true});
writeFileSync('audit/solo-leveling-card-status.csv',csv);
writeFileSync('audit/solo-leveling-card-status.json',JSON.stringify({
 title:'我獨自升級 UA51BT/SLG-1',totalBaseCards:80,inventoryRecorded:80,
 playableCards:0,fullyVerifiedCardEffects:0,hasAnyLicensedCardImage:false,
 status:'卡表建檔完成；完整效果與 AI 對戰尚未完成',
 faqUrl:'https://www.unionarena-tcg.com/jp/faq/list.php?series=UA51BT',
 cards:rows},null,2)+'\n');
console.log('UA51BT: 80 catalog entries; 0 claims of full playable effect support.');
