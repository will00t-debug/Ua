// UA58BT D.Gray-man on the shared V2 engine. Every catalogue identity is a
// whole Japanese print on a shared program. There is no D.Gray-man opcode
// and no private runtime. Registration is not FAQ certification.
import {createUniversalPack} from './pack.mjs?v=20261120dgm2';
import {DGM_CARDS} from '../dgm-cards.mjs?v=20261121nea067068fix1';
import {dgmEngineKind,dgmProfile} from './dgm-classify.mjs?v=20261120dgm2';

export function dgmPackCard(card){
 const profile=dgmProfile(card);
 const kind=profile?.kind||null;
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 if(profile.program){
  const program=profile.program;
  return {
   id:card.id,name:card.nameJa,color:card.color,type:card.type,
   energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
   traits:card.traits,implementation:'dsl',effects:program.effects||{},
   ...(program.mainAbility?{mainAbility:program.mainAbility}:{}),
   ...(program.passiveBonuses?{passiveBonuses:program.passiveBonuses}:{}),
   ...(profile.triggerEffect?{triggerEffect:profile.triggerEffect}:{}),
   ...(program.impactNull?{impactNull:true}:{}),
   ...(program.enterAlwaysActive?{enterAlwaysActive:true}:{}),
   ...(program.playRequiresOwnName?{playRequiresOwnName:program.playRequiresOwnName}:{}),
   ...(program.raidName?{raidName:program.raidName}:{}),
   ...(program.raidOnlyEntry?{raidOnlyEntry:true}:{}),
   ...(program.emptyOwnFieldHandEnergyDiscount?{emptyOwnFieldHandEnergyDiscount:program.emptyOwnFieldHandEnergyDiscount}:{}),
   ...(program.ownTurnBp?{ownTurnBp:program.ownTurnBp}:{}),
   ...(program.unblockedAttack?{unblockedAttack:program.unblockedAttack}:{}),
   ...(program.frontPrintedWard?{frontPrintedWard:program.frontPrintedWard}:{}),
   ...(program.frontNamedLeaveInstead?{frontNamedLeaveInstead:program.frontNamedLeaveInstead}:{}),
   ...(program.outsideUnionPlay?{outsideUnionPlay:program.outsideUnionPlay}:{}),
   ...(program.unraidedReadyOnBlock?{unraidedReadyOnBlock:program.unraidedReadyOnBlock}:{}),
   ...(program.unraidedAttackDamage?{unraidedAttackDamage:program.unraidedAttackDamage}:{}),
   ...(program.raidBanOtherTrait?{raidBanOtherTrait:program.raidBanOtherTrait}:{}),
   ...(program.attackEndProgram?{attackEndProgram:program.attackEndProgram}:{}),
   ...(program.outsideChainRaid?{outsideChainRaid:program.outsideChainRaid}:{}),
   ...(program.unblockedIfName?{unblockedIfName:program.unblockedIfName}:{}),
   ...(program.phaseEffects?{phaseEffects:program.phaseEffects}:{})
  };
 }
 if(kind==='handDiscount'){
  const printed=profile.handDiscount;
  if(JSON.stringify(printed)!==JSON.stringify(card.handDiscount))
   throw Error(card.id+' hand discount drifted from the Japanese print');
 }
 const search=kind==='search'?[{op:'searchTopOneBottomDiscard',count:profile.count,
  ...(profile.filter?{filter:profile.filter}:{}),
  ...(profile.filters?{filters:profile.filters,logic:profile.logic}:{}),
  ...(profile.excludeName?{excludeName:profile.excludeName}:{})}]:null;
 const onPlay=kind==='drawDiscard'?[{op:'drawDiscard',count:1}]:
  kind==='buffOther'?[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true}]:
  kind==='recoverAp2'?[{op:'recoverAp',count:2}]:
  kind==='bounce'?[{op:'bounceOwnOtherUnderEnergy',energy:1}]:
  kind==='topKeep'?[{op:'inspectTopAnyOutside',count:2,rest:'top'}]:
  kind==='alsoTopKeep'?[{op:'inspectTopAnyOutside',count:2,rest:'top'}]:
  kind==='enemyDown'?[{op:'enemyBpDown',bp:1000,optional:true,zone:'front'}]:
  kind==='enemyDownFront1500'?[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'front'}]:
  kind==='enemyDownField1500'?[{op:'enemyBpDown',bp:1000,optional:true,minBp:1500,zone:'field'}]:
  kind==='peekOne'||kind==='alsoPeek'?[{op:'peekTopOrBottom'}]:
  kind==='optionalOppDiscard'?[{op:'discardGate',optional:true,
   then:[{op:'discardOppHand',count:1}]}]:
  kind==='lockMove'?[{op:'grantOppCannotMove',optional:true,zone:'field'}]:
  kind==='draw4'?[{op:'drawDiscard',count:4,discardCount:1}]:
  kind==='yosaku'?[{op:'sumDiscardRecoverMinEnergy',min:20,minEnergy:5}]:
  search?search:null;
 const onAttack=kind==='alsoEnergySumDraw'?[{op:'ifLiveThen',when:{kind:'ownRequiredEnergySumAtLeast',turn:'any',min:20},
  then:[{op:'draw',count:1}]}]:null;
 const mainAbility=kind==='mainDiscardBuff'?{op:'discardHandBuffSelf',oncePerTurn:true,
  discardCount:1,bp:1000}:
  kind==='restReturn'?{op:'restBuffOtherReturnHand',bp:1000,optional:true}:
  kind==='printedEnergyRetire'?{op:'restSelfGeneratedEnergyRetireEndMain',lines:'field',
   oncePerTurn:true,extraEnergy:1}:
  null;
 const passive=kind==='alsoEnergySumBp'?[{condition:{kind:'ownRequiredEnergySumAtLeast',turn:'own',min:15},bp:1000}]:null;
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'&&!profile.triggerEffect?'vanilla':'dsl',
  effects:{...(onPlay?{onPlay}:{}),...(onAttack?{onAttack}:{})},
  ...(mainAbility?{mainAbility}:{}),
  ...(profile.triggerEffect?{triggerEffect:profile.triggerEffect}:{}),
  ...(passive?{passiveBonuses:passive}:{}),
  ...(kind==='alsoPeek'||kind==='alsoTopKeep'||kind==='alsoEnergySumBp'||kind==='alsoEnergySumDraw'||kind==='yosaku'?{alsoRequiredEnergy:5}:{}),
  ...(kind==='impactNull'||kind==='alsoEnergySumBp'?{impactNull:true}:{}),
  ...(kind==='step'?{step:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='printedImpact'?{printedImpact:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{}),
  ...(kind==='raidOnly'&&profile.raidName?{raidName:profile.raidName}:{}),
  ...(kind==='raidOnly'&&profile.raidTrait?{raidTrait:profile.raidTrait}:{})
 };
}

export const DGM_ENGINE_IDS=Object.freeze(
 DGM_CARDS.filter(card=>dgmEngineKind(card)).map(card=>card.id));

export function createDgmV2Pack(){
 const cards=DGM_CARDS.filter(card=>card.engineKind).map(dgmPackCard);
 if(cards.length!==DGM_ENGINE_IDS.length)
  throw Error('D.Gray-man registered count drifted');
 if(!cards.length)throw Error('D.Gray-man shared pack is empty');
 return createUniversalPack({id:'dgm',version:'dgm-ua58-shared-20261120',cards});
}
