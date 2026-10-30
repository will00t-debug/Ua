import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boardEntryMode,boardEntrySelection,entryClickPlan}
 from '../dist/universal-v2/preview-actions.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const baseLegal=[
 {type:'chooseHandRestOrRaid',uid:'hand-raid',mode:'enter',line:'front',slot:2},
 {type:'chooseHandRestOrRaid',uid:'hand-raid',mode:'raid',baseUid:'rear-base',line:'front',slot:2},
 {type:'chooseHandRestOrRaid',uid:'hand-raid',mode:'raid',baseUid:'rear-base',line:'energy',slot:0},
 {type:'chooseOutsideRestOrRaid',uid:'outside-raid',mode:'enter',line:'front',slot:3},
 {type:'chooseOutsideRestOrRaid',uid:'outside-raid',mode:'raid',baseUid:'rear-base',line:'front',slot:2},
 {type:'choosePrintedRestRaid',uid:'removed-raid',mode:'enter',line:'front',slot:3},
 {type:'choosePrintedRestRaid',uid:'removed-raid',mode:'raid',baseUid:'rear-base',line:'front',slot:2},
 {type:'chooseRemovedOkabeRaid',uid:'removed-only',mode:'raid',baseUid:'rear-base',line:'front',slot:2},
 {type:'chooseOutsideRaid',uid:'outside-only',baseUid:'rear-base',line:'energy',slot:0},
 {type:'chooseSayakaReenter',uid:'outside-sayaka',mode:'enter',line:'front',slot:3},
 {type:'chooseSayakaReenter',uid:'outside-sayaka',mode:'raid',baseUid:'rear-base',line:'front',slot:2},
 {type:'chooseOutsideUse',uid:'outside-rest',mode:'rest',line:'front',slot:1},
 {type:'chooseOutsideReferenced',uid:'outside-referenced',mode:'rest',line:'energy',slot:3},
 {type:'chooseHandFreshName',uid:'hand-fresh',line:'front',slot:1},
 {type:'chooseOutsideColorTraitActive',uid:'outside-active',line:'energy',slot:3},
 {type:'chooseRemovedRestPair',uid:'removed-only-normal',mode:'place',line:'front',slot:1},
 {type:'chooseRestReenter',uid:'fixed-outside',line:'front',slot:2}
];

test('hand, outside and removed: select physical target BEFORE choosing normal/Raid and cell',()=>{
 for(const uid of ['hand-raid','outside-raid','removed-raid','outside-sayaka']){
  const selected=boardEntrySelection(baseLegal,uid);
  assert.equal(selected.needsMode,true,uid);
  assert.equal(entryClickPlan({selectedUid:uid,entryMode:null,line:'energy',slot:0,
   slotUid:'rear-base',legal:baseLegal}).type,'entry-mode',
   uid+' must not silently choose Raid by clicking a base');
  assert.equal(entryClickPlan({selectedUid:uid,entryMode:null,line:'front',slot:3,
   slotUid:null,legal:baseLegal}).type,'entry-mode');
  const normal=entryClickPlan({selectedUid:uid,entryMode:'normal',line:'front',slot:3,
   slotUid:null,legal:baseLegal});
  if(uid!=='hand-raid')assert.equal(normal.mode,'normal');
  // Effect-granted Raid: directly tap the destination; no preliminary base tap.
  const raid=entryClickPlan({selectedUid:uid,entryMode:'raid',line:'front',slot:2,
   slotUid:null,legal:baseLegal});
  assert.equal(raid.type,'entry',uid);
  assert.equal(raid.mode,'raid',uid);
  assert.ok(raid.actions.every(a=>a.uid===uid&&a.baseUid==='rear-base'),uid);
  const energy=entryClickPlan({selectedUid:uid,entryMode:'raid',line:'energy',slot:0,
   slotUid:'rear-base',legal:baseLegal});
  assert.notEqual(energy.type,'raid-base',uid);
  if(uid==='hand-raid')assert.equal(energy.type,'entry',uid);
 }
 assert.equal(entryClickPlan({selectedUid:null,entryMode:'raid',line:'front',slot:2,
  slotUid:null,legal:baseLegal}).type,'idle');
 assert.equal(boardEntrySelection(baseLegal,'forged').needsMode,false);
});

test('effect Raid offers a base choice only when different legal bases share the chosen cell',()=>{
 const multi=[...baseLegal,
  {type:'chooseOutsideRestOrRaid',uid:'outside-raid',mode:'raid',
   baseUid:'rear-second',line:'front',slot:2}];
 const plan=entryClickPlan({selectedUid:'outside-raid',entryMode:'raid',
  line:'front',slot:2,slotUid:null,legal:multi});
 assert.equal(plan.type,'entry');
 assert.deepEqual(plan.actions.map(a=>a.baseUid),['rear-base','rear-second']);
 const selected=entryClickPlan({selectedUid:'outside-raid',entryMode:'raid',
  raidBaseUid:'rear-base',line:'front',slot:2,slotUid:null,legal:multi});
 assert.deepEqual(selected.actions.map(a=>a.baseUid),['rear-base','rear-second'],
  'effect Raid does not silently lock onto an old base selection');
});

test('Raid-only and normal-only effects never invent the other entry mode',()=>{
 for(const uid of ['removed-only','outside-only']){
  const selected=boardEntrySelection(baseLegal,uid);
  assert.equal(selected.needsMode,false);
  assert.equal(selected.raid.length>0,true);
  assert.equal(selected.normal.length,0);
 }
 for(const uid of ['outside-rest','outside-referenced','hand-fresh','outside-active',
  'removed-only-normal','fixed-outside']){
  const selected=boardEntrySelection(baseLegal,uid);
  assert.equal(selected.needsMode,false,uid);
  assert.equal(selected.normal.length>0,true,uid);
  assert.equal(selected.raid.length,0,uid);
 }
});

test('both solo and online UI recognize sources and separate paid Raid from effect mode selection',()=>{
 const preview=read('dist/universal-v2/preview-actions.mjs');
 const online=read('dist/online.mjs');
 for(const source of [preview,online]){
  for(const type of ['chooseOutsideUse','chooseOutsideReferenced','chooseDeployOutside',
   'chooseOutsideExcept','chooseOutsideColorRest','chooseOutsideColorTraitActive',
   'chooseHandFreshName','chooseHandRestEntry','chooseOutsideRaid',
   'chooseSayakaReenter','chooseRestReenter','chooseRemovedRestPair']){
   assert.ok(source.includes("'"+type+"'"),type);
  }
  assert.match(source,/const paidRaid=selection\.raid\.some/);
  assert.match(source,/if\(paidRaid\)\{/);
  assert.match(source,/selection\.needsMode\?null/);
  assert.match(source,/if\(!mode\)return \{type:'entry-mode'\}/);
 }
});

test('all engine Raid transitions perform ACTIVE, without changing REST-only entry effects',()=>{
 const source=read('dist/universal-v2/engine.mjs');
 assert.match(source,/if\(entryReady!==true\)throw Error\('Raid must enter ACTIVE'\)/);
 assert.match(source,/cardOnTop\.stack=\[effectiveBase\];cardOnTop\.ready=true/);
 assert.doesNotMatch(source,/performRaid\([\s\S]{0,260}?entryReady:false/);
 assert.doesNotMatch(source,/performRaid\([\s\S]{0,260}?entryReady:q\.entryReady===true/);
 assert.match(source,/physical\.ready=false/,'normal REST entry must remain available');
 assert.match(source,/type:'chooseSayakaReenter',mode:'raid',uid:q\.sourceUid/);
});
