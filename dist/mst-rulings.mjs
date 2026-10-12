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
