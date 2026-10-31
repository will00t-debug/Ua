import test from 'node:test';
import assert from 'node:assert/strict';
import {createKjnV2Pack} from '../dist/universal-v2/kjn-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp}
 from '../dist/universal-v2/engine.mjs';

const pack=createKjnV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required];
 for(const id of fillers){if(ids.length>=13)break;if(!ids.includes(id))ids.push(id);}
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function bury(s,p,card){
 if(!card||(card.stack||[]).some(x=>x&&x.faceDown!==true))return card;
 const deck=s.players[p].deck;
 if(!deck.length)throw Error('No deck card to place under '+card.cardId);
 const under=deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' '+(s.pending.step||'')+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||''));
 return use(s,action);
}
function fuel(s){
 put(s,0,'KJN-1-008','energy',0);
 put(s,0,'KJN-1-014','energy',1);
 put(s,0,'KJN-1-023','energy',2);
 put(s,0,'KJN-1-026','energy',3);
}
function purpleFuel(s){
 put(s,0,'KJN-1-041','energy',0);
 put(s,0,'KJN-1-055','energy',1);
 put(s,0,'KJN-1-061','energy',2);
 put(s,0,'KJN-1-064','energy',3);
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}
function drawCopy(s,p,id){
 for(const zone of ['deck','life']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing deck/life '+id);
}
const YELLOW=['KJN-1-008','KJN-1-014','KJN-1-023','KJN-1-026'];
const PURPLE=['KJN-1-041','KJN-1-055','KJN-1-061','KJN-1-064'];

test('Q2108 only one Alexia main can activate when two copies entered this turn',()=>{
 const counts=countsFor(['KJN-1-012',...YELLOW]);
 let s=toPhase(fresh(counts,2108),'main');
 readyAp(s);
 dumpHand(s);
 fuel(s);
 const first=drawCopy(s,0,'KJN-1-008');
 const second=drawCopy(s,0,'KJN-1-008');
 const payment=drawCopy(s,0,'KJN-1-012');
 s.players[0].hand.push(first,second,payment);
 s=play(s,first.uid,'play','front');
 s=play(s,second.uid,'play','front');
 s=use(s,{type:'activate',uid:first.uid,mode:'kjn:0'});
 s=choose(s,a=>a.uid===payment.uid);
 assert.equal(s.players[0].nextRemovedApCut.amount,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 assertUniversalMatch(packs,s);
});

test('Q2115 can add the energy-1 Claire raid base when the facedown Claire retires',()=>{
 const counts=countsFor(['KJN-1-016','KJN-1-012','KJN-1-037','KJN-1-043',...YELLOW]);
 let s=toPhase(fresh(counts,2115),'main');
 readyAp(s);
 fuel(s);
 put(s,0,'KJN-1-043','front',0);
 const claire=put(s,1,'KJN-1-016','front',0,true);
 const base=take(s,1,'KJN-1-012');
 base.stack=[];base.under=[];base.faceDown=false;base.ready=false;
 const down=take(s,1,'KJN-1-008');
 down.faceDown=true;down.stack=[];down.under=[];down.ready=false;
 claire.stack=[base];claire.under=[down];claire.raidBaseUid=base.uid;
 assert.equal(universalBp(packs,s,claire),5000);
 const spell=toHand(s,0,'KJN-1-037');
 s=play(s,spell.uid,'event');
 assert.equal(s.pending.step,'retire');
 s=choose(s,a=>a.uid===claire.uid);
 assert.equal(s.pending.kind,'kjn');
 assert.equal(s.pending.step,'recoverClaire');
 assert.equal(s.pending.player,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===base.uid),true);
 s=choose(s,a=>a.uid===base.uid);
 assert.equal(s.players[1].hand.some(c=>c.uid===base.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===down.uid),true);
 assertUniversalMatch(packs,s);
});

test('Q2116 the second attack of that Claire can be passed',()=>{
 const counts=countsFor(['KJN-1-016','KJN-1-047','KJN-1-012',...YELLOW]);
 let s=toPhase(fresh(counts,2116),'main');
 readyAp(s);
 fuel(s);
 put(s,0,'KJN-1-047','front',0);
 const claire=bury(s,0,toHand(s,0,'KJN-1-016'));
 s=play(s,claire.uid);
 const live=s.players[0].front.find(c=>c?.uid===claire.uid);
 const down=take(s,0,'KJN-1-008');
 down.faceDown=true;down.stack=[];down.under=[];down.ready=false;
 live.under=[down];
 live.ready=true;
 s=toPhase(s,'attack');
 const wall=put(s,1,'KJN-1-012','front',0,true);
 put(s,1,'KJN-1-012','front',1,true);
 s=use(s,{type:'attack',uid:claire.uid});
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseBlock'&&a.uid===null),false);
 s=choose(s,a=>a.uid===wall.uid);
 const again=s.players[0].front.find(c=>c?.uid===claire.uid);
 assert.equal(again.ready,true);
 s=toPhase(s,'attack');
 s=use(s,{type:'attack',uid:claire.uid});
 assert.equal(s.pending.kind,'block');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='chooseBlock'&&a.uid===null),true);
 assertUniversalMatch(packs,s);
});

test('Q2118 activates Beatrix, and Q2119 the second copy does not',()=>{
 const counts=countsFor(['KJN-1-028','KJN-1-049',...YELLOW]);
 let s=toPhase(fresh(counts,2118),'main');
 readyAp(s);
 fuel(s);
 put(s,1,'KJN-1-049','front',0,true);
 const first=toHand(s,0,'KJN-1-028');
 s=play(s,first.uid);
 const live=s.players[0].front.find(c=>c?.uid===first.uid);
 assert.equal(live.ready,true);
 assert.equal(s.pending.step,'restFoe');
 s=choose(s,a=>a.mode==='skip');
 const second=toHand(s,0,'KJN-1-028');
 s=play(s,second.uid);
 const later=s.players[0].front.find(c=>c?.uid===second.uid);
 assert.equal(later.ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('Q2120 from removed still grants BP+1000 without Rose on the field',()=>{
 const counts=countsFor(['KJN-1-037','KJN-1-009','KJN-1-012',...YELLOW]);
 let s=toPhase(fresh(counts,2120),'main');
 readyAp(s);
 fuel(s);
 const miller=put(s,0,'KJN-1-009','front',0,true);
 const spell=take(s,0,'KJN-1-037');
 s.players[0].deck.unshift(spell);
 bury(s,0,miller);
 s=use(s,{type:'activate',uid:miller.uid,mode:'kjn:0'});
 const removed=s.players[0].removed.find(c=>c.uid===spell.uid);
 assert.equal(removed.kjnRemovedPlay,s.turn);
 const foe=put(s,1,'KJN-1-012','front',0,true);
 const ally=s.players[0].energy[0];
 s=play(s,spell.uid,'event');
 assert.equal(s.pending.step,'retire');
 s=choose(s,a=>a.uid===foe.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===foe.uid),true);
 assert.equal(s.pending.step,'buff');
 s=choose(s,a=>a.uid===ally.uid);
 assert.equal((s.players[0].energy.find(c=>c?.uid===ally.uid).buffs||[]).some(b=>b.bp===1000&&b.untilTurn===s.turn),true);
 assertUniversalMatch(packs,s);
});

test('Q2122 an opponent effect cannot choose the taxed character without a hand card',()=>{
 const counts=countsFor(['KJN-1-037','KJN-1-012','KJN-1-065',...YELLOW]);
 let blocked=toPhase(fresh(counts,2122),'main');
 readyAp(blocked);
 fuel(blocked);
 dumpHand(blocked);
 const only=toHand(blocked,0,'KJN-1-037');
 const taxed=put(blocked,1,'KJN-1-012','front',0,true);
 taxed.kjnSelectTax={turn:blocked.turn};
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===only.uid),false);
 assertUniversalMatch(packs,blocked);

 let paid=toPhase(fresh(counts,21221),'main');
 readyAp(paid);
 fuel(paid);
 const spell=toHand(paid,0,'KJN-1-037');
 const extra=toHand(paid,0,'KJN-1-065');
 const victim=put(paid,1,'KJN-1-012','front',0,true);
 victim.kjnSelectTax={turn:paid.turn};
 const open=put(paid,1,'KJN-1-065','front',1,true);
 paid=play(paid,spell.uid,'event');
 assert.equal(paid.pending.step,'retire');
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===victim.uid),true);
 assert.equal(legalUniversalActions(packs,paid).some(a=>a.uid===open.uid),true);
 paid=choose(paid,a=>a.uid===victim.uid);
 assert.equal(paid.pending.kind,'effect-selection-hand-payment');
 paid=choose(paid,a=>a.uid===extra.uid);
 assert.equal(paid.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(paid.players[0].outside.some(c=>c.uid===extra.uid),true);
 assert.equal(paid.players[1].front.some(c=>c?.uid===open.uid),true);
 assertUniversalMatch(packs,paid);
});

test('Q2123 the second Shadow on play does not activate after the first one did',()=>{
 const counts=countsFor(['KJN-1-047','KJN-1-012',...PURPLE]);
 let s=toPhase(fresh(counts,2123),'main');
 readyAp(s);
 purpleFuel(s);
 for(let i=0;i<10;i++)s.players[0].outside.push(s.players[0].deck.pop());
 const first=toHand(s,0,'KJN-1-047');
 s=play(s,first.uid);
 assert.equal(s.pending.step,'mayActive');
 s=choose(s,a=>a.mode==='skip');
 const second=toHand(s,0,'KJN-1-047');
 s=play(s,second.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c?.uid===second.uid).ready,false);
 assertUniversalMatch(packs,s);
});

test('Q2124 recovery uses printed required energy, so the same number cannot be chosen twice',()=>{
 const counts=countsFor(['KJN-1-049','KJN-1-042','KJN-1-050','KJN-1-012','KJN-1-001',...PURPLE]);
 let s=toPhase(fresh(counts,2124),'main');
 readyAp(s);
 purpleFuel(s);
 const low=[take(s,0,'KJN-1-042'),take(s,0,'KJN-1-042')];
 const high=take(s,0,'KJN-1-050');
 const fillers=[...Array.from({length:4},()=>take(s,0,'KJN-1-012')),
  ...Array.from({length:3},()=>take(s,0,'KJN-1-001'))];
 s.players[0].outside.push(...low,...fillers,high);
 const shadow=bury(s,0,toHand(s,0,'KJN-1-049'));
 s=play(s,shadow.uid);
 assert.equal(s.pending.step,'recoverEnergy');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===low[0].uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===low[1].uid),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===high.uid),true);
 s=choose(s,a=>a.uid===low[0].uid);
 assert.equal(s.pending.step,'recoverEnergy');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===low[1].uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===high.uid),true);
 s=choose(s,a=>a.uid===high.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===low[0].uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===high.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===low[1].uid),true);
 assertUniversalMatch(packs,s);
});

test('Q2125 a raid card does not spend the next non-raid hand discount',()=>{
 const counts=countsFor(['KJN-1-049','KJN-1-074','KJN-1-065',...PURPLE]);
 let s=toPhase(fresh(counts,2125),'main');
 readyAp(s);
 purpleFuel(s);
 const shadow=toHand(s,0,'KJN-1-049');
 const raid=toHand(s,0,'KJN-1-074');
 const plain=toHand(s,0,'KJN-1-065');
 bury(s,0,shadow);
 bury(s,0,raid);
 s=play(s,shadow.uid);
 assert.equal(s.pending,null);
 assert.equal(apReady(s),2);
 s=play(s,raid.uid);
 assert.equal(s.pending.step,'betaDeploy');
 s=choose(s,a=>a.mode==='skip');
 assert.equal(apReady(s),1);
 assert.equal(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'&&!e.consumed),true);
 s=play(s,plain.uid);
 assert.equal(apReady(s),1);
 assert.equal(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'),false);
 assertUniversalMatch(packs,s);
});

test('Q2126 two raided Alphas share one main activation',()=>{
 const counts=countsFor(['KJN-1-056','KJN-1-012']);
 let s=toPhase(fresh(counts,2126),'main');
 const first=bury(s,0,put(s,0,'KJN-1-056','front',0,true));
 const second=bury(s,0,put(s,0,'KJN-1-056','front',1,true));
 s=use(s,{type:'activate',uid:first.uid,mode:'kjn:0'});
 assert.equal(s.pending,null);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid),false);
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).impactGranted.turn,s.turn);
 assertUniversalMatch(packs,s);
});

test('Q2127 the second Delta on play does not activate after the first one did',()=>{
 const counts=countsFor(['KJN-1-069','KJN-1-052','KJN-1-057','KJN-1-059','KJN-1-062','KJN-1-065',...PURPLE]);
 let s=toPhase(fresh(counts,2127),'main');
 readyAp(s);
 put(s,0,'KJN-1-052','front',0);
 put(s,0,'KJN-1-057','front',1);
 put(s,0,'KJN-1-059','front',2);
 put(s,0,'KJN-1-062','front',3);
 put(s,0,'KJN-1-065','energy',0);
 put(s,0,'KJN-1-041','energy',1);
 put(s,0,'KJN-1-055','energy',2);
 const first=toHand(s,0,'KJN-1-069');
 s=play(s,first.uid,'play','energy');
 assert.equal(s.players[0].energy.find(c=>c?.uid===first.uid).ready,true);
 const occupied=s.players[0].front[0];
 const second=toHand(s,0,'KJN-1-069');
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===second.uid&&
  a.line==='front'&&a.replaceUid===occupied.uid);
 if(!action)throw Error('No replace play');
 s=use(s,action);
 const later=s.players[0].front.find(c=>c?.uid===second.uid);
 assert.equal(later.ready,false);
 assert.equal(later.sniperGranted,undefined);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});
