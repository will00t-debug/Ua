// Card facts cross-checked against official TC and supplementary JP/EN sources.
// Effects are paraphrased source descriptions, NOT executable DSL. V2-ready=false.
import {tcCard} from './tc-source-helper.mjs';
export const RNK_CARDS_099_105=Object.freeze([
  {
    "id": "RNK-1-099",
    "name": "二重之極",
    "rarity": "U",
    "color": "red",
    "energy": 4,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "special",
    "effectZhTw": "僅我方場上有相樂左之助可使用；使對手前線一張BP5000以下角色退場；若休息我方前線活動的相樂左之助，可改為放入移除區。",
    "traits": []
  },
  {
    "id": "RNK-1-100",
    "name": "龍槌閃",
    "rarity": "U",
    "color": "red",
    "energy": 4,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "special",
    "effectZhTw": "令對手前線最多一張BP5000以下的角色移往能源線；若我方場上有緋村劍心，可改為放到對手牌庫底。",
    "traits": []
  },
  {
    "id": "RNK-1-101",
    "name": "神谷薰",
    "rarity": "SR",
    "color": "red",
    "energy": 3,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "type": "character",
    "trigger": "draw",
    "effectZhTw": "攻擊階段結束時若本回合沒有對手角色退場，可休息自己並抽1；此卡名每回合一次。登場於能源線可棄1將自身活動。",
    "traits": []
  },
  {
    "id": "RNK-1-102",
    "name": "齋藤一",
    "rarity": "R",
    "color": "red",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "effectZhTw": "攻擊時可休息我方前線一張活動角色；若如此，本回合獲衝擊1。",
    "traits": []
  },
  {
    "id": "RNK-1-103",
    "name": "相樂左之助",
    "rarity": "R",
    "color": "red",
    "energy": 4,
    "ap": 2,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "以活動登場；前線每回合一次，從活動因效果被休息時重新活動；登場時本回合對手必須盡可能防禦此角色的攻擊。",
    "traits": []
  },
  {
    "id": "RNK-1-104",
    "name": "關原妙＆三條燕",
    "rarity": "C",
    "color": "red",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "登場查看牌庫頂一張，選擇留頂或放牌庫底。",
    "traits": []
  },
  {
    "id": "RNK-1-105",
    "name": "緋村劍心",
    "rarity": "U",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "effectZhTw": "我方回合自身BP-1000；我方回合與自身戰鬥敗北的對手改移往能源線而不退場。",
    "traits": [],
    "bpMark": "-"
  }
].map(row=>tcCard(row, Number(row.id.slice(-3))>=101?'UA41ST':'UA41BT')));
