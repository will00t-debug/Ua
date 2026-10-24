import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {uiActionLabel} from '../dist/universal-v2/preview-actions.mjs';

// Official page UA56BT/TTG-1-022 checked 2026-10-22. No FAQ block.
// このカードは〈ヨーコ〉としても扱う。
// 【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【緑】と「メインフェイズ終了時、このキャラを手札に戻す。」を得る。
// Trigger 【ドロー】カードを1枚引く。 Cost 【緑1】. Generated 【緑+】 is one green pip, gen 1.
// The gained end instruction returns the card to hand. It is not 退場.

const ID='TTG-1-022';
const printed='このカードは〈ヨーコ〉としても扱う。\n【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【緑】と「メインフェイズ終了時、このキャラを手札に戻す。」を得る。';
const ttg=registeredV2TitlePack('gurren-lagann');
const mst=registeredV2TitlePack('mushoku-tensei');
const ability={op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1,end:'hand'};
const vanilla=(id,name)=>({id,name,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:null,implementation:'vanilla',effects:{}});
const probe={...vanilla('LAB-RETURN','Probe'),implementation:'dsl',mainAbility:ability,
 effects:{onRetire:[{op:'draw',count:1}]}};
const lab=createUniversalPack({id:'return-hand-lab',cards:[
 probe,...Array.from({length:12},(_,i)=>vanilla('LAB-FILL-'+i,'Fill '+i))
]});

function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),50);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function occupy(s,p,id,line,slot){
 const card=take(s,p,id);
 card.ready=true;
 s.players[p][line][slot]=card;
 return card;
}
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toMain(packs,s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function activate(uid){return {type:'activate',uid,mode:'selfRestEnergyRetire'};}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,targetUid:uid,
  until:{player:0,phase:'attack',edge:'start'},sourceLinked:false});
}

test('TTG-1-022 keeps the alias, DRAW trigger, and hand-return energy profile',()=>{
 const origin=TTG_BY_ID[ID];
 assert.equal(origin.nameJa,'ヨマコ先生');
 assert.equal(origin.energy,1);
 assert.equal(origin.gen,1);
 assert.equal(origin.trigger,'draw');
 assert.deepEqual(origin.traits,['大グレン団']);
 assert.equal(origin.effect.includes('返回手牌'),true);
 assert.equal(printed.includes('手札に戻す'),true);
 const card=ttg.cards[ID];
 assert.equal(card.name,'ヨマコ先生');
 assert.deepEqual(card.nameAliases,['ヨーコ']);
 assert.equal(cardHasName(card,'ヨーコ',false),true);
 assert.equal(cardHasName(card,'ヨーコ',true),false);
 assert.equal(cardHasName(card,'ヨマコ先生',true),true);
 assert.deepEqual(card.mainAbility,ability);
 assert.equal(card.gen,1);
 assert.equal(card.activeExtraEnergy,0);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 const base={id:'QA-1',name:'QA',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  implementation:'dsl',effects:{}};
 const create=mainAbility=>createUniversalPack({id:'return-schema',cards:[{...base,mainAbility}]});
 assert.doesNotThrow(()=>create(ability));
 assert.throws(()=>create({...ability,end:'outside'}),/unsupported main action/);
 assert.throws(()=>create({op:'restSelfGainEnergyRetireEndMain',energyOnly:true,
  oncePerTurn:true,extraEnergy:1,end:'hand'}),/unsupported main action/);
});

test('energy activation adds green immediately and returns the same UID to hand',()=>{
 const counts=deck(ttg,[ID,'TTG-1-006','TTG-1-018','TTG-1-005','TTG-1-042']);
 const foreign=deck(mst,['MST-1-016']);
 const packs=[ttg,mst];
 let s=newUniversalMatch(packs,{decks:[counts,foreign],seed:2201,first:0});
 const source=occupy(s,0,ID,'energy',0);
 const payer=hold(s,0,'TTG-1-006');
 s=toMain(packs,s);
 assert.equal(universalEnergyByColor(packs,s,0).green,1);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid),false);
 const action=activate(source.uid);
 assert.match(uiActionLabel(action,{pack:ttg,state:s}),/主要階段結束回手/);
 const deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(packs,s,0).green,2);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid));
 assert.equal(s.delayedEffects[0].op,'moveAtMainEnd');
 assert.equal(s.delayedEffects[0].destination,'hand');
 s.players[0].energy[0].ready=true;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const handBefore=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const returned=s.players[0].hand.find(c=>c.uid===source.uid);
 assert.ok(returned);
 assert.equal(returned.cardId,ID);
 assert.deepEqual(returned.buffs,[]);
 assert.equal(returned.fieldEntryStamp,null);
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.players[0].outside.some(c=>c.uid===source.uid),false);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(s.players[0].hand.length,handBefore+1);
 assert.equal(universalEnergyByColor(packs,s,0).green||0,0);
 const hidden=universalPublicView(packs,s,1);
 assert.equal(hidden.players[0].hand,null);
 assert.equal(hidden.publicReveals.length,0);
 assert.equal(JSON.stringify(hidden).includes(source.uid),false);
 assert.ok(universalPublicView(packs,s,0).players[0].hand.some(c=>c.uid===source.uid&&c.cardId===ID));
 s.phase='main';
 const replay=s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===source.uid),1)[0];
 replay.ready=true;
 s.players[0].energy[0]=replay;
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-forged',mode:'selfRestEnergyRetire'}),
  /not currently legal/);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('front activation returns to hand without generating, and a real retire stays a retire',()=>{
 const counts=deck(ttg,[ID,'TTG-1-018','TTG-1-005']);
 const foreign=deck(mst,['MST-1-016']);
 const packs=[ttg,mst];
 let s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2202,first:0}));
 const source=occupy(s,0,ID,'front',0);
 assert.equal(universalEnergyByColor(packs,s,0).green||0,0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].front[0]),0);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.turnRetireEvents.length,0);
 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2203,first:0}));
 const retiring=occupy(s,0,'TTG-1-018','energy',0);
 const returning=occupy(s,0,ID,'energy',1);
 s=dispatchUniversalAction(packs,s,activate(retiring.uid));
 s=dispatchUniversalAction(packs,s,activate(returning.uid));
 assert.equal(universalEnergyByColor(packs,s,0).green,4);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].outside.some(c=>c.uid===retiring.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===returning.uid));
 assert.deepEqual(s.turnRetireEvents.map(e=>e.uid),[retiring.uid]);
 assert.equal(countCards(s.players[0]),50);
});

test('stamp, removal, burial, Raid layers, and silence keep the hand return on the right UID',()=>{
 const counts=deck(ttg,[ID,'TTG-1-005','TTG-1-042','TTG-1-018']);
 const foreign=deck(mst,['MST-1-016']);
 const packs=[ttg,mst];
 let s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2204,first:0}));
 let source=occupy(s,0,ID,'energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 s.players[0].energy[0].fieldEntryStamp=s.nextFieldEntryStamp++;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].energy[0].uid,source.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===source.uid),false);
 assert.equal(s.turnRetireEvents.length,0);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2205,first:0}));
 source=occupy(s,0,ID,'energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 s.players[0].energy[0]=null;
 s.players[0].removed.push(source);
 const handBefore=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].hand.length,handBefore);
 assert.ok(s.players[0].removed.some(c=>c.uid===source.uid));
 assert.equal(s.turnRetireEvents.length,0);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2206,first:0}));
 source=occupy(s,0,ID,'energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 const cover=take(s,0,'TTG-1-005');
 cover.stack=[source];
 cover.ready=true;
 cover.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=cover;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].energy[0].stack[0].uid,source.uid);
 assert.equal(s.players[0].hand.some(c=>c.uid===source.uid),false);
 assert.equal(s.turnRetireEvents.length,0);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2207,first:0}));
 source=occupy(s,0,ID,'front',0);
 const base=take(s,0,'TTG-1-005');
 const buried=take(s,0,'TTG-1-042');
 buried.faceDown=true;
 source.stack=[base];
 source.under=[buried];
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 s=dispatchUniversalAction(packs,s,{type:'next'});
 const top=s.players[0].hand.find(c=>c.uid===source.uid);
 assert.ok(top);
 assert.deepEqual(top.stack,[]);
 assert.deepEqual(top.under,[]);
 assert.equal(top.buffs.length,0);
 assert.ok(s.players[0].outside.some(c=>c.uid===base.uid&&c.faceDown===false));
 assert.ok(s.players[0].outside.some(c=>c.uid===buried.uid&&c.faceDown===false));
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2208,first:0}));
 source=occupy(s,0,ID,'energy',0);
 silence(s,source.uid);
 assert.equal(cardHasName(ttg.cards[ID],'ヨーコ',originalEffectsDisabled(s,source)),false);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:2209,first:0}));
 source=occupy(s,0,ID,'energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 silence(s,source.uid);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(countCards(s.players[0]),50);
});

test('a hand return does not fire onRetire, and DRAW life does not activate the body',()=>{
 const labDeck=deck(lab,['LAB-RETURN']);
 const packs=[lab,lab];
 let s=toMain(packs,newUniversalMatch(packs,{decks:[labDeck,labDeck],seed:2210,first:0}));
 const source=occupy(s,0,'LAB-RETURN','energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 const deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].hand.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(s.turnRetireEvents.length,0);
 const counts=deck(ttg,[ID,'TTG-1-005']);
 const foreign=deck(mst,['MST-1-016']);
 const cross=[mst,ttg];
 s=newUniversalMatch(cross,{decks:[foreign,counts],seed:2211,first:0});
 const attacker=occupy(s,0,'MST-1-016','front',0);
 const life=s.players[1].life[0];
 const trigger=take(s,1,ID);
 s.players[1].life[0]=trigger;
 s.players[1].deck.push(life);
 s=dispatchUniversalAction(cross,s,{type:'next'});
 s=dispatchUniversalAction(cross,s,{type:'next'});
 s=dispatchUniversalAction(cross,s,{type:'next'});
 s=dispatchUniversalAction(cross,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(cross,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending.trigger,'draw');
 const handBefore=s.players[1].hand.length;
 const hiddenBefore=universalPublicView(cross,s,0);
 assert.equal(hiddenBefore.players[1].hand,null);
 s=dispatchUniversalAction(cross,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.players[1].hand.length,handBefore+1);
 assert.ok(s.players[1].outside.some(c=>c.uid===trigger.uid));
 assert.equal(s.players[1].front.some(c=>c?.cardId===ID),false);
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalPublicView(cross,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(cross,s),true);
});
