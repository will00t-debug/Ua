// Idle-main candidate. Hard-search-2 is not modified. Default off.
// An energy play of a 4000 BP character is replaced by a legal front raid or
// front play only when the visible position says all of the following:
// the energy already pays the other important characters, or this generator
// does not newly pay one and the color is already at 4; the front has no
// ready body that can answer the opponent's ready front; a 4000 front deploy
// has a positive search score; this turn still has AP and a place to put it.
// A generator that newly pays a 3000+ character stays on energy. A negative
// on-play stays on energy. Nothing here keys off a card number, deck, or seed.
import {universalBp, universalEnergyByColor} from '../engine.mjs';

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
function printed(pack, card){
 if(!card?.uid||!card.cardId)return null;
 const owner=Number(String(card.uid).split('-')[0]);
 const packs=Array.isArray(pack)?pack:[pack, pack];
 return packs[owner]?.cards?.[card.cardId]||null;
}
function traceScore(trace, action){
 const row=(trace?.candidates||[]).find(item=>item?.action&&same(item.action, action));
 const score=row?.score;
 return Number.isFinite(score)?score:null;
}
function readyMax(pack, state, seat){
 let max=0;
 for(const card of state?.players?.[seat]?.front||[]){
  if(card&&card.ready)max=Math.max(max, liveBp(pack, state, card));
 }
 return max;
}
function readyAp(player){
 return (player?.apCards||[]).filter(card=>card&&card.ready).length;
}

export function preferCurveFront(pack, state, actor, chosen, legal, trace){
 if(!chosen||chosen.type!=='play'||chosen.line!=='energy')return chosen;
 const keptScore=traceScore(trace, chosen);
 if(keptScore!=null&&keptScore>=50000)return chosen;
 const card=ownHand(state, actor, chosen.uid);
 const data=printed(pack, card);
 if(!card||!data||data.type!=='character')return chosen;
 const bp=liveBp(pack, state, card);
 if(bp<4000)return chosen;
 const player=state?.players?.[actor];
 const front=player?.front||[];
 const empty=front.some(slot=>!slot);
 const deploys=(legal||[]).filter(action=>{
  const raid=action?.type==='raid'&&action.line!=='energy';
  const ontoFront=action?.type==='play'&&action.line==='front';
  if(!raid&&!ontoFront)return false;
  if(ontoFront&&!empty)return false;
  const body=ownHand(state, actor, action.uid);
  const bodyData=printed(pack, body);
  return !!body&&bodyData?.type==='character'&&liveBp(pack, state, body)>=4000;
 });
 const winning=deploys.filter(action=>{
  const score=traceScore(trace, action);
  return score!=null&&score>=50000;
 });
 if(winning.length)return rank(pack, state, actor, winning, trace)[0];
 const colors=(()=>{try{return universalEnergyByColor(pack, state, actor)||{};}catch{return {};}})();
 const have=colors[data.color]||0;
 const gen=Number(data.gen)||0;
 const important=(player?.hand||[]).filter(other=>{
  if(!other||other.uid===card.uid)return false;
  const otherData=printed(pack, other);
  return otherData?.type==='character'&&otherData.color===data.color&&liveBp(pack, state, other)>=3000;
 });
 const unpaid=important.filter(other=>(Number(printed(pack, other)?.energy)||0)>have);
 const unlocks=unpaid.some(other=>(Number(printed(pack, other)?.energy)||0)<=have+gen);
 if(unlocks)return chosen;
 if(unpaid.length&&have<4)return chosen;
 const ownReady=readyMax(pack, state, actor);
 const oppReady=readyMax(pack, state, 1-actor);
 const lacking=ownReady===0||(oppReady>0&&ownReady<=oppReady&&ownReady<4000);
 if(!lacking)return chosen;
 if(readyAp(player)<1)return chosen;
 const positive=deploys.filter(action=>{
  const score=traceScore(trace, action);
  return score!=null&&score>0;
 });
 if(!positive.length)return chosen;
 return rank(pack, state, actor, positive, trace)[0];
}

function rank(pack, state, actor, pool, trace){
 return [...pool].sort((a, b)=>{
  const as=traceScore(trace, a), bs=traceScore(trace, b);
  if(Number.isFinite(as)&&Number.isFinite(bs)&&as!==bs)return bs-as;
  const ab=liveBp(pack, state, ownHand(state, actor, a.uid));
  const bb=liveBp(pack, state, ownHand(state, actor, b.uid));
  if(ab!==bb)return bb-ab;
  if(a.type!==b.type)return a.type==='raid'?-1:1;
  return JSON.stringify(a)<JSON.stringify(b)?-1:1;
 });
}
