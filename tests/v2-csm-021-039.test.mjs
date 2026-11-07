import test from 'node:test';
import assert from 'node:assert/strict';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp}
 from '../dist/universal-v2/engine.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {controllerDeckWindowCards} from '../dist/universal-v2/preview-actions.mjs';
import {csmAlsoEventAuraLive,csmCardCountsAsEvent,csmEventUseCount}
 from '../dist/universal-v2/csm-continuous.mjs';
import {handPlayApPlan} from '../dist/universal-v2/ap-discounts.mjs';
import {appendCompletedMove} from '../dist/universal-v2/zone-move-events.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {runCsmJob} from '../dist/universal-v2/csm-runtime.mjs';

const pack=createCsmV2Pack();
const packs=[pack,pack];
const printed=c=>pack.cards[c.cardId];

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
function toOutside(s,p,id){
 const card=take(s,p,id);
 s.players[p].outside.push(card);
 return card;
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=use(s,{type:'next'});
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
function fuel(s){
 put(s,0,'CSM-1-008','energy',0);
 put(s,0,'CSM-1-001','energy',1);
 put(s,0,'CSM-1-002','energy',2);
 put(s,0,'CSM-1-003','energy',3);
}
function freeEnergy(s,p=0,slot=3){
 const card=s.players[p].energy[slot];
 if(!card)return null;
 s.players[p].energy[slot]=null;
 s.players[p].deck.push(card);
 return card;
}
function dumpHand(s,p=0){
 while(s.players[p].hand.length)s.players[p].deck.push(s.players[p].hand.pop());
}
function play(s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined&&a.baseUid===undefined);
 if(!action)throw Error('No '+type+' '+line+' for '+uid+' pending '+s.pending?.kind);
 return use(s,action);
}
function choose(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+(s.pending?.step||'')+
  ' '+JSON.stringify((s.pending?.actions||s.pending?.choices||[]).slice?.(0,8)));
 return use(s,action);
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function top(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function retireDenji(s,p=0,id='CSM-1-006'){
 const denji=put(s,p,id,'front',1);
 s.players[p].front[1]=null;
 s.players[p].outside.push(denji);
 appendCompletedMove(s,{uid:denji.uid,cardId:denji.cardId,owner:p,controller:p,
  from:'front',to:'outside',reason:'retirement'});
 return denji;
}
function bury(card,s,p){
 const under=s.players[p].deck.pop();
 under.faceDown=false;
 card.stack=[under];
 return card;
}
function revealLife(s,defender,id){
 const trigger=take(s,defender,id);
 const buried=s.players[defender].life[0];
 s.players[defender].life[0]=trigger;
 s.players[defender].deck.push(buried);
 return trigger;
}
function open(seed,required){
 const counts=countsFor(required);
 let s=toPhase(fresh(counts,seed),'main');
 readyAp(s);fuel(s);dumpHand(s);
 return s;
}

test('CSM-1-021 looks at three, moves at most one outside, and orders the rest on top',()=>{
 let s=open(1021,['CSM-1-021','CSM-1-001','CSM-1-025','CSM-1-036','CSM-1-008']);
 const [kobeni,event,reze]=top(s,0,['CSM-1-001','CSM-1-036','CSM-1-025']);
 const makima=toHand(s,0,'CSM-1-021');
 s=play(s,makima.uid);
 assert.equal(s.pending?.kind,'effect-top-inspect-many');
 assert.deepEqual(s.pending.uids,[kobeni.uid,event.uid,reze.uid]);
 assert.equal(s.pending.maxOutside,1);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.deepEqual(shown.map(c=>c.cardId),['CSM-1-001','CSM-1-036','CSM-1-025']);
 assert.equal(shown.every(c=>c.cardId),true);
 s=choose(s,a=>a.type==='chooseInspectedOutside'&&a.uid===event.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===event.uid),false);
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending.rest,'top');
 assert.deepEqual(s.pending.uids,[kobeni.uid,reze.uid]);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===reze.uid);
 s=choose(s,a=>a.type==='chooseTopOrder'&&a.uid===kobeni.uid);
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[reze.uid,kobeni.uid]);
 assertUniversalMatch(packs,s);

 let skipped=open(1022,['CSM-1-021','CSM-1-001','CSM-1-025','CSM-1-036','CSM-1-008']);
 const window=top(skipped,0,['CSM-1-001','CSM-1-036','CSM-1-025']);
 const again=toHand(skipped,0,'CSM-1-021');
 skipped=play(skipped,again.uid);
 skipped=choose(skipped,a=>a.type==='chooseInspectedOutside'&&a.uid===null);
 assert.equal(skipped.players[0].outside.some(c=>window.some(w=>w.uid===c.uid)),false);
 skipped=choose(skipped,a=>a.uid===window[2].uid);
 skipped=choose(skipped,a=>a.uid===window[0].uid);
 skipped=choose(skipped,a=>a.uid===window[1].uid);
 assert.deepEqual(skipped.players[0].deck.slice(0,3).map(c=>c.uid),
  [window[2].uid,window[0].uid,window[1].uid]);
 assertUniversalMatch(packs,skipped);
});

test('CSM-1-022 event identity is live in every zone and is not retroactive',()=>{
 let s=open(2022,['CSM-1-022','CSM-1-001','CSM-1-036','CSM-1-039','CSM-1-008']);
 const early=toHand(s,0,'CSM-1-001');
 s=play(s,early.uid);
 const makima=toHand(s,0,'CSM-1-022');
 s=play(s,makima.uid);
 assert.equal(csmEventUseCount(s,0,printed),0);
 assert.equal(csmAlsoEventAuraLive(s,0,printed),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===makima.uid),false);
 const outside=toOutside(s,0,'CSM-1-001');
 const deckCard=s.players[0].deck.find(c=>c.cardId==='CSM-1-001');
 assert.equal(csmCardCountsAsEvent(s,0,pack.cards['CSM-1-001'],printed),true);
 assert.equal(csmCardCountsAsEvent(s,0,printed(deckCard),printed),true);
 assert.equal(csmCardCountsAsEvent(s,0,printed(outside),printed),true);
 assert.equal(csmCardCountsAsEvent(s,0,pack.cards['CSM-1-022'],printed),false);
 const slot=s.players[0].front.findIndex(c=>c?.uid===makima.uid);
 const displaced=s.players[0].energy[0];
 s.players[0].front[slot]=null;
 s.players[0].energy[0]=makima;
 assert.equal(csmAlsoEventAuraLive(s,0,printed),false);
 assert.equal(csmCardCountsAsEvent(s,0,pack.cards['CSM-1-001'],printed),false);
 s.players[0].energy[0]=displaced;
 s.players[0].front[slot]=makima;
 const event=toHand(s,0,'CSM-1-036');
 s=play(s,event.uid,'event');
 if(s.pending?.kind==='effect-recover-ap')s=choose(s,a=>a.uid===null);
 assert.equal(csmEventUseCount(s,0,printed),1);
 const ally=live(s,0,early.uid);
 makima.ready=false;
 s=choose(s,a=>a.type==='activate'&&a.uid===makima.uid);
 s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
 const granted=live(s,0,ally.uid);
 assert.equal(granted.impactGranted.amount,1);
 assert.equal(granted.impactGranted.turn,s.turn);
 assert.equal(granted.impactGranted.stamp,granted.fieldEntryStamp);
 assert.equal(live(s,0,makima.uid).impactGranted,undefined);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===makima.uid),false);
 assertUniversalMatch(packs,s);
});

test('CSM-1-023 main abilities stay inside the raid frame',()=>{
 let s=open(2023,['CSM-1-023','CSM-1-022','CSM-1-001','CSM-1-037','CSM-1-039','CSM-1-008']);
 const plain=put(s,0,'CSM-1-023','front',0);
 toOutside(s,0,'CSM-1-037');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===plain.uid),false);
 bury(plain,s,0);
 const purple=toOutside(s,0,'CSM-1-001');
 const special=toOutside(s,0,'CSM-1-039');
 const event=s.players[0].outside.find(c=>c.cardId==='CSM-1-037');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===plain.uid&&a.mode==='csm:0'),true);
 s=choose(s,a=>a.type==='activate'&&a.uid===plain.uid&&a.mode==='csm:0');
 assert.equal(s.pending.actions.some(a=>a.uid===purple.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===special.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===event.uid),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 s=choose(s,a=>a.mode==='take'&&a.uid===event.uid);
 const second=bury(put(s,0,'CSM-1-023','front',1),s,0);
 put(s,0,'CSM-1-022','front',2);
 const purpleAgain=toOutside(s,0,'CSM-1-001');
 s=choose(s,a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='csm:0');
 assert.equal(s.pending.actions.some(a=>a.uid===purpleAgain.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===special.uid),false);
 s=choose(s,a=>a.mode==='take'&&a.uid===purpleAgain.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===purpleAgain.uid),true);
 s=play(s,purpleAgain.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===plain.uid&&a.mode==='csm:1'),true);
 s=choose(s,a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='csm:1');
 s=choose(s,a=>a.mode==='pick'&&a.uid===plain.uid);
 assert.equal(universalBp(packs,s,live(s,0,plain.uid)),pack.cards['CSM-1-023'].bp+1000);
 assert.equal(universalBp(packs,s,live(s,0,second.uid)),pack.cards['CSM-1-023'].bp);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===second.uid&&a.mode==='csm:1'),false);
 assertUniversalMatch(packs,s);
});

test('Q2081 CSM-1-024 keeps the next qualifying discount after a non-match',()=>{
 let s=open(2081,['CSM-1-024','CSM-1-022','CSM-1-039','CSM-1-037','CSM-1-008']);
 const makima=toHand(s,0,'CSM-1-024');
 s=play(s,makima.uid);
 s=choose(s,a=>a.mode==='draw');
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-037']).cost,0);
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-001']).cost,0);
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-039']).cost,1);
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-022']).cost,1);
 const slot=s.players[0].front.findIndex(c=>c?.uid===makima.uid);
 const displaced=s.players[0].energy[0];
 s.players[0].front[slot]=null;
 s.players[0].energy[0]=makima;
 assert.equal(csmAlsoEventAuraLive(s,0,printed),false);
 s.players[0].energy[0]=displaced;
 s.players[0].front[slot]=makima;
 assert.equal(csmAlsoEventAuraLive(s,0,printed),true);
 const otherMakima=toHand(s,0,'CSM-1-022');
 s=play(s,otherMakima.uid);
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-037']).cost,0);
 const bomb=toHand(s,0,'CSM-1-039');
 s=play(s,bomb.uid,'event');
 assert.equal(s.pending,null);
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-037']).cost,0);
 const date=toHand(s,0,'CSM-1-037');
 const before=s.players[0].apCards.filter(a=>a.ready).length;
 s=play(s,date.uid,'event');
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,before);
 assert.equal(handPlayApPlan(s,0,pack.cards['CSM-1-037']).cost,1);
 if(s.pending?.step==='choose')s=choose(s,a=>a.mode==='draw');
 if(s.pending?.step==='discard')s=choose(s,a=>a.mode==='discard');
 assertUniversalMatch(packs,s);

 let aura=open(2082,['CSM-1-024','CSM-1-001','CSM-1-008']);
 const source=toHand(aura,0,'CSM-1-024');
 aura=play(aura,source.uid);
 aura=choose(aura,a=>a.mode==='draw');
 const purple=toHand(aura,0,'CSM-1-001');
 const ready=aura.players[0].apCards.filter(a=>a.ready).length;
 aura=play(aura,purple.uid);
 assert.equal(aura.players[0].apCards.filter(a=>a.ready).length,ready);
 assert.equal(handPlayApPlan(aura,0,pack.cards['CSM-1-037']).cost,1);
 assertUniversalMatch(packs,aura);
});

test('CSM-1-023, 024 and 031 raid an energy-line base onto the front, active',()=>{
 for(const id of ['CSM-1-023','CSM-1-024','CSM-1-031']){
  const baseId=id==='CSM-1-031'?'CSM-1-025':'CSM-1-022';
  let s=open(2300+Number(id.slice(-2)),[id,baseId,'CSM-1-001','CSM-1-008']);
  const parked=s.players[0].energy[3];
  s.players[0].energy[3]=null;
  s.players[0].hand.push(parked);
  const base=put(s,0,baseId,'energy',3,false);
  const ally=put(s,0,'CSM-1-001','front',1);
  const foe=id==='CSM-1-031'?put(s,1,'CSM-1-001','front',0):null;
  const topCard=toHand(s,0,id);
  const raid=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===topCard.uid&&
   a.baseUid===base.uid&&a.slot===0&&(a.line===undefined||a.line==='front'));
  assert.ok(raid,id);
  s=use(s,raid);
  const entered=s.players[0].front[0];
  assert.equal(entered?.uid,topCard.uid);
  assert.equal(entered.ready,true);
  assert.equal(entered.stack?.[0]?.uid,base.uid);
  assert.equal(s.players[0].energy[3],null);
  if(id==='CSM-1-023')assert.equal(s.pending,null);
  if(id==='CSM-1-024'){
   assert.equal(s.pending?.step,'choose');
   s=choose(s,a=>a.mode==='buff');
   assert.equal(s.pending.actions.some(a=>a.uid===entered.uid),false);
   s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
   assert.equal(universalBp(packs,s,live(s,0,ally.uid)),pack.cards['CSM-1-001'].bp+2000);
  }
  if(id==='CSM-1-031'){
   assert.equal(s.pending?.step,'choose');
   assert.equal(s.pending.actions.some(a=>a.mode==='debuff'),true);
   assert.equal(s.pending.actions.some(a=>a.mode==='ap'),false);
   s=choose(s,a=>a.mode==='debuff');
   assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
   s=choose(s,a=>a.mode==='skip');
   assert.equal(universalBp(packs,s,live(s,1,foe.uid)),pack.cards['CSM-1-001'].bp);
  }
  assertUniversalMatch(packs,s);
 }
});

test('CSM-1-025 has no printed effect and CSM-1-026 draws before the hand leaves',()=>{
 let vanilla=open(1025,['CSM-1-025','CSM-1-008','CSM-1-001']);
 const reze=toHand(vanilla,0,'CSM-1-025');
 const hand=vanilla.players[0].hand.length;
 vanilla=play(vanilla,reze.uid);
 assert.equal(vanilla.pending,null);
 assert.equal(vanilla.players[0].hand.length,hand-1);
 assert.equal(live(vanilla,0,reze.uid).cardId,'CSM-1-025');
 assertUniversalMatch(packs,vanilla);

 let s=open(1026,['CSM-1-026','CSM-1-001','CSM-1-008']);
 const actor=toHand(s,0,'CSM-1-026');
 const keep=toHand(s,0,'CSM-1-001');
 const before=s.players[0].hand.length;
 const deck=s.players[0].deck.length;
 s=play(s,actor.uid);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,before);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.choices?.includes(keep.uid)||
  legalUniversalActions(packs,s).some(a=>a.uid===keep.uid),true);
 const drawn=s.players[0].hand.find(c=>c.uid!==keep.uid&&c.uid!==actor.uid);
 s=choose(s,a=>a.uid===drawn.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===drawn.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===keep.uid),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-027 gains BP only on the owner turn after own Denji retires',()=>{
 let s=open(1027,['CSM-1-027','CSM-1-006','CSM-1-004','CSM-1-001','CSM-1-008']);
 const reze=put(s,0,'CSM-1-027','front',0);
 assert.equal(universalBp(packs,s,reze),3000);
 const bounced=put(s,0,'CSM-1-004','front',2);
 s.players[0].front[2]=null;
 s.players[0].hand.push(bounced);
 appendCompletedMove(s,{uid:bounced.uid,cardId:bounced.cardId,owner:0,controller:0,
  from:'front',to:'hand',reason:'rule'});
 assert.equal(universalBp(packs,s,live(s,0,reze.uid)),3000);
 const foe=put(s,1,'CSM-1-006','front',0);
 s.players[1].front[0]=null;
 s.players[1].outside.push(foe);
 appendCompletedMove(s,{uid:foe.uid,cardId:foe.cardId,owner:1,controller:1,
  from:'front',to:'outside',reason:'retirement'});
 assert.equal(universalBp(packs,s,live(s,0,reze.uid)),3000);
 retireDenji(s,0);
 assert.equal(universalBp(packs,s,live(s,0,reze.uid)),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,live(s,0,reze.uid)),3000);
 s.active=0;
 assert.equal(universalBp(packs,s,live(s,0,reze.uid)),4000);
 assertUniversalMatch(packs,s);
});

test('Q2082 CSM-1-028 rests a legal card and does not offer raid or a front field',()=>{
 let s=open(2082,['CSM-1-028','CSM-1-033','CSM-1-026','CSM-1-016','CSM-1-001','CSM-1-004','CSM-1-008']);
 const cafe=toHand(s,0,'CSM-1-033');
 const reze=toHand(s,0,'CSM-1-026');
 const bomb=toHand(s,0,'CSM-1-016');
 const kobeni=toHand(s,0,'CSM-1-001');
 const denji=toHand(s,0,'CSM-1-004');
 const host=toHand(s,0,'CSM-1-028');
 s=play(s,host.uid);
 assert.equal(s.pending?.step,'deploy');
 const acts=s.pending.actions;
 assert.equal(acts.some(a=>a.uid===cafe.uid&&a.line==='front'),false);
 assert.equal(acts.some(a=>a.uid===cafe.uid&&a.line==='energy'),true);
 assert.equal(acts.some(a=>a.uid===reze.uid&&a.line==='front'),true);
 assert.equal(acts.some(a=>a.uid===reze.uid&&a.line==='energy'),true);
 assert.equal(acts.some(a=>a.uid===denji.uid),true);
 assert.equal(acts.some(a=>a.uid===bomb.uid||a.uid===kobeni.uid),false);
 assert.equal(acts.some(a=>a.baseUid||a.mode==='raid'),false);
 assert.equal(acts.some(a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='deploy'&&a.uid===reze.uid&&a.line==='front'&&a.replaceUid===undefined);
 const entered=live(s,0,reze.uid);
 assert.equal(entered.ready,false);
 assert.equal(entered.stack?.length||0,0);
 assert.equal(s.pending?.kind,'effect-discard');
 assertUniversalMatch(packs,s);
});

test('Q2083 CSM-1-029 draws at the block decision, before life damage',()=>{
 const counts=countsFor(['CSM-1-029','CSM-1-006','CSM-1-005','CSM-1-001','CSM-1-008']);
 let s=toPhase(fresh(counts,2083),'attack');
 dumpHand(s);
 const reze=put(s,0,'CSM-1-029','front',0,true);
 retireDenji(s);
 const hand=s.players[0].hand.length;
 const life=s.players[1].life.length;
 s=use(s,{type:'attack',uid:reze.uid});
 assert.equal(s.pending?.kind,'block');
 assert.equal(s.players[0].hand.length,hand);
 s=use(s,{type:'chooseBlock',uid:null});
 assert.equal(s.players[0].hand.length,hand+1);
 assert.ok(s.pending?.kind==='life-trigger'||s.players[1].life.length<life);
 assertUniversalMatch(packs,s);

 let blocked=toPhase(fresh(counts,2084),'attack');
 dumpHand(blocked);
 const attacker=put(blocked,0,'CSM-1-029','front',0,true);
 retireDenji(blocked);
 const blocker=put(blocked,1,'CSM-1-001','front',0,true);
 const before=blocked.players[0].hand.length;
 blocked=use(blocked,{type:'attack',uid:attacker.uid});
 blocked=use(blocked,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(blocked.players[0].hand.length,before);
 assertUniversalMatch(packs,blocked);

 let quiet=toPhase(fresh(counts,2085),'attack');
 dumpHand(quiet);
 const silent=put(quiet,0,'CSM-1-029','front',0,true);
 retireDenji(quiet);
 grantContinuousState(quiet,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:silent.uid,targetUid:silent.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 const still=quiet.players[0].hand.length;
 quiet=use(quiet,{type:'attack',uid:silent.uid});
 quiet=use(quiet,{type:'chooseBlock',uid:null});
 assert.equal(quiet.players[0].hand.length,still);
 assertUniversalMatch(packs,quiet);

 let absent=toPhase(fresh(counts,2090),'attack');
 dumpHand(absent);
 const lonely=put(absent,0,'CSM-1-029','front',0,true);
 const unchanged=absent.players[0].hand.length;
 absent=use(absent,{type:'attack',uid:lonely.uid});
 absent=use(absent,{type:'chooseBlock',uid:null});
 assert.equal(absent.players[0].hand.length,unchanged);
 assertUniversalMatch(packs,absent);
});

test('CSM-1-030 follow-up waits until the chosen character actually leaves',()=>{
 let s=open(1030,['CSM-1-030','CSM-1-001','CSM-1-006','CSM-1-008']);
 const ally=put(s,0,'CSM-1-001','front',1);
 const reze=toHand(s,0,'CSM-1-030');
 const hand=s.players[0].hand.length;
 s=play(s,reze.uid);
 assert.equal(s.pending?.step,'retireThenChoose');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(s.pending.actions.some(a=>a.uid===reze.uid),false);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,hand-1);
 assertUniversalMatch(packs,s);

 let paid=open(1031,['CSM-1-030','CSM-1-001','CSM-1-025','CSM-1-008']);
 const target=put(paid,0,'CSM-1-025','front',1);
 const other=put(paid,0,'CSM-1-001','front',2);
 const actor=toHand(paid,0,'CSM-1-030');
 paid=play(paid,actor.uid);
 paid=choose(paid,a=>a.mode==='pick'&&a.uid===target.uid);
 assert.equal(paid.pending?.step,'afterRetireChoose');
 const drawn=paid.players[0].hand.length;
 paid=choose(paid,a=>a.mode==='one');
 assert.equal(paid.players[0].hand.length,drawn+1);
 assert.equal(paid.pending?.step,'buffOther2k');
 assert.equal(paid.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(paid.pending.actions.some(a=>a.uid===actor.uid),false);
 paid=choose(paid,a=>a.mode==='pick'&&a.uid===other.uid);
 assert.equal(universalBp(packs,paid,live(paid,0,other.uid)),pack.cards['CSM-1-001'].bp+2000);
 assertUniversalMatch(packs,paid);

 let sub=open(1032,['CSM-1-030','CSM-1-061','CSM-1-024','CSM-1-008','CSM-1-001']);
 const power=bury(put(sub,0,'CSM-1-061','front',0),sub,0);
 const stand=put(sub,0,'CSM-1-024','front',1);
 const host=toHand(sub,0,'CSM-1-030');
 sub=play(sub,host.uid);
 sub=choose(sub,a=>a.mode==='pick'&&a.uid===power.uid);
 assert.equal(sub.pending?.step,'leaveReplace');
 const held=sub.players[0].hand.length;
 sub=choose(sub,a=>a.mode==='pick'&&a.uid===stand.uid);
 assert.equal(sub.players[0].front.some(c=>c?.uid===power.uid),true);
 assert.equal(sub.players[0].outside.some(c=>c.uid===stand.uid),true);
 assert.equal(sub.pending?.step==='afterRetireChoose',false);
 assert.equal(sub.players[0].hand.length,held);
 assertUniversalMatch(packs,sub);

 let declined=open(1033,['CSM-1-030','CSM-1-061','CSM-1-024','CSM-1-008','CSM-1-001']);
 const body=bury(put(declined,0,'CSM-1-061','front',0),declined,0);
 put(declined,0,'CSM-1-024','front',1);
 const card=toHand(declined,0,'CSM-1-030');
 declined=play(declined,card.uid);
 declined=choose(declined,a=>a.mode==='pick'&&a.uid===body.uid);
 declined=choose(declined,a=>a.mode==='skip');
 assert.equal(declined.players[0].outside.some(c=>c.uid===body.uid),true);
 assert.equal(declined.pending?.step,'afterRetireChoose');
 const two=declined.players[0].hand.length;
 declined=choose(declined,a=>a.mode==='two');
 assert.equal(declined.players[0].hand.length,two+2);
 assertUniversalMatch(packs,declined);
});

test('Q2084 CSM-1-031 locks only the AP branch, and only on the owner turn',()=>{
 let s=open(2086,['CSM-1-031','CSM-1-006','CSM-1-001','CSM-1-008']);
 retireDenji(s);
 const foe=put(s,1,'CSM-1-001','front',0);
 const first=toHand(s,0,'CSM-1-031');
 const hand=s.players[0].hand.length;
 s=play(s,first.uid);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.pending.actions.some(a=>a.mode==='debuff'),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='ap'),true);
 s=choose(s,a=>a.mode==='debuff');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='skip');
 const second=toHand(s,0,'CSM-1-031');
 s=play(s,second.uid);
 assert.equal(s.pending.actions.some(a=>a.mode==='ap'),true);
 s=choose(s,a=>a.mode==='ap');
 if(s.pending?.step==='ap')s=choose(s,a=>a.mode==='ap');
 const third=toHand(s,0,'CSM-1-031');
 s=play(s,third.uid);
 assert.equal(s.pending.actions.some(a=>a.mode==='ap'),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='debuff'),true);
 s=choose(s,a=>a.mode==='debuff');
 s=choose(s,a=>a.mode==='pick'&&a.uid===foe.uid);
 assert.equal(universalBp(packs,s,live(s,1,foe.uid)),pack.cards['CSM-1-001'].bp-1000);
 assertUniversalMatch(packs,s);

 let theirs=open(2087,['CSM-1-031','CSM-1-006','CSM-1-008','CSM-1-001']);
 retireDenji(theirs);
 const reze=put(theirs,0,'CSM-1-031','front',0);
 theirs.active=1;
 legalUniversalActions(packs,theirs);
 runCsmJob(pack,theirs,{op:'csm',id:'CSM-1-031',slot:'onPlay',owner:0,sourceUid:reze.uid});
 assert.equal(theirs.pending.actions.some(a=>a.mode==='ap'),false);
 assert.equal(theirs.pending.actions.some(a=>a.mode==='debuff'),true);
 assertUniversalMatch(packs,theirs);
});

test('CSM-1-032 adds at most one cheap Denji or Date while Makima is on the field',()=>{
 let empty=open(1032,['CSM-1-032','CSM-1-006','CSM-1-004','CSM-1-037','CSM-1-008']);
 freeEnergy(empty);
 toOutside(empty,0,'CSM-1-006');
 const field=toHand(empty,0,'CSM-1-032');
 empty=play(empty,field.uid,'play','energy');
 assert.equal(empty.pending,null);
 assert.equal(live(empty,0,field.uid)?.cardId,'CSM-1-032');
 assertUniversalMatch(packs,empty);

 let s=open(1034,['CSM-1-032','CSM-1-022','CSM-1-006','CSM-1-007','CSM-1-037','CSM-1-016','CSM-1-008']);
 freeEnergy(s);
 put(s,0,'CSM-1-022','front',0);
 const cheap=toOutside(s,0,'CSM-1-006');
 const costly=toOutside(s,0,'CSM-1-007');
 const date=toOutside(s,0,'CSM-1-037');
 const bomb=toOutside(s,0,'CSM-1-016');
 const cinema=toHand(s,0,'CSM-1-032');
 s=play(s,cinema.uid,'play','energy');
 assert.equal(s.pending?.step,'recover');
 assert.equal(s.pending.actions.some(a=>a.uid===cheap.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===date.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===costly.uid||a.uid===bomb.uid),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 s=choose(s,a=>a.mode==='take'&&a.uid===date.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===date.uid),true);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let lined=open(1038,['CSM-1-032','CSM-1-022','CSM-1-006','CSM-1-008']);
 freeEnergy(lined,0,2);
 freeEnergy(lined,0,3);
 put(lined,0,'CSM-1-022','energy',2);
 const denji=toOutside(lined,0,'CSM-1-006');
 const house=toHand(lined,0,'CSM-1-032');
 lined=play(lined,house.uid,'play','energy');
 assert.equal(lined.pending?.step,'recover');
 assert.equal(lined.pending.actions.some(a=>a.uid===denji.uid),true);
 lined=choose(lined,a=>a.mode==='skip');
 assert.equal(lined.players[0].outside.some(c=>c.uid===denji.uid),true);
 assertUniversalMatch(packs,lined);
});

test('CSM-1-033 shows the whole window, orders the rest, then puts one hand card outside',()=>{
 let s=open(1033,['CSM-1-033','CSM-1-001','CSM-1-036','CSM-1-025','CSM-1-008']);
 freeEnergy(s);
 const [kobeni,event,reze]=top(s,0,['CSM-1-001','CSM-1-036','CSM-1-025']);
 const cafe=toHand(s,0,'CSM-1-033');
 s=play(s,cafe.uid,'play','energy');
 assert.equal(s.pending?.step,'lookPick');
 assert.deepEqual(s.pending.data.window,[kobeni.uid,event.uid,reze.uid]);
 assert.equal(s.pending.actions.some(a=>a.uid===event.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===kobeni.uid),true);
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.equal(shown.find(c=>c.uid===event.uid).cardId,'CSM-1-036');
 assert.equal(shown.find(c=>c.uid===event.uid).action,null);
 s=choose(s,a=>a.mode==='take'&&a.uid===kobeni.uid);
 assert.equal(s.pending?.step,'lookOrder');
 assert.equal(s.publicReveals.some(r=>r.uid===kobeni.uid),true);
 assert.equal(s.publicReveals.some(r=>r.uid===event.uid),false);
 s=choose(s,a=>a.mode==='next'&&a.uid===event.uid);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[reze.uid,event.uid]);
 assert.equal(s.pending?.step,'discard');
 assert.equal(s.pending.actions.some(a=>a.uid===kobeni.uid),true);
 s=choose(s,a=>a.mode==='discard'&&a.uid===kobeni.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===kobeni.uid),true);
 assertUniversalMatch(packs,s);

 let kept=open(1035,['CSM-1-033','CSM-1-025','CSM-1-036','CSM-1-001','CSM-1-008']);
 freeEnergy(kept);
 const [one,two]=top(kept,0,['CSM-1-025','CSM-1-036']);
 const house=toHand(kept,0,'CSM-1-033');
 kept=play(kept,house.uid,'play','energy');
 kept=choose(kept,a=>a.mode==='take'&&a.uid===one.uid);
 if(kept.pending?.step==='lookOrder')kept=choose(kept,a=>a.mode==='next');
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].hand.some(c=>c.uid===one.uid),true);
 assert.equal(kept.players[0].deck.at(-1).uid,two.uid);
 assertUniversalMatch(packs,kept);
});

test('CSM-1-035 orders the remainder before the outside follow-up',()=>{
 let s=open(1036,['CSM-1-035','CSM-1-022','CSM-1-037','CSM-1-006','CSM-1-004',
  'CSM-1-001','CSM-1-036','CSM-1-025','CSM-1-008']);
 const window=top(s,0,['CSM-1-022','CSM-1-001','CSM-1-036','CSM-1-025','CSM-1-006','CSM-1-004']);
 const date=toOutside(s,0,'CSM-1-037');
 const event=toHand(s,0,'CSM-1-035');
 s=play(s,event.uid,'event');
 const shown=controllerDeckWindowCards(s,packs,legalUniversalActions(packs,s));
 assert.equal(shown.length,6);
 assert.equal(shown.find(c=>c.cardId==='CSM-1-036').action,null);
 s=choose(s,a=>a.mode==='take'&&a.uid===window[0].uid);
 assert.equal(s.pending?.step,'lookOrder');
 assert.equal(s.publicReveals.some(r=>r.uid===window[0].uid),true);
 while(s.pending?.step==='lookOrder')s=choose(s,a=>a.mode==='next');
 assert.equal(s.pending?.step,'recover');
 assert.equal(s.pending.actions.some(a=>a.uid===date.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===window[4].uid||a.uid===window[5].uid),false);
 s=choose(s,a=>a.mode==='skip');
 assert.equal(s.players[0].outside.some(c=>c.uid===date.uid),true);
 assertUniversalMatch(packs,s);

 let reze=open(1037,['CSM-1-035','CSM-1-025','CSM-1-006','CSM-1-004','CSM-1-001',
  'CSM-1-036','CSM-1-002','CSM-1-008']);
 const looked=top(reze,0,['CSM-1-025','CSM-1-001','CSM-1-036','CSM-1-002','CSM-1-006','CSM-1-004']);
 const cheap=toOutside(reze,0,'CSM-1-006');
 const expensive=toOutside(reze,0,'CSM-1-004');
 const card=toHand(reze,0,'CSM-1-035');
 reze=play(reze,card.uid,'event');
 reze=choose(reze,a=>a.mode==='take'&&a.uid===looked[0].uid);
 while(reze.pending?.step==='lookOrder')reze=choose(reze,a=>a.mode==='next');
 assert.equal(reze.pending.actions.some(a=>a.uid===cheap.uid),true);
 assert.equal(reze.pending.actions.some(a=>a.uid===expensive.uid),false);
 reze=choose(reze,a=>a.mode==='take'&&a.uid===cheap.uid);
 assert.equal(reze.players[0].hand.some(c=>c.uid===cheap.uid),true);
 assertUniversalMatch(packs,reze);
});

test('Q2085 CSM-1-037 locks the draw branch by name and still allows the aura branch',()=>{
 let s=open(2088,['CSM-1-037','CSM-1-001','CSM-1-008']);
 const ally=put(s,0,'CSM-1-001','front',0);
 const first=toHand(s,0,'CSM-1-037');
 s.players[0].apCards.forEach(c=>{c.inPlay=true;c.ready=false;});
 s.players[0].apCards[0].ready=true;
 s=play(s,first.uid,'event');
 assert.equal(s.pending.actions.some(a=>a.mode==='draw'),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='aura'),true);
 s=choose(s,a=>a.mode==='draw');
 assert.equal(s.pending?.step,'discard');
 s=choose(s,a=>a.mode==='discard');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,0);
 s.players[0].apCards[0].ready=true;
 const second=toHand(s,0,'CSM-1-037');
 s=play(s,second.uid,'event');
 assert.equal(s.pending.actions.some(a=>a.mode==='draw'),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='aura'),true);
 s=choose(s,a=>a.mode==='aura');
 s=choose(s,a=>a.mode==='pick'&&a.uid===ally.uid);
 const rested=s.players[0].apCards.filter(a=>a.ready).length;
 if(s.pending?.step==='ap')s=choose(s,a=>a.mode==='ap');
 assert.equal(universalBp(packs,s,live(s,0,ally.uid)),pack.cards['CSM-1-001'].bp+1000);
 assert.equal(csmAlsoEventAuraLive(s,0,printed),true);
 assert.equal(csmCardCountsAsEvent(s,0,pack.cards['CSM-1-001'],printed),true);
 assert.equal(s.players[0].apCards.filter(a=>a.ready).length,rested+1);
 assertUniversalMatch(packs,s);

 let prior=open(2089,['CSM-1-037','CSM-1-036','CSM-1-001','CSM-1-008']);
 prior.players[0].apCards.forEach((c,i)=>{c.inPlay=i<3;c.ready=i===0;});
 const earlier=toHand(prior,0,'CSM-1-036');
 prior=play(prior,earlier.uid,'event');
 if(prior.pending?.kind==='effect-recover-ap')prior=choose(prior,a=>a.uid===null);
 const date=toHand(prior,0,'CSM-1-037');
 prior.players[0].apCards[0].ready=true;
 prior=play(prior,date.uid,'event');
 prior=choose(prior,a=>a.mode==='draw');
 prior=choose(prior,a=>a.mode==='discard');
 assert.equal(prior.pending?.step,'ap');
 prior=choose(prior,a=>a.mode==='ap');
 assert.equal(prior.players[0].apCards.filter(a=>a.ready).length>=1,true);
 assertUniversalMatch(packs,prior);

 let bare=open(2091,['CSM-1-037','CSM-1-036','CSM-1-008']);
 bare.players[0].apCards.forEach((c,i)=>{c.inPlay=i<2;c.ready=false;});
 const setup=toHand(bare,0,'CSM-1-036');
 bare.players[0].apCards[0].ready=true;
 bare=play(bare,setup.uid,'event');
 if(bare.pending?.kind==='effect-recover-ap')bare=choose(bare,a=>a.uid===null);
 while(bare.players[0].deck.length)bare.players[0].outside.push(bare.players[0].deck.pop());
 while(bare.players[0].hand.length)bare.players[0].outside.push(bare.players[0].hand.pop());
 const lone=toHand(bare,0,'CSM-1-037');
 bare.players[0].apCards[0].ready=true;
 bare=play(bare,lone.uid,'event');
 bare=choose(bare,a=>a.mode==='draw');
 assert.equal(bare.pending?.step,'ap');
 bare=choose(bare,a=>a.mode==='ap');
 assert.equal(bare.players[0].apCards.filter(a=>a.ready).length,1);
 assertUniversalMatch(packs,bare);

 let emptyField=open(2092,['CSM-1-037','CSM-1-008']);
 for(const line of ['front','energy']){
  for(let i=0;i<4;i++){
   const card=emptyField.players[0][line][i];
   if(!card)continue;
   emptyField.players[0][line][i]=null;
   emptyField.players[0].outside.push(card);
  }
 }
 const source=take(emptyField,0,'CSM-1-037');
 emptyField.players[0].outside.push(source);
 runCsmJob(pack,emptyField,{op:'csm',id:'CSM-1-037',slot:'onPlay',owner:0,sourceUid:source.uid});
 assert.deepEqual(emptyField.pending.actions.map(a=>a.mode),['draw']);
 assertUniversalMatch(packs,emptyField);
});

test('CSM-1-038 requires Reze, and the draw survives a missing AP target',()=>{
 let blocked=open(1038,['CSM-1-038','CSM-1-016','CSM-1-025','CSM-1-001','CSM-1-008']);
 const event=toHand(blocked,0,'CSM-1-038');
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===event.uid),false);
 freeEnergy(blocked);
 const alias=put(blocked,0,'CSM-1-016','energy',3);
 assert.equal(legalUniversalActions(packs,blocked).some(a=>a.type==='event'&&a.uid===event.uid),true);
 blocked.players[0].energy[3]=null;
 blocked.players[0].outside.push(alias);
 const reze=put(blocked,0,'CSM-1-025','front',1);
 blocked.players[0].apCards.forEach(c=>{c.inPlay=true;c.ready=true;});
 const hand=blocked.players[0].hand.length;
 blocked=play(blocked,event.uid,'event');
 assert.equal(blocked.pending?.step,'retireOwn');
 assert.equal(blocked.pending.actions.some(a=>a.mode==='skip'),false);
 blocked=choose(blocked,a=>a.mode==='pick'&&a.uid===reze.uid);
 assert.equal(blocked.players[0].outside.some(c=>c.uid===reze.uid),true);
 assert.equal(blocked.players[0].hand.length,hand+1);
 assertUniversalMatch(packs,blocked);
});

test('CSM-1-038 does not continue when a leave replacement takes the exit',()=>{
 let s=open(1039,['CSM-1-038','CSM-1-061','CSM-1-025','CSM-1-024','CSM-1-008']);
 const power=bury(put(s,0,'CSM-1-061','front',0),s,0);
 put(s,0,'CSM-1-025','front',1);
 const stand=put(s,0,'CSM-1-024','front',2);
 const event=toHand(s,0,'CSM-1-038');
 const hand=s.players[0].hand.length;
 s=play(s,event.uid,'event');
 s=choose(s,a=>a.mode==='pick'&&a.uid===power.uid);
 assert.equal(s.pending?.step,'leaveReplace');
 s=choose(s,a=>a.mode==='pick'&&a.uid===stand.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===power.uid),true);
 assert.equal(s.players[0].hand.length,hand-1);
 assert.equal(s.pending?.step==='ap',false);
 assertUniversalMatch(packs,s);
});

test('CSM-1-039 retires by current BP, and the life trigger does not use that cap',()=>{
 let s=open(1039,['CSM-1-039','CSM-1-025','CSM-1-007','CSM-1-001','CSM-1-008']);
 const small=put(s,1,'CSM-1-001','front',0);
 const big=put(s,1,'CSM-1-007','front',1);
 const event=toHand(s,0,'CSM-1-039');
 s=play(s,event.uid,'event');
 assert.equal(s.pending?.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,3000);
 assert.equal(s.pending.choices.includes(small.uid),true);
 assert.equal(s.pending.choices.includes(big.uid),false);
 s=choose(s,a=>a.uid===small.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===small.uid),true);
 put(s,0,'CSM-1-025','front',0);
 const again=toHand(s,0,'CSM-1-039');
 s=play(s,again.uid,'event');
 assert.equal(s.pending.limit,5000);
 assert.equal(s.pending.choices.includes(big.uid),true);
 s=choose(s,a=>a.uid===big.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===big.uid),true);
 assertUniversalMatch(packs,s);
});

test('CSM-1-034 and CSM-1-036 activate up to two AP cards',()=>{
 for(const id of ['CSM-1-034','CSM-1-036']){
  let s=open(3400+Number(id.slice(-2)),[id,'CSM-1-008','CSM-1-001']);
  s.players[0].apCards.forEach((c,i)=>{c.inPlay=i<3;c.ready=i===0;});
  const event=toHand(s,0,id);
  s=play(s,event.uid,'event');
  assert.equal(s.pending?.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),true);
  s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid!==null);
  s=choose(s,a=>a.type==='chooseApRecovery'&&a.uid!==null);
  assert.equal(s.players[0].apCards.filter(c=>c.ready).length,2);
  assert.equal(s.pending,null);
  assertUniversalMatch(packs,s);
 }
});

test('life triggers of CSM-1-021 through 039 stay on the printed trigger',()=>{
 const draw=['CSM-1-021','CSM-1-028','CSM-1-029','CSM-1-035','CSM-1-037','CSM-1-038'];
 for(const id of draw){
  const counts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(counts,2100+Number(id.slice(-3))),'attack');
  const poke=put(s,0,'CSM-1-005','front',0,true);
  revealLife(s,1,id);
  const hand=s.players[1].hand.length;
  s=use(s,{type:'attack',uid:poke.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'draw',id);
  s=use(s,{type:'chooseTrigger',mode:'draw'});
  assert.equal(s.players[1].hand.length,hand+1);
  assertUniversalMatch(packs,s);
 }
 const gets=['CSM-1-025','CSM-1-032','CSM-1-033'];
 for(const id of gets){
  const counts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let s=toPhase(fresh(counts,2200+Number(id.slice(-3))),'attack');
  const poke=put(s,0,'CSM-1-005','front',0,true);
  const trigger=revealLife(s,1,id);
  s=use(s,{type:'attack',uid:poke.uid});
  s=use(s,{type:'chooseBlock',uid:null});
  assert.equal(s.pending?.trigger,'get',id);
  s=use(s,{type:'chooseTrigger',mode:'get'});
  assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true);
  assertUniversalMatch(packs,s);
 }
 const counts=countsFor(['CSM-1-026','CSM-1-005','CSM-1-003','CSM-1-008']);
 let active=toPhase(fresh(counts,1026),'attack');
 const poke=put(active,0,'CSM-1-005','front',0,true);
 const ally=put(active,1,'CSM-1-003','front',0,false);
 revealLife(active,1,'CSM-1-026');
 active=use(active,{type:'attack',uid:poke.uid});
 active=use(active,{type:'chooseBlock',uid:null});
 assert.equal(active.pending?.trigger,'active');
 active=use(active,{type:'chooseTrigger',mode:'active',uid:ally.uid});
 assert.equal(live(active,1,ally.uid).ready,true);
 assert.equal(universalBp(packs,active,live(active,1,ally.uid)),pack.cards['CSM-1-003'].bp+3000);
 assertUniversalMatch(packs,active);

 const colorCounts=countsFor(['CSM-1-030','CSM-1-026','CSM-1-033','CSM-1-005','CSM-1-008']);
 let color=toPhase(fresh(colorCounts,1030),'attack');
 const attacker=put(color,0,'CSM-1-005','front',0,true);
 const guest=toOutside(color,1,'CSM-1-026');
 toOutside(color,1,'CSM-1-033');
 revealLife(color,1,'CSM-1-030');
 color=use(color,{type:'attack',uid:attacker.uid});
 color=use(color,{type:'chooseBlock',uid:null});
 assert.equal(color.pending?.trigger,'color');
 const choices=legalUniversalActions(packs,color);
 assert.equal(choices.some(a=>a.mode==='colorOutside'&&a.uid===guest.uid&&a.line==='front'),true);
 assert.equal(choices.some(a=>a.uid&&color.players[1].outside.find(c=>c.uid===a.uid)?.cardId==='CSM-1-033'),false);
 color=use(color,choices.find(a=>a.mode==='colorOutside'&&a.uid===guest.uid&&a.replaceUid===undefined));
 const entered=live(color,1,guest.uid);
 assert.equal(entered.ready,true);
 assert.equal(color.players[1].front.some(c=>c?.uid===guest.uid),true);
 assert.equal(entered.stack?.length||0,0);
 assert.equal(color.pending?.kind,'effect-discard');
 assertUniversalMatch(packs,color);

 const specialCounts=countsFor(['CSM-1-039','CSM-1-007','CSM-1-005','CSM-1-008']);
 let special=toPhase(fresh(specialCounts,1039),'attack');
 const victim=put(special,0,'CSM-1-007','front',1,true);
 const striker=put(special,0,'CSM-1-005','front',0,true);
 revealLife(special,1,'CSM-1-039');
 special=use(special,{type:'attack',uid:striker.uid});
 special=use(special,{type:'chooseBlock',uid:null});
 assert.equal(special.pending?.trigger,'special');
 assert.equal(legalUniversalActions(packs,special).some(a=>a.mode==='special'&&a.uid===victim.uid),true);
 special=use(special,{type:'chooseTrigger',mode:'special',uid:victim.uid});
 assert.equal(special.players[0].outside.some(c=>c.uid===victim.uid),true);
 assertUniversalMatch(packs,special);

 for(const id of ['CSM-1-023','CSM-1-024','CSM-1-031']){
  const raidCounts=countsFor([id,'CSM-1-022','CSM-1-025','CSM-1-005','CSM-1-008','CSM-1-001']);
  let raid=toPhase(fresh(raidCounts,2300+Number(id.slice(-3))),'attack');
  const striker=put(raid,0,'CSM-1-005','front',0,true);
  const baseId=id==='CSM-1-031'?'CSM-1-025':'CSM-1-022';
  const base=put(raid,1,baseId,'front',0,true);
  put(raid,1,'CSM-1-008','energy',0);
  put(raid,1,'CSM-1-001','energy',1);
  put(raid,1,'CSM-1-005','energy',2);
  const life=revealLife(raid,1,id);
  raid=use(raid,{type:'attack',uid:striker.uid});
  raid=use(raid,{type:'chooseBlock',uid:null});
  assert.equal(raid.pending?.trigger,'raid',id);
  assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='get'),true);
  const raidAction=legalUniversalActions(packs,raid).find(a=>a.mode==='raid'&&a.baseUid===base.uid);
  assert.ok(raidAction,id);
  raid=use(raid,raidAction);
  const raided=raid.players[1].front.find(c=>c?.uid===life.uid)||
   raid.players[1].energy.find(c=>c?.uid===life.uid);
  assert.ok(raided,id);
  assert.equal(raided.stack.some(c=>c?.uid===base.uid),true);
  assert.equal(raid.pending?.step==='grantImpact',false,id);
  if(raid.pending?.kind==='csm'&&raid.pending.id===id){
   raid=choose(raid,a=>a.mode==='draw'||a.mode==='debuff'||a.mode==='skip');
   if(raid.pending?.step==='debuff')raid=choose(raid,a=>a.mode==='skip');
   if(raid.pending?.step==='buffOther2k')raid=choose(raid,a=>a.mode==='skip');
  }
  assertUniversalMatch(packs,raid);
 }

 for(const id of ['CSM-1-034','CSM-1-036']){
  const finalCounts=countsFor([id,'CSM-1-005','CSM-1-008']);
  let final=toPhase(fresh(finalCounts,2400+Number(id.slice(-2))),'attack');
  const striker=put(final,0,'CSM-1-005','front',0,true);
  const trigger=take(final,1,id);
  const topCard=final.players[1].deck[0];
  final.players[1].deck.push(...final.players[1].life.splice(0));
  final.players[1].life=[trigger];
  final.players[1].apCards.forEach(c=>{c.ready=false;c.inPlay=true;});
  final=use(final,{type:'attack',uid:striker.uid});
  final=use(final,{type:'chooseBlock',uid:null});
  assert.equal(final.pending?.trigger,'final',id);
  assert.equal(legalUniversalActions(packs,final).some(a=>a.mode==='final'),true);
  final=use(final,{type:'chooseTrigger',mode:'final'});
  assert.equal(final.players[1].life[0]?.uid,topCard.uid);
  assert.equal(final.players[1].apCards.some(c=>c.ready),false);
  assertUniversalMatch(packs,final);
 }
});
