// [V2-C] Workstream-owned TTG title contribution, NOT a standalone match reducer.
import {TTG_BY_ID} from '../../ttg-builder.mjs';
import {verifiedTtgV2Additions} from '../ttg-pack.mjs';
const proof=Object.freeze({
 'TTG-1-005':['IMPACT 無效','日本版 IMPACT null / DRAW。普通對局與生命分開測；無條件牌面特性。'],
 'TTG-1-014':['需求能源1以下','官方登場強制回手另一張符合條件的己方角色，無對象時自回手；來源 Q&A 與遊戲核心守恆測試。'],
 'TTG-1-019':['ACTIVE','日本印刷 ACTIVE 時綠色額外能源 1；REST 即無加成。'],
 'TTG-1-077':['ガンメン特徵','2026-10-15 日本官方：赤4/AP1/フィールド/赤赤，登場時「自分の場外から［特徴：ガンメン］を1枚まで手札に加える」。optional 0..1；僅自家場外，不搜 deck 或敵區。UA56BT 現有四張ガンメン印刷 source 的 traits 皆精確為複合「大グレン団／ガンメン」，為共用 filter 拆分僅此單卡的已驗證斜線複合來源成兩個特徵字串（ガンメン），原始 sourceRecord 不變且有來源漂移保護。無生命 Trigger。']
});
export default Object.freeze({
 title:'gurren-lagann',
 version:'v2-c-ttg-20261015-batch2',
 entries:Object.freeze(verifiedTtgV2Additions().map(def=>{
  const record=TTG_BY_ID[def.id],review=proof[def.id];
  if(!record||!review)throw Error('TTG independent V2 evidence missing: '+def.id);
  return Object.freeze({
   id:def.id,sourceRecord:record,definition:def,
   evidence:{printedTextFragments:[review[0]],reviewNote:review[1]+
    ' 日文來源：'+record.source,
    testFiles:['tests/universal-v2-ttg-port.test.mjs']}
  });
 }))
});
