// RNK B 036-042 staging compiles through existing Universal V2.
import {RNK_CARDS_036_042} from '../rnk/cards-036-042.mjs';
import {RNK_JP_EVIDENCE_036_042} from '../rnk/jp-evidence-036-042.mjs';
import {RNK_PROGRAMS_036_042} from './rnk/programs-036-042.mjs';
import {rnkSharedCard,createRnkSharedStagingPack} from './rnk-shared-adapter.mjs';

export function rnkB036Card(card){
  return rnkSharedCard(card,RNK_PROGRAMS_036_042[card?.id],
    RNK_JP_EVIDENCE_036_042[card?.id]);
}
export function createRnkB036StagingPack(){
  const pack=createRnkSharedStagingPack({
    cards:RNK_CARDS_036_042,
    programs:RNK_PROGRAMS_036_042,
    evidence:RNK_JP_EVIDENCE_036_042,
    version:'rnk-b-036-042-staging-036'
  });
  if(Object.keys(pack.cards).length!==1||!pack.cards['RNK-1-036'])
    throw Error('RNK B 036-042 staging must contain only independently verified 036');
  return pack;
}
