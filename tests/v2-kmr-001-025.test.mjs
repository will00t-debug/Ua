import test from 'node:test';
import assert from 'node:assert/strict';
import {KMR_CARDS} from '../dist/kmr-cards.mjs';
import {createKmrV2Pack} from '../dist/universal-v2/kmr-pack.mjs';
import {createCsmV2Pack} from '../dist/universal-v2/csm-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,newUniversalMatch,
 universalAttackDamage,universalBp,universalCardEnergy,universalEnergyByColor,universalImpact,
 universalImpactNull,universalPrivateChoices,zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Behavior checks for UA29BT / UA29ST KMR-1-001 through KMR-1-025.
// A green run is not an official FAQ certification of every sentence.

const pack=createKmrV2Pack();
const packs=[pack,pack];
const csm=createCsmV2Pack();
const sao=registeredV2TitlePack('sword-art-online');
const FUEL=['KMR-1-026','KMR-1-027','KMR-1-103','KMR-1-105'];
const text=id=>KMR_CARDS.find(c=>c.id===id).effectJa;

function countsFor(required,source=pack){
 const fillers=Object.values(source.cards).filter(c=>!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const caps={special:0,color:0,final:0},counts={};
 for(const id of [...new Set(required)]){
  const trigger=source.cards[id].trigger;
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
  const trigger=source.cards[id].trigger;
  let add=room;
  if(trigger==='special'||trigger==='color'||trigger==='final')
   add=Math.min(add,4-(caps[trigger]||0));
  if(add<=0)continue;
  counts[id]=(counts[id]||0)+add;
  total+=add;
  if(Object.prototype.hasOwnProperty.call(caps,trigger))caps[trigger]+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(source,counts),[]);
 return counts;
}
function withCopies(ids,extras,source=pack){
 const counts=countsFor(ids,source);
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
  assert.equal(need,0,'deck has no room for '+id);
 }
 assert.equal(Object.values(counts).reduce((n,x)=>n+x,0),50);
 assert.deepEqual(validateUniversalDeck(source,counts),[]);
 return counts;
}
function open(ids,seed,titlePacks=packs,source=pack){
 const counts=Array.isArray(ids)?countsFor(ids,source):ids;
 return newUniversalMatch(titlePacks,{decks:[counts,counts],seed,first:0});
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone],index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id+' for player '+p);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 card.entryTurn=s.turn;
 s.players[p][line][slot]=card;
 return card;
}
function fuel(s,p=0){FUEL.forEach((id,i)=>put(s,p,id,'energy',i,true));}
function ready(s){
 s.pending=null;s.phase='main';
 for(const side of s.players)for(const ap of side.apCards){ap.inPlay=true;ap.ready=true;}
}
function use(titlePacks,s,pred){
 const action=legalUniversalActions(titlePacks,s).find(pred);
 if(!action)throw Error('No legal action; pending '+(s.pending?.kind||'-')+'/'+(s.pending?.step||''));
 return dispatchUniversalAction(titlePacks,s,action);
}
function play(s,uid,line='front'){
 return use(packs,s,a=>a.type==='play'&&a.uid===uid&&a.line===line&&a.replaceUid==null);
}
function raidOnto(s,uid,baseUid){
 return use(packs,s,a=>a.type==='raid'&&a.uid===uid&&a.baseUid===baseUid&&a.line==='front');
}
function kmr(s,pred){return use(packs,s,a=>a.type==='kmr'&&pred(a));}
function onlyHand(s,p,cards){
 s.players[p].deck.push(...s.players[p].hand.splice(0));
 s.players[p].hand.push(...cards);
}
function apReady(s,p=0){return s.players[p].apCards.filter(c=>c.ready).length;}
function silence(s,card,controller){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller,sourceUid:card.uid,
  targetUid:card.uid,sourceLinked:false,until:{player:controller,phase:'start',edge:'start'}});
}
function ownMainAgain(s){
 const turn=s.turn;let guard=0;
 while(!(s.turn>turn&&s.active===0&&s.phase==='main')){
  if(s.pending)throw Error('Pending '+s.pending.kind+'/'+(s.pending.step||'')+' blocked the turn');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>20)throw Error('Stuck in '+s.phase+' turn '+s.turn+' active '+s.active);
 }
 return s;
}
function toAttack(s){
 let guard=0;
 while(s.phase!=='attack'){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked attack');
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach attack ('+s.phase+')');
 }
 return s;
}
function activates(s,uid){
 return legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===uid);
}

test('KMR-1-001 discounts trait AP2, stays rested when the mill makes five, and may retire',()=>{
 assert.match(text('KMR-1-001'),/5枚以上：このキャラはアクティブで場に登場させる/);
 assert.match(text('KMR-1-001'),/10枚を場外に置いてもよい/);
 const printed=pack.cards['KMR-1-001'];
 const ids=['KMR-1-001','KMR-1-021','KMR-1-024','KMR-1-004','KMR-1-008',...FUEL,
  'KMR-1-006','KMR-1-010','KMR-1-016','KMR-1-017','KMR-1-018','KMR-1-002','KMR-1-007','KMR-1-011','KMR-1-015'];
 const counts=withCopies(ids,{'KMR-1-021':4});
 const cost=open(counts,1101);
 fuel(cost);
 assert.equal(zoneRequiredEnergy(pack,cost,0,printed,'hand'),10);
 cost.players[0].outside.push(take(cost,0,'KMR-1-004'));
 assert.equal(zoneRequiredEnergy(pack,cost,0,printed,'hand'),10);
 cost.players[0].hand.push(...cost.players[0].outside.splice(0));
 for(let i=0;i<2;i++)cost.players[0].outside.push(take(cost,0,'KMR-1-021'));
 assert.equal(zoneRequiredEnergy(pack,cost,0,printed,'hand'),5);
 const thin=structuredClone(cost);
 for(const slot of [2,3]){
  thin.players[0].outside.push(thin.players[0].energy[slot]);
  thin.players[0].energy[slot]=null;
 }
 const thinArk=take(thin,0,'KMR-1-001');
 onlyHand(thin,0,[thinArk]);
 ready(thin);
 assert.equal(legalUniversalActions(packs,thin).some(a=>a.type==='play'&&a.uid===thinArk.uid),false);

 const rested=open(counts,1102);
 fuel(rested);
 for(let i=0;i<4;i++)rested.players[0].outside.push(take(rested,0,'KMR-1-021'));
 const window=['KMR-1-024','KMR-1-006','KMR-1-010','KMR-1-016','KMR-1-017','KMR-1-018',
  'KMR-1-002','KMR-1-007','KMR-1-011','KMR-1-015'].map(id=>take(rested,0,id));
 rested.players[0].deck.unshift(...window);
 const ark=take(rested,0,'KMR-1-001');
 onlyHand(rested,0,[ark]);
 const legal=put(rested,1,'KMR-1-008','front',0,true);
 const high=put(rested,1,'KMR-1-004','front',1,true);
 ready(rested);
 let s=play(rested,ark.uid);
 assert.equal(s.players[0].front.find(c=>c?.uid===ark.uid).ready,false);
 assert.equal(universalImpact(pack,s,s.players[0].front.find(c=>c?.uid===ark.uid)),1);
 assert.deepEqual(s.pending.data.uids,window.map(c=>c.uid));
 assert.equal(universalPrivateChoices(packs,s,0).inspected.length,10);
 assert.equal(universalPrivateChoices(packs,s,1),null);
 s=kmr(s,a=>a.mode==='mill');
 assert.equal(s.players[0].front.find(c=>c?.uid===ark.uid).ready,false);
 const chosen=s.pending.actions.filter(a=>a.mode==='retire').map(a=>a.uid);
 assert.equal(chosen.includes(legal.uid),true);
 assert.equal(chosen.includes(high.uid),false);
 s=kmr(s,a=>a.mode==='skip');

 const woke=open(counts,1103);
 fuel(woke);
 for(let i=0;i<4;i++)woke.players[0].outside.push(take(woke,0,'KMR-1-021'));
 woke.players[0].outside.push(take(woke,0,'KMR-1-024'));
 const live=take(woke,0,'KMR-1-001');
 onlyHand(woke,0,[live]);
 ready(woke);
 let active=play(woke,live.uid);
 assert.equal(active.players[0].front.find(c=>c?.uid===live.uid).ready,true);
 active=kmr(active,a=>a.mode==='skip');
 assert.equal(active.players[0].front.find(c=>c?.uid===live.uid).ready,true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,active),true);
});

test('KMR-1-014 publishes the top card and only a non-yellow raid raises Woz',()=>{
 assert.match(text('KMR-1-014'),/【レイド】を持つ黄以外/);
 assert.match(text('KMR-1-002'),/BP\+1500/);
 const ids=['KMR-1-014','KMR-1-002','KMR-1-013','KMR-1-086',...FUEL];
 const skipped=open(ids,1201);
 fuel(skipped);
 put(skipped,0,'KMR-1-002','front',0,true);
 const hidden=take(skipped,0,'KMR-1-086');
 skipped.players[0].deck.unshift(hidden);
 const first=take(skipped,0,'KMR-1-014');
 onlyHand(skipped,0,[first]);
 ready(skipped);
 let s=play(skipped,first.uid);
 assert.equal(s.publicReveals.some(e=>e.uid===hidden.uid),false);
 s=kmr(s,a=>a.mode==='skip');
 assert.equal(s.players[0].deck[0].uid,hidden.uid);
 assert.equal(s.kmrRaidToHand?.[0],undefined);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),1500);

 const yellow=open(ids,1202);
 fuel(yellow);
 put(yellow,0,'KMR-1-002','front',0,true);
 const zio=take(yellow,0,'KMR-1-013');
 yellow.players[0].deck.unshift(zio);
 const second=take(yellow,0,'KMR-1-014');
 onlyHand(yellow,0,[second]);
 ready(yellow);
 let y=play(yellow,second.uid);
 y=kmr(y,a=>a.mode==='reveal');
 assert.equal(y.publicReveals.some(e=>e.uid===zio.uid),true);
 assert.equal(y.pending.step,'topPlace');
 y=kmr(y,a=>a.mode==='bottom');
 assert.equal(y.players[0].deck.at(-1).uid,zio.uid);
 assert.equal(y.kmrRaidToHand?.[0],undefined);
 assert.equal(universalBp(packs,y,y.players[0].front[0]),1500);

 const red=open(ids,1203);
 fuel(red);
 put(red,0,'KMR-1-002','front',0,true);
 const faiz=take(red,0,'KMR-1-086');
 red.players[0].deck.unshift(faiz);
 const third=take(red,0,'KMR-1-014');
 onlyHand(red,0,[third]);
 ready(red);
 let r=play(red,third.uid);
 r=kmr(r,a=>a.mode==='reveal');
 assert.equal(r.players[0].hand.some(c=>c.uid===faiz.uid),true);
 assert.equal(r.kmrRaidToHand[0],r.turn);
 assert.equal(universalBp(packs,r,r.players[0].front[0]),3000);
 r.active=1;
 assert.equal(universalBp(packs,r,r.players[0].front[0]),1500);
 r.active=0;
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,y),true);
 assert.equal(assertUniversalMatch(packs,r),true);
});

test('KMR-1-003 is one mandatory choice after the raid-to-hand and resets next turn',()=>{
 assert.match(text('KMR-1-003'),/以下から1つ選ぶ/);
 const ids=['KMR-1-003','KMR-1-014','KMR-1-086',...FUEL];
 let s=open(ids,1301);
 fuel(s);
 const self=put(s,0,'KMR-1-003','front',0,true);
 s.players[0].deck.unshift(take(s,0,'KMR-1-086'));
 const rider=take(s,0,'KMR-1-014');
 onlyHand(s,0,[rider]);
 ready(s);
 assert.equal(activates(s,self.uid),false);
 s=play(s,rider.uid);
 s=kmr(s,a=>a.mode==='reveal');
 assert.equal(activates(s,self.uid),true);
 const duringAttack=toAttack(structuredClone(s));
 assert.equal(activates(duringAttack,self.uid),false);
 s=use(packs,s,a=>a.type==='activate'&&a.uid===self.uid);
 assert.deepEqual(s.pending.actions.map(a=>a.key).sort(),['buff','draw']);
 const drawn=structuredClone(s);
 s=kmr(s,a=>a.key==='buff');
 assert.equal(universalBp(packs,s,s.players[0].front.find(c=>c?.uid===self.uid)),4000);
 assert.equal(activates(s,self.uid),false);
 const hand=drawn.players[0].hand.length;
 const deck=drawn.players[0].deck.length;
 let chose=kmr(drawn,a=>a.key==='draw');
 assert.equal(chose.players[0].deck.length,deck-1);
 assert.equal(chose.pending.step,'discard');
 assert.equal(chose.pending.actions.some(a=>a.mode==='skip'),false);
 chose=kmr(chose,a=>a.mode==='discard');
 assert.equal(chose.players[0].hand.length,hand);
 s=ownMainAgain(s);
 assert.equal(activates(s,self.uid),false);
 s.kmrRaidToHand[0]=s.turn;
 assert.equal(activates(s,self.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(assertUniversalMatch(packs,chose),true);
});
