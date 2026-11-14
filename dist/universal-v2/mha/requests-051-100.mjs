// D group owns this file. One object per MHA-1-051–100 card that is not ready.
// Shared-engine work stays here for A group. Do not edit engine.mjs or pack.mjs.
export const MHA_A_GROUP_WIRING={
 file:'dist/universal-v2/official-entry.mjs',
 ask:'Register createMhaV2Pack only as a closed title. MHA_OFFICIAL_MATCH_CLOSED stays until the whole UA10BT set is accepted. Do not set playable.',
 pack:'dist/universal-v2/mha-pack.mjs'
};

export const MHA_REQUESTS_051_100=[
 {
  cardId:'MHA-1-055',
  sentence:'ステップ。登場時、必要エナジー4以上の他キャラが3枚以上なら、BP5000以下の相手フロントを1枚まで退場。',
  existingOps:['step','retireOppFrontUnderBp','ifLiveThen','oppFrontCountAtLeast'],
  whyNotEnough:'ifLiveThen 的後段已可接可選的 retireOppFrontUnderBp，條件是 ownOtherRequiredEnergyAtLeast。步驟仍要一起寫進卡牌程式。這輪不標 ready。',
  proposal:'保留步驟。登場時只在其他必要能源4以上的角色有3張以上時，最多退場1張對手前線BP5000以下。055はreadyにしない。'
 },
 {
  cardId:'MHA-1-060',
  sentence:'レイド〈緑谷 出久〉。自分のターン中BP+500。アタック時ターン1、手札1枚を場外に置いてもよい。そうしたら他の必要エナジー3以下を1枚までアクティブ。',
  existingOps:['raidName','ownTurnBp','optionalRemoveHandThen','activeOwnOne'],
  whyNotEnough:'oncePerTurnGate 的後段已可接 payHandThenActive。空手牌不會打開支付，跳過不活動，支付後目標不在也不退回已支付的手牌。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'突襲框是綠谷出久。自己回合BP+500。攻擊時一回合一次，可把手牌1張放場外，做到才活動最多1張其他必要能源3以下。060はreadyにしない。'
 },
 {
  cardId:'MHA-1-062',
  sentence:'〈発目 明〉がいる場合アクティブで登場。登場時、自分のキャラ1枚までこのターンBP+1000。起動はレストして退場し、自分のキャラ全てにこのターンBP+500。',
  existingOps:['enterAlwaysActive','buffOwnField','fieldRestRetireThen'],
  whyNotEnough:'enterActiveIfName 只在具名角色已在場時活動登場。fieldRestRetireThen 的後段已可 all:true 給全部自己角色 BP+500。登場時的單張 BP+1000 仍是既有的可選 buffOwnField。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'發目明在場才活動登場。登場時最多1張自己角色本回合BP+1000。起動是休息後退場，自己全部角色本回合BP+500。062はreadyにしない。'
 },
 {
  cardId:'MHA-1-066',
  sentence:'上から3枚見てキャラ1枚まで公開して手札、残りは下。手札の緑キャラ1枚までレストで登場。相手フロントが3枚以上で、そのキャラがオールマイトならアクティブ。',
  existingOps:['lookTopScript','deployOwnHandRest','activeSelfIf','oppFrontCountAtLeast'],
  whyNotEnough:'看頂 3 張仍用 lookTopScript。後面接的是另一句 deployOwnHandRest：綠角色、不限特徵與能量，thenActiveIf 在對手前線 3 張以上且該角色是歐爾麥特時改為活動。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'看頂3張，最多公開1張角色入手，其餘放牌底。再從手牌休息登場最多1張綠角色。對手前線有3張以上且該角色是歐爾麥特時改為活動。066はreadyにしない。'
 },
 {
  cardId:'MHA-1-072',
  sentence:'ダメージ2。登場時、望む枚数を場外に置き手札が3枚になるまで引く。アタック時、望む枚数を場外に置き、その枚数×1000以下の相手フロントを1枚まで退場。',
  existingOps:['printedAttackDamage','discardToDraw','retireOppFrontHandTraitScale'],
  whyNotEnough:'discardUntilHand 先棄任意張再補到 3。discardThenRetireScaled 依棄牌張數乘 1000 退場。跳過整句不會抽牌也不退場。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'傷害2。登場時可把任意張手牌放場外，再抽到手上有3張。攻擊時可把任意張放場外，再最多退場1張對手前線，BP上限是張數×1000。072はreadyにしない。'
 },
 {
  cardId:'MHA-1-076',
  sentence:'登場時、フロントLにある場合、自分のエナジーLのキャラを1枚までフロントLへ移動。',
  existingOps:['moveEnergyTraitToFront','mayStepFrontFromEnergy'],
  whyNotEnough:'前線已滿時先開 effect-front-vacate，選最多 1 張自己的前線角色放進移除區，然後才移動能量列角色。Q457 允許移出這張自己；移出自己之後的移動 pending 帶 vacated:true。沒有手牌或 AP 支付。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'補上前線已滿時的移除再移動，而且這張自己可以是被移除的那張。076はreadyにしない。'
 },
 {
  cardId:'MHA-1-081',
  sentence:'レイド〈轟 焦凍〉。自分のターンの登場時、相手ライフ5以上なら1ダメージ、または相手フロント1枚までレストにして次の1回アクティブにしない。',
  existingOps:['raidName','chooseOne','restOppFrontOne','skipNextActiveOppRest'],
  whyNotEnough:'chooseOne 的選項已可帶 oppLifeAtLeast，後段是 damagePlayer 1 點或 restOppFrontOne 並 skipNextActive。生命不足時傷害選項不提供，結算時條件消失會拒絕。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'突襲框是轟焦凍。只有自己回合的登場時，二選一：對方生命5以上才造成1點傷害，或最多休息1張對方前線並跳過它下一次活動。081はreadyにしない。'
 },
 {
  cardId:'MHA-1-084',
  sentence:'起動メイン、フロントL、ターン1。次にBP範囲でキャラを選ぶ効果の範囲を+1000。カラートリガーはBP2500以下の相手フロントを退場。',
  existingOps:['frontOnceProgram','retireOppFrontUnderBp'],
  whyNotEnough:'grantNextBpWindow 只加在下一次有選項的 BP 範圍退場、移除或休息，用過就歸零。顏色觸發的 2500 退場已存在。這輪不寫卡牌程式，所以維持 pending。',
  proposal:'前線、一回合一次的起動，讓自己下一個有BP範圍的選擇把範圍+1000。顏色觸發退場1張對手前線BP2500以下。084はreadyにしない。'
 },
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
  whyNotEnough:'selfMovedThisTurn は條件としてはあるが、移動済みのこのキャラへ2回アタックを付ける op と、手札場外を払って別ラインへ動く起動が組になっていない。',
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
