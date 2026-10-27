import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDeck,formatDeckUpdated,renderDeckGallery,renderDeckDetail,readSharedIds,writeSharedFlag,DECK_SHARE_KEY} from '../dist/deck-gallery.mjs';

const cards=[
 {id:'E',number:'BLC-1-064',name:'事件先',type:'event',color:'purple',trigger:'special',image:'event.png'},
 {id:'C',number:'BLC-1-039',name:'角色甲',type:'character',color:'purple',trigger:'active',image:'char.png'},
 {id:'F',number:'BLC-1-108',name:'場地丙',type:'field',color:'purple',trigger:'get',image:'field.png'},
 {id:'D',number:'BLC-1-034',name:'角色乙',nameZh:'雨龍',type:'character',color:'purple',trigger:'draw',image:'draw.png'},
 {id:'R',number:'BLC-1-104',name:'突進角色',type:'character',color:'purple',trigger:'raid',image:'raid.png'},
 {id:'S',number:'BLC-1-066',name:'終焉',type:'event',color:'purple',trigger:'final',image:'final.png'},
 {id:'K',number:'BLC-1-090',name:'顏色',type:'event',color:'green',trigger:'color',image:'color.png'},
 {id:'AP',name:'AP 卡',type:'action_point',image:'ap.png'}
];

test('detail summary groups copies by type, ignores AP, and falls back to the first character',()=>{
 const summary=summarizeDeck(cards,{E:2,C:4,F:1,AP:3,missing:4});
 assert.equal(summary.total,7);
 assert.equal(summary.cover.id,'C');
 assert.deepEqual(summary.groups.map(group=>[group.id,group.total]),[['character',4],['event',2],['field',1]]);
 assert.equal(summary.triggers.active,4);
 assert.equal(summary.triggers.special,2);
 assert.equal(summary.triggers.draw,0);
 const explicit=summarizeDeck(cards,{E:1,C:1},'E');
 assert.equal(explicit.cover.id,'E');
 const empty=summarizeDeck(cards,{});
 assert.equal(empty.total,0);
 assert.equal(empty.cover.id,'E');
});

test('trigger block always lists the seven keywords, including zeroes, in the reference order',()=>{
 const summary=summarizeDeck(cards,{C:1,D:2,R:3,S:1,K:4,F:1});
 const html=renderDeckDetail({
  name:'<script>',updatedLabel:'更新於 2026.10.13',shared:false,shareEnabled:true,
  cover:summary.cover,total:summary.total,groups:summary.groups,triggers:summary.triggers,battleReady:false
 });
 assert.match(html,/激活 <b>×1<\/b>[\s\S]*獲得 <b>×1<\/b>[\s\S]*抽牌 <b>×2<\/b>[\s\S]*突進 <b>×3<\/b>[\s\S]*COLOR <b>×4<\/b>[\s\S]*SPECIAL <b>×0<\/b>[\s\S]*FINAL <b>×1<\/b>/);
 assert.match(html,/角色 <span>6 張/);
 assert.match(html,/事件 <span>5 張/);
 assert.match(html,/場地 <span>1 張/);
 assert.match(html,/class="dkg-count">4/);
 assert.match(html,/data-action="editDeck"/);
 assert.match(html,/公開狀態/);
 assert.match(html,/更新於 2026\.10\.13/);
 assert.doesNotMatch(html,/data-builder-count=/);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/data-action="v2Play" disabled/);
});

test('gallery cards expose cover, name and time, and the share list has its own empty state',()=>{
 const now=Date.parse('2026-10-27T02:00:00Z');
 const updated=formatDeckUpdated('2026-10-13T16:00:00Z',now,'relative');
 assert.equal(updated,'13 天前更新');
 assert.equal(formatDeckUpdated('2026-10-13T16:00:00Z',now,'publish'),'13 天前發布');
 assert.equal(formatDeckUpdated('2026-10-12T16:00:00Z',now,'date'),'更新於 2026.10.13');
 assert.equal(formatDeckUpdated('',now,'relative'),'尚未記錄更新時間');
 const summary=summarizeDeck(cards,{C:4});
 const mine=renderDeckGallery({tab:'mine',sections:[
  {title:'已儲存',items:[{key:'saved:deck-1',name:'白劍',cover:summary.cover,time:updated,meta:'50 張'}]}
 ]});
 assert.match(mine,/我的牌組/);
 assert.match(mine,/分享列表/);
 assert.match(mine,/data-deck-open="saved:deck-1"/);
 assert.match(mine,/白劍/);
 assert.match(mine,/13 天前更新/);
 assert.match(mine,/src="char\.png"/);
 assert.match(mine,/data-action="newDeck"/);
 const shared=renderDeckGallery({tab:'shared',sections:[{title:'已公開的牌組',empty:'快來分享一個牌組吧！',items:[]}]});
 assert.match(shared,/快來分享一個牌組吧！/);
 assert.match(shared,/data-gallery-tab="shared"[^>]*aria-selected="true"|aria-selected="true"[^>]*data-gallery-tab="shared"/);
});

test('saved deck detail stays read-only until edit, and sharing lists that same deck',async()=>{
 const app={innerHTML:'',onclick:null};
 const toast={textContent:'',classList:{add(){},remove(){}}};
 const original=JSON.stringify([{id:'keep-me',name:'<b>白劍</b>',counts:{'034':4}}]);
 const draft=JSON.stringify({'034':2});
 const storage=new Map([['bleach-arena-saved-decks-v1',original],['bleach-arena-deck-v1',draft]]);
 const oldTimer=globalThis.setTimeout;
 globalThis.document={querySelector:sel=>({'#app':app,'#toast':toast})[sel]||null,addEventListener(){}};
 globalThis.localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
 globalThis.sessionStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 globalThis.window={location:{search:'',assign(){}},scrollTo(){}};
 globalThis.setTimeout=()=>0;
 const click=dataset=>app.onclick({target:{closest:()=>({dataset,disabled:false})}});
 try{
  await import('../dist/v2-deck-editor.mjs?gallery-saved-detail');
  click({title:'bleach'});
  assert.match(app.innerHTML,/data-deck-open="saved:keep-me"/);
  assert.match(app.innerHTML,/&lt;b&gt;白劍&lt;\/b&gt;/);
  assert.match(app.innerHTML,/尚未記錄更新時間/);
  click({deckOpen:'saved:keep-me'});
  assert.match(app.innerHTML,/牌組詳情/);
  assert.match(app.innerHTML,/class="dkg-count">4/);
  assert.match(app.innerHTML,/抽牌 <b>×4/);
  assert.doesNotMatch(app.innerHTML,/場地/);
  assert.doesNotMatch(app.innerHTML,/data-builder-count=/);
  assert.doesNotMatch(app.innerHTML,/id="v2DeckName"/);
  assert.equal(storage.get('bleach-arena-deck-v1'),draft);
  click({action:'toggleShare'});
  const saved=JSON.parse(storage.get('bleach-arena-saved-decks-v1'));
  assert.equal(saved.find(row=>row.id==='keep-me').shared,true);
  assert.equal(saved.find(row=>row.id==='keep-me').counts['034'],4);
  click({deckBack:'1'});
  click({galleryTab:'shared'});
  assert.match(app.innerHTML,/data-deck-open="saved:keep-me"/);
  assert.match(app.innerHTML,/發布/);
  click({deckOpen:'saved:keep-me'});
  click({action:'editDeck'});
  assert.match(app.innerHTML,/id="v2DeckName"/);
  assert.match(app.innerHTML,/data-action="saveDeck"/);
  assert.equal(JSON.parse(storage.get('bleach-arena-deck-v1'))['034'],4);
  storage.set('ua-account-visual-editor-v1',JSON.stringify({
   title:'bleach',name:'帳號牌組',counts:{'034':4},remoteId:'d0123456789abcdef',localId:null,intent:'detail'
  }));
  await import('../dist/v2-deck-editor.mjs?gallery-cloud-detail');
  assert.match(app.innerHTML,/牌組詳情/);
  assert.match(app.innerHTML,/帳號牌組/);
  assert.doesNotMatch(app.innerHTML,/正在圖片編輯帳號牌組/);
  assert.doesNotMatch(app.innerHTML,/data-builder-count=/);
  click({action:'editDeck'});
  assert.match(app.innerHTML,/正在圖片編輯帳號牌組/);
  assert.match(app.innerHTML,/id="v2DeckName"/);
 }finally{
  globalThis.setTimeout=oldTimer;
  delete globalThis.document;delete globalThis.localStorage;delete globalThis.sessionStorage;delete globalThis.window;
 }
});

test('share flags stay in the existing browser key and do not invent deck counts',()=>{
 const memory=new Map();
 const storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
 writeSharedFlag(storage,'d0123456789abcdef',true);
 writeSharedFlag(storage,'local-deck',true);
 writeSharedFlag(storage,'local-deck',false);
 assert.deepEqual([...readSharedIds(storage)],['d0123456789abcdef']);
 assert.equal(memory.has('bleach-arena-saved-decks-v1'),false);
 assert.match(memory.get(DECK_SHARE_KEY),/d0123456789abcdef/);
});
