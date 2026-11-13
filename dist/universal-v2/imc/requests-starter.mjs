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
 }
];
