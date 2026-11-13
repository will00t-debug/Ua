// C group owns this file. One object per shared-engine gap.
// cardId, sentence, existingOps, whyNotEnough, proposal.
export const IMC_REQUESTS_051_100=[
 {
  cardId:'IMC-1-068',
  sentence:'以下から1つまで選ぶ。他の自分のキャラを退場させ、そうした場合、2枚引き、手札から必要エナジー3以下・消費AP1の赤のお願いを2枚までレストで登場。9種類以上なら相手のフロントのBP5000以下を1枚まで退場。',
  existingOps:['choosePrintedOptions','optionalRetireThenProgram','ownDistinctTraitNames'],
  whyNotEnough:'choosePrintedOptions 固定是最多 2 個不同選項，而且每個選項只能是活動特徵，或回手後休息／突襲登場。068 是最多 1 個。第一句要可選退場其他自己角色，做到才抽 2 並休息登場最多 2 張。第二句要 9 種卡名（自己算，Q2244）才可退場對手前線。ownDistinctTraitNames 的 fieldOutside 已能數種類。',
  proposal:'最多選 1 句。可選退場其他自己角色後，抽 2 並從手牌休息登場最多 2 張紅、能源 3 以下、消耗 AP 1 的指定特徵。另一句在 9 種時可退場 1 張對手前線 BP5000 以下。068 先不標 ready。'
 },
 {
  cardId:'IMC-1-051',
  sentence:'自分の場外から必要エナジーが2以下の［特徴：LiPPS］を1枚まで手札に加える。起動はレストかつ退場，對手有 BP4500 以上才可，再從場外休息登場藍的 LiPPS。',
  existingOps:['recoverOutsideUnderEnergy','deployOutsideFiltered'],
  whyNotEnough:'登場時的場外回手已用 recoverOutsideFiltered：特徵 LiPPS、印刷必要能源 2 以下、最多 1 張、可以不拿。起動用 restRetireSequence：先休息再退場，對手場上目前 BP4500 以上才出現，然後 deployOutsideColorTraitRest 最多 1 張藍色 LiPPS。費用付完才選擇，可以不登場。051 的起動還沒寫進程式，ready 仍是 false。',
  proposal:'保留現有 onPlay。mainAbility 用 restRetireSequence，gate 為 oppCharacterBpAtLeast 4500，then 為藍色 LiPPS、maxEnergy 2、ready false、optional true 的 deployOutsideColorTraitRest。程式完成前不要標 ready。'
 },
 {
  cardId:'IMC-1-057',
  sentence:'手札から必要エナジーが2以下の青の［特徴：LiPPS］をレストで登場させる。アタックしてバトルに敗北した時アクティブ。BP4500以上なら引く。',
  existingOps:['deployOwnHandRest','drawIfOppCharacterBpAtLeast','attackLoseReadyTurn'],
  whyNotEnough:'deployOwnHandRest 的 ap:null 已能做沒有寫消費 AP 的手牌休息登場。drawIfOppCharacterBpAtLeast 能在對手目前 BP4500 以上時抽 1。Q2242 要求沒有登場也要抽。attackLoseReadyTurn 固定附帶 BP+1000，不是這張「自己的回合中一次，攻擊並在戰鬥中敗北時活動」。突襲框只有〈宮本 フレデリカ〉。',
  proposal:'抽牌與登場分開，敗北後一回合一次只活動、不加攻。框內只有具名突襲。057 先不標 ready。'
 },
 {
  cardId:'IMC-1-061',
  sentence:'ブロックされなかった時、カードを1枚まで引く。APをアクティブにした場合、アタックフェイズ終了時に手札へ戻す。',
  existingOps:['draw','recoverAp'],
  whyNotEnough:'未被阻擋的可選抽牌沿用 unblockedAttack。Q2243 的時機維持在阻擋指定之後。登場的活動自身用 activeSelf。可選活動 1 張 AP 用 optionalReadyApThen，做到才接 grantAttackPhaseEndHand。跳過或不存在休息的 AP 都不回手。061 的程式還沒寫，不能標 ready。',
  proposal:'unblockedAttack 的 then 為 draw count 1。onPlay 先 activeSelf，再 optionalReadyApThen，then 恰好是 grantAttackPhaseEndHand。程式完成前不要標 ready。'
 },
 {
  cardId:'IMC-1-064',
  sentence:'BP5000以下を1枚選び手札に戻す。LiPPSが3枚以上なら退場に代えてもよい。',
  existingOps:['conditionalBounceOrRetireByOwnOutsideNames'],
  whyNotEnough:'現有替換看的是場外卡名，不是場上特徵張數。這句必須選 1 張對手前線 BP5000 以下回手；自己場上 LiPPS 有 3 張以上時，可以把同一張改為退場。',
  proposal:'必須回手，並可依場上特徵張數改為退場。064 先不標 ready。'
 },
 {
  cardId:'IMC-1-072',
  sentence:'バトルに勝利し、場と場外のカード名が9種類以上なら1枚まで引く。手札の特徴を場外に置いた場合、このキャラをアクティブにする。',
  existingOps:['attackWinDraw','optionalHandOutsideActiveIf','ownDistinctTraitNames'],
  whyNotEnough:'ownDistinctTraitNames 的 fieldOutside 已能數場上與場外，自己也算。attackWinDraw 只接受顏色種類或本回合移動過，而且是抽 1，不是最多 1。Q2246 的勝利是實際戰鬥後攻擊方 BP≥阻擋方。optionalHandOutsideActiveIf 要卡名與場外事件數，不是可選把 1 張手牌特徵放到場外後才活動自身。',
  proposal:'攻擊勝利的可選抽 1，門檻是 9 種特徵卡名。可選手牌特徵進場外，做到才活動自身。072 先不標 ready。'
 },
 {
  cardId:'IMC-1-073',
  sentence:'フロントLに登場できない。9種類以上なら上から2枚見て1枚まで手札、残りは場外。そうでないなら1枚引く。',
  existingOps:['frontForbidden','takeTopHandRestOutside','draw','ownDistinctTraitNames'],
  whyNotEnough:'frontForbidden 能禁止上前線與移到前線。takeTopHandRestOutside 是看 2 張、最多 1 張入手、其餘場外，但 ifLiveThen 的後續不接受它。Q2247：9 種時自己算，而且是取代抽 1，不是多抽。',
  proposal:'不能上前線。9 種（含自己）時改為看 2 張、最多 1 張任意卡入手、其餘場外；否則抽 1。073 先不標 ready。'
 },
 {
  cardId:'IMC-1-074',
  sentence:'インパクトを無効にする。9種類以上なら自分のキャラを2枚まで、このターン中 BP+1000。',
  existingOps:['impactNull','buffOwnField','ownDistinctTraitNames'],
  whyNotEnough:'impactNull 能做衝擊無效。buffOwnField 是最多 1 張。這句在攻擊時、9 種（含自己）才可選最多 2 張自己場上角色，這個回合 BP+1000。',
  proposal:'衝擊無效之外，攻擊時依 9 種卡名，可選最多 2 張自己場上角色加攻。074 先不標 ready。'
 },
 {
  cardId:'IMC-1-075',
  sentence:'必要エナジーが1以下の自分の場の特徴を1枚手札に戻してもよい。そうした場合、手札から同じ條件をレストで登場させる。',
  existingOps:['bounceOwnOtherUnderEnergy','deployOwnHandRest'],
  whyNotEnough:'登場回手用 bounceOwnOtherUnderEnergy：optional、energy 1、特徵お願い！シンデレラ，then 為 deployOwnHandRest，ap 寫 null。Q2248 剛回手的那張會在更新後的手牌裡。跳過回手就不開登場。場上與場外合計 6 種的 BP 還沒有欄位，ownDistinctTraitNames 只負責計數。075 先不標 ready。',
  proposal:'先寫登場的回手再休息登場。種類數 BP 補上之前，075 維持 ready false。'
 },
 {
  cardId:'IMC-1-093',
  sentence:'6種類以上なら自分の特徴を1枚まで BP+1000。9種類以上ならさらにこのターン中、インパクト（1）。',
  existingOps:['ifLiveThen','buffOwnField','grantSelfImpactThisTurn','ownDistinctTraitNames'],
  whyNotEnough:'6 種時的可選加攻可以是 ifLiveThen 接 buffOwnField。9 種時印刷是先選那張加攻，再另外給衝擊 1。ifLiveThen 只能接一句，而且不接受 grantSelfImpactThisTurn。grantSelfImpactThisTurn 也只給自己，不能先假定衝擊在被選的那張上。Q2249：自己算進種類。',
  proposal:'6 種可選 1 張自己的指定特徵加攻。9 種時同一句還要再給衝擊 1，目標依印刷，不加猜。093 先不標 ready。'
 },
 {
  cardId:'IMC-1-094',
  sentence:'アタック時、手札を1枚場外に置いてもよい。そうした場合、レイド元を1枚レストで登場させる。',
  existingOps:['takeTopHandRestOutside','deployOwnRaidBaseRest'],
  whyNotEnough:'登場時看 2 張、最多 1 張進手、其餘場外，takeTopHandRestOutside 是這句。攻擊句要可選把 1 張手牌放場外，做到才讓這張突襲元休息登場。deployOwnRaidBaseRest 只接受退場時機，而且沒有手牌進場外的費用。突襲框只有〈島村 卯月〉。',
  proposal:'登場時沿用看 2 張入手、其餘場外。攻擊時可選手牌進場外，做到才讓突襲元休息登場。094 先不標 ready。'
 },
 {
  cardId:'IMC-1-097',
  sentence:'このキャラはアタックできない。アタックフェイズ開始時、APを1支払うと元々の効果を失う。相手のターン中、BP-1000。',
  existingOps:['opponentTurnBp'],
  whyNotEnough:'opponentTurnBp 已能進 IMC 程式。不能攻擊目前是被賦予的 fieldRestrictions，不是會隨 originalEffectsDisabled 關掉的印刷旗標。沒有攻擊階段開始可付 1 AP 的時機。Q2250 到 Q2252：失去的是印刷效果，已獲得效果與別人給的 2 回阻擋留下。',
  proposal:'印刷的不能攻擊與對方回合 BP-1000 在失去原效果時一起停止，已獲得效果不停。攻擊階段開始的可選 AP 支付寫成持續狀態。097 先不標 ready。'
 }
];
