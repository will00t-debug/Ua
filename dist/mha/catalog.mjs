// My Hero Academia UA10BT C group. Official rows live in cards-001-050.mjs.
// battleReady stays false. A card enters the battle pack only from a program
// whose ready flag is true after the whole printed sentence passes.
import {MHA_CARDS_001_050} from './cards-001-050.mjs';

const COLORS=new Set(['blue','green','purple','red','yellow']);
const TYPES=new Set(['character','event','field']);

export function mhaCatalog(){
 const cards=MHA_CARDS_001_050.map(card=>({...card}));
 if(cards.length!==50)throw Error('MHA C group must contain UA10BT 001 through 050');
 const ids=cards.map(card=>card.id);
 if(new Set(ids).size!==ids.length)throw Error('duplicate MHA C card');
 cards.forEach((card,index)=>{
  const expected='MHA-1-'+String(index+1).padStart(3,'0');
  if(card.id!==expected||card.set!=='UA10BT'||card.title!=='mha')
   throw Error(card.id+' is outside the C-group UA10BT range');
  if(card.battleReady!==false||card.auto!==false||card.deckLegal!==true)
   throw Error(card.id+' catalog row cannot claim battle support');
  if(!card.nameJa||!card.effectJa||!COLORS.has(card.color)||!TYPES.has(card.type))
   throw Error(card.id+' missing official identity');
  if(!Number.isInteger(card.energy)||card.energy<0||card.energy>8)
   throw Error(card.id+' invalid energy');
  if(!Number.isInteger(card.ap)||card.ap<1||card.ap>2)
   throw Error(card.id+' invalid AP');
  if(!card.image||!card.source||!card.image.includes(card.id.replace('MHA-1-','UA10BT_MHA-1-')))
   throw Error(card.id+' missing official image');
 });
 return Object.freeze(cards.map(card=>Object.freeze(card)));
}

export const MHA_CATALOG=mhaCatalog();
