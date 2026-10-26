import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>id!=='REZ-2-040'),
 'REZ-2-038'
],'REZ-2-055');

test('REZ-2-038 rests a fresh green name and refuses names already on the field',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-038'].effectJa,/自分の場にあるカード名を持つカードは登場させられない/);
 assert.deepEqual(rez.cards['REZ-2-038'].effects.onPlay,[
  {op:'deployOwnHandFreshName',type:'character',color:'green',energy:3,ap:1,max:1}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,2038);
 const ricard=take(s,0,'REZ-2-049');ricard.ready=true;s.players[0].energy[0]=ricard;
 const emilia=take(s,0,'REZ-2-055');emilia.ready=true;s.players[0].energy[1]=emilia;
 s=toPhase(rezPacks,s,'main');
 const subaru=take(s,0,'REZ-2-038'),copy=take(s,0,'REZ-2-038');
 const otherEmilia=take(s,0,'REZ-2-055'),mimi=take(s,0,'REZ-2-043'),felis=take(s,0,'REZ-2-015');
 s.players[0].outside.push(...s.players[0].hand);
 s.players[0].hand=[subaru,copy,otherEmilia,mimi,felis];
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===subaru.uid&&a.line==='front'),{actor:0});
 assert.equal(s.pending.kind,'effect-hand-fresh-name');
 assert.deepEqual(s.pending.choices,[mimi.uid]);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseHandFreshName',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.ok(skipped.players[0].hand.some(c=>c.uid===mimi.uid));
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,
  {type:'chooseHandFreshName',uid:copy.uid,line:'energy',slot:2},{actor:0}),/not currently legal/);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,
  {type:'chooseHandFreshName',uid:felis.uid,line:'energy',slot:2},{actor:0}),/not currently legal/);
 const entry=legalUniversalActions(rezPacks,s).find(a=>a.type==='chooseHandFreshName'&&a.uid===mimi.uid&&a.line==='energy');
 s=dispatchUniversalAction(rezPacks,s,entry,{actor:0});
 const entered=s.players[0].energy.find(c=>c?.uid===mimi.uid);
 assert.ok(entered);
 assert.equal(entered.ready,false);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===copy.uid));
 assert.ok(s.players[0].hand.some(c=>c.uid===otherEmilia.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,skipped),true);
});
