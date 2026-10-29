// Puella Magi Madoka Magica UA31BT and UA31ST. The catalogue holds every
// playable identity. This pack registers only prints whose entire Japanese
// text is a tested program. Partial prints stay in the catalogue. Five-title
// census counts are not changed here. EX16BT shares this pack so the two
// products can be mixed. Set-2 sentences stay in mmm-exedra-pack.mjs.
import {createUniversalPack} from './pack.mjs';
import {MADOKA_CARDS} from '../madoka-cards.mjs';
import {EXEDRA_CARDS} from '../madoka-exedra-cards.mjs';
import {mmmEngineKind} from './mmm-effect-kinds.mjs';
import {exedraPackCard} from './mmm-exedra-pack.mjs';

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
const COLOR_DEPLOY='【カラー】自分の場外から必要エナジーが2以下で消費APが1の紫のキャラカードを1枚自分のフロントLにアクティブで登場させる。';
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
  const rest=['discountImpact','madokaLook'].includes(kind)&&
   card.triggerTextJa===COLOR_REST&&card.color==='yellow';
  const retire=['distinctEnergy','lifeActive'].includes(kind)&&
   card.triggerTextJa===COLOR_RETIRE&&card.color==='red';
  const outside=['devilHomura','mamiFrontBuff'].includes(kind)&&
   card.triggerTextJa===COLOR_DEPLOY&&card.color==='purple';
  if(!rest&&!retire&&!outside)throw Error(card.id+' color trigger is not a registered printed profile');
 }else if(card.trigger==='special'){
  if(!['homuraRetire','madokaRetire','traitRetire','sayakaLifeRetire','kyokoApRetire',
   'frontDoubleCut','tiroFinale','lawOfCycles'].includes(kind)||
   card.triggerTextJa!==SPECIAL)
   throw Error(card.id+' special trigger is not the printed front retirement');
 }else if(card.trigger==='raid'){
  if(!['distinctRetire','homuraRaidLock','mamiRaidBounce','homuraRaidReturn','mamiRaidLook',
   'ultimateRaid','devilFront','nagisaRaid','kyokoLifeAttack','sayakaReenter','madokaKinds'].includes(kind)||
   card.triggerTextJa!==RAID)
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
  'restDraw3','lifeDraw2','sayakaLifeRetire','kyokoApRetire','mamiRestSkip',
  'drawActiveAp','frontImpactDraw','frontDoubleCut','raidGirlSearch',
  'distinctGirlLook','tiroFinale','kyokoSacrifice','lawOfCycles'].includes(kind)&&
  card.type!=='event')
  throw Error(card.id+' this print is an event');
 if(kind==='fieldReturn'&&card.type!=='character')
  throw Error(card.id+' mandatory hand return is the printed character');
 if(['step','impactNull','doubleBlock','bounce','peek','buffOther','buffAny','aliasBuff',
  'enterRetireDraw','deployRedGirl','recoverPurpleGirl','entryOtherImpact','bpActive',
  'lifeActive','removedDraw','removedLook','removedActive',  'namedEnergyCap',
  'homuraRaidLock','mamiRaidBounce','homuraRaidReturn','mamiRaidLook',
  'homuraRemovedImpact','devilHomura','mamiFrontBuff','mermaidWitch',
  'ultimateActive','ultimateRaid','madokaLook','devilFront','nagisaRaid',
  'kyokoLifeAttack','sayakaReenter','homuraTuck','madokaKinds','mamiRaidActive'].includes(kind)&&
  card.type!=='character')
  throw Error(card.id+' this print is a character');
 if(['fieldDiscardDraw','fieldTraitBuff','handOutsideGirl','mamiHouse'].includes(kind)&&card.type!=='field')
  throw Error(card.id+' this print is a field');
 const onPlay=kind==='entryOtherImpact'?[{op:'noteEntryTurn'}]:
  kind==='removedDraw'?[{op:'ifEnteredFromRemoved',then:[{op:'oncePerTurnGate',scope:'name',
   optional:false,then:[{op:'draw',count:1}]}]}]:
  kind==='removedLook'?[{op:'ifEnteredFromRemoved',then:[{op:'inspectTopArrange',count:2,
   toOutside:true,rest:'top'}]}]:
  kind==='removedActive'?[{op:'ifEnteredFromRemoved',then:[{op:'activeOwnOther',optional:true}]}]:
  kind==='frontImpactDraw'?[{op:'frontGrantKit',bp:2000,impactPlus:1,drawIfName:'暁美 ほむら'}]:
  kind==='frontDoubleCut'?[{op:'frontGrantKit',bp:1000,attackTwice:true}]:
  kind==='drawDiscard'?[{op:'drawDiscard',count:1}]:
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
  kind==='namedEnergyCap'?[{op:'deployOwnHandSpecial',type:'character',color:'purple',ap:1,
   trait:null,maxEnergy:1,ready:false,max:1,protectionScope:null,
   names:['暁美 ほむら','鹿目 まどか'],raiseWhenOnlyNames:2}]:
  kind==='homuraRaidLock'?[{op:'deployOwnHandSpecial',type:'character',color:'red',ap:1,
   trait:GIRL,maxEnergy:2,ready:false,max:1,protectionScope:null},
   {op:'forbidAttackOppFrontOne',optional:true,until:'nextOwnTurnStart',
    when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'鹿目 まどか'}}]:
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
  kind==='mamiRestSkip'?[{op:'restOppFrontOne',optional:false,skipWhen:{
   kind:'ownNameAndOutsideEvents',turn:'any',name:'巴 マミ',min:2}}]:
  kind==='drawActiveAp'?[{op:'drawDiscard',count:2,activeApIfDiscardedEvent:true}]:
  kind==='raidGirlSearch'?[{op:'searchTopOneBottomDiscard',count:5,discard:false,
   filter:{field:'type',value:'character'},readyApIfRaidTrait:GIRL}]:
  kind==='handOutsideGirl'?[{op:'discardGate',optional:true,then:[{op:'recoverOutsideOne',
   optional:true,logic:'all',filters:[
    {field:'trait',value:GIRL},
    {field:'printedRequiredEnergyAtMost',value:3},
    {field:'ap',value:1}]}]}]:
  kind==='distinctGirlLook'?[{op:'searchTopUpToTwoBottom',count:5,max:3,rest:'bottom',
   logic:'all',filters:[{field:'trait',value:GIRL}],distinctNames:true}]:
  kind==='mamiRaidBounce'?[{op:'drawDiscard',count:1},
   {op:'bounceOppFrontOneUnderBp',optional:true,perOutsideEvents:1000}]:
  kind==='homuraRaidReturn'?[{op:'drawDiscard',count:2,discardCount:1}]:
  kind==='mamiRaidLook'?[{op:'lookTopDeployRest',count:4,color:'purple',maxEnergy:2,
   ap:1,rest:'bottom',impactTrait:QUINTET,impactOthers:4,impact:1}]:
  kind==='homuraRemovedImpact'?[{op:'optionalRemovedNameSelfGrant',optional:true,
   name:'アルティメットまどか',bp:1000,impact:1}]:
  kind==='devilHomura'?[{op:'enemyBpDown',bp:1000,optional:true,when:{
   kind:'ownNameExists',turn:'any',zone:'energy',excludeSelf:false,name:'鹿目 まどか'}}]:
  kind==='tiroFinale'?[{op:'restSkipOrMayRetire',bp:5000,mayRetireIfName:'巴 マミ'}]:
  kind==='kyokoSacrifice'?[{op:'retireNamedThenDraw',name:'佐倉 杏子',draw:2}]:
  kind==='ultimateActive'||kind==='ultimateRaid'?[{op:'removeOutsideUpTo',count:2,cardType:'character'},
   ...(kind==='ultimateRaid'?[{op:'noteNextRemovedApCut',amount:1}]:[])]:
  kind==='madokaLook'?[{op:'inspectTopCharacterOutside',count:4}]:
  kind==='lawOfCycles'?[{op:'removeFrontWithSelf',bp:5000}]:
  kind==='devilFront'?[{op:'bounceNamedFrontCut',name:'鹿目 まどか',bp:3000,raised:4000,
   names:['暁美 ほむら','鹿目 まどか']}]:
  kind==='homuraTuck'?[{op:'tuckNamedDrawDeploy',name:'鹿目 まどか',color:'red',
   trait:GIRL,maxEnergy:4,ap:1}]:
  kind==='mamiRaidActive'?[{op:'noteNextHandEventApCut',maxEnergy:3,amount:1}]:
  null;
 const parts=card.traits.length===1?card.traits[0].split(/[／/]/).map(x=>x.trim()).filter(Boolean):[];
 return {
  id:card.id,name:card.nameJa,color:card.color,type:card.type,
  energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,
  traits:card.traits,
  ...(parts.length>1?{traitComponents:parts}:{}),
  implementation:kind==='plain'?'vanilla':'dsl',
  effects:kind==='homuraRemovedImpact'?{onAttack:onPlay}:
   kind==='devilHomura'?{onAttack:onPlay}:
   kind==='homuraRaidReturn'?{onPlay,onRetire:[{op:'returnOwnRaidBase',optional:true,
   when:{kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:false,name:'鹿目 まどか'}}]}:
   kind==='fieldReturn'?{onRetire:[{op:'returnRetiredToHand',optional:false}]}:
   kind==='madokaRecover'?{onRetire:[{op:'recoverOutsideNamedEnergy',name:'鹿目 まどか',
    maxEnergy:2,optional:true}]}:
   kind==='ultimateActive'?{onPlay,onRetire:[{op:'retireSelfRemovedRestPair',color:'yellow',
    ap:1,maxEnergy:3,trait:GIRL,excludeName:'鹿目 まどか',max:2}]}:
   kind==='ultimateRaid'?{onPlay,onRetire:[{op:'retireSelfToRemoved'}]}:
   kind==='nagisaRaid'?{onAttack:[{op:'revealTopNameOrTrait',name:'百江 なぎさ',trait:QUINTET}]}:
   kind==='kyokoLifeAttack'?{onAttack:[{op:'buffOwnField',
    filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false}]}:
   onPlay?{onPlay}:{},
  ...(kind==='impactNull'||kind==='removedActive'?{impactNull:true}:{}),
  ...(kind==='removedDraw'?{ownTurnBp:1000}:{}),
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
  ...(kind==='devilHomura'?{nameAliases:['暁美 ほむら'],mainAbility:{
   op:'energySwapOwnFront',line:'energy',oncePerTurn:true,name:'鹿目 まどか'}}:{}),
  ...(['devilHomura','mamiFrontBuff'].includes(kind)?{triggerEffect:{
   op:'deployOutsideCharacter',color:'purple',maxEnergy:2,ap:1,frontOnly:true}}:{}),
  ...(kind==='mamiFrontBuff'?{mainAbility:{
   op:'frontActiveOnceNameOrTrait',frontOnly:true,oncePerTurn:true,requiresActive:true,
   name:'百江 なぎさ',trait:QUINTET,bp:1000}}:{}),
  ...(kind==='mermaidWitch'?{nameAliases:['美樹 さやか'],raidName:'美樹 さやか',
   printedAttackDamage:2,playLifeAtMost:4,
   blockBpRestriction:{relation:'atMost',bp:2000,condition:null}}:{}),
  ...(OPP_COLORS[kind]?{opponentFieldColorsHandEnergyDiscount:{colors:OPP_COLORS[kind],amount:1}}:{}),
  ...(kind==='discountImpact'?{outsideEventHandEnergyDiscount:{min:4,amount:5},printedImpact:1,
   triggerEffect:{op:'restOppFrontSkipNextActive'}}:{}),
  ...(kind==='enterRetireDraw'?{enterAlwaysActive:true,phaseEffects:[{
   phase:'start',edge:'start',turn:'own',then:[{op:'retireSelfAtOwnStart'}]}]}:{}),
  ...(['homuraRetire','madokaRetire','traitRetire','sayakaLifeRetire','kyokoApRetire',
   'frontDoubleCut','tiroFinale'].includes(kind)?
   {triggerEffect:{op:'retireOppFront'}}:{}),
  ...(kind==='frontDoubleCut'?{playApCutOnChosenName:{name:'暁美 ほむら',amount:1}}:{}),
  ...(kind==='distinctRetire'?{raidName:'鹿目 まどか'}:{}),
  ...(kind==='homuraRaidLock'?{raidName:'暁美 ほむら'}:{}),
  ...(kind==='mamiRaidBounce'?{raidName:'巴 マミ'}:{}),
  ...(kind==='homuraRaidReturn'?{raidName:'暁美 ほむら'}:{}),
  ...(kind==='mamiRaidLook'?{raidName:'巴 マミ'}:{}),
  ...(kind==='ultimateRaid'?{raidName:'鹿目 まどか',frontRemovedUse:{
   trait:GIRL,excludeName:'鹿目 まどか',excludeRaid:true,orName:'円環の理'}}:{}),
  ...(kind==='devilFront'?{raidName:'暁美 ほむら',nameAliases:['暁美 ほむら'],
   frontNameRemoveShield:'悪魔ほむら'}:{}),
  ...(kind==='nagisaRaid'?{raidName:'百江 なぎさ',mainAbility:{
   op:'frontDiscardNameTraitBuff',frontOnly:true,oncePerTurn:true,
   name:'百江 なぎさ',trait:QUINTET,bp:1000}}:{}),
  ...(kind==='kyokoLifeAttack'?{raidName:'佐倉 杏子',lifeToHandDoubleAttack:true}:{}),
  ...(kind==='sayakaReenter'?{raidName:'美樹 さやか',printedImpact:1,impactNull:true,
   mainAbility:{op:'lifeHandReenterGrant',oncePerTurn:true}}:{}),
  ...(kind==='madokaKinds'?{raidName:'鹿目 まどか',girlNameUnblockedDraw:2,passiveBonuses:[{
   condition:{kind:'ownDistinctTraitNames',turn:'own',min:4,zone:'field',excludeSelf:true,trait:GIRL},
   bp:1000,impact:1}]}:{}),
  ...(kind==='mamiRaidActive'?{raidName:'巴 マミ',mainAbility:{
   op:'outsideEventDiscardActive',oncePerTurn:true,min:6}}:{}),
  ...(kind==='entryOtherImpact'?{mainAbility:{
   op:'entryTurnOtherImpact',oncePerTurn:true,amount:1}}:{}),
  ...(kind==='bpActive'?{mainAbility:{
   op:'cardOnceActiveIfBp',scope:'card',minBp:5000}}:{}),
  ...(kind==='fieldDiscardDraw'?{mainAbility:{op:'fieldRestDiscardDraw'}}:{}),
  ...(kind==='fieldTraitBuff'?{enterAlwaysActive:true,mainAbility:{
   op:'fieldRestBuffTrait',trait:GIRL,bp:500}}:{}),
  ...(kind==='mamiRestSkip'||kind==='drawActiveAp'?{handUseOncePerName:true}:{}),
  ...(kind==='lifeActive'?{passiveBonuses:[{
   condition:{kind:'ownLifeAtMost',turn:'own',max:4},bp:500}],
   mainAbility:{op:'lifeToHandThenActive',oncePerTurn:true},
   triggerEffect:{op:'retireOppFrontUnderBp',bp:2500}}:{}),
  ...(kind==='ultimateActive'?{enterAlwaysActive:true,phaseEffects:[{
   phase:'attack',edge:'end',turn:'own',then:[{op:'retireSourceOnPhaseEnd'}]}]}:{}),
  ...(kind==='madokaLook'?{triggerEffect:{op:'restOppFrontSkipNextActive'},
   mainAbility:{op:'restPeekTop'}}:{}),
  ...(kind==='mamiHouse'?{mainAbility:{op:'discardEventNamedEnergy',oncePerTurn:true,
   name:'巴 マミ',color:'yellow',amount:1}}:{}),
  ...(kind==='lawOfCycles'?{playRequiresAnyNames:['鹿目 まどか','アルティメットまどか'],
   triggerEffect:{op:'retireOppFront'}}:{}),
 };
}

export const MADOKA_ENGINE_IDS=Object.freeze(
 MADOKA_CARDS.filter(c=>c.engineKind).map(c=>c.id));

export function createMadokaV2Pack(){
 const set1=MADOKA_CARDS.filter(c=>c.engineKind).map(mmmPackCard);
 const set2=EXEDRA_CARDS.filter(c=>c.engineKind).map(exedraPackCard);
 if(set1.length!==113)throw Error('Madoka set 1 registered count drifted');
 if(set2.length!==73)throw Error('Madoka set 2 registered count drifted');
 return createUniversalPack({
  id:'madoka',version:'mmm-ua31-ex16-20261029',cards:[...set1,...set2]
 });
}
