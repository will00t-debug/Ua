// Official Re:Zero set-1 card FAQ, fetched 2026-10-26.
// UA40BT Q1569–Q1580: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA40BT
// UA40ST Q1581–Q1582: https://www.unionarena-tcg.com/jp/faq/list.php?series=UA40ST
// These fourteen rulings are not a certification of all 113 prints, and Vol.2 is out of scope.
import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_BY_ID} from '../dist/rezero-cards.mjs';
import {createRezeroV2Pack,rezeroPackCard} from '../dist/universal-v2/rezero-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalBp,
 effectiveHandRequiredEnergy,universalPrivateChoices,universalPublicView
} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {uiActionLabel,V2_PENDING_LABELS} from '../dist/universal-v2/preview-actions.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';

const pack=createRezeroV2Pack(),packs=[pack,pack];
function makeCounts(fours,twos=[]){
 const counts={
  ...Object.fromEntries(fours.map(id=>[id,4])),
  ...Object.fromEntries(twos.map(id=>[id,2]))
 };
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const match=counts=>seed=>newUniversalMatch(packs,{decks:[counts,counts],first:0,seed});
const skipCounts=makeCounts(['REZ-1-027','REZ-1-022','REZ-1-007','REZ-1-029','REZ-1-109',
 'REZ-1-026','REZ-1-045','REZ-1-014','REZ-1-016','REZ-1-081','REZ-1-043','REZ-1-086'],['REZ-1-001']);
const blueCounts=makeCounts(['REZ-1-043','REZ-1-060','REZ-1-058','REZ-1-055','REZ-1-065',
 'REZ-1-045','REZ-1-076','REZ-1-027','REZ-1-014','REZ-1-001','REZ-1-081','REZ-1-109'],['REZ-1-016']);
const moveCounts=makeCounts(['REZ-1-077','REZ-1-072','REZ-1-086','REZ-1-014','REZ-1-068',
 'REZ-1-016','REZ-1-081','REZ-1-007','REZ-1-043','REZ-1-022','REZ-1-029','REZ-1-054'],['REZ-1-003']);
const purpleCounts=makeCounts(['REZ-1-074','REZ-1-068','REZ-1-086','REZ-1-031','REZ-1-007',
 'REZ-1-085','REZ-1-098','REZ-1-088','REZ-1-081','REZ-1-101','REZ-1-016','REZ-1-014'],['REZ-1-022']);
const raidCounts=makeCounts(['REZ-1-089','REZ-1-090','REZ-1-104','REZ-1-086','REZ-1-081',
 'REZ-1-014','REZ-1-007','REZ-1-016','REZ-1-068','REZ-1-022','REZ-1-029','REZ-1-003'],['REZ-1-054']);
const skip=match(skipCounts),blue=match(blueCounts),moved=match(moveCounts);
const purple=match(purpleCounts),raid=match(raidCounts);

function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function at(s,p,uid){
 const pl=s.players[p];
 for(const zone of ['front','energy','hand','deck','life','outside','removed']){
  const cards=zone==='front'||zone==='energy'?pl[zone].filter(Boolean):pl[zone];
  const card=cards.find(c=>c.uid===uid);
  if(card)return card;
 }
 return null;
}
function fuel(s,p,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,p,id);
  card.ready=true;
  s.players[p].energy[i]=card;
 });
}
function stamp(s,card){
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.ready=true;
 return card;
}
function put(s,p,id,line,slot){
 const card=stamp(s,pull(s,p,id));
 s.players[p][line][slot]=card;
 return card;
}
function act(s,type,extra){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&
  Object.entries(extra||{}).every(([k,v])=>a[k]===v));
 assert.ok(action,type+' '+(extra?JSON.stringify(extra):''));
 return dispatchUniversalAction(packs,s,action);
}
function playFront(s,id){
 const card=pull(s,0,id);
 s.players[0].hand.push(card);
 return [act(s,'play',{uid:card.uid,line:'front'}),card];
}
function handLimit(s){
 while(s.pending?.kind==='end-hand-limit'){
  const hand=s.players[s.pending.player].hand[0];
  s=dispatchUniversalAction(packs,s,{type:'chooseHandLimit',uid:hand.uid});
 }
 return s;
}
function walk(s,done){
 let guard=0;
 while(!done(s)){
  s=handLimit(s);
  if(done(s))return s;
  if(s.pending)throw Error('unexpected pending '+s.pending.kind);
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next,'stuck '+(s.phase));
  s=dispatchUniversalAction(packs,s,next);
  assert.ok(++guard<64,'walk exceeded');
 }
 return s;
}
function ownMain(s,turn){
 return walk(s,x=>x.active===0&&x.players[0].ownTurns>=turn&&x.phase==='main'&&!x.pending);
}
function reachStart(s,player,turn){
 return walk(s,x=>x.active===player&&x.players[player].ownTurns>=turn&&x.phase==='start'&&!x.pending);
}
function reach(s,phase){
 return walk(s,x=>x.phase===phase&&!x.pending);
}
function untilPhase(s,player,phase){
 return walk(s,x=>x.active===player&&x.phase===phase&&!x.pending);
}
function skipOn(s,uid){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&e.targetUid===uid&&!e.consumed);
}
function setLifeTop(s,p,id){
 const card=pull(s,p,id);
 s.players[p].deck.push(s.players[p].life[0]);
 s.players[p].life[0]=card;
 return card;
}
function passBlock(s){
 if(s.pending?.kind==='block')s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 return s;
}

test('Q1569 Emilia and the color trigger skip the next active exactly once',()=>{
 let start=skip(9101);
 fuel(start,0,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const base=pull(start,0,'REZ-1-022');
 start.players[0].front[0]=base;
 start=ownMain(start,2);
 start.players[0].energy[0].buffs=[{energy:1,untilTurn:start.turn}];
 assert.equal(universalEnergyByColor(packs,start,0).yellow,5);
 const victim=put(start,1,'REZ-1-014','front',0);
 for(const id of [...Array(4).fill('REZ-1-029'),...Array(4).fill('REZ-1-109')])
  start.players[0].outside.push(pull(start,0,id));
 assert.equal(start.players[0].outside.filter(c=>pack.cards[c.cardId].type==='event').length,8);
 const top=pull(start,0,'REZ-1-027');
 start.players[0].hand.push(top);
 start=act(start,'raid',{uid:top.uid,baseUid:base.uid});
 assert.equal(start.pending.kind,'effect-rest-outside-events');
 start=dispatchUniversalAction(packs,start,{type:'chooseRestOutsideEvents',uid:victim.uid});
 assert.equal(at(start,1,victim.uid).ready,false);
 assert.equal(skipOn(start,victim.uid),true);
 start=reachStart(start,1,2);
 assert.equal(at(start,1,victim.uid).ready,false);
 assert.equal(skipOn(start,victim.uid),false);
 start=reachStart(start,0,3);
 assert.equal(at(start,1,victim.uid).ready,true);

 let end=skip(9102);
 const attacker=put(end,1,'REZ-1-016','front',0);
 const bystander=put(end,1,'REZ-1-014','front',1);
 setLifeTop(end,0,'REZ-1-026');
 end=untilPhase(end,1,'attack');
 end=act(end,'attack',{uid:attacker.uid});
 end=passBlock(end);
 assert.equal(end.pending.kind,'life-trigger');
 assert.equal(end.pending.trigger,'color');
 end=dispatchUniversalAction(packs,end,{type:'chooseTrigger',mode:'colorRestSkip',uid:bystander.uid});
 assert.equal(at(end,1,bystander.uid).ready,false);
 assert.equal(skipOn(end,bystander.uid),true);
 end=reachStart(end,0,2);
 assert.equal(at(end,1,attacker.uid).ready,true);
 assert.equal(at(end,1,bystander.uid).ready,false);
 assert.equal(skipOn(end,bystander.uid),false);
 end=reachStart(end,1,2);
 assert.equal(at(end,1,bystander.uid).ready,true);

 let active=skip(9103);
 const rested=put(active,0,'REZ-1-014','front',0);
 const source=put(active,0,'REZ-1-026','energy',0);
 const swinger=put(active,1,'REZ-1-016','front',0);
 setLifeTop(active,0,'REZ-1-045');
 active=untilPhase(active,1,'attack');
 const liveRest=at(active,0,rested.uid);
 liveRest.ready=false;
 grantContinuousState(active,{kind:'skipNextActive',controller:1,sourceUid:source.uid,
  targetUid:liveRest.uid,sourceLinked:false});
 assert.equal(skipOn(active,liveRest.uid),true);
 active=act(active,'attack',{uid:swinger.uid});
 active=passBlock(active);
 assert.equal(active.pending.kind,'life-trigger');
 assert.equal(active.pending.trigger,'active');
 active=dispatchUniversalAction(packs,active,{type:'chooseTrigger',mode:'active',uid:rested.uid});
 assert.equal(at(active,0,rested.uid).ready,false);
 assert.equal(skipOn(active,rested.uid),false);
 assert.equal(universalBp(pack,active,at(active,0,rested.uid)),5500);
 active=reachStart(active,0,2);
 assert.equal(at(active,0,rested.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,start),true);
 assert.equal(assertUniversalMatch(packs,end),true);
 assert.equal(assertUniversalMatch(packs,active),true);
});

test('Q1570 Crusch may treat a hand character BP 3000 as 4000',()=>{
 let s=blue(9110);
 s=reach(s,'main');
 const crusch=put(s,0,'REZ-1-058','front',0);
 const mimi=put(s,0,'REZ-1-045','energy',0);
 const shown=pull(s,0,'REZ-1-076');
 s.players[0].hand.push(shown);
 assert.equal(pack.cards['REZ-1-076'].bp,3000);
 assert.equal(crusch.stack.length,0);
 s=act(s,'activate',{uid:mimi.uid,mode:'revealBottomBuff'});
 s=dispatchUniversalAction(packs,s,{type:'chooseRevealBottom',uid:shown.uid});
 assert.equal(s.pending.kind,'effect-hand-bp-may');
 assert.equal(s.pending.baseBp,3000);
 assert.equal(s.pending.amount,1000);
 const declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseHandBpMay',mode:'decline'});
 assert.equal(universalBp(pack,declined,at(declined,0,mimi.uid)),1500);
 s=dispatchUniversalAction(packs,s,{type:'chooseHandBpMay',mode:'accept'});
 assert.equal(universalBp(pack,s,at(s,0,mimi.uid)),4000);
 assert.equal(s.players[0].deck.at(-1).uid,shown.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
});

test('Q1571 only one Flugel activation is legal in a turn',()=>{
 let s=blue(9111);
 s=reach(s,'main');
 const first=put(s,0,'REZ-1-060','energy',0);
 const event=pull(s,0,'REZ-1-109');
 s.players[0].hand.push(event);
 s=act(s,'activate',{uid:first.uid,mode:'restLeaveReveal'});
 assert.ok(s.mainReadyOnceByName[0].includes('フリューゲルの大樹'));
 s=dispatchUniversalAction(packs,s,{type:'chooseRevealRetire',uid:event.uid});
 assert.equal(s.pending,null);
 const second=put(s,0,'REZ-1-060','energy',0);
 const spare=pull(s,0,'REZ-1-001');
 s.players[0].hand.push(spare);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restLeaveReveal'&&a.uid===second.uid),false);
 s=ownMain(s,2);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restLeaveReveal'&&a.uid===second.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1572 a revealed BP 4000 retires a front at the revealed BP or less',()=>{
 let s=blue(9112);
 s=reach(s,'main');
 const tree=put(s,0,'REZ-1-060','energy',0);
 const exact=put(s,1,'REZ-1-027','front',0);
 const over=put(s,1,'REZ-1-014','front',1);
 over.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,exact),4000);
 assert.equal(universalBp(pack,s,over),4500);
 const revealed=pull(s,0,'REZ-1-027');
 s.players[0].hand.push(revealed);
 s=act(s,'activate',{uid:tree.uid,mode:'restLeaveReveal'});
 s=dispatchUniversalAction(packs,s,{type:'chooseRevealRetire',uid:revealed.uid});
 assert.equal(s.pending.kind,'effect-retire-referenced');
 assert.equal(s.pending.ceiling,4000);
 assert.deepEqual(s.pending.choices,[exact.uid]);
 assert.equal(s.players[0].deck.at(-1).uid,revealed.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireReferenced',uid:exact.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(at(s,1,over.uid).uid,over.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1573 the monster event is not played from hand as a character',()=>{
 let paid=blue(9113);
 fuel(paid,0,['REZ-1-043','REZ-1-043','REZ-1-043','REZ-1-043']);
 paid=reach(paid,'main');
 assert.equal(universalEnergyByColor(packs,paid,0).blue,4);
 const spell=pull(paid,0,'REZ-1-065');
 paid.players[0].hand.push(spell);
 const tall=put(paid,1,'REZ-1-014','front',0);
 tall.buffs=[{bp:2000,untilTurn:paid.turn}];
 assert.equal(universalBp(pack,paid,tall),4500);
 const legal=legalUniversalActions(packs,paid);
 assert.equal(pack.cards['REZ-1-065'].type,'event');
 assert.equal(pack.cards['REZ-1-065'].handRevealCharacterBp,4000);
 assert.equal(legal.some(a=>a.type==='event'&&a.uid===spell.uid),true);
 assert.equal(legal.some(a=>(a.type==='play'||a.type==='raid')&&a.uid===spell.uid),false);
 paid=act(paid,'event',{uid:spell.uid});
 assert.equal(paid.pending.kind,'effect-retire-at-least');
 paid=dispatchUniversalAction(packs,paid,{type:'chooseRetireAtLeast',uid:tall.uid});
 assert.ok(paid.players[0].outside.some(c=>c.uid===spell.uid));
 assert.equal(paid.players[0].front.some(c=>c?.uid===spell.uid),false);
 assert.equal(paid.players[0].energy.some(c=>c?.uid===spell.uid),false);

 let shown=blue(9114);
 shown=reach(shown,'main');
 const mimi=put(shown,0,'REZ-1-045','front',0);
 const revealed=pull(shown,0,'REZ-1-065');
 shown.players[0].hand.push(revealed);
 assert.equal(legalUniversalActions(packs,shown).some(a=>
  (a.type==='play'||a.type==='raid')&&a.uid===revealed.uid),false);
 shown=act(shown,'activate',{uid:mimi.uid,mode:'revealBottomBuff'});
 shown=dispatchUniversalAction(packs,shown,{type:'chooseRevealBottom',uid:revealed.uid});
 assert.equal(shown.pending,null);
 assert.equal(shown.players[0].deck.at(-1).uid,revealed.uid);
 assert.equal(universalBp(pack,shown,at(shown,0,mimi.uid)),4000);
 assert.equal(shown.players[0].front.some(c=>c?.uid===revealed.uid),false);
 assert.equal(shown.players[0].energy.some(c=>c?.uid===revealed.uid),false);
 assert.equal(assertUniversalMatch(packs,paid),true);
 assert.equal(assertUniversalMatch(packs,shown),true);
});

test('Q1574 a raided Crusch may treat the revealed monster as BP 5000',()=>{
 let s=blue(9115);
 fuel(s,0,['REZ-1-043','REZ-1-043','REZ-1-043']);
 const base=pull(s,0,'REZ-1-055');
 s.players[0].front[0]=base;
 s=ownMain(s,2);
 s.players[0].energy[0].buffs=[{energy:1,untilTurn:s.turn}];
 assert.equal(universalEnergyByColor(packs,s,0).blue,4);
 const tree=put(s,0,'REZ-1-060','energy',3);
 const exact=put(s,1,'REZ-1-027','front',0);
 const over=put(s,1,'REZ-1-014','front',1);
 over.buffs=[{bp:2000,untilTurn:s.turn}];
 const top=pull(s,0,'REZ-1-058');
 s.players[0].hand.push(top);
 s=act(s,'raid',{uid:top.uid,baseUid:base.uid});
 assert.equal(at(s,0,top.uid).stack[0].cardId,'REZ-1-055');
 assert.equal(s.pending.kind,'effect-top-take-one');
 s=dispatchUniversalAction(packs,s,{type:'chooseTopTakeOne',uid:s.pending.uids[0]});
 const monster=pull(s,0,'REZ-1-065');
 s.players[0].hand.push(monster);
 s=act(s,'activate',{uid:tree.uid,mode:'restLeaveReveal'});
 s=dispatchUniversalAction(packs,s,{type:'chooseRevealRetire',uid:monster.uid});
 assert.equal(s.players[0].deck.at(-1).uid,monster.uid);
 assert.equal(s.players[0].front.some(c=>c?.uid===monster.uid),false);
 assert.equal(s.pending.kind,'effect-referenced-bp');
 assert.equal(s.pending.baseBp,4000);
 assert.equal(s.pending.amount,1000);
 assert.equal(s.pending.next,'retire');
 const declined=dispatchUniversalAction(packs,structuredClone(s),{type:'chooseReferencedBp',mode:'decline'});
 assert.equal(declined.pending.ceiling,4000);
 assert.deepEqual(declined.pending.choices,[exact.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseReferencedBp',mode:'accept'});
 assert.equal(s.pending.ceiling,5000);
 assert.deepEqual(s.pending.choices.slice().sort(),[exact.uid,over.uid].sort());
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireReferenced',uid:over.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===over.uid));
 assert.equal(at(s,1,exact.uid).uid,exact.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,declined),true);
});

test('Q1575 Beatrice replaces an opponent retirement with a return to hand',()=>{
 let s=purple(9116);
 fuel(s,0,['REZ-1-086']);
 const subaru=put(s,0,'REZ-1-068','front',0);
 s=reach(s,'main');
 let beatrice;
 [s,beatrice]=playFront(s,'REZ-1-074');
 assert.equal(s.pending.kind,'effect-grant-bounce-instead');
 s=dispatchUniversalAction(packs,s,{type:'chooseGrantBounceInstead',uid:subaru.uid});
 assert.equal(at(s,0,subaru.uid).bounceInsteadGranted.sourceUid,beatrice.uid);
 fuel(s,1,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 const battle=structuredClone(s);
 const attacker=put(battle,1,'REZ-1-014','front',0);
 at(battle,0,subaru.uid).ready=true;
 let fought=untilPhase(battle,1,'attack');
 fought=act(fought,'attack',{uid:attacker.uid});
 fought=dispatchUniversalAction(packs,fought,{type:'chooseBlock',uid:subaru.uid});
 assert.ok(fought.players[0].outside.some(c=>c.uid===subaru.uid));
 assert.equal(fought.players[0].hand.some(c=>c.uid===subaru.uid),false);
 s=untilPhase(s,1,'main');
 assert.equal(universalEnergyByColor(packs,s,1).yellow,4);
 const event=pull(s,1,'REZ-1-031');
 s.players[1].hand.push(event);
 s=act(s,'event',{uid:event.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.ok(s.pending.choices.includes(subaru.uid));
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:subaru.uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===subaru.uid),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===subaru.uid),false);
 assert.equal(s.players[0].removed.some(c=>c.uid===subaru.uid),false);
 assert.equal(s.turnRetireEvents.some(e=>e.uid===subaru.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,fought),true);
});

test('Q1575 an opponent remove-area effect returns the granted character to hand',()=>{
 const lab=(id,color)=>({id,name:id,color,type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}});
 const removal={id:'LAB-REMOVE',name:'Remove',color:'purple',type:'event',energy:0,ap:1,bp:0,gen:0,
  traits:[],trigger:null,implementation:'dsl',effects:{onPlay:[{op:'removeOppFieldOne'}]}};
 assert.throws(()=>createUniversalPack({id:'bad-remove',cards:[{...removal,effects:{onPlay:[
  {op:'removeOppFieldOne',optional:true}]}}]}),/opponent field removal/);
 assert.throws(()=>createUniversalPack({id:'bad-remove-character',cards:[{...lab('X','purple'),
  implementation:'dsl',effects:{onPlay:[{op:'removeOppFieldOne'}]}}]}),/lone event onPlay/);
 const fixture=createUniversalPack({id:'q1575-remove-lab',cards:[
  rezeroPackCard(REZERO_BY_ID['REZ-1-074']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-068']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-086']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-077']),
  rezeroPackCard(REZERO_BY_ID['REZ-1-072']),
  removal,
  {id:'LAB-FIELD',name:'Field',color:'purple',type:'field',energy:0,ap:1,bp:0,gen:0,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  ...['LAB-A','LAB-B','LAB-C','LAB-D','LAB-E'].map(id=>lab(id,'purple')),
  lab('LAB-F','purple')
 ]});
 const counts={
  'REZ-1-074':4,'REZ-1-068':4,'REZ-1-086':4,'REZ-1-077':4,'REZ-1-072':4,
  'LAB-REMOVE':4,'LAB-FIELD':4,'LAB-A':4,'LAB-B':4,'LAB-C':4,'LAB-D':4,'LAB-E':4,'LAB-F':2
 };
 assert.equal(Object.values(counts).reduce((n,c)=>n+c,0),50);
 assert.deepEqual(validateUniversalDeck(fixture,counts),[]);
 const fp=[fixture,fixture];
 const pullHere=(s,p,id)=>{
  for(const zone of ['deck','hand','life','outside']){
   const cards=s.players[p][zone],index=cards.findIndex(c=>c.cardId===id);
   if(index>=0)return cards.splice(index,1)[0];
  }
  throw Error('Missing '+id);
 };
 const place=(s,p,id,line,slot)=>{
  const card=pullHere(s,p,id);
  card.ready=true;card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[p][line][slot]=card;return card;
 };
 const walkTo=(s,done)=>{
  let guard=0;
  while(!done(s)){
   while(s.pending?.kind==='end-hand-limit'){
    const hand=s.players[s.pending.player].hand[0];
    s=dispatchUniversalAction(fp,s,{type:'chooseHandLimit',uid:hand.uid});
   }
   if(done(s))return s;
   if(s.pending)throw Error('unexpected pending '+s.pending.kind);
   const next=legalUniversalActions(fp,s).find(a=>a.type==='next');
   assert.ok(next,'stuck '+s.phase);
   s=dispatchUniversalAction(fp,s,next);
   assert.ok(++guard<64,'walk exceeded');
  }
  return s;
 };
 const playEvent=(s)=>{
  const event=pullHere(s,1,'LAB-REMOVE');
  s.players[1].hand.push(event);
  const action=legalUniversalActions(fp,s).find(a=>a.type==='event'&&a.uid===event.uid);
  assert.ok(action);
  return dispatchUniversalAction(fp,s,action);
 };

 let plain=newUniversalMatch(fp,{decks:[counts,counts],first:0,seed:9150});
 place(plain,0,'LAB-FIELD','energy',0);
 plain=walkTo(plain,x=>x.active===1&&x.phase==='main');
 const hidden=pullHere(plain,1,'LAB-REMOVE');
 plain.players[1].hand.push(hidden);
 assert.equal(legalUniversalActions(fp,plain).some(a=>a.type==='event'&&a.uid===hidden.uid),false);
 plain.players[1].hand.splice(plain.players[1].hand.findIndex(c=>c.uid===hidden.uid),1);
 plain.players[1].deck.push(hidden);
 const bare=place(plain,0,'REZ-1-068','front',0);
 plain=playEvent(plain);
 assert.equal(plain.pending.kind,'effect-remove-opp-field');
 assert.deepEqual(plain.pending.choices,[bare.uid]);
 assert.equal(V2_PENDING_LABELS['effect-remove-opp-field'],'選擇 1 張對手場上角色，放入移除區');
 assert.equal(uiActionLabel({type:'chooseRemoveOppField',uid:bare.uid},{pack:fp,state:plain}),
  '將 ナツキ・スバル 放入移除區');
 assert.equal(chooseUniversalAiAction(fp,plain).uid,bare.uid);
 plain=dispatchUniversalAction(fp,plain,{type:'chooseRemoveOppField',uid:bare.uid});
 assert.ok(plain.players[0].removed.some(c=>c.uid===bare.uid));
 assert.equal(plain.players[0].hand.some(c=>c.uid===bare.uid),false);
 assert.equal(plain.players[0].outside.some(c=>c.uid===bare.uid),false);
 assert.equal(plain.turnRetireEvents.some(e=>e.uid===bare.uid),false);
 assert.ok(plain.zoneMoveEvents.some(e=>e.uid===bare.uid&&e.from==='front'&&
  e.to==='removed'&&e.reason==='opponent-effect'));

 let granted=newUniversalMatch(fp,{decks:[counts,counts],first:0,seed:9151});
 place(granted,0,'REZ-1-086','energy',0);
 const subaru=place(granted,0,'REZ-1-068','front',0);
 granted=walkTo(granted,x=>x.active===0&&x.phase==='main');
 assert.equal(universalEnergyByColor(fp,granted,0).purple,1);
 const beatrice=pullHere(granted,0,'REZ-1-074');
 granted.players[0].hand.push(beatrice);
 granted=dispatchUniversalAction(fp,granted,legalUniversalActions(fp,granted).find(a=>
  a.type==='play'&&a.uid===beatrice.uid&&a.line==='front'));
 assert.equal(granted.pending.kind,'effect-grant-bounce-instead');
 granted=dispatchUniversalAction(fp,granted,{type:'chooseGrantBounceInstead',uid:subaru.uid});
 const replaced=walkTo(structuredClone(granted),x=>x.active===1&&x.phase==='main');
 let bounced=playEvent(replaced);
 assert.ok(bounced.pending.choices.includes(subaru.uid));
 bounced=dispatchUniversalAction(fp,bounced,{type:'chooseRemoveOppField',uid:subaru.uid});
 assert.ok(bounced.players[0].hand.some(c=>c.uid===subaru.uid));
 assert.equal(bounced.players[0].removed.some(c=>c.uid===subaru.uid),false);
 assert.equal(bounced.players[0].outside.some(c=>c.uid===subaru.uid),false);
 assert.equal(bounced.turnRetireEvents.some(e=>e.uid===subaru.uid),false);
 assert.ok(bounced.zoneMoveEvents.some(e=>e.uid===subaru.uid&&e.to==='hand'&&
  e.reason==='opponent-effect'));

 const ruled=structuredClone(granted);
 const held=ruled.players[0].front.find(c=>c?.uid===subaru.uid);
 const from=ruled.players[0].front.findIndex(c=>c?.uid===subaru.uid);
 const fuelCard=ruled.players[0].energy[0];
 ruled.players[0].front[from]=null;
 ruled.players[0].deck.push(fuelCard);
 ruled.players[0].energy[0]=held;
 for(const [slot,id] of [[1,'LAB-A'],[2,'LAB-B'],[3,'LAB-C']])place(ruled,0,id,'energy',slot);
 const victim=place(ruled,0,'LAB-D','front',0);
 for(let slot=0;slot<3;slot++)place(ruled,1,'REZ-1-086','energy',slot);
 const base=place(ruled,1,'REZ-1-072','front',0);
 let shifted=walkTo(ruled,x=>x.active===1&&x.phase==='main');
 assert.equal(universalEnergyByColor(fp,shifted,1).purple,3);
 const top=pullHere(shifted,1,'REZ-1-077');
 shifted.players[1].hand.push(top);
 const raid=legalUniversalActions(fp,shifted).find(a=>a.type==='raid'&&a.uid===top.uid&&a.baseUid===base.uid);
 assert.ok(raid);
 shifted=dispatchUniversalAction(fp,shifted,raid);
 assert.equal(shifted.pending.kind,'effect-move-opp-front');
 const move=legalUniversalActions(fp,shifted).find(a=>a.type==='chooseMoveOppFront'&&
  a.uid===victim.uid&&a.replaceUid===subaru.uid);
 assert.ok(move);
 shifted=dispatchUniversalAction(fp,shifted,move);
 assert.ok(shifted.players[0].removed.some(c=>c.uid===subaru.uid));
 assert.equal(shifted.players[0].hand.some(c=>c.uid===subaru.uid),false);
 assert.equal(shifted.players[0].energy.some(c=>c?.uid===victim.uid),true);
 assert.ok(shifted.zoneMoveEvents.some(e=>e.uid===subaru.uid&&e.to==='removed'&&e.reason==='rule'));
 assert.equal(assertUniversalMatch(fp,plain),true);
 assert.equal(assertUniversalMatch(fp,bounced),true);
 assert.equal(assertUniversalMatch(fp,shifted),true);
});

test('Q1576 a full energy line removes one card before the front character moves',()=>{
 let s=moved(9117);
 fuel(s,0,['REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=pull(s,0,'REZ-1-072');
 s.players[0].front[0]=base;
 s=ownMain(s,2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,3);
 const victim=put(s,1,'REZ-1-014','front',0);
 const occupants=['REZ-1-007','REZ-1-016','REZ-1-081','REZ-1-068'].map((id,i)=>
  put(s,1,id,'energy',i));
 const top=pull(s,0,'REZ-1-077');
 s.players[0].hand.push(top);
 s=act(s,'raid',{uid:top.uid,baseUid:base.uid});
 assert.equal(s.pending.kind,'effect-move-opp-front');
 const shifts=legalUniversalActions(packs,s).filter(a=>a.type==='chooseMoveOppFront'&&a.uid===victim.uid);
 assert.equal(shifts.length,4);
 assert.equal(shifts.every(a=>occupants.some(c=>c.uid===a.replaceUid)),true);
 assert.equal(shifts.some(a=>a.replaceUid===undefined),false);
 const displaced=occupants[1];
 s=dispatchUniversalAction(packs,s,shifts.find(a=>a.replaceUid===displaced.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[1].energy.find(c=>c?.uid===victim.uid).uid,victim.uid);
 assert.equal(s.players[1].front.some(c=>c?.uid===victim.uid),false);
 assert.ok(s.players[1].removed.some(c=>c.uid===displaced.uid));
 assert.equal(s.players[1].hand.some(c=>c.uid===displaced.uid),false);
 assert.equal(s.players[1].outside.some(c=>c.uid===displaced.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1577 raiding a character that cannot move leaves the new top free to move',()=>{
 let s=moved(9118);
 fuel(s,1,['REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=put(s,1,'REZ-1-072','energy',3);
 const source=put(s,0,'REZ-1-014','energy',0);
 const lockedStamp=base.fieldEntryStamp;
 grantContinuousState(s,{kind:'cannotMove',controller:0,sourceUid:source.uid,
  targetUid:base.uid,sourceLinked:false,until:{player:0,phase:'start',edge:'start'}});
 s=untilPhase(s,1,'move');
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetUid===base.uid&&
  e.targetStamp===lockedStamp),true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='move'&&a.uid===base.uid),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='move'&&a.uid!==base.uid),true);
 s=untilPhase(s,1,'main');
 assert.equal(universalEnergyByColor(packs,s,1).purple,3);
 const top=pull(s,1,'REZ-1-077');
 s.players[1].hand.push(top);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='raid'&&a.uid===top.uid&&
  a.baseUid===base.uid&&a.slot===0),true);
 s=act(s,'raid',{uid:top.uid,baseUid:base.uid,slot:0});
 const arrived=at(s,1,top.uid);
 assert.equal(s.players[1].front[0].uid,top.uid);
 assert.equal(arrived.ready,true);
 assert.equal(arrived.stack[0].uid,base.uid);
 assert.notEqual(arrived.fieldEntryStamp,lockedStamp);
 assert.equal(s.continuousStates.some(e=>e.kind==='cannotMove'&&e.targetStamp===arrived.fieldEntryStamp),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1578 Emilia keeps the next-hand discount after a different card is played',()=>{
 let s=purple(9119);
 fuel(s,0,['REZ-1-086','REZ-1-086']);
 s=ownMain(s,2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 let holder;
 [s,holder]=playFront(s,'REZ-1-085');
 at(s,0,holder.uid).ready=true;
 const trial=pull(s,0,'REZ-1-098');
 s.players[0].hand.push(trial);
 s=act(s,'event',{uid:trial.uid});
 const dumped=s.players[0].hand[0];
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:dumped.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseRestFrontAp',uid:holder.uid});
 if(s.pending?.kind==='effect-recover-ap'){
  const ap=s.players[0].apCards.find(c=>c.inPlay&&!c.ready);
  s=dispatchUniversalAction(packs,s,{type:'chooseApRecovery',uid:ap.uid});
 }
 assert.equal(at(s,0,holder.uid).ready,false);
 s=act(s,'activate',{uid:holder.uid});
 assert.equal(s.players[0].nextNamedHandEnergy.length,1);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-088']),2);
 const other=pull(s,0,'REZ-1-068');
 s.players[0].hand.push(other);
 s=act(s,'play',{uid:other.uid,line:'front'});
 assert.equal(s.players[0].nextNamedHandEnergy.length,1);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-088']),2);
 assert.equal(effectiveHandRequiredEnergy(pack,s,0,pack.cards['REZ-1-068']),0);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1579 an unblocked Emilia rests before life damage',()=>{
 let quiet=raid(9120);
 const emilia=put(quiet,0,'REZ-1-089','front',0);
 const blocker=put(quiet,1,'REZ-1-014','front',0);
 setLifeTop(quiet,1,'REZ-1-014');
 quiet=reach(quiet,'attack');
 quiet=act(quiet,'attack',{uid:emilia.uid});
 assert.equal(quiet.pending.kind,'block');
 const life=quiet.players[1].life.length;
 const blocked=dispatchUniversalAction(packs,structuredClone(quiet),{type:'chooseBlock',uid:blocker.uid});
 assert.equal(blocked.pending,null);
 assert.equal(blocked.players[1].life.length,life);
 let open=dispatchUniversalAction(packs,structuredClone(quiet),{type:'chooseBlock',uid:null});
 assert.equal(open.pending.kind,'effect-unblocked-rest');
 assert.equal(open.players[1].life.length,life);
 assert.ok(open.effectQueue.some(e=>e.op==='unblockedLifeDamage'));
 open=dispatchUniversalAction(packs,open,{type:'chooseUnblockedRest',uid:null});
 assert.equal(open.pending,null);
 assert.equal(open.players[1].life.length,life-1);

 let triggered=raid(9121);
 const raider=put(triggered,0,'REZ-1-089','front',0);
 put(triggered,1,'REZ-1-014','front',0);
 setLifeTop(triggered,1,'REZ-1-007');
 triggered=reach(triggered,'attack');
 triggered=act(triggered,'attack',{uid:raider.uid});
 const before=triggered.players[1].life.length;
 triggered=dispatchUniversalAction(packs,triggered,{type:'chooseBlock',uid:null});
 assert.equal(triggered.pending.kind,'effect-unblocked-rest');
 assert.equal(triggered.players[1].life.length,before);
 triggered=dispatchUniversalAction(packs,triggered,{type:'chooseUnblockedRest',uid:null});
 assert.equal(triggered.pending.kind,'life-trigger');
 assert.equal(triggered.pending.trigger,'draw');
 assert.equal(triggered.players[1].life.length,before-1);
 triggered=dispatchUniversalAction(packs,triggered,{type:'chooseTrigger',mode:'skip'});
 assert.equal(triggered.pending,null);
 assert.equal(assertUniversalMatch(packs,blocked),true);
 assert.equal(assertUniversalMatch(packs,open),true);
 assert.equal(assertUniversalMatch(packs,triggered),true);
});

test('Q1580 raiding onto a rested Emilia activates the new top',()=>{
 let s=raid(9122);
 fuel(s,0,['REZ-1-086','REZ-1-086','REZ-1-086','REZ-1-086']);
 const base=pull(s,0,'REZ-1-081');
 s.players[0].front[0]=base;
 s=ownMain(s,2);
 s.players[0].energy[0].buffs=[{energy:1,untilTurn:s.turn}];
 s.players[0].energy[1].buffs=[{energy:1,untilTurn:s.turn}];
 assert.equal(universalEnergyByColor(packs,s,0).purple,6);
 put(s,1,'REZ-1-014','front',0);
 const top=pull(s,0,'REZ-1-090');
 s.players[0].hand.push(top);
 at(s,0,base.uid).ready=false;
 s=act(s,'raid',{uid:top.uid,baseUid:base.uid});
 assert.equal(at(s,0,top.uid).ready,true);
 assert.equal(at(s,0,top.uid).stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-target');
 assert.equal(legalUniversalActions(packs,s).every(a=>a.type==='chooseTarget'),true);
 s=dispatchUniversalAction(packs,s,{type:'chooseTarget',uid:null});
 assert.equal(s.pending,null);
 assert.equal(at(s,0,top.uid).ready,true);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='restedRetireImpact'),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1581 the owner sees one facedown under Subaru and the opponent sees only the back',()=>{
 let s=purple(9123);
 fuel(s,0,['REZ-1-016','REZ-1-016','REZ-1-016']);
 put(s,0,'REZ-1-081','front',0);
 s=reach(s,'main');
 assert.equal(universalEnergyByColor(packs,s,0).yellow,3);
 let subaru;
 [s,subaru]=playFront(s,'REZ-1-101');
 fuel(s,1,['REZ-1-007','REZ-1-007','REZ-1-007','REZ-1-007']);
 s=untilPhase(s,1,'main');
 const event=pull(s,1,'REZ-1-031');
 s.players[1].hand.push(event);
 s=act(s,'event',{uid:event.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseRetireBp',uid:subaru.uid});
 assert.equal(s.pending.kind,'effect-hand-reenter-under');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 const handCard=s.players[0].hand[0];
 assert.equal(universalPrivateChoices(packs,s,0).options.some(o=>o.card?.cardId===handCard.cardId),true);
 s=act(s,'chooseHandReenterUnder',{uid:handCard.uid});
 const returned=at(s,0,subaru.uid);
 assert.equal(returned.ready,false);
 assert.equal(returned.under.length,1);
 assert.equal(returned.under[0].faceDown,true);
 assert.equal(returned.under[0].cardId,handCard.cardId);
 const owner=universalPublicView(packs,s,0).players[0].front.find(c=>c?.uid===subaru.uid);
 const foe=universalPublicView(packs,s,1).players[0].front.find(c=>c?.uid===subaru.uid);
 assert.equal(owner.underLayers.length,1);
 assert.equal(owner.underLayers[0].cardId,handCard.cardId);
 assert.equal(owner.underLayers[0].faceDown,true);
 assert.deepEqual(foe.underLayers,[ {faceDown:true} ]);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===handCard.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q1582 Rem draws from an opponent front below its printed BP',()=>{
 let s=raid(9124);
 s=reach(s,'main');
 const rem=put(s,0,'REZ-1-104','front',0);
 const front=put(s,1,'REZ-1-014','front',0);
 assert.equal(pack.cards['REZ-1-014'].bp,2500);
 function swing(state){
  let attack=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(a=>a.type==='next'));
  const deck=attack.players[0].deck.length;
  attack=act(attack,'attack',{uid:rem.uid});
  assert.equal(attack.pending.kind,'block');
  return [attack,deck-attack.players[0].deck.length];
 }
 const below=structuredClone(s);
 at(below,1,front.uid).buffs=[{bp:-1000,untilTurn:below.turn}];
 assert.equal(universalBp(pack,below,at(below,1,front.uid)),1500);
 const [belowState,belowDraw]=swing(below);
 assert.equal(belowDraw,1);
 const exact=structuredClone(s);
 assert.equal(universalBp(pack,exact,at(exact,1,front.uid)),2500);
 const [exactState,exactDraw]=swing(exact);
 assert.equal(exactDraw,0);
 const above=structuredClone(s);
 at(above,1,front.uid).buffs=[{bp:1000,untilTurn:above.turn}];
 assert.equal(universalBp(pack,above,at(above,1,front.uid)),3500);
 const [aboveState,aboveDraw]=swing(above);
 assert.equal(aboveDraw,0);
 const line=structuredClone(s);
 const parked=put(line,1,'REZ-1-014','energy',0);
 parked.buffs=[{bp:-1000,untilTurn:line.turn}];
 assert.equal(universalBp(pack,line,parked),1500);
 const [lineState,lineDraw]=swing(line);
 assert.equal(lineDraw,0);
 assert.equal(assertUniversalMatch(packs,belowState),true);
 assert.equal(assertUniversalMatch(packs,exactState),true);
 assert.equal(assertUniversalMatch(packs,aboveState),true);
 assert.equal(assertUniversalMatch(packs,lineState),true);
});
