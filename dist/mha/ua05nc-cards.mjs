// UA05NC / MHA-3 character cards whose faces are public.
// The official card list still has no UA05NC row. Stats and Japanese text
// below were read from the published card faces and checked against the
// Traditional Chinese transcription. A symbol that is not readable stays
// null. These rows are not magazine appendix cards and do not reuse
// UA10BT or EX06BT numbers.
export const UA05NC_MHA3_FETCHED_CARDS='2026-11-14';
export const UA05NC_MHA3_FACE='https://rugiacreation.com/ua/cardlist/';
const FACE=id=>'https://rugiacreation.com/ua/cardlist/UA05NC_'+id+'.png?v=20261110';
const PAGE=id=>'https://rugiacreation.com/ua/search?Name=TW&Find1='+id;

function row(card){
 return Object.freeze({
  title:'mha',
  set:'UA05NC',
  series:'MHA-3',
  kind:'new-card-selection',
  magazineAppendix:false,
  type:'character',
  rarity:'SP',
  ruby:null,
  bpMark:'',
  auto:false,
  battleReady:false,
  playable:false,
  deckLegal:true,
  faq:Object.freeze([]),
  officialDetail:null,
  ...card
 });
}

export const UA05NC_MHA3_CARDS=Object.freeze([
 row({
  id:'MHA-3-001',
  number:'UA05NC/MHA-3-001',
  name:'麗日 御茶子',
  nameJa:'麗日 お茶子',
  color:'yellow',
  energy:3,
  ap:2,
  bp:2500,
  gen:2,
  traits:Object.freeze(['A組']),
  trigger:'get',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effectJa:'【登場時】カードを2枚引く。\n【起動メイン】［ターン1］以下から1つ選ぶ。\n・自分の場の他の［特徴：A組］を1枚選び、このターン中、BP+1000。\n・自分の場の〈緑谷 出久〉を1枚まで選び、アクティブにする。',
  image:FACE('MHA-3-001'),
  source:PAGE('MHA-3-001')
 }),
 row({
  id:'MHA-3-002',
  number:'UA05NC/MHA-3-002',
  name:'死柄木 弔',
  nameJa:'死柄木 弔',
  color:'purple',
  energy:4,
  ap:1,
  bp:4000,
  gen:1,
  traits:Object.freeze([]),
  trigger:'raid',
  triggerTextJa:'【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。',
  effectJa:'【レイド】〈死柄木 弔〉\n【インパクト1】（アタックしてバトルに勝利した時、相手に1ダメージ）\n【自分のターン中】このキャラとのバトルで敗北した相手のキャラは、退場する代わりに、リムーブエリアに置かれる。\n【起動メイン】フロントLにある場合［ターン1］BP1500以上の相手のフロントLのキャラを2枚まで選び、このターン中、BP-1000。',
  image:FACE('MHA-3-002'),
  source:PAGE('MHA-3-002')
 }),
 row({
  id:'MHA-3-003',
  number:'UA05NC/MHA-3-003',
  name:'荼毘',
  nameJa:'荼毘',
  color:'purple',
  energy:3,
  ap:1,
  bp:3000,
  gen:2,
  traits:Object.freeze([]),
  trigger:'active',
  triggerTextJa:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  effectJa:'【起動メイン】BP1500以上で、元々のBPよりBPが低い相手のフロントLのキャラを1枚選び、このターン中、BP-1000。〈荼毘〉のこの効果は1ターンに1回しか発動できない。（この効果を得た他のキャラも含む）',
  image:FACE('MHA-3-003'),
  source:PAGE('MHA-3-003')
 }),
 row({
  id:'MHA-3-004',
  number:'UA05NC/MHA-3-004',
  name:'渡我被身子',
  nameJa:'トガヒミコ',
  color:'purple',
  energy:3,
  ap:1,
  bp:2000,
  gen:2,
  traits:Object.freeze([]),
  trigger:'color',
  triggerTextJa:'【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。',
  effectJa:'【起動メイン】レストにする 相手の場に元々のBPよりBPが低いキャラがある場合のみ発動できる。自分の場の特徴を持たないキャラを1枚選び、このターン中、「【アタック時】カードを1枚まで引く」を与える。〈トガヒミコ〉のこの効果は1ターンに1回しか発動できない。（この効果を得た他のキャラも含む）',
  image:FACE('MHA-3-004'),
  source:PAGE('MHA-3-004')
 }),
 row({
  id:'MHA-3-006',
  number:'UA05NC/MHA-3-006',
  name:'綠谷 出久',
  nameJa:'緑谷 出久',
  color:'green',
  energy:0,
  ap:1,
  bp:1000,
  gen:1,
  traits:Object.freeze([]),
  trigger:'draw',
  triggerTextJa:'【ドロー】カードを1枚引く。',
  effectJa:'【起動メイン】レストにする 相手のフロントLにキャラが3枚以上ある場合のみ発動できる。自分の場の他のキャラを1枚選び、このターン中、BP+500。選んだキャラが〈緑谷 出久〉の場合、さらにこのターン中、「このキャラのBPが5000以上の場合、このキャラは【インパクト1】を得る」を与える。〈緑谷 出久〉のこの効果は1ターンに1回しか発動できない。',
  image:FACE('MHA-3-006'),
  source:PAGE('MHA-3-006')
 }),
 row({
  id:'MHA-3-009',
  number:'UA05NC/MHA-3-009',
  name:'爆豪 勝己',
  nameJa:'爆豪 勝己',
  color:'red',
  energy:2,
  ap:1,
  bp:3000,
  bpMark:'+',
  gen:1,
  traits:Object.freeze([]),
  trigger:'active',
  triggerTextJa:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  effectJa:'【自分のターン中】このキャラはBP+500。\n【アタック時】カードを1枚引き、自分の手札を1枚自分の山札の下に置く。このキャラは次の1回アクティブにならない。',
  energyDiscount:null,
  energyDiscountNote:'空場時減少的紅六角數字在卡面上看不清。中文站標成紅2，不寫進效果。',
  image:FACE('MHA-3-009'),
  source:PAGE('MHA-3-009')
 })
]);
