import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=load('dist/union-arena-card-backs.css');
test('user-supplied Union Arena red back is a real local WebP asset',()=>{
 const image=readFileSync(new URL('../dist/assets/union-arena-card-back.webp',import.meta.url));
 assert.equal(image.toString('ascii',0,4),'RIFF');
 assert.equal(image.toString('ascii',8,12),'WEBP');
 assert.ok(image.length>1500&&image.length<50000);
 assert.match(css,/--ua-card-back-image:url\("assets\/union-arena-card-back\.webp"\)/);
});
test('solo and online entry points include the same fingerprinted back stylesheet',()=>{
 for(const page of ['dist/universal-v2-battle.html','dist/universal-v2-preview.html','dist/online.html'])
  assert.match(load(page),/union-arena-card-backs\.css\?v=20261105redcard1/);
 assert.match(load('dist/universal-v2/online-battle-ui.mjs'),
  /universal-v2-reference-table\.css','union-arena-card-backs\.css'/);
 assert.match(load('dist/online.mjs'),/online-battle-ui\.mjs\?v=20261105removedmain1/);
});
test('hidden LIFE, deck, opponent hand and buried card positions share the back art',()=>{
 for(const selector of ['.lifeCard','.v2-deck-stack','.v2-desktop-opponent-hand i',
 '.hidden-hand i','.slot.facedown','.v2-facedown-back','.deck-thumb'])
  assert.ok(css.includes(selector),selector+' must render the physical red card back');
 assert.match(css,/\.lifeCard\.v2-life-spent\{[\s\S]*?background-image:none!important/);
 assert.match(css,/\.lifeCard\.v2-life-selected/);
 assert.match(css,/\.lifeCard\.v2-life-target/);
 // Printed face art and AP face artwork must remain unchanged.
 assert.doesNotMatch(css,/\.apCard\s*\{/);
 assert.doesNotMatch(css,/\.v2-outside-preview\s*\{/);
});
