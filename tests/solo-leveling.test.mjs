import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS,SOLO_LEVELING_MISSING_NUMBERS} from '../dist/solo-leveling.mjs';
import {TITLES,titleOfCard,validateTitleMembership} from '../dist/title-registry.mjs';
test('UA51BT catalog is distinct, traced to official card URLs and never claims unimplemented effects',()=>{
 assert.equal(SOLO_LEVELING_CARDS.length,80);
 assert.equal(SOLO_LEVELING_MISSING_NUMBERS.length,0);
 assert.equal(new Set(SOLO_LEVELING_CARDS.map(c=>c.id)).size,SOLO_LEVELING_CARDS.length);
 for(const c of SOLO_LEVELING_CARDS){
  assert.match(c.number,/^UA51BT\/SLG-1-\d{3}$/);
  assert.equal(c.title,'solo-leveling');
  assert.equal(c.auto,false);
  assert.ok(['C','U','R','SR'].includes(c.rarity));
  assert.equal(c.artStatus,'rugia-external');
  assert.equal(c.image,`https://rugiacreation.com/ua/cardlist/small/UA51BT_${c.id}.jpg?v=20261013`);
  assert.ok(Array.isArray(c.traits));
  assert.match(c.source,/unionarena-tcg.com\/jp\/cardlist\/detail_iframe/);
  assert.ok(c.energy>=0&&c.ap>0&&c.bp>=0&&c.gen>=0);
  assert.equal(titleOfCard(c),'solo-leveling');
 }
 assert.equal(TITLES.find(t=>t.id==='solo-leveling')?.playable,false);
});
test('same artwork identity cannot be duplicated across catalog, cross-series decks are disallowed',()=>{
 const slg=SOLO_LEVELING_CARDS[0],bleach=TITLES.find(t=>t.id==='bleach').cards[0];
 assert.ok(validateTitleMembership({[slg.id]:4,[bleach.id]:4},{[slg.id]:slg,[bleach.id]:bleach}).length);
 assert.deepEqual(validateTitleMembership({[slg.id]:4},{[slg.id]:slg}),[]);
});
