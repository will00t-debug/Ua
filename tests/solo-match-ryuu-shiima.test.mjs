import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLO_TRAINING_PRESET,newSoloTrainingMatch,soloTrainingLegalActions,soloTrainingDispatch,assertSoloTrainingMatch} from '../dist/solo-match.mjs';
const deck=(card)=>({...SOLO_TRAINING_PRESET,'SLG-1-075':0,[card]:4});
const setup=(card='SLG-1-073')=>{const s=newSoloTrainingMatch({decks:[deck(card),deck(card)],first:0,seed:313});s.phase='main';s.players[0].ap=3;s.players[0].maxAp=3;return s};
const take=(p,id)=>{for(const zone of ['hand','deck','life']){const i=p[zone].findIndex(x=>x.cardId===id);if(i>=0)return p[zone].splice(i,1)[0];}throw Error('not in deck '+id)};
const place=(s,id,line,slot,owner=0,ready=true)=>{
 const p=s.players[owner],c=take(p,id);Object.assign(c,{owner,line,slot,ready});p[line][slot]=c;return c;
};
test('Q2063 Ryuu enters ACTIVE, buffs chosen character and recovers at most 2 AP with hand>=7; all same-name shared once',()=>{
 let s=setup(),p=s.players[0];
 for(let i=0;i<4;i++)place(s,'SLG-1-041','energy',i);
 const ryuu1=take(p,'SLG-1-073'),ryuu2=take(p,'SLG-1-073');
 p.hand.push(ryuu1,ryuu2);
 while(p.hand.length<9)p.hand.push(take(p,'SLG-1-045'));
 const action=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===ryuu1.uid&&a.line==='front');
 assert.ok(action);s=soloTrainingDispatch(s,action);
 assert.equal(s.pending.kind,'ryuuBuff');assert.equal(s.players[0].front[action.slot].ready,true);
 const target=s.players[0].energy[0];
 s=soloTrainingDispatch(s,{type:'choose',uid:target.uid});
 assert.equal(s.players[0].energy[0].buffs[0].bp,1000);
 assert.equal(s.pending.kind,'ryuuAp');
 assert.deepEqual(soloTrainingLegalActions(s).map(x=>x.count),[0,1,2]);
 s=soloTrainingDispatch(s,{type:'choose',count:2});assert.equal(s.players[0].ap,3);
 s.players[0].ap=3;
 const next=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===ryuu2.uid&&a.line==='front');
 assert.ok(next);s=soloTrainingDispatch(s,next);
 assert.equal(s.pending,null);assert.equal(s.players[0].front[next.slot].ready,true);
 assert.equal(s.groupUsed['0:ryuuEntry'],s.turn);assertSoloTrainingMatch(s);
});
test('Ryuu front aura grants DFN leave-to-hand only after NON-DFN fourth-island ally retires',()=>{
 let s=setup(),p=s.players[0];
 const ryuu=place(s,'SLG-1-073','front',0),attacker=place(s,'SLG-1-056','front',1),dfn=place(s,'SLG-1-066','front',2);
 const blockerA=place(s,'SLG-1-065','front',0,1),blockerB=place(s,'SLG-1-065','front',1,1);
 s.phase='attack';
 s=soloTrainingDispatch(s,{type:'attack',uid:attacker.uid});
 s=soloTrainingDispatch(s,{type:'choose',uid:blockerA.uid});
 assert.ok(s.players[0].front[2].grants?.some(x=>x.kind==='returnOnRetire'&&x.turn===s.turn));
 s=soloTrainingDispatch(s,{type:'attack',uid:dfn.uid});
 s=soloTrainingDispatch(s,{type:'choose',uid:blockerB.uid});
 assert.ok(s.players[0].hand.some(x=>x.uid===dfn.uid));
 assert.ok(s.players[0].outside.some(x=>x.uid===attacker.uid));
 assertSoloTrainingMatch(s);
});
test('Q2062 Shiima extra-AP target protection expires at end of opponent NEXT turn',()=>{
 let s=setup('SLG-1-070');
 const p=s.players[0],dfn=place(s,'SLG-1-066','energy',0);
 const c=take(p,'SLG-1-070');p.hand.push(c);
 const play=soloTrainingLegalActions(s).find(a=>a.type==='play'&&a.uid===c.uid);
 assert.ok(play);s=soloTrainingDispatch(s,play);
 assert.equal(s.pending.kind,'entryProtect');
 s=soloTrainingDispatch(s,{type:'choose',uid:dfn.uid});
 assert.equal(s.players[0].energy[0].extraTargetAp,1);
 for(let i=0;i<9&&!(s.active===0&&s.turn>=3);i++){
  const actions=soloTrainingLegalActions(s),next=actions.find(x=>x.type==='next');
  if(s.pending)throw Error('unexpected pending');
  assert.ok(next);s=soloTrainingDispatch(s,next);
 }
 assert.equal(s.players[0].energy[0].extraTargetAp,undefined);
 assertSoloTrainingMatch(s);
});
