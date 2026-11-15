import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_015_021} from '../dist/rnk/cards-015-021.mjs';
import {RNK_BOOSTER_IDS,RNK_TC_CATALOG,RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';

test('RNK 015-021 have official TC card rows and remain unimplemented',()=>{
  assert.deepEqual(RNK_CARDS_015_021.map(c=>c.id),RNK_BOOSTER_IDS.slice(14,21));
  for(const card of RNK_CARDS_015_021){
    assert.equal(card.title,'rnk');
    assert.equal(card.color,'blue');
    assert.equal(card.set,'UA41BT');
    assert.equal(card.type,'character');
    assert.equal(card.confirmedTc,true);
    assert.equal(card.battleReady,false);
    assert.equal(card.auto,false);
    assert.equal(card.cardDataVerified,false);
    assert.equal(card.effectJa,null);
    assert.equal(card.deckLegal,true);
    assert.ok(card.name&&card.nameJa&&card.effectZhTw);
    assert.ok(card.image.endsWith('UA41BT_'+card.id+'.png'));
    assert.match(card.sourceTc,new RegExp('UA41BT%2F'+card.id+'$'));
  }
});

test('RNK 015-021 preserve official costs, BP+ marks and triggers',()=>{
  assert.deepEqual(RNK_CARDS_015_021.map(c=>[
    c.energy,c.ap,c.bp,c.gen,c.trigger,c.bpMark
  ]),[
    [1,1,2000,1,null,'+'],
    [2,1,2500,1,'color',''],
    [4,1,4000,1,'draw',''],
    [4,1,4000,1,'raid','+'],
    [3,1,3000,2,null,'+'],
    [0,1,2000,1,null,''],
    [1,1,1500,1,'draw','']
  ]);
  assert.deepEqual(RNK_CARDS_015_021.map(c=>c.nameZhTw),[
    '四乃森蒼紫','四乃森蒼紫','四乃森蒼紫','四乃森蒼紫','般若','火男','癋見'
  ]);
  assert.ok(RNK_CARDS_015_021.every(c=>c.traits.includes('御庭番眾')));
});

test('RNK 015-021 preserve exceptional card-effect clauses',()=>{
  assert.match(RNK_CARDS_015_021[0].effectZhTw,/BP\+1000/);
  assert.match(RNK_CARDS_015_021[1].effectZhTw,/角色卡效果或事件卡效果/);
  assert.match(RNK_CARDS_015_021[2].effectZhTw,/轉為休息/);
  assert.match(RNK_CARDS_015_021[3].effectZhTw,/突襲來源卡/);
  assert.match(RNK_CARDS_015_021[3].effectZhTw,/無法攻擊/);
  assert.match(RNK_CARDS_015_021[4].effectZhTw,/退場時/);
  assert.match(RNK_CARDS_015_021[5].effectZhTw,/四乃森蒼紫/);
  assert.match(RNK_CARDS_015_021[6].effectZhTw,/高荷惠/);
  assert.equal(RNK_TC_CATALOG.length,56);
  assert.equal(new Set(RNK_TC_CATALOG.map(c=>c.id)).size,56);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.confirmedTc).length,56);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(c=>c.battleReady).length,0);
});
