// Battle pack for UA10ST cards whose program says ready. The catalog never
// makes a card playable. Pending cards stay out, including their triggers.
import {createUniversalPack} from './pack.mjs';
import {mhaCatalog} from '../mha/catalog.mjs';
import {MHA_UA10ST_PROGRAMS} from './mha/programs.mjs';

const PROGRAM_KEYS=new Set([
 'ready','implementation','effects','mainAbility','notes','activeExtraEnergy','step'
]);

export function mhaProgramFor(id){
 const program=MHA_UA10ST_PROGRAMS[id]||null;
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
 for(const key of ['effects','mainAbility','activeExtraEnergy','step']){
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
 const ready=[];
 for(const card of mhaCatalog().deck){
  const program=mhaProgramFor(card.id);
  if(!program||program.ready!==true)continue;
  const battle=mhaBattleCard(card,program);
  if(battle)ready.push(battle);
 }
 return createUniversalPack({
  id:'mha',version:'v2-ua10st-ready',cards:ready
 });
}
