// UNI-TICKET GET BATTLE point-exchange promos. Fetched 2026-11-19 from
// the Japanese card pages. Traditional Chinese detail pages for Toriko are
// still unpublished, so names and effect text stay the Japanese official print.
// These are deck characters, not action-point cards. Images stay on the
// official host. No image bytes are stored here.
// Registration is not an official FAQ certification.
export const TORIKO_PR_FETCHED='2026-11-19';

function page(number){
 const card=encodeURIComponent(number);
 return 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+card;
}

function promo(entry){
 const file=entry.number.replaceAll('/','_');
 const image='https://www.unionarena-tcg.com/jp/images/cardlist/card/'+file+'.png';
 return {
  id:entry.id,
  identity:entry.id,
  number:entry.number,
  name:entry.name,
  nameJa:entry.name,
  ruby:entry.ruby,
  title:'toriko',
  set:'UAPR',
  sets:['UAPR'],
  printings:[{
   number:entry.number,
   set:'UAPR',
   rarity:'PR',
   source:page(entry.number),
   image
  }],
  color:entry.color,
  energy:entry.energy,
  ap:entry.ap,
  bp:entry.bp,
  bpMark:entry.bpMark,
  gen:entry.gen,
  genMark:'',
  type:'character',
  traits:entry.traits,
  rarity:'PR',
  trigger:entry.trigger,
  triggerTextJa:entry.triggerTextJa,
  effect:entry.effect,
  effectJa:entry.effectJa,
  image,
  source:page(entry.number),
  sourceTc:null,
  product:'ユニチケゲットバトル第2弾 ポイント交換記念品',
  auto:false,
  engineKind:entry.engineKind,
  faq:[]
 };
}

export const TORIKO_PR_CARDS=[
 promo({
  id:'TRK-P-001',
  number:'UAPR/TRK-P-001',
  name:'ココ',
  ruby:'ここ',
  color:'yellow',energy:2,ap:1,bp:3000,bpMark:'+',gen:1,
  traits:['美食四天王'],
  trigger:'draw',
  triggerTextJa:'【ドロー】カードを1枚引く。',
  effect:'【登場時】自分の場の［特徴：美食四天王］を1枚まで選び、このターン中、BP+1000。自分のフロントLに〈トリコ〉と〈サニー〉と〈ゼブラ〉がある場合、さらに選んだキャラをアクティブにする。',
  effectJa:'【登場時】自分の場の［特徴：美食四天王］を1枚まで選び、このターン中、BP+1000。自分のフロントLに〈トリコ〉と〈サニー〉と〈ゼブラ〉がある場合、さらに選んだキャラをアクティブにする。',
  engineKind:'cocoKings'
 }),
 promo({
  id:'TRK-P-002',
  number:'UAPR/TRK-P-002',
  name:'トリコ',
  ruby:'とりこ',
  color:'blue',energy:3,ap:1,bp:3000,bpMark:'+',gen:2,
  traits:['美食四天王'],
  trigger:'active',
  triggerTextJa:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
  effect:'【登場時】APを1支払ってもよい。そうした場合、自分の山札の上から7枚見る。その中から異なるカード名の青の［特徴：食材］をそれぞれ1枚までと〈小松〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。【アタック時】このターン中に自分が手札から［特徴：食材］を使用している場合、自分の場のキャラを1枚まで選び、このターン中、BP+2000。',
  effectJa:'【登場時】APを1支払ってもよい。そうした場合、自分の山札の上から7枚見る。その中から異なるカード名の青の［特徴：食材］をそれぞれ1枚までと〈小松〉を1枚まで公開し手札に加える。残りを望む順で自分の山札の下に置く。【アタック時】このターン中に自分が手札から［特徴：食材］を使用している場合、自分の場のキャラを1枚まで選び、このターン中、BP+2000。',
  engineKind:'promoLook'
 }),
 promo({
  id:'TRK-P-003',
  number:'UAPR/TRK-P-003',
  name:'三虎',
  ruby:'みどら',
  color:'purple',energy:5,ap:1,bp:4000,bpMark:'',gen:1,
  traits:['美食會／ボス'],
  trigger:'get',
  triggerTextJa:'【ゲット】このカードを手札に加える。',
  effect:'自分の手札が0枚の場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。【登場時】自分の山札の上から1枚を裏向きでこのキャラの下に置く。【起動メイン】【ターン1】自分の手札を望む枚数裏向きでこのキャラの下に置く。【退場時】このキャラの下の裏向きカードの枚数分までカードを引く。',
  effectJa:'自分の手札が0枚の場合、このキャラは【インパクト（1）】（アタックしてバトルに勝利した時、相手プレイヤーに1ダメージ）を得る。【登場時】自分の山札の上から1枚を裏向きでこのキャラの下に置く。【起動メイン】【ターン1】自分の手札を望む枚数裏向きでこのキャラの下に置く。【退場時】このキャラの下の裏向きカードの枚数分までカードを引く。',
  engineKind:'midoraPile'
 })
];
