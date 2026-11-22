// Dedicated worker keeps hard-search plus learned reranking off the UI thread.
import {handleWhiteSwordRequest} from './browser-entry.mjs';
self.onmessage=event=>{
 const message=event.data||{};
 try{self.postMessage(handleWhiteSwordRequest(message));}
 catch(error){
  self.postMessage({requestId:message.requestId??null,stateVersion:message.stateVersion??null,
   actor:message.actor,action:null,error:String(error?.message||error)});
 }
};
