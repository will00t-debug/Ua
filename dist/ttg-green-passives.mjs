// Green UA56BT continuous values must be re-evaluated from current field,
// not cached, so moving/REST/retirement can satisfy or break a condition.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {calculateTtgEnergyByColor} from './ttg-energy-snapshot.mjs';
const field=pl=>[...(pl?.front||[]),...(pl?.energy||[])].filter(Boolean);
const cardName=c=>c?.nameJa||TTG_BY_ID[c?.cardId]?.nameJa;
const hasName=(pl,n)=>field(pl).some(c=>cardName(c)===n||(c.stack||[]).some(b=>cardName(b)===n));
const printed=c=>TTG_BY_ID[c.cardId];
export function greenTtgBpBonus(state,player,c){
 if(![0,1].includes(player)||!c||!state?.players?.[player])throw new Error('Invalid green BP source');
 const id=c.cardId,pl=state.players[player];
 if(id==='TTG-1-006'&&state.active===player&&
    Object.values(calculateTtgEnergyByColor(state,player)).reduce((n,x)=>n+x,0)>=6)return 1000;
 if(id==='TTG-1-011'&&state.active===player&&
    Object.values(calculateTtgEnergyByColor(state,player)).reduce((n,x)=>n+x,0)>=8)return 1500;
 if(id==='TTG-1-007'&&hasName(pl,'ダリー'))return 1000;
 if(id==='TTG-1-013'&&hasName(pl,'ギミー'))return 1000;
 if(id==='TTG-1-027'&&c.stack?.length)return 1000;
 if(id==='TTG-1-031'&&c.stack?.length)return 1000;
 return 0;
}
export function greenTtgCurrentBp(state,player,c){
 const base=c.currentBp??printed(c)?.bp;
 if(!Number.isFinite(base))throw new Error('Unverified printed BP');
 return base+greenTtgBpBonus(state,player,c);
}
export function greenTtgNeedsEnergy(state,player,c){
 if(![0,1].includes(player)||!c||!state?.players?.[player])throw new Error('Invalid energy need');
 const d=printed(c);
 if(!d||!Number.isInteger(d.energy))throw new Error('Unverified card energy cost');
 const pl=state.players[player];
 if(d.id==='TTG-1-020'&&!field(pl).length)return Math.max(0,d.energy-2);
 if(d.type==='field'&&d.color==='green')return Math.max(0,d.energy-
   field(pl).filter(x=>x.cardId==='TTG-1-024').length);
 return d.energy;
}
export function greenTtgCanAttackOrBlock(state,player,c){
 if(c?.cardId==='TTG-1-025'){
  const all=Object.values(calculateTtgEnergyByColor(state,player)).reduce((a,b)=>a+b,0);
  return all>=6;
 }
 return !!c;
}
export function greenTtgImpactNull(blocker){
 return ['TTG-1-004','TTG-1-005','TTG-1-030'].includes(blocker?.cardId);
}
