import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR2_CARDS} from '../dist/kmr-vol2-cards.mjs';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {kmr2ChoiceImmune} from '../dist/universal-v2/kmr2-continuous.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalImpact,universalImpactNull,universalPrivateChoices,
 zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';
import {controllerDeckWindowCards} from '../dist/universal-v2/preview-actions.mjs';

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
 assert.ok(action);
 return dispatchUniversalAction(packs,s,action);
}
function click(s,pred){
 const pool=s.pending?.actions?.length?s.pending.actions:legal(s);
 const action=pool.find(pred);
 assert.ok(action);
 return dispatchUniversalAction(packs,s,action);
}
function locate(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(card=>card?.uid===uid);
}
function play(s,uid,pred){
 return act(s,action=>(action.type==='play'||action.type==='event')&&action.uid===uid&&(!pred||pred(action)));
}
function toAttack(s){
 const attack=act(s,action=>action.type==='next');
 assert.equal(attack.phase,'attack');
 return attack;
}
function strike(s,uid){
 let state=s.phase==='attack'?s:toAttack(s);
 state=dispatchUniversalAction(packs,state,{type:'attack',uid});
 assert.equal(state.pending?.kind,'block');
 return state;
}
function block(s,uid){
 return dispatchUniversalAction(packs,s,{type:'chooseBlock',uid});
}
function yellow(s){
 for(const [id,slot] of [['KMR-2-004',0],['KMR-2-008',1],['KMR-2-014',2],['KMR-2-018',3]])
  put(s,0,id,'energy',slot,true);
}
function stackFaceUp(s,p,top,underId){
 const under=take(s,p,underId);
 under.faceDown=false;under.ready=false;under.stack=[];under.under=[];
 top.stack=[under];top.raidBaseUid=under.uid;
 return under;
}
function entered(s,card,id,name){
 card.kmr2EnteredBy={id,name,turn:s.turn};
}

test('KMR-2-001 shows every inspected card, including one that cannot be taken',()=>{
 const s=fresh(fill(['KMR-2-001','KMR-2-005','KMR-2-020']));
 const match=take(s,0,'KMR-2-005'),other=take(s,0,'KMR-2-020'),rider=take(s,0,'KMR-2-001');
 park(s,0);
 s.players[0].deck.unshift(match,other);
 s.players[0].hand.push(rider);
 ready(s);
 const hand=s.players[0].hand.length;
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.pending?.step,'lookPick');
 assert.equal(state.pending.data.uids.length,2);
 assert.deepEqual(state.pending.actions.filter(action=>action.uid).map(action=>action.uid),[match.uid]);
 const window=controllerDeckWindowCards(state,packs,state.pending.actions);
 assert.deepEqual(window.map(card=>card.cardId),[match.cardId,other.cardId]);
 assert.equal(window.find(card=>card.uid===other.uid).caption,'目前不能選');
 assert.equal(window.find(card=>card.uid===match.uid).caption,'點選此牌');
 assert.equal(universalPrivateChoices(packs,state,1),null);
 const shown=universalPrivateChoices(packs,state,0);
 assert.equal(shown?.options?.some(option=>option.card?.uid===other.uid)||
  shown?.inspected?.some(card=>card.uid===other.uid),true);
 state=click(state,action=>action.uid===match.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.filter(card=>card.uid===match.uid).length,1);
 assert.equal(state.players[0].deck[0]?.uid,other.uid);
 assert.equal(state.players[0].hand.length,hand-1);
 assertUniversalMatch(packs,state);

 const zero=fresh(fill(['KMR-2-001','KMR-2-005','KMR-2-020']));
 const first=take(zero,0,'KMR-2-005'),second=take(zero,0,'KMR-2-020'),again=take(zero,0,'KMR-2-001');
 park(zero,0);
 zero.players[0].deck.unshift(first,second);
 zero.players[0].hand.push(again);
 ready(zero);
 let skipped=play(zero,again.uid,action=>action.line==='front');
 skipped=click(skipped,action=>action.mode==='done');
 assert.equal(skipped.pending?.step,'lookOrder');
 skipped=click(skipped,action=>action.uid===second.uid);
 skipped=click(skipped,action=>action.uid===first.uid);
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck[0]?.uid,second.uid);
 assert.equal(skipped.players[0].deck[1]?.uid,first.uid);
 assert.equal(skipped.players[0].outside.some(card=>card.uid===first.uid||card.uid===second.uid),false);
 assertUniversalMatch(packs,skipped);
});

test('KMR-2-011 orders the rest to the bottom before the hand leaves',()=>{
 const s=fresh(fill(['KMR-2-011','KMR-2-005','KMR-2-020','KMR-2-018','KMR-2-010']));
 put(s,0,'KMR-2-010','energy',0,true);
 const match=take(s,0,'KMR-2-005'),left=take(s,0,'KMR-2-020'),right=take(s,0,'KMR-2-018');
 const rider=take(s,0,'KMR-2-011');
 park(s,0);
 s.players[0].deck.unshift(match,left,right);
 s.players[0].hand.push(rider);
 ready(s);
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.pending?.step,'lookPick');
 const window=controllerDeckWindowCards(state,packs,state.pending.actions);
 assert.equal(window.filter(card=>card.caption==='目前不能選').length,2);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 state=click(state,action=>action.uid===match.uid);
 assert.equal(state.pending?.step,'lookOrder');
 assert.equal(state.players[0].hand.some(card=>card.uid===match.uid),true);
 assert.equal(state.pending?.step==='discard',false);
 state=click(state,action=>action.uid===left.uid);
 state=click(state,action=>action.uid===right.uid);
 assert.equal(state.pending?.step,'discard');
 const deck=state.players[0].deck;
 assert.deepEqual(deck.slice(-2).map(card=>card.uid),[left.uid,right.uid]);
 const discarded=state.players[0].hand.find(card=>card.uid===match.uid);
 state=click(state,action=>action.uid===discarded.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.filter(card=>card.uid===match.uid).length,1);
 assert.equal(state.players[0].hand.some(card=>card.uid===match.uid),false);
 assert.deepEqual(state.players[0].deck.slice(-2).map(card=>card.uid),[left.uid,right.uid]);
 assertUniversalMatch(packs,state);

 const none=fresh(fill(['KMR-2-011','KMR-2-005','KMR-2-020','KMR-2-018','KMR-2-010']));
 put(none,0,'KMR-2-010','energy',0,true);
 const a=take(none,0,'KMR-2-005'),b=take(none,0,'KMR-2-020'),c=take(none,0,'KMR-2-018');
 const second=take(none,0,'KMR-2-011');
 park(none,0);
 none.players[0].deck.unshift(a,b,c);
 none.players[0].hand.push(second);
 ready(none);
 let skipped=play(none,second.uid,action=>action.line==='front');
 skipped=click(skipped,action=>action.mode==='done');
 assert.equal(skipped.pending?.step,'lookOrder');
 skipped=click(skipped,action=>action.uid===a.uid);
 skipped=click(skipped,action=>action.uid===b.uid);
 skipped=click(skipped,action=>action.uid===c.uid);
 assert.equal(skipped.pending,null);
 assert.deepEqual(skipped.players[0].deck.slice(-3).map(card=>card.uid),[a.uid,b.uid,c.uid]);
 assert.equal(skipped.players[0].outside.length,0);
 assert.equal(skipped.players[0].hand.length,0);
 assertUniversalMatch(packs,skipped);
});

test('KMR-2-005 and KMR-2-012 swap only for a raid made during this attack phase',()=>{
 const counts=fill(['KMR-2-005','KMR-2-006','KMR-2-012','KMR-2-013','KMR-1-010','KMR-2-020']);
 function board(){
  const s=fresh(counts);
  const top=put(s,0,'KMR-2-005','front',0,true);
  const base=stackFaceUp(s,0,top,'KMR-2-006');
  const food=put(s,0,'KMR-2-013','energy',0,true);
  const partner=take(s,0,'KMR-2-012');
  park(s,0);
  s.players[0].hand.push(partner);
  const wall=put(s,1,'KMR-1-010','front',0,true);
  const quiet=put(s,1,'KMR-2-020','front',1,true);
  ready(s);
  return {s,top,base,food,partner,wall,quiet};
 }
 const skipped=board();
 assert.equal(universalBp(pack,skipped.s,skipped.top),4000);
 let state=strike(skipped.s,skipped.top.uid);
 state=block(state,skipped.wall.uid);
 assert.equal(state.pending?.id,'KMR-2-005');
 assert.equal(state.pending?.step,'swapPartner');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].front[0]?.uid,skipped.top.uid);
 assert.equal(state.players[0].energy[0]?.uid,skipped.food.uid);
 assert.equal(state.players[0].hand.filter(card=>card.uid===skipped.partner.uid).length,1);
 assert.equal(state.raidCount[0],0);
 assertUniversalMatch(packs,state);

 const accepted=board();
 const beforeDeck=accepted.s.players[0].deck.length;
 state=strike(accepted.s,accepted.top.uid);
 state=block(state,accepted.wall.uid);
 assert.equal(state.pending.actions.some(action=>action.uid===accepted.partner.uid),true);
 state=click(state,action=>action.uid===accepted.partner.uid);
 assert.equal(state.pending?.step,'swapFood');
 assert.equal(state.publicReveals.some(entry=>entry.uid===accepted.partner.uid),true);
 state=click(state,action=>action.uid===accepted.food.uid);
 assert.equal(state.pending,null);
 const swapped=state.players[0].front[0];
 assert.equal(swapped?.cardId,'KMR-2-012');
 assert.equal(swapped.stack?.[0]?.uid,accepted.base.uid);
 assert.equal(swapped.ready,true);
 assert.equal(swapped.kmr2EnteredBy?.turn,state.turn);
 assert.equal(universalBp(pack,state,swapped),5000);
 assert.equal(universalImpact(pack,state,swapped),1);
 assert.equal(state.players[0].hand.filter(card=>card.uid===accepted.top.uid).length,1);
 assert.equal(state.players[0].hand.some(card=>card.uid===accepted.partner.uid||card.uid===accepted.base.uid),false);
 assert.equal(state.players[0].outside.filter(card=>card.uid===accepted.food.uid).length,1);
 assert.equal(state.players[0].hand.length,2);
 assert.equal(state.players[0].deck.length,beforeDeck-1);
 assert.equal(state.raidCount[0],1);
 assertUniversalMatch(packs,state);
 const raids=state.raidCount[0];
 state=strike(state,swapped.uid);
 state=block(state,accepted.quiet.uid);
 assert.equal(state.pending?.step==='swapPartner',false);
 assert.equal(state.players[1].life.length,accepted.s.players[1].life.length);
 assert.equal(state.players[0].front[0]?.uid,swapped.uid);
 assert.equal(state.raidCount[0],raids);
 assertUniversalMatch(packs,state);
});

test('a paid main-phase raid of KMR-2-005 does not grant the raid-frame bonus and does not block the later swap',()=>{
 const s=fresh(fill(['KMR-2-004','KMR-2-005','KMR-2-006','KMR-2-008','KMR-2-012','KMR-2-013','KMR-2-014','KMR-2-018','KMR-1-010'],{'KMR-2-013':2}));
 put(s,0,'KMR-2-004','energy',0,true);
 put(s,0,'KMR-2-008','energy',1,true);
 put(s,0,'KMR-2-018','energy',2,true);
 const base=put(s,0,'KMR-2-006','front',0,true);
 const food=put(s,0,'KMR-2-013','energy',3,true);
 const outsideFood=take(s,0,'KMR-2-013');
 s.players[0].outside.push(outsideFood);
 const gav=take(s,0,'KMR-2-005'),partner=take(s,0,'KMR-2-012');
 park(s,0);
 s.players[0].hand.push(gav,partner);
 const wall=put(s,1,'KMR-1-010','front',0,true);
 ready(s);
 let state=act(s,action=>action.type==='raid'&&action.uid===gav.uid&&action.baseUid===base.uid);
 assert.equal(state.pending?.id,'KMR-2-005');
 assert.equal(state.pending?.step,'hand');
 const top=state.players[0].front[0];
 assert.equal(top?.cardId,'KMR-2-005');
 assert.equal(universalBp(pack,state,top),4000);
 assert.equal(top.kmr2EnteredBy,undefined);
 state=click(state,action=>action.uid===outsideFood.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.filter(card=>card.uid===outsideFood.uid).length,1);
 assert.equal(universalBp(pack,state,state.players[0].front[0]),4000);
 state=strike(state,top.uid);
 assert.equal(state.kmr2AttackRaidBaseline[0],state.raidCount[0]);
 assert.equal(state.raidCount[0]>0,true);
 state=block(state,wall.uid);
 assert.equal(state.pending?.step,'swapPartner');
 state=click(state,action=>action.uid===partner.uid);
 state=click(state,action=>action.uid===food.uid);
 assert.equal(state.players[0].front[0]?.cardId,'KMR-2-012');
 assert.equal(state.players[0].front[0].stack?.[0]?.uid,base.uid);
 assert.equal(universalBp(pack,state,state.players[0].front[0]),5000);
 assert.equal(state.pending?.step==='swapPartner',false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-005 immunity and KMR-2-012 impact follow a face-up raid that entered by an effect this turn',()=>{
 const s=fresh(fill(['KMR-2-005','KMR-2-012','KMR-2-006','KMR-2-010','KMR-2-015','KMR-2-004','KMR-2-008'],{'KMR-2-015':2}));
 put(s,0,'KMR-2-004','energy',0,true);
 put(s,0,'KMR-2-008','energy',1,true);
 const gav=put(s,1,'KMR-2-010','front',0,true);
 const over=put(s,1,'KMR-2-005','front',1,true);
 const master=put(s,1,'KMR-2-012','front',2,true);
 stackFaceUp(s,1,over,'KMR-2-006');
 const facedown=take(s,1,'KMR-2-004');
 facedown.faceDown=true;
 master.stack=[facedown];
 entered(s,over,'KMR-2-012','仮面ライダーガヴ マスターモード');
 entered(s,master,'KMR-2-005','仮面ライダーガヴ オーバーモード');
 over.buffs=[{bp:-3000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,over),4000);
 assert.equal(universalBp(pack,s,master),4000);
 assert.equal(universalImpact(pack,s,master),0);
 assert.equal(kmr2ChoiceImmune(pack,s,over,(source,card)=>source.cards[card.cardId],false),true);
 assert.equal(kmr2ChoiceImmune(pack,s,master,(source,card)=>source.cards[card.cardId],false),false);
 const event=take(s,0,'KMR-2-015');
 const eventAgain=take(s,0,'KMR-2-015');
 park(s,0);
 s.players[0].hand.push(event,eventAgain);
 ready(s);
 let state=play(s,event.uid);
 assert.equal(state.pending?.step,'pickFront');
 assert.equal(state.pending.player,0);
 assert.equal(state.pending.actions.some(action=>action.uid===over.uid),false);
 assert.equal(state.pending.actions.some(action=>action.uid===gav.uid),true);
 assert.equal(state.pending.actions.some(action=>action.uid===master.uid),true);
 state=click(state,action=>action.uid===gav.uid);
 state=click(state,action=>action.mode==='top');
 const liveOver=state.players[1].front.find(card=>card?.uid===over.uid);
 const buried=liveOver.stack.pop();
 state.players[1].outside.push(buried);
 assert.equal(universalBp(pack,state,liveOver),1000);
 assert.equal(kmr2ChoiceImmune(pack,state,liveOver,(source,card)=>source.cards[card.cardId],false),false);
 state=play(state,eventAgain.uid);
 assert.equal(state.pending?.step,'pickFront');
 assert.equal(state.pending.actions.some(action=>action.uid===liveOver.uid),true);
 state=click(state,action=>action.uid===liveOver.uid);
 state=click(state,action=>action.mode==='bottom');
 assert.equal(state.pending,null);
 assert.equal(state.players[1].deck.at(-1)?.uid,liveOver.uid);
 assertUniversalMatch(packs,state);
});

test('KMR-2-015 lets the controller choose the character and only then switches the deck side',()=>{
 const counts=fill(['KMR-2-015','KMR-2-004','KMR-2-018','KMR-2-010','KMR-2-020']);
 function open(withGav){
  const s=fresh(counts);
  put(s,0,'KMR-2-004','energy',0,true);
  put(s,0,'KMR-2-018','energy',1,true);
  if(withGav)put(s,0,'KMR-2-010','front',0,true);
  const target=put(s,1,'KMR-2-020','front',0,true);
  const event=take(s,0,'KMR-2-015');
  park(s,0);
  s.players[0].hand.push(event);
  ready(s);
  const state=play(s,event.uid);
  return {state,target};
 }
 let {state,target}=open(false);
 assert.equal(state.pending?.step,'pickFront');
 assert.equal(state.pending.player,0);
 state=click(state,action=>action.uid===target.uid);
 assert.equal(state.pending?.step,'oppDeck');
 assert.equal(state.pending.player,1);
 state=click(state,action=>action.mode==='bottom');
 assert.equal(state.pending,null);
 assert.equal(state.players[1].deck.at(-1)?.uid,target.uid);
 assert.equal(state.players[1].front.some(card=>card?.uid===target.uid),false);
 assert.equal(state.players[1].deck.filter(card=>card.uid===target.uid).length,1);
 assertUniversalMatch(packs,state);

 ({state,target}=open(true));
 assert.equal(state.pending.player,0);
 state=click(state,action=>action.uid===target.uid);
 assert.equal(state.pending.player,0);
 state=click(state,action=>action.mode==='top');
 assert.equal(state.players[1].deck[0]?.uid,target.uid);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const empty=fresh(counts);
 put(empty,0,'KMR-2-004','energy',0,true);
 put(empty,0,'KMR-2-018','energy',1,true);
 const nowhere=take(empty,0,'KMR-2-015');
 park(empty,0);
 empty.players[0].hand.push(nowhere);
 ready(empty);
 const spent=empty.players[0].apCards.filter(card=>card.ready).length;
 const played=play(empty,nowhere.uid);
 assert.equal(played.pending,null);
 assert.equal(played.players[1].front.every(card=>!card),true);
 assert.equal(played.players[0].apCards.filter(card=>card.ready).length,spent-1);
});

test('KMR-2-002 and KMR-2-017 do not pay when no legal character remains',()=>{
 const s=fresh(fill(['KMR-2-002','KMR-2-001','KMR-2-017']));
 const rider=put(s,0,'KMR-2-002','front',0,true);
 const lone=put(s,0,'KMR-2-017','front',1,true);
 ready(s);
 assert.equal(legal(s).some(action=>action.uid===rider.uid&&action.mode==='kmr2:KMR-2-002:b'),false);
 assert.equal(rider.ready,true);
 assert.equal(lone.ready,true);
 const target=put(s,1,'KMR-2-001','front',0,true);
 const ally=put(s,0,'KMR-2-001','front',2,true);
 assert.equal(legal(s).some(action=>action.uid===rider.uid&&action.mode==='kmr2:KMR-2-002:b'),true);
 let state=act(s,action=>action.uid===rider.uid&&action.mode==='kmr2:KMR-2-002:b');
 state=click(state,action=>action.uid===target.uid);
 assert.equal(state.players[0].front[0].ready,false);
 assert.equal(state.players[1].front[0].ready,false);
 assert.equal(state.mainAbilityUsedUids.includes(rider.uid+'|002b'),true);
 assert.equal(legal(state).some(action=>action.uid===rider.uid&&action.mode==='kmr2:KMR-2-002:b'),false);
 state=act(state,action=>action.uid===lone.uid&&action.mode==='kmr2:KMR-2-017');
 state=click(state,action=>action.uid===ally.uid);
 assert.equal(state.players[0].front[1].ready,false);
 assert.equal(state.players[0].front[2].ready,false);
 assert.equal(universalCardEnergy(pack,state,0,state.players[0].front[1]),0);
 assert.equal(state.players[0].front[1].buffs?.some(buff=>buff.energy===1),true);
 assert.equal(legal(state).some(action=>action.uid===lone.uid),false);
 assertUniversalMatch(packs,state);

 const only=fresh(fill(['KMR-2-017','KMR-2-001']));
 const self=put(only,0,'KMR-2-017','front',0,true);
 put(only,0,'KMR-2-001','front',1,false);
 ready(only);
 assert.equal(legal(only).some(action=>action.uid===self.uid),false);
 assert.equal(self.ready,true);
});

test('KMR-2-013 draws and discards once when the field has no character',()=>{
 const s=fresh(fill(['KMR-2-013','KMR-2-014']));
 const field=put(s,0,'KMR-2-014','energy',0,true);
 const food=take(s,0,'KMR-2-013');
 park(s,0);
 s.players[0].hand.push(food);
 ready(s);
 const deck=s.players[0].deck.length;
 let state=play(s,food.uid);
 assert.equal(state.pending?.step,'discard');
 assert.equal(state.players[0].hand.length,1);
 state=click(state,action=>action.mode==='discard');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,0);
 assert.equal(state.players[0].outside.length,1);
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.players[0].energy.some(card=>card?.uid===field.uid)||
  state.players[0].front.some(card=>card?.uid===field.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-004 can rest a ゴチゾウ and draw, or do neither',()=>{
 const counts=fill(['KMR-2-004','KMR-2-008','KMR-2-013','KMR-2-018']);
 function open(){
  const s=fresh(counts);
  put(s,0,'KMR-2-008','energy',0,true);
  put(s,0,'KMR-2-018','energy',1,true);
  const food=put(s,0,'KMR-2-013','energy',2,true);
  const rider=take(s,0,'KMR-2-004');
  park(s,0);
  s.players[0].hand.push(rider);
  ready(s);
  return {s,food,rider};
 }
 let {s,food,rider}=open();
 const deck=s.players[0].deck.length;
 let state=play(s,rider.uid);
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(locate(state,0,food.uid).ready,true);
 assert.equal(state.players[0].deck.length,deck);
 ({s,food,rider}=open());
 const before=s.players[0].deck.length;
 state=play(s,rider.uid);
 state=click(state,action=>action.uid===food.uid);
 assert.equal(state.pending,null);
 assert.equal(locate(state,0,food.uid).ready,false);
 assert.equal(state.players[0].hand.length,1);
 assert.equal(state.players[0].deck.length,before-1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-003, KMR-2-006 and KMR-2-007 pay a ゴチゾウ only once',()=>{
 const s=fresh(fill(['KMR-2-003','KMR-2-006','KMR-2-007','KMR-2-010','KMR-2-013'],{'KMR-2-013':4}));
 const front=put(s,0,'KMR-2-003','front',0,true);
 const food=put(s,0,'KMR-2-013','energy',0,true);
 ready(s);
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 let state=act(s,action=>action.uid===front.uid);
 state=click(state,action=>action.uid===food.uid);
 assert.equal(state.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(pack,state,0,state.players[0].front[0])>0,true);
 assert.equal(legal(state).some(action=>action.uid===front.uid),false);

 const caking=put(state,0,'KMR-2-006','energy',1,true);
 put(state,0,'KMR-2-013','energy',2,true);
 const plain=take(state,0,'KMR-2-010');
 park(state,0);
 state.players[0].hand.push(plain);
 state=act(state,action=>action.uid===caking.uid&&action.mode==='kmr2:KMR-2-006:b');
 state=click(state,action=>action.mode==='retireOwn');
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.players[0].energy[1].ready,false);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===plain.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.cardId==='KMR-2-013'),true);

 const chips=put(state,0,'KMR-2-007','front',2,true);
 const last=take(state,0,'KMR-2-013');
 state.players[0].energy[3]=last;last.ready=true;last.fieldEntryStamp=state.nextFieldEntryStamp++;
 const printed=universalBp(pack,state,chips);
 state=act(state,action=>action.uid===chips.uid);
 state=click(state,action=>action.mode==='retireOwn');
 assert.equal(universalBp(pack,state,state.players[0].front[2]),printed+2000);
 assert.equal(legal(state).some(action=>action.uid===chips.uid),false);
 assertUniversalMatch(packs,state);

 const impact=fresh(fill(['KMR-2-003','KMR-2-019','KMR-2-006']),1);
 const soft=put(impact,0,'KMR-2-003','front',0,true);
 const ohma=put(impact,1,'KMR-2-019','front',0,true);
 stackFaceUp(impact,1,ohma,'KMR-2-006');
 ready(impact);
 const lives=impact.players[0].life.length;
 let hit=strike(impact,ohma.uid);
 hit=block(hit,soft.uid);
 assert.equal(hit.players[0].outside.filter(card=>card.uid===soft.uid).length,1);
 assert.equal(hit.players[0].life.length,lives);
 assert.equal(universalImpactNull(pack,hit,soft),true);
 assertUniversalMatch(packs,hit);
});

test('KMR-2-008 shifts only after the optional hand card leaves',()=>{
 const s=fresh(fill(['KMR-2-002','KMR-2-008','KMR-2-013','KMR-1-010','KMR-2-010']));
 const actor=put(s,0,'KMR-2-002','front',0,false);
 const food=put(s,0,'KMR-2-013','energy',1,true);
 const rider=put(s,0,'KMR-2-008','energy',0,true);
 const wall=put(s,1,'KMR-1-010','front',0,true);
 const spare=take(s,0,'KMR-2-010');
 park(s,0);
 s.players[0].hand.push(spare);
 ready(s);
 let state=act(s,action=>action.uid===actor.uid&&action.mode==='kmr2:KMR-2-002:a');
 state=click(state,action=>action.uid===food.uid);
 assert.equal(state.players[0].front[0].ready,true);
 assert.equal(universalBp(pack,state,state.players[0].energy[0]),4000);
 state=strike(state,actor.uid);
 state=block(state,wall.uid);
 assert.equal(state.pending?.id,'KMR-2-008');
 assert.equal(state.pending?.step,'discard');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.players[0].energy[0]?.uid,rider.uid);
 assert.equal(state.players[0].hand.some(card=>card.uid===spare.uid),true);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const moved=fresh(fill(['KMR-2-002','KMR-2-008','KMR-2-013','KMR-1-010','KMR-2-010']));
 const actor2=put(moved,0,'KMR-2-002','front',0,false);
 const food2=put(moved,0,'KMR-2-013','energy',1,true);
 const rider2=put(moved,0,'KMR-2-008','energy',0,true);
 const wall2=put(moved,1,'KMR-1-010','front',0,true);
 const spare2=take(moved,0,'KMR-2-010');
 park(moved,0);
 moved.players[0].hand.push(spare2);
 ready(moved);
 let shift=act(moved,action=>action.uid===actor2.uid&&action.mode==='kmr2:KMR-2-002:a');
 shift=click(shift,action=>action.uid===food2.uid);
 shift=strike(shift,actor2.uid);
 shift=block(shift,wall2.uid);
 shift=click(shift,action=>action.uid===spare2.uid);
 assert.equal(shift.pending,null);
 assert.equal(shift.players[0].front.some(card=>card?.uid===rider2.uid),true);
 assert.equal(shift.players[0].energy.some(card=>card?.uid===rider2.uid),false);
 assert.equal(shift.players[0].outside.filter(card=>card.uid===spare2.uid).length,1);
 assertUniversalMatch(packs,shift);
});

test('KMR-2-009 moves to an empty energy line after losing to BP 3000 or less',()=>{
 const counts=fill(['KMR-2-009','KMR-2-020','KMR-2-019','KMR-2-006']);
 const s=fresh(counts,1);
 const rider=put(s,0,'KMR-2-009','front',0,true);
 const winner=put(s,1,'KMR-2-020','front',0,true);
 ready(s);
 assert.equal(s.active,1);
 const life=s.players[0].life.length;
 let state=strike(s,winner.uid);
 state=block(state,rider.uid);
 assert.equal(state.players[0].energy.some(card=>card?.uid===rider.uid),true);
 assert.equal(state.players[0].front.some(card=>card?.uid===rider.uid),false);
 assert.equal(state.players[0].outside.some(card=>card.uid===rider.uid),false);
 assert.equal(state.players[0].life.length,life);
 assertUniversalMatch(packs,state);

 const impact=fresh(counts,1);
 const soft=put(impact,0,'KMR-2-009','front',0,true);
 const ohma=put(impact,1,'KMR-2-019','front',0,true);
 stackFaceUp(impact,1,ohma,'KMR-2-006');
 ready(impact);
 const lives=impact.players[0].life.length;
 let hit=strike(impact,ohma.uid);
 hit=block(hit,soft.uid);
 assert.equal(hit.players[0].outside.filter(card=>card.uid===soft.uid).length,1);
 assert.equal(hit.players[0].life.length,lives);
 assert.equal(universalImpact(pack,hit,hit.players[1].front[0]),1);
 assert.equal(universalImpactNull(pack,hit,soft),true);
 assertUniversalMatch(packs,hit);
});

test('KMR-2-014 spends the discard and AP before the optional ゴチゾウ',()=>{
 const s=fresh(fill(['KMR-2-014','KMR-2-010','KMR-2-013']));
 const field=put(s,0,'KMR-2-014','energy',0,true);
 const food=take(s,0,'KMR-2-013');
 s.players[0].outside.push(food);
 const spare=take(s,0,'KMR-2-010');
 park(s,0);
 s.players[0].deck.unshift(spare);
 ready(s);
 assert.equal(legal(s).some(action=>action.uid===field.uid),false);
 s.players[0].hand.push(s.players[0].deck.shift());
 const readyAp=s.players[0].apCards.filter(card=>card.ready).length;
 let state=act(s,action=>action.uid===field.uid);
 assert.equal(state.players[0].energy[0].ready,false);
 state=click(state,action=>action.uid===spare.uid);
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,readyAp-1);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(card=>card.uid===food.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===spare.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-016 readies up to two AP cards and can stop after one',()=>{
 const s=fresh(fill(['KMR-2-016','KMR-2-004','KMR-2-008']));
 put(s,0,'KMR-2-004','energy',0,true);
 put(s,0,'KMR-2-008','energy',1,true);
 const event=take(s,0,'KMR-2-016');
 park(s,0);
 s.players[0].hand.push(event);
 ready(s);
 const aps=s.players[0].apCards;
 assert.equal(aps.length>=3,true);
 for(const ap of aps)ap.ready=false;
 aps[0].ready=true;
 let state=play(s,event.uid);
 assert.equal(state.pending?.kind,'effect-recover-ap');
 assert.equal(state.pending.remaining,2);
 assert.equal(legal(state).some(action=>action.type==='chooseApRecovery'&&action.uid===null),true);
 state=click(state,action=>action.uid===aps[1].uid);
 assert.equal(state.pending?.kind,'effect-recover-ap');
 state=click(state,action=>action.uid===null);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,1);
 assert.equal(state.players[0].apCards.find(card=>card.uid===aps[1].uid).ready,true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-018 resolves one branch, and skipping the reveal does not draw',()=>{
 const counts=fill(['KMR-2-018','KMR-2-004','KMR-2-008','KMR-1-044']);
 function open(){
  const s=fresh(counts);
  put(s,0,'KMR-2-004','energy',0,true);
  put(s,0,'KMR-2-008','energy',1,true);
  const rider=take(s,0,'KMR-2-018');
  park(s,0);
  s.players[0].hand.push(rider);
  ready(s);
  return {s,rider};
 }
 let {s,rider}=open();
 const deck=s.players[0].deck.length;
 let state=play(s,rider.uid);
 state=click(state,action=>action.key==='draw');
 assert.equal(state.pending?.step,'discard');
 assert.equal(state.players[0].hand.length,1);
 state=click(state,action=>action.mode==='discard');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.players[0].outside.length,1);
 ({s,rider}=open());
 const reveal=take(s,0,'KMR-1-044');
 s.players[0].hand.push(reveal);
 const before=s.players[0].deck.length;
 state=play(s,rider.uid);
 state=click(state,action=>action.key==='raid');
 assert.equal(state.pending?.step,'revealHand');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck.length,before);
 assert.equal(state.players[0].hand.some(card=>card.uid===reveal.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-020 reduces its hand cost only while its own field is empty',()=>{
 const s=fresh(fill(['KMR-2-020','KMR-2-001','KMR-2-004']));
 const printed=pack.cards['KMR-2-020'];
 park(s,0);
 const rider=take(s,0,'KMR-2-020');
 s.players[0].hand.push(rider);
 ready(s);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),0);
 let state=play(s,rider.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].front.some(card=>card?.uid===rider.uid)||
  state.players[0].energy.some(card=>card?.uid===rider.uid),true);
 const again=fresh(fill(['KMR-2-020','KMR-2-001']));
 const occupied=put(again,0,'KMR-2-001','energy',0,true);
 const waiting=take(again,0,'KMR-2-020');
 park(again,0);
 again.players[0].hand.push(waiting);
 ready(again);
 assert.equal(zoneRequiredEnergy(pack,again,0,printed,'hand'),2);
 assert.equal(legal(again).some(action=>action.uid===waiting.uid),false);
 assert.equal(occupied.cardId,'KMR-2-001');
 assertUniversalMatch(packs,state);
});

test('KMR-2-021 can leave its life card, and a skipped attack-end raid does not happen',()=>{
 const s=fresh(fill(['KMR-2-021','KMR-2-004','KMR-2-008','KMR-2-014','KMR-2-018','KMR-2-010','KMR-1-107','KMR-1-010']));
 yellow(s);
 const handCard=take(s,0,'KMR-2-010');
 const rider=take(s,0,'KMR-2-021');
 park(s,0);
 s.players[0].hand.push(rider,handCard);
 ready(s);
 const life=s.players[0].life.length;
 let state=play(s,rider.uid,action=>action.line==='front');
 assert.equal(state.pending?.step,'payLife');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===handCard.uid),true);
 assert.equal(state.players[0].life.length,life);
 const placed=state.players[0].front.find(card=>card?.cardId==='KMR-2-021');
 assert.equal(universalBp(pack,state,placed),5000);
 state.active=1;
 assert.equal(universalBp(pack,state,placed),4000);
 state.active=0;
 assertUniversalMatch(packs,state);

 const paid=fresh(fill(['KMR-2-021','KMR-2-004','KMR-2-008','KMR-2-014','KMR-2-018','KMR-2-010']));
 yellow(paid);
 const cost=take(paid,0,'KMR-2-010'),body=take(paid,0,'KMR-2-021');
 park(paid,0);
 paid.players[0].hand.push(body,cost);
 ready(paid);
 const lifeCard=paid.players[0].life[0];
 let moved=play(paid,body.uid,action=>action.line==='front');
 moved=click(moved,action=>action.uid===cost.uid);
 assert.equal(moved.pending?.step,'lifeOut');
 moved=click(moved,action=>action.uid===lifeCard.uid);
 assert.equal(moved.pending,null);
 assert.equal(moved.lifeRevealed?.length||0,0);
 assert.equal(moved.players[0].outside.filter(card=>card.uid===lifeCard.uid).length,1);
 assert.equal(moved.players[0].hand.length,2);
 assert.equal(moved.players[0].front.find(card=>card?.cardId==='KMR-2-021').ready,true);
 assertUniversalMatch(packs,moved);

 const end=fresh(fill(['KMR-2-021','KMR-1-107','KMR-1-010']));
 const host=put(end,0,'KMR-2-021','front',0,true);
 const hopper=take(end,0,'KMR-1-107');
 park(end,0);
 end.players[0].hand.push(hopper);
 const wall=put(end,1,'KMR-1-010','front',0,true);
 ready(end);
 let attack=strike(end,host.uid);
 attack=block(attack,wall.uid);
 assert.equal(attack.pending?.step,'raidSelf');
 attack=click(attack,action=>action.mode==='skip');
 assert.equal(attack.pending,null);
 assert.equal(attack.players[0].hand.some(card=>card.uid===hopper.uid),true);
 assert.equal(attack.players[0].front[0]?.uid,host.uid);
 assert.equal(attack.raidCount[0],0);
 assertUniversalMatch(packs,attack);

 const taken=fresh(fill(['KMR-2-021','KMR-1-107','KMR-1-010']));
 const host2=put(taken,0,'KMR-2-021','front',0,true);
 const hopper2=take(taken,0,'KMR-1-107');
 park(taken,0);
 taken.players[0].hand.push(hopper2);
 const wall2=put(taken,1,'KMR-1-010','front',0,true);
 ready(taken);
 let raid=strike(taken,host2.uid);
 raid=block(raid,wall2.uid);
 raid=click(raid,action=>action.uid===hopper2.uid);
 assert.equal(raid.players[0].hand.some(card=>card.uid===hopper2.uid),false);
 assert.equal(raid.players[0].front[0]?.uid,hopper2.uid);
 assert.equal(raid.players[0].front[0]?.stack?.some(card=>card.uid===host2.uid),true);
 assert.equal(raid.raidCount[0],1);
 assertUniversalMatch(packs,raid);
});

test('KMR-2-022 locks the name across copies and offers the release only at three facedown cards',()=>{
 const s=fresh(fill(['KMR-2-022','KMR-2-010'],{'KMR-2-022':2}));
 const first=put(s,0,'KMR-2-022','front',0,true);
 const second=put(s,0,'KMR-2-022','front',1,true);
 const tucked=take(s,0,'KMR-2-010');
 park(s,0);
 s.players[0].hand.push(tucked);
 ready(s);
 let state=act(s,action=>action.uid===first.uid);
 assert.equal(state.pending.actions.some(action=>action.key==='release'),false);
 state=click(state,action=>action.key==='tuck');
 state=click(state,action=>action.uid===tucked.uid);
 state=click(state,action=>action.uid===first.uid);
 assert.equal(state.pending,null);
 assert.equal(legal(state).some(action=>action.uid===second.uid&&String(action.mode).includes('KMR-2-022')),false);
 assertUniversalMatch(packs,state);

 const release=fresh(fill(['KMR-2-022','KMR-2-010','KMR-2-001','KMR-2-020']));
 const host=put(release,0,'KMR-2-022','front',0,true);
 host.under=[];
 for(const id of ['KMR-2-010','KMR-2-001','KMR-2-020']){
  const layer=take(release,0,id);
  layer.faceDown=true;layer.ready=false;layer.fieldEntryStamp=null;layer.stack=[];layer.under=[];
  host.under.push(layer);
 }
 ready(release);
 let opened=act(release,action=>action.uid===host.uid);
 assert.equal(opened.pending.actions.some(action=>action.key==='release'),true);
 opened=click(opened,action=>action.key==='release');
 assert.equal(opened.pending?.step,'release3');
 const layers=[...host.under];
 for(const layer of layers)opened=click(opened,action=>action.uid===layer.uid);
 assert.equal(opened.pending?.step,'impact');
 opened=click(opened,action=>action.mode==='skip');
 assert.equal(opened.pending,null);
 assert.equal(layers.every(layer=>opened.players[0].outside.some(card=>card.uid===layer.uid&&card.faceDown!==true)),true);
 assert.equal(universalImpact(pack,opened,opened.players[0].front[0]),0);
 assert.equal(legal(opened).some(action=>action.uid===host.uid),false);
 assertUniversalMatch(packs,opened);
});

test('KMR-2-023 can skip the tuck, and taking it draws once before the optional doctor',()=>{
 const counts=fill(['KMR-2-023','KMR-2-025'],{'KMR-2-023':3});
 function open(){
  const s=fresh(counts);
  put(s,0,'KMR-2-025','energy',0,true);
  const other=put(s,0,'KMR-2-023','front',0,true);
  const rider=take(s,0,'KMR-2-023'),doctor=take(s,0,'KMR-2-023');
  park(s,0);
  s.players[0].hand.push(rider,doctor);
  ready(s);
  return {s,other,rider,doctor};
 }
 let {s,other,rider,doctor}=open();
 const deck=s.players[0].deck.length;
 let state=play(s,rider.uid);
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck.length,deck);
 assert.equal(state.players[0].front.some(card=>card?.uid===other.uid),true);
 assert.equal(state.players[0].hand.some(card=>card.uid===doctor.uid),true);
 ({s,other,rider,doctor}=open());
 const before=s.players[0].deck.length;
 state=play(s,rider.uid);
 state=click(state,action=>action.uid===other.uid);
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.players[0].deck.length,before-1);
 const host=state.players[0].front.find(card=>card?.uid===rider.uid)||
  state.players[0].energy.find(card=>card?.uid===rider.uid);
 assert.equal(host.under?.some(card=>card.uid===other.uid&&card.faceDown===true),true);
 assert.equal(universalBp(pack,state,host),4000);
 state=click(state,action=>action.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===doctor.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-024 chooses which rested AP becomes ready after the optional アンク',()=>{
 const s=fresh(fill(['KMR-2-024','KMR-2-025','KMR-2-026'],{'KMR-2-025':2}));
 put(s,0,'KMR-2-025','energy',0,true);
 put(s,0,'KMR-2-025','energy',1,true);
 const ankh=take(s,0,'KMR-2-026');
 s.players[0].removed.push(ankh);
 const rider=take(s,0,'KMR-2-024');
 park(s,0);
 s.players[0].hand.push(rider);
 ready(s);
 const aps=s.players[0].apCards;
 assert.equal(aps.length>=3,true);
 let state=play(s,rider.uid);
 const enteredCard=state.players[0].front.find(card=>card?.uid===rider.uid)||
  state.players[0].energy.find(card=>card?.uid===rider.uid);
 assert.equal(enteredCard.ready,true);
 assert.equal(state.pending?.step,'outside');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].removed.some(card=>card.uid===ankh.uid),true);
 assert.equal(state.players[0].apCards.filter(card=>card.inPlay&&!card.ready).length,2);

 const chosen=fresh(fill(['KMR-2-024','KMR-2-025','KMR-2-026'],{'KMR-2-025':2}));
 put(chosen,0,'KMR-2-025','energy',0,true);
 put(chosen,0,'KMR-2-025','energy',1,true);
 const medal=take(chosen,0,'KMR-2-026');
 chosen.players[0].removed.push(medal);
 const body=take(chosen,0,'KMR-2-024');
 park(chosen,0);
 chosen.players[0].hand.push(body);
 ready(chosen);
 const points=chosen.players[0].apCards;
 state=play(chosen,body.uid);
 state=click(state,action=>action.uid===medal.uid);
 assert.equal(state.pending?.step,'readyAp');
 assert.equal(state.players[0].outside.some(card=>card.uid===medal.uid),true);
 const rested=state.pending.actions.map(action=>action.uid);
 assert.equal(rested.length>=2,true);
 state=click(state,action=>action.uid===rested[0]);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].apCards.find(card=>card.uid===rested[0]).ready,true);
 assert.equal(state.players[0].apCards.find(card=>card.uid===rested[1]).ready,false);
 const playing=state.players[0].apCards.filter(card=>card.inPlay);
 assert.equal(playing.filter(card=>card.ready).length,playing.length-1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-025 discards three matching cards once and draws three at the end of main',()=>{
 const s=fresh(fill(['KMR-2-025','KMR-2-001','KMR-2-010','KMR-2-013']));
 const rider=put(s,0,'KMR-2-025','front',0,true);
 const cards=['KMR-2-001','KMR-2-010','KMR-2-013'].map(id=>take(s,0,id));
 park(s,0);
 s.players[0].deck.unshift(...cards);
 ready(s);
 assert.equal(legal(s).some(action=>action.uid===rider.uid),false);
 s.players[0].hand.push(...s.players[0].deck.splice(0,3));
 let state=act(s,action=>action.uid===rider.uid);
 assert.equal(state.pending?.step,'same');
 assert.equal(state.pending.actions.some(action=>action.mode==='skip'),false);
 for(const card of cards)state=click(state,action=>action.uid===card.uid);
 assert.equal(state.pending?.step,'buff');
 assert.equal(state.kmrMainEndDraw?.count,3);
 assert.equal(state.players[0].hand.length,0);
 const deck=state.players[0].deck.length;
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.length,0);
 assert.equal(universalBp(pack,state,state.players[0].front[0]),2000);
 state=act(state,action=>action.type==='next');
 assert.equal(state.phase,'attack');
 assert.equal(state.kmrMainEndDraw,null);
 assert.equal(state.players[0].hand.length,3);
 assert.equal(state.players[0].deck.length,deck-3);
 assert.equal(legal(state).some(action=>action.mode==='kmr2:KMR-2-025'),false);
 assertUniversalMatch(packs,state);
});

test('life checks for KMR-2-001 through KMR-2-025 open the printed trigger once',()=>{
 const attackerId='KMR-1-010';
 function reveal(id){
  const s=fresh(fill([id,attackerId]));
  const attacker=put(s,0,attackerId,'front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;
  s.players[1].deck.push(buried);
  ready(s);
  let state=strike(s,attacker.uid);
  state=block(state,null);
  return {state,trigger,attacker};
 }
 for(const card of KMR2_CARDS.slice(0,25)){
  const trigger=card.trigger;
  if(!trigger){
   const opened=reveal(card.id);
   assert.equal(opened.state.pending?.kind==='life-trigger',false,card.id);
   assert.equal(opened.state.players[1].outside.filter(item=>item.uid===opened.trigger.uid).length,1,card.id);
   assertUniversalMatch(packs,opened.state);
   continue;
  }
  if(trigger==='final')continue;
  const opened=reveal(card.id);
  assert.equal(opened.state.pending?.kind,'life-trigger',card.id);
  assert.equal(opened.state.pending.trigger,trigger,card.id);
  assert.equal(opened.state.publicReveals.some(entry=>entry.uid===opened.trigger.uid),true,card.id);
  const skipped=dispatchUniversalAction(packs,opened.state,{type:'chooseTrigger',mode:'skip'});
  assert.equal(skipped.pending?.kind==='life-trigger',false,card.id);
  assert.equal(skipped.players[1].outside.filter(item=>item.uid===opened.trigger.uid).length,1,card.id);
  assertUniversalMatch(packs,skipped);
 }
 const drawn=reveal('KMR-2-001');
 const hand=drawn.state.players[1].hand.length;
 let state=dispatchUniversalAction(packs,drawn.state,{type:'chooseTrigger',mode:'draw'});
 assert.equal(state.players[1].hand.length,hand+1);
 assert.equal(state.players[1].outside.some(card=>card.uid===drawn.trigger.uid),true);
 assertUniversalMatch(packs,state);
 const gained=reveal('KMR-2-010');
 state=dispatchUniversalAction(packs,gained.state,{type:'chooseTrigger',mode:'get'});
 assert.equal(state.players[1].hand.some(card=>card.uid===gained.trigger.uid),true);
 assert.equal(state.players[1].outside.some(card=>card.uid===gained.trigger.uid),false);
 assertUniversalMatch(packs,state);
 const active=reveal('KMR-2-002');
 const mine=put(active.state,1,'KMR-1-010','front',0,false);
 state=dispatchUniversalAction(packs,active.state,{type:'chooseTrigger',mode:'active',uid:mine.uid});
 assert.equal(state.players[1].front[0].ready,true);
 assert.equal(universalBp(pack,state,state.players[1].front[0]),4000);
 assertUniversalMatch(packs,state);
 const raid=reveal('KMR-2-005');
 const raidChoices=legal(raid.state);
 assert.equal(raidChoices.some(action=>action.mode==='get'),true);
 assert.equal(raidChoices.some(action=>action.mode==='raid'),false);
 state=dispatchUniversalAction(packs,raid.state,{type:'chooseTrigger',mode:'get'});
 assert.equal(state.players[1].hand.filter(card=>card.uid===raid.trigger.uid).length,1);
 assert.equal(state.raidCount[1],0);
 assert.equal(state.pending?.kind==='life-trigger',false);
 assertUniversalMatch(packs,state);
 const color=reveal('KMR-2-011');
 const rested=color.state.players[0].front.find(card=>card?.uid===color.attacker.uid);
 state=dispatchUniversalAction(packs,color.state,{type:'chooseTrigger',mode:'colorRestSkip',uid:rested.uid});
 assert.equal(state.players[0].front.find(card=>card?.uid===rested.uid).ready,false);
 assert.equal(state.continuousStates.some(entry=>entry.kind==='skipNextActive'&&entry.targetUid===rested.uid),true);
 assert.equal(state.players[1].outside.filter(card=>card.uid===color.trigger.uid).length,1);
 assertUniversalMatch(packs,state);
 const special=reveal('KMR-2-015');
 state=dispatchUniversalAction(packs,special.state,{type:'chooseTrigger',mode:'special',uid:special.attacker.uid});
 assert.equal(state.players[0].front.some(card=>card?.uid===special.attacker.uid),false);
 assert.equal(state.players[0].outside.filter(card=>card.uid===special.attacker.uid).length,1);
 assert.equal(state.players[1].outside.filter(card=>card.uid===special.trigger.uid).length,1);
 assertUniversalMatch(packs,state);
 const finalLife=fresh(fill(['KMR-2-016',attackerId]));
 const finalAttacker=put(finalLife,0,attackerId,'front',0,true);
 const finalCard=take(finalLife,1,'KMR-2-016');
 finalLife.players[1].deck.push(...finalLife.players[1].life.splice(0));
 finalLife.players[1].life.push(finalCard);
 ready(finalLife);
 const top=finalLife.players[1].deck[0];
 let last=strike(finalLife,finalAttacker.uid);
 last=block(last,null);
 assert.equal(last.pending?.trigger,'final');
 last=dispatchUniversalAction(packs,last,{type:'chooseTrigger',mode:'final'});
 assert.equal(last.players[1].life[0]?.uid,top.uid);
 assert.equal(last.players[1].outside.filter(card=>card.uid===finalCard.uid).length,1);
 assert.equal(last.pending?.kind==='life-trigger',false);
 assertUniversalMatch(packs,last);
});

test('KMR-2-006 adds one yellow energy until the next own turn',()=>{
 const s=fresh(fill(['KMR-2-006','KMR-2-013'],{'KMR-2-013':3}));
 const caking=put(s,0,'KMR-2-006','energy',0,true);
 for(let slot=1;slot<=3;slot++)put(s,0,'KMR-2-013','energy',slot,true);
 ready(s);
 const before=universalCardEnergy(pack,s,0,caking);
 const state=act(s,action=>action.uid===caking.uid&&action.mode==='kmr2:KMR-2-006:a');
 assert.equal(state.pending,null);
 assert.equal(universalCardEnergy(pack,state,0,state.players[0].energy[0]),before+1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-009 moves an energy card outside when the line is full',()=>{
 const s=fresh(fill(['KMR-2-009','KMR-2-020','KMR-2-010','KMR-2-004','KMR-2-008','KMR-2-014']),1);
 const rider=put(s,0,'KMR-2-009','front',0,true);
 const occupied=['KMR-2-010','KMR-2-004','KMR-2-008','KMR-2-014'].map((id,slot)=>
  put(s,0,id,'energy',slot,true));
 const winner=put(s,1,'KMR-2-020','front',0,true);
 ready(s);
 let state=strike(s,winner.uid);
 state=block(state,rider.uid);
 assert.equal(state.pending?.id,'KMR-2-009');
 assert.equal(state.pending?.step,'shiftFull');
 assert.equal(state.players[0].front[0]?.uid,rider.uid);
 const target=occupied[1];
 state=click(state,action=>action.mode==='shift'&&action.uid===target.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].energy[1]?.uid,rider.uid);
 assert.equal(state.players[0].front.some(card=>card?.uid===rider.uid),false);
 assert.equal(state.players[0].outside.filter(card=>card.uid===target.uid).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-019 offers one optional draw after a non-yellow battle win',()=>{
 const s=fresh(fill(['KMR-2-019','KMR-2-022','KMR-2-006','KMR-2-010']));
 const attacker=put(s,0,'KMR-2-022','front',0,true);
 const ohma=put(s,0,'KMR-2-019','front',1,true);
 stackFaceUp(s,0,ohma,'KMR-2-006');
 const wall=put(s,1,'KMR-2-010','front',0,true);
 ready(s);
 park(s,0);
 const deck=s.players[0].deck.length;
 let state=strike(s,attacker.uid);
 state=block(state,wall.uid);
 assert.equal(state.pending?.id,'KMR-2-019');
 assert.equal(state.pending?.step,'mayDraw');
 state=click(state,action=>action.mode==='skip');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].deck.length,deck);
 assertUniversalMatch(packs,state);

 const drawn=fresh(fill(['KMR-2-019','KMR-2-022','KMR-2-006','KMR-2-010']));
 const blue=put(drawn,0,'KMR-2-022','front',0,true);
 const form=put(drawn,0,'KMR-2-019','front',1,true);
 stackFaceUp(drawn,0,form,'KMR-2-006');
 const low=put(drawn,1,'KMR-2-010','front',0,true);
 ready(drawn);
 park(drawn,0);
 const before=drawn.players[0].deck.length;
 let win=strike(drawn,blue.uid);
 win=block(win,low.uid);
 win=click(win,action=>action.mode==='draw');
 assert.equal(win.pending,null);
 assert.equal(win.players[0].deck.length,before-1);
 assert.equal(win.players[0].hand.length,1);
 assertUniversalMatch(packs,win);

 const yellowWin=fresh(fill(['KMR-2-019','KMR-2-020','KMR-2-006','KMR-2-010']));
 const mammoth=put(yellowWin,0,'KMR-2-020','front',0,true);
 const again=put(yellowWin,0,'KMR-2-019','front',1,true);
 stackFaceUp(yellowWin,0,again,'KMR-2-006');
 const blocker=put(yellowWin,1,'KMR-2-010','front',0,true);
 ready(yellowWin);
 let quiet=strike(yellowWin,mammoth.uid);
 quiet=block(quiet,blocker.uid);
 assert.equal(quiet.pending?.id==='KMR-2-019',false);
 assertUniversalMatch(packs,quiet);
});
