// Experimental manual UNION ARENA V2 browser preview.
// This entrypoint is intentionally NOT linked from the production index.html.
// All game transitions pass through legalUniversalActions/dispatchUniversalAction.
import {createAllV2PreviewRealDecks} from './universal-v2/preview-real-decks.mjs';
import {officialV2Pack,rezeroSet1PracticeDeck,steinsGatePracticeDeck,madokaPracticeDeck,inuyashaPracticeDeck,kjnPracticeDeck,v2DeckReport} from './universal-v2/official-entry.mjs';
import {REZERO_ALL_CARDS} from './rezero-builder.mjs';
import {STEINS_GATE_CARDS} from './steins-gate-cards.mjs';
import {MADOKA_CARDS} from './madoka-cards.mjs';
import {EXEDRA_CARDS} from './madoka-exedra-cards.mjs';
import {INUYASHA_CARDS} from './inuyasha-cards.mjs';
import {KJN_CARDS} from './kjn-cards.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from './universal-v2/bleach-designated-decks.mjs';
import {validateUniversalDeck} from './universal-v2/pack.mjs';
import {V2_ABILITY_TEMPLATE_IDS} from './universal-v2/ability-templates.mjs';
import {listRegisteredV2Titles,registeredV2TitlePack} from './universal-v2/title-packs/registry.mjs';
import {V2_EDITOR_TRANSFER_KEY} from './v2-editor-compat.mjs';
import {generateMatchSeed} from './v2-match-random-seed.mjs';
import {recordDeckResult} from './deck-records.mjs';
import {prepareSoloBattle,saveSoloBattle,loadSoloBattle,clearSoloBattle,
 SOLO_BATTLE_URL,SOLO_BATTLE_PROGRESS_KEY} from './universal-v2/solo-battle-session.mjs';
import {collectSavedV2LobbyDecks,accountLobbyRows,orderedAccountLobbyRows,shadowedLocalLobbyKeys,lobbyChoiceText,validatedLobbyChoice,V2_MATCH_SETUP_STORAGE_KEY} from './universal-v2/lobby-saved-decks.mjs?v=20261030accountdeck1';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalPrivateChoices,assertUniversalMatch} from './universal-v2/engine.mjs';
import {chooseUniversalAiAction} from './universal-v2/ai.mjs';
import {chooseProgressSafeAiAction,AI_ACTIONS_PER_FRAME,aiPolicyFor} from './universal-v2/ai-driver-safety.mjs?v=20261030hardai1';
import {ttgArtSource,ttgArtErrorFallback} from './ttg-art.mjs';
import {TTG_BY_ID} from './ttg-builder.mjs';
import {CARDS} from './cards.mjs?v=9.1.0';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {SAO_CARDS} from './sao-cards.mjs';
import {MST_V2_OFFICIAL_CATALOGUE} from './universal-v2/sources/mst-inventory.mjs';
import {V2_PHASE_LABELS,V2_TITLE_LABELS,V2_PENDING_LABELS,
 uiActor,isExactLegal,uiCardLabel,uiActionLabel,visibleActionsForCard,
 pendingChoiceCards,inspectedPendingChoiceCards,visiblePendingChoiceCards,pendingEntryChoiceCards,publicLifeOrderChoiceCard,pendingChoiceCaption,publicPendingTargetCard,controllerDeckWindowCards,controllerChoiceArt,pendingTextChoiceClass,attackBattleTags,attackKeywordBadges,frontAttackKeywordBadges,inlineBlockDecision,boardEntryMode,boardEntrySelection,entryClickPlan,moveClickPlan,
 FIELD_HOLD_MS,fieldEffectCopy} from './universal-v2/preview-actions.mjs?v=20261030effectlabel1';
import {publicPreviewActionLabel,makeUniversalPreviewReplay,appendUniversalReplay,
 collectPublicCardResults,publicPreviewTranscript} from './universal-v2/preview-replay.mjs';
import {DESKTOP_BATTLE_QUERY,isDesktopBattlefield,mountDesktopBattlefield}
 from './universal-v2/desktop-battle-ui.mjs';

const rezeroPractice=rezeroSet1PracticeDeck();
const stgPractice=steinsGatePracticeDeck();
const madokaPractice=madokaPracticeDeck();
const inuyashaPractice=inuyashaPracticeDeck();
const kjnPractice=kjnPracticeDeck();
const decks={...createAllV2PreviewRealDecks(),
 'rezero-set1':{pack:rezeroPractice.pack,counts:rezeroPractice.counts,
  label:'Re:Zero 第一彈｜黃色練習組'},
 'steins-gate-blue':{pack:stgPractice.pack,counts:stgPractice.counts,
  label:'命運石之門｜藍色練習組'},
 'madoka-red':{pack:madokaPractice.pack,counts:madokaPractice.counts,
  label:'魔法少女小圓｜紅色練習組'},
 'inuyasha-purple':{pack:inuyashaPractice.pack,counts:inuyashaPractice.counts,
  label:'犬夜叉｜紫色練習組'},
 'kjn-purple':{pack:kjnPractice.pack,counts:kjnPractice.counts,
  label:'我想成為影之強者！｜紫色練習組'}};
const designatedReady=new Map();
const allArt=Object.freeze({
 bleach:new Map(CARDS.map(c=>[c.identity,c.image||null])),
 'solo-leveling':new Map(SOLO_LEVELING_CARDS.map(c=>[c.id,c.image||null])),
 'sword-art-online':new Map(SAO_CARDS.map(c=>[c.id,c.image||null])),
 'mushoku-tensei':new Map(MST_V2_OFFICIAL_CATALOGUE.map(c=>[c.id,c.image||null])),
 rezero:new Map(REZERO_ALL_CARDS.map(c=>[c.id,c.image||null])),
 'steins-gate':new Map(STEINS_GATE_CARDS.map(c=>[c.id,c.image||null])),
 madoka:new Map([...MADOKA_CARDS,...EXEDRA_CARDS].map(c=>[c.id,c.image||null])),
 inuyasha:new Map(INUYASHA_CARDS.map(c=>[c.id,c.image||null])),
 kjn:new Map(KJN_CARDS.map(c=>[c.id,c.image||null]))
});
const v2Entries=listRegisteredV2Titles();
function printedCatalogueMap(cards){
 const map=new Map();
 for(const card of cards){
  const id=card?.identity||card?.id;
  if(id&&!map.has(id))map.set(id,card);
 }
 return map;
}
const PRINTED_CATALOGUE={
 bleach:printedCatalogueMap(CARDS),
 'solo-leveling':printedCatalogueMap(SOLO_LEVELING_CARDS),
 'sword-art-online':printedCatalogueMap(SAO_CARDS),
 'mushoku-tensei':printedCatalogueMap(MST_V2_OFFICIAL_CATALOGUE),
 rezero:printedCatalogueMap(REZERO_ALL_CARDS),
 'gurren-lagann':printedCatalogueMap(Object.values(TTG_BY_ID))
};
const el=(tag,props={},...contents)=>{
 const n=document.createElement(tag);
 for(const [key,value] of Object.entries(props)){
  if(value==null)continue;
  if(key==='text')n.textContent=String(value);
  else if(key==='class')n.className=value;
  else if(key==='onClick')n.addEventListener('click',value);
  else if(key==='onChange')n.addEventListener('change',value);
  else if(key==='onError')n.addEventListener('error',value);
  else if(key==='value')n.value=value;
  else if(key==='disabled')n.disabled=value;
  else if(key==='type'||key==='title'||key==='id'||key==='role'||key==='alt'||key==='src')n[key]=value;
  else n.setAttribute(key,String(value));
 }
 for(const item of contents.flat(Infinity)){
  if(item==null||item===false)continue;
  n.append(item instanceof Node?item:document.createTextNode(String(item)));
 }
 return n;
};
const $=id=>document.getElementById(id);
const IS_BATTLE_PAGE=document.body?.dataset?.v2Screen==='battle';
if(!IS_BATTLE_PAGE)$('v2-coverage').textContent=
 V2_ABILITY_TEMPLATE_IDS.length+' 種能力模板 · 已移植 '+
 v2Entries.reduce((sum,item)=>sum+item.totalV2Cards,0)+' 張真卡 Pilot';
let editorRecordId=null,fieldHold=0;
const app={state:null,packs:null,launch:null,selectedUid:null,recordDeckId:null,recordNoted:false,
 selectedSide:null,history:[],publicMoves:[],dismissedPublicMoveIds:new Set(),busy:false,aiTimer:null,error:'',
 undo:null,replay:null,targetChoices:null,raidBaseUid:null,entryMode:null,inspectionPaused:false,dismissedTriggerKeys:new Set(),aiDifficulty:'normal',sequence:0,allActions:false, maxAuto:4500,autoMoves:0,aiPhaseKey:null,aiPhaseCount:0,aiFallbacks:0,aiCompletedSteps:0,lastAiProgress:'未啟動'};
const phases=V2_PHASE_LABELS;
const CLIENT_RELEASE='AI 修復 R2 · 2026-10-24';
const btn=(label,fn,cls='')=>el('button',{type:'button',class:cls,text:label,onClick:fn});
const fmtTitle=(id)=>V2_TITLE_LABELS[id]||id;
const cardDef=(side,id)=>app.packs?.[side]?.cards[id]||null;
function imgUrl(side,id){
 const title=app.packs?.[side]?.id;
 if(title==='gurren-lagann')return ttgArtSource(id);
 const source=allArt[title]?.get(id);
 // The card image is presentation-only. Missing art never relaxes V2 rules
 // or links a legacy reducer into this preview.
 return typeof source==='string'&&source.trim()?source:'assets/mark.svg';
}
function alertText(message){
 app.error=message;
 if(!IS_BATTLE_PAGE&&$('restart-notice'))$('restart-notice').textContent=message;
 render();
}
function pushHistory(text){
 app.history.unshift(text); // Retain the full human-readable trace for bug reports.
}
let publicMoveSerial=0;
function notePublicMove(packs,before,after,action,player){
 const cards=collectPublicCardResults(packs,before,after,action);
 if(!cards.length)return;
 const actor=player===0?'你':'電腦';
 app.publicMoves.unshift({id:++publicMoveSerial,actor,cards});
 if(app.publicMoves.length>16)app.publicMoves.length=16;
}
function publicMoveTile(card){
 const side=card.owner===0?0:1;
 const name=card.name||card.cardId;
 const art=el('img',{src:imgUrl(side,card.cardId),alt:name,loading:'lazy',decoding:'async'});
 art.onerror=()=>{
  if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(art))return;
  if(!art.src.endsWith('/assets/mark.svg'))art.src='assets/mark.svg';
 };
 const tile=el('figure',{class:'trigger-tile'});
 tile.append(el('span',{class:'choice-card-art'},art),
  el('figcaption',{},el('b',{text:name}),
   el('span',{text:(side===0?'你':'電腦')+' · '+(card.label||'公開')})));
 return tile;
}
// A public search or a card sent outside/removed is a one-time window,
// the same shape as a revealed life trigger. One tap closes it.
function publicMoveOverlay(){
 if(app.state?.pending)return null;
 const latest=app.publicMoves[0];
 if(!latest?.cards?.length||app.dismissedPublicMoveIds.has(latest.id))return null;
 const overlay=el('div',{class:'overlay v2-trigger-overlay v2-public-move-overlay',
  role:'presentation','aria-label':'公開卡片提示'});
 const board=el('section',{class:'trigger-board',role:'dialog','aria-modal':'true',
  'aria-label':'公開的卡片，點一下關閉',tabindex:'0'});
 board.append(el('h2',{text:'公開的卡片'}),
  el('p',{class:'note',text:latest.actor+'公開了這些卡。點一下畫面即可關閉。'}));
 const row=el('div',{class:'trigger-row'});
 for(const card of latest.cards.slice(0,12))row.append(publicMoveTile(card));
 board.append(row);
 overlay.append(board);
 const dismiss=()=>{
  app.dismissedPublicMoveIds.add(latest.id);
  clearPublicMoveOverlay();
 };
 overlay.addEventListener('click',dismiss);
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'||event.key==='Enter'||event.key===' '){
   event.preventDefault();dismiss();
  }
 });
 return overlay;
}
function cardFace(physical,side,{showStats=true,interactive=false,ready=null,selected=false}={}){
 const data=cardDef(side,physical.cardId),color=data?.color||'';
 const printed=data?.name||physical.cardId;
 const box=el('div',{class:'cardface '+color+(selected?' selected':'')});
 const pic=el('img',{src:imgUrl(side,physical.cardId),alt:printed,
  loading:'lazy',decoding:'async'});
 pic.onerror=()=>{
  if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(pic))return;
  if(!pic.src.endsWith('/assets/mark.svg'))pic.src='assets/mark.svg';
 };
 box.append(
  el('div',{class:'cardart'},pic),
  el('div',{class:'cardtitle',text:printed}),
  el('div',{class:'cardnums'},el('span',{text:physical.cardId}),
    showStats&&data?el('span',{text:'需'+data.energy+' / BP'+data.bp}):null)
 );
 if(ready!==null)box.append(el('div',{class:'ready-pill'+(ready?'':' rest-pill'),
  text:ready?'ACTIVE':'REST'}));
 if(interactive){
  box.tabIndex=0;box.role='button';
  box.setAttribute('aria-label','選取卡片 '+printed);
  const click=()=>{selectDeployedCharacter(physical.uid);app.selectedSide=side;render();};
  box.addEventListener('click',click);
  box.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click();}});
 }
 return box;
}
function zoneSlots(view,side,line,heading,legal){
 const ph=el('div',{class:'stage'});
 const label=el('div',{class:'line-heading'},el('strong',{text:heading}),
  el('span',{text:'4 個位置'}));
 const zones=el('div',{class:'zone'});
 for(let i=0;i<4;i++){
  const card=view.players[side][line][i];
  const ownTurn=side===0&&uiActor(app.state)===0&&!app.busy;
  const clickable=!!card&&ownTurn&&legal.some(a=>a.uid===card.uid||a.baseUid===card.uid);
  const selected=!!card&&card.uid===app.selectedUid;
  const slot=el('div',{class:'slot'+(!card?' empty':'')+
   (clickable?' actionable':'')+(selected?' highlight':'')});
  if(card){
   slot.append(cardFace(card,side,{ready:card.ready,interactive:clickable||side===0,
    selected}));
   // Read only the sanitized public view. Includes verified FRONT producers.
   if(Number.isInteger(card.produces))slot.append(
    el('div',{class:'small',text:'產能 '+card.produces}));
   if((card.raidDepth||card.raidLayers?.length))slot.append(
    el('div',{class:'small',text:'Raid 層數 '+(card.raidDepth||card.raidLayers.length)}));
  }else slot.textContent=String(i+1)+' · 空';
  zones.append(slot);
 }
 ph.append(label,zones);return ph;
}
function stats(view,side){
 const p=view.players[side],colors=Object.entries(p.energyByColor).filter(([,x])=>x>0)
  .map(([k,v])=>k+' '+v).join(' / ');
 return el('div',{class:'stats'},
  el('span',{},'生命 ',el('strong',{text:p.lifeCount})),
  el('span',{},'牌庫 ',el('strong',{text:p.deckCount})),
  el('span',{},'手牌 ',el('strong',{text:p.handCount})),
  el('span',{},'AP ',el('strong',{text:p.apReady+'/'+p.apTotal})),
  el('span',{},'能源 ',el('strong',{text:p.energyTotal})),
  el('span',{text:colors}));
}
function sideBoard(view,side,legal){
 const panel=el('div',{class:'panel battle'});
 const you=side===0;
 panel.append(el('div',{class:'headline'},
  el('h2',{text:(you?'你':'電腦')+'｜'+fmtTitle(app.packs[side].id)}),
  el('span',{class:'tag',text:(app.state.active===side?'現在的回合':'等待回合')})),
 stats(view,side));
 panel.append(zoneSlots(view,side,'front','前線 FRONT',legal),
  zoneSlots(view,side,'energy','能源線 ENERGY',legal));
 if(!you){
  panel.append(el('div',{class:'decksummary'},
   el('span',{text:'手牌為隱藏資訊，不公開卡名及牌庫順序。'}),
   el('span',{text:'場外（公開）：'+view.players[side].outside.length+' 張'})));
 }else{
  panel.append(el('div',{class:'divider'}),el('h3',{text:'你的手牌（向左右滑動查看）'}));
  const hand=el('div',{class:'hand'});
  for(const item of view.players[0].hand)
   hand.append(cardFace(item,0,{interactive:true,selected:app.selectedUid===item.uid}));
  if(!view.players[0].hand.length)hand.append(el('div',{class:'small',text:'手牌目前為空'}));
  panel.append(hand);
  const outside=view.players[0].outside;
  panel.append(el('details',{},
   el('summary',{class:'small',text:'查看己方公開場外（'+outside.length+' 張）'}),
   el('div',{class:'decksummary'},...outside.slice(-28).reverse().map(x=>
    el('span',{class:'count-pill',text:cardDef(0,x.cardId)?.name||x.cardId})))));
 }
 return panel;
}
function actionButton(a,legal){
 const text=uiActionLabel(a,{pack:app.packs,state:app.state})+
  (a.replaceUid?'（需替換原位置角色）':'');
 return btn(text,()=>applyAction(a),a.type==='next'?'quiet':
  a.uid===app.selectedUid?'recommended':'');
}
function choices(legal){
 const s=app.state,actor=uiActor(s);
 const side=el('div',{class:'sidebar'});
 const control=el('div',{class:'panel'});
 const current=el('div',{class:'headline'},
  el('h2',{text:'可執行操作'}),
  el('span',{class:'tag',text:'合法操作 '+legal.length}));
 control.append(current);
 if(actor===1){
  control.append(el('p',{class:'note',text:'現在由電腦處理操作。'}));
 }else if(s.pending){
  control.append(el('p',{class:'note',text:'目前有必須完成的效果選擇；請使用中央的選擇視窗。'}));
 }else{
  const main=el('div',{class:'action-list'});
  const passive=legal.filter(a=>['next','extraDraw'].includes(a.type));
  const selected=app.selectedUid?visibleActionsForCard(legal,app.selectedUid):[];
  const list=app.allActions?legal:
   selected.length?[...passive,...selected.filter(a=>!passive.includes(a))]:passive;
  const distinct=[...new Set(list.map(a=>JSON.stringify(a)))].map(v=>JSON.parse(v));
  for(const a of distinct.slice(0,110))main.append(actionButton(a,legal));
  control.append(main);
  if(!app.allActions){
   control.append(el('p',{class:'note',text:selected.length?
    '已選取卡片，請選擇登場位置／突襲底板／攻擊等合法操作。':
    '點選自己的手牌、前線或能源線卡片，顯示可執行的合法操作。'}));
  }
  control.append(btn(app.allActions?'僅顯示選取卡片':'查看全部合法操作',
   ()=>{app.allActions=!app.allActions;render();},'quiet'));
 }
 side.append(control);
 const tools=el('div',{class:'panel'});
 tools.append(el('h3',{text:'對局工具'}),el('div',{class:'inline-actions'},
  btn('重新開始',()=>startGame(), 'quiet'),
  btn('復原操作',()=>undoMove(),'quiet'),
  btn('下載對局記錄',downloadHistory,'quiet'),
  btn('下載除錯重播 JSON',downloadReplay,'quiet')));
 if(app.busy)tools.append(el('p',{id:'loading',text:'電腦正在結算與思考…'}));
 tools.append(el('p',{class:'note',text:'本機端測試；公開紀錄不顯示電腦隱藏選牌。除錯重播檔包含雙方完整選牌步驟，請勿公開分享。'}));
 side.append(tools);
 const log=el('div',{class:'panel'});
 log.append(el('h3',{text:'對局紀錄'}),el('ol',{class:'history'},
  ...app.history.slice(0,28).map(x=>el('li',{text:x}))));
 side.append(log);return side;
}
function choicePicture(cardId,name,side=0){
 const picture=el('img',{src:imgUrl(side,cardId),alt:name||cardId,
  loading:'eager',decoding:'async'});
 picture.onerror=()=>{
  if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(picture))return;
  if(!picture.src.endsWith('/assets/mark.svg'))picture.src='assets/mark.svg';
 };
 return picture;
}
const TRIGGER_WORD={draw:'DRAW',get:'GET',active:'ACTIVE',special:'SPECIAL',color:'COLOR',raid:'RAID',final:'FINAL'};
function triggerTile(card){
 const who=card.owner===0?'你':'電腦';
 const word=TRIGGER_WORD[card.trigger]||(card.trigger?String(card.trigger):'無觸發');
 const tile=el('figure',{class:'trigger-tile'+(card.checking?' checking':'')});
 const art=el('span',{class:'choice-card-art'},choicePicture(card.cardId,card.name,card.owner));
 tile.append(art,el('figcaption',{},el('b',{text:card.name||card.cardId}),
  el('span',{text:who+' · '+word})));
 return tile;
}
function triggerCards(view){
 const open=Array.isArray(view?.openTriggers)?view.openTriggers:[];
 const reveals=(view?.publicReveals||[]).filter(item=>item&&item.cardId&&item.kind==null);
 const seen=new Set();
 const cards=[];
 for(const card of open){
  if(!card?.uid||seen.has(card.uid))continue;
  seen.add(card.uid);
  cards.push(card);
 }
 for(const reveal of reveals){
  if(!reveal.uid||seen.has(reveal.uid))continue;
  seen.add(reveal.uid);
  const printed=cardDef(reveal.owner,reveal.cardId);
  cards.push({owner:reveal.owner,uid:reveal.uid,cardId:reveal.cardId,
   name:printed?.name||reveal.cardId,trigger:reveal.trigger||null,checking:false});
 }
 const checking=cards.filter(card=>card.checking);
 const rest=cards.filter(card=>!card.checking).slice(-6);
 return [...checking,...rest];
}
function triggerBoard(view){
 // Public life reveals are one-time notifications, not a persistent table header.
 // Pending resolutions keep their existing mandatory legal-choice dialog.
 if(app.state?.pending)return null;
 const cards=triggerCards(view).filter(card=>!app.dismissedTriggerKeys.has(card.owner+':'+card.uid));
 if(!cards.length)return null;
 const overlay=el('div',{class:'overlay v2-trigger-overlay',
  role:'presentation','aria-label':'觸發公開提示'});
 const board=el('section',{class:'trigger-board',role:'dialog','aria-modal':'true',
  'aria-label':'公開觸發，點一下關閉',tabindex:'0'});
 board.append(el('h2',{text:'公開觸發'}),
  el('p',{class:'note',text:'翻開的生命卡已公開。點一下畫面即可關閉。'}));
 const row=el('div',{class:'trigger-row'});
 for(const card of cards)row.append(triggerTile(card));
 board.append(row);
 const lines=app.history.filter(line=>typeof line==='string'&&line.includes('：觸發 ')).slice(0,4);
 if(lines.length){
  const list=el('ul',{class:'trigger-log'});
  for(const text of lines)list.append(el('li',{text}));
  board.append(list);
 }
 overlay.append(board);
 const dismiss=()=>{
  for(const card of cards)app.dismissedTriggerKeys.add(card.owner+':'+card.uid);
  clearTriggerOverlay();
 };
 overlay.addEventListener('click',dismiss);
 overlay.addEventListener('keydown',event=>{
  if(event.key==='Escape'||event.key==='Enter'||event.key===' '){
   event.preventDefault();dismiss();
  }
 });
 return overlay;
}

function pendingChoiceControl(action,option,gallery,view){
 const label=uiActionLabel(action,{pack:app.packs,state:app.state});
 // Private options already carry their controller-authorized artwork. If
 // absent, use only the exact card UID from publicly visible field slots.
 const authorized=pendingChoiceCards(option).map(card=>({...card,side:0}));
 const visible=authorized.length?[]:visiblePendingChoiceCards(view,action).map(card=>({
  ...card,name:cardDef(card.side,card.cardId)?.name||card.cardId
 }));
 const target=authorized.length||visible.length?null:publicPendingTargetCard(view,action);
 const lifeOrder=authorized.length||visible.length||target?null:
  publicLifeOrderChoiceCard(view,app.state?.pending,action);
 const local=authorized.length||visible.length||target||lifeOrder?[]:
  controllerChoiceArt(app.packs,app.state,action);
 const cards=authorized.length?authorized:visible.length?visible:target?
  [{...target,name:cardDef(target.side,target.cardId)?.name||target.cardId}]:
  lifeOrder?[{...lifeOrder,name:cardDef(lifeOrder.side,lifeOrder.cardId)?.name||lifeOrder.cardId}]:
  local;
 if(!cards.length){
  const tone=pendingTextChoiceClass(action);
  return btn(label,()=>applyAction(action),
   [tone,gallery?'choice-text':''].filter(Boolean).join(' '));
 }
 const names=cards.map(card=>card.name);
 const caption=pendingChoiceCaption(label,names);
 const location=target?(target.side===0?'我方':'敵方')+' · '+
  (target.line==='front'?'前線':'能源線')+' '+(target.index+1)+
  (Number.isInteger(target.bp)?' · BP '+target.bp:''):'';
 const spoken=names.every(name=>label.includes(name))?label:label+'｜'+names.join('、');
 const button=el('button',{type:'button',class:'choice-card recommended',
  'aria-label':spoken+(location?'｜'+location:''),onClick:()=>applyAction(action)});
 const arts=el('span',{class:'choice-card-arts'});
 for(const card of cards)
  arts.append(el('span',{class:'choice-card-art'},choicePicture(card.cardId,card.name,card.side)));
 button.append(arts,el('span',{class:'choice-card-name',text:names.join(' ＋ ')}));
 if(location)button.append(el('span',{class:'choice-card-location',text:location}));
 if(caption)button.append(el('span',{class:'choice-card-caption',text:caption}));
 return button;
}
// For a mixed effect, picking a card is not playing it. Only an exact
// reducer-approved placement submitted on the table can resolve its entry.
function pendingEntrySelectControl(card){
 const name=(card.cardId?cardDef(card.side,card.cardId)?.name:null)||card.name;
 const button=el('button',{type:'button',class:'choice-card recommended',
  'aria-label':'選擇 '+name+' 登場（尚未執行）',
  onClick:()=>{selectDeployedCharacter(card.uid);render();}});
 if(card.cardId)button.append(el('span',{class:'choice-card-arts'},
  el('span',{class:'choice-card-art'},choicePicture(card.cardId,name,card.side))));
 button.append(el('span',{class:'choice-card-name',text:name}),
  el('span',{class:'choice-card-caption',text:'選擇此角色登場 · 再選方式與格子'}));
 return button;
}
function inspectedChoiceControl(card){
 const enabled=!!card.action;
 const button=el('button',{type:'button',disabled:!enabled,
  class:'choice-card '+(enabled?'recommended':'v2-ineligible'),
  'aria-label':card.name+(enabled?'，符合條件，可選擇':'，不符合條件，無法選擇'),
  ...(enabled?{onClick:()=>applyAction(card.action)}:{})});
 button.append(
  el('span',{class:'choice-card-arts'},
   el('span',{class:'choice-card-art'},choicePicture(card.cardId,card.name,0))),
  el('span',{class:'choice-card-name',text:card.name}),
  el('span',{class:'choice-card-caption',text:card.caption||
   (enabled?'符合條件 · 點選此牌':'不符合條件 · 無法選擇')})
 );
 return button;
}
function attackShowcase(battle){
 const figure=el('figure',{class:'attack-showcase'});
 const art=el('span',{class:'choice-card-art'},choicePicture(battle.cardId,battle.name,battle.owner));
 figure.append(art,el('figcaption',{},
  el('b',{text:battle.name||battle.cardId}),
  el('span',{class:'attack-tags',text:attackBattleTags(battle).join(' · ')})));
 return figure;
}
function blockControl(action,view){
 if(action?.type!=='chooseBlock')return null;
 if(action.uid===null)return btn('不阻擋',()=>applyAction(action),'quiet choice-text');
 const card=(view.players?.[0]?.front||[]).find(c=>c?.uid===action.uid);
 if(!card)return null;
 const name=cardDef(0,card.cardId)?.name||card.cardId;
 const button=el('button',{type:'button',class:'choice-card recommended',
  'aria-label':'使用 '+name+' 阻擋 BP '+card.bp,onClick:()=>applyAction(action)});
 button.append(el('span',{class:'choice-card-arts'},
  el('span',{class:'choice-card-art'},choicePicture(card.cardId,name,0))),
  el('span',{class:'choice-card-name',text:name}),
  el('span',{class:'choice-card-caption',text:'BP '+card.bp+' · 阻擋'}));
 return button;
}
function blockBoardPrompt(decision){
 const {battle,blockers,skipAction}=decision;
 const prompt=el('div',{class:'v2-block-prompt',role:'group','aria-label':'場上阻擋選擇'});
 const keywords=attackKeywordBadges(battle);
 const meta=el('span',{class:'v2-block-battle-meta'},
  el('b',{text:'BP '+(Number.isInteger(battle.bp)?battle.bp:'—')}),
  ...keywords.map(({type,text})=>el('em',{class:'v2-attack-keyword v2-keyword-'+type,text})),
  el('span',{class:'v2-block-hint',text:blockers.length?'點卡圖阻擋':'無可阻擋角色'}));
 prompt.append(el('div',{class:'v2-block-summary',role:'status'},
  el('strong',{text:(battle.name||battle.cardId)+' 正在攻擊'}),meta));
 if(skipAction)prompt.append(btn('不阻擋',()=>applyAction(skipAction),'btn v2-block-skip'));
 return prompt;
}
function pendingDialog(legal,view){
 const s=app.state;
 if(!s?.pending||uiActor(s)!==0||app.busy)return null;
 // A mixed hand/outside/removed effect needs an illustrated target picker.
 // Once the target has been selected, dismiss this overlay so the player can
 // choose ordinary/Raid mode (if needed) and the actual legal board cell.
 const placement=legal.filter(action=>boardEntryMode(action));
 if(placement.length&&app.selectedUid)return null;
 // Blocking happens on the visible table; all other pending effects retain
 // their existing mandatory choice dialogs.
 if(inlineBlockDecision(view,legal))return null;
 const privateChoices=universalPrivateChoices(app.packs,s,0);
 const byAction=new Map((privateChoices?.options||[])
  .filter(option=>option?.action)
  .map(option=>[JSON.stringify(option.action),option]));
 const entryCards=placement.length?pendingEntryChoiceCards(privateChoices,view,placement):[];
 const inspected=inspectedPendingChoiceCards(privateChoices,legal).filter(card=>!card.keepLegal);
 const windowCards=inspected.length?[]:controllerDeckWindowCards(s,app.packs,legal)
  .filter(card=>!card.keepLegal);
 const pictured=[...inspected,...windowCards];
 const picturedUids=new Set(pictured.map(card=>card.uid));
 const rows=legal.filter(action=>!boardEntryMode(action)&&!picturedUids.has(action.uid)).map(action=>({action,
  option:byAction.get(JSON.stringify(action))||null}));
 const gallery=entryCards.length>0||pictured.length>0||rows.some(row=>pendingChoiceCards(row.option).length>0||
  visiblePendingChoiceCards(view,row.action).length>0||
  publicPendingTargetCard(view,row.action)!==null||
  publicLifeOrderChoiceCard(view,s.pending,row.action)!==null||
  controllerChoiceArt(app.packs,s,row.action).length>0);
 const title=s.pending.kind==='effect-look-take'&&s.pending.phase==='order'?
  '依序放回牌庫底':(V2_PENDING_LABELS[s.pending.kind]||s.pending.kind);
 const triggerChoice=s.pending.kind==='life-trigger';
 const blocking=s.pending.kind==='block'&&view.battle;
 // A view-only pause: no action, state transition, or hidden-card disclosure.
 const canPeek=!triggerChoice&&!blocking&&(gallery||
  /top|search|look|inspect|deck|outside|hand/i.test(s.pending.kind));
 if(canPeek&&app.inspectionPaused){
  return el('div',{class:'v2-inspection-return',role:'status'},
   el('span',{text:'正在查看場面與手牌 · 效果選擇尚未完成'}),
   btn('返回選牌',()=>{app.inspectionPaused=false;render();},'btn primary'));
 }
 const overlay=el('div',{class:'overlay'});
 const dialog=el('div',{class:'dialog panel pending'+(gallery?' pending-cards':''),
  role:'dialog','aria-modal':'true','aria-label':title});
 const blockGallery=blocking&&rows.some(row=>row.action.type==='chooseBlock'&&row.action.uid);
 const shown=triggerChoice?triggerCards(view).filter(card=>card.checking):[];
 if(blockGallery)dialog.classList.add('pending-cards');
 dialog.append(el('div',{class:'headline'},el('h2',{text:title}),
  el('span',{class:'tag',text:'玩家操作'})));
 // Native Element.append(null) renders the literal word "null" in some browsers.
 if(canPeek)dialog.append(el('div',{class:'v2-inspection-peek-tools'},
   btn('查看場面與手牌',()=>{app.inspectionPaused=true;render();},
    'btn v2-inspection-peek-btn'),
   el('span',{text:'可暫時查看場面與手牌，不會取消這次選牌。'})));
 dialog.append(el('p',{class:'note',text:triggerChoice?
   '這張觸發已經公開，對手也能看到。請選擇是否使用。':
   blocking?'對手的角色正在攻擊。先看直傷和衝擊，再選擇阻擋或不阻擋。':
   placement.length?'先點卡圖選擇要登場的角色；若要加入手牌，直接點該卡的加入手牌選項。選好登場角色後，再選合法模式及格子。':
   '請完成這個選擇後，對戰才會繼續。選牌只會顯示給目前的控制者。'}));
 if(blocking)dialog.append(attackShowcase(view.battle));
 if(shown.length){
  const row=el('div',{class:'trigger-row'});
  for(const card of shown)row.append(triggerTile(card));
  dialog.append(row);
 }
 const list=el('div',{class:'action-list'+((gallery||blockGallery)?' choice-gallery':'')});
 for(const card of entryCards)list.append(pendingEntrySelectControl(card));
 for(const card of pictured)list.append(inspectedChoiceControl(card));
 for(const row of rows){
  const blocker=blocking?blockControl(row.action,view):null;
  list.append(blocker||pendingChoiceControl(row.action,row.option,gallery||blockGallery,view));
 }
 dialog.append(list);
 overlay.append(dialog);
 // Mount on the shell, above the sticky header. Inside #match-view the
 // header's stacking context covers the top of a tall card gallery.
 mountPendingOverlay(overlay);
 return null;
}
function finishMessage(){
 const s=app.state;
 if(s?.status!=='finished')return null;
 const isWin=s.winner===0;
 return el('div',{class:'panel '+(isWin?'win':'lose')},
  el('h2',{text:isWin?'你獲勝了！':'電腦獲勝了'}),
  el('p',{class:'note',text:'結束原因：'+s.endReason+'。這是 V2 引擎測試結果，不代表全部日本官方 FAQ 已驗收。'}));
}
// V2 rules + classic BLEACH Arena table. These are presentation-only adapters.
 // Every command comes from the V2 legal action list; no old reducer is imported.
function legacySlot(view,side,line,index,legal){
 const v=view.players[side],c=v[line][index];
 const yours=side===0&&uiActor(app.state)===0&&!app.busy;
 const blocking=!app.busy?inlineBlockDecision(view,legal):null;
 const blockAction=yours&&line==='front'&&c?
  blocking?.blockers.find(a=>a.uid===c.uid):null;
 const attacking=!!c&&line==='front'&&view.battle?.owner===side&&view.battle.uid===c.uid;
 const attackBadges=c&&line==='front'?frontAttackKeywordBadges(app.packs,app.state,side,index):[];
 const selected=!!c&&c.uid===app.selectedUid;
 const moving=yours&&app.state.phase==='move';
 const plan=!yours||blocking?{type:'select'}:moving&&!legal.some(action=>boardEntryMode(action))?
  moveClickPlan({selectedUid:app.selectedUid,slotUid:c?.uid||null,line,slot:index,legal}):
  entryClickPlan({selectedUid:app.selectedUid,entryMode:app.entryMode,raidBaseUid:app.raidBaseUid,
   line,slot:index,slotUid:c?.uid||null,legal});
 const raidBase=!!c&&c.uid===app.raidBaseUid;
 const pickRaidBase=plan.type==='raid-base';
 const moveSource=plan.type==='choose-mover';
 const moveDest=plan.type==='destination';
 const entryDest=plan.type==='entry';
 const place=moveDest||entryDest;
 const d=c?cardDef(side,c.cardId):null;
 const placement=moveDest?'移動至此':moveSource?'點選移動角色':
  entryDest?(plan.mode==='raid'?(line==='energy'?'突襲留後線':'突襲進場'):'普通進場'):
  pickRaidBase?'選為突襲底座':raidBase?'已選突襲底座':'';
 const btnSlot=el('button',{type:'button',class:'slot'+(c?' occupied':'')+
  (c&&!c.ready?' rested':'')+(selected?' selected':'')+
  (attacking?' v2-attacking':'')+(attackBadges.length?' v2-has-attack-keywords':'')+
  (blockAction?' v2-can-block':'')+
  (moveSource?' move-source':'')+(pickRaidBase||raidBase?' raid-base':'')+
  (place?' destination':''),
  'aria-label':(side===0?'你的':'對手的')+(line==='front'?'前線':'能源線')+
   (index+1)+(d?' '+d.name:' 空位')+(placement?'，'+placement:'')+
   (attacking?'，攻擊中':'')+
   (attackBadges.length?'，'+attackBadges.map(b=>b.text).join('，'):'')+
   (blockAction?'，阻擋，BP '+c.bp:''),
  'data-placement':placement});
 if(c){
  btnSlot.dataset.v2CardUid=c.uid;
  const art=el('img',{class:'art',src:imgUrl(side,c.cardId),alt:d?.name||c.cardId,loading:'lazy'});
  art.onerror=()=>{
   if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(art))return;
   if(!art.src.endsWith('/assets/mark.svg'))art.src='assets/mark.svg';
  };
  const face=el('span',{class:'slotFace'},art);
  if(c.raidDepth||c.raidLayers?.length)
   face.append(el('span',{class:'slotStack',text:'RAID '+(c.raidDepth||c.raidLayers.length)}));
  face.append(el('span',{class:'slotBp'},el('b',{text:line==='front'?String(c.bp):'◆ '+String(c.produces??0)})));
  btnSlot.append(face);
  // Visible FRONT keywords persist without an active attack; REST rotates only the face.
  if(attackBadges.length)btnSlot.append(el('span',
   {class:'v2-attack-keywords v2-attack-keywords-card','aria-hidden':'true'},
   ...attackBadges.map(({type,text})=>el('em',
    {class:'v2-attack-keyword v2-keyword-'+type,text}))));
  if(blockAction)btnSlot.append(el('span',{class:'v2-block-option',text:'阻擋','aria-hidden':'true'}));
 }else btnSlot.append(el('span',{class:'slotIndex',text:'0'+(index+1)}));
 let held=false;
 if(c){
  let originX=0,originY=0;
  const stopHold=()=>{clearTimeout(fieldHold);fieldHold=0;};
  btnSlot.addEventListener('pointerdown',event=>{
   if(event.button>0)return;
   held=false;originX=event.clientX;originY=event.clientY;
   stopHold();
   fieldHold=setTimeout(()=>{held=true;showFieldSheet(side,line,c,d);},FIELD_HOLD_MS);
  });
  btnSlot.addEventListener('pointerup',stopHold);
  btnSlot.addEventListener('pointercancel',stopHold);
  btnSlot.addEventListener('pointermove',event=>{
   if(Math.hypot(event.clientX-originX,event.clientY-originY)>16)stopHold();
  });
  btnSlot.addEventListener('contextmenu',event=>event.preventDefault());
 }
 btnSlot.addEventListener('click',()=>{
  if(held){held=false;return;}
  if(app.inspectionPaused){if(c)showFieldSheet(side,line,c,d);return;}
  // Display public opponent card art on tap; no game action is dispatched.
  if(!yours){if(c)showFieldSheet(side,line,c,d);return;}
  if(blocking){
   if(blockAction){applyAction(blockAction);return;}
   if(c)showFieldSheet(side,line,c,d);
   return;
  }
  if(plan.type==='raid-base'){
   app.raidBaseUid=plan.baseUid;app.entryMode='raid';app.targetChoices=null;render();return;
  }
  if(plan.type==='choose-mover'){
   app.selectedUid=app.selectedUid===plan.uid?null:plan.uid;
   app.selectedSide=0;app.entryMode=null;app.raidBaseUid=null;
   app.targetChoices=null;app.allActions=false;render();return;
  }
  if(plan.type==='destination'||plan.type==='entry'){
   const acts=plan.actions||[];
   if(acts.length===1){applyAction(acts[0]);return;}
   if(acts.length>1){app.targetChoices=acts;render();}
   return;
  }
  if(plan.type==='entry-mode'||plan.type==='entry-wait')return;
  if(c){selectDeployedCharacter(c.uid);app.selectedSide=side;render();}
 });
 return btnSlot;
}
function legacyLine(view,side,line,legal){
 const p=view.players[side],label=el('span',{class:'lineLabel '+line,text:line==='front'?'前線 FRONT':'能源 ENERGY'});
 const slots=el('div',{class:'slots'});
 for(let i=0;i<4;i++)slots.append(legacySlot(view,side,line,i,legal));
 const piles=el('div',{class:'piles'});
 const yours=side===0&&uiActor(app.state)===0&&!app.busy;
 if(line==='front'){
  piles.append(el('div',{class:'pile'},'DECK',el('b',{text:p.deckCount})),
   el('div',{class:'pile'},'HAND',el('b',{text:p.handCount})));
 }else{
  // Public pile buttons are inspectors. Own playable cards can also be selected.
  for(const [zone,label] of [['outside','場外'],['removed','移除區']]){
   const cards=p[zone]||[];
   const canBring=yours&&cards.some(card=>legal.some(action=>
    boardEntryMode(action)&&action.uid===card.uid));
   const chosen=side===0&&cards.some(card=>card.uid===app.selectedUid);
   piles.append(el('button',{type:'button',class:'pile v2-zone-pile'+
    (canBring?' v2-zone-playable':'')+(chosen?' selected':''),
    'data-v2-zone':zone,'aria-label':(side===0?'我方':'對手')+label+'：'+cards.length+
     ' 張，查看清單'+(canBring?'，可選擇登場':''),
    onClick:()=>showZoneSheet(side,zone)},
    el('span',{text:label}),el('b',{text:cards.length})));
  }
 }
 return el('div',{class:'lineGroup'},label,slots,piles);
}
function legacyLife(count){
 const life=el('div',{class:'lifeRow'},el('span',{class:'lifeText'},'LIFE ',el('b',{text:count})));
 for(let i=0;i<count;i++)life.append(el('span',{class:'lifeCard','aria-hidden':'true',text:'✦'}));
 return life;
}
function legacyPlayer(view,side,legal){
 const p=view.players[side],mine=side===0;
 const resources=el('div',{class:'playerResources'});
 const colorStr=Object.entries(p.energyByColor).filter(([,v])=>v>0)
  .map(([k,v])=>k+' '+v).join(' / ')||'◆ 0';
 resources.append(el('span',{class:'energyCount',text:colorStr}));
 const ap=el('div',{class:'apDots','aria-label':p.apReady+'/'+p.apTotal+' AP'});
 for(let i=0;i<3;i++)ap.append(el('i',{class:i<p.apReady?'available':i>=p.apTotal?'locked':''}));
 ap.append(el('span',{text:'AP'}));resources.append(ap);
 const info=el('header',{class:'playerInfo'},
  el('div',{class:'playerName'},el('span',{class:'avatar'+(mine?'':' opponent'),text:mine?'Ⅰ':'Ⅱ'}),
   el('div',{},el('b',{text:(mine?'你':'電腦')+' · '+fmtTitle(app.packs[side].id)}),
    el('small',{text:app.state.active===side?'目前回合':'等待回合'}))),resources);
 const area=el('section',{class:'playerArea'+(mine?'':' opponent'),
  'aria-label':mine?'你的場地':'電腦場地'},info);
 if(mine){area.append(legacyLine(view,side,'front',legal),legacyLine(view,side,'energy',legal),legacyLife(p.lifeCount));}
 else{area.append(legacyLife(p.lifeCount),legacyLine(view,side,'energy',legal),legacyLine(view,side,'front',legal));}
 return area;
}
function legacyHand(view,legal){
 const cards=view.players[0].hand||[];
 const hand=el('div',{class:'hand',style:'--hand-wide:'+Math.max(1,Math.min(cards.length,9))});
 for(const c of cards){
  const d=cardDef(0,c.cardId)||{},selected=app.selectedUid===c.uid;
  const playable=legal.some(a=>a.uid===c.uid&&(!!boardEntryMode(a)||a.type==='event'));
  const card=el('button',{type:'button',class:'handCard '+(selected?'selected ':'')+
   (playable?'playable':'unplayable'),'aria-label':d.name||c.cardId});
  card.dataset.v2CardUid=c.uid;
  const picture=el('img',{src:imgUrl(0,c.cardId),alt:d.name||c.cardId,loading:'lazy'});
  picture.onerror=()=>{
   if(app.packs?.[0]?.id==='gurren-lagann'&&ttgArtErrorFallback(picture))return;
   if(!picture.src.endsWith('/assets/mark.svg'))picture.src='assets/mark.svg';
  };
  card.append(picture,el('span',{class:'handCost',text:'◆ '+(d.energy??'?')}),
   el('span',{class:'handName',text:d.name||c.cardId}));
  // A hold opens the existing printed-art/effect sheet without selecting or playing.
  // Movement cancels the hold so players can still scroll the board normally.
  let held=false,originX=0,originY=0;
  const stopHold=()=>{clearTimeout(fieldHold);fieldHold=0;};
  card.addEventListener('pointerdown',event=>{
   if(event.button>0)return;
   held=false;originX=event.clientX;originY=event.clientY;
   stopHold();
   fieldHold=setTimeout(()=>{held=true;showFieldSheet(0,'hand',c,d);},FIELD_HOLD_MS);
  });
  card.addEventListener('pointerup',stopHold);
  card.addEventListener('pointercancel',stopHold);
  card.addEventListener('pointerleave',stopHold);
  card.addEventListener('pointermove',event=>{
   if(Math.hypot(event.clientX-originX,event.clientY-originY)>16)stopHold();
  });
  card.addEventListener('contextmenu',event=>event.preventDefault());
  card.addEventListener('click',()=>{
   if(held){held=false;return;}
   if(app.busy||uiActor(app.state)!==0)return;
   if(app.inspectionPaused){showFieldSheet(0,'hand',c,d);return;}
   selectDeployedCharacter(c.uid);render();
  });
  hand.append(card);
 }
 if(!cards.length)hand.append(el('span',{class:'small',text:'目前沒有手牌'}));
 // Desktop mouse wheels navigate overflowed hands horizontally; trackpad
 // horizontal gestures and normal wheel scrolling outside the hand are intact.
 if(IS_BATTLE_PAGE)hand.addEventListener('wheel',event=>{
  if(!window.matchMedia('(min-width:761px)').matches||
   hand.scrollWidth<=hand.clientWidth||
   Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
  const previous=hand.scrollLeft;
  hand.scrollLeft=Math.max(0,Math.min(hand.scrollWidth-hand.clientWidth,
   previous+event.deltaY));
  if(hand.scrollLeft!==previous)event.preventDefault();
 },{passive:false});
 return hand;
}
// Hide the large generic "legal actions" panel. Only surface contextual
// buttons that cannot be performed by tapping a card and its destination.
function selectDeployedCharacter(uid){
 app.selectedUid=uid;app.selectedSide=0;app.entryMode=null;app.raidBaseUid=null;
 app.targetChoices=null;app.allActions=false;
}
function ownListedCard(uid){
 const player=app.state?.players?.[0];
 if(!player||typeof uid!=='string')return null;
 for(const zone of ['hand','outside','removed']){
  const hit=(player[zone]||[]).find(card=>card?.uid===uid);
  if(hit)return hit;
 }
 return null;
}
function selectedCardName(){
 const card=ownListedCard(app.selectedUid);
 return card?cardDef(0,card.cardId)?.name||card.cardId:'';
}
function entryChoiceText(action){
 const text=uiActionLabel(action,{pack:app.packs,state:app.state});
 const base=action.baseUid?uiCardLabel(app.packs,app.state,action.baseUid):'';
 return text+(base&&base!=='指定卡片'&&!text.includes(base)?' · 底板 '+base:'')+
  (action.replaceUid?'（替換原位置）':'');
}
function legacyCommands(legal){
 const s=app.state;
 if(uiActor(s)!==0||app.busy)return null;
 if(app.inspectionPaused)return null; // review-only, choices remain pending
 const board=legal.some(action=>boardEntryMode(action));
 if(s.pending&&!board)return null;
 const selected=app.selectedUid?visibleActionsForCard(legal,app.selectedUid):[];
 const passive=s.pending?[]:legal.filter(a=>a.type==='extraDraw');
 const global=s.pending?[]:legal.filter(a=>!a.uid&&a.type!=='next'&&a.type!=='extraDraw');
 // Mixed effect non-entry choices live in the illustrated target dialog.
 const pendingRest=s.pending&&!board?legal.filter(action=>!boardEntryMode(action)):[];
 const pool=app.targetChoices||(app.selectedUid?[...passive,...selected]:[...passive,...global]);
 const list=[...new Map(pool.map(a=>[JSON.stringify(a),a])).values()]
  .filter(a=>app.targetChoices||(!boardEntryMode(a)&&!['move','step'].includes(a.type)))
  .slice(0,100);
 const selection=app.selectedUid?boardEntrySelection(legal,app.selectedUid):
  {normal:[],raid:[],needsMode:false};
 const paidRaid=selection.raid.some(a=>a.type==='raid');
 const chosen=paidRaid?(app.raidBaseUid?'raid':selection.normal.length?'normal':'raid'):
  selection.needsMode&&(app.entryMode==='normal'||app.entryMode==='raid')?
  app.entryMode:selection.needsMode?null:selection.raid.length?'raid':
  selection.normal.length?'normal':null;
 const effectRaid=selection.raid.length>0&&selection.raid.every(a=>a.type!=='raid');
 if(!list.length&&!board&&!app.targetChoices&&!pendingRest.length)return null;
 const bar=el('div',{class:'v2-compact-actions','aria-label':'登場與情境操作'});
 if(s.pending?.kind==='life-trigger'){
  const shown=triggerCards(universalPublicView(app.packs,s,0)).filter(card=>card.checking);
  if(shown.length){
   const row=el('div',{class:'trigger-row'});
   for(const card of shown)row.append(triggerTile(card));
   bar.append(row);
  }
 }
 const name=selectedCardName();
 if(app.targetChoices){
  const choices=app.targetChoices;
  const multiBase=choices.length>1&&choices.every(a=>boardEntryMode(a)==='raid'&&a.type!=='raid')&&
   new Set(choices.map(a=>a.baseUid)).size>1;
  bar.append(el('span',{class:'v2-compact-hint',text:multiBase?
   '此位置有多個合法突襲底座，請選一張底座。':'這個格子有多種登場方式，請選一個。'}));
  for(const a of list)bar.append(btn(entryChoiceText(a),()=>{
   app.targetChoices=null;applyAction(a);
  },'btn small primary'));
  bar.append(btn('取消選擇',()=>{app.targetChoices=null;render();},'btn small quiet'));
  return bar;
 }
 if(board&&!app.selectedUid)
  bar.append(el('span',{class:'v2-compact-hint',text:
   (s.pending?(V2_PENDING_LABELS[s.pending.kind]||'效果')+'。':'')+
   '先選擇要登場的角色。手牌直接點；場外或移除區請打開該區再點角色。'}));
 else if(selection.needsMode&&!chosen){
  bar.append(el('span',{class:'v2-compact-hint',text:(name?name+'：':'')+
   '選擇突襲進場或普通進場。'}));
  bar.append(btn('普通進場',()=>{app.entryMode='normal';app.raidBaseUid=null;app.targetChoices=null;render();},'btn small'));
  bar.append(btn('突襲進場',()=>{app.entryMode='raid';app.targetChoices=null;render();},'btn small primary'));
 }else if(chosen){
  bar.append(el('span',{class:'v2-compact-hint',text:(name?name+'：':'')+
   (paidRaid?(app.raidBaseUid?
    '一般突襲：已選好底座，請點合法登場位置（可點後線底座原位）。':
    selection.normal.length?
    '一般出牌：點合法格子普通登場；要突襲請先點底座，再點登場位置。':
    '一般突襲：先點合法底座，再點登場位置。'):
    chosen==='raid'?(effectRaid?
    '效果突襲：直接點亮起的登場位置；同格有多個合法底座時再選底座。':
    '先點合法底座，再點要登場的格子。'):
    '普通進場。請直接點要登場的格子。')}));
  if(selection.needsMode)bar.append(btn(chosen==='raid'?'改為普通進場':'改為突襲進場',()=>{
   app.entryMode=chosen==='raid'?'normal':'raid';app.raidBaseUid=null;app.targetChoices=null;render();
  },'btn small quiet'));
 }
 if(s.pending&&board&&app.selectedUid)bar.append(btn('重新選擇角色',()=>{
  app.selectedUid=null;app.entryMode=null;app.raidBaseUid=null;app.targetChoices=null;render();
 },'btn small quiet'));
 const shown=new Set();
 for(const a of list){
  shown.add(a);
  bar.append(btn(uiActionLabel(a,{pack:app.packs,state:s}),
   ()=>{app.targetChoices=null;applyAction(a);},'btn small quiet'));
 }
 for(const a of pendingRest){
  if(shown.has(a))continue;
  shown.add(a);
  const quiet=a.uid==null||a.mode==='skip'||a.mode==='decline'||a.mode==='hand';
  bar.append(btn(uiActionLabel(a,{pack:app.packs,state:s}),()=>applyAction(a),
   quiet?'btn small quiet':'btn small'));
 }
 return bar.childElementCount?bar:null;
}
// Keep an in-progress AI match alive when a mobile browser reloads the battle page.
// This private, same-tab snapshot is never shared with the opponent or Worker.
function saveBattleProgress(){
 if(!IS_BATTLE_PAGE||!app.launch||!app.state||!app.replay)return;
 try{
  const data={version:1,launchId:app.launch.config.id,state:app.state,replay:app.replay,
   history:app.history.slice(0,2500),recordNoted:app.recordNoted,
   aiCompletedSteps:app.aiCompletedSteps,lastAiProgress:app.lastAiProgress};
  sessionStorage.setItem(SOLO_BATTLE_PROGRESS_KEY,JSON.stringify(data));
 }catch{/* Private browsing/quota limits must not interrupt V2 legal gameplay. */}
}
function restoreBattleProgress(){
 if(!IS_BATTLE_PAGE||!app.launch)return false;
 try{
  const json=sessionStorage.getItem(SOLO_BATTLE_PROGRESS_KEY);
  if(!json||json.length>2200000)return false;
  const data=JSON.parse(json),cfg=app.launch.config;
  if(data.version!==1||data.launchId!==cfg.id||!data.state||!data.replay||
   !Array.isArray(data.history)||data.history.length>2500||
   data.replay.format!=='ua-universal-v2-preview'||
   data.replay.seed<1||data.replay.first!==cfg.first||
   data.replay.openingMulligan!==true||
   !Array.isArray(data.replay.initialCounts)||
   data.replay.initialCounts.length!==2||
   data.replay.initialCounts.some((counts,i)=>
    JSON.stringify(Object.entries(counts).sort())!==
    JSON.stringify(Object.entries(cfg.decks[i].counts).sort())))
   return false;
  assertUniversalMatch(app.packs,data.state);
  app.state=data.state;app.replay=data.replay;
  app.history=data.history.filter(x=>typeof x==='string').slice(0,2500);
  app.recordNoted=data.recordNoted===true;
  app.aiCompletedSteps=Number.isInteger(data.aiCompletedSteps)?data.aiCompletedSteps:0;
  app.lastAiProgress=typeof data.lastAiProgress==='string'?data.lastAiProgress.slice(0,100):'已恢復對局';
  app.error='';app.undo=null;app.selectedUid=null;app.entryMode=null;app.raidBaseUid=null;
  return true;
 }catch{return false;}
}
function noteAiRecord(state){
 if(app.recordNoted||!app.recordDeckId)return;
 if(state.winner!==0&&state.winner!==1)return;
 app.recordNoted=true;
 saveBattleProgress();
 try{recordDeckResult(localStorage,{deckId:app.recordDeckId,channel:'ai',win:state.winner===0,opponent:'電腦',at:new Date().toISOString()});}
 catch{/* A private browser can finish the match without storing a record. */}
}
function renderOpeningMulligan(target,s){
 const v=universalPublicView(app.packs,s,0),mine=v.players[0];
 const mineTurn=s.pending?.player===0;
 const panel=el('section',{class:'v2-mulligan panel','aria-label':'起手牌調度'},
  el('div',{class:'v2-mulligan-kicker',text:'OPENING HAND · 7 CARDS'}),
  el('h2',{text:mineTurn?'決定你的起手牌':'電腦正在決定是否調度'}),
  el('p',{class:'v2-mulligan-explain',text:
   '每位玩家可選擇保留，或將起手 7 張完整重抽一次。重抽時先把舊手牌放旁邊，抽新的 7 張後才把舊牌洗回牌庫。先手先決定，後手再決定，最後才放置生命卡。'}));
 const cards=el('div',{class:'v2-mulligan-hand'});
 for(const c of mine.hand){
  const d=cardDef(0,c.cardId)||{};
  const image=el('img',{src:imgUrl(0,c.cardId),alt:d.name||c.cardId,loading:'eager'});
  image.onerror=()=>{if(!image.src.endsWith('/assets/mark.svg'))image.src='assets/mark.svg';};
  cards.append(el('div',{class:'v2-mulligan-card'},image,
   el('span',{text:d.name||c.cardId})));
 }
 panel.append(cards);
 if(mineTurn){
  const legal=legalUniversalActions(app.packs,s);
  const decisions=el('div',{class:'v2-mulligan-decisions'});
  for(const action of legal){
   decisions.append(btn(uiActionLabel(action),()=>applyAction(action),
    action.mode==='keep'?'recommended':'quiet'));
  }
  panel.append(decisions,el('p',{class:'v2-mulligan-hint',text:'每人只有這一次調度機會，確認後不可再次重抽。'}));
 }else panel.append(el('p',{class:'v2-mulligan-hint',role:'status',text:'等待電腦完成調度；你的起手牌會維持隱私。'}));
 target.append(panel);
}
function printedCatalogue(side,cardId){
 return PRINTED_CATALOGUE[app.packs?.[side]?.id]?.get(cardId)||null;
}
function closeFieldSheet(){
 const overlay=document.querySelector('.v2-shell>.v2-field-overlay');
 const opener=overlay?._v2Opener;
 overlay?.remove();
 if(opener?.isConnected)opener.focus({preventScroll:true});
}
function showFieldSheet(side,line,card,printed){
 closeFieldSheet();
 const catalogue=printedCatalogue(side,card.cardId);
 const name=printed?.name||catalogue?.name||card.cardId;
 const stats=[];
 const metadata=printed||catalogue;
 if(metadata){
  stats.push('能源 '+metadata.energy,'AP '+metadata.ap);
  if(metadata.type==='character')stats.push('BP '+(line==='front'?card.bp:metadata.bp));
  if(line==='energy')stats.push('產生 '+(card.produces??metadata.gen??0));
  if(metadata.traits?.length)stats.push(metadata.traits.join('、'));
  if(metadata.trigger)stats.push('觸發 '+(TRIGGER_WORD[metadata.trigger]||metadata.trigger));
 }
 if(card.raidDepth||card.raidLayers?.length)stats.push('突襲 '+(card.raidDepth||card.raidLayers.length)+' 層');
 const overlay=el('div',{class:'overlay v2-field-overlay'});
 overlay._v2Opener=document.activeElement;
 const dialog=el('div',{class:'dialog panel field-sheet',role:'dialog','aria-modal':'true',
  'aria-label':name+' 的效果'});
 const art=el('img',{class:'art',src:imgUrl(side,card.cardId),alt:name});
 art.onerror=()=>{
  if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(art))return;
  if(!art.src.endsWith('/assets/mark.svg'))art.src='assets/mark.svg';
 };
 dialog.append(el('div',{class:'field-sheet-card'},art,
  el('div',{},el('h2',{text:name}),el('p',{class:'note',text:stats.join(' · ')}))),
  el('p',{class:'field-effect',text:fieldEffectCopy(catalogue)}),
  btn('關閉',closeFieldSheet,'quiet'));
 overlay.addEventListener('click',event=>{if(event.target===overlay)closeFieldSheet();});
 overlay.addEventListener('keydown',event=>{if(event.key==='Escape')closeFieldSheet();});
 overlay.append(dialog);
 (document.querySelector('.v2-shell')||document.body).append(overlay);
 dialog.querySelector('button')?.focus();
}

function closeZoneSheet(){
 const overlay=document.querySelector('.v2-shell>.v2-zone-overlay');
 const opener=overlay?._v2Opener;
 overlay?.remove();
 if(opener?.isConnected)opener.focus({preventScroll:true});
}
function showZoneSheet(side,zone){
 if(!app.state||!app.packs||!['outside','removed'].includes(zone))return;
 closeZoneSheet();
 const view=universalPublicView(app.packs,app.state,0);
 const cards=view.players[side]?.[zone]||[];
 const label=zone==='outside'?'場外':'移除區';
 const owner=side===0?'我方':'對手';
 const yours=side===0&&uiActor(app.state)===0&&!app.busy;
 const playable=new Set((yours?legalUniversalActions(app.packs,app.state):[])
  .filter(action=>boardEntryMode(action)).map(action=>action.uid));
 const overlay=el('div',{class:'overlay v2-zone-overlay'});
 overlay._v2Opener=document.activeElement;
 const dialog=el('section',{class:'v2-zone-dialog',role:'dialog',
  'aria-modal':'true','aria-label':owner+label,'tabindex':'-1'});
 const close=btn('關閉',closeZoneSheet,'v2-zone-close');
 dialog.append(el('header',{class:'v2-zone-header'},
  el('div',{},el('h2',{text:owner+'｜'+label}),
   el('p',{class:'v2-zone-subtitle',text:playable.size?
    '公開區域 · '+cards.length+' 張 · 點角色開始登場。查看效果不會出牌。':
    '公開區域 · '+cards.length+' 張 · 點卡圖可查看效果'})),
  close));
 const gallery=el('div',{class:'v2-zone-gallery'});
 for(const physical of [...cards].reverse()){
  const def=cardDef(side,physical.cardId);
  const printed=printedCatalogue(side,physical.cardId);
  const name=def?.name||printed?.name||physical.cardId;
  const art=el('img',{src:imgUrl(side,physical.cardId),alt:name,loading:'lazy'});
  art.onerror=()=>{
   if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(art))return;
   if(!art.src.endsWith('/assets/mark.svg'))art.src='assets/mark.svg';
  };
  const canPlay=playable.has(physical.uid);
  const figure=el('div',{class:'v2-zone-card'+(canPlay?' v2-zone-playable':'')});
  figure.append(el('button',{type:'button',class:'v2-zone-open',
   'aria-label':(canPlay?'選擇登場：':'查看 ')+name+' '+physical.cardId,
   onClick:()=>{
    if(!canPlay){showFieldSheet(side,zone,physical,def);return;}
    selectDeployedCharacter(physical.uid);
    closeZoneSheet();
    render();
   }},art,el('span',{class:'v2-zone-card-name',text:name}),
   el('small',{text:physical.cardId}),
   canPlay?el('em',{class:'v2-zone-badge',text:'可登場'}):null));
  if(canPlay)figure.append(el('button',{type:'button',class:'v2-zone-look',text:'查看效果',
   'aria-label':'查看 '+name+' 的效果',
   onClick:()=>showFieldSheet(side,zone,physical,def)}));
  gallery.append(figure);
 }
 dialog.append(cards.length?gallery:
  el('p',{class:'v2-zone-empty',role:'status',text:'目前'+label+'沒有卡牌'}));
 overlay.addEventListener('click',event=>{if(event.target===overlay)closeZoneSheet();});
 overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){
  event.preventDefault();closeZoneSheet();
 }});
 overlay.append(dialog);
 (document.querySelector('.v2-shell')||document.body).append(overlay);
 close.focus({preventScroll:true});
}
function clearPendingOverlay(){
 document.querySelector('.v2-shell>.v2-pending-overlay')?.remove();
}
function clearTriggerOverlay(){
 document.querySelectorAll('.v2-shell>.v2-trigger-overlay:not(.v2-public-move-overlay)')
  .forEach(node=>node.remove());
}
function clearPublicMoveOverlay(){
 document.querySelector('.v2-shell>.v2-public-move-overlay')?.remove();
}
function mountTriggerOverlay(overlay){
 clearTriggerOverlay();
 (document.querySelector('.v2-shell')||document.body).append(overlay);
 overlay.querySelector('.trigger-board')?.focus({preventScroll:true});
}
function mountPublicMoveOverlay(overlay){
 clearPublicMoveOverlay();
 (document.querySelector('.v2-shell')||document.body).append(overlay);
 overlay.querySelector('.trigger-board')?.focus({preventScroll:true});
}
function mountPendingOverlay(overlay){
 clearPendingOverlay();
 overlay.classList.add('v2-pending-overlay');
 (document.querySelector('.v2-shell')||document.body).append(overlay);
}
function render(){
 const target=$('match-view');if(!target)return;
 const oldScroll=window.scrollY;
 const oldHandScroll=target.querySelector('.hand')?.scrollLeft||0;
 const preserveScroll=target.childElementCount>0;
 // Only the live table is height-locked; mulligan and empty screens scroll normally.
 if(IS_BATTLE_PAGE)document.body.classList.toggle('v2-playing',
  !!app.state&&!(app.state.phase==='setup'&&app.state.pending?.kind==='opening-mulligan'));
 clearTimeout(fieldHold);fieldHold=0;
 closeZoneSheet();
 clearPendingOverlay();
 clearTriggerOverlay();
 clearPublicMoveOverlay();
 target.replaceChildren();
 if(!app.state){
  target.append(el('section',{class:'panel v2-empty'},
   el('h2',{text:'尚未開始對戰'}),
   el('p',{text:'請先在對戰設定頁選擇雙方牌組與 AI 難度，再開始 V2 對戰。'}),
   el('a',{href:'/universal-v2-preview.html',text:'返回對戰設定'})));
  return;
 }
 const s=app.state;
 if(s.phase==='setup'&&s.pending?.kind==='opening-mulligan'){
  renderOpeningMulligan(target,s);
  return;
 }
 const v=universalPublicView(app.packs,s,0),legal=legalUniversalActions(app.packs,s);
 const block=app.busy?null:inlineBlockDecision(v,legal);
 const mobileMenu=btn('☰ 對局選單',()=>{
  const header=mobileMenu.closest('.matchHeader');
  const open=header?.classList.toggle('tools-open')===true;
  mobileMenu.setAttribute('aria-expanded',String(open));
 },'v2-mobile-menu-toggle');
 mobileMenu.setAttribute('aria-expanded','false');
 mobileMenu.setAttribute('aria-label','開啟或關閉對局工具');
 const title=el('header',{class:'matchHeader'},
  el('h1',{},'UNION ARENA V2 ',el('span',{class:'textMuted',text:' / 舊版對戰介面'}),
   el('small',{class:'v2-client-version',text:' · '+CLIENT_RELEASE})),
  mobileMenu,
  el('div',{class:'matchControls'},
   btn('重開對局',()=>startGame(),'btn small'),
   btn('復原一步',()=>undoMove(),'btn small'),
   btn('下載紀錄',downloadHistory,'btn small'),
   btn('除錯重播',downloadReplay,'btn small'),
   s.status==='playing'&&uiActor(s)===1?
    btn('AI 沒反應？重新繼續',()=>{resetAi();app.error='';driveAi();},'btn small'):null,
   s.status==='playing'&&uiActor(s)===1?
    btn('手動推進 AI 一步',manualAiStep,'btn small'):null,
   s.status==='playing'&&uiActor(s)===1&&app.busy?
    btn('暫停 AI',()=>{resetAi();app.error='AI 已暫停，請按「手動推進 AI 一步」或重新繼續。';render();},'btn small'):null));
 target.append(title);
 if(s.status==='playing'&&uiActor(s)===1){
  target.append(el('div',{class:'panel v2-ai-status','aria-live':'polite'},
   el('b',{text:app.busy?'AI 自動操作中':'AI 目前暫停'}),
   el('span',{text:'　進度 '+app.aiCompletedSteps+' 步 · 最近：'+app.lastAiProgress+
    ' · 待處理合法動作 '+legal.length+
    '。若沒有反應，按上方「手動推進 AI 一步」；按一下就會使用 V2 合法動作推進一次。'})));
 }
 if(app.error)target.append(el('div',{class:'panel v2-error',role:'alert',text:app.error}));
 const revealed=triggerBoard(v);
 const arena=el('div',{class:'arena'});
 const next=legal.find(a=>a.type==='next');
 const middle=el('section',{class:'v2-middle-controls','aria-label':'目前回合與階段操作'});
 const phasesEl=el('div',{class:'phaseBar','aria-label':'回合階段'});
 for(const [n,name] of [['start','開始'],['move','移動'],['main','主要'],['attack','攻擊']])
  phasesEl.append(el('span',{class:s.phase===n?'current':'',text:name}));
 middle.append(phasesEl);
 if(block){
  arena.classList.add('v2-blocking');
  middle.classList.add('v2-block-controls');
  middle.replaceChildren(blockBoardPrompt(block));
 }
 if(next&&uiActor(s)===0&&!app.busy)
  middle.append(el('div',{class:'v2-middle-next'},
   btn(s.phase==='attack'?'結束回合 →':'下一階段 →',()=>applyAction(next),'btn primary')));
 if(s.status==='finished'){
  noteAiRecord(s);
  arena.append(el('div',{class:'resultBanner'},el('h2',{text:s.winner===0?'你獲勝了！':'電腦獲勝'})));
 }
 arena.append(legacyPlayer(v,1,legal),middle,legacyPlayer(v,0,legal));
 const handArea=el('section',{class:'handArea'},
  el('header',{class:'handTitle'},
   el('span',{text:'你的手牌 · '+v.players[0].hand.length+' 張'}),
   el('span',{text:'REST 仍可產生能源'})),
  legacyHand(v,legal),legacyCommands(legal));
 arena.append(handArea);
 const deploying=legal.some(action=>boardEntryMode(action));
 const phase=el('div',{class:'phaseAction'},el('p',{text:block?
  (block.skipAction?'點卡圖上的「阻擋」，或選擇「不阻擋」。':'請點卡圖上的「阻擋」。'):
  deploying&&uiActor(s)===0&&!app.busy?
   '先選角色。能選擇時再決定突襲進場或普通進場，最後直接點要登場的格子。':
  s.pending?'請完成效果選擇。':
  app.busy?'AI 正在思考與操作…':s.status==='finished'?'對局結束':
  uiActor(s)===1?'電腦回合已暫停，可按上方「AI 沒反應？重新繼續」。':
  '點手牌再點亮起的場上位置，即可用 V2 合法動作出牌。'}));
 if(app.error)phase.append(el('p',{class:'v2-error',role:'alert',text:app.error}));
 arena.append(phase);
 target.append(arena);
 const log=el('details',{class:'v2-log panel'},el('summary',{text:'對局紀錄（'+app.history.length+' 步）'}),
  el('ol',{class:'history'},...app.history.slice(0,70).map(x=>el('li',{text:x}))));
 target.append(log);
 if(IS_BATTLE_PAGE&&isDesktopBattlefield())mountDesktopBattlefield({
  arena,header:title,log,view:v,selectedUid:app.selectedUid,el,
  cardDefinition:cardDef,imageSource:imgUrl,printedCard:printedCatalogue,
  effectCopy:fieldEffectCopy,openCard:showFieldSheet,
  imageFallback:(image,side)=>{
   if(app.packs?.[side]?.id==='gurren-lagann'&&ttgArtErrorFallback(image))return;
   if(!image.src.endsWith('/assets/mark.svg'))image.src='assets/mark.svg';
  }
 });
 const prompt=pendingDialog(legal,v);if(prompt)target.append(prompt);
 if(revealed)mountTriggerOverlay(revealed);
 const publicWindow=publicMoveOverlay();
 if(publicWindow)mountPublicMoveOverlay(publicWindow);
 // Preserve hand position while the V2 board is re-rendered on each selection.
 const handAfterRender=target.querySelector('.hand');
 if(handAfterRender)handAfterRender.scrollLeft=oldHandScroll;
 // Replacing the entire match subtree must not jump the desktop viewport.
 if(IS_BATTLE_PAGE&&preserveScroll)window.scrollTo(window.scrollX,oldScroll);
}
function applyAction(a){
 if(!app.state||app.busy||uiActor(app.state)!==0)return;
 try{
  const legal=legalUniversalActions(app.packs,app.state);
  if(!isExactLegal(a,legal))throw Error('操作已非目前的合法動作，請重新選擇。');
  app.undo={state:app.state,history:app.history.slice(),replay:app.replay,
   publicMoves:app.publicMoves.slice()};
  const previous=app.state;
  app.state=dispatchUniversalAction(app.packs,app.state,a,{actor:0});
  assertUniversalMatch(app.packs,app.state);
  app.replay=appendUniversalReplay(app.replay,a,0);
  notePublicMove(app.packs,previous,app.state,a,0);
  pushHistory(publicPreviewActionLabel(app.packs,previous,app.state,a,0));
  saveBattleProgress();
  app.selectedUid=null;app.raidBaseUid=null;app.entryMode=null;app.targetChoices=null;app.inspectionPaused=false;app.error='';app.allActions=false;render();driveAi();
 }catch(e){alertText(e?.message||String(e));}
}
function undoMove(){
 if(!app.undo||app.busy)return;
 app.state=app.undo.state;app.history=app.undo.history;app.replay=app.undo.replay;
 app.publicMoves=app.undo.publicMoves||[];
 app.undo=null;app.error='';app.selectedUid=null;app.entryMode=null;app.inspectionPaused=false;
 app.dismissedTriggerKeys.clear();
 saveBattleProgress();render();
 if(uiActor(app.state)===1)driveAi();
}
// Fully synchronous, one-click rescue. No browser timers or AI chooser.
// Pending choices still use only reducer-approved actions.
function manualAiStep(){
 if(!app.state||app.state.status!=='playing'||uiActor(app.state)!==1)return;
 resetAi();
 try{
  const legal=legalUniversalActions(app.packs,app.state);
  if(!legal.length)throw Error('目前沒有可供電腦使用的合法動作。');
  const next=!app.state.pending?legal.find(a=>a.type==='next'):null;
  const move=next||legal.find(a=>a.type==='chooseBlock'&&a.uid===null)||
   legal.find(a=>a.mode==='skip')||legal[0];
  if(!isExactLegal(move,legal))throw Error('手動推進未找到合法動作。');
  const previous=app.state;
  app.state=dispatchUniversalAction(app.packs,app.state,move,{actor:1});
  assertUniversalMatch(app.packs,app.state);
  app.replay=appendUniversalReplay(app.replay,move,1);
  notePublicMove(app.packs,previous,app.state,move,1);
  pushHistory(publicPreviewActionLabel(app.packs,previous,app.state,move,1));
  app.aiCompletedSteps++;
  app.lastAiProgress='手動 '+move.type+' · T'+app.state.turn+'/'+app.state.phase;
  saveBattleProgress();
  app.error='';
  render();
 }catch(e){
  app.error='手動推進失敗：'+(e?.message||String(e))+
   '。請使用「除錯重播」保留紀錄供檢查。';
  try{render();}catch{
   const elRoot=$('match-view');
   if(elRoot)elRoot.prepend(el('div',{class:'panel v2-error',role:'alert',text:app.error}));
  }
 }
}
function driveAi(){
 if(document.body)document.body.dataset.aiPolicy=aiPolicyFor(app.aiDifficulty);
 if(!app.state||app.busy||app.state.status!=='playing'||uiActor(app.state)!==1)return;
 app.busy=true;app.autoMoves=0;app.sequence++;
 app.aiPhaseKey=null;app.aiPhaseCount=0;
 const sequence=app.sequence,limit=app.maxAuto;
 function chunk(){
  if(sequence!==app.sequence)return;
  try{
   // On mobile, yield after a few synchronous reducer/AI decisions.
   // The old 35-action burst could freeze the browser's only UI thread.
   let n=0;
   while(app.state.status==='playing'&&uiActor(app.state)===1&&n++<AI_ACTIONS_PER_FRAME){
    if(++app.autoMoves>limit)throw Error('電腦操作已達安全上限，請下載重播檔供除錯。');
    const key=app.state.turn+'|'+app.state.active+'|'+app.state.phase;
    if(app.aiPhaseKey!==key){app.aiPhaseKey=key;app.aiPhaseCount=0;}
    const {action:choice,reason}=chooseProgressSafeAiAction(app.packs,app.state,
     {difficulty:app.aiDifficulty,actionsInPhase:app.aiPhaseCount});
    const previous=app.state;
    // The chosen action is copied from this state's legal list, never made up.
    app.state=dispatchUniversalAction(app.packs,app.state,choice,{actor:1});
    app.replay=appendUniversalReplay(app.replay,choice,1);
    notePublicMove(app.packs,previous,app.state,choice,1);
    pushHistory(publicPreviewActionLabel(app.packs,previous,app.state,choice,1));
    if(reason){
     app.aiFallbacks++;
     pushHistory('AI 使用 V2 合法備援操作（'+reason+'），避免對局停住。');
    }
    app.aiPhaseCount++;
    app.aiCompletedSteps++;
    app.lastAiProgress=choice.type+' · T'+app.state.turn+'/'+app.state.phase;
    if(app.autoMoves%20===0)assertUniversalMatch(app.packs,app.state);
   }
   saveBattleProgress();
   if(app.state.status==='playing'&&uiActor(app.state)===1){
    // Render between chunks so a user can see progress and tap retry even
    // when a mobile browser throttles timers.
    render();
    app.aiTimer=setTimeout(chunk,16);
   }else{
    app.busy=false;app.aiTimer=null;app.error='';
    render();
   }
  }catch(e){
   app.busy=false;app.aiTimer=null;
   app.error='電腦操作已暫停：'+(e?.message||String(e))+
    '。可按上方「AI 沒反應？重新繼續」，或下載除錯重播檔。';
   try{render();}catch{
    const target=$('match-view');
    if(target)target.prepend(el('div',{class:'panel v2-error',role:'alert',text:app.error}));
   }
  }
 }
 app.aiTimer=setTimeout(chunk,16);render();
}
function resetAi(){
 app.sequence++;if(app.aiTimer!==null)clearTimeout(app.aiTimer);
 app.aiTimer=null;app.busy=false;
}
function renderDesignatedDecks(){
 const root=$('designated-decks');
 if(!root)return;
 const registered=new Set(Object.keys(decks['bleach-green'].pack.cards));
 root.replaceChildren();
 for(const row of summarizeDesignatedDecks(id=>registered.has(id))){
  const article=document.createElement('details');
  const title=document.createElement('summary');
  title.textContent=row.name+'（'+row.colorLabel+'）｜'+row.copies+' 張｜已登錄 '+
   row.registeredKinds+'/'+row.kinds+'｜'+(row.playable?'完整可玩':'不可完整對局');
  article.append(title);
  const list=document.createElement('ul');
  for(const entry of row.entries){
   const item=document.createElement('li');
   item.textContent=entry.copies+'x '+entry.source+' '+entry.name+'｜'+
    (entry.registered?'已登錄':'未移植');
   list.append(item);
  }
  article.append(list);
  article.append(el('a',{href:'/index.html?bleachPreset='+encodeURIComponent(row.key),class:'small',text:'在 V2 組卡介面開啟這副牌組／查看卡圖'}));
  root.append(article);
  if(!row.playable){
   const gap=document.createElement('p');
   gap.className='small gap';
   gap.textContent='尚未移植：'+row.missing.map(entry=>entry.source).join('、');
   article.append(gap);
   for(const id of ['my-title','ai-title']){
    const option=document.createElement('option');
    option.value=row.key;option.disabled=true;
    option.textContent=row.name+'（'+row.colorLabel+'）｜缺口 '+row.missing.length+' 種｜不可完整對局';
    $(id).append(option);
   }
  }else{
   designatedReady.set(row.key,{
    pack:decks['bleach-green'].pack,
    counts:designatedPlayableCounts(row),
    label:row.name+'（'+row.colorLabel+'）'
   });
   for(const id of ['my-title','ai-title']){
    const option=document.createElement('option');
    option.value=row.key;
    option.textContent=row.name+'（'+row.colorLabel+'）｜'+row.copies+' 張｜完整可玩';
    $(id).append(option);
   }
  }
 }
}
if(!IS_BATTLE_PAGE)renderDesignatedDecks();
// Import only source-registered, complete BLEACH lists; never pretend unsupported
// classic cards gained official V2 profiles.
function importClassicLobbyDecks(){
 $('my-title').value=designatedReady.has('reject-blue')?'reject-blue':'bleach-purple';
 $('ai-title').value=designatedReady.has('white-sword')?'white-sword':'bleach-green';
 let raw=null;
 try{
  raw=JSON.parse(sessionStorage.getItem('ua-v2-classic-entry-v1')||'null');
  sessionStorage.removeItem('ua-v2-classic-entry-v1');
 }catch{raw=null;}
 if(!raw||typeof raw!=='object')return;
 const pack=decks['bleach-green'].pack,notices=[];
 for(const [side,key,label] of [['mine','my-title','你的'],['foe','ai-title','電腦']]){
  const counts=raw[side],problems=counts&&typeof counts==='object'&&!Array.isArray(counts)?
   validateUniversalDeck(pack,counts):['不是合法牌組'];
  if(problems.length){
   notices.push(label+'舊版構築尚無法使用 V2 完整判定（'+problems.slice(0,2).join('、')+'），已保留可玩的預設牌組供選擇。');
   continue;
  }
  const value='classic-'+side;
  designatedReady.set(value,{pack,counts:Object.freeze({...counts}),
   label:typeof raw[side+'Name']==='string'?raw[side+'Name'].slice(0,40):'從舊版匯入的牌組'});
  $(key).append(el('option',{value,text:'從舊版匯入｜'+(side==='mine'?'你的牌組':'對手牌組')}));
  $(key).value=value;
 }
 if(['easy','normal','hard'].includes(raw.aiDifficulty))$('ai-level').value=raw.aiDifficulty;
 if(raw.first==='0'||raw.first==='1')$('first-player').value=raw.first==='1'?'ai':'human';
 if(notices.length)$('restart-notice').textContent=notices.join(' ');
}
if(!IS_BATTLE_PAGE)importClassicLobbyDecks();
function selectBuiltOpponent(title){
 if(decks['rezero-set1']&&title==='rezero')$('ai-title').value='rezero-set1';
 if(decks['steins-gate-blue']&&title==='steins-gate')$('ai-title').value='steins-gate-blue';
 if(decks['madoka-red']&&title==='madoka')$('ai-title').value='madoka-red';
 if(decks['inuyasha-purple']&&title==='inuyasha')$('ai-title').value='inuyasha-purple';
 if(decks['kjn-purple']&&title==='kjn')$('ai-title').value='kjn-purple';
 if(decks['gurren-lagann-red']&&title==='gurren-lagann')$('ai-title').value='gurren-lagann-red';
}
function importBuiltTitleDeck(){
 let raw=null;
 try{
  raw=JSON.parse(sessionStorage.getItem('ua-v2-title-entry-v1')||'null');
  sessionStorage.removeItem('ua-v2-title-entry-v1');
 }catch{raw=null;}
 if(!raw||typeof raw!=='object')return;
 const report=v2DeckReport(raw.title,raw.counts);
 if(!report.ok||!report.pack){
  $('restart-notice').textContent=(report.issues[0]||'組卡牌組不能進入 V2')+' 已保留可玩的預設牌組。';
  return;
 }
 const value='builder-'+String(raw.title);
 const label=typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,40):'組卡牌組';
 decks[value]={pack:report.pack,counts:Object.freeze({...report.counts}),label};
 for(const id of ['my-title','ai-title']){
  $(id).append(el('option',{value,text:(id==='my-title'?'你的組卡｜':'同一組卡｜')+label}));
 }
 $('my-title').value=value;
 selectBuiltOpponent(raw.title);
 if(['easy','normal','hard'].includes(raw.aiDifficulty))$('ai-level').value=raw.aiDifficulty;
}
if(!IS_BATTLE_PAGE)importBuiltTitleDeck();
// V2-only editor handoff: validate title, complete-card registry and printed deck rules.
// Never use legacy auto flags or a legacy battle reducer.
function importV2EditorDeck(){
 let raw=null;
 try{raw=JSON.parse(sessionStorage.getItem(V2_EDITOR_TRANSFER_KEY)||'null');
  sessionStorage.removeItem(V2_EDITOR_TRANSFER_KEY);}catch{return;}
 if(!raw||typeof raw!=='object')return;
 const reject=message=>{$('restart-notice').textContent='組卡頁的牌組無法進入 V2：'+message;};
 const pack=raw.title==='rezero'||raw.title==='steins-gate'||raw.title==='madoka'||raw.title==='inuyasha'||raw.title==='kjn'?officialV2Pack(raw.title):(typeof raw.title==='string'?registeredV2TitlePack(raw.title):null);
 if(!pack){reject('該作品尚未開放正式 V2 卡包');return;}
 const counts=raw.counts;
 if(!counts||typeof counts!=='object'||Array.isArray(counts)){reject('牌組格式錯誤');return;}
 const errors=validateUniversalDeck(pack,counts);
 if(errors.length){reject(errors.slice(0,2).join('；'));return;}
 const value='editor-v2-mine';
 editorRecordId=typeof raw.deckRecordId==='string'&&raw.deckRecordId.length<=80?raw.deckRecordId:null;
 const name=typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,40):'自訂 V2 牌組';
 designatedReady.set(value,{pack,counts:Object.freeze({...counts}),label:name});
 $('my-title').append(el('option',{value,text:'我的 V2 牌組｜'+name}));
 $('my-title').value=value;
 selectBuiltOpponent(raw.title);
 $('restart-notice').textContent='已載入 V2 組卡頁的 50 張牌組：'+name+'。可以直接開始與 AI 對戰。';
}
if(!IS_BATTLE_PAGE)importV2EditorDeck();

// Saved decks remain browser-local, and are revalidated against the CURRENT
// V2 rule pack. Unsupported decks are shown as unavailable, never auto-enabled.
let savedLobbyRows=[];
function rememberLobbyDeck(row){
 if(!row?.ready)return;
 decks[row.key]={pack:row.pack,counts:row.counts,label:row.name};
 if(typeof row.recordDeckId==='string')decks[row.key].recordDeckId=row.recordDeckId;
}
function appendLobbyRow(row){
 rememberLobbyDeck(row);
 for(const side of ['my-title','ai-title']){
  $(side).append(el('option',{
   value:row.key,disabled:row.ready?null:true,
   title:row.ready?null:row.issues?.[0]||null,
   text:lobbyChoiceText(row,side)
  }));
 }
}
function importSavedLobbyDecks(){
 savedLobbyRows=collectSavedV2LobbyDecks(localStorage);
 for(const row of savedLobbyRows)appendLobbyRow(row);
}
function dropShadowedLocalDecks(accountRows){
 const keys=new Set(shadowedLocalLobbyKeys(savedLobbyRows,accountRows));
 if(!keys.size)return;
 const accountByLocal=new Map(accountRows.filter(row=>row.localId).map(row=>[row.localId,row]));
 const localByKey=new Map(savedLobbyRows.map(row=>[row.key,row]));
 for(const key of keys){
  const account=accountByLocal.get(localByKey.get(key)?.localId);
  delete decks[key];
  for(const side of ['my-title','ai-title']){
   const select=$(side);
   const selected=select.value===key;
   for(const option of [...select.options]) if(option.value===key)option.remove();
   if(selected&&account)select.value=account.key;
  }
 }
}
function prependAccountLobbyRows(rows){
 for(const side of ['my-title','ai-title']){
  const select=$(side);
  const anchor=select.firstChild;
  for(const row of rows){
   select.insertBefore(el('option',{
    value:row.key,disabled:row.ready?null:true,
    title:row.ready?null:row.issues?.[0]||null,
    text:lobbyChoiceText(row,side)
   }),anchor);
  }
 }
 for(const row of rows)rememberLobbyDeck(row);
}
// Signed-in account decks are not in this browser's localStorage. Load them
// into both setup selects. A logged-out response leaves the built-in list.
async function importAccountLobbyDecks(){
 const note=$('restart-notice');
 const prior=note?.textContent||'';
 const mineAtStart=$('my-title').value,foeAtStart=$('ai-title').value;
 if(note&&!prior)note.textContent='正在讀取帳號牌組…';
 let rows=[],status=0;
 try{
  const response=await fetch('/api/decks',{credentials:'same-origin',redirect:'error',headers:{accept:'application/json'}});
  status=response.status;
  if(response.ok){
   const payload=await response.json();
   rows=orderedAccountLobbyRows(accountLobbyRows(payload?.decks));
  }
 }catch{status=0;rows=[];}
 if(status===200){
  dropShadowedLocalDecks(rows);
  prependAccountLobbyRows(rows);
  // A choice made while the account list was loading stays. Otherwise apply
  // a previously saved account deck now that its option exists.
  if($('my-title').value===mineAtStart&&$('ai-title').value===foeAtStart) restoreMatchLobby();
  syncMatchLobby();
 }
 if(!note||prior)return;
 const ready=rows.filter(row=>row.ready).length;
 if(status===200&&ready)note.textContent='帳號牌組已放在選單最上方，可以直接開始對戰。';
 else if(status===200&&rows.length)note.textContent='帳號裡的牌組已列出，但還不能對戰。請看選項後面的原因。';
 else note.textContent='';
}
if(!IS_BATTLE_PAGE)importSavedLobbyDecks();
// On the setup route, validate the selected 50-card lists and navigate to
// an independent URL. The live card table is never inserted below this form.
function launchBattle(){
 if(IS_BATTLE_PAGE)return;
 try{
  const myTitle=$('my-title').value,foeTitle=$('ai-title').value;
  const mine=decks[myTitle]||designatedReady.get(myTitle);
  const foe=decks[foeTitle]||designatedReady.get(foeTitle);
  if(!mine||!foe)throw Error('請選擇有已驗證 50 張牌組的作品。');
  const first=$('first-player').value==='ai'?1:0;
  app.aiDifficulty=$('ai-level').value;
  // Catch invalid packs before navigation. The real match draws a fresh seed
  // on the dedicated battle route rather than inheriting a fixed deck order.
  newUniversalMatch([mine.pack,foe.pack],{
   decks:[mine.counts,foe.counts],seed:generateMatchSeed(),first,openingMulligan:true
  });
  const recordDeckId=myTitle==='editor-v2-mine'?editorRecordId
   :(typeof mine.recordDeckId==='string'?mine.recordDeckId:null);
  const config=prepareSoloBattle({
   mine,foe,first,difficulty:app.aiDifficulty,recordDeckId,
   nonce:generateMatchSeed()
  });
  saveSoloBattle(sessionStorage,config);
  window.location.assign(SOLO_BATTLE_URL);
 }catch(error){alertText(error?.message||String(error));}
}
// Battle route only: preserve the V2 legal reducer, AI, mulligan and replay.
// The same control is used for a deliberate "重開對局" on the new page.
function startGame(){
 resetAi();
 try{
  if(!IS_BATTLE_PAGE||!app.launch)throw Error('請先選擇牌組，再開始 V2 對戰。');
  const [mine,foe]=app.launch.decks;
  const first=app.launch.config.first;
  app.packs=app.launch.packs;
  const seed=generateMatchSeed();
  app.recordDeckId=app.launch.config.recordDeckId;
  app.recordNoted=false;
  app.state=newUniversalMatch(app.packs,{decks:[mine.counts,foe.counts],seed,first,openingMulligan:true});
  assertUniversalMatch(app.packs,app.state);
  app.error='';app.selectedUid=null;app.entryMode=null;app.targetChoices=null;app.inspectionPaused=false;app.undo=null;
  app.publicMoves=[];
  app.dismissedPublicMoveIds.clear();
  app.dismissedTriggerKeys.clear();
  app.allActions=false;app.aiFallbacks=0;app.aiCompletedSteps=0;app.lastAiProgress='新對局';
  app.aiDifficulty=app.launch.config.difficulty;
  app.history=['新對局：'+(mine.label||fmtTitle(mine.pack.id))+' vs '+
   (foe.label||fmtTitle(foe.pack.id))+'｜先手 '+(first===0?'你':'電腦')+
   '｜起手牌調度階段'];
  app.replay=makeUniversalPreviewReplay(app.packs,{
   decks:[mine.counts,foe.counts],seed,first,openingMulligan:true});
  saveBattleProgress();
  render();driveAi();
 }catch(e){alertText(e?.message||String(e));}
}
function downloadBlob(content,type,filename){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function downloadHistory(){
 if(!app.state)return;
 downloadBlob(publicPreviewTranscript({
  header:'UNION ARENA V2 Preview · '+app.packs.map(p=>p.id).join(' vs '),
  lines:[...app.history].reverse()
 }), 'text/plain;charset=utf-8','ua-v2-preview-public-log.txt');
}
function downloadReplay(){
 if(!app.replay)return;
 if(!window.confirm('除錯重播檔包含雙方完整操作、私密選牌與牌序。僅應交給信任的除錯人員。確定要下載嗎？'))return;
 downloadBlob(JSON.stringify(app.replay,null,2)+'\n',
  'application/json;charset=utf-8','ua-v2-preview-debug-replay.json');
}
// The original selects remain the authoritative match settings. The three
// BLEACH quick picks and difficulty buttons are only controls for those selects.
function syncMatchLobby(){
 for(const button of document.querySelectorAll('[data-deck-side]')){
  const select=$(button.dataset.deckSide),value=button.dataset.deckKey;
  const option=[...select.options].find(o=>o.value===value);
  const unavailable=!option||option.disabled;
  button.disabled=unavailable;
  button.setAttribute('aria-pressed',String(!unavailable&&select.value===value));
  button.title=unavailable?'尚未完成 V2 整卡移植，不能開始對戰':'使用這副 50 張牌組';
 }
 for(const button of document.querySelectorAll('[data-ai-difficulty]'))
  button.setAttribute('aria-pressed',String($('ai-level').value===button.dataset.aiDifficulty));
 for(const [side,target] of [['my-title','my-deck-description'],['ai-title','ai-deck-description']]){
  const selector=$(side),deck=validatedLobbyChoice(selector,decks,designatedReady);
  const note=$(target);
  if(!note)continue;
  const count=deck?Object.values(deck.counts||{}).reduce((n,v)=>n+v,0):0;
  const name=selector.selectedOptions?.[0]?.textContent||selector.value;
  note.textContent=deck?'✓ '+name+' · '+count+' 張 · V2 可用':'此牌組尚未支援 V2，請改選其他牌組。';
 }
}
function markLobbyChanged(){
 if(app.state)$('restart-notice').textContent='設定已更改；按「開始 V2 對戰」建立新對局。';
}
function rememberMatchLobby(){
 try{localStorage.setItem(V2_MATCH_SETUP_STORAGE_KEY,JSON.stringify({
  mine:$('my-title').value,opponent:$('ai-title').value,
  difficulty:$('ai-level').value,first:$('first-player').value
 }));}catch{/* Browser may disable storage; match setup still works. */}
}
function restoreMatchLobby(){
 let saved=null;
 try{saved=JSON.parse(localStorage.getItem(V2_MATCH_SETUP_STORAGE_KEY)||'null');}catch{}
 if(!saved||typeof saved!=='object')return;
 const mine=$('my-title'),opponent=$('ai-title');
 // The user just followed an editor-to-match transfer: never replace it with
 // an older stored selection.
 const imported=['editor-v2-mine'].includes(mine.value)||
  mine.value.startsWith('builder-')||mine.value.startsWith('classic-');
 const has=(select,value)=>[...select.options].some(x=>x.value===value&&!x.disabled);
 if(!imported&&has(mine,saved.mine))mine.value=saved.mine;
 if(has(opponent,saved.opponent))opponent.value=saved.opponent;
 if(['easy','normal','hard'].includes(saved.difficulty))$('ai-level').value=saved.difficulty;
 if(['human','ai'].includes(saved.first))$('first-player').value=saved.first;
}
if(!IS_BATTLE_PAGE){
 restoreMatchLobby();
 for(const button of document.querySelectorAll('[data-deck-side]')){
  button.addEventListener('click',()=>{
   const select=$(button.dataset.deckSide),key=button.dataset.deckKey;
   if(button.disabled||![...select.options].some(o=>o.value===key&&!o.disabled))return;
   select.value=key;
   syncMatchLobby();markLobbyChanged();rememberMatchLobby();
  });
 }
 for(const button of document.querySelectorAll('[data-ai-difficulty]')){
  button.addEventListener('click',()=>{
   const difficulty=button.dataset.aiDifficulty;
   if(!['easy','normal','hard'].includes(difficulty))return;
   $('ai-level').value=difficulty;
   syncMatchLobby();markLobbyChanged();rememberMatchLobby();
  });
 }
 for(const id of ['my-title','ai-title','ai-level','first-player']){
  $(id).addEventListener('change',()=>{
   syncMatchLobby();markLobbyChanged();rememberMatchLobby();
  });
 }
 $('start-game').addEventListener('click',()=>{
  rememberMatchLobby();
  launchBattle();
 });
 syncMatchLobby();
 importAccountLobbyDecks();
}else{
 const loaded=loadSoloBattle(sessionStorage);
 window.matchMedia(DESKTOP_BATTLE_QUERY).addEventListener('change',()=>render());
 const exit=$('exit-battle');
 if(exit)exit.addEventListener('click',event=>{
  if(app.state?.status==='playing'&&
   !window.confirm('返回對戰設定將結束這場對局。確定要離開嗎？')){
   event.preventDefault();return;
  }
  resetAi();clearSoloBattle(sessionStorage);
 });
 if(loaded){
  app.launch=loaded;app.packs=loaded.packs;
  app.aiDifficulty=loaded.config.difficulty;
  app.recordDeckId=loaded.config.recordDeckId;
  const banner=$('battle-matchup');
  if(banner)banner.textContent=loaded.decks[0].label+' vs '+loaded.decks[1].label+
   ' · '+({easy:'簡單',normal:'普通',hard:'困難'}[loaded.config.difficulty]||'普通');
  if(!restoreBattleProgress())startGame();
  else{render();driveAi();}
 }else render();
}
