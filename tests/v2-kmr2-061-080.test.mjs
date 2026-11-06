import test from 'node:test';
import assert from 'node:assert/strict';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalImpact,universalImpactNull,universalPrivateChoices,
 zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {dispatchRoom} from '../server/domain.mjs';
import {controllerChoiceArt} from '../dist/universal-v2/preview-actions.mjs';

const pack=createKmrBattlePack();
const packs=[pack,pack];

function fill(required,extra={}){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
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
function fresh(ids,extra,seed=61){
 return newUniversalMatch(packs,{decks:[fill(ids,extra),fill(ids,extra)],seed,first:0});
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
function ready(s){
 s.pending=null;s.phase='main';
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
}
function click(state,pred){
 const action=legalUniversalActions(packs,state).find(pred);
 assert.ok(action,(state.pending?.id||'')+' '+(state.pending?.step||state.pending?.kind||state.phase));
 return dispatchUniversalAction(packs,state,action);
}
function acts(state,pred){return legalUniversalActions(packs,state).filter(pred);}
function uids(state,mode){return acts(state,a=>a.mode===mode).map(a=>a.uid);}
function trim(s,p){while(s.players[p].hand.length>6)s.players[p].deck.push(s.players[p].hand.pop());}
function advance(s){
 if(s.pending?.kind==='end-hand-limit')return click(s,a=>a.type==='chooseHandLimit');
 assert.equal(s.pending,null,s.pending?.kind);
 return dispatchUniversalAction(packs,s,{type:'next'});
}
function reach(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  trim(s,s.active);
  s=advance(s);
  if(++guard>30)throw Error('stuck '+s.active+' '+s.phase+' '+(s.pending?.kind||''));
 }
 return s;
}
function energy(s,p,n=3){
 for(let i=0;i<n;i++)put(s,p,'KMR-2-045','energy',i,true);
}
function onlyHand(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function top(s,p,cards){
 s.players[p].deck.unshift(...cards);
}
function host(s,uid,p=0){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}

test('KMR-2-061 counts W characters and Memory Change, then must retire',()=>{
 const s=fresh(['KMR-2-061','KMR-2-048','KMR-2-050','KMR-2-063','KMR-2-059','KMR-1-078','KMR-2-045'],
  {'KMR-2-045':2},611);
 energy(s,0,2);
 const event=take(s,0,'KMR-2-061');
 const memory=put(s,0,'KMR-2-059','energy',2,true);
 const small=put(s,1,'KMR-1-078','front',0,true);
 const mid=put(s,1,'KMR-2-050','front',1,true);
 const tall=put(s,1,'KMR-2-063','front',2,true);
 onlyHand(s,0,[event]);
 ready(s);
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(state.pending?.id,'KMR-2-061');
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assert.deepEqual(uids(state,'retire'),[small.uid]);
 state=click(state,a=>a.mode==='retire'&&a.uid===small.uid);
 assert.equal(state.players[1].outside.some(c=>c.uid===small.uid),true);
 assert.equal(state.players[1].front.some(c=>c?.uid===mid.uid),true);

 const one=fresh(['KMR-2-061','KMR-2-048','KMR-1-078','KMR-2-072','KMR-2-045'],{'KMR-2-045':2},612);
 energy(one,0,2);
 const w=put(one,0,'KMR-2-048','energy',2,true);
 const low=put(one,1,'KMR-1-078','front',0,true);
 const over=put(one,1,'KMR-2-072','front',1,true);
 const play=take(one,0,'KMR-2-061');
 onlyHand(one,0,[play]);
 ready(one);
 state=click(one,a=>a.type==='event'&&a.uid===play.uid);
 assert.equal(state.pending?.id,'KMR-2-061');
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assert.deepEqual(uids(state,'retire'),[low.uid]);
 assert.equal(uids(state,'retire').includes(over.uid),false);
 state=click(state,a=>a.mode==='retire'&&a.uid===low.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(state.players[1].front.some(c=>c?.uid===over.uid),true);
 assert.equal(host(state,w.uid)?.uid,w.uid);
 assertUniversalMatch(packs,state);

 const both=fresh(['KMR-2-061','KMR-2-050','KMR-2-063','KMR-2-059','KMR-2-045'],{'KMR-2-045':2,'KMR-2-050':2},613);
 energy(both,0,2);
 put(both,0,'KMR-2-050','front',0,true);
 put(both,0,'KMR-2-059','energy',2,true);
 const exact=put(both,1,'KMR-2-050','front',0,true);
 const above=put(both,1,'KMR-2-063','front',1,true);
 const card=take(both,0,'KMR-2-061');
 onlyHand(both,0,[card]);
 ready(both);
 state=click(both,a=>a.type==='event'&&a.uid===card.uid);
 assert.deepEqual(uids(state,'retire'),[exact.uid]);
 assert.equal(uids(state,'retire').includes(above.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(memory.cardId,'KMR-2-059');
});

test('KMR-2-062 and KMR-2-078 recover zero, one, or two rested AP',()=>{
 for(const id of ['KMR-2-062','KMR-2-078']){
  const s=fresh([id,'KMR-2-045'],{'KMR-2-045':2},620);
  energy(s,0,2);
  const event=take(s,0,'KMR-2-062'===id?id:id);
  onlyHand(s,0,[event]);
 ready(s);
 s.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
  assert.equal(state.pending?.kind,'effect-recover-ap');
  assert.equal(acts(state,a=>a.uid===null).length,1);
  const rested=acts(state,a=>a.uid).map(a=>a.uid);
  assert.ok(rested.length>=2);
  state=click(state,a=>a.type==='chooseApRecovery'&&a.uid===null);
  assert.equal(state.pending,null);
  assert.equal(state.players[0].apCards.filter(c=>c.ready).length,0);

  const one=fresh([id,'KMR-2-045'],{'KMR-2-045':2},621);
  energy(one,0,2);
  const again=take(one,0,id);
  onlyHand(one,0,[again]);
 ready(one);
 one.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
  state=click(one,a=>a.type==='event'&&a.uid===again.uid);
  const first=acts(state,a=>a.uid)[0];
  state=click(state,a=>a.uid===first.uid);
  assert.equal(state.pending?.kind,'effect-recover-ap');
  state=click(state,a=>a.uid===null);
  assert.equal(state.players[0].apCards.filter(c=>c.ready).length,1);
  assertUniversalMatch(packs,state);

  const two=fresh([id,'KMR-2-045'],{'KMR-2-045':2},622);
  energy(two,0,2);
  const third=take(two,0,id);
  onlyHand(two,0,[third]);
  ready(two);
  two.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
  state=click(two,a=>a.type==='event'&&a.uid===third.uid);
  state=click(state,a=>a.uid);
  state=click(state,a=>a.uid);
  assert.equal(state.pending,null);
  assert.equal(state.players[0].apCards.filter(c=>c.ready).length,2);
  assertUniversalMatch(packs,state);
 }
});

test('KMR-2-063 shows the whole top five, then rests up to two without skipping on play',()=>{
 const s=fresh(['KMR-2-063','KMR-2-070','KMR-2-072','KMR-2-064','KMR-2-010','KMR-2-020','KMR-2-066','KMR-2-045'],
  {'KMR-2-045':3},630);
 energy(s,0,3);
 const rider=take(s,0,'KMR-2-063');
 const agito=take(s,0,'KMR-2-070');
 const kiva=take(s,0,'KMR-2-072');
 const decade=take(s,0,'KMR-2-064');
 const plain=take(s,0,'KMR-2-010');
 const other=take(s,0,'KMR-2-020');
 const quiet=take(s,0,'KMR-2-066');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 top(s,0,[agito,plain,decade,other,quiet]);
 s.players[0].hand.push(rider,kiva);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.equal(state.pending?.step,'lookPick');
 assert.deepEqual(state.pending.data.uids,[agito.uid,plain.uid,decade.uid,other.uid,quiet.uid]);
 assert.deepEqual(uids(state,'take'),[agito.uid]);
 const shown=universalPrivateChoices(packs,state,0);
 assert.equal(shown.inspected.map(c=>c.uid).includes(plain.uid),true);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 assert.equal(controllerChoiceArt(packs,state,state.pending.actions.find(a=>a.uid===agito.uid))[0]?.cardId,'KMR-2-070');
 state=click(state,a=>a.mode==='take'&&a.uid===agito.uid);
 assert.equal(state.publicReveals.some(e=>e.uid===agito.uid),true);
 assert.equal(state.publicReveals.some(e=>e.uid===plain.uid),false);
 assert.equal(state.pending?.step,'lookOrder');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.pending?.step,'deployPick');
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 const enter=state.pending.actions.find(a=>a.mode==='deploy'&&a.uid===kiva.uid);
 assert.ok(enter);
 state=click(state,a=>a.mode==='deploy'&&a.uid===kiva.uid);
 const spot=state.pending.actions.find(a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='front');
 assert.equal(spot.skipOnPlay,false);
 assert.equal(spot.ready,false);
 state=click(state,a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='front');
 assert.equal(state.pending?.step,'deployPick');
 state=click(state,a=>a.mode==='done');
 assert.equal(state.players[0].front.find(c=>c?.uid===kiva.uid)?.ready,false);
 assert.equal(state.players[0].hand.some(c=>c.uid===agito.uid),true);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-063 replaces a card when both lines are full',()=>{
 const s=fresh(['KMR-2-063','KMR-2-072','KMR-2-045','KMR-2-066','KMR-2-064','KMR-2-070','KMR-2-010','KMR-2-020'],
  {'KMR-2-045':4},631);
 for(let i=0;i<4;i++)put(s,0,'KMR-2-045','energy',i,true);
 put(s,0,'KMR-2-066','front',0,true);
 put(s,0,'KMR-2-064','front',1,true);
 put(s,0,'KMR-2-070','front',2,true);
 const occupant=put(s,0,'KMR-2-010','front',3,true);
 const rider=take(s,0,'KMR-2-063');
 const kiva=take(s,0,'KMR-2-072');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(rider,kiva);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===rider.uid&&a.replaceUid===occupant.uid);
 if(state.pending?.step==='lookPick')state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.players[0].removed.some(c=>c.uid===occupant.uid),true);
 assert.equal(state.pending?.step,'deployPick');
 state=click(state,a=>a.mode==='deploy'&&a.uid===kiva.uid);
 assert.equal(state.pending.actions.filter(a=>a.mode==='enter').every(a=>a.replaceUid),true);
 const swap=state.pending.actions.find(a=>a.mode==='enter'&&a.line==='energy');
 state=click(state,a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='energy'&&a.replaceUid===swap.replaceUid);
 assert.equal(state.players[0].removed.some(c=>c.uid===swap.replaceUid),true);
 assert.equal(state.players[0].energy.find(c=>c?.uid===kiva.uid)?.ready,false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-064 draws one and puts one hand card outside',()=>{
 const s=fresh(['KMR-2-064','KMR-2-010','KMR-2-045'],{'KMR-2-045':1},640);
 put(s,0,'KMR-2-045','energy',0,true);
 const rider=take(s,0,'KMR-2-064');
 const drawn=take(s,0,'KMR-2-010');
 s.players[0].deck.unshift(drawn);
 onlyHand(s,0,[rider]);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.equal(state.pending?.kind,'effect-discard');
 assert.equal(state.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(acts(state,a=>a.uid===null).length,0);
 state=click(state,a=>a.type==='chooseDiscard'&&a.uid===drawn.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===drawn.uid),true);
 assert.equal(state.players[0].removed.some(c=>c.uid===drawn.uid),false);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-065 orders the rest before the hand card leaves, and keeps the window private',()=>{
 const s=fresh(['KMR-2-065','KMR-2-064','KMR-2-070','KMR-2-010','KMR-2-020','KMR-2-045'],
  {'KMR-2-045':1},650);
 put(s,0,'KMR-2-045','energy',0,true);
 const rider=take(s,0,'KMR-2-065');
 const decade=take(s,0,'KMR-2-064');
 const trait=take(s,0,'KMR-2-070');
 const hidden=take(s,0,'KMR-2-010');
 const filler=take(s,0,'KMR-2-020');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 top(s,0,[decade,hidden,trait]);
 s.players[0].hand.push(rider,filler);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===rider.uid&&a.line==='energy');
 assert.equal(state.pending?.step,'lookPick');
 assert.deepEqual(state.pending.data.uids,[decade.uid,hidden.uid,trait.uid]);
 assert.deepEqual(uids(state,'take').sort(),[decade.uid,trait.uid].sort());
 assert.equal(universalPrivateChoices(packs,state,0).inspected.some(c=>c.uid===hidden.uid),true);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 state=click(state,a=>a.mode==='take'&&a.uid===decade.uid);
 assert.equal(state.publicReveals.some(e=>e.uid===decade.uid),true);
 assert.equal(state.publicReveals.some(e=>e.uid===hidden.uid),false);
 assert.equal(state.pending?.step,'lookOrder');
 while(state.pending?.step==='lookOrder'){
  const prefer=state.pending.actions.find(a=>a.uid===trait.uid)||state.pending.actions[0];
  state=dispatchUniversalAction(packs,state,prefer);
 }
 assert.equal(state.players[0].deck.at(-1)?.uid,hidden.uid);
 assert.equal(state.players[0].deck.at(-2)?.uid,trait.uid);
 assert.equal(state.pending?.step,'discard');
 state=click(state,a=>a.mode==='discard'&&a.uid===filler.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===filler.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===decade.uid),true);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const skip=fresh(['KMR-2-065','KMR-2-010','KMR-2-020','KMR-2-066','KMR-2-045'],{'KMR-2-045':1},651);
 put(skip,0,'KMR-2-045','energy',0,true);
 const body=take(skip,0,'KMR-2-065');
 const a=take(skip,0,'KMR-2-010'),b=take(skip,0,'KMR-2-020'),c=take(skip,0,'KMR-2-066');
 skip.players[0].deck.push(...skip.players[0].hand.splice(0));
 top(skip,0,[a,b,c]);
 skip.players[0].hand.push(body);
 ready(skip);
 state=click(skip,a=>a.type==='play'&&a.uid===body.uid);
 if(state.pending?.step==='lookPick')state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(c=>[a.uid,b.uid,c.uid].includes(c.uid)),false);
 assert.equal(state.players[0].hand.some(c=>c.uid===body.uid),false);
});

test('KMR-2-066 generates the extra green only while active on the energy line',()=>{
 const s=fresh(['KMR-2-066'],{'KMR-2-066':2},660);
 const card=put(s,0,'KMR-2-066','energy',0,true);
 ready(s);
 assert.equal(universalCardEnergy(pack,s,0,card),2);
 card.ready=false;
 assert.equal(universalCardEnergy(pack,s,0,host(s,card.uid)),1);
 const front=put(s,0,'KMR-2-066','front',0,true);
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 assertUniversalMatch(packs,s);
});

test('KMR-2-067 copies a turn effect until the next own start and not from the energy line',()=>{
 const s=fresh(['KMR-2-067','KMR-2-073','KMR-2-072','KMR-2-010'],{},670);
 const rider=put(s,0,'KMR-2-067','front',0,true);
 const kuuga=take(s,0,'KMR-2-073');
 s.players[0].outside.push(kuuga);
 ready(s);
 assert.equal(acts(s,a=>a.type==='activate'&&a.uid===rider.uid).length,1);
 let state=click(s,a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(state.pending?.step,'copy');
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 state=click(state,a=>a.mode==='remove'&&a.uid===kuuga.uid);
 const body=host(state,rider.uid);
 assert.deepEqual(body.kmr2Copied.ids,['KMR-2-073']);
 assert.equal(universalBp(pack,state,body),4500);
 assert.equal(universalImpact(pack,state,body),1);
 assert.equal(state.players[0].removed.some(c=>c.uid===kuuga.uid),true);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,0);
 const saved=state.active;
 state.active=1;
 assert.equal(universalBp(pack,state,body),3500);
 assert.equal(universalImpact(pack,state,body),0);
 state.active=saved;
 trim(state,0);trim(state,1);
 state=reach(state,1,'start');
 const away=host(state,rider.uid);
 assert.equal(universalBp(pack,state,away),3500);
 assert.equal(universalImpact(pack,state,away),0);
 state=reach(state,0,'start');
 assert.equal(host(state,rider.uid).kmr2Copied,undefined);
 assert.equal(universalBp(pack,state,host(state,rider.uid)),3500);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,0);
 state=reach(state,0,'main');
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,0);
 state.players[0].outside.push(take(state,0,'KMR-2-072'));
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,1);
 assertUniversalMatch(packs,state);

 const side=fresh(['KMR-2-067','KMR-2-073'],{},671);
 const bench=put(side,0,'KMR-2-067','energy',0,true);
 side.players[0].outside.push(take(side,0,'KMR-2-073'));
 ready(side);
 assert.equal(acts(side,a=>a.type==='activate'&&a.uid===bench.uid).length,0);
});

test('KMR-2-068 raid text is the shared remove path, including the room',()=>{
 const s=fresh(['KMR-2-068','KMR-2-064','KMR-2-073','KMR-2-072','KMR-2-010','KMR-2-045'],
  {'KMR-2-045':3,'KMR-2-072':2},680);
 energy(s,0,3);
 const base=put(s,0,'KMR-2-064','front',0,true);
 const rider=take(s,0,'KMR-2-068');
 const kuuga=take(s,0,'KMR-2-073');
 const kiva=take(s,0,'KMR-2-072');
 const drawn=take(s,0,'KMR-2-010');
 s.players[0].deck.unshift(drawn);
 onlyHand(s,0,[rider,kuuga,kiva]);
 const foe=put(s,1,'KMR-2-072','front',0,true);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===drawn.uid),false);
 assert.equal(state.players[0].hand.some(c=>c.uid===kuuga.uid),true);

 state=fresh(['KMR-2-068','KMR-2-064','KMR-2-073','KMR-2-010','KMR-2-045'],{'KMR-2-045':3},681);
 energy(state,0,3);
 const decade=put(state,0,'KMR-2-064','front',0,true);
 const topCard=take(state,0,'KMR-2-068');
 const copied=take(state,0,'KMR-2-073');
 const draw=take(state,0,'KMR-2-010');
 state.players[0].deck.unshift(draw);
 onlyHand(state,0,[topCard,copied]);
 ready(state);
 state=click(state,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===decade.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===draw.uid),true);
 assert.equal(state.pending?.step,'removeTwo');
 assert.equal(state.pending.actions.some(a=>a.mode==='done'),true);
 state=click(state,a=>a.mode==='remove'&&a.uid===copied.uid);
 const body=host(state,topCard.uid);
 assert.deepEqual(body.kmr2Copied.ids,['KMR-2-073']);
 assert.equal(universalBp(pack,state,body),5500);
 assert.equal(universalImpact(pack,state,body),1);
 const active=state.active;
 state.active=1;
 assert.equal(universalBp(pack,state,body),4500);
 assert.equal(universalImpact(pack,state,body),0);
 state.active=active;
 assert.equal(foe.cardId,'KMR-2-072');
 assertUniversalMatch(packs,state);
});

test('both seats use the same KMR-2-068 remove of zero, one, and two',()=>{
 const counts=fill(['KMR-2-068','KMR-2-064','KMR-2-070','KMR-2-072','KMR-2-010','KMR-2-045'],
  {'KMR-2-045':3});
 const match=fresh(['KMR-2-068','KMR-2-064','KMR-2-070','KMR-2-072','KMR-2-010','KMR-2-045'],
  {'KMR-2-045':3},682);
 energy(match,0,3);
 const base=put(match,0,'KMR-2-064','front',0,true);
 const rider=take(match,0,'KMR-2-068');
 const agito=take(match,0,'KMR-2-070');
 const kiva=take(match,0,'KMR-2-072');
 const drawn=take(match,0,'KMR-2-010');
 match.players[0].deck.unshift(drawn);
 onlyHand(match,0,[rider,agito,kiva]);
 put(match,1,'KMR-2-072','front',0,true);
 ready(match);
 let room={code:'PASS0681',status:'playing',revision:1,first:0,match,log:[],updatedAt:1,
  seats:[0,1].map(side=>({userId:'user'+side,username:'玩家'+side,title:'kmr',battleCounts:counts}))};
 const repos={pruneRooms(){},loadRoom:()=>structuredClone(room),saveRoom:r=>{room=structuredClone(r);}};
 const act=(userId,pred)=>{
  const view=dispatchRoom(repos,{op:'view',code:room.code,userId},2).public;
  const index=legalUniversalActions(packs,room.match).findIndex(pred);
  assert.ok(index>=0);
  assert.equal(view.choices.some(choice=>choice.index===index),true);
  return dispatchRoom(repos,{op:'act',code:room.code,userId,index},3);
 };
 act('user0',a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 const guest=dispatchRoom(repos,{op:'view',code:room.code,userId:'user1'},4).public;
 assert.equal(guest.choices.length,0);
 assert.equal(JSON.stringify(guest).includes(agito.uid),false);
 assert.equal(JSON.stringify(guest).includes(kiva.uid),false);
 act('user0',a=>a.mode==='remove'&&a.uid===agito.uid);
 act('user0',a=>a.mode==='remove'&&a.uid===kiva.uid);
 assert.equal(room.match.pending?.step,'retire');
 act('user0',a=>a.mode==='skip');
 const landed=room.match.players[0].front.find(c=>c?.uid===rider.uid);
 assert.deepEqual(landed.kmr2Copied.ids.sort(),['KMR-2-070','KMR-2-072'].sort());
 assert.equal(room.match.players[0].removed.filter(c=>c.uid===agito.uid||c.uid===kiva.uid).length,2);
 assert.equal(room.match.players[1].front.filter(Boolean).length,1);
 assertUniversalMatch(packs,room.match);
});

test('KMR-2-069 raid frame, rested ban, and one unblocked battle',()=>{
 const quiet=fresh(['KMR-2-069','KMR-2-045'],{'KMR-2-045':3},690);
 energy(quiet,0,3);
 const plain=take(quiet,0,'KMR-2-069');
 onlyHand(quiet,0,[plain]);
 ready(quiet);
 let state=click(quiet,a=>a.type==='play'&&a.uid===plain.uid&&a.line==='front');
 assert.equal(state.pending,null);
 assert.equal(host(state,plain.uid)?.ready,false);
 state=reach(state,1,'start');
 state=reach(state,0,'attack');
 assert.equal(host(state,plain.uid)?.ready,true);
 state=click(state,a=>a.type==='attack'&&a.uid===plain.uid);
 assert.notEqual(state.pending?.id,'KMR-2-069');

 const s=fresh(['KMR-2-069','KMR-2-064','KMR-2-072','KMR-2-010','KMR-2-066','KMR-2-045'],
  {'KMR-2-045':3},691);
 energy(s,0,3);
 const base=put(s,0,'KMR-2-064','front',0,true);
 const rider=take(s,0,'KMR-2-069');
 const kiva=take(s,0,'KMR-2-072');
 const drawn=take(s,0,'KMR-2-010');
 const life=take(s,1,'KMR-2-066');
 const buriedLife=s.players[1].life[0];
 s.players[1].life[0]=life;
 s.players[1].deck.push(buriedLife);
 s.players[0].deck.unshift(drawn);
 onlyHand(s,0,[rider,kiva]);
 ready(s);
 state=click(s,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(state.pending?.step,'deployPick');
 state=click(state,a=>a.mode==='deploy'&&a.uid===kiva.uid);
 const spot=state.pending.actions.find(a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='front');
 assert.equal(spot.skipOnPlay,false);
 assert.equal(spot.ready,true);
 state=click(state,a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='front'&&a.slot===spot.slot);
 assert.equal(state.continuousStates.some(e=>e.kind==='cannotAttack'&&e.targetUid===kiva.uid),true);
 assert.equal(state.players[0].front.find(c=>c?.uid===kiva.uid)?.ready,true);
 state=reach(state,0,'attack');
 assert.equal(acts(state,a=>a.type==='attack'&&a.uid===kiva.uid).length,0);
 const hand=state.players[0].hand.length;
 state=click(state,a=>a.type==='attack'&&a.uid===rider.uid);
 assert.equal(state.pending?.id,'KMR-2-069');
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(uids(state,'rest').includes(kiva.uid),true);
 state=click(state,a=>a.mode==='rest'&&a.uid===kiva.uid);
 assert.equal(universalBp(pack,state,host(state,rider.uid)),7000);
 assert.equal(state.pending?.kind,'block');
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(state.players[0].hand.length,hand+1);
 assert.equal(state.players[1].life.includes(life),false);
 assert.notEqual(state.pending?.kind,'block');
 assert.equal(state.players[0].front.some(c=>c?.uid===rider.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-069 draws nothing when the boosted attack is blocked',()=>{
 const s=fresh(['KMR-2-069','KMR-2-064','KMR-2-072','KMR-2-063','KMR-2-045'],{'KMR-2-045':3},692);
 energy(s,0,3);
 const base=put(s,0,'KMR-2-064','front',0,true);
 const rider=take(s,0,'KMR-2-069');
 const kiva=take(s,0,'KMR-2-072');
 const wall=put(s,1,'KMR-2-063','front',0,true);
 onlyHand(s,0,[rider,kiva]);
 ready(s);
 let state=click(s,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 state=click(state,a=>a.mode==='deploy'&&a.uid===kiva.uid);
 const spot=state.pending.actions.find(a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='front');
 state=click(state,a=>a.mode==='enter'&&a.uid===kiva.uid&&a.line==='front'&&a.slot===spot.slot);
 state=reach(state,0,'attack');
 const hand=state.players[0].hand.length;
 state=click(state,a=>a.type==='attack'&&a.uid===rider.uid);
 state=click(state,a=>a.mode==='rest'&&a.uid===kiva.uid);
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(state.players[0].hand.length,hand);
 assert.equal(state.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(state.players[0].front.some(c=>c?.uid===rider.uid),true);
 assert.notEqual(state.pending?.kind,'block');
 assertUniversalMatch(packs,state);
});

test('KMR-2-070 through 075 keep their printed turn, cost, and battle conditions',()=>{
 const s=fresh(['KMR-2-064','KMR-2-063','KMR-2-070','KMR-2-072','KMR-2-073','KMR-2-074','KMR-2-075','KMR-2-050','KMR-2-051'],{},700);
 const decade=put(s,0,'KMR-2-064','energy',0,true);
 const agito=put(s,0,'KMR-2-070','front',0,true);
 const kiva=put(s,0,'KMR-2-072','front',1,true);
 const blade=put(s,0,'KMR-2-075','energy',1,true);
 ready(s);
 assert.equal(universalCardEnergy(pack,s,0,agito),1);
 assert.equal(universalBp(pack,s,kiva),2000);
 assert.equal(universalBp(pack,s,blade),4000);
 s.active=1;
 assert.equal(universalCardEnergy(pack,s,0,agito),0);
 assert.equal(universalBp(pack,s,kiva),1500);
 assert.equal(universalBp(pack,s,blade),3000);
 s.active=0;
 const diend=put(s,0,'KMR-2-063','energy',2,true);
 const hibiki=put(s,0,'KMR-2-074','front',2,true);
 s.active=1;
 assert.equal(universalBp(pack,s,hibiki),3000);
 assert.equal(universalImpactNull(pack,s,hibiki),true);
 s.players[0].energy[s.players[0].energy.findIndex(c=>c?.uid===decade.uid)]=null;
 s.players[0].energy[s.players[0].energy.findIndex(c=>c?.uid===diend.uid)]=null;
 s.players[0].outside.push(decade,diend);
 assert.equal(universalImpactNull(pack,s,host(s,hibiki.uid)),false);
 s.active=0;
 assert.equal(universalImpactNull(pack,s,host(s,hibiki.uid)),false);

 const cost=fresh(['KMR-2-073','KMR-2-064','KMR-2-045'],{'KMR-2-045':3},701);
 energy(cost,0,3);
 const kuuga=take(cost,0,'KMR-2-073');
 onlyHand(cost,0,[kuuga]);
 ready(cost);
 cost.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
 assert.equal(acts(cost,a=>a.type==='play'&&a.uid===kuuga.uid).length,0);
 put(cost,0,'KMR-2-064','front',0,true);
 assert.equal(universalBp(pack,cost,host(cost,cost.players[0].front[0].uid))>0,true);
 assert.ok(acts(cost,a=>a.type==='play'&&a.uid===kuuga.uid).length>0);
 let state=click(cost,a=>a.type==='play'&&a.uid===kuuga.uid&&a.line==='front');
 assert.equal(universalBp(pack,state,host(state,kuuga.uid)),5000);
 assert.equal(universalImpact(pack,state,host(state,kuuga.uid)),1);
 state.active=1;
 assert.equal(universalBp(pack,state,host(state,kuuga.uid)),4000);
 assert.equal(universalImpact(pack,state,host(state,kuuga.uid)),0);
 state.active=0;

 const empty=fresh(['KMR-2-074','KMR-2-010'],{},702);
 const hand=take(empty,0,'KMR-2-074');
 onlyHand(empty,0,[hand]);
 ready(empty);
 for(const line of ['front','energy'])empty.players[0][line]=empty.players[0][line].map(()=>null);
 assert.equal(zoneRequiredEnergy(pack,empty,0,pack.cards['KMR-2-074'],'hand'),0);
 assert.ok(acts(empty,a=>a.type==='play'&&a.uid===hand.uid).length>0);
 put(empty,0,'KMR-2-010','front',0,true);
 assert.equal(zoneRequiredEnergy(pack,empty,0,pack.cards['KMR-2-074'],'hand'),2);
 assertUniversalMatch(packs,empty);

 const block=fresh(['KMR-2-072','KMR-2-064','KMR-2-050','KMR-2-063'],{},703);
 put(block,0,'KMR-2-064','energy',0,true);
 const attacker=put(block,0,'KMR-2-072','front',0,true);
 const low=put(block,1,'KMR-2-050','front',0,true);
 const high=put(block,1,'KMR-2-063','front',1,true);
 ready(block);
 state=reach(block,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===attacker.uid);
 const blockers=acts(state,a=>a.type==='chooseBlock'&&a.uid).map(a=>a.uid);
 assert.equal(blockers.includes(low.uid),false);
 assert.equal(blockers.includes(high.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-071 charges one AP to be chosen, and cannot be chosen with none',()=>{
 const s=fresh(['KMR-2-077','KMR-2-071','KMR-2-072','KMR-2-064','KMR-2-045'],{'KMR-2-045':3},710);
 energy(s,0,3);
 put(s,1,'KMR-2-064','energy',0,true);
 const kabuto=put(s,1,'KMR-2-071','front',0,true);
 const other=put(s,1,'KMR-2-072','front',1,true);
 const event=take(s,0,'KMR-2-077');
 onlyHand(s,0,[event]);
 ready(s);
 s.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(uids(state,'retire').includes(kabuto.uid),false);
 assert.equal(uids(state,'retire').includes(other.uid),true);
 state=click(state,a=>a.mode==='retire'&&a.uid===other.uid);
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,0);

 const paid=fresh(['KMR-2-077','KMR-2-071','KMR-2-064','KMR-2-045'],{'KMR-2-045':3},711);
 energy(paid,0,3);
 put(paid,1,'KMR-2-064','front',0,true);
 const target=put(paid,1,'KMR-2-071','front',1,true);
 const card=take(paid,0,'KMR-2-077');
 onlyHand(paid,0,[card]);
 ready(paid);
 paid.players[0].apCards.forEach((c,i)=>{c.ready=i<2;});
 state=click(paid,a=>a.type==='event'&&a.uid===card.uid);
 assert.equal(uids(state,'retire').includes(target.uid),true);
 const before=state.players[0].apCards.filter(c=>c.ready).length;
 state=click(state,a=>a.mode==='retire'&&a.uid===target.uid);
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.equal(state.players[1].outside.some(c=>c.uid===target.uid),true);

 const own=fresh(['KMR-2-071','KMR-2-064'],{},712);
 put(own,0,'KMR-2-064','energy',0,true);
 const self=put(own,0,'KMR-2-071','front',0,true);
 ready(own);
 assert.equal(universalBp(pack,own,self),3000);
 own.active=1;
 assert.equal(pack.cards['KMR-2-071'].id,'KMR-2-071');

 const locked=fresh(['KMR-2-077','KMR-2-071','KMR-2-064','KMR-2-045'],{'KMR-2-045':3},713);
 energy(locked,0,3);
 put(locked,1,'KMR-2-064','energy',0,true);
 const only=put(locked,1,'KMR-2-071','front',0,true);
 const forced=take(locked,0,'KMR-2-077');
 onlyHand(locked,0,[forced]);
 ready(locked);
 locked.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
 state=click(locked,a=>a.type==='event'&&a.uid===forced.uid);
 assert.equal(state.pending,null);
 assert.equal(state.players[1].front.some(c=>c?.uid===only.uid),true);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='next'),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-076 shows six, may take one green Decade, then draws',()=>{
 const s=fresh(['KMR-2-076','KMR-2-064','KMR-2-070','KMR-2-010','KMR-2-020','KMR-2-066','KMR-2-045','KMR-2-072'],{},760);
 const event=take(s,0,'KMR-2-076');
 const decade=take(s,0,'KMR-2-064');
 const agito=take(s,0,'KMR-2-070');
 const rest=[take(s,0,'KMR-2-010'),take(s,0,'KMR-2-020'),take(s,0,'KMR-2-066'),take(s,0,'KMR-2-045')];
 const drawn=take(s,0,'KMR-2-072');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 top(s,0,[agito,decade,...rest]);
 s.players[0].deck.splice(6,0,drawn);
 s.players[0].hand.push(event);
 ready(s);
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(state.pending?.step,'lookPick');
 assert.equal(state.pending.data.uids.length,6);
 assert.deepEqual(uids(state,'take').sort(),[decade.uid,rest[2].uid].sort());
 assert.equal(uids(state,'take').includes(agito.uid),false);
 assert.equal(universalPrivateChoices(packs,state,0).inspected.some(c=>c.uid===agito.uid),true);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===drawn.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===decade.uid),false);
 assert.equal(state.publicReveals.some(e=>e.uid===agito.uid),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-077 retires 3000, or 5000 while Decade is on the field, and cannot decline',()=>{
 const s=fresh(['KMR-2-077','KMR-2-072','KMR-2-063','KMR-2-045'],{'KMR-2-045':2},770);
 energy(s,0,2);
 const small=put(s,1,'KMR-2-072','front',0,true);
 const mid=put(s,1,'KMR-2-063','front',1,true);
 const event=take(s,0,'KMR-2-077');
 onlyHand(s,0,[event]);
 ready(s);
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assert.deepEqual(uids(state,'retire'),[small.uid]);
 state=click(state,a=>a.mode==='retire'&&a.uid===small.uid);
 assert.equal(state.players[1].front.some(c=>c?.uid===mid.uid),true);

 const wide=fresh(['KMR-2-077','KMR-2-064','KMR-2-063','KMR-2-068','KMR-2-045'],{'KMR-2-045':2},771);
 energy(wide,0,2);
 put(wide,0,'KMR-2-064','front',0,true);
 const five=put(wide,1,'KMR-2-063','front',0,true);
 const over=put(wide,1,'KMR-2-068','front',1,true);
 over.buffs=[{bp:1000,untilTurn:wide.turn}];
 const card=take(wide,0,'KMR-2-077');
 onlyHand(wide,0,[card]);
 ready(wide);
 state=click(wide,a=>a.type==='event'&&a.uid===card.uid);
 assert.equal(uids(state,'retire').includes(five.uid),true);
 assert.equal(uids(state,'retire').includes(over.uid),false);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-079 is Sieg by name, and the raid source enters rested with its on play',()=>{
 assert.equal(cardHasName(pack.cards['KMR-2-079'],'ジーク',false),true);
 assert.equal(cardHasName(pack.cards['KMR-2-079'],'ジーク',true),false);
 const s=fresh(['KMR-2-079','KMR-2-080','KMR-2-063','KMR-2-010','KMR-2-020','KMR-2-066','KMR-2-045'],
  {'KMR-2-045':2},790);
 energy(s,1,2);
 const sieg=take(s,1,'KMR-2-080');
 const wing=put(s,1,'KMR-2-079','front',0,true);
 wing.stack=[sieg];
 const a=take(s,1,'KMR-2-010'),b=take(s,1,'KMR-2-020'),c=take(s,1,'KMR-2-066');
 s.players[1].deck.unshift(a,b,c);
 const attacker=put(s,0,'KMR-2-063','front',0,true);
 ready(s);
 const legalBase=fresh(['KMR-2-079','KMR-2-080','KMR-2-082'],{'KMR-2-079':2,'KMR-2-082':2},791);
 for(let i=0;i<2;i++)put(legalBase,0,'KMR-2-082','energy',i,true);
 const base=put(legalBase,0,'KMR-2-080','front',0,true);
 const rider=take(legalBase,0,'KMR-2-079');
 const otherWing=put(legalBase,0,'KMR-2-079','front',1,true);
 legalBase.players[0].hand.push(rider);
 ready(legalBase);
 assert.ok(acts(legalBase,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid).length>0);
 assert.equal(acts(legalBase,a=>a.type==='raid'&&a.baseUid===otherWing.uid).length,0);

 let state=reach(s,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===attacker.uid);
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===wing.uid);
 assert.equal(state.pending?.id,'KMR-2-079');
 assert.equal(state.pending.step,'enter');
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),true);
 const spot=state.pending.actions.find(a=>a.mode==='enter'&&a.uid===sieg.uid);
 assert.equal(spot.ready,false);
 assert.equal(spot.skipOnPlay,false);
 assert.equal(state.players[1].outside.some(c=>c.uid===sieg.uid),true);
 state=click(state,a=>a.mode==='enter'&&a.uid===sieg.uid&&a.line==='front'&&a.slot===spot.slot);
 const entered=host(state,sieg.uid,1);
 assert.equal(entered.ready,false);
 assert.equal(state.pending?.id,'KMR-2-080');
 assert.equal(state.pending.step,'lookPick');
 assert.deepEqual(state.pending.data.uids,[a.uid,b.uid,c.uid]);
 assert.equal(universalPrivateChoices(packs,state,1).inspected.length,3);
 assert.equal(universalPrivateChoices(packs,state,0),null);
 state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.notEqual(state.pending?.kind,'block');
 assert.equal(state.players[1].front.filter(c=>c?.uid===wing.uid).length,0);
 assertUniversalMatch(packs,state);
});

test('KMR-2-079 can leave the raid source outside',()=>{
 const s=fresh(['KMR-2-079','KMR-2-080','KMR-2-063','KMR-2-045'],{'KMR-2-045':2},792);
 energy(s,1,2);
 const sieg=take(s,1,'KMR-2-080');
 const wing=put(s,1,'KMR-2-079','front',0,true);
 wing.stack=[sieg];
 const attacker=put(s,0,'KMR-2-063','front',0,true);
 ready(s);
 let state=reach(s,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===attacker.uid);
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===wing.uid);
 state=click(state,a=>a.mode==='skip');
 assert.equal(state.players[1].outside.some(c=>c.uid===sieg.uid),true);
 assert.equal(host(state,sieg.uid,1),undefined);
 assert.notEqual(state.pending?.id,'KMR-2-080');
 assertUniversalMatch(packs,state);
});

test('KMR-2-080 leaves at its main start and rests one legal outside card',()=>{
 const s=fresh(['KMR-2-080','KMR-2-079','KMR-1-078','KMR-1-089','KMR-1-091','KMR-2-010','KMR-2-045'],
  {'KMR-2-045':3},800);
 energy(s,0,3);
 const sieg=put(s,0,'KMR-2-080','front',0,true);
 const wing=take(s,0,'KMR-2-079');
 const platform=take(s,0,'KMR-1-078');
 const ura=take(s,0,'KMR-1-089');
 const deneb=take(s,0,'KMR-1-091');
 const green=take(s,0,'KMR-2-010');
 s.players[0].outside.push(wing,platform,ura,deneb,green);
 ready(s);
 trim(s,0);trim(s,1);
 let state=reach(s,0,'move');
 state=advance(state);
 assert.equal(state.players[0].outside.some(c=>c.uid===sieg.uid),true);
 assert.equal(host(state,sieg.uid),undefined);
 assert.equal(state.pending?.id,'KMR-2-080');
 assert.equal(state.pending.step,'deployPick');
 const offered=uids(state,'deploy');
 assert.equal(offered.includes(platform.uid),true);
 assert.equal(offered.includes(ura.uid),true);
 assert.equal(offered.includes(deneb.uid),true);
 assert.equal(offered.includes(wing.uid),false);
 assert.equal(offered.includes(green.uid),false);
 assert.equal(offered.includes(sieg.uid),false);
 state=click(state,a=>a.mode==='deploy'&&a.uid===platform.uid);
 const spot=state.pending.actions.find(a=>a.mode==='enter'&&a.uid===platform.uid&&a.line==='front');
 assert.equal(spot.ready,false);
 assert.equal(spot.skipOnPlay,false);
 state=click(state,a=>a.mode==='enter'&&a.uid===platform.uid&&a.line==='front'&&a.slot===spot.slot);
 assert.equal(host(state,platform.uid)?.ready,false);
 assert.equal(state.pending?.kind,'effect-discard');
 assertUniversalMatch(packs,state);

 const quiet=fresh(['KMR-2-080','KMR-1-089','KMR-2-045'],{'KMR-2-045':3},801);
 energy(quiet,0,3);
 put(quiet,0,'KMR-2-080','front',0,true);
 const keep=take(quiet,0,'KMR-1-089');
 quiet.players[0].outside.push(keep);
 ready(quiet);
 trim(quiet,0);trim(quiet,1);
 state=reach(quiet,0,'move');
 state=advance(state);
 state=click(state,a=>a.mode==='done');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].outside.some(c=>c.uid===keep.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-080 look puts one card outside without revealing it',()=>{
 const s=fresh(['KMR-2-080','KMR-2-010','KMR-2-020','KMR-2-066','KMR-2-082'],{},802);
 put(s,0,'KMR-2-082','energy',0,true);
 const sieg=take(s,0,'KMR-2-080');
 const a=take(s,0,'KMR-2-010'),b=take(s,0,'KMR-2-020'),c=take(s,0,'KMR-2-066');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 top(s,0,[a,b,c]);
 s.players[0].hand.push(sieg);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===sieg.uid&&a.line==='front');
 assert.equal(state.pending?.step,'lookPick');
 assert.deepEqual(state.pending.data.uids,[a.uid,b.uid,c.uid]);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 state=click(state,a=>a.mode==='outside'&&a.uid===b.uid);
 assert.equal(state.publicReveals.some(e=>e.uid===b.uid),false);
 assert.equal(state.players[0].outside.some(c=>c.uid===b.uid),true);
 assert.equal(state.pending?.step,'lookOrder');
 while(state.pending?.step==='lookOrder'){
  const prefer=state.pending.actions.find(a=>a.uid===c.uid)||state.pending.actions[0];
  state=dispatchUniversalAction(packs,state,prefer);
 }
 assert.equal(state.players[0].deck.at(-1)?.uid,a.uid);
 assert.equal(state.players[0].deck.at(-2)?.uid,c.uid);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('KMR-2-080 replaces an energy card when that line stays full',()=>{
 const s=fresh(['KMR-2-080','KMR-1-089','KMR-2-045','KMR-2-066','KMR-2-064'],{'KMR-2-045':4},803);
 energy(s,0,4);
 const sieg=put(s,0,'KMR-2-080','front',0,true);
 put(s,0,'KMR-2-066','front',1,true);
 put(s,0,'KMR-2-064','front',2,true);
 const keep=take(s,0,'KMR-1-089');
 s.players[0].outside.push(keep);
 ready(s);
 trim(s,0);trim(s,1);
 let state=reach(s,0,'move');
 state=advance(state);
 state=click(state,a=>a.mode==='deploy'&&a.uid===keep.uid);
 const front=state.pending.actions.filter(a=>a.mode==='enter'&&a.line==='front');
 const energyLine=state.pending.actions.filter(a=>a.mode==='enter'&&a.line==='energy');
 assert.equal(front.some(a=>!a.replaceUid),true);
 assert.equal(energyLine.length>0&&energyLine.every(a=>a.replaceUid),true);
 const swap=energyLine[0];
 state=click(state,a=>a.mode==='enter'&&a.line==='energy'&&a.replaceUid===swap.replaceUid);
 assert.equal(state.players[0].removed.some(c=>c.uid===swap.replaceUid),true);
 assert.equal(host(state,keep.uid)?.ready,false);
 assertUniversalMatch(packs,state);
});

test('life triggers of KMR-2-061 through 080 resolve on the revealed card',()=>{
 const none=['KMR-2-066','KMR-2-074'];
 const draws=['KMR-2-064','KMR-2-071','KMR-2-075','KMR-2-076','KMR-2-080'];
 const gets=['KMR-2-063','KMR-2-073','KMR-2-079'];
 const actives=['KMR-2-065','KMR-2-070','KMR-2-072'];
 const open=(id,seed)=>fresh([id,'KMR-2-010','KMR-2-066'],{},seed);
 for(const id of none){
  let s=open(id,8000+Number(id.slice(-3)));
  const poke=put(s,0,'KMR-2-010','front',0,true);
  const trigger=take(s,1,id);
  s.players[1].deck.push(s.players[1].life[0]);
  s.players[1].life[0]=trigger;
  ready(s);
  s=reach(s,0,'attack');
  s=click(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=click(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].outside.some(c=>c.uid===trigger.uid),true,id);
 }
 for(const id of draws){
  let s=open(id,8100+Number(id.slice(-3)));
  const poke=put(s,0,'KMR-2-010','front',0,true);
  const trigger=take(s,1,id);
  s.players[1].deck.push(s.players[1].life[0]);
  s.players[1].life[0]=trigger;
  const hand=s.players[1].hand.length;
  ready(s);
  s=reach(s,0,'attack');
  s=click(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=click(s,a=>a.type==='chooseBlock'&&a.uid===null);
  assert.equal(acts(s,a=>a.mode==='skip').length,1,id);
  s=click(s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.equal(s.players[1].hand.length,hand+1,id);
 }
 for(const id of gets){
  let s=open(id,8200+Number(id.slice(-3)));
  const poke=put(s,0,'KMR-2-010','front',0,true);
  const trigger=take(s,1,id);
  s.players[1].deck.push(s.players[1].life[0]);
  s.players[1].life[0]=trigger;
  ready(s);
  s=reach(s,0,'attack');
  s=click(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=click(s,a=>a.type==='chooseBlock'&&a.uid===null);
  s=click(s,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true,id);
 }
 for(const id of actives){
  let s=open(id,8300+Number(id.slice(-3)));
  const poke=put(s,0,'KMR-2-010','front',0,true);
  const ally=put(s,1,'KMR-2-066','front',0,false);
  const before=universalBp(pack,s,ally);
  const trigger=take(s,1,id);
  s.players[1].deck.push(s.players[1].life[0]);
  s.players[1].life[0]=trigger;
  ready(s);
  s=reach(s,0,'attack');
  s=click(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=click(s,a=>a.type==='chooseBlock'&&a.uid===null);
  s=click(s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===ally.uid);
  assert.equal(host(s,ally.uid,1).ready,true,id);
  assert.equal(universalBp(pack,s,host(s,ally.uid,1)),before+3000,id);
 }
 let special=fresh(['KMR-2-061','KMR-2-010'],{},8061);
 const small=put(special,0,'KMR-2-010','front',0,true);
 const card=take(special,1,'KMR-2-061');
 special.players[1].deck.push(special.players[1].life[0]);
 special.players[1].life[0]=card;
 ready(special);
 special=reach(special,0,'attack');
 special=click(special,a=>a.type==='attack'&&a.uid===small.uid);
 special=click(special,a=>a.type==='chooseBlock'&&a.uid===null);
 special=click(special,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===small.uid);
 assert.equal(special.players[0].outside.some(c=>c.uid===small.uid),true);
 let color=fresh(['KMR-2-067','KMR-2-064','KMR-2-073','KMR-2-066'],{},8067);
 const hitter=put(color,0,'KMR-2-066','front',0,true);
 const decade=take(color,1,'KMR-2-064');
 const heavy=take(color,1,'KMR-2-073');
 color.players[1].hand.push(decade,heavy);
 const trigger=take(color,1,'KMR-2-067');
 color.players[1].deck.push(color.players[1].life[0]);
 color.players[1].life[0]=trigger;
 ready(color);
 color=reach(color,0,'attack');
 color=click(color,a=>a.type==='attack'&&a.uid===hitter.uid);
 color=click(color,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(acts(color,a=>a.mode==='color'&&a.uid===decade.uid).length>0,true);
 assert.equal(acts(color,a=>a.mode==='color'&&a.uid===heavy.uid).length,0);
 color=click(color,a=>a.type==='chooseTrigger'&&a.mode==='color'&&a.uid===decade.uid&&a.line==='front');
 assert.equal(color.pending?.kind,'effect-discard');
 assert.equal(host(color,decade.uid,1)?.ready,true);
 let early=fresh(['KMR-2-062','KMR-2-010'],{},8062);
 const poke=put(early,0,'KMR-2-010','front',0,true);
 const final=take(early,1,'KMR-2-062');
 early.players[1].deck.push(early.players[1].life[0]);
 early.players[1].life[0]=final;
 ready(early);
 early=reach(early,0,'attack');
 early=click(early,a=>a.type==='attack'&&a.uid===poke.uid);
 early=click(early,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(acts(early,a=>a.mode==='final').length,0);
 let last=fresh(['KMR-2-078','KMR-2-010'],{},8078);
 const batter=put(last,0,'KMR-2-010','front',0,true);
 const lastCard=take(last,1,'KMR-2-078');
 last.players[1].deck.push(...last.players[1].life.splice(0));
 last.players[1].life.push(lastCard);
 const recovered=last.players[1].deck[0];
 ready(last);
 last=reach(last,0,'attack');
 last=click(last,a=>a.type==='attack'&&a.uid===batter.uid);
 last=click(last,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(last.pending.trigger,'final');
 const skipped=dispatchUniversalAction(packs,structuredClone(last),
  legalUniversalActions(packs,last).find(a=>a.mode==='skip'));
 assert.equal(skipped.players[1].life.length,0);
 last=click(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life[0].uid,recovered.uid);
 let raid=fresh(['KMR-2-068','KMR-2-064','KMR-2-072','KMR-2-045'],{'KMR-2-045':3},8068);
 energy(raid,1,3);
 const base=put(raid,1,'KMR-2-064','front',0,true);
 const attacker=put(raid,0,'KMR-2-064','front',0,true);
 const raidCard=take(raid,1,'KMR-2-068');
 const re=take(raid,1,'KMR-2-072');
 raid.players[1].hand.push(re);
 raid.players[1].deck.push(raid.players[1].life[0]);
 raid.players[1].life[0]=raidCard;
 ready(raid);
 raid=reach(raid,0,'attack');
 raid=click(raid,a=>a.type==='attack'&&a.uid===attacker.uid);
 raid=click(raid,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(acts(raid,a=>a.mode==='get').length,1);
 assert.equal(acts(raid,a=>a.mode==='raid'&&a.baseUid===base.uid).length>0,true);
 raid=click(raid,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front');
 assert.equal(raid.pending?.id,'KMR-2-068');
 assert.equal(raid.pending.step,'removeTwo');
 assertUniversalMatch(packs,raid);
});
