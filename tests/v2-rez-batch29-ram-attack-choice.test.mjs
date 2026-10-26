import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-006','REZ-2-004'
],'REZ-2-055');

function board(seed){
 let s=fresh(deck,seed);
 for(let slot=0;slot<2;slot++){
  const gen=take(s,0,'REZ-2-004');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 const foe=take(s,1,'REZ-2-014');foe.ready=true;foe.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=foe;
 s=toPhase(rezPacks,s,'main');
 const ram=take(s,0,'REZ-2-006');s.players[0].hand.push(ram);
 return {s,ram,foe};
}

test('REZ-2-006 lowers a front character, then chooses draw or BP on attack',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-006'].effectJa,/BP1500以上の相手のフロントL/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-006'].effectJa,/元々のBPよりBPが低い/);
 assert.equal(rez.cards['REZ-2-006'].effects.onAttack[0].op,'chooseOneIfBelowPrinted');
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let {s,ram,foe}=board(2006);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===ram.uid&&a.line==='front'),{actor:0});
 assert.equal(s.pending.kind,'effect-target');
 assert.ok(s.pending.choices.includes(foe.uid));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTarget',uid:foe.uid},{actor:0});
 assert.equal(universalBp(rezPacks,s,s.players[1].front[0]),1000);
 const played=s.players[0].front.find(c=>c.uid===ram.uid);
 played.ready=true;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:ram.uid},{actor:0});
 assert.equal(s.pending.kind,'effect-choice-mode');
 assert.deepEqual(s.pending.options.map(o=>o.id),['draw','buff']);
 const top=s.players[0].deck[0].uid;
 const drawn=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseEffectMode',mode:'draw'},{actor:0});
 assert.equal(drawn.pending.kind,'block');
 assert.ok(drawn.players[0].hand.some(c=>c.uid===top));
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseEffectMode',mode:'buff'},{actor:0});
 assert.equal(s.pending.kind,'block');
 assert.equal(universalBp(rezPacks,s,s.players[0].front.find(c=>c.uid===ram.uid)),4000);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,drawn),true);
});

test('REZ-2-006 can skip the debuff, and a full-BP front skips the attack choice',()=>{
 let {s,ram,foe}=board(2007);
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===ram.uid&&a.line==='front'),{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTarget',uid:null},{actor:0});
 assert.equal(s.pending,null);
 assert.equal(universalBp(rezPacks,s,s.players[1].front.find(c=>c.uid===foe.uid)),2000);
 s.players[0].front.find(c=>c.uid===ram.uid).ready=true;
 s=toPhase(rezPacks,s,'attack');
 s=dispatchUniversalAction(rezPacks,s,{type:'attack',uid:ram.uid},{actor:0});
 assert.equal(s.pending.kind,'block');
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
