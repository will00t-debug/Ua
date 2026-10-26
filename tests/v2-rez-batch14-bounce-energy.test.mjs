import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-048'],'REZ-2-048');

function play(){
 let s=fresh(deck,1048);
 s=toPhase(rezPacks,s,'main');
 const lyra=take(s,0,'REZ-2-048');s.players[0].hand.push(lyra);
 return {s,lyra};
}

test('REZ-2-048 returns another character of energy 1 or less, otherwise itself',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-048'].effectJa,
  '[登場時]必要エナジーが1以下の自分の場の他のキャラを1枚手札に戻す。戻せない場合、このキャラを手札に戻す。');
 assert.deepEqual(rez.cards['REZ-2-048'].effects.onPlay,[{op:'bounceOwnOtherUnderEnergy',energy:1}]);
 assert.equal(rez.cards['REZ-2-048'].energy,1);
 assert.equal(rez.cards['REZ-2-048'].gen,2);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
});

test('a legal low-energy character must be bounced, and a higher one cannot',()=>{
 let {s,lyra}=play();
 const payer=take(s,0,'REZ-2-049');payer.ready=true;s.players[0].energy[0]=payer;
 const small=take(s,0,'REZ-2-055');small.ready=true;s.players[0].energy[1]=small;
 const one=take(s,0,'REZ-2-041');one.ready=true;s.players[0].front[0]=one;
 const action=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===lyra.uid&&a.line==='energy');
 assert.ok(action);
 s=dispatchUniversalAction(rezPacks,s,action,{actor:0});
 assert.equal(s.pending?.kind,'effect-bounce-own');
 const choices=legalUniversalActions(rezPacks,s).filter(a=>a.type==='chooseOwnBounce').map(a=>a.uid);
 assert.deepEqual(choices.sort(),[small.uid,one.uid].sort());
 assert.equal(choices.includes(lyra.uid),false);
 assert.equal(choices.includes(payer.uid),false);
 assert.equal(choices.includes(null),false);
 assert.throws(()=>dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBounce',uid:payer.uid},{actor:0}),
  /not currently legal|Invalid own bounce/);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseOwnBounce',uid:small.uid},{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===small.uid));
 assert.ok(s.players[0].energy.some(c=>c?.uid===lyra.uid));
 assert.equal(s.players[0].front.find(c=>c?.uid===one.uid).uid,one.uid);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-048 returns itself when no other character has energy 1 or less',()=>{
 let {s,lyra}=play();
 const otto=take(s,0,'REZ-2-033');otto.ready=true;s.players[0].energy[0]=otto;
 const ricardo=take(s,0,'REZ-2-049');ricardo.ready=true;s.players[0].energy[1]=ricardo;
 const action=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===lyra.uid&&a.line==='front');
 s=dispatchUniversalAction(rezPacks,s,action,{actor:0});
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(c=>c.uid===lyra.uid));
 assert.equal(s.players[0].front.some(c=>c?.uid===lyra.uid),false);
 assert.equal(s.players[0].energy[0].uid,otto.uid);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
