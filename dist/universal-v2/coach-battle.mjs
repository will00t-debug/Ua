// Live solo-match collector. Consent off does no serialization and no network.
// Accepted human actions are queued locally; the next click does not wait
// for the upload. AI actions stay out of the player-decision queue.
import {coachConsentEnabled,setCoachConsent,createCoachUploader,currentAccountId,validAccountId} from './coach-client.mjs';
import {createDecisionQueue, readStoredQueue} from './coach-queue.mjs?v=20261104step1';
import {LABEL_FORMAT} from './coach-format.mjs';
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

export function createCoachBattle({storage,fetchImpl=globalThis.fetch,onChange,schedule}={}){
 let uploaded=0;
 let session=null;
 let epoch=0;
 let noteSeq=0;
 const uploader=createCoachUploader({
  consent:()=>coachConsentEnabled(storage),
  fetchImpl,
  onUploaded(){uploaded++;if(session){session.uploaded=uploaded;session.lastError='';}},
  onError(message){if(session)session.lastError=message||'紀錄沒有送出。';}
 });
 function acceptConfirmed(matchId,step,result,epochNow){
  if(epoch!==epochNow||!session||session.matchId!==matchId)return;
  const data=result?.data;
  const accepted=result?.ok===true||result?.duplicate===true||data?.duplicate===true;
  if(!accepted||!Number.isInteger(step)||step!==session.confirmedThrough)return;
  session.confirmedThrough=step+1;
  const note=session.reservations.find(item=>item.step===step&&item.status!=='cancelled');
  if(note)note.status='confirmed';
  emit();
 }
 const queue=createDecisionQueue({
  storage,
  consent:()=>coachConsentEnabled(storage),
  schedule,
  send(body){
   const matchId=body?.matchId;
   const step=body?.step;
   const human=body?.source==='human'&&String(body?.format||'').includes('step');
   const epochNow=epoch;
   const sent=String(body?.format||'').includes('label')?uploader.label(body):uploader.step(body);
   return Promise.resolve(sent).then(result=>{
    if(human)acceptConfirmed(matchId,step,result,epochNow);
    return result;
   });
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
   reservations:[],confirmedThrough:0};
 }
 function fresh(){epoch+=1;}
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
  if(result?.skipped==='cancelled')return;
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
 async function reconcileServer(saved,localNext,hole,epochNow){
  let remote=null;
  try{
   const response=await fetchImpl('/api/coach/matches/'+session.matchId,{
    credentials:'same-origin',headers:{accept:'application/json'}
   });
   if(response?.ok){
    const data=await response.json();
    const count=data?.match?.steps;
    if(Number.isInteger(count)&&count>=0)remote=count;
   }
  }catch{remote=null;}
  if(epoch!==epochNow||!session||session.humanStep!==localNext||!Number.isInteger(remote))return;
  if(remote>session.confirmedThrough)session.confirmedThrough=remote;
  const covered=Math.max(localNext,remote);
  const wanted=Number.isInteger(saved.humanStep)&&saved.humanStep>0?saved.humanStep:0;
  if(wanted>covered){
   session.humanStep=covered;
   session.lastError='紀錄尚未儲存';
   const stack=Array.isArray(saved.undoStack)?saved.undoStack:[];
   session.undoStack=stack.slice(0,covered);
   session.previous=covered===0?null:stack[covered]||null;
   return;
  }
  session.humanStep=covered;
  if(covered===wanted){
   session.previous=saved.previous||null;
   session.undoStack=Array.isArray(saved.undoStack)?saved.undoStack:[];
  }
  if((hole||session.lastError==='紀錄尚未儲存')&&covered>=wanted)session.lastError='';
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
   if(!enabled){
    if(session?.reservations){
     for(const note of session.reservations){
      if(note.status==='open')queue.drop(note.clientKey);
     }
    }
    const bodies=queue.discard();
    rewind(session,bodies);
    if(session?.reservations){
     for(const note of session.reservations){
      if(note.status==='open'||note.status==='waiting')note.status='cancelled';
     }
     const kept=bodies.some(body=>body?.matchId===session.matchId&&body?.source==='human'&&
      String(body.format||'').includes('step'));
     if(!kept){session.humanStep=0;session.previous=null;session.undoStack=[];}
    }
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
   let localNext=0;
   let hole=false;
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
    hole=wanted>next;
    const stack=Array.isArray(saved.undoStack)?saved.undoStack:[];
    if(hole){
     session.humanStep=next;
     session.undoStack=stack.slice(0,next);
     session.previous=next===0?null:stack[next]||null;
     session.lastError='紀錄尚未儲存';
    }else{
     session.humanStep=Math.max(wanted,next);
     session.previous=saved.previous||null;
     session.undoStack=stack;
    }
    localNext=session.humanStep;
    for(const item of recoverable){
     const result=queue.enqueue(item.body);
     rememberStep(item.body,item.previous??null,result,epochNow);
    }
   }
   session.header={...header,matchId:session.matchId};
   if(!session.finished)queue.drop(session.matchId+':label:interrupted');
   session.accountId=await accountFor(fetchImpl,knownAccount);
   if(epoch!==epochNow)return;
   session.signedIn=session.accountId!=null;
   queue.start();
   if(saved&&saved.matchId===header.matchId&&coachConsentEnabled(storage)&&session.accountId)
    await reconcileServer(saved,localNext,hole,epochNow);
   emit();
  },
  snapshot(){
   if(!session)return null;
   const pending=session.reservations.filter(item=>
    (item.status==='open'||item.status==='waiting')&&item.step>=session.confirmedThrough)
    .map(item=>({step:item.step,clientKey:item.clientKey,body:item.body,previous:item.previous??null}));
   const {matchId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label,
    confirmedThrough}=session;
   return {matchId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label,
    pending,confirmedThrough};
  },
  noteHuman(context){
   if(!session||!this.consent())return;
   if(!session.accountId){
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
    emit();
    return;
   }
   const epochNow=epoch;
   const matchId=session.matchId;
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
  },
  noteAi(entry){
   if(!session)return;
   session.lastAi={step:session.aiStep,replayIndex:entry.replayIndex,action:structuredClone(entry.action)};
   session.aiStep+=1;
   emit();
  },
  retractLast(){
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
