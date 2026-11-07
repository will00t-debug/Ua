import test from 'node:test';
import assert from 'node:assert/strict';
import {AOT_CARDS} from '../dist/aot-cards.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalAttackDamage, universalBp, universalCardEnergy,
 universalPrivateChoices, zoneRequiredEnergy}
 from '../dist/universal-v2/engine.mjs';

const pack=createAotV2Pack();
const packs=[pack,pack];
const page=id=>'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA23BT%2F'+id;

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...new Set(required)];
 const caps={special:0,color:0,final:0},counts={};
 for(const id of ids){
  const trigger=pack.cards[id].trigger;
  let copies=4;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(2,4-caps[trigger]);
   caps[trigger]+=copies;
   if(copies<=0)throw Error('Trigger cap blocks '+id);
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const add=Math.min(4,50-total);
  counts[id]=add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(ids,seed){
 return newUniversalMatch(packs,{decks:[countsFor(ids),countsFor(ids)],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const c=take(s,p,id);
 c.ready=ready;
 c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;
 return c;
}
function toHand(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function crown(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function setLife(s,p,ids){
 const life=ids.map(id=>take(s,p,id));
 s.players[p].deck.push(...s.players[p].life.splice(0));
 s.players[p].life=life;
 return life;
}
function toPhase(s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>12)throw Error('Did not reach '+phase);
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function pick(s,pred){
 const actions=legalUniversalActions(packs,s);
 const action=actions.find(pred);
 if(!action)throw Error('No legal action in '+s.pending?.kind+'/'+(s.pending?.step||'')+
  ' '+actions.map(a=>a.type+':'+(a.mode||'')+':'+(a.uid||'')).slice(0,8).join(','));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,line='front'){
 return pick(s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid===undefined);
}
function cast(s,uid){return pick(s,a=>a.type==='event'&&a.uid===uid);}
function activate(s,uid){return pick(s,a=>a.type==='activate'&&a.uid===uid);}
function raidOnto(s,uid,baseUid,line='front'){
 return pick(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid&&
  (line==='energy'?a.line==='energy':a.line!=='energy'));
}
function canActivate(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);
}
function ownMainAgain(s){
 const started=s.turn;
 let guard=0;
 while(!(s.phase==='main'&&s.active===0&&s.turn>started)){
  if(s.pending?.kind==='end-hand-limit')s=pick(s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the return');
  else s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>16)throw Error('Did not return to own main');
 }
 return s;
}
function toActiveMain(s,p){
 let guard=0;
 while(!(s.phase==='main'&&s.active===p)){
  if(s.pending?.kind==='end-hand-limit')s=pick(s,a=>a.type==='chooseHandLimit');
  else if(s.pending)throw Error('Pending '+s.pending.kind+' blocked player '+p);
  else s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>16)throw Error('Did not reach player '+p);
 }
 return s;
}
function fuel(s,p,ids){
 ids.forEach((id,slot)=>put(s,p,id,'energy',slot,true));
}
function live(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid);
}
function bp(s,c){return universalBp(packs,s,c);}
function finish(s){assertUniversalMatch(packs,s);return s;}
function printed(id){return AOT_CARDS.find(c=>c.id===id);}
function modes(s,mode){
 return (s.pending?.actions||[]).filter(a=>a.mode===mode);
}
function orderBottom(s){
 const order=[];
 while(s.pending?.kind==='effect-top-order'){
  const next=s.pending.uids.find(uid=>!s.pending.order.includes(uid));
  order.push(next);
  s=pick(s,a=>a.type==='chooseTopOrder'&&a.uid===next);
 }
 return {s,order};
}
function lifeOrder(s){
 let guard=0;
 while(s.pending?.kind==='life-batch-order'){
  s=pick(s,a=>a.type==='chooseLifeOrder');
  if(++guard>6)throw Error('LIFE order did not finish');
 }
 return s;
}

test('026 through 050 each have one UA23BT printing',()=>{
 for(let n=26;n<=50;n++){
  const id='AOT-1-'+String(n).padStart(3,'0');
  const card=printed(id);
  assert.equal(card.printings.length,1,id);
  assert.equal(card.printings[0].number,'UA23BT/'+id);
  assert.equal(page(id).includes(id),true);
 }
 for(const id of ['AOT-1-042','AOT-1-043','AOT-1-045'])assert.equal(printed(id).effectJa,'');
});

test('042, 043 and 045 have no effect and enter rested',()=>{
 let s=toPhase(fresh(['AOT-1-042','AOT-1-043','AOT-1-045'],26042),'main');
 for(const id of ['AOT-1-042','AOT-1-045']){
  readyAp(s,0,1);
  const card=toHand(s,0,id);
  s=play(s,card.uid);
  assert.equal(s.pending,null);
  assert.equal(live(s,0,card.uid).ready,false);
 }
 fuel(s,0,['AOT-1-045']);
 readyAp(s,0,1);
 const beard=toHand(s,0,'AOT-1-043');
 s=play(s,beard.uid);
 assert.equal(s.pending,null);
 assert.equal(live(s,0,beard.uid).ready,false);
 finish(s);
});

test('026 generates one extra blue energy only while active on the energy line',()=>{
 let s=toPhase(fresh(['AOT-1-026'],26026),'main');
 const eren=put(s,0,'AOT-1-026','energy',0,true);
 assert.equal(pack.cards['AOT-1-026'].gen,1);
 assert.equal(pack.cards['AOT-1-026'].activeExtraEnergy,1);
 assert.equal(universalCardEnergy(packs,s,0,eren),2);
 eren.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),1);
 const front=put(s,0,'AOT-1-026','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
 finish(s);
});

test('027 looks at five cards privately, publishes only a taken blue event, then discards',()=>{
 let s=toPhase(fresh(['AOT-1-027','AOT-1-032','AOT-1-001','AOT-1-069','AOT-1-040','AOT-1-029','AOT-1-002','AOT-1-007'],26027),'main');
 fuel(s,0,['AOT-1-002','AOT-1-007']);
 const window=crown(s,0,['AOT-1-032','AOT-1-001','AOT-1-069','AOT-1-040','AOT-1-029']);
 const eren=toHand(s,0,'AOT-1-027');
 readyAp(s,0,1);
 s=play(s,eren.uid);
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,5);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const choices=legalUniversalActions(packs,s).filter(a=>a.uid).map(a=>a.uid);
 assert.deepEqual(choices.sort(),[window[0].uid,window[4].uid].sort());
 s=pick(s,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 const declined=orderBottom(s);
 s=declined.s;
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-5).map(c=>c.uid),declined.order);
 assert.equal(s.players[0].hand.some(c=>window.some(w=>w.uid===c.uid)),false);
 assert.equal(s.publicReveals.some(e=>e.kind==='searched-to-hand'),false);
 finish(s);

 let taken=toPhase(fresh(['AOT-1-027','AOT-1-032','AOT-1-001','AOT-1-069','AOT-1-040','AOT-1-029','AOT-1-002','AOT-1-007'],26028),'main');
 fuel(taken,0,['AOT-1-002','AOT-1-007']);
 const five=crown(taken,0,['AOT-1-032','AOT-1-001','AOT-1-069','AOT-1-040','AOT-1-029']);
 const actor=toHand(taken,0,'AOT-1-027');
 readyAp(taken,0,1);
 const spare=toHand(taken,0,'AOT-1-007');
 taken=play(taken,actor.uid);
 taken=pick(taken,a=>a.type==='chooseTopFiltered'&&a.uid===five[0].uid);
 assert.equal(taken.publicReveals.some(e=>e.kind==='searched-to-hand'&&e.uid===five[0].uid),true);
 assert.equal(taken.publicReveals.some(e=>e.kind==='searched-to-hand'&&e.uid!==five[0].uid),false);
 const arranged=orderBottom(taken);
 taken=arranged.s;
 assert.equal(taken.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,taken).some(a=>a.uid===null),false);
 taken=pick(taken,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
 assert.equal(taken.pending,null);
 assert.equal(taken.players[0].hand.some(c=>c.uid===five[0].uid),true);
 assert.deepEqual(taken.players[0].deck.slice(-4).map(c=>c.uid),arranged.order);
 finish(taken);
});

test('028 rests, reveals the top card, and adds a blue character of energy 3 or less',()=>{
 function board(seed){
  let s=toPhase(fresh(['AOT-1-028','AOT-1-002','AOT-1-007','AOT-1-027','AOT-1-010','AOT-1-040','AOT-1-032'],seed),'main');
  fuel(s,0,['AOT-1-002','AOT-1-007']);
  readyAp(s,0,1);
  const field=toHand(s,0,'AOT-1-028');
  s=play(s,field.uid,'energy');
  assert.equal(live(s,0,field.uid).ready,false);
  assert.equal(canActivate(s,field.uid),false);
  s=ownMainAgain(s);
  assert.equal(live(s,0,field.uid).ready,true);
  return {s,field};
 }
 let hit=board(26029);
 const blue=crown(hit.s,0,['AOT-1-027'])[0];
 hit.s=activate(hit.s,hit.field.uid);
 assert.equal(hit.s.pending,null);
 assert.equal(live(hit.s,0,hit.field.uid).ready,false);
 assert.equal(hit.s.players[0].hand.some(c=>c.uid===blue.uid),true);
 assert.equal(hit.s.publicReveals.some(e=>e.uid===blue.uid),true);
 finish(hit.s);

 let high=board(26030);
 const four=crown(high.s,0,['AOT-1-010'])[0];
 high.s=activate(high.s,high.field.uid);
 assert.equal(high.s.players[0].deck[0].uid,four.uid);
 assert.equal(high.s.publicReveals.some(e=>e.uid===four.uid),true);
 assert.equal(high.s.players[0].hand.some(c=>c.uid===four.uid),false);
 finish(high.s);

 let other=board(26031);
 const green=crown(other.s,0,['AOT-1-040'])[0];
 other.s=activate(other.s,other.field.uid);
 assert.equal(other.s.players[0].deck[0].uid,green.uid);
 const event=crown(other.s,0,['AOT-1-032'])[0];
 other.s.players[0].energy.find(c=>c?.uid===other.field.uid).ready=true;
 other.s=activate(other.s,other.field.uid);
 assert.equal(other.s.players[0].deck[0].uid,event.uid);
 other.s.players[0].removed.push(...other.s.players[0].deck.splice(0));
 other.s.players[0].energy.find(c=>c?.uid===other.field.uid).ready=true;
 assert.equal(canActivate(other.s,other.field.uid),false);
 finish(other.s);
});

test('029 draws, discards one, then readies up to one AP',()=>{
 let s=toPhase(fresh(['AOT-1-029','AOT-1-002','AOT-1-001'],26032),'main');
 fuel(s,0,['AOT-1-002']);
 readyAp(s,0,1);
 const event=toHand(s,0,'AOT-1-029');
 const deck=s.players[0].deck.length,hand=s.players[0].hand.length;
 s=cast(s,event.uid);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseDiscard');
 assert.equal(s.pending.kind,'effect-recover-ap');
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.players[0].apCards[0].ready,false);
 finish(s);

 let ready=toPhase(fresh(['AOT-1-029','AOT-1-002'],26033),'main');
 fuel(ready,0,['AOT-1-002']);
 readyAp(ready,0,1);
 const second=toHand(ready,0,'AOT-1-029');
 ready=cast(ready,second.uid);
 ready=pick(ready,a=>a.type==='chooseDiscard');
 ready=pick(ready,a=>a.type==='chooseApRecovery'&&a.uid===ready.players[0].apCards[0].uid);
 assert.equal(ready.pending,null);
 assert.equal(ready.players[0].apCards[0].ready,true);
 finish(ready);
});

test('030 readies up to two AP, and final returns a card only from the last life',()=>{
 let s=toPhase(fresh(['AOT-1-030','AOT-1-002','AOT-1-006'],26034),'main');
 fuel(s,0,['AOT-1-002','AOT-1-006']);
 readyAp(s,0,3);
 s.players[0].apCards[1].ready=false;
 s.players[0].apCards[2].ready=false;
 const event=toHand(s,0,'AOT-1-030');
 s=cast(s,event.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,0);
 finish(s);

 let one=toPhase(fresh(['AOT-1-030','AOT-1-002','AOT-1-006'],26035),'main');
 fuel(one,0,['AOT-1-002','AOT-1-006']);
 readyAp(one,0,3);
 one.players[0].apCards[1].ready=false;
 one.players[0].apCards[2].ready=false;
 const mid=toHand(one,0,'AOT-1-030');
 one=cast(one,mid.uid);
 one=pick(one,a=>a.type==='chooseApRecovery'&&a.uid===one.players[0].apCards[1].uid);
 assert.equal(one.pending.kind,'effect-recover-ap');
 assert.equal(one.pending.remaining,1);
 one=pick(one,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(one.players[0].apCards[1].ready,true);
 assert.equal(one.players[0].apCards[2].ready,false);
 finish(one);

 let both=toPhase(fresh(['AOT-1-030','AOT-1-002','AOT-1-006'],26036),'main');
 fuel(both,0,['AOT-1-002','AOT-1-006']);
 readyAp(both,0,3);
 both.players[0].apCards[1].ready=false;
 both.players[0].apCards[2].ready=false;
 const all=toHand(both,0,'AOT-1-030');
 both=cast(both,all.uid);
 both=pick(both,a=>a.type==='chooseApRecovery'&&a.uid===both.players[0].apCards[1].uid);
 both=pick(both,a=>a.type==='chooseApRecovery'&&a.uid===both.players[0].apCards[2].uid);
 assert.equal(both.pending,null);
 assert.equal(both.players[0].apCards[1].ready,true);
 assert.equal(both.players[0].apCards[2].ready,true);
 finish(both);

 let last=toPhase(fresh(['AOT-1-030','AOT-1-001','AOT-1-040'],26037),'attack');
 const attacker=put(last,0,'AOT-1-001','front',0,true);
 setLife(last,1,['AOT-1-030']);
 const marker=crown(last,1,['AOT-1-040'])[0];
 last=pick(last,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 last=pick(last,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(last.pending.trigger,'final');
 last=pick(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life.length,1);
 assert.equal(last.players[1].life[0].uid,marker.uid);
 finish(last);

 let early=toPhase(fresh(['AOT-1-030','AOT-1-001','AOT-1-040'],26038),'attack');
 const striker=put(early,0,'AOT-1-001','front',0,true);
 setLife(early,1,['AOT-1-030','AOT-1-040']);
 early=pick(early,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 early=pick(early,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(early.pending,null);
 assert.equal(early.players[1].life.length,1);
 assert.equal(early.players[1].outside.some(c=>c.cardId==='AOT-1-030'),true);
 finish(early);
});

test('031 looks privately, returns any number to the top, puts the rest outside, then draws two',()=>{
 function open(seed){
  let s=toPhase(fresh(['AOT-1-031','AOT-1-002','AOT-1-007','AOT-1-001','AOT-1-040','AOT-1-042','AOT-1-043'],seed),'main');
  fuel(s,0,['AOT-1-002','AOT-1-007']);
  readyAp(s,0,1);
  const window=crown(s,0,['AOT-1-001','AOT-1-040','AOT-1-042','AOT-1-043']);
  const event=toHand(s,0,'AOT-1-031');
  s=cast(s,event.uid);
  assert.equal(s.pending.step,'lookKeep');
  assert.deepEqual(universalPrivateChoices(packs,s,0).inspected.map(c=>c.uid),window.slice(0,2).map(c=>c.uid));
  assert.equal(universalPrivateChoices(packs,s,1),null);
  assert.equal(s.publicReveals.some(e=>window.slice(0,2).some(w=>w.uid===e.uid)),false);
  return {s,window};
 }
 let none=open(26039);
 const before=none.s.players[0].deck.length;
 none.s=pick(none.s,a=>a.mode==='done');
 assert.equal(none.s.pending,null);
 assert.equal(none.s.players[0].outside.filter(c=>none.window.slice(0,2).some(w=>w.uid===c.uid)).length,2);
 assert.equal(none.s.players[0].hand.some(c=>c.uid===none.window[2].uid),true);
 assert.equal(none.s.players[0].hand.some(c=>c.uid===none.window[3].uid),true);
 assert.equal(none.s.players[0].deck.length,before-4);
 finish(none.s);

 let some=open(26040);
 some.s=pick(some.s,a=>a.mode==='keep'&&a.uid===some.window[1].uid);
 assert.equal(universalPrivateChoices(packs,some.s,0).inspected.length,2);
 assert.equal(universalPrivateChoices(packs,some.s,1),null);
 some.s=pick(some.s,a=>a.mode==='done');
 assert.equal(some.s.players[0].hand.some(c=>c.uid===some.window[1].uid),true);
 assert.equal(some.s.players[0].hand.some(c=>c.uid===some.window[2].uid),true);
 assert.equal(some.s.players[0].outside.some(c=>c.uid===some.window[0].uid),true);
 assert.equal(some.s.players[0].deck[0].uid,some.window[3].uid);
 assert.equal(some.s.publicReveals.some(e=>e.kind==='revealed-window'&&e.uid===some.window[1].uid),false);
 finish(some.s);

 let all=open(26041);
 all.s=pick(all.s,a=>a.mode==='keep'&&a.uid===all.window[1].uid);
 all.s=pick(all.s,a=>a.mode==='keep'&&a.uid===all.window[0].uid);
 assert.equal(all.s.players[0].hand.some(c=>c.uid===all.window[0].uid),true);
 assert.equal(all.s.players[0].hand.some(c=>c.uid===all.window[1].uid),true);
 assert.equal(all.s.players[0].outside.some(c=>all.window.slice(0,2).some(w=>w.uid===c.uid)),false);
 assert.equal(all.s.players[0].deck[0].uid,all.window[2].uid);
 finish(all.s);
});

test('032 bounces up to one opposing front character of BP 3500 or less',()=>{
 let s=toPhase(fresh(['AOT-1-032','AOT-1-002','AOT-1-018','AOT-1-010','AOT-1-007'],26043),'main');
 fuel(s,0,['AOT-1-002']);
 readyAp(s,0,1);
 const small=put(s,1,'AOT-1-018','front',0,true);
 const huge=put(s,1,'AOT-1-010','front',1,true);
 const energy=put(s,1,'AOT-1-007','energy',0,true);
 const event=toHand(s,0,'AOT-1-032');
 s=cast(s,event.uid);
 assert.equal(s.pending.kind,'effect-bounce-bp');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(choices.includes(small.uid),true);
 assert.equal(choices.includes(huge.uid),false);
 assert.equal(choices.includes(energy.uid),false);
 assert.equal(choices.includes(null),true);
 s=pick(s,a=>a.type==='chooseBounceBp'&&a.uid===null);
 assert.equal(s.players[1].front.some(c=>c?.uid===small.uid),true);
 finish(s);

 let bounced=toPhase(fresh(['AOT-1-032','AOT-1-002','AOT-1-018'],26044),'main');
 fuel(bounced,0,['AOT-1-002']);
 readyAp(bounced,0,1);
 const target=put(bounced,1,'AOT-1-018','front',0,true);
 const bomb=toHand(bounced,0,'AOT-1-032');
 bounced=cast(bounced,bomb.uid);
 bounced=pick(bounced,a=>a.type==='chooseBounceBp'&&a.uid===target.uid);
 assert.equal(bounced.players[1].hand.some(c=>c.uid===target.uid),true);
 assert.equal(bounced.pending,null);
 finish(bounced);
});

test('033 retires one front character, and Historia raises the cap by 1000 per outside event',()=>{
 let s=toPhase(fresh(['AOT-1-033','AOT-1-002','AOT-1-007','AOT-1-001','AOT-1-002'],26045),'main');
 fuel(s,0,['AOT-1-002','AOT-1-007']);
 readyAp(s,0,1);
 const legal=put(s,1,'AOT-1-001','front',0,true);
 const over=put(s,1,'AOT-1-002','front',1,true);
 const event=toHand(s,0,'AOT-1-033');
 s=cast(s,event.uid);
 assert.equal(s.pending.step,'retire');
 assert.equal(modes(s,'skip').length,0);
 const choices=modes(s,'retire').map(a=>a.uid);
 assert.equal(choices.includes(legal.uid),true);
 assert.equal(choices.includes(over.uid),false);
 s=pick(s,a=>a.mode==='retire'&&a.uid===legal.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===legal.uid),true);
 finish(s);

 let raised=toPhase(fresh(['AOT-1-033','AOT-1-019','AOT-1-029','AOT-1-002','AOT-1-006','AOT-1-013','AOT-1-018','AOT-1-061'],26046),'main');
 fuel(raised,0,['AOT-1-002','AOT-1-006']);
 readyAp(raised,0,1);
 put(raised,0,'AOT-1-019','front',0,true);
 raised.players[0].outside.push(take(raised,0,'AOT-1-029'));
 const at3000=put(raised,1,'AOT-1-013','front',0,true);
 const at3500=put(raised,1,'AOT-1-018','front',1,true);
 const at5000=put(raised,1,'AOT-1-061','front',2,true);
 const historia=toHand(raised,0,'AOT-1-033');
 raised=cast(raised,historia.uid);
 const raisedChoices=modes(raised,'retire').map(a=>a.uid);
 assert.equal(raisedChoices.includes(at3000.uid),true);
 assert.equal(raisedChoices.includes(at3500.uid),true);
 assert.equal(raisedChoices.includes(at5000.uid),false);
 raised=pick(raised,a=>a.mode==='retire'&&a.uid===at3500.uid);
 assert.equal(raised.players[1].outside.some(c=>c.uid===at3500.uid),true);
 finish(raised);

 let foe=toPhase(fresh(['AOT-1-033','AOT-1-019','AOT-1-002','AOT-1-007','AOT-1-002'],26047),'main');
 fuel(foe,0,['AOT-1-002','AOT-1-007']);
 readyAp(foe,0,1);
 put(foe,1,'AOT-1-019','front',0,true);
 const still=put(foe,1,'AOT-1-002','front',1,true);
 const plain=toHand(foe,0,'AOT-1-033');
 foe=cast(foe,plain.uid);
 assert.equal(modes(foe,'retire').some(a=>a.uid===still.uid),false);
 foe=pick(foe,a=>a.mode==='retire');
 finish(foe);
});

test('034 retires BP 3000, or BP 5000 while an exact Levi is on the field',()=>{
 let s=toPhase(fresh(['AOT-1-034','AOT-1-002','AOT-1-006','AOT-1-013','AOT-1-018'],26048),'main');
 fuel(s,0,['AOT-1-002','AOT-1-006']);
 readyAp(s,0,1);
 const at3000=put(s,1,'AOT-1-013','front',0,true);
 const at3500=put(s,1,'AOT-1-018','front',1,true);
 const event=toHand(s,0,'AOT-1-034');
 s=cast(s,event.uid);
 assert.equal(modes(s,'skip').length,0);
 const choices=modes(s,'retire').map(a=>a.uid);
 assert.equal(choices.includes(at3000.uid),true);
 assert.equal(choices.includes(at3500.uid),false);
 s=pick(s,a=>a.mode==='retire'&&a.uid===at3000.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===at3000.uid),true);
 finish(s);

 let named=toPhase(fresh(['AOT-1-034','AOT-1-007','AOT-1-002','AOT-1-006','AOT-1-010','AOT-1-061','AOT-1-057','AOT-1-013'],26049),'main');
 fuel(named,0,['AOT-1-002','AOT-1-006']);
 readyAp(named,0,1);
 put(named,0,'AOT-1-007','front',0,true);
 const at4000=put(named,1,'AOT-1-010','front',0,true);
 const at5000=put(named,1,'AOT-1-061','front',1,true);
 const at6000=put(named,1,'AOT-1-057','front',2,true);
 const squad=put(named,0,'AOT-1-013','front',1,true);
 const blow=toHand(named,0,'AOT-1-034');
 named=cast(named,blow.uid);
 const namedChoices=modes(named,'retire').map(a=>a.uid);
 assert.equal(namedChoices.includes(at4000.uid),true);
 assert.equal(namedChoices.includes(at5000.uid),true);
 assert.equal(namedChoices.includes(at6000.uid),false);
 assert.equal(namedChoices.includes(squad.uid),false);
 named=pick(named,a=>a.mode==='retire'&&a.uid===at5000.uid);
 assert.equal(named.players[1].outside.some(c=>c.uid===at5000.uid),true);
 finish(named);
});

test('035 reduces its hand energy by one green when the opponent has blue or red',()=>{
 const kenny=pack.cards['AOT-1-035'];
 let s=toPhase(fresh(['AOT-1-035','AOT-1-001','AOT-1-040','AOT-1-069','AOT-1-026','AOT-1-043','AOT-1-045'],26050),'main');
 assert.equal(zoneRequiredEnergy(packs,s,0,kenny,'hand'),3);
 put(s,1,'AOT-1-040','front',0,true);
 put(s,0,'AOT-1-026','front',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,kenny,'hand'),3);
 put(s,1,'AOT-1-001','energy',0,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,kenny,'hand'),2);
 fuel(s,0,['AOT-1-043','AOT-1-045']);
 readyAp(s,0,1);
 const card=toHand(s,0,'AOT-1-035');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===card.uid),true);
 const blue=s.players[1].energy[0];
 s.players[1].energy[0]=null;
 s.players[1].deck.push(blue);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===card.uid),false);
 put(s,1,'AOT-1-069','front',1,true);
 assert.equal(zoneRequiredEnergy(packs,s,0,kenny,'hand'),2);
 s=play(s,card.uid);
 assert.equal(live(s,0,card.uid).ready,false);
 finish(s);
});

test('036 retires once on the turn it entered, and the hand payment can be repeated',()=>{
 let s=toPhase(fresh(['AOT-1-036','AOT-1-035','AOT-1-039','AOT-1-041','AOT-1-018','AOT-1-042'],26051),'main');
 fuel(s,0,['AOT-1-035','AOT-1-039']);
 readyAp(s,0,2);
 const low=put(s,1,'AOT-1-041','front',0,true);
 const mid=put(s,1,'AOT-1-018','front',1,true);
 const kenny=toHand(s,0,'AOT-1-036');
 const payment=toHand(s,0,'AOT-1-042');
 s=play(s,kenny.uid);
 assert.equal(live(s,0,kenny.uid).ready,false);
 s=activate(s,kenny.uid);
 let retire=modes(s,'retire').map(a=>a.uid);
 assert.equal(retire.includes(low.uid),true);
 assert.equal(retire.includes(mid.uid),false);
 s=pick(s,a=>a.mode==='discardBuff');
 s=pick(s,a=>a.mode==='discard'&&a.uid===payment.uid);
 assert.equal(bp(s,live(s,0,kenny.uid)),4000);
 s=activate(s,kenny.uid);
 retire=modes(s,'retire').map(a=>a.uid);
 assert.equal(retire.includes(mid.uid),true);
 s=pick(s,a=>a.mode==='retire'&&a.uid===mid.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===mid.uid),true);
 s=activate(s,kenny.uid);
 assert.equal(modes(s,'retire').length,0);
 assert.equal(modes(s,'discardBuff').length,1);
 const second=s.players[0].hand[0];
 s=pick(s,a=>a.mode==='discardBuff');
 s=pick(s,a=>a.mode==='discard'&&a.uid===second.uid);
 assert.equal(bp(s,live(s,0,kenny.uid)),5000);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 assert.equal(canActivate(s,kenny.uid),false);
 finish(s);

 let later=toPhase(fresh(['AOT-1-036','AOT-1-035','AOT-1-039','AOT-1-041','AOT-1-042'],26052),'main');
 fuel(later,0,['AOT-1-035','AOT-1-039']);
 readyAp(later,0,2);
 put(later,1,'AOT-1-041','front',0,true);
 const stayed=toHand(later,0,'AOT-1-036');
 later=play(later,stayed.uid);
 later=ownMainAgain(later);
 assert.equal(live(later,0,stayed.uid).ready,true);
 later=activate(later,stayed.uid);
 assert.equal(modes(later,'retire').length,0);
 assert.equal(modes(later,'discardBuff').length,1);
 later=pick(later,a=>a.mode==='skip'||a.mode==='discardBuff');
 if(later.pending)later=pick(later,a=>a.mode==='discard');
 finish(later);

 let old=toPhase(fresh(['AOT-1-036','AOT-1-041','AOT-1-042'],26053),'main');
 const placed=put(old,0,'AOT-1-036','front',0,true);
 put(old,1,'AOT-1-041','front',0,true);
 toHand(old,0,'AOT-1-042');
 old=activate(old,placed.uid);
 assert.equal(modes(old,'retire').length,0);
 old=pick(old,a=>a.mode==='discardBuff');
 old=pick(old,a=>a.mode==='discard');
 assert.equal(bp(old,live(old,0,placed.uid)),4000);
 finish(old);
});

test('037 gives one other character BP+1000, including zero',()=>{
 let s=toPhase(fresh(['AOT-1-037','AOT-1-045','AOT-1-043'],26054),'main');
 const other=put(s,0,'AOT-1-045','front',0,true);
 const line=put(s,0,'AOT-1-043','energy',0,true);
 readyAp(s,0,1);
 const rod=toHand(s,0,'AOT-1-037');
 s=play(s,rod.uid);
 assert.equal(s.pending.kind,'effect-buff-own');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(choices.includes(null),true);
 assert.equal(choices.includes(other.uid),true);
 assert.equal(choices.includes(line.uid),true);
 assert.equal(choices.includes(rod.uid),false);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(bp(s,live(s,0,other.uid)),1500);
 finish(s);

 let paid=toPhase(fresh(['AOT-1-037','AOT-1-045'],26055),'main');
 const historia=put(paid,0,'AOT-1-045','energy',0,true);
 readyAp(paid,0,1);
 const actor=toHand(paid,0,'AOT-1-037');
 paid=play(paid,actor.uid);
 paid=pick(paid,a=>a.type==='chooseOwnBuff'&&a.uid===historia.uid);
 assert.equal(bp(paid,live(paid,0,historia.uid)),2500);
 paid=ownMainAgain(paid);
 assert.equal(bp(paid,live(paid,0,historia.uid)),1500);
 finish(paid);
});

test('038 is ordinary without the raid text, and raided text is own-turn BP, damage, and retirement draw',()=>{
 let ordinary=toPhase(fresh(['AOT-1-038','AOT-1-035','AOT-1-039','AOT-1-001','AOT-1-040'],26056),'main');
 fuel(ordinary,0,['AOT-1-035','AOT-1-039']);
 readyAp(ordinary,0,1);
 const plain=toHand(ordinary,0,'AOT-1-038');
 ordinary=play(ordinary,plain.uid);
 assert.equal(bp(ordinary,live(ordinary,0,plain.uid)),4000);
 assert.equal(canActivate(ordinary,plain.uid),false);
 ordinary=ownMainAgain(ordinary);
 ordinary=toPhase(ordinary,'attack');
 const enemy=put(ordinary,1,'AOT-1-001','front',0,true);
 assert.equal(universalAttackDamage(packs,ordinary,live(ordinary,0,plain.uid)),1);
 setLife(ordinary,1,['AOT-1-040','AOT-1-040','AOT-1-040']);
 const life=ordinary.players[1].life.length;
 ordinary=pick(ordinary,a=>a.type==='attack'&&a.uid===plain.uid&&!a.targetUid);
 ordinary=pick(ordinary,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(ordinary.players[1].life.length,life-1);
 assert.equal(ordinary.players[1].front.some(c=>c?.uid===enemy.uid),true);
 finish(ordinary);

 let raided=toPhase(fresh(['AOT-1-038','AOT-1-037','AOT-1-035','AOT-1-039','AOT-1-001','AOT-1-040'],26057),'main');
 fuel(raided,0,['AOT-1-035','AOT-1-039']);
 readyAp(raided,0,1);
 const base=put(raided,0,'AOT-1-037','front',0,true);
 const rod=toHand(raided,0,'AOT-1-038');
 raided=raidOnto(raided,rod.uid,base.uid);
 const giant=live(raided,0,rod.uid);
 assert.equal(giant.ready,true);
 assert.equal(bp(raided,giant),6000);
 put(raided,1,'AOT-1-001','front',0,true);
 raided=toPhase(raided,'attack');
 assert.equal(universalAttackDamage(packs,raided,live(raided,0,rod.uid)),2);
 raided.players[1].front[0].ready=false;
 assert.equal(universalAttackDamage(packs,raided,live(raided,0,rod.uid)),1);
 setLife(raided,1,['AOT-1-040','AOT-1-040']);
 raided=pick(raided,a=>a.type==='attack'&&a.uid===rod.uid&&!a.targetUid);
 raided=pick(raided,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(raided.players[1].life.length,1);
 assert.equal(raided.pending,null);
 finish(raided);

 let damage=toPhase(fresh(['AOT-1-038','AOT-1-037','AOT-1-035','AOT-1-039','AOT-1-001','AOT-1-040'],26058),'main');
 fuel(damage,0,['AOT-1-035','AOT-1-039']);
 readyAp(damage,0,1);
 const host=put(damage,0,'AOT-1-037','front',0,true);
 const copy=toHand(damage,0,'AOT-1-038');
 damage=raidOnto(damage,copy.uid,host.uid);
 put(damage,1,'AOT-1-001','front',0,true);
 damage=toPhase(damage,'attack');
 setLife(damage,1,['AOT-1-040','AOT-1-040','AOT-1-040']);
 damage=pick(damage,a=>a.type==='attack'&&a.uid===copy.uid&&!a.targetUid);
 damage=pick(damage,a=>a.type==='chooseBlock'&&a.uid===null);
 damage=lifeOrder(damage);
 assert.equal(damage.players[1].life.length,1);
 assert.equal(damage.pending,null);
 finish(damage);

 let passed=toPhase(fresh(['AOT-1-038','AOT-1-037','AOT-1-035','AOT-1-039'],26059),'main');
 fuel(passed,0,['AOT-1-035','AOT-1-039']);
 readyAp(passed,0,1);
 const seat=put(passed,0,'AOT-1-037','front',0,true);
 const waiting=toHand(passed,0,'AOT-1-038');
 passed=raidOnto(passed,waiting.uid,seat.uid);
 passed=toActiveMain(passed,1);
 assert.equal(bp(passed,live(passed,0,waiting.uid)),4000);
 finish(passed);

 let retired=toPhase(fresh(['AOT-1-038','AOT-1-037','AOT-1-035','AOT-1-039','AOT-1-034','AOT-1-007','AOT-1-002','AOT-1-006','AOT-1-040'],26060),'main');
 fuel(retired,1,['AOT-1-035','AOT-1-039']);
 readyAp(retired,1,1);
 const nest=put(retired,1,'AOT-1-037','front',0,true);
 const beast=toHand(retired,1,'AOT-1-038');
 retired=toActiveMain(retired,1);
 retired=raidOnto(retired,beast.uid,nest.uid);
 retired=toActiveMain(retired,0);
 fuel(retired,0,['AOT-1-002','AOT-1-006']);
 readyAp(retired,0,1);
 put(retired,0,'AOT-1-007','front',0,true);
 const deck=retired.players[1].deck.length;
 const hand=retired.players[1].hand.length;
 const blow=toHand(retired,0,'AOT-1-034');
 retired=cast(retired,blow.uid);
 assert.equal(modes(retired,'retire').some(a=>a.uid===beast.uid),true);
 retired=pick(retired,a=>a.mode==='retire'&&a.uid===beast.uid);
 assert.equal(retired.players[1].hand.length,hand+1);
 assert.equal(retired.players[1].deck.length,deck-1);
 finish(retired);

 let quiet=toPhase(fresh(['AOT-1-038','AOT-1-034','AOT-1-007','AOT-1-002','AOT-1-006'],26061),'main');
 fuel(quiet,0,['AOT-1-002','AOT-1-006']);
 readyAp(quiet,0,1);
 put(quiet,0,'AOT-1-007','front',0,true);
 const normal=put(quiet,1,'AOT-1-038','front',0,true);
 const before=quiet.players[1].deck.length;
 const event=toHand(quiet,0,'AOT-1-034');
 quiet=cast(quiet,event.uid);
 quiet=pick(quiet,a=>a.mode==='retire'&&a.uid===normal.uid);
 assert.equal(quiet.players[1].deck.length,before);
 assert.equal(quiet.players[1].outside.some(c=>c.uid===normal.uid),true);
 finish(quiet);

 let bounced=toPhase(fresh(['AOT-1-038','AOT-1-025','AOT-1-002','AOT-1-006'],26090),'main');
 fuel(bounced,0,['AOT-1-002','AOT-1-006']);
 readyAp(bounced,0,2);
 const returned=put(bounced,1,'AOT-1-038','front',0,true);
 const deckBefore=bounced.players[1].deck.length;
 const mikasa=toHand(bounced,0,'AOT-1-025');
 bounced=play(bounced,mikasa.uid);
 bounced=pick(bounced,a=>a.type==='chooseBounceBp'&&a.uid===returned.uid);
 assert.equal(bounced.pending,null);
 assert.equal(bounced.players[1].hand.some(c=>c.uid===returned.uid),true);
 assert.equal(bounced.players[1].deck.length,deckBefore);
 finish(bounced);
});

test('039 bounces another character of energy 1 or less, or itself when none exists',()=>{
 let s=toPhase(fresh(['AOT-1-039','AOT-1-045','AOT-1-040','AOT-1-043'],26062),'main');
 const low=put(s,0,'AOT-1-045','energy',0,true);
 const high=put(s,0,'AOT-1-040','front',0,true);
 const also=put(s,0,'AOT-1-043','front',1,true);
 readyAp(s,0,1);
 const cart=toHand(s,0,'AOT-1-039');
 s=play(s,cart.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 const choices=legalUniversalActions(packs,s).map(a=>a.uid);
 assert.equal(choices.includes(null),false);
 assert.equal(choices.includes(low.uid),true);
 assert.equal(choices.includes(also.uid),true);
 assert.equal(choices.includes(high.uid),false);
 assert.equal(choices.includes(cart.uid),false);
 s=pick(s,a=>a.type==='chooseOwnBounce'&&a.uid===low.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(live(s,0,cart.uid).ready,false);
 finish(s);

 let self=toPhase(fresh(['AOT-1-039','AOT-1-040'],26063),'main');
 put(self,0,'AOT-1-040','energy',0,true);
 readyAp(self,0,1);
 const alone=toHand(self,0,'AOT-1-039');
 self=play(self,alone.uid);
 assert.equal(self.pending,null);
 assert.equal(self.players[0].hand.some(c=>c.uid===alone.uid),true);
 assert.equal(self.players[0].energy.some(c=>c?.cardId==='AOT-1-040'),true);
 finish(self);
});

test('040 draws one, and 041 and 050 draw one then discard one',()=>{
 let s=toPhase(fresh(['AOT-1-040','AOT-1-035'],26064),'main');
 fuel(s,0,['AOT-1-035']);
 readyAp(s,0,1);
 const small=toHand(s,0,'AOT-1-040');
 const deck=s.players[0].deck.length;
 s=play(s,small.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 finish(s);

 for(const [id,seed,energy] of [['AOT-1-041',26065,['AOT-1-035']],['AOT-1-050',26066,[]]]){
  let next=toPhase(fresh([id,'AOT-1-035','AOT-1-042'],seed),'main');
  if(energy.length)fuel(next,0,energy);
  readyAp(next,0,1);
  const card=toHand(next,0,id);
  const spare=toHand(next,0,'AOT-1-042');
  const before=next.players[0].deck.length;
  next=play(next,card.uid);
  assert.equal(next.players[0].deck.length,before-1);
  assert.equal(next.pending.kind,'effect-discard');
  assert.equal(legalUniversalActions(packs,next).some(a=>a.uid===null),false);
  next=pick(next,a=>a.type==='chooseDiscard'&&a.uid===spare.uid);
  assert.equal(next.pending,null);
  finish(next);
 }
});

test('044 and 027 stop Impact from a won battle, and a character without it does not',()=>{
 function raid(seed,blockerId){
  let s=toPhase(fresh(['AOT-1-048','AOT-1-049','AOT-1-040','AOT-1-043','AOT-1-045','AOT-1-041',blockerId,'AOT-1-040'],seed),'main');
  fuel(s,0,['AOT-1-049','AOT-1-040','AOT-1-043','AOT-1-045']);
  const titan=put(s,0,'AOT-1-041','front',0,true);
  readyAp(s,0,1);
  const zeke=toHand(s,0,'AOT-1-048');
  s=raidOnto(s,zeke.uid,s.players[0].energy[3].uid,'energy');
  assert.equal(bp(s,live(s,0,titan.uid)),4000);
  s=activate(s,zeke.uid);
  s=pick(s,a=>a.mode==='buff'&&a.uid===titan.uid);
  assert.equal(live(s,0,titan.uid).impactGranted.amount,1);
  assert.equal(bp(s,live(s,0,titan.uid)),4000);
  const blocker=put(s,1,blockerId,'front',0,true);
  setLife(s,1,['AOT-1-040','AOT-1-040']);
  const life=s.players[1].life.length;
  s=toPhase(s,'attack');
  s=pick(s,a=>a.type==='attack'&&a.uid===titan.uid&&!a.targetUid);
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===blocker.uid);
  return {s,life,blocker};
 }
 const stopped=raid(26067,'AOT-1-044');
 assert.equal(stopped.s.players[1].life.length,stopped.life);
 assert.equal(stopped.s.players[1].outside.some(c=>c.uid===stopped.blocker.uid),true);
 finish(stopped.s);
 const eren=raid(26068,'AOT-1-027');
 assert.equal(eren.s.players[1].life.length,eren.life);
 finish(eren.s);
 const hit=raid(26069,'AOT-1-001');
 assert.equal(hit.s.players[1].life.length,hit.life-1);
 finish(hit.s);
});

test('046 rests and must choose one pure titan',()=>{
 let s=toPhase(fresh(['AOT-1-046','AOT-1-035','AOT-1-040'],26070),'main');
 fuel(s,0,['AOT-1-035']);
 readyAp(s,0,1);
 const titan=put(s,0,'AOT-1-040','energy',1,true);
 const zeke=toHand(s,0,'AOT-1-046');
 s=play(s,zeke.uid);
 assert.equal(canActivate(s,zeke.uid),false);
 s=ownMainAgain(s);
 assert.equal(live(s,0,zeke.uid).ready,true);
 s=activate(s,zeke.uid);
 assert.equal(live(s,0,zeke.uid).ready,false);
 assert.equal(s.pending.step,'buffOne');
 assert.equal(modes(s,'skip').length,0);
 assert.equal(modes(s,'buff').some(a=>a.uid===zeke.uid),false);
 assert.equal(modes(s,'buff').some(a=>a.uid===titan.uid),true);
 s=pick(s,a=>a.mode==='buff'&&a.uid===titan.uid);
 assert.equal(bp(s,live(s,0,titan.uid)),3000);
 finish(s);

 let none=toPhase(fresh(['AOT-1-046'],26071),'main');
 const alone=put(none,0,'AOT-1-046','front',0,true);
 assert.equal(canActivate(none,alone.uid),false);
 finish(none);
});

test('047 gains BP on its own turn with three pure titans and may play one rested',()=>{
 let s=toPhase(fresh(['AOT-1-047','AOT-1-040','AOT-1-041','AOT-1-042'],26072),'main');
 const a=put(s,0,'AOT-1-040','front',0,true);
 const b=put(s,0,'AOT-1-041','front',1,true);
 put(s,0,'AOT-1-047','front',2,true);
 assert.equal(bp(s,s.players[0].front[2]),2500);
 const c=put(s,0,'AOT-1-042','energy',0,true);
 assert.equal(bp(s,s.players[0].front[2]),4000);
 s=toActiveMain(s,1);
 assert.equal(bp(s,s.players[0].front[2]),2500);
 assert.equal(bp(s,live(s,0,a.uid)),2000);
 assert.equal(bp(s,live(s,0,b.uid)),3000);
 assert.equal(bp(s,live(s,0,c.uid)),2000);
 finish(s);

 let paid=toPhase(fresh(['AOT-1-047','AOT-1-035','AOT-1-039','AOT-1-045','AOT-1-040','AOT-1-049'],26073),'main');
 fuel(paid,0,['AOT-1-035','AOT-1-039','AOT-1-045']);
 readyAp(paid,0,1);
 const titan=toHand(paid,0,'AOT-1-040');
 const heavy=toHand(paid,0,'AOT-1-049');
 const zeke=toHand(paid,0,'AOT-1-047');
 const deck=paid.players[0].deck.length;
 paid=play(paid,zeke.uid);
 assert.equal(paid.pending.step,'deploy');
 const offers=paid.pending.actions.filter(a=>a.uid);
 assert.equal(offers.some(a=>a.uid===titan.uid),true);
 assert.equal(offers.some(a=>a.uid===heavy.uid),false);
 assert.equal(offers.some(a=>a.uid===zeke.uid),false);
 assert.equal(paid.pending.actions.some(a=>a.mode==='skip'),true);
 paid=pick(paid,a=>a.mode==='skip');
 assert.equal(paid.players[0].hand.some(c=>c.uid===titan.uid),true);
 assert.equal(paid.players[0].deck.length,deck);
 finish(paid);

 let entered=toPhase(fresh(['AOT-1-047','AOT-1-035','AOT-1-039','AOT-1-045','AOT-1-040'],26074),'main');
 fuel(entered,0,['AOT-1-035','AOT-1-039','AOT-1-045']);
 readyAp(entered,0,1);
 const body=toHand(entered,0,'AOT-1-040');
 const actor=toHand(entered,0,'AOT-1-047');
 const before=entered.players[0].deck.length;
 entered=play(entered,actor.uid);
 entered=pick(entered,a=>a.mode==='dest'&&a.uid===body.uid&&a.line==='front'&&a.replaceUid===undefined);
 assert.equal(live(entered,0,body.uid).ready,false);
 assert.equal(entered.players[0].deck.length,before-1);
 assert.equal(entered.pending,null);
 finish(entered);
});

test('048 discounts off the field, buffs on a raid play this turn, and grants Impact once',()=>{
 const zeke=pack.cards['AOT-1-048'];
 let cost=toPhase(fresh(['AOT-1-048','AOT-1-040','AOT-1-045'],26075),'main');
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'hand'),7);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'life'),7);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'deck'),7);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'outside'),7);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'field'),7);
 put(cost,0,'AOT-1-040','energy',0,true);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'hand'),6);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'life'),6);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'outside'),6);
 assert.equal(zoneRequiredEnergy(packs,cost,0,zeke,'field'),7);
 finish(cost);

 let raid=toPhase(fresh(['AOT-1-048','AOT-1-049','AOT-1-040','AOT-1-043','AOT-1-045','AOT-1-041'],26076),'main');
 fuel(raid,0,['AOT-1-049','AOT-1-040','AOT-1-043','AOT-1-045']);
 const titan=put(raid,0,'AOT-1-041','front',0,true);
 readyAp(raid,0,1);
 const card=toHand(raid,0,'AOT-1-048');
 raid=raidOnto(raid,card.uid,raid.players[0].energy[3].uid,'energy');
 assert.equal(bp(raid,live(raid,0,titan.uid)),4000);
 assert.equal(live(raid,0,card.uid).ready,true);
 raid=activate(raid,card.uid);
 assert.equal(raid.pending.step,'impact48');
 assert.equal(raid.pending.actions.some(a=>a.mode==='skip'),true);
 raid=pick(raid,a=>a.mode==='skip');
 assert.equal(live(raid,0,titan.uid).impactGranted,undefined);
 assert.equal(canActivate(raid,card.uid),false);
 raid=ownMainAgain(raid);
 assert.equal(bp(raid,live(raid,0,titan.uid)),3000);
 finish(raid);

 let plain=toPhase(fresh(['AOT-1-048','AOT-1-035','AOT-1-039','AOT-1-046','AOT-1-045','AOT-1-043'],26077),'main');
 fuel(plain,0,['AOT-1-035','AOT-1-039','AOT-1-046','AOT-1-045']);
 const watcher=put(plain,0,'AOT-1-043','front',0,true);
 readyAp(plain,0,1);
 const body=toHand(plain,0,'AOT-1-048');
 plain=play(plain,body.uid);
 assert.equal(bp(plain,live(plain,0,watcher.uid)),2500);
 assert.equal(canActivate(plain,body.uid),false);
 finish(plain);
});

test('049 plays a pure titan when it leaves, not when it returns to hand',()=>{
 let s=toPhase(fresh(['AOT-1-049','AOT-1-044','AOT-1-040','AOT-1-001'],26079),'attack');
 const attacker=put(s,0,'AOT-1-044','front',0,true);
 const body=put(s,1,'AOT-1-049','front',0,true);
 const titan=toHand(s,1,'AOT-1-040');
 const deck=s.players[1].deck.length;
 s=pick(s,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===body.uid);
 assert.equal(s.pending.player,1);
 assert.equal(s.pending.step,'deploy');
 assert.equal(s.pending.actions.some(a=>a.uid===titan.uid),true);
 s=pick(s,a=>a.mode==='skip');
 assert.equal(s.players[1].hand.some(c=>c.uid===titan.uid),true);
 assert.equal(s.players[1].deck.length,deck);
 assert.equal(s.players[1].outside.some(c=>c.uid===body.uid),true);
 finish(s);

 let entered=toPhase(fresh(['AOT-1-049','AOT-1-044','AOT-1-040'],26080),'attack');
 const striker=put(entered,0,'AOT-1-044','front',0,true);
 const lost=put(entered,1,'AOT-1-049','front',0,true);
 const pure=toHand(entered,1,'AOT-1-040');
 const before=entered.players[1].deck.length;
 entered=pick(entered,a=>a.type==='attack'&&a.uid===striker.uid&&!a.targetUid);
 entered=pick(entered,a=>a.type==='chooseBlock'&&a.uid===lost.uid);
 entered=pick(entered,a=>a.mode==='dest'&&a.uid===pure.uid&&a.line==='energy'&&a.replaceUid===undefined);
 assert.equal(live(entered,1,pure.uid).ready,false);
 assert.equal(entered.players[1].deck.length,before-1);
 finish(entered);

 let bounced=toPhase(fresh(['AOT-1-049','AOT-1-032','AOT-1-002','AOT-1-040'],26081),'main');
 fuel(bounced,0,['AOT-1-002']);
 readyAp(bounced,0,1);
 const target=put(bounced,1,'AOT-1-049','front',0,true);
 toHand(bounced,1,'AOT-1-040');
 const event=toHand(bounced,0,'AOT-1-032');
 bounced=cast(bounced,event.uid);
 bounced=pick(bounced,a=>a.type==='chooseBounceBp'&&a.uid===target.uid);
 assert.equal(bounced.pending,null);
 assert.equal(bounced.players[1].hand.some(c=>c.uid===target.uid),true);
 finish(bounced);
});

test('life triggers in this range follow the printed keyword',()=>{
 function hit(seed,life,ids=['AOT-1-001']){
  let s=toPhase(fresh(['AOT-1-001',...ids],seed),'attack');
  const attacker=put(s,0,'AOT-1-001','front',0,true);
  setLife(s,1,life);
  s=pick(s,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
  s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
  return s;
 }
 let none=hit(26082,['AOT-1-032','AOT-1-040'],['AOT-1-032','AOT-1-040']);
 assert.equal(none.pending,null);
 assert.equal(none.players[1].life.length,1);
 assert.equal(none.players[1].outside.some(c=>c.cardId==='AOT-1-032'),true);
 finish(none);

 let active=hit(26083,['AOT-1-027','AOT-1-040'],['AOT-1-027','AOT-1-040']);
 assert.equal(active.pending.trigger,'active');
 const rested=put(active,1,'AOT-1-001','front',0,false);
 active=pick(active,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===rested.uid);
 assert.equal(active.players[1].front.find(c=>c.uid===rested.uid).ready,true);
 finish(active);

 let skipped=hit(26084,['AOT-1-036','AOT-1-040'],['AOT-1-036','AOT-1-040']);
 const quiet=put(skipped,1,'AOT-1-001','front',0,false);
 skipped=pick(skipped,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(skipped.players[1].front.find(c=>c.uid===quiet.uid).ready,false);
 finish(skipped);

 let got=hit(26085,['AOT-1-028','AOT-1-040'],['AOT-1-028','AOT-1-040']);
 assert.equal(got.pending.trigger,'get');
 const revealed=got.pending.uid;
 got=pick(got,a=>a.type==='chooseTrigger'&&a.mode==='get');
 assert.equal(got.players[1].hand.some(c=>c.uid===revealed),true);
 finish(got);

 let drawn=hit(26086,['AOT-1-029','AOT-1-040'],['AOT-1-029','AOT-1-040']);
 const hand=drawn.players[1].hand.length;
 drawn=pick(drawn,a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.equal(drawn.players[1].hand.length,hand+1);
 finish(drawn);

 let special=hit(26087,['AOT-1-033','AOT-1-040'],['AOT-1-033','AOT-1-040','AOT-1-057']);
 const huge=put(special,0,'AOT-1-057','front',1,true);
 assert.equal(special.pending.trigger,'special');
 assert.equal(legalUniversalActions(packs,special).some(a=>a.mode==='special'&&a.uid===huge.uid),true);
 special=pick(special,a=>a.type==='chooseTrigger'&&a.mode==='skip');
 assert.equal(special.players[0].front.some(c=>c?.uid===huge.uid),true);
 finish(special);

 let retired=hit(26088,['AOT-1-034','AOT-1-040'],['AOT-1-034','AOT-1-040','AOT-1-057']);
 const victim=put(retired,0,'AOT-1-057','front',1,true);
 retired=pick(retired,a=>a.type==='chooseTrigger'&&a.mode==='special'&&a.uid===victim.uid);
 assert.equal(retired.players[0].outside.some(c=>c.uid===victim.uid),true);
 finish(retired);

 let raid=toPhase(fresh(['AOT-1-048','AOT-1-040','AOT-1-049','AOT-1-041','AOT-1-043','AOT-1-045','AOT-1-001'],26089),'attack');
 fuel(raid,1,['AOT-1-049','AOT-1-041','AOT-1-043','AOT-1-045']);
 const base=put(raid,1,'AOT-1-045','front',0,true);
 const attacker=put(raid,0,'AOT-1-001','front',0,true);
 setLife(raid,1,['AOT-1-048','AOT-1-040']);
 raid=pick(raid,a=>a.type==='attack'&&a.uid===attacker.uid&&!a.targetUid);
 raid=pick(raid,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(raid.pending.trigger,'raid');
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='get'),true);
 assert.equal(legalUniversalActions(packs,raid).some(a=>a.mode==='raid'&&a.baseUid===base.uid),true);
 raid=pick(raid,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid);
 assert.equal(raid.players[1].front.some(c=>c?.cardId==='AOT-1-048'&&c.stack?.[0]?.uid===base.uid),true);
 finish(raid);
});
