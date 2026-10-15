import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {compileV2TitleContribution,mergeV2TitlePack}
 from '../dist/universal-v2/title-packs/contract.mjs';
import {listRegisteredV2Titles,registeredV2TitlePack}
 from '../dist/universal-v2/title-packs/registry.mjs';
import {v2AllTitleInventory} from '../dist/universal-v2/title-packs/inventory.mjs';
import {REAL_V2_PILOT_IDS} from '../dist/universal-v2/real-card-pilots.mjs';

const entry=()=>({
 id:'SLG-1-005',
 sourceRecord:{id:'SLG-1-005',identity:'SLG-1-005',
  number:'UA51BT/SLG-1-005',name:'TEST',type:'character',color:'purple',
  energy:0,ap:1,bp:2000,gen:1,trigger:'draw',
  effect:'印刷角色效果：登場抽一張。',
  source:'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-005'},
 definition:{id:'SLG-1-005',name:'TEST',type:'character',color:'purple',energy:0,ap:1,bp:2000,gen:1,trigger:'draw',
  implementation:'dsl',templateEffects:{onPlay:[{template:'draw',count:1}]}},
 evidence:{printedTextFragments:['登場抽一張'],reviewNote:'independent synthetic contract verification',
  testFiles:['tests/universal-v2-title-pack-contract.test.mjs']}
});
const wrap=entries=>({title:'solo-leveling',version:'e-round2-fixture',entries});
test('[V2-E] static registered identity list is NOT an adaptive count: baseline 15/20/0/0/0 and unique IDs',()=>{
 const registry=listRegisteredV2Titles();
 assert.deepEqual(registry.map(x=>x.totalV2Cards),[15,20,0,0,0]);
 assert.equal(v2AllTitleInventory().totals.total,700);
 assert.equal(REAL_V2_PILOT_IDS.bleach.length,15);
 assert.equal(REAL_V2_PILOT_IDS['gurren-lagann'].length,20);
 for(const title of ['bleach','gurren-lagann']){
  const ids=Object.keys(registeredV2TitlePack(title).cards).sort();
  assert.deepEqual(ids,[...REAL_V2_PILOT_IDS[title]].sort(),title+' authoritative pilot IDs changed');
  assert.equal(new Set(ids).size,ids.length);
 }
});
test('[V2-E] contribution rejects missing printed reference, duplicate identity, forged domain, numeric drift and unsupported DSL',()=>{
 const checks=[
  a=>{delete a.sourceRecord.number;},
  a=>{a.sourceRecord.source='https://example.com/jp/cardlist/foo';},
  a=>{a.definition.ap=2;},
  a=>{a.definition.trigger='special';},
  a=>{a.evidence.printedTextFragments=['text not in source'];},
  a=>{a.evidence.testFiles=[];},
  a=>{a.definition.templateEffects={onPlay:[{template:'notImplemented'}]};},
  a=>{a.definition.implementation='vanilla';delete a.definition.templateEffects;a.definition.effects={};}
 ];
 for(const edit of checks){
  const a=entry();edit(a);
  assert.throws(()=>compileV2TitleContribution(wrap([a])),undefined,JSON.stringify(a));
 }
 assert.throws(()=>compileV2TitleContribution(wrap([entry(),entry()])),/duplicate/);
 const e=entry();
 assert.throws(()=>mergeV2TitlePack({title:'solo-leveling',
  baselineCards:[e.definition],contribution:wrap([e])}),/conflicts/);
});
test('[V2-E] contract provenance URL and QA filenames are declarations, NOT externally verified evidence',()=>{
 // Vulnerability audit: a syntactically official-looking URL may point at an
 // unrelated number and a QA pathname may be nonexistent; API only checks shape.
 // This test documents the limit; acceptance MUST cross-check immutable source
 // record, actual GitHub file, official printable text and complete effects.
 const e=entry();
 e.sourceRecord.source='https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-078';
 e.evidence.testFiles=['tests/file-does-not-exist-v2-e.test.mjs'];
 e.evidence.reviewNote='This check is only a claim, not an executable regression';
 assert.equal(fs.existsSync(e.evidence.testFiles[0]),false);
 const accepted=compileV2TitleContribution(wrap([e]));
 assert.equal(accepted.cards.length,1,'Known permissive behavior must be explicit in handoff');
});
