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
 newUniversalMatch,universalBp,universalCardEnergy,universalEnergyByColor,universalImpact,universalImpactNull,
 universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

const catalog=imcCatalog();
const STARTER_IDS=IMC_CARDS_STARTER.map(card=>card.id);
const READY=['IMC-1-101','IMC-1-102','IMC-1-103','IMC-1-104','IMC-1-105','IMC-1-106','IMC-1-108','IMC-1-109','IMC-1-110','IMC-1-113'];
const OPEN=STARTER_IDS.filter(id=>!READY.includes(id));

function face(id,extra={}){
 return {
  id,name:extra.name||id,color:extra.color||'red',type:extra.type||'character',
  energy:extra.energy??1,ap:extra.ap??1,bp:extra.bp??2000,gen:extra.gen??1,
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
 function nextOwnMain(packs,s){
 const turn=s.turn;
 for(let i=0;i<20&&(s.turn===turn||s.active!==0||s.phase!=='main');i++){
  const legal=legalUniversalActions(packs,s);
  const step=s.pending
   ?legal.find(a=>a.uid==null||a.mode==='skip'||a.mode==='decline')
   :legal.find(a=>a.type==='next');
  if(!step)throw Error((s.pending?.kind||s.phase)+' active '+s.active);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(s.active,0);
 assert.equal(s.phase,'main');
 assert.notEqual(s.turn,turn);
 return s;
}
function opponentMain(packs,s){
 const turn=s.turn;
 for(let i=0;i<20&&(s.turn===turn||s.active!==1||s.phase!=='main');i++){
  const legal=legalUniversalActions(packs,s);
  const step=s.pending
   ?legal.find(a=>a.uid==null||a.mode==='skip'||a.mode==='decline')
   :legal.find(a=>a.type==='next');
  if(!step)throw Error((s.pending?.kind||s.phase)+' active '+s.active);
  s=dispatchUniversalAction(packs,s,step);
 }
 assert.equal(s.active,1);
 assert.equal(s.phase,'main');
 return s;
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
 filler('FUEL',{bp:1000,gen:5}),
 filler('YFUEL',{name:'黃能源',color:'yellow',bp:1000,gen:5}),
 filler('BFUEL',{name:'藍能源',color:'blue',bp:1000,gen:5}),
 filler('LIP',{name:'同伴',color:'blue',traits:['LiPPS'],bp:2000,gen:0}),
 filler('KANA',{name:'速水 奏',color:'blue',traits:['LiPPS'],bp:2000,gen:0}),
 filler('STAGE',{name:'舞台',type:'field',color:'blue',traits:['LiPPS'],bp:0,energy:0,gen:0}),
 filler('RAIDY',{name:'本田 未央',color:'yellow',traits:['ポジティブパッション'],raidName:'本田 未央',bp:3000}),
 filler('NORAID',{name:'無突襲',color:'yellow',traits:['ポジティブパッション'],bp:2000}),
 filler('BLUERAID',{name:'藍情熱',color:'blue',traits:['ポジティブパッション'],raidName:'藍情熱',bp:2000}),
 filler('YOTHER',{name:'黃別特徵',color:'yellow',traits:['LiPPS'],raidName:'黃別特徵',bp:2000}),
 filler('TWO',{name:'普通',ap:2,bp:2000}),
 filler('HIT',{name:'衝擊',bp:4000,implementation:'dsl',printedImpact:true}),
 filler('BASE',{name:'渋谷 凛',bp:4000})
];
const battle=(id)=>imcBattleCard(catalog.byId.get(id),imcProgramFor(id));
const mainPack=createUniversalPack({id:'imc-d',version:'starter-ready',cards:[
 ...READY.map(battle),...mainFillers
]});

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

test('finished starter cards enter the battle pack and unfinished cards stay out',()=>{
 const pack=createImcV2Pack();
 for(const id of READY){
  assert.equal(pack.cards[id].id,id);
  assert.equal(IMC_PROGRAMS_STARTER[id].ready,true);
  assert.equal(catalog.byId.get(id).battleReady,false);
 }
 for(const id of OPEN)assert.equal(pack.cards[id],undefined,id);
 assert.deepEqual(IMC_REQUESTS_STARTER.map(row=>row.cardId),OPEN);
 for(const row of IMC_REQUESTS_STARTER)assertImcSharedRequest(row);
 assert.deepEqual(imcSharedRequests().filter(row=>OPEN.includes(row.cardId)).map(row=>row.cardId),OPEN);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-104'}),/交給共用引擎/);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-110'}),/交給共用引擎/);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-107'}),/D 組還沒有/);
 assert.throws(()=>runImcStarter(null,null,{id:'IMC-1-102'}),/交給共用引擎/);
 assert.deepEqual(pack.cards['IMC-1-104'].handApDiscountWhileAllNames,{names:['渋谷 凛','本田 未央'],amount:1});
 assert.equal(pack.cards['IMC-1-104'].triggerEffect.bp,2500);
 assert.equal(pack.cards['IMC-1-110'].mainAbility.minSelfBp,4000);
 assert.deepEqual(pack.cards['IMC-1-110'].mainAbility.then[0].options.map(option=>option.id),['plus1000','plus2000']);
 assert.equal(pack.cards['IMC-1-101'].impactNull,true);
 assert.equal(pack.cards['IMC-1-102'].raidName,'渋谷 凛');
 assert.equal(pack.cards['IMC-1-106'].raidName,'本田 未央');
 assert.equal(pack.cards['IMC-1-106'].effects.onPlay[0].noHandDiscard,true);
 assert.equal(pack.cards['IMC-1-113'].passiveBonuses[0].condition.kind,'ownCardTraitCount');
 assert.equal(pack.cards['IMC-1-113'].passiveBonuses[0].condition.min,4);
 assert.equal(pack.cards['IMC-1-113'].effects.onPlay[0].excludeName,'速水 奏');
 assert.equal(pack.cards['IMC-1-111'],undefined);
 assert.notEqual(IMC_PROGRAMS_STARTER['IMC-1-111'].ready,true);
 assert.equal(IMC_PROGRAMS_STARTER['IMC-1-111'].effects.onAttack,undefined);
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

test('IMC-1-101 draws for three printed-BP 4000 allies and stops battle impact',()=>{
 const {packs,s}=match(mainPack,['IMC-1-101','NG4','NG15','WISH','FIELD','FUEL'],1011);
 readyAp(s);
 put(s,0,'NG4','front',0);
 put(s,0,'NG4','energy',0);
 put(s,0,'FUEL','energy',1);
 const actor=take(s,0,'IMC-1-101');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 const hand=state.players[0].hand.length;
 const deck=state.players[0].deck.length;
 state=play(packs,state,actor.uid);
 const body=state.players[0].front.find(card=>card?.uid===actor.uid);
 assert.ok(body);
 assert.equal(body.ready,false);
 assert.equal(universalImpactNull(packs,state,body),true);
 assert.equal(state.players[0].hand.length,hand);
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.pending,null);

 const short=match(mainPack,['IMC-1-101','NG4','NG15','WISH','FIELD','FUEL'],1012);
 readyAp(short.s);
 put(short.s,0,'NG4','front',0);
 const boosted=put(short.s,0,'NG15','front',1);
 boosted.buffs=[{bp:2500,untilTurn:short.s.turn}];
 put(short.s,0,'WISH','energy',0);
 put(short.s,0,'FIELD','energy',1);
 put(short.s,0,'FUEL','energy',2);
 const early=take(short.s,0,'IMC-1-101');
 short.s.players[0].hand.push(early);
 let quiet=toPhase(short.packs,short.s,'main');
 const before=quiet.players[0].deck.length;
 quiet=play(short.packs,quiet,early.uid);
 assert.equal(quiet.players[0].deck.length,before);
 assert.equal(quiet.pending,null);

 const battle=match(mainPack,['IMC-1-101','HIT','WALL','ZERO','FUEL'],1013);
 const defender=put(battle.s,1,'IMC-1-101','front',0,true);
 const attacker=put(battle.s,0,'HIT','front',0,true);
 assert.equal(universalImpact(battle.packs,battle.s,attacker),1);
 battle.s.players[1].deck.push(...battle.s.players[1].life.splice(0));
 battle.s.players[1].life=[take(battle.s,1,'ZERO'),take(battle.s,1,'FUEL')];
 let blocked=toPhase(battle.packs,battle.s,'main');
 blocked=dispatchUniversalAction(battle.packs,blocked,{type:'next'});
 blocked=dispatchUniversalAction(battle.packs,blocked,{type:'attack',uid:attacker.uid});
 if(blocked.pending?.kind==='block')
  blocked=dispatchUniversalAction(battle.packs,blocked,{type:'chooseBlock',uid:defender.uid});
 assert.equal(blocked.players[1].front.some(card=>card?.uid===defender.uid),false);
 assert.equal(blocked.players[1].life.length,2);

 const open=match(mainPack,['HIT','WALL','ZERO','FUEL'],1014);
 const victim=put(open.s,1,'WALL','front',0,true);
 const hitter=put(open.s,0,'HIT','front',0,true);
 open.s.players[1].deck.push(...open.s.players[1].life.splice(0));
 open.s.players[1].life=[take(open.s,1,'ZERO'),take(open.s,1,'FUEL')];
 let broken=toPhase(open.packs,open.s,'main');
 broken=dispatchUniversalAction(open.packs,broken,{type:'next'});
 broken=dispatchUniversalAction(open.packs,broken,{type:'attack',uid:hitter.uid});
 if(broken.pending?.kind==='block')
  broken=dispatchUniversalAction(open.packs,broken,{type:'chooseBlock',uid:victim.uid});
 assert.equal(broken.players[1].life.length,1);
});

test('IMC-1-102 retires by other printed-BP 4000 characters and gains impact on both entries',()=>{
 const {packs,s}=match(mainPack,['IMC-1-102','NG4','NG15','FIELD','FUEL','MID','TALL','HUGE','SHORT'],1021);
 readyAp(s);
 put(s,0,'NG4','front',0);
 put(s,0,'NG4','front',1);
 put(s,0,'NG4','front',2);
 put(s,0,'NG15','energy',0);
 put(s,0,'FIELD','energy',1);
 put(s,0,'FUEL','energy',2);
 const low=put(s,1,'SHORT','front',0);
 low.buffs=[{bp:3000,untilTurn:s.turn}];
 const legal=put(s,1,'HUGE','front',1);
 legal.buffs=[{bp:-3000,untilTurn:s.turn}];
 const above=put(s,1,'TALL','front',2);
 assert.equal(universalBp(packs,s,low),4000);
 assert.equal(universalBp(packs,s,legal),2000);
 const actor=take(s,0,'IMC-1-102');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 const lives=state.players[1].life.length;
 state=play(packs,state,actor.uid);
 const body=state.players[0].front.find(card=>card?.uid===actor.uid);
 assert.equal(body.ready,false);
 assert.equal(universalImpact(packs,state,body),1);
 assert.equal(state.pending.kind,'effect-retire-bp');
 assert.equal(state.pending.limit,3000);
 assert.deepEqual(state.pending.choices,[legal.uid]);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseRetireBp',uid:low.uid}),/not currently legal/);
 state=dispatchUniversalAction(packs,state,{type:'chooseRetireBp',uid:legal.uid});
 assert.equal(state.players[1].outside.filter(card=>card.uid===legal.uid).length,1);
 assert.equal(state.players[1].front.some(card=>card?.uid===above.uid),true);
 assert.equal(state.players[1].front.some(card=>card?.uid===low.uid),true);
 assert.equal(state.players[1].life.length,lives);
 assert.notEqual(state.pending?.kind,'life-trigger');

 const declined=match(mainPack,['IMC-1-102','NG4','FUEL','SHORT'],1022);
 readyAp(declined.s);
 put(declined.s,0,'NG4','front',0);
 put(declined.s,0,'FUEL','energy',0);
 const kept=put(declined.s,1,'SHORT','front',0);
 const passing=take(declined.s,0,'IMC-1-102');
 declined.s.players[0].hand.push(passing);
 let skip=toPhase(declined.packs,declined.s,'main');
 skip=play(declined.packs,skip,passing.uid);
 assert.equal(skip.pending.limit,1000);
 assert.deepEqual(skip.pending.choices,[kept.uid]);
 skip=dispatchUniversalAction(declined.packs,skip,{type:'chooseRetireBp',uid:null});
 assert.equal(skip.players[1].front.some(card=>card?.uid===kept.uid),true);
 assert.equal(skip.pending,null);

 const empty=match(mainPack,['IMC-1-102','NG15','FUEL','SHORT'],1023);
 readyAp(empty.s);
 put(empty.s,0,'NG15','front',0);
 put(empty.s,0,'FUEL','energy',0);
 const untouched=put(empty.s,1,'SHORT','front',0);
 const alone=take(empty.s,0,'IMC-1-102');
 empty.s.players[0].hand.push(alone);
 let none=toPhase(empty.packs,empty.s,'main');
 none=play(empty.packs,none,alone.uid);
 assert.equal(universalImpact(empty.packs,none,none.players[0].front.find(card=>card?.uid===alone.uid)),1);
 assert.equal(none.players[1].front.some(card=>card?.uid===untouched.uid),true);
 assert.equal(none.pending,null);

 const raid=match(mainPack,['IMC-1-102','NG4','FUEL','SHORT'],1024);
 readyAp(raid.s);
 put(raid.s,0,'NG4','front',1);
 put(raid.s,0,'FUEL','energy',0);
 const buriedTarget=put(raid.s,1,'SHORT','front',0);
 const base=put(raid.s,0,'NG4','front',0,false);
 const rin=take(raid.s,0,'IMC-1-102');
 raid.s.players[0].hand.push(rin);
 let raided=toPhase(raid.packs,raid.s,'main');
 const raidAction=legalUniversalActions(raid.packs,raided).find(a=>a.type==='raid'&&a.uid===rin.uid&&a.baseUid===base.uid);
 assert.ok(raidAction);
 raided=dispatchUniversalAction(raid.packs,raided,raidAction);
 const top=raided.players[0].front.find(card=>card?.uid===rin.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack.some(card=>card.uid===base.uid),true);
 assert.equal(universalImpact(raid.packs,raided,top),1);
 assert.equal(raided.pending.kind,'effect-retire-bp');
 assert.equal(raided.pending.limit,1000);
 assert.deepEqual(raided.pending.choices,[buriedTarget.uid]);
});

test('IMC-1-103 draws and discards only when three qualifying characters are on the front',()=>{
 const {packs,s}=match(mainPack,['IMC-1-103','NG4','NG15','FUEL','WALL'],1031);
 readyAp(s);
 const attacker=put(s,0,'IMC-1-103','front',0,true);
 put(s,0,'NG4','front',1);
 put(s,0,'NG4','front',2);
 put(s,0,'FUEL','energy',0);
 put(s,1,'WALL','front',0,true);
 let state=toPhase(packs,s,'main');
 const hand=state.players[0].hand.length;
 const deck=state.players[0].deck.length;
 state=dispatchUniversalAction(packs,state,{type:'next'});
 state=dispatchUniversalAction(packs,state,{type:'attack',uid:attacker.uid});
 assert.equal(state.pending.kind,'effect-discard');
 assert.equal(state.players[0].hand.length,hand+1);
 assert.equal(state.players[0].deck.length,deck-1);
 const dumped=state.players[0].hand.find(card=>card.cardId!=='IMC-1-103');
 state=dispatchUniversalAction(packs,state,{type:'chooseDiscard',uid:dumped.uid});
 assert.equal(state.players[0].outside.some(card=>card.uid===dumped.uid),true);
 assert.equal(state.players[0].hand.length,hand);
 assert.equal(state.pending?.kind,'block');

 const miss=match(mainPack,['IMC-1-103','NG4','NG15','FUEL','WALL'],1032);
 readyAp(miss.s);
 const quiet=put(miss.s,0,'IMC-1-103','front',0,true);
 put(miss.s,0,'NG4','front',1);
 const fake=put(miss.s,0,'NG15','front',2);
 fake.buffs=[{bp:2500,untilTurn:miss.s.turn}];
 put(miss.s,0,'NG4','energy',0);
 put(miss.s,0,'FUEL','energy',1);
 put(miss.s,1,'WALL','front',0,true);
 let denied=toPhase(miss.packs,miss.s,'main');
 const held=denied.players[0].hand.length;
 denied=dispatchUniversalAction(miss.packs,denied,{type:'next'});
 denied=dispatchUniversalAction(miss.packs,denied,{type:'attack',uid:quiet.uid});
 assert.equal(denied.pending?.kind,'block');
 assert.equal(denied.players[0].hand.length,held);
 assert.equal(denied.players[0].outside.some(card=>card.uid===quiet.uid),false);
});

test('IMC-1-106 looks at three without a discard, then activates only at four printed 4000',()=>{
 const {packs,s}=match(mainPack,['IMC-1-106','NG4','WISH','PLAIN','FUEL'],1061);
 readyAp(s);
 put(s,0,'NG4','front',0);
 put(s,0,'NG4','front',1);
 const rested=put(s,0,'NG4','front',2,false);
 put(s,0,'FUEL','energy',0);
 const window=setTop(s,0,['NG4','WISH','PLAIN']);
 const actor=take(s,0,'IMC-1-106');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 const hand=state.players[0].hand.length;
 state=play(packs,state,actor.uid);
 const entered=state.players[0].front.find(card=>card?.uid===actor.uid);
 assert.equal(entered.ready,false);
 assert.equal(state.pending.kind,'effect-top-filter-choice');
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='chooseTopFiltered'&&a.uid===window[1].uid),false);
 state=dispatchUniversalAction(packs,state,{type:'chooseTopFiltered',uid:window[0].uid});
 assert.equal(state.publicReveals.at(-1).kind,'searched-to-hand');
 assert.notEqual(state.pending?.kind,'effect-discard');
 state=order(packs,state,[window[2].uid,window[1].uid]);
 assert.equal(state.pending.kind,'effect-active-own-trait');
 assert.equal(state.pending.choices.includes(rested.uid),true);
 assert.equal(state.pending.choices.includes(entered.uid),true);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.uid===null),true);
 state=dispatchUniversalAction(packs,state,{type:'chooseActiveOwnTrait',uid:rested.uid});
 assert.equal(state.players[0].front.find(card=>card?.uid===rested.uid).ready,true);
 assert.equal(state.players[0].front.find(card=>card?.uid===entered.uid).ready,false);
 assert.equal(state.players[0].hand.length,hand);
 assert.equal(state.players[0].hand.some(card=>card.uid===window[0].uid),true);
 assert.equal(state.pending,null);

 const few=match(mainPack,['IMC-1-106','NG4','WISH','PLAIN','FUEL'],1062);
 readyAp(few.s);
 put(few.s,0,'NG4','front',0);
 put(few.s,0,'NG4','front',1);
 put(few.s,0,'FUEL','energy',0);
 const blank=setTop(few.s,0,['WISH','PLAIN','WISH']);
 const second=take(few.s,0,'IMC-1-106');
 few.s.players[0].hand.push(second);
 let quiet=toPhase(few.packs,few.s,'main');
 const outside=quiet.players[0].outside.length;
 quiet=play(few.packs,quiet,second.uid);
 assert.equal(quiet.pending.kind,'effect-top-order');
 quiet=order(few.packs,quiet,blank.map(card=>card.uid));
 assert.equal(quiet.pending,null);
 assert.equal(quiet.players[0].outside.length,outside);
 assert.equal(quiet.players[0].front.find(card=>card?.uid===second.uid).ready,false);

 const raid=match(mainPack,['IMC-1-106','NG15','WISH','PLAIN','FUEL'],1063);
 readyAp(raid.s);
 put(raid.s,0,'FUEL','energy',0);
 const base=put(raid.s,0,'NG15','front',0,false);
 const seen=setTop(raid.s,0,['WISH','PLAIN','WISH']);
 const mio=take(raid.s,0,'IMC-1-106');
 raid.s.players[0].hand.push(mio);
 let raided=toPhase(raid.packs,raid.s,'main');
 const action=legalUniversalActions(raid.packs,raided).find(a=>a.type==='raid'&&a.uid===mio.uid&&a.baseUid===base.uid);
 assert.ok(action);
 raided=dispatchUniversalAction(raid.packs,raided,action);
 const top=raided.players[0].front.find(card=>card?.uid===mio.uid);
 assert.equal(top.ready,true);
 assert.equal(top.stack.some(card=>card.uid===base.uid),true);
 assert.equal(raided.pending.kind,'effect-top-order');
 raided=order(raid.packs,raided,seen.map(card=>card.uid));
 assert.equal(raided.pending,null);
 assert.equal(raided.players[0].hand.some(card=>seen.some(item=>item.uid===card.uid)),false);
});

test('IMC-1-108 raises only front characters and then draws',()=>{
 const {packs,s}=match(mainPack,['IMC-1-108','NG4','PLAIN','WALL','FUEL'],1081);
 readyAp(s);
 const front=put(s,0,'NG4','front',0);
 const energy=put(s,0,'PLAIN','energy',0);
 put(s,0,'FUEL','energy',1);
 const foe=put(s,1,'WALL','front',0);
 const event=take(s,0,'IMC-1-108');
 s.players[0].hand.push(event);
 let state=toPhase(packs,s,'main');
 const deck=state.players[0].deck.length;
 state=play(packs,state,event.uid,'event');
 const liveFront=state.players[0].front.find(card=>card?.uid===front.uid);
 const liveEnergy=state.players[0].energy.find(card=>card?.uid===energy.uid);
 const liveFoe=state.players[1].front.find(card=>card?.uid===foe.uid);
 assert.equal(universalBp(packs,state,liveFront),5000);
 assert.equal(universalBp(packs,state,liveEnergy),2500);
 assert.equal(universalBp(packs,state,liveFoe),3000);
 assert.equal(state.players[0].deck.length,deck-1);
 assert.equal(state.players[0].outside.some(card=>card.uid===event.uid),true);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const bare=match(mainPack,['IMC-1-108','PLAIN','FUEL'],1082);
 readyAp(bare.s);
 const line=put(bare.s,0,'PLAIN','energy',0);
 put(bare.s,0,'FUEL','energy',1);
 const only=take(bare.s,0,'IMC-1-108');
 bare.s.players[0].hand.push(only);
 let drawn=toPhase(bare.packs,bare.s,'main');
 const pile=drawn.players[0].deck.length;
 drawn=play(bare.packs,drawn,only.uid,'event');
 assert.equal(universalBp(bare.packs,drawn,drawn.players[0].energy.find(card=>card?.uid===line.uid)),2500);
 assert.equal(drawn.players[0].deck.length,pile-1);
 assert.equal(drawn.pending,null);
});

test('IMC-1-104 reduces hand AP only while both printed names remain',()=>{
 const {packs,s}=match(mainPack,['IMC-1-104','NG4','NG15','FUEL','TWO','WISH'],1041);
 assert.equal(packs[0].cards.NG4.name,'渋谷 凛');
 assert.equal(packs[0].cards.NG15.name,'本田 未央');
 readyAp(s,0,1);
 const rin=put(s,0,'NG4','front',0);
 const mio=put(s,0,'NG15','energy',0);
 const fuel=put(s,0,'FUEL','energy',1);
 const actor=take(s,0,'IMC-1-104');
 const plain=take(s,0,'TWO');
 const wish=take(s,0,'WISH');
 s.players[0].hand.push(actor,plain,wish);
 let state=toPhase(packs,s,'main');
 const at=(owner,uid)=>{
  for(const zone of ['front','energy','hand','deck','outside']){
   const found=state.players[owner][zone].find(card=>card?.uid===uid);
   if(found)return found;
  }
  throw Error('Missing live card '+uid);
 };
 const plays=()=>legalUniversalActions(packs,state).filter(a=>a.type==='play').map(a=>a.uid);
 assert.equal(plays().includes(actor.uid),true);
 assert.equal(plays().includes(plain.uid),false);
 readyAp(state,0,0);
 assert.equal(plays().includes(actor.uid),false);
 assert.equal(plays().includes(wish.uid),false);
 readyAp(state,0,1);
 const mioCard=at(0,mio.uid);
 state.players[0].energy[0]=null;
 state.players[0].outside.push(mioCard);
 assert.equal(plays().includes(actor.uid),false);
 state.players[0].energy[0]=state.players[0].outside.pop();
 assert.equal(plays().includes(actor.uid),true);
 const borrow=(owner,id,zones)=>{
  for(const zone of zones){
   const pile=state.players[owner][zone];
   const index=pile.findIndex(card=>card?.cardId===id);
   if(index>=0)return {card:pile.splice(index,1)[0],zone,owner};
  }
  throw Error('Missing '+id+' for player '+owner);
 };
 const rinCard=at(0,rin.uid);
 state.players[0].front[0]=null;
 state.players[0].outside.push(rinCard);
 const foe=borrow(1,'NG4',['deck','life']);
 state.players[1].front[0]=foe.card;
 assert.equal(plays().includes(actor.uid),false);
 state.players[1].front[0]=null;
 state.players[foe.owner][foe.zone].push(foe.card);
 state.players[0].front[0]=state.players[0].outside.pop();
 assert.equal(plays().includes(actor.uid),true);
 const standIn=borrow(0,'WISH',['deck','life']);
 state.players[0].outside.push(state.players[0].front[0]);
 state.players[0].front[0]=standIn.card;
 assert.equal(packs[0].cards.WISH.name==='島村 卯月',true);
 assert.equal(plays().includes(actor.uid),false);
 state.players[0][standIn.zone].push(state.players[0].front[0]);
 state.players[0].front[0]=state.players[0].outside.pop();
 const fuelCard=at(0,fuel.uid);
 state.players[0].energy[1]=null;
 state.players[0].outside.push(fuelCard);
 readyAp(state,0,2);
 assert.equal(plays().includes(actor.uid),false);
 state.players[0].energy[1]=state.players[0].outside.pop();
 readyAp(state,0,1);
 state=play(packs,state,actor.uid);
 assert.equal(state.players[0].front.some(card=>card?.uid===actor.uid),true);
 assert.equal(state.players[0].apCards.filter(card=>card.ready).length,0);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);

 const color=match(mainPack,['IMC-1-104','HUGE','MID','TALL','SHORT'],1042);
 const attacker=put(color.s,0,'HUGE','front',0,true);
 const small=put(color.s,0,'MID','front',1);
 const tall=put(color.s,0,'TALL','front',2);
 color.s.players[1].deck.push(...color.s.players[1].life.splice(0));
 const revealed=take(color.s,1,'IMC-1-104');
 color.s.players[1].life=[revealed];
 let damaged=toPhase(color.packs,color.s,'main');
 damaged=dispatchUniversalAction(color.packs,damaged,{type:'next'});
 damaged=dispatchUniversalAction(color.packs,damaged,{type:'attack',uid:attacker.uid});
 if(damaged.pending?.kind==='block')
  damaged=dispatchUniversalAction(color.packs,damaged,{type:'chooseBlock',uid:null});
 assert.equal(damaged.pending.kind,'life-trigger');
 assert.equal(damaged.pending.trigger,'color');
 const colorTargets=legalUniversalActions(color.packs,damaged).filter(a=>a.mode==='colorRetire').map(a=>a.uid);
 assert.deepEqual(colorTargets,[small.uid]);
 assert.equal(legalUniversalActions(color.packs,damaged).some(a=>a.mode==='skip'),true);
 assert.throws(()=>dispatchUniversalAction(color.packs,damaged,{type:'chooseTrigger',mode:'colorRetire',uid:tall.uid}),/not currently legal/);
 damaged=dispatchUniversalAction(color.packs,damaged,{type:'chooseTrigger',mode:'colorRetire',uid:small.uid});
 assert.equal(damaged.players[0].front.some(card=>card?.uid===small.uid),false);
 assert.equal(damaged.players[0].front.some(card=>card?.uid===tall.uid),true);
 assert.equal(damaged.players[0].outside.filter(card=>card.uid===small.uid).length,1);

 const scaled=match(mainPack,['IMC-1-104','HUGE','SHORT'],1043);
 const dropped=put(scaled.s,0,'HUGE','front',0,true);
 const raised=put(scaled.s,0,'SHORT','front',1);
 dropped.buffs=[{bp:-3000,untilTurn:scaled.s.turn}];
 raised.buffs=[{bp:2000,untilTurn:scaled.s.turn}];
 assert.equal(universalBp(scaled.packs,scaled.s,dropped),2000);
 assert.equal(universalBp(scaled.packs,scaled.s,raised),3000);
 scaled.s.players[1].deck.push(...scaled.s.players[1].life.splice(0));
 const lifeCard=take(scaled.s,1,'IMC-1-104');
 scaled.s.players[1].life=[lifeCard];
 let judged=toPhase(scaled.packs,scaled.s,'main');
 judged=dispatchUniversalAction(scaled.packs,judged,{type:'next'});
 judged=dispatchUniversalAction(scaled.packs,judged,{type:'attack',uid:dropped.uid});
 if(judged.pending?.kind==='block')
  judged=dispatchUniversalAction(scaled.packs,judged,{type:'chooseBlock',uid:null});
 const liveTargets=legalUniversalActions(scaled.packs,judged).filter(a=>a.mode==='colorRetire').map(a=>a.uid);
 assert.deepEqual(liveTargets,[dropped.uid]);
 assertUniversalMatch(scaled.packs,judged);
});

test('IMC-1-110 activates one printed branch from the front once each turn',()=>{
 const {packs,s}=match(mainPack,['IMC-1-110','SHORT','WALL','PLAIN'],1101);
 const source=put(s,0,'IMC-1-110','energy',0,true);
 const low=put(s,0,'SHORT','front',1);
 const high=put(s,0,'WALL','front',2);
 source.buffs=[{bp:2000,untilTurn:s.turn}];
 let state=toPhase(packs,s,'main');
 let actor=state.players[0].energy.find(card=>card?.uid===source.uid);
 assert.equal(universalBp(packs,state,actor),5000);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.mode==='frontOnce'),false);
 state.players[0].energy[0]=null;
 state.players[0].front[0]=actor;
 actor.buffs=[{bp:500,untilTurn:state.turn}];
 assert.equal(universalBp(packs,state,actor),3500);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.mode==='frontOnce'),false);
 actor.buffs=[{bp:1000,untilTurn:state.turn}];
 assert.equal(universalBp(packs,state,actor),4000);
 state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(a=>a.mode==='frontOnce'&&a.uid===source.uid));
 assert.equal(state.pending.kind,'effect-choice-mode');
 assert.equal(state.pending.optional,false);
 assert.deepEqual(state.pending.options.map(option=>option.id),['plus1000','plus2000']);
 assert.deepEqual(state.pending.options.map(option=>option.label),[
  '選擇1張自己場上的角色卡，在這個回合中，BP+1000。',
  '選擇1張自己場上BP3000以上的角色卡，在這個回合中，BP+2000。'
 ]);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='chooseEffectMode'&&a.mode==='skip'),false);
 state=dispatchUniversalAction(packs,state,{type:'chooseEffectMode',mode:'plus1000'});
 assert.equal(state.pending.kind,'effect-buff-own');
 assert.equal(state.pending.bp,1000);
 assert.equal(state.pending.choices.includes(low.uid),true);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='chooseEffectMode'),false);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseEffectMode',mode:'plus2000'}),/not currently legal/);
 state=dispatchUniversalAction(packs,state,{type:'chooseOwnBuff',uid:low.uid});
 const afterLow=state.players[0].front.find(card=>card?.uid===low.uid);
 const afterHigh=state.players[0].front.find(card=>card?.uid===high.uid);
 const afterSource=state.players[0].front.find(card=>card?.uid===source.uid);
 assert.equal(universalBp(packs,state,afterLow),2000);
 assert.equal(universalBp(packs,state,afterHigh),3000);
 assert.equal(universalBp(packs,state,afterSource),4000);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.mode==='frontOnce'),false);
 assert.equal(state.pending,null);
 state=nextOwnMain(packs,state);
 const returned=state.players[0].front.find(card=>card?.uid===source.uid);
 const restedLow=state.players[0].front.find(card=>card?.uid===low.uid);
 assert.equal(universalBp(packs,state,returned),3000);
 assert.equal(universalBp(packs,state,restedLow),1000);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.mode==='frontOnce'),false);
 returned.buffs=[{bp:1000,untilTurn:state.turn}];
 assert.equal(universalBp(packs,state,returned),4000);
 state=dispatchUniversalAction(packs,state,legalUniversalActions(packs,state).find(a=>a.mode==='frontOnce'&&a.uid===returned.uid));
 state=dispatchUniversalAction(packs,state,{type:'chooseEffectMode',mode:'plus2000'});
 assert.equal(state.pending.bp,2000);
 const freshLow=state.players[0].front.find(card=>card?.uid===low.uid);
 assert.equal(state.pending.choices.includes(freshLow.uid),false);
 assert.equal(state.pending.choices.includes(high.uid),true);
 assert.equal(state.pending.choices.includes(returned.uid),true);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseOwnBuff',uid:freshLow.uid}),/not currently legal/);
 state=dispatchUniversalAction(packs,state,{type:'chooseOwnBuff',uid:high.uid});
 assert.equal(universalBp(packs,state,state.players[0].front.find(card=>card?.uid===high.uid)),5000);
 assert.equal(universalBp(packs,state,state.players[0].front.find(card=>card?.uid===freshLow.uid)),1000);
 assert.equal(universalBp(packs,state,state.players[0].front.find(card=>card?.uid===returned.uid)),4000);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.mode==='frontOnce'),false);
 assert.equal(state.pending,null);
 assertUniversalMatch(packs,state);
});

test('IMC-1-111 pays one AP before recovering one yellow raiding Positive Passion',()=>{
 const actorCard=imcBattleCard(catalog.byId.get('IMC-1-111'),{
  ...IMC_PROGRAMS_STARTER['IMC-1-111'],ready:true});
 const clause=createUniversalPack({id:'imc-111',version:'on-play',cards:[
  actorCard,...['RAIDY','NORAID','BLUERAID','YOTHER','YFUEL','FUEL','PLAIN','NG4','WISH','TALL','SHORT','MID'].map(id=>
   mainFillers.find(card=>card.id===id))]});
 const readyCount=state=>state.players[0].apCards.filter(card=>card.ready).length;
 const park=(s,id)=>{
  const card=take(s,0,id);
  s.players[0].outside.push(card);
  return card;
 };
 const {packs,s}=match(clause,['IMC-1-111','RAIDY','NORAID','BLUERAID','YOTHER','YFUEL'],1111);
 readyAp(s,0,2);
 put(s,0,'YFUEL','energy',0);
 const legal=park(s,'RAIDY');
 const plain=park(s,'NORAID');
 const blue=park(s,'BLUERAID');
 const other=park(s,'YOTHER');
 const actor=take(s,0,'IMC-1-111');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='play'&&a.uid===actor.uid),true);
 state=play(packs,state,actor.uid);
 assert.equal(state.pending.kind,'effect-optional-pay-ap');
 assert.equal(readyCount(state),1);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.mode==='skip'),true);
 const skipped=dispatchUniversalAction(packs,structuredClone(state),{type:'chooseOptionalPayAp',mode:'skip'});
 assert.equal(skipped.pending,null);
 assert.equal(readyCount(skipped),1);
 assert.equal(skipped.players[0].outside.some(card=>card.uid===legal.uid),true);
 state=dispatchUniversalAction(packs,state,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(readyCount(state),0);
 assert.equal(state.pending.kind,'effect-recover-outside');
 assert.deepEqual(state.pending.choices,[legal.uid]);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:plain.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:blue.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:other.uid}),/not currently legal/);
 state=dispatchUniversalAction(packs,state,{type:'chooseOutsideRecovery',uid:legal.uid});
 assert.equal(state.pending,null);
 assert.equal(state.players[0].hand.some(card=>card.uid===legal.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===plain.uid),true);
 assert.equal(state.players[0].outside.some(card=>card.uid===blue.uid),true);
 state=nextOwnMain(packs,state);
 assert.equal(state.players[0].hand.some(card=>card.uid===legal.uid),true);
 readyAp(state,0,2);
 const again=take(state,0,'IMC-1-111');
 state.players[0].hand.push(again);
 state=play(packs,state,again.uid,'play','energy');
 assert.equal(state.pending.kind,'effect-optional-pay-ap');
 assertUniversalMatch(packs,state);

 const short=match(clause,['IMC-1-111','RAIDY','YFUEL','FUEL'],1112);
 readyAp(short.s,0,1);
 put(short.s,0,'YFUEL','energy',0);
 const stayed=park(short.s,'RAIDY');
 const one=take(short.s,0,'IMC-1-111');
 short.s.players[0].hand.push(one);
 let unpaid=toPhase(short.packs,short.s,'main');
 unpaid=play(short.packs,unpaid,one.uid);
 assert.equal(unpaid.pending,null);
 assert.equal(readyCount(unpaid),0);
 assert.equal(unpaid.players[0].outside.some(card=>card.uid===stayed.uid),true);

 const broke=match(clause,['IMC-1-111','YFUEL','FUEL'],1113);
 readyAp(broke.s,0,0);
 put(broke.s,0,'YFUEL','energy',0);
 const brokeCard=take(broke.s,0,'IMC-1-111');
 broke.s.players[0].hand.push(brokeCard);
 let noAp=toPhase(broke.packs,broke.s,'main');
 assert.equal(legalUniversalActions(broke.packs,noAp).some(a=>a.type==='play'&&a.uid===brokeCard.uid),false);
 readyAp(noAp,0,2);
 const yellowFuel=noAp.players[0].energy[0];
 noAp.players[0].energy[0]=null;
 noAp.players[0].outside.push(yellowFuel);
 const red=take(noAp,0,'FUEL');
 red.ready=true;red.fieldEntryStamp=noAp.nextFieldEntryStamp++;
 noAp.players[0].energy[0]=red;
 assert.equal(legalUniversalActions(broke.packs,noAp).some(a=>a.type==='play'&&a.uid===brokeCard.uid),false);

 const empty=match(clause,['IMC-1-111','NORAID','BLUERAID','YOTHER','YFUEL'],1114);
 readyAp(empty.s,0,2);
 put(empty.s,0,'YFUEL','energy',0);
 park(empty.s,'NORAID');park(empty.s,'BLUERAID');park(empty.s,'YOTHER');
 const payer=take(empty.s,0,'IMC-1-111');
 empty.s.players[0].hand.push(payer);
 let none=toPhase(empty.packs,empty.s,'main');
 none=play(empty.packs,none,payer.uid);
 none=dispatchUniversalAction(empty.packs,none,{type:'chooseOptionalPayAp',mode:'pay'});
 assert.equal(none.pending,null);
 assert.equal(readyCount(none),0);
 assert.equal(none.players[0].hand.some(card=>card.cardId==='NORAID'),false);
 assertUniversalMatch(empty.packs,none);
});

test('IMC-1-113 buffs one legal character and adds blue energy at four LiPPS',()=>{
 const {packs,s}=match(mainPack,['IMC-1-113','LIP','KANA','PLAIN','BFUEL'],1131);
 readyAp(s);
 put(s,0,'BFUEL','energy',0);
 const ally=put(s,0,'LIP','energy',1);
 const named=put(s,0,'KANA','front',1);
 const plain=put(s,0,'PLAIN','front',2);
 const foe=put(s,1,'PLAIN','front',0);
 const foeNamed=put(s,1,'KANA','front',1);
 const foeEnergy=put(s,1,'LIP','energy',0);
 const ownEnergy=put(s,0,'PLAIN','energy',2);
 const actor=take(s,0,'IMC-1-113');
 s.players[0].hand.push(actor);
 let state=toPhase(packs,s,'main');
 state=play(packs,state,actor.uid);
 const self=state.players[0].front.find(card=>card?.uid===actor.uid);
 assert.equal(state.pending.kind,'effect-buff-any');
 assert.equal(state.pending.optional,true);
 assert.equal(state.pending.bp,500);
 assert.equal(state.pending.choices.includes(foe.uid),true);
 assert.equal(state.pending.choices.includes(foeNamed.uid),true);
 assert.equal(state.pending.choices.includes(ally.uid),true);
 assert.equal(state.pending.choices.includes(named.uid),false);
 assert.equal(state.pending.choices.includes(plain.uid),false);
 assert.equal(state.pending.choices.includes(foeEnergy.uid),false);
 assert.equal(state.pending.choices.includes(ownEnergy.uid),false);
 assert.equal(state.pending.choices.includes(self.uid),false);
 assert.equal(legalUniversalActions(packs,state).some(a=>a.type==='chooseAnyBuff'&&a.uid===null),true);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseAnyBuff',uid:foeEnergy.uid}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(packs,state,{type:'chooseAnyBuff',uid:named.uid}),/not currently legal/);
 const declined=dispatchUniversalAction(packs,structuredClone(state),{type:'chooseAnyBuff',uid:null});
 assert.equal(declined.pending,null);
 assert.equal(universalBp(packs,declined,declined.players[1].front.find(card=>card?.uid===foe.uid)),2500);
 state=dispatchUniversalAction(packs,state,{type:'chooseAnyBuff',uid:foe.uid});
 assert.equal(state.pending,null);
 assert.equal(universalBp(packs,state,state.players[1].front.find(card=>card?.uid===foe.uid)),3000);
 assert.equal(universalBp(packs,state,state.players[0].energy.find(card=>card?.uid===ally.uid)),2000);
 state=opponentMain(packs,state);
 assert.equal(universalBp(packs,state,state.players[1].front.find(card=>card?.uid===foe.uid)),2500);
 assertUniversalMatch(packs,state);

 const quiet=match(mainPack,['IMC-1-113','KANA','PLAIN','BFUEL'],1132);
 readyAp(quiet.s);
 put(quiet.s,0,'BFUEL','energy',0);
 put(quiet.s,0,'KANA','front',1);
 put(quiet.s,1,'PLAIN','energy',0);
 const lone=take(quiet.s,0,'IMC-1-113');
 quiet.s.players[0].hand.push(lone);
 let missed=toPhase(quiet.packs,quiet.s,'main');
 missed=play(quiet.packs,missed,lone.uid);
 assert.equal(missed.pending,null);

 const energy=match(mainPack,['IMC-1-113','LIP','STAGE','PLAIN'],1133);
 const host=put(energy.s,0,'IMC-1-113','energy',0,false);
 put(energy.s,0,'LIP','front',0);
 put(energy.s,0,'LIP','front',1);
 const stranger=put(energy.s,1,'LIP','front',0);
 let board=toPhase(energy.packs,energy.s,'main');
 const liveHost=()=>board.players[0].energy.find(card=>card?.uid===host.uid);
 assert.equal(universalCardEnergy(energy.packs,board,0,liveHost()),1);
 assert.equal(universalEnergyByColor(energy.packs,board,0).blue,1);
 const third=take(board,0,'LIP');
 third.ready=true;third.fieldEntryStamp=board.nextFieldEntryStamp++;
 board.players[0].front[2]=third;
 assert.equal(universalCardEnergy(energy.packs,board,0,liveHost()),2);
 assert.equal(universalEnergyByColor(energy.packs,board,0).blue,2);
 assert.equal(universalCardEnergy(energy.packs,board,1,board.players[1].front.find(card=>card?.uid===stranger.uid)),0);
 board.players[0].front[2]=null;
 board.players[0].outside.push(third);
 const stage=take(board,0,'STAGE');
 stage.ready=true;stage.fieldEntryStamp=board.nextFieldEntryStamp++;
 board.players[0].energy[1]=stage;
 assert.equal(universalCardEnergy(energy.packs,board,0,liveHost()),2);
 assert.equal(universalCardEnergy(energy.packs,board,0,stage),0);
 const parked=liveHost();
 board.players[0].energy[0]=null;
 board.players[0].front[3]=parked;
 assert.equal(universalCardEnergy(energy.packs,board,0,parked),0);
 board.players[0].front[3]=null;
 board.players[0].energy[0]=parked;
 board=opponentMain(energy.packs,board);
 assert.equal(universalCardEnergy(energy.packs,board,0,board.players[0].energy.find(card=>card?.uid===host.uid)),2);
 assertUniversalMatch(energy.packs,board);
});

test('unfinished starter cards stay out and name the shared op they cannot reuse',()=>{
 const sentences={
  'IMC-1-107':['fieldRestRetireThen','deployOwnHandSpecial'],
  'IMC-1-112':['searchTopOneBottomDiscard','Q2258']
 };
 const attack=IMC_REQUESTS_STARTER.find(row=>row.cardId==='IMC-1-111');
 assert.equal(JSON.stringify(attack).includes('drawDiscardIfFieldAny'),true);
 assert.equal(JSON.stringify(attack).includes('攻擊時'),true);
 assert.throws(()=>createUniversalPack({id:'imc-111-gap',version:'gap',cards:[{
  id:'GAP',name:'缺口',color:'yellow',type:'character',energy:1,ap:1,bp:2000,gen:1,
  trigger:null,traits:['ポジティブパッション'],implementation:'dsl',effects:{onAttack:[{
   op:'ifLiveThen',
   when:{kind:'ownYellowRaidTrait',turn:'any',min:1,zone:'field',excludeSelf:false,
    trait:'ポジティブパッション',color:'yellow'},
   then:[{op:'drawDiscard',count:1}]
  }]}
 }]}),/invalid passive condition/);
 for(const [id,needles] of Object.entries(sentences)){
  assert.equal(IMC_PROGRAMS_STARTER[id],undefined,id);
  assert.equal(IMC_PROGRAMS_STARTER[id]?.ready,undefined,id);
  const request=IMC_REQUESTS_STARTER.find(row=>row.cardId===id);
  assert.ok(request,id);
  for(const needle of needles)
   assert.equal(JSON.stringify(request).includes(needle),true,id+' '+needle);
  assert.equal(catalog.byId.get(id).battleReady,false,id);
 }
 assert.equal(loadImcOfficialStarter().ready,false);
 assert.equal(loadImcOfficialStarter().counts,null);
});

