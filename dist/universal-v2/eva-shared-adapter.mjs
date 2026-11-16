// EVA -> Universal V2 adapter. Shared ability DSL only.
// Title data is converted here. There is no second EVA effects engine.
import {createUniversalPack} from './pack.mjs';
import {evaSharedProgram} from './eva/programs.mjs';

const SHARED_KEYS=new Set([
 'ready','implementation','effects','mainAbility','activeExtraEnergy','impactNull',
 'step','opponentFieldColorsHandEnergyDiscount','ownTurnBp','triggerEffect',
 'emptyOwnFieldHandEnergyDiscount','passiveBonuses','handOutsideEnergyDiscount',
 'handApDiscountWhileAnyNames','raidName','readyOnBlockCount','printedImpact',
 'lifeLeave','outsideActivate','oppTurnWard','outsideCountGrants','energyWakeNamed',
 'playRequiresNameOrIncludes','phaseEffects','bpPerDirectFacedown','raidBaseNames',
 'printedAttackDamage'
]);
const PRINT_TYPES=new Set(['character','event','field']);
const COLORS=new Set(['blue','purple','red','green','yellow']);

export function evaSharedCard(card,program=evaSharedProgram(card)){
 if(program?.ready!==true)return null;
 if(!card||card.title!=='eva'||card.deckLegal!==true||card.battleReady!==false||
    card.cardDataVerified!==false)
  throw Error((card?.id||'unknown')+' source catalog must not claim battle readiness');
 if(!PRINT_TYPES.has(card.type)||!COLORS.has(card.color))
  throw Error(card.id+' invalid source type or color');
 if(typeof card.nameJa!=='string'||!card.nameJa.trim()||
    typeof card.effectJa!=='string'||!card.effectJa||
    !card.source?.startsWith('https://www.unionarena-tcg.com/jp/cardlist/'))
  throw Error(card.id+' requires the official Japanese printed card');
 if(program.implementation!=='vanilla'&&program.implementation!=='dsl')
  throw Error(card.id+' must provide Universal V2 DSL or vanilla');
 const printed=card.effectJa!=='-'&&card.effectJa!=='';
 if(!printed&&program.implementation!=='vanilla')
  throw Error(card.id+' no-effect print must use vanilla');
 if(printed&&program.implementation==='vanilla')
  throw Error(card.id+' printed effects cannot be vanilla');
 for(const key of Object.keys(program)){
  if(!SHARED_KEYS.has(key))throw Error(card.id+' unsupported EVA program field '+key);
 }
 const {ready,implementation,...shared}=program;
 return Object.freeze({
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:[...(card.traits||[])],implementation,effects:{},...shared
 });
}

export function createEvaSharedStagingPack({cards,version}){
 if(!Array.isArray(cards)||typeof version!=='string')
  throw Error('EVA staging requires source cards and a version');
 const seen=new Set();
 const ready=[];
 for(const card of cards){
  if(seen.has(card.id))throw Error('Duplicate EVA numbered card '+card.id);
  seen.add(card.id);
  const compiled=evaSharedCard(card);
  if(compiled)ready.push(compiled);
 }
 if(!ready.length)throw Error('No verified EVA programs');
 return createUniversalPack({id:'eva',version,cards:ready});
}
