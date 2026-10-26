import test from 'node:test';
import assert from 'node:assert/strict';
import {REZERO_VOL2_BY_ID} from '../dist/rezero-vol2.mjs';
import {validateUniversalDeck} from '../dist/universal-v2/pack.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,
 universalCardEnergy,universalEnergyByColor} from '../dist/universal-v2/engine.mjs';
import {REZ_BASE_IDS,fresh,rez,rezDeck,rezPacks,take,toPhase} from './helpers/rez-v2-match.mjs';

const deck=rezDeck([...REZ_BASE_IDS.filter(id=>id!=='REZ-2-056'),'REZ-2-052'],'REZ-2-052');

test('REZ-2-052 rests for one green this turn and retires at the end of main',()=>{
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-052'].effectJa,
  '[起動メイン][レストにする] [ターン1]このキャラはこのターン中、発生エナジー+[緑]と「メインフェイズ終了時、このキャラを退場させる。」を得る。');
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-052'].gen,1);
 assert.equal(REZERO_VOL2_BY_ID['REZ-2-052'].genMark,'+');
 assert.deepEqual(rez.cards['REZ-2-052'].mainAbility,{
  op:'restSelfGainEnergyRetireEndMain',lines:'field',oncePerTurn:true,extraEnergy:1});
 assert.deepEqual(validateUniversalDeck(rez,deck),[]);
 let s=fresh(deck,1052);
 const card=take(s,0,'REZ-2-052');card.ready=true;s.players[0].energy[0]=card;
 s=toPhase(rezPacks,s,'main');
 assert.equal(universalEnergyByColor(rezPacks,s,0).green,1);
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===card.uid&&a.mode==='selfRestEnergyRetire');
 assert.ok(act);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.players[0].energy[0].ready,false);
 assert.equal(universalCardEnergy(rezPacks,s,0,s.players[0].energy[0]),2);
 s.players[0].energy[0].ready=true;
 assert.equal(legalUniversalActions(rezPacks,s).some(a=>a.type==='activate'&&a.uid===card.uid),false);
 s=dispatchUniversalAction(rezPacks,s,{type:'next'},{actor:0});
 assert.equal(s.phase,'attack');
 assert.equal(s.pending,null);
 assert.ok(s.players[0].outside.some(c=>c.uid===card.uid));
 assert.equal(s.players[0].energy[0],null);
 assert.equal(universalEnergyByColor(rezPacks,s,0).green||0,0);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});

test('REZ-2-052 on the front gains the bonus without generating, then retires',()=>{
 let s=fresh(deck,1053);
 const card=take(s,0,'REZ-2-052');card.ready=true;s.players[0].front[0]=card;
 s=toPhase(rezPacks,s,'main');
 const act=legalUniversalActions(rezPacks,s).find(a=>a.type==='activate'&&a.uid===card.uid);
 s=dispatchUniversalAction(rezPacks,s,act,{actor:0});
 assert.equal(s.players[0].front[0].ready,false);
 assert.equal(universalCardEnergy(rezPacks,s,0,s.players[0].front[0]),0);
 assert.equal(universalEnergyByColor(rezPacks,s,0).green||0,0);
 s=dispatchUniversalAction(rezPacks,s,{type:'next'},{actor:0});
 assert.ok(s.players[0].outside.some(c=>c.uid===card.uid));
 assert.equal(s.players[0].front[0],null);
 assert.equal(assertUniversalMatch(rezPacks,s),true);
});
