import test from 'node:test';
import assert from 'node:assert/strict';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {createAotV2Pack} from '../dist/universal-v2/aot-pack.mjs';
import {createIysV2Pack} from '../dist/universal-v2/iys-pack.mjs';
import {createMadokaV2Pack} from '../dist/universal-v2/mmm-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch, dispatchUniversalAction, legalUniversalActions,
 newUniversalMatch, universalBp, universalImpact}
 from '../dist/universal-v2/engine.mjs';

const iysPack=createIysV2Pack();
const aotPack=createAotV2Pack();
const mmmPack=createMadokaV2Pack();

function countsFor(pack,required){
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
  counts[id]=(counts[id]||0)+add;
  total+=add;
 }
 assert.equal(total,50);
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function match(packs,decks,seed){
 return newUniversalMatch(packs,{decks,seed,first:0});
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
 if(s.players[p][line][slot])throw Error('Occupied '+line+' '+slot);
 s.players[p][line][slot]=card;
 return card;
}
function toHand(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toPhase(packs,s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase);
 }
 return s;
}
function acts(packs,s){return legalUniversalActions(packs,s);}
function pick(packs,s,pred){
 const action=acts(packs,s).find(pred);
 if(!action)throw Error('No legal action in '+s.pending?.kind+'/'+(s.pending?.step||''));
 return dispatchUniversalAction(packs,s,action);
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function at(s,p,uid){
 for(const line of ['front','energy']){
  const card=s.players[p][line].find(c=>c?.uid===uid);
  if(card)return card;
 }
 return null;
}
function bpOf(packs,s,p,uid){return universalBp(packs,s,at(s,p,uid));}

function titanBoard(s,{founders=true,extraFront=true}={}){
 put(s,1,'AOT-2-028','front',0,true);
 if(extraFront)put(s,1,'AOT-1-001','front',1,true);
 if(founders){
  put(s,1,'AOT-2-020','energy',0,true);
  put(s,1,'AOT-2-023','energy',1,true);
 }
 return s.players[1].front[0];
}

test('IYS-1-027 cannot reduce a live War Hammer, and the Naraku retire still happens',()=>{
 const packs=[iysPack,aotPack];
 const decks=[
  countsFor(iysPack,['IYS-1-027','IYS-1-026','IYS-1-042']),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-2-023','AOT-1-001'])
 ];
 let s=toPhase(packs,match(packs,decks,28027),'main');
 const actor=put(s,0,'IYS-1-027','front',0,false);
 const naraku=put(s,0,'IYS-1-026','front',1,true);
 const hammer=titanBoard(s);
 const other=s.players[1].front[1];
 const beforeOther=universalBp(packs,s,other);
 s=pick(packs,s,a=>a.type==='activate'&&a.uid===actor.uid);
 assert.equal(s.pending.step,'debuffOptional');
 assert.equal(s.effectProvenance.kind,'character');
 assert.equal(acts(packs,s).some(a=>a.uid===hammer.uid),false);
 assert.equal(acts(packs,s).some(a=>a.mode==='skip'),true);
 assert.equal(acts(packs,s).some(a=>a.uid===other.uid),true);
 s=pick(packs,s,a=>a.mode==='skip');
 assert.equal(s.pending.step,'retireNaraku');
 assert.equal(bpOf(packs,s,1,hammer.uid),4000);
 assert.equal(bpOf(packs,s,1,other.uid),beforeOther);
 assert.equal(at(s,0,actor.uid).ready,true);
 assert.equal(universalImpact(packs,s,at(s,0,actor.uid)),1);
 s=pick(packs,s,a=>a.uid===naraku.uid);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.some(c=>c.uid===naraku.uid),true);
 assert.equal(s.players[0].front.some(c=>c?.uid===actor.uid),true);
 assert.equal(bpOf(packs,s,1,hammer.uid),4000);
 assertUniversalMatch(packs,s);
});

test('War Hammer loses the protection when one founder is missing or its text is silenced',()=>{
 const packs=[iysPack,aotPack];
 const decks=[
  countsFor(iysPack,['IYS-1-027','IYS-1-026']),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-1-001'])
 ];
 let missing=toPhase(packs,match(packs,decks,28028),'main');
 const actor=put(missing,0,'IYS-1-027','front',0,false);
 put(missing,0,'IYS-1-026','front',1,true);
 const hammer=titanBoard(missing,{founders:false,extraFront:false});
 put(missing,1,'AOT-2-020','energy',0,true);
 missing=pick(packs,missing,a=>a.type==='activate'&&a.uid===actor.uid);
 assert.equal(acts(packs,missing).some(a=>a.uid===hammer.uid),true);
 missing=pick(packs,missing,a=>a.uid===hammer.uid);
 assert.equal(bpOf(packs,missing,1,hammer.uid),3000);
 missing=pick(packs,missing,a=>a.mode==='pick');
 assert.equal(missing.pending,null);
 assert.equal(bpOf(packs,missing,1,hammer.uid),3000);
 assertUniversalMatch(packs,missing);

 const both=[
  countsFor(iysPack,['IYS-1-027','IYS-1-026']),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-2-023'])
 ];
 let silent=toPhase(packs,match(packs,both,28029),'main');
 const source=put(silent,0,'IYS-1-027','front',0,false);
 put(silent,0,'IYS-1-026','front',1,true);
 const locked=titanBoard(silent,{extraFront:false});
 grantContinuousState(silent,{kind:'originalEffectsDisabled',controller:0,sourceUid:source.uid,
  targetUid:locked.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 silent=pick(packs,silent,a=>a.type==='activate'&&a.uid===source.uid);
 assert.equal(acts(packs,silent).some(a=>a.uid===locked.uid),true);
 silent=pick(packs,silent,a=>a.uid===locked.uid);
 assert.equal(bpOf(packs,silent,1,locked.uid),3000);
 silent=pick(packs,silent,a=>a.mode==='pick');
 assertUniversalMatch(packs,silent);
});

test('a character effect keeps its type after the source leaves the field',()=>{
 const packs=[iysPack,aotPack];
 const decks=[
  countsFor(iysPack,['IYS-1-027','IYS-1-026','IYS-1-042']),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-2-023','AOT-1-001'])
 ];
 let s=toPhase(packs,match(packs,decks,28030),'main');
 const actor=put(s,0,'IYS-1-027','front',0,false);
 const naraku=put(s,0,'IYS-1-026','front',1,true);
 const host=put(s,0,'IYS-1-042','front',2,true);
 const hammer=titanBoard(s);
 s=pick(packs,s,a=>a.type==='activate'&&a.uid===actor.uid);
 assert.equal(acts(packs,s).some(a=>a.uid===hammer.uid),false);
 const current=at(s,0,actor.uid);
 const holder=at(s,0,host.uid);
 const slot=s.players[0].front.findIndex(c=>c?.uid===actor.uid);
 s.players[0].front[slot]=null;
 current.ready=false;
 current.fieldEntryStamp=null;
 holder.under=[current];
 assert.equal(s.effectProvenance.kind,'character');
 assert.equal(acts(packs,s).some(a=>a.uid===hammer.uid),false);
 s=pick(packs,s,a=>a.mode==='skip');
 assert.equal(bpOf(packs,s,1,hammer.uid),4000);
 if(s.pending?.step==='retireNaraku')s=pick(packs,s,a=>a.uid===naraku.uid);
 assert.equal(s.pending,null);
 assert.equal(bpOf(packs,s,1,hammer.uid),4000);
 assert.equal(s.players[0].outside.some(c=>c.uid===naraku.uid),true);
 assertUniversalMatch(packs,s);
});

test('a character effect can still rest the War Hammer, and an event can still retire it',()=>{
 const packs=[iysPack,aotPack];
 const decks=[
  countsFor(iysPack,['IYS-1-049','IYS-1-042','IYS-1-080','IYS-1-041']),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-2-023'])
 ];
 let rested=toPhase(packs,match(packs,decks,28031),'main');
 const kikyo=put(rested,0,'IYS-1-049','front',0,true);
 kikyo.entryTurn=rested.turn;
 const inuyasha=put(rested,0,'IYS-1-042','front',1,true);
 const hammer=titanBoard(rested,{extraFront:false});
 rested=pick(packs,rested,a=>a.type==='activate'&&a.uid===kikyo.uid);
 rested=pick(packs,rested,a=>a.uid===inuyasha.uid);
 assert.equal(rested.pending.step,'kikyoFork');
 assert.equal(acts(packs,rested).some(a=>a.mode==='rest'&&a.uid===hammer.uid),true);
 rested=pick(packs,rested,a=>a.mode==='rest'&&a.uid===hammer.uid);
 assert.equal(at(rested,1,hammer.uid).ready,false);
 assert.equal(bpOf(packs,rested,1,hammer.uid),4000);
 assertUniversalMatch(packs,rested);

 const aotPacks=[aotPack,aotPack];
 const aotDecks=[
  countsFor(aotPack,['AOT-1-034','AOT-1-007','AOT-1-002','AOT-1-006']),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-2-023'])
 ];
 let event=toPhase(aotPacks,match(aotPacks,aotDecks,28032),'main');
 put(event,0,'AOT-1-002','energy',0,true);
 put(event,0,'AOT-1-006','energy',1,true);
 put(event,0,'AOT-1-007','front',0,true);
 readyAp(event,0,1);
 const target=titanBoard(event,{extraFront:false});
 const blow=toHand(event,0,'AOT-1-034');
 event=pick(aotPacks,event,a=>a.type==='event'&&a.uid===blow.uid);
 assert.equal(event.pending.step,'retire');
 assert.equal(acts(aotPacks,event).some(a=>a.mode==='skip'),false);
 assert.equal(acts(aotPacks,event).some(a=>a.uid===target.uid),true);
 event=pick(aotPacks,event,a=>a.uid===target.uid);
 assert.equal(event.players[1].outside.some(c=>c.uid===target.uid),true);
 assertUniversalMatch(aotPacks,event);
});

test('MMM-2-014 cannot cut a live War Hammer, and can cut it when a founder is missing',()=>{
 const packs=[mmmPack,aotPack];
 const mmmIds=['MMM-2-014','MMM-2-018','MMM-2-013','MMM-2-017','MMM-2-025','MMM-2-031'];
 const decks=[
  countsFor(mmmPack,mmmIds),
  countsFor(aotPack,['AOT-2-028','AOT-2-020','AOT-2-023'])
 ];
 let s=toPhase(packs,match(packs,decks,28014),'main');
 readyAp(s);
 put(s,0,'MMM-2-013','energy',0,true);
 put(s,0,'MMM-2-017','energy',1,true);
 put(s,0,'MMM-2-025','energy',2,true);
 put(s,0,'MMM-2-031','energy',3,true);
 const homura=take(s,0,'MMM-2-014');
 s.players[0].outside.push(homura);
 const memory=toHand(s,0,'MMM-2-018');
 const hammer=titanBoard(s,{extraFront:false});
 s=pick(packs,s,a=>a.type==='event'&&a.uid===memory.uid);
 s=pick(packs,s,a=>a.uid===homura.uid);
 s=pick(packs,s,a=>a.uid===homura.uid&&a.line==='front');
 assert.equal(s.pending?.step==='u014',false);
 assert.equal(acts(packs,s).some(a=>a.uid===hammer.uid),false);
 if(s.pending?.step==='u018')s=pick(packs,s,a=>a.mode==='done');
 assert.equal(s.pending,null);
 assert.equal(bpOf(packs,s,1,hammer.uid),4000);
 assertUniversalMatch(packs,s);

 const openDecks=[
  countsFor(mmmPack,mmmIds),
  countsFor(aotPack,['AOT-2-028','AOT-2-020'])
 ];
 let open=toPhase(packs,match(packs,openDecks,28015),'main');
 readyAp(open);
 put(open,0,'MMM-2-013','energy',0,true);
 put(open,0,'MMM-2-017','energy',1,true);
 put(open,0,'MMM-2-025','energy',2,true);
 put(open,0,'MMM-2-031','energy',3,true);
 const again=take(open,0,'MMM-2-014');
 open.players[0].outside.push(again);
 const spell=toHand(open,0,'MMM-2-018');
 const exposed=titanBoard(open,{founders:false,extraFront:false});
 put(open,1,'AOT-2-020','energy',0,true);
 open=pick(packs,open,a=>a.type==='event'&&a.uid===spell.uid);
 open=pick(packs,open,a=>a.uid===again.uid);
 open=pick(packs,open,a=>a.uid===again.uid&&a.line==='front');
 assert.equal(acts(packs,open).some(a=>a.uid===exposed.uid),true);
 open=pick(packs,open,a=>a.uid===exposed.uid);
 if(open.pending?.step==='u018')open=pick(packs,open,a=>a.mode==='done');
 assert.equal(bpOf(packs,open,1,exposed.uid),3000);
 assertUniversalMatch(packs,open);
});
