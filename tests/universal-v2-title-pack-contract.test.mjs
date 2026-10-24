import {EXPECTED_V2_COUNTS,EXPECTED_V2_TOTAL,EXPECTED_V2_ADDED_CARD_IDS,EXPECTED_V2_BASELINE_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
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
import {REAL_V2_PILOT_IDS} from '../dist/universal-v2/real-card-pilots.mjs';

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

test('all five independent titles register exactly the source-pinned official card IDs and retain baseline pilots',()=>{
 assert.deepEqual(V2_TITLE_IDS,
  ['bleach','gurren-lagann','solo-leveling','sword-art-online','mushoku-tensei']);
 assert.equal(Object.keys(V2_TITLE_CONTRIBUTIONS).length,5);
 const list=listRegisteredV2Titles();
 assert.deepEqual(list.map(x=>x.totalV2Cards),Object.values(EXPECTED_V2_COUNTS));
 assert.deepEqual(list.map(x=>x.baselinePilots),[15,20,0,0,0]);
 assert.deepEqual(list.map(x=>x.newlyContributed),Object.values(EXPECTED_V2_ADDED_CARD_IDS).map(ids=>ids.length));
 for(const title of V2_TITLE_IDS){
  const added=EXPECTED_V2_ADDED_CARD_IDS[title];
  const contribution=V2_TITLE_CONTRIBUTIONS[title];
  assert.deepEqual(contribution.entries.map(e=>e.id).sort(),added,
   title+' actual reviewed contribution IDs must match independent exact manifest');
  const pack=requireRegisteredV2TitlePack(title),ids=Object.keys(pack.cards);
  const pilots=EXPECTED_V2_BASELINE_IDS[title];
  assert.deepEqual([...(REAL_V2_PILOT_IDS[title]||[])].sort(),pilots);
  assert.deepEqual(ids.slice().sort(),[...pilots,...added].sort(),
   title+' registry must contain exactly Pilot + contribution IDs');
  assert.equal(new Set(ids).size,ids.length,'no duplicate physical card identity');
  for(const c of contribution.entries){
   assert.equal(c.definition.id,c.id);
   const recordedShop=c.id==='BLC-4-082'&&c.sourceRecord.source==='https://shopping.fullcomp.jp/products/pdsrqs97vlmo'||
    c.id==='BLC-4-083'&&c.sourceRecord.source==='https://dorasuta.jp/union-arena/product?pid=709493';
   assert.ok(recordedShop||c.sourceRecord.source?.includes('/jp/cardlist/'),c.id);
   assert.ok(c.evidence.testFiles.length>0);
   assert.ok(pack.cards[c.id]?.implementation);
  }
 }
 assert.throws(()=>registeredV2TitlePack('unknown-work'),/Unknown/);
 assert.throws(()=>requireRegisteredV2TitlePack('unknown-work'),/Unknown/);
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
 const existing=registeredV2TitlePack(contractTitle);
 assert.deepEqual(Object.keys(existing.cards).sort(),
  EXPECTED_V2_ADDED_CARD_IDS[contractTitle],
  'synthetic test contract NEVER mutates the registered real-title IDs');
 assert.equal(existing.cards['TEST-SLG-001'],undefined);
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

test('inventory is derived from all five official catalogues and exact registered V2 IDs, not passing tests',()=>{
 const result=v2AllTitleInventory(),{series,totals}=result;
 assert.deepEqual(series.map(x=>x.title),V2_TITLE_IDS);
 assert.deepEqual(series.map(x=>x.total),Object.values(V2_EXPECTED_UNIQUE_CARD_COUNTS));
 assert.deepEqual(series.map(x=>x.pilotImplemented),Object.values(EXPECTED_V2_COUNTS));
 assert.deepEqual(series.map(x=>x.blocked),series.map(x=>x.total-EXPECTED_V2_COUNTS[x.title]));
 assert.equal(totals.total,700);
 assert.equal(totals.pilotImplemented,EXPECTED_V2_TOTAL);
 assert.equal(totals.blocked,700-EXPECTED_V2_TOTAL);
 assert.equal(totals.fullyAccepted,0);
 assert.equal(totals.total-totals.pilotImplemented,totals.blocked);
 for(const record of series){
  assert.equal(record.unportedIds.length,record.blocked);
  assert.ok(record.unportedIds.every(id=>!record.pilotIds.includes(id)));
  assert.ok(record.metadataReady<=record.total);
  const titlePack=registeredV2TitlePack(record.title);
  assert.deepEqual(record.pilotIds,Object.keys(titlePack.cards).sort(),
   'inventory must exactly reflect installed pack, never permit unknown flag-based support');
  assert.deepEqual(record.pilotIds,
   [...EXPECTED_V2_BASELINE_IDS[record.title],
    ...EXPECTED_V2_ADDED_CARD_IDS[record.title]].sort());
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
