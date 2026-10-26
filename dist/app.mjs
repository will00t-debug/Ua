const PUBLIC_EDITOR_ONLY = typeof window !== 'undefined' && typeof window.location?.assign === 'function' && ['http:','https:'].includes(window.location.protocol);
import {CARDS,BY_ID,PRESETS,TYPE_NAMES,TRIGGER_NAMES,validateDeck,SETS,COLOR_NAMES,pendingCards,deckColors} from './cards.mjs?v=9.1.0';
import {normalizeCounts,emptyDeck,parseDeck,formatDeck,readSavedDecks,sameCounts} from './decks.mjs?v=8';
import {TITLES} from './title-registry.mjs';
import {renderVisualDeckBuilder} from './visual-deck-builder.mjs';
import {v2DeckReport} from './universal-v2/official-entry.mjs';
import {SAO_CARDS,SAO_BY_ID,saoDeckIssues} from './sao-cards.mjs';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {SOLO_ART_CREDIT,SOLO_RUGIA_SEARCH,soloArtErrorFallback} from './solo-art.mjs';
import {normalizeSoloDeck,soloDeckIssues,SOLO_DRAFT_PRESET} from './solo-decks.mjs';
import {SOLO_MATCH_SUPPORTED,SOLO_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET,soloTrainingDeckIssues,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,soloTrainingBotAction,assertSoloTrainingMatch,soloEnergy,soloMatchBp,inspectSoloAttached} from './solo-match.mjs';
import {MST_CARDS,emptyMstDeck,normalizeMstCounts,mstCount,mstDeckIssues,readMstSaved} from './mst-builder.mjs';
import {REZERO_VOL2_CARDS,REZERO_VOL2_BY_ID,REZERO_VOL2_SET} from './rezero-vol2.mjs';
import {emptyRezDeck,normalizeRezCounts,rezCount,rezDeckIssues,readRezSaved,REZERO_ALL_CARDS,REZERO_ALL_BY_ID} from './rezero-builder.mjs';
import {TTG_PENDING_CARDS} from './ttg-pending.mjs';
import {TTG_CARDS,TTG_BY_ID,emptyTtgDeck,normalizeTtgCounts,ttgCount,ttgDeckIssues,readTtgSaved} from './ttg-builder.mjs';
import {TTG_ART_CREDIT,TTG_RUGIA_CARD_SEARCH,ttgArtErrorFallback} from './ttg-art.mjs';
import {newTtgCoreMatch,assertTtgCoreState,legalTtgCoreActions,dispatchTtgCoreAction,ttgCoreAiChoice} from './ttg-core-match.mjs';
import {TTG_BETA_IDS,TTG_BETA_NOTICE,TTG_GREEN_BETA_PRESET,TTG_RED_BETA_PRESET,ttgBetaDeckIssues,ttgChoiceActor,ttgActionLabel,ttgActionKinds,ttgFilteredActions,ttg012ManualChoice,ttg012SearchChoice,ttgCardByUid,ttgNormalPlacementAction} from './ttg-browser.mjs';
import {newGame,dispatch,legalActions,controller,cardOf,bp,energy,damageOf,locate,PHASE_NAMES,assertState} from './engine.mjs?v=9.1.1';
import {startMatchForTitle,dispatchMatchAction,matchLegalActions,matchChoiceActor,chooseMatchBotAction} from './match-runtime.mjs';
import {betaDifficultySelect,betaArenaHeader} from './beta-match-ui.mjs';
import {chooseAiAction} from './ai-v2.mjs';

const $=s=>document.querySelector(s);
const AI_KEY='ua-ai-difficulty-v1',GAME_KEY='bleach-arena-game-v1',DECK_KEY='bleach-arena-deck-v1',SAVED_DECKS_KEY='bleach-arena-saved-decks-v1',DECK_META_KEY='bleach-arena-deck-meta-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ttgArtImg=(card,extraClass='')=>`<img class='ttgRemoteArt ${esc(extraClass)}' data-ttg-art='1' src='${esc(card?.image||'assets/mark.svg')}' alt='${esc(card?.nameZh||card?.nameJa||card?.id||'天元突破卡圖')}' loading='lazy' decoding='async' referrerpolicy='no-referrer'>`;
const soloArtImg=(card,extraClass='')=>`<img class='soloRemoteArt ${esc(extraClass)}' data-solo-art='1' src='${esc(card?.image||'assets/mark.svg')}' alt='${esc(card?.name||card?.nameJa||card?.id||'我獨自升級卡圖')}' loading='lazy' decoding='async' referrerpolicy='no-referrer'>`;
const iconPaths={home:'M3 10 12 3l9 7v10H3z M9 20v-7h6v7',cards:'M5 4h11v16H5z M9 2h10v15',book:'M12 5v15M12 5C8 2 3 3 3 3v15s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2',sword:'m16 3 5 1-1 5-9 9-5-5z M3 21l5-5 M4 12l8 8',robot:'M5 7h14v13H5z M12 3v4 M8 12h1 M15 12h1 M9 17h6 M2 11v5 M22 11v5',people:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a7 7 0 0 1 14 0v3 M17 5a3 3 0 0 1 0 6 M19 15a5 5 0 0 1 3 5',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6',bolt:'m13 2-9 12h7l-1 8 10-13h-8z',arrow:'M4 12h15 M14 6l6 6-6 6',refresh:'M20 7v6h-6 M4 17v-6h6 M5 6a8 8 0 0 1 13 0 M19 18a8 8 0 0 1-13 0'};
const icon=k=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${iconPaths[k]||iconPaths.cards}"/></svg>`;
let deck=loadDeck(),game=loadGame();
let savedDecks=readSavedDecks(safeRead(SAVED_DECKS_KEY));
const TTG_GAME_KEY='ua-ttg-beta-game-v1';
const TTG_DRAFT_KEY='ua-ttg-draft-v1',TTG_SAVED_KEY='ua-ttg-saved-v1';
const SAO_DRAFT_KEY='ua-sao-draft-v1',SAO_SAVED_KEY='ua-sao-saved-v1';
const SOLO_GAME_KEY='ua-slg-training-v1';
const SOLO_DRAFT_KEY='ua-slg-draft-v1',SOLO_SAVED_KEY='ua-slg-saved-v1';
const MST_DRAFT_KEY='ua-mst-draft-v1',MST_SAVED_KEY='ua-mst-saved-v1';
const REZ_DRAFT_KEY='ua-rez-draft-v1',REZ_SAVED_KEY='ua-rez-saved-v1';
let saoDeck=safeRead(SAO_DRAFT_KEY)||{},saoSaved=Array.isArray(safeRead(SAO_SAVED_KEY))?safeRead(SAO_SAVED_KEY):[],saoName='刀劍神域自訂牌組';
let ttgDeck=loadTtgDraft(),ttgSaved=readTtgSaved(safeRead(TTG_SAVED_KEY)),ttgName='天元突破自訂牌組';
function loadTtgDraft(){try{return normalizeTtgCounts(safeRead(TTG_DRAFT_KEY));}catch{return emptyTtgDeck();}}
function persistTtg(){save(TTG_DRAFT_KEY,ttgDeck);}
let ttgGame=null;try{const previous=safeRead(TTG_GAME_KEY);if(previous?.kind==='ttg-core-smoke'&&assertTtgCoreState(previous))ttgGame=previous;}catch{ttgGame=null;}
const soloById=Object.fromEntries(SOLO_LEVELING_CARDS.map(c=>[c.id,c]));
function soloNormalize(raw){return normalizeSoloDeck(raw);}
let soloDeck;try{soloDeck=soloNormalize(safeRead(SOLO_DRAFT_KEY));}catch{soloDeck=soloNormalize({});}
let soloSaved=[];try{soloSaved=(safeRead(SOLO_SAVED_KEY)||[]).filter(x=>x&&typeof x.name==='string'&&x.counts).map(x=>({...x,counts:soloNormalize(x.counts)}));}catch{soloSaved=[];}
let soloName='我獨自升級自訂牌組';
let soloGame=null;try{const value=safeRead(SOLO_GAME_KEY);if(value?.title==='solo-leveling'&&assertSoloTrainingMatch(value))soloGame=value;}catch{soloGame=null;}
function persistSolo(){save(SOLO_DRAFT_KEY,soloDeck);}
let mstDeck=loadMstDraft(),mstSaved=readMstSaved(safeRead(MST_SAVED_KEY)),mstName='無職轉生自訂牌組';
function loadMstDraft(){try{return normalizeMstCounts(safeRead(MST_DRAFT_KEY));}catch{return emptyMstDeck();}}
function persistMst(){save(MST_DRAFT_KEY,mstDeck);}
let rezDeck=loadRezDraft(),rezSaved=readRezSaved(safeRead(REZ_SAVED_KEY)),rezName='Re:Zero Vol.2 自訂牌組';
function loadRezDraft(){try{return normalizeRezCounts(safeRead(REZ_DRAFT_KEY));}catch{return emptyRezDeck();}}
function persistRez(){save(REZ_DRAFT_KEY,rezDeck);}
const deckMeta=safeRead(DECK_META_KEY)||{};
let deckName=typeof deckMeta.name==='string'?deckMeta.name.slice(0,40):(PRESETS.find(p=>sameCounts(p.counts,deck))?.name||'自訂 BLEACH 牌組');
let selectedDeckId=savedDecks.some(d=>d.id===deckMeta.savedId)?deckMeta.savedId:null;
const ui={ttgSelected:null,ttgKind:'all',ttgVisible:90,ttg012:{discardUids:[],mode:'readyAP',apUid:null,targetUid:null},ttg012Search:{takeUid:null,orderUids:[]},soloSelected:null,saoSet:'all',title:'bleach',view:'lobby',mode:'solo',aiDifficulty:['easy','normal','hard'].includes(safeRead(AI_KEY))?safeRead(AI_KEY):'normal',first:'0',preset:[0,1].includes(deckMeta.preset)?deckMeta.preset:0,opponentSource:'preset:1',filter:'all',search:'',selected:null,line:'energy',deployment:'normal',sideTab:'card',raidFlow:null,modal:null,choiceIds:[],handoff:false,lastController:null,privatePeekOpen:false};
ui.builderReady=false;ui.builderTab='pick';ui.builderType='all';ui.builderColor='all';ui.builderEnergy='all';
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
function gameActor(){return game?matchChoiceActor('bleach',game):0;}
function botTurn(){return game?.mode==='solo'&&gameActor()===1&&game.status!=='finished';}
function humanTurn(){return !botTurn()&&!ui.handoff;}
function chooseView(view){if(PUBLIC_EDITOR_ONLY&&['arena','soloArena','ttgArena'].includes(view)){window.location.assign('/');return;}ui.view=view;ui.modal=null;ui.selected=null;ui.raidFlow=null;ui.privatePeekOpen=false;if(view==='arena'&&game?.mode==='hotseat'){ui.handoff=true;ui.lastController=gameActor();}render();window.scrollTo({top:0,behavior:'instant'});}
function startGame(){
 const errors=validateDeck(deck);if(errors.length){toast(errors[0]);chooseView('builder');return;}
 const first=ui.first==='random'?Math.floor(Math.random()*2):Number(ui.first);
 try{const opponent=resolveDeckSource(ui.opponentSource);game=startMatchForTitle('bleach',{decks:[deck,opponent.counts],mode:ui.mode,first,names:ui.mode==='solo'?['你','練習對手']:['玩家一','玩家二']});game.deckNames=[deckName,opponent.name];}catch(e){toast(e.message);return;}
 ui.view='arena';ui.selected=null;ui.raidFlow=null;ui.modal=null;ui.choiceIds=[];ui.privatePeekOpen=false;ui.handoff=game.mode==='hotseat';ui.lastController=controller(game);save(GAME_KEY,game);render();window.scrollTo({top:0,behavior:'instant'});
}
function act(a){
 try{const before=matchChoiceActor('bleach',game);game=dispatchMatchAction('bleach',game,a);assertState(game);save(GAME_KEY,game);ui.choiceIds=[];ui.selected=null;ui.modal=null;ui.privatePeekOpen=false;
  if(game.mode==='hotseat'&&game.status!=='finished'&&controller(game)!==before)ui.handoff=true;
  ui.lastController=controller(game);render();
 }catch(e){toast(e.message);}
}
function filteredCards(){const q=ui.search.toLowerCase();return CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.set||ui.set==='all'||c.sets.includes(ui.set))&&(!ui.color||ui.color==='all'||c.color===ui.color)&&(!ui.support||ui.support==='all'||c.auto===(ui.support==='auto'))&&[c.name,c.nameJa,c.number,c.identity,c.tag,c.effect,...c.aliases].some(s=>s?.toLowerCase().includes(q)));}
function catalogVariant(c){return c.variants?.find(v=>v.set===ui.set)||c;}
function supportNote(counts){const pending=pendingCards(counts);return pending.length?`<div class="supportNote"><b>${pending.length} 種卡片待補自動判定</b><span>可編輯、儲存與匯出；開局需使用已完成判定的卡片。</span><details><summary>查看卡片</summary>${pending.map(c=>`${esc(c.name)} · ${c.identity}`).join('<br>')}</details></div>`:'<p class="note">✓ 此牌組的卡片皆可自動結算。</p>';}
function footer(){return `<footer class="footer"><span>UNION ARENA · BLEACH 千年血戰篇</span><span>非官方練習模擬器 · 第一～三彈／卡冊／書卡／高級預組</span></footer>`;}
function render(){
 // Production battles run exclusively on V2; this classic app remains a deck editor and catalogue.
 if(PUBLIC_EDITOR_ONLY&&['arena','soloArena','ttgArena'].includes(ui.view)){window.location.replace('/');return;}
 clearTimeout(botTimer);
 const modalScroll=$('.modal')?.scrollTop||0;
 ui.contentsOpen=$('.deckContents')?.open??ui.contentsOpen??false;
 const active=['arena','soloArena','ttgArena'].includes(ui.view)?'lobby':ui.view;
 $('#app').innerHTML=`<div class="shell${ui.view==='arena'?' shell-match':''}"><aside class="rail"><button class="brand" data-view="lobby" aria-label="返回對戰大廳"><img src="assets/mark.svg" alt=""><span><b>BLEACH ARENA</b><small>UNION ARENA SIMULATOR</small></span></button><nav class="nav" aria-label="主要導覽">${[['lobby','home','對戰大廳'],['builder','cards','牌組構築'],['library','book','卡片圖鑑'],['rules','shield','操作說明']].map(([v,i,n])=>`<button data-view="${v}" class="${active===v?'active':''}" ${active===v?'aria-current="page"':''}>${icon(i)}<span>${n}</span></button>`).join('')}</nav></aside><main class="main"><header class="topbar"><div class="breadcrumb">UNION ARENA <span> / </span> <b>${{lobby:'對戰大廳',builder:'牌組構築',library:'卡片圖鑑',rules:'操作說明',arena:'對戰練習',soloArena:'我獨自升級・試玩',ttgArena:'天元突破・限定 Beta 試玩'}[ui.view]}</b></div><div class="topStatus"><span><i class="statusDot"></i>規則自動結算</span><span class="pill">${ui.view==='ttgArena'||ui.title==='gurren-lagann'?'天元突破 · Beta':ui.view==='soloArena'||ui.title==='solo-leveling'?'我獨自升級 · Beta':ui.title==='rezero'?'Re:從零 Vol.2 · 圖鑑':'BLEACH · 日本／亞洲版'}</span></div></header>${ui.view==='lobby'?lobby():ui.view==='builder'||ui.view==='library'?library():ui.view==='rules'?rules():ui.view==='soloArena'?soloArena():ui.view==='ttgArena'?ttgArena():arena()}${footer()}</main></div>${modalContent()}`;
 bind();
 if($('.modal'))$('.modal').scrollTop=modalScroll;
 const shell=$('.shell');if(shell)shell.inert=!!$('.modalBackdrop');
 if(ui.view==='arena'&&botTurn()&&!ui.handoff&&!ui.modal){botTimer=setTimeout(()=>{const a=chooseMatchBotAction('bleach',game,{difficulty:ui.aiDifficulty});if(a)act(a);},game.pending?850:550);}
 if(ui.view==='soloArena'&&soloGame?.status==='playing'&&matchChoiceActor('solo-leveling',soloGame)===1){botTimer=setTimeout(()=>soloAct(chooseMatchBotAction('solo-leveling',soloGame,{difficulty:ui.aiDifficulty})),350);}
 if(ui.view==='ttgArena'&&ttgGame?.status==='playing'&&matchChoiceActor('gurren-lagann',ttgGame)===1){botTimer=setTimeout(()=>{try{const a=chooseMatchBotAction('gurren-lagann',ttgGame,{difficulty:ui.aiDifficulty});if(a)ttgAct(a);else toast('天元突破 AI 尚無合法動作，請記錄此局面。');}catch(e){toast('天元突破 AI：'+e.message);}},450);}
}
function lobby(){
 if(PUBLIC_EDITOR_ONLY)return `<section class="lobbyIntro"><h1>UNION ARENA <span>V2</span></h1><p>正式對戰已全部切換至 V2 規則引擎；此頁保留牌組構築、匯入匯出與卡片圖鑑。</p><p class="introMeta">原本的牌組草稿仍保存在同一個瀏覽器。</p></section><div class="lobbySetup"><section class="panel" aria-label="V2 對戰入口"><div class="sectionTitle"><h2>開始 V2 對戰</h2><span>使用新引擎進行合法動作與效果結算</span></div><p class="note">支援牌組以 V2 已完整移植並通過驗收的卡牌為準；編輯器收藏的牌不一定已支援 V2 對戰。</p><p><a class="btn primary" href="/" style="display:inline-flex;text-decoration:none">進入 V2 正式對戰 →</a></p></section><section class="panel" style="margin-top:14px"><div class="sectionTitle"><h2>牌組與卡片工具</h2></div><p><button class="btn" data-view="builder">牌組構築／匯入／匯出</button> <button class="btn outline" data-view="library">卡片圖鑑</button></p><p class="note">已停用舊版與各作品獨立 Beta 對戰入口，避免混用兩套規則引擎。原有牌組資料不會自動刪除。</p></section></div>`;

  const currentPreset=PRESETS[ui.preset];const custom=!sameCounts(deck,currentPreset.counts);
 return `<section class="lobbyIntro"><h1>BLEACH <span>ARENA</span></h1><p>構築牌組，開始你的 UNION ARENA 對局。</p><p class="introMeta">第一～三彈／卡冊／書卡／高級預組 · ${CARDS.length} 種卡片</p>${game&&game.status!=='finished'?'<button class="btn resumeMatch" data-view="arena">繼續上次對局 →</button>':''}</section><div class="lobbySetup"><section class="panel" aria-label="UNION ARENA V2 官方規則測試入口" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;padding:18px 20px;margin-bottom:18px;border:1px solid #c8d7d3;background:#f3faf6"><div style="min-width:220px;flex:1"><strong style="font-size:17px;color:#24634a">UNION ARENA V2 · 新版對戰測試</strong><p style="margin:5px 0 0;color:#495f57;font-size:13px">BLEACH「我拒絕」藍色 ×「白劍」綠色，原始 50 張牌組、官方 FAQ 規則測試。舊版對戰功能仍保留。</p></div><a class="btn primary" href="/universal-v2-preview.html" style="display:inline-flex;align-items:center;justify-content:center;min-height:42px;white-space:nowrap;text-decoration:none">進入 V2 測試對戰 →</a></section><div class="sectionTitle"><h2>準備對局</h2><span>50 張牌組 · 7 張起始生命</span></div><div class="lobbyGrid"><section class="panel"><div class="sectionTitle"><h2 style="font-size:14px">對戰模式</h2></div><div class="modeCards">${[['solo','電腦練習','隨時開局，熟悉牌組節奏'],['hotseat','同裝置雙人','輪流操作，切換時隱藏手牌']].map(([v,n,d])=>`<button class="modeCard ${ui.mode===v?'selected':''}" data-mode="${v}" aria-pressed="${ui.mode===v}"><span class="check"></span><b>${n}</b><small>${d}</small></button>`).join('')}</div>${ui.mode==='solo'?`<label class="setupRow"><span>電腦難度</span><select id="aiDifficultySelect" aria-label="選擇電腦難度"><option value="easy" ${ui.aiDifficulty==='easy'?'selected':''}>簡單 · 原版 AI</option><option value="normal" ${ui.aiDifficulty==='normal'?'selected':''}>普通 · 局面評估</option><option value="hard" ${ui.aiDifficulty==='hard'?'selected':''}>困難 · 多步搜尋</option></select></label>`:''}<label class="setupRow"><span>先後手</span><select id="firstSelect"><option value="0" ${ui.first==='0'?'selected':''}>${ui.mode==='solo'?'你':'玩家一'}先攻</option><option value="1" ${ui.first==='1'?'selected':''}>${ui.mode==='solo'?'練習對手':'玩家二'}先攻</option><option value="random" ${ui.first==='random'?'selected':''}>隨機決定</option></select></label><label class="setupRow"><span>${ui.mode==='solo'?'練習對手牌組':'玩家二牌組'}</span><select id="opponentDeckSelect" aria-label="選擇對手牌組">${deckOptions(ui.opponentSource)}</select></label><button class="btn primary startMatch" data-action="start">${ui.mode==='solo'?'開始練習':'開始雙人對戰'} →</button><p class="note">兩種模式皆自動結算規則。目前提供單機與同裝置對戰。</p></section><section class="panel"><div class="sectionTitle"><h2 style="font-size:14px">使用牌組</h2><button class="subtleButton" data-view="builder">編輯 →</button></div><div class="deckChoice"><img class="deckThumb" src="assets/cards/${ui.preset===0?'104':'105'}.png" alt="${ui.preset===0?'黑崎一護':'阿散井戀次'}"><div><b>${esc(deckName||'未命名牌組')}</b><p>${custom?'使用你在牌組構築頁設定的卡片。':currentPreset.description}</p><select id="playerDeckSelect" aria-label="選擇你的牌組">${deckOptions()}</select></div></div><div class="deckStats"><div><b>${total()}</b><span>牌組張數</span></div><div><b>${Object.values(deck).filter(Boolean).length}</b><span>使用卡種</span></div><div><b>7</b><span>起始生命</span></div></div>${supportNote(deck)}<p class="note">可選預設或已儲存的牌組。你的編輯草稿會保存在此瀏覽器。</p></section></div></div>`;
}

function visualDeckLibrary(){
 const optionsByTitle={
  bleach:{counts:deck,name:deckName,nameId:'deckName',savedId:'deckSourceSelect',savedOptions:[...PRESETS.map((d,i)=>({value:'preset:'+i,label:'預設：'+d.name})),...savedDecks.map(d=>({value:'saved:'+d.id,label:d.name}))],saveAction:'saveDeck',newAction:'newDeck',issues:validateDeck(deck)},
  'gurren-lagann':{counts:ttgDeck,name:ttgName,nameId:'ttgDeckName',savedId:'ttgSavedSelect',savedOptions:ttgSaved.map((d,i)=>({value:String(i),label:d.name})),saveAction:'ttgSave',newAction:'ttgNew',issues:ttgDeckIssues(ttgDeck)},
  'sword-art-online':{counts:saoDeck,name:saoName,nameId:'saoDeckName',savedId:'saoSavedSelect',savedOptions:saoSaved.map((d,i)=>({value:String(i),label:d.name})),saveAction:'saoSave',newAction:'saoNew',issues:saoDeckIssues(saoDeck)},
  'solo-leveling':{counts:soloDeck,name:soloName,nameId:'soloDeckName',savedId:'soloSavedSelect',savedOptions:soloSaved.map((d,i)=>({value:String(i),label:d.name})),saveAction:'soloSave',newAction:'soloNew',issues:soloDeckIssues(soloDeck)},
  'mushoku-tensei':{counts:mstDeck,name:mstName,nameId:'mstDeckName',savedId:'mstSavedSelect',savedOptions:mstSaved.map((d,i)=>({value:String(i),label:d.name})),saveAction:'mstSave',newAction:'mstNew',issues:mstDeckIssues(mstDeck)},
   rezero:{counts:rezDeck,name:rezName,nameId:'rezDeckName',savedId:'rezSavedSelect',savedOptions:rezSaved.map((d,i)=>({value:String(i),label:d.name})),saveAction:'rezSave',newAction:'rezNew',issues:rezDeckIssues(rezDeck)}
 };
 const data=optionsByTitle[ui.title]||optionsByTitle.bleach;
 const report=v2DeckReport(ui.title,data.counts);
 const joined=(data.issues||[]).join(' ');
 const extra=(report.issues||[]).filter(issue=>{
  if(joined.includes(issue))return false;
  const ids=issue.match(/[A-Z]{2,}-\d+-\d+/g)||[];
  if(ids.length)return ids.some(id=>!joined.includes(id));
  return !joined.includes('不能開始對戰');
 });
 return renderVisualDeckBuilder({
  titles:TITLES,titleId:ui.title,ready:ui.builderReady,tab:ui.builderTab,
  search:ui.search,type:ui.builderType,color:ui.builderColor,energy:ui.builderEnergy,
  ...data,issues:[...(data.issues||[]),...extra],v2Ready:report.ok
 });
}

function library(){
 if(ui.view==='builder'&&PUBLIC_EDITOR_ONLY)return visualDeckLibrary();
 if(ui.title==='gurren-lagann')return ttgLibrary();
 if(ui.title==='sword-art-online')return saoLibrary();
 if(ui.title==='solo-leveling')return soloLibrary();
 if(ui.title==='mushoku-tensei')return mstLibrary();
 if(ui.title==='rezero')return rezLibrary();
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
 if(ui.selected.source==='hand'){
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
 return `<button class="slot ${c?'occupied':''} ${c&&!c.ready?'rested':''} ${ui.selected?.uid===c?.uid&&c?'selected':''} ${place?'destination':''} ${ui.raidFlow?.target&&ui.raidFlow.target===c?.uid?'raid-base-selected':''} ${ui.raidFlow?.action?.line===line&&ui.raidFlow?.action?.slot===i&&p===game.active?'raid-position-selected':''}" data-slot="${p}|${line}|${i}" data-placement="${placement}" aria-label="${game.players[p].name}的${line==='front'?'前線':'能源線'} ${i+1}${c?`：${d.name}，${c.ready?'激活':'休息'}，${bp(game,c)} BP${damageOf(game,c)===2?'，DAMAGE 2':''}${d.raid&&!c.stack.length?'，普通登場，Raid 框內能力無效':''}`: '，空位'}${place?'，可'+placement:''}">${c?`<span class="slotFace"><img class="art" src="${d.onlineImage||d.image}" onerror="this.onerror=null;this.src='${d.image}'" alt="${d.name}">${c.stack.length?`<span class="slotStack">RAID ${c.stack.length}</span>`:d.raid?'<span class="slotStack raidInactive" title="普通登場：Raid 框內能力無效">RAID 未啟動</span>':''}<span class="slotName">${d.name}</span><span class="slotBp"><b>${d.bp?bp(game,c):'FIELD'}</b>${c.impactTurn===game.turn?'<span class="slotImpact">IMPACT</span>':''}${damageOf(game,c)===2?'<span class="slotImpact" title="未被阻擋的攻擊造成兩點傷害">DAMAGE 2</span>':''}</span></span>`:`<span class="slotIndex">0${i+1}</span>`}</button>`;
}
function lineRow(p,line){const pl=game.players[p];return `<div class="lineGroup"><span class="lineLabel ${line}">${line==='front'?'前線<br>FRONT':'能源<br>ENERGY'}</span><div class="slots">${Array.from({length:4},(_,i)=>slot(p,line,i)).join('')}</div><div class="piles">${line==='front'?`<div class="pile" aria-label="牌堆 ${pl.deck.length} 張">DECK<b>${pl.deck.length}</b></div><div class="pile" aria-label="手牌 ${pl.hand.length} 張">HAND<b>${pl.hand.length}</b></div>`:`<button class="pile button" data-pile="${p}|outside">場外<b>${pl.outside.length}</b></button><button class="pile button" data-pile="${p}|removed">除外<b>${pl.removed.length}</b></button>`}</div></div>`;}
function playerArea(p,opponent){const pl=game.players[p];return `<section class="playerArea ${opponent?'opponent':''}" aria-label="${pl.name}的場地"><header class="playerInfo"><div class="playerName"><span class="avatar ${opponent?'opponent':''}">${p===0?'Ⅰ':'Ⅱ'}</span><div><b>${pl.name}</b>${game.active===p?'<small>目前回合</small>':'<small>等待回合</small>'}</div></div>${resources(p)}</header>${opponent?life(p)+lineRow(p,'energy')+lineRow(p,'front'):lineRow(p,'front')+lineRow(p,'energy')+life(p)}</section>`;}
function handCard(c,{selected=false,inspect=false,playable=false}={}){const d=cardOf(c);return `<button class="handCard ${selected?'selected':''} ${playable?'playable':'unplayable'}" ${inspect?`data-inspect="${d.id}"`:`data-hand="${c.uid}"`} aria-label="${d.name}，${d.energy} 能源，${d.ap} AP${playable?'，可使用':''}"><img src="${d.onlineImage||d.image}" onerror="this.onerror=null;this.src='${d.image}'" alt="${d.name}"><span class="handCost">◆ ${d.energy}</span><span class="handName">${d.name}</span></button>`;}
function selectionBar(){
 const c=selectedCard();if(!c)return '';
 const d=cardOf(c),acts=legalActions(game).filter(a=>a.uid===c.uid),playable=humanTurn()&&!game.pending;
 const normal=acts.filter(a=>a.type==='play'),raids=acts.filter(a=>a.type==='raid');
 const raidCard=ui.selected.source==='hand'&&!!d.raid;
 return `<div class="selectionBar"><b>${d.name} <span class="textMuted">· ${d.id}</span></b>${raidCard&&raids.length?`<button class="btn ${ui.raidFlow?'outline':'primary'}" data-action="normalDeployment" ${!playable?'disabled':''}>普通登場（點格子）</button>`:''}${raidCard&&!raids.length?'<p class="selectionHint">目前無法突襲：需要主要階段、足夠能源與 AP，並且場上要有合法的未突襲底板。仍可在符合費用時普通登場。</p>':''}${normal.some(a=>a.line)&&!ui.raidFlow?'<p class="selectionHint">普通登場：請直接點選場上高亮的前線或能源線位置。</p>':''}${ui.selected.source==='field'&&acts.some(a=>a.type==='move'||a.type==='step')?'<p class="selectionHint">移動階段：直接點選高亮的目標位置。</p>':''}${normal.some(a=>!a.line)?`<button class="btn primary" data-do="${esc(JSON.stringify(normal.find(a=>!a.line)))}" ${!playable?'disabled':''}>使用事件</button>`:''}${raids.length?`<button class="btn ${ui.raidFlow?'primary':''}" data-action="raid" ${!playable?'disabled':''}>${ui.raidFlow?'重新選擇底板':'突襲 ↗'}</button>`:''}${acts.filter(a=>a.type==='ability').map((a,i)=>`<button class="btn primary" data-do="${esc(JSON.stringify(a))}" ${!playable?'disabled':''}>發動能力${acts.filter(a=>a.type==='ability').length>1?' '+(i+1):''}</button>`).join('')}${acts.some(a=>a.type==='handAbility')?`<button class="btn primary" data-do="${esc(JSON.stringify(acts.find(a=>a.type==='handAbility')))}" ${!playable?'disabled':''}>手牌能力：除外區支付並登場</button>`:''}${acts.some(a=>a.type==='attack')?`<button class="btn primary" data-do="${esc(JSON.stringify(acts.find(a=>a.type==='attack')))}" ${!playable?'disabled':''}>宣告攻擊</button>`:''}${acts.filter(a=>a.type==='snipe').map(a=>`<button class="btn outline" data-do="${esc(JSON.stringify(a))}" ${!playable?'disabled':''}>狙擊：${esc(cardOf(locate(game,a.target).card).name)}</button>`).join('')}${ui.selected.source==='field'&&ui.selected.p===gameActor()&&humanTurn()&&c.under?.length?`<button class="btn outline" data-action="showUnder">查看下方裏向卡（${c.under.length}）</button>`:''}<button class="btn" data-inspect="${d.id}">卡片詳情</button><p class="selectionEffect"><span>效果</span>${esc(d.effect)}</p>${raids.length?`<p class="selectionHint">${ui.raidFlow?'突襲操作中：先選底板，再選合法登場位置，確認後才會支付 AP 並結算。':'直接點場上的位置即可普通登場（REST）；需要 Raid 時再按「突襲」。'}</p>`:''}${ui.selected.source==='hand'&&!acts.length?'<p class="selectionHint">目前階段、能源、AP 或事件目標尚不符合出牌條件。</p>':''}</div>`;
}
function raidFlowPanel(){const f=ui.raidFlow;if(!f||!game)return '';const options=raidActions();if(!options.length)return `<div class="raidFlowPanel"><p>目前不符合突襲條件。</p><button class="btn" data-action="cancelRaid">取消突襲</button></div>`;const selected=game.players[game.active].hand.find(c=>c.uid===f.uid);if(!selected)return '';const d=cardOf(selected),base=f.target?locate(game,f.target):null,action=f.action;return `<div class="raidFlowPanel" aria-live="polite"><b>突襲流程 · ${f.step==='base'?'1 / 3 選擇底板':f.step==='position'?'2 / 3 選擇位置':'3 / 3 確認突襲'}</b><p>${esc(d.name)} ${esc(d.identity)} · 能源 ${d.energy} · AP ${d.ap}${base?` · 底板 ${esc(cardOf(base.card).name)}（${base.line==='front'?'前線':'能源線'} ${base.slot+1}）`:''}</p><p>${f.step==='base'?'請點選高亮的合法突襲底板。':f.step==='position'?'請點選高亮的合法登場位置；不能任意移動到其他位置。':`將疊放至 ${action.line==='front'?'前線':'能源線'} ${action.slot+1}，確認後才扣除 AP 並結算登場效果。`}</p><div class="raidFlowActions">${f.step!=='base'?`<button class="btn" data-action="raidBack">返回上一步</button>`:''}${f.step!=='base'?`<button class="btn outline" data-action="raidRestart">重新選擇</button>`:''}<button class="btn" data-action="cancelRaid">取消</button>${f.step==='confirm'?`<button class="btn primary" data-action="raidConfirm">確認突襲</button>`:''}</div></div>`;}
function phaseMessage(){return {start:'通常抽牌已完成。可花 1 AP 額外抽牌一次。',move:'選擇能源線角色，再點選前線位置移動。',main:'選手牌後，點亮起的位置出牌；也可發動場上能力。',attack:game.players[game.active].turnCount===1?'自己的首回合無法攻擊，可以結束回合。':'選擇 ACTIVE 前線角色宣告攻擊。'}[game.phase]||'';}
function triggerResultLabel(entry){
 return ({pending:'等待結算',none:'沒有 Trigger',skipped:'選擇不發動',activated:'已發動',get:'已加入手牌',raid:'已進行 Raid'})[entry.outcome]||'已翻開';
}
function publicTriggerEntries(){
 const entries=[...(game?.triggerHistory||[])];
 // Saved games from before public history existed may already be waiting on
 // a face-up life card. Only use revealed cards, never hidden life or hands.
 for(const {p,card} of game?.revealed||[]){
  if(!entries.some(x=>x.uid===card.uid&&x.player===p&&x.turn===game.turn)){
   const d=cardOf(card);entries.push({uid:card.uid,player:p,turn:game.turn,cardId:card.cardId,trigger:d.trigger||null,outcome:d.trigger?'pending':'none'});
  }
 }
 return entries;
}
function publicTriggerCard(entry){
 const d=BY_ID[entry.cardId];if(!d)return '';
 const owner=esc(game.players[entry.player]?.name||('玩家'+(entry.player+1)));
 const effect=esc(d.triggerEffect||'');
 const label=entry.trigger?esc(TRIGGER_NAMES[entry.trigger]||entry.trigger.toUpperCase())+' Trigger':'無 Trigger';
 return `<article class="publicTriggerCard" data-trigger-card="${esc(entry.cardId)}"><img src="${d.onlineImage||d.image}" onerror="this.onerror=null;this.src='${d.image}'" alt="${esc(d.name)} 公開生命卡圖"><div class="publicTriggerDetails"><small>${owner} · 第 ${entry.turn} 回合生命翻開</small><b>${esc(d.name)} <span>${esc(d.identity)}</span></b><strong>${label}</strong><span>${esc(triggerResultLabel(entry))}</span>${effect?`<p>${effect}</p>`:''}</div></article>`;
}
function publicTriggerPanel(){
 const recent=publicTriggerEntries().slice(-3).reverse();
 if(!recent.length)return '';
 return `<section class="publicTriggerPanel" aria-label="公開生命 Trigger 翻牌" aria-live="polite"><header><b>生命區翻牌 · 公開資訊</b><button type="button" class="btn small" data-action="triggerHistory">查看翻牌紀錄</button></header><div class="publicTriggerCards">${recent.map(publicTriggerCard).join('')}</div></section>`;
}
function arena(){
 if(!game)return `<section class="panel emptyResult">還沒有對局。<br><button class="btn primary" style="margin-top:15px" data-action="start">開始練習</button></section>`;
 const p=game.mode==='solo'?0:gameActor(),opp=1-p,pl=game.players[p],legal=legalActions(game),done=game.status==='finished';
 const nextLabel={start:'進入移動階段',move:'進入主要階段',main:'進入攻擊階段',attack:'結束回合'}[game.phase];
 return `<header class="matchHeader"><h1>BLEACH <span class="textMuted" style="font-size:11px;font-weight:400">/ ${game.mode==='solo'?'電腦練習':'同裝置雙人'}</span></h1><div class="matchControls"><button class="btn small" data-action="hint" ${!humanTurn()||done?'disabled':''}>練習提示</button><button class="btn small" data-action="showLog">對局紀錄</button><button class="btn small danger" data-action="newMatch">新對局</button></div></header><div class="matchLayout"><div class="arena">${done?`<div class="resultBanner"><span class="eyebrow">MATCH COMPLETE</span><h2>${game.mode==='solo'?(game.winner===0?'你獲勝了！':'練習對手獲勝'):`${game.players[game.winner].name}獲勝`}</h2><p>對局已完成，共 ${game.turn} 個回合。可以查看紀錄，或再練習一場。</p><button class="btn primary" data-action="start">再來一局 ↗</button><button class="btn" data-action="showLog">查看對局紀錄</button></div>`:''}${game.status==='mulligan'?`<div class="mulliganHeader"><h2>${botTurn()?'練習對手正在確認起手':'確認你的起手'}</h2><p>先保留這 7 張，或完整重抽一次。生命卡會在双方確認後放置。</p></div><div class="mulliganHand" style="${handStyle(pl.hand.length)}">${!botTurn()&&!ui.handoff?pl.hand.map(c=>handCard(c,{inspect:true,playable:true})).join(''):'<div class="hiddenHand">正在準備起手…</div>'}</div><div class="phaseAction"><p>${pl.redrawn?'已使用本局的重抽機會。':'原手牌先擱旁，抽新 7 張後再混回牌堆。'}</p><div style="display:flex;gap:8px"><button class="btn" data-do="${esc(JSON.stringify({type:'redraw'}))}" ${!humanTurn()||pl.redrawn?'disabled':''}>完整重抽</button><button class="btn primary" data-do="${esc(JSON.stringify({type:'keep'}))}" ${!humanTurn()?'disabled':''}>保留起手</button></div></div>`:`<div class="phaseBar" aria-label="回合階段">${['start','move','main','attack','end'].map((phase,i)=>`<span class="${game.phase===phase?'current':''}">${i+1} ${PHASE_NAMES[phase].replace('階段','')}</span>`).join('')}</div>${publicTriggerPanel()}${playerArea(opp,true)}<div class="centerLine">${done?'MATCH COMPLETE':`TURN ${game.turn} · ${PHASE_NAMES[game.phase]}`}</div>${playerArea(p,false)}<section class="handArea"><header class="handTitle"><span>${game.mode==='hotseat'?pl.name+'的':'你的'}手牌 · ${pl.hand.length} 張</span>${game.phase==='start'&&!done?`<button class="btn small" data-do="${esc(JSON.stringify({type:'extraDraw'}))}" ${!humanTurn()||!legal.some(a=>a.type==='extraDraw')?'disabled':''}>額外抽牌 · 1 AP</button>`:'<span>REST 仍可產生能源</span>'}</header>${selectionBar()}${raidFlowPanel()}${ui.handoff?'<div class="hiddenHand">手牌已隱藏，請交給下一位玩家。</div>':`<div class="hand" style="${handStyle(pl.hand.length)}">${pl.hand.map(c=>handCard(c,{selected:c.uid===ui.selected?.uid,playable:legal.some(a=>(a.type==='play'||a.type==='raid'||a.type==='handAbility')&&a.uid===c.uid)&&humanTurn()})).join('')}${!pl.hand.length?'<span class="textMuted" style="font-size:11px">目前沒有手牌</span>':''}</div>`}</section>${!done?`<div class="phaseAction"><p class="${botTurn()?'thinking':''}">${botTurn()?'<i class="spinner"></i>對手正在操作…':game.pending?'請完成目前的效果選擇。':phaseMessage()}</p><button class="btn primary" data-do="${esc(JSON.stringify({type:'next'}))}" ${!humanTurn()||game.pending||!legal.some(a=>a.type==='next')?'disabled':''}>${nextLabel||'繼續'} →</button></div>`:''}`} ${ui.handoff&&!done?`<div class="handoff"><div class="handoffInner"><span class="avatar">${gameActor()===0?'Ⅰ':'Ⅱ'}</span><h2>輪到${game.players[gameActor()].name}操作</h2><p>請把裝置交給這位玩家。<br>確認後才會顯示手牌與效果選擇。</p><button class="btn primary" data-action="handoff">我是${game.players[gameActor()].name}，開始操作</button></div></div>`:''}</div></div>`;
}
function logList(){return `<div class="logList">${[...game.log].reverse().map(x=>`<div class="logItem ${x.kind}"><small>${x.turn?'T'+x.turn:'準備'}</small>${esc(x.message)}</div>`).join('')}</div>`;}
function detail(c){const triggerText={draw:'可抽 1 張牌。',get:'可將翻開的卡加入手牌。',active:'可讓一個己方角色 ACTIVE，本回合 BP +3000。',special:'可退場一個敵方前線角色，無 BP 上限。',final:'生命歸零時，可從牌堆頂補 1 張生命。',raid:'可加入手牌，或在滿足能源時免費 Raid。'};return `<img class="detailImage" src="${catalogVariant(c).onlineImage||catalogVariant(c).image}" onerror="this.onerror=null;this.src='${catalogVariant(c).image}'" alt="${c.name}"><h3>${c.name}</h3><div class="detailNum">${catalogVariant(c).number} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]}</div><span class="pill purple">${c.tag}</span><div class="statGrid"><div><span>能源需求</span><b>${c.energy}</b></div><div><span>AP</span><b>${c.ap}</b></div><div><span>BP</span><b>${c.bp||'—'}</b></div></div><div class="detailEffect">${esc(c.effect)}</div><span class="autoStatus ${c.auto?'ready':'pending'}">${c.auto?'可自動結算':'待補自動判定：可加入牌組，尚不能用於自動對戰'}</span>${c.uncertainty?`<p class="note">${esc(c.uncertainty)}</p>`:''}<div class="detailTrigger">${c.trigger?`<b>${TRIGGER_NAMES[c.trigger]} Trigger</b><br>${esc(c.triggerEffect||triggerText[c.trigger])}`:'沒有生命 Trigger'}</div><p class="note"><a href="${catalogVariant(c).source}" target="_blank" rel="noopener">查看官方卡片與裁定 ↗</a></p>`;}
function pendingModal(){
 const q=game.pending;const allowed=q.allowedCounts?q.allowedCounts.includes(ui.choiceIds.length):ui.choiceIds.length>=q.min&&ui.choiceIds.length<=q.max;
 const peek=q.effect?.kind==='peekChoice'&&q.effect.cards?.length===1?game.players[q.effect.rule?.deckOwner==='opponent'?1-q.player:q.player].deck.find(c=>c.uid===q.effect.cards[0]):null;
 const revealed=peek?cardOf(peek):null;
 const privatelyInspected=['peekMill','peekOrder','peekNoMill'].includes(q.effect?.kind);
 const peekIds=privatelyInspected?(q.effect.kind==='peekOrder'?q.effect.uids:q.effect.cards):[];
 const lookedAt=peekIds.map(uid=>game.players[q.player].deck.find(c=>c.uid===uid)).filter(Boolean).map(cardOf);
 const art=c=>`<div class="peekPreview" aria-label="操作者私下查看牌庫頂卡片"><img src="${c.onlineImage||c.image}" onerror="this.onerror=null;this.src='${c.image}'" alt="${esc(c.name)}卡圖"><div><b>${esc(c.name)}</b><small>${esc(c.identity)} · ◆ ${c.energy} · ${c.bp||0} BP</small><p>${esc(c.effect)}</p></div></div>`;
 const peekPreview=[...(revealed?[revealed]:[]),...lookedAt].map(art).join('');
 const publicTrigger=q.effect?.kind==='triggerChoice'?publicTriggerEntries().findLast(x=>x.uid===q.effect.uid&&x.player===q.player):null;
 const triggerPreview=publicTrigger?`<section class="currentPublicTrigger" aria-label="目前翻開的公開生命卡"><h3>生命 Trigger 公開翻牌</h3>${publicTriggerCard(publicTrigger)}</section>`:'';

 const privateNote=privatelyInspected?'<p class="note">此為私人查看，不向對手展示牌庫頂。只有實際送到場外的卡片才會成為公開資訊。</p>':'';
 return `<div class="modalBackdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="pendingTitle"><span class="eyebrow">${game.players[q.player].name} · EFFECT RESOLUTION</span><h2 id="pendingTitle" style="margin-top:8px">${q.title}</h2><p>${botTurn()?'練習對手正在選擇…':q.max>1?`選擇 ${q.allowedCounts?.includes(0)?'0 或 ':''}${q.max} 張卡片，再確認結算。`:q.min===0?'可選擇一個目標，或不選擇任何目標。':'選擇一個操作，再確認結算。'}</p>${privateNote}${peekPreview}${triggerPreview}<div class="choiceGrid">${q.choices.map(c=>`<button class="choiceCard ${ui.choiceIds.includes(c.id)?'selected':''}" data-choice="${esc(c.id)}" ${botTurn()?'disabled':''} aria-pressed="${ui.choiceIds.includes(c.id)}">${c.cardId?`<img src="${BY_ID[c.cardId].onlineImage||BY_ID[c.cardId].image}" onerror="this.onerror=null;this.src='${BY_ID[c.cardId].image}'" alt="${BY_ID[c.cardId].name}">`:''}<span>${esc(c.label)}</span>${c.cardId||c.where?`<small>${c.cardId||''}${c.where?' · '+(c.where==='front'?'前線':'能源線'):''}</small>`:''}</button>`).join('')}</div><div class="modalActions"><span>已選 ${ui.choiceIds.length}${q.max>1?' / '+q.max:''}</span>${q.min===0?`<button class="btn" data-action="skipChoice" ${botTurn()?'disabled':''}>${q.max>1?'不除外':'不選擇'}</button>`:''}<button class="btn primary" data-action="confirmChoice" ${!allowed||botTurn()?'disabled':''}>確認結算 →</button></div></section></div>`;
}
function privatePeekCurtain(){
 const name=esc(game.players[game.pending.player].name);
 return `<div class="modalBackdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true"><h2>私人查看牌庫頂</h2><p>此效果沒有要求公開查看的卡片。請把裝置交給${name}，確保對手看不到畫面後，再由操作者點擊查看。</p><div class="modalActions"><button class="btn primary" data-action="showPrivatePeek">${name}：私密查看</button></div></section></div>`;
}
function modalContent(){

 if(game?.pending&&ui.view==='arena'&&!ui.handoff&&!ui.modal){
  // Never render the AI's private effect choices to the human while it is thinking.
  if(botTurn())return '';
  if(game.mode==='hotseat'&&['peekMill','peekOrder','peekNoMill'].includes(game.pending.effect?.kind)&&!ui.privatePeekOpen)return privatePeekCurtain();
  return pendingModal();
 }
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
 if(m.type==='triggerHistory'){title='公開生命翻牌紀錄（最近 60 次）';const items=publicTriggerEntries().reverse();body=items.length?`<div class="publicTriggerHistory">${items.map(publicTriggerCard).join('')}</div>`:'<p class="note">尚無生命卡翻開。</p>';}
 if(m.type==='log'){title='對局紀錄';body=logList();}
 if(m.type==='visualExport'){title='複製牌組清單';body=`<p class="note">以下清單包含你目前選擇的卡號及張數。</p><textarea class="deckCode" id="deckCode" aria-label="牌組清單">${esc(m.text)}</textarea>`;actions='<button class="btn primary" data-action="copyDeck">複製清單</button>';}
  if(m.type==='deckCode'){title='匯入／複製牌組';body=`<p>每行使用「張數 卡號」，例如 <code>4 UA08ST/BLC-1-104</code>。也接受 BLC 完整卡號或 JSON；原 UA08ST 牌組的三位卡號仍可匯入。匯入清單須正好 50 張，且每卡最多 4 張。</p><textarea class="deckCode" id="deckCode" aria-label="牌組代碼">${esc(formatDeck(deck,deckName))}</textarea>`;actions='<button class="btn" data-action="copyDeck">複製清單</button><button class="btn primary" data-action="importDeck">匯入牌組</button>'; }
 if(m.type==='newMatch'){title='開始新的對局';body='<p>目前的對局會被新對局取代。使用現在的牌組與先後手設定。</p>';actions='<button class="btn" data-action="closeModal">保留目前對局</button><button class="btn primary" data-action="start">開始新對局</button>';}
 return `<div class="modalBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modalHead"><h2 id="modalTitle">${title}</h2><button class="closeButton" data-action="closeModal" aria-label="關閉視窗">×</button></div>${body}${actions?`<div class="modalActions">${actions}</div>`:''}</section></div>`;
}
function ttgLibrary(){
 const entries=TTG_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.search||[c.name,c.number,c.effect].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase()))));
 const pending=TTG_PENDING_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.search||[c.name,c.nameZh,c.number,c.effect].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase()))));
 const issues=ttgBetaDeckIssues(ttgDeck),count=ttgCount(ttgDeck);
 return `<header class="pageHeading"><div><h1>天元突破 · 牌組構築</h1><p>UA56BT · ${TTG_CARDS.length}/81 種可編輯 · ${TTG_PENDING_CARDS.length} 種資料待核對</p></div><button class="btn" data-view="lobby">返回大廳</button></header>
 <div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div>
 <div class="supportNote"><b>天元突破 81/81 張已接入共用對戰入口（Beta）</b><span>綠色、紅色或自訂的合法 50 張牌組均可透過下方按鈕與 AI 對戰；卡片效果交由天元突破獨立判定核心處理。現在透過共用對戰入口操作，專屬效果仍由天元突破 Beta 核心結算；官方逐卡效果／FAQ 仍待全面驗收。</span><span>${esc(TTG_ART_CREDIT)} · <a href="${esc(TTG_RUGIA_CARD_SEARCH)}" target="_blank" rel="noopener noreferrer">查看路基亞卡表 ↗</a>。圖片由路基亞外部讀取，載入失敗時顯示佔位圖。</span></div>
 <section class='panel betaDifficultyBuilder'><b>Beta AI 對手設定</b>${betaDifficultySelect(ui.aiDifficulty)}</section>
 <div class="deckEditor"><label>天元突破牌組名稱<input id="ttgDeckName" maxlength="40" value="${esc(ttgName)}"></label><label>已儲存的天元突破牌組<select id="ttgSavedSelect"><option value="">選擇要載入的草稿</option>${ttgSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="ttgSave">儲存天元突破草稿</button><button class="btn outline" data-action="ttgNew">新建空白草稿</button><button class="btn primary" data-action="ttgBetaStartGreen">綠色 50 張 Beta AI 對戰</button><button class="btn primary" data-action="ttgBetaStartRed">紅色 50 張 Beta AI 對戰</button><button class="btn" data-action="ttgBetaStartDeck" ${ttgBetaDeckIssues(ttgDeck).length?'disabled':''}>使用目前 50 張牌組 Beta 對戰</button></div><span class="deckSaveStatus">已儲存 ${ttgSaved.length} 副天元突破草稿</span></div>
 <div class="toolbar"><input id="search" type="search" placeholder="搜尋天元突破卡號、名稱或效果…" value="${esc(ui.search)}"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}">${n}</button>`).join('')}</div></div>
 <div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="查看官方卡片 ${esc(c.number)}">${ttgArtImg(c)}</button><div class="catalogInfo"><strong>${esc(c.nameZh||c.name)}</strong><div class="sub">${esc(c.nameJa||c.name)} · ${esc(c.number)} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]}</div><span class="autoStatus ${TTG_BETA_IDS.includes(c.id)?'ready':'pending'}">${TTG_BETA_IDS.includes(c.id)?'✓ Beta 自動判定已接入 · 官方驗收中':'此卡尚未接入自動判定'}</span><div class="catalogMeta"><span>◆ ${c.energy} 能源</span><span>AP ${c.ap}</span><span>${c.bp||'—'} BP</span><span>產能 ${c.gen}</span></div><p class="catalogEffect">${esc(c.effect)}</p><a class="subtleButton" href="${esc(c.source)}" target="_blank" rel="noopener noreferrer" aria-label="在官方網站查看${esc(c.number)}卡圖及原文">官方卡圖及日文效果 ↗</a><div class="countPicker"><button data-ttg-count="${c.id}" data-delta="-1" ${!ttgDeck[c.id]?'disabled':''}>−</button><b>${ttgDeck[c.id]||0}</b><button data-ttg-count="${c.id}" data-delta="1" ${ttgDeck[c.id]>=4?'disabled':''}>+</button></div></div></article>`).join('')}${pending.map(c=>`<article class="catalogCard"><a class="catalogArt" href="${esc(c.source)}" target="_blank" rel="noopener" aria-label="查看官方卡號 ${esc(c.number)}"><img src="assets/mark.svg" alt="${esc(c.nameZh)} 佔位圖" loading="lazy"></a><div class="catalogInfo"><strong>${esc(c.nameZh)}</strong><div class="sub">${esc(c.nameJa)} · ${esc(c.number)} · ${esc(c.rarity)} · ${COLOR_NAMES[c.color]}</div><span class="autoStatus pending">資料待核對・不可放入牌組${c.rarityDisputed?"（稀有度來源不一致）":""}</span><div class="catalogMeta"><span>能源 —</span><span>AP —</span><span>BP —</span><span>產能 —</span></div><p class="catalogEffect">${esc(c.effect||'尚未取得可核實的完整效果')}</p></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>天元突破牌組概覽</h3><div class="deckTotal">${count} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,count*2)}%"></i></div><div class="validation ${issues.length?'invalid':'valid'}">${issues.length?issues.map(esc).join('<br>'):'✓ 50 張 Beta 牌組合法，可進行試玩。'}</div><p class="note">✓ 81 張已接入獨立 Beta 自動判定與 AI 對戰；卡面「auto:false」僅表示未完成正式共用引擎與逐卡官方規則驗收，不影響下方 Beta 試玩。${ttgBetaDeckIssues(ttgDeck).length?'目前牌組無法試玩：'+esc(ttgBetaDeckIssues(ttgDeck).join('；')):'這副牌組可進入 Beta 測試。'}</p><details class="deckContents"><summary>已選卡片</summary>${TTG_CARDS.filter(c=>ttgDeck[c.id]).map(c=>`<div class="deckContentRow">${esc(c.name)} · ×${ttgDeck[c.id]}</div>`).join('')||'<p class="note">尚未選擇卡片</p>'}</details></aside></div>`;
}
function soloLibrary(){
 const entries=SOLO_LEVELING_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.search||[c.name,c.number,c.effect].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase()))));
 const count=Object.values(soloDeck).reduce((a,b)=>a+b,0);
 return `<header class="pageHeading"><div><h1>我獨自升級 · 牌組構築</h1><p>UA51BT / SLG-1 · 已核對 ${SOLO_LEVELING_CARDS.length} / 80 種一般效果卡</p></div><button class="btn" data-view="lobby">返回大廳</button></header>
 <div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div>
 <div class="supportNote"><b>我獨自升級 80/80 張已接入共用對戰入口（Beta）</b><span>80/80 張已接上共用對戰入口與獨立 Beta 判定核心；可用自己的合法50張單色牌組進行 AI 對戰。部分跨卡時序及官方FAQ仍在逐卡驗收中，不能將 Beta 測試當成正式全效果認證。</span><span>${esc(SOLO_ART_CREDIT)} · <a href="${esc(SOLO_RUGIA_SEARCH)}" target="_blank" rel="noopener noreferrer">查看路基亞《我獨自升級》卡表 ↗</a>。圖片由第三方載入，若載入失敗會顯示佔位圖。</span></div>
 <section class='panel betaDifficultyBuilder'><b>Beta AI 對手設定</b>${betaDifficultySelect(ui.aiDifficulty)}</section>
 <div class="deckEditor"><label>牌組名稱<input id="soloDeckName" maxlength="40" value="${esc(soloName)}"></label><label>已儲存牌組<select id="soloSavedSelect"><option value="">載入草稿</option>${soloSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="soloSave">儲存草稿</button><button class="btn outline" data-action="soloNew">新建草稿</button><button class="btn outline" data-action="soloPreset">載入影之軍團示範草稿</button><button class="btn primary" data-action="soloTrainingStart">綠色限定卡組試玩</button><button class="btn primary" data-action="soloTrainingStartShadow">紫色影之軍團試玩</button><button class="btn" data-action="soloTrainingStartCustom" ${soloTrainingDeckIssues(soloDeck).length?"disabled":""}>使用目前50張牌組 Beta AI 對戰</button></div></div>
 <div class="toolbar"><input id="search" type="search" placeholder="搜尋 SLG 卡號、名稱與效果…" value="${esc(ui.search)}"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}">${n}</button>`).join('')}</div></div>
 <div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="開啟官方卡片 ${esc(c.number)}">${soloArtImg(c)}</button><div class="catalogInfo"><strong>${esc(c.name)}</strong><div class="sub">${esc(c.number)} · ${esc(TYPE_NAMES[c.type]||c.type)} · ${esc(COLOR_NAMES[c.color])}</div><span class="autoStatus ${SOLO_MATCH_SUPPORTED.includes(c.id)?"ready":"pending"}">${SOLO_MATCH_SUPPORTED.includes(c.id)?"✓ Beta 自動判定已接入 · 官方驗收中":"尚未接入自動判定"}</span><div class="catalogMeta"><span>◆ ${c.energy} 能源</span><span>AP ${c.ap}</span><span>BP ${c.bp??'—'}</span><span>產能 ${c.gen}</span></div><p class="catalogEffect">${esc(c.effect)}</p><a class="subtleButton" href="${esc(c.source)}" target="_blank" rel="noopener noreferrer" aria-label="在官方網站查看${esc(c.number)}卡圖及原文">官方卡圖及日文效果 ↗</a><div class="countPicker"><button data-solo-count="${c.id}" data-delta="-1" ${!soloDeck[c.id]?'disabled':''}>−</button><b>${soloDeck[c.id]||0}</b><button data-solo-count="${c.id}" data-delta="1" ${soloDeck[c.id]>=c.maxCopies?'disabled':''}>+</button></div></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>我獨自升級牌組</h3><div class="deckTotal">${count} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,count*2)}%"></i></div><p class="note">${esc(soloDeckIssues(soloDeck).join('；'))}。${soloTrainingDeckIssues(soloDeck).length?'自訂牌組 Beta 條件：'+esc(soloTrainingDeckIssues(soloDeck).join('；')):'這副牌組已符合 Beta AI 試玩條件。'}（完整官方跨卡驗證仍未完成）</p><details class="deckContents"><summary>已選卡片</summary>${SOLO_LEVELING_CARDS.filter(c=>soloDeck[c.id]).map(c=>`<div class="deckContentRow">${esc(c.name)} · ×${soloDeck[c.id]}</div>`).join('')||'<p class="note">尚未選擇卡片</p>'}</details></aside></div>`;
}
function mstLibrary(){
 const entries=MST_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.search||[c.name,c.number,c.effect].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase()))));
 const issues=mstDeckIssues(mstDeck),count=mstCount(mstDeck);
 return `<header class="pageHeading"><div><h1>無職轉生 · 牌組構築</h1><p>UA54BT · 共 ${MST_CARDS.length} 種一般卡；一般卡已核實 ${MST_CARDS.filter(c=>c.verified).length} 種</p></div><button class="btn" data-view="lobby">返回大廳</button></header>
 <div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div>
 <div class="supportNote"><b>無職轉生尚未開放對戰</b><span>未核實卡號使用資訊佔位圖，數值與效果保持空白。你可以先編輯與儲存這個作品的獨立牌組草稿，BLEACH 的牌組與記錄不受影響。缺少的卡片不會被虛構補齊。</span></div>
 <div class="deckEditor"><label>無職轉生牌組名稱<input id="mstDeckName" maxlength="40" value="${esc(mstName)}"></label><label>已儲存的無職轉生牌組<select id="mstSavedSelect"><option value="">選擇要載入的草稿</option>${mstSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="mstSave">儲存無職轉生草稿</button><button class="btn outline" data-action="mstNew">新建空白草稿</button></div><span class="deckSaveStatus">已儲存 ${mstSaved.length} 副無職轉生草稿</span></div>
 <div class="toolbar"><input id="search" type="search" placeholder="搜尋無職轉生卡號、名稱或效果…" value="${esc(ui.search)}"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}">${n}</button>`).join('')}</div></div>
 <div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="查看官方卡片 ${esc(c.number)}"><img src="assets/mark.svg" alt="${esc(c.name)} 佔位圖" loading="lazy"></button><div class="catalogInfo"><strong>${esc(c.name)}</strong><div class="sub">${esc(c.number)} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]||'待核對'}</div><span class="autoStatus pending">尚未完成自動判定</span><div class="catalogMeta"><span>◆ ${c.energy??'—'} 能源</span><span>${c.bp||'—'} BP</span></div><p class="catalogEffect">${esc(c.effect)}</p><div class="countPicker"><button data-mst-count="${c.id}" data-delta="-1" ${!mstDeck[c.id]?'disabled':''}>−</button><b>${mstDeck[c.id]||0}</b><button data-mst-count="${c.id}" data-delta="1" ${!c.verified||mstDeck[c.id]>=4?'disabled':''}>+</button></div></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>無職轉生牌組概覽</h3><div class="deckTotal">${count} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,count*2)}%"></i></div><div class="validation invalid">${issues.map(esc).join('<br>')}</div><p class="note">目前允許儲存未滿 50 張的草稿。完整卡表與自動判定完成前，不開放使用此牌組進行 AI 對戰。</p><details class="deckContents"><summary>已選卡片</summary>${MST_CARDS.filter(c=>mstDeck[c.id]).map(c=>`<div class="deckContentRow">${esc(c.name)} · ×${mstDeck[c.id]}</div>`).join('')||'<p class="note">尚未選擇卡片</p>'}</details></aside></div>`;
}
function rezLibrary(){
 const q=ui.search.toLowerCase();
 const entries=REZERO_ALL_CARDS.filter(c=>(ui.filter==='all'||c.type===ui.filter)&&(!ui.color||ui.color==='all'||c.color===ui.color)&&[c.name,c.nameJa,c.number,c.effect,c.effectJa,c.ruby,...(c.traits||[]),...(c.faq||[])].some(t=>String(t||'').toLowerCase().includes(q)));
 const issues=rezDeckIssues(rezDeck),count=rezCount(rezDeck);
 const printedBp=c=>c.bp==null?'—':String(c.bp)+(c.bpMark||'');
 const printedGen=c=>String(c.gen)+(c.genMark||'');
 return `<header class="pageHeading"><div><h1>Re:從零開始的異世界生活 · Vol.2 ＋ 第一彈</h1><p>UA40BT／UA40ST 113 種＋EX17BT 73 種，共 ${REZERO_ALL_CARDS.length} 種一般卡。AP 卡不計入主牌組。</p></div><button class="btn" data-view="lobby">返回大廳</button></header>
 <div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div>
 <div class="supportNote"><b>Re:從零 Vol.2 尚未開放對戰</b><span>目前第一彈 113 張、Vol.2 73 張已收錄並可構築草稿。繁中效果為練習譯文；第一彈共用引擎完整移植、FAQ 驗收以及 Vol.2 部分效果仍分開驗證。這裡不會把登錄數當成正式對戰認證。異圖和 AP 卡不另佔主牌組位置。</span></div>
 <div class="deckEditor"><label>牌組名稱<input id="rezDeckName" maxlength="40" value="${esc(rezName)}"></label><label>已儲存牌組<select id="rezSavedSelect"><option value="">選擇草稿</option>${rezSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="rezSave">儲存 Re:Zero 草稿</button><button class="btn outline" data-action="rezNew">新建空白草稿</button></div><span class="deckSaveStatus">已儲存 ${rezSaved.length} 副草稿</span></div>
 <div class="toolbar"><input id="search" type="search" placeholder="搜尋卡號、名稱、效果或 FAQ…" value="${esc(ui.search)}"><div class="filter">${[['all','全部'],['character','角色'],['event','事件'],['field','場域']].map(([v,n])=>`<button data-filter="${v}" class="${ui.filter===v?'active':''}">${n}</button>`).join('')}</div><div class="filter">${[['all','全色'],['yellow','黃'],['blue','藍'],['purple','紫'],['green','綠']].map(([v,n])=>`<button data-rez-color="${v}" class="${(ui.color||'all')===v?'active':''}">${n}</button>`).join('')}</div></div>
 <div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="查看官方卡片 ${esc(c.number)}"><img src="${esc(c.image)}" alt="${esc(c.nameJa)} 官方卡圖" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='assets/mark.svg'"></button><div class="catalogInfo"><strong>${esc(c.name)}</strong><div class="sub">${esc(c.nameJa)} · ${esc(c.number)} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]} · ${esc(c.rarity)} · 特徵 ${esc(c.traits.join('、')||'—')} · ${c.trigger?TRIGGER_NAMES[c.trigger]+' Trigger':'無 Trigger'}${(c.aliases||[]).length?` · 異圖 ${c.aliases.length}`:''}</div><span class="autoStatus pending">尚未完成自動判定</span><div class="catalogMeta"><span>◆ ${c.energy} 能源</span><span>AP ${c.ap}</span><span>BP ${printedBp(c)}</span><span>產能 ${printedGen(c)}</span></div><p class="catalogEffect">${esc(c.effect)}</p>${c.note?`<p class="note">${esc(c.note)}</p>`:''}${(c.faq||[]).length?`<p class="note">官方 FAQ ${esc(c.faq.join('、'))}</p>`:''}<details><summary>官方日文原文</summary><p class="catalogEffect">${esc(c.effectJa)}</p>${c.triggerTextJa?`<p class="catalogEffect">觸發 ${esc(c.triggerTextJa)}</p>`:''}</details><a class="subtleButton" href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">官方卡頁 ↗</a><div class="countPicker"><button data-rez-count="${c.id}" data-delta="-1" ${!rezDeck[c.id]?'disabled':''}>−</button><b>${rezDeck[c.id]||0}</b><button data-rez-count="${c.id}" data-delta="1" ${(rezDeck[c.id]||0)>=4?'disabled':''}>+</button></div></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>Re:Zero Vol.2 牌組</h3><div class="deckTotal">${count} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,count*2)}%"></i></div><div class="validation invalid">${issues.map(esc).join('<br>')}</div><p class="note">可以儲存未滿 50 張的草稿。效果自動判定完成前，不能用這副牌開始對戰。</p><details class="deckContents"><summary>已選卡片</summary>${REZERO_ALL_CARDS.filter(c=>rezDeck[c.id]).map(c=>`<div class="deckContentRow">${esc(c.name)} · ×${rezDeck[c.id]}</div>`).join('')||'<p class="note">尚未選擇卡片</p>'}</details></aside></div>`;
}
function saoLibrary(){
 const entries=SAO_CARDS.filter(c=>(ui.saoSet==='all'||c.sets.includes(ui.saoSet))&&(ui.filter==='all'||c.type===ui.filter)&&[c.name,c.nameJa,c.number,c.effect,c.effectJa,...(c.traits||[])].some(t=>String(t||'').toLowerCase().includes(ui.search.toLowerCase())));
 const total=Object.values(saoDeck).reduce((n,x)=>n+x,0),issues=saoDeckIssues(saoDeck);
 return `<div class="titlePicker" role="group" aria-label="選擇作品">${TITLES.map(t=>`<button type="button" data-title="${t.id}" aria-pressed="${ui.title===t.id}" class="btn ${ui.title===t.id?'primary':'outline'}">${esc(t.label)} · ${t.cards.length} 種</button>`).join('')}</div><header class="pageHeading"><div><h1>刀劍神域 · 牌組編輯</h1><p>UA15ST／UA15BT／EX08BT／已確認官方特典 · ${SAO_CARDS.length} 種不重複一般卡號</p></div></header><div class="supportNote"><b>刀劍神域尚未開放對戰</b><span>目前只收錄已核對的卡片；未驗證的卡片不會虛構，也不會混進 BLEACH 或天元突破的牌組。</span></div><div class="deckEditor"><label>牌組名稱<input id="saoDeckName" maxlength="40" value="${esc(saoName)}"></label><label>已儲存牌組<select id="saoSavedSelect"><option value="">選擇草稿</option>${saoSaved.map((d,i)=>`<option value="${i}">${esc(d.name)}</option>`).join('')}</select></label><div class="deckEditorActions"><button class="btn primary" data-action="saoSave">儲存刀劍神域草稿</button><button class="btn outline" data-action="saoNew">新建空白草稿</button></div></div><div class="toolbar"><input id="search" type="search" placeholder="搜尋刀劍神域卡號、名稱、效果…" value="${esc(ui.search)}"><select id="saoSetFilter" aria-label="依產品篩選"><option value="all">全部已收錄卡片</option>${[["UA15ST","起始牌組 UA15ST"],["UA15BT","補充包 UA15BT"],["EX08BT","Vol.2 EX08BT"],["UAPR","UAPR 特典"]].map(([key,label])=>`<option value="${key}" ${ui.saoSet===key?"selected":""}>${label}</option>`).join("")}</select></div><div class="libraryLayout"><div class="cardGrid">${entries.map(c=>`<article class="catalogCard"><button class="catalogArt" data-inspect="${c.id}" aria-label="查看 ${esc(c.number)}"><img src="${esc(c.image||'assets/mark.svg')}" onerror="this.onerror=null;this.src='assets/mark.svg'" alt="${esc(c.nameJa)} 官方卡圖" loading="lazy"></button><div class="catalogInfo"><strong>${esc(c.name)}</strong><div class="sub">${esc(c.nameJa)} · ${esc(c.number)} · ${TYPE_NAMES[c.type]} · ${COLOR_NAMES[c.color]} · ${c.rarity} · 特徵 ${esc(c.traits?.join('、')||'—')} · ${c.trigger?TRIGGER_NAMES[c.trigger]+' Trigger':'無 Trigger'}${c.sets.length>1?` · 再錄於${c.sets.join("、")}`:""}</div><span class="autoStatus pending">${c.engineImplemented?"基礎效果已有測試（對戰仍未開放）":"尚未完成自動判定"}</span><div class="catalogMeta"><span>◆ ${c.energy} 能源</span><span>${c.ap} AP</span><span>${c.bpPrinted||c.bp} BP</span><span>產能 ${c.gen}</span></div><p class="catalogEffect">${esc(c.effect)}</p>${c.effectJa&&c.effectJa!==c.effect?`<details><summary>官方日文原文</summary><p class="catalogEffect">${esc(c.effectJa)}</p></details>`:""}<div class="countPicker"><button data-sao-count="${c.id}" data-delta="-1" ${!saoDeck[c.id]?'disabled':''}>−</button><b>${saoDeck[c.id]||0}</b><button data-sao-count="${c.id}" data-delta="1" ${saoDeck[c.id]>=4?'disabled':''}>+</button></div></div></article>`).join('')}</div><aside class="panel deckSummary"><h3>刀劍神域牌組</h3><div class="deckTotal">${total} <small>/ 50</small></div><div class="progressTrack"><i style="width:${Math.min(100,total*2)}%"></i></div><div class="validation invalid">${issues.map(esc).join('<br>')}</div><p class="note">此牌組目前只能儲存草稿，完整卡表與效果自動判定完成後才會開放對戰。</p></aside></div>`;
}
function soloAct(action){
 try{
  soloGame=dispatchMatchAction('solo-leveling',soloGame,action);
  assertSoloTrainingMatch(soloGame);
  save(SOLO_GAME_KEY,soloGame);
  ui.soloSelected=null;
  render();
 }catch(e){toast('我獨自升級：'+e.message);}
}
function soloArena(){
 if(!soloGame)return '<section class="panel">尚無練習對局。請先到我獨自升級牌組編輯器開局。</section>';
 const state=soloGame,p=state.players[0],opp=state.players[1],actor=state.pending?.p??state.active,bot=actor===1;
 const phase={start:'開始階段',move:'移動階段',main:'主要階段',attack:'攻擊階段',attackEnd:'攻擊階段結束效果'}[state.phase]||state.phase;
 const label=c=>c?esc(soloById[c.cardId]?.nameJa||c.cardId):'空';
 const slot=c=>c?'<div class="soloCardFace">'+soloArtImg(soloById[c.cardId])+'<b>'+label(c)+'</b><small>'+esc(c.cardId)+' · '+(c.ready?'ACTIVE':'REST')+' · BP '+soloMatchBp(state,c)+'</small></div>':'<small>空格</small>';
 const board=who=>['front','energy'].map(line=>'<div class="panel"><h3>'+(line==='front'?'前線':'能源線')+'</h3><div class="grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px">'+who[line].map(c=>'<div class="catalogInfo soloBoardCell" style="border:1px solid #7775;padding:8px;min-height:55px;border-radius:7px">'+slot(c)+'</div>').join('')+'</div></div>').join('');
 const actions=matchLegalActions('solo-leveling',state);
 const revealed=state.revealedLife;
 const publicLife=revealed&&soloById[revealed.cardId]?'<section class="panel soloLifeReveal"><h3>最近公開的生命卡</h3><div class="soloLifeRevealBody">'+soloArtImg(soloById[revealed.cardId])+'<div><b>'+esc(soloById[revealed.cardId].name)+'</b><small>'+esc(revealed.cardId)+' · '+(revealed.owner===0?'你的生命區':'電腦生命區')+' · '+esc(revealed.trigger||'無 Trigger')+'</small><p>只有已公開翻出的生命卡會顯示；未翻開的生命與電腦手牌不會顯示。</p></div></div></section>':'';
 const actionButton=(a,title)=>'<button class="btn small" data-solo-act="'+encodeURIComponent(JSON.stringify(a))+'">'+esc(title)+'</button>';
 const ownedUnder=uid=>[...p.front,...p.energy].filter(Boolean).flatMap(c=>inspectSoloAttached(state,{viewer:0,owner:0,hostUid:c.uid})).find(c=>c.uid===uid);
 const chooseText=a=>{
  if(state.pending?.kind==='soloOptionalLife')return ({
   skip:'不發動生命 Trigger，翻出的卡片放場外',
   get:'發動 GET：將翻出的卡片加入手牌',
   draw:'發動 DRAW：從牌庫抽1張',
   final:'發動 FINAL：牌庫頂1張補為生命',
   raid:'發動 RAID：選擇合法底板突襲'
  })[a.mode]||'生命 Trigger 選擇';
  if(state.pending?.kind==='slgEndRaid')return a.uid==null?'不發動連續Raid':a.uid==='peel'?'將 '+a.used.length+' 張己方裏向卡及目前Raid頂卡送場外，保留原底板（不進行新Raid）':'使用 '+label(p.hand.find(c=>c.uid===a.uid))+'，將 '+a.used.map(uid=>label(ownedUnder(uid))).join('、')+' 送場外，再Raid於原底板';
  if(state.pending?.kind==='slg048Deploy'||state.pending?.kind==='slg051Raid')return a.uid==null?'不登場／不Raid':label(state.pending.kind==='slg048Deploy'?p.hand.find(c=>c.uid===a.uid):p.outside.find(c=>c.uid===a.uid))+' → '+(a.line==='front'?'前線':'能源線')+(a.slot+1)+(a.target?'（底板 '+label([...p.front,...p.energy].find(c=>c?.uid===a.target))+'）':'（REST登場）');
  if(state.pending?.kind==='slg051Mode')return a.mode==='recover'?'場外低能源角色回收模式':'支付1AP並棄牌，從場外 Raid';
  if(state.pending?.kind==='slg064Attack')return a.mode==='repeat'?'再結算登場時全體BP下降':'選BP2000以下敵方角色退場';
  if(state.pending?.kind==='slg061End')return a.uid==null?'不發動':'送 '+label(p.hand.find(c=>c?.uid===a.uid))+' 到場外以ACTIVE己方角色';
  if(state.pending?.kind==='slg022Enter'||state.pending?.kind==='slg061Enter'||state.pending?.kind==='slg061Active')return a.uid==null?'不選擇':'ACTIVE／強化 '+label([...p.front,...p.energy].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='slg020EntryDiscard'||state.pending?.kind==='slg020Recover'||state.pending?.kind==='slg021Win'||state.pending?.kind==='slg051Recover')return a.uid==null?'略過':'選 '+label(a.uid&&[...p.hand,...p.outside].find(c=>c.uid===a.uid));
  if(state.pending?.kind==='slg060Swap')return a.uid==null?'不交換':'選能源線 '+label(p.energy.find(c=>c?.uid===a.uid))+' 交換';
  if(state.pending?.kind==='slg060Target'||state.pending?.kind==='slg022Swap')return a.uid==null?'不交換':'交換前線 '+label(p.front.find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='slg049Destroy'||state.pending?.kind==='slg064Destroy')return a.uid==null?'不選擇':'使 '+label(opp.front.find(c=>c?.uid===a.uid))+' 退場';

  if(state.pending?.kind==='slgSearch'&&Array.isArray(a.picks))
   return (a.picks.length?'加入手牌：'+a.picks.map(uid=>label(state.players[actor].deck.find(c=>c.uid===uid))).join('、'):'不加入手牌')+'｜其餘放牌庫底：'+a.order.map(uid=>label(state.players[actor].deck.find(c=>c.uid===uid))).join(' → ');
  if(state.pending?.kind==='slgRecoveredDeploy')return a.uid==null?'不登場':'免費登場 → '+(a.line==='front'?'前線':'能源線')+(a.slot+1);
  if(state.pending?.kind==='slgMill')return a.mill?'將牌庫頂放場外':'不放場外';
  if(state.pending?.kind==='slg044Target')return (a.attach?'附加牌庫頂裏向卡，':'不附加裏向卡，')+'賦予傷害+1 '+label([...p.front,...p.energy].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='slg077Target')return '退場 '+label([...opp.front,...p.front].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='slg077Buff')return a.uid==null?'不強化':'BP+1000 '+label([...p.front,...p.energy].find(c=>c?.uid===a.uid));

  if(state.pending?.kind==='shadowSummonCard')return a.uid==null?'結束復活':'復活 '+label(state.players[actor].outside.find(c=>c.uid===a.uid))+' → '+(a.line==='front'?'前線':'能源線')+(a.slot+1);
  if(state.pending?.kind==='shadowSummonMode')return a.mode==='oneActive'?'最多1張影之軍團 ACTIVE登場':'最多2張需求能源3以下影之軍團 REST登場';
  if(state.pending?.kind==='castlePotion')return a.uid==null?'不使用場外藥水':'支付1AP使用 '+label(state.players[actor].outside.find(c=>c.uid===a.uid))+'（結算後除外）';
  if(state.pending?.kind==='castleRecover')return a.uid==null?'不回收角色':'回收 '+label(state.players[actor].outside.find(c=>c.uid===a.uid));
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
  if(state.pending?.kind==='colorTrigger')return a.uid==null?'不發動 COLOR 生命觸發':label(p[state.pending.sourceZone||'hand'].find(c=>c.uid===a.uid))+' → '+(a.line==='front'?'前線':'能源線')+(a.slot+1);
  if(state.pending?.kind==='specialTrigger')return a.uid==null?'不發動 SPECIAL 生命觸發':'退場 '+label([...p.front,...opp.front].find(c=>c?.uid===a.uid));
  if(state.pending?.kind==='activeTrigger')return a.uid==null?'不發動 ACTIVE 生命觸發':'ACTIVE '+label([...p.front,...p.energy,...opp.front,...opp.energy].find(c=>c?.uid===a.uid))+'，本回合 BP+3000';
  if(state.pending?.kind==='raidTrigger')return a.uid==null?'將Raid卡加入手牌':'Raid → '+(a.line==='front'?'前線':'能源線')+(a.slot+1)+'（底板 '+label([...p.front,...p.energy,...opp.front,...opp.energy].find(c=>c?.uid===a.uid))+'）';
  if(state.pending?.kind==='dailyUnder')return a.uid==null?'不移除裏向卡':label(ownedUnder(a.uid));
  if(state.pending?.kind==='dailyRecover'||state.pending?.kind==='entryRecover'||state.pending?.kind==='sungRecovery')return a.uid==null?'不回收':'回收 '+label(p.outside.find(c=>c.uid===a.uid));
  if(a.uid==null)return '不發動／不選擇／不阻擋';
  return label([...p.hand,...opp.hand,...p.front,...p.energy,...opp.front,...opp.energy].find(c=>c?.uid===a.uid));
 };
 const choices=state.pending?'<div class="panel"><b>請選擇：'+esc({
  soloOptionalLife:'生命 Trigger：可以發動或不發動（官方Q99）',
  discard:'棄一張手牌',entryImpact:'選擇獲得IMPACT的DFN角色',entryProtect:'選擇受AP保護的DFN',colorTrigger:'COLOR Trigger：選擇合法卡片及登場位置',specialTrigger:'SPECIAL Trigger：選擇敵方角色退場',entryDrawMode:'觀月繪里：選擇抽牌模式',entryRecover:'觀月繪里：選擇符合條件的場外角色',entryBounce:'選擇需返回手牌的己方其他角色',sungRecovery:'觀月繪里：選擇場外水篠旬回收',
  castleCost:'惡魔城：選擇1張手牌支付成本',castlePotion:'惡魔城：選擇可支付AP的場外命之神水',castleRecover:'惡魔城：選擇符合條件的角色回收',shadowSummonMode:'影之君主：選擇復活模式',shadowSummonCard:'影之君主：選擇影之軍團及登場位置',entry002Mode:'朝比奈凜：選擇登場能力',entry002Buff:'朝比奈凜：選其他角色BP+1000',entry002Discard:'朝比奈凜：指定一張手牌送場外',entry004Discard:'犬飼晃：指定一張手牌送場外',peekTop:'查看牌庫頂並選擇去向與順序',eventDiscard:'事件：請選擇送場外的手牌',eventRecover:'命之神水：可選一張場外角色回收',eventRestoreAp:'選擇回復的AP數量',eventDestroy:'選擇合法的敵方前線退場角色',eventDance:'舞姬：選擇獲得攻擊時抽牌的向坂雫',marieBuff:'瑪莉：選另一己方角色BP+1000並將瑪莉回手',attackDraw:'攻擊時選擇是否抽牌',ryuuBuff:'リュー：選擇己方角色BP+1000',ryuuAp:'リュー：選擇最多回復2AP',
  slgSearch:'查看牌庫頂：選卡及其餘順序',slgMill:'可選擇牌庫頂送場外',slgDiscard:'選一張手牌送場外',
  slgRecoveredBuff:'朝比奈凜回收：選BP+1000目標',slgRecoveredDeploy:'向坂雫回收：選擇免費登場位置',slg019Entry:'水篠旬：棄影之軍團抽牌',slg019Recover:'水篠旬：棄影之軍團回收',slg044Target:'水篠葵：選水篠旬附裏向卡',slg059Entry:'白川大虎：可棄牌ACTIVE',slg077Target:'架南島攻略：選敵方退場目標',slg077Buff:'架南島攻略：選BP+1000目標',
  slgEndRaid:'攻擊階段結束：選擇同系Raid與己方裏向卡成本',slg061End:'美濃部剛：選擇棄牌或不發動',slg061Active:'美濃部剛：選擇架南島角色ACTIVE',slg061Enter:'美濃部剛：選擇其他架南島角色BP+1000',
  slg020EntryDiscard:'水篠旬020：可以棄手牌，接續場外回收',slg020Recover:'水篠旬020：最多回收一張合法角色',slg020AttackDiscard:'水篠旬020：攻擊時抽牌後棄牌',slg021Win:'水篠旬021：戰鬥勝利回收',slg022Enter:'水篠旬022：選前線／能源線影之軍團ACTIVE',slg022Swap:'水篠旬022：攻擊結束後交換能源線與前線',slg048Under:'水篠旬Raid攻擊：將一張手牌裏向放於角色下方',slg048Deploy:'水篠旬048：選擇綠色低能源角色REST登場',slg049Destroy:'水篠旬049：敵方前線最多一張退場',slg051Mode:'觀月繪里051：選回收或支付AP從場外Raid',slg051Recover:'觀月繪里051：場外低能源角色回收',slg051Discard:'觀月繪里051：棄手牌支付Raid成本',slg051Raid:'觀月繪里051：從場外指定Raid卡與底板',slg060Swap:'町田堂玄：選擇交換能源線角色',slg060Target:'町田堂玄：選擇前線跳過ACTIVE的角色',slg064Attack:'最上真：選攻擊能力',slg064Destroy:'最上真：選低BP敵方角色退場',
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
 const normalActions=state.pending?[]:actions.filter(a=>['next','extraDraw','move','attack','attackTarget','ability','abilityOutside'].includes(a.type));
 return betaArenaHeader({title:'我獨自升級',turn:state.turn,phase,actor,aiDifficulty:ui.aiDifficulty,status:state.status,lifePlayer:p.life.length,lifeOpponent:opp.life.length,energyPlayer:soloEnergy(state,0),energyOpponent:soloEnergy(state,1),apPlayer:p.ap,apOpponent:opp.ap})
 +'<div class="supportNote"><b>'+(state.status==='finished'?(state.winner===0?'你獲勝':'電腦獲勝'):'第 '+state.turn+' 回合 · '+phase+' · '+(bot?'電腦處理中':'輪到你操作'))+'</b><span>你：AP '+p.ap+'/'+p.maxAp+' · 能源 '+soloEnergy(state,0)+' · 生命 '+p.life.length+' · 手牌 '+p.hand.length+'；電腦：AP '+opp.ap+' · 生命 '+opp.life.length+' · 手牌 '+opp.hand.length+'</span></div>'
 +publicLife
 +'<h3>電腦場上</h3>'+board(opp)+'<h3>你的場上</h3>'+board(p)
 +choices
 +(state.status==='playing'&&!state.pending&&!bot?'<div class="panel"><h3>主要操作</h3><div class="toolbar">'+normalActions.map(a=>actionButton(a,a.type==='next'?'下一階段／結束回合':a.type==='extraDraw'?'支付1AP額外抽牌':a.type==='move'?'移動 '+label([...p.energy].find(c=>c?.uid===a.uid))+' → 前線'+(a.slot+1):a.type==='attack'?'攻擊 '+label(p.front.find(c=>c?.uid===a.uid)):a.type==='attackTarget'?'狙擊 '+label(opp.front.find(c=>c?.uid===a.target)):a.type==='abilityOutside'?'場外回收：'+label(p.outside.find(c=>c?.uid===a.uid)):'發動 '+label([...p.energy,...p.front].find(c=>c?.uid===a.uid))+(a.mode?(' · '+({attach:'放置牌庫頂裏向卡',recover:'棄牌及回收',mill:'REST並把牌庫頂送場外',potion:'REST並用場外命之神水',boost:'影之軍團BP強化',attachDamage:'選水篠旬，置裏向卡並獲傷害+1'}[a.mode]||a.mode)):''))).join('')+'</div></div>':'')
 +'<div class="panel"><h3>你的手牌（點選卡片後選擇登場位置）</h3><div class="toolbar">'+p.hand.map(c=>'<button class="btn small soloHandCard '+(selected===c.uid?'primary':'outline')+'" data-solo-card="'+esc(c.uid)+'">'+soloArtImg(soloById[c.cardId])+'<span>'+label(c)+'</span><small>能源'+soloById[c.cardId].energy+' · AP'+soloById[c.cardId].ap+'</small></button>').join('')+'</div>'
 +(selected?'<p>選擇位置</p><div class="toolbar">'+selectable.map(a=>actionButton(a,a.type==='play'?(a.line==='front'?'前線':'能源線')+(a.slot+1):a.type==='raid'?'Raid → '+(a.line==='front'?'前線':'能源線')+(a.slot+1)+'，底板 '+label([...p.front,...p.energy].find(c=>c?.uid===a.target)):a.type==='playEvent'?'使用事件，支付AP並依序選擇效果':'其他操作')).join('')+'</div>':'')+'</div>'
 +'<details class="panel"><summary>查看我方場下裏向卡（對手無法查看）</summary>'+[...p.front,...p.energy].filter(Boolean).map(c=>({host:c,cards:inspectSoloAttached(state,{viewer:0,owner:0,hostUid:c.uid})})).filter(x=>x.cards.length).map(x=>'<p>'+label(x.host)+'：'+x.cards.map(c=>label(c)).join(' / ')+'</p>').join('')+'</details>'
 +'<details class="panel"><summary>對局紀錄（最近20筆）</summary>'+state.log.slice(-20).map(x=>'<p>'+esc(x.turn+'：'+x.text)+'</p>').join('')+'</details>';
}

function ttgAct(a){
 if(!ttgGame||ttgGame.status!=='playing')return;
 try{
  const next=dispatchMatchAction('gurren-lagann',ttgGame,a);
  assertTtgCoreState(next);ttgGame=next;save(TTG_GAME_KEY,ttgGame);
  ui.ttgSelected=null;ui.ttgKind='all';ui.ttgVisible=90;ui.ttg012={discardUids:[],mode:'readyAP',apUid:null,targetUid:null};ui.ttg012Search={takeUid:null,orderUids:[]};render();
 }catch(e){toast('天元突破 Beta 裁定錯誤：'+e.message);}
}
function ttgBetaStart(deck){
 try{
  const errors=ttgBetaDeckIssues(deck);if(errors.length){toast(errors[0]);return;}
  ttgGame=startMatchForTitle('gurren-lagann',{decks:[deck,deck],first:0,seed:Date.now()});assertTtgCoreState(ttgGame);
  save(TTG_GAME_KEY,ttgGame);ui.view='ttgArena';ui.ttgKind='all';ui.ttgSelected=null;ui.ttgVisible=90;ui.ttg012={discardUids:[],mode:'readyAP',apUid:null,targetUid:null};ui.ttg012Search={takeUid:null,orderUids:[]};render();
 }catch(e){toast('天元突破無法開局：'+e.message);}
}
function ttgArena(){
 if(!ttgGame)return `<section class='panel'>目前沒有天元突破 Beta 對局。請先到牌組編輯頁開局。</section>`;
 const s=ttgGame,actor=matchChoiceActor('gurren-lagann',s),bot=actor===1;
 const phase={start:'開始階段',move:'移動階段',main:'主要階段',attack:'攻擊階段'}[s.phase]||s.phase;
 const shown=c=>c?`<div class='ttgCardFace'>${ttgArtImg(TTG_BY_ID[c.cardId])}<span>${esc(TTG_BY_ID[c.cardId]?.nameZh||c.cardId)}</span><small>${esc(c.cardId)} · ${c.ready?'ACTIVE':'REST'} · ${TTG_BY_ID[c.cardId]?.bp||0} BP${c.stack?.length?' · RAID '+c.stack.length:''}</small></div>`:'<small>空位置</small>';
 const board=(pl,name,owner)=>`<section class='panel'><h3>${name} · LIFE ${pl.life.length} · 手牌 ${pl.hand.length} · 場外 ${pl.outside.length} · AP ${pl.apCards.filter(x=>x.ready).length}</h3><p class='note'>紅能源 ${pl.energyProduced?.red||0} · 綠能源 ${pl.energyProduced?.green||0}</p>${['front','energy'].map(line=>`<div><b>${line==='front'?'前線':'能源線'}</b><div class='grid' style='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px'>${pl[line].map((c,slot)=>`<div class='catalogInfo ttgBoardCell' style='border:1px solid #8887;padding:6px;min-height:62px;border-radius:7px'>${c?shown(c):(owner===0&&ui.ttgSelected&&ttgNormalPlacementAction(s,ui.ttgSelected,line,slot)?`<button class='btn small primary' data-ttg-place='${line}:${slot}' aria-label='放置到${line==='front'?'前線':'能源線'}位置${slot+1}'>＋ 放到這格</button>`:'<small>空位置</small>')}</div>`).join('')}</div></div>`).join('')}</section>`;
 const pending=s.pendingTtgLife?'生命觸發選擇':s.pending?.kind?'效果選擇：'+s.pending.kind:'';
 const publicLife=(s.publicLifeReveals||[]).slice(-5).reverse();
 const revealedTile=x=>{
  const card=TTG_BY_ID[x.cardId],name=esc(card?.nameZh||card?.nameJa||x.cardId);
  const result=x.outcome==='none'?'沒有 Trigger':x.outcome==='pending'?'正在選擇 Trigger':
   x.outcome==='declined'?'選擇不發動 Trigger':'已發動 '+esc(String(x.mode||x.trigger||''));
  return `<div class='catalogInfo ttgPublicLifeCard' style='padding:8px;border:1px solid #8887;border-radius:8px'>${ttgArtImg(card)}<b>${name}</b><small style='display:block'>${esc(x.cardId)} · ${x.owner===0?'你的生命區':'AI 生命區'} · ${esc(x.trigger||'無 Trigger')}</small><small>${result}</small></div>`;
 };
 const publicLifePanel=publicLife.length?`<section class='panel'><h3>公開生命翻牌（最近 ${publicLife.length} 張）</h3><div class='grid' style='display:flex;flex-wrap:wrap;gap:6px'>${publicLife.map(revealedTile).join('')}</div><small>只顯示已公開的生命卡，不公開未翻開的生命、手牌或私人查看牌庫。</small></section>`:'';
 const available=matchLegalActions('gurren-lagann',s,{templates:true});
 const types=ttgActionKinds(s);
 const picked=ttgFilteredActions(s,{kind:ui.ttgKind,cardUid:ui.ttgSelected,limit:ui.ttgVisible});
 const actionButton=a=>`<button class='btn small' data-ttg-act='${encodeURIComponent(JSON.stringify(a))}'>${esc(ttgActionLabel(s,a))}</button>`;
 const custom012=s.pending?.kind==='green012Discard'&&!bot?(()=>{
  const selection=ui.ttg012,chosen=selection.discardUids.filter(uid=>s.players[0].hand.some(c=>c.uid===uid));
  const total=chosen.reduce((n,uid)=>n+(TTG_BY_ID[s.players[0].hand.find(c=>c.uid===uid)?.cardId]?.energy||0),0);
  const mode=selection.mode;
  const discardCards=s.players[0].hand.map(c=>`<button class='btn small ${chosen.includes(c.uid)?'primary':'outline'}' data-ttg-012-discard='${esc(c.uid)}'>${chosen.includes(c.uid)?'✓ ':''}${esc(TTG_BY_ID[c.cardId]?.nameZh||c.cardId)}（${esc(c.cardId.slice(-3))} · 能源${TTG_BY_ID[c.cardId]?.energy||0}）</button>`).join('');
  const apButtons=s.players[0].apCards.map(c=>`<button class='btn small ${(selection.apUid??s.players[0].apCards[0]?.uid)===c.uid?'primary':'outline'}' data-ttg-012-ap='${esc(c.uid)}'>${esc(c.uid)} · ${c.ready?'ACTIVE':'REST'}</button>`).join('');
  const targets=[null,...s.players[1].front.filter(c=>c&&!c.cannotBeChosen&&!c.protectedFromEffects).map(c=>c.uid)];
  const targetButtons=targets.map(uid=>`<button class='btn small ${selection.targetUid===uid?'primary':'outline'}' data-ttg-012-target='${uid===null?'':esc(uid)}'>${uid===null?'不選擇退場目標':esc(TTG_BY_ID[s.players[1].front.find(c=>c?.uid===uid)?.cardId]?.nameZh||uid)}</button>`).join('');
  return `<section class='panel'><h3>西蒙 012 · 手動選擇棄牌</h3><p class='note'>可選擇任意張自己手牌送場外；合計需求能源達 15 才可改為讓敵方前線角色退場。不會替你自動選棄牌。</p><div style='display:flex;flex-wrap:wrap;gap:6px'>${discardCards}</div><p>已選 ${chosen.length} 張，合計需求能源 ${total}</p><div style='display:flex;gap:6px;flex-wrap:wrap'><button class='btn small ${mode==='readyAP'?'primary':'outline'}' data-ttg-012-mode='readyAP'>回復 1 張 AP</button><button class='btn small ${mode==='retire'?'primary':'outline'}' data-ttg-012-mode='retire' ${total<15?'disabled':''}>需求能源 ≥15：使敵方角色退場</button></div><div style='display:flex;gap:6px;flex-wrap:wrap'>${mode==='readyAP'?apButtons:targetButtons}</div><button class='btn primary' data-action='ttg012Submit' ${!chosen.length&&s.players[0].hand.length?'disabled':''}>確認支付棄牌並結算</button></section>`;
 })():'';
 const custom012Search=s.pending?.kind==='green012Search'&&!bot?(()=>{
  const rule=matchLegalActions('gurren-lagann',s,{templates:true}).find(a=>a.type==='green012Search');
  if(!rule)return '';
  const picked=ui.ttg012Search.takeUid;
  const remain=rule.revealed.filter(uid=>uid!==picked);
  const saved=ui.ttg012Search.orderUids;
  const order=saved.length===remain.length&&remain.every(uid=>saved.includes(uid))?saved:remain;
  const name=uid=>{const c=ttgCardByUid(s,uid);return c?`${TTG_BY_ID[c.cardId]?.nameZh||c.cardId}（${c.cardId.slice(-3)}）`:uid;};
  const options=[null,...rule.candidates].map(uid=>`<button class='btn small ${picked===uid?'primary':'outline'}' data-ttg-012-take='${uid===null?'':esc(uid)}'>${uid===null?'不拿牌':'拿 '+esc(name(uid))}</button>`).join('');
  const rows=order.map((uid,i)=>`<div style='display:flex;gap:5px;align-items:center;padding:4px 0'><b>${i+1}.</b><span style='flex:1'>${esc(name(uid))}</span><button class='btn small outline' data-ttg-012-up='${esc(uid)}' ${i===0?'disabled':''} aria-label='把${esc(name(uid))}向前移'>↑</button><button class='btn small outline' data-ttg-012-down='${esc(uid)}' ${i===order.length-1?'disabled':''} aria-label='把${esc(name(uid))}向後移'>↓</button></div>`).join('');
  return `<section class='panel'><h3>西蒙 012 · 查看牌庫頂與牌庫底排序</h3><p class='note'>查看牌庫頂 ${rule.revealed.length} 張，可拿最多一張合法的妮亞或需求能源8以上角色。其餘卡依畫面由上到下放到牌庫底，使用箭頭調整順序。</p><div style='display:flex;gap:6px;flex-wrap:wrap'>${options}</div><h4>依序放到牌庫底</h4>${rows}<button class='btn primary' data-action='ttg012SearchSubmit'>確認拿牌與牌庫底順序</button></section>`;
 })():'';
 const cards=s.players[0].hand;
 const hand=`<div class='grid' style='display:flex;flex-wrap:wrap;gap:7px'>${cards.map(c=>`<button class='btn small ttgHandCard ${ui.ttgSelected===c.uid?'primary':'outline'}' data-ttg-select='${esc(c.uid)}'>${shown(c)}</button>`).join('')}</div>`;
 return `${betaArenaHeader({title:'天元突破',turn:s.turn,phase:phase+(pending?' · '+pending:''),actor,aiDifficulty:ui.aiDifficulty,status:s.status,lifePlayer:s.players[0].life.length,lifeOpponent:s.players[1].life.length,energyPlayer:(s.players[0].energyProduced?.red||0)+(s.players[0].energyProduced?.green||0),energyOpponent:(s.players[1].energyProduced?.red||0)+(s.players[1].energyProduced?.green||0),apPlayer:s.players[0].apCards.filter(x=>x.ready).length,apOpponent:s.players[1].apCards.filter(x=>x.ready).length})}
 <div class='supportNote'><b>限定 Beta 判定</b><span>${esc(TTG_BETA_NOTICE)}</span><span>${esc(TTG_ART_CREDIT)} · 圖片連線異常會改顯示佔位圖。</span></div>
 ${publicLifePanel}
 ${s.status==='finished'?`<section class='panel'><h2>對局結束 · ${s.winner===0?'玩家勝利':'AI 勝利'}</h2><p>${esc(s.endReason||'')}</p><button class='btn primary' data-action='ttgBetaStartGreen'>再玩一局</button></section>`:''}
 ${board(s.players[1],'AI 對手',1)}${board(s.players[0],'你的場地',0)}
 <section class='panel'><h3>你的手牌（${cards.length} 張）</h3><p class='note'>點選一張手牌，再點自己場上亮起的空格普通登場；Raid 或特殊效果可使用下方合法動作列表。</p>${hand}</section>
 ${s.status==='playing'?`<section class='panel'><h3>${bot?'AI 正在依合法動作處理…':'選擇合法動作'} · ${available.length} 項</h3>${bot?'<p class=note>輪到 AI，等待自動結算；不顯示電腦的私人手牌及效果選擇。</p>':`
 ${(s.pending||s.pendingTtgLife||s.pendingTtgTrigger)?`<p><button class='btn outline' data-action='ttgResolveAssist'>AI 幫我選擇這次效果</button> <small>會依合法動作結算，可自行選上面的選項。</small></p>`:''}
 <div style='display:flex;flex-wrap:wrap;gap:5px'><button class='btn small ${ui.ttgKind==='all'?'primary':'outline'}' data-ttg-kind='all'>全部</button>${types.map(o=>`<button class='btn small ${ui.ttgKind===o.type?'primary':'outline'}' data-ttg-kind='${esc(o.type)}'>${esc(o.type)} (${o.count})</button>`).join('')}</div>
 <div style='display:flex;flex-wrap:wrap;gap:7px;margin-top:12px'>${custom012Search}${custom012}${picked.actions.filter(a=>!['green012Discard','green012Search'].includes(a.type)).map(actionButton).join('')}</div>
 ${picked.total>picked.actions.length?`<button class='btn' data-action='ttgMore'>顯示更多動作（${picked.actions.length}/${picked.total}）</button>`:''}
 ${ui.ttgSelected?`<button class='btn outline' data-ttg-select=''>清除手牌篩選</button>`:''}`}</section>`:''}
 <section class='panel'><h3>近期對局紀錄</h3><div class='logList'>${(s.log||[]).slice(-18).reverse().map(x=>`<p>${esc(typeof x==='string'?x:JSON.stringify(x))}</p>`).join('')||'<p class=note>尚無紀錄。</p>'}</div></section>`;
}
function bind(){
 $('#app').onclick=e=>{
  const el=e.target.closest('button');if(!el||el.disabled)return;
   // Historic editors may retain saved decks, but never start legacy / independent Beta battles.
   if(PUBLIC_EDITOR_ONLY&&['start','soloTrainingStartShadow','soloTrainingStartCustom','soloTrainingStart','ttgBetaStartGreen','ttgBetaStartRed','ttgBetaStartDeck'].includes(el.dataset.action)){window.location.assign('/');return;}
  if(el.dataset.view){chooseView(el.dataset.view);return;}
  if(el.dataset.title){ui.title=el.dataset.title;ui.set='all';ui.color='all';ui.search='';ui.selected=null;if(ui.view==='builder'){ui.builderReady=true;ui.builderTab='pick';ui.builderType='all';ui.builderColor='all';ui.builderEnergy='all';}render();return;}
   if(ui.view==='builder'&&PUBLIC_EDITOR_ONLY){
    if(el.dataset.builderReselect!==undefined){ui.builderReady=false;ui.search='';render();return;}
    if(el.dataset.builderTab){ui.builderTab=el.dataset.builderTab;render();return;}
    if(el.dataset.builderType){ui.builderType=el.dataset.builderType;render();return;}
    if(el.dataset.builderColor){ui.builderColor=el.dataset.builderColor;render();return;}
    if(el.dataset.builderEnergy){ui.builderEnergy=el.dataset.builderEnergy;render();return;}
    if(el.dataset.builderClear!==undefined){ui.builderType='all';ui.builderColor='all';ui.builderEnergy='all';ui.search='';render();return;}
    if(el.dataset.builderCount){
     const c=TITLES.find(t=>t.id===ui.title)?.cards.find(c=>c.id===el.dataset.builderCount);
     if(!c||['ap','action-point','action_point'].includes(c.type)||(ui.title==='mushoku-tensei'&&!c.verified))return;
     const counts=ui.title==='bleach'?deck:ui.title==='gurren-lagann'?ttgDeck:ui.title==='sword-art-online'?saoDeck:ui.title==='solo-leveling'?soloDeck:ui.title==='rezero'?rezDeck:mstDeck;
     const delta=Number(el.dataset.delta);
     if(![-1,1].includes(delta))return;
     if(delta>0&&Object.values(counts).reduce((n,x)=>n+(Number(x)||0),0)>=50){toast('牌組最多 50 張，請先移除其他卡片。');return;}
     counts[c.id]=Math.max(0,Math.min(c.maxCopies||4,(counts[c.id]||0)+delta));
     if(ui.title==='bleach')persistDraft();
     else if(ui.title==='gurren-lagann')persistTtg();
     else if(ui.title==='sword-art-online')save(SAO_DRAFT_KEY,saoDeck);
     else if(ui.title==='solo-leveling')persistSolo();
     else if(ui.title==='rezero')persistRez();
     else persistMst();
     render();return;
    }
   }
  if(el.dataset.ttg012Take!==undefined&&ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Search'){ui.ttg012Search.takeUid=el.dataset.ttg012Take||null;ui.ttg012Search.orderUids=[];render();return;}
  if((el.dataset.ttg012Up!==undefined||el.dataset.ttg012Down!==undefined)&&ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Search'){
   const rule=matchLegalActions('gurren-lagann',ttgGame,{templates:true}).find(a=>a.type==='green012Search');
   const remain=rule.revealed.filter(uid=>uid!==ui.ttg012Search.takeUid),saved=ui.ttg012Search.orderUids;
   const order=saved.length===remain.length&&remain.every(uid=>saved.includes(uid))?[...saved]:[...remain];
   const up=el.dataset.ttg012Up!==undefined,uid=up?el.dataset.ttg012Up:el.dataset.ttg012Down,i=order.indexOf(uid),j=i+(up?-1:1);
   if(i>=0&&j>=0&&j<order.length){[order[i],order[j]]=[order[j],order[i]];ui.ttg012Search.orderUids=order;}render();return;
  }
  if(el.dataset.ttg012Discard!==undefined&&ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Discard'){const id=el.dataset.ttg012Discard;const current=ui.ttg012.discardUids;ui.ttg012.discardUids=current.includes(id)?current.filter(x=>x!==id):[...current,id];render();return;}
  if(el.dataset.ttg012Mode&&ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Discard'){ui.ttg012.mode=el.dataset.ttg012Mode;render();return;}
  if(el.dataset.ttg012Ap&&ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Discard'){ui.ttg012.apUid=el.dataset.ttg012Ap;render();return;}
  if(el.dataset.ttg012Target!==undefined&&ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Discard'){ui.ttg012.targetUid=el.dataset.ttg012Target||null;render();return;}
  if(el.dataset.ttgPlace&&ui.view==='ttgArena'&&ttgGame?.status==='playing'&&ttgChoiceActor(ttgGame)===0){const [line,slot]=el.dataset.ttgPlace.split(':');const action=ttgNormalPlacementAction(ttgGame,ui.ttgSelected,line,Number(slot));if(action)ttgAct(action);else toast('這張卡目前無法登場到指定位置。');return;}
  if(el.dataset.ttgAct){if(ui.view==='ttgArena'&&ttgChoiceActor(ttgGame)===0)ttgAct(JSON.parse(decodeURIComponent(el.dataset.ttgAct)));return;}
  if(el.dataset.ttgSelect!==undefined){ui.ttgSelected=ui.ttgSelected===el.dataset.ttgSelect?null:(el.dataset.ttgSelect||null);ui.ttgVisible=90;render();return;}
  if(el.dataset.ttgKind){ui.ttgKind=el.dataset.ttgKind;ui.ttgVisible=90;render();return;}
  if(el.dataset.soloCard){ui.soloSelected=ui.soloSelected===el.dataset.soloCard?null:el.dataset.soloCard;render();return;}
  if(el.dataset.soloAct){if(ui.view==='soloArena'&&(soloGame?.pending?.p??soloGame?.active)===0)soloAct(JSON.parse(decodeURIComponent(el.dataset.soloAct)));return;}
  if(el.dataset.soloCount){const id=el.dataset.soloCount;const c=soloById[id];if(!c)return;soloDeck[id]=Math.max(0,Math.min(c.maxCopies||4,(soloDeck[id]||0)+Number(el.dataset.delta)));persistSolo();render();return;}
  if(el.dataset.mstCount){const id=el.dataset.mstCount;const c=MST_CARDS.find(c=>c.id===id);if(!c||!c.verified)return;mstDeck[id]=Math.max(0,Math.min(4,(mstDeck[id]||0)+Number(el.dataset.delta)));persistMst();render();return;}
  if(el.dataset.saoCount){const id=el.dataset.saoCount;if(!SAO_BY_ID[id])return;saoDeck[id]=Math.max(0,Math.min(4,(saoDeck[id]||0)+Number(el.dataset.delta)));save(SAO_DRAFT_KEY,saoDeck);render();return;}
  if(el.dataset.rezCount){const id=el.dataset.rezCount;if(!REZERO_ALL_BY_ID[id])return;rezDeck[id]=Math.max(0,Math.min(4,(rezDeck[id]||0)+Number(el.dataset.delta)));persistRez();render();return;}
  if(el.dataset.rezColor){ui.color=el.dataset.rezColor;render();return;}
  if(el.dataset.ttgCount){const id=el.dataset.ttgCount;ttgDeck[id]=Math.max(0,Math.min(4,(ttgDeck[id]||0)+Number(el.dataset.delta)));persistTtg();render();return;}
  if(el.dataset.mode){ui.mode=el.dataset.mode;render();return;}
  if(el.dataset.filter){ui.filter=el.dataset.filter;render();return;}
  if(el.dataset.count){const id=el.dataset.count;deck[id]=Math.max(0,Math.min(4,(deck[id]||0)+Number(el.dataset.delta)));persistDraft();render();return;}
  if(el.dataset.inspect){if(ui.title!=='bleach'){const c=TITLES.find(t=>t.id===ui.title)?.cards.find(c=>c.id===el.dataset.inspect);if(c?.source)window.open(c.source,'_blank','noopener,noreferrer');return;}ui.modal={type:'inspect',id:el.dataset.inspect};render();return;}
  if(el.dataset.side){ui.sideTab=el.dataset.side;render();return;}
  if(el.dataset.line){ui.line=el.dataset.line;render();return;}
  if(el.dataset.do){if(game&&humanTurn()&&!ui.raidFlow)act(JSON.parse(el.dataset.do));return;}
  if(el.dataset.hand){const p=game.mode==='solo'?0:gameActor(),c=game.players[p].hand.find(c=>c.uid===el.dataset.hand);if(!c||!humanTurn()||game.pending)return;ui.selected={uid:c.uid,p,source:'hand'};ui.raidFlow=null;ui.deployment='normal';if(legalActions(game).some(a=>a.type==='raid'&&a.uid===c.uid))beginRaid();else render();return;}
  if(el.dataset.slot){const [pp,line,ss]=el.dataset.slot.split('|'),p=Number(pp),slot=Number(ss),a=destination(p,line,slot);if(a){if(a.type==='raidBase'){ui.raidFlow.step='position';ui.raidFlow.target=a.target;render();}else if(ui.raidFlow&&a.type==='raid'){ui.raidFlow.step='confirm';ui.raidFlow.action=a;render();}else if(a.type==='chooseRaid'){ui.modal={type:'raid',actions:a.actions};render();}else act(a);return;}if(ui.raidFlow)return;const c=game.players[p][line][slot];if(c){ui.raidFlow=null;ui.selected={uid:c.uid,p,source:'field'};ui.line='front';render();}return;}
  if(el.dataset.pile){const [p,pile]=el.dataset.pile.split('|');ui.modal={type:'pile',p:Number(p),pile};render();return;}
  if(el.dataset.choice&&game?.pending&&humanTurn()){
   const id=el.dataset.choice,q=game.pending;if(q.max===1)ui.choiceIds=ui.choiceIds[0]===id?[]:[id];else if(ui.choiceIds.includes(id))ui.choiceIds=ui.choiceIds.filter(x=>x!==id);else if(ui.choiceIds.length<q.max)ui.choiceIds.push(id);else{toast(`最多選擇 ${q.max} 張。`);return;}render();return;
  }
  if(el.dataset.raidAction){const a=ui.modal.actions[Number(el.dataset.raidAction)];act(a);return;}
  switch(el.dataset.action){
   case 'soloTrainingStartShadow':try{soloGame=startMatchForTitle('solo-leveling',{decks:[SOLO_SHADOW_TRAINING_PRESET,SOLO_SHADOW_TRAINING_PRESET],mode:'solo',seed:Date.now()});save(SOLO_GAME_KEY,soloGame);ui.view='soloArena';ui.soloSelected=null;render();}catch(e){toast(e.message);}break;
   case 'soloTrainingStartCustom':try{const issues=soloTrainingDeckIssues(soloDeck);if(issues.length){toast(issues[0]);break;}soloGame=startMatchForTitle('solo-leveling',{decks:[soloDeck,soloDeck],mode:'solo',seed:Date.now()});save(SOLO_GAME_KEY,soloGame);ui.view='soloArena';ui.soloSelected=null;render();}catch(e){toast(e.message);}break;
   case 'soloTrainingStart':try{soloGame=startMatchForTitle('solo-leveling',{decks:[SOLO_TRAINING_PRESET,SOLO_TRAINING_PRESET],mode:'solo',seed:Date.now()});save(SOLO_GAME_KEY,soloGame);ui.view='soloArena';ui.soloSelected=null;render();}catch(e){toast(e.message);}break;
   case 'soloPreset':soloDeck=soloNormalize(SOLO_DRAFT_PRESET);soloName='影之軍團示範牌組（尚不可對戰）';persistSolo();render();break;
   case 'soloNew':soloDeck=soloNormalize({});soloName='我獨自升級自訂牌組';persistSolo();render();break;
   case 'soloSave':soloSaved=[...soloSaved,{name:soloName.trim()||'我獨自升級自訂牌組',counts:soloNormalize(soloDeck)}];save(SOLO_SAVED_KEY,soloSaved);render();toast('已儲存我獨自升級牌組草稿。');break;
   case 'mstNew':mstDeck=emptyMstDeck();mstName='無職轉生自訂牌組';persistMst();render();break;
   case 'mstSave':{const name=mstName.trim()||'無職轉生自訂牌組';mstSaved=[...mstSaved,{id:'mst-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts:normalizeMstCounts(mstDeck)}];save(MST_SAVED_KEY,mstSaved);render();toast('已儲存無職轉生牌組草稿。');break;}
   case 'rezNew':rezDeck=emptyRezDeck();rezName='Re:Zero Vol.2 自訂牌組';persistRez();render();break;
   case 'rezSave':{const name=rezName.trim()||'Re:Zero Vol.2 自訂牌組';rezSaved=[...rezSaved,{id:'rez-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts:normalizeRezCounts(rezDeck)}];save(REZ_SAVED_KEY,rezSaved);render();toast('已儲存 Re:Zero Vol.2 牌組草稿。');break;}
   case 'saoNew':saoDeck={};saoName='刀劍神域自訂牌組';save(SAO_DRAFT_KEY,saoDeck);render();break;
   case 'saoSave':{const name=saoName.trim()||'刀劍神域自訂牌組';saoSaved=[...saoSaved,{id:'sao-'+Date.now(),name,counts:{...saoDeck}}];save(SAO_SAVED_KEY,saoSaved);render();toast('已儲存刀劍神域草稿。');break;}
   case 'ttgBetaStartGreen':ttgBetaStart(TTG_GREEN_BETA_PRESET);break;
   case 'ttgBetaStartRed':ttgBetaStart(TTG_RED_BETA_PRESET);break;
   case 'ttgBetaStartDeck':ttgBetaStart(ttgDeck);break;
   case 'ttg012SearchSubmit':if(ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Search'&&ttgChoiceActor(ttgGame)===0){try{const rule=matchLegalActions('gurren-lagann',ttgGame,{templates:true}).find(a=>a.type==='green012Search'),rest=rule.revealed.filter(uid=>uid!==ui.ttg012Search.takeUid),saved=ui.ttg012Search.orderUids,order=saved.length===rest.length&&rest.every(uid=>saved.includes(uid))?saved:rest;ttgAct(ttg012SearchChoice(ttgGame,{takeUid:ui.ttg012Search.takeUid,bottomOrderUids:order}));}catch(e){toast('西蒙012搜尋選擇：'+e.message);}}break;
   case 'ttg012Submit':if(ui.view==='ttgArena'&&ttgGame?.pending?.kind==='green012Discard'&&ttgChoiceActor(ttgGame)===0){try{const choice=ttg012ManualChoice(ttgGame,{discardUids:ui.ttg012.discardUids,mode:ui.ttg012.mode,apUid:ui.ttg012.mode==='readyAP'?(ui.ttg012.apUid??ttgGame.players[0].apCards[0]?.uid):null,targetUid:ui.ttg012.mode==='retire'?ui.ttg012.targetUid:null});ttgAct(choice);}catch(e){toast('西蒙012效果選擇：'+e.message);}}break;
   case 'ttgResolveAssist':if(ui.view==='ttgArena'&&ttgGame?.status==='playing'&&ttgChoiceActor(ttgGame)===0&&(ttgGame.pending||ttgGame.pendingTtgLife||ttgGame.pendingTtgTrigger)){const next=ttgCoreAiChoice(ttgGame);if(next)ttgAct(next);else toast('目前沒有合法的效果選擇。');}break;
   case 'ttgMore':ui.ttgVisible+=90;render();break;
   case 'ttgNew':ttgDeck=emptyTtgDeck();ttgName='天元突破自訂牌組';persistTtg();render();break;
   case 'ttgSave':{const name=ttgName.trim()||'天元突破自訂牌組';ttgSaved=[...ttgSaved,{id:'ttg-'+Date.now()+'-'+Math.random().toString(36).slice(2),name,counts:normalizeTtgCounts(ttgDeck)}];save(TTG_SAVED_KEY,ttgSaved);render();toast('已儲存天元突破牌組草稿。');break;}
   case 'start':startGame();break;
   case 'useDeck':if(validateDeck(deck).length)toast(validateDeck(deck)[0]);else{persistDraft();chooseView('lobby');toast('已套用這副牌組。');}break;
   case 'resetDeck':loadDeckSource('preset:'+ui.preset);break;
   case 'newDeck':deck=emptyDeck();deckName='新的 BLEACH 牌組';selectedDeckId=null;persistDraft();render();break;
   case 'saveDeck':case 'copySavedDeck':try{saveCurrentDeck(el.dataset.action==='copySavedDeck');}catch(e){toast(e.message);}break;
   case 'deckCode':ui.modal={type:'deckCode'};render();break;
    case 'enterV2Battle':{
     const title=ui.title;
     const counts=title==='bleach'?deck:title==='gurren-lagann'?ttgDeck:title==='sword-art-online'?saoDeck:title==='solo-leveling'?soloDeck:title==='rezero'?rezDeck:mstDeck;
     const name=title==='bleach'?deckName:title==='gurren-lagann'?ttgName:title==='sword-art-online'?saoName:title==='solo-leveling'?soloName:title==='rezero'?rezName:mstName;
     const report=v2DeckReport(title,counts);
     if(!report.ok){toast(report.issues[0]||'這副牌組還不能進入 V2。');break;}
     const slim=Object.fromEntries(Object.entries(counts).filter(([,n])=>Number(n)>0));
     try{sessionStorage.setItem('ua-v2-title-entry-v1',JSON.stringify({title,name,counts:slim,aiDifficulty:ui.aiDifficulty||'normal'}));}
     catch(e){toast('無法暫存牌組：'+e.message);break;}
     window.location.assign('/');
     break;
    }
    case 'visualExport':{
     const t=TITLES.find(t=>t.id===ui.title)||TITLES[0];
     const counts=ui.title==='bleach'?deck:ui.title==='gurren-lagann'?ttgDeck:ui.title==='sword-art-online'?saoDeck:ui.title==='solo-leveling'?soloDeck:ui.title==='rezero'?rezDeck:mstDeck;
     const name=ui.title==='bleach'?deckName:ui.title==='gurren-lagann'?ttgName:ui.title==='sword-art-online'?saoName:ui.title==='solo-leveling'?soloName:ui.title==='rezero'?rezName:mstName;
     const list=t.cards.filter(c=>counts[c.id]>0).map(c=>String(counts[c.id])+'x'+(c.number||c.id));
     ui.modal={type:'visualExport',text:'# '+name+'\n'+list.join('\n')};render();break;
    }
   case 'copyDeck':{const t=$('#deckCode');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t.value).then(()=>toast('牌組清單已複製。')).catch(()=>{t.select();toast('已選取清單，可以手動複製。');});else{t.select();toast('已選取清單，可以手動複製。');}break;}
   case 'importDeck':{try{const parsed=parseDeck($('#deckCode').value);deck=parsed.counts;if(parsed.name)deckName=parsed.name;selectedDeckId=null;persistDraft();ui.modal=null;ui.view='builder';render();toast('牌組已匯入，可以命名儲存。');}catch(e){toast(e.message||'清單格式不正確。');}break;}
   case 'handoff':ui.handoff=false;ui.privatePeekOpen=false;render();break;
   case 'showPrivatePeek':if(game?.mode==='hotseat'&&game.pending&&humanTurn()){ui.privatePeekOpen=true;render();}break;
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
   case 'triggerHistory':ui.modal={type:'triggerHistory'};render();break;
   case 'showLog':ui.modal={type:'log'};render();break;
   case 'newMatch':ui.modal={type:'newMatch'};render();break;
   case 'hint':{
    const a=chooseMatchBotAction('bleach',game,{difficulty:ui.aiDifficulty});if(!a)break;
    if(a.type==='choose'){ui.choiceIds=a.ids;render();toast('已標記建議選擇，你可以更改後再確認。');}
    else if(a.uid){const f=locate(game,a.uid),p=gameActor();ui.selected={uid:a.uid,p,source:f?'field':'hand'};ui.line=a.line||'front';ui.deployment=a.type==='raid'?'raid':'normal';render();toast(a.type==='raid'?'可以 Raid，點選 Raid 後選擇基底。':a.type==='ability'?'建議發動這張卡片的能力。':a.type==='attack'?'建議以這個角色攻擊。':'建議使用這張手牌，選擇放置位置。');}
    else toast(a.type==='extraDraw'?'可以花 1 AP 額外抽牌。':a.type==='keep'?'這副起手可以保留。':a.type==='redraw'?'缺少低需求角色，建議完整重抽。':'目前可以進入下一個階段。');break;
   }
  }
 };
 for(const [id,prop] of [['setFilter','set'],['colorFilter','color'],['supportFilter','support']]){const el=$('#'+id);if(el)el.onchange=()=>{ui[prop]=el.value;render();};}
 const search=$('#search');if(search)search.oninput=()=>{const start=search.selectionStart;ui.search=search.value;render();const next=$('#search');next.focus();next.setSelectionRange(start,start);};
 const saoSetFilter=$('#saoSetFilter');if(saoSetFilter)saoSetFilter.onchange=()=>{ui.saoSet=saoSetFilter.value;render();};
 const soloNameInput=$('#soloDeckName');if(soloNameInput)soloNameInput.oninput=()=>{soloName=soloNameInput.value.slice(0,40);};
 const soloSavedInput=$('#soloSavedSelect');if(soloSavedInput)soloSavedInput.onchange=()=>{const d=soloSaved[Number(soloSavedInput.value)];if(!d||soloSavedInput.value==='')return;soloName=d.name;soloDeck=soloNormalize(d.counts);persistSolo();render();};
 const mstNameInput=$('#mstDeckName');if(mstNameInput)mstNameInput.oninput=()=>{mstName=mstNameInput.value.slice(0,40);};
 const mstSavedInput=$('#mstSavedSelect');if(mstSavedInput)mstSavedInput.onchange=()=>{if(mstSavedInput.value==='')return;const chosen=mstSaved[Number(mstSavedInput.value)];if(!chosen)return;mstName=chosen.name;mstDeck=normalizeMstCounts(chosen.counts);persistMst();render();};
 const rezNameInput=$('#rezDeckName');if(rezNameInput)rezNameInput.oninput=()=>{rezName=rezNameInput.value.slice(0,40);};
 const rezSavedInput=$('#rezSavedSelect');if(rezSavedInput)rezSavedInput.onchange=()=>{if(rezSavedInput.value==='')return;const chosen=rezSaved[Number(rezSavedInput.value)];if(!chosen)return;rezName=chosen.name;rezDeck=normalizeRezCounts(chosen.counts);persistRez();render();};
 const saoNameInput=$('#saoDeckName');if(saoNameInput)saoNameInput.oninput=()=>{saoName=saoNameInput.value.slice(0,40);};
 const saoSavedInput=$('#saoSavedSelect');if(saoSavedInput)saoSavedInput.onchange=()=>{if(saoSavedInput.value==='')return;const chosen=saoSaved[Number(saoSavedInput.value)];if(!chosen)return;saoName=chosen.name;saoDeck={...chosen.counts};save(SAO_DRAFT_KEY,saoDeck);render();};
 const ttgNameInput=$('#ttgDeckName');if(ttgNameInput)ttgNameInput.oninput=()=>{ttgName=ttgNameInput.value.slice(0,40);};
 const ttgSavedInput=$('#ttgSavedSelect');if(ttgSavedInput)ttgSavedInput.onchange=()=>{const chosen=ttgSaved[Number(ttgSavedInput.value)];if(!chosen||ttgSavedInput.value==='')return;ttgName=chosen.name;ttgDeck=normalizeTtgCounts(chosen.counts);persistTtg();render();};
 const aiSelect=$('#aiDifficultySelect');if(aiSelect)aiSelect.onchange=()=>{ui.aiDifficulty=aiSelect.value;save(AI_KEY,ui.aiDifficulty);render();};
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
const ttgArtRoot=$('#app');
ttgArtRoot?.addEventListener?.('error',event=>{ttgArtErrorFallback(event.target);soloArtErrorFallback(event.target);},true);
render();
