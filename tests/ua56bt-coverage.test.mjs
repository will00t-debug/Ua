import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {TTG_PENDING_CARDS} from '../dist/ttg-pending.mjs';
import {TTG_IMPLEMENTED_HAND_EVENTS} from '../dist/ttg-event-resolver.mjs';
import {TTG_IMPLEMENTED_EVENT_TRIGGERS} from '../dist/ttg-triggers.mjs';

const PENDING_ISOLATED=new Set(['TTG-1-002','TTG-1-006','TTG-1-049','TTG-1-059','TTG-1-063','TTG-1-065','TTG-1-071']);
const ENERGY_PASSIVES=new Set(['TTG-1-019','TTG-1-033','TTG-1-066']);
const lines=readFileSync(new URL('../data/ua56bt-audit.csv',import.meta.url),'utf8').trim().split(/\r?\n/);
const rows=lines.slice(1).map(line=>{
 const [number,status,automation,url]=line.split(',');
 return {number,status,automation,url};
});

test('all 81 official UA56BT construction-card numbers have one audit row',()=>{
 assert.equal(rows.length,81);
 assert.equal(new Set(rows.map(r=>r.number)).size,81);
 for(let n=1;n<=81;n++)assert.equal(rows[n-1].number,'UA56BT/TTG-1-'+String(n).padStart(3,'0'));
});
test('audit cannot claim unrecorded card metadata or unsupported automation',()=>{
 const known=new Set(UA56BT_VERIFIED.map(c=>c.number));
 assert.equal(known.size,UA56BT_VERIFIED.length);
 for(const row of rows){
  assert.equal(row.status,known.has(row.number)?'recorded_needs_final_verification':'identified_metadata_incomplete',row.number);
  assert.equal(row.automation,(TTG_IMPLEMENTED_HAND_EVENTS.some(id=>row.number.endsWith('/'+id))||PENDING_ISOLATED.has(row.number.slice('UA56BT/'.length))||ENERGY_PASSIVES.has(row.number.slice('UA56BT/'.length)))?'isolated_effect_only':'not_implemented',row.number);
  assert.ok(row.url.includes(row.number.replace('/','%2F')));
 }
 assert.equal(known.size,81);
 assert.deepEqual([...TTG_IMPLEMENTED_HAND_EVENTS].sort(),[...TTG_IMPLEMENTED_EVENT_TRIGGERS].sort(),'normal and life trigger implementations cover matching event set');
 assert.equal(rows.filter(r=>r.automation==='isolated_effect_only').length,16);
 assert.equal(rows.filter(r=>r.status==='identified_metadata_incomplete').length,0);
 assert.equal(TTG_PENDING_CARDS.length,0);
 for(const c of TTG_PENDING_CARDS){assert.ok(!known.has(c.number));assert.equal(c.energy,null);assert.equal(c.ap,null);assert.equal(c.bp,null);assert.equal(c.gen,null);assert.equal(c.auto,false);}
});
test('all recorded cards explicitly block automated play until engine verification',()=>{
 for(const c of UA56BT_VERIFIED){
  assert.equal(c.auto,false,c.number);
  assert.ok(c.effect,c.number);
  assert.ok(c.source.includes(encodeURIComponent(c.number)),c.number);
 }
});
