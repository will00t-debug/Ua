// EX17BT Re:Zero Vol.2 on the shared universal V2 engine.
// Only cards whose entire printed body is covered are registered.
// Japanese nameJa is the rules identity. This pack is not part of the
// five-title 700-card census, and auto stays false in the catalogue.
import {REZERO_VOL2_BY_ID} from '../rezero-vol2.mjs';
import {createUniversalPack} from './pack.mjs';

const ANASTASIA_OR_FOUR_GREEN={
 kind:'ownNameOrDistinctPrintedColorNames',turn:'own',zone:'field',
 name:'アナスタシア・ホーシン',color:'green',min:4
};

function shell(id){
 const printed=REZERO_VOL2_BY_ID[id];
 if(!printed)throw Error('Missing EX17BT catalogue card '+id);
 return {
  id,name:printed.nameJa,color:printed.color,type:printed.type,
  energy:printed.energy,ap:printed.ap,bp:printed.bp??0,gen:printed.gen,
  traits:[...printed.traits],trigger:printed.trigger,maxCopies:printed.maxCopies
 };
}

const PROFILES={
 'REZ-2-014':{implementation:'vanilla',effects:{}},
 'REZ-2-015':{implementation:'dsl',effects:{onAttack:[
  {op:'drawIfOwnName',name:'クルシュ・カルステン',count:1,minSelfBp:4000}]}},
 'REZ-2-031':{implementation:'dsl',effects:{onPlay:[
  {op:'draw',count:1},
  {op:'recoverOutsideOne',filter:{field:'name',value:'ベアトリス'},optional:true}]}},
 'REZ-2-033':{implementation:'dsl',effects:{},activeExtraEnergy:1},
 'REZ-2-035':{implementation:'dsl',effects:{},emptyOwnFieldHandEnergyDiscount:2},
 'REZ-2-040':{implementation:'dsl',effects:{onRetire:[
  {op:'restOppFrontBpAtLeast',bp:4500,optional:true}]}},
 'REZ-2-041':{implementation:'dsl',effects:{},nameAliases:['シルフィ']},
 'REZ-2-042':{implementation:'dsl',effects:{},emptyOwnFieldHandEnergyDiscount:2,impactNull:true},
 'REZ-2-043':{implementation:'dsl',effects:{},passiveBonuses:[
  {condition:{...ANASTASIA_OR_FOUR_GREEN},bp:1500}]},
 'REZ-2-046':{implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]}},
 'REZ-2-049':{implementation:'dsl',effects:{},passiveBonuses:[
  {condition:{...ANASTASIA_OR_FOUR_GREEN},bp:1000}]},
 'REZ-2-050':{implementation:'dsl',templateEffects:{onPlay:[{template:'buffOwnField',
  filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:true}]}},
 'REZ-2-055':{implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]}},
 'REZ-2-056':{implementation:'dsl',templateEffects:{onPlay:[{template:'drawDiscardOne'}]}},
 'REZ-2-059':{implementation:'dsl',templateEffects:{onPlay:[
  {template:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]}},
 'REZ-2-060':{implementation:'dsl',effects:{},opponentTurnBp:-1500},
 'REZ-2-063':{implementation:'vanilla',effects:{}},
 'REZ-2-066':{implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:1}]}},
 'REZ-2-067':{implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]}},
 'REZ-2-071':{implementation:'dsl',templateEffects:{onPlay:[{template:'recoverAp',count:2}]}}
};

export const REZ_V2_IMPLEMENTED_IDS=Object.freeze(Object.keys(PROFILES));

export function createRezV2Pack(){
 const cards=REZ_V2_IMPLEMENTED_IDS.map(id=>({...shell(id),...PROFILES[id]}));
 return createUniversalPack({id:'rezero',version:'0.8.0',cards});
}
