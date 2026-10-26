// V2-C SLG official-record allowlist. Never calls legacy solo-match reducer.
import {SOLO_LEVELING_CARDS} from '../solo-leveling.mjs';
import {createUniversalPack} from './pack.mjs';
const catalog=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const authored=[
// R56: UA51BT/SLG-1-021 all five printed clauses audited against JP card and Q2028.
{
 id:'SLG-1-021',name:'水篠 旬',color:'purple',energy:5,ap:1,bp:4000,
 gen:1,trigger:'raid',type:'character',implementation:'dsl',
 raidName:'水篠 旬',conditionalImpactBpAtLeast:6000,
 attackWinRecover:{basePrintedBp:2000,unit:5,bpPerGroup:500,excludeName:'水篠 旬'},
 effects:{
  onPlay:[{op:'grantSelfMustBlockThisTurn'}],
  onAttack:[{op:'buffSelfPerOwnOutsideGroups',unit:5,bpPerGroup:500}]
 },
 textAnchor:'戰鬥獲勝時可回收場外非水篠旬角色',
 officialTraits:[],catalogueTraits:[]
},
 // UA51BT/SLG-1-028: always ACTIVE on entry; its onPlay uses one shared
 // named physical choice across HAND and OUTSIDE, without normal AP.
 {"id":"SLG-1-028","name":"イグリット","color":"purple","energy":4,"ap":2,
  "bp":4000,"gen":1,"trigger":"get","type":"character",
  "textAnchor":"以ACTIVE登場","implementation":"dsl",
  "officialTraits":["影の軍団"],"catalogueTraits":["影之軍團"],
  "enterAlwaysActive":true,
  "effects":{"onPlay":[{"op":"deployNamedFromZones","name":"影の兵士",
   "zones":["hand","outside"],"line":"any","ready":false,"optional":true}]}},
 // 12 printed copies allowed; another own shadow-army card must exist before
 // inspecting TOP2. Printed name 水篠 旬 and exact trait 影の軍団 are OR filters.
 {"id":"SLG-1-030","name":"影の兵士","color":"purple","energy":0,"ap":1,
  "bp":1500,"gen":1,"trigger":"draw","type":"character","maxCopies":12,
  "textAnchor":"同卡號牌組最多12張","implementation":"dsl",
  "officialTraits":["影の軍団"],"catalogueTraits":["影之軍團"],
  "effects":{"onPlay":[{"op":"inspectTopTraitOutside","count":2,
   "trait":"影の軍団","orName":"水篠 旬",
   "requiresOtherOwnTrait":"影の軍団","rest":"top"}]}},
 {"id":"SLG-1-046","name":"水篠 旬","color":"green","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":null,"type":"character","textAnchor":"登場時：查看牌庫頂4張","implementation":"dsl","templateEffects":{"onPlay":[{"template":"searchTopOneBottomDiscardWhere","count":4,"filters":[{"field":"name","value":"水篠 旬"},{"field":"name","value":"デイリークエスト"}],"logic":"any"}]}},
  {"id":"SLG-1-070","name":"シーマ","color":"green","energy":0,
   "ap":1,"bp":1000,"gen":1,"trigger":"active","type":"character",
   "textAnchor":"登場時令另一己方DFN角色最多1張",
   "implementation":"dsl",
   "effects":{"onPlay":[{"op":"grantSelectionApTaxOwnOtherTrait",
     "trait":"DFN","optional":true,"until":"nextOpponentTurn"}]},
   "officialTraits":["DFN／第四次架南島レイド"],
   "traitComponents":["DFN","第四次架南島レイド"],
   "catalogueTraits":["DFN","第四次架南島Raid"]
  },
  {"id":"SLG-1-053","name":"諸菱 賢太","color":"green","energy":3,
   "ap":1,"bp":2000,"gen":2,"trigger":"draw","type":"character",
   "textAnchor":"Impact無效。登場時若場上有己方水篠旬，抽1張。",
   "implementation":"dsl","impactNull":true,
   "effects":{"onPlay":[{"op":"drawIfOwnName","name":"水篠 旬","count":1}]}},

  {"id":"SLG-1-042","name":"馬渕 勲","color":"green","energy":0,
   "ap":1,"bp":1000,"gen":1,"trigger":null,"type":"character",
   "textAnchor":"主要階段每回合一次REST自己，額外產生1綠能源，主要階段結束時退場。",
   "implementation":"dsl","effects":{},
   "mainAbility":{"op":"restSelfGainEnergyRetireEndMain",
     "energyOnly":true,"oncePerTurn":true,"extraEnergy":1}},

  {
    "id":"SLG-1-004","name":"犬飼 晃","color":"purple",
    "energy":3,"ap":1,"bp":3500,"gen":1,"trigger":"draw",
    "type":"character",
    "textAnchor":"自己的回合中，若本回合曾以己方效果將手牌送場外或從場外回收手牌",
    "implementation":"dsl",
    "effects":{"onPlay":[{"op":"drawDiscard","count":1}]},
    "passiveBonuses":[{"condition":{"kind":"ownEffectHandOutsideOrRecovery",
      "turn":"own"},"bp":500}]
  },
  {
    "id":"SLG-1-007","name":"エシル","color":"purple",
    "energy":0,"ap":1,"bp":500,"gen":1,"trigger":"draw",
    "type":"character","textAnchor":"退場時抽1張",
    "implementation":"dsl","effects":{"onRetire":[{"op":"draw","count":1}]}
  },
  {
    "id":"SLG-1-008","name":"エシル","color":"purple",
    "energy":1,"ap":1,"bp":2000,"gen":1,"trigger":null,
    "type":"character",
    "textAnchor":"經自己效果從場外加入手牌時",
    "implementation":"dsl",
    "templateEffects":{
      "onOutsideRecover":[{"template":"drawDiscardOne"}],
      "onPlay":[{"template":"searchTopOneBottomDiscardWhere",
        "count":4,"filters":[
         {"field":"name","value":"水篠 旬"},
         {"field":"name","value":"悪魔の城"}
        ],"logic":"any"}]
    }
  },
  {
    "id":"SLG-1-014","name":"水篠 聡子","color":"purple",
    "energy":2,"ap":1,"bp":1000,"gen":1,"trigger":null,
    "type":"character","textAnchor":"經自己的效果從場外加入手牌時",
    "implementation":"dsl","frontForbidden":true,
    "ownOutsideRecovery":{"op":"restSelfToEnergy","optional":true,"rest":true},
    "effects":{"onPlay":[{"op":"millTop","count":1}]}
  },
  {
    "id":"SLG-1-013","name":"水篠 葵","color":"purple",
    "energy":0,"ap":1,"bp":1000,"gen":1,"trigger":null,
    "type":"character","textAnchor":"主要階段每回合一次：REST此角色",
    "implementation":"dsl","effects":{},
    "mainAbility":{"op":"restSelfGainEnergyRetireEndMain",
      "energyOnly":true,"oncePerTurn":true,"extraEnergy":1}
  },
  {
    "id":"SLG-1-025","name":"観月 絵里","color":"purple",
    "energy":3,"ap":2,"bp":2000,"gen":2,"trigger":"active",
    "type":"character","textAnchor":"登場時選一項：抽2張",
    "implementation":"dsl",
    "effects":{"onPlay":[{"op":"chooseOne","optional":false,"options":[
      {"id":"drawTwo","label":"抽兩張牌","turn":"any",
       "then":[{"op":"draw","count":2}]},
      {"id":"drawRecover","label":"抽一張，再回收最多一張能源3以下無特徵角色",
       "turn":"any","then":[{"op":"draw","count":1},
        {"op":"recoverOutsideTraitlessUnderEnergy","energy":3,"optional":true}]}
    ]}]}
  },
  {
    "id":"SLG-1-002","name":"朝比奈 りん","color":"purple",
    "energy":0,"ap":1,"bp":500,"gen":1,"trigger":"draw",
    "type":"character","textAnchor":"登場時選一項：抽1張後將1張手牌送場外",
    "implementation":"dsl",
    "effects":{"onPlay":[{"op":"chooseOne","optional":false,"options":[
      {"id":"drawDiscard","label":"抽一張，再將一張手牌送場外",
       "turn":"any","then":[{"op":"drawDiscard","count":1}]},
      {"id":"buffOther","label":"至多選其他己方角色 BP＋1000",
       "turn":"own","then":[{"op":"buffOwnField","filter":{"field":"type","value":"character"},
        "bp":1000,"optional":true,"excludeSelf":true}]}
    ]}]}
  },
  {
    "id":"SLG-1-001","name":"朝比奈 りん","color":"purple",
    "energy":1,"ap":1,"bp":2500,"gen":1,"trigger":null,
    "type":"character","textAnchor":"自己的回合中，若場外至少5張卡",
    "implementation":"dsl","effects":{},
    "passiveBonuses":[{"condition":{"kind":"outsideCount","turn":"own","min":5},"bp":500}]
  },
  {
    "id":"SLG-1-009","name":"向坂 雫","color":"purple",
    "energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"active",
    "type":"character","textAnchor":"主要階段每回合一次：將1張手牌送場外",
    "implementation":"dsl","effects":{},
    "mainAbility":{"op":"discardHandBuffSelf","oncePerTurn":true,
      "discardCount":1,"bp":1500}
  },
  {
    "id":"SLG-1-010","name":"向坂 雫","color":"purple",
    "energy":3,"ap":1,"bp":3000,"gen":1,"trigger":"draw",
    "type":"character","textAnchor":"自己的回合中，若場外有10張以上",
    "implementation":"dsl","effects":{},
    "passiveBonuses":[{"condition":{"kind":"outsideCount","turn":"own","min":10},"bp":1000}]
  },
  {
    "id": "SLG-1-005",
    "name": "今宮 さつき",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "trigger": "draw",
    "type": "character",
    "textAnchor": "無印刷角色能力",
    "implementation": "vanilla",
    "effects": {}
  },
  {
    "id": "SLG-1-006",
    "name": "今宮 さつき",
    "color": "purple",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "trigger": null,
    "type": "character",
    "textAnchor": "此角色處於AC",
    "implementation": "dsl",
    "activeExtraEnergy": 1,
    "effects": {}
  },
  {
    "id": "SLG-1-012",
    "name": "後藤 清臣",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "trigger": null,
    "type": "character",
    "textAnchor": "己方場上存在水篠旬",
    "implementation": "dsl",
    "templateEffects": {"onPlay":[{"template":"drawIfOwnName","name":"水篠 旬","count":1}]}
  },
  {
    "id": "SLG-1-015",
    "name": "水篠 旬",
    "color": "purple",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "trigger": "get",
    "type": "character",
    "textAnchor": "無印刷角色能力",
    "implementation": "vanilla",
    "effects": {}
  },
  {
    "id": "SLG-1-016",
    "name": "水篠 旬",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 3000,
    "gen": 2,
    "trigger": null,
    "type": "character",
    "textAnchor": "IMPACT無",
    "implementation": "dsl",
    "impactNull": true,
    "templateEffects": {
      "onPlay": [
        {
          "template": "millTop",
          "count": 2
        }
      ]
    }
  },
  {
    "id": "SLG-1-018",
    "name": "水篠 旬",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 2500,
    "gen": 2,
    "trigger": "color",
    "type": "character",
    "textAnchor": "牌庫頂3張",
    "implementation": "dsl",
    "triggerEffect": {
      "op": "deployOutsideCharacter",
      "color": "purple",
      "maxEnergy": 2,
      "ap": 1,
      "frontOnly": true
    },
    "templateEffects": {
      "onPlay": [{
        "template": "searchTopOneBottomDiscardWhere",
        "count": 3,
        "filters": [
          {"field": "name", "value": "水篠 旬"},
          {"field": "trait", "value": "影之軍團"}
        ],
        "logic": "any"
      }]
    }
  },
  {
    "id": "SLG-1-026",
    "name": "諸菱 賢太",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 2,
    "trigger": null,
    "type": "character",
    "textAnchor": "登場時讓另一己",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {
          "template": "bounceOwnOtherUnderEnergy",
          "energy": 1
        }
      ]
    }
  },
  {
    "id": "SLG-1-032",
    "name": "タンク",
    "color": "purple",
    "energy": 1,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "trigger": "active",
    "type": "character",
    "textAnchor": "IMPACT無",
    "implementation": "dsl",
    "impactNull": true,
    "effects": {}
  },
  {
    "id": "SLG-1-036",
    "name": "あの人に追いつきたい",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "trigger": "active",
    "type": "event",
    "textAnchor": "抽3張後將2張手牌送場外",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [{"template": "drawDiscardMany", "drawCount": 3, "discardCount": 2}]
    }
  },
  {
    "id": "SLG-1-037",
    "name": "命の神水",
    "color": "purple",
    "energy": 4,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "trigger": "draw",
    "type": "event",
    "textAnchor": "原本BP4000以下的角色",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {"template": "recoverOutsidePrintedBp", "bp": 4000, "optional": true},
        {"template": "draw", "count": 1}
      ]
    }
  },
  {
    "id": "SLG-1-038",
    "name": "起きろ",
    "color": "purple",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "trigger": "final",
    "type": "event",
    "textAnchor": "事件：可將最多",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {
          "template": "recoverAp",
          "count": 2
        }
      ]
    }
  },
  {
    "id": "SLG-1-041",
    "name": "朝比奈 りん",
    "color": "green",
    "energy": 2,
    "ap": 1,
    "bp": 2500,
    "gen": 1,
    "trigger": null,
    "type": "character",
    "textAnchor": "處於ACTIV",
    "implementation": "dsl",
    "activeExtraEnergy": 1,
    "effects": {}
  },
  {
    "id": "SLG-1-043",
    "name": "水篠 葵",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "trigger": "active",
    "type": "character",
    "textAnchor": "登場時：抽1張",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {
          "template": "drawDiscardOne"
        }
      ]
    }
  },
  {
    "id": "SLG-1-045",
    "name": "水篠 旬",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "trigger": "get",
    "type": "character",
    "textAnchor": "無印刷角色能力",
    "implementation": "vanilla",
    "effects": {}
  },
  {
    "id": "SLG-1-052",
    "name": "諸菱 賢太",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "trigger": "active",
    "type": "character",
    "textAnchor": "Impact無",
    "implementation": "dsl",
    "impactNull": true,
    "effects": {}
  },
  {
    "id": "SLG-1-055",
    "name": "向坂 雫",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 1500,
    "gen": 1,
    "trigger": "get",
    "type": "character",
    "textAnchor": "無印刷角色能力",
    "implementation": "vanilla",
    "effects": {}
  },
  {
    "id": "SLG-1-066",
    "name": "イザ",
    "color": "green",
    "energy": 0,
    "ap": 1,
    "bp": 2000,
    "gen": 1,
    "trigger": "draw",
    "type": "character",
    "textAnchor": "無印刷角色能力",
    "implementation": "vanilla",
    "effects": {}
  },
  {
    "id": "SLG-1-068",
    "name": "K",
    "color": "green",
    "energy": 1,
    "ap": 1,
    "bp": 1500,
    "gen": 2,
    "trigger": null,
    "type": "character",
    "textAnchor": "登場時將另一己",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {
          "template": "bounceOwnOtherUnderEnergy",
          "energy": 1
        }
      ]
    }
  },
  {
    "id": "SLG-1-078",
    "name": "状態の回復",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "trigger": "final",
    "type": "event",
    "textAnchor": "事件：最多2張",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {
          "template": "recoverAp",
          "count": 2
        }
      ]
    }
  },
  {
    "id": "SLG-1-079",
    "name": "ポーション",
    "color": "green",
    "energy": 3,
    "ap": 1,
    "bp": 0,
    "gen": 0,
    "trigger": "final",
    "type": "event",
    "textAnchor": "事件：最多2張",
    "implementation": "dsl",
    "templateEffects": {
      "onPlay": [
        {
          "template": "recoverAp",
          "count": 2
        }
      ]
    }
  },
{
  "id": "SLG-1-040",
  "name": "スキル：乱刀",
  "color": "purple",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "special",
  "type": "event",
  "textAnchor": "事件：令一個敵方前",
  "implementation": "dsl",
  "triggerEffect": {
    "op": "retireOppFront"
  },
  "templateEffects": {
    "onPlay": [
      {
        "template": "retireEnemyUnderBp",
        "bp": 3000,
        "bonusName": "水篠 旬",
        "bonusBp": 5000
      }
    ]
  }
},
{
  "id": "SLG-1-076",
  "name": "俺はな、絶えずレベルアップしてんだよ",
  "color": "green",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "special",
  "type": "event",
  "textAnchor": "事件：令1張敵方前",
  "implementation": "dsl",
  "triggerEffect": {
    "op": "retireOppFront"
  },
  "templateEffects": {
    "onPlay": [
      {
        "template": "retireEnemyUnderBp",
        "bp": 3000,
        "bonusName": "水篠 旬",
        "bonusBp": 5000
      }
    ]
  }
},
{
  "id":"SLG-1-023","name":"水篠 潤一郎","color":"purple","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"active","type":"character",
  "textAnchor":"兩次阻擋：本回合第一次阻擋時ACTIVE。",
  "implementation":"dsl","effects":{},"readyOnBlockCount":1
},
{
  "id":"SLG-1-056","name":"向坂 雫","color":"green","energy":2,
  "ap":1,"bp":3000,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"Impact1。",
  "implementation":"dsl","effects":{},"printedImpact":1,
  "officialTraits":["第四次架南島レイド"],
  "catalogueTraits":["第四次架南島Raid"]
},
{
  "id":"SLG-1-069","name":"ケン","color":"green","energy":2,
  "ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"己方回合手牌5張以上時BP+1500。",
  "implementation":"dsl","effects":{},
  "passiveBonuses":[{"condition":{"kind":"ownHandCountAtLeast","turn":"own","min":5},"bp":1500}],
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"]
},
{
  "id":"SLG-1-062","name":"最上 真","color":"green","energy":0,
  "ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character",
  "textAnchor":"己方回合中若場上有5張以上第四次架南島Raid卡，BP+1500。",
  "implementation":"dsl","effects":{},
  "passiveBonuses":[{"condition":{"kind":"ownTraitCount","turn":"own","min":5,"zone":"field","excludeSelf":false,"trait":"第四次架南島レイド"},"bp":1500}],
  "officialTraits":["第四次架南島レイド"],
  "catalogueTraits":["第四次架南島Raid"]
},
{
  "id":"SLG-1-065","name":"アーシー","color":"green","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"draw","type":"character",
  "textAnchor":"己方回合手牌5張以上時BP+1000並獲Impact1。",
  "implementation":"dsl","effects":{},
  "passiveBonuses":[{"condition":{"kind":"ownHandCountAtLeast","turn":"own","min":5},"bp":1000,"impact":1}],
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"]
},
{
  "id":"SLG-1-072","name":"ミズア","color":"green","energy":3,
  "ap":1,"bp":2000,"gen":2,"trigger":null,"type":"character",
  "textAnchor":"登場時若己方有3張以上DFN，抽1張。",
  "implementation":"dsl","templateEffects":{
    "onPlay":[{"template":"drawIfOwnTraitCount","trait":"DFN",
      "zone":"field","excludeSelf":false,"min":3,"count":1}]},
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"]
},
{
  "id":"SLG-1-027","name":"アイアン","color":"purple","energy":2,
  "ap":1,"bp":3000,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"原本BP2500以下且REST的己方影之軍團角色，BP+500",
  "implementation":"dsl","effects":{},
  "passiveBonuses":[{"condition":{"kind":"ownRestPrintedBpAtMost","turn":"own",
    "zone":"field","excludeSelf":false,"trait":"影の軍団","maxPrintedBp":2500},"bpEach":500}],
  "officialTraits":["影の軍団"],
  "catalogueTraits":["影之軍團"]
},
{
  "id":"SLG-1-063","name":"最上 真","color":"green","energy":1,
  "ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character",
  "textAnchor":"登場時查看牌庫頂3張",
  "implementation":"dsl",
  "templateEffects":{"onPlay":[{"template":"searchTopOneBottomDiscard","count":3,
    "filter":{"field":"trait","value":"第四次架南島レイド"}}]},
  "officialTraits":["第四次架南島レイド"],
  "catalogueTraits":["第四次架南島Raid"]
},
{
  "id":"SLG-1-054","name":"黒須 圭介","color":"green","energy":0,
  "ap":1,"bp":1500,"gen":1,"trigger":"active","type":"character",
  "textAnchor":"登場時查看牌庫頂2張",
  "implementation":"dsl",
  "effects":{"onPlay":[{"op":"inspectTopTraitOutside","count":2,
    "trait":"第四次架南島レイド","rest":"top"}]},
  "officialTraits":["第四次架南島レイド"],
  "catalogueTraits":["第四次架南島Raid"]
},
{
  "id":"SLG-1-017","name":"水篠 旬","color":"purple","energy":2,
  "ap":1,"bp":2000,"gen":1,"trigger":"active","type":"character",
  "textAnchor":"若己方場上沒有任何卡",
  "implementation":"dsl","emptyOwnFieldHandEnergyDiscount":2,
  "templateEffects":{"onPlay":[{"template":"peekTopOne"}]}
},
{
  "id":"SLG-1-074","name":"ルノー","color":"green","energy":2,
  "ap":1,"bp":3000,"gen":1,"trigger":"draw","type":"character",
  "textAnchor":"本回合獲Impact1",
  "implementation":"dsl",
  "effects":{"onPlay":[{"op":"grantOwnOtherTraitImpact","trait":"DFN",
    "amount":1,"optional":true}]},
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"]
},
{
  "id":"SLG-1-071","name":"マリー","color":"green","energy":0,
  "ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character",
  "textAnchor":"主要階段每回合一次",
  "implementation":"dsl",
  "mainAbility":{"op":"restSelfBuffOtherThenHand","oncePerTurn":true,"bp":1000},
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"]
},
{
  "id":"SLG-1-050","name":"観月 絵里","color":"green","energy":0,
  "ap":1,"bp":500,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"主要階段REST並退場此角色",
  "implementation":"dsl","effects":{},
  "mainAbility":{"op":"restRetireRecoverNamed","name":"水篠 旬"}
},
{
  "id":"SLG-1-080","name":"舞姫","color":"green","energy":2,
  "ap":1,"bp":0,"gen":0,"trigger":"draw","type":"event",
  "textAnchor":"事件：抽1張",
  "implementation":"dsl",
  "effects":{"onPlay":[
    {"op":"draw","count":1},
    {"op":"grantOnAttack","target":"ownCharacter","name":"向坂 雫",
     "optional":true,"until":"endOfTurn","then":[{"op":"draw","count":1}]}
  ]}
},
{
  "id":"SLG-1-035","name":"スキル：君主の領域","color":"purple","energy":3,
  "ap":1,"bp":0,"gen":2,"trigger":"get","type":"field",
  "textAnchor":"場域以ACTIVE登場",
  "implementation":"dsl","enterAlwaysActive":true,"effects":{},
  "mainAbility":{"op":"restBuffOwnTraitScaled","trait":"影の軍団",
   "bp":500,"scaledMin":5,"scaledBp":1000},
  "officialTraits":["影の軍団"],
  "catalogueTraits":["影之軍團"]
},
{
  "id":"SLG-1-024","name":"道門 泰星","color":"purple","energy":1,
  "ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"本角色不會被BP4000以上角色阻擋",
  "implementation":"dsl",
  "blockBpRestriction":{"relation":"atLeast","bp":4000,"condition":null},
  "effects":{"onRetire":[{"op":"grantOppBlockAtLeast","bp":4000,"optional":true}]}
},
{
  "id":"SLG-1-067","name":"カナ","color":"green","energy":4,
  "ap":1,"bp":3000,"gen":1,"trigger":"color","type":"character",
  "textAnchor":"登場時若己方有3張以上DFN",
  "implementation":"dsl",
  "triggerEffect":{"op":"deployHandCharacter","color":"green","maxEnergy":2,"ap":1},
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"],
  "effects":{"onPlay":[{"op":"oncePerTurnGate","scope":"name","optional":false,
    "when":{"kind":"ownCardTraitCount","turn":"any","min":3,"zone":"field",
     "excludeSelf":false,"trait":"DFN"},
    "then":[{"op":"draw","count":1},{"op":"activeSelf"},{"op":"buffSelf","bp":1000}]}]}
},
{
  "id":"SLG-1-057","name":"向坂 雫","color":"green","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"color","type":"character",
  "textAnchor":"登場時若己方場上有5張以上第四次架南島Raid卡",
  "implementation":"dsl",
  "triggerEffect":{"op":"deployHandCharacter","color":"green","maxEnergy":2,"ap":1},
  "officialTraits":["第四次架南島レイド"],
  "catalogueTraits":["第四次架南島Raid"],
  "effects":{"onPlay":[{"op":"oncePerTurnGate","scope":"name","optional":false,
    "when":{"kind":"ownCardTraitCount","turn":"any","min":5,"zone":"field",
     "excludeSelf":false,"trait":"第四次架南島レイド"},
    "then":[{"op":"activeSelf"},{"op":"grantSelfSkipNextActive"}]}]}
},
{
  "id":"SLG-1-003","name":"朝比奈 りん","color":"purple","energy":2,
  "ap":1,"bp":3000,"gen":1,"trigger":"active","type":"character",
  "textAnchor":"經自己的效果從場外加入手牌時",
  "implementation":"dsl",
  "passiveBonuses":[{"condition":{"kind":"outsideCount","turn":"any","min":10},"extraEnergy":1}],
  "effects":{"onOutsideRecover":[{"op":"buffOwnField",
    "filter":{"field":"type","value":"character"},
    "bp":1000,"optional":true,"excludeSelf":false}]}
},
{
  "id":"SLG-1-039","name":"影の君主","color":"purple","energy":5,
  "ap":1,"bp":0,"gen":0,"trigger":"special","type":"event",
  "textAnchor":"事件二選一",
  "implementation":"dsl",
  "triggerEffect":{"op":"retireOppFront"},
  "effects":{"onPlay":[{"op":"chooseOne","optional":false,"options":[
    {"id":"activeOne","label":"場外影の軍団最多1張ACTIVE登場","turn":"any",
     "then":[{"op":"deployOutsideFiltered","trait":"影の軍団","count":1,
      "ready":true,"optional":true}]},
    {"id":"restTwo","label":"場外能源3以下影の軍団最多2張REST登場","turn":"any",
     "then":[{"op":"deployOutsideFiltered","trait":"影の軍団","maxEnergy":3,
      "count":2,"ready":false,"optional":true}]}
  ]}]}
},
{
  "id":"SLG-1-077","name":"架南島レイド攻略開始","color":"green","energy":4,
  "ap":1,"bp":0,"gen":0,"trigger":"special","type":"event",
  "textAnchor":"事件：選1張敵方前線BP2000以下角色退場",
  "implementation":"dsl",
  "triggerEffect":{"op":"retireOppFront"},
  "effects":{"onPlay":[
    {"op":"retireOppFrontUnderBp","bp":2000,"scaleTrait":"第四次架南島レイド",
     "scaleMin":5,"scaleBp":5000},
    {"op":"ifLiveThen","when":{"kind":"ownDistinctTraitNames","turn":"any","min":5,
      "zone":"field","excludeSelf":false,"trait":"第四次架南島レイド"},
     "then":[{"op":"buffOwnField","filter":{"field":"type","value":"character"},
      "bp":1000,"optional":true,"excludeSelf":false}]}
  ]}
},
{
  "id":"SLG-1-019","name":"水篠 旬","color":"purple","energy":1,
  "ap":1,"bp":1500,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"在場外的主要階段能力",
  "implementation":"dsl",
  "mainAbility":{"op":"outsideDiscardTraitToHand","trait":"影の軍団",
   "oncePerTurn":true,"scope":"name"},
  "effects":{"onPlay":[{"op":"discardGate","optional":true,
    "payment":{"zone":"hand","field":"trait","value":"影の軍団"},
    "then":[{"op":"draw","count":1}]}]}
},
{
  "id":"SLG-1-060","name":"町田 堂玄","color":"green","energy":3,
  "ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character",
  "textAnchor":"Impact無效",
  "implementation":"dsl","impactNull":true,"effects":{},
  "officialTraits":["第四次架南島レイド"],
  "catalogueTraits":["第四次架南島Raid"],
  "phaseEffects":[{"phase":"attack","edge":"end","turn":"own",
    "then":[{"op":"swapEnergyWithFrontSkip"}]}]
},
{
  "id":"SLG-1-033","name":"ベル","color":"purple","energy":5,
  "ap":1,"bp":4000,"gen":1,"trigger":null,"type":"character",
  "textAnchor":"原本BP3000以下且REST的影之軍團",
  "implementation":"dsl",
  "officialTraits":["影の軍団"],"catalogueTraits":["影之軍團"],
  "effects":{"onAttack":[{"op":"discardGate","optional":true,"scope":"name",
    "when":{"kind":"ownRestPrintedBpCount","turn":"any","min":4,"zone":"field",
     "excludeSelf":false,"trait":"影の軍団","maxPrintedBp":3000},
    "then":[{"op":"activeSelf"}]}]}
},
{
  "id":"SLG-1-029","name":"カイセル","color":"purple","energy":3,
  "ap":1,"bp":2500,"gen":2,"trigger":"active","type":"character",
  "textAnchor":"原本BP2000以下的影之軍團",
  "implementation":"dsl","effects":{},
  "officialTraits":["影の軍団"],"catalogueTraits":["影之軍團"],
  "attackAid":{"trait":"影の軍団","maxPrintedBp":2000,"options":[
    {"id":"ceiling","label":"不被BP4000以上阻擋","grant":"blockAtLeast","bp":4000},
    {"id":"immune","label":"不會被敵方效果選取","grant":"oppChoiceImmune"}
  ]}
},
{
  "id":"SLG-1-031","name":"キバ","color":"purple","energy":3,
  "ap":1,"bp":2500,"gen":2,"trigger":"active","type":"character",
  "textAnchor":"原本BP2000以下影之軍團",
  "implementation":"dsl","effects":{},
  "officialTraits":["影の軍団"],"catalogueTraits":["影之軍團"],
  "attackAid":{"trait":"影の軍団","maxPrintedBp":2000,"options":[
    {"id":"bp","label":"攻擊角色BP+1500","grant":"bp","bp":1500},
    {"id":"draw","label":"抽1張並棄1張","grant":"drawDiscard"}
  ]}
},
{
  "id":"SLG-1-011","name":"向坂 雫","color":"purple","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"color","type":"character",
  "textAnchor":"經自己的效果從場外加入手牌時",
  "implementation":"dsl",
  "triggerEffect":{"op":"deployOutsideCharacter","color":"purple","maxEnergy":2,"ap":1,"frontOnly":true},
  "blockBpRestriction":{"relation":"atLeast","bp":4000,
   "condition":{"kind":"outsideCount","turn":"any","min":10}},
  "ownOutsideRecovery":{"op":"playSelfMeetEnergy","optional":true,"activeSourceName":"水篠 旬"},
  "effects":{"onPlay":[{"op":"millTop","count":1,"optional":true}]}
},
{
  "id":"SLG-1-044","name":"水篠 葵","color":"green","energy":2,
  "ap":1,"bp":2500,"gen":1,"trigger":"color","type":"character",
  "textAnchor":"登場時：抽1張並棄1張",
  "implementation":"dsl",
  "triggerEffect":{"op":"deployHandCharacter","color":"green","maxEnergy":2,"ap":1},
  "mainAbility":{"op":"restTuckTopDamage","frontOnly":true,"name":"水篠 旬"},
  "effects":{"onPlay":[{"op":"drawDiscard","count":1}]}
},
{
  "id":"SLG-1-059","name":"白川 大虎","color":"green","energy":4,
  "ap":2,"bp":4000,"gen":1,"trigger":"get","type":"character",
  "textAnchor":"登場時可送手牌1張至場外",
  "implementation":"dsl",
  "officialTraits":["第四次架南島レイド"],"catalogueTraits":["第四次架南島Raid"],
  "effects":{
   "onPlay":[{"op":"discardGate","optional":true,"then":[
     {"op":"activeSelf"},{"op":"buffSelf","bp":1000}]}],
   "onAttack":[{"op":"searchTopUpToTwoBottom","count":4,"max":2,"rest":"bottom",
     "filters":[{"field":"trait","value":"第四次架南島レイド"}],"logic":"any",
     "skipSelfIfAdded":true}]
  }
},
{
  "id":"SLG-1-061","name":"美濃部 剛","color":"green","energy":3,
  "ap":1,"bp":2000,"gen":2,"trigger":"active","type":"character",
  "textAnchor":"己方攻擊階段結束時可送1張手牌場外",
  "implementation":"dsl",
  "officialTraits":["第四次架南島レイド"],"catalogueTraits":["第四次架南島Raid"],
  "phaseEffects":[{"phase":"attack","edge":"end","turn":"own","then":[
    {"op":"discardGate","optional":true,"then":[
     {"op":"activeOwnTrait","trait":"第四次架南島レイド","optional":true,"max":1}]}]}],
  "effects":{"onPlay":[{"op":"buffOwnField","filter":{"field":"trait","value":"第四次架南島レイド"},
    "bp":1000,"optional":true,"excludeSelf":true,"untilName":"白川 大虎"}]}
},
{
  "id":"SLG-1-020","name":"水篠 旬","color":"purple","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character",
  "textAnchor":"登場時抽1張",
  "implementation":"dsl","raidName":"水篠 旬","effects":{
   "onPlay":[
    {"op":"draw","count":1},
    {"op":"discardGate","optional":true,"then":[
     {"op":"recoverOutsidePrintedBp","bp":3000,"optional":true,"excludeName":"水篠 旬"}]}
   ],
   "onAttack":[
    {"op":"drawDiscard","count":1},
    {"op":"buffSelfPerOwnOutsideGroups","unit":5,"bpPerGroup":500}
   ]
  }
},
{
  "id":"SLG-1-047","name":"水篠 旬","color":"green","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"get","type":"character",
  "textAnchor":"再Raid於原底板",
  "implementation":"dsl","raidName":"水篠 旬",
  "phaseEffects":[{"phase":"attack","edge":"end","turn":"own","then":[
    {"op":"chainRaidHand","optional":true,"facedown":2,"color":"green","energy":5,"name":"水篠 旬"}]}],
  "effects":{
   "onPlay":[{"op":"draw","count":1}],
   "onAttack":[{"op":"drawTuckHandUnder","count":1}]
  }
},
{
  "id":"SLG-1-048","name":"水篠 旬","color":"green","energy":5,
  "ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character",
  "textAnchor":"綠色需求能源6",
  "implementation":"dsl","raidName":"水篠 旬",
  "phaseEffects":[{"phase":"attack","edge":"end","turn":"own","then":[
    {"op":"chainRaidHand","optional":true,"facedown":3,"color":"green","energy":6,"name":"水篠 旬"}]}],
  "effects":{
   "onPlay":[
    {"op":"deployOwnHandRest","type":"character","color":"green","energy":3,"ap":1,"max":1},
    {"op":"draw","count":1,"entry":"ownEffect"}
   ],
   "onAttack":[{"op":"drawTuckHandUnder","count":1}]
  }
},
{
  "id":"SLG-1-049","name":"水篠 旬","color":"green","energy":6,
  "ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character",
  "textAnchor":"BP+500",
  "implementation":"dsl","raidName":"水篠 旬","printedImpact":1,
  "passiveBonuses":[{"condition":{"kind":"selfOnField","turn":"any"},"bp":500}],
  "effects":{
   "onPlay":[{"op":"retireOppFrontOne","optional":true,"entry":"ownEffect"}],
   "onAttack":[{"op":"drawTuckHandUnder","count":1}]
  }
},
{
  "id":"SLG-1-051","name":"観月 絵里","color":"green","energy":3,
  "ap":1,"bp":2000,"gen":2,"trigger":"active","type":"character",
  "textAnchor":"額外支付1AP",
  "implementation":"dsl",
  "effects":{"onPlay":[{"op":"chooseOne","optional":false,"options":[
    {"id":"recover","label":"從場外回收能源2以下角色","turn":"any","then":[
     {"op":"recoverOutsideCharacterUnderEnergy","energy":2,"optional":true}]},
    {"id":"raid","label":"支付1AP並由場外Raid","turn":"any","then":[
     {"op":"payApDiscardOutsideRaid","ap":1,"color":"green","energy":4,"name":"水篠 旬"}]}
  ]}]}
},
{
  "id":"SLG-1-022","name":"水篠 旬","color":"purple","energy":12,
  "ap":1,"bp":5000,"gen":1,"trigger":"raid","type":"character",
  "textAnchor":"需求能源減少1",
  "implementation":"dsl","raidName":"水篠 旬","printedImpact":1,
  "fieldTraitEnergyDiscount":{"trait":"影の軍団","per":1},
  "energyAttackSwap":{"trait":"影の軍団"},
  "effects":{"onPlay":[
    {"op":"activeOwnTraitLines","trait":"影の軍団","frontMax":1,"energyMax":1},
    {"op":"grantSelfSniperThisTurn"}
  ]}
},
{
  "id":"SLG-1-034","name":"悪魔の城","color":"purple","energy":3,
  "ap":1,"bp":0,"gen":2,"trigger":"get","type":"field",
  "textAnchor":"命之神水",
  "implementation":"dsl","enterAlwaysActive":true,
  "mainAbility":{"op":"fieldRestMillOrOutsideEvent","outsideMin":20,"eventName":"命の神水"},
  "effects":{}
},
{
  "id":"SLG-1-058","name":"向坂 雫","color":"green","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character",
  "textAnchor":"下次不ACTIVE",
  "implementation":"dsl","raidName":"向坂 雫",
  "officialTraits":["第四次架南島レイド"],"catalogueTraits":["第四次架南島Raid"],
  "effects":{
   "onPlay":[{"op":"buffSelf","bp":1000}],
   "onAttack":[{"op":"oncePerTurnGate","scope":"card","optional":true,
    "when":{"kind":"ownHandCountAtLeast","turn":"any","min":1},
    "then":[{"op":"discardGate","optional":false,"then":[{"op":"activeSkipPair"}]}]}]
  }
},
{
  "id":"SLG-1-064","name":"最上 真","color":"green","energy":4,
  "ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character",
  "textAnchor":"BP1500以上",
  "implementation":"dsl","raidName":"最上 真",
  "officialTraits":["第四次架南島レイド"],"catalogueTraits":["第四次架南島Raid"],
  "effects":{
   "onPlay":[{"op":"ifLiveThen","when":{"kind":"ownCardTraitCount","turn":"any","min":5,
    "zone":"field","excludeSelf":false,"trait":"第四次架南島レイド"},
    "then":[{"op":"enemyFrontAllBpDown","bp":1000,"minBp":1500}]}],
   "onAttack":[{"op":"chooseOne","optional":true,"options":[
    {"id":"replay","label":"重複此登場能力並跳過下次ACTIVE","turn":"any","then":[
     {"op":"grantSelfSkipNextActive"},{"op":"replayOnPlay"}]},
    {"id":"retire","label":"令BP2000以下對手前線退場並跳過下次ACTIVE","turn":"any","then":[
     {"op":"grantSelfSkipNextActive"},
     {"op":"retireOppFrontOneUnderBp","bp":2000,"optional":true}]}
   ]}]
  }
},
{
  "id":"SLG-1-073","name":"リュー","color":"green","energy":4,
  "ap":2,"bp":4000,"gen":1,"trigger":"get","type":"character",
  "textAnchor":"同名卡此登場能力每回合合計一次",
  "implementation":"dsl","enterAlwaysActive":true,
  "officialTraits":["DFN／第四次架南島レイド"],
  "traitComponents":["DFN","第四次架南島レイド"],
  "catalogueTraits":["DFN","第四次架南島Raid"],
  "frontRetireHandGrant":{"line":"front","retiredTrait":"第四次架南島レイド",
   "retiredLacks":"DFN","grantTrait":"DFN"},
  "effects":{"onPlay":[{"op":"oncePerTurnGate","scope":"name","optional":false,"then":[
    {"op":"buffOwnField","filter":{"field":"type","value":"character"},
     "bp":1000,"optional":true,"excludeSelf":false},
    {"op":"ifLiveThen","when":{"kind":"ownHandCountAtLeast","turn":"any","min":7},
     "then":[{"op":"recoverAp","count":2}]}
  ]}]}
},
{
  "id":"SLG-1-075","name":"デイリークエスト","color":"green","energy":1,
  "ap":1,"bp":0,"gen":1,"trigger":"get","type":"field",
  "textAnchor":"需求能源0水篠旬",
  "implementation":"dsl",
  "mainAbility":{"op":"fieldRestTuckOrRelease","requiresName":"水篠 旬",
   "recoverName":"水篠 旬","recoverEnergy":0},
  "effects":{}
}
];
export const SLG_V2_VERIFIED_IDS=Object.freeze(authored.map(c=>c.id));
export function verifiedSlgV2Cards(){
 return authored.map(({textAnchor,officialTraits,catalogueTraits,...spec})=>{
  const card=catalog[spec.id];
  if(!card||card.identity!==spec.id||!card.source?.includes('/cardlist/')||!card.effect?.includes(textAnchor))throw Error('SLG official text changed: '+spec.id);
  for(const key of ['name','color','energy','ap','bp','gen','trigger','type']){
   const actual=key==='name'?(card.nameJa||card.name):(key==='bp'?(card.bp??0):(card[key]??null));
   if(actual!==(spec[key]??null))throw Error('SLG printed '+key+' changed: '+spec.id);
  }
  // The catalogue sometimes stores a translated or split trait. When the
  // official page uses one different token, keep that token and require the
  // known catalogue value so a later catalogue correction cannot pass silently.
  if(catalogueTraits&&JSON.stringify(card.traits||[])!==JSON.stringify(catalogueTraits))
   throw Error('SLG catalogue trait drift: '+spec.id);
  return {...spec,traits:officialTraits||card.traits||[]};
 });
}
export function createSlgV2Pack(){return createUniversalPack({id:'solo-leveling',version:'v2-c-20261015',cards:verifiedSlgV2Cards()});}
