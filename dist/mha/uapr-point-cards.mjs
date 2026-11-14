// UNI-TICKET GET BATTLE point-exchange promos.
// Fetched 2026-11-14 from the Japanese card pages. P-003's page prints
// Q2069. P-001 and P-002 had no Q&A block. Traditional Chinese follows the
// printed Japanese; the TC detail pages had no card body that day.
// These ids are UAPR/MHA-P, not UA10BT/MHA-1 or EX06BT/MHA-2.
// Images stay on the official host. No image bytes are stored here.
export const UAPR_MHA_FETCHED='2026-11-14';
const IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/';

function page(number){
 const card=encodeURIComponent(number);
 return 'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+card;
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
  title:'mha',
  set:'UAPR',
  sets:['UAPR'],
  printings:[{
   number:entry.number,
   set:'UAPR',
   rarity:'PR',
   source:page(entry.number),
   image:IMAGE+file+'.png?v9'
  }],
  color:entry.color,
  energy:entry.energy,
  ap:entry.ap,
  bp:entry.bp,
  bpMark:entry.bpMark||'',
  gen:entry.gen,
  genMark:'',
  type:'character',
  traits:entry.traits,
  rarity:'PR',
  trigger:entry.trigger,
  triggerText:entry.triggerText,
  triggerTextJa:entry.triggerTextJa,
  // effect is a Traditional Chinese reading of effectJa. The TC card page
  // had no card body on the fetch date, so effectJa stays the printed text.
  effect:entry.effect,
  effectJa:entry.effectJa,
  image:IMAGE+file+'.png?v9',
  source:page(entry.number),
  sourceTc:'',
  product:'ユニチケゲットバトル ポイント交換記念品',
  auto:false,
  battleReady:false,
  deckLegal:true,
  playable:false,
  faq:entry.faq||[]
 };
}

export const UAPR_MHA_POINT_CARDS=[
 promo({
  id:'MHA-P-001',
  number:'UAPR/MHA-P-001',
  name:'綠谷出久',
  nameJa:'緑谷 出久',
  ruby:'みどりや いずく',
  color:'yellow',energy:1,ap:1,bp:1500,bpMark:'+',gen:1,
  traits:['A組'],
  trigger:'draw',
  triggerText:'【抽牌】抽 1 張牌。',
  triggerTextJa:'【ドロー】カードを1枚引く。',
  effect:'自己場上有〈綠谷出久〉以外的［特徵：A組］時，這張卡不能從手牌登場。\n【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去衝擊）\n【自己的回合中】自己場上與場外，每有 1 種不同卡名的［特徵：ワン・フォー・オール］，此角色 BP+500。',
  effectJa:'自分の場に〈緑谷 出久〉以外の［特徴：A組］がある場合、このカードは手札から登場できない。\n【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n【自分のターン中】自分の場と場外にある異なるカード名の［特徴：ワン・フォー・オール］の種類1枚につき、このキャラはBP+500。'
 }),
 promo({
  id:'MHA-P-002',
  number:'UAPR/MHA-P-002',
  name:'死柄木弔',
  nameJa:'死柄木 弔',
  ruby:'しがらき とむら',
  color:'purple',energy:2,ap:1,bp:1000,gen:1,
  traits:[],
  trigger:'draw',
  triggerText:'【抽牌】抽 1 張牌。',
  triggerTextJa:'【ドロー】カードを1枚引く。',
  effect:'自己場上沒有任何卡時，手牌中的這張卡必要能量減少［紫×2］。\n此角色被突襲時，發動這張卡的【登場時】。（突襲上來的角色的【登場時】與此效果可依希望的順序處理）\n【登場時】可以將 1 張自己的手牌放到場外。若如此做，選擇 1 張對手前線 BP2500 以上的角色，本回合 BP-2000。',
  effectJa:'自分の場にカードが1枚もない場合、手札にあるこのカードの必要エナジーを［紫×2］減らす。\nこのキャラがレイドされた時、このカードの【登場時】を発動する。（レイドしたキャラの【登場時】とこの効果は望む順で処理する）\n【登場時】自分の手札を1枚場外に置いてもよい。そうした場合、BP2500以上の相手のフロントLのキャラを1枚選び、このターン中、BP-2000。'
 }),
 promo({
  id:'MHA-P-003',
  number:'UAPR/MHA-P-003',
  name:'霍克斯',
  nameJa:'ホークス',
  ruby:'ほーくす',
  color:'red',energy:2,ap:1,bp:3000,gen:1,
  traits:[],
  trigger:null,
  triggerText:'-',
  triggerTextJa:'-',
  effect:'【衝擊無效】（與此角色戰鬥的角色，在這次戰鬥中失去衝擊）\n【登場時】可以將 1 張自己的手牌以蓋牌放到自己場上的〈霍克斯〉下面。若以此效果把蓋牌放在此角色下面，查看自己牌庫頂 2 張，最多 1 張加入手牌。其餘放到場外。',
  effectJa:'【インパクト無効】（このキャラとバトルをしたキャラはこのバトル中、インパクトを失う）\n【登場時】自分の手札を1枚裏向きで自分の場の〈ホークス〉の下に置いてもよい。この効果でこのキャラの下に裏向きのカードを置いた場合、自分の山札の上から2枚見て、1枚まで手札に加える。残りを場外に置く。',
  faq:[{
   id:'Q2069',
   date:'2026.04.17 更新',
   q:'自分の場のカードの下に置かれた「裏向きのカード」は、何が置かれているか確認できますか？',
   a:'はい、できます。自分の場のカードの下に置かれた「裏向きのカード」は確認できます。相手の場のカードの下に置かれた「裏向きのカード」は確認できません。'
  }]
 })
];
