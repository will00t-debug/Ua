import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalEnergyByColor,universalPublicView,universalPrivateChoices}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {publicPreviewActionLabel} from '../dist/universal-v2/preview-replay.mjs';

// Card image checked 2026-10-25.
// UA08BT/BLC-1-063 技術開発局
//   紫2 / AP1 / イベント / 発生なし / DRAW
//   自分の山札の上から5枚見る。その中から1枚を手札に加え、1枚を場外に置く。
//   残りを望む順で自分の山札の下に置く。
//   見る is private. Both destinations are mandatory and distinct.
//   A looked window shorter than 2 cards stays in printed order.
//   Bottom order: the first chosen sits higher; the last chosen is the bottom.
//   DRAW stays the generic life trigger. fullyAccepted stays 0.

const bleach=registeredV2TitlePack('bleach');
const WINDOW=['BLC-1-039','BLC-1-048','BLC-1-057','BLC-1-107','BLC-1-034'];
function realDeck(required,color){
 const rest=Object.values(bleach.cards).filter(c=>c.color===color&&c.maxCopies===4&&
  !required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const built=[...required,...rest.slice(0,13-required.length)];
 assert.equal(built.length,13);
 const counts=Object.fromEntries(built.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const purple=realDeck(['BLC-1-063','BLC-1-037','BLC-1-045',...WINDOW],'purple');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function put(s,p,id,line,index,ready=true){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][index]=c;return c;
}
function hold(s,p,id){
 const c=take(s,p,id);
 s.players[p].hand.push(c);
 return c;
}
function stack(s,ids){
 for(const id of [...ids].reverse())s.players[0].deck.unshift(take(s,0,id));
}
function main(deck,seed,first=0){
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[deck,deck],seed,first});
 for(let n=0;n<8&&!(s.phase==='main'&&s.active===first);n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 assert.equal(s.active,first);
 return {packs,s};
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function fuel(s){
 put(s,0,'BLC-1-037','energy',0,true);
 put(s,0,'BLC-1-045','energy',1,true);
}
function shell(extra){
 return {id:'BAD',name:'BAD',color:'purple',energy:2,ap:1,bp:0,gen:0,traits:[],
  trigger:'draw',implementation:'dsl',effects:{},...extra};
}
function parkExcept(s,keep){
 const deck=s.players[0].deck,kept=[];
 for(const id of keep){
  const i=deck.findIndex(c=>c.cardId===id);
  assert.ok(i>=0,id);
  kept.push(deck.splice(i,1)[0]);
 }
 s.players[0].outside.push(...deck.splice(0));
 deck.push(...kept);
}

test('BLC-1-063 looks at five cards, adds one to hand, one to outside, and orders the rest to the bottom',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-1-063');
 assert.equal(printed.effect,'查看己方牌堆頂 5 張，其中 1 張加入手牌、1 張送至場外，其餘以任意順序放至牌堆底。');
 assert.equal(printed.nameJa,'技術開発局');
 assert.equal(printed.gen,0);
 assert.equal(printed.type,'event');
 const card=bleach.cards['BLC-1-063'];
 assert.equal(card.gen,0);
 assert.equal(card.step,false);
 assert.equal(card.trigger,'draw');
 assert.equal(card.triggerEffect,null);
 assert.deepEqual(card.traits,[]);
 assert.deepEqual(card.effects.onPlay,[{op:'inspectTopHandOutsideBottom',count:5}]);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'event',effects:{onPlay:[
  {op:'inspectTopHandOutsideBottom',count:4}]}})]}),
  /invalid top hand and outside split/);
 assert.throws(()=>createUniversalPack({id:'bad',cards:[shell({type:'character',bp:1000,gen:1,effects:{onPlay:[
  {op:'inspectTopHandOutsideBottom',count:5}]}})]}),
  /top hand-and-outside split is only an event onPlay effect/);

 const openedMatch=main(purple,291063);
 fuel(openedMatch.s);
 assert.ok((universalEnergyByColor(openedMatch.packs,openedMatch.s,0).purple||0)>=2);
 const event=hold(openedMatch.s,0,'BLC-1-063');
 stack(openedMatch.s,WINDOW);
 const under=openedMatch.s.players[0].deck.slice(5).map(c=>c.uid);
 const reveals=openedMatch.s.publicReveals.length;
 assert.ok(legalUniversalActions(openedMatch.packs,openedMatch.s).some(a=>a.type==='event'&&a.uid===event.uid));
 let opened=dispatchUniversalAction(openedMatch.packs,openedMatch.s,{type:'event',uid:event.uid});
 assert.equal(opened.players[0].outside.some(c=>c.uid===event.uid),true);
 assert.equal(opened.pending.kind,'effect-top-hand-outside');
 assert.equal(opened.pending.step,'hand');
 assert.deepEqual(opened.pending.uids,opened.players[0].deck.slice(0,5).map(c=>c.uid));
 assert.deepEqual(opened.players[0].deck.slice(0,5).map(c=>c.cardId),WINDOW);
 assert.equal(opened.publicReveals.length,reveals);
 const own=universalPrivateChoices(openedMatch.packs,opened,0);
 assert.equal(own.options.length,5);
 assert.deepEqual(own.options.map(x=>x.card.cardId),WINDOW);
 assert.equal(own.options.every(x=>x.action.type==='chooseTopHandOutside'&&x.action.place==='hand'),true);
 assert.equal(universalPrivateChoices(openedMatch.packs,opened,1),null);
 const hidden=universalPublicView(openedMatch.packs,opened,1);
 assert.deepEqual(hidden.pending,{kind:'effect-top-hand-outside',player:0});
 assert.equal(hidden.players[0].hand,null);
 const journal=publicPreviewActionLabel(openedMatch.packs,opened,opened,
  {type:'chooseTopHandOutside',uid:opened.pending.uids[0],place:'hand'},1);
 assert.equal(journal.includes(WINDOW[0]),false);
 assert.equal(journal.includes(bleach.cards[WINDOW[0]].name),false);
 assert.match(journal,/私密/);
 const legal=legalUniversalActions(openedMatch.packs,opened);
 assert.equal(legal.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(openedMatch.packs,opened,
  {type:'chooseTopHandOutside',uid:opened.players[0].deck[5].uid,place:'hand'}),
  /not currently legal/);
 assert.throws(()=>dispatchUniversalAction(openedMatch.packs,opened,
  {type:'chooseTopHandOutside',uid:opened.pending.uids[0],place:'outside'}),
  /not currently legal/);
 aiOk(openedMatch.packs,opened);
 assert.equal(assertUniversalMatch(openedMatch.packs,opened),true);
 const forged={...opened,pending:{...opened.pending,uids:[...opened.pending.uids].reverse()}};
 assert.throws(()=>assertUniversalMatch(openedMatch.packs,forged),/Unproven top hand and outside split/);

 const handUid=opened.pending.uids[0],outsideUid=opened.pending.uids[1];
 let outsideStep=dispatchUniversalAction(openedMatch.packs,opened,
  {type:'chooseTopHandOutside',uid:handUid,place:'hand'});
 assert.equal(outsideStep.pending.kind,'effect-top-hand-outside');
 assert.equal(outsideStep.pending.step,'outside');
 assert.deepEqual(outsideStep.pending.uids,outsideStep.players[0].deck.slice(0,4).map(c=>c.uid));
 assert.equal(outsideStep.players[0].hand.some(c=>c.uid===handUid),true);
 assert.equal(outsideStep.pending.uids.includes(handUid),false);
 assert.equal(universalPrivateChoices(openedMatch.packs,outsideStep,1),null);
 let ordered=dispatchUniversalAction(openedMatch.packs,outsideStep,
  {type:'chooseTopHandOutside',uid:outsideUid,place:'outside'});
 assert.equal(ordered.pending.kind,'effect-top-order');
 assert.equal(ordered.pending.rest,'bottom');
 assert.deepEqual(ordered.pending.uids,ordered.players[0].deck.slice(0,3).map(c=>c.uid));
 assert.equal(ordered.players[0].outside.some(c=>c.uid===outsideUid),true);
 assert.equal(ordered.players[0].outside.some(c=>c.uid===event.uid),true);
 const orderUids=[ordered.pending.uids[2],ordered.pending.uids[0],ordered.pending.uids[1]];
 const forgedOrder={...ordered,pending:{...ordered.pending,uids:[...ordered.pending.uids].reverse()}};
 assert.throws(()=>assertUniversalMatch(openedMatch.packs,forgedOrder),/Unproven top hand and outside split/);
 for(const uid of orderUids){
  ordered=dispatchUniversalAction(openedMatch.packs,ordered,{type:'chooseTopOrder',uid});
 }
 assert.equal(ordered.pending,null);
 assert.equal(ordered.players[0].hand.some(c=>c.uid===handUid),true);
 assert.equal(ordered.players[0].outside.some(c=>c.uid===outsideUid),true);
 assert.deepEqual(ordered.players[0].deck.slice(-3).map(c=>c.cardId),[WINDOW[4],WINDOW[2],WINDOW[3]]);
 assert.deepEqual(ordered.players[0].deck.slice(0,-3).map(c=>c.uid),under);
 assert.equal(ordered.publicReveals.length,reveals);
 assert.equal(assertUniversalMatch(openedMatch.packs,ordered),true);

 const short=main(purple,291064);
 fuel(short.s);
 const shortEvent=hold(short.s,0,'BLC-1-063');
 parkExcept(short.s,['BLC-1-039']);
 const lone=short.s.players[0].deck[0].uid;
 let stayed=dispatchUniversalAction(short.packs,short.s,{type:'event',uid:shortEvent.uid});
 assert.equal(stayed.pending,null);
 assert.equal(stayed.players[0].deck.length,1);
 assert.equal(stayed.players[0].deck[0].uid,lone);
 assert.equal(stayed.players[0].hand.some(c=>c.uid===lone),false);
 assert.equal(assertUniversalMatch(short.packs,stayed),true);

 const pair=main(purple,291065);
 fuel(pair.s);
 const pairEvent=hold(pair.s,0,'BLC-1-063');
 parkExcept(pair.s,['BLC-1-039','BLC-1-048']);
 let two=dispatchUniversalAction(pair.packs,pair.s,{type:'event',uid:pairEvent.uid});
 assert.equal(two.pending.kind,'effect-top-hand-outside');
 assert.equal(two.pending.uids.length,2);
 const first=two.pending.uids[0],second=two.pending.uids[1];
 two=dispatchUniversalAction(pair.packs,two,{type:'chooseTopHandOutside',uid:first,place:'hand'});
 assert.equal(two.pending.step,'outside');
 assert.deepEqual(two.pending.uids,[second]);
 two=dispatchUniversalAction(pair.packs,two,{type:'chooseTopHandOutside',uid:second,place:'outside'});
 assert.equal(two.pending,null);
 assert.equal(two.players[0].deck.length,0);
 assert.equal(two.players[0].hand.some(c=>c.uid===first),true);
 assert.equal(two.players[0].outside.some(c=>c.uid===second),true);
 assert.equal(assertUniversalMatch(pair.packs,two),true);
});
