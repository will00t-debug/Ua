// Experimental all-real BLEACH purple deck for V2 engine smoke tests.
// Every card ID below is a separately allowlisted official BLEACH card.
// This is NOT a tournament deck recommendation or full FAQ certification.
import {requireRegisteredV2TitlePack} from './title-packs/registry.mjs';
import {validateUniversalDeck} from './pack.mjs';

// 12 official non-FINAL IDs x 4 = 48, plus 2 official FINAL = 50.
// Excludes non-ported identities, alternative arts, fake filler and AP cards.
export const BLEACH_PURPLE_V2_PILOT_COUNTS=Object.freeze({
 'BLC-1-034':4,'BLC-1-036':4,'BLC-1-039':4,'BLC-1-040':4,
 'BLC-1-045':4,'BLC-1-048':4,'BLC-1-052':4,'BLC-1-057':4,
 'BLC-1-064':4,'BLC-1-102':4,'BLC-1-103':4,'BLC-1-107':4,
 'BLC-1-066':2
});
export function verifiedBleachPurplePilotDeck(){
 const pack=requireRegisteredV2TitlePack('bleach');
 const counts={...BLEACH_PURPLE_V2_PILOT_COUNTS};
 const problems=validateUniversalDeck(pack,counts);
 if(problems.length)throw Error('BLEACH real-only V2 pilot deck invalid: '+problems.join('; '));
 if(Object.keys(counts).some(id=>!pack.cards[id]||id.startsWith('TEST-ONLY')))
  throw Error('Pilot deck contains unported or fabricated cards');
 return {pack,counts};
}


 // Red Dai-Gurren now has 13 genuinely ported non-FINAL printed IDs.
 // 12 x 4 plus 2 copies of 073 = 50, including COLOR 045 x4; no FINAL.
 // The absence of "TEST-ONLY" is enforced by this builder and QA.
export const TTG_RED_V2_PILOT_COUNTS=Object.freeze({
 'TTG-1-042':4,'TTG-1-043':4,'TTG-1-045':4,'TTG-1-046':4,
 'TTG-1-047':4,'TTG-1-049':4,'TTG-1-051':4,'TTG-1-052':4,
 'TTG-1-064':4,'TTG-1-065':4,'TTG-1-066':4,'TTG-1-072':4,
 'TTG-1-073':2
});
export function verifiedTtgRedPilotDeck(){
 const pack=requireRegisteredV2TitlePack('gurren-lagann');
 const counts={...TTG_RED_V2_PILOT_COUNTS};
 const problems=validateUniversalDeck(pack,counts);
 if(problems.length)throw Error('TTG real-only V2 red deck invalid: '+problems.join('; '));
 if(Object.keys(counts).some(id=>!pack.cards[id]||
  pack.cards[id].color!=='red'||id.startsWith('TEST-ONLY')))
  throw Error('TTG deck contains off-title/green/unported/fabricated cards');
 return {pack,counts};
}
