// Japanese-checked standalone staging pack. NOT part of officialV2Pack('rnk'),
// the title registry, editor, AI production pool, or online battle.
import {RNK_CARDS_029_035} from '../rnk/cards-029-035.mjs';
import {RNK_JP_EVIDENCE_029_035} from '../rnk/jp-evidence-029-035.mjs';
import {RNK_PROGRAMS_029_035} from './rnk/programs-029-035.mjs';
import {createUniversalPack} from './pack.mjs';

export function rnkStagedCard(card){
  const program=RNK_PROGRAMS_029_035[card.id];
  if(program?.ready!==true)return null;
  const ja=RNK_JP_EVIDENCE_029_035[card.id];
  if(!ja||ja.print!==card.number||!ja.nameJa||!ja.effectJa||!ja.triggerJa)
    throw Error(card.id+' requires explicit Japanese printed evidence');
  if(ja.effectJa==='-'&&program.implementation!=='vanilla')
    throw Error(card.id+' has no printed main effect');
  if(ja.effectJa!=='-'&&program.implementation!=='dsl')
    throw Error(card.id+' has printed effects and cannot be vanilla');
  if(card.color!=='blue'&&card.color!=='purple')
    throw Error(card.id+' unexpected color');
  if(card.battleReady!==false||card.cardDataVerified!==false)
    throw Error(card.id+' source catalog must not claim battle readiness');
  if((card.id==='RNK-1-031'&&card.type!=='event')||
     (card.id==='RNK-1-035'&&card.type!=='character'))
    throw Error(card.id+' kind changed');
  const {reason,ready,implementation,...programData}=program;
  return Object.freeze({
    id:card.id,
    name:ja.nameJa,
    type:card.type,
    color:card.color,
    energy:card.energy,
    ap:card.ap,
    bp:card.bp,
    gen:card.gen,
    trigger:card.trigger,
    traits:card.traits||[],
    implementation,
    effects:{},
    ...programData
  });
}

export function createRnkStagingPack(){
  const ready=RNK_CARDS_029_035.map(rnkStagedCard).filter(Boolean);
  if(ready.length!==2)throw Error('RNK B first stage must contain only 031 and 035');
  return createUniversalPack({
    id:'rnk',version:'rnk-b-029-035-staging-031-035',cards:ready
  });
}
