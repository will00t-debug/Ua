import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_022_028} from '../dist/rnk/cards-022-028.mjs';
import {RNK_BOOSTER_IDS,RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';

test('RNK 022-028 source cards are distinct, official TC and safely non-ready',()=>{
  assert.deepEqual(RNK_CARDS_022_028.map(c=>c.id),RNK_BOOSTER_IDS.slice(21,28));
  for(const card of RNK_CARDS_022_028){
    assert.equal(card.title,'rnk');
    assert.equal(card.set,'UA41BT');
    assert.equal(card.color,'blue');
    assert.equal(card.confirmedTc,true);
    assert.equal(card.deckLegal,true);
    assert.equal(card.auto,false);
    assert.equal(card.battleReady,false);
    assert.equal(card.cardDataVerified,false);
    assert.equal(card.effectJa,null);
    assert.ok(card.nameJa&&card.nameZhTw&&card.effectZhTw);
    assert.ok(card.image.endsWith('UA41BT_'+card.id+'.png'));
    assert.match(card.sourceTc,new RegExp('UA41BT%2F'+card.id+'$'));
  }
});

test('RNK 022-028 preserve costs, BP, card types and triggers',()=>{
  assert.deepEqual(RNK_CARDS_022_028.map(c=>[
    c.energy,c.ap,c.bp,c.gen,c.type,c.trigger
  ]),[
    [0,1,1500,1,'character','draw'],
    [2,1,2500,1,'character',null],
    [2,1,2000,1,'character','draw'],
    [2,1,2000,1,'character','draw'],
    [3,1,0,2,'field','get'],
    [3,1,0,0,'event','final'],
    [4,1,0,0,'event','special']
  ]);
  assert.deepEqual(RNK_CARDS_022_028.slice(0,4).map(c=>c.traits),[
    ['御庭番眾'],['御庭番眾'],['御庭番眾'],['御庭番眾']
  ]);
  assert.deepEqual(RNK_CARDS_022_028.slice(4).map(c=>c.traits),[[],[],[]]);
  assert.equal(RNK_CARDS_022_028[1].genMark,'藍+');
  assert.equal(RNK_CARDS_022_028[2].genMark,'藍+');
});

test('RNK 022-028 retains special effects and 28-card A group census',()=>{
  assert.match(RNK_CARDS_022_028[0].effectZhTw,/衝擊無效/);
  assert.match(RNK_CARDS_022_028[1].effectZhTw,/活動狀態/);
  assert.match(RNK_CARDS_022_028[2].effectZhTw,/放回手牌/);
  assert.match(RNK_CARDS_022_028[3].effectZhTw,/能源需求減少/);
  assert.match(RNK_CARDS_022_028[4].effectZhTw,/比古清十郎/);
  assert.match(RNK_CARDS_022_028[5].effectZhTw,/最多2張自己的AP卡/);
  assert.match(RNK_CARDS_022_028[6].effectZhTw,/BP範圍\+1000/);
  assert.equal(RNK_TC_CATALOG.length,28);
  assert.equal(new Set(RNK_TC_CATALOG.map(c=>c.id)).size,28);
  assert.deepEqual(RNK_TC_CATALOG.map(c=>c.id),RNK_BOOSTER_IDS.slice(0,28));
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.confirmedTc).length,28);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.battleReady).length,0);
});
