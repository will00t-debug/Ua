// Cards in UA10BT 001-050 that are not ready. 006, 007, 009, 010, 017 and
// 048 are ready. The sentences below were checked against the round 14
// contract and still are not a whole printed sentence.
// C group does not approximate a missing sentence.
// MHA-1-044 is the same card as the UA10ST printing. Its activate is
// restSelfGainEnergyRetireEndMain, so it is ready and is not listed here.
export const MHA_REQUESTS_001_050=Object.freeze({
 'MHA-1-003':gap('自己場上有 3 張以上帶【起動メイン】的角色時，這張 BP+1000。',
  'ownActivateMainAtLeast 會數場上的起動，而且突襲框裡、目前沒有突襲的起動不算。被動 BP 已能接這個條件。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-005':gap('場上沒有オール・フォー・ワン或死柄木 弔就不能攻擊或阻擋；自己回合 BP+2000；每回合一次賦予傷害 2。',
  'battleRequiresAnyName、ownTurnBp，以及前線或能量列的 frontOnceProgram 賦予傷害 2，都已經能用。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-011':gap('擋過這張的角色下一次不橫置回復；主階段每回合一次使對手本回合必須盡可能阻擋。Q427、Q428。',
  'blockSkipsNextActive 會讓擋下這張的角色跳過下一次活動。frontOnceProgram 也能賦予必須阻擋。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-026':gap('突襲〈オーバーホール〉、印刷衝擊 1，以及可選磨 3 張後回收場外死穢八斎會角色（オーバーホール除外）或〈エリ〉。Q434。',
  'millUpToThenRecover 的可選 3 張，回收 anyOf 可以是特徵或卡名，excludeName 會排除指名卡。突襲名與印刷衝擊已有。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-029':gap('沒有〈オーバーホール〉不能打出。登場時橫置對手前排 1 張並把它下面的卡全部放到場外；這張場地還在時，該角色失去原本效果且不橫置回復。Q435–Q438、Q474、Q974、Q2213。',
  'restOppFrontOne 只橫置，沒有下方卡、失能與持續不能回復。'),
 'MHA-1-030':gap('場上沒有〈トゥワイス〉不能打出。從手牌或場外把任意張能量 2 以下、AP1 的〈トゥワイス〉以橫置回復狀態登場。',
  '沒有這個出場條件與任意張指名登場。'),
 'MHA-1-031':gap('從場外最多取 1 張死穢八斎會角色到手牌，再把 1 張付得起能量、AP1 的該特徵手牌以橫置或突襲登場。',
  '沒有「場外入手後再橫置登場或突襲」的事件。'),
 'MHA-1-033':gap('場上有〈死柄木 弔〉時手牌 AP-1。選對手前排 BP4000 以下 1 張放到退場區。',
  '退場操作會放到場外，不是退場區。AP 減免也是另一句。'),
 'MHA-1-035':gap('在前排時，對手全部角色失去步進、狙擊、雙重攻擊、雙重阻擋、衝擊、傷害與衝擊無效。登場時可橫置對手前排 1 張。Q439–Q441。',
  '沒有一次剝除這七種能力的前排光環。只做橫置會漏掉主句。'),
 'MHA-1-038':gap('下面有 2 張以上蓋牌時獲得雙重阻擋；4 張以上時再獲得雙重攻擊。主階段每回合一次把牌庫頂蓋到這張下面。Q442、Q632。',
  'onceTuckFacedown 已可把牌庫頂蓋到自己下面。facedownKeywordThresholds 會在宣告當下依直接蓋牌張數給雙重阻擋或雙重攻擊。這輪不寫卡牌程式，所以維持 pending。'),
 'MHA-1-042':gap('登場時可讓其他橫置中、不是麗日 お茶子的前排角色回手；若如此，從手牌把 1 張能量 3 以下、AP1 的綠角色以橫置回復狀態登場。',
  '沒有「可選回手後才主動登場」的登場時。'),
 'MHA-1-045':gap('自己前排沒有角色且對手前排有 3 張以上時，手牌綠能量 -6 且 AP-1。不能進能量列。印刷衝擊 1。對手角色攻擊時，可讓橫置的這張回復，若如此本回合 BP-1000。Q443、Q509。',
  'energyLineForbidden 只覆蓋不能進能量列。其餘條件減免、衝擊與攻擊反應都沒有對應。')
});

function gap(sentence, whyNotEnough){
 return Object.freeze({sentence, whyNotEnough, needs:'A'});
}
