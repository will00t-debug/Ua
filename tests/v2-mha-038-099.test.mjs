// MHA-1-038 and MHA-1-099 use the shared facedown keywords and hand ceiling.
// Q442: two facedown cards grant double block, four also grant double attack.
// Q632: the controller sees their own facedown cards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack,mhaBattleCard,mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {mhaEditorCards} from '../dist/mha/catalog.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

const pack=createMhaV2Pack();
function real(id){
 const row=mhaEditorCards().find(card=>card.id===id);
 return mhaBattleCard(row,mhaProgramFor(id));
}
function filler(id,extra={}){
 return {id,name:extra.name||id,color:extra.color||'green',type:'character',
  energy:extra.energy??0,ap:1,bp:extra.bp??1000,gen:extra.gen??1,traits:[],
  trigger:null,implementation:'vanilla',effects:{}};
}
function shell(cards){
 const bodies=[...cards];
 let n=1;
 while(bodies.length<13)bodies.push(filler('FILL-'+String(n++).padStart(2,'0')));
 const built=createUniversalPack({id:'mha-038-099',version:'t',cards:bodies});
 const deck={};
 let remain=50;
 for(const id of Object.keys(built.cards)){
  if(remain<=0)break;
  const take=Math.min(4,remain);
  deck[id]=take;
  remain-=take;
 }
 let s=newUniversalMatch(built,{decks:[deck,deck],seed:38,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++)s=dispatchUniversalAction(built,s,{type:'next'});
 return {built,s};
}
function pull(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','outside','removed']){
  const index=pl[zone].findIndex(c=>c.cardId===id);
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
function bury(s,host,id){
 const card=pull(s,0,id);
 card.faceDown=true;
 card.ready=false;
 card.fieldEntryStamp=null;
 host.under??=[];
 host.under.push(card);
 return card;
}
function find(s,uid){
 const walk=c=>{
  if(!c)return null;
  if(c.uid===uid)return c;
  for(const child of [...(c.stack||[]),...(c.under||[])]){
   const hit=walk(child);if(hit)return hit;
  }
  return null;
 };
 for(const p of [0,1])for(const zone of ['front','energy','hand','deck','outside','removed'])
  for(const c of s.players[p][zone]||[]){const hit=walk(c);if(hit)return hit;}
 return null;
}
function reach(built,s,player,phase){
 let guard=0;
 while(s.active!==player||s.phase!==phase){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(built,s,{type:'next'});
  if(++guard>12)throw Error('stuck '+s.active+' '+s.phase);
 }
 return s;
}
function act(built,s,action){
 const next=dispatchUniversalAction(built,s,action);
 assert.equal(assertUniversalMatch(built,next),true);
 return next;
}

test('MHA-1-038 gains double block at two facedown cards and double attack at four',()=>{
 assert.equal(pack.cards['MHA-1-038'].facedownKeywordThresholds[0].keyword,'doubleBlock');
 assert.equal(pack.cards['MHA-1-038'].mainAbility.op,'onceTuckFacedown');
 assert.throws(()=>createUniversalPack({id:'bad',version:'b',cards:[
  {...filler('BAD'),implementation:'dsl',
   facedownKeywordThresholds:[{atLeast:2,keyword:'haste'}]},
  ...Array.from({length:12},(_,i)=>filler('PAD-'+i))
 ]}),/invalid facedown keyword threshold/);
 const layer=filler('LAYER',{bp:500});
 const foe=filler('FOE',{bp:1000,color:'red'});
 function attackReady(layers){
  const opened=shell([real('MHA-1-038'),layer,foe]);
  const host=seat(opened.s,0,'MHA-1-038','front',0,true);
  seat(opened.s,1,'FOE','front',0,true);
  for(let i=0;i<layers;i++)bury(opened.s,host,'LAYER');
  let s=reach(opened.built,opened.s,0,'attack');
  s=act(opened.built,s,{type:'attack',uid:host.uid});
  assert.equal(s.pending.kind,'block');
  return find(s,host.uid).ready;
 }
 assert.equal(attackReady(4),true);
 assert.equal(attackReady(2),false);
 assert.equal(attackReady(1),false);
 const dropped=shell([real('MHA-1-038'),layer,foe]);
 const thin=seat(dropped.s,0,'MHA-1-038','front',0,true);
 seat(dropped.s,1,'FOE','front',0,true);
 for(let i=0;i<4;i++)bury(dropped.s,thin,'LAYER');
 dropped.s.players[0].outside.push(thin.under.pop());
 let s=reach(dropped.built,dropped.s,0,'attack');
 s=act(dropped.built,s,{type:'attack',uid:thin.uid});
 assert.equal(find(s,thin.uid).ready,false);
 const quiet=shell([real('MHA-1-038'),layer,foe]);
 const muted=seat(quiet.s,0,'MHA-1-038','front',0,true);
 seat(quiet.s,1,'FOE','front',0,true);
 for(let i=0;i<4;i++)bury(quiet.s,muted,'LAYER');
 grantContinuousState(quiet.s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:muted.uid,targetUid:muted.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 s=reach(quiet.built,quiet.s,0,'attack');
 s=act(quiet.built,s,{type:'attack',uid:muted.uid});
 assert.equal(find(s,muted.uid).ready,false);
 const blocked=shell([real('MHA-1-038'),layer,foe]);
 const wall=seat(blocked.s,0,'MHA-1-038','front',0,true);
 const attacker=seat(blocked.s,1,'FOE','front',0,true);
 for(let i=0;i<2;i++)bury(blocked.s,wall,'LAYER');
 s=reach(blocked.built,blocked.s,1,'attack');
 s=act(blocked.built,s,{type:'attack',uid:attacker.uid});
 s=act(blocked.built,s,{type:'chooseBlock',uid:wall.uid});
 assert.equal(find(s,wall.uid).ready,true);
 const empty=shell([real('MHA-1-038'),layer]);
 const host=seat(empty.s,0,'MHA-1-038','front',0,true);
 empty.s.players[0].outside.push(...empty.s.players[0].deck.splice(0));
 assert.equal(legalUniversalActions(empty.built,empty.s).some(a=>a.uid===host.uid&&
  a.mode==='onceTuck'),false);
 assert.throws(()=>dispatchUniversalAction(empty.built,empty.s,
  {type:'activate',uid:host.uid,mode:'onceTuck'}),/not currently legal/);
 const paid=shell([real('MHA-1-038'),layer]);
 const tucker=seat(paid.s,0,'MHA-1-038','front',0,true);
 const before=tucker.under?.length||0;
 s=act(paid.built,paid.s,{type:'activate',uid:tucker.uid,mode:'onceTuck'});
 assert.equal(find(s,tucker.uid).under.length,before+1);
 assert.equal(find(s,tucker.uid).under.at(-1).faceDown,true);
 assert.equal(legalUniversalActions(paid.built,s).some(a=>a.uid===tucker.uid&&
  a.mode==='onceTuck'),false);
});

test('MHA-1-099 raises the retirement ceiling only while the other hand is small',()=>{
 assert.equal(pack.cards['MHA-1-099'].effects.onPlay[0].bp,3000);
 assert.equal(pack.cards['MHA-1-099'].effects.onPlay[0].handAtMost.atMost,3);
 assert.equal(pack.cards['MHA-1-099'].triggerEffect.op,'retireOppFront');
 const low=filler('LOW',{bp:2000,color:'red'});
 const mid=filler('MID',{bp:4000,color:'red'});
 const high=filler('HIGH',{bp:6000,color:'red'});
 const fuel=filler('FUEL',{color:'red',gen:1});
 const opened=shell([real('MHA-1-099'),low,mid,high,fuel]);
 opened.s.players[0].deck.push(...opened.s.players[0].life.splice(0));
 for(let slot=0;slot<4;slot++)seat(opened.s,0,'FUEL','energy',slot,false);
 opened.s.players[0].apCards.forEach(card=>{card.inPlay=true;card.ready=true;});
 const small=seat(opened.s,1,'LOW','front',0,true);
 const wide=seat(opened.s,1,'MID','front',1,true);
 const huge=seat(opened.s,1,'HIGH','front',2,true);
 const event=pull(opened.s,0,'MHA-1-099');
 const extras=['FILL-01','FILL-02','FILL-03','FILL-04'].map(id=>pull(opened.s,0,id));
 opened.s.players[0].deck.push(...opened.s.players[0].hand.splice(0));
 opened.s.players[0].hand.push(event,...extras);
 let s=act(opened.built,opened.s,{type:'event',uid:event.uid});
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,3000);
 assert.equal(legalUniversalActions(opened.built,s).some(a=>a.uid===small.uid),true);
 assert.equal(legalUniversalActions(opened.built,s).some(a=>a.uid===wide.uid),false);
 assert.equal(legalUniversalActions(opened.built,s).some(a=>a.uid===null),false);
 opened.s.players[0].deck.push(opened.s.players[0].hand.pop());
 s=act(opened.built,opened.s,{type:'event',uid:event.uid});
 assert.equal(s.pending.limit,5000);
 assert.equal(legalUniversalActions(opened.built,s).some(a=>a.uid===wide.uid),true);
 assert.equal(legalUniversalActions(opened.built,s).some(a=>a.uid===huge.uid),false);
 const left=find(s,wide.uid);
 s.players[1].outside.push(left);
 s.players[1].front[1]=null;
 assert.equal(legalUniversalActions(opened.built,s).some(a=>a.uid===wide.uid),false);
 assert.throws(()=>dispatchUniversalAction(opened.built,s,
  {type:'chooseRetireBp',uid:wide.uid}),/not currently legal|Illegal|left/);
 s=act(opened.built,s,{type:'chooseRetireBp',uid:small.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===small.uid));
 assert.equal(universalBp(opened.built,s,find(s,huge.uid)),6000);
});
