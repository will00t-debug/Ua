// Experimental manual UNION ARENA V2 browser preview.
// This entrypoint is intentionally NOT linked from the production index.html.
// All game transitions pass through legalUniversalActions/dispatchUniversalAction.
import {createAllV2PreviewRealDecks} from './universal-v2/preview-real-decks.mjs';
import {officialV2Pack,rezeroSet1PracticeDeck,v2DeckReport} from './universal-v2/official-entry.mjs';
import {REZERO_ALL_CARDS} from './rezero-builder.mjs';
import {summarizeDesignatedDecks,designatedPlayableCounts} from './universal-v2/bleach-designated-decks.mjs';
import {validateUniversalDeck} from './universal-v2/pack.mjs';
import {V2_ABILITY_TEMPLATE_IDS} from './universal-v2/ability-templates.mjs';
import {listRegisteredV2Titles,registeredV2TitlePack} from './universal-v2/title-packs/registry.mjs';
import {V2_EDITOR_TRANSFER_KEY} from './v2-editor-compat.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalPrivateChoices,assertUniversalMatch} from './universal-v2/engine.mjs';
import {chooseUniversalAiAction} from './universal-v2/ai.mjs';
import {chooseProgressSafeAiAction,AI_ACTIONS_PER_FRAME} from './universal-v2/ai-driver-safety.mjs';
import {ttgArtSource,ttgArtErrorFallback} from './ttg-art.mjs';
import {CARDS} from './cards.mjs?v=9.1.0';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {SAO_CARDS} from './sao-cards.mjs';
import {MST_V2_OFFICIAL_CATALOGUE} from './universal-v2/sources/mst-inventory.mjs';
import {V2_PHASE_LABELS,V2_TITLE_LABELS,V2_PENDING_LABELS,
 uiActor,isExactLegal,uiCardLabel,uiActionLabel,visibleActionsForCard} from './universal-v2/preview-actions.mjs';
import {publicPreviewActionLabel,makeUniversalPreviewReplay,appendUniversalReplay,
 publicPreviewTranscript} from './universal-v2/preview-replay.mjs';

const rezeroPractice=rezeroSet1PracticeDeck();
const decks={...createAllV2PreviewRealDecks(),
 'rezero-set1':{pack:rezeroPractice.pack,counts:rezeroPractice.counts,
  label:'Re:Zero 第一彈｜黃色練習組'}};
const designatedReady=new Map();
const allArt=Object.freeze({
 bleach:new Map(CARDS.map(c=>[c.identity,c.image||null])),
 'solo-leveling':new Map(SOLO_LEVELING_CARDS.map(c=>[c.id,c.image||null])),
 'sword-art-online':new Map(SAO_CARDS.map(c=>[c.id,c.image||null])),
 'mushoku-tensei':new Map(MST_V2_OFFICIAL_CATALOGUE.map(c=>[c.id,c.image||null])),
 rezero:new Map(REZERO_ALL_CARDS.map(c=>[c.id,c.image||null]))
});
const v2Entries=listRegisteredV2Titles();
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
$('v2-coverage').textContent=
 V2_ABILITY_TEMPLATE_IDS.length+' 種能力模板 · 已移植 '+
 v2Entries.reduce((sum,item)=>sum+item.totalV2Cards,0)+' 張真卡 Pilot';
const app={state:null,packs:null,selectedUid:null,
 selectedSide:null,history:[],busy:false,aiTimer:null,error:'',
 undo:null,replay:null,targetChoices:null,aiDifficulty:'normal',sequence:0,allActions:false, maxAuto:4500,autoMoves:0,aiPhaseKey:null,aiPhaseCount:0,aiFallbacks:0,aiCompletedSteps:0,lastAiProgress:'未啟動'};
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
 app.error=message;render();
}
function pushHistory(text){
 app.history.unshift(text); // Retain the full human-readable trace for bug reports.
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
  const click=()=>{app.selectedUid=physical.uid;app.selectedSide=side;
   app.allActions=false;render();};
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
function pendingDialog(legal){
 const s=app.state;
 if(!s?.pending||uiActor(s)!==0||app.busy)return null;
 const privateChoices=universalPrivateChoices(app.packs,s,0);
 const cardNameByUid=new Map((privateChoices?.options||[])
  .filter(x=>x.action.uid!==null&&x.card).map(x=>[x.action.uid,x.card.name]));
 const title=V2_PENDING_LABELS[s.pending.kind]||s.pending.kind;
 const overlay=el('div',{class:'overlay'});
 const dialog=el('div',{class:'dialog panel pending',role:'dialog',
  'aria-modal':'true','aria-label':title});
 dialog.append(el('div',{class:'headline'},el('h2',{text:title}),
  el('span',{class:'tag',text:'玩家操作'})),
  el('p',{class:'note',text:'請完成這個選擇後，對戰才會繼續。選牌只會顯示給目前的控制者。'}));
 const list=el('div',{class:'action-list'});
 for(const a of legal){
  const named=cardNameByUid.get(a.uid);
  const label=uiActionLabel(a,{pack:app.packs,state:s})+
   (named?'｜'+named:'');
  list.append(btn(label,()=>applyAction(a),
   a.uid===null?'quiet':'recommended'));
 }
 dialog.append(list);
 overlay.append(dialog);return overlay;
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
 const selected=!!c&&c.uid===app.selectedUid;
 const moves=yours&&app.selectedUid?legal.filter(a=>
  a.line===line&&a.slot===index&&
  ((a.uid===app.selectedUid&&['play','move','step','raid'].includes(a.type))||
   (a.type==='raid'&&a.baseUid===app.selectedUid))):[];
 const d=c?cardDef(side,c.cardId):null;
 const btnSlot=el('button',{type:'button',class:'slot'+(c?' occupied':'')+
  (c&&!c.ready?' rested':'')+(selected?' selected':'')+
  (moves.length?' destination':''),
  'aria-label':(side===0?'你的':'對手的')+(line==='front'?'前線':'能源線')+
   (index+1)+(d?' '+d.name:' 空位')+(moves.length?'，可執行選定操作':''),
  'data-placement':moves.length?'放置／移動':''});
 if(c){
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
 }else btnSlot.append(el('span',{class:'slotIndex',text:'0'+(index+1)}));
 btnSlot.addEventListener('click',()=>{
  if(moves.length===1){applyAction(moves[0]);return;}
  if(moves.length>1){app.targetChoices=moves;render();return;}
  if(yours&&c){app.selectedUid=c.uid;app.selectedSide=side;app.targetChoices=null;app.allActions=false;render();}
 });
 return btnSlot;
}
function legacyLine(view,side,line,legal){
 const p=view.players[side],label=el('span',{class:'lineLabel '+line,text:line==='front'?'前線 FRONT':'能源 ENERGY'});
 const slots=el('div',{class:'slots'});
 for(let i=0;i<4;i++)slots.append(legacySlot(view,side,line,i,legal));
 const piles=el('div',{class:'piles'},el('div',{class:'pile'},line==='front'?'DECK':'場外',
  el('b',{text:line==='front'?p.deckCount:p.outside.length})),
  el('div',{class:'pile'},line==='front'?'HAND':'ENERGY',
   el('b',{text:line==='front'?p.handCount:p.energyTotal})));
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
  const playable=legal.some(a=>a.uid===c.uid&&['play','raid','event'].includes(a.type));
  const card=el('button',{type:'button',class:'handCard '+(selected?'selected ':'')+
   (playable?'playable':'unplayable'),'aria-label':d.name||c.cardId});
  const picture=el('img',{src:imgUrl(0,c.cardId),alt:d.name||c.cardId,loading:'lazy'});
  picture.onerror=()=>{if(!picture.src.endsWith('/assets/mark.svg'))picture.src='assets/mark.svg';};
  card.append(picture,el('span',{class:'handCost',text:'◆ '+(d.energy??'?')}),
   el('span',{class:'handName',text:d.name||c.cardId}));
  card.addEventListener('click',()=>{
   if(app.busy||uiActor(app.state)!==0)return;
   app.selectedUid=c.uid;app.selectedSide=0;app.targetChoices=null;app.allActions=false;render();
  });
  hand.append(card);
 }
 if(!cards.length)hand.append(el('span',{class:'small',text:'目前沒有手牌'}));
 return hand;
}
function legacyCommands(legal){
 const s=app.state,actor=uiActor(s),bar=el('div',{class:'selectionBar'});
 if(actor!==0||app.busy){
  bar.append(el('p',{class:'selectionHint',text:'對手正在操作與結算…'}));return bar;
 }
 if(s.pending){
  bar.append(el('p',{class:'selectionHint',text:'請在選擇視窗中完成效果結算。'}));return bar;
 }
 const selected=app.selectedUid?visibleActionsForCard(legal,app.selectedUid):[];
 const passive=legal.filter(a=>a.type==='extraDraw');
 const all=app.targetChoices|| (app.allActions?legal.filter(a=>a.type!=='next'):
  selected.length?[...passive,...selected]:passive);
 const list=[...new Map(all.map(a=>[JSON.stringify(a),a])).values()];
 if(app.selectedUid){
  const owner=app.selectedSide??0,d=app.packs[owner].cards[
   (s.players[owner].hand.find(x=>x.uid===app.selectedUid)||
    [...s.players[owner].front,...s.players[owner].energy].find(x=>x?.uid===app.selectedUid))?.cardId];
  if(d)bar.append(el('b',{},d.name,' · ',d.energy+' 能源 / '+(d.bp||0)+' BP'));
 }
 if(app.targetChoices)bar.append(el('b',{text:'此位置有多種合法方式，請確認：'}));
 const row=el('div',{class:'v2-legal-buttons'});
 for(const a of list.slice(0,100)){
  const b=btn(uiActionLabel(a,{pack:app.packs,state:s}),
   ()=>{app.targetChoices=null;applyAction(a);},a.type==='raid'?'primary':'');
  b.className+=' btn small';row.append(b);
 }
 bar.append(row);
 if(!list.length)bar.append(el('p',{class:'selectionHint',text:'點選手牌或自己的場上卡片，可選擇合法動作。'}));
 if(!app.targetChoices)bar.append(btn(app.allActions?'收合全部動作':'查看全部合法動作',
  ()=>{app.allActions=!app.allActions;render();},'btn small'));
 else bar.append(btn('取消選擇',()=>{app.targetChoices=null;render();},'btn small'));
 return bar;
}
function render(){
 const target=$('match-view');if(!target)return;
 target.replaceChildren();
 if(!app.state){
  target.append(el('div',{class:'panel v2-empty',text:'在上方選擇牌組並按「開始新對局」。所有卡牌結算交給 UNION ARENA V2 規則引擎。'}));
  return;
 }
 const s=app.state,v=universalPublicView(app.packs,s,0),legal=legalUniversalActions(app.packs,s);
 const title=el('header',{class:'matchHeader'},
  el('h1',{},'UNION ARENA V2 ',el('span',{class:'textMuted',text:' / 舊版對戰介面'}),
   el('small',{class:'v2-client-version',text:' · '+CLIENT_RELEASE})),
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
 const arena=el('div',{class:'arena'});
 const phasesEl=el('div',{class:'phaseBar','aria-label':'回合階段'});
 for(const [n,name] of [['start','開始'],['move','移動'],['main','主要'],['attack','攻擊']])
  phasesEl.append(el('span',{class:s.phase===n?'current':'',text:name}));
 arena.append(phasesEl);
 if(s.status==='finished'){
  arena.append(el('div',{class:'resultBanner'},el('h2',{text:s.winner===0?'你獲勝了！':'電腦獲勝'})));
 }
 arena.append(legacyPlayer(v,1,legal),
  el('div',{class:'centerLine',text:'TURN '+s.turn+' · '+(phases[s.phase]||s.phase)}),
  legacyPlayer(v,0,legal));
 const handArea=el('section',{class:'handArea'},
  el('header',{class:'handTitle'},
   el('span',{text:'你的手牌 · '+v.players[0].hand.length+' 張'}),
   el('span',{text:'REST 仍可產生能源'})),
  legacyCommands(legal),legacyHand(v,legal));
 arena.append(handArea);
 const next=legal.find(a=>a.type==='next');
 const phase=el('div',{class:'phaseAction'},el('p',{text:s.pending?'請完成效果選擇。':
  app.busy?'AI 正在思考與操作…':s.status==='finished'?'對局結束':
  uiActor(s)===1?'電腦回合已暫停，可按上方「AI 沒反應？重新繼續」。':
  '點手牌再點亮起的場上位置，即可用 V2 合法動作出牌。'}));
 if(app.error)phase.append(el('p',{class:'v2-error',role:'alert',text:app.error}));
 const controls=el('div',{class:'v2-legal-buttons'});
 if(next&&uiActor(s)===0&&!app.busy)
  controls.append(btn(uiActionLabel(next,{pack:app.packs,state:s})+' →',()=>applyAction(next),'btn primary'));
 phase.append(controls);
 arena.append(phase);
 target.append(arena);
 const log=el('details',{class:'v2-log panel'},el('summary',{text:'對局紀錄（'+app.history.length+' 步）'}),
  el('ol',{class:'history'},...app.history.slice(0,70).map(x=>el('li',{text:x}))));
 target.append(log);
 const prompt=pendingDialog(legal);if(prompt)target.append(prompt);
}
function applyAction(a){
 if(!app.state||app.busy||uiActor(app.state)!==0)return;
 try{
  const legal=legalUniversalActions(app.packs,app.state);
  if(!isExactLegal(a,legal))throw Error('操作已非目前的合法動作，請重新選擇。');
  app.undo={state:app.state,history:app.history.slice(),replay:app.replay};
  const previous=app.state;
  app.state=dispatchUniversalAction(app.packs,app.state,a,{actor:0});
  assertUniversalMatch(app.packs,app.state);
  app.replay=appendUniversalReplay(app.replay,a,0);
  pushHistory(publicPreviewActionLabel(app.packs,previous,app.state,a,0));
  app.selectedUid=null;app.targetChoices=null;app.error='';app.allActions=false;render();driveAi();
 }catch(e){alertText(e?.message||String(e));}
}
function undoMove(){
 if(!app.undo||app.busy)return;
 app.state=app.undo.state;app.history=app.undo.history;app.replay=app.undo.replay;
 app.undo=null;app.error='';app.selectedUid=null;render();
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
  pushHistory(publicPreviewActionLabel(app.packs,previous,app.state,move,1));
  app.aiCompletedSteps++;
  app.lastAiProgress='手動 '+move.type+' · T'+app.state.turn+'/'+app.state.phase;
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
renderDesignatedDecks();
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
importClassicLobbyDecks();
function selectBuiltOpponent(title){
 if(decks['rezero-set1']&&title==='rezero')$('ai-title').value='rezero-set1';
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
importBuiltTitleDeck();
// V2-only editor handoff: validate title, complete-card registry and printed deck rules.
// Never use legacy auto flags or a legacy battle reducer.
function importV2EditorDeck(){
 let raw=null;
 try{raw=JSON.parse(sessionStorage.getItem(V2_EDITOR_TRANSFER_KEY)||'null');
  sessionStorage.removeItem(V2_EDITOR_TRANSFER_KEY);}catch{return;}
 if(!raw||typeof raw!=='object')return;
 const reject=message=>{$('restart-notice').textContent='組卡頁的牌組無法進入 V2：'+message;};
 const pack=raw.title==='rezero'?officialV2Pack('rezero'):(typeof raw.title==='string'?registeredV2TitlePack(raw.title):null);
 if(!pack){reject('該作品尚未開放正式 V2 卡包');return;}
 const counts=raw.counts;
 if(!counts||typeof counts!=='object'||Array.isArray(counts)){reject('牌組格式錯誤');return;}
 const errors=validateUniversalDeck(pack,counts);
 if(errors.length){reject(errors.slice(0,2).join('；'));return;}
 const value='editor-v2-mine';
 const name=typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,40):'自訂 V2 牌組';
 designatedReady.set(value,{pack,counts:Object.freeze({...counts}),label:name});
 $('my-title').append(el('option',{value,text:'我的 V2 牌組｜'+name}));
 $('my-title').value=value;
 selectBuiltOpponent(raw.title);
 $('restart-notice').textContent='已載入 V2 組卡頁的 50 張牌組：'+name+'。可以直接開始與 AI 對戰。';
}
importV2EditorDeck();
function startGame(){
 resetAi();
 try{
  const myTitle=$('my-title').value,foeTitle=$('ai-title').value;
  const mine=decks[myTitle]||designatedReady.get(myTitle);
  const foe=decks[foeTitle]||designatedReady.get(foeTitle);
  if(!mine||!foe)throw Error('請選擇有已驗證 50 張牌組的作品。');
  app.packs=[mine.pack,foe.pack];
  const seed=Number($('match-seed').value);
  if(!Number.isSafeInteger(seed)||seed<1||seed>999999999)
   throw Error('牌序種子請輸入 1～999999999。');
  const first=$('first-player').value==='ai'?1:0;
  app.state=newUniversalMatch(app.packs,{decks:[mine.counts,foe.counts],seed,first});
  assertUniversalMatch(app.packs,app.state);
  app.error='';app.selectedUid=null;app.undo=null;app.allActions=false;app.aiFallbacks=0;app.aiCompletedSteps=0;app.lastAiProgress='新對局';
  app.aiDifficulty=$('ai-level').value;
  app.history=['新對局：'+(mine.label||fmtTitle(myTitle))+' vs '+(foe.label||fmtTitle(foeTitle))+
   '｜先手 '+(first===0?'你':'電腦')+'｜種子 '+seed];
  app.replay=makeUniversalPreviewReplay(app.packs,{
   decks:[mine.counts,foe.counts],seed,first});
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
for(const id of ['my-title','ai-title','ai-level','first-player','match-seed']){
 $(id).addEventListener('change',()=>{
  if(app.state) $('restart-notice').textContent='更改設定後，按「開始新對局」才會套用。';
 });
}
$('start-game').addEventListener('click',startGame);
$('match-seed').value='20261015';
render();
