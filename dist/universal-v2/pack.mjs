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
export const V2_EFFECT_OPS=Object.freeze(['nextEligibleHandPlayApDiscount','draw','drawIfOwnName','drawIfOwnTraitCount','drawIfOwnFieldExists','drawIfOwnEnergyAtLeast','millTop','buffSelf','enemyBpDown','drawDiscard','recoverAp','peekTopOne','peekTopOrBottom','retireOppFrontUnderBp','retireOppFrontOneUnderBp','stripOppRaidTop','restOppFrontUnderBp','restOppFrontOne','skipNextActiveOppRest','forbidAttackOppFrontOne','restOrRetireOppFrontByLife','restSilenceOppFrontIfOwnOutsideField','retireOwnFieldOne','retireOwnCharacterOne','optionalRetireThenProgram','retireOppFrontIfFacedown','buffOwnTrait','drawIfRaidUnderFacedown','searchDeckOne','recoverOutsideOne','recoverOutsidePrintedBp','discardToDraw','searchDeckMany','discardGate','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','searchTopOneBottomDiscard','searchTopUpToTwoBottom','enemyFrontAllBpDown','retireOppFrontAllUnderBp','buffOwnTraitAllTurn',
 'buffSelfIfFirstAttack','bounceOwnOtherUnderEnergy','recoverOutsideColorUnderEnergy','recoverOutsideTraitlessUnderEnergy','deployOutsideTraitlessRestOrRaid','deployOutsideRest','deployOutsideNameRest','deployNamedFromZones','payApDeployNamedRest','inspectTopTraitOutside','buffOwnField','oncePerTurnGate','chooseOne','deployOwnHandRest','deployOwnHandSpecial','discardOppHand','retireSourceOnPhaseEnd','activeSelfIf','grantOnAttack','grantSelectionApTaxOwnOtherTrait','grantFrontEnergyOwnOtherFrontTrait','grantOwnFrontChoiceProtection']);
const integer=(v,low=0)=>Number.isInteger(v)&&v>=low;
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
// Shared board predicate used by passive bonuses and on-play ACTIVE.
// The shape is the printed query, never a title-specific reducer.
function assertLiveCondition(q,label){
 if(!q||typeof q!=='object'||Array.isArray(q)||
  !['own','opponent','any'].includes(q.turn)||
  !['outsideCount','ownNameExists','ownNameAbsent','ownFieldHasAllNames','ownTraitCount','ownEnergyAtLeast','ownHandCountAtLeast','ownLifeAtMost','ownEffectHandOutsideOrRecovery','ownEventUsedThisTurn','ownRetiredThisTurn','retireCountThisTurn','ownRestPrintedBpAtMost','oppCharacterBpAtLeast'].includes(q.kind))
  throw Error(label+' invalid passive condition');
 if(q.kind==='ownEventUsedThisTurn'&&q.turn!=='own')
  throw Error(label+' event-use predicate requires own turn');
 if(q.kind==='ownEffectHandOutsideOrRecovery'&&q.turn!=='own')
  throw Error(label+' invalid effect-zone own-turn condition');
 const retired=q.kind==='ownRetiredThisTurn';
 const retirementCount=q.kind==='retireCountThisTurn';
 if(retirementCount&&(!['own','opponent','any'].includes(q.controller)||
  !['character','field','any'].includes(q.cardType)||!integer(q.min,1)||q.min>50))
  throw Error(label+' invalid retirement count predicate');
 if(retired&&!['field','character'].includes(q.cardType))
  throw Error(label+' invalid retired-card type');
 const count=['outsideCount','ownTraitCount','ownEnergyAtLeast','ownHandCountAtLeast'].includes(q.kind);
 const atMost=q.kind==='ownLifeAtMost';
 const restEach=q.kind==='ownRestPrintedBpAtMost';
 const oppBp=q.kind==='oppCharacterBpAtLeast';
 const field=['ownNameExists','ownNameAbsent','ownFieldHasAllNames','ownTraitCount','ownRestPrintedBpAtMost'].includes(q.kind);
 if((count&&(!integer(q.min,1)||q.min>200))||
  (atMost&&(!integer(q.max)||q.max>10))||
  (field&&(!['field','front','energy'].includes(q.zone)||
   typeof q.excludeSelf!=='boolean'))||
  ((q.kind==='ownNameExists'||q.kind==='ownNameAbsent')&&(!q.name||typeof q.name!=='string'||!q.name.trim()))||
  (q.kind==='ownFieldHasAllNames'&&(!Array.isArray(q.names)||q.names.length<2||q.names.length>8||q.names.some(n=>typeof n!=='string'||!n.trim())||new Set(q.names).size!==q.names.length))||
  ((q.kind==='ownTraitCount'||restEach)&&(!q.trait||typeof q.trait!=='string'||!q.trait.trim()))||
  (restEach&&(!integer(q.maxPrintedBp,0)||q.maxPrintedBp>50000))||
  (oppBp&&(!['field','front','energy'].includes(q.zone)||!integer(q.minBp,1)||q.minBp>50000))||
  Object.keys(q).length!==(2+(count?1:0)+(atMost?1:0)+(retired?1:0)+(retirementCount?3:0)+(field?2:0)+
   (['ownNameExists','ownNameAbsent','ownFieldHasAllNames','ownTraitCount','ownRestPrintedBpAtMost'].includes(q.kind)?1:0)+
   (restEach?1:0)+(oppBp?2:0))||
  Object.keys(q).some(k=>!['kind','turn',
   ...(count?['min']:[]),...(atMost?['max']:[]),...(retired?['cardType']:[]),...(retirementCount?['controller','cardType','min']:[]),...(field?['zone','excludeSelf']:[]),
   ...(q.kind==='ownNameExists'||q.kind==='ownNameAbsent'?['name']:[]),
   ...(q.kind==='ownFieldHasAllNames'?['names']:[]),
   ...(q.kind==='ownTraitCount'||restEach?['trait']:[]),
   ...(restEach?['maxPrintedBp']:[]),
   ...(oppBp?['zone','minBp']:[])].includes(k)))
  throw Error(label+' invalid or cyclic passive condition');
}
function verifyProgram(program,path){
 if(!Array.isArray(program))throw Error(path+' must be an array');
 for(const [i,e] of program.entries()){
  if(!e||typeof e!=='object'||Array.isArray(e)||!V2_EFFECT_OPS.includes(e.op))
   throw Error(path+'['+i+'] effect op unsupported');
  if(e.op==='draw'){
   if(!integer(e.count,1)||e.count>10)throw Error(path+'['+i+'] invalid count');
   if((e.entry!==undefined&&e.entry!=='ownEffect')||
    Object.keys(e).some(k=>!['op','count','entry'].includes(k)))
    throw Error(path+'['+i+'] invalid own-effect draw gate');
  }
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
   Object.keys(e).some(k=>!['op','count','rest'].includes(k))
  ))throw Error(path+'['+i+'] invalid arbitrary top-outside choice');
  if(e.op==='inspectTopArrange'&&(
   !integer(e.count,2)||e.count>4||typeof e.toOutside!=='boolean'||
   !['top','bottom'].includes(e.rest)||
   Object.keys(e).some(k=>!['op','count','toOutside','rest'].includes(k))
  ))throw Error(path+'['+i+'] invalid top inspect/arrange');
  if(e.op==='searchTopOneBottomDiscard'){
   const isFilter=f=>f&&typeof f==='object'&&!Array.isArray(f)&&
    Object.keys(f).length===2&&['name','trait','color','type'].includes(f.field)&&
    typeof f.value==='string'&&!!f.value.trim()&&
    (f.field!=='type'||V2_CARD_TYPES.includes(f.value));
   const single=isFilter(e.filter)&&e.filters===undefined&&e.logic===undefined&&
    Object.keys(e).every(k=>['op','count','filter'].includes(k));
   const compound=e.filter===undefined&&Array.isArray(e.filters)&&
    e.filters.length>=2&&e.filters.length<=3&&e.filters.every(isFilter)&&
    new Set(e.filters.map(f=>f.field+':'+f.value)).size===e.filters.length&&
    ['any','all'].includes(e.logic)&&
    Object.keys(e).every(k=>['op','count','filters','logic'].includes(k));
   if(!integer(e.count,1)||e.count>5||!(single||compound))
    throw Error(path+'['+i+'] invalid top-N filtered bottom/discard profile');
  }
  if(e.op==='searchTopUpToTwoBottom'){
   const valid=f=>f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&
    ['name','trait','color','type','printedRequiredEnergyAtMost','traitlessCharacterOrField'].includes(f.field)&&
    (f.field==='traitlessCharacterOrField'?f.value===true:
      f.field==='printedRequiredEnergyAtMost'?integer(f.value)&&f.value<=30:
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
   if(!['character','field'].includes(e.type)||!['blue','yellow','green','purple','red'].includes(e.color)||
    !integer(e.energy)||e.energy>30||!integer(e.ap,1)||e.ap>3||
    !integer(e.max,1)||e.max>4||Object.keys(e).length!==6||
    Object.keys(e).some(k=>!['op','type','color','energy','ap','max'].includes(k)))
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
   if(e.op==='chooseOne'){
   if(typeof e.optional!=='boolean'||!Array.isArray(e.options)||
    (e.options.length<2||e.options.length>3)||Object.keys(e).length!==3||
    Object.keys(e).some(k=>!['op','optional','options'].includes(k)))
    throw Error(path+'['+i+'] invalid choose-one options');
   const seen=new Set();
   for(const o of e.options){
    if(!o||typeof o!=='object'||Array.isArray(o)||
     typeof o.id!=='string'||!(/^[a-zA-Z][a-zA-Z0-9]{0,32}$/).test(o.id)||
     seen.has(o.id)||typeof o.label!=='string'||!o.label.trim()||
     o.label.length>64||!['any','own','opponent'].includes(o.turn)||
     !Array.isArray(o.then)||o.then.length<1||o.then.length>3||
     Object.keys(o).length!==4||
     Object.keys(o).some(k=>!['id','label','turn','then'].includes(k))||
     o.then.some(x=>!['draw','drawDiscard','buffOwnField',
      'recoverOutsideOne','recoverOutsideTraitlessUnderEnergy','buffSelf',
       'inspectTopAnyOutside','retireOwnCharacterOne',
       'stripOppRaidTop','retireOppFrontOneUnderBp','discardGate',
       'grantFrontEnergyOwnOtherFrontTrait','bounceOwnOtherUnderEnergy','nextEligibleHandPlayApDiscount','searchTopUpToTwoBottom','deployOwnHandRest'].includes(x?.op)))
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
   if(typeof e.optional!=='boolean'||!Array.isArray(e.then)||
    !e.then.length||e.then.length>6||
    (e.count!==undefined&&e.count!==2)||
    Object.keys(e).some(k=>!['op','optional','then','payment','count'].includes(k))||
    e.then.some(x=>!['draw','millTop','peekTopOne','searchDeckOne',
     'searchDeckMany','searchDeckWhere','inspectTopArrange','inspectTopAnyOutside',
      'peekTopOrBottom','recoverOutsideOne','deployOutsideRest',
     'enemyBpDown','enemyFrontAllBpDown','retireOppFrontAllUnderBp','buffOwnTraitAllTurn',
     'recoverOutsideColorUnderEnergy','buffOwnField',
     'restOppFrontUnderBp','restOppFrontOne','buffSelf','grantOnAttack'].includes(x?.op)))
    throw Error(path+'['+i+'] invalid gated payment');
   verifyProgram(e.then,path+'['+i+'].then');
  }
  if(e.op==='oncePerTurnGate'){
   if(!['card','name'].includes(e.scope)||typeof e.optional!=='boolean'||
    !Array.isArray(e.then)||e.then.length<1||e.then.length>6||
    Object.keys(e).some(k=>!['op','scope','optional','then'].includes(k))||
    e.then.some(x=>!['draw','millTop','peekTopOne','enemyBpDown',
     'restOppFrontUnderBp','restOppFrontOne','buffOwnField','searchDeckOne',
     'recoverOutsideOne','buffSelf'].includes(x?.op)))
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
   if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).length!==2||
    !['name','trait','color','type'].includes(f.field)||
    typeof f.value!=='string'||!f.value.trim()||
    (f.field==='type'&&!V2_CARD_TYPES.includes(f.value))||
    !integer(e.bp,1)||e.bp>5000||
    typeof e.optional!=='boolean'||typeof e.excludeSelf!=='boolean'||
    Object.keys(e).some(k=>!['op','filter','bp','optional','excludeSelf'].includes(k)))
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
  if(e.op==='retireOppFrontOneUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||e.optional!==true||
   Object.keys(e).length!==3||
   Object.keys(e).some(k=>!['op','bp','optional'].includes(k))
  ))throw Error(path+'['+i+'] invalid optional BP-limited opponent retirement');
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
  if(e.op==='restOppFrontOne'&&(
   typeof e.optional!=='boolean'||
   (e.skipNextActive!==undefined&&e.skipNextActive!==true)||
   Object.keys(e).some(k=>!['op','optional','skipNextActive'].includes(k))
  ))throw Error(path+'['+i+'] invalid uncapped opponent REST target');
  if(e.op==='restOppFrontUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||typeof e.optional!=='boolean'||
   (e.skipNextActive!==undefined&&e.skipNextActive!==true)||
   Object.keys(e).some(k=>!['op','bp','optional','skipNextActive'].includes(k))
  ))throw Error(path+'['+i+'] invalid opponent REST optionality/profile');
  if(e.op==='retireOppFrontUnderBp'&&(
   !integer(e.bp,1)||e.bp>50000||typeof e.bonusName!=='string'||
   !e.bonusName.trim()||!integer(e.bonusBp,e.bp)||e.bonusBp>50000||
   Object.keys(e).some(k=>!['op','bp','bonusName','bonusBp'].includes(k))
  ))throw Error(path+'['+i+'] unsupported printed BP retirement profile');
  if(e.op==='peekTopOne'&&Object.keys(e).some(key=>key!=='op'))throw Error(path+'['+i+'] unsupported private peek options');
  if(e.op==='recoverAp'&&(!integer(e.count,1)||e.count>3))throw Error(path+'['+i+'] invalid AP recovery count');
  if(e.op==='drawDiscard'&&(
   (e.discardCount===undefined&&e.count!==1)||
   (e.discardCount!==undefined&&(!integer(e.discardCount,1)||e.discardCount>10))||
   Object.keys(e).some(k=>!['op','count','discardCount'].includes(k))
  ))throw Error(path+'['+i+'] invalid mandatory draw/discard profile');
  if(['buffSelf','enemyBpDown'].includes(e.op)&&(!integer(e.bp,1)||e.bp>5000))throw Error(path+'['+i+'] invalid temporary BP');
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
   Object.keys(p).some(k=>!['condition','bp','extraEnergy','extraDamage','impact','bpEach'].includes(k))||
   (p.bp===undefined&&p.extraEnergy===undefined&&p.extraDamage===undefined&&p.impact===undefined&&p.bpEach===undefined)||
   (p.bp!==undefined&&(
    p.condition?.kind==='ownNameAbsent'
     ?(!Number.isInteger(p.bp)||p.bp>=0||p.bp<-5000||p.bp%500!==0)
     :(!integer(p.bp,1)||p.bp>5000)))||
   (p.extraEnergy!==undefined&&(!integer(p.extraEnergy,1)||p.extraEnergy>3))||
   (p.extraDamage!==undefined&&(!integer(p.extraDamage,1)||p.extraDamage>2))||
   (p.impact!==undefined&&p.impact!==1)||
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
  assertLiveCondition(q,card.id);
  if(q.kind==='ownNameAbsent'&&(p.bp===undefined||p.extraEnergy!==undefined||
   p.extraDamage!==undefined||p.impact!==undefined||p.bpEach!==undefined))
   throw Error(card.id+' name-absence penalty is BP only');
  if((q.kind==='ownRestPrintedBpAtMost')!==(p.bpEach!==undefined))
   throw Error(card.id+' per-card printed BP bonus needs bpEach');
  if(p.extraEnergy!==undefined&&q.kind==='ownEnergyAtLeast')
   throw Error(card.id+' invalid or cyclic passive condition');
 }
 return Object.freeze(entries.map(p=>Object.freeze({...p,
  condition:Object.freeze({...p.condition,
   ...(p.condition.kind==='ownFieldHasAllNames'?{names:Object.freeze([...p.condition.names])}:{})})})));
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
    (card.type!=='character'||card.enterAlwaysActive!==true||
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
 const frontProgram=mainAbility?.then;
 const frontGate=frontProgram?.[0]?.op==='discardGate'?frontProgram[0]:null;
 // A front once-per-turn ability may be a source-complete DSL program,
 // not just a single debuff. Named payment is a strict cost, not a shortcut.
 const frontEffects=frontGate?.then||frontProgram;
 // Keep the prior debuff/payment program intact. A two-step no-cost
 // draw/discard then optional FRONT grant is another printed, bounded
 // existing front-once program; it does not introduce a second MAIN engine.
 const mainFrontProgram=mainAbility?.op==='frontOnceProgram'&&
  mainAbility.frontOnly===true&&mainAbility.oncePerTurn===true&&
  Array.isArray(frontProgram)&&(
   (frontProgram.length===1&&(frontProgram[0]?.op==='enemyBpDown'||
    frontGate&&Array.isArray(frontGate.then)&&frontGate.then.length>=1&&
    frontGate.then.length<=6&&frontEffects.every(e=>
     ['enemyBpDown','draw','buffSelf','grantOnAttack'].includes(e?.op))))||
   (frontProgram.length===2&&frontProgram[0]?.op==='drawDiscard'&&
    frontProgram[0].count===1&&Object.keys(frontProgram[0]).length===2&&
    frontProgram[1]?.op==='grantFrontEnergyOwnOtherFrontTrait'&&
    frontProgram[1].optional===true&&frontProgram[1].until==='thisTurn'&&
    typeof frontProgram[1].trait==='string'&&!!frontProgram[1].trait.trim()&&
    frontProgram[1].trait.length<=80&&Object.keys(frontProgram[1]).length===4)
  )&&Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','oncePerTurn','then'].includes(k));
 if(mainFrontProgram)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 const mainFieldOnceBuff=mainAbility?.op==='fieldOnceBuffOther'&&
  mainAbility.lines==='field'&&mainAbility.oncePerTurn===true&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===4&&
  Object.keys(mainAbility).every(k=>['op','lines','oncePerTurn','bp'].includes(k));
 const mainRestBuff=mainAbility?.op==='restSelfBuffOther'&&
  integer(mainAbility.bp,1)&&mainAbility.bp<=5000&&
  Object.keys(mainAbility).length===2&&
  Object.keys(mainAbility).every(k=>['op','bp'].includes(k));
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
  mainAbility.frontOnly===true&&
  Object.keys(mainAbility).length===3&&
  Object.keys(mainAbility).every(k=>['op','frontOnly','then'].includes(k))&&
  Array.isArray(mainAbility.then)&&mainAbility.then.length===1&&
  mainAbility.then[0]?.op==='millTop'&&
  Object.keys(mainAbility.then[0]).every(k=>['op','count'].includes(k));
 if(mainRestProgram)verifyProgram(mainAbility.then,card.id+'.mainAbility.then');
 if(mainAbility!==null&&
  (card.type!=='character'||!(mainRaid||mainRetireField||mainRetireReady||mainSelfRest||mainRestProgram||mainRestBuff||mainPayAp||mainRestFrontEnergy||mainEnergyRetire||mainEnergyRetireLines||mainEnergyMoveLines||mainDiscardBuff||mainRestDiscardRetire||mainFrontProgram||mainFieldOnceBuff)))
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
   typeof q.sourceColor!=='string'||!q.sourceColor.trim()||
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
   x.then.some(job=>job?.op!=='draw')))
  throw Error(card.id+' invalid source-qualified moved-card trigger');
 for(const [i,entry] of moveTriggers.entries()){
  const when=validateCompletedMoveCondition(entry.when);
  // Current audited subset covers only an OWN source's card effect/payment
  // sending this exact hand card to outside. Further causes require proof.
  if(when.from!=='hand'||when.to!=='outside'||
   when.sourceOnField!==true||
   typeof when.sourceName!=='string'||!when.sourceName.trim()||
   typeof when.sourceColor!=='string'||!when.sourceColor.trim()||
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
 const attackEndSwap=card.attackEndSwap??null;
 if(attackEndSwap!==null&&(
  card.type!=='character'||typeof attackEndSwap!=='object'||Array.isArray(attackEndSwap)||
  attackEndSwap.color!=='green'||
  JSON.stringify(attackEndSwap.types)!==JSON.stringify(['event','field'])||
  attackEndSwap.minDistinctNames!==4||Object.keys(attackEndSwap).length!==3))
  throw Error(card.id+' invalid source-pinned Q2337 attack-end swap');
 const selectionHandDiscardTax=card.selectionHandDiscardTax??null;
 if(selectionHandDiscardTax!==null){
  if(card.type!=='character')throw Error(card.id+' tax needs CHARACTER source');
  validateSelectionHandTaxProfile(selectionHandDiscardTax);
 }
 if(implemented==='vanilla'&&(Object.keys(effects).length||card.effectText||
  mainAbility||phaseEffects.length||moveTriggers.length||moveObserver||card.enterActiveIfOpponentRest||card.enterAlwaysActive||card.activeExtraEnergy||card.conditionalTraitEnergy||passiveBonuses||card.impactNull||
  card.printedImpact||card.printedAttackDamage||card.readyOnAttackCount||card.readyOnBlockCount||
  card.frontGeneratesEnergy||ownOutsideRecovery||colorTriggerFieldSubstitution||card.frontForbidden||card.ownTurnBp||card.opponentTurnBp||nameAliases||selectionHandDiscardTax||card.otherOwnBattleWonDamageTwo||attackEndSwap))
  throw Error(card.id+' claims vanilla despite printed/declared effects');
 if(implemented==='dsl'&&!Object.keys(effects).length&&!phaseEffects.length&&!moveTriggers.length&&!mainAbility&&!moveObserver&&!card.enterActiveIfOpponentRest&&!card.enterAlwaysActive&&
  !card.activeExtraEnergy&&!card.conditionalTraitEnergy&&!passiveBonuses&&!card.impactNull&&
  !card.printedImpact&&!card.printedAttackDamage&&!card.readyOnAttackCount&&!card.readyOnBlockCount&&
  !card.frontGeneratesEnergy&&!ownOutsideRecovery&&!colorTriggerFieldSubstitution&&!card.frontForbidden&&!card.ownTurnBp&&!card.opponentTurnBp&&!nameAliases&&!selectionHandDiscardTax&&!card.otherOwnBattleWonDamageTwo&&!attackEndSwap)
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
  if(name!=='onRaided'&&program.some(e=>['buffOwnTrait','drawIfRaidUnderFacedown'].includes(e.op)))
   throw Error(card.id+' Raid-base effects require onRaided timing');
  if(name==='onRaided'&&program.some(e=>!['buffOwnTrait','drawIfRaidUnderFacedown'].includes(e.op)))
   throw Error(card.id+' unsupported Raid-base timing effect');
  if(name!=='onPlay'&&program.some(e=>e.op==='discardOppHand'))
   throw Error(card.id+' opponent hand discard is only an onPlay effect');
  if(program.some(e=>e.op==='drawIfOwnTraitCount')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' trait-count draw is only a character onPlay effect');
  if(program.some(e=>e.op==='activeSelfIf')&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' conditional ACTIVE is only a character onPlay effect');
  if(program.some(e=>e.op==='draw'&&e.entry!==undefined)&&
   (card.type!=='character'||name!=='onPlay'))
   throw Error(card.id+' own-effect draw gate is only a character onPlay effect');
  if(name==='onRetire'&&
   (!['character','field'].includes(card.type)||program.some(e=>!['draw','millTop','drawIfOwnFieldExists','chooseOne','deployOutsideTraitlessRestOrRaid','retireOppFrontOneUnderBp','restOppFrontUnderBp','buffOwnField','deployNamedFromZones'].includes(e.op))))
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
   (program.length!==1||card.type!=='field'))
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
  card.type!=='character'||!integer(card.activeExtraEnergy,1)||
  card.activeExtraEnergy>3))
  throw Error(card.id+' invalid ACTIVE extra energy profile');
 if(card.frontGeneratesEnergy!==undefined&&
  (card.type!=='character'||card.frontGeneratesEnergy!==true))
  throw Error(card.id+' invalid front-line energy profile');
 if(card.impactNull!==undefined&&(
  card.type!=='character'||card.impactNull!==true))
  throw Error(card.id+' invalid IMPACT nullification profile');
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
  step:card.step===true,ownTurnBp:card.ownTurnBp||0,
  opponentTurnBp:card.opponentTurnBp||0,
  activeExtraEnergy:card.activeExtraEnergy||0,
  frontGeneratesEnergy:card.frontGeneratesEnergy===true,
  colorTriggerFieldSubstitution,
  conditionalTraitEnergy:conditionalTraitEnergy?Object.freeze({...conditionalTraitEnergy}):null,
  passiveBonuses:passiveBonuses||Object.freeze([]),
  attackEndSwap:attackEndSwap?Object.freeze({
   color:attackEndSwap.color,types:Object.freeze([...attackEndSwap.types]),
   minDistinctNames:attackEndSwap.minDistinctNames}):null,
  otherOwnBattleWonDamageTwo:card.otherOwnBattleWonDamageTwo===true,
  selectionHandDiscardTax:selectionHandDiscardTax?
   Object.freeze({...selectionHandDiscardTax,
    sourceTypes:Object.freeze([...selectionHandDiscardTax.sourceTypes])}):null,
  impactNull:card.impactNull===true,
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
