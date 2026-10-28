import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedTtgRedPilotDeck,verifiedBleachPurplePilotDeck} from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 assertUniversalMatch,universalPublicView,universalActor} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
import {makeUniversalPreviewReplay,appendUniversalReplay,replayUniversalPreview}
 from '../dist/universal-v2/preview-replay.mjs';

const [p0,p1]=[verifiedTtgRedPilotDeck(),verifiedBleachPurplePilotDeck()];
const packs=[p0.pack,p1.pack],decks=[p0.counts,p1.counts];
const create=(seed=4477,first=0)=>newUniversalMatch(packs,{decks,seed,first,openingMulligan:true});
const options=s=>legalUniversalActions(packs,s);
const act=(s,mode,by=s.pending.player)=>dispatchUniversalAction(packs,s,
 {type:'openingMulligan',mode},{actor:by});
const ids=cards=>cards.map(c=>c.uid);

test('official mulligan: first player decides then second; LIFE only dealt afterward',()=>{
 let s=create(4477,1);
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.equal(s.turn,0);
 assert.equal(s.phase,'setup');
 assert.equal(s.pending.kind,'opening-mulligan');
 assert.equal(universalActor(s),1);
 assert.equal(s.players[0].life.length,0);
 assert.equal(s.players[1].life.length,0);
 assert.deepEqual(options(s),[{type:'openingMulligan',mode:'keep'},{type:'openingMulligan',mode:'redraw'}]);
 assert.throws(()=>act(s,'keep',0),/Wrong player turn/);
 s=act(s,'keep',1);
 assert.equal(s.pending.player,0);
 assert.equal(s.turn,0);
 assert.equal(s.players[1].life.length,0);
 s=act(s,'keep',0);
 assert.equal(s.pending,null);
 assert.equal(s.phase,'start');
 assert.equal(s.turn,1);
 assert.equal(s.active,1);
 for(const pl of s.players){
  assert.equal(pl.hand.length,7);
  assert.equal(pl.life.length,7);
  assert.equal(pl.deck.length,36);
 }
 assert.equal(assertUniversalMatch(packs,s),true);
 assert.deepEqual(options(s).filter(a=>a.type==='openingMulligan'),[]);
});

test('full re-draw sets original 7 aside, takes seven different cards, then shuffles old cards into deck',()=>{
 const original=create(123456,0);
 const oldHand=ids(original.players[0].hand);
 const nextSeven=ids(original.players[0].deck.slice(0,7));
 const s=act(original,'redraw');
 assert.deepEqual(ids(s.players[0].hand),nextSeven);
 assert.equal(oldHand.some(uid=>ids(s.players[0].hand).includes(uid)),false);
 assert.equal(s.players[0].hand.length,7);
 assert.equal(s.players[0].deck.length,43);
 assert.equal(s.players[0].deck.filter(c=>oldHand.includes(c.uid)).length,7);
 assert.deepEqual(ids(original.players[0].hand),oldHand,'source state remains immutable');
 assert.equal(s.pending.player,1);
 assert.equal(s.players[0].life.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
 const end=act(s,'redraw');
 assert.equal(end.phase,'start');
 assert.equal(end.players[0].life.length,7);
 assert.equal(end.players[1].life.length,7);
 assert.equal(end.players[0].deck.length,36);
 assert.equal(end.players[1].deck.length,36);
 assert.equal(assertUniversalMatch(packs,end),true);
});

test('you cannot take mulligan twice or choose a partial hand; normal legacy start remains compatible',()=>{
 let s=create(4141,0);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'openingMulligan',mode:'partial'},{actor:0}),
  /Action not currently legal/);
 s=act(s,'redraw',0);
 assert.equal(s.pending.player,1);
 assert.throws(()=>act(s,'redraw',0),/Wrong player turn/);
 s=act(s,'keep',1);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'openingMulligan',mode:'redraw'},{actor:0}),
  /Action not currently legal/);
 const legacy=newUniversalMatch(packs,{decks,seed:4141,first:0});
 assert.equal(legacy.phase,'start');
 assert.equal(legacy.turn,1);
 assert.equal(legacy.players[0].life.length,7);
});

test('AI opening choice is a genuine legal V2 action with no opponent hand leakage',()=>{
 const s=create(1010,1);
 const action=chooseUniversalAiAction(packs,s,{difficulty:'hard'});
 assert.ok(options(s).some(a=>JSON.stringify(a)===JSON.stringify(action)));
 const view=universalPublicView(packs,s,0);
 assert.equal(view.players[1].hand,null);
 assert.equal(view.players[0].hand.length,7);
 assert.equal(view.players[0].lifeCount,0);
 assert.equal(view.pending.kind,'opening-mulligan');
 assert.equal(view.pending.player,1);
 const next=dispatchUniversalAction(packs,s,action,{actor:1});
 assert.equal(next.pending.player,0);
});

test('debug replay preserves both private mulligan choices and old non-mulligan replays',()=>{
 let s=create(9915,0);
 let tape=makeUniversalPreviewReplay(packs,{decks,seed:9915,first:0,openingMulligan:true});
 for(const [mode,p] of [['redraw',0],['keep',1]]){
  const action={type:'openingMulligan',mode};
  s=dispatchUniversalAction(packs,s,action,{actor:p});
  tape=appendUniversalReplay(tape,action,p);
 }
 const replay=replayUniversalPreview(packs,tape);
 assert.deepEqual(replay,s);
 const old=makeUniversalPreviewReplay(packs,{decks,seed:9915,first:0});
 assert.equal(replayUniversalPreview(packs,old).phase,'start');
});
