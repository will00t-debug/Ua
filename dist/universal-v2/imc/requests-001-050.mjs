// B group owns this file. One object per shared-engine gap.
// cardId, sentence, existingOps (at least one existing op), whyNotEnough, proposal.
// These cards stay out of IMC_PROGRAMS_001_050. op:'imc' is not wired, and a
// partial program must not be marked ready.
export const IMC_REQUESTS_001_050=[
 {cardId:'IMC-1-011',
  sentence:'【ターン1】このキャラのBPがプラスされた時、自分のターン中の場合、このキャラはこのターン中、BP+1000。',
  existingOps:['buffSelf'],
  whyNotEnough:'buffSelf 是立即加值。共用的 bpGainFollow 已能在自己回合、暫時 BP 變高時每回合一次再加 BP。印刷被動與這次追加本身不重觸發。011 的程式還沒寫，不能標 ready。',
  proposal:'implementation 用 dsl，欄位 bpGainFollow:{bp:1000}。程式完成前不要標 ready。'},
 {cardId:'IMC-1-012',
  sentence:'【ターン1】このキャラのBPがプラスされた時、自分のターン中の場合、このキャラはこのターン中、BP+500。【登場時】このキャラはこのターン中、「このキャラのBPが7000以上の場合、このキャラは【狙い撃ち】を得る。」を得る。【アタック時】このキャラのBPが5000以上の場合、カードを1枚引く。',
  existingOps:['drawIfSelfBpAtLeast','grantSelfSniperThisTurn'],
  whyNotEnough:'攻擊抽牌沿用 drawIfSelfBpAtLeast。grantSelfSniperThisTurn 仍是立刻取得。登場句用 grantConditionalSniperThisTurn，宣告攻擊時重讀 BP。BP+500 用 bpGainFollow。突襲框沿用 raidName，留在圖上。012 的程式還沒寫，不能標 ready。',
  proposal:'bpGainFollow:{bp:500}，onPlay 為 grantConditionalSniperThisTurn minBp 7000，onAttack 為 drawIfSelfBpAtLeast bp 5000 count 1，raidName 為城ヶ崎 莉嘉。程式完成前不要標 ready。'},
 {cardId:'IMC-1-039',
  sentence:'【自分のターン中】このターン中にこのキャラが自分の効果で〔登場しているか移動している〕場合、このキャラはBP+1000。【起動メイン】【エナジーLにある場合】【手札を1枚場外に置く】自分のフロントLに［特徴：ガールズ・イン・ザ・フロンティア］が3枚ある場合のみ発動できる。このキャラをフロントLに移動させる。このキャラはこのターン中、「このキャラのアタック終了時、このキャラをエナジーLに移動させる。」を得る。',
  existingOps:['ownTurnBp','grantSelfAttackEndSwapThisTurn'],
  whyNotEnough:'ownTurnBp 沒有「本回合這張卡以自己的效果登場或移動」。grantSelfAttackEndSwapThisTurn 仍是交換。共用的 ownEffectPresenceBp 與 discardExactFrontMove 已能表達這張卡。Q2237 移動階段不算。Q2238 滿列先選 1 張進移除區。Q2239 攻擊結束排在生命觸發確認之後。039 的程式還沒寫，不能標 ready。',
  proposal:'ownEffectPresenceBp:1000。起動 discardExactFrontMove：line energy、dest front、attackEnd energy、特徵ガールズ・イン・ザ・フロンティア、count 3。程式完成前不要標 ready。'},
];
