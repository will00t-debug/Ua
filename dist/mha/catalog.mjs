// My Hero Academia catalog. Official print data only.
// UA10ST reprints that use a UA10BT card number stay one id.
// battleReady stays false. A program, not this file, decides the battle pack.
// The starter product page does not list copy counts, so the recipe stays null.
import {UA10ST_AP_CARDS,UA10ST_CARDS,UA10ST_PRODUCT} from './ua10st-cards.mjs';
import {MHA_CARDS_001_050} from './cards-001-050.mjs';
import {MHA_CARDS_051_100} from './cards-051-100.mjs';
import {MHA2_CARDS_037_073} from './cards-2-037-073.mjs';

const COLORS=new Set(['purple','yellow','green','blue','red']);
const DECK_TYPES=new Set(['character','event','field']);
const ST_IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/UA10ST_MHA-1-';
const ST_PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA10ST%2FMHA-1-';
const ST_EXPECTED=[
 'MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052','MHA-1-057',
 'MHA-1-061','MHA-1-063','MHA-1-065','MHA-1-101','MHA-1-102','MHA-1-103',
 'MHA-1-104','MHA-1-105','MHA-1-106','MHA-1-107','MHA-1-108','MHA-1-109'
];
const SHARED_WITH_BOOSTER=[
 'MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052',
 'MHA-1-057','MHA-1-061','MHA-1-063','MHA-1-065'
];

function requireStarter(card){
 if(card.battleReady!==false)throw Error(card.id+' is marked battle-ready in the catalog');
 if(card.auto!==false)throw Error(card.id+' is marked auto');
 if(card.playable===true)throw Error(card.id+' cannot be marked implemented in the catalog');
 if(card.title!=='mha'||card.set!=='UA10ST')throw Error(card.id+' is not a UA10ST row');
 if(!card.image.startsWith(ST_IMAGE))throw Error(card.id+' image is not an official card image');
 if(!card.source.startsWith(ST_PAGE))throw Error(card.id+' source is not an official card page');
 if(card.sourceTc!==null)throw Error(card.id+' Traditional Chinese page was not verified');
 if(!Array.isArray(card.traits)||card.traits.length!==0)throw Error(card.id+' traits were not printed as empty');
 if(card.type==='action-point'){
  if(card.deckLegal!==false||card.effect!==''||card.effectJa!=='-')
   throw Error(card.id+' action-point row is not a deck card');
  return;
 }
 if(card.deckLegal!==true)throw Error(card.id+' deck card is not deck-legal');
 if(!DECK_TYPES.has(card.type))throw Error(card.id+' has a bad card type');
 if(!COLORS.has(card.color))throw Error(card.id+' has no color');
 if(typeof card.effectJa!=='string'||!card.effectJa)throw Error(card.id+' has no Japanese effect text');
 if(typeof card.effect!=='string'||!card.effect)throw Error(card.id+' has no effect text');
 if(typeof card.nameJa!=='string'||!card.nameJa)throw Error(card.id+' has no Japanese name');
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>30)throw Error(card.id+' bad energy');
 if(!Number.isInteger(card.ap)||card.ap<0||card.ap>3)throw Error(card.id+' bad AP');
 if(!Number.isInteger(card.bp)||card.bp<0||card.bp>20000)throw Error(card.id+' bad BP');
 if(!Number.isInteger(card.gen)||card.gen<0||card.gen>3)throw Error(card.id+' bad generated energy');
}

function requireBooster(card,index,start){
 const expected='MHA-1-'+String(start+index).padStart(3,'0');
 if(card.id!==expected||card.set!=='UA10BT'||card.title!=='mha')
  throw Error(card.id+' is outside its UA10BT range');
 if(card.battleReady!==false||card.auto!==false||card.deckLegal!==true||card.playable===true)
  throw Error(card.id+' catalog row cannot claim battle support');
 if(!card.nameJa||!card.effectJa||!COLORS.has(card.color)||!DECK_TYPES.has(card.type))
  throw Error(card.id+' missing official identity');
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>8)
  throw Error(card.id+' invalid energy');
 if(!Number.isInteger(card.ap)||card.ap<1||card.ap>2)
  throw Error(card.id+' invalid AP');
 if(!card.image||!card.source||!card.image.includes(card.id.replace('MHA-1-','UA10BT_MHA-1-')))
  throw Error(card.id+' missing official image');
}

let starterCached=null;
export function mhaCatalog(){
 if(starterCached)return starterCached;
 const ids=UA10ST_CARDS.map(card=>card.id);
 if(ids.join()!==ST_EXPECTED.join())throw Error('UA10ST deck list does not match the official series');
 const seen=new Set();
 for(const card of [...UA10ST_CARDS,...UA10ST_AP_CARDS]){
  if(seen.has(card.id))throw Error('Duplicate UA10ST id '+card.id);
  seen.add(card.id);
  requireStarter(card);
 }
 if(UA10ST_PRODUCT.recipe!==null)throw Error('UA10ST copy counts are still unverified');
 starterCached={
  product:UA10ST_PRODUCT,
  deck:UA10ST_CARDS,
  ap:UA10ST_AP_CARDS,
  all:[...UA10ST_CARDS,...UA10ST_AP_CARDS]
 };
 return starterCached;
}

function boosterRange(cards,start){
 const rows=cards.map(card=>({...card}));
 if(rows.length!==50)throw Error('MHA booster range must contain 50 cards');
 const ids=rows.map(card=>card.id);
 if(new Set(ids).size!==ids.length)throw Error('duplicate MHA booster card');
 rows.forEach((card,index)=>requireBooster(card,index,start));
 return Object.freeze(rows.map(card=>Object.freeze(card)));
}

function requireSet2(card,index){
 const expected='MHA-2-'+String(37+index).padStart(3,'0');
 if(card.id!==expected||card.set!=='EX06BT'||card.title!=='mha')
  throw Error(card.id+' is outside EX06BT 037-073');
 if(card.battleReady!==false||card.auto!==false||card.deckLegal!==true||card.playable===true)
  throw Error(card.id+' catalog row cannot claim battle support');
 if(!card.nameJa||!card.effectJa||!COLORS.has(card.color)||!DECK_TYPES.has(card.type))
  throw Error(card.id+' missing official identity');
 if(!Number.isInteger(card.energy)||card.energy<0||card.energy>8)
  throw Error(card.id+' invalid energy');
 if(!Number.isInteger(card.ap)||card.ap<1||card.ap>2)
  throw Error(card.id+' invalid AP');
 if(!card.image||!card.source||!card.image.includes('EX06BT_'+card.id))
  throw Error(card.id+' missing official image');
 if(card.sourceTc!=='')
  throw Error(card.id+' Traditional Chinese page was not published');
}

function set2Range(cards){
 const rows=cards.map(card=>({...card}));
 if(rows.length!==37)throw Error('EX06BT 037-073 must contain 37 cards');
 const ids=rows.map(card=>card.id);
 if(new Set(ids).size!==ids.length)throw Error('duplicate EX06BT card');
 rows.forEach((card,index)=>requireSet2(card,index));
 return Object.freeze(rows.map(card=>Object.freeze(card)));
}

export const MHA_CATALOG=boosterRange(MHA_CARDS_001_050,1);
export const MHA_CATALOG_051_100=boosterRange(MHA_CARDS_051_100,51);
export const MHA2_CATALOG_037_073=set2Range(MHA2_CARDS_037_073);

export function mhaEditorCards(){
 const booster=[...MHA_CATALOG,...MHA_CATALOG_051_100];
 const boosterIds=new Set(booster.map(card=>card.id));
 if(boosterIds.size!==100)throw Error('UA10BT does not contain 100 distinct ids');
 const shared=UA10ST_CARDS.filter(card=>boosterIds.has(card.id)).map(card=>card.id);
 if(shared.join()!==SHARED_WITH_BOOSTER.join())
  throw Error('UA10ST reprint ids drifted: '+shared.join(','));
 const starterOnly=UA10ST_CARDS.filter(card=>!boosterIds.has(card.id));
 const set2=[...MHA2_CATALOG_037_073];
 const starterNumber=new Map(UA10ST_CARDS.map(card=>[card.id,card.number]));
 const cards=[...booster,...starterOnly,...set2].map(card=>{
  const reprint=starterNumber.get(card.id);
  const aliases=[...(card.aliases||[])];
  if(reprint&&reprint!==card.number&&!aliases.includes(reprint))aliases.push(reprint);
  return {...card,aliases,playable:false,battleReady:false};
 });
 const ids=cards.map(card=>card.id);
 if(new Set(ids).size!==ids.length)throw Error('Duplicate MHA editor id');
 if(cards.length!==109+set2.length)throw Error('MHA editor catalog drifted');
 if(cards.some(card=>card.playable!==false||card.battleReady!==false||card.deckLegal!==true))
  throw Error('MHA editor catalog claimed a card was playable');
 return cards;
}
