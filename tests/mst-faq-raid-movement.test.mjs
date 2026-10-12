import test from 'node:test';
import assert from 'node:assert/strict';
import {mstRemoveRaidTop,mstMoveChoices,mstUseNamedAbility,mstRudeus73CanActivate} from '../dist/mst-rulings.mjs';
test('Q2148-2151 removes only top Raid and preserves exhausted base, no entry trigger',()=>{
 const base={uid:'b',cardId:'MST-1-001',ready:true,usedTurn:2,buffs:[{bp:500}]};
 const result=mstRemoveRaidTop({uid:'t',cardId:'MST-1-025',ready:false,usedTurn:9,stack:[base],buffs:[{bp:3000}],protectedUntilSource:{p:0}});
 assert.equal(result.exposed.uid,'b');
 assert.equal(result.exposed.ready,false);
 assert.equal(result.exposed.usedTurn,2,'the removed top ability usage cannot overwrite the base ability usage');
 assert.deepEqual(result.exposed.buffs,[]);
 assert.equal(result.exposed.protectedUntilSource,undefined);
 assert.equal(result.entryTriggered,false);
 assert.equal(result.outside.cardId,'MST-1-025');
});
test('Q2155/2163 produces legal remove decision on a full target line',()=>{
 const occupied=Array.from({length:4},(_,i)=>({uid:'u'+i}));
 const choices=mstMoveChoices({fromLine:'front',toLine:'energy',fromSlot:1,lines:{energy:occupied}});
 assert.equal(choices.length,4);
 assert.deepEqual(choices.map(x=>x.removeUid),['u0','u1','u2','u3']);
 const free=mstMoveChoices({fromLine:'front',toLine:'energy',fromSlot:1,lines:{energy:[null,...occupied.slice(1)]}});
 assert.deepEqual(free.map(x=>x.removeUid),[null]);
});
test('Q2165 shared once per turn and Q2208 allow activating already ACTIVE Rudeus',()=>{
 const state=mstUseNamedAbility({}, {player:0,name:'ルーデウス',effect:'MST-1-073',turn:9});
 assert.throws(()=>mstUseNamedAbility(state,{player:0,name:'ルーデウス',effect:'MST-1-073',turn:9}),/同名能力/);
 assert.equal(mstRudeus73CanActivate({ownEnergy:7,cardReady:true,namedUses:{},player:0,turn:9}),true);
 assert.equal(mstRudeus73CanActivate({ownEnergy:7,cardReady:false,namedUses:state,player:0,turn:9}),false);
 assert.equal(mstRudeus73CanActivate({ownEnergy:6,cardReady:false,namedUses:{},player:0,turn:9}),false);
});
