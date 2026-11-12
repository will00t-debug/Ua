import test from 'node:test';
import assert from 'node:assert/strict';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalCardEnergy, universalEnergyByColor,
 universalImpact, universalImpactNull, universalPrivateChoices, universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const pack=createMadokaV2Pack();
const packs=[pack,pack];

function countsFor(required){
 const ids=[...new Set(required)];
 const colors=new Set(ids.map(id=>pack.cards[id].color));
 const fillers=Object.values(pack.cards).filter(c=>!ids.includes(c.id)&&
  colors.has(c.color)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
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
  counts[id]=(counts[id]||0)+add;
  total+=add;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function fresh(counts,seed){
 return newUniversalMatch(packs,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
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
function stackTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 for(const card of [...cards].reverse())s.players[p].deck.unshift(card);
 return cards;
}
function setLife(s,p,ids){
 s.players[p].deck.push(...s.players[p].life.splice(0));
 for(const id of ids.slice().reverse())s.players[p].life.unshift(take(s,p,id));
}
function use(s,action){return dispatchUniversalAction(packs,s,action);}
function acts(s){return legalUniversalActions(packs,s);}
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
function play(s,uid,kind='play',baseUid){
 const action=acts(s).find(a=>a.type===kind&&a.uid===uid&&!a.from&&
  (kind!=='play'||(a.line==='front'&&a.replaceUid===undefined))&&
  (kind!=='event'||a.targetUid===undefined)&&
  (kind!=='raid'||(a.baseUid===baseUid&&(a.line==null||a.line==='front'))));
 if(!action)throw Error('No '+kind+' for '+uid+' pending '+(s.pending?.kind||''));
 return use(s,action);
}
function pick(s,pred){
 const action=acts(s).find(pred);
 if(!action)throw Error('No choice '+(s.pending?.kind||'')+' '+
  JSON.stringify(acts(s).slice(0,8)));
 return use(s,action);
}
function field(s,p,uid){
 return [...s.players[p].front,...s.players[p].energy].find(c=>c?.uid===uid)||null;
}
function listedUids(value,found=new Set()){
 if(!value||typeof value!=='object')return found;
 if(typeof value.uid==='string')found.add(value.uid);
 for(const child of Object.values(value))listedUids(child,found);
 return found;
}
function assertHidden(s,uids){
 const found=listedUids(universalPublicView(packs,s,1));
 for(const uid of uids)assert.equal(found.has(uid),false,uid);
}
function orderRest(s){
 let guard=0;
 while(s.pending&&(s.pending.kind==='effect-top-order'||s.pending.step==='order')){
  s=pick(s,a=>true);
  if(++guard>8)throw Error('order stuck');
 }
 return s;
}
function hit(s,uid){
 s=use(s,{type:'attack',uid});
 if(s.pending?.kind==='block')s=pick(s,a=>a.type==='chooseBlock'&&a.uid===null);
 return s;
}
function openLife(counts,seed,id,hitter,backup,setup){
 let s=toPhase(fresh(counts,seed),'attack');
 const attacker=put(s,0,hitter,'front',0,true);
 if(setup)setup(s);
 setLife(s,1,[id,backup]);
 s=hit(s,attacker.uid);
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.players[1].outside.some(c=>c.cardId===id),true);
 return s;
}
function passUntil(s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending){
   if(s.pending.kind==='life-trigger')s=pick(s,a=>a.mode==='skip');
   else throw Error('Pending '+s.pending.kind+' at '+s.active+' '+s.phase);
  }else s=use(s,{type:'next'});
  if(++guard>40)throw Error('Stuck at '+s.active+' '+s.phase+' '+(s.pending?.kind||''));
 }
 return s;
}

test('076-100 sibling programs share one printed sentence',()=>{
 assert.equal(pack.cards['MMM-1-086'].triggerTextJa,pack.cards['MMM-1-076'].triggerTextJa);
 assert.equal(pack.cards['MMM-1-091'].triggerTextJa,pack.cards['MMM-1-076'].triggerTextJa);
 for(const id of ['MMM-1-087','MMM-1-092','MMM-1-098'])
  assert.equal(pack.cards[id].triggerTextJa,pack.cards['MMM-1-082'].triggerTextJa);
 for(const id of ['MMM-1-088','MMM-1-100'])
  assert.equal(pack.cards[id].triggerTextJa,pack.cards['MMM-1-084'].triggerTextJa);
 assert.deepEqual(pack.cards['MMM-1-089'].triggerEffect,pack.cards['MMM-1-077'].triggerEffect);
 for(const id of ['MMM-1-083','MMM-1-090'])
  assert.equal(pack.cards[id].triggerTextJa,pack.cards['MMM-1-078'].triggerTextJa);
 for(const id of ['MMM-1-094','MMM-1-099'])
  assert.deepEqual(pack.cards[id].triggerEffect,{op:'retireOppFront'});
 assert.deepEqual(pack.cards['MMM-1-093'].triggerEffect,{op:'retireOppFront'});
 for(const id of ['MMM-1-096','MMM-1-097']){
  assert.deepEqual(pack.cards[id].effects,pack.cards['MMM-1-095'].effects);
  assert.deepEqual(pack.cards[id].triggerEffect,pack.cards['MMM-1-095'].triggerEffect);
 }
 assert.equal(pack.cards['MMM-1-080'].step,true);
 assert.equal(pack.cards['MMM-1-079'].step,true);
});

test('life triggers on MMM-1-076 through 100 use the printed card',()=>{
 const gets=countsFor(['MMM-1-076','MMM-1-086','MMM-1-079']);
 for(const [id,seed] of [['MMM-1-076',12076],['MMM-1-086',12086]]){
  let life=openLife(gets,seed,id,'MMM-1-079','MMM-1-079');
  assert.equal(life.pending.trigger,'get');
  assert.equal(acts(life).some(a=>a.mode==='skip'),true);
  assert.equal(acts(life).some(a=>a.mode==='draw'),false);
  const revealed=life.players[1].outside.find(c=>c.cardId===id);
  life=pick(life,a=>a.mode==='get');
  assert.equal(life.pending,null);
  assert.ok(life.players[1].hand.some(c=>c.uid===revealed.uid));
  assert.equal(life.players[1].outside.some(c=>c.uid===revealed.uid),false);
  assertUniversalMatch(packs,life);
 }

 const draw=countsFor(['MMM-1-082','MMM-1-079']);
 let drawn=openLife(draw,12082,'MMM-1-082','MMM-1-079','MMM-1-079');
 assert.equal(drawn.pending.trigger,'draw');
 const top=drawn.players[1].deck[0];
 const revealedDraw=drawn.players[1].outside.find(c=>c.cardId==='MMM-1-082');
 const deck=drawn.players[1].deck.length;
 drawn=pick(drawn,a=>a.mode==='draw');
 assert.equal(drawn.players[1].deck.length,deck-1);
 assert.ok(drawn.players[1].hand.some(c=>c.uid===top.uid));
 assert.ok(drawn.players[1].outside.some(c=>c.uid===revealedDraw.uid));
 assert.equal(drawn.pending,null);
 assertUniversalMatch(packs,drawn);

 const active=countsFor(['MMM-1-084','MMM-1-076','MMM-1-079']);
 let awoken=openLife(active,12084,'MMM-1-084','MMM-1-079','MMM-1-079',s=>{
  put(s,1,'MMM-1-076','energy',0,false);
 });
 assert.equal(awoken.pending.trigger,'active');
 const rested=awoken.players[1].energy[0];
 assert.equal(universalBp(packs,awoken,rested),1500);
 awoken=pick(awoken,a=>a.mode==='active'&&a.uid===rested.uid);
 assert.equal(field(awoken,1,rested.uid).ready,true);
 assert.equal(universalBp(packs,awoken,field(awoken,1,rested.uid)),4500);
 assert.equal(awoken.pending,null);
 assertUniversalMatch(packs,awoken);

 const color=countsFor(['MMM-1-077','MMM-1-076','MMM-1-080','MMM-1-079']);
 let retired=openLife(color,12077,'MMM-1-077','MMM-1-076','MMM-1-079',s=>{
  put(s,0,'MMM-1-080','front',1,true);
 });
 const low=retired.players[0].front[0];
 const high=retired.players[0].front[1];
 assert.equal(retired.pending.trigger,'color');
 assert.equal(universalBp(packs,retired,low),1500);
 assert.equal(universalBp(packs,retired,high),3000);
 assert.ok(acts(retired).some(a=>a.mode==='colorRetire'&&a.uid===low.uid));
 assert.equal(acts(retired).some(a=>a.uid===high.uid),false);
 retired=pick(retired,a=>a.mode==='colorRetire'&&a.uid===low.uid);
 assert.ok(retired.players[0].outside.some(c=>c.uid===low.uid));
 assert.ok(retired.players[0].front.some(c=>c?.uid===high.uid));
 assert.equal(retired.pending,null);
 assertUniversalMatch(packs,retired);

 const raid=countsFor(['MMM-1-078','MMM-1-076','MMM-1-081','MMM-1-079']);
 let raided=openLife(raid,12078,'MMM-1-078','MMM-1-079','MMM-1-079',s=>{
  put(s,1,'MMM-1-081','energy',0,true);
  put(s,1,'MMM-1-081','energy',1,true);
  put(s,1,'MMM-1-076','energy',2,true);
  put(s,1,'MMM-1-076','front',0,true);
 });
 const base=raided.players[1].front[0];
 const kyoko=raided.players[1].energy[0];
 assert.equal(raided.pending.trigger,'raid');
 assert.equal(universalEnergyByColor(packs,raided,1).red,5);
 assert.ok(acts(raided).some(a=>a.mode==='get'));
 assert.ok(acts(raided).some(a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front'));
 assert.equal(acts(raided).some(a=>a.mode==='raid'&&a.baseUid===kyoko.uid),false);
 const madoka=raided.players[1].outside.find(c=>c.cardId==='MMM-1-078');
 raided=pick(raided,a=>a.mode==='raid'&&a.baseUid===base.uid&&a.line==='front'&&a.slot===0);
 assert.equal(field(raided,1,madoka.uid).ready,true);
 assert.equal(field(raided,1,madoka.uid).stack[0].uid,base.uid);
 if(raided.pending){
  assert.equal(raided.pending.kind,'effect-retire-bp');
  assert.equal(raided.pending.optional,true);
  raided=pick(raided,a=>a.type==='chooseRetireBp'&&a.uid===null);
 }
 assert.equal(raided.pending,null);
 assertUniversalMatch(packs,raided);

 const special=countsFor(['MMM-1-093','MMM-1-080','MMM-1-079']);
 let specialLife=openLife(special,12093,'MMM-1-093','MMM-1-079','MMM-1-079',s=>{
  put(s,0,'MMM-1-080','front',1,true);
 });
 const anyFront=specialLife.players[0].front[1];
 assert.equal(specialLife.pending.trigger,'special');
 assert.equal(universalBp(packs,specialLife,anyFront),3000);
 assert.ok(acts(specialLife).some(a=>a.mode==='special'&&a.uid===anyFront.uid));
 specialLife=pick(specialLife,a=>a.mode==='special'&&a.uid===anyFront.uid);
 assert.ok(specialLife.players[0].outside.some(c=>c.uid===anyFront.uid));
 assert.equal(specialLife.pending,null);
 assertUniversalMatch(packs,specialLife);

 const final=countsFor(['MMM-1-095','MMM-1-079']);
 let last=toPhase(fresh(final,12095),'attack');
 const hitter=put(last,0,'MMM-1-079','front',0,true);
 setLife(last,1,['MMM-1-095','MMM-1-079']);
 last=hit(last,hitter.uid);
 assert.equal(last.pending,null);
 assert.equal(last.players[1].life.length,1);
 let empty=toPhase(fresh(final,12096),'attack');
 const closer=put(empty,0,'MMM-1-079','front',0,true);
 setLife(empty,1,['MMM-1-095']);
 empty=hit(empty,closer.uid);
 assert.equal(empty.pending.trigger,'final');
 assert.equal(empty.players[1].life.length,0);
 const soulTop=empty.players[1].deck[0];
 const soul=empty.players[1].outside.find(c=>c.cardId==='MMM-1-095');
 empty=pick(empty,a=>a.mode==='final');
 assert.equal(empty.pending,null);
 assert.equal(empty.players[1].life[0].uid,soulTop.uid);
 assert.ok(empty.players[1].outside.some(c=>c.uid===soul.uid));
 assert.equal(empty.status,'playing');
 assertUniversalMatch(packs,empty);
});

test('MMM-1-078 raid frame retires only after a real Madoka raid',()=>{
 const counts=countsFor(['MMM-1-078','MMM-1-076','MMM-1-081','MMM-1-079','MMM-1-087','MMM-1-080']);
 function board(seed){
  let s=toPhase(fresh(counts,seed),'main');
  put(s,0,'MMM-1-081','energy',0,true);
  put(s,0,'MMM-1-081','energy',1,true);
  put(s,0,'MMM-1-087','energy',2,true);
  const base=put(s,0,'MMM-1-076','front',0,true);
  const otherKyoko=put(s,0,'MMM-1-079','front',1,true);
  const low=put(s,1,'MMM-1-076','front',0,true);
  const high=put(s,1,'MMM-1-080','front',1,true);
  readyAp(s);
  assert.equal(universalEnergyByColor(packs,s,0).red,5);
  return {s,base,otherKyoko,low,high};
 }
 const quiet=board(13078);
 const played=toHand(quiet.s,0,'MMM-1-078');
 let ordinary=play(quiet.s,played.uid);
 const entered=field(ordinary,0,played.uid);
 assert.equal(entered.ready,false);
 assert.equal((entered.stack||[]).length,0);
 assert.equal(ordinary.pending,null);
 assert.equal(acts(ordinary).some(a=>a.type==='raid'&&a.uid===played.uid),false);
 assertUniversalMatch(packs,ordinary);

 const named=board(13079);
 const raider=toHand(named.s,0,'MMM-1-078');
 assert.equal(acts(named.s).some(a=>a.type==='raid'&&a.uid===raider.uid&&
  a.baseUid===named.otherKyoko.uid),false);
 let raid=play(named.s,raider.uid,'raid',named.base.uid);
 const top=field(raid,0,raider.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,named.base.uid);
 assert.equal(raid.pending.kind,'effect-retire-bp');
 assert.equal(raid.pending.optional,true);
 assert.equal(raid.pending.limit,2000);
 assert.ok(raid.pending.choices.includes(named.low.uid));
 assert.equal(raid.pending.choices.includes(named.high.uid),false);
 assert.ok(acts(raid).some(a=>a.type==='chooseRetireBp'&&a.uid===null));
 raid=pick(raid,a=>a.type==='chooseRetireBp'&&a.uid===named.low.uid);
 assert.ok(raid.players[1].outside.some(c=>c.uid===named.low.uid));
 assert.ok(raid.players[1].front.some(c=>c?.uid===named.high.uid));
 assert.equal(raid.pending,null);
 assertUniversalMatch(packs,raid);
});

test('MMM-1-079 and MMM-1-080 step only during the move phase',()=>{
 const counts=countsFor(['MMM-1-079','MMM-1-080','MMM-1-076']);
 let s=toPhase(fresh(counts,13080),'move');
 const kyoko=put(s,0,'MMM-1-079','front',0,true);
 const other=put(s,0,'MMM-1-080','front',1,true);
 const plain=put(s,0,'MMM-1-076','front',2,true);
 assert.ok(acts(s).some(a=>a.type==='step'&&a.uid===kyoko.uid&&a.slot===0));
 assert.ok(acts(s).some(a=>a.type==='step'&&a.uid===other.uid));
 assert.equal(acts(s).some(a=>a.type==='step'&&a.uid===plain.uid),false);
 s=pick(s,a=>a.type==='step'&&a.uid===kyoko.uid&&a.slot===0);
 assert.equal(s.players[0].energy[0].uid,kyoko.uid);
 assert.equal(s.players[0].front[0],null);
 s=toPhase(s,'main');
 assert.equal(acts(s).some(a=>a.type==='step'),false);
 assertUniversalMatch(packs,s);
});

test('MMM-1-081 adds red energy only while active on the energy line',()=>{
 const counts=countsFor(['MMM-1-081','MMM-1-076']);
 let s=fresh(counts,13081);
 const energy=put(s,0,'MMM-1-081','energy',0,true);
 assert.equal(universalCardEnergy(packs,s,0,energy),2);
 assert.equal(universalEnergyByColor(packs,s,0).red,2);
 energy.ready=false;
 assert.equal(universalCardEnergy(packs,s,0,energy),1);
 assert.equal(universalEnergyByColor(packs,s,0).red,1);
 energy.ready=true;
 const front=put(s,0,'MMM-1-081','front',0,true);
 assert.equal(universalCardEnergy(packs,s,0,front),0);
 assert.equal(universalEnergyByColor(packs,s,0).red,2);
 assertUniversalMatch(packs,s);
});

test('MMM-1-082 may rest-play one cheap red magical girl and can take none',()=>{
 const counts=countsFor(['MMM-1-082','MMM-1-079','MMM-1-078','MMM-1-006','MMM-1-076']);
 let s=toPhase(fresh(counts,13082),'main');
 put(s,0,'MMM-1-076','energy',0,true);
 put(s,0,'MMM-1-076','energy',1,true);
 put(s,0,'MMM-1-076','energy',2,true);
 const girl=toHand(s,0,'MMM-1-079');
 const heavy=toHand(s,0,'MMM-1-078');
 const yellow=toHand(s,0,'MMM-1-006');
 const played=toHand(s,0,'MMM-1-082');
 readyAp(s);
 s=play(s,played.uid);
 assert.equal(field(s,0,played.uid).ready,false);
 assert.equal(s.pending.kind,'effect-hand-rest');
 const choices=acts(s).filter(a=>a.type==='chooseHandRest'&&a.uid);
 assert.ok(choices.some(a=>a.uid===girl.uid&&a.line==='front'));
 assert.equal(choices.some(a=>a.uid===heavy.uid),false);
 assert.equal(choices.some(a=>a.uid===yellow.uid),false);
 assert.ok(acts(s).some(a=>a.type==='chooseHandRest'&&a.uid===null));
 let declined=pick(s,a=>a.type==='chooseHandRest'&&a.uid===null);
 assert.equal(declined.pending,null);
 assert.ok(declined.players[0].hand.some(c=>c.uid===girl.uid));
 assertUniversalMatch(packs,declined);

 let taken=toPhase(fresh(counts,13083),'main');
 put(taken,0,'MMM-1-076','energy',0,true);
 put(taken,0,'MMM-1-076','energy',1,true);
 put(taken,0,'MMM-1-076','energy',2,true);
 const ally=toHand(taken,0,'MMM-1-079');
 const again=toHand(taken,0,'MMM-1-082');
 readyAp(taken);
 taken=play(taken,again.uid);
 taken=pick(taken,a=>a.type==='chooseHandRest'&&a.uid===ally.uid&&a.line==='front'&&a.slot===1);
 assert.equal(taken.players[0].front[1].uid,ally.uid);
 assert.equal(taken.players[0].front[1].ready,false);
 assert.equal(taken.pending,null);
 assertUniversalMatch(packs,taken);
});

test('MMM-1-083 gains double attack only after a life card, and the raid attack buff is separate',()=>{
 const counts=countsFor(['MMM-1-083','MMM-1-079','MMM-1-076','MMM-1-089','MMM-1-080']);
 function raidKyoko(seed){
  let s=toPhase(fresh(counts,seed),'main');
  put(s,0,'MMM-1-076','energy',0,true);
  put(s,0,'MMM-1-076','energy',1,true);
  put(s,0,'MMM-1-076','energy',2,true);
  put(s,0,'MMM-1-076','energy',3,true);
  const base=put(s,0,'MMM-1-079','front',0,true);
  const sayaka=put(s,0,'MMM-1-089','front',1,false);
  const wall=put(s,1,'MMM-1-076','front',0,true);
  const raider=toHand(s,0,'MMM-1-083');
  readyAp(s);
  s=play(s,raider.uid,'raid',base.uid);
  assert.equal(field(s,0,raider.uid).ready,true);
  assert.equal(field(s,0,raider.uid).stack[0].uid,base.uid);
  assert.equal(s.pending,null);
  return {s,raider,sayaka,wall};
 }
 const dry=raidKyoko(13084);
 setLife(dry.s,1,['MMM-1-080','MMM-1-080']);
 let quiet=toPhase(dry.s,'attack');
 quiet=use(quiet,{type:'attack',uid:dry.raider.uid});
 assert.equal(field(quiet,0,dry.raider.uid).ready,false);
 assert.equal(quiet.pending.kind,'effect-buff-own');
 assert.equal(quiet.pending.optional,true);
 quiet=pick(quiet,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 assert.equal(quiet.pending.kind,'block');
 quiet=pick(quiet,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(quiet.pending,null);
 assertUniversalMatch(packs,quiet);

 const live=raidKyoko(13085);
 setLife(live.s,0,['MMM-1-080','MMM-1-080','MMM-1-080','MMM-1-080']);
 setLife(live.s,1,['MMM-1-080','MMM-1-080','MMM-1-080','MMM-1-080']);
 const life=live.s.players[0].life[0];
 let armed=use(live.s,{type:'activate',uid:live.sayaka.uid,mode:'lifeActive'});
 assert.equal(armed.pending.optional,false);
 assert.equal(acts(armed).some(a=>a.uid===null),false);
 armed=use(armed,{type:'chooseLifeActive',uid:life.uid});
 assert.equal(armed.publicReveals.some(entry=>entry.uid===life.uid),false);
 armed=toPhase(armed,'attack');
 armed=use(armed,{type:'attack',uid:live.raider.uid});
 assert.equal(field(armed,0,live.raider.uid).ready,true);
 assert.equal(armed.pending.kind,'effect-buff-own');
 assert.equal(armed.pending.optional,true);
 assert.ok(armed.pending.choices.includes(live.raider.uid));
 armed=pick(armed,a=>a.type==='chooseOwnBuff'&&a.uid===live.raider.uid);
 assert.equal(universalBp(packs,armed,field(armed,0,live.raider.uid)),5000);
 assert.equal(armed.pending.kind,'block');
 armed=pick(armed,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(armed.pending,null);
 armed=use(armed,{type:'attack',uid:live.raider.uid});
 assert.equal(field(armed,0,live.raider.uid).ready,false);
 assert.equal(armed.pending.kind,'effect-buff-own');
 armed=pick(armed,a=>a.type==='chooseOwnBuff'&&a.uid===null);
 armed=pick(armed,a=>a.type==='chooseBlock'&&a.uid===null);
 armed=passUntil(armed,s=>s.active===1&&s.phase==='main');
 assert.equal(universalBp(packs,armed,field(armed,0,live.raider.uid)),4000);
 assertUniversalMatch(packs,armed);

 let plain=toPhase(fresh(counts,13086),'main');
 const bare=put(plain,0,'MMM-1-083','front',0,true);
 const helper=put(plain,0,'MMM-1-089','front',1,false);
 put(plain,1,'MMM-1-076','front',0,true);
 setLife(plain,0,['MMM-1-080','MMM-1-080','MMM-1-080','MMM-1-080']);
 setLife(plain,1,['MMM-1-080','MMM-1-080']);
 plain=use(plain,{type:'activate',uid:helper.uid,mode:'lifeActive'});
 plain=use(plain,{type:'chooseLifeActive',uid:plain.players[0].life[0].uid});
 plain=toPhase(plain,'attack');
 plain=use(plain,{type:'attack',uid:bare.uid});
 assert.equal(field(plain,0,bare.uid).ready,false);
 assert.equal(plain.pending.kind,'block');
 assert.equal((field(plain,0,bare.uid).stack||[]).length,0);
 plain=pick(plain,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(plain.pending,null);
 assertUniversalMatch(packs,plain);
});

test('MMM-1-084 draws one and must put one hand card outside',()=>{
 const counts=countsFor(['MMM-1-084','MMM-1-076']);
 let s=toPhase(fresh(counts,13087),'main');
 const played=toHand(s,0,'MMM-1-084');
 const before=new Set(s.players[0].hand.map(c=>c.uid));
 readyAp(s,0,1);
 const deck=s.players[0].deck.length;
 s=play(s,played.uid);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(acts(s).some(a=>a.uid==null),false);
 assert.equal(s.players[0].deck.length,deck-1);
 const drawn=s.players[0].hand.find(c=>!before.has(c.uid));
 assert.ok(drawn);
 s=pick(s,a=>a.type==='chooseDiscard'&&a.uid===drawn.uid);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===drawn.uid));
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn.uid),false);
 assert.ok(field(s,0,played.uid));
 assertUniversalMatch(packs,s);
});

test('MMM-1-085 bounces another energy-1 character, or itself when none exists',()=>{
 const counts=countsFor(['MMM-1-085','MMM-1-076','MMM-1-077']);
 let s=toPhase(fresh(counts,13088),'main');
 put(s,0,'MMM-1-077','energy',0,true);
 const low=put(s,0,'MMM-1-076','front',0,true);
 const heavy=put(s,0,'MMM-1-077','front',1,true);
 const played=toHand(s,0,'MMM-1-085');
 readyAp(s);
 s=play(s,played.uid);
 assert.equal(s.pending.kind,'effect-bounce-own');
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 assert.equal(s.pending.choices.includes(played.uid),false);
 assert.equal(acts(s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseOwnBounce'&&a.uid===low.uid);
 assert.ok(s.players[0].hand.some(c=>c.uid===low.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===low.uid),false);
 assert.ok(field(s,0,played.uid));
 assert.ok(field(s,0,heavy.uid));
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);

 let alone=toPhase(fresh(counts,13089),'main');
 put(alone,0,'MMM-1-077','energy',0,true);
 put(alone,0,'MMM-1-077','front',0,true);
 const self=toHand(alone,0,'MMM-1-085');
 readyAp(alone);
 const hand=alone.players[0].hand.length;
 alone=play(alone,self.uid);
 assert.equal(alone.pending,null);
 assert.equal(field(alone,0,self.uid),null);
 assert.ok(alone.players[0].hand.some(c=>c.uid===self.uid));
 assert.equal(alone.players[0].outside.some(c=>c.uid===self.uid),false);
 assert.equal(alone.players[0].hand.length,hand);
 assertUniversalMatch(packs,alone);
});

test('MMM-1-087 gains 1000 BP on its own turn only while Kyoko is on the field',()=>{
 const counts=countsFor(['MMM-1-087','MMM-1-079','MMM-1-076']);
 let s=fresh(counts,13090);
 const sayaka=put(s,0,'MMM-1-087','front',0,true);
 assert.equal(universalBp(packs,s,sayaka),2000);
 const kyoko=put(s,0,'MMM-1-079','energy',0,true);
 assert.equal(universalBp(packs,s,sayaka),3000);
 s.active=1;
 assert.equal(universalBp(packs,s,sayaka),2000);
 s.active=0;
 assert.equal(universalBp(packs,s,sayaka),3000);
 s.players[0].energy[0]=null;
 s.players[0].hand.push(kyoko);
 assert.equal(universalBp(packs,s,sayaka),2000);
 put(s,1,'MMM-1-079','front',0,true);
 assert.equal(universalBp(packs,s,sayaka),2000);
 assertUniversalMatch(packs,s);
});

test('MMM-1-088 and a raided MMM-1-090 stop impact, and an ordinary Sayaka has none',()=>{
 const counts=countsFor(['MMM-1-090','MMM-1-088','MMM-1-087','MMM-1-076','MMM-1-079']);
 function raided(seed){
  let s=toPhase(fresh(counts,seed),'main');
  put(s,0,'MMM-1-076','energy',0,true);
  put(s,0,'MMM-1-076','energy',1,true);
  put(s,0,'MMM-1-076','energy',2,true);
  put(s,0,'MMM-1-076','energy',3,true);
  const base=put(s,0,'MMM-1-087','front',0,true);
  const raider=toHand(s,0,'MMM-1-090');
  readyAp(s);
  s=play(s,raider.uid,'raid',base.uid);
  const top=field(s,0,raider.uid);
  assert.equal(top.ready,true);
  assert.equal(universalImpact(packs,s,top),1);
  assert.equal(universalImpactNull(packs,s,top),true);
  return {s,raider};
 }
 let nulled=raided(13091).s;
 const raider=nulled.players[0].front.find(c=>c?.cardId==='MMM-1-090');
 const wall=put(nulled,1,'MMM-1-088','front',0,true);
 setLife(nulled,1,['MMM-1-079','MMM-1-079']);
 assert.equal(universalImpactNull(packs,nulled,wall),true);
 nulled=toPhase(nulled,'attack');
 nulled=use(nulled,{type:'attack',uid:raider.uid});
 nulled=pick(nulled,a=>a.type==='chooseBlock'&&a.uid===wall.uid);
 assert.equal(nulled.players[1].life.length,2);
 assert.ok(nulled.players[1].outside.some(c=>c.uid===wall.uid));
 assert.equal(nulled.pending,null);
 assertUniversalMatch(packs,nulled);

 let struck=raided(13092).s;
 const attacker=struck.players[0].front.find(c=>c?.cardId==='MMM-1-090');
 const small=put(struck,1,'MMM-1-076','front',0,true);
 setLife(struck,1,['MMM-1-079','MMM-1-079']);
 struck=toPhase(struck,'attack');
 struck=use(struck,{type:'attack',uid:attacker.uid});
 struck=pick(struck,a=>a.type==='chooseBlock'&&a.uid===small.uid);
 assert.equal(struck.players[1].life.length,1);
 assert.ok(struck.players[1].outside.some(c=>c.uid===small.uid));
 assert.equal(struck.pending,null);
 assertUniversalMatch(packs,struck);

 let plain=toPhase(fresh(counts,13093),'main');
 put(plain,0,'MMM-1-076','energy',0,true);
 put(plain,0,'MMM-1-076','energy',1,true);
 put(plain,0,'MMM-1-076','energy',2,true);
 put(plain,0,'MMM-1-076','energy',3,true);
 const ordinary=toHand(plain,0,'MMM-1-090');
 readyAp(plain);
 plain=play(plain,ordinary.uid);
 const copy=field(plain,0,ordinary.uid);
 assert.equal(copy.ready,false);
 assert.equal((copy.stack||[]).length,0);
 assert.equal(universalImpact(packs,plain,copy),0);
 assert.equal(universalImpactNull(packs,plain,copy),false);
 assert.equal(acts(plain).some(a=>a.type==='activate'&&a.uid===copy.uid),false);
 assert.equal(plain.pending,null);
 assertUniversalMatch(packs,plain);
});

test('MMM-1-090 keeps the gained leave text until the next own turn starts',()=>{
 const counts=countsFor(['MMM-1-090','MMM-1-087','MMM-1-076','MMM-1-078','MMM-1-079']);
 let s=toPhase(fresh(counts,13094),'main');
 put(s,0,'MMM-1-076','energy',0,true);
 put(s,0,'MMM-1-076','energy',1,true);
 put(s,0,'MMM-1-076','energy',2,true);
 put(s,0,'MMM-1-076','energy',3,true);
 const base=put(s,0,'MMM-1-087','front',0,true);
 const big=put(s,1,'MMM-1-078','front',0,true);
 const raider=toHand(s,0,'MMM-1-090');
 readyAp(s);
 s=play(s,raider.uid,'raid',base.uid);
 const reveals=s.publicReveals.length;
 const life=s.players[0].life[0];
 s=use(s,{type:'activate',uid:raider.uid,mode:'lifeReenter'});
 assert.equal(s.pending.kind,'effect-life-reenter-grant');
 assert.equal(acts(s).some(a=>a.uid===null),false);
 s=use(s,{type:'chooseLifeReenter',uid:life.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===life.uid));
 assert.equal(s.publicReveals.length,reveals);
 assert.equal(s.publicReveals.some(entry=>entry.uid===life.uid),false);
 assert.equal(field(s,0,raider.uid).reenterOrRaidUntil.untilOwnTurnStart,
  s.players[0].ownTurns+1);
 assert.equal(acts(s).some(a=>a.type==='activate'&&a.uid===raider.uid),false);
 s=passUntil(s,x=>x.active===1&&x.phase==='main');
 assert.equal(field(s,0,raider.uid).reenterOrRaidUntil.untilOwnTurnStart,
  s.players[0].ownTurns+1);
 s=passUntil(s,x=>x.active===0&&x.phase==='start');
 assert.equal(field(s,0,raider.uid).reenterOrRaidUntil,undefined);
 s=passUntil(s,x=>x.active===1&&x.phase==='attack');
 const hunter=field(s,1,big.uid);
 hunter.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,hunter),6000);
 assert.equal(field(s,0,raider.uid).ready,true);
 s=use(s,{type:'attack',uid:big.uid});
 s=pick(s,a=>a.type==='chooseBlock'&&a.uid===raider.uid);
 assert.notEqual(s.pending?.kind,'effect-sayaka-reenter');
 assert.ok(s.players[0].outside.some(c=>c.uid===raider.uid));
 assert.ok(field(s,1,big.uid));
 assertUniversalMatch(packs,s);
});

test('MMM-1-091 buff lasts only this turn and still requires a magical girl',()=>{
 const counts=countsFor(['MMM-1-091','MMM-1-085','MMM-1-037','MMM-1-076']);
 let s=toPhase(fresh(counts,13095),'main');
 put(s,0,'MMM-1-076','energy',0,true);
 put(s,0,'MMM-1-076','energy',1,true);
 put(s,0,'MMM-1-085','energy',2,true);
 const bystander=put(s,0,'MMM-1-037','front',0,true);
 const town=toHand(s,0,'MMM-1-091');
 readyAp(s);
 s=pick(s,a=>a.type==='play'&&a.uid===town.uid&&a.line==='energy');
 const placed=field(s,0,town.uid);
 assert.equal(placed.ready,true);
 const girl=s.players[0].energy[2];
 s=use(s,{type:'activate',uid:town.uid,mode:'fieldTraitBuff'});
 assert.equal(field(s,0,town.uid).ready,false);
 assert.equal(s.pending.optional,false);
 assert.ok(s.pending.choices.includes(girl.uid));
 assert.equal(s.pending.choices.includes(bystander.uid),false);
 assert.equal(acts(s).some(a=>a.uid===null),false);
 s=pick(s,a=>a.type==='chooseOwnBuff'&&a.uid===girl.uid);
 assert.equal(universalBp(packs,s,field(s,0,girl.uid)),2000);
 s=passUntil(s,x=>x.active===1&&x.phase==='main');
 assert.equal(universalBp(packs,s,field(s,0,girl.uid)),1500);
 assertUniversalMatch(packs,s);
});

test('MMM-1-094 raises the cap only while Madoka is on the field',()=>{
 const counts=countsFor(['MMM-1-094','MMM-1-076','MMM-1-069','MMM-1-020','MMM-1-085']);
 function scene(seed,withMadoka){
  let s=toPhase(fresh(counts,seed),'main');
  put(s,0,'MMM-1-085','energy',0,true);
  put(s,0,'MMM-1-085','energy',1,true);
  if(withMadoka)put(s,0,'MMM-1-076','front',0,true);
  const low=put(s,1,'MMM-1-076','front',0,true);
  const high=put(s,1,'MMM-1-020','front',1,true);
  const event=toHand(s,0,'MMM-1-094');
  readyAp(s);
  return {s,event,low,high};
 }
 const plain=scene(13096,false);
 let capped=play(plain.s,plain.event.uid,'event');
 assert.equal(capped.pending.limit,3000);
 assert.deepEqual(capped.pending.choices,[plain.low.uid]);
 assert.equal(acts(capped).some(a=>a.uid===null),false);
 capped=pick(capped,a=>a.type==='chooseRetireBp'&&a.uid===plain.low.uid);
 assert.ok(capped.players[1].outside.some(c=>c.uid===plain.low.uid));
 assert.equal(capped.pending,null);
 assertUniversalMatch(packs,capped);

 const named=scene(13097,true);
 let raised=play(named.s,named.event.uid,'event');
 assert.equal(raised.pending.limit,5000);
 assert.ok(raised.pending.choices.includes(named.low.uid));
 assert.ok(raised.pending.choices.includes(named.high.uid));
 assert.equal(acts(raised).some(a=>a.uid===null),false);
 raised=pick(raised,a=>a.type==='chooseRetireBp'&&a.uid===named.high.uid);
 assert.ok(raised.players[1].outside.some(c=>c.uid===named.high.uid));
 assert.equal(raised.pending,null);
 assertUniversalMatch(packs,raised);

 let blocked=toPhase(fresh(counts,13098),'main');
 put(blocked,0,'MMM-1-085','energy',0,true);
 put(blocked,0,'MMM-1-085','energy',1,true);
 put(blocked,1,'MMM-1-020','front',0,true);
 const denied=toHand(blocked,0,'MMM-1-094');
 readyAp(blocked);
 assert.equal(acts(blocked).some(a=>a.type==='event'&&a.uid===denied.uid),false);
 assertUniversalMatch(packs,blocked);
});

test('MMM-1-095 readies up to two AP cards and the final trigger needs an empty life',()=>{
 const counts=countsFor(['MMM-1-095','MMM-1-076','MMM-1-085']);
 let s=toPhase(fresh(counts,13099),'main');
 put(s,0,'MMM-1-085','energy',0,true);
 put(s,0,'MMM-1-076','energy',1,true);
 const event=toHand(s,0,'MMM-1-095');
 readyAp(s,0,3);
 s.players[0].apCards[0].ready=false;
 s.players[0].apCards[1].ready=false;
 s=play(s,event.uid,'event');
 assert.equal(s.pending.kind,'effect-recover-ap');
 assert.equal(s.pending.remaining,2);
 const first=s.players[0].apCards[0].uid;
 const second=s.players[0].apCards[1].uid;
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===first);
 assert.equal(s.pending.remaining,1);
 s=pick(s,a=>a.type==='chooseApRecovery'&&a.uid===null);
 assert.equal(s.players[0].apCards[0].ready,true);
 assert.equal(s.players[0].apCards[1].ready,false);
 assert.equal(s.pending,null);
 assertUniversalMatch(packs,s);
});

test('MMM-1-098 looks at five privately and may publish none',()=>{
 const counts=countsFor(['MMM-1-098','MMM-1-085','MMM-1-075','MMM-1-072','MMM-1-037','MMM-1-029','MMM-1-061']);
 let none=toPhase(fresh(counts,13100),'main');
 put(none,0,'MMM-1-085','energy',0,true);
 const window=stackTop(none,0,['MMM-1-075','MMM-1-072','MMM-1-037','MMM-1-029','MMM-1-061']);
 const event=toHand(none,0,'MMM-1-098');
 readyAp(none,0,2);
 none.players[0].apCards[0].ready=false;
 none=play(none,event.uid,'event');
 assert.equal(none.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(universalPrivateChoices(packs,none,0).inspected.map(c=>c.uid),
  window.map(c=>c.uid));
 assertHidden(none,window.map(c=>c.uid));
 assert.equal(acts(none).some(a=>a.uid===window[0].uid),true);
 assert.equal(acts(none).some(a=>a.uid===window[3].uid),false);
 assert.ok(acts(none).some(a=>a.type==='chooseTopFiltered'&&a.uid===null));
 none=pick(none,a=>a.type==='chooseTopFiltered'&&a.uid===null);
 assert.equal(none.publicReveals.some(entry=>window.some(c=>c.uid===entry.uid)),false);
 none=orderRest(none);
 assert.equal(none.pending,null);
 assert.equal(none.players[0].apCards[0].ready,false);
 assert.equal(none.players[0].deck.slice(-5).map(c=>c.uid).sort().join(),
  window.map(c=>c.uid).sort().join());
 assertUniversalMatch(packs,none);

 let one=toPhase(fresh(counts,13101),'main');
 put(one,0,'MMM-1-085','energy',0,true);
 const looked=stackTop(one,0,['MMM-1-075','MMM-1-072','MMM-1-037','MMM-1-029','MMM-1-061']);
 const spell=toHand(one,0,'MMM-1-098');
 readyAp(one,0,2);
 one.players[0].apCards[0].ready=false;
 one=play(one,spell.uid,'event');
 one=pick(one,a=>a.type==='chooseTopFiltered'&&a.uid===looked[1].uid);
 assert.equal(one.publicReveals.some(entry=>entry.uid===looked[1].uid),true);
 assertHidden(one,[looked[0].uid,looked[2].uid,looked[3].uid,looked[4].uid]);
 assert.equal(one.pending.kind,'effect-top-order');
 one=orderRest(one);
 assert.equal(one.pending,null);
 assert.equal(one.players[0].apCards[0].ready,false);
 assert.ok(one.players[0].hand.some(c=>c.uid===looked[1].uid));
 assertUniversalMatch(packs,one);
});

test('MMM-1-099 may retire nobody under the printed cap',()=>{
 const counts=countsFor(['MMM-1-099','MMM-1-009','MMM-1-085','MMM-1-069','MMM-1-020']);
 let s=toPhase(fresh(counts,13102),'main');
 put(s,0,'MMM-1-085','energy',0,true);
 put(s,0,'MMM-1-085','energy',1,true);
 put(s,0,'MMM-1-009','front',0,true);
 const low=put(s,1,'MMM-1-069','front',0,true);
 const over=put(s,1,'MMM-1-020','front',1,true);
 over.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,over),5500);
 const event=toHand(s,0,'MMM-1-099');
 readyAp(s,0,1);
 s=play(s,event.uid,'event');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.limit,5000);
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(over.uid),false);
 s=pick(s,a=>a.type==='chooseRetireBp'&&a.uid===null);
 assert.equal(s.pending,null);
 assert.ok(s.players[1].front.some(c=>c?.uid===low.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===over.uid));
 assertUniversalMatch(packs,s);
});
