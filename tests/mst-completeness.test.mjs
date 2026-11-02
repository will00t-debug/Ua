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
test('68 preliminary full records and 12 partial records are explicitly distinguished',()=>{
 const complete=UA54BT_VERIFIED.filter(c=>c.verified);
 const incomplete=UA54BT_VERIFIED.filter(c=>!c.verified);
 assert.equal(complete.length,68);
 assert.equal(incomplete.length,12);
 for(const c of complete){
  for(const field of ['nameJa','color','energy','ap','bp','gen','type','rarity','effect'])assert.notEqual(c[field],null,c.number+' '+field);
  assert.ok(Number.isInteger(c.ap),c.number);
 }
 const restingGen={
  'MST-1-010':2,'MST-1-011':1,'MST-1-013':1,'MST-1-015':1,'MST-1-019':2,
  'MST-1-023':1,'MST-1-044':2,'MST-1-045':1,'MST-1-061':1,'MST-1-064':2,
  'MST-1-078':null,'MST-1-079':null
 };
 for(const c of incomplete){
  assert.equal(c.energy,null,c.number);
  assert.equal(c.ap,null,c.number);
  assert.equal(c.bp,null,c.number);
  assert.equal(c.gen,restingGen[c.id],c.number+' resting generate');
  if(c.id==='MST-1-045')assert.equal(c.genMark,'+');
 }
});
test('all 80 cards remain unplayable until complete effect-engine tests pass',()=>{
 assert.equal(UA54BT_VERIFIED.filter(c=>c.auto===true).length,0);
 for(const c of UA54BT_VERIFIED)assert.ok(c.source.includes(c.id),c.id);
});
