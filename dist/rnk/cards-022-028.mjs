// Official Traditional Chinese printed data, UA41BT RNK-1-022–028.
// Sources: UNION ARENA TC numbered card-detail pages. Text is not V2-ready.
// Effect programming, Japanese text comparison and play validation pending.
const PAGE='https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=';
const IMAGE='https://www.unionarena-tcg.com/tc/images/cardlist/card/';
const ROWS=[
  {
    id:'RNK-1-022',name:'卷町操',nameJa:'巻町 操',
    rarity:'C',energy:0,ap:1,bp:1500,gen:1,type:'character',
    traits:['御庭番眾'],trigger:'draw',
    effectZhTw:'〖衝擊無效〗（與這張角色卡對戰的角色卡在這回合中，失去〖衝擊〗）'
  },
  {
    id:'RNK-1-023',name:'卷町操',nameJa:'巻町 操',
    rarity:'U',energy:2,ap:1,bp:2500,gen:1,genMark:'藍+',type:'character',
    traits:['御庭番眾'],trigger:null,
    effectZhTw:'此角色為活動狀態時，此角色的產生能源+〖藍〗。'
  },
  {
    id:'RNK-1-024',name:'卷町操',nameJa:'巻町 操',
    rarity:'R',energy:2,ap:1,bp:2000,gen:1,genMark:'藍+',type:'character',
    traits:['御庭番眾'],trigger:'draw',
    effectZhTw:'〖登場時〗選擇以下1項。\n・在這張回合中，這張角色卡的產生能源+〖藍〗。\n・選擇最多1張自己場上其他的角色卡，在這個回合中，BP+1000。\n〖啟動主要〗〖轉為休息〗選擇1張自己場上其他的角色卡，在這個回合中，BP+1000。將這張卡片放回手牌。'
  },
  {
    id:'RNK-1-025',name:'卷町操',nameJa:'巻町 操',
    rarity:'SR',energy:2,ap:1,bp:2000,gen:1,type:'character',
    traits:['御庭番眾'],trigger:'draw',
    effectZhTw:'若自己場上沒有任何卡片時，手牌中這張卡片的能源需求減少〖藍×2〗。\n〖登場時〗查看3張自己卡組上面的卡片。將其中最多1張卡片放置在場外，其餘卡片依任意順序放置在自己卡組的上面。'
  },
  {
    id:'RNK-1-026',name:'修行',nameJa:'修行',
    rarity:'C',energy:3,ap:1,bp:0,gen:2,type:'field',traits:[],trigger:'get',
    effectZhTw:'〖登場時〗查看3張自己卡組上面的卡片。公開其中最多1張〈比古清十郎〉或〈緋村劍心〉並加入手牌。其餘卡片依任意順序放置在自己卡組下面。若將能源需求4以上的卡片加入手牌時，將1張自己的手牌放置在場外。'
  },
  {
    id:'RNK-1-027',name:'求生意志',nameJa:'生きようとする意志',
    rarity:'U',energy:3,ap:1,bp:0,gen:0,type:'event',traits:[],trigger:'final',
    effectZhTw:'選擇最多2張自己的AP卡，將其轉為活動狀態。'
  },
  {
    id:'RNK-1-028',name:'回天劍舞',nameJa:'回天剣舞',
    rarity:'U',energy:4,ap:1,bp:0,gen:0,type:'event',traits:[],trigger:'special',
    effectZhTw:'選擇1張對手前線『BP3000』以下的角色卡，使其退場。自己場上每有1張〈四乃森蒼紫〉，此效果可選擇的角色卡BP範圍+1000。'
  }
];
function triggerText(type){
  if(type==='draw')return '[抽卡] 抽1張卡片。';
  if(type==='get')return '[獲得] 將這張卡片加入手牌。';
  if(type==='final')return '[最終] 若自己沒有生命卡時，將1張自己卡組上面的卡片放置在自己的生命區。';
  if(type==='special')return '[特別] 選擇1張對手前線的角色卡，使其退場。';
  return '';
}
function card(row){
  const number='UA41BT/'+row.id;
  const source=PAGE+encodeURIComponent(number);
  const image=IMAGE+number.replace('/','_')+'.png';
  return Object.freeze({
    id:row.id,identity:row.id,number,title:'rnk',set:'UA41BT',sets:['UA41BT'],
    name:row.name,nameJa:row.nameJa,nameZhTw:row.name,rarity:row.rarity,
    color:'blue',energy:row.energy,ap:row.ap,bp:row.bp,bpMark:'',
    gen:row.gen,genMark:row.genMark||'',type:row.type,traits:row.traits,
    trigger:row.trigger,triggerText:triggerText(row.trigger),
    effect:row.effectZhTw,effectZhTw:row.effectZhTw,effectJa:null,
    source,sourceTc:source,image,
    printings:[{number,set:'UA41BT',rarity:row.rarity,source,image}],
    confirmedTc:true,cardDataVerified:false,auto:false,battleReady:false,deckLegal:true,faq:[]
  });
}
export const RNK_CARDS_022_028=Object.freeze(ROWS.map(card));
