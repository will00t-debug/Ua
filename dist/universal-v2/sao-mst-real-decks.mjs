// [V2-D] Decks with only official series cards already accepted by V2.
// Japanese official FAQ Q5/Q7/Q8: one printed title, special-trigger limits,
// mixed colors permitted; each printed card ID max four.
// They are engine smoke-test fixtures, NOT competitive lists or FAQ certification.
import {requireRegisteredV2TitlePack} from './title-packs/registry.mjs';
import {validateUniversalDeck} from './pack.mjs';
import {MST_V2_OFFICIAL_LIMITS} from './sources/mst-inventory.mjs';

export const SAO_V2_REAL_DECK_COUNTS=Object.freeze({
 'SAO-1-035':4,'SAO-1-039':4,'SAO-1-054':4,'SAO-1-058':4,
 'SAO-1-102':4,'SAO-1-106':4,'SAO-1-061':4,'SAO-1-055':4,
 'SAO-1-046':4,'SAO-1-042':4,
 'SAO-1-019':4,'SAO-1-023':4,'SAO-1-001':2
});
export const MST_V2_REAL_DECK_COUNTS=Object.freeze({
 'MST-1-001':4,'MST-1-002':4,'MST-1-020':4,'MST-1-027':4,
 'MST-1-017':4,'MST-1-022':4,'MST-1-012':4,'MST-1-018':4,
 'MST-1-015':4,'MST-1-029':4,'MST-1-019':4,
 'MST-1-050':4,'MST-1-070':2
});
// Formal 50-card Roxy + Labyrinth City FIELD deck used in full V2 previews.
 // Every included ID is source-pinned in the MST V2 registry. MST-051 x1
 // reflects its effective 2026-10-01 Japanese official copy restriction.
 export const MST_V2_ROXY_FIELD_REAL_DECK_COUNTS=Object.freeze({
  'MST-1-050':4,'MST-1-051':1,'MST-1-054':4,'MST-1-075':4,
  'MST-1-055':4,'MST-1-057':4,'MST-1-061':4,'MST-1-063':4,
  'MST-1-070':4,'MST-1-069':4,'MST-1-047':4,'MST-1-010':4,
  'MST-1-077':4,'MST-1-072':1
 });
 function auditedDeck(title,counts,prefix){
 const pack=requireRegisteredV2TitlePack(title);
 const cardIds=Object.keys(counts);
 if(!cardIds.length||cardIds.some(id=>!id.startsWith(prefix)||
   /TEST|FILLER|AP-?/i.test(id)||!pack.cards[id]))
  throw Error('V2-D deck includes unregistered, fabricated or non-title cards');
 const errors=validateUniversalDeck(pack,counts);
 if(errors.length)throw Error('V2-D '+title+' invalid deck: '+errors.join('; '));
 if(Object.values(counts).reduce((sum,n)=>sum+n,0)!==50)
  throw Error(title+' is not 50 physical cards');
 for(const [id,limit] of Object.entries(MST_V2_OFFICIAL_LIMITS))
  if((counts[id]||0)>limit.maxCopies)
   throw Error(id+' exceeds currently official 1-copy restriction');
 return Object.freeze({pack,counts:Object.freeze({...counts})});
}
export function verifiedSaoV2RealDeck(){
 return auditedDeck('sword-art-online',SAO_V2_REAL_DECK_COUNTS,'SAO-');
}
export function verifiedMstV2RoxyFieldDeck(){
 return auditedDeck('mushoku-tensei',MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,'MST-');
}
export function verifiedMstV2RealDeck(){
 return auditedDeck('mushoku-tensei',MST_V2_REAL_DECK_COUNTS,'MST-');
}
