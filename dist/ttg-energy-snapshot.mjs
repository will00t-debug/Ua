// Derived TTG color energy for states that opt into energyMode:'derive'.
// Unlike a cached "energyProduced" value, this recalculates after REST,
// movement, continuing abilities and temporary generator effects.
// Sources: UA56BT/TTG-1-019, 033, 066 and official Q2264/Q2265.
import {TTG_BY_ID} from './ttg-builder.mjs';

const bonusWhileActive=new Set(['TTG-1-019','TTG-1-033','TTG-1-066']);
import {red060ExtraEnergy} from './ttg-red-seventh-three.mjs';
const colors=['red','green'];
export function calculateTtgEnergyByColor(state,player){
 if(![0,1].includes(player)||!state?.players?.[player])throw new Error('Invalid TTG player');
 const pl=state.players[player],doubles=pl.energyDoublings??0;
 if(!Number.isInteger(doubles)||doubles<0||doubles>12)throw new RangeError('Invalid energy doubling count');
 const energy={red:0,green:0};
 for(const line of ['energy','front']){
  const items=pl[line]||[];
  if(!Array.isArray(items))throw new Error('Malformed TTG line');
  for(const c of items){
   if(!c)continue;
   const printed=TTG_BY_ID[c.cardId];
   const color=c.color??printed?.color;
   if(!colors.includes(color))throw new Error('Unknown TTG energy color');
   const produces=line==='energy'||c.frontGenerates===true||pl.frontGeneratesAll===true;
   if(!produces)continue;
   const base=c.gen??printed?.gen;
   if(!Number.isFinite(base)||base<0||!Number.isInteger(base))throw new Error('Unverified energy generator');
   const added=c.energyBonus??0;
   if(!Number.isInteger(added)||added<0)throw new Error('Invalid temporary energy gain');
   // TTG-1-024 Reite gains +1 while an owned GUNMEN card is present.
   const gunmenPresent=[...(pl.front||[]),...(pl.energy||[])].filter(Boolean)
     .some(other=>(TTG_BY_ID[other.cardId]?.traits||[]).some(t=>String(t).includes('ガンメン')));
   const reite=c.cardId==='TTG-1-024'&&gunmenPresent?1:0;
   // TTG-1-034 produces +1 for EACH facedown card below the field.
   const facedown=c.cardId==='TTG-1-034'?(c.under||[]).filter(x=>x.faceDown).length:0;
   energy[color]+=base+added+reite+facedown+red060ExtraEnergy(state,player,c)+(c.ready&&bonusWhileActive.has(c.cardId)?1:0);
  }
 }
 const scale=2**doubles;
 return Object.fromEntries(Object.entries(energy).map(([color,n])=>[color,n*scale]));
}
export function withTtgDerivedEnergy(state,player){
 // Explicit opt in: upstream matches using their own energy calculator
 // remain unchanged. Do not trust prior cached energy values in derive mode.
 if(state?.energyMode!=='derive')return state;
 const result=structuredClone(state);
 result.players[player].energyProduced=calculateTtgEnergyByColor(result,player);
 return result;
}
