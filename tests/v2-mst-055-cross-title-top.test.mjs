import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPrivateChoices,universalPublicView} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei'),slg=registeredV2TitlePack('solo-leveling');
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','020','050','055','070'].map(x=>['MST-1-'+x,4]));
mstDeck['MST-1-029']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(x=>['SLG-1-'+x,4]));
slgDeck['SLG-1-041']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing physical '+id);
}
function setup(owner=0,topIds=['MST-1-001','MST-1-070','MST-1-002']){
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{decks:owner===0?[mstDeck,slgDeck]:[slgDeck,mstDeck],
  first:owner,seed:55055+owner});
 const source=take(s,owner,'MST-1-055');
 s.players[owner].hand.push(source);
 const producer=take(s,owner,'MST-1-050');producer.ready=true;
 s.players[owner].energy[0]=producer;
 const window=topIds.map(id=>take(s,owner,id));
 s.players[owner].deck.unshift(...window);
 for(let n=0;n<4&&s.phase!=='main';n++){
  const act=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(act);s=dispatchUniversalAction(packs,s,act);
 }
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'MST055 GREEN1 and AP1 paid by true owned producer');
 assert.equal(assertUniversalMatch(packs,s),true);
 return {s,packs,owner,source,window,play};
}
function order(packs,s,uidList,owner){
 for(const uid of uidList){
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseTopOrder'&&a.uid===uid));
  s=dispatchUniversalAction(packs,s,{type:'chooseTopOrder',uid},{actor:owner});
 }
 return s;
}
test('MST055 official Japanese full onPlay + independent DRAW Life use shared TTG and SLG TOP3 trait template',()=>{
 const official=MST_V2_OFFICIAL_BY_ID['MST-1-055'],card=mst.cards['MST-1-055'];
 assert.equal(official.number,'UA54BT/MST-1-055');
 assert.equal(official.nameJa,'アリエル');
 assert.equal(official.effectJa,'〖登場時〗 自分の山札の上から3枚見て、［特徴：ラノア魔法大学］を1枚まで公開し手札に加える。残りを望む順で山札の下に置く。手札に加えた場合、自分の手札を1枚場外に置く。');
 assert.equal(official.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-055');
 assert.deepEqual([card.name,card.color,card.energy,card.ap,card.bp,card.gen,card.traits,card.trigger],
  ['アリエル','green',1,1,2000,1,['ラノア魔法大学'],'draw']);
 assert.deepEqual(card.effects.onPlay,[{op:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'ラノア魔法大学'}}]);
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
for(const owner of [0,1]){
 test('MST055 P'+owner+' vs SLG: private TOP3 selects matching trait only, ordered bottom, discard only after a hand addition',()=>{
  let {s,packs,play,window,source}=setup(owner);
  const beforeDeck=s.players[owner].deck.map(c=>c.uid);
  const beforeAp=s.players[owner].apCards.filter(c=>c.ready).length;
  s=dispatchUniversalAction(packs,s,play,{actor:owner});
  assert.equal(s.pending?.kind,'effect-top-filter-choice');
  assert.deepEqual(s.players[owner].deck.map(c=>c.uid),beforeDeck);
  assert.equal(s.players[owner].apCards.filter(c=>c.ready).length,beforeAp-1);
  assert.deepEqual(legalUniversalActions(packs,s),[
   {type:'chooseTopFiltered',uid:null},{type:'chooseTopFiltered',uid:window[1].uid}
  ]);
  assert.equal(universalPrivateChoices(packs,s,1-owner),null);
  assert.equal(universalPrivateChoices(packs,s,owner).options[1].card.cardId,'MST-1-070');
  const opp=universalPublicView(packs,s,1-owner);
  assert.equal(opp.players[owner].hand,null);
  for(const c of window)assert.ok(!JSON.stringify(opp).includes(JSON.stringify(c.uid)),
   'private inspected physical UID must not occur as an exact JSON string token');
  const snapshot=structuredClone(s);
  for(const uid of [window[0].uid,window[2].uid,'1-999999']){
   assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid},{actor:owner}),/not currently legal/);
   assert.deepEqual(s,snapshot,'illegal uninspected/nonmatching choice never mutates state');
  }
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid},{actor:1-owner}),/Wrong player/);
  s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:window[1].uid},{actor:owner});
  assert.equal(s.pending?.kind,'effect-top-order');
  assert.equal(s.pending?.discardAfter,true);
  const rest=[window[2].uid,window[0].uid];
  s=order(packs,s,rest,owner);
  assert.deepEqual(s.players[owner].deck.map(c=>c.uid),[...beforeDeck.slice(3),...rest]);
  assert.equal(s.pending?.kind,'effect-discard','pay discard only AFTER ordering');
  assert.ok(legalUniversalActions(packs,s).some(a=>a.type==='chooseDiscard'&&a.uid===window[1].uid));
  assert.throws(()=>dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:null},{actor:owner}),/not currently legal/);
  s=dispatchUniversalAction(packs,s,{type:'chooseDiscard',uid:window[1].uid},{actor:owner});
  assert.equal(s.pending,null);
  assert.ok(s.players[owner].outside.some(c=>c.uid===window[1].uid));
  assert.equal(s.players[owner].front[0].uid,source.uid);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('MST055 skip an eligible card: inspected TOP3 all ordered to bottom, never force hand discard',()=>{
 let {s,packs,owner,play,window}=setup(0);
 const before=s.players[owner].deck.map(c=>c.uid),hand=s.players[owner].hand.length;
 s=dispatchUniversalAction(packs,s,play);
 s=dispatchUniversalAction(packs,s,{type:'chooseTopFiltered',uid:null});
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.equal(s.pending?.discardAfter,undefined);
 const rest=window.map(c=>c.uid).reverse();
 s=order(packs,s,rest,owner);
 assert.equal(s.pending,null);
 assert.equal(s.players[owner].hand.length,hand-1);
 assert.deepEqual(s.players[owner].deck.map(c=>c.uid),[...before.slice(3),...rest]);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('MST055 no trait in top 3 never considers trait fourth; avoids any forced discard',()=>{
 let {s,packs,play,window}=setup(0,['MST-1-001','MST-1-002','MST-1-016']);
 const fourth=take(s,0,'MST-1-070');s.players[0].deck.splice(3,0,fourth);
 const before=s.players[0].deck.map(c=>c.uid);
 s=dispatchUniversalAction(packs,s,play);
 assert.equal(s.pending?.kind,'effect-top-order');
 assert.deepEqual(s.pending?.uids,window.map(c=>c.uid));
 assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===fourth.uid));
 s=order(packs,s,window.map(c=>c.uid),0);
 assert.equal(s.pending,null);
 assert.deepEqual(s.players[0].deck.map(c=>c.uid),[...before.slice(3),...window.map(c=>c.uid)]);
 assert.equal(s.players[0].deck[0].uid,fourth.uid);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('MST055 must reject invented name filters, foreign trait conditions or altered TOP N at pack validation',()=>{
 const base={id:'QA-055',name:'MST synthetic',color:'green',type:'character',energy:1,ap:1,bp:2000,gen:1,
  implementation:'dsl',templateEffects:{onPlay:[{template:'searchTopOneBottomDiscard',count:3,
   filter:{field:'trait',value:'ラノア魔法大学'}}]}};
 const build=c=>createUniversalPack({id:'mst-top-audit-qa',cards:[c]});
 assert.doesNotThrow(()=>build(base));
 for(const spec of [
  {template:'searchTopOneBottomDiscard',count:0,filter:{field:'trait',value:'ラノア魔法大学'}},
  {template:'searchTopOneBottomDiscard',count:6,filter:{field:'trait',value:'ラノア魔法大学'}},
  {template:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:''}},
  {template:'searchTopOneBottomDiscard',count:3,filter:{field:'trait',value:'ラノア魔法大学'},shuffle:true}
 ])assert.throws(()=>build({...base,templateEffects:{onPlay:[spec]}}),/invalid/);
 assert.throws(()=>build({...base,implementation:'vanilla'}),/vanilla/);
});
