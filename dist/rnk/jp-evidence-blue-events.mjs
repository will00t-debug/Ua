// Japanese printed-card transcription verified against Japanese retailer text.
// The existing Traditional Chinese UI text is deliberately untouched.
const record=(id,nameJa,effectJa,triggerJa,url)=>Object.freeze({
 print:'UA41BT/'+id,nameJa,effectJa,triggerJa,sourceJa:url,
 sourceType:'Japanese full printed effect and trigger'
});
export const RNK_JP_EVIDENCE_BLUE_EVENTS=Object.freeze({
 'RNK-1-030':record('RNK-1-030','九頭龍閃',
  '「BP3000以下」の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈比古 清十郎〉がある場合、「BP5000以下」に代わり、自分の場の〈緋村 剣心〉を1枚まで選び、このターン中、BP+1000。',
  'スペシャル：相手のフロントLのキャラを1枚選び、退場させる。',
  'https://www.merucarduniari.jp/product/12908'),
 'RNK-1-032':record('RNK-1-032','逆刃刀・真打',
  '自分の場の〈緋村 剣心〉を1枚選び、このターン中、BP+2000。自分のAPカードを1枚まで選び、アクティブにする。',
  'ドロー：カードを1枚引く。',
  'https://www.merucarduniari.jp/product/12910')
});
