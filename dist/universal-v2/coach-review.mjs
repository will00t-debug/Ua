// Post-match sandbox. It replays a copy of the marked position and never
// writes back into the live match. The picture is the same battle table,
// from the seat that was deciding, with that seat's own hand face up.
import {legalUniversalActions,universalPublicView} from './engine.mjs';
import {uiActionLabel,boardEntryMode,entryClickPlan,moveClickPlan,visibleActionsForCard} from './preview-actions.mjs';
import {COACH_REASONS,stateAtReplayIndex,coachObservation,pushSandbox,buildAiDemonstration} from './coach-record.mjs';

const PHASES=[['start','開始'],['move','移動'],['main','主要'],['attack','攻擊']];

function el(tag,attrs,...kids){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs||{})){
  if(value==null||value===false)continue;
  if(key==='class')node.className=value;
  else if(key==='text')node.textContent=String(value);
  else node.setAttribute(key,String(value));
 }
 for(const kid of kids.flat()){
  if(kid==null||kid===false)continue;
  node.append(kid instanceof Node?kid:document.createTextNode(String(kid)));
 }
 return node;
}

export function coachLiveNote(count){
 const note=el('p',{class:'coach-live-note',text:count?'已標 '+count:''});
 note.title=count
  ?'已標記 '+count+' 步。電腦手牌會在對局結束後的檢討畫面才顯示。'
  :'可以標記電腦剛走的那一步，賽後再改。';
 note.dataset.coachLive='1';
 if(!count)note.hidden=true;
 return note;
}

function cardName(packs,side,cardId){
 return packs?.[side]?.cards?.[cardId]?.name||cardId;
}
function energyText(player){
 const text=Object.entries(player.energyByColor||{}).filter(([,n])=>n>0).map(([k,n])=>k+' '+n).join(' / ');
 return text||'◆ 0';
}

export function mountCoachReview(parent,{packs,replay,marks,onSave,artFor,titleOf,onArtError}){
 const arena=el('section',{class:'arena coach-board','aria-label':'電腦當時看到的對戰畫面'});
 const dock=el('div',{class:'coach-dock'});
 parent.append(arena,dock);
 if(!marks.length){
  arena.append(el('p',{class:'coach-review-note',text:'這場還沒有標記電腦的步驟。'}));
  return;
 }
 const sessions=marks.map(mark=>{
  const origin=stateAtReplayIndex(packs,replay,mark.replayIndex);
  return {mark,origin,opening:coachObservation(packs,origin,1),
   legal:legalUniversalActions(packs,origin).map(action=>structuredClone(action)),
   cursor:origin,taken:[],selectedUid:null,entryMode:null,raidBaseUid:null,choices:null,error:''};
 });
 let active=0;
 const picture=(side,cardId,name)=>{
  const image=el('img',{src:artFor?artFor(side,cardId):'assets/mark.svg',alt:name||cardId,loading:'lazy'});
  image.addEventListener('error',()=>{
   if(onArtError)onArtError(image,side);
   else if(!image.src.endsWith('/assets/mark.svg'))image.src='assets/mark.svg';
  });
  return image;
 };
 function take(session,action){
  if(session.taken.length>=8)return;
  const label=uiActionLabel(action,{pack:packs,state:session.cursor});
  session.cursor=pushSandbox(packs,session.cursor,action);
  session.taken=[...session.taken,{action:structuredClone(action),label}];
  session.selectedUid=null;session.entryMode=null;session.raidBaseUid=null;session.choices=null;session.error='';
  draw();
 }
 function draw(){
  const session=sessions[active];
  let view=null,legal=[];
  try{
   view=universalPublicView(packs,session.cursor,1);
   legal=session.taken.length>=8?[]:legalUniversalActions(packs,session.cursor);
  }catch(error){session.error=error?.message||'這個畫面不能重播。';}
  arena.replaceChildren();
  if(!view){
   arena.append(el('p',{class:'coach-review-note',text:session.error||'這個畫面不能重播。'}));
  }else arena.append(playerBlock(session,view,legal,0),middle(session,view,legal),playerBlock(session,view,legal,1),handBlock(session,view,legal));
  drawDock(session);
 }
 function playerBlock(session,view,legal,seat){
  const player=view.players[seat];
  const mine=seat===1;
  const area=el('section',{class:'playerArea'+(mine?'':' opponent'),'aria-label':mine?'電腦的場地':'你的場地'});
  const ap=el('div',{class:'apDots','aria-label':player.apReady+'/'+player.apTotal+' AP'});
  for(let i=0;i<3;i++)ap.append(el('i',{class:i<player.apReady?'available':i>=player.apTotal?'locked':''}));
  ap.append(el('span',{text:'AP'}));
  area.append(el('header',{class:'playerInfo'},
   el('div',{class:'playerName'},el('b',{text:(mine?'電腦':'你')+' · '+(titleOf?titleOf(seat):player.title||'')})),
   el('div',{class:'playerResources'},el('span',{class:'energyCount',text:energyText(player)}),ap)));
  const lines=[line(session,view,legal,seat,'front'),line(session,view,legal,seat,'energy')];
  const life=lifeRow(player.lifeCount);
  if(mine)area.append(...lines,life);
  else area.append(life,...lines);
  return area;
 }
 function lifeRow(count){
  const row=el('div',{class:'lifeRow'},el('span',{class:'lifeText'},'LIFE ',el('b',{text:count})));
  for(let i=0;i<count;i++)row.append(el('span',{class:'lifeCard','aria-hidden':'true',text:'✦'}));
  return row;
 }
 function line(session,view,legal,seat,which){
  const slots=el('div',{class:'slots'});
  for(let index=0;index<4;index++)slots.append(slot(session,view,legal,seat,which,index));
  const piles=el('div',{class:'piles'});
  const player=view.players[seat];
  if(which==='front'){
   piles.append(el('div',{class:'pile'},'DECK',el('b',{text:player.deckCount})),
    el('div',{class:'pile'},'HAND',el('b',{text:player.handCount})));
  }else{
   piles.append(el('div',{class:'pile'},'場外',el('b',{text:(player.outside||[]).length})),
    el('div',{class:'pile'},'移除',el('b',{text:(player.removed||[]).length})));
  }
  return el('div',{class:'lineGroup'},
   el('span',{class:'lineLabel '+which,text:which==='front'?'前線 FRONT':'能源 ENERGY'}),slots,piles);
 }
 function slot(session,view,legal,seat,which,index){
  const card=view.players[seat][which][index];
  const mine=seat===1;
  const plan=mine?slotPlan(session,legal,which,index,card?.uid||null):{type:'select'};
  const direct=card?choiceActions(legal,card.uid):[];
  const original=card&&!session.taken.length&&session.mark.action?.uid===card.uid;
  const button=el('button',{type:'button',class:'slot'+
   (card?' occupied':'')+(card&&card.ready===false?' rested':'')+
   (card&&card.uid===session.selectedUid?' selected':'')+
   (plan.type==='destination'||plan.type==='entry'?' destination':'')+
   (plan.type==='raid-base'?' raid-base':'')+
   (plan.type==='choose-mover'?' move-source':'')+
   (direct.length?' playable':'')+(original?' coach-original':''),
   title:original?'電腦原本選了這張':''});
  if(card){
   const name=cardName(packs,seat,card.cardId);
   const face=el('span',{class:'slotFace'},picture(seat,card.cardId,name));
   face.append(el('span',{class:'slotBp'},el('b',{text:which==='front'?String(card.bp??''):'◆ '+String(card.produces??0)})));
   button.append(face);
  }else button.append(el('span',{class:'slotIndex',text:'0'+(index+1)}));
  button.addEventListener('click',()=>onSlot(session,legal,seat,card,plan,direct));
  return button;
 }
 function handBlock(session,view,legal){
  const cards=view.players[1].hand||[];
  const hand=el('div',{class:'hand',style:'--hand-wide:'+Math.max(1,Math.min(cards.length,9))});
  for(const card of cards){
   const name=cardName(packs,1,card.cardId);
   const playable=legal.some(action=>action.uid===card.uid||action.baseUid===card.uid);
   const original=!session.taken.length&&session.mark.action?.uid===card.uid;
   const button=el('button',{type:'button',class:'handCard'+
    (card.uid===session.selectedUid?' selected ':' ')+(playable?'playable':'unplayable')+
    (original?' coach-original':''),'aria-label':name,title:original?'電腦原本選了這張':name});
   button.append(picture(1,card.cardId,name),
    el('span',{class:'handName',text:name}));
   button.addEventListener('click',()=>onCard(session,legal,card.uid));
   hand.append(button);
  }
  if(!cards.length)hand.append(el('span',{class:'small',text:'沒有手牌'}));
  const commands=el('div',{class:'v2-compact-actions','aria-label':'這一步可以改成'});
  const shown=commandActions(session,legal);
  if(!shown.length)commands.append(el('span',{class:'v2-compact-hint',text:session.taken.length?'這段示範已停止。':'點卡片或格子，改成更好的做法。'}));
  for(const action of shown){
   const button=el('button',{type:'button',class:'btn small',text:uiActionLabel(action,{pack:packs,state:session.cursor})});
   button.addEventListener('click',()=>{try{take(session,action);}catch(error){session.error=error?.message||'這步不能加入示範。';draw();}});
   commands.append(button);
  }
  return el('section',{class:'handArea'},
   el('header',{class:'handTitle'},el('span',{text:'電腦的手牌 · '+cards.length+' 張'}),
    el('span',{text:'當時看得到的'})),hand,commands);
 }
 function middle(session,view,legal){
  const phases=el('div',{class:'phaseBar','aria-label':'回合階段'});
  for(const [id,name] of PHASES)phases.append(el('span',{class:view.phase===id?'current':'',text:name}));
  const box=el('section',{class:'v2-middle-controls','aria-label':'目前回合與階段操作'},phases);
  const next=legal.find(action=>action.type==='next');
  if(next){
   const button=el('button',{type:'button',class:'btn primary',text:view.phase==='attack'?'結束回合 →':'下一階段 →'});
   button.addEventListener('click',()=>{try{take(session,next);}catch(error){session.error=error?.message||'這步不能加入示範。';draw();}});
   box.append(el('div',{class:'v2-middle-next'},button));
  }
  return box;
 }
 function drawDock(session){
  const original=uiActionLabel(session.mark.action,{pack:packs,state:session.origin});
  const sequence=session.taken.map(item=>item.label).join(' → ');
  dock.replaceChildren(
   el('p',{class:'coach-status',text:'原本：'+original+(sequence?'　示範：'+sequence:'')+(session.error?'　'+session.error:'')}),
   reasonSelect(session),
   dockButton('保存','btn primary',()=>save(session)),
   dockButton('重來','btn small',()=>{
    session.cursor=session.origin;session.taken=[];session.selectedUid=null;
    session.entryMode=null;session.raidBaseUid=null;session.choices=null;session.error='';draw();
   }));
  if(sessions.length>1){
   sessions.forEach((item,index)=>{
    const button=dockButton('標記 '+(index+1),index===active?'btn small primary':'btn small',()=>{active=index;draw();});
    dock.append(button);
   });
  }
 }
 function reasonSelect(session){
  const reason=document.createElement('select');
  reason.className='coach-reason';
  reason.title='理由，可以不填';
  for(const [value,label] of COACH_REASONS){
   const option=document.createElement('option');
   option.value=value;option.textContent=label;
   if(session.reason===value)option.selected=true;
   reason.append(option);
  }
  reason.addEventListener('change',()=>{session.reason=reason.value;});
  return reason;
 }
 function dockButton(text,className,fn){
  const button=el('button',{type:'button',class:className,text});
  button.addEventListener('click',fn);
  return button;
 }
 async function save(session){
  const status=dock.querySelector('.coach-status');
  try{
   const body=buildAiDemonstration({
    ...session.mark.header,format:'ua-v2-coach-demo-v1',step:session.mark.step,
    replayIndex:session.mark.replayIndex,seat:1,observation:session.opening,
    legal:session.legal,original:structuredClone(session.mark.action),
    clientKey:session.mark.header.matchId+':ai:'+session.mark.replayIndex
   },session.taken.map(item=>item.action),session.reason||'');
   if(status)status.textContent='保存中…';
   await onSave(body);
   if(status)status.textContent='已保存。';
  }catch(error){if(status)status.textContent=error?.message||'沒有保存。';}
 }
 function choiceActions(legal,uid){
  return legal.filter(action=>action.uid===uid&&action.slot==null&&!action.line&&!boardEntryMode(action)&&
   !['play','raid','attack','activate','event','move','step','handActivate'].includes(action.type));
 }
 function commandActions(session,legal){
  const skips=legal.filter(action=>action.uid==null&&action.type!=='next'&&action.type!=='extraDraw');
  const extra=legal.filter(action=>action.type==='extraDraw');
  const selected=session.selectedUid?visibleActionsForCard(legal,session.selectedUid)
   .filter(action=>action.slot==null&&!boardEntryMode(action)): [];
  const pending=session.choices||[];
  return [...new Map([...skips,...extra,...selected,...pending].map(action=>[JSON.stringify(action),action])).values()].slice(0,8);
 }
 function slotPlan(session,legal,line,index,slotUid){
  if(session.cursor.phase==='move'&&!legal.some(action=>boardEntryMode(action)))
   return moveClickPlan({selectedUid:session.selectedUid,slotUid,line,slot:index,legal});
  return entryClickPlan({selectedUid:session.selectedUid,entryMode:session.entryMode,
   raidBaseUid:session.raidBaseUid,line,slot:index,slotUid,legal});
 }
 function onCard(session,legal,uid){
  const direct=choiceActions(legal,uid);
  if(direct.length===1){try{take(session,direct[0]);}catch(error){session.error=error?.message||'這步不能加入示範。';draw();}return;}
  session.selectedUid=session.selectedUid===uid?null:uid;
  session.choices=direct.length>1?direct:null;
  session.error='';
  draw();
 }
 function onSlot(session,legal,seat,card,plan,direct){
  if(seat!==1){
   if(direct.length===1){try{take(session,direct[0]);}catch(error){session.error=error?.message||'這步不能加入示範。';draw();}return;}
   if(direct.length>1){session.choices=direct;session.selectedUid=card?.uid||null;draw();return;}
   return;
  }
  if(plan.type==='raid-base'){session.raidBaseUid=plan.baseUid;session.entryMode='raid';session.choices=null;draw();return;}
  if(plan.type==='choose-mover'){session.selectedUid=session.selectedUid===plan.uid?null:plan.uid;session.choices=null;draw();return;}
  if(plan.type==='destination'||plan.type==='entry'){
   const acts=plan.actions||[];
   if(acts.length===1){try{take(session,acts[0]);}catch(error){session.error=error?.message||'這步不能加入示範。';draw();}return;}
   if(acts.length>1){session.choices=acts;draw();}
   return;
  }
  if(direct.length===1){try{take(session,direct[0]);}catch(error){session.error=error?.message||'這步不能加入示範。';draw();}return;}
  if(card){session.selectedUid=card.uid;session.choices=direct.length>1?direct:null;draw();}
 }
 draw();
}
