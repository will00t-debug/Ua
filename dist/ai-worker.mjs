import {chooseAiAction} from './ai-v2.mjs';
self.onmessage=({data:{id,state,difficulty}})=>{
 try {self.postMessage({id,action:chooseAiAction(state,{difficulty})});}
 catch {self.postMessage({id,error:true});}
};
