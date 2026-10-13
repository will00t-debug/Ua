import test from 'node:test';
import assert from 'node:assert/strict';
import {newTtgCoreMatch,legalTtgCoreActions,dispatchTtgCoreAction,assertTtgCoreState} from '../dist/ttg-core-match.mjs';
import {withTtgDerivedEnergy} from '../dist/ttg-energy-snapshot.mjs';
import {beginTtgLifeTrigger,legalTtgLifeChoices,resolveTtgLifeChoice} from '../dist/ttg-green-life.mjs';
import {legalTtgRuleActions,dispatchTtgRuleAction} from '../dist/ttg-rule-adapter.mjs';
const ids=['042','043','045','046','051','052','056','059','061','062','066','072'];
const deck=()=>Object.fromEntries(ids.map(n=>['TTG-1-'+n,n==='045'?1:n==='062'?3:4])
 .concat([['TTG-1-047',4],['TTG-1-073',1],['TTG-1-076',1]]));
const extract=(pl,id)=>{
 for(const zone of ['hand','deck','life','outside']){
  const i=pl[zone].findIndex(c=>c.cardId===id);
  if(i>=0)return pl[zone].splice(i,1)[0];
 }
 throw Error('No card '+id);
};
const setup=()=>{
 let s=newTtgCoreMatch({decks:[deck(),deck()],seed:962});s.phase='main';s.turn=3;s.active=0;
 const p=s.players[0];
 p.apCards[0].ready=true;p.apCards[1].ready=true;
 p.energy[0]={...extract(p,'TTG-1-066'),ready:true,gen:10};
 return s;
};
test('061 has two distinct effects in printed order; active 052 entry must finish before pending restoration',()=>{
 let s=setup(),pl=s.players[0];
 // 061 cannot share field with Kamina 045
 const nia=extract(pl,'TTG-1-061');
 const sim=extract(pl,'TTG-1-052');
 pl.hand.push(nia,sim);
 while(pl.deck.length>20)pl.outside.push(pl.deck.pop());
 s=withTtgDerivedEnergy(s,0);
 const play=legalTtgCoreActions(s).find(a=>a.type==='play'&&a.handUid===nia.uid&&a.line==='energy');
 assert.ok(play);
 s=dispatchTtgCoreAction(s,play);
 assert.equal(s.pending.kind,'ttgRed061');
 assert.equal(s.pending.step,'recover');
 assert.deepEqual(new Set(legalTtgCoreActions(s).map(x=>x.mode)),new Set(['recover']));
 s=dispatchTtgCoreAction(s,legalTtgCoreActions(s).find(x=>x.recoverUid===null));
 assert.equal(s.pending.step,'deploy');
 const option=legalTtgCoreActions(s).find(x=>x.handUid===sim.uid&&x.line==='front');
 assert.ok(option);
 s=dispatchTtgCoreAction(s,option);
 assert.equal(s.pending.kind,'ttgRed052Discard');
 assert.equal(s.players[0].front[0].uid,sim.uid);
 assert.equal(s.players[0].front[0].ready,true);
 s=dispatchTtgCoreAction(s,legalTtgCoreActions(s).find(x=>x.discardUid===null));
 assert.equal(s.pending,null);
 s=withTtgDerivedEnergy(withTtgDerivedEnergy(s,0),1);
 assert.ok(assertTtgCoreState(s));
});
test('062 picks already-field Simon 051 and resolves same draw/discard via printed retrigger',()=>{
 let s=setup(),p=s.players[0];
 const nia=extract(p,'TTG-1-062'),sim=extract(p,'TTG-1-051');
 p.front[0]={...sim,ready:false};p.hand.push(nia);
 s=withTtgDerivedEnergy(s,0);
 const play=legalTtgCoreActions(s).find(x=>x.type==='play'&&x.handUid===nia.uid&&x.line==='energy');
 assert.ok(play);
 s=dispatchTtgCoreAction(s,play);
 assert.equal(s.pending.kind,'ttgRed062Retrigger');
 const retrigger=legalTtgCoreActions(s).find(x=>x.targetUid===sim.uid);
 assert.ok(retrigger);
 const pre=s.players[0].hand.length;
 s=dispatchTtgCoreAction(s,retrigger);
 assert.equal(s.pending.kind,'ttgRed051Discard');
 assert.equal(s.players[0].hand.length,pre+1);
 s=dispatchTtgCoreAction(s,legalTtgCoreActions(s)[0]);
 assert.equal(s.pending,null);
 assert.ok(assertTtgCoreState(s));
});
test('red RAID life from outside: no AP, base, red energy, physical UID and deferred entry',()=>{
 let s=setup(),pl=s.players[1];
 pl.energy[0]={...extract(pl,'TTG-1-066'),ready:true,gen:10};
 const kamina=extract(pl,'TTG-1-045');pl.front[0]={...kamina,ready:true};
 const trigger=extract(pl,'TTG-1-072');pl.life.unshift(trigger);
 s.phase='attack';s.active=0;
 const before=pl.apCards.map(x=>x.ready);
 s=beginTtgLifeTrigger(s,{player:1,lifeUid:trigger.uid});
 const action=legalTtgLifeChoices(s).find(x=>x.mode==='raid'&&x.line==='front');
 assert.ok(action);
 s=resolveTtgLifeChoice(s,action);
 assert.equal(s.players[1].front[0].cardId,'TTG-1-072');
 assert.equal(s.players[1].front[0].stack[0].uid,kamina.uid);
 assert.deepEqual(s.players[1].apCards.map(x=>x.ready),before);
 assert.equal(s.pending.kind,'ttgRedRaidQueue');
 const target=legalTtgRuleActions(s,1).find(x=>x.step==='entry072'&&x.targetUid===null);
 assert.ok(target);
 s=dispatchTtgRuleAction(s,target);
 assert.equal(s.pending,null);
 s=withTtgDerivedEnergy(withTtgDerivedEnergy(s,0),1);
 assert.ok(assertTtgCoreState(s));
});
