// Shared deck roles for the live hard policy. Built from the actor's own
// registered list: energy curve, raid bases, raiders and cheap fuel.
// It is not a per-card exception list, and it is never built from the
// opponent's hidden list.
const squash=s=>String(s||'').replace(/\s+/g,'');

export function deckPlan(catalog,counts){
 const rows=[];
 for(const [id,n] of Object.entries(counts||{})){
  const d=catalog?.[id];
  if(!d||!n)continue;
  rows.push({id,n,d});
 }
 const characters=rows.filter(r=>r.d.type==='character');
 const byName=new Map();
 for(const r of characters){
  const name=squash(r.d.name);
  const row=byName.get(name)||{name,copies:0,minEnergy:99,maxBp:0,raid:false,base:false};
  row.copies+=r.n;
  row.minEnergy=Math.min(row.minEnergy,r.d.energy||0);
  row.maxBp=Math.max(row.maxBp,r.d.bp||0);
  if(r.d.raidName)row.raid=true;
  byName.set(name,row);
 }
 const bases=new Set();
 for(const r of characters)if(r.d.raidName)bases.add(squash(r.d.raidName));
 for(const row of byName.values())if(bases.has(row.name))row.base=true;
 const costs=[];
 for(const r of characters)if((r.d.energy||0)>0)for(let i=0;i<r.n;i++)costs.push(r.d.energy);
 costs.sort((a,b)=>a-b);
 const curve=costs.length?Math.max(2,Math.min(5,costs[Math.floor((costs.length-1)*0.8)])):3;
 const colors={};
 for(const r of rows)colors[r.d.color]=(colors[r.d.color]||0)+r.n;
 const color=Object.entries(colors).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
 const keep=new Set([...byName.values()].filter(r=>r.base||r.raid||r.maxBp>=4000).map(r=>r.name));
 const fuel=new Set([...byName.values()].filter(r=>!r.raid&&!r.base&&r.maxBp<=2500&&
  r.minEnergy<=2).map(r=>r.name));
 return {
  curve,color,keep,fuel,hasRaid:bases.size>0,
  // Shared roles, read by the search. Not a per-card script.
  opening:{curve,color,minLowEnergy:2,wantsBase:bases.size>0},
  win:bases.size>0?'raid-then-attack':'attack-after-curve',
  defense:'save-a-blocker-for-critical-damage'
 };
}

// early: energy is still short of this deck's curve, on any turn.
// late: the deck is the clock. mid: the curve is met, so raid or attack.
export function planStage(plan,energy,deck){
 if((deck|0)<16)return 'late';
 if(energy<(plan?.curve??3))return 'early';
 return 'mid';
}

// Empty-board hand cost. Opponent-field, outside and front auras are zero
// before the first play, so they are not part of this number.
function openingPayable(definition,emptyField,othersInHand){
 if(!definition)return null;
 let cut=definition.printedHandEnergyDiscount||0;
 if(emptyField)cut+=definition.emptyOwnFieldHandEnergyDiscount||0;
 cut+=definition.noOwnFieldTypeHandDiscount||0;
 const other=definition.otherHandEnergyDiscount;
 if(other&&othersInHand>=(other.min||0))cut+=other.amount||0;
 return Math.max(0,(definition.energy||0)-cut);
}
// A body that can enter the energy line on the first player's one AP.
function openingEnergyBody(definition){
 return !!definition&&definition.type==='character'&&
  !definition.energyForbidden&&!definition.energyLineForbidden&&!definition.chainRaidOnly&&
  (definition.gen||0)>0&&Number.isInteger(definition.ap)&&definition.ap>=0&&definition.ap<=1;
}
// Own opening hand only. Keep when one native energy-line play generates
// the color that pays a later card in this hand, or when a second 0-cost
// energy body is already there. A 1- or 2-cost character is not that
// resource, and a finisher name is not a reason to keep. `counts` stays in
// the signature so callers can pass the registered list; it is not read.
export function openingKeeps(catalog,counts,hand){
 void counts;
 const cards=(hand||[]).map(card=>catalog?.[card.cardId]).filter(Boolean);
 const others=Math.max(0,cards.length-1);
 for(let i=0;i<cards.length;i++){
  const opener=cards[i];
  if(!openingEnergyBody(opener))continue;
  if(openingPayable(opener,true,others)!==0)continue;
  for(let j=0;j<cards.length;j++){
   if(j===i)continue;
   const next=cards[j];
   if(!next||next.type!=='character'||next.chainRaidOnly)continue;
   const later=openingPayable(next,false,Math.max(0,cards.length-2));
   if(openingEnergyBody(next)&&later===0)return true;
   if(next.color&&next.color===opener.color&&later>=1&&later<=(opener.gen||0))return true;
  }
 }
 return false;
}
