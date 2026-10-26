// BLEACH V2 isolated migration pack: manual official-card allowlist.
// Explicit profiles come from official printed numbers and text, never legacy auto flags.
// No shared engine/pack/ability-template or real-card-pilots modifications.
import {CARDS} from '../cards.mjs?v=9.1.0';
import {createUniversalPack} from './pack.mjs';
import {verifiedPilotCards} from './real-card-pilots.mjs';

// All entries were checked against Japanese official card details.
// 'plain' means no character effect text (the printed life trigger is still active).
// 'step' uses the V2 move-phase STEP handler; 'bounce' uses a real V2 template.
export const BLEACH_V2_ADDON_PROFILES=Object.freeze([
 {
  id:'BLC-1-095',kind:'topTwoGoteiEvent',
  number:'UA08BT/BLC-1-095',name:'護廷十三隊',
  color:'green',energy:2,ap:1,bp:0,gen:0,
  trigger:null,type:'event',
  effect:'查看己方牌堆頂 4 張，可公開其中最多 2 張具有「護廷十三隊」特徵的卡並加入手牌，其餘以任意順序放至牌堆底。'
 },
 {"id":"BLC-1-070","kind":"topOneEnergyDiscount","number":"UA08BT/BLC-1-070","name":"卯ノ花 八千流","color":"green","energy":6,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈卯之花烈〉：轉為 ACTIVE，可移至前線。登場：查看己方牌堆頂 4 張，可公開其中最多 1 張需求能源 4 以下且具有「護廷十三隊」特徵的角色卡並加入手牌，其餘以任意順序放至牌堆底。本回合下一張從手牌使用、需求能源 4 以下的角色卡，AP 消耗減少 1。"},
 {
  id:"BLC-1-023",kind:"raidStripOrRetire2000",
  number:"UA08BT/BLC-1-023",name:"ユーハバッハ",
  color:"yellow",energy:4,ap:2,bp:4000,gen:1,trigger:"get",type:"character",
  effect:"登場：選一項：①選最多 1 個敵方前線處於 Raid 狀態的角色，將其最上層的 1 張卡送至場外；②使最多 1 個敵方前線 BP 2000 以下角色退場。"
 },
 {
  id:"BLC-1-024",kind:"raidStripOrRetireDamage2",
  number:"UA08BT/BLC-1-024",name:"ユーハバッハ",
  color:"yellow",energy:6,ap:1,bp:4000,gen:1,trigger:"raid",type:"character",
  effect:"Raid〈友哈巴赫〉：轉為 ACTIVE，可移至前線。己方回合中，若本回合已有至少 2 個角色退場，此角色 BP +1000 並獲得 Damage 2。登場：選一項：①選最多 1 個敵方前線 Raid 角色，將其最上層的 1 張卡送至場外；②使最多 1 個敵方前線 BP 3000 以下角色退場。"
 },
 {
  "id":"BLC-1-006","kind":"enterActiveAttackRestSkip",
  "number":"UA08BT/BLC-1-006","name":"キルゲ・オピー",
  "color":"yellow","energy":4,"ap":2,"bp":4000,"gen":1,
  "trigger":"get","type":"character",
  "effect":"敵方場上有至少 1 個 REST 角色時，此角色以 ACTIVE 登場。攻擊時：可選最多 1 個敵方場上的 REST 角色，使其跳過下一次轉為 ACTIVE。"
 },
 {
  "id":"BLC-1-005","kind":"restSelfEnemy",
  "number":"UA08BT/BLC-1-005","name":"キルゲ・オピー",
  "color":"yellow","energy":2,"ap":1,"bp":3000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"主要階段・位於前線：REST 自己，選 1 個敵方前線角色，將其轉為 REST。"
 },
 {
  "id": "BLC-1-002",
  "kind": "plain",
  "number": "UA08BT/BLC-1-002",
  "name": "エス・ノト",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": "active",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-012",
  "kind": "plain",
  "number": "UA08BT/BLC-1-012",
  "name": "バンビエッタ・バスターバイン",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-018",
  "kind": "plain",
  "number": "UA08BT/BLC-1-018",
  "name": "ユーグラム・ハッシュヴァルト",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-021",
  "kind": "plain",
  "number": "UA08BT/BLC-1-021",
  "name": "ユーハバッハ",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-071",
  "kind": "plain",
  "number": "UA08BT/BLC-1-071",
  "name": "卯ノ花 烈",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-083",
  "kind": "plain",
  "number": "UA08BT/BLC-1-083",
  "name": "日番谷 冬獅郎",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-086",
  "kind": "plain",
  "number": "UA08BT/BLC-1-086",
  "name": "雛森 桃",
  "color": "green",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": "active",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-023",
  "kind": "plain",
  "number": "EX07BT/BLC-2-023",
  "name": "四楓院 夕四郎 咲宗",
  "color": "blue",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-025",
  "kind": "plain",
  "number": "EX07BT/BLC-2-025",
  "name": "阿散井 恋次",
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": "active",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-031",
  "kind": "plain",
  "number": "EX07BT/BLC-2-031",
  "name": "朽木 ルキア",
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-036",
  "kind": "plain",
  "number": "EX07BT/BLC-2-036",
  "name": "涅 マユリ",
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-056",
  "kind": "plain",
  "number": "EX07BT/BLC-2-056",
  "name": "修多羅 千手丸",
  "color": "purple",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "get",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-059",
  "kind": "plain",
  "number": "EX07BT/BLC-2-059",
  "name": "曳舟 桐生",
  "color": "purple",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-2-066",
  "kind": "plain",
  "number": "EX07BT/BLC-2-066",
  "name": "更木 剣八",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": "active",
  "type": "character",
  "effect": "無固有效果。"
 },
 {
  "id": "BLC-1-001",
  "kind": "step",
  "number": "UA08BT/BLC-1-001",
  "name": "アズギアロ・イーバーン",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "Step：己方移動階段可由前線移至能源線。"
 },
 {
  "id": "BLC-1-089",
  "kind": "step",
  "number": "UA08BT/BLC-1-089",
  "name": "松本 乱菊",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "Step：己方移動階段可由前線移至能源線。"
 },
 {
  "id": "BLC-4-062",
  "kind": "step",
  "number": "EX15BT/BLC-4-062",
  "name": "矢胴丸 リサ",
  "color": "green",
  "energy": 2,
  "ap": 1,
  "bp": 3000,
  "gen": 1,
  "trigger": "active",
  "type": "character",
  "effect": "Step：自己的移動階段可從前線移至能量線。"
 },
 {
  "id": "BLC-1-017",
  "kind": "bounce",
  "number": "UA08BT/BLC-1-017",
  "name": "マスク・ド・マスキュリン",
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "gen": 2,
  "trigger": null,
  "type": "character",
  "effect": "登場：將另一個需求能源 1 以下的己方場上角色返回手牌；若無法返回其他角色，將自己返回手牌。"
 },
 {
  "id": "BLC-1-035",
  "kind": "bounce",
  "number": "UA08BT/BLC-1-035",
  "name": "井上 織姫",
  "color": "purple",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "gen": 2,
  "trigger": null,
  "type": "character",
  "effect": "登場：將另一個需求 1 以下的己方角色返回手牌；沒有可返回角色時，返回自己。"
 },
 {
  "id": "BLC-1-068",
  "kind": "bounce",
  "number": "UA08BT/BLC-1-068",
  "name": "伊勢 七緒",
  "color": "green",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "gen": 2,
  "trigger": null,
  "type": "character",
  "effect": "登場：將另一個需求能源 1 以下的己方場上角色返回手牌；若無法返回其他角色，將自己返回手牌。"
 },
 {
  "id": "BLC-2-020",
  "kind": "bounce",
  "number": "EX07BT/BLC-2-020",
  "name": "茶渡 泰虎",
  "color": "blue",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "gen": 2,
  "trigger": null,
  "type": "character",
  "effect": "登場：將另一個需求能源 1 以下的己方場上角色返回手牌；若無法返回其他角色，將自己返回手牌。"
 },
 {
  "id": "BLC-1-010",
  "kind": "activeEnergy",
  "number": "UA08BT/BLC-1-010",
  "name": "ナナナ・ナジャークープ",
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "此角色處於 ACTIVE 時，額外產生 1 黃能源。"
 },
 {
  "id": "BLC-1-075",
  "kind": "activeEnergy",
  "number": "UA08BT/BLC-1-075",
  "name": "吉良 イヅル",
  "color": "green",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "此角色處於 ACTIVE 時，額外產生 1 綠能源。"
 },
 {
  "id": "BLC-2-029",
  "kind": "activeEnergy",
  "number": "EX07BT/BLC-2-029",
  "name": "朽木 白哉",
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "此角色處於 ACTIVE 時，額外產生 1 藍能源。"
 },
 {
  "id": "BLC-4-014",
  "kind": "activeEnergy",
  "number": "EX15BT/BLC-4-014",
  "name": "ユーハバッハ",
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "gen": 2,
  "trigger": null,
  "type": "character",
  "effect": "此角色為Active時，額外產生1個黃色能量。"
 },
 {
  "id": "BLC-1-008",
  "kind": "impactNull",
  "number": "UA08BT/BLC-1-008",
  "name": "蒼都",
  "color": "yellow",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "Impact 無效：與此角色戰鬥的角色在該次戰鬥中失去 Impact。"
 },
 {
  "id": "BLC-1-043",
  "kind": "impactNull",
  "number": "UA08BT/BLC-1-043",
  "name": "ネル・トゥ",
  "color": "purple",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "Impact 無效：與此角色戰鬥的角色在該次戰鬥中失去 Impact。"
 },
 {
  "id": "BLC-1-067",
  "kind": "impactNull",
  "number": "UA08BT/BLC-1-067",
  "name": "綾瀬川 弓親",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "Impact 無效：與此角色戰鬥的角色在該次戰鬥中失去 Impact。"
 },
 {
  "id": "BLC-4-035",
  "kind": "impactNull",
  "number": "EX15BT/BLC-4-035",
  "name": "グリムジョー・ジャガージャック",
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "Impact無效：與此角色戰鬥的角色在該次戰鬥失去Impact。"
 },
 {
  "id": "BLC-1-072",
  "kind": "drawPlay",
  "number": "UA08BT/BLC-1-072",
  "name": "卯ノ花 烈",
  "color": "green",
  "energy": 2,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "登場：抽 1 張。"
 },
 {
  "id": "BLC-1-094",
  "kind": "drawPlay",
  "number": "UA08BT/BLC-1-094",
  "name": "尸魂界",
  "color": "green",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 2,
  "trigger": "get",
  "type": "field",
  "effect": "登場：抽 1 張。"
 },
 {
  "id": "BLC-2-008",
  "kind": "drawDiscardPlay",
  "number": "EX07BT/BLC-2-008",
  "name": "ジゼル・ジュエル",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "登場：抽 1 張，再將 1 張手牌送至場外。"
 },
 {
  "id": "BLC-2-016",
  "kind": "drawDiscardPlay",
  "number": "EX07BT/BLC-2-016",
  "name": "黒崎 一護",
  "color": "blue",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "登場：抽 1 張，再將 1 張手牌送至場外。"
 },
 {
  "id": "BLC-2-052",
  "kind": "drawDiscardPlay",
  "number": "EX07BT/BLC-2-052",
  "name": "阿散井 恋次",
  "color": "purple",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "登場：抽 1 張，再將 1 張手牌送至場外。"
 },
 {
  "id": "BLC-2-071",
  "kind": "drawDiscardPlay",
  "number": "EX07BT/BLC-2-071",
  "name": "斑目 一角",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "active",
  "type": "character",
  "effect": "登場：抽 1 張，再將 1 張手牌送至場外。"
 },
 {
  "id": "BLC-4-026",
  "kind": "drawDiscardPlay",
  "number": "EX15BT/BLC-4-026",
  "name": "黒崎 一護",
  "color": "blue",
  "energy": 1,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "登場時：抽1張牌，再將1張手牌送至場外。"
 },
 {
  "id": "BLC-4-040",
  "kind": "drawDiscardPlay",
  "number": "EX15BT/BLC-4-040",
  "name": "涅 ネム",
  "color": "blue",
  "energy": 2,
  "ap": 1,
  "bp": 3000,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "登場時：抽1張牌，再將1張手牌送至場外。"
 },
 {
  "id": "BLC-1-082",
  "kind": "drawDiscardAttack",
  "number": "UA08BT/BLC-1-082",
  "name": "檜佐木 修兵",
  "color": "green",
  "energy": 1,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "攻擊時：抽 1 張，再將 1 張手牌送至場外。"
 },
 {
  "id": "BLC-1-090",
  "kind": "buffAttack1000",
  "number": "UA08BT/BLC-1-090",
  "name": "六車 拳西",
  "color": "green",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "攻擊時：此角色本回合 BP +1000。"
 },
 {
  "id": "BLC-1-029",
  "kind": "recoverAp2",
  "number": "UA08BT/BLC-1-029",
  "name": "滅却師完聖体",
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "可將最多 2 張己方 AP 卡轉為 ACTIVE。"
 },
 {
  "id": "BLC-1-100",
  "kind": "recoverAp2",
  "number": "UA08BT/BLC-1-100",
  "name": "卍解",
  "color": "green",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "可將最多 2 張己方 AP 卡轉為 ACTIVE。"
 },
 {
  "id": "BLC-2-049",
  "kind": "recoverAp2",
  "number": "EX07BT/BLC-2-049",
  "name": "卍解",
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "可將最多 2 張己方 AP 卡轉為 ACTIVE。"
 },
 {
  "id": "BLC-4-019",
  "kind": "recoverAp2",
  "number": "EX15BT/BLC-4-019",
  "name": "滅却師完聖体",
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "最多選自己的2張AP卡改為Active。"
 },
 {
  "id": "BLC-4-020",
  "kind": "recoverAp2",
  "number": "EX15BT/BLC-4-020",
  "name": "最強の滅却師になろうぜ",
  "color": "yellow",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "最多選自己的2張AP卡改為Active。"
 },
 {
  "id": "BLC-4-045",
  "kind": "recoverAp2",
  "number": "EX15BT/BLC-4-045",
  "name": "瞬神",
  "color": "blue",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "最多選自己的2張AP卡改為Active。"
 },
 {
  "id": "BLC-4-059",
  "kind": "recoverAp2",
  "number": "EX15BT/BLC-4-059",
  "name": "卍解",
  "color": "purple",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "最多選自己的2張AP卡改為Active。"
 },
 {
  "id": "BLC-4-080",
  "kind": "recoverAp2",
  "number": "EX15BT/BLC-4-080",
  "name": "卍解",
  "color": "green",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "final",
  "type": "event",
  "effect": "最多選自己的2張AP卡改為Active。"
 },
 {
  "id": "BLC-2-053",
  "kind": "enemyBpDown1000",
  "number": "EX07BT/BLC-2-053",
  "name": "朽木 白哉",
  "color": "purple",
  "energy": 2,
  "ap": 1,
  "bp": 2500,
  "gen": 1,
  "trigger": null,
  "type": "character",
  "effect": "登場：可使最多 1 個敵方前線角色本回合 BP −1000。"
 },
 {
  "id": "BLC-4-061",
  "kind": "plainAlt",
  "number": "EX15BT/BLC-4-061",
  "name": "猿柿 ひよ里",
  "color": "green",
  "energy": 0,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "無一般效果。"
 },
 {
  "id": "BLC-1-097",
  "kind": "traitBuffAllDraw",
  "number": "UA08BT/BLC-1-097",
  "name": "隊首羽織",
  "color": "green",
  "energy": 3,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "active",
  "type": "event",
  "effect": "所有己方場上具有「護廷十三隊」特徵的卡，本回合 BP +1000。抽 1 張。"
 },
 {
  "id": "BLC-1-013",
  "kind": "restEnemy3500",
  "number": "UA08BT/BLC-1-013",
  "name": "バンビエッタ・バスターバイン",
  "color": "yellow",
  "energy": 2,
  "ap": 1,
  "bp": 2000,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "登場：可選最多 1 個敵方前線 BP 3500 以下角色，將其轉為 REST。"
 },
 {
  "id": "BLC-1-099",
  "kind": "retireBonusYamamoto",
  "number": "UA08BT/BLC-1-099",
  "name": "天地灰尽",
  "color": "green",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "special",
  "type": "event",
  "effect": "使 1 個敵方前線 BP 3000 以下角色退場；己方場上有〈山本元柳齋重國〉時，BP 上限改為 5000。"
 },
 {
  "id": "BLC-2-048",
  "kind": "retireBonusRukia",
  "number": "EX07BT/BLC-2-048",
  "name": "白霞罸",
  "color": "blue",
  "energy": 4,
  "ap": 1,
  "bp": 0,
  "gen": 0,
  "trigger": "special",
  "type": "event",
  "effect": "使 1 個敵方前線 BP 3000 以下角色退場；己方場上有〈朽木露琪亞〉時，BP 上限改為 5000。"
 },
 {
  "id": "BLC-1-049",
  "kind": "enemyBpDown500Color",
  "number": "UA08BT/BLC-1-049",
  "name": "朽木 白哉",
  "color": "purple",
  "energy": 3,
  "ap": 1,
  "bp": 3000,
  "gen": 2,
  "trigger": "color",
  "type": "character",
  "effect": "登場：可使最多 1 個敵方前線角色本回合 BP −500。"
 },
 {
  "id": "BLC-4-009",
  "kind": "inspectTop2",
  "number": "EX15BT/BLC-4-009",
  "name": "バンビエッタ・バスターバイン",
  "color": "yellow",
  "energy": 0,
  "ap": 1,
  "bp": 1000,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "登場時：查看牌庫頂2張，最多將1張送至場外，其餘依任意順序放回牌庫頂。"
 },
 {
  "id": "BLC-4-067",
  "kind": "inspectTop3",
  "number": "EX15BT/BLC-4-067",
  "name": "京楽 春水",
  "color": "green",
  "energy": 1,
  "ap": 1,
  "bp": 1500,
  "gen": 1,
  "trigger": "draw",
  "type": "character",
  "effect": "登場時：查看牌庫頂3張，最多將1張送至場外，其餘依任意順序放回牌庫頂。"
 }
 ,{
  "id":"BLC-1-059","kind":"buffOtherOwn1000",
  "number":"UA08BT/BLC-1-059","name":"曳舟 桐生",
  "color":"purple","energy":2,"ap":1,"bp":3000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"登場：可使最多 1 個其他己方場上角色本回合 BP +1000。"
 },{
  "id":"BLC-1-077","kind":"buffOtherOwn1000",
  "number":"UA08BT/BLC-1-077","name":"虎徹 勇音",
  "color":"green","energy":0,"ap":1,"bp":1000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"登場：可使最多 1 個其他己方場上角色本回合 BP +1000。"
 } ,{
  "id":"BLC-3-006","kind":"inspectTop3",
  "number":"UA04NC/BLC-3-006","name":"朽木 白哉",
  "color":"purple","energy":1,"ap":1,"bp":2000,"gen":1,
  "trigger":"active","type":"character",
  "effect":"【登場時】查看自己牌庫上方 3 張牌。可以從中將最多 1 張放到場外，將剩餘卡片依任意順序放回牌庫頂。"
 },{
  "id":"BLC-3-009","kind":"drawPlayColorHand",
  "number":"UA04NC/BLC-3-009","name":"日番谷 冬獅郎",
  "color":"green","energy":3,"ap":1,"bp":2000,"gen":2,
  "trigger":"color","type":"character",
  "effect":"【登場時】抽 1 張牌。"
 } ,{
  "id":"BLC-4-023","kind":"buffOtherOwn1000",
  "number":"EX15BT/BLC-4-023","name":"浦原 喜助",
  "color":"blue","energy":0,"ap":1,"bp":500,"gen":1,
  "trigger":"draw","type":"character",
  "effect":"登場時：最多選自己場上另1個角色，本回合BP+1000。"
 } ,{
  "id":"BLC-2-055","kind":"peekTopOrBottom",
  "number":"EX07BT/BLC-2-055","name":"麒麟寺 天示郎",
  "color":"purple","energy":0,"ap":1,"bp":2000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"登場：查看己方牌堆頂 1 張，將其放至牌堆頂或牌堆底。"
 },{
  "id":"BLC-4-013","kind":"inspectTopAnyOutside2",
  "number":"EX15BT/BLC-4-013","name":"ユーハバッハ",
  "color":"yellow","energy":1,"ap":1,"bp":2000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"登場時：查看牌庫頂2張，將任意張依任意順序放回牌庫頂，其餘送至場外。"
 } ,{
  "id":"BLC-1-030","kind":"restEnemyFrontOne",
  "number":"UA08BT/BLC-1-030","name":"The Jail",
  "color":"yellow","energy":2,"ap":1,"bp":0,"gen":0,
  "trigger":"active","type":"event",
  "effect":"選 1 個敵方前線角色，將其轉為 REST。"
 }
 ,{
  "id":"BLC-1-016","kind":"restEnergyRetire",
  "number":"UA08BT/BLC-1-016","name":"ベレニケ・ガブリエリ",
  "color":"yellow","energy":0,"ap":1,"bp":1000,"gen":1,
  "trigger":null,"type":"character","effect":"主要階段・每回合 1 次：REST 自己，本回合額外產生 1 黃能源；主要階段結束時，此角色退場。"
 } ,{
  "id":"BLC-1-069","kind":"restEnergyRetire",
  "number":"UA08BT/BLC-1-069","name":"浮竹 十四郎",
  "color":"green","energy":0,"ap":1,"bp":1000,"gen":1,
  "trigger":null,"type":"character","effect":"主要階段・每回合 1 次：REST 自己，本回合額外產生 1 綠能源；主要階段結束時，此角色退場。"
 } ,{
  "id":"BLC-2-022","kind":"restEnergyRetire",
  "number":"EX07BT/BLC-2-022","name":"志波 岩鷲",
  "color":"blue","energy":0,"ap":1,"bp":1000,"gen":1,
  "trigger":null,"type":"character","effect":"主要階段・每回合 1 次：REST 自己，本回合額外產生 1 藍能源；主要階段結束時，此角色退場。"
 } ,{
  "id":"BLC-2-040","kind":"onRetireDrawOne",
  "number":"EX07BT/BLC-2-040","name":"チルッチ・サンダーウィッチ",
  "color":"blue","energy":0,"ap":1,"bp":1000,"gen":1,
  "trigger":null,"type":"character","effect":"退場：抽 1 張。"
 } ,{
  "id":"BLC-1-051","kind":"onRetireMillTwo",
  "number":"UA08BT/BLC-1-051","name":"朽木 ルキア",
  "color":"purple","energy":0,"ap":1,"bp":1500,"gen":1,
  "trigger":"draw","type":"character","effect":"退場：將己方牌堆頂 2 張送至場外。"
 } ,{
  "id":"BLC-2-042","kind":"onRetireMillTwo",
  "number":"EX07BT/BLC-2-042","name":"ルピ・アンテノール",
  "color":"blue","energy":0,"ap":1,"bp":1500,"gen":1,
  "trigger":"draw","type":"character","effect":"退場：將己方牌堆頂 2 張送至場外。"
 } ,{
  "id":"BLC-1-009","kind":"printedImpact",
  "number":"UA08BT/BLC-1-009","name":"ドリスコール・ベルチ",
  "color":"yellow","energy":2,"ap":1,"bp":3000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"Impact 1：攻擊並贏得戰鬥時，對敵方玩家造成 1 點傷害。"
 } ,{
  "id":"BLC-1-074","kind":"printedAttackDamage",
  "number":"UA08BT/BLC-1-074","name":"京楽 春水",
  "color":"green","energy":3,"ap":1,"bp":2500,"gen":2,
  "trigger":"draw","type":"character",
  "effect":"Damage 2：攻擊直接造成傷害時，改為造成 2 點傷害。"
 } ,{
  "id":"BLC-1-054","kind":"discardOppHandOne",
  "number":"UA08BT/BLC-1-054","name":"涅 マユリ",
  "color":"purple","energy":3,"ap":1,"bp":3000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"登場：敵方將其 1 張手牌送至場外。"
 } ,{
  "id":"BLC-1-109","kind":"drawTwoDiscardOne",
  "number":"UA08ST/BLC-1-109","name":"空座町の死神代行",
  "color":"purple","energy":1,"ap":1,"bp":0,"gen":0,
  "trigger":"draw","type":"event",
  "effect":"抽 2 張，再棄 1 張。"
 } ,{
  "id":"BLC-2-007","kind":"frontBpDownMin1000",
  "number":"EX07BT/BLC-2-007","name":"キャンディス・キャットニップ",
  "color":"yellow","energy":3,"ap":1,"bp":2500,"gen":2,
  "trigger":"active","type":"character",
  "effect":"登場：所有敵方前線 BP 1000 以上角色，本回合 BP −500。"
 } ,{
  "id":"BLC-2-063","kind":"readyOnFirstAttack",
  "number":"EX07BT/BLC-2-063","name":"京楽 春水",
  "color":"green","energy":4,"ap":1,"bp":2000,"gen":2,
  "trigger":null,"type":"character",
  "effect":"每回合首次攻擊時，此角色立即轉為 ACTIVE，因此可攻擊 2 次。"
 } ,{
  "id":"BLC-2-010","kind":"onRetireRestUnder2000",
  "number":"EX07BT/BLC-2-010","name":"ミニーニャ・マカロン",
  "color":"yellow","energy":0,"ap":1,"bp":2000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"退場：可將最多 1 個敵方前線 BP 2000 以下角色轉為 REST。"
 }

 ,{
  "id":"BLC-1-042","kind":"restEnergyRetire",
  "number":"UA08ST/BLC-1-042","name":"茶渡 泰虎",
  "color":"purple","energy":0,"ap":1,"bp":1000,"gen":1,
  "trigger":null,"type":"character",
  "effect":"主要階段・每回合 1 次：REST 自己，本回合多產生 1 紫能源；主要階段結束時退場。"
 }
,
{"id":"BLC-2-044","kind":"fieldDualMain","number":"EX07BT/BLC-2-044","name":"涅骸部隊","color":"blue","energy":3,"ap":1,"bp":0,"gen":1,"trigger":"get","type":"field","effect":"主要階段・每回合 1 次：使 1 個己方場上具有「涅骸部隊」特徵的角色退場。另一個主要階段效果・每回合 1 次：僅在本回合有己方場上角色退場後可發動，REST 此場域，使所有己方場上的〈涅音夢〉及具有「涅骸部隊」特徵的角色本回合 BP +1000。"},
{"id":"BLC-4-042","kind":"mayuriThreeMode","number":"EX15BT/BLC-4-042","name":"涅 マユリ","color":"blue","energy":3,"ap":1,"bp":2000,"gen":3,"trigger":"draw","type":"character","effect":"登場時：選1項。①查看牌庫頂2張，將任意張依任意順序放回牌庫頂，其餘送至場外。②可將2張手牌送至場外；如此則可從場外將最多1張《涅繭利》或《涅音夢》加入手牌。③可使自己場上另1個角色退場；如此則可從手牌將最多1張卡名為《涅骸部隊》的藍色卡以Active登場於自己的能量線（只具同名特徵不符合）。"}
,
{"id":"BLC-4-069","kind":"kyorakuAttackEnd","number":"EX15BT/BLC-4-069","name":"京楽 春水","color":"green","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"突襲《京樂春水》：改為Active，可移至前線。以下僅在突襲狀態適用：此角色攻擊結束時，若自己場外的綠色事件卡及綠色場地卡合計有4種以上不同卡名，可選自己能量線最多1個角色，與此角色交換位置；戰鬥後或傷害的Trigger檢查結束後處理。登場時：本回合下一張從手牌使用、具有「花天狂骨」特徵的卡，消費AP−1；先使用其他卡不會耗掉減費效果。"},
{"id":"BLC-4-076","kind":"fieldRestRetireNamed","number":"EX15BT/BLC-4-076","name":"花天","color":"green","energy":0,"ap":1,"bp":0,"gen":1,"trigger":"active","type":"field","effect":"啟動・主要〔改為Rest，並使此卡退場〕：可從場外將最多1張所需能量2以下的綠色《京樂春水》以Active登場於自己的能量線。"},
{"id":"BLC-1-058","kind":"restSelfBuffOther","number":"UA08BT/BLC-1-058","name":"二枚屋 王悦","color":"purple","energy":2,"ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character","effect":"主要階段：REST 自己，使 1 個其他己方場上角色本回合 BP +1000。"},
{"id":"BLC-1-088","kind":"readyOnFirstBlock","number":"UA08BT/BLC-1-088","name":"斑目 一角","color":"green","energy":3,"ap":1,"bp":3500,"gen":1,"trigger":"draw","type":"character","effect":"每回合第一次阻擋時，此角色立即轉為 ACTIVE，因此可阻擋 2 次。"},
{"id":"BLC-1-101","kind":"readyOnFirstBlock","number":"UA08ST/BLC-1-101","name":"井上 織姫","color":"purple","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"active","type":"character","effect":"本回合第一次阻擋時，立即轉為 ACTIVE。"},
{"id":"BLC-4-073","kind":"ownTurnNamedBp","number":"EX15BT/BLC-4-073","name":"斑目 一角","color":"green","energy":2,"ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character","effect":"自己的回合中：若自己場上有《更木劍八》，此角色BP+1500。"},
{"id":"BLC-1-007","kind":"opponentFieldHandEnergy","number":"UA08BT/BLC-1-007","name":"ジェローム・ギズバット","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"敵方場上有紫色或綠色卡片時，手牌中此卡的黃色需求能源減少 1。"},
{"id":"BLC-1-044","kind":"opponentFieldHandEnergy","number":"UA08BT/BLC-1-044","name":"阿近","color":"purple","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"敵方場上有黃色或綠色卡片時，手牌中此卡的紫色需求能源減少 1。"},
{"id":"BLC-1-073","kind":"opponentFieldHandEnergy","number":"UA08BT/BLC-1-073","name":"鳳橋 楼十郎","color":"green","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"敵方場上有黃色或紫色卡片時，手牌中此卡的綠色需求能源減少 1。"},
{"id":"BLC-4-029","kind":"blockBpAtMost","number":"EX15BT/BLC-4-029","name":"志波 岩鷲","color":"blue","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"active","type":"character","effect":"此角色不會被BP2000以下的角色阻擋。"},
{"id":"BLC-4-031","kind":"drawIfOwnEffectEntry","number":"EX15BT/BLC-4-031","name":"四楓院 夜一","color":"blue","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":null,"type":"character","effect":"登場時：若此角色是以自己的效果登場，抽1張牌。"},
{"id":"BLC-4-025","kind":"frontDiscardDraw","number":"EX15BT/BLC-4-025","name":"黒崎 一護","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":null,"type":"character","effect":"啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：抽1張牌。"},
{"id":"BLC-2-003","kind":"frontDiscardFieldBpDown","number":"EX07BT/BLC-2-003","name":"バズビー","color":"yellow","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"active","type":"character","effect":"主要階段・位於前線・每回合 1 次：將 1 張手牌送至場外，使 1 個敵方場上 BP 1500 以上角色本回合 BP −1000。"},
{"id":"BLC-4-002","kind":"aliasPeekTopOutside","number":"EX15BT/BLC-4-002","name":"ユーゴー","color":"yellow","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"此卡也視為《雨葛蘭・哈斯沃德》。登場時：查看牌庫頂1張，放回牌庫頂或送至場外。"},
{"id":"BLC-4-030","kind":"optionalDiscardPeekDraw","number":"EX15BT/BLC-4-030","name":"四楓院 夜一","color":"blue","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"登場時：可將1張手牌送至場外；如此則查看牌庫頂1張，將其放回牌庫頂或底，再抽1張牌。"},
{"id":"BLC-4-066","kind":"optionalDiscardPeekDraw","number":"EX15BT/BLC-4-066","name":"卯ノ花 烈","color":"green","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"active","type":"character","effect":"登場時：可將1張手牌送至場外；如此則查看牌庫頂1張，放回牌庫頂或底，再抽1張牌。"},
{"id":"BLC-4-074","kind":"aliasFieldRestEnergyRetire","number":"EX15BT/BLC-4-074","name":"山本 重國","color":"green","energy":0,"ap":1,"bp":1000,"gen":2,"trigger":null,"type":"character","effect":"此卡也視為《山本元柳齋重國》。啟動・主要〔改為Rest／每回合1次〕：此角色本回合額外產生1個綠色能量，並獲得「主要階段結束時，使此角色退場」。"}
,
{"id":"BLC-1-015","kind":"drawIfOppRestCharacter","number":"UA08BT/BLC-1-015","name":"BG9","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"登場：敵方場上有 REST 角色時，抽 1 張。"}
,
{"id":"BLC-1-027","kind":"drawIfOppCharacterBpAtLeast","number":"UA08BT/BLC-1-027","name":"ロバート・アキュトロン","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"登場：敵方場上有 BP 4000 以上角色時，抽 1 張。"}
,
{"id":"BLC-1-076","kind":"activeOwnNamed","number":"UA08BT/BLC-1-076","name":"草鹿 やちる","color":"green","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"active","type":"character","effect":"登場：可將最多 1 個己方場上的〈更木劍八〉轉為 ACTIVE。"}
,
{"id":"BLC-2-004","kind":"drawIfOwnNameAndHandFewer","number":"EX07BT/BLC-2-004","name":"ユーグラム・ハッシュヴァルト","color":"yellow","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":null,"type":"character","effect":"登場：己方場上有〈友哈巴赫〉且己方手牌少於敵方時，抽 1 張。"}
,
{"id":"BLC-2-039","kind":"onRetireOwnTurnNameRest","number":"EX07BT/BLC-2-039","name":"シャルロッテ・クールホーン","color":"blue","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"active","type":"character","effect":"退場：若現在是己方回合，可將最多 1 個敵方前線角色轉為 REST。所有〈夏洛特・庫爾霍恩〉的此效果，合計每回合只能發動 1 次。"}
,
{"id":"BLC-2-043","kind":"nameOncePayOutsideRest","number":"EX07BT/BLC-2-043","name":"六車 拳西＆鳳橋 楼十郎","color":"blue","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"color","type":"character","effect":"登場：可支付 1 AP；成功時可從己方場外將最多 1 張〈六車拳西＆鳳橋樓十郎〉以 REST 登場於己方場上。所有〈六車拳西＆鳳橋樓十郎〉的此效果，合計每回合只能發動 1 次。"}
,
{"id":"BLC-1-098","kind":"removeOutsideThen","number":"UA08BT/BLC-1-098","name":"隊葬","color":"green","energy":1,"ap":1,"bp":0,"gen":0,"trigger":"draw","type":"event","effect":"可將己方場外 1 張角色卡除外；成功時抽 2 張。"}
,
{"id":"BLC-1-106","kind":"removeOutsideThen","number":"UA08ST/BLC-1-106","name":"朽木 ルキア","color":"purple","energy":4,"ap":2,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"登場：可將場外 3 張除外；成功時抽 2 張。"}
,
{"id":"BLC-1-003","kind":"oppRestFrontBpEach","number":"UA08BT/BLC-1-003","name":"エス・ノト","color":"yellow","energy":3,"ap":1,"bp":2000,"gen":1,"trigger":"color","type":"character","effect":"敵方前線每有 1 個 REST 角色，此角色 BP +1000。"}
,
{"id":"BLC-1-019","kind":"oppCurrentBpCountBonus","number":"UA08BT/BLC-1-019","name":"ユーグラム・ハッシュヴァルト","color":"yellow","energy":3,"ap":1,"bp":3500,"gen":1,"trigger":"active","type":"character","effect":"敵方場上有至少 2 個 BP 4000 以上角色時，此角色 BP +500。"}
,
{"id":"BLC-2-062","kind":"otherCardTraitEnergy","number":"EX07BT/BLC-2-062","name":"綾瀬川 弓親","color":"green","energy":2,"ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character","effect":"己方場上有至少 3 張其他具有「護廷十三隊」特徵的卡時，此角色額外產生 1 綠能源。"}
,
{"id":"BLC-4-038","kind":"ownFrontPrintedApBp","number":"EX15BT/BLC-4-038","name":"朽木 ルキア","color":"blue","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"自己的回合中：若自己的前線有印刷消費AP為2以上的角色，此角色BP+1500。"}
,
{"id":"BLC-2-054","kind":"handOutsideThisTurnBp","number":"EX07BT/BLC-2-054","name":"朽木 ルキア","color":"purple","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"active","type":"character","effect":"己方回合中，若本回合己方曾將手牌送至場外，此角色 BP +500。"}
,
{"id":"BLC-1-084","kind":"otherCardTraitBp","number":"UA08BT/BLC-1-084","name":"日番谷 冬獅郎","color":"green","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"color","type":"character","effect":"己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，此角色 BP +500。"}
,
{"id":"BLC-2-068","kind":"otherCardTraitBp","number":"EX07BT/BLC-2-068","name":"檜佐木 修兵","color":"green","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，此角色 BP +1500。"}
,
{"id":"BLC-3-008","kind":"handEnergyBpImmune","number":"UA04NC/BLC-3-008","name":"更木 剣八","color":"green","energy":4,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"此卡片在手牌時，能源需求減少綠 1。\n此角色不受 BP 減少的效果影響。\n【自己的回合中】對手前線有 BP3500 以上的角色時，此角色 BP＋1000。"}
,
{"id":"BLC-4-070","kind":"impactNullMustBlock","number":"EX15BT/BLC-4-070","name":"更木 剣八","color":"green","energy":1,"ap":1,"bp":4000,"gen":1,"trigger":"draw","type":"character","effect":"Impact無效。此角色必須盡可能阻擋對方的攻擊；若有多個具有此強制阻擋效果且能阻擋的角色，從中選1個阻擋。"}
,
{"id":"BLC-2-073","kind":"retireFieldOrOutside","number":"EX07BT/BLC-2-073","name":"野晒","color":"green","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"使 1 個敵方前線 BP 3000 以下角色退場；己方場上有〈更木劍八〉，或己方場外有〈草鹿八千流〉時，BP 上限改為 5000。"}
,
{"id":"BLC-2-069","kind":"traitDiscardRecoverNamed","number":"EX07BT/BLC-2-069","name":"日番谷 冬獅郎","color":"green","energy":1,"ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character","effect":"登場：己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，可將 1 張手牌送至場外；成功時可從己方場外將最多 1 張〈日番谷冬獅郎〉加入手牌。"}
,
{"id":"BLC-3-001","kind":"blockHandOutsideBp","number":"UA04NC/BLC-3-001","name":"黒崎 一護","color":"blue","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":"active","type":"character","effect":"【兩次阻擋】此角色在本回合第一次阻擋時，將其轉為 Active。\n【自己的回合中】本回合中自己曾將手牌放到場外時，此角色 BP＋1000。"}
,
{"id":"BLC-2-015","kind":"traitlessTopDiscard","number":"EX07BT/BLC-2-015","name":"浦原 喜助","color":"blue","energy":1,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"登場：查看己方牌堆頂 3 張，可公開其中最多 1 張不具有特徵的角色卡並加入手牌，其餘以任意順序放至牌堆底。若有卡加入手牌，再將 1 張手牌送至場外。"}
,
{"id":"BLC-2-019","kind":"ichigoRaidSlash","number":"EX07BT/BLC-2-019","name":"黒崎 一護","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈黑崎一護〉：轉為 ACTIVE，可移至前線。登場：可使最多 2 個敵方前線 BP 2000 以上角色本回合 BP −1500。主要階段・每回合 1 次：將 1 張卡名含「斬月」或「月牙」的手牌送至場外；成功時抽 1 張，並使此角色本回合 BP +1000，且獲得「攻擊時，可抽最多 1 張」。"}
,
{"id":"BLC-2-021","kind":"zangetsuBlockFloor","number":"EX07BT/BLC-2-021","name":"斬月","color":"blue","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"active","type":"character","effect":"此卡因己方場上藍色〈黑崎一護〉的效果從手牌送至場外時，可使發動該效果的〈黑崎一護〉本回合不能被 BP 3000 以下角色阻擋。"}
,
{"id":"BLC-4-022","kind":"orihimeEntry","number":"EX15BT/BLC-4-022","name":"井上 織姫","color":"blue","energy":4,"ap":2,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"此角色以Active登場。登場時：可將1張手牌送至場外；如此則可從場外將最多1張所需能量1以下的藍色角色加入手牌，或以Rest登場於自己場上（可以選剛丟棄的卡）。啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動；選自己場上1個角色，到自己下次回合開始前賦予「不會被對方效果選擇」。"}
,
{"id":"BLC-4-027","kind":"ichigoImpactGrants","number":"EX15BT/BLC-4-027","name":"黒崎 一護","color":"blue","energy":3,"ap":1,"bp":2500,"gen":3,"trigger":"draw","type":"character","effect":"Impact無效。啟動・主要〔每回合1次〕：將手牌中1張卡名包含「斬月」或「月牙」的卡送至場外；如此則抽1張牌，此角色本回合BP+1500，並獲得「〔能量線〕自己攻擊階段開始時，若自己的前線有空位，將此角色移至前線」與「不會被Trigger效果選擇」。"}
,
{"id":"BLC-4-034","kind":"rirukaUnder","number":"EX15BT/BLC-4-034","name":"毒ヶ峰 リルカ","color":"blue","energy":0,"ap":1,"bp":1000,"gen":1,"trigger":"color","type":"character","effect":"因自己《黑崎一護》的效果將手牌送至場外時，若此角色下方沒有裏向卡片，可將Active的此角色改為Rest；如此則可將該效果送至場外的最多1張卡以裏向置於此角色下方。登場時〔能量線〕：將此角色改為Active。啟動・主要〔改為Rest，並使此卡退場〕：可將此角色下方最多1張裏向卡片加入手牌。自己可查看自己場上卡片下的裏向卡，對方不可查看；被移至下方的《其名為斬月》仍可完成原本已觸發的抽牌效果。"}
,
{"id":"BLC-4-036","kind":"grimmjowOutsideEntry","number":"EX15BT/BLC-4-036","name":"グリムジョー・ジャガージャック","color":"blue","energy":6,"ap":1,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"此卡因自己《黑崎一護》或《浦原喜助》的效果從手牌送至場外時，若自己有4以上藍色能量，且自己場上所有卡片皆沒有「破面」以外的特徵，可支付1 AP；如此則將此卡以Active登場。所有《葛力姆喬・賈卡傑克》的此效果合計每回合僅限1次；沒有特徵的卡片不妨礙此條件。"}
,
{"id":"BLC-2-046","kind":"getsugaRetire","number":"EX07BT/BLC-2-046","name":"月牙十字衝","color":"blue","energy":3,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"使 1 個敵方前線 BP 3500 以下角色退場。此卡因己方場上藍色〈黑崎一護〉的效果從手牌送至場外時，可將 1 張手牌放至己方牌堆底；成功時使發動該效果的〈黑崎一護〉本回合獲得 2 次攻擊，首次攻擊時立即轉為 ACTIVE。"}
,
{"id":"BLC-2-047","kind":"zangetsuDraw","number":"EX07BT/BLC-2-047","name":"その名は斬月","color":"blue","energy":2,"ap":1,"bp":0,"gen":0,"trigger":null,"type":"event","effect":"抽 2 張。此卡因己方場上藍色〈黑崎一護〉的效果從手牌送至場外時，抽 1 張。"}
,
{"id":"BLC-4-060","kind":"aizenEnergyFront","number":"EX15BT/BLC-4-060","name":"藍染 惣右介","color":"green","energy":3,"ap":1,"bp":4000,"gen":3,"trigger":"get","type":"character","effect":"此卡不能在前線登場，也不能由自己的效果以外的方式移至前線。登場時：最多選自己場上1個《藍染惣右介》以外的角色，移至另一條線；目的線已滿時，先選該線1張卡除外。啟動・主要〔能量線〕：將自己前線2個Active角色改為Rest，如此則將此角色移至前線。攻擊時：抽1張牌。"}
,
{"id":"BLC-2-067","kind":"raidBaseLeaveDamage","number":"EX07BT/BLC-2-067","name":"更木 剣八","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈更木劍八〉：轉為 ACTIVE，可移至前線。不受降低 BP 的效果影響。Impact 1。若 Raid 基底的需求能源為 4 以上，再獲得以下兩項效果：①因敵方效果或戰鬥將離場時，可改為將 1 張己方手牌送至場外；成功時將此角色 Raid 狀態最上層的卡送至場外；②登場：此角色本回合 BP +1000 並獲得 Damage 2。"}
,
{"id":"BLC-1-085","kind":"restLockFrontUpgrade","number":"UA08BT/BLC-1-085","name":"日番谷 冬獅郎","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈日番谷冬獅郎〉：轉為 ACTIVE，可移至前線。登場：可選最多 1 個敵方前線角色，將其轉為 REST，且直到下一個敵方攻擊階段結束前不能轉為 ACTIVE；己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，改為將所選角色及所有敵方能源線角色轉為 REST，並套用相同的 ACTIVE 限制。"}
,
{"id":"BLC-1-041","kind":"millRemoveScale","number":"UA08BT/BLC-1-041","name":"黒崎 一護","color":"purple","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈黑崎一護〉：轉為 ACTIVE，可移至前線。登場：將己方牌堆頂 2 張送至場外，再將己方場外任意張數的卡除外；成功時可選最多 1 個敵方前線角色，本回合每除外 1 張，該角色 BP −500。"}
,
{"id":"BLC-1-047","kind":"payDamageRemoveFour","number":"UA08BT/BLC-1-047","name":"阿散井 恋次","color":"purple","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"主要階段・每回合 1 次：支付 1 AP，使此角色本回合獲得 Damage 2。Raid〈阿散井戀次〉：轉為 ACTIVE，可移至前線。登場：可將己方場外 4 張卡除外；成功時可使最多 1 個敵方前線角色本回合 BP −3000。"}
,
{"id":"BLC-4-048","kind":"purpleNamesTop","number":"EX15BT/BLC-4-048","name":"阿散井 恋次","color":"purple","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"登場時：查看牌庫頂2張，可將最多1張紫色《阿散井戀次》或《朽木露琪亞》送至場外，其餘依任意順序放回牌庫頂。"}
,
{"id":"BLC-4-049","kind":"purpleApBpChoice","number":"EX15BT/BLC-4-049","name":"阿散井 恋次","color":"purple","energy":2,"ap":1,"bp":2000,"gen":1,"trigger":"draw","type":"character","effect":"若本回合曾因自己的紫色卡片效果支付AP，此角色BP+2000。啟動・主要〔前線／支付1 AP／每回合1次〕：僅在自己場上有《朽木露琪亞》時可發動，選1項。①抽1張牌。②將此角色改為Active，並最多選1個對方前線角色，本回合BP−1000。"}
,
{"id":"BLC-4-050","kind":"raidApDiscountChoice","number":"EX15BT/BLC-4-050","name":"阿散井 恋次","color":"purple","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"若本回合曾因自己的紫色卡片效果支付AP，從手牌將此卡突襲時消費AP−1；若本回合已從手牌使用其他《阿散井戀次》且未支付AP，此減費效果無效。以其他卡片的效果使角色登場不算從手牌使用。突襲《阿散井戀次》：改為Active，可移至前線。僅在突襲狀態適用：啟動・主要〔前線／每回合1次〕，選1項。①此角色本回合獲得Impact(1)。②選1個對方前線角色，本回合BP−1000。"}
,
{"id":"BLC-1-053","kind":"raidDrawDiscardBuff","number":"UA08BT/BLC-1-053","name":"朽木 ルキア","color":"purple","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈朽木露琪亞〉：轉為 ACTIVE，可移至前線。登場：抽 3 張，再將 2 張手牌送至場外。主要階段・每回合 1 次：將 1 張手牌送至場外，可使最多 1 個己方場上角色本回合 BP +500。"}
,
{"id":"BLC-4-054","kind":"renjiPayDeploy","number":"EX15BT/BLC-4-054","name":"朽木 ルキア","color":"purple","energy":3,"ap":1,"bp":2000,"gen":3,"trigger":"color","type":"character","effect":"登場時：若自己場上有《阿散井戀次》，可支付1 AP；如此則抽1張牌，並可從手牌將最多1張能量需求已滿足、消費AP1的《阿散井戀次》或《朽木露琪亞》以Rest登場，或進行突襲。"}
,
{"id":"BLC-4-082","kind":"topSplitEnergyDraw","number":"UA01DC/BLC-4-082","name":"黒崎 一護","color":"purple","energy":3,"ap":1,"bp":2500,"gen":2,"trigger":"get","type":"character","effect":"【登場時】查看自己牌庫頂 2 張，任意張依順序放回牌庫頂，其餘送場外。若本次送場外的卡中有能源需求 3 以上的卡，抽 1 張。"}
,
{"id":"BLC-4-083","kind":"emptyRaidPeek","number":"UA01DC/BLC-4-083","name":"朽木 ルキア","color":"purple","energy":2,"ap":1,"bp":2500,"gen":1,"trigger":null,"type":"character","effect":"己方場上沒有卡時，這張手牌的需求能源減少。被突襲時：選擇查看牌庫頂 1 張（可送場外），或使己方 1 個露琪亞本回合不會被 BP 4000 以上角色阻擋。登場時：查看牌庫頂 1 張，放回頂部或送場外。"}
,
{"id":"BLC-4-058","kind":"renjiEventRetire","number":"EX15BT/BLC-4-058","name":"双王蛇尾丸","color":"purple","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"僅在自己場上有《阿散井戀次》時可使用。選1個對方前線BP5000以下的角色使其退場；若本回合曾因自己的紫色卡片效果支付AP，可抽1張牌，如此則將1張手牌送至場外。"}
,
{"id":"BLC-1-080","kind":"ownTurnBpImmune","number":"UA08BT/BLC-1-080","name":"更木 剣八","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"active","type":"character","effect":"此角色不受降低 BP 的效果影響。己方回合中，此角色 BP +1000。"}
,
{"id":"BLC-1-091","kind":"aliasFrontSoloBp","number":"UA08BT/BLC-1-091","name":"山本 重國","color":"green","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"get","type":"character","effect":"此卡亦視為〈山本元柳齋重國〉。己方前線沒有其他角色時，此角色 BP +1000。"}
,
{"id":"BLC-2-041","kind":"otherOwnRetireThisTurnBp","number":"EX07BT/BLC-2-041","name":"ドルドーニ・アレッサンドロ・デル・ソカッチオ","color":"blue","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"active","type":"character","effect":"己方回合中，若本回合已有其他己方場上角色退場，此角色 BP +1000。"}
,
{"id":"BLC-1-062","kind":"fieldBuffRecoverAp","number":"UA08ST/BLC-1-062","name":"おいしいパン","color":"purple","energy":2,"ap":1,"bp":0,"gen":0,"trigger":"active","type":"event","effect":"一個己方角色本回合 BP +1000，可回復 1 AP。"}
,
{"id":"BLC-1-032","kind":"chooseBuffOrFrontDown","number":"UA08BT/BLC-1-032","name":"血装","color":"yellow","energy":1,"ap":1,"bp":0,"gen":0,"trigger":"draw","type":"event","effect":"選一項：①可使最多 1 個己方場上角色本回合 BP +1000；②可使最多 1 個敵方前線角色本回合 BP −1000。"}
,
{"id":"BLC-1-078","kind":"stepAttackTraitBuff","number":"UA08BT/BLC-1-078","name":"狛村 左陣","color":"green","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":"active","type":"character","effect":"Step：己方移動階段可由前線移至能源線。攻擊時：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合 BP +500。"}
,
{"id":"BLC-1-087","kind":"impactPlusTrait","number":"UA08BT/BLC-1-087","name":"平子 真子","color":"green","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"active","type":"character","effect":"登場：可使最多 1 個己方場上具有「護廷十三隊」特徵的角色本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。"}
,
{"id":"BLC-2-026","kind":"impactPlusPrintedAp","number":"EX07BT/BLC-2-026","name":"阿散井 恋次","color":"blue","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"draw","type":"character","effect":"登場：可使最多 1 個己方場上原始 AP 消耗 2 以上的角色，本回合獲得 Impact +1；沒有 Impact 的角色則獲得 Impact 1。"}
,
{"id":"BLC-2-027","kind":"frontPrintedApBpEach","number":"EX07BT/BLC-2-027","name":"阿散井 恋次","color":"blue","energy":1,"ap":1,"bp":2500,"gen":1,"trigger":"active","type":"character","effect":"己方回合中，己方前線每有 1 個原始 AP 消耗 2 以上的角色，此角色 BP +500。"}
,
{"id":"BLC-4-046","kind":"purpleIchigoBuff","number":"EX15BT/BLC-4-046","name":"井上 織姫","color":"purple","energy":0,"ap":1,"bp":1000,"gen":1,"trigger":"active","type":"character","effect":"登場時：最多選自己場上1個紫色《黑崎一護》，本回合BP+1500。"}
,
{"id":"BLC-4-028","kind":"restOnceSelfBp","number":"EX15BT/BLC-4-028","name":"茶渡 泰虎","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"draw","type":"character","effect":"啟動・主要〔改為Rest／每回合1次〕：此角色到自己下次回合開始前BP+1000。"}
,
{"id":"BLC-4-052","kind":"oppFrontBelowPrintedBp","number":"EX15BT/BLC-4-052","name":"朽木 白哉","color":"purple","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"若對方前線有BP低於印刷BP的角色，此角色BP+1500。"}
,
{"id":"BLC-3-007","kind":"topFilterDiscard","number":"UA04NC/BLC-3-007","name":"京楽 春水","color":"green","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"draw","type":"character","effect":"【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張【特徵：護廷十三隊】的卡片，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。"}
,
{"id":"BLC-3-002","kind":"topFilterDiscard","number":"UA04NC/BLC-3-002","name":"朽木 ルキア","color":"blue","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"draw","type":"character","effect":"【登場時】查看自己牌庫上方 3 張牌。可以從中公開最多 1 張〈黑崎一護〉、〈阿散井戀次〉、〈朽木露琪亞〉或〈朽木白哉〉，加入手牌。將剩餘卡片依任意順序放到牌庫底。若加入了手牌，將自己的 1 張手牌放到場外。"}
,
{"id":"BLC-4-001","kind":"topFilterDiscard","number":"EX15BT/BLC-4-001","name":"バズ","color":"yellow","energy":1,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"此卡也視為《巴茲比》。登場時：查看牌庫頂3張，最多公開1張《巴茲比》或《雨葛蘭・哈斯沃德》加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。"}
,
{"id":"BLC-2-072","kind":"namedHandRest","number":"EX07BT/BLC-2-072","name":"松本 乱菊","color":"green","energy":3,"ap":1,"bp":3000,"gen":1,"trigger":"draw","type":"character","effect":"登場：己方場上有〈日番谷冬獅郎〉時，可從手牌將最多 1 張需求能源 2 以下、AP 消耗 1 的綠色角色卡，以 REST 登場於己方場上。"}
,
{"id":"BLC-2-032","kind":"printedApTop","number":"EX07BT/BLC-2-032","name":"朽木 ルキア","color":"blue","energy":2,"ap":1,"bp":2000,"gen":1,"trigger":null,"type":"character","effect":"登場：查看己方牌堆頂 5 張，可公開其中最多 1 張原始 AP 消耗 2 以上的卡並加入手牌，其餘以任意順序放至牌堆底。"}
,
{"id":"BLC-3-004","kind":"restFrontEnergy","number":"UA04NC/BLC-3-004","name":"浦原 喜助","color":"purple","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"draw","type":"character","effect":"【啟動主要】【將此角色轉為 Rest】【每回合一次】將自己前線的 1 張 Active 角色轉為 Rest。若如此做，此角色在本回合中產生能源＋紫 1。"}
,
{"id":"BLC-1-079","kind":"discardGainEnergy","number":"UA08BT/BLC-1-079","name":"雀部 長次郎 忠息","color":"green","energy":3,"ap":1,"bp":1500,"gen":1,"trigger":null,"type":"character","effect":"主要階段・每回合 1 次：將 1 張手牌送至場外，本回合額外產生 2 綠能源。"}
,
{"id":"BLC-2-050","kind":"traitlessNoRaidTop","number":"EX07BT/BLC-2-050","name":"浦原 喜助","color":"purple","energy":3,"ap":1,"bp":2500,"gen":2,"trigger":"draw","type":"character","effect":"登場：查看己方牌堆頂 5 張，可公開其中最多 1 張不具有特徵、且不具有 Raid 的角色卡並加入手牌，其餘以任意順序放至牌堆底。若有卡加入手牌，再將 1 張手牌送至場外。"}
,
{"id":"BLC-1-108","kind":"fieldRestRetireDraw","number":"UA08ST/BLC-1-108","name":"一護の部屋","color":"purple","energy":2,"ap":1,"bp":0,"gen":1,"trigger":"get","type":"field","effect":"主要階段：REST 並退場自己，抽 2 張，再棄 1 張。"}
,
{"id":"BLC-3-010","kind":"topSplitSides","number":"UA04NC/BLC-3-010","name":"平子 真子","color":"green","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":"draw","type":"character","effect":"【登場時】查看自己牌庫上方 2 張牌。將這些卡片依任意張數與任意順序，分別放到牌庫頂與牌庫底。"}
,
{"id":"BLC-2-018","kind":"bounceUnderFrontDraw","number":"EX07BT/BLC-2-018","name":"黒崎 一護","color":"blue","energy":4,"ap":2,"bp":4000,"gen":1,"trigger":"active","type":"character","effect":"登場：可將最多 1 個敵方前線 BP 4000 以下角色返回手牌。主要階段・位於前線・每回合 1 次：抽 1 張，再將 1 張手牌送至場外。"}
,
{"id":"BLC-1-056","kind":"restRetirePurpleCharacter","number":"UA08BT/BLC-1-056","name":"麒麟寺 天示郎","color":"purple","energy":1,"ap":1,"bp":1500,"gen":1,"trigger":null,"type":"character","effect":"主要階段：REST 並退場自己，從己方場外將 1 張紫色角色卡加入手牌。"}
,
{"id":"BLC-4-024","kind":"traitlessLineMove","number":"EX15BT/BLC-4-024","name":"浦原 喜助","color":"blue","energy":3,"ap":1,"bp":3000,"gen":3,"trigger":"active","type":"character","effect":"登場時：最多選自己場上另1個沒有特徵的角色，移至另一條線；目的線已滿時，先選該線1張卡除外。"}
,
{"id":"BLC-1-004","kind":"raidImpactFrontRest","number":"UA08BT/BLC-1-004","name":"エス・ノト","color":"yellow","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈艾斯・諾特〉：轉為 ACTIVE，可移至前線。Impact 1。主要階段・位於前線・每回合 1 次：可選最多 1 個敵方前線 BP 3000 以下角色，將其轉為 REST。"}
,
{"id":"BLC-1-046","kind":"frontMillBuffOther","number":"UA08ST/BLC-1-046","name":"阿散井 恋次","color":"purple","energy":3,"ap":1,"bp":3500,"gen":1,"trigger":null,"type":"character","effect":"前線・每回合 1 次：牌堆頂 1 張送場外，成功時可讓另一己方角色本回合 BP +500。"}
,
{"id":"BLC-4-063","kind":"namedBonusBuff","number":"EX15BT/BLC-4-063","name":"綾瀬川 弓親","color":"green","energy":3,"ap":1,"bp":2000,"gen":3,"trigger":"draw","type":"character","effect":"登場時：最多選自己場上另1個角色，本回合BP+1000；若所選角色為《更木劍八》、《草鹿八千流》、《斑目一角》或《綾瀨川弓親》，改為BP+2000。"}
,
{"id":"BLC-4-064","kind":"groupedTopDiscard","number":"EX15BT/BLC-4-064","name":"伊勢 七緒","color":"green","energy":0,"ap":1,"bp":1000,"gen":1,"trigger":null,"type":"character","effect":"登場時：查看牌庫頂3張，最多公開1張綠色事件卡或綠色場地卡加入手牌，其餘依任意順序放回牌庫底；若有加入手牌，將1張手牌送至場外。"}
,
{"id":"BLC-2-005","kind":"ownCharacterFrontRest","number":"EX07BT/BLC-2-005","name":"日番谷 冬獅郎","color":"yellow","energy":3,"ap":1,"bp":3500,"gen":1,"trigger":"active","type":"character","effect":"登場：若透過己方角色的效果登場，可將最多 1 個敵方前線角色轉為 REST。"}
,
{"id":"BLC-2-006","kind":"ownCharacterDrawImpact","number":"EX07BT/BLC-2-006","name":"バンビエッタ・バスターバイン","color":"yellow","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"color","type":"character","effect":"登場：若透過己方角色的效果登場，抽 1 張。主要階段・每回合 1 次：支付 1 AP，使此角色本回合獲得 Impact 1。"}
,
{"id":"BLC-2-058","kind":"peekAttackRemove","number":"EX07BT/BLC-2-058","name":"二枚屋 王悦","color":"purple","energy":3,"ap":1,"bp":2000,"gen":2,"trigger":"active","type":"character","effect":"登場：查看己方牌堆頂 1 張，將其放至牌堆頂或牌堆底。攻擊時：可將手牌中 1 張具有「零番隊」特徵的卡除外；成功時此角色本回合 BP +2000。"}
,
{"id":"BLC-2-033","kind":"drawOrPrintedApDraw","number":"EX07BT/BLC-2-033","name":"朽木 ルキア","color":"blue","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"登場：抽 1 張，再將 1 張手牌送至場外；若己方前線有原始 AP 消耗 2 以上角色，可改為只抽 1 張。"}
,
{"id":"BLC-1-022","kind":"revealOppTop","number":"UA08BT/BLC-1-022","name":"ユーハバッハ","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":"color","type":"character","effect":"登場：敵方公開牌堆頂 1 張；由己方選擇將該卡放回敵方牌堆頂或送至場外。"},
{"id":"BLC-2-011","kind":"revealTraitOrNameOutside","number":"EX07BT/BLC-2-011","name":"リルトット・ランパード","color":"yellow","energy":1,"ap":1,"bp":1500,"gen":1,"trigger":null,"type":"character","effect":"登場：公開己方牌堆頂 3 張，可將其中最多 1 張具有「邦比愛塔親衛隊」特徵或名為〈邦比愛塔・芭絲塔拜茵〉的卡加入手牌，其餘送至場外。若有卡加入手牌，再將 1 張手牌送至場外。"},
{"id":"BLC-1-060","kind":"chooseEnergyRevealOutside","number":"UA08BT/BLC-1-060","name":"兵主部 一兵衛","color":"purple","energy":3,"ap":1,"bp":2500,"gen":1,"trigger":"active","type":"character","effect":"登場：指定 1 個需求能源數值，公開己方牌堆頂 2 張；可將其中最多 1 張需求能源等於該數值的角色卡加入手牌，其餘送至場外。"},
{"id":"BLC-1-038","kind":"optionalMillPurple","number":"UA08BT/BLC-1-038","name":"浦原 喜助","color":"purple","energy":3,"ap":2,"bp":3500,"gen":1,"trigger":null,"type":"character","effect":"登場：可將己方牌堆頂 3 張送至場外；成功時可從己方場外將最多 1 張紫色角色卡加入手牌。"},
{"id":"BLC-2-014","kind":"optionalEnergyBounce","number":"EX07BT/BLC-2-014","name":"井上 織姫","color":"blue","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":"color","type":"character","effect":"登場：可將 1 個己方場上需求能源 2 以下角色返回手牌；成功時可從己方場外將最多 1 張需求能源 2 以下的卡加入手牌。"},
{"id":"BLC-2-001","kind":"stepOnceFrontOr","number":"EX07BT/BLC-2-001","name":"アスキン・ナックルヴァール","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":null,"type":"character","effect":"Step：己方移動階段可由前線移至能源線。主要階段・每回合 1 次：敵方前線有 BP 低於原始 BP 的角色，或有 REST 角色時，此角色本回合 BP +1000。"},
{"id":"BLC-4-037","kind":"replayOnPlayDown","number":"EX15BT/BLC-4-037","name":"ネリエル・トゥ・オーデルシュヴァンク","color":"blue","energy":3,"ap":1,"bp":2000,"gen":3,"trigger":"draw","type":"character","effect":"登場時：最多選1個對方前線BP1500以上的角色，本回合BP−1000。啟動・主要〔支付1 AP／每回合1次〕：發動此角色的登場時效果。"},
{"id":"BLC-4-071","kind":"stepDrawNameActive","number":"EX15BT/BLC-4-071","name":"砕蜂","color":"green","energy":4,"ap":1,"bp":2000,"gen":3,"trigger":"draw","type":"character","effect":"Step：移動階段可從前線移至能量線。登場時：抽1張牌，再將1張手牌送至場外。啟動・主要：將此角色改為Active；所有《碎蜂》的此效果合計每回合僅限1次。"},
{"id":"BLC-3-005","kind":"reducedFrontNameActive","number":"UA04NC/BLC-3-005","name":"阿散井 恋次","color":"purple","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"active","type":"character","effect":"【無效化 Impact】與此角色戰鬥的角色，在該次戰鬥中失去 Impact。\n【啟動主要】只有對手前線有目前 BP 低於原本 BP 的角色時才能發動。將此角色轉為 Active。〈阿散井戀次〉的此效果每回合只能發動一次。"},
{"id":"BLC-4-006","kind":"outsideAbsentFieldNameBp","number":"EX15BT/BLC-4-006","name":"バズビー","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":3,"trigger":null,"type":"character","effect":"Impact無效。自己的回合中：若自己場外沒有《友哈巴赫》，且自己場上有《雨葛蘭・哈斯沃德》，此角色BP+1000。"},
{"id":"BLC-4-047","kind":"restRetireZeroIchigo","number":"EX15BT/BLC-4-047","name":"コン","color":"purple","energy":0,"ap":1,"bp":500,"gen":1,"trigger":"draw","type":"character","effect":"啟動・主要〔改為Rest，並使此卡退場〕：可從自己場外將最多1張所需能量0的紫色《黑崎一護》以Rest登場。"},
{"id":"BLC-2-017","kind":"discardBlockAtLeast","number":"EX07BT/BLC-2-017","name":"黒崎 一護","color":"blue","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":null,"type":"character","effect":"主要階段・每回合 1 次：將 1 張手牌送至場外，使此角色本回合不能被 BP 4000 以上角色阻擋。"},
{"id":"BLC-4-003","kind":"emptyStepRetireDown","number":"EX15BT/BLC-4-003","name":"アスキン・ナックルヴァール","color":"yellow","energy":2,"ap":1,"bp":2000,"gen":1,"trigger":"active","type":"character","effect":"自己場上沒有任何卡片時，手牌中的此卡所需黃色能量減少2。Step：移動階段可從前線移至能量線。退場時：若為自己的回合，最多選1個對方前線BP1500以上的角色，本回合BP−1000。"},
{"id":"BLC-2-028","kind":"impactDiscardApActive","number":"EX07BT/BLC-2-028","name":"阿散井 恋次","color":"blue","energy":3,"ap":2,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"Impact 無效。登場：可將 1 張手牌送至場外；成功時可將最多 1 張己方 AP 卡轉為 ACTIVE。主要階段・每回合 1 次：己方前線有其他原始 AP 消耗 2 以上角色時，將此角色轉為 ACTIVE。"},
{"id":"BLC-4-043","kind":"aliasColorTopOutside","number":"EX15BT/BLC-4-043","name":"眠七號","color":"blue","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"此卡也視為《涅音夢》。登場時：查看牌庫頂2張，可將最多1張藍色《涅繭利》、《涅音夢》或具有「涅骸部隊」特徵的卡送至場外，其餘依任意順序放回牌庫頂。"},
{"id":"BLC-4-051","kind":"entryTurnChooseDraw","number":"EX15BT/BLC-4-051","name":"朽木 白哉","color":"purple","energy":3,"ap":1,"bp":2000,"gen":3,"trigger":"draw","type":"character","effect":"啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動，選1項。①抽1張牌，再將1張手牌送至場外。②若對方前線有BP低於印刷BP的角色，抽1張牌。"},
{"id":"BLC-4-068","kind":"restFrontNameOnce","number":"EX15BT/BLC-4-068","name":"京楽 春水","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"active","type":"character","effect":"Impact無效。啟動・主要〔前線／支付1 AP〕：僅在此角色為Rest時可發動；將此角色改為Active，並最多選1個對方前線角色改為Rest。所有《京樂春水》的此效果合計每回合僅限1次。"}
,
{"id":"BLC-4-010","kind":"frontDiscardFieldDown","number":"EX15BT/BLC-4-010","name":"ペルニダ・パルンカジャス","color":"yellow","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"draw","type":"character","effect":"啟動・主要〔前線／每回合1次／將1張手牌送至場外〕：僅在自己場上有《友哈巴赫》時可發動；選1個對方場上BP1500以上的角色，本回合BP−1000。"}
,
{"id":"BLC-2-024","kind":"handOutsideTraitlessRest","number":"EX07BT/BLC-2-024","name":"四楓院 夜一","color":"blue","energy":4,"ap":1,"bp":3500,"gen":1,"trigger":"active","type":"character","effect":"己方回合中，此角色 BP +500。登場：若本回合己方曾將手牌送至場外，可從手牌將最多 1 張需求能源 1 以下、AP 消耗 1、且不具有特徵的藍色角色卡，以 REST 登場於己方場上。"}
,
{"id":"BLC-4-039","kind":"energyApRestBuff","number":"EX15BT/BLC-4-039","name":"朽木 ルキア","color":"blue","energy":2,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"登場時〔能量線〕：若自己的前線有印刷消費AP為2以上的角色，將此角色改為Active。啟動・主要〔改為Rest〕：選自己場上另1個角色，本回合BP+1000；若所選角色的印刷消費AP為2以上，可將1張手牌送至場外，如此則將所選角色改為Active。"}
,
{"id":"BLC-3-003","kind":"chooseBuffOrAttackEndRetire","number":"UA04NC/BLC-3-003","name":"涅 マユリ","color":"blue","energy":1,"ap":1,"bp":1500,"gen":1,"trigger":"active","type":"character","effect":"【登場時】選擇以下一項：\n・可以選擇最多 1 張自己場上的其他角色，在本回合中 BP＋1000。\n・可以選擇最多 1 張自己場上的其他角色，在本回合中 BP＋3000，並賦予「此角色的攻擊結束時，將此角色退場」。"}
,
{"id":"BLC-4-072","kind":"discardVisoredRest","number":"EX15BT/BLC-4-072","name":"平子 真子","color":"green","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":null,"type":"character","effect":"登場時：可將1張手牌送至場外；如此則可從場外將最多1張能量需求已滿足、消費AP1且具有「假面軍勢」特徵的卡以Rest登場（可選剛丟棄的卡）。"}
,
{"id":"BLC-1-026","kind":"raidHostAny","number":"UA08BT/BLC-1-026","name":"ロイド・ロイド（R）","color":"yellow","energy":1,"ap":1,"bp":2000,"gen":1,"trigger":null,"type":"character","effect":"己方具有 Raid 的角色卡可在此角色上 Raid。"}
,
{"id":"BLC-1-025","kind":"blockRaidBp","number":"UA08BT/BLC-1-025","name":"ロイド・ロイド（L）","color":"yellow","energy":3,"ap":1,"bp":3500,"gen":1,"trigger":null,"type":"character","effect":"阻擋時：此角色本回合 BP −1000；若攻擊中的敵方角色處於 Raid 狀態，改為 BP +1000。"}
,
{"id":"BLC-1-033","kind":"raidOrNameRetire","number":"UA08BT/BLC-1-033","name":"星章化","color":"yellow","energy":5,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"使 1 個敵方前線 BP 3000 以下角色退場；若敵方場上有 Raid 角色，或己方場上有〈友哈巴赫〉，BP 上限改為 5000。"}
,
{"id":"BLC-1-031","kind":"frontRestOrSkipDraw","number":"UA08BT/BLC-1-031","name":"The Fear","color":"yellow","energy":3,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"可選最多 1 個敵方前線角色，將其轉為 REST；己方場上有〈艾斯・諾特〉時，改為將其轉為 REST、使其跳過下一次轉為 ACTIVE，並抽 1 張。"}
,
{"id":"BLC-1-096","kind":"frontRestSkipOrRetire","number":"UA08BT/BLC-1-096","name":"大紅蓮氷輪丸","color":"green","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"選 1 個敵方前線 BP 5000 以下角色，將其轉為 REST，並使其跳過下一次轉為 ACTIVE；己方場上有〈日番谷冬獅郎〉時，改為使該角色退場。"}
,
{"id":"BLC-1-065","kind":"handApWhileByakuya","number":"UA08BT/BLC-1-065","name":"千本桜景厳","color":"purple","energy":4,"ap":2,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"己方場上有〈朽木白哉〉時，手牌中此卡的 AP 消耗減少 1。可使最多 1 個敵方前線角色本回合 BP −3000，再可使最多 1 個敵方前線角色本回合 BP −1000。"}
,
{"id":"BLC-4-021","kind":"bazzBurnRetire","number":"EX15BT/BLC-4-021","name":"バーニング・フル・フィンガーズ","color":"yellow","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"僅在自己場上有《巴茲比》時可使用。選1個對方前線BP5000以下的角色使其退場；若自己場上有至少1個所需能量5以上的《巴茲比》，可再最多選自己的1個《巴茲比》，本回合BP+1000。"}
,
{"id":"BLC-4-081","kind":"katenEnergyActive","number":"EX15BT/BLC-4-081","name":"花天狂骨枯松心中","color":"green","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"僅在自己場上有《京樂春水》時可使用。選1個對方前線BP5000以下的角色使其退場；最多選自己能量線1張《花天》或《狂骨》改為Active。"}
,
{"id":"BLC-2-012","kind":"bambiesPerBp","number":"EX07BT/BLC-2-012","name":"聖隷","color":"yellow","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"使 1 個敵方前線角色退場；其 BP 必須不高於「己方場上具有『邦比愛塔親衛隊』特徵及名為〈邦比愛塔・芭絲塔拜茵〉的卡片合計數量 ×1000」。"}
,
{"id":"BLC-1-081","kind":"kenpachiEnergyFront","number":"UA08BT/BLC-1-081","name":"更木 剣八","color":"green","energy":4,"ap":2,"bp":4000,"gen":0,"trigger":"draw","type":"character","effect":"此卡不能登場於能源線，也不能移至能源線。Impact 1。登場：可使最多 1 個敵方前線 BP 2000 以下角色退場；己方場上有至少 6 張其他具有「護廷十三隊」特徵的卡時，BP 上限改為 4000。"}
,
{"id":"BLC-2-037","kind":"mayuriTraitRetire","number":"EX07BT/BLC-2-037","name":"涅 マユリ","color":"blue","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":null,"type":"character","effect":"登場：可使 1 個己方場上具有「涅骸部隊」特徵的角色退場；成功時，可使最多 1 個敵方前線角色退場，其 BP 必須不高於該己方角色的 BP，然後抽 1 張。"}
,
{"id":"BLC-2-045","kind":"nemSquadActivePair","number":"EX07BT/BLC-2-045","name":"勝手にギャアギャア喋るんじゃないヨ","color":"blue","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"使 1 個己方場上具有「涅骸部隊」特徵的角色退場；成功時抽 1 張，再可從己方場外將最多 2 張符合需求能源、AP 消耗 1 的藍色〈涅音夢〉或具有「涅骸部隊」特徵的角色卡，以 ACTIVE 登場於己方場上。"}
,
{"id":"BLC-1-061","kind":"soulPalaceTop","number":"UA08BT/BLC-1-061","name":"霊王宮","color":"purple","energy":2,"ap":1,"bp":0,"gen":1,"trigger":"get","type":"field","effect":"此場域以 ACTIVE 登場。主要階段：REST 此場域，查看己方牌堆頂 1 張；若具有「零番隊」特徵，可公開並加入手牌；若未加入手牌，將其放回牌堆頂或送至場外。"}
,
{"id":"BLC-4-077","kind":"kyokotsuField","number":"EX15BT/BLC-4-077","name":"狂骨","color":"green","energy":3,"ap":1,"bp":0,"gen":3,"trigger":"draw","type":"field","effect":"登場時：可從場外將最多1張《神劍・八鏡劍》加入手牌。啟動・主要〔改為Rest，並使此卡退場〕：最多選自己場上1張卡改為Active；再最多選自己場上1個角色，本回合BP+1000。"}
,
{"id":"BLC-4-079","kind":"hakkokenChoose","number":"EX15BT/BLC-4-079","name":"神剣・八鏡剣","color":"green","energy":3,"ap":1,"bp":0,"gen":0,"trigger":null,"type":"event","effect":"選1項：①抽1張牌。②最多選自己場上1個《伊勢七緒》，本回合賦予BP+3000及Impact(1)。完成所選效果後，可將自己場上1個Active的《京樂春水》或《伊勢七緒》改為Rest；如此則將自己的1張AP卡改為Active。"}
,
{"id":"BLC-2-064","kind":"yachiruNamedGrant","number":"EX07BT/BLC-2-064","name":"草鹿 やちる","color":"green","energy":1,"ap":1,"bp":1500,"gen":1,"trigger":"draw","type":"character","effect":"主要階段：REST 並退場自己，可選最多 1 個己方場上的〈更木劍八〉，使其本回合獲得 Impact +1 或 Damage +1；沒有 Impact 的角色獲得 Impact 1，Damage +1 則令直接攻擊傷害增加 1。"}
,
{"id":"BLC-4-018","kind":"lilottoRetireChoice","number":"EX15BT/BLC-4-018","name":"リルトット・ランパード","color":"yellow","energy":0,"ap":1,"bp":1500,"gen":1,"trigger":null,"type":"character","effect":"退場時：若為自己的回合，選1項。①最多選自己場上另1個具有「邦比小隊」特徵的角色或《邦比愛塔・芭絲塔拜因》，將其改為Active。②最多選自己場上另1個具有「邦比小隊」特徵的角色或《邦比愛塔・芭絲塔拜因》，到自己下次回合開始前賦予「不會被對方效果選擇」；對方前線所有BP1000以上的角色本回合BP−500。"}
,
{"id":"BLC-4-008","kind":"bazzSacrificeChain","number":"EX15BT/BLC-4-008","name":"バズビー","color":"yellow","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"登場時：若自己場外沒有《友哈巴赫》，可使自己場上另1個《巴茲比》退場；如此則最多選1個對方前線、BP不超過被退場角色所需能量×1000的角色使其退場，並將此角色改為Active。若以此效果使所需能量5以上的己方角色退場，此角色本回合獲得Impact(1)。"}
,
{"id":"BLC-4-065","kind":"nanaoStepEventActive","number":"EX15BT/BLC-4-065","name":"伊勢 七緒","color":"green","energy":3,"ap":1,"bp":2500,"gen":3,"trigger":"color","type":"character","effect":"Step：移動階段可從前線移至能量線。自己的回合中：若自己的能量線有《京樂春水》，此角色BP+1500。啟動・主要：僅在本回合已使用《神劍・八鏡劍》時可發動；將此角色改為Active。所有《伊勢七緒》的此效果合計每回合僅限1次。"}
,
{"id":"BLC-2-051","kind":"removedKeywordIchigo","number":"EX07BT/BLC-2-051","name":"黒崎 一護","color":"purple","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"Impact 無效。己方除外區有至少 10 張卡，或有至少 2 種不同卡名、具有「零番隊」特徵的卡時，此角色獲得 Damage 2；己方除外區有至少 4 種不同卡名、具有「零番隊」特徵的卡時，再獲得 Impact 1。"}
,
{"id":"BLC-1-092","kind":"frontEnergyBattleRemove","number":"UA08BT/BLC-1-092","name":"山本 元柳斎 重國","color":"green","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"color","type":"character","effect":"此角色位於前線時亦產生能源。己方回合中，與此角色戰鬥並敗北的敵方角色改為除外，且不視為退場。"}
,
{"id":"BLC-4-044","kind":"yoruichiFirstAttack","number":"EX15BT/BLC-4-044","name":"瞬閧・雷神戦形","color":"blue","energy":4,"ap":1,"bp":0,"gen":0,"trigger":"special","type":"event","effect":"選自己場上1個《四楓院夜一》，本回合賦予BP+2000，以及「此角色於本回合進行第一次攻擊時，直到該次攻擊結束，獲得Impact(1)與狙擊（可指定對方前線角色為攻擊對象，該次攻擊不會被阻擋）」。"}
,
{"id":"BLC-4-016","kind":"lilleEntrySacrifice","number":"EX15BT/BLC-4-016","name":"リジェ・バロ","color":"yellow","energy":3,"ap":1,"bp":2500,"gen":4,"trigger":"active","type":"character","effect":"啟動・主要〔每回合1次〕：僅可在此角色登場的回合發動；使自己場上另1個角色退場，如此則此角色到自己下次回合開始前額外產生1個黃色能量，並選1項：①抽1張牌。②最多選1個對方前線BP1500以上的角色，本回合BP−1000。"}
,
{"id":"BLC-4-017","kind":"giselleRestRetireDouble","number":"EX15BT/BLC-4-017","name":"ジゼル・ジュエル","color":"yellow","energy":3,"ap":1,"bp":2500,"gen":3,"trigger":"active","type":"character","effect":"登場時：抽1張牌，再將1張手牌送至場外。啟動・主要〔將此角色改為Rest，並使此卡退場〕：選自己場上1個具有「殭屍」特徵的角色，本回合賦予「2次攻擊」（本回合首次攻擊時將該角色改為Active）。所有《吉賽爾・朱艾兒》的此效果合計每回合僅限1次。"}
,
{"id":"BLC-1-028","kind":"sternritterCastleReplay","number":"UA08BT/BLC-1-028","name":"銀架城","color":"yellow","energy":3,"ap":1,"bp":0,"gen":1,"trigger":"get","type":"field","effect":"登場：查看己方牌堆頂 3 張，可公開其中最多 1 張具有「星十字騎士團」特徵的卡並加入手牌，其餘以任意順序放至牌堆底。主要階段：REST 此場域，使 1 個己方場上角色退場；成功時發動此場域的登場效果。"}
,
{"id":"BLC-2-002","kind":"uryuSwapOrBuff","number":"EX07BT/BLC-2-002","name":"石田 雨竜","color":"yellow","energy":3,"ap":1,"bp":3000,"gen":2,"trigger":"draw","type":"character","effect":"主要階段・每回合 1 次：將 1 張手牌送至場外，選一項：①各選 1 個己方前線與能源線角色，交換其位置；②此角色本回合 BP +1000。己方場上有〈友哈巴赫〉時，可改為執行兩項。"}
,
{"id":"BLC-4-032","kind":"yoruichiEnergySwap","number":"EX15BT/BLC-4-032","name":"四楓院 夜一","color":"blue","energy":3,"ap":1,"bp":3000,"gen":3,"trigger":"color","type":"character","effect":"自己的回合中：若自己場上有《黑崎一護》或《浦原喜助》，此角色BP+1000。〔能量線／每回合1次〕自己的角色攻擊結束時，選自己前線1個本回合尚未攻擊的角色，可將其與此角色交換位置；戰鬥後或傷害的Trigger檢查結束後處理此效果。"}
,
{"id":"BLC-1-011","kind":"bazzDiscardBattleKit","number":"UA08BT/BLC-1-011","name":"バズビー","color":"yellow","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"draw","type":"character","effect":"主要階段：將 1 張手牌送至場外，使此角色本回合獲得 Damage 2，以及「攻擊並贏得戰鬥時，抽 1 張」。"}
,
{"id":"BLC-1-104","kind":"ichigoRemoveFourImpact","number":"UA08ST/BLC-1-104","name":"黒崎 一護","color":"purple","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid 一護：轉為 ACTIVE，可移到前線。每回合 1 次：場外 4 張除外，成功時抽 1 張並獲得 Impact 1。"}
,
{"id":"BLC-1-014","kind":"bambiettaRestRetire","number":"UA08BT/BLC-1-014","name":"バンビエッタ・バスターバイン","color":"yellow","energy":4,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈邦比愛塔・芭絲塔拜茵〉：轉為 ACTIVE，可移至前線。登場：若現在是己方回合，可使最多 1 個敵方前線的 REST 角色退場。"}
,
{"id":"BLC-1-020","kind":"jugramTriggerEnd","number":"UA08BT/BLC-1-020","name":"ユーグラム・ハッシュヴァルト","color":"yellow","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈雨葛蘭・哈斯沃德〉：轉為 ACTIVE，可移至前線。Impact 1。位於前線時，己方攻擊階段結束時，若敵方本回合曾發動 Trigger，抽 2 張，再將 1 張手牌送至場外。登場：己方手牌少於敵方時，敵方將其 1 張手牌送至場外。"}
,
{"id":"BLC-1-050","kind":"byakuyaOutsideRemove","number":"UA08BT/BLC-1-050","name":"朽木 白哉","color":"purple","energy":5,"ap":1,"bp":4000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈朽木白哉〉：轉為 ACTIVE，可移至前線。登場：可將己方場外 2 張卡除外；成功時所有敵方前線角色本回合 BP −1000。主要階段・每回合 1 次：將己方場外 3 張卡除外；成功時此角色本回合獲得 Impact 1。攻擊時：可將己方場外 1 張卡除外；成功時可使最多 1 個敵方前線角色本回合 BP −1000。"},
{"id":"BLC-1-055","kind":"soiFonNextStartRetire","number":"UA08BT/BLC-1-055","name":"砕蜂","color":"purple","energy":4,"ap":1,"bp":3500,"gen":1,"trigger":"draw","type":"character","effect":"主要階段・位於前線・每回合 1 次：支付 1 AP，可選最多 1 個敵方前線 BP 3500 以下角色；下一個敵方回合開始時，使所選角色退場，再將此角色轉為 REST 並移至能源線。"}
,
{"id":"BLC-1-063","kind":"techLookHandOutside","number":"UA08BT/BLC-1-063","name":"技術開発局","color":"purple","energy":2,"ap":1,"bp":0,"gen":0,"trigger":"draw","type":"event","effect":"查看己方牌堆頂 5 張，其中 1 張加入手牌、1 張送至場外，其餘以任意順序放至牌堆底。"}
,
{"id":"BLC-1-093","kind":"yamamotoSquadShift","number":"UA08BT/BLC-1-093","name":"山本 元柳斎 重國","color":"green","energy":7,"ap":1,"bp":5000,"gen":1,"trigger":"raid","type":"character","effect":"Raid〈山本元柳齋重國〉：轉為 ACTIVE，可移至前線。Impact 1。登場：可將己方能源線任意數量、具有「護廷十三隊」特徵的卡移至前線。攻擊時：所有其他己方場上具有「護廷十三隊」特徵的卡，本回合 BP +2000。"}
,
{"id":"BLC-2-009","kind":"giselleFieldCountActive","number":"EX07BT/BLC-2-009","name":"ジゼル・ジュエル","color":"yellow","energy":4,"ap":2,"bp":4000,"gen":1,"trigger":"get","type":"character","effect":"登場：己方場上其他具有「邦比愛塔親衛隊」特徵、「殭屍」特徵或名為〈邦比愛塔・芭絲塔拜茵〉的卡，合計至少 3 張時，抽 2 張，再將 2 張手牌送至場外。主要階段・位於前線・每回合 1 次：使 1 個己方場上不具有「殭屍」特徵的角色退場；成功時可從己方場外將最多 1 張具有「殭屍」特徵的黃色角色卡以 ACTIVE 登場於己方場上。"}
,
{"id":"BLC-2-013","kind":"orihimeIchigoProtect","number":"EX07BT/BLC-2-013","name":"井上 織姫","color":"blue","energy":2,"ap":1,"bp":3000,"gen":1,"trigger":"draw","type":"character","effect":"此卡因己方場上藍色〈黑崎一護〉的效果從手牌送至場外時，可選最多 1 個己方場上的〈黑崎一護〉；直到下一個己方回合開始前，使其不會被敵方角色或 Trigger 的效果選為對象。"}
,
{"id":"BLC-2-030","kind":"byakuyaRukiaApChoice","number":"EX07BT/BLC-2-030","name":"朽木 白哉","color":"blue","energy":4,"ap":2,"bp":4000,"gen":1,"trigger":"color","type":"character","effect":"登場：選一項：①若本回合己方場上曾有〈朽木露琪亞〉登場，可將最多 1 張己方 AP 卡轉為 ACTIVE；②本回合下一張從手牌使用的〈朽木露琪亞〉，AP 消耗減少 1。攻擊時：抽 1 張。"}
 ].map(x=>Object.freeze(x)));
export const BLEACH_V2_NEW_IDS=Object.freeze(BLEACH_V2_ADDON_PROFILES.map(p=>p.id));

export function checkedBleachAddonDefinition(p){
 const c=CARDS.find(x=>x.identity===p.id);
 // UA01DC/BLC-4-082 and UA01DC/BLC-4-083 have no unionarena-tcg.com URL in
 // the catalogue. Accept only the recorded shop page; do not invent one.
 const recordedShopSource=p.id==='BLC-4-082'&&c?.source==='https://shopping.fullcomp.jp/products/pdsrqs97vlmo'||
  p.id==='BLC-4-083'&&c?.source==='https://dorasuta.jp/union-arena/product?pid=709493';
 if(!c || c.identity!==p.id || ![c.number,...(c.aliases||[])].includes(p.number) ||
    !(c.source?.includes('unionarena-tcg.com/jp/cardlist/')||recordedShopSource) ||
    c.nameJa!==p.name || c.color!==p.color ||
    c.energy!==p.energy || c.ap!==p.ap || c.bp!==p.bp || c.gen!==p.gen ||
    (c.trigger??null)!==(p.trigger??null) || c.type!==p.type ||
    c.effect!==p.effect)
  throw Error('BLEACH printed card changed; official recheck required: '+p.id);
 if(p.kind==='plain' && c.effect!=='無固有效果。')
  throw Error('Not a vanilla BLEACH card: '+p.id);
 if(p.kind==='plainAlt' && c.effect!=='無一般效果。')
  throw Error('Not a vanilla BLEACH card: '+p.id);
 if(p.kind==='step' && !/^Step：/.test(c.effect))
  throw Error('Not a STEP-only BLEACH card: '+p.id);
 if(p.kind==='bounce' && !/(登場|登場時)/.test(c.effect))
  throw Error('Not a printed onPlay bounce: '+p.id);
 const abilities={
  bounce:{onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]},
  drawPlay:{onPlay:[{template:'draw',count:1}]},
  drawPlayColorHand:{onPlay:[{template:'draw',count:1}]} ,
  buffOtherOwn1000:{onPlay:[{template:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]},
  drawDiscardPlay:{onPlay:[{template:'drawDiscardOne'}]},
  drawDiscardAttack:{onAttack:[{template:'drawDiscardOne'}]},
  buffAttack1000:{onAttack:[{template:'buffSelf',bp:1000}]},
  recoverAp2:{onPlay:[{template:'recoverAp',count:2}]},
  traitBuffAllDraw:{onPlay:[{template:'buffOwnTraitAllTurn',trait:'護廷十三隊',bp:1000},{template:'draw',count:1}]},
  restEnemy3500:{onPlay:[{template:'restEnemyUnderBp',bp:3500,optional:true}]},
  restEnemyFrontOne:{onPlay:[{template:'restEnemyFrontOne',optional:false}]},
   enterActiveAttackRestSkip:{onAttack:[{template:'skipNextActiveOppRest',optional:true}]},
  retireBonusYamamoto:{onPlay:[{template:'retireEnemyUnderBp',bp:3000,bonusName:'山本元柳斎重國',bonusBp:5000}]},
  retireBonusRukia:{onPlay:[{template:'retireEnemyUnderBp',bp:3000,bonusName:'朽木ルキア',bonusBp:5000}]},
  enemyBpDown1000:{onPlay:[{template:'enemyBpDown',bp:1000,optional:true}]},
  enemyBpDown500Color:{onPlay:[{template:'enemyBpDown',bp:500,optional:true}]},
  inspectTop2:{onPlay:[{template:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]},
  inspectTop3:{onPlay:[{template:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]},
  peekTopOrBottom:{onPlay:[{template:'peekTopOrBottom'}]},
  aliasPeekTopOutside:{onPlay:[{template:'peekTopOne'}]},
  inspectTopAnyOutside2:{onPlay:[{template:'inspectTopAnyOutside',count:2,rest:'top'}]},
  frontBpDownMin1000:{onPlay:[{template:'enemyFrontBpDownInRange',bp:500,minBp:1000,maxBp:null}]},
  onRetireRestUnder2000:{onRetire:[{template:'restEnemyUnderBp',bp:2000,optional:true}]},
  fieldBuffRecoverAp:{onPlay:[
   {template:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:false,excludeSelf:false},
   {template:'recoverAp',count:1}]},
  stepAttackTraitBuff:{onAttack:[{template:'buffOwnField',filter:{field:'trait',value:'護廷十三隊'},bp:500,optional:true,excludeSelf:false}]}
 };
// EX15BT/BLC-4-014 prints yellow+ and ACTIVE adds one yellow. The imported legacy gen=2
 // encoded the ACTIVE total; V2 needs the printed REST base (1) plus an ACTIVE +1.
 // EX15BT/BLC-4-074 prints 緑+. That plus is the activate ability, so the REST
 // base is 1. Keep p.gen=2 only as a legacy-source fingerprint.
 const v2BaseGen=p.id==='BLC-4-014'||p.id==='BLC-4-074'?1:
  p.id==='BLC-4-042'||p.id==='BLC-4-024'||p.id==='BLC-4-063'||p.id==='BLC-4-037'||p.id==='BLC-4-071'||p.id==='BLC-4-006'||p.id==='BLC-4-051'||p.id==='BLC-4-077'||p.id==='BLC-4-065'||p.id==='BLC-4-016'||p.id==='BLC-4-017'||p.id==='BLC-4-032'?2:c.gen;
 const isKyoraku=p.kind==='kyorakuAttackEnd';
 const isRestRetireField=p.kind==='fieldRestRetireNamed';
 const isFieldDual=p.kind==='fieldDualMain';
 const isMayuri=p.kind==='mayuriThreeMode';
 const isPassive=p.kind==='activeEnergy'||p.kind==='impactNull';
 const isMain=p.kind==='restSelfEnemy'||p.kind==='restEnergyRetire';
 const isRetireDraw=p.kind==='onRetireDrawOne';
 const isRetireMill=p.kind==='onRetireMillTwo';
 const isPrintedImpact=p.kind==='printedImpact';
 const isPrintedDamage=p.kind==='printedAttackDamage';
 const isOppDiscard=p.kind==='discardOppHandOne';
 const isDrawTwo=p.kind==='drawTwoDiscardOne';
 const isReadyAttack=p.kind==='readyOnFirstAttack';
 const isRestBuff=p.kind==='restSelfBuffOther';
 const isReadyBlock=p.kind==='readyOnFirstBlock';
 const isNamedBp=p.kind==='ownTurnNamedBp';
 const isHandDiscount=p.kind==='opponentFieldHandEnergy';
 const isOwnEffectDraw=p.kind==='drawIfOwnEffectEntry';
 const isOppRestDraw=p.kind==='drawIfOppRestCharacter';
 const isOppBpDraw=p.kind==='drawIfOppCharacterBpAtLeast';
 const isActiveNamed=p.kind==='activeOwnNamed';
 const isNameHandDraw=p.kind==='drawIfOwnNameAndHandFewer';
 const isOwnTurnNameRest=p.kind==='onRetireOwnTurnNameRest';
 const isNameOncePayOutside=p.kind==='nameOncePayOutsideRest';
 const isOutsideRemove=p.kind==='removeOutsideThen';
 const isOppRestBp=p.kind==='oppRestFrontBpEach';
 const isOppBpCount=p.kind==='oppCurrentBpCountBonus';
 const isCardTraitEnergy=p.kind==='otherCardTraitEnergy';
 const isCardTraitBp=p.kind==='otherCardTraitBp';
 const traitBp={'BLC-1-084':500,'BLC-2-068':1500}[p.id];
 const isPrintedApBp=p.kind==='ownFrontPrintedApBp';
 const isHandOutsideBp=p.kind==='handOutsideThisTurnBp';
 const isHandEnergyImmune=p.kind==='handEnergyBpImmune';
 const isMustBlock=p.kind==='impactNullMustBlock';
 const isRetireOr=p.kind==='retireFieldOrOutside';
 const isTraitDiscard=p.kind==='traitDiscardRecoverNamed';
 const isBlockHandBp=p.kind==='blockHandOutsideBp';
 const isBlueShared=['traitlessTopDiscard','ichigoRaidSlash','zangetsuBlockFloor','orihimeEntry','ichigoImpactGrants','rirukaUnder','grimmjowOutsideEntry','getsugaRetire','zangetsuDraw'].includes(p.kind);
 const isGreenShared=['aizenEnergyFront','raidBaseLeaveDamage','restLockFrontUpgrade'].includes(p.kind);
 const isPurpleShared=['millRemoveScale','payDamageRemoveFour','purpleNamesTop','purpleApBpChoice','raidApDiscountChoice','raidDrawDiscardBuff','renjiPayDeploy','topSplitEnergyDraw','emptyRaidPeek','renjiEventRetire'].includes(p.kind);
 const isChooseBuff=p.kind==='chooseBuffOrFrontDown';
 const isImpactPlus=p.kind==='impactPlusTrait';
 const isImpactAp=p.kind==='impactPlusPrintedAp';
 const isApEach=p.kind==='frontPrintedApBpEach';
 const isPurpleIchigo=p.kind==='purpleIchigoBuff';
 const isRestOnceSelf=p.kind==='restOnceSelfBp';
 const isBelowPrinted=p.kind==='oppFrontBelowPrintedBp';
 const isTopDiscard=p.kind==='topFilterDiscard';
 const isNamedHandRest=p.kind==='namedHandRest';
 const isPrintedApTop=p.kind==='printedApTop';
 const isRestFrontEnergy=p.kind==='restFrontEnergy';
 const isDiscardGainEnergy=p.kind==='discardGainEnergy';
 const isNoRaidTop=p.kind==='traitlessNoRaidTop';
 const isFieldDraw=p.kind==='fieldRestRetireDraw';
 const isTopSplit=p.kind==='topSplitSides';
 const isBounceDraw=p.kind==='bounceUnderFrontDraw';
 const isPurpleOutside=p.kind==='restRetirePurpleCharacter';
 const isTraitlessMove=p.kind==='traitlessLineMove';
 const isRaidFrontRest=p.kind==='raidImpactFrontRest';
 const isFrontMill=p.kind==='frontMillBuffOther';
 const isNamedBonus=p.kind==='namedBonusBuff';
 const isGroupedTop=p.kind==='groupedTopDiscard';
 const isOwnCharacterRest=p.kind==='ownCharacterFrontRest';
 const isOwnCharacterDraw=p.kind==='ownCharacterDrawImpact';
 const isPeekAttack=p.kind==='peekAttackRemove';
 const isDrawInstead=p.kind==='drawOrPrintedApDraw';
 const isRevealOppTop=p.kind==='revealOppTop';
 const isRevealWindow=p.kind==='revealTraitOrNameOutside';
 const isEnergyWindow=p.kind==='chooseEnergyRevealOutside';
 const isMillPurple=p.kind==='optionalMillPurple';
 const isEnergyBounce=p.kind==='optionalEnergyBounce';
 const isStepOr=p.kind==='stepOnceFrontOr';
 const isReplayDown=p.kind==='replayOnPlayDown';
 const isStepName=p.kind==='stepDrawNameActive';
 const isReducedActive=p.kind==='reducedFrontNameActive';
 const isOutsideName=p.kind==='outsideAbsentFieldNameBp';
 const isZeroIchigo=p.kind==='restRetireZeroIchigo';
 const isDiscardBlock=p.kind==='discardBlockAtLeast';
 const isEmptyStep=p.kind==='emptyStepRetireDown';
 const isApActive=p.kind==='impactDiscardApActive';
 const isAliasTop=p.kind==='aliasColorTopOutside';
 const isEntryChoose=p.kind==='entryTurnChooseDraw';
 const isRestFrontName=p.kind==='restFrontNameOnce';
 const isFrontFieldDown=p.kind==='frontDiscardFieldDown';
 const isHandOutside=p.kind==='handOutsideTraitlessRest';
 const isEnergyAp=p.kind==='energyApRestBuff';
 const isAttackEnd=p.kind==='chooseBuffOrAttackEndRetire';
 const isDiscardVisored=p.kind==='discardVisoredRest';
 const isRaidHost=p.kind==='raidHostAny';
 const isBlockRaid=p.kind==='blockRaidBp';
 const isRaidOrName=p.kind==='raidOrNameRetire';
 const isRestOrDraw=p.kind==='frontRestOrSkipDraw';
 const isRestOrRetire=p.kind==='frontRestSkipOrRetire';
 const isHandApNamed=p.kind==='handApWhileByakuya';
 const isBazzBurn=p.kind==='bazzBurnRetire';
 const isKatenActive=p.kind==='katenEnergyActive';
 const isBambiesPer=p.kind==='bambiesPerBp';
 const isKenpachi=p.kind==='kenpachiEnergyFront';
 const isMayuriTrait=p.kind==='mayuriTraitRetire';
 const isNemPair=p.kind==='nemSquadActivePair';
 const isSoulPalace=p.kind==='soulPalaceTop';
 const isKyokotsu=p.kind==='kyokotsuField';
 const isHakkoken=p.kind==='hakkokenChoose';
 const isYachiru=p.kind==='yachiruNamedGrant';
 const isLilotto=p.kind==='lilottoRetireChoice';
 const isBazzChain=p.kind==='bazzSacrificeChain';
 const isNanaoEvent=p.kind==='nanaoStepEventActive';
 const isRemovedKeywords=p.kind==='removedKeywordIchigo';
 const isFrontRemove=p.kind==='frontEnergyBattleRemove';
 const isThunderKit=p.kind==='yoruichiFirstAttack';
 const isLille=p.kind==='lilleEntrySacrifice';
 const isGiselle=p.kind==='giselleRestRetireDouble';
 const isCastle=p.kind==='sternritterCastleReplay';
 const isUryu=p.kind==='uryuSwapOrBuff';
 const isYoruichiSwap=p.kind==='yoruichiEnergySwap';
 const isBazzKit=p.kind==='bazzDiscardBattleKit';
 const isIchigoFour=p.kind==='ichigoRemoveFourImpact';
 const isBambiettaRest=p.kind==='bambiettaRestRetire';
 const isJugram=p.kind==='jugramTriggerEnd';
 const isByakuya=p.kind==='byakuyaOutsideRemove';
 const isSoiFon=p.kind==='soiFonNextStartRetire';
 const isTech=p.kind==='techLookHandOutside';
 const isYamamoto=p.kind==='yamamotoSquadShift';
 const isGiselleField=p.kind==='giselleFieldCountActive';
 const isOrihime=p.kind==='orihimeIchigoProtect';
 const isByakuyaRukia=p.kind==='byakuyaRukiaApChoice';
 const topDiscard={
  'BLC-3-007':{count:3,filter:{field:'trait',value:'護廷十三隊'}},
  'BLC-3-002':{count:3,filters:[
   {field:'name',value:'黒崎 一護'},{field:'name',value:'阿散井 恋次'},
   {field:'name',value:'朽木 ルキア'},{field:'name',value:'朽木 白哉'}],logic:'any'},
  'BLC-4-001':{count:3,filters:[
   {field:'name',value:'バズビー'},{field:'name',value:'ユーグラム・ハッシュヴァルト'}],logic:'any'}
 }[p.id];
 const isOwnTurnImmune=p.kind==='ownTurnBpImmune';
 const isFrontSolo=p.kind==='aliasFrontSoloBp';
 const isOtherRetireBp=p.kind==='otherOwnRetireThisTurnBp';
 const renjiName='阿散井 恋次',rukiaName='朽木 ルキア';
 const slashPay={zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']};
 const causedBy=(sourceName,sourceColor)=>({from:'hand',to:'outside',sourceName,
  ...(sourceColor?{sourceColor}:{}),sourceOnField:true,reasons:['payment','own-effect']});
 const grimmjowEntry={op:'payApDeployMovedActive',ap:1,optional:true,minEnergy:4,
  energyColor:'blue',exclusiveTrait:'破面',once:'name'};
 const outsideRemove={'BLC-1-098':{count:1,cardType:'character'},
  'BLC-1-106':{count:3,cardType:'any'}}[p.id];
 const handName={'BLC-2-004':'ユーハバッハ'}[p.id];
 const outsideRestName={'BLC-2-043':'六車 拳西＆鳳橋 楼十郎'}[p.id];
 const namedActive={'BLC-1-076':'更木 剣八'}[p.id];
 const oppBpGate={'BLC-1-027':4000}[p.id];
 const isBlockLow=p.kind==='blockBpAtMost';
 const isFrontDiscardDraw=p.kind==='frontDiscardDraw';
 const isFrontDiscardDown=p.kind==='frontDiscardFieldBpDown';
 const isOptionalPeek=p.kind==='optionalDiscardPeekDraw';
 const isAliasEnergy=p.kind==='aliasFieldRestEnergyRetire';
 const isTopRequired=p.kind==='topOneEnergyDiscount';
 const isTopTwoGotei=p.kind==='topTwoGoteiEvent';
 const isRaidDual=p.kind==='raidStripOrRetireDamage2';
 const isStripDual=isRaidDual||p.kind==='raidStripOrRetire2000';
 const stripRetireBp=isRaidDual?3000:2000;
 const special=isKyoraku||isRestRetireField||isFieldDual||isMayuri||isTopRequired||isTopTwoGotei||p.kind==='plain'||p.kind==='plainAlt'||p.kind==='step'||isPassive||isMain||isRetireDraw||isRetireMill||isPrintedImpact||isPrintedDamage||isOppDiscard||isDrawTwo||isReadyAttack||isStripDual||isRestBuff||isReadyBlock||isNamedBp||isHandDiscount||isOwnEffectDraw||isBlockLow||isFrontDiscardDraw||isFrontDiscardDown||isOptionalPeek||isAliasEnergy||isOppRestDraw||isOppBpDraw||isActiveNamed||isNameHandDraw||isOwnTurnNameRest||isNameOncePayOutside||isOutsideRemove||isOppRestBp||isOppBpCount||isCardTraitEnergy||isCardTraitBp||isPrintedApBp||isHandOutsideBp||isHandEnergyImmune||isMustBlock||isRetireOr||isTraitDiscard||isBlockHandBp||isBlueShared||isGreenShared||isPurpleShared||isOwnTurnImmune||isFrontSolo||isOtherRetireBp||isChooseBuff||isImpactPlus||isImpactAp||isApEach||isPurpleIchigo||isRestOnceSelf||isBelowPrinted||isTopDiscard||isNamedHandRest||isPrintedApTop||isRestFrontEnergy||isDiscardGainEnergy||isNoRaidTop||isFieldDraw||isTopSplit||isBounceDraw||isPurpleOutside||isTraitlessMove||isRaidFrontRest||isFrontMill||isNamedBonus||isGroupedTop||isOwnCharacterRest||isOwnCharacterDraw||isPeekAttack||isDrawInstead||isRevealOppTop||isRevealWindow||isEnergyWindow||isMillPurple||isEnergyBounce||isStepOr||isReplayDown||isStepName||isReducedActive||isOutsideName||isZeroIchigo||isDiscardBlock||isEmptyStep||isApActive||isAliasTop||isEntryChoose||isRestFrontName||isFrontFieldDown||isHandOutside||isEnergyAp||isAttackEnd||isDiscardVisored||isRaidHost||isBlockRaid||isRaidOrName||isRestOrDraw||isRestOrRetire||isHandApNamed||isBazzBurn||isKatenActive||isBambiesPer||isKenpachi||isMayuriTrait||isNemPair||isSoulPalace||isKyokotsu||isHakkoken||isYachiru||isLilotto||isBazzChain||isNanaoEvent||isRemovedKeywords||isFrontRemove||isThunderKit||isLille||isGiselle||isCastle||isUryu||isYoruichiSwap||isBazzKit||isIchigoFour||isBambiettaRest||isJugram||isByakuya||isSoiFon||isTech||isYamamoto||isGiselleField||isOrihime||isByakuyaRukia;
 if(!special&&!Object.hasOwn(abilities,p.kind))
  throw Error('Unsupported BLEACH addon profile '+p.id+'/'+p.kind);
 return {
  id:p.id,name:c.nameJa,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:v2BaseGen,trigger:c.trigger??null,
  traits:Array.isArray(c.traits)?c.traits:(c.traits&&c.traits!=='無'?[c.traits]:[]),
  ...(c.traits==='星十字騎士團／邦比愛塔親衛隊'?{traitComponents:['星十字騎士團','邦比愛塔親衛隊']}:
   c.traits==='破面／涅骸部隊'?{traitComponents:['破面','涅骸部隊']}:
   c.traits==='護廷十三隊／涅骸部隊'?{traitComponents:['護廷十三隊','涅骸部隊']}:
   c.traits==='護廷十三隊／殭屍'?{traitComponents:['護廷十三隊','殭屍']}:
   c.traits==='星十字騎士團／殭屍'?{traitComponents:['星十字騎士團','殭屍']}:{}),
  implementation:p.kind==='plain'||p.kind==='plainAlt'||p.kind==='step'?'vanilla':'dsl',
  ...(p.kind==='step'||p.kind==='stepAttackTraitBuff'||isStepOr||isStepName||isEmptyStep?{step:true}:{}),
  ...(isStepOr?{mainAbility:{op:'onceBuffSelfWhen',oncePerTurn:true,bp:1000,when:{logic:'any',checks:[
   {kind:'oppFrontLiveBpBelowPrinted',turn:'any'},
   {kind:'oppRestCharacter',turn:'any',zone:'front'}]}}}:{}),
  ...(isReplayDown?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500}]}}:{}),
  ...(isStepName?{mainAbility:{op:'nameOnceActive',scope:'name',when:null}}:{}),
  ...(isReducedActive?{impactNull:true,mainAbility:{op:'nameOnceActive',scope:'name',when:{kind:'oppFrontLiveBpBelowPrinted',turn:'any'}}}:{}),
  ...(isOutsideName?{impactNull:true,passiveBonuses:[{condition:{logic:'all',turn:'own',checks:[
   {kind:'ownNameAbsent',turn:'own',zone:'outside',excludeSelf:false,name:'ユーハバッハ'},
   {kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'ユーグラム・ハッシュヴァルト'}]},bp:1000}]}:{}),
  ...(isZeroIchigo?{mainAbility:{op:'restRetireExactOutside',name:'黒崎 一護',color:'purple',energy:0,optional:true}}:{}),
  ...(isDiscardBlock?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'discardGate',optional:false,then:[{op:'grantSelfBlockAtLeast',bp:4000}]}]}}:{}),
  ...(isEmptyStep?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(isApActive?{impactNull:true,mainAbility:{op:'cardOnceActive',scope:'card',when:{kind:'ownPrintedApAtLeast',turn:'any',zone:'front',excludeSelf:true,minAp:2}}}:{}),
  ...(isAliasTop?{nameAliases:['涅 ネム']}:{}),
  ...(isLille?{mainAbility:{op:'entryTurnSacrificeChoice',oncePerTurn:true,energy:1,color:'yellow',minBp:1500,down:1000}}:{}),
  ...(isGiselle?{mainAbility:{op:'nameOnceRestRetireDouble',scope:'name',trait:'殭屍'}}:{}),
  ...(isCastle?{mainAbility:{op:'fieldRestSacrificeReplay'}}:{}),
  ...(isUryu?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'discardGate',optional:false,then:[{op:'swapOrBuff',bp:1000,allName:'ユーハバッハ'}]}]}}:{}),
  ...(isBazzKit?{mainAbility:{op:'repeatDiscardBattleKit'}}:{}),
  ...(isIchigoFour?{raidName:'黒崎 一護',mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'removeOutsideThen',count:4,optional:false,cardType:'any',zone:'outside',controller:'own',then:[{op:'draw',count:1},{op:'grantSelfImpactThisTurn',amount:1}]}]}}:{}),
  ...(isBambiettaRest?{raidName:'バンビエッタ・バスターバイン'}:{}),
  ...(isJugram?{raidName:'ユーグラム・ハッシュヴァルト',printedImpact:1,
   phaseEffects:[{phase:'attack',edge:'end',turn:'own',then:[
    {op:'frontOppTriggerDrawDiscard',count:2,discardCount:1}]}]}:{}),
  ...(isByakuya?{raidName:'朽木 白哉',mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'removeOutsideThen',count:3,optional:false,cardType:'any',zone:'outside',controller:'own',then:[{op:'grantSelfImpactThisTurn',amount:1}]}]}}:{}),
  ...(isSoiFon?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:true,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'markOppFrontRetireNextStart',optional:true,maxBp:3500,thenRestMove:'energy'}]}}:{}),
  ...(isYamamoto?{raidName:'山本 元柳斎 重國',printedImpact:1}:{}),
  ...(isGiselleField?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:true,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'retireOwnMissingTraitThen',trait:'殭屍',then:[{op:'deployOutsideColorTraitActive',color:'yellow',trait:'殭屍'}]}]}}:{}),
  ...(isYoruichiSwap?{energyLineAttackEndSwap:true,triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500},
   passiveBonuses:[{condition:{logic:'any',turn:'own',checks:[
    {kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'黒崎 一護'},
    {kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'浦原 喜助'}]},bp:1000}]}:{}),
  ...(isEntryChoose?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,entryTurnOnly:true,then:[{op:'chooseOne',optional:false,options:[
   {id:'discard',label:'抽1再棄1',turn:'any',then:[{op:'drawDiscard',count:1,discardCount:1}]},
   {id:'below',label:'低BP時抽1',turn:'any',then:[{op:'drawIfOppFrontBelowPrinted',count:1}]}
  ]}]}}:{}),
  ...(isRestFrontName?{impactNull:true,mainAbility:{op:'restFrontNameOnce',scope:'name',payAp:1}}:{}),
  ...(isFrontFieldDown?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:true,raidOnly:false,payAp:0,requiresOwnName:'ユーハバッハ',then:[{op:'discardGate',optional:false,then:[{op:'enemyBpDown',bp:1000,optional:false,minBp:1500,zone:'field'}]}]}}:{}),
  ...(isHandOutside?{ownTurnBp:500}:{}),
  ...(isEnergyAp?{mainAbility:{op:'restBuffThenApActive',bp:1000,minAp:2}}:{}),
   ...(isKyoraku?{raidName:'京楽 春水',
    attackEndSwap:{color:'green',types:['event','field'],minDistinctNames:4}}:{}),
   ...(isRestRetireField?{mainAbility:{op:'fieldRestRetireThen',then:[
    {op:'deployNamedFromZones',name:'京楽 春水',zones:['outside'],
     line:'energy',ready:true,optional:true,color:'green',ap:1,maxEnergy:2}]}}:{}),
   ...(isFieldDual?{mainAbility:{op:'fieldDualMain',retireTrait:'涅骸部隊',
    buffName:'涅 ネム',buffTrait:'涅骸部隊',bp:1000}}:{}),
  ...(isTopRequired?{raidName:'卯ノ花 烈'}:{}),
  ...(isRaidDual?{raidName:'ユーハバッハ',
   passiveBonuses:[{condition:{kind:'retireCountThisTurn',turn:'own',
    controller:'any',cardType:'character',min:2},bp:1000,extraDamage:1}]}:{}),
   ...(p.kind==='enterActiveAttackRestSkip'?{enterActiveIfOpponentRest:true}:{}),
  ...(p.kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(p.kind==='impactNull'?{impactNull:true}:{}),
  ...(isPrintedImpact?{printedImpact:1}:{}),
  ...(isPrintedDamage?{printedAttackDamage:2}:{}),
  ...(isReadyAttack?{readyOnAttackCount:1}:{}),
  ...(isReadyBlock?{readyOnBlockCount:1}:{}),
  ...(isRestBuff?{mainAbility:{op:'restSelfBuffOther',bp:1000}}:{}),
  ...(isNamedBp?{passiveBonuses:[{condition:{kind:'ownNameExists',turn:'own',
   zone:'field',excludeSelf:false,name:'更木 剣八'},bp:1500}]}:{}),
  ...(isHandDiscount?{opponentFieldColorsHandEnergyDiscount:{
   colors:{'BLC-1-007':['purple','green'],'BLC-1-044':['yellow','green'],
    'BLC-1-073':['yellow','purple']}[p.id],amount:1}}:{}),
  ...(isBlockLow?{blockBpRestriction:{relation:'atMost',bp:2000,condition:null}}:{}),
  ...(isFrontDiscardDraw?{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,then:[{op:'draw',count:1}]}]}}:{}),
  ...(isFrontDiscardDown?{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,then:[{op:'enemyBpDown',bp:1000,optional:false,
    minBp:1500,zone:'field'}]}]}}:{}),
  ...(p.kind==='aliasPeekTopOutside'?{nameAliases:['ユーグラム・ハッシュヴァルト']}:{}),
  ...(isAliasEnergy?{nameAliases:['山本 元柳斎 重國'],mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(p.kind==='restSelfEnemy'?{mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:true}}:{}),
  ...(p.kind==='restEnergyRetire'?{mainAbility:{op:'restSelfGainEnergyRetireEndMain',energyOnly:true,oncePerTurn:true,extraEnergy:1}}:{}),
  ...(p.kind.startsWith('retireBonus')?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isNameOncePayOutside||isEnergyBounce?{triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500}}:{}),
  ...(isOppRestBp?{passiveBonuses:[{condition:{kind:'oppRestCharacterCount',turn:'any',
   zone:'front'},bpEach:1000}],triggerEffect:{op:'restOppFrontSkipNextActive'}}:{}),
  ...(isOppBpCount?{passiveBonuses:[{condition:{kind:'oppCharacterCurrentBpCount',turn:'any',
   zone:'field',minBp:4000,min:2},bp:500}]}:{}),
  ...(isCardTraitEnergy?{passiveBonuses:[{condition:{kind:'ownCardTraitCount',turn:'any',
   min:3,zone:'field',excludeSelf:true,trait:'護廷十三隊'},extraEnergy:1}]}:{}),
  ...(isCardTraitBp?{passiveBonuses:[{condition:{kind:'ownCardTraitCount',turn:'any',
   min:6,zone:'field',excludeSelf:true,trait:'護廷十三隊'},bp:traitBp}],
   ...(p.id==='BLC-1-084'?{triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{})}:{}),
  ...(isPrintedApBp?{passiveBonuses:[{condition:{kind:'ownPrintedApAtLeast',turn:'any',
   zone:'front',excludeSelf:false,minAp:2},bp:1500}]}:{}),
  ...(isApEach?{passiveBonuses:[{condition:{kind:'ownPrintedApAtLeast',turn:'own',
   zone:'front',excludeSelf:false,minAp:2},bpEach:500}]}:{}),
  ...(isRestOnceSelf?{mainAbility:{op:'restOnceBuffSelfUntilNextOwnStart',oncePerTurn:true,bp:1000}}:{}),
  ...(isRestFrontEnergy?{mainAbility:{op:'restSelfRestFrontGainEnergy',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(isDiscardGainEnergy?{mainAbility:{op:'discardHandBuffSelf',oncePerTurn:true,discardCount:1,energy:2}}:{}),
  ...(isFieldDraw?{mainAbility:{op:'fieldRestRetireThen',then:[{op:'drawDiscard',count:2,discardCount:1}]}}:{}),
  ...(isBounceDraw?{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'drawDiscard',count:1,discardCount:1}]}}:{}),
  ...(isPurpleOutside?{mainAbility:{op:'restRetireRecoverOutside',optional:false,
   filters:[{field:'color',value:'purple'},{field:'type',value:'character'}],logic:'all'}}:{}),
  ...(isRaidFrontRest?{raidName:'エス・ノト',printedImpact:1,mainAbility:{
   op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'restOppFrontUnderBp',bp:3000,optional:true}]}}:{}),
  ...(isFrontMill?{mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'millTop',count:1,then:[{op:'buffOwnField',filter:{field:'type',value:'character'},
    bp:500,optional:true,excludeSelf:true}]}]}}:{}),
  ...(isBelowPrinted?{passiveBonuses:[{condition:{kind:'oppFrontLiveBpBelowPrinted',turn:'any'},bp:1500}]}:{}),
  ...(isHandOutsideBp?{passiveBonuses:[{condition:{kind:'ownHandToOutsideThisTurn',turn:'any'},bp:500}]}:{}),
  ...(isHandEnergyImmune?{printedHandEnergyDiscount:1,bpDownImmune:true,
   passiveBonuses:[{condition:{kind:'oppCharacterBpAtLeast',turn:'own',zone:'front',minBp:3500},bp:1000}]}:{}),
  ...(isMustBlock?{impactNull:true,mustBlock:true}:{}),
  ...(isOwnTurnImmune?{bpDownImmune:true,ownTurnBp:1000}:{}),
  ...(p.id==='BLC-4-001'?{nameAliases:['バズビー']}:{}),
  ...(isFrontSolo?{nameAliases:['山本 元柳斎 重國'],passiveBonuses:[{
   condition:{kind:'ownFrontNoOtherCharacter',turn:'any'},bp:1000}]}:{}),
  ...(isOtherRetireBp?{passiveBonuses:[{condition:{kind:'retireCountThisTurn',turn:'own',
   controller:'own',cardType:'character',min:1,excludeSelf:true},bp:1000}]}:{}),
  ...(isRetireOr?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isBlockHandBp?{readyOnBlockCount:1,passiveBonuses:[{condition:{kind:'ownHandToOutsideThisTurn',turn:'own'},bp:1000}]}:{}),
  ...(p.kind==='ichigoRaidSlash'?{raidName:'黒崎 一護',mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment:slashPay,then:[{op:'draw',count:1},{op:'buffSelf',bp:1000},
    {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',then:[{op:'draw',count:1}]}]}]}}:{}),
  ...(p.kind==='zangetsuBlockFloor'?{moveTriggers:[{when:causedBy('黒崎 一護','blue'),
   then:[{op:'grantCauseBlockAtMost',bp:3000,optional:true}]}]}:{}),
  ...(p.kind==='orihimeEntry'?{enterAlwaysActive:true,mainAbility:{op:'entryTurnProtect',oncePerTurn:true,selectionScope:'any'}}:{}),
  ...(p.kind==='ichigoImpactGrants'?{impactNull:true,mainAbility:{op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment:slashPay,then:[{op:'draw',count:1},{op:'buffSelf',bp:1500},
    {op:'grantSelfEnergyMoveOnAttackStart'},{op:'grantSelfTriggerUnchosen'}]}]}}:{}),
  ...(p.kind==='rirukaUnder'?{moveObserver:{op:'restSelfTuckMovedFaceDown',when:causedBy('黒崎 一護')},
   mainAbility:{op:'restRetireRecoverUnder'},triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500}}:{}),
  ...(p.kind==='grimmjowOutsideEntry'?{moveTriggers:[
   {when:causedBy('黒崎 一護'),then:[{...grimmjowEntry}]},
   {when:causedBy('浦原 喜助'),then:[{...grimmjowEntry}]}]}:{}),
  ...(p.kind==='getsugaRetire'?{triggerEffect:{op:'retireOppFront'},moveTriggers:[{when:causedBy('黒崎 一護','blue'),
   then:[{op:'handBottomGrantDoubleAttack',optional:true}]}]}:{}),
  ...(p.kind==='zangetsuDraw'?{moveTriggers:[{when:causedBy('黒崎 一護','blue'),then:[{op:'draw',count:1}]}]}:{}),
  ...(isOrihime?{moveTriggers:[{when:causedBy('黒崎 一護','blue'),then:[{op:'grantNamedFieldProtection',name:'黒崎 一護',scope:'characterOrTrigger',optional:true,until:'nextOwnStart'}]}]}:{}),
  ...(isByakuyaRukia?{triggerEffect:{op:'bounceOppFrontUnderBp',bp:3500}}:{}),
  ...(p.kind==='aizenEnergyFront'?{frontForbidden:true,mainAbility:{op:'restTwoActiveFrontMoveSelf',line:'energy'}}:{}),
  ...(p.kind==='raidBaseLeaveDamage'?{raidName:'更木 剣八',bpDownImmune:true,printedImpact:1,
   raidHandLeaveReplace:{minBaseEnergy:4}}:{}),
  ...(p.kind==='restLockFrontUpgrade'?{raidName:'日番谷 冬獅郎'}:{}),
  ...(p.kind==='millRemoveScale'?{raidName:'黒崎 一護'}:{}),
  ...(p.kind==='payDamageRemoveFour'?{raidName:'阿散井 恋次',mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}}:{}),
  ...(p.kind==='purpleApBpChoice'?{passiveBonuses:[{condition:{kind:'ownEffectApPaidColor',turn:'any',color:'purple'},bp:2000}],mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:true,raidOnly:false,payAp:1,requiresOwnName:rukiaName,then:[{op:'chooseOne',optional:false,options:[{id:'draw',label:'抽1張',turn:'any',then:[{op:'draw',count:1}]},{id:'active',label:'改為Active並減BP',turn:'any',then:[{op:'activeSelf'},{op:'enemyBpDown',bp:1000,optional:true}]}]}]}}:{}),
  ...(p.kind==='raidApDiscountChoice'?{raidName:'阿散井 恋次',raidHandApDiscount:{amount:1,requiresEffectApColor:'purple',voidIfOtherZeroApHandName:true},mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:true,raidOnly:true,payAp:0,requiresOwnName:null,then:[{op:'chooseOne',optional:false,options:[{id:'impact',label:'Impact 1',turn:'any',then:[{op:'grantSelfImpactThisTurn',amount:1}]},{id:'down',label:'敵方前線BP-1000',turn:'any',then:[{op:'enemyBpDown',bp:1000,optional:false}]}]}]}}:{}),
  ...(p.kind==='raidDrawDiscardBuff'?{raidName:'朽木 ルキア',mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:0,requiresOwnName:null,then:[{op:'discardGate',optional:false,then:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:500,optional:true,excludeSelf:false}]}]}}:{}),
  ...(p.kind==='renjiPayDeploy'?{triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}}:{}),
  ...(p.kind==='emptyRaidPeek'?{emptyOwnFieldHandEnergyDiscount:2}:{}),
  ...(p.kind==='renjiEventRetire'?{playRequiresOwnName:renjiName,triggerEffect:{op:'retireOppFront'}}:{}),
  ...(p.kind==='enemyBpDown500Color'?{triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}}:{}),
  ...(p.kind==='drawPlayColorHand'?{triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(isOwnCharacterDraw?{mainAbility:{op:'oncePayProgram',oncePerTurn:true,frontOnly:false,raidOnly:false,payAp:1,requiresOwnName:null,then:[{op:'grantSelfImpactThisTurn',amount:1}]},triggerEffect:{op:'restOppFrontSkipNextActive'}}:{}),
  ...(isRevealOppTop?{triggerEffect:{op:'restOppFrontSkipNextActive'}}:{}),
  ...(isRaidHost?{raidHostAny:true}:{}),
  ...(isBlockRaid?{blockRaidBp:{plain:-1000,raid:1000}}:{}),
  ...(isRaidOrName?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isRestOrDraw?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isRestOrRetire?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isHandApNamed?{handApDiscountWhileName:{name:'朽木 白哉',amount:1},triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isBazzBurn?{playRequiresOwnName:'バズビー',triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isKatenActive?{playRequiresOwnName:'京楽 春水',triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isBambiesPer?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isNemPair?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(isSoulPalace?{enterAlwaysActive:true,mainAbility:{op:'restSelfTopTraitHand',trait:'零番隊'}}:{}),
  ...(isKyokotsu?{mainAbility:{op:'fieldRestRetireActiveBuff',bp:1000}}:{}),
  ...(isYachiru?{mainAbility:{op:'restRetireNamedGrant',name:'更木 剣八'}}:{}),
  ...(isKenpachi?{energyForbidden:true,printedImpact:1}:{}),
  ...(isNanaoEvent?{step:true,passiveBonuses:[{condition:{kind:'ownNameExists',turn:'own',zone:'energy',excludeSelf:false,name:'京楽 春水'},bp:1500}],
   mainAbility:{op:'nameOnceActiveIfEvent',scope:'name',eventName:'神剣・八鏡剣'},
   triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(isRemovedKeywords?{impactNull:true,passiveBonuses:[
   {condition:{logic:'any',turn:'any',checks:[
    {kind:'ownRemovedCountAtLeast',turn:'any',min:10},
    {kind:'ownRemovedDistinctTrait',turn:'any',trait:'零番隊',min:2}]},attackDamage:2},
   {condition:{kind:'ownRemovedDistinctTrait',turn:'any',trait:'零番隊',min:4},impact:1}]}:{}),
  ...(isFrontRemove?{frontGeneratesEnergy:true,battleRemoveInstead:true,
   triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(isThunderKit?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(!special?{templateEffects:abilities[p.kind]}:{effects:
   isPrintedApTop?{onPlay:[{op:'searchTopUpToTwoBottom',count:5,max:1,rest:'bottom',
    logic:'all',filters:[{field:'printedApAtLeast',value:2}]}]}:
   isNamedHandRest?{onPlay:[{op:'deployOwnHandRest',type:'character',color:'green',
    energy:2,ap:1,max:1,when:{kind:'ownNameExists',turn:'any',zone:'field',
    excludeSelf:false,name:'日番谷 冬獅郎'}}]}:
   isTopDiscard?{onPlay:[{op:'searchTopOneBottomDiscard',...topDiscard}]}:
   isImpactAp?{onPlay:[{op:'grantOtherImpactThisTurn',minPrintedAp:2,amount:1,
    optional:true,plus:true,includeSelf:true}]}:
   isPurpleIchigo?{onPlay:[{op:'buffOwnField',filter:{field:'color',value:'purple'},
    also:{field:'name',value:'黒崎 一護'},bp:1500,optional:true,excludeSelf:false}]}:
   isImpactPlus?{onPlay:[{op:'grantOtherImpactThisTurn',trait:'護廷十三隊',amount:1,
    optional:true,plus:true,includeSelf:true}]}:
   isChooseBuff?{onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'buff',label:'己方角色BP+1000',turn:'any',then:[
     {op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false}]},
    {id:'down',label:'敵方前線BP-1000',turn:'any',then:[
     {op:'enemyBpDown',bp:1000,optional:true}]}
   ]}]}:
   isKyoraku?{onPlay:[{op:'nextEligibleHandPlayApDiscount',
     filter:{trait:'花天狂骨'}}]}:
    isMayuri?{onPlay:[{op:'chooseOne',optional:false,options:[
     {id:'top',label:'TOP2 / remainder OUTSIDE',turn:'any',
      then:[{op:'inspectTopAnyOutside',count:2,rest:'top'}]},
     {id:'recover',label:'Discard two hand then recover outside',turn:'any',
      then:[{op:'discardGate',count:2,optional:true,then:[
       {op:'recoverOutsideOne',optional:true,filter:{field:'printedNameAny',
        values:['涅 マユリ','涅 ネム']}}]}]},
     {id:'field',label:'Retire other character then free ACTIVE FIELD',turn:'any',
      then:[{op:'retireOwnCharacterOne',optional:true,excludeSelf:true,after:[
       {op:'deployNamedFromZones',name:'涅骸部隊',zones:['hand'],line:'energy',
        ready:true,optional:true,cardType:'field',color:'blue',ap:1,maxEnergy:30}]}]}
    ]}]}:
    isTopTwoGotei?{onPlay:[
    {op:'searchTopUpToTwoBottom',count:4,max:2,rest:'bottom',logic:'all',
     filters:[{field:'trait',value:'護廷十三隊'}]}
   ]}:
   isTopRequired?{onPlay:[
    {op:'searchTopUpToTwoBottom',count:4,max:1,rest:'bottom',logic:'all',
     filters:[{field:'type',value:'character'},{field:'trait',value:'護廷十三隊'},
      {field:'printedRequiredEnergyAtMost',value:4}]},
    {op:'nextEligibleHandPlayApDiscount',filter:{cardType:'character',printedRequiredEnergyAtMost:4}}
   ]}:
   isRetireDraw?{onRetire:[{op:'draw',count:1}]}:
   isRetireMill?{onRetire:[{op:'millTop',count:2}]}:
   isOppDiscard?{onPlay:[{op:'discardOppHand',count:1}]}:
   isDrawTwo?{onPlay:[{op:'drawDiscard',count:2,discardCount:1}]}:
   isOwnEffectDraw?{onPlay:[{op:'draw',count:1,entry:'ownEffect'}]}:
   isOppRestDraw?{onPlay:[{op:'drawIfOppRestCharacter',count:1}]}:
   isOppBpDraw?{onPlay:[{op:'drawIfOppCharacterBpAtLeast',minBp:oppBpGate,count:1}]}:
   isActiveNamed?{onPlay:[{op:'activeOwnNamed',name:namedActive,max:1,optional:true}]}:
   isNameHandDraw?{onPlay:[{op:'drawIfOwnNameAndHandFewer',name:handName,count:1}]}:
   isOwnTurnNameRest?{onRetire:[{op:'oncePerTurnGate',scope:'name',optional:false,
    ownTurnOnly:true,then:[{op:'restOppFrontOne',optional:true}]}]}:
   isNameOncePayOutside?{onPlay:[{op:'oncePerTurnGate',scope:'name',optional:true,then:[
    {op:'optionalPayApThen',ap:1,optional:true,then:[
     {op:'deployOutsideNameRest',name:outsideRestName,optional:true}]}]}]}:
   isOutsideRemove?{onPlay:[{op:'removeOutsideThen',count:outsideRemove.count,
    optional:true,cardType:outsideRemove.cardType,zone:'outside',controller:'own',
    then:[{op:'draw',count:2}]}]}:
   isRetireOr?{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'更木 剣八',
    bonusOutsideName:'草鹿 やちる',bonusBp:5000}]}:
   isTraitDiscard?{onPlay:[{op:'discardGate',optional:true,when:{
    kind:'ownCardTraitCount',turn:'any',min:6,zone:'field',excludeSelf:true,
    trait:'護廷十三隊'},then:[{op:'recoverOutsideOne',optional:true,
    filter:{field:'name',value:'日番谷 冬獅郎'}}]}]}:
   isOptionalPeek?{onPlay:[{op:'discardGate',optional:true,then:[
    {op:'peekTopOrBottom'},{op:'draw',count:1}]}]}:
   p.kind==='traitlessTopDiscard'?{onPlay:[{op:'searchTopOneBottomDiscard',count:3,
    filter:{field:'traitlessCharacter',value:true}}]}:
   p.kind==='ichigoRaidSlash'?{onPlay:[{op:'enemyBpDown',bp:1500,minBp:2000,maxTargets:2,optional:true}]}:
   p.kind==='zangetsuDraw'?{onPlay:[{op:'draw',count:2}]}:
   p.kind==='getsugaRetire'?{onPlay:[{op:'retireOppFrontUnderBp',bp:3500}]}:
   p.kind==='orihimeEntry'?{onPlay:[{op:'noteEntryTurn'},{op:'discardGate',optional:true,then:[
    {op:'outsideColorEnergyHandOrRest',color:'blue',energy:1,optional:true}]}]}:
   p.kind==='rirukaUnder'?{onPlay:[{op:'activeSelfIf',line:'energy'}]}:
   p.kind==='aizenEnergyFront'?{onPlay:[{op:'moveOtherAcrossOrRemove',optional:true,excludeName:'藍染 惣右介'}],
    onAttack:[{op:'draw',count:1}]}:
   p.kind==='raidBaseLeaveDamage'?{onPlay:[{op:'raidBaseEnergyThen',minEnergy:4,then:[
    {op:'buffSelf',bp:1000},{op:'grantSelfAttackDamageThisTurn',amount:2}]}]}:
   p.kind==='restLockFrontUpgrade'?{onPlay:[{op:'restOppFrontLockActive',optional:true,
    upgrade:{trait:'護廷十三隊',minOthers:6,also:'energy'}}]}:
   p.kind==='millRemoveScale'?{onPlay:[{op:'millTop',count:2},{op:'removeAnyOutsideScale',optional:true,cardType:'any',zone:'outside',controller:'own',per:500}]}:
   p.kind==='payDamageRemoveFour'?{onPlay:[{op:'removeOutsideThen',count:4,optional:true,cardType:'any',zone:'outside',controller:'own',then:[{op:'enemyBpDown',bp:3000,optional:true}]}]}:
   p.kind==='purpleNamesTop'?{onPlay:[{op:'inspectTopColoredNamesOutside',count:2,rest:'top',max:1,color:'purple',names:[renjiName,rukiaName]}]}:
   p.kind==='raidDrawDiscardBuff'?{onPlay:[{op:'drawDiscard',count:3,discardCount:2}]}:
   p.kind==='renjiPayDeploy'?{onPlay:[{op:'optionalPayApThen',ap:1,optional:true,when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:renjiName},then:[{op:'draw',count:1},{op:'deployOwnHandRestOrRaid',type:'character',color:'purple',maxEnergy:30,ap:1,max:1,optional:true,names:[renjiName,rukiaName],requireAffordableEnergy:true}]}]}:
   p.kind==='topSplitEnergyDraw'?{onPlay:[{op:'inspectTopAnyOutside',count:2,rest:'top',drawIfOutsideEnergyAtLeast:3}]}:
   p.kind==='emptyRaidPeek'?{onPlay:[{op:'peekTopOne'}],onRaided:[{op:'chooseOne',optional:false,options:[{id:'top',label:'查看牌庫頂1張',turn:'any',then:[{op:'peekTopOne'}]},{id:'block',label:'露琪亞不被BP4000以上阻擋',turn:'any',then:[{op:'grantOwnNameBlockAtLeast',name:rukiaName,bp:4000,optional:true}]}]}]}:
   p.kind==='renjiEventRetire'?{onPlay:[{op:'retireOppFrontUnderBp',bp:5000},{op:'drawDiscardIfEffectApPaid',color:'purple',discardCount:1}]}:
   isBounceDraw?{onPlay:[{op:'bounceOppFrontOneUnderBp',bp:4000,optional:true}]}:
   isTopSplit?{onPlay:[{op:'inspectTopArrange',count:2,split:true}]}:
   isNoRaidTop?{onPlay:[{op:'searchTopOneBottomDiscard',count:5,excludeRaid:true,
    filter:{field:'traitlessCharacter',value:true}}]}:
   isStripDual?{onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'strip',label:'Strip opponent RAID top',turn:'any',
     then:[{op:'stripOppRaidTop',optional:true}]},
    {id:'retire',label:`Retire BP ${stripRetireBp} or lower`,turn:'any',
     then:[{op:'retireOppFrontOneUnderBp',bp:stripRetireBp,optional:true}]}
   ]}]}:
   isTraitlessMove?{onPlay:[{op:'moveOtherAcrossOrRemove',optional:true,traitless:true}]}:
   isNamedBonus?{onPlay:[{op:'buffOwnField',filter:{field:'type',value:'character'},
    bp:1000,optional:true,excludeSelf:true,bonusBp:2000,
    bonusNames:['更木 剣八','草鹿 やちる','斑目 一角','綾瀬川 弓親']}]}:
   isGroupedTop?{onPlay:[{op:'searchTopOneBottomDiscard',count:3,groups:[
    {logic:'all',filters:[{field:'color',value:'green'},{field:'type',value:'event'}]},
    {logic:'all',filters:[{field:'color',value:'green'},{field:'type',value:'field'}]}
   ]}]}:
   isOwnCharacterRest?{onPlay:[{op:'restOppFrontOne',optional:true,entry:'ownCharacter'}]}:
   isOwnCharacterDraw?{onPlay:[{op:'draw',count:1,entry:'ownCharacter'}]}:
   isPeekAttack?{onPlay:[{op:'peekTopOrBottom'}],onAttack:[{op:'optionalRemoveHandThen',zone:'removed',filter:{field:'trait',value:'零番隊'},then:[{op:'buffSelf',bp:2000}]}]}:
   isDrawInstead?{onPlay:[{op:'drawDiscard',count:1,discardCount:1,instead:{op:'draw',count:1,when:{kind:'ownPrintedApAtLeast',turn:'any',zone:'front',excludeSelf:false,minAp:2}}}]}:
   isRevealOppTop?{onPlay:[{op:'revealOppTopPlace'}]}:
   isRevealWindow?{onPlay:[{op:'searchTopOneBottomDiscard',count:3,rest:'outside',filters:[
    {field:'trait',value:'邦比愛塔親衛隊'},{field:'name',value:'バンビエッタ・バスターバイン'}],logic:'any'}]}:
   isEnergyWindow?{onPlay:[{op:'chooseEnergyRevealOutside',count:2}]}:
   isMillPurple?{onPlay:[{op:'millTop',count:3,optional:true,then:[{op:'recoverOutsideOne',optional:true,logic:'all',filters:[
    {field:'color',value:'purple'},{field:'type',value:'character'}]}]}]}:
   isEnergyBounce?{onPlay:[{op:'bounceOwnOtherUnderEnergy',optional:true,energy:2,then:[
    {op:'recoverOutsideUnderEnergy',energy:2,optional:true}]}]}:
   isReplayDown?{onPlay:[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500}]}:
   isStepName?{onPlay:[{op:'drawDiscard',count:1,discardCount:1}]}:
   isEmptyStep?{onRetire:[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,ownTurnOnly:true}]}:
   isApActive?{onPlay:[{op:'discardGate',optional:true,then:[{op:'recoverAp',count:1}]}]}:
   isAliasTop?{onPlay:[{op:'inspectTopColorAnyOutside',count:2,rest:'top',color:'blue',names:['涅 マユリ','涅 ネム'],trait:'涅骸部隊'}]}:
   isEntryChoose?{onPlay:[{op:'noteEntryTurn'}]}:
   isHandOutside?{onPlay:[{op:'deployOwnHandRest',type:'character',color:'blue',energy:1,ap:1,max:1,traitless:true,when:{kind:'ownHandToOutsideThisTurn',turn:'any'}}]}:
   isEnergyAp?{onPlay:[{op:'activeSelfIf',line:'energy',when:{kind:'ownPrintedApAtLeast',turn:'any',zone:'front',excludeSelf:false,minAp:2}}]}:
   isAttackEnd?{onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'small',label:'BP+1000',turn:'any',then:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]},
    {id:'retire',label:'BP+3000後退場',turn:'any',then:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:3000,optional:true,excludeSelf:true,attackEndRetire:true}]}
   ]}]}:
   isDiscardVisored?{onPlay:[{op:'discardGate',optional:true,then:[{op:'deployOutsideTraitApRest',trait:'假面軍勢',ap:1,optional:true,requireAffordableEnergy:true}]}]}:
   isRaidOrName?{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,raidOrName:{name:'ユーハバッハ'}}]}:
   isRestOrDraw?{onPlay:[{op:'oppFrontRestBranch',optional:true,name:'エス・ノト',base:'rest',instead:'restSkipDraw'}]}:
   isRestOrRetire?{onPlay:[{op:'oppFrontRestBranch',optional:false,bp:5000,name:'日番谷 冬獅郎',base:'restSkip',instead:'retire'}]}:
   isHandApNamed?{onPlay:[{op:'enemyBpDown',bp:3000,optional:true},{op:'enemyBpDown',bp:1000,optional:true}]}:
   isBazzBurn?{onPlay:[{op:'retireOppFrontUnderBp',bp:5000,optional:false},{op:'buffOwnNameIfPrintedEnergy',name:'バズビー',minEnergy:5,bp:1000}]}:
   isKatenActive?{onPlay:[{op:'retireOppFrontUnderBp',bp:5000,optional:false},{op:'activeEnergyNamed',names:['花天','狂骨'],optional:true}]}:
   isBambiesPer?{onPlay:[{op:'retireOppFrontUnderBp',optional:false,nameOrTraitPerBp:{trait:'邦比愛塔親衛隊',name:'バンビエッタ・バスターバイン',per:1000}}]}:
   isKenpachi?{onPlay:[{op:'retireOppFrontUnderBp',bp:2000,optional:true,traitCountBonus:{trait:'護廷十三隊',min:6,excludeSelf:true,bonusBp:4000}}]}:
   isMayuriTrait?{onPlay:[{op:'retireOwnTraitFollow',optional:true,trait:'涅骸部隊',follow:{kind:'underBpDraw',draw:1}}]}:
   isNemPair?{onPlay:[{op:'retireOwnTraitFollow',optional:false,trait:'涅骸部隊',follow:{kind:'drawActivePair',draw:1,max:2,ap:1,color:'blue',name:'涅 ネム',trait:'涅骸部隊'}}]}:
   isKyokotsu?{onPlay:[{op:'recoverOutsideOne',optional:true,filter:{field:'name',value:'神剣・八鏡剣'}}]}:
   isHakkoken?{onPlay:[
    {op:'chooseOne',optional:false,options:[
     {id:'draw',label:'抽1張',turn:'any',then:[{op:'draw',count:1}]},
     {id:'nanao',label:'伊勢七緒BP+3000與Impact',turn:'any',then:[
      {op:'buffNamedImpact',name:'伊勢 七緒',bp:3000,impact:1,duration:'turn',upTo:1}]}
    ]},
    {op:'restActiveNamedReadyAp',names:['京楽 春水','伊勢 七緒'],recoverAp:1}
   ]}:
   isLilotto?{onRetire:[{op:'chooseOne',optional:false,ownTurnOnly:true,options:[
    {id:'ready',label:'另1個邦比小隊或邦比愛塔改為Active',turn:'own',then:[
     {op:'readyNameOrTrait',name:'バンビエッタ・バスターバイン',trait:'邦比小隊',optional:true,upTo:1}]},
    {id:'protect',label:'保護邦比並使對方前線BP-500',turn:'own',then:[
     {op:'protectNameOrTrait',name:'バンビエッタ・バスターバイン',trait:'邦比小隊',scope:'any',until:'nextOwnStart',optional:true,upTo:1},
     {op:'enemyFrontAllBpDown',bp:500,minBp:1000}]}
   ]}]}:
   isCastle?{onPlay:[{op:'searchTopOneBottomDiscard',count:3,noHandDiscard:true,
    filter:{field:'trait',value:'星十字騎士團'}}]}:
   isGiselle?{onPlay:[{op:'drawDiscard',count:1,discardCount:1}]}:
   isLille?{onPlay:[{op:'noteEntryTurn'}]}:
   isThunderKit?{onPlay:[{op:'grantFirstAttackKit',name:'四楓院 夜一',bp:2000}]}:
   isBazzChain?{onPlay:[{op:'sacrificeNamedChain',name:'バズビー',optional:true,per:1000,impactMinEnergy:5,when:{kind:'ownNameAbsent',turn:'any',zone:'outside',excludeSelf:false,name:'ユーハバッハ'}}]}:
   isBambiettaRest?{onPlay:[{op:'retireOppFrontRest',optional:true,ownTurnOnly:true}]}:
   isJugram?{onPlay:[{op:'discardOppHandIfFewer',count:1}]}:
   isByakuya?{onPlay:[{op:'removeOutsideThen',count:2,optional:true,cardType:'any',zone:'outside',controller:'own',then:[{op:'enemyFrontAllBpDown',bp:1000}]}],
    onAttack:[{op:'removeOutsideThen',count:1,optional:true,cardType:'any',zone:'outside',controller:'own',then:[{op:'enemyBpDown',bp:1000,optional:true}]}]}:
   isTech?{onPlay:[{op:'lookTopHandOutsideBottom',count:5}]}:
   isYamamoto?{onPlay:[{op:'moveEnergyTraitToFront',trait:'護廷十三隊'}],
    onAttack:[{op:'buffOwnTraitAllTurn',trait:'護廷十三隊',bp:2000,excludeSelf:true}]}:
   isGiselleField?{onPlay:[{op:'drawDiscardIfFieldAny',count:2,discardCount:2,min:3,excludeSelf:true,traits:['邦比愛塔親衛隊','殭屍'],names:['バンビエッタ・バスターバイン']}]}:
   isByakuyaRukia?{onPlay:[{op:'chooseOne',optional:false,options:[
    {id:'ap',label:'露琪亞登場後啟動AP',turn:'any',then:[{op:'activeApIfNameEntered',name:'朽木 ルキア'}]},
    {id:'discount',label:'下一張露琪亞AP減1',turn:'any',then:[{op:'nextEligibleHandPlayApDiscount',filter:{name:'朽木 ルキア'}}]}
   ]}],onAttack:[{op:'draw',count:1}]}:{}})
 };
}
export function bleachV2PortedCards(){
 const inherited=verifiedPilotCards('bleach');
 const added=BLEACH_V2_ADDON_PROFILES.map(checkedBleachAddonDefinition);
 const ids=[...inherited,...added].map(x=>x.id);
 if(new Set(ids).size!==ids.length)throw Error('Overlapping BLEACH V2 pilot/addon IDs');
 return [...inherited,...added];
}
export function createBleachV2Pack(){
 return createUniversalPack({id:'bleach',version:'v2-bleach-port-20261015',
  cards:bleachV2PortedCards()});
}
