import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID,STEINS_GATE_CARDS} from '../dist/steins-gate-cards.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,playMain,put,readyAp,stg,stgPacks,take,toPhase} from './helpers/stg-v2-match.mjs';

const IDS=['STG-1-031','STG-1-073','STG-1-021','STG-1-069','STG-1-035',
 'STG-1-043','STG-1-048','STG-1-054','STG-1-072','STG-1-044'];

function go(s,action){
 return dispatchUniversalAction(stgPacks,s,action,{actor:0});
}
function playLine(s,uid,line){
 const action=legalUniversalActions(stgPacks,s).find(a=>a.type==='play'&&a.uid===uid&&a.line===line);
 if(!action)throw Error('No '+line+' play');
 return go(s,action);
}
function order(s,uids){
 for(const uid of uids)s=go(s,{type:'chooseTopOrder',uid});
 return s;
}
function replay(id){
 const c=stg.cards[id];
 return {
  id:c.id,name:c.name,color:c.color,type:c.type,energy:c.energy,ap:c.ap,
  bp:c.bp,gen:c.gen,trigger:c.trigger,traits:c.traits||[],
  implementation:c.implementation,effects:c.effects
 };
}
function fillers(){
 return Array.from({length:12},(_,i)=>({
  id:'F'+i,name:'填料'+i,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'vanilla',effects:{}
 }));
}
function pull(s,p,id){
 const pl=s.players[p];
 for(const zone of ['hand','deck','outside']){
  const index=pl[zone].findIndex(c=>c.cardId===id);
  if(index>=0)return pl[zone].splice(index,1)[0];
 }
 const life=pl.life.findIndex(c=>c.cardId===id);
 if(life<0)throw Error('Missing '+id);
 const swapped=pl.deck.pop();
 const card=pl.life[life];
 pl.life[life]=swapped;
 return card;
}
function labMatch(cards,seed){
 const pack=createUniversalPack({id:'stg-lab',version:'lab',cards:[...cards,...fillers()]});
 const counts={};
 let n=0;
 for(const card of cards){counts[card.id]=1;n++;}
 for(const card of fillers())while(n<50&&(counts[card.id]||0)<4){
  counts[card.id]=(counts[card.id]||0)+1;n++;
 }
 const packs=[pack,pack];
 return {packs,s:newUniversalMatch(packs,{decks:[counts,counts],seed,first:0})};
}

test('batches 11-20 register ten prints and leave the census unchanged',()=>{
 assert.ok(!V2_TITLE_IDS.includes('steins-gate'));
 assert.equal(STEINS_GATE_CARDS.filter(c=>c.engineKind).length,54);
 assert.equal(STEINS_GATE_CARDS.filter(c=>!c.engineKind).length,26);
 assert.equal(Object.keys(stg.cards).length,54);
 assert.equal(stg.version,'stg-ua57-batches-21-30-20261028');
 for(const id of IDS)assert.equal(stg.cards[id].name,STEINS_GATE_BY_ID[id].nameJa);
 assert.equal(stg.cards['STG-1-003'],undefined);
 assert.equal(STEINS_GATE_BY_ID['STG-1-011'].engineKind,null);
 const base={id:'X',name:'X',color:'green',type:'character',energy:1,ap:1,bp:1000,gen:1,implementation:'dsl'};
 assert.throws(()=>createUniversalPack({id:'discard-flag',cards:[{...base,effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,filter:{field:'type',value:'character'},discard:true
 }]}}]}),/invalid top-N filtered bottom\/discard profile/);
 assert.throws(()=>createUniversalPack({id:'compound-keep',cards:[{...base,effects:{onPlay:[{
  op:'searchTopOneBottomDiscard',count:3,logic:'any',discard:false,
  filters:['a','b'].map(value=>({field:'name',value}))
 }]}}]}),/invalid top-N filtered bottom\/discard profile/);
 assert.throws(()=>createUniversalPack({id:'opp-event',cards:[{...base,effects:{},passiveBonuses:[{
  condition:{kind:'ownEventUsedThisTurn',turn:'opponent'},bp:500}]}]}),
  /not an opponent-turn gate/);
 assert.throws(()=>createUniversalPack({id:'any-controller',cards:[{...base,type:'field',bp:0,gen:0,effects:{onPlay:[{
  op:'ifLiveThen',when:{kind:'controllerTurn',turn:'any'},then:[{op:'recoverAp',count:1}]
 }]}}]}),/controller turn is the printed own-turn gate/);
 assert.doesNotThrow(()=>createUniversalPack({id:'any-event',cards:[{...base,effects:{},passiveBonuses:[{
  condition:{kind:'ownEventUsedThisTurn',turn:'any'},bp:500}]}]}));
});

test('STG-1-031 adds one character from the top three and does not discard',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-031','STG-1-034']),9031),'main');
 put(s,0,'STG-1-001','energy',0);
 put(s,0,'STG-1-007','energy',1);
 const window=['STG-1-024','STG-1-032','STG-1-034'].map(id=>take(s,0,id));
 s.players[0].deck.unshift(...window);
 const source=take(s,0,'STG-1-031');
 s.players[0].hand.push(source);
 readyAp(s);
 const spare=s.players[0].hand.find(c=>c.uid!==source.uid);
 s=playLine(s,source.uid,'energy');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.equal(s.pending.discard,false);
 assert.equal(universalPrivateChoices(stgPacks,s,1),null);
 assert.deepEqual(legalUniversalActions(stgPacks,s).filter(a=>a.uid).map(a=>a.uid),[window[0].uid]);
 s=go(s,{type:'chooseTopFiltered',uid:window[0].uid});
 s=order(s,[window[1].uid,window[2].uid]);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===window[0].uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===spare.uid));
 assert.deepEqual(s.players[0].deck.slice(-2).map(c=>c.uid),[window[1].uid,window[2].uid]);

 let miss=toPhase(stgPacks,fresh(deckWith(['STG-1-031','STG-1-073']),9032),'main');
 put(miss,0,'STG-1-001','energy',0);
 put(miss,0,'STG-1-007','energy',1);
 const events=['STG-1-032','STG-1-032','STG-1-073'].map(id=>take(miss,0,id));
 miss.players[0].deck.unshift(...events);
 const again=take(miss,0,'STG-1-031');
 miss.players[0].hand.push(again);
 readyAp(miss);
 const hand=miss.players[0].hand.length;
 miss=playLine(miss,again.uid,'energy');
 assert.equal(miss.pending.kind,'effect-top-order');
 miss=order(miss,events.map(c=>c.uid));
 assert.equal(miss.pending,null);
 assert.equal(miss.players[0].hand.length,hand-1);
 assert.equal(assertUniversalMatch(stgPacks,miss),true);
});

test('STG-1-073 draws and discards on entry, then draws when it retires',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-073']),9073),'main');
 const source=take(s,0,'STG-1-073');
 s.players[0].hand.push(source);
 readyAp(s);
 const deck=s.players[0].deck.length;
 s=playLine(s,source.uid,'energy');
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,deck-1);
 const discarded=s.players[0].hand[0];
 s=go(s,{type:'chooseDiscard',uid:discarded.uid});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===discarded.uid));

 const retire={id:'RET',name:'退場',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{},mainAbility:{op:'retireOwnFieldThen',frontOnly:true,
   oncePerTurn:true,optional:true,after:[{op:'draw',count:1}]}};
 const lab=labMatch([replay('STG-1-073'),retire],9074);
 let t=toPhase(lab.packs,lab.s,'main');
 const field=pull(t,0,'STG-1-073');
 const actor=pull(t,0,'RET');
 t.players[0].hand.push(field,actor);
 readyAp(t);
 t=dispatchUniversalAction(lab.packs,t,legalUniversalActions(lab.packs,t)
  .find(a=>a.type==='play'&&a.uid===field.uid&&a.line==='energy'),{actor:0});
 const spare=t.players[0].hand.find(c=>c.uid!==actor.uid);
 t=dispatchUniversalAction(lab.packs,t,{type:'chooseDiscard',uid:spare.uid},{actor:0});
 t=dispatchUniversalAction(lab.packs,t,legalUniversalActions(lab.packs,t)
  .find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='front'),{actor:0});
 const before=t.players[0].deck.length;
 t=dispatchUniversalAction(lab.packs,t,legalUniversalActions(lab.packs,t)
  .find(a=>a.type==='activate'&&a.uid===actor.uid&&a.mode==='retireFieldThen'),{actor:0});
 t=dispatchUniversalAction(lab.packs,t,{type:'chooseOwnFieldRetire',uid:field.uid},{actor:0});
 assert.ok(t.players[0].outside.some(c=>c.uid===field.uid));
 assert.equal(t.players[0].deck.length,before-2);
 assert.equal(assertUniversalMatch(lab.packs,t),true);
});

test('STG-1-021 must choose draw-discard or one Suzuha or Hashida',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-021']),9021),'main');
 put(s,0,'STG-1-001','energy',0);
 put(s,0,'STG-1-001','energy',1);
 put(s,0,'STG-1-007','energy',2);
 const suzuha=put(s,0,'STG-1-001','front',0);
 const source=take(s,0,'STG-1-021');
 s.players[0].hand.push(source);
 readyAp(s);
 s=playMain(stgPacks,s,source.uid);
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.equal(s.pending.optional,false);
 assert.deepEqual(legalUniversalActions(stgPacks,s).map(a=>a.mode),['draw','names']);
 s=go(s,{type:'chooseEffectMode',mode:'names'});
 const buffs=legalUniversalActions(stgPacks,s);
 assert.equal(buffs.some(a=>a.uid===s.players[0].energy[2].uid),false);
 assert.ok(buffs.some(a=>a.type==='chooseOwnBuff'&&a.uid===suzuha.uid));
 assert.ok(buffs.some(a=>a.type==='chooseOwnBuff'&&a.uid===source.uid));
 s=go(s,{type:'chooseOwnBuff',uid:suzuha.uid});
 assert.deepEqual(s.players[0].front.find(c=>c?.uid===suzuha.uid).buffs,[{bp:2000,untilTurn:s.turn}]);
 assert.equal(s.pending,null);

 let drawn=toPhase(stgPacks,fresh(deckWith(['STG-1-021']),9022),'main');
 put(drawn,0,'STG-1-001','energy',0);
 put(drawn,0,'STG-1-001','energy',1);
 put(drawn,0,'STG-1-007','energy',2);
 const hashida=take(drawn,0,'STG-1-021');
 drawn.players[0].hand.push(hashida);
 readyAp(drawn);
 const deck=drawn.players[0].deck.length;
 drawn=playMain(stgPacks,drawn,hashida.uid);
 drawn=go(drawn,{type:'chooseEffectMode',mode:'draw'});
 assert.equal(drawn.pending.kind,'effect-discard');
 assert.equal(drawn.players[0].deck.length,deck-1);
 assert.equal(assertUniversalMatch(stgPacks,drawn),true);
});

test('STG-1-069 chooses draw-discard or another character, and its color trigger plays a cheap green character',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-069']),9069),'main');
 const other=put(s,0,'STG-1-057','front',0);
 const source=take(s,0,'STG-1-069');
 s.players[0].hand.push(source);
 readyAp(s);
 s=playMain(stgPacks,s,source.uid);
 s=go(s,{type:'chooseEffectMode',mode:'other'});
 const choices=legalUniversalActions(stgPacks,s);
 assert.equal(choices.some(a=>a.uid===source.uid),false);
 assert.ok(choices.some(a=>a.type==='chooseOwnBuff'&&a.uid===other.uid));
 s=go(s,{type:'chooseOwnBuff',uid:other.uid});
 assert.deepEqual(s.players[0].front.find(c=>c?.uid===other.uid).buffs,[{bp:1000,untilTurn:s.turn}]);

 let alone=toPhase(stgPacks,fresh(deckWith(['STG-1-069']),9070),'main');
 const only=take(alone,0,'STG-1-069');
 alone.players[0].hand.push(only);
 readyAp(alone);
 alone=playMain(stgPacks,alone,only.uid);
 alone=go(alone,{type:'chooseEffectMode',mode:'other'});
 assert.equal(alone.pending,null);

 let life=toPhase(stgPacks,fresh(deckWith(['STG-1-069','STG-1-043']),9071),'attack');
 const attacker=put(life,0,'STG-1-001','front',0,true);
 const trigger=take(life,1,'STG-1-069');
 life.players[1].deck.push(life.players[1].life.shift());
 life.players[1].life.unshift(trigger);
 const cheap=take(life,1,'STG-1-057');
 const expensive=take(life,1,'STG-1-043');
 life.players[1].hand.push(cheap,expensive);
 life=go(life,{type:'attack',uid:attacker.uid});
 life=dispatchUniversalAction(stgPacks,life,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(life.pending.kind,'life-trigger');
 const color=legalUniversalActions(stgPacks,life).filter(a=>a.mode==='color');
 assert.equal(color.some(a=>a.uid===expensive.uid),false);
 const chosen=color.find(a=>a.uid===cheap.uid&&a.line==='front');
 assert.ok(chosen);
 life=dispatchUniversalAction(stgPacks,life,chosen,{actor:1});
 const entered=life.players[1].front.find(c=>c?.uid===cheap.uid);
 assert.equal(entered?.ready,true);
 assert.equal(assertUniversalMatch(stgPacks,life),true);
});

test('STG-1-035 rests one active front Kurisu and draws 3 only then',()=>{
 let quiet=toPhase(stgPacks,fresh(deckWith(['STG-1-035']),9035),'main');
 put(quiet,0,'STG-1-001','energy',0);
 put(quiet,0,'STG-1-007','energy',1);
 put(quiet,0,'STG-1-001','energy',2);
 const okabe=put(quiet,0,'STG-1-007','front',0,true);
 const event=take(quiet,0,'STG-1-035');
 quiet.players[0].hand.push(event);
 readyAp(quiet);
 const deck=quiet.players[0].deck.length;
 quiet=go(quiet,{type:'event',uid:event.uid});
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].deck.length,deck);
 assert.equal(okabe.ready,true);

 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-035']),9036),'main');
 put(s,0,'STG-1-001','energy',0);
 put(s,0,'STG-1-007','energy',1);
 put(s,0,'STG-1-001','energy',2);
 const kurisu=put(s,0,'STG-1-024','front',0,true);
 const other=put(s,0,'STG-1-007','front',1,true);
 const played=take(s,0,'STG-1-035');
 s.players[0].hand.push(played);
 readyAp(s);
 const before=s.players[0].deck.length;
 s=go(s,{type:'event',uid:played.uid});
 assert.equal(s.pending.kind,'effect-rest-own');
 assert.equal(s.pending.optional,false);
 const legal=legalUniversalActions(stgPacks,s);
 assert.equal(legal.some(a=>a.uid===null),false);
 assert.equal(legal.some(a=>a.uid===other.uid),false);
 assert.deepEqual(legal.map(a=>a.uid),[kurisu.uid]);
 assert.throws(()=>go(s,{type:'chooseOwnFrontRest',uid:null}),/not currently legal/);
 s=go(s,{type:'chooseOwnFrontRest',uid:kurisu.uid});
 assert.equal(s.players[0].front.find(c=>c?.uid===kurisu.uid).ready,false);
 assert.equal(s.players[0].front.find(c=>c?.uid===other.uid).ready,true);
 assert.equal(s.players[0].deck.length,before-3);
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-043 may draw and discard on attack only after an event was used',()=>{
 let quiet=toPhase(stgPacks,fresh(deckWith(['STG-1-043']),9043),'attack');
 const attacker=put(quiet,0,'STG-1-043','front',0,true);
 quiet=go(quiet,{type:'attack',uid:attacker.uid});
 assert.equal(quiet.pending.kind,'block');

 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-043']),9044),'main');
 const suzuha=put(s,0,'STG-1-043','front',0,true);
 const event=take(s,0,'STG-1-032');
 s.players[0].hand.push(event);
 readyAp(s);
 s=go(s,{type:'event',uid:event.uid});
 assert.equal(s.pending,null);
 s=toPhase(stgPacks,s,'attack');
 const before=s.players[0].deck.length;
 s=go(s,{type:'attack',uid:suzuha.uid});
 assert.equal(s.pending.kind,'effect-may-draw-discard');
 const skipped=go(s,{type:'chooseMayDrawDiscard',mode:'skip'});
 assert.equal(skipped.players[0].deck.length,before);
 assert.equal(skipped.pending.kind,'block');
 s=go(s,{type:'chooseMayDrawDiscard',mode:'draw'});
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].deck.length,before-1);
 const spare=s.players[0].hand.find(c=>c.uid!==event.uid);
 s=go(s,{type:'chooseDiscard',uid:spare.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===spare.uid));
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('STG-1-048 activates once from either line only after an event, until the next own turn',()=>{
 let blocked=toPhase(stgPacks,fresh(deckWith(['STG-1-048']),9048),'main');
 const waiting=put(blocked,0,'STG-1-048','front',0,true);
 readyAp(blocked);
 assert.equal(legalUniversalActions(stgPacks,blocked).some(a=>a.type==='activate'&&a.uid===waiting.uid),false);

 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-048']),9049),'main');
 put(s,0,'STG-1-057','energy',0);
 const held=take(s,0,'STG-1-048');
 s.players[0].hand.push(held);
 readyAp(s);
 s=playMain(stgPacks,s,held.uid);
 const frontUid=s.players[0].front.find(c=>c?.cardId==='STG-1-048').uid;
 const event=take(s,0,'STG-1-032');
 s.players[0].hand.push(event);
 s=go(s,{type:'event',uid:event.uid});
 const turns=s.players[0].ownTurns;
 const beforeReady=s.players[0].front.find(c=>c?.uid===frontUid).ready;
 s=go(s,legalUniversalActions(stgPacks,s).find(a=>a.type==='activate'&&a.uid===frontUid&&a.mode==='frontOnce'));
 const front=s.players[0].front.find(c=>c?.uid===frontUid);
 assert.deepEqual(front.buffs,[{bp:1000,untilOwnTurnStart:turns+1}]);
 assert.equal(front.ready,beforeReady);
 assert.equal(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===frontUid),false);

 let energy=toPhase(stgPacks,fresh(deckWith(['STG-1-048']),9050),'main');
 put(energy,0,'STG-1-057','energy',0);
 const lined=take(energy,0,'STG-1-048');
 energy.players[0].hand.push(lined);
 readyAp(energy);
 energy=playLine(energy,lined.uid,'energy');
 const lineUid=energy.players[0].energy.find(c=>c?.cardId==='STG-1-048').uid;
 const used=take(energy,0,'STG-1-032');
 energy.players[0].hand.push(used);
 energy=go(energy,{type:'event',uid:used.uid});
 assert.ok(legalUniversalActions(stgPacks,energy).some(a=>a.type==='activate'&&a.uid===lineUid&&a.mode==='frontOnce'));
 assert.equal(assertUniversalMatch(stgPacks,energy),true);
});

test('STG-1-054 recovers IBN5100 only after a hand card is put outside',()=>{
 let declined=toPhase(stgPacks,fresh(deckWith(['STG-1-054']),9054),'main');
 put(declined,0,'STG-1-053','energy',0);
 put(declined,0,'STG-1-053','energy',1);
 put(declined,0,'STG-1-057','energy',2);
 const moe=take(declined,0,'STG-1-054');
 declined.players[0].hand.push(moe);
 readyAp(declined);
 const hand=declined.players[0].hand.length;
 declined=playMain(stgPacks,declined,moe.uid);
 assert.equal(declined.pending.kind,'effect-discard-gate');
 declined=go(declined,{type:'chooseDiscardGate',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(declined.players[0].hand.length,hand-1);

 const ibn={id:'IBN',name:'IBN5100',color:'green',type:'field',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-054'),ibn],9055);
 let s=toPhase(lab.packs,lab.s,'main');
 for(let i=0;i<3;i++){
  const gen=pull(s,0,'F'+i);
  gen.ready=true;
  s.players[0].energy[i]=gen;
 }
 const source=pull(s,0,'STG-1-054');
 s.players[0].hand.push(source);
 const target=pull(s,0,'IBN');
 s.players[0].outside.push(target);
 readyAp(s);
 s=dispatchUniversalAction(lab.packs,s,legalUniversalActions(lab.packs,s)
  .find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'),{actor:0});
 const payment=s.players[0].hand.find(c=>c.uid!==source.uid);
 s=dispatchUniversalAction(lab.packs,s,{type:'chooseDiscardGate',uid:payment.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-recover-outside');
 s=dispatchUniversalAction(lab.packs,s,{type:'chooseOutsideRecovery',uid:target.uid},{actor:0});
 assert.ok(s.players[0].hand.some(c=>c.uid===target.uid));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(lab.packs,s),true);
});

test('STG-1-072 adds a D-Mail when one is outside, then buffs on the controller turn',()=>{
 const start=fresh();
 assert.equal(matchesV2LiveCondition(start,0,null,{kind:'controllerTurn',turn:'own'},()=>({})),true);
 assert.equal(matchesV2LiveCondition(start,1,null,{kind:'controllerTurn',turn:'own'},()=>({})),false);

 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-072']),9072),'main');
 put(s,0,'STG-1-053','energy',0);
 put(s,0,'STG-1-053','energy',1);
 put(s,0,'STG-1-057','energy',2);
 const mayuri=put(s,0,'STG-1-057','front',0);
 const field=take(s,0,'STG-1-072');
 s.players[0].hand.push(field);
 readyAp(s);
 s=playLine(s,field.uid,'energy');
 assert.equal(s.pending.kind,'effect-buff-own');
 s=go(s,{type:'chooseOwnBuff',uid:mayuri.uid});
 assert.deepEqual(s.players[0].front.find(c=>c?.uid===mayuri.uid).buffs,[{bp:1000,untilTurn:s.turn}]);

 const mail={id:'MAIL',name:'Dメール',color:'green',type:'event',energy:0,ap:1,bp:0,gen:0,
  implementation:'vanilla',effects:{}};
 const lab=labMatch([replay('STG-1-072'),mail],9075);
 let t=toPhase(lab.packs,lab.s,'main');
 for(let i=0;i<3;i++){
  const gen=pull(t,0,'F'+i);
  gen.ready=true;t.players[0].energy[i]=gen;
 }
 const source=pull(t,0,'STG-1-072');
 t.players[0].hand.push(source);
 const dmail=pull(t,0,'MAIL');
 t.players[0].outside.push(dmail);
 const ally=t.players[0].energy[0];
 readyAp(t);
 t=dispatchUniversalAction(lab.packs,t,legalUniversalActions(lab.packs,t)
  .find(a=>a.type==='play'&&a.uid===source.uid),{actor:0});
 assert.equal(t.pending.kind,'effect-recover-outside');
 t=dispatchUniversalAction(lab.packs,t,{type:'chooseOutsideRecovery',uid:dmail.uid},{actor:0});
 assert.ok(t.players[0].hand.some(c=>c.uid===dmail.uid));
 assert.equal(t.pending.kind,'effect-buff-own');
 t=dispatchUniversalAction(lab.packs,t,{type:'chooseOwnBuff',uid:ally.uid},{actor:0});
 assert.deepEqual(t.players[0].energy.find(c=>c?.uid===ally.uid).buffs,[{bp:1000,untilTurn:t.turn}]);
 assert.equal(assertUniversalMatch(lab.packs,t),true);
});

test('STG-1-044 discounts an empty field by two green and buffs at attack start only while the front has room',()=>{
 let open=toPhase(stgPacks,fresh(deckWith(['STG-1-044']),9044),'main');
 const cheap=take(open,0,'STG-1-044');
 open.players[0].hand.push(cheap);
 readyAp(open);
 assert.ok(legalUniversalActions(stgPacks,open).some(a=>a.type==='play'&&a.uid===cheap.uid&&a.line==='front'));
 open=playMain(stgPacks,open,cheap.uid);
 open=toPhase(stgPacks,open,'attack');
 assert.deepEqual(open.players[0].front.find(c=>c?.cardId==='STG-1-044').buffs,
  [{bp:1000,untilTurn:open.turn}]);

 let full=toPhase(stgPacks,fresh(deckWith(['STG-1-044']),9045),'main');
 const packed=put(full,0,'STG-1-044','front',0,true);
 put(full,0,'STG-1-057','front',1,true);
 put(full,0,'STG-1-053','front',2,true);
 put(full,0,'STG-1-057','front',3,true);
 full=toPhase(stgPacks,full,'attack');
 assert.deepEqual(full.players[0].front.find(c=>c?.uid===packed.uid).buffs,[]);

 let occupied=toPhase(stgPacks,fresh(deckWith(['STG-1-044']),9046),'main');
 put(occupied,0,'STG-1-057','energy',0);
 const priced=take(occupied,0,'STG-1-044');
 occupied.players[0].hand.push(priced);
 readyAp(occupied);
 assert.equal(legalUniversalActions(stgPacks,occupied).some(a=>a.type==='play'&&a.uid===priced.uid),false);
 assert.equal(assertUniversalMatch(stgPacks,occupied),true);
});
