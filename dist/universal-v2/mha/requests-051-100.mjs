// D group owns this file. One object per MHA-1-051–100 card that is not ready.
// Shared-engine work stays here for A group. Do not edit engine.mjs or pack.mjs.
export const MHA_A_GROUP_WIRING={
 file:'dist/universal-v2/official-entry.mjs',
 ask:'Register createMhaV2Pack only as a closed title. MHA_OFFICIAL_MATCH_CLOSED stays until the whole UA10BT set is accepted. Do not set playable.',
 pack:'dist/universal-v2/mha-pack.mjs'
};

export const MHA_REQUESTS_051_100=[
 {
  cardId:'MHA-1-085',
  sentence:'レイド〈爆豪 勝己〉。下の裏向き1枚につき自分のターンBP+1000。登場時、上から2枚を裏向きで下に置く。アタック時、その1枚を場外に置いてもよい。そうしたらBP2500以下を1枚まで退場。',
  existingOps:['raidName','ownTurnBp','retireOppFrontUnderBp'],
  whyNotEnough:'tuckFacedownUnder 可從牌庫頂蓋 count 2 到自己下面。stripFacedownToOutside 的 then 可以是 optional retireOppFrontUnderBp。bpPerDirectFacedown 會在自己回合依直接蓋牌張數加 BP。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'突襲框是爆豪勝己。自己回合，每張直接蓋在下面的牌BP+1000。登場時把牌庫頂2張蓋到自己下面。攻擊時可把1張蓋牌放場外，做到才最多退場1張對手前線BP2500以下。085はreadyにしない。'
 },
 {
  cardId:'MHA-1-090',
  sentence:'レイド〈ホークス〉。登場時、手札を望む枚数裏向きで下に置く。アタック時、その裏向きを見て1枚まで手札に加え、加えたら他の〈ホークス〉以外を1枚までアクティブ。',
  existingOps:['raidName','activeOwnOther'],
  whyNotEnough:'tuckFacedownUnder 可把任意張手牌蓋到自己下面。lookUnderToHandThenActive 會在攻擊時查看直接蓋牌，最多 1 張加入手牌，有加入才活動其他排除指名的角色。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'突襲框是霍克斯。登場時可把任意張手牌蓋到自己下面。攻擊時查看那些蓋牌，最多1張加入手牌；有加入才活動最多1張其他非霍克斯。090はreadyにしない。'
 },
 {
  cardId:'MHA-1-096',
  sentence:'自分のターン中、自分の効果で手札を場外に置いた時、アクティブのこのフィールドをレストしてもよい。そうしたら1枚引く。この効果は1ターン1回。',
  existingOps:['ownHandToOutsideThisTurn','restActiveFieldThenDrawDiscard'],
  whyNotEnough:'restActiveFieldThenDrawDiscard は自分から起動する。這張是自己的效果把手牌放到場外的當下，可休息這張活動中的場域再抽1，而且一回合一次。',
  proposal:'自己回合，自己的效果把手牌放到場外時，可休息這張活動中的場域並抽1。同一回合只發動一次。096はreadyにしない。'
 }
];
