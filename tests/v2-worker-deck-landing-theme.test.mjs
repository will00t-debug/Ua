import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('standalone V2 deck landing uses dark login-matched theme loaded last',()=>{
 const html=read('dist/index.html');
 const css=read('dist/arena-deck-landing.css');
 assert.match(html,/<body class="arena-site">/);
 assert.match(html,/href="arena-deck-landing\.css\?v=20261028a"/);
 assert.ok(html.indexOf('arena-deck-landing.css')>html.indexOf('arena-ui.css'),
  'Dark landing CSS must override older light builder styles');
 assert.match(css,/body\.arena-site \.v2e-shell\{/);
 assert.match(css,/--vdb-ink:#eff5ff/);
 assert.match(css,/\.vdb\.arena-editor>\.vdb-intro h1\{/);
 assert.match(css,/\.vdb-title-grid \.vdb-tile-info strong\{/);
 assert.match(css,/\.vdb-title-tile:focus-visible/);
 assert.match(css,/\.v2e-heading \.v2e-primary/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test('six works remain data-driven, selectable and shipped in Worker static assets',()=>{
 const js=read('dist/visual-deck-builder.mjs');
 const editor=read('dist/v2-deck-editor.mjs');
 const wrangler=JSON.parse(read('wrangler.jsonc'));
 assert.equal(wrangler.assets.directory,'./dist');
 assert.equal(wrangler.assets.html_handling,'none');
 assert.match(js,/list\.map\(item=>/);
 assert.match(js,/data-title=/);
 assert.match(js,/vdb-title-tile/);
 assert.match(js,/img\(pick\)/);
 assert.match(js,/item\.cards\.length/);
 assert.match(editor,/renderVisualDeckBuilder\(/);
 assert.match(editor,/bind\(\);/);
 assert.match(editor,/V2_EDITOR_TRANSFER_KEY/);
 assert.match(editor,/editorV2Status/);
 assert.match(editor,/data-arena-screen/);
});
