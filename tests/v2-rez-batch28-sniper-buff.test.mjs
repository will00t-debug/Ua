import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>id!=='REZ-2-015'),'REZ-2-070'
],'REZ-2-049');

test('REZ-2-070 gives Garfiel 3000 BP and sniper for this turn',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-070'].effectJa,/ガーフィール・ティンゼル/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-070'].effectJa,/BP\+3000と\[狙い撃ち\]/);
 assert.deepEqual(rez.cards['REZ-2-070'].effects.onPlay,[
  {op:'grantNamedBuffSniper',name:'ガーフィール・ティンゼル',bp:3000}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,2070);
 for(let slot=0;slot<2;slot++){
  const gen=take(s,0,'REZ-2-049');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 s=toPhase(rezPacks,s,'main');
 const event=take(s,0,'REZ-2-070');s.players[0].hand.push(event);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='event'&&a.uid===event.uid),false);
 const garfiel=take(s,0,'REZ-2-035');s.players[0].hand.push(garfiel);
 s.players[0].apCards[0].inPlay=true;s.players[0].apCards[0].ready=true;
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='play'&&a.uid===garfiel.uid&&a.line==='front'),{actor:0});
 s.players[0].front.find(c=>c.uid===garfiel.uid).ready=true;
 s.players[0].apCards[1].inPlay=true;s.players[0].apCards[1].ready=true;
 const target=take(s,1,'REZ-2-014');target.ready=true;target.fieldEntryStamp=s.nextFieldEntryStamp++;
 s.players[1].front[0]=target;
 const life=[...s.players[1].life];
 s=dispatchUniversalAction(rezPacks,s,legalUniversalActions(rezPacks,s)
  .find(a=>a.type==='event'&&a.uid===event.uid),{actor:0});
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseGrantNamed',uid:garfiel.uid},{actor:0});
 const boosted=s.players[0].front.find(c=>c.uid===garfiel.uid);
 assert.equal(universalBp(rezPacks,s,boosted),5500);
 assert.equal(boosted.eventSniperGranted.bp,3000);
 s=toPhase(rezPacks,s,'attack');
 const aimed=legalUniversalActions(rezPacks,s).find(a=>a.type==='attack'&&a.uid===garfiel.uid&&a.targetUid===target.uid);
 assert.ok(aimed);
 s=dispatchUniversalAction(rezPacks,s,aimed,{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[1].outside.some(c=>c.uid===target.uid));
 assert.deepEqual(s.players[1].life.map(c=>c.uid),life.map(c=>c.uid));
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
