import {handleAiV3Request} from './worker-entry.mjs';

self.onmessage=event=>{
 const message=event.data||{};
 try{self.postMessage(handleAiV3Request(message));}
 catch(error){
  self.postMessage({
   requestId:message.requestId??null,
   stateVersion:message.stateVersion??null,
   actor:message.actor,
   error:error?.message||'exception',
   action:null
  });
 }
};
