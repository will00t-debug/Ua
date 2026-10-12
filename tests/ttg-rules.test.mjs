import test from 'node:test';
import assert from 'node:assert/strict';
import {ttgEnergyTotal,resolveViralEnergy,orderedNiaOptions,canActivateWithMandatoryTarget,upgradeRaidTopToFacedown,inspectFacedownUnder} from '../dist/ttg-rules.mjs';

test('Q2264/Q2265 doubling applies after all energy increases and stacks multiplicatively',()=>{
 const field=[{uid:'a',line:'energy',gen:2,energyBonus:1},{uid:'b',line:'energy',gen:2},{uid:'c',line:'front',gen:1}];
 assert.equal(ttgEnergyTotal(field),5);
 assert.equal(ttgEnergyTotal(field,{doublings:1}),10);
 assert.equal(ttgEnergyTotal(field,{doublings:2}),20);
 assert.equal(ttgEnergyTotal(field,{doublings:2,frontGenerates:true}),24);
 assert.equal(ttgEnergyTotal([{...field[0],energyBonus:3}],{doublings:2}),20);
});
test('Q2392 viral passes threshold 8 immediately after first front-line generation',()=>{
 const field=[{uid:'v',line:'front',gen:1},{uid:'e0',line:'energy',gen:4},{uid:'e1',line:'energy',gen:3},{uid:'other',line:'front',gen:2}];
 const value=resolveViralEnergy(field,'v');
 assert.equal(value.before,7);
 assert.equal(value.frontGenerates,true);
 assert.equal(value.after,10);
 assert.equal(field[0].frontGenerates,undefined,'must not mutate original state');
 const short=resolveViralEnergy([{uid:'v',line:'front',gen:1},{uid:'a',line:'energy',gen:6}], 'v');
 assert.equal(short.after,7);assert.equal(short.frontGenerates,false);
});
test('Q2272 mandatory Simon target is checked before paying an ability cost',()=>{
 assert.equal(canActivateWithMandatoryTarget([]),false);
 assert.equal(canActivateWithMandatoryTarget([{name:'シモン'}]),true);
});
test('Q2293/Q2294 Nia cannot repeat the choice, resolves in printed order',()=>{
 assert.deepEqual(orderedNiaOptions(['deploySimon','recoverSimon'],{deckCount:20}),['recoverSimon','deploySimon']);
 assert.deepEqual(orderedNiaOptions(['deploySimon'],{deckCount:21}),['deploySimon']);
 assert.throws(()=>orderedNiaOptions(['recoverSimon','recoverSimon'],{deckCount:20}));
 assert.throws(()=>orderedNiaOptions(['recoverSimon','deploySimon'],{deckCount:21}));
});
test('Q2393/Q2394 chained RAID changes prior top to face-down without losing cards',()=>{
 const simon={uid:'s',cardId:'TTG-1-010',name:'シモン',ready:false};
 const first={uid:'g',cardId:'TTG-1-028',name:'グレンラガン',ready:false,stack:[simon],under:[],raidedTurn:3};
 const arch=upgradeRaidTopToFacedown(first,{uid:'a',cardId:'TTG-1-027',name:'アークグレンラガン'},{
  previousName:'グレンラガン',allowedBases:['シモン','ヴィラル'],turn:4
 });
 assert.equal(arch.ready,true);assert.deepEqual([arch.uid,arch.stack[0].uid,...arch.under.map(x=>x.uid)],['a','s','g']);
 assert.equal(arch.under[0].faceDown,true);
 const galaxy=upgradeRaidTopToFacedown(arch,{uid:'u',cardId:'TTG-1-031',name:'超銀河グレンラガン'},{
  previousName:'アークグレンラガン',allowedBases:['シモン','ヴィラル'],turn:5
 });
 assert.deepEqual([galaxy.uid,galaxy.stack[0].uid,...galaxy.under.map(x=>x.uid)],['u','s','g','a']);
 assert.deepEqual(inspectFacedownUnder(galaxy,{viewer:0,owner:0}).map(x=>x.uid),['g','a']);
 assert.deepEqual(inspectFacedownUnder(galaxy,{viewer:1,owner:0}),[{faceDown:true},{faceDown:true}]);
 assert.deepEqual(first.under,[],'old input remains unchanged');
});
test('Q2395 ultimate raid only from preexisting super galaxy RAID',()=>{
 const s={uid:'s',cardId:'TTG-1-010',name:'シモン'};
 const current={uid:'u',cardId:'TTG-1-031',name:'超銀河グレンラガン',stack:[s],under:[],raidedTurn:9};
 const next={uid:'t',cardId:'TTG-1-032',name:'天元突破グレンラガン'};
 assert.throws(()=>upgradeRaidTopToFacedown(current,next,{previousName:'超銀河グレンラガン',allowedBases:['シモン'],forbidRaidedThisTurn:true,turn:9}));
 const x=upgradeRaidTopToFacedown(current,next,{previousName:'超銀河グレンラガン',allowedBases:['シモン'],forbidRaidedThisTurn:true,turn:10});
 assert.equal(x.ready,true);assert.equal(x.under[0].cardId,'TTG-1-031');
 assert.throws(()=>upgradeRaidTopToFacedown(current,next,{previousName:'グレンラガン',allowedBases:['シモン'],turn:10}));
 assert.throws(()=>upgradeRaidTopToFacedown(current,next,{previousName:'超銀河グレンラガン',allowedBases:['カミナ'],turn:10}));
});
