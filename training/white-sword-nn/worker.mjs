import {parentPort} from 'node:worker_threads';
import {unpackNet} from './net.mjs';
import {playMatch} from './play.mjs';

parentPort.on('message',job=>{
 try{
  const nets=(job.seatNets||[]).map(packed=>packed?unpackNet(packed):null);
  const critics=(job.seatCritics||[]).map(packed=>packed?unpackNet(packed):null);
  const game=playMatch({...job.spec,nets,critics,progress:true});
  parentPort.postMessage({type:'done',ok:true,game});
 }catch(error){
  parentPort.postMessage({type:'done',ok:false,error:String(error?.stack||error)});
 }
});
