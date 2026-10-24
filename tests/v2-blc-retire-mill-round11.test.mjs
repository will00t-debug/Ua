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

// Official pages checked 2026-10-22:
// UA08BT/BLC-1-051 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-051
//   紫0 / AP1 / キャラ / BP1500 / 護廷十三隊 / 発生紫1
//   退場時：自分の山札の上から2枚を場外に置く。 トリガー：ドロー
//   Q563: mandatory; a one-card deck still mills that one card.
// EX07BT/BLC-2-042 https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=EX07BT%2FBLC-2-042
//   青0 / AP1 / キャラ / BP1500 / 特徴は公式ページ上の単一表記「破面／涅骸部隊」 / 発生青1
//   same 退場時 sentence and ドロー trigger. No separate FAQ is printed on that page.
const bleach=registeredV2TitlePack('bleach');
const ttg=registeredV2TitlePack('gurren-lagann');
const pins=[
 ['BLC-1-051','purple','UA08BT/BLC-1-051','朽木 ルキア',['護廷十三隊']],
 ['BLC-2-042','blue','EX07BT/BLC-2-042','ルピ・アンテノール',['破面／涅骸部隊']]
];
function deck(requiredId){
 const source=bleach.cards[requiredId];
 const allowed=Object.values(bleach.cards).filter(c=>c.type==='character'&&
  c.color===source.color&&!['special','color','final'].includes(c.trigger));
 const others=allowed.filter(c=>c.id!==requiredId).sort((a,b)=>a.id.localeCompare(b.id));
 assert.ok(others.length>=12);
 const ids=[requiredId,...others.slice(0,12).map(c=>c.id)];
 const counts=Object.fromEntries(ids.map(id=>[id,4]));
 counts[ids.at(-1)]=2;
 assert.deepEqual(validateUniversalDeck(bleach,counts),[]);
 return counts;
}
const decks=Object.fromEntries(pins.map(([id])=>[id,deck(id)]));
const ttgIds=['TTG-1-043',...Object.values(ttg.cards).filter(c=>c.type==='character'&&
 c.color==='red'&&c.id!=='TTG-1-043'&&!['special','color','final'].includes(c.trigger))
 .map(c=>c.id).sort().slice(0,12)];
const ttgDeck=Object.fromEntries(ttgIds.map((id,i)=>[id,i===12?2:4]));
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function phase(packs,s,wanted){
 for(let n=0;n<5&&s.phase!==wanted;n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,wanted);return s;
}

test('BLC-1-051 and BLC-2-042 are source-pinned mill-on-retire characters, not partial flags',()=>{
 for(const [id,color,number,name,traits] of pins){
  assert.ok(EXPECTED_V2_IDS.bleach.includes(id));
  const source=CARDS.find(c=>c.identity===id);
  const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id===id);
  const card=bleach.cards[id];
  assert.equal(source.number,number);
  assert.equal(source.nameJa,name);
  assert.equal(source.effect,'退場：將己方牌堆頂 2 張送至場外。');
  assert.equal(source.trigger,'draw');
  assert.equal(source.source.includes('unionarena-tcg.com/jp/cardlist/'),true);
  assert.deepEqual(checkedBleachAddonDefinition(profile).effects,{onRetire:[{op:'millTop',count:2}]});
  assert.throws(()=>checkedBleachAddonDefinition({...profile,effect:profile.effect+'?'}),/printed card changed/);
  assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.type,card.trigger,card.traits],
   [name,color,0,1,1500,1,'character','draw',traits]);
  assert.deepEqual(card.effects.onRetire,[{op:'millTop',count:2}]);
  assert.equal(card.effects.onPlay,undefined);
 }
});

for(const [id] of pins)test(id+' battle retirement mills exactly the top two own cards once',()=>{
 const packs=[ttg,bleach];
 let s=newUniversalMatch(packs,{decks:[ttgDeck,decks[id]],first:0,seed:1051});
 const attacker=take(s,0,'TTG-1-043');attacker.ready=true;s.players[0].front[0]=attacker;
 const defender=take(s,1,id);defender.ready=true;s.players[1].front[0]=defender;
 s=phase(packs,s,'attack');
 const top=[s.players[1].deck[0],s.players[1].deck[1]];
 const ownDeck=s.players[1].deck.length,ownHand=s.players[1].hand.length,foeDeck=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
 assert.equal(s.pending?.kind,'block');
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(legalUniversalActions(packs,s).some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:1});
 assert.ok(s.players[1].outside.some(c=>c.uid===defender.uid));
 assert.deepEqual(s.players[1].outside.filter(c=>top.some(x=>x.uid===c.uid)).map(c=>c.uid),top.map(c=>c.uid));
 assert.equal(s.players[1].deck.length,ownDeck-2);
 assert.equal(s.players[1].hand.length,ownHand);
 assert.equal(s.players[0].deck.length,foeDeck);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===defender.uid).length,1);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('Q563: BLC-1-051 mills the single remaining deck card and does not repeat',()=>{
 const packs=[ttg,bleach];
 let s=newUniversalMatch(packs,{decks:[ttgDeck,decks['BLC-1-051']],first:0,seed:1563});
 const defender=take(s,1,'BLC-1-051');defender.ready=true;s.players[1].front[0]=defender;
 const attacker=take(s,0,'TTG-1-043');attacker.ready=true;s.players[0].front[0]=attacker;
 const last=s.players[1].deck[0];
 s.players[1].outside.push(...s.players[1].deck.splice(1));
 s=phase(packs,s,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:defender.uid},{actor:1});
 assert.equal(s.players[1].deck.length,0);
 assert.equal(s.players[1].outside.filter(c=>c.uid===last.uid).length,1);
 assert.equal(s.turnRetireEvents.filter(e=>e.uid===defender.uid).length,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('playing or removing BLC-2-042 does not mill; DRAW life still draws one',()=>{
 const packs=[bleach,bleach];
 let s=newUniversalMatch(packs,{decks:[decks['BLC-2-042'],decks['BLC-2-042']],first:0,seed:2042});
 const source=take(s,0,'BLC-2-042');s.players[0].hand.push(source);
 s=phase(packs,s,'main');
 const before=s.players[0].deck.length;
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='energy'&&a.slot===0);
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[0].deck.length,before);
 assert.equal(s.players[0].energy[0].uid,source.uid);
 assert.equal(s.turnRetireEvents.length,0);
 const removed=newUniversalMatch(packs,{decks:[decks['BLC-2-042'],decks['BLC-2-042']],first:0,seed:2043});
 const occupant=take(removed,0,'BLC-2-042');occupant.ready=true;removed.players[0].energy[0]=occupant;
 const fillers=[];
 for(let slot=1;slot<4;slot++){
  const filler=take(removed,0,'BLC-2-025');
  filler.ready=true;removed.players[0].energy[slot]=filler;fillers.push(filler);
 }
 let ready=phase(packs,removed,'main');
 const incoming=ready.players[0].hand.find(c=>c.cardId==='BLC-2-025')
  ||take(ready,0,'BLC-2-025');
 if(!ready.players[0].hand.some(c=>c.uid===incoming.uid))ready.players[0].hand.push(incoming);
 const replace=legalUniversalActions(packs,ready).find(a=>a.type==='play'&&a.uid===incoming.uid&&
  a.line==='energy'&&a.slot===0&&a.replaceUid===occupant.uid);
 assert.ok(replace,'full energy line must offer the exact occupant as removal');
 const deckAtReplace=ready.players[0].deck.length;
 ready=dispatchUniversalAction(packs,ready,replace);
 assert.ok(ready.players[0].removed.some(c=>c.uid===occupant.uid));
 assert.equal(ready.players[0].deck.length,deckAtReplace);
 assert.equal(ready.turnRetireEvents.filter(e=>e.uid===occupant.uid).length,0);
 assert.equal(assertUniversalMatch(packs,ready),true);
 const attacker=take(s,0,s.players[0].deck.find(c=>bleach.cards[c.cardId].type==='character').cardId);
 attacker.ready=true;s.players[0].front[0]=attacker;
 const life=take(s,1,'BLC-2-042');
 s.players[1].deck.push(...s.players[1].life.splice(0));
 s.players[1].life.unshift(life);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 const drawn=s.players[1].deck[0],hand=s.players[1].hand.length;
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(s.pending?.kind,'life-trigger');
 assert.equal(s.pending.trigger,'draw');
 const draw=legalUniversalActions(packs,s).find(a=>a.mode==='draw');
 assert.ok(draw);
 assert.ok(legalUniversalActions(packs,s).some(a=>a.mode==='skip'));
 s=dispatchUniversalAction(packs,s,draw,{actor:1});
 assert.ok(s.players[1].hand.some(c=>c.uid===drawn.uid));
 assert.equal(s.players[1].hand.length,hand+1);
 assert.ok(s.players[1].outside.some(c=>c.uid===life.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
