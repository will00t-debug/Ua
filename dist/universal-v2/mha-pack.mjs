// Battle pack for My Hero Academia cards whose C-group program is ready.
// The catalog stays battleReady false. Official matches stay closed.
import {createUniversalPack} from './pack.mjs';
import {MHA_CATALOG} from '../mha/catalog.mjs';
import {MHA_PROGRAMS_001_050} from './mha/programs-001-050.mjs';

const PROGRAM_KEYS=new Set([
 'ready','implementation','effects','impactNull','step','activeExtraEnergy',
 'opponentFieldColorsHandEnergyDiscount','printedHandEnergyDiscount',
 'blockBpRestriction','triggerEffect'
]);
export const MHA_OFFICIAL_MATCH_CLOSED='我的英雄學院尚未開放正式對戰。';

export function mhaProgramFor(id){
 if(!/^MHA-1-(0[0-4][0-9]|050)$/.test(id))return null;
 const program=MHA_PROGRAMS_001_050[id]||null;
 if(!program)return null;
 for(const key of Object.keys(program)){
  if(!PROGRAM_KEYS.has(key))
   throw Error(id+' program field '+key+' needs an A-group request');
 }
 return program;
}

export function mhaBattleCard(card,program){
 if(card.deckLegal!==true||card.battleReady!==false)
  throw Error(card.id+' catalog row cannot enter the battle pack');
 if(program?.ready!==true)return null;
 if(program.implementation!=='dsl'&&program.implementation!=='vanilla')
  throw Error(card.id+' 要進對戰包必須寫 implementation：dsl 或 vanilla');
 const printed=typeof card.effectJa==='string'&&card.effectJa!=='-'&&card.effectJa!=='';
 if(program.implementation==='vanilla'&&printed)
  throw Error(card.id+' 有印刷效果，不能標成 vanilla');
 const extra={implementation:program.implementation};
 for(const key of PROGRAM_KEYS){
  if(key==='ready'||key==='implementation')continue;
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
  effects:{},
  ...extra
 };
}

export function createMhaV2Pack(){
 const cards=[];
 for(const card of MHA_CATALOG){
  const battle=mhaBattleCard(card,mhaProgramFor(card.id));
  if(battle)cards.push(battle);
 }
 if(!cards.length)throw Error('MHA C group has no ready card');
 return createUniversalPack({id:'mha', cards, version:'ua10bt-c-001-050'});
}
