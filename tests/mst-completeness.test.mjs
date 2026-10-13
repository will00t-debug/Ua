import test from 'node:test';
import assert from 'node:assert/strict';
import {UA54BT_VERIFIED} from '../dist/mushoku-tensei.mjs';

test('all 80 canonical UA54BT regular card names and printed rarities are present',()=>{
 assert.equal(UA54BT_VERIFIED.length,80);
 assert.equal(new Set(UA54BT_VERIFIED.map(c=>c.identity)).size,80);
 assert.equal(UA54BT_VERIFIED.filter(c=>c.name.startsWith('待核對卡片')).length,0);
 const rarities=UA54BT_VERIFIED.reduce((x,c)=>(x[c.rarity]=(x[c.rarity]||0)+1,x),{});
 assert.deepEqual(rarities,{C:28,U:28,R:12,SR:12});
});
test('72 preliminary complete records and 8 partial records are explicitly distinguished',()=>{
 const complete=UA54BT_VERIFIED.filter(c=>c.verified);
 const incomplete=UA54BT_VERIFIED.filter(c=>!c.verified);
 assert.equal(complete.length,72);
 assert.equal(incomplete.length,8);
 for(const c of complete){
  for(const field of ['nameJa','color','energy','ap','bp','gen','type','rarity','effect'])assert.notEqual(c[field],null,c.number+' '+field);
  assert.ok(Number.isInteger(c.ap),c.number);
 }
 for(const c of incomplete){
  assert.ok(['energy','ap','bp','gen'].some(field=>c[field]===null),c.number+' incomplete records must retain unverified fields');
 }
});
test('all 80 cards remain unplayable until complete effect-engine tests pass',()=>{
 assert.equal(UA54BT_VERIFIED.filter(c=>c.auto===true).length,0);
 for(const c of UA54BT_VERIFIED)assert.ok(c.source.includes(c.id),c.id);
});

test('013 045 079 preserve printed AP costs and 079 FINAL trigger',()=>{
 const byId=Object.fromEntries(UA54BT_VERIFIED.map(c=>[c.id,c]));
 assert.deepEqual([byId['MST-1-013'].energy,byId['MST-1-013'].ap,byId['MST-1-013'].bp,byId['MST-1-013'].gen],[1,1,2000,1]);
 assert.deepEqual([byId['MST-1-045'].energy,byId['MST-1-045'].ap,byId['MST-1-045'].bp,byId['MST-1-045'].gen],[0,1,1000,1]);
 assert.deepEqual([byId['MST-1-079'].energy,byId['MST-1-079'].ap,byId['MST-1-079'].bp,byId['MST-1-079'].gen],[3,1,0,0]);
 assert.equal(byId['MST-1-079'].trigger,'final');
 for(const id of ['MST-1-013','MST-1-045','MST-1-079']){
  assert.equal(byId[id].verified,true);
  assert.equal(byId[id].auto,false);
  assert.ok(byId[id].effectJa);
 }
});

test('061 source-crosschecked preliminary AP and no printed Trigger, still unplayable',()=>{
 const c=UA54BT_VERIFIED.find(c=>c.id==='MST-1-061');
 assert.equal(c.energy,1);
 assert.equal(c.ap,1);
 assert.equal(c.bp,2000);
 assert.equal(c.gen,1);
 assert.equal(c.trigger,null);
 assert.equal(c.verified,true);
 assert.equal(c.auto,false);
 assert.match(c.sourceTranslation,/rugiacreation\.com/);
 assert.match(c.statEvidence,/ebay\.com/);
});
