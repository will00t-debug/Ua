// Official UNION ARENA Traditional Chinese source-based card facts.
// Text is a concise faithful effect synopsis, not yet an executable rules program.
// Original card images, numbers and full rules are accessible at sourceTc.
import {tcRows} from './tc-source-helper.mjs';
export const RNK_CARDS_036_042=tcRows([
  {
    "id": "RNK-1-036",
    "name": "齋藤一",
    "rarity": "C",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "effectZhTw": "登場查看牌庫頂3張，公開最多1張緋村劍心、齋藤一或相樂左之助加入手牌；其餘任意順序放牌庫底，若有加入則棄1。"
  },
  {
    "id": "RNK-1-037",
    "name": "齋藤一",
    "rarity": "U",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "登場可將我方一張緋村劍心、齋藤一或相樂左之助移往另一戰線。"
  },
  {
    "id": "RNK-1-038",
    "name": "齋藤一",
    "rarity": "R",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "type": "character",
    "trigger": "color",
    "effectZhTw": "若我方場上沒卡，手牌能源需求減紫2；攻擊時可將我方前線一張緋村劍心、其他齋藤一或相樂左之助返回手牌，若如此本回合BP+1500。",
    "bpMark": "+"
  },
  {
    "id": "RNK-1-039",
    "name": "齋藤一",
    "rarity": "SR",
    "color": "purple",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "raid",
    "effectZhTw": "突襲齋藤一；衝擊無效；BP2000以下角色不能防禦；登場查看牌庫頂5張，取最多1張緋村劍心、齋藤一或相樂左之助，其餘放底。"
  },
  {
    "id": "RNK-1-040",
    "name": "齋藤一",
    "rarity": "SR",
    "color": "purple",
    "energy": 6,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "raid",
    "effectZhTw": "突襲齋藤一並有衝擊1；登場且我方場上沒有具特徵卡時，本回合BP+1000、可由能源線攻擊；從能源線攻擊時移往前線並獲狙擊。",
    "bpMark": "+"
  },
  {
    "id": "RNK-1-041",
    "name": "相樂左之助",
    "rarity": "U",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 2,
    "type": "character",
    "trigger": null,
    "effectZhTw": "登場將我方場上一張其他能源需求1以下角色返回手牌；無法返回時返回自身。"
  },
  {
    "id": "RNK-1-042",
    "name": "相樂左之助",
    "rarity": "R",
    "color": "purple",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "登場可支付1AP；若支付可讓最多1張對手場域卡退場。"
  }
]);
