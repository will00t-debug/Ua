import test from 'node:test';
import assert from 'node:assert/strict';
import {IMC_AP_CARDS} from '../dist/imc/cards-ap.mjs';
import {IMC_CARDS_STARTER} from '../dist/imc/cards-starter.mjs';
import {imcCatalog} from '../dist/imc/catalog.mjs';
import {IMC_PROMO_IDS,IMC_STARTER,IMC_STARTER_DECK_IDS} from '../dist/imc/product.mjs';
import {loadImcOfficialStarter} from '../dist/imc/starter-deck.mjs';
import {IMC_REPRINT_CHECKS,IMC_STARTER_PRINTINGS} from '../dist/imc/starter-printings.mjs';
import {createImcV2Pack,imcBattleCard,imcProgramFor} from '../dist/universal-v2/imc-pack.mjs';
import {assertImcSharedRequest,imcSharedRequests} from '../dist/universal-v2/imc-runtime.mjs';
import {IMC_PROGRAMS_STARTER} from '../dist/universal-v2/imc/programs-starter.mjs';
import {IMC_REQUESTS_STARTER} from '../dist/universal-v2/imc/requests-starter.mjs';
import {runImcStarter} from '../dist/universal-v2/imc/runtime-starter.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 newUniversalMatch,universalBp,universalImpact,universalImpactNull,
 universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const catalog=imcCatalog();
const STARTER_IDS=IMC_CARDS_STARTER.map(card=>card.id);
const READY=['IMC-1-105','IMC-1-109'];
const OPEN=STARTER_IDS.filter(id=>!READY.includes(id));

function face(id,extra={}){
 return {
  id,name:extra.name||id,color:'red',type:extra.type||'character',
  energy:extra.energy??1,ap:1,bp:extra.bp??2000,gen:extra.gen??1,
  trigger:extra.trigger===undefined?null:extra.trigger,
  traits:extra.traits||[],
  ...(extra.traitComponents?{traitComponents:extra.traitComponents}:{}),
  implementation:extra.implementation||'vanilla',
  effects:extra.effects||{},
  ...(extra.raidName?{raidName:extra.raidName}:{}),
  ...(extra.impactNull?{impactNull:true}:{}),
  ...(extra.printedImpact?{printedImpact:1}:{})
 };
}
const ngTraits=['new generations／お願い！シンデレラ'];
const ngParts=['new generations','お願い！シンデレラ'];
function filler(id,extra){return face(id,extra);}

function deckFor(pack,required){
 const fillers=Object.keys(pack.cards).filter(id=>!required.includes(id)&&
  !['special','color','final'].includes(pack.cards[id].trigger));
 const ids=[...required];
 for(const id of fillers){
  if(ids.length>=13)break;
  if(!ids.includes(id))ids.push(id);
 }
 assert.equal(ids.length,13,ids.join(','));
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const pile=s.players[p][zone];
  const index=pile.findIndex(c=>c.cardId===id);
  if(index>=0)return pile.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,slot,ready=true){
 const card=take(s,p,id);
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function setTop(s,p,ids){
 const cards=ids.map(id=>take(s,p,id));
 s.players[p].deck.unshift(...cards);
 return cards;
}
function toPhase(packs,s,phase){
 let guard=0;
 while(s.phase!==phase){
  if(s.pending)throw Error('Pending '+s.pending.kind+' blocked '+phase);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  if(++guard>8)throw Error('Did not reach '+phase+' (now '+s.phase+')');
 }
 return s;
}
function readyAp(s,p=0,n=3){
 for(let i=0;i<s.players[p].apCards.length;i++){
  s.players[p].apCards[i].inPlay=i<n;
  s.players[p].apCards[i].ready=i<n;
 }
}
function play(packs,s,uid,type='play',line='front'){
 const action=legalUniversalActions(packs,s).find(a=>a.type===type&&a.uid===uid&&
  (type!=='play'||a.line===line)&&a.replaceUid===undefined);
 if(!action)throw Error('No '+type+' for '+uid);
 return dispatchUniversalAction(packs,s,action);
}
function order(packs,s,uids){
 for(const uid of uids){
  assert.equal(s.pending?.kind,'effect-top-order');
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid});
 }
 return s;
}
function match(pack,required,seed){
 const counts=deckFor(pack,required);
 const packs=[pack,pack];
 return {packs,counts,s:newUniversalMatch(packs,{decks:[counts,counts],seed,first:0})};
}

const battle105=imcBattleCard(catalog.byId.get('IMC-1-105'),imcProgramFor('IMC-1-105'));
const battle109=imcBattleCard(catalog.byId.get('IMC-1-109'),imcProgramFor('IMC-1-109'));
const mainFillers=[
 filler('NG4',{name:'渋谷 凛',bp:4000,traits:ngTraits,traitComponents:ngParts}),
 filler('NG15',{name:'本田 未央',bp:1500,traits:ngTraits,traitComponents:ngParts}),
 filler('WISH',{name:'島村 卯月',bp:4000,traits:['お願い！シンデレラ']}),
 filler('TALL',{bp:3500}),
 filler('SHORT',{bp:1000}),
 filler('MID',{bp:2000}),
 filler('HUGE',{bp:5000}),
 filler('FIELD',{name:'特徵場域',type:'field',bp:0,traits:['new generations']}),
 filler('PLAIN',{bp:2500}),
 filler('WALL',{bp:3000}),
 filler('DRAW',{name:'抽牌角色',bp:2000,trigger:'draw'}),
 filler('ZERO',{bp:500}),
 filler('FUEL',{bp:1000})
];
const mainPack=createUniversalPack({id:'imc-d',version:'starter-ready',cards:[
 battle105,battle109,...mainFillers
]});

const probeCards=[
 face('PROBE-SELF',{name:'渋谷 凛',bp:4000,energy:1,traits:ngTraits,traitComponents:ngParts,
  implementation:'dsl',effects:{onPlay:[{op:'retireOppFrontUnderBp',mandatory:true,
   traitPerBp:{trait:'new generations',per:1000}}]}}),
 face('PROBE-RIN',{name:'渋谷 凛',bp:4000,energy:1,trigger:'raid',raidName:'渋谷 凛',
  implementation:'dsl',effects:{onPlay:[{op:'grantSelfImpactThisTurn',amount:1}]}}),
 face('PROBE-OPT',{name:'任意退場',type:'event',bp:0,gen:0,implementation:'dsl',
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:2000,optional:true}]}}),
 face('PROBE-NULL',{name:'衝擊無效',bp:2000,implementation:'dsl',impactNull:true}),
 face('PROBE-HIT',{name:'衝擊',bp:4000,implementation:'dsl',printedImpact:true}),
 filler('BASE',{name:'渋谷 凛',bp:4000}),
 filler('NG4',{name:'渋谷 凛',bp:4000,traits:ngTraits,traitComponents:ngParts}),
 filler('NG15',{name:'低BP',bp:1500,traits:ngTraits,traitComponents:ngParts}),
 filler('BP45',{bp:4500}),
 filler('BP55',{bp:5500}),
 filler('DRAW',{name:'抽牌角色',bp:2000,trigger:'draw'}),
 filler('FUEL',{bp:1000}),
 filler('LIFE',{bp:1000}),
 filler('F2',{bp:1000}),
 filler('MID',{bp:2000}),
 filler('TALL',{bp:3000}),
 filler('HUGE',{bp:5000})
];
const probePack=createUniversalPack({id:'imc-d-probe',version:'102-pieces',cards:probeCards});

test('starter printings, AP and the 50-card list stay official',()=>{
 assert.deepEqual(IMC_STARTER_PRINTINGS.map(row=>row.number),
  ['088','089','090','091','092','095','096','097','100'].map(n=>'UA55ST/IMC-1-'+n));
 assert.equal(IMC_REPRINT_CHECKS.every(row=>row.samePrintedText===true&&row.effectOwner==='c'),true);
 assert.equal(IMC_PROGRAMS_STARTER['IMC-1-088'],undefined);
 for(const row of IMC_REPRINT_CHECKS){
  const card=catalog.byId.get(row.id);
  assert.equal(card.set,'UA55BT');
  assert.equal(card.printings.some(printing=>printing.number==='UA55ST/'+row.id),true);
  assert.equal(card.battleReady,false);
 }
 assert.equal(IMC_AP_CARDS.length,13);
 assert.equal(IMC_AP_CARDS.every(card=>card.deckLegal===false&&card.type==='action-point'&&
  card.battleReady===false&&card.effect===''&&card.effectJa==='-'),true);
 const ap=IMC_AP_CARDS.find(card=>card.id==='IMC-1-AP01');
 assert.ok(ap.printings.some(printing=>printing.number==='UA55ST/IMC-1-AP01'&&printing.set==='UA55ST'));
 const starter=loadImcOfficialStarter();
 assert.equal(starter.ready,false);
 assert.equal(starter.counts,null);
 assert.equal(starter.deckCards,50);
 assert.equal(starter.countSearch.found,false);
 assert.equal(starter.countSearch.date,'2026-11-12');
 assert.equal(starter.kinds.length,18);
 assert.deepEqual(starter.kinds.map(card=>card.id),[...IMC_STARTER_DECK_IDS]);
 assert.equal(starter.reprints.length,9);
 assert.equal(starter.exclusive.length,9);
 assert.equal(starter.promo.some(card=>IMC_STARTER_DECK_IDS.includes(card.id)),false);
 assert.deepEqual(starter.promo.map(card=>card.id),[...IMC_PROMO_IDS]);
 assert.deepEqual(starter.ap,{id:'IMC-1-AP01',copies:3,set:'UA55ST',deckLegal:false});
 assert.equal(IMC_STARTER.apCopies,3);
 assert.equal(catalog.cards.every(card=>card.battleReady===false),true);
});

test('only 105 and 109 enter the battle pack',()=>{
 const pack=createImcV2Pack();
 assert.deepEqual(Object.keys(pack.cards),READY);
 assert.equal(pack.version,'imc-ua55-IMC-1-105.IMC-1-109');
 for(const id of OPEN)assert.equal(imcProgramFor(id),null,id);
 assert.equal(IMC_PROGRAMS_STARTER['IMC-1-105'].ready,true);
 assert.equal(IMC_PROGRAMS_STARTER['IMC-1-109'].ready,true);
 assert.deepEqual(IMC_REQUESTS_STARTER.map(row=>row.cardId),OPEN);
 for(const row of IMC_REQUESTS_STARTER)assertImcSharedRequest(row);
 assert.equal(imcSharedRequests().length,OPEN.length);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-102'}),/D 組還沒有/);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-105'}),/交給共用引擎/);
});

test('IMC-1-105 looks at three, adds one new generations, and can decline',()=>{
 const {packs,s}=match(mainPack,['IMC-1-105','NG4','WISH','PLAIN','FUEL'],1051);
 readyAp(s);
 put(s,0,'FUEL','energy',0);
 const window=setTop(s,0,['NG4','WISH','PLAIN']);
 const actor=take(s,0,'IMC-1-105');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 state=play(packs,state,actor.uid);
 assert.equal(state.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(state.pending.choices,[window[0].uid]);
 assert.deepEqual(state.pending.uids,window.map(card=>card.uid));
 const mine=universalPrivateChoices(packs,state,0);
 assert.deepEqual(mine.inspected.map(card=>card.uid),window.map(card=>card.uid));
 assert.equal(universalPrivateChoices(packs,state,1),null);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid),false);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseTopFiltered',uid:window[1].uid}),
  /not currently legal/);
 state=dispatchUniversalAction(packs,state,{type:'chooseTopFiltered',uid:window[0].uid});
 assert.equal(state.publicReveals.at(-1).kind,'searched-to-hand');
 assert.equal(state.publicReveals.at(-1).uid,window[0].uid);
 assert.equal(state.publicReveals.some(row=>row.uid===window[1].uid||row.uid===window[2].uid),false);
 state=order(packs,state,[window[2].uid,window[1].uid]);
 assert.equal(state.pending.kind,'effect-discard');
 const dumped=state.players[0].hand.find(card=>card.uid!==window[0].uid);
 state=dispatchUniversalAction(packs,state,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(state.players[0].hand.some(card=>card.uid===window[0].uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===dumped.uid),true);
 assert.deepEqual(state.players[0].deck.slice(-2).map(card=>card.uid),[window[2].uid,window[1].uid]);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const declined=match(mainPack,['IMC-1-105','NG4','WISH','PLAIN','FUEL'],1052);
 readyAp(declined.s);
 put(declined.s,0,'FUEL','energy',0);
 const skipped=setTop(declined.s,0,['NG4','WISH','PLAIN']);
 const second=take(declined.s,0,'IMC-1-105');
 declined.s.players[0].hand.push(second);
 let quiet=toPhase(declined.packs,declined.s,'main');
 const hand=quiet.players[0].hand.length;
 quiet=play(declined.packs,quiet,second.uid);
 quiet=dispatchUniversalAction(declined.packs,quiet,{type:'chooseTopFiltered',uid:null});
 quiet=order(declined.packs,quiet,skipped.map(card=>card.uid));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].hand.length,hand-1);
 assert.equal(skipped.every(card=>quiet.players[0].deck.some(item=>item.uid===card.uid)),true);
 assert.equal(quiet.publicReveals.some(row=>row.kind==='searched-to-hand'),false);

 const miss=match(mainPack,['IMC-1-105','WISH','PLAIN','TALL','FUEL'],1053);
 readyAp(miss.s);
 put(miss.s,0,'FUEL','energy',0);
 const blank=setTop(miss.s,0,['WISH','PLAIN','TALL']);
 const third=take(miss.s,0,'IMC-1-105');
 miss.s.players[0].hand.push(third);
 let none=toPhase(miss.packs,miss.s,'main');
 none=play(miss.packs,none,third.uid);
 assert.equal(none.pending.kind,'effect-top-order');
 none=order(miss.packs,none,blank.map(card=>card.uid));
 assert.equal(none.pending,null);
 assert.equal(blank.every(card=>none.players[0].hand.some(item=>item.uid===card.uid)),false);
 assertUniversalMatch(miss.packs,none);
});

test('IMC-1-109 retires by current BP and its special trigger is separate',()=>{
 const blocked=match(mainPack,['IMC-1-109','PLAIN','SHORT'],1090);
 readyAp(blocked.s);
 for(let i=0;i<4;i++)put(blocked.s,0,'PLAIN','energy',i);
 put(blocked.s,1,'SHORT','front',0);
 const early=take(blocked.s,0,'IMC-1-109');
 blocked.s.players[0].hand.push(early);
 let denied=toPhase(blocked.packs,blocked.s,'main');
 assert.equal(legalUniversalActions(blocked.packs,denied).some(a=>a.type==='event'&&a.uid===early.uid),false);

 const wish=match(mainPack,['IMC-1-109','WISH','PLAIN','SHORT'],1091);
 readyAp(wish.s);
 for(let i=0;i<3;i++)put(wish.s,0,'WISH','front',i);
 put(wish.s,0,'PLAIN','energy',0);
 put(wish.s,1,'SHORT','front',0);
 const wrongTrait=take(wish.s,0,'IMC-1-109');
 wish.s.players[0].hand.push(wrongTrait);
 let ignored=toPhase(wish.packs,wish.s,'main');
 assert.equal(legalUniversalActions(wish.packs,ignored).some(a=>a.uid===wrongTrait.uid&&a.type==='event'),false);

 const {packs,s}=match(mainPack,['IMC-1-109','NG4','PLAIN','MID','TALL'],1092);
 readyAp(s);
 put(s,0,'NG4','front',0);
 put(s,0,'NG4','front',1);
 put(s,0,'PLAIN','energy',0);
 put(s,0,'PLAIN','energy',1);
 put(s,0,'PLAIN','energy',2);
 put(s,0,'PLAIN','energy',3);
 const legalVictim=put(s,1,'MID','front',0);
 const tall=put(s,1,'TALL','front',1);
 const lifeBefore=s.players[1].life.length;
 const event=take(s,0,'IMC-1-109');
 s.players[0].hand.push(event);
 let state=toPhase(packs,s,'main');
 state=play(packs,state,event.uid,'event');
 assert.equal(state.pending.kind,'effect-retire-bp');
 assert.equal(state.pending.limit,2000);
 assert.deepEqual(state.pending.choices,[legalVictim.uid]);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseRetireBp',uid:null}),/not currently legal/);
 state=dispatchUniversalAction(packs,state,{type:'chooseRetireBp',uid:legalVictim.uid});
 assert.equal(state.players[1].front.some(card=>card?.uid===legalVictim.uid),false);
 assert.equal(state.players[1].outside.filter(card=>card.uid===legalVictim.uid).length,1);
 assert.equal(state.players[1].front.some(card=>card?.uid===tall.uid),true);
 assert.equal(state.players[1].life.length,lifeBefore);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const live=match(mainPack,['IMC-1-109','NG4','PLAIN','HUGE','SHORT'],1093);
 readyAp(live.s);
 put(live.s,0,'NG4','front',0);
 put(live.s,0,'NG4','energy',0);
 put(live.s,0,'PLAIN','energy',1);
 put(live.s,0,'PLAIN','energy',2);
 put(live.s,0,'PLAIN','energy',3);
 const dropped=put(live.s,1,'HUGE','front',0);
 const raised=put(live.s,1,'SHORT','front',1);
 dropped.buffs=[{bp:-3000,untilTurn:live.s.turn}];
 raised.buffs=[{bp:2000,untilTurn:live.s.turn}];
 assert.equal(universalBp(live.packs,live.s,dropped),2000);
 assert.equal(universalBp(live.packs,live.s,raised),3000);
 const scaler=take(live.s,0,'IMC-1-109');
 live.s.players[0].hand.push(scaler);
 let judged=toPhase(live.packs,live.s,'main');
 judged=play(live.packs,judged,scaler.uid,'event');
 assert.deepEqual(judged.pending.choices,[dropped.uid]);
 judged=dispatchUniversalAction(live.packs,judged,{type:'chooseRetireBp',uid:dropped.uid});
 assert.equal(judged.players[1].outside.some(card=>card.uid===dropped.uid),true);
 assert.equal(judged.players[1].front.some(card=>card?.uid===raised.uid),true);

 const counted=match(mainPack,['IMC-1-109','NG4','FIELD','PLAIN','MID'],1094);
 readyAp(counted.s);
 put(counted.s,0,'NG4','front',0);
 put(counted.s,0,'FIELD','energy',0);
 put(counted.s,0,'PLAIN','energy',1);
 put(counted.s,0,'PLAIN','energy',2);
 put(counted.s,0,'PLAIN','energy',3);
 const fieldVictim=put(counted.s,1,'MID','front',0);
 const fieldEvent=take(counted.s,0,'IMC-1-109');
 counted.s.players[0].hand.push(fieldEvent);
 let fieldState=toPhase(counted.packs,counted.s,'main');
 fieldState=play(counted.packs,fieldState,fieldEvent.uid,'event');
 assert.equal(fieldState.pending.limit,2000);
 assert.deepEqual(fieldState.pending.choices,[fieldVictim.uid]);

 const trigger=match(mainPack,['IMC-1-109','HUGE','ZERO'],1095);
 const attacker=put(trigger.s,0,'HUGE','front',0,true);
 trigger.s.players[1].deck.push(...trigger.s.players[1].life.splice(0));
 const revealed=take(trigger.s,1,'IMC-1-109');
 trigger.s.players[1].life=[revealed];
 let damaged=toPhase(trigger.packs,trigger.s,'main');
 damaged=dispatchUniversalAction(trigger.packs,damaged,{type:'next'});
 assert.equal(damaged.phase,'attack');
 damaged=dispatchUniversalAction(trigger.packs,damaged,{type:'attack',uid:attacker.uid});
 if(damaged.pending?.kind==='block')
  damaged=dispatchUniversalAction(trigger.packs,damaged,{type:'chooseBlock',uid:null});
 assert.equal(damaged.pending?.kind,'life-trigger');
 assert.equal(damaged.pending.trigger,'special');
 assert.equal(legalUniversalActions(trigger.packs,damaged).some(a=>a.mode==='special'&&a.uid===attacker.uid),true);
 damaged=dispatchUniversalAction(trigger.packs,damaged,{type:'chooseTrigger',mode:'special',uid:attacker.uid});
 assert.equal(damaged.players[0].outside.some(card=>card.uid===attacker.uid),true);
 assert.equal(damaged.players[1].outside.some(card=>card.uid===revealed.uid),true);
 assert.notEqual(damaged.pending?.kind,'effect-retire-bp');
 assertUniversalMatch(trigger.packs,damaged);
});

test('IMC-1-102 cannot use traitPerBp, and retire is not a life trigger',()=>{
 const scaled={...probeCards.find(card=>card.id==='PROBE-RIN'),effects:{onPlay:[
  {op:'grantSelfImpactThisTurn',amount:1},
  {op:'retireOppFrontUnderBp',optional:true,printedBpTraitCount:{
   trait:'new generations',printedBp:4000,per:1000,excludeSelf:true
  }}
 ]}};
 assert.throws(()=>createUniversalPack({id:'bad-102',version:'scale',cards:[scaled]}),
  /unsupported printed BP retirement profile/);
 const request=IMC_REQUESTS_STARTER.find(row=>row.cardId==='IMC-1-102');
 assert.ok(request.existingOps.includes('retireOppFrontUnderBp'));
 assert.equal(createImcV2Pack().cards['IMC-1-102'],undefined);

 const {packs,s}=match(probePack,['PROBE-SELF','NG4','NG15','BP45','BP55','FUEL'],1021);
 readyAp(s);
 put(s,0,'NG4','front',0);
 put(s,0,'NG4','front',1);
 put(s,0,'NG4','front',2);
 put(s,0,'NG15','energy',0);
 const lowPrinted=s.players[0].energy[0];
 assert.equal(catalog.byId.get('IMC-1-102').bp,4000);
 const over=put(s,1,'BP45','front',0);
 const tooHigh=put(s,1,'BP55','front',1);
 const actor=take(s,0,'PROBE-SELF');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 state=play(packs,state,actor.uid);
 assert.equal(state.pending.kind,'effect-retire-bp');
 assert.equal(state.pending.limit,5000);
 assert.deepEqual(state.pending.choices,[over.uid]);
 assert.equal(universalBp(packs,state,lowPrinted),1500);
 const lives=state.players[1].life.length;
 state=dispatchUniversalAction(packs,state,{type:'chooseRetireBp',uid:over.uid});
 assert.equal(state.players[1].outside.filter(card=>card.uid===over.uid).length,1);
 assert.equal(state.players[1].front.some(card=>card?.uid===tooHigh.uid),true);
 assert.equal(state.players[1].life.length,lives);
 assert.equal(state.pending,null);

 const optional=match(probePack,['PROBE-OPT','FUEL','MID','TALL','HUGE','DRAW'],1022);
 readyAp(optional.s);
 put(optional.s,0,'FUEL','energy',0);
 const exact=put(optional.s,1,'MID','front',0);
 const above=put(optional.s,1,'TALL','front',1);
 const event=take(optional.s,0,'PROBE-OPT');
 optional.s.players[0].hand.push(event);
 let choice=toPhase(optional.packs,optional.s,'main');
 choice=play(optional.packs,choice,event.uid,'event');
 assert.deepEqual(choice.pending.choices,[exact.uid]);
 assert.equal(legalUniversalActions(optional.packs,choice).some(a=>a.uid===null),true);
 choice=dispatchUniversalAction(optional.packs,choice,{type:'chooseRetireBp',uid:null});
 assert.equal(choice.players[1].front.some(card=>card?.uid===exact.uid),true);
 assert.equal(choice.players[1].front.some(card=>card?.uid===above.uid),true);
 assert.equal(choice.pending,null);

 const current=match(probePack,['PROBE-OPT','FUEL','HUGE','DRAW','TALL'],1023);
 readyAp(current.s);
 put(current.s,0,'FUEL','energy',0);
 const debuffed=put(current.s,1,'HUGE','front',0);
 const triggered=put(current.s,1,'DRAW','front',1);
 const stayed=put(current.s,1,'TALL','front',2);
 debuffed.buffs=[{bp:-3500,untilTurn:current.s.turn}];
 assert.equal(universalBp(current.packs,current.s,debuffed),1500);
 assert.equal(universalBp(current.packs,current.s,stayed),3000);
 const again=take(current.s,0,'PROBE-OPT');
 current.s.players[0].hand.push(again);
 let picked=toPhase(current.packs,current.s,'main');
 const life=picked.players[1].life.length;
 picked=play(current.packs,picked,again.uid,'event');
 assert.deepEqual([...picked.pending.choices].sort(),[debuffed.uid,triggered.uid].sort());
 picked=dispatchUniversalAction(current.packs,picked,{type:'chooseRetireBp',uid:triggered.uid});
 assert.equal(picked.players[1].outside.some(card=>card.uid===triggered.uid),true);
 assert.equal(picked.players[1].front.some(card=>card?.uid===debuffed.uid),true);
 assert.equal(picked.players[1].front.some(card=>card?.uid===stayed.uid),true);
 assert.equal(picked.players[1].life.length,life);
 assert.notEqual(picked.pending?.kind,'life-trigger');

 const raid=match(probePack,['PROBE-RIN','BASE','FUEL'],1024);
 readyAp(raid.s);
 put(raid.s,0,'FUEL','energy',0);
 const base=put(raid.s,0,'BASE','front',0,false);
 const rin=take(raid.s,0,'PROBE-RIN');
 raid.s.players[0].hand.push(rin);
 let raided=toPhase(raid.packs,raid.s,'main');
 const raidAction=legalUniversalActions(raid.packs,raided).find(a=>a.type==='raid'&&a.uid===rin.uid&&a.baseUid===base.uid);
 assert.ok(raidAction);
 raided=dispatchUniversalAction(raid.packs,raided,raidAction);
 const top=raided.players[0].front.find(card=>card?.uid===rin.uid);
 assert.ok(top);
 assert.equal(top.ready,true);
 assert.equal(top.stack.some(card=>card.uid===base.uid),true);
 assert.equal(universalImpact(raid.packs,raided,top),1);
 assert.equal(raided.pending,null);

 const normal=match(probePack,['PROBE-RIN','FUEL'],1025);
 readyAp(normal.s);
 put(normal.s,0,'FUEL','energy',0);
 const played=take(normal.s,0,'PROBE-RIN');
 normal.s.players[0].hand.push(played);
 let entered=toPhase(normal.packs,normal.s,'main');
 entered=play(normal.packs,entered,played.uid);
 const body=entered.players[0].front.find(card=>card?.uid===played.uid);
 assert.ok(body);
 assert.equal(body.ready,false);
 assert.equal(universalImpact(normal.packs,entered,body),1);
 assert.equal(entered.pending,null);
 assertUniversalMatch(normal.packs,entered);
});

test('IMC-1-101 impact null stops battle impact, and the draw is not a trait count',()=>{
 assert.equal(IMC_PROGRAMS_STARTER['IMC-1-101'],undefined);
 const row=IMC_REQUESTS_STARTER.find(item=>item.cardId==='IMC-1-101');
 assert.ok(row.existingOps.includes('drawIfOwnTraitCount'));
 const {packs,s}=match(probePack,['PROBE-NULL','PROBE-HIT','LIFE','FUEL'],1011);
 const defender=put(s,1,'PROBE-NULL','front',0,true);
 const attacker=put(s,0,'PROBE-HIT','front',0,true);
 assert.equal(universalImpactNull(packs,s,defender),true);
 assert.equal(universalImpact(packs,s,attacker),1);
 s.players[1].deck.push(...s.players[1].life.splice(0));
 const first=take(s,1,'LIFE');
 const second=take(s,1,'FUEL');
 s.players[1].life=[first,second];
 let state=toPhase(packs,s,'main');
 state=dispatchUniversalAction(packs,state,{type:'next'});
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 if(state.pending?.kind==='block')
  state=dispatchUniversalAction(packs,state,{type:'chooseBlock',uid:defender.uid});
 assert.equal(state.players[1].front.some(card=>card?.uid===defender.uid),false);
 assert.equal(state.players[1].life.length,2);
 assertUniversalMatch(packs,state);

 const open=match(probePack,['PROBE-HIT','LIFE','FUEL','F2'],1012);
 const victim=put(open.s,1,'F2','front',0,true);
 const hitter=put(open.s,0,'PROBE-HIT','front',0,true);
 open.s.players[1].deck.push(...open.s.players[1].life.splice(0));
 open.s.players[1].life=[take(open.s,1,'LIFE'),take(open.s,1,'FUEL')];
 let broken=toPhase(open.packs,open.s,'main');
 broken=dispatchUniversalAction(open.packs,broken,{type:'next'});
 broken=dispatchUniversalAction(open.packs,broken,{type:'attack',uid:hitter.uid});
 if(broken.pending?.kind==='block')
  broken=dispatchUniversalAction(open.packs,broken,{type:'chooseBlock',uid:victim.uid});
 assert.equal(broken.players[1].front.some(card=>card?.uid===victim.uid),false);
 assert.equal(broken.players[1].life.length,1);
});

test('unfinished starter cards stay out and name the shared op they cannot reuse',()=>{
 const sentences={
  'IMC-1-103':['drawDiscard','印刷'],
  'IMC-1-104':['nextEligibleHandPlayApDiscount','渋谷 凛'],
  'IMC-1-106':['searchTopOneBottomDiscard','activeOwnTrait'],
  'IMC-1-107':['fieldRestRetireThen','deployOwnHandSpecial'],
  'IMC-1-108':['buffOwnCharactersAll','前線'],
  'IMC-1-110':['frontOnceProgram','4000'],
  'IMC-1-111':['payApDiscardOutsideRaid','突襲'],
  'IMC-1-112':['searchTopOneBottomDiscard','Q2258'],
  'IMC-1-113':['buffAnyCharacter','LiPPS']
 };
 for(const [id,needles] of Object.entries(sentences)){
  assert.equal(IMC_PROGRAMS_STARTER[id],undefined,id);
  const request=IMC_REQUESTS_STARTER.find(row=>row.cardId===id);
  assert.ok(request,id);
  for(const needle of needles)
   assert.equal(JSON.stringify(request).includes(needle),true,id+' '+needle);
  assert.equal(catalog.byId.get(id).battleReady,false,id);
 }
 assert.equal(catalog.byId.get('IMC-1-112').faq.some(row=>row.id==='Q2258'),true);
 assert.equal(catalog.byId.get('IMC-1-102').trigger,'raid');
 assert.match(catalog.byId.get('IMC-1-102').effectJa,/【登場時】このキャラはこのターン中、【インパクト（1）】/);
});
