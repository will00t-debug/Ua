// Checked against Japanese printed-card transcription (UA41ST) and official EN/TC.
// This evidence is rules-only. Never overwrite the existing Traditional Chinese UI.
export const RNK_JP_EVIDENCE_ST_109=Object.freeze({
 'RNK-1-109':Object.freeze({
  print:'UA41ST/RNK-1-109',nameJa:'逆刃刀',
  effectJa:'カードを1枚引く。自分の場の〈緋村 剣心〉を1枚まで選び、このターン中、「アタック時カードを1枚引く。」を与える。',
  triggerJa:'ドローカードを1枚引く。',
  sourceJa:'https://www.merucarduniari.jp/product/13001',
  officialEnglish:'https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-109',
  sourceType:'Japanese print retailer transcription + official EN/TC agreement',
  clauses:Object.freeze([
   'mandatory initial draw exactly one',
   'optional up to one own Kenshin, not self',
   'granted when-attacking draw one until end of turn',
   'DRAW trigger'
  ])
 })
});
