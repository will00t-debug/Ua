// [V2-C] Workstream-owned TTG title contribution, NOT a standalone match reducer.
import {TTG_BY_ID} from '../../ttg-builder.mjs';
import {verifiedTtgV2Additions} from '../ttg-pack.mjs';
const proof=Object.freeze({
 'TTG-1-028':['下次己方回合開始不能攻擊',
 'Official UA56BT/TTG-1-028, GREEN 4/AP1/BP4000/gen1, Raid on Simon or Viral, green Gunmen/Great Gurren dual traits, RAID Life. OnPlay draws one, and only during OWN turn chooses up to one opponent FRONT character: that physical field incarnation cannot attack until the controller next own START. Reuses shared cannotAttack status with stamped target, bounded expiration, owner-scoped optional target, and source-independent earned status. Verified by tests/v2-r32-ttg028-official.test.mjs, not all-title FAQ certification.'],
 'TTG-1-006':['自己的能源達 6 以上時','UA56BT/TTG-1-006 キタン, green energy 2/AP1/BP3000/gen1, no Life; on own turn while OWN generated ENERGY is >=6 its BP is +1000 continuously. Full printed source is user-supplied 2026-10-13 TTG card-front PDF provenance and preserved exact identity, trait, effect text & official card detail URL '+TTG_BY_ID['TTG-1-006'].source+'. Does NOT include hand, front-line, or opponent generated energy. Dynamic ACTIVE-to-REST sources recalculate without snapshots. Not comprehensive official FAQ certification.'],
 'TTG-1-005':['IMPACT 無效','日本版 IMPACT null / DRAW。普通對局與生命分開測；無條件牌面特性。'],
 'TTG-1-014':['需求能源1以下','官方登場強制回手另一張符合條件的己方角色，無對象時自回手；來源 Q&A 與遊戲核心守恆測試。'],
 'TTG-1-019':['ACTIVE','日本印刷 ACTIVE 時綠色額外能源 1；REST 即無加成。'],
 'TTG-1-010':['牌庫頂查看3張','UA56BT/TTG-1-010：登場查看自己牌頂3張，最多公開大グレン団 1 張入手，其餘任意順序置底；只有拿牌後才強制棄 1 張。Life DRAW 獨立。'],
 'TTG-1-023':['牌庫頂5張','UA56BT/TTG-1-023：登場查看自己牌頂5張，最多公開ガンメン 1 張入手，其餘任意順序置底；只有拿牌後才強制棄 1 張。生命無 Trigger。'],
 'TTG-1-018':['主要階段結束時退場。','Official UA56BT/TTG-1-018 ブータ GREEN0/AP1/BP1000/gen1/no life; printed MAIN once per turn REST self, this turn green energy generation +1, forced real retirement at end MAIN. Green variant shares EXACT native delayed V2 operation with TTG-1-063 RED, SLG-1-042 GREEN, BLEACH multi-colors, MST blue. Source literal sourceRecord and real physical test tests/v2-ttg-018-green-energy.test.mjs; full official FAQ not certified.'],
 'TTG-1-063':['主要階段結束時讓此角色退場','UA56BT/TTG-1-063 ブータ: red 0/AP1/BP1000/gen1, trait 大グレン団, no Life. Printed card-front PDF 2026-10-13: MAIN once per turn physical REST self in own energy line, generated red +1 for current turn only, and true retirement at the end of MAIN. Independently reuses the SLG-1-013 / MST-1-016 native delayed RETIRE profile. No AP cost, no wrong-owner operation, no stale scheduled retirement after field exit/re-entry. Source-provenance card-front only, not full official FAQ acceptance.'],
  'TTG-1-053':['主要階段：REST自己，牌庫頂1張送場外。','UA56BT/TTG-1-053 official: active MAIN, own character REST cost before own deck top one outside. No extra AP or printed once-per-turn limit; ACTIVE Life independent.'],
 'TTG-1-077':['ガンメン特徵','2026-10-15 日本官方：赤4/AP1/フィールド/赤赤，登場時「自分の場外から［特徴：ガンメン］を1枚まで手札に加える」。optional 0..1；僅自家場外，不搜 deck 或敵區。UA56BT 現有四張ガンメン印刷 source 的 traits 皆精確為複合「大グレン団／ガンメン」，為共用 filter 拆分僅此單卡的已驗證斜線複合來源成兩個特徵字串（ガンメン），原始 sourceRecord 不變且有來源漂移保護。無生命 Trigger。'],
 'TTG-1-022':['返回手牌','Official UA56BT/TTG-1-022 ヨマコ先生, checked 2026-10-22: green cost 1, AP1, BP1500, trait 大グレン団, generated 緑+ (one green pip, gen 1), DRAW. Printed alias 〈ヨーコ〉. Activate MAIN, REST self, once per turn: this turn generated energy +green and, at end of MAIN, return this character to hand. The return reuses bounceToHand and is not retirement. No card FAQ.'],
 'TTG-1-015':['支付1 AP','Official UA56BT/TTG-1-015 ニア, checked 2026-10-22: cost 緑- (energy 0), AP1, BP500, trait 大グレン団, generated 緑+ (one green pip, gen 1), DRAW. Activate MAIN pays 1 AP, once per turn: draw 1 and this character gains generated energy +1 this turn. The payment does not rest the source. A front character still generates 0. No card FAQ.'],
 'TTG-1-002':['產生的綠色能源+1','Official UA56BT/TTG-1-002 ヴィラル, checked 2026-10-22: cost 緑1, AP1, BP1500, trait 大グレン団, generated 緑+ (one green pip, gen 1), ACTIVE life. Activate MAIN rests this card, once per turn, then rests one other ACTIVE own front character. Only that success gives generated energy +green this turn. Same resolved profile as MST-1-056. A front character still generates 0. No card FAQ.'],
 'TTG-1-007':['場上有達莉時 BP+1000','Official UA56BT/TTG-1-007 ギミー, checked 2026-10-22: cost 緑- (energy 0), AP1, BP1500+, trait 大グレン団, generated 緑 (gen 1), ACTIVE life. While 〈ダリー〉 is on this card\'s own field, BP+1000 on either turn. On play from hand, the controller may pay 1 AP and then REST-play up to one outside 〈ダリー〉 whose required energy that color currently meets. Life and effect entries do not offer the payment. No card FAQ.'],
 'TTG-1-013':['場上有吉米時 BP+1000','Official UA56BT/TTG-1-013 ダリー, checked 2026-10-22: cost 緑- (energy 0), AP1, BP1500+, trait 大グレン団, generated 緑 (gen 1), DRAW life. While 〈ギミー〉 is on this card\'s own field, BP+1000 on either turn. On play from hand, the controller may pay 1 AP and then REST-play up to one outside 〈ギミー〉 whose required energy that color currently meets. No card FAQ.']
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
      ...(def.id==='TTG-1-028'?['tests/v2-r32-ttg028-official.test.mjs']:[]),
      ...(def.id==='TTG-1-053'?['tests/v2-ttg-053-rest-mill.test.mjs']:[]),
      ...(def.id==='TTG-1-006'?['tests/v2-ttg-006-live-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-063'?['tests/v2-ttg-063-energy-retire.test.mjs']:[]),
      ...(def.id==='TTG-1-018'?['tests/v2-ttg-018-green-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-022'?['tests/v2-ttg-022-return-hand.test.mjs']:[]),
      ...(def.id==='TTG-1-015'?['tests/v2-ttg-015-pay-ap.test.mjs']:[]),
      ...(def.id==='TTG-1-002'?['tests/v2-ttg-002-rest-front-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-007'||def.id==='TTG-1-013'?['tests/v2-ttg-partner-ap-deploy-round18.test.mjs']:[])]}
  });
 }))
});
