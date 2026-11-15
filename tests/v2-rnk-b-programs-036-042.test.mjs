import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_036_042} from '../dist/rnk/cards-036-042.mjs';
import {RNK_JP_EVIDENCE_036_042} from '../dist/rnk/jp-evidence-036-042.mjs';
import {RNK_PROGRAMS_036_042} from '../dist/universal-v2/rnk/programs-036-042.mjs';
import {rnkB036Card,createRnkB036StagingPack} from '../dist/universal-v2/rnk-b036-staging-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';

const source=Object.fromEntries(RNK_CARDS_036_042.map(c=>[c.id,c]));
test('036 Japanese clauses map to the existing common searchTopOneBottomDiscard DSL',()=>{
  const ja=RNK_JP_EVIDENCE_036_042['RNK-1-036'];
  assert.equal(ja.print,'UA41BT/RNK-1-036');
  assert.equal(ja.nameJa,'斎藤 一');
  assert.match(ja.effectJa,/上から3枚見る/);
  assert.match(ja.effectJa,/1枚まで公開し手札に加える/);
  assert.match(ja.effectJa,/山札の下に置く/);
  assert.match(ja.effectJa,/手札に加えた場合/);
  assert.match(ja.triggerJa,/ドロー/);
  const program=RNK_PROGRAMS_036_042['RNK-1-036'];
  assert.equal(program.ready,true);
  assert.equal(program.implementation,'dsl');
  assert.deepEqual(program.effects.onPlay,[{
    op:'searchTopOneBottomDiscard',count:3,logic:'any',filters:[
      {field:'name',value:'緋村 剣心'},
      {field:'name',value:'斎藤 一'},
      {field:'name',value:'相楽 左之助'}
    ]
  }]);
});

test('B036 builds with common V2 schema and keeps Traditional Chinese display unchanged',()=>{
  const pack=createRnkB036StagingPack();
  assert.equal(pack.kind,'ua-v2-pack');
  assert.equal(pack.id,'rnk');
  assert.deepEqual(Object.keys(pack.cards),['RNK-1-036']);
  const card=pack.cards['RNK-1-036'];
  assert.equal(card.name,'斎藤 一');
  assert.equal(card.color,'purple');
  assert.equal(card.energy,1);
  assert.equal(card.ap,1);
  assert.equal(card.bp,1500);
  assert.equal(card.gen,1);
  assert.equal(card.trigger,'draw');
  assert.equal(card.type,'character');
  assert.equal(card.effects.onPlay[0].op,'searchTopOneBottomDiscard');
  assert.match(source['RNK-1-036'].effectZhTw,/棄1/);
  assert.equal(source['RNK-1-036'].nameZhTw,'齋藤一');
});

test('B037-042 are blocked, and bad evidence/opcodes fail closed',()=>{
  const pack=createRnkB036StagingPack();
  for(let n=37;n<=42;n++){
    const id='RNK-1-'+String(n).padStart(3,'0');
    assert.equal(RNK_PROGRAMS_036_042[id].ready,false);
    assert.equal(rnkB036Card(source[id]),null);
    assert.equal(pack.cards[id],undefined);
  }
  assert.throws(()=>createUniversalPack({id:'rnk',cards:[{
    ...rnkB036Card(source['RNK-1-036']),
    effects:{onPlay:[{op:'customRnkNamedSearch'}]}
  }]}),/effect op unsupported/);
  assert.ok(validateUniversalDeck(pack,{'RNK-1-036':4}).some(e=>e.includes('50')));
  assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
  assert.equal(source['RNK-1-036'].battleReady,false);
});
