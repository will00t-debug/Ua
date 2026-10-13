import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {newTtgCoreMatch,validateTtgCoreDeck,legalTtgCoreActions,dispatchTtgCoreAction,runTtgCoreAiMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
const deck=()=>Object.fromEntries([...[
 '003','005','006','009','010','011','014','015','016','017','018','019'
].map(x=>['TTG-1-'+x,4]),['TTG-1-025',2]]);
const take=(p,id)=>{
 for(const line of ['hand','deck','life','outside']){
  const i=p[line].findIndex(c=>c.cardId===id);
  if(i>=0)return p[line].splice(i,1)[0];
 }
 throw new Error('No card '+id);
};
test('official 025 has no life trigger and is allowed only in restricted/core, not website',()=>{
 assert.equal(TTG_BY_ID['TTG-1-025'].trigger,null);
 assert.equal(TTG_BY_ID['TTG-1-025'].auto,false);
 assert.deepEqual(validateTtgCoreDeck(deck()),[]);
});
test('025 has NO attack or block below 6 energy and gains combat legality immediately at 6',()=>{
 let s=newTtgCoreMatch({decks:[deck(),deck()],seed:14});
 const p=s.players[0],lord=take(p,'TTG-1-025');
 p.front[0]={...lord,ready:true};
 p.turnCount=2;s.phase='attack';
 s=withTtgDerivedEnergy(s,0);
 assert.ok(!legalTtgCoreActions(s).some(x=>x.type==='attack'&&x.uid===lord.uid),'no attack with energy 0');
 const current=s.players[0];
 current.energy[0]=take(current,'TTG-1-017');current.energy[1]=take(current,'TTG-1-017');
 current.energy[2]=take(current,'TTG-1-017');
 s=withTtgDerivedEnergy(s,0);
 assert.equal(s.players[0].energy.length,4);
 assert.ok(legalTtgCoreActions(s).some(x=>x.type==='attack'&&x.uid===lord.uid),'energy6 enables attack instantly');
 const next=dispatchTtgCoreAction(s,{type:'attack',uid:lord.uid});
 assert.equal(next.pending.kind,'block');
 assert.ok(assertTtgCoreState(next));
});
test('025 Q2272 core Main activation sideline source, boost chosen Simon by three and ACTIVATE AP',()=>{
 let s=newTtgCoreMatch({decks:[deck(),deck()],seed:21});
 const p=s.players[0];
 const lord=take(p,'TTG-1-025'),simon=take(p,'TTG-1-009');
 p.front[0]={...lord,ready:true};
 p.energy[0]={...simon,ready:false};
 p.energy[1]=take(p,'TTG-1-017');p.energy[2]=take(p,'TTG-1-017');
 p.energy[3]=take(p,'TTG-1-005');
 s.phase='main';s=withTtgDerivedEnergy(s,0);
 p.apCards[1].ready=false;
 const before=JSON.stringify(s);
 const options=legalTtgCoreActions(s).filter(x=>x.type==='green025Lordgenome'&&x.uid===lord.uid);
 assert.ok(options.some(x=>x.targetUid===simon.uid&&x.apUid===p.apCards[1].uid));
 const out=dispatchTtgCoreAction(s,options.find(x=>x.apUid===p.apCards[1].uid));
 assert.equal(out.players[0].front[0],null);
 assert.equal(out.players[0].outside.some(c=>c.uid===lord.uid),true);
 assert.equal(out.players[0].energy[0].energyBonus,3);
 assert.equal(out.players[0].apCards[1].ready,true);
 assert.ok(assertTtgCoreState(out));
 assert.equal(JSON.stringify(s),before);
});
test('two 50-card mono-green 025 core decks run entire deterministic AI battles',()=>{
 for(const seed of [4,12,35]){
  const original=newTtgCoreMatch({decks:[deck(),deck()],seed});
  const result=runTtgCoreAiMatch(original,{maxSteps:9000});
  assert.equal(result.truncated,false,'seed '+seed+', actions '+result.actions);
  assert.equal(result.state.status,'finished');
  assert.ok(assertTtgCoreState(result.state));
  assert.equal(original.players[0].life.length,7);
 }
});
