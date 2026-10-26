import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {V2_TITLE_IDS} from '../dist/universal-v2/title-packs/contract.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalPublicView} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezBaseDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

test('batch 1 keeps Re:Zero outside the 700 census and pins vanilla plus draw-discard prints',()=>{
 assert.ok(!V2_TITLE_IDS.includes('rezero'));
 assert.equal(rez.cards['REZ-2-001'],undefined);
 assert.deepEqual(validateUniversalDeck(rez,rezBaseDeck),[]);
 const subaru=rez.cards['REZ-2-014'],priscilla=rez.cards['REZ-2-063'];
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-014'].effectJa,'-');
 assert.equal(subaru.name,'ナツキ・スバル');
 assert.equal(subaru.implementation,'vanilla');
 assert.deepEqual([subaru.color,subaru.energy,subaru.ap,subaru.bp,subaru.gen,subaru.trigger],
  ['blue',0,1,2000,1,'active']);
 assert.deepEqual(subaru.effects,{});
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-063'].effectJa,'-');
 assert.equal(priscilla.name,'プリシラ・バーリエル');
 assert.equal(priscilla.trigger,'get');
 assert.deepEqual(priscilla.traits,['王選候補者']);
 assert.equal(priscilla.implementation,'vanilla');
 for(const id of ['REZ-2-046','REZ-2-055','REZ-2-056']){
  assert.match(REZERO_VOL2_BY_ID[id].effectJa,/カードを1枚引き、自分の手札を1枚場外に置く/);
  assert.deepEqual(rez.cards[id].effects.onPlay,[{op:'drawDiscard',count:1}]);
 }
 assert.ok(REZ_BASE_IDS.includes('REZ-2-055'));
});

test('REZ-2-014 and REZ-2-063 enter with no effect, and 055 must discard after drawing',()=>{
 let s=fresh(rezBaseDeck,1014);
 const subaru=take(s,0,'REZ-2-014');
 s.players[0].hand.push(subaru);
 s=toPhase(rezPacks,s,'main');
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===subaru.uid&&a.line==='front');
 assert.ok(play,'energy 0 still pays 1 AP');
 const ap=s.players[0].apCards.filter(c=>c.inPlay&&c.ready).length;
 let next=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(next.pending,null);
 assert.equal(next.players[0].front[0].uid,subaru.uid);
 assert.equal(next.players[0].apCards.filter(c=>c.inPlay&&c.ready).length,ap-1);
 const deck=next.players[0].deck.map(c=>c.uid);
 const emilia=take(next,0,'REZ-2-055');
 next.players[0].hand.push(emilia);
 const before=next.players[0].hand.length;
 const again=legalUniversalActions(rezPacks,next).find(a=>a.type==='play'&&a.uid===emilia.uid);
 assert.equal(again,undefined,'the one starting AP was already spent');
 for(const card of next.players[0].apCards)if(card.inPlay)card.ready=true;
 const paid=legalUniversalActions(rezPacks,next).find(a=>a.type==='play'&&a.uid===emilia.uid&&a.line==='front');
 let drawn=dispatchUniversalAction(rezPacks,next,paid,{actor:0});
 assert.equal(drawn.pending?.kind,'effect-discard');
 assert.equal(drawn.players[0].hand.at(-1).uid,deck[0]);
 assert.equal(drawn.players[0].hand.length,before);
 assert.equal(universalPublicView(rezPacks,drawn,1).players[0].hand,null);
 assert.equal(universalPublicView(rezPacks,drawn,1).pending.uids,undefined);
 assert.throws(()=>dispatchUniversalAction(rezPacks,drawn,{type:'chooseDiscard',uid:null},{actor:0}),
  /not currently legal/);
 const junk=drawn.players[0].hand[0].uid;
 drawn=dispatchUniversalAction(rezPacks,drawn,{type:'chooseDiscard',uid:junk},{actor:0});
 assert.equal(drawn.pending,null);
 assert.ok(drawn.players[0].outside.some(c=>c.uid===junk));
 assert.equal(drawn.players[0].front.find(c=>c?.uid===emilia.uid)?.uid,emilia.uid);
 assert.equal(assertUniversalMatch(rezPacks,drawn),true);
});

test('REZ-2-046 pays four green energy, then the same mandatory discard',()=>{
 let s=fresh(rezBaseDeck,1046);
 for(const [slot,id] of ['REZ-2-055','REZ-2-056','REZ-2-041'].entries()){
  const gen=take(s,0,id);gen.ready=true;s.players[0].energy[slot]=gen;
 }
 const source=take(s,0,'REZ-2-046');
 s.players[0].hand.push(source);
 s=toPhase(rezPacks,s,'main');
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='play'&&a.uid===source.uid),false);
 const otto=take(s,0,'REZ-2-033');otto.ready=true;s.players[0].energy[3]=otto;
 const play=legalUniversalActions(rezPacks,s).find(a=>a.type==='play'&&a.uid===source.uid&&a.line==='front');
 assert.ok(play,'1+1+1+2 green pays energy 4');
 const top=s.players[0].deck[0].uid;
 let played=dispatchUniversalAction(rezPacks,s,play,{actor:0});
 assert.equal(played.pending?.kind,'effect-discard');
 assert.equal(played.players[0].hand.at(-1).uid,top);
 played=dispatchUniversalAction(rezPacks,played,{type:'chooseDiscard',uid:top},{actor:0});
 assert.equal(played.pending,null);
 assert.ok(played.players[0].outside.some(c=>c.uid===top));
 assert.equal(assertUniversalMatch(rezPacks,played),true);
});
