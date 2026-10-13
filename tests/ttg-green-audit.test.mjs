import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TTG_CORE_SMOKE_IDS} from '../dist/ttg-core-match.mjs';
import {TTG_GREEN_ENTRY_IDS} from '../dist/ttg-green-entry.mjs';
import {TTG_GREEN_EVENT_IDS} from '../dist/ttg-green-events.mjs';
const file=readFileSync(new URL('../data/ttg-green-audit.csv',import.meta.url),'utf8').trim().split('\n');
const rows=file.slice(1).map(line=>{
 const m=line.match(/^([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),"(.*)"$/);
 assert.ok(m,'malformed green audit row: '+line);
 return {id:m[1],color:m[2],metadata:m[3],core:m[4],isolated:m[5],playable:m[6],gap:m[7]};
});
test('UA56BT green 001-041 audit never counts isolated reducers as full website automation',()=>{
 assert.equal(rows.length,41);
 assert.equal(new Set(rows.map(r=>r.id)).size,41);
 for(let i=1;i<=41;i++){
  const id='TTG-1-'+String(i).padStart(3,'0');
  const row=rows.find(r=>r.id===id);
  assert.ok(row,id);assert.equal(TTG_BY_ID[id].color,'green');
  assert.equal(row.color,'green');assert.equal(row.metadata,'yes');
  assert.equal(row.playable,'no');assert.equal(TTG_BY_ID[id].auto,false);
  assert.ok(row.gap.length>20);
  assert.equal(row.core==='yes',TTG_CORE_SMOKE_IDS.includes(id));
 }
 assert.equal(rows.filter(r=>r.core==='yes').length,41);
 assert.equal(rows.filter(r=>r.core==='no').length,0);
 assert.equal(rows.filter(r=>r.isolated==='yes'&&r.core==='no').length,0);
});
test('all isolated green on-entry/event IDs have true printed green metadata',()=>{
 assert.equal(TTG_GREEN_ENTRY_IDS.length,10);
 assert.equal(TTG_GREEN_EVENT_IDS.length,4);
 for(const id of [...TTG_GREEN_ENTRY_IDS,...TTG_GREEN_EVENT_IDS])
  assert.equal(TTG_BY_ID[id].color,'green',id);
});
