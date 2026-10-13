import test from 'node:test';
import assert from 'node:assert/strict';
import {ttgKittan006Bp,resolveTtgNia059,resolveTtgButa063,resolveTtgMainEndRetire,resolveTtgYoko065Step,resolveTtgPendingEndTurn,eligibleTtgViral002Targets,resolveTtgViral002,resolveTtgTemporaryEnergyEndTurn,eligibleTtg049ReturnTargets,resolveTtg049Entry,eligibleTtg071AttackBuffTargets,resolveTtg071FirstAttack} from '../dist/ttg-pending-rules.mjs';
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

test('TTG-1-002 Viral rests self and different ACTIVE front ally for one temporary energy',()=>{
 const st=state();
 st.players[0].energy[0]=card('v','TTG-1-002','ヴィラル',2000);
 st.players[0].front[0]=card('f','TTG-1-006','キタン',2000);
 st.players[0].front[1]=card('r','TTG-1-009','シモン',1500,{ready:false});
 st.players[1].front[0]=card('enemy','TTG-1-006','キタン',2000);
 assert.deepEqual(eligibleTtgViral002Targets(st,{player:0,uid:'v'}),['f']);
 for(const targetUid of ['v','r','enemy','bad']){
  assert.throws(()=>resolveTtgViral002(st,{player:0,uid:'v',targetUid}));
 }
 const before=JSON.stringify(st);
 const activated=resolveTtgViral002(st,{player:0,uid:'v',targetUid:'f'});
 assert.equal(activated.players[0].energy[0].ready,false);
 assert.equal(activated.players[0].front[0].ready,false);
 assert.equal(activated.players[0].energy[0].energyBonus,1);
 assert.equal(activated.players[0].energy[0].temporaryEnergyUntilTurn,12);
 assert.equal(JSON.stringify(st),before);
 assert.throws(()=>resolveTtgViral002(activated,{player:0,uid:'v',targetUid:'f'}));
 const ended=resolveTtgTemporaryEnergyEndTurn(activated);
 assert.equal(ended.players[0].energy[0].energyBonus,0);
 assert.equal(ended.players[0].energy[0].temporaryEnergyUntilTurn,undefined);
 assert.equal(activated.players[0].energy[0].energyBonus,1);
});
test('TTG-1-049 mandatory on-entry other <=1-energy return, or self if no candidate',()=>{
 const st=state();st.players[0].front[0]=card('duo','TTG-1-049','ギミー＆ダリー');
 st.players[0].energy[0]=card('small','TTG-1-058','ニア',500,{energy:0});
 st.players[0].energy[1]=card('costly','TTG-1-056','シモン',4000,{energy:3});
 st.players[1].energy[0]=card('opponent','TTG-1-001','ヴィラル',2000,{energy:0});
 assert.deepEqual(eligibleTtg049ReturnTargets(st,{player:0,uid:'duo'}),['small']);
 assert.throws(()=>resolveTtg049Entry(st,{player:0,uid:'duo'}));
 assert.throws(()=>resolveTtg049Entry(st,{player:0,uid:'duo',targetUid:'opponent'}));
 assert.throws(()=>resolveTtg049Entry(st,{player:0,uid:'duo',targetUid:'costly'}));
 const copied=resolveTtg049Entry(st,{player:0,uid:'duo',targetUid:'small'});
 assert.equal(copied.players[0].energy[0],null);
 assert.deepEqual(copied.players[0].hand.map(x=>x.uid),['small']);
 assert.equal(copied.players[0].front[0].uid,'duo');
 assert.equal(st.players[0].energy[0].uid,'small');
 const nothing=state();nothing.players[0].front[0]=card('duo','TTG-1-049','ギミー＆ダリー');
 const returned=resolveTtg049Entry(nothing,{player:0,uid:'duo'});
 assert.equal(returned.players[0].front[0],null);
 assert.deepEqual(returned.players[0].hand.map(x=>x.uid),['duo']);
});
test('TTG-1-071 only first character attack can buff an OTHER ally by 2000',()=>{
 const st=state();st.phase='attack';st.attackingUid='king';st.characterAttacksThisTurn=1;
 st.players[0].front[0]=card('king','TTG-1-071','キングキタンDX',4000);
 st.players[0].front[1]=card('ally','TTG-1-048','キタン',3000);
 st.players[0].energy[1]=card('ally2','TTG-1-009','シモン',1500);
 st.players[1].front[0]=card('enemy','TTG-1-056','シモン',3000);
 assert.deepEqual(eligibleTtg071AttackBuffTargets(st,{player:0,uid:'king'}),['ally','ally2']);
 for(const targetUid of ['king','enemy','bad'])assert.throws(()=>resolveTtg071FirstAttack(st,{player:0,uid:'king',targetUid}));
 const result=resolveTtg071FirstAttack(st,{player:0,uid:'king',targetUid:'ally'});
 assert.equal(result.players[0].front[1].currentBp,5000);
 assert.equal(resolveTtgPendingEndTurn(result).players[0].front[1].currentBp,3000);
 assert.equal(st.players[0].front[1].currentBp,undefined);
 const skipped=resolveTtg071FirstAttack(st,{player:0,uid:'king'});
 assert.equal(skipped.players[0].front[1].currentBp,undefined);
 assert.deepEqual(eligibleTtg071AttackBuffTargets(result,{player:0,uid:'king'}),[]);
 assert.throws(()=>resolveTtg071FirstAttack(result,{player:0,uid:'king',targetUid:'ally'}));
 st.characterAttacksThisTurn=2;
 assert.deepEqual(eligibleTtg071AttackBuffTargets(st,{player:0,uid:'king'}),[]);
 assert.throws(()=>resolveTtg071FirstAttack(st,{player:0,uid:'king',targetUid:'ally'}));
});

test('TTG-1-049 resolves using printed card energy when physical card lacks cost',()=>{
 const st=state();st.players[0].front[0]=card('duo','TTG-1-049','ギミー＆ダリー');
 // Printed UA56BT/TTG-1-058 has 0 red energy requirement.
 st.players[0].energy[0]=card('nia','TTG-1-058','ニア',500);
 assert.deepEqual(eligibleTtg049ReturnTargets(st,{player:0,uid:'duo'}),['nia']);
 const next=resolveTtg049Entry(st,{player:0,uid:'duo',targetUid:'nia'});
 assert.deepEqual(next.players[0].hand.map(c=>c.uid),['nia']);
});
test('TTG-1-049 rejects incomplete candidate energy or a piled RAID return',()=>{
 const st=state();st.players[0].front[0]=card('duo','TTG-1-049','ギミー＆ダリー');
 st.players[0].energy[0]=card('unknown','TTG-1-999','未收錄');
 assert.deepEqual(eligibleTtg049ReturnTargets(st,{player:0,uid:'duo'}),[]);
 assert.throws(()=>resolveTtg049Entry(st,{player:0,uid:'duo'}),/Unverified printed energy/);
 st.players[0].energy[0]=card('pile','TTG-1-058','ニア',500,{stack:[card('base','TTG-1-052','シモン')]});
 assert.deepEqual(eligibleTtg049ReturnTargets(st,{player:0,uid:'duo'}),['pile']);
 assert.throws(()=>resolveTtg049Entry(st,{player:0,uid:'duo',targetUid:'pile'}),/raid pile/i);
});
test('official TTG-1-002 turn-once forbids repeated activation after readying and expires granted energy',()=>{
 const st=state();st.players[0].energy[0]=card('v','TTG-1-002','ヴィラル');
 st.players[0].front[0]=card('a','TTG-1-005','キタン');
 const first=resolveTtgViral002(st,{player:0,uid:'v',targetUid:'a'});
 // Another independent effect can ready both physical cards in the same turn.
 const active=structuredClone(first);
 active.players[0].energy[0].ready=true;
 active.players[0].front[0].ready=true;
 // Official print includes ターン1; the previous test incorrectly allowed reuse.
 assert.throws(()=>resolveTtgViral002(active,{player:0,uid:'v',targetUid:'a'}));
 assert.equal(active.players[0].energy[0].energyBonus,1);
 const expired=resolveTtgTemporaryEnergyEndTurn(active);
 assert.equal(expired.players[0].energy[0].energyBonus,0);
 expired.turn++;
 const next=resolveTtgViral002(expired,{player:0,uid:'v',targetUid:'a'});
 assert.equal(next.players[0].energy[0].energyBonus,1);
});
