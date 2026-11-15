// Card facts cross-checked against official TC and supplementary JP/EN sources.
// Effects are paraphrased source descriptions, NOT executable DSL. V2-ready=false.
import {tcCard} from './tc-source-helper.mjs';
export const RNK_CARDS_092_098=Object.freeze([
  {
    "id": "RNK-1-092",
    "name": "明神彌彥",
    "rarity": "R",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "場上無卡時，手牌能源需求-紅2；階梯可於移動階段從前線移往能源線。",
    "traits": []
  },
  {
    "id": "RNK-1-093",
    "name": "明神彌彥",
    "rarity": "SR",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": "color",
    "effectZhTw": "啟動主要支付1AP每回合一次：抽1且自身本回合BP+1000；攻擊時可棄1，若如此活動我方最多一張本回合尚未攻擊的角色。",
    "traits": [],
    "bpMark": "+"
  },
  {
    "id": "RNK-1-094",
    "name": "赤牛",
    "rarity": "C",
    "color": "red",
    "energy": 1,
    "ap": 1,
    "bp": 0,
    "gen": 1,
    "type": "field",
    "trigger": "get",
    "effectZhTw": "登場查看牌庫頂3張，取最多一張角色入手，其餘放底；若取的不是相樂左之助需棄1。",
    "traits": []
  },
  {
    "id": "RNK-1-095",
    "name": "惡一文字",
    "rarity": "C",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "draw",
    "effectZhTw": "令我方最多一張相樂左之助本回合BP+1500並獲衝擊1，並抽1。",
    "traits": []
  },
  {
    "id": "RNK-1-096",
    "name": "不殺之誓",
    "rarity": "U",
    "color": "red",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "final",
    "effectZhTw": "將最多2張我方AP轉為活動。",
    "traits": []
  },
  {
    "id": "RNK-1-097",
    "name": "絕對不能輸！！！",
    "rarity": "U",
    "color": "red",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "final",
    "effectZhTw": "將最多2張我方AP轉為活動。",
    "traits": []
  },
  {
    "id": "RNK-1-098",
    "name": "飛天御劍流",
    "rarity": "C",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": null,
    "effectZhTw": "令對手前線一張角色休息；本卡因我方紅色緋村劍心效果從手牌送場外時抽1。",
    "traits": []
  }
].map(row=>tcCard(row, Number(row.id.slice(-3))>=101?'UA41ST':'UA41BT')));
