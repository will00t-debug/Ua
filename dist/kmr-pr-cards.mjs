// UNI-TICKET GET BATTLE point-exchange promos. Fetched 2026-11-04 from
// the Japanese card pages. The Traditional Chinese detail pages did not
// return card text, so the Chinese below follows the same wording as the
// EX12BT catalogue and the Rugia listing of these three cards.
// The engine matches effectJa. These are deck characters, not action-point
// cards. Images load from Rugia. No image bytes are stored here.
// Registration is not an official FAQ certification.
export const KMR_PR_FETCHED='2026-11-04';
export const KMR_PR_ART_CREDIT='卡圖：路基亞（rugiacreation.com）；卡圖著作權屬 BANDAI';
const RUGIA='https://rugiacreation.com/ua/cardlist/small/';
const ART='?v=20261030';

function page(number){
 const card=encodeURIComponent(number);
 return 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+card;
}
function pageTc(number){
 const card=encodeURIComponent(number);
 return 'https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no='+card;
}
function promo(entry){
 const file=entry.number.replaceAll('/','_');
 return {
  id:entry.id,
  identity:entry.id,
  number:entry.number,
  name:entry.name,
  nameJa:entry.nameJa,
  ruby:entry.ruby,
  title:'kmr',
  set:'UAPR',
  sets:['UAPR'],
  printings:[{
   number:entry.number,
   set:'UAPR',
   rarity:'PR',
   source:page(entry.number),
   image:RUGIA+file+'.jpg'+ART
  }],
  color:entry.color,
  energy:entry.energy,
  ap:entry.ap,
  bp:entry.bp,
  bpMark:'',
  gen:entry.gen,
  genMark:'',
  type:'character',
  traits:[],
  rarity:'PR',
  trigger:entry.trigger,
  triggerText:entry.triggerText,
  triggerTextJa:entry.triggerTextJa,
  effect:entry.effect,
  effectJa:entry.effectJa,
  image:RUGIA+file+'.jpg'+ART,
  officialImage:'https://www.unionarena-tcg.com/jp/images/cardlist/card/'+file+'.png?v9',
  source:page(entry.number),
  sourceTc:pageTc(entry.number),
  artCredit:KMR_PR_ART_CREDIT,
  product:'ユニチケゲットバトル ポイント交換記念品',
  auto:false,
  engineKind:entry.id,
  faq:[]
 };
}

export const KMR_PR_CARDS=[
 promo({
  id:'KMR-P-003',
  number:'UAPR/KMR-P-003',
  name:'假面騎士GAVV POPPINGUMMY形態',
  nameJa:'仮面ライダーガヴ ポッピングミフォーム',
  ruby:'かめんらいだーがゔ ぽっぴんぐみふぉーむ',
  color:'yellow',energy:0,ap:1,bp:1000,gen:1,trigger:'draw',
  triggerText:'[抽卡] 抽1張卡片。',
  triggerTextJa:'【ドロー】カードを1枚引く。',
  effect:'【登場時】查看5張自己卡組上面的卡片，將『〈口嚼獸〉』最多1張公開並加入手牌。其餘卡片依任意順序放置在自己卡組下面。若將〈口嚼獸〉加入手牌，將1張自己的手牌放置在場外。查看卡組後，可以讓自己場上的1張〈口嚼獸〉退場。若有執行此動作，則改為『黃色角色卡』。（〈口嚼獸〉的【退場時】會在這個效果處理完後發動）',
  effectJa:'【登場時】自分の山札の上から5枚見て、『〈ゴチゾウ〉』を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。〈ゴチゾウ〉を手札に加えた場合、自分の手札を1枚場外に置く。山札を見た後に、自分の場の〈ゴチゾウ〉を1枚退場させてもよい。そうした場合、『黄のキャラカード』に代わる。（〈ゴチゾウ〉の【退場時】はこの効果を処理した後に発動する）'
 }),
 promo({
  id:'KMR-P-004',
  number:'UAPR/KMR-P-004',
  name:'假面騎士DECADE',
  nameJa:'仮面ライダーディケイド',
  ruby:'かめんらいだーでぃけいど',
  color:'green',energy:3,ap:1,bp:3000,gen:2,trigger:'active',
  triggerText:'[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。',
  triggerTextJa:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  effect:'【登場時】可以將自己場上1張［特徵：重新想像］返回手牌。若有執行此動作，這個回合中，下一次從手牌使用的、不持有【突襲】且卡片名稱包含「DECADE」的角色卡，消耗AP-1。',
  effectJa:'【登場時】自分の場の［特徴：リ・イマジネーション］を1枚手札に戻してもよい。そうした場合、このターン中、次に手札から使用する【レイド】を持たないカード名に「ディケイド」を含むキャラカードの消費APを-1する。'
 }),
 promo({
  id:'KMR-P-005',
  number:'UAPR/KMR-P-005',
  name:'假面騎士龍騎',
  nameJa:'仮面ライダー龍騎',
  ruby:'かめんらいだーりゅうき',
  color:'red',energy:4,ap:2,bp:4000,gen:1,trigger:'get',
  triggerText:'[獲得] 將這張卡片加入手牌。',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effect:'【登場時】從自己場外將最多1張卡片名稱包含「生存形態」的卡片放到自己卡組上面。【啟動主要】【若在前線時】【每回合1】若自己場上有卡片名稱包含「夜騎」的角色卡，抽1張卡片。若自己場上有突襲狀態的〈假面騎士夜騎 生存形態〉，可從自己手牌將最多1張〈假面騎士龍騎 生存形態〉突襲到這張角色卡上。',
  effectJa:'【登場時】自分の場外からカード名に「サバイブ」を含むカードを1枚まで自分の山札の上に置く。【起動メイン】【フロントLにある場合】 【ターン1】自分の場にカード名に「ナイト」を含むキャラがある場合、カードを1枚引く。自分の場にレイド状態の〈仮面ライダーナイトサバイブ〉がある場合、自分の手札から〈仮面ライダー龍騎サバイブ〉を1枚までこのキャラにレイドさせる。'
 })
];
