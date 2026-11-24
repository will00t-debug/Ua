// Visible position facts crossed with the line the action would occupy.
// No position id, uid, or card-number exception enters the feature value.
import {INTERACTION_NAMES} from './protocol.mjs';

const NORM={energy:8,bp:20000,gen:3,bpCard:5000};
function costOf(definition){
 return Math.max(0,(Number(definition?.energy)||0)-(Number(definition?.printedHandEnergyDiscount)||0));
}
function definitionOf(books,seat,card){
 if(!card?.cardId)return null;
 return books?.[seat]?.[card.cardId]||books?.[0]?.[card.cardId]||null;
}
function findOwn(me,uid){
 if(!uid||!me)return null;
 for(const card of me.hand||[])if(card?.uid===uid)return card;
 for(const line of ['front','energy']){
  for(const card of me[line]||[])if(card?.uid===uid)return card;
 }
 return null;
}
function occupied(line){
 return (line||[]).filter(card=>card?.cardId);
}
function bpOf(line){
 return occupied(line).reduce((sum,card)=>sum+(Number(card.bp)||0),0);
}
function unmetOf(colors,hand,books,seat,ignoreUid){
 let total=0;
 for(const card of hand||[]){
  if(!card?.cardId||card.uid===ignoreUid)continue;
  const definition=definitionOf(books,seat,card);
  if(!definition||(definition.type!=='character'&&definition.type!=='event'))continue;
  total+=Math.max(0,costOf(definition)-((colors?.[definition.color])||0));
 }
 return total;
}
function coveredBy(colors,hand,books,seat,ignoreUid,color,gen){
 const before=unmetOf(colors,hand,books,seat,ignoreUid);
 const next={...(colors||{})};
 if(color)next[color]=(next[color]||0)+(Number(gen)||0);
 const after=unmetOf(next,hand,books,seat,ignoreUid);
 return Math.max(0,before-after);
}
function zeros(){
 return Object.fromEntries(INTERACTION_NAMES.map(name=>[name,0]));
}
export function positionFacts(observation,books,seat){
 const me=observation?.visible?.players?.[seat];
 const opp=observation?.visible?.players?.[seat===0?1:0];
 if(!me||!opp)throw Error('局面缺少可見座位');
 const frontSlots=(me.front||[]).length;
 const energySlots=(me.energy||[]).length;
 return {
  energyTotal:Number(me.energyTotal)||0,
  apReady:Number(me.apReady)||0,
  handCount:(me.hand||[]).filter(card=>card?.cardId).length,
  unmet:unmetOf(me.energyByColor,me.hand,books,seat,null),
  myBp:bpOf(me.front),
  oppBp:bpOf(opp.front),
  frontEmpty:frontSlots-occupied(me.front).length,
  frontSlots,
  energyEmpty:energySlots-occupied(me.energy).length,
  energySlots
 };
}
export function interactionOf(observation,books,seat,action){
 const me=observation.visible.players[seat];
 const facts=positionFacts(observation,books,seat);
 const values=zeros();
 const placed=action?.type==='play'&&(action.line==='front'||action.line==='energy');
 if(!placed)return {values,facts};
 const card=findOwn(me,action.uid);
 const definition=definitionOf(books,seat,card);
 const unmet=unmetOf(me.energyByColor,me.hand,books,seat,action.uid);
 if(action.line==='energy'){
  values.hand_short=unmet/NORM.energy;
  values.pay_relief=coveredBy(me.energyByColor,me.hand,books,seat,action.uid,definition?.color,definition?.gen)/NORM.energy;
  values.open_energy=facts.energySlots?facts.energyEmpty/facts.energySlots:0;
  values.realize_gen=(Number(definition?.gen)||0)/NORM.gen;
 }
 if(action.line==='front'){
  values.board_pressure=(facts.oppBp-facts.myBp)/NORM.bp;
  values.open_front=facts.frontSlots?facts.frontEmpty/facts.frontSlots:0;
  values.realize_bp=(Number(card?.bp??definition?.bp)||0)/NORM.bpCard;
 }
 return {values,facts};
}
export function measureLegal(observation,books,seat,legal){
 const facts=positionFacts(observation,books,seat);
 const actions=(legal||[]).map(action=>({
  key:action.key,
  values:interactionOf(observation,books,seat,action).values
 }));
 return {facts,actions};
}
