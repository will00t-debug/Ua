// Official UA10ST cards. Fetched 2026-11-13 from the Bandai card list.
// https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570010
// Color icons are stored as the alt text on that page. battleReady stays
// false in the catalog. A program, not this file, decides the battle pack.
// The 50-card copy list is not on the product page and is not invented here.
const PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=';
const IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';

function deck(row){
 const number='UA10ST/'+row.id;
 const file=number.replace('/','_');
 return {
  id:row.id,
  identity:row.id,
  number,
  name:row.name,
  nameJa:row.nameJa,
  ruby:row.ruby,
  title:'mha',
  set:'UA10ST',
  sets:['UA10ST'],
  printings:[{
   number,set:'UA10ST',rarity:row.rarity,
   source:PAGE+encodeURIComponent(number),
   image:IMAGE+file+'.png'
  }],
  color:'green',
  energy:row.energy,
  ap:row.ap,
  bp:row.bp,
  bpMark:row.bpMark||'',
  gen:row.gen,
  genMark:'',
  type:row.type,
  traits:[],
  rarity:row.rarity,
  trigger:row.trigger,
  triggerText:row.triggerText||'',
  triggerTextJa:row.triggerTextJa||'',
  effect:row.effect,
  effectJa:row.effectJa,
  image:IMAGE+file+'.png',
  source:PAGE+encodeURIComponent(number),
  sourceTc:null,
  auto:false,
  battleReady:false,
  deckLegal:true,
  faq:[]
 };
}

export const UA10ST_PRODUCT={
 set:'UA10ST',
 title:'僕のヒーローアカデミア',
 product:'https://www.unionarena-tcg.com/jp/products/decks/mha-1.php',
 cardList:'https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570010',
 fetched:'2026-11-13',
 deckCards:50,
 apCardsInProduct:3,
 recipe:null,
 recipeStatus:'待查：商品頁只寫構築牌組 50 張與行動值卡 3 張。官方卡表沒有各卡張數，這裡不補。'
};

export const UA10ST_CARDS=[
 deck({
  id:'MHA-1-034',name:'相澤消太',nameJa:'相澤 消太',ruby:'あいざわ しょうた',
  rarity:'U',energy:2,ap:1,bp:2500,gen:1,type:'character',trigger:null,
  effect:'這張角色卡為活動狀態時，這張角色卡的發生能量+綠。',
  effectJa:'このキャラがアクティブの場合、このキャラの発生エナジー+緑。'
 }),
 deck({
  id:'MHA-1-036',name:'蛙吹梅雨',nameJa:'蛙吹 梅雨',ruby:'あすい つゆ',
  rarity:'C',energy:0,ap:1,bp:2000,gen:1,type:'character',trigger:null,
  effect:'【移步】（在自己的移動階段，可以從前線移動到能量線。）',
  effectJa:'【ステップ】（自分の移動フェイズにフロントLからエナジーLへ移動できる）'
 }),
 deck({
  id:'MHA-1-041',name:'麗日御茶子',nameJa:'麗日 お茶子',ruby:'うららか おちゃこ',
  rarity:'U',energy:1,ap:1,bp:1500,gen:2,type:'character',trigger:null,
  effect:'【登場時】將自己場上另 1 張必要能量為 1 以下的角色卡返回手牌。無法返回時，將這張角色卡返回手牌。',
  effectJa:'【登場時】必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。'
 }),
 deck({
  id:'MHA-1-044',name:'歐爾麥特',nameJa:'オールマイト',ruby:'おーるまいと',
  rarity:'C',energy:0,ap:1,bp:1000,gen:1,type:'character',trigger:null,
  effect:'【啟動主要】【轉為休息】【每回合 1 次】在這個回合中，這張角色卡的發生能量+綠。主要階段結束時，將這張角色卡退場。',
  effectJa:'【起動メイン】【レストにする】【ターン1】このターン中、このキャラの発生エナジー+緑。メインフェイズ終了時、このキャラを退場させる。'
 }),
 deck({
  id:'MHA-1-052',name:'轟焦凍',nameJa:'轟 焦凍',ruby:'とどろき しょうと',
  rarity:'U',energy:3,ap:1,bp:3500,gen:1,type:'character',trigger:null,
  effect:'【攻擊時】選擇最多 1 張 BP 1000 以上的對手場上角色卡，在這個回合中，BP-500。',
  effectJa:'【アタック時】BP1000以上の相手の場のキャラを1枚まで選び、このターン中、BP-500。'
 }),
 deck({
  id:'MHA-1-057',name:'綠谷出久',nameJa:'緑谷 出久',ruby:'みどりや いずく',
  rarity:'C',energy:0,ap:1,bp:1500,gen:1,type:'character',trigger:'get',
  triggerText:'【取得】將這張卡片加入手牌。',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effect:'-',effectJa:'-'
 }),
 deck({
  id:'MHA-1-061',name:'八百萬百',nameJa:'八百万 百',ruby:'やおよろず もも',
  rarity:'C',energy:2,ap:1,bp:2000,gen:1,type:'character',trigger:null,
  effect:'【登場時】抽 1 張牌。',
  effectJa:'【登場時】カードを1枚引く。'
 }),
 deck({
  id:'MHA-1-063',name:'底特律粉碎',nameJa:'デトロイト スマッシュ',ruby:'でとろいと スマっしゅ',
  rarity:'R',energy:4,ap:1,bp:0,gen:0,type:'event',trigger:'special',
  triggerText:'【特殊】選擇 1 張對手前線的角色卡，使其退場。',
  triggerTextJa:'【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。',
  effect:'選擇 1 張自己場上的角色卡，在這個回合中，賦予 BP+2500 與「這張角色卡攻擊並在戰鬥中勝利時，抽 1 張牌。」。若選擇的角色卡是〈歐爾麥特〉或〈綠谷出久〉，則在這個回合中，再賦予【狙擊】。',
  effectJa:'自分の場のキャラを1枚選び、このターン中、BP+2500と「このキャラがアタックしてバトルに勝利した時、カードを1枚引く。」を与える。選んだキャラが〈オールマイト〉か〈緑谷 出久〉の場合、さらにこのターン中、【狙い撃ち】を与える。'
 }),
 deck({
  id:'MHA-1-065',name:'Plus Ultra',nameJa:'Plus Ultra',ruby:'ぷらす うるとら',
  rarity:'U',energy:3,ap:1,bp:0,gen:0,type:'event',trigger:'final',
  triggerText:'【最終】自己沒有生命時，將自己牌庫頂的 1 張牌放到自己的生命區。',
  triggerTextJa:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。',
  effect:'選擇最多 2 張自己的行動值卡，使其活動。',
  effectJa:'自分のAPカードを2枚まで選び、アクティブにする。'
 }),
 deck({
  id:'MHA-1-101',name:'飯田天哉',nameJa:'飯田 天哉',ruby:'いいだ てんや',
  rarity:'C',energy:3,ap:1,bp:3000,gen:2,type:'character',trigger:'active',
  triggerText:'【活動】選擇 1 張自己場上的角色卡，使其活動，並在這個回合中 BP+3000。',
  triggerTextJa:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  effect:'-',effectJa:'-'
 }),
 deck({
  id:'MHA-1-102',name:'歐爾麥特',nameJa:'オールマイト',ruby:'おーるまいと',
  rarity:'R',energy:4,ap:2,bp:4000,bpMark:'+',gen:1,type:'character',trigger:'get',
  triggerText:'【取得】將這張卡片加入手牌。',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effect:'【傷害（2）】（這張角色卡以攻擊直接造成傷害時，改為造成 2 點傷害）\n【自己的回合中】這張角色卡 BP+1000。\n【登場時】【位於前線時】直到自己的下一個回合開始時為止，這張角色卡 BP+1000。',
  effectJa:'【ダメージ（2）】（このキャラがアタックで直接ダメージを与える時、代わりに2ダメージ）\n【自分のターン中】このキャラはBP+1000。\n【登場時】【フロントLにある場合】このキャラは次の自分のターン開始時まで、BP+1000。'
 }),
 deck({
  id:'MHA-1-103',name:'切島銳兒郎',nameJa:'切島 鋭児郎',ruby:'きりしま えいじろう',
  rarity:'C',energy:0,ap:1,bp:2000,gen:1,type:'character',trigger:null,
  effect:'-',effectJa:'-'
 }),
 deck({
  id:'MHA-1-104',name:'耳郎響香',nameJa:'耳郎 響香',ruby:'じろう きょうか',
  rarity:'C',energy:1,ap:1,bp:2500,gen:1,type:'character',trigger:null,
  effect:'【登場時】查看自己牌庫頂的 3 張牌。將那些卡片以任意順序放回自己牌庫頂。',
  effectJa:'【登場時】自分の山札の上から3枚見る。それらを望む順で自分の山札の上に置く。'
 }),
 deck({
  id:'MHA-1-105',name:'爆豪勝己',nameJa:'爆豪 勝己',ruby:'ばくごう かつき',
  rarity:'SR',energy:4,ap:2,bp:4000,gen:1,type:'character',trigger:'get',
  triggerText:'【取得】將這張卡片加入手牌。',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effect:'【攻擊時】選擇最多 1 張 BP 2500 以下的對手前線角色卡，使其退場。',
  effectJa:'【アタック時】BP2500以下の相手のフロントLのキャラを1枚まで選び、退場させる。'
 }),
 deck({
  id:'MHA-1-106',name:'綠谷出久',nameJa:'緑谷 出久',ruby:'みどりや いずく',
  rarity:'U',energy:3,ap:1,bp:3000,bpMark:'+',gen:2,type:'character',trigger:null,
  effect:'對手前線有 3 張以上角色卡時，這張角色卡 BP+1000。',
  effectJa:'相手のフロントLにキャラが3枚以上ある場合、このキャラはBP+1000。'
 }),
 deck({
  id:'MHA-1-107',name:'綠谷出久',nameJa:'緑谷 出久',ruby:'みどりや いずく',
  rarity:'SR',energy:4,ap:1,bp:4000,gen:1,type:'character',trigger:'raid',
  triggerText:'【突襲】將這張卡片加入手牌，或在滿足必要能量時使其突襲。',
  triggerTextJa:'【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。',
  effect:'【突襲】可以使〈綠谷出久〉活動，並移動到前線\n【衝擊（1）】（攻擊並在戰鬥中勝利時，對對手玩家造成 1 點傷害）\n【登場時】對手前線有 3 張以上角色卡時，抽 1 張牌。',
  effectJa:'【レイド】〈緑谷 出久〉アクティブにし、フロントLに移動できる\n【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）\n【登場時】相手のフロントLにキャラが3枚以上ある場合、カードを1枚引く。'
 }),
 deck({
  id:'MHA-1-108',name:'雄英高校',nameJa:'雄英高校',ruby:'ゆうえいこうこう',
  rarity:'U',energy:2,ap:1,bp:0,gen:1,type:'field',trigger:'get',
  triggerText:'【取得】將這張卡片加入手牌。',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effect:'自己前線有 2 張以上角色卡時，這張場域卡的發生能量+綠。',
  effectJa:'自分のフロントLにキャラが2枚以上ある場合、このフィールドの発生エナジー+緑。'
 }),
 deck({
  id:'MHA-1-109',name:'1年A班',nameJa:'1年A組',ruby:'いちねんえーぐみ',
  rarity:'R',energy:2,ap:1,bp:0,gen:0,type:'event',trigger:'draw',
  triggerText:'【抽牌】抽 1 張牌。',
  triggerTextJa:'【ドロー】カードを1枚引く。',
  effect:'查看自己牌庫頂的 5 張牌。從中公開最多 1 張角色卡並加入手牌。其餘以任意順序放到自己牌庫底。若公開的卡片是〈綠谷出久〉，抽 1 張牌。',
  effectJa:'自分の山札の上から5枚見る。その中からキャラカードを1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。公開したカードが〈緑谷 出久〉の場合、カードを1枚引く。'
 })
];

function ap(id){
 const number='UA10ST/'+id;
 const file=number.replace('/','_');
 return {
  id,identity:id,number,
  name:'行動值卡（我的英雄學院）',
  nameJa:'アクションポイントカード(僕のヒーローアカデミア)',
  ruby:'',
  title:'mha',set:'UA10ST',sets:['UA10ST'],
  printings:[{
   number,set:'UA10ST',rarity:'AP',
   source:PAGE+encodeURIComponent(number),
   image:IMAGE+file+'.png'
  }],
  color:null,energy:0,ap:0,bp:0,bpMark:'',gen:0,genMark:'',
  type:'action-point',traits:[],rarity:'AP',trigger:null,
  triggerText:'',triggerTextJa:'',effect:'',effectJa:'-',
  image:IMAGE+file+'.png',
  source:PAGE+encodeURIComponent(number),
  sourceTc:null,auto:false,battleReady:false,deckLegal:false,faq:[]
 };
}

export const UA10ST_AP_CARDS=[ap('MHA-1-AP01'),ap('MHA-1-AP02')];
