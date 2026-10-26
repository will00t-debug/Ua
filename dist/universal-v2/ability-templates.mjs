// Reusable, auditable V2 ability templates.
// This module only compiles explicitly authored card abilities into existing
// battle-engine DSL ops. It NEVER infers effects from printed card prose and
// cannot authorize a card that has not passed the per-card official gate.
const timings=Object.freeze(['onPlay','onRaid','onAttack','onRaided','onRetire','onOutsideRecover']);
const integer=(x,lower,upper)=>Number.isInteger(x)&&x>=lower&&x<=upper;
const positiveBp=v=>integer(v,1,5000);
const threshold=v=>integer(v,1,50000);
const named=v=>typeof v==='string'&&v.trim().length>0;
const requiredTrue=v=>v===true;
const yesNo=v=>typeof v==='boolean';
const filter=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&
 Object.keys(v).length===2&&
 ['name','trait','color','type'].includes(v.field)&&
 typeof v.value==='string'&&v.value.trim().length>0&&
 (v.field!=='type'||['character','event','field'].includes(v.value));
const filters=v=>Array.isArray(v)&&v.length>=2&&v.length<=3&&
 v.every(filter)&&new Set(v.map(c=>c.field+':'+c.value)).size===v.length;

// Keys and required validators are explicit, preventing misspelled printed
// conditions from silently falling back to mandatory/optional defaults.
const registry=Object.freeze({
 draw:{
  args:{count:v=>integer(v,1,10)},build:v=>[{op:'draw',count:v.count}]
 },
 drawIfOwnEnergyAtLeast:{
  args:{energy:v=>integer(v,1,50),count:v=>integer(v,1,5)},
  build:v=>[{op:'drawIfOwnEnergyAtLeast',energy:v.energy,count:v.count}]
 },
 drawIfOwnTraitCount:{
  args:{trait:named,zone:v=>['field','front','energy'].includes(v),
   excludeSelf:yesNo,min:v=>integer(v,1,8),count:v=>integer(v,1,5)},
  build:v=>[{op:'drawIfOwnTraitCount',trait:v.trait,zone:v.zone,
   excludeSelf:v.excludeSelf,min:v.min,count:v.count}]
 },
 drawIfOwnName:{
  args:{name:named,count:v=>integer(v,1,5)},
  build:v=>[{op:'drawIfOwnName',name:v.name,count:v.count}]
 },
 // onAttack draw that also requires this character's current BP. Absent
 // minSelfBp stays on drawIfOwnName so older cards do not grow a new key.
 drawIfOwnNameMinSelfBp:{
  args:{name:named,count:v=>integer(v,1,5),
   minSelfBp:v=>integer(v,500,50000)&&v%500===0},
  build:v=>[{op:'drawIfOwnName',name:v.name,count:v.count,minSelfBp:v.minSelfBp}]
 },
 drawIfNameOrDistinctColorNames:{
  args:{name:named,color:v=>['red','blue','yellow','green','purple'].includes(v),
   min:v=>integer(v,2,8),count:v=>integer(v,1,5)},
  build:v=>[{op:'drawIfNameOrDistinctColorNames',name:v.name,color:v.color,
   min:v.min,count:v.count}]
 },
 millTop:{
  args:{count:v=>integer(v,1,10)},build:v=>[{op:'millTop',count:v.count}]
 },
 drawDiscardOne:{
  args:{},build:()=>[{op:'drawDiscard',count:1}]
 },
 // Draw first, then require sequential physical-UID hand discards.
 drawDiscardMany:{
  args:{drawCount:v=>integer(v,1,10),discardCount:v=>integer(v,1,10)},
  build:v=>[{op:'drawDiscard',count:v.drawCount,discardCount:v.discardCount}]
 },
 peekTopOne:{
  args:{},build:()=>[{op:'peekTopOne'}]
 },
 peekTopOrBottom:{
  args:{},build:()=>[{op:'peekTopOrBottom'}]
 },
 recoverAp:{
  args:{count:v=>integer(v,1,3)},build:v=>[{op:'recoverAp',count:v.count}]
 },
 buffSelf:{
  args:{bp:positiveBp},build:v=>[{op:'buffSelf',bp:v.bp}]
 },
 enemyBpDown:{
  args:{bp:positiveBp,optional:yesNo},
  build:v=>[{op:'enemyBpDown',bp:v.bp,optional:v.optional}]
 },
 retireEnemyUnderBp:{
  args:{bp:threshold,bonusName:named,bonusBp:threshold},
  check:v=>v.bonusBp>=v.bp,
  build:v=>[{op:'retireOppFrontUnderBp',bp:v.bp,bonusName:v.bonusName,bonusBp:v.bonusBp}]
 },
 restEnemyUnderBp:{
  // Some official cards mandate the target when present; do not invent a
  // "skip" decision by reusing the originally optional variant.
  args:{bp:threshold,optional:yesNo},
  build:v=>[{op:'restOppFrontUnderBp',bp:v.bp,optional:v.optional}]
 },
 // Current BP >= N on the opponent front. Do not reuse the <= op.
 restEnemyFrontBpAtLeast:{
  args:{bp:v=>integer(v,500,50000)&&v%500===0,optional:requiredTrue},
  build:v=>[{op:'restOppFrontBpAtLeast',bp:v.bp,optional:true}]
 },
 // Printed text with NO BP cap (e.g. UA08BT/BLC-1-030). Never approximate
 // an unbounded target with a giant numeric cap: temporary BP may exceed it.
 restEnemyFrontOne:{
  args:{optional:yesNo},
  build:v=>[{op:'restOppFrontOne',optional:v.optional}]
 },
 restEnemyFrontSkipNextActive:{
  args:{optional:yesNo},
  build:v=>[{op:'restOppFrontOne',optional:v.optional,skipNextActive:true}]
 },
 restEnemyUnderBpSkipNextActive:{
  args:{bp:threshold,optional:yesNo},
  build:v=>[{op:'restOppFrontUnderBp',bp:v.bp,optional:v.optional,skipNextActive:true}]
 },
 skipNextActiveOppRest:{
  args:{optional:yesNo},
  build:v=>[{op:'skipNextActiveOppRest',optional:v.optional}]
 },
 restSilenceOppFrontIfOwnOutsideField:{
   args:{optional:requiredTrue},
   build:()=>[{op:'restSilenceOppFrontIfOwnOutsideField',optional:true}]
  },
  restOrRetireEnemyFrontByOwnLife:{
   args:{bp:threshold,lifeAtMost:v=>integer(v,0,20),optional:yesNo},
   build:v=>[{op:'restOrRetireOppFrontByLife',bp:v.bp,
    lifeAtMost:v.lifeAtMost,optional:v.optional}]
  },
  retireEnemyIfFacedown:{
  args:{bp:threshold,optional:requiredTrue},
  build:v=>[{op:'retireOppFrontIfFacedown',bp:v.bp,optional:true}]
 },
 buffOwnTrait:{
  args:{trait:named,bp:positiveBp,optional:requiredTrue},
  build:v=>[{op:'buffOwnTrait',trait:v.trait,bp:v.bp,optional:true}]
 },
 drawIfRaidUnderFacedown:{
  args:{},build:()=>[{op:'drawIfRaidUnderFacedown'}]
 },
 // Explicitly search the OWN deck, select at most one printed match, and
 // always shuffle afterward (including a skipped/empty search).
 searchDeckOne:{
  args:{filter,optional:yesNo,shuffle:requiredTrue},
  build:v=>[{op:'searchDeckOne',filter:{...v.filter},optional:v.optional,shuffle:true}]
 },
 // Recovery is from the controller's PUBLIC outside zone, not removal/life.
 recoverOutsideOne:{
  args:{filter,optional:yesNo},
  build:v=>[{op:'recoverOutsideOne',filter:{...v.filter},optional:v.optional}]
 },
 // Explicit printed original BP, never temporary buffs / source energy.
 recoverOutsidePrintedBp:{
  args:{bp:v=>integer(v,1,50000),optional:yesNo},
  build:v=>[{op:'recoverOutsidePrintedBp',bp:v.bp,optional:v.optional}]
 },
 // An atomic, optional discard-one cost THEN draw; declining never draws.
 discardToDraw:{
  args:{count:v=>integer(v,1,10),optional:yesNo},
  build:v=>[{op:'discardToDraw',count:v.count,optional:v.optional}]
 },
 // "Up to N" search, one private choice at a time, one mandatory shuffle
 // after the LAST choice. Only the controller's physical deck is searched.
 searchDeckMany:{
  args:{filter,count:v=>integer(v,1,5),optional:yesNo,shuffle:requiredTrue},
  build:v=>[{op:'searchDeckMany',filter:{...v.filter},count:v.count,
   optional:v.optional,shuffle:true}]
 },
 // Target all current opponent front-line characters in one batch. Every BP
 // change lands before state-based retirement queues any leave replacement.
 enemyFrontAllBpDown:{
  args:{bp:positiveBp},build:v=>[{op:'enemyFrontAllBpDown',bp:v.bp}]
 },
 // Same batch reduction, restricted to one inclusive BP window captured at
 // resolution. null on either side means that side is unbounded. At least
 // one side must be a number; the unbounded card stays on enemyFrontAllBpDown.
 enemyFrontBpDownInRange:{
  args:{
   bp:positiveBp,
   minBp:v=>v===null||integer(v,0,50000),
   maxBp:v=>v===null||integer(v,0,50000)
  },
  check:v=>(v.minBp!==null||v.maxBp!==null)&&
   (v.minBp===null||v.maxBp===null||v.minBp<=v.maxBp),
  build:v=>[{op:'enemyFrontAllBpDown',bp:v.bp,
   ...(v.minBp===null?{}:{minBp:v.minBp}),
   ...(v.maxBp===null?{}:{maxBp:v.maxBp})}]
 },
 // Snapshot every eligible opposing front-line character at resolution time;
 // resolve replacement choices one by one without retargeting later victims.
 retireEnemyFrontAllUnderBp:{
  args:{bp:threshold},build:v=>[{op:'retireOppFrontAllUnderBp',bp:v.bp}]
 },
 // Temporary boost for all qualifying current field units. Buffs expire
 // with the existing turn counter; units entering later do not inherit it.
 buffOwnTraitAllTurn:{
  args:{trait:named,bp:positiveBp},
  build:v=>[{op:'buffOwnTraitAllTurn',trait:v.trait,bp:v.bp}]
 },
 // OnPlay/OnAttack etc: select one own FIELD character matching a printed
 // name, trait or color. Explicit optionality and excludeSelf are mandatory.
 buffOwnField:{
  args:{filter,bp:positiveBp,optional:yesNo,excludeSelf:yesNo},
  build:v=>[{op:'buffOwnField',filter:{...v.filter},bp:v.bp,
   optional:v.optional,excludeSelf:v.excludeSelf}]
 },
 // 元々のBP. The amount is a this-turn bonus. excludeSelf false includes
 // the source when its printed BP matches.
 buffOwnPrintedBp:{
  args:{printedBp:v=>integer(v,0,50000)&&v%500===0,
   bp:v=>integer(v,500,5000)&&v%500===0,optional:yesNo,excludeSelf:yesNo},
  build:v=>[{op:'buffOwnField',filter:{field:'bp',value:v.printedBp},bp:v.bp,
   optional:v.optional,excludeSelf:v.excludeSelf}]
 },
 // Triggered only by the controller's FIRST declared character attack.
 buffSelfIfFirstAttack:{
  args:{bp:positiveBp},build:v=>[{op:'buffSelfIfFirstAttack',bp:v.bp}]
 },
 // Mandatory onPlay: choose another own field character with printed energy
 // <= max, or return this source to hand when there are no other valid cards.
 bounceOwnOtherUnderEnergy:{
  args:{energy:v=>integer(v,0,30)},build:v=>[{op:'bounceOwnOtherUnderEnergy',energy:v.energy}]
 },
 recoverOutsideColorUnderEnergy:{
  args:{color:named,energy:v=>integer(v,0,30),optional:yesNo},
  build:v=>[{op:'recoverOutsideColorUnderEnergy',color:v.color,
    energy:v.energy,optional:v.optional}]
 },
 // True printed per-turn limits, not a blanket source "used" flag.
 // If optional, accepting the use is a legal controller decision. Declining
 // does not consume the counter. A "name" limit is shared among same-name
 // physical cards owned by this player for the current turn.
 oncePerTurnThen:{
  args:{scope:v=>v==='card'||v==='name',optional:yesNo,
   then:v=>Array.isArray(v)&&v.length>=1&&v.length<=6},
  check:v=>v.then.every(x=>x&&[
   'draw','millTop','peekTopOne','enemyBpDown','restEnemyUnderBp',
   'restEnemyFrontOne',
   'buffOwnField','searchDeckOne','recoverOutsideOne','buffSelf'
  ].includes(x.template)),
  build:v=>[{op:'oncePerTurnGate',scope:v.scope,optional:v.optional,
   then:v.then.flatMap((spec,i)=>expandOne(spec,'oncePerTurnThen.then['+i+']'))}]
 },
 // Atomic payment gate: NONE of the nested effects run unless an owned
 // hand card was discarded. Nested templates are intentionally restricted
 // and validated again by the ordinary Pack DSL verifier.
 searchDeckWhere:{
  args:{filters,logic:v=>v==='all'||v==='any',
   count:v=>integer(v,1,5),optional:yesNo,shuffle:requiredTrue},
  build:v=>[{op:'searchDeckWhere',filters:v.filters.map(x=>({...x})),logic:v.logic,
   count:v.count,optional:v.optional,shuffle:true}]
 },
 // Look only at the top 2-4 actual cards. Choose at most one to send outside,
 // then explicitly order the remainder onto deck top or bottom. No shuffle.
 inspectTopArrange:{
  args:{count:v=>integer(v,2,4),toOutside:yesNo,
   rest:v=>v==='top'||v==='bottom'},
  build:v=>[{op:'inspectTopArrange',count:v.count,toOutside:v.toOutside,rest:v.rest}]
 },
 // Top N, at most one card whose name is in the printed list, rest on top.
 // No color. Aliases count. This is not the unfiltered arrange op.
 inspectTopNamesOutside:{
  args:{count:v=>integer(v,2,4),
   names:v=>Array.isArray(v)&&v.length>=2&&v.length<=3&&new Set(v).size===v.length&&
    v.every(n=>typeof n==='string'&&!!n.trim()&&n.length<=80)},
  build:v=>[{op:'inspectTopNamesOutside',count:v.count,rest:'top',max:1,names:[...v.names]}]
 },
 // Choose 0..N cards outside, then order every remaining inspected card.
 inspectTopAnyOutside:{
  args:{count:v=>integer(v,2,4),rest:v=>v==='top'||v==='bottom'},
  build:v=>[{op:'inspectTopAnyOutside',count:v.count,rest:v.rest}]
 },
 // Select up to one qualifying physical UID from exactly the top N cards.
 // Controller orders all remaining inspected cards onto DECK BOTTOM, with no
 // shuffle; only after a successful hand addition must exactly one card be
 // discarded from hand (the chosen card itself remains a legal discard).
 searchTopOneBottomDiscard:{
  args:{count:v=>integer(v,1,5),filter},
  build:v=>[{op:'searchTopOneBottomDiscard',count:v.count,filter:{...v.filter}}]
 },
 // Compose 2–3 distinct official name/trait predicates against the SAME
 // inspected private TOP-N window. Preserves the same bottom-order and
 // "discard only if a card was taken" runtime as single-filter cards.
 searchTopOneBottomDiscardWhere:{
  args:{
   count:v=>integer(v,1,5),
   filters:v=>Array.isArray(v)&&v.length>=2&&v.length<=3&&v.every(f=>
    f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&
    ['name','trait','color','type'].includes(f.field)&&
    typeof f.value==='string'&&!!f.value.trim()&&
    (f.field!=='type'||['character','event','field'].includes(f.value)))&&
    new Set(v.map(f=>f.field+':'+f.value)).size===v.length,
   logic:v=>v==='any'||v==='all'
  },
  build:v=>[{op:'searchTopOneBottomDiscard',count:v.count,
   filters:v.filters.map(f=>({...f})),logic:v.logic}]
 },
 // Typed and strictly bounded version of the existing TOP-N choice/order path.
 searchTopUpToTwoBottom:{
  args:{count:v=>integer(v,1,5),filters:v=>Array.isArray(v)&&v.length>=1&&v.length<=3&&
   v.every(f=>f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&
    ['name','trait','color','type','printedRequiredEnergyAtMost'].includes(f.field)&&
    (f.field==='printedRequiredEnergyAtMost'?
     integer(f.value,0,30):
     typeof f.value==='string'&&!!f.value.trim()&&f.value.length<=80&&
     (f.field!=='type'||['character','event','field'].includes(f.value))))&&
    new Set(v.map(f=>f.field+':'+f.value)).size===v.length,
   logic:v=>['any','all'].includes(v)},
  build:v=>[{op:'searchTopUpToTwoBottom',count:v.count,max:2,rest:'bottom',
   filters:v.filters.map(f=>({...f})),logic:v.logic}]
 },
 // Printed hand selection, never a paid PLAY.
  deployOwnHandRest:{
   args:{type:v=>['character','field'].includes(v),
    color:v=>['blue','yellow','green','purple','red'].includes(v),
    energy:v=>integer(v,0,30),ap:v=>integer(v,1,3),max:v=>integer(v,1,4)},
   build:v=>[{op:'deployOwnHandRest',type:v.type,color:v.color,
    energy:v.energy,ap:v.ap,max:v.max}]
  },
  // Single-selection specialization of the SAME multi-choice runtime (no new op/queue).
 searchTopUpToOneBottom:{
  args:{count:v=>integer(v,1,5),filters:v=>Array.isArray(v)&&v.length>=1&&v.length<=3&&
   v.every(f=>f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===2&&
    ['name','trait','color','type','printedRequiredEnergyAtMost'].includes(f.field)&&
    (f.field==='printedRequiredEnergyAtMost'?
     integer(f.value,0,30):
     typeof f.value==='string'&&!!f.value.trim()&&f.value.length<=80&&
     (f.field!=='type'||['character','event','field'].includes(f.value))))&&
    new Set(v.map(f=>f.field+':'+f.value)).size===v.length,
   logic:v=>['any','all'].includes(v)},
  build:v=>[{op:'searchTopUpToTwoBottom',count:v.count,max:1,rest:'bottom',
   filters:v.filters.map(f=>({...f})),logic:v.logic}]
 },
 payDiscardThen:{
  args:{optional:yesNo,then:v=>Array.isArray(v)&&v.length>=1&&v.length<=6},
  check:v=>v.then.every(x=>x&&[
   'draw','millTop','peekTopOne','searchDeckOne','searchDeckMany',
   'searchDeckWhere','inspectTopArrange','inspectTopAnyOutside','peekTopOrBottom',
   'recoverOutsideOne','enemyBpDown',
   'enemyFrontAllBpDown','retireEnemyFrontAllUnderBp','buffOwnTraitAllTurn',
   'recoverOutsideColorUnderEnergy','buffOwnField','restEnemyUnderBp','restEnemyFrontOne'
  ].includes(x.template)),
  build:v=>[{op:'discardGate',optional:v.optional,
   then:v.then.flatMap((spec,i)=>expandOne(spec,'payDiscardThen.then['+i+']'))}]
 }
});
export const V2_ABILITY_TEMPLATE_IDS=Object.freeze(Object.keys(registry));

function expandOne(spec,path){
 if(!spec||typeof spec!=='object'||Array.isArray(spec)||
  typeof spec.template!=='string'||!Object.prototype.hasOwnProperty.call(registry,spec.template))
  throw Error(path+' unknown/invalid ability template (fail closed)');
 const def=registry[spec.template],keys=Object.keys(def.args),actual=Object.keys(spec);
 if(actual.length!==keys.length+1||
  actual.some(k=>k!=='template'&&!keys.includes(k)))
  throw Error(path+' '+spec.template+' invalid template arguments');
 for(const [k,validate] of Object.entries(def.args)){
  if(!Object.prototype.hasOwnProperty.call(spec,k)||!validate(spec[k]))
   throw Error(path+' '+spec.template+' invalid '+k);
 }
 if(def.check&&!def.check(spec))
  throw Error(path+' '+spec.template+' incompatible parameters');
 // Builders create plain new objects, never return the author's mutable input.
 return def.build(spec);
}
export function expandAbilityTemplates(templateEffects,path='templateEffects'){
 if(templateEffects===undefined)return {};
 if(!templateEffects||typeof templateEffects!=='object'||Array.isArray(templateEffects))
  throw Error(path+' must be a timing-to-template map');
 const programs={};
 for(const [timing,entries] of Object.entries(templateEffects)){
  if(!timings.includes(timing))throw Error(path+' unknown timing '+timing);
  if(!Array.isArray(entries)||!entries.length||entries.length>30)
   throw Error(path+'.'+timing+' must contain 1–30 templates');
  const actions=entries.flatMap((entry,i)=>expandOne(entry,path+'.'+timing+'['+i+']'));
  if(actions.length>64)throw Error(path+'.'+timing+' exceeds program limit');
  programs[timing]=actions;
 }
 return programs;
}
