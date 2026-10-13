import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {beginTtgLifeTrigger} from '../dist/ttg-green-life.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
const counts=Object.fromEntries([...['004','005','006','009','012','027','028','029','031','032','034'].map(x=>['TTG-1-'+x,4]),['TTG-1-017',3],['TTG-1-033',1],['TTG-1-011',2]]);
const take=(p,id)=>{
 for(const zone of ['deck','hand','life','outside']){
  const i=p[zone].findIndex(x=>x.cardId===id);
  if(i>=0)return p[zone].splice(i,1)[0];
 }
 throw new Error('Missing physical card '+id);
};
function scene({id='TTG-1-027',chain=false,energy=true,last=false}={}){
 let s=newTtgCoreMatch({decks:[counts,counts],seed:57}),p=s.players[1];
 const trigger=take(p,id);p.deck.push(...p.life.splice(0));
 p.life=[trigger];
 if(!last){
  for(let i=0;i<6;i++)p.life.push(p.deck.shift());
 }
 if(chain)p.front[0]={...take(p,id==='TTG-1-027'?'TTG-1-029':'TTG-1-027'),
   stack:[take(p,'TTG-1-009')],under:[],raidedTurn:1};
 else p.front[0]=take(p,'TTG-1-009');
 if(energy){
  for(let i=0;i<3;i++)p.energy[i]=take(p,'TTG-1-017');
  p.energy[3]=take(p,'TTG-1-034');
  if(id==='TTG-1-031')p.energyDoublings=1; // legal doubled own energy threshold
 }
 s.active=0;s.phase='attack';s.turn=19;
 s=withTtgDerivedEnergy(s,1);
 return s;
}
test('027 Raid Life from defender turn selects Simon base OR upgraded 029 without paying physical AP',()=>{
 for(const chain of [false,true]){
  const s=scene({chain}),p=s.players[1],originalAP=p.apCards.map(x=>x.ready);
  const pending=beginTtgLifeTrigger(s,{player:1,lifeUid:p.life[0].uid});
  const options=legalTtgCoreActions(pending);
  assert.ok(options.some(x=>x.mode==='raidHand'));
  const raid=options.find(x=>x.mode==='raid'&&x.line==='front');
  assert.ok(raid);
  assert.equal(raid.raidKind,chain?'chain':'base');
  const after=dispatchTtgCoreAction(pending,raid);
  assert.equal(after.pending.kind,'greenHighRaidQueue');
  assert.ok(after.pending.remaining.includes('entry027'));
  assert.deepEqual(after.players[1].apCards.map(x=>x.ready),originalAP);
  assert.equal(after.players[1].front[0].uid,raid.cardUid);
  if(chain)assert.equal(after.players[1].front[0].under.filter(x=>x.faceDown).length,1);
  assert.ok(assertTtgCoreState(after));
 }
});
test('031 defender RAID life can upgrade older 027 with 034 site, then grant AP and BP protection',()=>{
 let s=scene({id:'TTG-1-031',chain:true});
 const lifeUid=s.players[1].life[0].uid;
 s=beginTtgLifeTrigger(s,{player:1,lifeUid});
 const action=legalTtgCoreActions(s).find(x=>x.mode==='raid'&&x.raidKind==='chain');
 assert.ok(action);
 s=dispatchTtgCoreAction(s,action);
 assert.deepEqual(s.pending.remaining,['entry031','site034']);
 const entry=legalTtgCoreActions(s).find(x=>x.step==='entry031');
 assert.ok(entry);
 s=dispatchTtgCoreAction(s,entry);
 assert.equal(s.players[1].front[0].protectedFromEffects,true);
 assert.equal(s.pending.kind,'greenHighRaidQueue');
 const site=legalTtgCoreActions(s).find(x=>x.step==='site034'&&x.siteUid);
 assert.ok(site);
 s=dispatchTtgCoreAction(s,site);
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('027/031 Raid Life with insufficient own energy offers only adding card to hand',()=>{
 for(const id of ['TTG-1-027','TTG-1-031']){
  let s=scene({id,energy:false}),p=s.players[1];
  s=beginTtgLifeTrigger(s,{player:1,lifeUid:p.life[0].uid});
  assert.deepEqual(legalTtgCoreActions(s).map(x=>x.mode),['raidHand','decline']);
  const out=dispatchTtgCoreAction(s,legalTtgCoreActions(s)[0]);
  assert.ok(out.players[1].hand.some(x=>x.cardId===id));
  assert.ok(assertTtgCoreState(out));
 }
});
test('031 final-life Raid does not declare victory before on-entry and optional 034 resolution',()=>{
 let s=scene({id:'TTG-1-031',chain:false,last:true});
 const uid=s.players[1].life[0].uid;
 s=beginTtgLifeTrigger(s,{player:1,lifeUid:uid});
 const raid=legalTtgCoreActions(s).find(x=>x.mode==='raid');
 assert.ok(raid);
 s=dispatchTtgCoreAction(s,raid);
 assert.equal(s.status,'playing');
 assert.equal(s.pendingLifeOutcome.player,1);
 let steps=0;
 while(s.pending&&steps++<6){
  const action=legalTtgCoreActions(s)[0];
  s=dispatchTtgCoreAction(s,action);
 }
 assert.ok(steps<=6);
 assert.equal(s.status,'finished');
 assert.equal(s.winner,0);
});
