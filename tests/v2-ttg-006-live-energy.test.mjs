import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {createTtgV2Pack,TTG_V2_ADDITION_IDS} from '../dist/universal-v2/ttg-pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalEnergyByColor,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

const ttg=registeredV2TitlePack('gurren-lagann'),sao=registeredV2TitlePack('sword-art-online');
const ttgDeck=Object.fromEntries(['001','005','006','009','014','019','042','043','047','051','064','065']
 .map(n=>['TTG-1-'+n,4]));
ttgDeck['TTG-1-036']=2;
const saoDeck=Object.fromEntries(['SAO-1-001','SAO-1-016','SAO-1-019','SAO-1-023',
 'SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-054',
 'SAO-1-055','SAO-1-058','SAO-2-021'].map(id=>[id,4]));
saoDeck['SAO-1-061']=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const list=s.players[p][zone],i=list.findIndex(c=>c.cardId===id);
  if(i>=0)return list.splice(i,1)[0];
 }
 throw Error('physical card missing '+id);
}
function main(packs,s){
 for(let n=0;n<4&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function scene(owner=0,seed=6106){
 const packs=owner===0?[ttg,sao]:[sao,ttg];
 let s=newUniversalMatch(packs,{decks:owner===0?[ttgDeck,saoDeck]:[saoDeck,ttgDeck],
  first:owner,seed});
 const subject=take(s,owner,'TTG-1-006');
 const a=take(s,owner,'TTG-1-014'),b=take(s,owner,'TTG-1-014'),
  flexible=take(s,owner,'TTG-1-019');
 a.ready=b.ready=true;flexible.ready=false;
 s.players[owner].energy[0]=a;
 s.players[owner].energy[1]=b;
 s.players[owner].energy[2]=flexible;
 s.players[owner].hand.push(subject);
 s=main(packs,s);
 const play=legalUniversalActions(packs,s).find(x=>x.type==='play'&&x.uid===subject.uid&&
  x.line==='front'&&x.slot===0);
 assert.ok(play,'five generated GREEN energy meets printed green2 requirement');
 s=dispatchUniversalAction(packs,s,play,{actor:owner});
 assert.equal(s.players[owner].front[0].uid,subject.uid);
 return {packs,s,owner,subject,flexible};
}
test('TTG-006 exactly pins source-owned front-PDF print and existing reusable live predicate',()=>{
 const source=TTG_BY_ID['TTG-1-006'],compiled=ttg.cards['TTG-1-006'];
 assert.equal(source.verifiedFrom,'user-uploaded-card-front-pdf-2026-10-13');
 assert.equal(source.number,'UA56BT/TTG-1-006');
 assert.equal(source.nameJa,'キタン');
 assert.match(source.effect,/自己的能源達 6 以上時/);
 assert.equal(source.source,'https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA56BT%2FTTG-1-006');
 assert.deepEqual([compiled.color,compiled.energy,compiled.ap,compiled.bp,compiled.gen,compiled.type,compiled.trigger,compiled.traits],
  ['green',2,1,3000,1,'character',null,['大グレン団']]);
 assert.deepEqual(compiled.passiveBonuses,[{condition:{kind:'ownEnergyAtLeast',turn:'own',min:6},bp:1000}]);
 assert.deepEqual(compiled.effects,{});
 assert.equal(ttg.cards['TTG-1-006'].implementation,'dsl');
 assert.ok(TTG_V2_ADDITION_IDS.includes('TTG-1-006'));
 assert.equal(Object.keys(ttg.cards).length,EXPECTED_V2_COUNTS['gurren-lagann']);
 assert.deepEqual(validateUniversalDeck(ttg,ttgDeck),[]);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
});
test('TTG P0 vs SAO P1 real play: FIVE generated energy BP3000; change ACTIVE producer to SIX and BP4000, then back',()=>{
 const {packs,s:before,owner,subject,flexible}=scene();
 const paidAp=before.players[owner].apCards.filter(c=>c.ready).length;
 assert.equal(flexible.ready,false);
 assert.equal(universalEnergyByColor(packs,before,owner).green,5);
 assert.equal(universalBp(packs,before,before.players[owner].front[0]),3000);
 assert.equal(universalPublicView(packs,before,1).players[owner].front[0].bp,3000);
 const awake=structuredClone(before),extra=awake.players[owner].energy[2];
 extra.ready=true;
 assert.equal(universalEnergyByColor(packs,awake,owner).green,6);
 assert.equal(universalBp(packs,awake,awake.players[owner].front[0]),4000);
 assert.equal(universalPublicView(packs,awake,1).players[owner].front[0].bp,4000);
 assert.equal(awake.players[owner].apCards.filter(c=>c.ready).length,paidAp);
 assert.equal(awake.players[owner].front[0].ready,false,'REST source still gets passive');
 extra.ready=false;
 assert.equal(universalEnergyByColor(packs,awake,owner).green,5);
 assert.equal(universalBp(packs,awake,awake.players[owner].front[0]),3000);
 assert.deepEqual(before.players[owner].front[0].uid,subject.uid);
 assert.equal(assertUniversalMatch(packs,before),true);
 assert.equal(assertUniversalMatch(packs,awake),true);
});
test('TTG P1 vs SAO P0: own generated colors only; opponent energy never counts, unrelated hand does not count',()=>{
 const {packs,s:before,owner,subject}=scene(1,6621);
 assert.equal(owner,1);assert.ok(subject.uid.startsWith('1-'));
 const s=structuredClone(before);
 const opponent=take(s,0,'SAO-1-016'),extra=take(s,0,'SAO-1-016');
 opponent.ready=true;extra.ready=true;
 s.players[0].energy[0]=opponent;
 s.players[0].energy[1]=extra;
 assert.equal(universalEnergyByColor(packs,s,owner).green,5);
 assert.equal(universalBp(packs,s,s.players[owner].front[0]),3000);
 s.players[owner].energy[2].ready=true;
 assert.equal(universalEnergyByColor(packs,s,owner).green,6);
 assert.equal(universalBp(packs,s,s.players[owner].front[0]),4000);
 const foe=universalPublicView(packs,s,0);
 assert.equal(foe.players[owner].front[0].bp,4000);
 assert.equal(foe.players[owner].hand,null,'opponent hidden hand never leaked through dynamic BP');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('TTG continuous bonus is own-turn only and resumes after OWN refresh, no opponent turn BP',()=>{
 const {packs,s:before,owner}=scene();
 let s=structuredClone(before);
 s.players[0].energy[2].ready=true;
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000);
 s=dispatchUniversalAction(packs,s,{type:'next'}); // own MAIN -> ATTACK
 s=dispatchUniversalAction(packs,s,{type:'next'}); // ATTACK -> opponent START
 assert.equal(s.active,1);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),3000);
 assert.equal(universalEnergyByColor(packs,s,0).green,6,
  'producer can still be ACTIVE but printed own-turn BP gate is OFF');
 for(let n=0;n<4;n++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.active,0);
 assert.equal(universalBp(packs,s,s.players[0].front[0]),4000,
  'same still-field OWN card gets dynamic passive on next own turn');
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('leave ENERGY line in a valid frame immediately removes threshold without snapshot or extra AP',()=>{
 const {packs,s:before,owner}=scene(0,6623);
 const state=structuredClone(before);
 state.players[owner].energy[2].ready=true;
 assert.equal(universalBp(packs,state,state.players[owner].front[0]),4000);
 const moved=state.players[owner].energy.splice(2,1)[0];
 state.players[owner].energy.push(null);state.players[owner].hand.push(moved);
 assert.equal(universalEnergyByColor(packs,state,owner).green,4);
 assert.equal(universalBp(packs,state,state.players[owner].front[0]),3000);
 assert.equal(assertUniversalMatch(packs,state),true);
});
test('generic passive schema fails closed for invalid ownEnergy threshold, cross-zone and cyclic extraEnergy',()=>{
 const base={id:'SYN',name:'Test',type:'character',color:'green',
  energy:0,ap:1,bp:1000,gen:1,implementation:'dsl',effects:{},
  passiveBonuses:[{condition:{kind:'ownEnergyAtLeast',turn:'own',min:6},bp:1000}]};
 const compile=card=>createUniversalPack({id:'synthetic',cards:[card]});
 assert.doesNotThrow(()=>compile(base));
 for(const condition of [
  {kind:'ownEnergyAtLeast',turn:'own',min:0},
  {kind:'ownEnergyAtLeast',turn:'own',min:201},
  {kind:'ownEnergyAtLeast',turn:'own',min:6,zone:'front'},
  {kind:'ownEnergyAtLeast',turn:'own',min:6,excludeSelf:true},
  {kind:'ownEnergyAtLeast',turn:'enemy',min:6}
 ])assert.throws(()=>compile({...base,passiveBonuses:[{condition,bp:1000}]}),/invalid/);
 assert.throws(()=>compile({...base,passiveBonuses:[{
  condition:{kind:'ownEnergyAtLeast',turn:'own',min:6},extraEnergy:1}]}),/invalid|cyclic/);
 assert.throws(()=>compile({...base,type:'event',bp:0,gen:0}),/unsupported passive/);
});
