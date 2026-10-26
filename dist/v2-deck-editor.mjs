// Production deck editor: catalogue, drafts and Universal V2 bridge only.
// No import from engine.mjs, match-runtime.mjs, solo-match.mjs or ttg-core-match.mjs.
import {TITLES} from './title-registry.mjs';
import {PRESETS} from './cards.mjs';
import {makeVisualDeckModel,renderVisualDeckBuilder} from './visual-deck-builder.mjs';
import {BUILTIN_BLEACH_V2_DECKS,builtinBleachDeck,renderBuiltinBleachPanel} from './v2-bleach-builtins.mjs';
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
    counts:normalizeEditorCounts(t.id,d.counts)}];
  }catch{return [];}
 });
}
const bleachMeta=read(metaKey)||{};
const label=id=>TITLES.find(t=>t.id===id)?.label||id;
const defaults=Object.fromEntries(TITLES.map(t=>[t.id,t.id==='bleach'?(bleachMeta.name||'自訂 BLEACH 牌組'):t.id==='rezero'?'Re:Zero 自訂牌組':t.label+'自訂牌組']));
const state={title:'bleach',ready:false,tab:'pick',search:'',type:'all',color:'all',
 energy:'all',names:Object.fromEntries(TITLES.map(t=>[t.id,String(names[t.id]||defaults[t.id]).slice(0,40)])),
 counts:draftData,selectedSaved:{},inspection:null,exportText:null};
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
function useDesignatedBleachPreset(id){
 const preset=builtinBleachDeck(id);
 if(!preset)return false;
 // Only replace the working draft; never silently overwrite a player's saved deck.
 state.title='bleach';state.ready=true;state.tab='overview';state.search='';
 state.type=state.color=state.energy='all';
 state.counts.bleach={...preset.counts};state.names.bleach=preset.displayName;
 state.selectedSaved.bleach=null;persist();
 return true;
}
function showDetail(id){
 const card=TITLES.find(t=>t.id===state.title)?.cards.find(c=>c.id===id);
 if(!card)return;
 const img=card.onlineImage||card.image||'assets/mark.svg';
 const v2=status().supported.has(card.id);
 return `<div class="v2e-modal-backdrop" data-dismiss="1"><section role="dialog" aria-modal="true" aria-label="卡片效果" class="v2e-modal"><button type="button" class="v2e-x" data-action="dismiss">關閉 ×</button><div class="v2e-modal-columns"><img src="${escapeHtml(img)}" alt="${escapeHtml(card.nameJa||card.name||card.id)}" onerror="this.onerror=null;this.src='assets/mark.svg'"><div><h2>${escapeHtml(card.nameZh||card.name||card.nameJa||card.id)}</h2><p class="v2e-muted">${escapeHtml(card.number||card.id)}</p><p><strong>${v2?'✓ V2 已登錄':'V2 尚未移植完整效果'}</strong></p><p>${escapeHtml(card.effect||'無額外印刷能力')}</p>${card.effectJa?`<details><summary>官方日文原文</summary><p>${escapeHtml(card.effectJa)}</p></details>`:''}${card.source?`<p><a href="${escapeHtml(card.source)}" target="_blank" rel="noopener noreferrer">查看卡牌來源</a></p>`:''}</div></div></section></div>`;
}
function render(){
 const t=TITLES.find(t=>t.id===state.title)||TITLES[0],info=status();
 const countAll=t.cards.length;
 const designatedPanel=state.ready&&state.title==='bleach'?renderBuiltinBleachPanel(escapeHtml):'';
 const infoBanner=state.ready?`<section class="v2e-coverage" role="status"><strong>Universal V2 · ${info.registered} / ${countAll} 張已登錄</strong><span>組卡可以使用完整卡表，但只有整副 50 張全部符合 V2 規則才可開始對戰。舊引擎不再參與判定。</span></section>`:'';
 const editor=renderVisualDeckBuilder({
  titles:TITLES,titleId:state.title,ready:state.ready,tab:state.tab,search:state.search,type:state.type,color:state.color,energy:state.energy,
  counts:state.counts[state.title],name:state.names[state.title],nameId:'v2DeckName',savedId:'v2SavedSelect',
  savedOptions:[...(state.title==='bleach'?BUILTIN_BLEACH_V2_DECKS.map(d=>({value:'builtin:'+d.id,label:'指定牌組｜'+d.displayName+'（50 張）'})):[]),...savedData[state.title].map((d,i)=>({value:String(i),label:d.name}))],
  saveAction:'saveDeck',newAction:'newDeck',issues:info.issues,
  v2SupportedIds:state.ready?info.supported:null,v2Ready:info.ready
 });
 const modal=state.inspection?showDetail(state.inspection):state.exportText!==null?
  `<div class="v2e-modal-backdrop"><section class="v2e-modal" role="dialog" aria-modal="true" aria-label="複製牌組"><button class="v2e-x" data-action="dismiss">關閉 ×</button><h2>牌組清單</h2><textarea id="v2Export" rows="17" readonly>${escapeHtml(state.exportText)}</textarea><button class="v2e-primary" data-action="copyDeck">複製至剪貼簿</button></section></div>`:'';
 $('#app').innerHTML=`<div class="v2e-shell"><header class="v2e-header"><a href="/" class="v2e-logo">UNION ARENA <b>V2</b></a><nav><a href="/">V2 正式對戰</a><a href="/online.html">帳號／線上對戰</a><a href="/index.html" aria-current="page">卡片圖鑑／組卡</a></nav></header><main class="v2e-main"><div class="v2e-heading"><div><span class="vdb-eyebrow">OFFICIAL V2 ENGINE ONLY</span><h1>牌組構築</h1></div><a class="v2e-primary" href="/">前往 V2 對戰</a></div>${infoBanner}${designatedPanel}${editor}</main><footer class="v2e-footer">所有對戰均使用 Universal V2。可保留以前的牌組草稿，但舊版引擎、Beta 引擎和舊版 auto 標籤不再使用。</footer>${modal||''}</div>`;
 bind();
}
function mirrorCloudDeck(title,entry){
 if(typeof fetch!=='function')return;
 const localId=typeof entry.id==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(entry.id)?entry.id:undefined;
 fetch('/api/decks',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
  body:JSON.stringify({name:entry.name,title,counts:entry.counts,localId})})
  .then(response=>{if(response.ok)notify('已儲存，並同步到登入帳號');})
  .catch(()=>{});
}
function bind(){
 $('#app').onclick=e=>{
  const el=e.target.closest('button');
  if(!el||el.disabled)return;
  const data=el.dataset;
  if(data.designatedPreset){if(useDesignatedBleachPreset(data.designatedPreset)){render();notify('已載入 '+state.names.bleach+'；可以查看、修改或另存。');}return;}
  if(data.title){state.title=data.title;state.ready=true;state.tab='pick';state.search='';state.type=state.color=state.energy='all';render();return;}
  if(data.builderReselect!==undefined){state.ready=false;state.search='';render();return;}
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
  if(data.action==='newDeck'){state.counts[state.title]={};state.names[state.title]=defaults[state.title];state.selectedSaved[state.title]=null;persist();render();notify('已建立空白草稿');return;}
  if(data.action==='saveDeck'){
   const title=state.title,records=savedData[title],counts=normalizeEditorCounts(title,state.counts[title]);
   const selected=state.selectedSaved[title],name=state.names[title].trim()||defaults[title];
   const old=records.find(d=>d.id===selected);
   const entry={id:old?.id||'v2-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts,updatedAt:new Date().toISOString()};
   if(old)records[records.indexOf(old)]=entry;else records.push(entry);
   state.selectedSaved[title]=entry.id;
   try{write(LEGACY_DECK_KEYS[title][1],records);persist();notify('已儲存牌組草稿');mirrorCloudDeck(title,entry);render();}
   catch(e){notify('儲存失敗：'+e.message);}return;
  }
  if(data.action==='visualExport'){
   const t=TITLES.find(t=>t.id===state.title);
   const activeCounts=state.counts[state.title];
   // A designated print may differ from the catalogue's default art/number.
   // Preserve the user's EXACT previously supplied source codes on export.
   const pinned=state.title==='bleach'?BUILTIN_BLEACH_V2_DECKS.find(p=>{
    const ids=new Set([...Object.keys(p.counts),...Object.keys(activeCounts)]);
    return [...ids].every(id=>(p.counts[id]||0)===(activeCounts[id]||0));
   }):null;
   const lines=pinned?pinned.sources.map(c=>c.copies+'x'+c.source):
    t.cards.filter(c=>activeCounts[c.id]>0).map(c=>activeCounts[c.id]+'x'+(c.number||c.id));
   state.exportText='# '+state.names[state.title]+'\n'+lines.join('\n');
   render();return;
  }
  if(data.action==='copyDeck'){
   const input=$('#v2Export');input?.select();
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(state.exportText).then(()=>notify('已複製牌組清單')).catch(()=>notify('請選取文字後手動複製'));
   else notify('請選取文字後手動複製');
   return;
  }
  if(data.action==='v2Play'){
   const check=status();
   if(!check.ready){notify(check.issues[0]||'牌組尚未符合 V2');return;}
   try{
    sessionStorage.setItem(V2_EDITOR_TRANSFER_KEY,JSON.stringify({title:state.title,name:state.names[state.title],counts:check.counts}));
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
  if(saved.value.startsWith('builtin:')){if(useDesignatedBleachPreset(saved.value.slice(8))){render();notify('已載入 '+state.names.bleach);}return;}
  const item=savedData[state.title][Number(saved.value)];
  if(!item)return;
  state.counts[state.title]={...item.counts};state.names[state.title]=item.name;state.selectedSaved[state.title]=item.id;
  persist();render();notify('已載入 '+item.name);
 };
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.inspection||state.exportText!==null)){state.inspection=null;state.exportText=null;render();}});
// Direct links from the V2 lobby explicitly load the requested built-in list.
const requestedDeck=new URLSearchParams(typeof window!=='undefined'?window.location?.search||'':'').get('bleachPreset');
if(requestedDeck)useDesignatedBleachPreset(requestedDeck);
render();
