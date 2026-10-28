import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';
import {TITLE_LOGOS,titleLogo} from '../dist/title-logos.mjs';
import {TITLES} from '../dist/title-registry.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const build=()=>renderVisualDeckBuilder({
 titles:TITLES.map(title=>({id:title.id,label:title.label,cards:[
  {id:title.id+'-sample',image:'assets/cards/example-card.png',name:'代表卡',type:'character',energy:0}
 ]})),titleId:'bleach',ready:false
});

test('all six supported works display their actual Wikimedia series wordmark, not a card thumbnail',()=>{
 assert.equal(Object.keys(TITLE_LOGOS).length,6);
 assert.deepEqual(new Set(Object.keys(TITLE_LOGOS)),new Set(TITLES.map(t=>t.id)));
 const markup=build();
 assert.equal((markup.match(/class="vdb-title-tile/g)||[]).length,6);
 assert.equal((markup.match(/class="vdb-title-logo"/g)||[]).length,6);
 assert.doesNotMatch(markup,/src="assets\/cards\/example-card\.png"/);
 for(const title of TITLES){
  const logo=titleLogo(title.id);
  assert.ok(logo,'logo missing for '+title.id);
  assert.match(logo.image,/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/[a-f0-9]\/[a-f0-9]{2}\/.+\.svg$/);
  assert.match(logo.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.ok(markup.includes('data-title="'+title.id+'"'));
  assert.ok(markup.includes('src="'+logo.image.replaceAll('&','&amp;')+'"'));
  assert.ok(markup.includes('alt="'+logo.label+' Logo"'));
 }
});

test('logo errors show text fallback and attribution is accessible',()=>{
 const html=build();
 assert.equal((html.match(/this\.nextElementSibling\.hidden=false/g)||[]).length,6);
 assert.equal((html.match(/class="vdb-title-logo-fallback" hidden/g)||[]).length,6);
 assert.match(html,/referrerpolicy="no-referrer"/);
 assert.match(html,/loading="lazy" decoding="async"/);
 assert.match(html,/<summary>作品 Logo 來源與授權<\/summary>/);
 assert.match(html,/CC BY-SA 4\.0/);
 assert.match(html,/https:\/\/creativecommons\.org\/licenses\/by-sa\/4\.0\//);
 for(const logo of Object.values(TITLE_LOGOS))
  assert.ok(html.includes('href="'+logo.source.replaceAll('&','&amp;')+'"'),'missing credit '+logo.label);
});

test('mobile layout centers logo inside each series tile without altering cards in actual editor',()=>{
 const css=read('dist/arena-deck-landing.css');
 assert.match(css,/\.vdb-title-logo-plate\{/);
 assert.match(css,/\.vdb-tile-art img\.vdb-title-logo\{/);
 assert.match(css,/transform:none/);
 assert.match(css,/img\.vdb-title-logo\[hidden\]/);
 assert.match(css,/@media\(max-width:680px\)/);
 const active=renderVisualDeckBuilder({
  titles:[{id:'bleach',label:'BLEACH',cards:[{id:'x',image:'x.png',type:'character',energy:0}]}],
  titleId:'bleach',ready:true,counts:{x:2},tab:'pick'
 });
 assert.match(active,/src="x\.png"/,'ordinary editor card art must stay unchanged');
 assert.doesNotMatch(active,/vdb-title-logo-plate/,'logo only replaces title picker art');
});

test('unknown or future series without a known brand logo keep compatible artwork fallback',()=>{
 const html=renderVisualDeckBuilder({titles:[{id:'new-title',label:'新作品',cards:[
  {id:'card',image:'new-title-card.png',type:'character'}
 ]}],ready:false});
 assert.match(html,/src="new-title-card\.png"/);
 assert.doesNotMatch(html,/class="vdb-title-logo"/);
 assert.doesNotMatch(html,/作品 Logo 來源與授權/);
});
