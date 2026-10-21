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
].map(x=>Object.freeze(x)));
export const BLEACH_V2_NEW_IDS=Object.freeze(BLEACH_V2_ADDON_PROFILES.map(p=>p.id));

export function checkedBleachAddonDefinition(p){
 const c=CARDS.find(x=>x.identity===p.id);
 if(!c || c.identity!==p.id || ![c.number,...(c.aliases||[])].includes(p.number) ||
    !c.source?.includes('unionarena-tcg.com/jp/cardlist/') ||
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
  retireBonusYamamoto:{onPlay:[{template:'retireEnemyUnderBp',bp:3000,bonusName:'山本元柳斎重國',bonusBp:5000}]},
  retireBonusRukia:{onPlay:[{template:'retireEnemyUnderBp',bp:3000,bonusName:'朽木ルキア',bonusBp:5000}]},
  enemyBpDown1000:{onPlay:[{template:'enemyBpDown',bp:1000,optional:true}]},
  enemyBpDown500Color:{onPlay:[{template:'enemyBpDown',bp:500,optional:true}]},
  inspectTop2:{onPlay:[{template:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]},
  inspectTop3:{onPlay:[{template:'inspectTopArrange',count:3,toOutside:true,rest:'top'}]},
  peekTopOrBottom:{onPlay:[{template:'peekTopOrBottom'}]},
  inspectTopAnyOutside2:{onPlay:[{template:'inspectTopAnyOutside',count:2,rest:'top'}]}
 };
// EX15BT/BLC-4-014 prints yellow+ and ACTIVE adds one yellow. The imported legacy gen=2
 // encoded the ACTIVE total; V2 needs the printed REST base (1) plus an ACTIVE +1.
 // Keep p.gen=2 only as a legacy-source fingerprint, never as V2 base energy.
 const v2BaseGen=p.id==='BLC-4-014'?1:c.gen;
 const isPassive=p.kind==='activeEnergy'||p.kind==='impactNull';
 const isMain=p.kind==='restSelfEnemy';
 const special=p.kind==='plain'||p.kind==='plainAlt'||p.kind==='step'||isPassive||isMain;
 if(!special&&!Object.hasOwn(abilities,p.kind))
  throw Error('Unsupported BLEACH addon profile '+p.id+'/'+p.kind);
 return {
  id:p.id,name:c.nameJa,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:v2BaseGen,trigger:c.trigger??null,
  traits:Array.isArray(c.traits)?c.traits:(c.traits&&c.traits!=='無'?[c.traits]:[]),
  implementation:p.kind==='plain'||p.kind==='plainAlt'||p.kind==='step'?'vanilla':'dsl',
  ...(p.kind==='step'?{step:true}:{}),
  ...(p.kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(p.kind==='impactNull'?{impactNull:true}:{}),
  ...(isMain?{mainAbility:{op:'restSelfThenRestOppFrontOne',frontOnly:true}}:{}),
  ...(p.kind.startsWith('retireBonus')?{triggerEffect:{op:'retireOppFront'}}:{}),
  ...(p.kind==='enemyBpDown500Color'?{triggerEffect:{op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}}:{}),
  ...(p.kind==='drawPlayColorHand'?{triggerEffect:{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1}}:{}),
  ...(!special?{templateEffects:abilities[p.kind]}:{effects:{}})
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
