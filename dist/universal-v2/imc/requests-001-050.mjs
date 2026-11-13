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
 {cardId:'IMC-1-032',
  sentence:'カードを1枚引く。自分の場の［特徴：BEYOND THE STARLIGHT］を1枚まで選び、このターン中、BP+2000。この効果で〈城ヶ崎 莉嘉〉を選んだ場合、さらにこのターン中、【インパクト（1）】を与える。',
  existingOps:['draw','buffOwnField','grantOtherImpactThisTurn'],
  whyNotEnough:'抽 1 可以。buffOwnField 的 bonusNames 只多加 BP，不加衝擊。buffNameOrTraitImpact 會讓名字或特徵都拿到衝擊，不是只有城ヶ崎 莉嘉。buffOwnFrontImpactIfName 只看前線，而且場上有這個名字時，選中的別張角色也會拿到衝擊。',
  proposal:'先抽 1。同一次選擇最多一張 BEYOND THE STARLIGHT，BP+2000；只有選中的那張名字是城ヶ崎 莉嘉才再得衝擊 1。完成前不要標 ready。'},
 {cardId:'IMC-1-037',
  sentence:'【登場時】このキャラが自分のキャラの効果で登場していた場合、カードを1枚引く。【アタック時】APを1支払ってもよい。そうした場合、このキャラはこのターン中、【インパクト（1）】を得る。',
  existingOps:['draw','optionalPayApThen','grantSelfImpactThisTurn'],
  whyNotEnough:'登場抽牌可以用 draw 的 entry:ownCharacter：自己的角色效果才抽，付費登場、事件與場地不抽。攻擊付 1AP 之後要給自己本回合衝擊 1，optionalPayApThen 的後續沒有 grantSelfImpactThisTurn。',
  proposal:'登場段沿用 entry:ownCharacter。攻擊段要能付 1AP 後得到本回合衝擊 1。完成前不要標 ready。'},
 {cardId:'IMC-1-039',
  sentence:'【自分のターン中】このターン中にこのキャラが自分の効果で〔登場しているか移動している〕場合、このキャラはBP+1000。【起動メイン】【エナジーLにある場合】【手札を1枚場外に置く】自分のフロントLに［特徴：ガールズ・イン・ザ・フロンティア］が3枚ある場合のみ発動できる。このキャラをフロントLに移動させる。このキャラはこのターン中、「このキャラのアタック終了時、このキャラをエナジーLに移動させる。」を得る。',
  existingOps:['ownTurnBp','grantSelfAttackEndSwapThisTurn'],
  whyNotEnough:'ownTurnBp 沒有「本回合這張卡以自己的效果登場或移動」。grantSelfAttackEndSwapThisTurn 仍是交換。共用的 ownEffectPresenceBp 與 discardExactFrontMove 已能表達這張卡。Q2237 移動階段不算。Q2238 滿列先選 1 張進移除區。Q2239 攻擊結束排在生命觸發確認之後。039 的程式還沒寫，不能標 ready。',
  proposal:'ownEffectPresenceBp:1000。起動 discardExactFrontMove：line energy、dest front、attackEnd energy、特徵ガールズ・イン・ザ・フロンティア、count 3。程式完成前不要標 ready。'},
];
