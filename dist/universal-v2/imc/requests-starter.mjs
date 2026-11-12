// D group owns this file. One object per shared-engine gap.
// cardId, sentence, existingOps (at least one existing op), whyNotEnough, proposal.
// These cards stay out of the battle pack until A group can express the sentence.
export const IMC_REQUESTS_STARTER=[
 {
  cardId:'IMC-1-107',
  sentence:'啟動主要：將這張場域休息並退場，抽 1 張，然後可將手牌中 1 張能源需求 3 以下、消耗 AP 1 的紅色角色以休息狀態登場。',
  existingOps:['fieldRestRetireThen','deployOwnHandSpecial'],
  whyNotEnough:'fieldRestRetireThen 的後續只接受場外登場、抽 2 棄 1，或強制的手牌休息／突襲登場。deployOwnHandSpecial 能表示紅、AP 1、能源 3 以下、休息，但不能接在場域休息退場抽 1 之後。',
  proposal:'場域休息並退場後抽 1，再可選最多 1 張符合顏色、AP 與能源上限的手牌角色，以休息狀態登場。'
 },
 {
  cardId:'IMC-1-112',
  sentence:'突襲與衝擊無效在框外。登場時可將 1 張自己場上角色放到牌庫底；若做了，看牌庫頂 3 張，其中最多 1 張藍色 Girls in the Frontier 以休息狀態登場，另 1 張任意卡加入手牌，其餘依序放回牌庫底。Q2258：入手不限特徵。',
  existingOps:['searchTopOneBottomDiscard','bounceOwnOtherUnderEnergy'],
  whyNotEnough:'searchTopOneBottomDiscard 不能先把場上角色放到底，也不能從同一窗同時休息登場 1 張並把另 1 張任意卡加入手牌。bounceOwnOtherUnderEnergy 是回手，不是放牌庫底。共用的 bottomOwnCharacterThen 接 lookTopScript 已能先置底才查看，藍色特徵最多 1 張休息登場，另 1 張不限特徵入手。Q2258 入手不限特徵。112 的程式還沒寫，不能標 ready。',
  proposal:'用 bottomOwnCharacterThen 接 lookTopScript。可選的場上角色置底之後，才打開私有的 3 張窗：藍色指定特徵最多 1 張休息登場，另外最多 1 張不限特徵入手，剩下的排到底。衝擊無效與突襲沿用 impactNull 和 raidName。程式完成前不要標 ready。'
 }
];
