import test from 'node:test';
import assert from 'node:assert/strict';
import {createUniversalPack} from '../dist/universal-v2/pack.mjs';
import {newUniversalMatch,legalUniversalActions,dispatchUniversalAction,
 universalPublicView,assertUniversalMatch} from '../dist/universal-v2/engine.mjs';
import {chooseUniversalAiAction} from '../dist/universal-v2/ai.mjs';
const cards=Array.from({length:13},(_,i)=>({id:'F'+String(i).padStart(2,'0'),
 name:'Unit '+i,type:'character',color:'green',energy:0,ap:1,
 bp:2000,gen:1,implementation:'vanilla'}));
function withTiming(i,phase,edge,turn,then){
 cards[i]={...cards[i],implementation:'dsl',phaseEffects:[{phase,edge,turn,then}]};
}
withTiming(1,'main','end','own',[{op:'draw',count:1}]);
withTiming(2,'main','end','own',[{op:'draw',count:1}]);
withTiming(3,'main','end','opponent',[{op:'draw',count:1}]);
withTiming(4,'move','start','own',[{op:'millTop',count:1}]);
withTiming(5,'attack','end','own',[{op:'draw',count:1}]);
withTiming(6,'move','end','own',[{op:'restOppFrontOne',optional:false}]);
withTiming(7,'main','start','own',[{op:'draw',count:1}]);
const packs=['trigger-title-1','trigger-title-2'].map(id=>createUniversalPack({id,cards}));
const deck=Object.fromEntries(cards.slice(0,12).map(c=>[c.id,4]));deck.F12=2;
const fresh=()=>newUniversalMatch(packs,{decks:[deck,deck],seed:1567,first:0});
function place(s,owner,id,slot=0,ready=true){
 let c;
 for(const z of ['hand','deck','life','outside']){
  const list=s.players[owner][z],i=list.findIndex(c=>c.cardId===id);
  if(i>=0){c=list.splice(i,1)[0];break;}
 }
 assert.ok(c);c.ready=ready;s.players[owner].front[slot]=c;return c;
}
const next=s=>dispatchUniversalAction(packs,s,{type:'next'});
test('Batch C: two simultaneous own MAIN-end triggers resolve in legal chosen order, then opponent',()=>{
 let s=fresh(),a=place(s,0,'F01',0),b=place(s,0,'F02',1);
 place(s,1,'F03',0);s.phase='main';
 const own=s.players[0].hand.length,op=s.players[1].hand.length;
 s=next(s);
 assert.equal(s.phase,'attack');
 assert.equal(s.pending?.kind,'phase-order');
 assert.equal(s.pending.player,0);
 const choices=legalUniversalActions(packs,s);
 assert.equal(choices.length,2);
 assert.ok(choices.some(x=>x.key.startsWith(a.uid+':')));
 assert.ok(choices.some(x=>x.key.startsWith(b.uid+':')));
 assert.ok(choices.every(x=>x.type==='choosePhaseOrder'));
 assert.deepEqual(chooseUniversalAiAction(packs,s,{difficulty:'hard'}),choices[0]);
 assert.throws(()=>dispatchUniversalAction(packs,s,{type:'choosePhaseOrder',key:'forged'}),
  /not currently legal/);
 s=dispatchUniversalAction(packs,s,choices[1]);
 assert.equal(s.pending,null);
 assert.equal(s.players[0].hand.length,own+2);
 assert.equal(s.players[1].hand.length,op+1);
 assert.equal(universalPublicView(packs,s,0).players[1].hand,null);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch C: phase-start milling and attack-end draw happen before next turn',()=>{
 let s=fresh();place(s,0,'F04',0);place(s,0,'F05',1);
 const outside=s.players[0].outside.length,deckLeft=s.players[0].deck.length;
 s=next(s);assert.equal(s.phase,'move');
 assert.equal(s.players[0].outside.length,outside+1);
 assert.equal(s.players[0].deck.length,deckLeft-1);
 s=next(s);s=next(s);
 assert.equal(s.phase,'attack');
 const before=s.players[0].hand.length;
 s=next(s);
 assert.equal(s.players[0].hand.length,before+1);
 assert.equal(s.active,1);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch C: phase-end REST choice pauses same shared queue before next-phase draw',()=>{
 let s=fresh(),source=place(s,0,'F06',0),drawSource=place(s,0,'F07',1);
 const victim=place(s,1,'F08',0,true);s.phase='move';
 const hand=s.players[0].hand.length;
 s=next(s);
 assert.equal(s.phase,'main');
 assert.equal(s.pending?.kind,'effect-rest-bp');
 assert.deepEqual(legalUniversalActions(packs,s),[{type:'chooseRestBp',uid:victim.uid}]);
 assert.equal(s.players[0].hand.length,hand,'MAIN start draw waits for mandatory choice');
 s=dispatchUniversalAction(packs,s,{type:'chooseRestBp',uid:victim.uid});
 assert.equal(s.players[1].front[0].ready,false);
 assert.equal(s.players[0].hand.length,hand+1);
 assert.equal(s.effectQueue.length,0);
 assert.equal(assertUniversalMatch(packs,s),true);
});
test('Batch C: malformed phase profile and event-sourced repeat triggers rejected',()=>{
 const first=cards[0];
 for(const bad of [
  [{phase:'main',edge:'later',turn:'own',then:[{op:'draw',count:1}]}],
  [{phase:'main',edge:'end',turn:'opponent',then:[{op:'fake'}]}]
 ])assert.throws(()=>createUniversalPack({id:'invalid-phases',cards:[
  {...first,implementation:'dsl',phaseEffects:bad}]}),/invalid phase|unsupported/);
 assert.throws(()=>createUniversalPack({id:'duplicate-phases',cards:[{
  ...first,implementation:'dsl',phaseEffects:[
   {phase:'main',edge:'end',turn:'own',then:[{op:'draw',count:1}]},
   {phase:'main',edge:'end',turn:'own',then:[{op:'draw',count:1}]}]
 }]}),/invalid phase-boundary/);
});
