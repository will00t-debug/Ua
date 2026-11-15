// RNK -> Universal V2 adapter. Shared ability DSL only.
// This is deliberately title data conversion, not a second effects engine.
// The official title registry and production pack are not wired in this milestone.
import {createUniversalPack} from './pack.mjs';

// Program keys must represent shared V2 schema fields, never RNK-specific jobs.
// Extend only when a new shared V2 schema feature has a passing regression.
const SHARED_KEYS=new Set([
  'ready','implementation','effects','triggerEffect','mainAbility',
  'raidName','printedImpact','printedAttackDamage','raidImpact','raidAttackDamage',
  'impactNull','raidImpactNull','step','activeExtraEnergy','passiveBonuses',
  'enterAlwaysActive','ownTurnBp','opponentTurnBp','blockBpRestriction',
  'opponentFieldColorsHandEnergyDiscount','printedHandEnergyDiscount',
  'unblockedAttack','attackWinDraw','nameAliases','phaseEffects',
  'printedMains','cannotAttack','battleRemoveInstead','battleLoseToHand',
  'oppEffectLeave','moveTriggers','moveObserver'
]);
const PRINT_TYPES=new Set(['character','event','field']);

export function rnkSharedCard(card,program,japaneseEvidence){
  if(program?.ready!==true)return null;
  if(!card||card.title!=='rnk'||card.deckLegal!==true||
     card.battleReady!==false||card.cardDataVerified!==false)
    throw Error((card?.id||'unknown')+' source catalog must not claim battle readiness');
  if(!PRINT_TYPES.has(card.type)||!['blue','purple','red','green','yellow'].includes(card.color))
    throw Error(card.id+' invalid source type or color');
  if(!japaneseEvidence||
     japaneseEvidence.print!==card.number||
     typeof japaneseEvidence.nameJa!=='string'||!japaneseEvidence.nameJa.trim()||
     typeof japaneseEvidence.effectJa!=='string'||!japaneseEvidence.effectJa||
     typeof japaneseEvidence.triggerJa!=='string'||!japaneseEvidence.triggerJa||
     !japaneseEvidence.sourceJa?.startsWith('https://'))
    throw Error(card.id+' requires complete Japanese printed evidence');
  if(program.implementation!=='vanilla'&&program.implementation!=='dsl')
    throw Error(card.id+' must provide Universal V2 DSL or vanilla');
  if(japaneseEvidence.effectJa==='-'&&program.implementation!=='vanilla')
    throw Error(card.id+' no-effect print must use vanilla');
  if(japaneseEvidence.effectJa!=='-'&&program.implementation==='vanilla')
    throw Error(card.id+' printed effects cannot be vanilla');
  for(const key of Object.keys(program)){
    if(!SHARED_KEYS.has(key))throw Error(card.id+' unsupported RNK program field '+key);
  }
  const {ready,implementation,...shared}=program;
  return Object.freeze({
    id:card.id,name:japaneseEvidence.nameJa,
    color:card.color,type:card.type,energy:card.energy,ap:card.ap,
    bp:card.bp,gen:card.gen,trigger:card.trigger,
    traits:card.traits||[],implementation,effects:{},...shared
  });
}

export function createRnkSharedStagingPack({cards,programs,evidence,version}){
  if(!Array.isArray(cards)||!programs||!evidence||typeof version!=='string')
    throw Error('RNK staging requires source cards, programs, Japanese evidence and version');
  const seen=new Set();
  const ready=[];
  for(const card of cards){
    if(seen.has(card.id))throw Error('Duplicate RNK numbered card '+card.id);
    seen.add(card.id);
    const v2=rnkSharedCard(card,programs[card.id],evidence[card.id]);
    if(v2)ready.push(v2);
  }
  if(!ready.length)throw Error('No verified RNK programs');
  // The central shared schema validates every DSL operation and all print stats.
  return createUniversalPack({id:'rnk',version,cards:ready});
}
