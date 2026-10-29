import {renderDeckRecord} from './deck-records.mjs';
import {titleLogo} from './title-logos.mjs';
import {coverChoices,displayCoverCard,validDeckCoverId} from './deck-cover-selection.mjs';

function vdbEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function vdbImage(c){return c?.onlineImage||c?.image||'assets/mark.svg';}
function isApCard(card){return !card||['ap','action_point','action-point'].includes(card.type)||/AP\d+$/i.test(card.id||'');}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
export function requiredEnergyKey(card){
 const n=finite(card?.energy);
 if(n==null)return null;
 return n>=9?'8+':String(n);
}
export function generateKey(card){
 const n=finite(card?.gen);
 if(n==null)return null;
 return n>=6?'6+':String(n);
}
function matchesEnergy(card,energy,energies){
 if(Array.isArray(energies)){
  if(!energies.length||energies.includes('all'))return true;
  return energies.map(String).includes(requiredEnergyKey(card));
 }
 if(energy==null||energy==='all')return true;
 if(String(energy)==='8+')return finite(card?.energy)!=null&&finite(card.energy)>=9;
 return String(card?.energy)===String(energy);
}
function matchesGenerate(card,generate){
 if(generate==null||generate==='all')return true;
 if(String(generate)==='3+')return finite(card?.gen)!=null&&finite(card.gen)>=3;
 return String(finite(card?.gen))===String(generate);
}
const SORTS=[['energy-asc','必要能量低 → 高'],['energy-desc','必要能量高 → 低'],['gen-asc','產能低 → 高'],['gen-desc','產能高 → 低']];
const ENERGY_KEYS=['0','1','2','3','4','5','6','7','8','8+'];
const GENERATE_KEYS=['0','1','2','3','3+'];
const TYPE_LABELS={character:'角色',field:'場地',event:'事件'};
const COLOR_NAMES={red:'紅',blue:'藍',yellow:'黃',green:'綠',purple:'紫'};
const COLOR_ORDER=['red','blue','yellow','green','purple'];
const TRIGGER_NAMES={active:'激活',get:'獲得',draw:'抽牌',raid:'突襲',color:'COLOR',special:'SPECIAL',final:'FINAL',none:'無'};
const TITLE_NAMES={rezero:'Re:從零開始的異世界生活','steins-gate':'命運石之門',madoka:'魔法少女小圓',inuyasha:'犬夜叉',kjn:'我想成為影之強者！',bleach:'BLEACH 千年血戰篇','gurren-lagann':'天元突破 紅蓮螺巖','sword-art-online':'刀劍神域','solo-leveling':'我獨自升級','mushoku-tensei':'無職轉生'};

function makeVisualDeckModel({cards,counts,search='',type='all',color='all',energy='all',energies,generate='all',sort='energy-asc',titleName=''}={}) {
 const source=Array.isArray(cards)?cards:[];
 const eligible=source.filter(card=>!isApCard(card));
 const amount=card=>Math.max(0,Number(counts?.[card.id])||0);
 const chosen=eligible.filter(card=>amount(card)>0);
 const total=chosen.reduce((sum,card)=>sum+amount(card),0);
 const groups=[['character','角色'],['field','場地'],['event','事件']].map(([id,label])=>{
  const rows=chosen.filter(card=>card.type===id);
  return {id,label,cards:rows,total:rows.reduce((sum,card)=>sum+amount(card),0)};
 });
 const q=String(search||'').trim().toLocaleLowerCase();
 const results=eligible.filter(card=>{
  if(type!=='all'&&card.type!==type)return false;
  if(color!=='all'&&card.color!==color)return false;
  if(!matchesEnergy(card,energy,energies))return false;
  if(!matchesGenerate(card,generate))return false;
  if(!q)return true;
  return [card.name,card.nameZh,card.nameJa,card.number,card.id,card.effect,card.effectJa,card.tag,card.triggerEffect,card.triggerText,card.triggerTextJa,titleName,...(card.traits||[]),...(Array.isArray(card.faq)?card.faq:[])].some(value=>String(value??'').toLocaleLowerCase().includes(q));
 });
 const direction=String(sort).endsWith('desc')?-1:1;
 const field=String(sort).startsWith('gen')?'gen':'energy';
 results.sort((a,b)=>{
  const av=finite(a[field]),bv=finite(b[field]);
  const an=av==null?Number.POSITIVE_INFINITY:av,bn=bv==null?Number.POSITIVE_INFINITY:bv;
  if(an!==bn)return (an-bn)*direction;
  const byNumber=String(a.number||a.id).localeCompare(String(b.number||b.id),'en',{numeric:true});
  return byNumber||String(a.id).localeCompare(String(b.id),'en');
 });
 const colors=[...new Set(eligible.map(card=>card.color).filter(Boolean))];
 const energiesFound=[...new Set(eligible.map(card=>card.energy).filter(value=>Number.isFinite(Number(value))))].sort((a,b)=>Number(a)-Number(b));
 const triggerCounts={};
 for(const card of chosen)if(card.trigger)triggerCounts[card.trigger]=(triggerCounts[card.trigger]||0)+amount(card);
 const curve=keys=>Object.fromEntries(keys.map(key=>[key,0]));
 const energyCurve=curve(ENERGY_KEYS),generateCurve=curve(['0','1','2','3','4','5','6+']);
 for(const card of chosen){
  const copies=amount(card);
  const energyKey=requiredEnergyKey(card);
  if(energyKey&&Object.prototype.hasOwnProperty.call(energyCurve,energyKey))energyCurve[energyKey]+=copies;
  const produced=generateKey(card);
  if(produced&&Object.prototype.hasOwnProperty.call(generateCurve,produced))generateCurve[produced]+=copies;
 }
 return {eligible,chosen,total,groups,results,colors,energies:energiesFound,triggerCounts,amount,energyCurve,generateCurve};
}

function bars(bins){
 const max=Math.max(1,...Object.values(bins));
 return Object.entries(bins).map(([key,count])=>`<div><b>${count}</b><i style="height:${Math.max(4,Math.round(count/max*72))}px"></i><span>${vdbEsc(key)}</span></div>`).join('');
}
function chips(options,active,attr){
 return options.map(([id,label])=>`<button type="button" data-${attr}="${vdbEsc(id)}" class="${active===id?'active':''}" aria-pressed="${active===id}">${vdbEsc(label)}</button>`).join('');
}
function energyChips(energies,energy){
 const selected=Array.isArray(energies)?new Set(energies.map(String)):null;
 const allOn=selected?selected.size===0||selected.has('all'):energy==='all'||energy==null;
 const on=id=>selected?selected.has(id):String(energy)===id;
 const button=(id,label,pressed)=>`<button type="button" data-builder-energy="${vdbEsc(id)}" class="${pressed?'active':''}" aria-pressed="${pressed}">${label}</button>`;
 return button('all','全部',allOn)+ENERGY_KEYS.map(id=>button(id,id,!allOn&&on(id))).join('');
}

function renderVisualDeckBuilder({titles,titleId,ready,tab,search,type,color,energy,energies,generate='all',sort='energy-asc',counts,name,nameId,savedId,savedOptions,saveAction,newAction,issues,allowSave=true,v2SupportedIds=null,v2Ready=false,reselectLabel='‹ 返回牌組列表',focusCard=null,record=null,recordView='all',allowDelete=false,coverId=null,coverPicker=false}={}) {
 const list=Array.isArray(titles)?titles:[];
 const title=list.find(item=>item.id===titleId)||list[0]||{id:'',label:'',cards:[]};
 const titleName=TITLE_NAMES[title.id]||title.label||'';
 const model=makeVisualDeckModel({cards:title.cards,counts,search,type,color,energy,energies,generate,sort,titleName});
 const img=(card,cls='')=>`<img class="${cls}" src="${vdbEsc(vdbImage(card))}" alt="${vdbEsc(card?.nameZh||card?.name||card?.number||'卡片')}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='assets/mark.svg'">`;
 const titleGrid=`<div class="vdb-title-grid">${list.map(item=>{const pick=item.cards.find(card=>card.image||card.onlineImage)||item.cards[0];const logo=titleLogo(item.id);const art=logo?`<span class="vdb-title-logo-plate"><img class="vdb-title-logo" src="${vdbEsc(logo.image)}" alt="${vdbEsc(logo.label)} Logo" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.hidden=true;this.nextElementSibling.hidden=false"><span class="vdb-title-logo-fallback" hidden>${vdbEsc(logo.label)}</span></span>`:img(pick);return `<button type="button" class="vdb-title-tile${ready&&item.id===titleId?' is-selected':''}" data-title="${vdbEsc(item.id)}" aria-pressed="${ready&&item.id===titleId}"><span class="vdb-tile-art">${art}</span><span class="vdb-tile-info"><strong>${vdbEsc(TITLE_NAMES[item.id]||item.label)}</strong><small>${item.cards.length} 種已收錄卡牌</small></span></button>`;}).join('')}</div>`;
 const logoCredits=list.filter(item=>titleLogo(item.id)).map(item=>{
  const logo=titleLogo(item.id);
  const license=logo.licenseUrl?` · <a href="${vdbEsc(logo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${vdbEsc(logo.license)}</a>`:" · "+vdbEsc(logo.license);
  return `<li><a href="${vdbEsc(logo.source)}" target="_blank" rel="noopener noreferrer">${vdbEsc(logo.label)}</a> · ${vdbEsc(logo.credit)}${license}</li>`;
 }).join('');
 const logoSource=logoCredits?`<details class="vdb-logo-credits"><summary>作品 Logo 來源與授權</summary><ul>${logoCredits}</ul><p>作品商標權利屬原權利人；本站非官方網站。</p></details>`:"";

 if(!ready)return `<div class="vdb arena-editor"><header class="vdb-intro"><span class="vdb-eyebrow">DECK BUILDER · 01 / 03</span><h1>先選擇卡牌作品</h1><p>選好作品，再從低必要能量開始加入卡片。各作品的牌組分開保存。</p></header>${titleGrid}<p class="vdb-footnote">卡圖與效果文字來自已收錄的官方卡牌資料。未移植的卡牌可以編進牌表，但不能進入 V2 對戰。</p>${logoSource}</div>`;
 const cardLine=card=>{
  const n=model.amount(card),limit=card.maxCopies??4;
  const produced=finite(card.gen);
  return `<article class="vdb-pool-card arena-card-row" data-card-id="${vdbEsc(card.id)}"><button type="button" class="vdb-card-photo" data-inspect="${vdbEsc(card.id)}" aria-label="檢視 ${vdbEsc(card.name||card.id)}">${img(card)}</button><div class="vdb-card-text"><button type="button" class="vdb-card-name" data-inspect="${vdbEsc(card.id)}" aria-label="放大查看 ${vdbEsc(card.nameZh||card.name||card.nameJa||card.id)} 的卡圖與效果">${vdbEsc(card.nameZh||card.name||card.nameJa||card.id)}</button><small>${vdbEsc(card.number||card.id)}</small><div class="vdb-card-tags"><span>${vdbEsc(TYPE_LABELS[card.type]||card.type||'卡牌')}</span><span>產能 ${produced==null?'—':produced}</span><span>必要能量 ${vdbEsc(card.energy??'—')}</span><span>${vdbEsc(COLOR_NAMES[card.color]||card.color||'')}</span></div>${v2SupportedIds?`<small class="${v2SupportedIds.has(card.id)?'vdb-supported':'vdb-card-warn'}">${v2SupportedIds.has(card.id)?'✓ V2 已登錄':'V2 尚未移植，僅可收藏組卡'}</small>`:''}</div><div class="vdb-quantity"><button type="button" data-builder-count="${vdbEsc(card.id)}" data-delta="1" aria-label="增加 ${vdbEsc(card.name||card.id)}" ${n>=limit||model.total>=50?'disabled':''}>＋</button><b>${n}</b><button type="button" data-builder-count="${vdbEsc(card.id)}" data-delta="-1" aria-label="減少 ${vdbEsc(card.name||card.id)}" ${n?'':'disabled'}>−</button></div></article>`;
 };
 const chosenColors=[...new Set(model.chosen.map(card=>card.color))].map(item=>COLOR_NAMES[item]||item).join('／')||'尚未選色';
 const battleButton=v2SupportedIds!=null?`<button type="button" data-action="v2Play" ${v2Ready?'':'disabled'} class="arena-battle">測試對戰</button>`:`<button type="button" data-action="enterV2Battle" ${v2Ready?'':'disabled'} class="vdb-save arena-battle">進入 V2 對戰</button>`;
 const issuesBlock=`<div class="vdb-issues ${issues?.length?'has-issues':'is-complete'}" role="status">${issues?.length?vdbEsc(issues[0]):'✓ 牌組已符合目前的張數及規則檢查。'}${issues?.length>1?`<span>${vdbEsc(issues.slice(1).join('；'))}</span>`:''}</div>`;
 const deckCards=model.groups.filter(group=>group.total).map(group=>`<section class="vdb-review-group"><h3>${group.label}<span>${group.total} 張</span></h3><div class="vdb-review-cards">${group.cards.map(card=>`<div class="vdb-mini-card"><button type="button" data-inspect="${vdbEsc(card.id)}" aria-label="查看 ${vdbEsc(card.name||card.id)}">${img(card)}</button><span class="vdb-count-badge">×${model.amount(card)}</span><button type="button" data-builder-count="${vdbEsc(card.id)}" data-delta="-1" aria-label="從牌組移除一張 ${vdbEsc(card.name||card.id)}">−</button><small>${vdbEsc(card.number||card.id)}</small></div>`).join('')}</div></section>`).join('')||'<div class="vdb-empty">還沒有卡片。從左側列表用＋加入，必要能量低的卡會排在前面。</div>';
 const triggers=Object.keys(model.triggerCounts).length?Object.entries(model.triggerCounts).sort((a,b)=>b[1]-a[1]).map(([key,count])=>`<span>${vdbEsc(TRIGGER_NAMES[key]||key)} <b>×${count}</b></span>`).join(''):'<span>目前尚無 Trigger 卡。</span>';
 const triggerBody=focusCard?[focusCard.triggerEffect,focusCard.triggerText,focusCard.triggerTextJa].find(value=>typeof value==='string'&&value.trim()):'';
 const focus=focusCard&&!isApCard(focusCard)?`<article class="arena-focus"><button type="button" class="arena-focus-art" data-action="zoomCard" aria-label="放大 ${vdbEsc(focusCard.name||focusCard.id)}">${img(focusCard)}</button><div><h3>${vdbEsc(focusCard.nameZh||focusCard.name||focusCard.nameJa||focusCard.id)}</h3><p>${vdbEsc(focusCard.number||focusCard.id)}</p><p>${vdbEsc(titleName)} · ${vdbEsc(COLOR_NAMES[focusCard.color]||focusCard.color||'顏色未記載')} · ${vdbEsc(TYPE_LABELS[focusCard.type]||focusCard.type||'')}</p><dl><div><dt>產能</dt><dd>${finite(focusCard.gen)==null?'—':finite(focusCard.gen)}</dd></div><div><dt>必要能量</dt><dd>${vdbEsc(focusCard.energy??'—')}</dd></div><div><dt>BP</dt><dd>${focusCard.bp==null?'—':vdbEsc(focusCard.bp)}</dd></div><div><dt>AP</dt><dd>${focusCard.ap==null?'—':vdbEsc(focusCard.ap)}</dd></div><div><dt>Trigger</dt><dd>${vdbEsc(TRIGGER_NAMES[focusCard.trigger]||focusCard.trigger||'なし')}</dd></div></dl>${triggerBody?`<p class="arena-trigger">${vdbEsc(triggerBody)}</p>`:''}<p class="arena-effect">${vdbEsc(focusCard.effect||'資料庫沒有另記效果文字。')}</p>${focusCard.effectJa?`<details><summary>官方日文原文</summary><p>${vdbEsc(focusCard.effectJa)}</p></details>`:''}${Array.isArray(focusCard.faq)&&focusCard.faq.length?`<p class="arena-faq">官方 FAQ 題號：${focusCard.faq.map(vdbEsc).join('、')}</p>`:''}${focusCard.source?`<p><a href="${vdbEsc(focusCard.source)}" target="_blank" rel="noopener noreferrer">查看卡牌來源</a></p>`:''}<button type="button" data-action="zoomCard">放大卡圖</button></div></article>`:'<p class="arena-empty">點左側或牌組裡的卡圖，這裡會顯示那張卡的收錄資料。</p>';
 const pool=`<section class="vdb-finder arena-pool" aria-label="搜尋並加入卡牌">
 <div class="vdb-search"><label for="search">搜尋卡片</label><div class="arena-search-line"><input id="search" type="search" value="${vdbEsc(search||'')}" placeholder="請輸入關鍵字…" autocomplete="off"><button type="button" data-builder-search="1">搜尋</button></div></div>
 <div class="vdb-filter-line arena-filter"><b>種類</b>${chips([['all','全部'],['character','角色'],['field','場地'],['event','事件']],type||'all','builder-type')}</div>
 <div class="vdb-filter-line arena-filter"><b>顏色</b>${chips([['all','全部'],...COLOR_ORDER.map(id=>[id,COLOR_NAMES[id]])],color||'all','builder-color')}</div>
 <div class="vdb-filter-line arena-filter arena-energy-row"><b>必要能量</b>${energyChips(energies,energy)}</div>
 <div class="vdb-filter-line arena-filter arena-energy-row"><b>產能</b>${chips([['all','全部'],...GENERATE_KEYS.map(id=>[id,id])],String(generate||'all'),'builder-generate')}</div>
 <div class="vdb-pool-head"><strong>列表 <small>共 ${model.results.length} 種</small></strong><div class="arena-list-tools"><button type="button" data-builder-clear="1">清空篩選</button><a href="#arena-editor-start">返回頂部 ↑</a></div></div>
 <details class="arena-filter-more"><summary>展開排序選項</summary><div class="vdb-filter-line arena-filter arena-sort-row"><b>排序</b>${chips(SORTS,SORTS.some(([id])=>id===sort)?sort:'energy-asc','builder-sort')}</div></details>
 <div class="vdb-pool-grid">${model.results.length?model.results.map(cardLine).join(''):'<div class="vdb-empty">找不到符合條件的卡片。清空篩選後可以重新查看全部卡牌。</div>'}</div>
 </section>`;
 const deck=`<section class="arena-deck" aria-label="牌組內容"><details class="arena-deck-fold" open><summary>目前牌組 ${model.total} / 50</summary><div class="arena-deck-body"><div class="arena-deck-head"><div><small>${vdbEsc(titleName)}</small><h2 id="deckHeading">${vdbEsc(name||'未命名牌組')}</h2><p>${vdbEsc(chosenColors)} · ${model.total} / 50 張</p></div><div class="arena-deck-actions"><button type="button" data-action="visualExport">複製牌組</button>${battleButton}${allowDelete?'<button type="button" data-action="deleteDeck">刪除牌組</button>':''}<button type="button" data-action="${vdbEsc(newAction)}">新建空白</button></div></div><nav class="vdb-tabs" aria-label="組卡步驟"><button type="button" data-builder-tab="pick" class="${tab==='pick'?'active':''}">① 選擇卡片</button><button type="button" data-builder-tab="overview" class="${tab==='overview'?'active':''}">牌組總覽 <span>${model.total}</span></button></nav><div class="arena-name-row"><label>牌組名稱<input id="${vdbEsc(nameId)}" maxlength="40" value="${vdbEsc(name||'')}" placeholder="替自己的牌組取個名字"></label><label>已儲存的牌組<select id="${vdbEsc(savedId)}"><option value="">${titleId==='bleach'?'編輯中的牌組':'選擇儲存的牌組'}</option>${(savedOptions||[]).map(option=>`<option value="${vdbEsc(option.value)}">${vdbEsc(option.label)}</option>`).join('')}</select></label></div>${issuesBlock}<div class="vdb-review arena-deck-board">${deckCards}</div><div class="arena-triggers" aria-label="觸發統計">${triggers}<p>AP 卡不計入 50 張主牌組。</p></div></div></details></section>`;
 const heroCover=displayCoverCard(title.cards,counts,coverId);
 const selectedCoverId=validDeckCoverId(title.cards,counts,coverId);
 const heroGallery=model.chosen.map(card=>`<button type="button" class="arena-hero-thumb" data-inspect="${vdbEsc(card.id)}" aria-label="查看 ${vdbEsc(card.name||card.id)}，牌組中 ${model.amount(card)} 張">${img(card)}<b>×${model.amount(card)}</b></button>`).join('');
 const hero=`<section id="arena-editor-start" class="arena-builder-hero" aria-label="正在編輯的牌組">
 <div class="arena-hero-overview">
  <button type="button" class="arena-hero-cover" data-builder-cover-open="1" aria-label="更換牌組封面">${heroCover?img(heroCover):'<span class="arena-cover-empty">＋<small>選擇封面</small></span>'}<span class="arena-cover-edit">更換封面</span></button>
  <div class="arena-hero-description"><h2>${vdbEsc(name||'新建卡組')}</h2><p>${vdbEsc(titleName)}</p><small>封面可自由更換，從已加入的卡片中選擇；牌組名稱可在下方編輯。</small></div>
  <div class="arena-hero-actions"><button type="button" class="arena-preview-toggle" data-builder-tab="${tab==='overview'?'pick':'overview'}" role="switch" aria-checked="${tab==='overview'}"><span>預覽模式</span><span class="arena-switch-track" aria-hidden="true"><i></i></span></button>
  <button type="button" data-action="${vdbEsc(saveAction)}" class="arena-hero-save" ${allowSave?'':'disabled'}>儲存卡組</button></div>
 </div>
 <div class="arena-count-tabs" aria-label="牌組種類分布">${model.groups.map(group=>`<button type="button" data-builder-type="${vdbEsc(group.id)}" class="${type===group.id?'active':''}" aria-pressed="${type===group.id}">${group.label}卡 <b>${group.total}</b></button>`).join('')}</div>
 <div class="arena-hero-gallery" aria-label="已加入的卡片">${heroGallery||'<p>尚未加入卡片。從下方列表點 ＋ 就能開始組牌。</p>'}</div>
 </section>`;
 const coverOptions=coverChoices(title.cards,counts);
 const coverDialog=coverPicker?`<div class="arena-cover-backdrop"><section class="arena-cover-dialog" role="dialog" aria-modal="true" aria-label="選擇牌組封面"><div class="arena-cover-dialog-head"><h2>選擇牌組封面</h2><button type="button" data-builder-cover-close="1" aria-label="關閉選擇封面">×</button></div><p>從目前牌組已有的卡片挑選封面，不會改動卡片張數。</p><div class="arena-cover-options">${coverOptions.length?coverOptions.map(card=>`<button type="button" class="arena-cover-option${selectedCoverId===card.id?' is-chosen':''}" data-builder-cover-select="${vdbEsc(card.id)}" aria-pressed="${selectedCoverId===card.id}" aria-label="選擇 ${vdbEsc(card.nameZh||card.name||card.id)} 作為封面">${img(card)}<span>${vdbEsc(card.nameZh||card.name||card.id)}</span>${selectedCoverId===card.id?'<b>✓ 目前封面</b>':''}</button>`).join(''):'<p class="arena-cover-no-cards">牌組目前沒有卡片。先在下方列表點「＋」加入卡片，再選擇封面。</p>'}</div><div class="arena-cover-dialog-actions"><button type="button" data-builder-cover-reset="1" ${coverOptions.length?'':'disabled'}>使用自動封面</button><button type="button" data-builder-cover-close="1">完成</button></div></section></div>`:'';
 const info=`<aside class="arena-info" aria-label="牌組資訊"><h2>牌組資訊</h2><p class="arena-total"><strong>${model.total} / 50</strong></p><ul class="arena-type-counts">${model.groups.map(group=>`<li><span>${group.label}</span><b>${group.total}</b></li>`).join('')}</ul><h3>能量曲線</h3><div class="arena-curve" aria-label="必要能量分布">${bars(model.energyCurve)}</div><h3>產能分布</h3><div class="arena-curve arena-curve-gen" aria-label="產能分布">${bars(model.generateCurve)}</div>${renderDeckRecord({record,view:recordView})}<div class="arena-detail"><h3>卡片詳細資訊</h3>${focus}</div></aside>`;
 return `<div class="vdb arena-editor">${hero}${coverDialog}<div class="arena-editor-grid">${pool}${deck}</div><p class="vdb-footnote">產能是卡牌放到能源區時產生的能源，必要能量是登場所需能量，兩者不是 AP。加減卡即時寫進這副牌，同卡號上限沿用各卡自己的張數限制。</p>${info}</div>`;
}

export {makeVisualDeckModel,renderVisualDeckBuilder};
