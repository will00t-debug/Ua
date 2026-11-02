// Logged-in review of solo training rows. Debug replays stay on their own buttons.
const root=document.querySelector('#coach-app');
const h=(tag,props={},...children)=>{
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(props)){
  if(value==null)continue;
  if(key==='text')node.textContent=value;
  else if(key==='class')node.className=value;
  else if(key==='href')node.href=value;
  else node.setAttribute(key,value);
 }
 for(const child of children.flat())if(child)node.append(child);
 return node;
};
async function api(path,options={}){
 const response=await fetch(path,{
  credentials:'same-origin',
  headers:{accept:'application/json',...(options.body?{'content-type':'application/json'}:{})},
  ...options
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.error||'無法完成這個操作。');
 return data;
}
function download(filename,value){
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));
 const link=h('a',{href:url});
 link.download=filename;
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function outcomeText(label){
 if(!label)return '尚未有勝敗標籤';
 if(label.unfinished||['interrupted','abandoned','error','incomplete'].includes(label.endReason))
  return '未完成 · '+label.endReason+' · 不是和局或勝利';
 const winner=label.winner===0?'座位 0 勝':label.winner===1?'座位 1 勝':'沒有勝敗';
 return (label.completed?'正常完成':'認輸或未正常完成')+' · '+winner+' · '+label.endReason;
}
function summary(match){
 const mode=match.mode==='online'||match.channel==='online'?'線上':'單人';
 return mode+' · '+match.title+' · '+match.aiVersion+' · '+match.steps+' 步 · '+match.demos+' 段示範 · '+outcomeText(match.label);
}
async function showMatch(matchId){
 const detail=await api('/api/coach/matches/'+matchId);
 const box=h('article',{class:'coach-card'});
 box.append(h('h2',{text:'對局 '+matchId.slice(0,8)}),h('p',{text:summary(detail.match)}));
 box.append(h('h3',{text:'訓練步驟'}));
 if(!detail.steps.length)box.append(h('p',{text:'還沒有玩家決策。'}));
 for(const step of detail.steps){
  const choice=step.choice?.type||'';
  box.append(h('p',{text:'第 '+step.step+' 步 · '+(step.source||step.actor||'human')+' · '+(step.decisionClass||choice)+' · 合法 '+(step.legal?.length||0)+' 項'+(step.forced?' · 唯一選項':'')}));
 }
 box.append(h('h3',{text:'示範'}));
 if(!detail.demonstrations.length)box.append(h('p',{text:'還沒有賽後修正。'}));
 for(const demo of detail.demonstrations){
  box.append(h('p',{text:'原選擇 '+(demo.original?.type||'')+' · 修正 '+(demo.correction?.type||'尚未修正')+' · 序列 '+(demo.demonstration?.length||0)+' 步'+(demo.reason?' · '+demo.reason:'')}));
 }
 if(detail.debugReplay){
  const warning=h('div',{class:'coach-warning'});
  warning.append(h('p',{text:'除錯重播另外保存，含有牌序與私密選牌，不會放進訓練匯出。'}));
  const actions=h('div',{class:'coach-actions'});
  const load=h('button',{type:'button',text:'下載除錯重播'});
  load.addEventListener('click',async()=>{
   const file=await api('/api/coach/debug-replays/'+detail.debugReplay.id);
   download('ua-v2-debug-replay.json',file.replay);
  });
  const remove=h('button',{type:'button',text:'刪除除錯重播'});
  remove.addEventListener('click',async()=>{
   if(!window.confirm('刪除這份除錯重播？訓練步驟會留下。'))return;
   await api('/api/coach/debug-replays/'+detail.debugReplay.id,{method:'DELETE'});
   await render();
  });
  actions.append(load,remove);warning.append(actions);box.append(warning);
 }
 root.append(box);
}
async function render(){
 root.replaceChildren(h('h1',{text:'教 AI 紀錄'}),
  h('p',{text:'同意後，打牌時會在背景收集你自己的決策。這些資料只供日後學習。目前的 AI 不會因為上傳而變強，收集完成也不代表模型已經訓練。'}));
 let me=null;
 try{me=await api('/api/me');}
 catch{root.append(h('p',{text:'請先登入，才能查看、匯出或刪除自己的紀錄。'}),h('a',{href:'/online.html',text:'前往登入'}));return;}
 void me;
 const listed=await api('/api/coach/matches');
 root.append(h('p',{text:'匿名識別 '+listed.anonymousId+'。匯出檔不含帳號名稱。'}));
 const actions=h('div',{class:'coach-actions'});
 const exportButton=h('button',{type:'button',text:'匯出 JSON'});
 exportButton.addEventListener('click',async()=>download('ua-v2-coach-export.json',await api('/api/coach/export')));
 const jsonlButton=h('button',{type:'button',text:'匯出 JSONL'});
 jsonlButton.addEventListener('click',async()=>{
  const response=await fetch('/api/coach/export.jsonl',{credentials:'same-origin',headers:{accept:'application/x-ndjson'}});
  if(!response.ok)throw Error('無法匯出 JSONL。');
  const text=await response.text();
  const url=URL.createObjectURL(new Blob([text],{type:'application/x-ndjson'}));
  const link=h('a',{href:url});
  link.download='ua-v2-decisions.jsonl';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 const deleteAll=h('button',{type:'button',text:'刪除全部紀錄'});
 deleteAll.addEventListener('click',async()=>{
  if(!window.confirm('刪除這個帳號的全部教 AI 紀錄？牌組與帳號不會被刪除。'))return;
  await api('/api/coach',{method:'DELETE'});
  await render();
 });
 actions.append(exportButton,jsonlButton,deleteAll);
 root.append(actions,h('div',{id:'coach-list',class:'coach-list'}));
 const list=root.querySelector('#coach-list');
 if(!listed.matches.length)list.append(h('p',{text:'還沒有紀錄。在電腦對戰裡打開同意開關後，每一步會自動記下來。'}));
 for(const match of listed.matches){
  const card=h('article',{class:'coach-card'});
  card.append(h('p',{text:summary(match)}));
  const row=h('div',{class:'coach-actions'});
  const open=h('button',{type:'button',text:'查看'});
  open.addEventListener('click',()=>showMatch(match.id).catch(error=>alert(error.message)));
  const remove=h('button',{type:'button',text:'刪除這場'});
  remove.addEventListener('click',async()=>{
   if(!window.confirm('刪除這場的訓練步驟、示範與除錯重播？'))return;
   await api('/api/coach/matches/'+match.id,{method:'DELETE'});
   await render();
  });
  row.append(open,remove);card.append(row);list.append(card);
 }
}
render().catch(error=>{root.append(h('p',{text:error.message}));});
