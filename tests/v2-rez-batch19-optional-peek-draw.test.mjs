import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-029'],'REZ-2-029');

function play(){
 let s=fresh(deck,1029);
 const card=take(s,0,'REZ-2-029');s.players[0].hand.push(card);
 s=toPhase(rezPacks,s,'main');
 const action=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===card.uid&&a.line==='energy');
 return {s,card,action};
}

test('REZ-2-029 may discard, then place the top card and draw',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-029'].effectJa,
  '[登場時]自分の手札を1枚場外に置いてもよい。そうした場合、自分の山札の上から1枚見て、山札の上か下に置き、カードを1枚引く。');
 assert.deepEqual(rez.cards['REZ-2-029'].effects.onPlay,[{
  op:'discardGate',optional:true,then:[{op:'peekTopOrBottom'},{op:'draw',count:1}]}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 const opened=play();
 let s=dispatchUniversalAction(rezPacks,opened.s,opened.action,{actor:0});
 assert.equal(s.pending.kind,'effect-discard-gate');
 assert.equal(s.pending.optional,true);
 const hand=s.players[0].hand.map(c=>c.uid);
 const [top,second]=s.players[0].deck.map(c=>c.uid);
 const skipped=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseDiscardGate',uid:null},{actor:0});
 assert.equal(skipped.pending,null);
 assert.equal(skipped.players[0].deck[0].uid,top);
 assert.equal(skipped.players[0].hand.some(c=>c.uid===top),false);
 const payment=hand[0];
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseDiscardGate',uid:payment},{actor:0});
 assert.equal(s.pending.kind,'private-top-place');
 assert.equal(universalPublicView(rezPacks,s,1).players[0].hand,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===payment));
 let bottom=dispatchUniversalAction(rezPacks,structuredClone(s),{type:'chooseTopCard',mode:'bottom'},{actor:0});
 assert.equal(bottom.pending,null);
 assert.equal(bottom.players[0].hand.at(-1).uid,second);
 assert.equal(bottom.players[0].deck.at(-1).uid,top);
 s=dispatchUniversalAction(rezPacks,s,{type:'chooseTopCard',mode:'top'},{actor:0});
 assert.equal(s.players[0].hand.at(-1).uid,top);
 assert.equal(s.players[0].deck[0].uid,second);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
 assert.equal(assertUniversalMatch(rezPacks,bottom),true);
});

test('REZ-2-029 with an empty hand does not peek or draw',()=>{
 const opened=play();
 const kept=opened.card;
 opened.s.players[0].outside.push(...opened.s.players[0].hand.filter(c=>c.uid!==kept.uid));
 opened.s.players[0].hand=[kept];
 let s=dispatchUniversalAction(rezPacks,opened.s,opened.action,{actor:0});
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,0);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
