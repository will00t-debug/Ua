import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_CARDS_051_100} from '../dist/imc/cards-051-100.mjs';
import {IMC_PROGRAMS_051_100} from '../dist/universal-v2/imc/programs-051-100.mjs';
import {IMC_REQUESTS_051_100} from '../dist/universal-v2/imc/requests-051-100.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {runImc051} from '../dist/universal-v2/imc/runtime-051-100.mjs';
import {imcSharedRequests} from '../dist/universal-v2/imc-runtime.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';

const READY=['IMC-1-053','IMC-1-056','IMC-1-058','IMC-1-059','IMC-1-063',
 'IMC-1-067','IMC-1-076','IMC-1-085','IMC-1-086','IMC-1-088',
 'IMC-1-089','IMC-1-091','IMC-1-092','IMC-1-095','IMC-1-096','IMC-1-100'];
const OPEN=['IMC-1-051','IMC-1-052','IMC-1-054','IMC-1-055','IMC-1-057',
 'IMC-1-060','IMC-1-061','IMC-1-062','IMC-1-064','IMC-1-065','IMC-1-066','IMC-1-068',
 'IMC-1-069','IMC-1-070','IMC-1-071','IMC-1-072','IMC-1-073','IMC-1-074',
 'IMC-1-075','IMC-1-077','IMC-1-078','IMC-1-079','IMC-1-080','IMC-1-081',
 'IMC-1-082','IMC-1-083','IMC-1-084','IMC-1-087','IMC-1-090','IMC-1-093',
 'IMC-1-094','IMC-1-097','IMC-1-098','IMC-1-099'];
const TRAIT='お願い！シンデレラ';
const pack=createImcV2Pack();
const counts=Object.fromEntries(READY.map(id=>[id,2]));
for(const id of ['IMC-1-053','IMC-1-056','IMC-1-058','IMC-1-059','IMC-1-067',
 'IMC-1-076','IMC-1-085','IMC-1-086','IMC-1-088'])counts[id]+=2;

function kit(usePack,useCounts){
 const act=(s,action)=>dispatchUniversalAction(usePack,s,action);
 const legal=s=>legalUniversalActions(usePack,s);
 function pull(s,owner,id){
  const pl=s.players[owner];
  for(const zone of ['hand','deck','life','lifeRevealed','outside','removed']){
   const list=pl[zone];
   if(!Array.isArray(list))continue;
   const index=list.findIndex(c=>c?.cardId===id);
   if(index>=0)return list.splice(index,1)[0];
  }
  for(const line of ['front','energy']){
   const index=pl[line].findIndex(c=>c?.cardId===id);
   if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
  }
  throw Error('Missing '+id);
 }
 function hold(s,owner,id){
  const card=pull(s,owner,id);
  s.players[owner].hand.push(card);
  return card;
 }
 function seat(s,owner,id,line,slot){
  const card=pull(s,owner,id);
  card.ready=true;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner][line][slot]=card;
  return card;
 }
 function setTop(s,owner,ids){
  const deck=s.players[owner].deck;
  for(const id of [...ids].reverse())deck.unshift(pull(s,owner,id));
 }
 function reach(s,phase){
  for(let i=0;i<8&&s.phase!==phase;i++){
   if(s.pending)throw Error(s.pending.kind+' before '+phase);
   s=act(s,{type:'next'});
  }
  if(s.phase!==phase)throw Error('Stopped in '+s.phase);
  return s;
 }
 function play(s,id,line='front'){
  const card=s.players[0].hand.find(c=>c.cardId===id)||hold(s,0,id);
  const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line);
  assert.ok(action,'no legal play for '+id);
  return act(s,action);
 }
 function cast(s,id){
  const card=s.players[0].hand.find(c=>c.cardId===id)||hold(s,0,id);
  const action=legal(s).find(a=>a.type==='event'&&a.uid===card.uid);
  assert.ok(action,'no legal event for '+id);
  return act(s,action);
 }
 function fresh(seed){
  return newUniversalMatch(usePack,{decks:[useCounts,useCounts],seed,first:0});
 }
 return {act,legal,pull,hold,seat,setTop,reach,play,cast,fresh};
}
const game=kit(pack,counts);

test('sixteen complete cards enter the pack and thirty-four stay out',()=>{
 assert.deepEqual(Object.keys(pack.cards),READY);
 assert.equal(IMC_CARDS_051_100.every(card=>card.battleReady===false),true);
 for(const id of READY)assert.equal(IMC_PROGRAMS_051_100[id].ready,true,id);
 for(const id of OPEN)assert.notEqual(IMC_PROGRAMS_051_100[id]?.ready,true,id);
 assert.equal(pack.cards['IMC-1-098'],undefined);
 const text=JSON.stringify(IMC_REQUESTS_051_100);
 for(const id of OPEN)assert.match(text,new RegExp(id));
 assert.equal(imcSharedRequests().length,IMC_REQUESTS_051_100.length);
 assert.throws(()=>runImc051(null,null,{id:'IMC-1-098'}),/C 組還沒有/);
});

test('053 and 096 bounce another energy-1 character, or themselves when none qualifies',()=>{
 for(const id of ['IMC-1-053','IMC-1-096']){
  let s=game.fresh(5300+Number(id.slice(-3)));
  game.seat(s,0,id==='IMC-1-096'?'IMC-1-089':'IMC-1-059','energy',0);
  const other=game.seat(s,0,id==='IMC-1-096'?'IMC-1-091':'IMC-1-058','front',0);
  s=game.reach(s,'main');
  const self=s.players[0].hand.find(c=>c.cardId===id)||game.hold(s,0,id);
  s=game.play(s,id);
  assert.equal(s.pending.kind,'effect-bounce-own');
  assert.deepEqual(s.pending.choices,[other.uid]);
  const illegal=structuredClone(s);
  assert.throws(()=>game.act(illegal,{type:'chooseOwnBounce',uid:null}),/not currently legal/);
  s=game.act(s,{type:'chooseOwnBounce',uid:other.uid});
  assert.ok(s.players[0].hand.some(c=>c.uid===other.uid));
  assert.ok(s.players[0].front.some(c=>c?.uid===self.uid));
  assert.equal(assertUniversalMatch(pack,s),true);

  s=game.fresh(5400+Number(id.slice(-3)));
  game.seat(s,0,id==='IMC-1-096'?'IMC-1-089':'IMC-1-059','energy',0);
  game.seat(s,0,'IMC-1-086','front',1);
  s=game.reach(s,'main');
  const bounced=game.hold(s,0,id);
  const handBefore=s.players[0].hand.length;
  s=game.play(s,id);
  assert.equal(s.pending,null);
  assert.equal(s.players[0].hand.filter(c=>c.uid===bounced.uid).length,1);
  assert.equal(s.players[0].front.some(c=>c?.uid===bounced.uid),false);
  assert.ok(s.players[0].hand.length>=handBefore);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('056 and 076 show the whole private window and discard only after a real take',()=>{
 const cases=[
  ['IMC-1-056','IMC-1-058','IMC-1-086','IMC-1-088'],
  ['IMC-1-076','IMC-1-085','IMC-1-091','IMC-1-067']
 ];
 for(const [id,match,missA,missB] of cases){
  let s=game.fresh(5600);
  game.seat(s,0,id==='IMC-1-056'?'IMC-1-059':'IMC-1-088','energy',0);
  s=game.reach(s,'main');
  game.setTop(s,0,[match,missA,missB]);
  const window=s.players[0].deck.slice(0,3).map(c=>c.uid);
  s=game.play(s,id);
  assert.equal(s.pending.kind,'effect-top-filter-choice');
  assert.deepEqual(s.pending.uids,window);
  assert.deepEqual(s.pending.choices,[window[0]]);
  const hidden=universalPublicView(pack,s,1);
  assert.equal(hidden.players[0].hand,null);
  assert.equal(JSON.stringify(hidden.pending??{}).includes(s.players[0].deck[1].cardId),false);
  const taken=window[0];
  s=game.act(s,{type:'chooseTopFiltered',uid:taken});
  assert.equal(s.pending.kind,'effect-top-order');
  assert.equal(s.pending.discardAfter,true);
  assert.deepEqual(s.pending.uids,window.slice(1));
  assert.equal(s.publicReveals.some(r=>r.cardId===match),true);
  const order=[...s.pending.uids];
  for(const uid of order)s=game.act(s,{type:'chooseTopOrder',uid});
  assert.equal(s.pending.kind,'effect-discard');
  assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),order);
  const discard=s.players[0].hand.find(c=>c.uid!==taken);
  s=game.act(s,{type:'chooseDiscard',uid:discard.uid});
  assert.ok(s.players[0].outside.some(c=>c.uid===discard.uid));
  assert.ok(s.players[0].hand.some(c=>c.uid===taken));
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(pack,s),true);

  s=game.fresh(5601);
  game.seat(s,0,id==='IMC-1-056'?'IMC-1-059':'IMC-1-088','energy',0);
  s=game.reach(s,'main');
  game.setTop(s,0,[match,missA,missB]);
  s=game.play(s,id);
  const afterPlay=s.players[0].hand.length;
  s=game.act(s,{type:'chooseTopFiltered',uid:null});
  assert.notEqual(s.pending?.kind,'effect-discard');
  assert.equal(s.players[0].hand.length,afterPlay);
  while(s.pending?.kind==='effect-top-order'){
   const next=s.pending.uids.find(uid=>!s.pending.order.includes(uid));
   s=game.act(s,{type:'chooseTopOrder',uid:next});
  }
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('draw-discard cards send the chosen hand card outside and cannot decline',()=>{
 for(const id of ['IMC-1-058','IMC-1-059','IMC-1-091']){
  let s=game.fresh(5800);
  game.seat(s,0,id==='IMC-1-059'?'IMC-1-053':'IMC-1-088','energy',0);
  if(id==='IMC-1-059')game.seat(s,0,'IMC-1-058','energy',1);
  s=game.reach(s,'main');
  game.hold(s,0,id);
  const extra=game.hold(s,0,'IMC-1-088');
  const deck=s.players[0].deck.length;
  s=game.play(s,id);
  assert.equal(s.players[0].deck.length,deck-1);
  assert.equal(s.pending.kind,'effect-discard');
  assert.throws(()=>game.act(structuredClone(s),{type:'chooseDiscard',uid:null}),/not currently legal/);
  s=game.act(s,{type:'chooseDiscard',uid:extra.uid});
  assert.ok(s.players[0].outside.some(c=>c.uid===extra.uid));
  assert.equal(s.players[0].removed?.some(c=>c.uid===extra.uid),false);
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('063 and 100 each recover up to two rested AP and may stop early',()=>{
 for(const id of ['IMC-1-063','IMC-1-100']){
  let s=game.fresh(6300+Number(id.slice(-3)));
  if(id==='IMC-1-063'){
   game.seat(s,0,'IMC-1-059','energy',0);
   game.seat(s,0,'IMC-1-053','energy',1);
  }else{
   game.seat(s,0,'IMC-1-096','energy',0);
   game.seat(s,0,'IMC-1-089','energy',1);
  }
  s=game.reach(s,'main');
  const aps=s.players[0].apCards;
  aps[1].inPlay=true; aps[2].inPlay=true;
  aps[0].ready=false; aps[1].ready=false; aps[2].ready=true;
  const rested=aps[0].uid,other=aps[1].uid;
  s=game.cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  assert.equal(s.pending.remaining,2);
  assert.ok(game.legal(s).some(a=>a.uid===null));
  s=game.act(s,{type:'chooseApRecovery',uid:rested});
  assert.equal(s.players[0].apCards.find(c=>c.uid===rested).ready,true);
  assert.throws(()=>game.act(structuredClone(s),{type:'chooseApRecovery',uid:rested}),
   /not currently legal/);
  s=game.act(s,{type:'chooseApRecovery',uid:null});
  assert.equal(s.players[0].apCards.find(c=>c.uid===other).ready,false);
  assert.equal(s.pending,null);
  assert.equal(assertUniversalMatch(pack,s),true);

  s=game.fresh(6400+Number(id.slice(-3)));
  if(id==='IMC-1-063'){
   game.seat(s,0,'IMC-1-059','energy',0);
   game.seat(s,0,'IMC-1-053','energy',1);
  }else{
   game.seat(s,0,'IMC-1-096','energy',0);
   game.seat(s,0,'IMC-1-089','energy',1);
  }
  s=game.reach(s,'main');
  for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
  s=game.cast(s,id);
  assert.equal(s.pending.kind,'effect-recover-ap');
  const paid=s.players[0].apCards.filter(c=>c.inPlay&&!c.ready);
  assert.equal(paid.length,1);
  s=game.act(s,{type:'chooseApRecovery',uid:paid[0].uid});
  assert.equal(s.pending,null);
  assert.equal(s.players[0].apCards.filter(c=>c.inPlay&&!c.ready).length,0);
  assert.equal(assertUniversalMatch(pack,s),true);
 }
});

test('067 rests, gains one energy, retires at end of main, and the same copy cannot repeat',()=>{
 let s=game.fresh(6700);
 const seated=game.seat(s,0,'IMC-1-067','front',0);
 s=game.reach(s,'main');
 const uid=seated.uid;
 assert.equal(s.players[0].front.find(c=>c.uid===uid).ready,true);
 const action=game.legal(s).find(a=>a.type==='activate'&&a.uid===uid);
 assert.equal(action.mode,'selfRestEnergyRetire');
 s=game.act(s,action);
 const used=s.players[0].front.find(c=>c?.uid===uid);
 assert.equal(used.ready,false);
 assert.equal(used.buffs.some(b=>b.energy===1),true);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===uid),false);
 for(let i=0;i<6&&!s.players[0].outside.some(c=>c.uid===uid);i++){
  if(s.pending)break;
  s=game.act(s,{type:'next'});
 }
 assert.ok(s.players[0].outside.some(c=>c.uid===uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6702);
 s=game.reach(s,'main');
 s=game.play(s,'IMC-1-067','front');
 const played=s.players[0].front.find(c=>c?.cardId==='IMC-1-067');
 assert.equal(played.ready,false);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===played.uid),false);

 s=game.fresh(6701);
 const energy=game.seat(s,0,'IMC-1-067','energy',0);
 const front=game.seat(s,0,'IMC-1-067','front',0);
 s=game.reach(s,'main');
 s=game.act(s,game.legal(s).find(a=>a.type==='activate'&&a.uid===energy.uid));
 assert.equal(s.players[0].energy.find(c=>c?.uid===energy.uid).ready,false);
 assert.equal(s.players[0].energy.find(c=>c?.uid===energy.uid).buffs.some(b=>b.energy===1),true);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===energy.uid),false);
 assert.ok(game.legal(s).some(a=>a.type==='activate'&&a.uid===front.uid));
 s=game.act(s,game.legal(s).find(a=>a.type==='activate'&&a.uid===front.uid));
 assert.equal(s.players[0].front.find(c=>c?.uid===front.uid).ready,false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('085 sends only the trait outside and 095 sends at most one of any card',()=>{
 let s=game.fresh(8500);
 s=game.reach(s,'main');
 game.setTop(s,0,['IMC-1-076','IMC-1-091']);
 s=game.play(s,'IMC-1-085');
 assert.equal(s.pending.kind,'effect-top-trait-outside');
 assert.equal(s.pending.uids.length,2);
 assert.deepEqual(s.pending.choices,[s.pending.uids[0]]);
 const star=s.pending.choices[0];
 s=game.act(s,{type:'chooseTopTraitOutside',uid:star});
 while(s.pending?.kind==='effect-top-order')
  s=game.act(s,{type:'chooseTopOrder',uid:s.pending.uids[0]});
 assert.ok(s.players[0].outside.some(c=>c.uid===star));
 assert.equal(s.players[0].deck[0].cardId,'IMC-1-091');
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(9500);
 s=game.reach(s,'main');
 game.setTop(s,0,['IMC-1-091','IMC-1-088']);
 s=game.play(s,'IMC-1-095');
 assert.equal(s.pending.kind,'effect-top-inspect-many');
 assert.equal(s.pending.maxOutside,1);
 assert.equal(s.pending.uids.length,2);
 const first=s.pending.uids[0],second=s.pending.uids[1];
 s=game.act(s,{type:'chooseInspectedOutside',uid:first});
 assert.equal(s.pending.kind,'effect-top-order');
 assert.deepEqual(s.pending.uids,[second]);
 s=game.act(s,{type:'chooseTopOrder',uid:second});
 assert.ok(s.players[0].outside.some(c=>c.uid===first));
 assert.equal(s.players[0].deck[0].uid,second);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('088 has no effect, 089 can step, and 092 peeks privately onto the top or outside',()=>{
 let s=game.fresh(8800);
 s=game.reach(s,'main');
 s=game.play(s,'IMC-1-088');
 assert.equal(s.pending,null);
 const entered=s.players[0].front.find(c=>c?.cardId==='IMC-1-088');
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8900);
 const step=game.seat(s,0,'IMC-1-089','front',0);
 const plain=game.seat(s,0,'IMC-1-092','front',1);
 s=game.reach(s,'move');
 assert.equal(pack.cards['IMC-1-089'].step,true);
 assert.ok(game.legal(s).some(a=>a.type==='step'&&a.uid===step.uid));
 assert.equal(game.legal(s).some(a=>a.type==='step'&&a.uid===plain.uid),false);
 s=game.act(s,game.legal(s).find(a=>a.type==='step'&&a.uid===step.uid));
 assert.ok(s.players[0].energy.some(c=>c?.uid===step.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(9200);
 game.seat(s,0,'IMC-1-096','energy',0);
 game.seat(s,0,'IMC-1-089','energy',1);
 s=game.reach(s,'main');
 game.setTop(s,0,['IMC-1-086']);
 const secret=s.players[0].deck[0];
 const deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-092');
 assert.equal(s.pending.kind,'private-top-choice');
 assert.equal(s.players[0].deck.length,deck);
 const foe=universalPublicView(pack,s,1);
 assert.equal(JSON.stringify(foe.pending??{}).includes(secret.cardId),false);
 s=game.act(s,{type:'chooseTopCard',mode:'outside'});
 assert.ok(s.players[0].outside.some(c=>c.uid===secret.uid));
 assert.equal(s.pending,null);

 s=game.fresh(9201);
 game.seat(s,0,'IMC-1-096','energy',0);
 game.seat(s,0,'IMC-1-089','energy',1);
 s=game.reach(s,'main');
 game.setTop(s,0,['IMC-1-086']);
 const kept=s.players[0].deck[0];
 s=game.play(s,'IMC-1-092');
 s=game.act(s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.players[0].deck[0].uid,kept.uid);
 assert.equal(s.players[0].outside.some(c=>c.uid===kept.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('089 without three red energy cannot be played, and its peek is the same private choice',()=>{
 let s=game.fresh(8901);
 s=game.reach(s,'main');
 const card=game.hold(s,0,'IMC-1-089');
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===card.uid),false);
 game.seat(s,0,'IMC-1-096','energy',0);
 game.seat(s,0,'IMC-1-089','energy',1);
 game.setTop(s,0,['IMC-1-088']);
 s=game.play(s,'IMC-1-089');
 assert.equal(s.pending.kind,'private-top-choice');
 s=game.act(s,{type:'chooseTopCard',mode:'top'});
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('086 printed impact deals one life damage when its battle is won',()=>{
 let s=game.fresh(8600);
 const attacker=game.seat(s,0,'IMC-1-086','front',0);
 const blocker=game.seat(s,1,'IMC-1-058','front',0);
 s=game.reach(s,'attack');
 const life=s.players[1].life.length;
 s=game.act(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'block');
 s=game.act(s,{type:'chooseBlock',uid:blocker.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.ok(s.players[0].front.some(c=>c?.uid===attacker.uid));
 const revealed=s.pending?.kind==='life-trigger'||s.players[1].life.length===life-1;
 assert.equal(revealed,true);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('life triggers on the ready cards draw, ready, or rebuild the last life',()=>{
 let s=game.fresh(9100);
 s=game.reach(s,'main');
 const drawn=game.pull(s,0,'IMC-1-058');
 s.players[0].outside.push(drawn);
 const hand=s.players[0].hand.length;
 s.pending={kind:'life-trigger',player:0,uid:drawn.uid,trigger:'draw'};
 s=game.act(s,game.legal(s).find(a=>a.mode==='draw'));
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(universalPublicView(pack,s,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8801);
 const target=game.seat(s,0,'IMC-1-088','front',0);
 target.ready=false;
 const lifeCard=game.pull(s,0,'IMC-1-056');
 s.players[0].outside.push(lifeCard);
 s.pending={kind:'life-trigger',player:0,uid:lifeCard.uid,trigger:'active'};
 s=game.act(s,game.legal(s).find(a=>a.mode==='active'&&a.uid===target.uid));
 const readied=s.players[0].front.find(c=>c?.uid===target.uid);
 assert.equal(readied.ready,true);
 assert.equal(readied.buffs.some(b=>b.bp===3000),true);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(1000);
 const finalCard=game.pull(s,0,'IMC-1-100');
 s.players[0].outside.push(finalCard);
 s.players[0].outside.push(...s.players[0].life.splice(0));
 s.pending={kind:'life-trigger',player:0,uid:finalCard.uid,trigger:'final'};
 const top=s.players[0].deck[0];
 s=game.act(s,game.legal(s).find(a=>a.mode==='final'));
 assert.equal(s.players[0].life[0].uid,top.uid);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('IMC-1-098 draws one and does not turn field names or an event into the missing grants',()=>{
 const card=IMC_CARDS_051_100.find(c=>c.id==='IMC-1-098');
 const program=IMC_PROGRAMS_051_100['IMC-1-098'];
 assert.notEqual(program.ready,true);
 assert.deepEqual(program.effects.onPlay.map(step=>step.op),['draw']);
 assert.equal(program.triggerEffect.op,'retireOppFront');
 assert.equal(card.trigger,'special');
 assert.match(card.effectJa,/カードを1枚引く/);
 assert.match(card.effectJa,/消費APを-1する/);
 assert.match(card.effectJa,/合計6種類以上/);
 assert.match(card.effectJa,/合計9種類以上/);
 const shell={
  id:card.id,name:card.nameJa,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,traits:[],
  implementation:'dsl',effects:program.effects,triggerEffect:program.triggerEffect
 };
 const fillerIds=['IMC-1-053','IMC-1-058','IMC-1-067','IMC-1-076','IMC-1-085',
  'IMC-1-086','IMC-1-088','IMC-1-089','IMC-1-091','IMC-1-092','IMC-1-095','IMC-1-096'];
 const filler=fillerIds.map(id=>{
  const c=IMC_CARDS_051_100.find(x=>x.id===id);
  return {id:c.id,name:c.nameJa,color:c.color,type:c.type,energy:c.energy,
   ap:c.ap,bp:c.bp,gen:c.gen,trigger:c.trigger,traits:[...c.traits],
   ...(c.traitComponents?{traitComponents:[...c.traitComponents]}:{}),
   implementation:'vanilla'};
 });
 const probe=createUniversalPack({id:'imc-098',version:'probe',cards:[shell,...filler]});
 const probeCounts=Object.fromEntries(fillerIds.map(id=>[id,4]));
 probeCounts['IMC-1-098']=2;
 const local=kit(probe,probeCounts);
 let s=local.fresh(9800);
 local.seat(s,0,'IMC-1-096','energy',0);
 local.seat(s,0,'IMC-1-096','energy',1);
 local.seat(s,0,'IMC-1-089','energy',2);
 local.seat(s,0,'IMC-1-089','energy',3);
 s=local.reach(s,'main');
 s.players[0].apCards[1].inPlay=true;
 s.players[0].apCards[1].ready=true;
 s.players[0].apCards[2].inPlay=true;
 s.players[0].apCards[2].ready=true;
 local.hold(s,0,'IMC-1-098');
 const names=['島村卯月','渋谷凛','本田未央','城ヶ崎美嘉','諸星きらり','双葉杏'];
 const state={players:[{front:names.map((name,i)=>({uid:'0-'+i,name,traits:[TRAIT]})),
  energy:[],outside:[]},{front:[],energy:[],outside:[]}]};
 const printed=physical=>({name:physical.name,traits:physical.traits,type:'character'});
 assert.equal(matchesV2LiveCondition(state,0,null,{kind:'ownDistinctTraitNames',turn:'any',
  min:6,zone:'field',excludeSelf:false,trait:TRAIT},printed),true);
 state.players[0].front=[];
 state.players[0].outside=names.map((name,i)=>({uid:'0-'+i,name,traits:[TRAIT]}));
 assert.equal(matchesV2LiveCondition(state,0,null,{kind:'ownDistinctTraitNames',turn:'any',
  min:1,zone:'field',excludeSelf:false,trait:TRAIT},printed),false);
 const before=s.players[0].deck.length;
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=local.cast(s,'IMC-1-098');
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(s.continuousStates.length,0);
 assert.equal(s.pending,null);
 const outsider=local.hold(s,0,'IMC-1-086');
 s=local.play(s,'IMC-1-086');
 assert.equal(s.players[0].front.find(c=>c?.uid===outsider.uid).ready,false);
 const matching=local.hold(s,0,'IMC-1-091');
 s=local.play(s,'IMC-1-091');
 assert.equal(s.players[0].front.find(c=>c?.uid===matching.uid).ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='nextEligibleHandPlayApDiscount'),false);
 assert.equal(assertUniversalMatch(probe,s),true);

 s=local.fresh(9801);
 const special=local.pull(s,0,'IMC-1-098');
 s.players[0].outside.push(special);
 const foe=local.seat(s,1,'IMC-1-058','front',0);
 s.pending={kind:'life-trigger',player:0,uid:special.uid,trigger:'special'};
 s=local.act(s,local.legal(s).find(a=>a.mode==='special'&&a.uid===foe.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===foe.uid));
 assert.equal(assertUniversalMatch(probe,s),true);
});
