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
 }
].map(x=>Object.freeze(x)));
export const BLEACH_V2_NEW_IDS=Object.freeze(BLEACH_V2_ADDON_PROFILES.map(p=>p.id));

function checkedAddon(p){
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
 if(p.kind==='step' && !/^Step：/.test(c.effect))
  throw Error('Not a STEP-only BLEACH card: '+p.id);
 if(p.kind==='bounce' && !/(登場|登場時)/.test(c.effect))
  throw Error('Not a printed onPlay bounce: '+p.id);
 return {
  id:p.id,name:c.nameJa,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:c.gen,trigger:c.trigger??null,
  traits:Array.isArray(c.traits)?c.traits:(c.traits&&c.traits!=='無'?[c.traits]:[]),
  implementation:p.kind==='bounce'?'dsl':'vanilla',
  ...(p.kind==='step'?{step:true}:{}),
  ...(p.kind==='bounce'?{
   templateEffects:{onPlay:[{template:'bounceOwnOtherUnderEnergy',energy:1}]}
  }:{effects:{}})
 };
}
export function bleachV2PortedCards(){
 const inherited=verifiedPilotCards('bleach');
 const added=BLEACH_V2_ADDON_PROFILES.map(checkedAddon);
 const ids=[...inherited,...added].map(x=>x.id);
 if(new Set(ids).size!==ids.length)throw Error('Overlapping BLEACH V2 pilot/addon IDs');
 return [...inherited,...added];
}
export function createBleachV2Pack(){
 return createUniversalPack({id:'bleach',version:'v2-bleach-port-20261015',
  cards:bleachV2PortedCards()});
}
