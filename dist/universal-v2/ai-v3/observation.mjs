// Actor-visible observation for ai-v3. Hidden opponent hand identities,
// both deck orders, unrevealed LIFE and the match RNG are not features
// and are not left readable on a belief world.
import {universalPublicView,universalPrivateChoices} from '../engine.mjs';

const PACKS=pack=>Array.isArray(pack)?pack:[pack,pack];
const ZONES=['hand','deck','life','lifeRevealed','outside','removed','resolvingEvents'];
const PRIVATE_TOP=new Set(['private-top-place','private-top-choice','effect-top-trait-hand','effect-peek-top-place']);

function addLayers(layers,into){
 for(const layer of layers||[]){
  if(!layer||typeof layer!=='object')continue;
  if(layer.uid&&layer.cardId)into.add(layer.uid);
  addLayers(layer.stack,into);
  addLayers(layer.under,into);
 }
}
export function visibleUidSet(pack,state,actor){
 const view=universalPublicView(pack,state,actor);
 const ids=new Set();
 const mine=view.players[actor];
 for(const card of mine?.hand||[])if(card?.uid)ids.add(card.uid);
 for(const player of view.players){
  for(const line of ['front','energy'])for(const card of player[line]||[])if(card?.uid){
   ids.add(card.uid);
   addLayers(card.raidLayers,ids);
   addLayers(card.underLayers,ids);
  }
  for(const card of [...(player.outside||[]),...(player.removed||[]),...(player.faceUpLife||[]),...(player.publicLife||[])])
   if(card?.uid)ids.add(card.uid);
 }
 for(const card of view.publicReveals||[])if(card?.uid)ids.add(card.uid);
 for(const card of view.openTriggers||[])if(card?.uid)ids.add(card.uid);
 const priv=universalPrivateChoices(pack,state,actor);
 if(priv?.player===actor){
  for(const card of priv.inspected||[])if(card?.uid)ids.add(card.uid);
  for(const opt of priv.options||[])if(opt?.card?.cardId&&opt.action?.uid)ids.add(opt.action.uid);
  if(PRIVATE_TOP.has(priv.kind)){
   const top=state.players[actor].deck[0];
   if(top?.uid)ids.add(top.uid);
  }
 }
 return ids;
}
function walk(card,visible,slots,bodies){
 if(!card)return;
 if(card.uid){
  if(visible.has(card.uid))bodies.push(card);
  else slots.push(card);
 }
 for(const layer of [...(card.stack||[]),...(card.under||[])])walk(layer,visible,slots,bodies);
}
export function hiddenSlots(player,visible){
 const slots=[];
 for(const zone of ZONES)for(const card of player[zone]||[])walk(card,visible,slots,[]);
 for(const line of ['front','energy'])for(const card of player[line]||[])walk(card,visible,slots,[]);
 return slots;
}
export function visibleBodies(player,visible){
 const bodies=[];
 for(const zone of ZONES)for(const card of player[zone]||[])walk(card,visible,[],bodies);
 for(const line of ['front','energy'])for(const card of player[line]||[])walk(card,visible,[],bodies);
 return bodies;
}
export function allBodies(player){
 const bodies=[];
 const every=new Set();
 const visit=card=>{
  if(!card?.uid||!card.cardId||every.has(card.uid))return;
  every.add(card.uid);
  bodies.push(card);
  for(const layer of [...(card.stack||[]),...(card.under||[])])visit(layer);
 };
 for(const zone of ZONES)for(const card of player[zone]||[])visit(card);
 for(const line of ['front','energy'])for(const card of player[line]||[])visit(card);
 return bodies;
}
export function ownRemainderIds(pack,state,actor,visible){
 const counts={...(state.initialCounts?.[actor]||{})};
 for(const card of visibleBodies(state.players[actor],visible))
  if(counts[card.cardId])counts[card.cardId]--;
 const ids=[];
 for(const [id,n] of Object.entries(counts))
  for(let i=0;i<n;i++)ids.push(id);
 return ids;
}
export function actorObservation(pack,state,actor){
 const visible=universalPublicView(pack,state,actor);
 delete visible.winner;
 delete visible.seed;
 delete visible.initialCounts;
 delete visible.endReason;
 if(Array.isArray(visible.players)){
  visible.players=visible.players.map((player,index)=>{
   const next={...player};
   delete next.deck;
   delete next.life;
   if(index!==actor)next.hand=null;
   return next;
  });
 }
 let privateView=null;
 try{
  const raw=universalPrivateChoices(pack,state,actor);
  if(raw&&typeof raw==='object'){
   privateView={kind:raw.kind};
   if(Array.isArray(raw.inspected)){
    privateView.inspected=raw.inspected
     .filter(card=>card&&typeof card.uid==='string'&&typeof card.cardId==='string')
     .map(card=>({uid:card.uid,cardId:card.cardId}));
   }
  }
 }catch{privateView=null;}
 return {visible,private:privateView};
}
export function packOf(pack,owner){
 return PACKS(pack)[owner];
}
function syncHidden(value,byUid){
 if(!value||typeof value!=='object')return;
 if(typeof value.uid==='string'&&typeof value.cardId==='string'&&byUid.has(value.uid))
  value.cardId=byUid.get(value.uid);
 const list=Array.isArray(value)?value:Object.values(value);
 for(const item of list)if(item&&typeof item==='object')syncHidden(item,byUid);
}
// Replace every hidden card id. The replacement list is chosen by the caller
// and must not be derived from the ids being overwritten.
export function applyHiddenIds(state,visible,assignments){
 for(let p=0;p<2;p++){
  const slots=hiddenSlots(state.players[p],visible);
  const ids=assignments[p];
  if(!ids||ids.length!==slots.length)return false;
  slots.forEach((card,index)=>{
   card.cardId=ids[index];
   delete card.chantName;
  });
 }
 const byUid=new Map();
 for(const player of state.players)for(const card of allBodies(player))byUid.set(card.uid,card.cardId);
 if(state.pending)syncHidden(state.pending,byUid);
 return true;
}
export function viewerCard(state,viewer,uid){
 if(!uid)return null;
 const me=state.players[viewer];
 const opp=state.players[1-viewer];
 for(const card of me.hand||[])if(card?.uid===uid)return card;
 for(const line of ['front','energy']){
  for(const card of me[line]||[])if(card?.uid===uid)return card;
  for(const card of opp[line]||[])if(card?.uid===uid)return card;
 }
 for(const card of [...(me.outside||[]),...(opp.outside||[]),...(me.removed||[]),...(opp.removed||[])])
  if(card?.uid===uid)return card;
 return null;
}
