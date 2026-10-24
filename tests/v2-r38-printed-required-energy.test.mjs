import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesPrintedRequiredEnergyAtMost,matchesPrintedPlayFilter,validatePrintedPlayFilter} from '../dist/universal-v2/ap-discounts.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
const printed={id:'ENERGY-001',name:'合法角色',type:'character',energy:4,gen:5,ap:1,bp:4000,color:'green',traits:['護廷十三隊'],trigger:null,implementation:'vanilla',effects:{}};
test('R38 printed required energy is card-face necessary energy, not production, BP, or live board supply',()=>{
 assert.equal(matchesPrintedRequiredEnergyAtMost(printed,4),true);
 assert.equal(matchesPrintedRequiredEnergyAtMost({...printed,energy:5,gen:0},4),false);
 assert.equal(matchesPrintedRequiredEnergyAtMost({...printed,energy:3,gen:10},4),true);
 assert.equal(matchesPrintedPlayFilter(printed,{cardType:'character',printedRequiredEnergyAtMost:4,trait:'護廷十三隊'}),true);
 for(const d of [{...printed,energy:5},{...printed,traits:['別特徵']},{...printed,type:'event'}])
  assert.equal(matchesPrintedPlayFilter(d,{cardType:'character',printedRequiredEnergyAtMost:4,trait:'護廷十三隊'}),false);
 assert.equal(matchesPrintedPlayFilter({...printed,energy:5,gen:1},{printedGenAtLeast:1}),true);
 assert.equal(matchesPrintedPlayFilter({...printed,energy:5,gen:1},{printedRequiredEnergyAtMost:4}),false);
});
test('R38 strictly typed energy ceiling, printed name OR, and selectors reject malicious values',()=>{
 for(const f of [{printedRequiredEnergyAtMost:-1},{printedRequiredEnergyAtMost:31},{printedRequiredEnergyAtMost:4.5},
  {printedRequiredEnergyAtMost:'4'},{requiredEnergyAtMost:4},{liveEnergyAtMost:4},
  {namesAny:['同名','同名']},{namesAny:['單獨']},{namesAny:['正常','']},{}])
  assert.throws(()=>validatePrintedPlayFilter(f));
 const legal={cardType:'character',printedRequiredEnergyAtMost:4,namesAny:['合法角色','另一個角色']};
 assert.equal(validatePrintedPlayFilter(legal),true);
 assert.equal(matchesPrintedPlayFilter(printed,legal),true);
 assert.equal(matchesPrintedPlayFilter({...printed,name:'第三個'},legal),false);
});
test('R38 existing TOP-N DSL validates printed required energy alongside exact trait AND type',()=>{
 const candidate={id:'E-000',name:'調查',type:'event',color:'green',energy:0,gen:0,ap:1,bp:0,trigger:null,traits:[],
  implementation:'dsl',templateEffects:{onPlay:[{template:'searchTopUpToTwoBottom',count:4,
   filters:[{field:'type',value:'character'},{field:'trait',value:'護廷十三隊'},
    {field:'printedRequiredEnergyAtMost',value:4}],logic:'all'}]}};
 assert.doesNotThrow(()=>createUniversalPack({id:'printed-top',cards:[candidate,printed]}));
 for(const value of ['4',-1,31,3.5,null]){
  const corrupt=structuredClone(candidate);
  corrupt.templateEffects.onPlay[0].filters[2].value=value;
  assert.throws(()=>createUniversalPack({id:'bad-top',cards:[corrupt,printed]}),String(value));
 }
});
