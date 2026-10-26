import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,effectiveHandRequiredEnergy,
 legalUniversalActions,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-009'],'REZ-2-009');

test('REZ-2-009 discounts an empty field by 2 and peeks the top card',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-009'].effectJa,/必要エナジーを\[黄×2\]減らす/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-009'].effectJa,/山札の上から1枚見て、山札の上か場外に置く/);
 const card=rez.cards['REZ-2-009'];
 assert.equal(card.name,'レム');
 assert.equal(card.emptyOwnFieldHandEnergyDiscount,2);
 assert.deepEqual(card.effects.onPlay,[{op:'peekTopOne'}]);
 assert.equal(card.energy,2);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
});

test('an empty board plays REZ-2-009 for zero energy, then the top card stays or leaves',()=>{
 let s=fresh(deck,1009);
 const rem=take(s,0,'REZ-2-009');s.players[0].hand.push(rem);
 s=toPhase(rezPacks,s,'main');
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-009']),0);
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===rem.uid&&a.line==='front');
 assert.ok(play);
 const top=s.players[0].deck[0].uid;
 let seen=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(seen.pending?.kind,'private-top-choice');
 assert.equal(universalPublicView(rezPacks,seen,1).pending.uids,undefined);
 assert.equal(universalPublicView(rezPacks,seen,1).players[0].hand,null);
 const kept=dispatchUniversalAction(rezPacks,structuredClone(seen),{type:'chooseTopCard',mode:'top'},{actor:0});
 assert.equal(kept.pending,null);
 assert.equal(kept.players[0].deck[0].uid,top);
 assert.equal(kept.players[0].front[0].uid,rem.uid);
 const sent=dispatchUniversalAction(rezPacks,seen,{type:'chooseTopCard',mode:'outside'},{actor:0});
 assert.equal(sent.pending,null);
 assert.equal(sent.players[0].deck[0]?.uid===top,false);
 assert.ok(sent.players[0].outside.some(c=>c.uid===top));
 assert.equal(assertUniversalMatch(rezPacks,kept),true);
 assert.equal(assertUniversalMatch(rezPacks,sent),true);
});

test('REZ-2-009 costs 2 while any own field card remains',()=>{
 let s=fresh(deck,1010);
 const blue=take(s,0,'REZ-2-014');blue.ready=true;s.players[0].energy[0]=blue;
 const rem=take(s,0,'REZ-2-009');s.players[0].hand.push(rem);
 s=toPhase(rezPacks,s,'main');
 assert.equal(effectiveHandRequiredEnergy(rezPacks,s,0,rez.cards['REZ-2-009']),2);
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='play'&&a.uid===rem.uid),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'play',uid:rem.uid,line:'front',slot:0},{actor:0}),
  /not currently legal/);
});
