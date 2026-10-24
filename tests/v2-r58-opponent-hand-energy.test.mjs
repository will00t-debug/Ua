import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {registeredV2TitlePack} from '../dist/universal-v2/title-packs/registry.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 effectiveHandRequiredEnergy,universalPublicView,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

// All six source records were read from the Japanese official pages on
// 2026-10-24 and registered by Cursor C2. Each printed card: required 3 of
// its own color, AP 1, generated 2 of its own color, BP 3000, no trigger.
// While the card is in hand, required energy is 2 when an opponent FRONT or
// ENERGY card has one of the two enumerated colors. No card-specific FAQ
// was on those pages. The fixture below stays only for malformed-profile
// rejection; gameplay uses the production packs.
const PRINTED=[
 ['bleach','BLC-1-007','yellow',['purple','green'],'Jerome Guizbatt','UE01BT'],
 ['bleach','BLC-1-044','purple',['yellow','green'],'Akon','UE01BT'],
 ['bleach','BLC-1-073','green',['yellow','purple'],'Rojuro Ohtoribashi','UE01BT'],
 ['sword-art-online','SAO-1-015','yellow',['blue','green'],'Deusolbert Synthesis Seven','UE07BT'],
 ['sword-art-online','SAO-1-050','blue',['yellow','green'],'Alicia Rue','UE07BT'],
 ['sword-art-online','SAO-1-092','green',['yellow','blue'],'Spiegel','UE07BT']
];
const fixture=([title,id,color,colors,name])=>({
 id,name,color,type:'character',energy:3,ap:1,bp:3000,gen:2,
 traits:[],trigger:null,implementation:'dsl',
 opponentFieldColorsHandEnergyDiscount:{colors,amount:1},effects:{}
});
function testOnlyPack(profile){
 const base=registeredV2TitlePack(profile[0]);
 const live=base.cards[profile[1]];
 assert.ok(live,'C2 production card '+profile[1]);
 assert.equal(live.energy,3);
 assert.equal(live.ap,1);
 assert.equal(live.gen,2);
 assert.equal(live.bp,3000);
 assert.equal(live.trigger,null);
 assert.deepEqual(live.opponentFieldColorsHandEnergyDiscount,{colors:profile[3],amount:1});
 return base;
}
// All physical cards in either player's deck have actual card IDs; 50
// physical cards, <=4 of each ID, no invented dummy cards or invalid triggers.
function deck(pack,color,required=[]){
 const options=Object.values(pack.cards).filter(c=>c.color===color&&c.type==='character'&&
  c.maxCopies===4&&!['special','color','final'].includes(c.trigger)).sort((a,b)=>a.id.localeCompare(b.id));
 const first=options.filter(c=>required.includes(c.id));
 const donor=options.filter(c=>c.gen===1&&!required.includes(c.id));
 const choices=[...first,...donor.slice(0,2),...options.filter(c=>
  !required.includes(c.id)&&!donor.slice(0,2).some(x=>x.id===c.id))].slice(0,13);
 assert.equal(choices.length,13,'Need 13 real same-color IDs for '+color);
 const counts=Object.fromEntries(choices.map((c,i)=>[c.id,i===12?2:4]));
 assert.deepEqual(validateUniversalDeck(pack,counts),[]);
 return {counts,donors:donor.slice(0,2).map(c=>c.id)};
}
function take(s,p,id){
 for(const zone of ['hand','deck','life']){
  const arr=s.players[p][zone],i=arr.findIndex(c=>c.cardId===id);
  if(i>=0)return arr.splice(i,1)[0];
 }
 throw Error('Missing real physical card '+id);
}
function toMain(s,packs){
 for(let i=0;i<2;i++)s=dispatchUniversalAction(packs,s,{type:'next'});
 assert.equal(s.phase,'main');return s;
}
function readyField(s,p,card,line,slot){
 card.ready=true;card.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[p][line][slot]=card;
}
function setup(profile,opponentColor){
 const ownPack=testOnlyPack(profile),foePack=registeredV2TitlePack(profile[0]);
 const own=deck(ownPack,profile[2],[profile[1]]);
 const foe=deck(foePack,opponentColor);
 const packs=[ownPack,foePack];
 let s=toMain(newUniversalMatch(packs,{decks:[own.counts,foe.counts],first:0,seed:580007}),packs);
 const play=take(s,0,profile[1]);s.players[0].hand.push(play);
 // Exactly 2 available matching pips; a printed 3-cost character requires
 // its live, opponent-field-color reduction to become legal.
 assert.equal(own.donors.length,2);
 for(let i=0;i<2;i++)readyField(s,0,take(s,0,own.donors[i]),'energy',i);
 const match=take(s,1,Object.keys(foe.counts)[0]);
 readyField(s,1,match,'energy',0);
 assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
 return {packs,s,play,match};
}
for(const profile of PRINTED){
 test('R58 source-pinned '+profile[1]+' opponent-color hand required energy in real 50-card games',()=>{
  const official='https://www.unionarena-tcg.com/na/cardlist/detail_iframe.php?card_no='+
   profile[5]+'%2F'+profile[1];
  assert.ok(official.includes(profile[1]));
  for(const color of profile[3]){
   let {packs,s,play,match}=setup(profile,color);
   const printed=packs[0].cards[profile[1]];
   assert.equal(printed.energy,3);assert.equal(printed.ap,1);assert.equal(printed.gen,2);
   assert.equal(effectiveHandRequiredEnergy(packs,s,0,printed),2);
   const legal=legalUniversalActions(packs,s);
   const action=legal.find(a=>a.type==='play'&&a.uid===play.uid&&a.line==='front');
   assert.ok(action,'opponent '+color+' field permits hand play');
   assert.equal(universalPublicView(packs,s,1).players[0].hand,null);
   const spentBefore=s.players[0].apCards.filter(c=>c.ready).length;
   s=dispatchUniversalAction(packs,s,action);
   assert.ok(s.players[0].front.some(c=>c?.uid===play.uid));
   assert.equal(s.players[0].apCards.filter(c=>c.ready).length,spentBefore-1);
   assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
  }
 });
 test('R58 '+profile[1]+' negative: wrong-zone, opponent color and AP gates',()=>{
  const {packs,s,play,match}=setup(profile,profile[3][0]);
  const id=profile[1],printed=packs[0].cards[id];
  // The matching card is publicly visible on opponent field; own matching
  // field color never substitutes for it. Move opponent card outside.
  s.players[1].energy[0]=null;match.fieldEntryStamp=null;
  s.players[1].outside.push(match);
  assert.equal(effectiveHandRequiredEnergy(packs,s,0,printed),3);
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===play.uid&&a.type==='play'));
  assert.equal(assertUniversalMatch(packs,structuredClone(s)),true);
  // Opponent FRONT counts as field too; energy is not a special exception.
  s.players[1].outside.pop();readyField(s,1,match,'front',0);
  assert.equal(effectiveHandRequiredEnergy(packs,s,0,printed),2);
  assert.ok(legalUniversalActions(packs,s).some(a=>a.uid===play.uid&&a.type==='play'));
  for(const ap of s.players[0].apCards)ap.ready=false;
  assert.ok(!legalUniversalActions(packs,s).some(a=>a.uid===play.uid&&a.type==='play'));
  assert.equal(printed.energy,3,'never mutate printed energy');
 });
}
test('R58 reject untrusted or malformed color-cost profiles (fail closed)',()=>{
 const good=fixture(PRINTED[0]);
 const bad=[
  {colors:['purple','purple'],amount:1},
  {colors:['yellow','green'],amount:1},
  {colors:['purple','green'],amount:2},
  {colors:['purple'],amount:1},
  {colors:['purple','green'],amount:1,secret:true},
  {colors:['purple','invisible'],amount:1}
 ];
 for(const p of bad)
  assert.throws(()=>createUniversalPack({id:'invalid-r58',cards:[{
   ...good,opponentFieldColorsHandEnergyDiscount:p}]}));
 assert.throws(()=>createUniversalPack({id:'invalid-vanilla',cards:[{
  ...good,implementation:'vanilla'}]}));
 assert.throws(()=>createUniversalPack({id:'invalid-own-stack',cards:[{
  ...good,emptyOwnFieldHandEnergyDiscount:1}]}));
});
