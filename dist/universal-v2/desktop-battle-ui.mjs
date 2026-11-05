// Presentation adapter only: keep the existing V2 buttons and their listeners.
// The inspector is derived exclusively from the viewer's current public view.
import {facedownInspectModel,facedownInspectorNote,findKnownLayer} from './facedown-inspect.mjs';
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
  for(const [index,card] of (player.apCards||[]).entries())
   if(card?.cardId)visible.push({side,line:'ap',card:{...card,uid:'AP'+side+'-'+index}});
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
 cardDefinition,imageSource,imageFallback,printedCard,effectCopy,openCard,
 backControl=null,matchupLabel=null,lifeTargetActions=[],onLifeTargetAction=null}){
 const opponent=arena.querySelector('.playerArea.opponent');
 const mine=arena.querySelector('.playerArea:not(.opponent)');
 const middle=arena.querySelector('.v2-middle-controls');
 const hand=arena.querySelector('.handArea');
 if(!opponent||!mine||!middle||!hand)return false;


 // A single shared tabletop for AI and online matches. All existing card,
 // outside-zone, AP and phase action nodes are MOVED, not recreated, so their
 // original legal-action listeners remain authoritative.
 const inspector=el('aside',{class:'v2-desktop-inspector','aria-label':'卡片檢視'});
 const table=el('div',{class:'v2-desktop-table','aria-label':'雙方場地與我的手牌'});
 const lifeRail=el('aside',{class:'v2-life-rail','aria-label':'雙方七格生命區'});
 const pileRail=el('aside',{class:'v2-pile-rail','aria-label':'雙方牌組及場外'});
 const slotCount=side=>Math.max(7,Number(view.players[side]?.lifeCount)||0);
 const choosingLife=view?.pending?.kind==='attack-life-target'&&
  view.pending.player===0&&view.pending.defender===1&&typeof onLifeTargetAction==='function';
 const requiredLifeCards=choosingLife?view.pending.count:0;
 const legalLifeActions=choosingLife?lifeTargetActions.filter(a=>
  a?.type==='chooseAttackLife'&&Array.isArray(a.indices)&&a.indices.length===requiredLifeCards):[];
 const selectedLifeIndices=new Set();
 let lifeButtons=[],lifeConfirm=null,lifeInstruction=null;
 const matchedLifeAction=()=>legalLifeActions.find(a=>
  JSON.stringify(a.indices)===JSON.stringify([...selectedLifeIndices].sort((a,b)=>a-b)));
 function updateLifeSelection(){
  for(const button of lifeButtons){
   const index=Number(button.dataset.lifeIndex);
   const chosen=selectedLifeIndices.has(index);
   button.classList.toggle('v2-life-selected',chosen);
   button.setAttribute('aria-pressed',String(chosen));
  }
  if(lifeInstruction)lifeInstruction.textContent=
   '進攻方選擇 '+requiredLifeCards+' 張血區：'+selectedLifeIndices.size+'/'+requiredLifeCards;
  if(lifeConfirm)lifeConfirm.disabled=selectedLifeIndices.size!==requiredLifeCards||!matchedLifeAction();
 }
 function selectLifeIndex(index){
  if(!choosingLife||!legalLifeActions.length)return;
  if(requiredLifeCards===1){
   const action=legalLifeActions.find(a=>a.indices[0]===index);
   if(action)onLifeTargetAction(action);
   return;
  }
  if(selectedLifeIndices.has(index))selectedLifeIndices.delete(index);
  else{
   if(selectedLifeIndices.size>=requiredLifeCards)return;
   selectedLifeIndices.add(index);
  }
  updateLifeSelection();
 }
 for(const [side,area] of [[1,opponent],[0,mine]]){
  const player=view.players[side];
  const resources=area.querySelector('.playerResources');
  const life=area.querySelector('.lifeRow');
  const lifeCount=Math.max(0,Number(player.lifeCount)||0);
  // Keep all seven printed positions; empty positions persist as life is lost.
  const targets=side===1&&choosingLife&&legalLifeActions.length>0;
  const lifeCards=Array.from({length:slotCount(side)},(_,i)=>{
   const canPick=targets&&i<lifeCount;
   const node=el(canPick?'button':'span',{
    ...(canPick?{type:'button',onClick:()=>selectLifeIndex(i),'aria-pressed':'false'}:{}),
    class:'lifeCard'+(i>=lifeCount?' v2-life-spent':'')+(canPick?' v2-life-target':''),
    'aria-label':(side===1?'對手':'我方')+'血區第 '+(i+1)+' 格'+
     (i>=lifeCount?'（已失去）':canPick?'（選擇攻擊）':''),
    'data-life-index':String(i)},el('span',{class:'v2-life-number',text:String(i+1)}),
    el('span',{class:'v2-life-emblem',text:i>=lifeCount?'':'♠'}));
   if(canPick)lifeButtons.push(node);
   return node;
  });
  life?.replaceChildren(
   el('span',{class:'v2-life-caption',text:side===1?'電腦血區':'你的血區'}),
   ...lifeCards
  );
  if(targets){
   lifeInstruction=el('p',{class:'v2-life-instruction',text:
    '進攻方選擇 '+requiredLifeCards+' 張血區：0/'+requiredLifeCards});
   life.append(lifeInstruction);
   if(requiredLifeCards>1){
    lifeConfirm=el('button',{type:'button',class:'v2-life-confirm',disabled:true,
     text:'確認攻擊 '+requiredLifeCards+' 張',
     onClick:()=>{
      const action=matchedLifeAction();
      if(action)onLifeTargetAction(action);
     }});
    life.append(lifeConfirm);
   }
   updateLifeSelection();
  }
  const lifeGroup=el('section',{class:'v2-life-group'+(side===1?' opponent':''),
   'aria-label':side===1?'對手生命卡':'我方生命卡'},life);
  const removed=area.querySelector('[data-v2-zone="removed"]');
  if(removed)lifeGroup.append(el('div',{class:'v2-removed-zone'},removed));
  lifeRail.append(lifeGroup);
  const apNode=resources?.querySelector('.apRow, .apDots');
  const apPlace=el('div',{class:'v2-table-ap',
   'aria-label':(side===1?'對手':'我方')+' AP 卡'});
  if(apNode?.classList.contains('apRow'))apPlace.append(apNode);
  else{
   // Online's public view can expose point cards without a native AP row.
   // Render them as cards, not inert AP dots; existing online legal choices
   // continue through their original action controls.
   const tokens=Array.isArray(player.apCards)?player.apCards:[];
   const row=el('div',{class:'apRow'});
   for(let i=0;i<3;i++){
    const token=tokens[i];
    const face=el('span',{class:'apArt'+(token?.ready||(!token&&i<player.apReady)?' ready':
     token?.inPlay||i<player.apTotal?' rested':' locked')});
    if(token?.cardId){
     const img=el('img',{src:imageSource(side,token.cardId),alt:'AP '+(i+1)});
     img.addEventListener('error',()=>imageFallback(img,side));
     face.append(img);
    }else face.append(el('span',{class:'v2-ap-fallback',text:'AP'}));
    row.append(el('span',{class:'apCard','aria-label':'AP '+(i+1)},face));
   }
   row.append(el('span',{class:'apCount',text:player.apReady+'/'+player.apTotal}));
   apPlace.append(row);
   // The native online AP dots have been replaced by the same three card
   // positions as AI; do not leave a second AP indicator in playerInfo.
   if(apNode?.classList.contains('apDots'))apNode.remove();
  }
  if(side===1)area.insertBefore(apPlace,area.querySelector('.lineGroup'));
  else area.append(apPlace);
  // Present each player's piles as a vertical deck/outside stack at far right.
  // Outside previews are public; never guess or disclose hidden deck cards.
  const rightGroup=el('section',{class:'v2-pile-group'+(side===1?' opponent':''),
   'aria-label':side===1?'對手牌組及場外':'我的牌組及場外'});
  const deck=el('div',{class:'v2-pile-deck','aria-label':'牌組 '+player.deckCount+' 張'},
   el('span',{class:'v2-deck-stack',text:'♠'}),
   el('span',{class:'v2-pile-label',text:'牌組'}),
   el('span',{class:'v2-pile-count',text:String(player.deckCount)}));
  rightGroup.append(deck);
  const outside=area.querySelector('[data-v2-zone="outside"]');
  if(outside){
   const publiclyKnown=[...(player.outside||[])].reverse()
    .find(card=>card?.cardId&&!card?.faceDown);
   if(publiclyKnown){
    const picture=el('img',{class:'v2-outside-preview',
     src:imageSource(side,publiclyKnown.cardId),alt:'場外最上方的公開卡'});
    picture.addEventListener('error',()=>imageFallback(picture,side));
    outside.prepend(picture);
   }else outside.prepend(el('span',{class:'v2-outside-placeholder',text:'♠'}));
   rightGroup.append(outside);
  }
  pileRail.append(rightGroup);
  const energy=resources?.querySelector('.energyCount');
  if(energy)energy.textContent=Object.entries(player.energyByColor||{})
   .filter(([,amount])=>amount>0).map(([color,amount])=>(colorNames[color]||color)+' '+amount).join(' / ')||'能源 0';
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
 const controls=el('div',{class:'v2-pile-controls'},
  advance||el('div',{class:'v2-middle-next v2-desktop-wait',
   role:'status',text:view.status==='finished'?'對局結束':view.pending?'請完成效果選擇':'等待操作'}));
 if(phaseAction)controls.append(phaseAction);
 pileRail.append(controls);
 arena.classList.add('v2-desktop-arena','v2-reference-table');
 arena.replaceChildren(lifeRail,table,pileRail);
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
  const place=line==='hand'?'手牌':line==='front'?'前線':line==='ap'?'行動值卡':'能源線';
  const pose=line==='hand'?'':line==='ap'
   ?(card.inPlay?(card.ready?' · 活動':' · 休息'):' · 尚未登場')
   :(card.ready?' · 直立':' · 橫置');
  const location=(side===0?'我方':'對手')+place;
  const facts=el('dl',{class:'v2-desktop-card-facts'});
  const bp=line==='front'?card.bp:definition.bp;
  for(const [label,value] of [['BP',bp],['所需能源',definition.energy],
   ['AP',definition.ap],['產能',card.produces??definition.gen]]){
   if(value!=null)facts.append(el('div',{},el('dt',{text:label}),el('dd',{text:value})));
  }
  const depth=card.raidDepth||card.raidLayers?.length||0;
  const details=el('details',{class:'v2-desktop-card-effect'},
   el('summary',{text:'卡片效果'}),el('p',{text:effectCopy(printed)}));
  const nameOf=id=>cardDefinition(side,id)?.name||printedCard(side,id)?.name||'';
  const facedownModel=facedownInspectModel(card);
  const facedown=facedownInspectorNote(facedownModel,nameOf);
  const facedownBlock=facedown?el('section',{class:'v2-desktop-facedown','aria-label':facedown.title},
   el('h3',{text:facedown.title}),
   ...facedownModel.cards.map((entry,index)=>entry.hidden?
    el('p',{text:facedown.lines[index]}):
    el('button',{type:'button',class:'v2-desktop-facedown-open',text:facedown.lines[index],
     'aria-label':'查看 '+facedown.lines[index],
     onClick:()=>openCard(side,'under',findKnownLayer(card,entry.uid)||
      {uid:entry.uid,cardId:entry.cardId},
      cardDefinition(side,entry.cardId)||printedCard(side,entry.cardId))}))) :null;
  inspector.replaceChildren(...[el('h2',{text:'卡片檢視'}),picture,
   el('h3',{class:'v2-desktop-card-name',text:name}),
   el('p',{class:'v2-desktop-card-id',text:printed?.identity||printed?.id||card.cardId}),
   el('p',{class:'v2-desktop-card-location',text:location+pose+(depth?' · RAID '+depth+' 層':'')+(facedown?' · '+facedown.title:'')}),
   facts,details,facedownBlock,el('p',{class:'v2-desktop-card-hint',text:'點卡圖放大檢視'})]
   .filter(Boolean));
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
  backControl?.getAttribute('href')||document.getElementById('exit-battle')?.getAttribute('href')||'/universal-v2-preview.html',
  text:backControl?'‹ 返回大廳':'‹ 返回設定',
  onClick:event=>{
   const original=backControl||document.getElementById('exit-battle');
   if(original){event.preventDefault();original.click();}
  }});
 header.insertBefore(back,menu);
 const matchup=el('span',{class:'v2-desktop-matchup',
  text:matchupLabel||document.getElementById('battle-matchup')?.textContent||'電腦對戰'});
 header.insertBefore(matchup,back);
 const logButton=el('button',{type:'button',class:'v2-desktop-log-toggle',
  text:'對戰紀錄','aria-expanded':String(logOpen),onClick:()=>{
   logOpen=!logOpen;log.hidden=!logOpen;log.open=logOpen;
   logButton.setAttribute('aria-expanded',String(logOpen));
  }});
 header.insertBefore(logButton,menu);
 log.classList.add('v2-desktop-log');
 log.hidden=!logOpen;log.open=logOpen;
 pileRail.append(log);
 return true;
}
