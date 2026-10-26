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
export const V2_EFFECT_OPS=Object.freeze(['nextEligibleHandPlayApDiscount','draw','drawIfOwnName','drawIfOwnTraitCount','drawIfOwnOutsideNamedCountAtLeast','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','drawIfOppFrontBelowPrinted','drawIfSelfBpAtLeast','returnRetiredToHand','drawIfOppRestCharacter','drawIfOppCharacterBpAtLeast','drawIfOwnNameAndHandFewer','activeOwnNamed','activeEnergyNamed','grantSelfSniperThisTurn','grantFirstAttackKit','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','millTop','buffSelf','swapOrBuff','buffSelfPerOwnOutsideGroups','enemyBpDown','drawDiscard','recoverAp','peekTopOne','peekTopOrBottom','revealOppTopPlace','chooseEnergyRevealOutside','optionalRemoveHandThen','retireOppFrontUnderBp','retireOppFrontOneUnderBp','bounceOppFrontOneUnderBp','conditionalBounceOrRetireByOwnOutsideNames','stripOppRaidTop','restOppFrontUnderBp','restOppFrontOne','oppFrontRestBranch','skipNextActiveOppRest','forbidAttackOppFrontOne','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','retireOwnFieldOne','retireOwnCharacterOne','retireOwnTraitFollow','optionalRetireThenProgram','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw','searchDeckMany','discardGate','removeOutsideThen','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','searchTopUpToTwoBottom','enemyFrontAllBpDown','retireOppFrontAllUnderBp','buffOwnTraitAllTurn',
 'buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy','recoverOutsideUnderEnergy','recoverOutsideColorUnderEnergy','recoverOutsideTraitlessUnderEnergy','deployOutsideTraitlessRestOrRaid','deployOutsideRest','deployOutsideNameRest','deployOutsideExactRest','deployOutsideTraitApRest','deployNamedFromZones','payApDeployNamedRest','inspectTopTraitOutside','buffOwnField','oncePerTurnGate','buffNamedImpact','restActiveNamedReadyAp','readyNameOrTrait','protectNameOrTrait','sacrificeNamedChain','chooseOne','deployOwnHandRest','deployOwnHandSpecial','deployOwnHandRestOrRaid','optionalPayApThen','discardOppHand','retireSourceOnPhaseEnd','activeSelfIf','grantOnAttack','grantSelectionApTaxOwnOtherTrait','grantFrontEnergyOwnOtherFrontTrait','grantOwnFrontChoiceProtection','grantCauseBlockAtMost','handBottomGrantDoubleAttack','payApDeployMovedActive','noteEntryTurn','grantSelfEnergyMoveOnAttackStart','grantSelfTriggerUnchosen','outsideColorEnergyHandOrRest','moveOtherAcrossOrRemove','raidBaseEnergyThen','grantSelfAttackDamageThisTurn','restOppFrontLockActive','removeAnyOutsideScale','inspectTopColoredNamesOutside','drawDiscardIfEffectApPaid','activeSelf','grantSelfImpactThisTurn','grantOtherImpactThisTurn','returnSourceToHand','optionalOwnLifeToHandThenDraw','grantOwnNameBlockAtLeast','grantSelfBlockAtLeast','inspectTopColorAnyOutside','buffOwnNameIfPrintedEnergy']);
const integer=(v,low=0)=>Number.isInteger(v)&&v>=low;
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
// Shared board predicate used by passive bonuses and on-play ACTIVE.
// The shape is the printed query, never a title-specific reducer.
function assertLiveCondition(q,label){
 if(!q||typeof q!=='object'||Array.isArray(q)||
  !['own','opponent','any'].includes(q.turn)||
  !['outsideCount','ownNameExists','ownNameAbsent','ownFieldHasAllNames','ownTraitCount','ownCardTraitCount','ownEnergyAtLeast','ownHandCountAtLeast','ownLifeAtMost','ownEffectHandOutsideOrRecovery','ownEventUsedThisTurn','ownRetiredThisTurn','retireCountThisTurn','ownOutsideNamedCountAtLeast','ownRestPrintedBpAtMost','oppCharacterBpAtLeast','oppCharacterCurrentBpCount','oppRestCharacter','oppRestCharacterCount','ownPrintedApAtLeast','ownHandToOutsideThisTurn','ownHandFewerThanOpponent','ownEffectApPaidColor','ownFrontNoOtherCharacter','oppFrontLiveBpBelowPrinted','ownRemovedCountAtLeast','ownRemovedDistinctTrait'].includes(q.kind))
  throw Error(label+' invalid passive condition');
 if((q.kind==='ownRemovedCountAtLeast'||q.kind==='ownRemovedDistinctTrait')&&q.turn!=='any')
  throw Error(label+' removed-zone predicate is not turn-gated');
 if(q.kind==='ownEventUsedThisTurn'&&q.turn!=='own')
  throw Error(label+' event-use predicate requires own turn');
 if(q.kind==='ownEffectHandOutsideOrRecovery'&&q.turn!=='own')
  throw Error(label+' invalid effect-zone own-turn condition');
 // turn:'any' is the printed check with no extra turn icon. turn:'own'
 // is the printed 自分のターン中 icon. Opponent turn is not this sentence.
 if(q.kind==='ownHandToOutsideThisTurn'&&q.turn==='opponent')
  throw Error(label+' hand-to-outside history is not an opponent-turn gate');
 const retired=q.kind==='ownRetiredThisTurn';
 const retirementCount=q.kind==='retireCountThisTurn';
 const retirementExclude=retirementCount&&own(q,'excludeSelf');
 if(retirementCount&&(!['own','opponent','any'].includes(q.controller)||
  !['character','field','any'].includes(q.cardType)||!integer(q.min,1)||q.min>50||
  (retirementExclude&&q.excludeSelf!==true)))
  throw Error(label+' invalid retirement count predicate');
 if(retired&&!['field','character'].includes(q.cardType))
  throw Error(label+' invalid retired-card type');
 const count=['outsideCount','ownTraitCount','ownCardTraitCount','ownEnergyAtLeast','ownHandCountAtLeast','ownRemovedCountAtLeast','ownRemovedDistinctTrait'].includes(q.kind);
 const paidColor=q.kind==='ownEffectApPaidColor';
 if(paidColor&&!['blue','yellow','green','purple','red'].includes(q.color))
  throw Error(label+' invalid effect-AP color');
 const namedOutside=q.kind==='ownOutsideNamedCountAtLeast';
 const atMost=q.kind==='ownLifeAtMost';
 const restEach=q.kind==='ownRestPrintedBpAtMost';
 const oppBp=q.kind==='oppCharacterBpAtLeast';
 const oppBpCount=q.kind==='oppCharacterCurrentBpCount';
 const oppRest=q.kind==='oppRestCharacter'||q.kind==='oppRestCharacterCount';
 const printedAp=q.kind==='ownPrintedApAtLeast';
 const field=['ownNameExists','ownNameAbsent','ownFieldHasAllNames','ownTraitCount','ownCardTraitCount','ownRestPrintedBpAtMost'].includes(q.kind);
 // ownNameAbsent may name 場外. Presence checks stay on the field lines.
 const nameZones=q.kind==='ownNameAbsent'?['field','front','energy','outside']:['field','front','energy'];
 if((count&&(!integer(q.min,1)||q.min>200))||
  (namedOutside&&(!integer(q.min,1)||q.min>200||
   !Array.isArray(q.names)||q.names.length<1||q.names.length>8||
   q.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   new Set(q.names).size!==q.names.length))||
  (atMost&&(!integer(q.max)||q.max>10))||
  (field&&(!nameZones.includes(q.zone)||
   typeof q.excludeSelf!=='boolean'))||
  ((q.kind==='ownFrontNoOtherCharacter'||q.kind==='oppFrontLiveBpBelowPrinted')&&Object.keys(q).length!==2)||
  ((q.kind==='ownNameExists'||q.kind==='ownNameAbsent')&&(!q.name||typeof q.name!=='string'||!q.name.trim()))||
  (q.kind==='ownFieldHasAllNames'&&(!Array.isArray(q.names)||q.names.length<2||q.names.length>8||q.names.some(n=>typeof n!=='string'||!n.trim())||new Set(q.names).size!==q.names.length))||
  ((q.kind==='ownTraitCount'||q.kind==='ownCardTraitCount'||restEach)&&(!q.trait||typeof q.trait!=='string'||!q.trait.trim()))||
  (restEach&&(!integer(q.maxPrintedBp,0)||q.maxPrintedBp>50000))||
  (oppBp&&(!['field','front','energy'].includes(q.zone)||!integer(q.minBp,1)||q.minBp>50000))||
  (oppBpCount&&(!['field','front','energy'].includes(q.zone)||!integer(q.minBp,1)||q.minBp>50000||
   !integer(q.min,1)||q.min>8))||
  (oppRest&&!['field','front','energy'].includes(q.zone))||
  (printedAp&&(!['field','front','energy'].includes(q.zone)||typeof q.excludeSelf!=='boolean'||
   !integer(q.minAp,1)||q.minAp>3))||
  Object.keys(q).length!==(2+(count?1:0)+(namedOutside?2:0)+(atMost?1:0)+(retired?1:0)+(retirementCount?3:0)+(retirementExclude?1:0)+(field?2:0)+
   (['ownNameExists','ownNameAbsent','ownFieldHasAllNames','ownTraitCount','ownCardTraitCount','ownRestPrintedBpAtMost','ownRemovedDistinctTrait'].includes(q.kind)?1:0)+
   (restEach?1:0)+(oppBp?2:0)+(oppBpCount?3:0)+(oppRest?1:0)+(printedAp?3:0)+(paidColor?1:0))||
  Object.keys(q).some(k=>!['kind','turn',
   ...(count?['min']:[]),...(namedOutside?['min','names']:[]),...(atMost?['max']:[]),...(retired?['cardType']:[]),...(retirementCount?['controller','cardType','min']:[]),...(retirementExclude?['excludeSelf']:[]),...(field?['zone','excludeSelf']:[]),
   ...(q.kind==='ownNameExists'||q.kind==='ownNameAbsent'?['name']:[]),
   ...(q.kind==='ownFieldHasAllNames'?['names']:[]),
   ...(q.kind==='ownTraitCount'||q.kind==='ownCardTraitCount'||q.kind==='ownRemovedDistinctTrait'||restEach?['trait']:[]),
   ...(restEach?['maxPrintedBp']:[]),
   ...(oppBp?['zone','minBp']:[]),
   ...(oppBpCount?['zone','minBp','min']:[]),
   ...(oppRest?['zone']:[]),
   ...(printedAp?['zone','excludeSelf','minAp']:[]),
   ...(paidColor?['color']:[])].includes(k)))
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
  if(e.op==='grantFirstAttackKit'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.bp,1)||e.bp>5000||e.bp%500!==0||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','bp'].includes(k))))
   throw Error(path+'['+i+'] invalid first-attack kit');
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
   // ownEffect is 「自分の効果」. ownCharacter is 「自分のキャラの効果」.
   // The two gates are not interchangeable. Any other entry stays illegal.
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
  // 「N枚まで」is zero through N blind mills. Count 1 stays the older
  // single choice. Count 2 is the same choice repeated, and a skip stops.
  // 「3枚を置いてもよい。そうした場合」is one accept-or-skip for the whole
  // window, then one optional purple-character recovery. Bare count 3 stays illegal.
  const purpleRecover=e.op==='millTop'&&e.optional===true&&e.count===3&&
   Array.isArray(e.then)&&e.then.length===1&&e.then[0]?.op==='recoverOutsideOne'&&
   e.then[0].optional===true&&e.then[0].logic==='all'&&
   Array.isArray(e.then[0].filters)&&e.then[0].filters.length===2&&
   e.then[0].filters[0]?.field==='color'&&e.then[0].filters[0]?.value==='purple'&&
   e.then[0].filters[1]?.field==='type'&&e.then[0].filters[1]?.value==='character'&&
   Object.keys(e.then[0]).length===4&&
   Object.keys(e.then[0]).every(k=>['op','filters','logic','optional'].includes(k))&&
   Object.keys(e).length===4&&
   Object.keys(e).every(k=>['op','count','optional','then'].includes(k));
  if(e.op==='millTop'&&e.optional===true&&e.then!==undefined&&!purpleRecover)
   throw Error(path+'['+i+'] optional mill follow-up must recover one purple character');
  if(e.op==='millTop'&&e.optional!==undefined&&!purpleRecover&&(
   e.optional!==true||![1,2].includes(e.count)||
   Object.keys(e).some(k=>!['op','count','optional'].includes(k))
  ))throw Error(path+'['+i+'] optional mill is one or two cards');
  if(purpleRecover)verifyProgram(e.then,path+'['+i+'].then');
  // そうした場合: the follow-up exists only after this mandatory mill
  // actually moved a card. It is one other own character, BP+500.
  if(e.op==='millTop'&&e.then!==undefined&&e.optional===undefined){
   const follow=e.then?.[0];
   const buff=follow?.op==='buffOwnField'&&follow.optional===true&&
    follow.excludeSelf===true&&follow.bp===500&&follow.also===undefined&&
    follow.zone===undefined&&follow.filter?.field==='type'&&
    follow.filter?.value==='character'&&Object.keys(follow).length===5&&
    Object.keys(follow.filter||{}).length===2&&
    Object.keys(follow).every(k=>['op','filter','bp','optional','excludeSelf'].includes(k));
   if(e.optional!==undefined||e.count!==1||!Array.isArray(e.then)||e.then.length!==1||
    !buff||Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','count','then'].includes(k)))
    throw Error(path+'['+i+'] mill follow-up must be one other-character BP+500');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='drawIfSelfBpAtLeast'&&(
   !integer(e.bp,500)||e.bp>50000||e.bp%500!==0||e.count!==1||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid self-BP attack draw');
  if(e.op==='returnRetiredToHand'&&(
   typeof e.optional!=='boolean'||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid return of the retired card');
  if(e.op==='drawIfOwnEnergyAtLeast'&&(
   !integer(e.energy,1)||e.energy>50||
   !integer(e.count,1)||e.count>5||
   Object.keys(e).some(k=>!['op','energy','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid own-energy draw profile');
  if(e.op==='drawIfOppFrontBelowPrinted'&&(
   e.count!==1||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid below-printed front draw');
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
  if(e.op==='drawIfOwnName'&&(
   typeof e.name!=='string'||!e.name.trim()||
   !integer(e.count,1)||e.count>5||
   Object.keys(e).some(k=>!['op','name','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid own-field-name draw profile');
  if(e.op==='drawIfOppRestCharacter'&&(
   !integer(e.count,1)||e.count>5||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent REST-character draw');
  if(e.op==='drawIfOppCharacterBpAtLeast'&&(
   !integer(e.minBp,500)||e.minBp>50000||e.minBp%500!==0||
   !integer(e.count,1)||e.count>5||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','minBp','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent current-BP draw');
  if(e.op==='drawIfOwnNameAndHandFewer'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.count,1)||e.count>5||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','count'].includes(k))
  ))throw Error(path+'['+i+'] invalid named hand-count draw');
  if(e.op==='buffOwnNameIfPrintedEnergy'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.minEnergy,1)||e.minEnergy>10||
   !integer(e.bp,1)||e.bp>5000||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','name','minEnergy','bp'].includes(k))))
   throw Error(path+'['+i+'] invalid printed-energy name buff');
  if(e.op==='activeOwnNamed'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   e.max!==1||e.optional!==true||Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','name','max','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid named own ACTIVE');
  if(e.op==='activeEnergyNamed'&&(
   !Array.isArray(e.names)||e.names.length!==2||new Set(e.names).size!==2||
   e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   e.optional!==true||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','names','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid energy-line named ACTIVE');
  if(e.op==='recoverOutsideOne'&&e.filters){
   const valid=f=>f&&typeof f==='object'&&!Array.isArray(f)&&
    Object.keys(f).length===2&&['name','trait','color','type'].includes(f.field)&&
    typeof f.value==='string'&&!!f.value.trim()&&f.value.length<=80&&
    (f.field!=='type'||V2_CARD_TYPES.includes(f.value));
   if(!Array.isArray(e.filters)||e.filters.length!==2||!e.filters.every(valid)||
    new Set(e.filters.map(f=>f.field)).size!==2||
    !['all','any'].includes(e.logic)||typeof e.optional!=='boolean'||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','filters','logic','optional'].includes(k)))
    throw Error(path+'['+i+'] invalid compound outside recovery');
  }
  if(['searchDeckOne','searchDeckMany'].includes(e.op)||
   (e.op==='recoverOutsideOne'&&!e.filters)){
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
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
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
  // Name only. Do not add color, energy, or AP here: that would tighten the
  // filtered op above, and this print has none of those limits.
  if(e.op==='deployOutsideNameRest'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   e.optional!==true||Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','name','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid name-only outside REST');
  // Exact printed energy and color. AP is not a filter. A Raid name may
  // still enter as a normal REST character; this op does not offer Raid.
  if(e.op==='deployOutsideExactRest'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !['yellow','green','blue','purple','red'].includes(e.color)||
   !integer(e.energy)||e.energy>30||e.optional!==true||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','color','energy','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid exact-energy outside REST');
  // Trait token plus exact printed AP. Required energy must be met by the
  // controller's current generated energy of that card's color. A Raid name
  // may still enter as a normal REST character; this op does not offer Raid.
  if(e.op==='deployOutsideTraitApRest'&&(
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   !integer(e.ap,1)||e.ap>3||e.optional!==true||e.requireAffordableEnergy!==true||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','trait','ap','optional','requireAffordableEnergy'].includes(k))
  ))throw Error(path+'['+i+'] invalid trait AP outside REST');
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
  // rest onto the top. Optional color is printed color AND the trait.
  // Color never combines with orName. Slash composites are not split.
  if(e.op==='inspectTopTraitOutside'&&(
   !integer(e.count,2)||e.count>4||
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   (e.orName!==undefined&&(typeof e.orName!=='string'||!e.orName.trim()||e.orName.length>80))||
   (e.color!==undefined&&(!['red','yellow','green','blue','purple'].includes(e.color)||e.orName!==undefined))||
   (e.requiresOtherOwnTrait!==undefined&&(typeof e.requiresOtherOwnTrait!=='string'||!e.requiresOtherOwnTrait.trim()||e.requiresOtherOwnTrait.length>80))||
   e.rest!=='top'||Object.keys(e).length!==4+Number(e.orName!==undefined)+Number(e.requiresOtherOwnTrait!==undefined)+Number(e.color!==undefined)||
   Object.keys(e).some(k=>!['op','count','trait','rest','orName','requiresOtherOwnTrait','color'].includes(k))
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
  // 相手は山札の上から1枚を公開する。自分は山札の上か場外に置く。
  if(e.op==='revealOppTopPlace'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid revealed opponent top');
  // 必要エナジーの数を指定してから公開する。残りは場外。手札に加えても棄牌しない。
  if(e.op==='chooseEnergyRevealOutside'&&(
   !integer(e.count,1)||e.count>4||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','count'].includes(k))))
   throw Error(path+'['+i+'] invalid printed-energy reveal');
  // 手札を1枚リムーブエリアに置いてもよい。そうした場合 runs then.
  // Skip, or no matching hand card, does not run then. Zone is removed only.
  if(e.op==='optionalRemoveHandThen'){
   const f=e.filter,follow=e.then?.[0];
   if(e.zone!=='removed'||!f||typeof f!=='object'||Array.isArray(f)||
    Object.keys(f).length!==2||f.field!=='trait'||
    typeof f.value!=='string'||!f.value.trim()||f.value.length>80||
    !Array.isArray(e.then)||e.then.length!==1||follow?.op!=='buffSelf'||
    !integer(follow.bp,1)||follow.bp>5000||Object.keys(follow).length!==2||
    Object.keys(follow).some(k=>!['op','bp'].includes(k))||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','zone','filter','then'].includes(k)))
    throw Error(path+'['+i+'] invalid optional hand removal');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='inspectTopAnyOutside'&&(
   !integer(e.count,2)||e.count>4||!['top','bottom'].includes(e.rest)||
   (e.drawIfOutsideEnergyAtLeast!==undefined&&
    (!integer(e.drawIfOutsideEnergyAtLeast,1)||e.drawIfOutsideEnergyAtLeast>30))||
   Object.keys(e).some(k=>!['op','count','rest','drawIfOutsideEnergyAtLeast'].includes(k))
  ))throw Error(path+'['+i+'] invalid arbitrary top-outside choice');
  if(e.op==='inspectTopArrange'){
   // split places each inspected card on top or bottom. Absent split keeps
   // the whole window on one printed side.
   const split=e.split===true&&e.count===2&&Object.keys(e).length===3&&
    Object.keys(e).every(k=>['op','count','split'].includes(k));
   const whole=integer(e.count,2)&&e.count<=4&&typeof e.toOutside==='boolean'&&
    ['top','bottom'].includes(e.rest)&&e.split===undefined&&
    Object.keys(e).every(k=>['op','count','toOutside','rest'].includes(k));
   if(!(split||whole))throw Error(path+'['+i+'] invalid top inspect/arrange');
  }
  if(e.op==='searchTopOneBottomDiscard'){
   const isFilter=f=>f&&typeof f==='object'&&!Array.isArray(f)&&
    Object.keys(f).length===2&&(
     f.field==='traitlessCharacter'?f.value===true:
     ['name','trait','color','type'].includes(f.field)&&
     typeof f.value==='string'&&!!f.value.trim()&&
     (f.field!=='type'||V2_CARD_TYPES.includes(f.value)));
   // Absent excludeRaid keeps every older traitless window, including a
   // printed Raid character. True is only the レイドを持たない sentence.
   // Absent rest keeps the printed bottom order. outside is the only
   // closed alternative: the remainder goes straight to outside.
   const restOutside=e.rest==='outside';
   const restKey=restOutside?['rest']:[];
   const excludeRaid=e.excludeRaid===true&&e.filter?.field==='traitlessCharacter'&&
    e.filters===undefined&&e.logic===undefined;
   const noHandDiscard=e.noHandDiscard===true&&e.count===3&&
    e.filter?.field==='trait'&&e.rest===undefined&&e.excludeRaid===undefined&&
    e.filters===undefined&&e.groups===undefined&&e.logic===undefined;
   const single=isFilter(e.filter)&&e.filters===undefined&&e.logic===undefined&&
    (e.excludeRaid===undefined||excludeRaid)&&(e.rest===undefined||restOutside)&&
    (e.noHandDiscard===undefined||noHandDiscard)&&
    Object.keys(e).every(k=>['op','count','filter',...(e.excludeRaid===true?['excludeRaid']:[]),...restKey,...(e.noHandDiscard===true?['noHandDiscard']:[])].includes(k));
   // Four is the printed か chain on BLC-3-002. Five remains invalid.
   const compound=e.filter===undefined&&Array.isArray(e.filters)&&
    e.filters.length>=2&&e.filters.length<=4&&e.filters.every(isFilter)&&
    new Set(e.filters.map(f=>f.field+':'+f.value)).size===e.filters.length&&
    ['any','all'].includes(e.logic)&&(e.rest===undefined||restOutside)&&
    Object.keys(e).every(k=>['op','count','filters','logic',...restKey].includes(k));
   // Each group is AND. The card matches when any group matches. This is the
   // printed 「緑のイベントカードか緑のフィールドカード」 shape. It does not
   // combine with a flat filter, and two identical groups are rejected.
   const groupOk=g=>g&&typeof g==='object'&&!Array.isArray(g)&&
    g.logic==='all'&&Array.isArray(g.filters)&&g.filters.length>=2&&
    g.filters.length<=3&&g.filters.every(isFilter)&&
    new Set(g.filters.map(f=>f.field+':'+f.value)).size===g.filters.length&&
    Object.keys(g).length===2&&Object.keys(g).every(k=>k==='logic'||k==='filters');
   const groupSig=g=>g.filters.map(f=>f.field+':'+f.value).sort().join('&');
   const grouped=e.filter===undefined&&e.filters===undefined&&e.logic===undefined&&
    e.excludeRaid===undefined&&Array.isArray(e.groups)&&e.groups.length>=2&&
    e.groups.length<=4&&e.groups.every(groupOk)&&
    new Set(e.groups.map(groupSig)).size===e.groups.length&&
    (e.rest===undefined||restOutside)&&
    Object.keys(e).every(k=>['op','count','groups',...restKey].includes(k));
   if(!integer(e.count,1)||e.count>5||!(single||compound||grouped))
    throw Error(path+'['+i+'] invalid top-N filtered bottom/discard profile');
  }
  if(e.op==='searchTopUpToTwoBottom'){
   const valid=f=>f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&
    ['name','trait','color','type','printedRequiredEnergyAtMost','printedApAtLeast','traitlessCharacterOrField'].includes(f.field)&&
    (f.field==='traitlessCharacterOrField'?f.value===true:
      f.field==='printedRequiredEnergyAtMost'?integer(f.value)&&f.value<=30:
      f.field==='printedApAtLeast'?f.value===2:
     typeof f.value==='string'&&!!f.value.trim()&&f.value.length<=80&&
      (f.field!=='type'||V2_CARD_TYPES.includes(f.value)));
   if(!integer(e.count,1)||e.count>5||![1,2].includes(e.max)||e.rest!=='bottom'||
    !Array.isArray(e.filters)||e.filters.length<1||e.filters.length>3||
    !e.filters.every(valid)||new Set(e.filters.map(f=>f.field+':'+f.value)).size!==e.filters.length||
    !['any','all'].includes(e.logic)||Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','count','max','rest','filters','logic'].includes(k)))
    throw Error(path+'['+i+'] invalid TOP-N two-card hand search');
  }
  if(e.op==='deployOwnHandRest'){
   if(e.when!==undefined)assertLiveCondition(e.when,path+'['+i+'].when');
   // 特徴を持たない is an empty printed trait list. It is optional so older
   // hand REST profiles stay six keys plus an optional when.
   if(e.traitless!==undefined&&e.traitless!==true)
    throw Error(path+'['+i+'] invalid traitless hand REST flag');
   if(!['character','field'].includes(e.type)||!['blue','yellow','green','purple','red'].includes(e.color)||
    !integer(e.energy)||e.energy>30||!integer(e.ap,1)||e.ap>3||
    !integer(e.max,1)||e.max>4||
    Object.keys(e).length!==6+Number(e.when!==undefined)+Number(e.traitless===true)||
    Object.keys(e).some(k=>!['op','type','color','energy','ap','max','when','traitless'].includes(k)))
    throw Error(path+'['+i+'] invalid hand REST entry');
  }
  if(e.op==='deployOwnHandSpecial'){
    // A null maxEnergy means NO printed energy cap.
    // A null color means the print does not name a color.
    if(!['character','field'].includes(e.type)||
     !(e.color===null||['blue','yellow','green','purple','red'].includes(e.color))||
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
    if(e.ap!==1||e.optional!==true||!Array.isArray(e.then)||
     e.then.length<1||e.then.length>3||
     Object.keys(e).length!==4+Number(e.when!==undefined)||
     Object.keys(e).some(k=>!['op','ap','optional','then','when'].includes(k))||
     e.then.some(x=>!['draw','deployOwnHandRestOrRaid','deployOutsideNameRest'].includes(x?.op)))
     throw Error(path+'['+i+'] invalid optional AP payment');
    verifyProgram(e.then,path+'['+i+'].then');
   }
   if(e.op==='chooseOne'){
   const chooseExtra=(e.entry!==undefined?1:0)+(e.ownTurnOnly!==undefined?1:0);
   if(typeof e.optional!=='boolean'||!Array.isArray(e.options)||
    (e.options.length<2||e.options.length>3)||
    Object.keys(e).length!==3+chooseExtra||
    (e.entry!==undefined&&e.entry!=='ownEffect')||
    (e.ownTurnOnly!==undefined&&e.ownTurnOnly!==true)||
    Object.keys(e).some(k=>!['op','optional','options','entry','ownTurnOnly'].includes(k)))
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
       'grantFrontEnergyOwnOtherFrontTrait','bounceOwnOtherUnderEnergy','nextEligibleHandPlayApDiscount','searchTopUpToTwoBottom','deployOwnHandRest','buffSelfUntilNextOwnStart','grantSelfAttackEndSwapThisTurn','oncePerTurnGate','deployOwnHandRestOrRaid','enemyBpDown','activeSelf','grantSelfImpactThisTurn','peekTopOne','grantOwnNameBlockAtLeast','drawIfOppFrontBelowPrinted','buffNamedImpact','readyNameOrTrait','protectNameOrTrait','enemyFrontAllBpDown'].includes(x?.op)))
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
   const validPay=pay===undefined||pay&&typeof pay==='object'&&!Array.isArray(pay)&&
    Object.keys(pay).length===4&&pay.zone==='hand'&&pay.field==='name'&&
    ['exactAny','containsAny'].includes(pay.match)&&Array.isArray(pay.values)&&
    pay.values.length>=1&&pay.values.length<=4&&new Set(pay.values).size===pay.values.length&&
    pay.values.every(v=>typeof v==='string'&&!!v.trim()&&v.length<=48&&v===v.trim());
   if(!validPay)throw Error(path+'['+i+'] invalid typed name payment');
   if(e.when!==undefined)assertLiveCondition(e.when,path+'['+i+'].when');
   if(typeof e.optional!=='boolean'||!Array.isArray(e.then)||
    !e.then.length||e.then.length>6||
    (e.count!==undefined&&e.count!==2)||
    Object.keys(e).some(k=>!['op','optional','then','payment','count','when'].includes(k))||
    e.then.some(x=>!['draw','millTop','peekTopOne','searchDeckOne',
     'searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside',
      'peekTopOrBottom','recoverOutsideOne','deployOutsideRest','deployOutsideTraitApRest',
     'enemyBpDown','enemyFrontAllBpDown','retireOppFrontAllUnderBp','buffOwnTraitAllTurn',
     'recoverOutsideColorUnderEnergy','buffOwnField',
     'restOppFrontUnderBp','restOppFrontOne','buffSelf','swapOrBuff','grantOnAttack',
     'grantSelfEnergyMoveOnAttackStart','grantSelfTriggerUnchosen',
     'outsideColorEnergyHandOrRest','grantSelfBlockAtLeast','recoverAp'].includes(x?.op)))
    throw Error(path+'['+i+'] invalid gated payment');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='swapOrBuff'&&(
   e.bp!==1000||typeof e.allName!=='string'||!e.allName.trim()||e.allName.length>80||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','allName'].includes(k))
  ))throw Error(path+'['+i+'] invalid swap or self BP');
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
  if(e.op==='inspectTopColorAnyOutside'&&(
   e.count!==2||e.rest!=='top'||
   !['blue','yellow','green','purple','red'].includes(e.color)||
   !Array.isArray(e.names)||e.names.length!==2||new Set(e.names).size!==2||
   e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','count','rest','color','names','trait'].includes(k))))
   throw Error(path+'['+i+'] invalid colored name-or-trait top');
  if(e.op==='inspectTopColoredNamesOutside'){
   if(!integer(e.count,2)||e.count>4||e.rest!=='top'||e.max!==1||
    !['blue','yellow','green','purple','red'].includes(e.color)||
    !Array.isArray(e.names)||e.names.length!==2||new Set(e.names).size!==2||
    e.names.some(n=>typeof n!=='string'||!n.trim()||n.length>80)||
    Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','count','rest','max','color','names'].includes(k)))
    throw Error(path+'['+i+'] invalid colored-name top outside');
  }
  if(e.op==='drawDiscardIfEffectApPaid'){
   if(!['blue','yellow','green','purple','red'].includes(e.color)||e.discardCount!==1||
    Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','color','discardCount'].includes(k)))
    throw Error(path+'['+i+'] invalid effect-AP draw/discard');
  }
  if(e.op==='activeSelf'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid self ACTIVE');
  if(e.op==='grantSelfImpactThisTurn'&&(
   e.amount!==1||Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','amount'].includes(k))))
   throw Error(path+'['+i+'] invalid this-turn impact grant');
  if(e.op==='grantOtherImpactThisTurn'&&(
   e.amount!==1||e.optional!==true||
   (e.plus!==undefined&&e.plus!==true)||
   (e.includeSelf!==undefined&&e.includeSelf!==true)||
   ((e.trait!==undefined)===(e.minPrintedAp!==undefined))||
   (e.trait!==undefined&&(typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80))||
   (e.minPrintedAp!==undefined&&e.minPrintedAp!==2)||
   Object.keys(e).length!==4+(e.plus!==undefined?1:0)+(e.includeSelf!==undefined?1:0)||
   Object.keys(e).some(k=>!['op','trait','minPrintedAp','amount','optional','plus','includeSelf'].includes(k))))
   throw Error(path+'['+i+'] invalid other-character impact grant');
  if(e.op==='returnSourceToHand'&&Object.keys(e).some(k=>k!=='op'))
   throw Error(path+'['+i+'] invalid source hand return');
  // Optional own LIFE card to hand, then a mandatory draw only after a take.
  // The follow-up is locked to draw 1; a different 「そうした場合」 needs its own audit.
  if(e.op==='optionalOwnLifeToHandThenDraw'&&(
   !Array.isArray(e.then)||e.then.length!==1||e.then[0]?.op!=='draw'||e.then[0]?.count!==1||
   Object.keys(e.then[0]).some(k=>!['op','count'].includes(k))||
   Object.keys(e).length!==2||Object.keys(e).some(k=>!['op','then'].includes(k))))
   throw Error(path+'['+i+'] invalid optional life-to-hand draw');
  if(e.op==='grantOwnNameBlockAtLeast'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).length!==4||
   Object.keys(e).some(k=>!['op','name','bp','optional'].includes(k))))
   throw Error(path+'['+i+'] invalid named blocker ceiling');
  // Paid hand-to-outside, then THIS character cannot be blocked by BP at
  // least the printed number. The floor stays on the existing at-most grant.
  if(e.op==='grantSelfBlockAtLeast'&&(
   !integer(e.bp,500)||e.bp>20000||e.bp%500!==0||
   Object.keys(e).length!==2||
   Object.keys(e).some(k=>!['op','bp'].includes(k))))
   throw Error(path+'['+i+'] invalid self blocker ceiling');
  if(e.op==='readyNameOrTrait'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   e.optional!==true||e.upTo!==1||
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','name','trait','optional','upTo'].includes(k))))
   throw Error(path+'['+i+'] invalid name-or-trait ACTIVE');
  if(e.op==='protectNameOrTrait'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   typeof e.trait!=='string'||!e.trait.trim()||e.trait.length>80||
   e.scope!=='any'||e.until!=='nextOwnStart'||e.optional!==true||e.upTo!==1||
   Object.keys(e).length!==7||
   Object.keys(e).some(k=>!['op','name','trait','scope','until','optional','upTo'].includes(k))))
   throw Error(path+'['+i+'] invalid name-or-trait protection');
  if(e.op==='sacrificeNamedChain'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   e.optional!==true||e.per!==1000||e.impactMinEnergy!==5||
   e.when?.kind!=='ownNameAbsent'||e.when?.zone!=='outside'||
   Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','name','optional','per','impactMinEnergy','when'].includes(k))))
   throw Error(path+'['+i+'] invalid named sacrifice chain');
  if(e.op==='sacrificeNamedChain')assertLiveCondition(e.when,path+'['+i+'].when');
  if(e.op==='buffNamedImpact'&&(
   typeof e.name!=='string'||!e.name.trim()||e.name.length>80||
   !integer(e.bp,1000)||e.bp>5000||e.bp%1000!==0||
   e.impact!==1||e.duration!=='turn'||e.upTo!==1||
   Object.keys(e).length!==6||
   Object.keys(e).some(k=>!['op','name','bp','impact','duration','upTo'].includes(k))))
   throw Error(path+'['+i+'] invalid named impact buff');
  if(e.op==='restActiveNamedReadyAp'&&(
   !Array.isArray(e.names)||e.names.length<1||e.names.length>2||
   !e.names.every(x=>typeof x==='string'&&!!x.trim()&&x.length<=80)||
   new Set(e.names).size!==e.names.length||e.recoverAp!==1||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','names','recoverAp'].includes(k))))
   throw Error(path+'['+i+'] invalid named rest-to-ready-AP effect');
  if(e.op==='oncePerTurnGate'){
   if(!['card','name'].includes(e.scope)||typeof e.optional!=='boolean'||
    (e.ownTurnOnly!==undefined&&e.ownTurnOnly!==true)||
    !Array.isArray(e.then)||e.then.length<1||e.then.length>6||
    Object.keys(e).some(k=>!['op','scope','optional','then','ownTurnOnly'].includes(k))||
    e.then.some(x=>!['draw','millTop','peekTopOne','enemyBpDown',
     'restOppFrontUnderBp','restOppFrontOne','buffOwnField','searchDeckOne',
     'recoverOutsideOne','buffSelf','optionalPayApThen','deployOwnHandRestOrRaid'].includes(x?.op)))
    throw Error(path+'['+i+'] invalid once-per-turn gate');
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
  if(e.op==='recoverOutsideUnderEnergy'&&(
   !integer(e.energy)||e.energy>30||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','energy','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid printed-energy outside recovery');
  if(e.op==='bounceOwnOtherUnderEnergy'){
   // 「必要エナジーがN以下の自分の場のキャラを1枚手札に戻してもよい。
   // そうした場合」is one optional field character, including this source
   // when its own printed energy qualifies, then one optional recovery of
   // any card at that same printed energy. The older mandatory bounce still
   // excludes this source and returns the source when nothing else qualifies.
   const energyThen=e.optional===true&&integer(e.energy)&&e.energy<=30&&
    Array.isArray(e.then)&&e.then.length===1&&
    e.then[0]?.op==='recoverOutsideUnderEnergy'&&e.then[0].optional===true&&
    e.then[0].energy===e.energy&&Object.keys(e.then[0]).length===3&&
    Object.keys(e.then[0]).every(k=>['op','energy','optional'].includes(k))&&
    Object.keys(e).length===4&&
    Object.keys(e).every(k=>['op','optional','energy','then'].includes(k));
   if(energyThen)verifyProgram(e.then,path+'['+i+'].then');
   else if(e.optional===true&&(e.then!==undefined||e.energy!==undefined))
    throw Error(path+'['+i+'] optional energy bounce follow-up must recover one card at that energy');
   else if(e.optional===true){
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
   const one=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===2&&
    ['name','trait','color','type'].includes(x.field)&&
    typeof x.value==='string'&&!!x.value.trim()&&x.value.length<=80&&
    (x.field!=='type'||V2_CARD_TYPES.includes(x.value));
   const f=e.filter,also=e.also;
   if(!one(f)||(also!==undefined&&(!one(also)||also.field===f.field))||
    !integer(e.bp,1)||e.bp>5000||
    typeof e.optional!=='boolean'||typeof e.excludeSelf!=='boolean'||
    (e.zone!==undefined&&e.zone!=='front')||
    (e.attackEndRetire!==undefined&&e.attackEndRetire!==true)||
    ((e.bonusNames!==undefined||e.bonusBp!==undefined)&&!(
     Array.isArray(e.bonusNames)&&e.bonusNames.length>=1&&e.bonusNames.length<=4&&
     e.bonusNames.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80)&&
     new Set(e.bonusNames).size===e.bonusNames.length&&
     integer(e.bonusBp,e.bp+1)&&e.bonusBp<=5000))||
    Object.keys(e).some(k=>!['op','filter','also','bp','optional','excludeSelf','zone','bonusNames','bonusBp','attackEndRetire'].includes(k)))
    throw Error(path+'['+i+'] invalid own-field BP choice');
  }
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
  // Up to one opposing FRONT character at or below a live BP. Return uses
  // the shared Q62 bounce, so it is not a retirement profile.
  if(e.op==='bounceOppFrontOneUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid optional BP-limited opponent return');
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
  if(e.op==='retireOwnTraitFollow'){
   const follow=e.follow;
   const traitOk=typeof e.trait==='string'&&!!e.trait.trim()&&e.trait.length<=80;
   const under=!!follow&&follow.kind==='underBpDraw'&&follow.draw===1&&
    Object.keys(follow).length===2&&Object.keys(follow).every(k=>['kind','draw'].includes(k));
   const pair=!!follow&&follow.kind==='drawActivePair'&&follow.draw===1&&follow.max===2&&
    integer(follow.ap)&&follow.ap<=3&&
    ['red','blue','yellow','green','purple'].includes(follow.color)&&
    typeof follow.name==='string'&&!!follow.name.trim()&&follow.name.length<=80&&
    typeof follow.trait==='string'&&!!follow.trait.trim()&&follow.trait.length<=80&&
    Object.keys(follow).length===7&&
    Object.keys(follow).every(k=>['kind','draw','max','ap','color','name','trait'].includes(k));
   if(typeof e.optional!=='boolean'||!traitOk||!(under||pair)||
    Object.keys(e).length!==4||
    Object.keys(e).some(k=>!['op','optional','trait','follow'].includes(k)))
    throw Error(path+'['+i+'] invalid trait retirement follow-up');
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
  if(e.op==='oppFrontRestBranch'){
   const keys=Object.keys(e);
   const nameOk=typeof e.name==='string'&&!!e.name.trim()&&e.name.length<=80;
   const restDraw=e.optional===true&&e.base==='rest'&&e.instead==='restSkipDraw'&&
    e.bp===undefined&&nameOk&&keys.length===5&&
    keys.every(k=>['op','optional','name','base','instead'].includes(k));
   const capped=e.optional===false&&e.base==='restSkip'&&e.instead==='retire'&&
    integer(e.bp,1)&&e.bp<=50000&&nameOk&&keys.length===6&&
    keys.every(k=>['op','optional','bp','name','base','instead'].includes(k));
   if(!restDraw&&!capped)throw Error(path+'['+i+'] invalid front rest branch');
  }
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
  if(e.op==='retireOppFrontUnderBp'){
   if(e.traitPerBp!==undefined){
    const scale=e.traitPerBp;
    if(e.bp!==undefined||e.bonusName!==undefined||e.bonusBp!==undefined||e.bonusOutsideName!==undefined||
     !scale||typeof scale!=='object'||Array.isArray(scale)||
     typeof scale.trait!=='string'||!scale.trait.trim()||scale.trait.length>80||scale.per!==1000||
     Object.keys(scale).length!==2||Object.keys(scale).some(k=>!['trait','per'].includes(k))||
     Object.keys(e).length!==2||Object.keys(e).some(k=>!['op','traitPerBp'].includes(k)))
     throw Error(path+'['+i+'] unsupported trait-scaled BP retirement');
   }else if(e.raidOrName!==undefined){
    const bonus=e.raidOrName;
    if(e.bonusName!==undefined||e.bonusOutsideName!==undefined||
     !integer(e.bp,1)||e.bp>50000||!integer(e.bonusBp,e.bp+1)||e.bonusBp>50000||
     !bonus||typeof bonus!=='object'||Array.isArray(bonus)||
     typeof bonus.name!=='string'||!bonus.name.trim()||bonus.name.length>80||
     Object.keys(bonus).length!==1||Object.keys(bonus).some(k=>k!=='name')||
     Object.keys(e).some(k=>!['op','bp','bonusBp','raidOrName'].includes(k)))
     throw Error(path+'['+i+'] unsupported raid-or-name BP retirement');
   }else if(e.nameOrTraitPerBp!==undefined){
    const scale=e.nameOrTraitPerBp;
    if(e.bp!==undefined||e.bonusName!==undefined||e.bonusBp!==undefined||e.bonusOutsideName!==undefined||
     e.traitPerBp!==undefined||e.raidOrName!==undefined||e.optional!==false||
     !scale||typeof scale!=='object'||Array.isArray(scale)||
     typeof scale.trait!=='string'||!scale.trait.trim()||scale.trait.length>80||
     typeof scale.name!=='string'||!scale.name.trim()||scale.name.length>80||
     scale.per!==1000||
     Object.keys(scale).length!==3||Object.keys(scale).some(k=>!['trait','name','per'].includes(k))||
     Object.keys(e).length!==3||Object.keys(e).some(k=>!['op','optional','nameOrTraitPerBp'].includes(k)))
     throw Error(path+'['+i+'] unsupported name-or-trait BP retirement');
   }else if(e.traitCountBonus!==undefined){
    const bonus=e.traitCountBonus;
    if(e.bonusName!==undefined||e.bonusBp!==undefined||e.bonusOutsideName!==undefined||
     e.traitPerBp!==undefined||e.raidOrName!==undefined||e.nameOrTraitPerBp!==undefined||
     e.optional!==true||!integer(e.bp,1)||e.bp>50000||
     !bonus||typeof bonus!=='object'||Array.isArray(bonus)||
     typeof bonus.trait!=='string'||!bonus.trait.trim()||bonus.trait.length>80||
     !integer(bonus.min,1)||bonus.min>12||bonus.excludeSelf!==true||
     !integer(bonus.bonusBp,e.bp+1)||bonus.bonusBp>50000||
     Object.keys(bonus).length!==4||
     Object.keys(bonus).some(k=>!['trait','min','excludeSelf','bonusBp'].includes(k))||
     Object.keys(e).length!==4||
     Object.keys(e).some(k=>!['op','bp','optional','traitCountBonus'].includes(k)))
     throw Error(path+'['+i+'] unsupported trait-count BP retirement');
   }else{
   const plain=e.bonusName===undefined&&e.bonusBp===undefined&&e.bonusOutsideName===undefined;
   if(plain){
    const keys=Object.keys(e);
    const mandatory=e.optional===false;
    if(!integer(e.bp,1)||e.bp>50000||
     (e.optional!==undefined&&!mandatory)||
     !keys.every(k=>['op','bp','optional'].includes(k))||
     keys.length!==(mandatory?3:2))
     throw Error(path+'['+i+'] unsupported printed BP retirement profile');
   }else if(!integer(e.bp,1)||e.bp>50000||typeof e.bonusName!=='string'||
    !e.bonusName.trim()||!integer(e.bonusBp,e.bp)||e.bonusBp>50000||
    (e.bonusOutsideName!==undefined&&(typeof e.bonusOutsideName!=='string'||
     !e.bonusOutsideName.trim()||e.bonusOutsideName.length>80))||
    Object.keys(e).some(k=>!['op','bp','bonusName','bonusBp','bonusOutsideName'].includes(k)))
    throw Error(path+'['+i+'] unsupported printed BP retirement profile');
   }
  }
  if(e.op==='peekTopOne'&&Object.keys(e).some(key=>key!=='op'))throw Error(path+'['+i+'] unsupported private peek options');
  if(e.op==='recoverAp'&&(!integer(e.count,1)||e.count>3))throw Error(path+'['+i+'] invalid AP recovery count');
  if(e.op==='drawDiscard'){
   const keys=Object.keys(e);
   const base=integer(e.count,1)&&e.count<=10&&
    (e.discardCount===undefined?e.count===1:integer(e.discardCount,1)&&e.discardCount<=10);
   const plain=e.instead===undefined&&base&&
    keys.every(k=>['op','count','discardCount'].includes(k));
   const alt=e.instead;
   // 『抽って場外』を『引く』に代えてもよい. The replacement is the same
   // draw count and only exists while its printed live condition holds.
   // An absent instead keeps every older mandatory draw/discard.
   const replaced=base&&e.count===1&&e.discardCount===1&&
    alt&&typeof alt==='object'&&!Array.isArray(alt)&&
    alt.op==='draw'&&alt.count===1&&alt.when&&typeof alt.when==='object'&&
    !Array.isArray(alt.when)&&keys.length===4&&
    keys.every(k=>['op','count','discardCount','instead'].includes(k))&&
    Object.keys(alt).length===3&&
    Object.keys(alt).every(k=>['op','count','when'].includes(k));
   if(!plain&&!replaced)throw Error(path+'['+i+'] invalid mandatory draw/discard profile');
   if(replaced)assertLiveCondition(alt.when,path+'['+i+'].instead.when');
  }
  if(['buffSelf','enemyBpDown'].includes(e.op)&&(!integer(e.bp,1)||e.bp>5000))throw Error(path+'['+i+'] invalid temporary BP');
  if(e.op==='moveOtherAcrossOrRemove'){
   const keys=Object.keys(e);
   const named=typeof e.excludeName==='string'&&!!e.excludeName.trim()&&e.excludeName.length<=80;
   const self=e.includeSelf===true;
   const noTrait=e.traitless===true;
   // traitless is a third closed shape: another character whose printed
   // trait list is empty. It cannot combine with a name exclusion or self.
   const legacy=e.optional===true&&named&&!self&&!noTrait&&keys.length===3&&
    keys.every(k=>['op','optional','excludeName'].includes(k));
   const anyOwn=e.optional===true&&self&&!noTrait&&e.excludeName===undefined&&keys.length===3&&
    keys.every(k=>['op','optional','includeSelf'].includes(k));
   const traitlessOther=e.optional===true&&noTrait&&!self&&e.excludeName===undefined&&
    keys.length===3&&keys.every(k=>['op','optional','traitless'].includes(k));
   if(!legacy&&!anyOwn&&!traitlessOther)throw Error(path+'['+i+'] invalid other-character line move');
  }
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
   Object.keys(e).length!==5||
   Object.keys(e).some(k=>!['op','target','optional','until','then'].includes(k))
  ))throw Error(path+'['+i+'] invalid granted attack program');
  if(e.op==='enemyBpDown'&&(
   (e.maxTargets!==undefined&&(
    e.maxTargets!==2||e.optional!==true||e.zone==='field'))||
   (e.optional!==undefined&&typeof e.optional!=='boolean')||
   (e.minBp!==undefined&&(!integer(e.minBp,0)||e.minBp>50000))||
   (e.maxBp!==undefined&&(!integer(e.maxBp,0)||e.maxBp>50000))||
   (e.minBp!==undefined&&e.maxBp!==undefined&&e.minBp>e.maxBp)||
   (e.zone!==undefined&&e.zone!=='front'&&e.zone!=='field')||
   (e.ownTurnOnly!==undefined&&e.ownTurnOnly!==true)||
   Object.keys(e).some(k=>!['op','bp','optional','minBp','maxBp','zone','maxTargets','ownTurnOnly'].includes(k))
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
   Object.keys(p).some(k=>!['condition','bp','extraEnergy','extraDamage','impact','bpEach','attackDamage'].includes(k))||
   (p.bp===undefined&&p.extraEnergy===undefined&&p.extraDamage===undefined&&p.impact===undefined&&p.bpEach===undefined&&p.attackDamage===undefined)||
   (p.bp!==undefined&&(
    p.condition?.kind==='ownNameAbsent'
     ?(!Number.isInteger(p.bp)||p.bp>=0||p.bp<-5000||p.bp%500!==0)
     :(!integer(p.bp,1)||p.bp>5000)))||
   (p.extraEnergy!==undefined&&(!integer(p.extraEnergy,1)||p.extraEnergy>3))||
   (p.extraDamage!==undefined&&(!integer(p.extraDamage,1)||p.extraDamage>2))||
   (p.impact!==undefined&&p.impact!==1)||
   (p.attackDamage!==undefined&&(p.attackDamage!==2||p.bp!==undefined||p.extraEnergy!==undefined||
    p.extraDamage!==undefined||p.impact!==undefined||p.bpEach!==undefined))||
   (p.bpEach!==undefined&&(!integer(p.bpEach,1)||p.bpEach>5000||p.bpEach%500!==0||
    p.bp!==undefined||p.extraEnergy!==undefined||p.extraDamage!==undefined||p.impact!==undefined)))
    throw Error(card.id+' invalid passive bonus');
  // 【インパクト（1）】 from a live condition is not added on top of a
  // printed impact keyword or a facedown-under impact. No FAQ stacks them.
  if(p.impact===1&&(card.printedImpact||card.conditionalUnderFaceDown?.impact))
   throw Error(card.id+' conditional impact does not stack with a printed impact profile');
  const q=p.condition;
  if(p.extraDamage!==undefined&&(card.type!=='character'||q.turn!=='own'))
   throw Error(card.id+' extra damage must be printed own-turn character bonus');
  if(q.logic==='all'||q.logic==='any'){
   if(!['own','opponent','any'].includes(q.turn)||!Array.isArray(q.checks)||
    q.checks.length<2||q.checks.length>3||
    q.checks.some(c=>!c||typeof c!=='object'||Array.isArray(c))||
    Object.keys(q).some(k=>!['logic','turn','checks'].includes(k)))
    throw Error(card.id+' invalid or cyclic passive condition');
   for(const check of q.checks)assertLiveCondition(check,card.id);
   // Absence alone stays a penalty. A positive bonus needs another clause.
   if(q.checks.every(c=>c.kind==='ownNameAbsent')&&
    (p.bp===undefined||p.bp>=0||p.extraEnergy!==undefined||
     p.extraDamage!==undefined||p.impact!==undefined||p.bpEach!==undefined))
    throw Error(card.id+' name-absence penalty is BP only');
  }else assertLiveCondition(q,card.id);
  if(q.kind==='ownNameAbsent'&&(p.bp===undefined||p.extraEnergy!==undefined||
   p.extraDamage!==undefined||p.impact!==undefined||p.bpEach!==undefined))
   throw Error(card.id+' name-absence penalty is BP only');
  if((q.kind==='ownRestPrintedBpAtMost'||q.kind==='oppRestCharacterCount')&&p.bpEach===undefined)
   throw Error(card.id+' per-card printed BP bonus needs bpEach');
  if(p.bpEach!==undefined&&!['ownRestPrintedBpAtMost','oppRestCharacterCount','ownPrintedApAtLeast'].includes(q.kind))
   throw Error(card.id+' per-card printed BP bonus needs bpEach');
  if(p.extraEnergy!==undefined&&q.kind==='ownEnergyAtLeast')
   throw Error(card.id+' invalid or cyclic passive condition');
 }
 return Object.freeze(entries.map(p=>Object.freeze({...p,
  condition:Object.freeze({...p.condition,
   ...(p.condition.kind==='ownFieldHasAllNames'?{names:Object.freeze([...p.condition.names])}:{}),
   ...(p.condition.logic==='all'||p.condition.logic==='any'?{checks:Object.freeze(p.condition.checks.map(c=>Object.freeze({...c,
    ...(Array.isArray(c.names)?{names:Object.freeze([...c.names])}:{})})))}:{})})})));
}
function normalize(card,packId){
 if(!card||typeof card!=='object'||Array.isArray(card)||typeof card.id!=='string'||!card.id.trim())
  throw Error('Invalid card identifier');
 if(!V2_CARD_TYPES.includes(card.type))throw Error(card.id+' unsupported type');
 if(!integer(card.energy)||card.energy>30||!integer(card.ap,1)||card.ap>3||
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
 if(ownOutsideRecovery!==null&&(
  card.type!=='character'||ownOutsideRecovery?.op!=='restSelfToEnergy'||
  ownOutsideRecovery?.optional!==true||ownOutsideRecovery?.rest!==true||
  Object.keys(ownOutsideRecovery).length!==3||
  Object.keys(ownOutsideRecovery).some(k=>!['op','optional','rest'].includes(k))
 ))throw Error(card.id+' unsupported own-outside recovery entry');
 if(card.enterActiveIfOpponentRest!==undefined&&
    (card.type!=='character'||card.enterActiveIfOpponentRest!==true))
   throw Error(card.id+' invalid conditional ACTIVE entry');
  if(card.enterAlwaysActive!==undefined&&
    (!['character','field'].includes(card.type)||card.enterAlwaysActive!==true||
     card.enterActiveIfOpponentRest===true))
   throw Error(card.id+' invalid unconditional ACTIVE entry');
  if(card.frontForbidden!==undefined&&(card.type!=='character'||card.frontForbidden!==true))
  throw Error(card.id+' invalid front-line restriction');
 if(card.energyForbidden!==undefined&&(card.type!=='character'||card.energyForbidden!==true||card.frontForbidden===true))
  throw Error(card.id+' invalid energy-line restriction');
 const colorTriggerFieldSubstitution=card.colorTriggerFieldSubstitution??null;
 if(colorTriggerFieldSubstitution!==null&&
  (card.type!=='character'||card.color!==colorTriggerFieldSubstitution||
   typeof colorTriggerFieldSubstitution!=='string'||!colorTriggerFieldSubstitution.trim()))
  throw Error(card.id+' invalid live COLOR field-substitution profile');
 const mainAbility=card.mainAbility??null;
 // Generic printed FIELD cost: REST itself, truly retire it, then either one
 // optional named CHARACTER from OWN OUTSIDE enters ACTIVE ENERGY for no AP,
 // or the printed draw-two then discard-one. The two continuations do not mix.
 const fieldThen=mainAbility?.then;
 const fieldDeploy=fieldThen?.[0]?.op==='deployNamedFromZones'&&
  fieldThen[0].zones?.length===1&&fieldThen[0].zones[0]==='outside'&&
  fieldThen[0].line==='energy'&&fieldThen[0].ready===true&&
  fieldThen[0].optional===true&&
  fieldThen[0].color!==undefined&&
  fieldThen[0].ap===1;
 const fieldDraw=fieldThen?.[0]?.op==='drawDiscard'&&
  fieldThen[0].count===2&&fieldThen[0].discardCount===1&&
  Object.keys(fieldThen[0]).length===3&&
  Object.keys(fieldThen[0]).every(k=>['op','count','discardCount'].includes(k));
 const fieldRestRetireThen=mainAbility?.op==='fieldRestRetireThen'&&
  card.type==='field'&&Object.keys(mainAbility).length===2&&
  Array.isArray(fieldThen)&&fieldThen.length===1&&(fieldDeploy||fieldDraw);
 if(fieldRestRetireThen)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainFieldReplay=mainAbility?.op==='fieldRestSacrificeReplay'&&
  card.type==='field'&&Object.keys(mainAbility).length===1;
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
 // Exactly one printed gain: BP, or this card's own generated energy.
 // Absent energy keeps every older BP profile. Both keys together are illegal.
 const discardBuffBp=Number.isInteger(mainAbility?.bp)&&mainAbility.bp>=1&&mainAbility.bp<=5000;
 const discardBuffEnergy=Number.isInteger(mainAbility?.energy)&&mainAbility.energy>=1&&mainAbility.energy<=3;
 const mainDiscardBuff=mainAbility?.op==='discardHandBuffSelf'&&
  mainAbility.oncePerTurn===true&&mainAbility.discardCount===1&&
  discardBuffBp!==discardBuffEnergy&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','discardCount',discardBuffBp?'bp':'energy'].includes(k));
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
    frontGate&&Array.isArray(frontGate.then)&&frontGate.then.length>=1&&
    frontGate.then.length<=6&&frontEffects.every(e=>
     ['enemyBpDown','draw','buffSelf','grantOnAttack',
      'grantSelfEnergyMoveOnAttackStart','grantSelfTriggerUnchosen'].includes(e?.op))))||
   (frontProgram.length===1&&frontProgram[0]?.op==='buffOwnField'&&
    frontProgram[0].optional===false&&frontProgram[0].excludeSelf===false&&
    frontProgram[0].filter?.field==='name'&&frontProgram[0].zone===undefined)||
   (frontProgram.length===2&&frontProgram[0]?.op==='drawDiscard'&&
    frontProgram[0].count===1&&Object.keys(frontProgram[0]).length===2&&
    frontProgram[1]?.op==='grantFrontEnergyOwnOtherFrontTrait'&&
    frontProgram[1].optional===true&&frontProgram[1].until==='thisTurn'&&
    typeof frontProgram[1].trait==='string'&&!!frontProgram[1].trait.trim()&&
    frontProgram[1].trait.length<=80&&Object.keys(frontProgram[1]).length===4)||
   (frontProgram.length===1&&frontProgram[0]?.op==='drawDiscard'&&
    frontProgram[0].count===1&&frontProgram[0].discardCount===1&&
    Object.keys(frontProgram[0]).length===3)||
   (frontProgram.length===1&&frontProgram[0]?.op==='restOppFrontUnderBp'&&
    frontProgram[0].optional===true&&integer(frontProgram[0].bp,1)&&
    frontProgram[0].bp<=50000&&Object.keys(frontProgram[0]).length===3&&
    Object.keys(frontProgram[0]).every(k=>['op','bp','optional'].includes(k)))||
   (frontProgram.length===1&&frontProgram[0]?.op==='millTop'&&
    frontProgram[0].count===1&&frontProgram[0].optional===undefined&&
    Array.isArray(frontProgram[0].then)&&frontProgram[0].then.length===1&&
    Object.keys(frontProgram[0]).length===3&&
    Object.keys(frontProgram[0]).every(k=>['op','count','then'].includes(k)))
  )&&Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(mainFrontProgram)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainNamedDouble=mainAbility?.op==='nameOnceRestRetireDouble'&&
  card.type==='character'&&mainAbility.scope==='name'&&mainAbility.trait==='殭屍'&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','scope','trait'].includes(k));
 const mainEntrySacrifice=mainAbility?.op==='entryTurnSacrificeChoice'&&
  card.type==='character'&&card.color==='yellow'&&
  mainAbility.oncePerTurn===true&&mainAbility.energy===1&&
  mainAbility.color==='yellow'&&mainAbility.minBp===1500&&mainAbility.down===1000&&
  Object.keys(mainAbility).length===6&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','energy','color','minBp','down'].includes(k));
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
  (mainAbility.entryTurnOnly===undefined||mainAbility.entryTurnOnly===true)&&
  Object.keys(mainAbility).length===7+Number(mainAbility.entryTurnOnly!==undefined)&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','frontOnly','raidOnly','payAp','requiresOwnName','then','entryTurnOnly'].includes(k));
 if(mainOncePay)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 // 【起動メイン】このキャラをアクティブにする。Name scope is the printed
 // 「〈名前〉のこの効果は1ターンに1回」. when:null has no extra gate.
 // A single live check is the printed 「場合のみ」.
 const nameOnceActive=mainAbility?.op==='nameOnceActive'&&
  mainAbility.scope==='name'&&
  (mainAbility.when===null||(
   mainAbility.when?.kind==='oppFrontLiveBpBelowPrinted'&&
   mainAbility.when.turn==='any'&&Object.keys(mainAbility.when).length===2))&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','scope','when'].includes(k));
 if(nameOnceActive&&mainAbility.when)assertLiveCondition(mainAbility.when,card.id+' name once');
 // 〈名前〉のこの効果は1ターンに1回, and only after that named event was used.
 const nameOnceEvent=mainAbility?.op==='nameOnceActiveIfEvent'&&
  mainAbility.scope==='name'&&
  typeof mainAbility.eventName==='string'&&!!mainAbility.eventName.trim()&&
  mainAbility.eventName.length<=80&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','scope','eventName'].includes(k));
 // [ターン1] on this physical card, not every copy of the name.
 // 元々の消費AP is the printed AP. Q1036.
 const mainCardOnce=mainAbility?.op==='cardOnceActive'&&
  mainAbility.scope==='card'&&
  mainAbility.when?.kind==='ownPrintedApAtLeast'&&
  mainAbility.when.turn==='any'&&mainAbility.when.zone==='front'&&
  mainAbility.when.excludeSelf===true&&mainAbility.when.minAp===2&&
  Object.keys(mainAbility.when).length===5&&
  Object.keys(mainAbility.when).every(k=>['kind','turn','zone','excludeSelf','minAp'].includes(k))&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','scope','when'].includes(k));
 if(mainCardOnce)assertLiveCondition(mainAbility.when,card.id+' card once');
 // [フロントLにある場合][APを1支払う] and only while this character is REST.
 // The printed name sentence is shared by every copy. Q2336.
 const mainRestFrontName=mainAbility?.op==='restFrontNameOnce'&&
  mainAbility.scope==='name'&&mainAbility.payAp===1&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','scope','payAp'].includes(k));
 const mainFieldOnceBuff=mainAbility?.op==='fieldOnceBuffOther'&&
  mainAbility.lines==='field'&&mainAbility.oncePerTurn===true&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','lines','oncePerTurn','bp'].includes(k));
 const mainRestBuff=mainAbility?.op==='restSelfBuffOther'&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','bp'].includes(k));
 // 【レストにする】then BP+1000. Printed AP at least minAp may discard one
 // hand card to ACTIVE that same character. No ターン1.
 const mainRestBuffAp=mainAbility?.op==='restBuffThenApActive'&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  integer(mainAbility.minAp,1)&&mainAbility.minAp<=3&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','bp','minAp'].includes(k));
 // Printed 【レストにする】【このカードを退場させる】 then one own-outside
 // recovery. A name or trait filter is the older shape. Color plus character
 // is the other closed shape. optional false still cannot be skipped.
 const outsideOne=f=>f&&typeof f==='object'&&!Array.isArray(f)&&
  Object.keys(f).length===2&&typeof f.field==='string'&&typeof f.value==='string';
 const singleOutside=outsideOne(mainAbility?.filter)&&
  ['name','trait'].includes(mainAbility.filter.field)&&
  !!mainAbility.filter.value.trim()&&mainAbility.filter.value.length<=80;
 const colorCharacterOutside=Array.isArray(mainAbility?.filters)&&
  mainAbility.filters.length===2&&mainAbility.filters.every(outsideOne)&&
  mainAbility.filters.some(f=>f.field==='color'&&
   ['yellow','green','blue','purple'].includes(f.value))&&
  mainAbility.filters.some(f=>f.field==='type'&&f.value==='character')&&
  mainAbility.logic==='all';
 const mainRestRetireRecover=mainAbility?.op==='restRetireRecoverOutside'&&
  typeof mainAbility.optional==='boolean'&&
  (singleOutside&&mainAbility.filters===undefined&&mainAbility.logic===undefined&&
   Object.keys(mainAbility).length===3&&
   Object.keys(mainAbility).every(k=>['op','optional','filter'].includes(k))||
   colorCharacterOutside&&mainAbility.filter===undefined&&
   Object.keys(mainAbility).length===4&&
   Object.keys(mainAbility).every(k=>['op','optional','filters','logic'].includes(k)));
 // 【レストにする】【このカードを退場させる】, then up to one outside character
 // of an exact printed energy and color. AP is not printed. Raid cards enter
 // REST as ordinary characters; this is not a Raid action.
 const mainRestRetireNamed=mainAbility?.op==='restRetireNamedGrant'&&
  typeof mainAbility.name==='string'&&!!mainAbility.name.trim()&&
  mainAbility.name.length<=80&&Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','name'].includes(k));
 const mainRestRetireExact=mainAbility?.op==='restRetireExactOutside'&&
  typeof mainAbility.name==='string'&&!!mainAbility.name.trim()&&
  mainAbility.name.length<=80&&
  ['yellow','green','blue','purple','red'].includes(mainAbility.color)&&
  integer(mainAbility.energy)&&mainAbility.energy<=30&&
  mainAbility.optional===true&&Object.keys(mainAbility).length===5&&
  Object.keys(mainAbility).every(k=>['op','name','color','energy','optional'].includes(k));
 // 【ターン1】【レストにする】, buff one other character, then return this card.
 const mainRestOnceBuffReturn=mainAbility?.op==='restOnceBuffReturnSelf'&&
  mainAbility.oncePerTurn===true&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','bp'].includes(k));
 const mainPayAp=mainAbility?.op==='payApDrawGainEnergy'&&
  mainAbility.oncePerTurn===true&&mainAbility.draw===1&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','draw','extraEnergy'].includes(k));
 const mainOnceBuffWhen=mainAbility?.op==='onceBuffSelfWhen'&&
  mainAbility.oncePerTurn===true&&mainAbility.bp===1000&&
  mainAbility.when?.logic==='any'&&
  Array.isArray(mainAbility.when.checks)&&mainAbility.when.checks.length===2&&
  mainAbility.when.checks[0]?.kind==='oppFrontLiveBpBelowPrinted'&&
  mainAbility.when.checks[0].turn==='any'&&
  Object.keys(mainAbility.when.checks[0]).length===2&&
  mainAbility.when.checks[1]?.kind==='oppRestCharacter'&&
  mainAbility.when.checks[1].turn==='any'&&
  mainAbility.when.checks[1].zone==='front'&&
  Object.keys(mainAbility.when.checks[1]).length===3&&
  Object.keys(mainAbility.when).length===2&&
  Object.keys(mainAbility.when).every(k=>['logic','checks'].includes(k))&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','bp','when'].includes(k));
 if(mainOnceBuffWhen)for(const q of mainAbility.when.checks)
  assertLiveCondition(q,card.id+' once buff');
 const mainRestOnceSelf=mainAbility?.op==='restOnceBuffSelfUntilNextOwnStart'&&
  mainAbility.oncePerTurn===true&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','bp'].includes(k));
 const mainRestFrontEnergy=mainAbility?.op==='restSelfRestFrontGainEnergy'&&
  mainAbility.oncePerTurn===true&&
  integer(mainAbility.extraEnergy,1)&&mainAbility.extraEnergy<=3&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','oncePerTurn','extraEnergy'].includes(k));
 const mainRestProgram=mainAbility?.op==='restSelfThen'&&
  mainAbility.frontOnly===true&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','then'].includes(k))&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='millTop'&&
  Object.keys(mainAbility.then[0]).every(k=>['op','count'].includes(k));
 if(mainRestProgram)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainRestRetireActive=mainAbility?.op==='fieldRestRetireActiveBuff'&&
  card.type==='field'&&integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','bp'].includes(k));
 const mainRestTopTrait=mainAbility?.op==='restSelfTopTraitHand'&&
  card.type==='field'&&
  typeof mainAbility.trait==='string'&&!!mainAbility.trait.trim()&&mainAbility.trait.length<=80&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','trait'].includes(k));
 if(mainAbility!==null&&
  (!['character','field'].includes(card.type)||!(fieldDualMain||fieldRestRetireThen||mainFieldReplay||mainRestTopTrait||mainRestRetireActive||card.type==='character'&&(mainRaid||mainRetireField||mainRetireReady||mainSelfRest||mainRestProgram||mainRestBuff||mainRestBuffAp||mainRestRetireRecover||mainRestOnceBuffReturn||mainRestOnceSelf||mainOnceBuffWhen||mainPayAp||mainRestFrontEnergy||mainEnergyRetire||mainEnergyRetireLines||mainEnergyMoveLines||mainDiscardBuff||mainRestDiscardRetire||mainFrontProgram||mainFieldOnceBuff||mainEntryProtect||mainEntrySacrifice||mainNamedDouble||mainRestRetireUnder||mainRestTwoMove||mainOncePay||nameOnceActive||nameOnceEvent||mainCardOnce||mainRestFrontName||mainRestRetireExact||mainRestRetireNamed))))
  throw Error(card.id+' unsupported main action ability');
 const passiveBonuses=validatePassiveBonuses(card);
 const implemented=card.implementation;
 if(!['vanilla','dsl'].includes(implemented))
  throw Error(card.id+' must explicitly declare vanilla or dsl (unported effects are not playable)');
 if(card.ownTurnBp!==undefined&&
  (card.type!=='character'||!integer(card.ownTurnBp,1)||card.ownTurnBp>5000))
  throw Error(card.id+' invalid own-turn BP modifier');
 if(card.opponentTurnBp!==undefined&&
  (card.type!=='character'||!integer(card.opponentTurnBp,1)||card.opponentTurnBp>5000))
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
   if(x.then.some(op=>op.op==='retireSourceOnPhaseEnd')&&(
    card.type!=='character'||x.phase!=='attack'||x.edge!=='end'||
    x.then.length!==1||x.then[0].op!=='retireSourceOnPhaseEnd'))
    throw Error(card.id+' invalid attack-end true self retirement');
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
    blockBpRestriction.condition?.kind==='ownOutsideNamedCountAtLeast'))
   throw Error(card.id+' invalid printed blocker BP restriction');
  if(blockBpRestriction.condition)
   assertLiveCondition(blockBpRestriction.condition,card.id+'.blockBpRestriction');
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
 if(implemented==='vanilla'&&(Object.keys(effects).length||card.effectText||
  mainAbility||phaseEffects.length||moveTriggers.length||moveObserver||card.enterActiveIfOpponentRest||card.enterAlwaysActive||card.activeExtraEnergy||card.conditionalTraitEnergy||passiveBonuses||card.impactNull||
  card.printedImpact||card.printedAttackDamage||card.readyOnAttackCount||card.readyOnBlockCount||
  card.frontGeneratesEnergy||card.battleRemoveInstead||ownOutsideRecovery||colorTriggerFieldSubstitution||card.frontForbidden||card.energyForbidden||card.ownTurnBp||card.opponentTurnBp||nameAliases||selectionHandDiscardTax||  card.otherOwnBattleWonDamageTwo||attackEndSwap||blockBpRestriction||attackWinRecover||card.conditionalImpactBpAtLeast||emptyOwnFieldHandEnergyDiscount||opponentFieldColorsHandEnergyDiscount||card.mustBlock||card.bpDownImmune||  card.printedHandEnergyDiscount||card.raidHandLeaveReplace||card.raidHostAny||card.blockRaidBp||card.handApDiscountWhileName))
  throw Error(card.id+' claims vanilla despite printed/declared effects');
 if(implemented==='dsl'&&!Object.keys(effects).length&&!phaseEffects.length&&!moveTriggers.length&&!mainAbility&&!moveObserver&&!card.enterActiveIfOpponentRest&&!card.enterAlwaysActive&&
  !card.activeExtraEnergy&&!card.conditionalTraitEnergy&&!passiveBonuses&&!card.impactNull&&
  !card.printedImpact&&!card.printedAttackDamage&&!card.readyOnAttackCount&&!card.readyOnBlockCount&&
  !card.frontGeneratesEnergy&&!card.battleRemoveInstead&&!ownOutsideRecovery&&!colorTriggerFieldSubstitution&&!card.frontForbidden&&!card.energyForbidden&&!card.ownTurnBp&&!card.opponentTurnBp&&!nameAliases&&!selectionHandDiscardTax&&!card.otherOwnBattleWonDamageTwo&&!attackEndSwap&&!blockBpRestriction&&!attackWinRecover&&!card.conditionalImpactBpAtLeast&&!emptyOwnFieldHandEnergyDiscount&&!opponentFieldColorsHandEnergyDiscount&&!card.mustBlock&&!card.bpDownImmune&&  !card.printedHandEnergyDiscount&&!card.raidHandLeaveReplace&&!card.raidHostAny&&!card.blockRaidBp&&!card.handApDiscountWhileName)
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
  if(program.some(e=>e.op==='grantOtherImpactThisTurn')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' other-character impact grant requires character onPlay');
  if(program.some(e=>e.op==='optionalOwnLifeToHandThenDraw')&&
   (name!=='onPlay'||card.type!=='character'))
   throw Error(card.id+' optional life-to-hand draw requires character onPlay');
  if(name!=='onPlay'&&program.some(e=>e.op==='forbidAttackOppFrontOne'))
   throw Error(card.id+' attack prohibition may be granted only onPlay');
  if(name!=='onRaided'&&program.some(e=>['buffOwnTrait','drawIfRaidUnderFacedown'].includes(e.op)))
   throw Error(card.id+' Raid-base effects require onRaided timing');
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
  if(program.some(e=>e.op==='activeSelfIf')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' conditional ACTIVE is only a character onPlay effect');
  if(program.some(e=>e.op==='draw'&&e.entry!==undefined)&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' own-effect or own-character draw gate is only a character onPlay effect');
  if(program.some(e=>['moveOtherAcrossOrRemove','raidBaseEnergyThen','restOppFrontLockActive'].includes(e.op))&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' line move, raid-base gate and rest lock are character onPlay effects');
  if(program.some(e=>e.op==='bounceOppFrontOneUnderBp')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' BP-limited return is only a character onPlay effect');
  if(program.some(e=>e.op==='grantSelfAttackDamageThisTurn')&&name!=='onPlay')
   throw Error(card.id+' earned attack damage is only an onPlay effect');
  if(name==='onRetire'&&
   (!['character','field'].includes(card.type)||program.some(e=>!['draw','millTop','drawIfOwnFieldExists','chooseOne','deployOutsideTraitlessRestOrRaid','retireOppFrontOneUnderBp','restOppFrontUnderBp','buffOwnField','deployNamedFromZones','oncePerTurnGate','returnRetiredToHand','enemyBpDown','readyNameOrTrait','protectNameOrTrait','enemyFrontAllBpDown'].includes(e.op))))
   throw Error(card.id+' unsupported onRetire ability program');
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
   (program.length!==1||(card.type!=='field'&&
    !(card.type==='character'&&program[0].ownTurnOnly===true))))
   throw Error(card.id+' only FIELD may use retirement two-mode choice');
  if(name!=='onRetire'&&program.some(e=>e.op==='drawIfOwnFieldExists'))
   throw Error(card.id+' FIELD-gated draw requires onRetire');
  // Card-self triggered ability for a physical card recovered from OWN
  // outside to OWN hand via an OWN effect. Explicitly limited to one
  // printed mandatory draw-one/discard-one, not generic hand-enter effects.
  // The separate SLG-014 free REST entry cannot be combined without an
  // audited priority ruling, so reject that ambiguous mixed profile.
  if(name==='onOutsideRecover'&&(
   card.type!=='character'||ownOutsideRecovery!==null||
   program.length!==1||program[0]?.op!=='drawDiscard'||
   program[0]?.count!==1||
   Object.keys(program[0]).length!==2||
   Object.keys(program[0]).some(k=>!['op','count'].includes(k))
  ))throw Error(card.id+' unsupported onOutsideRecover ability program');
  if(program.some(e=>e.op==='drawIfOwnOutsideNamedCountAtLeast'&&e.optional===true)&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' optional named OUTSIDE draw requires onAttack CHARACTER');
  if(program.some(e=>e.op==='buffSelfPerOwnOutsideGroups')&&
   (name!=='onAttack'||card.type!=='character'))
   throw Error(card.id+' outside group BP is onAttack CHARACTER only');
  if(program.some(e=>e.op==='drawIfSelfBpAtLeast')&&
   (name!=='onAttack'||card.type!=='character'||program.length!==1))
   throw Error(card.id+' self-BP draw is only a lone character onAttack effect');
  if(program.some(e=>e.op==='returnRetiredToHand')&&
   (name!=='onRetire'||card.type!=='character'||program.length!==1))
   throw Error(card.id+' returning the retired card is only a lone character onRetire effect');
  if(program.some(e=>['grantSelfSniperThisTurn','grantSelfAttackWinDrawThisTurn','grantSelfMustBlockThisTurn'].includes(e.op))&&
   (name!=='onPlay'||card.type!=='character'||card.implementation!=='dsl'))
   throw Error(card.id+' timed sniper/win ability requires onPlay CHARACTER');
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
  if(program.some(e=>e.op==='optionalRemoveHandThen')&&
   (card.type!=='character'||name!=='onAttack'||program.length!==1))
   throw Error(card.id+' optional hand removal is only a lone character onAttack effect');
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
  card.type!=='character'||!integer(card.activeExtraEnergy,1)||
  card.activeExtraEnergy>3))
  throw Error(card.id+' invalid ACTIVE extra energy profile');
 if(card.frontGeneratesEnergy!==undefined&&
  (card.type!=='character'||card.frontGeneratesEnergy!==true))
  throw Error(card.id+' invalid front-line energy profile');
 if(card.battleRemoveInstead!==undefined&&
  (card.type!=='character'||card.battleRemoveInstead!==true||implemented!=='dsl'))
  throw Error(card.id+' invalid battle removal replacement');
 if(card.impactNull!==undefined&&(
  card.type!=='character'||card.impactNull!==true))
  throw Error(card.id+' invalid IMPACT nullification profile');
 if(card.raidHostAny!==undefined&&(
  card.type!=='character'||card.raidHostAny!==true||implemented!=='dsl'||!!card.raidName))
  throw Error(card.id+' invalid Raid host');
 const blockRaidBp=card.blockRaidBp??null;
 if(blockRaidBp!==null&&(
  card.type!=='character'||implemented!=='dsl'||
  !blockRaidBp||typeof blockRaidBp!=='object'||Array.isArray(blockRaidBp)||
  !Number.isInteger(blockRaidBp.plain)||blockRaidBp.plain===0||Math.abs(blockRaidBp.plain)>5000||
  !Number.isInteger(blockRaidBp.raid)||blockRaidBp.raid===0||Math.abs(blockRaidBp.raid)>5000||
  blockRaidBp.plain===blockRaidBp.raid||
  Object.keys(blockRaidBp).length!==2||
  Object.keys(blockRaidBp).some(k=>!['plain','raid'].includes(k))))
  throw Error(card.id+' invalid block Raid BP shift');
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
 const handApDiscountWhileName=card.handApDiscountWhileName??null;
 if(handApDiscountWhileName!==null&&(
  card.type!=='event'||implemented!=='dsl'||
  handApDiscountWhileName.amount!==1||
  typeof handApDiscountWhileName.name!=='string'||!handApDiscountWhileName.name.trim()||
  handApDiscountWhileName.name.length>80||
  Object.keys(handApDiscountWhileName).length!==2||
  Object.keys(handApDiscountWhileName).some(k=>!['name','amount'].includes(k))))
  throw Error(card.id+' invalid named hand AP discount');
 const playRequiresOwnName=card.playRequiresOwnName??null;
 if(playRequiresOwnName!==null&&(
  card.type!=='event'||implemented!=='dsl'||
  typeof playRequiresOwnName!=='string'||!playRequiresOwnName.trim()||
  playRequiresOwnName.length>80))
  throw Error(card.id+' invalid own-name play requirement');
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
 if(card.printedAttackDamage!==undefined&&(
  card.type!=='character'||card.printedAttackDamage!==2))
  throw Error(card.id+' invalid printed attack damage');
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
  raidFromRaid:Object.freeze([...(card.raidFromRaid||[])]),
  raidBaseNames:Object.freeze([...(card.raidBaseNames||[card.raidName].filter(Boolean))]),
  raidRequiresNames:Object.freeze([...(card.raidRequiresNames||[])]),
  conditionalUnderFaceDown:underProfile?Object.freeze({...underProfile}):null,
  triggerEffect:triggerEffect?Object.freeze({...triggerEffect}):null,
  mainAbility:mainAbility?Object.freeze({...mainAbility}):null,
  ownOutsideRecovery:ownOutsideRecovery?Object.freeze({...ownOutsideRecovery}):null,
   phaseEffects:Object.freeze(phaseEffects.map(x=>Object.freeze({...x,
    then:Object.freeze(x.then.map(op=>Object.freeze({...op})))}))),
  enterActiveIfOpponentRest:card.enterActiveIfOpponentRest===true,
   enterAlwaysActive:card.enterAlwaysActive===true,
   frontForbidden:card.frontForbidden===true,
   energyForbidden:card.energyForbidden===true,
  step:card.step===true,ownTurnBp:card.ownTurnBp||0,
  opponentTurnBp:card.opponentTurnBp||0,
  emptyOwnFieldHandEnergyDiscount,
  printedHandEnergyDiscount,
  opponentFieldColorsHandEnergyDiscount:opponentFieldColorsHandEnergyDiscount?Object.freeze({
   amount:opponentFieldColorsHandEnergyDiscount.amount,
   colors:Object.freeze([...opponentFieldColorsHandEnergyDiscount.colors])}):null,
  activeExtraEnergy:card.activeExtraEnergy||0,
  frontGeneratesEnergy:card.frontGeneratesEnergy===true,
  battleRemoveInstead:card.battleRemoveInstead===true,
  colorTriggerFieldSubstitution,
  conditionalTraitEnergy:conditionalTraitEnergy?Object.freeze({...conditionalTraitEnergy}):null,
  passiveBonuses:passiveBonuses||Object.freeze([]),
  blockBpRestriction:blockBpRestriction?Object.freeze({
   relation:blockBpRestriction.relation,bp:blockBpRestriction.bp,
   condition:blockBpRestriction.condition?Object.freeze({
    ...blockBpRestriction.condition,
    names:Object.freeze([...blockBpRestriction.condition.names])}):null}):null,
  attackWinRecover:attackWinRecover?Object.freeze({...attackWinRecover}):null,
  conditionalImpactBpAtLeast:card.conditionalImpactBpAtLeast??null,
  attackEndSwap:attackEndSwap?Object.freeze({
   color:attackEndSwap.color,types:Object.freeze([...attackEndSwap.types]),
   minDistinctNames:attackEndSwap.minDistinctNames}):null,
  otherOwnBattleWonDamageTwo:card.otherOwnBattleWonDamageTwo===true,
  selectionHandDiscardTax:selectionHandDiscardTax?
   Object.freeze({...selectionHandDiscardTax,
    sourceTypes:Object.freeze([...selectionHandDiscardTax.sourceTypes])}):null,
  impactNull:card.impactNull===true,
  raidHostAny:card.raidHostAny===true,
  blockRaidBp:blockRaidBp?Object.freeze({plain:blockRaidBp.plain,raid:blockRaidBp.raid}):null,
  mustBlock:card.mustBlock===true,
  bpDownImmune:card.bpDownImmune===true,
  raidHandLeaveReplace:raidHandLeaveReplace?Object.freeze({...raidHandLeaveReplace}):null,
  raidHandApDiscount:raidHandApDiscount?Object.freeze({...raidHandApDiscount}):null,
  playRequiresOwnName,
  handApDiscountWhileName:handApDiscountWhileName?Object.freeze({...handApDiscountWhileName}):null,
  printedImpact:card.printedImpact===1?1:0,
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
    ...(e.options?{options:Object.freeze(e.options.map(o=>Object.freeze({
     ...o,then:Object.freeze(o.then.map(child=>Object.freeze({
      ...child,...(child.filter?{filter:Object.freeze({...child.filter})}:{})
     })))
    })))}:{}) ,
    ...(e.then?{then:Object.freeze(e.then.map(child=>Object.freeze({
      ...child,...(child.filter?{filter:Object.freeze({...child.filter})}:{}),
      ...(child.filters?{filters:Object.freeze(child.filters.map(f=>Object.freeze({...f})))}:{})
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
