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
 },
 {
  cardId:'MHA-1-099',
  sentence:'BP3000以下の相手フロントを退場。他の手札が3枚以下ならBP5000以下に代わる。',
  existingOps:['retireOppFrontUnderBp'],
  whyNotEnough:'handAtMost 會在選擇當下依其他手牌張數，把退場上限從基本 BP 改成較高的 BP。bonusName 仍是場上卡名。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'必須退場1張對手前線。其他手牌超過3張時上限BP3000，3張以下時改為BP5000。099はreadyにしない。'
 },
 {
  cardId:'MHA-1-100',
  sentence:'BP3000以下を退場。BP2000以下の相手フロント全てをレストし、次の1回アクティブにしない。〈轟 焦凍〉がいれば退場側はBP5000以下。',
  existingOps:['retireOppFrontUnderBp','restOppFrontUnderBp','skipNextActiveOppRest'],
  whyNotEnough:'退場の名前置換は bonusName でできる。その後の「BP2000以下を全てレストし、次の活動を飛ばす」は1枚選擇の restOppFrontUnderBp ではない。二句を分けて ready にはしない。',
  proposal:'退場1張對手前線，場上有轟焦凍則上限從3000改為5000。另外把全部BP2000以下的對手前線休息，並跳過它們下一次活動。100はreadyにしない。'
 }
];
