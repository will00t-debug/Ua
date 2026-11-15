import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_085_091} from '../dist/rnk/cards-085-091.mjs';
import {RNK_CARDS_092_098} from '../dist/rnk/cards-092-098.mjs';
import {RNK_CARDS_099_105} from '../dist/rnk/cards-099-105.mjs';
import {RNK_CARDS_106_113} from '../dist/rnk/cards-106-113.mjs';
import {RNK_PROMO_CARD} from '../dist/rnk/promo-card.mjs';
import {
  RNK_DECK_IDS,RNK_SOURCE_CATALOG,RNK_IDENTITY_INVENTORY,
  RNK_PRINT_RULE_EXCEPTIONS
} from '../dist/rnk/manifest.mjs';
const groups=[RNK_CARDS_085_091,RNK_CARDS_092_098,RNK_CARDS_099_105,RNK_CARDS_106_113],rows=groups.flat();
test('D group has 29 numbered BT/ST and one standalone promotional event',()=>{
  assert.deepEqual(groups.map(g=>g.length),[7,7,7,8]);
  assert.deepEqual(rows.map(c=>c.id),RNK_DECK_IDS.slice(84));
  assert.equal(new Set([...rows,RNK_PROMO_CARD].map(c=>c.id)).size,30);
  assert.equal(rows.filter(c=>c.set==='UA41BT').length,16);
  assert.equal(rows.filter(c=>c.set==='UA41ST').length,13);
  assert.equal(RNK_PROMO_CARD.set,'UAPR');
  assert.equal(RNK_SOURCE_CATALOG.length,114);
  assert.equal(RNK_IDENTITY_INVENTORY.length,114);
  assert.equal(new Set(RNK_SOURCE_CATALOG.map(c=>c.id)).size,114);
});
test('D source rows never enter engine until effect acceptance',()=>{
  for(const c of [...rows,RNK_PROMO_CARD]){
    assert.equal(c.title,'rnk');
    assert.equal(c.battleReady,false);
    assert.equal(c.cardDataVerified,false);
    assert.equal(c.effectImplemented,false);
    assert.equal(c.effectJa,null);
    assert.equal(c.deckLegal,true);
    assert.ok(c.nameZhTw&&c.effectZhTw&&c.image);
    assert.ok(['character','event','field'].includes(c.type));
    assert.ok(c.source);
  }
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.battleReady).length,0);
});
test('Starter and promo details protect against wrong TC site, color, and reprint rules',()=>{
  const get=n=>rows.find(c=>c.id==='RNK-1-'+n);
  assert.equal(get('093').bpMark,'+');
  assert.equal(get('099').type,'event');
  assert.equal(get('100').trigger,'special');
  assert.equal(get('101').gen,2);
  assert.equal(get('103').ap,2);
  assert.equal(get('105').bpMark,'-');
  assert.equal(get('106').trigger,'raid');
  assert.equal(get('106').gen,1);
  assert.equal(get('106').needsManualReview,true);
  assert.match(get('106').effectZhTw,/突襲/);
  assert.equal(get('108').type,'field');
  assert.equal(get('109').type,'event');
  assert.deepEqual(get('110').traits,['御庭番眾']);
  assert.equal(get('112').color,'purple');
  assert.equal(get('113').color,'purple');
  assert.equal(get('112').needsManualReview,true);
  assert.equal(get('113').needsManualReview,true);
  assert.equal(RNK_PROMO_CARD.energy,4);
  assert.equal(RNK_PROMO_CARD.color,'multicolor');
  assert.deepEqual(RNK_PROMO_CARD.colors,['red','blue','yellow','green','purple']);
  assert.equal(RNK_PROMO_CARD.type,'event');
  assert.equal(RNK_PROMO_CARD.trigger,'final');
  assert.equal(RNK_PROMO_CARD.confirmedJa,true);
  assert.equal(RNK_PROMO_CARD.confirmedTc,false);
  assert.equal(RNK_PRINT_RULE_EXCEPTIONS['UAPR/RNK-1-086'].baseId,'RNK-1-086');
  assert.equal(RNK_PRINT_RULE_EXCEPTIONS['UAPR/RNK-1-086'].needsPrintSpecificRulesReview,true);
});
