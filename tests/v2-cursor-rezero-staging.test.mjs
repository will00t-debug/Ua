import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLES} from '../dist/title-registry.mjs';
import {REZERO_CARDS} from '../dist/rezero-cards.mjs';
import {REZERO_VOL2_CARDS} from '../dist/rezero-vol2.mjs';
import {REZERO_ALL_CARDS,REZERO_ALL_BY_ID,normalizeRezCounts,emptyRezDeck,rezDeckIssues} from '../dist/rezero-builder.mjs';
import {makeVisualDeckModel,renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';

test('Cursor Re:Zero official catalogues coexist with disjoint playable card IDs',()=>{
 assert.equal(REZERO_CARDS.length,113);
 assert.equal(REZERO_VOL2_CARDS.length,73);
 assert.equal(REZERO_ALL_CARDS.length,186);
 const t=TITLES.find(t=>t.id==='rezero');
 assert.equal(t.cards.length,186);
 assert.equal(new Set(t.cards.map(c=>c.id)).size,186);
 assert.equal(t.playable,false);
 assert.ok(t.cards.every(c=>c.type!=='action-point'&&c.type!=='action_point'));
});
test('Re:Zero first and second set share 50-card draft without collision or data loss',()=>{
 const a=REZERO_CARDS[0],b=REZERO_VOL2_CARDS[0];
 const counts=normalizeRezCounts({[a.id]:4,[b.id]:3});
 assert.equal(counts[a.id],4);assert.equal(counts[b.id],3);
 assert.equal(Object.keys(counts).length,186);
 assert.equal(Object.values(emptyRezDeck()).reduce((x,y)=>x+y,0),0);
 assert.equal(rezDeckIssues(counts).some(s=>s.includes('7/50')),true);
 assert.equal(REZERO_ALL_BY_ID[a.id],a);
 assert.equal(REZERO_ALL_BY_ID[b.id],b);
});
test('Re:Zero included in theme chooser, picker and image-based grouping',()=>{
 const t=TITLES.find(t=>t.id==='rezero'),a=REZERO_CARDS[0],b=REZERO_VOL2_CARDS[0];
 const counts={[a.id]:4,[b.id]:3};
 const selected=makeVisualDeckModel({cards:t.cards,counts,color:'all',type:'all',energy:'all'});
 assert.equal(selected.total,7);
 const common={titles:TITLES,titleId:'rezero',ready:true,tab:'overview',search:'',type:'all',color:'all',energy:'all',counts,name:'Re:Zero 測試',nameId:'rezDeckName',savedId:'rezSavedSelect',savedOptions:[],saveAction:'rezSave',newAction:'rezNew',issues:[]};
 const html=renderVisualDeckBuilder(common);
 assert.match(html,/Re:Zero/);
 assert.match(html,/×4/);assert.match(html,/×3/);
 assert.match(renderVisualDeckBuilder({...common,ready:false}),/data-title="rezero"/);
});
test('staging keeps original V2 engine / UI entry and independently stored Re:Zero drafts',()=>{
 const app=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(app,/rezero:\{counts:rezDeck/);
 assert.match(app,/else if\(ui.title==='rezero'\)persistRez\(\)/);
 assert.match(app,/ua-rez-draft-v1/);
 const root=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(root.rewrites[0].destination,'/universal-v2-preview.html');
});
