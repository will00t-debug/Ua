import test from 'node:test';
import assert from 'node:assert/strict';
import {legalGreen025Actions,resolveGreen025,resolveGreen025TurnEnd} from '../dist/ttg-green-025.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction,chooseTtgRuleAiAction,resolveTtgTurnEnd} from '../dist/ttg-rule-adapter.mjs';
import {calculateTtgEnergyByColor} from '../dist/ttg-energy-snapshot.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
const c=(uid,cardId,more={})=>({uid,cardId,nameJa:TTG_BY_ID[cardId].nameJa,ready:true,stack:[],under:[],...more});
const p=()=>({front:[null,null,null,null],energy:[null,null,null,null],deck:[],hand:[],outside:[],removed:[],life:[],apCards:[{uid:'AP0',ready:true},{uid:'AP1',ready:false}],energyProduced:{red:0,green:0}});
const game=()=>({phase:'main',active:0,turn:7,energyMode:'derive',players:[p(),p()],log:[]});
function setup(){
 const s=game(),pl=s.players[0];
 pl.front[0]=c('lord','TTG-1-025');
 pl.energy[0]=c('simon','TTG-1-009');
 pl.energy[1]=c('gen1','TTG-1-017');
 pl.energy[2]=c('gen2','TTG-1-017');
 pl.energy[3]=c('gen3','TTG-1-005');
 assert.equal(calculateTtgEnergyByColor(s,0).green,6);
 return s;
}
const ids=p=>[...p.front.filter(Boolean),...p.energy.filter(Boolean),...p.outside,...p.removed,...p.hand,...p.life,...p.deck].map(x=>x.uid).sort();
test('Q2272 025 absolutely requires a Simon target: no illegal REST or sideline payment',()=>{
 const s=setup(),pl=s.players[0];
 pl.energy[0]=c('viral','TTG-1-002');
 assert.deepEqual(legalGreen025Actions(s,0),[]);
 const before=JSON.stringify(s);
 assert.throws(()=>resolveGreen025(s,{type:'green025Lordgenome',player:0,uid:'lord',targetUid:'viral',apUid:'AP1'}),/Q2272/);
 assert.equal(JSON.stringify(s),before);
 pl.energy[0]=c('simon','TTG-1-009');
 pl.energy[1]=null;
 assert.deepEqual(legalGreen025Actions(s,0),[],'cannot activate below 6');
 pl.energy[1]=c('gen1','TTG-1-017');
 pl.front[0].ready=false;
 assert.deepEqual(legalGreen025Actions(s,0),[],'REST source cannot pay rest cost');
});
test('025 retires source atomically, targets own Simon in energy and readies selected AP',()=>{
 const s=setup(),before=JSON.stringify(s),uidList=ids(s.players[0]);
 const offers=legalGreen025Actions(s,0);
 assert.deepEqual(offers.map(x=>[x.targetUid,x.apUid]),[['simon','AP0'],['simon','AP1']]);
 for(const bad of ['fake','enemy']){
  assert.throws(()=>resolveGreen025(s,{player:0,uid:'lord',targetUid:bad,apUid:'AP1'}));
 }
 assert.throws(()=>resolveGreen025(s,{player:0,uid:'lord',targetUid:'simon',apUid:'AP77'}));
 const r=resolveGreen025(s,{type:'green025Lordgenome',player:0,uid:'lord',targetUid:'simon',apUid:'AP1'});
 assert.equal(r.players[0].front[0],null);
 assert.equal(r.players[0].outside[0].uid,'lord');
 assert.equal(r.players[0].outside[0].ready,false,'REST cost was actually paid');
 assert.equal(r.players[0].apCards[1].ready,true);
 assert.equal(r.players[0].energy[0].energyBonus,3);
 assert.equal(calculateTtgEnergyByColor(r,0).green,9);
 assert.deepEqual(ids(r.players[0]),uidList);
 assert.equal(JSON.stringify(s),before);
 assert.deepEqual(legalGreen025Actions(r,0),[]);
 const after=resolveGreen025TurnEnd(r);
 assert.equal(calculateTtgEnergyByColor(after,0).green,6);
 assert.equal(after.players[0].energy[0].energyBonus,0);
 assert.deepEqual(ids(after.players[0]),uidList);
});
test('same AI and human dispatcher expose only official legal Lordgenome targets and physical AP',()=>{
 const s=setup();
 const offers=legalTtgRuleActions(s,0).filter(a=>a.type==='green025Lordgenome');
 assert.equal(offers.length,2);
 const ai=chooseTtgRuleAiAction(s,0);
 assert.equal(ai.type,'green025Lordgenome');
 assert.equal(ai.apUid,'AP1','AI uses AP readying that benefits the owner');
 assert.equal(ai.targetUid,'simon');
 assert.throws(()=>dispatchTtgRuleAction(s,{...ai,targetUid:'wrong'}));
 const after=dispatchTtgRuleAction(s,ai);
 assert.equal(after.players[0].outside[0].uid,'lord');
 assert.equal(after.players[0].apCards[1].ready,true);
 assert.equal(resolveTtgTurnEnd(after).players[0].energy[0].energyBonus,0);
});
test('025 activation does not grant enemy AP and does not permit stale or opponent actions',()=>{
 const s=setup();s.players[1].energy[0]=c('enemySimon','TTG-1-009');
 assert.deepEqual(legalGreen025Actions(s,1),[]);
 assert.throws(()=>resolveGreen025(s,{player:0,uid:'lord',targetUid:'enemySimon',apUid:'AP1'}));
 s.phase='attack';assert.deepEqual(legalGreen025Actions(s,0),[]);
 s.phase='main';s.pending={kind:'other'};assert.deepEqual(legalGreen025Actions(s,0),[]);
});
