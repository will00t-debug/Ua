import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {UA54BT_OFFICIAL_PRINT} from '../dist/universal-v2/sources/mst-official-print.mjs';
import {verifiedMstV2Cards} from '../dist/universal-v2/mst-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalEnergyByColor,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Official pages checked 2026-10-22. Neither card page contains an FAQ block.
// EX08BT/SAO-2-004: alias 〈アリス〉, then on play ACTIVE only when at least
// four OTHER own field characters have the printed trait 整合騎士.
// Generated energy alt is 黄 (gen 1). Trigger is the standard ACTIVE trigger.
// UA54BT/MST-1-004: on play ACTIVE only when this entry was caused by an own
// effect. Paying AP to play or Raid is a play. Outside REST entry, an effect
// that Raids from outside, and recovered-self energy entry are own effects.
// Life COLOR / life RAID have no card FAQ that counts them, so they fail closed.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const knightWhen={kind:'ownTraitCount',turn:'any',min:4,zone:'field',excludeSelf:true,trait:'整合騎士'};
const probeEffects={onPlay:[
 {op:'peekTopOne'},
 {op:'activeSelfIf',entry:'ownEffect'}
]};
const probe={id:'LAB-PROBE',name:'Probe',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:null,implementation:'dsl',effects:probeEffects};
const raider={...probe,id:'LAB-RAIDER',name:'Raider',raidName:'Lab Base',trigger:'raid'};
const base={id:'LAB-BASE',name:'Lab Base',color:'blue',type:'character',energy:0,ap:1,bp:1500,gen:1,
 traits:[],trigger:null,implementation:'vanilla',effects:{}};
const recovered={...probe,id:'LAB-BACK',name:'Lab Recovered',
 ownOutsideRecovery:{op:'restSelfToEnergy',optional:true,rest:true}};
const colorLife={id:'LAB-COLOR',name:'Lab Color',color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:'color',implementation:'vanilla',effects:{},
 triggerEffect:{op:'deployHandCharacter',color:'blue',maxEnergy:0,ap:1}};
const deployEris={id:'LAB-DEPLOY-ERIS',name:'Deploy Eris',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
 implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',name:'エリス',color:'blue',energy:2,ap:1,optional:true}]}};
const deployProbe={id:'LAB-DEPLOY-PROBE',name:'Deploy Probe',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
 implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',name:'Probe',color:'blue',energy:0,ap:1,optional:true}]}};
const deployRaid={id:'LAB-DEPLOY-RAID',name:'Deploy Raid',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
 implementation:'dsl',effects:{onPlay:[{op:'deployOutsideTraitlessRestOrRaid',color:'blue',energy:0,ap:1,optional:true,perOtherOutsideField:1}]}};
const recoverEvent={id:'LAB-RECOVER',name:'Recover',color:'blue',type:'event',energy:0,ap:1,bp:0,gen:0,
 implementation:'dsl',effects:{onPlay:[{op:'recoverOutsideOne',filter:{field:'name',value:'Lab Recovered'},optional:false}]}};
const fills=Array.from({length:6},(_,i)=>({
 id:'LAB-FILL-'+i,name:'Fill '+i,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
 traits:[],trigger:null,implementation:'vanilla',effects:{}
}));
const lab=createUniversalPack({id:'entry-active-lab',cards:[
 probe,raider,base,recovered,colorLife,deployEris,deployProbe,deployRaid,recoverEvent,...fills
]});
const officialMst=createUniversalPack({id:'mst-with-deploy-fixture',
 cards:[...verifiedMstV2Cards(),deployEris]});

function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
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
function hold(s,p,id){
 const card=take(s,p,id);
 s.players[p].hand.push(card);
 return card;
}
function toMain(pack,s){
 s=dispatchUniversalAction(pack,s,{type:'next'});
 s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function toAttack(pack,s){
 s=toMain(pack,s);
 s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'attack');
 return s;
}
function occupy(s,p,id,line,slot){
 const card=take(s,p,id);
 card.ready=false;
 s.players[p][line][slot]=card;
 return card;
}
function countCards(player){
 const walk=c=>1+(c.stack||[]).reduce((n,x)=>n+walk(x),0)+(c.under||[]).reduce((n,x)=>n+walk(x),0);
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=walk(c);
 return n;
}
function queuedActive(s){
 return s.effectQueue.find(job=>job.op==='activeSelfIf');
}
function finishPeek(pack,s){
 assert.equal(s.pending.kind,'private-top-choice');
 return dispatchUniversalAction(pack,s,{type:'chooseTopCard',mode:'top'});
}

test('SAO-2-004 and MST-1-004 keep the official print and one shared ACTIVE op',()=>{
 const alice=SAO_OFFICIAL_CARDS.find(c=>c.id==='SAO-2-004');
 assert.equal(alice.effectJa,'このカードは〈アリス〉としても扱う。\n【登場時】自分の場に他の［特徴：整合騎士］が4枚以上ある場合、このキャラをアクティブにする。');
 assert.equal(alice.gen,1);
 assert.equal(alice.trigger,'active');
 const card=sao.cards['SAO-2-004'];
 assert.equal(card.id,'SAO-2-004');
 assert.equal(card.name,'アリス・シンセシス・サーティ');
 assert.deepEqual(card.nameAliases,['アリス']);
 assert.equal(cardHasName(card,'アリス'),true);
 assert.equal(cardHasName(card,'アリス',true),false);
 assert.deepEqual(card.effects.onPlay,[{op:'activeSelfIf',when:knightWhen}]);
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger],
  ['yellow',3,1,3000,1,'active']);
 assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes('SAO-2-004'));
 const eris=mst.cards['MST-1-004'];
 assert.equal(UA54BT_OFFICIAL_PRINT['MST-1-004'].effectJa,
  '〖登場時〗 このキャラが自分の効果で登場していた場合、このキャラをアクティブにする。');
 assert.equal(eris.name,'エリス');
 assert.equal(eris.nameAliases,undefined);
 assert.deepEqual(eris.effects.onPlay,[{op:'activeSelfIf',entry:'ownEffect'}]);
 assert.deepEqual([eris.color,eris.energy,eris.ap,eris.bp,eris.gen,eris.trigger],
  ['blue',2,1,3000,1,null]);
 assert.ok(EXPECTED_V2_IDS['mushoku-tensei'].includes('MST-1-004'));
 assert.equal(sao.cards['LAB-PROBE'],undefined);
 assert.equal(mst.cards['LAB-DEPLOY-ERIS'],undefined);
});

test('conditional ACTIVE rejects a title-shaped or mistimed profile',()=>{
 const bad=[
  {op:'activeSelfIf'},
  {op:'activeSelfIf',entry:'paidPlay'},
  {op:'activeSelfIf',when:{kind:'ownTraitCount',turn:'any',min:4,zone:'field',excludeSelf:true}},
  {op:'activeSelfIf',entry:'ownEffect',note:true}
 ];
 for(const effect of bad)
  assert.throws(()=>createUniversalPack({id:'bad',cards:[{...probe,effects:{onPlay:[effect]}}]}),
   /invalid conditional ACTIVE|invalid or cyclic|invalid passive/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[{...probe,
  effects:{onAttack:[{op:'activeSelfIf',entry:'ownEffect'}]}}]}),
  /only a character onPlay/);
});

test('SAO-2-004 becomes ACTIVE only at four other knights, on either line',()=>{
 const counts=deck(sao,['SAO-2-004','SAO-1-010','SAO-1-011','SAO-1-004'],'yellow');
 const foreign=deck(mst,['MST-1-001'],'blue');
 let s=newUniversalMatch([sao,mst],{decks:[counts,foreign],seed:2004,first:0});
 const knights=[0,1,2].map(slot=>occupy(s,0,'SAO-1-010','energy',slot));
 occupy(s,0,'SAO-1-011','front',1);
 const alice=hold(s,0,'SAO-2-004');
 s=toMain([sao,mst],s);
 assert.ok((universalEnergyByColor([sao,mst],s,0).yellow||0)>=3);
 let play=legalUniversalActions([sao,mst],s).find(a=>a.type==='play'&&a.uid===alice.uid&&
  a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction([sao,mst],s,play);
 const entered=s.players[0].front[0];
 assert.equal(entered.uid,alice.uid);
 assert.equal(entered.ready,true);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(universalPublicView([sao,mst],s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 // Three other knights leave the entering card's own trait short of four.
 s=newUniversalMatch([sao,mst],{decks:[counts,foreign],seed:2005,first:0});
 [0,1,2].forEach(slot=>occupy(s,0,'SAO-1-010','energy',slot));
 const short=hold(s,0,'SAO-2-004');
 s=toMain([sao,mst],s);
 play=legalUniversalActions([sao,mst],s).find(a=>a.uid===short.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction([sao,mst],s,play);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[0].uid,short.uid);
 // Replacing one of four energy knights drops the count to three and is removal.
 s=newUniversalMatch([sao,mst],{decks:[counts,foreign],seed:2006,first:0});
 const line=[0,1,2,3].map(slot=>occupy(s,0,'SAO-1-010','energy',slot));
 const replacer=hold(s,0,'SAO-2-004');
 s=toMain([sao,mst],s);
 play=legalUniversalActions([sao,mst],s).find(a=>a.uid===replacer.uid&&a.line==='energy'&&
  a.replaceUid===line[3].uid);
 s=dispatchUniversalAction([sao,mst],s,play);
 assert.equal(s.players[0].energy[3].uid,replacer.uid);
 assert.equal(s.players[0].energy[3].ready,false);
 assert.ok(s.players[0].removed.some(c=>c.uid===line[3].uid));
 assert.equal(s.turnRetireEvents.length,0);
 // A full front of non-knights does not reduce the four energy knights.
 s=newUniversalMatch([sao,mst],{decks:[counts,foreign],seed:2007,first:0});
 [0,1,2,3].forEach(slot=>occupy(s,0,'SAO-1-010','energy',slot));
 const blocked=[0,1,2,3].map(slot=>occupy(s,0,'SAO-1-004','front',slot));
 const through=hold(s,0,'SAO-2-004');
 s=toMain([sao,mst],s);
 play=legalUniversalActions([sao,mst],s).find(a=>a.uid===through.uid&&a.line==='front'&&
  a.replaceUid===blocked[0].uid);
 assert.equal(legalUniversalActions([sao,mst],s).some(a=>a.type==='raid'&&a.uid===through.uid),false);
 s=dispatchUniversalAction([sao,mst],s,play);
 assert.equal(s.players[0].front[0].ready,true);
 assert.ok(s.players[0].removed.some(c=>c.uid===blocked[0].uid));
 assert.equal(s.turnRetireEvents.length,0);
 assert.throws(()=>dispatchUniversalAction([sao,mst],s,{type:'play',uid:'0-forged',line:'front',slot:1}),
  /not currently legal/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction([sao,mst],s,{difficulty});
  assert.ok(legalUniversalActions([sao,mst],s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 assert.equal(knights.length,3);
});

test('SAO-2-004 ACTIVE life trigger readies another character and does not replay onPlay',()=>{
 const counts=deck(sao,['SAO-2-004','SAO-1-010','SAO-1-001'],'yellow');
 const foreign=deck(mst,['MST-1-016'],'blue');
 let s=newUniversalMatch([mst,sao],{decks:[foreign,counts],seed:2012,first:0});
 const attacker=occupy(s,0,'MST-1-016','front',0);
 attacker.ready=true;
 const target=occupy(s,1,'SAO-1-010','front',0);
 const life=s.players[1].life[0];
 const trigger=take(s,1,'SAO-2-004');
 s.players[1].life[0]=trigger;
 s.players[1].deck.push(life);
 s=toAttack([mst,sao],s);
 s=dispatchUniversalAction([mst,sao],s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction([mst,sao],s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.kind,'life-trigger');
 assert.equal(s.pending.trigger,'active');
 const before=s.players[1].hand.length;
 s=dispatchUniversalAction([mst,sao],s,{type:'chooseTrigger',mode:'active',uid:target.uid});
 assert.equal(s.players[1].front[0].ready,true);
 assert.equal(universalBp([mst,sao],s,s.players[1].front[0]),sao.cards['SAO-1-010'].bp+3000);
 assert.equal(s.players[1].hand.length,before);
 assert.equal(s.players[1].front.filter(c=>c?.cardId==='SAO-2-004').length,0);
});

test('MST-1-004 stays REST after a paid play and becomes ACTIVE from outside',()=>{
 const counts=deck(officialMst,['MST-1-004','MST-1-001','LAB-DEPLOY-ERIS'],'blue');
 let s=newUniversalMatch(officialMst,{decks:[counts,counts],seed:1004,first:0});
 [0,1].forEach(slot=>occupy(s,0,'MST-1-001','energy',slot));
 const paid=hold(s,0,'MST-1-004');
 s=toMain(officialMst,s);
 let play=legalUniversalActions(officialMst,s).find(a=>a.uid===paid.uid&&a.line==='front'&&a.slot===0);
 s=dispatchUniversalAction(officialMst,s,play);
 assert.equal(s.players[0].front[0].uid,paid.uid);
 assert.equal(s.players[0].front[0].ready,false);
 s=newUniversalMatch(officialMst,{decks:[counts,counts],seed:1005,first:0});
 const outside=take(s,0,'MST-1-004');
 s.players[0].outside.push(outside);
 const event=hold(s,0,'LAB-DEPLOY-ERIS');
 s=toMain(officialMst,s);
 s=dispatchUniversalAction(officialMst,s,{type:'event',uid:event.uid});
 assert.equal(s.pending.kind,'effect-outside-rest');
 const choice=legalUniversalActions(officialMst,s).find(a=>a.uid===outside.uid&&a.line==='energy'&&a.slot===0);
 s=dispatchUniversalAction(officialMst,s,choice);
 assert.equal(s.players[0].energy[0].uid,outside.uid);
 assert.equal(s.players[0].energy[0].ready,true);
 assert.equal(s.turnRetireEvents.length,0);
 assert.equal(universalPublicView(officialMst,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(officialMst,s),true);
});

test('entry cause distinguishes paid play, Raid, outside, recovery, and life triggers',()=>{
 const ids=['LAB-PROBE','LAB-RAIDER','LAB-BASE','LAB-BACK','LAB-COLOR','LAB-DEPLOY-PROBE',
  'LAB-DEPLOY-RAID','LAB-RECOVER','LAB-FILL-0','LAB-FILL-1','LAB-FILL-2','LAB-FILL-3','LAB-FILL-4'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(lab,counts),[]);
 const open=(seed,setup)=>{
  let s=newUniversalMatch(lab,{decks:[counts,counts],seed,first:0});
  setup(s);
  s=toMain(lab,s);
  return s;
 };
 let s=open(1,state=>{hold(state,0,'LAB-PROBE');});
 const paidUid=s.players[0].hand.find(c=>c.cardId==='LAB-PROBE').uid;
 s=dispatchUniversalAction(lab,s,legalUniversalActions(lab,s).find(a=>a.type==='play'&&a.uid===paidUid&&a.line==='front'&&a.slot===0));
 assert.equal(queuedActive(s).entryCause,'paidPlay');
 const paid=s.players[0].front[0];
 s=finishPeek(lab,s);
 assert.equal(s.players[0].front.find(c=>c?.uid===paid.uid).ready,false);
 s=open(2,state=>{
  const home=occupy(state,0,'LAB-BASE','front',0);
  const top=hold(state,0,'LAB-RAIDER');
  state.baseUid=home.uid;state.topUid=top.uid;
 });
 const baseUid=s.players[0].front[0].uid,topUid=s.players[0].hand.find(c=>c.cardId==='LAB-RAIDER').uid;
 s=dispatchUniversalAction(lab,s,{type:'raid',uid:topUid,baseUid,slot:0});
 assert.equal(queuedActive(s).entryCause,'paidRaid');
 assert.equal(s.players[0].front[0].ready,true);
 s.players[0].front[0].ready=false;
 s=finishPeek(lab,s);
 assert.equal(s.players[0].front[0].ready,false);
 s=open(3,state=>{
  state.players[0].outside.push(take(state,0,'LAB-PROBE'));
  hold(state,0,'LAB-DEPLOY-PROBE');
 });
 const probeUid=s.players[0].outside[0].uid;
 s=dispatchUniversalAction(lab,s,{type:'event',uid:s.players[0].hand.find(c=>c.cardId==='LAB-DEPLOY-PROBE').uid});
 s=dispatchUniversalAction(lab,s,{type:'chooseOutsideRest',uid:probeUid,line:'front',slot:0});
 assert.equal(queuedActive(s).entryCause,'outsideEffect');
 assert.equal(s.players[0].front[0].ready,false);
 s=finishPeek(lab,s);
 assert.equal(s.players[0].front[0].ready,true);
 s=open(4,state=>{
  occupy(state,0,'LAB-BASE','front',0);
  state.players[0].outside.push(take(state,0,'LAB-RAIDER'));
  hold(state,0,'LAB-DEPLOY-RAID');
 });
 const raidUid=s.players[0].outside.find(c=>c.cardId==='LAB-RAIDER').uid;
 const raidBase=s.players[0].front[0].uid;
 s=dispatchUniversalAction(lab,s,{type:'event',uid:s.players[0].hand.find(c=>c.cardId==='LAB-DEPLOY-RAID').uid});
 s=dispatchUniversalAction(lab,s,legalUniversalActions(lab,s).find(a=>a.mode==='raid'&&a.uid===raidUid&&a.baseUid===raidBase));
 assert.equal(queuedActive(s).entryCause,'outsideEffectRaid');
 assert.equal(s.players[0].front[0].ready,false);
 s=finishPeek(lab,s);
 assert.equal(s.players[0].front[0].ready,true);
 s=open(5,state=>{
  state.players[0].outside.push(take(state,0,'LAB-BACK'));
  hold(state,0,'LAB-RECOVER');
 });
 const backUid=s.players[0].outside[0].uid;
 s=dispatchUniversalAction(lab,s,{type:'event',uid:s.players[0].hand.find(c=>c.cardId==='LAB-RECOVER').uid});
 s=dispatchUniversalAction(lab,s,{type:'chooseOutsideRecovery',uid:backUid});
 s=dispatchUniversalAction(lab,s,{type:'chooseRecoveredEntry',mode:'enter',line:'energy',slot:0});
 assert.equal(queuedActive(s).entryCause,'recoveredEffect');
 s=finishPeek(lab,s);
 assert.equal(s.players[0].energy[0].uid,backUid);
 assert.equal(s.players[0].energy[0].ready,true);
});

test('life COLOR and life RAID do not satisfy an own-effect entry',()=>{
 const ids=['LAB-PROBE','LAB-RAIDER','LAB-BASE','LAB-COLOR','LAB-FILL-0','LAB-FILL-1','LAB-FILL-2',
  'LAB-FILL-3','LAB-FILL-4','LAB-FILL-5','LAB-DEPLOY-PROBE','LAB-BACK','LAB-RECOVER'];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 let s=newUniversalMatch(lab,{decks:[counts,counts],seed:12,first:1});
 const attacker=occupy(s,1,'LAB-FILL-0','front',0);
 attacker.ready=true;
 const entrant=hold(s,0,'LAB-PROBE');
 const revealed=s.players[0].life[0];
 const color=take(s,0,'LAB-COLOR');
 s.players[0].life[0]=color;
 s.players[0].deck.push(revealed);
 s=toAttack(lab,s);
 s=dispatchUniversalAction(lab,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(lab,s,{type:'chooseBlock',uid:null});
 const colorPlay=legalUniversalActions(lab,s).find(a=>a.mode==='color'&&a.uid===entrant.uid&&a.line==='front');
 s=dispatchUniversalAction(lab,s,colorPlay);
 assert.equal(queuedActive(s).entryCause,'lifeColor');
 s.players[0].front.find(c=>c?.uid===entrant.uid).ready=false;
 s=finishPeek(lab,s);
 assert.equal(s.players[0].front.find(c=>c?.uid===entrant.uid).ready,false);
 s=newUniversalMatch(lab,{decks:[counts,counts],seed:13,first:1});
 const attacker2=occupy(s,1,'LAB-FILL-0','front',0);
 attacker2.ready=true;
 const home=occupy(s,0,'LAB-BASE','front',0);
 const old=s.players[0].life[0];
 const rider=take(s,0,'LAB-RAIDER');
 s.players[0].life[0]=rider;
 s.players[0].deck.push(old);
 s=toAttack(lab,s);
 s=dispatchUniversalAction(lab,s,{type:'attack',uid:attacker2.uid});
 s=dispatchUniversalAction(lab,s,{type:'chooseBlock',uid:null});
 s=dispatchUniversalAction(lab,s,{type:'chooseTrigger',mode:'raid',baseUid:home.uid,line:'front',slot:0});
 assert.equal(queuedActive(s).entryCause,'lifeRaid');
 s.players[0].front[0].ready=false;
 s=finishPeek(lab,s);
 assert.equal(s.players[0].front[0].uid,rider.uid);
 assert.equal(s.players[0].front[0].ready,false);
});

test('skip, cannot ACTIVE, and silence stop the shared on-play ACTIVE',()=>{
 const traitProbe={...probe,id:'LAB-KNIGHT',name:'Knight Probe',traits:['整合騎士'],
  effects:{onPlay:[{op:'peekTopOne'},{op:'activeSelfIf',when:{...knightWhen,min:1}}]}};
 const extras=Array.from({length:5},(_,i)=>({
  id:'LAB-EXTRA-'+i,name:'Extra '+i,color:'blue',type:'character',energy:0,ap:1,bp:1000,gen:1,
  traits:[],trigger:null,implementation:'vanilla',effects:{}
 }));
 const knightLab=createUniversalPack({id:'knight-active-lab',cards:[
  traitProbe,...fills,...extras,base,raider,recovered,colorLife,deployProbe,recoverEvent
 ]});
 const knightCounts=deck(knightLab,['LAB-KNIGHT','LAB-FILL-0'],'blue');
 const run=(seed,kind)=>{
  let s=newUniversalMatch(knightLab,{decks:[knightCounts,knightCounts],seed,first:0});
  occupy(s,0,'LAB-FILL-0','energy',0);
  // The filler is not the trait. Put one knight already on the field.
  const other=take(s,0,'LAB-KNIGHT');
  other.ready=false;
  s.players[0].front[1]=other;
  const coming=hold(s,0,'LAB-KNIGHT');
  s=toMain(knightLab,s);
  s=dispatchUniversalAction(knightLab,s,legalUniversalActions(knightLab,s)
   .find(a=>a.uid===coming.uid&&a.line==='front'&&a.slot===0));
  const live=s.players[0].front[0];
  assert.equal(live.ready,false);
  if(kind==='skip')grantContinuousState(s,{kind:'skipNextActive',controller:0,
   sourceUid:other.uid,targetUid:live.uid,until:null});
  if(kind==='cannot')grantContinuousState(s,{kind:'cannotActive',controller:0,
   sourceUid:other.uid,targetUid:live.uid,until:{player:0,phase:'attack',edge:'end'}});
  if(kind==='silence')grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,
   sourceUid:other.uid,targetUid:live.uid,until:{player:1,phase:'attack',edge:'end'}});
  s=finishPeek(knightLab,s);
  return s.players[0].front[0].ready;
 };
 assert.equal(run(21,'skip'),false);
 assert.equal(run(22,'cannot'),false);
 assert.equal(run(23,'silence'),false);
 assert.equal(run(24,'none'),true);
});
