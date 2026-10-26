import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {createUniversalPack,validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-034'],'REZ-2-034');
const KINDS={kind:'ownDistinctPrintedColorNames',turn:'any',zone:'field',color:'green',min:4};

function strike(place){
 let s=fresh(deck,1034);
 const garfiel=take(s,0,'REZ-2-034');garfiel.ready=true;
 garfiel.fieldEntryStamp=s.nextFieldEntryStamp++;s.players[0].front[0]=garfiel;
 place(s);
 s=toPhase(rezPacks,s,'attack');
 const hand=s.players[0].hand.length,top=s.players[0].deck[0]?.uid;
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:garfiel.uid},{actor:0});
 return {s,garfiel,hand,top};
}
function greens(s,ids){
 for(const [slot,id] of ids.entries()){
  const card=take(s,0,id);card.ready=true;s.players[0].energy[slot]=card;
 }
}
function blocker(s,id,bp){
 const card=take(s,1,id);card.ready=true;if(bp)card.buffs=[{bp,untilTurn:s.turn}];
 s.players[1].front[0]=card;
 return card;
}

test('REZ-2-034 draws after winning a battle with four printed green names',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-034'].effectJa,
  'このキャラがアタックしてバトルに勝利した時、自分の場に異なるカード名の緑のキャラが4種類以上ある場合、カードを1枚引く。');
 assert.deepEqual(REZERO_VOL2_BY_ID['REZ-2-034'].faq,['Q2413']);
 assert.deepEqual(rez.cards['REZ-2-034'].attackWinDraw,{count:1,condition:KINDS});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const body={id:'X',name:'ガーフィール・ティンゼル',color:'green',type:'character',energy:0,ap:1,bp:4000,gen:1,
  implementation:'dsl',effects:{}};
 assert.throws(()=>createUniversalPack({id:'win',cards:[{...body,attackWinDraw:{count:1,condition:{...KINDS,min:1}}}]}),
  /invalid or cyclic|attacking-victory/);
 assert.throws(()=>createUniversalPack({id:'win',cards:[{...body,type:'event',bp:0,attackWinDraw:{count:1,condition:KINDS}}]}),
  /attacking-victory/);
 const {s,hand,top}=strike(state=>{
  greens(state,['REZ-2-033','REZ-2-043','REZ-2-041']);
  blocker(state,'REZ-2-014');
 });
 const foe=s.players[1].front[0].uid;
 const won=dispatchUniversalAction(rezPacks,s,{type:'chooseBlock',uid:foe},{actor:1});
 assert.equal(won.pending,null);
 assert.equal(won.players[0].hand.length,hand+1);
 assert.ok(won.players[0].hand.some(c=>c.uid===top));
 assert.equal(assertUniversalMatch(rezPacks,won),true);
});

test('three green names, an alias, a missed block, and a lost battle do not draw',()=>{
 const short=strike(state=>{
  greens(state,['REZ-2-033','REZ-2-041']);
  const twin=take(state,0,'REZ-2-041');twin.ready=true;state.players[0].energy[3]=twin;
  const blue=take(state,0,'REZ-2-014');blue.ready=true;state.players[0].front[1]=blue;
  blocker(state,'REZ-2-014');
 });
 const missed=dispatchUniversalAction(rezPacks,short.s,{type:'chooseBlock',uid:short.s.players[1].front[0].uid},{actor:1});
 assert.equal(missed.players[0].hand.length,short.hand);
 const open=strike(state=>greens(state,['REZ-2-033','REZ-2-043','REZ-2-046']));
 const declined=dispatchUniversalAction(rezPacks,open.s,{type:'chooseBlock',uid:null},{actor:1});
 assert.equal(declined.players[0].hand.length,open.hand);
 const lost=strike(state=>{
  greens(state,['REZ-2-033','REZ-2-043','REZ-2-046']);
  blocker(state,'REZ-2-014',3000);
 });
 const beat=dispatchUniversalAction(rezPacks,lost.s,{type:'chooseBlock',uid:lost.s.players[1].front[0].uid},{actor:1});
 assert.ok(beat.players[0].outside.some(c=>c.uid===lost.garfiel.uid));
 assert.equal(beat.players[0].hand.length,lost.hand);
 assert.equal(assertUniversalMatch(rezPacks,missed),true);
 assert.equal(assertUniversalMatch(rezPacks,declined),true);
 assert.equal(assertUniversalMatch(rezPacks,beat),true);
});
