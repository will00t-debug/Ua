// Reusable, auditable V2 ability templates.
// This module only compiles explicitly authored card abilities into existing
// battle-engine DSL ops. It NEVER infers effects from printed card prose and
// cannot authorize a card that has not passed the per-card official gate.
const timings=Object.freeze(['onPlay','onRaid','onAttack','onRaided']);
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
 // Printed text with NO BP cap (e.g. UA08BT/BLC-1-030). Never approximate
 // an unbounded target with a giant numeric cap: temporary BP may exceed it.
 restEnemyFrontOne:{
  args:{optional:yesNo},
  build:v=>[{op:'restOppFrontOne',optional:v.optional}]
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
 // Choose 0..N cards outside, then order every remaining inspected card.
 inspectTopAnyOutside:{
  args:{count:v=>integer(v,2,4),rest:v=>v==='top'||v==='bottom'},
  build:v=>[{op:'inspectTopAnyOutside',count:v.count,rest:v.rest}]
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
