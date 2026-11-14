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
  whyNotEnough:'ownOtherRequiredEnergyAtLeast 已可表示其他角色的必要能源。ifLiveThen 的後段仍沒有 retireOppFrontUnderBp，所以登場時的條件退場還不能整句寫。不要標 ready。',
  proposal:'保留步驟。登場時只在其他必要能源4以上的角色有3張以上時，最多退場1張對手前線BP5000以下。055はreadyにしない。'
 },
 {
  cardId:'MHA-1-060',
  sentence:'レイド〈緑谷 出久〉。自分のターン中BP+500。アタック時ターン1、手札1枚を場外に置いてもよい。そうしたら他の必要エナジー3以下を1枚までアクティブ。',
  existingOps:['raidName','ownTurnBp','optionalRemoveHandThen','activeOwnOne'],
  whyNotEnough:'raidName 與 ownTurnBp 已能從 MHA 程式轉交，但仍不是整句。攻擊時的【ターン1】可選手牌放場外、做到才活動其他非綠谷出久且必要能源 3 以下，仍不是 optionalRemoveHandThen 或具名 activeOwnOne。不要只上突襲框與 BP+500 就標 ready。',
  proposal:'突襲框是綠谷出久。自己回合BP+500。攻擊時一回合一次，可把手牌1張放場外，做到才活動最多1張其他必要能源3以下。060はreadyにしない。'
 },
 {
  cardId:'MHA-1-062',
  sentence:'〈発目 明〉がいる場合アクティブで登場。登場時、自分のキャラ1枚までこのターンBP+1000。起動はレストして退場し、自分のキャラ全てにこのターンBP+500。',
  existingOps:['enterAlwaysActive','buffOwnField','fieldRestRetireThen'],
  whyNotEnough:'enterAlwaysActive は無條件。具名角色在場才活動登場ではない。fieldRestRetireThen の続きは具名登場、抽牌か手牌休息で、全体BP+500ではない。',
  proposal:'發目明在場才活動登場。登場時最多1張自己角色本回合BP+1000。起動是休息後退場，自己全部角色本回合BP+500。062はreadyにしない。'
 },
 {
  cardId:'MHA-1-066',
  sentence:'上から3枚見てキャラ1枚まで公開して手札、残りは下。手札の緑キャラ1枚までレストで登場。相手フロントが3枚以上で、そのキャラがオールマイトならアクティブ。',
  existingOps:['lookTopScript','deployOwnHandRest','activeSelfIf','oppFrontCountAtLeast'],
  whyNotEnough:'看頂 3 張、公開最多 1 張角色入手、其餘放牌底，已可用 lookTopScript，count 3、takes 為 type:character、publish true、不要 thenDrawIfName。後面接的休息登場沒有特徵，lookTopScript 的 rest 入手仍必須有特徵。對手前線 3 張以上且登場的是歐爾麥特才改活動也還沒有。066 不要標 ready。',
  proposal:'看頂3張，最多公開1張角色入手，其餘放牌底。再從手牌休息登場最多1張綠角色。對手前線有3張以上且該角色是歐爾麥特時改為活動。066はreadyにしない。'
 },
 {
  cardId:'MHA-1-072',
  sentence:'ダメージ2。登場時、望む枚数を場外に置き手札が3枚になるまで引く。アタック時、望む枚数を場外に置き、その枚数×1000以下の相手フロントを1枚まで退場。',
  existingOps:['printedAttackDamage','discardToDraw','retireOppFrontHandTraitScale'],
  whyNotEnough:'drawUntilHand 只把抽牌補到指定張數，沒有先棄任意張。072 要先棄任意張再補到 3，攻擊時還要依棄牌張數退場。不要把 drawUntilHand 當成整句。不要標 ready。',
  proposal:'傷害2。登場時可把任意張手牌放場外，再抽到手上有3張。攻擊時可把任意張放場外，再最多退場1張對手前線，BP上限是張數×1000。072はreadyにしない。'
 },
 {
  cardId:'MHA-1-076',
  sentence:'登場時、フロントLにある場合、自分のエナジーLのキャラを1枚までフロントLへ移動。',
  existingOps:['moveEnergyTraitToFront','mayStepFrontFromEnergy'],
  whyNotEnough:'登場時 {op:moveEnergyTraitToFront, trait:null, max:1, whenSelf:front, optional:true} 已能在前線有空位時移動最多1張、無特徵、可跳過。Q456：前線沒有空位時，先把1張前線卡放進移除區再移動。Q457：被移除的可以是這張自己。現有操作在沒有空位時不開 pending，不能選移除對象。不要把有空位的半句標成 ready。',
  proposal:'補上前線已滿時的移除再移動，而且這張自己可以是被移除的那張。076はreadyにしない。'
 },
 {
  cardId:'MHA-1-081',
  sentence:'レイド〈轟 焦凍〉。自分のターンの登場時、相手ライフ5以上なら1ダメージ、または相手フロント1枚までレストにして次の1回アクティブにしない。',
  existingOps:['raidName','chooseOne','restOppFrontOne','skipNextActiveOppRest'],
  whyNotEnough:'二択の片方はライフ5以上の1ダメージ、もう片方はレストかつ次の活動を飛ばす。chooseOne の既存選項にこの組がない。',
  proposal:'突襲框是轟焦凍。只有自己回合的登場時，二選一：對方生命5以上才造成1點傷害，或最多休息1張對方前線並跳過它下一次活動。081はreadyにしない。'
 },
 {
  cardId:'MHA-1-084',
  sentence:'起動メイン、フロントL、ターン1。次にBP範囲でキャラを選ぶ効果の範囲を+1000。カラートリガーはBP2500以下の相手フロントを退場。',
  existingOps:['frontOnceProgram','retireOppFrontUnderBp'],
  whyNotEnough:'沒有「下一次BP範圍選擇+1000」的共用狀態。顏色觸發的2500退場雖然已有 retireOppFrontUnderBp，不能把起動句拆開標ready。',
  proposal:'前線、一回合一次的起動，讓自己下一個有BP範圍的選擇把範圍+1000。顏色觸發退場1張對手前線BP2500以下。084はreadyにしない。'
 },
 {
  cardId:'MHA-1-085',
  sentence:'レイド〈爆豪 勝己〉。下の裏向き1枚につき自分のターンBP+1000。登場時、上から2枚を裏向きで下に置く。アタック時、その1枚を場外に置いてもよい。そうしたらBP2500以下を1枚まで退場。',
  existingOps:['raidName','ownTurnBp','retireOppFrontUnderBp'],
  whyNotEnough:'tuckFacedownUnder 可從牌庫頂蓋 count 2 到自己下面。stripFacedownToOutside 的 then 可以是 optional retireOppFrontUnderBp。依蓋牌張數的自己回合 BP 還沒有。不要只做蓋牌與剝離就標 ready。',
  proposal:'突襲框是爆豪勝己。自己回合，每張直接蓋在下面的牌BP+1000。登場時把牌庫頂2張蓋到自己下面。攻擊時可把1張蓋牌放場外，做到才最多退場1張對手前線BP2500以下。085はreadyにしない。'
 },
 {
  cardId:'MHA-1-090',
  sentence:'レイド〈ホークス〉。登場時、手札を望む枚数裏向きで下に置く。アタック時、その裏向きを見て1枚まで手札に加え、加えたら他の〈ホークス〉以外を1枚までアクティブ。',
  existingOps:['raidName','activeOwnOther'],
  whyNotEnough:'tuckFacedownUnder 可把任意張手牌蓋到自己下面，from hand、count any、optional true、host self。攻擊時改看蓋牌並加入手牌、再活動其他非霍克斯，不是放到場外。不要只做蓋牌就標 ready。',
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
  whyNotEnough:'bonusName は場の卡名で上限を上げる。這句の条件は他の手札が3枚以下で、同名の場カードではない。',
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
