import {EXPECTED_V2_COUNTS} from './fixtures/v2-integrated-id-manifest.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {MST_V2_OFFICIAL_BY_ID} from '../dist/universal-v2/sources/mst-inventory.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalBp,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

// UA54BT/MST-1-003: two own physical field CHARACTER names; FRONT + ENERGY,
// never the opponent field, hidden underlayers, hand or outside.
const mst=registeredV2TitlePack('mushoku-tensei');
const sao=registeredV2TitlePack('sword-art-online');
const mstIds=['MST-1-001','MST-1-002','MST-1-003','MST-1-010',
 'MST-1-012','MST-1-015','MST-1-017','MST-1-018','MST-1-019',
 'MST-1-020','MST-1-022','MST-1-027','MST-1-029'];
const mstDeck=Object.fromEntries(mstIds.map(id=>[id,4]));
mstDeck[mstIds.at(-1)]=2;
const saoIds=['SAO-1-001','SAO-1-016','SAO-1-019','SAO-1-023',
 'SAO-1-035','SAO-1-039','SAO-1-042','SAO-1-046','SAO-1-054',
 'SAO-1-055','SAO-1-058','SAO-2-021','SAO-1-061'];
const saoDeck=Object.fromEntries(saoIds.map(id=>[id,4]));
saoDeck[saoIds.at(-1)]=2;
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing real physical card '+id);
}
function put(s,p,id,line,index){
 assert.equal(s.players[p][line][index],null);
 const c=take(s,p,id);c.ready=true;s.players[p][line][index]=c;
 return c;
}
function scene(owner=0,seed=3003){
 const packs=owner===0?[mst,sao]:[sao,mst];
 const decks=owner===0?[mstDeck,saoDeck]:[saoDeck,mstDeck];
 let s=newUniversalMatch(packs,{decks,seed,first:owner});
 const source=take(s,owner,'MST-1-003');
 s.players[owner].hand.push(source);
 put(s,owner,'MST-1-001','energy',0);
 for(let n=0;n<4&&s.phase!=='main';n++)
  s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>
  a.type==='play'&&a.uid===source.uid&&a.line==='front'&&a.slot===0);
 assert.ok(play,'printed blue1 and AP1 should allow normal play');
 s=dispatchUniversalAction(packs,s,play,{actor:owner});
 assert.equal(s.players[owner].front[0].uid,source.uid);
 return {s,packs,owner,source};
}
test('official JP MST-003 text, DRAW Life and immutable generic AND-name condition',()=>{
 const source=MST_V2_OFFICIAL_BY_ID['MST-1-003'];
 const compiled=mst.cards['MST-1-003'];
 assert.ok(source.source.endsWith('UA54BT%2FMST-1-003'));
 assert.equal(source.nameJa,'エリス');
 assert.equal(source.effectJa,
  '自分の場に〈ルーデウス〉と〈ルイジェルド〉がある場合、このキャラはBP+1000。');
 assert.deepEqual([compiled.color,compiled.energy,compiled.ap,compiled.bp,
  compiled.gen,compiled.type,compiled.trigger,compiled.traits],
  ['blue',1,1,2000,1,'character','draw',[]]);
 assert.equal(compiled.implementation,'dsl');
 assert.deepEqual(compiled.passiveBonuses,[{condition:{
  kind:'ownFieldHasAllNames',turn:'any',zone:'field',excludeSelf:false,
  names:['ルーデウス','ルイジェルド']},bp:1000}]);
 assert.deepEqual(compiled.effects,{});
 assert.ok(Object.isFrozen(compiled.passiveBonuses));
 assert.equal(Object.keys(mst.cards).length,EXPECTED_V2_COUNTS['mushoku-tensei']);
 assert.deepEqual(validateUniversalDeck(mst,mstDeck),[]);
 assert.deepEqual(validateUniversalDeck(sao,saoDeck),[]);
});
test('MST P0 vs SAO P1: two names across lines give live BP+1000, departure retracts',()=>{
 const {s,packs,owner,source}=scene();
 const beforeAp=s.players[owner].apCards.filter(a=>a.ready).length;
 assert.equal(universalBp(packs,s,source),2000);
 const rudeus=put(s,owner,'MST-1-022','energy',1);
 assert.equal(universalBp(packs,s,source),2000);
 const ruijerd=put(s,owner,'MST-1-020','front',1);
 assert.equal(universalBp(packs,s,source),3000);
 assert.equal(universalPublicView(packs,s,1).players[owner].front[0].bp,3000);
 assert.equal(universalPublicView(packs,s,1).players[owner].hand,null);
 ruijerd.ready=false;rudeus.ready=false;
 assert.equal(universalBp(packs,s,source),3000,'REST allies still exist');
 s.active=1;
 assert.equal(universalBp(packs,s,source),3000,'condition works during either turn');
 s.active=0;
 s.players[owner].front[1]=null;
 s.players[owner].outside.push(ruijerd);
 assert.equal(universalBp(packs,s,source),2000);
 assert.equal(s.players[owner].apCards.filter(a=>a.ready).length,beforeAp);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('MST P1 vs SAO P0: own hand/outside are not on-field name conditions',()=>{
 const {s,packs,owner,source}=scene(1,3013);
 assert.equal(universalBp(packs,s,source),2000);
 const rudeus=take(s,owner,'MST-1-022');
 s.players[owner].hand.push(rudeus);
 const ruijerd=take(s,owner,'MST-1-020');
 s.players[owner].outside.push(ruijerd);
 assert.equal(universalBp(packs,s,source),2000);
 s.players[owner].hand.splice(s.players[owner].hand.findIndex(c=>c.uid===rudeus.uid),1);
 s.players[owner].energy[1]=rudeus;
 assert.equal(universalBp(packs,s,source),2000);
 s.players[owner].outside.splice(s.players[owner].outside.findIndex(c=>c.uid===ruijerd.uid),1);
 s.players[owner].energy[2]=ruijerd;
 assert.equal(universalBp(packs,s,source),3000);
 assert.equal(universalPublicView(packs,s,0).players[owner].front[0].bp,3000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('two Ruijerd copies do not replace Rudeus; enemy-owned name does not count',()=>{
 const packs=[mst,mst];
 const s=newUniversalMatch(packs,{decks:[mstDeck,mstDeck],seed:3014,first:0});
 const source=put(s,0,'MST-1-003','front',0);
 put(s,0,'MST-1-020','energy',0);
 put(s,0,'MST-1-020','energy',1);
 put(s,1,'MST-1-022','front',0);
 assert.equal(universalBp(packs,s,source),2000);
 const rudeus=put(s,0,'MST-1-022','front',1);
 assert.equal(universalBp(packs,s,source),3000);
 s.players[0].front[1]=null;
 s.players[0].hand.push(rudeus);
 assert.equal(universalBp(packs,s,source),2000);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('strict shared AND-name predicate rejects missing/duplicated names, leaked zones and unknown fields',()=>{
 const source={id:'SYN-1',name:'Synthetic',type:'character',color:'blue',
  energy:0,ap:1,bp:2000,gen:1,implementation:'dsl',effects:{}};
 const good={kind:'ownFieldHasAllNames',turn:'any',zone:'field',
  excludeSelf:false,names:['ルーデウス','ルイジェルド']};
 const create=(condition,extra={})=>createUniversalPack({id:'predicate-contract',cards:[{
  ...source,...extra,passiveBonuses:[{condition,bp:1000}]}]});
 assert.doesNotThrow(()=>create(good));
 for(const q of [
  {...good,names:[]},
  {...good,names:['ルーデウス']},
  {...good,names:['ルーデウス','ルーデウス']},
  {...good,names:['','ルイジェルド']},
  {...good,names:['ルーデウス',null]},
  {...good,names:['a','b','c','d','e','f','g','h','i']},
  {...good,names:'ルーデウス,ルイジェルド'},
  {...good,zone:'outside'},
  {...good,excludeSelf:'false'},
  {...good,turn:'enemy'},
  {...good,allowOpponent:true},
  {...good,min:2},
  {kind:'ownFieldHasAllNames',turn:'any',zone:'field',
   names:['ルーデウス','ルイジェルド']}
 ])assert.throws(()=>create(q),/invalid/,JSON.stringify(q));
 assert.throws(()=>create(good,{type:'event',bp:0,gen:0}),/unsupported passive/);
 assert.throws(()=>create(good,{implementation:'vanilla'}),/vanilla/);
});
