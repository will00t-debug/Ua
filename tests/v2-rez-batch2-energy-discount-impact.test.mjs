import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,effectiveHandRequiredEnergy,
 legalUniversalActions,newUniversalMatch,universalCardEnergy} from '../dist/universal-v2/engine.mjs';
import {fresh,rez,rezBaseDeck,rezDeck,rezPacks,take,toPhase,REZ_BASE_IDS} from './helpers/rez-v2-match.mjs';

test('REZ-2-033 adds one green only while that character is ACTIVE on the energy line',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-033'].effectJa,/アクティブの場合、このキャラの発生エナジー/);
 assert.equal(rez.cards['REZ-2-033'].gen,1);
 assert.equal(rez.cards['REZ-2-033'].activeExtraEnergy,1);
 const s=fresh();
 const otto=take(s,0,'REZ-2-033');otto.ready=true;s.players[0].energy[0]=otto;
 assert.equal(universalCardEnergy(rezPacks,s,0,otto),2);
 otto.ready=false;
 assert.equal(universalCardEnergy(rezPacks,s,0,otto),1);
 s.players[0].energy[0]=null;s.players[0].front[0]=otto;otto.ready=true;
 assert.equal(universalCardEnergy(rezPacks,s,0,otto),0);
 const other=take(s,0,'REZ-2-055');other.ready=true;s.players[0].energy[1]=other;
 assert.equal(universalCardEnergy(rezPacks,s,0,other),1);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-035 and REZ-2-042 reduce hand energy by 2 only while own front and energy are empty',()=>{
 for(const id of ['REZ-2-035','REZ-2-042']){
  assert.match(REZERO_VOL2_BY_ID[id].effectJa,/自分の場にカードが1枚もない場合/);
  assert.equal(rez.cards[id].emptyOwnFieldHandEnergyDiscount,2);
  assert.equal(rez.cards[id].energy,2);
 }
 assert.equal(rez.cards['REZ-2-042'].impactNull,true);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-042'].effectJa,/インパクト無効/);
 let s=fresh(rezBaseDeck,1035);
 const garfiel=take(s,0,'REZ-2-035');
 s.players[0].hand.push(garfiel);
 s=toPhase(rezPacks,s,'main');
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-035']),0);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===garfiel.uid&&a.line==='front');
 assert.ok(play);
 let played=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(played.players[0].front[0].uid,garfiel.uid);
 const second=take(played,0,'REZ-2-035');
 played.players[0].hand.push(second);
 assert.equal(effectiveHandRequiredEnergy(rezPacks,played,0,rez.cards['REZ-2-035']),2);
 assert.equal(legalUniversalActions(rezPacks,played).some(a=>a.type==='play'&&a.uid===second.uid),false);
 let occupied=fresh(rezBaseDeck,1036);
 const blue=take(occupied,0,'REZ-2-014');blue.ready=true;occupied.players[0].energy[0]=blue;
 const beatrice=take(occupied,0,'REZ-2-042');occupied.players[0].hand.push(beatrice);
 occupied=toPhase(rezPacks,occupied,'main');
 assert.equal(effectiveHandRequiredEnergy(rezPacks,occupied,0,rez.cards['REZ-2-042']),2);
 assert.equal(legalUniversalActions(rezPacks,occupied).some(a=>a.uid===beatrice.uid&&a.type==='play'),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,occupied,{type:'play',uid:beatrice.uid,line:'front',slot:0},{actor:0}),
  /not currently legal/);
});

test('REZ-2-042 as a blocker removes the attacker IMPACT for that battle',()=>{
 const filler=id=>({id,name:id,color:'red',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 const impact=createUniversalPack({id:'rez-impact-fixture',cards:[
  {id:'HIT',name:'打撃',color:'red',type:'character',energy:0,ap:1,bp:3000,gen:1,
   trigger:null,implementation:'dsl',effects:{},printedImpact:1},
  ...Array.from({length:12},(_,i)=>filler('RED-'+i))
 ]});
 const redDeck=Object.fromEntries(['HIT',...Array.from({length:11},(_,i)=>'RED-'+i)].map(id=>[id,4]));
 redDeck['RED-11']=2;
 const decks=[redDeck,rezDeck(REZ_BASE_IDS,'REZ-2-055')];
 function scene(blockerId){
  let s=newUniversalMatch([impact,rez],{decks,seed:1042,first:0});
  let hit;
  for(const zone of ['hand','deck','life','outside']){
   const pile=s.players[0][zone],index=pile.findIndex(c=>c.cardId==='HIT');
   if(index>=0){hit=pile.splice(index,1)[0];break;}
  }
  hit.ready=true;s.players[0].front[0]=hit;
  const wall=take(s,1,blockerId);wall.ready=true;s.players[1].front[0]=wall;
  s=toPhase([impact,rez],s,'attack');
  const life=s.players[1].life.map(c=>c.uid);
  s=dispatchUniversalAction([impact,rez],s,{type:'attack',uid:hit.uid},{actor:0});
  s=dispatchUniversalAction([impact,rez],s,{type:'chooseBlock',uid:wall.uid},{actor:1});
  return {s,life,wall};
 }
 const nulled=scene('REZ-2-042');
 assert.deepEqual(nulled.s.players[1].life.map(c=>c.uid),nulled.life);
 assert.equal(nulled.s.pending,null);
 assert.ok(nulled.s.players[1].outside.some(c=>c.uid===nulled.wall.uid));
 assert.equal(assertUniversalMatch([impact,rez],nulled.s),true);
 const plain=scene('REZ-2-055');
 assert.notDeepEqual(plain.s.players[1].life.map(c=>c.uid),plain.life);
 assert.ok(plain.s.players[1].outside.some(c=>c.uid===plain.wall.uid));
 assert.equal(assertUniversalMatch([impact,rez],plain.s),true);
});
