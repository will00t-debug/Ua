import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {compileV2TitleContribution,mergeV2TitlePack,
 enumerateV2UnportedIds,V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {V2_TITLE_CONTRIBUTIONS,listRegisteredV2Titles,
 registeredV2TitlePack,requireRegisteredV2TitlePack}
 from '../dist/universal-v2/title-packs/registry.mjs';
import {v2AllTitleInventory,formatV2UnportedIds,V2_EXPECTED_UNIQUE_CARD_COUNTS}
 from '../dist/universal-v2/title-packs/inventory.mjs';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck}
 from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const contractTitle='solo-leveling';
const fixture={
 id:'TEST-SLG-001',
 sourceRecord:{
  id:'TEST-SLG-001',number:'UA51BT/TEST-SLG-001',
  nameJa:'合成測試角色',color:'purple',type:'character',
  energy:0,ap:1,bp:1500,gen:1,trigger:'draw',
  effect:'【登場時】抽 1 張卡片。',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FTEST-SLG-001'
 },
 definition:{
  id:'TEST-SLG-001',name:'合成測試角色',color:'purple',type:'character',
  energy:0,ap:1,bp:1500,gen:1,trigger:'draw',
  implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:1}]}
 },
 evidence:{printedTextFragments:['【登場時】抽 1 張'],
  reviewNote:'TEST ONLY: contract schema proof, not a real official card or V2 pilot',
  testFiles:['tests/universal-v2-title-pack-contract.test.mjs']}
};
const contribution={title:contractTitle,version:'test-1',entries:[fixture]};
const modified=(fn)=>JSON.parse(JSON.stringify(fn));

test('all five independent titles are statically registered and no unported pack is playable',()=>{
 assert.deepEqual(V2_TITLE_IDS,
  ['bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei']);
 assert.equal(Object.keys(V2_TITLE_CONTRIBUTIONS).length,5);
 const list=listRegisteredV2Titles();
 assert.deepEqual(list.map(x=>x.totalV2Cards),[15,20,0,0,0]);
 assert.deepEqual(list.map(x=>x.newlyContributed),[0,0,0,0,0]);
 for(const id of V2_TITLE_IDS.slice(2)){
  assert.equal(registeredV2TitlePack(id),null);
  assert.throws(()=>requireRegisteredV2TitlePack(id),/no verified V2 playable cards/);
 }
 assert.equal(Object.keys(registeredV2TitlePack('bleach').cards).length,15);
 assert.equal(Object.keys(registeredV2TitlePack('gurren-lagann').cards).length,20);
 assert.throws(()=>registeredV2TitlePack('unknown-work'),/Unknown/);
});

test('existing 50-card real-title matches still work when routed through modular registry',()=>{
 const a=verifiedBleachPurplePilotDeck(),b=verifiedTtgRedPilotDeck();
 const s=newUniversalMatch([a.pack,b.pack],{decks:[a.counts,b.counts],seed:51});
 assert.equal(assertUniversalMatch([a.pack,b.pack],s),true);
 assert.equal(s.packVersions[0],a.pack.version);
 assert.equal(s.packVersions[1],b.pack.version);
 assert.equal(Object.values(a.counts).reduce((sum,n)=>sum+n,0),50);
 assert.equal(Object.values(b.counts).reduce((sum,n)=>sum+n,0),50);
});

test('per-title contribution compiles TEST-ONLY authored DSL through existing strict pack verifier',()=>{
 const compiled=compileV2TitleContribution(contribution);
 assert.equal(compiled.cardIds[0],'TEST-SLG-001');
 assert.equal(compiled.cards[0].templateEffects.onPlay[0].template,'draw');
 const pack=mergeV2TitlePack({title:contractTitle,contribution});
 assert.equal(pack.cards['TEST-SLG-001'].effects.onPlay[0].op,'draw');
 assert.equal(pack.cards['TEST-SLG-001'].implementation,'dsl');
 assert.match(pack.version,/test-1/);
 assert.equal(registeredV2TitlePack(contractTitle),null,
  'synthetic test contract NEVER mutates registered title modules');
});

test('missing printed text, official source, QA tests, AP/alternate and printed numeric drift are rejected',()=>{
 const cases=[
  e=>{e.sourceRecord.source='https://example.org/mock';},
  e=>{e.sourceRecord.energy=4;},
  e=>{e.sourceRecord.effect='different';},
  e=>{e.evidence.printedTextFragments=['printed text not present'];},
  e=>{e.evidence.testFiles=[];},
  e=>{e.evidence.reviewNote='';},
  e=>{e.sourceRecord.number='UA51BT/WRONG-1';},
  e=>{e.sourceRecord.type='action_point';e.definition.type='action_point';},
  e=>{e.definition.implementation='vanilla';delete e.definition.templateEffects;
   e.definition.effects={};},
  e=>{e.definition.templateEffects={onPlay:[{template:'imaginaryCardEffect'}]};}
 ];
 for(const edit of cases){
  const candidate=modified(fixture);edit(candidate);
  assert.throws(()=>compileV2TitleContribution({...contribution,entries:[candidate]}),
   /missing|changed|verified|rejected|invalid|requires|not verified|AP card|printed|without effects|unknown|must document/i,
   JSON.stringify(candidate));
 }
 const copy=modified(fixture);
 assert.throws(()=>compileV2TitleContribution({...contribution,entries:[fixture,copy]}),
  /duplicate contribution ID/);
 assert.throws(()=>mergeV2TitlePack({title:'bleach',
  baselineCards:[fixture.definition],contribution:{...contribution,title:'bleach'}}),
  /conflicts with an existing Pilot/);
});

test('inventory is derived from all five original catalogues, NOT legacy auto flags or tests pass count',()=>{
 const result=v2AllTitleInventory(),{series,totals}=result;
 assert.deepEqual(series.map(x=>x.title),V2_TITLE_IDS);
 assert.deepEqual(series.map(x=>x.total),Object.values(V2_EXPECTED_UNIQUE_CARD_COUNTS));
 assert.deepEqual(series.map(x=>x.pilotImplemented),[15,20,0,0,0]);
 assert.deepEqual(series.map(x=>x.blocked),[261,61,80,183,80]);
 assert.equal(totals.total,700);
 assert.equal(totals.pilotImplemented,35);
 assert.equal(totals.blocked,665);
 assert.equal(totals.fullyAccepted,0);
 assert.equal(totals.total-totals.pilotImplemented,totals.blocked);
 for(const record of series){
  assert.equal(record.unportedIds.length,record.blocked);
  assert.ok(record.unportedIds.every(id=>!record.pilotIds.includes(id)));
  assert.ok(record.metadataReady<=record.total);
 }
 const text=formatV2UnportedIds();
 for(const seriesEntry of series){
  assert.ok(text.includes('## '+seriesEntry.title));
  if(seriesEntry.blocked)assert.ok(text.includes(seriesEntry.unportedIds.at(-1)));
 }
});

test('unported enumeration ignores AP, deduplicates alternate printing IDs and never accepts an unknown title card',()=>{
 const pack=createUniversalPack({id:'test',cards:[{
  id:'N1',name:'One',energy:0,ap:1,bp:1000,gen:1,color:'red',
  type:'character',implementation:'vanilla'
 }]});
 assert.deepEqual(enumerateV2UnportedIds([
  {id:'N1',type:'character'},{id:'N1',type:'character',alt:true},
  {id:'N2',type:'character'},{id:'N3',type:'action_point'},
  {id:'N2',type:'character',alternate:true}
 ],pack),['N2']);
});
