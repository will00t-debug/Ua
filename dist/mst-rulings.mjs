// Executable isolated UA54BT rulings. These routines are NOT connected to the match engine.
// All selections must be made by the controller; invalid targets throw.
export function mstColorTargets(front,controller){
 return front.filter(c=>c&&c.owner!==controller&&Number.isFinite(c.bp)&&c.bp<=3500);
}
export function mstArielSearch(topThree,selectedId,discardId,hand=[]){
 if(!Array.isArray(topThree)||topThree.length>3)throw new Error('只能查看牌頂最多三張');
 if(selectedId==null){if(discardId!=null)throw new Error('沒有加入卡片不得棄牌');return {hand:[...hand],bottom:[...topThree]};}
 const selected=topThree.find(c=>c.uid===selectedId);
 if(!selected||!selected.traits?.includes('ラノア魔法大学'))throw new Error('只能選擇牌頂有指定特徵的卡片');
 const updated=[...hand,selected],discard=updated.find(c=>c.uid===discardId);
 if(!discard)throw new Error('加入卡片後必須從手牌棄一張');
 return {hand:updated.filter(c=>c.uid!==discardId),outside:[discard],bottom:topThree.filter(c=>c.uid!==selectedId)};
}
export function mstRoxyEventPlayOptions({hasRoxy,hand,availableEnergy,freeSlots,raidBases}){
 if(!hasRoxy)return [];
 return hand.filter(c=>c.color==='blue'&&c.ap===1&&c.energy<=availableEnergy&&['ルーデウス','ロキシー'].includes(c.name)).flatMap(c=>[
  ...freeSlots.map(slot=>({type:'play',uid:c.uid,line:slot.line,slot:slot.slot,ready:false})),
  ...raidBases.filter(base=>base.canRaidWith?.includes(c.name)).map(base=>({type:'raid',uid:c.uid,target:base.uid,ready:false}))
 ]);
}

/** MST-1-031/062: a discount survives non-matching plays until the next qualifying play. */
export function mstDiscountAp(discount,card){
 if(!discount)return {ap:card.ap,remaining:null};
 const eligible=discount.kind==='nextEventLe3'
  ?card.type==='event'&&card.energy<=3
  :discount.kind==='nextCharacterGen2'
   ?card.type==='character'&&card.gen>=2
   :false;
 return {ap:eligible?Math.max(0,card.ap-1):card.ap,remaining:eligible?null:discount};
}
/** MST-1-026 cannot enter front naturally or move by an opponent effect. */
export function mstRudeusMovementAllowed({destination,ownEffect=false,fromLine=null}){
 if(fromLine==null)return destination!=='front';
 return ownEffect;
}
/** MST-1-035 each listed name grants one optional draw if present; maximum 3. */
export function mstWarriorDrawCount(names,chosen){
 const allowed=['ルーデウス','エリス','ルイジェルド'];
 if(!Array.isArray(chosen)||chosen.length>3||new Set(chosen).size!==chosen.length||chosen.some(x=>!allowed.includes(x)||!names.includes(x)))throw new Error('無效的事件選擇');
 return chosen.length;
}
