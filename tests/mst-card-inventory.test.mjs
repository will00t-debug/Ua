import test from 'node:test';
import assert from 'node:assert/strict';
import {UA54BT_VERIFIED,UA54BT_DATA_STATUS} from '../dist/mushoku-tensei.mjs';
test('exactly 80 canonical MST regular identities, no AP or alternate-art records',()=>{
 assert.equal(UA54BT_VERIFIED.length,80);
 assert.equal(new Set(UA54BT_VERIFIED.map(c=>c.number)).size,80);
 for(let n=1;n<=80;n++)assert.equal(UA54BT_VERIFIED[n-1].number,'UA54BT/MST-1-'+String(n).padStart(3,'0'));
 assert.ok(UA54BT_VERIFIED.every(c=>!c.number.includes('AP')&&!c.number.includes('_p')));
 assert.equal(UA54BT_DATA_STATUS.apArtExcluded,true);
});
test('no unverified card can be advertised as fully automatic',()=>{
 assert.equal(UA54BT_VERIFIED.filter(c=>c.auto).length,0);
 const pending=UA54BT_VERIFIED.filter(c=>!c.verified);
 assert.ok(pending.length>0);
 for(const c of pending)assert.equal(c.energy,null);
});
test('confirmed card data preserve printed AP and raid constraints',()=>{
 const eris=UA54BT_VERIFIED.find(c=>c.id==='MST-1-007');
 const raid=UA54BT_VERIFIED.find(c=>c.id==='MST-1-009');
 assert.equal(eris.ap,1);assert.equal(eris.energy,1);
 assert.equal(raid.ap,1);assert.equal(raid.trigger,'raid');
});
