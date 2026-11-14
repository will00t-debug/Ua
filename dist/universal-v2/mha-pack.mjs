// Battle pack for My Hero Academia cards whose program says ready.
// UA10ST and UA10BT share eight card numbers. Each number enters once.
// The catalog never makes a card playable. Official matches stay closed.
import {createUniversalPack} from './pack.mjs';
import {mhaEditorCards} from '../mha/catalog.mjs';
import {MHA_UA10ST_PROGRAMS} from './mha/programs.mjs';
import {MHA_PROGRAMS_001_050} from './mha/programs-001-050.mjs';
import {MHA_PROGRAMS_051_100} from './mha/programs-051-100.mjs';

const PROGRAM_KEYS=new Set([
 'ready','implementation','effects','mainAbility','notes','activeExtraEnergy','step',
 'impactNull','opponentFieldColorsHandEnergyDiscount','printedHandEnergyDiscount',
 'blockBpRestriction','triggerEffect','enterAlwaysActive','passiveBonuses',
 'raidName','printedImpact','printedAttackDamage','ownTurnBp','unblockedAttack',
 'printedMains'
]);
const BATTLE_KEYS=[
 'effects','mainAbility','activeExtraEnergy','step','impactNull',
 'opponentFieldColorsHandEnergyDiscount','printedHandEnergyDiscount',
 'blockBpRestriction','triggerEffect','enterAlwaysActive','passiveBonuses',
 'raidName','printedImpact','printedAttackDamage','ownTurnBp','unblockedAttack',
 'printedMains'
];
export const MHA_OFFICIAL_MATCH_CLOSED='我的英雄學院尚未開放正式對戰。';

function serial(id){
 const match=/^MHA-1-(\d{3})$/.exec(id);
 return match?Number(match[1]):0;
}

export function mhaProgramFor(id){
 const n=serial(id);
 let program=null;
 if(n>=1&&n<=50)program=MHA_PROGRAMS_001_050[id]||null;
 else if(n>=51&&n<=100)program=MHA_PROGRAMS_051_100[id]||null;
 else if(n>=101&&n<=109)program=MHA_UA10ST_PROGRAMS[id]||null;
 if(!program&&MHA_UA10ST_PROGRAMS[id]?.ready===true)program=MHA_UA10ST_PROGRAMS[id];
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
 for(const key of BATTLE_KEYS){
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
 const seen=new Set();
 for(const card of mhaEditorCards()){
  if(seen.has(card.id))throw Error('Duplicate MHA battle id '+card.id);
  seen.add(card.id);
  const battle=mhaBattleCard(card,mhaProgramFor(card.id));
  if(battle)ready.push(battle);
 }
 if(!ready.length)throw Error('MHA has no ready card');
 const ids=ready.map(card=>card.id);
 return createUniversalPack({
  id:'mha',version:'mha-ua10-ready-'+ids.length,cards:ready
 });
}
