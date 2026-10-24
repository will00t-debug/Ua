import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// EX07BT/BLC-2-004. No card FAQ on the reviewed page.
// 黄4 / AP1 / BP4000 / 星十字騎士団 / 発生黄 / no trigger.
// 登場：己方場上有〈友哈巴赫〉且己方手牌少於敵方時，抽 1 張。
// The engine name is the printed ユーハバッハ. Hand size is every physical
// hand card, compared after this character has left the hand. Equal is not fewer.

const draw={op:'drawIfOwnNameAndHandFewer',name:'ユーハバッハ',count:1};
function card(id,extra={}){
 return {id,name:extra.name||id,color:'yellow',energy:extra.energy??0,ap:1,
  bp:extra.bp??1500,gen:1,type:extra.type||'character',traits:[],trigger:null,
  implementation:extra.effects||extra.nameAliases?'dsl':'vanilla',
  ...(extra.effects?{effects:extra.effects}:{}),
  ...(extra.nameAliases?{nameAliases:extra.nameAliases}:{})};
}
const fixtureCards=[
 card('SRC',{name:'源',effects:{onPlay:[draw]}}),
 card('NAME',{name:'ユーハバッハ'}),
 card('ALIAS',{name:'別字',nameAliases:['ユーハバッハ'],effects:{onPlay:[{op:'draw',count:1}]}}),
 card('FIELD',{name:'ユーハバッハ',type:'field',bp:0}),
 card('OTHER',{name:'別人'}),
 ...[0,1,2,3,4,5,6,7].map(i=>card('F'+i,{name:'補'+i}))
];
const fixturePack=createUniversalPack({id:'name-hand',cards:fixtureCards});
const decks=[Object.fromEntries(fixtureCards.map((c,i)=>[c.id,i===12?2:4])),
 Object.fromEntries(fixtureCards.map((c,i)=>[c.id,i===12?2:4]))];
const packs=[fixturePack,fixturePack];
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,physical,line,slot,ready=true){
 physical.ready=ready;
 physical.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=physical;
 return physical;
}
function toMain(s,use=packs){
 for(let n=0;n<6&&s.phase!=='main';n++)
  s=dispatchUniversalAction(use,s,legalUniversalActions(use,s).find(a=>a.type==='next'));
 return s;
}
function boot(){
 const s=toMain(newUniversalMatch(packs,{decks,seed:2004,first:0}));
 s.players[0].apCards[0].inPlay=true;s.players[0].apCards[0].ready=true;
 return s;
}
function setHand(s,p,n){
 const pl=s.players[p];
 while(pl.hand.length>n)pl.outside.push(pl.hand.pop());
 while(pl.hand.length<n)pl.hand.push(pl.deck.shift());
}
function play(s){
 const src=take(s,0,'SRC');
 setHand(s,0,s.players[0].hand.length);
 s.players[0].hand.push(src);
 const deckBefore=s.players[0].deck.length;
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'&&!a.replaceUid);
 assert.ok(action);
 return {s:dispatchUniversalAction(packs,s,action),deckBefore};
}

test('named hand-count draw rejects an unbounded comparison',()=>{
 assert.throws(()=>createUniversalPack({id:'bad',cards:[card('BAD',{name:'源',effects:{onPlay:[
  {...draw,name:''}]}})]}));
 assert.throws(()=>createUniversalPack({id:'bad',cards:[card('BAD',{name:'源',effects:{onAttack:[draw]}})]}));
});

test('draw requires both the own field name and a strictly smaller hand',()=>{
 let s=boot();
 const named=place(s,0,take(s,0,'NAME'),'energy',0,false);
 place(s,0,take(s,0,'FIELD'),'energy',1,false);
 place(s,1,take(s,1,'NAME'),'front',0,true);
 const src=take(s,0,'SRC');
 setHand(s,0,1);setHand(s,1,1);
 s.players[0].hand.push(src);
 let deckBefore=s.players[0].deck.length;
 let action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].deck.length,deckBefore);
 s.players[0].apCards[0].ready=true;
 const again=take(s,0,'SRC');
 setHand(s,0,1);setHand(s,1,3);
 s.players[0].hand.push(again);
 deckBefore=s.players[0].deck.length;
 action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===again.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(s.pending,null);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const alias=place(s,0,take(s,0,'ALIAS'),'front',3,true);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:0,sourceUid:alias.uid,
  targetUid:alias.uid,sourceLinked:false,until:{player:0,phase:'attack',edge:'end'}});
 const third=take(s,0,'SRC');
 setHand(s,0,0);setHand(s,1,2);
 s.players[0].outside.push(s.players[0].energy[0]);
 s.players[0].energy[0]=null;
 s.players[0].hand.push(third);
 s.players[0].apCards[0].ready=true;
 deckBefore=s.players[0].deck.length;
 action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===third.uid&&a.line==='energy');
 assert.ok(action);
 s=dispatchUniversalAction(packs,s,action);
 assert.equal(s.players[0].deck.length,deckBefore);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});

const bleach=registeredV2TitlePack('bleach');
test('BLC-2-004 draws only for live ユーハバッハ and a smaller own hand',()=>{
 const source=CARDS.find(c=>c.identity==='BLC-2-004');
 const printed=bleach.cards['BLC-2-004'];
 assert.equal(source.effect,'登場：己方場上有〈友哈巴赫〉且己方手牌少於敵方時，抽 1 張。');
 assert.equal(printed.effects.onPlay[0].name,'ユーハバッハ');
 assert.equal(printed.energy,4);
 assert.equal(printed.gen,1);
 assert.equal(printed.bp,4000);
 assert.equal(printed.trigger??null,null);
 assert.equal(EXPECTED_V2_IDS.bleach.includes('BLC-2-004'),true);
 assert.equal(bleach.cards['BLC-1-021'].name,'ユーハバッハ');
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&
  !['BLC-2-004','BLC-1-021','BLC-1-001'].includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=['BLC-2-004','BLC-1-021','BLC-1-001',...rest.slice(0,10)];
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 const use=[bleach,bleach];
 let s=toMain(newUniversalMatch(use,{decks:[counts,counts],seed:2004,first:0}),use);
 s.players[0].apCards.forEach(c=>{c.inPlay=true;c.ready=true;});
 place(s,0,take(s,0,'BLC-1-021'),'energy',0,false);
 for(let i=1;i<4;i++)place(s,0,take(s,0,'BLC-1-001'),'energy',i,true);
 const src=take(s,0,'BLC-2-004');
 setHand(s,0,2);setHand(s,1,2);
 s.players[0].hand.push(src);
 let deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(use,s,legalUniversalActions(use,s).find(a=>a.type==='play'&&a.uid===src.uid&&a.line==='front'));
 assert.equal(s.players[0].deck.length,deckBefore);
 const second=take(s,0,'BLC-2-004');
 setHand(s,0,1);setHand(s,1,4);
 s.players[0].hand.push(second);
 s.players[0].apCards[0].ready=true;
 deckBefore=s.players[0].deck.length;
 s=dispatchUniversalAction(use,s,legalUniversalActions(use,s).find(a=>a.type==='play'&&a.uid===second.uid&&a.line==='front'));
 assert.equal(s.players[0].deck.length,deckBefore-1);
 assert.equal(assertUniversalMatch(use,structuredClone(s)),true);
});
