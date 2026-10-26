const TITLES=[
 ['bleach','BLEACH'],['gurren-lagann','天元突破'],['sword-art-online','刀劍神域'],
 ['solo-leveling','我獨自升級'],['mushoku-tensei','無職轉生'],['rezero','Re:Zero']
];
const SAVED=[
 ['bleach','bleach-arena-saved-decks-v1'],['gurren-lagann','ua-ttg-saved-v1'],
 ['sword-art-online','ua-sao-saved-v1'],['solo-leveling','ua-slg-saved-v1'],
 ['mushoku-tensei','ua-mst-saved-v1'],['rezero','ua-rez-saved-v1']
];
const DRAFTS=[
 ['bleach','bleach-arena-deck-v1'],['gurren-lagann','ua-ttg-draft-v1'],
 ['sword-art-online','ua-sao-draft-v1'],['solo-leveling','ua-slg-draft-v1'],
 ['mushoku-tensei','ua-mst-draft-v1'],['rezero','ua-rez-draft-v1']
];
const PHASES=[['start','開始'],['move','移動'],['main','主要'],['attack','攻擊']];
const ROOM=/^[A-HJ-NP-Z2-9]{8}$/;
const app={offline:false,user:null,decks:[],room:null,error:'',notice:'',busy:false,mode:'login',pollToken:0,timer:0};

function el(tag,props={},...children){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(props)){
  if(value==null)continue;
  if(key==='text')node.textContent=String(value);
  else if(key==='class')node.className=value;
  else if(key.startsWith('on')&&typeof value==='function')node.addEventListener(key.slice(2).toLowerCase(),value);
  else if(key==='disabled'||key==='checked'||key==='selected')node[key]=!!value;
  else node.setAttribute(key,String(value));
 }
 for(const child of children.flat()){
  if(child==null||child===false)continue;
  node.append(child instanceof Node?child:document.createTextNode(String(child)));
 }
 return node;
}
async function api(path,options={}){
 let response;
 try{
  response=await fetch(path,{
   method:options.method||'GET',credentials:'same-origin',
   headers:options.body===undefined?{}:{'content-type':'application/json'},
   body:options.body===undefined?undefined:JSON.stringify(options.body)
  });
 }catch{
  const error=new Error('連不到帳號伺服器。');
  error.offline=true;throw error;
 }
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  const error=new Error(data.error||'操作失敗');
  error.status=response.status;throw error;
 }
 return data;
}
function stopPoll(){app.pollToken+=1;clearInterval(app.timer);app.timer=0;}
function startPoll(){
 stopPoll();
 const token=app.pollToken;
 app.timer=setInterval(async()=>{
  if(!app.room||token!==app.pollToken)return;
  try{applyRoom(await api('/api/rooms/'+app.room.code));}
  catch(error){
   if(error.status===404){app.room=null;app.error=error.message;stopPoll();history.replaceState(null,'','online.html');render();}
  }
 },1200);
}
function applyRoom(next){
 const same=app.room&&next.revision===app.room.revision&&next.status===app.room.status&&!app.busy;
 app.room=next;app.busy=false;
 if(!same)render();
}
function total(deck){return Object.values(deck.counts||{}).reduce((sum,n)=>sum+Number(n||0),0);}
function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function shell(...body){
 return el('div',{},
  el('header',{class:'top'},
   el('a',{class:'brand',href:'/'},el('span',{class:'mark',text:'UA'}),el('span',{},el('strong',{text:'UNION ARENA'}),el('div',{class:'muted',text:'帳號與線上對戰'}))),
   el('nav',{class:'row'},
    el('a',{class:'linkish',href:'/index.html',text:'牌組構築'}),
    el('a',{class:'linkish',href:'/',text:'電腦對戰'}),
    app.user?el('button',{type:'button',text:'登出',onClick:logout}):null)),
  app.error?el('div',{class:'banner error',role:'alert',text:app.error}):null,
  app.notice?el('div',{class:'banner ok',role:'status',text:app.notice}):null,
  ...body);
}
function authView(){
 const register=app.mode==='register';
 return shell(el('section',{class:'panel'},
  el('h1',{text:register?'建立帳號':'登入'}),
  el('p',{class:'muted',text:'登入後，牌組會存在這個帳號。線上對戰由伺服器主持，對手看不到你的手牌、牌庫順序和生命卡。'}),
  el('form',{id:'auth-form',class:'grid',onSubmit:submitAuth},
   el('label',{},'帳號名稱',el('input',{name:'username',required:'',minlength:'2',maxlength:'16',autocomplete:'username'})),
   el('label',{},'密碼',el('input',{name:'password',type:'password',required:'',minlength:'8',maxlength:'72',autocomplete:register?'new-password':'current-password'})),
   el('div',{class:'row'},
    el('button',{class:'primary',type:'submit',text:register?'註冊並登入':'登入',disabled:app.busy}),
    el('button',{type:'button',text:register?'已有帳號':'建立新帳號',onClick:()=>{app.mode=register?'login':'register';app.error='';render();}})))));
}
function deckList(){
 const box=el('div');
 if(!app.decks.length)box.append(el('p',{class:'muted',text:'這個帳號還沒有牌組。可以從本機組卡紀錄匯入，或貼上牌表。'}));
 for(const deck of app.decks){
  box.append(el('div',{class:'deck'},
   el('div',{},el('strong',{text:deck.name}),el('div',{class:'muted',text:(deck.titleLabel||deck.title)+' · '+total(deck)+' 張'+(deck.playable?'':' · '+((deck.issues||[])[0]||'還不能對戰'))})),
   el('div',{class:'row'},
    el('span',{class:'tag'+(deck.playable?' ready':''),text:deck.playable?'可對戰':'僅保存'}),
    el('button',{type:'button',text:'刪除',disabled:app.busy,onClick:()=>removeDeck(deck)}))));
 }
 return box;
}
function deckSelect(){
 const playable=app.decks.filter(deck=>deck.playable);
 if(!playable.length)return el('select',{name:'deckId'},el('option',{value:'',text:'還沒有可對戰的牌組'}));
 return el('select',{name:'deckId',required:''},...playable.map(deck=>el('option',{value:deck.id,text:deck.name+' · '+(deck.titleLabel||deck.title)})));
}
function homeView(){
 const playable=app.decks.some(deck=>deck.playable);
 return shell(el('div',{class:'grid split'},
  el('section',{class:'panel'},
   el('h1',{text:app.user.username+' 的牌組'}),
   el('p',{class:'muted',text:'每個帳號只看得到自己的牌組。在牌組構築按儲存時，若已經登入，也會同步到這裡。'}),
   el('div',{class:'row'},
    el('button',{type:'button',text:'匯入這台瀏覽器的牌組',disabled:app.busy,onClick:importLocal}),
    el('a',{class:'linkish',href:'/index.html',text:'前往牌組構築'})),
   deckList(),
   el('details',{},el('summary',{text:'貼上牌表保存'}),
    el('form',{class:'grid',onSubmit:savePasted},
     el('label',{},'牌組名稱',el('input',{name:'name',maxlength:'40',required:''})),
     el('label',{},'作品',el('select',{name:'title'},...TITLES.map(([id,label])=>el('option',{value:id,text:label})))),
     el('label',{},'牌表（每行「4 BLC-1-034」）',el('textarea',{name:'list',required:''})),
     el('button',{class:'primary',type:'submit',text:'保存到帳號',disabled:app.busy})))),
  el('section',{class:'panel'},
   el('h2',{text:'線上對戰'}),
   el('p',{class:'muted',text:'雙方各用自己的帳號和一副 50 張、已完整支援 V2 的牌組。伺服器發牌，並只把你看得到的場面傳回來。'}),
   el('form',{class:'grid',onSubmit:createRoom},
    el('label',{},'使用牌組',deckSelect()),
    el('label',{},'先手',el('select',{name:'first'},
     el('option',{value:'me',text:'我先手'}),el('option',{value:'opponent',text:'對方先手'}),el('option',{value:'random',text:'隨機'}))),
    el('button',{class:'primary',type:'submit',text:'建立房間',disabled:app.busy||!playable})),
   el('form',{class:'grid',onSubmit:joinRoom},
    el('label',{},'房間代碼',el('input',{name:'code',maxlength:'8',autocapitalize:'characters',required:''})),
    el('label',{},'使用牌組',deckSelect()),
    el('button',{type:'submit',text:'加入房間',disabled:app.busy||!playable})))));
}
function cardBox(card){
 if(!card)return el('div',{class:'slot empty',text:'空'});
 if(card.faceDown&&!card.cardId)return el('div',{class:'slot facedown',text:'蓋牌'});
 const bits=[card.cardId,card.bp!=null?'BP '+card.bp:'',card.ready===true?'ACTIVE':card.ready===false?'REST':''].filter(Boolean);
 const box=el('div',{class:'slot'+(card.color?' '+card.color:'')+(card.ready===false?' rest':'')},
  el('strong',{text:card.name||card.cardId||'卡片'}),el('small',{text:bits.join(' · ')}));
 if(card.raidDepth)box.append(el('small',{text:'Raid '+card.raidDepth}));
 return box;
}
function zone(title,cards){
 return el('div',{},el('div',{class:'muted',text:title}),el('div',{class:'zone'},...(cards||[]).map(cardBox)));
}
function side(name,player,packLabel,{openHand=false}={}){
 const stats=[player.lifeCount+' 生命',player.deckCount+' 牌庫',player.handCount+' 手牌',player.apReady+'/'+player.apTotal+' AP',player.energyTotal+' 能源'].join(' · ');
 const block=el('section',{class:'panel side'},
  el('header',{},el('h2',{text:name}),el('span',{class:'muted',text:packLabel})),
  el('p',{class:'muted',text:stats}),
  zone('前線',player.front),zone('能源線',player.energy));
 if(openHand){
  const hand=el('div',{class:'hand'});
  for(const card of player.hand||[])hand.append(cardBox(card));
  if(!(player.hand||[]).length)hand.append(el('div',{class:'slot empty',text:'沒有手牌'}));
  block.append(el('div',{class:'muted',text:'你的手牌'}),hand);
 }else block.append(el('p',{class:'muted',text:'對手手牌是隱藏的，這裡只顯示張數。'}));
 return block;
}
function matchView(){
 const room=app.room,view=room.view,seat=room.seat;
 if(room.status==='waiting'||!view){
  return shell(el('section',{class:'panel'},
   el('h1',{text:'等待對手加入'}),
   el('p',{class:'muted',text:'把房間代碼給另一位已登入、而且有可對戰牌組的玩家。'}),
   el('div',{class:'code',text:room.code}),
   el('p',{text:'你的牌組：'+(room.you?.deckName||'')+' · '+(room.you?.titleLabel||'')}),
   el('div',{class:'row'},
    el('button',{type:'button',class:'primary',text:'複製代碼',onClick:()=>copyCode(room.code)}),
    el('button',{type:'button',text:'取消房間',disabled:app.busy,onClick:cancelRoom}))));
 }
 const you=view.players[seat],opp=view.players[1-seat];
 const phase=el('div',{class:'phases'});
 for(const [id,label] of PHASES)phase.append(el('span',{class:view.phase===id?'current':'',text:label}));
 const actions=el('div',{class:'actions'});
 if(room.status==='finished')actions.append(el('p',{text:(room.winner?.username||'對局')+' 獲勝。'}));
 else if(room.yourTurn){
  if(!room.choices.length)actions.append(el('p',{class:'muted',text:'正在等待可以執行的操作。'}));
  for(const choice of room.choices)actions.append(el('button',{type:'button',text:choice.label,disabled:app.busy,onClick:()=>sendAction(choice.index)}));
 }else actions.append(el('p',{class:'muted',text:'等待對手操作。'}));
 const log=el('div',{class:'log'});
 for(const line of room.log||[])log.append(el('div',{text:line.text}));
 return shell(
  el('div',{class:'row'},el('h1',{text:'房間 '+room.code}),phase,el('span',{class:'tag',text:room.youAreFirst?'你是先手':'對方是先手'})),
  side((room.opponent?.username||'對手')+'（對手）',opp,room.opponent?.titleLabel||''),
  side((room.you?.username||'你')+'（你）',you,room.you?.titleLabel||'',{openHand:true}),
  el('div',{class:'grid split'},
   el('section',{class:'panel'},el('h2',{text:room.yourTurn?'輪到你':'對局操作'}),actions,
    el('div',{class:'row'},el('button',{type:'button',text:'認輸',disabled:app.busy||room.status!=='playing',onClick:resign}),
     room.status==='finished'?el('button',{type:'button',text:'返回大廳',onClick:leaveFinished}):null)),
   el('section',{class:'panel'},el('h2',{text:'公開紀錄'}),el('p',{class:'muted',text:'這裡不寫出手牌或牌庫裡的卡名。'}),log)));
}
function render(){
 const root=document.querySelector('#app');
 const view=app.offline?shell(el('section',{class:'panel'},
  el('h1',{text:'帳號服務沒有啟動'}),
  el('p',{text:'這個頁面要和帳號服務放在同一個網址。本機請執行 npm start。公開使用時，把網站部署到 Cloudflare，帳號和每一場對戰會留在 Durable Objects，你的電腦不用一直開著。'}),
  el('p',{class:'muted',text:'只部署靜態檔案時，牌組仍留在這台瀏覽器，也不會有線上對戰。'}))):
  app.room?matchView():app.user?homeView():authView();
 root.replaceChildren(view);
}
async function submitAuth(event){
 event.preventDefault();
 const data=new FormData(event.currentTarget);
 app.busy=true;app.error='';render();
 try{
  const result=await api(app.mode==='register'?'/api/register':'/api/login',{method:'POST',body:{username:data.get('username'),password:data.get('password')}});
  app.user={username:result.username};
  app.decks=(await api('/api/decks')).decks;
  app.notice='已登入 '+result.username+'。';
 }catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function logout(){
 app.busy=true;
 try{await api('/api/logout',{method:'POST'});}catch{/* The local screen still returns to the login form. */}
 stopPoll();app.user=null;app.decks=[];app.room=null;app.notice='';app.busy=false;
 history.replaceState(null,'','online.html');render();
}
async function refreshDecks(){app.decks=(await api('/api/decks')).decks;}
async function importLocal(){
 app.busy=true;app.error='';app.notice='';render();
 let count=0;
 try{
  for(const [title,key] of SAVED){
   const rows=readJson(key);
   if(!Array.isArray(rows))continue;
   for(const row of rows){
    if(!row||typeof row.name!=='string'||!row.counts)continue;
    const localId=typeof row.id==='string'&&/^[A-Za-z0-9:_-]{1,80}$/.test(row.id)?row.id:null;
    await api('/api/decks',{method:'POST',body:{title,name:row.name,counts:row.counts,localId}});
    count+=1;
   }
  }
  for(const [title,key] of DRAFTS){
   const counts=readJson(key);
   if(!counts||typeof counts!=='object'||Array.isArray(counts))continue;
   if(!Object.values(counts).some(n=>Number(n)>0))continue;
   await api('/api/decks',{method:'POST',body:{title,name:'本機草稿',counts,localId:'draft-'+title}});
   count+=1;
  }
  await refreshDecks();
  app.notice=count?'已匯入 '+count+' 筆牌組。':'這台瀏覽器沒有可匯入的牌組。';
 }catch(error){app.error=error.message;}
 app.busy=false;render();
}
function parseList(text){
 const counts={};
 for(const raw of String(text).split(/\r?\n/)){
  const line=raw.trim();
  if(!line||line.startsWith('#')||line.startsWith('//'))continue;
  let count,id,match;
  if((match=line.match(/^(\d{1,2})\s*[x×]?\s*(\S+)$/))){count=Number(match[1]);id=match[2];}
  else if((match=line.match(/^(\S+)\s*[x×:]\s*(\d{1,2})$/))){id=match[1];count=Number(match[2]);}
  else throw new Error('無法讀取這一行：'+line.slice(0,40));
  counts[id]=(counts[id]||0)+count;
 }
 return counts;
}
async function savePasted(event){
 event.preventDefault();
 const data=new FormData(event.currentTarget);
 app.busy=true;app.error='';
 try{
  await api('/api/decks',{method:'POST',body:{name:data.get('name'),title:data.get('title'),counts:parseList(data.get('list'))}});
  await refreshDecks();app.notice='已保存到帳號。';
 }catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function removeDeck(deck){
 if(!confirm('刪除「'+deck.name+'」？這只會從帳號移除。'))return;
 app.busy=true;app.error='';
 try{await api('/api/decks/'+deck.id,{method:'DELETE'});await refreshDecks();app.notice='已刪除牌組。';}
 catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function createRoom(event){
 event.preventDefault();
 const data=new FormData(event.currentTarget);
 app.busy=true;app.error='';app.notice='';render();
 try{
  app.room=await api('/api/rooms',{method:'POST',body:{deckId:data.get('deckId'),first:data.get('first')}});
  history.replaceState(null,'','online.html#'+app.room.code);
  startPoll();
 }catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function joinRoom(event){
 event.preventDefault();
 const data=new FormData(event.currentTarget);
 const code=String(data.get('code')||'').trim().toUpperCase();
 if(!ROOM.test(code)){app.error='房間代碼是 8 個英數。';render();return;}
 app.busy=true;app.error='';render();
 try{
  app.room=await api('/api/rooms/'+code+'/join',{method:'POST',body:{deckId:data.get('deckId')}});
  history.replaceState(null,'','online.html#'+code);
  startPoll();
 }catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function copyCode(code){
 try{await navigator.clipboard.writeText(code);app.notice='已複製房間代碼。';}
 catch{app.notice='房間代碼：'+code;}
 render();
}
async function cancelRoom(){
 if(!app.room)return;
 app.busy=true;
 try{await api('/api/rooms/'+app.room.code+'/cancel',{method:'POST'});app.room=null;app.notice='已取消房間。';stopPoll();history.replaceState(null,'','online.html');}
 catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function sendAction(index){
 if(!app.room)return;
 app.busy=true;app.error='';render();
 try{applyRoom(await api('/api/rooms/'+app.room.code+'/actions',{method:'POST',body:{index}}));}
 catch(error){app.error=error.message;app.busy=false;render();}
}
async function resign(){
 if(!app.room||!confirm('確定認輸？'))return;
 app.busy=true;
 try{applyRoom(await api('/api/rooms/'+app.room.code+'/resign',{method:'POST'}));}
 catch(error){app.error=error.message;app.busy=false;render();}
}
function leaveFinished(){stopPoll();app.room=null;app.notice='已離開對局。';history.replaceState(null,'','online.html');render();}
async function boot(){
 try{await api('/api/health');}
 catch{app.offline=true;render();return;}
 try{
  app.user=await api('/api/me');
  app.decks=(await api('/api/decks')).decks;
  const code=location.hash.slice(1);
  if(ROOM.test(code)){
   try{app.room=await api('/api/rooms/'+code);startPoll();}catch{/* An old code just opens the lobby. */}
  }
 }catch(error){if(error.status!==401)app.error=error.message;}
 render();
}
boot();
