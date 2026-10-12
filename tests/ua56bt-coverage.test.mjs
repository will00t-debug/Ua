import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {TTG_PENDING_CARDS} from '../dist/ttg-pending.mjs';

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
  assert.equal(row.automation,'not_implemented',row.number);
  assert.ok(row.url.includes(row.number.replace('/','%2F')));
 }
 assert.equal(known.size,72);
 assert.equal(rows.filter(r=>r.status==='identified_metadata_incomplete').length,9);
 assert.equal(TTG_PENDING_CARDS.length,9);
 for(const c of TTG_PENDING_CARDS){assert.ok(!known.has(c.number));assert.equal(c.energy,null);assert.equal(c.ap,null);assert.equal(c.bp,null);assert.equal(c.gen,null);assert.equal(c.auto,false);}
});
test('all recorded cards explicitly block automated play until engine verification',()=>{
 for(const c of UA56BT_VERIFIED){
  assert.equal(c.auto,false,c.number);
  assert.ok(c.effect,c.number);
  assert.ok(c.source.includes(encodeURIComponent(c.number)),c.number);
 }
});
