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
 peekTopOne:{
  args:{},build:()=>[{op:'peekTopOne'}]
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
  args:{bp:threshold,optional:requiredTrue},
  build:v=>[{op:'restOppFrontUnderBp',bp:v.bp,optional:true}]
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
