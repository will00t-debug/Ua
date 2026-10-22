import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {MST_V2_ROXY_FIELD_REAL_DECK_COUNTS} from '../dist/universal-v2/sao-mst-real-decks.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
// Source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-053
const pack=registeredV2TitlePack('mushoku-tensei'),packs=[pack,pack];
const deck={...MST_V2_ROXY_FIELD_REAL_DECK_COUNTS,'MST-1-050':2,'MST-1-053':2};
function take(s,p,id){for(const z of ['deck','hand','life','outside']){
 const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
 if(i>=0)return a.splice(i,1)[0];
 }throw Error('Missing physical printed '+id);}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
test('official complete 053 source-locked stats, color trigger, permanent replacement and optional MAIN',()=>{
 const src=MST_V2_OFFICIAL_BY_ID['MST-1-053'],c=pack.cards['MST-1-053'];
 assert.equal(src.verified,true);
 assert.equal(src.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-053');
 assert.deepEqual([c.name,c.color,c.energy,c.ap,c.bp,c.gen,c.type,c.trigger],
  ['ロキシー','green',1,1,2500,1,'character','color']);
 assert.equal(c.colorTriggerFieldSubstitution,'green');
 assert.deepEqual(c.triggerEffect,{op:'deployHandCharacter',color:'green',maxEnergy:2,ap:1});
 assert.deepEqual(c.effects.onPlay,[{op:'drawDiscard',count:1}]);
 assert.deepEqual(c.mainAbility,{op:'retireOwnFieldThen',frontOnly:true,
  oncePerTurn:true,optional:true,after:[{op:'draw',count:1}]});
 assert.equal(Object.keys(pack.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(pack,deck),[]);
});
test('genuine paid MST053 onPlay draw+discard, then optional paid FIELD retirement draws after MST075 onRetire',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:8530});
 const roxy=take(s,0,'MST-1-053');s.players[0].hand.push(roxy);
 const field=take(s,0,'MST-1-075');s.players[0].energy[0]=field;
 s=next(next(s));assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===roxy.uid&&a.line==='front');
 assert.ok(play);
 const hand=s.players[0].hand.length,deckSize=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-discard');
 assert.equal(s.players[0].hand.length,hand);
 assert.equal(s.players[0].deck.length,deckSize-1);
 s=dispatchUniversalAction(packs,s,legalUniversalActions(packs,s)[0]);
 assert.equal(s.players[0].hand.length,hand-1);
 const activate=legalUniversalActions(packs,s).find(a=>a.type==='activate'&&a.uid===roxy.uid&&a.mode==='retireFieldThen');
 assert.ok(activate);
 s=dispatchUniversalAction(packs,s,activate);
 assert.deepEqual(legalUniversalActions(packs,s),[
  {type:'chooseOwnFieldRetire',uid:null},{type:'chooseOwnFieldRetire',uid:field.uid}]);
 const beforeHand=s.players[0].hand.length,beforeDeck=s.players[0].deck.length;
 s=dispatchUniversalAction(packs,s,{type:'chooseOwnFieldRetire',uid:field.uid});
 assert.equal(s.players[0].hand.length,beforeHand+2);
 assert.equal(s.players[0].deck.length,beforeDeck-2);
 assert.ok(s.players[0].outside.some(c=>c.uid===field.uid));
 assert.equal(s.turnRetireEvents.length,1);
 assert.equal(s.turnRetireEvents[0].cardType,'field');
 assert.equal(legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===roxy.uid),false);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('opponent-turn genuine MST053 green COLOR life swaps CHARACTER to own MST075 FIELD in ACTIVE ENERGY',()=>{
 let s=newUniversalMatch(packs,{decks:[deck,deck],first:0,seed:8531});
 const attacker=take(s,0,'MST-1-054');attacker.ready=true;s.players[0].front[0]=attacker;
 const live=take(s,1,'MST-1-053');s.players[1].energy[0]=live;
 const trigger=take(s,1,'MST-1-053');
 s.players[1].deck.push(s.players[1].life.shift());s.players[1].life.unshift(trigger);
 const field=take(s,1,'MST-1-075');s.players[1].hand.push(field);
 const char=take(s,1,'MST-1-050');s.players[1].hand.push(char);
 s=next(next(next(s)));assert.equal(s.phase,'attack');
 s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid});
 s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:null});
 assert.equal(s.pending?.kind,'life-trigger');
 const options=legalUniversalActions(packs,s);
 assert.ok(options.some(a=>a.mode==='color'&&a.uid===char.uid));
 const choice=options.find(a=>a.mode==='colorField'&&a.uid===field.uid);
 assert.ok(choice);assert.equal(choice.line,'energy');
 assert.equal(chooseUniversalAiAction(packs,s,{difficulty:'hard'}).mode,'colorField');
 const previousDeck=s.players[1].deck.length;
 s=dispatchUniversalAction(packs,s,choice);
 assert.equal(s.players[1].energy[choice.slot].uid,field.uid);
 assert.equal(s.players[1].energy[choice.slot].ready,true);
 assert.equal(s.players[1].deck.length,previousDeck-1);
 assert.equal(s.pending?.kind,'effect-discard');
 const discard=legalUniversalActions(packs,s).find(a=>a.uid===char.uid);
 assert.ok(discard);
 s=dispatchUniversalAction(packs,s,discard);
 assert.ok(s.players[1].outside.some(c=>c.uid===char.uid));
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
