// Experimental all-real BLEACH purple deck for V2 engine smoke tests.
// Every card ID below is a separately allowlisted official BLEACH card.
// This is NOT a tournament deck recommendation or full FAQ certification.
import {verifiedPilotPack} from './real-card-pilots.mjs';
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
 const pack=verifiedPilotPack('bleach');
 const counts={...BLEACH_PURPLE_V2_PILOT_COUNTS};
 const problems=validateUniversalDeck(pack,counts);
 if(problems.length)throw Error('BLEACH real-only V2 pilot deck invalid: '+problems.join('; '));
 if(Object.keys(counts).some(id=>!pack.cards[id]||id.startsWith('TEST-ONLY')))
  throw Error('Pilot deck contains unported or fabricated cards');
 return {pack,counts};
}
