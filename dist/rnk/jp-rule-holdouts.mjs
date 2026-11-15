// Explicit human-review lock for RNK printed-effect discrepancies.
// No Traditional Chinese card display fields are edited by this ledger.
// Some TC synopsis rows were source-captured before all Japanese clauses
// were available; never compile V2 programs from such shorthand.
export const RNK_JP_RULE_HOLDOUTS=Object.freeze({
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
