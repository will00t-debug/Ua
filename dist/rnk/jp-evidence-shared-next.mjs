// Japanese print transcriptions for the next shared-engine RNK batch.
// Display Traditional Chinese is not edited from these strings.
const record=(print,nameJa,effectJa,triggerJa,productNo,officialEnglish)=>Object.freeze({
 print,nameJa,effectJa,triggerJa,
 sourceJa:'https://www.merucarduniari.jp/product/'+productNo,
 officialEnglish,
 sourceType:'Japanese print retailer transcription + official EN agreement'
});
export const RNK_JP_EVIDENCE_SHARED_NEXT=Object.freeze({
 'RNK-1-037':record(
  'UA41BT/RNK-1-037','斎藤 一',
  '登場時自分の場の〔〈緋村 剣心〉か〈斎藤 一〉か〈相楽 左之助〉〕を1枚まで選び、別のラインに移動させる。',
  'アクティブ自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  12915,
  'https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-037'),
 'RNK-1-095':record(
  'UA41BT/RNK-1-095','悪一文字',
  '自分の場の〈相楽 左之助〉を1枚まで選び、このターン中、BP+1500とインパクト（1）（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を与え、カードを1枚引く。',
  'ドローカードを1枚引く。',
  12973,
  'https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41BT%2FRNK-1-095'),
 'RNK-1-112':record(
  'UA41ST/RNK-1-112','志々雄 真実',
  '登場時自分の手札を1枚自分の山札の上に置く。',
  'ドローカードを1枚引く。',
  13004,
  'https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-112'),
 'RNK-1-113':record(
  'UA41ST/RNK-1-113','斎藤 一',
  'アタック時カードを1枚引いてもよい。そうした場合、このキャラは、次の1回アクティブにならない。',
  'ドローカードを1枚引く。',
  13005,
  'https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-113')
});
