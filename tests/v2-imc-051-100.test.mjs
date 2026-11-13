import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_CARDS_051_100} from '../dist/imc/cards-051-100.mjs';
import {IMC_PROGRAMS_051_100} from '../dist/universal-v2/imc/programs-051-100.mjs';
import {IMC_REQUESTS_051_100} from '../dist/universal-v2/imc/requests-051-100.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {runImc051} from '../dist/universal-v2/imc/runtime-051-100.mjs';
import {imcSharedRequests} from '../dist/universal-v2/imc-runtime.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalPrivateChoices,universalBp,universalEnergyByColor,
 zoneRequiredEnergy} from '../dist/universal-v2/engine.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';

const READY=['IMC-1-052','IMC-1-053','IMC-1-054','IMC-1-055','IMC-1-056','IMC-1-057','IMC-1-058','IMC-1-059',
 'IMC-1-060','IMC-1-062','IMC-1-063','IMC-1-066','IMC-1-067','IMC-1-069',
 'IMC-1-070','IMC-1-071','IMC-1-074','IMC-1-076','IMC-1-077','IMC-1-078','IMC-1-079','IMC-1-080','IMC-1-081',
 'IMC-1-082','IMC-1-083','IMC-1-084','IMC-1-085','IMC-1-086','IMC-1-087',
 'IMC-1-088','IMC-1-089','IMC-1-090','IMC-1-091','IMC-1-092','IMC-1-095',
 'IMC-1-096','IMC-1-098','IMC-1-099','IMC-1-100','IMC-1-065'];
const OPEN=['IMC-1-051','IMC-1-061',
 'IMC-1-064','IMC-1-068','IMC-1-072','IMC-1-073',
 'IMC-1-075','IMC-1-093','IMC-1-094','IMC-1-097'];
const TRAIT='お願い！シンデレラ';
const pack=createImcV2Pack();
const counts=Object.fromEntries(READY.map(id=>[id,2]));
delete counts['IMC-1-098'];
delete counts['IMC-1-065'];
delete counts['IMC-1-078'];
for(const id of ['IMC-1-052','IMC-1-053','IMC-1-056','IMC-1-057','IMC-1-058','IMC-1-059','IMC-1-060','IMC-1-062','IMC-1-063',
 'IMC-1-066','IMC-1-070','IMC-1-071','IMC-1-074','IMC-1-076','IMC-1-080','IMC-1-085','IMC-1-087','IMC-1-090','IMC-1-091',
 'IMC-1-092','IMC-1-095','IMC-1-096','IMC-1-099','IMC-1-100'])counts[id]=1;

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

test('forty complete cards enter the pack and ten stay out',()=>{
 for(const id of READY)assert.equal(pack.cards[id].id,id);
 assert.equal(IMC_CARDS_051_100.every(card=>card.battleReady===false),true);
 for(const id of READY)assert.equal(IMC_PROGRAMS_051_100[id].ready,true,id);
 for(const id of OPEN)assert.notEqual(IMC_PROGRAMS_051_100[id]?.ready,true,id);
 assert.equal(pack.cards['IMC-1-098'].effects.onPlay[2].else[0].then[0].scope,'next');
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
 game.hold(s,0,'IMC-1-092');
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

test('IMC-1-098 discounts the next trait play and switches six names to the next entry',()=>{
 const card=IMC_CARDS_051_100.find(c=>c.id==='IMC-1-098');
 const program=IMC_PROGRAMS_051_100['IMC-1-098'];
 assert.equal(program.ready,true);
 assert.deepEqual(program.effects.onPlay.map(step=>step.op),
  ['draw','nextEligibleHandPlayApDiscount','ifLiveThen']);
 assert.equal(program.effects.onPlay[2].then[0].scope,'all');
 assert.equal(program.effects.onPlay[2].else[0].then[0].scope,'next');
 assert.equal(program.triggerEffect.op,'retireOppFront');
 assert.equal(card.trigger,'special');
 const allies=Array.from({length:9},(_,i)=>({
  id:'N'+i,name:'名'+i,color:'red',type:'character',energy:0,ap:1,bp:1500,gen:1,
  trigger:null,traits:[TRAIT],implementation:'vanilla'
 }));
 const plain={id:'PLAIN',name:'普通',color:'red',type:'character',energy:0,ap:1,bp:1500,gen:0,
  trigger:null,traits:['OTHER'],implementation:'vanilla'};
 const filler=Array.from({length:2},(_,i)=>({
  id:'F'+i,name:'填'+i,color:'red',type:'character',energy:0,ap:1,bp:1000,gen:0,
  trigger:null,traits:[],implementation:'vanilla'
 }));
 const shell={
  id:card.id,name:card.nameJa,color:card.color,type:card.type,energy:card.energy,
  ap:card.ap,bp:card.bp,gen:card.gen,trigger:card.trigger,traits:[],
  implementation:'dsl',effects:program.effects,triggerEffect:program.triggerEffect
 };
 const probe=createUniversalPack({id:'imc-098',version:'probe',cards:[shell,...allies,plain,...filler]});
 const probeCounts={...Object.fromEntries(allies.map(c=>[c.id,4])),PLAIN:4,F0:4,F1:4,'IMC-1-098':2};
 const local=kit(probe,probeCounts);
 const fuel=s=>{
  s.players[0].apCards.forEach((c,i)=>{c.inPlay=i<3;c.ready=i<3;});
 };
 const placeNames=(s,outside)=>{
  for(let i=0;i<4;i++)local.seat(s,0,'N'+i,'energy',i);
  for(let i=0;i<outside;i++)s.players[0].outside.push(local.pull(s,0,'N'+(4+i)));
 };
 let s=local.fresh(9800);
 placeNames(s,2);
 s=local.reach(s,'main');
 fuel(s);
 assert.equal(universalEnergyByColor(probe,s,0).red,4);
 local.hold(s,0,'IMC-1-098');
 const before=s.players[0].deck.length;
 s=local.cast(s,'IMC-1-098');
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.players[0].outside.some(c=>c.cardId==='IMC-1-098'),true);
 assert.equal(s.traitEntryGrants.length,1);
 assert.equal(s.traitEntryGrants[0].scope,'next');
 s.players[0].apCards.forEach(c=>{c.ready=false;});
 const matching=local.hold(s,0,'N0');
 const other=local.hold(s,0,'PLAIN');
 assert.equal(local.legal(s).some(a=>a.type==='play'&&a.uid===matching.uid),true);
 assert.equal(local.legal(s).some(a=>a.type==='play'&&a.uid===other.uid),false);
 s.players[0].apCards[0].ready=true;
 s=local.play(s,'PLAIN');
 assert.equal(s.players[0].front.find(c=>c?.cardId==='PLAIN').ready,false);
 assert.equal(s.traitEntryGrants.length,1);
 s.players[0].apCards.forEach(c=>{c.ready=false;});
 s=local.play(s,'N0');
 assert.equal(s.players[0].front.find(c=>c?.uid===matching.uid).ready,true);
 assert.equal(s.traitEntryGrants.length,0);
 s.players[0].apCards[0].ready=true;
 const second=local.hold(s,0,'N0');
 s=local.play(s,'N0');
 assert.equal(s.players[0].front.find(c=>c?.uid===second.uid).ready,false);
 assert.equal(assertUniversalMatch(probe,s),true);

 s=local.fresh(9801);
 placeNames(s,5);
 s=local.reach(s,'main');
 fuel(s);
 s=local.cast(s,'IMC-1-098');
 assert.equal(s.traitEntryGrants[0].scope,'all');
 s.players[0].apCards.forEach(c=>{c.ready=false;});
 const first=local.hold(s,0,'N0');
 s=local.play(s,'N0');
 assert.equal(s.players[0].front.find(c=>c?.uid===first.uid).ready,true);
 s.players[0].apCards[0].ready=true;
 s=local.play(s,'PLAIN');
 assert.equal(s.players[0].front.find(c=>c?.cardId==='PLAIN').ready,false);
 assert.equal(s.traitEntryGrants.length,1);
 s.players[0].apCards[1].ready=true;
 const later=local.hold(s,0,'N1');
 s=local.play(s,'N1');
 assert.equal(s.players[0].front.find(c=>c?.uid===later.uid).ready,true);
 const turn=s.turn;
 for(let i=0;i<8&&s.turn===turn;i++){
  if(s.pending?.kind==='end-hand-limit'){
   s=local.act(s,{type:'chooseHandLimit',uid:s.players[s.pending.player].hand[0].uid});
   continue;
  }
  s=local.act(s,local.legal(s).find(a=>a.type==='next'));
 }
 assert.notEqual(s.turn,turn);
 assert.deepEqual(s.traitEntryGrants,[]);
 assert.equal(assertUniversalMatch(probe,s),true);

 s=local.fresh(9802);
 const special=local.pull(s,0,'IMC-1-098');
 s.players[0].outside.push(special);
 const foe=local.seat(s,1,'PLAIN','front',0);
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

test('069 draws and discards below six names, and only draws once at six or more',()=>{
 const effect=pack.cards['IMC-1-069'].effects.onPlay[0];
 assert.equal(effect.op,'ifLiveThen');
 assert.deepEqual(effect.then,[{op:'draw',count:1}]);
 assert.deepEqual(effect.else,[{op:'drawDiscard',count:1}]);
 assert.equal(effect.when.kind,'ownDistinctTraitNames');
 assert.equal(effect.when.zone,'fieldOutside');
 assert.equal(effect.when.min,6);
 assert.equal(effect.when.excludeSelf,false);
 assert.equal(pack.cards['IMC-1-088'].name,pack.cards['IMC-1-089'].name);
 assert.equal(pack.cards['IMC-1-088'].name,pack.cards['IMC-1-090'].name);
 assert.notEqual(pack.cards['IMC-1-069'].name,pack.cards['IMC-1-088'].name);
 function fuel(s){
  game.seat(s,0,'IMC-1-088','energy',0);
  game.seat(s,0,'IMC-1-089','energy',1);
  return game.reach(s,'main');
 }
 let s=fuel(game.fresh(6900));
 game.hold(s,0,'IMC-1-069');
 let deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-069');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseDiscard',uid:null}),/not currently legal/);
 const discarded=s.players[0].hand[0];
 s=game.act(s,{type:'chooseDiscard',uid:discarded.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));
 assert.equal(s.players[0].removed.some(c=>c.uid===discarded.uid),false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=fuel(game.fresh(6901));
 for(const [id,line,slot] of [['IMC-1-070','front',0],['IMC-1-071','front',1],
  ['IMC-1-091','front',2],['IMC-1-090','front',3]])game.seat(s,0,id,line,slot);
 game.hold(s,0,'IMC-1-069');
 deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-069','energy');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending.kind,'effect-discard');
 s=game.act(s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(assertUniversalMatch(pack,s),true);

 s=fuel(game.fresh(6902));
 for(const [id,line,slot] of [['IMC-1-070','front',0],['IMC-1-071','front',1],
  ['IMC-1-091','front',2],['IMC-1-096','front',3]])game.seat(s,0,id,line,slot);
 game.hold(s,0,'IMC-1-069');
 const hand=s.players[0].hand.length;
 const outside=s.players[0].outside.length;
 deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-069','energy');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].outside.length,outside);
 assert.equal(s.pending,null);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseDiscard',uid:s.players[0].hand[0].uid}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=fuel(game.fresh(6903));
 for(const [id,line,slot] of [['IMC-1-070','front',0],['IMC-1-071','front',1],
  ['IMC-1-091','front',2]])game.seat(s,0,id,line,slot);
 const parked=game.pull(s,0,'IMC-1-096');
 s.players[0].outside.push(parked);
 game.hold(s,0,'IMC-1-069');
 deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-069');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=fuel(game.fresh(6904));
 for(const [id,line,slot] of [['IMC-1-070','front',0],['IMC-1-071','front',1],
  ['IMC-1-091','front',2]])game.seat(s,0,id,line,slot);
 game.hold(s,0,'IMC-1-096');
 game.hold(s,0,'IMC-1-069');
 s=game.play(s,'IMC-1-069');
 assert.equal(s.pending.kind,'effect-discard');
 s=game.act(s,{type:'chooseDiscard',uid:s.players[0].hand.find(c=>c.cardId!=='IMC-1-096').uid});
 assert.ok(s.players[0].hand.some(c=>c.cardId==='IMC-1-096'));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6905);
 s=game.reach(s,'main');
 game.seat(s,0,'IMC-1-088','energy',0);
 const short=game.hold(s,0,'IMC-1-069');
 assert.equal(game.legal(s).some(a=>a.type==='play'&&a.uid===short.uid),false);
 game.seat(s,0,'IMC-1-059','energy',1);
 assert.equal(universalEnergyByColor(pack,s,0).red,1);
 assert.equal(universalEnergyByColor(pack,s,0).blue,2);
 assert.throws(()=>game.act(structuredClone(s),{type:'play',uid:short.uid,line:'front',slot:0}),
  /not currently legal/);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6906);
 const life=game.pull(s,0,'IMC-1-069');
 s.players[0].outside.push(life);
 const before=s.players[0].hand.length;
 deck=s.players[0].deck.length;
 s.pending={kind:'life-trigger',player:0,uid:life.uid,trigger:'draw'};
 s=game.act(s,game.legal(s).find(a=>a.mode==='draw'));
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.notEqual(s.pending?.kind,'effect-discard');
 assert.equal(assertUniversalMatch(pack,s),true);

 const printed=IMC_CARDS_051_100.find(c=>c.id==='IMC-1-069');
 const actor=bare('IMC-1-069',printed.nameJa,{energy:printed.energy,bp:printed.bp,
  gen:printed.gen,trigger:printed.trigger,traits:[...printed.traits],implementation:'dsl',
  effects:structuredClone(IMC_PROGRAMS_051_100['IMC-1-069'].effects)});
 const names=['神崎 蘭子','城ヶ崎 美嘉','城ヶ崎 莉嘉','島村 卯月','本田 未央','双葉 杏'];
 const named=names.map((name,i)=>bare('IMC-N'+(i+1),name,{traits:[TRAIT]}));
 const blanks=['IMC-X1','IMC-X2','IMC-X3','IMC-X4','IMC-X5']
  .map((id,i)=>bare(id,'無特徵'+i));
 const generator=bare('IMC-RED','紅能源',{gen:3});
 const probe=createUniversalPack({id:'imc-069',version:'probe',
  cards:[actor,...named,generator,...blanks]});
 const probeCounts=Object.fromEntries([actor,...named,generator,...blanks].map(c=>[c.id,4]));
 probeCounts['IMC-1-069']=2;
 const local=kit(probe,probeCounts);
 s=local.fresh(6907);
 s=local.reach(s,'main');
 local.seat(s,0,'IMC-RED','energy',0);
 named.forEach((card,i)=>local.seat(s,0,card.id,i<4?'front':'energy',i<4?i:i-3));
 local.hold(s,0,'IMC-1-069');
 deck=s.players[0].deck.length;
 const sevenHand=s.players[0].hand.length;
 s=local.play(s,'IMC-1-069','energy');
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.length,sevenHand);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(probe,s),true);
});

function onceBuff(s,uid){
 return game.legal(s).some(a=>a.type==='activate'&&a.mode==='onceBuffSelf'&&a.uid===uid);
}
function findCard(s,owner,uid){
 const pl=s.players[owner];
 return ['front','energy','outside'].map(zone=>pl[zone].find(c=>c?.uid===uid)).find(Boolean);
}
function park(s,owner,uid){
 const pl=s.players[owner];
 for(const line of ['front','energy']){
  const i=pl[line].findIndex(c=>c?.uid===uid);
  if(i<0)continue;
  const card=pl[line][i];
  pl[line][i]=null;
  pl.outside.push(card);
  return card;
 }
 throw Error('missing '+uid);
}

test('055 gains 2000 once only while an opponent character is currently at least 4500',()=>{
 let s=game.fresh(5500);
 const self=game.seat(s,0,'IMC-1-055','front',0);
 const other=game.seat(s,0,'IMC-1-055','front',1);
 const foe=game.seat(s,1,'IMC-1-086','front',0);
 s=game.reach(s,'main');
 const them=()=>findCard(s,1,foe.uid);
 assert.equal(universalBp(pack,s,them()),3000);
 assert.equal(onceBuff(s,self.uid),false);
 them().buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,them()),4000);
 assert.equal(onceBuff(s,self.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'activate',uid:self.uid,mode:'onceBuffSelf'}),
  /not currently legal/);
 them().buffs=[{bp:1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,them()),4500);
 assert.equal(onceBuff(s,self.uid),true);
 them().buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,them()),5000);
 findCard(s,0,self.uid).ready=false;
 assert.equal(onceBuff(s,self.uid),true);
 park(s,1,foe.uid);
 assert.equal(onceBuff(s,self.uid),false);
 const back=s.players[1].outside.find(c=>c.uid===foe.uid);
 s.players[1].outside=s.players[1].outside.filter(c=>c.uid!==foe.uid);
 s.players[1].front[0]=back;
 back.buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(onceBuff(s,self.uid),true);
 findCard(s,0,self.uid).ready=true;
 s=game.act(s,{type:'activate',uid:self.uid,mode:'onceBuffSelf'});
 const live=findCard(s,0,self.uid);
 assert.equal(universalBp(pack,s,live),3500);
 assert.equal(live.ready,true);
 assert.equal(onceBuff(s,self.uid),false);
 assert.equal(onceBuff(s,other.uid),true);
 assert.throws(()=>game.act(structuredClone(s),{type:'activate',uid:self.uid,mode:'onceBuffSelf'}),
  /not currently legal/);
 park(s,1,foe.uid);
 assert.equal(universalBp(pack,s,findCard(s,0,self.uid)),3500);
 s=passTurn(game,s);
 assert.equal(s.active,1);
 assert.equal(universalBp(pack,s,findCard(s,0,self.uid)),1500);
 s=passTurn(game,s);
 s=game.reach(s,'main');
 const returned=s.players[1].outside.find(c=>c.uid===foe.uid);
 s.players[1].outside=s.players[1].outside.filter(c=>c.uid!==foe.uid);
 s.players[1].front[0]=returned;
 returned.buffs=[{bp:1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,returned),4500);
 assert.equal(onceBuff(s,self.uid),true);
 s=game.act(s,{type:'activate',uid:self.uid,mode:'onceBuffSelf'});
 assert.equal(universalBp(pack,s,findCard(s,0,self.uid)),3500);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('060 nullifies impact and uses the same once-per-turn 2000',()=>{
 assert.equal(pack.cards['IMC-1-060'].impactNull,true);
 let s=game.fresh(6000);
 const self=game.seat(s,0,'IMC-1-060','front',0);
 const foe=game.seat(s,1,'IMC-1-086','front',0);
 s=game.reach(s,'main');
 assert.equal(onceBuff(s,self.uid),false);
 findCard(s,1,foe.uid).buffs=[{bp:1500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,foe.uid)),4500);
 assert.equal(onceBuff(s,self.uid),true);
 s=game.act(s,{type:'activate',uid:self.uid,mode:'onceBuffSelf'});
 assert.equal(universalBp(pack,s,findCard(s,0,self.uid)),5000);
 assert.equal(findCard(s,0,self.uid).ready,true);
 assert.equal(onceBuff(s,self.uid),false);
 s=passTurn(game,s);
 assert.equal(universalBp(pack,s,findCard(s,0,self.uid)),3000);
 s=passTurn(game,s);
 s=game.reach(s,'main');
 findCard(s,1,foe.uid).buffs=[{bp:2000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,foe.uid)),5000);
 assert.equal(onceBuff(s,self.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6001);
 const attacker=game.seat(s,0,'IMC-1-086','front',0);
 const blocker=game.seat(s,1,'IMC-1-060','front',0);
 s=game.reach(s,'attack');
 const atk=findCard(s,0,attacker.uid);
 atk.buffs=[{bp:1500,untilTurn:s.turn}];
 const life=s.players[1].life.length;
 s=game.act(s,{type:'attack',uid:atk.uid});
 assert.equal(s.pending.kind,'block');
 s=game.act(s,{type:'chooseBlock',uid:blocker.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(s.players[1].life.length,life);
 assert.notEqual(s.pending?.kind,'life-trigger');
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('083 gains 1000 only on its turn when three printed energy-2 Starry characters are out',()=>{
 let s=game.fresh(8300);
 const self=game.seat(s,0,'IMC-1-083','front',0);
 const first=game.seat(s,0,'IMC-1-077','energy',0);
 const second=game.seat(s,0,'IMC-1-086','energy',1);
 s=game.reach(s,'main');
 const me=()=>findCard(s,0,self.uid);
 assert.equal(pack.cards['IMC-1-083'].energy,3);
 assert.equal(pack.cards['IMC-1-077'].energy,2);
 assert.equal(universalBp(pack,s,me()),3000);
 const third=game.seat(s,0,'IMC-1-082','energy',2);
 assert.equal(universalBp(pack,s,me()),4000);
 const printedLow=game.seat(s,0,'IMC-1-076','front',1);
 printedLow.buffs=[{bp:3000,untilTurn:s.turn}];
 game.seat(s,0,'IMC-1-079','front',2);
 game.seat(s,0,'IMC-1-081','energy',3);
 assert.equal(pack.cards['IMC-1-076'].energy,1);
 assert.equal(pack.cards['IMC-1-081'].energy,0);
 assert.equal(universalBp(pack,s,me()),4000);
 const fourth=game.seat(s,0,'IMC-1-084','front',3);
 assert.equal(universalBp(pack,s,me()),4000);
 park(s,0,fourth.uid);
 park(s,0,third.uid);
 assert.equal(universalBp(pack,s,me()),3000);
 const restored=s.players[0].outside.find(c=>c.uid===third.uid);
 s.players[0].outside=s.players[0].outside.filter(c=>c.uid!==third.uid);
 s.players[0].energy[2]=restored;
 assert.equal(universalBp(pack,s,me()),4000);
 s=passTurn(game,s);
 assert.equal(s.active,1);
 assert.equal(universalBp(pack,s,me()),3000);
 assert.ok(findCard(s,0,first.uid));
 assert.ok(findCard(s,0,second.uid));
 s=passTurn(game,s);
 s=game.reach(s,'main');
 assert.equal(universalBp(pack,s,me()),4000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('084 steps and gains 1500 only on its turn at three printed energy-2 Starry characters',()=>{
 let s=game.fresh(8400);
 const self=game.seat(s,0,'IMC-1-084','front',0);
 const plain=game.seat(s,0,'IMC-1-083','front',1);
 s=game.reach(s,'move');
 const me=()=>findCard(s,0,self.uid);
 assert.equal(pack.cards['IMC-1-084'].step,true);
 assert.equal(pack.cards['IMC-1-084'].energy,2);
 assert.equal(universalBp(pack,s,me()),2500);
 assert.ok(game.legal(s).some(a=>a.type==='step'&&a.uid===self.uid));
 assert.equal(game.legal(s).some(a=>a.type==='step'&&a.uid===plain.uid),false);
 game.seat(s,0,'IMC-1-077','energy',0);
 assert.equal(universalBp(pack,s,me()),2500);
 s=game.act(s,game.legal(s).find(a=>a.type==='step'&&a.uid===self.uid));
 assert.ok(s.players[0].energy.some(c=>c?.uid===self.uid));
 assert.equal(universalBp(pack,s,me()),2500);
 const third=game.seat(s,0,'IMC-1-086','energy',2);
 assert.equal(universalBp(pack,s,me()),4000);
 const fourth=game.seat(s,0,'IMC-1-082','front',0);
 assert.equal(universalBp(pack,s,me()),4000);
 park(s,0,fourth.uid);
 assert.equal(universalBp(pack,s,me()),4000);
 park(s,0,third.uid);
 assert.equal(universalBp(pack,s,me()),2500);
 const restored=s.players[0].outside.find(c=>c.uid===third.uid);
 s.players[0].outside=s.players[0].outside.filter(c=>c.uid!==third.uid);
 s.players[0].energy[2]=restored;
 assert.equal(universalBp(pack,s,me()),4000);
 const printedLow=game.seat(s,0,'IMC-1-076','front',2);
 printedLow.buffs=[{bp:4000,untilTurn:s.turn}];
 game.seat(s,0,'IMC-1-079','front',3);
 game.seat(s,0,'IMC-1-081','energy',3);
 assert.equal(universalBp(pack,s,me()),4000);
 s=passTurn(game,s);
 assert.equal(universalBp(pack,s,me()),2500);
 assert.ok(findCard(s,0,third.uid));
 s=passTurn(game,s);
 s=game.reach(s,'main');
 assert.equal(universalBp(pack,s,me()),4000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('051 recovers one LiPPS at printed energy 2 or less and stays unfinished',()=>{
 assert.equal(pack.cards['IMC-1-051'],undefined);
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-051'].ready,false);
 const effect=IMC_PROGRAMS_051_100['IMC-1-051'].effects.onPlay[0];
 assert.deepEqual(effect,{op:'recoverOutsideFiltered',optional:true,max:1,
  trait:'LiPPS',energyAtMost:2});
 const bodies=[
  bare('SRC','城ヶ崎 美嘉',{traits:['LiPPS'],implementation:'dsl',effects:{onPlay:[effect]}}),
  bare('LOW','低',{traits:['LiPPS'],energy:1}),
  bare('EXACT','恰好',{traits:['LiPPS'],energy:2}),
  bare('HIGH','過高',{traits:['LiPPS'],energy:3,gen:2}),
  bare('OTHER','其他',{energy:1,gen:1})
 ];
 const fillers=Array.from({length:10},(_,i)=>bare('FILL'+i,'填充'+i));
 const cards=[...bodies,...fillers];
 const probe=createUniversalPack({id:'probe',version:'imc-051',cards});
 const probeCounts={};
 let left=50;
 for(const card of cards){
  const n=Math.min(4,left);
  probeCounts[card.id]=n;
  left-=n;
 }
 assert.equal(left,0);
 const local=kit(probe,probeCounts);
 let s=local.fresh(5100);
 s=local.reach(s,'main');
 const low=local.pull(s,0,'LOW'),exact=local.pull(s,0,'EXACT');
 const high=local.pull(s,0,'HIGH'),other=local.pull(s,0,'OTHER');
 s.players[0].outside.push(low,exact,high,other);
 s=local.play(s,'SRC');
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.remaining,undefined);
 assert.ok(s.pending.choices.includes(low.uid));
 assert.ok(s.pending.choices.includes(exact.uid));
 assert.equal(s.pending.choices.includes(high.uid),false);
 assert.equal(s.pending.choices.includes(other.uid),false);
 assert.ok(local.legal(s).some(a=>a.type==='chooseOutsideRecovery'&&a.uid===null));
 s=local.act(s,{type:'chooseOutsideRecovery',uid:exact.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===exact.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===low.uid));
 assert.equal(assertUniversalMatch(probe,s),true);

 s=local.fresh(5101);
 s=local.reach(s,'main');
 const rejected=local.pull(s,0,'HIGH');
 s.players[0].outside.push(rejected);
 s=local.play(s,'SRC');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===rejected.uid));
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('052 rests from either line, then must buff one legal union target',()=>{
 const card=pack.cards['IMC-1-052'];
 assert.equal(card.effects.onPlay,undefined);
 assert.equal(card.trigger,'draw');
 assert.equal(card.mainAbility.op,'restSelfThen');
 assert.equal(card.mainAbility.frontOnly,false);
 assert.equal(card.mainAbility.oncePerTurn,undefined);
 assert.equal(card.mainAbility.then[0].excludeName,'速水 奏');
 assert.equal(card.mainAbility.then[0].optional,false);
 assert.equal(card.mainAbility.then[0].bp,500);
 let s=game.fresh(5200);
 s=game.reach(s,'main');
 const src=game.seat(s,0,'IMC-1-052','front',0);
 const ally=game.seat(s,0,'IMC-1-055','energy',1);
 const named=game.seat(s,0,'IMC-1-053','front',1);
 const plain=game.seat(s,0,'IMC-1-088','front',2);
 const foe=game.seat(s,1,'IMC-1-084','front',0);
 const back=game.seat(s,1,'IMC-1-086','energy',0);
 s=game.act(s,{type:'activate',uid:src.uid,mode:'selfRestThen'});
 assert.equal(findCard(s,0,src.uid).ready,false);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.optional,false);
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.ok(s.pending.choices.includes(foe.uid));
 assert.equal(s.pending.choices.includes(named.uid),false);
 assert.equal(s.pending.choices.includes(plain.uid),false);
 assert.equal(s.pending.choices.includes(back.uid),false);
 assert.equal(s.pending.choices.includes(src.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseAnyBuff',uid:null}),/not currently legal/);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseAnyBuff',uid:back.uid}),/not currently legal/);
 s=game.act(s,{type:'chooseAnyBuff',uid:foe.uid});
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,findCard(s,1,foe.uid)),3000);
 assert.equal(universalBp(pack,s,findCard(s,0,ally.uid)),1500);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===src.uid),false);
 findCard(s,0,src.uid).ready=true;
 s=game.act(s,{type:'activate',uid:src.uid,mode:'selfRestThen'});
 assert.equal(findCard(s,0,src.uid).ready,false);
 s=game.act(s,{type:'chooseAnyBuff',uid:ally.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,ally.uid)),2000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5201);
 s=game.reach(s,'main');
 const energySrc=game.seat(s,0,'IMC-1-052','energy',0);
 const energyAlly=game.seat(s,0,'IMC-1-055','front',0);
 const energyFoe=game.seat(s,1,'IMC-1-084','front',0);
 s=game.act(s,{type:'activate',uid:energySrc.uid,mode:'selfRestThen'});
 assert.equal(findCard(s,0,energySrc.uid).ready,false);
 assert.ok(s.pending.choices.includes(energyAlly.uid));
 assert.ok(s.pending.choices.includes(energyFoe.uid));
 s=game.act(s,{type:'chooseAnyBuff',uid:energyAlly.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,energyAlly.uid)),2000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5202);
 s=game.reach(s,'main');
 const lonely=game.seat(s,0,'IMC-1-052','front',0);
 const onlyNamed=game.seat(s,0,'IMC-1-053','front',1);
 const hidden=game.seat(s,1,'IMC-1-084','energy',0);
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===lonely.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{
  type:'activate',uid:lonely.uid,mode:'selfRestThen'}),/not currently legal/);
 assert.equal(findCard(s,0,lonely.uid).ready,true);
 assert.equal(s.pending,null);
 assert.equal(findCard(s,0,onlyNamed.uid).ready,true);
 assert.equal(findCard(s,1,hidden.uid).ready,true);
 lonely.ready=false;
 assert.equal(game.legal(s).some(a=>a.type==='activate'&&a.uid===lonely.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5203);
 s=game.reach(s,'main');
 const drawn=game.pull(s,0,'IMC-1-052');
 s.players[0].outside.push(drawn);
 const hand=s.players[0].hand.length;
 s.pending={kind:'life-trigger',player:0,uid:drawn.uid,trigger:'draw'};
 s=game.act(s,game.legal(s).find(a=>a.mode==='draw'));
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('054 shares the name active, keeps the front union separate, and blocks on current BP',()=>{
 const card=pack.cards['IMC-1-054'];
 assert.equal(card.effects.onPlay,undefined);
 assert.equal(card.trigger,'get');
 assert.deepEqual(card.blockBpRestriction,{relation:'atLeast',bp:4500,condition:null});
 assert.equal(card.nameActive.when.kind,'oppCharacterBpAtLeast');
 assert.equal(card.nameActive.when.zone,'field');
 assert.equal(card.nameActive.when.minBp,4500);
 assert.equal(card.mainAbility.op,'frontOnceProgram');
 assert.equal(card.mainAbility.frontOnly,true);
 assert.equal(card.mainAbility.oncePerTurn,true);
 assert.equal(card.mainAbility.then[0].op,'chooseFrontOrOwnTrait');
 let s=game.fresh(5400);
 s=game.reach(s,'main');
 const first=game.seat(s,0,'IMC-1-054','front',0);
 const second=game.seat(s,0,'IMC-1-054','front',1);
 first.ready=false;
 second.ready=false;
 const ally=game.seat(s,0,'IMC-1-055','front',2);
 const named=game.seat(s,0,'IMC-1-053','energy',0);
 const low=game.seat(s,1,'IMC-1-087','front',0);
 assert.equal(universalBp(pack,s,low),4000);
 assert.equal(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='nameOnceActive'),false);
 assert.ok(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='frontOnce'));
 findCard(s,1,low.uid).buffs=[{bp:500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,low.uid)),4500);
 assert.ok(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='nameOnceActive'));
 assert.ok(game.legal(s).some(a=>a.uid===second.uid&&a.mode==='nameOnceActive'));
 s=game.act(s,{type:'activate',uid:first.uid,mode:'nameOnceActive'});
 assert.equal(findCard(s,0,first.uid).ready,true);
 assert.equal(s.pending,null);
 assert.equal(game.legal(s).some(a=>a.uid===second.uid&&a.mode==='nameOnceActive'),false);
 assert.ok(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='frontOnce'));
 assert.ok(game.legal(s).some(a=>a.uid===second.uid&&a.mode==='frontOnce'));
 s=game.act(s,{type:'activate',uid:first.uid,mode:'frontOnce'});
 assert.equal(findCard(s,0,first.uid).ready,true);
 assert.equal(s.pending.kind,'effect-buff-any');
 assert.equal(s.pending.optional,false);
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(named.uid),false);
 assert.equal(s.pending.choices.includes(first.uid),false);
 assert.equal(s.pending.choices.includes(second.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 s=game.act(s,{type:'chooseAnyBuff',uid:ally.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,ally.uid)),2000);
 assert.equal(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='frontOnce'),false);
 assert.ok(game.legal(s).some(a=>a.uid===second.uid&&a.mode==='frontOnce'));
 assert.equal(game.legal(s).some(a=>a.uid===second.uid&&a.mode==='nameOnceActive'),false);
 s=passTurn(game,passTurn(game,s));
 s=game.reach(s,'main');
 findCard(s,1,low.uid).buffs=[{bp:500,untilTurn:s.turn}];
 assert.ok(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='nameOnceActive'));
 assert.ok(game.legal(s).some(a=>a.uid===second.uid&&a.mode==='nameOnceActive'));
 assert.ok(game.legal(s).some(a=>a.uid===first.uid&&a.mode==='frontOnce'));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5401);
 s=game.reach(s,'main');
 const energyCopy=game.seat(s,0,'IMC-1-054','energy',0);
 energyCopy.ready=false;
 const energyFoe=game.seat(s,1,'IMC-1-088','energy',0);
 assert.equal(game.legal(s).some(a=>a.uid===energyCopy.uid&&a.mode==='nameOnceActive'),false);
 findCard(s,1,energyFoe.uid).buffs=[{bp:2500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,energyFoe.uid)),4500);
 assert.ok(game.legal(s).some(a=>a.uid===energyCopy.uid&&a.mode==='nameOnceActive'));
 assert.equal(game.legal(s).some(a=>a.uid===energyCopy.uid&&a.mode==='frontOnce'),false);
 s=game.act(s,{type:'activate',uid:energyCopy.uid,mode:'nameOnceActive'});
 assert.equal(findCard(s,0,energyCopy.uid).ready,true);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5402);
 s=game.reach(s,'main');
 const bareSrc=game.seat(s,0,'IMC-1-054','front',0);
 game.seat(s,0,'IMC-1-053','front',1);
 game.seat(s,1,'IMC-1-084','energy',0);
 assert.equal(game.legal(s).some(a=>a.uid===bareSrc.uid&&a.mode==='frontOnce'),false);
 assert.throws(()=>game.act(structuredClone(s),{
  type:'activate',uid:bareSrc.uid,mode:'frontOnce'}),/not currently legal/);
 assert.equal(s.pending,null);
 const opened=game.seat(s,0,'IMC-1-055','front',2);
 assert.ok(game.legal(s).some(a=>a.uid===bareSrc.uid&&a.mode==='frontOnce'));
 s=game.act(s,{type:'activate',uid:bareSrc.uid,mode:'frontOnce'});
 assert.deepEqual(s.pending.choices,[opened.uid]);
 s=game.act(s,{type:'chooseAnyBuff',uid:opened.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,opened.uid)),2000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5403);
 s=game.reach(s,'main');
 const attacker=game.seat(s,0,'IMC-1-054','front',0);
 const legalBlock=game.seat(s,1,'IMC-1-084','front',0);
 const printedLow=game.seat(s,1,'IMC-1-088','front',1);
 const printedHigh=game.seat(s,1,'IMC-1-087','front',2);
 findCard(s,1,printedLow.uid).buffs=[{bp:2500,untilTurn:s.turn}];
 findCard(s,1,printedHigh.uid).buffs=[{bp:500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,legalBlock.uid)),2500);
 assert.equal(universalBp(pack,s,findCard(s,1,printedLow.uid)),4500);
 assert.equal(universalBp(pack,s,findCard(s,1,printedHigh.uid)),4500);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'block');
 const blocks=game.legal(s).filter(a=>a.type==='chooseBlock');
 assert.ok(blocks.some(a=>a.uid===legalBlock.uid));
 assert.equal(blocks.some(a=>a.uid===printedLow.uid),false);
 assert.equal(blocks.some(a=>a.uid===printedHigh.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseBlock',uid:printedLow.uid}),/not currently legal/);
 s=game.act(s,{type:'chooseBlock',uid:legalBlock.uid});
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(5404);
 s=game.reach(s,'main');
 const gained=game.pull(s,0,'IMC-1-054');
 s.players[0].outside.push(gained);
 s.pending={kind:'life-trigger',player:0,uid:gained.uid,trigger:'get'};
 s=game.act(s,{type:'chooseTrigger',mode:'get'});
 assert.ok(s.players[0].hand.some(c=>c.uid===gained.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('062 must retire one front character at 3000, or 5000 with three Frontier characters',()=>{
 const step=pack.cards['IMC-1-062'].effects.onPlay[0];
 assert.equal(step.bp,3000);
 assert.equal(step.scaleMin,3);
 assert.equal(step.scaleBp,5000);
 assert.equal(step.scaleExcludeSelf,undefined);
 assert.equal(pack.cards['IMC-1-062'].triggerEffect.op,'retireOppFront');
 let s=game.fresh(6200);
 game.seat(s,0,'IMC-1-059','energy',0);
 game.seat(s,0,'IMC-1-053','energy',1);
 game.seat(s,0,'IMC-1-058','front',0);
 const exact=game.seat(s,1,'IMC-1-086','front',0);
 const low=game.seat(s,1,'IMC-1-084','front',1);
 const over=game.seat(s,1,'IMC-1-083','front',2);
 const huge=game.seat(s,1,'IMC-1-088','front',3);
 s=game.reach(s,'main');
 findCard(s,1,over.uid).buffs=[{bp:500,untilTurn:s.turn}];
 findCard(s,1,huge.uid).buffs=[{bp:3500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,exact.uid)),3000);
 assert.equal(universalBp(pack,s,findCard(s,1,over.uid)),3500);
 game.hold(s,0,'IMC-1-062');
 s=game.cast(s,'IMC-1-062');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,3000);
 assert.ok(s.pending.choices.includes(exact.uid));
 assert.ok(s.pending.choices.includes(low.uid));
 assert.equal(s.pending.choices.includes(over.uid),false);
 assert.equal(s.pending.choices.includes(huge.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseRetireBp',uid:null}),/not currently legal/);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseRetireBp',uid:over.uid}),/not currently legal/);
 s=game.act(s,{type:'chooseRetireBp',uid:exact.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(s.players[1].front[1].uid,low.uid);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6201);
 game.seat(s,0,'IMC-1-059','energy',0);
 game.seat(s,0,'IMC-1-053','energy',1);
 game.seat(s,0,'IMC-1-058','front',0);
 game.seat(s,0,'IMC-1-060','front',1);
 const mid=game.seat(s,1,'IMC-1-083','front',0);
 const top=game.seat(s,1,'IMC-1-088','front',1);
 s=game.reach(s,'main');
 findCard(s,1,mid.uid).buffs=[{bp:2000,untilTurn:s.turn}];
 findCard(s,1,top.uid).buffs=[{bp:3500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,mid.uid)),5000);
 game.hold(s,0,'IMC-1-062');
 s=game.cast(s,'IMC-1-062');
 assert.equal(s.pending.limit,5000);
 assert.ok(s.pending.choices.includes(mid.uid));
 assert.equal(s.pending.choices.includes(top.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 s=game.act(s,{type:'chooseRetireBp',uid:mid.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===mid.uid));
 assert.equal(s.players[1].front[1].uid,top.uid);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(6202);
 game.seat(s,0,'IMC-1-059','energy',0);
 game.seat(s,0,'IMC-1-053','energy',1);
 const blocked=game.seat(s,1,'IMC-1-088','front',0);
 s=game.reach(s,'main');
 findCard(s,1,blocked.uid).buffs=[{bp:3500,untilTurn:s.turn}];
 const event=game.hold(s,0,'IMC-1-062');
 assert.equal(game.legal(s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'event',uid:event.uid}),/not currently legal/);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('087 raids onto Maekawa, recovers one or two exact energy-2 Starry cards, and buffs on attack',()=>{
 assert.equal(pack.cards['IMC-1-087'].raidName,'前川 みく');
 assert.equal(pack.cards['IMC-1-087'].energy,4);
 const recover=pack.cards['IMC-1-087'].effects.onPlay[0];
 assert.equal(recover.energyExact,2);
 assert.equal(recover.max,1);
 assert.equal(recover.raiseMax.max,2);
 assert.equal(recover.raiseMax.min,3);
 assert.equal(recover.raiseMax.excludeSelf,undefined);
 assert.equal(pack.cards['IMC-1-087'].effects.onAttack[0].bp,1000);
 let s=game.fresh(8700);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 game.seat(s,0,'IMC-1-077','front',0);
 game.seat(s,0,'IMC-1-086','front',1);
 const ally=game.seat(s,0,'IMC-1-076','energy',2);
 const foe=game.seat(s,1,'IMC-1-088','front',0);
 s=game.reach(s,'main');
 const exact=game.pull(s,0,'IMC-1-084');
 const high=game.pull(s,0,'IMC-1-079');
 const generated=game.pull(s,0,'IMC-1-081');
 s.players[0].outside.push(exact,high,generated);
 s=game.play(s,'IMC-1-087');
 const entered=s.players[0].front.find(c=>c?.cardId==='IMC-1-087');
 assert.equal(entered.ready,false);
 assert.equal(entered.stack?.length||0,0);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.remaining,undefined);
 assert.deepEqual(s.pending.choices,[exact.uid]);
 s=game.act(s,{type:'chooseOutsideRecovery',uid:null});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===exact.uid));
 const live=s.players[0].front.find(c=>c?.cardId==='IMC-1-087');
 live.ready=true;
 s=game.reach(s,'attack');
 const attacker=findCard(s,0,live.uid);
 s=game.act(s,{type:'attack',uid:attacker.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.ok(s.pending.choices.includes(attacker.uid));
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.equal(s.pending.choices.includes(foe.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseOwnBuff',uid:foe.uid}),/not currently legal/);
 const skipped=game.act(structuredClone(s),{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(pack,skipped,findCard(skipped,0,attacker.uid)),4000);
 s=game.act(s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,ally.uid)),2500);
 assert.equal(universalBp(pack,s,findCard(s,0,attacker.uid)),4000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(8701);
 const base=game.seat(s,0,'IMC-1-085','energy',0);
 game.seat(s,0,'IMC-1-089','energy',1);
 game.seat(s,0,'IMC-1-096','energy',2);
 game.seat(s,0,'IMC-1-077','front',0);
 game.seat(s,0,'IMC-1-082','front',1);
 game.seat(s,0,'IMC-1-086','energy',3);
 const stranger=game.seat(s,0,'IMC-1-088','front',2);
 s=game.reach(s,'main');
 const first=game.pull(s,0,'IMC-1-084'),second=game.pull(s,0,'IMC-1-084');
 const rejected=game.pull(s,0,'IMC-1-076');
 s.players[0].outside.push(first,second,rejected);
 const card=game.hold(s,0,'IMC-1-087');
 const raids=game.legal(s).filter(a=>a.type==='raid'&&a.uid===card.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid&&a.line!=='energy'),true);
 assert.equal(raids.some(a=>a.baseUid===base.uid&&a.line==='energy'),true);
 assert.equal(raids.some(a=>a.baseUid===stranger.uid),false);
 s=game.act(s,raids.find(a=>a.baseUid===base.uid&&a.line!=='energy'&&a.slot===3));
 const top=s.players[0].front.find(c=>c?.cardId==='IMC-1-087');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.equal(s.pending.remaining,2);
 assert.ok(s.pending.choices.includes(first.uid));
 assert.ok(s.pending.choices.includes(second.uid));
 assert.equal(s.pending.choices.includes(rejected.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),true);
 s=game.act(s,{type:'chooseOutsideRecovery',uid:first.uid});
 assert.equal(s.pending.remaining,undefined);
 s=game.act(s,{type:'chooseOutsideRecovery',uid:second.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.filter(c=>c.uid===first.uid||c.uid===second.uid).length,2);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:top.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 s=game.act(s,{type:'chooseOwnBuff',uid:top.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,top.uid)),5000);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('099 retires at 2000 or 5000 and buffs only at four printed energy-2 Starry characters',()=>{
 const steps=pack.cards['IMC-1-099'].effects.onPlay;
 assert.equal(steps[0].bp,2000);
 assert.equal(steps[0].scaleBp,5000);
 assert.equal(steps[0].scaleExcludeSelf,undefined);
 assert.equal(steps[1].when.min,4);
 assert.equal(steps[1].when.printedEnergy,2);
 assert.equal(pack.cards['IMC-1-099'].triggerEffect.op,'retireOppFront');
 let s=game.fresh(9900);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 game.seat(s,0,'IMC-1-081','front',0);
 game.seat(s,0,'IMC-1-076','front',1);
 const exact=game.seat(s,1,'IMC-1-088','front',0);
 const over=game.seat(s,1,'IMC-1-084','front',1);
 s=game.reach(s,'main');
 assert.equal(universalBp(pack,s,findCard(s,1,exact.uid)),2000);
 assert.equal(universalBp(pack,s,findCard(s,1,over.uid)),2500);
 game.hold(s,0,'IMC-1-099');
 s=game.cast(s,'IMC-1-099');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.limit,2000);
 assert.ok(s.pending.choices.includes(exact.uid));
 assert.equal(s.pending.choices.includes(over.uid),false);
 assert.equal(game.legal(s).some(a=>a.uid===null),false);
 s=game.act(s,{type:'chooseRetireBp',uid:exact.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===exact.uid));
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(9901);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 game.seat(s,0,'IMC-1-077','front',0);
 game.seat(s,0,'IMC-1-082','front',1);
 game.seat(s,0,'IMC-1-084','front',2);
 const scaled=game.seat(s,1,'IMC-1-083','front',0);
 const above=game.seat(s,1,'IMC-1-088','front',1);
 s=game.reach(s,'main');
 findCard(s,1,above.uid).buffs=[{bp:3500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,scaled.uid)),3000);
 game.hold(s,0,'IMC-1-099');
 s=game.cast(s,'IMC-1-099');
 assert.equal(s.pending.limit,5000);
 assert.ok(s.pending.choices.includes(scaled.uid));
 assert.equal(s.pending.choices.includes(above.uid),false);
 s=game.act(s,{type:'chooseRetireBp',uid:scaled.uid});
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,findCard(s,0,s.players[0].front[0].uid)),2000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(9902);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 const counters=['IMC-1-077','IMC-1-082','IMC-1-084','IMC-1-086'];
 counters.forEach((id,i)=>game.seat(s,0,id,i<3?'front':'energy',i<3?i:2));
 const target=game.seat(s,1,'IMC-1-088','front',0);
 const foe=game.seat(s,1,'IMC-1-083','front',1);
 s=game.reach(s,'main');
 findCard(s,1,target.uid).buffs=[{bp:3000,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,target.uid)),5000);
 game.hold(s,0,'IMC-1-099');
 s=game.cast(s,'IMC-1-099');
 assert.equal(s.pending.limit,5000);
 s=game.act(s,{type:'chooseRetireBp',uid:target.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,true);
 assert.equal(s.pending.choices.includes(foe.uid),false);
 const mine=s.players[0].front.find(c=>c?.cardId==='IMC-1-077');
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseOwnBuff',uid:foe.uid}),/not currently legal/);
 const declined=game.act(structuredClone(s),{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(pack,declined,findCard(declined,0,mine.uid)),2000);
 s=game.act(s,{type:'chooseOwnBuff',uid:mine.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,mine.uid)),3000);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=game.fresh(9903);
 game.seat(s,0,'IMC-1-089','energy',0);
 game.seat(s,0,'IMC-1-096','energy',1);
 const only=game.seat(s,1,'IMC-1-088','front',0);
 s=game.reach(s,'main');
 findCard(s,1,only.uid).buffs=[{bp:500,untilTurn:s.turn}];
 const blocked=game.hold(s,0,'IMC-1-099');
 assert.equal(game.legal(s).some(a=>a.type==='event'&&a.uid===blocked.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('080 is active only from the energy line when three energy-2 Starry cards are on the field, then must buff another character',()=>{
 const card=pack.cards['IMC-1-080'];
 assert.equal(card.trigger,'draw');
 assert.equal(card.effects.onPlay[0].op,'activeSelfIf');
 assert.equal(card.effects.onPlay[0].line,'energy');
 assert.equal(card.effects.onPlay[0].when.excludeSelf,false);
 assert.equal(card.effects.onPlay[0].when.printedEnergy,2);
 assert.equal(card.effects.onPlay[0].when.min,3);
 assert.equal(card.mainAbility.op,'restSelfBuffOther');
 assert.equal(card.mainAbility.bp,1000);
 assert.equal(card.mainAbility.oncePerTurn,undefined);
 let s=game.fresh(8000);
 game.seat(s,0,'IMC-1-082','energy',0);
 game.seat(s,0,'IMC-1-086','energy',1);
 s=game.reach(s,'main');
 s=game.play(s,'IMC-1-080','energy');
 const self=s.players[0].energy.find(c=>c?.cardId==='IMC-1-080');
 assert.equal(self.ready,true);

 let front=game.fresh(8001);
 game.seat(front,0,'IMC-1-082','energy',0);
 game.seat(front,0,'IMC-1-086','energy',1);
 front=game.reach(front,'main');
 front=game.play(front,'IMC-1-080','front');
 assert.equal(front.players[0].front.find(c=>c?.cardId==='IMC-1-080').ready,false);

 let short=game.fresh(8002);
 game.seat(short,0,'IMC-1-082','energy',0);
 game.seat(short,0,'IMC-1-081','energy',1);
 short=game.reach(short,'main');
 short=game.play(short,'IMC-1-080','energy');
 assert.equal(short.players[0].energy.find(c=>c?.cardId==='IMC-1-080').ready,false);

 s=game.fresh(8003);
 game.seat(s,0,'IMC-1-082','energy',0);
 game.seat(s,0,'IMC-1-086','energy',1);
 const ally=game.seat(s,0,'IMC-1-076','front',0);
 s=game.reach(s,'main');
 s=game.play(s,'IMC-1-080','energy');
 const actor=s.players[0].energy.find(c=>c?.cardId==='IMC-1-080');
 assert.equal(actor.ready,true);
 s=game.act(s,{type:'activate',uid:actor.uid,mode:'selfRestBuff'});
 assert.equal(findCard(s,0,actor.uid).ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.optional,false);
 assert.equal(s.pending.excludeSelf,true);
 assert.equal(s.pending.bp,1000);
 assert.equal(s.pending.choices.includes(actor.uid),false);
 assert.ok(s.pending.choices.includes(ally.uid));
 assert.equal(game.legal(s).some(a=>a.type==='chooseOwnBuff'&&a.uid===null),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseOwnBuff',uid:null}),/not currently legal/);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseOwnBuff',uid:actor.uid}),/not currently legal/);
 s=game.act(s,{type:'chooseOwnBuff',uid:ally.uid});
 assert.equal(universalBp(pack,s,findCard(s,0,ally.uid)),pack.cards['IMC-1-076'].bp+1000);
 assert.equal(universalBp(pack,s,findCard(s,0,actor.uid)),2000);
 findCard(s,0,actor.uid).ready=true;
 assert.ok(game.legal(s).some(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='selfRestBuff'));

 const alone=game.fresh(8004);
 const only=game.seat(alone,0,'IMC-1-080','energy',0);
 const quiet=game.reach(alone,'main');
 assert.equal(game.legal(quiet).some(a=>a.type==='activate'&&a.uid===only.uid),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('the remaining round-6 sentences stay unfinished and reject the nearest existing shape',()=>{
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-051'].ready,false);
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-051'].effects.onPlay[0].op,'recoverOutsideFiltered');
 for(const id of ['IMC-1-061','IMC-1-064','IMC-1-068',
  'IMC-1-072','IMC-1-073','IMC-1-075','IMC-1-093','IMC-1-094','IMC-1-097'])
  assert.notEqual(IMC_PROGRAMS_051_100[id]?.ready,true,id);
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-065'].ready,true);
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-078'].ready,true);
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-080'].ready,true);
 const text=JSON.stringify(IMC_REQUESTS_051_100);
 const needles={
  'IMC-1-051':'restRetireSequence',
  'IMC-1-061':'grantAttackPhaseEndHand',
  'IMC-1-064':'場上特徵張數',
  'IMC-1-068':'最多 1 個',
  'IMC-1-072':'可選把 1 張手牌特徵放到場外',
  'IMC-1-073':'取代抽 1',
  'IMC-1-075':'種類數',
  'IMC-1-093':'另外給衝擊',
  'IMC-1-094':'只接受退場時機',
  'IMC-1-097':'Q2250'
 };
 for(const [id,needle] of Object.entries(needles))assert.match(text,new RegExp(id+'[\\s\\S]*'+needle));
 const reject=(extra,pattern)=>assert.throws(()=>createUniversalPack({id:'probe',version:'gap',cards:[
  bare('GAP','缺口',{implementation:'dsl',...extra})]}),pattern);
 reject({effects:{onPlay:[{op:'conditionalBounceOrRetireByOwnOutsideNames',bp:5000,min:3,trait:'LiPPS'}]}},
  /invalid conditional named OUTSIDE effect/);
 reject({effects:{onPlay:[{op:'choosePrintedOptions',max:1,optional:true,options:[
  {id:'retire',label:'退場',then:[{op:'draw',count:2}]},
  {id:'front',label:'退場對手',then:[{op:'retireOppFrontOneUnderBp',bp:5000,optional:true}]}
 ]}]}} ,/invalid printed option set/);
 const looked=createUniversalPack({id:'probe',version:'gap-073',cards:[
  bare('GAP','缺口',{implementation:'dsl',effects:{onPlay:[{op:'ifLiveThen',when:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',
   excludeSelf:false,trait:TRAIT,min:9},then:[{op:'takeTopHandRestOutside',count:2}],
   else:[{op:'draw',count:1}]}]}})]});
 assert.equal(looked.cards.GAP.effects.onPlay[0].then[0].op,'takeTopHandRestOutside');
 assert.notEqual(IMC_PROGRAMS_051_100['IMC-1-073']?.ready,true);
 reject({effects:{onAttack:[{op:'buffOwnField',filter:{field:'type',value:'character'},
  bp:1000,optional:true,excludeSelf:false,count:2}]}},/invalid own-field BP choice/);
 const bounced=createUniversalPack({id:'probe',version:'gap-075',cards:[
  bare('GAP','缺口',{implementation:'dsl',effects:{onPlay:[{
   op:'bounceOwnOtherUnderEnergy',optional:true,energy:1,trait:TRAIT,
   then:[{op:'deployOwnHandRest',type:'character',color:'red',energy:1,ap:null,max:1,trait:TRAIT}]
  }]}})]});
 assert.equal(bounced.cards.GAP.effects.onPlay[0].then[0].op,'deployOwnHandRest');
 assert.equal(IMC_PROGRAMS_051_100['IMC-1-075']?.ready,undefined);
 reject({effects:{onPlay:[{op:'ifLiveThen',when:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',
  excludeSelf:false,trait:TRAIT,min:9},then:[{op:'grantSelfImpactThisTurn',amount:1}]}]}},
  /invalid live-condition follow-up/);
 reject({effects:{onAttack:[{op:'deployOwnRaidBaseRest',optional:true}]}},
  /raid-base rest entry is a character onRetire effect/);
 reject({attackWinDraw:{count:1,condition:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',
  excludeSelf:false,trait:TRAIT,min:9}}},/invalid attacking-victory distinct-name draw/);
 reject({attackLoseReadyTurn:true},/invalid attack-loss ready turn/);
 reject({mainAbility:{op:'restLeaveRevealRetire',oncePerName:true}},/unsupported main action ability/);
 reject({type:'field',bp:0,mainAbility:{op:'fieldRestRetireThen',then:[
  {op:'draw',count:1},
  {op:'deployOwnHandRest',type:'character',color:'red',energy:3,ap:1,max:1}
 ]}},/unsupported main action ability/);
});

test('057 rests a blue LiPPS from hand, draws at 4500 even when that entry is skipped, raids only Frederica, and activates once after a lost attack',()=>{
 const printed=pack.cards['IMC-1-057'];
 assert.equal(printed.trigger,'raid');
 assert.equal(printed.raidName,'宮本 フレデリカ');
 assert.equal(printed.energy,4);
 assert.equal(printed.ap,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.color,'blue');
 assert.deepEqual(printed.attackLoseActiveOnce,{once:'card'});
 assert.deepEqual(printed.effects.onPlay,[
  {op:'deployOwnHandRest',type:'character',color:'blue',energy:2,ap:null,max:1,trait:'LiPPS'},
  {op:'drawIfOppCharacterBpAtLeast',minBp:4500,count:1}
 ]);
 assert.equal(printed.effects.onPlay[0].ap,null);
 function park(s){
  s.players[0].deck.push(...s.players[0].hand.splice(0));
 }
 function pay(s){
  game.seat(s,0,'IMC-1-052','energy',0);
  game.seat(s,0,'IMC-1-053','energy',1);
  game.seat(s,0,'IMC-1-056','energy',2);
  return game.reach(s,'main');
 }
 let s=pay(game.fresh(5700));
 const wall=game.seat(s,1,'IMC-1-054','front',0);
 findCard(s,1,wall.uid).buffs=[{bp:500,untilTurn:s.turn}];
 assert.equal(universalBp(pack,s,findCard(s,1,wall.uid)),4500);
 park(s);
 const legal=game.hold(s,0,'IMC-1-060');
 const tall=game.hold(s,0,'IMC-1-059');
 const red=game.hold(s,0,'IMC-1-076');
 game.hold(s,0,'IMC-1-057');
 const deck=s.players[0].deck.length;
 s=game.play(s,'IMC-1-057');
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.equal(s.pending.choices.includes(legal.uid),true);
 assert.equal(s.pending.choices.includes(tall.uid),false);
 assert.equal(s.pending.choices.includes(red.uid),false);
 assert.throws(()=>game.act(structuredClone(s),{type:'chooseHandRest',uid:tall.uid,line:'front',slot:1}),
  /not currently legal/);
 s=game.act(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,deck-1);
 assert.equal(s.players[0].hand.some(c=>c.uid===legal.uid),true);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=pay(game.fresh(5701));
 game.seat(s,1,'IMC-1-054','front',0);
 park(s);
 game.hold(s,0,'IMC-1-060');
 game.hold(s,0,'IMC-1-057');
 const quiet=s.players[0].deck.length;
 s=game.play(s,'IMC-1-057');
 assert.equal(s.pending.kind,'effect-hand-rest');
 s=game.act(s,{type:'chooseHandRest',uid:null});
 assert.equal(s.players[0].deck.length,quiet);
 assert.equal(s.pending,null);

 s=pay(game.fresh(5702));
 const high=game.seat(s,1,'IMC-1-054','front',0);
 findCard(s,1,high.uid).buffs=[{bp:500,untilTurn:s.turn}];
 park(s);
 game.hold(s,0,'IMC-1-059');
 game.hold(s,0,'IMC-1-076');
 game.hold(s,0,'IMC-1-057');
 const empty=s.players[0].deck.length;
 s=game.play(s,'IMC-1-057');
 assert.equal(s.pending,null);
 assert.equal(s.players[0].deck.length,empty-1);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=pay(game.fresh(5703));
 park(s);
 const chosen=game.hold(s,0,'IMC-1-060');
 game.hold(s,0,'IMC-1-057');
 const foe=game.seat(s,1,'IMC-1-054','front',0);
 findCard(s,1,foe.uid).buffs=[{bp:500,untilTurn:s.turn}];
 const before=s.players[0].deck.length;
 s=game.play(s,'IMC-1-057');
 assert.equal(s.pending.kind,'effect-hand-rest');
 s=game.act(s,game.legal(s).find(a=>a.type==='chooseHandRest'&&a.uid===chosen.uid&&a.line==='front'));
 const entered=s.players[0].front.find(c=>c?.uid===chosen.uid);
 assert.equal(entered.ready,false);
 assert.equal(s.players[0].deck.length,before-1);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(pack,s),true);

 s=pay(game.fresh(5704));
 const base=game.seat(s,0,'IMC-1-055','front',0);
 const other=game.seat(s,0,'IMC-1-058','front',1);
 park(s);
 const raider=game.hold(s,0,'IMC-1-057');
 const raids=game.legal(s).filter(a=>a.type==='raid'&&a.uid===raider.uid);
 assert.equal(raids.some(a=>a.baseUid===base.uid),true);
 assert.equal(raids.some(a=>a.baseUid===other.uid),false);
 s=game.act(s,raids.find(a=>a.baseUid===base.uid&&a.slot===0&&a.line!=='energy'));
 const top=s.players[0].front.find(c=>c?.cardId==='IMC-1-057');
 assert.equal(top.ready,true);
 assert.equal(top.stack[0].uid,base.uid);
 assert.equal(s.pending,null);
 assert.equal(universalBp(pack,s,top),4000);
 assert.equal(assertUniversalMatch(pack,s),true);

 function lose(state,uid){
  state=game.reach(state,'attack');
  state=game.act(state,{type:'attack',uid});
  const blocker=state.players[1].front.find(c=>c?.ready&&c.cardId==='IMC-1-054');
  assert.equal(state.pending.kind,'block');
  return game.act(state,{type:'chooseBlock',uid:blocker.uid});
 }
 s=game.fresh(5705);
 const loser=game.seat(s,0,'IMC-1-057','front',0);
 const first=game.seat(s,1,'IMC-1-054','front',0);
 const second=game.seat(s,1,'IMC-1-054','front',1);
 s=game.reach(s,'main');
 findCard(s,1,first.uid).buffs=[{bp:500,untilTurn:s.turn}];
 findCard(s,1,second.uid).buffs=[{bp:500,untilTurn:s.turn}];
 s=lose(s,loser.uid);
 assert.equal(findCard(s,0,loser.uid).ready,true);
 assert.equal(universalBp(pack,s,findCard(s,0,loser.uid)),4000);
 assert.equal(s.onceEffectUses[0].includes('uid:'+loser.uid+'|attackLoseActiveOnce'),true);
 s=lose(s,loser.uid);
 assert.equal(findCard(s,0,loser.uid).ready,false);
 assert.equal(universalBp(pack,s,findCard(s,0,loser.uid)),4000);

 s=game.fresh(5706);
 const winner=game.seat(s,0,'IMC-1-057','front',0);
 const weak=game.seat(s,1,'IMC-1-058','front',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:winner.uid});
 s=game.act(s,{type:'chooseBlock',uid:weak.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===weak.uid));
 assert.equal(findCard(s,0,winner.uid).ready,false);
 assert.equal(universalBp(pack,s,findCard(s,0,winner.uid)),4000);
 assert.equal(s.onceEffectUses[0].includes('uid:'+winner.uid+'|attackLoseActiveOnce'),false);

 s=game.fresh(5707);
 const hidden=game.seat(s,0,'IMC-1-057','front',0);
 const taller=game.seat(s,1,'IMC-1-054','front',0);
 s=game.reach(s,'main');
 findCard(s,1,taller.uid).buffs=[{bp:500,untilTurn:s.turn}];
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
  sourceUid:hidden.uid,targetUid:hidden.uid,sourceLinked:false,
  until:{player:0,phase:'start',edge:'start'}});
 s=lose(s,hidden.uid);
 assert.equal(findCard(s,0,hidden.uid).ready,false);
 assert.equal(universalBp(pack,s,findCard(s,0,hidden.uid)),4000);
 assert.equal(s.onceEffectUses[0].includes('uid:'+hidden.uid+'|attackLoseActiveOnce'),false);
 assert.equal(assertUniversalMatch(pack,s),true);
});

test('074 keeps impact null and buffs two different characters only at nine wish names',()=>{
 const printed=pack.cards['IMC-1-074'];
 assert.equal(printed.impactNull,true);
 assert.equal(printed.trigger,'active');
 assert.equal(printed.bp,3000);
 const step=printed.effects.onAttack[0];
 assert.equal(step.op,'ifLiveThen');
 assert.equal(step.when.min,9);
 assert.equal(step.when.excludeSelf,false);
 assert.equal(step.when.zone,'fieldOutside');
 assert.equal(step.then[0].max,2);
 assert.equal(step.then[0].optional,true);
 assert.equal(step.then[0].excludeSelf,false);
 assert.deepEqual(step.then[0].filter,{field:'type',value:'character'});
 let s=game.fresh(7400);
 const names=['IMC-1-074','IMC-1-069','IMC-1-070','IMC-1-071','IMC-1-088','IMC-1-089','IMC-1-091','IMC-1-095'];
 names.forEach((id,i)=>game.seat(s,0,id,i<4?'front':'energy',i%4));
 const distinct=new Set(names.map(id=>pack.cards[id].name));
 assert.equal(distinct.size,7);
 assert.equal(pack.cards['IMC-1-088'].name,pack.cards['IMC-1-089'].name);
 const actor=s.players[0].front.find(c=>c?.cardId==='IMC-1-074');
 game.seat(s,1,'IMC-1-058','front',0);
 s=game.reach(s,'attack');
 s=game.act(s,{type:'attack',uid:actor.uid});
 assert.notEqual(s.pending?.kind,'effect-buff-own');
 assert.equal(game.legal(s).some(a=>a.type==='chooseOwnBuff'),false);
 assert.equal(s.pending.kind,'block');

 s=game.fresh(7401);
 const attacker=game.seat(s,0,'IMC-1-086','front',0);
 const blocker=game.seat(s,1,'IMC-1-074','front',0);
 s=game.reach(s,'attack');
 findCard(s,0,attacker.uid).buffs=[{bp:500,untilTurn:s.turn}];
 const life=s.players[1].life.length;
 s=game.act(s,{type:'attack',uid:attacker.uid});
 s=game.act(s,{type:'chooseBlock',uid:blocker.uid});
 assert.ok(s.players[1].outside.some(c=>c.uid===blocker.uid));
 assert.equal(s.players[1].life.length,life);
 assert.notEqual(s.pending?.kind,'life-trigger');
 assert.equal(assertUniversalMatch(pack,s),true);

 const wish=TRAIT;
 const effect={op:'ifLiveThen',
  when:{kind:'ownDistinctTraitNames',turn:'any',zone:'fieldOutside',excludeSelf:false,trait:wish,min:9},
  then:[{op:'buffOwnField',filter:{field:'type',value:'character'},bp:1000,optional:true,excludeSelf:false,max:2}]};
 const bodies=[
  bare('SRC','かな',{implementation:'dsl',traits:[wish],bp:3000,impactNull:true,effects:{onAttack:[effect]}}),
  ...['甲','乙','丙','丁','戊','己','庚','辛'].map((name,i)=>bare('N'+i,name,{traits:[wish],bp:2000})),
  bare('PLAIN','無特徵',{bp:2000}),
  bare('WALL','牆',{bp:1000}),
  ...Array.from({length:39},(_,i)=>bare('FILL'+i,'填充'+i,{bp:1000}))
 ];
 const probe=createUniversalPack({id:'probe',version:'imc-074',cards:bodies});
 const counts=Object.fromEntries(bodies.map(card=>[card.id,1]));
 assert.deepEqual(validateUniversalDeck(probe,counts),[]);
 const probeAct=(state,action)=>dispatchUniversalAction(probe,state,action);
 function match(seed){
  let state=newUniversalMatch(probe,{decks:[counts,counts],seed,first:0});
  for(let i=0;i<8&&state.phase!=='main';i++){
   if(state.pending)throw Error(state.pending.kind+' before main');
   state=probeAct(state,{type:'next'});
  }
  assert.equal(state.phase,'main');
  return state;
 }
 function place(state,outside){
  const src=game.seat(state,0,'SRC','front',0);
  for(let i=0;i<3;i++)game.seat(state,0,'N'+i,'front',i+1);
  for(let i=3;i<6;i++)game.seat(state,0,'N'+i,'energy',i-3);
  const plain=game.seat(state,0,'PLAIN','energy',3);
  for(const id of outside)state.players[0].outside.push(game.pull(state,0,id));
  game.seat(state,1,'WALL','front',0);
  return {src,plain};
 }
 function toAttack(state){
  for(let i=0;i<8&&state.phase!=='attack';i++){
   if(state.pending)throw Error(state.pending.kind+' before attack');
   state=probeAct(state,{type:'next'});
  }
  assert.equal(state.phase,'attack');
  return state;
 }
 s=match(7402);
 place(s,['N6']);
 s=toAttack(s);
 s=probeAct(s,{type:'attack',uid:s.players[0].front[0].uid});
 assert.notEqual(s.pending?.kind,'effect-buff-own');
 assert.equal(s.pending.kind,'block');

 s=match(7403);
 const placed=place(s,['N6','N7']);
 s=toAttack(s);
 s=probeAct(s,{type:'attack',uid:placed.src.uid});
 assert.equal(s.pending.kind,'effect-buff-own');
 assert.equal(s.pending.remaining,2);
 assert.equal(s.pending.choices.includes(placed.src.uid),true);
 assert.equal(s.pending.choices.includes(placed.plain.uid),true);
 s=probeAct(s,{type:'chooseOwnBuff',uid:placed.src.uid});
 assert.equal(s.pending.remaining,1);
 assert.equal(s.pending.choices.includes(placed.src.uid),false);
 s=probeAct(s,{type:'chooseOwnBuff',uid:placed.plain.uid});
 assert.equal(universalBp(probe,s,findCard(s,0,placed.src.uid)),4000);
 assert.equal(universalBp(probe,s,findCard(s,0,placed.plain.uid)),3000);
 assert.equal(assertUniversalMatch(probe,s),true);

 s=match(7404);
 const skipped=place(s,['N6','N7']);
 s=toAttack(s);
 s=probeAct(s,{type:'attack',uid:skipped.src.uid});
 s=probeAct(s,{type:'chooseOwnBuff',uid:null});
 assert.equal(universalBp(probe,s,findCard(s,0,skipped.src.uid)),3000);
 assert.equal(universalBp(probe,s,findCard(s,0,skipped.plain.uid)),2000);
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(probe,s),true);
});

test('094 looks at two cards and stays unfinished because the attack cannot rest its raid base',()=>{
 const program=IMC_PROGRAMS_051_100['IMC-1-094'];
 assert.equal(program.ready,false);
 assert.equal(program.raidName,'島村 卯月');
 assert.deepEqual(program.effects.onPlay,[{op:'takeTopHandRestOutside',count:2}]);
 assert.equal(pack.cards['IMC-1-094'],undefined);
 assert.throws(()=>createUniversalPack({id:'probe',version:'imc-094-attack',cards:[
  bare('GAP','缺口',{implementation:'dsl',effects:{onAttack:[{op:'deployOwnRaidBaseRest',optional:true}]}})
 ]}),/raid-base rest entry is a character onRetire effect/);
 const bodies=[
  bare('SRC','卯月',{implementation:'dsl',energy:0,effects:program.effects}),
  bare('TOP-A','甲',{bp:1000}),
  bare('TOP-B','乙',{bp:1000}),
  ...Array.from({length:47},(_,i)=>bare('FILL'+i,'填充'+i,{bp:1000}))
 ];
 const look=createUniversalPack({id:'probe',version:'imc-094',cards:bodies});
 const counts=Object.fromEntries(bodies.map(card=>[card.id,1]));
 assert.deepEqual(validateUniversalDeck(look,counts),[]);
 let s=newUniversalMatch(look,{decks:[counts,counts],seed:9400,first:0});
 for(let i=0;i<8&&s.phase!=='main';i++)s=dispatchUniversalAction(look,s,{type:'next'});
 s.players[0].apCards.forEach((card,i)=>{card.inPlay=i<1;card.ready=i<1;});
 const first=game.pull(s,0,'TOP-A');
 const second=game.pull(s,0,'TOP-B');
 s.players[0].deck.unshift(first,second);
 const src=game.hold(s,0,'SRC');
 s=dispatchUniversalAction(look,s,legalUniversalActions(look,s).find(a=>
  a.type==='play'&&a.uid===src.uid&&a.line==='front'));
 assert.equal(s.pending.kind,'effect-top-take-one');
 assert.deepEqual(s.pending.uids,[first.uid,second.uid]);
 const mine=universalPrivateChoices(look,s,0);
 assert.deepEqual(mine.options.map(option=>option.card?.cardId),['TOP-A','TOP-B']);
 assert.equal(universalPrivateChoices(look,s,1),null);
 const shown=JSON.stringify(universalPublicView(look,s,1));
 assert.equal(shown.includes(first.uid),false);
 assert.equal(shown.includes(second.uid),false);
 assert.equal(legalUniversalActions(look,s).some(a=>a.type==='chooseTopTakeOne'&&a.uid===null),false);
 s=dispatchUniversalAction(look,s,{type:'chooseTopTakeOne',uid:second.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===second.uid));
 assert.ok(s.players[0].outside.some(c=>c.uid===first.uid));
 assert.equal(s.players[0].deck.some(c=>c.uid===first.uid||c.uid===second.uid),false);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(look,s),true);
});
