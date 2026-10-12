import test from 'node:test';
import assert from 'node:assert/strict';
import {mstColorTargets,mstArielSearch,mstRoxyEventPlayOptions,mstDiscountAp,mstRudeusMovementAllowed,mstWarriorDrawCount} from '../dist/mst-rulings.mjs';
test('MST-1-040 COLOR targets only opposing front line BP at most 3500',()=>{
 const front=[{uid:'1',owner:1,bp:3500},{uid:'2',owner:1,bp:4000},{uid:'3',owner:0,bp:1000}];
 assert.deepEqual(mstColorTargets(front,0).map(c=>c.uid),['1']);
});
test('MST-1-055 search enforces trait and mandatory discard after selection',()=>{
 const top=[{uid:'a',traits:['ラノア魔法大学']},{uid:'b',traits:[]}],old={uid:'h'};
 assert.deepEqual(mstArielSearch(top,null,null,[old]).bottom,top);
 assert.throws(()=>mstArielSearch(top,'b','h',[old]),/指定特徵/);
 assert.throws(()=>mstArielSearch(top,'a',null,[old]),/必須/);
 const result=mstArielSearch(top,'a','h',[old]);
 assert.deepEqual(result.hand,[top[0]]);assert.deepEqual(result.outside,[old]);assert.deepEqual(result.bottom,[top[1]]);
});
test('MST-1-040 event gates by Roxy, AP, energy, names and rests new character',()=>{
 const hand=[{uid:'a',name:'ルーデウス',color:'blue',ap:1,energy:2},{uid:'b',name:'ロキシー',color:'blue',ap:2,energy:1}];
 const args={hand,availableEnergy:2,freeSlots:[{line:'front',slot:0}],raidBases:[]};
 assert.deepEqual(mstRoxyEventPlayOptions({...args,hasRoxy:false}),[]);
 const choices=mstRoxyEventPlayOptions({...args,hasRoxy:true});
 assert.equal(choices.length,1);assert.equal(choices[0].uid,'a');assert.equal(choices[0].ready,false);
});

test('MST-1-031 and 062 discounts persist across nonmatching plays',()=>{
 const x={kind:'nextEventLe3'},miss={type:'character',energy:1,ap:1};
 assert.deepEqual(mstDiscountAp(x,miss),{ap:1,remaining:x});
 assert.deepEqual(mstDiscountAp(x,{type:'event',energy:3,ap:1}),{ap:0,remaining:null});
 const y={kind:'nextCharacterGen2'};
 assert.equal(mstDiscountAp(y,{type:'character',gen:1,ap:1}).remaining,y);
 assert.equal(mstDiscountAp(y,{type:'character',gen:2,ap:1}).ap,0);
});
test('MST-1-026 restricts natural front deployment and non-own moves',()=>{
 assert.equal(mstRudeusMovementAllowed({destination:'front'}),false);
 assert.equal(mstRudeusMovementAllowed({destination:'energy'}),true);
 assert.equal(mstRudeusMovementAllowed({destination:'front',fromLine:'energy',ownEffect:false}),false);
 assert.equal(mstRudeusMovementAllowed({destination:'front',fromLine:'energy',ownEffect:true}),true);
});
test('MST-1-035 makes each chosen qualifying name draw exactly once',()=>{
 assert.equal(mstWarriorDrawCount(['ルーデウス','エリス'],['エリス']),1);
 assert.throws(()=>mstWarriorDrawCount(['エリス'],['エリス','エリス']),/無效/);
});
