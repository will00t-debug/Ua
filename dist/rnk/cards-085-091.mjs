// Card facts cross-checked against official TC and supplementary JP/EN sources.
// Effects are paraphrased source descriptions, NOT executable DSL. V2-ready=false.
import {tcCard} from './tc-source-helper.mjs';
export const RNK_CARDS_085_091=Object.freeze([
  {
    "id": "RNK-1-085",
    "name": "緋村劍心",
    "rarity": "C",
    "color": "red",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "effectZhTw": "階梯；在我方回合，與本角色戰鬥敗北的對手角色改移往能源線而不退場；若對手能源線滿，對手先選一張能源線卡放移除區。",
    "traits": []
  },
  {
    "id": "RNK-1-086",
    "name": "緋村劍心",
    "rarity": "U",
    "color": "red",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "我方回合擊敗的對手角色改移往能源線；登場查看牌庫頂3張，可取一張緋村劍心入手，其餘放底；若取牌需棄1。",
    "traits": []
  },
  {
    "id": "RNK-1-087",
    "name": "緋村劍心",
    "rarity": "U",
    "color": "red",
    "energy": 0,
    "ap": 1,
    "bp": 3000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "effectZhTw": "我方回合與本角色對戰敗北的對手改移往能源線而不退場；線滿時先移除對手能源線一張。",
    "traits": []
  },
  {
    "id": "RNK-1-088",
    "name": "緋村劍心",
    "rarity": "R",
    "color": "red",
    "energy": 3,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "color",
    "effectZhTw": "衝擊無效；我方回合擊敗對手角色改移能源線；登場可棄1手牌，若如此活動自身。",
    "traits": []
  },
  {
    "id": "RNK-1-089",
    "name": "緋村劍心",
    "rarity": "R",
    "color": "red",
    "energy": 4,
    "ap": 2,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "get",
    "effectZhTw": "以活動登場；登場抽1棄1；前線啟動主要每回合一次，從場外移除一張不殺之誓，若如此抽1並讓我方所有緋村劍心本回合失去「我方回合中」能力。",
    "traits": []
  },
  {
    "id": "RNK-1-090",
    "name": "緋村劍心",
    "rarity": "SR",
    "color": "red",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "raid",
    "effectZhTw": "我方回合對戰敗北的敵方角色改移能源線；突襲緋村劍心；攻擊時每回合一次可棄1將自身重新活動；登場抽1。",
    "traits": []
  },
  {
    "id": "RNK-1-091",
    "name": "明神彌彥",
    "rarity": "C",
    "color": "red",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "-",
    "traits": []
  }
].map(row=>tcCard(row, Number(row.id.slice(-3))>=101?'UA41ST':'UA41BT')));
