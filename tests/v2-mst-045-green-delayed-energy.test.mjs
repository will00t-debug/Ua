import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergyByColor,universalCardEnergy,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const mstIds=['001','002','003','010','012','013','016','017','019','020','024','027','029'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-029']=1;
mstDeck['MST-1-045']=1;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043']
 .map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const cards=s.players[p][zone],idx=cards.findIndex(c=>c.cardId===id);
  if(idx>=0)return cards.splice(idx,1)[0];
 }
 throw Error('Missing physical '+id);
}
function scene(owner){
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{decks:owner===0?[mstDeck,slgDeck]:[slgDeck,mstDeck],
  first:owner,seed:45045+owner});
 const source=take(s,owner,'MST-1-045');
 source.ready=true;
 s.players[owner].energy[0]=source;
 for(let i=0;i<4&&s.phase!=='main';i++){
  const a=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(a);
  s=dispatchUniversalAction(packs,s,a);
 }
 assert.equal(s.phase,'main');
 return {packs,s,source,owner};
}
test('official MST045 JP printed GREEN profile reuses same strict deferred REST effect as BLUE MST016 and PURPLE SLG013',()=>{
 const print=MST_V2_OFFICIAL_BY_ID['MST-1-045'],card=mst.cards['MST-1-045'];
 assert.equal(print.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-045');
 assert.equal(print.effectJa,'〖起動メイン〗 〖レストにする〗 〖ターン1〗 このキャラはこのターン中、発生エナジー+ 〖緑〗 と「メインフェイズ終了時、このキャラを退場させる。」を得る。');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.traits,card.trigger],
  ['ゼニス','green',0,1,1000,1,[],null]);
 assert.equal(card.implementation,'dsl');
 assert.deepEqual(card.mainAbility,mst.cards['MST-1-016'].mainAbility);
 assert.deepEqual(card.mainAbility,slg.cards['SLG-1-013'].mainAbility);
 assert.deepEqual(card.effects,{});
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
for(const owner of [0,1]){
 test('MST045 P'+owner+' vs SLG: GREEN source REST pays without AP, temporary energy +1, then one genuine retirement',()=>{
  const {packs,s:initial,source}=scene(owner);
  const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
  const initialAp=initial.players[owner].apCards.filter(a=>a.ready).length;
  assert.equal(universalEnergyByColor(packs,initial,owner).green,1);
  assert.ok(legalUniversalActions(packs,initial).some(a=>JSON.stringify(a)===JSON.stringify(action)));
  assert.throws(()=>dispatchUniversalAction(packs,initial,action,{actor:1-owner}),/Wrong player/);
  let s=dispatchUniversalAction(packs,initial,action,{actor:owner});
  assert.equal(initial.players[owner].energy[0].ready,true,'state transition is pure');
  assert.equal(s.players[owner].energy[0].ready,false,'source REST is an actual paid cost');
  assert.equal(universalEnergyByColor(packs,s,owner).green,2);
  assert.equal(universalCardEnergy(packs,s,owner,s.players[owner].energy[0]),2);
  assert.equal(universalEnergyByColor(packs,s,owner).blue||0,0,'no hard-coded blue bonus');
  assert.equal(s.players[owner].apCards.filter(a=>a.ready).length,initialAp);
  assert.equal(s.delayedEffects.length,1);
  assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.type==='activate'&&a.uid===source.uid));
  assert.throws(()=>dispatchUniversalAction(packs,s,action),/not currently legal/);
  assert.equal(assertUniversalMatch(packs,s),true);
  s=dispatchUniversalAction(packs,s,{type:'next'});
  assert.equal(s.phase,'attack');
  assert.equal(s.players[owner].energy[0],null);
  assert.ok(s.players[owner].outside.some(c=>c.uid===source.uid));
  assert.equal(s.delayedEffects.length,0);
  assert.equal(universalEnergyByColor(packs,s,owner).green||0,0);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('MST045 cannot REST source from FRONT or already RESTed ENERGY; no phantom activation',()=>{
 const {packs,s:original,source}=scene(0);
 const rest=structuredClone(original);rest.players[0].energy[0].ready=false;
 assert.ok(!legalUniversalActions(packs,rest).some(a=>a.type==='activate'&&a.uid===source.uid));
 const front=structuredClone(original);const unit=front.players[0].energy[0];
 front.players[0].energy[0]=null;front.players[0].front[0]=unit;
 assert.ok(!legalUniversalActions(packs,front).some(a=>a.type==='activate'&&a.uid===source.uid));
 assert.equal(assertUniversalMatch(packs,rest),true);
 assert.equal(assertUniversalMatch(packs,front),true);
});
