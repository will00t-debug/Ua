// [V2-C] Workstream-owned TTG title contribution, NOT a standalone match reducer.
import {TTG_BY_ID} from '../../ttg-builder.mjs';
import {verifiedTtgV2Additions} from '../ttg-pack.mjs';
const proof=Object.freeze({
 'TTG-1-020':['手牌本卡需求能源減2',
 'Official JP/EN UA56BT/TTG-1-020 ヨーコ GREEN2 AP1 BP2500/gen1 大グレン団 ACTIVE LIFE. While this card is in OWN HAND, if OWN FRONT and ENERGY are completely empty, its green required energy is reduced by 2 (not its AP), with normal printed STEP from FRONT to ENERGY during own movement phase. Source https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-020; Q&A searched, no card-specific exception verified. Full 50-card positive/negative tests tests/v2-r57-ttg020-official.test.mjs; does not certify all general FAQ.'],
 'TTG-1-067':['狙擊',
 'Official [UA56BT/TTG-1-067] Yoko red energy4 AP2 BP3500 gen red1 Great Gurren trait, enters ACTIVE regardless paid entry; current BP>=4000 cannot block; onPlay this-turn earned SNIPER targeted FRONT combat and attacker real battle victory draws exactly one (including equality per Q2295 and Q65-Q70), never direct LIFE. ACTIVE LIFE choose own character ACTIVE BP3000 current turn. Physical UID and field incarnation stamped; legal 50-card TTG real deck and distinct normal/sniper/ACTIVE LIFE positive+negative checks in tests/v2-r55-ttg067-full-print.test.mjs. Individual official rule audit, not 700-card FAQ certification.'],
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
 'TTG-1-013':['場上有吉米時 BP+1000','Official UA56BT/TTG-1-013 ダリー, checked 2026-10-22: cost 緑- (energy 0), AP1, BP1500+, trait 大グレン団, generated 緑 (gen 1), DRAW life. While 〈ギミー〉 is on this card\'s own field, BP+1000 on either turn. On play from hand, the controller may pay 1 AP and then REST-play up to one outside 〈ギミー〉 whose required energy that color currently meets. No card FAQ.'],
 'TTG-1-057':['給予 IMPACT 無效','UA56BT/TTG-1-057 ダヤッカ red3/AP1/BP3000/gen2/no life, trait 大グレン団. Printed IMPACT null suppresses the attacker impact when this card is the blocker. On play, choose up to one other own character and grant IMPACT null until the next start of this controller turn. The grant is stamped to that field entry and survives silence; leaving the field clears it. Scenario tests in tests/v2-ttg-six-batches.test.mjs. Not full official FAQ certification.'],
 'TTG-1-071':['第一次攻擊','UA56BT/TTG-1-071 キングキタンDX red4/AP1/BP4000/gen1/RAID on キタン, traits 大グレン団 and ガンメン. Paid Raid enters ACTIVE by the shared Raid rule, not enterAlwaysActive. Printed IMPACT null. On the first own-character attack this turn, choose up to one other own character and give BP+2000 this turn. A later attack the same turn does not offer the buff. Not full official FAQ certification.'],
 'TTG-1-054':['牌庫20張以下','UA56BT/TTG-1-054 シモン red2/AP1/BP2500/gen1/no life. While an own field character is named ニア and the own deck has 20 or fewer cards, during this controller turn BP+1500 and IMPACT null. On play, may mill the top card. Own-turn impact null is not observable as a defender in the normal attack window; the shared suppressor is tested through TTG-1-057. Not full official FAQ certification.'],
 'TTG-1-055':['至多2張送場外','UA56BT/TTG-1-055 シモン red1/AP1/BP2000/gen1/no life. On play, mill up to 2 top cards. Then may discard 1 hand card; if a card was discarded, add up to 1 of those milled cards from outside back to hand. Stop, empty deck, and empty hand end the chain. Not full official FAQ certification.'],
 'TTG-1-026':['アークグレン','UA56BT/TTG-1-026 ロシウ green2/AP1/BP2000/gen1/DRAW. On play choose one: look at the top 7, add up to one card named アークグレン, order the rest to the bottom; or add up to one アークグレン from outside. No registered card is named アークグレン, so the top mode orders every inspected card to the bottom and the outside mode adds nothing. TTG-1-033 remains unregistered. DRAW life is the shared handler. Not full official FAQ certification.'],
 'TTG-1-081':['BP5000以下','UA56BT/TTG-1-081 ギガドリルブレイク red4/AP1 event/gen0/SPECIAL. Retire one opponent front character of BP 3000 or less, or 5000 or less when an own field character or that character raid base (stack[0]) is named シモン or カミナ. Q1119 blocks the play when no payable target exists. SPECIAL life remains the shared retireOppFront handler and is not a BP-limited reprint of the event. Not full official FAQ certification.']
});
export default Object.freeze({
 title:'gurren-lagann',
 version:'v2-c-ttg-20261026-batch6',
 entries:Object.freeze(verifiedTtgV2Additions().map(def=>{
  const record=TTG_BY_ID[def.id],review=proof[def.id];
  if(!record||!review)throw Error('TTG independent V2 evidence missing: '+def.id);
  return Object.freeze({
   id:def.id,sourceRecord:record,definition:def,
   evidence:{printedTextFragments:[review[0]],reviewNote:review[1]+
    ' 日文來源：'+record.source,
    testFiles:['tests/universal-v2-ttg-port.test.mjs',
     ...(def.id==='TTG-1-020'?['tests/v2-r57-ttg020-official.test.mjs']:[]),
     ...(def.id==='TTG-1-067'?['tests/v2-r55-ttg067-full-print.test.mjs']:[]),...(def.id==='TTG-1-010'||def.id==='TTG-1-023'?['tests/v2-ttg-top-filtered.test.mjs']:[]),
      ...(def.id==='TTG-1-028'?['tests/v2-r32-ttg028-official.test.mjs']:[]),
      ...(def.id==='TTG-1-053'?['tests/v2-ttg-053-rest-mill.test.mjs']:[]),
      ...(def.id==='TTG-1-006'?['tests/v2-ttg-006-live-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-063'?['tests/v2-ttg-063-energy-retire.test.mjs']:[]),
      ...(def.id==='TTG-1-018'?['tests/v2-ttg-018-green-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-022'?['tests/v2-ttg-022-return-hand.test.mjs']:[]),
      ...(def.id==='TTG-1-015'?['tests/v2-ttg-015-pay-ap.test.mjs']:[]),
      ...(def.id==='TTG-1-002'?['tests/v2-ttg-002-rest-front-energy.test.mjs']:[]),
      ...(def.id==='TTG-1-007'||def.id==='TTG-1-013'?['tests/v2-ttg-partner-ap-deploy-round18.test.mjs']:[]),
      ...(['TTG-1-057','TTG-1-071','TTG-1-054','TTG-1-055','TTG-1-026','TTG-1-081'].includes(def.id)?['tests/v2-ttg-six-batches.test.mjs']:[])]}
  });
 }))
});
