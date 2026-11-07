// One UI for AI and online field MAIN activations.
// The authoritative source is the reducer's / server's current legal actions.
// Never infer that an ability can be used from printed card text alone.
export function fieldActivationActions(actions,uid){
 if(typeof uid!=='string'||!uid)return [];
 return (Array.isArray(actions)?actions:[]).filter(action=>
  action?.type==='activate'&&action.uid===uid);
}

// Each existing slot remains its own native button. The "啟動" button is a
// GRID SIBLING, not a nested button, preserving keyboard and click semantics.
export function mountFieldActivationButtons({arena,el,actions,selectedUid,onOpen}){
 if(!arena||typeof el!=='function'||typeof onOpen!=='function')return 0;
 const available=fieldActivationActions(actions,selectedUid);
 if(!available.length)return 0;
 let count=0;
 for(const row of arena.querySelectorAll('.playerArea:not(.opponent) .lineGroup .slots')){
  const slots=[...row.children].filter(node=>node.classList?.contains('slot'));
  slots.forEach((slot,index)=>{
   // Explicit grid coordinates prevent auto-placement from skipping the
   // selected column when an overlaid button occupies the same grid cell.
   slot.style.gridColumn=String(index+1);
   slot.style.gridRow='1';
   if(slot.dataset.v2CardUid!==selectedUid)return;
   const chip=el('button',{type:'button',class:'v2-field-activate-button',
    'aria-label':'啟動選取角色的主要能力',
    text:'啟動',onClick:event=>{
     event.stopPropagation();
     onOpen(available,selectedUid);
    }});
   chip.style.gridColumn=String(index+1);
   chip.style.gridRow='1';
   row.append(chip);
   count++;
  });
 }
 return count;
}

export function openFieldActivationPicker({el,root,cardName,actions,onChoose,labelOf}){
 if(typeof el!=='function'||!root||!Array.isArray(actions)||!actions.length||
  typeof onChoose!=='function')return null;
 root.querySelector('.v2-activation-overlay')?.remove();
 const overlay=el('div',{class:'v2-activation-overlay'});
 const dialog=el('section',{class:'v2-activation-dialog',role:'dialog',
  'aria-modal':'true','aria-label':'選擇要發動的啟動能力',tabindex:'-1'});
 const close=()=>{overlay.remove();if(opener?.isConnected)opener.focus({preventScroll:true});};
 const opener=globalThis.document?.activeElement;
 dialog.append(el('header',{class:'v2-activation-dialog-header'},
  el('div',{},el('span',{class:'v2-activation-eyebrow',text:'角色主要能力'}),
   el('h2',{text:'選擇要發動的能力'}),
   el('p',{text:String(cardName||'已選取角色')})),
  el('button',{type:'button',class:'v2-activation-close',text:'✕',
   'aria-label':'取消啟動能力',onClick:close})));
 const entries=el('div',{class:'v2-activation-options'});
 actions.forEach((action,index)=>{
  const text=typeof labelOf==='function'?labelOf(action):action.label;
  const description=String(text||action.mode||'起動主要能力');
  entries.append(el('button',{type:'button',class:'v2-activation-option',
   'aria-label':'發動能力 '+(index+1)+'：'+description,
   onClick:()=>{close();onChoose(action);}},
   el('strong',{text:actions.length===1?'確認發動':'能力 '+(index+1)}),
   el('span',{text:description})));
 });
 dialog.append(entries,el('button',{type:'button',
  class:'v2-activation-cancel',text:'取消',onClick:close}));
 overlay.append(dialog);
 overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
 overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 root.append(overlay);
 dialog.focus({preventScroll:true});
 return overlay;
}
