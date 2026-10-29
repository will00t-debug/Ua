// Presentation adapter only: keep the existing V2 buttons and their listeners.
// The inspector is derived exclusively from the viewer's current public view.
export const DESKTOP_BATTLE_QUERY='(min-width:761px) and (min-height:460px)';

export function isDesktopBattlefield(surface=globalThis.window){
 return !!surface?.matchMedia?.(DESKTOP_BATTLE_QUERY).matches;
}

export function desktopVisibleCards(view){
 const visible=[];
 for(let side=0;side<2;side++){
  const player=view?.players?.[side];
  if(!player)continue;
  for(const line of ['front','energy'])
   for(const card of player[line]||[])
    if(card?.uid&&card.cardId)visible.push({side,line,card});
  // An opponent's hand must never become an inspector candidate, even if a
  // future caller accidentally supplies an unredacted hand alongside the view.
  if(side===0)for(const card of player.hand||[])
   if(card?.uid&&card.cardId)visible.push({side,line:'hand',card});
 }
 return visible;
}

export function resolveDesktopPreview(view,previous,selectedUid){
 const cards=desktopVisibleCards(view);
 return cards.find(item=>item.card.uid===previous?.uid&&item.card.cardId===previous?.cardId)||
  cards.find(item=>item.card.uid===selectedUid)||
  cards.find(item=>item.side===0&&item.line==='hand')||cards[0]||null;
}

let inspected=null,logOpen=false;
const colorNames={blue:'藍',green:'綠',red:'紅',purple:'紫',yellow:'黃',white:'白',black:'黑'};

export function mountDesktopBattlefield({arena,header,log,view,selectedUid,el,
 cardDefinition,imageSource,imageFallback,printedCard,effectCopy,openCard}){
 const opponent=arena.querySelector('.playerArea.opponent');
 const mine=arena.querySelector('.playerArea:not(.opponent)');
 const middle=arena.querySelector('.v2-middle-controls');
 const hand=arena.querySelector('.handArea');
 if(!opponent||!mine||!middle||!hand)return false;

 const inspector=el('aside',{class:'v2-desktop-inspector','aria-label':'卡片檢視'});
 const table=el('div',{class:'v2-desktop-table','aria-label':'雙方場地與我的手牌'});
 const sidebar=el('aside',{class:'v2-desktop-sidebar','aria-label':'生命、能源與回合操作'});
 const panels=[];
 for(const [side,area] of [[1,opponent],[0,mine]]){
  const player=view.players[side];
  const resources=area.querySelector('.playerResources');
  const life=area.querySelector('.lifeRow');
  const panel=el('section',{class:'v2-desktop-resources'+(side===1?' opponent':''),
   'aria-label':side===1?'對手資源':'我方資源'},
   el('h2',{class:'v2-desktop-owner',text:side===1?'對手':'我方'}),life,resources);
  const energy=resources?.querySelector('.energyCount');
  if(energy)energy.textContent=Object.entries(player.energyByColor||{})
   .filter(([,amount])=>amount>0).map(([color,amount])=>(colorNames[color]||color)+' '+amount).join(' / ')||'能源 0';
  const ap=resources?.querySelector('.apDots>span');
  if(ap)ap.textContent='AP '+player.apReady+' / '+player.apTotal;
  panels.push(panel);
 }
 const opponentInfo=opponent.querySelector('.playerInfo');
 const hiddenHand=el('div',{class:'v2-desktop-opponent-hand',
  'aria-label':'對手手牌 '+view.players[1].handCount+' 張'});
 for(let i=0;i<Math.min(8,view.players[1].handCount);i++)
  hiddenHand.append(el('i',{'aria-hidden':'true'}));
 hiddenHand.append(el('span',{text:'手牌 '+view.players[1].handCount}));
 opponentInfo?.append(hiddenHand);

 const advance=middle.querySelector('.v2-middle-next');
 const phaseAction=arena.querySelector('.phaseAction');
 const result=arena.querySelector('.resultBanner');
 table.append(opponent,middle,mine,hand);
 sidebar.append(panels[0],advance||el('div',{class:'v2-middle-next v2-desktop-wait',
  role:'status',text:view.status==='finished'?'對局結束':view.pending?'請完成效果選擇':'等待操作'}),panels[1]);
 if(phaseAction)sidebar.append(phaseAction);
 arena.classList.add('v2-desktop-arena');
 arena.replaceChildren(inspector,table,sidebar);
 if(result)arena.append(result);

 function showPreview(entry){
  if(!entry)return;
  const {side,line,card}=entry;
  inspected={uid:card.uid,cardId:card.cardId};
  const definition=cardDefinition(side,card.cardId)||{};
  const printed=printedCard(side,card.cardId);
  const name=definition.name||printed?.name||card.cardId;
  const art=el('img',{src:imageSource(side,card.cardId),alt:name+' 完整卡面'});
  art.addEventListener('error',()=>imageFallback(art,side));
  const picture=el('button',{type:'button',class:'v2-desktop-preview-art',
   'aria-label':'放大 '+name+' 的卡圖與效果',
   onClick:()=>openCard(side,line,card,definition)},art);
  const location=(side===0?'我方':'對手')+(line==='hand'?'手牌':line==='front'?'前線':'能源線');
  const facts=el('dl',{class:'v2-desktop-card-facts'});
  const bp=line==='front'?card.bp:definition.bp;
  for(const [label,value] of [['BP',bp],['所需能源',definition.energy],
   ['AP',definition.ap],['產能',card.produces??definition.gen]]){
   if(value!=null)facts.append(el('div',{},el('dt',{text:label}),el('dd',{text:value})));
  }
  const depth=card.raidDepth||card.raidLayers?.length||0;
  const details=el('details',{class:'v2-desktop-card-effect'},
   el('summary',{text:'卡片效果'}),el('p',{text:effectCopy(printed)}));
  inspector.replaceChildren(el('h2',{text:'卡片檢視'}),picture,
   el('h3',{class:'v2-desktop-card-name',text:name}),
   el('p',{class:'v2-desktop-card-id',text:printed?.identity||printed?.id||card.cardId}),
   el('p',{class:'v2-desktop-card-location',text:location+
    (line==='hand'?'':card.ready?' · 直立':' · 橫置')+(depth?' · RAID '+depth+' 層':'')}),
   facts,details,el('p',{class:'v2-desktop-card-hint',text:'點卡圖放大檢視'}));
 }
 const initial=resolveDesktopPreview(view,inspected,selectedUid);
 if(initial)showPreview(initial);
 else inspector.append(el('h2',{text:'卡片檢視'}),
  el('p',{class:'v2-desktop-empty-preview',text:'滑鼠移到卡片上，即可查看完整卡面。'}));
 const visible=desktopVisibleCards(view);
 for(const button of table.querySelectorAll('[data-v2-card-uid]')){
  const entry=visible.find(item=>item.card.uid===button.dataset.v2CardUid);
  if(!entry)continue;
  button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')showPreview(entry);});
  button.addEventListener('focus',()=>showPreview(entry));
  // Capture before the existing selection/action listener re-renders the table.
  button.addEventListener('click',()=>{inspected={uid:entry.card.uid,cardId:entry.card.cardId};},{capture:true});
 }
 header.classList.add('v2-desktop-header');
 const menu=header.querySelector('.v2-mobile-menu-toggle');
 const back=el('a',{class:'v2-desktop-back',href:
  document.getElementById('exit-battle')?.getAttribute('href')||'/universal-v2-preview.html',text:'‹ 返回設定',
  onClick:event=>{
   const original=document.getElementById('exit-battle');
   if(original){event.preventDefault();original.click();}
  }});
 header.insertBefore(back,menu);
 const matchup=el('span',{class:'v2-desktop-matchup',
  text:document.getElementById('battle-matchup')?.textContent||'電腦對戰'});
 header.insertBefore(matchup,back);
 const logButton=el('button',{type:'button',class:'v2-desktop-log-toggle',
  text:'對戰紀錄','aria-expanded':String(logOpen),onClick:()=>{
   logOpen=!logOpen;log.hidden=!logOpen;log.open=logOpen;
   logButton.setAttribute('aria-expanded',String(logOpen));
  }});
 header.insertBefore(logButton,menu);
 log.classList.add('v2-desktop-log');
 log.hidden=!logOpen;log.open=logOpen;
 sidebar.append(log);
 return true;
}
