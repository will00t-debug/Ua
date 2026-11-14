// MHA-1-029 “個性”消失弾. Cannot be played unless 〈オーバーホール〉 is on
// your field. On play, choose up to one opposing front character, rest it,
// and put every card under it outside. While this field remains, that
// character loses its original effects and does not become active.
// Q435 keeps triggers. Q436 includes face-up and face-down cards under it,
// including the raid base. Q437 is this physical field, not another copy.
// Q438: a silenced activate is not referenced. Q474: raid is not an effect.
// Q974: an already granted bonus stays, a printed continuous bonus does not.
// Q2213: a printed leave effect does not fire.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MHA_CATALOG} from '../dist/mha/catalog.mjs';
import {createMhaV2Pack, mhaBattleCard, mhaProgramFor} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch, legalUniversalActions, dispatchUniversalAction,
 assertUniversalMatch, universalBp
} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState, pruneContinuousStates} from '../dist/universal-v2/continuous-states.mjs';

const printed=MHA_CATALOG.find(c=>c.id==='MHA-1-029');
const bullet=mhaBattleCard(printed, mhaProgramFor('MHA-1-029'));
const overhaul=mhaBattleCard(MHA_CATALOG.find(c=>c.id==='MHA-1-025'), mhaProgramFor('MHA-1-025'));
const tuck={op:'onceTuckFacedown', oncePerTurn:true, from:'deckTop', host:'self', count:1};

function card(extra){
 return {
  id:extra.id, name:extra.name||extra.id, color:extra.color||'purple',
  type:extra.type||'character', energy:extra.energy??0, ap:extra.ap??1,
  bp:extra.bp??1500, gen:extra.gen??1, traits:extra.traits||[],
  trigger:extra.trigger??null, implementation:extra.implementation||'vanilla',
  effects:extra.effects||{}, ...extra
 };
}
function shell(){
 const bodies=[bullet, overhaul,
  card({id:'FUEL', name:'紫燃料', gen:4}),
  card({id:'LOW', name:'不足燃料', gen:2}),
  card({id:'GREEN', name:'綠燃料', color:'green', gen:4}),
  card({id:'MARK', name:'標的', implementation:'dsl', bp:2000, ownTurnBp:1000,
   raidName:'標的', trigger:'draw',
   effects:{onRetire:[{op:'draw', count:1}]}, mainAbility:tuck}),
  card({id:'LIVE', name:'活起動', implementation:'dsl', mainAbility:tuck}),
  card({id:'COPY', name:'複寫', implementation:'dsl', mainAbility:{
   op:'gainSameLineMains', oncePerTurn:true, excludeNames:['オール・フォー・ワン']
  }}),
  card({id:'BASE', name:'標的', bp:1500}),
  card({id:'RIDER', name:'騎手', implementation:'dsl', raidName:'標的', energy:0,
   effects:{onPlay:[{op:'draw', count:1}]}}),
  card({id:'FIGHTER', name:'打手', bp:3000}),
  card({id:'WALL', name:'牆', bp:1000, color:'red'}),
  card({id:'TALL', name:'高牆', bp:5000, color:'red'})
 ];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'), name:'填'+n, bp:1000}));
  n++;
 }
 return createUniversalPack({id:'mha-029', version:'mha-029', cards:bodies});
}
function open({seed=29}={}){
 const pack=shell();
 const deck={};
 let remain=50;
 for(const id of Object.keys(pack.cards)){
  if(remain<=0)break;
  deck[id]=Math.min(4, remain);
  remain-=deck[id];
 }
 let s=newUniversalMatch(pack,{decks:[deck,deck], seed, first:0, openingMulligan:false});
 let guard=0;
 while(s.phase!=='main'||s.active!==0){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase');
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return {pack,s};
}
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('missing '+id);
}
function seat(s,p,id,line,slot,ready=true){
 const body=pull(s,p,id);
 body.ready=ready;
 body.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=body;
 return body;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 const choice=typeof action==='function'?legal(pack,s).find(action):action;
 if(!choice)throw Error('missing action');
 return dispatchUniversalAction(pack,s,choice);
}
function find(s,uid){
 for(const p of s.players)for(const line of ['front','energy']){
  const hit=p[line].find(c=>c?.uid===uid);
  if(hit)return hit;
 }
 return null;
}
function plays(pack,s,uid){
 return legal(pack,s).filter(a=>a.type==='play'&&a.uid===uid);
}
function bury(s,host){
 const faceDown=pull(s,1,'GREEN');
 faceDown.faceDown=true;
 const faceUp=pull(s,1,'LOW');
 faceUp.faceDown=false;
 host.under=[faceDown];
 host.stack=[faceUp];
 host.raidBaseUid=faceUp.uid;
 return {faceDown, faceUp};
}
function walk(pack,s,pred){
 let guard=0;
 while(!pred(s)){
  if(s.pending?.kind==='end-hand-limit'){
   const hand=s.players[s.pending.player].hand;
   s=act(pack,s,{type:'chooseHandLimit', uid:hand[0].uid});
  }else if(s.pending)throw Error('pending '+s.pending.kind+' at '+s.phase);
  else s=act(pack,s,{type:'next'});
  if(++guard>24)throw Error('walk stopped at '+s.active+' '+s.phase+' '+(s.endReason||''));
 }
 return s;
}

test('MHA-1-029 is the printed field and stays out of official matches',()=>{
 assert.equal(bullet.name,'“個性”消失弾');
 assert.equal(bullet.type,'field');
 assert.equal(bullet.energy,4);
 assert.equal(bullet.ap,1);
 assert.equal(bullet.playRequiresOwnName,'オーバーホール');
 assert.equal(bullet.effects.onPlay[0].op,'restOppFrontStripLock');
 assert.equal(bullet.effects.onPlay[0].optional,true);
 assert.equal(printed.trigger,'special');
 assert.deepEqual(printed.faq.map(row=>row.id),
  ['Q435','Q436','Q437','Q438','Q474','Q974','Q2213']);
 const pack=createMhaV2Pack();
 assert.equal(pack.cards['MHA-1-029'].playRequiresOwnName,'オーバーホール');
 assert.equal(printed.battleReady,false);
});

test('the field cannot be played without Overhaul or four purple energy',()=>{
 let named=open({seed:31});
 const waiting=hold(named.s,'MHA-1-029');
 seat(named.s,0,'FUEL','energy',0,true);
 assert.equal(plays(named.pack,named.s,waiting.uid).length,0);
 assert.throws(()=>dispatchUniversalAction(named.pack,named.s,
  {type:'play', uid:waiting.uid, line:'energy', slot:1}),/not currently legal/);
 const hidden=seat(named.s,0,'MHA-1-025','energy',1,true);
 hidden.faceDown=true;
 assert.equal(plays(named.pack,named.s,waiting.uid).length,0);
 hidden.faceDown=false;
 grantContinuousState(named.s,{kind:'originalEffectsDisabled', controller:0,
  sourceUid:named.s.players[0].energy[0].uid, targetUid:hidden.uid,
  until:{player:0, phase:'start', edge:'start'}});
 assert.equal(plays(named.pack,named.s,waiting.uid).some(a=>a.line==='energy'),true);

 let short=open({seed:32});
 const low=hold(short.s,'MHA-1-029');
 seat(short.s,0,'MHA-1-025','energy',0,true);
 seat(short.s,0,'LOW','energy',1,true);
 assert.equal(plays(short.pack,short.s,low.uid).length,0);
 const lowFuel=short.s.players[0].energy[1];
 short.s.players[0].energy[1]=null;
 short.s.players[0].deck.push(lowFuel);
 seat(short.s,0,'GREEN','energy',1,true);
 assert.equal(plays(short.pack,short.s,low.uid).length,0);
 const green=short.s.players[0].energy[1];
 short.s.players[0].energy[1]=null;
 short.s.players[0].deck.push(green);
 seat(short.s,0,'FUEL','energy',1,true);
 assert.equal(plays(short.pack,short.s,low.uid).some(a=>a.line==='energy'),true);
 assert.equal(plays(short.pack,short.s,low.uid).some(a=>a.line==='front'),false);
});

test('the rest is optional, and only an opposing front character is legal',()=>{
 let empty=open({seed:33});
 hold(empty.s,'MHA-1-029');
 seat(empty.s,0,'MHA-1-025','energy',0,true);
 seat(empty.s,0,'FUEL','energy',1,true);
 empty.s=act(empty.pack,empty.s,a=>a.type==='play'&&a.line==='energy'&&
  a.uid===empty.s.players[0].hand.find(c=>c.cardId==='MHA-1-029').uid);
 assert.equal(empty.s.pending,null);
 assert.equal(empty.s.players[0].energy.some(c=>c?.cardId==='MHA-1-029'),true);

 let {pack,s}=open({seed:34});
 const cardInHand=hold(s,'MHA-1-029');
 seat(s,0,'MHA-1-025','energy',0,true);
 seat(s,0,'FUEL','energy',1,true);
 const mark=seat(s,1,'MARK','front',0,true);
 const back=seat(s,1,'LIVE','energy',0,true);
 bury(s,mark);
 s=act(pack,s,a=>a.type==='play'&&a.uid===cardInHand.uid&&a.line==='energy');
 assert.equal(s.pending.kind,'effect-rest-strip-lock');
 assert.equal(s.pending.optional,true);
 assert.deepEqual(s.pending.choices,[mark.uid]);
 assert.equal(s.pending.choices.includes(back.uid),false);
 assert.equal(chooseUniversalAiAction(pack,s,{difficulty:'normal'}).uid,mark.uid);
 assert.equal(chooseUniversalAiAction(pack,s,{difficulty:'easy'}).uid,null);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'chooseRestStrip', uid:back.uid}),/not currently legal/);
 const away=s.players[1].front[0];
 s.players[1].front[0]=null;
 s.players[1].outside.push(away);
 assert.throws(()=>assertUniversalMatch(pack,s),/Invalid front rest lock/);
 s.players[1].outside.pop();
 s.players[1].front[0]=away;
 s=act(pack,s,{type:'chooseRestStrip', uid:null});
 assert.equal(s.pending,null);
 assert.equal(find(s,mark.uid).ready,true);
 assert.equal(find(s,mark.uid).under.length,1);
 assert.equal(find(s,mark.uid).stack.length,1);
 assert.equal(s.continuousStates.some(e=>e.targetUid===mark.uid),false);
});

test('the chosen character loses the cards under it, its original rules, and recovery',()=>{
 let {pack,s}=open({seed:35});
 const cardInHand=hold(s,'MHA-1-029');
 seat(s,0,'MHA-1-025','energy',0,true);
 seat(s,0,'FUEL','energy',1,true);
 const mark=seat(s,1,'MARK','front',0,true);
 const live=seat(s,1,'LIVE','front',1,true);
 const copy=seat(s,1,'COPY','front',2,true);
 const base=seat(s,1,'BASE','front',3,true);
 const rider=hold(s,'RIDER',1);
 const layers=bury(s,mark);
 mark.buffs=[{bp:1000, untilTurn:s.turn}];
 s=act(pack,s,a=>a.type==='play'&&a.uid===cardInHand.uid&&a.line==='energy');
 const field=s.players[0].energy.find(c=>c?.cardId==='MHA-1-029');
 s=act(pack,s,{type:'chooseRestStrip', uid:mark.uid});
 const locked=find(s,mark.uid);
 assert.equal(locked.ready,false);
 assert.equal(locked.under.length,0);
 assert.equal(locked.stack.length,0);
 assert.equal(locked.raidBaseUid,undefined);
 assert.equal(s.players[1].outside.some(c=>c.uid===layers.faceDown.uid&&c.faceDown===false),true);
 assert.equal(s.players[1].outside.some(c=>c.uid===layers.faceUp.uid),true);
 assert.equal(universalBp(pack,s,locked),3000);
 assert.equal(pack.cards.MARK.trigger,'draw');
 assert.equal(pack.cards.MARK.raidName,'標的');
 const locks=s.continuousStates.filter(e=>e.targetUid===mark.uid&&e.sourceUid===field.uid);
 assert.deepEqual(locks.map(e=>e.kind).sort(),['cannotActive','originalEffectsDisabled']);
 assert.equal(locks.every(e=>e.until===null&&e.sourceLinked===true),true);
 s=walk(pack,s,state=>state.active===1&&state.phase==='main');
 const rested=find(s,mark.uid);
 assert.equal(rested.ready,false);
 assert.equal(universalBp(pack,s,rested),2000);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===mark.uid),false);
 assert.equal(legal(pack,s).some(a=>a.type==='activate'&&a.uid===live.uid),true);
 s=act(pack,s,{type:'activate', uid:copy.uid, mode:'gainLineMains'});
 const copied=find(s,copy.uid).gainedMains.items.map(item=>item.sourceUid);
 assert.equal(copied.includes(mark.uid),false);
 assert.equal(copied.includes(live.uid),true);
 const raids=()=>legal(pack,s).filter(a=>a.type==='raid'&&a.uid===rider.uid);
 assert.equal(raids().some(a=>a.baseUid===base.uid),true);
 assert.equal(raids().some(a=>a.baseUid===mark.uid),false);
 assert.throws(()=>dispatchUniversalAction(pack,s,
  {type:'raid', uid:rider.uid, baseUid:mark.uid, slot:0}),/not currently legal/);
 const other=seat(s,0,'MHA-1-029','energy',3,true);
 const sourceSlot=s.players[0].energy.findIndex(c=>c?.uid===field.uid);
 s.players[0].energy[sourceSlot]=null;
 field.fieldEntryStamp=null;
 s.players[0].outside.push(field);
 pruneContinuousStates(s);
 const seen=s.players[1].ownTurns;
 s=walk(pack,s,state=>state.active===1&&state.phase==='main'&&state.players[1].ownTurns>seen);
 assert.equal(find(s,mark.uid).ready,true);
 assert.equal(s.continuousStates.some(e=>e.sourceUid===field.uid),false);
 assert.equal(find(s,other.uid).cardId,'MHA-1-029');
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('a printed leave effect does not fire, and the rested character is not a blocker',()=>{
 let {pack,s}=open({seed:36});
 const cardInHand=hold(s,'MHA-1-029');
 const fighter=seat(s,0,'FIGHTER','front',0,true);
 seat(s,0,'MHA-1-025','energy',0,true);
 seat(s,0,'FUEL','energy',1,true);
 const mark=seat(s,1,'MARK','front',0,true);
 const wall=seat(s,1,'WALL','front',1,true);
 s=act(pack,s,a=>a.type==='play'&&a.uid===cardInHand.uid&&a.line==='energy');
 s=act(pack,s,{type:'chooseRestStrip', uid:mark.uid});
 s=walk(pack,s,state=>state.phase==='attack'&&state.active===0);
 s=act(pack,s,a=>a.type==='attack'&&a.uid===fighter.uid);
 assert.equal(s.pending.kind,'block');
 assert.equal(s.pending.choices?.includes?.(mark.uid)||
  legal(pack,s).some(a=>a.type==='chooseBlock'&&a.uid===mark.uid),false);
 s=act(pack,s,{type:'chooseBlock', uid:wall.uid});
 assert.equal(s.players[1].outside.some(c=>c.uid===wall.uid),true);
 assert.equal(find(s,fighter.uid)!==null,true);
 assert.equal(find(s,mark.uid).ready,false);

 let plain=open({seed:37});
 const plainFighter=seat(plain.s,0,'FIGHTER','front',0,true);
 const plainMark=seat(plain.s,1,'MARK','front',0,true);
 plain.s=walk(plain.pack,plain.s,state=>state.phase==='attack'&&state.active===0);
 const plainHand=plain.s.players[1].hand.length;
 plain.s=act(plain.pack,plain.s,a=>a.type==='attack'&&a.uid===plainFighter.uid);
 plain.s=act(plain.pack,plain.s,{type:'chooseBlock', uid:plainMark.uid});
 assert.equal(plain.s.players[1].outside.some(c=>c.uid===plainMark.uid),true);
 assert.equal(plain.s.players[1].hand.length,plainHand+1);

 let leave=open({seed:38});
 const bulletHand=hold(leave.s,'MHA-1-029');
 const striker=seat(leave.s,0,'FIGHTER','front',0,true);
 seat(leave.s,0,'MHA-1-025','energy',0,true);
 seat(leave.s,0,'FUEL','energy',1,true);
 const victim=seat(leave.s,1,'MARK','front',0,true);
 leave.s=act(leave.pack,leave.s,a=>a.type==='play'&&a.uid===bulletHand.uid&&a.line==='energy');
 leave.s=act(leave.pack,leave.s,{type:'chooseRestStrip', uid:victim.uid});
 leave.s=walk(leave.pack,leave.s,state=>state.phase==='attack'&&state.active===0);
 find(leave.s,victim.uid).ready=true;
 assert.equal(assertUniversalMatch(leave.pack,leave.s),true);
 const before=leave.s.players[1].hand.length;
 leave.s=act(leave.pack,leave.s,a=>a.type==='attack'&&a.uid===striker.uid);
 assert.equal(legal(leave.pack,leave.s).some(a=>a.type==='chooseBlock'&&a.uid===victim.uid),true);
 leave.s=act(leave.pack,leave.s,{type:'chooseBlock', uid:victim.uid});
 assert.equal(leave.s.players[1].outside.some(c=>c.uid===victim.uid),true);
 assert.equal(leave.s.players[1].hand.length,before);
});
