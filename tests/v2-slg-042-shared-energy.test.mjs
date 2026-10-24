import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {SLG_V2_VERIFIED_IDS} from '../dist/universal-v2/slg-pack.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
const slg=registeredV2TitlePack('solo-leveling'),packs=[slg,slg],ID='SLG-1-042';
const deck=Object.fromEntries(['005','006','015','016','026','032','041','042','043','045','052','066','068'].map(n=>['SLG-1-'+n,4]));
deck['SLG-1-032']=2;
function take(s,p,id){for(const zone of ['hand','deck','life','outside']){const cards=s.players[p][zone],i=cards.findIndex(c=>c.cardId===id);if(i>=0)return cards.splice(i,1)[0]}throw Error('no card '+id)}
function main(s){for(let i=0;i<5&&s.phase!=='main';i++){const a=legalUniversalActions(packs,s).find(x=>x.type==='next');assert.ok(a);s=dispatchUniversalAction(packs,s,a)}assert.equal(s.phase,'main');return s}
function setup(owner){let s=newUniversalMatch(packs,{decks:[deck,deck],first:owner,seed:1042+owner});const source=take(s,owner,ID);source.ready=true;s.players[owner].energy[0]=source;s=main(s);return {s,source,owner}}
test('official SLG-1-042 errata-aware original source and all native MAIN effects match',()=>{
 const original=SOLO_LEVELING_CARDS.find(c=>c.id===ID),card=slg.cards[ID];
 assert.ok(original&&card);
 assert.equal(original.identity,ID);
 assert.equal(original.nameJa,'馬渕 勲');
 assert.match(original.effect,/2026-04-17官方勘誤/);
 assert.match(original.effect,/主要階段每回合一次REST自己，額外產生1綠能源，主要階段結束時退場/);
 assert.ok(original.source.includes('UA51BT%2FSLG-1-042'));
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.trigger,card.type],
  ['馬渕 勲','green',0,1,1000,1,null,'character']);
 assert.deepEqual(card.mainAbility,slg.cards['SLG-1-013'].mainAbility);
 assert.deepEqual(card.effects,{});
 assert.equal(SLG_V2_VERIFIED_IDS.filter(id=>id===ID).length,1);
 assert.equal(Object.keys(slg.cards).length,EXPECTED_V2_COUNTS['solo-leveling']);
 assert.deepEqual(validateUniversalDeck(slg,deck),[]);
});
for(const owner of [0,1]){
 test('SLG042 owner '+owner+': READY self REST GREEN+1, mandatory true retirement at MAIN end',()=>{
  const {s:original,source}=setup(owner);
  const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
  assert.ok(legalUniversalActions(packs,original).some(x=>JSON.stringify(x)===JSON.stringify(action)));
  assert.equal(universalEnergyByColor(packs,original,owner).green,1);
  const ap=original.players[owner].apCards.filter(c=>c.ready).length;
  assert.throws(()=>dispatchUniversalAction(packs,original,action,{actor:1-owner}),/Wrong player/);
  let q=dispatchUniversalAction(packs,original,action,{actor:owner});
  assert.equal(original.players[owner].energy[0].ready,true);
  assert.equal(q.players[owner].energy[0].ready,false);
  assert.equal(universalCardEnergy(packs,q,owner,q.players[owner].energy[0]),2);
  assert.equal(universalEnergyByColor(packs,q,owner).green,2);
  assert.equal(universalEnergyByColor(packs,q,1-owner).green||0,0);
  assert.equal(q.players[owner].apCards.filter(c=>c.ready).length,ap);
  assert.equal(q.delayedEffects.length,1);
  assert.ok(!legalUniversalActions(packs,q).some(x=>x.type==='activate'&&x.uid===source.uid));
  assert.throws(()=>dispatchUniversalAction(packs,q,action,{actor:owner}),/not currently legal/);
  assert.equal(universalPublicView(packs,q,1-owner).players[owner].hand,null);
  q=dispatchUniversalAction(packs,q,{type:'next'});
  assert.equal(q.phase,'attack');
  assert.equal(q.players[owner].energy[0],null);
  assert.ok(q.players[owner].outside.some(c=>c.uid===source.uid));
  assert.equal(q.delayedEffects.length,0);
  assert.equal(universalEnergyByColor(packs,q,owner).green||0,0);
  assert.equal(assertUniversalMatch(packs,q),true);
 });
}
test('SLG042 never activates from FRONT or REST ENERGY or fabricated UID',()=>{
 const {s,source}=setup(0);
 const front=structuredClone(s);
 front.players[0].front[0]=front.players[0].energy[0];front.players[0].energy[0]=null;
 assert.ok(!legalUniversalActions(packs,front).some(x=>x.type==='activate'&&x.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,front,{type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'}),/not currently legal/);
 const rest=structuredClone(s);rest.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,rest).some(x=>x.type==='activate'&&x.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'activate',uid:'0-fabricated',mode:'selfRestEnergyRetire'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,front),true);
 assert.equal(assertUniversalMatch(packs,rest),true);
});
