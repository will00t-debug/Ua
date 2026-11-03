// Online collector. Each browser only records the signed-in player's own
// accepted actions, using the view the server already returned to that seat.
// The opponent's hidden cards are not on this client and are not uploaded.
import {coachConsentEnabled,setCoachConsent,createCoachUploader} from './coach-client.mjs';
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
   for(const [code,saved] of Object.entries(sessions)){
    if(saved.matchId!==matchId)continue;
    saved.step=oldest.step;
    saved.previous=oldest.previous||null;
    if(session?.matchId===matchId){session.step=saved.step;session.previous=saved.previous;}
    void code;
   }
  }
  saveSessions();
 }
 function ensure(room){
  if(!room?.code)return Promise.resolve(null);
  if(session?.code===room.code)return Promise.resolve(session);
  const existing=opening.get(room.code);
  if(existing)return existing;
  const job=(async()=>{
   const prior=sessions[room.code]||{};
   const matchId=prior.matchId||newCoachMatchId();
   const matchLink=prior.matchLink||await onlineMatchLink(room.code);
   session={code:room.code,matchId,matchLink,step:prior.step||0,previous:prior.previous||null,seat:room.seat};
   sessions[room.code]={matchId,matchLink,step:session.step,previous:session.previous};
   saveSessions();
   return session;
  })();
  opening.set(room.code,job);
  return job.finally(()=>{if(opening.get(room.code)===job)opening.delete(room.code);});
 }
 function persist(){
  if(!session)return;
  sessions[session.code]={matchId:session.matchId,matchLink:session.matchLink,step:session.step,previous:session.previous};
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
   const current=await ensure(room);
   if(room.status==='playing'&&current)queue.drop(current.matchId+':label:interrupted');
  },
  arm(room,choice){
   pending=null;
   if(!this.consent()||!room?.view||room.yourTurn!==true||!choice)return false;
   const deck=deckById?.(room.you?.deckId);
   if(!deck?.counts||!deck.title){
    lastError='找不到自己的牌組快照，這步不會上傳。';
    onChange?.();
    return false;
   }
   const titles=Array.isArray(room.view.playerTitles)&&room.view.playerTitles.length===2
    ?room.view.playerTitles.slice():null;
   if(!titles)return false;
   try{
    const legal=tableChoices(room.choices||[]);
    const selected=tableChoices([choice])[0];
    if(!legal.some(item=>same(item)===same(selected)))return false;
    pending={
     code:room.code,revision:room.revision,seat:room.seat,choice:selected,legal,
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
   if(room.revision===snap.revision)return;
   pending=null;
   if(room.revision!==snap.revision+1||!this.consent())return;
   if(!Array.isArray(snap.visible?.players?.[snap.seat]?.hand))return;
   const current=await ensure(room);
   if(!current)return;
   const clientKey=current.matchId+':r'+snap.revision+':human';
   const previous=current.previous;
   const body={
    format:DECISION_FORMAT,clientKey,step:current.step,source:'human',actor:'human',seat:snap.seat,
    ...headerFrom(current,snap),turn:snap.turn,phase:snap.phase,engineRevision:snap.revision,
    observation:{visible:snap.visible,private:snap.privateView},
    publicHistory:publicHistoryFrom(snap.visible),legal:snap.legal,choice:snap.choice,
    forced:snap.legal.length===1,decisionClass:classifyDecision(snap.choice),
    previous:previous?{step:previous.step,type:previous.type,clientKey:previous.clientKey}:null,
    chain:chainOf(current.matchId,current.step,previous,clientKey)
   };
   const queued=queue.enqueue(body);
   if(queued.queued||queued.skipped==='queued'){
    if(queued.queued){
     current.previous={step:body.step,type:body.choice.type,clientKey};
     current.step+=1;
     persist();
    }
    lastError='';
   }
   onChange?.();
  },
  async result(room,endReason,{completed,winner,holdMs=0}={}){
   if(!this.consent()||!room?.view)return;
   const deck=deckById?.(room.you?.deckId);
   if(!deck?.counts)return;
   const titles=Array.isArray(room.view.playerTitles)&&room.view.playerTitles.length===2
    ?room.view.playerTitles.slice():null;
   if(!titles)return;
   const current=await ensure(room);
   const snap={titles,deck:deckSnapshot(deck.title,deck.counts),engineVersion:DECISION_ENGINE_VERSION};
   const body={format:LABEL_FORMAT,...headerFrom(current,snap),
    clientKey:current.matchId+':label:'+endReason,completed:completed===true,
    winner:winner??null,endReason};
   queue.enqueue(body,{holdMs});
   onChange?.();
  },
  flush(){return queue.flushNow();}
 };
}
