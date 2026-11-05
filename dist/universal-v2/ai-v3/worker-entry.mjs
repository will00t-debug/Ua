// Single-player worker boundary. The payload must already be an
// actor-belief world. A result is discarded unless request id, state
// version and actor still match, and the action is on the live legal list.
import {legalUniversalActions} from '../engine.mjs';
import {chooseAiV3Action,AI_V3_POLICY} from './search.mjs';
import {beliefWorld} from './belief.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function buildAiV3Request(pack,state,actor,{requestId,stateVersion,seed=1,mode,prior,nodes,ms}={}){
 const world=beliefWorld(pack,state,actor,seed,0);
 if(!world)return null;
 return {
  sealed:true,
  requestId,stateVersion,actor,seed,mode:mode||'beam',prior:prior||null,
  nodes:nodes??64,ms:ms??70,
  pack,state:world.state
 };
}
export function handleAiV3Request(message){
 const requestId=message?.requestId??null;
 const stateVersion=message?.stateVersion??null;
 const actor=message?.actor;
 if(!message||message.sealed!==true)
  return {requestId,stateVersion,actor,error:'unsealed',action:null,policy:AI_V3_POLICY};
 if(actor!==0&&actor!==1)
  return {requestId,stateVersion,actor,error:'actor',action:null,policy:AI_V3_POLICY};
 if(message.opponentHand||message.deckOrder||message.lifeOrder||message.rng)
  return {requestId,stateVersion,actor,error:'hidden-field',action:null,policy:AI_V3_POLICY};
 try{
  const legal=legalUniversalActions(message.pack,message.state);
  const action=chooseAiV3Action(message.pack,message.state,{
   actor,seed:message.seed,mode:message.mode,prior:message.prior,
   nodes:message.nodes,ms:message.ms,worlds:1
  });
  const exact=legal.find(item=>same(item,action))||null;
  if(!exact)return {requestId,stateVersion,actor,error:'not-legal',action:null,policy:AI_V3_POLICY};
  return {requestId,stateVersion,actor,error:null,action:exact,policy:AI_V3_POLICY};
 }catch(error){
  return {requestId,stateVersion,actor,error:error?.message||'exception',action:null,policy:AI_V3_POLICY};
 }
}
export function acceptAiV3Result(current,result){
 if(!result)return {ok:false,reason:'empty',action:null};
 if(result.requestId!==current.requestId)return {ok:false,reason:'stale-request',action:null};
 if(result.stateVersion!==current.stateVersion)return {ok:false,reason:'stale-version',action:null};
 if(result.actor!==current.actor)return {ok:false,reason:'stale-actor',action:null};
 if(result.error)return {ok:false,reason:result.error,action:null};
 const action=(current.legal||[]).find(item=>same(item,result.action));
 if(!action)return {ok:false,reason:'not-legal',action:null};
 return {ok:true,reason:null,action};
}
