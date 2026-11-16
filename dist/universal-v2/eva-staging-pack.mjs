// Staging pack for EVA cards whose full Japanese print is an existing shared
// V2 profile. The official battle entry does not import this pack.
import {evaCatalog} from '../eva/catalog.mjs';
import {evaSharedProgram} from './eva/programs.mjs';
import {createEvaSharedStagingPack} from './eva-shared-adapter.mjs';

export const EVA_STAGING_IDS=Object.freeze(evaCatalog().deck
 .filter(card=>evaSharedProgram(card).ready===true)
 .map(card=>card.id));

let cached=null;
export function createEvaStagingPack(){
 if(cached)return cached;
 const pack=createEvaSharedStagingPack({
  cards:evaCatalog().deck,
  version:'eva-ua44-shared-'+EVA_STAGING_IDS.length
 });
 const ids=Object.keys(pack.cards).sort();
 const expected=[...EVA_STAGING_IDS].sort();
 if(JSON.stringify(ids)!==JSON.stringify(expected))
  throw Error('EVA staging included a non-matching card');
 cached=pack;
 return pack;
}
