import test from 'node:test';
import assert from 'node:assert/strict';
import {planSimultaneousLifeReveal} from '../dist/universal-v2/life-reveal-batch.mjs';

const life=[{uid:'0-11',cardId:'A',trigger:'get'},
 {uid:'0-12',cardId:'B',trigger:'final'},
 {uid:'0-13',cardId:'C',trigger:null},
 {uid:'0-14',cardId:'D',trigger:'special'}];
test('Q73 two LIFE are reserved in one snapshot, not sequentially revealed',()=>{
 const before=structuredClone(life);
 const batch=planSimultaneousLifeReveal(life,2);
 assert.equal(batch.count,2);
 assert.deepEqual(batch.revealed.map(x=>x.uid),['0-11','0-12']);
 assert.deepEqual(batch.unrevealed.map(x=>x.uid),['0-13','0-14']);
 assert.deepEqual(life,before,'planning neither mutates LIFE nor resolves triggers');
 assert.ok(Object.isFrozen(batch));
 assert.ok(Object.isFrozen(batch.revealed));
});
test('Q72 low-life DAMAGE2 cannot reveal beyond the current physical LIFE',()=>{
 const single=planSimultaneousLifeReveal([life[1]],2);
 assert.equal(single.count,1);
 assert.equal(single.revealed[0].trigger,'final');
 assert.equal(single.unrevealed.length,0);
 // This planner does not execute FINAL, decide victory or reveal new cards.
 assert.equal(planSimultaneousLifeReveal([],2).count,0);
});
test('Q35/Q36 simultaneous FINAL candidates are retained, not auto-resolved',()=>{
 const batch=planSimultaneousLifeReveal([life[1],{...life[3],trigger:'final'}],2);
 assert.deepEqual(batch.revealed.map(x=>x.trigger),['final','final']);
 assert.equal(batch.count,2);
});
test('no forged, duplicate or non-physical UID / invalid damage input',()=>{
 for(const [cards,count] of [
  [life,0],[life,-1],[life,1.2],[life,NaN],
  [[life[0],life[0]],2],
  [[{uid:'',cardId:'A'}],1],
  [[{uid:'0-2',cardId:''}],1],
  ['hidden',2]
 ])assert.throws(()=>planSimultaneousLifeReveal(cards,count),/Invalid private LIFE/);
});
