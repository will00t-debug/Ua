import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARDS} from '../dist/cards.mjs';
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
