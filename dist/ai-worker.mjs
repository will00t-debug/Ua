import {chooseAiAction} from './ai-v2.mjs';
import {chooseNeuralAction} from './ai-v3-policy.mjs';
self.onmessage=({data:{id,state,difficulty}})=>{
 try {self.postMessage({id,action:difficulty==='learning'?chooseNeuralAction(state):chooseAiAction(state,{difficulty})});}
 catch {self.postMessage({id,error:true});}
};
