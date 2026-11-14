// Round 15 A. Shared operations stay generic. The MHA cards that need them
// stay pending until their own group writes the whole program.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,zoneRequiredEnergy,
 universalAttackDamage} from '../dist/universal-v2/engine.mjs';
import {createMhaV2Pack} from '../dist/universal-v2/mha-pack.mjs';
import {createImcV2Pack} from '../dist/universal-v2/imc-pack.mjs';
import {getTitle} from '../dist/title-registry.mjs';
import {UA10ST_PRODUCT} from '../dist/mha/ua10st-cards.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';

function card(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'green',
  type:extra.type||'character',energy:extra.energy??0,ap:extra.ap??1,
  bp:extra.bp??2000,gen:extra.gen??1,traits:extra.traits||[],
  trigger:extra.trigger??null,implementation:extra.implementation||'dsl',
  effects:extra.effects||{},...extra
 };
}
function shell(cards){
 const bodies=[...cards];
 let n=1;
 while(bodies.length*4<50){
  bodies.push(card({id:'FILL-'+String(n).padStart(2,'0'),name:'填'+n,
   implementation:'vanilla',bp:1000,effects:{}}));
  n++;
 }
 return createUniversalPack({id:'r15',version:'r15',cards:bodies});
}
function reject(body,pattern){
 const fillers=Array.from({length:12},(_,i)=>card({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000,effects:{}
 }));
 assert.throws(()=>createUniversalPack({id:'r15',version:'bad',cards:[card(body),...fillers]}),pattern);
}
function open(cards,{seed=15,phase='main'}={}){
 const pack=shell(cards);
 const deck={};
 let remain=50;
 const order=[...new Set([...cards.map(c=>c.id),...Object.keys(pack.cards)])];
 for(const id of order){
  if(remain<=0)break;
  const n=Math.min(4,remain);
  deck[id]=n;
  remain-=n;
 }
 assert.equal(remain,0);
 let s=newUniversalMatch(pack,{decks:[deck,deck],seed,first:0,openingMulligan:false});
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('pending '+s.pending.kind);
  s=dispatchUniversalAction(pack,s,{type:'next'});
  if(++guard>8)throw Error('phase '+phase);
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
function legal(pack,s){return legalUniversalActions(pack,s);}
function act(pack,s,action){
 if(typeof action==='function'){
  const found=legal(pack,s).find(action);
  assert.ok(found,'missing action');
  action=found;
 }
 const next=dispatchUniversalAction(pack,s,action);
 assert.equal(assertUniversalMatch(pack,next),true);
 return next;
}
function hold(s,id,p=0){
 const found=s.players[p].hand.find(c=>c.cardId===id)||pull(s,p,id);
 if(!s.players[p].hand.includes(found))s.players[p].hand.push(found);
 return found;
}
function play(pack,s,id,line='front',slot=0){
 const body=hold(s,id);
 const action=legal(pack,s).find(a=>a.type==='play'&&a.uid===body.uid&&a.line===line&&a.slot===slot);
 assert.ok(action,id+' play '+line+' '+slot);
 return act(pack,s,action);
}
function keepHand(s,ids,p=0){
 const kept=ids.map(id=>hold(s,id,p));
 s.players[p].deck.push(...s.players[p].hand.filter(c=>!kept.includes(c)));
 s.players[p].hand=kept;
 return kept;
}
function top(s,id,p=0){
 const body=pull(s,p,id);
 s.players[p].deck.unshift(body);
 return body;
}
const mainPay={op:'payHandGrantImpact',oncePerTurn:true,pay:1,amount:1};
const otherEnergy={kind:'ownOtherRequiredEnergyAtLeast',turn:'any',zone:'field',
 excludeSelf:true,minEnergy:4,min:3};
const activateCount={kind:'ownActivateMainAtLeast',turn:'any',zone:'field',min:3};

test('IMC stays open and MHA stays closed with the round 15 census',()=>{
 assert.equal(getTitle('imc').playable,true);
 assert.equal(createImcV2Pack().cards&&Object.keys(createImcV2Pack().cards).length,113);
 assert.equal(getTitle('mha').playable,false);
 assert.equal(UA10ST_PRODUCT.recipe,null);
 const pack=createMhaV2Pack();
 assert.equal(Object.keys(pack.cards).length,78);
 for(const id of ['MHA-1-002','MHA-1-003','MHA-1-004','MHA-1-005','MHA-1-011',
  'MHA-1-055','MHA-1-060','MHA-1-062','MHA-1-066','MHA-1-072','MHA-1-076',
  'MHA-1-081','MHA-1-084'])
  assert.equal(pack.cards[id],undefined);
});

test('a full front removes one card before the energy move, including the source',()=>{
 const mover=card({id:'MOVER',effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,
  max:1,whenSelf:'front',optional:true}]}});
 const fuel=card({id:'FUEL',implementation:'vanilla',effects:{}});
 const named=card({id:'NAMED',name:'悪魔ほむら',implementation:'vanilla',effects:{}});
 const shield=card({id:'SHIELD',frontNameRemoveShield:'悪魔ほむら',effects:{}});
 let opened=open([mover,fuel,named,shield]);
 const pl=opened.s.players[0];
 for(let slot=1;slot<pl.front.length;slot++){
  const id=slot===1?'NAMED':slot===2?'SHIELD':'FUEL';
  const body=pull(opened.s,0,id);
  body.ready=true;
  body.fieldEntryStamp=opened.s.nextFieldEntryStamp++;
  pl.front[slot]=body;
 }
 const back=pull(opened.s,0,'FUEL');
 back.ready=false;
 back.fieldEntryStamp=opened.s.nextFieldEntryStamp++;
 pl.energy[0]=back;
 keepHand(opened.s,['MOVER']);
 opened.s=play(opened.pack,opened.s,'MOVER');
 assert.equal(opened.s.pending.kind,'effect-front-vacate');
 assert.equal(opened.s.pending.optional,true);
 assert.equal(Object.keys(opened.s.pending).length,5);
 assert.equal(opened.s.pending.choices.includes(opened.s.players[0].front[0].uid),true);
 const protectedUid=opened.s.players[0].front[1].uid;
 assert.equal(opened.s.pending.choices.includes(protectedUid),false);
 assert.equal(uiActionLabel({type:'chooseFrontVacate',uid:null},{pack:opened.pack,state:opened.s}),
  '不移出前線卡');
 const skipped=act(opened.pack,opened.s,{type:'chooseFrontVacate',uid:null});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].removed.length,0);
 assert.equal(skipped.players[0].energy[0].uid,back.uid);
 let again=open([mover,fuel]);
 const board=again.s.players[0];
 for(let slot=1;slot<board.front.length;slot++){
  const body=pull(again.s,0,'FUEL');
  body.ready=true;
  body.fieldEntryStamp=again.s.nextFieldEntryStamp++;
  board.front[slot]=body;
 }
 const energy=pull(again.s,0,'FUEL');
 energy.ready=false;
 energy.fieldEntryStamp=again.s.nextFieldEntryStamp++;
 board.energy[0]=energy;
 keepHand(again.s,['MOVER']);
 again.s=play(again.pack,again.s,'MOVER');
 const other=again.s.players[0].front[1].uid;
 again.s=act(again.pack,again.s,{type:'chooseFrontVacate',uid:other});
 assert.equal(again.s.players[0].removed.some(c=>c.uid===other),true);
 assert.equal(again.s.pending.kind,'effect-energy-trait-front');
 assert.equal(again.s.pending.vacated,undefined);
 assert.equal(Object.keys(again.s.pending).length,9);
 const source=again.s.players[0].front[0].uid;
 assert.throws(()=>dispatchUniversalAction(again.pack,again.s,
  {type:'chooseEnergyTraitFront',uid:'nope',slot:1}),/not currently legal|Illegal/);
 again.s.players[0].deck.push(again.s.players[0].energy[0]);
 again.s.players[0].energy[0]=null;
 assert.deepEqual(legal(again.pack,again.s).map(a=>a.uid),[null]);
 assert.throws(()=>dispatchUniversalAction(again.pack,again.s,
  {type:'chooseEnergyTraitFront',uid:energy.uid,slot:1}),/not currently legal|Illegal/);
});

test('removing the source still moves, and an opened slot does not remove',()=>{
 const mover=card({id:'MOVER',effects:{onPlay:[{op:'moveEnergyTraitToFront',trait:null,
  max:1,whenSelf:'front',optional:true}]}});
 const fuel=card({id:'FUEL',implementation:'vanilla',effects:{}});
 let opened=open([mover,fuel]);
 const pl=opened.s.players[0];
 for(let slot=1;slot<pl.front.length;slot++){
  const body=pull(opened.s,0,'FUEL');
  body.ready=true;
  body.fieldEntryStamp=opened.s.nextFieldEntryStamp++;
  pl.front[slot]=body;
 }
 const back=pull(opened.s,0,'FUEL');
 back.fieldEntryStamp=opened.s.nextFieldEntryStamp++;
 pl.energy[0]=back;
 keepHand(opened.s,['MOVER']);
 opened.s=play(opened.pack,opened.s,'MOVER');
 const source=opened.s.players[0].front[0].uid;
 opened.s.players[0].outside.push(opened.s.players[0].front[2]);
 opened.s.players[0].front[2]=null;
 assert.deepEqual(legal(opened.pack,opened.s),[{type:'chooseFrontVacate',uid:null}]);
 opened.s=act(opened.pack,opened.s,{type:'chooseFrontVacate',uid:null});
 assert.equal(opened.s.pending.kind,'effect-energy-trait-front');
 assert.equal(opened.s.players[0].removed.length,0);
 opened.s=act(opened.pack,opened.s,a=>a.type==='chooseEnergyTraitFront'&&a.uid===back.uid);
 assert.equal(opened.s.players[0].front.some(c=>c?.uid===back.uid),true);
 let full=open([mover,fuel]);
 const board=full.s.players[0];
 for(let slot=1;slot<board.front.length;slot++){
  const body=pull(full.s,0,'FUEL');
  body.ready=true;
  body.fieldEntryStamp=full.s.nextFieldEntryStamp++;
  board.front[slot]=body;
 }
 const energy=pull(full.s,0,'FUEL');
 energy.fieldEntryStamp=full.s.nextFieldEntryStamp++;
 board.energy[0]=energy;
 keepHand(full.s,['MOVER']);
 full.s=play(full.pack,full.s,'MOVER');
 const self=full.s.players[0].front[0].uid;
 full.s=act(full.pack,full.s,{type:'chooseFrontVacate',uid:self});
 assert.equal(full.s.players[0].removed.some(c=>c.uid===self),true);
 assert.equal(full.s.pending.vacated,true);
 assert.equal(Object.keys(full.s.pending).length,10);
 full.s=act(full.pack,full.s,a=>a.type==='chooseEnergyTraitFront'&&a.uid===energy.uid);
 assert.equal(full.s.players[0].front[0].uid,energy.uid);
 assert.equal(full.s.pending,null);
});

test('three other high-energy characters may retire one opposing front',()=>{
 const actor=card({id:'LIVE',effects:{onPlay:[{op:'ifLiveThen',when:otherEnergy,
  then:[{op:'retireOppFrontUnderBp',bp:5000,optional:true}]}]}});
 const high=card({id:'HIGH',energy:4,mainAbility:mainPay});
 const low=card({id:'LOW',energy:3,mainAbility:mainPay,implementation:'dsl'});
 const foe=card({id:'FOE',bp:5000,implementation:'vanilla',effects:{}});
 const over=card({id:'OVER',bp:5500,implementation:'vanilla',effects:{}});
 reject({id:'BAD-LIVE',effects:{onPlay:[{op:'ifLiveThen',when:otherEnergy,
  then:[{op:'retireOppFrontUnderBp',bp:5000}]}]}},/invalid live-condition follow-up/);
 let opened=open([actor,high,low,foe,over]);
 seat(opened.s,0,'HIGH','front',1);
 seat(opened.s,0,'HIGH','front',2);
 seat(opened.s,0,'LOW','energy',0);
 seat(opened.s,1,'FOE','front',0);
 seat(opened.s,1,'OVER','front',1);
 keepHand(opened.s,['LIVE']);
 opened.s=play(opened.pack,opened.s,'LIVE');
 assert.equal(opened.s.pending,null);
 let enough=open([actor,high,foe,over]);
 seat(enough.s,0,'HIGH','front',1);
 seat(enough.s,0,'HIGH','front',2);
 seat(enough.s,0,'HIGH','energy',0);
 const target=seat(enough.s,1,'FOE','front',0);
 seat(enough.s,1,'OVER','front',1);
 keepHand(enough.s,['LIVE']);
 enough.s=play(enough.pack,enough.s,'LIVE');
 assert.equal(enough.s.pending.kind,'effect-retire-bp');
 assert.equal(enough.s.pending.choices.includes(target.uid),true);
 assert.equal(enough.s.pending.choices.includes(enough.s.players[1].front[1].uid),false);
 const gone=enough.s.pending.choices[0];
 enough.s.players[1].deck.push(enough.s.players[1].front[0]);
 enough.s.players[1].front[0]=null;
 assert.throws(()=>dispatchUniversalAction(enough.pack,enough.s,
  {type:'chooseRetireBp',uid:gone}),/not currently legal|Illegal/);
});

test('an attack may pay one hand card and then activate another cheap character',()=>{
 const attacker=card({id:'PAYER',name:'出久以外',effects:{onAttack:[{
  op:'oncePerTurnGate',scope:'card',optional:true,
  then:[{op:'payHandThenActive',optional:true,maxEnergy:3,excludeName:'緑谷 出久'}]
 }]}});
 const cheap=card({id:'CHEAP',energy:3,implementation:'vanilla',effects:{}});
 const rich=card({id:'RICH',energy:4,implementation:'vanilla',effects:{}});
 const named=card({id:'IZUKU',name:'緑谷 出久',energy:1,implementation:'vanilla',effects:{}});
 const pay=card({id:'PAY',implementation:'vanilla',effects:{}});
 reject({id:'BAD-PAY',effects:{onAttack:[{op:'payHandThenActive',optional:false,
  maxEnergy:3,excludeName:'緑谷 出久'}]}},/invalid hand payment then ACTIVE/);
 let empty=open([attacker,cheap],{phase:'attack'});
 const body=seat(empty.s,0,'PAYER','front',0,true);
 keepHand(empty.s,[]);
 empty.s=act(empty.pack,empty.s,{type:'attack',uid:body.uid});
 assert.notEqual(empty.s.pending?.kind,'effect-once-choice');
 let opened=open([attacker,cheap,rich,named,pay],{phase:'attack'});
 const unit=seat(opened.s,0,'PAYER','front',0,true);
 const other=seat(opened.s,0,'CHEAP','front',1,false);
 seat(opened.s,0,'RICH','energy',0,false);
 seat(opened.s,0,'IZUKU','energy',1,false);
 const payment=keepHand(opened.s,['PAY'])[0];
 opened.s=act(opened.pack,opened.s,{type:'attack',uid:unit.uid});
 assert.equal(opened.s.pending.kind,'effect-once-choice');
 const declined=act(opened.pack,opened.s,{type:'chooseOnceEffect',mode:'skip'});
 assert.equal(declined.players[0].hand.some(c=>c.uid===payment.uid),true);
 assert.equal(declined.pending.kind,'block');
 let paid=open([attacker,cheap,rich,named,pay],{phase:'attack'});
 const fighter=seat(paid.s,0,'PAYER','front',0,true);
 const target=seat(paid.s,0,'CHEAP','front',1,false);
 seat(paid.s,0,'RICH','energy',0,false);
 const excluded=seat(paid.s,0,'IZUKU','energy',1,false);
 const cardPay=keepHand(paid.s,['PAY'])[0];
 paid.s=act(paid.pack,paid.s,{type:'attack',uid:fighter.uid});
 paid.s=act(paid.pack,paid.s,{type:'chooseOnceEffect',mode:'activate'});
 assert.equal(paid.s.pending.kind,'effect-pay-hand-active');
 assert.equal(universalPrivateChoices(paid.pack,paid.s,1),null);
 assert.equal(uiActionLabel({type:'choosePayHandActive',uid:null},
  {pack:paid.pack,state:paid.s}),'不支付手牌');
 paid.s=act(paid.pack,paid.s,{type:'choosePayHandActive',uid:cardPay.uid});
 assert.equal(paid.s.players[0].outside.some(c=>c.uid===cardPay.uid),true);
 assert.equal(paid.s.pending.kind,'effect-active-character');
 assert.deepEqual(paid.s.pending.choices,[target.uid]);
 assert.equal(paid.s.pending.choices.includes(excluded.uid),false);
 assert.equal(paid.s.pending.choices.includes(fighter.uid),false);
 paid.s.players[0].deck.push(paid.s.players[0].front[1]);
 paid.s.players[0].front[1]=null;
 assert.throws(()=>dispatchUniversalAction(paid.pack,paid.s,
  {type:'chooseActiveCharacter',uid:target.uid}),/not currently legal|Illegal/);
 assert.equal(paid.s.players[0].outside.some(c=>c.uid===cardPay.uid),true);
});

test('a named character lets the field enter active, and resting it buffs everyone',()=>{
 const field=card({id:'FIELD',name:'場地',type:'field',enterActiveIfName:'発目 明',
  effects:{onPlay:[{op:'buffOwnField',filter:{field:'type',value:'character'},
   bp:1000,optional:true,excludeSelf:false}]},
  mainAbility:{op:'fieldRestRetireThen',then:[{op:'buffOwnField',
   filter:{field:'type',value:'character'},bp:500,optional:false,excludeSelf:false,all:true}]}});
 const host=card({id:'HOST',name:'発目 明',implementation:'vanilla',effects:{}});
 const ally=card({id:'ALLY',implementation:'vanilla',effects:{}});
 reject({id:'BAD-FIELD',type:'field',mainAbility:{op:'fieldRestRetireThen',then:[{
  op:'buffOwnField',filter:{field:'type',value:'character'},bp:500,optional:false,
  excludeSelf:true}]}},/invalid|unsupported/);
 let quiet=open([field,ally]);
 seat(quiet.s,0,'ALLY','front',0);
 keepHand(quiet.s,['FIELD']);
 quiet.s=play(quiet.pack,quiet.s,'FIELD','energy',0);
 assert.equal(quiet.s.players[0].energy[0].ready,false);
 let opened=open([field,host,ally]);
 seat(opened.s,0,'HOST','front',0);
 seat(opened.s,0,'ALLY','front',1);
 keepHand(opened.s,['FIELD']);
 opened.s=play(opened.pack,opened.s,'FIELD','energy',0);
 assert.equal(opened.s.players[0].energy[0].ready,true);
 assert.equal(opened.s.pending.kind,'effect-buff-own');
 opened.s=act(opened.pack,opened.s,a=>a.uid===null);
 const site=opened.s.players[0].energy[0];
 opened.s=act(opened.pack,opened.s,{type:'activate',uid:site.uid,mode:'fieldRestTrueRetireDeploy'});
 assert.equal(opened.s.players[0].energy[0],null);
 assert.equal((opened.s.players[0].front[1].buffs||[]).some(b=>b.bp===500),true);
 assert.equal((opened.s.players[0].front[0].buffs||[]).some(b=>b.bp===500),true);
});

test('a traitless green character can enter rested, and All Might wakes when the front is full',()=>{
 const event=card({id:'LOOK',type:'event',effects:{onPlay:[{op:'deployOwnHandRest',
  type:'character',color:'green',trait:null,max:1,optional:true,
  thenActiveIf:{name:'オールマイト',oppFrontAtLeast:3}}]}});
 const might=card({id:'MIGHT',name:'オールマイト',implementation:'vanilla',effects:{}});
 const green=card({id:'GREEN',name:'其他',implementation:'vanilla',effects:{}});
 const foe=card({id:'FOE',implementation:'vanilla',effects:{}});
 reject({id:'BAD-REST',type:'event',effects:{onPlay:[{op:'deployOwnHandRest',
  type:'character',color:'green',trait:null,energy:null,ap:null,max:1,optional:true}]}},
  /invalid hand REST entry/);
 let opened=open([event,might,green,foe]);
 for(let slot=0;slot<3;slot++)seat(opened.s,1,'FOE','front',slot);
 keepHand(opened.s,['LOOK','MIGHT']);
 const body=opened.s.players[0].hand.find(c=>c.cardId==='LOOK');
 opened.s=act(opened.pack,opened.s,{type:'event',uid:body.uid});
 assert.equal(opened.s.pending.kind,'effect-hand-rest');
 const choice=legal(opened.pack,opened.s).find(a=>a.uid&&a.line==='front');
 const played=opened.s.players[0].hand.find(c=>c.uid===choice.uid);
 opened.s=act(opened.pack,opened.s,choice);
 const entered=opened.s.players[0].front.find(c=>c?.uid===played.uid);
 assert.equal(entered.ready,played.cardId==='MIGHT');
 let rested=open([event,green,foe]);
 seat(rested.s,1,'FOE','front',0);
 keepHand(rested.s,['LOOK','GREEN']);
 const evt=rested.s.players[0].hand.find(c=>c.cardId==='LOOK');
 rested.s=act(rested.pack,rested.s,{type:'event',uid:evt.uid});
 const pick=legal(rested.pack,rested.s).find(a=>a.uid&&a.line==='front');
 const who=rested.s.players[0].hand.find(c=>c.uid===pick.uid);
 rested.s.players[0].deck.push(who);
 rested.s.players[0].hand=rested.s.players[0].hand.filter(c=>c.uid!==who.uid);
 assert.throws(()=>dispatchUniversalAction(rested.pack,rested.s,pick),
  /not currently legal|Illegal|eligible/);
});

test('discarding any number draws back to three, and attack discards scale the retirement',()=>{
 const actor=card({id:'DISCARD',printedAttackDamage:2,effects:{
  onPlay:[{op:'discardUntilHand',until:3,optional:true}],
  onAttack:[{op:'discardThenRetireScaled',per:1000,optional:true}]
 }});
 const extra=card({id:'EXTRA',implementation:'vanilla',effects:{}});
 const low=card({id:'LOW',bp:1000,implementation:'vanilla',effects:{}});
 const high=card({id:'HIGH',bp:2500,implementation:'vanilla',effects:{}});
 reject({id:'BAD-UNTIL',effects:{onPlay:[{op:'discardToDraw',untilHand:3}]}},
  /invalid discard/);
 let skipped=open([actor,extra]);
 keepHand(skipped.s,['DISCARD']);
 skipped.s=play(skipped.pack,skipped.s,'DISCARD');
 assert.equal(skipped.s.pending.kind,'effect-discard-any');
 const before=skipped.s.players[0].hand.length;
 skipped.s=act(skipped.pack,skipped.s,{type:'chooseDiscardAny',mode:'skip'});
 assert.equal(skipped.s.players[0].hand.length,before);
 assert.equal(skipped.s.pending,null);
 let drawn=open([actor,extra]);
 keepHand(drawn.s,['DISCARD']);
 const deck=drawn.s.players[0].deck.length;
 drawn.s=play(drawn.pack,drawn.s,'DISCARD');
 drawn.s=act(drawn.pack,drawn.s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(drawn.s.players[0].hand.length,3);
 assert.equal(drawn.s.players[0].deck.length,deck-3);
 let attack=open([actor,extra,low,high],{phase:'attack'});
 const unit=seat(attack.s,0,'DISCARD','front',0,true);
 keepHand(attack.s,['EXTRA']);
 seat(attack.s,1,'LOW','front',0);
 const tall=seat(attack.s,1,'HIGH','front',1);
 attack.s=act(attack.pack,attack.s,{type:'attack',uid:unit.uid});
 assert.equal(attack.s.pending.kind,'effect-discard-any');
 assert.equal(attack.s.pending.mode,'retireScale');
 const first=attack.s.players[0].hand[0];
 attack.s=act(attack.pack,attack.s,{type:'chooseDiscardAny',mode:'take',uid:first.uid});
 assert.throws(()=>dispatchUniversalAction(attack.pack,attack.s,
  {type:'chooseDiscardAny',mode:'take',uid:first.uid}),/Illegal|not currently legal/);
 attack.s=act(attack.pack,attack.s,{type:'chooseDiscardAny',mode:'stop'});
 assert.equal(attack.s.pending.kind,'effect-retire-bp');
 assert.equal(attack.s.pending.limit,1000);
 assert.equal(attack.s.pending.choices.includes(tall.uid),false);
 assert.equal(universalPrivateChoices(attack.pack,attack.s,1),null);
});

test('five life offers one damage, and the other branch rests without the next active',()=>{
 const actor=card({id:'FORK',effects:{onPlay:[{op:'chooseOne',optional:false,ownTurnOnly:true,
  options:[
   {id:'hurt',label:'傷害',turn:'any',when:{kind:'oppLifeAtLeast',turn:'any',min:5},
    then:[{op:'damagePlayer',amount:1}]},
   {id:'rest',label:'休息',turn:'any',
    then:[{op:'restOppFrontOne',optional:true,skipNextActive:true}]}
  ]}]}});
 const foe=card({id:'FOE',implementation:'vanilla',effects:{}});
 reject({id:'BAD-FORK',effects:{onPlay:[{op:'chooseOne',optional:false,options:[
  {id:'hurt',label:'傷害',turn:'any',then:[{op:'damagePlayer',count:1}]},
  {id:'rest',label:'休息',turn:'any',then:[{op:'restOppFrontOne',optional:true,skipNextActive:true}]}
 ]}]}} ,/invalid choose-one option/);
 let short=open([actor,foe]);
 while(short.s.players[1].life.length>4)
  short.s.players[1].deck.push(short.s.players[1].life.pop());
 keepHand(short.s,['FORK']);
 short.s=play(short.pack,short.s,'FORK');
 assert.equal(legal(short.pack,short.s).some(a=>a.mode==='hurt'),false);
 assert.equal(legal(short.pack,short.s).some(a=>a.mode==='rest'),true);
 const blocker=seat(short.s,1,'FOE','front',0,true);
 short.s=act(short.pack,short.s,{type:'chooseEffectMode',mode:'rest'});
 assert.equal(short.s.pending.kind,'effect-rest-bp');
 short.s=act(short.pack,short.s,{type:'chooseRestBp',uid:blocker.uid});
 assert.equal(short.s.players[1].front.find(c=>c?.uid===blocker.uid).ready,false);
 assert.equal(short.s.continuousStates.some(e=>e.kind==='skipNextActive'&&
  e.targetUid===blocker.uid&&!e.consumed),true);
 let full=open([actor]);
 while(full.s.players[1].life.length>5)full.s.players[1].deck.push(full.s.players[1].life.pop());
 while(full.s.players[1].life.length<5)full.s.players[1].life.push(full.s.players[1].deck.pop());
 keepHand(full.s,['FORK']);
 full.s=play(full.pack,full.s,'FORK');
 assert.equal(legal(full.pack,full.s).some(a=>a.mode==='hurt'),true);
 const stored=full.s.players[1].life.splice(0,full.s.players[1].life.length-4);
 full.s.players[1].deck.push(...stored);
 assert.throws(()=>dispatchUniversalAction(full.pack,full.s,
  {type:'chooseEffectMode',mode:'hurt'}),/not currently legal|Printed choice gate failed/);
});

test('the next BP window widens one selection and then is spent',()=>{
 const grant=card({id:'WINDOW',mainAbility:{op:'frontOnceProgram',frontOnly:true,
  oncePerTurn:true,then:[{op:'grantNextBpWindow',amount:1000}]}});
 const retire=card({id:'RETIRE',effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:3000,optional:true}]}});
 const edge=card({id:'EDGE',bp:4000,implementation:'vanilla',effects:{}});
 const over=card({id:'OVER',bp:4500,implementation:'vanilla',effects:{}});
 reject({id:'BAD-WINDOW',mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
  then:[{op:'grantNextBpWindow',amount:500}]}},/unsupported main action ability|invalid BP window/);
 let opened=open([grant,retire,edge,over]);
 const unit=seat(opened.s,0,'WINDOW','front',1,true);
 const wide=seat(opened.s,1,'EDGE','front',0);
 const tall=seat(opened.s,1,'OVER','front',1);
 opened.s=act(opened.pack,opened.s,{type:'activate',uid:unit.uid,mode:'frontOnce'});
 assert.deepEqual(opened.s.bpWindowPlus,[1000,0]);
 keepHand(opened.s,['RETIRE']);
 opened.s=play(opened.pack,opened.s,'RETIRE');
 assert.equal(opened.s.pending.kind,'effect-retire-bp');
 assert.equal(opened.s.pending.choices.includes(wide.uid),true);
 assert.equal(opened.s.pending.choices.includes(tall.uid),false);
 assert.equal(opened.s.bpWindowPlus[0],0);
 opened.s.bpWindowPlus=[1600,0];
 assert.throws(()=>assertUniversalMatch(opened.pack,opened.s),/Invalid BP window/);
});

test('milling up to three can recover a trait or a named card from outside',()=>{
 const miller=card({id:'MILL',effects:{onPlay:[{op:'millUpToThenRecover',count:3,optional:true,
  recover:{zone:'outside',max:1,optional:true,anyOf:[
   {field:'trait',value:'死穢八斎會'},{field:'name',value:'“個性”消失弾'}]}}]},
  mainAbility:{op:'restRetireSequence',then:[{op:'recoverOutsideAny',zone:'outside',max:1,
   optional:true,anyOf:[{field:'trait',value:'死穢八斎會'},{field:'name',value:'“個性”消失弾'}]}]}});
 const trait=card({id:'TRAIT',traits:['死穢八斎會'],implementation:'vanilla',effects:{}});
 const named=card({id:'NAMED',name:'“個性”消失弾',type:'event',implementation:'vanilla',effects:{}});
 const other=card({id:'OTHER',implementation:'vanilla',effects:{}});
 reject({id:'BAD-MILL',effects:{onPlay:[{op:'millUpToThenRecover',count:4,optional:true,
  recover:{zone:'outside',max:1,optional:true,anyOf:[{field:'trait',value:'死穢八斎會'}]}}]}},
  /invalid mill-then-recover profile/);
 let opened=open([miller,trait,named,other]);
 top(opened.s,'OTHER');
 top(opened.s,'TRAIT');
 keepHand(opened.s,['MILL']);
 const outsideBefore=opened.s.players[0].outside.length;
 opened.s=play(opened.pack,opened.s,'MILL');
 assert.equal(opened.s.pending.kind,'effect-mill-optional');
 opened.s=act(opened.pack,opened.s,{type:'chooseMillOptional',mode:'stop'});
 assert.equal(opened.s.pending,null);
 assert.equal(opened.s.players[0].outside.length,outsideBefore);
 let taken=open([miller,trait,other]);
 top(taken.s,'OTHER');
 const wanted=top(taken.s,'TRAIT');
 keepHand(taken.s,['MILL']);
 taken.s=play(taken.pack,taken.s,'MILL');
 taken.s=act(taken.pack,taken.s,{type:'chooseMillOptional',mode:'mill'});
 taken.s=act(taken.pack,taken.s,{type:'chooseMillOptional',mode:'stop'});
 assert.equal(taken.s.pending.kind,'effect-recover-any');
 assert.equal(taken.s.pending.choices.includes(wanted.uid),true);
 assert.equal(universalPrivateChoices(taken.pack,taken.s,1),null);
 const away=taken.s.players[0].outside.findIndex(c=>c.uid===wanted.uid);
 taken.s.players[0].deck.push(taken.s.players[0].outside.splice(away,1)[0]);
 assert.throws(()=>dispatchUniversalAction(taken.pack,taken.s,
  {type:'chooseRecoverAny',uid:wanted.uid}),/not currently legal|Illegal/);
});

test('three activate-main characters raise BP, and a raid-only main does not count',()=>{
 const actor=card({id:'PASSIVE',bp:2000,passiveBonuses:[{bp:1000,condition:activateCount}]});
 const supporter=card({id:'MAIN',mainAbility:mainPay});
 const boxed=card({id:'MST-1-025',mainAbility:mainPay});
 const foe=card({id:'FOE',bp:2500,implementation:'vanilla',effects:{}});
 reject({id:'BAD-PASSIVE',passiveBonuses:[{bp:1000,condition:{
  kind:'ownActivateMainAtLeast',turn:'any',min:3}}]},/invalid passive condition/);
 let opened=open([actor,supporter,foe],{phase:'attack'});
 const unit=seat(opened.s,0,'PASSIVE','front',0,true);
 seat(opened.s,0,'MAIN','front',1);
 seat(opened.s,0,'MAIN','front',2);
 seat(opened.s,0,'MAIN','energy',0);
 const blocker=seat(opened.s,1,'FOE','front',0,true);
 assert.equal(matchesV2LiveCondition(opened.s,0,unit.uid,activateCount,
  c=>opened.pack.cards[c.cardId],()=>0,()=>0),true);
 opened.s=act(opened.pack,opened.s,{type:'attack',uid:unit.uid});
 opened.s=act(opened.pack,opened.s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(opened.s.players[1].front[0],null);
 let hidden=open([actor,boxed]);
 const self=seat(hidden.s,0,'PASSIVE','front',0);
 seat(hidden.s,0,'MST-1-025','front',1);
 seat(hidden.s,0,'MST-1-025','front',2);
 seat(hidden.s,0,'MST-1-025','energy',0);
 assert.equal(matchesV2LiveCondition(hidden.s,0,self.uid,activateCount,
  c=>hidden.pack.cards[c.cardId],()=>0,()=>0),false);
});

test('three activate-main characters reduce this card hand energy, without copying a main',()=>{
 const actor=card({id:'CUT',energy:6,color:'purple',handEnergyWhileActivateMain:{min:3,amount:3},
  printedImpact:1});
 const supporter=card({id:'MAIN',mainAbility:mainPay});
 let opened=open([actor,supporter]);
 assert.equal(zoneRequiredEnergy(opened.pack,opened.s,0,opened.pack.cards.CUT,'hand'),6);
 seat(opened.s,0,'MAIN','front',0);
 seat(opened.s,0,'MAIN','front',1);
 seat(opened.s,0,'MAIN','energy',0);
 assert.equal(zoneRequiredEnergy(opened.pack,opened.s,0,opened.pack.cards.CUT,'hand'),3);
 assert.equal(opened.pack.cards.CUT.mainAbility,null);
});

test('a required name gates attack and block, and a main can grant damage 2',()=>{
 const actor=card({id:'GATE',ownTurnBp:2000,battleRequiresAnyName:['オール・フォー・ワン','死柄木 弔'],
  mainAbility:{op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,
   then:[{op:'grantSelfAttackDamageThisTurn',amount:2}]}});
 const name=card({id:'NAME',name:'死柄木 弔',implementation:'vanilla',effects:{}});
 const plain=card({id:'PLAIN',implementation:'vanilla',effects:{}});
 let opened=open([actor,name,plain],{phase:'attack'});
 const unit=seat(opened.s,0,'GATE','front',1,true);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='attack'&&a.uid===unit.uid),false);
 seat(opened.s,0,'NAME','front',0);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='attack'&&a.uid===unit.uid),true);
 const defender=seat(opened.s,1,'GATE','front',0,true);
 opened.s=act(opened.pack,opened.s,a=>a.type==='attack'&&a.uid===unit.uid);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='chooseBlock'&&a.uid===defender.uid),false);
 seat(opened.s,1,'NAME','front',1);
 assert.equal(legal(opened.pack,opened.s).some(a=>a.type==='chooseBlock'&&a.uid===defender.uid),true);
 let damage=open([actor],{phase:'main'});
 const source=seat(damage.s,0,'GATE','energy',0,true);
 damage.s=act(damage.pack,damage.s,{type:'activate',uid:source.uid,mode:'frontOnce'});
 const granted=damage.s.players[0].energy.find(c=>c?.uid===source.uid);
 assert.equal(universalAttackDamage(damage.pack,damage.s,granted),2);
 assert.throws(()=>dispatchUniversalAction(damage.pack,damage.s,
  {type:'activate',uid:source.uid,mode:'frontOnce'}),/not currently legal/);
});

test('a blocker skips its next active, and a main can force a block',()=>{
 const actor=card({id:'FORCE',blockSkipsNextActive:true,mainAbility:{
  op:'frontOnceProgram',frontOnly:false,oncePerTurn:true,
  then:[{op:'grantSelfMustBlockThisTurn'}]}});
 const foe=card({id:'FOE',bp:3000,implementation:'vanilla',effects:{}});
 let opened=open([actor,foe],{phase:'attack'});
 const unit=seat(opened.s,0,'FORCE','front',0,true);
 const blocker=seat(opened.s,1,'FOE','front',0,true);
 opened.s=act(opened.pack,opened.s,{type:'attack',uid:unit.uid});
 opened.s=act(opened.pack,opened.s,{type:'chooseBlock',uid:blocker.uid});
 assert.equal(opened.s.continuousStates.some(e=>e.kind==='skipNextActive'&&
  e.targetUid===blocker.uid),true);
 let forced=open([actor,foe],{phase:'main'});
 const source=seat(forced.s,0,'FORCE','front',0,true);
 const wall=seat(forced.s,1,'FOE','front',0,true);
 forced.s=act(forced.pack,forced.s,{type:'activate',uid:source.uid,mode:'frontOnce'});
 while(forced.s.phase!=='attack'){
  if(forced.s.pending)break;
  forced.s=act(forced.pack,forced.s,{type:'next'});
 }
 forced.s=act(forced.pack,forced.s,{type:'attack',uid:source.uid});
 assert.equal(forced.s.pending.kind,'block');
 assert.equal(legal(forced.pack,forced.s).some(a=>a.uid===null),false);
 assert.equal(legal(forced.pack,forced.s).some(a=>a.uid===wall.uid),true);
});
