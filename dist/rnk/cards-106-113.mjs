// Card facts cross-checked against official TC and supplementary JP/EN sources.
// Effects are paraphrased source descriptions, NOT executable DSL. V2-ready=false.
// NOTE: RNK-1-106's official TC page has erroneous effect; verified EN/JP alternative retained.
import {tcCard} from './tc-source-helper.mjs';
const EN_106='https://www.unionarena-tcg.com/en/cardlist/detail_iframe.php?card_no=UA41ST%2FRNK-1-106';
export const RNK_CARDS_106_113=Object.freeze([
  {
    "id": "RNK-1-106",
    "name": "緋村劍心",
    "rarity": "SR",
    "color": "red",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "raid",
    "effectZhTw": "我方回合戰敗的對手角色移往能源線而非退場；突襲緋村劍心；衝擊1；登場將對手前線最多一張角色移往能源線，滿線時對手先移除一張能源線卡。",
    "traits": [],
    "needsManualReview": true,
    "sourceNote": "TC official source mismatches English official source; use confirmed official English/Japanese raid+impact+move effect."
  },
  {
    "id": "RNK-1-107",
    "name": "明神彌彥",
    "rarity": "C",
    "color": "red",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "type": "character",
    "trigger": null,
    "effectZhTw": "衝擊無效：與此角色戰鬥的對手失去衝擊。",
    "traits": []
  },
  {
    "id": "RNK-1-108",
    "name": "神谷道場",
    "rarity": "U",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 0,
    "gen": 1,
    "type": "field",
    "trigger": "get",
    "effectZhTw": "啟動主要：休息此場域，抽1張並棄1張。",
    "traits": []
  },
  {
    "id": "RNK-1-109",
    "name": "逆刃刀",
    "rarity": "C",
    "color": "red",
    "energy": 2,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "type": "event",
    "trigger": "draw",
    "effectZhTw": "抽1張，並可令我方一張緋村劍心本回合獲得攻擊時抽1張的效果。",
    "traits": []
  },
  {
    "id": "RNK-1-110",
    "name": "四乃森蒼紫",
    "rarity": "R",
    "color": "blue",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "raid",
    "effectZhTw": "突襲四乃森蒼紫；衝擊無效；登場看牌庫頂3張，取最多一張御庭番眾或名稱包含回天劍舞的事件牌入手，其餘放底。",
    "traits": [
      "御庭番眾"
    ]
  },
  {
    "id": "RNK-1-111",
    "name": "比古清十郎",
    "rarity": "R",
    "color": "blue",
    "energy": 3,
    "ap": 1,
    "bp": 4000,
    "gen": 2,
    "type": "character",
    "trigger": "active",
    "effectZhTw": "不能在前線登場，除自身效果外不能移往前線；登場看牌庫頂2張，可任意張數留頂其餘送場外；主階段每回合一次棄2，需有緋村劍心才能移至另一線。",
    "traits": []
  },
  {
    "id": "RNK-1-112",
    "name": "志志雄真實",
    "rarity": "R",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "effectZhTw": "登場將一張手牌放回牌庫頂。",
    "traits": []
  },
  {
    "id": "RNK-1-113",
    "name": "齋藤一",
    "rarity": "R",
    "color": "purple",
    "energy": 4,
    "ap": 1,
    "bp": 4000,
    "gen": 1,
    "type": "character",
    "trigger": "draw",
    "effectZhTw": "攻擊時可抽1張；若抽，下一次不能成為活動。",
    "traits": []
  }
].map(row=>{
  const card=tcCard(row, 'UA41ST');
  // TC official detail accidentally shows the text of another event card;
  // the independent official EN card page confirms raid/impact/move text.
  if(row.id==='RNK-1-106')return Object.freeze({
    ...card,source:EN_106,sourceEn:EN_106,
    confirmedTc:false,confirmedEn:true,needsManualReview:true
  });
  if(row.id==='RNK-1-112'||row.id==='RNK-1-113')return Object.freeze({
    ...card,
    needsManualReview:true,
    sourceNote:'Official TC page shows a blue generation symbol although the card color is purple. Compare the physical/Japanese card before accepting generation color.'
  });
  return card;
}));
