// Concise Japanese rule transcriptions, checked against Japanese print listings.
// These are runtime rule inputs; do not replace zh-TW display strings.
const jp=(id,set,nameJa,effectJa,triggerJa,sourceJa)=>Object.freeze({
 print:set+'/'+id,nameJa,effectJa,triggerJa,sourceJa,
 sourceType:'Japanese printed-card effect and trigger crosscheck'
});
export const RNK_JP_EVIDENCE_BCD_NEXT4=Object.freeze({
 'RNK-1-049':jp('RNK-1-049','UA41BT','三島 栄次',
  '〖起動メイン〗〖レスト〗〖ターン1〗このターン中、発生エナジー+紫、メインフェイズ終了時に退場する。',
  '-','https://www.merucarduniari.jp/product/12927'),
 'RNK-1-057':jp('RNK-1-057','UA41BT','瀬田 宗次郎',
  '〖登場時〗山札の上から3枚見る。〈志々雄 真実〉か〈駒形 由美〉か［十本刀］を1枚まで公開し手札に加える。残りを望む順で下に置く。加えた場合、自分の手札を1枚場外に置く。',
  'アクティブ：自分の場のキャラを1枚アクティブにし、このターン中BP+3000。',
  'https://www.merucarduniari.jp/product/12935'),
 'RNK-1-083':jp('RNK-1-083','UA41BT','塚山 由太郎',
  '〖起動メイン〗〖レスト〗〖ターン1〗このターン中、発生エナジー+赤、メインフェイズ終了時に退場する。',
  '-','https://www.merucarduniari.jp/product/12961'),
 'RNK-1-108':jp('RNK-1-108','UA41ST','神谷道場',
  '〖起動メイン〗〖レスト〗カードを1枚引き、自分の手札を1枚場外に置く。',
  'ゲット：このカードを手札に加える。',
  'https://www.merucarduniari.jp/product/13000')
});
