// Battle pack for EX06BT MHA-2-001 through 036 whose program says ready.
// Pending cards stay in the catalog and out of this pack. Set 1's 109-card
// pack is not modified here, and 037–073 are not defined here.
import {createUniversalPack} from './pack.mjs';
import {MHA2_CARDS_001_036} from '../mha/cards-mha2-001-036.mjs';
import {MHA2_PROGRAMS_001_036} from './mha/programs-mha2-001-036.mjs';

const BATTLE_KEYS=[
 'effects','mainAbility','activeExtraEnergy','step','impactNull',
 'enterAlwaysActive','passiveBonuses','ownTurnBp'
];

export function mha2BattleCard(card,program){
 if(!program||program.ready!==true)return null;
 if(program.implementation!=='dsl'&&program.implementation!=='vanilla')
  throw Error(card.id+' needs dsl or vanilla');
 const extra={implementation:program.implementation};
 for(const key of BATTLE_KEYS){
  if(program[key]!==undefined)extra[key]=program[key];
 }
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits||[],...extra
 };
}

export function mha2ReadyBattleCards(){
 const ready=[];
 for(const card of MHA2_CARDS_001_036){
  const battle=mha2BattleCard(card,MHA2_PROGRAMS_001_036[card.id]);
  if(battle)ready.push(battle);
 }
 if(!ready.length)throw Error('MHA-2 001-036 has no ready card');
 return ready;
}

export function createMha2Vol2Pack(){
 const ready=mha2ReadyBattleCards();
 return createUniversalPack({
  id:'mha',version:'mha2-ex06-001-036-ready-'+ready.length,cards:ready
 });
}
