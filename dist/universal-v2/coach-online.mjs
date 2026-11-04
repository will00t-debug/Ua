// Online collector. Each browser only records the signed-in player's own
// accepted actions, using the view the server already returned to that seat.
// The opponent's hidden cards are not on this client and are not uploaded.
// The account, room, seat and revision are fixed when that view is received.
// A delayed reply keeps that identity; it is not retagged after a login change.
import {coachConsentEnabled,setCoachConsent,createCoachUploader,currentAccountId,validAccountId} from './coach-client.mjs';
import {createDecisionQueue} from './coach-queue.mjs';
import {DECISION_FORMAT,LABEL_FORMAT,DECISION_ENGINE_VERSION,ENGINE_NAME,newCoachMatchId,
 onlineMatchLink,classifyDecision,publicHistoryFrom,visibleForTraining,privateForTraining,
 tableChoices,chainOf,deckSnapshot} from './coach-format.mjs';

const MATCH_KEY='ua-v2-decision-online-v1';
const same=value=>JSON.stringify(value);

function readSessions(storage){
 try{
  const parsed=JSON.parse(storage.getItem(MATCH_KEY)||'{}');
  return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
 }catch{return {};}
}
function sessionKey(accountId,seat,code){
 const id=validAccountId(accountId);
 if(!id||(seat!==0&&seat!==1)||typeof code!=='string'||!code)return null;
 return id+':'+seat+':'+code;
}

export function createOnlineCollector({storage,fetchImpl=globalThis.fetch,deckById,onChange,schedule}={}){
 let uploaded=0;
 let lastError='';
 let pending=null;
 let session=null;
 const opening=new Map();
 const sessions=readSessions(storage);
 const uploader=createCoachUploader({
  consent:()=>coachConsentEnabled(storage),
  fetchImpl,
  onUploaded(){uploaded++;lastError='';onChange?.();},
  onError(message){lastError=message||'紀錄沒有送出。';onChange?.();}
 });
 const queue=createDecisionQueue({
  storage,
  consent:()=>coachConsentEnabled(storage),
  schedule,
  send(body){return String(body.format||'').includes('label')?uploader.label(body):uploader.step(body);},
  account(){return currentAccountId(fetchImpl);},
  onChange(){onChange?.();}
 });
 function saveSessions(){
  try{storage.setItem(MATCH_KEY,JSON.stringify(sessions));}catch{/* ignore quota */}
 }
 function rewind(bodies){
  const grouped=new Map();
  for(const body of bodies){
   if(body?.channel!=='online'||!String(body.format||'').includes('step'))continue;
   const list=grouped.get(body.matchId)||[];
   list.push(body);
   grouped.set(body.matchId,list);
  }
  for(const [matchId,list] of grouped){
   const oldest=list.reduce((left,right)=>left.step<right.step?left:right);
   for(const saved of Object.values(sessions)){
    if(!saved||saved.matchId!==matchId)continue;
    saved.step=oldest.step;
    saved.previous=oldest.previous||null;
    if(session?.matchId===matchId){session.step=saved.step;session.previous=saved.previous;}
   }
  }
  saveSessions();
 }
 function ensure(room){
  const key=sessionKey(room?.accountId,room?.seat,room?.code);
  if(!key)return Promise.resolve(null);
  if(session?.key===key)return Promise.resolve(session);
  const existing=opening.get(key);
  if(existing)return existing;
  const job=(async()=>{
   const prior=sessions[key]||{};
   const matchId=prior.matchId||newCoachMatchId();
   const matchLink=prior.matchLink||await onlineMatchLink(room.code);
   session={key,accountId:validAccountId(room.accountId),code:room.code,seat:room.seat,
    matchId,matchLink,step:prior.step||0,previous:prior.previous||null,
    deck:prior.deck||null,titles:prior.titles||null,engineVersion:prior.engineVersion||null};
   sessions[key]={matchId,matchLink,step:session.step,previous:session.previous,
    accountId:session.accountId,seat:session.seat,code:session.code,
    deck:session.deck,titles:session.titles,engineVersion:session.engineVersion};
   saveSessions();
   return session;
  })();
  opening.set(key,job);
  return job.finally(()=>{if(opening.get(key)===job)opening.delete(key);});
 }
 function persist(){
  if(!session?.key)return;
  sessions[session.key]={matchId:session.matchId,matchLink:session.matchLink,step:session.step,
   previous:session.previous,accountId:session.accountId,seat:session.seat,code:session.code,
   deck:session.deck||null,titles:session.titles||null,engineVersion:session.engineVersion||null};
  saveSessions();
 }
 function headerFrom(current,snap){
  return {
   matchId:current.matchId,matchLink:current.matchLink,channel:'online',mode:'online',
   engine:ENGINE_NAME,engineVersion:snap.engineVersion||DECISION_ENGINE_VERSION,
   pool:{titles:snap.titles,versions:['server','server']},
   aiVersion:'none',deck:snap.deck
  };
 }
 function pause(message){
  lastError=message;
  onChange?.();
 }
 return {
  consent(){return coachConsentEnabled(storage);},
  get queued(){return queue.length;},
  get uploaded(){return uploaded;},
  get lastError(){return lastError;},
  setConsent(enabled){
   setCoachConsent(storage,!!enabled);
   if(!enabled){pending=null;rewind(queue.discard());}
   onChange?.();
  },
  start(){queue.start();},
  async prepare(room){
   if(!room?.code)return;
   if(session?.code===room.code&&validAccountId(room.accountId)!==session.accountId)return;
   const current=await ensure(room);
   if(!current)return;
   const deck=deckById?.(room.you?.deckId);
   const titles=Array.isArray(room.view?.playerTitles)&&room.view.playerTitles.length===2
    ?room.view.playerTitles.slice():null;
   if(deck?.counts&&deck.title&&titles){
    current.deck=deckSnapshot(deck.title,deck.counts);
    current.titles=titles;
    current.engineVersion=DECISION_ENGINE_VERSION;
    persist();
   }
   if(room.status==='playing')queue.drop(current.matchId+':label:interrupted');
  },
  arm(room,choice){
   pending=null;
   if(!this.consent()||!room?.view||room.yourTurn!==true||!choice)return false;
   if(!validAccountId(room.accountId)){
    pause('無法確認帳號，這步已暫停上傳。');
    return false;
   }
   const deck=deckById?.(room.you?.deckId);
   if(!deck?.counts||!deck.title){
    lastError='找不到自己的牌組快照，這步不會上傳。';
    onChange?.();
    return false;
   }
   const titles=Array.isArray(room.view.playerTitles)&&room.view.playerTitles.length===2
    ?room.view.playerTitles.slice():null;
   if(!titles||(room.seat!==0&&room.seat!==1)||!Number.isInteger(room.revision))return false;
   try{
    const legal=tableChoices(room.choices||[]);
    const selected=tableChoices([choice])[0];
    if(!legal.some(item=>same(item)===same(selected)))return false;
    pending={
     accountId:room.accountId,code:room.code,revision:room.revision,seat:room.seat,
     choice:selected,legal,
     visible:visibleForTraining(room.view,room.seat),
     privateView:privateForTraining(room.inspection),
     turn:room.view.turn,phase:room.view.phase,titles,
     deck:deckSnapshot(deck.title,deck.counts),engineVersion:DECISION_ENGINE_VERSION
    };
    return true;
   }catch{pending=null;return false;}
  },
  cancel(){pending=null;},
  async settle(room){
   const snap=pending;
   if(!snap||!room||room.code!==snap.code)return;
   if(room.seat!=null&&room.seat!==snap.seat)return;
   if(room.revision===snap.revision)return;
   pending=null;
   if(room.revision!==snap.revision+1||!this.consent())return;
   if(!validAccountId(snap.accountId)){
    pause('無法確認帳號，這步已暫停上傳。');
    return;
   }
   if(!Array.isArray(snap.visible?.players?.[snap.seat]?.hand))return;
   const current=await ensure({accountId:snap.accountId,seat:snap.seat,code:snap.code});
   if(!current){
    pause('無法確認帳號，這步已暫停上傳。');
    return;
   }
   const clientKey=current.matchId+':r'+snap.revision+':human';
   const previous=current.previous;
   const body={
    format:DECISION_FORMAT,clientKey,step:current.step,source:'human',actor:'human',seat:snap.seat,
    ...headerFrom(current,snap),turn:snap.turn,phase:snap.phase,engineRevision:snap.revision,
    observation:{visible:snap.visible,private:snap.privateView},
    publicHistory:publicHistoryFrom(snap.visible),legal:snap.legal,choice:snap.choice,
    forced:snap.legal.length===1,decisionClass:classifyDecision(snap.choice),
    previous:previous?{step:previous.step,type:previous.type,clientKey:previous.clientKey}:null,
    chain:chainOf(current.matchId,current.step,previous,clientKey),
    accountId:snap.accountId
   };
   const queued=queue.enqueue(body);
   if(queued.queued||queued.skipped==='queued'){
    if(queued.queued){
     current.previous={step:body.step,type:body.choice.type,clientKey};
     current.step+=1;
     current.deck=snap.deck;
     current.titles=snap.titles;
     current.engineVersion=snap.engineVersion;
     persist();
    }
    lastError='';
   }
   onChange?.();
  },
  async result(room,endReason,{completed,winner,holdMs=0}={}){
   if(!this.consent()||!room?.view)return;
   const bound=session?.code===room.code?session:null;
   const identity=bound&&validAccountId(room.accountId)!==bound.accountId?bound:room;
   if(!validAccountId(identity.accountId)){
    pause('無法確認帳號，這筆結果已暫停上傳。');
    return;
   }
   const current=await ensure(identity);
   if(!current){
    pause('無法確認帳號，這筆結果已暫停上傳。');
    return;
   }
   let titles=current.titles||null;
   let deck=current.deck||null;
   if(validAccountId(room.accountId)===current.accountId){
    const live=deckById?.(room.you?.deckId);
    const liveTitles=Array.isArray(room.view.playerTitles)&&room.view.playerTitles.length===2
     ?room.view.playerTitles.slice():null;
    if(live?.counts&&live.title&&liveTitles){
     deck=deckSnapshot(live.title,live.counts);
     titles=liveTitles;
    }
   }
   if(!deck?.counts||!titles)return;
   const snap={titles,deck,engineVersion:current.engineVersion||DECISION_ENGINE_VERSION};
   const body={format:LABEL_FORMAT,...headerFrom(current,snap),
    clientKey:current.matchId+':label:'+endReason,completed:completed===true,
    winner:winner??null,endReason,accountId:current.accountId};
   queue.enqueue(body,{holdMs});
   onChange?.();
  },
  flush(){return queue.flushNow();}
 };
}
