// Official Japanese UA51BT examples; never use unverified cards as playable effects.
// Canonical SLG-1 ids only: alternate art is not a new game card.
const root='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=';
const raw=[
 ['011','向坂雫','purple',4,1,4000,1,'character','color','從場外經自己的效果加入手牌後，可依條件登場；若由水篠旬效果加入，改為 ACTIVE。場外至少 10 張時，無法被 BP4000 以上角色阻擋。登場時可把牌庫頂最多 1 張放到場外。'],
 ['029','凱賽爾','purple',3,1,2500,2,'character','active','原本 BP2000 以下的己方影之軍團攻擊時，可將 ACTIVE 的自己轉為 REST，二選一賦予攻擊者不能被 BP4000 以上阻擋或不會被敵方效果選取。所有凱賽爾共享各選項每回合限制。'],
 ['033','貝爾','purple',5,1,4000,1,'character',null,'攻擊時己方有 4 張以上原本 BP3000 以下且 REST 的影之軍團角色，可以棄 1 張手牌使自己 ACTIVE；所有貝爾每回合共用一次限制。'],
 ['067','加奈','green',4,1,3000,1,'character','color','登場時，若己方場上有至少 3 張 DFN，抽 1 張、此角色轉為 ACTIVE 並於本回合 BP+1000；同名登場能力每回合共用一次。']
];
export const SOLO_LEVELING_CARDS=raw.map(([suffix,name,color,energy,ap,bp,gen,type,trigger,effect])=>{
 const id='SLG-1-'+suffix,number='UA51BT/'+id;
 return {id,identity:id,number,name,color,energy,ap,bp,gen,type,trigger,effect,sets:['ua51bt'],title:'solo-leveling',auto:false,source:root+encodeURIComponent(number),image:null};
});
