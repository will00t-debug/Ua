import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalImpact,universalImpactNull}
 from '../dist/universal-v2/engine.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {noteKmr2Zone} from '../dist/universal-v2/kmr2-runtime.mjs';

const pack=createKmrBattlePack();
const packs=[pack,pack];

function fill(required,extra={}){
 const fillers=Object.values(pack.cards).filter(card=>!required.includes(card.id)&&
  !['special','color','final'].includes(card.trigger)).map(card=>card.id).sort();
 const caps={special:0,color:0,final:0},counts={...extra};
 for(const id of [...new Set(required)]){
  if(counts[id])continue;
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(Object.prototype.hasOwnProperty.call(caps,trigger)){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(pack.cards[id].maxCopies||4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 return counts;
}
function fresh(counts,first=0){
 return newUniversalMatch(packs,{decks:[counts,counts],seed:12,first});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(card=>card.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function park(s,p){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
}
function ready(s){
 s.pending=null;s.phase='main';
 for(const ap of s.players[s.active].apCards){ap.inPlay=true;ap.ready=true;}
}
function legal(s){return legalUniversalActions(packs,s);}
function act(s,pred){
 const action=legal(s).find(pred);
 assert.ok(action, 'missing action');
 return dispatchUniversalAction(packs,s,action);
}
function click(s,pred){
 const pool=s.pending?.actions?.length?s.pending.actions:legal(s);
 const action=pool.find(pred);
 assert.ok(action, 'missing choice');
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,pred){
 return act(s,action=>(action.type==='play'||action.type==='event')&&action.uid===uid&&(!pred||pred(action)));
}
function raidOnto(s,uid,baseUid){
 return act(s,action=>action.type==='raid'&&action.uid===uid&&action.baseUid===baseUid);
}
function yellow(s){
 for(const [id,slot] of [['KMR-2-004',0],['KMR-2-014',1],['KMR-2-018',2]])
  put(s,0,id,'energy',slot,true);
}
function bluePay(s,need){
 const gens=[['KMR-2-025',2],['KMR-2-040',2],['KMR-2-028',1],['KMR-2-036',1]];
 let slot=0,have=0;
 for(const [id,gen] of gens){
  if(have>=need)break;
  put(s,0,id,'energy',slot,true);
  have+=gen;slot++;
 }
}

test('KMR-2-012 plays a hand Gochizo onto energy only while the raid frame is live',()=>{
 const counts=fill(['KMR-2-012','KMR-2-004','KMR-2-014','KMR-2-018','KMR-2-008','KMR-2-013']);
 const paid=fresh(counts);
 yellow(paid);
 const base=put(paid,0,'KMR-2-008','front',0,true);
 const food=take(paid,0,'KMR-2-013');
 const rider=take(paid,0,'KMR-2-012');
 park(paid,0);
 paid.players[0].hand.push(rider,food);
 ready(paid);
 let state=raidOnto(paid,rider.uid,base.uid);
 assert.equal(state.pending?.id,'KMR-2-012');
 assert.equal(state.pending.step,'deployPick');
 assert.equal(state.pending.actions.some(action=>action.uid===food.uid),true);
 assert.equal(state.pending.actions.some(action=>action.line==='front'),false);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===food.uid),true);
 const top=state.players[0].front.find(card=>card?.cardId==='KMR-2-012');
 assert.equal(top.ready,true);
 assert.equal((top.stack||[]).some(card=>card.uid===base.uid),true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:top.uid});
 assert.equal(state.pending?.id,'KMR-2-012');
 assert.equal(state.pending.step,'deployPick');
 const before=state.players[0].energy.filter(Boolean).length;
 state=click(state,action=>action.uid===food.uid);
 state=click(state,action=>action.line==='energy');
 assert.equal(state.pending?.kind==='block'||state.pending==null||state.pending?.kind==='block',true);
 const entered=state.players[0].energy.find(card=>card?.uid===food.uid);
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.equal(state.players[0].energy.filter(Boolean).length,before+1);
 assertUniversalMatch(packs,state);

 const ordinary=fresh(counts);
 yellow(ordinary);
 const snack=take(ordinary,0,'KMR-2-013');
 const body=take(ordinary,0,'KMR-2-012');
 park(ordinary,0);
 ordinary.players[0].hand.push(body,snack);
 ready(ordinary);
 state=play(ordinary,body.uid,action=>action.line==='front');
 assert.notEqual(state.pending?.id,'KMR-2-012');
 assert.equal(state.players[0].hand.some(card=>card.uid===snack.uid),true);
 assert.equal(state.players[0].front.some(card=>card?.cardId==='KMR-2-012'),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-014 enters active from hand',()=>{
 const s=fresh(fill(['KMR-2-014','KMR-2-004','KMR-2-018']));
 put(s,0,'KMR-2-004','energy',0,true);
 put(s,0,'KMR-2-018','energy',1,true);
 const field=take(s,0,'KMR-2-014');
 park(s,0);
 s.players[0].hand.push(field);
 ready(s);
 const state=play(s,field.uid,action=>action.line==='energy');
 const placed=state.players[0].energy.find(card=>card?.uid===field.uid);
 assert.ok(placed);
 assert.equal(placed.ready,true);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-018 draws before discarding, and the reveal draws two only after a legal card is shown',()=>{
 const counts=fill(['KMR-2-018','KMR-2-004','KMR-2-014','KMR-2-030','KMR-2-005','KMR-2-010']);
 const draw=fresh(counts);
 put(draw,0,'KMR-2-004','energy',0,true);
 put(draw,0,'KMR-2-014','energy',1,true);
 const rider=take(draw,0,'KMR-2-018');
 const spare=take(draw,0,'KMR-2-010');
 park(draw,0);
 draw.players[0].hand.push(rider,spare);
 ready(draw);
 const deck=draw.players[0].deck.length;
 let state=play(draw,rider.uid,action=>action.line==='front');
 assert.equal(state.pending?.step,'mode');
 state=click(state,action=>action.key==='draw');
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.pending?.step,'discard');
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),false);
 const tossed=state.players[0].hand.find(card=>card.uid!==spare.uid)||spare;
 const hand=state.players[0].hand.length;
 state=click(state,action=>action.uid===tossed.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,hand-1);
 assert.equal(state.players[0].outside.filter(card=>card.uid===tossed.uid).length,1);
 assertUniversalMatch(packs,state);

 const shown=fresh(counts);
 put(shown,0,'KMR-2-004','energy',0,true);
 put(shown,0,'KMR-2-014','energy',1,true);
 const body=take(shown,0,'KMR-2-018');
 const legalCard=take(shown,0,'KMR-2-030');
 const yellowRaid=take(shown,0,'KMR-2-005');
 park(shown,0);
 shown.players[0].hand.push(body,legalCard,yellowRaid);
 ready(shown);
 const before=shown.players[0].deck.length;
 state=play(shown,body.uid,action=>action.line==='front');
 state=click(state,action=>action.key==='raid');
 assert.equal(state.pending?.step,'revealHand');
 assert.equal(state.pending.actions.some(action=>action.uid===legalCard.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===yellowRaid.uid),false);
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck.length,before);
 assert.equal(state.players[0].hand.some(card=>card.uid===legalCard.uid),true);
 assertUniversalMatch(packs,state);

 const taken=fresh(counts);
 put(taken,0,'KMR-2-004','energy',0,true);
 put(taken,0,'KMR-2-014','energy',1,true);
 const host=take(taken,0,'KMR-2-018');
 const reveal=take(taken,0,'KMR-2-030');
 park(taken,0);
 taken.players[0].hand.push(host,reveal);
 ready(taken);
 const top=taken.players[0].deck.length;
 state=play(taken,host.uid,action=>action.line==='front');
 state=click(state,action=>action.key==='raid');
 state=click(state,action=>action.uid===reveal.uid);
 assert.equal(state.publicReveals.some(entry=>entry.uid===reveal.uid),true);
 assert.equal(state.players[0].deck.length,top-2);
 assert.equal(state.players[0].hand.some(card=>card.uid===reveal.uid),true);
 assert.equal(state.pending?.step,'discard');
 const discard=state.players[0].hand[0];
 state=click(state,action=>action.uid===discard.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.filter(card=>card.uid===discard.uid).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-019 recovers any number from outside and plays one onto the front while raided',()=>{
 const counts=fill(['KMR-2-019','KMR-2-004','KMR-2-008','KMR-2-014','KMR-2-018','KMR-1-010','KMR-2-030','KMR-2-034','KMR-2-005']);
 const raided=fresh(counts);
 for(const [id,slot] of [['KMR-2-004',0],['KMR-2-008',1],['KMR-2-014',2],['KMR-2-018',3]])
  put(raided,0,id,'energy',slot,true);
 const base=put(raided,0,'KMR-1-010','front',0,true);
 const blue=take(raided,0,'KMR-2-030');
 const magnet=take(raided,0,'KMR-2-034');
 const yellow=take(raided,0,'KMR-2-005');
 const rider=take(raided,0,'KMR-2-019');
 park(raided,0);
 raided.players[0].outside.push(blue,magnet,yellow);
 raided.players[0].hand.push(rider);
 ready(raided);
 let state=raidOnto(raided,rider.uid,base.uid);
 assert.equal(state.pending?.id,'KMR-2-019');
 assert.equal(state.pending.step,'takeMany');
 assert.equal(state.pending.actions.some(action=>action.uid===blue.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===magnet.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===yellow.uid),false);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(card=>card.uid===blue.uid),true);
 assertUniversalMatch(packs,state);

 const again=fresh(counts);
 for(const [id,slot] of [['KMR-2-004',0],['KMR-2-008',1],['KMR-2-014',2],['KMR-2-018',3]])
  put(again,0,id,'energy',slot,true);
 const host=put(again,0,'KMR-1-010','front',0,true);
 const first=take(again,0,'KMR-2-030');
 const second=take(again,0,'KMR-2-034');
 const body=take(again,0,'KMR-2-019');
 park(again,0);
 again.players[0].outside.push(first,second);
 again.players[0].hand.push(body);
 ready(again);
 state=raidOnto(again,body.uid,host.uid);
 state=click(state,action=>action.uid===first.uid);
 state=click(state,action=>action.uid===second.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.filter(card=>card.uid===first.uid||card.uid===second.uid).length,2);
 const ohma=state.players[0].front.find(card=>card?.cardId==='KMR-2-019');
 state=act(state,action=>action.uid===ohma.uid&&String(action.mode).includes('KMR-2-019'));
 assert.equal(state.pending?.step,'deployPick');
 state=click(state,action=>action.uid===first.uid);
 state=click(state,action=>action.line==='front');
 const played=state.players[0].front.find(card=>card?.uid===first.uid);
 assert.ok(played);
 assert.equal(played.ready,true);
 assert.equal(state.players[0].hand.some(card=>card.uid===second.uid),true);
 assert.equal(legal(state).some(action=>action.uid===ohma.uid&&String(action.mode).includes('KMR-2-019')),false);
 assertUniversalMatch(packs,state);

 const plain=fresh(counts);
 for(const [id,slot] of [['KMR-2-004',0],['KMR-2-008',1],['KMR-2-014',2],['KMR-2-018',3]])
  put(plain,0,id,'energy',slot,true);
 const kept=take(plain,0,'KMR-2-030');
 const normal=take(plain,0,'KMR-2-019');
 park(plain,0);
 plain.players[0].outside.push(kept);
 plain.players[0].hand.push(normal);
 ready(plain);
 state=play(plain,normal.uid,action=>action.type==='play'&&action.line==='front');
 assert.notEqual(state.pending?.id,'KMR-2-019');
 assert.equal(state.players[0].outside.some(card=>card.uid===kept.uid),true);
 assert.equal(legal(state).some(action=>String(action.mode||'').includes('KMR-2-019')),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-024 may move a non-Ankh OOO to removed and then add an energy-0 Ankh',()=>{
 const counts=fill(['KMR-2-024','KMR-1-034','KMR-2-026','KMR-2-019'],1);
 const skipped=fresh(counts);
 const rider=put(skipped,0,'KMR-2-024','front',0,true);
 const ooo=take(skipped,0,'KMR-1-034');
 const ankh=take(skipped,0,'KMR-2-026');
 skipped.players[0].outside.push(ooo,ankh);
 const winner=put(skipped,1,'KMR-2-019','front',0,true);
 ready(skipped);
 skipped.active=1;
 let state=act(skipped,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:winner.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:rider.uid});
 assert.equal(state.pending?.id,'KMR-2-024');
 assert.equal(state.pending.step,'removed');
 assert.equal(state.pending.actions.some(action=>action.uid===ankh.uid),false);
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(card=>card.uid===ooo.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===ankh.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===rider.uid),true);
 assertUniversalMatch(packs,state);

 const paid=fresh(counts);
 const body=put(paid,0,'KMR-2-024','front',0,true);
 const combo=take(paid,0,'KMR-1-034');
 const medal=take(paid,0,'KMR-2-026');
 paid.players[0].outside.push(combo,medal);
 const attacker=put(paid,1,'KMR-2-019','front',0,true);
 ready(paid);
 paid.active=1;
 state=act(paid,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:body.uid});
 state=click(state,action=>action.uid===combo.uid);
 assert.equal(state.players[0].removed.some(card=>card.uid===combo.uid),true);
 assert.equal(state.pending?.step,'hand');
 state=click(state,action=>action.uid===medal.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.filter(card=>card.uid===medal.uid).length,1);
 assert.equal(state.players[0].outside.some(card=>card.uid===medal.uid),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-025 adds up to two energy-0 cards and discards only after the second',()=>{
 const counts=fill(['KMR-2-025','KMR-2-013','KMR-2-026','KMR-1-040','KMR-2-010','KMR-2-040','KMR-2-028','KMR-2-036']);
 function board(){
  const s=fresh(counts);
  put(s,0,'KMR-2-040','energy',0,true);
  put(s,0,'KMR-2-028','energy',1,true);
  put(s,0,'KMR-2-036','energy',2,true);
  const rider=take(s,0,'KMR-2-025');
  const field=take(s,0,'KMR-2-013');
  const event=take(s,0,'KMR-2-026');
  const character=take(s,0,'KMR-1-040');
  const costly=take(s,0,'KMR-2-010');
  park(s,0);
  s.players[0].outside.push(field,event,character,costly);
  s.players[0].hand.push(rider);
  ready(s);
  return {s,rider,field,event,character,costly};
 }
 const none=board();
 let state=play(none.s,none.rider.uid,action=>action.line==='front');
 assert.equal(state.pending?.step,'takeTwo');
 assert.equal(state.pending.actions.some(action=>action.uid===none.costly.uid),false);
 state=click(state,action=>action.mode==='skip'||action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,0);
 assert.equal(state.players[0].outside.some(card=>card.uid===none.field.uid),true);
 assertUniversalMatch(packs,state);

 const one=board();
 state=play(one.s,one.rider.uid,action=>action.line==='front');
 state=click(state,action=>action.uid===one.field.uid);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.filter(card=>card.uid===one.field.uid).length,1);
 assert.equal(state.players[0].outside.some(card=>card.uid===one.event.uid),true);
 assertUniversalMatch(packs,state);

 const two=board();
 state=play(two.s,two.rider.uid,action=>action.line==='front');
 state=click(state,action=>action.uid===two.field.uid);
 state=click(state,action=>action.uid===two.event.uid);
 assert.equal(state.pending?.step,'discard');
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),false);
 assert.equal(state.players[0].hand.filter(card=>card.uid===two.field.uid||card.uid===two.event.uid).length,2);
 const tossed=state.players[0].hand[0];
 state=click(state,action=>action.uid===tossed.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.filter(card=>card.uid===tossed.uid).length,1);
 assert.equal(state.players[0].hand.length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-026 rests an OOO from hand only while an OOO is on the energy line, then goes to removed',()=>{
 const counts=fill(['KMR-2-026','KMR-2-024','KMR-1-038','KMR-2-018','KMR-2-004','KMR-2-014']);
 const s=fresh(counts);
 put(s,0,'KMR-2-024','energy',0,true);
 const event=take(s,0,'KMR-2-026');
 const rider=take(s,0,'KMR-1-038');
 park(s,0);
 s.players[0].hand.push(event,rider);
 ready(s);
 let state=play(s,event.uid);
 assert.equal(state.pending?.id,'KMR-2-026');
 assert.equal(state.pending.step,'deployPick');
 assert.equal(state.pending.actions.some(action=>action.uid===rider.uid),true);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].removed.filter(card=>card.uid===event.uid).length,1);
 assert.equal(state.players[0].hand.some(card=>card.uid===rider.uid),true);
 assertUniversalMatch(packs,state);

 const entered=fresh(counts);
 put(entered,0,'KMR-2-024','energy',0,true);
 const medal=take(entered,0,'KMR-2-026');
 const body=take(entered,0,'KMR-1-038');
 park(entered,0);
 entered.players[0].hand.push(medal,body);
 ready(entered);
 state=play(entered,medal.uid);
 state=click(state,action=>action.uid===body.uid);
 state=click(state,action=>action.line==='front'||action.line==='energy');
 const placed=state.players[0].front.find(card=>card?.uid===body.uid)||
  state.players[0].energy.find(card=>card?.uid===body.uid);
 assert.ok(placed);
 assert.equal(placed.ready,false);
 assert.equal(state.players[0].removed.filter(card=>card.uid===medal.uid).length,1);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const frontOnly=fresh(counts);
 put(frontOnly,0,'KMR-2-024','front',0,true);
 const blocked=take(frontOnly,0,'KMR-2-026');
 park(frontOnly,0);
 frontOnly.players[0].hand.push(blocked);
 ready(frontOnly);
 // Printed gate is the energy line. A front オーズ does not make the event legal.
 assert.equal(legal(frontOnly).some(action=>action.type==='event'&&action.uid===blocked.uid),false);
 assert.equal(frontOnly.players[0].hand.some(card=>card.uid===blocked.uid),true);
 assertUniversalMatch(packs,frontOnly);

 const marked=fresh(counts);
 put(marked,0,'KMR-2-004','energy',0,true);
 put(marked,0,'KMR-2-014','energy',1,true);
 const gates=take(marked,0,'KMR-2-018');
 const medalCard=take(marked,0,'KMR-2-026');
 park(marked,0);
 marked.players[0].hand.push(gates,medalCard);
 ready(marked);
 state=play(marked,gates.uid,action=>action.line==='front');
 state=click(state,action=>action.key==='draw');
 state=click(state,action=>action.uid===medalCard.uid);
 assert.equal(state.players[0].outside.find(card=>card.uid===medalCard.uid).kmr2AsEnergy,3);
 assertUniversalMatch(packs,state);
});

test('KMR-2-027 readies up to two AP cards and can stop after one',()=>{
 const s=fresh(fill(['KMR-2-027','KMR-2-040','KMR-2-028','KMR-2-036']));
 put(s,0,'KMR-2-040','energy',0,true);
 put(s,0,'KMR-2-028','energy',1,true);
 put(s,0,'KMR-2-036','energy',2,true);
 const event=take(s,0,'KMR-2-027');
 park(s,0);
 s.players[0].hand.push(event);
 ready(s);
 const aps=s.players[0].apCards;
 for(const ap of aps)ap.ready=true;
 aps[0].ready=false;
 aps[1].ready=false;
 let state=play(s,event.uid);
 const choice=legal(state).find(action=>action.type==='chooseApRecovery'&&action.uid);
 assert.ok(choice);
 state=dispatchUniversalAction(packs,state,choice);
 assert.equal(legal(state).some(action=>action.type==='chooseApRecovery'&&action.uid==null),true);
 state=dispatchUniversalAction(packs,state,legal(state).find(action=>action.type==='chooseApRecovery'&&action.uid==null));
 assert.equal(state.pending,null);
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-030 impact needs three non-Fourze students, and its raid attack can remove all three cards',()=>{
 const counts=fill(['KMR-2-030','KMR-2-032','KMR-2-028','KMR-2-036','KMR-2-040','KMR-2-025','KMR-1-010']);
 const live=fresh(counts);
 const rider=put(live,0,'KMR-2-030','front',0,true);
 assert.equal(universalImpact(pack,live,rider),0);
 put(live,0,'KMR-2-028','energy',2,true);
 put(live,0,'KMR-2-036','front',1,true);
 put(live,0,'KMR-2-040','front',2,true);
 assert.equal(universalImpact(pack,live,rider),1);
 live.active=1;
 assert.equal(universalImpact(pack,live,rider),0);
 assertUniversalMatch(packs,live);

 const attack=fresh(counts);
 bluePay(attack,5);
 const base=put(attack,0,'KMR-2-032','front',0,true);
 const top=take(attack,0,'KMR-2-030');
 park(attack,0);
 attack.players[0].hand.push(top);
 ready(attack);
 let state=raidOnto(attack,top.uid,base.uid);
 assert.equal(state.pending,null);
 const raided=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const wall=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:raided.uid});
 assert.equal(state.pending?.id,'KMR-2-030');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending?.kind,'block');
 assert.equal(state.players[0].front.some(card=>card?.uid===raided.uid),true);
 assertUniversalMatch(packs,state);

 const remove=fresh(counts);
 bluePay(remove,5);
 const under=put(remove,0,'KMR-2-032','front',0,true);
 const cosmicTop=take(remove,0,'KMR-2-030');
 park(remove,0);
 remove.players[0].hand.push(cosmicTop);
 ready(remove);
 state=raidOnto(remove,cosmicTop.uid,under.uid);
 const attacker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const foe=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=click(state,action=>action.uid===foe.uid);
 assert.equal(state.players[0].removed.some(card=>card.uid===attacker.uid),true);
 assert.equal(state.players[0].removed.some(card=>card.uid===under.uid),true);
 assert.equal(state.players[1].removed.some(card=>card.uid===foe.uid),true);
 assert.notEqual(state.pending?.kind,'block');
 while(state.pending?.id==='KMR-2-030'||state.pending?.id==='KMR-2-032'){
  const choice=state.pending.actions.find(action=>action.mode==='skip');
  assert.ok(choice, state.pending.id+' has a decline');
  state=dispatchUniversalAction(packs,state,choice);
 }
 assert.equal(state.players[0].removed.some(card=>card.uid===attacker.uid),true);
 assert.equal(state.players[0].removed.some(card=>card.uid===under.uid),true);
 assert.equal(state.phase,'attack');
 assert.notEqual(state.pending?.kind,'block');
 assertUniversalMatch(packs,state);
});

test('KMR-2-030 re-entry after the attack ends does not open a block',()=>{
 const counts=fill(['KMR-2-030','KMR-2-032','KMR-2-028','KMR-2-036','KMR-2-040','KMR-2-025','KMR-1-010']);
 const remove=fresh(counts);
 bluePay(remove,5);
 const under=put(remove,0,'KMR-2-032','front',0,true);
 const cosmicTop=take(remove,0,'KMR-2-030');
 park(remove,0);
 remove.players[0].hand.push(cosmicTop);
 ready(remove);
 let state=raidOnto(remove,cosmicTop.uid,under.uid);
 const attacker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const foe=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=click(state,action=>action.uid===foe.uid);
 assert.equal(state.phase,'attack');
 let guard=0;
 while(state.pending&&guard++<8){
  const enter=state.pending.actions.find(action=>action.mode==='enter');
  if(enter){
   assert.notEqual(enter.skipOnPlay,true);
   state=dispatchUniversalAction(packs,state,enter);
   break;
  }
  const skip=state.pending.actions.find(action=>action.mode==='skip');
  assert.ok(skip);
  state=dispatchUniversalAction(packs,state,skip);
 }
 assert.equal([...state.players[0].front,...state.players[0].energy].some(card=>card?.uid===attacker.uid),true);
 while(state.pending&&guard++<12){
  const skip=state.pending.actions.find(action=>action.mode==='skip');
  assert.ok(skip, state.pending.id+' has a decline');
  state=dispatchUniversalAction(packs,state,skip);
 }
 assert.notEqual(state.pending?.kind,'block');
 assert.equal(state.phase,'attack');
 assertUniversalMatch(packs,state);
});

function school(s){
 put(s,0,'KMR-2-028','energy',0,true);
 put(s,0,'KMR-2-036','front',1,true);
 put(s,0,'KMR-2-040','front',2,true);
}
function loseBattle(s,attacker,blocker){
 let state=act(s,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:blocker});
 return state;
}
function once(zone,uid){
 return zone.filter(card=>card?.uid===uid).length;
}

test('KMR-2-035 can decline the rested entry after its own effect removes it',()=>{
 const counts=fill(['KMR-2-035','KMR-2-028','KMR-2-036','KMR-2-040','KMR-2-019']);
 const declined=fresh(counts);
 const rider=put(declined,0,'KMR-2-035','front',0,true);
 school(declined);
 const wall=put(declined,1,'KMR-2-019','front',0,true);
 ready(declined);
 let state=loseBattle(declined,rider.uid,wall.uid);
 assert.equal(once(state.players[0].removed,rider.uid),1);
 assert.equal(once(state.players[1].removed,wall.uid),1);
 assert.equal(state.pending?.id,'KMR-2-035');
 assert.equal(state.pending?.step,'enter');
 const skip=state.pending.actions.find(action=>action.mode==='skip');
 assert.ok(skip);
 assert.equal(uiActionLabel(skip,{pack:packs,state}),'不登場，留在移除區');
 for(const enter of state.pending.actions.filter(action=>action.mode==='enter'))
  assert.notEqual(enter.skipOnPlay,true);
 state=dispatchUniversalAction(packs,state,skip);
 assert.equal(once(state.players[0].removed,rider.uid),1);
 assert.equal([...state.players[0].front,...state.players[0].energy].some(card=>card?.uid===rider.uid),false);
 assert.equal(state.pending,null);
 assert.equal(state.phase,'attack');
 assert.notEqual(state.pending?.kind,'block');
 assert.equal(legal(state).some(action=>action.type==='kmr2'&&action.uid===rider.uid),false);
 assertUniversalMatch(packs,state);

 const accepted=fresh(counts);
 const coming=put(accepted,0,'KMR-2-035','front',0,true);
 school(accepted);
 const blocker=put(accepted,1,'KMR-2-019','front',0,true);
 ready(accepted);
 state=loseBattle(accepted,coming.uid,blocker.uid);
 const enter=state.pending.actions.find(action=>action.mode==='enter'&&action.line==='front'&&action.slot===0);
 assert.ok(state.pending.actions.some(action=>action.mode==='skip'));
 assert.ok(enter);
 assert.notEqual(enter.skipOnPlay,true);
 assert.match(uiActionLabel(enter,{pack:packs,state}),/以休息狀態登場/);
 state=dispatchUniversalAction(packs,state,enter);
 const stood=state.players[0].front[0];
 assert.equal(stood?.uid,coming.uid);
 assert.equal(stood.ready,false);
 assert.equal(once(state.players[0].removed,coming.uid),0);
 assert.equal(state.pending?.id,'KMR-2-028');
 assert.equal(state.pending?.step,'payDiscard');
 const readySkip=state.pending.actions.find(action=>action.mode==='skip');
 assert.ok(readySkip);
 state=dispatchUniversalAction(packs,state,readySkip);
 assert.equal(state.players[0].front[0]?.uid,coming.uid);
 assert.equal(state.players[0].front[0].ready,false);
 assert.equal(state.pending,null);
 assert.equal(state.phase,'attack');
 assert.notEqual(state.pending?.kind,'block');
 assertUniversalMatch(packs,state);
});

test('KMR-2-035 entry can resume after the match is paused',()=>{
 const counts=fill(['KMR-2-035','KMR-2-028','KMR-2-036','KMR-2-040','KMR-2-019']);
 const s=fresh(counts);
 const rider=put(s,0,'KMR-2-035','front',0,true);
 school(s);
 const wall=put(s,1,'KMR-2-019','front',0,true);
 ready(s);
 const opened=loseBattle(s,rider.uid,wall.uid);
 assert.equal(opened.pending?.step,'enter');
 const paused=structuredClone(opened);
 const skip=paused.pending.actions.find(action=>action.mode==='skip');
 assert.ok(skip);
 let state=dispatchUniversalAction(packs,paused,skip);
 assert.equal(once(state.players[0].removed,rider.uid),1);
 assert.equal(state.pending,null);
 assert.equal(state.phase,'attack');
 assert.notEqual(state.pending?.kind,'block');
 assert.equal(legal(state).some(action=>action.uid===rider.uid&&action.mode==='enter'),false);
 assert.equal(opened.pending?.step,'enter');
 assert.equal(once(opened.players[0].removed,rider.uid),1);
 const again=structuredClone(opened);
 const enter=again.pending.actions.find(action=>action.mode==='enter'&&action.line==='front'&&action.slot===0);
 assert.ok(enter);
 assert.notEqual(enter.skipOnPlay,true);
 state=dispatchUniversalAction(packs,again,enter);
 assert.equal(state.pending?.id,'KMR-2-028');
 const follow=state.pending.actions.find(action=>action.mode==='skip');
 assert.ok(follow);
 state=dispatchUniversalAction(packs,state,follow);
 assert.equal(state.players[0].front[0]?.uid,rider.uid);
 assert.equal(state.players[0].front[0].ready,false);
 assert.equal(once(state.players[0].removed,rider.uid),0);
 assert.equal(state.pending,null);
 assert.notEqual(state.pending?.kind,'block');
 assert.equal(opened.pending?.step,'enter');
 assertUniversalMatch(packs,state);
 assertUniversalMatch(packs,opened);
});

test('KMR-2-035 can decline when every slot would replace another card',()=>{
 const counts=fill(['KMR-2-035','KMR-2-028','KMR-2-036','KMR-2-040','KMR-2-019','KMR-2-002','KMR-2-010','KMR-2-031']);
 const s=fresh(counts);
 const seen=new Set(['KMR-2-035']);
 for(const line of ['front','energy']){
  for(let slot=0;slot<4;slot++){
   const card=s.players[0].deck.find(item=>pack.cards[item.cardId].type==='character'&&!seen.has(item.cardId));
   seen.add(card.cardId);
   put(s,0,card.cardId,line,slot,true);
  }
 }
 const rider=take(s,0,'KMR-2-035');
 s.players[0].removed.push(rider);
 ready(s);
 const front=s.players[0].front.map(card=>card.uid);
 const energy=s.players[0].energy.map(card=>card.uid);
 noteKmr2Zone(pack,s,{physical:rider,owner:0,from:'front',to:'removed',reason:'own-effect',sourceUid:rider.uid},
  (source,card)=>source.cards[card.cardId]);
 let state=act(s,action=>action.type==='next');
 assert.equal(state.pending?.id,'KMR-2-035');
 assert.equal(state.pending?.step,'enter');
 const enters=state.pending.actions.filter(action=>action.mode==='enter');
 assert.ok(enters.length);
 assert.equal(enters.every(action=>action.replaceUid),true);
 const skip=state.pending.actions.find(action=>action.mode==='skip');
 assert.ok(skip);
 state=dispatchUniversalAction(packs,state,skip);
 assert.equal(once(state.players[0].removed,rider.uid),1);
 assert.deepEqual(state.players[0].front.map(card=>card?.uid),front);
 assert.deepEqual(state.players[0].energy.map(card=>card?.uid),energy);
 assert.equal(state.pending,null);
 assert.notEqual(state.pending?.kind,'block');
 assertUniversalMatch(packs,state);
});

test('KMR-2-031 adds blue energy only on the energy line when three other students are out',()=>{
 const s=fresh(fill(['KMR-2-031','KMR-2-028','KMR-2-036','KMR-2-040']));
 const rider=put(s,0,'KMR-2-031','energy',0,true);
 const printed=pack.cards['KMR-2-031'].gen;
 assert.equal(universalCardEnergy(pack,s,0,rider),printed);
 put(s,0,'KMR-2-028','front',0,true);
 put(s,0,'KMR-2-036','front',1,true);
 put(s,0,'KMR-2-040','energy',1,true);
 assert.equal(universalCardEnergy(pack,s,0,rider),printed+1);
 s.players[0].energy[0]=null;
 s.players[0].front[2]=rider;
 assert.equal(universalCardEnergy(pack,s,0,rider),0);
 assertUniversalMatch(packs,s);
});

test('KMR-2-032 may return from removed to hand after its own effect puts it there',()=>{
 const counts=fill(['KMR-2-032','KMR-2-030','KMR-2-025','KMR-2-040','KMR-2-028','KMR-1-010']);
 const s=fresh(counts);
 bluePay(s,5);
 const base=put(s,0,'KMR-2-032','front',0,true);
 const top=take(s,0,'KMR-2-030');
 park(s,0);
 s.players[0].hand.push(top);
 ready(s);
 let state=raidOnto(s,top.uid,base.uid);
 const attacker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const wall=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=click(state,action=>action.uid===wall.uid);
 assert.equal(state.players[0].removed.some(card=>card.uid===base.uid),true);
 let offer=state.pending;
 assert.equal(offer?.id==='KMR-2-032'||offer?.id==='KMR-2-030',true);
 const seen=new Set();
 while(state.pending&&(state.pending.id==='KMR-2-030'||state.pending.id==='KMR-2-032')){
  seen.add(state.pending.id);
  const skip=state.pending.actions.find(action=>action.mode==='skip');
  if(!skip)break;
  state=dispatchUniversalAction(packs,state,skip);
 }
 assert.equal(seen.has('KMR-2-032'),true);
 assert.equal(state.players[0].removed.some(card=>card.uid===base.uid),true);
 assert.equal(state.players[0].hand.some(card=>card.uid===base.uid),false);
 assertUniversalMatch(packs,state);

 const back=fresh(counts);
 bluePay(back,5);
 const under=put(back,0,'KMR-2-032','front',0,true);
 const cosmic=take(back,0,'KMR-2-030');
 park(back,0);
 back.players[0].hand.push(cosmic);
 ready(back);
 state=raidOnto(back,cosmic.uid,under.uid);
 const striker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const foe=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:striker.uid});
 state=click(state,action=>action.uid===foe.uid);
 if(state.pending?.id==='KMR-2-030')state=click(state,action=>action.mode==='skip');
 state=click(state,action=>action.uid===under.uid);
 assert.equal(state.players[0].hand.filter(card=>card.uid===under.uid).length,1);
 assert.equal(state.players[0].removed.some(card=>card.uid===under.uid),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-034 grants the raid-frame ward and can rest a matching student afterwards',()=>{
 const counts=fill(['KMR-2-034','KMR-2-032','KMR-2-025','KMR-2-040','KMR-2-028','KMR-2-002','KMR-1-010','KMR-2-013']);
 const plain=fresh(counts);
 bluePay(plain,4);
 const body=take(plain,0,'KMR-2-034');
 park(plain,0);
 plain.players[0].hand.push(body);
 ready(plain);
 let state=play(plain,body.uid,action=>action.type==='play');
 assert.notEqual(state.pending?.id,'KMR-2-034');
 assert.equal(state.players[0].front.find(card=>card?.uid===body.uid)?.kmr2ShieldUntil,undefined);
 assertUniversalMatch(packs,state);

 const raided=fresh(counts);
 bluePay(raided,4);
 const base=put(raided,0,'KMR-2-032','front',0,true);
 const magnet=take(raided,0,'KMR-2-034');
 park(raided,0);
 raided.players[0].hand.push(magnet);
 ready(raided);
 state=raidOnto(raided,magnet.uid,base.uid);
 assert.equal(state.pending?.id,'KMR-2-034');
 assert.equal(state.players[0].front.find(card=>card?.cardId==='KMR-2-034').kmr2ShieldUntil>state.players[0].ownTurns,true);
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 const student=take(state,0,'KMR-2-028');
 state.players[0].hand.push(student);
 const host=state.players[0].front.find(card=>card?.cardId==='KMR-2-034');
 state=act(state,action=>action.type==='play'&&action.uid===student.uid&&action.line==='energy');
 const ward=state.players[0].front.find(card=>card?.uid===host.uid);
 assert.equal(Number.isInteger(ward.kmr2ShieldUntil),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-034 raid entry can rest a same-energy student, and that student is not a character target',()=>{
 const counts=fill(['KMR-2-034','KMR-2-032','KMR-2-025','KMR-2-028','KMR-2-036','KMR-2-040','KMR-2-002','KMR-1-010']);
 const pay=fresh(counts);
 put(pay,0,'KMR-2-025','energy',0,true);
 put(pay,0,'KMR-2-028','energy',1,true);
 put(pay,0,'KMR-2-036','energy',2,true);
 const base=put(pay,0,'KMR-2-032','front',0,true);
 const magnet=take(pay,0,'KMR-2-034');
 const pupil=take(pay,0,'KMR-2-040');
 park(pay,0);
 pay.players[0].hand.push(magnet,pupil);
 ready(pay);
 let state=raidOnto(pay,magnet.uid,base.uid);
 assert.equal(state.pending?.step,'energyPick');
 state=click(state,action=>action.uid===state.players[0].energy.find(card=>card?.cardId==='KMR-2-025').uid);
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.pending.actions.some(action=>action.uid===pupil.uid),true);
 state=click(state,action=>action.uid===pupil.uid);
 state=click(state,action=>action.line==='energy');
 const rested=state.players[0].energy.find(card=>card?.uid===pupil.uid);
 assert.ok(rested);
 assert.equal(rested.ready,false);
 assertUniversalMatch(packs,state);

 const guard=fresh(counts);
 put(guard,0,'KMR-2-025','energy',0,true);
 put(guard,0,'KMR-2-028','energy',1,true);
 put(guard,0,'KMR-2-036','energy',2,true);
 const under=put(guard,0,'KMR-2-032','front',0,true);
 const top=take(guard,0,'KMR-2-034');
 park(guard,0);
 guard.players[0].hand.push(top);
 ready(guard);
 state=raidOnto(guard,top.uid,under.uid);
 state=click(state,action=>action.mode==='skip');
 const student=put(state,0,'KMR-2-040','front',1,true);
 const wall=put(state,0,'KMR-1-010','front',2,true);
 const rider=put(state,1,'KMR-2-002','front',0,true);
 rider.ready=true;
 for(let i=0;i<6&&!(state.active===1&&state.phase==='main'&&!state.pending);i++){
  if(state.pending?.actions?.some(action=>action.mode==='skip'))
   state=click(state,action=>action.mode==='skip');
  else state=act(state,action=>action.type==='next');
 }
 assert.equal(state.active,1);
 assert.equal(state.phase,'main');
 state=act(state,action=>action.uid===rider.uid&&String(action.mode||'').includes(':b'));
 const listed=state.pending.actions.map(action=>action.uid);
 assert.equal(listed.includes(student.uid),false);
 assert.equal(listed.includes(wall.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-034 raid entry keeps a student out of a real life trigger choice',()=>{
 function lifeTop(s,id){
  const card=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=card;
  if(buried)s.players[1].deck.push(buried);
  return card;
 }
 function reveal(triggerId,line){
  const counts=fill(['KMR-2-034','KMR-2-032','KMR-2-040','KMR-1-010','KMR-2-025','KMR-2-028','KMR-2-036',triggerId]);
  const s=fresh(counts);
  put(s,0,'KMR-2-025','energy',1,true);
  put(s,0,'KMR-2-036','energy',2,true);
  put(s,0,'KMR-2-028','energy',3,true);
  const base=put(s,0,'KMR-2-032',line,0,true);
  const student=put(s,0,'KMR-2-040','front',line==='front'?1:0,true);
  const other=put(s,0,'KMR-1-010','front',line==='front'?2:1,true);
  const magnet=take(s,0,'KMR-2-034');
  park(s,0);
  s.players[0].hand.push(magnet);
  ready(s);
  let state=act(s,action=>action.type==='raid'&&action.uid===magnet.uid&&
   action.baseUid===base.uid&&(line==='energy'?action.line==='energy':action.line!=='energy'));
  assert.equal(state.pending?.id,'KMR-2-034');
  assert.equal(state.pending?.step,'energyPick');
  state=click(state,action=>action.mode==='skip');
  assert.equal(state.pending,null);
  const host=state.players[0][line].find(card=>card?.uid===magnet.uid);
  assert.ok(host);
  assert.equal(host.kmr2ShieldUntil>state.players[0].ownTurns,true);
  lifeTop(state,triggerId);
  state=act(state,action=>action.type==='next');
  assert.equal(state.phase,'attack');
  const attacker=line==='front'?host:other;
  state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
  assert.equal(state.pending?.kind,'block');
  state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
  assert.equal(state.pending?.kind,'life-trigger');
  assert.equal(state.pending.trigger,pack.cards[triggerId].trigger);
  return {state,student,other,host};
 }
 function chosen(state,mode){
  return legal(state).filter(action=>action.type==='chooseTrigger'&&action.mode===mode)
   .map(action=>action.uid).filter(Boolean);
 }
 const special=reveal('KMR-2-015','front');
 const specialTargets=chosen(special.state,'special');
 assert.equal(specialTargets.includes(special.student.uid),false);
 assert.equal(specialTargets.includes(special.other.uid),true);
 assert.equal(specialTargets.includes(special.host.uid),true);
 assert.throws(()=>dispatchUniversalAction(packs,special.state,{
  type:'chooseTrigger',mode:'special',uid:special.student.uid}),/not currently legal/);
 let retired=dispatchUniversalAction(packs,special.state,{
  type:'chooseTrigger',mode:'special',uid:special.other.uid});
 assert.equal(retired.players[0].front.some(card=>card?.uid===special.other.uid),false);
 assert.equal(retired.players[0].front.some(card=>card?.uid===special.student.uid),true);
 assert.equal(retired.players[0].outside.filter(card=>card.uid===special.other.uid).length,1);
 assertUniversalMatch(packs,retired);

 const color=reveal('KMR-2-011','front');
 const colorTargets=chosen(color.state,'colorRestSkip');
 assert.equal(colorTargets.includes(color.student.uid),false);
 assert.equal(colorTargets.includes(color.other.uid),true);
 assert.equal(colorTargets.includes(color.host.uid),true);
 assert.throws(()=>dispatchUniversalAction(packs,color.state,{
  type:'chooseTrigger',mode:'colorRestSkip',uid:color.student.uid}),/not currently legal/);
 let rested=dispatchUniversalAction(packs,color.state,{
  type:'chooseTrigger',mode:'colorRestSkip',uid:color.other.uid});
 assert.equal(rested.players[0].front.find(card=>card?.uid===color.other.uid).ready,false);
 assert.equal(rested.players[0].front.find(card=>card?.uid===color.student.uid).ready,true);
 assertUniversalMatch(packs,rested);

 const back=reveal('KMR-2-015','energy');
 const energyHost=back.state.players[0].energy.find(card=>card?.uid===back.host.uid);
 assert.ok(energyHost);
 const openTargets=chosen(back.state,'special');
 assert.equal(openTargets.includes(back.student.uid),true);
 assert.equal(openTargets.includes(back.other.uid),true);
 assert.equal(openTargets.includes(energyHost.uid),false);
 assertUniversalMatch(packs,back.state);
});

test('KMR-2-028 may retire itself and discard to ready a Fourze that entered from removed',()=>{
 const counts=fill(['KMR-2-028','KMR-2-030','KMR-2-032','KMR-2-025','KMR-2-040','KMR-2-036','KMR-1-010']);
 function reach(){
  const s=fresh(counts);
  put(s,0,'KMR-2-025','energy',0,true);
  put(s,0,'KMR-2-040','energy',1,true);
  const watcher=put(s,0,'KMR-2-028','energy',2,true);
  const base=put(s,0,'KMR-2-032','front',0,true);
  const top=take(s,0,'KMR-2-030');
  const spare=take(s,0,'KMR-2-036');
  park(s,0);
  s.players[0].hand.push(top,spare);
  ready(s);
  let state=raidOnto(s,top.uid,base.uid);
  const attacker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
  const wall=put(state,1,'KMR-1-010','front',0,true);
  state=act(state,action=>action.type==='next');
  state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
  state=click(state,action=>action.uid===wall.uid);
  while(state.pending&&state.pending.id!=='KMR-2-030'){
   const skip=state.pending.actions.find(action=>action.mode==='skip');
   assert.ok(skip);
   state=dispatchUniversalAction(packs,state,skip);
  }
  assert.equal(state.pending?.id,'KMR-2-030');
  state=click(state,action=>action.mode==='enter'&&action.line==='front');
  assert.equal(state.pending?.id,'KMR-2-028');
  assert.equal(state.pending.step,'payDiscard');
  return {state,watcher,spare,attacker};
 }
 const declined=reach();
 assert.equal(declined.state.pending.actions.some(action=>action.mode==='skip'),true);
 let state=click(declined.state,action=>action.mode==='skip');
 assert.equal(state.players[0].energy.some(card=>card?.uid===declined.watcher.uid),true);
 assert.equal(state.players[0].hand.some(card=>card.uid===declined.spare.uid),true);
 assert.notEqual(state.pending?.id,'KMR-2-028');
 assertUniversalMatch(packs,state);

 const paid=reach();
 state=click(paid.state,action=>action.mode==='pay');
 assert.equal(state.pending?.step,'discard');
 state=click(state,action=>action.uid===paid.spare.uid);
 const entered=state.players[0].front.find(card=>card?.uid===paid.attacker.uid);
 assert.equal(entered.ready,true);
 assert.equal(state.players[0].outside.some(card=>card.uid===paid.watcher.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===paid.spare.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-035 may return to hand when another own effect removes it',()=>{
 const counts=fill(['KMR-2-035','KMR-2-030','KMR-2-025','KMR-2-040','KMR-2-028','KMR-1-010']);
 const s=fresh(counts);
 put(s,0,'KMR-2-025','energy',0,true);
 put(s,0,'KMR-2-040','energy',1,true);
 put(s,0,'KMR-2-028','energy',2,true);
 const base=put(s,0,'KMR-2-035','front',0,true);
 const top=take(s,0,'KMR-2-030');
 park(s,0);
 s.players[0].hand.push(top);
 ready(s);
 let state=raidOnto(s,top.uid,base.uid);
 const attacker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const wall=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 state=click(state,action=>action.uid===wall.uid);
 while(state.pending?.id==='KMR-2-030'){
  const skip=state.pending.actions.find(action=>action.mode==='skip');
  assert.ok(skip);
  state=dispatchUniversalAction(packs,state,skip);
 }
 assert.equal(state.pending?.id,'KMR-2-035');
 assert.equal(state.pending?.step,'toHand');
 const decline=state.pending.actions.find(action=>action.mode==='skip');
 const takeHand=state.pending.actions.find(action=>action.uid===base.uid);
 assert.ok(decline);
 assert.ok(takeHand);
 assert.equal(uiActionLabel(decline,{pack:packs,state}),'不加入手牌');
 state=dispatchUniversalAction(packs,state,decline);
 assert.equal(once(state.players[0].removed,base.uid),1);
 assert.equal(state.players[0].hand.some(card=>card.uid===base.uid),false);
 assertUniversalMatch(packs,state);

 const back=fresh(counts);
 put(back,0,'KMR-2-025','energy',0,true);
 put(back,0,'KMR-2-040','energy',1,true);
 put(back,0,'KMR-2-028','energy',2,true);
 const under=put(back,0,'KMR-2-035','front',0,true);
 const cosmic=take(back,0,'KMR-2-030');
 park(back,0);
 back.players[0].hand.push(cosmic);
 ready(back);
 state=raidOnto(back,cosmic.uid,under.uid);
 const striker=state.players[0].front.find(card=>card?.cardId==='KMR-2-030');
 const foe=put(state,1,'KMR-1-010','front',0,true);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:striker.uid});
 state=click(state,action=>action.uid===foe.uid);
 while(state.pending?.id==='KMR-2-030'){
  const skip=state.pending.actions.find(action=>action.mode==='skip');
  assert.ok(skip);
  state=dispatchUniversalAction(packs,state,skip);
 }
 assert.equal(state.pending?.id,'KMR-2-035');
 const keep=state.pending.actions.find(action=>action.mode==='skip');
 assert.ok(keep);
 state=click(state,action=>action.uid===under.uid);
 assert.equal(state.players[0].hand.filter(card=>card.uid===under.uid).length,1);
 assert.equal(state.players[0].removed.some(card=>card.uid===under.uid),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-037 draws one and then discards one',()=>{
 const s=fresh(fill(['KMR-2-037','KMR-2-010','KMR-2-028']));
 put(s,0,'KMR-2-028','energy',0,true);
 const rider=take(s,0,'KMR-2-037');
 const top=take(s,0,'KMR-2-010');
 park(s,0);
 s.players[0].deck.unshift(top);
 s.players[0].hand.push(rider);
 ready(s);
 const deck=s.players[0].deck.length;
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.pending?.kind==='effect-discard'||state.pending?.step==='discard'||state.players[0].hand.some(card=>card.uid===top.uid),true);
 const drawn=state.players[0].hand.find(card=>card.uid===top.uid);
 assert.ok(drawn);
 if(state.pending){
  const action=(state.pending.actions||legal(state)).find(choice=>choice.uid===top.uid);
  assert.ok(action);
  state=dispatchUniversalAction(packs,state,action);
 }
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.filter(card=>card.uid===top.uid).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-038 loses impact and gains BP only on its turn with three other students',()=>{
 const counts=fill(['KMR-2-038','KMR-2-028','KMR-2-029','KMR-2-040','KMR-2-019','KMR-2-006']);
 const s=fresh(counts);
 const rider=put(s,0,'KMR-2-038','front',0,true);
 const printed=universalBp(pack,s,rider);
 put(s,0,'KMR-2-028','energy',0,true);
 put(s,0,'KMR-2-029','energy',1,true);
 put(s,0,'KMR-2-040','energy',2,true);
 assert.equal(universalBp(pack,s,rider),printed+1000);
 s.active=1;
 assert.equal(universalBp(pack,s,rider),printed);
 s.active=0;
 const foe=fresh(counts,1);
 const soft=put(foe,0,'KMR-2-038','front',0,true);
 const winner=put(foe,1,'KMR-2-019','front',0,true);
 const buried=take(foe,1,'KMR-2-006');
 buried.faceDown=false;buried.stack=[];buried.under=[];
 winner.stack=[buried];
 ready(foe);
 const life=foe.players[0].life.length;
 let state=act(foe,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:winner.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:soft.uid});
 assert.equal(universalImpactNull(pack,state,soft),true);
 assert.equal(state.players[0].life.length,life);
 assertUniversalMatch(packs,state);
});

test('KMR-2-039 can take the one card when the attack is not blocked',()=>{
 const counts=fill(['KMR-2-039','KMR-2-028','KMR-2-029','KMR-2-032','KMR-1-010']);
 const s=fresh(counts);
 const rider=put(s,0,'KMR-2-039','front',0,true);
 const under=take(s,0,'KMR-2-029');
 under.faceDown=false;under.stack=[];under.under=[];
 rider.stack=[under];
 put(s,0,'KMR-2-028','energy',0,true);
 put(s,0,'KMR-2-032','energy',1,true);
 put(s,1,'KMR-1-010','front',0,true);
 ready(s);
 const hand=s.players[0].hand.length;
 let state=act(s,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:rider.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(state.pending?.id,'KMR-2-039');
 state=click(state,action=>action.mode==='draw');
 assert.equal(state.players[0].hand.length,hand+1);
 assert.equal(state.pending?.id==='KMR-2-039',false);
 assert.equal(state.mainAbilityUsedUids.includes(rider.uid+'|039'),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-040 may leave energy at attack end, and its main marks one Fourze',()=>{
 const counts=fill(['KMR-2-040','KMR-2-032','KMR-2-019','KMR-1-010']);
 const stay=fresh(counts);
 const rider=put(stay,0,'KMR-2-040','energy',0,true);
 ready(stay);
 let state=act(stay,action=>action.type==='next');
 assert.equal(state.phase,'attack');
 state=act(state,action=>action.type==='next');
 if(state.pending?.id==='KMR-2-040'){
  state=click(state,action=>action.mode==='skip');
 }
 assert.equal(state.players[0].energy.some(card=>card?.uid===rider.uid),true);
 assertUniversalMatch(packs,state);

 const move=fresh(counts);
 const body=put(move,0,'KMR-2-040','energy',0,true);
 ready(move);
 state=act(move,action=>action.type==='next');
 state=act(state,action=>action.type==='next');
 assert.equal(state.pending?.id,'KMR-2-040');
 state=click(state,action=>action.mode==='deploy'||action.uid===body.uid);
 assert.equal(state.players[0].front.some(card=>card?.uid===body.uid),true);
 assert.equal(state.players[0].energy.some(card=>card?.uid===body.uid),false);
 assertUniversalMatch(packs,state);

 const grant=fresh(counts);
 const marker=put(grant,0,'KMR-2-040','front',0,true);
 const fourze=put(grant,0,'KMR-2-032','front',1,true);
 const winner=put(grant,1,'KMR-2-019','front',0,true);
 ready(grant);
 state=act(grant,action=>action.uid===marker.uid);
 state=click(state,action=>action.uid===fourze.uid);
 assert.equal(state.players[0].front.find(card=>card?.uid===fourze.uid).kmr2LoseRemove?.turn,state.turn);
 assert.equal(state.players[0].front.find(card=>card?.uid===marker.uid).ready,false);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:fourze.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:winner.uid});
 assert.equal(state.kmr2LastBattle?.attackerWon,false);
 while(state.pending&&(state.pending.id==='KMR-2-032'||state.pending.id==='KMR-2-040')){
  const skip=state.pending.actions.find(action=>action.mode==='skip');
  if(!skip)break;
  state=dispatchUniversalAction(packs,state,skip);
 }
 assert.equal(state.players[0].front.some(card=>card?.uid===fourze.uid),false);
 assert.equal(state.players[1].front.some(card=>card?.uid===winner.uid),false);
 assert.equal(state.players[0].removed.some(card=>card.uid===fourze.uid),true);
 assert.equal(state.players[1].removed.some(card=>card.uid===winner.uid),true);
 assertUniversalMatch(packs,state);

 const direct=fresh(counts);
 const markerDirect=put(direct,0,'KMR-2-040','front',0,true);
 const directRider=put(direct,0,'KMR-2-032','front',1,true);
 put(direct,1,'KMR-1-010','front',0,true);
 ready(direct);
 state=act(direct,action=>action.uid===markerDirect.uid);
 state=click(state,action=>action.uid===directRider.uid);
 state=act(state,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:directRider.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(state.players[0].front.some(card=>card?.uid===directRider.uid),true);
 assert.equal(state.players[0].removed.some(card=>card.uid===directRider.uid),false);
 assertUniversalMatch(packs,state);
});

test('life checks for KMR-2-026 through KMR-2-040 open the printed trigger',()=>{
 const attackerId='KMR-1-010';
 function reveal(id){
  const s=fresh(fill([id,attackerId]));
  const attacker=put(s,0,attackerId,'front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;
  s.players[1].deck.push(buried);
  ready(s);
  let state=act(s,action=>action.type==='next');
  state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
  state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
  return {state,trigger,attacker};
 }
 for(const card of KMR2_CARDS.filter(item=>{
  const n=Number(item.id.slice(6));
  return n>=26&&n<=40;
 })){
  if(!card.trigger){
   const opened=reveal(card.id);
   assert.equal(opened.state.pending?.kind==='life-trigger',false,card.id);
   assert.equal(opened.state.players[1].outside.filter(item=>item.uid===opened.trigger.uid).length,1,card.id);
   continue;
  }
  if(card.trigger==='final')continue;
  const opened=reveal(card.id);
  assert.equal(opened.state.pending?.trigger,card.trigger,card.id);
  const skipped=dispatchUniversalAction(packs,opened.state,{type:'chooseTrigger',mode:'skip'});
  assert.equal(skipped.players[1].outside.filter(item=>item.uid===opened.trigger.uid).length,1,card.id);
  assertUniversalMatch(packs,skipped);
 }
 const active=reveal('KMR-2-026');
 const mine=put(active.state,1,attackerId,'front',0,false);
 let state=dispatchUniversalAction(packs,active.state,{type:'chooseTrigger',mode:'active',uid:mine.uid});
 assert.equal(state.players[1].front.find(card=>card?.uid===mine.uid).ready,true);
 assert.equal(universalBp(pack,state,state.players[1].front.find(card=>card?.uid===mine.uid)),4000);
 const color=reveal('KMR-2-035');
 state=dispatchUniversalAction(packs,color.state,{type:'chooseTrigger',mode:'colorBounce',uid:color.attacker.uid});
 assert.equal(state.players[0].hand.some(card=>card.uid===color.attacker.uid),true);
 assert.equal(state.players[0].front.some(card=>card?.uid===color.attacker.uid),false);
 const finalLife=fresh(fill(['KMR-2-027',attackerId]));
 const finalAttacker=put(finalLife,0,attackerId,'front',0,true);
 const finalCard=take(finalLife,1,'KMR-2-027');
 finalLife.players[1].deck.push(...finalLife.players[1].life.splice(0));
 finalLife.players[1].life.push(finalCard);
 ready(finalLife);
 const top=finalLife.players[1].deck[0];
 state=act(finalLife,action=>action.type==='next');
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:finalAttacker.uid});
 state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:null});
 assert.equal(state.pending?.trigger,'final');
 state=dispatchUniversalAction(packs,state,{type:'chooseTrigger',mode:'final'});
 assert.equal(state.players[1].life[0]?.uid,top.uid);
 assert.equal(state.players[1].outside.filter(card=>card.uid===finalCard.uid).length,1);
 assertUniversalMatch(packs,state);
});
