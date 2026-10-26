import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-059'],'REZ-2-059');

test('REZ-2-059 looks at the top two, sends up to one outside, and orders the rest on top',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-059'].effectJa,
  '[登場時]自分の山札の上から2枚見て、1枚まで場外に置く。残りを望む順で山札の上に置く。');
 assert.deepEqual(rez.cards['REZ-2-059'].effects.onPlay,
  [{op:'inspectTopArrange',count:2,toOutside:true,rest:'top'}]);
 assert.equal(rez.cards['REZ-2-059'].energy,0);
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,1059);
 const crusch=take(s,0,'REZ-2-059');s.players[0].hand.push(crusch);
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===crusch.uid&&a.line==='front');
 const [first,second,third]=s.players[0].deck.map(c=>c.uid);
 let seen=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(seen.pending?.kind,'effect-top-inspect');
 assert.deepEqual(seen.pending.uids,[first,second]);
 assert.equal(universalPublicView(rezPacks,seen,1).pending.uids,undefined);
 assert.equal(universalPublicView(rezPacks,seen,1).players[0].hand,null);
 assert.throws(()=>dispatchUniversalAction(rezPacks,seen,{type:'chooseInspectedOutside',uid:third},{actor:0}),
  /not currently legal|Cannot send uninspected/);
 let ordered=dispatchUniversalAction(rezPacks,structuredClone(seen),{type:'chooseInspectedOutside',uid:null},{actor:0});
 assert.equal(ordered.pending?.kind,'effect-top-order');
 ordered=dispatchUniversalAction(rezPacks,ordered,{type:'chooseTopOrder',uid:second},{actor:0});
 ordered=dispatchUniversalAction(rezPacks,ordered,{type:'chooseTopOrder',uid:first},{actor:0});
 assert.equal(ordered.pending,null);
 assert.deepEqual(ordered.players[0].deck.slice(0,2).map(c=>c.uid),[second,first]);
 seen=dispatchUniversalAction(rezPacks,seen,{type:'chooseInspectedOutside',uid:first},{actor:0});
 assert.equal(seen.pending?.kind,'effect-top-order');
 assert.deepEqual(seen.pending.uids,[second]);
 seen=dispatchUniversalAction(rezPacks,seen,{type:'chooseTopOrder',uid:second},{actor:0});
 assert.equal(seen.pending,null);
 assert.equal(seen.players[0].deck[0].uid,second);
 assert.ok(seen.players[0].outside.some(c=>c.uid===first));
 assert.equal(seen.players[0].deck.some(c=>c.uid===first),false);
 assert.equal(seen.players[0].front[0].uid,crusch.uid);
 assert.equal(assertUniversalMatch(rezPacks,seen),true);
 assert.equal(assertUniversalMatch(rezPacks,ordered),true);
});
