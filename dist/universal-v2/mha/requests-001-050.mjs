// Cards in UA10BT 001-050 that are not ready. 003, 005, 011 and 026 are
// ready against the round 15 contract. The sentences below still are not
// a whole printed sentence.
// C group does not approximate a missing sentence.
// MHA-1-044 is the same card as the UA10ST printing. Its activate is
// restSelfGainEnergyRetireEndMain, so it is ready and is not listed here.
export const MHA_REQUESTS_001_050=Object.freeze({
 'MHA-1-030':gap('場上沒有〈トゥワイス〉不能打出。從手牌或場外把任意張能量 2 以下、AP1 的〈トゥワイス〉以橫置回復狀態登場。',
  'playRequiresOwnName 能擋下沒有〈トゥワイス〉的事件。deployNamedFromZones 一次只讓一張指名卡從手牌或場外進場，而且是可跳過的。印刷是任意張、必要能源 2 以下、AP1、橫置回復。不要只做一張。'),
 'MHA-1-031':gap('從場外最多取 1 張死穢八斎會角色到手牌，再把 1 張付得起能量、AP1 的該特徵手牌以橫置或突襲登場。',
  'outsideRecoverOrRestPlay 只寫在角色登場時，而且是依顏色、特徵與能源二擇一。這張是事件：先從場外最多入手 1 張死穢八斎會角色，再從手牌把付得起能量、AP1 的同特徵角色橫置登場或突襲。'),
 'MHA-1-035':gap('在前排時，對手全部角色失去步進、狙擊、雙重攻擊、雙重阻擋、衝擊、傷害與衝擊無效。登場時可橫置對手前排 1 張。Q439–Q441。',
  'restOppFrontOne 只能橫置。沒有在前排時一次剝除步進、狙擊、雙重攻擊、雙重阻擋、衝擊、傷害與衝擊無效的光環。Q439 的衝擊含衝擊 1 與衝擊+1，Q440 的傷害含傷害 2 與傷害+1。只做橫置會漏掉主句。'),
 'MHA-1-042':gap('登場時可讓其他橫置中、不是麗日 お茶子的前排角色回手；若如此，從手牌把 1 張能量 3 以下、AP1 的綠角色以橫置回復狀態登場。',
  '沒有「可選回手其他橫置回復中、不是〈麗日 お茶子〉的前排角色，只有回手成功才從手牌把能量 3 以下、AP1 的綠角色以橫置回復狀態登場」。'),
 'MHA-1-045':gap('自己前排沒有角色且對手前排有 3 張以上時，手牌綠能量 -6 且 AP-1。不能進能量列。印刷衝擊 1。對手角色攻擊時，可讓橫置的這張回復，若如此本回合 BP-1000。Q443、Q509。',
  'energyLineForbidden 只覆蓋不能進能量列。其餘條件減免、衝擊與攻擊反應都沒有對應。')
});

function gap(sentence, whyNotEnough){
 return Object.freeze({sentence, whyNotEnough, needs:'A'});
}
