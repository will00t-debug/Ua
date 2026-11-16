// Shared placements already resolved by the reducer:
// REST from either line, then mill 1 or draw 1 and discard 1, with no ターン1.
// A lone character onPlay may look at the top card and put it on top or outside.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices} from '../dist/universal-v2/engine.mjs';

function face(extra){
 return {
  id:extra.id,name:extra.name||extra.id,color:'red',type:'character',
  energy:0,ap:1,bp:2000,gen:1,traits:[],trigger:null,
  implementation:'dsl',effects:{},...extra
 };
}
const bodies=[
 face({id:'ANY-MILL',mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'millTop',count:1}]}}),
 face({id:'ANY-DRAW',mainAbility:{op:'restSelfThen',frontOnly:false,then:[{op:'drawDiscard',count:1}]}}),
 face({id:'FRONT-MILL',mainAbility:{op:'restSelfThen',frontOnly:true,then:[{op:'millTop',count:1}]}}),
 face({id:'LOOK',effects:{onPlay:[{op:'peekTopOrOutside'}]}}),
 ...Array.from({length:12},(_,i)=>face({
  id:'FILL-'+String(i+1).padStart(2,'0'),implementation:'vanilla',bp:1000
 }))
];
const pack=createUniversalPack({id:'probe',version:'line-rest-top',cards:bodies});
function counts(){
 const spec={'ANY-MILL':2,'ANY-DRAW':2,'FRONT-MILL':2,'LOOK':2};
 let left=42;
 for(const card of bodies.filter(card=>card.id.startsWith('FILL-'))){
  const n=Math.min(4,left);
  spec[card.id]=n;left-=n;
 }
 assert.equal(left,0);
 return spec;
}
const decks=[counts(),counts()];
function pull(s,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[0][zone],index=cards.findIndex(c=>c.cardId===id);
  if(index>=0)return cards.splice(index,1)[0];
 }
 throw Error('Missing '+id);
}
function main(seed){
 let s=newUniversalMatch(pack,{decks,first:0,seed});
 for(let i=0;i<4&&s.phase!=='main';i++)s=dispatchUniversalAction(pack,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function seat(s,id,line,slot){
 const card=pull(s,id);
 card.ready=true;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[0][line][slot]=card;
 return card;
}

test('either-line REST mills one own top card and can be used again after another READY',()=>{
 let s=main(28);
 const miller=seat(s,'ANY-MILL','energy',0);
 assert.equal(assertUniversalMatch(pack,s),true);
 const top=s.players[0].deck[0].uid;
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>
  a.type==='activate'&&a.mode==='selfRestThen'&&a.uid===miller.uid));
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(s.players[0].outside.at(-1).uid,top);
 assert.equal(s.mainAbilityUsedUids.includes(miller.uid),false);
 const again=structuredClone(s);
 again.players[0].energy[0].ready=true;
 assert.ok(legalUniversalActions(pack,again).some(a=>a.uid===miller.uid&&a.mode==='selfRestThen'));
 let front=main(29);
 const frontCard=seat(front,'ANY-MILL','front',0);
 const frontTop=front.players[0].deck[0].uid;
 front=dispatchUniversalAction(pack,front,legalUniversalActions(pack,front).find(a=>
  a.type==='activate'&&a.uid===frontCard.uid));
 assert.equal(front.players[0].outside.at(-1).uid,frontTop);
});

test('a front-only REST mill still cannot be paid from the energy line',()=>{
 let s=main(30);
 const source=seat(s,'FRONT-MILL','energy',0);
 assert.equal(legalUniversalActions(pack,s).some(a=>a.uid===source.uid&&a.type==='activate'),false);
 const front=seat(s,'FRONT-MILL','front',0);
 assert.ok(legalUniversalActions(pack,s).some(a=>a.uid===front.uid&&a.mode==='selfRestThen'));
});

test('either-line REST then draws one and discards one hand card',()=>{
 let s=main(72);
 const source=seat(s,'ANY-DRAW','energy',1);
 const hand=s.players[0].hand.length;
 s=dispatchUniversalAction(pack,s,legalUniversalActions(pack,s).find(a=>
  a.type==='activate'&&a.uid===source.uid));
 assert.equal(s.players[0].energy[1].ready,false);
 assert.equal(s.pending.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,hand+1);
 const discard=s.players[0].hand[0].uid;
 s=dispatchUniversalAction(pack,s,{type:'chooseDiscard',uid:discard});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.some(c=>c.uid===discard),false);
 assert.equal(s.players[0].outside.some(c=>c.uid===discard),true);
});

test('a character onPlay shows the top card and places it on top or outside',()=>{
 let outside=main(25);
 const played=pull(outside,'LOOK');
 outside.players[0].hand.push(played);
 const top=outside.players[0].deck[0];
 outside=dispatchUniversalAction(pack,outside,{type:'play',uid:played.uid,line:'front',slot:0});
 assert.equal(outside.pending.kind,'private-top-or-outside');
 assert.equal(outside.pending.uid,top.uid);
 const own=universalPrivateChoices(pack,outside,0);
 assert.ok(own.options.every(option=>option.card.cardId===top.cardId));
 assert.equal(universalPrivateChoices(pack,outside,1),null);
 outside=dispatchUniversalAction(pack,outside,own.options.find(option=>option.action.mode==='outside').action);
 assert.equal(outside.players[0].outside.at(-1).uid,top.uid);
 let stay=main(26);
 const second=pull(stay,'LOOK');
 stay.players[0].hand.push(second);
 const kept=stay.players[0].deck[0].uid;
 stay=dispatchUniversalAction(pack,stay,{type:'play',uid:second.uid,line:'front',slot:1});
 stay=dispatchUniversalAction(pack,stay,
  universalPrivateChoices(pack,stay,0).options.find(option=>option.action.mode==='top').action);
 assert.equal(stay.pending,null);
 assert.equal(stay.players[0].deck[0].uid,kept);
 assert.throws(()=>createUniversalPack({id:'probe',version:'bad',cards:[
  face({id:'LATE',effects:{onRetire:[{op:'peekTopOrOutside'}]}})
 ]}),/top or outside look/);
});
