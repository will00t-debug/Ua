// D-group battle pack for My Hero Academia UA10BT 051–100.
// The catalog never makes a card playable. Official match entry stays with
// A group: this module is not wired into official-entry.mjs.
import {createUniversalPack} from './pack.mjs';
import {MHA_CARDS_051_100} from '../mha/cards-051-100.mjs';
import {MHA_PROGRAMS_051_100} from './mha/programs-051-100.mjs';

const PROGRAM_KEYS=new Set([
 'ready','implementation','effects','mainAbility','triggerEffect','step',
 'impactNull','activeExtraEnergy','enterAlwaysActive',
 'opponentFieldColorsHandEnergyDiscount','notes'
]);

export const MHA_OFFICIAL_MATCH_CLOSED='我的英雄學院 UA10BT 尚未開放正式對戰。';

export function mhaProgramFor(id){
 const program=MHA_PROGRAMS_051_100[id]||null;
 if(!program)return null;
 const serial=/^MHA-1-(\d{3})$/.exec(id);
 const n=serial?Number(serial[1]):0;
 if(n<51||n>100)throw Error(id+' cannot take a D-group MHA program');
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
 for(const key of ['effects','mainAbility','triggerEffect','step','impactNull',
  'activeExtraEnergy','enterAlwaysActive','opponentFieldColorsHandEnergyDiscount']){
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
 for(const card of MHA_CARDS_051_100){
  const program=mhaProgramFor(card.id);
  if(!program||program.ready!==true)continue;
  ready.push(mhaBattleCard(card,program));
 }
 const ids=ready.map(card=>card.id);
 const version='mha-ua10-051-100-'+(ids.length?ids.join('.'):'none');
 if(!ready.length){
  return Object.freeze({
   kind:'ua-v2-pack',id:'mha',version,restrictColors:false,
   cards:Object.freeze({})
  });
 }
 return createUniversalPack({id:'mha',version,cards:ready});
}
