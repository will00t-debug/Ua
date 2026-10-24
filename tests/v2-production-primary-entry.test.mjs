import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('production root exclusively resolves to the V2 entry point', () => {
  const routes = JSON.parse(read('vercel.json'));
  assert.ok(routes.rewrites.some(route => route.source === '/' && route.destination === '/universal-v2-preview.html'));
  const entry = read('dist/universal-v2-preview.html');
  assert.match(entry, /<script type="module" src="universal-v2-preview\.mjs"/);
  assert.match(entry, /UNION ARENA V2 正式對戰/);
  assert.doesNotMatch(entry, /EXPERIMENTAL · V2 PREVIEW/);
});

test('classic deck editor redirects all legacy battle entries to V2', () => {
  const editor = read('dist/app.mjs');
  assert.ok(editor.includes("function chooseView(view){if(PUBLIC_EDITOR_ONLY&&['arena','soloArena','ttgArena'].includes(view)){window.location.assign('/');return;}"));
  assert.ok(editor.includes("if(PUBLIC_EDITOR_ONLY&&['arena','soloArena','ttgArena'].includes(ui.view)){window.location.replace('/');return;}"));
  for (const action of ['start','soloTrainingStartShadow','soloTrainingStartCustom','soloTrainingStart','ttgBetaStartGreen','ttgBetaStartRed','ttgBetaStartDeck'])
    assert.ok(editor.includes("'"+action+"'"), action+' must be redirected');
  assert.match(editor, /舊版與各作品獨立 Beta 對戰入口/);
  assert.match(read('dist/index.html'), /牌組編輯與卡片圖鑑/);
});
