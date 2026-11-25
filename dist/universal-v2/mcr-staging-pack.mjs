// Staging pack for Macross cards whose full Japanese print is an existing
// shared V2 profile. Raid-frame cards stay in the catalog until every framed
// keyword is gated. This is not full-set certification.
import {mcrCatalog} from '../mcr/catalog.mjs?v=20261125mcr3';
import {mcrSharedProgram} from './mcr/programs.mjs?v=20261125mcr3';
import {createMcrSharedStagingPack} from './mcr-shared-adapter.mjs?v=20261125mcr3';

export const MCR_STAGING_IDS=Object.freeze(mcrCatalog().deck
 .filter(card=>mcrSharedProgram(card).ready===true)
 .map(card=>card.id));

let cached=null;
export function createMcrStagingPack(){
 if(cached)return cached;
 const pack=createMcrSharedStagingPack({
  cards:mcrCatalog().deck,
  version:'mcr-ua36-shared-'+MCR_STAGING_IDS.length
 });
 const ids=Object.keys(pack.cards).sort();
 const expected=[...MCR_STAGING_IDS].sort();
 if(JSON.stringify(ids)!==JSON.stringify(expected))
  throw Error('Macross staging included a non-matching card');
 cached=pack;
 return pack;
}
