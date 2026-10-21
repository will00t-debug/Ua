// [V2-C] Workstream-owned TTG title contribution, NOT a standalone match reducer.
import {TTG_BY_ID} from '../../ttg-builder.mjs';
import {verifiedTtgV2Additions} from '../ttg-pack.mjs';
const proof=Object.freeze({
 'TTG-1-006':['自己的能源達 6 以上時','UA56BT/TTG-1-006 キタン, green energy 2/AP1/BP3000/gen1, no Life; on own turn while OWN generated ENERGY is >=6 its BP is +1000 continuously. Full printed source is user-supplied 2026-10-13 TTG card-front PDF provenance and preserved exact identity, trait, effect text & official card detail URL '+TTG_BY_ID['TTG-1-006'].source+'. Does NOT include hand, front-line, or opponent generated energy. Dynamic ACTIVE-to-REST sources recalculate without snapshots. Not comprehensive official FAQ certification.'],
 'TTG-1-005':['IMPACT 無效','日本版 IMPACT null / DRAW。普通對局與生命分開測；無條件牌面特性。'],
 'TTG-1-014':['需求能源1以下','官方登場強制回手另一張符合條件的己方角色，無對象時自回手；來源 Q&A 與遊戲核心守恆測試。'],
 'TTG-1-019':['ACTIVE','日本印刷 ACTIVE 時綠色額外能源 1；REST 即無加成。'],
 'TTG-1-010':['牌庫頂查看3張','UA56BT/TTG-1-010：登場查看自己牌頂3張，最多公開大グレン団 1 張入手，其餘任意順序置底；只有拿牌後才強制棄 1 張。Life DRAW 獨立。'],
 'TTG-1-023':['牌庫頂5張','UA56BT/TTG-1-023：登場查看自己牌頂5張，最多公開ガンメン 1 張入手，其餘任意順序置底；只有拿牌後才強制棄 1 張。生命無 Trigger。'],
 'TTG-1-063':['主要階段結束時讓此角色退場','UA56BT/TTG-1-063 ブータ: red 0/AP1/BP1000/gen1, trait 大グレン団, no Life. Printed card-front PDF 2026-10-13: MAIN once per turn physical REST self in own energy line, generated red +1 for current turn only, and true retirement at the end of MAIN. Independently reuses the SLG-1-013 / MST-1-016 native delayed RETIRE profile. No AP cost, no wrong-owner operation, no stale scheduled retirement after field exit/re-entry. Source-provenance card-front only, not full official FAQ acceptance.'],
  'TTG-1-053':['主要階段：REST自己，牌庫頂1張送場外。','UA56BT/TTG-1-053 official: active MAIN, own character REST cost before own deck top one outside. No extra AP or printed once-per-turn limit; ACTIVE Life independent.'],
 'TTG-1-077':['ガンメン特徵','2026-10-15 日本官方：赤4/AP1/フィールド/赤赤，登場時「自分の場外から［特徴：ガンメン］を1枚まで手札に加える」。optional 0..1；僅自家場外，不搜 deck 或敵區。UA56BT 現有四張ガンメン印刷 source 的 traits 皆精確為複合「大グレン団／ガンメン」，為共用 filter 拆分僅此單卡的已驗證斜線複合來源成兩個特徵字串（ガンメン），原始 sourceRecord 不變且有來源漂移保護。無生命 Trigger。']
});
export default Object.freeze({
 title:'gurren-lagann',
 version:'v2-c-ttg-20261021-batch3',
 entries:Object.freeze(verifiedTtgV2Additions().map(def=>{
  const record=TTG_BY_ID[def.id],review=proof[def.id];
  if(!record||!review)throw Error('TTG independent V2 evidence missing: '+def.id);
  return Object.freeze({
   id:def.id,sourceRecord:record,definition:def,
   evidence:{printedTextFragments:[review[0]],reviewNote:review[1]+
    ' 日文來源：'+record.source,
    testFiles:['tests/universal-v2-ttg-port.test.mjs',...(def.id==='TTG-1-010'||def.id==='TTG-1-023'?['tests/v2-ttg-top-filtered.test.mjs']:[]),
      ...(def.id==='TTG-1-053'?['tests/v2-ttg-053-rest-mill.test.mjs']:[]),
      ...(def.id==='TTG-1-006'?['tests/v2-ttg-006-live-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-063'?['tests/v2-ttg-063-energy-retire.test.mjs']:[])]}
  });
 }))
});
