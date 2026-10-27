// Accounts, per-user decks, and server-hosted Universal V2 matches.
// The HTTP layer only receives the object returned here. Full match state,
// deck order, life cards and the opponent's hand stay in the durable store.
import {createHash,randomBytes,randomInt,scryptSync,timingSafeEqual} from 'node:crypto';
import {editorV2Status,normalizeEditorCounts,registeredPackForEditor} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalActor,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {createRepositories,roomTtl} from './repos.mjs';

const TITLES=['bleach','gurren-lagann','sword-art-online','solo-leveling','mushoku-tensei','rezero'];
const TITLE_LABELS={
 bleach:'BLEACH','gurren-lagann':'天元突破','sword-art-online':'刀劍神域',
 'solo-leveling':'我獨自升級','mushoku-tensei':'無職轉生',rezero:'Re:Zero'
};
const SESSION_MS=14*24*60*60*1000;
const LOGIN_WINDOW_MS=15*60*1000;
const LOGIN_LIMIT=8;
const ROOM_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SCRYPT_N=16384;
const packCache=new Map();

export class ApiError extends Error{
 constructor(status,message){super(message);this.status=status;}
}

const sha256=value=>createHash('sha256').update(value).digest('hex');
const chars=value=>Array.from(String(value)).length;
function hashPassword(password,salt=randomBytes(16)){
 const hash=scryptSync(password,salt,32,{N:SCRYPT_N,r:8,p:1,maxmem:64*1024*1024});
 return {salt:salt.toString('hex'),hash:hash.toString('hex'),n:SCRYPT_N};
}
let dummyPassword=null;
function dummyHash(){
 if(!dummyPassword)dummyPassword=hashPassword('not-a-real-password');
 return dummyPassword;
}
function passwordMatches(password,stored){
 const salt=Buffer.from(stored.salt,'hex');
 const expected=Buffer.from(stored.hash,'hex');
 const actual=scryptSync(password,salt,expected.length,{N:stored.n,r:8,p:1,maxmem:64*1024*1024});
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function parseUsername(value){
 if(typeof value!=='string')throw new ApiError(400,'帳號名稱請使用 2–16 個中英文字、數字或底線。');
 const name=value.normalize('NFKC').trim();
 if(!/^[\p{L}\p{N}_]{2,16}$/u.test(name))
  throw new ApiError(400,'帳號名稱請使用 2–16 個中英文字、數字或底線。');
 return name;
}
function parsePassword(value){
 if(typeof value!=='string'||chars(value)<8||chars(value)>72)
  throw new ApiError(400,'密碼請使用 8–72 個字元。');
 return value;
}
function usernameKey(name){return name.normalize('NFKC').toLocaleLowerCase('en');}
function cleanName(value){
 if(typeof value!=='string')throw new ApiError(400,'牌組名稱請填 1–40 個字。');
 const name=value.replace(/[\u0000-\u001f]/g,'').trim();
 if(!name||chars(name)>40)throw new ApiError(400,'牌組名稱請填 1–40 個字。');
 return name;
}
function parseTitle(value){
 if(typeof value!=='string'||!TITLES.includes(value))throw new ApiError(400,'請選擇已收錄的作品。');
 return value;
}
function parseLocalId(value){
 if(value==null||value==='')return null;
 if(typeof value!=='string'||!/^[A-Za-z0-9:_-]{1,80}$/.test(value))
  throw new ApiError(400,'本機牌組編號格式不正確。');
 return value;
}
function copyCounts(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ApiError(400,'牌組內容格式不正確。');
 const entries=Object.entries(input);
 if(entries.length>800)throw new ApiError(400,'牌組內容過長。');
 const counts={};
 for(const [raw,n] of entries){
  if(typeof raw!=='string'||raw.length>80||!Number.isInteger(n)||n<0||n>4)
   throw new ApiError(400,'牌組張數必須是 0–4。');
  if(n>0)counts[raw]=n;
 }
 if(Object.values(counts).reduce((sum,n)=>sum+n,0)>50)throw new ApiError(400,'一副牌最多 50 張。');
 return counts;
}
function publicActionText(username,action,hadPending){
 if(hadPending)return username+'：完成一項選擇';
 const table={
  next:'前進到下一個階段',extraDraw:'支付 AP 額外抽牌',play:'從手牌登場',
  raid:'進行突襲',event:'使用事件',move:'移動角色',step:'STEP 移動',
  attack:'宣告攻擊',activate:'發動主要能力',activateRemoved:'發動移除區能力'
 };
 return username+'：'+(table[action.type]||'完成一項操作');
}
function labelFor(packs,match,action){
 try{
  const text=uiActionLabel(action,{pack:packs,state:match});
  if(typeof text==='string'&&text.trim()&&chars(text)<=180)return text;
 }catch{/* The button still works with a generic label. */}
 return '執行操作';
}
function paintCard(pack,card){
 if(!card)return null;
 const next={...card};
 if(card.cardId&&pack?.cards?.[card.cardId]){
  next.name=pack.cards[card.cardId].name||card.cardId;
  next.color=pack.cards[card.cardId].color||'';
 }
 if(Array.isArray(card.raidLayers))next.raidLayers=card.raidLayers.map(layer=>paintCard(pack,layer));
 if(Array.isArray(card.underLayers))next.underLayers=card.underLayers.map(layer=>paintCard(pack,layer));
 return next;
}
function decorateView(packs,view){
 const copy=structuredClone(view);
 copy.players=copy.players.map((player,index)=>{
  const pack=packs[index];
  return {
   ...player,
   front:player.front.map(card=>paintCard(pack,card)),
   energy:player.energy.map(card=>paintCard(pack,card)),
   outside:player.outside.map(card=>paintCard(pack,card)),
   hand:Array.isArray(player.hand)?player.hand.map(card=>paintCard(pack,card)):null
  };
 });
 return copy;
}
function titlePack(title){
 if(packCache.has(title))return packCache.get(title);
 const pack=registeredPackForEditor(title);
 if(!pack)throw new ApiError(500,'這場對局的作品資料無法載入。');
 packCache.set(title,pack);
 return pack;
}
function revive(room){
 if(!room?.match)return room?{...room,packs:null}:room;
 if(!Array.isArray(room.seats)||room.seats.some(seat=>!seat?.title))
  throw new ApiError(500,'這場對局的資料不完整。');
 const packs=room.seats.map(seat=>titlePack(seat.title));
 try{assertUniversalMatch(packs,room.match);}
 catch(error){
  console.error(error);
  throw new ApiError(500,'這場對局的資料無法還原。');
 }
 return {...room,packs};
}
function freshCode(exists){
 for(let attempt=0;attempt<8;attempt++){
  const bytes=randomBytes(8);
  let code='';
  for(let i=0;i<8;i++)code+=ROOM_ALPHABET[bytes[i]%ROOM_ALPHABET.length];
  if(!exists(code))return code;
 }
 throw new ApiError(503,'目前無法建立房間，請再試一次。');
}
function seatOf(room,userId){return room.seats.findIndex(seat=>seat?.userId===userId);}
function present(room,userId){
 const seat=seatOf(room,userId);
 if(seat<0)throw new ApiError(404,'找不到這個房間。');
 const mine=room.seats[seat],other=room.seats[1-seat];
 const payload={
  code:room.code,status:room.status,revision:room.revision,seat,
  you:{username:mine.username,deckName:mine.deckName,title:mine.title,titleLabel:TITLE_LABELS[mine.title]||mine.title},
  opponent:other?{username:other.username,deckName:other.deckName,title:other.title,titleLabel:TITLE_LABELS[other.title]||other.title}:null,
  youAreFirst:room.first==null?null:room.first===seat,
  yourTurn:false,choices:[],view:null,log:room.log.slice(-40),
  winner:null
 };
 if(room.status==='waiting'||!room.match||!room.packs)return payload;
 const view=decorateView(room.packs,universalPublicView(room.packs,room.match,seat));
 if(room.status==='finished'){view.status='finished';view.winner=room.winner;}
 payload.view=view;
 const actor=universalActor(room.match);
 payload.yourTurn=room.status==='playing'&&room.match.status==='playing'&&actor===seat;
 if(payload.yourTurn){
  payload.choices=legalUniversalActions(room.packs,room.match).map((action,index)=>({
   index,label:labelFor(room.packs,room.match,action)
  }));
 }
 if(room.status==='finished'&&(room.winner===0||room.winner===1))
  payload.winner={seat:room.winner,username:room.seats[room.winner]?.username||''};
 return payload;
}
function outcome(room,userId){
 const live=revive(room);
 return {
  public:present(live,userId),status:room.status,updatedAt:room.updatedAt,
  guestId:room.seats[1]?.userId||null,alarmAt:room.updatedAt+roomTtl(room.status)
 };
}
function requireUser(repos,token,now){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new ApiError(401,'請先登入。');
 const user=repos.findSessionUser(sha256(token),now);
 if(!user)throw new ApiError(401,'請先登入。');
 return user;
}
function lockedOut(repos,ip,key,now){
 const row=repos.failure(ip+'\n'+key,now);
 return !!row&&row.count>=LOGIN_LIMIT;
}
function publicDeck(deck){
 let playable=false,issues=[];
 try{
  const status=editorV2Status(deck.title,deck.counts);
  playable=status.ready===true;
  issues=Array.isArray(status.issues)?status.issues.slice(0,8):[];
 }catch(error){
  issues=[error instanceof ApiError?error.message:'這副牌組目前無法讀取。'];
 }
 return {
  id:deck.id,name:deck.name,title:deck.title,titleLabel:TITLE_LABELS[deck.title]||deck.title,
  counts:deck.counts,localId:deck.localId||null,updatedAt:deck.updatedAt,playable,issues
 };
}
function ownedDeck(repos,userId,deckId){
 if(typeof deckId!=='string'||!deckId)throw new ApiError(400,'請選擇牌組。');
 const deck=repos.findDeck(userId,deckId);
 if(!deck)throw new ApiError(404,'找不到這副牌組。');
 return deck;
}
function battleReady(deck){
 let status;
 try{status=editorV2Status(deck.title,deck.counts);}
 catch{throw new ApiError(400,'這副牌組還不能進入 V2 對戰。');}
 if(!status.ready)throw new ApiError(400,status.issues?.[0]||'這副牌組還不能進入 V2 對戰。');
 return {counts:status.counts};
}
function commitRoom(repos,room){
 if(room.match){
  room.match=JSON.parse(JSON.stringify(room.match));
  revive(room);
 }
 repos.saveRoom(room);
}
function publicUser(user){return {id:user.id,username:user.username};}

export function dispatchAccount(repos,message,now){
 switch(message?.op){
  case 'register':{
   const username=parseUsername(message.username);
   const password=parsePassword(message.password);
   const key=usernameKey(username);
   const ip=String(message.ip||'local').slice(0,80);
   if(lockedOut(repos,ip,key,now))throw new ApiError(429,'嘗試次數太多，請稍後再登入。');
   if(repos.findUserByKey(key))throw new ApiError(409,'這個帳號名稱已被使用。');
   const id='u'+randomBytes(8).toString('hex');
   try{
    repos.insertUser({id,username,usernameKey:key,password:hashPassword(password),createdAt:new Date(now).toISOString()});
   }catch(error){
    if(String(error?.message||'').includes('UNIQUE'))throw new ApiError(409,'這個帳號名稱已被使用。');
    throw error;
   }
   const token=randomBytes(32).toString('hex');
   repos.insertSession(sha256(token),id,now+SESSION_MS);
   return {token,username};
  }
  case 'login':{
   const username=parseUsername(message.username);
   const password=parsePassword(message.password);
   const key=usernameKey(username);
   const ip=String(message.ip||'local').slice(0,80);
   if(lockedOut(repos,ip,key,now))throw new ApiError(429,'嘗試次數太多，請稍後再登入。');
   const user=repos.findUserByKey(key);
   const matches=passwordMatches(password,user?user.password:dummyHash());
   if(!user||!matches){
    repos.noteFailure(ip+'\n'+key,now,LOGIN_WINDOW_MS);
    throw new ApiError(401,'帳號或密碼不正確。');
   }
   repos.clearFailure(ip+'\n'+key);
   const token=randomBytes(32).toString('hex');
   repos.insertSession(sha256(token),user.id,now+SESSION_MS);
   return {token,username:user.username};
  }
  case 'logout':{
   if(typeof message.token==='string'&&/^[a-f0-9]{64}$/.test(message.token))
    repos.deleteSession(sha256(message.token));
   return {ok:true};
  }
  case 'me':
   return {username:requireUser(repos,message.token,now).username};
  case 'session':
   return publicUser(requireUser(repos,message.token,now));
  case 'listDecks':{
   const user=requireUser(repos,message.token,now);
   return {decks:repos.listDecks(user.id).map(publicDeck)};
  }
  case 'saveDeck':{
   const user=requireUser(repos,message.token,now);
   const input=message.input||{};
   const title=parseTitle(input.title);
   const name=cleanName(input.name);
   const counts=copyCounts(input.counts);
   const localId=parseLocalId(input.localId);
   let storedCounts;
   try{storedCounts=normalizeEditorCounts(title,counts);}
   catch(error){
    const text=error instanceof Error&&error.message?error.message.slice(0,180):'';
    throw new ApiError(400,text||'牌組內容無法讀取。');
   }
   if(Object.values(storedCounts).some(n=>!Number.isInteger(n)||n<1||n>4))
    throw new ApiError(400,'牌組張數必須是 1–4。');
   const existing=localId?repos.findDeckByLocal(user.id,localId):null;
   if(!existing&&repos.countDecks(user.id)>=30)throw new ApiError(400,'最多保存 30 副牌組。');
   const record={
    id:existing?.id||('d'+randomBytes(8).toString('hex')),
    name,title,counts:storedCounts,localId,updatedAt:new Date(now).toISOString()
   };
   if(existing)repos.updateDeck(user.id,record);
   else repos.insertDeck(user.id,record);
   return {deck:publicDeck(record)};
  }
  case 'deleteDeck':{
   const user=requireUser(repos,message.token,now);
   if(!repos.findDeck(user.id,message.deckId))throw new ApiError(404,'找不到這副牌組。');
   repos.deleteDeck(user.id,message.deckId);
   return {ok:true};
  }
  case 'prepareSeat':{
   const user=requireUser(repos,message.token,now);
   const deck=ownedDeck(repos,user.id,message.deckId);
   const battle=battleReady(deck);
   return {user:publicUser(user),deck:{id:deck.id,name:deck.name,title:deck.title},battleCounts:battle.counts};
  }
  case 'reserve':{
   repos.pruneDirectory(now);
   if(typeof message.userId!=='string'||!message.userId)throw new ApiError(401,'請先登入。');
   if(repos.countOpenDirectory(message.userId)>=3)throw new ApiError(429,'你已經有 3 個未結束的房間。');
   const code=freshCode(value=>repos.directoryExists(value));
   repos.insertDirectory({code,hostId:message.userId,guestId:null,status:'opening',createdAt:now,updatedAt:now});
   return {code};
  }
  case 'mark':{
   repos.markDirectory({code:message.code,guestId:message.guestId||null,status:message.status,updatedAt:message.updatedAt});
   return {ok:true};
  }
  case 'release':{
   repos.deleteDirectory(message.code);
   return {ok:true};
  }
  default:throw new ApiError(404,'找不到這個功能。');
 }
}

export function dispatchRoom(repos,message,now){
 repos.pruneRooms(now);
 switch(message?.op){
  case 'create':{
   const first=message.first;
   if(!['me','opponent','random'].includes(first))throw new ApiError(400,'請選擇先手。');
   if(repos.roomExists(message.code))throw new ApiError(409,'這個房間編號剛被使用，請再試一次。');
   const room={
    code:message.code,status:'waiting',revision:1,createdAt:now,updatedAt:now,
    firstChoice:first,first:null,seed:null,winner:null,log:[],match:null,
    seats:[{
     userId:message.user.id,username:message.user.username,deckId:message.deck.id,
     deckName:message.deck.name,title:message.deck.title,battleCounts:message.battleCounts
    },null]
   };
   commitRoom(repos,room);
   return outcome(room,message.user.id);
  }
  case 'joinPreview':{
   const room=repos.loadRoom(message.code);
   if(!room||room.status!=='waiting')throw new ApiError(404,'找不到可加入的房間。');
   if(room.seats[0].userId===message.userId)throw new ApiError(409,'請用另一個帳號加入這個房間。');
   if(room.seats[1])throw new ApiError(409,'這個房間已經滿了。');
   return {ok:true};
  }
  case 'join':{
   const room=repos.loadRoom(message.code);
   if(!room||room.status!=='waiting')throw new ApiError(404,'找不到可加入的房間。');
   if(room.seats[0].userId===message.user.id)throw new ApiError(409,'請用另一個帳號加入這個房間。');
   if(room.seats[1])throw new ApiError(409,'這個房間已經滿了。');
   const host=room.seats[0];
   const seed=randomInt(1,1000000000);
   const first=room.firstChoice==='me'?0:room.firstChoice==='opponent'?1:randomInt(0,2);
   const seats=[host,{
    userId:message.user.id,username:message.user.username,deckId:message.deck.id,
    deckName:message.deck.name,title:message.deck.title,battleCounts:message.battleCounts
   }];
   const packs=seats.map(seat=>titlePack(seat.title));
   let match;
   try{match=newUniversalMatch(packs,{decks:[host.battleCounts,message.battleCounts],seed,first});}
   catch{throw new ApiError(400,'這副牌組還不能進入 V2 對戰。');}
   assertUniversalMatch(packs,match);
   room.seats=seats;
   room.match=match;room.seed=seed;room.first=first;
   room.status='playing';room.revision+=1;room.updatedAt=now;
   room.log.push({text:'對局開始。'+room.seats[first].username+' 先手。'});
   commitRoom(repos,room);
   return outcome(room,message.user.id);
  }
  case 'view':{
   const room=repos.loadRoom(message.code);
   if(!room||seatOf(room,message.userId)<0)throw new ApiError(404,'找不到這個房間。');
   room.updatedAt=now;
   commitRoom(repos,room);
   return outcome(room,message.userId);
  }
  case 'act':{
   const room=repos.loadRoom(message.code);
   if(!room||seatOf(room,message.userId)<0)throw new ApiError(404,'找不到這個房間。');
   const seat=seatOf(room,message.userId);
   if(room.status!=='playing'||!room.match)throw new ApiError(409,'這場對局目前不能操作。');
   if(!Number.isInteger(message.index)||message.index<0)throw new ApiError(400,'請選擇列出的操作。');
   const live=revive(room);
   if(universalActor(live.match)!==seat)throw new ApiError(409,'現在不是你的回合。');
   const legal=legalUniversalActions(live.packs,live.match);
   const action=legal[message.index];
   if(!action)throw new ApiError(400,'這個操作已經不能使用，請重新整理場面。');
   const hadPending=!!live.match.pending;
   let next;
   try{next=dispatchUniversalAction(live.packs,live.match,action,{actor:seat});}
   catch{throw new ApiError(400,'這個操作沒有被接受。');}
   assertUniversalMatch(live.packs,next);
   room.match=next;
   room.revision+=1;room.updatedAt=now;
   const actorName=room.seats[seat].username;
   room.log.push({text:publicActionText(actorName,action,hadPending)});
   if(room.log.length>80)room.log.splice(0,room.log.length-80);
   if(next.status==='finished'){room.status='finished';room.winner=next.winner;}
   commitRoom(repos,room);
   return outcome(room,message.userId);
  }
  case 'resign':{
   const room=repos.loadRoom(message.code);
   if(!room||seatOf(room,message.userId)<0)throw new ApiError(404,'找不到這個房間。');
   if(room.status!=='playing')throw new ApiError(409,'這場對局已經結束。');
   const seat=seatOf(room,message.userId);
   room.status='finished';room.winner=1-seat;room.revision+=1;room.updatedAt=now;
   room.log.push({text:room.seats[seat].username+' 認輸。'});
   commitRoom(repos,room);
   return outcome(room,message.userId);
  }
  case 'cancel':{
   const room=repos.loadRoom(message.code);
   if(!room||seatOf(room,message.userId)<0)throw new ApiError(404,'找不到這個房間。');
   if(room.status!=='waiting')throw new ApiError(409,'對局開始後不能取消房間。');
   if(seatOf(room,message.userId)!==0)throw new ApiError(403,'只有房主可以取消還沒開始的房間。');
   repos.deleteRoom(message.code);
   return {public:{ok:true},status:'cancelled',updatedAt:now,guestId:null,alarmAt:null};
  }
  default:throw new ApiError(404,'找不到這個功能。');
 }
}

export function createService({sql,now=()=>Date.now()}){
 const repos=createRepositories(sql);
 let chain=Promise.resolve();
 function enqueue(fn){
  const run=chain.then(()=>sql.transaction(()=>fn()));
  chain=run.then(()=>{},()=>{});
  return run;
 }
 return {
  register(input,meta){
   return enqueue(()=>dispatchAccount(repos,{op:'register',username:input?.username,password:input?.password,ip:meta?.ip},now()));
  },
  login(input,meta){
   return enqueue(()=>dispatchAccount(repos,{op:'login',username:input?.username,password:input?.password,ip:meta?.ip},now()));
  },
  logout(token){return enqueue(()=>dispatchAccount(repos,{op:'logout',token},now()));},
  me(token){return enqueue(()=>dispatchAccount(repos,{op:'me',token},now()));},
  listDecks(token){return enqueue(()=>dispatchAccount(repos,{op:'listDecks',token},now()));},
  saveDeck(token,input){return enqueue(()=>dispatchAccount(repos,{op:'saveDeck',token,input},now()));},
  deleteDeck(token,deckId){return enqueue(()=>dispatchAccount(repos,{op:'deleteDeck',token,deckId},now()));},
  createRoom(token,input){
   return enqueue(()=>{
    repos.pruneRooms(now());
    dispatchAccount(repos,{op:'session',token},now());
    const first=input?.first;
    if(!['me','opponent','random'].includes(first))throw new ApiError(400,'請選擇先手。');
    const prepared=dispatchAccount(repos,{op:'prepareSeat',token,deckId:input?.deckId},now());
    if(repos.countOpenRooms(prepared.user.id)>=3)throw new ApiError(429,'你已經有 3 個未結束的房間。');
    const code=freshCode(value=>repos.roomExists(value));
    return dispatchRoom(repos,{op:'create',code,first,...prepared},now()).public;
   });
  },
  joinRoom(token,code,input){
   return enqueue(()=>{
    repos.pruneRooms(now());
    const session=dispatchAccount(repos,{op:'session',token},now());
    dispatchRoom(repos,{op:'joinPreview',code,userId:session.id},now());
    const prepared=dispatchAccount(repos,{op:'prepareSeat',token,deckId:input?.deckId},now());
    return dispatchRoom(repos,{op:'join',code,...prepared},now()).public;
   });
  },
  roomView(token,code){
   return enqueue(()=>{
    const session=dispatchAccount(repos,{op:'session',token},now());
    return dispatchRoom(repos,{op:'view',code,userId:session.id},now()).public;
   });
  },
  act(token,code,input){
   return enqueue(()=>{
    const session=dispatchAccount(repos,{op:'session',token},now());
    return dispatchRoom(repos,{op:'act',code,userId:session.id,index:input?.index},now()).public;
   });
  },
  resign(token,code){
   return enqueue(()=>{
    const session=dispatchAccount(repos,{op:'session',token},now());
    return dispatchRoom(repos,{op:'resign',code,userId:session.id},now()).public;
   });
  },
  cancel(token,code){
   return enqueue(()=>{
    const session=dispatchAccount(repos,{op:'session',token},now());
    return dispatchRoom(repos,{op:'cancel',code,userId:session.id},now()).public;
   });
  }
 };
}
