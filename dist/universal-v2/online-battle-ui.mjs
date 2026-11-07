// Presentation only. Online commands keep their server-issued action index.
// Reuse the solo table's styles and desktop composition without importing a reducer.
import {isDesktopBattlefield,mountDesktopBattlefield} from './desktop-battle-ui.mjs';
import {makeAttackLifePicker} from './attack-life-picker.mjs';
import {mountFieldActivationButtons,openFieldActivationPicker} from './field-activation-ui.mjs';
import {legalRemovedMainAction,removedMainActionText} from './removed-main-ui.mjs';
export {legalRemovedMainAction,removedMainActionText} from './removed-main-ui.mjs';
import {facedownInspectModel,createFacedownBadge,createFacedownEdges,eventHitsFacedownBadge,
 facedownGallery,mountFacedownOverlay,closeFacedownOverlays,findKnownLayer} from './facedown-inspect.mjs';
export {DESKTOP_BATTLE_QUERY} from './desktop-battle-ui.mjs';
export {facedownInspectModel,closeFacedownOverlays,findKnownLayer};

export const ONLINE_BATTLE_STYLES=[
 'universal-v2-legacy.css','universal-v2-arena-setup.css','universal-v2-battle.css',
 'universal-v2-compact.css','universal-v2-desktop.css','universal-v2-pc-table.css',
 'universal-v2-block.css','universal-v2-zone.css','online-battle.css',
 'universal-v2-reference-table.css','union-arena-card-backs.css',
 'universal-v2-table-layout-v3.css','universal-v2-neon-board.css'
];

export function setOnlineBattleMode(active,doc=globalThis.document){
 for(const name of ['v2-arena-theme','v2-battle-page','v2-playing','v2-online-battle'])
  doc.body.classList.toggle(name,active);
 for(const file of ONLINE_BATTLE_STYLES){
  let link=doc.querySelector('link[data-online-battle-style="'+file+'"]');
  if(!link&&active){
   link=doc.createElement('link');link.rel='stylesheet';
  const version=doc.querySelector('meta[name="ua-ui-version"]')?.content||'20261104facedown2';
  link.href=file+'?v='+encodeURIComponent(version);
   link.dataset.onlineBattleStyle=file;doc.head.append(link);
  }
  if(link)link.media=active?'all':'not all';
 }
 if(!active)closeOnlineCard();
}

export function onlineBattleView(room){
 const view=room.view,seat=room.seat;
 const relative=n=>n===0||n===1?n===seat?0:1:n;
 return {...view,status:room.status,active:relative(view.active),actor:relative(view.actor),
  pending:view.pending?{...view.pending,player:relative(view.pending.player),
   ...(Number.isInteger(view.pending.defender)?{defender:relative(view.pending.defender)}:{})}:null,
  battle:view.battle?{...view.battle,owner:relative(view.battle.owner)}:null,
  players:[view.players[seat],{...view.players[1-seat],hand:null}]};
}

export function onlineAttackBadges(card){
 const badges=[];
 if(Number.isFinite(card?.damage)&&card.damage>1)badges.push({type:'damage',text:'直傷'+card.damage});
 if(Number.isFinite(card?.impact)&&card.impact>0)badges.push({type:'impact',text:'衝擊'+card.impact});
 if(card?.impactNull)badges.push({type:'impact-null',text:'衝擊無效'});
 return badges;
}

function image(el,src,name){
 const img=el('img',{class:'art',src:src||'assets/mark.svg',alt:name,decoding:'async'});
 img.addEventListener('error',()=>{if(!img.src.endsWith('/assets/mark.svg'))img.src='assets/mark.svg';});
 return img;
}
export function bindOnlineCardInspect(node,inspect,activate){
 let timer=0,held=false,x=0,y=0;
 const stop=()=>{clearTimeout(timer);timer=0;};
 node.addEventListener('pointerdown',event=>{
  if(event.button>0||eventHitsFacedownBadge(event))return;
  held=false;x=event.clientX;y=event.clientY;stop();
  timer=setTimeout(()=>{if(node.isConnected===false)return;held=true;inspect();},1000);
 });
 for(const name of ['pointerup','pointercancel','pointerleave'])node.addEventListener(name,stop);
 node.addEventListener('pointermove',event=>{if(Math.hypot(event.clientX-x,event.clientY-y)>16)stop();});
 node.addEventListener('contextmenu',event=>{event.preventDefault();});
 node.addEventListener('click',event=>{
  if(held){held=false;return;}
  if(eventHitsFacedownBadge(event)){node.openFacedown?.();return;}
  if(activate)activate();else inspect();
 });
}

export function onlineBattleCard({el,card,src,classes='',label,placement='',index=0,
 line='front',attacking=false,blocking=false,click,inspect,hand=false,definition={},onFacedown}){
 const badges=line==='front'&&!hand?onlineAttackBadges(card):[];
 const node=el('button',{type:'button',class:(hand?'handCard ':'slot ')+classes+
  (card?' occupied':' empty')+(card?.ready===false?' rested':'')+
  (attacking?' v2-attacking':'')+(blocking?' v2-can-block':'')+
  (badges.length?' v2-has-attack-keywords':''),'aria-label':label,
  'data-placement':placement});
 if(!card){node.append(el('span',{class:'slotIndex',text:'0'+(index+1)}));if(click)node.addEventListener('click',click);return node;}
 node.dataset.v2CardUid=card.uid;
 const name=card.name||definition.name||card.cardId;
 const art=image(el,src,name);
 if(hand){
  node.append(art,el('span',{class:'handCost',text:'◆ '+(definition.energy??card.energy??'?')}),
   el('span',{class:'handName',text:name}));
 }else{
  const face=el('span',{class:'slotFace'},art);
  if(card.raidDepth)face.append(el('span',{class:'slotStack',text:'RAID '+card.raidDepth}));
  face.append(el('span',{class:'slotBp'},el('b',{text:line==='front'?'BP '+(card.bp??'?'):'◆ '+(card.produces??0)})));
  const facedown=facedownInspectModel(card);
  if(facedown.count){
   node.classList.add('has-facedown');
   node.setAttribute('aria-label',(label||'')+'，下方有 '+facedown.count+' 張'+(facedown.private?'裏向卡':'卡背'));
   face.append(createFacedownEdges(el,facedown.count),
    createFacedownBadge(el,facedown,()=>node.openFacedown?.()));
  }
  node.append(face);
  if(badges.length)node.append(el('span',{class:'v2-attack-keywords v2-attack-keywords-card','aria-hidden':'true'},
   ...badges.map(b=>el('em',{class:'v2-attack-keyword v2-keyword-'+b.type,text:b.text}))));
  if(blocking)node.append(el('span',{class:'v2-block-option',text:'阻擋','aria-hidden':'true'}));
 }
 node.openFacedown=onFacedown||null;
 bindOnlineCardInspect(node,inspect,click);
 return node;
}

export function showOnlineFacedown({el,parent,card,nameOf,imageOf,effectOf,onInspect,onClose,focus=true,previous=''}={}){
 if(!parent)return '';
 const model=card?facedownInspectModel(card):null;
 if(!model?.count){closeFacedownOverlays(parent);return '';}
 const signature=JSON.stringify(model);
 if(previous===signature&&parent.querySelector('.v2-facedown-overlay'))return signature;
 mountFacedownOverlay({el,parent,card,nameOf,imageOf,effectOf,onInspect,onClose,focus});
 return signature;
}

export function closeOnlineCard(){globalThis.document?.querySelector('.online-card-overlay')?.remove();}
export function showOnlineCard({el,card,definition={},src,nameOf,imageOf,effectOf,onInspect}){
 if(!card?.cardId)return;
 closeOnlineCard();
 const overlay=el('div',{class:'overlay v2-field-overlay online-card-overlay'});
 const dialog=el('div',{class:'dialog panel field-sheet',role:'dialog','aria-modal':'true',
  'aria-label':(card.name||definition.name||card.cardId)+' 的卡圖與效果',tabindex:'-1'});
 const effect=definition.effect||definition.text||definition.description||'點選卡圖可查看印刷效果。';
 const art=image(el,src,card.name||definition.name||card.cardId);
 const facedownSection=facedownGallery(el,facedownInspectModel(card),{nameOf,imageOf,effectOf,onInspect});
 dialog.append(el('button',{type:'button',class:'online-overlay-close',text:'關閉卡片檢視',onClick:()=>close()}),
  el('div',{class:'field-sheet-card'},art,el('div',{},
  el('h2',{text:card.name||definition.name||card.cardId}),el('p',{class:'note',text:card.cardId}))),
  el('p',{class:'field-effect',text:typeof effect==='string'?effect:'請查看印刷卡面。'}));
 if(facedownSection)dialog.append(facedownSection);
 overlay.append(dialog);
 const opener=document.activeElement;
 const close=()=>{overlay.remove();if(opener?.isConnected)opener.focus({preventScroll:true});};
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 overlay.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
 (document.querySelector('.online-battle-shell')||document.body).append(overlay);dialog.focus({preventScroll:true});
}

export function renderOnlineBattle({room,el,siteHeader,notices,renderLine,hand,actions,
 choices=[],log,consent,selectedUid,paused,placing,blocking,publicCards=[],onAction,onPause,onResume,
 onResign,onLeave,onCopy,definition,imageSource,openCard,onSelectZone}){
 const view=onlineBattleView(room);
 const desktop=isDesktopBattlefield();
 const shell=el('div',{class:'v2-shell online-battle-shell'});
 const matchup=(room.you?.username||'你')+' vs '+(room.opponent?.username||'對手');
 const leave=el('button',{id:'exit-battle',type:'button',class:'battle-back',text:'〈 返回大廳',onClick:onLeave});
 shell.append(siteHeader,el('div',{class:'battle-subbar'},leave,
  el('span',{id:'battle-matchup',class:'battle-matchup',text:matchup+' · 房間 '+room.code})));
 const target=el('main',{id:'match-view',class:'battle-stage','aria-label':'線上 V2 對戰桌面'});
 const header=el('header',{class:'matchHeader'},el('h1',{text:'UNION ARENA V2'}));
 const menu=el('button',{type:'button',class:'v2-mobile-menu-toggle',text:'☰ 對局選單','aria-expanded':'false',
  onClick:()=>{const open=header.classList.toggle('tools-open');menu.setAttribute('aria-expanded',String(open));}});
 header.append(menu,el('div',{class:'matchControls'},
  el('button',{type:'button',text:'返回大廳',onClick:onLeave}),
  el('button',{type:'button',text:'複製房間代碼',onClick:onCopy}),
  el('button',{type:'button',text:'認輸',disabled:room.status!=='playing',onClick:onResign}),consent));
 notices.className='online-battle-notices';target.append(header,notices);
 const arena=el('div',{class:'arena'+(blocking?' v2-blocking':'')});
 const middle=el('section',{class:'v2-middle-controls','aria-label':'回合與操作'});
 const phases=el('div',{class:'phaseBar'});
 for(const [id,label]of [['setup','起手調度'],['start','開始'],['move','移動'],['main','主要'],['attack','攻擊']])
  phases.append(el('span',{class:view.phase===id?'current':'',text:label}));
 middle.append(phases);
 const next=actions.querySelector('[data-online-next]');
 if(next)middle.append(el('div',{class:'v2-middle-next'},next));
 if(blocking){
  middle.classList.add('v2-block-controls');
  const attack=view.battle||{};
  const prompt=el('div',{class:'v2-block-prompt'},el('div',{class:'v2-block-summary'},
   el('strong',{text:(attack.name||attack.cardId||'對手角色')+' 正在攻擊'}),
   el('span',{text:'BP '+(attack.bp??'?')+' · 直傷'+(attack.damage??1)+' · 衝擊'+(attack.impact??0)})));
  if(blocking.skip)prompt.append(el('button',{type:'button',class:'v2-block-skip',text:'不阻擋',onClick:()=>onAction(blocking.skip.index)}));
  middle.replaceChildren(prompt);
 }
 const life=player=>{
  const row=el('div',{class:'lifeRow'},el('span',{class:'lifeText'},'LIFE ',el('b',{text:player.lifeCount??0})));
  for(let i=0;i<(player.lifeCount||0);i++)row.append(el('span',{class:'lifeCard','aria-hidden':'true',text:'✦'}));
  return row;
 };
 const showZone=(side,zone)=>{
  closeOnlineCard();
  const overlay=el('div',{class:'overlay v2-zone-overlay online-card-overlay'});
  const dialog=el('section',{class:'v2-zone-dialog',role:'dialog','aria-modal':'true','aria-label':(side===0?'我方':'對手')+(zone==='outside'?'場外':'移除區'),tabindex:'-1'});
  const cards=view.players[side][zone]||[];
  const gallery=el('div',{class:'v2-zone-gallery'});
  for(const c of [...cards].reverse()){
   if(!c?.cardId||c.faceDown)continue;
   const enabled=side===0&&room.yourTurn&&room.status==='playing';
   const activate=legalRemovedMainAction(choices,c.uid,enabled&&zone==='removed');
   const playable=enabled&&choices.some(a=>a.uid===c.uid&&a.type!=='activateRemoved');
   gallery.append(el('article',{class:'v2-zone-card'},el('button',{type:'button',class:'v2-zone-open',
    onClick:()=>openCard(side,zone,c)},image(el,imageSource(side,c.cardId),c.name||c.cardId),
    el('strong',{class:'v2-zone-card-name',text:c.name||c.cardId})),
    playable?el('button',{type:'button',class:'v2-zone-look',text:'選擇此卡',
     onClick:()=>{overlay.remove();onSelectZone(c);}}):null,
    activate?el('button',{type:'button',class:'v2-zone-activate',
     text:removedMainActionText(activate),
     'aria-label':'發動 '+(c.name||c.cardId)+' 的移除區起動主要',
     onClick:()=>{overlay.remove();onAction(activate.index);}}):null));
  }
  if(!gallery.childElementCount)gallery.append(el('p',{class:'v2-zone-empty',text:'目前沒有卡片'}));
  dialog.append(el('header',{class:'v2-zone-header'},el('h2',{text:(side===0?'我方':'對手')+(zone==='outside'?'場外':'移除區')+' · '+cards.length+' 張'}),
   el('button',{type:'button',text:'關閉',onClick:()=>overlay.remove()})),gallery);
  overlay.append(dialog);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape')overlay.remove();});shell.append(overlay);dialog.focus({preventScroll:true});
 };
 const playerArea=side=>{
  const p=view.players[side],engineSeat=side===0?room.seat:1-room.seat;
  const resources=el('div',{class:'playerResources'},el('span',{class:'energyCount',text:
   Object.entries(p.energyByColor||{}).filter(([,n])=>n>0).map(([c,n])=>c+' '+n).join(' / ')||'能源 0'}));
  const ap=el('div',{class:'apDots','aria-label':p.apReady+'/'+p.apTotal+' AP'});
  for(let i=0;i<Math.max(3,p.apTotal||0);i++)ap.append(el('i',{class:i<p.apReady?'available':i>=p.apTotal?'locked':''}));
  ap.append(el('span',{text:'AP'}));resources.append(ap);
  const info=el('header',{class:'playerInfo'},el('div',{class:'playerName'},
   el('span',{class:'avatar'+(side===1?' opponent':''),text:side===0?'Ⅰ':'Ⅱ'}),
   el('div',{},el('b',{text:side===0?(room.you?.username||'你'):(room.opponent?.username||'對手')}),
    el('small',{text:view.active===side?'目前回合':'等待回合'}))),resources);
  const area=el('section',{class:'playerArea'+(side===1?' opponent':''),'aria-label':side===0?'你的場地':'對手場地'},info);
  const line=kind=>{
   const original=renderLine(kind==='front'?'前線':'能源線',p[kind],engineSeat);
   const slots=original.querySelector('.zone');slots.className='slots';
   const piles=el('div',{class:'piles'});
   if(kind==='front')piles.append(el('div',{class:'pile'},'DECK',el('b',{text:p.deckCount})),el('div',{class:'pile'},'HAND',el('b',{text:p.handCount})));
   else for(const [zone,label]of [['outside','場外'],['removed','移除區']])piles.append(el('button',{type:'button',class:'pile v2-zone-pile',
    'aria-label':(side===0?'我方':'對手')+label+' '+(p[zone]?.length||0)+' 張',onClick:()=>showZone(side,zone)},el('span',{text:label}),el('b',{text:p[zone]?.length||0})));
   return el('div',{class:'lineGroup'},el('span',{class:'lineLabel '+kind,text:kind==='front'?'前線 FRONT':'能源 ENERGY'}),slots,piles);
  };
  if(side===1)area.append(life(p),line('energy'),line('front'));
  else area.append(line('front'),line('energy'),life(p));
  return area;
 };
 const handCards=hand.querySelector('.hand');
 handCards.addEventListener('wheel',event=>{
  if(handCards.scrollWidth>handCards.clientWidth&&Math.abs(event.deltaY)>Math.abs(event.deltaX)){
   event.preventDefault();handCards.scrollLeft+=event.deltaY;
  }
 },{passive:false});
 const handArea=el('section',{class:'handArea'},el('header',{class:'handTitle'},
  el('span',{text:'你的手牌 · '+view.players[0].handCount+' 張'}),el('span',{text:'REST 仍可產生能源'})),handCards);
 if(placing||!view.pending||view.phase==='setup')handArea.append(el('div',{class:'v2-compact-actions'},actions));
 arena.append(playerArea(1),middle,playerArea(0),handArea);
 const hint=el('div',{class:'phaseAction'},el('p',{text:room.status==='finished'?'對局結束':room.yourTurn?
  view.phase==='setup'?'確認起手牌後，可保留或整手重抽一次。':'輪到你操作':'等待對手操作'}));
 if(publicCards.length){
  const latest=publicCards[0];
  const showPublic=()=>{
   closeOnlineCard();
   const overlay=el('div',{class:'overlay online-card-overlay'});
   const gallery=el('div',{class:'online-public-card-gallery'});
   for(const card of publicCards)gallery.append(el('button',{type:'button',class:'online-public-card-result',
    onClick:()=>openCard(card.owner===room.seat?0:1,'public',card)},
    image(el,imageSource(card.owner===room.seat?0:1,card.cardId),card.name||card.cardId),
    el('strong',{text:card.name||card.cardId}),el('small',{text:card.label||card.trigger||'公開觸發'})));
   overlay.append(el('section',{class:'dialog panel online-public-dialog',role:'dialog','aria-modal':'true','aria-label':'公開的卡片'},
    el('h2',{text:'雙方可見的公開卡片'}),el('button',{type:'button',text:'關閉',onClick:()=>overlay.remove()}),gallery));
   overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove();});
   overlay.addEventListener('keydown',event=>{if(event.key==='Escape')overlay.remove();});shell.append(overlay);
   overlay.querySelector('button').focus({preventScroll:true});
  };
  const notice=el('button',{type:'button',class:'online-public-notice',onClick:showPublic},
   image(el,imageSource(latest.owner===room.seat?0:1,latest.cardId),latest.name||latest.cardId),
   el('span',{text:'公開卡片 · '+(latest.name||latest.cardId)+'（'+publicCards.length+'）'}));
  (desktop?hint:middle).append(notice);
 }
 arena.append(hint);
 if(room.status==='finished')arena.append(el('div',{class:'resultBanner'},el('h2',{text:(room.winner?.username||'玩家')+' 獲勝'}),
  el('button',{type:'button',text:'返回大廳',onClick:onLeave})));
 const details=el('details',{class:'v2-log panel'},el('summary',{text:'對局紀錄'}),log);
 target.append(arena,details);shell.append(target);
 if(desktop)mountDesktopBattlefield({arena,header,log:details,view,selectedUid,el,
  lifeTargetActions:choices,onLifeTargetAction:action=>onAction(action.index),
  cardDefinition:definition,imageSource,imageFallback:img=>{img.src='assets/mark.svg';},
  printedCard:definition,effectCopy:d=>d?.effect||d?.text||'請查看印刷卡面。',openCard,
  backControl:leave,matchupLabel:matchup+' · 房間 '+room.code});
 if(room.yourTurn&&!paused&&!view.pending&&room.status==='playing'){
  mountFieldActivationButtons({arena,el,actions:choices,selectedUid,
   onOpen:(actions,uid)=>{
    const card=[...view.players[0].front,...view.players[0].energy]
     .find(entry=>entry?.uid===uid);
    if(!card)return;
    openFieldActivationPicker({el,root:target,
     cardName:card.name||definition(0,card.cardId)?.name||card.cardId,
     actions,labelOf:action=>action.label||'起動主要能力',
     onChoose:action=>onAction(action.index)});
   }});
 }
 if(paused)middle.append(el('button',{type:'button',class:'v2-inspection-return',text:'返回效果選擇',onClick:onResume}));
 else if(view.pending?.kind==='attack-life-target'&&room.yourTurn&&!desktop){
  const overlay=el('div',{class:'overlay v2-attack-life-overlay'},
   el('section',{class:'dialog pending panel',role:'dialog','aria-modal':'true',
    'aria-label':'進攻方選擇對手血區'},
    makeAttackLifePicker({el,lifeCount:view.players[1].lifeCount,
     count:view.pending.count,actions:choices,onAction:a=>onAction(a.index)})));
  shell.append(overlay);
 }
 else if(view.pending&&view.pending.kind!=='attack-life-target'&&view.phase!=='setup'&&room.yourTurn&&!blocking&&!placing){
  const dialog=el('section',{class:'dialog pending panel',role:'dialog','aria-modal':'true','aria-label':'效果選擇'},
   el('div',{class:'headline'},el('h2',{text:view.phase==='setup'?'起手調度':'效果選擇'}),
    actions.querySelector('.online-inspection-peek')?null:el('button',{type:'button',text:'查看場面與手牌',onClick:onPause})),actions);
  const overlay=el('div',{class:'overlay v2-pending-overlay online-effect-overlay'},dialog);shell.append(overlay);
 }
 return shell;
}
