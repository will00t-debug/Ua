// Round 15 D. Eight printed sentences use the shared operations.
// Q454/Q463 stay open: a scaled discard does not add the BP window and
// discarding zero cards does not open a retirement.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalBp,universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {MHA_PROGRAMS_051_100} from '../dist/universal-v2/mha/programs-051-100.mjs';
import {MHA_REQUESTS_051_100} from '../dist/universal-v2/mha/requests-051-100.mjs';

const pack=createMhaV2Pack();

function open(want,seed){
 const counts={...want};
 let total=Object.values(counts).reduce((a,b)=>a+b,0);
 const triggers={color:0,special:0,final:0};
 for(const [id,num] of Object.entries(counts)){
  const kind=pack.cards[id]?.trigger;
  if(triggers[kind]!=null)triggers[kind]+=num;
 }
 for(const id of Object.keys(pack.cards)){
  if(total>=50)break;
  const kind=pack.cards[id].trigger;
  const room=Math.min(4-(counts[id]||0),50-total,triggers[kind]!=null?4-triggers[kind]:4);
  if(room<=0)continue;
  counts[id]=(counts[id]||0)+room;
  total+=room;
  if(triggers[kind]!=null)triggers[kind]+=room;
 }
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 let s=newUniversalMatch(pack,{decks:[counts,counts],seed,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++){
  if(s.pending)throw Error(s.pending.kind+' before main');
  s=dispatchUniversalAction(pack,s,{type:'next'});
 }
 assert.equal(assertUniversalMatch(pack,s),true);
 return s;
}
function legal(s){return legalUniversalActions(pack,s);}
function act(s,action){
 if(typeof action==='function'){
  const found=legal(s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function pull(s,owner,id){
 const pl=s.players[owner];
 for(const zone of ['hand','deck','life','outside','removed']){
  const index=pl[zone].findIndex(c=>c?.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 for(const line of ['front','energy']){
  const index=pl[line].findIndex(c=>c?.cardId===id);
  if(index>=0){const card=pl[line][index];pl[line][index]=null;return card;}
 }
 throw Error('Missing '+id);
}
function hold(s,owner,id){
 const card=s.players[owner].hand.find(c=>c.cardId===id)||pull(s,owner,id);
 if(!s.players[owner].hand.includes(card))s.players[owner].hand.push(card);
 return card;
}
function seat(s,owner,id,line,slot,ready=true){
 const card=pull(s,owner,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[owner][line][slot]=card;
 return card;
}
function fuel(s,owner,ids){
 ids.forEach((id,i)=>{
  const card=pull(s,owner,id);
  card.ready=false;
  card.fieldEntryStamp=s.nextFieldEntryStamp++;
  s.players[owner].energy[i]=card;
 });
}
function readyAp(s,n,owner=0){
 s.players[owner].apCards.forEach((card,index)=>{
  if(index<n){card.inPlay=true;card.ready=true;}
 });
}
function play(s,id,line='front',slot){
 const card=hold(s,0,id);
 const action=legal(s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line===line&&
  (slot===undefined||a.slot===slot));
 assert.ok(action,'no play '+id+' '+line);
 return act(s,action);
}
function reach(s,phase){
 for(let i=0;i<10&&s.phase!==phase;i++){
  if(s.pending)throw Error(s.pending.kind+' before '+phase);
  s=act(s,{type:'next'});
 }
 assert.equal(s.phase,phase);
 return s;
}
function trimHand(s,owner=0){
 while(s.players[owner].hand.length>7)s.players[owner].deck.push(s.players[owner].hand.pop());
}
function orderBottom(s){
 let guard=0;
 while(s.pending?.kind==='effect-top-order'){
  const uid=s.pending.uids.find(id=>!s.pending.order.includes(id));
  s=act(s,a=>a.type==='chooseTopOrder'&&a.uid===uid);
  if(++guard>6)throw Error('order');
 }
 return s;
}
function probe(cards,seed){
 const bodies=[...cards];
 let n=1;
 while(bodies.length*4<50){
  bodies.push({id:'FILL-'+String(n).padStart(2,'0'),name:'填'+n,color:'green',
   type:'character',energy:0,ap:1,bp:1000,gen:1,traits:[],trigger:null,
   implementation:'vanilla',effects:{}});
  n++;
 }
 const built=createUniversalPack({id:'mha-r15-d',version:'d',cards:bodies});
 const deck={};
 let remain=50;
 for(const id of Object.keys(built.cards)){
  if(remain<=0)break;
  const take=Math.min(4,remain);
  deck[id]=take;
  remain-=take;
 }
 let s=newUniversalMatch(built,{decks:[deck,deck],seed,first:0,openingMulligan:false});
 for(let i=0;i<8&&s.phase!=='main';i++)s=dispatchUniversalAction(built,s,{type:'next'});
 return {built,s};
}

test('MHA stays closed and the unfinished sentences stay requests',()=>{
 assert.equal(getTitle('mha').playable,false);
 assert.equal(Object.keys(pack.cards).length,109);
 assert.deepEqual(MHA_REQUESTS_051_100.map(row=>row.cardId),[]);
 for(const id of ['MHA-1-055','MHA-1-060','MHA-1-062','MHA-1-066','MHA-1-072','MHA-1-076','MHA-1-081','MHA-1-084'])
  assert.equal(pack.cards[id].id,id);
});

test('MHA-1-076 moves into an open front, and a full front removes a character first',()=>{
 let s=open({'MHA-1-076':1,'MHA-1-078':4},7601);
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,1);
 s=play(s,'MHA-1-076','energy',2);
 assert.equal(s.pending,null);
 s=open({'MHA-1-076':1,'MHA-1-078':4},7602);
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,1);
 const back=seat(s,0,'MHA-1-078','energy',2,false);
 s=play(s,'MHA-1-076');
 assert.equal(s.pending.kind,'effect-energy-trait-front');
 s=act(s,{type:'chooseEnergyTraitFront',uid:null});
 assert.equal(s.players[0].energy.some(c=>c?.uid===back.uid),true);
 assert.equal(s.players[0].removed.length,0);
 s=open({'MHA-1-076':1,'MHA-1-078':4,'MHA-1-073':1,'MHA-1-080':1,'MHA-1-082':1},7603);
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,1);
 const energy=seat(s,0,'MHA-1-078','energy',2,false);
 seat(s,0,'MHA-1-073','front',1,true);
 seat(s,0,'MHA-1-080','front',2,true);
 seat(s,0,'MHA-1-082','front',3,true);
 s=play(s,'MHA-1-076','front',0);
 assert.equal(s.pending.kind,'effect-front-vacate');
 assert.equal(s.pending.choices.includes(s.players[0].front[0].uid),true);
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseFrontVacate',uid:energy.uid}),
  /not currently legal/);
 const other=s.players[0].front[1].uid;
 s=act(s,{type:'chooseFrontVacate',uid:other});
 assert.equal(s.players[0].removed.some(c=>c.uid===other),true);
 assert.equal(s.players[0].outside.some(c=>c.uid===other),false);
 assert.equal(s.pending.vacated,undefined);
 s=act(s,a=>a.type==='chooseEnergyTraitFront'&&a.uid===energy.uid&&a.slot===1);
 assert.equal(s.players[0].front[1].uid,energy.uid);
 s=open({'MHA-1-076':1,'MHA-1-078':4,'MHA-1-073':1,'MHA-1-080':1,'MHA-1-082':1},7604);
 fuel(s,0,['MHA-1-078','MHA-1-078']);
 readyAp(s,1);
 const mover=seat(s,0,'MHA-1-078','energy',2,false);
 seat(s,0,'MHA-1-073','front',1,true);
 seat(s,0,'MHA-1-080','front',2,true);
 seat(s,0,'MHA-1-082','front',3,true);
 s=play(s,'MHA-1-076','front',0);
 const self=s.players[0].front[0].uid;
 s=act(s,{type:'chooseFrontVacate',uid:self});
 assert.equal(s.players[0].removed.some(c=>c.uid===self),true);
 assert.equal(s.pending.vacated,true);
 s=act(s,a=>a.type==='chooseEnergyTraitFront'&&a.uid===mover.uid&&a.slot===0);
 assert.equal(s.players[0].front[0].uid,mover.uid);
 assert.equal(s.pending,null);
});

test('MHA-1-055 retires one front character only with three other high-energy characters',()=>{
 let s=open({'MHA-1-055':1,'MHA-1-056':1,'MHA-1-050':1,'MHA-1-041':1,'MHA-1-037':1,'MHA-1-057':1,'MHA-1-078':1},5501);
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-057']);
 readyAp(s,2);
 seat(s,0,'MHA-1-056','front',1);
 seat(s,0,'MHA-1-050','front',2);
 const stayed=seat(s,1,'MHA-1-078','front',0);
 s=play(s,'MHA-1-055');
 assert.equal(s.pending,null);
 assert.equal(s.players[1].front[0].uid,stayed.uid);
 s=open({'MHA-1-055':1,'MHA-1-051':1,'MHA-1-056':1,'MHA-1-050':1,
  'MHA-1-041':1,'MHA-1-037':1,'MHA-1-057':1,'MHA-1-078':1},5502);
 fuel(s,0,['MHA-1-041','MHA-1-037','MHA-1-057']);
 readyAp(s,2);
 seat(s,0,'MHA-1-051','front',1);
 seat(s,0,'MHA-1-056','front',2);
 seat(s,0,'MHA-1-050','front',3);
 const target=seat(s,1,'MHA-1-078','front',0);
 s=play(s,'MHA-1-055');
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(target.uid),true);
 s.players[1].deck.push(s.players[1].front[0]);
 s.players[1].front[0]=null;
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseRetireBp',uid:target.uid}),
  /Illegal BP-threshold retirement target/);
 s=act(s,{type:'chooseRetireBp',uid:null});
 assert.equal(s.players[1].outside.some(c=>c.uid===target.uid),false);
 function take(state,owner,id){
  const pl=state.players[owner];
  for(const zone of ['hand','deck','life','outside','removed']){
   const index=pl[zone].findIndex(c=>c?.cardId===id);
   if(index>=0)return pl[zone].splice(index,1)[0];
  }
  throw Error('probe missing '+id);
 }
 const ceiling=probe([
  {id:'LIVE',name:'波動ねじれ',color:'green',type:'character',energy:0,ap:1,bp:3500,gen:1,
   traits:[],trigger:null,implementation:'dsl',step:true,
   effects:MHA_PROGRAMS_051_100['MHA-1-055'].effects},
  {id:'HIGH',name:'高',color:'green',type:'character',energy:4,ap:1,bp:3000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'FOE',name:'対象',color:'red',type:'character',energy:0,ap:1,bp:4000,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}},
  {id:'OVER',name:'超過',color:'red',type:'character',energy:0,ap:1,bp:5500,gen:1,
   traits:[],trigger:null,implementation:'vanilla',effects:{}}
 ],5503);
 const board=ceiling.s;
 for(const slot of [1,2]){
  const body=take(board,0,'HIGH');
  body.ready=true;
  body.fieldEntryStamp=board.nextFieldEntryStamp++;
  board.players[0].front[slot]=body;
 }
 const energyHigh=take(board,0,'HIGH');
 energyHigh.fieldEntryStamp=board.nextFieldEntryStamp++;
 board.players[0].energy[0]=energyHigh;
 const legalFoe=take(board,1,'FOE');
 legalFoe.fieldEntryStamp=board.nextFieldEntryStamp++;
 board.players[1].front[0]=legalFoe;
 const illegalFoe=take(board,1,'OVER');
 illegalFoe.fieldEntryStamp=board.nextFieldEntryStamp++;
 board.players[1].front[1]=illegalFoe;
 const actor=take(board,0,'LIVE');
 board.players[0].hand.push(actor);
 const played=dispatchUniversalAction(ceiling.built,board,
  legalUniversalActions(ceiling.built,board).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'));
 assert.equal(played.pending.choices.includes(legalFoe.uid),true);
 assert.equal(played.pending.choices.includes(illegalFoe.uid),false);
});

test('MHA-1-060 raids Midoriya, then pays one hand card once to activate someone else',()=>{
 let s=open({'MHA-1-060':1,'MHA-1-057':4,'MHA-1-061':1,'MHA-1-078':1},6001);
 fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 readyAp(s,1);
 const base=seat(s,0,'MHA-1-057','front',1,true);
 const topCard=hold(s,0,'MHA-1-060');
 s=act(s,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid&&a.line!=='energy');
 const raided=s.players[0].front.find(c=>c?.cardId==='MHA-1-060');
 assert.equal(raided.stack.some(c=>c.uid===base.uid),true);
 assert.equal(universalBp(pack,s,raided),4000);
 trimHand(s);
 s=act(s,{type:'next'});
 while(s.phase!=='main'){
  if(s.pending)throw Error(s.pending.kind+' before the opposing main');
  s=act(s,{type:'next'});
 }
 assert.equal(s.active,1);
 assert.equal(universalBp(pack,s,raided),3500);
 s=open({'MHA-1-060':1,'MHA-1-057':4},6002);
 fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 const alone=seat(s,0,'MHA-1-060','front',0,true);
 s.players[0].deck.push(...s.players[0].hand.splice(0));
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:alone.uid});
 assert.notEqual(s.pending?.kind,'effect-once-choice');
 s=open({'MHA-1-060':1,'MHA-1-057':4,'MHA-1-061':1,'MHA-1-056':1,'MHA-1-078':1},6003);
 fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 const fighter=seat(s,0,'MHA-1-060','front',0,true);
 const target=seat(s,0,'MHA-1-061','front',1,false);
 seat(s,0,'MHA-1-057','energy',3,false);
 seat(s,0,'MHA-1-056','front',2,false);
 const payment=hold(s,0,'MHA-1-078');
 s.players[0].deck.push(...s.players[0].hand.filter(c=>c!==payment));
 s.players[0].hand=[payment];
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:fighter.uid});
 assert.equal(s.pending.kind,'effect-once-choice');
 s=act(s,{type:'chooseOnceEffect',mode:'skip'});
 assert.equal(s.players[0].hand.some(c=>c.uid===payment.uid),true);
 assert.equal(s.onceEffectUses[0].includes('uid:'+fighter.uid),false);
 s=open({'MHA-1-060':1,'MHA-1-057':4,'MHA-1-061':1,'MHA-1-056':1,'MHA-1-078':1},6004);
 fuel(s,0,['MHA-1-057','MHA-1-057','MHA-1-057']);
 const body=seat(s,0,'MHA-1-060','front',0,true);
 const ally=seat(s,0,'MHA-1-061','front',1,false);
 const named=seat(s,0,'MHA-1-057','energy',3,false);
 const heavy=seat(s,0,'MHA-1-056','front',2,false);
 const paid=hold(s,0,'MHA-1-078');
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:body.uid});
 s=act(s,{type:'chooseOnceEffect',mode:'activate'});
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'choosePayHandActive',uid:'missing'}),
  /not currently legal/);
 s=act(s,{type:'choosePayHandActive',uid:paid.uid});
 assert.equal(s.players[0].outside.some(c=>c.uid===paid.uid),true);
 assert.deepEqual(s.pending.choices,[ally.uid]);
 assert.equal(s.pending.choices.includes(named.uid),false);
 assert.equal(s.pending.choices.includes(heavy.uid),false);
 assert.equal(s.pending.choices.includes(body.uid),false);
 s.players[0].deck.push(s.players[0].front[1]);
 s.players[0].front[1]=null;
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseActiveCharacter',uid:ally.uid}),
  /not currently legal/);
 assert.equal(s.players[0].outside.some(c=>c.uid===paid.uid),true);
});

test('MHA-1-062 enters active only beside Mei, and the activation misses a later character',()=>{
 let s=open({'MHA-1-062':1,'MHA-1-054':1,'MHA-1-057':4,'MHA-1-061':1},6201);
 fuel(s,0,['MHA-1-057','MHA-1-057']);
 readyAp(s,1);
 s=play(s,'MHA-1-062','energy',2);
 const rested=s.players[0].energy[2];
 assert.equal(rested.ready,false);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=act(s,a=>a.uid===null);
 assert.equal(s.pending,null);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===rested.uid),false);
 s=open({'MHA-1-062':1,'MHA-1-054':1,'MHA-1-057':4,'MHA-1-061':1},6202);
 fuel(s,0,['MHA-1-057','MHA-1-057']);
 readyAp(s,2);
 const mei=seat(s,0,'MHA-1-054','front',0,true);
 const ally=seat(s,0,'MHA-1-061','front',1,true);
 s=play(s,'MHA-1-062','energy',2);
 assert.equal(s.players[0].energy[2].ready,true);
 assert.equal(s.pending.kind,'effect-buff-own');
 s=act(s,a=>a.uid===null);
 const site=s.players[0].energy[2];
 s=act(s,{type:'activate',uid:site.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.equal(s.players[0].energy[2],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===site.uid),true);
 assert.equal(s.players[0].front[0].buffs.some(b=>b.bp===500),true);
 assert.equal(s.players[0].front[1].buffs.some(b=>b.bp===500),true);
 s=play(s,'MHA-1-057','front',2);
 const later=s.players[0].front[2];
 assert.equal((later.buffs||[]).some(b=>b.bp===500),false);
});

test('MHA-1-066 may take no card, then rest-plays All Might only against three characters',()=>{
 let s=open({'MHA-1-066':1,'MHA-1-044':1,'MHA-1-041':1,'MHA-1-037':1,'MHA-1-078':3,'MHA-1-064':1},6601);
 fuel(s,0,['MHA-1-041','MHA-1-037']);
 readyAp(s,2);
 for(let slot=0;slot<3;slot++)seat(s,1,'MHA-1-078','front',slot,true);
 const eventCard=pull(s,0,'MHA-1-064');
 const shown=pull(s,0,'MHA-1-044');
 s.players[0].deck.unshift(eventCard,shown,pull(s,0,'MHA-1-078'));
 const might=hold(s,0,'MHA-1-044');
 const event=hold(s,0,'MHA-1-066');
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-top-script');
 assert.equal(s.pending.uids.length,3);
 assert.equal(legal(s).some(a=>a.uid===eventCard.uid),false);
 s=act(s,{type:'chooseTopScript',mode:'skip'});
 s=orderBottom(s);
 assert.equal(s.pending.kind,'effect-hand-rest');
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseHandRest',mode:'enter',
  uid:'missing',line:'front',slot:0}),/not currently legal/);
 s=act(s,a=>a.type==='chooseHandRest'&&a.uid===might.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===might.uid).ready,true);
 s=open({'MHA-1-066':1,'MHA-1-044':1,'MHA-1-041':1,'MHA-1-037':1,'MHA-1-078':1},6602);
 fuel(s,0,['MHA-1-041','MHA-1-037']);
 readyAp(s,2);
 seat(s,1,'MHA-1-078','front',0,true);
 const quiet=hold(s,0,'MHA-1-044');
 const evt=hold(s,0,'MHA-1-066');
 s=act(s,a=>a.type==='event'&&a.uid===evt.uid);
 if(s.pending?.kind==='effect-top-script'){
  s=act(s,{type:'chooseTopScript',mode:'skip'});
  s=orderBottom(s);
 }
 s=act(s,a=>a.type==='chooseHandRest'&&a.uid===quiet.uid&&a.line==='front');
 assert.equal(s.players[0].front.find(c=>c?.uid===quiet.uid).ready,false);
});

test('MHA-1-072 draws back to three and scales one retirement by the discarded cards',()=>{
 let s=open({'MHA-1-072':1,'MHA-1-069':1,'MHA-1-077':1,'MHA-1-078':4},7201);
 fuel(s,0,['MHA-1-069','MHA-1-077','MHA-1-078']);
 readyAp(s,2);
 const self=hold(s,0,'MHA-1-072');
 s.players[0].deck.push(...s.players[0].hand.filter(c=>c!==self));
 s.players[0].hand=[self];
 const deck=s.players[0].deck.length;
 s=play(s,'MHA-1-072');
 assert.equal(s.pending.kind,'effect-discard-any');
 const before=s.players[0].hand.length;
 s=act(s,{type:'chooseDiscardAny',mode:'skip'});
 assert.equal(s.players[0].hand.length,before);
 s=open({'MHA-1-072':1,'MHA-1-069':1,'MHA-1-077':1,'MHA-1-078':4},7202);
 fuel(s,0,['MHA-1-069','MHA-1-077','MHA-1-078']);
 readyAp(s,2);
 const actor=hold(s,0,'MHA-1-072');
 s.players[0].deck.push(...s.players[0].hand.filter(c=>c!==actor));
 s.players[0].hand=[actor];
 const stock=s.players[0].deck.length;
 s=play(s,'MHA-1-072');
 s=act(s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(s.players[0].hand.length,3);
 assert.equal(s.players[0].deck.length,stock-3);
 s=open({'MHA-1-072':1,'MHA-1-073':1,'MHA-1-078':2},7203);
 const unit=seat(s,0,'MHA-1-072','front',0,true);
 const low=seat(s,1,'MHA-1-073','front',0);
 const high=seat(s,1,'MHA-1-078','front',1);
 const pay=hold(s,0,'MHA-1-078');
 assert.equal(universalAttackDamage(pack,s,unit),2);
 s=reach(s,'attack');
 s=act(s,{type:'attack',uid:unit.uid});
 assert.equal(s.pending.mode,'retireScale');
 s=act(s,{type:'chooseDiscardAny',mode:'take',uid:pay.uid});
 assert.throws(()=>dispatchUniversalAction(pack,s,{type:'chooseDiscardAny',mode:'take',uid:pay.uid}),
  /Illegal|not currently legal/);
 s=act(s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(s.pending.limit,1000);
 assert.equal(s.pending.choices.includes(low.uid),true);
 assert.equal(s.pending.choices.includes(high.uid),false);
});

test('MHA-1-081 raids Todoroki, and damage closes when life falls below five',()=>{
 let s=open({'MHA-1-081':1,'MHA-1-078':2,'MHA-1-069':1,'MHA-1-077':1},8101);
 fuel(s,0,['MHA-1-069','MHA-1-077']);
 readyAp(s,1);
 while(s.players[1].life.length>4)s.players[1].deck.push(s.players[1].life.pop());
 const base=seat(s,0,'MHA-1-078','front',1,true);
 const topCard=hold(s,0,'MHA-1-081');
 s=act(s,a=>a.type==='raid'&&a.uid===topCard.uid&&a.baseUid===base.uid&&a.line!=='energy');
 const raided=s.players[0].front.find(c=>c?.cardId==='MHA-1-081');
 assert.equal(raided.stack.some(c=>c.uid===base.uid),true);
 assert.equal(legal(s).some(a=>a.mode==='hurt'),false);
 const foe=seat(s,1,'MHA-1-078','front',0,true);
 s=act(s,{type:'chooseEffectMode',mode:'rest'});
 s=act(s,{type:'chooseRestBp',uid:foe.uid});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.continuousStates.some(e=>e.kind==='skipNextActive'&&
  e.targetUid===foe.uid&&!e.consumed),true);
 let full=open({'MHA-1-081':1,'MHA-1-069':1,'MHA-1-077':1},8102);
 fuel(full,0,['MHA-1-069','MHA-1-077']);
 readyAp(full,1);
 while(full.players[1].life.length>5)full.players[1].deck.push(full.players[1].life.pop());
 while(full.players[1].life.length<5)full.players[1].life.push(full.players[1].deck.pop());
 full=play(full,'MHA-1-081');
 assert.equal(legal(full).some(a=>a.mode==='hurt'),true);
 full.players[1].deck.push(...full.players[1].life.splice(0,full.players[1].life.length-4));
 assert.throws(()=>dispatchUniversalAction(pack,full,{type:'chooseEffectMode',mode:'hurt'}),
  /not currently legal|Printed choice gate failed/);
});

test('MHA-1-084 spends the BP window once, and a scaled discard ignores it',()=>{
 let s=open({'MHA-1-084':2,'MHA-1-064':1,'MHA-1-041':2,'MHA-1-080':1,'MHA-1-071':1,'MHA-1-073':1},8401);
 fuel(s,0,['MHA-1-041','MHA-1-041']);
 readyAp(s,1);
 const unit=seat(s,0,'MHA-1-084','front',0,true);
 const sidelined=seat(s,0,'MHA-1-084','energy',2,true);
 const wide=seat(s,1,'MHA-1-080','front',0);
 const edge=seat(s,1,'MHA-1-071','front',1);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===sidelined.uid),false);
 s=act(s,{type:'activate',uid:unit.uid,mode:'frontOnce'});
 assert.deepEqual(s.bpWindowPlus,[1000,0]);
 assert.equal(legal(s).some(a=>a.type==='activate'&&a.uid===unit.uid),false);
 const event=hold(s,0,'MHA-1-064');
 s=act(s,a=>a.type==='event'&&a.uid===event.uid);
 assert.equal(s.pending.kind,'effect-retire-bp');
 assert.equal(s.pending.choices.includes(wide.uid),true);
 assert.equal(s.pending.choices.includes(edge.uid),true);
 assert.equal(s.bpWindowPlus[0],0);
 s=act(s,{type:'chooseRetireBp',uid:wide.uid});
 assert.equal(s.players[1].front[0],null);
 let color=open({'MHA-1-084':1,'MHA-1-073':1,'MHA-1-080':1,'MHA-1-078':1},8402);
 const revealed=pull(color,1,'MHA-1-084');
 color.players[1].deck.push(color.players[1].life[0]);
 color.players[1].life[0]=revealed;
 const low=seat(color,0,'MHA-1-073','front',0,true);
 const high=seat(color,0,'MHA-1-080','front',1,true);
 const attacker=seat(color,0,'MHA-1-078','front',2,true);
 color=reach(color,'attack');
 color=act(color,{type:'attack',uid:attacker.uid});
 if(color.pending?.kind==='block')color=act(color,a=>a.type==='chooseBlock'&&a.uid===null);
 assert.equal(color.pending.trigger,'color');
 assert.equal(legal(color).some(a=>a.mode==='colorRetire'&&a.uid===low.uid),true);
 assert.equal(legal(color).some(a=>a.uid===high.uid),false);
 color=act(color,a=>a.mode==='colorRetire'&&a.uid===low.uid);
 assert.equal(color.players[0].front[0],null);
 let scaled=open({'MHA-1-084':1,'MHA-1-072':1,'MHA-1-073':1,'MHA-1-078':2},8403);
 const window=seat(scaled,0,'MHA-1-084','front',1,true);
 const hitter=seat(scaled,0,'MHA-1-072','front',0,true);
 seat(scaled,1,'MHA-1-073','front',0);
 const above=seat(scaled,1,'MHA-1-078','front',1);
 scaled=act(scaled,{type:'activate',uid:window.uid,mode:'frontOnce'});
 scaled=reach(scaled,'attack');
 scaled=act(scaled,{type:'attack',uid:hitter.uid});
 scaled=act(scaled,{type:'chooseDiscardAny',mode:'stop'});
 assert.notEqual(scaled.pending?.kind,'effect-retire-bp');
 assert.equal(scaled.bpWindowPlus[0],1000);
 scaled=open({'MHA-1-084':1,'MHA-1-072':1,'MHA-1-073':1,'MHA-1-078':2},8404);
 const grant=seat(scaled,0,'MHA-1-084','front',1,true);
 const striker=seat(scaled,0,'MHA-1-072','front',0,true);
 const thousand=seat(scaled,1,'MHA-1-073','front',0);
 const fifteen=seat(scaled,1,'MHA-1-078','front',1);
 const discarded=hold(scaled,0,'MHA-1-078');
 scaled=act(scaled,{type:'activate',uid:grant.uid,mode:'frontOnce'});
 scaled=reach(scaled,'attack');
 scaled=act(scaled,{type:'attack',uid:striker.uid});
 scaled=act(scaled,{type:'chooseDiscardAny',mode:'take',uid:discarded.uid});
 scaled=act(scaled,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(scaled.pending.limit,1000);
 assert.equal(scaled.pending.choices.includes(thousand.uid),true);
 assert.equal(scaled.pending.choices.includes(fifteen.uid),false);
 assert.equal(scaled.bpWindowPlus[0],1000);
 void above;
});
