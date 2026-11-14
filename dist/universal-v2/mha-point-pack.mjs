// Battle pack for the three point-exchange promos once their programs are ready.
// Catalog rows stay battleReady false. This pack is not the 109-card MHA-1
// pack and not the MHA-2 pack.
import {createUniversalPack} from './pack.mjs';
import {UAPR_MHA_POINT_CARDS} from '../mha/uapr-point-cards.mjs';
import {mhaBattleCard} from './mha-pack.mjs';
import {UAPR_MHA_PROGRAMS} from './mha/programs-uapr.mjs';

export function createMhaPointPack(){
 const cards=[];
 for(const row of UAPR_MHA_POINT_CARDS){
  const program=UAPR_MHA_PROGRAMS[row.id];
  if(program?.ready!==true)throw Error(row.id+' is not ready');
  const battle=mhaBattleCard(row,program);
  if(!battle)throw Error(row.id+' did not enter the point pack');
  cards.push(battle);
 }
 if(cards.length!==3)throw Error('point pack must contain 3 cards');
 return createUniversalPack({id:'mha-point',version:'mha-uapr-ready-3',cards});
}
