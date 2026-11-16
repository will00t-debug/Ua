// UAPR/RNK-P-001 official Japanese print, checked against independent
// Chinese transcription. It is a separate event identity, not a BT reprint.
// Official: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-P-001
import {tcCard} from './tc-source-helper.mjs';
const base=tcCard({
  id:'RNK-P-001',name:'浪客劍心－明治劍客浪漫譚－',
  nameJa:'るろうに剣心 －明治剣客浪漫譚－',
  rarity:'PR',color:'multicolor',energy:4,ap:1,bp:0,gen:0,
  type:'event',trigger:'final',
  effectZhTw:'本卡的顏色及必要能源均視為全部五種顏色；將最多兩張我方 AP 卡置為活動。',
  sourceNote:'Japanese official card page verified. Official TC UAPR detail page not accessible during source check.'
},'UAPR');
export const RNK_PROMO_CARD=Object.freeze({
  ...base,
  colors:Object.freeze(['red','blue','yellow','green','purple']),
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-P-001',
  sourceJa:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UAPR%2FRNK-P-001',
  sourceTc:null,
  image:'https://www.unionarena-tcg.com/jp/images/cardlist/card/UAPR_RNK-P-001.png',
  confirmedTc:false,
  confirmedJa:true,
  needsManualReview:false,
  cardDataVerified:false,battleReady:false,effectImplemented:false
});
