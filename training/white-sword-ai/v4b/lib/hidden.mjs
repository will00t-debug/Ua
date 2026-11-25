// Information-set sample. Public cards stay in place. Hidden cards are
// reshuffled across the hidden zones, and both branches of a pair share one sample.
import {cloneMatch} from '../../../../dist/universal-v2/ai-v3/opening.mjs';
import {mulberry32} from '../../v4a/lib/evolve.mjs';

function shuffle(list,rng){
 for(let index=list.length-1;index>0;index--){
  const swap=Math.floor(rng()*(index+1));
  const card=list[index];
  list[index]=list[swap];
  list[swap]=card;
 }
}
function hiddenSlot(card,zone){
 if(!card)return false;
 if(zone==='hand')return true;
 return card.faceDown!==false;
}
// An open top window has already shown those cards. Shuffling them out of
// order makes the resumed choice illegal, so they stay while the rest moves.
function windowPin(state){
 const pending=state?.pending;
 if(pending?.kind!=='effect-top-filter-many-choice')return null;
 const selected=new Set(pending.selected||[]);
 return {
  player:pending.player,
  deck:(pending.uids||[]).filter(uid=>!selected.has(uid)),
  hand:pending.selected||[]
 };
}
function redeal(player,zones,rng,pin){
 const deckPin=new Set(pin?.deck||[]);
 const handPin=new Set(pin?.hand||[]);
 const slots=[];
 const pool=[];
 for(const zone of zones){
  const cards=(player[zone]||[]).slice();
  player[zone]=cards;
  for(let index=0;index<cards.length;index++){
   const card=cards[index];
   if(!hiddenSlot(card,zone))continue;
   if(zone==='deck'&&deckPin.has(card?.uid))continue;
   if(zone==='hand'&&handPin.has(card?.uid))continue;
   slots.push({zone,index,faceDown:card?.faceDown??true});
   pool.push(card);
  }
 }
 shuffle(pool,rng);
 slots.forEach((slot,index)=>{
  const card=pool[index];
  if(card)card.faceDown=slot.faceDown;
  player[slot.zone][slot.index]=card;
 });
}
export function sampleHidden(state,actor,seed){
 if(actor!==0&&actor!==1)throw Error('hidden sample needs the acting seat');
 const next=cloneMatch(state);
 const rng=mulberry32(seed>>>0);
 const pin=windowPin(next);
 redeal(next.players[actor],['deck','life'],rng,pin?.player===actor?pin:null);
 redeal(next.players[1-actor],['hand','deck','life'],rng,pin?.player===1-actor?pin:null);
 return next;
}
export function publicBoard(state){
 return state.players.map(player=>({
  hand:player.hand?.length||0,
  deck:player.deck?.length||0,
  life:player.life?.length||0,
  front:(player.front||[]).map(card=>card?.uid||null),
  energy:(player.energy||[]).map(card=>card?.uid||null)
 }));
}
