// Live solo-match collector. Consent off performs no network request.
// Marking an AI step stores its replay index only; the hand is rendered later.
import {coachConsentEnabled,setCoachConsent,createCoachUploader} from './coach-client.mjs';
import {newCoachMatchId,buildHumanStep,buildAiMark,stateAtReplayIndex} from './coach-record.mjs';

async function signedIn(fetchImpl){
 try{
  const response=await fetchImpl('/api/me',{credentials:'same-origin',headers:{accept:'application/json'}});
  return response.ok;
 }catch{return false;}
}

export function createCoachBattle({storage,fetchImpl=globalThis.fetch,onChange}={}){
 const uploader=createCoachUploader({
  consent:()=>coachConsentEnabled(storage),
  fetchImpl,
  onUploaded(){if(session)session.uploaded++;},
  onError(message){if(session)session.lastError=message||'紀錄沒有送出。';}
 });
 let session=null;
 function blank(matchId){
  return {matchId,humanStep:0,aiStep:0,lastAi:null,marks:[],uploaded:0,lastError:'',
   previous:null,finished:false,reviewing:false,label:null,signedIn:null,header:null};
 }
 function emit(){onChange?.();}
 return {
  get session(){return session;},
  consent(){return coachConsentEnabled(storage);},
  setConsent(enabled){setCoachConsent(storage,!!enabled);emit();},
  async begin(header){
   session=blank(header.matchId||newCoachMatchId());
   session.header={...header,matchId:session.matchId};
   session.signedIn=await signedIn(fetchImpl);
   if(this.consent()&&session.signedIn===false)
    session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
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
    session.uploaded=saved.uploaded||0;
    session.previous=saved.previous||null;
    session.finished=saved.finished===true;
    session.reviewing=saved.reviewing===true;
    session.label=saved.label||null;
   }
   session.header={...header,matchId:session.matchId};
   session.signedIn=await signedIn(fetchImpl);
   emit();
  },
  snapshot(){
   if(!session)return null;
   const {matchId,humanStep,aiStep,lastAi,marks,uploaded,previous,finished,reviewing,label}=session;
   return {matchId,humanStep,aiStep,lastAi,marks,uploaded,previous,finished,reviewing,label};
  },
  async noteHuman(context){
   if(!session)return;
   try{
    const body=buildHumanStep({...context,step:session.humanStep,previous:session.previous,header:session.header});
    session.previous={step:body.step,type:body.choice.type,replayIndex:body.replayIndex};
    session.humanStep+=1;
    if(!this.consent()){emit();return;}
    if(session.signedIn===false){
     session.lastError='已同意提供紀錄，請先登入。這場不會上傳。';
     emit();return;
    }
    const result=await uploader.step(body);
    if(result?.ok)session.lastError='';
   }catch(error){session.lastError=error?.message||'這步沒有記下來。';}
   emit();
  },
  noteAi(entry){
   if(!session)return;
   session.lastAi={step:session.aiStep,replayIndex:entry.replayIndex,action:structuredClone(entry.action)};
   session.aiStep+=1;
   emit();
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
   const label={format:'ua-v2-coach-label-v1',...session.header,completed:context.completed===true,
    winner:context.winner,endReason:context.endReason};
   session.label=label;session.finished=true;session.reviewing=true;
   if(this.consent()&&session.signedIn!==false){
    await uploader.label(label);
    if(context.replay)await uploader.debug({header:session.header,replay:context.replay});
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
  openReview(){if(session){session.reviewing=true;emit();}},
  closeReview(){if(session){session.reviewing=false;emit();}}
 };
}
