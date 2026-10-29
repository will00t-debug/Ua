import test from 'node:test';
import assert from 'node:assert/strict';
import {STEINS_GATE_BY_ID} from '../dist/steins-gate-cards.mjs';
import {assertUniversalMatch,dispatchUniversalAction,legalUniversalActions,universalCardEnergy,
 universalEnergyByColor,universalPublicView} from '../dist/universal-v2/engine.mjs';
import {deckWith,fresh,put,stg,stgPacks,toPhase} from './helpers/stg-v2-match.mjs';

test('batch 7 pins active generation and the rest-then-retire mains',()=>{
 assert.equal(STEINS_GATE_BY_ID['STG-1-023'].effectJa,'このキャラがアクティブの場合、このキャラの発生エナジー+【青】。');
 assert.equal(STEINS_GATE_BY_ID['STG-1-052'].effectJa,'このキャラがアクティブの場合、このキャラの発生エナジー+【緑】。');
 assert.equal(stg.cards['STG-1-023'].gen,1);
 assert.equal(stg.cards['STG-1-023'].activeExtraEnergy,1);
 assert.equal(stg.cards['STG-1-052'].activeExtraEnergy,1);
 assert.equal(STEINS_GATE_BY_ID['STG-1-012'].genMark,'+');
 assert.equal(stg.cards['STG-1-012'].gen,1);
 for(const id of ['STG-1-012','STG-1-061']){
  assert.match(STEINS_GATE_BY_ID[id].effectJa,/メインフェイズ終了時、このキャラを退場させる/);
  assert.equal(stg.cards[id].mainAbility.op,'restSelfGainEnergyRetireEndMain');
  assert.equal(stg.cards[id].mainAbility.extraEnergy,1);
 }
});

test('active extra energy is 2 while ready and 1 while rested',()=>{
 let s=toPhase(stgPacks,fresh(deckWith(['STG-1-023','STG-1-052']),7023),'main');
 const blue=put(s,0,'STG-1-023','energy',0);
 const green=put(s,0,'STG-1-052','energy',1);
 assert.equal(universalCardEnergy(stg,s,0,blue),2);
 assert.equal(universalCardEnergy(stg,s,0,green),2);
 assert.equal(universalEnergyByColor(stg,s,0).blue,2);
 assert.equal(universalEnergyByColor(stg,s,0).green,2);
 assert.equal(universalPublicView(stgPacks,s,1).players[0].energy[0].produces,2);
 blue.ready=false;
 green.ready=false;
 assert.equal(universalCardEnergy(stg,s,0,blue),1);
 assert.equal(universalCardEnergy(stg,s,0,green),1);
 assert.equal(assertUniversalMatch(stgPacks,s),true);
});

test('resting the energy character adds one energy and retires when main ends',()=>{
 for(const [id,color,seed] of [['STG-1-012','blue',7012],['STG-1-061','green',7061]]){
  let s=toPhase(stgPacks,fresh(undefined,seed),'main');
  const source=put(s,0,id,'energy',0);
  const action={type:'activate',uid:source.uid,mode:'selfRestEnergyRetire'};
  assert.ok(legalUniversalActions(stgPacks,s).some(a=>a.type==='activate'&&a.uid===source.uid&&a.mode==='selfRestEnergyRetire'));
  s=dispatchUniversalAction(stgPacks,s,action,{actor:0});
  assert.equal(s.players[0].energy[0].ready,false);
  assert.equal(universalCardEnergy(stg,s,0,s.players[0].energy[0]),2);
  assert.equal(universalEnergyByColor(stg,s,0)[color],2);
  s=dispatchUniversalAction(stgPacks,s,{type:'next'});
  assert.equal(s.phase,'attack');
  assert.equal(s.players[0].energy[0],null);
  assert.ok(s.players[0].outside.some(c=>c.uid===source.uid));
  assert.equal(universalEnergyByColor(stg,s,0)[color]||0,0);
  assert.equal(assertUniversalMatch(stgPacks,s),true);
 }
});
