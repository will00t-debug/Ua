// [V2-C] Workstream-owned SLG contribution. Legacy solo match engine is never used.
import {SOLO_LEVELING_CARDS} from '../../solo-leveling.mjs';
import {verifiedSlgV2Cards} from '../slg-pack.mjs';
const records=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const proof=Object.freeze({
 '005':['無印刷角色能力','無印刷內文，DRAW Life'],
 '006':['ACTIVE','只有 ACTIVE 時紫額外能源一'],
 '015':['無印刷角色能力','無內文效果，GET Life'],
 '016':['牌庫頂2張','登場強制送二卡場外，IMPACT 無效'],
 '026':['登場時讓另一己方','強制回手其他己方低費角色，否則自身回手'],
 '032':['IMPACT無效','純 IMPACT 無效，ACTIVE Life'],
 '038':['最多2張己方AP','事件至多回復二 AP，Life FINAL 與事件分流'],
 '040':['BP3000以下','紫事件有水篠旬才把退場 BP3000 改為 BP5000；Life SPECIAL 無條件'],
 '041':['ACTIVE','只有 ACTIVE 時綠額外能源一'],
 '043':['抽1張','登場抽一、強制棄一，ACTIVE Life'],
 '045':['無印刷角色能力','無內文效果，GET Life'],
 '052':['Impact無效','純 IMPACT 無效，ACTIVE Life'],
 '055':['無印刷角色能力','無內文效果，GET Life'],
 '066':['無印刷角色能力','無內文效果，DRAW Life'],
 '068':['另一己方能源需求1以下','強制回手其他低費己方角色，沒有則回自身'],
 '076':['BP3000以下','綠事件有水篠旬才把退場 BP3000 改為 BP5000；Life SPECIAL 無條件'],
 '078':['最多2張己方AP','事件至多回復二 AP，Life FINAL'],
 '079':['最多2張己方AP','事件至多回復二 AP，Life FINAL']
});
export default Object.freeze({
 title:'solo-leveling',
 version:'v2-c-slg-20261015',
 entries:Object.freeze(verifiedSlgV2Cards().map(def=>{
  const record=records[def.id],suffix=def.id.slice(-3),review=proof[suffix];
  if(!record||!review||!record.effect.includes(review[0]))
   throw Error('SLG missing verified body evidence: '+def.id);
  // The printed BP dash is a null source-catalogue field; V2 events/fields
  // have no battle BP and encode that same non-BP property as numeric 0.
  // Never coerce CHARACTER printed BP here.
  const normalized=record.bp==null&&record.type!=='character'?{...record,bp:0}:record;
  return Object.freeze({
   id:def.id,sourceRecord:normalized,definition:def,
   evidence:{printedTextFragments:[review[0]],
    reviewNote:review[1]+'；日文公式卡文來源 '+record.source+
     '；原始 source BP = '+String(record.bp),
    testFiles:['tests/universal-v2-slg-port.test.mjs'],
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})}
  });
 }))
});
