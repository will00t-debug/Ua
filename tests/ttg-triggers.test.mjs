import test from 'node:test';
import assert from 'node:assert/strict';
import {legalTtgEventTriggerChoices,resolveTtgEventLifeTrigger,TTG_IMPLEMENTED_EVENT_TRIGGERS} from '../dist/ttg-triggers.mjs';
const blank=()=>({front:Array(4).fill(null),energy:Array(4).fill(null),deck:[],hand:[],life:[],outside:[],apCards:[{uid:'ap0',ready:false},{uid:'ap1',ready:true}]});
const state=(cardId='TTG-1-081')=>({players:[blank(),blank()],phase:'attack',active:1,
 pendingTtgTrigger:{player:0,card:{uid:'trigger',cardId}},log:[]});
const char=(uid,bp=4000,extra={})=>({uid,cardId:'TTG-1-031',bp,...extra});
test('only five FINAL plus one SPECIAL event triggers are implemented in this resolver',()=>{
 assert.deepEqual([...TTG_IMPLEMENTED_EVENT_TRIGGERS].sort(),['TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-078','TTG-1-079','TTG-1-081']);
});
test('SPECIAL trigger ignores BP threshold, unlike TTG-1-081 normal event',()=>{
 const s=state();s.players[1].front[2]=char('huge',50000);s.players[1].front[1]=char('protected',1000,{cannotBeChosen:true});
 s.players[1].energy[0]=char('energy',1000);
 assert.deepEqual(legalTtgEventTriggerChoices(s),[{type:'resolveTtgTrigger',targetUid:'huge'}]);
 const before=JSON.stringify(s);
 const out=resolveTtgEventLifeTrigger(s,{player:0,targetUid:'huge'});
 assert.equal(JSON.stringify(s),before);
 assert.equal(out.players[1].front[2],null);
 assert.deepEqual(out.players[1].outside.map(c=>c.uid),['huge']);
 assert.equal(out.players[1].energy[0].uid,'energy');
 assert.deepEqual(out.players[0].outside.map(c=>c.uid),['trigger']);
 assert.equal(out.pendingTtgTrigger,null);
 assert.equal(out.players[0].apCards[0].ready,false,'life trigger costs no AP');
});
test('SPECIAL cannot target energy, own units or protected front cards, may decline',()=>{
 const s=state();s.players[1].front[0]=char('immune',1200,{protectedFromEffects:true});s.players[1].energy[0]=char('e',1500);
 assert.deepEqual(legalTtgEventTriggerChoices(s),[]);
 assert.throws(()=>resolveTtgEventLifeTrigger(s,{player:0,targetUid:'e'}));
 assert.throws(()=>resolveTtgEventLifeTrigger(s,{player:0,targetUid:'immune'}));
 const out=resolveTtgEventLifeTrigger(s,{player:0});
 assert.equal(out.players[1].front[0].uid,'immune');assert.equal(out.players[0].outside[0].uid,'trigger');
 const decline=resolveTtgEventLifeTrigger(s,{player:0,decline:true});
 assert.equal(decline.players[0].outside[0].uid,'trigger');
});
test('each printed FINAL trigger can restore exactly one life only if no life exists',()=>{
 for(const id of ['TTG-1-036','TTG-1-037','TTG-1-038','TTG-1-078','TTG-1-079']){
  const s=state(id);
  s.players[0].deck=[{uid:'first',cardId:'TTG-1-001'},{uid:'second',cardId:'TTG-1-002'}];
  const out=resolveTtgEventLifeTrigger(s,{player:0});
  assert.deepEqual(out.players[0].life.map(c=>c.uid),['first']);
  assert.deepEqual(out.players[0].deck.map(c=>c.uid),['second']);
  assert.deepEqual(out.players[0].outside.map(c=>c.uid),['trigger']);
  assert.equal(out.players[0].apCards[0].ready,false);
  s.players[0].life=[{uid:'existing',cardId:'TTG-1-001'}];
  const noGain=resolveTtgEventLifeTrigger(s,{player:0});
  assert.deepEqual(noGain.players[0].life.map(c=>c.uid),['existing']);
  assert.equal(noGain.players[0].deck.length,2);
 }
});
test('invalid player, wrong pending card and duplicate trigger UID cannot change state',()=>{
 const s=state('TTG-1-081');
 assert.throws(()=>resolveTtgEventLifeTrigger(s,{player:1}));
 assert.throws(()=>resolveTtgEventLifeTrigger(s,{player:0,targetUid:'fake'}));
 assert.throws(()=>resolveTtgEventLifeTrigger(s,{player:0,decline:true,targetUid:'fake'}));
 s.players[0].outside.push({uid:'trigger',cardId:'TTG-1-081'});
 assert.throws(()=>resolveTtgEventLifeTrigger(s,{player:0,decline:true}));
 assert.equal(s.pendingTtgTrigger.card.uid,'trigger');
 const unknown=state('TTG-1-080');
 assert.deepEqual(legalTtgEventTriggerChoices(unknown),[]);
 assert.throws(()=>resolveTtgEventLifeTrigger(unknown,{player:0}));
});
