// UA10ST catalog. Official print data only. It does not make a card playable.
import {UA10ST_AP_CARDS,UA10ST_CARDS,UA10ST_PRODUCT} from './ua10st-cards.mjs';

const COLORS=new Set(['purple','yellow','green','blue','red']);
const DECK_TYPES=new Set(['character','event','field']);
const OFFICIAL_IMAGE='https://www.unionarena-tcg.com/jp/images/cardlist/card/UA10ST_MHA-1-';
const OFFICIAL_PAGE='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA10ST%2FMHA-1-';
const EXPECTED=[
 'MHA-1-034','MHA-1-036','MHA-1-041','MHA-1-044','MHA-1-052','MHA-1-057',
 'MHA-1-061','MHA-1-063','MHA-1-065','MHA-1-101','MHA-1-102','MHA-1-103',
 'MHA-1-104','MHA-1-105','MHA-1-106','MHA-1-107','MHA-1-108','MHA-1-109'
];

function requireOfficial(card){
 if(card.battleReady!==false)throw Error(card.id+' is marked battle-ready in the catalog');
 if(card.auto!==false)throw Error(card.id+' is marked auto');
 if(card.playable===true)throw Error(card.id+' cannot be marked implemented in the catalog');
 if(card.title!=='mha'||card.set!=='UA10ST')throw Error(card.id+' is not a UA10ST row');
 if(!card.image.startsWith(OFFICIAL_IMAGE))throw Error(card.id+' image is not an official card image');
 if(!card.source.startsWith(OFFICIAL_PAGE))throw Error(card.id+' source is not an official card page');
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

let cached=null;
export function mhaCatalog(){
 if(cached)return cached;
 const ids=UA10ST_CARDS.map(card=>card.id);
 if(ids.join()!==EXPECTED.join())throw Error('UA10ST deck list does not match the official series');
 const seen=new Set();
 for(const card of [...UA10ST_CARDS,...UA10ST_AP_CARDS]){
  if(seen.has(card.id))throw Error('Duplicate UA10ST id '+card.id);
  seen.add(card.id);
  requireOfficial(card);
 }
 if(UA10ST_PRODUCT.recipe!==null)throw Error('UA10ST copy counts are still unverified');
 cached={
  product:UA10ST_PRODUCT,
  deck:UA10ST_CARDS,
  ap:UA10ST_AP_CARDS,
  all:[...UA10ST_CARDS,...UA10ST_AP_CARDS]
 };
 return cached;
}
