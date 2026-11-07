// Kamen Rider continuous numbers. The engine calls these while measuring
// BP, energy, attack damage and Impact. This file does not import the engine.
// Registration is not an official FAQ certification.
import {cardHasTrait} from './field-conditions.mjs';

const INTEL='飛電インテリジェンス';
const AIMS='A.I.M.S. SQUAD';
const METSUBOU='滅亡迅雷.net';
const OUTSIDE_TRAITS=new Set([INTEL,AIMS,METSUBOU]);

export function kmrRaided(printed,c){
 return !!printed?.raidName&&(c?.stack||[]).some(x=>x&&x.faceDown!==true);
}
function facedowns(c){return (c?.under||[]).filter(x=>x&&x.faceDown===true);}

export function kmrBp(pack,s,c,printed,suppressed,owner,card){
 if(suppressed||!printed)return 0;
 let n=0;
 if(printed.id==='KMR-1-002'&&s.active===owner&&s.kmrRaidToHand?.[owner]===s.turn)n+=1500;
 if(printed.id==='KMR-1-070'&&s.players[owner].front.some(x=>!x))n+=1000;
 if(printed.id==='KMR-1-084'&&s.active===owner&&s.kmrGearUsed?.[owner]===s.turn)n+=500;
 if(printed.id==='KMR-1-105'&&s.active===owner&&(s.fieldEntryNames?.[owner]?.length||0)>=3)n+=1000;
 if(printed.id==='KMR-1-110'&&s.active===owner)
  n+=500*s.players[owner].outside.filter(x=>String(card(pack,x).name||'').includes('メダル')).length;
 return n;
}
// 4 or more direct facedowns while raided: BP-down immunity is conditional.
export function kmrBpImmune(printed,c,suppressed){
 return !suppressed&&printed?.id==='KMR-1-052'&&kmrRaided(printed,c)&&facedowns(c).length>=4;
}
export function kmrAnchored(pack,s,c,card,silenced){
 const printed=card(pack,c);
 return !silenced(s,c)&&printed.id==='KMR-1-052'&&kmrRaided(printed,c)&&facedowns(c).length>=4;
}
export function kmrEnergyBonus(printed,c,suppressed){
 if(suppressed||printed?.id!=='KMR-1-048')return 0;
 return facedowns(c).length?1:0;
}
export function kmrEnergyCut(pack,s,p,d,zone,card){
 if(zone!=='hand'||d?.id!=='KMR-1-001')return 0;
 const n=s.players[p].outside.filter(c=>card(pack,c).ap===2&&(card(pack,c).traits||[]).length>0).length;
 return n>=2?5:0;
}
export function kmrEntryActive(pack,s,owner,d,card){
 if(d?.id!=='KMR-1-001')return false;
 return s.players[owner].outside.filter(c=>card(pack,c).ap===2&&(card(pack,c).traits||[]).length>0).length>=5;
}
export function kmrAttackDamage(pack,s,c,printed,owner,card,suppressed){
 if(suppressed||!printed)return 0;
 if(printed.id==='KMR-1-020'){
  const names=new Set();
  for(const x of s.players[owner].outside){
   const def=card(pack,x);
   if((def.traits||[]).some(t=>OUTSIDE_TRAITS.has(t)))names.add(def.name);
  }
  if(names.size>=4)return 2;
 }
 if(printed.id==='KMR-1-039'&&kmrRaided(printed,c)&&s.players[owner].hand.length>=7)return 2;
 return 0;
}
export function kmrImpact(pack,s,c,printed,owner,card,suppressed){
 // The own-turn Impact line is printed under the raid frame. Raid is not
 // required. A ready character on this front, including this card, blocks it.
 if(suppressed||printed?.id!=='KMR-1-107'||s.active!==owner)return 0;
 const chars=s.players[owner].front.filter(x=>x&&card(pack,x).type==='character');
 return chars.some(x=>x.ready)?0:1;
}
export function kmrGearTrait(pack,c,card){
 return cardHasTrait(card(pack,c),'ファイズギア');
}
