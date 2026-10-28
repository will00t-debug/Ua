import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIELD_HOLD_MS} from '../dist/universal-v2/preview-actions.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const script=read('dist/universal-v2-preview.mjs');
const hand=script.split('function legacyHand(view,legal){')[1]?.split('function legacyCommands(legal){')[0];
const commands=script.split('function legacyCommands(legal){')[1]?.split('// Keep an in-progress AI match alive')[0];

test('holding a hand card one second opens printed artwork and effect without short-click selection',()=>{
 assert.equal(FIELD_HOLD_MS,1000);
 assert.ok(hand);
 assert.match(hand,/showFieldSheet\(0,'hand',c,d\)/);
 assert.match(hand,/setTimeout\(\(\)=>\{held=true;showFieldSheet\(0,'hand',c,d\);\},FIELD_HOLD_MS\)/);
 assert.match(hand,/pointerdown/);
 assert.match(hand,/pointerup/);
 assert.match(hand,/pointercancel/);
 assert.match(hand,/pointerleave/);
 assert.match(hand,/pointermove/);
 assert.match(hand,/Math\.hypot\(event\.clientX-originX,event\.clientY-originY\)>16/);
 assert.match(hand,/contextmenu/);
 assert.match(hand,/if\(held\)\{held=false;return;\}/);
 assert.match(hand,/app\.selectedUid=c\.uid/);
 assert.match(script,/fieldEffectCopy\(catalogue\)/);
 assert.match(script,/const art=el\('img',\{class:'art',src:imgUrl\(side,card\.cardId\)/);
 const sheet=script.split('function showFieldSheet(')[1]?.split('function clearPendingOverlay()')[0];
 assert.match(sheet,/const metadata=printed\|\|catalogue/);
 assert.match(sheet,/if\(line==='energy'\)/);
});

test('no giant legal actions panel; contextual non-placement actions remain playable',()=>{
 assert.ok(commands);
 assert.doesNotMatch(commands,/class:'selectionBar'|查看全部合法動作|收合全部動作/);
 assert.match(commands,/if\(uiActor\(s\)!==0\|\|app\.busy\|\|s\.pending\)return null/);
 assert.match(commands,/if\(!list\.length&&!raidReady&&!app\.targetChoices\)return null/);
 assert.match(commands,/class:'v2-compact-actions'/);
 assert.match(commands,/app\.targetChoices/);
 assert.match(commands,/!\['play','move'\]\.includes\(a\.type\)/);
 assert.match(commands,/uiActionLabel\(a,\{pack:app\.packs,state:s\}\)/);
 assert.match(commands,/applyAction\(a\)/);
 const render=script.split('function render(){')[1]?.split('function applyAction(a)')[0];
 assert.match(render,/legacyHand\(v,legal\),legacyCommands\(legal\)/);
 assert.doesNotMatch(render,/legacyCommands\(legal\),legacyHand\(v,legal\)/);
 const css=read('dist/universal-v2-legacy.css');
 assert.match(css,/\.v2-compact-actions\{/);
 assert.match(css,/\.handCard img\{pointer-events:none/);
 assert.match(css,/\.handCard\{touch-action:pan-y\}/);
 assert.match(css,/#match-view \\.v2-middle-next\\{[\\s\\S]*?width:auto;max-width:none/);
 assert.match(css,/min-height:36px/);
});
