import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDeckLibrary} from '../dist/deck-library.mjs';
import {renderDeckGallery,renderDeckDetail,summarizeDeck,formatDeckUpdated} from '../dist/deck-gallery.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const card=(id,color='blue')=>({id,name:'Card '+id,type:'character',color,image:'assets/cards/'+id+'.png'});
const titles=[
 {id:'bleach',label:'BLEACH 千年血戰篇',cards:[card('a'),card('b')]},
 {id:'sword-art-online',label:'刀劍神域',cards:[card('s','green')]}
];
const kwargs={titles,summarize:summarizeDeck,formatUpdated:formatDeckUpdated,
 names:{bleach:'BLEACH 草稿'},draftData:{bleach:{a:2}},builtins:[]};

test('deck library lists a logged-in account across titles and avoids duplicate local mirrors',()=>{
 const sections=buildDeckLibrary({...kwargs,cloudUser:'userA',
  cloudDecks:[{id:'d01234567890abcde',name:'雲端白劍',title:'bleach',counts:{b:4},
   localId:'local-one',updatedAt:'2026-10-27T09:00:00Z',playable:true},
   {id:'dabcdefabcdefabcd',name:'刀劍收藏',title:'sword-art-online',counts:{s:3},
    localId:null,updatedAt:'2026-10-28T00:00:00Z',playable:false}],
  savedData:{bleach:[{id:'local-one',name:'鏡像',counts:{b:4}}, {id:'another',name:'本機牌組',counts:{a:2}}],
   'sword-art-online':[]}});
 assert.equal(sections[0].title,'帳號牌組');
 assert.equal(sections[0].items.length,2);
 assert.equal(sections[0].items[0].name,'刀劍收藏');
 assert.equal(sections[0].items[1].key,'cloud:d01234567890abcde');
 assert.match(sections[0].items[1].meta,/V2 可對戰/);
 assert.equal(sections[1].title,'本機牌組');
 assert.deepEqual(sections[1].items.map(x=>x.name),['本機牌組']);
 assert.ok(sections.some(x=>x.title==='編輯中的草稿'));
 const view=renderDeckGallery({tab:'mine',sections,mode:'library'});
 assert.match(view,/dkg-library/);
 assert.match(view,/data-deck-open="cloud:d01234567890abcde"/);
 assert.match(view,/data-deck-open="saved:bleach:another"/);
 assert.match(view,/data-action="pickTitle"/);
 assert.match(view,/assets\/cards\/b\.png/);
 assert.doesNotMatch(view,/class="dkg-toolbar"/);
});

test('shared tab shows only opted-in saved and cloud decks',()=>{
 const sections=buildDeckLibrary({...kwargs,tab:'shared',cloudUser:'userA',
  cloudDecks:[{id:'d01234567890abcde',title:'bleach',name:'分享雲端',counts:{a:4}},
   {id:'d222222222222222',title:'bleach',name:'私人雲端',counts:{a:1}}],
  sharedIds:new Set(['d01234567890abcde']),
  savedData:{bleach:[{id:'public',name:'分享本機',counts:{a:3},shared:true},
   {id:'private',name:'私人本機',counts:{b:2},shared:false}]}});
 assert.deepEqual(sections.flatMap(x=>x.items.map(y=>y.name)),['分享雲端','分享本機']);
 assert.equal(sections[0].title,'大家的公開牌組');
 assert.ok(!sections.some(x=>x.title==='編輯中的草稿'));
 assert.ok(!renderDeckGallery({tab:'shared',sections,mode:'library'}).includes('data-action="pickTitle"'));
});

test('shared tab lists other accounts public decks and keeps private decks out',()=>{
 const sections=buildDeckLibrary({...kwargs,tab:'shared',cloudUser:'userA',
  cloudDecks:[{id:'d01234567890abcde',title:'bleach',name:'自己的白哉',counts:{a:4},shared:true},
   {id:'d222222222222222',title:'bleach',name:'自己的私人',counts:{a:1},shared:false}],
  publicDecks:[
   {id:'d01234567890abcde',title:'bleach',name:'自己的白哉',counts:{a:4},owner:'userA',playable:true,updatedAt:'2026-11-01T01:00:00Z'},
   {id:'d3333333333333333',title:'bleach',name:'<img src=x onerror=alert(1)>',counts:{b:2},owner:'夜一',playable:false,updatedAt:'2026-11-01T02:00:00Z'},
   {id:'not-a-deck',title:'bleach',name:'壞掉',counts:{a:1},owner:'夜一'}
  ],
  sharedIds:new Set(),
  savedData:{bleach:[]}});
 assert.deepEqual(sections[0].items.map(item=>item.name),['<img src=x onerror=alert(1)>','自己的白哉']);
 assert.equal(sections[0].items[1].key,'public:d01234567890abcde');
 assert.match(sections[0].items[0].meta,/夜一 公開/);
 assert.deepEqual(sections[1].items.map(item=>item.name),['自己的白哉']);
 const view=renderDeckGallery({tab:'shared',sections,mode:'library'});
 assert.match(view,/大家的公開牌組/);
 assert.match(view,/分享列表/);
 assert.match(view,/其他人也看得到/);
 assert.ok(view.includes('&lt;img'));
 assert.ok(!view.includes('<img src=x onerror=alert(1)>'));
 assert.match(view,/data-deck-open="public:d3333333333333333"/);
});

test('invalid cloud record IDs are excluded and names are safely escaped in library HTML',()=>{
 const sections=buildDeckLibrary({...kwargs,cloudUser:'user',
  cloudDecks:[{id:'wrong-id',title:'bleach',name:'Bad',counts:{a:4}}],
  savedData:{bleach:[{id:'safe',name:'<img src=x onerror=alert(1)>',counts:{a:1}}]}});
 assert.equal(sections[0].items.length,0);
 const view=renderDeckGallery({sections,mode:'library'});
 assert.ok(view.includes('&lt;img'));
 assert.ok(!view.includes('<img src=x onerror=alert(1)>'));
});

test('tapping a deck opens real card gallery and editable controls stay accessible',()=>{
 const view=renderDeckDetail({name:'白劍',updatedLabel:'今天更新',cover:card('a'),
  total:4,groups:[{id:'character',label:'角色',total:4,entries:[{card:card('a'),count:4}]}],
  triggers:{active:2},battleReady:false});
 assert.match(view,/data-action="editDeck"/);
 assert.match(view,/data-deck-back="1"/);
 assert.match(view,/data-inspect="a"/);
 assert.match(view,/4 張/);
 assert.match(view,/data-action="v2Play" disabled/);
});

test('production deck builder starts at owned library and can navigate to editor and V2',()=>{
 const js=read('dist/v2-deck-editor.mjs');
 const html=read('dist/index.html');
 const css=read('dist/arena-deck-library.css');
 assert.match(js,/screen:'library'/);
 assert.match(js,/buildDeckLibrary\(/);
 assert.match(js,/function openLibraryDeck\(key\)/);
 assert.match(js,/data\.deckOpen\)\{if\(state\.screen==='library'\)openLibraryDeck/);
 assert.match(js,/state\.screen==='chooseTitle'/);
 assert.match(js,/data\.action==='backLibrary'/);
 assert.match(js,/mirrorCloudDeck\(title,entry\)/);
 assert.match(js,/window\.location\.assign\('\/universal-v2-preview\.html'\)/);
 assert.match(js,/fetch\('\/api\/decks',options\)/);
 assert.match(html,/arena-deck-library\.css\?v=20261028library1/);
 assert.match(html,/v2-deck-editor\.mjs\?v=20261102kmr2ship1/);
 assert.match(read('dist/online.html'),/arena-deck-library\.css\?v=20261028library1/);
 assert.match(css,/\.dkg-library \.dkg-card/);
 assert.match(css,/\.deck-library-detail \.dkg-board/);
 assert.match(css,/@media\(max-width:680px\)/);
});
