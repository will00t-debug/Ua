// Live solo-match collector. Consent off does no serialization and no network.
// Accepted human actions are queued locally; the next click does not wait
// for the upload. AI actions stay out of the player-decision queue.
import {coachConsentEnabled,setCoachConsent,createCoachUploader} from './coach-client.mjs';
import {createDecisionQueue} from './coach-queue.mjs';
import {LABEL_FORMAT} from './coach-format.mjs';
import {newCoachMatchId,buildHumanStep,buildAiMark,stateAtReplayIndex} from './coach-record.mjs';

async function signedIn(fetchImpl){
 try{
  const response=await fetchImpl('/api/me',{credentials:'same-origin',headers:{accept:'application/json'}});
  return response.ok;
 }catch{return false;}
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
 const uploader=createCoachUploader({
  consent:()=>coachConsentEnabled(storage),
  fetchImpl,
  onUploaded(){uploaded++;if(session)session.uploaded=uploaded;},
  onError(message){if(session)session.lastError=message||'紀錄沒有送出。';}
 });
 const queue=createDecisionQueue({
  storage,
  consent:()=>coachConsentEnabled(storage),
  schedule,
  send(body){
   return String(body.format||'').includes('label')?uploader.label(body):uploader.step(body);
  },
  onChange(){onChange?.();}
 });
 function blank(matchId){
  return {matchId,humanStep:0,aiStep:0,lastAi:null,marks:[],uploaded,lastError:'',
   previous:null,undoStack:[],finished:false,reviewing:false,label:null,signedIn:null,header:null};
 }
 function emit(){onChange?.();}
 function labelBody(context){
  return {format:LABEL_FORMAT,...session.header,
   clientKey:session.matchId+':label:'+context.endReason,
   completed:context.completed===true,winner:context.winner,endReason:context.endReason};
 }
 const api={
  get session(){return session;},
  get queued(){return queue.length;},
  consent(){return coachConsentEnabled(storage);},
  setConsent(enabled){
   setCoachConsent(storage,!!enabled);
   if(!enabled)rewind(session,queue.discard());
   emit();
  },
  async begin(header){
   session=blank(header.matchId||newCoachMatchId());
   session.header={...header,matchId:session.matchId};
   session.signedIn=await signedIn(fetchImpl);
   if(this.consent()&&session.signedIn===false)
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
   queue.start();
   emit();
   return session.matchId;
  },
  async restore(saved,header){
   session=blank(header.matchId);
   if(saved&&saved.matchId===header.matchId){
    session.humanStep=saved.humanStep||0;
    session.aiStep=saved.aiStep||0;
    session.lastAi=saved.lastAi||null;
    session.marks=Array.isArray(saved.marks)?saved.marks:[];
    session.uploaded=saved.uploaded||uploaded;
    session.previous=saved.previous||null;
    session.undoStack=Array.isArray(saved.undoStack)?saved.undoStack:[];
    session.finished=saved.finished===true;
    session.reviewing=saved.reviewing===true;
    session.label=saved.label||null;
   }
   session.header={...header,matchId:session.matchId};
   if(!session.finished)queue.drop(session.matchId+':label:interrupted');
   session.signedIn=await signedIn(fetchImpl);
   queue.start();
   emit();
  },
  snapshot(){
   if(!session)return null;
   const {matchId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label}=session;
   return {matchId,humanStep,aiStep,lastAi,marks,uploaded:sent,previous,undoStack,finished,reviewing,label};
  },
  noteHuman(context){
   if(!session||!this.consent())return;
   if(session.signedIn===false){
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
    emit();
    return;
   }
   try{
    const body=buildHumanStep({...context,step:session.humanStep,previous:session.previous,header:session.header});
    const prior=session.previous;
    session.undoStack.push(prior);
    session.previous={step:body.step,type:body.choice.type,replayIndex:body.replayIndex,clientKey:body.clientKey};
    session.humanStep+=1;
    const queued=queue.enqueue(body);
    if(!queued.queued){
     session.humanStep-=1;
     session.undoStack.pop();
     session.previous=prior;
     if(queued.skipped!=='queued')session.lastError='這步沒有放進佇列。';
    }else session.lastError='';
   }catch(error){session.lastError=error?.message||'這步沒有記下來。';}
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
   const key=session.header.matchId+':'+step+':human';
   if(!queue.drop(key))return false;
   session.humanStep=step;
   session.previous=session.undoStack.pop()||null;
   emit();
   return true;
  },
  async markLast(packs,replay){
   if(!session?.lastAi)throw Error('電腦還沒有走出可以標記的一步。');
   if(session.marks.some(mark=>mark.replayIndex===session.lastAi.replayIndex))
    return session.marks.length;
   const before=stateAtReplayIndex(packs,replay,session.lastAi.replayIndex);
   const body=buildAiMark({packs,state:before,action:session.lastAi.action,step:session.lastAi.step,
    replayIndex:session.lastAi.replayIndex,header:session.header});
   session.marks=[...session.marks,{step:session.lastAi.step,replayIndex:session.lastAi.replayIndex,action:session.lastAi.action}];
   if(this.consent()&&session.signedIn!==false){
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
   if(this.consent()&&session.signedIn!==false){
    queue.enqueue(label,{holdMs:context.holdMs||0});
    if(context.replay&&(context.completed===true||context.endReason==='conceded'))
     void uploader.debug({header:session.header,replay:context.replay});
   }
   emit();
  },
  async saveDemonstration(body){
   if(!session)throw Error('這場紀錄已經關閉。');
   if(!this.consent())throw Error('同意開關是關閉的，這段示範不會上傳。');
   if(session.signedIn===false)throw Error('請先登入再保存示範。');
   const result=await uploader.demonstration(body);
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
