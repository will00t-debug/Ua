import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('V2 setup mirrors login theme while preserving all real interactive controls',()=>{
 const html=read('dist/universal-v2-preview.html');
 const css=read('dist/universal-v2-arena-setup.css');
 assert.match(html,/<body class="v2-arena-theme">/);
 assert.match(html,/href="universal-v2-arena-setup\.css\?v=20261028battle1"/);
 assert.match(css,/background:#080b11/);
 assert.match(css,/\.setup-actions #start-game/);
 assert.match(css,/\.deck-quick-pick\[aria-pressed="true"\]/);
 assert.match(css,/\.difficulty-choice\[aria-pressed="true"\]/);
 for(const id of ['my-title','ai-title','ai-level','first-player',
  'start-game','restart-notice','v2-coverage','designated-decks',
  'my-deck-description','ai-deck-description']){
  assert.match(html,new RegExp('id="'+id+'"'),'Missing V2 control: '+id);
 }
 for(const key of ['reject-blue','white-sword','renruki']){
  assert.equal((html.match(new RegExp('data-deck-key="'+key+'"','g'))||[]).length,2,
   key+' must appear in both player and AI deck selectors');
 }
 for(const value of ['easy','normal','hard'])
  assert.ok(html.includes('data-ai-difficulty="'+value+'"'));
 assert.ok(html.includes('開始 V2 對戰'));
 assert.doesNotMatch(html,/id="match-view"/);
 assert.match(read('dist/universal-v2-battle.html'),/id="match-view"/);
 assert.match(html,/每場新對局都會自動重新洗牌/);
 assert.doesNotMatch(html,/id="match-seed"|牌序種子/);
 assert.ok(html.includes('href="/index.html"'));
 assert.ok(html.includes('href="/online.html"'));
});

test('setup retains verified V2-only start path and responsive, accessible layout',()=>{
 const html=read('dist/universal-v2-preview.html');
 const js=read('dist/universal-v2-preview.mjs');
 const css=read('dist/universal-v2-arena-setup.css');
 assert.match(js,/newUniversalMatch\(app\.packs,/);
 assert.match(js,/legalUniversalActions\(app\.packs,s\)/);
 assert.match(js,/dispatchUniversalAction/);
 assert.match(js,/syncMatchLobby\(\)/);
 assert.match(js,/button\.dataset\.deckKey/);
 assert.match(js,/button\.dataset\.aiDifficulty/);
 assert.match(js,/validateUniversalDeck\(pack,counts\)/);
 assert.match(html,/aria-pressed="false"/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.doesNotMatch(html,/onclick=/);
});
