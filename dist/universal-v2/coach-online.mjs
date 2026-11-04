// Online collector. Each browser only records the signed-in player's own
// accepted actions, using the view the server already returned to that seat.
// The opponent's hidden cards are not on this client and are not uploaded.
// The account, room, seat and revision are fixed when that view is received.
// A delayed reply keeps that identity; it is not retagged after a login change.
// An end marker uses the account, room and seat bound to that event.
import {coachConsentEnabled,coachConsentVersion,setCoachConsent,createCoachUploader,currentAccountId,validAccountId} from './coach-client.mjs?v=20261104step5';
import {createDecisionQueue, readStoredQueue} from './coach-queue.mjs?v=20261104step7';
import {DECISION_FORMAT,LABEL_FORMAT,DECISION_ENGINE_VERSION,ENGINE_NAME,newCoachMatchId,
 onlineMatchLink,classifyDecision,publicHistoryFrom,visibleForTraining,privateForTraining,
 tableChoices,chainOf,deckSnapshot} from './coach-format.mjs';

const MATCH_KEY='ua-v2-decision-online-v1';
const same=value=>JSON.stringify(value);

function readSessions(storage){
 try{
  const parsed=JSON.parse(storage.getItem(MATCH_KEY)||'{}');
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  for(const [key, record] of Object.entries(parsed)){
   if(record&&typeof record==='object'&&!Array.isArray(record)&&!record.key)record.key=key;
  }
  return parsed;
 }catch{return {};}
}
function sessionKey(accountId,seat,code){
 const id=validAccountId(accountId);
 if(!id||(seat!==0&&seat!==1)||typeof code!=='string'||!code)return null;
 return id+':'+seat+':'+code;
}

export function createOnlineCollector({storage,fetchImpl=globalThis.fetch,deckById,onChange,schedule,uploadTimeout=8000,reconcileTimeout=8000}={}){
 let uploaded=0;
 let lastError='';
 let gapNotice=false;
 let releasing=false;
 let pending=null;
 let session=null;
 let seenVersion=coachConsentVersion(storage);
 const places=new Map();
 const opening=new Map();
 const sessions=readSessions(storage);
 const uploader=createCoachUploader({
  storage,
  consent:()=>coachConsentEnabled(storage),
  fetchImpl,
  uploadTimeout,
  onUploaded(){uploaded++;if(!gapNotice)lastError='';onChange?.();},
  onError(message){if(!gapNotice)lastError=message||'紀錄沒有送出。';onChange?.();}
 });
 const queue=createDecisionQueue({
  storage,
  consent:()=>coachConsentEnabled(storage),
  consentVersion:()=>coachConsentVersion(storage),
  schedule,
  send(body){return String(body.format||'').includes('label')?uploader.label(body):uploader.step(body);},
  account(){return currentAccountId(fetchImpl);},
  onChange(){
   noteConsent();
   if(gapNotice)lastError='紀錄尚未儲存';
   else if(lastError==='紀錄尚未儲存'&&queue.lastError!=='紀錄尚未儲存')lastError='';
   if(!gapNotice&&queue.lastError==='紀錄尚未儲存')lastError='紀錄尚未儲存';
   onChange?.();
  },
  onStored(records){return releaseStored(records);}
 });
 function consentBehind(current){
  return (current?.consentVersion??null)!==coachConsentVersion(storage);
 }
 function adoptRecord(current, saved){
  current.matchId=saved.matchId||current.matchId;
  current.matchLink=saved.matchLink||current.matchLink;
  current.step=saved.step||0;
  current.previous=saved.previous||null;
  current.writeVersion=saved.writeVersion??null;
  current.unresolved=saved.unresolved||null;
  current.consentVersion=saved.consentVersion??null;
  current.progressGen=saved.progressGen||0;
  if(saved.deck)current.deck=saved.deck;
  if(saved.titles)current.titles=saved.titles;
  if(saved.engineVersion)current.engineVersion=saved.engineVersion;
 }
 function diskWins(current, stored){
  if(!stored?.matchId||!current)return false;
  return (stored.progressGen||0)>(current.progressGen||0);
 }
 function absorbShared(current){
  if(!current?.key)return false;
  const saved=readSessions(storage)[current.key];
  if(!saved?.matchId)return false;
  const sameMatch=saved.matchId===current.matchId;
  if(sameMatch&&(saved.step||0)>(current.step||0)){
   adoptRecord(current, saved);
   return true;
  }
  if(!sameMatch&&((saved.progressGen||0)>(current.progressGen||0)||(current.step||0)===0)){
   adoptRecord(current, saved);
   return (saved.step||0)>0;
  }
  if(sameMatch&&(saved.progressGen||0)>(current.progressGen||0)&&(saved.step||0)>=(current.step||0))
   adoptRecord(current, saved);
  return false;
 }
 function syncRoom(current){
  if(!current)return;
  if(!current.key){
   const key=sessionKey(current.accountId, current.seat, current.code);
   if(!key)return;
   current.key=key;
  }
  const row=place(current.key);
  if(row.hold)return;
  const ahead=absorbShared(current);
  if(Number.isInteger(current.unresolved?.step)){
   rememberHold(current, current.unresolved.step, current.unresolved.writeVersion??null, 'revoke');
   return;
  }
  if(consentBehind(current)&&(current.step||0)>0){
   rememberHold(current, current.step-1, current.writeVersion??null, 'revoke');
   return;
  }
  if(!row.trusted&&(ahead||(current.step||0)>0))
   rememberHold(current, Math.max(0,(current.step||1)-1), current.writeVersion??null, 'read');
 }
 function linkOf(previous){
  if(!previous||!Number.isInteger(previous.step)||typeof previous.type!=='string')return null;
  const link={step:previous.step,type:previous.type};
  if(Number.isInteger(previous.replayIndex))link.replayIndex=previous.replayIndex;
  if(typeof previous.clientKey==='string')link.clientKey=previous.clientKey;
  return link.replayIndex==null&&link.clientKey==null?null:link;
 }
 function place(key){
  let row=places.get(key);
  if(!row){
   row={hold:null,staged:[],reconciling:false,gen:0,trusted:false,awaitingStore:false,done:null};
   places.set(key,row);
  }
  return row;
 }
 function bound(key){
  if(session?.key===key)return session;
  return sessions[key]||null;
 }
 function sameRecord(current,track){
  return !!current&&current.accountId===track.accountId&&current.matchId===track.matchId&&
   current.seat===track.seat&&current.code===track.code;
 }
 function rememberHold(current,step,writeVersion,mode){
  if(!current?.key||!Number.isInteger(step)||step<0)return;
  const row=place(current.key);
  const kind=mode==='read'?'read':'revoke';
  row.hold={accountId:current.accountId,matchId:current.matchId,seat:current.seat,code:current.code,
   step,writeVersion:writeVersion??null,consentVersion:coachConsentVersion(storage),mode:kind};
  if(kind==='read')return;
  current.unresolved={step,writeVersion:writeVersion??null};
  persistRecord(current);
 }
 function noteConsent(){
  const version=coachConsentVersion(storage);
  if(version===seenVersion)return;
  seenVersion=version;
  uploader.invalidate();
  for(const row of places.values())
   row.staged=row.staged.filter(snap=>snap.consentVersion===version);
 }
 function refreshShared(){
  noteConsent();
  if(session?.key)syncRoom(session);
 }
 function rememberUnresolved(bodies){
  if(!session)return;
  const steps=(Array.isArray(bodies)?bodies:[]).filter(body=>body?.channel==='online'&&
   String(body.format||'').includes('step')&&body.matchId===session.matchId&&Number.isInteger(body.step))
   .map(body=>body.step);
  const step=steps.length?Math.min(...steps):(session.step>0?session.step-1:null);
  if(step==null)return;
  rememberHold(session,step,session.writeVersion??null,'revoke');
 }
 async function readFence(track){
  let timer;
  try{
   const response=await Promise.race([
    fetchImpl('/api/coach/steps/reconcile',{
     method:'POST',credentials:'same-origin',
     headers:{accept:'application/json','content-type':'application/json'},
     body:JSON.stringify({matchId:track.matchId,accountId:track.accountId,step:track.step,writeVersion:track.writeVersion??null})
    }),
    new Promise(resolve=>{timer=setTimeout(()=>resolve(null), reconcileTimeout);})
   ]);
   if(!response?.ok)return null;
   const data=await response.json();
   if(!Number.isInteger(data?.count)||data.count<0)return null;
   if(!(data.writeVersion===null||typeof data.writeVersion==='string'))return null;
   return {count:data.count,writeVersion:data.writeVersion,previous:linkOf(data.previous)};
  }catch{return null;}
  finally{if(timer)clearTimeout(timer);}
 }
 async function readProgress(track){
  let timer;
  try{
   const response=await Promise.race([
    fetchImpl('/api/coach/matches/'+encodeURIComponent(track.matchId),{
     method:'GET',credentials:'same-origin',headers:{accept:'application/json'}
    }),
    new Promise(resolve=>{timer=setTimeout(()=>resolve(null), reconcileTimeout);})
   ]);
   if(!response)return null;
   if(response.status===404)return {count:0,writeVersion:null,previous:null,knownFence:false};
   if(!response.ok)return null;
   const data=await response.json();
   const count=data?.match?.steps;
   if(!Number.isInteger(count)||count<0)return null;
   const steps=Array.isArray(data.steps)?data.steps:[];
   const last=count>0?steps[steps.length-1]:null;
   const previous=last?linkOf({
    step:Number.isInteger(last.step)?last.step:count-1,
    type:last.choice?.type,
    replayIndex:last.replayIndex,
    clientKey:last.clientKey
   }):null;
   const writeVersion=data.writeVersion===null||typeof data.writeVersion==='string'?data.writeVersion:null;
   return {count,writeVersion,previous,knownFence:true};
  }catch{return null;}
  finally{if(timer)clearTimeout(timer);}
 }
 function agreedFence(saved, remote, covered){
  if(remote.knownFence)return remote.writeVersion??null;
  if(covered.saw)return covered.version??null;
  return typeof saved.writeVersion==='string'?saved.writeVersion:null;
 }
 function coverQueue(current, remote){
  let step=remote.count;
  let previous=remote.previous;
  let coveredVersion=null;
  let saw=false;
  const consent=coachConsentVersion(storage);
  const rows=[...readStoredQueue(storage), ...queue.unsaved()].filter(item=>{
   const body=item?.body;
   return body&&body.accountId===current.accountId&&body.matchId===current.matchId&&body.seat===current.seat&&
    String(body.format||'').includes('step')&&(item.consentVersion??null)===consent&&Number.isInteger(body.step);
  }).sort((a,b)=>a.body.step-b.body.step);
  for(const item of rows){
   const body=item.body;
   if(body.step<step)continue;
   if(body.step!==step||typeof body.choice?.type!=='string'||typeof body.clientKey!=='string')break;
   const itemVersion=body.writeVersion??null;
   if(saw&&itemVersion!==coveredVersion)break;
   coveredVersion=itemVersion;
   saw=true;
   previous={step:body.step,type:body.choice.type,clientKey:body.clientKey};
   step+=1;
  }
  return {step,previous,version:coveredVersion,saw};
 }
 function unstoredAhead(current){
  return queue.unsaved().some(item=>{
   const body=item?.body;
   return body&&body.matchId===current.matchId&&body.seat===current.seat&&body.accountId===current.accountId&&
    Number.isInteger(body.step)&&body.step<(current.step||0);
  });
 }
 function loadSession(room,{activate=true}={}){
  const key=sessionKey(room?.accountId,room?.seat,room?.code);
  if(!key)return Promise.resolve(null);
  if(session?.key===key){
   syncRoom(session);
   return Promise.resolve(session);
  }
  if(sessions[key]?.matchId){
   const current=sessions[key];
   if(!current.key)current.key=key;
   if(activate)session=current;
   syncRoom(current);
   return Promise.resolve(current);
  }
  const existing=opening.get(key);
  if(existing)return existing;
  const live=activate||!session;
  const job=(async()=>{
   const stored=readSessions(storage)[key]||{};
   const memory=sessions[key]||{};
   const prior=memory.matchId?memory:stored;
   const matchId=prior.matchId||newCoachMatchId();
   const matchLink=prior.matchLink||await onlineMatchLink(room.code);
   const created={key,accountId:validAccountId(room.accountId),code:room.code,seat:room.seat,
    matchId,matchLink,step:prior.step||0,previous:prior.previous||null,
    writeVersion:prior.writeVersion??null,unresolved:prior.unresolved||null,
    consentVersion:prior.consentVersion??null,progressGen:prior.progressGen||0,
    deck:prior.deck||null,titles:prior.titles||null,engineVersion:prior.engineVersion||null};
   if(Number.isInteger(prior.unresolved?.step)){
    const row=place(key);
    if(!row.hold)row.hold={accountId:created.accountId,matchId,seat:created.seat,code:created.code,
     step:prior.unresolved.step,writeVersion:prior.unresolved.writeVersion??null,
     consentVersion:coachConsentVersion(storage),mode:'revoke'};
   }
   sessions[key]=created;
   if(live)session=created;
   syncRoom(created);
   if(!place(key).hold)persistRecord(created);
   return created;
  })();
  opening.set(key,job);
  return job.finally(()=>{if(opening.get(key)===job)opening.delete(key);});
 }
 function ensure(room){return loadSession(room,{activate:true});}
 function persistRecord(current){
  const key=current?.key||sessionKey(current?.accountId, current?.seat, current?.code);
  if(!key||!current)return;
  current.key=key;
  const latest=readSessions(storage);
  const stored=latest[key];
  if(diskWins(current, stored)){
   adoptRecord(current, stored);
   sessions[key]=current;
   return;
  }
  current.progressGen=Math.max(stored?.progressGen||0, current.progressGen||0)+1;
  latest[key]=current;
  try{storage.setItem(MATCH_KEY, JSON.stringify(latest));}catch{/* ignore quota */}
  sessions[key]=current;
 }
 function persist(){persistRecord(session);}
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
 async function commitSnap(snap,{activate=true}={}){
  if(!snap||!coachConsentEnabled(storage)||snap.consentVersion!==coachConsentVersion(storage))return;
  if(!validAccountId(snap.accountId)){
   pause('無法確認帳號，這步已暫停上傳。');
   return;
  }
  if(!Array.isArray(snap.visible?.players?.[snap.seat]?.hand))return;
  const current=await loadSession({accountId:snap.accountId,seat:snap.seat,code:snap.code},{activate});
  if(!current){
   pause('無法確認帳號，這步已暫停上傳。');
   return;
  }
  if(session?.key===current.key)refreshShared();
  if(!coachConsentEnabled(storage)||snap.consentVersion!==coachConsentVersion(storage))return;
  const row=place(current.key);
  if(row.hold){
   if(!row.staged.some(item=>item.revision===snap.revision))row.staged.push(snap);
   if(row.hold.mode==='read')await reconcilePlace(current.key);
   else void reconcilePlace(current.key);
   return;
  }
  if(row.awaitingStore){
   if(unstoredAhead(current)){
    if(!row.staged.some(item=>item.revision===snap.revision))row.staged.push(snap);
    return;
   }
   row.awaitingStore=false;
   const earlier=row.staged.filter(item=>item.revision!==snap.revision);
   row.staged=row.staged.filter(item=>item.revision===snap.revision);
   for(const item of earlier)await commitSnap(item,{activate});
  }
  const clientKey=current.matchId+':r'+snap.revision+':human';
  const previous=linkOf(current.previous);
  const body={
   format:DECISION_FORMAT,clientKey,step:current.step,source:'human',actor:'human',seat:snap.seat,
   ...headerFrom(current,snap),turn:snap.turn,phase:snap.phase,engineRevision:snap.revision,
   observation:{visible:snap.visible,private:snap.privateView},
   publicHistory:publicHistoryFrom(snap.visible),legal:snap.legal,choice:snap.choice,
   forced:snap.legal.length===1,decisionClass:classifyDecision(snap.choice),
   previous,chain:chainOf(current.matchId,current.step,previous,clientKey),
   accountId:snap.accountId
  };
  if(current.writeVersion)body.writeVersion=current.writeVersion;
  const queued=queue.enqueue(body);
  let reserved=false;
  const reserve=()=>{
   if(reserved)return;
   reserved=true;
   current.previous={step:body.step,type:body.choice.type,clientKey};
   current.step+=1;
   current.unresolved=null;
   current.consentVersion=coachConsentVersion(storage);
   current.deck=snap.deck;
   current.titles=snap.titles;
   current.engineVersion=snap.engineVersion;
   place(current.key).trusted=true;
   persistRecord(current);
  };
  const apply=result=>{
   if(result?.pending){
    reserve();
    void result.done.then(apply);
    return;
   }
   if(result?.queued||(result?.stored===false&&result.retry===true))reserve();
   if(result?.stored===false){
    lastError='紀錄尚未儲存';
    place(current.key).awaitingStore=true;
   }else if((result?.queued||result?.skipped==='queued')&&queue.lastError!=='紀錄尚未儲存'&&!gapNotice)lastError='';
   onChange?.();
  };
  apply(queued);
 }
 async function reconcilePlace(key){
  const row=place(key);
  if(row.reconciling)return row.done;
  const track=row.hold;
  if(!track||!coachConsentEnabled(storage)||!sameRecord(bound(key),track))return;
  row.reconciling=true;
  let release=()=>{};
  row.done=new Promise(resolve=>{release=resolve;});
  const gen=row.gen;
  let restart=false;
  try{
   const issuedVersion=track.consentVersion??null;
   const issued={accountId:track.accountId,matchId:track.matchId,seat:track.seat,code:track.code};
   const remote=track.mode==='read'?await readProgress(track):await readFence(track);
   const saved=bound(key);
   const same=!!saved&&saved.accountId===issued.accountId&&saved.matchId===issued.matchId&&
    saved.seat===issued.seat&&saved.code===issued.code;
   const versionChanged=issuedVersion!==(coachConsentVersion(storage)??null);
   const live=gen===row.gen&&row.hold===track&&coachConsentEnabled(storage)&&same;
   if(!live||versionChanged)restart=!!(versionChanged&&live);
   else if(!remote){
    const retry=()=>{if(gen===row.gen&&row.hold===track&&(track.consentVersion??null)===(coachConsentVersion(storage)??null))void reconcilePlace(key);};
    if(schedule)schedule(retry, 500);
    else setTimeout(retry, 500);
   }else if(track.mode==='read'){
    const recovered=coverQueue(saved, remote);
    const gap=(saved.step||0)>recovered.step;
    saved.step=recovered.step;
    saved.previous=recovered.previous;
    saved.writeVersion=agreedFence(saved, remote, recovered);
    saved.consentVersion=coachConsentVersion(storage);
    saved.unresolved=null;
    if(gap){
     gapNotice=true;
     lastError='紀錄尚未儲存';
    }
    row.trusted=true;
    row.hold=null;
    persistRecord(saved);
    const snaps=row.staged.splice(0, row.staged.length);
    for(const item of snaps){
     if(row.gen!==gen||!coachConsentEnabled(storage))break;
     if(item.consentVersion!==coachConsentVersion(storage))continue;
     await commitSnap(item,{activate:session?.key===key});
    }
   }else{
    saved.writeVersion=remote.writeVersion;
    saved.step=remote.count;
    saved.previous=remote.previous;
    saved.consentVersion=coachConsentVersion(storage);
    saved.unresolved=null;
    row.trusted=true;
    row.hold=null;
    persistRecord(saved);
    const snaps=row.staged.splice(0, row.staged.length);
    for(const item of snaps){
     if(row.gen!==gen||!coachConsentEnabled(storage))break;
     if(item.consentVersion!==coachConsentVersion(storage))continue;
     await commitSnap(item,{activate:session?.key===key});
    }
   }
  }finally{
   row.reconciling=false;
   release();
  }
  if(restart)beginRevoke(key);
 }
 function beginRevoke(key){
  const saved=bound(key);
  const row=place(key);
  if(!saved||row.reconciling||!coachConsentEnabled(storage))return;
  noteConsent();
  row.trusted=false;
  if(row.hold?.mode==='revoke'&&(row.hold.consentVersion??null)===(coachConsentVersion(storage)??null)&&
   sameRecord(saved, row.hold)){
   void reconcilePlace(key);
   return;
  }
  row.hold=null;
  if(!consentBehind(saved)||(saved.step||0)<=0)return;
  const step=Number.isInteger(saved.unresolved?.step)?saved.unresolved.step:Math.max(0, saved.step-1);
  rememberHold(saved, step, saved.writeVersion??null, 'revoke');
  void reconcilePlace(key);
 }
 async function releaseStored(records){
  if(releasing||!Array.isArray(records)||!records.length)return;
  releasing=true;
  try{
   noteConsent();
   const version=coachConsentVersion(storage);
   const keys=[];
   for(const record of records){
    const body=record?.body;
    if(!body?.matchId||!String(body.format||'').includes('step')||!Number.isInteger(body.step))continue;
    for(const [key] of places){
     const current=bound(key);
     if(!current||current.matchId!==body.matchId||current.accountId!==body.accountId)continue;
     if(body.seat!=null&&current.seat!==body.seat)continue;
     if(!keys.includes(key))keys.push(key);
    }
   }
   for(const key of keys){
    const row=place(key);
    const current=bound(key);
    if(!current||row.reconciling||row.hold)continue;
    const pendingSave=queue.unsaved().some(item=>{
     const body=item?.body;
     return body&&String(body.format||'').includes('step')&&body.matchId===current.matchId&&
      body.accountId===current.accountId&&(body.seat==null||body.seat===current.seat);
    });
    if(pendingSave)continue;
    row.awaitingStore=false;
    const snaps=row.staged.splice(0, row.staged.length).filter(snap=>snap.consentVersion===version);
    for(const snap of snaps){
     if(!coachConsentEnabled(storage)||coachConsentVersion(storage)!==version)return;
     await commitSnap(snap,{activate:session?.key===key});
    }
   }
  }finally{
   releasing=false;
  }
 }
 return {
  consent(){return coachConsentEnabled(storage);},
  get queued(){return queue.length;},
  get uploaded(){return uploaded;},
  get lastError(){return lastError;},
  setConsent(enabled){
   setCoachConsent(storage,!!enabled);
   refreshShared();
   if(!enabled){
    uploader.invalidate();
    pending=null;
    for(const row of places.values()){
     row.staged.length=0;
     row.gen+=1;
    }
    rememberUnresolved(queue.discard());
   }else if(session?.key&&place(session.key).hold)void reconcilePlace(session.key);
   onChange?.();
  },
  start(){queue.start();},
  async prepare(room){
   if(!room?.code)return;
   const accountId=validAccountId(room.accountId);
   const seat=Number(room.seat);
   if(!accountId||(seat!==0&&seat!==1)){
    pause('無法確認帳號，這筆結果已暫停上傳。');
    return;
   }
   const current=await ensure({accountId, seat, code:room.code});
   if(!current||current.accountId!==accountId||current.seat!==seat||current.code!==room.code)return;
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
   if(place(current.key).hold&&coachConsentEnabled(storage))void reconcilePlace(current.key);
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
     consentVersion:coachConsentVersion(storage),
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
   if(room.revision!==snap.revision+1||!this.consent()||snap.consentVersion!==coachConsentVersion(storage))return;
   refreshShared();
   await commitSnap(snap);
  },
  async result(room,endReason,{completed,winner,holdMs=0}={}){
   if(!this.consent()||!room?.view)return;
   const version=coachConsentVersion(storage);
   const accountId=validAccountId(room.accountId);
   const seat=Number(room.seat);
   if(!accountId||(seat!==0&&seat!==1)||typeof room.code!=='string'||!room.code){
    pause('無法確認帳號，這筆結果已暫停上傳。');
    return;
   }
   const current=await ensure({accountId, seat, code:room.code});
   if(!current||current.accountId!==accountId||current.seat!==seat||current.code!==room.code){
    pause('無法確認帳號，這筆結果已暫停上傳。');
    return;
   }
   if(!this.consent()||version!==coachConsentVersion(storage))return;
   let titles=current.titles||null;
   let deck=current.deck||null;
   const live=deckById?.(room.you?.deckId);
   const liveTitles=Array.isArray(room.view.playerTitles)&&room.view.playerTitles.length===2
    ?room.view.playerTitles.slice():null;
   if(live?.counts&&live.title&&liveTitles){
    deck=deckSnapshot(live.title,live.counts);
    titles=liveTitles;
   }
   if(!deck?.counts||!titles)return;
   const snap={titles,deck,engineVersion:current.engineVersion||DECISION_ENGINE_VERSION};
   const body={format:LABEL_FORMAT,...headerFrom(current,snap),
    clientKey:current.matchId+':label:'+endReason,completed:completed===true,
    winner:winner??null,endReason,accountId:current.accountId};
   const queued=queue.enqueue(body,{holdMs});
   const apply=result=>{
    if(result?.pending){void result.done.then(apply);return;}
    if(result?.stored===false)lastError='紀錄尚未儲存';
    onChange?.();
   };
   apply(queued);
  },
  flush(){return queue.flushNow();}
 };
}
