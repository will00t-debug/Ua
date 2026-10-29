import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../dist/cards.mjs';
import {STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {MADOKA_CARDS} from '../dist/madoka-cards.mjs';
import {EXEDRA_CARDS} from '../dist/madoka-exedra-cards.mjs';
import {createStgV2Pack} from '../dist/universal-v2/stg-pack.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {fieldEffectCopy,FIELD_HOLD_MS} from '../dist/universal-v2/preview-actions.mjs';

test('a field card sheet uses the printed effect and trigger, not a rules program',()=>{
 const shunsui=CARDS.find(c=>c.identity==='BLC-1-074');
 assert.ok(shunsui);
 const text=fieldEffectCopy(shunsui);
 assert.match(text,/2 點傷害|傷害/);
 assert.equal(text.includes('onPlay'),false);
 assert.equal(text.includes('printedAttackDamage'),false);
 assert.equal(fieldEffectCopy({effect:'無固有效果。',triggerEffect:'無 Trigger。'}),'無固有效果。');
 assert.equal(fieldEffectCopy({effect:'登場：抽 1 張。',triggerText:'抽 1 張。'}),
  '登場：抽 1 張。\n觸發效果：抽 1 張。');
 assert.equal(fieldEffectCopy(null),'這張卡沒有可顯示的效果。');
 assert.equal(FIELD_HOLD_MS,1000);
});

test('holding a field card opens its effect and does not take the short click',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 const slot=preview.split('function legacySlot(')[1]?.split('function legacyLine(')[0];
 assert.ok(slot);
 assert.match(slot,/setTimeout\(\(\)=>\{held=true;showFieldSheet\(side,line,c,d\);\},FIELD_HOLD_MS\)/);
 assert.match(slot,/if\(held\)\{held=false;return;\}/);
 assert.match(slot,/contextmenu/);
 assert.match(preview,/function showFieldSheet\(/);
 assert.match(preview,/fieldEffectCopy\(catalogue\)/);
 assert.match(preview,/PRINTED_CATALOGUE/);
 assert.doesNotMatch(slot,/dispatchUniversalAction/);
});

function catalogueMap(cards){
 const map=new Map();
 for(const card of cards){
  const id=card?.identity||card?.id;
  if(id&&!map.has(id))map.set(id,card);
 }
 return map;
}

test('Steins;Gate and Madoka battle sheets use the printed effect catalogue',()=>{
 const preview=readFileSync(new URL('../dist/universal-v2-preview.mjs',import.meta.url),'utf8');
 assert.match(preview,/'steins-gate':printedCatalogueMap\(STEINS_GATE_CARDS\)/);
 assert.match(preview,/madoka:printedCatalogueMap\(\[\.\.\.MADOKA_CARDS,\.\.\.EXEDRA_CARDS\]\)/);
 const catalogues={
  'steins-gate':catalogueMap(STEINS_GATE_CARDS),
  madoka:catalogueMap([...MADOKA_CARDS,...EXEDRA_CARDS])
 };
 const packs={
  'steins-gate':createStgV2Pack(),
  madoka:createMadokaV2Pack()
 };
 for(const [title,pack] of Object.entries(packs)){
  for(const id of Object.keys(pack.cards)){
   const printed=catalogues[title].get(id);
   assert.ok(printed,title+' '+id+' is missing from the printed catalogue');
   assert.equal(fieldEffectCopy(printed).includes('沒有可顯示的效果'),false,id);
  }
 }
 const suzuha=catalogues['steins-gate'].get('STG-1-004');
 assert.equal(suzuha.energy,2);
 assert.equal(suzuha.ap,1);
 assert.equal(suzuha.bp,3000);
 const text=fieldEffectCopy(suzuha);
 assert.match(text,/【我方回合中】/);
 assert.match(text,/BP\+1000/);
 assert.match(text,/抽1張卡片/);
 assert.equal(text.includes('沒有印刷效果'),false);
});
