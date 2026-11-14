// MHA-1-100 retires under a named ceiling, then rests every lower front.
// Q468: a stored BP window does not raise the mass rest.
// Q510: without a retirement target the card cannot be played, so the rest does not happen.
// Q511: the named character raises only the retirement ceiling.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack,mhaBattleCard,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {grantContinuousState,refreshFieldActive} from '../dist/universal-v2/continuous-states.mjs';

const pack=createMhaV2Pack();
function real(id){
 const row=mhaEditorCards().find(card=>card.id===id);
 return mhaBattleCard(row,mhaProgramFor(id));
}
function filler(id,extra={}){
 return {id,name:extra.name||id,color:extra.color||'red',type:'character',
  energy:extra.energy??0,ap:1,bp:extra.bp??1000,gen:extra.gen??1,traits:[],
  trigger:null,implementation:'vanilla',effects:{}};
}
function shell(cards){
 const bodies=[...cards];
 let n=1;
 while(bodies.length<13)bodies.push(filler('FILL-'+String(n++).padStart(2,'0')));
 const built=createUniversalPack({id:'mha-100',version:'t',cards:bodies});
 const deck={};
 let remain=50;
 for(const id of Object.keys(built.cards)){
  if(remain<=0)break;
  const take=Math.min(4,remain);
  deck[id]=take;remain-=take;
 }
 let s=newUniversalMatch(built,{decks:[deck,deck],seed:100,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++)s=dispatchUniversalAction(built,s,{type:'next'});
 s.players[0].deck.push(...s.players[0].life.splice(0));
 return {built,s};
}
function pull(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','outside','removed','life']){
  const index=pl[zone].findIndex(c=>c?.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(c=>c?.cardId===id);
  if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
 }
 throw Error('Missing '+id);
}
function seat(s,owner,id,line,slot,ready=true){
 const card=pull(s,owner,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=card;
 return card;
}
function find(s,uid){
 for(const p of [0,1])for(const zone of ['front','energy','hand','deck','outside','removed'])
  for(const c of s.players[p][zone]||[])if(c?.uid===uid)return c;
 return null;
}
function act(built,s,action){
 const next=dispatchUniversalAction(built,s,action);
 assert.equal(assertUniversalMatch(built,next),true);
 return next;
}
function skipped(s,uid){
 return s.continuousStates.some(e=>e.kind==='skipNextActive'&&!e.consumed&&e.targetUid===uid);
}
function open(built,s){
 s.players[0].apCards.forEach(card=>{card.inPlay=true;card.ready=true;});
 const event=pull(s,0,'MHA-1-100');
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s.players[0].hand.push(event);
 return event;
}

test('MHA-1-100 rests every printed low front only after a legal retirement',()=>{
 const effect=pack.cards['MHA-1-100'].effects.onPlay[0];
 assert.equal(effect.bp,3000);
 assert.equal(effect.bonusBp,5000);
 assert.equal(effect.thenRestAll.bp,2000);
 assert.equal(pack.cards['MHA-1-100'].triggerEffect.op,'retireOppFront');
 assert.throws(()=>createUniversalPack({id:'bad',version:'b',cards:[
  {...filler('BAD'),type:'event',bp:0,energy:4,ap:2,gen:0,implementation:'dsl',
   effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,bonusName:'轟 焦凍',
    bonusBp:5000,mandatory:true,thenRestAll:{bp:3000,skipNextActive:true}}]}},
  ...Array.from({length:12},(_,i)=>filler('PAD-'+i))
 ]}),/unsupported printed BP retirement profile/);
 const fuel=filler('FUEL',{gen:1});
 const low=filler('LOW',{bp:2000});
 const mid=filler('MID',{bp:2500});
 const cap=filler('CAP',{bp:3000});
 const high=filler('HIGH',{bp:4000});
 const wide=filler('WIDE',{bp:5000});
 const over=filler('OVER',{bp:5500});
 const huge=filler('HUGE',{bp:6000});
 const plain=shell([real('MHA-1-100'),fuel,low,mid,cap,high]);
 for(let slot=0;slot<4;slot++)seat(plain.s,0,'FUEL','energy',slot,false);
 const event=open(plain.built,plain.s);
 const rested=seat(plain.s,1,'LOW','front',0,true);
 const stayed=seat(plain.s,1,'MID','front',1,true);
 const chosen=seat(plain.s,1,'CAP','front',2,true);
 const above=seat(plain.s,1,'HIGH','front',3,true);
 let s=act(plain.built,plain.s,{type:'event',uid:event.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,3000);
 assert.equal(legalUniversalActions(plain.built,s).some(a=>a.uid===chosen.uid),true);
 assert.equal(legalUniversalActions(plain.built,s).some(a=>a.uid===above.uid),false);
 assert.equal(legalUniversalActions(plain.built,s).some(a=>a.uid===null),false);
 const gone=find(s,chosen.uid);
 s.players[1].outside.push(gone);
 s.players[1].front[2]=null;
 assert.throws(()=>dispatchUniversalAction(plain.built,s,
  {type:'chooseRetireBp',uid:chosen.uid}),/not currently legal|Illegal/);
 assert.equal(find(s,stayed.uid).ready,true);
 s=act(plain.built,plain.s,{type:'event',uid:event.uid});
 s=act(plain.built,s,{type:'chooseRetireBp',uid:chosen.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===chosen.uid));
 assert.equal(find(s,rested.uid).ready,false);
 assert.equal(skipped(s,rested.uid),true);
 assert.equal(find(s,stayed.uid).ready,true);
 assert.equal(skipped(s,stayed.uid),false);
 assert.equal(find(s,above.uid).ready,true);
 refreshFieldActive(s,1,'start');
 assert.equal(find(s,rested.uid).ready,false);
 assert.equal(skipped(s,rested.uid),false);
 refreshFieldActive(s,1,'start');
 assert.equal(find(s,rested.uid).ready,true);
 const named=shell([real('MHA-1-100'),real('MHA-1-081'),fuel,low,mid,wide,over]);
 for(let slot=0;slot<4;slot++)seat(named.s,0,'FUEL','energy',slot,false);
 const shout=seat(named.s,0,'MHA-1-081','front',0,true);
 const namedEvent=open(named.built,named.s);
 const low2=seat(named.s,1,'LOW','front',0,true);
 const mid2=seat(named.s,1,'MID','front',1,true);
 const wide2=seat(named.s,1,'WIDE','front',2,true);
 const over2=seat(named.s,1,'OVER','front',3,true);
 grantContinuousState(named.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:shout.uid,targetUid:shout.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 s=act(named.built,named.s,{type:'event',uid:namedEvent.uid});
 assert.equal(s.pending.limit,5000);
 assert.equal(legalUniversalActions(named.built,s).some(a=>a.uid===wide2.uid),true);
 assert.equal(legalUniversalActions(named.built,s).some(a=>a.uid===over2.uid),false);
 named.s.bpWindowPlus=[1000,0];
 s=act(named.built,named.s,{type:'event',uid:namedEvent.uid});
 assert.equal(s.pending.limit,6000);
 s=act(named.built,s,{type:'chooseRetireBp',uid:over2.uid});
 assert.equal(find(s,low2.uid).ready,false);
 assert.equal(skipped(s,low2.uid),true);
 assert.equal(find(s,mid2.uid).ready,true);
 assert.equal(find(s,wide2.uid).ready,true);
 const blocked=shell([real('MHA-1-100'),fuel,huge]);
 for(let slot=0;slot<4;slot++)seat(blocked.s,0,'FUEL','energy',slot,false);
 const blockedEvent=open(blocked.built,blocked.s);
 seat(blocked.s,1,'HUGE','front',0,true);
 assert.equal(legalUniversalActions(blocked.built,blocked.s).some(a=>a.type==='event'&&
  a.uid===blockedEvent.uid),false);
 assert.throws(()=>dispatchUniversalAction(blocked.built,blocked.s,
  {type:'event',uid:blockedEvent.uid}),/not currently legal/);
 const unpaid=shell([real('MHA-1-100'),low]);
 const unpaidEvent=open(unpaid.built,unpaid.s);
 seat(unpaid.s,1,'LOW','front',0,true);
 assert.equal(legalUniversalActions(unpaid.built,unpaid.s).some(a=>a.type==='event'&&
  a.uid===unpaidEvent.uid),false);
});
