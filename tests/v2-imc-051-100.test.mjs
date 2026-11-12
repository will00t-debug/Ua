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
 assertUniversalMatch,universalPublicView,universalBp,universalEnergyByColor,
 zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';

const READY=['IMC-1-053','IMC-1-056','IMC-1-058','IMC-1-059','IMC-1-063',
 'IMC-1-066','IMC-1-067','IMC-1-070','IMC-1-071','IMC-1-076','IMC-1-077',
 'IMC-1-079','IMC-1-081','IMC-1-082','IMC-1-085','IMC-1-086','IMC-1-088',
 'IMC-1-089','IMC-1-090','IMC-1-091','IMC-1-092','IMC-1-095','IMC-1-096',
 'IMC-1-100'];
const OPEN=['IMC-1-051','IMC-1-052','IMC-1-054','IMC-1-055','IMC-1-057',
 'IMC-1-060','IMC-1-061','IMC-1-062','IMC-1-064','IMC-1-065','IMC-1-068',
 'IMC-1-069','IMC-1-072','IMC-1-073','IMC-1-074','IMC-1-075','IMC-1-078',
 'IMC-1-080','IMC-1-083','IMC-1-084','IMC-1-087','IMC-1-093','IMC-1-094',
 'IMC-1-097','IMC-1-098','IMC-1-099'];
const TRAIT='お願い！シンデレラ';
const pack=createImcV2Pack();
const counts=Object.fromEntries(READY.map(id=>[id,2]));
counts['IMC-1-088']+=2;

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

test('twenty-four complete cards enter the pack and twenty-six stay out',()=>{
 for(const id of READY)assert.equal(pack.cards[id].id,id);
 assert.equal(IMC_CARDS_051_100.every(card=>card.battleReady===false),true);
 for(const id of READY)assert.equal(IMC_PROGRAMS_051_100[id].ready,true,id);
 for(const id of OPEN)assert.notEqual(IMC_PROGRAMS_051_100[id]?.ready,true,id);
 assert.equal(pack.cards['IMC-1-098'],undefined);
 const text=JSON.stringify(IMC_REQUESTS_051_100);
 for(const id of OPEN)assert.match(text,new RegExp(id));
 assert.deepEqual(imcSharedRequests().filter(row=>OPEN.includes(row.cardId)||row.cardId==='IMC-1-098')
  .map(row=>row.cardId),IMC_REQUESTS_051_100.map(row=>row.cardId));
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

function passTurn(local,s){
 const start=s.active;
 for(let i=0;i<10&&s.active===start;i++){
  if(s.pending)throw Error('pending '+s.pending.kind+' in '+s.phase);
  if(s.phase==='attack'){
   for(const line of ['front','energy'])
    for(const c of s.players[s.active][line])if(c)c.ready=false;
  }
  assert.ok(local.legal(s).some(a=>a.type==='next'),'no next from '+s.phase);
  s=local.act(s,{type:'next'});
 }
 assert.notEqual(s.active,start);
 return s;
}
function bpAt(usePack,s,uid){
 for(const p of s.players)for(const zone of ['front','energy']){
  const card=p[zone].find(c=>c?.uid===uid);
  if(card)return universalBp(usePack,s,card);
 }
 throw Error('not on field '+uid);
}
function bare(id,name,extra={}){
 return {id,name,color:'red',type:'character',energy:0,ap:1,bp:1500,gen:0,
  trigger:null,traits:[],implementation:'vanilla',...extra};
}

test('066 draws two and a third only for an opponent character whose current BP is at least 4500',()=>{
 assert.equal(pack.cards['IMC-1-066'].type,'event');
 assert.equal(pack.cards['IMC-1-086'].bp,3000);
 assert.deepEqual(pack.cards['IMC-1-066'].effects.onPlay.map(step=>step.op),['draw','ifLiveThen']);
 assert.equal(pack.cards['IMC-1-066'].effects.onPlay[1].when.minBp,4500);
 let s=game.fresh(6600);
 game.seat(s,0,'IMC-1-059','energy',0);
 game.seat(s,0,'IMC-1-058','energy',1);
 const boosted=game.seat(s,1,'IMC-1-086','front',0);
 s=game.reach(s,'main');
 const high=s.players[1].front.find(c=>c.uid===boosted.uid);
 high.buffs=[{bp:1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,high),4500);
 game.hold(s,0,'IMC-1-066');
 let deck=s.players[0].deck.length;
 s=game.cast(s,'IMC-1-066');
 assert.equal(s.players[0].deck.length,deck-3);
 assert.ok(s.players[0].outside.some(c=>c.cardId==='IMC-1-066'));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6601);
 game.seat(s,0,'IMC-1-059','energy',0);
 game.seat(s,0,'IMC-1-058','energy',1);
 const plain=game.seat(s,1,'IMC-1-086','front',0);
 s=game.reach(s,'main');
 assert.equal(universalBp(pack,s,s.players[1].front.find(c=>c.uid===plain.uid)),3000);
 game.hold(s,0,'IMC-1-066');
 deck=s.players[0].deck.length;
 s=game.cast(s,'IMC-1-066');
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6602);
 game.seat(s,0,'IMC-1-059','energy',0);
 game.seat(s,0,'IMC-1-058','energy',1);
 s=game.reach(s,'main');
 game.hold(s,0,'IMC-1-066');
 deck=s.players[0].deck.length;
 s=game.cast(s,'IMC-1-066');
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6603);
 s=game.reach(s,'main');
 const unpaid=game.hold(s,0,'IMC-1-066');
 assert.equal(game.legal(s).some(a=>a.type==='event'&&a.uid===unpaid.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'event',uid:unpaid.uid}),/not currently legal/);

 s=game.fresh(6604);
 const stillHigh=game.seat(s,1,'IMC-1-086','front',0);
 stillHigh.buffs=[{bp:1500,untilTurn:s.turn}];
 const life=game.pull(s,0,'IMC-1-066');
 s.players[0].outside.push(life);
 s.pending={kind:'life-trigger',player:0,uid:life.uid,trigger:'draw'};
 const hand=s.players[0].hand.length;
 deck=s.players[0].deck.length;
 s=game.act(s,game.legal(s).find(a=>a.mode==='draw'));
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(pack,s),true);

 const printed=IMC_CARDS_051_100.find(c=>c.id==='IMC-1-066');
 const event={id:printed.id,name:printed.nameJa,color:printed.color,type:printed.type,
  energy:printed.energy,ap:printed.ap,bp:printed.bp,gen:printed.gen,trigger:printed.trigger,
  traits:[],implementation:'dsl',
  effects:structuredClone(IMC_PROGRAMS_051_100['IMC-1-066'].effects)};
 const fillers=['IMC-F1','IMC-F2','IMC-F3','IMC-F4','IMC-F5','IMC-F6','IMC-F7','IMC-F8','IMC-F9']
  .map((id,i)=>bare(id,'補位'+i));
 const probe=createUniversalPack({id:'imc-066',version:'probe',cards:[
  event,
  bare('IMC-HIGH','印刷高',{bp:5000}),
  bare('IMC-LOW','印刷低',{bp:2000}),
  bare('IMC-BLUE','藍能源',{color:'blue',gen:3}),
  ...fillers
 ]});
 const probeCounts=Object.fromEntries(['IMC-HIGH','IMC-LOW','IMC-BLUE',...fillers.map(c=>c.id)]
  .map(id=>[id,4]));
 probeCounts['IMC-1-066']=2;
 const local=kit(probe,probeCounts);
 s=local.fresh(6610);
 local.seat(s,0,'IMC-BLUE','energy',0);
 const printedHigh=local.seat(s,1,'IMC-HIGH','front',0);
 s=local.reach(s,'main');
 const currentLow=s.players[1].front.find(c=>c.uid===printedHigh.uid);
 currentLow.buffs=[{bp:-1000,untilTurn:s.turn}];
 assert.equal(probe.cards['IMC-HIGH'].bp,5000);
 assert.equal(universalBp(probe,s,currentLow),4000);
 local.hold(s,0,'IMC-1-066');
 deck=s.players[0].deck.length;
 s=local.cast(s,'IMC-1-066');
 assert.equal(s.players[0].deck.length,deck-2);
 assert.equal(assertUniversalMatch(probe,s),true);

 s=local.fresh(6611);
 local.seat(s,0,'IMC-BLUE','energy',0);
 const printedLow=local.seat(s,1,'IMC-LOW','front',0);
 s=local.reach(s,'main');
 const currentHigh=s.players[1].front.find(c=>c.uid===printedLow.uid);
 currentHigh.buffs=[{bp:2500,untilTurn:s.turn}];
 assert.equal(probe.cards['IMC-LOW'].bp,2000);
 assert.equal(universalBp(probe,s,currentHigh),4500);
 local.hold(s,0,'IMC-1-066');
 deck=s.players[0].deck.length;
 s=local.cast(s,'IMC-1-066');
 assert.equal(s.players[0].deck.length,deck-3);
 assert.ok(s.players[0].outside.some(c=>c.cardId==='IMC-1-066'));
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('070 and 071 count distinct printed names on the field and outside',()=>{
 assert.equal(pack.cards['IMC-1-070'].bp,2000);
 assert.equal(pack.cards['IMC-1-071'].bp,1500);
 assert.equal(pack.cards['IMC-1-070'].passiveBonuses[0].condition.zone,'fieldOutside');
 assert.equal(pack.cards['IMC-1-070'].passiveBonuses[0].condition.min,6);
 assert.equal(pack.cards['IMC-1-071'].passiveBonuses[0].condition.turn,'own');
 assert.equal(pack.cards['IMC-1-088'].name,pack.cards['IMC-1-089'].name);
 assert.equal(pack.cards['IMC-1-088'].name,pack.cards['IMC-1-090'].name);
 for(const id of ['IMC-1-070','IMC-1-071','IMC-1-091','IMC-1-096'])
  assert.notEqual(pack.cards[id].name,pack.cards['IMC-1-088'].name,id);
 let s=game.fresh(7000);
 s=game.reach(s,'main');
 const seated=['IMC-1-070','IMC-1-071','IMC-1-088','IMC-1-091','IMC-1-096']
  .map((id,i)=>game.seat(s,0,id,i<4?'front':'energy',i<4?i:0));
 const rin=pack.cards['IMC-1-088'].name;
 for(const id of ['IMC-1-089','IMC-1-090']){
  const copy=game.pull(s,0,id);
  assert.equal(pack.cards[id].name,rin);
  s.players[0].outside.push(copy);
 }
 assert.equal(bpAt(pack,s,seated[0].uid),2000);
 assert.equal(bpAt(pack,s,seated[1].uid),1500);
 assert.equal(assertUniversalMatch(pack,s),true);

 const names=['神崎 蘭子','小日向 美穂','双葉 杏','三村 かな子','諸星 きらり'];
 const named=names.map((name,i)=>bare('IMC-N'+(i+1),name,{traits:[TRAIT]}));
 const blanks=['IMC-X1','IMC-X2','IMC-X3','IMC-X4','IMC-X5','IMC-X6']
  .map((id,i)=>bare(id,'無特徵'+i));
 const featured=['IMC-1-070','IMC-1-071'].map(id=>{
  const card=IMC_CARDS_051_100.find(c=>c.id===id);
  return bare(id,card.nameJa,{energy:card.energy,bp:card.bp,gen:card.gen,trigger:card.trigger,
   traits:[...card.traits],implementation:'dsl',
   passiveBonuses:structuredClone(IMC_PROGRAMS_051_100[id].passiveBonuses)});
 });
 const probe=createUniversalPack({id:'imc-names',version:'probe',
  cards:[...featured,...named,...blanks]});
 const ids=[...featured,...named,...blanks].map(c=>c.id);
 const probeCounts=Object.fromEntries(ids.map(id=>[id,4]));
 probeCounts['IMC-X6']=2;
 const local=kit(probe,probeCounts);
 s=local.fresh(7010);
 s=local.reach(s,'main');
 const field=['IMC-1-070','IMC-1-071','IMC-N1','IMC-N2','IMC-N3','IMC-N4']
  .map((id,i)=>local.seat(s,0,id,i<4?'front':'energy',i<4?i:i-4));
 assert.equal(bpAt(probe,s,field[0].uid),3000);
 assert.equal(bpAt(probe,s,field[1].uid),3000);
 const sixth=local.hold(s,0,'IMC-N5');
 assert.equal(bpAt(probe,s,field[0].uid),3000);
 const moved=s.players[0].energy[1];
 s.players[0].energy[1]=null;
 s.players[0].outside.push(moved);
 assert.equal(bpAt(probe,s,field[0].uid),3000);
 s.players[0].outside=s.players[0].outside.filter(c=>c.uid!==moved.uid);
 s.players[0].deck.push(moved);
 assert.equal(bpAt(probe,s,field[0].uid),2000);
 assert.equal(bpAt(probe,s,field[1].uid),1500);
 const duplicate=local.pull(s,0,'IMC-1-070');
 s.players[0].outside.push(duplicate);
 assert.equal(bpAt(probe,s,field[0].uid),2000);
 s.players[0].hand=s.players[0].hand.filter(c=>c.uid!==sixth.uid);
 s.players[0].outside.push(sixth);
 assert.equal(bpAt(probe,s,field[0].uid),3000);
 assert.equal(bpAt(probe,s,field[1].uid),3000);
 s=passTurn(local,s);
 assert.equal(s.active,1);
 assert.equal(bpAt(probe,s,field[0].uid),3000);
 assert.equal(bpAt(probe,s,field[1].uid),1500);
 assert.equal(assertUniversalMatch(probe,s),true);

 s=local.fresh(7011);
 const life=local.pull(s,0,'IMC-1-070');
 s.players[0].outside.push(life);
 const hand=s.players[0].hand.length;
 s.pending={kind:'life-trigger',player:0,uid:life.uid,trigger:'draw'};
 s=local.act(s,local.legal(s).find(a=>a.mode==='draw'));
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('077 discounts two red energy only while its own field is empty, then draws and puts one hand card outside',()=>{
 const definition=pack.cards['IMC-1-077'];
 assert.equal(definition.energy,2);
 assert.equal(definition.color,'red');
 assert.equal(definition.emptyOwnFieldHandEnergyDiscount,2);
 let s=game.fresh(7700);
 s=game.reach(s,'main');
 const actor=game.hold(s,0,'IMC-1-077');
 const other=game.hold(s,0,'IMC-1-086');
 assert.equal(zoneRequiredEnergy(pack,s,0,definition,'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,s,0,pack.cards['IMC-1-086'],'hand'),2);
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===other.uid),false);
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===actor.uid),true);
 const deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-077');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseDiscard',uid:null}),/not currently legal/);
 const discarded=s.players[0].hand[0];
 s=game.act(s,{type:'chooseDiscard',uid:discarded.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(s.players[0].removed.some(c=>c.uid===discarded.uid),false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7701);
 game.seat(s,0,'IMC-1-059','energy',0);
 s=game.reach(s,'main');
 const blocked=game.hold(s,0,'IMC-1-077');
 assert.equal(universalEnergyByColor(pack,s,0).blue,2);
 assert.equal(universalEnergyByColor(pack,s,0).red,undefined);
 assert.equal(zoneRequiredEnergy(pack,s,0,definition,'hand'),2);
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===blocked.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'play',uid:blocked.uid,line:'front',slot:0}),
  /not currently legal/);

 s=game.fresh(7702);
 game.seat(s,0,'IMC-1-088','energy',0);
 s=game.reach(s,'main');
 assert.equal(universalEnergyByColor(pack,s,0).red,1);
 assert.equal(zoneRequiredEnergy(pack,s,0,definition,'hand'),2);
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===game.hold(s,0,'IMC-1-077').uid),false);
 game.seat(s,0,'IMC-1-090','energy',1);
 assert.equal(universalEnergyByColor(pack,s,0).red,3);
 assert.equal(zoneRequiredEnergy(pack,s,0,definition,'hand'),2);
 s=game.play(s,'IMC-1-077');
 assert.equal(s.pending.kind,'effect-discard');
 s=game.act(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7703);
 const rested=game.seat(s,0,'IMC-1-088','front',0);
 rested.ready=false;
 const trigger=game.pull(s,0,'IMC-1-077');
 s.players[0].outside.push(trigger);
 s.pending={kind:'life-trigger',player:0,uid:trigger.uid,trigger:'active'};
 s=game.act(s,game.legal(s).find(a=>a.mode==='active'&&a.uid===rested.uid));
 const readied=s.players[0].front.find(c=>c?.uid===rested.uid);
 assert.equal(readied.ready,true);
 assert.equal(readied.buffs.some(b=>b.bp===3000),true);
 assert.notEqual(s.pending?.kind,'effect-discard');
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('079 rests one red Starry-Go-Round of printed energy 2 or less from hand',()=>{
 const step=pack.cards['IMC-1-079'].effects.onPlay[0];
 assert.equal(step.op,'deployOwnHandRest');
 assert.equal(step.ap,null);
 assert.equal(step.energy,2);
 assert.equal(step.color,'red');
 assert.equal(pack.cards['IMC-1-076'].energy,1);
 assert.equal(pack.cards['IMC-1-086'].energy,2);
 assert.equal(pack.cards['IMC-1-079'].energy,3);
 assert.equal(pack.cards['IMC-1-067'].traits.length,0);
 assert.equal(pack.cards['IMC-1-058'].color,'blue');
 let s=game.fresh(7900);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 s=game.reach(s,'main');
 const low=game.hold(s,0,'IMC-1-076');
 const exact=game.hold(s,0,'IMC-1-086');
 const plain=game.hold(s,0,'IMC-1-067');
 const blue=game.hold(s,0,'IMC-1-058');
 const copies=[];
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[0][zone];
  for(let i=list.length-1;i>=0;i--)
   if(list[i]?.cardId==='IMC-1-079')copies.push(list.splice(i,1)[0]);
 }
 assert.equal(copies.length,2);
 s.players[0].hand.push(...copies);
 const decoy=copies[1];
 const keep=new Set([low.uid,exact.uid,plain.uid,blue.uid,copies[0].uid,decoy.uid]);
 const hand=s.players[0].hand;
 for(let i=hand.length-1;i>=0;i--)
  if(!keep.has(hand[i].uid))s.players[0].deck.push(hand.splice(i,1)[0]);
 const before=s.players[0].apCards.filter(c=>c.ready).length;
 s=game.play(s,'IMC-1-079');
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.ok(s.players[0].hand.some(c=>c.uid===decoy.uid));
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.deepEqual([...s.pending.choices].sort(),[low.uid,exact.uid].sort());
 for(const uid of [plain.uid,blue.uid,decoy.uid])
  assert.equal(s.pending.choices.includes(uid),false,uid);
 assert.equal(game.legal(s).some(a=>a.type==='chooseHandRest'&&a.uid===null),true);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseHandRest',uid:plain.uid,line:'front',slot:0}),
  /not currently legal/);
 const choice=game.legal(s).find(a=>a.type==='choiceHandRest'||
  (a.type==='chooseHandRest'&&a.uid===exact.uid&&a.line==='front'));
 assert.equal(choice.type,'chooseHandRest');
 s=game.act(s,choice);
 const entered=s.players[0].front.find(c=>c?.uid===exact.uid);
 assert.equal(entered.ready,false);
 assert.equal(s.players[0].hand.some(c=>c.uid===exact.uid),false);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,before-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(7901);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 s=game.reach(s,'main');
 const stayed=game.hold(s,0,'IMC-1-086');
 s=game.play(s,'IMC-1-079');
 s=game.act(s,game.legal(s).find(a=>a.type==='chooseHandRest'&&a.uid===null));
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===stayed.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===stayed.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('081 and 082 use the printed energy of Starry-Go-Round cards, not current BP or the card name',()=>{
 assert.equal(pack.cards['IMC-1-081'].energy,0);
 assert.equal(pack.cards['IMC-1-081'].bp,1500);
 assert.equal(pack.cards['IMC-1-082'].energy,2);
 assert.equal(pack.cards['IMC-1-082'].gen,1);
 assert.equal(pack.cards['IMC-1-082'].color,'red');
 assert.equal(pack.cards['IMC-1-081'].name,pack.cards['IMC-1-082'].name);
 assert.equal(pack.cards['IMC-1-082'].passiveBonuses[0].extraEnergy,1);
 assert.equal(pack.cards['IMC-1-082'].triggerEffect.bp,2500);
 let s=game.fresh(8100);
 s=game.reach(s,'main');
 const self=game.seat(s,0,'IMC-1-081','front',0);
 const twins=[game.seat(s,0,'IMC-1-082','front',1),game.seat(s,0,'IMC-1-082','front',2)];
 assert.equal(bpAt(pack,s,self.uid),1500);
 const low=game.seat(s,0,'IMC-1-076','front',3);
 low.buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,low),4500);
 assert.equal(bpAt(pack,s,self.uid),1500);
 s.players[0].deck.push(low);
 s.players[0].front[3]=null;
 const high=game.pull(s,0,'IMC-1-079');
 high.ready=true;
 high.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[3]=high;
 assert.equal(bpAt(pack,s,self.uid),1500);
 s.players[0].deck.push(high);
 s.players[0].front[3]=null;
 const third=game.pull(s,0,'IMC-1-086');
 third.ready=true;
 third.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].front[3]=third;
 assert.equal(bpAt(pack,s,self.uid),3000);
 assert.equal(pack.cards['IMC-1-086'].name===pack.cards['IMC-1-082'].name,false);
 assert.equal(twins.length,2);
 s=passTurn(game,s);
 assert.equal(bpAt(pack,s,self.uid),3000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8101);
 const rested=game.seat(s,0,'IMC-1-088','front',0);
 rested.ready=false;
 const life=game.pull(s,0,'IMC-1-081');
 s.players[0].outside.push(life);
 s.pending={kind:'life-trigger',player:0,uid:life.uid,trigger:'active'};
 s=game.act(s,game.legal(s).find(a=>a.mode==='active'&&a.uid===rested.uid));
 const readied=s.players[0].front.find(c=>c?.uid===rested.uid);
 assert.equal(readied.ready,true);
 assert.equal(readied.buffs.some(b=>b.bp===3000),true);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8200);
 s=game.reach(s,'main');
 const generator=game.seat(s,0,'IMC-1-082','energy',0);
 generator.ready=false;
 assert.equal(universalEnergyByColor(pack,s,0).red,1);
 assert.equal(universalEnergyByColor(pack,s,0).blue,undefined);
 game.seat(s,0,'IMC-1-077','front',0);
 game.seat(s,0,'IMC-1-086','front',1);
 assert.equal(universalEnergyByColor(pack,s,0).red,2);
 generator.ready=true;
 assert.equal(universalEnergyByColor(pack,s,0).red,2);
 const removed=s.players[0].front[1];
 s.players[0].front[1]=null;
 s.players[0].outside.push(removed);
 assert.equal(universalEnergyByColor(pack,s,0).red,1);
 s=passTurn(game,s);
 game.seat(s,0,'IMC-1-086','front',1);
 const still=s.players[0].energy.find(c=>c?.uid===generator.uid);
 still.ready=false;
 assert.equal(universalEnergyByColor(pack,s,0).red,2);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8201);
 const cheap=game.seat(s,1,'IMC-1-088','front',0);
 cheap.buffs=[{bp:1000,untilTurn:s.turn}];
 const reduced=game.seat(s,1,'IMC-1-086','front',1);
 reduced.buffs=[{bp:-500,untilTurn:s.turn}];
 assert.equal(pack.cards['IMC-1-088'].bp,2000);
 assert.equal(universalBp(pack,s,cheap),3000);
 assert.equal(pack.cards['IMC-1-086'].bp,3000);
 assert.equal(universalBp(pack,s,reduced),2500);
 const color=game.pull(s,0,'IMC-1-082');
 s.players[0].outside.push(color);
 s.pending={kind:'life-trigger',player:0,uid:color.uid,trigger:'color'};
 const modes=game.legal(s).filter(a=>a.mode==='colorRetire').map(a=>a.uid);
 assert.deepEqual(modes,[reduced.uid]);
 assert.equal(game.legal(s).some(a=>a.mode==='skip'),true);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseTrigger',mode:'colorRetire',uid:cheap.uid}),
  /not currently legal/);
 s=game.act(s,game.legal(s).find(a=>a.mode==='colorRetire'&&a.uid===reduced.uid));
 assert.ok(s.players[1].outside.some(c=>c.uid===reduced.uid));
 assert.ok(s.players[1].front.some(c=>c?.uid===cheap.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8202);
 const exact=game.seat(s,1,'IMC-1-088','front',0);
 exact.buffs=[{bp:500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,exact),2500);
 const skipped=game.pull(s,0,'IMC-1-082');
 s.players[0].outside.push(skipped);
 s.pending={kind:'life-trigger',player:0,uid:skipped.uid,trigger:'color'};
 assert.equal(game.legal(s).some(a=>a.mode==='colorRetire'&&a.uid===exact.uid),true);
 s=game.act(s,game.legal(s).find(a=>a.mode==='skip'));
 assert.ok(s.players[1].front.some(c=>c?.uid===exact.uid));
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('090 adds one red energy while it is active on the energy line',()=>{
 const definition=pack.cards['IMC-1-090'];
 assert.equal(definition.trigger,null);
 assert.equal(definition.color,'red');
 assert.equal(definition.gen,1);
 assert.equal(definition.activeExtraEnergy,1);
 assert.equal(pack.cards['IMC-1-059'].color,'blue');
 assert.equal(pack.cards['IMC-1-059'].gen,2);
 let s=game.fresh(9000);
 s=game.reach(s,'main');
 const self=game.seat(s,0,'IMC-1-090','energy',0);
 const blue=game.seat(s,0,'IMC-1-059','energy',1);
 assert.equal(self.ready,true);
 let colors=universalEnergyByColor(pack,s,0);
 assert.equal(colors.red,2);
 assert.equal(colors.blue,2);
 self.ready=false;
 colors=universalEnergyByColor(pack,s,0);
 assert.equal(colors.red,1);
 assert.equal(colors.blue,2);
 s.players[0].energy[0]=null;
 self.ready=true;
 s.players[0].front[0]=self;
 colors=universalEnergyByColor(pack,s,0);
 assert.equal(colors.red||0,0);
 assert.equal(colors.blue,2);
 assert.equal(blue.cardId,'IMC-1-059');
 s=passTurn(game,s);
 const returned=s.players[0].front.find(c=>c?.uid===self.uid);
 returned.ready=true;
 assert.equal(universalEnergyByColor(pack,s,0).red||0,0);
 s.players[0].front[0]=null;
 s.players[0].energy[0]=returned;
 assert.equal(universalEnergyByColor(pack,s,0).red,2);
 assert.equal(universalEnergyByColor(pack,s,0).blue,2);
 assert.equal(assertUniversalMatch(pack,s),true);
});
