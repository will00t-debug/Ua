import test from 'node:test';
import assert from 'node:assert/strict';
import {beginTtgLifeTrigger,legalTtgLifeChoices,resolveTtgLifeChoice} from '../dist/ttg-green-life.mjs';
import {legalTtgCoreActions,dispatchTtgCoreAction,newTtgCoreMatch,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {TTG_BY_ID} from '../dist/ttg-builder.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
const c=(uid,id,more={})=>({uid,cardId:id,nameJa:TTG_BY_ID[id].nameJa,ready:true,stack:[],under:[],...more});
const pl=()=>({front:[null,null,null,null],energy:[null,null,null,null],hand:[],deck:[],life:[],outside:[],removed:[],apCards:[{uid:'ap',ready:false}],turnCount:2,energyProduced:{green:0,red:0}});
function fixture(id='TTG-1-028',{end=false,energy=6,base=true}={}){
 const state={active:0,phase:'attack',turn:21,status:'playing',energyMode:'derive',players:[pl(),pl()],pending:null};
 const def=state.players[1];
 def.life=[c('trigger',id),...(!end?[c('more','TTG-1-006')]:[])];
 def.deck=[c('draw','TTG-1-005'),c('d2','TTG-1-006')];
 if(base)def.front[0]=c('base','TTG-1-009',{ready:false});
 if(energy>=2)def.energy[0]=c('gen','TTG-1-017');
 if(energy>=4)def.energy[1]=c('gen2','TTG-1-017');
 if(energy>=6)def.energy[2]=c('gen3','TTG-1-017');
 return state;
}
const ids=pl=>{
 const deep=c=>[c.uid,...(c.stack||[]).flatMap(deep),...(c.under||[]).flatMap(deep)];
 return [...pl.front.filter(Boolean),...pl.energy.filter(Boolean),...pl.hand,...pl.deck,...pl.life,...pl.outside].flatMap(deep).sort();
};
test('028 RAID LIFE can add to hand or RAID at energy>=4 WITHOUT paying AP',()=>{
 const s=fixture(),before=ids(s.players[1]),p=beginTtgLifeTrigger(s,{player:1,lifeUid:'trigger'});
 const legal=legalTtgLifeChoices(p);
 assert.ok(legal.some(x=>x.mode==='raidHand'));
 assert.ok(legal.some(x=>x.mode==='raid'&&x.baseUid==='base'&&x.line==='front'));
 assert.throws(()=>resolveTtgLifeChoice(p,{player:1,cardUid:'trigger',mode:'raid',baseUid:'invalid',line:'front',slot:0}));
 const raidAction=legal.find(x=>x.mode==='raid'&&x.line==='front');
 const r=resolveTtgLifeChoice(p,raidAction);
 assert.equal(r.players[1].front[0].uid,'trigger');
 assert.equal(r.players[1].front[0].ready,true);
 assert.equal(r.players[1].front[0].stack[0].uid,'base');
 assert.equal(r.players[1].apCards[0].ready,false);
 assert.equal(r.pending.kind,'ttgGreen028Entry');
 assert.deepEqual(ids(r.players[1]),before);
 const inHand=resolveTtgLifeChoice(p,legal.find(x=>x.mode==='raidHand'));
 assert.ok(inHand.players[1].hand.some(x=>x.uid==='trigger'));
 assert.equal(inHand.pending,null);
 assert.deepEqual(ids(inHand.players[1]),before);
});
test('029 RAID LIFE no legal base/energy still returns revealed trigger to HAND',()=>{
 for(const opts of [{energy:2},{energy:6,base:false}]){
  const s=fixture('TTG-1-029',opts),p=beginTtgLifeTrigger(s,{player:1,lifeUid:'trigger'});
  assert.deepEqual(legalTtgLifeChoices(p).map(x=>x.mode),['raidHand','decline']);
  const r=resolveTtgLifeChoice(p,{type:'ttgLifeChoice',player:1,cardUid:'trigger',mode:'raidHand'});
  assert.equal(r.players[1].hand[0].uid,'trigger');
  assert.equal(r.pendingTtgLife,null);
 }
});
test('029 RAID LIFE on opponent turn sets pending outside recovery on own front',()=>{
 const s=fixture('TTG-1-029'),p=beginTtgLifeTrigger(s,{player:1,lifeUid:'trigger'});
 const a=legalTtgLifeChoices(p).find(x=>x.mode==='raid');
 const r=resolveTtgLifeChoice(p,a);
 assert.equal(r.pending.kind,'ttgGreen029Entry');
 assert.equal(r.players[1].front[0].uid,'trigger');
 assert.equal(r.players[1].apCards[0].ready,false);
 assert.equal(legalTtgCoreActions(r).some(x=>x.type==='ttgGreen029Entry'&&x.mode==='decline'),true);
});
const counts=Object.fromEntries([...['005','006','009','010','011','014','015','016','017','019','028','029'].map(n=>['TTG-1-'+n,4]),['TTG-1-021',2]]);
function coreFixture(id){
 const s=newTtgCoreMatch({decks:[counts,counts],seed:24}),p=s.players[1];
 function grab(id){
  for(const zone of ['deck','hand','life','outside']){
   const i=p[zone].findIndex(c=>c.cardId===id);
   if(i>=0)return p[zone].splice(i,1)[0];
  }
  throw new Error('No physical card: '+id);
 }
 const trigger=grab(id);
 p.deck.push(...p.life.splice(0)); // last life: others remain physical in deck
 p.life=[trigger];
 p.front[0]={...grab('TTG-1-009'),ready:false};
 for(let i=0;i<3;i++)p.energy[i]=grab('TTG-1-017');
 p.deck.unshift(grab('TTG-1-005')); // guaranteed mandatory draw
 p.apCards[0].ready=false;
 s.turn=11;s.phase='attack';s.active=0;
 return withTtgDerivedEnergy(s,1);
}
test('028 last-life RAID defers victory through optional enemy-target choice and mandatory draw',()=>{
 const s=coreFixture('TTG-1-028');
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:s.players[1].life[0].uid});
 assert.equal(p.status,'playing');
 const raidAction=legalTtgCoreActions(p).find(x=>x.mode==='raid');
 assert.ok(raidAction);
 const afterRaid=dispatchTtgCoreAction(p,raidAction);
 assert.equal(afterRaid.status,'playing');
 assert.equal(afterRaid.pending.kind,'ttgGreen028Entry');
 assert.equal(afterRaid.pendingLifeOutcome.player,1);
 const pick=legalTtgCoreActions(afterRaid).find(x=>x.type==='ttgGreen028Entry'&&x.targetUid===null);
 const done=dispatchTtgCoreAction(afterRaid,pick);
 assert.equal(done.pending,null);
 assert.equal(done.status,'finished');
 assert.equal(done.winner,0);
 assert.ok(done.players[1].hand.length>=1);
 assert.ok(assertTtgCoreState(done));
});
test('029 last-life RAID defers victory through REST recovery, not skipping pending on-entry',()=>{
 const s=coreFixture('TTG-1-029');
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:s.players[1].life[0].uid});
 const chosen=legalTtgCoreActions(p).find(x=>x.mode==='raid');
 const entered=dispatchTtgCoreAction(p,chosen);
 assert.equal(entered.status,'playing');
 assert.equal(entered.pending.kind,'ttgGreen029Entry');
 const answer=legalTtgCoreActions(entered).find(x=>x.mode==='decline');
 const done=dispatchTtgCoreAction(entered,answer);
 assert.equal(done.status,'finished');
 assert.equal(done.winner,0);
});
test('028/029 life RAID cannot bypass Q2260 front Viral simultaneous effect ordering',()=>{
 const s=fixture('TTG-1-028');
 s.players[1].front[1]=c('viral','TTG-1-004');
 const p=beginTtgLifeTrigger(s,{player:1,lifeUid:s.players[1].life[0].uid});
 assert.deepEqual(legalTtgLifeChoices(p).map(x=>x.mode),['raidHand','decline']);
});
