// Shared sentences added for the EVA prints that had no existing profile.
// Each probe is title-agnostic: trigger icons, Raid names, colors, and
// printed energy are ordinary card fields.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPrivateChoices,zoneRequiredEnergy,universalPublicView,
 universalImpact,universalImpactNull} from '../dist/universal-v2/engine.mjs';

function face(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:extra.color||'red',type:extra.type||'character',
  energy:extra.energy??0,ap:extra.ap??1,bp:extra.bp??2000,gen:extra.gen??1,
  traits:extra.traits||[],trigger:extra.trigger===undefined?null:extra.trigger,
  implementation:extra.implementation||'dsl',effects:extra.effects||{},...extra
 };
}
const probes=[
 face({id:'SEARCH',effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:4,logic:'all',filters:[
  {field:'trigger',value:'get'},{field:'type',value:'character'}
 ]}]}}),
 face({id:'ORSEARCH',effects:{onPlay:[{op:'searchTopOneBottomDiscard',count:3,groups:[
  {logic:'all',filters:[{field:'nameIncludes',value:'2号機'},{field:'type',value:'character'}]},
  {logic:'all',filters:[{field:'noTrigger',value:true},{field:'type',value:'character'}]}
 ]}]}}),
 face({id:'ENTRY',bp:3000,passiveBonuses:[{condition:{
  kind:'ownTriggerEnteredThisTurn',turn:'own',trigger:'get'},bp:1000}]}),
 face({id:'IMPACT',passiveBonuses:[{condition:{
  kind:'ownTriggerlessAtLeast',turn:'any',min:4,zone:'field'},impact:1}],impactNull:true}),
 face({id:'DRAWX',type:'event',bp:0,effects:{onPlay:[{
  op:'drawThenIfTriggerless',count:2,min:4,extra:1}]}}),
 face({id:'DEPLOY',type:'event',bp:0,effects:{onPlay:[{
  op:'deployOutsideNameRest',name:'碇 シンジ',color:'purple',includeRaid:true,optional:false}]}}),
 face({id:'NAMEONLY',type:'event',bp:0,effects:{onPlay:[{
  op:'deployOutsideNameRest',name:'碇 シンジ',optional:true}]}}),
 face({id:'RESTCOLOR',color:'yellow',mainAbility:{
  op:'restRetireThen',then:[{op:'activeOwnColor',color:'yellow'}]}}),
 face({id:'RESTRECOVER',mainAbility:{op:'restRetireThen',then:[{
  op:'recoverOutsideOne',optional:false,logic:'any',filters:[
   {field:'name',value:'碇 シンジ'},{field:'trait',value:'WILLE'}]}]}}),
 face({id:'RETIRENAME',effects:{onPlay:[{
  op:'optionalRetireOwnOtherThen',name:'式波・アスカ・ラングレー',
  then:[{op:'activeSelf'},{op:'draw',count:1}]}]}}),
 face({id:'RESTRAID',type:'event',bp:0,effects:{onPlay:[{
  op:'restOppFrontOne',optional:false,drawIfNoRaid:true}]}}),
 face({id:'DISCARDREC',type:'field',bp:0,effects:{onPlay:[{
  op:'discardGate',optional:true,then:[{
   op:'recoverOutsideFiltered',color:'yellow',type:'character',energyAtMost:3,
   optional:true,max:1}]}]}}),
 face({id:'RESTDRAW',type:'field',bp:0,mainAbility:{
  op:'restRetireThen',then:[{op:'draw',count:1}]}}),
 face({id:'LOOKRED',effects:{onPlay:[{
  op:'inspectTopTraitOutside',count:2,noTriggerColor:'red',rest:'top'}]}}),
 face({id:'PEEK',energy:2,emptyOwnFieldHandEnergyDiscount:2,effects:{onPlay:[{
  op:'peekTopTriggerlessMayHand'}]}}),
 face({id:'RETIREPER',type:'event',bp:0,effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:2000,triggerlessPer:1000}]}}),
 face({id:'RETIREOR',type:'event',bp:0,effects:{onPlay:[{
  op:'retireOppFrontUnderBp',bp:3000,bonusBp:5000,
  bonusNameOrIncludes:{name:'碇 シンジ',includes:'初号機'}}]}}),
 face({id:'APOR',type:'event',ap:2,bp:0,handApDiscountWhileAnyNames:{
  names:['碇 シンジ','エヴァンゲリオン第13号機'],amount:1},
  effects:{onPlay:[{op:'retireOppFrontUnderBp',bp:5000}]}}),
 face({id:'RETIRECHOOSE',effects:{onPlay:[{op:'optionalRetireOwnOtherThen',then:[{
  op:'chooseOne',optional:false,options:[
   {id:'draw2',label:'カードを2枚引く',turn:'any',then:[{op:'draw',count:2}]},
   {id:'drawActive',label:'1枚引いてアクティブ',turn:'any',then:[
    {op:'draw',count:1},{op:'activeOwnOne',optional:true}]}
  ]}]}]}}),
 face({id:'ENERGYACT',type:'field',bp:0,mainAbility:{op:'activeEnergyOnce',oncePerTurn:true}}),
 face({id:'OUTCUT',energy:4,handOutsideEnergyDiscount:2,passiveBonuses:[{condition:{
  kind:'ownOtherCardEnergyAtLeast',turn:'own',minEnergy:5,min:1,zone:'field',excludeSelf:true
 },bp:1000}]}),
 face({id:'OLDRAW',mainAbility:{op:'restRetireThen',then:[{op:'drawDiscard',count:1}]}}),
 face({id:'GETTER',name:'碇 シンジ',color:'purple',trigger:'get',traits:['WILLE'],implementation:'vanilla'}),
 face({id:'RAIDSHINJI',name:'碇 シンジ',color:'purple',raidName:'初号機',implementation:'vanilla'}),
 face({id:'ASUKA',name:'式波・アスカ・ラングレー',implementation:'vanilla'}),
 face({id:'UNIT1',name:'エヴァンゲリオン初号機',implementation:'vanilla'}),
 face({id:'UNIT2',name:'エヴァンゲリオン2号機',implementation:'vanilla'}),
 face({id:'ZERO',name:'エヴァンゲリオン零号機',implementation:'vanilla'}),
 face({id:'FIELD5',type:'field',bp:0,energy:5,implementation:'vanilla'}),
 face({id:'YELLOW',color:'yellow',implementation:'vanilla'}),
 face({id:'REDOPEN',color:'red',trigger:null,implementation:'vanilla'}),
 face({id:'REDTRIG',color:'red',trigger:'draw',implementation:'vanilla'}),
 face({id:'PLAIN',implementation:'vanilla'}),
 ...Array.from({length:5},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000
 }))
];
const pack=createUniversalPack({id:'probe',version:'eva-new-abilities',cards:probes});
function counts(){
 const spec={};
 for(const card of probes)spec[card.id]=card.id.startsWith('FILL-')?0:1;
 spec['FILL-01']=4;spec['FILL-02']=4;spec['FILL-03']=4;spec['FILL-04']=4;spec['FILL-05']=1;
 assert.equal(Object.values(spec).reduce((n,v)=>n+v,0),50);
 return spec;
}
const decks=[counts(),counts()];
function pull(s,id,player=0){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[player][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function main(seed){
 let s=newUniversalMatch(pack,{decks,first:0,seed});
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 for(const ap of s.players[0].apCards){ap.inPlay=true;ap.ready=true;}
 return s;
}
function seat(s,id,line,slot,player=0){
 const card=pull(s,id,player);
 card.ready=line==='front'?false:true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[player][line][slot]=card;
 return card;
}
function play(s,id,line='front',slot=0){
 const card=pull(s,id);
 s.players[0].hand.push(card);
 return dispatchUniversalAction(pack,s,{type:'play',uid:card.uid,line,slot});
}
function cast(s,id){
 const card=pull(s,id);
 s.players[0].hand.push(card);
 return dispatchUniversalAction(pack,s,{type:'event',uid:card.uid});
}
function frontBp(s,uid){
 const row=universalPublicView(pack,s,0).players[0].front.find(c=>c?.uid===uid);
 assert.ok(row);
 return row.bp;
}

test('a get-trigger character search shows the whole top window',()=>{
 let s=main(4);
 const window=['GETTER','PLAIN','REDTRIG','UNIT2'].map(id=>pull(s,id));
 s.players[0].deck.unshift(...window);
 s=play(s,'SEARCH');
 assert.equal(s.pending.kind,'effect-top-filter-choice');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.deepEqual(s.pending.choices,[window[0].uid]);
 const shown=universalPrivateChoices(pack,s,0);
 assert.equal(shown.options.length>1,true);
 s=dispatchUniversalAction(pack,s,{type:'chooseTopFiltered',uid:window[0].uid});
 assert.equal(s.players[0].hand.some(c=>c.uid===window[0].uid),true);
});

test('a grouped search accepts a name fragment or a triggerless character',()=>{
 let s=main(5);
 const window=['UNIT2','REDOPEN','REDTRIG'].map(id=>pull(s,id));
 s.players[0].deck.unshift(...window);
 s=play(s,'ORSEARCH');
 assert.deepEqual(s.pending.uids,window.map(c=>c.uid));
 assert.deepEqual(s.pending.choices.slice().sort(),[window[0].uid,window[1].uid].sort());
});

test('BP rises after a get-trigger character enters on the owner turn',()=>{
 let s=main(6);
 const host=seat(s,'ENTRY','front',0);
 host.ready=true;
 assert.equal(frontBp(s,host.uid),3000);
 s=play(s,'GETTER','energy',0);
 assert.equal(frontBp(s,host.uid),4000);
 const opponent=structuredClone(s);
 opponent.active=1;
 assert.equal(frontBp(opponent,host.uid),3000);
});

test('impact is gained at four triggerless field cards and impact null stays',()=>{
 let s=main(7);
 const host=seat(s,'IMPACT','front',0);
 assert.equal(universalImpactNull(pack,s,host),true);
 assert.equal(universalImpact(pack,s,host),0);
 seat(s,'PLAIN','front',1);
 seat(s,'REDOPEN','energy',0);
 assert.equal(universalImpact(pack,s,host),0);
 seat(s,'UNIT2','energy',1);
 assert.equal(universalImpact(pack,s,host),1);
});

test('two cards are drawn and a fourth triggerless card draws one more',()=>{
 let s=main(8);
 const before=s.players[0].hand.length;
 s=cast(s,'DRAWX');
 assert.equal(s.players[0].hand.length,before+2);
 seat(s,'PLAIN','front',0);
 seat(s,'REDOPEN','front',1);
 seat(s,'UNIT2','energy',0);
 seat(s,'ZERO','energy',1);
 const again=s.players[0].hand.length;
 s=cast(s,'DRAWX');
 assert.equal(s.players[0].hand.length,again+3);
});

test('a colored name enters at REST including a Raid print, and the name-only shape still skips',()=>{
 let s=main(9);
 const raid=pull(s,'RAIDSHINJI');
 s.players[0].outside.push(raid);
 s=cast(s,'DEPLOY');
 assert.equal(s.pending.kind,'effect-outside-name-rest');
 assert.equal(s.pending.mandatory,true);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===null),false);
 s=dispatchUniversalAction(pack,s,{type:'chooseOutsideNameRest',uid:raid.uid,line:'front',slot:0});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 let named=main(10);
 const raidOnly=pull(named,'RAIDSHINJI');
 named.players[0].outside.push(raidOnly);
 named=cast(named,'NAMEONLY');
 assert.equal(named.pending,null);
 const plain=pull(named,'GETTER');
 named.players[0].outside.push(plain);
 named=cast(named,'NAMEONLY');
 assert.equal(named.pending.choices.includes(plain.uid),true);
 assert.equal(named.pending.choices.includes(raidOnly.uid),false);
 assert.equal(legalUniversalActions(pack,named).some(a=>a.uid===null),true);
});

test('REST and retire can activate a color with an empty deck, while draw-discard still needs a card',()=>{
 let s=main(11);
 const source=seat(s,'RESTCOLOR','front',0);
 source.ready=true;
 const other=seat(s,'YELLOW','energy',0);
 other.ready=false;
 const pl=s.players[0];
 pl.outside.push(...pl.hand.splice(0),...pl.deck.splice(0));
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===source.uid&&a.mode==='restRetireThen'),true);
 s=dispatchUniversalAction(pack,s,{type:'activate',uid:source.uid,mode:'restRetireThen'});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.pending.kind,'effect-active-character');
 assert.deepEqual(s.pending.choices,[other.uid]);
 let gated=main(12);
 const older=seat(gated,'OLDRAW','energy',0);
 older.ready=true;
 const held=gated.players[0];
 held.outside.push(...held.hand.splice(0),...held.deck.splice(0));
 assert.equal(legalUniversalActions(pack,gated).some(a=>a.uid===older.uid),false);
});

test('declining a named retirement does not activate or draw',()=>{
 let s=main(13);
 const asuka=seat(s,'ASUKA','front',0);
 asuka.ready=false;
 const before=s.players[0].hand.length;
 s=play(s,'RETIRENAME','front',1);
 assert.deepEqual(s.pending.choices,[asuka.uid]);
 s=dispatchUniversalAction(pack,s,{type:'chooseRetireOwnOther',uid:null});
 assert.equal(s.players[0].front[0].uid,asuka.uid);
 assert.equal(s.players[0].front[1].ready,false);
 assert.equal(s.players[0].hand.length,before);
});

test('a rested character is drawn for only when it has no Raid keyword',()=>{
 let s=main(14);
 const raid=seat(s,'RAIDSHINJI','front',0,1);
 const before=s.players[0].hand.length;
 s=cast(s,'RESTRAID');
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>a.uid===raid.uid));
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.players[0].hand.length,before);
 let open=main(15);
 const plain=seat(open,'PLAIN','front',0,1);
 const held=open.players[0].hand.length;
 open=cast(open,'RESTRAID');
 open=dispatchUniversalAction(pack,open,legalUniversalActions(pack,open).find(a=>a.uid===plain.uid));
 assert.equal(open.players[0].hand.length,held+1);
});

test('a paid discard recovers only a yellow character at the printed energy',()=>{
 let s=main(16);
 const yellow=pull(s,'YELLOW');
 const field=pull(s,'FIELD5');
 s.players[0].outside.push(yellow,field);
 s=play(s,'DISCARDREC','energy',0);
 assert.equal(s.pending.kind,'effect-discard-gate');
 const discard=s.players[0].hand[0].uid;
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscardGate',uid:discard});
 assert.equal(s.pending.choices.includes(yellow.uid),true);
 assert.equal(s.pending.choices.includes(field.uid),false);
});

test('the top window shows an ineligible card and only a triggerless red card can leave',()=>{
 let s=main(17);
 const open=pull(s,'REDOPEN'),triggered=pull(s,'REDTRIG');
 s.players[0].deck.unshift(open,triggered);
 s=play(s,'LOOKRED');
 assert.deepEqual(s.pending.uids,[open.uid,triggered.uid]);
 assert.deepEqual(s.pending.choices,[open.uid]);
 const shown=universalPrivateChoices(pack,s,0);
 assert.equal(shown.inspected.some(card=>card.cardId==='REDTRIG'),true);
 assert.equal(shown.options.some(option=>option.action.uid===triggered.uid),false);
});

test('a triggerless top card may be revealed to hand and a triggered card stays on top',()=>{
 let s=main(18);
 const open=pull(s,'REDOPEN');
 s.players[0].deck.unshift(open);
 s=play(s,'PEEK');
 assert.equal(s.pending.kind,'private-top-triggerless-hand');
 assert.equal(s.pending.mayHand,true);
 assert.equal(universalPrivateChoices(pack,s,1),null);
 const own=universalPrivateChoices(pack,s,0);
 assert.equal(own.options.some(option=>option.action.mode==='hand'),true);
 s=dispatchUniversalAction(pack,s,own.options.find(option=>option.action.mode==='hand').action);
 assert.equal(s.players[0].hand.some(c=>c.uid===open.uid),true);
 assert.equal(s.publicReveals.some(reveal=>reveal.uid===open.uid),true);
 let closed=main(19);
 const triggered=pull(closed,'REDTRIG');
 closed.players[0].deck.unshift(triggered);
 closed=play(closed,'PEEK');
 assert.equal(closed.pending.mayHand,false);
 assert.equal(legalUniversalActions(pack,closed).some(a=>a.mode==='hand'),false);
 closed=dispatchUniversalAction(pack,closed,{type:'chooseTopTriggerless',mode:'top'});
 assert.equal(closed.players[0].deck[0].uid,triggered.uid);
});

test('retirement ceilings follow triggerless cards and a name or a name fragment',()=>{
 let s=main(20);
 seat(s,'PLAIN','front',0,1);
 s=cast(s,'RETIREPER');
 assert.equal(s.pending.limit,2000);
 let raised=main(21);
 seat(raised,'PLAIN','front',0,1);
 seat(raised,'REDOPEN','front',0);
 raised=cast(raised,'RETIREPER');
 assert.equal(raised.pending.limit,3000);
 let named=main(22);
 seat(named,'PLAIN','front',0,1);
 named=cast(named,'RETIREOR');
 assert.equal(named.pending.limit,3000);
 let unit=main(23);
 seat(unit,'PLAIN','front',0,1);
 seat(unit,'UNIT1','front',0);
 unit=cast(unit,'RETIREOR');
 assert.equal(unit.pending.limit,5000);
});

test('either printed name reduces the event AP and the event can still be played without one',()=>{
 let s=main(24);
 const event=pull(s,'APOR');
 s.players[0].hand.push(event);
 seat(s,'PLAIN','front',0,1);
 for(const ap of s.players[0].apCards)ap.ready=false;
 s.players[0].apCards[0].ready=true;
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 seat(s,'GETTER','front',0);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.type==='event'&&a.uid===event.uid),true);
});

test('an energy-line card, including a field, can be activated once per turn',()=>{
 let s=main(25);
 const source=seat(s,'ENERGYACT','energy',0);
 const field=seat(s,'FIELD5','energy',1);
 field.ready=false;
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===source.uid&&a.mode==='activeEnergyOnce'),true);
 s=dispatchUniversalAction(pack,s,{type:'activate',uid:source.uid,mode:'activeEnergyOnce'});
 assert.equal(s.pending.anyCard,true);
 assert.equal(s.pending.choices.includes(field.uid),true);
 s=dispatchUniversalAction(pack,s,{type:'chooseActiveCharacter',uid:field.uid});
 assert.equal(s.players[0].energy[1].ready,true);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===source.uid&&a.mode==='activeEnergyOnce'),false);
});

test('hand and outside energy drop together and another card of energy 5 raises BP',()=>{
 let s=main(26);
 const printed=pack.cards.OUTCUT;
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'outside'),2);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),4);
 const host=seat(s,'OUTCUT','front',0);
 assert.equal(frontBp(s,host.uid),2000);
 seat(s,'FIELD5','energy',0);
 assert.equal(frontBp(s,host.uid),3000);
 const away=structuredClone(s);
 away.active=1;
 assert.equal(frontBp(away,host.uid),2000);
});

test('retiring the named character activates this card and draws',()=>{
 let s=main(31);
 const asuka=seat(s,'ASUKA','front',0);
 asuka.ready=false;
 const before=s.players[0].hand.length;
 s=play(s,'RETIRENAME','front',1);
 s=dispatchUniversalAction(pack,s,{type:'chooseRetireOwnOther',uid:asuka.uid});
 assert.equal(s.players[0].front[0],null);
 assert.equal(s.players[0].front[1].ready,true);
 assert.equal(s.players[0].hand.length,before+1);
});

test('retiring another character opens the printed draw choice',()=>{
 let s=main(32);
 const other=seat(s,'PLAIN','front',0);
 s=play(s,'RETIRECHOOSE','front',1);
 s=dispatchUniversalAction(pack,s,{type:'chooseRetireOwnOther',uid:other.uid});
 assert.equal(s.pending.kind,'effect-choice-mode');
 const held=s.players[0].hand.length;
 s=dispatchUniversalAction(pack,s,{type:'chooseEffectMode',mode:'draw2'});
 assert.equal(s.players[0].hand.length,held+2);
});

test('an empty field cuts only the hand energy of the look card',()=>{
 let s=main(27);
 const printed=pack.cards.PEEK;
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),0);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'life'),2);
 seat(s,'PLAIN','energy',0);
 assert.equal(zoneRequiredEnergy(pack,s,0,printed,'hand'),2);
});
