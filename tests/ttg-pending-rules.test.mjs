import test from 'node:test';
import assert from 'node:assert/strict';
import {ttgKittan006Bp,resolveTtgNia059,resolveTtgButa063,resolveTtgMainEndRetire,resolveTtgYoko065Step,resolveTtgPendingEndTurn} from '../dist/ttg-pending-rules.mjs';
import {ttgEnergyTotal} from '../dist/ttg-rules.mjs';
const p=()=>({front:Array(4).fill(null),energy:Array(4).fill(null),outside:[],hand:[]});
const state=()=>({active:0,turn:12,phase:'main',players:[p(),p()]});
const card=(uid,cardId,nameJa,bp=1500,other={})=>({uid,cardId,nameJa,bp,gen:1,ready:true,...other});
test('TTG-1-006 adds exactly 1000 BP only on its own turn with 6+ energy',()=>{
 const c=card('k','TTG-1-006','キタン',2000);
 assert.equal(ttgKittan006Bp(c,{ownerTurn:false,energy:7}),2000);
 assert.equal(ttgKittan006Bp(c,{ownerTurn:true,energy:5}),2000);
 assert.equal(ttgKittan006Bp(c,{ownerTurn:true,energy:6}),3000);
 assert.throws(()=>ttgKittan006Bp(c,{ownerTurn:true}));
 assert.equal(c.bp,2000,'no mutation');
});
test('TTG-1-059 must pay REST, target own Simon or Simon RAID and apply turn BP',()=>{
 const s=state(),nia=card('n','TTG-1-059','ニア',1000);
 s.players[0].energy[0]=nia;
 s.players[0].front[0]=card('raid','TTG-1-074','グレンラガン',4000,{
   stack:[card('s','TTG-1-009','シモン')]
 });
 s.players[1].front[0]=card('op','TTG-1-009','シモン');
 assert.throws(()=>resolveTtgNia059(s,{player:0,uid:'n',targetUid:'op'}),'opponent cannot be buffed');
 assert.equal(s.players[0].energy[0].ready,true,'illegal choice does not pay cost');
 const x=resolveTtgNia059(s,{player:0,uid:'n',targetUid:'raid'});
 assert.equal(x.players[0].energy[0].ready,false);
 assert.equal(x.players[0].front[0].currentBp,5000);
 assert.deepEqual(x.players[0].front[0].buffs,[{sourceUid:'n',turn:12,bp:1000,until:'endTurn'}]);
 assert.equal(s.players[0].front[0].currentBp,undefined);
 assert.throws(()=>resolveTtgNia059(x,{player:0,uid:'n',targetUid:'raid'}),'cannot REST twice');
});
test('TTG-1-063 gains energy before end-main retirement, keeps normal action timing',()=>{
 const s=state();s.players[0].energy[1]=card('b','TTG-1-063','ブータ',1000);
 assert.equal(ttgEnergyTotal([{...s.players[0].energy[1],line:'energy'}]),1);
 const x=resolveTtgButa063(s,{player:0,uid:'b'});
 assert.equal(x.players[0].energy[1].ready,false);
 assert.equal(ttgEnergyTotal([{...x.players[0].energy[1],line:'energy'}]),2);
 assert.equal(s.players[0].energy[1].energyBonus,undefined);
 assert.throws(()=>resolveTtgButa063(x,{player:0,uid:'b'}));
 const y=resolveTtgMainEndRetire(x);
 assert.equal(y.players[0].energy[1],null);
 assert.deepEqual(y.players[0].outside.map(c=>c.uid),['b']);
 assert.equal(y.players[0].outside[0].energyBonus,0);
 assert.equal(x.players[0].energy[1].uid,'b','original preserved');
});
test('TTG-1-065 STEP front to empty energy preserves REST and cannot overwrite a unit',()=>{
 const s=state();s.phase='move';
 s.players[0].front[2]=card('y','TTG-1-065','ヨーコ',1500,{ready:false});
 s.players[0].energy[1]=card('occupied','TTG-1-001','ヴィラル',1000);
 assert.throws(()=>resolveTtgYoko065Step(s,{player:0,uid:'y',toSlot:1}));
 assert.throws(()=>resolveTtgYoko065Step(s,{player:0,uid:'y',toSlot:6}));
 const t=resolveTtgYoko065Step(s,{player:0,uid:'y',toSlot:0});
 assert.equal(t.players[0].front[2],null);
 assert.equal(t.players[0].energy[0].uid,'y');
 assert.equal(t.players[0].energy[0].ready,false);
 assert.equal(s.players[0].front[2].uid,'y');
});

test('Nia BP+1000 is removed at end of turn without removing unrelated buffs',()=>{
 const st=state();
 st.players[0].energy[0]=card('n','TTG-1-059','ニア');
 st.players[0].front[0]=card('s','TTG-1-009','シモン',1500,{
  buffs:[{sourceUid:'old',turn:10,bp:500,until:'nextTurn'}],currentBp:2000
 });
 const buffed=resolveTtgNia059(st,{player:0,uid:'n',targetUid:'s'});
 assert.equal(buffed.players[0].front[0].currentBp,3000);
 assert.equal(buffed.players[0].front[0].buffs.length,2);
 const ended=resolveTtgPendingEndTurn(buffed);
 assert.equal(ended.players[0].front[0].currentBp,2000);
 assert.deepEqual(ended.players[0].front[0].buffs,[{sourceUid:'old',turn:10,bp:500,until:'nextTurn'}]);
 assert.equal(buffed.players[0].front[0].currentBp,3000,'input state remains immutable');
});
