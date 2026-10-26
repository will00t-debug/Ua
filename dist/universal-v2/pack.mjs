import {validatePrintedPlayFilter} from './ap-discounts.mjs';
// UNION ARENA Universal Rules v2 (experimental; NOT used by Production matches).
import {expandAbilityTemplates} from './ability-templates.mjs';
import {validateCompletedMoveCondition} from './zone-move-events.mjs';
import {validateSelectionHandTaxProfile} from './selection-hand-tax.mjs';
// Data schema and *explicit* ability coverage. No automatic inference from
// Japanese/translated prose and no optimistic `auto:true` for unported cards.
export const V2_PHASES=Object.freeze(['start','move','main','attack']);
export const V2_CARD_TYPES=Object.freeze(['character','event','field']);
export const V2_TRIGGERS=Object.freeze(['draw','get','final','active','special','color','raid']);
export const V2_EFFECT_TIMINGS=Object.freeze(['onPlay','onRaid','onAttack','onRaided','onRetire','onOutsideRecover']);
export const V2_EFFECT_OPS=Object.freeze(['nextEligibleHandPlayApDiscount','draw','drawIfOwnName','drawIfOwnTraitCount','drawIfOwnOutsideNamedCountAtLeast','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','drawIfOppRestCharacter','drawIfOppCharacterBpAtLeast','drawIfOwnNameAndHandFewer','activeOwnNamed','grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','millTop','buffSelf','buffSelfPerOwnOutsideGroups','enemyBpDown','drawDiscard','recoverAp','peekTopOne','peekTopOrBottom','retireOppFrontUnderBp','retireOppFrontOneUnderBp','conditionalBounceOrRetireByOwnOutsideNames','stripOppRaidTop','restOppFrontUnderBp','restOppFrontBpAtLeast','restOppFrontOne','skipNextActiveOppRest','forbidAttackOppFrontOne','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','retireOwnFieldOne','retireOwnCharacterOne','optionalRetireThenProgram','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw','searchDeckMany','discardGate','removeOutsideThen','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','searchTopUpToTwoBottom','enemyFrontAllBpDown','retireOppFrontAllUnderBp','buffOwnTraitAllTurn','buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy','recoverOutsideColorUnderEnergy','recoverOutsideTraitlessUnderEnergy','deployOutsideTraitlessRestOrRaid','deployOutsideRest','deployOutsideNameRest','deployNamedFromZones','payApDeployNamedRest','inspectTopTraitOutside','buffOwnField','oncePerTurnGate','chooseOne','deployOwnHandRest','deployOwnHandSpecial','deployOwnHandRestOrRaid','optionalPayApThen','discardOppHand','retireSourceOnPhaseEnd','activeSelfIf','grantOnAttack','grantSelectionApTaxOwnOtherTrait','grantFrontEnergyOwnOtherFrontTrait','grantOwnFrontChoiceProtection','grantCauseBlockAtMost','handBottomGrantDoubleAttack','payApDeployMovedActive','noteEntryTurn','grantSelfEnergyMoveOnAttackStart','grantSelfTriggerUnchosen','outsideColorEnergyHandOrRest','moveOtherAcrossOrRemove','raidBaseEnergyThen','grantSelfAttackDamageThisTurn','restOppFrontLockActive','removeAnyOutsideScale','inspectTopColoredNamesOutside','drawDiscardIfEffectApPaid','activeSelf','grantSelfImpactThisTurn','grantOwnNameBlockAtLeast','drawIfNameOrDistinctColorNames','inspectTopNamesOutside','grantImpactNullUntilNextOwnStart','buffOtherIfFirstAttack','millUpToThenRecover','removeOppFrontUnderBp','discardUpToThenDraw','searchTopAddOneMillRest','buffDistinctTraitNames','grantFirstAttackUntilNextOwnStart','raidBaseNameThen','grantUnblockedDrawThisTurn','drawIfOwnNameOrRaidBase','replayRaidBase','outsideRecoverOrRestPlay','buffMaxOwnBpImpact','gainSelfEnergyIfAtLeast','grantAllFrontEnergyThisTurn','outsideToDeckTop','recoverNamesThenHandRaidDiscount','buffOwnOtherScaled','mayStepFrontFromEnergy','lookTakeOrdered','facedownEntryScale','maySpendFacedown','galaxyBurstEntry','mayAbsorbFront','simonLowEntry','replayNamedEntry','mayRaidOntoSelf','lagannEntryLadder','drawIfOwnEventUsed','drawIfOppFrontBelowPrinted','drawDiscardIfEveryOwnCharacterNamed','retireOppFrontTiered','restOppFrontByOutsideEvents','searchTopTraitOrEventAp','discountNextNamedHandEnergy','retireOppFrontAtLeastBp','retireOppFrontAtMostBp','retireOppFrontScaledBp','grantHandCharacterBpMay','buffEitherOther','returnPrintedActiveBuff','removeNamedOutsideActive','payHandOrRestForNamed','handTopBuffSelf','optionalRestFrontRecoverAp','drawHandTop','optionalDiscardActiveSelf','deployOwnHandNamedRest','revealTopHandOrAffordableNamed','drawThenPlaceHand','optionalHandOutsideActiveIf','buffNamedImpactDuration','takeTopHandRestOutside','buffEitherField','revealHandBottomOutsideCharacter','restOwnActiveFrontDraw','deployOwnRaidBaseRest','restOrRetireFrontAtMost','peekTopOneIfFieldNames','buffNamedImpactDraw','deployOutsidePrintedRest','grantPrintedBlockAtLeast','moveOppFrontToEnergy','impactIfEveryOwnTraitless','deployOutsidePrintedActive','bounceThenAffordableSubaru','grantBounceInstead','removeOppFieldOne','handOutsideReenterFaceDown','activeOwnTrait','grantOwnOtherTraitImpact','grantOppBlockAtLeast','grantSelfAttackSkipThisTurn','deployOutsideFiltered','ifLiveThen','swapEnergyWithFrontSkip','drawTuckHandUnder','chainRaidHand','retireOppFrontOne','recoverOutsideCharacterUnderEnergy','payApDiscardOutsideRaid','activeOwnTraitLines','activeSkipPair','grantSelfSkipNextActive','replayOnPlay']);
const integer=(v,low=0)=>Number.isInteger(v)&&v>=low;
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
// Shared board predicate used by passive bonuses and on-play ACTIVE.
// The shape is the printed query, never a title-specific reducer.
function assertLiveCondition(q,label){
 if(!q||typeof q!=='object'||Array.isArray(q)||
  !['own','opponent','any'].includes(q.turn)||
  !['outsideCount','ownNameExists','ownNameAbsent','ownNameOrRaidBase','ownFieldHasAllNames','ownTraitCount','ownCardTraitCount','ownEnergyAtLeast','ownHandCountAtLeast','ownLifeAtMost','ownEffectHandOutsideOrRecovery','ownEventUsedThisTurn','ownRetiredThisTurn','retireCountThisTurn','ownOutsideNamedCountAtLeast','ownRestPrintedBpAtMost','oppCharacterBpAtLeast','oppCharacterCurrentBpCount','oppRestCharacter','oppRestCharacterCount','ownPrintedApAtLeast','ownHandToOutsideThisTurn','ownHandFewerThanOpponent','ownEffectApPaidColor','ownNameOrDistinctPrintedColorNames','oppFrontCurrentBpBelowPrinted','ownAnyNameExists','ownNameAndDeckAtMost','ownFrontNoOtherCharacter','otherOwnCharacterRetiredThisTurn','ownPrintedCharacter','ownOutsideEventCountAtLeast','ownDeckCharacterEntryThisTurn','ownNameAndOutsideEvents','ownTurnFacedownUnder','ownDistinctTraitNames','ownRestPrintedBpCount','selfOnField'].includes(q.kind))
  throw Error(label+' invalid passive condition');
 if(q.kind==='ownEventUsedThisTurn'&&q.turn!=='own')
  throw Error(label+' event-use predicate requires own turn');
 if(q.kind==='ownDeckCharacterEntryThisTurn'&&q.turn!=='own')
  throw Error(label+' deck character entry is an own-turn bonus');
 if(q.kind==='ownNameAndOutsideEvents'&&q.turn!=='own')
  throw Error(label+' named character plus outside events is an own-turn bonus');
 if(q.kind==='ownTurnFacedownUnder'&&q.turn!=='own')
  throw Error(label+' facedown under is an own-turn bonus');
 if(q.kind==='ownEffectHandOutsideOrRecovery'&&q.turn!=='own')
  throw Error(label+' invalid effect-zone own-turn condition');
 // turn:'any' is the printed check with no extra turn icon. turn:'own'
 // is the printed 自分のターン中 icon. Opponent turn is not this sentence.
 if(q.kind==='ownHandToOutsideThisTurn'&&q.turn==='opponent')
  throw Error(label+' hand-to-outside history is not an opponent-turn gate');
 const retired=q.kind==='ownRetiredThisTurn';
 const retirementCount=q.kind==='retireCountThisTurn';
 if(retirementCount&&(!['own','opponent','any'].includes(q.controller)||
  !['character','field','any'].includes(q.cardType)||!integer(q.min,1)||q.min>50))
  throw Error(label+' invalid retirement count predicate');
 if(retired&&!['field','character'].includes(q.cardType))
  throw Error(label+' invalid retired-card type');
 const count=['outsideCount','ownTraitCount','ownCardTraitCount','ownEnergyAtLeast','ownHandCountAtLeast','ownOutsideEventCountAtLeast','ownDistinctTraitNames','ownRestPrintedBpCount'].includes(q.kind);
 const paidColor=q.kind==='ownEffectApPaidColor';
 if(paidColor&&!['blue','yellow','green','purple','red'].includes(q.color))
  throw Error(label+' invalid effect-AP color');
 const namedOutside=q.kind==='ownOutsideNamedCountAtLeast';
 const atMost=q.kind==='ownLifeAtMost';
 const restEach=q.kind==='ownRestPrintedBpAtMost';
 const lowRest=q.kind==='ownRestPrintedBpCount';
 const oppBp=q.kind==='oppCharacterBpAtLeast';
 const oppBpCount=q.kind==='oppCharacterCurrentBpCount';
 const oppRest=q.kind==='oppRestCharacter'||q.kind==='oppRestCharacterCount';
 const printedAp=q.kind==='ownPrintedApAtLeast';
 const nameOrKinds=q.kind==='ownNameOrDistinctPrintedColorNames';
 if(nameOrKinds&&q.turn!=='own')
  throw Error(label+' name-or-distinct-kinds bonus is an own-turn gate');
 const belowPrinted=q.kind==='oppFrontCurrentBpBelowPrinted';
 if(belowPrinted&&q.turn!=='own')
  throw Error(label+' printed-BP gap is an own-turn front check');
 const anyNames=q.kind==='ownAnyNameExists';
 const printedChar=q.kind==='ownPrintedCharacter';
 const nameAndEvents=q.kind==='ownNameAndOutsideEvents';
 const field=['ownNameExists','ownNameAbsent','ownNameOrRaidBase','ownFieldHasAllNames','ownTraitCount','ownCardTraitCount','ownDistinctTraitNames','ownRestPrintedBpAtMost','ownRestPrintedBpCount','ownAnyNameExists'].includes(q.kind);
 const nameDeck=q.kind==='ownNameAndDeckAtMost';
 if(nameDeck&&(q.turn!=='own'||!['field','front','energy'].includes(q.zone)||
  typeof q.excludeSelf!=='boolean'||typeof q.name!=='string'||!q.name.trim()||
  q.name.length>80||!integer(q.max)||q.max>50))
  throw Error(label+' invalid name-and-deck condition');
 if((count&&(!integer(q.min,1)||q.min>200))||
  (namedOutside&&(!integer(q.min,1)||q.min>200||
   !Array.isArray(q.names)||q.names.length<1||q.names.length>8||
   q.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   new Set(q.names).size!==q.names.length))||
  (atMost&&(!integer(q.max)||q.max>10))||
  (field&&(!['field','front','energy'].includes(q.zone)||
   typeof q.excludeSelf!=='boolean'))||
  ((q.kind==='ownNameExists'||q.kind==='ownNameAbsent'||q.kind==='ownNameOrRaidBase')&&(!q.name||typeof q.name!=='string'||!q.name.trim()))||
  (q.kind==='ownFieldHasAllNames'&&(!Array.isArray(q.names)||q.names.length<2||q.names.length>8||q.names.some(n=>typeof n!=='string'||!n.trim())||new Set(q.names).size!==q.names.length))||
  ((q.kind==='ownTraitCount'||q.kind==='ownCardTraitCount'||q.kind==='ownDistinctTraitNames'||restEach||lowRest)&&(!q.trait||typeof q.trait!=='string'||!q.trait.trim()))||
  ((restEach||lowRest)&&(!integer(q.maxPrintedBp,0)||q.maxPrintedBp>50000))||
  (oppBp&&(!['field','front','energy'].includes(q.zone)||!integer(q.minBp,1)||q.minBp>50000))||
  (oppBpCount&&(!['field','front','energy'].includes(q.zone)||!integer(q.minBp,1)||q.minBp>50000||
   !integer(q.min,1)||q.min>8))||
  (oppRest&&!['field','front','energy'].includes(q.zone))||
  (printedAp&&(!['field','front','energy'].includes(q.zone)||typeof q.excludeSelf!=='boolean'||
   !integer(q.minAp,1)||q.minAp>3))||
  (nameOrKinds&&(
   !['field','front','energy'].includes(q.zone)||
   typeof q.name!=='string'||!q.name.trim()||q.name.length>80||
   !['red','blue','yellow','green','purple'].includes(q.color)||
   !integer(q.min,2)||q.min>8))||
  (anyNames&&(!Array.isArray(q.names)||q.names.length<2||q.names.length>4||
   q.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   new Set(q.names).size!==q.names.length))||
  (printedChar&&(!['field','front','energy'].includes(q.zone)||typeof q.excludeSelf!=='boolean'||
   typeof q.name!=='string'||!q.name.trim()||q.name.length>80||
   !['blue','yellow','green','purple','red'].includes(q.color)||
   !integer(q.energy)||q.energy>30))||
  (nameAndEvents&&(typeof q.name!=='string'||!q.name.trim()||q.name.length>80||
   !integer(q.min,1)||q.min>200))||
  Object.keys(q).length!==(2+(count?1:0)+(namedOutside?2:0)+(atMost?1:0)+(retired?1:0)+(retirementCount?3:0)+(field?2:0)+(nameDeck?4:0)+(nameAndEvents?2:0)+
   (['ownNameExists','ownNameAbsent','ownNameOrRaidBase','ownFieldHasAllNames','ownTraitCount','ownCardTraitCount','ownDistinctTraitNames','ownRestPrintedBpAtMost','ownRestPrintedBpCount'].includes(q.kind)?1:0)+
   ((restEach||lowRest)?1:0)+(oppBp?2:0)+(oppBpCount?3:0)+(oppRest?1:0)+(printedAp?3:0)+(paidColor?1:0)+(nameOrKinds?4:0)+(anyNames?1:0)+(printedChar?5:0))||
  Object.keys(q).some(k=>!['kind','turn',
   ...(count?['min']:[]),...(namedOutside?['min','names']:[]),...(atMost?['max']:[]),...(retired?['cardType']:[]),...(retirementCount?['controller','cardType','min']:[]),...(field?['zone','excludeSelf']:[]),
   ...(q.kind==='ownNameExists'||q.kind==='ownNameAbsent'||q.kind==='ownNameOrRaidBase'?['name']:[]),
   ...(nameDeck?['zone','excludeSelf','name','max']:[]),
   ...(q.kind==='ownFieldHasAllNames'?['names']:[]),
   ...(q.kind==='ownTraitCount'||q.kind==='ownCardTraitCount'||q.kind==='ownDistinctTraitNames'||restEach||lowRest?['trait']:[]),
   ...((restEach||lowRest)?['maxPrintedBp']:[]),
   ...(oppBp?['zone','minBp']:[]),
   ...(oppBpCount?['zone','minBp','min']:[]),
   ...(oppRest?['zone']:[]),
   ...(printedAp?['zone','excludeSelf','minAp']:[]),
   ...(paidColor?['color']:[]),
   ...(nameOrKinds?['zone','name','color','min']:[]),
   ...(anyNames?['names']:[]),
   ...(printedChar?['zone','excludeSelf','name','color','energy']:[]),
   ...(nameAndEvents?['name','min']:[])].includes(k)))
  throw Error(label+' invalid or cyclic passive condition');
}
function verifyProgram(program,path){
 if(!Array.isArray(program))throw Error(path+' must be an array');
 for(const [i,e] of program.entries()){
  if(!e||typeof e!=='object'||Array.isArray(e)||!V2_EFFECT_OPS.includes(e.op))
   throw Error(path+'['+i+'] effect op unsupported');
  if(['grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn'].includes(e.op)&&
   Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid self timed battle grant');
  if(e.op==='grantSelfMustBlockThisTurn'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid onPlay current-turn mandatory block grant');
  if(e.op==='buffSelfUntilNextOwnStart'&&(
   !integer(e.bp,1)||e.bp>5000||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','bp'].includes(k))))
   throw Error(path+'['+i+'] invalid next-own-start physical BP effect');
  if(e.op==='grantSelfAttackEndSwapThisTurn'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid this-turn source-stamped attack-end swap');
  if(e.op==='draw'){
   if(!integer(e.count,1)||e.count>10)throw Error(path+'['+i+'] invalid count');
   if((e.entry!==undefined&&e.entry!=='ownEffect'&&e.entry!=='ownCharacter')||
    Object.keys(e).some(k=>!['op','count','entry'].includes(k)))
    throw Error(path+'['+i+'] invalid own-effect draw gate');
  }
  if(e.op==='buffSelfPerOwnOutsideGroups'&&(
   !integer(e.unit,1)||e.unit>200||
   !integer(e.bpPerGroup,1)||e.bpPerGroup>5000||
   e.bpPerGroup%500!==0||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','unit','bpPerGroup'].includes(k))
  ))throw Error(path+'['+i+'] invalid outside group self buff');
  if(e.op==='millTop'||e.op==='drawDiscard'){
   if(!integer(e.count,1)||e.count>10)throw Error(path+'['+i+'] invalid count');
  }
  // 「1枚まで」is a choice to mill zero or one. A missing optional key stays
  // the existing mandatory mill. Optional is rejected for any other count.
  if(e.op==='millTop'&&e.optional!==undefined&&(
   e.optional!==true||e.count!==1||
   Object.keys(e).some(k=>!['op','count','optional'].includes(k))
  ))throw Error(path+'['+i+'] optional mill is exactly one card');
  if(e.op==='drawIfOwnEnergyAtLeast'&&(
   !integer(e.energy,1)||e.energy>50||
   !integer(e.count,1)||e.count>5||
   Object.keys(e).some(k=>!['op','energy','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid own-energy draw profile');
  if(e.op==='drawIfOwnFieldExists'&&(
   !Number.isInteger(e.count)||e.count<1||e.count>5||
   Object.keys(e).length!==2||Object.keys(e).some(k=>!['op','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid FIELD-gated draw profile');
  if(e.op==='drawIfOwnOutsideNamedCountAtLeast'&&(
   !integer(e.min,1)||e.min>200||!integer(e.count,1)||e.count>5||
   !Array.isArray(e.names)||e.names.length<1||e.names.length>8||
   e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   new Set(e.names).size!==e.names.length||
   (e.optional!==undefined&&(e.optional!==true||e.count!==1))||
   Object.keys(e).length!==(e.optional===true?5:4)||
   Object.keys(e).some(k=>!['op','min','count','names','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid named outside conditional draw');
  if(e.op==='drawIfOwnTraitCount'&&(
   typeof e.trait!=='string'||!e.trait.trim()||
   !['field','front','energy'].includes(e.zone)||
   typeof e.excludeSelf!=='boolean'||
   !integer(e.min,1)||e.min>8||
   !integer(e.count,1)||e.count>5||
   Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','trait','zone','excludeSelf','min','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid live trait-count draw profile');
  if(e.op==='drawIfOwnName'){
   const keys=Object.keys(e);
   const named=typeof e.name==='string'&&!!e.name.trim()&&e.name.length<=80;
   const selfBp=e.minSelfBp===undefined||
    (integer(e.minSelfBp,500)&&e.minSelfBp<=50000&&e.minSelfBp%500===0);
   const single=named&&!own(e,'names')&&integer(e.count,1)&&e.count<=5&&selfBp&&
    keys.every(k=>['op','name','count','minSelfBp'].includes(k));
   const union=!own(e,'name')&&e.minSelfBp===undefined&&Array.isArray(e.names)&&
    e.names.length>=2&&e.names.length<=4&&
    e.names.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80)&&
    new Set(e.names).size===e.names.length&&integer(e.count,1)&&e.count<=5&&
    keys.every(k=>['op','names','count'].includes(k));
   if(!(single||union))throw Error(path+'['+i+'] invalid own-field-name draw profile');
  }
  if(e.op==='drawIfNameOrDistinctColorNames'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !['red','blue','yellow','green','purple'].includes(e.color)||
   !integer(e.min,2)||e.min>8||!integer(e.count,1)||e.count>5||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','color','min','count'].includes(k))))
   throw Error(path+'['+i+'] invalid name-or-kinds draw');
  if(e.op==='drawIfOwnEventUsed'&&(
   e.count!==1||Object.keys(e).some(k=>!['op','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid event-used draw');
  if(e.op==='drawIfOppRestCharacter'&&(
   !integer(e.count,1)||e.count>5||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent REST-character draw');
  if(e.op==='drawIfOppCharacterBpAtLeast'&&(
   !integer(e.minBp,500)||e.minBp>50000||e.minBp%500!==0||
   !integer(e.count,1)||e.count>5||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','minBp','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent current-BP draw');
  if(e.op==='drawIfOppFrontBelowPrinted'&&(
   e.count!==1||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))))
   throw Error(path+'['+i+'] unsupported front printed-BP draw');
  if(e.op==='restOwnActiveFrontDraw'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] unsupported active front rest draw');
  if(e.op==='deployOwnRaidBaseRest'&&(e.optional!==true||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','optional'].includes(k))))
   throw Error(path+'['+i+'] unsupported raid-base rest entry');
  if(e.op==='restOrRetireFrontAtMost'&&(e.bp!==5000||e.retireIfName!=='エミリア'||
   Object.keys(e).length!==3||Object.keys(e).some(k=>!['op','bp','retireIfName'].includes(k))))
   throw Error(path+'['+i+'] unsupported rest-or-retire front');
  if(e.op==='peekTopOneIfFieldNames'&&(!Array.isArray(e.names)||e.names.length!==2||
   e.names[0]!=='エミリア'||e.names[1]!=='パック'||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','names'].includes(k))))
   throw Error(path+'['+i+'] unsupported named top peek');
  if(e.op==='drawIfOwnNameAndHandFewer'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.count,1)||e.count>5||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid named hand-count draw');
  if(e.op==='activeOwnNamed'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   e.max!==1||e.optional!==true||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','name','max','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid named own ACTIVE');
  if(['searchDeckOne','searchDeckMany','recoverOutsideOne'].includes(e.op)){
   const f=e.filter;
   const anyName=e.op==='recoverOutsideOne'&&f?.field==='printedNameAny';
   const validNameGroup=anyName&&f&&typeof f==='object'&&!Array.isArray(f)&&
     Object.keys(f).length===2&&Array.isArray(f.values)&&
     f.values.length>=2&&f.values.length<=4&&
     new Set(f.values).size===f.values.length&&
     f.values.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80);
   if(!f||typeof f!=='object'||Array.isArray(f)||
     (anyName?!validNameGroup:(
      Object.keys(f).length!==2||!['name','trait','color','type'].includes(f.field)||
      typeof f.value!=='string'||!f.value.trim()||
      (f.field==='type'&&!V2_CARD_TYPES.includes(f.value))))||
     typeof e.optional!=='boolean'||
     (['searchDeckOne','searchDeckMany'].includes(e.op)&&e.shuffle!==true)||
     (e.op==='searchDeckMany'&&(!integer(e.count,1)||e.count>5))||
     Object.keys(e).some(k=>!['op','filter','optional',
       ...(['searchDeckOne','searchDeckMany'].includes(e.op)?['shuffle']:[]),
       ...(e.op==='searchDeckMany'?['count']:[])].includes(k)))
    throw Error(path+'['+i+'] invalid searched-card filter/options');
  }
  if(e.op==='recoverOutsidePrintedBp'&&(
   !integer(e.bp,1)||e.bp>50000||typeof e.optional!=='boolean'||
   (e.excludeName!==undefined&&(typeof e.excludeName!=='string'||!e.excludeName.trim()||e.excludeName.length>80))||
   Object.keys(e).some(k=>!['op','bp','optional','excludeName'].includes(k))
  ))throw Error(path+'['+i+'] invalid printed-BP outside recovery');
  // Printed no-trait CHARACTER only; never infer 'traitless' from a generic filter.
  if(e.op==='recoverOutsideTraitlessUnderEnergy'&&(
   !integer(e.energy)||e.energy>30||typeof e.optional!=='boolean'||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','energy','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid traitless printed-energy recovery');
  if(e.op==='deployOutsideTraitlessRestOrRaid'&&(
    typeof e.color!=='string'||!e.color.trim()||
    !integer(e.energy)||e.energy>30||!integer(e.ap,1)||e.ap>3||
    e.optional!==true||e.perOtherOutsideField!==1||
    Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','color','energy','ap','optional','perOtherOutsideField'].includes(k))
   ))throw Error(path+'['+i+'] invalid outside traitless REST/Raid scaled profile');
   if(e.op==='deployOutsideRest'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   typeof e.color!=='string'||!e.color.trim()||
   !integer(e.energy)||e.energy>30||!integer(e.ap,1)||e.ap>3||
   e.optional!==true||Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','name','color','energy','ap','optional'].includes(k))
   ))throw Error(path+'['+i+'] invalid outside-to-REST character');
  // Printed energy is exact, not a maximum. AP is not filtered, and a Raid
  // name does not exclude the character.
  if(e.op==='deployOutsidePrintedRest'&&(
   e.name!=='ナツキ・スバル'||e.color!=='blue'||e.energy!==0||e.optional!==true||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','color','energy','optional'].includes(k))
  ))throw Error(path+'['+i+'] unsupported exact outside REST');
  // Name only. Do not add color, energy, or AP here: that would tighten the
  // filtered op above, and this print has none of those limits.
  if(e.op==='deployOutsideNameRest'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   e.optional!==true||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid name-only outside REST');
  // Hand entry, then an optional 1 AP payment, then up to one named character
  // whose required energy the controller currently meets. Color is the card's
  // own color. The payment is not the character's play cost.
  if(e.op==='deployNamedFromZones'&&(
    typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
    !Array.isArray(e.zones)||e.zones.length<1||e.zones.length>2||
    new Set(e.zones).size!==e.zones.length||
    e.zones.some(z=>!['hand','outside'].includes(z))||
    !['any','front','energy'].includes(e.line)||typeof e.ready!=='boolean'||
    e.optional!==true||
    ![6,9,10].includes(Object.keys(e).length)||
    (Object.keys(e).length>6&&(
     !['red','yellow','green','blue','purple'].includes(e.color)||
     !integer(e.ap,1)||e.ap>3||!integer(e.maxEnergy)||e.maxEnergy>30||
     (Object.keys(e).length===10&&e.cardType!== 'field'&&
      (!integer(e.grantBp,1)||e.grantBp>5000))||
     (Object.keys(e).length===9&&Object.hasOwn(e,'grantBp'))))||
    (e.cardType!==undefined&&(
     e.cardType!=='field'||Object.keys(e).length!==10||
     e.zones.length!==1||e.zones[0]!=='hand'||e.line!=='energy'||
     e.ready!==true||e.color===undefined||e.grantBp!==undefined))||
    Object.keys(e).some(k=>!['op','name','zones','line','ready','optional',
     'color','ap','maxEnergy','grantBp','cardType'].includes(k))
   ))throw Error(path+'['+i+'] invalid free named-zone entry');
   if(e.op==='payApDeployNamedRest'&&(
   e.entry!=='hand'||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','entry','name'].includes(k))
  ))throw Error(path+'['+i+'] invalid hand-entry AP named REST');
  // Look at the top N, send up to one exact trait token outside, order the
  // rest onto the top. The trait is one token; slash composites are not split.
  if(e.op==='inspectTopTraitOutside'&&(
   !integer(e.count,2)||e.count>4||
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   (e.orName!==undefined&&(typeof e.orName!=='string'||!e.orName.trim()||e.orName.length>80))||
   (e.requiresOtherOwnTrait!==undefined&&(typeof e.requiresOtherOwnTrait!=='string'||!e.requiresOtherOwnTrait.trim()||e.requiresOtherOwnTrait.length>80))||
   e.rest!=='top'||Object.keys(e).length!==4+Number(e.orName!==undefined)+Number(e.requiresOtherOwnTrait!==undefined)||
   Object.keys(e).some(k=>!['op','count','trait','rest','orName','requiresOtherOwnTrait'].includes(k))
  ))throw Error(path+'['+i+'] invalid trait top-outside profile');
  if(e.op==='searchDeckWhere'){
   if(!Array.isArray(e.filters)||e.filters.length<2||e.filters.length>3||
    e.filters.some(f=>!f||typeof f!=='object'||Array.isArray(f)||
     Object.keys(f).length!==2||!['name','trait','color','type'].includes(f.field)||
     typeof f.value!=='string'||!f.value.trim()||
     (f.field==='type'&&!V2_CARD_TYPES.includes(f.value)))||
    new Set(e.filters.map(f=>f.field+':'+f.value)).size!==e.filters.length||
    !['all','any'].includes(e.logic)||!integer(e.count,1)||e.count>5||
    typeof e.optional!=='boolean'||e.shuffle!==true||
    Object.keys(e).some(k=>!['op','filters','logic','count','optional','shuffle'].includes(k)))
    throw Error(path+'['+i+'] invalid compound deck search');
  }
  if(e.op==='peekTopOrBottom'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid top-or-bottom');
  if(e.op==='inspectTopAnyOutside'&&(
   !integer(e.count,2)||e.count>4||!['top','bottom'].includes(e.rest)||
   (e.drawIfOutsideEnergyAtLeast!==undefined&&
    (!integer(e.drawIfOutsideEnergyAtLeast,1)||e.drawIfOutsideEnergyAtLeast>30))||
   Object.keys(e).some(k=>!['op','count','rest','drawIfOutsideEnergyAtLeast'].includes(k))
  ))throw Error(path+'['+i+'] invalid arbitrary top-outside choice');
  if(e.op==='inspectTopArrange'&&(
   !integer(e.count,2)||e.count>4||typeof e.toOutside!=='boolean'||
   !['top','bottom'].includes(e.rest)||
   Object.keys(e).some(k=>!['op','count','toOutside','rest'].includes(k))
  ))throw Error(path+'['+i+'] invalid top inspect/arrange');
  if(e.op==='searchTopOneBottomDiscard'){
   const colorAndType=/^(blue|yellow|green|purple|red):(event|field)$/;
   const isFilter=f=>f&&typeof f==='object'&&!Array.isArray(f)&&
    Object.keys(f).length===2&&(
     f.field==='traitlessCharacter'?f.value===true:
     f.field==='printedRequiredEnergyAtLeast'?integer(f.value,1)&&f.value<=30:
     f.field==='colorAndType'?colorAndType.test(f.value):
     ['name','trait','color','type'].includes(f.field)&&
     typeof f.value==='string'&&!!f.value.trim()&&
     (f.field!=='type'||V2_CARD_TYPES.includes(f.value)));
   const single=isFilter(e.filter)&&e.filters===undefined&&e.logic===undefined&&
    Object.keys(e).every(k=>['op','count','filter'].includes(k));
   const compound=e.filter===undefined&&Array.isArray(e.filters)&&
    e.filters.length>=2&&e.filters.length<=4&&e.filters.every(isFilter)&&
    new Set(e.filters.map(f=>f.field+':'+f.value)).size===e.filters.length&&
    ['any','all'].includes(e.logic)&&
    Object.keys(e).every(k=>['op','count','filters','logic'].includes(k));
   // Printed windows stop at 7. REZ-1-091 looks at seven cards; eight is rejected.
   if(!integer(e.count,1)||e.count>7||!(single||compound))
    throw Error(path+'['+i+'] invalid top-N filtered bottom/discard profile');
  }
  if(e.op==='searchTopTraitOrEventAp'&&(
   e.count!==5||e.trait!=='王選候補者'||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','count','trait'].includes(k))))
   throw Error(path+'['+i+'] unsupported trait or event search');
  if(e.op==='retireOppFrontAtLeastBp'){
   const plain=e.bp===4500&&Object.keys(e).length===2&&
    Object.keys(e).every(k=>['op','bp'].includes(k));
   const paid=e.bp===4500&&e.optional===true&&Object.keys(e).length===3&&
    Object.keys(e).every(k=>['op','bp','optional'].includes(k));
   if(!(plain||paid))throw Error(path+'['+i+'] unsupported minimum front retirement');
  }
  if(e.op==='retireOppFrontAtMostBp'&&(
   e.bp!==5000||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','bp'].includes(k))))
   throw Error(path+'['+i+'] unsupported maximum front retirement');
  if(e.op==='retireOppFrontScaledBp'&&(
   e.base!==1000||e.step!==1000||e.name!=='ナツキ・スバル'||e.color!=='blue'||
   e.energy!==0||e.optional!==true||Object.keys(e).length!==7||
   Object.keys(e).some(k=>!['op','base','step','name','color','energy','optional'].includes(k))))
   throw Error(path+'['+i+'] unsupported scaled front retirement');
  if(e.op==='grantHandCharacterBpMay'&&(
   e.amount!==1000||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','amount'].includes(k))))
   throw Error(path+'['+i+'] unsupported hand character BP option');
  if(e.op==='discountNextNamedHandEnergy'&&(
   e.name!=='エミリア'||e.color!=='purple'||e.amount!==1||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','name','color','amount'].includes(k))))
   throw Error(path+'['+i+'] unsupported next named hand energy');
  if(e.op==='searchTopUpToTwoBottom'){
   const valid=f=>f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&
    ['name','trait','color','type','printedRequiredEnergyAtMost','printedApAtLeast','traitlessCharacterOrField'].includes(f.field)&&
    (f.field==='traitlessCharacterOrField'?f.value===true:
      f.field==='printedRequiredEnergyAtMost'?integer(f.value)&&f.value<=30:
      f.field==='printedApAtLeast'?integer(f.value,1)&&f.value<=3:
     typeof f.value==='string'&&!!f.value.trim()&&f.value.length<=80&&
      (f.field!=='type'||V2_CARD_TYPES.includes(f.value)));
   if(!integer(e.count,1)||e.count>5||![1,2].includes(e.max)||e.rest!=='bottom'||
    !Array.isArray(e.filters)||e.filters.length<1||e.filters.length>3||
    !e.filters.every(valid)||new Set(e.filters.map(f=>f.field+':'+f.value)).size!==e.filters.length||
    !['any','all'].includes(e.logic)||
    (e.skipSelfIfAdded!==undefined&&e.skipSelfIfAdded!==true)||
    Object.keys(e).length!==6+Number(e.skipSelfIfAdded===true)||
    Object.keys(e).some(k=>!['op','count','max','rest','filters','logic','skipSelfIfAdded'].includes(k)))
    throw Error(path+'['+i+'] invalid TOP-N two-card hand search');
  }
  if(e.op==='deployOwnHandRest'){
   const gated=e.when!==undefined;
   if(gated){
    assertLiveCondition(e.when,path+'['+i+'].when');
    if(e.when.kind!=='ownNameExists'||e.when.zone!=='field'||e.when.turn!=='any'||e.max!==1)
     throw Error(path+'['+i+'] hand REST name gate must be one field name');
   }
   if(!['character','field'].includes(e.type)||!['blue','yellow','green','purple','red'].includes(e.color)||
    !integer(e.energy)||e.energy>30||!integer(e.ap,1)||e.ap>3||
    !integer(e.max,1)||e.max>4||Object.keys(e).length!==(gated?7:6)||
    Object.keys(e).some(k=>!['op','type','color','energy','ap','max',...(gated?['when']:[])].includes(k)))
    throw Error(path+'['+i+'] invalid hand REST entry');
  }
  if(e.op==='deployOwnHandSpecial'){
    // A null maxEnergy means NO printed energy cap.
    if(!['character','field'].includes(e.type)||
     !['blue','yellow','green','purple','red'].includes(e.color)||
     !integer(e.ap,1)||e.ap>3||!integer(e.max,1)||e.max>4||
     !(e.trait===null||typeof e.trait==='string'&&!!e.trait.trim()&&e.trait.length<=80)||
     !(e.maxEnergy===null||integer(e.maxEnergy)&&e.maxEnergy<=30)||
     typeof e.ready!=='boolean'||
     !(e.protectionScope===null||['any','character','trigger'].includes(e.protectionScope))||
     (e.protectionScope!==null&&(e.type!=='character'||e.max!==1))||
     Object.keys(e).length!==9||
     Object.keys(e).some(k=>!['op','type','color','ap','trait','maxEnergy','ready','max','protectionScope'].includes(k)))
     throw Error(path+'['+i+'] invalid special hand entry');
   }
  if(e.op==='deployOwnHandNamedRest'&&(
   e.color!=='yellow'||e.maxEnergy!==3||e.ap!==1||e.max!==1||e.optional!==true||
   !Array.isArray(e.names)||e.names.length!==2||e.names[0]!=='ラム'||e.names[1]!=='レム'||
   Object.keys(e).length!==7||
   Object.keys(e).some(k=>!['op','color','maxEnergy','ap','names','max','optional'].includes(k))))
   throw Error(path+'['+i+'] unsupported named hand REST');
   if(e.op==='deployOwnHandRestOrRaid'){
    const namesOk=e.names===null||(Array.isArray(e.names)&&e.names.length>=1&&
     e.names.length<=6&&new Set(e.names).size===e.names.length&&
     e.names.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80));
    if(e.type!=='character'||
     !['blue','yellow','green','purple','red'].includes(e.color)||
     !integer(e.maxEnergy)||e.maxEnergy>30||!integer(e.ap,1)||e.ap>3||
     !integer(e.max,1)||e.max>4||e.optional!==true||!namesOk||
     (e.requireAffordableEnergy!==undefined&&e.requireAffordableEnergy!==true)||
     Object.keys(e).length!==8+Number(e.requireAffordableEnergy===true)||
     Object.keys(e).some(k=>!['op','type','color','maxEnergy','ap','max','optional','names','requireAffordableEnergy'].includes(k)))
     throw Error(path+'['+i+'] invalid hand REST or Raid entry');
   }
   if(e.op==='optionalPayApThen'){
    if(e.when!==undefined)assertLiveCondition(e.when,path+'['+i+'].when');
    const paidRetire=x=>x?.op==='retireOppFrontAtLeastBp'&&x.bp===4500&&x.optional===true;
    const attackOnce=e.oncePerAttackTurn===true;
    // 【ターン1】 on an attack payment is only the attack trigger. A nested
    // choose-one branch cannot spend that flag.
    if(attackOnce&&!path.endsWith('.onAttack'))
     throw Error(path+'['+i+'] attack AP payment is once per attack turn only');
    if((e.ownTurn!==undefined&&e.ownTurn!==true)||
     (e.oncePerAttackTurn!==undefined&&e.oncePerAttackTurn!==true)||
     e.ap!==1||e.optional!==true||!Array.isArray(e.then)||
     e.then.length<1||e.then.length>3||
     Object.keys(e).length!==4+Number(e.when!==undefined)+Number(e.ownTurn===true)+Number(attackOnce)||
     Object.keys(e).some(k=>!['op','ap','optional','then','when','ownTurn','oncePerAttackTurn'].includes(k))||
     e.then.some(x=>!['draw','deployOwnHandRestOrRaid','deployOutsideNameRest','revealTopHandOrAffordableNamed','chooseOne'].includes(x?.op)&&
      !paidRetire(x)))
     throw Error(path+'['+i+'] invalid optional AP payment');
    verifyProgram(e.then,path+'['+i+'].then');
   }
   if(e.op==='revealTopHandOrAffordableNamed'){
    const namesOk=Array.isArray(e.names)&&e.names.length>=1&&e.names.length<=2&&
     new Set(e.names).size===e.names.length&&
     e.names.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80);
    if(!namesOk||Object.keys(e).length!==2||
     Object.keys(e).some(k=>!['op','names'].includes(k)))
     throw Error(path+'['+i+'] invalid affordable named reveal');
   }
   if(e.op==='drawThenPlaceHand'&&Object.keys(e).some(k=>k!=='op'))
    throw Error(path+'['+i+'] invalid draw then hand placement');
   if(e.op==='optionalHandOutsideActiveIf'&&(
    typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
    !integer(e.minEvents,1)||e.minEvents>20||Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','name','minEvents'].includes(k))))
    throw Error(path+'['+i+'] invalid optional hand outside active');
   if(e.op==='buffNamedImpactDuration'&&(
    typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
    !integer(e.bp,1)||e.bp>5000||e.impact!==1||e.optional!==true||
    !integer(e.otherOutsideEvents,1)||e.otherOutsideEvents>20||
    Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','name','bp','impact','optional','otherOutsideEvents'].includes(k))))
    throw Error(path+'['+i+'] invalid named impact duration');
   if(e.op==='takeTopHandRestOutside'&&(
    e.count!==2||Object.keys(e).length!==2||
    Object.keys(e).some(k=>!['op','count'].includes(k))))
    throw Error(path+'['+i+'] invalid top take then outside');
   if(e.op==='buffEitherField'&&(
    !integer(e.bp,1)||e.bp>5000||e.optional!==true||
    Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','bp','optional'].includes(k))))
    throw Error(path+'['+i+'] invalid either-field BP choice');
   if(e.op==='revealHandBottomOutsideCharacter'&&(
    e.optional!==true||e.ap!==1||
    !['blue','yellow','green','purple','red'].includes(e.color)||
    typeof e.excludeName!=='string'||!e.excludeName.trim()||e.excludeName.length>80||
    Object.keys(e).length!==5||
    Object.keys(e).some(k=>!['op','optional','excludeName','color','ap'].includes(k))))
    throw Error(path+'['+i+'] invalid reveal then outside character');
   if(e.op==='impactIfEveryOwnTraitless'&&Object.keys(e).some(k=>k!=='op'))
    throw Error(path+'['+i+'] invalid traitless impact');
   if(e.op==='deployOutsidePrintedActive'&&(
    e.name!=='ナツキ・スバル'||e.color!=='blue'||e.energy!==0||e.optional!==true||
    Object.keys(e).length!==5||
    Object.keys(e).some(k=>!['op','name','color','energy','optional'].includes(k))))
    throw Error(path+'['+i+'] unsupported exact outside ACTIVE');
   if(e.op==='bounceThenAffordableSubaru'&&(
    e.name!=='ナツキ・スバル'||e.color!=='blue'||e.ap!==1||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','name','color','ap'].includes(k))))
    throw Error(path+'['+i+'] invalid bounce then affordable Subaru');
   if(e.op==='grantBounceInstead'&&(
    e.name!=='ナツキ・スバル'||e.optional!==true||Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','name','optional'].includes(k))))
    throw Error(path+'['+i+'] invalid bounce-instead grant');
   if(e.op==='removeOppFieldOne'&&Object.keys(e).some(k=>k!=='op'))
    throw Error(path+'['+i+'] invalid opponent field removal');
   if(e.op==='handOutsideReenterFaceDown'&&(
    e.name!=='エミリア'||Object.keys(e).length!==2||
    Object.keys(e).some(k=>!['op','name'].includes(k))))
    throw Error(path+'['+i+'] invalid facedown reenter');
   if(e.op==='chooseOne'){
   if(typeof e.optional!=='boolean'||!Array.isArray(e.options)||
    (e.options.length<2||e.options.length>3)||
    Object.keys(e).length!==(e.entry===undefined?3:4)||
    (e.entry!==undefined&&e.entry!=='ownEffect')||
    Object.keys(e).some(k=>!['op','optional','options','entry'].includes(k)))
    throw Error(path+'['+i+'] invalid choose-one options');
   const seen=new Set();
   for(const o of e.options){
    if(!o||typeof o!=='object'||Array.isArray(o)||
     typeof o.id!=='string'||!(/^[a-zA-Z][a-zA-Z0-9]{0,32}$/).test(o.id)||
     seen.has(o.id)||typeof o.label!=='string'||!o.label.trim()||
     o.label.length>64||!['any','own','opponent'].includes(o.turn)||
     !Array.isArray(o.then)||o.then.length<1||o.then.length>3||
     (o.entry!==undefined&&o.entry!=='ownEffect')||
     Object.keys(o).some(k=>!['id','label','turn','then','entry'].includes(k))||
     Object.keys(o).length!==(o.entry===undefined?4:5)||
     o.then.some(x=>!['draw','drawDiscard','buffOwnField',
      'recoverOutsideOne','recoverOutsideTraitlessUnderEnergy','buffSelf',
       'inspectTopAnyOutside','retireOwnCharacterOne',
       'stripOppRaidTop','retireOppFrontOneUnderBp','discardGate',
       'grantFrontEnergyOwnOtherFrontTrait','bounceOwnOtherUnderEnergy','nextEligibleHandPlayApDiscount','searchTopUpToTwoBottom','searchTopOneBottomDiscard','outsideToDeckTop','deployOwnHandRest','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','oncePerTurnGate','deployOwnHandRestOrRaid','enemyBpDown','activeSelf','grantSelfImpactThisTurn','peekTopOne','grantOwnNameBlockAtLeast','optionalPayApThen','drawThenPlaceHand','discardOppHand','enemyFrontAllBpDown','deployOutsidePrintedActive','bounceThenAffordableSubaru','deployOutsideFiltered','retireOppFrontOne','recoverOutsideCharacterUnderEnergy','payApDiscardOutsideRaid','grantSelfSkipNextActive','replayOnPlay'].includes(x?.op)))
     throw Error(path+'['+i+'] invalid choose-one option');
    seen.add(o.id);
    // Reuse established nested effect verification AND reject stray fields
    // for draw/discard/boost primitives at the new nested trust boundary.
    for(const x of o.then){
     if((x.op==='draw'||x.op==='drawDiscard')&&
      Object.keys(x).some(k=>!['op','count',
       ...(x.op==='drawDiscard'?['discardCount']:[])].includes(k)))
      throw Error(path+'['+i+'] unknown branched draw field');
     if(x.op==='drawDiscard'&&x.discardCount!==undefined&&
      (!integer(x.discardCount,1)||x.discardCount>10))
      throw Error(path+'['+i+'] invalid branched discard count');
     if(x.op==='buffSelf'&&
      (!integer(x.bp,1)||x.bp>5000||Object.keys(x).some(k=>!['op','bp'].includes(k))))
      throw Error(path+'['+i+'] invalid branched self BP');
    }
    verifyProgram(o.then,path+'['+i+'].options.'+o.id+'.then');
   }
  }
  if(e.op==='discardOppHand'&&(
   e.count!==1||Object.keys(e).some(k=>!['op','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent hand discard');
  if(e.op==='discardGate'){
   // Typed hand-name payment: only exact printed names, never an arbitrary UID.
   // An absent payment preserves the legacy unfiltered gate.
   const pay=e.payment;
   const namePay=pay&&typeof pay==='object'&&!Array.isArray(pay)&&
    Object.keys(pay).length===4&&pay.zone==='hand'&&pay.field==='name'&&
    ['exactAny','containsAny'].includes(pay.match)&&Array.isArray(pay.values)&&
    pay.values.length>=1&&pay.values.length<=4&&new Set(pay.values).size===pay.values.length&&
    pay.values.every(v=>typeof v==='string'&&!!v.trim()&&v.length<=48&&v===v.trim());
   const traitPay=pay&&typeof pay==='object'&&!Array.isArray(pay)&&
    Object.keys(pay).length===3&&pay.zone==='hand'&&pay.field==='trait'&&
    typeof pay.value==='string'&&!!pay.value.trim()&&pay.value.length<=80&&
    pay.value===pay.value.trim();
   const validPay=pay===undefined||namePay||traitPay;
   if(!validPay)throw Error(path+'['+i+'] invalid typed name payment');
   if(e.when!==undefined)assertLiveCondition(e.when,path+'['+i+'].when');
   if(typeof e.optional!=='boolean'||!Array.isArray(e.then)||
    !e.then.length||e.then.length>6||
    (e.count!==undefined&&e.count!==2)||
    (e.scope!==undefined&&e.scope!=='name')||
    Object.keys(e).some(k=>!['op','optional','then','payment','count','when','scope'].includes(k))||
    e.then.some(x=>!['draw','millTop','peekTopOne','searchDeckOne',
     'searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside',
       'peekTopOrBottom','recoverOutsideOne','recoverOutsidePrintedBp','deployOutsideRest','deployOutsideFiltered',
     'enemyBpDown','enemyFrontAllBpDown','retireOppFrontAllUnderBp','buffOwnTraitAllTurn',
     'recoverOutsideColorUnderEnergy','buffOwnField',
     'restOppFrontUnderBp','restOppFrontOne','buffSelf','activeSelf','activeOwnTrait','grantOnAttack',
     'grantSelfEnergyMoveOnAttackStart','grantSelfTriggerUnchosen',
     'outsideColorEnergyHandOrRest','activeSkipPair'].includes(x?.op)))
    throw Error(path+'['+i+'] invalid gated payment');
   verifyProgram(e.then,path+'['+i+'].then');
  }
   if(e.op==='removeOutsideThen'){
   // Own outside only. A short set may move, but the follow-up waits for
   // the printed count. Q575: two cards can leave, and the draw does not.
   // Q560: three cards can leave when four are printed, and the follow-up does not.
   if(!integer(e.count,1)||e.count>4||e.optional!==true||
    !['character','any'].includes(e.cardType)||
    e.zone!=='outside'||e.controller!=='own'||
    !Array.isArray(e.then)||e.then.length<1||e.then.length>3||
    Object.keys(e).length!==7||
    Object.keys(e).some(k=>!['op','count','optional','cardType','zone','controller','then'].includes(k))||
    e.then.some(x=>!['draw','millTop','buffSelf','enemyBpDown'].includes(x?.op)))
    throw Error(path+'['+i+'] invalid outside removal payment');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='removeAnyOutsideScale'){
   if(e.optional!==true||e.cardType!=='any'||e.zone!=='outside'||e.controller!=='own'||
    e.per!==500||Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','optional','cardType','zone','controller','per'].includes(k)))
    throw Error(path+'['+i+'] invalid scaled outside removal');
  }
  if(e.op==='inspectTopColoredNamesOutside'){
   if(!integer(e.count,2)||e.count>4||e.rest!=='top'||e.max!==1||
    !['blue','yellow','green','purple','red'].includes(e.color)||
    !Array.isArray(e.names)||e.names.length!==2||new Set(e.names).size!==2||
    e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
    Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','count','rest','max','color','names'].includes(k)))
    throw Error(path+'['+i+'] invalid colored-name top outside');
  }
  // 〈カード名〉 with no color. Any card type matches, including an alias.
  // At most one inspected card leaves. The rest return to the top.
  if(e.op==='inspectTopNamesOutside'&&(
   !integer(e.count,2)||e.count>4||e.rest!=='top'||e.max!==1||
   !Array.isArray(e.names)||e.names.length<2||e.names.length>3||
   new Set(e.names).size!==e.names.length||
   e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','count','rest','max','names'].includes(k))))
   throw Error(path+'['+i+'] invalid named top outside');
  if(e.op==='drawDiscardIfEffectApPaid'){
   if(!['blue','yellow','green','purple','red'].includes(e.color)||e.discardCount!==1||
    Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','color','discardCount'].includes(k)))
    throw Error(path+'['+i+'] invalid effect-AP draw/discard');
  }
  if(e.op==='activeSelf'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid self ACTIVE');
  if(e.op==='handTopBuffSelf'&&(
   !integer(e.bp,1)||e.bp>5000||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','bp'].includes(k))))
   throw Error(path+'['+i+'] invalid hand-to-top buff');
  if(e.op==='optionalRestFrontRecoverAp'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid optional front rest');
  if(e.op==='drawHandTop'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid draw then hand-to-top');
  if(e.op==='optionalDiscardActiveSelf'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid optional discard active');
  if(e.op==='grantSelfImpactThisTurn'&&(
   e.amount!==1||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','amount'].includes(k))))
   throw Error(path+'['+i+'] invalid this-turn impact grant');
  if(e.op==='grantUnblockedDrawThisTurn'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid unblocked-attack draw grant');
  if(e.op==='raidBaseNameThen'){
   if(!Array.isArray(e.branches)||e.branches.length<1||e.branches.length>4||
    Object.keys(e).length!==2||
    e.branches.some(b=>!b||typeof b!=='object'||typeof b.name!=='string'||!b.name.trim()||
     !Array.isArray(b.then)||b.then.length!==1||Object.keys(b).length!==2))
    throw Error(path+'['+i+'] invalid raid-base branch');
   if(new Set(e.branches.map(b=>b.name)).size!==e.branches.length)
    throw Error(path+'['+i+'] duplicate raid-base branch');
   for(const [n,b] of e.branches.entries())
    verifyProgram(b.then,path+'['+i+'].branches['+n+'].then');
  }
  if(e.op==='drawIfOwnNameOrRaidBase'&&(
   e.count!==1||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','count'].includes(k))))
   throw Error(path+'['+i+'] invalid name-or-raid-base draw');
  if(e.op==='replayRaidBase'&&(
   e.optional!==true||!integer(e.activeEnergy,1)||e.activeEnergy>30||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','optional','activeEnergy'].includes(k))))
   throw Error(path+'['+i+'] invalid raid-base replay');
  if(e.op==='outsideRecoverOrRestPlay'&&(
   e.optional!==true||!['blue','green','red','yellow','purple'].includes(e.color)||
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>40||
   !integer(e.maxEnergy)||e.maxEnergy>30||e.ap!==1||
   !integer(e.restPlayEnergy,1)||e.restPlayEnergy>30||
   Object.keys(e).length!==7||
   Object.keys(e).some(k=>!['op','optional','color','trait','maxEnergy','ap','restPlayEnergy'].includes(k))))
   throw Error(path+'['+i+'] invalid outside hand-or-rest-play');
  if(e.op==='gainSelfEnergyIfAtLeast'&&(
   !integer(e.min,1)||e.min>30||!integer(e.amount,1)||e.amount>3||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','min','amount'].includes(k))))
   throw Error(path+'['+i+'] invalid conditional generated-energy gain');
  if(e.op==='grantAllFrontEnergyThisTurn'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid all-front energy grant');
  if(e.op==='outsideToDeckTop'&&(
   e.optional!==true||e.logic!=='any'||!Array.isArray(e.filters)||e.filters.length!==2||
   e.filters.some(f=>!f||Object.keys(f).length!==2||
    !((f.field==='name'&&typeof f.value==='string'&&!!f.value.trim())||
     (f.field==='printedRequiredEnergyAtLeast'&&integer(f.value,1)&&f.value<=30)))||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','optional','filters','logic'].includes(k))))
   throw Error(path+'['+i+'] invalid outside-to-deck-top');
  if(e.op==='recoverNamesThenHandRaidDiscount'&&(
   e.optional!==true||e.amount!==1||!Array.isArray(e.names)||e.names.length<2||
   e.names.length>4||e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   new Set(e.names).size!==e.names.length||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','optional','names','amount'].includes(k))))
   throw Error(path+'['+i+'] invalid named outside recovery and raid discount');
  if(e.op==='buffMaxOwnBpImpact'&&(
   e.optional!==false||e.contains!=='ラガン'||e.name!=='シモン'||e.impact!==1||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','optional','contains','name','impact'].includes(k))))
   throw Error(path+'['+i+'] invalid max-BP impact choice');
  if(e.op==='grantImpactNullUntilNextOwnStart'&&(
   e.optional!==true||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid temporary impact-null grant');
  if(e.op==='buffOtherIfFirstAttack'&&(
   e.optional!==true||!integer(e.bp,1)||e.bp>5000||e.bp%500!==0||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid first-attack ally BP');
  if(e.op==='millUpToThenRecover'&&(
   !integer(e.count,1)||e.count>2||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))))
   throw Error(path+'['+i+'] invalid mill-then-recover profile');
  if(e.op==='discardUpToThenDraw'&&(
   e.optional!==true||!integer(e.max,1)||e.max>2||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','max','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid discard-up-to draw');
  if(e.op==='searchTopAddOneMillRest'&&(
   e.count!==2||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))))
   throw Error(path+'['+i+'] invalid top-add mill-rest');
  if(e.op==='buffDistinctTraitNames'&&(
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   !integer(e.per,500)||e.per>5000||e.per%500!==0||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','trait','per'].includes(k))))
   throw Error(path+'['+i+'] invalid distinct-name BP scale');
  if(e.op==='grantFirstAttackUntilNextOwnStart'&&(
   !integer(e.bp,1)||e.bp>5000||e.bp%500!==0||e.impactNull!==true||
   e.doubleBlock!==true||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','bp','impactNull','doubleBlock'].includes(k))))
   throw Error(path+'['+i+'] invalid first-attack package');
  if(e.op==='buffNamedImpactDraw'&&(
   e.name!=='レム'||e.bp!==1000||e.impactPlus!==1||e.draw!==1||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','bp','impactPlus','draw'].includes(k))))
   throw Error(path+'['+i+'] unsupported named impact draw');
  if(e.op==='grantOwnOtherTraitImpact'&&(
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   e.amount!==1||e.optional!==true||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','trait','amount','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid other-trait impact grant');
  if(e.op==='grantOwnNameBlockAtLeast'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','name','bp','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid named blocker ceiling');
  if(e.op==='grantPrintedBlockAtLeast'&&(
   e.name!=='ナツキ・スバル'||e.color!=='blue'||e.energy!==0||e.bp!==4000||
   e.optional!==true||Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','name','color','energy','bp','optional'].includes(k))))
   throw Error(path+'['+i+'] unsupported printed block ceiling');
  if(e.op==='moveOppFrontToEnergy'&&(
   e.optional!==true||e.lockIfEntry!=='ownEffect'||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','optional','lockIfEntry'].includes(k))))
   throw Error(path+'['+i+'] unsupported opponent front move');
  if(e.op==='oncePerTurnGate'){
   if(e.when!==undefined)assertLiveCondition(e.when,path+'['+i+'].when');
   if(!['card','name'].includes(e.scope)||typeof e.optional!=='boolean'||
    (e.ownTurnOnly!==undefined&&e.ownTurnOnly!==true)||
    !Array.isArray(e.then)||e.then.length<1||e.then.length>6||
    Object.keys(e).some(k=>!['op','scope','optional','then','ownTurnOnly','when'].includes(k))||
    e.then.some(x=>!['draw','millTop','peekTopOne','enemyBpDown',
     'restOppFrontUnderBp','restOppFrontOne','buffOwnField','searchDeckOne',
     'recoverOutsideOne','buffSelf','activeSelf','grantSelfAttackSkipThisTurn',
     'grantSelfSkipNextActive',
     'optionalPayApThen','deployOwnHandRestOrRaid','discardGate','ifLiveThen'].includes(x?.op)))
    throw Error(path+'['+i+'] invalid once-per-turn gate');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='grantOppBlockAtLeast'&&(
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid opponent blocker ceiling');
  if(e.op==='grantSelfAttackSkipThisTurn'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid this-turn attack skip grant');
  if(e.op==='activeOwnTraitLines'&&(
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   e.frontMax!==1||e.energyMax!==1||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','trait','frontMax','energyMax'].includes(k))))
   throw Error(path+'['+i+'] invalid dual-line trait ACTIVE');
  if(e.op==='activeSkipPair'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid skip-pair ACTIVE');
  if(e.op==='grantSelfSkipNextActive'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid self next-ACTIVE skip');
  if(e.op==='replayOnPlay'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid onPlay replay');
  if(e.op==='swapEnergyWithFrontSkip'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid energy skip swap');
  if(e.op==='deployOutsideFiltered'&&(
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   ![1,2].includes(e.count)||typeof e.ready!=='boolean'||e.optional!==true||
   (e.maxEnergy!==undefined&&(!integer(e.maxEnergy)||e.maxEnergy>30))||
   Object.keys(e).length!==(e.maxEnergy===undefined?5:6)||
   Object.keys(e).some(k=>!['op','trait','count','ready','optional','maxEnergy'].includes(k))))
   throw Error(path+'['+i+'] invalid filtered outside deployment');
  if(e.op==='ifLiveThen'){
   if(!e.when||!Array.isArray(e.then)||e.then.length!==1||
    !['buffOwnField','enemyFrontAllBpDown','recoverAp'].includes(e.then[0]?.op)||
    Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','when','then'].includes(k)))
    throw Error(path+'['+i+'] invalid live-condition follow-up');
   assertLiveCondition(e.when,path+'['+i+'].when');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='discardToDraw'&&(
   !integer(e.count,1)||e.count>10||typeof e.optional!=='boolean'||
   Object.keys(e).some(k=>!['op','count','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid discard cost/draw');
  if(e.op==='retireOppFrontAllUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||Object.keys(e).some(k=>!['op','bp'].includes(k))
  ))throw Error(path+'['+i+'] invalid simultaneous retirement threshold');
  if(e.op==='buffSelfIfFirstAttack'&&(
   !integer(e.bp,1)||e.bp>5000||Object.keys(e).some(k=>!['op','bp'].includes(k))
  ))throw Error(path+'['+i+'] invalid first-attack buff');
  if(e.op==='bounceOwnOtherUnderEnergy'){
   if(e.optional===true){
    if(Object.keys(e).length!==4||Object.keys(e).some(k=>!['op','optional','excludeName','after'].includes(k))||
     typeof e.excludeName!=='string'||!e.excludeName.trim()||e.excludeName.length>80||
     !Array.isArray(e.after)||e.after.length!==1||e.after[0]?.op!=='nextEligibleHandPlayApDiscount')
     throw Error('Invalid optional bounce prerequisite');
    verifyProgram(e.after,path+'['+i+'].after');
   }else if(!integer(e.energy)||e.energy>30||Object.keys(e).some(k=>!['op','energy'].includes(k)))
    throw Error(path+'['+i+'] invalid own bounce');
  }
  if(e.op==='recoverOutsideColorUnderEnergy'&&(
   typeof e.color!=='string'||!e.color.trim()||
   !integer(e.energy)||e.energy<0||e.energy>30||
   typeof e.optional!=='boolean'||
   Object.keys(e).some(k=>!['op','color','energy','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid color+energy recovery');
  if(e.op==='enemyFrontAllBpDown'&&(
   !integer(e.bp,1)||e.bp>5000||
   (e.minBp!==undefined&&(!integer(e.minBp,0)||e.minBp>50000))||
   (e.maxBp!==undefined&&(!integer(e.maxBp,0)||e.maxBp>50000))||
   (e.minBp!==undefined&&e.maxBp!==undefined&&e.minBp>e.maxBp)||
   Object.keys(e).some(k=>!['op','bp','minBp','maxBp'].includes(k))
  ))throw Error(path+'['+i+'] invalid simultaneous BP reduction');
  if(e.op==='buffOwnTraitAllTurn'&&(
   typeof e.trait!=='string'||!e.trait.trim()||
   !integer(e.bp,1)||e.bp>5000||
   Object.keys(e).some(k=>!['op','trait','bp'].includes(k))
  ))throw Error(path+'['+i+'] invalid all-trait temporary BP');
  if(e.op==='buffOwnField'){
   const f=e.filter;
   // field 'bp' is 元々のBP, the printed number, never the current total.
   const printedBp=!!f&&f.field==='bp'&&integer(f.value,0)&&f.value<=50000&&f.value%500===0;
   const textual=!!f&&['name','trait','color','type'].includes(f.field)&&
    typeof f.value==='string'&&!!f.value.trim()&&
    (f.field!=='type'||V2_CARD_TYPES.includes(f.value));
   if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).length!==2||
    !(printedBp||textual)||
    !integer(e.bp,1)||e.bp>5000||
    typeof e.optional!=='boolean'||typeof e.excludeSelf!=='boolean'||
    (e.color!==undefined&&!['blue','yellow','green','purple','red'].includes(e.color))||
    (e.untilName!==undefined&&(typeof e.untilName!=='string'||!e.untilName.trim()||e.untilName.length>80))||
    Object.keys(e).some(k=>!['op','filter','bp','optional','excludeSelf','color','untilName'].includes(k)))
    throw Error(path+'['+i+'] invalid own-field BP choice');
  }
  if(e.op==='buffEitherOther'&&(
   !integer(e.bp,1)||e.bp>5000||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid either-field BP choice');
  if(e.op==='removeNamedOutsideActive'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','name'].includes(k))
  ))throw Error(path+'['+i+'] invalid named outside removal');
  if(e.op==='payHandOrRestForNamed'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','name'].includes(k))
  ))throw Error(path+'['+i+'] invalid hand-or-rest named recovery');
  if(e.op==='returnPrintedActiveBuff'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !['blue','yellow','green','purple','red'].includes(e.color)||
   !integer(e.energy)||e.energy>30||
   !integer(e.bp,1)||e.bp>5000||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','color','energy','bp'].includes(k))
  ))throw Error(path+'['+i+'] invalid printed return then active');
  if(e.op==='buffOwnTrait'&&(
   typeof e.trait!=='string'||!e.trait.trim()||
   !integer(e.bp,1)||e.bp>5000||e.optional!==true||
   Object.keys(e).some(k=>!['op','trait','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid optional trait BP boost');
  if(e.op==='drawIfRaidUnderFacedown'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] unsupported conditional Raid draw options');
  if(e.op==='retireOppFrontIfFacedown'&&(
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid facedown retirement effect');
  if(e.op==='conditionalBounceOrRetireByOwnOutsideNames'&&(
   !integer(e.bp,1)||e.bp>50000||!integer(e.min,1)||e.min>200||
   !Array.isArray(e.names)||e.names.length<1||e.names.length>8||
   e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   new Set(e.names).size!==e.names.length||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','bp','min','names'].includes(k))
  ))throw Error(path+'['+i+'] invalid conditional named OUTSIDE effect');
  if(e.op==='retireOppFrontOneUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid optional BP-limited opponent retirement');
  if(e.op==='retireOppFrontOne'&&(
   e.optional!==true||(e.entry!==undefined&&e.entry!=='ownEffect')||
   Object.keys(e).length!==2+Number(e.entry!==undefined)||
   Object.keys(e).some(k=>!['op','optional','entry'].includes(k))))
   throw Error(path+'['+i+'] invalid optional opponent front retirement');
  if(e.op==='recoverOutsideCharacterUnderEnergy'&&(
   !integer(e.energy)||e.energy>30||typeof e.optional!=='boolean'||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','energy','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid character energy recovery');
  if(e.op==='payApDiscardOutsideRaid'&&(
   e.ap!==1||!['blue','yellow','green','purple','red'].includes(e.color)||
   !integer(e.energy,1)||e.energy>30||typeof e.name!=='string'||!e.name.trim()||
   e.name.length>80||Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','ap','color','energy','name'].includes(k))))
   throw Error(path+'['+i+'] invalid AP discard outside Raid');
  if(e.op==='drawTuckHandUnder'&&(
   e.count!==1||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))))
   throw Error(path+'['+i+'] invalid attack draw and hand tuck');
  if(e.op==='chainRaidHand'&&(
   e.optional!==true||!integer(e.facedown,1)||e.facedown>4||
   !['blue','yellow','green','purple','red'].includes(e.color)||
   !integer(e.energy,1)||e.energy>30||typeof e.name!=='string'||!e.name.trim()||
   e.name.length>80||Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','optional','facedown','color','energy','name'].includes(k))))
   throw Error(path+'['+i+'] invalid attack-end chain Raid');
  if(e.op==='stripOppRaidTop'&&(e.optional!==true||Object.keys(e).length!==2||Object.keys(e).some(k=>!['op','optional'].includes(k))))throw Error(path+'['+i+'] invalid optional opponent RAID-top strip');
  if(e.op==='optionalRetireThenProgram'){
   if(e.optional!==true||!['character','field'].includes(e.cardType)||
    !Array.isArray(e.after)||e.after.length<1||e.after.length>2||
    e.after.at(-1)?.op!=='searchTopUpToTwoBottom'||
    (e.after.length===2&&(e.cardType!=='field'||e.after[0]?.op!=='activeSelfIf'))||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','optional','cardType','after'].includes(k)))
    throw Error(path+'['+i+'] invalid optional retirement continuation');
   verifyProgram(e.after,path+'['+i+'].after');
  }
  if(e.op==='activeOwnTrait'&&(
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   e.optional!==true||e.max!==1||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','trait','optional','max'].includes(k))))
   throw Error(path+'['+i+'] invalid own-trait ACTIVE');
  if(e.op==='retireSourceOnPhaseEnd'&&Object.keys(e).length!==1)throw Error(path+'['+i+'] invalid phase self retirement');
  if(e.op==='retireOwnCharacterOne'){
   const legacyDraw=e.after?.length===1&&e.after[0]?.op==='draw'&&
    Number.isInteger(e.after[0].count)&&e.after[0].count>=1&&e.after[0].count<=5&&
    e.excludeSelf===undefined;
   const otherThenField=e.excludeSelf===true&&e.after?.length===1&&
    e.after[0]?.op==='deployNamedFromZones'&&
    e.after[0].cardType==='field'&&e.after[0].line==='energy'&&
    e.after[0].ready===true;
   if(e.optional!==true||!Array.isArray(e.after)||!legacyDraw&&!otherThenField||
    Object.keys(e).length!==(otherThenField?4:3)||
    Object.keys(e).some(k=>!['op','optional','after','excludeSelf'].includes(k)))
    throw Error(path+'['+i+'] invalid own character retirement and follow-up');
   verifyProgram(e.after,path+'['+i+'].after');
  }
  if(e.op==='retireOwnFieldOne'&&(e.optional!==true||
    Object.keys(e).some(k=>!['op','optional'].includes(k))))
    throw Error(path+'['+i+'] invalid optional own field retirement');
   if(e.op==='restSilenceOppFrontIfOwnOutsideField'&&(
    e.optional!==true||Object.keys(e).some(k=>!['op','optional'].includes(k))
   ))throw Error(path+'['+i+'] invalid conditional printed silence');
   if(e.op==='restOrRetireOppFrontByLife'&&(
    !integer(e.bp,1)||e.bp>50000||!integer(e.lifeAtMost,0)||e.lifeAtMost>20||
    typeof e.optional!=='boolean'||
    Object.keys(e).some(k=>!['op','bp','lifeAtMost','optional'].includes(k))
   ))throw Error(path+'['+i+'] invalid LIFE-gated REST or retirement');
   if(e.op==='skipNextActiveOppRest'&&(
   typeof e.optional!=='boolean'||Object.keys(e).some(k=>!['op','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid existing-REST ACTIVE skip');
  if(e.op==='nextEligibleHandPlayApDiscount'){
   if(Object.keys(e).length!==2||!Object.hasOwn(e,'filter'))throw Error('Invalid hand discount operation');
   validatePrintedPlayFilter(e.filter);
  }
  if(e.op==='grantFrontEnergyOwnOtherFrontTrait'&&(
    e.optional!==true||e.until!=='thisTurn'||
    typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','optional','until','trait'].includes(k))
   ))throw Error(path+'['+i+'] invalid temporary FRONT generation grant');
  // Same protection choice for EVENT and character sources, with optional
  // name-based follow-up AP activation. Source/UID checks live in reducer.
  if(e.op==='grantOwnFrontChoiceProtection'&&(
    !['any','character','trigger'].includes(e.scope)||
    e.until!=='nextOwnStart'||e.optional!==false||
    !(e.apRecoveryOnName===null||
      typeof e.apRecoveryOnName==='string'&&
      !!e.apRecoveryOnName.trim()&&e.apRecoveryOnName.length<=80)||
    Object.keys(e).length!==5||
    Object.keys(e).some(k=>!['op','scope','until','optional','apRecoveryOnName'].includes(k))
   ))throw Error(path+'['+i+'] invalid FRONT choice protection grant');
  if(e.op==='grantSelectionApTaxOwnOtherTrait'&&(
    e.optional!==true||e.until!=='nextOpponentTurn'||
    typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','optional','until','trait'].includes(k))
   ))throw Error(path+'['+i+'] invalid shared targeting AP tax grant');
   if(e.op==='forbidAttackOppFrontOne'&&(
   e.optional!==true||e.ownTurnOnly!==true||e.until!=='nextOwnTurnStart'||
   Object.keys(e).length!==4||Object.keys(e).some(k=>
    !['op','optional','ownTurnOnly','until'].includes(k))
  ))throw Error(path+'['+i+'] invalid temporary attack prohibition');
  if(e.op==='restOppFrontByOutsideEvents'&&(
   e.min!==4||e.skipMin!==8||e.optional!==true||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','min','skipMin','optional'].includes(k))))
   throw Error(path+'['+i+'] unsupported outside-event front rest');
  if(e.op==='restOppFrontOne'&&(
   typeof e.optional!=='boolean'||
   (e.skipNextActive!==undefined&&e.skipNextActive!==true)||
   (e.entry!==undefined&&e.entry!=='ownCharacter')||
   Object.keys(e).some(k=>!['op','optional','skipNextActive','entry'].includes(k))
  ))throw Error(path+'['+i+'] invalid uncapped opponent REST target');
  if(e.op==='restOppFrontUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||typeof e.optional!=='boolean'||
   (e.skipNextActive!==undefined&&e.skipNextActive!==true)||
   Object.keys(e).some(k=>!['op','bp','optional','skipNextActive'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent REST optionality/profile');
  // Current BP at least N. This is not restOppFrontUnderBp: that op is <=.
  // The audited print is optional and chooses at most one front character.
  if(e.op==='restOppFrontBpAtLeast'&&(
   !integer(e.bp,500)||e.bp>50000||e.bp%500!==0||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent BP-at-least REST');
  if(e.op==='retireOppFrontUnderBp'||e.op==='removeOppFrontUnderBp'){
   const namedRaid=Array.isArray(e.bonusNames)&&e.bonusRaidBase===true&&
    e.bonusName===undefined&&e.bonusOutsideName===undefined;
   const scaled=e.op==='retireOppFrontUnderBp'&&e.scaleTrait!==undefined;
   const plain=e.bonusName===undefined&&e.bonusBp===undefined&&e.bonusOutsideName===undefined&&!namedRaid&&!scaled;
   if(namedRaid){
    if(!integer(e.bp,1)||e.bp>50000||!integer(e.bonusBp,e.bp)||e.bonusBp>50000||
     e.bonusNames.length<1||e.bonusNames.length>3||
     new Set(e.bonusNames).size!==e.bonusNames.length||
     e.bonusNames.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
     Object.keys(e).length!==5||
     Object.keys(e).some(k=>!['op','bp','bonusNames','bonusBp','bonusRaidBase'].includes(k)))
     throw Error(path+'['+i+'] unsupported printed BP retirement profile');
   }else if(plain){
    if(!integer(e.bp,1)||e.bp>50000||Object.keys(e).some(k=>!['op','bp'].includes(k)))
     throw Error(path+'['+i+'] unsupported printed BP retirement profile');
   }else if(scaled){
    if(!integer(e.bp,1)||e.bp>50000||typeof e.scaleTrait!=='string'||
     !e.scaleTrait.trim()||e.scaleTrait.length>80||
     !integer(e.scaleMin,2)||e.scaleMin>8||
     !integer(e.scaleBp,e.bp+1)||e.scaleBp>50000||
     Object.keys(e).some(k=>!['op','bp','scaleTrait','scaleMin','scaleBp'].includes(k)))
     throw Error(path+'['+i+'] unsupported printed BP retirement profile');
   }else if(!integer(e.bp,1)||e.bp>50000||typeof e.bonusName!=='string'||
    !e.bonusName.trim()||!integer(e.bonusBp,e.bp)||e.bonusBp>50000||
    (e.bonusOutsideName!==undefined&&(typeof e.bonusOutsideName!=='string'||
     !e.bonusOutsideName.trim()||e.bonusOutsideName.length>80))||
    Object.keys(e).some(k=>!['op','bp','bonusName','bonusBp','bonusOutsideName'].includes(k)))
    throw Error(path+'['+i+'] unsupported printed BP retirement profile');
  }
  if(e.op==='retireOppFrontTiered'){
   const tiers=e.tiers;
   const namesOk=list=>Array.isArray(list)&&list.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80);
   if(e.bp!==3000||!Array.isArray(tiers)||tiers.length!==2||
    !namesOk(tiers[0]?.names)||tiers[0].names.length!==1||tiers[0].names[0]!=='ベアトリス'||
    tiers[0].bp!==4000||Object.keys(tiers[0]).length!==2||
    !namesOk(tiers[1]?.names)||tiers[1].names.length!==2||
    tiers[1].names[0]!=='ベアトリス'||tiers[1].names[1]!=='ナツキ・スバル'||
    tiers[1].bp!==5000||Object.keys(tiers[1]).length!==2||
    Object.keys(e).length!==3||Object.keys(e).some(k=>!['op','bp','tiers'].includes(k)))
    throw Error(path+'['+i+'] unsupported tiered front retirement');
  }
  if(e.op==='peekTopOne'&&Object.keys(e).some(key=>key!=='op'))throw Error(path+'['+i+'] unsupported private peek options');
  if(e.op==='recoverAp'){
   const keys=Object.keys(e);
   const plain=!own(e,'require')&&integer(e.count,1)&&e.count<=3&&
    keys.every(k=>k==='op'||k==='count');
   const gated=e.require==='ownEventUsed'&&e.count===1&&
    keys.every(k=>k==='op'||k==='count'||k==='require');
   if(!(plain||gated))throw Error(path+'['+i+'] invalid AP recovery count');
  }
  if(e.op==='drawDiscard'&&(
   (e.discardCount===undefined&&e.count!==1)||
   (e.discardCount!==undefined&&(!integer(e.discardCount,1)||e.discardCount>10))||
   Object.keys(e).some(k=>!['op','count','discardCount'].includes(k))
  ))throw Error(path+'['+i+'] invalid mandatory draw/discard profile');
  if(e.op==='drawDiscardIfEveryOwnCharacterNamed'&&(
   e.count!==1||e.name!=='レム'||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','count','name'].includes(k))))
   throw Error(path+'['+i+'] unsupported all-Rem draw');
  if(['buffSelf','enemyBpDown'].includes(e.op)&&(!integer(e.bp,1)||e.bp>5000))throw Error(path+'['+i+'] invalid temporary BP');
  if(e.op==='moveOtherAcrossOrRemove'&&(
   e.optional!==true||typeof e.excludeName!=='string'||!e.excludeName.trim()||
   e.excludeName.length>80||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','optional','excludeName'].includes(k))))
   throw Error(path+'['+i+'] invalid other-character line move');
  if(e.op==='raidBaseEnergyThen'&&(
   !integer(e.minEnergy,1)||e.minEnergy>10||
   !Array.isArray(e.then)||e.then.length<1||e.then.length>4||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','minEnergy','then'].includes(k))||
   e.then.some(x=>!['buffSelf','grantSelfAttackDamageThisTurn'].includes(x?.op))))
   throw Error(path+'['+i+'] invalid raid-base energy gate');
  if(e.op==='raidBaseEnergyThen')verifyProgram(e.then,path+'['+i+'].then');
  if(e.op==='grantSelfAttackDamageThisTurn'&&(
   e.amount!==2||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','amount'].includes(k))))
   throw Error(path+'['+i+'] invalid this-turn earned attack damage');
  if(e.op==='restOppFrontLockActive'&&(
   e.optional!==true||!e.upgrade||typeof e.upgrade!=='object'||Array.isArray(e.upgrade)||
   typeof e.upgrade.trait!=='string'||!e.upgrade.trait.trim()||e.upgrade.trait.length>80||
   !integer(e.upgrade.minOthers,1)||e.upgrade.minOthers>8||e.upgrade.also!=='energy'||
   Object.keys(e.upgrade).length!==3||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','optional','upgrade'].includes(k))))
   throw Error(path+'['+i+'] invalid front rest lock');
  if(e.op==='grantOnAttack'&&(
   !['self','ownCharacter'].includes(e.target)||e.optional!==true||e.until!=='endOfTurn'||
   !Array.isArray(e.then)||e.then.length!==1||e.then[0]?.op!=='draw'||
   e.then[0]?.count!==1||Object.keys(e.then[0]).length!==2||
   (e.name!==undefined&&(e.target!=='ownCharacter'||typeof e.name!=='string'||
    !e.name.trim()||e.name.length>80))||
   Object.keys(e).length!==(e.name===undefined?5:6)||
   Object.keys(e).some(k=>!['op','target','optional','until','then','name'].includes(k))
  ))throw Error(path+'['+i+'] invalid granted attack program');
  if(e.op==='enemyBpDown'&&(
   (e.maxTargets!==undefined&&(
    e.maxTargets!==2||e.optional!==true||e.zone==='field'))||
   (e.optional!==undefined&&typeof e.optional!=='boolean')||
   (e.minBp!==undefined&&(!integer(e.minBp,0)||e.minBp>50000))||
   (e.maxBp!==undefined&&(!integer(e.maxBp,0)||e.maxBp>50000))||
   (e.minBp!==undefined&&e.maxBp!==undefined&&e.minBp>e.maxBp)||
   (e.zone!==undefined&&e.zone!=='front'&&e.zone!=='field')||
   Object.keys(e).some(k=>!['op','bp','optional','minBp','maxBp','zone','maxTargets'].includes(k))
  ))throw Error(path+'['+i+'] invalid optional targeting flag');
  if(e.op==='activeSelfIf'&&(
   (e.when===undefined&&e.entry===undefined&&e.line===undefined)||
   (e.entry!==undefined&&e.entry!=='ownEffect')||
   (e.line!==undefined&&!['front','energy'].includes(e.line))||
   Object.keys(e).some(k=>!['op','when','entry','line'].includes(k))
  ))throw Error(path+'['+i+'] invalid conditional ACTIVE entry');
  if(e.op==='activeSelfIf'&&e.when!==undefined)
   assertLiveCondition(e.when,path+'['+i+'].when');
  if(e.op==='grantCauseBlockAtMost'&&(
   !integer(e.bp,500)||e.bp>20000||e.bp%500!==0||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid caused blocker floor');
  if(e.op==='handBottomGrantDoubleAttack'&&(
   e.optional!==true||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid hand-bottom double attack');
  if(e.op==='payApDeployMovedActive'&&(
   e.ap!==1||e.optional!==true||e.minEnergy!==4||e.energyColor!=='blue'||
   e.once!=='name'||typeof e.exclusiveTrait!=='string'||!e.exclusiveTrait.trim()||
   e.exclusiveTrait.length>40||Object.keys(e).length!==7||
   Object.keys(e).some(k=>!['op','ap','optional','minEnergy','energyColor','exclusiveTrait','once'].includes(k))))
   throw Error(path+'['+i+'] invalid moved-card active entry');
  if((e.op==='noteEntryTurn'||e.op==='grantSelfEnergyMoveOnAttackStart'||
    e.op==='grantSelfTriggerUnchosen')&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid unmarked self grant');
  if(e.op==='buffOwnOtherScaled'&&(
   e.optional!==true||e.bp!==1000||e.scaledBp!==1500||e.raidBase!==true||
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','optional','bp','scaledBp','name','raidBase'].includes(k))))
   throw Error(path+'['+i+'] invalid scaled ally BP');
  if(e.op==='lookTakeOrdered'&&(
   e.count!==6||e.takeName!=='ニア'||e.takeEnergy!==8||e.discardMin!==1||
   e.retireEnergySum!==15||Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','count','takeName','takeEnergy','discardMin','retireEnergySum'].includes(k))))
   throw Error(path+'['+i+'] invalid ordered look');
  if(e.op==='facedownEntryScale'&&(
   e.retireAt!==1||e.retireBp!==5000||e.activeApAt!==3||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','retireAt','retireBp','activeApAt'].includes(k))))
   throw Error(path+'['+i+'] invalid facedown entry scale');
  if(e.op==='maySpendFacedown'&&(
   e.count!==2||(e.damage!==2&&e.retire!==true)||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','count','damage','retire'].includes(k))))
   throw Error(path+'['+i+'] invalid facedown attack cost');
  if(e.op==='galaxyBurstEntry'&&(
   e.bp!==5000||e.apEnergy!==20||e.drawEnergy!==50||e.draw!==2||e.once!=='name'||
   Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','bp','apEnergy','drawEnergy','draw','once'].includes(k))))
   throw Error(path+'['+i+'] invalid galaxy entry');
  if(e.op==='mayAbsorbFront'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid front absorb');
  if(e.op==='simonLowEntry'&&(
   e.name!=='シモン'||e.maxEnergy!==2||e.color!=='red'||e.deckAtMost!==20||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','maxEnergy','color','deckAtMost'].includes(k))))
   throw Error(path+'['+i+'] invalid low Simon entry');
  if(e.op==='replayNamedEntry'&&(
   e.name!=='シモン'||e.maxEnergy!==3||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','maxEnergy'].includes(k))))
   throw Error(path+'['+i+'] invalid entry replay');
  if(e.op==='mayRaidOntoSelf'&&(
   !Array.isArray(e.names)||e.names.length!==2||e.names[0]!=='ラガン'||
   e.names[1]!=='グレンラガン'||e.color!=='red'||e.bp!==1000||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','names','color','bp'].includes(k))))
   throw Error(path+'['+i+'] invalid attack-end raid');
  if(e.op==='lagannEntryLadder'&&Object.keys(e).length!==1)
   throw Error(path+'['+i+'] invalid Lagann entry ladder');
  if(e.op==='mayStepFrontFromEnergy'&&(
   e.optional!==true||e.bp!==1000||e.once!=='name'||
   e.nameContains!=='グレンラガン'||Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','optional','bp','once','nameContains'].includes(k))))
   throw Error(path+'['+i+'] invalid facedown energy-to-front move');
  if(e.op==='outsideColorEnergyHandOrRest'&&(
   !['blue','green','red','yellow','purple'].includes(e.color)||
   !integer(e.energy)||e.energy>30||e.optional!==true||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','color','energy','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid outside hand-or-rest entry');
 }
}
// Explicit conditional benefits are pure board queries. No generic card-text
// inference, no effect queue, no cached energy or BP modifier.
function validatePassiveBonuses(card){
 const entries=card.passiveBonuses;
 if(entries===undefined)return null;
 if(card.type==='event'||!Array.isArray(entries)||!entries.length||entries.length>3)
  throw Error(card.id+' unsupported passive bonuses');
 for(const p of entries){
  if(!p||typeof p!=='object'||Array.isArray(p)||!p.condition||
   Object.keys(p).some(k=>!['condition','bp','extraEnergy','extraDamage','impact','bpEach','impactNull'].includes(k))||
   (p.bp===undefined&&p.extraEnergy===undefined&&p.extraDamage===undefined&&p.impact===undefined&&p.bpEach===undefined&&p.impactNull===undefined)||
   (p.bp!==undefined&&(
    p.condition?.kind==='ownNameAbsent'
     ?(!Number.isInteger(p.bp)||p.bp>=0||p.bp<-5000||p.bp%500!==0)
     :(!integer(p.bp,1)||p.bp>5000)))||
   (p.extraEnergy!==undefined&&(!integer(p.extraEnergy,1)||p.extraEnergy>3))||
   (p.extraDamage!==undefined&&(!integer(p.extraDamage,1)||
    (p.extraDamage!==1&&p.extraDamage!==2&&p.extraDamage!==6)))||
   (p.impact!==undefined&&p.impact!==1)||
   (p.impactNull!==undefined&&p.impactNull!==true)||
   (p.bpEach!==undefined&&(!integer(p.bpEach,1)||p.bpEach>5000||p.bpEach%500!==0||
    p.bp!==undefined||p.extraEnergy!==undefined||p.extraDamage!==undefined||p.impact!==undefined||p.impactNull!==undefined)))
    throw Error(card.id+' invalid passive bonus');
  // 【インパクト（1）】 from a live condition is not added on top of a
  // printed impact keyword or a facedown-under impact. No FAQ stacks them.
  if(p.impact===1&&(card.printedImpact||card.conditionalUnderFaceDown?.impact))
   throw Error(card.id+' conditional impact does not stack with a printed impact profile');
  if(p.impactNull===true&&card.impactNull)
   throw Error(card.id+' passive impact null does not stack with printed impact null');
  const q=p.condition;
  if(p.extraDamage!==undefined&&(card.type!=='character'||q.turn!=='own'))
   throw Error(card.id+' extra damage must be printed own-turn character bonus');
  assertLiveCondition(q,card.id);
  if(q.kind==='ownNameAbsent'&&(p.bp===undefined||p.extraEnergy!==undefined||
   p.extraDamage!==undefined||p.impact!==undefined||p.bpEach!==undefined||p.impactNull!==undefined))
   throw Error(card.id+' name-absence penalty is BP only');
  if((q.kind==='ownRestPrintedBpAtMost'||q.kind==='oppRestCharacterCount')!==(p.bpEach!==undefined))
   throw Error(card.id+' per-card printed BP bonus needs bpEach');
  if(p.extraEnergy!==undefined&&q.kind==='ownEnergyAtLeast')
   throw Error(card.id+' invalid or cyclic passive condition');
 }
 return Object.freeze(entries.map(p=>Object.freeze({...p,
  condition:Object.freeze({...p.condition,
   ...(p.condition.kind==='ownFieldHasAllNames'||p.condition.kind==='ownAnyNameExists'?{names:Object.freeze([...p.condition.names])}:{})})})));
}
function normalize(card,packId){
 if(!card||typeof card!=='object'||Array.isArray(card)||typeof card.id!=='string'||!card.id.trim())
  throw Error('Invalid card identifier');
 if(!V2_CARD_TYPES.includes(card.type))throw Error(card.id+' unsupported type');
 if(!integer(card.energy)||card.energy>100||!integer(card.ap,1)||card.ap>3||
   !integer(card.bp)||!integer(card.gen)||card.gen>10||
   typeof card.color!=='string'||!card.color.trim()||typeof card.name!=='string'||!card.name.trim())
  throw Error(card.id+' invalid printed characteristics');
 // Extra official names. They never replace card.name or card.id.
 const nameAliases=card.nameAliases;
 if(nameAliases!==undefined&&(!Array.isArray(nameAliases)||!nameAliases.length||
  nameAliases.length>3||nameAliases.some(n=>typeof n!=='string'||!n.trim()||
   n.length>80||n===card.name)||new Set(nameAliases).size!==nameAliases.length))
  throw Error(card.id+' invalid printed name aliases');
 if(card.trigger!=null&&!V2_TRIGGERS.includes(card.trigger))
  throw Error(card.id+' trigger not yet supported by universal v2 (fail closed)');
 if(card.raidBaseNames!==undefined&&(
  !card.raidName||!Array.isArray(card.raidBaseNames)||card.raidBaseNames.length<2||
  !card.raidBaseNames.includes(card.raidName)||
  card.raidBaseNames.some(x=>typeof x!=='string'||!x.trim())||
  new Set(card.raidBaseNames).size!==card.raidBaseNames.length
 ))throw Error(card.id+' invalid alternative Raid bases');
 if(card.raidRequiresNames!==undefined&&(
  !card.raidName||!Array.isArray(card.raidRequiresNames)||!card.raidRequiresNames.length||
  card.raidRequiresNames.some(x=>typeof x!=='string'||!x.trim())||
  new Set(card.raidRequiresNames).size!==card.raidRequiresNames.length
 ))throw Error(card.id+' invalid named Raid prerequisite');
 const underProfile=card.conditionalUnderFaceDown??null;
 if(underProfile!==null&&(
  card.type!=='character'||!card.raidName||
  !integer(underProfile.bp,1)||underProfile.bp>5000||
  underProfile.impact!==1||
  !integer(underProfile.leaveReplacementMinBp,1)||underProfile.leaveReplacementMinBp>5000||
  Object.keys(underProfile).some(k=>!['bp','impact','leaveReplacementMinBp'].includes(k))
 ))throw Error(card.id+' unsupported facedown under-card profile');
 if(card.raidFromRaid!==undefined&&(
  !card.raidName||card.type!=='character'||
  !Array.isArray(card.raidFromRaid)||!card.raidFromRaid.length||
  card.raidFromRaid.some(n=>typeof n!=='string'||!n.trim())||
  new Set(card.raidFromRaid).size!==card.raidFromRaid.length
 ))throw Error(card.id+' invalid explicitly permitted re-Raid names');
 if(card.raidName!=null&&(card.type!=='character'||typeof card.raidName!=='string'||!card.raidName.trim()))
  throw Error(card.id+' invalid Raid target');
 if(card.raidTrait!==undefined&&(card.type!=='character'||card.raidName||
  typeof card.raidTrait!=='string'||!card.raidTrait.trim()||card.raidTrait.length>40))
  throw Error(card.id+' invalid trait Raid');
 if((card.attackEnergyMin!==undefined||card.blockEnergyMin!==undefined)&&(
  card.type!=='character'||
  (card.attackEnergyMin!==undefined&&(!integer(card.attackEnergyMin,1)||card.attackEnergyMin>30))||
  (card.blockEnergyMin!==undefined&&(!integer(card.blockEnergyMin,1)||card.blockEnergyMin>30))))
  throw Error(card.id+' invalid energy attack or block gate');
 // A trigger is not inferred from its icon alone when printed handling varies.
 // Only these explicit profiles have full runtime handlers in this milestone.
 const triggerEffect=card.triggerEffect??null;
 if(card.traits!==undefined&&(!Array.isArray(card.traits)||
  card.traits.some(v=>typeof v!=='string'||!v.trim())))
  throw Error(card.id+' invalid printed traits');
 const traitComponents=card.traitComponents;
 // Source-verified composite meaning, not guessed from arbitrary slash strings.
 // Preserve printed traits as written; explicitly typed components count as
 // separate affinities only where the title adapter pins the official proof.
 if(traitComponents!==undefined&&(
  !Array.isArray(traitComponents)||traitComponents.length<2||traitComponents.length>3||
  traitComponents.some(x=>typeof x!=='string'||!x.trim()||x!==x.trim())||
  new Set(traitComponents).size!==traitComponents.length||
  !Array.isArray(card.traits)||card.traits.length!==1||
  card.traits[0].split(/[／/]/).map(x=>x.trim()).join('／')!==traitComponents.join('／')
 ))throw Error(card.id+' invalid audited compound traits');
 if(card.trigger==='special'){
  if(!triggerEffect||triggerEffect.op!=='retireOppFront'||Object.keys(triggerEffect).some(k=>k!=='op'))
   throw Error(card.id+' SPECIAL requires explicit supported target profile');
 }else if(card.trigger==='color'){
  const retired=triggerEffect?.op==='retireOppFrontUnderBp'&&
   integer(triggerEffect.bp,1)&&triggerEffect.bp<=50000&&
   Object.keys(triggerEffect).every(k=>['op','bp'].includes(k));
  const restSkip=triggerEffect?.op==='restOppFrontSkipNextActive'&&
   Object.keys(triggerEffect).length===1;
  // Official COLOR return-to-hand effects share physical Raid/Q62 handling.
  // Never treat this as retirement or extend eligibility past printed BP.
  const bounced=triggerEffect?.op==='bounceOppFrontUnderBp'&&
   integer(triggerEffect.bp,1)&&triggerEffect.bp<=50000&&
   Object.keys(triggerEffect).length===2;
  const deploy=(from)=>triggerEffect?.op===from&&
   typeof triggerEffect.color==='string'&&!!triggerEffect.color.trim()&&
   integer(triggerEffect.maxEnergy)&&triggerEffect.maxEnergy<=30&&
   integer(triggerEffect.ap,1)&&triggerEffect.ap<=3&&
   (from==='deployOutsideCharacter'?triggerEffect.frontOnly===true:true)&&
   Object.keys(triggerEffect).every(k=>['op','color','maxEnergy','ap',
    ...(from==='deployOutsideCharacter'?['frontOnly']:[])].includes(k));
  if(!retired&&!restSkip&&!bounced&&!deploy('deployHandCharacter')&&!deploy('deployOutsideCharacter'))
   throw Error(card.id+' COLOR requires supported printed deployment/retirement/return profile');
 }else if(card.trigger==='raid'){
  if(!card.raidName||card.type!=='character'||triggerEffect!=null)
   throw Error(card.id+' RAID trigger requires explicitly registered Raid character');
 }else if(triggerEffect!=null)throw Error(card.id+' unexpected trigger effect definition');
 // Main-action selectors must be fully explicit: unknown card text is not
 // assumed to behave like the Kamina choose-up-to-two ability.
 // Printed follow-up applies only to the card recovered by its own controller.
 const ownOutsideRecovery=card.ownOutsideRecovery??null;
 const recoveryRest=ownOutsideRecovery?.op==='restSelfToEnergy'&&
  ownOutsideRecovery.optional===true&&ownOutsideRecovery.rest===true&&
  Object.keys(ownOutsideRecovery).length===3&&
  Object.keys(ownOutsideRecovery).every(k=>['op','optional','rest'].includes(k));
 const recoveryMeet=ownOutsideRecovery?.op==='playSelfMeetEnergy'&&
  ownOutsideRecovery.optional===true&&
  typeof ownOutsideRecovery.activeSourceName==='string'&&
  !!ownOutsideRecovery.activeSourceName.trim()&&
  ownOutsideRecovery.activeSourceName.length<=80&&
  Object.keys(ownOutsideRecovery).length===3&&
  Object.keys(ownOutsideRecovery).every(k=>['op','optional','activeSourceName'].includes(k));
 if(ownOutsideRecovery!==null&&(card.type!=='character'||!(recoveryRest||recoveryMeet)))
  throw Error(card.id+' unsupported own-outside recovery entry');
 if(card.enterActiveIfOpponentRest!==undefined&&
    (card.type!=='character'||card.enterActiveIfOpponentRest!==true))
   throw Error(card.id+' invalid conditional ACTIVE entry');
  if(card.enterAlwaysActive!==undefined&&
    (!['character','field'].includes(card.type)||card.enterAlwaysActive!==true||
     card.enterActiveIfOpponentRest===true))
   throw Error(card.id+' invalid unconditional ACTIVE entry');
  if(card.frontForbidden!==undefined&&(card.type!=='character'||card.frontForbidden!==true))
  throw Error(card.id+' invalid front-line restriction');
 const colorTriggerFieldSubstitution=card.colorTriggerFieldSubstitution??null;
 if(colorTriggerFieldSubstitution!==null&&
  (card.type!=='character'||card.color!==colorTriggerFieldSubstitution||
   typeof colorTriggerFieldSubstitution!=='string'||!colorTriggerFieldSubstitution.trim()))
  throw Error(card.id+' invalid live COLOR field-substitution profile');
 const mainAbility=card.mainAbility??null;
 // Generic printed FIELD cost: REST itself, truly retire it, then one optional
 // name-filtered CHARACTER from OWN OUTSIDE enters ACTIVE ENERGY for no AP.
 const fieldRestRetireThen=mainAbility?.op==='fieldRestRetireThen'&&
  card.type==='field'&&Object.keys(mainAbility).length===2&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='deployNamedFromZones'&&
  mainAbility.then[0].zones?.length===1&&mainAbility.then[0].zones[0]==='outside'&&
  mainAbility.then[0].line==='energy'&&mainAbility.then[0].ready===true&&
  mainAbility.then[0].optional===true&&
  mainAbility.then[0].color!==undefined&&
  mainAbility.then[0].ap===1;
 if(fieldRestRetireThen)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const fieldPeek=mainAbility?.op==='restSelfThen'&&
  card.type==='field'&&mainAbility.frontOnly===false&&mainAbility.oncePerTurn===true&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='peekTopOrBottom'&&Object.keys(mainAbility.then[0]).length===1&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(fieldPeek)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const fieldRestDrawTop=mainAbility?.op==='restSelfThen'&&
  card.type==='field'&&mainAbility.frontOnly===false&&mainAbility.oncePerTurn===true&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='drawHandTop'&&Object.keys(mainAbility.then[0]).length===1&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(fieldRestDrawTop)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 // Two independently printed MAIN 「ターン1」 on the same FIELD source.
 // Name-shared once accounting lives in the engine, not title-specific cases.
 const fieldDualMain=mainAbility?.op==='fieldDualMain'&&
  card.type==='field'&&
  ['retireTrait','buffTrait','buffName'].every(k=>
   typeof mainAbility[k]==='string'&&!!mainAbility[k].trim()&&mainAbility[k].length<=80)&&
  Number.isInteger(mainAbility.bp)&&mainAbility.bp>=1&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','retireTrait','buffTrait','buffName','bp'].includes(k));
 const mainRaid=mainAbility?.op==='chooseTwoAfterOwnRaid'&&
  mainAbility.frontOnly===true&&mainAbility.readyOncePerName===true&&
  typeof mainAbility.trait==='string'&&!!mainAbility.trait.trim()&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','readyOncePerName','trait','bp'].includes(k));
 const mainRetireField=mainAbility?.op==='retireOwnFieldThen'&&
  mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  Array.isArray(mainAbility.after)&&mainAbility.after.length===1&&
  ['buffSelf','draw'].includes(mainAbility.after[0]?.op)&&
  (mainAbility.optional===undefined||mainAbility.optional===true)&&
  Object.keys(mainAbility).length===(mainAbility.optional===undefined?4:5)&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','after','optional'].includes(k));
 if(mainRetireField)verifyProgram(mainAbility.after,card.id+'.mainAbility.after');
 const mainRetireReady=mainAbility?.op==='readySelfIfOwnRetiredThisTurn'&&
  mainAbility.readyOncePerName===true&&['field','character'].includes(mainAbility.cardType)&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','cardType','readyOncePerName'].includes(k));
 const mainSelfRest=mainAbility?.op==='restSelfThenRestOppFrontOne'&&
  mainAbility.frontOnly===true&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','frontOnly'].includes(k));
 const mainEnergyRetire=mainAbility?.op==='restSelfGainEnergyRetireEndMain'&&
  mainAbility.energyOnly===true&&mainAbility.oncePerTurn===true&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','energyOnly','oncePerTurn','extraEnergy'].includes(k));
 const mainEnergyRetireLines=mainAbility?.op==='restSelfGainEnergyRetireEndMain'&&
  mainAbility.energyOnly===undefined&&
  ['front','energy','field'].includes(mainAbility.lines)&&
  mainAbility.oncePerTurn===true&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','lines','oncePerTurn','extraEnergy'].includes(k));
 const mainEnergyMoveLines=mainAbility?.op==='restSelfGainEnergyRetireEndMain'&&
  mainAbility.energyOnly===undefined&&
  ['front','energy','field'].includes(mainAbility.lines)&&
  mainAbility.oncePerTurn===true&&mainAbility.end==='hand'&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','lines','oncePerTurn','extraEnergy','end'].includes(k));
 const mainRestDiscardRetire=mainAbility?.op==='restDiscardRetireThen'&&
  mainAbility.lines==='field'&&mainAbility.discardCount===1&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='deployNamedFromZones'&&
  mainAbility.then[0]?.zones?.length===1&&mainAbility.then[0].zones[0]==='hand'&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','lines','discardCount','then'].includes(k));
 if(mainRestDiscardRetire)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainDiscardBuff=mainAbility?.op==='discardHandBuffSelf'&&
  mainAbility.oncePerTurn===true&&mainAbility.discardCount===1&&
  Number.isInteger(mainAbility.bp)&&mainAbility.bp>=1&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','discardCount','bp'].includes(k));
 // 公開して山札の下. The check is the revealed card's printed BP, and the
 // bonus lands on this character. No front-line icon and no REST cost.
 const mainRevealBottom=mainAbility?.op==='revealHandBottomBuff'&&
  card.type==='character'&&mainAbility.oncePerTurn===true&&
  integer(mainAbility.minPrintedBp,1)&&mainAbility.minPrintedBp<=50000&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','minPrintedBp','bp'].includes(k));
 const mainHandPayReveal=mainAbility?.op==='handPayRevealDeploy'&&
  card.type==='character'&&mainAbility.payAp===1&&mainAbility.minReferencedBp===4000&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','payAp','minReferencedBp'].includes(k));
 const mainRestActiveFrontDraw=mainAbility?.op==='frontOnceProgram'&&
  card.type==='character'&&mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='restOwnActiveFrontDraw'&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(mainRestActiveFrontDraw)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainRevealImpact=mainAbility?.op==='revealHandBottomImpact'&&
  card.type==='character'&&mainAbility.oncePerTurn===true&&
  mainAbility.minPrintedBp===4000&&mainAbility.impact===1&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','minPrintedBp','impact'].includes(k));
 const frontProgram=mainAbility?.then;
 const frontGate=frontProgram?.[0]?.op==='discardGate'?frontProgram[0]:null;
 // A front once-per-turn ability may be a source-complete DSL program,
 // not just a single debuff. Named payment is a strict cost, not a shortcut.
 const frontEffects=frontGate?.then||frontProgram;
 // Keep the prior debuff/payment program intact. A two-step no-cost
 // draw/discard then optional FRONT grant is another printed, bounded
 // existing front-once program; it does not introduce a second MAIN engine.
 const mainFrontProgram=mainAbility?.op==='frontOnceProgram'&&
  typeof mainAbility.frontOnly==='boolean'&&mainAbility.oncePerTurn===true&&
  Array.isArray(frontProgram)&&(
   (frontProgram.length===1&&(frontProgram[0]?.op==='enemyBpDown'||
    frontProgram[0]?.op==='restOppFrontUnderBp'||
    frontProgram[0]?.op==='activeSelf'&&mainAbility.frontOnly===true&&
     Object.keys(frontProgram[0]).length===1||
    frontProgram[0]?.op==='handTopBuffSelf'&&mainAbility.frontOnly===true&&
     Object.keys(frontProgram[0]).length===2||
    frontProgram[0]?.op==='buffEitherField'&&mainAbility.frontOnly===true&&
     Object.keys(frontProgram[0]).length===3||
    frontGate&&Array.isArray(frontGate.then)&&frontGate.then.length>=1&&
    frontGate.then.length<=6&&frontEffects.every(e=>
     ['enemyBpDown','draw','buffSelf','grantOnAttack',
      'grantSelfEnergyMoveOnAttackStart','grantSelfTriggerUnchosen'].includes(e?.op))))||
   (frontProgram.length===2&&frontProgram[0]?.op==='drawDiscard'&&
    frontProgram[0].count===1&&Object.keys(frontProgram[0]).length===2&&
    frontProgram[1]?.op==='grantFrontEnergyOwnOtherFrontTrait'&&
    frontProgram[1].optional===true&&frontProgram[1].until==='thisTurn'&&
    typeof frontProgram[1].trait==='string'&&!!frontProgram[1].trait.trim()&&
    frontProgram[1].trait.length<=80&&Object.keys(frontProgram[1]).length===4)
  )&&Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(mainFrontProgram)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainNameDrawDiscard=mainAbility?.op==='frontOnceProgram'&&
  mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  Array.isArray(mainAbility.requireAllNames)&&mainAbility.requireAllNames.length===2&&
  mainAbility.requireAllNames.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80)&&
  new Set(mainAbility.requireAllNames).size===2&&
  Array.isArray(frontProgram)&&frontProgram.length===1&&
  frontProgram[0]?.op==='drawDiscard'&&frontProgram[0].count===1&&
  Object.keys(frontProgram[0]).length===2&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then','requireAllNames'].includes(k));
 if(mainNameDrawDiscard)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainEntryProtect=mainAbility?.op==='entryTurnProtect'&&
  mainAbility.oncePerTurn===true&&mainAbility.selectionScope==='any'&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','selectionScope'].includes(k));
 const mainRestRetireUnder=mainAbility?.op==='restRetireRecoverUnder'&&
  Object.keys(mainAbility).length===1;
 const mainRestTwoMove=mainAbility?.op==='restTwoActiveFrontMoveSelf'&&
  mainAbility.line==='energy'&&Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','line'].includes(k));
 const mainOncePay=mainAbility?.op==='oncePayProgram'&&
  mainAbility.oncePerTurn===true&&typeof mainAbility.frontOnly==='boolean'&&
  typeof mainAbility.raidOnly==='boolean'&&(mainAbility.payAp===0||mainAbility.payAp===1)&&
  (mainAbility.requiresOwnName===null||typeof mainAbility.requiresOwnName==='string'&&
   !!mainAbility.requiresOwnName.trim()&&mainAbility.requiresOwnName.length<=80)&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length>=1&&mainAbility.then.length<=2&&
  mainAbility.then.every(x=>['grantSelfAttackDamageThisTurn','chooseOne','discardGate','grantSelfImpactThisTurn','enemyBpDown'].includes(x?.op))&&
  Object.keys(mainAbility).length===7&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','frontOnly','raidOnly','payAp','requiresOwnName','then'].includes(k));
 if(mainOncePay)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainFieldOnceBuff=mainAbility?.op==='fieldOnceBuffOther'&&
  mainAbility.lines==='field'&&mainAbility.oncePerTurn===true&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','lines','oncePerTurn','bp'].includes(k));
 const mainRestBuff=mainAbility?.op==='restSelfBuffOther'&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  (mainAbility.name===undefined
   ?(Object.keys(mainAbility).length===2&&
    Object.keys(mainAbility).every(k=>['op','bp'].includes(k)))
   :(typeof mainAbility.name==='string'&&!!mainAbility.name.trim()&&
    mainAbility.name.length<=80&&mainAbility.raidBase===true&&
    Object.keys(mainAbility).length===4&&
    Object.keys(mainAbility).every(k=>['op','bp','name','raidBase'].includes(k))));
 const mainRestRetireTrait=mainAbility?.op==='restRetireRecoverTrait'&&
  typeof mainAbility.trait==='string'&&!!mainAbility.trait.trim()&&
  mainAbility.trait.length<=80&&Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','trait'].includes(k));
 const mainDoubleEnergy=mainAbility?.op==='doubleEnergyIfNotEntry'&&
  mainAbility.minEnergy===8&&mainAbility.once==='name'&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','minEnergy','once'].includes(k));
 const mainRestDiscard=mainAbility?.op==='restBuffMayDiscardActive'&&
  mainAbility.deckAtMost===20&&mainAbility.bp===1000&&mainAbility.name==='シモン'&&
  mainAbility.raidBase===true&&Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','deckAtMost','bp','name','raidBase'].includes(k));
 const mainGunmenModes=mainAbility?.op==='gunmenModeSubset'&&
  typeof mainAbility.requiresName==='string'&&!!mainAbility.requiresName.trim()&&
  mainAbility.requiresName.length<=80&&
  typeof mainAbility.trait==='string'&&!!mainAbility.trait.trim()&&
  mainAbility.max===3&&mainAbility.bp===1000&&
  Array.isArray(mainAbility.modes)&&mainAbility.modes.length===3&&
  mainAbility.modes[0]==='bp'&&mainAbility.modes[1]==='impactNull'&&
  mainAbility.modes[2]==='doubleBlock'&&Object.keys(mainAbility).length===6&&
  Object.keys(mainAbility).every(k=>['op','requiresName','trait','max','bp','modes'].includes(k));
 const mainRestBuffHand=mainAbility?.op==='restSelfBuffOtherThenHand'&&
  mainAbility.oncePerTurn===true&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','bp'].includes(k));
 const mainRestRetireNamed=mainAbility?.op==='restRetireRecoverNamed'&&
  typeof mainAbility.name==='string'&&!!mainAbility.name.trim()&&
  mainAbility.name.length<=80&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','name'].includes(k));
 const mainOutsideTrait=mainAbility?.op==='outsideDiscardTraitToHand'&&
  card.type==='character'&&
  typeof mainAbility.trait==='string'&&!!mainAbility.trait.trim()&&
  mainAbility.trait.length<=80&&
  mainAbility.oncePerTurn===true&&mainAbility.scope==='name'&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','trait','oncePerTurn','scope'].includes(k));
 const mainRestTrait=mainAbility?.op==='restBuffOwnTraitScaled'&&
  card.type==='field'&&
  typeof mainAbility.trait==='string'&&!!mainAbility.trait.trim()&&
  mainAbility.trait.length<=80&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  integer(mainAbility.scaledMin,2)&&mainAbility.scaledMin<=8&&
  integer(mainAbility.scaledBp)&&mainAbility.scaledBp>mainAbility.bp&&
  mainAbility.scaledBp<=5000&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','trait','bp','scaledMin','scaledBp'].includes(k));
 const mainPayAp=mainAbility?.op==='payApDrawGainEnergy'&&
  mainAbility.oncePerTurn===true&&mainAbility.draw===1&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','draw','extraEnergy'].includes(k));
 const mainRestFrontEnergy=mainAbility?.op==='restSelfRestFrontGainEnergy'&&
  mainAbility.oncePerTurn===true&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','extraEnergy'].includes(k));
 const mainRestProgram=mainAbility?.op==='restSelfThen'&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  ((mainAbility.frontOnly===true&&mainAbility.oncePerTurn===undefined&&
    Object.keys(mainAbility).length===3&&mainAbility.then[0]?.op==='millTop'&&
    Object.keys(mainAbility.then[0]).every(k=>['op','count'].includes(k)))||
   (mainAbility.frontOnly===false&&mainAbility.oncePerTurn===true&&
    Object.keys(mainAbility).length===4&&
    mainAbility.then[0]?.op==='buffSelfUntilNextOwnStart'))&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(mainRestProgram)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainTuck=mainAbility?.op==='restTuckTopDamage'&&
  card.type==='character'&&mainAbility.frontOnly===true&&
  typeof mainAbility.name==='string'&&!!mainAbility.name.trim()&&
  mainAbility.name.length<=80&&Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','name'].includes(k));
 // Two REST activations on one FIELD. The mill is once per physical card.
 // The outside-event activation checks its printed count before the hand cost.
 const fieldMillEvent=mainAbility?.op==='fieldRestMillOrOutsideEvent'&&
  card.type==='field'&&
  integer(mainAbility.outsideMin,1)&&mainAbility.outsideMin<=50&&
  typeof mainAbility.eventName==='string'&&!!mainAbility.eventName.trim()&&
  mainAbility.eventName.length<=80&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','outsideMin','eventName'].includes(k));
 // REST tuck of the deck top, or REST plus a hand cost that may release one
 // facedown under-card and then recover a printed-energy name.
 const fieldTuckRelease=mainAbility?.op==='fieldRestTuckOrRelease'&&
  card.type==='field'&&
  typeof mainAbility.requiresName==='string'&&!!mainAbility.requiresName.trim()&&
  mainAbility.requiresName.length<=80&&
  typeof mainAbility.recoverName==='string'&&!!mainAbility.recoverName.trim()&&
  mainAbility.recoverName.length<=80&&
  integer(mainAbility.recoverEnergy,0)&&mainAbility.recoverEnergy<=30&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','requiresName','recoverName','recoverEnergy'].includes(k));
 const mainEnergyDraw=mainAbility?.op==='restSelfDrawIfEnergy'&&
  mainAbility.oncePerName===true&&mainAbility.minEnergy===20&&mainAbility.draw===1&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerName','minEnergy','draw'].includes(k));
 const mainEnergyMode=mainAbility?.op==='chooseEnergyModeUntilNextOwnStart'&&
  mainAbility.oncePerTurn===true&&mainAbility.energy===1&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','energy'].includes(k));
 const mainNamedEnergy=mainAbility?.op==='buffNamedEnergyActiveAp'&&
  mainAbility.minEnergy===6&&typeof mainAbility.name==='string'&&!!mainAbility.name.trim()&&
  mainAbility.name.length<=80&&integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  mainAbility.activeAp===1&&Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','minEnergy','name','extraEnergy','activeAp'].includes(k));
 const printedMains=card.printedMains??null;
 if(printedMains!==null){
  if(card.type!=='character'||mainAbility||!Array.isArray(printedMains)||
   printedMains.length<1||printedMains.length>3||
   new Set(printedMains.map(m=>m?.id)).size!==printedMains.length)
   throw Error(card.id+' invalid once-per-card printed mains');
  for(const m of printedMains){
   const discard=m?.op==='discardHandThenActive'&&m.discard===1&&
    Object.keys(m).length===3&&['op','id','discard'].every(k=>k in m);
   const rest=m?.op==='restSelfEnergy'&&m.energy===1&&
    Object.keys(m).length===3&&['op','id','energy'].every(k=>k in m);
   const buff=m?.op==='discardHandBuff'&&m.discard===1&&m.bp===1000&&
    Object.keys(m).length===4&&['op','id','discard','bp'].every(k=>k in m);
   const frontEnergy=m?.op==='frontEnergyEscalation'&&m.minEnergy===6&&m.highEnergy===8&&
    Object.keys(m).length===4&&['op','id','minEnergy','highEnergy'].every(k=>k in m);
   const activeEnergy=m?.op==='activeOneIfEnergy'&&m.minEnergy===20&&m.once==='name'&&
    Object.keys(m).length===4&&['op','id','minEnergy','once'].every(k=>k in m);
   const lineAttack=m?.op==='energyLineAttackCap'&&m.discard===1&&m.attackCap===4&&
    m.once==='name'&&Object.keys(m).length===5&&
    ['op','id','discard','attackCap','once'].every(k=>k in m);
   if((!discard&&!rest&&!buff&&!frontEnergy&&!activeEnergy&&!lineAttack)||
    typeof m.id!=='string'||!m.id.trim()||m.id.length>20)
    throw Error(card.id+' invalid printed main mode');
  }
 }
 const unblockedAttack=card.unblockedAttack??null;
 if(unblockedAttack!==null){
  if(card.type!=='character'||unblockedAttack.optional!==true||
   !Array.isArray(unblockedAttack.then)||unblockedAttack.then.length!==1||
   Object.keys(unblockedAttack).length!==2)
   throw Error(card.id+' invalid optional unblocked-attack program');
  verifyProgram(unblockedAttack.then,card.id+'.unblockedAttack');
 }
  // 自分の効果でレストになった後、アクティブにし、次の自分のターン開始時まで BP.
 const mainOwnEffectRest=mainAbility?.op==='frontOnceProgram'&&
  card.type==='character'&&mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  mainAbility.requireOwnEffectRest===true&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===2&&
  mainAbility.then[0]?.op==='activeSelf'&&Object.keys(mainAbility.then[0]).length===1&&
  mainAbility.then[1]?.op==='buffSelfUntilNextOwnStart'&&mainAbility.then[1].bp===1000&&
  Object.keys(mainAbility.then[1]).length===2&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','requireOwnEffectRest','then'].includes(k));
 if(mainOwnEffectRest)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainEmiliaHandDiscount=mainAbility?.op==='frontOnceProgram'&&
  card.type==='character'&&mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  mainAbility.requireOwnEffectRest===true&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='discountNextNamedHandEnergy'&&
  mainAbility.then[0].name==='エミリア'&&mainAbility.then[0].color==='purple'&&
  mainAbility.then[0].amount===1&&Object.keys(mainAbility.then[0]).length===4&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','requireOwnEffectRest','then'].includes(k));
 if(mainEmiliaHandDiscount)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainRestedRetireImpact=mainAbility?.op==='restedFrontRetireReadyImpact'&&
  card.type==='character'&&mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  mainAbility.bp===1500&&Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','bp'].includes(k));
 if(mainAbility?.op==='restedFrontRetireReadyImpact'&&!mainRestedRetireImpact)
  throw Error(card.id+' unsupported rested front retirement');
 const mainNamedImpact=mainAbility?.op==='frontOnceGrantImpactNamed'&&
  card.type==='character'&&mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  mainAbility.excludeSelf===true&&Array.isArray(mainAbility.names)&&
  mainAbility.names.length===2&&mainAbility.names[0]==='ラム'&&mainAbility.names[1]==='レム'&&
  Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','names','excludeSelf'].includes(k));
 if(mainAbility?.op==='frontOnceGrantImpactNamed'&&!mainNamedImpact)
  throw Error(card.id+' unsupported named impact grant');
 const mainEnergySwap=mainAbility?.op==='energySwapOwnFront'&&
  card.type==='character'&&mainAbility.line==='energy'&&mainAbility.oncePerTurn===true&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','line','oncePerTurn'].includes(k));
 if(mainAbility?.op==='energySwapOwnFront'&&!mainEnergySwap)
  throw Error(card.id+' unsupported energy-line swap');
 const mainRestLeaveReveal=mainAbility?.op==='restLeaveRevealRetire'&&
  card.type==='field'&&mainAbility.oncePerName===true&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','oncePerName'].includes(k));
 const mainHandBlock=mainAbility?.op==='handOutsideBlockAtLeast'&&
  card.type==='character'&&mainAbility.oncePerTurn===true&&mainAbility.bp===4000&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','bp'].includes(k));
 const mainSniperBase=mainAbility?.op==='sniperThenRaidBaseOutside'&&
  card.type==='character'&&mainAbility.oncePerTurn===true&&mainAbility.maxBp===4000&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','maxBp'].includes(k));
 if(mainAbility!==null&&
  (!['character','field'].includes(card.type)||!(fieldDualMain||fieldRestRetireThen||mainRaid||mainRetireField||mainRetireReady||mainSelfRest||mainRestProgram||mainRestBuff||mainPayAp||mainRestFrontEnergy||mainEnergyRetire||mainEnergyRetireLines||mainEnergyMoveLines||mainDiscardBuff||mainRestDiscardRetire||mainFrontProgram||mainFieldOnceBuff||mainEntryProtect||mainRestRetireUnder||mainRestTwoMove||mainOncePay||mainEnergyDraw||mainEnergyMode||mainNamedEnergy||mainRestRetireTrait||mainGunmenModes||mainDoubleEnergy||mainRestDiscard||fieldPeek||fieldRestDrawTop||mainRestLeaveReveal||mainHandBlock||mainSniperBase||mainNameDrawDiscard||mainOwnEffectRest||mainRevealBottom||mainRevealImpact||mainHandPayReveal||mainRestActiveFrontDraw||mainRestedRetireImpact||mainNamedImpact||mainEnergySwap||mainEmiliaHandDiscount||mainRestBuffHand||mainRestRetireNamed||mainOutsideTrait||mainRestTrait||fieldMillEvent||fieldTuckRelease||mainTuck)))
  throw Error(card.id+' unsupported main action ability');
 const passiveBonuses=validatePassiveBonuses(card);
 const implemented=card.implementation;
 if(!['vanilla','dsl'].includes(implemented))
  throw Error(card.id+' must explicitly declare vanilla or dsl (unported effects are not playable)');
 if(card.ownTurnBp!==undefined&&
  (card.type!=='character'||!integer(card.ownTurnBp,1)||card.ownTurnBp>5000))
  throw Error(card.id+' invalid own-turn BP modifier');
 if(card.opponentTurnBp!==undefined&&(
  card.type!=='character'||!Number.isInteger(card.opponentTurnBp)||
  card.opponentTurnBp===0||card.opponentTurnBp%500!==0||
  Math.abs(card.opponentTurnBp)>5000))
  throw Error(card.id+' invalid opponent-turn BP modifier');
 // The profile author must explicitly mark vanilla; we do not read text and
 // guess that unknown passive/Raid/keywords can safely be ignored.
 const authored=card.effects??{};
 if(!authored||typeof authored!=='object'||Array.isArray(authored))
  throw Error(card.id+' effects must be a timing-to-program map');
 const compiled=expandAbilityTemplates(card.templateEffects,card.id+'.templateEffects');
 for(const timing of Object.keys(compiled))
  if(Object.prototype.hasOwnProperty.call(authored,timing))
   throw Error(card.id+' cannot mix raw and templated effects at '+timing);
 const effects={...authored,...compiled};
 // A moved physical card may print a source-qualified outside trigger.
 // This profile never infers text, never broadens a payment to all discards,
 // and resolves only after the originating source program ends.
 const moveObserver=card.moveObserver??null;
 if(moveObserver!==null){
  // Character with an explicit printed hand→outside listener.
  if(card.type!=='character'||implemented!=='dsl'||
   !moveObserver||typeof moveObserver!=='object'||Array.isArray(moveObserver)||
   Object.keys(moveObserver).length!==2||
   Object.keys(moveObserver).some(x=>!['when','op'].includes(x))||
   moveObserver.op!=='restSelfTuckMovedFaceDown')
   throw Error(card.id+' invalid moved-card field watcher');
  const q=validateCompletedMoveCondition(moveObserver.when);
  if(q.from!=='hand'||q.to!=='outside'||q.sourceOnField!==true||
   typeof q.sourceName!=='string'||!q.sourceName.trim()||
   (q.sourceColor!==undefined&&(typeof q.sourceColor!=='string'||!q.sourceColor.trim()))||
   !Array.isArray(q.reasons)||!q.reasons.length||
   q.reasons.some(x=>!['payment','own-effect'].includes(x))||
   Object.keys(q).some(x=>!['from','to','reasons','sourceOnField','sourceName','sourceColor'].includes(x)))
   throw Error(card.id+' invalid moved-card watcher provenance');
 }
 const moveTriggers=card.moveTriggers??[];
 if(!Array.isArray(moveTriggers)||moveTriggers.length>2||
  (moveTriggers.length&&implemented!=='dsl')||
  moveTriggers.some(x=>!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).length!==2||
   Object.keys(x).some(k=>!['when','then'].includes(k))||
   !x.when||typeof x.when!=='object'||Array.isArray(x.when)||
   !Array.isArray(x.then)||!x.then.length||x.then.length>3||
   x.then.some(job=>!['draw','grantCauseBlockAtMost','handBottomGrantDoubleAttack','payApDeployMovedActive'].includes(job?.op))))
  throw Error(card.id+' invalid source-qualified moved-card trigger');
 for(const [i,entry] of moveTriggers.entries()){
  const when=validateCompletedMoveCondition(entry.when);
  // Current audited subset covers only an OWN source's card effect/payment
  // sending this exact hand card to outside. Color is required only when
  // the print names one. Further causes require proof.
  if(when.from!=='hand'||when.to!=='outside'||
   when.sourceOnField!==true||
   typeof when.sourceName!=='string'||!when.sourceName.trim()||
   (when.sourceColor!==undefined&&(typeof when.sourceColor!=='string'||!when.sourceColor.trim()))||
   !Array.isArray(when.reasons)||when.reasons.length<1||
   when.reasons.some(r=>!['payment','own-effect'].includes(r))||
   Object.keys(when).some(k=>!['from','to','reasons','sourceName','sourceColor','sourceOnField'].includes(k)))
   throw Error(card.id+' unsupported moved-card source condition');
  verifyProgram(entry.then,card.id+'.moveTriggers['+i+'].then');
 }
  // Exact, printed phase-boundary programs; only field cards may own them.
  const phaseEffects=card.phaseEffects??[];
  if(!Array.isArray(phaseEffects)||phaseEffects.length>4||
   (phaseEffects.length>0&&card.type==='event')||
   phaseEffects.some(x=>!x||typeof x!=='object'||Array.isArray(x)||
    !['start','move','main','attack'].includes(x.phase)||
    !['start','end'].includes(x.edge)||!['own','opponent'].includes(x.turn)||
    Object.keys(x).some(k=>!['phase','edge','turn','then'].includes(k))||
    !Array.isArray(x.then)||x.then.length<1||x.then.length>6)||
   new Set(phaseEffects.map(x=>x.turn+':'+x.phase+':'+x.edge)).size!==phaseEffects.length)
   throw Error(card.id+' invalid phase-boundary effect profile');
  for(const [i,x] of phaseEffects.entries()){
   verifyProgram(x.then,card.id+'.phaseEffects['+i+']');
   if(x.then.some(op=>op.op==='mayStepFrontFromEnergy')&&(
    card.type!=='character'||card.step!==true||x.phase!=='attack'||
    x.edge!=='start'||x.turn!=='own'||x.then.length!==1))
    throw Error(card.id+' facedown front move is an own attack-start STEP effect');
   if(x.then.some(op=>op.op==='mayRaidOntoSelf')&&(
    card.type!=='character'||x.phase!=='attack'||x.edge!=='end'||
    x.turn!=='own'||x.then.length!==1))
    throw Error(card.id+' attack-end raid is an own attack-end effect');
   if(x.then.some(op=>op.op==='retireSourceOnPhaseEnd')&&(
    card.type!=='character'||x.phase!=='attack'||x.edge!=='end'||
    x.then.length!==1||x.then[0].op!=='retireSourceOnPhaseEnd'))
    throw Error(card.id+' invalid attack-end true self retirement');
   if(x.then.some(op=>op.op==='swapEnergyWithFrontSkip')&&(
    card.type!=='character'||x.phase!=='attack'||x.edge!=='end'||x.turn!=='own'||
    x.then.length!==1||x.then[0].op!=='swapEnergyWithFrontSkip'))
    throw Error(card.id+' invalid attack-end energy skip swap');
   if(x.then.some(op=>op.op==='chainRaidHand')&&(
    card.type!=='character'||!card.raidName||x.phase!=='attack'||x.edge!=='end'||
    x.turn!=='own'||x.then.length!==1||x.then[0].op!=='chainRaidHand'))
    throw Error(card.id+' invalid attack-end chain Raid');
  }
 // Only an actual character entering play can use the automatic bounce.
 // This is not a generic removal action for events/attack effects.
 for(const [timing,ops] of Object.entries(effects))
  for(const op of ops)if(op.op==='bounceOwnOtherUnderEnergy'&&
   (card.type!=='character'||timing!=='onPlay'))
   throw Error(card.id+' self-bounce is only valid on character onPlay');
 if(card.readyOnAttackCount!==undefined&&(
  card.type!=='character'||card.readyOnAttackCount!==1))
  throw Error(card.id+' invalid ready-on-attack count');
 if(card.readyOnBlockCount!==undefined&&(
  card.type!=='character'||card.readyOnBlockCount!==1))
  throw Error(card.id+' invalid ready-on-block count');
 const attackWinRecover=card.attackWinRecover??null;
 if(attackWinRecover!==null&&(
  card.type!=='character'||card.implementation!=='dsl'||
  !attackWinRecover||typeof attackWinRecover!=='object'||Array.isArray(attackWinRecover)||
  !integer(attackWinRecover.basePrintedBp,0)||attackWinRecover.basePrintedBp>50000||
  !integer(attackWinRecover.unit,1)||attackWinRecover.unit>200||
  !integer(attackWinRecover.bpPerGroup,1)||attackWinRecover.bpPerGroup>5000||
  attackWinRecover.bpPerGroup%500!==0||
  typeof attackWinRecover.excludeName!=='string'||!attackWinRecover.excludeName.trim()||
  attackWinRecover.excludeName.length>80||
  Object.keys(attackWinRecover).length!==4||
  Object.keys(attackWinRecover).some(k=>!['basePrintedBp','unit','bpPerGroup','excludeName'].includes(k))
 ))throw Error(card.id+' invalid generic printed attacking-victory recovery');
 if(card.conditionalImpactBpAtLeast!==undefined&&(
  card.type!=='character'||card.implementation!=='dsl'||
  !integer(card.conditionalImpactBpAtLeast,1)||card.conditionalImpactBpAtLeast>50000||
  card.printedImpact!==undefined||card.conditionalUnderFaceDown
 ))throw Error(card.id+' invalid live-current-BP IMPACT threshold');
 const fieldTraitEnergyDiscount=card.fieldTraitEnergyDiscount??null;
 if(fieldTraitEnergyDiscount!==null&&(
  card.type!=='character'||card.implementation!=='dsl'||
  typeof fieldTraitEnergyDiscount.trait!=='string'||!fieldTraitEnergyDiscount.trait.trim()||
  fieldTraitEnergyDiscount.trait.length>80||fieldTraitEnergyDiscount.per!==1||
  Object.keys(fieldTraitEnergyDiscount).length!==2||
  Object.keys(fieldTraitEnergyDiscount).some(k=>!['trait','per'].includes(k))))
  throw Error(card.id+' invalid off-field trait energy discount');
 const energyAttackSwap=card.energyAttackSwap??null;
 if(energyAttackSwap!==null&&(
  card.type!=='character'||card.implementation!=='dsl'||
  typeof energyAttackSwap.trait!=='string'||!energyAttackSwap.trait.trim()||
  energyAttackSwap.trait.length>80||Object.keys(energyAttackSwap).length!==1))
  throw Error(card.id+' invalid energy-line attack-end trait swap');
 const frontRetireHandGrant=card.frontRetireHandGrant??null;
 if(frontRetireHandGrant!==null&&(
  card.type!=='character'||card.implementation!=='dsl'||
  frontRetireHandGrant.line!=='front'||
  typeof frontRetireHandGrant.retiredTrait!=='string'||!frontRetireHandGrant.retiredTrait.trim()||
  frontRetireHandGrant.retiredTrait.length>80||
  typeof frontRetireHandGrant.retiredLacks!=='string'||!frontRetireHandGrant.retiredLacks.trim()||
  frontRetireHandGrant.retiredLacks.length>80||
  typeof frontRetireHandGrant.grantTrait!=='string'||!frontRetireHandGrant.grantTrait.trim()||
  frontRetireHandGrant.grantTrait.length>80||
  Object.keys(frontRetireHandGrant).length!==4||
  Object.keys(frontRetireHandGrant).some(k=>!['line','retiredTrait','retiredLacks','grantTrait'].includes(k))))
  throw Error(card.id+' invalid front retirement hand grant');
 const attackEndSwap=card.attackEndSwap??null;
 if(attackEndSwap!==null&&(
  card.type!=='character'||typeof attackEndSwap!=='object'||Array.isArray(attackEndSwap)||
  attackEndSwap.color!=='green'||
  JSON.stringify(attackEndSwap.types)!==JSON.stringify(['event','field'])||
  attackEndSwap.minDistinctNames!==4||Object.keys(attackEndSwap).length!==3))
  throw Error(card.id+' invalid source-pinned Q2337 attack-end swap');
 const blockBpRestriction=card.blockBpRestriction??null;
 if(blockBpRestriction!==null){
  if(card.type!=='character'||card.implementation!=='dsl'||
   !blockBpRestriction||typeof blockBpRestriction!=='object'||
   Array.isArray(blockBpRestriction)||
   !['atLeast','atMost'].includes(blockBpRestriction.relation)||
   !integer(blockBpRestriction.bp,1)||blockBpRestriction.bp>50000||
   Object.keys(blockBpRestriction).length!==3||
   Object.keys(blockBpRestriction).some(k=>!['relation','bp','condition'].includes(k))||
   !(blockBpRestriction.condition===null||
    ['ownOutsideNamedCountAtLeast','outsideCount'].includes(blockBpRestriction.condition?.kind)))
   throw Error(card.id+' invalid printed blocker BP restriction');
  if(blockBpRestriction.condition)
   assertLiveCondition(blockBpRestriction.condition,card.id+'.blockBpRestriction');
 }
 if(card.unblockedRestFront!==undefined&&(
  card.unblockedRestFront!==true||card.type!=='character'||card.implementation!=='dsl'))
  throw Error(card.id+' invalid unblocked front rest');
 const attackAid=card.attackAid??null;
 if(attackAid!==null){
  if(card.type!=='character'||card.implementation!=='dsl'||
   typeof attackAid.trait!=='string'||!attackAid.trait.trim()||attackAid.trait.length>80||
   !integer(attackAid.maxPrintedBp,0)||attackAid.maxPrintedBp>50000||
   !Array.isArray(attackAid.options)||attackAid.options.length!==2||
   Object.keys(attackAid).length!==3||
   Object.keys(attackAid).some(k=>!['trait','maxPrintedBp','options'].includes(k)))
   throw Error(card.id+' invalid attack aid');
  const ids=new Set();
  for(const o of attackAid.options){
   const needsBp=o?.grant==='blockAtLeast'||o?.grant==='bp';
   if(!o||typeof o!=='object'||Array.isArray(o)||
    typeof o.id!=='string'||!(/^[a-zA-Z][a-zA-Z0-9]{0,32}$/).test(o.id)||ids.has(o.id)||
    typeof o.label!=='string'||!o.label.trim()||o.label.length>64||
    !['blockAtLeast','oppChoiceImmune','bp','drawDiscard'].includes(o.grant)||
    (needsBp&&(!integer(o.bp,1)||o.bp>5000))||
    (!needsBp&&o.bp!==undefined)||
    Object.keys(o).length!==(needsBp?4:3)||
    Object.keys(o).some(k=>!['id','label','grant','bp'].includes(k)))
    throw Error(card.id+' invalid attack aid option');
   ids.add(o.id);
  }
 }
 // Printed hand-only required energy discount, never a free cost bypass
 // when any owned FRONT/ENERGY field object exists.
 const emptyOwnFieldHandEnergyDiscount=card.emptyOwnFieldHandEnergyDiscount??0;
 if(emptyOwnFieldHandEnergyDiscount!==0&&(
  card.type!=='character'||card.implementation!=='dsl'||card.raidName||
  !integer(emptyOwnFieldHandEnergyDiscount,1)||
  emptyOwnFieldHandEnergyDiscount>card.energy||
  emptyOwnFieldHandEnergyDiscount>5))
  throw Error(card.id+' invalid hand-only own-empty-field energy discount');
 // Source-pinned, HAND-only required-energy modifier. The opponent's
 // publicly visible FRONT or ENERGY card color is checked at legal play time.
 // Never adjust printed energy, AP, or generated energy in the source record.
 const opponentFieldColorsHandEnergyDiscount=card.opponentFieldColorsHandEnergyDiscount??null;
 if(opponentFieldColorsHandEnergyDiscount!==null&&(
  card.type!=='character'||card.implementation!=='dsl'||card.raidName||
  emptyOwnFieldHandEnergyDiscount!==0||
  !Array.isArray(opponentFieldColorsHandEnergyDiscount.colors)||
  opponentFieldColorsHandEnergyDiscount.colors.length!==2||
  new Set(opponentFieldColorsHandEnergyDiscount.colors).size!==2||
  opponentFieldColorsHandEnergyDiscount.colors.some(c=>
   !['red','blue','yellow','green','purple'].includes(c)||c===card.color)||
  opponentFieldColorsHandEnergyDiscount.amount!==1||
  card.energy<1||
  Object.keys(opponentFieldColorsHandEnergyDiscount).length!==2||
  Object.keys(opponentFieldColorsHandEnergyDiscount).some(k=>!['colors','amount'].includes(k))))
  throw Error(card.id+' invalid hand-only opponent-field-color required-energy discount');
 const selectionHandDiscardTax=card.selectionHandDiscardTax??null;
 if(selectionHandDiscardTax!==null){
  if(card.type!=='character')throw Error(card.id+' tax needs CHARACTER source');
  validateSelectionHandTaxProfile(selectionHandDiscardTax);
 }
 if(card.alsoEvent!==undefined&&(card.alsoEvent!==true||card.type!=='character'))
  throw Error(card.id+' also-event identity stays on a character');
 if(implemented==='vanilla'&&(Object.keys(effects).length||card.effectText||
  mainAbility||phaseEffects.length||moveTriggers.length||moveObserver||card.enterActiveIfOpponentRest||card.enterAlwaysActive||card.activeExtraEnergy||card.conditionalTraitEnergy||passiveBonuses||card.impactNull||card.alsoEvent||card.handBpMayWhileFront||
  card.printedImpact||card.printedAttackDamage||card.readyOnAttackCount||card.readyOnBlockCount||
  card.frontGeneratesEnergy||ownOutsideRecovery||colorTriggerFieldSubstitution||card.frontForbidden||card.ownTurnBp||card.opponentTurnBp||nameAliases||selectionHandDiscardTax||card.otherOwnBattleWonDamageTwo||attackEndSwap||blockBpRestriction||attackWinRecover||card.conditionalImpactBpAtLeast||emptyOwnFieldHandEnergyDiscount||opponentFieldColorsHandEnergyDiscount||card.mustBlock||card.bpDownImmune||card.printedHandEnergyDiscount||card.raidHandLeaveReplace||card.raidTrait||card.attackEnergyMin||card.blockEnergyMin||unblockedAttack||printedMains||card.playRequiresNameOrRaidBase||card.handUseOncePerName||card.removeUnlessUsed||card.removedMain||card.bpPerOwnRaid||card.extraRaidHost||card.mutualPlayBan||card.handFieldEnergyAura||card.chainRaidOnly||card.chainRaidNoSameTurn||card.chainRaidUnique||card.oppEffectUntargetable||card.energyLineForbidden||card.attackDeckAtMost||card.attackRequiresName||card.ownTurnImpact||card.noOwnFieldTypeHandDiscount||card.facedownUnderEnergy||card.retireCapture||card.raidAttach||card.raidWitness||card.unblockedRestFront||card.substituteOppRetire||attackAid||fieldTraitEnergyDiscount||energyAttackSwap||frontRetireHandGrant))
  throw Error(card.id+' claims vanilla despite printed/declared effects');
 if(implemented==='dsl'&&!Object.keys(effects).length&&!phaseEffects.length&&!moveTriggers.length&&!mainAbility&&!moveObserver&&!card.enterActiveIfOpponentRest&&!card.enterAlwaysActive&&
  !card.activeExtraEnergy&&!card.conditionalTraitEnergy&&!passiveBonuses&&!card.impactNull&&!card.alsoEvent&&!card.handBpMayWhileFront&&
  !card.printedImpact&&!card.printedAttackDamage&&!card.readyOnAttackCount&&!card.readyOnBlockCount&&
  !card.frontGeneratesEnergy&&!ownOutsideRecovery&&!colorTriggerFieldSubstitution&&!card.frontForbidden&&!card.ownTurnBp&&!card.opponentTurnBp&&!nameAliases&&!selectionHandDiscardTax&&!card.otherOwnBattleWonDamageTwo&&!attackEndSwap&&!blockBpRestriction&&!attackWinRecover&&!card.conditionalImpactBpAtLeast&&!emptyOwnFieldHandEnergyDiscount&&!opponentFieldColorsHandEnergyDiscount&&!card.mustBlock&&!card.bpDownImmune&&!card.printedHandEnergyDiscount&&!card.raidHandLeaveReplace&&!card.raidTrait&&!card.attackEnergyMin&&!card.blockEnergyMin&&!unblockedAttack&&!printedMains&&!card.playRequiresNameOrRaidBase&&!card.handUseOncePerName&&!card.removeUnlessUsed&&!card.removedMain&&!card.bpPerOwnRaid&&!card.extraRaidHost&&!card.mutualPlayBan&&!card.handFieldEnergyAura&&!card.chainRaidOnly&&!card.oppEffectUntargetable&&!card.energyLineForbidden&&!card.attackDeckAtMost&&!card.attackRequiresName&&!card.ownTurnImpact&&!card.noOwnFieldTypeHandDiscount&&!card.facedownUnderEnergy&&!card.retireCapture&&!card.raidAttach&&!card.raidWitness&&!card.unblockedRestFront&&!card.substituteOppRetire&&!attackAid&&!fieldTraitEnergyDiscount&&!energyAttackSwap&&!frontRetireHandGrant)
  throw Error(card.id+' declares dsl without effects');
 for(const [name,program] of Object.entries(effects)){
  if(program.some(x=>x.op==='retireSourceOnPhaseEnd'))throw Error(card.id+' invalid phase-only self retirement');
  if(!V2_EFFECT_TIMINGS.includes(name))throw Error(card.id+' timing '+name+' unsupported');
  verifyProgram(program,card.id+'.'+name);
  if(name==='onRaid'&&!card.raidName)throw Error(card.id+' has Raid-only effects but no Raid target');
  if(name==='onRaided'&&card.type!=='character')throw Error(card.id+' Raid-base trigger must be a character');
  if(program.some(e=>e.op==='grantFrontEnergyOwnOtherFrontTrait'||
   (e.op==='chooseOne'&&e.options.some(o=>o.then.some(x=>x.op==='grantFrontEnergyOwnOtherFrontTrait'))))&&
   name!=='onPlay')
   throw Error(card.id+' FRONT energy grant requires a printed onPlay effect');
  // Events resolve from outside after normal AP payment. Their own physical
  // UID is not a FRONT target; share the same independent target permission.
  // No grant from unrelated timings, Raid bases, or nonprinted programs.
  if(program.some(e=>e.op==='grantOwnFrontChoiceProtection')&&name!=='onPlay')
   throw Error(card.id+' protected FRONT selection must resolve onPlay');
  if(program.some(e=>e.op==='grantSelectionApTaxOwnOtherTrait')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' targeting AP tax grant requires character onPlay');
  if(name!=='onPlay'&&program.some(e=>e.op==='forbidAttackOppFrontOne'))
   throw Error(card.id+' attack prohibition may be granted only onPlay');
  if(name!=='onRaided'&&program.some(e=>e.op==='drawIfRaidUnderFacedown'))
   throw Error(card.id+' Raid-base effects require onRaided timing');
  // BLC-1-078 attacks and chooses one own field card with the printed trait.
  // The same optional trait choice remains legal on a Raid base.
  if(program.some(e=>e.op==='buffOwnTrait')&&name!=='onRaided'&&name!=='onAttack')
   throw Error(card.id+' trait BP choice must require onRaided timing or onAttack');
  if(name==='onAttack'&&program.some(e=>e.op==='buffOwnTrait')&&
   (card.type!=='character'||program.length!==1))
   throw Error(card.id+' onAttack trait BP is one character choice');
  if(name==='onRaided'&&program.some(e=>!['buffOwnTrait','drawIfRaidUnderFacedown','chooseOne'].includes(e.op)))
   throw Error(card.id+' unsupported Raid-base timing effect');
  if(name!=='onPlay'&&program.some(e=>e.op==='discardOppHand'))
   throw Error(card.id+' opponent hand discard is only an onPlay effect');
  if(program.some(e=>e.op==='drawIfOwnTraitCount')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' trait-count draw is only a character onPlay effect');
  if(program.some(e=>['drawIfOppRestCharacter','drawIfOppCharacterBpAtLeast','drawIfOwnNameAndHandFewer','activeOwnNamed'].includes(e.op))&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' opponent-board draw and named ACTIVE are character onPlay effects');
  if(program.some(e=>e.op==='drawIfOppFrontBelowPrinted')&&
   (card.type!=='character'||name!=='onAttack'))
   throw Error(card.id+' printed-BP front draw is a character onAttack effect');
  if(program.some(e=>e.op==='drawDiscardIfEveryOwnCharacterNamed')&&
   (card.type!=='character'||name!=='onAttack'))
   throw Error(card.id+' all-Rem draw is a character onAttack effect');
  if(program.some(e=>e.op==='activeSelfIf')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' conditional ACTIVE is only a character onPlay effect');
  if(program.some(e=>e.op==='draw'&&e.entry!==undefined)&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' own-effect draw gate is only a character onPlay effect');
  if(program.some(e=>e.op==='drawIfOwnName'&&e.names)&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' named-union draw is a character onPlay effect');
  if(program.some(e=>e.op==='drawIfOwnEventUsed')&&
   (card.type!=='character'||!['onPlay','onAttack'].includes(name)))
   throw Error(card.id+' event-used draw is a character onPlay or onAttack effect');
  if(program.some(e=>e.op==='recoverAp'&&e.require!==undefined)&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' event-used AP recovery is a character onPlay effect');
  if(program.some(e=>e.op==='buffEitherOther')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' either-field BP choice is a character onPlay effect');
  if(program.some(e=>['optionalHandOutsideActiveIf','takeTopHandRestOutside','revealHandBottomOutsideCharacter'].includes(e.op))&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' hand active, top take and bottom reveal are character onPlay effects');
  if(program.some(e=>e.op==='buffNamedImpactDuration')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' named impact duration is an event onPlay effect');
  if(program.some(e=>['impactIfEveryOwnTraitless','deployOutsidePrintedActive','bounceThenAffordableSubaru','grantBounceInstead'].includes(e.op))&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' traitless impact, Subaru entry and bounce-instead are character onPlay effects');
  if(program.some(e=>e.op==='removeOppFieldOne')&&
   (card.type!=='event'||name!=='onPlay'||program.length!==1))
   throw Error(card.id+' opponent field removal is a lone event onPlay effect');
  if(program.some(e=>e.op==='handOutsideReenterFaceDown')&&
   (name!=='onRetire'||card.type!=='character'||program.length!==1))
   throw Error(card.id+' facedown reenter is a character onRetire effect');
  if(program.some(e=>e.op==='buffEitherField'))
   throw Error(card.id+' either-field buff including self is a front main ability');
  if(program.some(e=>e.op==='returnPrintedActiveBuff')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' printed return then active is a character onPlay effect');
  if(program.some(e=>e.op==='removeNamedOutsideActive')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' named outside removal is a character onPlay effect');
  if(program.some(e=>e.op==='payHandOrRestForNamed')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' hand-or-rest named recovery is a character onPlay effect');
  if(program.some(e=>e.op==='handTopBuffSelf'))
   throw Error(card.id+' hand-to-top buff is a front main ability');
  if(program.some(e=>e.op==='optionalRestFrontRecoverAp')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' optional front rest is an event onPlay effect');
  if(program.some(e=>e.op==='drawHandTop'))
   throw Error(card.id+' draw then hand-to-top is a field main ability');
  if(program.some(e=>e.op==='optionalDiscardActiveSelf')&&
   (card.type!=='field'||name!=='onPlay'))
   throw Error(card.id+' optional discard active is a field onPlay effect');
  if(program.some(e=>e.op==='retireOppFrontTiered')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' tiered front retirement is an event onPlay effect');
  if(program.some(e=>e.op==='buffNamedImpactDraw')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' named impact draw is an event onPlay effect');
  if(program.some(e=>e.op==='searchTopTraitOrEventAp')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' trait or event search is an event onPlay effect');
  if(program.some(e=>e.op==='discountNextNamedHandEnergy'))
   throw Error(card.id+' next named hand energy is a front main ability');
  if(program.some(e=>e.op==='restOwnActiveFrontDraw'))
   throw Error(card.id+' active front rest draw is a front main ability');
  if(program.some(e=>e.op==='deployOwnRaidBaseRest')&&name!=='onRetire')
   throw Error(card.id+' raid-base rest entry is a character onRetire effect');
  if(program.some(e=>e.op==='restOrRetireFrontAtMost'||e.op==='peekTopOneIfFieldNames')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' rest-or-retire and named top peek are event onPlay effects');
  if(program.some(e=>e.op==='retireOppFrontAtLeastBp'&&e.optional===true))
   throw Error(card.id+' optional minimum front retirement is only a paid follow-up');
  if(program.some(e=>e.op==='retireOppFrontAtLeastBp')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' minimum front retirement is an event onPlay effect');
  if(program.some(e=>e.op==='retireOppFrontAtMostBp'||e.op==='grantHandCharacterBpMay')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' maximum front retirement is an event onPlay effect');
  if(program.some(e=>e.op==='retireOppFrontScaledBp')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' scaled front retirement is a character onPlay effect');
  if(program.some(e=>e.op==='restOppFrontByOutsideEvents')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' outside-event front rest is a character onPlay effect');
  if(program.some(e=>e.op==='deployOwnHandNamedRest')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' named hand REST is a character onPlay effect');
  if(program.some(e=>e.op==='deployOutsidePrintedRest')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' exact outside REST is a character onPlay effect');
  if(program.some(e=>e.op==='grantPrintedBlockAtLeast')&&
   (card.type!=='character'||name!=='onAttack'))
   throw Error(card.id+' printed block ceiling is a character onAttack effect');
  if(program.some(e=>e.op==='moveOppFrontToEnergy')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' opponent front move is a character onPlay effect');
  if(program.some(e=>e.op==='drawTuckHandUnder')&&
   (card.type!=='character'||name!=='onAttack'))
   throw Error(card.id+' facedown hand tuck is only a character onAttack effect');
  if(program.some(e=>e.op==='chainRaidHand'))
   throw Error(card.id+' chain Raid belongs on the attack-end phase boundary');
  if(program.some(e=>e.op==='retireOppFrontOne')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' optional front retirement is only a character onPlay effect');
  if(program.some(e=>e.op==='payApDiscardOutsideRaid'))
   throw Error(card.id+' outside Raid payment must be a choose-one branch');
  if(program.some(e=>e.op==='chooseOne'&&e.options.some(o=>
   o.then.some(t=>t.op==='payApDiscardOutsideRaid')))&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' paid outside Raid is only a character onPlay choice');
  if(program.some(e=>['moveOtherAcrossOrRemove','raidBaseEnergyThen','restOppFrontLockActive'].includes(e.op))&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' line move, raid-base gate and rest lock are character onPlay effects');
  if(program.some(e=>e.op==='grantSelfAttackDamageThisTurn')&&name!=='onPlay')
   throw Error(card.id+' earned attack damage is only an onPlay effect');
  if(name==='onRetire'&&
   (!['character','field'].includes(card.type)||program.some(e=>!['draw','millTop','drawIfOwnFieldExists','chooseOne','deployOutsideTraitlessRestOrRaid','retireOppFrontOneUnderBp','restOppFrontUnderBp','restOppFrontBpAtLeast','buffOwnField','deployNamedFromZones','oncePerTurnGate','drawIfNameOrDistinctColorNames','replayRaidBase','inspectTopNamesOutside','drawIfOwnName','raidBaseNameThen','drawIfOwnNameOrRaidBase','outsideRecoverOrRestPlay','buffMaxOwnBpImpact','gainSelfEnergyIfAtLeast','outsideToDeckTop','grantAllFrontEnergyThisTurn','recoverNamesThenHandRaidDiscount','grantUnblockedDrawThisTurn','deployOwnRaidBaseRest','handOutsideReenterFaceDown','grantOppBlockAtLeast'].includes(e.op))))
   throw Error(card.id+' unsupported onRetire ability program');
  if(name!=='onRetire'&&program.some(e=>e.op==='restOppFrontBpAtLeast'))
   throw Error(card.id+' BP-at-least REST is an onRetire effect');
  if(name!=='onRetire'&&program.some(e=>e.op==='drawIfNameOrDistinctColorNames'))
   throw Error(card.id+' name-or-kinds draw is an onRetire effect');
  if(name!=='onPlay'&&program.some(e=>e.op==='inspectTopNamesOutside'))
   throw Error(card.id+' named top outside is an onPlay effect');
  if(program.some(e=>e.op==='drawIfOwnName'&&e.minSelfBp!==undefined)&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' self-BP named draw is an onAttack character effect');
  if(program.some(e=>e.op==='replayRaidBase')&&
   (name!=='onRetire'||program.length!==1||card.type!=='character'||!card.raidName))
   throw Error(card.id+' raid-base replay is a character onRetire effect');
  if(program.some(e=>e.op==='raidBaseNameThen'||e.op==='drawIfOwnNameOrRaidBase'||e.op==='outsideRecoverOrRestPlay')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' raid-base and outside recovery effects are character onPlay');
  if(program.some(e=>e.op==='buffMaxOwnBpImpact')&&(card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' max-BP impact choice is an event onPlay effect');
  if(program.some(e=>e.op==='gainSelfEnergyIfAtLeast'||e.op==='outsideToDeckTop')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' conditional energy and deck-top recovery are character onPlay effects');
  if(program.some(e=>e.op==='grantAllFrontEnergyThisTurn'||e.op==='recoverNamesThenHandRaidDiscount')&&
   (card.type!=='event'||name!=='onPlay'))
   throw Error(card.id+' front-energy grant and raid discount are event onPlay effects');
  if(program.some(e=>e.op==='grantUnblockedDrawThisTurn')&&name!=='onPlay')
   throw Error(card.id+' unblocked draw grant resolves from onPlay');
  if(name==='onRetire'&&program.some(e=>e.op==='deployOwnRaidBaseRest')&&
   (card.type!=='character'||!card.raidName||program.length!==1||program[0].optional!==true))
   throw Error(card.id+' raid-base rest entry is only a raid character onRetire');
  if(name!=='onRetire'&&program.some(e=>e.op==='grantOppBlockAtLeast'))
   throw Error(card.id+' opponent blocker ceiling is only an onRetire effect');
  if(name==='onRetire'&&program.some(e=>e.op==='deployNamedFromZones')&&
   (card.type!=='character'||program.length!==1||
    program[0].zones.length!==1||program[0].zones[0]!=='hand'||
    program[0].color===undefined||program[0].grantBp!==undefined||
    program[0].ready!==false))
   throw Error(card.id+' invalid printed onRetire optional hand REST entry');
  if(name==='onRetire'&&program.some(e=>e.op==='buffOwnField'&&e.optional!==true))
   throw Error(card.id+' retirement BP choice must be optional');
  if(name==='onRetire'&&program.some(e=>e.op==='deployOutsideTraitlessRestOrRaid')&&
   (program.length!==1||card.type!=='field'))
   throw Error(card.id+' outside traitless Raid only valid on FIELD retirement');
  if(name==='onRetire'&&program.some(e=>e.op==='chooseOne')&&
   (program.length!==1||card.type!=='field'))
   throw Error(card.id+' only FIELD may use retirement two-mode choice');
  if(name!=='onRetire'&&program.some(e=>e.op==='drawIfOwnFieldExists'))
   throw Error(card.id+' FIELD-gated draw requires onRetire');
  // Card-self triggered ability for a physical card recovered from OWN
  // outside to OWN hand via an OWN effect. Explicitly limited to one
  // printed mandatory draw-one/discard-one, not generic hand-enter effects.
  // The separate SLG-014 free REST entry cannot be combined without an
  // audited priority ruling, so reject that ambiguous mixed profile.
  const outsideRecoverDraw=program.length===1&&program[0]?.op==='drawDiscard'&&
   program[0]?.count===1&&Object.keys(program[0]).length===2&&
   Object.keys(program[0]).every(k=>['op','count'].includes(k));
  const outsideRecoverBuff=program.length===1&&program[0]?.op==='buffOwnField'&&
   program[0].optional===true&&program[0].excludeSelf===false&&program[0].bp===1000&&
   program[0].filter?.field==='type'&&program[0].filter?.value==='character';
  if(name==='onOutsideRecover'&&(
   card.type!=='character'||ownOutsideRecovery!==null||
   !(outsideRecoverDraw||outsideRecoverBuff)
  ))throw Error(card.id+' unsupported onOutsideRecover ability program');
  if(program.some(e=>e.op==='drawIfOwnOutsideNamedCountAtLeast'&&e.optional===true)&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' optional named OUTSIDE draw requires onAttack CHARACTER');
  if(program.some(e=>e.op==='buffSelfPerOwnOutsideGroups')&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' outside group BP is onAttack CHARACTER only');
  if(program.some(e=>e.op==='grantImpactNullUntilNextOwnStart')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' temporary impact null is character onPlay only');
  if(program.some(e=>e.op==='buffOwnOtherScaled')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' scaled ally BP is character onPlay only');
  if(program.some(e=>e.op==='mayStepFrontFromEnergy'))
   throw Error(card.id+' facedown front move belongs on the attack-start boundary');
  if(program.some(e=>e.op==='buffOtherIfFirstAttack')&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' first-attack ally BP is character onAttack only');
  if(program.some(e=>e.op==='millUpToThenRecover')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' mill-then-recover is character onPlay only');
  if(program.some(e=>e.op==='discardUpToThenDraw')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' discard-up-to draw is character onPlay only');
  if(program.some(e=>e.op==='searchTopAddOneMillRest')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' top-add mill-rest is character onPlay only');
  if(program.some(e=>e.op==='buffDistinctTraitNames')&&
   (name!=='onPlay'||card.type!=='event'))
   throw Error(card.id+' distinct-name BP scale is event onPlay only');
  if(program.some(e=>e.op==='grantFirstAttackUntilNextOwnStart')&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' first-attack package is character onAttack only');
  if(program.some(e=>e.op==='removeOppFrontUnderBp')&&
   (name!=='onPlay'||card.type!=='event'))
   throw Error(card.id+' BP removal is event onPlay only');
  if(program.some(e=>['grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn'].includes(e.op))&&
   (name!=='onPlay'||card.type!=='character'||card.implementation!=='dsl'))
   throw Error(card.id+' timed sniper/win ability requires onPlay CHARACTER');
  if(program.some(e=>e.op==='activeOwnTraitLines')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' dual-line ACTIVE is a character onPlay effect');
  if(name==='onPlay'&&program.some(e=>e.op==='replayOnPlay'||
   e.op==='chooseOne'&&e.options.some(o=>o.then.some(t=>t.op==='replayOnPlay'))))
   throw Error(card.id+' replaying onPlay cannot live inside onPlay');
  if(program.some(e=>['buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn'].includes(e.op)))
   throw Error(card.id+' timed self gains must be nested inside gated onPlay chooseOne');
  if(program.some(e=>e.op==='chooseOne'&&e.entry==='ownEffect'&&
   e.options.some(o=>o.then.some(t=>['buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn'].includes(t.op))))&&
   (name!=='onPlay'||card.type!=='character'||card.implementation!=='dsl'))
   throw Error(card.id+' self-timed onPlay branch requires character own-effect entry');
  if(program.some(e=>e.op==='chooseOne'&&e.options.some(o=>
   o.then.some(t=>['buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn'].includes(t.op))))&&
   !program.some(e=>e.op==='chooseOne'&&e.entry==='ownEffect'))
   throw Error(card.id+' timed self grants require own-effect-entry gated mode');
  if(name==='onAttack'&&card.type!=='character')throw Error(card.id+' noncharacter cannot attack');
  if(card.type==='event'&&program.some(e=>e.op==='buffSelf'))
   throw Error(card.id+' event cannot buff itself on field');
 }
 if(card.raidName&&card.type!=='character')throw Error('Raid must be a character');
 // Dedicated passive energy profile; calculation area and own-card inclusion
 // must be explicit. The predicate is intentionally separated from the bonus.
 const conditionalTraitEnergy=card.conditionalTraitEnergy??null;
 if(conditionalTraitEnergy!==null&&(
   card.type==='event'||typeof conditionalTraitEnergy!=='object'||
   Array.isArray(conditionalTraitEnergy)||
   !['field','front','energy'].includes(conditionalTraitEnergy.zone)||
   !['character','card'].includes(conditionalTraitEnergy.subject)||
   !integer(conditionalTraitEnergy.minimumDistinctTraits,1)||
   conditionalTraitEnergy.minimumDistinctTraits>8||
   !integer(conditionalTraitEnergy.extraEnergy,1)||
   conditionalTraitEnergy.extraEnergy>3||
   typeof conditionalTraitEnergy.excludeSelf!=='boolean'||
   typeof conditionalTraitEnergy.requiresActive!=='boolean'||
   Object.keys(conditionalTraitEnergy).length!==6||
   Object.keys(conditionalTraitEnergy).some(k=>![
    'zone','subject','minimumDistinctTraits','extraEnergy',
    'excludeSelf','requiresActive'].includes(k))
 ))throw Error(card.id+' invalid conditional trait energy profile');
 // Explicit audited passive profiles, not inferred from translated text.
 if(card.activeExtraEnergy!==undefined&&(
  !['character','field'].includes(card.type)||!integer(card.activeExtraEnergy,1)||
  card.activeExtraEnergy>3))
  throw Error(card.id+' invalid ACTIVE extra energy profile');
 if(card.frontGeneratesEnergy!==undefined&&
  (card.type!=='character'||card.frontGeneratesEnergy!==true))
  throw Error(card.id+' invalid front-line energy profile');
 if(card.impactNull!==undefined&&(
  card.type!=='character'||card.impactNull!==true))
  throw Error(card.id+' invalid IMPACT nullification profile');
 if(card.mustBlock!==undefined&&(
  card.type!=='character'||card.mustBlock!==true))
  throw Error(card.id+' invalid printed mandatory block');
 if(card.bpDownImmune!==undefined&&(
  card.type!=='character'||card.bpDownImmune!==true))
  throw Error(card.id+' invalid printed BP-reduction immunity');
 const raidHandApDiscount=card.raidHandApDiscount??null;
 if(raidHandApDiscount!==null&&(
  card.type!=='character'||!card.raidName||implemented!=='dsl'||
  raidHandApDiscount.amount!==1||
  !['blue','yellow','green','purple','red'].includes(raidHandApDiscount.requiresEffectApColor)||
  raidHandApDiscount.voidIfOtherZeroApHandName!==true||
  Object.keys(raidHandApDiscount).length!==3||
  Object.keys(raidHandApDiscount).some(k=>!['amount','requiresEffectApColor','voidIfOtherZeroApHandName'].includes(k))))
  throw Error(card.id+' invalid raid hand AP discount');
 const playRequiresOwnName=card.playRequiresOwnName??null;
 if(playRequiresOwnName!==null&&(
  card.type!=='event'||implemented!=='dsl'||
  typeof playRequiresOwnName!=='string'||!playRequiresOwnName.trim()||
  playRequiresOwnName.length>80))
  throw Error(card.id+' invalid own-name play requirement');
 const playRequiresNameOrRaidBase=card.playRequiresNameOrRaidBase??null;
 if(playRequiresNameOrRaidBase!==null&&(
  card.type!=='event'||implemented!=='dsl'||playRequiresOwnName||
  typeof playRequiresNameOrRaidBase!=='string'||!playRequiresNameOrRaidBase.trim()||
  playRequiresNameOrRaidBase.length>80))
  throw Error(card.id+' invalid name-or-raid-base play requirement');
 const handUseOncePerName=card.handUseOncePerName===true;
 if(card.handUseOncePerName!==undefined&&(card.type!=='event'||!handUseOncePerName))
  throw Error(card.id+' invalid once-per-name hand use');
 const removeUnlessUsed=card.removeUnlessUsed===true;
 const useToRemoved=card.useToRemoved===true;
 if((card.removeUnlessUsed!==undefined||card.useToRemoved!==undefined)&&(
  card.type!=='event'||removeUnlessUsed!==useToRemoved||!removeUnlessUsed))
  throw Error(card.id+' invalid used-only removal');
 const removedMain=card.removedMain??null;
 if(removedMain!==null&&(
  card.type!=='event'||removedMain.op!=='doubleGeneratedEnergy'||
  removedMain.minEnergy!==8||removedMain.id!=='double'||
  Object.keys(removedMain).length!==3))
  throw Error(card.id+' invalid removed-zone main');
 const bpPerOwnRaid=card.bpPerOwnRaid??0;
 if(card.bpPerOwnRaid!==undefined&&(card.type!=='character'||bpPerOwnRaid!==1000))
  throw Error(card.id+' invalid raid-count BP');
 const mutualPlayBan=card.mutualPlayBan??null;
 if(mutualPlayBan!==null&&(
  card.type!=='character'||implemented!=='dsl'||
  typeof mutualPlayBan!=='string'||!mutualPlayBan.trim()||
  mutualPlayBan.length>80||mutualPlayBan===card.name))
  throw Error(card.id+' invalid mutual entry ban');
 const handFieldEnergyAura=card.handFieldEnergyAura??null;
 if(handFieldEnergyAura!==null&&(
  card.type!=='character'||implemented!=='dsl'||
  !['blue','yellow','green','purple','red'].includes(handFieldEnergyAura.color)||
  handFieldEnergyAura.type!=='field'||handFieldEnergyAura.amount!==1||
  Object.keys(handFieldEnergyAura).length!==3||
  Object.keys(handFieldEnergyAura).some(k=>!['color','type','amount'].includes(k))))
  throw Error(card.id+' invalid field-card hand energy aura');
 const extraRaidHost=card.extraRaidHost??null;
 if(extraRaidHost!==null&&(
  card.type!=='character'||card.raidName||!Array.isArray(extraRaidHost.names)||
  extraRaidHost.names.length!==2||extraRaidHost.names.some(n=>typeof n!=='string'||!n.trim())||
  new Set(extraRaidHost.names).size!==2||typeof extraRaidHost.blockedByName!=='string'||
  !extraRaidHost.blockedByName.trim()||Object.keys(extraRaidHost).length!==2))
  throw Error(card.id+' invalid extra raid host');
 const raidHandLeaveReplace=card.raidHandLeaveReplace??null;
 if(raidHandLeaveReplace!==null&&(
  card.type!=='character'||!card.raidName||implemented!=='dsl'||
  !integer(raidHandLeaveReplace.minBaseEnergy,1)||raidHandLeaveReplace.minBaseEnergy>10||
  Object.keys(raidHandLeaveReplace).length!==1||
  Object.keys(raidHandLeaveReplace).some(k=>k!=='minBaseEnergy')))
  throw Error(card.id+' invalid raid hand leave replacement');
 const printedHandEnergyDiscount=card.printedHandEnergyDiscount??0;
 if(printedHandEnergyDiscount!==0&&(
  card.type!=='character'||card.implementation!=='dsl'||
  !integer(printedHandEnergyDiscount,1)||
  printedHandEnergyDiscount>card.energy||
  printedHandEnergyDiscount>5))
  throw Error(card.id+' invalid printed hand energy discount');
 // True live Q763 battle victories can grant this turn's DAMAGE(2) to
 // OTHER own characters; never infer a grant from an unblocked direct hit.
 if(card.otherOwnBattleWonDamageTwo!==undefined&&
   (card.type!=='character'||card.otherOwnBattleWonDamageTwo!==true||
    card.printedAttackDamage===2||
    (card.passiveBonuses||[]).some(x=>x.extraDamage)))
  throw Error(card.id+' unsupported other-own battle-win DAMAGE2 profile');
 // Printed 【インパクト（1）】 and 【ダメージ（2）】 are unconditional keywords.
 // Stacking either with the facedown-under impact profile needs its own ruling.
 if(card.printedImpact!==undefined&&(
  card.type!=='character'||card.printedImpact!==1||card.conditionalUnderFaceDown))
  throw Error(card.id+' invalid printed impact');
 const handRevealCharacterBp=card.handRevealCharacterBp??0;
 if(handRevealCharacterBp!==0&&(
  card.type!=='event'||implemented!=='dsl'||handRevealCharacterBp!==4000))
  throw Error(card.id+' invalid hand-reveal character BP');
 const handBpMayWhileFront=card.handBpMayWhileFront??0;
 if(handBpMayWhileFront!==0&&(
  card.type!=='character'||implemented!=='dsl'||handBpMayWhileFront!==1000))
  throw Error(card.id+' invalid front hand BP reference');
 const substituteOppRetire=card.substituteOppRetire??null;
 if(substituteOppRetire!==null&&(
  card.type!=='character'||implemented!=='dsl'||
  typeof substituteOppRetire.name!=='string'||!substituteOppRetire.name.trim()||
  substituteOppRetire.name.length>80||Object.keys(substituteOppRetire).length!==1||
  Object.keys(substituteOppRetire).some(k=>k!=='name')))
  throw Error(card.id+' invalid substitute retirement');
 if(card.printedAttackDamage!==undefined&&(
  card.type!=='character'||card.printedAttackDamage!==2))
  throw Error(card.id+' invalid printed attack damage');
 const chainRaid=card.chainRaidOnly===true&&card.chainRaidNoSameTurn===true&&
  card.chainRaidUnique===true;
 if((card.chainRaidOnly!==undefined||card.chainRaidNoSameTurn!==undefined||
  card.chainRaidUnique!==undefined)&&(
  card.type!=='character'||!card.raidName||!card.raidFromRaid?.length||!chainRaid))
  throw Error(card.id+' invalid chain-raid restriction');
 if(card.oppEffectUntargetable!==undefined&&(
  card.type!=='character'||card.oppEffectUntargetable!==true))
  throw Error(card.id+' invalid opponent-effect untargetable print');
 if(card.energyLineForbidden!==undefined&&(
  card.type!=='character'||card.energyLineForbidden!==true))
  throw Error(card.id+' invalid energy-line restriction');
 if(card.attackDeckAtMost!==undefined&&(
  card.type!=='character'||card.attackDeckAtMost!==20))
  throw Error(card.id+' invalid attack deck gate');
 if(card.attackRequiresName!==undefined&&(
  card.type!=='character'||typeof card.attackRequiresName!=='string'||
  !card.attackRequiresName.trim()||card.attackRequiresName.length>80))
  throw Error(card.id+' invalid attack name gate');
 if(card.ownTurnImpact!==undefined&&(
  card.type!=='character'||card.ownTurnImpact!==4))
  throw Error(card.id+' invalid own-turn impact');
 const noOwnFieldTypeHandDiscount=card.noOwnFieldTypeHandDiscount??0;
 if(noOwnFieldTypeHandDiscount!==0&&(
  card.type!=='field'||implemented!=='dsl'||noOwnFieldTypeHandDiscount!==3||
  noOwnFieldTypeHandDiscount>card.energy))
  throw Error(card.id+' invalid missing-field hand energy discount');
 if(card.facedownUnderEnergy!==undefined&&(
  card.type!=='field'||card.facedownUnderEnergy!==1))
  throw Error(card.id+' invalid facedown-under energy');
 if(card.retireCapture!==undefined&&(
  card.type!=='field'||card.retireCapture!==true))
  throw Error(card.id+' invalid retirement capture');
 const raidAttach=card.raidAttach??null;
 if(raidAttach!==null&&(
  card.type!=='character'||implemented!=='dsl'||raidAttach.line!=='front'||
  raidAttach.nameContains!=='グレンラガン'||raidAttach.once!=='name'||
  raidAttach.drawIfHand!==1||!Array.isArray(raidAttach.baseNames)||
  raidAttach.baseNames.length!==2||raidAttach.baseNames[0]!=='シモン'||
  raidAttach.baseNames[1]!=='ヴィラル'||Object.keys(raidAttach).length!==5||
  Object.keys(raidAttach).some(k=>!['line','nameContains','baseNames','once','drawIfHand'].includes(k))))
  throw Error(card.id+' invalid raid attach');
 const raidWitness=card.raidWitness??null;
 if(raidWitness!==null){
  const drawForm=raidWitness.once==='name'&&raidWitness.draw===2&&
   Object.keys(raidWitness).length===3;
  const returnForm=raidWitness.returnUnderToHand===true&&
   Object.keys(raidWitness).length===2;
  if(!['character','field'].includes(card.type)||implemented!=='dsl'||
   typeof raidWitness.name!=='string'||!raidWitness.name.trim()||
   raidWitness.name.length>80||(!drawForm&&!returnForm)||
   Object.keys(raidWitness).some(k=>!['name','once','draw','returnUnderToHand'].includes(k)))
   throw Error(card.id+' invalid raid witness');
 }
 const maxCopies=card.maxCopies===undefined?4:card.maxCopies;
 // Officially printed exceptions, including SLG-1-030, may have up to 12 copies.
 // The title contribution contract verifies the exact source deckLimit.
 if(!integer(maxCopies,1)||(maxCopies>4&&maxCopies!==12))
  throw Error(card.id+' invalid deck copy cap');
 return Object.freeze({
  maxCopies,
  id:card.id,title:packId,name:card.name,
  ...(nameAliases?{nameAliases:Object.freeze([...nameAliases])}:{}),
  color:card.color,
  type:card.type,energy:card.energy,ap:card.ap,bp:card.bp,gen:card.gen,
  traits:Object.freeze([...(card.traits||[])]),
  ...(traitComponents?{traitComponents:Object.freeze([...traitComponents])}:{}),
  trigger:card.trigger||null,raidName:card.raidName||null,
  raidTrait:card.raidTrait||null,
  attackEnergyMin:card.attackEnergyMin||0,
  blockEnergyMin:card.blockEnergyMin||0,
  raidFromRaid:Object.freeze([...(card.raidFromRaid||[])]),
  raidBaseNames:Object.freeze([...(card.raidBaseNames||[card.raidName].filter(Boolean))]),
  raidRequiresNames:Object.freeze([...(card.raidRequiresNames||[])]),
  conditionalUnderFaceDown:underProfile?Object.freeze({...underProfile}):null,
  triggerEffect:triggerEffect?Object.freeze({...triggerEffect}):null,
  mainAbility:mainAbility?Object.freeze({...mainAbility}):null,
  printedMains:Object.freeze((printedMains||[]).map(m=>Object.freeze({...m}))),
  unblockedAttack:unblockedAttack?Object.freeze({optional:true,
   then:Object.freeze(unblockedAttack.then.map(op=>Object.freeze({
    ...op,...(op.filter?{filter:Object.freeze({...op.filter})}:{})})))}):null,
  ownOutsideRecovery:ownOutsideRecovery?Object.freeze({...ownOutsideRecovery}):null,
   phaseEffects:Object.freeze(phaseEffects.map(x=>Object.freeze({...x,
    then:Object.freeze(x.then.map(op=>Object.freeze({...op})))}))),
  enterActiveIfOpponentRest:card.enterActiveIfOpponentRest===true,
   enterAlwaysActive:card.enterAlwaysActive===true,
   frontForbidden:card.frontForbidden===true,
  step:card.step===true,ownTurnBp:card.ownTurnBp||0,
  opponentTurnBp:card.opponentTurnBp||0,
  emptyOwnFieldHandEnergyDiscount,
  printedHandEnergyDiscount,
  opponentFieldColorsHandEnergyDiscount:opponentFieldColorsHandEnergyDiscount?Object.freeze({
   amount:opponentFieldColorsHandEnergyDiscount.amount,
   colors:Object.freeze([...opponentFieldColorsHandEnergyDiscount.colors])}):null,
  activeExtraEnergy:card.activeExtraEnergy||0,
  frontGeneratesEnergy:card.frontGeneratesEnergy===true,
  colorTriggerFieldSubstitution,
  conditionalTraitEnergy:conditionalTraitEnergy?Object.freeze({...conditionalTraitEnergy}):null,
  passiveBonuses:passiveBonuses||Object.freeze([]),
  blockBpRestriction:blockBpRestriction?Object.freeze({
   relation:blockBpRestriction.relation,bp:blockBpRestriction.bp,
   condition:blockBpRestriction.condition?Object.freeze({
    ...blockBpRestriction.condition,
    ...(Array.isArray(blockBpRestriction.condition.names)?
     {names:Object.freeze([...blockBpRestriction.condition.names])}:{})}):null}):null,
  attackAid:attackAid?Object.freeze({
   trait:attackAid.trait,maxPrintedBp:attackAid.maxPrintedBp,
   options:Object.freeze(attackAid.options.map(o=>Object.freeze({...o})))}):null,
  attackWinRecover:attackWinRecover?Object.freeze({...attackWinRecover}):null,
  conditionalImpactBpAtLeast:card.conditionalImpactBpAtLeast??null,
  attackEndSwap:attackEndSwap?Object.freeze({
   color:attackEndSwap.color,types:Object.freeze([...attackEndSwap.types]),
   minDistinctNames:attackEndSwap.minDistinctNames}):null,
  fieldTraitEnergyDiscount:fieldTraitEnergyDiscount?Object.freeze({...fieldTraitEnergyDiscount}):null,
  energyAttackSwap:energyAttackSwap?Object.freeze({...energyAttackSwap}):null,
  frontRetireHandGrant:frontRetireHandGrant?Object.freeze({...frontRetireHandGrant}):null,
  otherOwnBattleWonDamageTwo:card.otherOwnBattleWonDamageTwo===true,
  selectionHandDiscardTax:selectionHandDiscardTax?
   Object.freeze({...selectionHandDiscardTax,
    sourceTypes:Object.freeze([...selectionHandDiscardTax.sourceTypes])}):null,
  impactNull:card.impactNull===true,
  ...(card.alsoEvent===true?{alsoEvent:true}:{}),
  unblockedRestFront:card.unblockedRestFront===true,
  mustBlock:card.mustBlock===true,
  bpDownImmune:card.bpDownImmune===true,
  raidHandLeaveReplace:raidHandLeaveReplace?Object.freeze({...raidHandLeaveReplace}):null,
  raidHandApDiscount:raidHandApDiscount?Object.freeze({...raidHandApDiscount}):null,
  playRequiresOwnName,
  playRequiresNameOrRaidBase,
  handUseOncePerName,
  removeUnlessUsed,
  useToRemoved,
  removedMain:removedMain?Object.freeze({...removedMain}):null,
  bpPerOwnRaid,
  extraRaidHost:extraRaidHost?Object.freeze({
   names:Object.freeze([...extraRaidHost.names]),blockedByName:extraRaidHost.blockedByName}):null,
  mutualPlayBan,
  handFieldEnergyAura:handFieldEnergyAura?Object.freeze({...handFieldEnergyAura}):null,
  chainRaidOnly:chainRaid,
  chainRaidNoSameTurn:chainRaid,
  chainRaidUnique:chainRaid,
  oppEffectUntargetable:card.oppEffectUntargetable===true,
  energyLineForbidden:card.energyLineForbidden===true,
  attackDeckAtMost:card.attackDeckAtMost||0,
  attackRequiresName:card.attackRequiresName||null,
  ownTurnImpact:card.ownTurnImpact||0,
  noOwnFieldTypeHandDiscount,
  facedownUnderEnergy:card.facedownUnderEnergy||0,
  retireCapture:card.retireCapture===true,
  raidAttach:raidAttach?Object.freeze({
   ...raidAttach,baseNames:Object.freeze([...raidAttach.baseNames])}):null,
  raidWitness:raidWitness?Object.freeze({...raidWitness}):null,
  printedImpact:card.printedImpact===1?1:0,
  handRevealCharacterBp:handRevealCharacterBp===4000?4000:0,
  ...(handBpMayWhileFront===1000?{handBpMayWhileFront:1000}:{}),
  ...(substituteOppRetire?{substituteOppRetire:Object.freeze({name:substituteOppRetire.name})}:{}),
  printedAttackDamage:card.printedAttackDamage===2?2:1,
  readyOnAttackCount:card.readyOnAttackCount===1?1:0,
  readyOnBlockCount:card.readyOnBlockCount===1?1:0,
  implementation:implemented,
  moveObserver:moveObserver?Object.freeze({op:moveObserver.op,
   when:validateCompletedMoveCondition(moveObserver.when)}):null,
  moveTriggers:Object.freeze(moveTriggers.map(x=>Object.freeze({
   when:validateCompletedMoveCondition(x.when),
   then:Object.freeze(x.then.map(op=>Object.freeze({...op})))
  }))),
  effects:Object.freeze(Object.fromEntries(Object.entries(effects)
   .map(([k,v])=>[k,Object.freeze(v.map(e=>Object.freeze({
    ...e,...(e.filter?{filter:Object.freeze({...e.filter})}:{}),
    ...(e.filters?{filters:Object.freeze(e.filters.map(f=>Object.freeze({...f})))}:{}),
    ...(e.names?{names:Object.freeze([...e.names])}:{}),
    ...(e.options?{options:Object.freeze(e.options.map(o=>Object.freeze({
     ...o,then:Object.freeze(o.then.map(child=>Object.freeze({
      ...child,...(child.filter?{filter:Object.freeze({...child.filter})}:{})
     })))
    })))}:{}) ,
    ...(e.then?{then:Object.freeze(e.then.map(child=>Object.freeze({
      ...child,...(child.filter?{filter:Object.freeze({...child.filter})}:{}),
      ...(child.filters?{filters:Object.freeze(child.filters.map(f=>Object.freeze({...f})))}:{})
    })))}:{}),
    ...(e.branches?{branches:Object.freeze(e.branches.map(b=>Object.freeze({
     name:b.name,then:Object.freeze(b.then.map(child=>Object.freeze({...child})))
    })))}:{}),
    ...(e.upgrade?{upgrade:Object.freeze({...e.upgrade})}:{}),
    ...(e.when?{when:Object.freeze({...e.when,
     ...(e.when.names?{names:Object.freeze([...e.when.names])}:{})})}:{})
   })))])))
 });
}
export function createUniversalPack({id,cards,version='0.1.0',restrictColors=false}={}){
 if(typeof id!=='string'||!id.trim()||!Array.isArray(cards)||!cards.length)
  throw Error('A title ID and explicit cards are required');
 if(typeof version!=='string'||!version.trim())throw Error('Pack version required');
 const normalized=cards.map(c=>normalize(c,id));
 const identifiers=normalized.map(c=>c.id);
 if(new Set(identifiers).size!==identifiers.length)throw Error('Duplicate card ID in '+id);
 return Object.freeze({kind:'ua-v2-pack',id,version,restrictColors:!!restrictColors,
  cards:Object.freeze(Object.fromEntries(normalized.map(c=>[c.id,c])))});
}
export function validateUniversalDeck(pack,counts){
 if(pack?.kind!=='ua-v2-pack')return ['Universal v2 pack required'];
 if(!counts||typeof counts!=='object'||Array.isArray(counts))return ['Invalid deck format'];
 const errors=[];let total=0;const colors=new Set();
 const triggerLimits={final:0,color:0,special:0};
 for(const [id,num] of Object.entries(counts)){
  if(!own(pack.cards,id)){errors.push('Unregistered/unsupported card: '+id);continue;}
  if(!integer(num)||num>4){errors.push(id+' exceeds 0–4 copies');continue;}
  total+=num;
  if(num>pack.cards[id].maxCopies){errors.push(id+' exceeds 0–'+pack.cards[id].maxCopies+' copies');continue;}
  if(num){const c=pack.cards[id];colors.add(c.color);if(Object.prototype.hasOwnProperty.call(triggerLimits,c.trigger))triggerLimits[c.trigger]+=num;}
 }
 if(total!==50)errors.push('Deck must have exactly 50 cards (found '+total+')');
 if(pack.restrictColors&&colors.size>1)errors.push('Deck colors must match');
 for(const [type,n] of Object.entries(triggerLimits))if(n>4)errors.push(type.toUpperCase()+' Trigger limit exceeded');
 return errors;
}
