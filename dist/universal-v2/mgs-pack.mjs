// UA42BT / UA42ST 〈物語〉系列 on the shared V2 engine. A catalogue identity
// enters this pack only when the whole Japanese print is one shared program.
// There is no monogatari opcode and no private runtime. The printed card name
// keeps its space. The effect text omits that space, so the compact form is
// an explicit alias, the same way 早川 アキ keeps 早川アキ. Registration is
// not FAQ certification.
import {createUniversalPack} from './pack.mjs?v=20261121mgs2';
import {MGS_CARDS} from '../mgs-cards.mjs?v=20261121mgs2';
import {MGS2_CARDS} from '../mgs-vol2.mjs?v=20261121mgs2';
import {mgsEngineKind} from './mgs-classify.mjs?v=20261121mgs2';
import {mgs2Profile} from './mgs2-classify.mjs?v=20261121mgs2';

const EFFECT_NAMES=new Set([
 '八九寺真宵','千石撫子','忍野忍','忍野扇','戦場ヶ原ひたぎ','斧乃木余接','沼地蠟花','神原駿河','羽川翼',
 '老倉育','阿良々木暦','阿良々木月火','阿良々木火憐'
]);

function printedAliases(card){
 const compact=String(card.nameJa||'').replace(/\s+/g,'');
 const out=[];
 if(compact&&compact!==card.nameJa&&EFFECT_NAMES.has(compact))out.push(compact);
 if(String(card.effectJa||'').startsWith('このカードは〈羽川翼〉としても扱う。')&&!out.includes('羽川翼'))
  out.push('羽川翼');
 return out;
}

function withAliases(row,card){
 const alias=printedAliases(card);
 if(!alias.length)return row;
 return {...row,implementation:'dsl',nameAliases:alias};
}

export function mgsPackCard(card){
 const profile=mgs2Profile(card);
 const kind=profile?.kind||null;
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 if(profile.program){
  const program=profile.program;
  return withAliases({
   id:card.id,name:card.nameJa,color:card.color,type:card.type,
   energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
   traits:card.traits,implementation:'dsl',effects:program.effects||{},
   ...(program.mainAbility?{mainAbility:program.mainAbility}:{}),
   ...(program.passiveBonuses?{passiveBonuses:program.passiveBonuses}:{}),
   ...(profile.triggerEffect?{triggerEffect:profile.triggerEffect}:{}),
   ...(program.impactNull?{impactNull:true}:{}),
   ...(program.step?{step:true}:{}),
   ...(program.phaseEffects?{phaseEffects:program.phaseEffects}:{}),
   ...(program.blockBpRestriction?{blockBpRestriction:program.blockBpRestriction}:{}),
   ...(program.battleLossRestBuff?{battleLossRestBuff:program.battleLossRestBuff}:{}),
   ...(program.cannotMove?{cannotMove:true}:{}),
   ...(program.playOnNamedLine?{playOnNamedLine:program.playOnNamedLine}:{}),
   ...(program.emptyOwnFieldHandEnergyDiscount?{emptyOwnFieldHandEnergyDiscount:program.emptyOwnFieldHandEnergyDiscount}:{}),
   ...(program.outsideAtMost?{outsideAtMost:program.outsideAtMost}:{}),
   ...(program.removedByOwnEffect?{removedByOwnEffect:program.removedByOwnEffect}:{}),
   ...(program.handEnergyPerFrontName?{handEnergyPerFrontName:program.handEnergyPerFrontName}:{}),
   ...(program.enterAlwaysActive?{enterAlwaysActive:true}:{}),
   ...(program.ownTurnBp?{ownTurnBp:program.ownTurnBp}:{}),
   ...(program.raidName?{raidName:program.raidName}:{}),
   ...(program.raidTrait?{raidTrait:program.raidTrait}:{}),
   ...(program.pairedMain?{pairedMain:program.pairedMain}:{}),
   ...(program.blockFloorIfNameLeft?{blockFloorIfNameLeft:program.blockFloorIfNameLeft}:{}),
   ...(program.energyLossSwap?{energyLossSwap:program.energyLossSwap}:{}),
   ...(program.attackEndRestStrip?{attackEndRestStrip:program.attackEndRestStrip}:{}),
   ...(program.allyBattleWin?{allyBattleWin:program.allyBattleWin}:{}),
   ...(program.handApWhileName?{handApWhileName:program.handApWhileName}:{}),
   ...(program.removedPayRetire?{removedPayRetire:program.removedPayRetire}:{}),
   ...(program.attackWinDiscardIfEnergy?{attackWinDiscardIfEnergy:program.attackWinDiscardIfEnergy}:{}),
   ...(program.raidImpact?{raidImpact:program.raidImpact}:{}),
   ...(program.printedImpact?{printedImpact:program.printedImpact}:{}),
   ...(program.bpPerDirectFacedown?{bpPerDirectFacedown:program.bpPerDirectFacedown}:{})
  },card);
 }
 if(kind==='handDiscount'){
  const printed=profile.handDiscount;
  if(JSON.stringify(printed)!==JSON.stringify(card.handDiscount))
   throw Error(card.id+' hand discount drifted from the Japanese print');
 }
 const search=kind==='search'?[{op:'searchTopOneBottomDiscard',count:profile.count,
  ...(profile.filter?{filter:profile.filter}:{}),
  ...(profile.filters?{filters:profile.filters,logic:profile.logic}:{})}]:null;
 const onPlay=kind==='drawDiscard'?[{op:'drawDiscard',count:1}]:
  kind==='buffOther'?[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:true}]:
  kind==='traitBuff'?[{op:'buffOwnField',filter:{field:'trait',value:profile.trait},
   bp:1000,optional:true,excludeSelf:true}]:
  kind==='recoverAp2'?[{op:'recoverAp',count:2}]:
  kind==='bounce'?[{op:'bounceOwnOtherUnderEnergy',energy:1}]:
  kind==='topKeep'?[{op:'inspectTopAnyOutside',count:2,rest:'top'}]:
  kind==='enemyDown'?[{op:'enemyBpDown',bp:1000,optional:true,zone:'front'}]:
  kind==='peekOne'?[{op:'peekTopOrBottom'}]:
  search?search:null;
 const mainAbility=kind==='printedEnergyRetire'?{op:'restSelfGeneratedEnergyRetireEndMain',lines:'field',
  oncePerTurn:true,extraEnergy:1}:null;
 return withAliases({
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  implementation:kind==='plain'&&!profile.triggerEffect?'vanilla':'dsl',
  effects:{...(onPlay?{onPlay}:{})},
  ...(mainAbility?{mainAbility}:{}),
  ...(profile.triggerEffect?{triggerEffect:profile.triggerEffect}:{}),
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='step'?{step:true}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='handDiscount'?{opponentFieldColorsHandEnergyDiscount:card.handDiscount}:{}),
  ...(kind==='raidOnly'&&profile.raidName?{raidName:profile.raidName}:{}),
  ...(kind==='raidOnly'&&profile.raidTrait?{raidTrait:profile.raidTrait}:{})
 },card);
}

export const MGS_ENGINE_IDS=Object.freeze(
 MGS_CARDS.filter(card=>mgsEngineKind(card)).map(card=>card.id));
export const MGS2_ENGINE_IDS=Object.freeze(
 MGS2_CARDS.filter(card=>card.engineKind).map(card=>card.id));

export function createMgsV2Pack(){
 const cards=[...MGS_CARDS,...MGS2_CARDS].filter(card=>card.engineKind).map(mgsPackCard);
 if(cards.length!==MGS_ENGINE_IDS.length+MGS2_ENGINE_IDS.length)
  throw Error('Monogatari registered count drifted');
 if(!cards.length)throw Error('Monogatari shared pack is empty');
 return createUniversalPack({id:'mgs',version:'mgs-ua42-ex18-shared-20261121',cards});
}
