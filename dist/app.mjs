import {CARDS,BY_ID,PRESETS,TYPE_NAMES,TRIGGER_NAMES,validateDeck,SETS,COLOR_NAMES,pendingCards,deckColors} from './cards.mjs?v=9.1.0';
import {normalizeCounts,emptyDeck,parseDeck,formatDeck,readSavedDecks,sameCounts} from './decks.mjs?v=8';
import {TITLES} from './title-registry.mjs';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {normalizeSoloDeck,soloDeckIssues,SOLO_DRAFT_PRESET} from './solo-decks.mjs';
import {SOLO_MATCH_SUPPORTED,SOLO_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET,soloTrainingDeckIssues,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloTrainingBotAction,assertSoloTrainingMatch,soloEnergy,soloMatchBp,inspectSoloAttached} from './solo-match.mjs';
import {TTG_CARDS,emptyTtgDeck,normalizeTtgCounts,ttgCount,ttgDeckIssues,readTtgSaved} from './ttg-builder.mjs';
import {newGame,dispatch,legalActions,controller,cardOf,bp,energy,locate,botAction,PHASE_NAMES,assertState} from './engine.mjs?v=9.1.1';

const $=s=>document.querySelector(s);
const GAME_KEY='bleach-arena-game-v1',DECK_KEY='bleach-arena-deck-v1',SAVED_DECKS_KEY='bleach-arena-saved-decks-v1',DECK_META_KEY='bleach-arena-deck-meta-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconPaths={home:'M3 10 12 3l9 7v10H3z M9 20v-7h6v7',cards:'M5 4h11v16H5z M9 2h10v15',book:'M12 5v15M12 5C8 2 3 3 3 3v15s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2',sword:'m16 3 5 1-1 5-9 9-5-5z M3 21l5-5 M4 12l8 8',robot:'M5 7h14v13H5z M12 3v4 M8 12h1 M15 12h1 M9 17h6 M2 11v5 M22 11v5',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a7 7 0 0 1 14 0v3 M17 5a3 3 0 0 1 0 6 M19 15a5 5 0 0 1 3 5',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',bolt:'m13 2-9 12h7l-1 8 10-13h-8z',arrow:'M4 12h15 M14 6l6 6-6 6',refresh:'M20 7v6h-6 M4 17v-6h6 M5 6a8 8 0 0 1 13 0 M19 18a8 8 0 0 1-13 0'};
const icon=k=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[k]||iconPaths.cards}"/></svg>`;
let deck=loadDeck(),game=loadGame();
let savedDecks=readSavedDecks(safeRead(SAVED_DECKS_KEY));
const SOLO_GAME_KEY='ua-slg-training-v1';
const SOLO_DRAFT_KEY='ua-slg-draft-v1',SOLO_SAVED_KEY='ua-slg-saved-v1';
const TTG_DRAFT_KEY='ua-ttg-draft-v1',TTG_SAVED_KEY='ua-ttg-saved-v1';
let ttgDeck=loadTtgDraft(),ttgSaved=readTtgSaved(safeRead(TTG_SAVED_KEY)),ttgName='天元突破自訂牌組';
function loadTtgDraft(){try{return normalizeTtgCounts(safeRead(TTG_DRAFT_KEY));}catch{return emptyTtgDeck();}}
function persistTtg(){save(TTG_DRAFT_KEY,ttgDeck);}
const soloById=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
function soloNormalize(raw){return normalizeSoloDeck(raw);}
let soloDeck;try{soloDeck=soloNormalize(safeRead(SOLO_DRAFT_KEY));}catch{soloDeck=soloNormalize({});}
let soloSaved=[];try{soloSaved=(safeRead(SOLO_SAVED_KEY)||[]).filter(x=>x&&typeof x.name==='string'&&x.counts).map(x=>({...x,counts:soloNormalize(x.counts)}));}catch{soloSaved=[];}
let soloName='我獨自升級自訂牌組';
let soloGame=null;try{const value=safeRead(SOLO_GAME_KEY);if(value?.title==='solo-leveling'&&assertSoloTrainingMatch(value))soloGame=value;}catch{soloGame=null;}
function persistSolo(){save(SOLO_DRAFT_KEY,soloDeck);}
const deckMeta=safeRead(DECK_META_KEY)||{};
let deckName=typeof deckMeta.name==='string'?deckMeta.name.slice(0,40):(PRESETS.find(p=>sameCounts(p.counts,deck))?.name||'自訂 BLEACH 牌組');
let selectedDeckId=savedDecks.some(d=>d.id===deckMeta.savedId)?deckMeta.savedId:null;
const ui={soloSelected:null,title:'bleach',view:'lobby',mode:'solo',first:'0',preset:[0,1].includes(deckMeta.preset)?deckMeta.preset:0,opponentSource:'preset:1',filter:'all',search:'',selected:null,line:'energy',deployment:'normal',sideTab:'card',raidFlow:null,modal:null,choiceIds:[],handoff:false,lastController:null};
if(deckMeta.opponentSource==='current'||/^preset:[01]$/.test(deckMeta.opponentSource||'')||savedDecks.some(d=>'saved:'+d.id===deckMeta.opponentSource))ui.opponentSource=deckMeta.opponentSource;
let botTimer=null,toastTimer=null;
function safeRead(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}}
function loadDeck(){const d=safeRead(DECK_KEY);if(d){try{return normalizeCounts(d);}catch{}}return structuredClone(PRESETS[0].counts);}
function loadGame(){const s=safeRead(GAME_KEY);if(s?.version===1){try{assertState(s);return s;}catch{}}return null;}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
function total(){return Object.values(deck).reduce((n,x)=>n+x,0);}
function persistDraft(){save(DECK_KEY,deck);save(DECK_META_KEY,{name:deckName,savedId:selectedDeckId,preset:ui.preset,opponentSource:ui.opponentSource});}
function resolveDeckSource(source){
 if(source==='current')return {name:deckName||'未命名牌組',counts:deck};
 if(/^preset:[01]$/.test(source))return PRESETS[Number(source.slice(-1))];
 const found=savedDecks.find(d=>'saved:'+d.id===source);if(found)return found;
 throw new Error('找不到這副牌組，請重新選擇。');
}
function deckOptions(selected='current'){
 return `<option value="current" ${selected==='current'?'selected':''}>編輯中 · ${esc(deckName||'未命名牌組')}</option><optgroup label="預設牌組">${PRESETS.map((d,i)=>`<option value="preset:${i}" ${selected==='preset:'+i?'selected':''}>${d.name}</option>`).join('')}</optgroup>${savedDecks.length?`<optgroup label="已儲存牌組">${savedDecks.map(d=>`<option value="saved:${esc(d.id)}" ${selected==='saved:'+d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</optgroup>`:''}`;
}
function loadDeckSource(source){
 if(source==='current')return;
 const chosen=resolveDeckSource(source);deck=structuredClone(chosen.counts);deckName=chosen.name;selectedDeckId=source.startsWith('saved:')?source.slice(6):null;
 if(source.startsWith('preset:'))ui.preset=Number(source.slice(-1));
 persistDraft();render();toast('已載入 '+deckName+'。');
}
function saveCurrentDeck(copy=false){
 const errors=validateDeck(deck);if(errors.length)throw new Error(errors[0]);
 const name=deckName.trim();if(!name)throw new Error('請先替牌組取個名字。');
 const id=!copy&&selectedDeckId?selectedDeckId:(globalThis.crypto?.randomUUID?.()||'deck-'+Date.now()+'-'+Math.random().toString(36).slice(2));
 const entry={id,name,counts:structuredClone(deck),updatedAt:new Date().toISOString()};
 const next=savedDecks.some(d=>d.id===id)?savedDecks.map(d=>d.id===id?entry:d):[...savedDecks,entry];
 if(!save(SAVED_DECKS_KEY,next))throw new Error('無法儲存牌組，請確認此瀏覽器允許保存網站資料。');
 savedDecks=next;selectedDeckId=id;deckName=name;persistDraft();render();toast(copy?'已另存一副新牌組。':'已儲存 '+name+'。');
}
function handStyle(count){return `--hand-wide:${Math.max(1,Math.min(count,10))};--hand-medium:${Math.max(1,Math.min(count,8))};--hand-small:${Math.max(1,Math.min(count,7))};--hand-narrow:${Math.max(1,Math.min(count,5))}`;}
function gameActor(){return game?controller(game):0;}
function botTurn(){return game?.mode==='solo'&&gameActor()===1&&game.status!=='finished';}
function humanTurn(){return !botTurn()&&!ui.handoff;}
function chooseView(view){ui.view=view;ui.modal=null;ui.selected=null;ui.raidFlow=null;if(view==='arena'&&game?.mode==='hotseat'){ui.handoff=true;ui.lastController=gameActor();}render();window.scrollTo({top:0,behavior:'instant'});}
function startGame(){
 const errors=validateDeck(deck);if(errors.length){toast(errors[0]);chooseView('builder');return;}
 const first=ui.first==='random'?Math.floor(Math.random()*2):Number(ui.first);
 try{const opponent=resolveDeckSource(ui.opponentSource);game=newGame({decks:[deck,opponent.counts],mode:ui.mode,first,names:ui.mode==='solo'?['你','練習對手']:['玩家一','玩家二']});game.deckNames=[deckName,opponent.name];}catch(e){toast(e.message);return;}
 ui.view='arena';ui.selected=null;ui.raidFlow=null;ui.modal=null;ui.choiceIds=[];ui.handoff=game.mode==='hotseat';ui.lastController=controller(game);save(GAME_KEY,game);render();window.scrollTo({top:0,behavior:'instant'});
}
function act(a){
 try{const before=controller(game);game=dispatch(game,a);assertState(game);save(GAME_KEY,game);ui.choiceIds=[];ui.selected=null;ui.modal=null;
  if(game.mode==='hotseat'&&game.status!=='finished'&&controller(game)!==before)ui.handoff=true;
  ui.lastController=controller(game);render();
 }catch(e){toast(e.message);}
}
function filteredCards(){const q=ui.search.toLowerCase();return CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.set||ui.set==='all'||c.sets.includes(ui.set))&&(!ui.color||ui.color==='all'||c.color===ui.color)&&(!ui.support||ui.support==='all'||c.auto===(ui.support==='auto'))&&[c.name,c.nameJa,c.number,c.identity,c.tag,c.effect,...c.aliases].some(s=>s?.toLowerCase().includes(q)));}
function catalogVariant(c){return c.variants?.find(v=>v.set===ui.set)||c;}
function supportNote(counts){const pending=pendingCards(counts);return pending.length?`<div class="supportNote"><b>${pending.length} 種卡片待補自動判定</b><span>可編輯、儲存與匯出；開局需使用已完成判定的卡片。</span><details><summary>查看卡片</summary>${pending.map(c=>`${esc(c.name)} · ${c.identity}`).join('<br>')}</details></div>`:'<p class="note">✓ 此牌組的卡片皆可自動結算。</p>';}
function footer(){return `<footer class="footer"><span>UNION ARENA · BLEACH 千年血戰篇</span><span>非官方練習模擬器 · 第一～三彈／卡冊／書卡／高級預組</span></footer>`;}
function render(){
 clearTimeout(botTimer);
 const modalScroll=$('.modal')?.scrollTop||0;
 ui.contentsOpen=$('.deckContents')?.open??ui.contentsOpen??false;
 const active=['arena','soloArena'].includes(ui.view)?'lobby':ui.view;
 $('#app').innerHTML=`<div class="shell${ui.view==='arena'?' shell-match':''}"><aside class="rail"><button class="brand" data-view="lobby" aria-label="返回對戰大廳"><img src="assets/mark.svg" alt=""><span><b>BLEACH ARENA</b><small>UNION ARENA SIMULATOR</small></span></button><nav class="nav" aria-label="主要導覽">${[['lobby','home','對戰大廳'],['builder','cards','牌組構築'],['library','book','卡片圖鑑'],['rules','shield','操作說明']].map(([v,i,n])=>`<button data-view="${v}" class="${active===v?'active':''}" ${active===v?'aria-current="page"':''}>${icon(i)}<span>${n}</span></button>`).join('')}</nav></aside><main class="main"><header class="topbar"><div class="breadcrumb">UNION ARENA <span> / </span> <b>${{lobby:'對戰大廳',builder:'牌組構築',library:'卡片圖鑑',rules:'操作說明',arena:'對戰練習',soloArena:'我獨自升級・試玩'}[ui.view]}</b></div><div class="topStatus"><span><i class="statusDot"></i>規則自動結算</span><span class="pill">BLEACH · 日本／亞洲版</span></div></header>${ui.view==='lobby'?lobby():ui.view==='builder'||ui.view==='library'?library():ui.view==='rules'?rules():ui.view==='soloArena'?soloArena():arena()}${footer()}</main></div>${modalContent()}`;
 bind();
 if($('.modal'))$('.modal').scrollTop=modalScroll;
 const shell=$('.shell');if(shell)shell.inert=!!$('.modalBackdrop');
 if(ui.view==='arena'&&botTurn()&&!ui.handoff&&!ui.modal){botTimer=setTimeout(()=>{const a=botAction(game);if(a)act(a);},game.pending?850:550);}
 if(ui.view==='soloArena'&&soloGame?.status==='playing'&&(soloGame.pending?.p??soloGame.active)===1){botTimer=setTimeout(()=>soloAct(soloTrainingBotAction(soloGame)),350);}
}
function lobby(){
 const currentPreset=PRESETS[ui.preset];const custom=!sameCounts(deck,currentPreset.counts);
 return `<section class="lobbyIntro"><h1>BLEACH <span>ARENA</span></h1><p>構築牌組，開始你的 UNION ARENA 對局。</p><p class="introMeta">第一～三彈／卡冊／書卡／高級預組 · ${CARDS.length} 種卡片</p>${game&&game.status!=='finished'?'<button class="btn resumeMatch" data-view="arena">繼續上次對局 →</button>':''}</section><div class="lobbySetup"><div class="sectionTitle"><h2>準備對局</h2><span>50 張牌組 · 7 張起始生命</span></div><div class="lobbyGrid"><section class="panel"><div class="sectionTitle"><h2 style="font-size:14px">對戰模式</h2></div><div class="modeCards">${[['solo','電腦練習','隨時開局，熟悉牌組節奏'],['hotseat','同裝置雙人','輪流操作，切換時隱藏手牌']].map(([v,n,d])=>`<button class="modeCard ${ui.mode===v?'selected':''}" data-mode="${v}" aria-pressed="${ui.mode===v}"><span class="check"></span><b>${n}</b><small>${d}</small></button>`).join('')}</div><label class="setupRow"><span>先後手</span><select id="firstSelect"><option value="0" ${ui.first==='0'?'selected':''}>${ui.mode==='solo'?'你':'玩家一'}先攻</option><option value="1" ${ui.first==='1'?'selected':''}>${ui.mode==='solo'?'練習對手':'玩家二'}先攻</option><option value="random" ${ui.first==='random'?'selected':''}>隨機決定</option></select></label><label class="setupRow"><span>${ui.mode==='solo'?'練習對手牌組':'玩家二牌組'}</span><select id="opponentDeckSelect" aria-label="選擇對手牌組">${deckOptions(ui.opponentSource)}</select></label><button class="btn primary startMatch" data-action="start">${ui.mode==='solo'?'開始練習':'開始雙人對戰'} →</button><p class="note">兩種模式皆自動結算規則。目前提供單機與同裝置對戰。</p></section><section class="panel"><div class="sectionTitle"><h2 style="font-size:14px">使用牌組</h2><button class="subtleButton" data-view="builder">編輯 →</button></div><div class="deckChoice"><img class="deckThumb" src="assets/cards/${ui.preset===0?'104':'105'}.png" alt="${ui.preset===0?'黑崎一護':'阿散井戀次'}"><div><b>${esc(deckName||'未命名牌組')}</b><p>${custom?'使用你在牌組構築頁設定的卡片。':currentPreset.description}</p><select id="playerDeckSelect" aria-label="選擇你的牌組">${deckOptions()}</select></div></div><div class="deckStats"><div><b>${total()}</b><span>牌組張數</span></div><div><b>${Object.values(deck).filter(Boolean).length}</b><span>使用卡種</span></div><div><b>7</b><span>起始生命</span></div></div>${supportNote(deck)}<p class="note">可選預設或已儲存的牌組。你的編輯草稿會保存在此瀏覽器。</p></section></div></div>`;
}
function library(){
 if(ui.title==='gurren-lagann')return ttgLibrary();
 if(ui.title==='solo-leveling')return soloLibrary();
 const edit=ui.view==='builder',cards=filteredCards(),errs=validateDeck(deck),n=total(),saved=savedDecks.find(d=>d.id===selectedDeckId),dirty=!saved||!sameCounts(saved.counts,deck)||saved.name!==deckName.trim();
 return `<div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div><header class="pageHeading"><div><h1>${edit?'編輯牌組':'BLEACH 卡片圖鑑'}</h1><p>第一～三彈／卡冊／書卡／高級預組 · ${CARDS.length} 種卡片 · 點擊查看效果</p></div>${edit?`<button class="btn primary" data-action="useDeck" ${errs.length?'disabled':''}>使用此牌組 ↗</button>`:'<button class="btn" data-view="builder">前往牌組構築</button>'}</header>${edit?`<div class="deckEditor"><label>牌組名稱<input id="deckName" maxlength="40" value="${esc(deckName)}" placeholder="例如：一護 Raid 練習" aria-label="牌組名稱"></label><label>載入牌組<select id="deckSourceSelect" aria-label="載入牌組">${deckOptions()}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="saveDeck" ${errs.length?'disabled':''}>${saved?'儲存修改':'儲存牌組'}</button><button class="btn" data-action="copySavedDeck" ${errs.length?'disabled':''}>另存新牌組</button><button class="btn outline" data-action="newDeck">新建空白牌組</button></div><span class="deckSaveStatus">${dirty?'編輯中的草稿':'✓ 已儲存'} · 已儲存 ${savedDecks.length} 副</span></div>`:''}<div class="toolbar"><input id="search" type="search" placeholder="搜尋角色、卡號或效果標籤…" value="${esc(ui.search)}" aria-label="搜尋卡片"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}" aria-pressed="${ui.filter===v}">${n}</button>`).join('')}</div></div><div class="poolFilters"><label>彈數／來源<select id="setFilter"><option value="all">全部卡池</option>${SETS.map(x=>`<option value="${x.id}" ${ui.set===x.id?'selected':''}>${x.name} · ${CARDS.filter(c=>c.sets.includes(x.id)).length} 種</option>`).join('')}</select></label><label>顏色<select id="colorFilter"><option value="all">全部顏色</option>${Object.entries(COLOR_NAMES).filter(([id])=>CARDS.some(c=>c.color===id)).map(([id,name])=>`<option value="${id}" ${ui.color===id?'selected':''}>${name}</option>`).join('')}</select></label><label>自動判定<select id="supportFilter"><option value="all">全部卡片</option><option value="auto" ${ui.support==='auto'?'selected':''}>可自動結算</option><option value="pending" ${ui.support==='pending'?'selected':''}>待補判定</option></select></label><span>顯示 ${cards.length} / ${CARDS.length} 種</span></div><div class="${edit?'libraryLayout':''}"><div class="cardGrid">${cards.length?cards.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="查看${c.name} ${c.id}"><img src="${catalogVariant(c).onlineImage||catalogVariant(c).image}" onerror="this.onerror=null;this.src='${catalogVariant(c).image}'" alt="${c.name} ${catalogVariant(c).number}" loading="lazy"></button><div class="catalogInfo"><strong>${c.name}</strong><div class="sub">${TYPE_NAMES[c.type]} · ${c.identity}<br><span class="colorLabel ${c.color}">${COLOR_NAMES[c.color]}</span> · ${c.rarity||'—'} · ${c.tag}</div><span class="autoStatus ${c.auto?'ready':'pending'}">${c.auto?'可自動結算':'待補自動判定'}</span><div class="catalogMeta"><span class="e colorLabel ${c.color}">◆ ${c.energy} 能源</span><span>${c.bp?`${c.bp} BP`:`${c.ap} AP`}</span></div>${edit?`<p class="catalogEffect">${esc(c.effect)}</p><div class="countPicker"><button data-count="${c.id}" data-delta="-1" ${!deck[c.id]?'disabled':''} aria-label="移除一張${c.name} ${c.id}">−</button><b>${deck[c.id]||0}</b><button data-count="${c.id}" data-delta="1" ${(deck[c.id]||0)>=4?'disabled':''} aria-label="增加一張${c.name} ${c.id}">+</button></div>`:`<button class="subtleButton" data-inspect="${c.id}">${c.trigger?TRIGGER_NAMES[c.trigger]+' Trigger':'查看卡片效果'} →</button>`}</div></article>`).join(''):'<p class="emptyResult">沒有符合條件的卡片。</p>'}</div>${edit?`<aside class="panel deckSummary"><h3>牌組概覽 <span class="pill" style="float:right">${deckColors(deck).map(x=>COLOR_NAMES[x]).join('／')||'未選顏色'}</span></h3><div><div class="deckTotal">${n} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(n/50*100,100)}%"></i></div></div><div class="curve" aria-label="能源曲線">${Array.from({length:6},(_,e)=>{const qty=CARDS.filter(c=>c.energy===e).reduce((a,c)=>a+(deck[c.id]||0),0);return `<div><span>${qty}</span><i style="height:${Math.max(qty*2,2)}px"></i>${e}</div>`;}).join('')}</div><div class="validation ${errs.length?'invalid':'valid'}">${errs.length?errs.map(esc).join('<br>'):'✓ 牌組張數合法，可以儲存。'}</div>${supportNote(deck)}<div class="summaryList">${Object.entries(TYPE_NAMES).map(([t,name])=>`<div><span>${name}</span><b>${CARDS.filter(c=>c.type===t).reduce((a,c)=>a+(deck[c.id]||0),0)}</b></div>`).join('')}</div><details class="deckContents" ${ui.contentsOpen?'open':''}><summary>牌組內容 · ${Object.values(deck).filter(Boolean).length} 種</summary><div>${CARDS.filter(c=>deck[c.id]).map(c=>`<div class="deckContentRow"><button class="deckContentCard" data-inspect="${c.id}"><img src="${c.onlineImage||c.image}" onerror="this.onerror=null;this.src='${c.image}'" alt="${c.name}"><span>${c.name}<small>${c.id} · ◆ ${c.energy}</small></span></button><b>×${deck[c.id]}</b><button class="btn small" data-count="${c.id}" data-delta="-1" aria-label="移除一張${c.name} ${c.id}">−</button></div>`).join('')||'<p class="note">尚未加入卡片。</p>'}</div></details><div><button class="btn" data-action="deckCode">匯入／複製牌組</button><button class="btn outline" data-action="resetDeck">還原預設牌組</button></div><p class="note">同卡號最多 4 張；牌組必須正好 50 張。草稿會自動保存；按「儲存牌組」可保留多副構築。已儲存牌組留在此瀏覽器，可複製清單備份。第一～三彈、卡冊、書卡與高級預組可構築。同 BLC 卡號的再錄與異圖合計最多 4 張。</p></aside>`:''}</div>`;
}
function rules(){return `<header class="pageHeading"><h1>你的第一場 BLEACH 對局</h1><p>你做選擇，模擬器處理規則與結算。</p></header><div class="rulesGrid"><section class="panel"><h3>回合流程</h3>${[['01','開始','自動抽牌與恢復 AP。可花 1 AP 額外抽 1 張，至多一次。'],['02','移動','點選能源線角色，再選前線位置；具有 Step 的前線角色也可移回能源線。移動不花 AP。'],['03','主要','使用手牌或角色能力。先檢查能源與 AP，再處理效果。'],['04','攻擊','以 ACTIVE 前線角色攻擊。進入此階段後不能返回主要階段。'],['05','結束','己方角色與場域轉為 ACTIVE，回合效果到期。']].map(([i,n,d])=>`<div class="rulesStep"><b>${i}</b><span><strong>${n}</strong><br>${d}</span></div>`).join('')}</section><section class="panel"><h3>幾個重要的選擇</h3><ul><li>普通角色與場域以 REST 狀態登場。能源線上的 REST 卡片仍會產生能源。</li><li>Raid 一護需足夠能源與非 Raid 的同名基底；Raid 後會轉為 ACTIVE，可移至前線。</li><li>攻擊 BP 不小於阻擋 BP 時，只有阻擋者退場；較小時雙方都留在場上。</li><li>生命卡翻開後，可以選擇發動或放棄 Trigger。生命歸零時會等效果結算完才判定勝負。</li><li>滿線放置或移動會將換下的頂卡除外；這與一般退場不同。</li></ul></section><section class="panel"><h3>開局與 AP</h3><p>起手 7 張，可完整重抽一次。雙方確認後放置 7 張生命。</p><div class="summaryList"><div><span>先攻第 1／2／3+ 回合</span><b>1 ／ 2 ／ 3 AP</b></div><div><span>後攻第 1／2／3+ 回合</span><b>2 ／ 2 ／ 3 AP</b></div></div><p class="note">先攻自己的首回合不進行通常抽牌，但可額外抽牌。雙方自己的首回合不攻擊。開始階段會將己方卡片轉為 ACTIVE。</p></section><section class="panel"><h3>目前支援範圍</h3><p>卡池收錄第一彈 UA08BT、第二彈 EX07BT、第三彈 EX15BT、UA04NC 卡冊、書卡與原 UA08ST。所有卡片可構築及儲存；自動對戰目前支援 ${CARDS.filter(c=>c.auto).length} 種卡片。圖鑑與構築頁會標記「可自動結算」或「待補自動判定」。</p><p class="note">提供電腦練習與同裝置雙人；尚未支援跨裝置連線與排名。電腦對手使用固定戰術，適合熟悉操作與牌組。</p></section><section class="panel full"><h3>核對官方資料</h3><p>介面提供自寫的繁體中文效果說明；卡片原文與規則以官方日文／亞洲版為準。</p><div class="toolbar" style="margin:14px 0 0"><a class="btn small" href="https://www.unionarena-tcg.com/jp/rules/" target="_blank" rel="noopener">官方規則 ↗</a><a class="btn small" href="https://www.unionarena-tcg.com/jp/cardlist/?search=true&series=570008" target="_blank" rel="noopener">UA08ST 卡片列表 ↗</a><a class="btn small" href="https://www.unionarena-tcg.com/jp/faq/list.php?series=UA08ST" target="_blank" rel="noopener">卡片 Q＆A ↗</a></div></section></div>`;}

function selectedCard(){
 if(!game||!ui.selected)return null;
 const f=locate(game,ui.selected.uid);return f?.card??game.players[ui.selected.p].hand.find(c=>c.uid===ui.selected.uid);
}
function raidActions(){if(!game||!ui.raidFlow)return [];return legalActions(game).filter(a=>a.type==='raid'&&a.uid===ui.raidFlow.uid);}
function raidTargets(){return [...new Set(raidActions().map(a=>a.target))];}
function beginRaid(){const actions=legalActions(game).filter(a=>a.type==='raid'&&a.uid===ui.selected?.uid);if(!actions.length)return;ui.raidFlow={uid:ui.selected.uid,step:'base',target:null,action:null};ui.deployment='raid';ui.modal=null;render();}
function cancelRaid(){ui.raidFlow=null;ui.deployment='normal';ui.modal=null;render();}
function destination(p,line,slot){
 if(!game||!ui.selected||!humanTurn()||game.pending)return null;
 const acts=legalActions(game);
 if(p!==game.active)return null;
 if(ui.raidFlow){const flow=ui.raidFlow;if(flow.step==='base'){const c=game.players[p][line][slot];return c&&raidTargets().includes(c.uid)?{type:'raidBase',target:c.uid}:null;}if(flow.step==='position')return raidActions().find(a=>a.target===flow.target&&a.line===line&&a.slot===slot)||null;return null;}
 if(ui.selected.source==='hand'&&line===ui.line){
  if(ui.deployment==='raid'){
   const raids=acts.filter(a=>a.type==='raid'&&a.uid===ui.selected.uid&&a.line===line&&a.slot===slot);
   if(raids.length===1)return raids[0];
   if(raids.length>1)return {type:'chooseRaid',actions:raids};
   return null;
  }
  return acts.find(a=>a.type==='play'&&a.uid===ui.selected.uid&&a.line===line&&a.slot===slot);
 }
 if(ui.selected.source==='field'&&game.phase==='move')return acts.find(a=>a.type===(line==='front'?'move':'step')&&a.uid===ui.selected.uid&&a.slot===slot);
 return null;
}
function resources(p){const pl=game.players[p];return `<div class="playerResources"><span class="energyCount">${Object.entries(COLOR_NAMES).filter(([color])=>energy(game,p,color)>0).map(([color,name])=>`<span class="energyColor ${color}" title="${name}">◆ ${energy(game,p,color)}</span>`).join(' ')||'◆ 0'}</span><div class="apDots" aria-label="${pl.ap} / ${pl.maxAp} AP">${Array.from({length:3},(_,i)=>`<i class="${i<pl.ap?'available':i>=pl.maxAp?'locked':''}"></i>`).join('')}<span>AP</span></div></div>`;}
function life(p){const pl=game.players[p];return `<div class="lifeRow" aria-label="${pl.life.length} 張生命"><span class="lifeText">LIFE <b>${pl.life.length}</b></span>${pl.life.map(()=>'<span class="lifeCard" aria-hidden="true">✦</span>').join('')}</div>`;}
function slot(p,line,i){
 const c=game.players[p][line][i],d=c?cardOf(c):null,place=destination(p,line,i);
 const placement=place?(place.type==='raidBase'?'底板':place.type==='raid'||place.type==='chooseRaid'?'突襲':place.type==='move'||place.type==='step'?'移動':'放置'):'';
 return `<button class="slot ${c?'occupied':''} ${c&&!c.ready?'rested':''} ${ui.selected?.uid===c?.uid&&c?'selected':''} ${place?'destination':''} ${ui.raidFlow?.target===c?.uid?'raid-base-selected':''} ${ui.raidFlow?.action?.line===line&&ui.raidFlow?.action?.slot===i&&p===game.active?'raid-position-selected':''}" data-slot="${p}|${line}|${i}" data-placement="${placement}" aria-label="${game.players[p].name}的${line==='front'?'前線':'能源線'} ${i+1}${c?`：${d.name}，${c.ready?'激活':'休息'}，${bp(game,c)} BP`: '，空位'}${place?'，可'+placement:''}">${c?`<span class="slotFace"><img class="art" src="${d.onlineImage||d.image}" onerror="this.onerror=null;this.src='${d.image}'" alt="${d.name}">${c.stack.length?`<span class="slotStack">RAID ${c.stack.length}</span>`:''}<span class="slotName">${d.name}</span><span class="slotBp"><b>${d.bp?bp(game,c):'FIELD'}</b>${c.impactTurn===game.turn?'<span class="slotImpact">IMPACT</span>':''}</span></span>`:`<span class="slotIndex">0${i+1}</span>`}</button>`;
}
function lineRow(p,line){const pl=game.players[p];return `<div class="lineGroup"><span class="lineLabel ${line}">${line==='front'?'前線<br>FRONT':'能源<br>ENERGY'}</span><div class="slots">${Array.from({length:4},(_,i)=>slot(p,line,i)).join('')}</div><div class="piles">${line==='front'?`<div class="pile" aria-label="牌堆 ${pl.deck.length} 張">DECK<b>${pl.deck.length}</b></div><div class="pile" aria-label="手牌 ${pl.hand.length} 張">HAND<b>${pl.hand.length}</b></div>`:`<button class="pile button" data-pile="${p}|outside">場外<b>${pl.outside.length}</b></button><button class="pile button" data-pile="${p}|removed">除外<b>${pl.removed.length}</b></button>`}</div></div>`;}
function playerArea(p,opponent){const pl=game.players[p];return `<section class="playerArea ${opponent?'opponent':''}" aria-label="${pl.name}的場地"><header class="playerInfo"><div class="playerName"><span class="avatar ${opponent?'opponent':''}">${p===0?'Ⅰ':'Ⅱ'}</span><div><b>${pl.name}</b>${game.active===p?'<small>目前回合</small>':'<small>等待回合</small>'}</div></div>${resources(p)}</header>${opponent?life(p)+lineRow(p,'energy')+lineRow(p,'front'):lineRow(p,'front')+lineRow(p,'energy')+life(p)}</section>`;}
function handCard(c,{selected=false,inspect=false,playable=false}={}){const d=cardOf(c);return `<button class="handCard ${selected?'selected':''} ${playable?'playable':'unplayable'}" ${inspect?`data-inspect="${d.id}"`:`data-hand="${c.uid}"`} aria-label="${d.name}，${d.energy} 能源，${d.ap} AP${playable?'，可使用':''}"><img src="${d.onlineImage||d.image}" onerror="this.onerror=null;this.src='${d.image}'" alt="${d.name}"><span class="handCost">◆ ${d.energy}</span><span class="handName">${d.name}</span></button>`;}
function selectionBar(){
 const c=selectedCard();if(!c)return '';
 const d=cardOf(c),acts=legalActions(game).filter(a=>a.uid===c.uid),playable=humanTurn()&&!game.pending;
 const normal=acts.filter(a=>a.type==='play'),raids=acts.filter(a=>a.type==='raid');
 return `<div class="selectionBar"><b>${d.name} <span class="textMuted">· ${d.id}</span></b>${(normal.some(a=>a.line==='energy')||acts.some(a=>a.type==='step'))?`<button class="btn ${ui.line==='energy'?'primary':''}" data-line="energy" ${!playable?'disabled':''}>能源線</button>`:''}${(normal.some(a=>a.line==='front')||acts.some(a=>a.type==='move'))?`<button class="btn ${ui.line==='front'?'primary':''}" data-line="front" ${!playable?'disabled':''}>前線</button>`:''}${normal.some(a=>!a.line)?`<button class="btn primary" data-do="${esc(JSON.stringify(normal.find(a=>!a.line)))}" ${!playable?'disabled':''}>使用事件</button>`:''}${ui.selected.source==='hand'&&d.raid?`<button class="btn ${ui.deployment==='normal'?'primary':''}" data-action="normalDeployment" ${!playable?'disabled':''}>普通登場</button>`:''}${raids.length?`<button class="btn ${ui.raidFlow?'primary':''}" data-action="raid" ${!playable?'disabled':''}>${ui.raidFlow?'重新選擇底板':'突襲 ↗'}</button>`:''}${acts.filter(a=>a.type==='ability').map((a,i)=>`<button class="btn primary" data-do="${esc(JSON.stringify(a))}" ${!playable?'disabled':''}>發動能力${acts.filter(a=>a.type==='ability').length>1?' '+(i+1):''}</button>`).join('')}${acts.some(a=>a.type==='handAbility')?`<button class="btn primary" data-do="${esc(JSON.stringify(acts.find(a=>a.type==='handAbility')))}" ${!playable?'disabled':''}>手牌能力：除外區支付並登場</button>`:''}${acts.some(a=>a.type==='attack')?`<button class="btn primary" data-do="${esc(JSON.stringify(acts.find(a=>a.type==='attack')))}" ${!playable?'disabled':''}>宣告攻擊</button>`:''}${acts.filter(a=>a.type==='snipe').map(a=>`<button class="btn outline" data-do="${esc(JSON.stringify(a))}" ${!playable?'disabled':''}>狙擊：${esc(cardOf(locate(game,a.target).card).name)}</button>`).join('')}${ui.selected.source==='field'&&ui.selected.p===gameActor()&&humanTurn()&&c.under?.length?`<button class="btn outline" data-action="showUnder">查看下方裏向卡（${c.under.length}）</button>`:''}<button class="btn" data-inspect="${d.id}">卡片詳情</button><p class="selectionEffect"><span>效果</span>${esc(d.effect)}</p>${raids.length?`<p class="selectionHint">${ui.raidFlow?'突襲操作中：先選底板，再選合法登場位置，確認後才會支付 AP 並結算。':'普通登場會以 REST 狀態登場；突襲請按「突襲」。'}</p>`:''}${ui.selected.source==='hand'&&!acts.length?'<p class="selectionHint">目前階段、能源、AP 或事件目標尚不符合出牌條件。</p>':''}</div>`;
}
function raidFlowPanel(){const f=ui.raidFlow;if(!f||!game)return '';const options=raidActions();if(!options.length)return `<div class="raidFlowPanel"><p>目前不符合突襲條件。</p><button class="btn" data-action="cancelRaid">取消突襲</button></div>`;const selected=game.players[game.active].hand.find(c=>c.uid===f.uid);if(!selected)return '';const d=cardOf(selected),base=f.target?locate(game,f.target):null,action=f.action;return `<div class="raidFlowPanel" aria-live="polite"><b>突襲流程 · ${f.step==='base'?'1 / 3 選擇底板':f.step==='position'?'2 / 3 選擇位置':'3 / 3 確認突襲'}</b><p>${esc(d.name)} ${esc(d.identity)} · 能源 ${d.energy} · AP ${d.ap}${base?` · 底板 ${esc(cardOf(base.card).name)}（${base.line==='front'?'前線':'能源線'} ${base.slot+1}）`:''}</p><p>${f.step==='base'?'請點選高亮的合法突襲底板。':f.step==='position'?'請點選高亮的合法登場位置；不能任意移動到其他位置。':`將疊放至 ${action.line==='front'?'前線':'能源線'} ${action.slot+1}，確認後才扣除 AP 並結算登場效果。`}</p><div class="raidFlowActions">${f.step!=='base'?`<button class="btn" data-action="raidBack">返回上一步</button>`:''}${f.step!=='base'?`<button class="btn outline" data-action="raidRestart">重新選擇</button>`:''}<button class="btn" data-action="cancelRaid">取消</button>${f.step==='confirm'?`<button class="btn primary" data-action="raidConfirm">確認突襲</button>`:''}</div></div>`;}
function phaseMessage(){return {start:'通常抽牌已完成。可花 1 AP 額外抽牌一次。',move:'選擇能源線角色，再點選前線位置移動。',main:'選手牌後，點亮起的位置出牌；也可發動場上能力。',attack:game.players[game.active].turnCount===1?'自己的首回合無法攻擊，可以結束回合。':'選擇 ACTIVE 前線角色宣告攻擊。'}[game.phase]||'';}
function arena(){
 if(!game)return `<section class="panel emptyResult">還沒有對局。<br><button class="btn primary" style="margin-top:15px" data-action="start">開始練習</button></section>`;
 const p=game.mode==='solo'?0:gameActor(),opp=1-p,pl=game.players[p],legal=legalActions(game),done=game.status==='finished';
 const nextLabel={start:'進入移動階段',move:'進入主要階段',main:'進入攻擊階段',attack:'結束回合'}[game.phase];
 return `<header class="matchHeader"><h1>BLEACH <span class="textMuted" style="font-size:11px;font-weight:400">/ ${game.mode==='solo'?'電腦練習':'同裝置雙人'}</span></h1><div class="matchControls"><button class="btn small" data-action="hint" ${!humanTurn()||done?'disabled':''}>練習提示</button><button class="btn small" data-action="showLog">對局紀錄</button><button class="btn small danger" data-action="newMatch">新對局</button></div></header><div class="matchLayout"><div class="arena">${done?`<div class="resultBanner"><span class="eyebrow">MATCH COMPLETE</span><h2>${game.mode==='solo'?(game.winner===0?'你獲勝了！':'練習對手獲勝'):`${game.players[game.winner].name}獲勝`}</h2><p>對局已完成，共 ${game.turn} 個回合。可以查看紀錄，或再練習一場。</p><button class="btn primary" data-action="start">再來一局 ↗</button><button class="btn" data-action="showLog">查看對局紀錄</button></div>`:''}${game.status==='mulligan'?`<div class="mulliganHeader"><h2>${botTurn()?'練習對手正在確認起手':'確認你的起手'}</h2><p>先保留這 7 張，或完整重抽一次。生命卡會在双方確認後放置。</p></div><div class="mulliganHand" style="${handStyle(pl.hand.length)}">${!botTurn()&&!ui.handoff?pl.hand.map(c=>handCard(c,{inspect:true,playable:true})).join(''):'<div class="hiddenHand">正在準備起手…</div>'}</div><div class="phaseAction"><p>${pl.redrawn?'已使用本局的重抽機會。':'原手牌先擱旁，抽新 7 張後再混回牌堆。'}</p><div style="display:flex;gap:8px"><button class="btn" data-do="${esc(JSON.stringify({type:'redraw'}))}" ${!humanTurn()||pl.redrawn?'disabled':''}>完整重抽</button><button class="btn primary" data-do="${esc(JSON.stringify({type:'keep'}))}" ${!humanTurn()?'disabled':''}>保留起手</button></div></div>`:`<div class="phaseBar" aria-label="回合階段">${['start','move','main','attack','end'].map((phase,i)=>`<span class="${game.phase===phase?'current':''}">${i+1} ${PHASE_NAMES[phase].replace('階段','')}</span>`).join('')}</div>${playerArea(opp,true)}<div class="centerLine">${done?'MATCH COMPLETE':`TURN ${game.turn} · ${PHASE_NAMES[game.phase]}`}</div>${playerArea(p,false)}<section class="handArea"><header class="handTitle"><span>${game.mode==='hotseat'?pl.name+'的':'你的'}手牌 · ${pl.hand.length} 張</span>${game.phase==='start'&&!done?`<button class="btn small" data-do="${esc(JSON.stringify({type:'extraDraw'}))}" ${!humanTurn()||!legal.some(a=>a.type==='extraDraw')?'disabled':''}>額外抽牌 · 1 AP</button>`:'<span>REST 仍可產生能源</span>'}</header>${selectionBar()}${raidFlowPanel()}${ui.handoff?'<div class="hiddenHand">手牌已隱藏，請交給下一位玩家。</div>':`<div class="hand" style="${handStyle(pl.hand.length)}">${pl.hand.map(c=>handCard(c,{selected:c.uid===ui.selected?.uid,playable:legal.some(a=>(a.type==='play'||a.type==='raid'||a.type==='handAbility')&&a.uid===c.uid)&&humanTurn()})).join('')}${!pl.hand.length?'<span class="textMuted" style="font-size:11px">目前沒有手牌</span>':''}</div>`}</section>${!done?`<div class="phaseAction"><p class="${botTurn()?'thinking':''}">${botTurn()?'<i class="spinner"></i>對手正在操作…':game.pending?'請完成目前的效果選擇。':phaseMessage()}</p><button class="btn primary" data-do="${esc(JSON.stringify({type:'next'}))}" ${!humanTurn()||game.pending||!legal.some(a=>a.type==='next')?'disabled':''}>${nextLabel||'繼續'} →</button></div>`:''}`} ${ui.handoff&&!done?`<div class="handoff"><div class="handoffInner"><span class="avatar">${gameActor()===0?'Ⅰ':'Ⅱ'}</span><h2>輪到${game.players[gameActor()].name}操作</h2><p>請把裝置交給這位玩家。<br>確認後才會顯示手牌與效果選擇。</p><button class="btn primary" data-action="handoff">我是${game.players[gameActor()].name}，開始操作</button></div></div>`:''}</div></div>`;
}
function logList(){return `<div class="logList">${[...game.log].reverse().map(x=>`<div class="logItem ${x.kind}"><small>${x.turn?'T'+x.turn:'準備'}</small>${esc(x.message)}</div>`).join('')}</div>`;}
function detail(c){const triggerText={draw:'可抽 1 張牌。',get:'可將翻開的卡加入手牌。',active:'可讓一個己方角色 ACTIVE，本回合 BP +3000。',special:'可退場一個敵方前線角色，無 BP 上限。',final:'生命歸零時，可從牌堆頂補 1 張生命。',raid:'可加入手牌，或在滿足能源時免費 Raid。'};return `<img class="detailImage" src="${catalogVariant(c).onlineImage||catalogVariant(c).image}" onerror="this.onerror=null;this.src='${catalogVariant(c).image}'" alt="${c.name}"><h3>${c.name}</h3><div class="detailNum">${catalogVariant(c).number} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]}</div><span class="pill purple">${c.tag}</span><div class="statGrid"><div><span>能源需求</span><b>${c.energy}</b></div><div><span>AP</span><b>${c.ap}</b></div><div><span>BP</span><b>${c.bp||'—'}</b></div></div><div class="detailEffect">${esc(c.effect)}</div><span class="autoStatus ${c.auto?'ready':'pending'}">${c.auto?'可自動結算':'待補自動判定：可加入牌組，尚不能用於自動對戰'}</span>${c.uncertainty?`<p class="note">${esc(c.uncertainty)}</p>`:''}<div class="detailTrigger">${c.trigger?`<b>${TRIGGER_NAMES[c.trigger]} Trigger</b><br>${esc(c.triggerEffect||triggerText[c.trigger])}`:'沒有生命 Trigger'}</div><p class="note"><a href="${catalogVariant(c).source}" target="_blank" rel="noopener">查看官方卡片與裁定 ↗</a></p>`;}
function pendingModal(){
 const q=game.pending;const allowed=q.allowedCounts?q.allowedCounts.includes(ui.choiceIds.length):ui.choiceIds.length>=q.min&&ui.choiceIds.length<=q.max;
 const peek=q.effect?.kind==='peekChoice'&&q.effect.cards?.length===1?game.players[q.effect.rule?.deckOwner==='opponent'?1-q.player:q.player].deck.find(c=>c.uid===q.effect.cards[0]):null;
 const revealed=peek?cardOf(peek):null;
 const peekPreview=revealed?`<div class="peekPreview" aria-label="查看牌庫頂卡片"><img src="${revealed.onlineImage||revealed.image}" onerror="this.onerror=null;this.src='${revealed.image}'" alt="${esc(revealed.name)}卡圖"><div><b>${esc(revealed.name)}</b><small>${esc(revealed.identity)} · ◆ ${revealed.energy} · ${revealed.bp||0} BP</small><p>${esc(revealed.effect)}</p></div></div>`:'';
 return `<div class="modalBackdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="pendingTitle"><span class="eyebrow">${game.players[q.player].name} · EFFECT RESOLUTION</span><h2 id="pendingTitle" style="margin-top:8px">${q.title}</h2><p>${botTurn()?'練習對手正在選擇…':q.max>1?`選擇 ${q.allowedCounts?.includes(0)?'0 或 ':''}${q.max} 張卡片，再確認結算。`:q.min===0?'可選擇一個目標，或不選擇任何目標。':'選擇一個操作，再確認結算。'}</p>${peekPreview}<div class="choiceGrid">${q.choices.map(c=>`<button class="choiceCard ${ui.choiceIds.includes(c.id)?'selected':''}" data-choice="${esc(c.id)}" ${botTurn()?'disabled':''} aria-pressed="${ui.choiceIds.includes(c.id)}">${c.cardId?`<img src="${BY_ID[c.cardId].onlineImage||BY_ID[c.cardId].image}" onerror="this.onerror=null;this.src='${BY_ID[c.cardId].image}'" alt="${BY_ID[c.cardId].name}">`:''}<span>${esc(c.label)}</span>${c.cardId||c.where?`<small>${c.cardId||''}${c.where?' · '+(c.where==='front'?'前線':'能源線'):''}</small>`:''}</button>`).join('')}</div><div class="modalActions"><span>已選 ${ui.choiceIds.length}${q.max>1?' / '+q.max:''}</span>${q.min===0?`<button class="btn" data-action="skipChoice" ${botTurn()?'disabled':''}>${q.max>1?'不除外':'不選擇'}</button>`:''}<button class="btn primary" data-action="confirmChoice" ${!allowed||botTurn()?'disabled':''}>確認結算 →</button></div></section></div>`;
}
function modalContent(){
 if(game?.pending&&ui.view==='arena'&&!ui.handoff&&!ui.modal)return pendingModal();
 const m=ui.modal;if(!m)return '';
 let title='',body='',actions='';
 if(m.type==='inspect'){const c=BY_ID[m.id];title=c.name;body=`<div class="inspectFlex"><img src="${catalogVariant(c).onlineImage||catalogVariant(c).image}" onerror="this.onerror=null;this.src='${catalogVariant(c).image}'" alt="${c.name}"><div>${detail(c).replace(/<img class="detailImage"[^>]+>/,'')}</div></div>`;}
 if(m.type==='raid'){title='選擇 Raid 基底與位置';body=`<p>確認能源需求及突襲基底：只能疊在符合卡名／特徵且不具有 Raid 的角色上。先轉為 ACTIVE、選擇位置，再結算登場效果；底卡效果不繼承。</p><div class="choiceGrid">${m.actions.map((a,i)=>{const l=locate(game,a.target),occupied=game.players[game.active][a.line][a.slot];return `<button class="choiceCard" data-raid-action="${i}"><img src="${cardOf(l.card).onlineImage||cardOf(l.card).image}" onerror="this.onerror=null;this.src='${cardOf(l.card).image}'" alt="${cardOf(l.card).name}"><span>${cardOf(l.card).name} ${cardOf(l.card).id}<br>→ ${a.line==='front'?'前線':'能源線'} ${a.slot+1}</span>${occupied&&occupied.uid!==a.target?`<small>換下${cardOf(occupied).name}</small>`:''}</button>`;}).join('')}</div>`;}
 if(m.type==='under'){
  const l=game?locate(game,m.uid):null;
  if(!humanTurn()||ui.view!=='arena'||!l||l.p!==m.p||m.p!==gameActor()||!l.card.under?.length)return '';
  title='查看己方角色下方的裏向卡';
  body=`<p class="note">僅目前操作此角色的玩家可以查看；對手不可查看。</p><div class="publicCards">${l.card.under.map(c=>`<div class="underCard"><img src="${cardOf(c).onlineImage||cardOf(c).image}" onerror="this.onerror=null;this.src='${cardOf(c).image}'" alt="${esc(cardOf(c).name)}"><span>${esc(cardOf(c).name)} · ${esc(c.cardId)}</span></div>`).join('')}</div>`;
 }
 if(m.type==='pile'){const pl=game.players[m.p],cards=pl[m.pile];title=`${pl.name}的${m.pile==='outside'?'場外':'除外'}區 · ${cards.length} 張`;body=cards.length?`<div class="publicCards">${cards.map(c=>`<button data-inspect="${c.cardId}"><img src="${cardOf(c).onlineImage||cardOf(c).image}" onerror="this.onerror=null;this.src='${cardOf(c).image}'" alt="${cardOf(c).name}">${cardOf(c).name}<br>${c.cardId}</button>`).join('')}</div>`:'<p>這個區域目前沒有卡片。</p>';}
 if(m.type==='log'){title='對局紀錄';body=logList();}
 if(m.type==='deckCode'){title='匯入／複製牌組';body=`<p>每行使用「張數 卡號」，例如 <code>4 UA08ST/BLC-1-104</code>。也接受 BLC 完整卡號或 JSON；原 UA08ST 牌組的三位卡號仍可匯入。匯入清單須正好 50 張，且每卡最多 4 張。</p><textarea class="deckCode" id="deckCode" aria-label="牌組代碼">${esc(formatDeck(deck,deckName))}</textarea>`;actions='<button class="btn" data-action="copyDeck">複製清單</button><button class="btn primary" data-action="importDeck">匯入牌組</button>'; }
 if(m.type==='newMatch'){title='開始新的對局';body='<p>目前的對局會被新對局取代。使用現在的牌組與先後手設定。</p>';actions='<button class="btn" data-action="closeModal">保留目前對局</button><button class="btn primary" data-action="start">開始新對局</button>';}
 return `<div class="modalBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modalHead"><h2 id="modalTitle">${title}</h2><button class="closeButton" data-action="closeModal" aria-label="關閉視窗">×</button></div>${body}${actions?`<div class="modalActions">${actions}</div>`:''}</section></div>`;
}
function ttgLibrary(){
 const entries=TTG_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.search||[c.name,c.number,c.effect].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase()))));
 const issues=ttgDeckIssues(ttgDeck),count=ttgCount(ttgDeck);
 return `<header class="pageHeading"><div><h1>天元突破 · 牌組構築</h1><p>UA56BT · 目前核實 ${TTG_CARDS.length} 種卡片，資料持續補充</p></div><button class="btn" data-view="lobby">返回大廳</button></header>
 <div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div>
 <div class="supportNote"><b>天元突破尚未開放對戰</b><span>你可以先編輯與儲存這個作品的獨立牌組草稿，BLEACH 的牌組與記錄不受影響。缺少的卡片不會被虛構補齊。</span></div>
 <div class="deckEditor"><label>天元突破牌組名稱<input id="ttgDeckName" maxlength="40" value="${esc(ttgName)}"></label><label>已儲存的天元突破牌組<select id="ttgSavedSelect"><option value="">選擇要載入的草稿</option>${ttgSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="ttgSave">儲存天元突破草稿</button><button class="btn outline" data-action="ttgNew">新建空白草稿</button></div><span class="deckSaveStatus">已儲存 ${ttgSaved.length} 副天元突破草稿</span></div>
 <div class="toolbar"><input id="search" type="search" placeholder="搜尋天元突破卡號、名稱或效果…" value="${esc(ui.search)}"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}">${n}</button>`).join('')}</div></div>
 <div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="查看官方卡片 ${esc(c.number)}"><img src="assets/mark.svg" alt="${esc(c.name)} 佔位圖" loading="lazy"></button><div class="catalogInfo"><strong>${esc(c.name)}</strong><div class="sub">${esc(c.number)} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]}</div><span class="autoStatus pending">尚未完成自動判定</span><div class="catalogMeta"><span>◆ ${c.energy} 能源</span><span>${c.bp||'—'} BP</span></div><p class="catalogEffect">${esc(c.effect)}</p><div class="countPicker"><button data-ttg-count="${c.id}" data-delta="-1" ${!ttgDeck[c.id]?'disabled':''}>−</button><b>${ttgDeck[c.id]||0}</b><button data-ttg-count="${c.id}" data-delta="1" ${ttgDeck[c.id]>=4?'disabled':''}>+</button></div></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>天元突破牌組概覽</h3><div class="deckTotal">${count} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,count*2)}%"></i></div><div class="validation invalid">${issues.map(esc).join('<br>')}</div><p class="note">目前允許儲存未滿 50 張的草稿。完整卡表與自動判定完成前，不開放使用此牌組進行 AI 對戰。</p><details class="deckContents"><summary>已選卡片</summary>${TTG_CARDS.filter(c=>ttgDeck[c.id]).map(c=>`<div class="deckContentRow">${esc(c.name)} · ×${ttgDeck[c.id]}</div>`).join('')||'<p class="note">尚未選擇卡片</p>'}</details></aside></div>`;
}

function soloAct(action){
 try{
  soloGame=soloTrainingDispatch(soloGame,action);
  assertSoloTrainingMatch(soloGame);
  save(SOLO_GAME_KEY,soloGame);
  ui.soloSelected=null;
  render();
 }catch(e){toast('我獨自升級：'+e.message);}
}
function soloArena(){
 if(!soloGame)return '<section class="panel">尚無練習對局。請先到我獨自升級牌組編輯器開局。</section>';
 const state=soloGame,p=state.players[0],opp=state.players[1],actor=state.pending?.p??state.active,bot=actor===1;
 const phase={start:'開始階段',move:'移動階段',main:'主要階段',attack:'攻擊階段'}[state.phase]||state.phase;
 const label=c=>c?esc(soloById[c.cardId]?.nameJa||c.cardId):'空';
 const slot=c=>c?'<b>'+label(c)+'</b> <small>'+esc(c.cardId)+' · '+(c.ready?'ACTIVE':'REST')+' · BP '+soloMatchBp(state,c)+'</small>':'<small>空格</small>';
 const board=who=>['front','energy'].map(line=>'<div class="panel"><h3>'+(line==='front'?'前線':'能源線')+'</h3><div class="grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px">'+who[line].map(c=>'<div class="catalogInfo" style="border:1px solid #7775;padding:8px;min-height:55px;border-radius:7px">'+slot(c)+'</div>').join('')+'</div></div>').join('');
 const actions=soloTrainingLegalActions(state);
 const actionButton=(a,title)=>'<button class="btn small" data-solo-act="'+encodeURIComponent(JSON.stringify(a))+'">'+esc(title)+'</button>';
 const ownedUnder=uid=>[...p.front,...p.energy].filter(Boolean).flatMap(c=>inspectSoloAttached(state,{viewer:0,owner:0,hostUid:c.uid})).find(c=>c.uid===uid);
 const chooseText=a=>{
  if(typeof a.count==='number')return '回復 '+a.count+' AP';
  if(typeof a.draw==='boolean')return a.draw?'抽1張':'不抽牌';
  if(state.pending?.kind==='eventRecover'||state.pending?.kind==='entryRecover'||state.pending?.kind==='sungRecovery')
   return a.uid==null?'不回收':'回收 '+label(state.players[actor].outside.find(c=>c.uid===a.uid));
  if(state.pending?.kind==='eventDestroy'||state.pending?.kind==='specialTrigger')
   return '使 '+label([...p.front,...opp.front].find(c=>c?.uid===a.uid))+' 退場';
  if(state.pending?.kind==='eventDance')return a.uid==null?'不選擇':'賦予攻擊抽牌 '+label([...p.front,...p.energy,...opp.front,...opp.energy].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='marieBuff')return 'BP+1000 '+label([...p.front,...p.energy].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='soldierTop'){
   return (a.outsideUid==null?'不送場外':'送場外：'+label(state.players[actor].deck.find(c=>c.uid===a.outsideUid)))
    +'；牌庫頂順序：'+a.order.map(uid=>label(state.players[actor].deck.find(c=>c.uid===uid))).join(' → ');
  }
  if(a.mode)return {block:'攻擊角色不被BP4000以上阻擋',untargetable:'攻擊角色不受敵方效果選取',buff:'攻擊角色本回合BP+1500',draw:'抽1張並棄1張',draw2:'抽2張',drawRecover:'抽1張，再選最多1張符合條件的場外角色回手'}[a.mode]||a.mode;
  if(state.pending?.kind==='colorTrigger')return label(p.hand.find(c=>c.uid===a.uid))+' → '+(a.line==='front'?'前線':'能源線')+(a.slot+1);
  if(state.pending?.kind==='specialTrigger')return '退場 '+label([...p.front,...opp.front].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='raidTrigger')return a.uid==null?'將Raid卡加入手牌':'Raid → '+(a.line==='front'?'前線':'能源線')+(a.slot+1)+'（底板 '+label([...p.front,...p.energy,...opp.front,...opp.energy].find(c=>c?.uid===a.uid))+'）';
  if(state.pending?.kind==='dailyUnder')return a.uid==null?'不移除裏向卡':label(ownedUnder(a.uid));
  if(state.pending?.kind==='dailyRecover'||state.pending?.kind==='entryRecover'||state.pending?.kind==='sungRecovery')return a.uid==null?'不回收':'回收 '+label(p.outside.find(c=>c.uid===a.uid));
  if(a.uid==null)return '不發動／不選擇／不阻擋';
  return label([...p.hand,...opp.hand,...p.front,...p.energy,...opp.front,...opp.energy].find(c=>c?.uid===a.uid));
 };
 const choices=state.pending?'<div class="panel"><b>請選擇：'+esc({
  discard:'棄一張手牌',entryImpact:'選擇獲得IMPACT的DFN角色',entryProtect:'選擇受AP保護的DFN',colorTrigger:'COLOR Trigger：選擇合法手牌及登場位置',specialTrigger:'SPECIAL Trigger：選擇敵方角色退場',entryDrawMode:'觀月繪里：選擇抽牌模式',entryRecover:'觀月繪里：選擇符合條件的場外角色',entryBounce:'選擇需返回手牌的己方其他角色',sungRecovery:'觀月繪里：選擇場外水篠旬回收',
  eventDiscard:'事件：請選擇送場外的手牌',eventRecover:'命之神水：可選一張場外角色回收',eventRestoreAp:'選擇回復的AP數量',eventDestroy:'選擇合法的敵方前線退場角色',eventDance:'舞姬：選擇獲得攻擊時抽牌的向坂雫',marieBuff:'瑪莉：選另一己方角色BP+1000並將瑪莉回手',attackDraw:'攻擊時選擇是否抽牌',ryuuBuff:'リュー：選擇己方角色BP+1000',ryuuAp:'リュー：選擇最多回復2AP',
  mainDiscard:'選擇支付的手牌',soldierTop:'影之兵士：查看牌庫頂並選擇順序',
  raidTrigger:'生命RAID Trigger：加入手牌或選擇底板',raid058Discard:'向坂雫攻擊：棄牌選擇',
  raid058Unfreeze:'ACTIVE與跳過ACTIVE的選擇',activeTrigger:'ACTIVE Trigger目標',
  block:'阻擋角色',kaiserPick:'凱賽爾：可選一張ACTIVE角色REST',kaiserMode:'凱賽爾：選尚未使用模式',
  kibaPick:'奇巴：可選一張ACTIVE角色REST',kibaMode:'奇巴：選尚未使用模式',
  kibaDiscard:'奇巴：抽牌後棄一張',belDiscard:'貝爾：可棄手牌後ACTIVE',
  dailyDiscard:'每日任務：支付棄牌成本',dailyUnder:'每日任務：選己方裏向卡送場外',
  dailyRecover:'每日任務：選0能源水篠旬回收'
 }[state.pending.kind]||'效果結算')+'</b><div class="toolbar">'+(bot?'對手正在選擇…':actions.map(a=>actionButton(a,chooseText(a))).join(''))+'</div></div>':'';
 const selected=ui.soloSelected;
 const selectable=actions.filter(a=>a.uid===selected);
 const normalActions=state.pending?[]:actions.filter(a=>a.type==='next'||a.type==='extraDraw'||a.type==='move'||a.type==='attack'||a.type==='ability');
 return '<header class="pageHeading"><div><h1>我獨自升級 · 限定卡組試玩 Beta</h1><p>僅 '+SOLO_MATCH_SUPPORTED.length+' 張已接入本試玩引擎的卡。完整80張效果、Raid與所有FAQ尚未完成，請勿當成正式裁定。</p></div><button class="btn" data-view="builder">返回牌組編輯</button></header>'
 +'<div class="supportNote"><b>'+(state.status==='finished'?(state.winner===0?'你獲勝':'電腦獲勝'):'第 '+state.turn+' 回合 · '+phase+' · '+(bot?'電腦處理中':'輪到你操作'))+'</b><span>你：AP '+p.ap+'/'+p.maxAp+' · 能源 '+soloEnergy(state,0)+' · 生命 '+p.life.length+' · 手牌 '+p.hand.length+'；電腦：AP '+opp.ap+' · 生命 '+opp.life.length+' · 手牌 '+opp.hand.length+'</span></div>'
 +'<h3>電腦場上</h3>'+board(opp)+'<h3>你的場上</h3>'+board(p)
 +choices
 +(state.status==='playing'&&!state.pending&&!bot?'<div class="panel"><h3>主要操作</h3><div class="toolbar">'+normalActions.map(a=>actionButton(a,a.type==='next'?'下一階段／結束回合':a.type==='extraDraw'?'支付1AP額外抽牌':a.type==='move'?'移動 '+label([...p.energy].find(c=>c?.uid===a.uid))+' → 前線'+(a.slot+1):a.type==='attack'?'攻擊 '+label(p.front.find(c=>c?.uid===a.uid)) :'發動 '+label([...p.energy,...p.front].find(c=>c?.uid===a.uid))+(a.mode?(' · '+({attach:'放置牌庫頂裏向卡',recover:'棄牌及回收',boost:'影之軍團BP強化'}[a.mode]||a.mode)):''))).join('')+'</div></div>':'')
 +'<div class="panel"><h3>你的手牌（點選卡片後選擇登場位置）</h3><div class="toolbar">'+p.hand.map(c=>'<button class="btn small '+(selected===c.uid?'primary':'outline')+'" data-solo-card="'+esc(c.uid)+'">'+label(c)+' · 能源'+soloById[c.cardId].energy+' · AP'+soloById[c.cardId].ap+'</button>').join('')+'</div>'
 +(selected?'<p>選擇位置</p><div class="toolbar">'+selectable.map(a=>actionButton(a,a.type==='play'?(a.line==='front'?'前線':'能源線')+(a.slot+1):a.type==='raid'?'Raid → '+(a.line==='front'?'前線':'能源線')+(a.slot+1)+'，底板 '+label([...p.front,...p.energy].find(c=>c?.uid===a.target)):a.type==='playEvent'?'使用事件，支付AP並依序選擇效果':'其他操作')).join('')+'</div>':'')+'</div>'
 +'<details class="panel"><summary>查看我方場下裏向卡（對手無法查看）</summary>'+[...p.front,...p.energy].filter(Boolean).map(c=>({host:c,cards:inspectSoloAttached(state,{viewer:0,owner:0,hostUid:c.uid})})).filter(x=>x.cards.length).map(x=>'<p>'+label(x.host)+'：'+x.cards.map(c=>label(c)).join(' / ')+'</p>').join('')+'</details>'
 +'<details class="panel"><summary>對局紀錄（最近20筆）</summary>'+state.log.slice(-20).map(x=>'<p>'+esc(x.turn+'：'+x.text)+'</p>').join('')+'</details>';
}

function soloLibrary(){
 const entries=SOLO_LEVELING_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.search||[c.name,c.number,c.effect].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase()))));
 const count=Object.values(soloDeck).reduce((a,b)=>a+b,0);
 return `<header class="pageHeading"><div><h1>我獨自升級 · 牌組構築</h1><p>UA51BT / SLG-1 · 已核對 ${SOLO_LEVELING_CARDS.length} / 80 種一般效果卡</p></div><button class="btn" data-view="lobby">返回大廳</button></header>
 <div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div>
 <div class="supportNote"><b>我獨自升級尚未開放對戰</b><span>已加入獨立卡表與草稿功能。剩餘 ${80-SOLO_LEVELING_CARDS.length} 種卡片、官方卡圖、FAQ 與自動判定尚需核實；不會把異圖當成不同效果卡，也不會混入 BLEACH、天元突破牌組。</span></div>
 <div class="deckEditor"><label>牌組名稱<input id="soloDeckName" maxlength="40" value="${esc(soloName)}"></label><label>已儲存牌組<select id="soloSavedSelect"><option value="">載入草稿</option>${soloSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="soloSave">儲存草稿</button><button class="btn outline" data-action="soloNew">新建草稿</button><button class="btn outline" data-action="soloPreset">載入影之軍團示範草稿</button><button class="btn primary" data-action="soloTrainingStart">綠色限定卡組試玩</button><button class="btn primary" data-action="soloTrainingStartShadow">紫色影之軍團試玩</button></div></div>
 <div class="toolbar"><input id="search" type="search" placeholder="搜尋 SLG 卡號、名稱與效果…" value="${esc(ui.search)}"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}">${n}</button>`).join('')}</div></div>
 <div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="開啟官方卡片 ${esc(c.number)}"><img src="assets/mark.svg" alt="${esc(c.name)} 佔位圖" loading="lazy"></button><div class="catalogInfo"><strong>${esc(c.name)}</strong><div class="sub">${esc(c.number)} · ${esc(TYPE_NAMES[c.type]||c.type)} · ${esc(COLOR_NAMES[c.color])}</div><span class="autoStatus pending">效果待實作</span><div class="catalogMeta"><span>◆ ${c.energy} 能源</span><span>AP ${c.ap}</span><span>BP ${c.bp??'—'}</span><span>產能 ${c.gen}</span></div><p class="catalogEffect">${esc(c.effect)}</p><div class="countPicker"><button data-solo-count="${c.id}" data-delta="-1" ${!soloDeck[c.id]?'disabled':''}>−</button><b>${soloDeck[c.id]||0}</b><button data-solo-count="${c.id}" data-delta="1" ${soloDeck[c.id]>=c.maxCopies?'disabled':''}>+</button></div></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>我獨自升級牌組</h3><div class="deckTotal">${count} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,count*2)}%"></i></div><p class="note">${esc(soloDeckIssues(soloDeck).join('；'))}。即使湊滿50張，完整自動判定前仍不能開始AI對戰。</p><details class="deckContents"><summary>已選卡片</summary>${SOLO_LEVELING_CARDS.filter(c=>soloDeck[c.id]).map(c=>`<div class="deckContentRow">${esc(c.name)} · ×${soloDeck[c.id]}</div>`).join('')||'<p class="note">尚未選擇卡片</p>'}</details></aside></div>`;
}
function bind(){
 $('#app').onclick=e=>{
  const el=e.target.closest('button');if(!el||el.disabled)return;
  if(el.dataset.view){chooseView(el.dataset.view);return;}
  if(el.dataset.title){ui.title=el.dataset.title;ui.set='all';ui.color='all';ui.search='';ui.selected=null;render();return;}
  if(el.dataset.soloCard){ui.soloSelected=ui.soloSelected===el.dataset.soloCard?null:el.dataset.soloCard;render();return;}
  if(el.dataset.soloAct){if(ui.view==='soloArena'&&(soloGame?.pending?.p??soloGame?.active)===0)soloAct(JSON.parse(decodeURIComponent(el.dataset.soloAct)));return;}
  if(el.dataset.soloCount){const id=el.dataset.soloCount;soloDeck[id]=Math.max(0,Math.min(soloById[id]?.maxCopies||4,(soloDeck[id]||0)+Number(el.dataset.delta)));persistSolo();render();return;}
  if(el.dataset.ttgCount){const id=el.dataset.ttgCount;ttgDeck[id]=Math.max(0,Math.min(4,(ttgDeck[id]||0)+Number(el.dataset.delta)));persistTtg();render();return;}
  if(el.dataset.mode){ui.mode=el.dataset.mode;render();return;}
  if(el.dataset.filter){ui.filter=el.dataset.filter;render();return;}
  if(el.dataset.count){const id=el.dataset.count;deck[id]=Math.max(0,Math.min(4,(deck[id]||0)+Number(el.dataset.delta)));persistDraft();render();return;}
  if(el.dataset.inspect){if(ui.title==='solo-leveling'){const c=soloById[el.dataset.inspect];if(c)window.open(c.source,'_blank','noopener,noreferrer');return;}
   if(ui.title==='gurren-lagann'){const c=TTG_CARDS.find(c=>c.id===el.dataset.inspect);if(c)window.open(c.source,'_blank','noopener,noreferrer');return;}ui.modal={type:'inspect',id:el.dataset.inspect};render();return;}
  if(el.dataset.side){ui.sideTab=el.dataset.side;render();return;}
  if(el.dataset.line){ui.line=el.dataset.line;render();return;}
  if(el.dataset.do){if(game&&humanTurn()&&!ui.raidFlow)act(JSON.parse(el.dataset.do));return;}
  if(el.dataset.hand){const p=game.mode==='solo'?0:gameActor(),c=game.players[p].hand.find(c=>c.uid===el.dataset.hand);ui.selected={uid:c.uid,p,source:'hand'};ui.line=cardOf(c).bp>=3000?'front':'energy';ui.raidFlow=null;ui.deployment='normal';if(legalActions(game).some(a=>a.type==='raid'&&a.uid===c.uid)){beginRaid();}else render();return;}
  if(el.dataset.slot){const [pp,line,ss]=el.dataset.slot.split('|'),p=Number(pp),slot=Number(ss),a=destination(p,line,slot);if(a){if(a.type==='raidBase'){ui.raidFlow.step='position';ui.raidFlow.target=a.target;render();}else if(ui.raidFlow&&a.type==='raid'){ui.raidFlow.step='confirm';ui.raidFlow.action=a;render();}else if(a.type==='chooseRaid'){ui.modal={type:'raid',actions:a.actions};render();}else act(a);return;}if(ui.raidFlow)return;const c=game.players[p][line][slot];if(c){ui.raidFlow=null;ui.selected={uid:c.uid,p,source:'field'};ui.line='front';render();}return;}
  if(el.dataset.pile){const [p,pile]=el.dataset.pile.split('|');ui.modal={type:'pile',p:Number(p),pile};render();return;}
  if(el.dataset.choice&&game?.pending&&humanTurn()){
   const id=el.dataset.choice,q=game.pending;if(q.max===1)ui.choiceIds=ui.choiceIds[0]===id?[]:[id];else if(ui.choiceIds.includes(id))ui.choiceIds=ui.choiceIds.filter(x=>x!==id);else if(ui.choiceIds.length<q.max)ui.choiceIds.push(id);else{toast(`最多選擇 ${q.max} 張。`);return;}render();return;
  }
  if(el.dataset.raidAction){const a=ui.modal.actions[Number(el.dataset.raidAction)];act(a);return;}
  switch(el.dataset.action){
   case 'soloTrainingStartShadow':try{soloGame=newSoloTrainingMatch({decks:[SOLO_SHADOW_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET],mode:'solo',seed:Date.now()});save(SOLO_GAME_KEY,soloGame);ui.view='soloArena';ui.soloSelected=null;render();}catch(e){toast(e.message);}break;
   case 'soloTrainingStart':try{soloGame=newSoloTrainingMatch({decks:[soloTrainingDeckIssues(soloDeck).length?SOLO_TRAINING_PRESET:soloDeck,SOLO_TRAINING_PRESET],mode:'solo',seed:Date.now()});save(SOLO_GAME_KEY,soloGame);ui.view='soloArena';ui.soloSelected=null;render();}catch(e){toast(e.message);}break;
   case 'soloPreset':soloDeck=soloNormalize(SOLO_DRAFT_PRESET);soloName='影之軍團示範牌組（尚不可對戰）';persistSolo();render();break;
   case 'soloNew':soloDeck=soloNormalize({});soloName='我獨自升級自訂牌組';persistSolo();render();break;
   case 'soloSave':soloSaved=[...soloSaved,{name:soloName.trim()||'我獨自升級自訂牌組',counts:soloNormalize(soloDeck)}];save(SOLO_SAVED_KEY,soloSaved);render();toast('已儲存我獨自升級牌組草稿。');break;
   case 'ttgNew':ttgDeck=emptyTtgDeck();ttgName='天元突破自訂牌組';persistTtg();render();break;
   case 'ttgSave':{const name=ttgName.trim()||'天元突破自訂牌組';ttgSaved=[...ttgSaved,{id:'ttg-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts:normalizeTtgCounts(ttgDeck)}];save(TTG_SAVED_KEY,ttgSaved);render();toast('已儲存天元突破牌組草稿。');break;}
   case 'start':startGame();break;
   case 'useDeck':if(validateDeck(deck).length)toast(validateDeck(deck)[0]);else{persistDraft();chooseView('lobby');toast('已套用這副牌組。');}break;
   case 'resetDeck':loadDeckSource('preset:'+ui.preset);break;
   case 'newDeck':deck=emptyDeck();deckName='新的 BLEACH 牌組';selectedDeckId=null;persistDraft();render();break;
   case 'saveDeck':case 'copySavedDeck':try{saveCurrentDeck(el.dataset.action==='copySavedDeck');}catch(e){toast(e.message);}break;
   case 'deckCode':ui.modal={type:'deckCode'};render();break;
   case 'copyDeck':{const t=$('#deckCode');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t.value).then(()=>toast('牌組清單已複製。')).catch(()=>{t.select();toast('已選取清單，可以手動複製。');});else{t.select();toast('已選取清單，可以手動複製。');}break;}
   case 'importDeck':{try{const parsed=parseDeck($('#deckCode').value);deck=parsed.counts;if(parsed.name)deckName=parsed.name;selectedDeckId=null;persistDraft();ui.modal=null;ui.view='builder';render();toast('牌組已匯入，可以命名儲存。');}catch(e){toast(e.message||'清單格式不正確。');}break;}
   case 'handoff':ui.handoff=false;render();break;
   case 'normalDeployment':cancelRaid();break;
   case 'raid':beginRaid();break;
   case 'cancelRaid':cancelRaid();break;
   case 'raidRestart':beginRaid();break;
   case 'raidBack':if(ui.raidFlow){if(ui.raidFlow.step==='confirm'){ui.raidFlow.step='position';ui.raidFlow.action=null;}else{ui.raidFlow.step='base';ui.raidFlow.target=null;}render();}break;
   case 'raidConfirm':if(ui.raidFlow?.step==='confirm'){const selected=raidActions().find(a=>JSON.stringify(a)===JSON.stringify(ui.raidFlow.action));if(selected){ui.raidFlow=null;act(selected);}else cancelRaid();}break;
   case 'skipChoice':if(humanTurn())act({type:'choose',ids:[]});break;
   case 'confirmChoice':if(humanTurn())act({type:'choose',ids:[...ui.choiceIds]});break;
   case 'closeModal':ui.modal=null;render();break;
   case 'showUnder':{
    const l=game&&ui.selected?.source==='field'?locate(game,ui.selected.uid):null;
    if(l&&humanTurn()&&ui.selected.p===l.p&&l.p===gameActor()&&l.card.under?.length){ui.modal={type:'under',p:l.p,uid:l.card.uid};render();}
    break;
   }
   case 'showLog':ui.modal={type:'log'};render();break;
   case 'newMatch':ui.modal={type:'newMatch'};render();break;
   case 'hint':{
    const a=botAction(game);if(!a)break;
    if(a.type==='choose'){ui.choiceIds=a.ids;render();toast('已標記建議選擇，你可以更改後再確認。');}
    else if(a.uid){const f=locate(game,a.uid),p=gameActor();ui.selected={uid:a.uid,p,source:f?'field':'hand'};ui.line=a.line||'front';ui.deployment=a.type==='raid'?'raid':'normal';render();toast(a.type==='raid'?'可以 Raid，點選 Raid 後選擇基底。':a.type==='ability'?'建議發動這張卡片的能力。':a.type==='attack'?'建議以這個角色攻擊。':'建議使用這張手牌，選擇放置位置。');}
    else toast(a.type==='extraDraw'?'可以花 1 AP 額外抽牌。':a.type==='keep'?'這副起手可以保留。':a.type==='redraw'?'缺少低需求角色，建議完整重抽。':'目前可以進入下一個階段。');break;
   }
  }
 };
 for(const [id,prop] of [['setFilter','set'],['colorFilter','color'],['supportFilter','support']]){const el=$('#'+id);if(el)el.onchange=()=>{ui[prop]=el.value;render();};}
 const search=$('#search');if(search)search.oninput=()=>{const start=search.selectionStart;ui.search=search.value;render();const next=$('#search');next.focus();next.setSelectionRange(start,start);};
 const soloNameInput=$('#soloDeckName');if(soloNameInput)soloNameInput.oninput=()=>{soloName=soloNameInput.value.slice(0,40);};
 const soloSavedInput=$('#soloSavedSelect');if(soloSavedInput)soloSavedInput.onchange=()=>{const d=soloSaved[Number(soloSavedInput.value)];if(!d||soloSavedInput.value==='')return;soloName=d.name;soloDeck=soloNormalize(d.counts);persistSolo();render();};
 const ttgNameInput=$('#ttgDeckName');if(ttgNameInput)ttgNameInput.oninput=()=>{ttgName=ttgNameInput.value.slice(0,40);};
 const ttgSavedInput=$('#ttgSavedSelect');if(ttgSavedInput)ttgSavedInput.onchange=()=>{const chosen=ttgSaved[Number(ttgSavedInput.value)];if(!chosen||ttgSavedInput.value==='')return;ttgName=chosen.name;ttgDeck=normalizeTtgCounts(chosen.counts);persistTtg();render();};
 const first=$('#firstSelect');if(first)first.onchange=()=>{ui.first=first.value;};
 const deckNameInput=$('#deckName');if(deckNameInput)deckNameInput.oninput=()=>{deckName=deckNameInput.value.slice(0,40);persistDraft();const entry=savedDecks.find(d=>d.id===selectedDeckId),status=$('.deckSaveStatus');if(status)status.textContent=(!entry||!sameCounts(entry.counts,deck)||entry.name!==deckName.trim()?'編輯中的草稿':'✓ 已儲存')+` · 已儲存 ${savedDecks.length} 副`;};
 const playerDeck=$('#playerDeckSelect');if(playerDeck)playerDeck.onchange=()=>{try{loadDeckSource(playerDeck.value);}catch(e){toast(e.message);}};
 const deckSource=$('#deckSourceSelect');if(deckSource)deckSource.onchange=()=>{try{loadDeckSource(deckSource.value);}catch(e){toast(e.message);}};
 const opponentDeck=$('#opponentDeckSelect');if(opponentDeck)opponentDeck.onchange=()=>{ui.opponentSource=opponentDeck.value;persistDraft();};
 document.onkeydown=e=>{
  if(e.key==='Escape'&&ui.modal){ui.modal=null;render();return;}
  if(e.key==='Tab'&&$('.modal')){
   const buttons=[...$('.modal').querySelectorAll('button:not([disabled]),a[href],textarea,input,select')];
   if(!buttons.length)return;
   const first=buttons[0],last=buttons.at(-1);
   if(!$('.modal').contains(document.activeElement)){e.preventDefault();first.focus();}
   else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 };
}
render();
