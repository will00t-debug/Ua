import test from 'node:test';
import assert from 'node:assert/strict';
import {UA56BT_VERIFIED} from '../dist/gurren-lagann.mjs';
import {TTG_CARDS,TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {TITLES} from '../dist/title-registry.mjs';

test('81 recorded UA56BT effect-card identities have complete typed data, not AP artwork',()=>{
 assert.equal(TTG_CARDS.length,81);
 const seen=new Set();
 for(const c of TTG_CARDS){
  assert.match(c.id,/^TTG-1-\d{3}$/,c.id);
  assert.equal(c.identity,c.id);
  assert.equal(c.number,'UA56BT/'+c.id);
  assert.ok(!seen.has(c.id));seen.add(c.id);
  assert.equal(c.title,'gurren-lagann');
  assert.ok(typeof c.nameJa==='string'&&c.nameJa.length>0,c.number+' Japanese name');
  assert.ok(typeof c.nameZh==='string'&&c.nameZh.length>0,c.number+' Chinese name');
  assert.ok(['red','green'].includes(c.color),c.number);
  for(const key of ['energy','ap','bp','gen'])assert.ok(Number.isInteger(c[key])&&c[key]>=0,c.number+' '+key);
  assert.ok(c.ap>=1,c.number+' consumed AP');
  assert.ok(['character','field','event'].includes(c.type),c.number);
  assert.ok(['SR','R','U','C'].includes(c.rarity),c.number);
  assert.ok([null,'get','draw','active','special','final','color','raid'].includes(c.trigger),c.number);
  assert.ok(Array.isArray(c.traits),c.number);
  assert.ok(typeof c.effect==='string'&&c.effect.length>0,c.number);
  assert.equal(c.auto,false,c.number);
  assert.equal(c.image,`https://rugiacreation.com/ua/cardlist/small/UA56BT_${c.id}.jpg?v=20261013`,c.number+' external regular artwork');
  assert.ok(c.source.startsWith('https://www.unionarena-tcg.com/'),c.number);
  assert.equal(TTG_BY_ID[c.id].id,c.id);
 }
 assert.equal(UA56BT_VERIFIED.length,81);
});
test('TTG identity registry stays separate from BLEACH card identifiers and AP art',()=>{
 const ttg=TITLES.find(x=>x.id==='gurren-lagann');
 const bleach=TITLES.find(x=>x.id==='bleach');
 assert.equal(ttg.cards.length,81);
 assert.equal(ttg.playable,false,'do not unlock unfinished AI gameplay');
 for(const c of ttg.cards)assert.ok(!bleach.cards.some(x=>x.id===c.id),c.id);
 assert.ok(ttg.cards.every(c=>!c.id.includes('-AP')));
});
