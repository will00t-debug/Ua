// EX06BT and the point cards share one catalog. Set 1's released pack stays 109.
// Pending sentences do not enter either battle pack. MHA-3 numbers stay unpublished.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {MHA2_PROGRAMS_001_036} from '../dist/universal-v2/mha/programs-mha2-001-036.mjs';
import {MHA2_PROGRAMS_037_073} from '../dist/universal-v2/mha/programs-2-037-073.mjs';
import {MHA2_REQUESTS_037_073} from '../dist/universal-v2/mha/requests-2-037-073.mjs';
import {UAPR_MHA_PROGRAMS} from '../dist/universal-v2/mha/programs-uapr.mjs';
import {createMhaPointPack} from '../dist/universal-v2/mha-point-pack.mjs';
import {UA05NC_MHA3_PRODUCT,UA05NC_MHA3_AP} from '../dist/mha/ua05nc-product.mjs';
import {getTitle} from '../dist/title-registry.mjs';

const IDS=Array.from({length:73},(_,i)=>'MHA-2-'+String(i+1).padStart(3,'0'));

test('set 2 is 73 catalog cards, 40 ready and 33 pending, and set 1 stays open',()=>{
 const editor=mhaEditorCards();
 const set1=createMhaV2Pack();
 const set2=createMha2Pack();
 const byId=new Map(editor.map(card=>[card.id,card]));
 assert.equal(getTitle('mha').playable,true);
 assert.equal(set1.version,'mha-ua10-ready-109');
 assert.equal(Object.keys(set1.cards).length,109);
 assert.equal(set2.version,'mha2-ex06-ready-40');
 assert.equal(Object.keys(set2.cards).length,40);
 assert.deepEqual(IDS.filter(id=>!byId.has(id)),[]);
 assert.equal(editor.filter(card=>card.id.startsWith('MHA-1-')).length,109);
 assert.equal(editor.filter(card=>card.id.startsWith('MHA-2-')).length,73);
 assert.equal(editor.filter(card=>card.id.startsWith('MHA-P-')).length,3);
 const pending=IDS.filter(id=>!set2.cards[id]);
 const ready=IDS.filter(id=>set2.cards[id]);
 assert.equal(ready.length,40);
 assert.equal(pending.length,33);
 assert.equal(Object.keys(MHA2_PROGRAMS_001_036).filter(id=>MHA2_PROGRAMS_001_036[id].ready!==true).length,12);
 assert.equal(Object.keys(MHA2_PROGRAMS_037_073).length,16);
 assert.equal(Object.keys(MHA2_REQUESTS_037_073).length,21);
 for(const id of pending){
  assert.equal(set1.cards[id],undefined,id);
  assert.equal(set2.cards[id],undefined,id);
  assert.equal(byId.get(id).battleReady,false,id);
  assert.equal(byId.get(id).playable,false,id);
 }
 for(const id of ready)assert.equal(set1.cards[id],undefined,id);
 for(const id of ['MHA-P-001','MHA-P-002','MHA-P-003']){
  assert.equal(byId.get(id).playable,false);
  assert.equal(byId.get(id).battleReady,false);
  assert.equal(set1.cards[id],undefined);
  assert.equal(set2.cards[id],undefined);
 }
 const point=createMhaPointPack();
 assert.equal(point.version,'mha-uapr-ready-3');
 assert.deepEqual(Object.keys(point.cards),['MHA-P-001','MHA-P-002','MHA-P-003']);
 assert.equal(Object.values(UAPR_MHA_PROGRAMS).every(row=>row.ready===true),true);
 assert.equal(UA05NC_MHA3_PRODUCT.cards.length,0);
 assert.equal(UA05NC_MHA3_AP.registered,false);
 assert.equal(UA05NC_MHA3_AP.number,null);
 assert.equal(editor.some(card=>String(card.number).startsWith('UA05NC/')),false);
});
