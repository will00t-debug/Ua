// Puella Magi Madoka Magica UA31BT and UA31ST. The catalogue holds every
// playable identity. This pack registers only prints whose entire Japanese
// text is a tested program. Partial prints stay in the catalogue. Five-title
// census counts are not changed here. EX16BT is a different product.
import {createUniversalPack} from './pack.mjs';
import {MADOKA_CARDS} from '../madoka-cards.mjs';
import {mmmEngineKind} from './mmm-effect-kinds.mjs';

const GIRL='魔法少女';
const QUINTET='ピュエラ・マギ・ホーリー・クインテット';
const STANDARD={
 active:'【アクティブ】自分の場のキャラを1枚選び、アクティブにし、このターン中、BP+3000。',
 draw:'【ドロー】カードを1枚引く。',
 get:'【ゲット】このカードを手札に加える。',
 final:'【ファイナル】自分のライフが無い場合、自分の山札の上から1枚を自分のライフエリアに置く。'
};
const SPECIAL='【スペシャル】相手のフロントLのキャラを1枚選び、退場させる。';
const RAID='【レイド】このカードを手札に加えるか、必要エナジーを満たしている場合、レイドさせる。';
const COLOR_REST='【カラー】相手のフロントLのキャラを1枚選び、レストにする。それは次の1回アクティブにならない。';
const COLOR_RETIRE='【カラー】BP2500以下の相手のフロントLのキャラを1枚選び、退場させる。';
const PIP={yellow:'黄',purple:'紫',red:'赤'};
const OPP_COLORS={
 oppColorsYellow:['purple','red'],
 oppColorsPurple:['yellow','red'],
 oppColorsRed:['yellow','purple']
};

export {mmmEngineKind};

export function mmmPackCard(card){
 const kind=mmmEngineKind(card.effectJa);
 if(kind!==card.engineKind)throw Error(card.id+' engine kind drifted from the Japanese print');
 if(!kind)throw Error(card.id+' is catalogue-only');
 if(card.trigger==null){
  if(card.triggerTextJa!=='-')throw Error(card.id+' missing trigger text');
 }else if(card.trigger==='color'){
  const rest=kind==='discountImpact'&&card.triggerTextJa===COLOR_REST&&card.color==='yellow';
  const retire=kind==='distinctEnergy'&&card.triggerTextJa===COLOR_RETIRE&&card.color==='red';
  if(!rest&&!retire)throw Error(card.id+' color trigger is not a registered printed profile');
 }else if(card.trigger==='special'){
  if(!['homuraRetire','madokaRetire','traitRetire','sayakaLifeRetire','kyokoApRetire'].includes(kind)||
   card.triggerTextJa!==SPECIAL)
   throw Error(card.id+' special trigger is not the printed front retirement');
 }else if(card.trigger==='raid'){
  if(kind!=='distinctRetire'||card.triggerTextJa!==RAID)
   throw Error(card.id+' raid trigger is not the standard printed text');
 }else if(STANDARD[card.trigger]!==card.triggerTextJa)
  throw Error(card.id+' trigger is not the standard printed text');
 const pip=PIP[card.color];
 if(!pip)throw Error(card.id+' is not a yellow, purple, or red Madoka card');
 if(kind==='activeEnergy'&&!card.effectJa.includes('【'+pip+'】'))
  throw Error(card.id+' active energy color drifted');
 if(kind==='restEnergyRetire'&&!card.effectJa.includes('【'+pip+'】'))
  throw Error(card.id+' rest energy color drifted');
 if(kind==='distinctEnergy'&&!card.effectJa.includes('【'+pip+'】'))
  throw Error(card.id+' distinct-name energy color drifted');
 if((kind==='activeEnergy'||kind==='restEnergyRetire')&&card.gen!==0)
  throw Error(card.id+' plus generation is a design mark, not a printed number');
 if(kind==='discountImpact'&&(card.type!=='character'||card.energy<5||card.color!=='yellow'))
  throw Error(card.id+' outside-event discount is not a yellow character of energy 5 or more');
 if(['homuraRetire','madokaRetire','traitRetire','recoverAp2','searchTwoQuintet',
  'restDraw3','lifeDraw2','sayakaLifeRetire','kyokoApRetire'].includes(kind)&&
  card.type!=='event')
  throw Error(card.id+' this print is an event');
 if(kind==='fieldReturn'&&card.type!=='character')
  throw Error(card.id+' mandatory hand return is the printed character');
 if(['step','impactNull','doubleBlock','bounce','peek','buffOther','buffAny','aliasBuff',
  'enterRetireDraw','deployRedGirl','recoverPurpleGirl'].includes(kind)&&card.type!=='character')
  throw Error(card.id+' this print is a character');
 const onPlay=kind==='drawDiscard'?[{op:'drawDiscard',count:1}]:
  kind==='recoverAp2'?[{op:'recoverAp',count:2}]:
  kind==='bounce'?[{op:'bounceOwnOtherUnderEnergy',energy:1}]:
  kind==='peek'?[{op:'peekTopOne'}]:
  kind==='buffOther'||kind==='aliasBuff'?[{op:'buffOwnField',
   filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]:
  kind==='buffAny'?[{op:'buffOwnField',
   filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false}]:
  kind==='searchYellowEvent'?[{op:'searchTopOneBottomDiscard',count:4,
   filter:{field:'colorAndType',value:'yellow:event'}}]:
  kind==='searchUltimateOrGirl'?[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'アルティメットまどか'},{field:'trait',value:GIRL}]}]:
  kind==='searchMadoka'?[{op:'searchTopOneBottomDiscard',count:5,
   filter:{field:'name',value:'鹿目 まどか'}}]:
  kind==='searchNagisaOrQuintet'?[{op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
   {field:'name',value:'百江 なぎさ'},{field:'trait',value:QUINTET}]}]:
  kind==='searchTwoQuintet'?[{op:'searchTopUpToTwoBottom',count:5,max:2,rest:'bottom',
   logic:'any',filters:[{field:'trait',value:QUINTET}]}]:
  kind==='inspectTwo'?[{op:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]:
  kind==='drawIfMadoka'?[{op:'drawIfOwnName',name:'鹿目 まどか',count:1}]:
  kind==='recoverPurpleGirl'?[{op:'recoverOutsideOne',optional:true,logic:'all',filters:[
   {field:'color',value:'purple'},{field:'trait',value:GIRL}]}]:
  kind==='deployRedGirl'?[{op:'deployOwnHandSpecial',type:'character',color:'red',ap:1,
   trait:GIRL,maxEnergy:2,ready:false,max:1,protectionScope:null}]:
  kind==='enterRetireDraw'?[{op:'draw',count:2}]:
  kind==='liveDraw'?[{op:'ifLiveThen',when:{kind:'ownOutsideEventCountAtLeast',turn:'any',min:2},
   then:[{op:'draw',count:1}]}]:
  kind==='homuraRetire'?[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'暁美 ほむら',
   bonusBp:5000,mandatory:true}]:
  kind==='madokaRetire'?[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'鹿目 まどか',
   bonusBp:5000,mandatory:true}]:
  kind==='traitRetire'?[{op:'retireOppFrontUnderBp',mandatory:true,traitPerBp:{
   trait:QUINTET,per:1000,base:2000}}]:
  kind==='distinctRetire'?[{op:'retireOppFrontUnderBp',optional:true,traitNamePerBp:{
   trait:GIRL,per:1000,excludeSelf:true}}]:
  kind==='restDraw3'?[{op:'restNamedActiveFrontThenDraw',draw:3}]:
  kind==='lifeDraw2'?[{op:'optionalOwnLifeToHandThenDraw',then:[{op:'draw',count:2}]}]:
  kind==='excludeGirlSearch'?[{op:'searchTopOneBottomDiscard',count:4,
   filter:{field:'trait',value:GIRL},excludeName:'鹿目 まどか'}]:
  kind==='sayakaLifeRetire'?[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'美樹 さやか',
   bonusBp:5000,bonusLifeAtMost:5,mandatory:true}]:
  kind==='kyokoApRetire'?[{op:'retireOppFrontUnderBp',bp:5000,optional:true}]:
  null;
 const parts=card.traits.length===1?card.traits[0].split(/[／/]/).map(x=>x.trim()).filter(Boolean):[];
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  ...(parts.length>1?{traitComponents:parts}:{}),
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:kind==='fieldReturn'?{onRetire:[{op:'returnRetiredToHand',optional:false}]}:
   kind==='madokaRecover'?{onRetire:[{op:'recoverOutsideNamedEnergy',name:'鹿目 まどか',
    maxEnergy:2,optional:true}]}:
   onPlay?{onPlay}:{},
  ...(kind==='impactNull'?{impactNull:true}:{}),
  ...(kind==='doubleBlock'?{readyOnBlockCount:1}:{}),
  ...(kind==='step'||kind==='lifeBpStep'?{step:true}:{}),
  ...(kind==='lifeBpStep'?{passiveBonuses:[{
   condition:{kind:'ownLifeToHandThisTurn',turn:'own'},bp:1000}]}:{}),
  ...(kind==='kyokoApRetire'?{handApDiscountWhileName:{name:'佐倉 杏子',amount:1}}:{}),
  ...(kind==='activeEnergy'?{activeExtraEnergy:1}:{}),
  ...(kind==='restEnergyRetire'?{mainAbility:{
   op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1}}:{}),
  ...(kind==='outsideEventBp'?{passiveBonuses:[{
   condition:{kind:'ownOutsideEventCountAtLeast',turn:'own',min:2},bp:1000}]}:{}),
  ...(kind==='kyokoBp'?{passiveBonuses:[{
   condition:{kind:'ownNameExists',turn:'own',zone:'field',excludeSelf:false,name:'佐倉 杏子'},
   bp:1000}]}:{}),
  ...(kind==='quintetBp'?{passiveBonuses:[{
   condition:{kind:'ownCardTraitCount',turn:'any',min:4,zone:'field',excludeSelf:true,trait:QUINTET},
   bp:500}]}:{}),
  ...(kind==='distinctEnergy'?{passiveBonuses:[{
   condition:{kind:'ownDistinctTraitNames',turn:'any',min:3,zone:'field',excludeSelf:true,trait:GIRL},
   extraEnergy:1}],triggerEffect:{op:'retireOppFrontUnderBp',bp:2500}}:{}),
  ...(kind==='aliasBuff'?{nameAliases:['百江 なぎさ']}:{}),
  ...(OPP_COLORS[kind]?{opponentFieldColorsHandEnergyDiscount:{colors:OPP_COLORS[kind],amount:1}}:{}),
  ...(kind==='discountImpact'?{outsideEventHandEnergyDiscount:{min:4,amount:5},printedImpact:1,
   triggerEffect:{op:'restOppFrontSkipNextActive'}}:{}),
  ...(kind==='enterRetireDraw'?{enterAlwaysActive:true,phaseEffects:[{
   phase:'start',edge:'start',turn:'own',then:[{op:'retireSelfAtOwnStart'}]}]}:{}),
  ...(['homuraRetire','madokaRetire','traitRetire','sayakaLifeRetire','kyokoApRetire'].includes(kind)?
   {triggerEffect:{op:'retireOppFront'}}:{}),
  ...(kind==='distinctRetire'?{raidName:'鹿目 まどか'}:{})
 };
}

export const MADOKA_ENGINE_IDS=Object.freeze(
 MADOKA_CARDS.filter(c=>c.engineKind).map(c=>c.id));

export function createMadokaV2Pack(){
 const cards=MADOKA_CARDS.filter(c=>c.engineKind).map(mmmPackCard);
 if(cards.length!==75)throw Error('Madoka registered count drifted');
 return createUniversalPack({
  id:'madoka',version:'mmm-ua31-set1-20261029',cards
 });
}
