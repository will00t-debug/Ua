import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalCardEnergy,universalEnergyByColor,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei'),slg=registeredV2TitlePack('solo-leveling');
const mstDeck=Object.fromEntries(['001','002','010','012','013','016','017','019','050','055','063','070'].map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-057']=2;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043'].map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
function take(s,p,id){
 for(const z of ['hand','deck','life','outside']){
  const a=s.players[p][z],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing real card '+id);
}
function main(packs,s){
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
test('MST057 source-locked front production and real 50-card decks',()=>{
 const src=MST_V2_OFFICIAL_BY_ID['MST-1-057'],c=mst.cards['MST-1-057'];
 assert.equal(src.effectJa,'このキャラはフロントLでもエナジーを発生させる。');
 assert.equal(src.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-057');
 assert.deepEqual([c.name,c.color,c.energy,c.ap,c.bp,c.gen,c.type,c.traits,c.trigger],
  ['クリフ','green',4,1,3500,1,'character',['ラノア魔法大学'],'draw']);
 assert.equal(c.frontGeneratesEnergy,true);
 assert.equal(c.implementation,'dsl');
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
for(const owner of [0,1]){
 test('MST057 owner '+owner+' vs SLG: paid entry, REST front energy, legal cost, live zone changes',()=>{
  const packs=owner===0?[mst,slg]:[slg,mst];
  let s=newUniversalMatch(packs,{decks:owner===0?[mstDeck,slgDeck]:[slgDeck,mstDeck],first:owner,seed:57057+owner});
  const source=take(s,owner,'MST-1-057');s.players[owner].hand.push(source);
  for(let i=0;i<4;i++){const c=take(s,owner,'MST-1-050');c.ready=true;s.players[owner].energy[i]=c;}
  s=main(packs,s);
  assert.equal(universalEnergyByColor(packs,s,owner).green,4);
  assert.equal(universalCardEnergy(packs,s,owner,source),0);
  const action=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
  assert.ok(action);
  assert.throws(()=>dispatchUniversalAction(packs,s,action,{actor:1-owner}),/Wrong player/);
  const ap=s.players[owner].apCards.filter(c=>c.ready).length;
  s=dispatchUniversalAction(packs,s,action,{actor:owner});
  assert.equal(s.players[owner].front.some(c=>c?.uid===source.uid),true);
  assert.equal(s.players[owner].apCards.filter(c=>c.ready).length,ap-1);
  assert.equal(universalCardEnergy(packs,s,owner,source),1);
  assert.equal(universalEnergyByColor(packs,s,owner).green,5);
  assert.equal(universalEnergyByColor(packs,s,1-owner).green||0,0);
  for(let i=0;i<4;i++){s.players[owner].outside.push(s.players[owner].energy[i]);s.players[owner].energy[i]=null;}
  assert.equal(universalEnergyByColor(packs,s,owner).green,1);
  s.players[owner].front[s.players[owner].front.findIndex(c=>c?.uid===source.uid)]=null;
  s.players[owner].energy[0]=source;
  assert.equal(universalEnergyByColor(packs,s,owner).green,1);
  s.players[owner].energy[0]=null;s.players[owner].outside.push(source);
  assert.equal(universalCardEnergy(packs,s,owner,source),0);
  assert.equal(universalEnergyByColor(packs,s,owner).green||0,0);
  assert.equal(universalPublicView(packs,s,1-owner).players[owner].hand,null);
  assert.equal(assertUniversalMatch(packs,s),true);
 });
}
test('strict front energy schema rejects noncharacters, invalid values and faux vanilla',()=>{
 const base={id:'QA',name:'QA',color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',effects:{},frontGeneratesEnergy:true};
 const make=c=>createUniversalPack({id:'qa-front',cards:[c]});
 assert.equal(make(base).cards.QA.frontGeneratesEnergy,true);
 for(const v of [false,null,0,1,'yes'])assert.throws(()=>make({...base,frontGeneratesEnergy:v}),/invalid front-line energy|dsl without effects/);
 for(const type of ['event','field'])assert.throws(()=>make({...base,type}),/invalid front-line energy/);
 assert.throws(()=>make({...base,implementation:'vanilla'}),/vanilla/);
});
