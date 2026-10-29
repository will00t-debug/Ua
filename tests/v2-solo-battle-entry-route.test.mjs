import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const SOLO='/universal-v2-preview.html';

test('account battle lobby solo link opens actual V2 setup instead of the account root',()=>{
 const online=read('dist/online.mjs');
 const worker=read('worker/index.mjs');
 assert.match(worker,/\x27\/\x27:\x27\/online\.html\x27/);
 assert.match(worker,/\x27\/universal-v2-preview\.html\x27:\x27\/universal-v2-preview\.html\x27/);
 assert.ok(online.includes("class:'arena-entry arena-entry-solo',href:'"+SOLO+"'"),
  'solo card must not target /, which Worker renders as the account lobby');
 assert.ok(online.includes("el('a',{href:'"+SOLO+"',text:'對戰'})"));
 assert.doesNotMatch(online,/class:'arena-entry arena-entry-solo',href:'\/'/);
});

test('deck editor battle navigation points to the same V2 settings page',()=>{
 const editor=read('dist/v2-deck-editor.mjs');
 assert.ok(editor.includes('href="'+SOLO+'">對戰</a>'));
 assert.doesNotMatch(editor,/class="v2e-primary" href="\/universal-v2-preview\.html">前往 V2 對戰/);
 assert.ok(editor.includes('data-action="v2Play"')||editor.includes("data.action==='v2Play'"));
 assert.doesNotMatch(editor,/href="\/">(?:對戰|前往 V2 對戰)<\/a>/);
});

test('V2 destination exposes opponent deck, real AI difficulty and start match controls',()=>{
 const html=read('dist/universal-v2-preview.html');
 const js=read('dist/universal-v2-preview.mjs');
 for(const id of ['my-title','ai-title','ai-level','start-game'])
  assert.ok(html.includes('id="'+id+'"'),'missing real V2 control '+id);
 for(const d of ['easy','normal','hard'])
  assert.ok(html.includes('data-ai-difficulty="'+d+'"'));
 assert.ok(js.includes("$('start-game').addEventListener('click'"));
 assert.match(read('dist/universal-v2-battle.html'),/id="match-view"/);
 assert.doesNotMatch(html,/id="match-view"/);
 assert.ok(js.includes("app.aiDifficulty=$('ai-level').value"));
 assert.ok(js.includes('newUniversalMatch(app.packs,'));
 assert.ok(js.includes('legalUniversalActions(app.packs,s)'));
});

test('public static pages cache-bust the repaired clickable module URLs',()=>{
 assert.match(read('dist/online.html'),/online\.mjs\?v=20261030entry1/);
 assert.match(read('dist/online.html'),/online\.css\?v=20261030entry1/);
 assert.match(read('dist/index.html'),/v2-deck-editor\.mjs\?v=20261029mstart1/);
});
