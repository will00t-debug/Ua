// Production deck editor: catalogue, drafts and Universal V2 bridge only.
// No import from engine.mjs, match-runtime.mjs, solo-match.mjs or ttg-core-match.mjs.
import {TITLES} from './title-registry.mjs';
import {PRESETS} from './cards.mjs';
import {renderVisualDeckBuilder} from './visual-deck-builder.mjs?v=20261028cardzoom1';
import {validDeckCoverId} from './deck-cover-selection.mjs';
import {buildDeckLibrary} from './deck-library.mjs';
import {summarizeDeck,formatDeckUpdated,renderDeckGallery,renderDeckDetail,readSharedIds,writeSharedFlag} from './deck-gallery.mjs';
import {BUILTIN_BLEACH_V2_DECKS,builtinBleachDeck} from './v2-bleach-builtins.mjs';
import {LEGACY_DECK_KEYS,V2_EDITOR_TRANSFER_KEY,normalizeEditorCounts,editorV2Status}
 from './v2-editor-compat.mjs';
import {readDeckRecord,renderDeckRecord} from './deck-records.mjs';

const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
const metaKey='bleach-arena-deck-meta-v1',namesKey='ua-v2-editor-draft-names-v1',coversKey='ua-v2-editor-draft-covers-v1';
const names=read(namesKey)||{};
const draftCovers=read(coversKey)||{};
const draftData={};
for(const t of TITLES){
 const raw=read(LEGACY_DECK_KEYS[t.id][0])||(t.id==='bleach'?PRESETS[0]?.counts:{});
 try{draftData[t.id]=normalizeEditorCounts(t.id,raw);}
 catch{draftData[t.id]={};}
}
const savedData={};
for(const t of TITLES){
 const raw=read(LEGACY_DECK_KEYS[t.id][1]);
 savedData[t.id]=(Array.isArray(raw)?raw:[]).flatMap(d=>{
  try{
   if(typeof d?.name!=='string'||!d.name.trim())return [];
   return [{id:typeof d.id==='string'?d.id:null,name:d.name.slice(0,40),
    counts:normalizeEditorCounts(t.id,d.counts),
    updatedAt:typeof d.updatedAt==='string'?d.updatedAt:null,
    shared:d.shared===true||d.public===true,
    coverId:typeof d.coverId==='string'?d.coverId:null}];
  }catch{return [];}
 });
}
const bleachMeta=read(metaKey)||{};
const label=id=>TITLES.find(t=>t.id===id)?.label||id;
const defaults=Object.fromEntries(TITLES.map(t=>[t.id,t.id==='bleach'?(bleachMeta.name||'自訂 BLEACH 牌組'):t.id==='rezero'?'Re:Zero 自訂牌組':t.label+'自訂牌組']));
const state={title:'bleach',ready:false,screen:'library',listOrigin:'library',galleryTab:'mine',detail:null,tab:'pick',search:'',type:'all',color:'all',
 energy:'all',energies:[],generate:'all',sort:'energy-asc',recordView:'all',zoom:false,showOriginal:false,names:Object.fromEntries(TITLES.map(t=>[t.id,String(names[t.id]||defaults[t.id]).slice(0,40)])),
 counts:draftData,coverIds:Object.fromEntries(TITLES.map(t=>[t.id,typeof draftCovers[t.id]==='string'?draftCovers[t.id]:null])),coverPicker:false,selectedSaved:{},shareFlag:false,inspection:null,exportText:null,cloudOrigin:null};
let toastTimer=null;
let cloudDecks=[],cloudUser=null;
function notify(message){
 const el=$('#toast');if(!el)return;
 el.textContent=String(message);el.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);
}
function persist(){
 // Editing a cloud-owned deck must not overwrite the separate browser draft.
 if(state.cloudOrigin?.title===state.title)return;
 const key=LEGACY_DECK_KEYS[state.title][0];
 write(key,state.counts[state.title]);
 write(namesKey,state.names);
 write(coversKey,state.coverIds);
 if(state.title==='bleach')write(metaKey,{...bleachMeta,name:state.names.bleach});
}
function status(){return editorV2Status(state.title,state.counts[state.title]);}
function useDesignatedBleachPreset(id,screen){
 const preset=builtinBleachDeck(id);
 if(!preset)return false;
 // Only replace the working draft; never silently overwrite a player's saved deck.
 state.title='bleach';state.ready=true;state.tab='overview';state.search='';
 state.type=state.color=state.energy='all';
 state.counts.bleach={...preset.counts};state.names.bleach=preset.displayName;
 state.selectedSaved.bleach=null;state.cloudOrigin=null;state.shareFlag=false;
 state.coverIds.bleach=null;state.coverPicker=false;
 state.detail={source:'builtin',id:preset.id};
 state.screen=screen||'detail';
 persist();
 return true;
}
function catalogueCards(title=state.title){return TITLES.find(t=>t.id===title)?.cards||[];}
function persistSaved(title){
 write(LEGACY_DECK_KEYS[title][1],savedData[title].map(row=>({
  id:row.id,name:row.name,counts:row.counts,updatedAt:row.updatedAt||null,
  shared:row.shared===true,coverId:row.coverId||null
 })));
}
function releaseCloudOrigin(nextId){
 if(!state.cloudOrigin)return;
 if(nextId!=='v2-account-'+state.cloudOrigin.remoteId)state.cloudOrigin=null;
}
function detailModel(){
 const title=state.title,cards=catalogueCards(title),detail=state.detail;
 if(detail?.source==='builtin'){
  const preset=builtinBleachDeck(detail.id);
  if(!preset)return null;
  const summary=summarizeDeck(cards,preset.counts);
  return {source:'builtin',id:preset.id,name:preset.displayName,counts:preset.counts,updatedAt:null,shared:false,shareEnabled:false,shareNote:'指定牌組要先儲存成自己的牌組，才能設成公開。',summary};
 }
 if(detail?.source==='saved'){
  const item=savedDetailItem();
  if(!item)return null;
  return {source:'saved',id:item.id,name:item.name,counts:item.counts,updatedAt:item.updatedAt,shared:item.shared===true,shareEnabled:true,shareNote:'',coverId:item.coverId,summary:summarizeDeck(cards,item.counts,item.coverId)};
 }
 const shared=detail?.source==='cloud'
  ?readSharedIds(localStorage).has(state.cloudOrigin?.remoteId||'')
  :state.shareFlag===true;
 return {source:detail?.source||'draft',id:detail?.id||'draft',name:state.names[title],counts:state.counts[title],updatedAt:null,shared,shareEnabled:true,shareNote:detail?.source==='cloud'?'公開後會出現在帳號的分享列表。':'公開狀態會在儲存牌組後出現在分享列表。',coverId:state.coverIds[title],summary:summarizeDeck(cards,state.counts[title],state.coverIds[title])};
}
function activeList(){
 if(state.screen==='detail'){
  const deck=detailModel();
  if(deck)return {title:state.title,name:deck.name,counts:deck.counts};
 }
 return {title:state.title,name:state.names[state.title],counts:state.counts[state.title]};
}
function listItem(key,name,counts,updatedAt,style,meta){
 const cards=catalogueCards();
 const summary=summarizeDeck(cards,counts);
 const time=style==='builtin'?'指定牌組':formatDeckUpdated(updatedAt,Date.now(),style||'relative');
 return {key,name,cover:summary.cover,time,meta:meta||(summary.total+' 張')};
}
function gallerySections(){
 const title=state.title,saved=savedData[title];
 if(state.galleryTab==='shared'){
  const shared=saved.filter(row=>row.shared);
  return [{title:'已公開的牌組',empty:'快來分享一個牌組吧！',items:shared.map(row=>listItem('saved:'+(row.id||''),row.name,row.counts,row.updatedAt,'publish'))}];
 }
 const draft=listItem('draft',state.names[title]||'未命名牌組',state.counts[title],null,'relative','編輯中的草稿');
 const sections=[{title:'編輯中',items:[draft]},{title:'已儲存',empty:'還沒有儲存的牌組。建立完成後按儲存，就會出現在這裡。',items:saved.map((row,index)=>listItem('saved:'+(row.id||'@'+index),row.name,row.counts,row.updatedAt,'relative'))}];
 if(title==='bleach')sections.push({title:'你之前提供的三副牌組',items:BUILTIN_BLEACH_V2_DECKS.map(preset=>listItem('builtin:'+preset.id,preset.displayName,preset.counts,null,'builtin',preset.total+' 張'))});
 return sections;
}
function renderGallery(){
 return renderDeckGallery({tab:state.galleryTab,sections:gallerySections()});
}
function renderLibrary(){
 const sections=buildDeckLibrary({
  titles:TITLES,savedData,
  draftData:Object.fromEntries(TITLES.map(t=>[t.id,read(LEGACY_DECK_KEYS[t.id][0])||{}])),
  names:Object.fromEntries(TITLES.map(t=>[t.id,String((read(namesKey)||{})[t.id]||defaults[t.id]).slice(0,40)])),
  cloudDecks,cloudUser,tab:state.galleryTab,sharedIds:readSharedIds(localStorage),
  builtins:BUILTIN_BLEACH_V2_DECKS,summarize:summarizeDeck,formatUpdated:formatDeckUpdated
 });
 return renderDeckGallery({tab:state.galleryTab,sections,mode:'library'});
}
// The cloud API is session-scoped. Never fall back to another user's cached decks.
async function refreshCloudDecks(){
 if(typeof window==='undefined'||!window.location?.origin)return;
 try{
  const options={credentials:'same-origin',redirect:'error'};
  const userResponse=await fetch('/api/me',options);
  if(!userResponse.ok)throw Error('Not signed in');
  const who=await userResponse.json();
  const decksResponse=await fetch('/api/decks',options);
  if(!decksResponse.ok)throw Error('Deck sync unavailable');
  const data=await decksResponse.json();
  if(!who?.username||!Array.isArray(data?.decks))throw Error('Invalid account data');
  cloudUser=who.username;
  cloudDecks=data.decks.filter(deck=>deck&&typeof deck.id==='string'&&/^d[a-f0-9]{16}$/.test(deck.id)
   &&TITLES.some(t=>t.id===deck.title));
 }catch{cloudDecks=[];cloudUser=null;}
 if(state.screen==='library')render();
}
function savedDetailItem(){
 if(state.detail?.source!=='saved')return null;
 const list=savedData[state.title]||[];
 return Number.isInteger(state.detail.index)?list[state.detail.index]||null:
  list.find(row=>row.id===state.detail.id)||null;
}
function openLibraryDeck(key){
 const parts=String(key||'').split(':');
 const source=parts.shift();
 state.listOrigin='library';
 state.inspection=null;state.exportText=null;state.zoom=false;
 if(source==='cloud'){
  const row=cloudDecks.find(deck=>deck.id===parts[0]);
  if(!row){notify('找不到這副帳號牌組，請重新整理。');return;}
  state.title=row.title;state.ready=true;
  try{state.counts[row.title]=normalizeEditorCounts(row.title,row.counts);}
  catch{notify('牌組資料無法讀取。');return;}
  state.names[row.title]=String(row.name||'未命名牌組').slice(0,40);
  state.cloudOrigin={remoteId:row.id,title:row.title,localId:row.localId||null};
  state.selectedSaved[row.title]=null;state.shareFlag=readSharedIds(localStorage).has(row.id);
  state.coverIds[row.title]=validDeckCoverId(catalogueCards(row.title),state.counts[row.title],row.coverId);state.coverPicker=false;
  state.detail={source:'cloud',id:row.id};
 }else if(source==='saved'){
  let title,id;try{title=decodeURIComponent(parts[0]);id=decodeURIComponent(parts.slice(1).join(':'));}catch{return;}
  if(!TITLES.some(t=>t.id===title))return;
  const list=savedData[title]||[];
  const index=id.startsWith('@')?Number(id.slice(1)):list.findIndex(row=>row.id===id);
  const row=list[index];
  if(!row){notify('找不到這副本機牌組。');return;}
  state.title=title;state.ready=true;state.cloudOrigin=null;
  state.detail={source:'saved',id:row.id,index};
 }else if(source==='draft'){
  let title;try{title=decodeURIComponent(parts.join(':'));}catch{return;}
  if(!TITLES.some(t=>t.id===title))return;
  state.title=title;state.ready=true;state.cloudOrigin=null;
  try{state.counts[title]=normalizeEditorCounts(title,read(LEGACY_DECK_KEYS[title][0])||{});}catch{}
  state.names[title]=String((read(namesKey)||{})[title]||state.names[title]||defaults[title]).slice(0,40);
  state.detail={source:'draft',id:'draft'};
  state.coverIds[title]=validDeckCoverId(catalogueCards(title),state.counts[title],(read(coversKey)||{})[title]);state.coverPicker=false;
 }else if(source==='builtin'){
  let id;try{id=decodeURIComponent(parts.join(':'));}catch{return;}
  if(!builtinBleachDeck(id)){notify('找不到指定牌組。');return;}
  state.title='bleach';state.ready=true;state.cloudOrigin=null;state.detail={source:'builtin',id};
 }else return;
 state.screen='detail';
 render();
}

function renderDetail(){
 const deck=detailModel();
 if(!deck)return '<div class="dkg-empty">找不到這副牌組。</div>';
 const battle=editorV2Status(state.title,deck.counts);
 const updated=deck.updatedAt?formatDeckUpdated(deck.updatedAt,Date.now(),'date'):(deck.source==='builtin'?'指定牌組':'尚未記錄更新日期');
 return renderDeckDetail({
  name:deck.name,updatedLabel:updated,shared:deck.shared,shareEnabled:deck.shareEnabled,shareNote:deck.shareNote,
  cover:deck.summary.cover,total:deck.summary.total,groups:deck.summary.groups,triggers:deck.summary.triggers,
  battleReady:battle.ready
 });
}
function showDetail(id){
 const card=TITLES.find(t=>t.id===state.title)?.cards.find(c=>c.id===id);
 if(!card)return '';
 const img=card.onlineImage||card.image||'assets/mark.svg';
 const name=card.nameZh||card.name||card.nameJa||card.id;
 // Only cover the printed rules box with an available translation.
 // Cards without a distinct translation always show their untouched original.
 const effect=typeof card.effect==='string'?card.effect.trim():'';
 const effectJa=typeof card.effectJa==='string'?card.effectJa.trim():'';
 const translation=effect&&effect!==effectJa?effect:'';
 const showOriginal=state.showOriginal||!translation;
 const density=translation.length>260?' is-very-dense':translation.length>130?' is-dense':'';
 return `<div class="v2e-modal-backdrop arena-card-detail-backdrop" data-dismiss="1">
  <section role="dialog" aria-modal="true" aria-label="${escapeHtml(name)} 放大卡圖" class="v2e-modal arena-card-detail-modal">
   <button type="button" class="arena-card-detail-flip${showOriginal?' show-original':''}" data-action="toggleCardOriginal"
    aria-label="${escapeHtml(name)}：${showOriginal?'點擊查看中文效果':'點擊查看日文原文'}" aria-pressed="${showOriginal}">
    <img src="${escapeHtml(img)}" alt="${escapeHtml(name)} 日文卡圖" onerror="this.onerror=null;this.src='assets/mark.svg'">
    ${translation?`<span class="arena-card-effect-overlay${density}"><span>${escapeHtml(translation)}</span></span>`:''}
   </button>
   <p class="arena-card-detail-hint">${translation?(showOriginal?'點卡圖顯示中文效果':'點卡圖顯示日文原文'):'目前顯示卡片原圖'} · 點卡圖外關閉</p>
  </section>
 </div>`;
}

function activeDeckRecordId(){
 if(state.cloudOrigin?.title===state.title&&typeof state.cloudOrigin.remoteId==='string')return state.cloudOrigin.remoteId;
 const selected=state.selectedSaved[state.title];
 if(typeof selected==='string'&&selected)return selected;
 if(state.detail?.source==='saved'&&state.detail.id)return state.detail.id;
 if(state.detail?.source==='builtin'&&state.detail.id)return 'builtin:'+state.detail.id;
 return 'draft:'+state.title;
}
function manageTools(){
 const deck=detailModel();
 if(!deck)return '';
 const saved=deck.source==='saved';
 const covers=(deck.summary?.groups||[]).flatMap(group=>group.entries||[]).slice(0,16);
 const pictures=covers.map(row=>`<button type="button" data-cover-id="${escapeHtml(row.card.id)}" aria-label="用這張卡當封面"><img src="${escapeHtml(row.card.onlineImage||row.card.image||'assets/mark.svg')}" alt=""></button>`).join('');
 return `<section class="arena-tools"><h2>牌組操作</h2>${saved?`<label>牌組名稱<input id="deckRename" maxlength="40" value="${escapeHtml(deck.name||'')}"></label>`:'<p>指定牌組要先存成自己的牌組，才能改名或刪除。</p>'}<div class="arena-tool-row"><button type="button" data-action="duplicateDeck">複製牌組</button><button type="button" data-action="deleteDeck" ${saved||state.cloudOrigin?'':'disabled'}>刪除牌組</button></div>${pictures?`<div class="arena-covers" aria-label="選擇封面">${pictures}</div>`:''}</section>`;
}
function recordsScreen(){
 const rows=savedData[state.title].map(row=>`<article class="arena-record-card"><h3>${escapeHtml(row.name)}</h3>${renderDeckRecord({record:readDeckRecord(localStorage,row.id),view:'all'})}</article>`).join('');
 return `<section class="arena-records"><p>戰績依牌組 ID 分開計算，不依名稱合併。這個畫面只有你自己的紀錄，沒有其他玩家的排名。</p>${rows||'<p>這個作品還沒有已儲存的牌組。</p>'}</section>`;
}
function rulesScreen(){
 return `<section class="arena-rules"><h2>規則／FAQ</h2><p>這是非官方的 UNION ARENA 練習站。效果文字只用卡牌資料裡已收錄的原文，練習勝敗不是官方成績。</p><p><a href="https://www.unionarena-tcg.com/jp/" target="_blank" rel="noopener noreferrer">前往官方網站</a></p></section>`;
}
function render(){
 // The desktop editor scrolls its card pool independently of the window.
 // Replacing #app on every +/- click otherwise resets this inner scrollbar.
 const oldPool=$('.arena-editor .vdb-pool-grid');
 const oldDeck=$('.arena-deck-board');
 const oldPoolTop=oldPool?.scrollTop??null,oldPoolLeft=oldPool?.scrollLeft??0;
 const oldDeckTop=oldDeck?.scrollTop??null;
 const previousPageY=window.scrollY,previousPageX=window.scrollX;
 const t=TITLES.find(item=>item.id===state.title)||TITLES[0],info=status();
 const countAll=t.cards.length;
 const browsing=state.ready&&(state.screen==='gallery'||state.screen==='detail');
 const pageTitle=state.screen==='library'?'牌組管理':state.screen==='chooseTitle'?'建立新牌組':state.screen==='detail'?'牌組詳情':state.screen==='gallery'?'我的牌組':state.screen==='records'?'我的戰績':state.screen==='rules'?'規則／FAQ':'編輯牌組';
 // Designated decks are opened from the visual list. renderBuiltinBleachPanel stays
 // in the catalogue module and is not mounted above the editor.
 const designatedPanel='';
 const accountBanner=state.cloudOrigin&&state.screen==='editor'?`<section class="v2e-coverage v2e-account-edit" role="status"><strong>正在圖片編輯帳號牌組：${escapeHtml(state.names[state.title])}</strong><span>儲存時會更新原本的雲端牌組，保留原有 50 張牌組與登入帳號。</span><a href="/online.html">返回線上對戰</a></section>`:'';
 const infoBanner=state.ready&&state.screen==='editor'?`<section class="v2e-coverage" role="status"><strong>Universal V2 · ${info.registered} / ${countAll} 張已登錄</strong><span>組卡可以使用完整卡表，但只有整副 50 張全部符合 V2 規則才可開始對戰。舊引擎不再參與判定。</span></section>`:'';
 const focusCard=state.inspection?catalogueCards().find(card=>card.id===state.inspection)||null:null;
 const record=readDeckRecord(localStorage,activeDeckRecordId());
 const editorOptions={
  titles:TITLES,titleId:state.title,tab:state.tab,search:state.search,type:state.type,color:state.color,energy:state.energy,
  energies:state.energies,generate:state.generate,sort:state.sort,counts:state.counts[state.title],name:state.names[state.title],
  nameId:'v2DeckName',savedId:'v2SavedSelect',focusCard,record,recordView:state.recordView,
  coverId:state.coverIds[state.title],coverPicker:state.coverPicker,
  allowDelete:Boolean(state.selectedSaved[state.title]||state.cloudOrigin)
 };
 const editor=state.ready&&state.screen==='editor'?renderVisualDeckBuilder({
  ...editorOptions,ready:true,
  savedOptions:[...(state.title==='bleach'?BUILTIN_BLEACH_V2_DECKS.map(d=>({value:'builtin:'+d.id,label:'指定牌組｜'+d.displayName+'（50 張）'})):[]),...savedData[state.title].map((d,i)=>({value:String(i),label:d.name}))],
  saveAction:'saveDeck',newAction:'newDeck',issues:info.issues,
  v2SupportedIds:info.supported,v2Ready:info.ready,reselectLabel:'‹ 返回牌組列表'
 }):(state.screen==='chooseTitle'?renderVisualDeckBuilder({
  ...editorOptions,ready:false,savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',issues:[],v2SupportedIds:null,v2Ready:false
 }):'');
 const recordAside=state.screen==='detail'?`<aside class="arena-manage-side">${manageTools()}${renderDeckRecord({record:readDeckRecord(localStorage,activeDeckRecordId()),view:state.recordView})}</aside>`:'';
 const stage=state.screen==='library'?renderLibrary():browsing?(state.screen==='detail'&&state.listOrigin==='library'?`<div class="deck-library-detail">${renderDetail()}<details class="deck-library-advanced"><summary>進階牌組操作與戰績</summary>${manageTools()}${renderDeckRecord({record:readDeckRecord(localStorage,activeDeckRecordId()),view:state.recordView})}</details></div>`:state.screen==='detail'?`<div class="arena-manage"><aside class="arena-manage-list">${renderGallery()}</aside><div class="arena-manage-main">${renderDetail()}</div>${recordAside}</div>`:renderGallery()):state.screen==='records'?recordsScreen():state.screen==='rules'?rulesScreen():'';
 const libraryNavigation=state.screen==='editor'?'<div class="deck-library-editor-nav"><button type="button" data-action="backLibrary">‹ 返回我的牌組</button><span>調整後請按「儲存牌組」保留變更</span></div>':state.screen==='chooseTitle'?'<div class="deck-library-editor-nav"><button type="button" data-action="backLibrary">‹ 返回我的牌組</button></div>':'';
 const modal=(state.zoom&&state.inspection)?showDetail(state.inspection):state.exportText!==null?
  `<div class="v2e-modal-backdrop"><section class="v2e-modal" role="dialog" aria-modal="true" aria-label="複製牌組"><button class="v2e-x" data-action="dismiss">關閉 ×</button><h2>牌組清單</h2><textarea id="v2Export" rows="17" readonly>${escapeHtml(state.exportText)}</textarea><button class="v2e-primary" data-action="copyDeck">複製至剪貼簿</button></section></div>`:'';
 $('#app').innerHTML=`<div class="v2e-shell arena-shell"><header class="ua-site-header" aria-label="UNION ARENA 主要導覽"><a class="ua-header-brand" href="/online.html" aria-label="UNION ARENA V2 首頁"><span class="ua-header-overline">TRADING CARD GAME</span><span class="ua-header-logo"><strong>UNION ARENA</strong><em>V2</em></span></a><nav class="ua-header-nav" aria-label="主要功能"><a href="/online.html">首頁</a><a href="/universal-v2-preview.html">對戰</a><a href="/index.html" ${state.screen==='records'||state.screen==='rules'?'':'aria-current="page"'}>牌組</a><a href="/index.html#cards">卡牌一覽</a><button type="button" data-arena-screen="records" ${state.screen==='records'?'aria-current="page"':''}>排行榜</button><button type="button" data-arena-screen="rules" ${state.screen==='rules'?'aria-current="page"':''}>規則／FAQ</button></nav><div class="ua-header-account"><a href="/online.html" aria-label="返回帳號與線上對戰大廳">大廳</a></div></header><main class="v2e-main"><div class="v2e-heading"><div><span class="vdb-eyebrow">OFFICIAL V2 ENGINE ONLY</span><h1>${pageTitle}</h1></div></div>${accountBanner}${infoBanner}${designatedPanel}${stage}${libraryNavigation}${editor}</main><footer class="v2e-footer">所有對戰均使用 Universal V2。可保留以前的牌組草稿，但舊版引擎、Beta 引擎和舊版 auto 標籤不再使用。</footer>${modal||''}</div>`;
 bind();
 // Restore both the independently scrolling card list and the document.
 // Only restore when the same editor panel exists before AND after render.
 const newPool=$('.arena-editor .vdb-pool-grid');
 const newDeck=$('.arena-deck-board');
 if(oldPoolTop!==null&&newPool){
  newPool.scrollTop=oldPoolTop;newPool.scrollLeft=oldPoolLeft;
 }
 if(oldDeckTop!==null&&newDeck)newDeck.scrollTop=oldDeckTop;
 if((oldPoolTop!==null&&newPool)||(oldDeckTop!==null&&newDeck))
  window.scrollTo(previousPageX,previousPageY);
}
async function mirrorCloudDeck(title,entry){
 if(typeof fetch!=='function')return;
 const origin=state.cloudOrigin?.title===title?state.cloudOrigin:null;
 const localId=typeof entry.id==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(entry.id)?entry.id:undefined;
 // Editing an account deck updates that SAME remote record. A new local
 // deck uses the existing upsert-by-localId API. Both verify the logged-in
 // account via its HttpOnly session, never via browser-stored credentials.
 const url=origin?'/api/decks/'+encodeURIComponent(origin.remoteId):'/api/decks';
 const method=origin?'PUT':'POST';
 try{
  const response=await fetch(url,{method,credentials:'same-origin',headers:{'content-type':'application/json'},
   body:JSON.stringify({name:entry.name,title,counts:entry.counts,localId,coverId:entry.coverId||null})});
  if(response.ok){
   notify(origin?'已更新原本的帳號牌組':'已儲存，並同步到登入帳號');
   if(cloudUser)refreshCloudDecks();
  }else if(response.status===401||response.status===404){
   notify('已儲存在瀏覽器；帳號沒有登入或已切換，無法更新雲端牌組。');
  }else{
   notify('已儲存在瀏覽器；雲端同步失敗，請返回帳號頁確認。');
  }
 }catch{notify('已儲存在瀏覽器；目前無法連線同步帳號。');}
}
function openDeck(key){
 const split=String(key).indexOf(':');
 const source=split<0?key:String(key).slice(0,split);
 const id=split<0?'':String(key).slice(split+1);
 if(source==='builtin'){
  if(!builtinBleachDeck(id)){notify('找不到這副牌組');return;}
  state.detail={source:'builtin',id};
 }else if(source==='saved'){
  const item=id.startsWith('@')?savedData[state.title][Number(id.slice(1))]:savedData[state.title].find(row=>row.id===id);
  if(!item){notify('找不到這副牌組');return;}
  state.detail={source:'saved',id:item.id,index:savedData[state.title].indexOf(item)};
 }else state.detail={source:state.cloudOrigin?.title===state.title?'cloud':'draft',id:'draft'};
 state.screen='detail';state.inspection=null;state.exportText=null;render();
}
function openEditor(){
 const detail=state.detail;
 if(detail?.source==='builtin'){
  if(!useDesignatedBleachPreset(detail.id,'editor'))return;
  render();
  return;
 }
 if(detail?.source==='saved'){
  const item=savedDetailItem();
  if(!item){notify('找不到這副牌組');return;}
  if(!item.id){item.id='v2-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);persistSaved(state.title);}
  releaseCloudOrigin(item.id);
  state.counts[state.title]={...item.counts};
  state.names[state.title]=item.name;
  state.selectedSaved[state.title]=item.id;
  state.shareFlag=item.shared===true;
  state.coverIds[state.title]=validDeckCoverId(catalogueCards(),state.counts[state.title],item.coverId);
  state.coverPicker=false;
  persist();
 }
 const total=Object.values(state.counts[state.title]||{}).reduce((sum,value)=>sum+(Number(value)||0),0);
 state.tab=total?'overview':'pick';
 state.screen='editor';
 render();
}
function toggleShare(){
 const deck=detailModel();
 if(!deck?.shareEnabled)return;
 if(deck.source==='saved'&&deck.id){
  const item=savedData[state.title].find(row=>row.id===deck.id);
  if(!item)return;
  item.shared=!item.shared;
  item.updatedAt=new Date().toISOString();
  state.shareFlag=item.shared;
  try{persistSaved(state.title);writeSharedFlag(localStorage,item.id,item.shared);}catch(error){notify('無法更新公開狀態：'+error.message);return;}
  notify(item.shared?'已設為公開，分享列表看得到這副牌組。':'已改為未公開。');
  render();return;
 }
 if(deck.source==='cloud'&&state.cloudOrigin?.remoteId){
  const id=state.cloudOrigin.remoteId;
  const next=!readSharedIds(localStorage).has(id);
  writeSharedFlag(localStorage,id,next);
  notify(next?'已設為公開，回到帳號頁的分享列表就能看到。':'已改為未公開。');
  render();return;
 }
 state.shareFlag=!state.shareFlag;
 notify(state.shareFlag?'已標為公開，儲存牌組後會出現在分享列表。':'已改為未公開。');
 render();
}
function duplicateCurrentDeck(){
 const deck=state.screen==='detail'?detailModel():{name:state.names[state.title],counts:{...state.counts[state.title]}};
 if(!deck?.counts)return;
 const entry={id:'v2-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name:String(deck.name||'牌組').slice(0,34)+' 複本',counts:{...deck.counts},updatedAt:new Date().toISOString(),shared:false,coverId:null};
 savedData[state.title].push(entry);
 try{persistSaved(state.title);}catch(error){notify('無法複製：'+error.message);return;}
 notify('已複製成另一個牌組。新牌組有自己的戰績。');
 render();
}
async function deleteCurrentDeck(){
 const approved=typeof confirm==='function'?confirm('刪除這副牌組？'):false;
 if(!approved){notify('已取消刪除。');return;}
 const title=state.title;
 const cloud=state.cloudOrigin?.title===title?state.cloudOrigin:null;
 const savedId=state.screen==='detail'&&state.detail?.source==='saved'?state.detail.id:state.selectedSaved[title];
 const savedIndex=state.screen==='detail'&&state.detail?.source==='saved'?state.detail.index:null;
 if(!cloud&&!savedId&&!Number.isInteger(savedIndex)){notify('還沒有可刪除的已儲存牌組。');return;}
 if(cloud){
  try{
   const response=await fetch('/api/decks/'+encodeURIComponent(cloud.remoteId),{method:'DELETE',credentials:'same-origin'});
   if(!response.ok&&response.status!==404){notify('帳號沒有刪除這副牌組。');return;}
  }catch{notify('目前連不到帳號，沒有刪除。');return;}
  state.cloudOrigin=null;
  cloudDecks=cloudDecks.filter(row=>row.id!==cloud.remoteId);
 }
 if(savedId||Number.isInteger(savedIndex)){
  savedData[title]=savedData[title].filter((row,index)=>Number.isInteger(savedIndex)?index!==savedIndex:row.id!==savedId);
  try{persistSaved(title);}catch(error){notify('無法刪除：'+error.message);return;}
  if(state.selectedSaved[title]===savedId)state.selectedSaved[title]=null;
 }
 state.screen=state.listOrigin==='library'?'library':'gallery';state.detail=null;state.inspection=null;state.zoom=false;
 notify('已刪除牌組。');
 render();
}
function bind(){
 $('#app').onclick=e=>{
  const el=e.target.closest('button');
  if(state.zoom&&e.target.closest('.arena-card-detail-backdrop')){
   if(el?.dataset?.action==='toggleCardOriginal'&&!el.disabled){
    state.showOriginal=!state.showOriginal;render();
    document.querySelector('.arena-card-detail-flip')?.focus?.({preventScroll:true});
   }else{
    // Click anywhere outside the actual card (including its caption) to close.
    state.zoom=false;state.inspection=null;state.showOriginal=false;render();
   }
   return;
  }
  if(!el||el.disabled)return;
  const data=el.dataset;
  if(data.designatedPreset){if(useDesignatedBleachPreset(data.designatedPreset)){render();notify('已載入 '+state.names.bleach+'；可以先查看，再決定要不要編輯。');}return;}
  if(data.galleryTab){state.galleryTab=data.galleryTab==='shared'?'shared':'mine';state.screen=state.screen==='library'?'library':'gallery';state.detail=null;render();return;}
  if(data.deckOpen){if(state.screen==='library')openLibraryDeck(data.deckOpen);else openDeck(data.deckOpen);return;}
  if(data.deckBack!==undefined){state.screen=state.listOrigin==='library'?'library':'gallery';state.inspection=null;state.exportText=null;state.detail=null;render();return;}
  if(data.arenaScreen==='records'||data.arenaScreen==='rules'){state.ready=true;state.screen=data.arenaScreen;state.inspection=null;state.zoom=false;render();return;}
  if(data.title){
   if(!TITLES.some(title=>title.id===data.title))return;
   if(state.screen==='chooseTitle'){
    const existing=Object.values(state.counts[data.title]||{}).some(n=>Number(n)>0);
    if(existing&&typeof confirm==='function'&&!confirm('這個作品已有編輯中的草稿。建立新牌組會取代草稿，但不會刪除已儲存牌組。確定繼續？'))return;
    state.counts[data.title]={};state.names[data.title]=defaults[data.title];state.coverIds[data.title]=null;state.coverPicker=false;
    state.selectedSaved[data.title]=null;state.cloudOrigin=null;state.shareFlag=false;
    state.listOrigin='library';state.title=data.title;state.ready=true;state.screen='editor';state.tab='pick';
    state.galleryTab='mine';state.detail={source:'draft',id:'draft'};state.search='';
    state.type=state.color=state.energy='all';state.energies=[];state.generate='all';
    persist();render();return;
   }
   state.cloudOrigin=null;state.title=data.title;state.ready=true;state.screen='gallery';
   state.listOrigin='gallery';state.galleryTab='mine';state.detail=null;state.tab='pick';state.search='';
   state.type=state.color=state.energy='all';state.energies=[];state.generate='all';render();return;
  }
  if(data.builderReselect!==undefined){state.screen=state.listOrigin==='library'?'library':'gallery';state.detail=null;state.search='';state.inspection=null;state.zoom=false;state.exportText=null;render();return;}
  if(data.builderCoverOpen!==undefined){
   state.coverPicker=true;render();
   document.querySelector('.arena-cover-dialog-head button')?.focus();return;
  }
  if(data.builderCoverClose!==undefined){state.coverPicker=false;render();return;}
  if(data.builderCoverSelect!==undefined){
   const id=validDeckCoverId(catalogueCards(),state.counts[state.title],data.builderCoverSelect);
   if(!id){notify('只能從目前牌組已加入的卡片選擇封面。');return;}
   state.coverIds[state.title]=id;state.coverPicker=false;persist();render();
   notify('封面已更換，記得儲存牌組。');return;
  }
  if(data.builderCoverReset!==undefined){
   state.coverIds[state.title]=null;state.coverPicker=false;persist();render();
   notify('已改用自動封面，記得儲存牌組。');return;
  }
  if(data.builderSearch!==undefined){$('#search')?.focus();return;}
  if(data.builderTab){state.tab=data.builderTab;render();if(state.tab==='overview')document.querySelector('.arena-deck')?.scrollIntoView({block:'start'});return;}
  if(data.builderType){state.type=data.builderType;render();return;}
  if(data.builderColor){state.color=data.builderColor;render();return;}
  if(data.builderGenerate){state.generate=data.builderGenerate;render();return;}
  if(data.builderSort){state.sort=data.builderSort;render();return;}
  if(data.recordView){state.recordView=data.recordView;render();return;}
  if(data.builderEnergy){
   if(data.builderEnergy==='all')state.energies=[];
   else{const next=new Set(state.energies);if(next.has(data.builderEnergy))next.delete(data.builderEnergy);else next.add(data.builderEnergy);state.energies=[...next];}
   state.energy='all';render();return;
  }
  if(data.builderClear!==undefined){state.search='';state.type=state.color=state.energy='all';state.energies=[];state.generate='all';state.sort='energy-asc';render();return;}
  if(data.coverId){
   const item=savedDetailItem();
   if(!item)return;
   item.coverId=data.coverId;item.updatedAt=new Date().toISOString();
   try{persistSaved(state.title);}catch(error){notify('無法更新封面：'+error.message);return;}
   render();return;
  }
  if(data.inspect){
   // Always open a large card+rules dialog, including within the deck editor.
   // The cover button itself remains dedicated to changing the deck cover.
   state.inspection=data.inspect;state.zoom=true;state.showOriginal=false;render();
   document.querySelector('.arena-card-detail-flip')?.focus?.({preventScroll:true});
   return;
  }
  if(data.builderCount){
   const t=TITLES.find(t=>t.id===state.title),c=t.cards.find(x=>x.id===data.builderCount);
   if(!c||c.type==='ap'||c.type==='action-point'||c.type==='action_point')return;
   const val=Number(data.delta);
   if(![-1,1].includes(val))return;
   const n=state.counts[state.title][c.id]||0;
   if(val>0&&Object.values(state.counts[state.title]).reduce((a,b)=>a+b,0)>=50){notify('一副牌最多 50 張');return;}
   state.counts[state.title][c.id]=Math.max(0,Math.min(c.maxCopies||4,n+val));
   state.coverIds[state.title]=validDeckCoverId(catalogueCards(),state.counts[state.title],state.coverIds[state.title]);
   persist();render();return;
  }
  if(data.action==='dismiss'){if(state.exportText!==null){state.exportText=null;render();return;}state.zoom=false;state.inspection=null;state.showOriginal=false;render();return;}
  if(data.action==='zoomCard'){if(state.inspection){state.zoom=true;state.showOriginal=false;}render();return;}
  if(data.action==='duplicateDeck'){duplicateCurrentDeck();return;}
  if(data.action==='deleteDeck'){deleteCurrentDeck();return;}
  if(data.action==='backLibrary'){state.screen='library';state.listOrigin='library';state.detail=null;state.inspection=null;state.zoom=false;state.exportText=null;render();refreshCloudDecks();return;}
  if(data.action==='pickTitle'){state.ready=false;state.screen='chooseTitle';state.listOrigin='library';state.detail=null;state.search='';render();return;}
  if(data.action==='editDeck'){openEditor();return;}
  if(data.action==='toggleShare'){toggleShare();return;}
  if(data.action==='newDeck'){state.cloudOrigin=null;state.shareFlag=false;state.counts[state.title]={};state.names[state.title]=defaults[state.title];state.selectedSaved[state.title]=null;
  state.coverIds[state.title]=null;state.coverPicker=false;state.detail={source:'draft',id:'draft'};state.screen='editor';state.tab='pick';persist();render();notify('已建立空白草稿');return;}
  if(data.action==='saveDeck'){
   const title=state.title,records=savedData[title],counts=normalizeEditorCounts(title,state.counts[title]);
   const selected=state.selectedSaved[title]||((state.cloudOrigin?.title===title)?'v2-account-'+state.cloudOrigin.remoteId:null),name=state.names[title].trim()||defaults[title];
   const old=records.find(d=>d.id===selected);
   const coverId=validDeckCoverId(catalogueCards(title),counts,state.coverIds[title]);
   const entry={id:old?.id||(selected&&/^[A-Za-z0-9:_-]{1,80}$/.test(selected)?selected:null)||'v2-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts,updatedAt:new Date().toISOString(),shared:state.shareFlag===true,coverId};
   if(old)records[records.indexOf(old)]=entry;else records.push(entry);
   state.selectedSaved[title]=entry.id;
   try{persistSaved(title);if(entry.id)writeSharedFlag(localStorage,entry.id,entry.shared);persist();notify('已儲存牌組草稿');mirrorCloudDeck(title,entry);render();}
   catch(e){notify('儲存失敗：'+e.message);}return;
  }
  if(data.action==='visualExport'){
   const list=activeList();
   const t=TITLES.find(item=>item.id===list.title);
   const activeCounts=list.counts;
   // A designated print may differ from the catalogue's default art/number.
   // Preserve the user's EXACT previously supplied source codes on export.
   const pinned=list.title==='bleach'?BUILTIN_BLEACH_V2_DECKS.find(p=>{
    const ids=new Set([...Object.keys(p.counts),...Object.keys(activeCounts)]);
    return [...ids].every(id=>(p.counts[id]||0)===(activeCounts[id]||0));
   }):null;
   const lines=pinned?pinned.sources.map(c=>c.copies+'x'+c.source):
    t.cards.filter(c=>activeCounts[c.id]>0).map(c=>activeCounts[c.id]+'x'+(c.number||c.id));
   state.exportText='# '+list.name+'\n'+lines.join('\n');
   render();return;
  }
  if(data.action==='copyDeck'){
   const input=$('#v2Export');input?.select();
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(state.exportText).then(()=>notify('已複製牌組清單')).catch(()=>notify('請選取文字後手動複製'));
   else notify('請選取文字後手動複製');
   return;
  }
  if(data.action==='v2Play'){
   const list=activeList();
   const check=editorV2Status(list.title,list.counts);
   if(!check.ready){notify(check.issues[0]||'牌組尚未符合 V2');return;}
   try{
    sessionStorage.setItem(V2_EDITOR_TRANSFER_KEY,JSON.stringify({title:list.title,name:list.name,counts:check.counts,deckRecordId:activeDeckRecordId()}));
    persist();window.location.assign('/universal-v2-preview.html');
   }catch(e){notify('無法轉交牌組：'+e.message);}
   return;
  }
 };
 const search=$('#search');
 if(search)search.oninput=()=>{
  const pos=search.selectionStart;state.search=search.value;render();
  const next=$('#search');if(next){next.focus();try{next.setSelectionRange(pos,pos);}catch{}}
 };
 const name=$('#v2DeckName');
 if(name)name.oninput=()=>{state.names[state.title]=name.value.slice(0,40);persist();};
 const rename=$('#deckRename');
 if(rename)rename.onchange=()=>{
  const item=savedDetailItem();
  if(!item)return;
  item.name=rename.value.trim().slice(0,40)||item.name;
  item.updatedAt=new Date().toISOString();
  if(state.selectedSaved[state.title]===item.id)state.names[state.title]=item.name;
  try{persistSaved(state.title);}catch(error){notify('無法更改名稱：'+error.message);return;}
  notify('已更改牌組名稱。戰績仍掛在原來的牌組 ID。');
  render();
 };
 const saved=$('#v2SavedSelect');
 if(saved)saved.onchange=()=>{
  if(saved.value==='')return;
  if(saved.value.startsWith('builtin:')){if(useDesignatedBleachPreset(saved.value.slice(8),'editor')){render();notify('已載入 '+state.names.bleach);}return;}
  const item=savedData[state.title][Number(saved.value)];
  if(!item)return;
  releaseCloudOrigin(item.id);
  state.counts[state.title]={...item.counts};state.names[state.title]=item.name;state.selectedSaved[state.title]=item.id;state.shareFlag=item.shared===true;
  state.coverIds[state.title]=validDeckCoverId(catalogueCards(),state.counts[state.title],item.coverId);state.coverPicker=false;
  state.detail={source:'saved',id:item.id};state.screen='editor';
  persist();render();notify('已載入 '+item.name);
 };
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.coverPicker||state.inspection||state.exportText!==null)){state.coverPicker=false;state.zoom=false;state.showOriginal=false;state.inspection=null;state.exportText=null;render();}});
// Direct links from the V2 lobby explicitly load the requested built-in list.
const requestedDeck=new URLSearchParams(typeof window!=='undefined'?window.location?.search||'':'').get('bleachPreset');
if(requestedDeck)useDesignatedBleachPreset(requestedDeck);
// A signed-in user's specific saved deck was selected in /online.html.
// Consume it once, validate the whole catalogue, and show the old picture
// editor without clobbering local drafts or other account saved decks.
function importAccountDeckHandoff(){
 let payload;
 try{
  payload=JSON.parse(sessionStorage.getItem('ua-account-visual-editor-v1')||'null');
  sessionStorage.removeItem('ua-account-visual-editor-v1');
 }catch{return false;}
 if(!payload||typeof payload!=='object'||Array.isArray(payload))return false;
 if(typeof payload.remoteId!=='string'||!/^d[a-f0-9]{16}$/.test(payload.remoteId))return false;
 if(!TITLES.some(t=>t.id===payload.title))return false;
 try{
  const counts=normalizeEditorCounts(payload.title,payload.counts);
  const title=payload.title;
  const viewing=payload.intent==='detail';
  state.title=title;state.ready=true;state.tab='overview';state.search='';
  state.type=state.color=state.energy='all';
  state.counts[title]=counts;
  state.coverIds[title]=validDeckCoverId(catalogueCards(title),counts,payload.coverId);
  state.coverPicker=false;
  state.names[title]=typeof payload.name==='string'?payload.name.trim().slice(0,40)||defaults[title]:defaults[title];
  const localId=typeof payload.localId==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(payload.localId)?payload.localId:null;
  const scopedLocalId='v2-account-'+payload.remoteId;
  state.selectedSaved[title]=savedData[title].some(x=>x.id===scopedLocalId)?scopedLocalId:null;
  state.cloudOrigin={remoteId:payload.remoteId,title,localId};
  state.shareFlag=readSharedIds(localStorage).has(payload.remoteId);
  state.screen=viewing?'detail':'editor';
  state.detail=viewing?{source:'cloud',id:payload.remoteId}:null;
  state.listOrigin='library';
  return true;
 }catch{return false;}
}
if(!requestedDeck&&!importAccountDeckHandoff()){
 const hash=String(typeof window!=='undefined'?window.location?.hash||'':'').replace(/^#/,'');
 if(hash==='cards'){state.ready=true;state.screen='editor';state.tab='pick';}
 else if(hash==='records'){state.ready=true;state.screen='records';}
 else if(hash==='rules'){state.ready=true;state.screen='rules';}
}
render();
if(state.screen==='library')refreshCloudDecks();
