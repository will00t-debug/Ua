import {EXPANSION_CARDS} from './expansion-cards.mjs?v=6';
import {CARD_RULES} from './card-rules.mjs?v=6';
import {EXTRA_RULES} from './extra-rules.mjs?v=9.1.0';
import {V9_RULES} from './v9-rules.mjs?v=9.1.0';
import {ADVANCED_CARDS} from './advanced-cards.mjs?v=9.1.0';

const STARTER = [
  {id:'034',name:'石田雨龍',key:'uryu',energy:0,ap:1,bp:1500,gen:1,type:'character',tag:'濾牌',effect:'登場：抽 1 張，再棄 1 張。',trigger:'draw'},
  {id:'035',name:'井上織姬',key:'orihime',energy:1,ap:1,bp:1500,gen:2,type:'character',tag:'雙能源',effect:'登場：將另一個需求 1 以下的己方角色返回手牌；沒有可返回角色時，返回自己。',trigger:null},
  {id:'037',name:'浦原喜助',key:'urahara',energy:2,ap:1,bp:2500,gen:1,type:'character',tag:'能源',effect:'處於 ACTIVE 狀態時，額外產生 1 紫能源。',trigger:null},
  {id:'039',name:'黑崎一護',key:'ichigo',energy:0,ap:1,bp:1500,gen:1,type:'character',tag:'Raid 基底',effect:'基礎角色，可作為一護的 Raid 基底。',trigger:'get'},
  {id:'042',name:'茶渡泰虎',key:'chad',energy:0,ap:1,bp:1000,gen:1,type:'character',tag:'能源加速',effect:'主要階段・每回合 1 次：REST 自己，本回合多產生 1 紫能源；主要階段結束時退場。',trigger:null},
  {id:'046',name:'阿散井戀次',key:'renji',energy:3,ap:1,bp:3500,gen:1,type:'character',tag:'場外循環',effect:'前線・每回合 1 次：牌堆頂 1 張送場外，成功時可讓另一己方角色本回合 BP +500。',trigger:null},
  {id:'062',name:'美味的麵包',key:'bread',energy:2,ap:1,bp:0,gen:0,type:'event',tag:'AP 回復',effect:'一個己方角色本回合 BP +1000，可回復 1 AP。',trigger:'active'},
  {id:'064',name:'月牙天衝',key:'getsuga',energy:4,ap:1,bp:0,gen:0,type:'event',tag:'角色移除',effect:'退場一個敵方前線 BP 3000 以下角色；己方有一護時，上限改為 5000。',trigger:'special'},
  {id:'066',name:'卍解',key:'bankai',energy:3,ap:1,bp:0,gen:0,type:'event',tag:'AP 回復',effect:'可回復最多 2 AP。',trigger:'final'},
  {id:'101',name:'井上織姬',nameJa:'井上 織姫',key:'orihime',energy:2,ap:1,bp:3000,gen:1,type:'character',tag:'兩次阻擋',effect:'本回合第一次阻擋時，立即轉為 ACTIVE。',trigger:'active',doubleBlock:true},
  {id:'102',name:'浦原喜助',key:'urahara',energy:3,ap:1,bp:3000,gen:2,type:'character',tag:'雙能源',effect:'產生 2 紫能源。',trigger:'active'},
  {id:'103',name:'黑崎一護',key:'ichigo',energy:3,ap:1,bp:3000,gen:2,type:'character',tag:'攻擊強化',effect:'攻擊時，本回合 BP +1000。',trigger:null},
  {id:'104',name:'黑崎一護',key:'ichigo',energy:4,ap:1,bp:4000,gen:1,type:'character',tag:'Raid・Impact',effect:'Raid 一護：轉為 ACTIVE，可移到前線。每回合 1 次：場外 4 張除外，成功時抽 1 張並獲得 Impact 1。',trigger:'raid',raid:'ichigo'},
  {id:'105',name:'阿散井戀次',key:'renji',energy:5,ap:2,bp:4000,gen:1,type:'character',tag:'BP 壓制',effect:'登場：可讓一個敵方前線角色本回合 BP −3000。',trigger:'active'},
  {id:'106',name:'朽木露琪亞',nameJa:'朽木 ルキア',traits:'護廷十三隊',key:'rukia',energy:4,ap:2,bp:4000,gen:1,type:'character',tag:'補充手牌',effect:'登場：可將場外 3 張除外；成功時抽 2 張。',trigger:'get'},
  {id:'107',name:'斑目志乃＆行木龍之介',key:'shino',energy:0,ap:1,bp:2000,gen:1,type:'character',tag:'基礎角色',effect:'0 能源的基礎角色。',trigger:null},
  {id:'108',name:'一護的房間',key:'room',energy:2,ap:1,bp:0,gen:1,type:'field',tag:'場域・濾牌',effect:'主要階段：REST 並退場自己，抽 2 張，再棄 1 張。',trigger:'get'},
  {id:'109',name:'空座町的代理死神',nameJa:'空座町の死神代行',key:'substitute',energy:1,ap:1,bp:0,gen:0,type:'event',tag:'濾牌',effect:'抽 2 張，再棄 1 張。',trigger:'draw'},
].map(c=>({...c,color:'purple',identity:`BLC-1-${c.id}`,sets:['st'],aliases:[`UA08ST/BLC-1-${c.id}`],auto:true,number:`UA08ST/BLC-1-${c.id}`,image:`assets/cards/${c.id}.png`,source:`https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=UA08ST/BLC-1-${c.id}`}));
export const SETS=[{id:'b1',name:'第一彈 · UA08BT'},{id:'b2',name:'第二彈 · EX07BT'},{id:'nc',name:'卡冊 · UA04NC'},{id:'book',name:'書卡／雜誌附錄'},{id:'b3',name:'第三彈 · EX15BT'},{id:'st',name:'起始牌組 · UA08ST'},{id:'dc',name:'高級預組 · UA01DC'}];
export const COLOR_NAMES={yellow:'黃色',purple:'紫色',green:'綠色',blue:'藍色',red:'紅色',white:'無色'};
const pool=new Map(STARTER.map(c=>[c.identity,c]));
for(const c of [...EXPANSION_CARDS,...ADVANCED_CARDS]){
 const old=pool.get(c.identity),rules=CARD_RULES[c.identity]||EXTRA_RULES[c.identity]||V9_RULES[c.identity];
 if(old)pool.set(c.identity,{...c,...old,sets:[...new Set([...old.sets,...c.sets])],aliases:[...new Set([...old.aliases,...c.aliases])],variants:[...(old.variants||[]),...(c.variants||[])],nameJa:c.nameJa,rarity:c.rarity});
 else pool.set(c.identity,{...c,id:c.identity,auto:!!rules&&!c.unverifiedFields?.length,rules:rules||null,raid:rules?.raid||null,doubleBlock:!!rules?.doubleBlock});
}
export const CARDS=[...pool.values()].sort((a,b)=>a.identity.localeCompare(b.identity));
export const BY_ID=Object.fromEntries(CARDS.map(c=>[c.id,c]));
const ALIASES=Object.fromEntries(CARDS.flatMap(c=>[c.id,c.identity,...c.aliases].map(k=>[k.toUpperCase().replace('_','/'),c.id])));
export function resolveCardId(value){return ALIASES[String(value).trim().toUpperCase().replace('_','/')]||null;}
export const pendingCards=counts=>CARDS.filter(c=>counts[c.id]>0&&!c.auto);
export const deckColors=counts=>[...new Set(CARDS.filter(c=>counts[c.id]>0).map(c=>c.color))];
export const TRIGGER_NAMES={draw:'DRAW',get:'GET',active:'ACTIVE',special:'SPECIAL',final:'FINAL',raid:'RAID',color:'COLOR'};
export const TYPE_NAMES={character:'角色',event:'事件',field:'場域'};
export const PRESETS=[
 {name:'一護・場外循環',description:'以一護 Raid 和場外累積連接攻勢。',counts:{'034':4,'035':4,'037':4,'039':4,'042':4,'046':3,'062':2,'064':2,'066':2,'101':3,'102':3,'103':3,'104':4,'105':2,'106':2,'107':2,'108':1,'109':1}},
 {name:'戀次・前線壓制',description:'強化前線，以戀次削減敵方 BP。',counts:{'034':4,'035':4,'037':4,'039':4,'042':2,'046':3,'062':2,'064':2,'066':2,'101':3,'102':3,'103':3,'104':2,'105':4,'106':2,'107':4,'108':1,'109':1}},
];
export function expandDeck(counts){return Object.entries(counts).flatMap(([id,n])=>Array.from({length:n},()=>id));}
export function validateDeck(counts){
 const errors=[]; let total=0;
 for(const [id,n] of Object.entries(counts)){
  if(!BY_ID[id]||!Number.isInteger(n)||n<0||n>4) errors.push('每張支援的卡片可放入 0–4 張。');
  total+=n;
 }
 if(total!==50) errors.push(`牌組必須正好 50 張，目前 ${total} 張。`);
 for(const tr of ['special','final','color'])if(CARDS.filter(c=>c.trigger===tr).reduce((n,c)=>n+(counts[c.id]||0),0)>4)errors.push(`${tr.toUpperCase()} Trigger 合計最多 4 張。`);
 return [...new Set(errors)];
}
