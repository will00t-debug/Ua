// Original Japanese printed rule clauses verified against Japanese card scans.
// UI remains zh-TW and actual behavior always passes through Universal V2.
const rec=(id,set,nameJa,effectJa,triggerJa,sourceJa)=>Object.freeze({
 print:set+'/'+id,nameJa,effectJa,triggerJa,sourceJa,
 sourceType:'Japanese card text transcription'
});
export const RNK_JP_EVIDENCE_SIMPLE_NEXT=Object.freeze({
 'RNK-1-046':rec('RNK-1-046','UA41BT','緋村 剣心',
  '起動メイン 手札を1枚場外に置く ターン1 このキャラはこのターン中BP+1000。',
  'アクティブ 自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  'https://www.torekaoh.shop-pro.jp/?pid=187659273'),
 'RNK-1-064':rec('RNK-1-064','UA41BT','牙突',
  'BP3000以下の相手のフロントLのキャラを1枚選び、退場させる。自分の場に〈斎藤 一〉がある場合、BP5000以下に代わる。',
  'スペシャル 相手のフロントLのキャラを1枚選び、退場させる。',
  'https://www.torekaoh.shop-pro.jp/?pid=187659293'),
 'RNK-1-092':rec('RNK-1-092','UA41BT','明神 弥彦',
  '自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを赤×2減らす。ステップ（自分の移動フェイズにフロントLからエナジーLへ移動できる）',
  'アクティブ 自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  'https://www.torekaoh.shop-pro.jp/?pid=187659326'),
 'RNK-1-104':rec('RNK-1-104','UA41ST','関原 妙＆三条 燕',
  '登場時自分の山札の上から1枚見る。そのカードを山札の上か下に置く。',
  'アクティブ 自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  'https://www.torekaoh.shop-pro.jp/?pid=187659349')
});
