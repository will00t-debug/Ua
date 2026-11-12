// C group owns this file. One object per shared-engine gap.
// cardId, sentence, existingOps, whyNotEnough, proposal.
const NAMES='IMC-1-068、IMC-1-069、IMC-1-070、IMC-1-071、IMC-1-072、IMC-1-073、IMC-1-074、IMC-1-075、IMC-1-093、IMC-1-098';
const ENERGY='IMC-1-078、IMC-1-080、IMC-1-081、IMC-1-082、IMC-1-083、IMC-1-084、IMC-1-087、IMC-1-099';

export const IMC_REQUESTS_051_100=[
 {
  cardId:'IMC-1-098',
  sentence:'カードを1枚引く。次に使う特徴の手札は消費AP-1。場と場外のカード名が6種類以上なら次の1枚をアクティブ、9種類以上なら全てをアクティブ。',
  existingOps:['draw','nextEligibleHandPlayApDiscount'],
  whyNotEnough:'抽 1 可以結算。nextEligibleHandPlayApDiscount 結算時只用 field() 找來源，事件使用後已在場外，會丟出 Unproven hand discount source，所以不能掛上。ownDistinctTraitNames 只算前線與能源線，場外不算。也沒有「本回合下一張」與「本回合全部」活動登場的持續狀態。一般登場目前預設休息，enterAlwaysActive 不在 IMC 程式白名單。',
  proposal:'讓這個既有 AP-1 接受場外的事件來源，而且只在下一張符合特徵的手牌使用時消耗。另給持續狀態：同一組卡名、同名一次、自己要算、只影響該特徵，持續到本回合結束。6 種只改下一張，9 種改全部。一般前線登場是否活動也要能從 IMC 程式表達。抽 1 與特殊生命觸發已測，整張不標 ready。'
 },
 {
  cardId:'IMC-1-068',
  sentence:'自分の場と場外に［特徴：お願い！シンデレラ］のカード名が合計 N 種類以上。',
  existingOps:['draw','retireOppFrontUnderBp'],
  whyNotEnough:'同上，ownDistinctTraitNames 的 zone 沒有場外。IMC-1-068 的二選一、IMC-1-069 的抽牌替換、IMC-1-070 到 IMC-1-075、IMC-1-093 的加攻與衝擊都要用這個數字，而且 FAQ 規定這張自己要算進去。',
  proposal:'共用條件增加場與場外、依印刷卡名去重、可包含來源自己。影響 '+NAMES+'。在這之前這些卡不標 ready。'
 },
 {
  cardId:'IMC-1-080',
  sentence:'自分の場に必要エナジーが2の［特徴：Starry-Go-Round］が N 枚以上。',
  existingOps:['drawIfOwnTraitCount'],
  whyNotEnough:'ownCardTraitCount 與 drawIfOwnTraitCount 只數特徵，不過濾印刷必要能源恰好 2。以下與恰好不同。',
  proposal:'場上張數條件加上印刷必要能源恰好 N。影響 '+ENERGY+'。078 的登場還要把查看的 6 張裡恰好能源 2 的紅 Starry 休息登場。'
 },
 {
  cardId:'IMC-1-090',
  sentence:'このキャラがアクティブの場合、発生エナジー+赤。',
  existingOps:['grantFrontEnergyOwnOtherFrontTrait'],
  whyNotEnough:'activeExtraEnergy、emptyOwnFieldHandEnergyDiscount、blockBpRestriction、frontForbidden、opponentTurnBp、unblockedAttack、ownTurnBp 都已在引擎，但 IMC 程式白名單不接收、對戰包也不會抄過去。',
  proposal:'請 A 組讓這些既有欄位能從 IMC program 進到對戰卡。影響 IMC-1-054 的阻擋限制、IMC-1-061 的未被阻擋、IMC-1-073 的不能上前線、IMC-1-077 的空場減能源、IMC-1-090 的活動能源、IMC-1-097 的對方回合 BP-1000。'
 },
 {
  cardId:'IMC-1-066',
  sentence:'カードを2枚引く。相手の場にBP4500以上のキャラがある場合、さらにカードを1枚引く。',
  existingOps:['draw','drawIfOppCharacterBpAtLeast'],
  whyNotEnough:'drawIfOppCharacterBpAtLeast 的語意符合，但驗證只允許角色的登場時，事件不能使用。',
  proposal:'讓這個既有抽牌條件能用在事件登場，或提供事件可用的同一條件。066 先不標 ready，避免只做成無條件抽 2。'
 },
 {
  cardId:'IMC-1-051',
  sentence:'自分の場外から必要エナジーが2以下の［特徴：LiPPS］を1枚まで手札に加える。起動はレストかつ退場，對手有 BP4500 以上才可，再從場外休息登場藍的 LiPPS。',
  existingOps:['recoverOutsideUnderEnergy','deployOutsideFiltered'],
  whyNotEnough:'場外回收只看必要能源，沒有特徵。deployOutsideFiltered 是進場，不是回手。起動的雙費用與顏色加特徵的場外休息登場沒有對上的單一 op。',
  proposal:'場外依特徵與必要能源上限回手，以及休息並退場後的場外休息登場。051 整張先不標 ready。'
 },
 {
  cardId:'IMC-1-052',
  sentence:'相手のフロントLのキャラか、〈速水 奏〉以外の自分の場の［特徴：LiPPS］を1枚選び、BP+500。',
  existingOps:['buffOwnTrait','enemyBpDown'],
  whyNotEnough:'現有加攻的目標是自己場上或對手場上其中一種，沒有這個聯集，也沒有排除指定卡名。054 的第二個起動是同一句。',
  proposal:'一個必選目標：對手前線，或自己場上帶特徵且不是指定卡名。052 與 054 先不標 ready。'
 },
 {
  cardId:'IMC-1-055',
  sentence:'【ターン1】相手の場にBP4500以上のキャラがある場合のみ、このキャラはこのターン中、BP+2000。',
  existingOps:['buffSelf','drawIfOppCharacterBpAtLeast'],
  whyNotEnough:'onceBuffSelfWhen 鎖死 BP+1000，而且條件不是對手目前 BP 至少 4500。nameOnceActive 的 when 也沒有這個條件。IMC-1-060 是同一句再加衝擊無效。',
  proposal:'一回合一次的自身加攻，啟動前就檢查對手場上有目前 BP≥4500，沒有就不出現。IMC-1-055 與 IMC-1-060 先不標 ready。'
 },
 {
  cardId:'IMC-1-054',
  sentence:'〈速水 奏〉のこの効果は1ターンに1回のみ。相手の場にBP4500以上のキャラがある場合のみ、このキャラをアクティブにする。',
  existingOps:['draw'],
  whyNotEnough:'nameOnceActive 的 when 只有對手前線低於印刷 BP，或場外沒有某名字。不能表達 BP≥4500。第二句與 052 同一目標聯集。阻擋限制欄位也進不了程式。',
  proposal:'同名一回合一次的活動自身，門檻改為對手有目前 BP≥4500。Q2240 只算這一句，Q2241 兩張同名共用一次。054 先不標 ready。'
 },
 {
  cardId:'IMC-1-057',
  sentence:'手札から必要エナジーが2以下の青の［特徴：LiPPS］をレストで登場させる。アタックしてバトルに敗北した時アクティブ。BP4500以上なら引く。',
  existingOps:['deployOwnHandRest','drawIfOppCharacterBpAtLeast'],
  whyNotEnough:'deployOwnHandRest 強制比對消費 AP，印刷沒有寫消費 AP。Q2242 要求沒有登場也要抽。敗北後一回合一次的活動，以及突襲框內外尚未用卡圖判定。',
  proposal:'手牌休息登場的 AP 改為可省略。抽牌與登場分開。框內外確定前不把登場時寫進 raid-box。IMC-1-057、IMC-1-079、IMC-1-075 都碰到沒寫 AP 的手牌休息登場。'
 },
 {
  cardId:'IMC-1-061',
  sentence:'ブロックされなかった時、カードを1枚まで引く。APをアクティブにした場合、アタックフェイズ終了時に手札へ戻す。',
  existingOps:['draw','recoverAp'],
  whyNotEnough:'unblockedAttack 進不了 IMC 程式。Q2243 的時機是阻擋指定之後。沒有「本回合攻擊階段結束時，這張回手」的暫時規則。retireAtMainEnd 是主要階段結束退場，不是攻擊階段結束回手。',
  proposal:'既有未被阻擋的可選抽牌要能掛到 IMC 卡，並新增攻擊階段結束回手的暫時授予。061 先不標 ready。'
 },
 {
  cardId:'IMC-1-062',
  sentence:'BP3000以下を1枚選び退場。特徴が3枚以上ならBP5000以下に代わる。',
  existingOps:['retireOppFrontUnderBp'],
  whyNotEnough:'traitCountBonus 的驗證形狀是可選且排除自身。這句是必須選 1 張，門檻依場上特徵張數從 3000 升到 5000。099 是 2000 升到 5000，另外還有恰好能源 2 的張數才加攻。',
  proposal:'必須退場的 BP 上限能依場上特徵張數替換，不能改成可選，也不能漏算自己。062 與 099 先不標 ready。'
 },
 {
  cardId:'IMC-1-064',
  sentence:'BP5000以下を1枚選び手札に戻す。LiPPSが3枚以上なら退場に代えてもよい。',
  existingOps:['conditionalBounceOrRetireByOwnOutsideNames'],
  whyNotEnough:'現有替換看的是場外卡名，不是場上特徵張數。這句是必須選 1 張回手，達標時可以改退場。',
  proposal:'必須回手，並可依場上特徵張數改為退場。064 先不標 ready。'
 },
 {
  cardId:'IMC-1-065',
  sentence:'上から3枚見て、青の［特徴：ガールズ・イン・ザ・フロンティア］を1枚までレストで登場させるかレイドする。',
  existingOps:['searchTopOneBottomDiscard','deployOwnHandRestOrRaid'],
  whyNotEnough:'查看窗的其餘張要排到牌底。現有休息登場或突襲的來源是手牌，不是這 3 張。',
  proposal:'私人查看窗內最多 1 張休息登場或突襲，不能選的留在窗裡，其餘自訂順序放牌底。065 先不標 ready。'
 },
 {
  cardId:'IMC-1-072',
  sentence:'バトルに勝利し、場と場外のカード名が9種類以上なら1枚まで引く。手札の特徴を場外に置いた場合、このキャラをアクティブにする。',
  existingOps:['draw','optionalRemoveHandThen'],
  whyNotEnough:'勝利判定本身與現有戰鬥相同，Q2246 是攻擊方 BP≥阻擋方。種類數缺場外。optionalRemoveHandThen 的去向是移除區，不是場外，而且要先有種類門檻。',
  proposal:'攻擊勝利的可選抽牌接上場外種類數。可選手牌進場外，做到才活動自身。072 先不標 ready。'
 },
 {
  cardId:'IMC-1-075',
  sentence:'必要エナジーが1以下の自分の場の特徴を1枚手札に戻してもよい。そうした場合、手札から同じ條件をレストで登場させる。',
  existingOps:['bounceOwnOtherUnderEnergy','deployOwnHandRest'],
  whyNotEnough:'可選回手的 then 只接場外回收，不能限特徵，也不能接手牌休息登場。Q2248 要求剛回手的那張可以再登場，所以必須先完成回手再看手牌。種類數門檻另外缺場外。',
  proposal:'可選、限特徵與必要能源的回手，成功後才從新手牌休息登場，而且不額外加上印刷沒有的消費 AP。075 先不標 ready。'
 },
 {
  cardId:'IMC-1-087',
  sentence:'場外の必要エナジーが2のStarry-Go-Roundを1枚、場上已有3張則2枚，手札に加える。',
  existingOps:['recoverOutsideUnderEnergy','deployOutsideFiltered'],
  whyNotEnough:'回收沒有「恰好必要能源 2」加特徵，張數上限也不能依場上恰好能源 2 的張數從 1 改成 2。攻擊時的加攻可以重用，但整句未齊。突襲框內外未量。',
  proposal:'場外依特徵與恰好必要能源回手，張數上限看場上同一條件。IMC-1-087 與 IMC-1-094 的突襲框確定前不寫 raid-box。'
 },
 {
  cardId:'IMC-1-094',
  sentence:'アタック時、手札を1枚場外に置いてもよい。そうした場合、レイド元を1枚レストで登場させる。',
  existingOps:['deployOwnRaidBaseRest','inspectTopArrange'],
  whyNotEnough:'登場時看 2 張、最多 1 張進手、其餘場外，inspectTopArrange 可以接近，但攻擊句的費用是可選手牌進場外，現有突襲元休息登場沒有這個費用，而且是退場或登場時機。突襲框未量。',
  proposal:'攻擊時可選手牌進場外，做到才讓這張突襲元休息登場。094 先不標 ready。'
 },
 {
  cardId:'IMC-1-097',
  sentence:'このキャラはアタックできない。アタックフェイズ開始時、APを1支払うと元々の効果を失う。相手のターン中、BP-1000。',
  existingOps:['draw'],
  whyNotEnough:'不能攻擊目前是被賦予的 fieldRestrictions，不是會隨 originalEffectsDisabled 關掉的印刷旗標。沒有攻擊階段開始可付 1 AP 的時機。opponentTurnBp 進不了 IMC 程式。Q2250 到 Q2252：失去的是印刷效果，已獲得效果與別人給的 2 回阻擋留下。',
  proposal:'印刷的不能攻擊與對方回合 BP-1000 在失去原效果時一起停止，已獲得效果不停。攻擊階段開始的可選 AP 支付寫成持續狀態。097 先不標 ready。'
 }
];
