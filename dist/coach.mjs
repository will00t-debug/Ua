// Logged-in review of solo training rows. Debug replays stay on their own buttons.
import {learnReport} from './universal-v2/learn-policy.mjs?v=20261104gap1';
import {coachConsentEnabled,createCoachUploader,currentAccountId} from './universal-v2/coach-client.mjs?v=20261104account1';
import {createDecisionQueue} from './universal-v2/coach-queue.mjs?v=20261104event1';
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
 const body=options.body===undefined?undefined:JSON.stringify(options.body);
 const response=await fetch(path,{
  method:options.method||'GET',
  credentials:'same-origin',
  headers:{accept:'application/json',...(body?{'content-type':'application/json'}:{})},
  body
 });
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.error||'無法完成這個操作。');
 return data;
}
let flushingQueue=null;
let lastReport='';
function flushLocalQueue(accountId){
 if(!coachConsentEnabled(localStorage))return Promise.resolve({queued:0,dropped:0,lastError:'',paused:0});
 if(flushingQueue)return flushingQueue;
 flushingQueue=(async()=>{
  const uploader=createCoachUploader({
   consent:()=>coachConsentEnabled(localStorage)
  });
  const queue=createDecisionQueue({
   storage:localStorage,
   consent:()=>coachConsentEnabled(localStorage),
   account(){return currentAccountId(fetch);},
   send(body){
    return String(body.format||'').includes('label')?uploader.label(body):uploader.step(body);
   }
  });
  queue.start();
  await queue.flushNow();
  const paused=queue.paused(accountId);
  return {queued:Math.max(0,queue.length-paused),paused,dropped:queue.dropped,lastError:queue.lastError};
 })().finally(()=>{flushingQueue=null;});
 return flushingQueue;
}
function queueNote(pending){
 const parts=[];
 if(pending?.dropped)parts.push('已跳過 '+pending.dropped+' 筆伺服器拒絕的舊紀錄，後面的新對局會繼續上傳。');
 if(pending?.paused)parts.push('有 '+pending.paused+' 筆無法確認歸屬或其他帳號的紀錄，已暫停上傳。');
 if(pending?.queued)parts.push('這台裝置還有 '+pending.queued+' 筆目前帳號的紀錄沒送出'+(pending.lastError?'：'+pending.lastError:'。'));
 else if(pending?.lastError)parts.push(pending.lastError);
 return parts.join('');
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
  h('p',{text:'同意後，打牌時會在背景收集你自己的決策。按「用這些紀錄學習」會做出一個模型。之後在單人對戰把難度選成「學習」，這個模型只會在困難 AI 的相近走法之間加減有限的分數。立即斬殺、避免立刻輸掉、必要阻擋和關鍵資源仍以困難 AI 為準。原始分數差不是機率，畫面上也不換成百分比。猜中你的選擇也不是勝率。打完一把不會自動學習。'}));
 let me=null;
 try{me=await api('/api/me');}
 catch{root.append(h('p',{text:'請先登入，才能查看、匯出或刪除自己的紀錄。'}),h('a',{href:'/online.html',text:'前往登入'}));return;}
 void me;
 const pending=await flushLocalQueue(me?.id);
 const listed=await api('/api/coach/matches');
 const policyState=await api('/api/coach/policy');
 const steps=listed.matches.reduce((sum,match)=>sum+(Number(match.steps)||0),0);
 root.append(h('p',{text:'匿名識別 '+listed.anonymousId+'。匯出檔不含帳號名稱。'}));
 root.append(h('p',{text:'伺服器上目前 '+listed.matches.length+' 場、'+steps+' 步。最新的一場排在最上面。每一場的選擇都會留下。學習使用最近 4000 步裡、有兩個以上合法選項的決策，所以筆數會少於總步數。'}));
 const pendingNote=queueNote(pending);
 if(pendingNote)root.append(h('p',{text:pendingNote}));
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
 const learn=h('button',{type:'button',text:'用這些紀錄學習'});
 const report=h('p',{class:'note',text:lastReport});
 if(policyState?.message)root.append(h('p',{text:policyState.message}));
 learn.addEventListener('click',async()=>{
  learn.disabled=true;
  lastReport='正在學習…';
  report.textContent=lastReport;
  try{
   await flushLocalQueue(me?.id);
   const result=await api('/api/coach/learn',{method:'POST',body:{}});
   lastReport=[result.notice,result.report||learnReport(result.policy)].filter(Boolean).join('');
   await render();
  }catch(error){
   lastReport=error.message;
   report.textContent=lastReport;
   learn.disabled=false;
  }
 });
 const deleteAll=h('button',{type:'button',text:'刪除全部紀錄'});
 deleteAll.addEventListener('click',async()=>{
  if(!window.confirm('刪除這個帳號的全部教 AI 紀錄和學習結果？牌組與帳號不會被刪除。'))return;
  await api('/api/coach',{method:'DELETE'});
  await render();
 });
 actions.append(exportButton,jsonlButton,learn);
 if(policyState?.canRestore){
  const restore=h('button',{type:'button',text:'恢復上一版'});
  restore.addEventListener('click',async()=>{
   if(!window.confirm('恢復上一版啟用中的學習結果？目前這一版會留在這個帳號裡，其他帳號不會被改到。'))return;
   restore.disabled=true;
   try{
    await api('/api/coach/policy/restore',{method:'POST',body:{}});
    lastReport='已恢復上一版。對戰的「學習」難度會使用恢復後的結果。';
    await render();
   }catch(error){
    lastReport=error.message;
    report.textContent=lastReport;
    restore.disabled=false;
   }
  });
  actions.append(restore);
 }
 actions.append(deleteAll);
 root.append(actions,report,h('div',{id:'coach-list',class:'coach-list'}));
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
