// D group owns this file. One object per MHA-1-051–100 card that is not ready.
// Shared-engine work stays here for A group. Do not edit engine.mjs or pack.mjs.
export const MHA_A_GROUP_WIRING={
 file:'dist/universal-v2/official-entry.mjs',
 ask:'Register createMhaV2Pack only as a closed title. MHA_OFFICIAL_MATCH_CLOSED stays until the whole UA10BT set is accepted. Do not set playable.',
 pack:'dist/universal-v2/mha-pack.mjs'
};

export const MHA_REQUESTS_051_100=[
 {
  cardId:'MHA-1-051',
  sentence:'レイド〈通形 ミリオ〉。BP3000以下にブロックされない。ターン1、アタックしてブロックされなかった時1枚引く。退場時、必要エナジー4以上の他キャラが3枚以上なら、レイドの一番下をフロントLにアクティブで登場させてもよい。',
  existingOps:['blockBpRestriction','raidName','grantUnblockedDrawThisTurn','unblockedAttack','replayRaidBase'],
  whyNotEnough:'第 9 輪 A 契約把 atMost 寫成方向相反。引擎實際是 relation atMost 時，BP 小於等於該值的角色不能阻擋，050 已用 {relation:atMost, bp:3000, condition:null}。不要重做這句。unblockedAttack 必須 optional:true，而且每次未被阻擋都會發，不是【ターン1】的強制抽 1。grantUnblockedDrawThisTurn 只能從 onPlay 發一次。oppFrontCountAtLeast 只數張數，不讀其他角色的必要能源。replayRaidBase 不是把突襲最下段活動放到前線 L。三句沒有齊，不要只上阻擋就標 ready。',
  proposal:'沿用 050 的 atMost 3000 與 raidName。另需一回合一次、攻擊未被阻擋時強制抽 1，以及退場時其他必要能源 4 以上達 3 張才可把突襲最下段活動放到前線 L。051はreadyにしない。'
 },
 {
  cardId:'MHA-1-054',
  sentence:'山札の上から7枚を見て、必要エナジー2以下の緑のフィールドを1枚まで公開して手札に加え、残りは望む順で下に置く。',
  existingOps:['searchTopOneBottomDiscard','lookTopScript','inspectTopArrange'],
  whyNotEnough:'第 9 輪的 lookTopScript 公開入手只接受 type:character，不能拿來選綠場域。searchTopOneBottomDiscard 的複合篩選可以是綠場域且必要能源 2 以下、看 7 張，但複合窗的 discard:false 只開放給卡名 any。預設會再棄 1 張手牌。054 公開最多 1 張後不棄手牌。活動觸發不能代替這句。',
  proposal:'看頂7張，公開加入最多1張綠、能源2以下的場域，其餘依選擇放牌底。054はreadyにしない。'
 },
 {
  cardId:'MHA-1-055',
  sentence:'ステップ。登場時、必要エナジー4以上の他キャラが3枚以上なら、BP5000以下の相手フロントを1枚まで退場。',
  existingOps:['step','retireOppFrontUnderBp','ifLiveThen','oppFrontCountAtLeast'],
  whyNotEnough:'step 已有。oppFrontCountAtLeast 只數正面朝上的前線角色，不讀必要能源。ifLiveThen 的後續沒有 retireOppFrontUnderBp。登場時「其他必要能源 4 以上達 3 張才最多退場 1 張對手前線 BP 5000 以下」仍不能整句寫。',
  proposal:'保留步驟。登場時只在其他必要能源4以上的角色有3張以上時，最多退場1張對手前線BP5000以下。055はreadyにしない。'
 },
 {
  cardId:'MHA-1-056',
  sentence:'登場時、手札1枚を裏向きで〈ファットガム〉か〈天喰 環〉の下に置いてもよい。そうしたら1枚引く。アタック時、下の裏向き1枚を場外に置いてもよい。そうしたらこのターンBP+2000。',
  existingOps:['handOutsideReenterFaceDown','buffSelf'],
  whyNotEnough:'既存の裏向きは場外へ戻すか自分の下ではない。具名角色的下に置いてから抽牌、攻撃時に1枚場外でBP+2000、という二段がない。',
  proposal:'可選手牌蓋到具名角色下，做到才抽1。攻擊時可把蓋牌放場外，做到才本回合BP+2000。056はreadyにしない。'
 },
 {
  cardId:'MHA-1-059',
  sentence:'登場時、手札から必要エナジー3以下・消費AP1の緑キャラを1枚までアクティブで登場させるかレイド。カラートリガーは必要エナジー2以下・消費AP1の緑を1枚アクティブで登場。',
  existingOps:['deployOwnHandRestOrRaid','deployOwnHandActiveNoRaid','deployHandCharacter'],
  whyNotEnough:'顏色觸發與 050 相同，是 triggerEffect deployHandCharacter、綠、能源 2 以下、消耗 AP 1。登場句是最多 1 張、綠、能源 3 以下、消耗 AP 1，而且是活動登場或突襲。deployOwnHandActiveNoRaid 禁止突襲，deployOwnHandRestOrRaid 是休息或突襲。不能只寫觸發就標 ready。',
  proposal:'登場時は最多1張、綠、能源3以下、消耗AP1，活動登場或突襲。顏色觸發是必須1張、綠、能源2以下、消耗AP1、活動登場。059はreadyにしない。'
 },
 {
  cardId:'MHA-1-060',
  sentence:'レイド〈緑谷 出久〉。自分のターン中BP+500。アタック時ターン1、手札1枚を場外に置いてもよい。そうしたら他の必要エナジー3以下を1枚までアクティブ。',
  existingOps:['raidName','ownTurnBp','optionalRemoveHandThen','activeOwnOne'],
  whyNotEnough:'ownTurnBp 與 raidName 是引擎卡欄，MHA 程式白名單目前不轉交。即便轉交，攻擊時的【ターン1】可選手牌放場外、做到才活動其他非綠谷出久且必要能源 3 以下，仍不是 optionalRemoveHandThen 或具名 activeOwnOne。不要只上 BP+500 就標 ready。',
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
  cardId:'MHA-1-063',
  sentence:'自分のキャラ1枚にこのターンBP+2500とバトル勝利時のドローを与える。オールマイトか緑谷出久ならさらに狙い撃ち。',
  existingOps:['grantNamedBuffAttackDraw','grantConditionalSniperThisTurn'],
  whyNotEnough:'grantNamedBuffAttackDraw は名前が先に固定される。這張是先選任意自己角色給BP與勝利抽牌，選中的名字是歐爾麥特或綠谷出久才再給狙擊。',
  proposal:'選1張自己角色，本回合BP+2500，並在戰鬥勝利時抽1。若該角色是歐爾麥特或綠谷出久，再給本回合狙擊。特殊觸發維持退場1張對手前線。063はreadyにしない。'
 },
 {
  cardId:'MHA-1-066',
  sentence:'上から3枚見てキャラ1枚まで公開して手札、残りは下。手札の緑キャラ1枚までレストで登場。相手フロントが3枚以上で、そのキャラがオールマイトならアクティブ。',
  existingOps:['lookTopScript','deployOwnHandRest','activeSelfIf','oppFrontCountAtLeast'],
  whyNotEnough:'看頂 3 張、公開最多 1 張角色入手、其餘放牌底，已可用 lookTopScript，count 3、takes 為 type:character、publish true、不要 thenDrawIfName。後面接的休息登場沒有特徵，lookTopScript 的 rest 入手仍必須有特徵。對手前線 3 張以上且登場的是歐爾麥特才改活動也還沒有。066 不要標 ready。',
  proposal:'看頂3張，最多公開1張角色入手，其餘放牌底。再從手牌休息登場最多1張綠角色。對手前線有3張以上且該角色是歐爾麥特時改為活動。066はreadyにしない。'
 },
 {
  cardId:'MHA-1-070',
  sentence:'起動メイン。手札1枚を場外に置く。ターン1でこのキャラをアクティブ。',
  existingOps:['optionalHandOutsideActiveIf','discardHandBuffSelf'],
  whyNotEnough:'optionalHandOutsideActiveIf は效果句的條件，不是起動。discardHandBuffSelf はBPか發生能量で、活動自身ではない。',
  proposal:'起動時必須把手牌1張放場外，一回合一次，然後把這張角色活動。070はreadyにしない。'
 },
 {
  cardId:'MHA-1-071',
  sentence:'登場時、自分の手札を1枚場外に置く。',
  existingOps:['drawDiscard','optionalRemoveHandThen'],
  whyNotEnough:'drawDiscard は先に引く。optionalRemoveHandThen は任意で、しかも場外ではなく除外側の形がある。必須で抽牌なしの手札1枚場外がない。',
  proposal:'登場時必須把手牌1張放到場外，不抽牌。不能放時要沿用引擎既有的空牌處理，不可改成抽牌。071はreadyにしない。'
 },
 {
  cardId:'MHA-1-072',
  sentence:'ダメージ2。登場時、望む枚数を場外に置き手札が3枚になるまで引く。アタック時、望む枚数を場外に置き、その枚数×1000以下の相手フロントを1枚まで退場。',
  existingOps:['printedAttackDamage','discardToDraw','retireOppFrontHandTraitScale'],
  whyNotEnough:'printedAttackDamage は2で合っても、登場時の「手札が3枚になるまで」と攻撃時の枚数×1000退場は別の任意枚数コスト。retireOppFrontHandTraitScale は特徵張數を足す。',
  proposal:'傷害2。登場時可把任意張手牌放場外，再抽到手上有3張。攻擊時可把任意張放場外，再最多退場1張對手前線，BP上限是張數×1000。072はreadyにしない。'
 },
 {
  cardId:'MHA-1-074',
  sentence:'自分のターン中、ターン1、相手の効果で場を離れる場合、代わりに場を離れない。',
  existingOps:['grantOwnFrontChoiceProtection','oppEffectUntargetable'],
  whyNotEnough:'既存の保護は付与するか常時の效果對象外。這句是自己回合、一回合一次、對方效果要讓這張離場時改為不離場。',
  proposal:'自己回合、一回合一次，對方效果使這張角色離場時改為留在場上。074はreadyにしない。'
 },
 {
  cardId:'MHA-1-076',
  sentence:'登場時、フロントLにある場合、自分のエナジーLのキャラを1枚までフロントLへ移動。',
  existingOps:['moveEnergyTraitToFront','mayStepFrontFromEnergy'],
  whyNotEnough:'moveEnergyTraitToFront は特徵必須。這句沒有特徵，而且只有自己在前線時、最多1張。',
  proposal:'登場時若這張在前線，可把最多1張自己能量區角色移到前線。076はreadyにしない。'
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
  whyNotEnough:'蓋牌在自己底下、依張數加BP、登場時放2張、攻擊時可送1張場外才退場，沒有同一組 op。',
  proposal:'突襲框是爆豪勝己。自己回合，每張直接蓋在下面的牌BP+1000。登場時把牌庫頂2張蓋到自己下面。攻擊時可把1張蓋牌放場外，做到才最多退場1張對手前線BP2500以下。085はreadyにしない。'
 },
 {
  cardId:'MHA-1-087',
  sentence:'退場時、手札が2枚になるように引く。',
  existingOps:['draw','drawDiscard'],
  whyNotEnough:'draw は固定枚數。沒有「抽到手上正好2張」的退場時 op。',
  proposal:'退場時抽牌，直到手牌變成2張。手牌已有2張以上則不抽。087はreadyにしない。'
 },
 {
  cardId:'MHA-1-089',
  sentence:'登場時、自分の手札が3枚以下なら1枚引く。カラートリガーはBP2500以下の相手フロントを退場。',
  existingOps:['draw','ifLiveThen','retireOppFrontUnderBp','ownHandCountAtLeast'],
  whyNotEnough:'ownHandCountAtLeast は「以上」だけ。手牌3張以下才抽1的「以下」がない。顏色觸發不能單獨把整張標ready。',
  proposal:'登場時，自己手牌在抽牌前是3張以下才抽1。顏色觸發退場1張對手前線BP2500以下。089はreadyにしない。'
 },
 {
  cardId:'MHA-1-090',
  sentence:'レイド〈ホークス〉。登場時、手札を望む枚数裏向きで下に置く。アタック時、その裏向きを見て1枚まで手札に加え、加えたら他の〈ホークス〉以外を1枚までアクティブ。',
  existingOps:['raidName','activeOwnOther'],
  whyNotEnough:'任意張手牌蓋到自己下面，攻擊時看那些蓋牌、最多拿1張，拿到才活動其他非霍克斯。沒有這個閉合流程。',
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
  cardId:'MHA-1-093',
  sentence:'フロントL、ターン1。〈緑谷 出久〉以外が相手のキャラの効果で場を離れる場合、代わりに自分のライフ1枚を場外に置いてもよい。',
  existingOps:['grantOwnFrontChoiceProtection','ownLifeToOutside'],
  whyNotEnough:'代替離場的對象是其他非綠谷出久，支付是把自己的1張生命放場外，而且可以不做。不是這張自己的離場保護。',
  proposal:'這張在前線、一回合一次。其他非綠谷出久將因對方角色效果離場時，可以改為把自己1張生命放場外。093はreadyにしない。'
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
