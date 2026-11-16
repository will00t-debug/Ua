// RNK-1-001 through 007: official Taiwan-language card identity and printed copy.
// Source: https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php
// Japanese effect copy and V2 programs are pending independent verification.
// This module does not register these cards for battles.
const PAGE='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
const IMG='https://www.unionarena-tcg.com/tc/images/cardlist/card/';
const ROWS=[
  {
    id:'RNK-1-001',name:'新井青空',nameJa:'新井 青空',rarity:'C',
    energy:2,ap:1,bp:2000,gen:1,genMark:'藍',trigger:'draw',
    effectZhTw:'〖登場時〗查看7張自己卡組上面的卡片。公開其中最多1張〈逆刃刀・真打〉並加入手牌。其餘卡片依任意順序放置在自己卡組下面。'
  },
  {
    id:'RNK-1-002',name:'心太',nameJa:'心太',rarity:'C',
    energy:0,ap:1,bp:2000,gen:1,genMark:'藍',trigger:'active',
    effectZhTw:'這張卡片也視為〈緋村劍心〉。'
  },
  {
    id:'RNK-1-003',name:'高荷惠',nameJa:'高荷 恵',rarity:'C',
    energy:0,ap:1,bp:1000,gen:1,genMark:'藍+',trigger:null,
    effectZhTw:'〖啟動主要〗〖轉為休息〗〖每回合1〗這張角色卡在這個回合中，獲得產生能源＋〖藍〗與「主要階段結束時，使這張角色卡退場。」。'
  },
  {
    id:'RNK-1-004',name:'高荷惠',nameJa:'高荷 恵',rarity:'U',
    energy:1,ap:1,bp:1500,gen:2,genMark:'藍藍',trigger:null,
    effectZhTw:'〖登場時〗將1張我方場上其他能源需求為1以下的角色放回手牌。若無法放回，則將此角色放回手牌。'
  },
  {
    id:'RNK-1-005',name:'武田觀柳',nameJa:'武田 観柳',rarity:'R',
    energy:3,ap:2,bp:1000,gen:2,genMark:'藍藍',trigger:'draw',
    effectZhTw:'〖登場時〗選擇以下其中1項。\n・選擇最多1張對手前線BP2000以下的角色卡，使其退場。\n・可使1張自己場上［特徵：御庭番眾］的卡片退場。若有執行此動作時，抽1張卡片，並選擇最多1張對手前線BP4000以下的角色卡，使其退場。'
  },
  {
    id:'RNK-1-006',name:'比古清十郎',nameJa:'比古 清十郎',rarity:'C',
    energy:0,ap:1,bp:1500,gen:1,genMark:'藍',trigger:'draw',
    effectZhTw:'〖登場時〗選擇最多1張自己場上的〈緋村劍心〉，在這個回合中，BP+1000。'
  },
  {
    id:'RNK-1-007',name:'比古清十郎',nameJa:'比古 清十郎',rarity:'U',
    energy:4,ap:1,bp:4000,gen:1,genMark:'藍',trigger:'active',
    effectZhTw:'〖我方回合中〗在這個回合中若自己使用了〈九頭龍閃〉或〈求生意志〉時，這張角色卡獲得〖衝擊（1）〗（攻擊後戰勝時，造成對手玩家1傷害）。'
  }
];
function triggerCopy(trigger){
  if(trigger==='draw')return '[抽卡] 抽1張卡片。';
  if(trigger==='active')return '[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。';
  return '';
}
function card(row){
  const number='UA41BT/'+row.id;
  return Object.freeze({
    id:row.id,identity:row.id,number,title:'rnk',set:'UA41BT',sets:['UA41BT'],
    name:row.name,nameJa:row.nameJa,nameZhTw:row.name,rarity:row.rarity,
    color:'blue',energy:row.energy,ap:row.ap,bp:row.bp,
    gen:row.gen,genMark:row.genMark,type:'character',traits:[],
    trigger:row.trigger,triggerText:triggerCopy(row.trigger),
    effect:row.effectZhTw,effectZhTw:row.effectZhTw,effectJa:null,
    image:IMG+number.replace('/','_')+'.png',
    source:PAGE+encodeURIComponent(number),sourceTc:PAGE+encodeURIComponent(number),
    printings:[{number,set:'UA41BT',rarity:row.rarity}],
    confirmedTc:true,cardDataVerified:false,auto:false,battleReady:false,
    deckLegal:true,faq:[]
  });
}
export const RNK_CARDS_001_007=Object.freeze(ROWS.map(card));
