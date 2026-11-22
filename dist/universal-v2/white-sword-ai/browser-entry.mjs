// Inference-only browser boundary. The production default AI is not changed.
import {legalUniversalActions} from '../engine.mjs';
import {chooseWhiteSwordAction} from './choose.mjs';
import {WHITE_SWORD_V2_MODEL} from './weights-v2.mjs';

export const WHITE_SWORD_V2_POLICY='white-sword-specialist-v2-capped';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function handleWhiteSwordRequest(message){
 const requestId=message?.requestId??null;
 const stateVersion=message?.stateVersion??null;
 const actor=message?.actor;
 const base={requestId,stateVersion,actor,policy:WHITE_SWORD_V2_POLICY};
 if(!message||message.sealed!==true||!Array.isArray(message.pack)||!message.state)
  return {...base,action:null,error:'unsealed'};
 if(actor!==1)return {...base,action:null,error:'not-ai-seat'};
 if(message.opponentHand||message.deckOrder||message.lifeOrder||message.rng)
  return {...base,action:null,error:'hidden-field'};
 if(message.pack[actor]?.id!=='bleach')return {...base,action:null,error:'not-bleach'};
 try{
  const legal=legalUniversalActions(message.pack,message.state);
  const result=chooseWhiteSwordAction(message.pack,message.state,{
   actor,model:WHITE_SWORD_V2_MODEL,mode:'blend',scale:6,hardCap:7,
   seed:Number.isInteger(message.seed)?message.seed:1,timeoutMs:3500,explore:0
  });
  const action=legal.find(item=>same(item,result.action))||null;
  if(result.source==='fallback'||!action)
   return {...base,action:null,error:result.reason||'inference-fallback'};
  return {...base,action,error:null,source:result.source,ms:result.ms};
 }catch(error){
  return {...base,action:null,error:String(error?.message||error)};
 }
}
