import test from 'node:test';
import assert from 'node:assert/strict';
import {RNK_CARDS_029_035} from '../dist/rnk/cards-029-035.mjs';
import {RNK_IDENTITY_INVENTORY} from '../dist/rnk/manifest.mjs';
import {RNK_JP_EVIDENCE_029_035} from '../dist/rnk/jp-evidence-029-035.mjs';
import {RNK_PROGRAMS_029_035} from '../dist/universal-v2/rnk/programs-029-035.mjs';
import {rnkStagedCard,createRnkStagingPack} from '../dist/universal-v2/rnk-staging-pack.mjs';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';

const programs=RNK_PROGRAMS_029_035;
const source=new Map(RNK_CARDS_029_035.map(card=>[card.id,card]));
const ready=['RNK-1-031','RNK-1-035'];
const pending=['RNK-1-029','RNK-1-030','RNK-1-032','RNK-1-033','RNK-1-034'];

test('only two card programs have Japanese print evidence and complete V2 definitions',()=>{
  assert.deepEqual(Object.entries(programs).filter(([,p])=>p.ready).map(([id])=>id),ready);
  assert.deepEqual(Object.entries(programs).filter(([,p])=>!p.ready).map(([id])=>id),pending);
  assert.equal(Object.keys(RNK_JP_EVIDENCE_029_035).length,2);
  for(const id of ready){
    const ja=RNK_JP_EVIDENCE_029_035[id];
    assert.equal(ja.print,source.get(id).number);
    assert.ok(ja.nameJa&&ja.triggerJa&&ja.effectJa&&ja.sourceJa.startsWith('https://'));
    assert.equal(source.get(id).battleReady,false);
  }
  assert.equal(RNK_JP_EVIDENCE_029_035['RNK-1-031'].nameJa,'最強の証');
  assert.equal(RNK_JP_EVIDENCE_029_035['RNK-1-035'].nameJa,'斎藤 一');
  assert.equal(RNK_JP_EVIDENCE_029_035['RNK-1-035'].effectJa,'-');
});

test('staging pack passes Universal V2 schema and preserves exact AP restore',()=>{
  const pack=createRnkStagingPack();
  assert.equal(pack.kind,'ua-v2-pack');
  assert.equal(pack.id,'rnk');
  assert.deepEqual(Object.keys(pack.cards).sort(),ready);
  const activeAp=pack.cards['RNK-1-031'];
  assert.equal(activeAp.name,'最強の証');
  assert.equal(activeAp.type,'event');
  assert.equal(activeAp.energy,3);
  assert.equal(activeAp.ap,1);
  assert.equal(activeAp.color,'blue');
  assert.equal(activeAp.trigger,'final');
  assert.deepEqual(activeAp.effects.onPlay,[{op:'recoverAp',count:2}]);
  const noEffect=pack.cards['RNK-1-035'];
  assert.equal(noEffect.name,'斎藤 一');
  assert.equal(noEffect.type,'character');
  assert.equal(noEffect.energy,0);
  assert.equal(noEffect.bp,1500);
  assert.equal(noEffect.trigger,'get');
  assert.deepEqual(noEffect.effects,{});
});

test('refuse invented full-deck eligibility, partial programs and source drift',()=>{
  const pack=createRnkStagingPack();
  for(const id of pending){
    assert.equal(rnkStagedCard(source.get(id)),null,id+' incomplete card slipped into pack');
    assert.equal(pack.cards[id],undefined);
  }
  assert.ok(validateUniversalDeck(pack,{'RNK-1-031':4,'RNK-1-035':4}).some(x=>x.includes('50')));
  assert.ok(validateUniversalDeck(pack,{'RNK-1-030':1}).some(x=>x.includes('Unregistered')));
  assert.throws(()=>rnkStagedCard({...source.get('RNK-1-031'),number:'UA41BT/RNK-1-030'}),
    /Japanese printed evidence/);
  assert.throws(()=>rnkStagedCard({...source.get('RNK-1-031'),battleReady:true}),
    /source catalog must not claim/);
  assert.throws(()=>rnkStagedCard({...source.get('RNK-1-035'),cardDataVerified:true}),
    /source catalog must not claim/);
});

test('staging never changes production registration or Chinese display',()=>{
  assert.throws(()=>officialV2Pack('rnk'),/尚未提供正式 V2 牌組/);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(card=>card.battleReady).length,0);
  assert.equal(RNK_IDENTITY_INVENTORY.filter(card=>card.effectImplemented).length,0);
  assert.equal(source.get('RNK-1-031').nameZhTw,'最強的證明');
  assert.equal(source.get('RNK-1-035').nameZhTw,'齋藤一');
  assert.ok(source.get('RNK-1-031').effectZhTw.includes('AP'));
});
