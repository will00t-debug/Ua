import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_008_014} from '../dist/rnk/cards-008-014.mjs';
import {RNK_BOOSTER_IDS,RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';

test('RNK 008-014 have official TC identities, printing links and non-ready flags', () => {
  assert.equal(RNK_CARDS_008_014.length,7);
  assert.deepEqual(RNK_CARDS_008_014.map(card=>card.id),RNK_BOOSTER_IDS.slice(7,14));
  for (const card of RNK_CARDS_008_014) {
    assert.equal(card.title,'rnk');
    assert.equal(card.set,'UA41BT');
    assert.equal(card.color,'blue');
    assert.equal(card.type,'character');
    assert.equal(card.confirmedTc,true);
    assert.equal(card.deckLegal,true);
    assert.equal(card.battleReady,false);
    assert.equal(card.cardDataVerified,false);
    assert.equal(card.auto,false);
    assert.equal(card.effectJa,null);
    assert.ok(card.nameZhTw&&card.nameJa&&card.effectZhTw);
    assert.match(card.sourceTc,new RegExp('UA41BT%2F'+card.id+'$'));
    assert.ok(card.image.endsWith('UA41BT_'+card.id+'.png'));
  }
});

test('RNK 008-014 official stats, traits, triggers match card list',()=>{
  assert.deepEqual(RNK_CARDS_008_014.map(c=>[
    c.energy,c.ap,c.bp,c.gen,c.trigger,c.bpMark
  ]),[
    [7,1,5000,1,'raid','+'],
    [1,1,2000,1,null,''],
    [3,1,3000,2,'color','+'],
    [5,1,4000,1,'raid','+'],
    [3,1,3000,2,null,''],
    [4,1,4000,1,'draw',''],
    [0,1,1500,1,'active','']
  ]);
  assert.deepEqual(RNK_CARDS_008_014.map(c=>c.nameZhTw),[
    '比古清十郎','緋村劍心','緋村劍心','緋村劍心',
    '柏崎念至','式尉','四乃森蒼紫'
  ]);
  assert.deepEqual(RNK_CARDS_008_014.map(c=>c.traits),[
    [],[],[],[],['御庭番眾'],['御庭番眾'],['御庭番眾']
  ]);
});

test('RNK 008-014 effect details remain complete as text, not falsely DSL-ready',()=>{
  assert.match(RNK_CARDS_008_014[0].effectZhTw,/傷害（2）/);
  assert.match(RNK_CARDS_008_014[0].effectZhTw,/BP2000以下/);
  assert.match(RNK_CARDS_008_014[0].effectZhTw,/事件卡加入手牌/);
  assert.match(RNK_CARDS_008_014[1].effectZhTw,/衝擊無效/);
  assert.match(RNK_CARDS_008_014[2].effectZhTw,/求生意志/);
  assert.match(RNK_CARDS_008_014[3].effectZhTw,/雙重攻擊/);
  assert.match(RNK_CARDS_008_014[3].effectZhTw,/生存的意志/);
  assert.match(RNK_CARDS_008_014[4].effectZhTw,/紫色或紅色/);
  assert.match(RNK_CARDS_008_014[5].effectZhTw,/四乃森蒼紫/);
  assert.match(RNK_CARDS_008_014[6].effectZhTw,/置於場外/);
});

test('RNK manifest exposes all three first TC-verified groups but no playable ones',()=>{
  assert.equal(RNK_TC_CATALOG.length,28);
  assert.equal(new Set(RNK_TC_CATALOG.map(c=>c.id)).size,28);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.confirmedTc).length,28);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.battleReady).length,0);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.effectImplemented).length,0);
});
