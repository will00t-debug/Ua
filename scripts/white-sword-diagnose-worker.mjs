import {parentPort} from 'node:worker_threads';
import {diagnoseGame} from '../dist/universal-v2/white-sword-ai/diagnose.mjs';

parentPort.on('message',spec=>{
 if(!spec)return;
 try{parentPort.postMessage({ok:true,game:diagnoseGame(spec)});}
 catch(error){parentPort.postMessage({ok:false,error:String(error?.stack||error)});}
});
