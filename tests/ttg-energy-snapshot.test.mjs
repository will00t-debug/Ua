import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateTtgEnergyByColor,withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,resolveTtgMainPhaseEnd} from '../dist/ttg-rule-adapter.mjs';

const blank=()=>({front:Array(4).fill(null),energy:Array(4).fill(null),hand:[],outside:[],life:[],deck:[],apCards:[{uid:'AP1',ready:true},{uid:'AP2',ready:false}],energyProduced:{red:999,green:999}});
const game=(phase='main')=>({energyMode:'derive',active:0,phase,turn:5,players:[blank(),blank()],log:[]});
const card=(uid,cardId,gen=1,other={})=>({uid,cardId,gen,ready:true,bp:1500,...other});
test('printed active-only Yoko and Ark-Gurren generators lose bonus when REST',()=>{
 const s=game();
 s.players[0].energy[0]=card('greenYoko','TTG-1-019');
 s.players[0].energy[1]=card('redYoko','TTG-1-066');
 s.players[0].energy[2]=card('field','TTG-1-033');
 assert.deepEqual(calculateTtgEnergyByColor(s,0),{red:2,green:4});
 s.players[0].energy[1].ready=false;s.players[0].energy[2].ready=false;
 assert.deepEqual(calculateTtgEnergyByColor(s,0),{red:1,green:3});
 assert.deepEqual(s.players[0].energyProduced,{red:999,green:999},'pure helper never changes source');
});
test('front generation is restricted to flagged cards and doubling is multiplicative',()=>{
 const s=game();
 s.players[0].front[0]=card('a','TTG-1-010',1,{frontGenerates:true});
 s.players[0].front[1]=card('b','TTG-1-019',1);
 s.players[0].energy[0]=card('c','TTG-1-033',1,{ready:false});
 assert.deepEqual(calculateTtgEnergyByColor(s,0),{red:0,green:2});
 s.players[0].frontGeneratesAll=true;
 s.players[0].energyDoublings=2;
 assert.deepEqual(calculateTtgEnergyByColor(s,0),{red:0,green:16});
});
test('derived mode forbids spending stale cached red energy on Giga Drill',()=>{
 const s=game();s.players[0].hand.push(card('event','TTG-1-081',0));
 s.players[0].energy[0]=card('field','TTG-1-077',2);
 s.players[0].energy[1]=card('yoko','TTG-1-066',1);
 s.players[1].front[0]=card('target','TTG-1-042',1,{bp:2000});
 assert.equal(calculateTtgEnergyByColor(s,0).red,4);
 assert.equal(legalTtgRuleActions(s,0).filter(x=>x.type==='playTtgEvent').length,1);
 s.players[0].energy[1].ready=false;
 assert.equal(calculateTtgEnergyByColor(s,0).red,3);
 assert.deepEqual(legalTtgRuleActions(s,0),[],'999 cached red energy never overrides derived amount');
 const corrected=withTtgDerivedEnergy(s,0);
 assert.equal(corrected.players[0].energyProduced.red,3);
 assert.equal(s.players[0].energyProduced.red,999);
});
test('Buta temporary energy immediately unlocks a legal red event then vanishes at main end',()=>{
 const s=game();
 s.players[0].energy[0]=card('field','TTG-1-077',2);
 s.players[0].energy[1]=card('buta','TTG-1-063',1,{color:'red'});
 s.players[0].hand.push(card('event','TTG-1-081',0));
 s.players[1].front[0]=card('target','TTG-1-042',1,{bp:2000});
 assert.equal(calculateTtgEnergyByColor(s,0).red,3);
 assert.deepEqual(legalTtgRuleActions(s,0).map(x=>x.type),['activateButa063']);
 const next=dispatchTtgRuleAction(s,{type:'activateButa063',player:0,uid:'buta'});
 assert.equal(next.players[0].energyProduced.red,4);
 assert.equal(next.players[0].energy[1].ready,false);
 assert.equal(legalTtgRuleActions(next,0)[0].type,'playTtgEvent');
 const spent=dispatchTtgRuleAction(next,{type:'playTtgEvent',player:0,handUid:'event',payApUids:['AP1'],targetUid:'target'});
 assert.equal(spent.players[1].front[0],null);
 assert.equal(spent.players[0].energyProduced.red,4);
 const ended=resolveTtgMainPhaseEnd(spent);
 assert.equal(ended.players[0].energyProduced.red,2);
 assert.equal(ended.players[0].energy[1],null);
 assert.deepEqual(ended.players[0].outside.map(x=>x.uid),['event','buta']);
});
test('STEP to energy line increases live production but never wakes a rested Yoko',()=>{
 const s=game('move');s.players[0].front[0]=card('yoko','TTG-1-065',1,{ready:false,color:'red'});
 assert.equal(calculateTtgEnergyByColor(s,0).red,0);
 const moved=dispatchTtgRuleAction(s,{type:'stepYoko065',player:0,uid:'yoko',toSlot:1});
 assert.equal(moved.players[0].energy[1].ready,false);
 assert.equal(moved.players[0].energyProduced.red,1);
 assert.equal(s.players[0].front[0].uid,'yoko');
});
test('unknown card metadata fails closed rather than assuming an energy producer',()=>{
 const s=game();
 s.players[0].energy[0]=card('missing','TTG-1-999',undefined,{gen:undefined});
 assert.throws(()=>calculateTtgEnergyByColor(s,0),/Unknown TTG energy color/);
 s.players[0].energy[0].color='green';
 assert.throws(()=>calculateTtgEnergyByColor(s,0),/Unverified energy generator/);
 const external={...s,energyMode:'external'};
 assert.equal(withTtgDerivedEnergy(external,0),external,'external calculator keeps the original state unchanged');
});
