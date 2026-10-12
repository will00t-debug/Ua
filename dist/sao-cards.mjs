import {SAO_OFFICIAL_CARDS} from './sao-official-import.mjs';
// Sword Art Online: official-source-verified initial catalog. Non-playable until rule implementation.
export const SAO_CARDS=[
 {id:'SAO-1-004',identity:'SAO-1-004',number:'UA15BT/SAO-1-004',name:'尤吉歐',nameJa:'ユージオ',title:'sword-art-online',set:'UA15BT',color:'yellow',energy:0,ap:1,bp:500,gen:1,type:'character',rarity:'C',trigger:'active',effect:'【登場時】可選擇自己場上其他角色 1 張，本回合 BP +1000。',auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=UA15BT%2FSAO-1-004'},
 {id:'SAO-1-005',identity:'SAO-1-005',number:'UA15BT/SAO-1-005',name:'尤吉歐',nameJa:'ユージオ',title:'sword-art-online',set:'UA15BT',color:'yellow',energy:2,ap:1,bp:3000,gen:1,type:'character',rarity:'U',trigger:null,effect:'【登場時】查看牌庫頂 4 張，可公開其中的桐人或愛麗絲最多 1 張加入手牌，其餘任意排序置於牌庫底；若加入手牌，將 1 張手牌送場外。',auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=UA15BT%2FSAO-1-005'},
 {id:'SAO-1-018',identity:'SAO-1-018',number:'UA15BT/SAO-1-018',name:'尤吉歐・整合騎士三十二',nameJa:'ユージオ・シンセシス・サーティツー',title:'sword-art-online',set:'UA15BT',color:'yellow',energy:4,ap:1,bp:4000,gen:1,type:'character',rarity:'SR',trigger:'raid',raid:'尤吉歐',effect:'也視為「尤吉歐」。Raid〈尤吉歐〉；IMPACT 1、IMPACT 無效。【退場時】可分別選擇前線桐人和愛麗絲最多各 1 張，本回合 BP +1000 且獲得 IMPACT 無效。',auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=UA15BT%2FSAO-1-018'},
 {id:'SAO-1-055',identity:'SAO-1-055',number:'UA15BT/SAO-1-055',name:'結衣',nameJa:'ユイ',title:'sword-art-online',set:'UA15BT',color:'blue',energy:0,ap:1,bp:1500,gen:1,type:'character',rarity:'C',trigger:'draw',effect:'【登場時】抽 1 張牌，再將 1 張手牌送到場外。',auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail.php?card_no=UA15BT%2FSAO-1-055'}
];

export const SAO_PRODUCTS=[
 {id:'UA15ST',name:'刀劍神域 起始牌組',regularCount:18,source:'https://www.unionarena-tcg.com/jp/products/decks/sao-1.php'},
 {id:'UA15BT',name:'刀劍神域 第一彈',regularCount:100,source:'https://www.unionarena-tcg.com/jp/products/boosters/sao-1.php'},
 {id:'EX08BT',name:'刀劍神域 Vol.2',regularCount:74,source:'https://www.unionarena-tcg.com/jp/products/boosters/ex_sao.php'}
];
// Scope: standard gameplay card numbers only; AP cards and alternate-art variants are excluded.
// Product counts can overlap due to shared print numbers and reprints. Never
// turn expected numbers into fake card records or count parallel art twice.
const EXTRA_VERIFIED=[
 {id:'SAO-1-001',number:'UA15BT/SAO-1-001',name:'桐人',nameJa:'キリト',set:'UA15BT',color:'yellow',energy:0,ap:1,bp:2000,gen:1,type:'character',rarity:'C',trigger:null,effect:'STEP（移動階段可從前線移至能源線）。'},
 {id:'SAO-2-005',number:'EX08BT/SAO-2-005',name:'謝塔・整合騎士十二',nameJa:'シェータ・シンセシス・トゥエルブ',set:'EX08BT',color:'yellow',energy:2,ap:1,bp:3000,gen:1,type:'character',rarity:'C',trigger:null,effect:'若己方場上有其他 4 張以上［整合騎士］，獲得 IMPACT 1。'},
 {id:'SAO-2-034',number:'EX08BT/SAO-2-034',name:'艾吉',nameJa:'エイジ',set:'EX08BT',color:'purple',energy:2,ap:1,bp:3000,gen:1,type:'character',rarity:'U',trigger:'active',effect:'【攻擊時】可將牌庫頂最多 1 張送到場外。'},
 {id:'SAO-2-038',number:'EX08BT/SAO-2-038',name:'西莉卡',nameJa:'シリカ',set:'EX08BT',color:'purple',energy:3,ap:1,bp:3000,gen:2,type:'character',rarity:'C',trigger:null,effect:'【登場時】若本回合已使用［歌］卡，抽 1 張。'},
 {id:'SAO-2-047',number:'EX08BT/SAO-2-047',name:'桐人',nameJa:'キリト',set:'EX08BT',color:'purple',energy:0,ap:1,bp:2000,gen:1,type:'character',rarity:'C',trigger:'active',effect:'無卡片效果。'},
 {id:'SAO-2-052',number:'EX08BT/SAO-2-052',name:'米特',nameJa:'ミト',set:'EX08BT',color:'purple',energy:1,ap:1,bp:1500,gen:1,type:'character',rarity:'U',trigger:null,effect:'【起動主要】在前線每回合 1 次，指定敵方 BP 1500 以上的前線角色，本回合 BP -1000。'}
].map(c=>({...c,identity:c.id,title:'sword-art-online',auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(c.number)}));
SAO_CARDS.push(...EXTRA_VERIFIED);
// Distinct playable limited-product effect, not an AP or cosmetic parallel.
const LIMITED_VERIFIED=[
 {id:'SAO-1-101',identity:'SAO-1-101',number:'UAPR/SAO-1-101',name:'亞絲娜',nameJa:'アスナ',title:'sword-art-online',set:'UAPR',color:'blue',energy:4,ap:1,bp:4000,gen:1,type:'character',rarity:'SR',traits:['艾恩葛朗特'],trigger:'active',effect:'【每回合 1 次】此角色於自己的移動階段以外移動時，此角色在本回合中 BP+1000 且獲得 IMPACT 1。',auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FSAO-1-101',origin:'ソードアート・オンライン フラクチュアード デイドリーム プレミアム特装版'}
];
SAO_CARDS.push(...LIMITED_VERIFIED);


// Official Japanese printed data is authoritative. Keep previously reviewed
// Traditional Chinese labels as translations only; never override JP statistics.
const chineseLabels={
 'キリト':'桐人','アスナ':'亞絲娜','ユージオ':'尤吉歐','アリス':'愛麗絲',
 'シノン':'詩乃','リーファ':'莉法','ユウキ':'有紀','ユイ':'結衣',
 'ミト':'米特','エイジ':'艾吉','シリカ':'西莉卡','リズベット':'莉茲貝特',
 'クライン':'克萊因','エギル':'艾基爾','サチ':'幸',
 'アドミニストレータ':'最高祭司',
 'ベルクーリ・シンセシス・ワン':'貝爾庫利・整合騎士一'
};
const localTranslations=new Map(SAO_CARDS.map(c=>[c.id,c]));
const canonical=new Map();
for(const source of SAO_OFFICIAL_CARDS){
 const record=canonical.get(source.id);
 if(record){
  const comparable=['color','energy','ap','bp','gen','type','effectJa','trigger'];
  if(comparable.some(k=>record[k]!==source[k]))throw new Error('SAO reprint differs from original: '+source.id+' '+source.number);
  record.printings.push({number:source.number,set:source.set,source:source.source,image:source.image});
  if(!record.sets.includes(source.set))record.sets.push(source.set);
  continue;
 }
 const local=localTranslations.get(source.id),known=local?.name&&local.name!==local.nameJa?local.name:chineseLabels[source.nameJa];
 const translation=known||source.nameJa;
 canonical.set(source.id,{
  ...source,name:translation,
  raid:source.effectJa.match(/【レイド】〈([^〉]+)〉/)?.[1]||null,
  effect:local?.effect&&local.effect!==local.nameJa?local.effect:source.effectJa,
  translationStatus:known?'translated':'pending',
  sets:[source.set],printings:[{number:source.number,set:source.set,source:source.source,image:source.image}],
  auto:false, // Auto effects must be proven by engine & per-card regression tests.
 });
}
SAO_CARDS.splice(0,SAO_CARDS.length,...[...canonical.values()].sort((a,b)=>a.id.localeCompare(b.id)));

/* Tested declarative abilities. Entries not in this map stay pending.
   These profiles are run through the common engine in tests; final SAO
   match enablement is blocked until the remaining catalog is covered. */
export const SAO_IMPLEMENTED_RULES={
 'SAO-1-001':{step:true},
 'SAO-1-004':{entry:[{op:'buff',target:'own',other:true,amount:1000,optional:true}]},
 'SAO-1-055':{entry:[{op:'drawDiscard',draw:1,discard:1}]},
 'SAO-2-034':{attack:[{op:'mill',count:1,optional:true}]}
};
for(const c of SAO_CARDS)if(SAO_IMPLEMENTED_RULES[c.id]){
 c.rules=SAO_IMPLEMENTED_RULES[c.id];
 c.engineImplemented=true;
}

const stepText='【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）';
for(const c of SAO_CARDS){
 if(c.engineImplemented)continue;
 const text=c.effectJa.trim();
 let rules=null;
 if(text==='-'&&c.type==='character')rules={};
 else if(text===stepText)rules={step:true};
 else if(text==='このカードは〈アリス〉としても扱う。\n'+stepText)rules={alsoName:'アリス',step:true};
 else{
  const draw=text.match(/^【登場時】カードを(\d+)枚引く。$/);
  const drawDiscard=text.match(/^【登場時】カードを(\d+)枚引き、自分の手札を(\d+)枚場外に置く。$/);
  if(draw)rules={entry:[{op:'draw',count:Number(draw[1])}]};
  if(drawDiscard)rules={entry:[{op:'drawDiscard',draw:Number(drawDiscard[1]),discard:Number(drawDiscard[2])}]};
 }
 if(rules){
  c.rules=rules;
  c.engineImplemented=true;
 }
}
export const SAO_RULE_COVERAGE={basicEngineImplemented:SAO_CARDS.filter(c=>c.engineImplemented).length,pending:SAO_CARDS.filter(c=>!c.engineImplemented).length};


export const SAO_COVERAGE={printings:SAO_OFFICIAL_CARDS.length,uniqueCards:SAO_CARDS.length,products:Object.fromEntries(SAO_PRODUCTS.map(p=>[p.id,SAO_OFFICIAL_CARDS.filter(c=>c.set===p.id).length]))};
export const SAO_BY_ID=Object.fromEntries(SAO_CARDS.map(c=>[c.id,c]));
export function saoDeckIssues(counts){const entries=Object.entries(counts||{}).filter(([,n])=>n>0);const errors=[];let total=0;for(const [id,n] of entries){if(!SAO_BY_ID[id]||!Number.isInteger(n)||n<0||n>4)errors.push('卡號錯誤或超過 4 張：'+id);total+=n;}if(total!==50)errors.push('需要 50 張，目前 '+total+' 張。');errors.push('SAO 規則與完整卡表尚未完成，目前只能建立草稿，不能對戰。');return errors;}
