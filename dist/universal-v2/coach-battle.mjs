// Live solo-match collector. Consent off does no serialization and no network.
// Accepted human actions are queued locally; the next click does not wait
// for the upload. AI actions stay out of the player-decision queue.
// A resume check, a recovered write that has not landed, or an upload still
// in flight stages new decisions until the next step number is confirmed.
// Closing consent drops only unsent rows.
import {coachConsentEnabled,setCoachConsent,createCoachUploader,currentAccountId,validAccountId} from './coach-client.mjs?v=20261104step3';
import {createDecisionQueue, readStoredQueue} from './coach-queue.mjs?v=20261104step1';
import {LABEL_FORMAT, chainOf} from './coach-format.mjs';
import {newCoachMatchId,buildHumanStep,buildAiMark,stateAtReplayIndex} from './coach-record.mjs';

async function accountFor(fetchImpl,known){
 if(known!==undefined)return validAccountId(known);
 const id=await currentAccountId(fetchImpl);
 return validAccountId(id);
}
function rewind(session,bodies){
 if(!session)return;
 const mine=bodies.filter(body=>body?.matchId===session.matchId&&body?.source==='human'&&
  String(body.format||'').includes('step'));
 if(!mine.length)return;
 const oldest=mine.reduce((left,right)=>left.step<right.step?left:right);
 session.humanStep=oldest.step;
 session.previous=oldest.previous||null;
 session.undoStack=(session.undoStack||[]).slice(0,oldest.step);
}

export function createCoachBattle({storage,fetchImpl=globalThis.fetch,onChange,onAccepted,schedule,locks,reconcileTimeout=8000,uploadTimeout=8000}={}){
 let uploaded=0;
 let session=null;
 let epoch=0;
 let noteSeq=0;
 let unsettled=null;
 let openUpload=null;
 let reconcileGen=0;
 let reconcileTimer=null;
 let pendingSaved=null;
 let anchorWait=null;
 const sendEpoch=new Map();
 const uploader=createCoachUploader({
  consent:()=>coachConsentEnabled(storage),
  fetchImpl,
  uploadTimeout,
  onUploaded(){uploaded++;if(session){session.uploaded=uploaded;session.lastError='';}},
  onError(message){if(session)session.lastError=message||'紀錄沒有送出。';},
  onLate(result, body){
   const epochNow=sendEpoch.get(body?.clientKey);
   applyResult(body?.matchId, body?.step, result, epochNow, body?.accountId);
  }
 });
 function acceptConfirmed(matchId,step,result,epochNow,accountId,body){
  if(epoch!==epochNow||!session||session.matchId!==matchId)return;
  if(accountId&&session.accountId&&accountId!==session.accountId)return;
  const data=result?.data;
  const accepted=result?.ok===true||result?.duplicate===true||data?.duplicate===true||result?.skipped==='sent';
  if(!accepted||!Number.isInteger(step)||step!==session.confirmedThrough)return;
  session.confirmedThrough=step+1;
  const summary=body?.choice?{step:body.step,type:body.choice.type,replayIndex:body.replayIndex,clientKey:body.clientKey}:null;
  if(session.humanStep<session.confirmedThrough){
   session.humanStep=session.confirmedThrough;
   if(summary)session.previous=summary;
  }
  const note=session.reservations.find(item=>item.step===step&&item.status!=='cancelled');
  if(note)note.status='confirmed';
  try{onAccepted?.();}catch{/* The accepted cursor is already in memory if saving the snapshot fails. */}
  emit();
 }
 const queue=createDecisionQueue({
  storage,
  consent:()=>coachConsentEnabled(storage),
  schedule,
  locks,
  send(body){
   const matchId=body?.matchId;
   const step=body?.step;
   const human=body?.source==='human'&&String(body?.format||'').includes('step');
   const epochNow=epoch;
   const accountId=body?.accountId;
   if(human&&body?.clientKey)sendEpoch.set(body.clientKey, epochNow);
   const sent=String(body?.format||'').includes('label')?uploader.label(body):uploader.step(body);
   const done=Promise.resolve(sent).then(result=>{
    if(human)applyResult(matchId, step, result, epochNow, accountId);
    return result;
   });
   if(human){
    openUpload={matchId, accountId, step, outcome:'pending', link:session?.previous||null};
    const track={matchId, accountId, step, done};
    unsettled=track;
    void done.finally(()=>{if(unsettled===track)unsettled=null;});
   }
   return done;
  },
  account(){return currentAccountId(fetchImpl);},
  onChange(){
   if(session?.reservations){
    for(const note of session.reservations){
     if((note.status==='open'||note.status==='waiting')&&stored(note.clientKey))note.status='stored';
    }
   }
   if(session?.lastError==='紀錄尚未儲存'&&queue.lastError!=='紀錄尚未儲存')session.lastError='';
   if(queue.lastError==='紀錄尚未儲存')session.lastError='紀錄尚未儲存';
   onChange?.();
  }
 });
 function stored(clientKey){
  return readStoredQueue(storage).some(item=>item.clientKey===clientKey||item.body?.clientKey===clientKey);
 }
 function localHumanSteps(matchId){
  return readStoredQueue(storage).map(item=>item.body).filter(body=>body?.matchId===matchId&&
   body.source==='human'&&String(body.format||'').includes('step')&&Number.isInteger(body.step))
   .sort((left,right)=>left.step-right.step);
 }
 function blank(matchId){
  return {matchId,humanStep:0,aiStep:0,lastAi:null,marks:[],uploaded,lastError:'',
   previous:null,undoStack:[],finished:false,reviewing:false,label:null,signedIn:null,header:null,
   reservations:[],confirmedThrough:0,staged:[],checking:false};
 }
 function fresh(){epoch+=1;reconcileGen+=1;clearReconcile();pendingSaved=null;openUpload=null;anchorWait=null;}
 function clearReconcile(){
  if(reconcileTimer==null)return;
  if(!schedule)clearTimeout(reconcileTimer);
  reconcileTimer=null;
 }
 function scheduleReconcile(fn){
  if(reconcileTimer!=null)return;
  const run=()=>{reconcileTimer=null;fn();};
  reconcileTimer=schedule?schedule(run, 500):setTimeout(run, 500);
 }
 function settleNote(note,result,{epochNow,matchId,step,prior,rollback}){
  if(epoch!==epochNow||!session||session.matchId!==matchId||note.status==='cancelled')return;
  if(result?.queued){
   note.status='stored';
   if(queue.lastError!=='紀錄尚未儲存')session.lastError='';
   return;
  }
  if(result?.stored===false){
   session.lastError='紀錄尚未儲存';
   if(result.retry===true){note.status='waiting';return;}
   note.status='failed';
   if(rollback&&session.humanStep===step+1){
    session.humanStep=step;
    session.undoStack.pop();
    session.previous=prior;
   }
   return;
  }
  if(result?.skipped==='cancelled'){
   note.status='cancelled';
   if(rollback&&session.humanStep===step+1){
    session.humanStep=step;
    session.undoStack.pop();
    session.previous=prior;
   }
   return;
  }
  if(result?.skipped==='queued'){
   note.status='stored';
   if(queue.lastError!=='紀錄尚未儲存')session.lastError='';
   return;
  }
  if(rollback&&session.humanStep===step+1){
   session.humanStep=step;
   session.undoStack.pop();
   session.previous=prior;
  }
  note.status='failed';
  session.lastError='這步沒有放進佇列。';
 }
 async function readServerCount(matchId){
  let timer;
  try{
   const response=await Promise.race([
    fetchImpl('/api/coach/matches/'+matchId,{credentials:'same-origin',headers:{accept:'application/json'}}),
    new Promise(resolve=>{timer=setTimeout(()=>resolve({timeout:true}), reconcileTimeout);})
   ]);
   if(timer)clearTimeout(timer);
   if(!response||response.timeout)return {known:false};
   if(response.status===404)return {known:true, count:0};
   if(!response.ok)return {known:false};
   const data=await response.json();
   const count=data?.match?.steps;
   if(Number.isInteger(count)&&count>=0)return {known:true, count};
   return {known:false};
  }catch{
   if(timer)clearTimeout(timer);
   return {known:false};
  }
 }
 function applyCount(count, saved){
  if(count>session.confirmedThrough)session.confirmedThrough=count;
  const wanted=Number.isInteger(saved?.humanStep)&&saved.humanStep>0?saved.humanStep:0;
  const local=session.humanStep||0;
  if(count>=wanted&&wanted>0&&local<count){
   session.humanStep=count;
   if(saved?.previous)session.previous=saved.previous;
   if(Array.isArray(saved?.undoStack))session.undoStack=saved.undoStack;
   if(session.lastError==='紀錄尚未儲存')session.lastError='';
   return;
  }
  const covered=Math.max(local, session.confirmedThrough||0, count);
  if(wanted>covered){
   session.humanStep=covered;
   session.lastError='紀錄尚未儲存';
   const stack=Array.isArray(saved?.undoStack)?saved.undoStack:[];
   session.undoStack=stack.slice(0, covered);
   session.previous=covered===0?null:stack[covered]||null;
   return;
  }
  session.humanStep=Math.max(local, count, session.confirmedThrough||0);
  if(session.lastError==='紀錄尚未儲存'&&session.humanStep>=wanted)session.lastError='';
 }
 function materialize(draft, step, previous){
  const matchId=session.header.matchId;
  const clientKey=matchId+':'+step+':human';
  const link=previous?{step:previous.step,type:previous.type,replayIndex:previous.replayIndex,
   ...(previous.clientKey?{clientKey:previous.clientKey}:{})}:null;
  return {...draft, step, clientKey, previous:link, chain:chainOf(matchId, step, link, clientKey)};
 }
 function enqueueHuman(body, prior, epochNow){
  const matchId=session.matchId;
  const step=body.step;
  session.undoStack.push(prior);
  session.previous={step:body.step,type:body.choice.type,replayIndex:body.replayIndex,clientKey:body.clientKey};
  session.humanStep=step+1;
  const note={id:++noteSeq,matchId,step,clientKey:body.clientKey,body,previous:prior,status:'open'};
  session.reservations.push(note);
  let queued;
  try{queued=queue.enqueue(body);}
  catch(error){
   note.status='failed';
   session.humanStep=step;
   session.undoStack.pop();
   session.previous=prior;
   session.lastError=error?.message||'這步沒有記下來。';
   emit();
   return;
  }
  const followed=watch(note,queued,{epochNow,matchId,step,prior,rollback:true});
  if(queued?.pending){
   emit();
   return followed.then(value=>{emit();return value;});
  }
  emit();
 }
 function commitDraft(draft){
  const prior=session.previous;
  const body=materialize(draft, session.humanStep, prior);
  if(body.accountId&&session.accountId&&body.accountId!==session.accountId)return;
  enqueueHuman(body, prior, epoch);
 }
 function releaseStaged(){
  if(!session)return;
  session.checking=false;
  const items=session.staged.splice(0, session.staged.length);
  for(const item of items)commitDraft(item.draft);
 }
 function contiguousHuman(){
  const stored=new Set(localHumanSteps(session.matchId).map(body=>body.step));
  let next=session.confirmedThrough||0;
  while(stored.has(next)||session.reservations.some(item=>item.step===next&&
   (item.status==='waiting'||item.status==='stored'||item.status==='confirmed')))next++;
  return next;
 }
 function repairRecovered(){
  if(!session)return;
  const next=contiguousHuman();
  if((session.humanStep||0)<=next)return;
  const stack=Array.isArray(session.undoStack)?session.undoStack:[];
  session.humanStep=next;
  session.undoStack=stack.slice(0, next);
  session.previous=next===0?null:stack[next]||null;
  session.lastError='紀錄尚未儲存';
 }
 function stageHuman(context){
  let draft;
  try{
   draft=owned(buildHumanStep({...context, step:session.humanStep, previous:session.previous, header:session.header}));
  }catch(error){
   session.lastError=error?.message||'這步沒有記下來。';
   emit();
   return;
  }
  if(!draft){
   session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
   emit();
   return;
  }
  session.staged.push({draft, replayIndex:context.replayIndex});
  emit();
 }
 async function confirmCounting(saved, epochNow){
  const gen=reconcileGen;
  const matchId=session.matchId;
  const remote=await readServerCount(matchId);
  if(epoch!==epochNow||gen!==reconcileGen||!session||session.matchId!==matchId)return;
  if(!remote.known){
   if(!coachConsentEnabled(storage))return;
   session.checking=true;
   scheduleReconcile(()=>{
    if(epoch===epochNow&&gen===reconcileGen&&session?.checking&&session.matchId===matchId)
     void confirmCounting(saved, epochNow);
   });
   emit();
   return;
  }
  pendingSaved=null;
  applyCount(remote.count, saved);
  if(!coachConsentEnabled(storage)){
   session.checking=false;
   session.staged=[];
   anchorWait=null;
   emit();
   return;
  }
  const wait=anchorWait;
  anchorWait=null;
  const cursor=session.humanStep||0;
  if(wait){
   try{await wait;}
   catch{/* The note records a write that failed; the cursor is repaired below. */}
   if(epoch!==epochNow||gen!==reconcileGen||!session||session.matchId!==matchId)return;
  }
  repairRecovered();
  const lost=(session.humanStep||0)<cursor;
  releaseStaged();
  if(lost)session.lastError='紀錄尚未儲存';
  emit();
 }
 function classify(result){
  const data=result?.data;
  if(result?.ok===true||result?.duplicate===true||data?.duplicate===true||result?.skipped==='sent')return 'accepted';
  if(result?.timeout||result?.status===0)return 'unknown';
  const status=result?.status;
  if(status==null)return result?.skipped==='consent'?'rejected':'unknown';
  if(status===401||status===403||status===409||status===500)return 'unknown';
  if(status>=400)return 'rejected';
  return 'unknown';
 }
 function rewindUnaccepted(step){
  if(!session||!Number.isInteger(step))return;
  if((session.confirmedThrough||0)>step)return;
  if(session.humanStep!==step+1)return;
  const prior=Array.isArray(session.undoStack)?session.undoStack[step]??null:null;
  session.humanStep=step;
  session.undoStack=(session.undoStack||[]).slice(0, step);
  session.previous=prior;
 }
 function sameUpload(matchId, accountId, step){
  return openUpload&&openUpload.matchId===matchId&&openUpload.step===step&&
   (!accountId||!openUpload.accountId||accountId===openUpload.accountId);
 }
 function applyResult(matchId, step, result, epochNow, accountId){
  if(!Number.isInteger(epochNow)||epoch!==epochNow||!session||session.matchId!==matchId)return;
  if(accountId&&session.accountId&&accountId!==session.accountId)return;
  if(!sameUpload(matchId, accountId, step))return;
  const kind=classify(result);
  if(openUpload.outcome==='accepted')return;
  if(kind==='unknown'&&openUpload.outcome==='rejected')return;
  openUpload.outcome=kind;
  if(kind==='accepted'){
   acceptConfirmed(matchId, step, result, epochNow, accountId, null);
   if((session.humanStep||0)>=step+1&&openUpload.link)session.previous=openUpload.link;
  }else if(kind==='rejected')rewindUnaccepted(step);
 }
 function uploadMatches(){
  return openUpload&&session&&openUpload.matchId===session.matchId&&
   (!openUpload.accountId||!session.accountId||openUpload.accountId===session.accountId);
 }
 async function confirmOpenUpload(epochNow){
  const track=openUpload;
  if(!track||epoch!==epochNow||!session||session.matchId!==track.matchId)return;
  if(track.accountId&&session.accountId&&track.accountId!==session.accountId)return;
  if(!coachConsentEnabled(storage)){
   session.checking=false;
   session.staged=[];
   emit();
   return;
  }
  if(track.outcome==='accepted'||(session.confirmedThrough||0)>track.step){
   if((session.humanStep||0)<track.step+1)session.humanStep=track.step+1;
   if((session.humanStep||0)>=track.step+1&&track.link)session.previous=track.link;
   openUpload=null;
   releaseStaged();
   emit();
   return;
  }
  if(track.outcome==='rejected'){
   rewindUnaccepted(track.step);
   openUpload=null;
   releaseStaged();
   emit();
   return;
  }
  const gen=reconcileGen;
  const remote=await readServerCount(session.matchId);
  if(epoch!==epochNow||gen!==reconcileGen||!session||session.matchId!==track.matchId||openUpload!==track)return;
  if(track.outcome==='accepted'||(session.confirmedThrough||0)>track.step){
   if((session.humanStep||0)<track.step+1)session.humanStep=track.step+1;
   if(track.link)session.previous=track.link;
   openUpload=null;
   releaseStaged();
   emit();
   return;
  }
  if(!coachConsentEnabled(storage)){
   session.checking=false;
   session.staged=[];
   emit();
   return;
  }
  if(!remote.known){
   session.checking=true;
   scheduleReconcile(()=>{
    if(epoch===epochNow&&gen===reconcileGen&&session?.checking&&openUpload===track)
     void confirmOpenUpload(epochNow);
   });
   emit();
   return;
  }
  if(remote.count>track.step)applyCount(remote.count, {humanStep:Math.max(remote.count, session.humanStep||0), previous:session.previous, undoStack:session.undoStack});
  else rewindUnaccepted(track.step);
  openUpload=null;
  releaseStaged();
  emit();
 }
 function watch(note,queued,context){
  const settle=result=>settleNote(note,result,context);
  if(queued?.pending)return queued.done.then(value=>{settle(value);return value;}, error=>{
   if(epoch===context.epochNow&&session?.matchId===context.matchId&&note.status!=='cancelled')
    session.lastError=error?.message||'紀錄尚未儲存';
  });
  settle(queued);
 }
 function rememberStep(body,previous,result,epochNow){
  const note={id:++noteSeq,matchId:body.matchId,step:body.step,clientKey:body.clientKey,body,
   previous:previous??null,status:'open'};
  session.reservations.push(note);
  const followed=watch(note,result,{epochNow,matchId:body.matchId,step:body.step,prior:previous??null,rollback:true});
  if(result?.pending)void followed.then(()=>emit());
  return note;
 }
 function emit(){onChange?.();}
 function labelBody(context){
  return {format:LABEL_FORMAT,...session.header,
   clientKey:session.matchId+':label:'+context.endReason,
   completed:context.completed===true,winner:context.winner,endReason:context.endReason};
 }
 function owned(body){
  const id=validAccountId(session?.accountId);
  if(!id||!body)return null;
  return {...body,accountId:id};
 }
 const api={
  get session(){return session;},
  get queued(){return queue.length;},
  consent(){return coachConsentEnabled(storage);},
  setConsent(enabled){
   setCoachConsent(storage,!!enabled);
   if(!session){emit();return;}
   if(!enabled){
    uploader.invalidate();
    reconcileGen+=1;
    clearReconcile();
    session.checking=false;
    session.staged=[];
    if(session.reservations){
     for(const note of session.reservations){
      if(note.status==='open'||note.status==='waiting')queue.drop(note.clientKey);
     }
    }
    const inflight=unsettled&&unsettled.matchId===session.matchId&&
     (!unsettled.accountId||!session.accountId||unsettled.accountId===session.accountId)?unsettled:null;
    const inflightKey=inflight?inflight.matchId+':'+inflight.step+':human':null;
    const bodies=queue.discard().filter(body=>!inflightKey||body?.clientKey!==inflightKey);
    rewind(session, bodies);
    if(session.reservations){
     for(const note of session.reservations){
      if(note.status==='open'||note.status==='waiting')note.status='cancelled';
     }
    }
    const kept=bodies.some(body=>body?.matchId===session.matchId&&body?.source==='human'&&
     String(body.format||'').includes('step'));
    if(!kept&&!inflight){
     if((session.confirmedThrough||0)>0)session.humanStep=Math.max(session.humanStep||0, session.confirmedThrough);
     else{session.humanStep=0;session.previous=null;session.undoStack=[];}
    }
   }else if(uploadMatches()){
    if(openUpload.outcome==='accepted'||(session.confirmedThrough||0)>openUpload.step){
     if((session.humanStep||0)<openUpload.step+1)session.humanStep=openUpload.step+1;
     if(openUpload.link)session.previous=openUpload.link;
     openUpload=null;
    }else if(openUpload.outcome==='rejected'){
     rewindUnaccepted(openUpload.step);
     openUpload=null;
    }else{
     session.checking=true;
     const epochNow=epoch;
     const pending=unsettled&&unsettled.matchId===session.matchId&&unsettled.step===openUpload.step?unsettled.done:null;
     if(openUpload.outcome==='pending'&&pending)void pending.then(()=>confirmOpenUpload(epochNow));
     else void confirmOpenUpload(epochNow);
    }
   }else if(!session.checking&&pendingSaved&&pendingSaved.matchId===session.matchId){
    session.checking=true;
    const epochNow=epoch;
    const saved=pendingSaved;
    void confirmCounting(saved, epochNow);
   }
   emit();
  },
  async begin(header,knownAccount){
   fresh();
   session=blank(header.matchId||newCoachMatchId());
   session.header={...header,matchId:session.matchId};
   session.accountId=await accountFor(fetchImpl,knownAccount);
   session.signedIn=session.accountId!=null;
   if(this.consent()&&session.signedIn===false)
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
   queue.start();
   emit();
   return session.matchId;
  },
  async restore(saved,header,knownAccount){
   fresh();
   const epochNow=epoch;
   session=blank(header.matchId);
   if(saved&&saved.matchId===header.matchId){
    session.aiStep=saved.aiStep||0;
    session.lastAi=saved.lastAi||null;
    session.marks=Array.isArray(saved.marks)?saved.marks:[];
    session.uploaded=saved.uploaded||uploaded;
    session.finished=saved.finished===true;
    session.reviewing=saved.reviewing===true;
    session.label=saved.label||null;
    const confirmed=Number.isInteger(saved.confirmedThrough)&&saved.confirmedThrough>0?saved.confirmedThrough:0;
    session.confirmedThrough=confirmed;
    let next=confirmed;
    const seen=new Set();
    for(const body of localHumanSteps(header.matchId)){
     if(body.step<next||seen.has(body.step))continue;
     if(body.step!==next)break;
     seen.add(body.step);
     session.reservations.push({id:++noteSeq,matchId:header.matchId,step:body.step,clientKey:body.clientKey,
      body,previous:body.previous||null,status:'stored'});
     next+=1;
    }
    const wanted=Number.isInteger(saved.humanStep)&&saved.humanStep>0?saved.humanStep:0;
    const pending=(Array.isArray(saved.pending)?saved.pending:[]).filter(item=>item?.body&&
     item.body.matchId===header.matchId&&item.body.source==='human'&&
     String(item.body.format||'').includes('step')&&Number.isInteger(item.step)&&
     item.step>=confirmed&&item.clientKey===header.matchId+':'+item.step+':human'&&
     item.body.clientKey===item.clientKey&&item.body.step===item.step)
     .sort((left,right)=>left.step-right.step);
    const recoverable=[];
    if(coachConsentEnabled(storage)){
     for(const item of pending){
      if(item.step<next||seen.has(item.step))continue;
      if(item.step!==next)break;
      recoverable.push(item);
      seen.add(item.step);
      next+=1;
     }
    }
    const hole=wanted>next;
    const stack=Array.isArray(saved.undoStack)?saved.undoStack:[];
    if(hole){
     session.humanStep=next;
     session.undoStack=stack.slice(0,next);
     session.previous=next===0?null:stack[next]||null;
    }else{
     session.humanStep=Math.max(wanted,next);
     session.previous=saved.previous||null;
     session.undoStack=stack;
    }
    if(coachConsentEnabled(storage)){
     for(const item of Array.isArray(saved.staged)?saved.staged:[]){
      if(item?.draft?.matchId===header.matchId&&item.draft.source==='human'&&item.draft.choice)
       session.staged.push({draft:item.draft, replayIndex:item.replayIndex});
     }
    }
    const waits=[];
    for(const item of recoverable){
     const result=queue.enqueue(item.body);
     rememberStep(item.body,item.previous??null,result,epochNow);
     if(result?.pending&&result.done)waits.push(result.done);
    }
    anchorWait=waits.length?Promise.all(waits):null;
   }
   session.header={...header,matchId:session.matchId};
   if(!session.finished)queue.drop(session.matchId+':label:interrupted');
   if(knownAccount!==undefined)session.accountId=validAccountId(knownAccount);
   if(saved&&saved.matchId===header.matchId&&coachConsentEnabled(storage)&&session.accountId)
    session.checking=true;
   session.accountId=await accountFor(fetchImpl,knownAccount);
   if(epoch!==epochNow)return;
   session.signedIn=session.accountId!=null;
   queue.start();
   if(saved&&saved.matchId===header.matchId&&coachConsentEnabled(storage)&&session.accountId){
    pendingSaved=saved;
    session.checking=true;
    await confirmCounting(saved, epochNow);
   }else if(session){
    session.checking=false;
    const wanted=Number.isInteger(saved?.humanStep)&&saved.humanStep>0?saved.humanStep:0;
    if(saved&&saved.matchId===header.matchId&&wanted>(session.humanStep||0))
     session.lastError='紀錄尚未儲存';
   }
   emit();
  },
  snapshot(){
   if(!session)return null;
   const pending=session.reservations.filter(item=>
    (item.status==='open'||item.status==='waiting')&&item.step>=session.confirmedThrough)
    .map(item=>({step:item.step,clientKey:item.clientKey,body:item.body,previous:item.previous??null}));
   const staged=session.staged.map(item=>({draft:item.draft, replayIndex:item.replayIndex}));
   const {matchId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label,
    confirmedThrough}=session;
   return {matchId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label,
    pending,confirmedThrough,staged};
  },
  noteHuman(context){
   if(!session||!this.consent())return;
   if(!session.accountId){
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
    emit();
    return;
   }
   if(session.checking)return stageHuman(context);
   const step=session.humanStep;
   const prior=session.previous;
   let body;
   try{
    body=owned(buildHumanStep({...context,step,previous:prior,header:session.header}));
   }catch(error){
    session.lastError=error?.message||'這步沒有記下來。';
    emit();
    return;
   }
   if(!body){
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
    emit();
    return;
   }
   return enqueueHuman(body, prior, epoch);
  },
  noteAi(entry){
   if(!session)return;
   session.lastAi={step:session.aiStep,replayIndex:entry.replayIndex,action:structuredClone(entry.action)};
   session.aiStep+=1;
   emit();
  },
  retractLast(){
   if(session?.staged?.length){
    session.staged.pop();
    emit();
    return true;
   }
   if(!session||session.humanStep<1)return false;
   const step=session.humanStep-1;
   if(session.confirmedThrough>step)return false;
   const key=session.header.matchId+':'+step+':human';
   const note=[...session.reservations].reverse().find(item=>item.clientKey===key&&
    item.status!=='cancelled'&&item.status!=='failed');
   if(note?.status==='confirmed')return false;
   const removed=queue.drop(key);
   if(removed===false)return false;
   session.humanStep=step;
   session.previous=session.undoStack.pop()||null;
   if(note)note.status='cancelled';
   emit();
   return true;
  },
  async markLast(packs,replay){
   if(!session?.lastAi)throw Error('電腦還沒有走出可以標記的一步。');
   if(session.marks.some(mark=>mark.replayIndex===session.lastAi.replayIndex))
    return session.marks.length;
   const before=stateAtReplayIndex(packs,replay,session.lastAi.replayIndex);
   const body=owned(buildAiMark({packs,state:before,action:session.lastAi.action,step:session.lastAi.step,
    replayIndex:session.lastAi.replayIndex,header:session.header}));
   session.marks=[...session.marks,{step:session.lastAi.step,replayIndex:session.lastAi.replayIndex,action:session.lastAi.action}];
   if(this.consent()&&body){
    const result=await uploader.mark(body);
    if(result?.ok)session.lastError='';
   }
   emit();
   return session.marks.length;
  },
  async finish(context){
   if(!session||session.finished)return;
   const label=labelBody(context);
   session.label=label;session.finished=true;
   if(context.review!==false)session.reviewing=context.endReason==='conceded'||context.completed===true;
   const stamped=owned(label);
   if(this.consent()&&stamped){
    const queued=queue.enqueue(stamped,{holdMs:context.holdMs||0});
    const settle=result=>{if(result?.stored===false)session.lastError='紀錄尚未儲存';};
    if(queued?.pending)void queued.done.then(settle);
    else settle(queued);
    if(context.replay&&(context.completed===true||context.endReason==='conceded'))
     void uploader.debug({header:session.header,replay:context.replay,accountId:stamped.accountId});
   }
   emit();
  },
  async saveDemonstration(body){
   if(!session)throw Error('這場紀錄已經關閉。');
   if(!this.consent())throw Error('同意開關是關閉的，這段示範不會上傳。');
   const stamped=owned(body);
   if(!stamped)throw Error('請先登入再保存示範。');
   const result=await uploader.demonstration(stamped);
   if(!result?.ok)throw Error(result?.data?.error||'示範沒有保存。');
   session.lastError='';
   emit();
   return result;
  },
  flush(){return queue.flushNow();},
  openReview(){if(session){session.reviewing=true;emit();}},
  closeReview(){if(session){session.reviewing=false;emit();}}
 };
 queue.start();
 return api;
}
