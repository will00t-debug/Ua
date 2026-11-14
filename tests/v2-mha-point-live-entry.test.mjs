import test from 'node:test';
import assert from 'node:assert/strict';
import {officialV2Pack,v2UnsupportedIds} from '../dist/universal-v2/official-entry.mjs';
import {createMhaPointPack} from '../dist/universal-v2/mha-point-pack.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createMha2Pack} from '../dist/universal-v2/mha2-pack.mjs';
import {createMha3Pack} from '../dist/universal-v2/mha3-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {editorV2Status,normalizeEditorCounts} from '../dist/v2-editor-compat.mjs';

const IDS=['MHA-P-001','MHA-P-002','MHA-P-003'];
const live=officialV2Pack('mha');

test('all three point-exchange cards enter shared live MHA V2 pack without affecting other sets',()=>{
 const set1=createMhaV2Pack(),set2=createMha2Pack(),points=createMhaPointPack(),book=createMha3Pack();
 assert.equal(live.version,'mha-live-109-73-3-5');
 assert.equal(Object.keys(set1.cards).length,109);
 assert.equal(Object.keys(set2.cards).length,73);
 assert.equal(Object.keys(points.cards).length,3);
 assert.equal(Object.keys(book.cards).length,5);
 assert.equal(Object.keys(live.cards).length,190);
 for(const id of IDS){
  assert.ok(live.cards[id],id+' absent in production V2 pack');
  assert.equal(live.cards[id].id,id);
  assert.deepEqual(live.cards[id],points.cards[id],id+' program changed during integration');
  assert.equal(set1.cards[id],undefined);
  assert.equal(set2.cards[id],undefined);
 }
 assert.equal(live.cards['MHA-3-009'],undefined,'pending book must stay out');
});

test('editor marks all point cards as registered V2 cards and counts accept official UAPR numbers',()=>{
 const editor=mhaEditorCards();
 assert.equal(editor.length,191);
 const status=editorV2Status('mha',{});
 assert.equal(status.registered,190);
 for(const id of IDS){
  const printed=editor.find(card=>card.id===id);
  assert.ok(printed);
  assert.equal(printed.number,'UAPR/'+id);
  assert.equal(printed.deckLegal,true);
  assert.ok(status.supported.has(id),id+' appears as V2 尚未移植');
  assert.deepEqual(normalizeEditorCounts('mha',{['UAPR/'+id]:1}),{[id]:1});
  assert.deepEqual(v2UnsupportedIds('mha',{[id]:1}),[]);
 }
 assert.equal(status.supported.has('MHA-3-009'),false);
});

test('no duplicate card IDs and current play profiles are preserved',()=>{
 assert.equal(live.cards['MHA-P-001'].impactNull,true);
 assert.equal(live.cards['MHA-P-002'].emptyOwnFieldHandEnergyDiscount,2);
 assert.equal(live.cards['MHA-P-003'].impactNull,true);
 const ids=Object.keys(live.cards);
 assert.equal(new Set(ids).size,ids.length);
});
