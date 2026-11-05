// Shared mobile LIFE slot picker. The attacker sees only numbered face-down
// positions, never the defender's physical card IDs. The submitted result is
// looked up among engine/server supplied legal actions, never fabricated.
export function makeAttackLifePicker({el,lifeCount,count,actions,onAction}){
 const selected=new Set();
 const choices=(actions||[]).filter(a=>a?.type==='chooseAttackLife'&&
  Array.isArray(a.indices)&&a.indices.length===count);
 const root=el('section',{class:'v2-life-picker',role:'group',
  'aria-label':'進攻方選擇對手血區位置'});
 const status=el('p',{class:'v2-life-picker-status',
  text:'選擇 '+count+' 張生命卡 · 0/'+count});
 const cards=el('div',{class:'v2-life-picker-cards'});
 const nodes=[];
 const match=()=>choices.find(a=>
  JSON.stringify(a.indices)===JSON.stringify([...selected].sort((a,b)=>a-b)));
 let confirm;
 const refresh=()=>{
  status.textContent='選擇 '+count+' 張生命卡 · '+selected.size+'/'+count;
  for(const node of nodes){
   const yes=selected.has(Number(node.dataset.lifeIndex));
   node.classList.toggle('selected',yes);node.setAttribute('aria-pressed',String(yes));
  }
  if(confirm)confirm.disabled=selected.size!==count||!match();
 };
 for(let index=0;index<lifeCount;index++){
  const node=el('button',{type:'button',class:'v2-life-picker-slot',
   'data-life-index':String(index),'aria-pressed':'false',
   'aria-label':'對手生命卡 '+(index+1),
   onClick:()=>{
    if(count===1){
     const a=choices.find(action=>action.indices[0]===index);
     if(a)onAction(a);
     return;
    }
    if(selected.has(index))selected.delete(index);
    else if(selected.size<count)selected.add(index);
    refresh();
   }},el('span',{text:String(index+1)}),el('strong',{text:'♠'}));
  nodes.push(node);cards.append(node);
 }
 root.append(el('h3',{text:'指定要攻擊的血區'}),status,cards);
 if(count>1){
  confirm=el('button',{type:'button',class:'v2-life-picker-confirm',disabled:true,
   text:'確認攻擊 '+count+' 張',onClick:()=>{const action=match();if(action)onAction(action);}});
  root.append(confirm);
 }
 return root;
}
