// Explicit human-review lock for RNK printed-effect discrepancies.
// No Traditional Chinese card display fields are edited by this ledger.
// Some TC synopsis rows were source-captured before all Japanese clauses
// were available; never compile V2 programs from such shorthand.
export const RNK_JP_RULE_HOLDOUTS=Object.freeze({
 'RNK-1-075':Object.freeze({
  print:'UA41BT/RNK-1-075',
  nameJa:'相楽 左之助',
  status:'MANDATORY_UNBLOCKED_DRAW_TIMING',
  sourceSummaryMismatch:false,
  effectJa:'このキャラがアタックしてブロックされなかった時、カードを1枚引く。',
  officialFaq:'Q1610',
  officialFaqTiming:'After blocker-selection decision, before damage or trigger checking',
  officialFaqUrl:'https://www.unionarena-tcg.com/jp/faq/list.php?series=UA41BT',
  japaneseCardUrl:'https://www.torekaoh.shop-pro.jp/?pid=187659305',
  needsUniversalSupport:Object.freeze([
    'mandatory draw one for every unblocked attack, not optional',
    'no invented once-per-turn limit',
    'resolve at block declaration timing, independent of damage trigger'
  ]),
  battleReady:false
 }),
 'RNK-1-062':Object.freeze({
  print:'UA41BT/RNK-1-062',
  nameJa:'大型甲鉄艦 煉獄',
  status:'JAPANESE_PRINT_CONFLICT',
  sourceSummaryMismatch:true,
  clauses:Object.freeze([
   'onPlay: grant up to one own Makoto Shishio unblocked-attack optional draw up to one until turn end',
   'main: rest this FIELD to retire it',
   'onRetire: draw two cards',
   'GET trigger remains printed'
  ]),
  officialFaq:'Q1607',
  officialFaqTiming:'After block/no-block is declared, at the same timing as onBlock effects',
  officialFaqUrl:'https://www.unionarena-tcg.com/jp/faq/list.php?series=UA41BT',
  crosscheckUrl:'https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-062',
  needsUniversalSupport:Object.freeze([
    'grant time-limited unblocked-attack optional draw to named own character',
    'field REST as the cost to retire self',
    'onRetire two-card draw resolved after its main cost'
  ]),
  battleReady:false
 })
});
