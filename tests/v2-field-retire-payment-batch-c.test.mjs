import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const caller={id:'TEST-RETIRE-COST',name:'Generic paid source',type:'character',color:'green',energy:0,ap:1,bp:3000,gen:1,implementation:'dsl',
 mainAbility:{op:'retireOwnFieldThen',frontOnly:true,oncePerTurn:true,after:[{op:'buffSelf',bp:1000}]}};
const pack=createUniversalPack({id:'mst-field-cost-fixture',cards:[...verifiedMstV2Cards(),caller]});
const ids=['MST-1-050','MST-1-051','MST-1-054','MST-1-075','MST-1-055','MST-1-057','MST-1-061','MST-1-063','MST-1-070','MST-1-069','MST-1-047','MST-1-010','MST-1-077','MST-1-072'];
const deck=Object.fromEntries(ids.map(id=>[id,4]));deck['MST-1-051']=1;deck['MST-1-072']=0;deck[caller.id]=1;
const packs=[pack,pack];
function take(s,id){for(const z of ['deck','hand','life','outside']){const a=s.players[0][z],i=a.findIndex(c=>c.cardId===id);if(i>=0)return a.splice(i,1)[0];}throw Error('Missing '+id);}
function fixture(withField=true){let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:441});
 const source=take(s,caller.id);source.ready=false;s.players[0].front[0]=source;
 let field=null;if(withField){field=take(s,'MST-1-075');field.ready=false;s.players[0].energy[0]=field;}
 s=dispatchUniversalAction(packs,s,{type:'next'});s=dispatchUniversalAction(packs,s,{type:'next'});return {s,source,field};}
const activate=s=>legalUniversalActions(packs,s).find(x=>x.type==='activate'&&x.mode==='retireFieldThen');
test('Batch C genuine FIELD retirement resolves MST-075 draw before source BP and never offers unpaid skip',()=>{
 let {s,source,field}=fixture();assert.ok(activate(s));s=dispatchUniversalAction(packs,s,activate(s));
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseOwnFieldRetire',uid:field.uid}]);
 assert.equal(universalBp(packs,s,source),3000);
 const hand=s.players[0].hand.length;
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:null}),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 assert.equal(s.turnRetireEvents[0].cardType,'field');
 assert.equal(activate(s),undefined);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch C nonexistent FIELD cannot be paid or grant BP',()=>{let {s,source}=fixture(false);
 assert.equal(activate(s),undefined);assert.equal(universalBp(packs,s,source),3000);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:source.uid,mode:'retireFieldThen'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch C unknown after-cost profiles fail closed',()=>{for(const after of [[],[{op:'fake'}],[{op:'millTop',count:1}],[{op:'buffSelf',bp:1000},{op:'draw',count:1}]]){
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...caller,mainAbility:{...caller.mainAbility,after}}]}),/unsupported main action/);
}});
