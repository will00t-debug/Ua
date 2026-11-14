// Cards in UA10BT 001-050 that are not ready. 006, 007, 009, 010, 017 and
// 048 are ready. The sentences below were checked against the round 14
// contract and still are not a whole printed sentence.
// C group does not approximate a missing sentence.
// MHA-1-044 is the same card as the UA10ST printing. Its activate is
// restSelfGainEnergyRetireEndMain, so it is ready and is not listed here.
export const MHA_REQUESTS_001_050=Object.freeze({
 'MHA-1-002':gap('登場時可選的磨牌 3 張，以及主階段橫置並退場後從場外取死穢八斎會角色或〈“個性”消失弾〉。Q421：指名卡不必有特徵。',
  'millUpToThenRecover 的可選 3 張，以及 restRetireSequence 後的 recoverOutsideAny，已經能表示這兩句。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-003':gap('自己場上有 3 張以上帶【起動メイン】的角色時，這張 BP+1000。',
  'ownActivateMainAtLeast 會數場上的起動，而且突襲框裡、目前沒有突襲的起動不算。被動 BP 已能接這個條件。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-004':gap('3 張以上【起動メイン】時手牌紫能量-3、印刷衝擊 1，以及每回合一次複製同列其他角色的【起動メイン】（其他オール・フォー・ワン除外）。',
  '手牌能量減免、起動張數與印刷衝擊已有。gainSameLineMains 會快照同列其他角色的起動，並用原本的支付、每回合限制、目標與結算重放已對應的起動。突襲框裡且目前沒有突襲的起動不會被複製。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-005':gap('場上沒有オール・フォー・ワン或死柄木 弔就不能攻擊或阻擋；自己回合 BP+2000；每回合一次賦予傷害 2。',
  'battleRequiresAnyName、ownTurnBp，以及前線或能量列的 frontOnceProgram 賦予傷害 2，都已經能用。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-011':gap('擋過這張的角色下一次不橫置回復；主階段每回合一次使對手本回合必須盡可能阻擋。Q427、Q428。',
  'blockSkipsNextActive 會讓擋下這張的角色跳過下一次活動。frontOnceProgram 也能賦予必須阻擋。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-020':gap('任何帶突襲觸發的自己角色可以突襲到這張上。登場時公開牌庫頂 1 張入手；若沒有突襲觸發，把手牌 1 張放到場外。Q431。',
  '沒有「被任意突襲觸發卡當作突襲基」以及公開頂牌的條件棄牌。'),
 'MHA-1-023':gap('前排主階段每回合一次：其他自己角色 BP+1000；若是ジェントル・クリミナル則改 +2000 並獲得狙擊。',
  '沒有依指名角色改加值並附帶狙擊的起動。'),
 'MHA-1-025':gap('登場時看牌庫頂 4 張，公開並最多取 1 張死穢八斎會角色或〈エリ〉，其餘以任意順序放回底部；若有取牌，把手牌 1 張放到場外。Q432、Q433。',
  '現有頂牌檢索不是「特徵或指名卡」再棄 1 張手牌。'),
 'MHA-1-026':gap('突襲〈オーバーホール〉、印刷衝擊 1，以及可選磨 3 張後回收場外死穢八斎會角色（オーバーホール除外）或〈エリ〉。Q434。',
  'millUpToThenRecover 的可選 3 張，回收 anyOf 可以是特徵或卡名，excludeName 會排除指名卡。突襲名與印刷衝擊已有。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-029':gap('沒有〈オーバーホール〉不能打出。登場時橫置對手前排 1 張並把它下面的卡全部放到場外；這張場地還在時，該角色失去原本效果且不橫置回復。Q435–Q438、Q474、Q974、Q2213。',
  'restOppFrontOne 只橫置，沒有下方卡、失能與持續不能回復。'),
 'MHA-1-030':gap('場上沒有〈トゥワイス〉不能打出。從手牌或場外把任意張能量 2 以下、AP1 的〈トゥワイス〉以橫置回復狀態登場。',
  'playRequiresOwnName 能擋下沒有〈トゥワイス〉的事件。deployNamedFromZones 一次只讓一張指名卡從手牌或場外進場，而且是可跳過的。印刷是任意張、必要能源 2 以下、AP1、橫置回復。不要只做一張。'),
 'MHA-1-031':gap('從場外最多取 1 張死穢八斎會角色到手牌，再把 1 張付得起能量、AP1 的該特徵手牌以橫置或突襲登場。',
  'outsideRecoverOrRestPlay 只寫在角色登場時，而且是依顏色、特徵與能源二擇一。這張是事件：先從場外最多入手 1 張死穢八斎會角色，再從手牌把付得起能量、AP1 的同特徵角色橫置登場或突襲。'),
 'MHA-1-035':gap('在前排時，對手全部角色失去步進、狙擊、雙重攻擊、雙重阻擋、衝擊、傷害與衝擊無效。登場時可橫置對手前排 1 張。Q439–Q441。',
  'restOppFrontOne 只能橫置。沒有在前排時一次剝除步進、狙擊、雙重攻擊、雙重阻擋、衝擊、傷害與衝擊無效的光環。Q439 的衝擊含衝擊 1 與衝擊+1，Q440 的傷害含傷害 2 與傷害+1。只做橫置會漏掉主句。'),
 'MHA-1-042':gap('登場時可讓其他橫置中、不是麗日 お茶子的前排角色回手；若如此，從手牌把 1 張能量 3 以下、AP1 的綠角色以橫置回復狀態登場。',
  '沒有「可選回手後才主動登場」的登場時。'),
 'MHA-1-045':gap('自己前排沒有角色且對手前排有 3 張以上時，手牌綠能量 -6 且 AP-1。不能進能量列。印刷衝擊 1。對手角色攻擊時，可讓橫置的這張回復，若如此本回合 BP-1000。Q443、Q509。',
  'energyLineForbidden 只覆蓋不能進能量列。其餘條件減免、衝擊與攻擊反應都沒有對應。')
});

function gap(sentence, whyNotEnough){
 return Object.freeze({sentence, whyNotEnough, needs:'A'});
}
