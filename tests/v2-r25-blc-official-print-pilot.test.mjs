import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,universalBp,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const source=CARDS.find(c=>c.identity==='BLC-2-019'),event=CARDS.find(c=>c.identity==='BLC-2-047');
assert.ok(source&&event,'official ID source data');
const sourceName=source.nameJa;
const payment={zone:'hand',field:'name',match:'containsAny',values:['斬月','月牙']};
const defs=Array.from({length:13},(_,i)=>({
 id:i===0?'BLC-2-019':i===1?'BLC-2-047':i===2?'BASE':'F'+i,
 name:i===0?sourceName:i===1?event.nameJa:i===2?sourceName:'Utility '+i,
 type:i===1?'event':'character',color:'blue',energy:i===0?source.energy:i===1?event.energy:0,
 ap:1,bp:i===0?source.bp:i===1?0:3000,gen:i===1?0:1,
 implementation:i<2?'dsl':'vanilla',
 ...(i===0?{trigger:'raid',raidName:sourceName,
  effects:{onPlay:[{op:'enemyBpDown',bp:1500,minBp:2000,maxTargets:2,optional:true}]},
  mainAbility:{op:'frontOnceProgram',frontOnly:true,oncePerTurn:true,
   then:[{op:'discardGate',optional:false,payment,then:[
    {op:'draw',count:1},{op:'buffSelf',bp:1000},
    {op:'grantOnAttack',target:'self',optional:true,until:'endOfTurn',then:[{op:'draw',count:1}]}
   ]}]}}:{}),
 ...(i===1?{effects:{onPlay:[{op:'draw',count:2}]},
  moveTriggers:[{when:{from:'hand',to:'outside',sourceName,sourceColor:'blue',
   sourceOnField:true,reasons:['payment','own-effect']},then:[{op:'draw',count:1}]}]}:{})
}));
const pack=createUniversalPack({id:'blc-019-047-source-pilot-unregistered',cards:defs}),packs=[pack,pack];
const deck=Object.fromEntries(defs.map((d,i)=>[d.id,i===12?2:4]));
function pull(s,p,id){
 for(const zone of ['deck','hand','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }throw Error('missing '+id);
}
function prepared(withRaid){
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:25047});
 const raid=pull(s,0,'BLC-2-019'),base=pull(s,0,'BASE');
 s.players[0].hand.push(raid);base.ready=false;s.players[0].front[0]=base;
 for(const [i,id] of ['F3','F4','F5','F6'].entries()){
  const e=pull(s,0,id);e.ready=true;s.players[0].energy[i]=e;
 }
 for(const [i,id] of ['F7','F8'].entries()){
  const e=pull(s,1,id);e.ready=true;s.players[1].front[i]=e;
 }
 s=dispatchUniversalAction(packs,s,{type:'next'});
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return {s,raid,base};
}
test('official 019/047 source signatures are locked; neither is prematurely registered',()=>{
 assert.deepEqual([source.nameJa,source.color,source.energy,source.ap,source.bp,source.gen,source.type,source.trigger],
  ['黒崎 一護','blue',4,1,4000,1,'character','raid']);
 assert.deepEqual([event.nameJa,event.color,event.energy,event.ap,event.type,event.trigger],
  ['その名は斬月','blue',2,1,'event',null]);
 assert.ok(source.effect.includes('斬月')&&source.effect.includes('月牙')&&source.effect.includes('1500'));
 assert.ok(event.effect.includes('抽 2 張')&&event.effect.includes('抽 1 張'));
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
 assert.equal(registeredV2TitlePack('bleach').cards['BLC-2-019'],undefined);
 assert.equal(registeredV2TitlePack('bleach').cards['BLC-2-047'],undefined);
});
test('official-anchored pilot: 4 blue energy and 1 AP legal Raid plus two exact eligible BP targets',()=>{
 let {s,raid,base}=prepared(true);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='raid'&&a.uid===raid.uid&&a.baseUid===base.uid);
 assert.ok(action,'Raid requires the printed energy and an actual compatible base');
 const ap=s.players[0].apCards.filter(x=>x.ready).length;
 s=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(s.players[0].apCards.filter(x=>x.ready).length,ap-1);
 assert.equal(s.players[0].front[0].uid,raid.uid);
 assert.equal(s.players[0].front[0].stack[0].uid,base.uid);
 assert.equal(s.pending.kind,'effect-target-many');
 const uids=s.players[1].front.slice(0,2).map(c=>c.uid);
 for(const uid of uids)s=dispatchUniversalAction(packs,s,{type:'chooseTargetMany',uid},{actor:0});
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[1].front.slice(0,2).map(c=>universalBp(packs,s,c)),[1500,1500]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('official-anchored pilot: ordinary AP-paid 047 event draws two, not movement bonus',()=>{
 let {s}=prepared();
 const eventCard=pull(s,0,'BLC-2-047');s.players[0].hand.push(eventCard);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===eventCard.uid);
 assert.ok(action);
 const before=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(s.players[0].deck.length,before-2);
 const moves=s.zoneMoveEvents.filter(x=>x.sourceUid===eventCard.uid&&x.from==='deck'&&x.to==='hand');
 assert.equal(moves.length,2);
 assert.equal(s.players[0].outside.some(x=>x.uid===eventCard.uid),true);
 assert.equal(assertUniversalMatch(packs,s),true);
});
