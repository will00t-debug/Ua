// Battle pack for cards whose group program says ready. The catalog itself
// never makes a card playable. An empty program list is a real pack with no
// cards, so a match cannot start.
import {createUniversalPack} from './pack.mjs';
import {imcCatalog} from '../imc/catalog.mjs';
import {IMC_PROGRAMS_001_050} from './imc/programs-001-050.mjs';
import {IMC_PROGRAMS_051_100} from './imc/programs-051-100.mjs';
import {IMC_PROGRAMS_STARTER} from './imc/programs-starter.mjs';
import {imcRange} from './imc-runtime.mjs';

const PROGRAM_KEYS=new Set([
 'ready','implementation','effects','mainAbility','nameActive','triggerEffect','raidName','impactNull',
 'printedImpact','nameAliases','step','run','notes',
 'activeExtraEnergy','ownTurnBp','opponentTurnBp','emptyOwnFieldHandEnergyDiscount',
 'enterAlwaysActive','readyOnBlockCount','unblockedAttack','frontForbidden','blockBpRestriction',
 'passiveBonuses','handApDiscountWhileAllNames','bpGainFollow','ownEffectPresenceBp',
 'altMainAbility','moveTriggers','attackLoseActiveOnce','cannotAttack','attackWinDraw','phaseEffects'
]);
export const IMC_OFFICIAL_MATCH_CLOSED='偶像大師灰姑娘女孩尚未開放正式對戰。';

function programs(){
 return {
  ...IMC_PROGRAMS_001_050,
  ...IMC_PROGRAMS_051_100,
  ...IMC_PROGRAMS_STARTER
 };
}

export function imcProgramFor(id){
 const program=programs()[id]||null;
 if(!program)return null;
 const range=imcRange(id);
 const owner=range==='b'?'001-050':range==='c'?'051-100':range==='d'?'starter':null;
 if(!owner)throw Error(id+' cannot take an IMC program');
 for(const key of Object.keys(program)){
  if(!PROGRAM_KEYS.has(key))
   throw Error(id+' program field '+key+' needs an A-group request');
 }
 return program;
}

export function imcBattleCard(card,program){
 if(card.deckLegal!==true||card.battleReady!==false)
  throw Error(card.id+' catalog row cannot enter the battle pack');
 if(program?.ready!==true)return null;
 if(program.implementation!=='dsl'&&program.implementation!=='vanilla')
  throw Error(card.id+' 要進對戰包必須寫 implementation：dsl 或 vanilla');
 const printed=typeof card.effectJa==='string'&&card.effectJa!=='-'&&card.effectJa!=='';
 if(program.implementation==='vanilla'&&printed)
  throw Error(card.id+' 有印刷效果，不能標成 vanilla');
 const extra={implementation:program.implementation};
 for(const key of ['effects','mainAbility','nameActive','triggerEffect','raidName','impactNull','printedImpact','nameAliases','step',
  'activeExtraEnergy','ownTurnBp','opponentTurnBp','emptyOwnFieldHandEnergyDiscount',
  'enterAlwaysActive','readyOnBlockCount','unblockedAttack','frontForbidden','blockBpRestriction',
  'passiveBonuses','handApDiscountWhileAllNames','bpGainFollow','ownEffectPresenceBp',
  'altMainAbility','moveTriggers','attackLoseActiveOnce','cannotAttack','attackWinDraw','phaseEffects']){
  if(program[key]!==undefined)extra[key]=program[key];
 }
 return {
  id:card.id,
  name:card.nameJa,
  color:card.color,
  type:card.type,
  energy:card.energy,
  ap:card.ap,
  bp:card.bp,
  gen:card.gen,
  trigger:card.trigger,
  traits:card.traits||[],
  ...(card.traitComponents?{traitComponents:card.traitComponents}:{}),
  effects:{},
  ...extra
 };
}

export function createImcV2Pack(){
 const ready=[];
 for(const card of imcCatalog().deck){
  const program=imcProgramFor(card.id);
  if(!program||program.ready!==true)continue;
  ready.push(imcBattleCard(card,program));
 }
 const ids=ready.map(card=>card.id);
 const version='imc-ua55-'+(ids.length?ids.join('.'):'none');
 if(!ready.length){
  return Object.freeze({
   kind:'ua-v2-pack',id:'imc',version,restrictColors:false,
   cards:Object.freeze({})
  });
 }
 return createUniversalPack({id:'imc',version,cards:ready});
}
