import test from 'node:test';
import assert from 'node:assert/strict';
import {TTG_CORE_SMOKE_IDS,validateTtgCoreDeck,newTtgCoreMatch,runTtgCoreAiMatch,assertTtgCoreState,legalTtgCoreActions,dispatchTtgCoreAction} from '../dist/ttg-core-match.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
const mk=()=>Object.fromEntries(['042','043','044','046','047','048','051','052','059','066','075','077'].map(n=>['TTG-1-'+n,4]).concat([['TTG-1-078',1],['TTG-1-079',1]]));
test('075/077/078/079/080/081 restricted-whitelisted only after actual resolvers; 061/062/071/072/073/074/076 remain guarded',()=>{
 for(const n of ['075','077','078','079','080','081'])assert.ok(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n));
 for(const n of ['061','062','071','072','073','074','076'])assert.equal(TTG_CORE_SMOKE_IDS.includes('TTG-1-'+n),true);
 assert.equal(TTG_CORE_SMOKE_IDS.includes('TTG-1-056'),true);
 assert.deepEqual(validateTtgCoreDeck(mk()),[]);
});
test('combined green/red unrestricted-size 50-card restricted AI smoke works with 075/077 plus FINAL life',()=>{
 for(const seed of [75,77,78]){
  const match=runTtgCoreAiMatch(newTtgCoreMatch({decks:[mk(),mk()],seed}),{maxSteps:6500});
  assert.equal(match.truncated,false);
  assert.ok(assertTtgCoreState(match.state));
 }
});
test('077 normal field entry offers player recovery instead of silent skip',()=>{
 let s=newTtgCoreMatch({decks:[mk(),mk()],seed:77});
 const p=s.players[0],find=(id)=>{
  for(const key of ['hand','deck','life','outside']){
   const i=p[key].findIndex(c=>c.cardId===id);
   if(i>=0)return p[key].splice(i,1)[0];
  }
  throw new Error('missing '+id);
 };
 const power=find('TTG-1-066'),field=find('TTG-1-077'),gun=find('TTG-1-075');
 p.energy[0]={...power,ready:true,gen:7};
 p.hand.push(field);p.outside.push(gun);
 s.phase='main';s=withTtgDerivedEnergy(s,0);
 const opt=legalTtgCoreActions(s).find(x=>x.type==='ttgRed077Play');
 assert.ok(opt);
 s=dispatchTtgCoreAction(s,{...opt,payApUids:[p.apCards[0].uid]});
 assert.equal(s.pending.kind,'ttgRed077Recover');
 const recovery=legalTtgCoreActions(s).find(x=>x.recoverUid===gun.uid);
 assert.ok(recovery);
 s=dispatchTtgCoreAction(s,recovery);
 assert.equal(s.pending,null);
 assert.ok(s.players[0].hand.some(x=>x.uid===gun.uid));
 assert.ok(assertTtgCoreState(s));
});
