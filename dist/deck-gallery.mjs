// Read-only deck list and detail. Counts stay in the existing deck records;
// this module only derives cover, type groups and trigger totals for display.
const TRIGGER_STAT_ORDER=Object.freeze([
 ['active','激活'],
 ['get','獲得'],
 ['draw','抽牌'],
 ['raid','突進'],
 ['color','COLOR'],
 ['special','SPECIAL'],
 ['final','FINAL']
]);

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function isDeckApCard(card){
 return !card||['ap','action_point','action-point'].includes(card.type)||/AP\d+$/i.test(card.id||'');
}

export function deckCardImage(card){
 return card?.onlineImage||card?.image||'assets/mark.svg';
}

function cardKeys(card){
 return [card?.id,card?.identity,card?.number,...(card?.aliases||[])].filter(key=>typeof key==='string'&&key);
}

function positiveCount(value){
 const count=Number(value);
 return Number.isInteger(count)&&count>0?count:0;
}

export function summarizeDeck(cards,counts,coverId){
 const list=Array.isArray(cards)?cards:[];
 const byKey=new Map();
 for(const card of list){
  if(!card||typeof card!=='object')continue;
  for(const key of cardKeys(card))if(!byKey.has(key))byKey.set(key,card);
 }
 const merged=new Map();
 for(const [raw,value] of Object.entries(counts||{})){
  const count=positiveCount(value);
  if(!count)continue;
  const card=byKey.get(raw);
  if(!card||isDeckApCard(card))continue;
  merged.set(card.id,(merged.get(card.id)||0)+count);
 }
 const order=new Map(list.map((card,index)=>[card?.id,index]));
 const entries=[...merged.entries()].map(([id,count])=>({card:byKey.get(id),count})).filter(row=>row.card);
 entries.sort((a,b)=>(order.get(a.card.id)??0)-(order.get(b.card.id)??0));
 const groups=[['character','角色'],['event','事件'],['field','場地']].map(([id,label])=>{
  const rows=entries.filter(row=>row.card.type===id);
  return {id,label,entries:rows,total:rows.reduce((sum,row)=>sum+row.count,0)};
 });
 const triggers=Object.fromEntries(TRIGGER_STAT_ORDER.map(([key])=>[key,0]));
 for(const row of entries){
  const trigger=row.card.trigger;
  if(typeof trigger==='string'&&Object.hasOwn(triggers,trigger))triggers[trigger]+=row.count;
 }
 return {
  entries,
  total:entries.reduce((sum,row)=>sum+row.count,0),
  groups,
  triggers,
  cover:pickCover(list,entries,coverId)
 };
}

function pickCover(cards,entries,coverId){
 if(typeof coverId==='string'&&coverId){
  const chosen=entries.find(row=>cardKeys(row.card).includes(coverId));
  if(chosen)return chosen.card;
 }
 return entries.find(row=>row.card.type==='character')?.card
  ||entries[0]?.card
  ||cards.find(card=>card&&!isDeckApCard(card)&&(card.onlineImage||card.image))
  ||cards.find(card=>card&&!isDeckApCard(card))
  ||null;
}

export function formatDeckUpdated(iso,now=Date.now(),style='date'){
 const missing=style==='publish'?'尚未記錄發布時間':'尚未記錄更新時間';
 if(typeof iso!=='string'||!iso)return style==='date'?missing.replace('時間','日期'):missing;
 const time=Date.parse(iso);
 if(!Number.isFinite(time))return style==='date'?missing.replace('時間','日期'):missing;
 if(style==='relative'||style==='publish'){
  const elapsed=Math.max(0,now-time);
  const verb=style==='publish'?'發布':'更新';
  const minute=60*1000,hour=60*minute,day=24*hour;
  if(elapsed<minute)return '剛剛'+verb;
  if(elapsed<hour)return Math.floor(elapsed/minute)+' 分鐘前'+verb;
  if(elapsed<day)return Math.floor(elapsed/hour)+' 小時前'+verb;
  return Math.floor(elapsed/day)+' 天前'+verb;
 }
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(time));
 const pick=type=>parts.find(part=>part.type===type)?.value||'';
 return `更新於 ${pick('year')}.${pick('month')}.${pick('day')}`;
}

function imgTag(card,alt){
 return `<img src="${esc(deckCardImage(card))}" alt="${esc(alt||card?.nameZh||card?.name||card?.nameJa||'牌組封面')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/mark.svg'">`;
}

export function renderDeckGallery({tab='mine',sections=[]}={}){
 const tabs=[['mine','我的牌組'],['shared','分享列表']].map(([id,label])=>`<button type="button" data-gallery-tab="${id}" class="${tab===id?'active':''}" aria-selected="${tab===id}" role="tab">${label}</button>`).join('');
 const body=sections.map(section=>{
  const cards=(section.items||[]).map(item=>`<button type="button" class="dkg-card" data-deck-open="${esc(item.key)}" aria-label="查看牌組 ${esc(item.name)}"><span class="dkg-card-art">${imgTag(item.cover,item.name)}</span><span class="dkg-card-copy"><strong>${esc(item.name)}</strong><small>${esc(item.time)}</small>${item.meta?`<small>${esc(item.meta)}</small>`:''}</span></button>`).join('');
  const empty=cards?'':`<div class="dkg-empty">${esc(section.empty||'這裡還沒有牌組。')}</div>`;
  const heading=section.title?`<h2>${esc(section.title)}</h2>`:'';
  return `<section class="dkg-section">${heading}<div class="dkg-cards">${cards}${empty}</div></section>`;
 }).join('');
 const create=tab==='mine'?`<button type="button" class="dkg-create" data-action="newDeck">＋ 建立新牌組</button>`:'';
 return `<div class="dkg"><div class="dkg-toolbar"><button type="button" class="dkg-back" data-action="pickTitle">‹ 更換作品</button></div><div class="dkg-tabs" role="tablist" aria-label="牌組列表">${tabs}</div>${create}${body}</div>`;
}

export function renderDeckDetail({name,updatedLabel,shared=false,shareEnabled=true,shareNote='',cover,total=0,groups=[],triggers={},battleReady=false}={}){
 const visible=(groups||[]).filter(group=>group.total>0);
 const board=visible.length?visible.map(group=>`<section class="dkg-group"><h2>${esc(group.label)} <span>${group.total} 張</span></h2><div class="dkg-board">${group.entries.map(row=>`<button type="button" class="dkg-mini" data-inspect="${esc(row.card.id)}" aria-label="查看 ${esc(row.card.nameZh||row.card.name||row.card.id)}，${row.count} 張">${imgTag(row.card,row.card.nameZh||row.card.name)}<b class="dkg-count">${row.count}</b></button>`).join('')}</div></section>`).join(''):'<div class="dkg-empty">這副牌組還沒有卡片。可以先進入編輯器加入。</div>';
 const stats=TRIGGER_STAT_ORDER.map(([key,label])=>`<span class="dkg-trigger ${esc(key)}">${esc(label)} <b>×${Number(triggers?.[key])||0}</b></span>`).join('');
 const share=shareEnabled
  ?`<button type="button" class="dkg-switch${shared?' on':''}" role="switch" aria-checked="${shared?'true':'false'}" data-action="toggleShare" aria-label="${shared?'公開':'未公開'}"><i></i></button>`
  :`<button type="button" class="dkg-switch" role="switch" aria-checked="false" disabled aria-label="尚未能公開"><i></i></button>`;
 return `<article class="dkg dkg-detail"><button type="button" class="dkg-back" data-deck-back="1">‹ 返回列表</button><header class="dkg-hero"><div class="dkg-hero-art">${imgTag(cover,name)}</div><div class="dkg-hero-copy"><h1>${esc(name||'未命名牌組')}</h1><p>${esc(updatedLabel||'尚未記錄更新日期')}</p><p class="dkg-total">${total} 張</p><div class="dkg-public"><span>公開狀態</span><b>${shared?'公開':'未公開'}</b>${share}</div>${shareNote?`<small>${esc(shareNote)}</small>`:''}</div></header><button type="button" class="dkg-edit" data-action="editDeck">編輯牌組</button><div class="dkg-actions"><button type="button" data-action="visualExport">複製牌組清單</button><button type="button" data-action="v2Play" ${battleReady?'':'disabled'}>測試對戰</button></div>${board}<section class="dkg-triggers" aria-label="觸發統計"><h2>觸發</h2><div class="dkg-trigger-row">${stats}</div></section></article>`;
}

export const DECK_SHARE_KEY='ua-v2-deck-shared-ids-v1';

export function readSharedIds(storage){
 try{
  const raw=JSON.parse(storage?.getItem(DECK_SHARE_KEY)||'[]');
  return new Set(Array.isArray(raw)?raw.filter(id=>typeof id==='string'&&id):[]);
 }catch{return new Set();}
}

export function writeSharedFlag(storage,id,shared){
 if(!storage||typeof id!=='string'||!id)return;
 const ids=readSharedIds(storage);
 if(shared)ids.add(id);else ids.delete(id);
 storage.setItem(DECK_SHARE_KEY,JSON.stringify([...ids]));
}

export {TRIGGER_STAT_ORDER};
