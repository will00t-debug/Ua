// UA56BT/TTG-1-048/049/050 restricted rules.
// 048 first-attack BP/double block already handled in ttg-core-match; this
// module handles the mandatory 049 bounce and three distinct 050 turn-1 costs.
// Printed sources: official TTG-1-048/049/050; 049 metadata from verified card.
import {TTG_BY_ID} from './ttg-builder.mjs';
import {eligibleTtg049ReturnTargets,resolveTtg049Entry} from './ttg-pending-rules.mjs';
const field=p=>['front','energy'].flatMap(line=>(p?.[line]||[]).filter(Boolean));
const name=c=>TTG_BY_ID[c?.cardId]?.nameJa||c?.nameJa||'';
const physical=c=>[c.uid,...(c.stack||[]).flatMap(physical),...(c.under||[]).flatMap(physical)];
const inventory=p=>[...p.deck,...p.hand,...p.life,...p.outside,...(p.removed||[]),...field(p)].flatMap(physical).sort();
const locate=(s,p,uid)=>field(s.players[p]).find(c=>c.uid===uid);
const ownMain=(s,p)=>[0,1].includes(p)&&s?.active===p&&s.phase==='main'&&!s.pending&&!s.pendingTtgLife;
const kittan=c=>name(c)==='キタン'||(c?.stack||[]).some(kittan);
export function beginTtgRed049Entry(s,{player,uid}={}){
 if(!ownMain(s,player)||locate(s,player,uid)?.cardId!=='TTG-1-049'||
   locate(s,player,uid)?.enteredTurn!==s.turn)throw new Error('049 entry must happen immediately after play');
 const r=structuredClone(s);
 r.pending={kind:'ttgRed049Entry',player,uid};
 return r;
}
export function legalTtgRed049Choices(s){
 const q=s?.pending;
 if(q?.kind!=='ttgRed049Entry')return [];
 const targets=eligibleTtg049ReturnTargets(s,{player:q.player,uid:q.uid});
 const fieldCards=field(s.players[q.player]);
 // A legal other card in a Raid pile cannot be quietly returned as an
 // unstacked card. Keep the action blocked pending the full Raid return rule.
 const simple=targets.filter(uid=>{
  const c=fieldCards.find(x=>x.uid===uid);
  return !c?.stack?.length&&!c?.under?.length;
 });
 if(targets.length&&!simple.length)return [];
 return (targets.length?simple:[null]).map(targetUid=>({type:'ttgRed049Return',
  player:q.player,uid:q.uid,targetUid}));
}
export function resolveTtgRed049Choice(s,action={}){
 const q=s?.pending,choices=legalTtgRed049Choices(s);
 if(!choices.some(c=>c.player===action.player&&c.uid===action.uid&&
  c.type===action.type&&c.targetUid===action.targetUid))
  throw new Error('049 mandatory return target invalid');
 const original=inventory(s.players[q.player]);
 const next=resolveTtg049Entry(s,{player:q.player,uid:q.uid,targetUid:action.targetUid});
 next.pending=null;
 if(JSON.stringify(inventory(next.players[q.player]))!==JSON.stringify(original))
  throw new Error('049 mandatory bounce changed physical inventory');
 return next;
}
export function resolveTtgRed050Entry(s,{player,uid}={}){
 if(![0,1].includes(player))throw new Error('Invalid 050 entry owner');
 const c=locate(s,player,uid);
 if(c?.cardId!=='TTG-1-050'||c.enteredTurn!==s.turn||
  c.red050EntryResolvedTurn===s.turn)throw new Error('050 only triggers on fresh entry');
 const before=inventory(s.players[player]),r=structuredClone(s),pl=r.players[player],source=locate(r,player,uid);
 if(field(pl).some(x=>x.uid!==uid&&kittan(x))){
  if(pl.deck.length)pl.hand.push(pl.deck.shift());
  else{r.status='finished';r.winner=1-player;r.endReason='requiredDrawEmpty';}
 }
 source.red050EntryResolvedTurn=s.turn;
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('050 draw physical inventory loss');
 return r;
}
export function legalTtgRed050Main(s,p){
 if(!ownMain(s,p))return [];
 const pl=s.players[p],actions=[];
 for(const c of field(pl).filter(x=>x.cardId==='TTG-1-050')){
  const b={type:'ttgRed050Main',player:p,uid:c.uid};
  if(c.red050ReadyUsedTurn!==s.turn){
   for(const hand of pl.hand)actions.push({...b,mode:'ready',discardUid:hand.uid});
  }
  if(c.ready&&c.red050EnergyUsedTurn!==s.turn)
   actions.push({...b,mode:'energy',discardUid:null});
  if(c.red050BpUsedTurn!==s.turn){
   for(const hand of pl.hand)actions.push({...b,mode:'bp',discardUid:hand.uid});
  }
 }
 return actions;
}
export function resolveTtgRed050Main(s,action={}){
 const {player,uid,mode,discardUid}=action;
 if(!legalTtgRed050Main(s,player).some(a=>a.uid===uid&&a.mode===mode&&a.discardUid===discardUid))
  throw new Error('Illegal 050 turn-1 choice, REST status or discard');
 const before=inventory(s.players[player]),r=structuredClone(s),pl=r.players[player],source=locate(r,player,uid);
 if(mode==='ready'||mode==='bp'){
  const index=pl.hand.findIndex(c=>c.uid===discardUid);
  if(index<0)throw new Error('050 hand cost missing');
  pl.outside.push(pl.hand.splice(index,1)[0]);
 }
 if(mode==='ready'){source.ready=true;source.red050ReadyUsedTurn=s.turn;}
 if(mode==='energy'){
  source.ready=false;source.energyBonus=(source.energyBonus||0)+1;
  source.red050EnergyBonusTurn=s.turn;source.red050EnergyUsedTurn=s.turn;
 }
 if(mode==='bp'){
  source.currentBp=(source.currentBp??TTG_BY_ID[source.cardId].bp)+1000;
  source.buffs??=[];source.buffs.push({bp:1000,turn:s.turn,until:'endTurn'});
  source.red050BpUsedTurn=s.turn;
 }
 r.log??=[];r.log.push({type:'ttgRed050Main',player,uid,mode});
 if(JSON.stringify(inventory(pl))!==JSON.stringify(before))throw new Error('050 main action physical loss');
 return r;
}
export function expireTtgRed050Energy(s){
 const r=structuredClone(s);
 for(const pl of r.players)for(const c of field(pl)){
  if(c.red050EnergyBonusTurn!==s.turn)continue;
  c.energyBonus=Math.max(0,(c.energyBonus||0)-1);
  delete c.red050EnergyBonusTurn;
 }
 return r;
}
