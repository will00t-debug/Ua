import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalAttackDamage,universalBp,universalCardEnergy,universalEnergyByColor,universalImpact,
 universalPrivateChoices,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createKmrV2Pack();
const packs=[pack,pack];
const YELLOW=['KMR-1-027','KMR-1-103','KMR-1-105','KMR-1-101'];
const BLUE=['KMR-1-036','KMR-1-046','KMR-1-053','KMR-1-051'];
const text=id=>KMR_CARDS.find(c=>c.id===id).effectJa;

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
function kmr(s,pred){return use(s,a=>a.type==='kmr'&&pred(a));}
function act(s,uid,mode){return use(s,a=>a.type==='activate'&&a.uid===uid&&(mode==null||a.mode===mode));}
function activates(s,uid){return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);}
function onlyHand(s,p,cards){s.players[p].deck.push(...s.players[p].hand.splice(0));s.players[p].hand.push(...cards);}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function silence(s,card,controller){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function toAttack(s){
 let guard=0;
 while(s.phase!=='attack'){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked attack');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('phase '+s.phase);
 }
 return s;
}
function finishKmr(s){
 let guard=0;
 while(s.pending?.kind==='kmr'&&guard++<16){
  const a=s.pending.actions.find(x=>x.mode==='skip'||x.mode==='done')||s.pending.actions[0];
  s=use(s,x=>x.type==='kmr'&&x.mode===a.mode&&(a.uid==null||x.uid===a.uid)&&(a.key==null||x.key===a.key));
 }
 return s;
}
function sameThree(s,ids){
 for(const id of ids){
  const uid=s.players[0].hand.find(c=>c.cardId===id).uid;
  s=kmr(s,a=>a.mode==='same'&&a.uid===uid);
 }
 return s;
}

test('KMR-1-026 and 046 bounce another energy 1 character, or themselves',()=>{
 let s=open(['KMR-1-026','KMR-1-040','KMR-1-027'],26026);
 line(s,0,['KMR-1-027']);
 const low=put(s,0,'KMR-1-040','front',1,true);
 const rider=take(s,0,'KMR-1-026');
 onlyHand(s,0,[rider]);
 ready(s);
 s=play(s,rider.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 const choices=s.pending.choices;
 assert.equal(choices.includes(low.uid),true);
 assert.equal(choices.includes(rider.uid),false);
 assert.equal(choices.includes(s.players[0].energy[0].uid),false);
 s=use(s,a=>a.type==='chooseOwnBounce'&&a.uid===low.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===rider.uid),true);
 let alone=open(['KMR-1-046','KMR-1-036'],26046);
 line(alone,0,['KMR-1-036']);
 const birth=take(alone,0,'KMR-1-046');
 onlyHand(alone,0,[birth]);
 ready(alone);
 alone=play(alone,birth.uid);
 assert.equal(alone.pending,null);
 assert.equal(alone.players[0].hand.some(c=>c.uid===birth.uid),true);
 assert.equal(alone.players[0].front.some(c=>c?.uid===birth.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('KMR-1-027 pays a hand card for BP and looks at the top in private',()=>{
 let s=open(['KMR-1-027','KMR-1-040','KMR-1-026','KMR-1-036'],26027);
 const rider=put(s,0,'KMR-1-027','front',0,false);
 const cost=take(s,0,'KMR-1-040');
 const secret=take(s,0,'KMR-1-026');
 s.players[0].deck.unshift(secret);
 onlyHand(s,0,[cost]);
 ready(s);
 assert.equal(activates(s,rider.uid),true);
 s=act(s,rider.uid,'kmr:KMR-1-027:a');
 assert.equal(s.pending.step,'discard');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===cost.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===cost.uid),true);
 const paid=s.players[0].front.find(c=>c?.uid===rider.uid);
 assert.equal(paid.ready,false);
 assert.equal(universalBp(packs,s,paid),4000);
 assert.equal(activates(s,rider.uid),true);
 const reveals=s.publicReveals.length;
 s=act(s,rider.uid,'kmr:KMR-1-027:b');
 assert.equal(s.pending.step,'topPlace');
 assert.deepEqual(s.pending.data.uids,[secret.uid]);
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,1);
 assert.equal(universalPrivateChoices(packs,s,0).inspected[0].cardId,'KMR-1-026');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=kmr(s,a=>a.mode==='outside');
 assert.equal(s.players[0].outside.some(c=>c.uid===secret.uid),true);
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='kmr:KMR-1-027:b'),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='kmr:KMR-1-027:a'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-028 looks at four cards and its main retires itself before the deck top',()=>{
 let s=open(['KMR-1-028','KMR-1-013','KMR-1-039','KMR-1-040','KMR-1-046','KMR-1-036','KMR-1-045',...YELLOW.slice(0,3)],26028);
 line(s,0,YELLOW.slice(0,3));
 const field=take(s,0,'KMR-1-028');
 const hit=take(s,0,'KMR-1-013');
 const rest=[take(s,0,'KMR-1-040'),take(s,0,'KMR-1-046'),take(s,0,'KMR-1-036')];
 const pay=take(s,0,'KMR-1-045');
 s.players[0].deck.unshift(hit,...rest);
 onlyHand(s,0,[field,pay]);
 ready(s);
 s=play(s,field.uid,'energy');
 assert.equal(s.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,4);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').length,1);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=kmr(s,a=>a.mode==='take'&&a.uid===hit.uid);
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.mode==='next'&&a.uid===s.pending.data.left[0]);
 assert.equal(s.pending.step,'discard');
 s=kmr(s,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===hit.uid),true);
 assert.equal(s.players[0].deck.at(-1).uid,rest[2].uid);
 const body=s.players[0].energy.find(c=>c?.uid===field.uid);
 body.ready=true;
 const raid=take(s,0,'KMR-1-039');
 s.players[0].outside.push(raid);
 s=act(s,body.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===field.uid),true);
 assert.equal(s.pending.step,'outToTop');
 s=kmr(s,a=>a.mode==='outToTop'&&a.uid===raid.uid);
 assert.equal(s.players[0].deck[0].uid,raid.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-029 looks after retiring itself, then can return rested from outside',()=>{
 let s=open(['KMR-1-029','KMR-1-026','KMR-1-040','KMR-1-045','KMR-1-036',...YELLOW.slice(0,3)],26029);
 line(s,0,YELLOW.slice(0,3));
 const satellite=put(s,0,'KMR-1-029','energy',3,true);
 const hit=take(s,0,'KMR-1-026');
 const rest=[take(s,0,'KMR-1-040'),take(s,0,'KMR-1-045'),take(s,0,'KMR-1-036')];
 s.players[0].deck.unshift(hit,...rest);
 ready(s);
 const before=apReady(s);
 s=act(s,satellite.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===satellite.uid),true);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(s.pending.data.uids.length,4);
 assert.equal(s.pending.actions.some(a=>a.mode==='take'&&a.uid===hit.uid),true);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=kmr(s,a=>a.mode==='done');
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.mode==='next'&&a.uid===s.pending.data.left[0]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===hit.uid),false);
 s=act(s,satellite.uid,'kmr:KMR-1-029:out');
 assert.equal(apReady(s),before-1);
 assert.equal(s.pending.step,'enter');
 const entry=s.pending.actions.find(a=>a.mode==='enter'&&a.line==='energy');
 assert.equal(entry.ready,false);
 s=kmr(s,a=>a.mode==='enter'&&a.slot===entry.slot);
 const entered=s.players[0].energy.find(c=>c?.uid===satellite.uid);
 assert.equal(entered.ready,false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-030 takes one Zi-O character and one non-yellow raid from seven',()=>{
 let s=open(['KMR-1-030','KMR-1-013','KMR-1-039','KMR-1-040','KMR-1-045','KMR-1-046','KMR-1-036','KMR-1-026',...YELLOW.slice(0,3)],26030);
 line(s,0,YELLOW.slice(0,3));
 const event=take(s,0,'KMR-1-030');
 const zio=take(s,0,'KMR-1-013');
 const raid=take(s,0,'KMR-1-039');
 const fillers=[take(s,0,'KMR-1-040'),take(s,0,'KMR-1-045'),take(s,0,'KMR-1-046'),
  take(s,0,'KMR-1-036'),take(s,0,'KMR-1-026')];
 s.players[0].deck.unshift(zio,raid,...fillers);
 onlyHand(s,0,[event]);
 ready(s);
 const reveals=s.publicReveals.length;
 s=use(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.step,'lookPick');
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,7);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').length,2);
 s=kmr(s,a=>a.mode==='take'&&a.uid===zio.uid);
 s=kmr(s,a=>a.mode==='take'&&a.uid===raid.uid);
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.mode==='next'&&a.uid===s.pending.data.left[0]);
 assert.equal(s.players[0].hand.filter(c=>c.uid===zio.uid||c.uid===raid.uid).length,2);
 assert.equal(s.players[0].deck.at(-1).uid,fillers[4].uid);
 const added=s.publicReveals.slice(reveals).map(e=>e.cardId).sort();
 assert.deepEqual(added,['KMR-1-013','KMR-1-039']);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-031 widens the retire cap only while Zi-O is on the field',()=>{
 let s=open(['KMR-1-031','KMR-1-026','KMR-1-004','KMR-1-013',...YELLOW],26031);
 line(s,0,YELLOW);
 const event=take(s,0,'KMR-1-031');
 const low=put(s,1,'KMR-1-026','front',0,true);
 const high=put(s,1,'KMR-1-004','front',1,true);
 onlyHand(s,0,[event]);
 ready(s);
 s=use(s,a=>a.type==='event'&&a.uid===event.uid);
 const listed=s.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.deepEqual(listed,[low.uid]);
 s=kmr(s,a=>a.mode==='retire'&&a.uid===low.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[1].outside.some(c=>c.uid===low.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===high.uid),true);
 let wide=open(['KMR-1-031','KMR-1-013','KMR-1-004',...YELLOW],26131);
 line(wide,0,YELLOW);
 const again=take(wide,0,'KMR-1-031');
 put(wide,0,'KMR-1-013','front',0,true);
 const big=put(wide,1,'KMR-1-004','front',0,true);
 onlyHand(wide,0,[again]);
 ready(wide);
 wide.kmrRaidToHand={[0]:wide.turn};
 wide=use(wide,a=>a.type==='event'&&a.uid===again.uid);
 assert.equal(wide.pending.actions.some(a=>a.mode==='retire'&&a.uid===big.uid),true);
 wide=kmr(wide,a=>a.mode==='retire'&&a.uid===big.uid);
 assert.equal(wide.pending.step,'own');
 assert.equal(wide.pending.actions.some(a=>a.mode==='skip'),true);
 wide=kmr(wide,a=>a.mode==='skip');
 assert.equal(wide.pending,null);
 let empty=open(['KMR-1-031','KMR-1-004','KMR-1-040',...YELLOW],26231);
 line(empty,0,YELLOW);
 const third=take(empty,0,'KMR-1-031');
 const wall=put(empty,1,'KMR-1-004','front',0,true);
 const ally=put(empty,0,'KMR-1-040','front',0,true);
 onlyHand(empty,0,[third]);
 ready(empty);
 empty.kmrRaidToHand={[0]:empty.turn};
 empty=use(empty,a=>a.type==='event'&&a.uid===third.uid);
 assert.equal(empty.pending.step,'own');
 empty=kmr(empty,a=>a.mode==='own'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,empty,empty.players[0].front.find(c=>c?.uid===ally.uid)),2500);
 assert.equal(empty.players[1].front.some(c=>c?.uid===wall.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,wide),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

test('KMR-1-032 recovers up to two rested AP cards',()=>{
 let s=open(['KMR-1-032',...YELLOW.slice(0,3)],26032);
 line(s,0,YELLOW.slice(0,3));
 const event=take(s,0,'KMR-1-032');
 onlyHand(s,0,[event]);
 ready(s);
 const rested=s.players[0].apCards.slice(0,2);
 for(const ap of rested)ap.ready=false;
 const awake=s.players[0].apCards.find(c=>c.ready);
 s=use(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 const choices=legalUniversalActions(packs,s);
 const readyNow=new Set(s.players[0].apCards.filter(c=>c.ready).map(c=>c.uid));
 assert.equal(choices.some(a=>a.type==='chooseApRecovery'&&a.uid==null),true);
 assert.equal(choices.filter(a=>a.type==='chooseApRecovery'&&a.uid).every(a=>!readyNow.has(a.uid)),true);
 assert.ok(awake);
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid===rested[0].uid);
 s=use(s,a=>a.type==='chooseApRecovery'&&a.uid==null);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested[0].uid).ready,true);
 assert.equal(s.players[0].apCards.find(c=>c.uid===rested[1].uid).ready,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-033 keeps the BP 5000 ceiling when Zero-One changes the result',()=>{
 const safeYellow=['KMR-1-027','KMR-1-103','KMR-1-003','KMR-1-011'];
 let s=open(withCopies(['KMR-1-033','KMR-1-004','KMR-1-006',...safeYellow],{'KMR-1-004':2}),26033);
 line(s,0,safeYellow);
 const event=take(s,0,'KMR-1-033');
 const low=put(s,1,'KMR-1-006','front',0,true);
 const cap=put(s,1,'KMR-1-004','front',1,true);
 const over=put(s,1,'KMR-1-004','front',2,true);
 over.buffs=[{bp:1000,untilTurn:s.turn}];
 onlyHand(s,0,[event]);
 ready(s);
 s=use(s,a=>a.type==='event'&&a.uid===event.uid);
 const listed=s.pending.actions.map(a=>a.uid);
 assert.equal(listed.includes(low.uid),true);
 assert.equal(listed.includes(cap.uid),true);
 assert.equal(listed.includes(over.uid),false);
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),false);
 s=kmr(s,a=>a.mode==='rest'&&a.uid===low.uid);
 assert.equal(s.players[1].front.find(c=>c?.uid===low.uid).ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===low.uid),true);
 assert.equal(s.players[1].front.some(c=>c?.uid===low.uid),true);
 let raid=open(['KMR-1-033','KMR-1-022','KMR-1-006','KMR-1-004',...safeYellow],26133);
 line(raid,0,safeYellow);
 const card=take(raid,0,'KMR-1-033');
 put(raid,0,'KMR-1-022','front',0,true);
 const victim=put(raid,1,'KMR-1-006','front',0,true);
 const huge=put(raid,1,'KMR-1-004','front',1,true);
 huge.buffs=[{bp:1000,untilTurn:raid.turn}];
 onlyHand(raid,0,[card]);
 ready(raid);
 raid=use(raid,a=>a.type==='event'&&a.uid===card.uid);
 const retire=raid.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.deepEqual(retire,[victim.uid]);
 raid=kmr(raid,a=>a.mode==='retire'&&a.uid===victim.uid);
 assert.equal(raid.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(raid.players[1].front.some(c=>c?.uid===huge.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,raid),true);
});

test('KMR-1-034 discards three cards of one energy cost, then may summon OOO rested',()=>{
 let s=open(withCopies(['KMR-1-034','KMR-1-026','KMR-1-037','KMR-1-045',...BLUE.slice(0,2)],{'KMR-1-026':3}),26034);
 line(s,0,BLUE.slice(0,2));
 const rider=put(s,0,'KMR-1-034','front',0,true);
 const costs=[take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026')];
 const summon=take(s,0,'KMR-1-037');
 const other=take(s,0,'KMR-1-045');
 onlyHand(s,0,[...costs,summon,other]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=act(s,rider.uid);
 assert.equal(s.pending.actions.some(a=>a.uid===other.uid),false);
 assert.equal(s.pending.actions.filter(a=>a.mode==='same').length,4);
 s=sameThree(s,['KMR-1-026','KMR-1-026','KMR-1-026']);
 assert.equal(s.pending.step,'enter');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 const entry=s.pending.actions.find(a=>a.uid===summon.uid);
 assert.equal(entry.ready,false);
 assert.equal(s.players[0].deck.length,deck);
 s=kmr(s,a=>a.mode==='skip');
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].deck.length,deck-3);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-035 rests one opponent and does not skip its next active',()=>{
 let s=open(withCopies(['KMR-1-035','KMR-1-026','KMR-1-040',...BLUE.slice(0,2)],{'KMR-1-026':3}),26035);
 line(s,0,BLUE.slice(0,2));
 const rider=put(s,0,'KMR-1-035','front',0,true);
 const foe=put(s,1,'KMR-1-040','front',0,true);
 onlyHand(s,0,[take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026')]);
 ready(s);
 s=act(s,rider.uid);
 s=sameThree(s,['KMR-1-026','KMR-1-026','KMR-1-026']);
 assert.equal(s.pending.step,'restOnly');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 s=kmr(s,a=>a.mode==='rest'&&a.uid===foe.uid);
 assert.equal(s.players[1].front.find(c=>c?.uid===foe.uid).ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'),false);
 let skipped=open(withCopies(['KMR-1-035','KMR-1-026','KMR-1-040',...BLUE.slice(0,2)],{'KMR-1-026':3}),26135);
 line(skipped,0,BLUE.slice(0,2));
 const body=put(skipped,0,'KMR-1-035','front',0,true);
 put(skipped,1,'KMR-1-040','front',0,true);
 onlyHand(skipped,0,[take(skipped,0,'KMR-1-026'),take(skipped,0,'KMR-1-026'),take(skipped,0,'KMR-1-026')]);
 ready(skipped);
 const deck=skipped.players[0].deck.length;
 skipped=act(skipped,body.uid);
 skipped=sameThree(skipped,['KMR-1-026','KMR-1-026','KMR-1-026']);
 skipped=kmr(skipped,a=>a.mode==='skip');
 skipped=dispatchUniversalAction(packs,skipped,{type:'next'});
 assert.equal(skipped.players[0].deck.length,deck-3);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('KMR-1-036 is not blocked by BP 4000 or higher after its main',()=>{
 let s=open(withCopies(['KMR-1-036','KMR-1-026','KMR-1-039','KMR-1-040','KMR-1-046','KMR-1-050'],{'KMR-1-026':3}),26036);
 line(s,0,['KMR-1-046','KMR-1-050']);
 const rider=put(s,0,'KMR-1-036','front',0,true);
 onlyHand(s,0,[take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026')]);
 ready(s);
 s=act(s,rider.uid);
 s=sameThree(s,['KMR-1-026','KMR-1-026','KMR-1-026']);
 assert.equal(s.players[0].front.find(c=>c?.uid===rider.uid).blockAtLeastGranted.bp,4000);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const wall=put(s,1,'KMR-1-039','front',0,true);
 const small=put(s,1,'KMR-1-040','front',1,true);
 s=use(s,a=>a.type==='attack'&&a.uid===rider.uid);
 const blocks=legalUniversalActions(packs,s).filter(a=>a.type==='chooseBlock'&&a.uid);
 assert.equal(blocks.some(a=>a.uid===wall.uid),false);
 assert.equal(blocks.some(a=>a.uid===small.uid),true);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid===small.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-037 looks at three cards for OOO, a Core Medal, or a Cell Medal',()=>{
 let s=open(['KMR-1-037','KMR-1-065','KMR-1-063','KMR-1-040','KMR-1-045','KMR-1-036'],26037);
 line(s,0,['KMR-1-036']);
 const rider=take(s,0,'KMR-1-037');
 const medal=take(s,0,'KMR-1-065');
 const core=take(s,0,'KMR-1-063');
 const miss=take(s,0,'KMR-1-045');
 const pay=take(s,0,'KMR-1-040');
 s.players[0].deck.unshift(medal,core,miss);
 onlyHand(s,0,[rider,pay]);
 ready(s);
 s=play(s,rider.uid);
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,3);
 const takes=s.pending.actions.filter(a=>a.mode==='take').map(a=>a.uid);
 assert.equal(takes.includes(medal.uid),true);
 assert.equal(takes.includes(core.uid),true);
 assert.equal(takes.includes(miss.uid),false);
 s=kmr(s,a=>a.mode==='take'&&a.uid===medal.uid);
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.mode==='next'&&a.uid===s.pending.data.left[0]);
 s=kmr(s,a=>a.mode==='discard'&&a.uid===pay.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===medal.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-038 gains BP only on its controller turn, and silence removes it',()=>{
 let s=open(['KMR-1-038'],26038);
 const rider=put(s,0,'KMR-1-038','front',0,true);
 ready(s);
 assert.equal(universalBp(packs,s,rider),3500);
 s.active=1;
 assert.equal(universalBp(packs,s,rider),2500);
 s.active=0;
 silence(s,rider,1);
 assert.equal(universalBp(packs,s,rider),2500);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-039 removes Ankh, may draw, and deals 2 only while raided with seven cards',()=>{
 let ordinary=open(['KMR-1-039','KMR-1-062','KMR-1-040',...BLUE],26039);
 line(ordinary,0,BLUE);
 const plain=take(ordinary,0,'KMR-1-039');
 const ankh=take(ordinary,0,'KMR-1-062');
 onlyHand(ordinary,0,[plain,ankh]);
 ready(ordinary);
 ordinary=play(ordinary,plain.uid);
 assert.equal(ordinary.pending,null);
 assert.equal(ordinary.players[0].hand.some(c=>c.uid===ankh.uid),true);
 assert.equal(activates(ordinary,plain.uid),false);
 let s=open(['KMR-1-039','KMR-1-062','KMR-1-040',...BLUE],26139);
 line(s,0,BLUE);
 const base=put(s,0,'KMR-1-040','front',0,true);
 const rider=take(s,0,'KMR-1-039');
 const handAnkh=take(s,0,'KMR-1-062');
 onlyHand(s,0,[rider,handAnkh]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=raidOnto(s,rider.uid,base.uid);
 assert.equal(s.pending.step,'removeAnkh');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 s=kmr(s,a=>a.mode==='remove'&&a.uid===handAnkh.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===handAnkh.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===handAnkh.uid),false);
 assert.equal(s.pending.step,'ankhDraw');
 s=kmr(s,a=>a.mode==='skip');
 const body=s.players[0].front.find(c=>c?.uid===rider.uid);
 assert.equal(universalBp(packs,s,body),5000);
 assert.equal(universalImpact(pack,s,body),1);
 assert.equal(s.players[0].deck.length,deck);
 while(s.players[0].hand.length<7)s.players[0].hand.push(s.players[0].deck.shift());
 assert.equal(universalAttackDamage(packs,s,body),2);
 s.players[0].deck.push(s.players[0].hand.pop());
 assert.equal(universalAttackDamage(packs,s,body),1);
 silence(s,body,1);
 while(s.players[0].hand.length<7)s.players[0].hand.push(s.players[0].deck.shift());
 assert.equal(universalAttackDamage(packs,s,body),1);
 assert.equal(assertUniversalMatch(packs,ordinary),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-040 shows the whole window and discards only Ankh or energy 1',()=>{
 let s=open(['KMR-1-040','KMR-1-062','KMR-1-044','KMR-1-037','KMR-1-045','KMR-1-036','KMR-1-046','KMR-1-026','KMR-1-038','KMR-1-047'],26040);
 const rider=take(s,0,'KMR-1-040');
 const ankh=take(s,0,'KMR-1-062');
 const fillers=[take(s,0,'KMR-1-045'),take(s,0,'KMR-1-036'),take(s,0,'KMR-1-046'),
  take(s,0,'KMR-1-026'),take(s,0,'KMR-1-038'),take(s,0,'KMR-1-047')];
 const expensive=take(s,0,'KMR-1-044');
 const cheap=take(s,0,'KMR-1-037');
 s.players[0].deck.unshift(ankh,...fillers);
 onlyHand(s,0,[rider,expensive,cheap]);
 ready(s);
 const reveals=s.publicReveals.length;
 s=play(s,rider.uid);
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,7);
 assert.equal(s.pending.actions.filter(a=>a.mode==='take').length,1);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=kmr(s,a=>a.mode==='take'&&a.uid===ankh.uid);
 while(s.pending?.step==='lookOrder')s=kmr(s,a=>a.mode==='next'&&a.uid===s.pending.data.left[0]);
 assert.equal(s.pending.step,'namedDiscard');
 const discard=s.pending.actions.map(a=>a.uid);
 assert.equal(discard.includes(ankh.uid),true);
 assert.equal(discard.includes(cheap.uid),true);
 assert.equal(discard.includes(expensive.uid),false);
 s=kmr(s,a=>a.mode==='namedDiscard'&&a.uid===cheap.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===cheap.uid),true);
 assert.equal(s.players[0].hand.some(c=>c.uid===ankh.uid),true);
 assert.deepEqual(s.publicReveals.slice(reveals).map(e=>e.cardId),['KMR-1-062']);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-041 on-play bottoms a life even without an opponent, and only while raided',()=>{
 let plain=open(['KMR-1-041','KMR-1-040',...BLUE],26041);
 line(plain,0,BLUE);
 const ordinary=take(plain,0,'KMR-1-041');
 onlyHand(plain,0,[ordinary]);
 ready(plain);
 const lives=plain.players[0].life.length;
 plain=play(plain,ordinary.uid);
 assert.equal(plain.pending,null);
 assert.equal(plain.players[0].life.length,lives);
 let s=open(['KMR-1-041','KMR-1-040','KMR-1-004',...BLUE],26141);
 line(s,0,BLUE);
 const base=put(s,0,'KMR-1-040','front',0,true);
 const huge=put(s,1,'KMR-1-004','front',0,true);
 const rider=take(s,0,'KMR-1-041');
 onlyHand(s,0,[rider]);
 ready(s);
 s=raidOnto(s,rider.uid,base.uid);
 assert.equal(s.pending.step,'lifeBottom');
 assert.equal(s.pending.actions.some(a=>a.uid===huge.uid),false);
 const life=s.pending.actions[0].uid;
 const before=s.players[0].life.length;
 s=kmr(s,a=>a.mode==='life'&&a.uid===life);
 assert.equal(s.players[0].life.length,before-1);
 assert.equal(s.players[0].deck.at(-1).uid,life);
 assert.equal(s.players[1].front.some(c=>c?.uid===huge.uid),true);
 let skipped=open(['KMR-1-041','KMR-1-040','KMR-1-026',...BLUE],26241);
 line(skipped,0,BLUE);
 const base2=put(skipped,0,'KMR-1-040','front',0,true);
 const low=put(skipped,1,'KMR-1-026','front',0,true);
 const body=take(skipped,0,'KMR-1-041');
 onlyHand(skipped,0,[body]);
 ready(skipped);
 skipped=raidOnto(skipped,body.uid,base2.uid);
 assert.equal(skipped.pending.step,'deckBottom');
 assert.equal(skipped.pending.actions.some(a=>a.mode==='skip'),true);
 skipped=kmr(skipped,a=>a.mode==='skip');
 assert.equal(skipped.players[1].front.some(c=>c?.uid===low.uid),true);
 assert.equal(skipped.pending.step,'lifeBottom');
 const life2=skipped.pending.actions[0].uid;
 skipped=kmr(skipped,a=>a.mode==='life'&&a.uid===life2);
 assert.equal(skipped.players[0].deck.at(-1).uid,life2);
 assert.equal(assertUniversalMatch(packs,plain),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,skipped),true);
});

test('KMR-1-042 gains BP on its own turn and actives itself after the discard',()=>{
 let s=open(withCopies(['KMR-1-042','KMR-1-026',...BLUE.slice(0,2)],{'KMR-1-026':3}),26042);
 line(s,0,BLUE.slice(0,2));
 const rider=put(s,0,'KMR-1-042','front',0,false);
 onlyHand(s,0,[take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026'),take(s,0,'KMR-1-026')]);
 ready(s);
 assert.equal(universalBp(packs,s,rider),4000);
 s.active=1;
 assert.equal(universalBp(packs,s,rider),2500);
 s.active=0;
 const deck=s.players[0].deck.length;
 s=act(s,rider.uid);
 s=sameThree(s,['KMR-1-026','KMR-1-026','KMR-1-026']);
 assert.equal(s.players[0].front.find(c=>c?.uid===rider.uid).ready,true);
 assert.equal(s.players[0].deck.length,deck);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].deck.length,deck-3);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-043 reduces its hand cost by 2 only while the field is empty',()=>{
 let s=open(['KMR-1-043','KMR-1-040'],26043);
 const def=pack.cards['KMR-1-043'];
 ready(s);
 s.players[0].front.fill(null);
 s.players[0].energy.fill(null);
 assert.equal(zoneRequiredEnergy(pack,s,0,def,'hand'),0);
 put(s,0,'KMR-1-040','energy',0,true);
 assert.equal(zoneRequiredEnergy(pack,s,0,def,'hand'),2);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-044 returns only itself when every remaining card is blue',()=>{
 let s=toAttack(open(['KMR-1-044','KMR-1-043','KMR-1-046','KMR-1-039'],26044));
 const attacker=put(s,0,'KMR-1-039','front',0,true);
 const base=take(s,1,'KMR-1-043');
 const rider=put(s,1,'KMR-1-044','front',0,true);
 rider.stack=[base];
 const other=put(s,1,'KMR-1-046','front',1,true);
 s=use(s,a=>a.type==='attack'&&a.uid===attacker.uid);
 s=use(s,a=>a.type==='chooseBlock'&&a.uid===rider.uid);
 assert.equal(s.players[1].hand.some(c=>c.uid===rider.uid),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===base.uid),true);
 assert.equal(s.players[1].hand.some(c=>c.uid===base.uid),false);
 assert.equal(s.players[1].front.some(c=>c?.uid===other.uid),true);
 let yellow=toAttack(open(['KMR-1-044','KMR-1-043','KMR-1-026','KMR-1-039'],26144));
 const poke=put(yellow,0,'KMR-1-039','front',0,true);
 const base2=take(yellow,1,'KMR-1-043');
 const body=put(yellow,1,'KMR-1-044','front',0,true);
 body.stack=[base2];
 put(yellow,1,'KMR-1-026','front',1,true);
 yellow=use(yellow,a=>a.type==='attack'&&a.uid===poke.uid);
 yellow=use(yellow,a=>a.type==='chooseBlock'&&a.uid===body.uid);
 assert.equal(yellow.players[1].outside.some(c=>c.uid===body.uid),true);
 assert.equal(yellow.players[1].hand.some(c=>c.uid===body.uid),false);
 let alone=toAttack(open(['KMR-1-044','KMR-1-039'],26244));
 const big=put(alone,0,'KMR-1-039','front',0,true);
 const solo=put(alone,1,'KMR-1-044','front',0,true);
 alone=use(alone,a=>a.type==='attack'&&a.uid===big.uid);
 alone=use(alone,a=>a.type==='chooseBlock'&&a.uid===solo.uid);
 assert.equal(alone.players[1].outside.some(c=>c.uid===solo.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,yellow),true);
 assert.equal(assertUniversalMatch(packs,alone),true);
});

test('KMR-1-044 main removes a Zombie Gamer only while raided',()=>{
 let s=open(withCopies(['KMR-1-044','KMR-1-043','KMR-1-040','KMR-1-026',...BLUE],{'KMR-1-044':2}),26344);
 line(s,0,BLUE);
 const base=put(s,0,'KMR-1-043','front',0,true);
 const rider=take(s,0,'KMR-1-044');
 const zombie=take(s,0,'KMR-1-044');
 const victim=put(s,1,'KMR-1-040','front',0,true);
 s.players[0].outside.push(zombie);
 onlyHand(s,0,[rider,take(s,0,'KMR-1-026')]);
 ready(s);
 s=raidOnto(s,rider.uid,base.uid);
 s=kmr(s,a=>a.mode==='discard');
 const body=s.players[0].front.find(c=>c?.uid===rider.uid);
 assert.equal(activates(s,body.uid),true);
 s=act(s,body.uid);
 s=kmr(s,a=>a.mode==='zombieRemove'&&a.uid===zombie.uid);
 assert.equal(s.players[0].removed.some(c=>c.uid===zombie.uid),true);
 assert.equal(s.pending.step,'retire');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 s=kmr(s,a=>a.mode==='retire'&&a.uid===victim.uid);
 assert.equal(s.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(activates(s,body.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-045 rests, buffs another character, and returns itself',()=>{
 let s=open(['KMR-1-045','KMR-1-040'],26045);
 const rider=put(s,0,'KMR-1-045','front',0,true);
 ready(s);
 assert.equal(activates(s,rider.uid),false);
 const ally=put(s,0,'KMR-1-040','front',1,true);
 s=act(s,rider.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===rider.uid).ready,false);
 s=kmr(s,a=>a.mode==='own'&&a.uid===ally.uid);
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c?.uid===ally.uid)),2500);
 assert.equal(s.players[0].hand.some(c=>c.uid===rider.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-047 reduces the next Cell Medal by 1 AP once',()=>{
 let s=open(withCopies(['KMR-1-047','KMR-1-065'],{'KMR-1-065':2}),26047);
 const rider=put(s,0,'KMR-1-047','front',0,true);
 const first=take(s,0,'KMR-1-065');
 const second=take(s,0,'KMR-1-065');
 onlyHand(s,0,[first,second]);
 ready(s);
 const before=apReady(s);
 s=act(s,rider.uid);
 s=use(s,a=>a.type==='event'&&a.uid===first.uid);
 assert.equal(apReady(s),before);
 s=finishKmr(s);
 s=use(s,a=>a.type==='event'&&a.uid===second.uid);
 assert.equal(apReady(s),before-1);
 assert.equal(activates(s,rider.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-048 tucks one other Ex-Aid of energy 1 and draws when that happens',()=>{
 let s=open(['KMR-1-048','KMR-1-049','KMR-1-036'],26048);
 line(s,0,['KMR-1-036']);
 const other=put(s,0,'KMR-1-049','front',1,true);
 const rider=take(s,0,'KMR-1-048');
 onlyHand(s,0,[rider]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=play(s,rider.uid);
 assert.equal(s.pending.step,'tuck');
 assert.equal(s.pending.actions.some(a=>a.mode==='skip'),true);
 assert.equal(s.pending.actions.some(a=>a.uid===other.uid),true);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].front.some(c=>c?.uid===other.uid),true);
 let paid=open(['KMR-1-048','KMR-1-049','KMR-1-036','KMR-1-040'],26148);
 line(paid,0,['KMR-1-036']);
 const target=put(paid,0,'KMR-1-049','front',1,true);
 const body=take(paid,0,'KMR-1-048');
 onlyHand(paid,0,[body]);
 ready(paid);
 const left=paid.players[0].deck.length;
 paid=play(paid,body.uid);
 paid=kmr(paid,a=>a.mode==='tuck'&&a.uid===target.uid);
 const host=paid.players[0].front.find(c=>c?.uid===body.uid);
 assert.equal(host.under.some(c=>c.uid===target.uid&&c.faceDown),true);
 assert.equal(paid.players[0].deck.length,left-1);
 host.under.push(Object.assign(take(paid,0,'KMR-1-040'),{faceDown:true,ready:false,fieldEntryStamp:null}));
 const slot=paid.players[0].front.findIndex(c=>c?.uid===host.uid);
 paid.players[0].front[slot]=null;
 paid.players[0].energy[1]=host;
 assert.equal(universalCardEnergy(pack,paid,0,host),2);
 assert.equal(universalEnergyByColor(pack,paid,0).blue>=2,true);
 paid.players[0].energy[1]=null;
 paid.players[0].front[0]=host;
 assert.equal(universalCardEnergy(pack,paid,0,host),0);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
});

test('KMR-1-049 rests for blue energy and retires at the end of the main',()=>{
 let s=open(withCopies(['KMR-1-049'],{'KMR-1-049':2}),26049);
 const rider=put(s,0,'KMR-1-049','energy',0,true);
 const front=put(s,0,'KMR-1-049','front',0,true);
 ready(s);
 s=act(s,rider.uid,'selfRestEnergyRetire');
 const rested=s.players[0].energy.find(c=>c?.uid===rider.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalCardEnergy(pack,s,0,rested),2);
 assert.equal(universalEnergyByColor(pack,s,0).blue,2);
 rested.ready=true;
 assert.equal(activates(s,rider.uid),false);
 s=act(s,front.uid,'selfRestEnergyRetire');
 assert.equal(universalCardEnergy(pack,s,0,front),0);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].outside.some(c=>c.uid===rider.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===front.uid),true);
 assert.equal(s.kmrRetireBy==null,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('KMR-1-050 tucks, draws, then summons another Ex-Aid rested without its on-play',()=>{
 let s=open(['KMR-1-050','KMR-1-049','KMR-1-048','KMR-1-036','KMR-1-046'],26050);
 line(s,0,['KMR-1-036','KMR-1-046']);
 const target=put(s,0,'KMR-1-049','front',1,true);
 const summon=take(s,0,'KMR-1-048');
 const rider=take(s,0,'KMR-1-050');
 onlyHand(s,0,[rider,summon]);
 ready(s);
 const deck=s.players[0].deck.length;
 s=play(s,rider.uid);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck);
 assert.equal(s.players[0].front.some(c=>c?.uid===target.uid),true);
 let paid=open(['KMR-1-050','KMR-1-049','KMR-1-048','KMR-1-036','KMR-1-046'],26150);
 line(paid,0,['KMR-1-036','KMR-1-046']);
 const tucked=put(paid,0,'KMR-1-049','front',1,true);
 const later=take(paid,0,'KMR-1-048');
 const body=take(paid,0,'KMR-1-050');
 onlyHand(paid,0,[body,later]);
 ready(paid);
 const left=paid.players[0].deck.length;
 paid=play(paid,body.uid);
 paid=kmr(paid,a=>a.mode==='tuck'&&a.uid===tucked.uid);
 assert.equal(paid.players[0].deck.length,left-1);
 assert.equal(paid.pending.step,'enter');
 const entry=paid.pending.actions.find(a=>a.uid===later.uid&&a.mode==='enter');
 assert.equal(entry.ready,false);
 paid=kmr(paid,a=>a.mode==='enter'&&a.uid===later.uid&&a.slot===entry.slot);
 const summoned=paid.players[0].front.find(c=>c?.uid===later.uid)||
  paid.players[0].energy.find(c=>c?.uid===later.uid);
 assert.equal(summoned.ready,false);
 assert.equal(paid.pending,null);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,paid),true);
});

test('life triggers of KMR-1-026 through 050 resolve on the revealed card',()=>{
 const none=['KMR-1-026','KMR-1-027','KMR-1-029','KMR-1-034','KMR-1-040','KMR-1-046','KMR-1-049'];
 const draws=['KMR-1-036','KMR-1-042','KMR-1-045','KMR-1-048'];
 const gets=['KMR-1-028'];
 const actives=['KMR-1-030','KMR-1-035','KMR-1-038','KMR-1-043','KMR-1-047'];
 for(const id of none){
  let s=toAttack(open([id,'KMR-1-006'],3000+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending,null,id);
  assert.equal(s.players[1].outside.some(c=>c.uid===trigger.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of draws){
  let s=toAttack(open([id,'KMR-1-006'],3100+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  const hand=s.players[1].hand.length;
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='draw');
  assert.equal(s.players[1].hand.length,hand+1,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of gets){
  let s=toAttack(open([id,'KMR-1-006'],3200+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='get');
  assert.equal(s.players[1].hand.some(c=>c.uid===trigger.uid),true);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of actives){
  let s=toAttack(open([id,'KMR-1-006','KMR-1-010'],3300+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const ally=put(s,1,'KMR-1-010','front',0,false);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='active'&&a.uid===ally.uid);
  assert.equal(s.players[1].front.find(c=>c?.uid===ally.uid).ready,true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 for(const id of ['KMR-1-037','KMR-1-050']){
  let s=toAttack(open([id,'KMR-1-006','KMR-1-039'],3400+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const tall=put(s,0,'KMR-1-039','front',1,true);
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  const bounce=legalUniversalActions(packs,s).filter(a=>a.mode==='colorBounce');
  assert.equal(bounce.some(a=>a.uid===poke.uid),true,id);
  assert.equal(bounce.some(a=>a.uid===tall.uid),false,id);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='colorBounce'&&a.uid===poke.uid);
  assert.equal(s.players[0].hand.some(c=>c.uid===poke.uid),true,id);
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 let special=toAttack(open(['KMR-1-031','KMR-1-006'],35031));
 const small=put(special,0,'KMR-1-006','front',0,true);
 const card=take(special,1,'KMR-1-031');
 const buried=special.players[1].life[0];
 special.players[1].life[0]=card;special.players[1].deck.push(buried);
 special=use(special,a=>a.type==='attack'&&a.uid===small.uid);
 special=use(special,a=>a.type==='chooseBlock'&&a.uid==null);
 special=use(special,a=>a.type==='chooseTrigger'&&a.mode==='special');
 assert.equal(special.pending.actions.some(a=>a.mode==='retire'&&a.uid===small.uid),true);
 special=kmr(special,a=>a.mode==='retire'&&a.uid===small.uid);
 assert.equal(special.players[0].outside.some(c=>c.uid===small.uid),true);
 let restLife=toAttack(open(['KMR-1-033','KMR-1-006'],35033));
 const poked=put(restLife,0,'KMR-1-006','front',0,true);
 const event=take(restLife,1,'KMR-1-033');
 const hidden=restLife.players[1].life[0];
 restLife.players[1].life[0]=event;restLife.players[1].deck.push(hidden);
 restLife=use(restLife,a=>a.type==='attack'&&a.uid===poked.uid);
 restLife=use(restLife,a=>a.type==='chooseBlock'&&a.uid==null);
 restLife=use(restLife,a=>a.type==='chooseTrigger'&&a.mode==='special');
 restLife=kmr(restLife,a=>a.mode==='rest'&&a.uid===poked.uid);
 assert.equal(restLife.players[0].front.find(c=>c?.uid===poked.uid).ready,false);
 assert.equal(restLife.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===poked.uid),true);
 let early=toAttack(open(['KMR-1-032','KMR-1-006'],35032));
 const poke=put(early,0,'KMR-1-006','front',0,true);
 const final=take(early,1,'KMR-1-032');
 const kept=early.players[1].life[0];
 early.players[1].life[0]=final;early.players[1].deck.push(kept);
 early=use(early,a=>a.type==='attack'&&a.uid===poke.uid);
 early=use(early,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(legalUniversalActions(packs,early).some(a=>a.mode==='final'),false);
 let last=toAttack(open(['KMR-1-032','KMR-1-006'],35132));
 const hitter=put(last,0,'KMR-1-006','front',0,true);
 const lastCard=take(last,1,'KMR-1-032');
 last.players[1].deck.push(...last.players[1].life.splice(0));
 last.players[1].life.push(lastCard);
 const recovered=last.players[1].deck[0];
 last=use(last,a=>a.type==='attack'&&a.uid===hitter.uid);
 last=use(last,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(last.pending.trigger,'final');
 last=use(last,a=>a.type==='chooseTrigger'&&a.mode==='final');
 assert.equal(last.players[1].life[0].uid,recovered.uid);
 assert.equal(last.players[1].outside.some(c=>c.uid===lastCard.uid),true);
 assert.equal(last.pending,null);
 let must=toAttack(open(['KMR-1-041','KMR-1-040','KMR-1-006',...BLUE],35041));
 const attacker=put(must,0,'KMR-1-006','front',0,true);
 const ooo=put(must,1,'KMR-1-040','front',0,true);
 line(must,1,BLUE);
 const trigger=take(must,1,'KMR-1-041');
 const life=must.players[1].life[0];
 must.players[1].life[0]=trigger;must.players[1].deck.push(life);
 must=use(must,a=>a.type==='attack'&&a.uid===attacker.uid);
 must=use(must,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(legalUniversalActions(packs,must).some(a=>a.mode==='get'),false);
 assert.equal(legalUniversalActions(packs,must).some(a=>a.mode==='raid'&&a.baseUid===ooo.uid),true);
 must=use(must,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===ooo.uid);
 must=finishKmr(must);
 assert.equal(must.players[1].front.some(c=>c?.uid===trigger.uid),true);
 let free=toAttack(open(['KMR-1-041','KMR-1-006'],35141));
 const weak=put(free,0,'KMR-1-006','front',0,true);
 const loose=take(free,1,'KMR-1-041');
 const top=free.players[1].life[0];
 free.players[1].life[0]=loose;free.players[1].deck.push(top);
 free=use(free,a=>a.type==='attack'&&a.uid===weak.uid);
 free=use(free,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(legalUniversalActions(packs,free).some(a=>a.mode==='get'),true);
 assert.equal(legalUniversalActions(packs,free).some(a=>a.mode==='raid'),false);
 let banned=toAttack(open(['KMR-1-041','KMR-1-040','KMR-1-030'],35241));
 const raider=take(banned,0,'KMR-1-041');
 raider.ready=true;raider.fieldEntryStamp=banned.nextFieldEntryStamp++;
 raider.stack=[take(banned,0,'KMR-1-040')];
 banned.players[0].front[0]=raider;
 const activeLife=take(banned,1,'KMR-1-030');
 const under=banned.players[1].life[0];
 banned.players[1].life[0]=activeLife;banned.players[1].deck.push(under);
 banned=use(banned,a=>a.type==='attack'&&a.uid===raider.uid);
 banned=use(banned,a=>a.type==='chooseBlock'&&a.uid==null);
 assert.equal(legalUniversalActions(packs,banned).some(a=>a.mode==='active'),false);
 const raids=[['KMR-1-039','KMR-1-040'],['KMR-1-044','KMR-1-043']];
 const raided=[];
 for(const [id,baseId] of raids){
  let s=toAttack(open([id,baseId,'KMR-1-006',...BLUE],3600+Number(id.slice(-3))));
  const poke=put(s,0,'KMR-1-006','front',0,true);
  const base=put(s,1,baseId,'front',0,true);
  line(s,1,BLUE);
  s.players[1].deck.push(...s.players[1].hand.splice(0));
  const trigger=take(s,1,id);
  const buried=s.players[1].life[0];
  s.players[1].life[0]=trigger;s.players[1].deck.push(buried);
  s=use(s,a=>a.type==='attack'&&a.uid===poke.uid);
  s=use(s,a=>a.type==='chooseBlock'&&a.uid==null);
  assert.equal(s.pending?.trigger,'raid',id);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='get'),true,id);
  s=use(s,a=>a.type==='chooseTrigger'&&a.mode==='raid'&&a.baseUid===base.uid);
  s=finishKmr(s);
  assert.equal(s.players[1].front.some(c=>c?.uid===trigger.uid&&c.stack.some(x=>x?.uid===base.uid)),true,id);
  raided.push(s);
 }
 assert.equal(assertUniversalMatch(packs,special),true);
 assert.equal(assertUniversalMatch(packs,restLife),true);
 assert.equal(assertUniversalMatch(packs,early),true);
 assert.equal(assertUniversalMatch(packs,last),true);
 assert.equal(assertUniversalMatch(packs,must),true);
 assert.equal(assertUniversalMatch(packs,free),true);
 assert.equal(assertUniversalMatch(packs,banned),true);
 for(const s of raided)assert.equal(assertUniversalMatch(packs,s),true);
});
