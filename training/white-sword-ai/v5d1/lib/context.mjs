// Actor-visible board counts. Opponent hand identities and deck order stay out.
import {universalPublicView} from '../../../../dist/universal-v2/engine.mjs';

function cards(list){
 return (list||[]).flatMap(card=>card?.cardId?[card.cardId]:[]).sort();
}
export function publicContext(packs,state,actor){
 const view=universalPublicView(packs,state,actor);
 const me=view.players[actor];
 const other=view.players[actor===0?1:0];
 return {
  energy:me.energyTotal,
  apReady:me.apReady,
  hand:me.handCount,
  handCards:cards(me.hand),
  front:cards(me.front),
  oppFront:cards(other.front).length,
  life:me.lifeCount,
  oppLife:other.lifeCount
 };
}
export function contextContrast(rows){
 const end=(rows||[]).filter(row=>row.mean<0);
 const activate=(rows||[]).filter(row=>row.mean>0);
 if(!end.length||!activate.length)return null;
 const average=(list,key)=>{
  const values=list.map(row=>row.context?.[key]).filter(value=>Number.isFinite(value));
  if(!values.length)return null;
  return values.reduce((sum,value)=>sum+value,0)/values.length;
 };
 const keys=['energy','apReady','hand','life','oppLife','oppFront'];
 const table={};
 for(const key of keys)table[key]={end:average(end,key),activate:average(activate,key)};
 table.frontEnd=end.map(row=>row.context?.front||[]);
 table.frontActivate=activate.map(row=>row.context?.front||[]);
 return {end:end.length,activate:activate.length,table};
}
