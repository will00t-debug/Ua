import test from 'node:test';
import assert from 'node:assert/strict';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalBp,universalCardEnergy,universalImpact,universalPrivateChoices,
 zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

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
function fresh(ids,extra,seed=81){
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
function trim(s,p){while(s.players[p].hand.length>6)s.players[p].deck.push(s.players[p].hand.pop());}
function advance(s){
 if(s.pending?.kind==='end-hand-limit')return click(s,a=>a.type==='chooseHandLimit');
 assert.equal(s.pending,null,s.pending?.kind||s.pending?.id);
 return dispatchUniversalAction(packs,s,{type:'next'});
}
function reach(s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  trim(s,s.active);
  s=advance(s);
  if(++guard>30)throw Error('stuck '+s.active+' '+s.phase+' '+(s.pending?.kind||s.pending?.id||''));
 }
 return s;
}
function red(s,p,n){
 for(let i=0;i<n;i++)put(s,p,'KMR-2-085','energy',i,true);
}
function onlyHand(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function top(s,p,cards){s.players[p].deck.unshift(...cards);}
function host(s,uid,p=0){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function quietLife(s,p,id){
 const card=take(s,p,id);
 s.players[p].deck.push(s.players[p].life[0]);
 s.players[p].life[0]=card;
 return card;
}

test('KMR-2-081 and KMR-2-098 recover zero, one, or two rested AP',()=>{
 for(const id of ['KMR-2-081','KMR-2-098']){
  const s=fresh([id,'KMR-2-085'],{'KMR-2-085':2},810);
  red(s,0,2);
  const event=take(s,0,id);
  onlyHand(s,0,[event]);
  ready(s);
  s.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
  let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
  assert.equal(state.pending?.kind,'effect-recover-ap');
  assert.equal(acts(state,a=>a.uid===null).length,1);
  state=click(state,a=>a.type==='chooseApRecovery'&&a.uid===null);
  assert.equal(state.pending,null);
  assert.equal(state.players[0].apCards.filter(c=>c.ready).length,0);
  const two=fresh([id,'KMR-2-085'],{'KMR-2-085':2},811);
  red(two,0,2);
  const again=take(two,0,id);
  onlyHand(two,0,[again]);
  ready(two);
  two.players[0].apCards.forEach((c,i)=>{c.ready=i===0;});
  state=click(two,a=>a.type==='event'&&a.uid===again.uid);
  state=click(state,a=>a.uid);
  assert.equal(state.players[0].apCards.filter(c=>c.ready).length,1);
  assert.equal(acts(state,a=>a.uid===null).length,1);
  state=click(state,a=>a.uid);
  assert.equal(state.pending,null);
  assert.equal(state.players[0].apCards.filter(c=>c.ready).length,2);
  assertUniversalMatch(packs,state);
 }
});

test('KMR-2-082 discounts red energy only without a front Faiz, then may look',()=>{
 const s=fresh(['KMR-2-082','KMR-2-083','KMR-2-085','KMR-2-097','KMR-2-010'],{'KMR-2-085':3},820);
 red(s,0,2);
 const kaixa=take(s,0,'KMR-2-082');
 onlyHand(s,0,[kaixa]);
 ready(s);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-2-082'],'hand'),3);
 assert.equal(acts(s,a=>a.type==='play'&&a.uid===kaixa.uid).length>0,true);
 const side=put(s,0,'KMR-2-083','energy',2,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-2-082'],'hand'),3);
 s.players[0].energy[2]=null;
 s.players[0].front[0]=side;
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-2-082'],'hand'),5);
 assert.equal(acts(s,a=>a.type==='play'&&a.uid===kaixa.uid).length,0);
 s.players[0].front[0]=null;
 s.players[0].deck.push(side);
 let state=click(s,a=>a.type==='play'&&a.uid===kaixa.uid&&a.line==='front');
 assert.equal(state.pending,null);
 assert.equal(host(state,kaixa.uid)?.ready,false);
 assert.equal(universalBp(pack,state,host(state,kaixa.uid)),3000);
 const frontFaiz=put(state,0,'KMR-2-083','front',1,true);
 assert.equal(universalBp(pack,state,host(state,kaixa.uid)),4000);
 state.active=1;
 assert.equal(universalBp(pack,state,host(state,kaixa.uid)),3000);
 state.active=0;
 state.players[0].front[1]=null;
 state.players[0].deck.push(frontFaiz);

 const look=fresh(['KMR-2-082','KMR-2-083','KMR-2-085','KMR-2-097','KMR-2-010'],{'KMR-2-085':3,'KMR-2-010':2},821);
 red(look,0,2);
 const rider=take(look,0,'KMR-2-082');
 const pay=take(look,0,'KMR-2-083');
 const character=take(look,0,'KMR-2-010');
 const field=take(look,0,'KMR-2-097');
 const other=take(look,0,'KMR-2-085');
 const plain=take(look,0,'KMR-2-010');
 top(look,0,[character,field,other,plain]);
 onlyHand(look,0,[rider,pay]);
 ready(look);
 state=click(look,a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.equal(state.pending?.step,'discard');
 assert.equal(acts(state,a=>a.mode==='skip').length,1);
 state=click(state,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===pay.uid),true);
 assert.equal(state.pending?.step,'lookPick');
 assert.equal(state.pending.data.uids.length,4);
 assert.equal(acts(state,a=>a.uid===field.uid).length,0);
 assert.equal(acts(state,a=>a.uid===character.uid).length,1);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 const shown=universalPrivateChoices(packs,state,0);
 assert.equal(shown.inspected.length,4);
 state=click(state,a=>a.uid===character.uid);
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.players[0].hand.some(c=>c.uid===character.uid),true);
 assert.equal(state.publicReveals.some(e=>e.uid===character.uid),true);
 assert.equal(state.publicReveals.some(e=>e.uid===field.uid),false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-083 retires the blocker after a lost blocked battle only',()=>{
 const lost=fresh(['KMR-2-083','KMR-2-082','KMR-2-010','KMR-2-092'],{},830);
 const rider=put(lost,0,'KMR-2-083','front',0,true);
 const wall=put(lost,1,'KMR-2-082','front',0,true);
 const other=put(lost,1,'KMR-2-010','front',1,true);
 quietLife(lost,1,'KMR-2-092');
 ready(lost);
 let state=reach(lost,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===rider.uid);
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(host(state,rider.uid)?.uid,rider.uid);
 assert.equal(state.pending?.id,'KMR-2-083');
 assert.equal(state.pending.step,'retire');
 assert.deepEqual(acts(state,a=>a.mode==='retire').map(a=>a.uid),[wall.uid]);
 assert.equal(acts(state,a=>a.uid===other.uid).length,0);
 assert.equal(acts(state,a=>a.mode==='skip').length,1);
 state=click(state,a=>a.mode==='retire'&&a.uid===wall.uid);
 assert.equal(state.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(host(state,other.uid,1)?.uid,other.uid);
 assertUniversalMatch(packs,state);

 const high=fresh(['KMR-2-083','KMR-2-084','KMR-2-092'],{},831);
 const small=put(high,0,'KMR-2-083','front',0,true);
 const big=put(high,1,'KMR-2-084','front',0,true);
 quietLife(high,1,'KMR-2-092');
 ready(high);
 state=reach(high,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===small.uid);
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===big.uid);
 assert.equal(state.pending?.id==='KMR-2-083',false);
 assert.equal(host(state,big.uid,1)?.uid,big.uid);

 const win=fresh(['KMR-2-083','KMR-2-010','KMR-2-092'],{},832);
 const winner=put(win,0,'KMR-2-083','front',0,true);
 const low=put(win,1,'KMR-2-010','front',0,true);
 quietLife(win,1,'KMR-2-092');
 ready(win);
 state=reach(win,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===winner.uid);
 state=click(state,a=>a.type==='chooseBlock'&&a.uid===low.uid);
 assert.equal(state.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(state.pending?.id==='KMR-2-083',false);

 const direct=fresh(['KMR-2-083','KMR-2-092'],{},833);
 const shooter=put(direct,0,'KMR-2-083','front',0,true);
 quietLife(direct,1,'KMR-2-092');
 ready(direct);
 state=reach(direct,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===shooter.uid);
 if(state.pending?.kind==='block')state=click(state,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(state.pending?.id==='KMR-2-083',false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-084 pays one AP and a Final Vent before the optional retire',()=>{
 const none=fresh(['KMR-2-084','KMR-2-085','KMR-2-100'],{'KMR-2-085':2},840);
 red(none,0,2);
 const ouja=take(none,0,'KMR-2-084');
 onlyHand(none,0,[ouja]);
 ready(none);
 let state=click(none,a=>a.type==='play'&&a.uid===ouja.uid&&a.line==='front');
 assert.equal(state.pending,null);

 const s=fresh(['KMR-2-084','KMR-2-085','KMR-2-100','KMR-2-083','KMR-2-010'],
  {'KMR-2-085':2,'KMR-2-083':2},841);
 red(s,0,2);
 const rider=take(s,0,'KMR-2-084');
 const vent=take(s,0,'KMR-2-100');
 const same=take(s,0,'KMR-2-083');
 const different=take(s,0,'KMR-2-010');
 s.players[0].outside.push(same,different);
 const target=put(s,1,'KMR-2-083','front',0,true);
 const tall=put(s,1,'KMR-2-084','front',1,true);
 tall.buffs=[{bp:2000,untilTurn:s.turn}];
 onlyHand(s,0,[rider,vent]);
 ready(s);
 const before=s.players[0].apCards.filter(c=>c.ready).length;
 state=click(s,a=>a.type==='play'&&a.uid===rider.uid&&a.line==='front');
 assert.equal(state.pending?.step,'ventPay');
 assert.equal(acts(state,a=>a.mode==='skip').length,1);
 const skipped=click(state,a=>a.mode==='skip');
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===vent.uid),true);
 state=click(state,a=>a.mode==='discard'&&a.uid===vent.uid);
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,before-2);
 assert.equal(state.players[0].outside.some(c=>c.uid===vent.uid),true);
 assert.equal(state.pending?.step,'retire');
 assert.equal(acts(state,a=>a.uid===target.uid).length,1);
 assert.equal(acts(state,a=>a.uid===tall.uid).length,0);
 const declined=click(state,a=>a.mode==='skip');
 assert.equal(declined.pending,null);
 assert.equal(host(declined,target.uid,1)?.uid,target.uid);
 state=click(state,a=>a.mode==='retire'&&a.uid===target.uid);
 assert.equal(state.pending?.step,'hand');
 assert.deepEqual(acts(state,a=>a.mode==='hand').map(a=>a.uid),[same.uid]);
 state=click(state,a=>a.mode==='hand'&&a.uid===same.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===same.uid),true);
 assert.equal(state.players[0].outside.some(c=>c.uid===different.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-085 discards one Final Vent, attacks from energy, and loses that next turn',()=>{
 const s=fresh(['KMR-2-085','KMR-2-100','KMR-2-068','KMR-2-092'],{'KMR-2-085':2,'KMR-2-100':2},850);
 const rider=put(s,0,'KMR-2-085','energy',0,true);
 const vent=take(s,0,'KMR-2-100');
 s.players[0].hand.push(vent);
 ready(s);
 assert.equal(acts(s,a=>a.type==='activate'&&a.uid===rider.uid).length,1);
 let state=click(s,a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 state=click(state,a=>a.mode==='discard'&&a.uid===vent.uid);
 const body=host(state,rider.uid);
 assert.equal(universalBp(pack,state,body),4000);
 assert.equal(body.kmr2EnergyAttack.stamp,body.fieldEntryStamp);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,0);
 state=reach(state,0,'attack');
 assert.equal(acts(state,a=>a.type==='attack'&&a.uid===rider.uid).length,1);
 state=reach(state,1,'start');
 state=reach(state,0,'main');
 assert.equal(host(state,rider.uid).kmr2EnergyAttack,undefined);
 const later=take(state,0,'KMR-2-100');
 state.players[0].hand.push(later);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-086 shows both cards and puts the chosen one outside without revealing it',()=>{
 const s=fresh(['KMR-2-086','KMR-2-090','KMR-2-010','KMR-2-085'],{'KMR-2-085':1},860);
 red(s,0,1);
 const knight=take(s,0,'KMR-2-086');
 const ryuki=take(s,0,'KMR-2-090');
 const other=take(s,0,'KMR-2-010');
 top(s,0,[other,ryuki]);
 onlyHand(s,0,[knight]);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===knight.uid&&a.line==='front');
 assert.equal(state.pending?.step,'lookPick');
 assert.equal(state.pending.data.uids.length,2);
 assert.equal(acts(state,a=>a.uid===other.uid).length,0);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 assert.equal(universalPrivateChoices(packs,state,0).inspected.length,2);
 state=click(state,a=>a.uid===ryuki.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===ryuki.uid),true);
 assert.equal(state.publicReveals.some(e=>e.uid===ryuki.uid),false);
 assert.equal(state.players[0].deck[0]?.uid,other.uid);
 const decline=fresh(['KMR-2-086','KMR-2-090','KMR-2-010','KMR-2-085'],{'KMR-2-085':1},861);
 red(decline,0,1);
 const again=take(decline,0,'KMR-2-086');
 const a=take(decline,0,'KMR-2-010');
 const b=take(decline,0,'KMR-2-090');
 top(decline,0,[a,b]);
 onlyHand(decline,0,[again]);
 ready(decline);
 state=click(decline,a=>a.type==='play'&&a.uid===again.uid&&a.line==='energy');
 state=click(state,a=>a.mode==='done');
 assert.equal(state.pending?.step,'lookOrder');
 state=click(state,a=>a.uid===b.uid);
 state=click(state,a=>a.uid===a.uid);
 assert.equal(state.players[0].deck[0]?.uid,b.uid);
 assert.equal(state.players[0].deck[1]?.uid,a.uid);
 assertUniversalMatch(packs,state);
});

test('KMR-2-087 orders the rest before the hand card goes outside',()=>{
 const s=fresh(['KMR-2-087','KMR-2-090','KMR-2-010','KMR-2-097','KMR-2-085'],{'KMR-2-085':1,'KMR-2-010':2},870);
 red(s,0,1);
 const knight=take(s,0,'KMR-2-087');
 const ryuki=take(s,0,'KMR-2-090');
 const other=take(s,0,'KMR-2-010');
 const field=take(s,0,'KMR-2-097');
 const spare=take(s,0,'KMR-2-010');
 top(s,0,[other,ryuki,field]);
 onlyHand(s,0,[knight,spare]);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===knight.uid&&a.line==='front');
 assert.equal(acts(state,a=>a.uid===field.uid).length,0);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 state=click(state,a=>a.uid===ryuki.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===ryuki.uid),true);
 assert.equal(state.publicReveals.some(e=>e.uid===ryuki.uid),true);
 assert.equal(state.pending?.step,'lookOrder');
 state=click(state,a=>a.uid===field.uid);
 state=click(state,a=>a.uid===other.uid);
 assert.equal(state.pending?.step,'discard');
 assert.equal(state.players[0].deck.at(-1)?.uid,other.uid);
 assert.equal(state.players[0].deck.at(-2)?.uid,field.uid);
 state=click(state,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===spare.uid),true);
 const skip=fresh(['KMR-2-087','KMR-2-010','KMR-2-097','KMR-2-085'],{'KMR-2-085':2,'KMR-2-010':2},871);
 red(skip,0,1);
 const quiet=take(skip,0,'KMR-2-087');
 const hand=take(skip,0,'KMR-2-010');
 top(skip,0,[take(skip,0,'KMR-2-010'),take(skip,0,'KMR-2-097'),take(skip,0,'KMR-2-085')]);
 onlyHand(skip,0,[quiet,hand]);
 ready(skip);
 state=click(skip,a=>a.type==='play'&&a.uid===quiet.uid&&a.line==='front');
 if(state.pending?.step==='lookPick')state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===hand.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-088 is free on an empty field and the attack may draw',()=>{
 const s=fresh(['KMR-2-088','KMR-2-100','KMR-2-092'],{},880);
 const knight=take(s,0,'KMR-2-088');
 const vent=take(s,0,'KMR-2-100');
 onlyHand(s,0,[knight,vent]);
 ready(s);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['KMR-2-088'],'hand'),0);
 let state=click(s,a=>a.type==='play'&&a.uid===knight.uid&&a.line==='front');
 assert.equal(state.pending,null);
 assert.equal(host(state,knight.uid)?.ready,false);
 put(state,0,'KMR-2-092','energy',0,true);
 assert.equal(zoneRequiredEnergy(pack,state,0,pack.cards['KMR-2-088'],'hand'),2);
 state=reach(state,1,'start');
 state=reach(state,0,'attack');
 const drawn=state.players[0].deck.length;
 state=click(state,a=>a.type==='attack'&&a.uid===knight.uid);
 assert.equal(state.pending?.id,'KMR-2-088');
 assert.equal(acts(state,a=>a.mode==='skip').length,1);
 const skipped=click(state,a=>a.mode==='skip');
 assert.equal(skipped.players[0].deck.length,drawn);
 assert.equal(universalBp(pack,skipped,host(skipped,knight.uid)),2500);
 state=click(state,a=>a.mode==='discard'&&a.uid===vent.uid);
 assert.equal(state.players[0].deck.length,drawn-1);
 assert.equal(universalBp(pack,state,host(state,knight.uid)),4000);
 assert.equal(state.players[0].outside.some(c=>c.uid===vent.uid),true);
 assertUniversalMatch(packs,state);
});

test('KMR-2-089 raid text looks at six and the main waits for a used Advent',()=>{
 const plain=fresh(['KMR-2-089','KMR-2-085','KMR-2-097'],{'KMR-2-085':2},890);
 red(plain,0,2);
 const loose=take(plain,0,'KMR-2-089');
 onlyHand(plain,0,[loose]);
 ready(plain);
 let state=click(plain,a=>a.type==='play'&&a.uid===loose.uid&&a.line==='front');
 assert.equal(state.pending?.id==='KMR-2-089',false);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===loose.uid).length,0);

 const s=fresh(['KMR-2-089','KMR-2-086','KMR-2-085','KMR-2-097','KMR-2-090','KMR-2-010'],
  {'KMR-2-085':2},891);
 red(s,0,2);
 const base=put(s,0,'KMR-2-086','front',0,false);
 const rider=take(s,0,'KMR-2-089');
 const advent=take(s,0,'KMR-2-097');
 const miss=take(s,0,'KMR-2-010');
 top(s,0,[advent,miss]);
 onlyHand(s,0,[rider]);
 ready(s);
 state=click(s,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 assert.equal(state.pending?.step,'lookPick');
 assert.equal(state.pending.data.uids.length,6);
 assert.equal(acts(state,a=>a.uid===miss.uid).length,0);
 assert.equal(universalPrivateChoices(packs,state,1),null);
 state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,0);
 const waiting=state.players[0].deck.findIndex(c=>c.uid===advent.uid);
 if(waiting>=0)state.players[0].deck.splice(waiting,1);
 state.players[0].hand.push(advent);
 const spent=state.players[0].apCards.filter(c=>c.ready).length;
 state=click(state,a=>a.type==='play'&&a.uid===advent.uid&&a.line==='energy');
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,spent-1);
 assert.equal(host(state,advent.uid)?.ready,true);
 const rested=put(state,0,'KMR-2-090','energy',3,false);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,1);
 state=click(state,a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(acts(state,a=>a.uid===rested.uid).length,1);
 state=click(state,a=>a.mode==='ready'&&a.uid===rested.uid);
 assert.equal(host(state,rested.uid)?.ready,true);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===rider.uid).length,0);
 assert.equal(state.kmr2AdventUsed[0],state.turn);
 assertUniversalMatch(packs,state);

 const moved=fresh(['KMR-2-089','KMR-2-086','KMR-2-085'],{'KMR-2-085':2},892);
 red(moved,0,2);
 const energyBase=put(moved,0,'KMR-2-086','energy',2,false);
 const mover=take(moved,0,'KMR-2-089');
 onlyHand(moved,0,[mover]);
 ready(moved);
 assert.equal(acts(moved,a=>a.type==='raid'&&a.uid===mover.uid&&a.baseUid===energyBase.uid&&a.line!=='energy').length>0,true);
 assert.equal(acts(moved,a=>a.type==='raid'&&a.uid===mover.uid&&a.baseUid===energyBase.uid&&a.line==='energy').length>0,true);
 state=click(moved,a=>a.type==='raid'&&a.uid===mover.uid&&a.baseUid===energyBase.uid&&a.slot===0&&a.line!=='energy');
 assert.equal(state.players[0].front[0]?.uid,mover.uid);
 assert.equal(host(state,mover.uid)?.ready,true);
 assert.equal(state.players[0].energy[2],null);
 if(state.pending?.step==='lookPick')state=click(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=click(state,a=>a.mode==='next');
 assertUniversalMatch(packs,state);
});

test('KMR-2-091 gains 1000 during its own turn while a Knight is on the field',()=>{
 const s=fresh(['KMR-2-091','KMR-2-086'],{},910);
 const ryuki=put(s,0,'KMR-2-091','front',0,true);
 ready(s);
 assert.equal(universalBp(pack,s,ryuki),3000);
 const knight=put(s,0,'KMR-2-086','energy',0,true);
 assert.equal(universalBp(pack,s,ryuki),4000);
 s.active=1;
 assert.equal(universalBp(pack,s,ryuki),3000);
 s.active=0;
 s.players[0].energy[0]=null;
 s.players[0].deck.push(knight);
 assert.equal(universalBp(pack,s,ryuki),3000);
 assertUniversalMatch(packs,s);
});

test('KMR-2-092 generates the extra red only while active on the energy line',()=>{
 const s=fresh(['KMR-2-092'],{'KMR-2-092':2},920);
 const energy=put(s,0,'KMR-2-092','energy',0,true);
 ready(s);
 assert.equal(universalCardEnergy(pack,s,0,energy),2);
 energy.ready=false;
 assert.equal(universalCardEnergy(pack,s,0,energy),1);
 const front=put(s,0,'KMR-2-092','front',0,true);
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 assertUniversalMatch(packs,s);
});

test('KMR-2-093 draws one when a Knight is already on the field',()=>{
 const quiet=fresh(['KMR-2-093','KMR-2-085'],{'KMR-2-085':1},930);
 red(quiet,0,1);
 const alone=take(quiet,0,'KMR-2-093');
 onlyHand(quiet,0,[alone]);
 ready(quiet);
 const deck=quiet.players[0].deck.length;
 let state=click(quiet,a=>a.type==='play'&&a.uid===alone.uid&&a.line==='front');
 assert.equal(state.players[0].deck.length,deck);
 const s=fresh(['KMR-2-093','KMR-2-086','KMR-2-085'],{'KMR-2-085':1},931);
 red(s,0,1);
 put(s,0,'KMR-2-086','energy',1,true);
 const ryuki=take(s,0,'KMR-2-093');
 onlyHand(s,0,[ryuki]);
 ready(s);
 const before=s.players[0].deck.length;
 state=click(s,a=>a.type==='play'&&a.uid===ryuki.uid&&a.line==='front');
 assert.equal(state.players[0].deck.length,before-1);
 assert.equal(state.players[0].hand.length,1);
 assertUniversalMatch(packs,state);
});

test('KMR-2-094 cuts the next Advent AP and rests on a raided leave',()=>{
 const s=fresh(['KMR-2-094','KMR-2-090','KMR-2-085','KMR-2-088','KMR-2-095','KMR-2-010'],
  {'KMR-2-085':2,'KMR-2-010':2},940);
 red(s,0,2);
 const base=put(s,0,'KMR-2-090','front',0,false);
 const rider=take(s,0,'KMR-2-094');
 const drawn=take(s,0,'KMR-2-010');
 const filler=take(s,0,'KMR-2-010');
 const knight=take(s,0,'KMR-2-088');
 const wing=take(s,0,'KMR-2-095');
 top(s,0,[drawn]);
 onlyHand(s,0,[rider,filler,knight,wing]);
 ready(s);
 let state=click(s,a=>a.type==='raid'&&a.uid===rider.uid&&a.baseUid===base.uid);
 assert.equal(state.players[0].hand.length,4);
 assert.equal(state.pending?.step,'discard');
 state=click(state,a=>a.mode==='discard'&&a.uid===filler.uid);
 assert.equal(state.kmr2NextAdventAp[0],state.turn);
 assert.equal(state.kmr2AdventUsed?.[0],undefined);
 const ap=state.players[0].apCards.filter(c=>c.ready).length;
 state=click(state,a=>a.type==='play'&&a.uid===knight.uid&&a.line==='energy');
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(state.kmr2NextAdventAp[0],state.turn);
 const after=state.players[0].apCards.filter(c=>c.ready).length;
 state=click(state,a=>a.type==='play'&&a.uid===wing.uid&&a.line==='energy');
 if(state.pending?.step==='triggerSafe')state=click(state,a=>a.mode==='skip');
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,after);
 assert.equal(state.kmr2NextAdventAp[0],null);

 const leave=fresh(['KMR-2-094','KMR-2-090','KMR-2-086','KMR-2-010','KMR-2-068'],{},941);
 const under=put(leave,0,'KMR-2-090','front',0,true);
 const survive=take(leave,0,'KMR-2-094');
 leave.players[0].front[0]=survive;
 survive.stack=[under];
 survive.ready=true;
 survive.fieldEntryStamp=leave.nextFieldEntryStamp++;
 const ally=put(leave,0,'KMR-2-086','energy',0,true);
 const foe=put(leave,1,'KMR-2-010','front',0,true);
 const bigger=put(leave,1,'KMR-2-068','front',1,true);
 ready(leave);
 let ended=reach(leave,1,'attack');
 ended=click(ended,a=>a.type==='attack'&&a.uid===bigger.uid);
 ended=click(ended,a=>a.type==='chooseBlock'&&a.uid===survive.uid);
 assert.equal(ended.pending?.id,'KMR-2-094');
 assert.equal(ended.pending.step,'rest');
 assert.equal(acts(ended,a=>a.mode==='skip').length,1);
 assert.equal(acts(ended,a=>a.uid===foe.uid).length,1);
 ended=click(ended,a=>a.mode==='rest'&&a.uid===foe.uid);
 assert.equal(host(ended,foe.uid,1)?.ready,false);
 assert.equal(host(ended,ally.uid)?.uid,ally.uid);
 const bare=fresh(['KMR-2-094','KMR-2-085','KMR-2-010'],{'KMR-2-085':2},942);
 red(bare,0,2);
 const normal=take(bare,0,'KMR-2-094');
 onlyHand(bare,0,[normal]);
 ready(bare);
 const played=click(bare,a=>a.type==='play'&&a.uid===normal.uid&&a.line==='front');
 assert.equal(played.pending?.id==='KMR-2-094',false);
 assertUniversalMatch(packs,played);
});

test('KMR-2-095 becomes Darkraider and cannot be chosen by a trigger',()=>{
 const s=fresh(['KMR-2-095','KMR-2-089','KMR-2-084','KMR-2-086','KMR-2-100'],{},950);
 const wing=put(s,0,'KMR-2-095','front',0,true);
 const survive=put(s,0,'KMR-2-089','energy',0,true);
 const big=put(s,1,'KMR-2-084','front',0,true);
 const small=put(s,1,'KMR-2-086','front',1,true);
 ready(s);
 assertUniversalMatch(packs,s);
 assert.equal(wing.kmr2Alias,'ダークレイダー');
 s.players[0].energy[0]=null;
 s.players[0].deck.push(survive);
 assertUniversalMatch(packs,s);
 assert.equal(wing.kmr2Alias,undefined);
 s.players[0].deck.splice(s.players[0].deck.indexOf(survive),1);
 s.players[0].energy[0]=survive;
 assertUniversalMatch(packs,s);
 assert.equal(wing.kmr2Alias,'ダークレイダー');
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:big.uid,
  targetUid:wing.uid,until:{player:0,phase:'start',edge:'start'},sourceLinked:false});
 assertUniversalMatch(packs,s);
 assert.equal(wing.kmr2Alias,undefined);
 s.continuousStates=s.continuousStates.filter(e=>e.kind!=='originalEffectsDisabled');
 assertUniversalMatch(packs,s);
 assert.equal(wing.kmr2Alias,'ダークレイダー');
 let state=reach(s,0,'attack');
 state=click(state,a=>a.type==='attack'&&a.uid===wing.uid);
 assert.equal(acts(state,a=>a.type==='chooseBlock'&&a.uid===big.uid).length,0);
 assert.equal(acts(state,a=>a.type==='chooseBlock'&&a.uid===small.uid).length,1);

 const guard=fresh(['KMR-2-095','KMR-2-086','KMR-2-010','KMR-2-100','KMR-2-092','KMR-2-085'],
  {'KMR-2-085':2,'KMR-2-100':1},951);
 red(guard,0,2);
 const protectedCard=put(guard,0,'KMR-2-086','front',0,true);
 const open=put(guard,0,'KMR-2-010','front',1,true);
 const played=take(guard,0,'KMR-2-095');
 onlyHand(guard,0,[played]);
 ready(guard);
 let armed=click(guard,a=>a.type==='play'&&a.uid===played.uid&&a.line==='energy');
 assert.equal(armed.pending?.step,'triggerSafe');
 armed=click(armed,a=>a.mode==='own'&&a.uid===protectedCard.uid);
 const protectedLive=host(armed,protectedCard.uid);
 assert.equal(protectedLive.kmr2TriggerImmune.stamp,protectedLive.fieldEntryStamp);
 const attacker=put(armed,0,'KMR-2-092','front',2,true);
 const life=take(armed,1,'KMR-2-100');
 armed.players[1].deck.push(armed.players[1].life[0]);
 armed.players[1].life[0]=life;
 let struck=reach(armed,0,'attack');
 const guarded=host(struck,protectedCard.uid);
 struck=click(struck,a=>a.type==='attack'&&a.uid===attacker.uid);
 struck=click(struck,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(acts(struck,a=>a.mode==='special'&&a.uid===guarded.uid).length,0);
 assert.equal(acts(struck,a=>a.mode==='special'&&a.uid===open.uid).length,1);
 assertUniversalMatch(packs,struck);
});

test('KMR-2-096 becomes Dragranzer and grants Impact for this entry',()=>{
 const s=fresh(['KMR-2-096','KMR-2-094','KMR-2-090'],{},960);
 const dragon=put(s,0,'KMR-2-096','front',0,true);
 ready(s);
 assert.equal(universalBp(pack,s,dragon),3000);
 const survive=put(s,0,'KMR-2-094','energy',0,true);
 assertUniversalMatch(packs,s);
 assert.equal(dragon.kmr2Alias,'ドラグランザー');
 assert.equal(universalBp(pack,s,dragon),4000);
 s.active=1;
 assert.equal(universalBp(pack,s,dragon),3000);
 s.active=0;
 s.players[0].energy[0]=null;
 s.players[0].deck.push(survive);
 assertUniversalMatch(packs,s);
 assert.equal(dragon.kmr2Alias,undefined);
 assert.equal(universalBp(pack,s,dragon),3000);

 const play=fresh(['KMR-2-096','KMR-2-090','KMR-2-085'],{'KMR-2-085':2},961);
 red(play,0,2);
 const body=take(play,0,'KMR-2-096');
 const ryuki=put(play,0,'KMR-2-090','front',0,true);
 onlyHand(play,0,[body]);
 ready(play);
 let state=click(play,a=>a.type==='play'&&a.uid===body.uid&&a.line==='energy');
 assert.equal(state.pending?.step,'impact');
 assert.equal(acts(state,a=>a.mode==='skip').length,1);
 state=click(state,a=>a.mode==='own'&&a.uid===ryuki.uid);
 const granted=host(state,ryuki.uid);
 assert.equal(universalImpact(pack,state,granted),1);
 const old=granted.fieldEntryStamp;
 granted.fieldEntryStamp=state.nextFieldEntryStamp++;
 assert.equal(universalImpact(pack,state,granted),0);
 granted.fieldEntryStamp=old;
 assertUniversalMatch(packs,state);
});

test('KMR-2-097 enters active and can buff again after it is readied',()=>{
 const s=fresh(['KMR-2-097','KMR-2-090','KMR-2-085'],{'KMR-2-085':1},970);
 red(s,0,1);
 const field=take(s,0,'KMR-2-097');
 const ryuki=put(s,0,'KMR-2-090','front',0,true);
 onlyHand(s,0,[field]);
 ready(s);
 let state=click(s,a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy');
 assert.equal(host(state,field.uid)?.ready,true);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===field.uid).length,1);
 state=click(state,a=>a.type==='activate'&&a.uid===field.uid);
 assert.equal(host(state,field.uid)?.ready,false);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(acts(state,a=>a.uid===field.uid).length,0);
 state=click(state,a=>a.mode==='own'&&a.uid===ryuki.uid);
 assert.equal(universalBp(pack,state,host(state,ryuki.uid)),2500);
 host(state,field.uid).ready=true;
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===field.uid).length,1);
 const empty=fresh(['KMR-2-097','KMR-2-085'],{'KMR-2-085':1},971);
 red(empty,0,1);
 const alone=take(empty,0,'KMR-2-097');
 onlyHand(empty,0,[alone]);
 ready(empty);
 state=click(empty,a=>a.type==='play'&&a.uid===alone.uid&&a.line==='energy');
 const generator=state.players[0].energy.find(c=>c&&c.cardId==='KMR-2-085');
 const slot=state.players[0].energy.indexOf(generator);
 state.players[0].energy[slot]=null;
 state.players[0].deck.push(generator);
 assert.equal(acts(state,a=>a.type==='activate'&&a.uid===alone.uid).length,0);
 assertUniversalMatch(packs,state);
});

test('KMR-2-099 replays an on play before one chosen AP, and can bring a mirror rested',()=>{
 const s=fresh(['KMR-2-099','KMR-2-095','KMR-2-090','KMR-2-086','KMR-2-085'],{'KMR-2-085':2,'KMR-2-095':2},990);
 red(s,0,2);
 const event=take(s,0,'KMR-2-099');
 const wing=put(s,0,'KMR-2-095','front',0,true);
 const knight=put(s,0,'KMR-2-086','energy',2,true);
 const mirror=take(s,0,'KMR-2-095');
 s.players[0].outside.push(mirror);
 onlyHand(s,0,[event]);
 ready(s);
 s.players[0].apCards.forEach((c,i)=>{c.ready=i<2;});
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(state.pending?.step,'mode');
 state=click(state,a=>a.key==='replay');
 assert.equal(state.pending?.step,'replay');
 assert.equal(acts(state,a=>a.mode==='skip').length,1);
 state=click(state,a=>a.mode==='own'&&a.uid===wing.uid);
 assert.equal(state.pending?.step,'triggerSafe');
 assert.equal(state.pending.sourceUid,wing.uid);
 state=click(state,a=>a.mode==='skip');
 assert.equal(state.pending?.step,'readyAp');
 assert.equal(acts(state,a=>a.mode==='readyAp').length,2);
 const chosen=acts(state,a=>a.mode==='readyAp')[0];
 state=click(state,a=>a.uid===chosen.uid);
 assert.equal(state.players[0].apCards.filter(c=>c.ready).length,2);
 assert.equal(state.players[0].apCards.find(c=>c.uid===chosen.uid)?.ready,true);

 const deploy=fresh(['KMR-2-099','KMR-2-095','KMR-2-086','KMR-2-085','KMR-2-010'],{'KMR-2-085':2},991);
 red(deploy,0,2);
 put(deploy,0,'KMR-2-086','front',0,true);
 const card=take(deploy,0,'KMR-2-099');
 const outside=take(deploy,0,'KMR-2-095');
 const junk=take(deploy,0,'KMR-2-010');
 deploy.players[0].outside.push(outside);
 onlyHand(deploy,0,[card,junk]);
 ready(deploy);
 state=click(deploy,a=>a.type==='event'&&a.uid===card.uid);
 state=click(state,a=>a.key==='deploy');
 assert.equal(state.pending?.step,'discard');
 state=click(state,a=>a.mode==='discard');
 assert.equal(state.pending?.step,'deployPick');
 state=click(state,a=>a.mode==='deploy'&&a.uid===outside.uid);
 const enter=acts(state,a=>a.mode==='enter'&&a.line==='front')[0];
 assert.equal(enter.ready,false);
 assert.equal(enter.skipOnPlay,false);
 state=click(state,a=>a.uid===outside.uid&&a.line==='front'&&a.slot===enter.slot);
 assert.equal(state.pending?.step,'triggerSafe');
 state=click(state,a=>a.mode==='skip');
 assert.equal(host(state,outside.uid)?.ready,false);
 assertUniversalMatch(packs,state);
});

test('KMR-2-100 gives 2500 and a win draw, and Sniper only to Ryuki',()=>{
 const s=fresh(['KMR-2-100','KMR-2-090','KMR-2-086','KMR-2-010','KMR-2-085','KMR-2-092'],
  {'KMR-2-085':2,'KMR-2-100':2},1000);
 red(s,0,2);
 const event=take(s,0,'KMR-2-100');
 const ryuki=put(s,0,'KMR-2-090','front',0,true);
 const knight=put(s,0,'KMR-2-086','front',1,true);
 const foe=put(s,1,'KMR-2-010','front',0,true);
 onlyHand(s,0,[event]);
 ready(s);
 let state=click(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(state.pending.actions.some(a=>a.mode==='skip'),false);
 state=click(state,a=>a.mode==='own'&&a.uid===knight.uid);
 const boosted=host(state,knight.uid);
 assert.equal(universalBp(pack,state,boosted),4000);
 assert.equal(boosted.kmr2Sniper,undefined);
 assert.equal(boosted.kmr2WinDraw.stamp,boosted.fieldEntryStamp);
 state.players[0].hand.push(take(state,0,'KMR-2-100'));
 ready(state);
 state.phase='main';
 const second=state.players[0].hand.find(c=>c.cardId==='KMR-2-100');
 state=click(state,a=>a.type==='event'&&a.uid===second.uid);
 state=click(state,a=>a.mode==='own'&&a.uid===ryuki.uid);
 const aimed=host(state,ryuki.uid);
 assert.equal(aimed.kmr2Sniper.stamp,aimed.fieldEntryStamp);
 state=reach(state,0,'attack');
 const sniper=host(state,ryuki.uid);
 assert.equal(acts(state,a=>a.type==='attack'&&a.uid===sniper.uid&&a.targetUid===foe.uid).length,1);
 assert.equal(acts(state,a=>a.type==='attack'&&a.uid===knight.uid&&a.targetUid).length,0);
 quietLife(state,1,'KMR-2-092');
 const hand=state.players[0].hand.length;
 state=click(state,a=>a.type==='attack'&&a.uid===ryuki.uid&&a.targetUid===foe.uid);
 if(state.pending?.kind==='block')state=click(state,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(state.players[1].outside.some(c=>c.uid===foe.uid),true);
 assert.equal(state.players[0].hand.length,hand+1);
 assertUniversalMatch(packs,state);
});

test('life triggers of KMR-2-081 through 100 resolve on the revealed card',()=>{
 function hit(seed,attackerId,lifeId){
  const s=fresh([attackerId,lifeId,'KMR-2-092'],{},seed);
  const attacker=put(s,0,attackerId,'front',0,true);
  const card=take(s,1,lifeId);
  s.players[1].deck.push(s.players[1].life[0]);
  s.players[1].life[0]=card;
  ready(s);
  let state=reach(s,0,'attack');
  state=click(state,a=>a.type==='attack'&&a.uid===attacker.uid);
  state=click(state,a=>a.type==='chooseBlock'&&a.uid===null);
  return {state,attacker,card};
 }
 for(const id of ['KMR-2-082','KMR-2-092','KMR-2-093','KMR-2-095','KMR-2-096']){
  const {state,card}=hit(1800+Number(id.slice(-3)),'KMR-2-010',id);
  assert.equal(state.pending,null);
  assert.equal(state.players[1].outside.some(c=>c.uid===card.uid),true);
 }
 for(const id of ['KMR-2-083','KMR-2-086','KMR-2-087']){
  const {state}=hit(2800+Number(id.slice(-3)),'KMR-2-010',id);
  assert.equal(state.pending?.trigger,'draw');
  const hand=state.players[1].hand.length;
  const drawn=click(state,a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.equal(drawn.players[1].hand.length,hand+1);
 }
 for(const id of ['KMR-2-084','KMR-2-090','KMR-2-097']){
  const {state,card}=hit(3800+Number(id.slice(-3)),'KMR-2-010',id);
  assert.equal(state.pending?.trigger,'get');
  const got=click(state,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(got.players[1].hand.some(c=>c.uid===card.uid),true);
 }
 const active=hit(4085,'KMR-2-010','KMR-2-085');
 const rested=put(active.state,1,'KMR-2-092','front',0,false);
 active.state=click(active.state,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 assert.equal(host(active.state,rested.uid,1)?.ready,true);
 assert.equal(universalBp(pack,active.state,host(active.state,rested.uid,1)),5500);
 const early=hit(4081,'KMR-2-010','KMR-2-081');
 assert.equal(acts(early.state,a=>a.mode==='final').length,0);
 const last=fresh(['KMR-2-098','KMR-2-010'],{},4098);
 const batter=put(last,0,'KMR-2-010','front',0,true);
 const lastCard=take(last,1,'KMR-2-098');
 last.players[1].deck.push(...last.players[1].life.splice(0));
 last.players[1].life.push(lastCard);
 const recovered=last.players[1].deck[0];
 ready(last);
 let final=reach(last,0,'attack');
 final=click(final,a=>a.type==='attack'&&a.uid===batter.uid);
 final=click(final,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(final.pending.trigger,'final');
 final=click(final,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(final.players[1].life[0].uid,recovered.uid);
 const color=fresh(['KMR-2-099','KMR-2-083','KMR-2-084','KMR-2-010'],{},4099);
 const hitter=put(color,0,'KMR-2-010','front',0,true);
 const legal=put(color,0,'KMR-2-083','front',1,true);
 const illegal=put(color,0,'KMR-2-084','front',2,true);
 const trigger=take(color,1,'KMR-2-099');
 color.players[1].deck.push(color.players[1].life[0]);
 color.players[1].life[0]=trigger;
 ready(color);
 let colored=reach(color,0,'attack');
 colored=click(colored,a=>a.type==='attack'&&a.uid===hitter.uid);
 colored=click(colored,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(acts(colored,a=>a.mode==='colorRetire'&&a.uid===legal.uid).length,1);
 assert.equal(acts(colored,a=>a.mode==='colorRetire'&&a.uid===illegal.uid).length,0);
 colored=click(colored,a=>a.type==='chooseTrigger'&&a.mode==='colorRetire'&&a.uid===legal.uid);
 assert.equal(colored.players[0].outside.some(c=>c.uid===legal.uid),true);
 const raid=fresh(['KMR-2-089','KMR-2-086','KMR-2-097','KMR-2-085','KMR-2-010'],{'KMR-2-085':2},4089);
 red(raid,1,2);
 const base=put(raid,1,'KMR-2-086','front',0,true);
 top(raid,1,[take(raid,1,'KMR-2-097')]);
 const attacker=put(raid,0,'KMR-2-010','front',0,true);
 const raidCard=take(raid,1,'KMR-2-089');
 raid.players[1].deck.push(raid.players[1].life[0]);
 raid.players[1].life[0]=raidCard;
 ready(raid);
 let raided=reach(raid,0,'attack');
 raided=click(raided,a=>a.type==='attack'&&a.uid===attacker.uid);
 raided=click(raided,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(acts(raided,a=>a.mode==='raid'&&a.baseUid===base.uid).length>0,true);
 raided=click(raided,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid);
 assert.equal(raided.pending?.id,'KMR-2-089');
 assert.equal(raided.pending.step,'lookPick');
 const special=hit(4100,'KMR-2-010','KMR-2-100');
 special.state=click(special.state,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===special.attacker.uid);
 assert.equal(special.state.players[0].outside.some(c=>c.uid===special.attacker.uid),true);
 assertUniversalMatch(packs,special.state);
});
