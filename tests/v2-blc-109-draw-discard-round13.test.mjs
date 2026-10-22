import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition} from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// UA08ST/BLC-1-109 checked 2026-10-22 from the official iframe:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08ST%2FBLC-1-109
// 紫1 / AP1 / イベント / 発生エナジーなし / 特徴なし
// 効果: カードを2枚引き、自分の手札を1枚場外に置く。
// トリガー alt ドロー: カードを1枚引く。
// The page has no FAQ. The Chinese catalogue line is only the local fingerprint.
const bleach=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei');
function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const ble=deck(bleach,['BLC-1-109','BLC-1-042'],'purple');
const foreign=deck(mst,[],'green');
const mirror=deck(bleach,['BLC-1-109','BLC-1-042'],'purple');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function main(packs,s){
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}
function attackPhase(packs,s){
 for(let n=0;n<6&&s.phase!=='attack';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 return s;
}

test('BLC-1-109 is the printed draw-two then discard-one event',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-109'));
 const card=bleach.cards['BLC-1-109'];
 const printed=CARDS.find(c=>c.identity==='BLC-1-109');
 assert.equal(printed.nameJa,'空座町の死神代行');
 assert.equal(printed.effect,'抽 2 張，再棄 1 張。');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.type,card.trigger,card.traits],
  ['purple',1,1,0,0,'event','draw',[]]);
 assert.deepEqual(card.effects,{onPlay:[{op:'drawDiscard',count:2,discardCount:1}]});
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-1-109');
 assert.deepEqual(checkedBleachAddonDefinition(profile).effects,card.effects);
 assert.throws(()=>checkedBleachAddonDefinition({...profile,energy:0}),/printed card changed/);
});

test('paid BLC-1-109 draws two and must discard one own hand card, including a card just drawn',()=>{
 const packs=[bleach,mst];
 let s=newUniversalMatch(packs,{decks:[ble,foreign],seed:1109,first:0});
 const spell=take(s,0,'BLC-1-109');s.players[0].hand.push(spell);
 const pay=take(s,0,'BLC-1-042');pay.ready=true;s.players[0].energy[0]=pay;
 s=main(packs,s);
 const poor=structuredClone(s);
 poor.players[0].outside.push(poor.players[0].energy[0]);poor.players[0].energy[0]=null;
 assert.equal(legalUniversalActions(packs,poor).some(a=>a.type==='event'&&a.uid===spell.uid),false);
 const drawn=s.players[0].deck.slice(0,2).map(c=>c.uid);
 const handBefore=s.players[0].hand.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='event'&&a.uid===spell.uid);
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(s.players[0].outside.some(c=>c.uid===spell.uid),true);
 assert.equal(s.players[0].hand.length,handBefore-1+2);
 assert.ok(drawn.every(uid=>s.players[0].hand.some(c=>c.uid===uid)));
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.pending.player,0);
 assert.equal(s.pending.remaining,undefined);
 assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.length>=1);
 assert.ok(choices.every(a=>a.type==='chooseDiscard'&&s.players[0].hand.some(c=>c.uid===a.uid)));
 assert.equal(choices.some(a=>a.uid===null),false);
 assert.throws(()=>dispatchUniversalAction(packs,s,choices[0],{actor:1}),/Wrong player turn/);
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const chosen=drawn[0];
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:chosen});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].outside.filter(c=>c.uid===chosen).length,1);
 assert.equal(s.players[0].hand.some(c=>c.uid===chosen),false);
 assert.equal(s.players[0].hand.some(c=>c.uid===drawn[1]),true);
 assert.equal(s.turnEffectZoneMoves[0].handToOutside,true);
 assert.equal(s.turnEffectZoneMoves[1].handToOutside,false);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-1-109 still discards when the deck is empty, and opens no pending when the hand is also empty',()=>{
 const packs=[bleach,mst];
 let s=newUniversalMatch(packs,{decks:[ble,foreign],seed:1110,first:0});
 const spell=take(s,0,'BLC-1-109');
 s.players[0].outside.push(...s.players[0].deck.splice(0),...s.players[0].hand.splice(0));
 const spare=take(s,0,'BLC-1-042'),pay=take(s,0,'BLC-1-042');
 pay.ready=true;s.players[0].energy[0]=pay;
 s.players[0].hand.push(spell,spare);
 s=main(packs,s);
 const kept=s.players[0].hand.find(c=>c.uid!==spell.uid);
 s=dispatchUniversalAction(packs,s,{type:'event',uid:spell.uid});
 assert.equal(s.players[0].deck.length,0);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.deepEqual(legalUniversalActions(packs,s).map(a=>a.uid),[kept.uid]);
 s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:kept.uid});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,0);
 let empty=newUniversalMatch(packs,{decks:[ble,foreign],seed:1111,first:0});
 const only=take(empty,0,'BLC-1-109');
 empty.players[0].outside.push(...empty.players[0].deck.splice(0),...empty.players[0].hand.splice(0));
 empty.players[0].hand.push(only);
 const fuel=take(empty,0,'BLC-1-042');fuel.ready=true;empty.players[0].energy[0]=fuel;
 empty=main(packs,empty);
 empty=dispatchUniversalAction(packs,empty,{type:'event',uid:only.uid});
 assert.equal(empty.pending,null);
 assert.equal(empty.players[0].hand.length,0);
 assert.equal(empty.players[0].outside.some(c=>c.uid===only.uid),true);
 assert.equal(assertUniversalMatch(packs,empty),true);
});

test('BLC-1-109 DRAW life trigger is the generic draw-one, not a second copy of the event text',()=>{
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[mirror,mirror],seed:1112,first:0});
 const attacker=take(s,0,'BLC-1-042');attacker.ready=true;s.players[0].front[0]=attacker;
 const revealed=take(s,1,'BLC-1-109');
 s.players[1].life.unshift(revealed);
 s=attackPhase(packs,s);
 const hand=s.players[1].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.trigger,'draw');
 assert.equal(s.pending.uid,revealed.uid);
 const draw=legalUniversalActions(packs,s).find(a=>a.type==='chooseTrigger'&&a.mode==='draw');
 assert.ok(draw);
 s=dispatchUniversalAction(packs,s,draw,{actor:1});
 assert.equal(s.players[1].hand.length,hand+1);
 assert.equal(s.players[1].outside.some(c=>c.uid===revealed.uid),true);
 assert.equal(s.players[1].hand.some(c=>c.uid===revealed.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
