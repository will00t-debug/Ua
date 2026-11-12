// Idle-main candidate. Hard-search-2 is not modified. A high-BP energy play
// is left in place when the front already has a 3000 body, when the energy
// card itself is below 3000, or when no 3000 deploy is legal. A payable
// raid or front play replaces it only while the front has no 3000 body.
// Negative search scores stay on energy: a bad on-play is not called safe.
import {universalBp} from '../engine.mjs';

function same(a, b){
 return JSON.stringify(a)===JSON.stringify(b);
}
function ownHand(state, actor, uid){
 if(!uid)return null;
 return (state?.players?.[actor]?.hand||[]).find(card=>card?.uid===uid)||null;
}
function liveBp(pack, state, card){
 if(!card)return 0;
 try{
  const value=universalBp(pack, state, card);
  return Number.isFinite(value)?value:0;
 }catch{return 0;}
}
function traceScore(trace, action){
 const row=(trace?.candidates||[]).find(item=>item?.action&&same(item.action, action));
 const score=row?.score;
 return Number.isFinite(score)?score:null;
}

export function preferPaidFront(pack, state, actor, chosen, legal, trace){
 if(!chosen||chosen.type!=='play'||chosen.line!=='energy')return chosen;
 const keptScore=traceScore(trace, chosen);
 if(keptScore!=null&&keptScore>=50000)return chosen;
 const card=ownHand(state, actor, chosen.uid);
 if(!card||liveBp(pack, state, card)<3000)return chosen;
 const front=state?.players?.[actor]?.front||[];
 if(front.some(body=>body&&liveBp(pack, state, body)>=3000))return chosen;
 const empty=front.some(slot=>!slot);
 const deploys=(legal||[]).filter(action=>{
  const raid=action?.type==='raid';
  const ontoFront=action?.type==='play'&&action.line==='front';
  if(!raid&&!ontoFront)return false;
  if(ontoFront&&!empty)return false;
  const body=ownHand(state, actor, action.uid);
  return !!body&&liveBp(pack, state, body)>=3000;
 });
 if(!deploys.length)return chosen;
 const scored=deploys.filter(action=>traceScore(trace, action)!=null);
 const positive=scored.filter(action=>traceScore(trace, action)>0);
 // A scored deploy that is not ahead of zero is a real downside. Unscored
 // deploys fill in only when the search never reached one.
 const pool=positive.length?positive:(scored.length?[]:deploys);
 if(!pool.length)return chosen;
 pool.sort((a, b)=>{
  const as=traceScore(trace, a), bs=traceScore(trace, b);
  if(Number.isFinite(as)&&Number.isFinite(bs)&&as!==bs)return bs-as;
  const ab=liveBp(pack, state, ownHand(state, actor, a.uid));
  const bb=liveBp(pack, state, ownHand(state, actor, b.uid));
  if(ab!==bb)return bb-ab;
  if(a.type!==b.type)return a.type==='raid'?-1:1;
  return JSON.stringify(a)<JSON.stringify(b)?-1:1;
 });
 return pool[0];
}
