import test from 'node:test';
import assert from 'node:assert/strict';
import {SAO_OFFICIAL_CARDS} from '../dist/sao-official-import.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState,originalEffectsDisabled} from '../dist/universal-v2/continuous-states.mjs';
import {cardHasName,matchesV2LiveCondition} from '../dist/universal-v2/field-conditions.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX08BT/SAO-2-007 and EX08BT/SAO-2-055 checked 2026-10-22.
// Q87 (2023-03-17): 「カード名を〈〇〇〉として扱う」 is valid in hand, deck,
// outside, field, removed, and the other zones. Q1946: the alias is not
// 元々のカード名. Q2077: an alias satisfies a name condition on the field
// or outside. Q50/Q55: a buried Raid layer does not use its own effects,
// so its alias is not a visible field name. Life has no name-search effect
// in this engine; the alias is not invented as one.

const sao=registeredV2TitlePack('sword-art-online');
const mst=registeredV2TitlePack('mushoku-tensei');
const packs=[sao,mst];
function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
  .map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const home=deck(sao,['SAO-2-007','SAO-1-004'],'yellow');
const purple=deck(sao,['SAO-2-055'],'purple');
const foreign=deck(mst,['MST-1-016'],'blue');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function toMain(pack,s){
 s=dispatchUniversalAction(pack,s,{type:'next'});
 s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}

test('SAO-2-007 and SAO-2-055 keep the printed card id and add one official alias',()=>{
 const specs=[
  ['SAO-2-007','ユージオ・シンセシス・サーティツー','ユージオ',1,2000,'yellow',
   'このカードは〈ユージオ〉としても扱う。\n【登場時】カードを1枚引き、自分の手札を1枚場外に置く。'],
  ['SAO-2-055','結城 明日奈','アスナ',0,1500,'purple',
   'このカードは〈アスナ〉としても扱う。\n【登場時】カードを1枚引き、自分の手札を1枚場外に置く。']
 ];
 for(const [id,name,alias,energy,bp,color,effect] of specs){
  const source=SAO_OFFICIAL_CARDS.find(c=>c.id===id&&c.set==='EX08BT');
  assert.equal(source.nameJa,name);
  assert.equal(source.effectJa,effect);
  assert.equal(source.gen,1);
  const card=sao.cards[id];
  assert.equal(card.id,id);
  assert.equal(card.name,name);
  assert.deepEqual(card.nameAliases,[alias]);
  assert.equal(cardHasName(card,name),true);
  assert.equal(cardHasName(card,alias),true);
  assert.equal(cardHasName(card,alias,true),false);
  assert.deepEqual(card.effects.onPlay,[{op:'drawDiscard',count:1}]);
  assert.deepEqual([card.color,card.energy,card.bp,card.trigger],[color,energy,bp,'draw']);
  assert.ok(EXPECTED_V2_IDS['sword-art-online'].includes(id));
 }
 const printed=sao.cards['SAO-1-004'];
 assert.equal(printed.name,'ユージオ');
 assert.equal(printed.nameAliases,undefined);
 assert.notEqual(printed.id,sao.cards['SAO-2-007'].id);
});

test('both official cards draw one, discard one, and their DRAW trigger still draws',()=>{
 let s=newUniversalMatch(packs,{decks:[home,foreign],seed:2007,first:0});
 const fuel=take(s,0,'SAO-1-004');fuel.ready=true;s.players[0].energy[0]=fuel;
 const eugeo=take(s,0,'SAO-2-007');s.players[0].hand.push(eugeo);
 s=toMain(packs,s);
 const deckBefore=s.players[0].deck.length,handBefore=s.players[0].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'play',uid:eugeo.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].cardId,'SAO-2-007');
 assert.equal(s.players[0].front[0].uid,eugeo.uid);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.pending.kind,'effect-discard');
 const payment=s.players[0].hand.find(c=>c.uid!==eugeo.uid);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:payment.uid});
 assert.ok(s.players[0].outside.some(c=>c.uid===payment.uid));
 assert.equal(s.players[0].hand.length,handBefore-1);
 assert.equal(assertUniversalMatch(packs,s),true);

 s=newUniversalMatch(packs,{decks:[purple,foreign],seed:2055,first:0});
 const asuna=take(s,0,'SAO-2-055');s.players[0].hand.push(asuna);
 s=toMain(packs,s);
 const drawn=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'play',uid:asuna.uid,line:'energy',slot:0});
 assert.equal(s.players[0].deck.length,drawn-1);
 assert.equal(s.pending.kind,'effect-discard');
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:s.players[0].hand[0].uid});
 assert.equal(s.players[0].energy[0].cardId,'SAO-2-055');
 assert.equal(assertUniversalMatch(packs,s),true);

 for(const [id,counts,seed] of [['SAO-2-007',home,17],['SAO-2-055',purple,55]]){
  s=newUniversalMatch(packs,{decks:[counts,foreign],seed,first:1});
  const attacker=take(s,1,'MST-1-016');attacker.ready=true;s.players[1].front[0]=attacker;
  const life=take(s,0,id);s.players[0].life.unshift(life);
  for(let n=0;n<8&&s.phase!=='attack';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.phase,'attack');
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:0});
  assert.equal(s.pending.trigger,'draw');
  const hand=s.players[0].hand.length;
  s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:0});
  assert.equal(s.players[0].hand.length,hand+1);
  assert.ok(s.players[0].outside.some(c=>c.uid===life.uid));
  assert.equal(assertUniversalMatch(packs,s),true);
 }
});

function unit(id,extra){
 return {id,name:id,color:'purple',type:'character',energy:0,ap:1,bp:2000,gen:1,
  implementation:'vanilla',effects:{},...extra};
}
const lab=createUniversalPack({id:'name-alias-lab',cards:[
 unit('ALIAS',{name:'Printed',nameAliases:['Alias'],implementation:'dsl'}),
 unit('NEED',{implementation:'dsl',passiveBonuses:[{condition:{kind:'ownNameExists',
  turn:'any',zone:'field',excludeSelf:true,name:'Alias'},bp:1000}]}),
 unit('SEEK',{implementation:'dsl',effects:{onPlay:[{op:'searchDeckOne',shuffle:true,
  optional:false,filter:{field:'name',value:'Alias'}}]}}),
 unit('BACK',{implementation:'dsl',effects:{onPlay:[{op:'recoverOutsideOne',
  optional:false,filter:{field:'name',value:'Alias'}}]}}),
 unit('REST',{implementation:'dsl',effects:{onPlay:[{op:'deployOutsideRest',name:'Alias',
  color:'purple',energy:0,ap:1,optional:true}]}}),
 unit('DRAWNAME',{implementation:'dsl',effects:{onPlay:[{op:'drawIfOwnName',name:'Alias',count:1}]}}),
 unit('GATE',{name:'Alpha',implementation:'dsl',effects:{onPlay:[{op:'oncePerTurnGate',
  scope:'name',optional:false,then:[{op:'draw',count:1}]}]}}),
 unit('GATEB',{name:'Beta',nameAliases:['Alpha'],implementation:'dsl',effects:{onPlay:[
  {op:'oncePerTurnGate',scope:'name',optional:false,then:[{op:'draw',count:1}]}]}}),
 unit('RIDER',{raidName:'Alias'}),
 unit('PRINTED',{raidName:'Printed'}),
 unit('FILLER',{name:'Filler'}),
 unit('LOOK',{raidName:'Filler',raidRequiresNames:['Alias']}),
 unit('LOOKP',{raidName:'Filler',raidRequiresNames:['Printed']})
]});
const labIds=['ALIAS','NEED','SEEK','BACK','REST','DRAWNAME','GATE','GATEB','RIDER','PRINTED','FILLER','LOOK','LOOKP'];
const labDeck=Object.fromEntries(labIds.map((id,i)=>[id,i===12?2:4]));
const other=createUniversalPack({id:'other-title',cards:[
 unit('OTHER',{name:'Alias',color:'blue'}),
 ...['A','B','C','D','E','F','G','H','I','J','K','L'].map(id=>unit(id,{color:'blue'}))
]});
const otherIds=['OTHER','A','B','C','D','E','F','G','H','I','J','K','L'];
const otherDeck=Object.fromEntries(otherIds.map((id,i)=>[id,i===12?2:4]));
function hold(s,p,id){
 const c=take(s,p,id);s.players[p].hand.push(c);return c;
}
function readyAp(s,p){for(const c of s.players[p].apCards)if(c.inPlay)c.ready=true;}

test('an alias counts on the visible field, deck, and outside, and not in the wrong zone',()=>{
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed:87,first:0});
 const alias=hold(s,0,'ALIAS');
 const need=hold(s,0,'NEED');need.ready=true;s.players[0].front[0]=need;
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===need.uid),1);
 s=toMain(lab,s);
 const drawCard=hold(s,0,'DRAWNAME');
 const deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(lab,s,{type:'play',uid:drawCard.uid,line:'energy',slot:0});
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(universalBp(lab,s,need),2000);
 alias.ready=true;s.players[0].energy[1]=alias;
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===alias.uid),1);
 assert.equal(universalBp(lab,s,s.players[0].front[0]),3000);
 readyAp(s,0);
 const again=hold(s,0,'DRAWNAME');
 const withName=s.players[0].deck.length;
 s=dispatchUniversalAction(lab,s,{type:'play',uid:again.uid,line:'front',slot:1});
 assert.equal(s.players[0].deck.length,withName-1);
 const names={kind:'ownFieldHasAllNames',turn:'any',zone:'field',excludeSelf:false,
  names:['Printed','Alias']};
 const printedOf=c=>lab.cards[c.cardId];
 assert.equal(matchesV2LiveCondition(s,0,need.uid,names,printedOf,()=>0),true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:need.uid,
  targetUid:alias.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(originalEffectsDisabled(s,alias),true);
 assert.equal(universalBp(lab,s,s.players[0].front[0]),2000);
 assert.equal(cardHasName(lab.cards.ALIAS,'Printed',true),true);
 assert.equal(matchesV2LiveCondition(s,0,need.uid,
  {kind:'ownNameExists',turn:'any',zone:'field',excludeSelf:true,name:'Printed'},
  printedOf,()=>0),true);
 s.continuousStates=[];
 const life=hold(s,0,'ALIAS');s.players[0].life.unshift(life);
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===life.uid),1);
 const removed=hold(s,0,'ALIAS');s.players[0].removed.push(removed);
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===removed.uid),1);
 readyAp(s,0);
 const seek=hold(s,0,'SEEK');
 s=dispatchUniversalAction(lab,s,{type:'play',uid:seek.uid,line:'energy',slot:2});
 assert.equal(s.pending.kind,'effect-search-deck');
 assert.equal(s.pending.choices.includes(life.uid),false);
 assert.equal(s.pending.choices.includes(removed.uid),false);
 assert.equal(s.pending.choices.includes(alias.uid),false);
 assert.ok(s.pending.choices.length);
 assert.throws(()=>dispatchUniversalAction(lab,s,{type:'chooseDeckSearch',uid:life.uid}),/not currently legal/);
 const ai=chooseUniversalAiAction(lab,s,'hard');
 assert.equal(ai.type,'chooseDeckSearch');
 assert.ok(s.pending.choices.includes(ai.uid));
 s=dispatchUniversalAction(lab,s,ai);
 const found=s.players[0].hand.find(c=>c.uid===ai.uid);
 assert.equal(found.cardId,'ALIAS');
 assert.equal(assertUniversalMatch(lab,s),true);
});

test('outside recovery and outside REST accept the alias, and removed does not',()=>{
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed:2077,first:0});
 const alias=hold(s,0,'ALIAS');s.players[0].outside.push(alias);
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===alias.uid),1);
 const decoy=hold(s,0,'FILLER');s.players[0].outside.push(decoy);
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===decoy.uid),1);
 s=toMain(lab,s);
 s=dispatchUniversalAction(lab,s,{type:'play',uid:hold(s,0,'BACK').uid,line:'energy',slot:0});
 assert.equal(s.pending.kind,'effect-recover-outside');
 assert.deepEqual(s.pending.choices,[alias.uid]);
 s=dispatchUniversalAction(lab,s,{type:'chooseOutsideRecovery',uid:alias.uid});
 assert.ok(s.players[0].hand.some(c=>c.uid===alias.uid));
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===alias.uid),1);
 s.players[0].removed.push(alias);
 readyAp(s,0);
 s=dispatchUniversalAction(lab,s,{type:'play',uid:hold(s,0,'BACK').uid,line:'energy',slot:1});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].removed.some(c=>c.uid===alias.uid));
 s.players[0].removed.splice(s.players[0].removed.findIndex(c=>c.uid===alias.uid),1);
 s.players[0].outside.push(alias);
 readyAp(s,0);
 s=dispatchUniversalAction(lab,s,{type:'play',uid:hold(s,0,'REST').uid,line:'energy',slot:2});
 assert.equal(s.pending.kind,'effect-outside-rest');
 assert.ok(s.pending.choices.includes(alias.uid));
 assert.equal(s.pending.choices.includes(decoy.uid),false);
 s=dispatchUniversalAction(lab,s,{type:'chooseOutsideRest',uid:alias.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].uid,alias.uid);
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[0].cardId,'ALIAS');
 assert.equal(assertUniversalMatch(lab,s),true);
});

test('a visible alias is a legal Raid base, and a buried alias is not',()=>{
 let s=newUniversalMatch(lab,{decks:[labDeck,labDeck],seed:50,first:0});
 const alias=hold(s,0,'ALIAS');alias.ready=true;s.players[0].front[0]=alias;
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===alias.uid),1);
 const filler=hold(s,0,'FILLER');filler.ready=true;s.players[0].front[1]=filler;
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===filler.uid),1);
 const rider=hold(s,0,'RIDER'),printed=hold(s,0,'PRINTED');
 const look=hold(s,0,'LOOK'),lookp=hold(s,0,'LOOKP');
 s=toMain(lab,s);
 const raids=()=>legalUniversalActions(lab,s).filter(a=>a.type==='raid');
 assert.ok(raids().some(a=>a.uid===rider.uid&&a.baseUid===alias.uid));
 assert.ok(raids().some(a=>a.uid===printed.uid&&a.baseUid===alias.uid));
 assert.ok(raids().some(a=>a.uid===look.uid&&a.baseUid===filler.uid));
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:filler.uid,
  targetUid:alias.uid,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(raids().some(a=>a.uid===rider.uid),false);
 assert.ok(raids().some(a=>a.uid===printed.uid&&a.baseUid===alias.uid));
 s.continuousStates=[];
 s=dispatchUniversalAction(lab,s,{type:'raid',uid:rider.uid,baseUid:alias.uid,slot:0});
 assert.equal(s.players[0].front[0].cardId,'RIDER');
 assert.equal(s.players[0].front[0].stack[0].cardId,'ALIAS');
 readyAp(s,0);
 assert.equal(legalUniversalActions(lab,s).some(a=>a.uid===look.uid&&a.type==='raid'),false);
 assert.ok(legalUniversalActions(lab,s).some(a=>a.uid===lookp.uid&&a.baseUid===filler.uid));
 assert.equal(assertUniversalMatch(lab,s),true);
});

test('a same-string name in another title stays a different card, and once-per-name uses the printed name',()=>{
 let s=newUniversalMatch([lab,other],{decks:[labDeck,otherDeck],seed:1946,first:0});
 const need=hold(s,0,'NEED');need.ready=true;s.players[0].energy[0]=need;
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===need.uid),1);
 const foreignCard=hold(s,1,'OTHER');foreignCard.ready=true;s.players[1].front[0]=foreignCard;
 s.players[1].hand.splice(s.players[1].hand.findIndex(c=>c.uid===foreignCard.uid),1);
 s=toMain([lab,other],s);
 assert.equal(foreignCard.cardId,'OTHER');
 assert.equal(universalBp([lab,other],s,need),2000);
 const alias=hold(s,0,'ALIAS');alias.ready=true;s.players[0].front[0]=alias;
 s.players[0].hand.splice(s.players[0].hand.findIndex(c=>c.uid===alias.uid),1);
 assert.equal(universalBp([lab,other],s,s.players[0].energy[0]),3000);
 assert.notEqual(alias.cardId,foreignCard.cardId);
 assert.equal(alias.uid.startsWith('0-'),true);
 assert.equal(foreignCard.uid.startsWith('1-'),true);
 const gate=hold(s,0,'GATE');
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction([lab,other],s,{type:'play',uid:gate.uid,line:'energy',slot:1});
 assert.equal(s.players[0].deck.length,before-1);
 assert.ok(s.onceEffectUses[0].includes('name:Alpha'));
 readyAp(s,0);
 const gateB=hold(s,0,'GATEB');
 const mid=s.players[0].deck.length;
 s=dispatchUniversalAction([lab,other],s,{type:'play',uid:gateB.uid,line:'energy',slot:2});
 assert.equal(s.players[0].deck.length,mid-1);
 assert.ok(s.onceEffectUses[0].includes('name:Beta'));
 assert.equal(s.onceEffectUses[0].includes('name:Alias'),false);
 readyAp(s,0);
 const again=hold(s,0,'GATE');
 const after=s.players[0].deck.length;
 s=dispatchUniversalAction([lab,other],s,{type:'play',uid:again.uid,line:'front',slot:1});
 assert.equal(s.players[0].deck.length,after);
 assert.equal(assertUniversalMatch([lab,other],s),true);
});

test('a printed alias cannot replace the card name or be declared vanilla',()=>{
 assert.throws(()=>createUniversalPack({id:'bad',cards:[
  unit('A',{name:'Same',nameAliases:['Same'],implementation:'dsl'})
 ]}),/name aliases/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[
  unit('A',{nameAliases:['Other']})
 ]}),/vanilla/);
});
