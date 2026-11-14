// D group owns this file. One object per MHA-1-051–100 card that is not ready.
// Shared-engine work stays here for A group. Do not edit engine.mjs or pack.mjs.
export const MHA_A_GROUP_WIRING={
 file:'dist/universal-v2/official-entry.mjs',
 ask:'Register createMhaV2Pack only as a closed title. MHA_OFFICIAL_MATCH_CLOSED stays until the whole UA10BT set is accepted. Do not set playable.',
 pack:'dist/universal-v2/mha-pack.mjs'
};

export const MHA_REQUESTS_051_100=[
 {
  cardId:'MHA-1-091',
  sentence:'アタック時とブロック時。自分のフロントLに空きがある場合、手札1枚を場外に置いてもよい。そうしたらこのターンBP+2000。',
  existingOps:['optionalRemoveHandThen','buffSelf','buffSelfIfFrontOpen'],
  whyNotEnough:'buffSelfIfFrontOpen は空位そのものでBPを足す。這句要先確認前線有空位，再可把手牌放場外，做到才加BP。攻擊時與阻擋時都要。',
  proposal:'攻擊時與阻擋時，自己前線有空位才可把手牌1張放場外，做到才本回合BP+2000。091はreadyにしない。'
 },
 {
  cardId:'MHA-1-095',
  sentence:'ステップ。このターンに移動しているなら2回アタック。起動は手札1枚を場外に置き、ターン1で別ラインへ移動。',
  existingOps:['step','grantSelfDoubleAttackThisTurn','selfMovedThisTurn'],
  whyNotEnough:'selfMovedThisTurn は條件としてはあるが、移動済みのこのキャラへ2回アタックを付ける op と、手札場外を払って別ラインへ動く起動が組になっていない。Q464：移動先已滿時要先把目的地的 1 張卡放進移除區。effect-front-vacate 只服務能量列移到前線，不能拿來付手牌後移動這張自己。',
  proposal:'保留步驟。這個回合移動過就得到2回攻擊。起動付1張手牌到場外，一回合一次，移到另一條線。095はreadyにしない。'
 },
 {
  cardId:'MHA-1-096',
  sentence:'自分のターン中、自分の効果で手札を場外に置いた時、アクティブのこのフィールドをレストしてもよい。そうしたら1枚引く。この効果は1ターン1回。',
  existingOps:['ownHandToOutsideThisTurn','restActiveFieldThenDrawDiscard'],
  whyNotEnough:'restActiveFieldThenDrawDiscard は自分から起動する。這張是自己的效果把手牌放到場外的當下，可休息這張活動中的場域再抽1，而且一回合一次。',
  proposal:'自己回合，自己的效果把手牌放到場外時，可休息這張活動中的場域並抽1。同一回合只發動一次。096はreadyにしない。'
 }
];
