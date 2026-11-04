// Live solo-match collector. Consent off does no serialization and no network.
// Accepted human actions are queued locally; the next click does not wait
// for the upload. AI actions stay out of the player-decision queue.
// A resume check, a recovered write that has not landed, or an upload still
// in flight stages new decisions until the next step number is confirmed.
import {coachConsentEnabled,coachConsentVersion,setCoachConsent,createCoachUploader,currentAccountId,validAccountId} from './coach-client.mjs?v=20261104step5';
import {createDecisionQueue, readStoredQueue} from './coach-queue.mjs?v=20261104step5';
import {LABEL_FORMAT, chainOf} from './coach-format.mjs';
import {newCoachMatchId,buildHumanStep,buildAiMark,stateAtReplayIndex} from './coach-record.mjs';

async function accountFor(fetchImpl,known){
 if(known!==undefined)return validAccountId(known);
 const id=await currentAccountId(fetchImpl);
 return validAccountId(id);
}
export function createCoachBattle({storage,fetchImpl=globalThis.fetch,onChange,onAccepted,schedule,locks,reconcileTimeout=8000,uploadTimeout=8000}={}){
 let uploaded=0;
 let session=null;
 let epoch=0;
 let noteSeq=0;
 let openUpload=null;
 let reconcileGen=0;
 let reconcileTimer=null;
 let pendingSaved=null;
 let anchorWait=null;
 let consentVersion=coachConsentVersion(storage);
 const uploader=createCoachUploader({
  consent:()=>coachConsentEnabled(storage),
  storage,
  fetchImpl,
  uploadTimeout,
  onError(message,result,body){
   if(owns(body))session.lastError=message||'紀錄沒有送出。';
  }
 });
 function owns({matchId,accountId}={}){
  return !!session&&session.matchId===matchId&&session.accountId===accountId;
 }
 function acceptConfirmed(track){
  const {step,link}=track;
  if(step!==session.confirmedThrough)return;
  session.confirmedThrough=step+1;
  if(session.humanStep<=step+1){
   session.humanStep=step+1;
   session.previous=link;
  }
  const note=session.reservations.find(item=>item.step===step&&item.status!=='cancelled');
  if(note)note.status='confirmed';
  try{onAccepted?.();}catch{/* The accepted cursor is already in memory if saving the snapshot fails. */}
  emit();
 }
 const queue=createDecisionQueue({
  storage,
  consent:()=>coachConsentEnabled(storage),
  consentVersion:()=>coachConsentVersion(storage),
  schedule,
  locks,
  send(body){
   const human=body?.source==='human'&&String(body?.format||'').includes('step');
   if(!human||!owns(body))
    return String(body.format||'').includes('label')?uploader.label(body):uploader.step(body);
   const {matchId,accountId,step,writeVersion=null}=body;
   const track={matchId,accountId,step,writeVersion,outcome:'pending',
    link:{step,type:body.choice.type,replayIndex:body.replayIndex,clientKey:body.clientKey}};
   openUpload=track;
   track.done=uploader.step(body).then(result=>{
    if(openUpload!==track||!owns(track))return result;
    track.done=null;
    if(result?.ok||result?.skipped==='sent'){
     track.outcome='accepted';
     if(result.ok){uploaded++;session.uploaded=uploaded;session.lastError='';}
     acceptConfirmed(track);
    }else track.outcome='unknown';
    return result;
   });
   return track.done;
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
  return readStoredQueue(storage).filter(item=>(item.consentVersion??null)===consentVersion)
   .map(item=>item.body).filter(body=>body?.matchId===matchId&&
   body.source==='human'&&String(body.format||'').includes('step')&&Number.isInteger(body.step))
   .sort((left,right)=>left.step-right.step);
 }
 function blank(matchId){
  return {matchId,humanStep:0,aiStep:0,lastAi:null,marks:[],uploaded,lastError:'',
   previous:null,undoStack:[],finished:false,reviewing:false,label:null,signedIn:null,header:null,
   reservations:[],confirmedThrough:0,staged:[],checking:false,writeVersion:null};
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
   if(response.status===404)return {known:true, count:0, previous:null};
   if(!response.ok)return {known:false};
   const data=await response.json();
   const count=data?.match?.steps;
   if(Number.isInteger(count)&&count>=0)
    return {known:true,count,writeVersion:data.writeVersion,previous:serverLink(data.steps,count)};
   return {known:false};
  }catch{
   if(timer)clearTimeout(timer);
   return {known:false};
  }
 }
 function serverLink(steps, count){
  if(!Array.isArray(steps)||count<1)return null;
  let last=null;
  for(const step of steps){
   if(!step||step.source==='ai'||step.actor==='ai'||!Number.isInteger(step.step))continue;
   if(!last||step.step>last.step)last=step;
  }
  if(!last||last.step!==count-1||typeof last.choice?.type!=='string')return null;
  const link={step:last.step,type:last.choice.type};
  if(Number.isInteger(last.replayIndex))link.replayIndex=last.replayIndex;
  if(typeof last.clientKey==='string')link.clientKey=last.clientKey;
  if(link.replayIndex==null&&link.clientKey==null)return null;
  return link;
 }
 function applyCount(count, saved, link){
  if(count>session.confirmedThrough)session.confirmedThrough=count;
  const wanted=Number.isInteger(saved?.humanStep)&&saved.humanStep>0?saved.humanStep:0;
  const local=session.humanStep||0;
  if(count>=wanted&&wanted>0&&local<count){
   session.humanStep=count;
   if(Array.isArray(saved?.undoStack))session.undoStack=saved.undoStack;
   if(session.lastError==='紀錄尚未儲存')session.lastError='';
  }else{
   const covered=Math.max(local, session.confirmedThrough||0, count);
   if(wanted>covered){
    session.humanStep=covered;
    session.lastError='紀錄尚未儲存';
    const stack=Array.isArray(saved?.undoStack)?saved.undoStack:[];
    session.undoStack=stack.slice(0, covered);
    session.previous=covered===0?null:stack[covered]||null;
   }else{
    session.humanStep=Math.max(local, count, session.confirmedThrough||0);
    if(session.lastError==='紀錄尚未儲存'&&session.humanStep>=wanted)session.lastError='';
   }
  }
  if(link&&link.step===count-1&&(session.humanStep||0)===count&&session.previous?.step!==link.step)
   session.previous=link;
 }
 function materialize(draft, step, previous){
  const matchId=session.header.matchId;
  const clientKey=matchId+':'+step+':human';
  const link=previous?{step:previous.step,type:previous.type,replayIndex:previous.replayIndex,
   ...(previous.clientKey?{clientKey:previous.clientKey}:{})}:null;
  return {...draft, step, clientKey, previous:link, chain:chainOf(matchId, step, link, clientKey)};
 }
 function enqueueHuman(body, prior, epochNow){
  if(session.writeVersion)body={...body,writeVersion:session.writeVersion};
  const matchId=session.matchId;
  const step=body.step;
  session.undoStack[step]=prior;
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
   if(!coachConsentEnabled(storage)){session.checking=false;return;}
   session.checking=true;
   scheduleReconcile(()=>{
    if(epoch===epochNow&&gen===reconcileGen&&session?.checking&&session.matchId===matchId)
     void confirmCounting(saved, epochNow);
   });
   emit();
   return;
  }
  pendingSaved=null;
  if(remote.writeVersion!==undefined)session.writeVersion=remote.writeVersion;
  applyCount(remote.count, saved, remote.previous);
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
 async function readFencedProgress(track){
  let timer;
  try{
   const {matchId,accountId,step,writeVersion}=track;
   const response=await Promise.race([
    fetchImpl('/api/coach/steps/reconcile',{
     method:'POST',credentials:'same-origin',headers:{accept:'application/json','content-type':'application/json'},
     body:JSON.stringify({matchId,accountId,step,writeVersion})
    }),
    new Promise(resolve=>{timer=setTimeout(()=>resolve(null),reconcileTimeout);})
   ]);
   if(!response?.ok)return null;
   const data=await response.json();
   return Number.isInteger(data?.count)&&data.count>=0&&
    (data.writeVersion===null||typeof data.writeVersion==='string')?data:null;
  }catch{return null;}
  finally{clearTimeout(timer);}
 }
 async function confirmOpenUpload(track,gen){
  if(openUpload!==track||!owns(track)||gen!==reconcileGen||!coachConsentEnabled(storage))return;
  if(track.outcome!=='accepted'||session.confirmedThrough<=track.step){
   const remote=await readFencedProgress(track);
   if(openUpload!==track||!owns(track)||gen!==reconcileGen||
      consentVersion!==coachConsentVersion(storage)||!coachConsentEnabled(storage))return;
   if(!remote){
    scheduleReconcile(()=>void confirmOpenUpload(track,gen));
    emit();
    return;
   }
   session.writeVersion=remote.writeVersion;
   session.confirmedThrough=remote.count;
   session.humanStep=remote.count;
   session.undoStack=session.undoStack.slice(0,remote.count);
   session.previous=remote.previous??null;
  }
  openUpload=null;
  pendingSaved=null;
  releaseStaged();
  try{onAccepted?.();}catch{/* The current cursor is already in memory. */}
  emit();
 }
 function revoke(){
  uploader.invalidate();
  reconcileGen+=1;
  clearReconcile();
  anchorWait=null;
  queue.discard();
  if(!session)return;
  session.checking=false;
  session.staged=[];
  const confirmed=session.confirmedThrough;
  if(session.humanStep>confirmed)session.previous=session.undoStack[confirmed]??null;
  session.humanStep=confirmed;
  session.undoStack=session.undoStack.slice(0,confirmed);
  // Another tab can also drain a stored row from the shared outbox.
  const candidate=session.reservations.find(note=>note.step===confirmed&&note.status==='stored');
  if(candidate&&(!owns(openUpload??{})||openUpload.step<confirmed)){
   openUpload={matchId:session.matchId,accountId:session.accountId,step:confirmed,
    writeVersion:session.writeVersion,outcome:'unknown'};
  }
  for(const note of session.reservations){
   if(note.status!=='confirmed')note.status='cancelled';
  }
  session.reservations=session.reservations.filter(note=>note.status==='confirmed');
  if(owns(openUpload??{}))openUpload.revoked=true;
 }
 function resume(){
  if(!session||session.checking||!coachConsentEnabled(storage))return;
  if(openUpload?.revoked&&owns(openUpload)){
   const track=openUpload;
   if(track.outcome==='accepted'&&session.confirmedThrough>track.step){openUpload=null;return;}
   session.checking=true;
   const gen=reconcileGen;
   if(track.done)void track.done.then(()=>confirmOpenUpload(track,gen));
   else void confirmOpenUpload(track,gen);
  }else if(pendingSaved?.matchId===session.matchId){
   session.checking=true;
   void confirmCounting(pendingSaved,epoch);
  }
 }
 function syncConsent(){
  const version=coachConsentVersion(storage);
  if(version===consentVersion){resume();return;}
  consentVersion=version;
  revoke();
  resume();
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
  syncConsent,
  setConsent(enabled){
   setCoachConsent(storage,!!enabled);
   syncConsent();
   emit();
  },
  async begin(header,knownAccount){
   syncConsent();
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
   syncConsent();
   fresh();
   const epochNow=epoch;
   session=blank(header.matchId);
   if(saved&&saved.matchId===header.matchId){
    session.writeVersion=saved.writeVersion??null;
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
    const currentConsent=(saved.consentVersion??null)===consentVersion;
    const pending=(currentConsent&&Array.isArray(saved.pending)?saved.pending:[]).filter(item=>item?.body&&
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
     for(const item of currentConsent&&Array.isArray(saved.staged)?saved.staged:[]){
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
   let track=saved?.openUpload;
   const revokedSinceSave=saved&&(saved.consentVersion??null)!==consentVersion;
   if(!track&&revokedSinceSave&&saved.humanStep>session.confirmedThrough){
    track={matchId:saved.matchId,accountId:saved.accountId,step:session.confirmedThrough,writeVersion:saved.writeVersion};
   }
   if(track?.matchId===header.matchId&&owns(track)&&Number.isInteger(track.step)&&track.step>=session.confirmedThrough){
    openUpload={matchId:track.matchId,accountId:track.accountId,step:track.step,
     writeVersion:track.writeVersion??null,outcome:'unknown',revoked:true};
   }
   queue.start();
   if(openUpload){
    if(coachConsentEnabled(storage)){
     session.checking=true;
     await confirmOpenUpload(openUpload,reconcileGen);
    }
   }else if(saved&&saved.matchId===header.matchId&&session.accountId){
    pendingSaved=saved;
    if(coachConsentEnabled(storage)){
     session.checking=true;
     await confirmCounting(saved, epochNow);
    }
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
   const {matchId,accountId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label,
    confirmedThrough,writeVersion}=session;
   const unresolved=openUpload?.revoked&&openUpload.outcome!=='accepted'?openUpload:null;
   const upload=unresolved?{matchId:unresolved.matchId,accountId:unresolved.accountId,step:unresolved.step,writeVersion:unresolved.writeVersion}:null;
   return {matchId,accountId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label,
    pending,confirmedThrough,staged,writeVersion,consentVersion,openUpload:upload};
  },
  noteHuman(context){
   syncConsent();
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
  flush(){syncConsent();return queue.flushNow();},
  openReview(){if(session){session.reviewing=true;emit();}},
  closeReview(){if(session){session.reviewing=false;emit();}}
 };
 queue.start();
 return api;
}
