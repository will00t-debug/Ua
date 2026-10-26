import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {expandAbilityTemplates} from '../dist/universal-v2/ability-templates.mjs';
import {assertUniversalMatch,dispatchUniversalAction,newUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-045'],'REZ-2-045');

function battle(place){
 let s=fresh(deck,1045);
 const attacker=take(s,0,'REZ-2-046');attacker.ready=true;s.players[0].front[0]=attacker;
 const joshua=take(s,1,'REZ-2-045');joshua.ready=true;s.players[1].front[0]=joshua;
 place(s);
 s=toPhase(rezPacks,s,'attack');
 const hand=s.players[1].hand.length;
 const top=s.players[1].deck[0]?.uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:attacker.uid},{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:joshua.uid},{actor:1});
 return {s,joshua,hand,top};
}

test('REZ-2-045 draws on retire for Anastasia or four other green names',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-045'].effectJa,
  '[退場時]自分の場に〈アナスタシア・ホーシン〉か異なるカード名の他の緑のキャラが4種類以上ある場合、カードを1枚引く。');
 assert.deepEqual(rez.cards['REZ-2-045'].effects.onRetire,[{
  op:'drawIfNameOrDistinctColorNames',name:'アナスタシア・ホーシン',color:'green',min:4,count:1}]);
 assert.deepEqual(expandAbilityTemplates({onRetire:[{template:'drawIfNameOrDistinctColorNames',
  name:'アナスタシア・ホーシン',color:'green',min:4,count:1}]}).onRetire,
  rez.cards['REZ-2-045'].effects.onRetire);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'X',name:'ヨシュア・ユークリウス',color:'green',type:'character',energy:0,ap:1,bp:1500,gen:1,
  implementation:'dsl'};
 const job={op:'drawIfNameOrDistinctColorNames',name:'アナスタシア・ホーシン',color:'green',min:4,count:1};
 assert.throws(()=>createUniversalPack({id:'retire',cards:[{...body,effects:{onPlay:[job]}}]}),/onRetire/);
 assert.throws(()=>createUniversalPack({id:'retire',cards:[{...body,effects:{onRetire:[{...job,min:1}]}}]}),
  /name-or-kinds/);
});

test('three other green names do not draw, and Joshua leaving does not count himself',()=>{
 const {s,joshua,hand,top}=battle(state=>{
  for(const [slot,id] of [[0,'REZ-2-033'],[1,'REZ-2-035'],[2,'REZ-2-041']]){
   const card=take(state,1,id);card.ready=true;state.players[1].energy[slot]=card;
  }
 });
 assert.equal(s.active,0);
 assert.ok(s.players[1].outside.some(c=>c.uid===joshua.uid));
 assert.equal(s.pending,null);
 assert.equal(s.players[1].hand.length,hand);
 assert.equal(s.players[1].deck[0].uid,top);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('four distinct printed green names draw one after Joshua has left',()=>{
 const {s,hand,top}=battle(state=>{
  for(const [slot,id] of [[0,'REZ-2-033'],[1,'REZ-2-035'],[2,'REZ-2-041'],[3,'REZ-2-046']]){
   const card=take(state,1,id);card.ready=true;state.players[1].energy[slot]=card;
  }
 });
 assert.equal(s.players[1].hand.length,hand+1);
 assert.ok(s.players[1].hand.some(c=>c.uid===top));
 assert.equal(s.pending,null);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('a second 184番 and a blue character do not make a fourth green name',()=>{
 const twin=battle(state=>{
  for(const [slot,id] of [[0,'REZ-2-033'],[1,'REZ-2-035'],[2,'REZ-2-041']]){
   const card=take(state,1,id);card.ready=true;state.players[1].energy[slot]=card;
  }
  const extra=take(state,1,'REZ-2-041');extra.ready=true;state.players[1].front[1]=extra;
 });
 assert.equal(twin.s.players[1].hand.length,twin.hand);
 const blue=battle(state=>{
  for(const [slot,id] of [[0,'REZ-2-033'],[1,'REZ-2-035'],[2,'REZ-2-041']]){
   const card=take(state,1,id);card.ready=true;state.players[1].energy[slot]=card;
  }
  const off=take(state,1,'REZ-2-014');off.ready=true;state.players[1].front[1]=off;
 });
 assert.equal(blue.s.players[1].hand.length,blue.hand);
 assert.equal(assertUniversalMatch(rezPacks,twin.s),true);
 assert.equal(assertUniversalMatch(rezPacks,blue.s),true);
});

test('the opponent field does not satisfy the retire draw',()=>{
 const {s,hand}=battle(state=>{
  for(const [slot,id] of [[0,'REZ-2-033'],[1,'REZ-2-035'],[2,'REZ-2-043'],[3,'REZ-2-049']]){
   const card=take(state,0,id);card.ready=true;state.players[0].energy[slot]=card;
  }
 });
 assert.equal(s.players[1].hand.length,hand);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('Anastasia by printed name or alias draws even with fewer than four kinds',()=>{
 const src=rez.cards['REZ-2-045'];
 const joshua={id:src.id,name:src.name,color:src.color,type:src.type,energy:src.energy,ap:src.ap,
  bp:src.bp,gen:src.gen,trigger:src.trigger,implementation:'dsl',
  effects:{onRetire:[{op:'drawIfNameOrDistinctColorNames',name:'アナスタシア・ホーシン',color:'green',min:4,count:1}]}};
 const filler=id=>({id,name:'緑'+id,color:'green',type:'character',energy:0,ap:1,bp:1000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}});
 function packWith(extra){
  const cards=[joshua,extra,{...filler('G0'),bp:4000}];
  for(let i=1;i<=10;i++)cards.push(filler('G'+i));
  return createUniversalPack({id:'rez-045-fixture',cards});
 }
 function run(extra,extraId){
  const pack=packWith(extra);
  const ids=['REZ-2-045',extraId,...Array.from({length:11},(_,i)=>'G'+i)];
  const counts=Object.fromEntries(ids.map(id=>[id,4]));
  counts['G10']=2;
  const packs=[pack,pack];
  let s=newUniversalMatch(packs,{decks:[counts,counts],seed:1046,first:0});
  const attacker=take(s,0,'G0');attacker.ready=true;s.players[0].front[0]=attacker;
  const wall=take(s,1,'REZ-2-045');wall.ready=true;s.players[1].front[0]=wall;
  const named=take(s,1,extraId);named.ready=true;s.players[1].energy[0]=named;
  s=toPhase(packs,s,'attack');
  const hand=s.players[1].hand.length;
  const top=s.players[1].deck[0].uid;
  s=dispatchUniversalAction(packs,s,{type:'attack',uid:attacker.uid},{actor:0});
  s=dispatchUniversalAction(packs,s,{type:'chooseBlock',uid:wall.uid},{actor:1});
  assert.equal(s.players[1].hand.length,hand+1);
  assert.ok(s.players[1].hand.some(c=>c.uid===top));
  assert.equal(assertUniversalMatch(packs,s),true);
 }
 run({id:'ANA',name:'アナスタシア・ホーシン',color:'yellow',type:'character',energy:0,ap:1,bp:2000,gen:1,
  trigger:null,implementation:'vanilla',effects:{}},'ANA');
 run({id:'ALIAS',name:'別人',nameAliases:['アナスタシア・ホーシン'],color:'blue',type:'character',energy:0,ap:1,
  bp:1000,gen:1,trigger:null,implementation:'dsl',effects:{}},'ALIAS');
});
