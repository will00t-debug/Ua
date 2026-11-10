// Single-player worker boundary. The payload must already be an
// actor-belief world. A result is discarded unless request id, state
// version and actor still match, and the action is on the live legal list.
import {legalUniversalActions} from '../engine.mjs';
import {chooseAiV3Action,lastAiV3Trace,AI_V3_POLICY,MATCH_LIMITS} from './search.mjs';
import {chooseHybridMainAction,lastHybridRoute,HYBRID_MAIN_POLICY} from './hybrid-main.mjs';
import {lastHardAiTrace} from '../hard-ai.mjs';
import {normalizeFactors} from './strategy.mjs';
import {beliefWorld} from './belief.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function searchReport(){
 const trace=lastAiV3Trace()||{};
 return {
  reason:trace.reason??null,
  fallbackKind:trace.fallbackKind??null,
  fallbackFrom:trace.fallbackFrom??null,
  nodesUsed:Number.isFinite(trace.nodesUsed)?trace.nodesUsed:null,
  score:Number.isFinite(trace.score)?trace.score:null,
  settled:trace.settled===true
 };
}
export function buildAiV3Request(pack,state,actor,{requestId,stateVersion,seed=1,mode,prior,nodes,ms,policy}={}){
 const world=beliefWorld(pack,state,actor,seed,0);
 if(!world)return null;
 return {
  sealed:true,
  requestId,stateVersion,actor,seed,mode:mode||'beam',prior:prior||null,
  nodes:nodes??MATCH_LIMITS.nodes,ms:ms??MATCH_LIMITS.ms,
  ...(policy===HYBRID_MAIN_POLICY?{policy:HYBRID_MAIN_POLICY}:{}),
  pack,state:world.state
 };
}
function namedPolicy(message){
 return message?.policy===HYBRID_MAIN_POLICY?HYBRID_MAIN_POLICY:AI_V3_POLICY;
}
export function handleAiV3Request(message){
 const requestId=message?.requestId??null;
 const stateVersion=message?.stateVersion??null;
 const actor=message?.actor;
 const policy=namedPolicy(message);
 if(!message||message.sealed!==true)
  return {requestId,stateVersion,actor,error:'unsealed',action:null,policy};
 if(actor!==0&&actor!==1)
  return {requestId,stateVersion,actor,error:'actor',action:null,policy};
 if(message.opponentHand||message.deckOrder||message.lifeOrder||message.rng)
  return {requestId,stateVersion,actor,error:'hidden-field',action:null,policy};
 try{
  const legal=legalUniversalActions(message.pack,message.state);
  const asked=message.variant;
  const variant=asked==='a'||asked==='b'||asked==='ab'||asked==='ab-front'?asked:null;
  const factors=normalizeFactors(message.factors);
  const hybrid=policy===HYBRID_MAIN_POLICY;
  const limits={
   actor,seed:message.seed,mode:message.mode,prior:message.prior,
   nodes:message.nodes,ms:message.ms,worlds:1,
   ...(factors?{factors}:{}),
   ...(variant&&!factors?{variant}:{})
  };
  const action=hybrid
   ?chooseHybridMainAction(message.pack,message.state,limits)
   :chooseAiV3Action(message.pack,message.state,limits);
  const exact=legal.find(item=>same(item,action))||null;
  const route=hybrid?lastHybridRoute():null;
  const search=hybrid&&route?.source==='hard'?hardSearchReport():searchReport();
  if(route)search.route=route;
  if(!exact)return {requestId,stateVersion,actor,error:'not-legal',action:null,policy,search};
  return {requestId,stateVersion,actor,error:null,action:exact,policy,search};
 }catch(error){
  return {requestId,stateVersion,actor,error:error?.message||'exception',action:null,policy,search:searchReport()};
 }
}
function hardSearchReport(){
 const trace=lastHardAiTrace()||{};
 return {
  reason:trace.reason??null,
  fallbackKind:null,
  fallbackFrom:null,
  nodesUsed:Number.isFinite(trace.nodesUsed)?trace.nodesUsed:null,
  score:Number.isFinite(trace.score)?trace.score:null,
  settled:trace.score>=50000
 };
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
