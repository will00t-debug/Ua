// D group owns this file. One object per shared-engine gap.
// cardId, sentence, existingOps (at least one existing op), whyNotEnough, proposal.
// These cards stay out of the battle pack until A group can express the sentence.
export const IMC_REQUESTS_STARTER=[
 {
  cardId:'IMC-1-101',
  sentence:'登場時，自己場上有 3 張以上印刷 BP 恰好 4000 且具 new generations 時抽 1 張。衝擊無效本身已是 impactNull。',
  existingOps:['drawIfOwnTraitCount','ifLiveThen'],
  whyNotEnough:'drawIfOwnTraitCount 與 ownCardTraitCount 只數特徵，不讀印刷 BP。ifLiveThen 不能掛這個條件。',
  proposal:'共用條件要能數「場上、指定特徵、印刷 BP 恰好 N」的張數，再決定是否抽 1 張。'
 },
 {
  cardId:'IMC-1-102',
  sentence:'登場時獲得衝擊 1。另外最多退場 1 張對手前線角色，其目前 BP 須在「自己場上其他、new generations、印刷 BP 恰好 4000」的張數×1000 以下。可選 0 張。普通登場與突襲登場都處理登場時。退場進場外，不是生命傷害。',
  existingOps:['retireOppFrontUnderBp','grantSelfImpactThisTurn'],
  whyNotEnough:'traitPerBp 連自己也數，而且不讀印刷 BP。printedBpTraitCount 會被牌組驗證拒絕。對手可否退場必須用目前 BP，不能用印刷 BP。',
  proposal:'擴充 retireOppFrontUnderBp：上限＝排除來源後、指定特徵且印刷 BP 恰好為 N 的張數×per；optional true；比較對手目前 BP。不要改成生命觸發。衝擊 1 繼續用 grantSelfImpactThisTurn，突襲框只留 raidName。'
 },
 {
  cardId:'IMC-1-103',
  sentence:'攻擊時，自己前線有 3 張以上印刷 BP 恰好 4000 的 new generations 時，抽 1 張並將 1 張手牌置於場外。',
  existingOps:['drawDiscard','drawIfOwnTraitCount'],
  whyNotEnough:'drawDiscard 沒有印刷 BP 與特徵的前線張數門。drawIfOwnTraitCount 只抽牌，也不讀印刷 BP。',
  proposal:'攻擊時可沿用抽 1 棄 1，但門檻要是前線、指定特徵、印刷 BP 恰好 4000、至少 3 張。'
 },
 {
  cardId:'IMC-1-104',
  sentence:'自己場上同時有〈渋谷 凛〉與〈本田 未央〉時，手牌中的這張角色消耗 AP-1。',
  existingOps:['nextEligibleHandPlayApDiscount'],
  whyNotEnough:'nextEligibleHandPlayApDiscount 是下一張使用的折扣，不是這張卡在兩名角色同時在場時的手牌 AP。handApDiscountWhileName 只接受事件與單一卡名，而且 D 組程式欄位不能帶這個被動。',
  proposal:'角色手牌 AP-1，條件是自己場上同時存在兩張指定卡名。兩名都要在，不能只看其中一名。'
 },
 {
  cardId:'IMC-1-106',
  sentence:'登場時的看 3 張、公開最多 1 張 new generations 入手、其餘置底，與 105 相同。其後若自己場上有 4 張以上印刷 BP 恰好 4000 的 new generations，才可將最多 1 張自己場上的 new generations 置為活動。',
  existingOps:['searchTopOneBottomDiscard','activeOwnTrait'],
  whyNotEnough:'兩段可以分開寫，但 activeOwnTrait 沒有印刷 BP 張數門，會在不滿 4 張時也發動。',
  proposal:'看牌沿用 searchTopOneBottomDiscard。活動段要先通過「場上、new generations、印刷 BP 恰好 4000、至少 4」再選最多 1 張。'
 },
 {
  cardId:'IMC-1-107',
  sentence:'啟動主要：將這張場域休息並退場，抽 1 張，然後可將手牌中 1 張能源需求 3 以下、消耗 AP 1 的紅色角色以休息狀態登場。',
  existingOps:['fieldRestRetireThen','deployOwnHandSpecial'],
  whyNotEnough:'fieldRestRetireThen 的後續只接受場外登場、抽 2 棄 1，或強制的手牌休息／突襲登場。deployOwnHandSpecial 能表示紅、AP 1、能源 3 以下、休息，但不能接在場域休息退場抽 1 之後。',
  proposal:'場域休息並退場後抽 1，再可選最多 1 張符合顏色、AP 與能源上限的手牌角色，以休息狀態登場。'
 },
 {
  cardId:'IMC-1-108',
  sentence:'自己前線所有角色這個回合 BP+1000，然後抽 1 張。',
  existingOps:['buffOwnCharactersAll','draw'],
  whyNotEnough:'buffOwnCharactersAll 會加到能量區角色。這張只寫前線。',
  proposal:'只給自己前線的每張角色這個回合 BP+1000，能量區不加，然後抽 1 張。'
 },
 {
  cardId:'IMC-1-110',
  sentence:'啟動主要，僅限前線，每回合 1 次，而且這張角色目前 BP 在 4000 以上。二選一：自己場上 1 張角色 BP+1000，或自己場上 1 張目前 BP 3000 以上的角色 BP+2000。',
  existingOps:['frontOnceProgram','buffOwnField'],
  whyNotEnough:'frontOnceProgram 沒有「自己目前 BP 至少 4000」這道門，也不能在「任意自己角色 +1000」與「目前 BP 至少 3000 的自己角色 +2000」之間二選一。',
  proposal:'前線、每回合 1 次、來源目前 BP 達門檻後，提供這兩個既有加值選擇。'
 },
 {
  cardId:'IMC-1-111',
  sentence:'登場時可支付 1 AP，若支付則從自己場外將 1 張持有突襲的黃色 Positive Passion 加入手牌。攻擊時，自己場上有那種角色才抽 1 張並將 1 張手牌置於場外。',
  existingOps:['optionalPayApThen','payApDiscardOutsideRaid','drawDiscard'],
  whyNotEnough:'optionalPayApThen 的後續沒有「場外、指定顏色、指定特徵、持有突襲關鍵字、加入手牌」。payApDiscardOutsideRaid 是棄掉指定卡名，不是入手。攻擊段的抽棄也沒有這個場上條件。',
  proposal:'可支付 1 AP，從場外把持有突襲關鍵字的指定顏色與特徵加入手牌。攻擊時用同一個條件決定是否抽 1 棄 1。'
 },
 {
  cardId:'IMC-1-112',
  sentence:'突襲與衝擊無效在框外。登場時可將 1 張自己場上角色放到牌庫底；若做了，看牌庫頂 3 張，其中最多 1 張藍色 Girls in the Frontier 以休息狀態登場，另 1 張任意卡加入手牌，其餘依序放回牌庫底。Q2258：入手不限特徵。',
  existingOps:['searchTopOneBottomDiscard','bounceOwnOtherUnderEnergy'],
  whyNotEnough:'看牌 op 不能先把場上角色放到底，也不能從同一窗同時休息登場 1 張並把另 1 張任意卡加入手牌。bounceOwnOtherUnderEnergy 是回手，不是放牌庫底。',
  proposal:'可選的場上角色置底之後，才打開私有的 3 張窗：藍色指定特徵最多 1 張休息登場，另外最多 1 張不限特徵入手，剩下的排到底。衝擊無效與突襲沿用 impactNull 和 raidName。'
 },
 {
  cardId:'IMC-1-113',
  sentence:'自己場上有 4 張以上 LiPPS 時，這張角色產生能源+藍。登場時可選最多 1 張對手前線角色，或 1 張〈速水 奏〉以外的自己場上 LiPPS，這個回合 BP+500。',
  existingOps:['buffAnyCharacter'],
  whyNotEnough:'buffAnyCharacter 會給任意角色同一數值，不能分成對手前線或排除指定卡名的自己 LiPPS。產生藍能源也不是張數門，conditionalTraitEnergy 數的是不同特徵種類，而且 D 組程式欄位帶不了它。',
  proposal:'同一特徵達到指定張數時，這張角色額外產生 1 點指定顏色。登場時的 +500 只能選對手前線，或自己場上該特徵且不是指定卡名的角色，最多 1 張。'
 }
];
