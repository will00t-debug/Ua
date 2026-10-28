import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all four V2 screens use one shared branded header stylesheet and mobile navigation model',()=>{
 for(const page of ['dist/online.html','dist/index.html','dist/universal-v2-preview.html','dist/universal-v2-battle.html']){
  const html=read(page);
  assert.match(html,/arena-site-header\.css\?v=20261028header1/,page);
 }
 const css=read('dist/arena-site-header.css');
 assert.match(css,/\.ua-site-header\{/);
 assert.match(css,/grid-template-columns:auto minmax\(0,1fr\) auto/);
 assert.match(css,/\.ua-header-nav\{/);
 assert.match(css,/flex-wrap:nowrap/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/scrollbar-width:none/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/body\.arena-site #app\.wrap\{max-width:none/);
 assert.match(css,/\[aria-current="page"\]/);
 assert.match(css,/:focus-visible/);
});

test('online, deck library, solo setup and battle show consistent brand/nav links',()=>{
 const sources=[
  read('dist/online.mjs'),
  read('dist/v2-deck-editor.mjs'),
  read('dist/universal-v2-preview.html'),
  read('dist/universal-v2-battle.html')
 ];
 const nav=['首頁','對戰','牌組','卡牌一覽','排行榜','規則／FAQ'];
 const targets=['/online.html','/universal-v2-preview.html','/index.html',
  '/index.html#cards'];
 for(const [i,s] of sources.entries()){
  assert.match(s,/ua-site-header/,'header '+i);
  assert.match(s,/ua-header-brand/,'brand '+i);
  assert.match(s,/ua-header-overline/,'brand overline '+i);
  assert.match(s,/ua-header-logo/,'logo '+i);
  assert.match(s,/ua-header-nav/,'nav '+i);
  assert.match(s,/ua-header-account/,'account '+i);
  for(const item of nav)assert.ok(s.includes(item),'missing nav '+item+' in '+i);
  for(const href of targets)assert.ok(s.includes(href),'missing '+href+' in '+i);
 }
 // Static pages and JS renderers display the exact same section order.
 for(const s of sources){
  const begin=s.indexOf('ua-header-nav');
  assert.ok(begin>=0);
  const segment=s.slice(begin,begin+1600);
  let prev=-1;
  for(const item of nav){
   const pos=segment.indexOf(item);
   assert.ok(pos>prev,'nav item out of order: '+item);
   prev=pos;
  }
 }
});

test('account controls, SPA screens and match exit remain functional',()=>{
 const online=read('dist/online.mjs'),editor=read('dist/v2-deck-editor.mjs');
 const battle=read('dist/universal-v2-battle.html');
 assert.match(online,/ua-header-username/);
 assert.match(online,/ua-header-logout/);
 assert.match(online,/onClick:logout/);
 assert.match(online,/text:'登出'/);
 assert.match(editor,/data-arena-screen="records"/);
 assert.match(editor,/data-arena-screen="rules"/);
 assert.match(editor,/aria-current="page"/);
 assert.match(battle,/id="exit-battle"/);
 assert.match(battle,/class="battle-subbar"/);
 assert.match(battle,/id="match-view"/);
 assert.match(read('dist/universal-v2-preview.html'),/id="start-game"/);
 assert.doesNotMatch(read('dist/universal-v2-preview.html'),/id="match-view"/);
 assert.match(read('dist/universal-v2-preview.mjs'),/window\.confirm\('返回對戰設定將結束這場對局/);
});

test('shared UI scripts remain valid JavaScript and never import the old battle reducer',()=>{
 for(const file of ['dist/online.mjs','dist/v2-deck-editor.mjs','dist/universal-v2-preview.mjs']){
  const out=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(out.status,0,file+': '+out.stderr);
 }
 const editor=read('dist/v2-deck-editor.mjs');
 assert.doesNotMatch(editor,/from '\.\/engine\.mjs'/);
 const v2=read('dist/universal-v2-preview.mjs');
 assert.match(v2,/legalUniversalActions/);
 assert.match(v2,/dispatchUniversalAction/);
});
