// Experimental manual UNION ARENA V2 browser preview.
// This entrypoint is intentionally NOT linked from the production index.html.
// All game transitions pass through legalUniversalActions/dispatchUniversalAction.
import {createAllV2PreviewRealDecks} from './universal-v2/preview-real-decks.mjs';
import {V2_ABILITY_TEMPLATE_IDS} from './universal-v2/ability-templates.mjs';
import {listRegisteredV2Titles} from './universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,universalPrivateChoices,assertUniversalMatch} from './universal-v2/engine.mjs';
import {chooseUniversalAiAction} from './universal-v2/ai.mjs';
import {ttgArtSource,ttgArtErrorFallback} from './ttg-art.mjs';
import {CARDS} from './cards.mjs?v=9.1.0';
import {SOLO_LEVELING_CARDS} from './solo-leveling.mjs';
import {SAO_CARDS} from './sao-cards.mjs';
import {MST_V2_OFFICIAL_CATALOGUE} from './universal-v2/sources/mst-inventory.mjs';
import {V2_PHASE_LABELS,V2_TITLE_LABELS,V2_PENDING_LABELS,
 uiActor,isExactLegal,uiCardLabel,uiActionLabel,visibleActionsForCard} from './universal-v2/preview-actions.mjs';
import {publicPreviewActionLabel,makeUniversalPreviewReplay,appendUniversalReplay,
 publicPreviewTranscript} from './universal-v2/preview-replay.mjs';

const decks=createAllV2PreviewRealDecks();
const allArt=Object.freeze({
 bleach:new Map(CARDS.map(c=>[c.identity,c.image||null])),
 'solo-leveling':new Map(SOLO_LEVELING_CARDS.map(c=>[c.id,c.image||null])),
 'sword-art-online':new Map(SAO_CARDS.map(c=>[c.id,c.image||null])),
 'mushoku-tensei':new Map(MST_V2_OFFICIAL_CATALOGUE.map(c=>[c.id,c.image||null]))
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
 undo:null,replay:null,aiDifficulty:'normal',sequence:0,allActions:false, maxAuto:4500,autoMoves:0};
const phases=V2_PHASE_LABELS;
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
function render(){
 const target=$('match-view');if(!target)return;
 target.replaceChildren();
 if(!app.state){
  target.append(el('div',{class:'panel note',text:'選擇兩個作品、AI 難度與先手後，開始 V2 測試。'}));
  return;
 }
 const s=app.state,v=universalPublicView(app.packs,s,0);
 const legal=legalUniversalActions(app.packs,s);
 const panel=el('div',{class:'panel'});
 panel.append(el('div',{class:'headline'},
  el('h2',{text:'第 '+s.turn+' 回合 · '+(phases[s.phase]||s.phase)}),
  el('div',{class:'status'},
   el('span',{class:'tag',text:'目前決策：'+(uiActor(s)===0?'你':'電腦')}),
   el('span',{class:'tag',text:s.status==='playing'?'對戰進行中':'已結束'}))));
 if(app.error)panel.append(el('div',{class:'alerts',role:'alert',text:app.error}));
 target.append(panel);
 if(s.status==='finished')target.append(finishMessage());
 const board=el('div',{class:'board'});
 const left=el('div',{class:'battle'});
 left.append(sideBoard(v,1,legal),
  el('div',{class:'combat-info panel',text:'↑ 電腦前線／能源線　·　↓ 你的前線／能源線。點選卡片後，在操作面板選擇合法行動。'}),
  sideBoard(v,0,legal));
 board.append(left,choices(legal));target.append(board);
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
  app.selectedUid=null;app.error='';app.allActions=false;render();driveAi();
 }catch(e){alertText(e?.message||String(e));}
}
function undoMove(){
 if(!app.undo||app.busy)return;
 app.state=app.undo.state;app.history=app.undo.history;app.replay=app.undo.replay;
 app.undo=null;app.error='';app.selectedUid=null;render();
 if(uiActor(app.state)===1)driveAi();
}
function driveAi(){
 if(!app.state||app.busy||app.state.status!=='playing'||uiActor(app.state)!==1)return;
 app.busy=true;app.autoMoves=0;app.sequence++;
 const sequence=app.sequence,limit=app.maxAuto;
 function chunk(){
  if(sequence!==app.sequence)return;
  try{
   let n=0;
   while(app.state.status==='playing'&&uiActor(app.state)===1&&n++<35){
    if(++app.autoMoves>limit)throw Error('電腦操作已達安全上限，停止自動操作避免死循環。');
    const choice=chooseUniversalAiAction(app.packs,app.state,
     {difficulty:app.aiDifficulty});
    if(!choice||!isExactLegal(choice,legalUniversalActions(app.packs,app.state)))
     throw Error('AI 未回傳合法操作：'+String(choice?.type||'null'));
    const previous=app.state;
    app.state=dispatchUniversalAction(app.packs,app.state,choice,{actor:1});
    app.replay=appendUniversalReplay(app.replay,choice,1);
    pushHistory(publicPreviewActionLabel(app.packs,previous,app.state,choice,1));
    if(app.autoMoves%20===0)assertUniversalMatch(app.packs,app.state);
   }
   if(app.state.status==='playing'&&uiActor(app.state)===1){
    app.aiTimer=setTimeout(chunk,0);
   }else{
    app.busy=false;app.aiTimer=null;app.error='';
    render();
   }
  }catch(e){app.busy=false;app.aiTimer=null;alertText(e?.message||String(e));}
 }
 app.aiTimer=setTimeout(chunk,0);render();
}
function resetAi(){
 app.sequence++;if(app.aiTimer!==null)clearTimeout(app.aiTimer);
 app.aiTimer=null;app.busy=false;
}
function startGame(){
 resetAi();
 try{
  const myTitle=$('my-title').value,foeTitle=$('ai-title').value;
  const mine=decks[myTitle],foe=decks[foeTitle];
  if(!mine||!foe)throw Error('請選擇有已驗證 50 張牌組的作品。');
  app.packs=[mine.pack,foe.pack];
  const seed=Number($('match-seed').value);
  if(!Number.isSafeInteger(seed)||seed<1||seed>999999999)
   throw Error('牌序種子請輸入 1～999999999。');
  const first=$('first-player').value==='ai'?1:0;
  app.state=newUniversalMatch(app.packs,{decks:[mine.counts,foe.counts],seed,first});
  assertUniversalMatch(app.packs,app.state);
  app.error='';app.selectedUid=null;app.undo=null;app.allActions=false;
  app.aiDifficulty=$('ai-level').value;
  app.history=['新對局：'+fmtTitle(myTitle)+' vs '+fmtTitle(foeTitle)+
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
