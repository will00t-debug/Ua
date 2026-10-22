import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalEnergy,universalEnergyByColor,universalPublicView,
 assertUniversalMatch} from '../dist/universal-v2/engine.mjs';

const mst=registeredV2TitlePack('mushoku-tensei');
const slg=registeredV2TitlePack('solo-leveling');
const mstIds=['001','002','003','010','012','013','016','017','019','020','024','027','029'];
const mstDeck=Object.fromEntries(mstIds.map(n=>['MST-1-'+n,4]));
mstDeck['MST-1-029']=2;
mstDeck['MST-1-001']=1;
mstDeck['MST-1-050']=1;
mstDeck['MST-1-051']=1;
mstDeck['MST-1-063']=1;
const slgDeck=Object.fromEntries(['001','002','005','006','007','010','013','015','016','026','032','043']
 .map(n=>['SLG-1-'+n,4]));
slgDeck['SLG-1-041']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const a=s.players[p][zone],i=a.findIndex(x=>x.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing '+id+' physical card');
}
function scene(owner,withFourth,sourceLine='front',activeBonus=true){
 const packs=owner===0?[mst,slg]:[slg,mst];
 let s=newUniversalMatch(packs,{decks:owner===0?[mstDeck,slgDeck]:[slgDeck,mstDeck],
  first:owner,seed:63063+owner+(withFourth?10:0)});
 const energyIds=['MST-1-051','MST-1-010','MST-1-029',...(withFourth?['MST-1-050']:[])];
 for(let i=0;i<energyIds.length;i++){
  const c=take(s,owner,energyIds[i]);c.ready=true;s.players[owner].energy[i]=c;
 }
 const source=take(s,owner,'MST-1-063');
 s.players[owner].hand.push(source);
 for(let i=0;i<4&&s.phase!=='main';i++){
  const next=legalUniversalActions(packs,s).find(a=>a.type==='next');
  assert.ok(next);s=dispatchUniversalAction(packs,s,next);
 }
 assert.equal(s.phase,'main');
 const bonus=s.players[owner].energy[2];bonus.ready=activeBonus;
 const expected=(withFourth?7:6)-(activeBonus?0:1);
 assert.equal(universalEnergy(packs,s,owner),expected);
 assert.equal(universalEnergyByColor(packs,s,owner).green,withFourth?3:2);
 return {packs,s,owner,source,sourceLine};
}
function play({packs,s,owner,source,sourceLine}){
 const beforeDeck=s.players[owner].deck.length;
 const beforeAp=s.players[owner].apCards.filter(a=>a.ready).length;
 const a=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===source.uid&&
  a.line===sourceLine&&a.slot===(sourceLine==='front'?0:3));
 assert.ok(a,'must have printed GREEN2 available before paying play cost');
 assert.throws(()=>dispatchUniversalAction(packs,s,a,{actor:1-owner}),/Wrong player/);
 const after=dispatchUniversalAction(packs,s,a,{actor:owner});
 assert.equal(after.players[owner].apCards.filter(a=>a.ready).length,beforeAp-1);
 assert.equal(universalPublicView(packs,after,1-owner).players[owner].hand,null);
 assert.equal(assertUniversalMatch(packs,after),true);
 return {after,beforeDeck};
}
test('MST063 immutable Japanese onPlay energy>=7 full print, distinct DRAW life, strict reusable DSL',()=>{
 const p=MST_V2_OFFICIAL_BY_ID['MST-1-063'],d=mst.cards['MST-1-063'];
 assert.equal(p.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA54BT%2FMST-1-063');
 assert.equal(p.effectJa,'〖登場時〗 自分の発生エナジーが7以上ある場合、カードを1枚引く。');
 assert.deepEqual([d.name,d.color,d.energy,d.ap,d.bp,d.gen,d.traits,d.trigger],
  ['ノルン','green',2,1,2000,1,['ラノア魔法大学'],'draw']);
 assert.deepEqual(d.effects.onPlay,[{op:'drawIfOwnEnergyAtLeast',energy:7,count:1}]);
 assert.equal(d.implementation,'dsl');
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(slg,slgDeck),[]);
});
for(const owner of [0,1]){
 test('MST063 owner '+owner+' FRONT onPlay counts own generated total6 vs7, not printed cost or enemy',()=>{
  const six=scene(owner,false,'front'),seven=scene(owner,true,'front');
  const s0=play(six),s1=play(seven);
  assert.equal(s0.after.players[owner].deck.length,s0.beforeDeck,
   'threshold6 cannot draw, even if opponent has resources');
  assert.equal(s1.after.players[owner].deck.length,s1.beforeDeck-1);
  assert.ok(s1.after.players[owner].front[0].uid===seven.source.uid);
  assert.equal(universalEnergy(seven.packs,s1.after,owner),7);
  assert.equal(universalEnergy(seven.packs,s1.after,1-owner),0);
 });
}
test('MST063 entering available ENERGY slot adds its own green generation before onPlay threshold evaluation',()=>{
 const setup=scene(0,false,'energy');
 assert.equal(universalEnergy(setup.packs,setup.s,0),6);
 const {after,beforeDeck}=play(setup);
 assert.equal(universalEnergy(setup.packs,after,0),7);
 assert.equal(after.players[0].energy[3].uid,setup.source.uid);
 assert.equal(after.players[0].deck.length,beforeDeck-1);
 assert.equal(assertUniversalMatch(setup.packs,after),true);
});
test('MST063 active extra energy bonus is live; RESTed producer changes 7 to6 without an extra paid activation',()=>{
 const setup=scene(0,true,'front',false);
 assert.equal(universalEnergy(setup.packs,setup.s,0),6);
 const {after,beforeDeck}=play(setup);
 assert.equal(after.players[0].deck.length,beforeDeck);
 assert.equal(assertUniversalMatch(setup.packs,after),true);
});
test('shared energy threshold draw template rejects invented fields, nonpositive/oversized counts and energy',()=>{
 const base={id:'QA-63',name:'Energy Draw',type:'character',color:'green',energy:2,
  ap:1,bp:2000,gen:1,implementation:'dsl',effects:{onPlay:[{op:'drawIfOwnEnergyAtLeast',energy:7,count:1}]}};
 const build=card=>createUniversalPack({id:'energy-draw-qa',cards:[card]});
 assert.doesNotThrow(()=>build(base));
 for(const op of [
  {op:'drawIfOwnEnergyAtLeast',energy:0,count:1},
  {op:'drawIfOwnEnergyAtLeast',energy:51,count:1},
  {op:'drawIfOwnEnergyAtLeast',energy:7,count:0},
  {op:'drawIfOwnEnergyAtLeast',energy:7,count:6},
  {op:'drawIfOwnEnergyAtLeast',energy:7,count:1,zone:'front'},
  {op:'drawIfOwnEnergyAtLeast',energy:7},
  {op:'drawIfOwnEnergyAtLeast',energy:7.5,count:1}
 ])assert.throws(()=>build({...base,effects:{onPlay:[op]}}),/invalid own-energy draw/);
 assert.throws(()=>build({...base,implementation:'vanilla'}),/vanilla/);
});
