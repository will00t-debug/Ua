// Accounts, per-user decks, and server-hosted Universal V2 matches.
// The HTTP layer only receives the object returned here. Full match state,
// deck order, life cards and the opponent's hand stay on the server.
import {createHash,randomBytes,randomInt,scryptSync,timingSafeEqual} from 'node:crypto';
import {editorV2Status,normalizeEditorCounts} from '../dist/v2-editor-compat.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalActor,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

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

export class ApiError extends Error{
 constructor(status,message){super(message);this.status=status;}
}

const sha256=value=>createHash('sha256').update(value).digest('hex');
const chars=value=>Array.from(String(value)).length;
function hashPassword(password,salt=randomBytes(16)){
 const hash=scryptSync(password,salt,32,{N:SCRYPT_N,r:8,p:1,maxmem:64*1024*1024});
 return {salt:salt.toString('hex'),hash:hash.toString('hex'),n:SCRYPT_N};
}
const DUMMY_PASSWORD=hashPassword('not-a-real-password');
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

export function createService({store,now=()=>Date.now()}){
 const rooms=new Map();
 const loginFailures=new Map();
 let chain=Promise.resolve();
 function enqueue(fn){
  const run=chain.then(async()=>{
   const snapshot=structuredClone(store.state);
   try{return await fn();}
   catch(error){store.state=snapshot;throw error;}
  });
  chain=run.then(()=>{},()=>{});
  return run;
 }
 function commit(value){return store.save().then(()=>value);}
 function findUserByKey(key){
  return Object.values(store.state.users).find(user=>user.usernameKey===key)||null;
 }
 function userFromToken(token){
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return null;
  const row=store.state.sessions[sha256(token)];
  if(!row||row.expiresAt<=now())return null;
  return store.state.users[row.userId]||null;
 }
 function requireUser(token){
  const user=userFromToken(token);
  if(!user)throw new ApiError(401,'請先登入。');
  return user;
 }
 function lockedOut(ip,key){
  const row=loginFailures.get(ip+'\n'+key);
  return !!row&&row.reset>now()&&row.count>=LOGIN_LIMIT;
 }
 function noteFailure(ip,key){
  const id=ip+'\n'+key;
  const row=loginFailures.get(id);
  if(!row||row.reset<=now())loginFailures.set(id,{count:1,reset:now()+LOGIN_WINDOW_MS});
  else row.count+=1;
 }
 function clearFailure(ip,key){loginFailures.delete(ip+'\n'+key);}
 function issue(userId){
  const token=randomBytes(32).toString('hex');
  store.state.sessions[sha256(token)]={userId,expiresAt:now()+SESSION_MS};
  return token;
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
 function ownedDeck(userId,deckId){
  if(typeof deckId!=='string'||!deckId)throw new ApiError(400,'請選擇牌組。');
  const deck=(store.state.decks[userId]||[]).find(item=>item.id===deckId);
  if(!deck)throw new ApiError(404,'找不到這副牌組。');
  return deck;
 }
 function battleReady(deck){
  const status=editorV2Status(deck.title,deck.counts);
  if(!status.ready)throw new ApiError(400,status.issues?.[0]||'這副牌組還不能進入 V2 對戰。');
  return {counts:status.counts,pack:status.pack};
 }
 function seatOf(room,userId){return room.seats.findIndex(seat=>seat?.userId===userId);}
 function pruneRooms(){
  for(const [code,room] of rooms){
   const age=now()-room.updatedAt;
   const limit=room.status==='playing'?6*60*60*1000:room.status==='waiting'?45*60*1000:20*60*1000;
   if(age>limit)rooms.delete(code);
  }
 }
 function roomCode(){
  for(let attempt=0;attempt<8;attempt++){
   const bytes=randomBytes(8);
   let code='';
   for(let i=0;i<8;i++)code+=ROOM_ALPHABET[bytes[i]%ROOM_ALPHABET.length];
   if(!rooms.has(code))return code;
  }
  throw new ApiError(503,'目前無法建立房間，請再試一次。');
 }
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
  if(room.status==='finished'&&(room.winner===0||room.winner===1)){
   payload.winner={seat:room.winner,username:room.seats[room.winner]?.username||''};
  }
  return payload;
 }
 function touch(room){room.updatedAt=now();}

 return {
  register(input,meta){
   return enqueue(async()=>{
    const username=parseUsername(input?.username);
    const password=parsePassword(input?.password);
    const key=usernameKey(username);
    if(lockedOut(meta.ip,key))throw new ApiError(429,'嘗試次數太多，請稍後再登入。');
    if(findUserByKey(key))throw new ApiError(409,'這個帳號名稱已被使用。');
    const id='u'+randomBytes(8).toString('hex');
    store.state.users[id]={id,username,usernameKey:key,password:hashPassword(password),createdAt:new Date(now()).toISOString()};
    store.state.decks[id]||=[];
    const token=issue(id);
    return commit({token,username});
   });
  },
  login(input,meta){
   return enqueue(async()=>{
    const username=parseUsername(input?.username);
    const password=parsePassword(input?.password);
    const key=usernameKey(username);
    if(lockedOut(meta.ip,key))throw new ApiError(429,'嘗試次數太多，請稍後再登入。');
    const user=findUserByKey(key);
    const matches=passwordMatches(password,user?user.password:DUMMY_PASSWORD);
    if(!user||!matches){
     noteFailure(meta.ip,key);
     throw new ApiError(401,'帳號或密碼不正確。');
    }
    clearFailure(meta.ip,key);
    return commit({token:issue(user.id),username:user.username});
   });
  },
  logout(token){
   return enqueue(async()=>{
    if(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token))delete store.state.sessions[sha256(token)];
    await store.save();
    return {ok:true};
   });
  },
  me(token){
   return enqueue(()=>{
    const user=requireUser(token);
    return {username:user.username};
   });
  },
  listDecks(token){
   return enqueue(()=>{
    const user=requireUser(token);
    const decks=(store.state.decks[user.id]||[]).map(publicDeck)
     .sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return {decks};
   });
  },
  saveDeck(token,input){
   return enqueue(async()=>{
    const user=requireUser(token);
    const title=parseTitle(input?.title);
    const name=cleanName(input?.name);
    const counts=copyCounts(input?.counts);
    const localId=parseLocalId(input?.localId);
    let storedCounts;
    try{storedCounts=normalizeEditorCounts(title,counts);}
    catch(error){
     const message=error instanceof Error&&error.message?error.message.slice(0,180):'';
     throw new ApiError(400,message||'牌組內容無法讀取。');
    }
    if(Object.values(storedCounts).some(n=>!Number.isInteger(n)||n<1||n>4))
     throw new ApiError(400,'牌組張數必須是 1–4。');
    const list=store.state.decks[user.id]||=[];
    const existing=localId?list.find(deck=>deck.localId===localId):null;
    if(!existing&&list.length>=30)throw new ApiError(400,'最多保存 30 副牌組。');
    const record={
     id:existing?.id||('d'+randomBytes(8).toString('hex')),
     name,title,counts:storedCounts,localId,updatedAt:new Date(now()).toISOString()
    };
    if(existing)list[list.indexOf(existing)]=record;
    else list.push(record);
    await store.save();
    return {deck:publicDeck(record)};
   });
  },
  deleteDeck(token,deckId){
   return enqueue(async()=>{
    const user=requireUser(token);
    const list=store.state.decks[user.id]||[];
    const index=list.findIndex(deck=>deck.id===deckId);
    if(index<0)throw new ApiError(404,'找不到這副牌組。');
    list.splice(index,1);
    await store.save();
    return {ok:true};
   });
  },
  createRoom(token,input){
   return enqueue(()=>{
    pruneRooms();
    const user=requireUser(token);
    const first=input?.first;
    if(!['me','opponent','random'].includes(first))throw new ApiError(400,'請選擇先手。');
    const deck=ownedDeck(user.id,input?.deckId);
    const battle=battleReady(deck);
    const open=[...rooms.values()].filter(room=>room.status!=='finished'&&seatOf(room,user.id)>=0);
    if(open.length>=3)throw new ApiError(429,'你已經有 3 個未結束的房間。');
    const code=roomCode();
    const room={
     code,status:'waiting',revision:1,createdAt:now(),updatedAt:now(),
     firstChoice:first,first:null,seed:null,winner:null,log:[],packs:null,match:null,
     seats:[{
      userId:user.id,username:user.username,deckId:deck.id,deckName:deck.name,title:deck.title,
      battleCounts:battle.counts,pack:battle.pack
     },null]
    };
    rooms.set(code,room);
    return present(room,user.id);
   });
  },
  joinRoom(token,code,input){
   return enqueue(()=>{
    pruneRooms();
    const user=requireUser(token);
    const room=rooms.get(code);
    if(!room||room.status!=='waiting')throw new ApiError(404,'找不到可加入的房間。');
    if(room.seats[0].userId===user.id)throw new ApiError(409,'請用另一個帳號加入這個房間。');
    if(room.seats[1])throw new ApiError(409,'這個房間已經滿了。');
    const deck=ownedDeck(user.id,input?.deckId);
    let guestBattle;
    try{guestBattle=battleReady(deck);}
    catch(error){
     if(error instanceof ApiError)throw error;
     throw new ApiError(400,'這副牌組還不能進入 V2 對戰。');
    }
    const host=room.seats[0];
    const seed=randomInt(1,1000000000);
    const first=room.firstChoice==='me'?0:room.firstChoice==='opponent'?1:randomInt(0,2);
    const packs=[host.pack,guestBattle.pack];
    const match=newUniversalMatch(packs,{decks:[host.battleCounts,guestBattle.counts],seed,first});
    assertUniversalMatch(packs,match);
    room.seats[1]={
     userId:user.id,username:user.username,deckId:deck.id,deckName:deck.name,title:deck.title
    };
    delete host.battleCounts;delete host.pack;
    room.packs=packs;room.match=match;room.seed=seed;room.first=first;
    room.status='playing';room.revision+=1;touch(room);
    room.log.push({text:'對局開始。'+room.seats[first].username+' 先手。'});
    return present(room,user.id);
   });
  },
  roomView(token,code){
   return enqueue(()=>{
    pruneRooms();
    const user=requireUser(token);
    const room=rooms.get(code);
    if(!room||seatOf(room,user.id)<0)throw new ApiError(404,'找不到這個房間。');
    touch(room);
    return present(room,user.id);
   });
  },
  act(token,code,input){
   return enqueue(()=>{
    const user=requireUser(token);
    const room=rooms.get(code);
    if(!room||seatOf(room,user.id)<0)throw new ApiError(404,'找不到這個房間。');
    const seat=seatOf(room,user.id);
    if(room.status!=='playing'||!room.match)throw new ApiError(409,'這場對局目前不能操作。');
    if(!Number.isInteger(input?.index)||input.index<0)throw new ApiError(400,'請選擇列出的操作。');
    if(universalActor(room.match)!==seat)throw new ApiError(409,'現在不是你的回合。');
    const legal=legalUniversalActions(room.packs,room.match);
    const action=legal[input.index];
    if(!action)throw new ApiError(400,'這個操作已經不能使用，請重新整理場面。');
    const hadPending=!!room.match.pending;
    let next;
    try{next=dispatchUniversalAction(room.packs,room.match,action,{actor:seat});}
    catch{throw new ApiError(400,'這個操作沒有被接受。');}
    assertUniversalMatch(room.packs,next);
    room.match=next;
    room.revision+=1;touch(room);
    room.log.push({text:publicActionText(user.username,action,hadPending)});
    if(room.log.length>80)room.log.splice(0,room.log.length-80);
    if(next.status==='finished'){room.status='finished';room.winner=next.winner;}
    return present(room,user.id);
   });
  },
  resign(token,code){
   return enqueue(()=>{
    const user=requireUser(token);
    const room=rooms.get(code);
    if(!room||seatOf(room,user.id)<0)throw new ApiError(404,'找不到這個房間。');
    if(room.status!=='playing')throw new ApiError(409,'這場對局已經結束。');
    const seat=seatOf(room,user.id);
    room.status='finished';room.winner=1-seat;room.revision+=1;touch(room);
    room.log.push({text:user.username+' 認輸。'});
    return present(room,user.id);
   });
  },
  cancel(token,code){
   return enqueue(()=>{
    const user=requireUser(token);
    const room=rooms.get(code);
    if(!room||seatOf(room,user.id)<0)throw new ApiError(404,'找不到這個房間。');
    if(room.status!=='waiting')throw new ApiError(409,'對局開始後不能取消房間。');
    if(seatOf(room,user.id)!==0)throw new ApiError(403,'只有房主可以取消還沒開始的房間。');
    rooms.delete(code);
    return {ok:true};
   });
  }
 };
}
