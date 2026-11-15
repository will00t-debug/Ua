// Four additional cards whose Japanese original rules are fully expressible
// with pre-existing Universal V2 passive/keyword profiles.
const jp=(id,nameJa,effectJa,triggerJa,sourceJa,set='UA41BT')=>Object.freeze({
 print:set+'/'+id,nameJa,effectJa,triggerJa,sourceJa,
 sourceType:'Japanese printed-card rule summary'
});
export const RNK_JP_EVIDENCE_PASSIVE_BCD=Object.freeze({
 'RNK-1-051':jp('RNK-1-051','刈羽 蝙也',
  '相手の場に青か赤があれば、手札にあるこのカードの必要エナジーを紫×1減らす。',
  '-','https://www.merucarduniari.jp/product/12929'),
 'RNK-1-061':jp('RNK-1-061','悠久山 安慈',
  'インパクト無効（このキャラとバトルした相手はインパクトを失う）。',
  'アクティブ','https://www.merucarduniari.jp/product/12939'),
 'RNK-1-079':jp('RNK-1-079','関原 妙',
  '相手の場に青か紫があれば、手札にあるこのカードの必要エナジーを赤×1減らす。',
  '-','https://www.merucarduniari.jp/product/12957'),
 'RNK-1-107':jp('RNK-1-107','明神 弥彦',
  'インパクト無効（このキャラとバトルした相手はインパクトを失う）。',
  '-','https://www.merucarduniari.jp/product/12999','UA41ST')
});
