import assert from 'node:assert/strict';
import test from 'node:test';
import {POLICY_NAMES} from '../dist/universal-v2/white-sword-ai/features.mjs';
import {v2Hash} from '../training/white-sword-ai/v4a/lib/store.mjs';
import {auditPosition,sameCardPlays} from '../training/white-sword-ai/v4b6/lib/audit.mjs';
import {interactionOf} from '../training/white-sword-ai/v4b6/lib/context.mjs';
import {sameChoices} from '../training/white-sword-ai/v4b6/lib/expand.mjs';
import {INTERACTION_NAMES,TARGET_ID} from '../training/white-sword-ai/v4b6/lib/protocol.mjs';
import {judgeFeature} from '../training/white-sword-ai/v4b6/lib/separate.mjs';
import {savedPositions} from '../training/white-sword-ai/v4b5/lib/update.mjs';

const BOOKS=[{
 'BLC-4-070':{energy:1,gen:1,ap:1,bp:4000,color:'green',type:'character'},
 'BLC-2-073':{energy:4,gen:0,ap:1,bp:0,color:'green',type:'event'},
 'BLC-9-999':{energy:1,gen:1,ap:1,bp:4000,color:'green',type:'character'}
},{}];
function observation(cardId='BLC-4-070'){
 return {visible:{players:[
  {hand:[{uid:'0-1',cardId},{uid:'0-2',cardId:'BLC-2-073'}],front:[null,null,null,null],energy:[null,null,null,null],energyByColor:{green:0},energyTotal:0,apReady:2},
  {hand:null,front:[{uid:'1-1',cardId:'x',bp:3000}],energy:[],energyByColor:{},energyTotal:0,apReady:0}
 ]}};
}

test('stored line plays differ by line and hash, not by the position facts',()=>{
 const before=v2Hash();
 const target=savedPositions().find(position=>position.id===TARGET_ID);
 const audited=auditPosition(target);
 const pair=audited.pairs.find(row=>row.card==='BLC-4-070');
 const named=pair.changes.filter(change=>!change.hash).map(change=>change.name).sort();
 assert.deepEqual(named,['line_energy','line_front']);
 for(const name of ['my_energy','my_ap','my_front','opp_front','card_bp','card_gen','spends_ap']){
  const index=POLICY_NAMES.indexOf(name);
  assert.equal(pair.energy.features[index]||0,pair.front.features[index]||0,name);
 }
 assert.equal(sameCardPlays(target).some(row=>row.fronts.length&&row.energies.length),true);
 assert.equal(v2Hash(),before);
});

test('placement interactions use visible costs and ignore the card number',()=>{
 assert.equal(INTERACTION_NAMES.some(name=>/BLC|uid|position/i.test(name)),false);
 const energy={type:'play',line:'energy',uid:'0-1'};
 const front={type:'play',line:'front',uid:'0-1'};
 const placed=interactionOf(observation(),BOOKS,0,energy).values;
 const kept=interactionOf(observation(),BOOKS,0,front).values;
 assert.equal(placed.hand_short,0.5);
 assert.equal(placed.pay_relief,0.125);
 assert.equal(kept.hand_short,0);
 assert.equal(kept.board_pressure,3000/20000);
 assert.equal(interactionOf(observation(),BOOKS,0,{type:'raid',uid:'0-9'}).values.pay_relief,0);
 const renamed=interactionOf(observation('BLC-9-999'),BOOKS,0,energy).values;
 assert.equal(renamed.pay_relief,placed.pay_relief);
 assert.equal(renamed.realize_gen,placed.realize_gen);
});

test('only a varying position interaction can pass the separation rule',()=>{
 const separated=[
  {role:'target',diff:0.4},
  {role:'protect-front',diff:0},
  {role:'protect-front',diff:0.05},
  {role:'protect-front',diff:-0.1}
 ];
 assert.equal(judgeFeature('pay_relief',separated).pass,true);
 assert.equal(judgeFeature('realize_gen',separated).pass,false);
 const flat=separated.map(row=>({...row,diff:0.2}));
 assert.equal(judgeFeature('hand_short',flat).pass,false);
});

test('a zero weight on a new column keeps the current choice',()=>{
 const parent=[0.2,-0.4];
 const positions=[{
  id:'one',
  band:[
   {key:'a',hard:1,features:[1,0]},
   {key:'b',hard:1,features:[0,1]}
  ],
  extra:new Map([['a',{pay_relief:0}],['b',{pay_relief:5}]])
 }];
 assert.equal(sameChoices(parent,positions,['pay_relief']).ok,true);
});
