import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createAllV2PreviewRealDecks} from '../dist/universal-v2/preview-real-decks.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from '../dist/universal-v2/bleach-designated-decks.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('official root uses V2 while the editor never boots any legacy battle engine',()=>{
 const config=JSON.parse(read('../vercel.json'));
 assert.deepEqual(config.rewrites,[{source:'/',destination:'/universal-v2-preview.html'}]);
 const root=read('../dist/index.html');
 assert.ok(root.includes('src="v2-deck-editor.mjs'));
 assert.equal(root.includes('src="app.mjs'),false);
 const editor=read('../dist/v2-deck-editor.mjs');
 assert.equal(editor.includes("from './engine.mjs'"),false);
 assert.equal(editor.includes("from './match-runtime.mjs'"),false);
 assert.doesNotMatch(root,/src="universal-v2-preview.mjs/);
 assert.match(read('../dist/universal-v2-preview.html'),/src="universal-v2-preview.mjs"/);
});

test('battle UI is classic BLEACH Arena, but every action uses V2 legal reducer',()=>{
 const html=read('../dist/universal-v2-preview.html');
 const js=read('../dist/universal-v2-preview.mjs');
 const css=read('../dist/universal-v2-legacy.css');
 assert.match(html,/href="universal-v2-legacy\.css"/);
 assert.doesNotMatch(html,/href="universal-v2-preview\.css"/);
 for(const token of ['class:\x27arena\x27','class:\x27playerArea','class:\x27lineGroup\x27','class:\x27slots\x27',
  'class:\x27handCard ','class:\x27phaseBar\x27','class:\x27handArea\x27'])assert.ok(js.includes(token),'Expected original UI hook '+token);
 for(const token of ['.v2-shell .arena','.v2-shell .slot.rested .slotFace','.v2-shell .handCard','.v2-shell .lineGroup'])assert.ok(css.includes(token));
 assert.match(js,/dispatchUniversalAction\(app\.packs,app\.state,a,\{actor:0\}\)/);
 assert.match(js,/isExactLegal\(a,legal\)/);
 assert.match(js,/universalPublicView\(app\.packs,s,0\)/);
 assert.match(js,/app\.targetChoices=moves/);
 assert.doesNotMatch(js,/from '\.\/engine\.mjs'/);
});

test('production V2 browser modules parse as JavaScript',()=>{
 for(const path of ['dist/v2-deck-editor.mjs','dist/v2-editor-compat.mjs','dist/universal-v2-preview.mjs']){
  const res=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  assert.equal(res.status,0,path+': '+res.stderr);
 }
});

test('both source-pinned designated decks are playable on same V2 engine',()=>{
 const packs=createAllV2PreviewRealDecks(),pack=packs['bleach-green'].pack;
 const registered=new Set(Object.keys(pack.cards));
 const rows=summarizeDesignatedDecks(id=>registered.has(id));
 const blue=rows.find(r=>r.key==='reject-blue'),green=rows.find(r=>r.key==='white-sword');
 assert.ok(blue?.playable&&green?.playable);
 const decks=[designatedPlayableCounts(blue),designatedPlayableCounts(green)];
 for(const d of decks){
  assert.deepEqual(validateUniversalDeck(pack,d),[]);
  assert.equal(Object.values(d).reduce((a,b)=>a+b,0),50);
 }
 const s=newUniversalMatch([pack,pack],{decks,seed:2601,first:0});
 assertUniversalMatch([pack,pack],s);
 const action=legalUniversalActions([pack,pack],s).find(a=>a.type==='next');
 assert.ok(action);
 const after=dispatchUniversalAction([pack,pack],s,action,{actor:0});
 assertUniversalMatch([pack,pack],after);
});
