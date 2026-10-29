const TITLES=[
 ['bleach','BLEACH'],['gurren-lagann','天元突破'],['sword-art-online','刀劍神域'],
 ['solo-leveling','我獨自升級'],['mushoku-tensei','無職轉生'],['rezero','Re:Zero'],
 ['steins-gate','命運石之門'],['madoka','魔法少女小圓']
];
const SAVED=[
 ['bleach','bleach-arena-saved-decks-v1'],['gurren-lagann','ua-ttg-saved-v1'],
 ['sword-art-online','ua-sao-saved-v1'],['solo-leveling','ua-slg-saved-v1'],
 ['mushoku-tensei','ua-mst-saved-v1'],['rezero','ua-rez-saved-v1'],
 ['steins-gate','ua-stg-saved-v1'],['madoka','ua-mmm-saved-v1']
];
const DRAFTS=[
 ['bleach','bleach-arena-deck-v1'],['gurren-lagann','ua-ttg-draft-v1'],
 ['sword-art-online','ua-sao-draft-v1'],['solo-leveling','ua-slg-draft-v1'],
 ['mushoku-tensei','ua-mst-draft-v1'],['rezero','ua-rez-draft-v1'],
 ['steins-gate','ua-stg-draft-v1'],['madoka','ua-mmm-draft-v1']
];
const PHASES=[['setup','起手調度'],['start','開始'],['move','移動'],['main','主要'],['attack','攻擊']];
const ROOM=/^[A-HJ-NP-Z2-9]{8}$/;
const app={offline:false,user:null,decks:[],openRooms:[],room:null,error:'',notice:'',busy:false,mode:'login',deckTab:'mine',pollToken:0,timer:0,showPassword:false,remember:true,recordedCode:'',draftUser:'',draftPass:''};
function captureAuthDraft(form){
 if(!form)return;
 const data=new FormData(form);
 app.draftUser=String(data.get('username')??'');
 app.draftPass=String(data.get('password')??'');
 if(form.elements.remember)app.remember=data.get('remember')!=null;
}

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
 const finished=next?.status==='finished'&&app.room?.status!=='finished'&&app.recordedCode!==next.code;
 const same=app.room&&next.revision===app.room.revision&&next.status===app.room.status&&!app.busy;
 app.room=next;app.busy=false;
 if(finished)noteOnlineResult(next);
 if(!same)render();
}
function noteOnlineResult(room){
 const deckId=room?.you?.deckId;
 if(typeof deckId!=='string'||!deckId)return;
 if(room.winner?.seat!==0&&room.winner?.seat!==1)return;
 app.recordedCode=room.code;
 const win=room.winner.seat===room.seat;
 import('./deck-records.mjs').then(mod=>{
  mod.recordDeckResult(localStorage,{deckId,channel:'online',win,opponent:room.opponent?.username||'對手',at:new Date().toISOString()});
 }).catch(()=>{});
}
function total(deck){return Object.values(deck.counts||{}).reduce((sum,n)=>sum+Number(n||0),0);}
function readJson(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function notices(){
 return el('div',{},
  app.error?el('div',{class:'banner error',role:'alert',text:app.error}):null,
  app.notice?el('div',{class:'banner ok',role:'status',text:app.notice}):null);
}
function arenaHeader(){
 return el('header',{class:'ua-site-header','aria-label':'UNION ARENA 主要導覽'},
  el('a',{class:'ua-header-brand',href:'/online.html','aria-label':'UNION ARENA V2 首頁'},
   el('span',{class:'ua-header-overline',text:'TRADING CARD GAME'}),
   el('span',{class:'ua-header-logo'},
    el('strong',{text:'UNION ARENA'}),el('em',{text:'V2'}))),
  el('nav',{class:'ua-header-nav','aria-label':'主要功能'},
   el('a',{href:'/online.html','aria-current':'page',text:'首頁'}),
   el('a',{href:'/universal-v2-preview.html',text:'對戰'}),
   el('a',{href:'/index.html',text:'牌組'}),
   el('a',{href:'/index.html#cards',text:'卡牌一覽'}),
   el('a',{href:'/index.html#records',text:'排行榜'}),
   el('a',{href:'/index.html#rules',text:'規則／FAQ'})),
  app.user?el('div',{class:'ua-header-account'},
   el('span',{class:'ua-header-username',title:app.user.username,text:app.user.username}),
   el('button',{class:'ua-header-logout',type:'button',text:'登出',onClick:logout})):null);
}
function shell(...body){
 return el('div',{class:'arena-app'},arenaHeader(),notices(),...body);
}
function authView(){
 const register=app.mode==='register';
 return el('div',{class:'arena-login'},
  el('div',{class:'arena-login-bg','aria-hidden':'true'}),
  el('section',{class:'arena-login-card'},
   el('div',{class:'arena-wordmark'},el('small',{text:'TRADING CARD GAME'}),el('strong',{text:'UNION ARENA'}),el('em',{text:'ユニオンアリーナ'})),
   notices(),
   el('form',{id:'auth-form',class:'arena-login-form',onSubmit:submitAuth},
    el('h1',{text:register?'註冊新帳號':'歡迎回到競技場'}),
    el('p',{class:'arena-login-sub',text:register?'建立帳號後，牌組存在這個帳號。':'登入您的帳號，開始對戰'}),
    el('label',{class:'arena-field'},'帳號',el('input',{name:'username',value:app.draftUser,required:'',minlength:'2',maxlength:'16',autocomplete:'username',placeholder:'帳號',onInput:event=>{app.draftUser=event.target.value;}})),
    el('label',{class:'arena-field'},'密碼',
     el('span',{class:'arena-pass'},
      el('input',{name:'password',value:app.draftPass,type:app.showPassword?'text':'password',required:'',minlength:'8',maxlength:'72',autocomplete:register?'new-password':'current-password',placeholder:'密碼',onInput:event=>{app.draftPass=event.target.value;}}),
      el('button',{type:'button',class:'arena-eye',text:app.showPassword?'隱藏':'顯示','aria-pressed':String(app.showPassword),onClick:event=>{captureAuthDraft(event.currentTarget.form);app.showPassword=!app.showPassword;render();}}))),
    el('div',{class:'arena-login-row'},
     el('label',{class:'arena-check'},el('input',{type:'checkbox',name:'remember',checked:app.remember!==false,onChange:event=>{app.remember=event.target.checked;}}),'保持登入狀態'),
     register?null:el('button',{type:'button',class:'arena-text-button',text:'忘記密碼？',onClick:event=>{captureAuthDraft(event.currentTarget.form);app.notice='這個站只保存密碼雜湊，沒有寄信重設。忘記密碼就無法登回原帳號，可以註冊新帳號。';render();}})),
    el('button',{class:'arena-login-submit',type:'submit',text:register?'註冊並登入':'登入 →',disabled:app.busy}),
    el('p',{class:'arena-or',text:'或'}),
    el('button',{type:'button',class:'arena-login-alt',text:register?'已有帳號':'註冊新帳號',onClick:event=>{captureAuthDraft(event.currentTarget.form);app.mode=register?'login':'register';app.error='';render();}}))));
}
let coverCatalogue=null;
function loadCovers(){
 if(loadCovers.started||coverCatalogue)return;
 loadCovers.started=true;
 // Loaded only after login. The account script itself stays a classic script so
 // the login screen can boot even when the card catalogue is unavailable.
 try{
  Promise.all([import('./title-registry.mjs'),import('./deck-gallery.mjs')]).then(([titles,gallery])=>{
   coverCatalogue={titles:titles.TITLES,summarize:gallery.summarizeDeck};
   if(app.user)render();
  }).catch(()=>{});
 }catch{/* catalogue is optional for the account list */}
}
function deckWhen(iso,publish){
 const missing=publish?'尚未記錄發布時間':'尚未記錄更新時間';
 const time=Date.parse(iso||'');
 if(!Number.isFinite(time))return missing;
 const elapsed=Math.max(0,Date.now()-time),verb=publish?'發布':'更新',day=86400000;
 if(elapsed<60000)return '剛剛'+verb;
 if(elapsed<3600000)return Math.floor(elapsed/60000)+' 分鐘前'+verb;
 if(elapsed<day)return Math.floor(elapsed/3600000)+' 小時前'+verb;
 return Math.floor(elapsed/day)+' 天前'+verb;
}
function readShareSet(){
 try{
  const raw=JSON.parse(localStorage.getItem('ua-v2-deck-shared-ids-v1')||'[]');
  return new Set(Array.isArray(raw)?raw.filter(id=>typeof id==='string'&&id):[]);
 }catch{return new Set();}
}
function deckCoverSrc(deck){
 if(!coverCatalogue)return 'assets/mark.svg';
 const cards=coverCatalogue.titles.find(item=>item.id===deck.title)?.cards||[];
 const cover=coverCatalogue.summarize(cards,deck.counts).cover;
 return cover?.onlineImage||cover?.image||'assets/mark.svg';
}
function deckList(){
 loadCovers();
 const sharedIds=readShareSet();
 const rows=app.deckTab==='shared'?app.decks.filter(deck=>sharedIds.has(deck.id)):app.decks;
 const box=el('div',{class:'dkg dkg-account'});
 box.append(el('div',{class:'dkg-tabs',role:'tablist','aria-label':'我的牌組與分享列表'},
  el('button',{type:'button',role:'tab',class:app.deckTab==='mine'?'active':'','aria-selected':String(app.deckTab==='mine'),text:'我的牌組',onClick:()=>{app.deckTab='mine';render();}}),
  el('button',{type:'button',role:'tab',class:app.deckTab==='shared'?'active':'','aria-selected':String(app.deckTab==='shared'),text:'分享列表',onClick:()=>{app.deckTab='shared';render();}})));
 if(!rows.length)box.append(el('div',{class:'dkg-empty',text:app.deckTab==='shared'?'快來分享一個牌組吧！':'這個帳號還沒有牌組。可以從本機組卡紀錄匯入，或貼上牌表。'}));
 for(const deck of rows){
  const when=deckWhen(deck.updatedAt,app.deckTab==='shared');
  const art=el('img',{src:deckCoverSrc(deck),alt:deck.name||'牌組封面',loading:'lazy',decoding:'async'});
  art.addEventListener('error',()=>{art.src='assets/mark.svg';});
  const open=el('button',{type:'button',class:'dkg-card',disabled:app.busy,'aria-label':'查看牌組 '+(deck.name||''),onClick:()=>viewAccountDeck(deck)},
   el('span',{class:'dkg-card-art'},art),
   el('span',{class:'dkg-card-copy'},
    el('strong',{text:deck.name}),
    el('small',{text:when}),
    el('small',{text:(deck.titleLabel||deck.title)+' · '+total(deck)+' 張'+(deck.playable?'':' · '+((deck.issues||[])[0]||'還不能對戰'))})));
  box.append(el('article',{class:'deck-visual'},
   open,
   el('div',{class:'row'},
    el('span',{class:'tag'+(deck.playable?' ready':''),text:deck.playable?'可對戰':'僅保存'}),
    el('button',{type:'button',class:'primary',text:'圖片編輯',disabled:app.busy,onClick:()=>editAccountDeck(deck)}),
    el('button',{type:'button',text:'刪除',disabled:app.busy,onClick:()=>removeDeck(deck)}))));
 }
 return box;
}
// Only transiently transfer the logged-in user's own deck to the visual editor.
// No credentials or hidden match information are serialized.
function openAccountDeck(deck,intent){
 if(!app.user||!deck||typeof deck.title!=='string'||!deck.counts)return;
 try{
  sessionStorage.setItem('ua-account-visual-editor-v1',JSON.stringify({
   title:deck.title,name:deck.name,counts:deck.counts,
   remoteId:deck.id,localId:deck.localId||null,coverId:deck.coverId||null,intent
  }));
  window.location.assign('/index.html');
 }catch(error){
  app.error='無法開啟圖片式組卡：'+(error?.message||'瀏覽器儲存不可用');
  render();
 }
}
function editAccountDeck(deck){openAccountDeck(deck,'edit');}
function viewAccountDeck(deck){openAccountDeck(deck,'detail');}
function deckSelect(){
 const playable=app.decks.filter(deck=>deck.playable);
 if(!playable.length)return el('select',{name:'deckId'},el('option',{value:'',text:'還沒有可對戰的牌組'}));
 return el('select',{name:'deckId',required:''},...playable.map(deck=>el('option',{value:deck.id,text:deck.name+' · '+(deck.titleLabel||deck.title)})));
}
function recentBattleList(){
 const box=el('div',{class:'arena-recent'});
 let rows=[];
 try{
  const raw=JSON.parse(localStorage.getItem('ua-deck-records-v1')||'{}');
  for(const [deckId,record] of Object.entries(raw||{})){
   for(const item of record?.recent||[])rows.push({deckId,...item});
  }
 }catch{rows=[];}
 rows.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
 rows=rows.slice(0,6);
 if(!rows.length)return el('p',{class:'muted',text:'尚無戰績'});
 for(const row of rows){
  const deck=app.decks.find(item=>item.id===row.deckId);
  box.append(el('p',{},(row.result==='win'?'勝':'敗')+' · '+(row.channel==='online'?'線上對戰':'電腦對戰')+' · '+(deck?.name||row.deckId)));
 }
 return box;
}
function openRoomList(){
 const rooms=Array.isArray(app.openRooms)?app.openRooms:[];
 if(!rooms.length)return null;
 return el('div',{class:'open-rooms'},
  el('h3',{text:'還沒結束的房間'}),
  el('p',{class:'muted',text:'等待加入的房間會在建立新房間時自動關閉。正在對戰的房間可以進入，或離開後再建立。'}),
  ...rooms.map(room=>el('div',{class:'room-row'},
   el('span',{class:'room-code',text:room.code}),
   el('span',{text:(room.status==='playing'?'對戰中':'等待加入')+(room.role==='guest'?' · 你是訪客':'')}),
   el('button',{type:'button',text:'進入',disabled:app.busy,onClick:()=>enterListed(room.code)}),
   room.status==='playing'
    ?el('button',{type:'button',text:'離開',disabled:app.busy,onClick:()=>leaveListed(room)})
    :room.role==='host'
     ?el('button',{type:'button',text:'取消',disabled:app.busy,onClick:()=>leaveListed(room)})
     :null)));
}
function homeView(){
 const playable=app.decks.some(deck=>deck.playable);
 const live=(app.openRooms||[]).filter(room=>room.status==='playing').length;
 const createLabel=app.busy?'建立中…':live>=3?'關閉最舊的對戰並建立':'建立房間';
 return shell(el('main',{class:'arena-lobby'},
  el('header',{class:'arena-battle-heading'},
   el('span',{class:'arena-battle-eyebrow',text:'UNION ARENA · V2 MATCH LOBBY'}),
   el('h1',{text:'對戰大廳'}),
   el('p',{class:'muted',text:'選擇對戰方式，使用你的 V2 牌組展開對決。'})),
  el('div',{class:'arena-entries arena-battle-modes'},
   el('a',{class:'arena-entry arena-entry-solo',href:'/universal-v2-preview.html'},el('span',{class:'arena-mode-icon',text:'⚔'}),el('strong',{text:'電腦對戰'}),el('span',{text:'選擇雙方牌組與 AI 難度，開始 V2 單人對戰。'}),el('span',{class:'arena-mode-cta',text:'設定電腦對戰 →'})),
   el('a',{class:'arena-entry arena-entry-online',href:'#online-match'},el('span',{class:'arena-mode-icon',text:'◎'}),el('strong',{text:'線上對戰'}),el('span',{text:'建立房間或輸入代碼，與其他玩家對戰。'}),el('span',{class:'arena-mode-cta',text:'前往線上房間 ↓'})),
   el('a',{class:'arena-entry arena-entry-deck',href:'/index.html'},el('span',{class:'arena-mode-icon',text:'▣'}),el('strong',{text:'牌組構築'}),el('span',{text:'圖片式牌組構築：搜尋卡牌、調整張數並保存牌組。'}),el('span',{class:'arena-mode-cta',text:'管理我的牌組 →'}))),
  el('section',{class:'panel'},
   el('h2',{text:'我的牌組'}),
   el('p',{class:'muted',text:'每個帳號只看得到自己的雲端牌組。點選卡片會先打開唯讀詳情；圖片編輯才會改牌。'}),
   el('div',{class:'row'},
    el('a',{class:'primary linkish',href:'/index.html',text:'開啟組卡畫面'}),
    el('button',{type:'button',text:'匯入這台瀏覽器的牌組',disabled:app.busy,onClick:importLocal})),
   deckList(),
   el('details',{},el('summary',{text:'貼上牌表保存'}),
    el('form',{class:'grid',onSubmit:savePasted},
     el('label',{},'牌組名稱',el('input',{name:'name',maxlength:'40',required:''})),
     el('label',{},'作品',el('select',{name:'title'},...TITLES.map(([id,label])=>el('option',{value:id,text:label})))),
     el('label',{},'牌表（每行「4 BLC-1-034」）',el('textarea',{name:'list',required:''})),
     el('button',{class:'primary',type:'submit',text:'保存到帳號',disabled:app.busy})))),
  el('section',{class:'panel',id:'online-match'},
   el('h2',{text:'線上房間 · 建立或加入'}),
   el('p',{class:'muted',text:'雙方各用自己的帳號和一副 50 張、已完整支援 V2 的牌組。伺服器發牌，並只把你看得到的場面傳回來。'}),
   openRoomList(),
   app.error?el('div',{id:'room-alert',class:'banner error',role:'alert',text:app.error}):null,
   el('form',{class:'grid',onSubmit:createRoom},
    el('label',{},'使用牌組',deckSelect()),
    el('label',{},'先手',el('select',{name:'first'},
     el('option',{value:'me',text:'我先手'}),el('option',{value:'opponent',text:'對方先手'}),el('option',{value:'random',text:'隨機'}))),
    el('button',{class:'primary',type:'submit',text:createLabel,disabled:app.busy||!playable})),
   el('form',{class:'grid',onSubmit:joinRoom},
    el('label',{},'房間代碼',el('input',{name:'code',maxlength:'8',autocapitalize:'characters',required:''})),
    el('label',{},'使用牌組',deckSelect()),
    el('button',{type:'submit',text:app.busy?'加入中…':'加入房間',disabled:app.busy||!playable}))),
  el('section',{class:'panel'},el('h2',{text:'最近對戰'}),recentBattleList())));
}
let artById=null;
function artIndex(){
 if(artById||!coverCatalogue)return artById;
 const index=new Map();
 for(const title of coverCatalogue.titles||[]){
  for(const card of title.cards||[]){
   const src=card?.onlineImage||card?.image;
   if(typeof src!=='string'||!src)continue;
   const keys=[card.id,card.number,...(Array.isArray(card.aliases)?card.aliases:[])];
   for(const key of keys)if(typeof key==='string'&&key&&!index.has(key))index.set(key,src);
  }
 }
 artById=index;
 return artById;
}
function cardSrc(card){
 const index=artIndex();
 return index&&card?.cardId?index.get(card.cardId)||'':'';
}
function cardBox(card){
 if(!card)return el('div',{class:'slot empty','aria-label':'空位'},el('span',{text:'空'}));
 if(card.faceDown&&!card.cardId)return el('div',{class:'slot facedown',text:'蓋牌'});
 const bits=[card.cardId,card.bp!=null?'BP '+card.bp:'',card.ready===true?'ACTIVE':card.ready===false?'REST':''].filter(Boolean);
 const label=[card.name||card.cardId||'卡片',...bits].join(' · ');
 const box=el('div',{class:'slot occupied'+(card.color?' '+card.color:'')+(card.ready===false?' rest':''),title:label,'aria-label':label});
 const src=cardSrc(card);
 if(src){
  const img=el('img',{class:'art',src,alt:card.name||card.cardId||'卡片',decoding:'async',referrerpolicy:'no-referrer'});
  img.addEventListener('error',()=>{img.remove();box.classList.add('art-missing');});
  box.append(img);
 }
 box.append(el('strong',{text:card.name||card.cardId||'卡片'}),el('small',{text:bits.join(' · ')}));
 if(card.raidDepth)box.append(el('small',{class:'art-meta',text:'Raid '+card.raidDepth}));
 return box;
}
function zone(title,cards){
 const kind=title==='能源線'?'energy':'front';
 return el('div',{class:'online-line '+kind},
  el('div',{class:'line-label',text:title}),
  el('div',{class:'zone','data-zone':kind},...(cards||[]).map(cardBox)));
}
function statPills(player,setup){
 const pills=el('div',{class:'online-pills'},
  el('span',{text:setup?'生命尚未設置':(player.lifeCount??0)+' 生命'}),
  el('span',{text:(player.deckCount??0)+' 牌庫'}),
  el('span',{text:(player.handCount??0)+' 手牌'}),
  el('span',{text:(player.apReady??0)+'/'+(player.apTotal??0)+' AP'}),
  el('span',{text:(player.energyTotal??0)+' 能源'}));
 if(Array.isArray(player.outside)&&player.outside.length)pills.append(el('span',{text:player.outside.length+' 場外'}));
 if(Array.isArray(player.removed)&&player.removed.length)pills.append(el('span',{text:player.removed.length+' 移除'}));
 return pills;
}
function side(name,player,packLabel,{openHand=false,setup=false}={}){
 const who=el('div',{class:'who'},el('h2',{text:name}),packLabel?el('span',{class:'muted',text:packLabel}):null);
 const head=el('header',{},who);
 if(!openHand){
  const backs=el('div',{class:'hidden-hand','aria-label':'對手手牌是隱藏的，這裡只顯示張數。'});
  const count=Math.min(10,Number(player.handCount)||0);
  for(let i=0;i<count;i++)backs.append(el('i',{'aria-hidden':'true'}));
  backs.append(el('span',{text:'對手手牌是隱藏的，這裡只顯示張數。'}));
  head.append(backs);
 }
 const block=el('section',{class:'online-side'+(openHand?' you':' opponent')},head,statPills(player,setup));
 const front=zone('前線',player.front),energy=zone('能源線',player.energy);
 // Opponent sits across the table: energy is the far row, front faces the center.
 if(openHand)block.append(front,energy);
 else block.append(energy,front);
 return block;
}
function ownHand(player){
 const hand=el('div',{class:'hand'});
 for(const card of player.hand||[])hand.append(cardBox(card));
 if(!(player.hand||[]).length)hand.append(el('div',{class:'slot empty',text:'沒有手牌'}));
 return el('div',{class:'online-hand'},el('div',{class:'line-label',text:'你的手牌'}),hand);
}
function matchView(){
 loadCovers();
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
 if(view.phase==='setup'){
  actions.append(el('p',{class:'setup-note',text:'開局可選擇保留 7 張，或整手重抽 7 張一次。先手先選，後手再選，完成後才設定生命卡。'}));
 }
 const triggers=el('div',{class:'trigger-public'});
 for(const card of view.openTriggers||[]){
  const word=card.trigger?String(card.trigger).toUpperCase():'無觸發';
  const who=card.owner===seat?'你':'對手';
  const shown=cardBox(card);
  shown.append(el('small',{class:'art-meta',text:who+' · '+word+(card.checking?' · 確認中':'')}));
  triggers.append(shown);
 }
 if(view.battle){
  const who=view.battle.owner===seat?'你的':'對手的';
  const tags=[];
  if(Number.isInteger(view.battle.bp))tags.push('BP '+view.battle.bp);
  if(Number.isInteger(view.battle.damage))tags.push(view.battle.damage===2?'直傷2':'直傷'+view.battle.damage);
  if(Number.isInteger(view.battle.impact))tags.push(view.battle.impact>0?'衝擊'+view.battle.impact:'無衝擊');
  actions.append(el('p',{text:who+(view.battle.name||view.battle.cardId)+' 正在攻擊 · '+tags.join(' · ')}));
 }
 if(room.status==='finished')actions.append(el('p',{text:(room.winner?.username||'對局')+' 獲勝。'}));
 else if(room.yourTurn){
  if(!room.choices.length)actions.append(el('p',{class:'muted',text:'正在等待可以執行的操作。'}));
  for(const choice of room.choices)actions.append(el('button',{type:'button',text:choice.label,disabled:app.busy,onClick:()=>sendAction(choice.index)}));
 }else actions.append(el('p',{class:'muted',text:view.pending?.kind==='life-trigger'?'對手正在確認已公開的觸發。':'等待對手操作。'}));
 const log=el('div',{class:'log'});
 for(const line of room.log||[])log.append(el('div',{text:line.text}));
 return shell(el('div',{class:'online-match'},
  el('header',{class:'online-match-bar'},
   el('h1',{text:'房間 '+room.code}),
   phase,
   el('span',{class:'tag',text:room.youAreFirst?'你是先手':room.youAreFirst===false?'對方是先手':'先後手順序確認中'}),
   el('span',{class:'tag turn',text:room.status==='finished'?'對局結束':room.yourTurn?'輪到你':'等待對手'})),
  el('div',{class:'online-table'},
   side((room.opponent?.username||'對手')+'（對手）',opp,room.opponent?.titleLabel||'',{setup:view.phase==='setup'}),
   side((room.you?.username||'你')+'（你）',you,room.you?.titleLabel||'',{openHand:true,setup:view.phase==='setup'}),
   ownHand(you)),
  el('aside',{class:'online-dock'},
   el('section',{class:'panel'},el('h2',{text:room.yourTurn?'輪到你':'對局操作'}),
    (view.openTriggers||[]).length?el('div',{},el('h3',{text:'公開觸發'}),el('p',{class:'muted',text:'翻開的觸發雙方都看得到。'}),triggers):null,
    actions,
    el('div',{class:'row'},el('button',{type:'button',text:'認輸',disabled:app.busy||room.status!=='playing',onClick:resign}),
     room.status==='finished'?el('button',{type:'button',text:'返回大廳',onClick:leaveFinished}):null)),
   el('section',{class:'panel'},el('h2',{text:'公開紀錄'}),el('p',{class:'muted',text:'這裡不寫出手牌或牌庫裡的卡名。觸發會公開給對手。'}),log))));
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
 captureAuthDraft(event.currentTarget);
 const data=new FormData(event.currentTarget);
 app.busy=true;app.error='';render();
 try{
  const result=await api(app.mode==='register'?'/api/register':'/api/login',{method:'POST',body:{username:data.get('username'),password:data.get('password'),remember:data.get('remember')!=null}});
  app.user={username:result.username};
  app.draftUser='';app.draftPass='';
  app.decks=(await api('/api/decks')).decks;
  await refreshOpenRooms();
  app.notice='已登入 '+result.username+'。';
 }catch(error){app.error=error.message;}
 app.busy=false;render();
}
async function logout(){
 app.busy=true;
 try{await api('/api/logout',{method:'POST'});}catch{/* The local screen still returns to the login form. */}
 stopPoll();app.user=null;app.decks=[];app.openRooms=[];app.room=null;app.mode='login';app.notice='';app.busy=false;
 history.replaceState(null,'','online.html');render();
}
async function refreshDecks(){app.decks=(await api('/api/decks')).decks;}
async function refreshOpenRooms(){
 try{app.openRooms=(await api('/api/rooms')).rooms||[];}
 catch{app.openRooms=Array.isArray(app.openRooms)?app.openRooms:[];}
}
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
function showRoomAlert(){
 const alert=document.getElementById?.('room-alert');
 alert?.scrollIntoView?.({block:'nearest',inline:'nearest'});
}
function enterCreated(result){
 const released=Array.isArray(result?.released)?result.released:[];
 if(released.some(item=>item.how==='left'))app.notice='已離開最舊的對戰，並建立新房間 '+result.code+'。';
 else if(released.length)app.notice='已關閉還沒人加入的舊房間，並建立新房間 '+result.code+'。';
 app.room=result;
 history.replaceState(null,'','online.html#'+result.code);
 startPoll();
}
async function postRoom(deckId,first,replaceOldest){
 return api('/api/rooms',{method:'POST',body:{deckId,first,replaceOldest}});
}
async function createRoom(event){
 event.preventDefault();
 if(app.busy)return;
 const data=new FormData(event.currentTarget);
 const deckId=data.get('deckId');
 const first=data.get('first');
 const live=(app.openRooms||[]).filter(room=>room.status==='playing');
 let replaceOldest=false;
 if(live.length>=3){
  replaceOldest=confirm('你有 '+live.length+' 場還沒結束的對戰。建立新房間會先離開最久沒有更新的一場，並視為認輸。要繼續嗎？');
  if(!replaceOldest){
   app.error='還沒建立新房間。可以先進入列出的對戰，或離開其中一場。';
   render();showRoomAlert();return;
  }
 }
 app.busy=true;app.error='';app.notice='';render();
 try{
  enterCreated(await postRoom(deckId,first,replaceOldest));
 }catch(error){
  if(error.status===429&&!replaceOldest){
   await refreshOpenRooms();
   const leave=confirm('你已經有 3 個未結束的房間。要離開最久沒有更新的一場（視為認輸），然後建立新房間嗎？');
   if(leave){
    try{enterCreated(await postRoom(deckId,first,true));}
    catch(again){app.error=again.message;}
   }else app.error='還沒建立新房間。列出的房間可以進入，或離開其中一場。';
  }else app.error=error.message;
 }
 await refreshOpenRooms();
 app.busy=false;render();
 if(app.error)showRoomAlert();
}
async function joinRoom(event){
 event.preventDefault();
 if(app.busy)return;
 const data=new FormData(event.currentTarget);
 const code=String(data.get('code')||'').trim().toUpperCase();
 if(!ROOM.test(code)){app.error='房間代碼是 8 個英數。';render();showRoomAlert();return;}
 app.busy=true;app.error='';render();
 try{
  app.room=await api('/api/rooms/'+code+'/join',{method:'POST',body:{deckId:data.get('deckId')}});
  history.replaceState(null,'','online.html#'+code);
  startPoll();
 }catch(error){app.error=error.message;}
 app.busy=false;render();
 if(app.error)showRoomAlert();
}
async function enterListed(code){
 if(app.busy)return;
 app.busy=true;app.error='';render();
 try{
  app.room=await api('/api/rooms/'+code);
  history.replaceState(null,'','online.html#'+code);
  startPoll();
 }catch(error){app.error=error.message;}
 app.busy=false;render();
 if(app.error)showRoomAlert();
}
async function leaveListed(room){
 if(app.busy)return;
 if(room.status==='playing'&&!confirm('離開房間 '+room.code+'？這會被視為認輸。'))return;
 app.busy=true;app.error='';render();
 try{
  await api('/api/rooms/'+room.code+'/'+(room.status==='playing'?'resign':'cancel'),{method:'POST'});
  app.notice=room.status==='playing'?'已離開對戰 '+room.code+'。':'已取消房間 '+room.code+'。';
  await refreshOpenRooms();
 }catch(error){app.error=error.message;}
 app.busy=false;render();
 if(app.error)showRoomAlert();
}
async function copyCode(code){
 try{await navigator.clipboard.writeText(code);app.notice='已複製房間代碼。';}
 catch{app.notice='房間代碼：'+code;}
 render();
}
async function cancelRoom(){
 if(!app.room)return;
 app.busy=true;
 try{await api('/api/rooms/'+app.room.code+'/cancel',{method:'POST'});app.room=null;app.notice='已取消房間。';stopPoll();history.replaceState(null,'','online.html');await refreshOpenRooms();}
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
function leaveFinished(){
 stopPoll();app.room=null;app.notice='已離開對局。';history.replaceState(null,'','online.html');render();
 refreshOpenRooms().then(()=>{if(!app.room)render();});
}
async function boot(){
 try{await api('/api/health');}
 catch{app.offline=true;render();return;}
 try{
  app.user=await api('/api/me');
  app.decks=(await api('/api/decks')).decks;
  await refreshOpenRooms();
  const code=location.hash.slice(1);
  if(ROOM.test(code)){
   try{app.room=await api('/api/rooms/'+code);startPoll();}catch{/* An old code just opens the lobby. */}
  }
 }catch(error){if(error.status!==401)app.error=error.message;}
 render();
}
boot();
