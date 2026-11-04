// Q2316: the controller may look at face-down cards under their own field
// cards. The opponent only sees that a card back is there.
// This module reads the public view only. It never opens match state.

function childLists(node){
 const under=Array.isArray(node?.under)?node.under:
  Array.isArray(node?.underLayers)?node.underLayers:[];
 const stack=Array.isArray(node?.stack)?node.stack:
  Array.isArray(node?.raidLayers)?node.raidLayers:[];
 return {under,stack};
}
function knownId(node){
 return node&&node.faceDown!==true&&typeof node.cardId==='string'&&node.cardId?
  node.cardId:'';
}

// Flat list, bottom to top within each parent. A hidden public marker is
// `{faceDown:true}` and contributes one back. Nested cards under that marker
// are omitted because the public view does not include them.
export function listFacedownUnder(card){
 const found=[];
 function descend(node,hostCardId){
  const {under,stack}=childLists(node);
  push(under,'buried',hostCardId);
  push(stack,'buried',hostCardId);
 }
 function visit(node,relation,hostCardId,order){
  if(!node||typeof node!=='object')return;
  if(node.faceDown!==true){
   descend(node,knownId(node)||hostCardId||'');
   return;
  }
  const cardId=typeof node.cardId==='string'?node.cardId:'';
  if(!cardId){
   const hidden={hidden:true,relation,order};
   if(hostCardId)hidden.hostCardId=hostCardId;
   found.push(hidden);
   return;
  }
  const entry={hidden:false,cardId,relation,order};
  if(typeof node.uid==='string'&&node.uid)entry.uid=node.uid;
  if(typeof node.name==='string'&&node.name)entry.name=node.name;
  if(hostCardId)entry.hostCardId=hostCardId;
  found.push(entry);
  descend(node,cardId);
 }
 function push(list,relation,hostCardId){
  let seen=0;
  for(const child of list){
   const down=!!child&&typeof child==='object'&&child.faceDown===true;
   visit(child,relation,hostCardId,down?++seen:0);
  }
 }
 if(!card||typeof card!=='object')return found;
 const {under,stack}=childLists(card);
 push(under,'direct','');
 push(stack,'buried','');
 return found;
}

// Follow only layers the public view already named. A `{faceDown:true}`
// marker has no cardId, and anything nested under it stays unread.
export function findKnownLayer(card,uid){
 if(!card||typeof card!=='object'||typeof uid!=='string'||!uid)return null;
 let found=null;
 function walk(node){
  if(found||!node||typeof node!=='object')return;
  if(node.faceDown===true&&!(typeof node.cardId==='string'&&node.cardId))return;
  if(node.uid===uid){found=node;return;}
  for(const key of ['under','underLayers','stack','raidLayers']){
   const list=node[key];
   if(!Array.isArray(list))continue;
   for(const child of list)walk(child);
  }
 }
 walk(card);
 return found;
}

export function facedownInspectModel(card){
 const cards=listFacedownUnder(card);
 return {
  count:cards.length,
  private:cards.length>0&&cards.every(entry=>!entry.hidden),
  cards
 };
}

export function facedownPlaceText(entry,nameOf=()=>''){
 const order=Number.isInteger(entry?.order)&&entry.order>0?entry.order:1;
 const nth='由下往上第 '+order+' 張';
 if(entry?.relation==='direct')return '這張角色正下方，'+nth;
 let host='';
 if(typeof entry?.hostCardId==='string'&&entry.hostCardId){
  const named=nameOf(entry.hostCardId);
  if(typeof named==='string'&&named&&named!==entry.hostCardId)host=named;
 }
 return (host?'在「'+host+'」底下，':'在更下層，')+nth;
}

export function facedownTitle(model){
 if(!model?.count)return '';
 if(model.cards.every(entry=>entry.hidden))return '對手的裏向卡';
 if(model.cards.every(entry=>!entry.hidden))return '自己的裏向卡';
 return '裏向卡';
}

export function facedownNote(model){
 if(!model?.count)return '';
 if(model.cards.every(entry=>!entry.hidden))
  return '只有控制這張角色的玩家可以查看卡面。由下往上排列，第 1 張在最下面。';
 if(model.cards.every(entry=>entry.hidden))
  return '這些卡是卡背朝上。對手不能查看卡名或卡圖。';
 return '可以查看自己的裏向卡。對手的卡只顯示卡背。';
}

export function facedownInspectorNote(model,nameOf=()=>''){
 if(!model?.count)return null;
 const own=model.cards.every(entry=>!entry.hidden);
 const hidden=model.cards.every(entry=>entry.hidden);
 return {
  title:(own?'我方':hidden?'對手':'場上')+'裏向卡 '+model.count+' 張',
  lines:model.cards.map(entry=>{
   const place=facedownPlaceText(entry,nameOf);
   if(entry.hidden)return '卡背朝上 · '+place;
   const name=entry.name||nameOf(entry.cardId)||entry.cardId;
   return name+' · '+place;
  })
 };
}

export function eventHitsFacedownBadge(event){
 const target=event?.target;
 if(typeof target?.closest==='function'&&target.closest('.slotFacedown'))return true;
 const root=typeof target?.closest==='function'?(target.closest('.slot')||target):target;
 const badge=root&&typeof root.querySelector==='function'?
  root.querySelector('.slotFacedown'):null;
 if(!badge||typeof badge.getBoundingClientRect!=='function')return false;
 if(!Number.isFinite(event?.clientX)||!Number.isFinite(event?.clientY))return false;
 const rect=badge.getBoundingClientRect();
 return event.clientX>=rect.left&&event.clientX<=rect.right&&
  event.clientY>=rect.top&&event.clientY<=rect.bottom;
}

export function createFacedownEdges(el,count){
 const shown=Math.min(3,count|0);
 if(shown<1)return null;
 const stack=el('span',{class:'slotFacedownStack','aria-hidden':'true'});
 for(let i=0;i<shown;i++)stack.append(el('i'));
 return stack;
}

export function createFacedownBadge(el,model,onOpen){
 if(!model?.count)return null;
 const label=model.private?'查看自己的裏向卡 '+model.count+' 張':
  model.cards.every(entry=>entry.hidden)?'查看卡背 '+model.count+' 張，不能看到卡名':
  '查看裏向卡 '+model.count+' 張';
 const node=el('span',{
  class:'slotFacedown',role:'button',tabindex:'0',title:label,'aria-label':label,
  'data-facedown-count':String(model.count),text:'裏向 '+model.count
 });
 const open=event=>{
  event.preventDefault?.();
  event.stopPropagation?.();
  onOpen?.();
 };
 node.addEventListener('pointerdown',event=>{event.stopPropagation?.();});
 node.addEventListener('click',open);
 node.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' ')open(event);
 });
 return node;
}

function cardArt(el,src,name){
 const img=el('img',{src:src||'assets/mark.svg',alt:name,loading:'lazy',decoding:'async'});
 img.addEventListener?.('error',()=>{
  const current=typeof img.src==='string'?img.src:'';
  if(!current.endsWith('/assets/mark.svg'))img.src='assets/mark.svg';
 });
 return img;
}

export function facedownGallery(el,model,{nameOf=()=>'',imageOf=()=>'',effectOf=()=>'',onInspect,heading=true}={}){
 if(!model?.count)return null;
 const section=el('section',{class:'v2-facedown-gallery','aria-label':facedownTitle(model)});
 if(heading!==false){
  section.append(
   el('h3',{class:'v2-facedown-heading',text:facedownTitle(model)}),
   el('p',{class:'v2-facedown-note',text:facedownNote(model)}));
 }
 const grid=el('div',{class:'v2-zone-gallery'});
 for(const entry of model.cards){
  const place=facedownPlaceText(entry,nameOf);
  if(entry.hidden){
   grid.append(el('article',{class:'v2-zone-card v2-facedown-hidden','data-facedown-hidden':'true'},
    el('div',{class:'v2-facedown-back','aria-hidden':'true'},el('span',{text:'卡背'})),
    el('span',{class:'v2-zone-card-name',text:'卡背朝上'}),
    el('small',{text:place})));
   continue;
  }
  const name=entry.name||nameOf(entry.cardId)||entry.cardId;
  const button=el('button',{
   type:'button',class:'v2-zone-open','data-facedown-card':entry.cardId,
   'aria-label':'查看 '+name
  });
  button.addEventListener?.('click',event=>{
   event.preventDefault?.();
   event.stopPropagation?.();
   onInspect?.(entry);
  });
  button.append(
   cardArt(el,imageOf(entry.cardId),name),
   el('span',{class:'v2-zone-card-name',text:name}),
   el('small',{text:entry.cardId+' · '+place}));
  const effect=effectOf(entry.cardId);
  const figure=el('article',{class:'v2-zone-card v2-facedown-known'},button);
  if(typeof effect==='string'&&effect.trim())
   figure.append(el('p',{class:'v2-facedown-effect',text:effect.trim()}));
  grid.append(figure);
 }
 section.append(grid);
 return section;
}

export function closeFacedownOverlays(root){
 const scope=root&&typeof root.querySelectorAll==='function'?root:globalThis.document;
 if(!scope||typeof scope.querySelectorAll!=='function')return;
 for(const node of [...scope.querySelectorAll('.v2-facedown-overlay')])node.remove?.();
}

export function mountFacedownOverlay({el,parent,card,nameOf,imageOf,effectOf,onInspect,onClose,focus=true}={}){
 if(!parent||typeof parent.append!=='function')return null;
 closeFacedownOverlays(parent);
 const model=facedownInspectModel(card);
 if(!model.count)return null;
 let overlay=null;
 const close=()=>{
  overlay?.remove?.();
  onClose?.();
 };
 const title=facedownTitle(model);
 overlay=el('div',{class:'overlay v2-facedown-overlay'});
 const dialog=el('section',{
  class:'v2-zone-dialog v2-facedown-dialog',role:'dialog','aria-modal':'true',
  'aria-label':title,tabindex:'-1'
 });
 const closeButton=el('button',{type:'button',class:'v2-zone-close',text:'關閉'});
 closeButton.addEventListener?.('click',event=>{
  event.preventDefault?.();
  event.stopPropagation?.();
  close();
 });
 dialog.append(
  el('header',{class:'v2-zone-header'},
   el('div',{},
    el('h2',{text:title}),
    el('p',{class:'v2-zone-subtitle',text:facedownNote(model)})),
   closeButton),
  facedownGallery(el,model,{nameOf,imageOf,effectOf,onInspect,heading:false}));
 overlay.addEventListener?.('click',event=>{if(event.target===overlay)close();});
 overlay.addEventListener?.('keydown',event=>{
  if(event.key==='Escape'){
   event.preventDefault?.();
   event.stopPropagation?.();
   close();
  }
 });
 overlay.append(dialog);
 parent.append(overlay);
 const opener=overlay.querySelector?.('button');
 if(focus&&opener&&typeof opener.focus==='function'){
  try{opener.focus({preventScroll:true});}catch{opener.focus();}
 }
 return overlay;
}
