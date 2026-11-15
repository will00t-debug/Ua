// Official Traditional Chinese printed card data: UA41BT RNK-1-015–021.
// Source: UNION ARENA Taiwan card-detail entries for each numbered card.
// V2 DSL effects and Japanese printed effect text require separate acceptance.
const PAGE='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
const IMAGE='https://www.unionarena-tcg.com/tc/images/cardlist/card/';
const ROWS=[
  {
    id:'RNK-1-015',name:'四乃森蒼紫',nameJa:'四乃森 蒼紫',
    rarity:'C',energy:1,ap:1,bp:2000,bpMark:'+',gen:1,trigger:null,
    traits:['御庭番眾'],
    effectZhTw:'〖我方回合中〗這張角色卡BP+1000。'
  },
  {
    id:'RNK-1-016',name:'四乃森蒼紫',nameJa:'四乃森 蒼紫',
    rarity:'U',energy:2,ap:1,bp:2500,gen:1,trigger:'color',
    traits:['御庭番眾'],
    effectZhTw:'〖登場時〗若這張角色卡是因自己的角色卡效果或事件卡效果登場時，抽1張卡片。'
  },
  {
    id:'RNK-1-017',name:'四乃森蒼紫',nameJa:'四乃森 蒼紫',
    rarity:'R',energy:4,ap:1,bp:4000,gen:1,trigger:'draw',
    traits:['御庭番眾'],
    effectZhTw:'〖登場時〗可將1張自己前線活動狀態的其他［特徵：御庭番眾］轉為休息。若有執行此動作時，將這張角色卡置為活動。'
  },
  {
    id:'RNK-1-018',name:'四乃森蒼紫',nameJa:'四乃森 蒼紫',
    rarity:'SR',energy:4,ap:1,bp:4000,bpMark:'+',gen:1,trigger:'raid',
    traits:['御庭番眾'],
    effectZhTw:'〖突襲〗〈四乃森蒼紫〉置為活動，並可移動至前線\n〖登場時〗在這個回合中，這張角色卡BP+1000。\n〖啟動主要〗使這張角色卡的突襲來源卡以活動狀態在自己場上登場，並使該角色卡在這個回合中，獲得「這張角色卡無法攻擊。」與「自己的攻擊階段結束時，若這張角色卡為活動時，使其退場。」。'
  },
  {
    id:'RNK-1-019',name:'般若',nameJa:'般若',
    rarity:'R',energy:3,ap:1,bp:3000,bpMark:'+',gen:2,trigger:null,
    traits:['御庭番眾'],
    effectZhTw:'〖啟動主要〗〖將1張手牌放置在場外〗〖每回合1〗在這個回合中，這張角色卡BP+1000。\n〖退場時〗可以將1張自己的手牌放置在場外。若有執行此動作時，使最多1張自己場外能源需求2以下的藍色〈四乃森蒼紫〉以休息狀態在自己場上登場。'
  },
  {
    id:'RNK-1-020',name:'火男',nameJa:'火男',
    rarity:'C',energy:0,ap:1,bp:2000,gen:1,trigger:null,
    traits:['御庭番眾'],
    effectZhTw:'〖退場時〗若自己場上有〈四乃森蒼紫〉時，抽1張卡片。'
  },
  {
    id:'RNK-1-021',name:'癋見',nameJa:'癋見',
    rarity:'U',energy:1,ap:1,bp:1500,gen:1,trigger:'draw',
    traits:['御庭番眾'],
    effectZhTw:'〖登場時〗查看3張自己卡組上面的卡片。公開其中最多1張〈高荷惠〉或［特徵：御庭番眾］並加入手牌。其餘卡片依任意順序放置在自己卡組下面。若有加入手牌時，將1張自己的手牌放置在場外。'
  }
];
function triggerText(type){
  switch(type){
    case 'draw': return '[抽卡] 抽1張卡片。';
    case 'raid': return '[突襲] 將這張卡片加入手牌，或若是滿足能源需求時，可發動突襲。';
    case 'color':return '[顏色] 選擇1張對手前線BP3500以下的角色卡，放回手牌。';
    default: return '';
  }
}
function card(row){
  const number='UA41BT/'+row.id;
  const source=PAGE+encodeURIComponent(number);
  const image=IMAGE+number.replace('/','_')+'.png';
  return Object.freeze({
    id:row.id,identity:row.id,number,title:'rnk',set:'UA41BT',sets:['UA41BT'],
    name:row.name,nameJa:row.nameJa,nameZhTw:row.name,rarity:row.rarity,
    color:'blue',energy:row.energy,ap:row.ap,bp:row.bp,bpMark:row.bpMark||'',
    gen:row.gen,genMark:'',type:'character',traits:row.traits,
    trigger:row.trigger,triggerText:triggerText(row.trigger),
    effect:row.effectZhTw,effectZhTw:row.effectZhTw,effectJa:null,
    source,sourceTc:source,image,
    printings:[{number,set:'UA41BT',rarity:row.rarity,source,image}],
    confirmedTc:true,cardDataVerified:false,auto:false,battleReady:false,deckLegal:true,faq:[]
  });
}
export const RNK_CARDS_015_021=Object.freeze(ROWS.map(card));
