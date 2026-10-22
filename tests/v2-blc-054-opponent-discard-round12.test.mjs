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

// UA08BT/BLC-1-054 checked 2026-10-22:
// https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA08BT%2FBLC-1-054
// 紫3 / AP1 / キャラ / BP3000 / 護廷十三隊 / 発生紫1 / 登場時：相手は自身の手札を1枚場外に置く。 No trigger.
const bleach=registeredV2TitlePack('bleach'),mst=registeredV2TitlePack('mushoku-tensei');
const packs=[bleach,mst];
function deck(pack,required,color){
 const rest=Object.values(pack.cards).filter(c=>c.type==='character'&&c.color===color&&
  c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger)).map(c=>c.id).sort();
 const ids=[...required,...rest.slice(0,13-required.length)];
 assert.equal(ids.length,13);
 const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const ble=deck(bleach,['BLC-1-054','BLC-1-042'],'purple');
const foreign=deck(mst,[],'green');
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('Missing '+id);
}
function main(s){
 for(let n=0;n<4&&s.phase!=='main';n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 return s;
}

test('BLC-1-054 is only the printed opponent discard',()=>{
 assert.ok(EXPECTED_V2_IDS.bleach.includes('BLC-1-054'));
 const card=bleach.cards['BLC-1-054'];
 assert.equal(CARDS.find(c=>c.identity==='BLC-1-054').nameJa,'涅 マユリ');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.traits],
  ['purple',3,1,3000,1,null,['護廷十三隊']]);
 assert.deepEqual(card.effects,{onPlay:[{op:'discardOppHand',count:1}]});
 const profile=BLEACH_V2_ADDON_PROFILES.find(c=>c.id==='BLC-1-054');
 assert.deepEqual(checkedBleachAddonDefinition(profile).effects,card.effects);
 assert.throws(()=>checkedBleachAddonDefinition({...profile,energy:2}),/printed card changed/);
});

test('paid BLC-1-054 makes the MST opponent discard one hidden hand card',()=>{
 let s=newUniversalMatch(packs,{decks:[ble,foreign],seed:1054,first:0});
 const source=take(s,0,'BLC-1-054');s.players[0].hand.push(source);
 for(let i=0;i<3;i++){const g=take(s,0,'BLC-1-042');g.ready=true;s.players[0].energy[i]=g;}
 s=main(s);
 const poor=structuredClone(s);
 poor.players[0].outside.push(poor.players[0].energy[2]);poor.players[0].energy[2]=null;
 assert.equal(legalUniversalActions(packs,poor).some(a=>a.type==='play'&&a.uid===source.uid),false);
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,0);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.pending.player,1);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 const choices=legalUniversalActions(packs,s);
 assert.ok(choices.length>=1);
 assert.ok(choices.every(a=>s.players[1].hand.some(c=>c.uid===a.uid)));
 for(const difficulty of ['normal','hard']){
  const ai=chooseUniversalAiAction(packs,s,{difficulty});
  assert.ok(choices.some(a=>JSON.stringify(a)===JSON.stringify(ai)));
 }
 const chosen=choices[0].uid;
 s=dispatchUniversalAction(packs,s,choices[0],{actor:1});
 assert.equal(s.pending,null);
 assert.equal(s.players[1].outside.filter(c=>c.uid===chosen).length,1);
 assert.equal(s.players[1].hand.some(c=>c.uid===chosen),false);
 assert.equal(s.turnEffectZoneMoves[1].handToOutside,true);
 assert.equal(assertUniversalMatch(packs,s),true);
});

test('BLC-1-054 does nothing when the opponent has no hand',()=>{
 let s=newUniversalMatch(packs,{decks:[ble,foreign],seed:1055,first:0});
 const source=take(s,0,'BLC-1-054');s.players[0].hand.push(source);
 for(let i=0;i<3;i++){const g=take(s,0,'BLC-1-042');g.ready=true;s.players[0].energy[i]=g;}
 s.players[1].outside.push(...s.players[1].hand.splice(0));
 s=main(s);
 const outside=s.players[1].outside.length;
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[1].outside.length,outside);
 assert.equal(assertUniversalMatch(packs,s),true);
});
