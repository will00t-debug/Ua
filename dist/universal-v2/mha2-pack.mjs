// One EX06BT battle pack for MHA-2-001 through 073.
// Set 1 stays in createMhaV2Pack. Pending sentences and the three point
// cards stay in the catalog and out of this pack. No second card builder.
import {createUniversalPack} from './pack.mjs';
import {mhaBattleCard} from './mha-pack.mjs';
import {MHA2_CATALOG_001_036,MHA2_CATALOG_037_073,MHA_POINT_CATALOG} from '../mha/catalog.mjs';
import {MHA2_PROGRAMS_001_036} from './mha/programs-mha2-001-036.mjs';
import {MHA2_PROGRAMS_037_073} from './mha/programs-2-037-073.mjs';

const PROGRAMS={...MHA2_PROGRAMS_001_036,...MHA2_PROGRAMS_037_073};

export function mha2ProgramFor(id){
 return PROGRAMS[id]||null;
}

export function mha2ReadyBattleCards(){
 const rows=[...MHA2_CATALOG_001_036,...MHA2_CATALOG_037_073];
 if(rows.length!==73)throw Error('EX06BT catalog must contain 73 cards');
 const ids=rows.map(card=>card.id);
 if(new Set(ids).size!==73)throw Error('duplicate EX06BT battle id');
 if(rows.some(card=>card.id.startsWith('MHA-1-')||card.id.startsWith('MHA-P-')))
  throw Error('set 1 or a point card entered the EX06BT pack');
 if(MHA_POINT_CATALOG.some(card=>ids.includes(card.id)))
  throw Error('a point card entered the EX06BT pack');
 const ready=[];
 for(const card of rows){
  const battle=mhaBattleCard(card,mha2ProgramFor(card.id));
  if(battle)ready.push(battle);
 }
 if(ready.length!==29)throw Error('EX06BT ready count drifted: '+ready.length);
 return ready;
}

export function createMha2Pack(){
 const ready=mha2ReadyBattleCards();
 return createUniversalPack({
  id:'mha',version:'mha2-ex06-ready-'+ready.length,cards:ready
 });
}
