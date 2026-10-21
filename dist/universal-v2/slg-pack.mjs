// V2-C SLG official-record allowlist. Never calls legacy solo-match reducer.
import {SOLO_LEVELING_CARDS} from '../solo-leveling.mjs';
import {createUniversalPack} from './pack.mjs';
const catalog=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const authored=[
  {
    "id":"SLG-1-007","name":"エシル","color":"purple",
    "energy":0,"ap":1,"bp":500,"gen":1,"trigger":"draw",
    "type":"character","textAnchor":"退場時抽1張",
    "implementation":"dsl","effects":{"onRetire":[{"op":"draw","count":1}]}
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
}
];
export const SLG_V2_VERIFIED_IDS=Object.freeze(authored.map(c=>c.id));
export function verifiedSlgV2Cards(){
 return authored.map(({textAnchor,...spec})=>{
  const card=catalog[spec.id];
  if(!card||card.identity!==spec.id||!card.source?.includes('/cardlist/')||!card.effect?.includes(textAnchor))throw Error('SLG official text changed: '+spec.id);
  for(const key of ['name','color','energy','ap','bp','gen','trigger','type']){
   const actual=key==='name'?(card.nameJa||card.name):(key==='bp'?(card.bp??0):(card[key]??null));
   if(actual!==(spec[key]??null))throw Error('SLG printed '+key+' changed: '+spec.id);
  }
  return {...spec,traits:card.traits||[]};
 });
}
export function createSlgV2Pack(){return createUniversalPack({id:'solo-leveling',version:'v2-c-20261015',cards:verifiedSlgV2Cards()});}
