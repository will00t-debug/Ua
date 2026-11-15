// Japanese-print evidence for a batch of common-engine RNK B/C/D programs.
// The display-facing Traditional Chinese catalog stays unchanged.
// Verbatim card-effect and trigger text are recorded only where checked against
// Japanese printed-card transcriptions, NOT inferred from zh-TW summaries.
const AP_EFFECT='自分のAPカードを2枚まで選び、アクティブにする。';
const FINAL='ファイナル自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。';
const GET='ゲットこのカードを手札に加える。';
const record=(id,nameJa,effectJa,triggerJa,sourceJa)=>Object.freeze({
  print:'UA41BT/'+id,nameJa,effectJa,triggerJa,sourceJa,
  sourceType:'Japanese printed-card transcription'
});
export const RNK_JP_EVIDENCE_COMMON_BCD=Object.freeze({
 'RNK-1-055':record('RNK-1-055','瀬田 宗次郎','-',GET,
   'https://www.torekaoh.shop-pro.jp/?pid=187659283'),
 'RNK-1-063':record('RNK-1-063','悪・即・斬',AP_EFFECT,FINAL,
   'https://www.torekaoh.shop-pro.jp/?pid=187659292'),
 'RNK-1-065':record('RNK-1-065','国盗り開始だ',AP_EFFECT,FINAL,
   'https://www.torekaoh.shop-pro.jp/?pid=187659294'),
 'RNK-1-073':record('RNK-1-073','相楽 左之助','-',GET,
   'https://www.torekaoh.shop-pro.jp/?pid=187659303'),
 'RNK-1-096':record('RNK-1-096','不殺の誓い',AP_EFFECT,FINAL,
   'https://www.torekaoh.shop-pro.jp/?pid=187659344'),
 'RNK-1-097':record('RNK-1-097','絶対に負けられねェ！！！',AP_EFFECT,FINAL,
   'https://www.torekaoh.shop-pro.jp/?pid=187659332')
});
