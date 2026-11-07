import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {KMR_PR_CARDS} from '../dist/kmr-pr-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {createKmrBattlePack} from '../dist/universal-v2/official-entry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalAttackDamage,universalBp,universalEnergy,universalImpact,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const battle=createKmrBattlePack();
const battlePacks=[battle,battle];
const YELLOW=['KMR-1-006','KMR-1-017','KMR-1-101','KMR-1-023'];
const printed=id=>KMR_CARDS.find(c=>c.id===id);

function countsFor(required){
 const fillers=Object.values(pack.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=pack.cards[id].trigger;
  let copies=1;
  if(trigger==='special'||trigger==='color'||trigger==='final'){
   copies=Math.min(1,4-caps[trigger]);
   caps[trigger]+=copies;
  }
  counts[id]=copies;
 }
 let total=Object.values(counts).reduce((n,x)=>n+x,0);
 for(const id of fillers){
  if(total>=50)break;
  const room=Math.min(4,50-total);
  const trigger=pack.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function withCopies(ids,extras){
 const counts=countsFor(ids);
 for(const [id,n] of Object.entries(extras)){
  let need=n-(counts[id]||0);
  counts[id]=n;
  for(const key of Object.keys(counts)){
   if(need<=0)break;
   if(key===id||Object.prototype.hasOwnProperty.call(extras,key)||ids.includes(key))continue;
   const drop=Math.min(need,counts[key]);
   counts[key]-=drop;
   if(counts[key]<=0)delete counts[key];
   need-=drop;
  }
  assert.equal(need,0,id);
 }
 assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function open(ids,seed){
 const counts=Array.isArray(ids)?countsFor(ids):ids;
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' p'+p);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;card.entryTurn=s.turn;
 s.players[p][line][slot]=card;return card;
}
function line(s,p,ids,zone='energy'){ids.forEach((id,i)=>put(s,p,id,zone,i,true));}
function ready(s){
 s.pending=null;s.phase='main';
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
}
function use(s,pred){
 const action=legalUniversalActions(packs,s).find(pred);
 if(!action)throw Error('No action pending '+(s.pending?.kind||'-')+'/'+(s.pending?.step||'')+' id '+(s.pending?.id||''));
 return dispatchUniversalAction(packs,s,action);
}
function play(s,uid,zone='front'){return use(s,a=>a.type==='play'&&a.uid===uid&&a.line===zone&&a.replaceUid==null);}
function raidOnto(s,uid,baseUid){return use(s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid);}
function event(s,uid){return use(s,a=>a.type==='event'&&a.uid===uid);}
function act(s,uid){return use(s,a=>a.type==='activate'&&a.uid===uid);}
function kmr(s,pred){return use(s,a=>a.type==='kmr'&&pred(a));}
function onlyHand(s,p,cards){s.players[p].deck.push(...s.players[p].hand.splice(0));s.players[p].hand.push(...cards);}
function silence(s,card,controller=0){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function toAttack(s){
 let guard=0;
 while(s.phase!=='attack'){
  if(s.pending)throw Error('Pending '+s.pending.kind+'/'+(s.pending.step||'')+' blocked attack');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('phase '+s.phase);
 }
 return s;
}
function toSide(s,player){
 let guard=0;
 while(s.active!==player&&guard++<10){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked the turn');
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 while(s.phase!=='main'&&guard++<10){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked main');
  s=dispatchUniversalAction(packs,s,{type:'next'});
 }
 return s;
}
function orderFiltered(s,uids){
 for(const uid of uids){
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseTopOrder'&&a.uid===uid));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function stackRaid(s,p,topId,base){
 const top=take(s,p,topId);
 const line=s.players[p].front.includes(base)?'front':'energy';
 const slot=s.players[p][line].findIndex(c=>c?.uid===base.uid);
 base.faceDown=false;base.ready=false;base.stack=[];base.under=[];
 top.stack=[base];top.raidBaseUid=base.uid;top.ready=true;top.under=[];
 top.fieldEntryStamp=s.nextFieldEntryStamp++;top.entryTurn=s.turn;
 s.players[p][line][slot]=top;
 return top;
}

test('102 through 113 and the three promos are the printed identities, not extra parallels',()=>{
 for(let n=102;n<=113;n++){
  const id='KMR-1-'+String(n).padStart(3,'0');
  const card=printed(id);
  assert.equal(card.identity,id);
  assert.equal(card.printings.length,1);
  assert.equal(card.printings[0].number,'UA29ST/'+id);
  assert.equal(card.printings[0].set,'UA29ST');
  assert.equal(pack.cards[id].name,card.nameJa);
 }
 assert.deepEqual(KMR_PR_CARDS.map(c=>c.number),['UAPR/KMR-P-003','UAPR/KMR-P-004','UAPR/KMR-P-005']);
 for(const card of KMR_PR_CARDS){
  assert.equal(card.printings.length,1);
  assert.equal(card.identity,card.id);
  assert.equal(card.faq.length,0);
 }
 assert.equal(printed('KMR-1-102').effectJa,'');
 assert.equal(printed('KMR-1-103').effectJa,'');
 assert.equal(pack.cards['KMR-1-102'].trigger,'active');
 assert.equal(pack.cards['KMR-1-103'].trigger,'active');
 assert.equal(pack.cards['KMR-1-104'].triggerEffect.op,'restOppFrontSkipNextActive');
 assert.equal(pack.cards['KMR-1-106'].trigger,null);
 assert.equal(pack.cards['KMR-1-107'].trigger,'raid');
 assert.equal(pack.cards['KMR-1-109'].trigger,'draw');
 assert.equal(pack.cards['KMR-1-112'].printedAttackDamage,2);
 assert.equal(pack.cards['KMR-1-105'].step,true);
});

test('102 and 103 have no printed effect and enter rested',()=>{
 let s=open(['KMR-1-102','KMR-1-103','KMR-1-006','KMR-1-017','KMR-1-101'],102103);
 line(s,0,['KMR-1-006','KMR-1-017','KMR-1-101']);
 const vulcan=take(s,0,'KMR-1-102'),valk=take(s,0,'KMR-1-103');
 onlyHand(s,0,[vulcan,valk]);
 ready(s);
 s=play(s,vulcan.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c?.uid===vulcan.uid).ready,false);
 assert.equal(universalBp(pack,s,vulcan),2500);
 s=play(s,valk.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].front.find(c=>c?.uid===valk.uid).ready,false);
 assert.equal(universalBp(pack,s,valk),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('102 active life readies one character and gives it BP+3000 this turn',()=>{
 let s=open(['KMR-1-102','KMR-1-101','KMR-1-006'],1021);
 const attacker=put(s,0,'KMR-1-006','front',0,true);
 const ally=put(s,1,'KMR-1-101','front',0,false);
 const life=take(s,1,'KMR-1-102');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.unshift(life);
 ready(s);
 s=toAttack(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 assert.equal(s.pending.player,1);
 const before=universalBp(pack,s,ally);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'active',uid:ally.uid});
 assert.equal(s.players[1].lifeRevealed.some(c=>c.uid===life.uid)||
  s.players[1].outside.some(c=>c.uid===life.uid)||s.players[1].hand.some(c=>c.uid===life.uid),true);
 const lived=s.players[1].front.find(c=>c?.uid===ally.uid);
 assert.equal(lived?.ready,true,'bp '+universalBp(pack,s,lived||ally));
 assert.equal(universalBp(pack,s,lived),before+3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('104 draws one on attack and must put one hand card on top or bottom',()=>{
 let s=open(['KMR-1-104','KMR-1-101','KMR-1-006','KMR-1-017','KMR-1-023'],1041);
 line(s,0,['KMR-1-017','KMR-1-023']);
 const rider=put(s,0,'KMR-1-104','front',0,true);
 const spare=take(s,0,'KMR-1-101'),drawn=take(s,0,'KMR-1-006');
 s.players[0].deck.unshift(drawn);
 onlyHand(s,0,[spare]);
 ready(s);
 s=toAttack(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:rider.uid});
 assert.equal(s.pending?.step,'placeHand');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),true);
 const looked=universalPrivateChoices(packs,s,0);
 assert.equal(looked.options.some(o=>o.card?.cardId==='KMR-1-006'),true);
 s=kmr(s,a=>a.mode==='bottom'&&a.uid===drawn.uid);
 assert.equal(s.players[0].deck.at(-1)?.uid,drawn.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(s.pending?.kind,'block');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('104 color life rests an opposing front character and skips its next active',()=>{
 let s=open(['KMR-1-104','KMR-1-101','KMR-1-006'],1042);
 const victim=put(s,0,'KMR-1-101','front',0,true);
 line(s,1,['KMR-1-006']);
 const attacker=put(s,1,'KMR-1-101','front',0,true);
 const life=take(s,0,'KMR-1-104');
 s.players[0].deck.push(...s.players[0].life.splice(0));
 s.players[0].life.unshift(life);
 ready(s);
 s.active=1;
 s=toAttack(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.trigger,'color');
 assert.equal(s.pending.player,0);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'colorRestSkip',uid:attacker.uid});
 const rested=s.players[1].front.find(c=>c?.uid===attacker.uid);
 assert.equal(rested?.ready,false);
 assert.ok(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===attacker.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('104 on retire needs three other 飛電インテリジェンス, then rests in a ゼロツー',()=>{
 let s=open(['KMR-1-104','KMR-1-105','KMR-1-106','KMR-1-023','KMR-1-021','KMR-1-088','KMR-1-070','KMR-1-087','KMR-1-082'],1043);
 line(s,1,['KMR-1-070','KMR-1-087','KMR-1-082']);
 put(s,0,'KMR-1-105','front',0,true);
 put(s,0,'KMR-1-106','front',1,true);
 put(s,0,'KMR-1-023','front',2,true);
 const rider=put(s,0,'KMR-1-104','front',3,true);
 const zeroTwo=take(s,0,'KMR-1-021');
 onlyHand(s,0,[zeroTwo]);
 const horse=take(s,1,'KMR-1-088');
 onlyHand(s,1,[horse]);
 ready(s);
 s=toSide(s,1);
 assert.ok(universalEnergy(pack,s,1)>=5);
 s=play(s,horse.uid);
 assert.equal(s.pending?.id,'KMR-1-088');
 s=kmr(s,a=>a.mode==='retire'&&a.uid===rider.uid);
 assert.equal(s.pending?.step,'enter');
 assert.equal(s.pending.actions.some(a=>a.uid===zeroTwo.uid&&a.mode==='enter'),true);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 const entered=s.pending.actions.find(a=>a.mode==='enter'&&a.uid===zeroTwo.uid&&a.line==='energy'&&a.slot===0);
 s=dispatchUniversalAction(packs,s,entered);
 assert.equal(s.players[0].energy[0]?.uid,zeroTwo.uid);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.pending?.id,'KMR-1-021');
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 let short=open(['KMR-1-104','KMR-1-105','KMR-1-106','KMR-1-021','KMR-1-088','KMR-1-070','KMR-1-087','KMR-1-082'],1044);
 line(short,1,['KMR-1-070','KMR-1-087','KMR-1-082']);
 put(short,0,'KMR-1-105','front',0,true);
 put(short,0,'KMR-1-106','front',1,true);
 const few=put(short,0,'KMR-1-104','front',2,true);
 const held=take(short,0,'KMR-1-021');
 onlyHand(short,0,[held]);
 const orph=take(short,1,'KMR-1-088');
 onlyHand(short,1,[orph]);
 ready(short);
 short=toSide(short,1);
 short=play(short,orph.uid);
 short=kmr(short,a=>a.mode==='retire'&&a.uid===few.uid);
 assert.equal(short.pending,null);
 assert.equal(short.players[0].hand.some(c=>c.uid===held.uid),true);
 assert.equal(assertUniversalMatch(packs,short),true);
});

test('105 gains BP+1000 only after three characters enter, and only while its text is live',()=>{
 let s=open(withCopies(['KMR-1-105','KMR-1-101'],{'KMR-1-101':4}),1051);
 const hopper=put(s,0,'KMR-1-105','front',0,true);
 const vanillas=[0,1,2].map(()=>take(s,0,'KMR-1-101'));
 onlyHand(s,0,vanillas);
 ready(s);
 s=play(s,vanillas[0].uid,'energy');
 s=play(s,vanillas[1].uid,'energy');
 assert.equal(s.fieldEntryNames[0].length,2);
 assert.equal(universalBp(pack,s,hopper),3000);
 s=play(s,vanillas[2].uid,'energy');
 assert.equal(s.fieldEntryNames[0].length,3);
 assert.equal(universalBp(pack,s,hopper),4000);
 silence(s,hopper);
 assert.equal(universalBp(pack,s,hopper),3000);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='step'&&a.uid===hopper.uid),false);
 s.phase='move';
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='step'&&a.uid===hopper.uid),false);
 s.continuousStates=[];
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='step'&&a.uid===hopper.uid),true);
 s=use(s,a=>a.type==='step'&&a.uid===hopper.uid);
 assert.equal(s.players[0].energy.some(c=>c?.uid===hopper.uid),true);
 assert.equal(s.players[0].front[0],null);
 s=toSide(s,1);
 assert.equal(universalBp(pack,s,hopper),3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('106 shows all three looked cards, discards only after a take, and keeps the rest private',()=>{
 let s=open(['KMR-1-106','KMR-1-105','KMR-1-101','KMR-1-023','KMR-1-006','KMR-1-017'],1061);
 line(s,0,['KMR-1-017']);
 const rider=take(s,0,'KMR-1-106');
 const window=[take(s,0,'KMR-1-101'),take(s,0,'KMR-1-105'),take(s,0,'KMR-1-023')];
 const spare=take(s,0,'KMR-1-006');
 s.players[0].deck.unshift(...window);
 onlyHand(s,0,[rider,spare]);
 ready(s);
 s=play(s,rider.uid);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(own.inspected.length,3);
 assert.equal(own.inspected.some(c=>c.uid===window[0].uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===window[0].uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===window[1].uid),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending.discardAfter,true);
 s=orderFiltered(s,[window[2].uid,window[0].uid]);
 assert.equal(s.pending?.kind,'effect-discard');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:spare.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===spare.uid),true);
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[2].uid,window[0].uid]);
 assert.equal(assertUniversalMatch(packs,s),true);

 let skipped=open(['KMR-1-106','KMR-1-105','KMR-1-101','KMR-1-023','KMR-1-006','KMR-1-017'],1062);
 line(skipped,0,['KMR-1-017']);
 const body=take(skipped,0,'KMR-1-106');
 const rest=[take(skipped,0,'KMR-1-101'),take(skipped,0,'KMR-1-105'),take(skipped,0,'KMR-1-023')];
 const kept=take(skipped,0,'KMR-1-006');
 skipped.players[0].deck.unshift(...rest);
 onlyHand(skipped,0,[body,kept]);
 ready(skipped);
 skipped=play(skipped,body.uid);
 skipped=dispatchUniversalAction(packs,skipped,{type:'chooseTopFiltered',uid:null});
 assert.equal(skipped.pending?.discardAfter,undefined);
 skipped=orderFiltered(skipped,rest.map(c=>c.uid));
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===kept.uid),true);
 assert.equal(skipped.players[0].outside.some(c=>c.uid===kept.uid),false);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('107 raid frame grants BP+1000 and unchosen, and Impact needs an empty ready front on its turn',()=>{
 let plain=open(['KMR-1-107',...YELLOW],1071);
 line(plain,0,YELLOW);
 const paid=take(plain,0,'KMR-1-107');
 onlyHand(plain,0,[paid]);
 ready(plain);
 plain=play(plain,paid.uid);
 const ordinary=plain.players[0].front.find(c=>c?.uid===paid.uid);
 assert.equal(plain.pending,null);
 assert.equal(universalBp(pack,plain,ordinary),4000);
 assert.equal(ordinary.oppChoiceImmuneGranted,undefined);
 assert.equal(ordinary.ready,false);
 assert.equal(universalImpact(pack,plain,ordinary),1);
 ordinary.ready=true;
 assert.equal(universalImpact(pack,plain,ordinary),0);
 ordinary.ready=false;
 assert.equal(assertUniversalMatch(packs,plain),true);

 let s=open(['KMR-1-107','KMR-1-106','KMR-1-023','KMR-1-006','KMR-1-017','KMR-1-101','KMR-1-102'],1072);
 line(s,0,['KMR-1-006','KMR-1-017','KMR-1-101','KMR-1-102']);
 const base=put(s,0,'KMR-1-106','front',0,true);
 const other=put(s,0,'KMR-1-023','front',1,true);
 const rider=take(s,0,'KMR-1-107');
 onlyHand(s,0,[rider]);
 ready(s);
 s=raidOnto(s,rider.uid,base.uid);
 const top=s.players[0].front[0];
 assert.equal(top.cardId,'KMR-1-107');
 assert.equal(universalBp(pack,s,top),5000);
 assert.equal(top.oppChoiceImmuneGranted?.turn,s.turn);
 assert.equal(universalImpact(pack,s,top),0);
 for(const c of s.players[0].front)if(c)c.ready=false;
 assert.equal(universalImpact(pack,s,top),1);
 s.players[0].front[1].ready=true;
 assert.equal(universalImpact(pack,s,top),0);
 s.players[0].front[1].ready=false;
 s.active=1;
 assert.equal(universalImpact(pack,s,top),0);
 s.active=0;
 silence(s,top);
 assert.equal(universalImpact(pack,s,top),0);
 assert.equal(universalBp(pack,s,top),5000);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('107 cannot be chosen by an opposing 選び while the raid grant lasts',()=>{
 // Q1191: the grant is 「このターン中」. The opposing 選び has to happen on that
 // same turn. The next turn has already cleared it, so a later 選び can take it.
 let s=open(['KMR-1-107','KMR-1-106','KMR-1-102','KMR-1-103','KMR-1-067','KMR-1-049','KMR-1-088','KMR-1-070','KMR-1-082','KMR-1-087',...YELLOW],1073);
 line(s,0,YELLOW);
 const base=put(s,0,'KMR-1-106','front',0,true);
 const ally=put(s,0,'KMR-1-102','front',1,true);
 const spare=put(s,0,'KMR-1-103','front',2,true);
 const rider=take(s,0,'KMR-1-107');
 onlyHand(s,0,[rider]);
 line(s,1,['KMR-1-070','KMR-1-082','KMR-1-087']);
 put(s,1,'KMR-1-049','front',0,true);
 const life=take(s,1,'KMR-1-067');
 const extras=s.players[1].life.splice(0);
 const kept=extras.shift();
 s.players[1].deck.push(...extras);
 s.players[1].life.push(life,kept);
 const horse=take(s,1,'KMR-1-088');
 onlyHand(s,1,[horse]);
 ready(s);
 s=raidOnto(s,rider.uid,base.uid);
 const top=s.players[0].front.find(c=>c?.cardId==='KMR-1-107');
 assert.equal(top.oppChoiceImmuneGranted?.turn,s.turn);
 assert.equal(universalBp(pack,s,top),5000);
 s=toAttack(s);
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:ally.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'special'});
 assert.equal(s.pending?.id,'KMR-1-067');
 assert.equal(s.pending.actions.some(a=>a.uid===top.uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===ally.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===spare.uid),true);
 s=kmr(s,a=>a.mode==='retire'&&a.uid===spare.uid);
 s=toSide(s,1);
 const live=s.players[0].front.find(c=>c?.uid===top.uid);
 assert.equal(live.oppChoiceImmuneGranted,undefined);
 assert.equal(universalBp(pack,s,live),4000);
 assert.ok(universalEnergy(pack,s,1)>=5);
 s=play(s,horse.uid);
 assert.equal(s.pending?.id,'KMR-1-088');
 assert.equal(s.pending.actions.some(a=>a.uid===live.uid),true);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.players[0].front.some(c=>c?.uid===live.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('107 attack end may raid its top card onto another active ゼロワン',()=>{
 function board(){
  let s=open(['KMR-1-107','KMR-1-106','KMR-1-105','KMR-1-101',...YELLOW],1074);
  line(s,0,YELLOW);
  const base=put(s,0,'KMR-1-106','front',0,true);
  const host=put(s,0,'KMR-1-105','front',1,true);
  const rider=take(s,0,'KMR-1-107');
  onlyHand(s,0,[rider]);
  const life=take(s,1,'KMR-1-101');
  s.players[1].deck.push(...s.players[1].life.splice(0));
  s.players[1].life.unshift(life);
  ready(s);
  s=raidOnto(s,rider.uid,base.uid);
  s=toAttack(s);
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:s.players[0].front[0].uid});
  assert.equal(s.pending?.kind,'block');
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
  return {s,base,host,life};
 }
 let skipped=board();
 assert.equal(skipped.s.pending?.step,'shiftRaid');
 assert.equal(skipped.s.pending.actions.some(a=>a.uid===skipped.host.uid),true);
 assert.equal(skipped.s.pending.actions.some(a=>a.uid===skipped.base.uid),false);
 skipped.s=kmr(skipped.s,a=>a.mode==='skip');
 assert.equal(skipped.s.players[0].front[0]?.cardId,'KMR-1-107');
 assert.equal(skipped.s.players[0].front[0].stack[0]?.uid,skipped.base.uid);
 assert.equal(assertUniversalMatch(packs,skipped.s),true);

 let moved=board();
 assert.equal(moved.s.players[0].front[0].ready,false);
 moved.s=kmr(moved.s,a=>a.mode==='host'&&a.uid===moved.host.uid);
 const shifted=moved.s.players[0].front[1];
 assert.equal(shifted?.cardId,'KMR-1-107');
 assert.equal(shifted.ready,true);
 assert.equal(shifted.stack[0]?.uid,moved.host.uid);
 assert.equal(universalBp(pack,moved.s,shifted),5000);
 assert.equal(shifted.oppChoiceImmuneGranted?.turn,moved.s.turn);
 const returned=moved.s.players[0].front[0];
 assert.equal(returned?.uid,moved.base.uid);
 assert.equal(returned.ready,false);
 assert.equal(returned.stack?.length||0,0);
 assert.equal(returned.buffs?.length||0,0);
 assert.equal(moved.s.players[0].outside.some(c=>c.uid===moved.base.uid),false);
 assert.equal(moved.s.pending,null);
 assert.equal(assertUniversalMatch(packs,moved.s),true);
});

test('108 shows the looked top card only to its controller, then rests in a cheap 飛電 character',()=>{
 let s=open(['KMR-1-108','KMR-1-106','KMR-1-105','KMR-1-102','KMR-1-101','KMR-1-006','KMR-1-017','KMR-1-023'],1081);
 line(s,0,['KMR-1-006','KMR-1-017']);
 const field=take(s,0,'KMR-1-108');
 const secret=take(s,0,'KMR-1-101');
 const intel=take(s,0,'KMR-1-106'),aims=take(s,0,'KMR-1-102'),spare=take(s,0,'KMR-1-023');
 const nested=take(s,0,'KMR-1-105');
 s.players[0].deck.unshift(nested);
 s.players[0].deck.unshift(secret);
 s.players[0].outside.push(intel,aims);
 onlyHand(s,0,[field,spare]);
 ready(s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===field.uid),false);
 s=play(s,field.uid,'energy');
 assert.equal(s.pending?.step,'topPlace');
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(own.inspected?.some(c=>c.uid===secret.uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=kmr(s,a=>a.mode==='bottom');
 assert.equal(s.players[0].deck.at(-1)?.uid,secret.uid);
 const zea=s.players[0].energy.find(c=>c?.uid===field.uid);
 assert.equal(zea.ready,false);
 zea.ready=true;
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(s,zea.uid);
 const rested=s.players[0].energy.find(c=>c?.uid===field.uid);
 assert.equal(rested.ready,false);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.pending?.step,'discard');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===spare.uid&&e.to==='outside'&&e.reason==='payment'),true);
 assert.equal(s.pending?.step,'enter');
 assert.equal(s.pending.actions.some(a=>a.uid===intel.uid),true);
 assert.equal(s.pending.actions.some(a=>a.uid===aims.uid),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 const dest=s.pending.actions.find(a=>a.mode==='enter'&&a.uid===intel.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction(packs,s,dest);
 assert.equal(s.players[0].front[0]?.uid,intel.uid);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.pending?.kind,'effect-top-filter-choice');
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('109 shows the whole top four, then rests in or raids one cheap 飛電 character',()=>{
 let s=open(['KMR-1-109','KMR-1-107','KMR-1-106','KMR-1-105','KMR-1-102','KMR-1-070',...YELLOW],1091);
 line(s,0,YELLOW);
 const base=put(s,0,'KMR-1-105','front',0,true);
 const eventCard=take(s,0,'KMR-1-109');
 const window=[take(s,0,'KMR-1-070'),take(s,0,'KMR-1-102'),take(s,0,'KMR-1-106'),take(s,0,'KMR-1-107')];
 s.players[0].deck.unshift(...window);
 onlyHand(s,0,[eventCard]);
 ready(s);
 s=event(s,eventCard.uid);
 assert.equal(s.pending?.step,'enter');
 assert.deepEqual(s.pending.data.windowUids,window.map(c=>c.uid));
 const own=universalPrivateChoices(packs,s,0);
 assert.equal(own.inspected.length,4);
 assert.equal(own.inspected.some(c=>c.uid===window[1].uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.pending.actions.some(a=>a.uid===window[1].uid),false);
 assert.equal(s.pending.actions.some(a=>a.uid===window[2].uid&&a.mode==='enter'&&a.ready===false),true);
 assert.equal(s.pending.actions.some(a=>a.uid===window[2].uid&&a.mode==='raid'),false);
 assert.equal(s.pending.actions.some(a=>a.uid===window[3].uid&&a.mode==='raid'&&a.baseUid===base.uid),true);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending?.step,'lookOrder');
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.mode==='next');
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.slice(-4).map(c=>c.uid),window.map(c=>c.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('110 may set aside three equal-energy cards, retire up to one, and draw three at the end of this main',()=>{
 let s=open(withCopies(['KMR-1-110','KMR-1-046','KMR-1-063','KMR-1-062','KMR-1-036','KMR-1-101'],
  {'KMR-1-046':4,'KMR-1-063':2}),1101);
 line(s,0,['KMR-1-036','KMR-1-046']);
 const rider=take(s,0,'KMR-1-110');
 const trio=[take(s,0,'KMR-1-046'),take(s,0,'KMR-1-046'),take(s,0,'KMR-1-046')];
 const other=take(s,0,'KMR-1-101');
 const medals=[take(s,0,'KMR-1-063'),take(s,0,'KMR-1-063')];
 const ankh=take(s,0,'KMR-1-062');
 s.players[0].outside.push(...medals,ankh);
 onlyHand(s,0,[rider,...trio,other]);
 const victim=put(s,1,'KMR-1-101','front',0,true);
 ready(s);
 assert.equal(universalBp(pack,s,rider),3000+1000);
 s=play(s,rider.uid);
 assert.equal(s.pending?.step,'same');
 assert.equal(s.pending.actions.filter(a=>a.mode==='same').every(a=>trio.some(c=>c.uid===a.uid)),true);
 assert.equal(s.pending.actions.some(a=>a.uid===other.uid),false);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.kmrMainEndDraw??null,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 let paid=open(withCopies(['KMR-1-110','KMR-1-046','KMR-1-036','KMR-1-101'],
  {'KMR-1-046':4,'KMR-1-101':3}),1102);
 line(paid,0,['KMR-1-036','KMR-1-046']);
 const ooo=take(paid,0,'KMR-1-110');
 const costs=[take(paid,0,'KMR-1-046'),take(paid,0,'KMR-1-046'),take(paid,0,'KMR-1-046')];
 const marker=[take(paid,0,'KMR-1-101'),take(paid,0,'KMR-1-101'),take(paid,0,'KMR-1-101')];
 paid.players[0].deck.unshift(...marker);
 onlyHand(paid,0,[ooo,...costs]);
 const foe=put(paid,1,'KMR-1-101','front',0,true);
 ready(paid);
 const deck=paid.players[0].deck.length;
 paid=play(paid,ooo.uid);
 for(const card of costs)paid=kmr(paid,a=>a.mode==='same'&&a.uid===card.uid);
 assert.equal(paid.pending?.step,'retire');
 assert.equal(paid.kmrMainEndDraw?.count,3);
 paid=kmr(paid,a=>a.mode==='skip');
 assert.equal(paid.players[1].front[0]?.uid,foe.uid);
 paid=dispatchUniversalAction(packs,paid,{type:'next'});
 assert.equal(paid.phase,'attack');
 assert.equal(paid.players[0].deck.length,deck-3);
 assert.equal(paid.kmrMainEndDraw??null,null);
 assert.equal(assertUniversalMatch(packs,paid),true);

 let retired=open(withCopies(['KMR-1-110','KMR-1-046','KMR-1-036','KMR-1-101'],{'KMR-1-046':4}),1103);
 line(retired,0,['KMR-1-036','KMR-1-046']);
 const body=take(retired,0,'KMR-1-110');
 const pay=[take(retired,0,'KMR-1-046'),take(retired,0,'KMR-1-046'),take(retired,0,'KMR-1-046')];
 onlyHand(retired,0,[body,...pay]);
 const target=put(retired,1,'KMR-1-101','front',0,true);
 ready(retired);
 retired=play(retired,body.uid);
 for(const card of pay)retired=kmr(retired,a=>a.mode==='same'&&a.uid===card.uid);
 retired=kmr(retired,a=>a.mode==='retire'&&a.uid===target.uid);
 assert.equal(retired.players[1].outside.some(c=>c.uid===target.uid),true);
 assert.equal(retired.players[1].front[0],null);
 assert.equal(assertUniversalMatch(packs,retired),true);
});

test('111 pays two cards and 1 AP from four energy of any color, and the battle debuff hits the opponent',()=>{
 let s=open(['KMR-1-111','KMR-1-098','KMR-1-081','KMR-1-084','KMR-1-102',...YELLOW],1111);
 line(s,0,YELLOW);
 const genm=take(s,0,'KMR-1-111');
 const gear=take(s,0,'KMR-1-098'),other=take(s,0,'KMR-1-102');
 put(s,0,'KMR-1-081','front',0,true);
 const faiz=put(s,0,'KMR-1-084','front',1,true);
 s.players[0].outside.push(genm);
 onlyHand(s,0,[gear,other]);
 ready(s);
 assert.ok(universalEnergy(pack,s,0)>=4);
 assert.equal(universalBp(pack,s,faiz),1500);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=act(s,genm.uid);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===gear.uid);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===other.uid);
 assert.equal(s.zoneMoveEvents.filter(e=>e.uid===gear.uid&&e.to==='outside').every(e=>e.reason==='payment'),true);
 assert.notEqual(s.players[0].deck[0]?.uid,gear.uid);
 assert.equal(s.pending?.id==='KMR-1-081',false);
 assert.equal(universalBp(pack,s,faiz),1500);
 assert.equal(s.pending?.step,'enter');
 const dest=s.pending.actions.find(a=>a.mode==='enter'&&a.uid===genm.uid&&a.line==='front'&&a.slot===2);
 s=dispatchUniversalAction(packs,s,dest);
 assert.equal(s.players[0].front[2]?.uid,genm.uid);
 assert.equal(s.players[0].front[2].ready,false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);

 let battle=open(['KMR-1-111','KMR-1-112','KMR-1-101'],1112);
 const striker=put(battle,0,'KMR-1-112','front',0,true);
 const loser=put(battle,1,'KMR-1-111','front',0,true);
 ready(battle);
 battle=toAttack(battle);
 battle=dispatchUniversalAction(packs,battle,{type:'attack',uid:striker.uid});
 assert.equal(battle.pending?.step,'own');
 battle=kmr(battle,a=>a.mode==='own'&&a.uid===striker.uid);
 const buffed=battle.players[0].front.find(c=>c?.uid===striker.uid);
 assert.equal(universalBp(pack,battle,buffed),5000);
 assert.equal(universalAttackDamage(pack,battle,buffed),2);
 battle=dispatchUniversalAction(packs,battle,{type:'chooseBlock',uid:loser.uid});
 assert.equal(battle.pending?.id,'KMR-1-111');
 assert.equal(battle.pending.actions.some(a=>a.uid===striker.uid),true);
 assert.equal(battle.pending.actions.some(a=>a.mode==='skip'),true);
 battle=kmr(battle,a=>a.mode==='own'&&a.uid===striker.uid);
 assert.equal(universalBp(pack,battle,battle.players[0].front.find(c=>c?.uid===striker.uid)),4000);
 assert.equal(battle.players[1].outside.some(c=>c.uid===loser.uid),true);
 assert.equal(assertUniversalMatch(packs,battle),true);

 let ruled=open(['KMR-1-111','KMR-1-088','KMR-1-070','KMR-1-087','KMR-1-082','KMR-1-101'],1113);
 line(ruled,0,['KMR-1-070','KMR-1-087','KMR-1-082']);
 const horse=take(ruled,0,'KMR-1-088');
 onlyHand(ruled,0,[horse]);
 const stood=put(ruled,1,'KMR-1-111','front',0,true);
 const bystander=put(ruled,0,'KMR-1-101','front',0,true);
 ruled.players[1].deck.push(...ruled.players[1].hand.splice(0));
 ready(ruled);
 const bp=universalBp(pack,ruled,bystander);
 ruled=play(ruled,horse.uid);
 ruled=kmr(ruled,a=>a.mode==='retire'&&a.uid===stood.uid);
 assert.equal(ruled.pending?.id==='KMR-1-111',false);
 assert.equal(ruled.players[1].outside.some(c=>c.uid===stood.uid),true);
 assert.equal(universalBp(pack,ruled,bystander),bp);
 assert.equal(assertUniversalMatch(packs,ruled),true);
});

test('112 discards one on play, deals 2 damage, and may give one of its characters BP+1000',()=>{
 let s=open(['KMR-1-112','KMR-1-070','KMR-1-087','KMR-1-101'],1121);
 line(s,0,['KMR-1-070','KMR-1-087']);
 const rider=take(s,0,'KMR-1-112'),spare=take(s,0,'KMR-1-101');
 onlyHand(s,0,[rider,spare]);
 ready(s);
 s=play(s,rider.uid);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(s.zoneMoveEvents.some(e=>e.uid===spare.uid&&e.reason==='own-effect'&&e.to==='outside'),true);
 assert.equal(s.players[0].front.find(c=>c?.uid===rider.uid).ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
 let hit=open(['KMR-1-112','KMR-1-101','KMR-1-070'],1123);
 const striker=put(hit,0,'KMR-1-112','front',0,true);
 const piled=[take(hit,1,'KMR-1-101'),take(hit,1,'KMR-1-070')];
 hit.players[1].deck.push(...hit.players[1].life.splice(0));
 hit.players[1].life.unshift(...piled);
 ready(hit);
 hit=toAttack(hit);
 hit=dispatchUniversalAction(packs,hit,{type:'attack',uid:striker.uid});
 assert.equal(universalAttackDamage(pack,hit,striker),2);
 hit=kmr(hit,a=>a.mode==='skip');
 assert.equal(universalBp(pack,hit,striker),4000);
 hit=dispatchUniversalAction(packs,hit,{type:'chooseBlock',uid:null});
 assert.equal(hit.players[1].life.length,0);
 assert.equal(assertUniversalMatch(packs,hit),true);

 let empty=open(['KMR-1-112','KMR-1-070','KMR-1-087'],1122);
 line(empty,0,['KMR-1-070','KMR-1-087']);
 const lone=take(empty,0,'KMR-1-112');
 onlyHand(empty,0,[lone]);
 ready(empty);
 empty=play(empty,lone.uid);
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].front.some(c=>c?.uid===lone.uid),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

test('113 publishes the opponent top and, on retire, looks privately for ファイズ',()=>{
 let s=open(['KMR-1-113','KMR-1-070','KMR-1-087','KMR-1-101'],1131);
 line(s,0,['KMR-1-070','KMR-1-087']);
 const muse=take(s,0,'KMR-1-113');
 const top=take(s,1,'KMR-1-101');
 s.players[1].deck.unshift(top);
 onlyHand(s,0,[muse]);
 ready(s);
 s=play(s,muse.uid);
 assert.equal(s.pending?.step,'oppTop');
 assert.ok(s.publicReveals.some(r=>r.uid===top.uid||r.cardId==='KMR-1-101'));
 s=kmr(s,a=>a.mode==='outside');
 assert.equal(s.players[1].outside.some(c=>c.uid===top.uid),true);
 assert.equal(s.players[1].deck[0]?.uid===top.uid,false);
 assert.equal(assertUniversalMatch(packs,s),true);

 let leave=open(['KMR-1-113','KMR-1-088','KMR-1-082','KMR-1-078','KMR-1-070','KMR-1-087','KMR-1-101'],1132);
 line(leave,0,['KMR-1-070','KMR-1-087','KMR-1-082']);
 const horse=take(leave,0,'KMR-1-088');
 onlyHand(leave,0,[horse]);
 const body=put(leave,1,'KMR-1-113','front',0,true);
 const window=[take(leave,1,'KMR-1-078'),take(leave,1,'KMR-1-082'),take(leave,1,'KMR-1-101'),take(leave,1,'KMR-1-070')];
 const spare=take(leave,1,'KMR-1-087');
 leave.players[1].deck.unshift(...window);
 onlyHand(leave,1,[spare]);
 ready(leave);
 leave=play(leave,horse.uid);
 leave=kmr(leave,a=>a.mode==='retire'&&a.uid===body.uid);
 if(leave.pending?.step==='punishBack')leave=kmr(leave,a=>a.mode==='skip');
 assert.equal(leave.pending?.step,'lookPick');
 assert.equal(leave.pending.player,1);
 const own=universalPrivateChoices(packs,leave,1);
 assert.equal(own.inspected.length,4);
 assert.equal(own.inspected.some(c=>c.uid===window[0].uid),true);
 assert.equal(leave.pending.actions.some(a=>a.uid===window[0].uid),false);
 assert.equal(leave.pending.actions.some(a=>a.uid===window[1].uid&&a.mode==='take'),true);
 assert.equal(universalPrivateChoices(packs,leave,0),null);
 leave=kmr(leave,a=>a.mode==='take'&&a.uid===window[1].uid);
 while(leave.pending?.step==='lookOrder')leave=kmr(leave,a=>a.mode==='next');
 assert.equal(leave.pending?.step,'discard');
 leave=kmr(leave,a=>a.mode==='discard'&&a.uid===spare.uid);
 assert.equal(leave.players[1].hand.some(c=>c.uid===window[1].uid),true);
 assert.equal(leave.players[1].outside.some(c=>c.uid===spare.uid),true);
 assert.equal(assertUniversalMatch(packs,leave),true);
});

test('printed tuck effects do not put a facedown under 085, and 085 still raids a plain Faiz',()=>{
 let s=open(['KMR-1-085','KMR-1-082','KMR-1-086','KMR-1-049','KMR-1-070','KMR-1-087'],851);
 line(s,0,['KMR-1-070','KMR-1-087']);
 const faiz=put(s,0,'KMR-1-082','front',0,true);
 const gear=put(s,0,'KMR-1-086','front',1,true);
 const ex=put(s,0,'KMR-1-049','front',2,true);
 const axel=take(s,0,'KMR-1-085');
 onlyHand(s,0,[axel]);
 ready(s);
 const raids=legalUniversalActions(packs,s).filter(a=>a.type==='raid'&&a.uid===axel.uid);
 assert.ok(raids.some(a=>a.baseUid===faiz.uid));
 assert.equal(raids.some(a=>a.baseUid===gear.uid),false);
 assert.equal(raids.some(a=>a.baseUid===ex.uid),false);
 s=raidOnto(s,axel.uid,faiz.uid);
 assert.equal(s.players[0].front[0]?.cardId,'KMR-1-085');
 assert.equal(s.players[0].front[0].under?.length||0,0);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.baseUid===s.players[0].front[0].uid),false);

 let tuck=open(['KMR-1-048','KMR-1-049','KMR-1-085','KMR-1-082','KMR-1-036','KMR-1-046','KMR-1-053','KMR-1-051'],852);
 line(tuck,0,['KMR-1-036','KMR-1-046','KMR-1-053','KMR-1-051']);
 const doctor=put(tuck,0,'KMR-1-049','front',0,true);
 const raid=put(tuck,0,'KMR-1-082','front',1,true);
 const axelTop=stackRaid(tuck,0,'KMR-1-085',raid);
 const maximum=take(tuck,0,'KMR-1-048');
 onlyHand(tuck,0,[maximum]);
 ready(tuck);
 assert.ok(universalEnergy(pack,tuck,0)>=5);
 tuck=play(tuck,maximum.uid);
 assert.equal(tuck.pending?.step,'tuck');
 assert.equal(tuck.pending.actions.some(a=>a.uid===doctor.uid),true);
 assert.equal(tuck.pending.actions.some(a=>a.uid===axelTop.uid||a.uid===raid.uid),false);
 assert.equal(assertUniversalMatch(packs,tuck),true);

 let host=open(['KMR-1-060','KMR-1-049','KMR-1-085','KMR-1-082','KMR-1-036'],853);
 line(host,0,['KMR-1-036']);
 const para=put(host,0,'KMR-1-060','front',0,true);
 const level=put(host,0,'KMR-1-049','front',1,true);
 const bottom=put(host,0,'KMR-1-082','front',2,true);
 const axelHost=stackRaid(host,0,'KMR-1-085',bottom);
 ready(host);
 host=act(host,para.uid);
 assert.equal(host.pending?.step,'own');
 assert.equal(host.pending.actions.some(a=>a.uid===level.uid),true);
 assert.equal(host.pending.actions.some(a=>a.uid===axelHost.uid||a.uid===bottom.uid),false);
 assert.equal(host.players[0].front.find(c=>c?.uid===para.uid)?.ready,false);
 assert.equal(assertUniversalMatch(packs,host),true);
});

function fillBattle(required,extra={}){
 const fillers=Object.values(battle.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={...extra};
 for(const id of [...new Set(required)]){
  if(counts[id])continue;
  const trigger=battle.cards[id].trigger;
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
  const room=Math.min(battle.cards[id].maxCopies||4,50-total);
  const trigger=battle.cards[id].trigger;
  let add=room;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(battle,counts),[]);
 return counts;
}
function freshBattle(ids,seed,extra){
 const counts=fillBattle(ids,extra);
 return newUniversalMatch(battlePacks,{decks:[counts,counts],seed,first:0});
}
function takeB(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function putB(s,p,id,line,slot,ready=true){
 const card=takeB(s,p,id);
 card.ready=ready;card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;return card;
}
function readyB(s){
 s.pending=null;s.phase='main';
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
}
function goB(s,pred){
 const pool=s.pending?.actions?.length?s.pending.actions:legalUniversalActions(battlePacks,s);
 const action=pool.find(pred);
 if(!action)throw Error('No battle action '+(s.pending?.step||s.phase));
 return dispatchUniversalAction(battlePacks,s,action);
}

test('P-003 may take nothing, and taking a Gochizo is the only discard',()=>{
 const s0=freshBattle(['KMR-P-003','KMR-2-013','KMR-2-010','KMR-2-002','KMR-2-001','KMR-2-090'],9003,
  {'KMR-2-013':2,'KMR-2-001':2,'KMR-2-090':4});
 const foods=[takeB(s0,0,'KMR-2-013'),takeB(s0,0,'KMR-2-013')];
 const yellow=takeB(s0,0,'KMR-2-010'),marker=takeB(s0,0,'KMR-2-002'),red=takeB(s0,0,'KMR-2-001');
 const rider=takeB(s0,0,'KMR-P-003'),spare=takeB(s0,0,'KMR-2-001');
 s0.players[0].deck.push(...s0.players[0].hand.splice(0));
 s0.players[0].deck.unshift(marker,red,foods[0],yellow,foods[1]);
 s0.players[0].hand.push(rider,spare);
 for(let slot=0;slot<4;slot++)putB(s0,0,'KMR-2-090','energy',slot,true);
 readyB(s0);
 let state=goB(s0,a=>a.type==='play'&&a.uid===rider.uid);
 assert.equal(state.pending?.step,'pr003Pick');
 const own=universalPrivateChoices(battlePacks,state,0);
 assert.equal(own.inspected.length,5);
 assert.equal(universalPrivateChoices(battlePacks,state,1),null);
 state=goB(state,a=>a.mode==='done');
 while(state.pending?.step==='lookOrder')state=goB(state,a=>a.mode==='next');
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===spare.uid),true);
 assert.equal(state.players[0].hand.some(c=>c.uid===foods[0].uid),false);
 assert.equal(assertUniversalMatch(battlePacks,state),true);
});

test('P-004 discounts only the next non-raid Decade played from hand',()=>{
 const s=freshBattle(['KMR-P-004','KMR-2-070','KMR-2-064','KMR-2-090','KMR-2-068'],9004,{'KMR-2-070':4});
 for(let slot=0;slot<3;slot++)putB(s,0,'KMR-2-070','energy',slot,true);
 const trait=putB(s,0,'KMR-2-070','front',0,true);
 const rider=takeB(s,0,'KMR-P-004');
 const decade=takeB(s,0,'KMR-2-064');
 const other=takeB(s,0,'KMR-2-090');
 const raider=takeB(s,0,'KMR-2-068');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(rider,decade,other,raider);
 readyB(s);
 let state=goB(s,a=>a.type==='play'&&a.uid===rider.uid);
 assert.equal(state.pending?.step,'pr004Bounce');
 assert.equal(state.pending.actions.some(a=>a.uid===trait.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===decade.uid),false);
 state=goB(state,a=>a.mode==='bounce'&&a.uid===trait.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===trait.uid),true);
 assert.equal(state.kmrPrNextDecadeAp?.[0],state.turn);
 for(const ap of state.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(battlePacks,state).some(a=>a.type==='play'&&a.uid===decade.uid),true);
 assert.equal(legalUniversalActions(battlePacks,state).some(a=>a.type==='play'&&a.uid===other.uid),false);
 assert.equal(legalUniversalActions(battlePacks,state).some(a=>a.uid===raider.uid&&(a.type==='play'||a.type==='raid')),false);
 state=goB(state,a=>a.type==='play'&&a.uid===decade.uid);
 assert.equal(state.kmrPrNextDecadeAp?.[0]??null,null);
 assert.equal(assertUniversalMatch(battlePacks,state),true);

 const skipped=freshBattle(['KMR-P-004','KMR-2-070','KMR-2-064'],9014,{'KMR-2-070':4});
 for(let slot=0;slot<3;slot++)putB(skipped,0,'KMR-2-070','energy',slot,true);
 putB(skipped,0,'KMR-2-070','front',0,true);
 const body=takeB(skipped,0,'KMR-P-004');
 const plain=takeB(skipped,0,'KMR-2-064');
 skipped.players[0].deck.push(...skipped.players[0].hand.splice(0));
 skipped.players[0].hand.push(body,plain);
 readyB(skipped);
 let declined=goB(skipped,a=>a.type==='play'&&a.uid===body.uid);
 declined=goB(declined,a=>a.mode==='skip'||a.mode==='done');
 assert.equal(declined.kmrPrNextDecadeAp?.[0]??null,null);
 for(const ap of declined.players[0].apCards)ap.ready=false;
 assert.equal(legalUniversalActions(battlePacks,declined).some(a=>a.type==='play'&&a.uid===plain.uid),false);
 assert.equal(assertUniversalMatch(battlePacks,declined),true);
});

test('P-005 draws for a Knight name even when Night Survive is not raided',()=>{
 const s=freshBattle(['KMR-P-005','KMR-2-089','KMR-2-094','KMR-2-090','KMR-2-001'],9005,{'KMR-2-090':4});
 const rider=putB(s,0,'KMR-P-005','front',0,true);
 putB(s,0,'KMR-2-089','front',1,true);
 const dragon=takeB(s,0,'KMR-2-094');
 const marker=takeB(s,0,'KMR-2-001');
 s.players[0].deck.unshift(marker);
 s.players[0].hand.push(dragon);
 for(let slot=0;slot<3;slot++)putB(s,0,'KMR-2-090','energy',slot,true);
 readyB(s);
 let state=goB(s,a=>a.type==='activate'&&a.uid===rider.uid);
 assert.equal(state.players[0].hand.some(c=>c.uid===marker.uid),true);
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(c=>c.uid===dragon.uid),true);
 assert.equal(legalUniversalActions(battlePacks,state).some(a=>a.type==='activate'&&a.uid===rider.uid),false);
 assert.equal(assertUniversalMatch(battlePacks,state),true);
});

test('P-005 may put one outside Survive card on top and shows the rest of outside',()=>{
 const s=freshBattle(['KMR-P-005','KMR-2-094','KMR-2-001','KMR-2-090'],9015,{'KMR-2-090':4});
 for(let slot=0;slot<4;slot++)putB(s,0,'KMR-2-090','energy',slot,true);
 const rider=takeB(s,0,'KMR-P-005');
 const survive=takeB(s,0,'KMR-2-094');
 const other=takeB(s,0,'KMR-2-001');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].outside.push(survive,other);
 s.players[0].hand.push(rider);
 readyB(s);
 let state=goB(s,a=>a.type==='play'&&a.uid===rider.uid);
 assert.equal(state.pending?.step,'outsideTop');
 assert.deepEqual(state.pending.data.uids.slice().sort(),[survive.uid,other.uid].sort());
 const own=universalPrivateChoices(battlePacks,state,0);
 assert.equal(own.inspected.length,2);
 assert.equal(state.pending.actions.some(a=>a.mode==='deckTop'&&a.uid===survive.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===other.uid),false);
 state=goB(state,a=>a.mode==='deckTop'&&a.uid===survive.uid);
 assert.equal(state.players[0].deck[0]?.uid,survive.uid);
 assert.equal(state.players[0].outside.some(c=>c.uid===other.uid),true);
 assert.equal(assertUniversalMatch(battlePacks,state),true);
});

test('KMR-2-022 cannot tuck a facedown under 085',()=>{
 const s=freshBattle(['KMR-2-022','KMR-1-085','KMR-1-082','KMR-2-001'],9022);
 const faiz=putB(s,0,'KMR-1-082','front',0,true);
 const paradox=putB(s,0,'KMR-2-022','front',1,true);
 const axel=takeB(s,0,'KMR-1-085');
 const spare=takeB(s,0,'KMR-2-001');
 faiz.ready=false;faiz.stack=[];faiz.under=[];
 axel.stack=[faiz];axel.raidBaseUid=faiz.uid;axel.ready=true;axel.under=[];
 axel.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[0]=axel;
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(spare);
 readyB(s);
 let state=goB(s,a=>a.type==='activate'&&a.uid===paradox.uid);
 state=goB(state,a=>a.key==='tuck');
 state=goB(state,a=>a.mode==='tuck'&&a.uid===spare.uid);
 assert.equal(state.pending?.step,'tuck022Host');
 assert.equal(state.pending.actions.some(a=>a.uid===paradox.uid),true);
 assert.equal(state.pending.actions.some(a=>a.uid===axel.uid),false);
 assert.equal(state.pending.actions.some(a=>a.uid===faiz.uid),false);
 assert.equal(assertUniversalMatch(battlePacks,state),true);
});
