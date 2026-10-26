import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {cardHasName} from '../dist/universal-v2/field-conditions.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPrivateChoices,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import {c6BlcAliasPeek} from '../scripts/v2-c6-blc-alias-peek.mjs';

// EX15BT/BLC-4-002 official page, 2026-10-24. No FAQ.
// 黄- / AP1 / BP1500 / no trait / 発生黄 / DRAW.
// このカードは〈ユーグラム・ハッシュヴァルト〉としても扱う。
// 【登場時】自分の山札の上から1枚見て、山札の上か場外に置く。

const bleach=registeredV2TitlePack('bleach');
const packs=[bleach,bleach];
const ALIAS='ユーグラム・ハッシュヴァルト';
function deck(required){
 const rest=Object.values(bleach.cards).filter(c=>c.maxCopies===4&&!required.includes(c.id)&&
  !['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const counts=deck(['BLC-4-002','BLC-1-001','BLC-1-008']);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function place(s,p,id,line,slot,ready=false){
 const c=take(s,p,id);c.ready=ready;c.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=c;return c;
}
function toPhase(s,phase){
 for(let n=0;n<8&&s.phase!==phase;n++)
  s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='next'));
 assert.equal(s.phase,phase);return s;
}
function countCards(player){
 let n=0;
 for(const zone of ['hand','deck','life','outside','removed'])n+=player[zone].length;
 for(const line of ['front','energy'])for(const c of player[line])if(c)n+=1;
 return n;
}
function aiOk(s){
 const legal=legalUniversalActions(packs,s);
 for(const difficulty of ['easy','normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legal.some(a=>JSON.stringify(a)===JSON.stringify(ai)),difficulty);
 }
}
function topKnown(s){
 const known=take(s,0,'BLC-1-001');
 s.players[0].deck.unshift(known);
 return known;
}

test('C6 registers only the whole-print alias and top choice',()=>{
 const x=c6BlcAliasPeek();
 assert.deepEqual(x.registered,['BLC-4-002']);
 assert.equal(x.report.bleach,160);
 assert.equal(x.report.mst,57);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.registered,489);
 assert.equal(x.report.readyFromKeywords,0);
 assert.equal(EXPECTED_V2_IDS.bleach.includes('BLC-4-002'),true);
});

test('BLC-4-002 matches the catalogue, alias, and shared top choice',()=>{
 const printed=CARDS.find(c=>c.identity==='BLC-4-002');
 assert.equal(printed.effect,'此卡也視為《雨葛蘭・哈斯沃德》。登場時：查看牌庫頂1張，放回牌庫頂或送至場外。');
 const card=bleach.cards['BLC-4-002'];
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger],
  ['yellow',0,1,1500,1,'draw']);
 assert.deepEqual(card.nameAliases,[ALIAS]);
 assert.deepEqual(card.effects,{onPlay:[{op:'peekTopOne'}]});
 assert.equal(cardHasName(card,ALIAS),true);
 assert.equal(cardHasName(card,'ユーゴー',true),true);
 assert.equal(cardHasName(card,ALIAS,true),false);
});

test('BLC-4-002 shows its top card only to its controller, then puts it outside or back',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4002,first:0}),'main');
 const actor=take(s,0,'BLC-4-002');
 s.players[0].hand.push(actor);
 const seen=topKnown(s);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===actor.uid&&a.line==='energy');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending.kind,'private-top-choice');
 const mine=universalPrivateChoices(packs,s,0);
 assert.equal(mine.options[0].card.cardId,'BLC-1-001');
 assert.equal(universalPrivateChoices(packs,s,1),null);
 assert.equal(JSON.stringify(universalPublicView(packs,s,1)).includes(seen.uid),false);
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopCard',mode:'outside'});
 assert.equal(s.players[0].outside.some(c=>c.uid===seen.uid),true);
 assert.equal(s.players[0].deck[0]?.uid===seen.uid,false);
 assert.equal(countCards(s.players[0]),50);

 let kept=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4003,first:0}),'main');
 const again=take(kept,0,'BLC-4-002');
 kept.players[0].hand.push(again);
 const stays=topKnown(kept);
 kept=dispatchUniversalAction(packs,kept,legalUniversalActions(packs,kept).find(a=>a.type==='play'&&a.uid===again.uid));
 kept=dispatchUniversalAction(packs,kept,{type:'chooseTopCard',mode:'top'});
 assert.equal(kept.players[0].deck[0].uid,stays.uid);
 assert.equal(countCards(kept.players[0]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(kept)),true);
});

test('BLC-4-002 DRAW life draws one card',()=>{
 let s=toPhase(newUniversalMatch(packs,{decks:[counts,counts],seed:4004,first:0}),'main');
 const actor=place(s,0,'BLC-1-008','front',0,true);
 const revealed=take(s,1,'BLC-4-002');
 const buried=s.players[1].life.shift();
 s.players[1].deck.push(buried);
 s.players[1].life.unshift(revealed);
 s=toPhase(s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:actor.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending.trigger,'draw');
 const hand=s.players[1].hand.length;
 aiOk(s);
 s=dispatchUniversalAction(packs,s,{type:'chooseTrigger',mode:'draw'},{actor:1});
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(countCards(s.players[1]),50);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
});
