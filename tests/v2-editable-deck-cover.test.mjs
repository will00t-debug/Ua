import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {coverChoices,displayCoverCard,validDeckCoverId} from '../dist/deck-cover-selection.mjs';
import {renderVisualDeckBuilder} from '../dist/visual-deck-builder.mjs';
import {openDatabase} from '../server/sqlite.mjs';
import {createRepositories} from '../server/repos.mjs';
import {dispatchAccount} from '../server/domain.mjs';
import {BLEACH_PURPLE_V2_PILOT_COUNTS} from '../dist/universal-v2/verified-real-decks.mjs';
import {normalizeEditorCounts} from '../dist/v2-editor-compat.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const cards=[
 {id:'card-A',name:'角色甲',type:'character',color:'purple',energy:0,gen:1,image:'a.png'},
 {id:'card-B',name:'角色乙',type:'character',color:'purple',energy:1,gen:2,image:'b.png'},
 {id:'card-C',name:'事件丙',type:'event',color:'blue',energy:2,gen:0,image:'c.png'},
 {id:'AP-1',name:'AP',type:'ap',energy:0,image:'ap.png'}
];
const counts={'card-A':2,'card-B':1,'card-C':0,'AP-1':1};
const config={
 titles:[{id:'bleach',label:'BLEACH',cards}],titleId:'bleach',
 ready:true,tab:'pick',counts,name:'封面測試牌組',nameId:'v2DeckName',
 savedId:'v2SavedSelect',savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',
 issues:[],coverId:'card-B'
};

test('only chosen, non-AP cards can become a deck cover',()=>{
 assert.deepEqual(coverChoices(cards,counts).map(c=>c.id),['card-A','card-B']);
 assert.equal(validDeckCoverId(cards,counts,'card-B'),'card-B');
 assert.equal(validDeckCoverId(cards,counts,'card-C'),null);
 assert.equal(validDeckCoverId(cards,counts,'AP-1'),null);
 assert.equal(validDeckCoverId(cards,counts,'not-a-real-card'),null);
 assert.equal(displayCoverCard(cards,counts,'card-B').id,'card-B');
 assert.equal(displayCoverCard(cards,counts,null).id,'card-A');
 assert.equal(displayCoverCard(cards,{'card-A':0,'card-B':0},'card-B'),null);
});

test('clickable hero cover opens modal with selected card art and allowed choices',()=>{
 const closed=renderVisualDeckBuilder(config);
 assert.match(closed,/data-builder-cover-open="1"/);
 assert.match(closed,/aria-label="更換牌組封面"/);
 assert.match(closed,/class="arena-hero-cover"[\s\S]*?src="b.png"/);
 assert.doesNotMatch(closed,/class="arena-cover-backdrop"/);
 const html=renderVisualDeckBuilder({...config,coverPicker:true});
 assert.match(html,/role="dialog" aria-modal="true" aria-label="選擇牌組封面"/);
 assert.match(html,/data-builder-cover-select="card-A"/);
 assert.match(html,/data-builder-cover-select="card-B"/);
 assert.doesNotMatch(html,/data-builder-cover-select="card-C"/);
 assert.doesNotMatch(html,/data-builder-cover-select="AP-1"/);
 assert.match(html,/data-builder-cover-select="card-B" aria-pressed="true"/);
 assert.match(html,/data-builder-cover-close="1"/);
 assert.match(html,/data-builder-cover-reset="1"/);
 assert.match(html,/data-action="saveDeck"/);
 assert.match(html,/class="arena-info"[\s\S]*?<\/aside><\/div>$/);
 const empty=renderVisualDeckBuilder({...config,counts:{},coverPicker:true,coverId:'card-A'});
 assert.match(empty,/先在下方列表點「＋」加入卡片/);
 const style=read('dist/arena-deck-mockup.css');
 assert.match(style,/\.arena-cover-backdrop/);
 assert.match(style,/\.arena-cover-option\.is-chosen/);
});

test('production editor wires cover selection, draft persistence, saving and cloud handoff',()=>{
 const js=read('dist/v2-deck-editor.mjs');
 const online=read('dist/online.mjs');
 const page=read('dist/index.html');
 assert.match(js,/coversKey='ua-v2-editor-draft-covers-v1'/);
 assert.match(js,/state\.coverIds\[state\.title\]=id/);
 assert.match(js,/if\(data\.builderCoverSelect!==undefined\)/);
 assert.match(js,/if\(data\.builderCoverOpen!==undefined\)/);
 assert.match(js,/coverId:state\.coverIds\[state\.title\]/);
 assert.match(js,/coverId\}\;/);
 assert.match(js,/localId,coverId:entry\.coverId\|\|null/);
 assert.match(online,/coverId:deck\.coverId\|\|null/);
 assert.match(page,/arena-deck-mockup\.css\?v=20261028cardoverlay1/);
 assert.match(page,/v2-deck-editor\.mjs\?v=20261028cardoverlay1/);
});

test('registered account deck cover persists in SQLite and rejects foreign/absent card IDs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ua-deck-cover-'));
 const db=openDatabase(join(dir,'account.sqlite')),repos=createRepositories(db);
 const account=message=>db.transaction(()=>dispatchAccount(repos,message,Date.now()));
 try{
  const {token}=account({op:'register',username:'封面測試',password:'correct-horse-1',ip:'192.0.2.1'});
  const normalized=normalizeEditorCounts('bleach',BLEACH_PURPLE_V2_PILOT_COUNTS);
  const first=Object.keys(normalized)[0];
  const second=Object.keys(normalized)[1];
  const created=account({op:'saveDeck',token,input:{
   title:'bleach',name:'換封面',counts:BLEACH_PURPLE_V2_PILOT_COUNTS,localId:'cover-test',coverId:first
  }}).deck;
  assert.equal(created.coverId,first);
  assert.equal(account({op:'listDecks',token}).decks[0].coverId,first);
  const updated=account({op:'updateDeck',token,deckId:created.id,input:{
   title:'bleach',name:'換過封面',counts:BLEACH_PURPLE_V2_PILOT_COUNTS,coverId:second
  }}).deck;
  assert.equal(updated.id,created.id);
  assert.equal(updated.coverId,second);
  assert.equal(account({op:'listDecks',token}).decks[0].coverId,second);
  assert.throws(()=>account({op:'updateDeck',token,deckId:created.id,input:{
   title:'bleach',name:'錯誤封面',counts:BLEACH_PURPLE_V2_PILOT_COUNTS,coverId:'forged-id'
  }}),/封面必須選擇/);
  assert.equal(account({op:'listDecks',token}).decks[0].coverId,second);
 }finally{db.close();await rm(dir,{recursive:true,force:true});}
});
