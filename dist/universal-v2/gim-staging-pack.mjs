// Staging pack for Gakuen Idolmaster cards whose full Japanese print is an
// existing shared V2 profile. Raid-frame cards stay in the catalog until every
// framed keyword is gated. This is not full-set certification.
import {gimCatalog} from '../gim/catalog.mjs?v=20261126gim1';
import {gimSharedProgram} from './gim/programs.mjs?v=20261126gim1';
import {createGimSharedStagingPack} from './gim-shared-adapter.mjs?v=20261126gim1';

export const GIM_STAGING_IDS=Object.freeze(gimCatalog().deck
 .filter(card=>gimSharedProgram(card).ready===true)
 .map(card=>card.id));

let cached=null;
export function createGimStagingPack(){
 if(cached)return cached;
 const pack=createGimSharedStagingPack({
  cards:gimCatalog().deck,
  version:'gim-ua27-shared-'+GIM_STAGING_IDS.length
 });
 const ids=Object.keys(pack.cards).sort();
 const expected=[...GIM_STAGING_IDS].sort();
 if(JSON.stringify(ids)!==JSON.stringify(expected))
  throw Error('Gakuen Idolmaster staging included a non-matching card');
 cached=pack;
 return pack;
}
