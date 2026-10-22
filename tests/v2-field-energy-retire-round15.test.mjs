import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';

// Official pages checked 2026-10-22. None of the four card pages contained an
// FAQ block. The header sprite is 色+ (one color pip and a plus mark), so the
// resting generated energy is 1. These cards do not print 「アクティブの場合」,
// so the plus is the activate ability and not activeExtraEnergy.
// SAO-1-008 / 045 / 093 print the energy gain and the end-of-MAIN retirement
// as the resolved text. SAO-2-050 prints the same result as text the character
// gains. No line word is printed, so FRONT and ENERGY may both activate.
// Generation still comes only from the energy line.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const batteries=[
 {id:'SAO-1-008',color:'yellow',pay:'SAO-1-003',trait:'ALO',name:'ユイ',
  effect:'【起動メイン】【レストにする】 【ターン1】このターン中、このキャラの発生エナジー+【黄】。メインフェイズ終了時、このキャラを退場させる。'},
 {id:'SAO-1-045',color:'blue',pay:'SAO-1-052',trait:'アインクラッド',name:'ピナ',
  effect:'【起動メイン】【レストにする】 【ターン1】このターン中、このキャラの発生エナジー+【青】。メインフェイズ終了時、このキャラを退場させる。'},
 {id:'SAO-1-093',color:'green',pay:'SAO-1-073',trait:'GGO',name:'ゼクシード',
  effect:'【起動メイン】【レストにする】 【ターン1】このターン中、このキャラの発生エナジー+【緑】。メインフェイズ終了時、このキャラを退場させる。'},
 {id:'SAO-2-050',color:'purple',pay:'SAO-2-048',trait:'プログレッシブ',name:'ディアベル',
  effect:'【起動メイン】【レストにする】 【ターン1】このキャラはこのターン中、発生エナジー+【紫】と「メインフェイズ終了時、このキャラを退場させる。」を得る。'}
];
const sharedAbility={op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1};
const vanilla=(id,name)=>({id,name,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:null,implementation:'vanilla',effects:{}});
const lineCard=(id,lines)=>({...vanilla(id,id),implementation:'dsl',
 mainAbility:{op:'restSelfGainEnergyRetireEndMain',lines,oncePerTurn:true,extraEnergy:1}});
const lab=createUniversalPack({id:'field-energy-lines',cards:[
 lineCard('LAB-LINE-ENERGY','energy'),lineCard('LAB-LINE-FRONT','front'),
 lineCard('LAB-LINE-FIELD','field'),
 ...Array.from({length:10},(_,i)=>vanilla('LAB-FILL-'+i,'Fill '+i))
]});

function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13,pack.id+' fillers');
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
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function occupy(s,p,id,line,slot,{ready=true}={}){
 const card=take(s,p,id);
 card.ready=ready;
 s.players[p][line][slot]=card;
 return card;
}
function toMain(packs,s){
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function activate(uid){return {type:'activate',uid,mode:'selfRestEnergyRetire'};}
function silence(s,uid){
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:uid,
  targetUid:uid,until:{player:0,phase:'attack',edge:'start'},sourceLinked:false});
}

test('four SAO batteries share a field-line REST energy profile and keep gen 1',()=>{
 for(const row of batteries){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===row.id);
  const reprint=SAO_OFFICIAL_CARDS.filter(c=>c.id===row.id);
  assert.ok(reprint.every(c=>c.gen===1&&c.effectJa===row.effect),row.id+' reprint');
  assert.equal(source.effectJa,row.effect);
  assert.equal(source.gen,1);
  assert.equal(source.energy,0);
  const card=sao.cards[row.id];
  assert.equal(card.name,row.name);
  assert.equal(card.color,row.color);
  assert.deepEqual(card.traits,[row.trait]);
  assert.equal(card.gen,1);
  assert.equal(card.activeExtraEnergy,0);
  assert.equal(card.frontGeneratesEnergy,false);
  assert.deepEqual(card.mainAbility,sharedAbility);
  assert.deepEqual(card.effects,{});
 }
 assert.deepEqual(mst.cards['MST-1-016'].mainAbility,{
  op:'restSelfGainEnergyRetireEndMain',energyOnly:true,oncePerTurn:true,extraEnergy:1});
 const counts=deck(sao,[...batteries.map(r=>r.id),'SAO-1-003','SAO-1-052','SAO-1-073','SAO-2-048']);
 const foreign=deck(mst,['MST-1-016']);
 assert.equal(universalPublicView([sao,mst],newUniversalMatch([sao,mst],{
  decks:[counts,foreign],seed:1508,first:0}),0).players[1].hand,null);
 const base={id:'QA-1',name:'QA',color:'blue',type:'character',energy:0,
  ap:1,bp:1000,gen:1,implementation:'dsl',effects:{}};
 const create=mainAbility=>createUniversalPack({id:'energy-schema',cards:[{...base,mainAbility}]});
 assert.doesNotThrow(()=>create({op:'restSelfGainEnergyRetireEndMain',energyOnly:true,
  oncePerTurn:true,extraEnergy:1}));
 assert.doesNotThrow(()=>create(sharedAbility));
 for(const bad of [
  {...sharedAbility,energyOnly:true},
  {...sharedAbility,lines:'hand'},
  {...sharedAbility,extraEnergy:4},
  {op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:false,extraEnergy:1}
 ])assert.throws(()=>create(bad),/unsupported main action/);
});

test('energy-line activation raises the printed color immediately and retires at end of MAIN',()=>{
 const counts=deck(sao,[...batteries.map(r=>r.id),'SAO-1-003','SAO-1-052','SAO-1-073','SAO-2-048']);
 const foreign=deck(mst,['MST-1-016']);
 const packs=[sao,mst];
 batteries.forEach((row,index)=>{
  let s=newUniversalMatch(packs,{decks:[counts,foreign],seed:1600+index,first:0});
  const source=occupy(s,0,row.id,'energy',0);
  const payer=hold(s,0,row.pay);
  s=toMain(packs,s);
  assert.equal(universalEnergyByColor(packs,s,0)[row.color],1);
  assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid),false);
  const action=activate(source.uid);
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
  const ap=s.players[0].apCards.filter(x=>x.ready).length;
  s=dispatchUniversalAction(packs,s,action);
  assert.equal(s.players[0].energy[0].ready,false);
  assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap);
  assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
  assert.equal(universalEnergyByColor(packs,s,0)[row.color],2);
  assert.equal(universalPublicView(packs,s,1).players[0].energy[0].produces,2);
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===payer.uid&&a.line==='energy'));
  s.players[0].energy[0].ready=true;
  assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid),false);
  assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-forged',mode:'selfRestEnergyRetire'}),
   /not currently legal/);
  for(const difficulty of ['normal','hard']){
   const ai=chooseUniversalAiAction(packs,s,{difficulty});
   assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
  }
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.phase,'attack');
  assert.equal(s.players[0].energy[0],null);
  assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
  assert.equal(s.delayedEffects.length,0);
  assert.equal(s.turnRetireEvents.length,1);
  assert.equal(s.turnRetireEvents[0].uid,source.uid);
  assert.equal(s.turnRetireEvents[0].line,'energy');
  assert.equal(universalEnergyByColor(packs,s,0)[row.color]||0,0);
  assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
  assert.equal(countCards(s.players[0]),50);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
});

test('front activation rests and schedules retirement without generating energy',()=>{
 const counts=deck(sao,batteries.map(r=>r.id));
 const foreign=deck(mst,['MST-1-016']);
 const packs=[sao,mst];
 batteries.forEach((row,index)=>{
  let s=newUniversalMatch(packs,{decks:[counts,foreign],seed:1700+index,first:0});
  const source=occupy(s,0,row.id,'front',0);
  s=toMain(packs,s);
  assert.equal(universalEnergyByColor(packs,s,0)[row.color]||0,0);
  assert.equal(universalPublicView(packs,s,1).players[0].front[0].produces,undefined);
  s=dispatchUniversalAction(packs,s,activate(source.uid));
  assert.equal(s.players[0].front[0].ready,false);
  assert.equal(universalCardEnergy(packs,s,0,s.players[0].front[0]),0);
  assert.equal(universalEnergyByColor(packs,s,0)[row.color]||0,0);
  assert.equal(s.delayedEffects.length,1);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.players[0].front[0],null);
  assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
  assert.equal(s.turnRetireEvents.length,1);
  assert.equal(s.turnRetireEvents[0].line,'front');
  assert.equal(countCards(s.players[0]),50);
 });
});

test('energy-only cards stay on the energy line; printed line values are exact',()=>{
 const foreign=deck(mst,['MST-1-016']);
 const packs=[mst,mst];
 let s=newUniversalMatch(packs,{decks:[foreign,foreign],seed:1801,first:0});
 const locked=occupy(s,0,'MST-1-016','front',0);
 s=toMain(packs,s);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.mode==='selfRestEnergyRetire'),false);
 s.players[0].front[0]=null;
 s.players[0].energy[0]=locked;
 assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===locked.uid&&a.mode==='selfRestEnergyRetire'));
 const labDeck=deck(lab,['LAB-LINE-ENERGY','LAB-LINE-FRONT','LAB-LINE-FIELD']);
 const labPacks=[lab,lab];
 s=toMain(labPacks,newUniversalMatch(labPacks,{decks:[labDeck,labDeck],seed:1802,first:0}));
 const energyOnly=occupy(s,0,'LAB-LINE-ENERGY','front',0);
 const frontOnly=occupy(s,0,'LAB-LINE-FRONT','energy',0);
 const anywhere=occupy(s,0,'LAB-LINE-FIELD','front',1);
 const legal=legalUniversalActions(labPacks,s);
 assert.equal(legal.some(a=>a.uid===energyOnly.uid),false);
 assert.equal(legal.some(a=>a.uid===frontOnly.uid),false);
 assert.ok(legal.some(a=>a.uid===anywhere.uid&&a.mode==='selfRestEnergyRetire'));
 s.players[0].front[0]=null;
 s.players[0].energy[1]=energyOnly;
 s.players[0].energy[0]=null;
 s.players[0].front[2]=frontOnly;
 const moved=legalUniversalActions(labPacks,s);
 assert.ok(moved.some(a=>a.uid===energyOnly.uid));
 assert.ok(moved.some(a=>a.uid===frontOnly.uid));
 assert.equal(assertUniversalMatch(labPacks,s),true);
});

test('a changed stamp, removal, burial, or prior silence stops the delayed retirement',()=>{
 const counts=deck(sao,['SAO-1-008','SAO-1-003']);
 const foreign=deck(mst,['MST-1-016']);
 const packs=[sao,mst];
 let s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1901,first:0}));
 let source=occupy(s,0,'SAO-1-008','energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 s.players[0].energy[0].fieldEntryStamp=s.nextFieldEntryStamp++;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].energy[0].uid,source.uid);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(universalEnergyByColor(packs,s,0).yellow,2);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1902,first:0}));
 source=occupy(s,0,'SAO-1-008','energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 s.players[0].energy[0]=null;
 s.players[0].removed.push(source);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].removed.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].outside.some(c=>c.uid===source.uid),false);
 assert.equal(s.turnRetireEvents.length,0);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1903,first:0}));
 source=occupy(s,0,'SAO-1-008','energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 const cover=take(s,0,'SAO-1-003');
 cover.stack=[source];
 cover.ready=true;
 cover.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0].energy[0]=cover;
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.players[0].energy[0].uid,cover.uid);
 assert.equal(s.players[0].energy[0].stack[0].uid,source.uid);
 assert.equal(s.turnRetireEvents.length,0);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1904,first:0}));
 source=occupy(s,0,'SAO-1-008','energy',0);
 silence(s,source.uid);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 assert.equal(universalEnergyByColor(packs,s,0).yellow,1);

 s=toMain(packs,newUniversalMatch(packs,{decks:[counts,foreign],seed:1905,first:0}));
 source=occupy(s,0,'SAO-1-008','energy',0);
 s=dispatchUniversalAction(packs,s,activate(source.uid));
 silence(s,source.uid);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.turnRetireEvents.length,1);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,s),true);
});
