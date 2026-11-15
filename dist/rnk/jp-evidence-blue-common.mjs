// Audited Japanese-print rules summaries, with original JP merchant URLs.
// Stats/traits are cross-checked against official English/Taiwan card records:
// merchandise metadata may be wrong (e.g. merchant RNK-1-003 BP 2000;
// official UA41BT/RNK-1-003 and source catalog correctly print BP 1000).
// These strings are NOT the display copy. Preserve zh-TW verbatim.
const record=(num,nameJa,effectJa,triggerJa,productNo)=>Object.freeze({
  print:'UA41BT/RNK-1-'+num,nameJa,effectJa,triggerJa,
  sourceJa:'https://www.merucarduniari.jp/product/'+productNo,
  sourceType:'JP effect and trigger transcription; official EN/TC print for stats'
});
export const RNK_JP_EVIDENCE_BLUE_COMMON=Object.freeze({
 'RNK-1-001':record("001","新井 青空","登場時：山札上7枚から逆刃刀・真打を1枚まで手札に加え、残りを好きな順で山札の下に置く。","ドロー",12879),
 'RNK-1-002':record("002","心太","このカードを緋村 剣心としても扱う。","アクティブ",12880),
 'RNK-1-016':record("016","四乃森 蒼紫","登場時：自分のキャラ・イベントカードの効果で登場していた場合、カードを1枚引く。","カラー",12894),
 'RNK-1-025':record("025","巻町 操","自分の場にカードが無ければ手札で必要エナジー青2減。登場時：山札上3枚から1枚まで場外に置き、残りを好きな順で山札上に戻す。","ドロー",12903),
 'RNK-1-003':record("003","高荷 恵","起動メイン：このキャラをレストにし、このターン中発生エナジーを青1増やす。メインフェイズ終了時に自身が退場する。","-",12881),
 'RNK-1-004':record("004","高荷 恵","登場時：必要エナジー1以下の他の自分の場のキャラを1枚手札に戻す。戻せなければ自身を戻す。","-",12882),
 'RNK-1-006':record("006","比古 清十郎","登場時：自分の場の緋村 剣心を1枚まで選び、ターン中BP+1000。","ドロー",12884),
 'RNK-1-009':record("009","緋村 剣心","インパクト無効。登場時：山札上2枚を見て、望む枚数を望む順に山札上、残りは場外に置く。","-",12887),
 'RNK-1-012':record("012","柏崎 念至","相手の場に紫か赤のカードがあれば、手札のこのカードの必要エナジーを青1減らす。","-",12890),
 'RNK-1-014':record("014","四乃森 蒼紫","登場時：1枚引き、手札を1枚場外に置く。","アクティブ",12892),
 'RNK-1-015':record("015","四乃森 蒼紫","自分のターン中、このキャラはBP+1000。","-",12893),
 'RNK-1-020':record("020","火男","退場時：自分の場に四乃森 蒼紫がある場合、カードを1枚引く。","-",12898),
 'RNK-1-021':record("021","癋見","登場時：山札上3枚から高荷 恵か御庭番衆のカードを1枚まで手札に加え、残りは山札下。加えた場合手札を1枚場外に置く。","ドロー",12899),
 'RNK-1-022':record("022","巻町 操","インパクト無効。","ドロー",12900),
 'RNK-1-023':record("023","巻町 操","アクティブの場合、発生エナジーが青1増える。","-",12901),
 'RNK-1-027':record("027","生きようとする意志","自分のAPカードを2枚までアクティブにする。","ファイナル",12905)
});
