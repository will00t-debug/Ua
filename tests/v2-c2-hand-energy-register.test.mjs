import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {SAO_CARDS} from '../dist/sao-cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalImpact,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {grantContinuousState} from '../dist/universal-v2/continuous-states.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {c2BlcSaoRegister,C2_REGISTERED} from '../scripts/v2-c2-blc-sao-register.mjs';

// Japanese official pages read 2026-10-24. None contained a card FAQ.
// UA08BT/BLC-1-007: 黄3, AP1, BP3000, 星十字騎士団, 発生 黄黄, no trigger.
//   相手の場に紫か緑のカードがある場合、手札の黄必要エナジー -1。
// UA08BT/BLC-1-044: 紫3, 護廷十三隊, 紫紫. 黄か緑 → 紫 -1。
// UA08BT/BLC-1-073: 緑3, 護廷十三隊, 緑緑. 黄か紫 → 緑 -1。
// UA15BT/SAO-1-015: 黄3, 整合騎士, 黄黄. 青か緑 → 黄 -1。
// UA15BT/SAO-1-050: 青3, ALO, 青青. 黄か緑 → 青 -1。
// UA15BT/SAO-1-092: 緑3, GGO, 緑緑. 黄か青 → 緑 -1。
// UA15BT/SAO-1-090: 緑3, GGO, 緑緑, COLOR.
//   このキャラのBPが4000以上の場合、【インパクト（1）】。
//   COLOR: 手札から必要エナジー2以下・消費AP1の緑キャラを1枚アクティブで登場。
// Catalogue traits stay Traditional Chinese. SAO gen 3 was the old import error.

const DISCOUNT={
 'BLC-1-007':['purple','green'],
 'BLC-1-044':['yellow','green'],
 'BLC-1-073':['yellow','purple'],
 'SAO-1-015':['blue','green'],
 'SAO-1-050':['yellow','green'],
 'SAO-1-092':['yellow','blue']
};
const bleach=registeredV2TitlePack('bleach');
const sao=registeredV2TitlePack('sword-art-online');
function deck(pack,required){
 const rest=Object.values(pack.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,card,line,slot,ready=false){
 card.ready=ready;
 card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
 return card;
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}
function aiOk(packs,s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}

test('C2 registers seven whole prints and leaves no exact reuse unported',()=>{
 const x=c2BlcSaoRegister();
 assert.deepEqual([...C2_REGISTERED].sort(),[
  'BLC-1-007','BLC-1-044','BLC-1-073','SAO-1-015','SAO-1-050','SAO-1-090','SAO-1-092']);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.sao,111);
 assert.equal(x.report.registeredThisRound,7);
 assert.equal(x.report.readyFromKeywords,0);
 assert.equal(x.report.engineBlocked,7);
 assert.equal(x.report.partial,1);
 assert.equal(x.report.reviewPending,180);
 assert.equal(x.report.bleachSaoUnported,188);
 for(const id of C2_REGISTERED){
  const title=id.startsWith('BLC-')?'bleach':'sword-art-online';
  assert.equal(EXPECTED_V2_IDS[title].includes(id),true);
 }
 const blocked=x.reviewed.map(c=>c.id).sort();
 assert.deepEqual(blocked,[
  'BLC-1-091','BLC-2-041',
  'SAO-1-076','SAO-1-085','SAO-1-103','SAO-2-037','SAO-2-039','SAO-2-066']);
 assert.equal(x.reviewed.find(c=>c.id==='BLC-1-091').status,'PARTIAL');
});

test('the six hand-energy prints keep official energy 3, gen 2 and discount colors',()=>{
 for(const [id,colors] of Object.entries(DISCOUNT)){
  const title=id.startsWith('BLC-')?'bleach':'sword-art-online';
  const card=registeredV2TitlePack(title).cards[id];
  const source=(title==='bleach'?CARDS:SAO_CARDS).find(c=>(c.identity||c.id)===id);
  assert.equal(source.energy,3);
  assert.equal(source.ap,1);
  assert.equal(source.gen,2);
  assert.equal(source.bp,3000);
  assert.equal(source.trigger??null,null);
  assert.equal(card.energy,3);
  assert.equal(card.gen,2);
  assert.equal(card.ap,1);
  assert.deepEqual(card.opponentFieldColorsHandEnergyDiscount,{colors,amount:1});
  assert.deepEqual(card.effects,{});
 }
 const sinon=SAO_CARDS.find(c=>c.id==='SAO-1-090');
 assert.equal(sinon.gen,2);
 assert.equal(sinon.trigger,'color');
 assert.equal(sinon.effectJa.startsWith('このキャラのBPが4000以上'),true);
 assert.equal(sao.cards['SAO-1-090'].conditionalImpactBpAtLeast,4000);
 assert.deepEqual(sao.cards['SAO-1-090'].triggerEffect,
  {op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
});

test('BLC-1-007 spends one AP at live energy 2 and keeps a 50-card deck',()=>{
 const counts=deck(bleach,['BLC-1-007','BLC-1-001','BLC-1-002','BLC-1-058']);
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:2007,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 const play=take(s,0,'BLC-1-007');
 s.players[0].hand.push(play);
 const donors=['BLC-1-001','BLC-1-002'].map(id=>take(s,0,id));
 donors.forEach((c,i)=>place(s,0,c,'energy',i,true));
 const match=take(s,1,'BLC-1-058');
 place(s,1,match,'front',0,true);
 assert.equal(countCards(s.players[0]),50);
 aiOk(packs,s);
 const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===play.uid&&a.line==='front');
 assert.ok(action);
 const ap=s.players[0].apCards.filter(c=>c.ready).length;
 s=dispatchUniversalAction(packs,s,action);
 const live=s.players[0].front.find(c=>c?.uid===play.uid);
 assert.ok(live);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap-1);
 assert.equal(bleach.cards['BLC-1-007'].energy,3);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 assert.equal(countCards(s.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
 const second=take(s,0,'BLC-1-007');
 s.players[0].hand.push(second);
 s.players[1].front[0]=null;
 match.fieldEntryStamp=null;
 s.players[1].outside.push(match);
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='play'&&a.uid===second.uid),false);
 assert.equal(countCards(s.players[0]),50);
});

test('SAO-1-090 impact follows current BP and COLOR deploys only a matching green character',()=>{
 const counts=deck(sao,['SAO-1-090','SAO-1-079','SAO-1-043']);
 const packs=[sao,sao];
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1090,first:0});
 for(let n=0;n<8&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 const actor=place(s,0,take(s,0,'SAO-1-079'),'front',0,true);
 const self=place(s,0,take(s,0,'SAO-1-090'),'front',1,true);
 assert.equal(universalBp(packs,s,self),3000);
 assert.equal(universalImpact(packs,s,self),0);
 self.buffs=[{bp:999,untilTurn:s.turn}];
 assert.equal(universalImpact(packs,s,self),0);
 self.buffs=[{bp:1000,untilTurn:s.turn}];
 assert.equal(universalBp(packs,s,self),4000);
 assert.equal(universalImpact(packs,s,self),1);
 grantContinuousState(s,{kind:'originalEffectsDisabled',controller:1,sourceUid:actor.uid,
  targetUid:self.uid,sourceLinked:false,until:{player:0,phase:'main',edge:'end'}});
 assert.equal(universalImpact(packs,s,self),0);
 assert.equal(universalBp(packs,s,self),4000);
 s.continuousStates=[];
 assert.equal(universalImpact(packs,s,self),1);
 const revealed=take(s,1,'SAO-1-090');
 const buried=s.players[1].life.shift();
 s.players[1].deck.push(buried);
 s.players[1].life.unshift(revealed);
 const legal=take(s,1,'SAO-1-079');
 const wrongColor=take(s,1,'SAO-1-043');
 const tooCostly=take(s,1,'SAO-1-090');
 s.players[1].hand.push(legal,wrongColor,tooCostly);
 for(let n=0;n<6&&s.phase!=='attack';n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.trigger,'color');
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.some(a=>a.mode==='color'&&a.uid===legal.uid&&a.line==='front'));
 assert.equal(choices.some(a=>a.uid===wrongColor.uid||a.uid===tooCostly.uid),false);
 aiOk(packs,s);
 const ap=s.players[1].apCards.filter(c=>c.ready).length;
 const play=choices.find(a=>a.mode==='color'&&a.uid===legal.uid&&a.line==='front');
 s=dispatchUniversalAction(packs,s,play);
 const entered=s.players[1].front.find(c=>c?.uid===legal.uid);
 assert.ok(entered);
 assert.equal(entered.ready,true);
 assert.equal(s.players[1].apCards.filter(c=>c.ready).length,ap);
 assert.ok(s.players[1].hand.some(c=>c.uid===wrongColor.uid));
 assert.ok(s.players[1].hand.some(c=>c.uid===tooCostly.uid));
 assert.equal(countCards(s.players[1]),50);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});
