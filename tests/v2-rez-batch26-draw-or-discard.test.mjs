import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalBp} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([
 ...REZ_BASE_IDS.filter(id=>!['REZ-2-015','REZ-2-040'].includes(id)),
 'REZ-2-008','REZ-2-004'
],'REZ-2-004');

function board(seed){
 let s=fresh(deck,seed);
 for(let slot=0;slot<2;slot++){
  const gen=take(s,0,'REZ-2-004');gen.ready=true;s.players[0].energy[slot]=gen;
 }
 return toPhase(rezPacks,s,'main');
}

test('REZ-2-008 draws and discards unless an opponent front is below its printed BP',()=>{
 assert.match(REZERO_VOL2_BY_ID['REZ-2-008'].effectJa,/カードを1枚引き、自分の手札を1枚場外に置く/);
 assert.match(REZERO_VOL2_BY_ID['REZ-2-008'].effectJa,/元々のBPよりBPが低い/);
 assert.deepEqual(rez.cards['REZ-2-008'].effects.onPlay,[{op:'drawDiscardOrDrawIfBelowPrinted',count:1}]);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let plain=board(2008);
 const rem=take(plain,0,'REZ-2-008');plain.players[0].hand.push(rem);
 const foe=take(plain,1,'REZ-2-014');foe.ready=true;foe.fieldEntryStamp=plain.nextFieldEntryStamp++;
 plain.players[1].front[0]=foe;
 const top=plain.players[0].deck[0].uid;
 plain=dispatchUniversalAction(rezPacks,plain,legalUniversalActions(rezPacks,plain)
  .find(a=>a.type==='play'&&a.uid===rem.uid&&a.line==='front'),{actor:0});
 assert.equal(plain.pending.kind,'effect-discard');
 assert.ok(plain.players[0].hand.some(c=>c.uid===top));
 const discarded=plain.players[0].hand[0];
 plain=dispatchUniversalAction(rezPacks,plain,{type:'chooseDiscard',uid:discarded.uid},{actor:0});
 assert.equal(plain.pending,null);
 let replaced=board(2009);
 const other=take(replaced,0,'REZ-2-008');replaced.players[0].hand.push(other);
 const low=take(replaced,1,'REZ-2-014');low.ready=true;low.fieldEntryStamp=replaced.nextFieldEntryStamp++;
 low.buffs=[{bp:-1000,untilTurn:replaced.turn}];
 replaced.players[1].front[0]=low;
 assert.equal(universalBp(rezPacks,replaced,low),1000);
 const drawn=replaced.players[0].deck[0].uid;
 const before=replaced.players[0].hand.length;
 replaced=dispatchUniversalAction(rezPacks,replaced,legalUniversalActions(rezPacks,replaced)
  .find(a=>a.type==='play'&&a.uid===other.uid&&a.line==='front'),{actor:0});
 assert.equal(replaced.pending.kind,'effect-choice-mode');
 assert.deepEqual(replaced.pending.options.map(o=>o.id),['discard','draw']);
 replaced=dispatchUniversalAction(rezPacks,replaced,{type:'chooseEffectMode',mode:'draw'},{actor:0});
 assert.equal(replaced.pending,null);
 assert.ok(replaced.players[0].hand.some(c=>c.uid===drawn));
 assert.equal(replaced.players[0].hand.length,before);
 assert.equal(assertUniversalMatch(rezPacks,plain),true);
 assert.equal(assertUniversalMatch(rezPacks,replaced),true);
});
