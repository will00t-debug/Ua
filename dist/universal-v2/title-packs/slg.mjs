// [V2-C] Workstream-owned SLG contribution. Legacy solo match engine is never used.
import {SOLO_LEVELING_CARDS} from '../../solo-leveling.mjs';
import {verifiedSlgV2Cards} from '../slg-pack.mjs';
const records=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const proof=Object.freeze({
 '002':['登場時選一項：抽1張後將1張手牌送場外','UA51BT/SLG-1-002 printed: purple0/AP1/BP500/gen1, DRAW life; onPlay choose exactly ONE: draw1 then mandatory discard1; OR own turn select up to one OTHER own field character for current-turn BP+1000. Official Japanese source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-002. Not full FAQ certified.'],
 '001':['自己的回合中，若場外至少5張卡','Official UA51BT/SLG-1-001: own turn and own outside >=5 yields persistent BP+500; no life trigger.'],
 '010':['自己的回合中，若場外有10張以上','Official UA51BT/SLG-1-010: own turn and own outside >=10 yields persistent BP+1000; separate DRAW life trigger.'],
 '005':['無印刷角色能力','無印刷內文，DRAW Life'],
 '006':['ACTIVE','只有 ACTIVE 時紫額外能源一'],
 '012':['己方場上存在水篠旬','Official UA51BT/SLG-1-012: purple 3 AP1 BP2500 gen2; onPlay draw exactly one iff own front or energy line contains a character named 水篠 旬, never hand/opponent field, no life Trigger.'],
 '015':['無印刷角色能力','無內文效果，GET Life'],
 '016':['牌庫頂2張','登場強制送二卡場外，IMPACT 無效'],
 '018':['牌庫頂3張','Official UA51BT/SLG-1-018: purple3/AP1/BP2500/gen2; onPlay inspect TOP3, reveal 0..1 name 水篠 旬 OR trait 影の軍団, bottom order the rest, then discard one only on successful hand addition. The imported source labels the printed 影の軍団 trait in Traditional Chinese as 影之軍團 (explicit source-to-filter translation, no source mutation). Independent COLOR life: own OUTSIDE purple CHARACTER energy<=2 and AP1 to ACTIVE front with no AP cost.'],
 '026':['登場時讓另一己方','強制回手其他己方低費角色，否則自身回手'],
 '032':['IMPACT無效','純 IMPACT 無效，ACTIVE Life'],
 '036':['抽3張後將2張手牌送場外','官方 UA51BT/SLG-1-036：抽三張，然後強制送兩張己方手牌場外；ACTIVE Life 獨立處理'],
 '037':['原本BP4000以下的角色','UA51BT/SLG-1-037 optional own-outside printed character BP<=4000, then unconditional draw one. Official Q2039 (2026-04-17): original BP is bottom-left PRINTED number; no buffs. Life DRAW is separate.'],
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
    testFiles:['tests/universal-v2-slg-port.test.mjs',
     ...(def.id==='SLG-1-002'?['tests/v2-choice-mode-slg002.test.mjs']:[]),
     ...(def.id==='SLG-1-012'?['tests/v2-slg-012-own-name.test.mjs']:[]),
     ...(def.id==='SLG-1-018'?['tests/v2-slg-018-compound-top.test.mjs']:[]),
     ...(def.id==='SLG-1-037'?['tests/v2-slg-037-original-bp.test.mjs']:[])],
    ...(def.implementation==='vanilla'?{verifiedNoExtraEffects:true}:{})}
  });
 }))
});
