// Single V2 reducer, seven real-only 50-card presets across all FIVE titles.
// No synthetic cards, AP/alternate arts, legacy reducers or unsupported flags.
// Only use title registry source-pinned V2 profiles, never legacy auto values.
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck}
 from './verified-real-decks.mjs';
import {verifiedSaoV2RealDeck,verifiedMstV2RealDeck,verifiedMstV2RoxyFieldDeck}
 from './sao-mst-real-decks.mjs';
import {requireRegisteredV2TitlePack} from './title-packs/registry.mjs';
import {validateUniversalDeck} from './pack.mjs';

// Same full-real printed green list independently exercised by V2-B QA.
export const BLEACH_GREEN_V2_COUNTS=Object.freeze({
 'BLC-1-067':4,'BLC-1-068':4,'BLC-1-071':4,'BLC-1-072':4,
 'BLC-1-075':4,'BLC-1-082':4,'BLC-1-086':4,'BLC-1-089':4,
 'BLC-1-090':4,'BLC-1-094':4,'BLC-1-097':4,'BLC-4-061':4,
 'BLC-1-100':2
});

// 11 official non-SPECIAL IDs x4 plus AP-restoration FINAL x2 and
// both purple/green SPECIAL event prints x2 each = 50.
export const SLG_V2_COUNTS=Object.freeze({
 'SLG-1-005':4,'SLG-1-006':4,'SLG-1-015':4,'SLG-1-016':4,
 'SLG-1-026':4,'SLG-1-041':4,'SLG-1-043':4,'SLG-1-045':4,
 'SLG-1-052':4,'SLG-1-066':4,'SLG-1-068':4,
 'SLG-1-038':2,'SLG-1-040':2,'SLG-1-076':2
});
function strictDeck(title,counts){
 const pack=requireRegisteredV2TitlePack(title),deck={...counts};
 if(Object.keys(deck).some(id=>/TEST|FILLER|(^|-)AP\d*/i.test(id)||
  !Object.prototype.hasOwnProperty.call(pack.cards,id)))
  throw Error(title+' private preset contains unregistered or synthetic card');
 const problems=validateUniversalDeck(pack,deck);
 if(problems.length)throw Error(title+' private preset invalid: '+problems.join('; '));
 return Object.freeze({pack,counts:Object.freeze(deck)});
}
export function createAllV2PreviewRealDecks(){
 const decks={
  'bleach-purple':verifiedBleachPurplePilotDeck(),
  'bleach-green':strictDeck('bleach',BLEACH_GREEN_V2_COUNTS),
  'gurren-lagann-red':verifiedTtgRedPilotDeck(),
  'solo-leveling':strictDeck('solo-leveling',SLG_V2_COUNTS),
  'sword-art-online':verifiedSaoV2RealDeck(),
  'mushoku-tensei':verifiedMstV2RealDeck(),
  'mushoku-tensei-roxy-field':verifiedMstV2RoxyFieldDeck()
 };
 for(const [key,{pack,counts}] of Object.entries(decks)){
  if(Object.values(counts).reduce((n,v)=>n+v,0)!==50||
   Object.keys(counts).some(id=>!pack.cards[id]))
   throw Error(key+' is not a 50-card all-real V2 pack preset');
 }
 return Object.freeze(decks);
}
