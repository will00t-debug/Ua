// V2-C SLG official-record allowlist. Never calls legacy solo-match reducer.
import {SOLO_LEVELING_CARDS} from '../solo-leveling.mjs';
import {createUniversalPack} from './pack.mjs';
const catalog=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
const authored=[
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
