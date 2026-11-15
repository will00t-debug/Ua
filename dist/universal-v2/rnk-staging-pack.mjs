// Compatibility facade for initial RNK B-group tests.
// Uses Universal V2 shared pack and shared ops ONLY. Not in production registry.
import {RNK_CARDS_029_035} from '../rnk/cards-029-035.mjs';
import {RNK_JP_EVIDENCE_029_035} from '../rnk/jp-evidence-029-035.mjs';
import {RNK_PROGRAMS_029_035} from './rnk/programs-029-035.mjs';
import {rnkSharedCard,createRnkSharedStagingPack} from './rnk-shared-adapter.mjs';

export function rnkStagedCard(card){
  return rnkSharedCard(card,RNK_PROGRAMS_029_035[card?.id],
    RNK_JP_EVIDENCE_029_035[card?.id]);
}
export function createRnkStagingPack(){
  const pack=createRnkSharedStagingPack({
    cards:RNK_CARDS_029_035,
    programs:RNK_PROGRAMS_029_035,
    evidence:RNK_JP_EVIDENCE_029_035,
    version:'rnk-b-029-035-staging-031-035'
  });
  if(Object.keys(pack.cards).length!==2||
     !pack.cards['RNK-1-031']||!pack.cards['RNK-1-035'])
    throw Error('RNK B initial staging must include exactly verified 031 and 035');
  return pack;
}
