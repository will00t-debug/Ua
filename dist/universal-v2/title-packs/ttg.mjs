// [V2-C] Workstream-owned TTG title contribution, NOT a standalone match reducer.
import {TTG_BY_ID} from '../../ttg-builder.mjs';
import {verifiedTtgV2Additions} from '../ttg-pack.mjs';
const proof=Object.freeze({
 'TTG-1-005':['IMPACT 無效','日本版 IMPACT null / DRAW。普通對局與生命分開測；無條件牌面特性。'],
 'TTG-1-014':['需求能源1以下','官方登場強制回手另一張符合條件的己方角色，無對象時自回手；來源 Q&A 與遊戲核心守恆測試。'],
 'TTG-1-019':['ACTIVE','日本印刷 ACTIVE 時綠色額外能源 1；REST 即無加成。']
});
export default Object.freeze({
 title:'gurren-lagann',
 version:'v2-c-ttg-20261015',
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
