import test from 'node:test';
import assert from 'node:assert/strict';
import {kaiselOptions,resolveKaisel,isSelectableByEnemyEffect,canBlock,belCanActivate,resolveBel,resolveKanaEntry,chaeCanDeployFromRecovery,resolveChaeRecovery} from '../dist/solo-rules.mjs';
const base=()=>({turn:4,active:0,field:[],hand:[[],[]],outside:[[],[]],deck:[[],[]],energy:[4,0],once:{}});
const character=(uid,id,extra={})=>({uid,id,owner:0,type:'character',ready:true,printedBp:2000,bp:2000,traits:[],...extra});
test('Q2031/2033 Kaiser: uses PRINTED BP and shares each selected mode between all copies',()=>{
 const s=base(),a=character('att','other',{attacking:true,traits:['影之軍團'],bp:7000}),k1=character('k1','SLG-1-029'),k2=character('k2','SLG-1-029');
 s.field.push(a,k1,k2);assert.deepEqual(kaiselOptions(s,'k1','att'),['noHighBpBlock','untargetable']);
 resolveKaisel(s,'k1','att','noHighBpBlock');assert.equal(k1.ready,false);
 assert.deepEqual(kaiselOptions(s,'k2','att'),['untargetable']);
 assert.throws(()=>resolveKaisel(s,'k2','att','noHighBpBlock'));
 resolveKaisel(s,'k2','att','untargetable');
 assert.equal(isSelectableByEnemyEffect(s,'att'),false);
 s.turn=5;assert.deepEqual(kaiselOptions(s,'k1','att'),[]);
 k1.ready=true;assert.equal(kaiselOptions(s,'k1','att').length,2);
});
test('Kaiser illegality and blocker prohibition expire after turn',()=>{
 const s=base(),a=character('a','x',{attacking:true,traits:['影之軍團']}),k=character('k','SLG-1-029'),d=character('d','enemy',{owner:1,bp:4000,printedBp:4000});s.field.push(a,k,d);
 resolveKaisel(s,'k','a','noHighBpBlock');assert.equal(canBlock(s,'a','d'),false);
 s.turn++;assert.equal(canBlock(s,'a','d'),true);
 a.printedBp=2500;k.ready=true;assert.deepEqual(kaiselOptions(s,'k','a'),[]);
});
test('Q2037/Q2071 Bel requires 4 REST shadow-army characters (not fields), discards once and shares counter',()=>{
 const s=base(),b=character('b','SLG-1-033',{attacking:true,ready:false,printedBp:4000}),b2=character('b2','SLG-1-033',{attacking:true,ready:false,printedBp:4000});
 s.field.push(b,b2);for(let i=0;i<4;i++)s.field.push(character('x'+i,'x',{ready:false,traits:['影之軍團'],printedBp:3000,bp:5000}));
 s.field.push({uid:'field',type:'field',owner:0,traits:['影之軍團'],ready:false,printedBp:0});
 s.hand[0].push({uid:'h'});assert.equal(belCanActivate(s,'b'),true);
 assert.throws(()=>resolveBel(s,'b','invalid'));
 resolveBel(s,'b','h');assert.equal(b.ready,true);assert.equal(s.hand[0].length,0);assert.equal(s.outside[0][0].uid,'h');
 assert.equal(belCanActivate(s,'b2'),false);
 s.turn++;s.hand[0].push({uid:'j'});s.field.splice(2,1);assert.equal(belCanActivate(s,'b2'),false);
});
test('Q2061 Kana triggers with DFN threshold once per shared turn, not on failed condition',()=>{
 const s=base(),c=character('k','SLG-1-067',{ready:false,traits:['DFN']}),d=character('d','SLG-1-067',{ready:false,traits:['DFN']});s.field.push(c,d);
 s.deck[0].push({uid:'draw1'},{uid:'draw2'});
 assert.equal(resolveKanaEntry(s,'k'),false);
 s.field.push(character('third','x',{traits:['DFN']}));
 assert.equal(resolveKanaEntry(s,'k'),true);
 assert.equal(c.ready,true);assert.equal(c.buffs[0].bp,1000);assert.equal(s.hand[0][0].uid,'draw1');
 assert.equal(resolveKanaEntry(s,'d'),false);assert.equal(s.deck[0].length,1);
 s.turn++;assert.equal(resolveKanaEntry(s,'d'),true);
});
test('Chae requires own-effect recovery, energy and empty target; Sung Jinwoo recovery deploys ACTIVE',()=>{
 const s=base(),c=character('chae','SLG-1-011',{fromOutsideByOwnEffect:true});s.hand[0].push(c);
 assert.equal(chaeCanDeployFromRecovery(s,'chae','水篠旬'),true);
 s.deck[0].push({uid:'top'});resolveChaeRecovery(s,'chae',0,{sourceName:'水篠旬',deploy:true,mill:true});
 assert.equal(s.field[0].ready,true);assert.equal(s.outside[0][0].uid,'top');
 assert.equal(s.hand[0].length,0);
 const t=base(),x=character('x','SLG-1-011',{fromOutsideByOwnEffect:true});t.hand[0].push(x);t.energy[0]=3;
 assert.equal(chaeCanDeployFromRecovery(t,'x','水篠旬'),false);
 assert.throws(()=>resolveChaeRecovery(t,'x',0,{sourceName:'水篠旬',deploy:true}));
 t.energy[0]=4;t.field.push(character('occupied','x',{slot:0}));
 assert.throws(()=>resolveChaeRecovery(t,'x',0,{sourceName:'',deploy:true}));
});
