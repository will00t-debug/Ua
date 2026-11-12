// The standing-shift lethal used to compare Node and the browser entry.
// The attack ban is a fixture, not a printed effect.
import assert from 'node:assert/strict';
import {officialV2Pack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=officialV2Pack('bleach');
function deck(extra){
 const counts={...extra};
 let total=Object.values(counts).reduce((sum,n)=>sum+n,0);
 const triggers={final:0,color:0,special:0,draw:0};
 for(const [id,n] of Object.entries(counts)){
  const trigger=pack.cards[id]?.trigger;
  if(triggers[trigger]!==undefined)triggers[trigger]+=n;
 }
 for(const card of Object.values(pack.cards).filter(item=>!counts[item.id]).sort((a,b)=>a.energy-b.energy||a.id.localeCompare(b.id))){
  if(total>=50)break;
  if(triggers[card.trigger]!==undefined&&triggers[card.trigger]>=4)continue;
  const room=triggers[card.trigger]!==undefined?4-triggers[card.trigger]:4;
  const n=Math.min(card.maxCopies||4,50-total,room);
  if(n<=0)continue;
  counts[card.id]=n;
  total+=n;
  if(triggers[card.trigger]!==undefined)triggers[card.trigger]+=n;
 }
 const issues=validateUniversalDeck(pack,counts);
 if(issues.length)throw Error(issues.join('; '));
 return counts;
}
function take(state,player,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=state.players[player][zone];
  if(!list)continue;
  const index=list.findIndex(card=>card?.cardId===id);
  if(index>=0)return list.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function place(state,player,card,line,slot){
 card.ready=true;
 card.fieldEntryStamp=state.nextFieldEntryStamp++;
 state.players[player][line][slot]=card;
}
function setLife(state,player,n){
 while(state.players[player].life.length>n)state.players[player].deck.push(state.players[player].life.pop());
}
function clearHand(state,player){
 for(const card of [...state.players[player].hand])state.players[player].deck.push(card);
 state.players[player].hand.length=0;
}
export function openLethalShift(actor,{rested=false,ban=false}={}){
 const local=deck({'BLC-4-060':2,'BLC-4-070':2,'BLC-1-083':4,'BLC-1-037':2});
 const packs=[pack,pack];
 let state=newUniversalMatch(packs,{decks:[local,local],seed:11,first:0});
 for(let guard=0;guard<80&&state.status==='playing';guard++){
  if(state.active===actor&&state.phase==='main'&&!state.pending&&state.players[actor].ownTurns>=2)break;
  const legal=legalUniversalActions(packs,state);
  const action=legal.find(item=>item.type==='next')||legal.find(item=>item.type==='extraDraw')||legal[0];
  state=dispatchUniversalAction(packs,state,action);
 }
 assert.equal(state.active,actor);
 assert.equal(state.phase,'main');
 assert.equal(state.pending,null);
 const foe=1-actor;
 for(const seat of [actor,foe])for(const line of ['front','energy'])for(let slot=0;slot<4;slot++){
  const card=state.players[seat][line][slot];
  if(!card)continue;
  card.ready=false;
  card.fieldEntryStamp=null;
  state.players[seat].deck.push(card);
  state.players[seat][line][slot]=null;
 }
 const aizen=take(state,actor,'BLC-4-060');
 const fronts=[take(state,actor,'BLC-4-070'),take(state,actor,'BLC-1-083')];
 place(state,actor,aizen,'energy',0);
 aizen.ready=!rested;
 place(state,actor,fronts[0],'front',0);
 place(state,actor,fronts[1],'front',1);
 if(ban){
  const until={player:actor,phase:'start',edge:'start'};
  for(const body of fronts)grantContinuousState(state,{
   kind:'cannotAttack',controller:actor,sourceUid:aizen.uid,targetUid:body.uid,until,sourceLinked:false
  });
 }
 setLife(state,actor,5);
 setLife(state,foe,1);
 const quiet=take(state,foe,'BLC-1-037');
 state.players[foe].deck.push(state.players[foe].life[0]);
 state.players[foe].life[0]=quiet;
 assert.equal(pack.cards[quiet.cardId].trigger,null);
 for(const card of state.players[actor].apCards)card.ready=false;
 clearHand(state,actor);
 clearHand(state,foe);
 assert.equal(assertUniversalMatch(packs,state),true);
 assert.equal(state.players[actor].apCards.filter(card=>card.ready).length,0);
 assert.equal(state.players[foe].front.some(Boolean),false);
 return {packs,state,actor,aizen,fronts};
}
