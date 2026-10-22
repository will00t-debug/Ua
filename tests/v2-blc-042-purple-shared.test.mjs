import {EXPECTED_V2_COUNTS,EXPECTED_V2_ADDED_CARD_IDS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../dist/cards.mjs';
import {EXPANSION_CARDS} from '../dist/expansion-cards.mjs';
import {BLEACH_V2_ADDON_PROFILES,checkedBleachAddonDefinition,createBleachV2Pack}
 from '../dist/universal-v2/bleach-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalEnergyByColor,assertUniversalMatch,universalPublicView}
 from '../dist/universal-v2/engine.mjs';

const bleach=registeredV2TitlePack('bleach'),
 mst=registeredV2TitlePack('mushoku-tensei'),
 ttg=registeredV2TitlePack('gurren-lagann'),
 slg=registeredV2TitlePack('solo-leveling'),
 id='BLC-1-042';
function physicalDeck(pack,sourceId){
 const def=pack.cards[sourceId];assert.ok(def);
 const choices=Object.values(pack.cards).filter(c=>c.type==='character'&&
  c.color===def.color&&!['final','special','color'].includes(c.trigger))
  .sort((a,b)=>a.id.localeCompare(b.id));
 const others=choices.filter(c=>c.id!==sourceId).slice(0,12);
 assert.equal(others.length,12,'must use 12 registered source-pinned physical supports');
 const ids=[sourceId,...others.map(c=>c.id)],counts=Object.fromEntries(ids.map(x=>[x,4]));
 counts[ids.at(-1)]=2;
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return counts;
}
const purple=physicalDeck(bleach,id);
const other=physicalDeck(mst,'MST-1-003');
const red=physicalDeck(ttg,'TTG-1-043');
function take(s,p,which){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],ix=arr.findIndex(c=>c.cardId===which);
  if(ix>=0)return arr.splice(ix,1)[0];
 }
 throw Error('Missing physical card '+which);
}
function main(packs,s){
 for(let n=0;n<5&&s.phase!=='main';n++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');return s;
}
function scene(owner=0){
 const packs=owner===0?[bleach,mst]:[mst,bleach],
  decks=owner===0?[purple,other]:[other,purple];
 let s=newUniversalMatch(packs,{decks,first:owner,seed:10420+owner});
 const source=take(s,owner,id);source.ready=true;
 s.players[owner].energy[0]=source;
 s=main(packs,s);
 return {packs,s,source,owner};
}
test('BLC-1-042 source fingerprint protects official merged STARTER while retaining BOOSTER variant',()=>{
 const original=CARDS.find(c=>c.identity===id),
  booster=EXPANSION_CARDS.find(c=>c.identity===id),
  profile=BLEACH_V2_ADDON_PROFILES.find(p=>p.id===id),
  card=bleach.cards[id];
 assert.ok(original&&booster&&profile&&card);
 assert.equal(original.number,'UA08ST/BLC-1-042');
 assert.equal(booster.number,'UA08BT/BLC-1-042');
 assert.ok(original.aliases.includes(booster.number));
 assert.equal(original.nameJa,'茶渡 泰虎');
 assert.equal(original.effect,'主要階段・每回合 1 次：REST 自己，本回合多產生 1 紫能源；主要階段結束時退場。');
 assert.equal(booster.effect,'主要階段・每回合 1 次：REST 自己，本回合額外產生 1 紫能源；主要階段結束時，此角色退場。');
 assert.deepEqual([card.color,card.energy,card.ap,card.bp,card.gen,card.type,card.trigger],
  ['purple',0,1,1000,1,'character',null]);
 assert.deepEqual(checkedBleachAddonDefinition(profile).mainAbility,card.mainAbility);
 assert.deepEqual(card,createBleachV2Pack().cards[id]);
 assert.deepEqual(card.mainAbility,mst.cards['MST-1-016'].mainAbility);
 assert.deepEqual(card.mainAbility,ttg.cards['TTG-1-063'].mainAbility);
 assert.deepEqual(card.mainAbility,slg.cards['SLG-1-013'].mainAbility);
 assert.deepEqual(card.effects,{});
 assert.equal(Object.keys(bleach.cards).length,EXPECTED_V2_COUNTS.bleach);
 assert.equal(BLEACH_V2_ADDON_PROFILES.length,EXPECTED_V2_ADDED_CARD_IDS.bleach.length);
 assert.throws(()=>checkedBleachAddonDefinition({...profile,effect:booster.effect}),/official recheck required/,
  'normalizing text variant without audit must not silently alter source fingerprint');
});
test('BLC042 P0 purple MAIN activation pays physical self REST and retires exactly once',()=>{
 const {packs,s:state,source}=scene(0);
 const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
 assert.equal(universalEnergyByColor(packs,state,0).purple,1);
 assert.ok(legalUniversalActions(packs,state).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 const ap=state.players[0].apCards.filter(c=>c.ready).length;
 assert.throws(()=>dispatchUniversalAction(packs,state,action,{actor:1}),/Wrong player/);
 let s=dispatchUniversalAction(packs,state,action,{actor:0});
 assert.equal(state.players[0].energy[0].ready,true,'immutable reducer');
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(packs,s,0,s.players[0].energy[0]),2);
 assert.equal(universalEnergyByColor(packs,s,0).purple,2);
 assert.equal(s.players[0].apCards.filter(c=>c.ready).length,ap);
 assert.equal(s.delayedEffects.length,1);
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'attack');
 assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
 assert.equal(s.players[0].energy[0],null);
 assert.equal(s.delayedEffects.length,0);
 assert.equal(universalEnergyByColor(packs,s,0).purple||0,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC042 P1 vs MST P0 produces only owner PURPLE, private hand remains secret',()=>{
 const {packs,s:state,owner,source}=scene(1);
 assert.equal(owner,1);
 assert.ok(source.uid.startsWith('1-'));
 let s=dispatchUniversalAction(packs,state,
  {type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'},{actor:1});
 assert.equal(universalEnergyByColor(packs,s,1).purple,2);
 assert.equal(universalEnergyByColor(packs,s,0).purple||0,0);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.ok(s.players[1].outside.some(c=>c.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('BLC042 in FRONT or REST in ENERGY cannot activate delayed energy, no fake AP',()=>{
 const {packs,s:before,source}=scene(0);
 const rest=structuredClone(before);
 rest.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,rest).some(a=>a.type==='activate'&&a.uid===source.uid));
 const front=structuredClone(before);
 front.players[0].front[0]=front.players[0].energy[0];front.players[0].energy[0]=null;
 assert.ok(!legalUniversalActions(packs,front).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.throws(()=>dispatchUniversalAction(packs,front,
  {type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'}),/not currently legal/);
 assert.equal(assertUniversalMatch(packs,rest),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});
