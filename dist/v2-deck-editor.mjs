// Production deck editor: catalogue, drafts and Universal V2 bridge only.
// No import from engine.mjs, match-runtime.mjs, solo-match.mjs or ttg-core-match.mjs.
import {TITLES} from './title-registry.mjs';
import {PRESETS} from './cards.mjs';
import {renderVisualDeckBuilder} from './visual-deck-builder.mjs';
import {summarizeDeck,formatDeckUpdated,renderDeckGallery,renderDeckDetail,readSharedIds,writeSharedFlag} from './deck-gallery.mjs';
import {BUILTIN_BLEACH_V2_DECKS,builtinBleachDeck} from './v2-bleach-builtins.mjs';
import {LEGACY_DECK_KEYS,V2_EDITOR_TRANSFER_KEY,normalizeEditorCounts,editorV2Status}
 from './v2-editor-compat.mjs';

const $=s=>document.querySelector(s);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));}
const metaKey='bleach-arena-deck-meta-v1',namesKey='ua-v2-editor-draft-names-v1';
const names=read(namesKey)||{};
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
const state={title:'bleach',ready:false,screen:'gallery',galleryTab:'mine',detail:null,tab:'pick',search:'',type:'all',color:'all',
 energy:'all',names:Object.fromEntries(TITLES.map(t=>[t.id,String(names[t.id]||defaults[t.id]).slice(0,40)])),
 counts:draftData,selectedSaved:{},shareFlag:false,inspection:null,exportText:null,cloudOrigin:null};
let toastTimer=null;
function notify(message){
 const el=$('#toast');if(!el)return;
 el.textContent=String(message);el.classList.add('visible');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),4200);
}
function persist(){
 const key=LEGACY_DECK_KEYS[state.title][0];
 write(key,state.counts[state.title]);
 write(namesKey,state.names);
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
  const item=savedData[title].find(row=>row.id===detail.id);
  if(!item)return null;
  return {source:'saved',id:item.id,name:item.name,counts:item.counts,updatedAt:item.updatedAt,shared:item.shared===true,shareEnabled:true,shareNote:'',coverId:item.coverId,summary:summarizeDeck(cards,item.counts,item.coverId)};
 }
 const shared=detail?.source==='cloud'
  ?readSharedIds(localStorage).has(state.cloudOrigin?.remoteId||'')
  :state.shareFlag===true;
 return {source:detail?.source||'draft',id:detail?.id||'draft',name:state.names[title],counts:state.counts[title],updatedAt:null,shared,shareEnabled:true,shareNote:detail?.source==='cloud'?'公開後會出現在帳號的分享列表。':'公開狀態會在儲存牌組後出現在分享列表。',summary:summarizeDeck(cards,state.counts[title])};
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
 if(!card)return;
 const img=card.onlineImage||card.image||'assets/mark.svg';
 const v2=status().supported.has(card.id);
 return `<div class="v2e-modal-backdrop" data-dismiss="1"><section role="dialog" aria-modal="true" aria-label="卡片效果" class="v2e-modal"><button type="button" class="v2e-x" data-action="dismiss">關閉 ×</button><div class="v2e-modal-columns"><img src="${escapeHtml(img)}" alt="${escapeHtml(card.nameJa||card.name||card.id)}" onerror="this.onerror=null;this.src='assets/mark.svg'"><div><h2>${escapeHtml(card.nameZh||card.name||card.nameJa||card.id)}</h2><p class="v2e-muted">${escapeHtml(card.number||card.id)}</p><p><strong>${v2?'✓ V2 已登錄':'V2 尚未移植完整效果'}</strong></p><p>${escapeHtml(card.effect||'無額外印刷能力')}</p>${card.effectJa?`<details><summary>官方日文原文</summary><p>${escapeHtml(card.effectJa)}</p></details>`:''}${card.source?`<p><a href="${escapeHtml(card.source)}" target="_blank" rel="noopener noreferrer">查看卡牌來源</a></p>`:''}</div></div></section></div>`;
}
function render(){
 const t=TITLES.find(item=>item.id===state.title)||TITLES[0],info=status();
 const countAll=t.cards.length;
 const browsing=state.ready&&state.screen!=='editor';
 const pageTitle=!state.ready?'牌組構築':state.screen==='detail'?'牌組詳情':state.screen==='gallery'?'我的牌組':'編輯牌組';
 // Designated decks are opened from the visual list. renderBuiltinBleachPanel stays
 // in the catalogue module and is not mounted above the editor.
 const designatedPanel='';
 const accountBanner=state.cloudOrigin&&state.screen==='editor'?`<section class="v2e-coverage v2e-account-edit" role="status"><strong>正在圖片編輯帳號牌組：${escapeHtml(state.names[state.title])}</strong><span>儲存時會更新原本的雲端牌組，保留原有 50 張牌組與登入帳號。</span><a href="/online.html">返回線上對戰</a></section>`:'';
 const infoBanner=state.ready&&state.screen==='editor'?`<section class="v2e-coverage" role="status"><strong>Universal V2 · ${info.registered} / ${countAll} 張已登錄</strong><span>組卡可以使用完整卡表，但只有整副 50 張全部符合 V2 規則才可開始對戰。舊引擎不再參與判定。</span></section>`:'';
 const editor=state.ready&&state.screen==='editor'?renderVisualDeckBuilder({
  titles:TITLES,titleId:state.title,ready:true,tab:state.tab,search:state.search,type:state.type,color:state.color,energy:state.energy,
  counts:state.counts[state.title],name:state.names[state.title],nameId:'v2DeckName',savedId:'v2SavedSelect',
  savedOptions:[...(state.title==='bleach'?BUILTIN_BLEACH_V2_DECKS.map(d=>({value:'builtin:'+d.id,label:'指定牌組｜'+d.displayName+'（50 張）'})):[]),...savedData[state.title].map((d,i)=>({value:String(i),label:d.name}))],
  saveAction:'saveDeck',newAction:'newDeck',issues:info.issues,
  v2SupportedIds:info.supported,v2Ready:info.ready,reselectLabel:'‹ 返回牌組列表'
 }):(!state.ready?renderVisualDeckBuilder({
  titles:TITLES,titleId:state.title,ready:false,tab:state.tab,search:state.search,type:state.type,color:state.color,energy:state.energy,
  counts:state.counts[state.title],name:state.names[state.title],nameId:'v2DeckName',savedId:'v2SavedSelect',
  savedOptions:[],saveAction:'saveDeck',newAction:'newDeck',issues:[],v2SupportedIds:null,v2Ready:false
 }):'');
 const stage=browsing?(state.screen==='detail'?renderDetail():renderGallery()):'';
 const modal=state.inspection?showDetail(state.inspection):state.exportText!==null?
  `<div class="v2e-modal-backdrop"><section class="v2e-modal" role="dialog" aria-modal="true" aria-label="複製牌組"><button class="v2e-x" data-action="dismiss">關閉 ×</button><h2>牌組清單</h2><textarea id="v2Export" rows="17" readonly>${escapeHtml(state.exportText)}</textarea><button class="v2e-primary" data-action="copyDeck">複製至剪貼簿</button></section></div>`:'';
 $('#app').innerHTML=`<div class="v2e-shell"><header class="v2e-header"><a href="/" class="v2e-logo">UNION ARENA <b>V2</b></a><nav><a href="/">V2 正式對戰</a><a href="/online.html">帳號／線上對戰</a><a href="/index.html" aria-current="page">卡片圖鑑／組卡</a></nav></header><main class="v2e-main"><div class="v2e-heading"><div><span class="vdb-eyebrow">OFFICIAL V2 ENGINE ONLY</span><h1>${pageTitle}</h1></div><a class="v2e-primary" href="/">前往 V2 對戰</a></div>${accountBanner}${infoBanner}${designatedPanel}${stage}${editor}</main><footer class="v2e-footer">所有對戰均使用 Universal V2。可保留以前的牌組草稿，但舊版引擎、Beta 引擎和舊版 auto 標籤不再使用。</footer>${modal||''}</div>`;
 bind();
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
   body:JSON.stringify({name:entry.name,title,counts:entry.counts,localId})});
  if(response.ok){
   notify(origin?'已更新原本的帳號牌組':'已儲存，並同步到登入帳號');
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
  state.detail={source:'saved',id:item.id};
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
  const item=savedData[state.title].find(row=>row.id===detail.id);
  if(!item){notify('找不到這副牌組');return;}
  releaseCloudOrigin(item.id);
  state.counts[state.title]={...item.counts};
  state.names[state.title]=item.name;
  state.selectedSaved[state.title]=item.id;
  state.shareFlag=item.shared===true;
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
function bind(){
 $('#app').onclick=e=>{
  const el=e.target.closest('button');
  if(!el||el.disabled)return;
  const data=el.dataset;
  if(data.designatedPreset){if(useDesignatedBleachPreset(data.designatedPreset)){render();notify('已載入 '+state.names.bleach+'；可以先查看，再決定要不要編輯。');}return;}
  if(data.galleryTab){state.galleryTab=data.galleryTab==='shared'?'shared':'mine';state.screen='gallery';state.detail=null;render();return;}
  if(data.deckOpen){openDeck(data.deckOpen);return;}
  if(data.deckBack!==undefined){state.screen='gallery';state.inspection=null;state.exportText=null;render();return;}
  if(data.title){state.cloudOrigin=null;state.title=data.title;state.ready=true;state.screen='gallery';state.galleryTab='mine';state.detail=null;state.tab='pick';state.search='';state.type=state.color=state.energy='all';render();return;}
  if(data.builderReselect!==undefined){state.screen='gallery';state.detail=null;state.search='';state.inspection=null;state.exportText=null;render();return;}
  if(data.builderTab){state.tab=data.builderTab;render();return;}
  if(data.builderType){state.type=data.builderType;render();return;}
  if(data.builderColor){state.color=data.builderColor;render();return;}
  if(data.builderEnergy){state.energy=data.builderEnergy;render();return;}
  if(data.builderClear!==undefined){state.search='';state.type=state.color=state.energy='all';render();return;}
  if(data.inspect){state.inspection=data.inspect;render();return;}
  if(data.builderCount){
   const t=TITLES.find(t=>t.id===state.title),c=t.cards.find(x=>x.id===data.builderCount);
   if(!c||c.type==='ap'||c.type==='action-point'||c.type==='action_point')return;
   const val=Number(data.delta);
   if(![-1,1].includes(val))return;
   const n=state.counts[state.title][c.id]||0;
   if(val>0&&Object.values(state.counts[state.title]).reduce((a,b)=>a+b,0)>=50){notify('一副牌最多 50 張');return;}
   state.counts[state.title][c.id]=Math.max(0,Math.min(c.maxCopies||4,n+val));
   persist();render();return;
  }
  if(data.action==='dismiss'){state.inspection=null;state.exportText=null;render();return;}
  if(data.action==='pickTitle'){state.ready=false;state.screen='gallery';state.detail=null;state.search='';render();return;}
  if(data.action==='editDeck'){openEditor();return;}
  if(data.action==='toggleShare'){toggleShare();return;}
  if(data.action==='newDeck'){state.cloudOrigin=null;state.shareFlag=false;state.counts[state.title]={};state.names[state.title]=defaults[state.title];state.selectedSaved[state.title]=null;state.detail={source:'draft',id:'draft'};state.screen='editor';state.tab='pick';persist();render();notify('已建立空白草稿');return;}
  if(data.action==='saveDeck'){
   const title=state.title,records=savedData[title],counts=normalizeEditorCounts(title,state.counts[title]);
   const selected=state.selectedSaved[title]||((state.cloudOrigin?.title===title)?'v2-account-'+state.cloudOrigin.remoteId:null),name=state.names[title].trim()||defaults[title];
   const old=records.find(d=>d.id===selected);
   const entry={id:old?.id||(selected&&/^[A-Za-z0-9:_-]{1,80}$/.test(selected)?selected:null)||'v2-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts,updatedAt:new Date().toISOString(),shared:state.shareFlag===true,coverId:old?.coverId||null};
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
    sessionStorage.setItem(V2_EDITOR_TRANSFER_KEY,JSON.stringify({title:list.title,name:list.name,counts:check.counts}));
    persist();window.location.assign('/');
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
 const saved=$('#v2SavedSelect');
 if(saved)saved.onchange=()=>{
  if(saved.value==='')return;
  if(saved.value.startsWith('builtin:')){if(useDesignatedBleachPreset(saved.value.slice(8),'editor')){render();notify('已載入 '+state.names.bleach);}return;}
  const item=savedData[state.title][Number(saved.value)];
  if(!item)return;
  releaseCloudOrigin(item.id);
  state.counts[state.title]={...item.counts};state.names[state.title]=item.name;state.selectedSaved[state.title]=item.id;state.shareFlag=item.shared===true;
  state.detail={source:'saved',id:item.id};state.screen='editor';
  persist();render();notify('已載入 '+item.name);
 };
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.inspection||state.exportText!==null)){state.inspection=null;state.exportText=null;render();}});
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
  state.names[title]=typeof payload.name==='string'?payload.name.trim().slice(0,40)||defaults[title]:defaults[title];
  const localId=typeof payload.localId==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(payload.localId)?payload.localId:null;
  const scopedLocalId='v2-account-'+payload.remoteId;
  state.selectedSaved[title]=savedData[title].some(x=>x.id===scopedLocalId)?scopedLocalId:null;
  state.cloudOrigin={remoteId:payload.remoteId,title,localId};
  state.shareFlag=readSharedIds(localStorage).has(payload.remoteId);
  state.screen=viewing?'detail':'editor';
  state.detail=viewing?{source:'cloud',id:payload.remoteId}:null;
  return true;
 }catch{return false;}
}
if(!requestedDeck)importAccountDeckHandoff();
render();
