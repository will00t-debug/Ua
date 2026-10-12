// UA54BT catalogue: 80 numbered effect cards + 12 non-deck AP cards.
// Unverified fields remain null; these placeholders are not playable nor fabricated.
export const UA54BT_PRODUCT='https://www.unionarena-tcg.com/jp/products/boosters/mst-1.php';
export const UA54BT_CARDLIST='https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570154';
const numberOf=n=>'UA54BT/MST-1-'+String(n).padStart(3,'0');
const official=n=>'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent(numberOf(n));
const pending=n=>({id:'MST-1-'+String(n).padStart(3,'0'),identity:'MST-1-'+String(n).padStart(3,'0'),number:numberOf(n),title:'mushoku-tensei',name:'待核對卡片 '+String(n).padStart(3,'0'),nameJa:null,color:null,energy:null,ap:null,bp:null,gen:null,type:null,traits:[],rarity:null,trigger:null,effect:null,auto:false,verified:false,reason:'官方卡面與 FAQ 尚未逐項核對；禁止用於自動對戰。',variants:[],image:null,source:official(n)});
const VERIFIED={
 1:{name:'エリス',nameJa:'エリス',color:'blue',energy:0,ap:1,bp:1500,gen:1,type:'character',rarity:'C',trigger:'get',effect:'-',triggerEffect:'このカードを手札に加える。'},
 40:{name:'私がついていますから',nameJa:'私がついていますから',color:'blue',energy:2,ap:1,bp:0,gen:0,type:'event',rarity:'C',trigger:'color',effect:'このカードは自分の場に〈ロキシー〉がある場合のみ使用できる。自分の手札から必要エナジーを満たし消費APが1の青の〔〈ルーデウス〉か〈ロキシー〉〕を1枚まで自分の場にレストで登場させるかレイドさせる。カードを1枚引く。自分の場の〈ルーデウス〉を1枚まで選び、別のラインに移動させる。',triggerEffect:'BP3500以下の相手のフロントLのキャラを1枚選び、手札に戻す。'},
 55:{name:'アリエル',nameJa:'アリエル',color:'green',energy:1,ap:1,bp:2000,gen:1,type:'character',traits:['ラノア魔法大学'],rarity:'R',trigger:'draw',effect:'登場時：自分の山札の上から3枚見て、［特徴：ラノア魔法大学］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。'}
};
export const UA54BT_VERIFIED=Array.from({length:80},(_,i)=>{const n=i+1,entry=pending(n);return VERIFIED[n]?{...entry,...VERIFIED[n],verified:true,reason:'官方資料已核對；效果尚未接入引擎。'}:entry;});
export const UA54BT_AP=Array.from({length:12},(_,i)=>{const id='MST-1-AP'+String(i+1).padStart(2,'0');return {id,number:'UA54BT/'+id,title:'mushoku-tensei',name:'アクションポイントカード',type:'action-point',verified:true,auto:false,source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no='+encodeURIComponent('UA54BT/'+id),image:null,deckEligible:false};});
export const UA54BT_ALL=[...UA54BT_VERIFIED,...UA54BT_AP];
