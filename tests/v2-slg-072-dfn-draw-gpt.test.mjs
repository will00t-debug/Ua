import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_LEVELING_CARDS} from '../dist/solo-leveling.mjs';
import {createSlgV2Pack} from '../dist/universal-v2/slg-pack.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {EXPECTED_V2_IDS} from './fixtures/v2-integrated-id-manifest.mjs';

// Source: https://www.unionarena-tcg.com/jp/cardlist/detail_iframe.php?card_no=UA51BT%2FSLG-1-072
// SLG-1-072: 3 green, 1 AP, 2000 BP, 2 green generated energy,
// DFN／第四次架南島レイド, no LIFE trigger.
// OnPlay draw 1 if OWN FIELD has >=3 DFN cards, including the entering card.
const slg=createSlgV2Pack(),packs=[slg,slg];
const required=['SLG-1-072','SLG-1-069','SLG-1-065','SLG-1-062','SLG-1-056'];
const rest=Object.values(slg.cards).filter(c=>c.type==='character'&&
 c.maxCopies===4&&!required.includes(c.id)&&!['special','color','final'].includes(c.trigger))
 .map(c=>c.id).sort();
const ids=[...required,...rest.slice(0,8)];
assert.equal(ids.length,13);
const counts=Object.fromEntries(ids.map((id,i)=>[id,i===12?2:4]));
assert.deepEqual(validateUniversalDeck(slg,counts),[]);
function take(s,p,id){
 for(const zone of ['hand','deck','life','outside','removed']){
  const a=s.players[p][zone],i=a.findIndex(c=>c.cardId===id);
  if(i>=0)return a.splice(i,1)[0];
 }
 throw Error('Missing card: '+id);
}
function setup({dfn=2,oppDfn=0,line='front'}={}){
 let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1072,first:0});
 const mia=take(s,0,'SLG-1-072');s.players[0].hand.push(mia);
 const energyIDs=dfn===2?['SLG-1-069','SLG-1-065','SLG-1-062']:
  dfn===1?['SLG-1-069','SLG-1-062','SLG-1-056']:
  ['SLG-1-062','SLG-1-056','SLG-1-062'];
 for(const [i,id] of energyIDs.entries()){
  const c=take(s,0,id);c.ready=true;s.players[0].energy[i]=c;
 }
 for(let i=0;i<oppDfn;i++){
  const c=take(s,1,i?'SLG-1-065':'SLG-1-069');c.ready=true;s.players[1].energy[i]=c;
 }
 for(let i=0;i<5&&s.phase!=='main';i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');
 const play=legalUniversalActions(packs,s).find(a=>a.type==='play'&&a.uid===mia.uid&&a.line===line&&
 a.slot===(line==='front'?0:3));
 assert.ok(play,'3 printed green energy and 1 AP must enable a normal play');
 return {s,play,mia};
}
test('072 exact official fingerprint, independently registered ID and strict typed DSL',()=>{
 const cat=SOLO_LEVELING_CARDS.find(c=>c.id==='SLG-1-072');
 assert.equal(cat.nameJa,'ミズア');assert.equal(cat.energy,3);
 assert.equal(cat.ap,1);assert.equal(cat.bp,2000);assert.equal(cat.gen,2);
 assert.equal(cat.trigger,null);
 const card=slg.cards['SLG-1-072'];
 assert.deepEqual(card.traits,['DFN／第四次架南島レイド']);
 assert.deepEqual(card.traitComponents,['DFN','第四次架南島レイド']);
 assert.deepEqual(card.effects.onPlay,[{op:'drawIfOwnTraitCount',
  trait:'DFN',zone:'field',excludeSelf:false,min:3,count:1}]);
 assert.equal(EXPECTED_V2_IDS['solo-leveling'].includes(card.id),true);
 assert.deepEqual(validateUniversalDeck(slg,counts),[]);
});
for(const line of ['front','energy'])test('072 counts its own play and two other audited DFN on OWN field; '+line,()=>{
 const {s,play,mia}=setup({dfn:2,line});
 const hand=s.players[0].hand.length,top=s.players[0].deck[0].uid,
  deck=s.players[0].deck.length,activeAp=s.players[0].apCards.filter(a=>a.inPlay&&a.ready).length;
 const next=dispatchUniversalAction(packs,s,play);
 assert.equal(next.pending,null);
 assert.equal(next.players[0].hand.length,hand,'pay one card, draw one');
 assert.equal(next.players[0].deck.length,deck-1);
 assert.equal(next.players[0].hand.at(-1).uid,top);
 assert.equal(next.players[0][line][line==='front'?0:3].uid,mia.uid);
 assert.equal(next.players[0].apCards.filter(a=>a.inPlay&&a.ready).length,activeAp-1);
 assert.equal(universalPublicView(packs,next,1).players[0].hand,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('072 does not count opposing DFN, own hand/outside or unverified zones',()=>{
 const {s,play}=setup({dfn:1,oppDfn:2});
 s.players[0].hand.push(take(s,0,'SLG-1-065'));
 s.players[0].outside.push(take(s,0,'SLG-1-069'));
 const deck=s.players[0].deck.map(c=>c.uid),hand=s.players[0].hand.length;
 const next=dispatchUniversalAction(packs,s,play);
 assert.deepEqual(next.players[0].deck.map(c=>c.uid),deck);
 assert.equal(next.players[0].hand.length,hand-1);
 assert.equal(next.pending,null);
 assert.equal(assertUniversalMatch(packs,next),true);
});
test('typed trait-count draw rejects malformed traits, zones, optionality, threshold and wrong timing',()=>{
 const basic={id:'T',name:'Test',color:'green',energy:0,ap:1,bp:1000,gen:1,
  type:'character',implementation:'dsl'};
 const good={template:'drawIfOwnTraitCount',trait:'DFN',zone:'field',
  excludeSelf:false,min:3,count:1};
 const mk=effect=>createUniversalPack({id:'trait-qa',cards:[{...basic,templateEffects:{onPlay:[effect]}}]});
 assert.deepEqual(mk(good).cards.T.effects.onPlay,
  [{op:'drawIfOwnTraitCount',trait:'DFN',zone:'field',excludeSelf:false,min:3,count:1}]);
 for(const changed of [{trait:''},{zone:'hand'},{excludeSelf:'no'},{min:0},
  {min:9},{count:0},{count:6},{opponent:true}]){
  assert.throws(()=>mk({...good,...changed}),/invalid|incompatible/);
 }
 assert.throws(()=>createUniversalPack({id:'wrong-timing',cards:[{...basic,
  templateEffects:{onAttack:[good]}}]}),/only a character onPlay/);
 assert.throws(()=>createUniversalPack({id:'wrong-raw',cards:[{...basic,
  effects:{onPlay:[{op:'drawIfOwnTraitCount',trait:'DFN',zone:'field',
    excludeSelf:false,min:3,count:1,countOpponent:true}]}}]}),/invalid/);
});
