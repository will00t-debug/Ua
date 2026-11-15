// Official Traditional Chinese printed card data: UA41BT RNK-1-008–014.
// Each source card detail was cross-checked against official UNION ARENA TC.
// Japanese printed effect copy / V2 effect implementation are still pending.
// Do not register these rows as battle-ready cards.
const PAGE='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
const IMAGE='https://www.unionarena-tcg.com/tc/images/cardlist/card/';
const DRAW='[抽卡] 抽1張卡片。';
const ACTIVE='[活動] 選擇1張自己場上的角色卡，置為活動，在這個回合中，BP+3000。';
const RAID='[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。';
const ROWS=[
  {
    id:'RNK-1-008',name:'比古清十郎',nameJa:'比古 清十郎',
    rarity:'SR',energy:7,ap:1,bp:5000,bpMark:'+',gen:1,trigger:'raid',
    effectZhTw:'〖突襲〗〈比古清十郎〉置為活動，並可移動至前線\n〖傷害（2）〗（這張角色卡的攻擊直接造成傷害時，替換成2傷害）\nBP2000以下的角色卡不能防禦這張角色卡。\n〖我方回合中〗這張角色卡BP+3000。\n〖登場時〗將最多1張自己場外的事件卡加入手牌。\n〖啟動主要〗〖每回合1〗選擇1張自己場上其他的角色卡，在這個回合中，BP+1000。'
  },
  {
    id:'RNK-1-009',name:'緋村劍心',nameJa:'緋村 剣心',
    rarity:'R',energy:1,ap:1,bp:2000,gen:1,trigger:null,
    effectZhTw:'〖衝擊無效〗（與這張角色卡對戰的角色卡在這回合中，失去〖衝擊〗）\n〖登場時〗查看2張自己卡組上面的卡片。將其中任意張數依任意順序放置在自己卡組的上面，其餘卡片放置在場外。'
  },
  {
    id:'RNK-1-010',name:'緋村劍心',nameJa:'緋村 剣心',
    rarity:'R',energy:3,ap:1,bp:3000,bpMark:'+',gen:2,trigger:'color',
    effectZhTw:'〖啟動主要〗〖若在能源線時〗〖每回合1〗將1張自己場外的〈求生意志〉放置在自己卡組下面。若有執行此動作時，將這張角色卡移動至前線，這張角色卡在這個回合中，BP+1000。'
  },
  {
    id:'RNK-1-011',name:'緋村劍心',nameJa:'緋村 剣心',
    rarity:'SR',energy:5,ap:1,bp:4000,bpMark:'+',gen:1,trigger:'raid',
    effectZhTw:'〖突襲〗〈緋村劍心〉置為活動，並可移動至前線\n若這張角色卡的BP在6000以上時，這張角色卡獲得〖雙重攻擊〗（這張角色卡在這個回合的第一次攻擊時置為活動）。\n〖啟動主要〗〖每回合1〗若在這個回合中自己已使用〈生存的意志〉，則在這個回合中，這張角色卡BP+1000。\n〖攻擊時〗若自己的手牌在3張以下時，抽最多1張卡片。'
  },
  {
    id:'RNK-1-012',name:'柏崎念至',nameJa:'柏崎 念至',
    rarity:'C',energy:3,ap:1,bp:3000,gen:2,traits:['御庭番眾'],trigger:null,
    effectZhTw:'若對手場上有紫色或紅色卡片時，手牌中這張卡片的能源需求減少〖藍×1〗。'
  },
  {
    id:'RNK-1-013',name:'式尉',nameJa:'式尉',
    rarity:'U',energy:4,ap:1,bp:4000,gen:1,traits:['御庭番眾'],trigger:'draw',
    effectZhTw:'〖我方回合中〗〖若在前線時〗自己場上的〈四乃森蒼紫〉因對手的效果將離場時，可改為將活動狀態的這張角色卡退場。'
  },
  {
    id:'RNK-1-014',name:'四乃森蒼紫',nameJa:'四乃森 蒼紫',
    rarity:'C',energy:0,ap:1,bp:1500,gen:1,traits:['御庭番眾'],trigger:'active',
    effectZhTw:'〖登場時〗抽1張卡片，將自己的1張手牌置於場外。'
  }
];
function triggerText(type){
  if(type==='draw')return DRAW;
  if(type==='active')return ACTIVE;
  if(type==='raid')return RAID;
  if(type==='color')return '[顏色] 選擇1張對手前線BP3500以下的角色卡，放回手牌。';
  return '';
}
function card(row){
  const number='UA41BT/'+row.id;
  const source=PAGE+encodeURIComponent(number);
  const image=IMAGE+number.replace('/','_')+'.png';
  return Object.freeze({
    id:row.id,identity:row.id,number,title:'rnk',set:'UA41BT',sets:['UA41BT'],
    name:row.name,nameJa:row.nameJa,nameZhTw:row.name,rarity:row.rarity,
    color:'blue',energy:row.energy,ap:row.ap,bp:row.bp,bpMark:row.bpMark||'',
    gen:row.gen,genMark:'',type:'character',traits:row.traits||[],
    trigger:row.trigger,triggerText:triggerText(row.trigger),
    effect:row.effectZhTw,effectZhTw:row.effectZhTw,effectJa:null,
    source,sourceTc:source,image,
    printings:[{number,set:'UA41BT',rarity:row.rarity,source,image}],
    confirmedTc:true,cardDataVerified:false,auto:false,battleReady:false,
    deckLegal:true,faq:[]
  });
}
export const RNK_CARDS_008_014=Object.freeze(ROWS.map(card));
