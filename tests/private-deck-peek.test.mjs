import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame, dispatch, assertState} from '../dist/engine.mjs';
import {BY_ID} from '../dist/cards.mjs';

// Official EX15BT/BLC-4-048: look at top two PRIVATELY, optionally put up to
// one PURPLE Renji or Rukia into the public sideline, then reorder the rest.
// Source: https://www.unionarena-tcg.com/tc/cardlist/detail_iframe.php?card_no=EX15BT%2FBLC-4-048
function fixture(topIds){
 let s=newGame({seed:48048,mode:'hotseat'});
 s=dispatch(s,{type:'keep'});
 s=dispatch(s,{type:'keep'});
 s.phase='main';
 s.players[0].ap=3;
 s.players[0].maxAp=3;
 assert.ok(BY_ID['BLC-4-048']);
 s.players[0].hand[0].cardId='BLC-4-048';
 for(let i=0;i<topIds.length;i++){
  assert.ok(BY_ID[topIds[i]],'test fixture missing '+topIds[i]);
  s.players[0].deck[i].cardId=topIds[i];
 }
 return s;
}
function playRenji(s){
 const renji=s.players[0].hand[0];
 return dispatch(s,{type:'play',uid:renji.uid,line:'front',slot:0});
}

test('BLC-4-048 only permits eligible purple Renji/Rukia and reveals the selected public card',()=>{
 let s=fixture(['BLC-4-054','BLC-1-002']); // purple Rukia and nonmatching card
 const privateUid=s.players[0].deck[1].uid;
 s=playRenji(s);
 assert.equal(s.pending?.effect.kind,'peekMill');
 assert.equal(s.pending.choices.length,1);
 assert.equal(s.pending.choices[0].cardId,'BLC-4-054');
 assert.equal(s.players[0].outside.length,0,'private look does not move/reveal either card');
 const beforeLog=s.log.length;
 s=dispatch(s,{type:'choose',ids:[s.pending.choices[0].id]});
 assert.equal(s.players[0].outside.at(-1).cardId,'BLC-4-054');
 assert.equal(s.players[0].deck[0].uid,privateUid);
 assert.ok(s.log.slice(beforeLog).some(x=>x.message.includes('朽木露琪亞')&&x.message.includes('場外')));
 assert.ok(!s.log.slice(beforeLog).some(x=>x.message.includes(BY_ID['BLC-1-002'].name)),'unselected top deck card stays secret');
 assertState(s);
});

test('BLC-4-048 can decline to mill and privately reorder both inspected cards',()=>{
 let s=fixture(['BLC-4-054','BLC-1-002']);
 const [first,second]=s.players[0].deck;
 const outsideBefore=s.players[0].outside.length;
 s=playRenji(s);
 s=dispatch(s,{type:'choose',ids:[]});
 assert.equal(s.pending?.effect.kind,'peekOrder');
 assert.deepEqual(new Set(s.pending.choices.map(c=>c.id)),new Set([first.uid,second.uid]));
 s=dispatch(s,{type:'choose',ids:[second.uid]});
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[second.uid,first.uid]);
 assert.equal(s.players[0].outside.length,outsideBefore);
 assert.ok(!s.log.some(x=>x.message.includes('朽木露琪亞')&&x.message.includes('場外')));
 assertState(s);
});

test('BLC-4-048 still privately inspects and reorders if no cards qualify',()=>{
 let s=fixture(['BLC-1-002','BLC-1-003']);
 const [first,second]=s.players[0].deck;
 s=playRenji(s);
 assert.equal(s.pending?.effect.kind,'peekOrder','no eligible cards must not silently skip inspection');
 assert.deepEqual(new Set(s.pending.choices.map(c=>c.id)),new Set([first.uid,second.uid]));
 s=dispatch(s,{type:'choose',ids:[second.uid]});
 assert.deepEqual(s.players[0].deck.slice(0,2).map(c=>c.uid),[second.uid,first.uid]);
 assertState(s);
});

test('private inspection is curtained for hotseat opponents and AI choices never show to humans',()=>{
 const ui=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8');
 assert.match(ui,/function privatePeekCurtain\(/);
 assert.match(ui,/showPrivatePeek/);
 assert.match(ui,/if\(botTurn\(\)\)return '';/);
 assert.match(ui,/\['peekMill','peekOrder','peekNoMill'\]/);
 assert.match(ui,/const lookedAt=peekIds\.map\(/);
 assert.match(ui,/只有實際送到場外的卡片才會成為公開資訊/);
});
