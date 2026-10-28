import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moveClickPlan} from '../dist/universal-v2/preview-actions.mjs';
import {verifiedBleachPurplePilotDeck,verifiedTtgRedPilotDeck}
 from '../dist/universal-v2/verified-real-decks.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,assertUniversalMatch}
 from '../dist/universal-v2/engine.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('two clicks select a legal moving character, then dispatch only the legal target action',()=>{
 const move={type:'move',uid:'source',slot:1};
 const replaced={type:'move',uid:'source',slot:2,replaceUid:'occupied'};
 const step={type:'step',uid:'front-source',slot:0};
 const legal=[{type:'next'},move,replaced,step];
 assert.deepEqual(moveClickPlan({selectedUid:null,slotUid:'source',line:'energy',slot:3,legal}),
  {type:'choose-mover',uid:'source'});
 assert.deepEqual(moveClickPlan({selectedUid:'source',slotUid:null,line:'front',slot:1,legal}),
  {type:'destination',actions:[move]});
 assert.deepEqual(moveClickPlan({selectedUid:'source',slotUid:'occupied',line:'front',slot:2,legal}),
  {type:'destination',actions:[replaced]});
 assert.deepEqual(moveClickPlan({selectedUid:null,slotUid:'front-source',line:'front',slot:2,legal}),
  {type:'choose-mover',uid:'front-source'});
 assert.deepEqual(moveClickPlan({selectedUid:'front-source',slotUid:null,line:'energy',slot:0,legal}),
  {type:'destination',actions:[step]});
 for(const args of [
  {selectedUid:null,slotUid:null,line:'front',slot:1},
  {selectedUid:'source',slotUid:null,line:'energy',slot:1},
  {selectedUid:'source',slotUid:'wrong',line:'front',slot:2},
  {selectedUid:'front-source',slotUid:null,line:'front',slot:0}
 ])assert.deepEqual(moveClickPlan({...args,legal}),{type:'select'});
 assert.deepEqual(moveClickPlan({selectedUid:'source',slotUid:null,line:'front',slot:1,legal:[]}),
  {type:'select'});
});

test('genuine V2 move action relocates an energy character to the chosen front slot',()=>{
 const mine=verifiedTtgRedPilotDeck(),foe=verifiedBleachPurplePilotDeck();
 const packs=[mine.pack,foe.pack];
 const s=newUniversalMatch(packs,{decks:[mine.counts,foe.counts],seed:2091,first:0});
 s.phase='move';
 const pl=s.players[0];
 const i=pl.deck.findIndex(x=>mine.pack.cards[x.cardId]?.type==='character'&&
  !mine.pack.cards[x.cardId]?.frontForbidden);
 assert.ok(i>=0,'test deck must provide a legal movable character');
 const [physical]=pl.deck.splice(i,1);
 pl.energy[0]=physical;
 assert.equal(assertUniversalMatch(packs,s),true);
 const legal=legalUniversalActions(packs,s);
 const action=legal.find(a=>a.type==='move'&&a.uid===physical.uid&&a.slot===0);
 assert.ok(action,'actual reducer must permit an energy→front move');
 assert.deepEqual(moveClickPlan({selectedUid:null,slotUid:physical.uid,line:'energy',slot:0,legal}),
  {type:'choose-mover',uid:physical.uid});
 assert.deepEqual(moveClickPlan({selectedUid:physical.uid,slotUid:null,line:'front',slot:0,legal}),
  {type:'destination',actions:[action]});
 const after=dispatchUniversalAction(packs,s,action,{actor:0});
 assert.equal(after.players[0].front[0].uid,physical.uid);
 assert.equal(after.players[0].energy[0],null);
 assert.equal(assertUniversalMatch(packs,after),true);
});

test('classic UI offers mover highlighting and never fabricates its own move',()=>{
 const script=read('dist/universal-v2-preview.mjs');
 const slot=script.split('function legacySlot(')[1]?.split('function legacyLine(')[0];
 assert.ok(slot);
 assert.match(slot,/moveClickPlan\(\{selectedUid:app\.selectedUid,slotUid:c\?\.uid\|\|null,line,slot:index,legal\}\)/);
 assert.match(slot,/const moveSource=plan\.type==='choose-mover'/);
 assert.match(slot,/const moveDest=plan\.type==='destination'/);
 assert.match(slot,/if\(plan\.type==='choose-mover'\)/);
 assert.match(slot,/app\.selectedUid=app\.selectedUid===plan\.uid\?null:plan\.uid/);
 assert.match(slot,/if\(plan\.type==='destination'\)/);
 assert.match(slot,/if\(moves\.length===1\)\{applyAction\(moves\[0\]\);return;\}/);
 assert.doesNotMatch(slot,/dispatchUniversalAction\(/);
 const css=read('dist/universal-v2-legacy.css');
 assert.match(css,/#match-view \.slot\.move-source\{/);
 assert.match(css,/#match-view \.slot\.destination/);
});
